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
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'request-fine-tuning-private-collection-execution.mjs',
);

test('private plan and resolution write one owner-only pending request', () => {
  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const result = run(rootDir, inputs);
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const outputPath = path.join(rootDir, summary.outputPath);
    const request = readJson(outputPath);

    assert.equal(
      summary.status,
      'pending-private-collection-execution-owner-review',
    );
    assert.equal(summary.actionCount, 7);
    assert.equal(summary.reviewCount, 5);
    assert.equal(summary.collectionExecutionApprovalRequired, true);
    assert.equal(summary.collectionExecutionApprovalRequestCreated, true);
    assert.equal(summary.collectionExecutionAuthorized, false);
    assert.equal(
      summary.privateCollectionWorkspaceCreationAuthorized,
      false,
    );
    assert.equal(summary.actualUserDataCollected, false);
    assert.equal(summary.trainingAuthorized, false);
    assert.equal(summary.externalProviderCalls, 'none');
    assert.equal(fs.lstatSync(outputPath).mode & 0o777, 0o600);
    assert.equal(
      request.requiredReviews.every(
        (review) => review.status === 'pending-owner-review',
      ),
      true,
    );
    assert.equal(
      request.privateCollectionPlan.id,
      sources.privateCollectionPlan.id,
    );
    assert.equal(request.ownerDecisionRecorded, false);
    assert.equal(request.ownerIdentityVerified, false);
    assert.equal(request.dataHandlingEvidenceRecorded, false);
    assert.equal(request.collectionExecutionApprovalRequestCreated, true);
    assert.equal(request.privateCollectionWorkspaceCreationAuthorized, false);
    assert.equal(request.actualUserDataCollected, false);
    assert.equal(
      fs.existsSync(path.join(
        rootDir,
        'var',
        'fine-tuning',
        'private-collection-workspaces',
      )),
      false,
    );
  });
});

test('expired and drifted private chains create no request', () => {
  withRoot((rootDir, sources) => {
    const expired = buildSources({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      plannedAt: new Date(Date.now() - 2000).toISOString(),
      requestedAt: new Date(Date.now() - 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 3000).toISOString(),
    });
    writeSources(rootDir, expired);
    assert.notEqual(
      run(rootDir, writePrivateInputs(rootDir, expired)).status,
      0,
    );
    assert.equal(requestFiles(rootDir).length, 0);
  });

  withRoot((rootDir, sources) => {
    const oldInputs = writePrivateInputs(rootDir, sources);
    const replacement = buildFineTuningDataIntakeRequest({
      assessment: sources.assessment,
      collectionPlan: sources.collectionPlan,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      requestedAt: new Date(Date.now() - 30 * 1000).toISOString(),
      requestedBy: 'local-operator-role',
    });
    writeSources(rootDir, { ...sources, intakeRequest: replacement });
    const result = run(rootDir, oldInputs);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /integrity|current F1 chain|does not match|must bind the exact request/,
    );
    assert.equal(requestFiles(rootDir).length, 0);
  });
});

test('both private inputs reject tracked, linked, weak, and malformed files', () => {
  for (const field of ['plan', 'resolution']) {
    withRoot((rootDir, sources) => {
      const inputs = writePrivateInputs(rootDir, sources);
      const tracked = path.join(rootDir, `${field}.json`);
      writeJson(
        tracked,
        field === 'plan'
          ? sources.privateCollectionPlan
          : sources.intakeResolution,
        0o600,
      );
      assert.match(
        run(rootDir, { ...inputs, [field]: tracked }).stderr,
        /must remain private/,
      );
    });

    withRoot((rootDir, sources) => {
      const inputs = writePrivateInputs(rootDir, sources);
      const linked = path.join(rootDir, 'var', `${field}-linked.json`);
      fs.symlinkSync(inputs[field], linked);
      assert.match(
        run(rootDir, { ...inputs, [field]: linked }).stderr,
        /owner-only bounded regular file|must remain private/,
      );
    });

    withRoot((rootDir, sources) => {
      const inputs = writePrivateInputs(rootDir, sources);
      const hardlinked = path.join(
        rootDir,
        'var',
        `${field}-hardlinked.json`,
      );
      fs.linkSync(inputs[field], hardlinked);
      assert.match(
        run(rootDir, { ...inputs, [field]: hardlinked }).stderr,
        /owner-only bounded regular file/,
      );
    });

    withRoot((rootDir, sources) => {
      const inputs = writePrivateInputs(rootDir, sources);
      fs.chmodSync(inputs[field], 0o644);
      assert.match(
        run(rootDir, inputs).stderr,
        /owner-only bounded regular file/,
      );
    });

    withRoot((rootDir, sources) => {
      const inputs = writePrivateInputs(rootDir, sources);
      fs.writeFileSync(inputs[field], '{"private":"PRIVATE-MARKER"', {
        mode: 0o600,
      });
      const result = run(rootDir, inputs);
      assert.match(result.stderr, /JSON is invalid/);
      assert.equal(result.stderr.includes('PRIVATE-MARKER'), false);
    });
  }
});

