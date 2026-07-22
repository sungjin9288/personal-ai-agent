import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import { resolveFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'prepare-fine-tuning-private-collection-workspace.mjs',
);

test('approved private resolution creates one empty owner-only workspace', () => {
  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const result = run(rootDir, inputs);
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    const workspaceDir = workspaceDirectory(rootDir, sources);
    const workspace = readJson(path.join(workspaceDir, 'workspace.json'));

    assert.equal(
      summary.status,
      'private-collection-workspace-prepared-collection-not-started',
    );
    assert.equal(summary.privateCollectionWorkspacePrepared, true);
    assert.equal(summary.collectionStarted, false);
    assert.equal(summary.actualUserDataCollected, false);
    assert.equal(summary.trainingAuthorized, false);
    assert.equal(summary.externalProviderCalls, 'none');
    assert.equal(summary.productionReadyClaim, false);
    assert.equal(result.stdout.includes('var/'), false);
    assert.equal(result.stdout.includes(rootDir), false);
    assert.equal(fs.lstatSync(workspaceDir).mode & 0o777, 0o700);
    assert.equal(
      fs.lstatSync(path.join(workspaceDir, 'workspace.json')).mode & 0o777,
      0o600,
    );
    for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
      const laneDirectory = path.join(workspaceDir, lane);
      assert.equal(fs.lstatSync(laneDirectory).mode & 0o777, 0o700);
      assert.deepEqual(fs.readdirSync(laneDirectory), []);
    }
    assert.equal(Object.keys(workspace.bindings).length, 14);
    assert.deepEqual(workspace.executionRequest, {
      id: sources.executionRequest.id,
      requestHash: sources.executionRequest.requestHash,
    });
    assert.deepEqual(workspace.lanes, [
      {
        directory: 'reviewed-examples',
        id: 'reviewed-examples',
        itemCount: 0,
      },
      {
        directory: 'answer-quality-cases',
        id: 'answer-quality-cases',
        itemCount: 0,
      },
    ]);
    assert.equal(workspace.collectionStarted, false);
    assert.equal(workspace.collectionItemCount, 0);
    assert.equal(workspace.workspaceContainsCollectionData, false);
    assert.equal(workspace.workspacePathStored, false);
    assert.equal(Object.hasOwn(workspace, 'workspacePath'), false);
  });
});

test('rejection, duplicate resolution, and invalid existing workspace history fail closed', () => {
  withRoot((rootDir, sources) => {
    const rejected = buildSources('reject');
    writeSources(rootDir, rejected);
    const result = run(rootDir, writePrivateInputs(rootDir, rejected));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /not approved/);
    assert.equal(workspaceDirectories(rootDir).length, 0);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    assert.equal(run(rootDir, inputs).status, 0);
    const duplicate = run(rootDir, inputs);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /already prepared/);
    assert.equal(workspaceDirectories(rootDir).length, 1);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    assert.equal(run(rootDir, inputs).status, 0);
    fs.writeFileSync(
      path.join(workspaceDirectory(rootDir, sources), 'unexpected.txt'),
      'invalid',
      { mode: 0o600 },
    );
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(fs.existsSync(path.join(workspaceDirectory(rootDir, sources), 'unexpected.txt')), true);
  });
});

test('expired and drifted private chains never publish a final workspace', () => {
  withRoot((rootDir) => {
    const expired = buildSources('approve', { baseTime: Date.now() - 2 * 60 * 60 * 1000 });
    writeSources(rootDir, expired);
    const result = run(rootDir, writePrivateInputs(rootDir, expired));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.deepEqual(workspaceDirectories(rootDir), []);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const driftedResolution = readJson(inputs.executionResolution);
    driftedResolution.bindings.assessmentHash = 'f'.repeat(64);
    rehashResolution(driftedResolution);
    writeJson(inputs.executionResolution, driftedResolution, 0o600);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /current F1 chain|does not match|integrity/);
    assert.deepEqual(workspaceDirectories(rootDir), []);
  });
});

