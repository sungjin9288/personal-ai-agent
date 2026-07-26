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
import { buildFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import { FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_DECISION_SCHEMA_VERSION } from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'resolve-fine-tuning-private-collection-execution.mjs',
);

test('unanimous private reviews write one owner-only bounded approval', () => {
  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const result = run(rootDir, inputs);
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const outputPath = path.join(rootDir, summary.outputPath);
    const resolution = readJson(outputPath);

    assert.equal(
      summary.status,
      'approved-for-bounded-private-collection-execution',
    );
    assert.equal(summary.privateCollectionWorkspaceCreationAuthorized, true);
    assert.equal(summary.reviewedExampleCollectionAuthorized, true);
    assert.equal(summary.answerQualityCaseCollectionAuthorized, true);
    assert.equal(summary.collectionExecutionApprovalResolved, true);
    assert.equal(summary.collectionExecutionAuthorized, true);
    assert.equal(summary.actualUserDataCollected, false);
    assert.equal(summary.trainingAuthorized, false);
    assert.equal(summary.productionReadyClaim, false);
    assert.equal(summary.externalProviderCalls, 'none');
    assert.equal(fs.lstatSync(outputPath).mode & 0o777, 0o600);
    assert.equal(fs.lstatSync(path.dirname(outputPath)).mode & 0o777, 0o700);
    assert.equal(resolution.requestedActions.length, 7);
    assert.equal(resolution.reviews.length, 5);
    assert.equal(resolution.expiresAt, sources.executionRequest.expiresAt);
    assert.equal(
      JSON.stringify(resolution).includes('Private execution decision.'),
      false,
    );
    assert.equal(resolution.ownerDecisionRecorded, false);
    assert.equal(resolution.ownerIdentityVerified, false);
    assert.equal(resolution.dataHandlingEvidenceRecorded, false);
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

test('one private rejection writes no workspace or collection authority', () => {
  withRoot((rootDir, sources) => {
    const result = run(
      rootDir,
      writePrivateInputs(rootDir, sources, 'reject'),
    );
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.status, 'rejected');
    assert.equal(summary.privateCollectionWorkspaceCreationAuthorized, false);
    assert.equal(summary.reviewedExampleCollectionAuthorized, false);
    assert.equal(summary.answerQualityCaseCollectionAuthorized, false);
    assert.equal(summary.collectionExecutionApprovalResolved, true);
    assert.equal(summary.collectionExecutionAuthorized, false);
    assert.equal(summary.trainingAuthorized, false);
  });
});

test('decision binding, stale requests, and current chain drift fail closed', () => {
  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources, 'approve', {
      requestHash: 'f'.repeat(64),
    });
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /bind the current request/);
    assert.equal(resolutionFiles(rootDir).length, 0);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources, 'approve', {
      unexpected: true,
    });
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /decision fields are invalid/);
    assert.equal(resolutionFiles(rootDir).length, 0);
  });

  withRoot((rootDir) => {
    const expired = buildSources({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      intakeRequestedAt: new Date(Date.now() - 60 * 1000).toISOString(),
      intakeResolvedAt: new Date(Date.now() - 50 * 1000).toISOString(),
      plannedAt: new Date(Date.now() - 40 * 1000).toISOString(),
      executionRequestedAt: new Date(Date.now() - 30 * 1000).toISOString(),
    });
    writeSources(rootDir, expired);
    const result = run(rootDir, writePrivateInputs(rootDir, expired));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.equal(resolutionFiles(rootDir).length, 0);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const replacement = buildFineTuningDataIntakeRequest({
      assessment: sources.assessment,
      collectionPlan: sources.collectionPlan,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      requestedAt: new Date(Date.now() - 30 * 1000).toISOString(),
      requestedBy: 'local-operator-role',
    });
    writeSources(rootDir, { ...sources, intakeRequest: replacement });
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /integrity|current F1 chain|must bind the exact request|does not match/,
    );
    assert.equal(resolutionFiles(rootDir).length, 0);
  });
});

