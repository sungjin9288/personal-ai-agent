import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'plan-fine-tuning-private-collection.mjs',
);

test('approved private resolution writes one owner-only pending plan', () => {
  withRoot((rootDir, sources) => {
    const result = run(rootDir, writeResolution(rootDir, sources.resolution));
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const outputPath = path.join(rootDir, summary.outputPath);
    const plan = readJson(outputPath);

    assert.equal(summary.status, 'private-collection-plan-created-execution-approval-required');
    assert.equal(summary.stepCount, 7);
    assert.equal(summary.collectionExecutionApprovalRequired, true);
    assert.equal(summary.collectionExecutionAuthorized, false);
    assert.equal(summary.actualUserDataCollected, false);
    assert.equal(summary.trainingAuthorized, false);
    assert.equal(summary.externalProviderCalls, 'none');
    assert.equal(fs.lstatSync(outputPath).mode & 0o777, 0o600);
    assert.equal(plan.steps.every((step) => step.status === 'pending'), true);
    assert.equal(plan.resolution.id, sources.resolution.id);
    assert.equal(plan.ownerDecisionRecorded, false);
    assert.equal(plan.ownerIdentityVerified, false);
    assert.equal(plan.dataHandlingEvidenceRecorded, false);
    assert.equal(plan.actualUserDataCollected, false);
    assert.equal(fs.existsSync(path.join(rootDir, 'var', 'fine-tuning', 'intake-workspace')), false);
  });
});

test('rejected, expired, and drifted resolutions create no plan', () => {
  withRoot((rootDir, sources) => {
    const rejected = buildResolution(sources, 'reject');
    assert.notEqual(run(rootDir, writeResolution(rootDir, rejected)).status, 0);
    assert.equal(planFiles(rootDir).length, 0);
  });

  withRoot((rootDir, sources) => {
    const expiredRequest = buildRequest(sources.assessment, sources.collectionPlan, {
      requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    const expiredSources = {
      ...sources,
      request: expiredRequest,
    };
    expiredSources.resolution = buildResolution(
      expiredSources,
      'approve',
      new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    );
    writeSources(rootDir, expiredSources);
    assert.notEqual(
      run(rootDir, writeResolution(rootDir, expiredSources.resolution)).status,
      0,
    );
    assert.equal(planFiles(rootDir).length, 0);
  });

  withRoot((rootDir, sources) => {
    const oldResolution = sources.resolution;
    const replacement = buildRequest(sources.assessment, sources.collectionPlan, {
      requestedAt: new Date(Date.now() - 30 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    writeSources(rootDir, { ...sources, request: replacement });
    assert.notEqual(
      run(rootDir, writeResolution(rootDir, oldResolution)).status,
      0,
    );
    assert.equal(planFiles(rootDir).length, 0);
  });
});

test('private resolution rejects tracked, linked, weak, and malformed input', () => {
  withRoot((rootDir, sources) => {
    const tracked = path.join(rootDir, 'resolution.json');
    writeJson(tracked, sources.resolution, 0o600);
    assert.match(run(rootDir, tracked).stderr, /must remain private/);

    const privatePath = writeResolution(rootDir, sources.resolution);
    const linked = path.join(rootDir, 'var', 'linked.json');
    fs.symlinkSync(privatePath, linked);
    assert.match(run(rootDir, linked).stderr, /owner-only bounded regular file|must remain private/);

    const hardlinked = path.join(rootDir, 'var', 'hardlinked.json');
    fs.linkSync(privatePath, hardlinked);
    assert.match(run(rootDir, hardlinked).stderr, /owner-only bounded regular file/);

    fs.chmodSync(privatePath, 0o644);
    assert.match(run(rootDir, privatePath).stderr, /owner-only bounded regular file/);

    const malformed = path.join(rootDir, 'var', 'malformed.json');
    fs.writeFileSync(malformed, '{"private":"PRIVATE-MARKER"', { mode: 0o600 });
    const malformedResult = run(rootDir, malformed);
    assert.match(malformedResult.stderr, /JSON is invalid/);
    assert.equal(malformedResult.stderr.includes('PRIVATE-MARKER'), false);
  });
});

test('one resolution creates one plan and invalid history fails closed', () => {
  withRoot((rootDir, sources) => {
    const resolutionPath = writeResolution(rootDir, sources.resolution);
    const first = run(rootDir, resolutionPath);
    assert.equal(first.status, 0, first.stderr);
    const second = run(rootDir, resolutionPath);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /already planned/);
    assert.equal(planFiles(rootDir).length, 1);
  });

  withRoot((rootDir, sources) => {
    const first = run(rootDir, writeResolution(rootDir, sources.resolution));
    assert.equal(first.status, 0, first.stderr);
    const outputPath = path.join(rootDir, JSON.parse(first.stdout).outputPath);
    const renamedPath = path.join(
      path.dirname(outputPath),
      `fine-tuning-private-collection-plan-${'f'.repeat(64)}.json`,
    );
    const stored = readJson(outputPath);
    stored.collectionExecutionAuthorized = true;
    writeJson(renamedPath, stored, 0o600);
    fs.rmSync(outputPath);
    const result = run(rootDir, writeResolution(rootDir, sources.resolution));
    assert.match(result.stderr, /history is invalid/);
    assert.equal(planFiles(rootDir).length, 1);
  });
});

test('var ancestor symlink escape and weak output root fail closed', () => {
  withRoot((rootDir, sources) => {
    const outsideDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'fine-tuning-private-plan-outside-'),
    );
    try {
      const outsidePath = path.join(outsideDir, 'resolution.json');
      writeJson(outsidePath, sources.resolution, 0o600);
      const linkedDir = path.join(rootDir, 'var', 'linked-dir');
      fs.symlinkSync(outsideDir, linkedDir);
      assert.match(
        run(rootDir, path.join(linkedDir, 'resolution.json')).stderr,
        /must remain private/,
      );
    } finally {
      fs.rmSync(outsideDir, { force: true, recursive: true });
    }
  });

  withRoot((rootDir, sources) => {
    fs.chmodSync(path.join(rootDir, 'var'), 0o770);
    assert.match(
      run(rootDir, writeResolution(rootDir, sources.resolution)).stderr,
      /directory must be owner-only/,
    );
  });
});

function withRoot(runTest) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'fine-tuning-private-collection-plan-'),
  );
  try {
    fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
    const assessment = assessFineTuningDataSufficiency({
      readinessPackage: buildDeterministicFineTuningReadinessFixture(),
    });
    const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
    const request = buildRequest(assessment, collectionPlan);
    const sources = { assessment, collectionPlan, request };
    sources.resolution = buildResolution(sources);
    writeSources(rootDir, sources);
    runTest(rootDir, sources);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function buildRequest(assessment, collectionPlan, {
  requestedAt = new Date(Date.now() - 60 * 1000).toISOString(),
  expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(),
} = {}) {
  return buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt,
    requestedAt,
    requestedBy: 'local-operator-role',
  });
}

