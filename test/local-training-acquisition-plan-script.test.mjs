import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildLocalTrainingAcquisitionRequest,
  resolveLocalTrainingAcquisitionRequest,
} from '../src/core/local-training-acquisition-approval.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'plan-local-training-acquisition-execution.mjs',
);
const toolchainDecision = readJson(path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-toolchain-decision.json',
));

test('approved private resolution writes one pending acquisition plan', () => {
  withPlanningRoot((rootDir, request) => {
    const result = runPlan(rootDir, buildResolution(request, 'approve'));

    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const planPath = path.join(rootDir, summary.outputPath);
    const plan = readJson(planPath);
    assert.equal(summary.status, 'approved-acquisition-not-executed');
    assert.equal(summary.stepCount, 7);
    assert.equal(summary.acquisitionAuthorized, true);
    assert.equal(summary.actualDependencyInstallationPerformed, false);
    assert.equal(summary.actualModelDownloadPerformed, false);
    assert.equal(summary.actualModelTrainingExecuted, false);
    assert.equal(summary.trainingAuthorized, false);
    assert.equal(summary.rolloutAuthorized, false);
    assert.equal(summary.externalProviderCalls, 'none');
    assert.equal(summary.productionReadyClaim, false);
    assert.equal(
      plan.steps.every((step) => step.status === 'pending'),
      true,
    );
    assert.equal(plan.approval.id, summary.approvalId);
    assert.equal(fs.statSync(planPath).mode & 0o777, 0o600);
  });
});

test('rejected resolution cannot create an acquisition plan', () => {
  withPlanningRoot((rootDir, request) => {
    const result = runPlan(rootDir, buildResolution(request, 'reject'));

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /authority-boundary/);
    assert.equal(planFiles(rootDir).length, 0);
  });
});

test('expired approval cannot create an acquisition plan', () => {
  withPlanningRoot((rootDir) => {
    const request = buildRequest({
      expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      requestedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    });
    writeTrackedInputs(rootDir, request);
    const resolution = buildResolution(
      request,
      'approve',
      new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    );
    const result = runPlan(rootDir, resolution);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /authority-boundary/);
    assert.equal(planFiles(rootDir).length, 0);
  });
});

test('resolution must match the current acquisition request', () => {
  withPlanningRoot((rootDir, request) => {
    const resolution = buildResolution(request, 'approve');
    const replacement = buildRequest({
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      requestedAt: new Date(Date.now() - 30 * 1000).toISOString(),
    });
    writeTrackedInputs(rootDir, replacement);
    const result = runPlan(rootDir, resolution);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not match the current request/);
    assert.equal(planFiles(rootDir).length, 0);
  });
});

test('resolution rejects extra fields and semantic tampering', () => {
  withPlanningRoot((rootDir, request) => {
    const extraField = buildResolution(request, 'approve');
    extraField.unexpected = true;
    const extraResult = runPlan(rootDir, extraField);
    assert.notEqual(extraResult.status, 0);
    assert.match(extraResult.stderr, /resolution fields are invalid/);

    const tampered = buildResolution(request, 'approve');
    tampered.trainingAuthorized = true;
    const tamperedResult = runPlan(rootDir, tampered);
    assert.notEqual(tamperedResult.status, 0);
    assert.match(tamperedResult.stderr, /authority-boundary/);
    assert.equal(planFiles(rootDir).length, 0);
  });
});

test('resolution rejects tracked and symbolic-link paths', () => {
  withPlanningRoot((rootDir, request) => {
    const resolution = buildResolution(request, 'approve');
    const trackedPath = path.join(rootDir, 'resolution.json');
    writeJson(trackedPath, resolution);
    const tracked = runScript(rootDir, trackedPath);
    assert.notEqual(tracked.status, 0);
    assert.match(tracked.stderr, /must remain private/);

    const privatePath = path.join(rootDir, 'var', 'resolution.json');
    const linkedPath = path.join(rootDir, 'var', 'linked-resolution.json');
    writeJson(privatePath, resolution);
    fs.symlinkSync(privatePath, linkedPath);
    const linked = runScript(rootDir, linkedPath);
    assert.notEqual(linked.status, 0);
    assert.match(linked.stderr, /bounded regular file/);
    assert.equal(planFiles(rootDir).length, 0);
  });
});

test('approved resolution can create only one plan file', () => {
  withPlanningRoot((rootDir, request) => {
    const resolution = buildResolution(request, 'approve');
    const first = runPlan(rootDir, resolution);
    const second = runPlan(rootDir, resolution);

    assert.equal(first.status, 0, first.stderr);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /EEXIST/);
    assert.equal(planFiles(rootDir).length, 1);
  });
});

function withPlanningRoot(run) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'local-training-acquisition-plan-'),
  );
  try {
    fs.mkdirSync(path.join(rootDir, 'var'), { recursive: true });
    const request = buildRequest();
    writeTrackedInputs(rootDir, request);
    run(rootDir, request);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function buildRequest({
  expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  requestedAt = new Date(Date.now() - 60 * 1000).toISOString(),
} = {}) {
  return buildLocalTrainingAcquisitionRequest({
    decision: toolchainDecision,
    expiresAt,
    proposedResourceEnvelope: {
      maxConcurrentDownloads: 2,
      maxDiskBytes: 16 * 1024 ** 3,
      maxDownloadBytes: 8 * 1024 ** 3,
      maxRuntimeMs: 60 * 60 * 1000,
    },
    requestedAt,
    requestedBy: 'local-operator',
  });
}

function buildResolution(
  request,
  decision,
  resolvedAt = new Date().toISOString(),
) {
  return resolveLocalTrainingAcquisitionRequest({
    decision,
    owners: {
      approvalOwner: 'local-acquisition-owner',
      egressOwner: 'local-security-owner',
      licenseOwner: 'local-license-owner',
      resourceOwner: 'local-resource-owner',
      rollbackOwner: 'local-rollback-owner',
    },
    reason: 'Reviewed bounded acquisition only.',
    request,
    resolvedAt,
    resolvedBy: 'local-acquisition-owner',
    toolchainDecision,
  });
}

function writeTrackedInputs(rootDir, request) {
  const evidenceDir = path.join(rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(evidenceDir, { recursive: true });
  writeJson(
    path.join(evidenceDir, 'local-training-toolchain-decision.json'),
    toolchainDecision,
  );
  writeJson(
    path.join(evidenceDir, 'local-training-acquisition-request.json'),
    request,
  );
}

function runPlan(rootDir, resolution) {
  const resolutionPath = path.join(rootDir, 'var', 'resolution.json');
  writeJson(resolutionPath, resolution);
  return runScript(rootDir, resolutionPath);
}

function runScript(rootDir, resolutionPath) {
  return spawnSync(
    process.execPath,
    [scriptPath, '--resolution', resolutionPath],
    {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}

function planFiles(rootDir) {
  const outputDir = path.join(
    rootDir,
    'var',
    'local-training',
    'acquisition-plans',
  );
  return fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir)
    : [];
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function writeJson(filename, value) {
  fs.writeFileSync(
    filename,
    `${JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}
