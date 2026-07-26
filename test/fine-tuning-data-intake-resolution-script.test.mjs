import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { FINE_TUNING_DATA_INTAKE_OWNER_DECISION_SCHEMA_VERSION } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(repoDir, 'scripts', 'resolve-fine-tuning-data-intake.mjs');

test('private decision writes one owner-only resolution without retaining reasons', () => {
  withRoot((rootDir) => {
    const result = run(rootDir, writeDecision(rootDir, 'approve'));
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const outputPath = path.join(rootDir, summary.outputPath);
    assert.equal(summary.status, 'approved-for-private-collection-planning');
    assert.equal(summary.privateCollectionPlanAllowed, true);
    assert.equal(fs.lstatSync(outputPath).mode & 0o777, 0o600);
    const stored = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    assert.equal(JSON.stringify(stored).includes('Private owner decision.'), false);
    assert.equal(stored.operatorAttestationRecorded, true);
    assert.equal(stored.ownerDecisionRecorded, false);
    assert.equal(stored.ownerIdentityVerified, false);
    assert.equal(stored.dataHandlingEvidenceRecorded, false);
    assert.equal(stored.dataHandlingEvidenceReferencesRecorded, true);
    const second = run(rootDir, writeDecision(rootDir, 'reject'));
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /already resolved/);
  });
});

test('private rejection records no planning or execution authority', () => {
  withRoot((rootDir) => {
    const result = run(rootDir, writeDecision(rootDir, 'reject'));
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.status, 'rejected');
    assert.equal(summary.privateCollectionPlanAllowed, false);
    assert.equal(summary.collectionExecutionAuthorized, false);
    assert.equal(summary.trainingAuthorized, false);
  });
});

test('private decision rejects request mismatch, history tampering, and output symlinks', () => {
  withRoot((rootDir) => {
    const mismatchPath = writeDecision(rootDir, 'approve', {
      requestHash: 'f'.repeat(64),
    });
    assert.match(run(rootDir, mismatchPath).stderr, /bind the current request/);

    const idMismatchPath = writeDecision(rootDir, 'approve', {
      requestId: 'fine-tuning-data-intake-request-mismatch',
    });
    assert.match(
      run(rootDir, idMismatchPath).stderr,
      /bind the current request/,
    );

    const extraFieldPath = writeDecision(rootDir, 'approve', {
      unexpected: true,
    });
    assert.match(
      run(rootDir, extraFieldPath).stderr,
      /decision fields are invalid/,
    );

    const first = run(rootDir, writeDecision(rootDir, 'reject'));
    assert.equal(first.status, 0, first.stderr);
    const outputPath = path.join(rootDir, JSON.parse(first.stdout).outputPath);
    fs.chmodSync(outputPath, 0o644);
    assert.match(run(rootDir, writeDecision(rootDir, 'reject')).stderr, /history is invalid/);
  });

  withRoot((rootDir) => {
    const target = path.join(rootDir, 'outside');
    fs.mkdirSync(target, { mode: 0o700 });
    fs.symlinkSync(target, path.join(rootDir, 'var', 'fine-tuning'));
    assert.match(
      run(rootDir, writeDecision(rootDir, 'reject')).stderr,
      /directory must be owner-only and contain no symbolic links/,
    );
  });
});

test('private decision rejects unsafe paths, modes, links, and oversized content', () => {
  withRoot((rootDir) => {
    const trackedPath = path.join(rootDir, 'decision.json');
    fs.writeFileSync(trackedPath, '{}', { mode: 0o600 });
    fs.chmodSync(trackedPath, 0o600);
    assert.match(run(rootDir, trackedPath).stderr, /must remain private/);

    const securePath = writeDecision(rootDir, 'approve');
    const linkedPath = path.join(rootDir, 'var', 'linked.json');
    fs.symlinkSync(securePath, linkedPath);
    assert.match(run(rootDir, linkedPath).stderr, /owner-only bounded regular file/);

    const hardlinkedPath = path.join(rootDir, 'var', 'hardlinked.json');
    fs.linkSync(securePath, hardlinkedPath);
    assert.match(run(rootDir, hardlinkedPath).stderr, /owner-only bounded regular file/);

    fs.chmodSync(securePath, 0o644);
    assert.match(run(rootDir, securePath).stderr, /owner-only bounded regular file/);

    const largePath = path.join(rootDir, 'var', 'large.json');
    fs.writeFileSync(largePath, 'x'.repeat(64 * 1024 + 1), { mode: 0o600 });
    assert.match(run(rootDir, largePath).stderr, /owner-only bounded regular file/);
  });
});

