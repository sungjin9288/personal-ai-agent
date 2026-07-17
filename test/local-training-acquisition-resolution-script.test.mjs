import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { buildLocalTrainingAcquisitionRequest } from '../src/core/local-training-acquisition-approval.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'resolve-local-training-acquisition.mjs',
);
const toolchainDecision = JSON.parse(fs.readFileSync(
  path.join(
    repoDir,
    'evidence',
    'output-artifacts',
    'local-training-toolchain-decision.json',
  ),
  'utf8',
));

test('private approval writes one content-free acquisition resolution', () => {
  withResolutionRoot((rootDir) => {
    const result = runResolution(rootDir, buildDecision('approve'));

    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const resolutionText = fs.readFileSync(
      path.join(rootDir, summary.outputPath),
      'utf8',
    );
    const resolution = JSON.parse(resolutionText);
    assert.equal(summary.status, 'approved');
    assert.equal(summary.acquisitionAuthorized, true);
    assert.equal(summary.trainingAuthorized, false);
    assert.equal(summary.actualDependencyInstallationPerformed, false);
    assert.equal(summary.actualModelDownloadPerformed, false);
    assert.equal(summary.actualModelTrainingExecuted, false);
    assert.equal(summary.externalProviderCalls, 'none');
    assert.equal(summary.productionReadyClaim, false);
    assert.equal(resolution.status, 'approved');
    assert.equal(
      resolutionText.includes('Reviewed bounded acquisition only.'),
      false,
    );
  });
});

test('private rejection records no acquisition authority', () => {
  withResolutionRoot((rootDir) => {
    const result = runResolution(rootDir, buildDecision('reject'));

    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.status, 'rejected');
    assert.equal(summary.acquisitionAuthorized, false);
    assert.equal(summary.trainingAuthorized, false);
    assert.equal(summary.rolloutAuthorized, false);
  });
});

test('one acquisition request cannot be resolved twice', () => {
  withResolutionRoot((rootDir) => {
    const first = runResolution(rootDir, buildDecision('reject'));
    const second = runResolution(rootDir, buildDecision('approve'));

    assert.equal(first.status, 0, first.stderr);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /already resolved/);
  });
});

test('operator decision requires exact fields and all owners', () => {
  withResolutionRoot((rootDir) => {
    const decision = buildDecision('approve');
    delete decision.owners.rollbackOwner;
    const result = runResolution(rootDir, decision);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owners fields are invalid/);
    assert.equal(resolutionFiles(rootDir).length, 0);
  });
});

test('operator decision rejects tracked and symbolic-link paths', () => {
  withResolutionRoot((rootDir) => {
    const trackedPath = path.join(rootDir, 'decision.json');
    fs.writeFileSync(
      trackedPath,
      JSON.stringify(buildDecision('approve')),
      'utf8',
    );
    const tracked = runScript(rootDir, trackedPath);
    assert.notEqual(tracked.status, 0);
    assert.match(tracked.stderr, /must remain private/);

    const privatePath = path.join(rootDir, 'var', 'decision.json');
    const linkedPath = path.join(rootDir, 'var', 'linked-decision.json');
    fs.writeFileSync(
      privatePath,
      JSON.stringify(buildDecision('approve')),
      'utf8',
    );
    fs.symlinkSync(privatePath, linkedPath);
    const linked = runScript(rootDir, linkedPath);
    assert.notEqual(linked.status, 0);
    assert.match(linked.stderr, /bounded regular file/);
    assert.equal(resolutionFiles(rootDir).length, 0);
  });
});

function withResolutionRoot(run) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'local-training-acquisition-resolution-'),
  );
  try {
    prepareResolutionRoot(rootDir);
    run(rootDir);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function prepareResolutionRoot(rootDir) {
  const evidenceDir = path.join(rootDir, 'evidence', 'output-artifacts');
  const varDir = path.join(rootDir, 'var');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.mkdirSync(varDir, { recursive: true });
  const now = Date.now();
  const request = buildLocalTrainingAcquisitionRequest({
    decision: toolchainDecision,
    expiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
    proposedResourceEnvelope: {
      maxConcurrentDownloads: 2,
      maxDiskBytes: 16 * 1024 ** 3,
      maxDownloadBytes: 8 * 1024 ** 3,
      maxRuntimeMs: 60 * 60 * 1000,
    },
    requestedAt: new Date(now - 60 * 1000).toISOString(),
    requestedBy: 'local-operator',
  });
  fs.writeFileSync(
    path.join(evidenceDir, 'local-training-toolchain-decision.json'),
    `${JSON.stringify(toolchainDecision, null, 2)}\n`,
    'utf8',
  );
  fs.writeFileSync(
    path.join(evidenceDir, 'local-training-acquisition-request.json'),
    `${JSON.stringify(request, null, 2)}\n`,
    'utf8',
  );
}

function runResolution(rootDir, decision) {
  const decisionPath = path.join(rootDir, 'var', 'decision.json');
  fs.writeFileSync(
    decisionPath,
    `${JSON.stringify(decision, null, 2)}\n`,
    'utf8',
  );
  return runScript(rootDir, decisionPath);
}

function runScript(rootDir, decisionPath) {
  return spawnSync(
    process.execPath,
    [scriptPath, '--decision', decisionPath],
    {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}

function buildDecision(decision) {
  return {
    decision,
    owners: {
      approvalOwner: 'local-acquisition-owner',
      egressOwner: 'local-security-owner',
      licenseOwner: 'local-license-owner',
      resourceOwner: 'local-resource-owner',
      rollbackOwner: 'local-rollback-owner',
    },
    reason: 'Reviewed bounded acquisition only.',
    schemaVersion:
      'personal-ai-agent-local-training-acquisition-operator-decision/v1',
  };
}

function resolutionFiles(rootDir) {
  const outputDir = path.join(
    rootDir,
    'var',
    'local-training',
    'acquisition-resolutions',
  );
  return fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir)
    : [];
}