test('expiry at the final publish recheck removes only the known staging workspace', () => {
  withRoot((rootDir) => {
    const baseTime = Date.now();
    const sources = buildSources('approve', { baseTime });
    writeSources(rootDir, sources);
    const result = run(rootDir, writePrivateInputs(rootDir, sources), {
      preloadDates: {
        first: new Date(baseTime).toISOString(),
        second: sources.executionResolution.expiresAt,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.deepEqual(workspaceDirectories(rootDir), []);
  });
});

test('renamed, tampered, and partial staging history is rejected without deletion', () => {
  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    assert.equal(run(rootDir, inputs).status, 0);
    const original = workspaceDirectory(rootDir, sources);
    const renamed = path.join(path.dirname(original),
      `fine-tuning-private-collection-workspace-${'f'.repeat(64)}`);
    fs.renameSync(original, renamed);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(fs.existsSync(renamed), true);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    assert.equal(run(rootDir, inputs).status, 0);
    const workspaceFile = path.join(workspaceDirectory(rootDir, sources), 'workspace.json');
    const tampered = readJson(workspaceFile);
    tampered.collectionItemCount = 1;
    writeJson(workspaceFile, tampered, 0o600);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(readJson(workspaceFile).collectionItemCount, 1);
  });

  withRoot((rootDir, sources) => {
    const inputs = writePrivateInputs(rootDir, sources);
    const outputRoot = path.join(
      rootDir,
      'var',
      'fine-tuning',
      'private-collection-workspaces',
    );
    fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
    fs.chmodSync(outputRoot, 0o700);
    const staging = path.join(
      outputRoot,
      '.fine-tuning-private-collection-workspace-staging-partial',
    );
    fs.mkdirSync(staging, { mode: 0o700 });
    fs.chmodSync(staging, 0o700);
    fs.writeFileSync(path.join(staging, 'workspace.json'), '{}\n', { mode: 0o600 });
    fs.chmodSync(path.join(staging, 'workspace.json'), 0o600);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(fs.existsSync(staging), true);
    assert.equal(fs.existsSync(path.join(staging, 'workspace.json')), true);
  });
});

test('all private inputs reject tracked, linked, weak, and malformed files', () => {
  for (const field of [
    'executionResolution',
    'executionRequest',
    'plan',
    'intakeResolution',
  ]) {
    withRoot((rootDir, sources) => {
      const inputs = writePrivateInputs(rootDir, sources);
      const tracked = path.join(rootDir, `${field}.json`);
      fs.copyFileSync(inputs[field], tracked);
      fs.chmodSync(tracked, 0o600);
      assert.match(run(rootDir, { ...inputs, [field]: tracked }).stderr, /must remain private/);
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
      assert.match(run(rootDir, inputs).stderr, /owner-only bounded regular file/);
    });

    withRoot((rootDir, sources) => {
      const inputs = writePrivateInputs(rootDir, sources);
      fs.writeFileSync(inputs[field], '{"private":"PRIVATE-MARKER"', { mode: 0o600 });
      const result = run(rootDir, inputs);
      assert.match(result.stderr, /JSON is invalid/);
      assert.equal(result.stderr.includes('PRIVATE-MARKER'), false);
      assert.equal(result.stderr.includes(inputs[field]), false);
    });
  }
});

test('private ancestor escapes and weak output root fail closed', () => {
  for (const field of [
    'executionResolution',
    'executionRequest',
    'plan',
    'intakeResolution',
  ]) {
    withRoot((rootDir, sources) => {
      const outsideDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'fine-tuning-workspace-outside-'),
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
    assert.match(run(rootDir, inputs).stderr, /directory must be owner-only/);
  });
});

function withRoot(runTest) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-workspace-'));
  try {
    fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
    const sources = buildSources();
    writeSources(rootDir, sources);
    runTest(rootDir, sources);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function buildSources(firstDecision = 'approve', { baseTime = Date.now() } = {}) {
  const expiresAt = new Date(baseTime + 60 * 60 * 1000).toISOString();
  const intakeRequestedAt = new Date(baseTime - 60 * 1000).toISOString();
  const intakeResolvedAt = new Date(baseTime - 50 * 1000).toISOString();
  const plannedAt = new Date(baseTime - 40 * 1000).toISOString();
  const executionRequestedAt = new Date(baseTime - 30 * 1000).toISOString();
  const executionResolvedAt = new Date(baseTime - 20 * 1000).toISOString();
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
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: executionResolvedAt,
    reviews: executionRequest.requiredReviews.map((review, index) => ({
      decision: index === 0 ? firstDecision : 'approve',
      decidedAt: executionResolvedAt,
      evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Bounded private collection review.',
    })),
  });
  return {
    assessment,
    collectionPlan,
    executionRequest,
    executionResolution,
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
  const executionResolution = path.join(rootDir, 'var', 'execution-resolution.json');
  const executionRequest = path.join(rootDir, 'var', 'execution-request.json');
  const plan = path.join(rootDir, 'var', 'private-collection-plan.json');
  const intakeResolution = path.join(rootDir, 'var', 'intake-resolution.json');
  writeJson(executionResolution, sources.executionResolution, 0o600);
  writeJson(executionRequest, sources.executionRequest, 0o600);
  writeJson(plan, sources.privateCollectionPlan, 0o600);
  writeJson(intakeResolution, sources.intakeResolution, 0o600);
  return { executionResolution, executionRequest, intakeResolution, plan };
}

function run(rootDir, inputs, { preloadDates } = {}) {
  const nodeArgs = [
    scriptPath,
    '--execution-resolution',
    inputs.executionResolution,
    '--execution-request',
    inputs.executionRequest,
    '--plan',
    inputs.plan,
    '--intake-resolution',
    inputs.intakeResolution,
  ];
  const env = { ...process.env };
  if (preloadDates) {
    nodeArgs.unshift(
      path.join(repoDir, 'test', 'helpers', 'two-step-date-preload.mjs'),
    );
    nodeArgs.unshift('--import');
    env.FINE_TUNING_TEST_FIRST_NO_ARG_DATE = preloadDates.first;
    env.FINE_TUNING_TEST_SECOND_NO_ARG_DATE = preloadDates.second;
  }
  return spawnSync(
    process.execPath,
    nodeArgs,
    {
      cwd: rootDir,
      encoding: 'utf8',
      env,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
}

function workspaceDirectory(rootDir, sources) {
  return path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${sources.executionResolution.resolutionHash}`,
  );
}

function workspaceDirectories(rootDir) {
  const outputRoot = path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
  );
  return fs.existsSync(outputRoot) ? fs.readdirSync(outputRoot) : [];
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

function rehashResolution(resolution) {
  const content = structuredClone(resolution);
  delete content.id;
  delete content.resolutionHash;
  const resolutionHash = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
  resolution.id =
    `fine-tuning-private-collection-execution-resolution-${resolutionHash}`;
  resolution.resolutionHash = resolutionHash;
}