function buildResolution(sources, decision = 'approve', resolvedAt = new Date().toISOString()) {
  return resolveFineTuningDataIntakeRequest({
    ...sources,
    resolvedAt,
    reviews: sources.request.requiredReviews.map((review, index) => ({
      decision: index === 0 ? decision : 'approve',
      decidedAt: resolvedAt,
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Operator attestation recorded.',
    })),
  });
}

function writeSources(rootDir, sources) {
  const artifactDir = path.join(rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifactDir, { recursive: true });
  for (const [name, value] of [
    ['fine-tuning-data-sufficiency.json', sources.assessment],
    ['fine-tuning-data-collection-plan.json', sources.collectionPlan],
    ['fine-tuning-data-intake-request.json', sources.request],
  ]) {
    writeJson(path.join(artifactDir, name), value);
  }
}

function writeResolution(rootDir, resolution) {
  const filename = path.join(rootDir, 'var', 'resolution.json');
  writeJson(filename, resolution, 0o600);
  return filename;
}

function run(rootDir, resolutionPath) {
  return spawnSync(
    process.execPath,
    [scriptPath, '--resolution', resolutionPath],
    { cwd: rootDir, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
  );
}

function planFiles(rootDir) {
  const outputDir = path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-collection-plans',
  );
  return fs.existsSync(outputDir) ? fs.readdirSync(outputDir) : [];
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function writeJson(filename, value, mode) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode,
  });
  if (mode !== undefined) {
    fs.chmodSync(filename, mode);
  }
}