test('all private inputs reject tracked, linked, weak, and malformed files', () => {
  for (const field of ['request', 'plan', 'resolution', 'decision']) {
    withRoot((rootDir, sources) => {
      const inputs = writePrivateInputs(rootDir, sources);
      const tracked = path.join(rootDir, `${field}.json`);
      writeJson(tracked, privateValue(field, inputs), 0o600);
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
      const hardlinked = path.join(rootDir, 'var', `${field}-hardlinked.json`);
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
      assert.equal(result.stderr.includes(inputs[field]), false);
    });
  }
});

test('one request creates one resolution and invalid history fails closed', () => {
  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const first = run(rootDir, inputs);
    assert.equal(first.status, 0, first.stderr);
    const second = run(rootDir, inputs);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /already resolved/);
    assert.equal(resolutionFiles(rootDir).length, 1);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const first = run(rootDir, inputs);
    assert.equal(first.status, 0, first.stderr);
    const outputPath = path.join(rootDir, JSON.parse(first.stdout).outputPath);
    const renamedPath = path.join(
      path.dirname(outputPath),
      `fine-tuning-private-collection-execution-resolution-${'f'.repeat(64)}.json`,
    );
    const stored = readJson(outputPath);
    stored.trainingAuthorized = true;
    writeJson(renamedPath, stored, 0o600);
    fs.rmSync(outputPath);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(resolutionFiles(rootDir).length, 1);
  });
});

test('private ancestor escapes and weak output root fail closed', () => {
  for (const field of ['request', 'plan', 'resolution', 'decision']) {
    withRoot((rootDir, sources) => {
      const outsideDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'fine-tuning-execution-resolution-outside-'),
      );
      try {
        const inputs = writePrivateInputs(rootDir, sources);
        const outsidePath = path.join(outsideDir, `${field}.json`);
        fs.copyFileSync(inputs[field], outsidePath);
        fs.chmodSync(outsidePath, 0o600);
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
    path.join(os.tmpdir(), 'fine-tuning-execution-resolution-'),
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
  intakeRequestedAt = new Date(Date.now() - 60 * 1000).toISOString(),
  intakeResolvedAt = new Date(Date.now() - 50 * 1000).toISOString(),
  plannedAt = new Date(Date.now() - 40 * 1000).toISOString(),
  executionRequestedAt = new Date(Date.now() - 30 * 1000).toISOString(),
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
    requestedAt: intakeRequestedAt,
    requestedBy: 'local-operator-role',
  });
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt: intakeResolvedAt,
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: intakeResolvedAt,
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
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedAt: executionRequestedAt,
    requestedBy: 'local-operator-role',
  });
  return {
    assessment,
    collectionPlan,
    executionRequest,
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

function writePrivateInputs(
  rootDir,
  sources,
  firstDecision = 'approve',
  decisionOverrides = {},
) {
  const request = path.join(rootDir, 'var', 'execution-request.json');
  const plan = path.join(rootDir, 'var', 'private-collection-plan.json');
  const resolution = path.join(rootDir, 'var', 'intake-resolution.json');
  const decision = path.join(rootDir, 'var', 'execution-decision.json');
  writeJson(request, sources.executionRequest, 0o600);
  writeJson(plan, sources.privateCollectionPlan, 0o600);
  writeJson(resolution, sources.intakeResolution, 0o600);
  writeJson(decision, {
    requestHash: sources.executionRequest.requestHash,
    requestId: sources.executionRequest.id,
    reviews: sources.executionRequest.requiredReviews.map((review, index) => ({
      decision: index === 0 ? firstDecision : 'approve',
      decidedAt: new Date().toISOString(),
      evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Private execution decision.',
    })),
    schemaVersion:
      FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_DECISION_SCHEMA_VERSION,
    ...decisionOverrides,
  }, 0o600);
  return { decision, plan, request, resolution };
}

function privateValue(field, inputs) {
  return readJson(inputs[field]);
}

function run(rootDir, { request, plan, resolution, decision }) {
  return spawnSync(
    process.execPath,
    [
      scriptPath,
      '--request',
      request,
      '--plan',
      plan,
      '--resolution',
      resolution,
      '--decision',
      decision,
    ],
    { cwd: rootDir, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 },
  );
}

function resolutionFiles(rootDir) {
  const outputDir = path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-collection-execution-resolutions',
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