test('private decision parse errors do not expose private content or paths', () => {
  withRoot((rootDir) => {
    const privatePath = path.join(rootDir, 'var', 'malformed-private.json');
    fs.writeFileSync(
      privatePath,
      '{"private":"PRIVATE-CUSTOMER-MARKER"',
      { mode: 0o600 },
    );
    fs.chmodSync(privatePath, 0o600);

    const result = run(rootDir, privatePath);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /private decision JSON is invalid/);
    assert.equal(result.stderr.includes('PRIVATE-CUSTOMER-MARKER'), false);
    assert.equal(result.stderr.includes(privatePath), false);
  });
});

test('private resolution history rejects renamed or tampered records', () => {
  withRoot((rootDir) => {
    const first = run(rootDir, writeDecision(rootDir, 'approve'));
    assert.equal(first.status, 0, first.stderr);
    const outputPath = path.join(rootDir, JSON.parse(first.stdout).outputPath);
    const renamedPath = path.join(
      path.dirname(outputPath),
      `fine-tuning-data-intake-resolution-${'f'.repeat(64)}.json`,
    );
    const stored = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    stored.ownerDecisionRecorded = true;
    fs.writeFileSync(renamedPath, `${JSON.stringify(stored)}\n`, { mode: 0o600 });
    fs.chmodSync(renamedPath, 0o600);
    fs.rmSync(outputPath);

    const result = run(rootDir, writeDecision(rootDir, 'reject'));

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(fs.existsSync(outputPath), false);
  });
});

test('private resolution rejects group-writable var root', () => {
  withRoot((rootDir) => {
    fs.chmodSync(path.join(rootDir, 'var'), 0o770);

    const result = run(rootDir, writeDecision(rootDir, 'approve'));

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /directory must be owner-only and contain no symbolic links/,
    );
  });
});

test('private decision rejects a var ancestor symlink that escapes the repository', () => {
  withRoot((rootDir) => {
    const outsideDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'fine-tuning-data-intake-outside-'),
    );
    try {
      const sourcePath = writeDecision(rootDir, 'approve');
      const outsidePath = path.join(outsideDir, 'decision.json');
      fs.copyFileSync(sourcePath, outsidePath);
      fs.chmodSync(outsidePath, 0o600);
      const linkedDir = path.join(rootDir, 'var', 'linked-dir');
      fs.symlinkSync(outsideDir, linkedDir);

      const result = run(rootDir, path.join(linkedDir, 'decision.json'));

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /must remain private/);
    } finally {
      fs.rmSync(outsideDir, { force: true, recursive: true });
    }
  });
});

function withRoot(runTest) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-data-intake-resolution-'));
  try {
    writeFreshSources(rootDir);
    fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
    runTest(rootDir);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function writeFreshSources(rootDir) {
  const outputDir = path.join(rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(outputDir, { recursive: true });
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const now = Date.now();
  const request = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt: new Date(now + 60 * 60 * 1000).toISOString(),
    requestedAt: new Date(now - 60 * 1000).toISOString(),
    requestedBy: 'local-operator-role',
  });
  for (const [name, value] of [
    ['fine-tuning-data-sufficiency.json', assessment],
    ['fine-tuning-data-collection-plan.json', collectionPlan],
    ['fine-tuning-data-intake-request.json', request],
  ]) {
    fs.writeFileSync(path.join(outputDir, name), `${JSON.stringify(value)}\n`);
  }
}

function writeDecision(rootDir, decision, overrides = {}) {
  const request = JSON.parse(fs.readFileSync(path.join(
    rootDir,
    'evidence',
    'output-artifacts',
    'fine-tuning-data-intake-request.json',
  ), 'utf8'));
  const filename = path.join(rootDir, 'var', `${decision}.json`);
  fs.writeFileSync(filename, `${JSON.stringify({
    requestHash: request.requestHash,
    requestId: request.id,
    reviews: request.requiredReviews.map((review, index) => ({
      decision: index === 0 ? decision : 'approve',
      decidedAt: new Date().toISOString(),
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Private owner decision.',
    })),
    schemaVersion: FINE_TUNING_DATA_INTAKE_OWNER_DECISION_SCHEMA_VERSION,
    ...overrides,
  })}\n`, { mode: 0o600 });
  fs.chmodSync(filename, 0o600);
  return filename;
}

function run(rootDir, decisionPath) {
  return spawnSync(process.execPath, [scriptPath, '--decision', decisionPath], {
    cwd: rootDir,
    encoding: 'utf8',
  });
}