test('one private plan creates one request and invalid history fails closed', () => {
  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const first = run(rootDir, inputs);
    assert.equal(first.status, 0, first.stderr);
    const second = run(rootDir, inputs);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /already requested/);
    assert.equal(requestFiles(rootDir).length, 1);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const first = run(rootDir, inputs);
    assert.equal(first.status, 0, first.stderr);
    const outputPath = path.join(rootDir, JSON.parse(first.stdout).outputPath);
    const renamedPath = path.join(
      path.dirname(outputPath),
      `fine-tuning-private-collection-execution-request-${'f'.repeat(64)}.json`,
    );
    const stored = readJson(outputPath);
    stored.collectionExecutionAuthorized = true;
    writeJson(renamedPath, stored, 0o600);
    fs.rmSync(outputPath);
    const result = run(rootDir, inputs);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(requestFiles(rootDir).length, 1);
  });
});

test('private ancestor escape and weak output root fail closed', () => {
  for (const field of ['plan', 'resolution']) {
    withRoot((rootDir, sources) => {
      const outsideDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'fine-tuning-private-request-outside-'),
      );
      try {
        const inputs = writePrivateInputs(rootDir, sources);
        const outsidePath = path.join(outsideDir, `${field}.json`);
        writeJson(
          outsidePath,
          field === 'plan'
            ? sources.privateCollectionPlan
            : sources.intakeResolution,
          0o600,
        );
        const linkedDir = path.join(rootDir, 'var', `${field}-linked-dir`);
        fs.symlinkSync(outsideDir, linkedDir);
        assert.match(
          run(rootDir, {
            ...inputs,
            [field]: path.join(linkedDir, `${field}.json`),
          }).stderr,
          /must remain private/,
        );
      } finally {
        fs.rmSync(outsideDir, { force: true, recursive: true });
      }
    });
  }

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    fs.chmodSync(path.join(rootDir, 'var'), 0o770);
    assert.match(
      run(rootDir, inputs).stderr,
      /directory must be owner-only/,
    );
  });
});

function withRoot(runTest) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'fine-tuning-private-collection-request-'),
  );
  try {
    fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
    const sources = buildSources();
    writeSources(rootDir, sources);
    runTest(rootDir, sources);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function buildSources({
  requestedAt = new Date(Date.now() - 60 * 1000).toISOString(),
  resolvedAt = new Date(Date.now() - 30 * 1000).toISOString(),
  plannedAt = new Date(Date.now() - 20 * 1000).toISOString(),
  expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(),
} = {}) {
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const intakeRequest = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt,
    requestedAt,
    requestedBy: 'local-operator-role',
  });
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt,
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: resolvedAt,
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Operator attestation recorded.',
    })),
  });
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment,
    collectionPlan,
    plannedAt,
    request: intakeRequest,
    resolution: intakeResolution,
  });
  return {
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
  };
}

function writeSources(rootDir, sources) {
  const artifactDir = path.join(rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifactDir, { recursive: true });
  for (const [name, value] of [
    ['fine-tuning-data-sufficiency.json', sources.assessment],
    ['fine-tuning-data-collection-plan.json', sources.collectionPlan],
    ['fine-tuning-data-intake-request.json', sources.intakeRequest],
  ]) {
    writeJson(path.join(artifactDir, name), value);
  }
}

function writePrivateInputs(rootDir, sources) {
  const plan = path.join(rootDir, 'var', 'private-collection-plan.json');
  const resolution = path.join(rootDir, 'var', 'intake-resolution.json');
  writeJson(plan, sources.privateCollectionPlan, 0o600);
  writeJson(resolution, sources.intakeResolution, 0o600);
  return { plan, resolution };
}

function run(rootDir, { plan, resolution }) {
  return spawnSync(
    process.execPath,
    [scriptPath, '--plan', plan, '--resolution', resolution],
    { cwd: rootDir, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
  );
}

function requestFiles(rootDir) {
  const outputDir = path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-collection-execution-requests',
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
