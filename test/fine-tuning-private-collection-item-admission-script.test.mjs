import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
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
import { buildFineTuningPrivateCollectionWorkspace } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const scriptPath = path.join(
  repoDir,
  'scripts',
  'admit-fine-tuning-private-collection-item.mjs',
);
const datePreload = path.join(repoDir, 'test', 'helpers', 'two-step-date-preload.mjs');

test('two content-free envelopes create owner-only history without mutating F1.8 workspace', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const before = fs.readFileSync(workspaceFile);
    const first = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const second = writePrivateInputs(rootDir, sources, workspaceFile, 2);

    const firstResult = run(rootDir, first);
    const secondResult = run(rootDir, second);
    assert.equal(firstResult.status, 0, firstResult.stderr);
    assert.equal(secondResult.status, 0, secondResult.stderr);
    const summary = JSON.parse(firstResult.stdout);
    assert.equal(summary.status, 'private-collection-item-envelope-admitted-content-not-collected');
    assert.equal(summary.collectionEnvelopeCount, 1);
    assert.equal(summary.collectionItemCount, 0);
    assert.equal(summary.workspaceMutationPerformed, false);
    assert.equal(summary.externalProviderCalls, 'none');
    assert.equal(summary.productionReadyClaim, false);
    assert.equal(firstResult.stdout.includes(rootDir), false);
    assert.equal(firstResult.stdout.includes('a'.repeat(64)), false);
    assert.deepEqual(fs.readFileSync(workspaceFile), before);
    assertWorkspaceStillEmpty(path.dirname(workspaceFile));

    const admissions = admissionDirectories(rootDir);
    assert.equal(admissions.length, 2);
    assert.deepEqual(fs.readdirSync(admissionLockRoot(rootDir)), []);
    for (const directory of admissions) {
      assert.equal(fs.lstatSync(directory).mode & 0o777, 0o700);
      const file = path.join(directory, 'admission.json');
      assert.equal(fs.lstatSync(file).mode & 0o777, 0o600);
      const record = readJson(file);
      assert.equal(Object.keys(record.bindings).length, 16);
      assert.equal(record.collectionItemCount, 0);
      assert.equal(record.collectionEnvelopeCount, 1);
    }
  });
});

test('duplicate references and lane capacity fail closed without a mutable counter', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const first = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    assert.equal(run(rootDir, first).status, 0);
    const duplicate = run(rootDir, first);
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /duplicate|already admitted/);

    for (let index = 2; index <= 16; index += 1) {
      const result = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, index, {
        lane: 'reviewed-examples',
      }));
      assert.equal(result.status, 0, result.stderr);
    }
    const exhausted = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 17, {
      lane: 'reviewed-examples',
    }));
    assert.notEqual(exhausted.status, 0);
    assert.match(exhausted.stderr, /capacity/);
    assert.equal(admissionDirectories(rootDir).length, 16);
  });
});

test('reference, lineage, and withdrawal references are independently unique per workspace', () => {
  for (const duplicate of [
    ['source', 'referenceSha256'],
    ['source', 'lineageSha256'],
    ['retention', 'withdrawalReferenceSha256'],
  ]) {
    withRoot((rootDir, sources) => {
      const workspaceFile = writeWorkspace(rootDir, sources);
      const first = writePrivateInputs(rootDir, sources, workspaceFile, 1);
      assert.equal(run(rootDir, first).status, 0);
      const second = writePrivateInputs(rootDir, sources, workspaceFile, 2);
      const existing = readJson(first.envelope);
      const candidate = readJson(second.envelope);
      candidate[duplicate[0]][duplicate[1]] =
        existing[duplicate[0]][duplicate[1]];
      writeJson(second.envelope, candidate, 0o600);
      const result = run(rootDir, second);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /duplicate/);
      assert.equal(admissionDirectories(rootDir).length, 1);
    });
  }
});

test('answer-quality capacity permits eight envelopes and rejects the ninth', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    for (let index = 1; index <= 8; index += 1) {
      const result = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, index, {
        lane: 'answer-quality-cases',
      }));
      assert.equal(result.status, 0, result.stderr);
    }
    const exhausted = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 9, {
      lane: 'answer-quality-cases',
    }));
    assert.notEqual(exhausted.status, 0);
    assert.match(exhausted.stderr, /capacity/);
    assert.equal(admissionDirectories(rootDir).length, 8);
  });
});

test('invalid envelope, workspace location, and current-chain drift never publish an admission', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const invalid = readJson(inputs.envelope);
    invalid.retention.deleteBy = new Date(
      Date.parse(sources.executionResolution.expiresAt) + 1,
    ).toISOString();
    writeJson(inputs.envelope, invalid, 0o600);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /retention/);
    assert.deepEqual(admissionDirectories(rootDir), []);
    assert.equal(fs.existsSync(admissionRoot(rootDir)), false);
  });

  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const moved = path.join(rootDir, 'var', 'other-workspace.json');
    fs.copyFileSync(workspaceFile, moved);
    fs.chmodSync(moved, 0o600);
    const result = run(rootDir, { ...inputs, workspace: moved });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exact prepared workspace location/);
    assert.deepEqual(admissionDirectories(rootDir), []);
    assert.equal(fs.existsSync(admissionRoot(rootDir)), false);
  });

  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const drifted = readJson(inputs.executionResolution);
    drifted.bindings.assessmentHash = 'f'.repeat(64);
    writeJson(inputs.executionResolution, drifted, 0o600);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /current F1 chain|integrity|does not match/);
    assert.deepEqual(admissionDirectories(rootDir), []);
    assert.equal(fs.existsSync(admissionRoot(rootDir)), false);
  });

  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const invalid = readJson(inputs.executionResolution);
    invalid.resolutionHash = 'A'.repeat(64);
    writeJson(inputs.executionResolution, invalid, 0o600);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /resolution hash is invalid/);
    assert.equal(fs.existsSync(admissionRoot(rootDir)), false);
  });
});

test('weak and symlinked prepared workspace ancestors fail before admission history exists', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    fs.chmodSync(path.join(rootDir, 'var', 'fine-tuning'), 0o750);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /workspace ancestors are invalid/);
    assert.equal(fs.existsSync(admissionRoot(rootDir)), false);
  });

  withRoot((rootDir, sources) => {
    const varDirectory = path.join(rootDir, 'var');
    const target = path.join(rootDir, 'private-fine-tuning-target');
    fs.mkdirSync(target, { mode: 0o700 });
    fs.chmodSync(target, 0o700);
    fs.symlinkSync(target, path.join(varDirectory, 'fine-tuning'));
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must remain private|workspace ancestors are invalid/);
    assert.equal(fs.existsSync(admissionRoot(rootDir)), false);
  });
});

test('non-workspace private inputs may remain owner-only outside the repository', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-private-inputs-'));
    try {
      const externalInputs = { ...inputs };
      for (const field of [
        'envelope',
        'executionResolution',
        'executionRequest',
        'plan',
        'intakeResolution',
      ]) {
        const filename = path.join(outsideDir, path.basename(inputs[field]));
        fs.copyFileSync(inputs[field], filename);
        fs.chmodSync(filename, 0o600);
        externalInputs[field] = filename;
      }
      const result = run(rootDir, externalInputs);
      assert.equal(result.status, 0, result.stderr);
    } finally {
      fs.rmSync(outsideDir, { force: true, recursive: true });
    }
  });
});

test('six private inputs enforce path, link, owner-only, size, and JSON boundaries', () => {
  for (const field of [
    'workspace',
    'envelope',
    'executionResolution',
    'executionRequest',
    'plan',
    'intakeResolution',
  ]) {
    withRoot((rootDir, sources) => {
      const workspaceFile = writeWorkspace(rootDir, sources);
      const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
      const tracked = path.join(rootDir, `${field}.json`);
      fs.copyFileSync(inputs[field], tracked);
      fs.chmodSync(tracked, 0o600);
      const result = run(rootDir, { ...inputs, [field]: tracked });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /must remain private|exact prepared workspace location/);
    });

    withRoot((rootDir, sources) => {
      const workspaceFile = writeWorkspace(rootDir, sources);
      const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
      const linked = path.join(rootDir, 'var', `${field}-linked.json`);
      fs.symlinkSync(inputs[field], linked);
      const result = run(rootDir, { ...inputs, [field]: linked });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /owner-only bounded regular file|exact prepared workspace location/);
    });

    withRoot((rootDir, sources) => {
      const workspaceFile = writeWorkspace(rootDir, sources);
      const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
      const hardlinked = path.join(rootDir, 'var', `${field}-hardlinked.json`);
      fs.linkSync(inputs[field], hardlinked);
      const result = run(rootDir, { ...inputs, [field]: hardlinked });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /owner-only bounded regular file|exact prepared workspace location/);
    });
  }

  for (const field of [
    'workspace',
    'envelope',
    'executionResolution',
    'executionRequest',
    'plan',
    'intakeResolution',
  ]) {
    withRoot((rootDir, sources) => {
      const workspaceFile = writeWorkspace(rootDir, sources);
      const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
      fs.chmodSync(inputs[field], 0o640);
      assert.match(run(rootDir, inputs).stderr, /owner-only bounded regular file/);
    });

    withRoot((rootDir, sources) => {
      const workspaceFile = writeWorkspace(rootDir, sources);
      const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
      fs.writeFileSync(inputs[field], 'x'.repeat(64 * 1024 + 1), { mode: 0o600 });
      fs.chmodSync(inputs[field], 0o600);
      assert.match(run(rootDir, inputs).stderr, /owner-only bounded regular file/);
    });

    withRoot((rootDir, sources) => {
      const workspaceFile = writeWorkspace(rootDir, sources);
      const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
      fs.writeFileSync(inputs[field], '{', { mode: 0o600 });
      fs.chmodSync(inputs[field], 0o600);
      assert.match(run(rootDir, inputs).stderr, /JSON is invalid/);
    });
  }

  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const root = admissionRoot(rootDir);
    fs.mkdirSync(root, { recursive: true, mode: 0o700 });
    fs.chmodSync(root, 0o700);
    const partial = path.join(root, '.fine-tuning-private-collection-item-admission-staging-partial');
    fs.mkdirSync(partial, { mode: 0o700 });
    fs.writeFileSync(path.join(partial, 'admission.json'), '{}\n', { mode: 0o600 });
    const result = run(rootDir, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(fs.existsSync(partial), true);
  });
});

test('history tamper, unexpected files, and weak modes are preserved and rejected', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    assert.equal(run(rootDir, inputs).status, 0);
    const file = path.join(admissionDirectories(rootDir)[0], 'admission.json');
    const tampered = readJson(file);
    tampered.collectionItemCount = 1;
    writeJson(file, tampered, 0o600);
    const result = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 2));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(readJson(file).collectionItemCount, 1);
  });

  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    assert.equal(run(rootDir, inputs).status, 0);
    const directory = admissionDirectories(rootDir)[0];
    fs.writeFileSync(path.join(directory, 'unexpected.txt'), 'preserve', { mode: 0o600 });
    const result = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 2));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(fs.existsSync(path.join(directory, 'unexpected.txt')), true);
  });

  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    assert.equal(run(rootDir, inputs).status, 0);
    const file = path.join(admissionDirectories(rootDir)[0], 'admission.json');
    fs.chmodSync(file, 0o640);
    const result = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 2));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /history is invalid/);
    assert.equal(fs.lstatSync(file).mode & 0o777, 0o640);
  });
});

test('expiry during the final publish check removes only a known staging admission', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const result = run(rootDir, inputs, {
      preloadDates: {
        first: new Date().toISOString(),
        second: sources.executionResolution.expiresAt,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.deepEqual(admissionDirectories(rootDir), []);
  });

  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const envelope = readJson(inputs.envelope);
    envelope.retention.deleteBy = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    writeJson(inputs.envelope, envelope, 0o600);
    const result = run(rootDir, inputs, {
      preloadDates: {
        first: new Date().toISOString(),
        second: envelope.retention.deleteBy,
      },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /retention expired/);
    assert.deepEqual(admissionDirectories(rootDir), []);
  });
});

test('workspace lock allows exactly one concurrent duplicate admission', async () => {
  await withRootAsync(async (rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    prepareAdmissionRoots(rootDir);
    const inputs = writePrivateInputs(rootDir, sources, workspaceFile, 1);
    const results = await Promise.all([
      runAsync(rootDir, inputs),
      runAsync(rootDir, inputs),
    ]);
    assert.equal(results.filter((result) => result.status === 0).length, 1);
    assert.equal(admissionDirectories(rootDir).length, 1);
  });
});

test('workspace lock allows exactly one concurrent admission at answer-quality capacity', async () => {
  await withRootAsync(async (rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    prepareAdmissionRoots(rootDir);
    for (let index = 1; index <= 7; index += 1) {
      const result = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, index, {
        lane: 'answer-quality-cases',
      }));
      assert.equal(result.status, 0, result.stderr);
    }
    const results = await Promise.all([
      runAsync(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 8, {
        lane: 'answer-quality-cases',
      })),
      runAsync(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 9, {
        lane: 'answer-quality-cases',
      })),
    ]);
    assert.equal(results.filter((result) => result.status === 0).length, 1);
    assert.equal(admissionDirectories(rootDir).length, 8);
  });
});

test('an existing workspace lock stays fail-closed for manual recovery', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    prepareAdmissionRoots(rootDir);
    const lock = path.join(
      admissionLockRoot(rootDir),
      `${sources.workspace.workspaceHash}.lock`,
    );
    fs.writeFileSync(
      lock,
      'fine-tuning-private-collection-item-admission-lock/v1\n',
      { mode: 0o600 },
    );
    fs.chmodSync(lock, 0o600);
    const result = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 1));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /lock is already held/);
    assert.equal(fs.existsSync(lock), true);
    assert.deepEqual(admissionDirectories(rootDir), []);
  });
});

test('a durable releasing marker stays fail-closed for manual recovery', () => {
  withRoot((rootDir, sources) => {
    const workspaceFile = writeWorkspace(rootDir, sources);
    prepareAdmissionRoots(rootDir);
    const marker = path.join(
      admissionLockRoot(rootDir),
      `${sources.workspace.workspaceHash}.releasing`,
    );
    fs.writeFileSync(
      marker,
      'fine-tuning-private-collection-item-admission-lock/v1\n',
      { mode: 0o600 },
    );
    fs.chmodSync(marker, 0o600);
    const result = run(rootDir, writePrivateInputs(rootDir, sources, workspaceFile, 1));
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /lock history is invalid/);
    assert.equal(fs.existsSync(marker), true);
  });
});

function withRoot(callback) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-item-admission-'));
  try {
    const sources = buildSources();
    writeSources(rootDir, sources);
    fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
    fs.chmodSync(path.join(rootDir, 'var'), 0o700);
    callback(rootDir, sources);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

async function withRootAsync(callback) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-item-admission-'));
  try {
    const sources = buildSources();
    writeSources(rootDir, sources);
    fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
    fs.chmodSync(path.join(rootDir, 'var'), 0o700);
    await callback(rootDir, sources);
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function buildSources() {
  const baseTime = Date.now() - 5 * 60 * 1000;
  const timestamp = (offset) => new Date(baseTime + offset).toISOString();
  const expiresAt = timestamp(60 * 60 * 1000);
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const intakeRequest = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt,
    requestedAt: timestamp(0),
    requestedBy: 'local-operator-role',
  });
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt: timestamp(30 * 1000),
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: timestamp(30 * 1000),
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Synthetic operator attestation.',
    })),
  });
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment,
    collectionPlan,
    plannedAt: timestamp(60 * 1000),
    request: intakeRequest,
    resolution: intakeResolution,
  });
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedAt: timestamp(90 * 1000),
    requestedBy: 'local-operator-role',
  });
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: timestamp(120 * 1000),
    reviews: executionRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: timestamp(120 * 1000),
      evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Bounded private collection review.',
    })),
  });
  const baseSources = {
    assessment,
    collectionPlan,
    executionRequest,
    executionResolution,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
  };
  return {
    ...baseSources,
    workspace: buildFineTuningPrivateCollectionWorkspace({
      ...baseSources,
      preparedAt: timestamp(150 * 1000),
    }),
  };
}

function writeSources(rootDir, sources) {
  const artifactDir = path.join(rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifactDir, { recursive: true });
  writeJson(path.join(artifactDir, 'fine-tuning-data-sufficiency.json'), sources.assessment);
  writeJson(path.join(artifactDir, 'fine-tuning-data-collection-plan.json'), sources.collectionPlan);
  writeJson(path.join(artifactDir, 'fine-tuning-data-intake-request.json'), sources.intakeRequest);
}

function writeWorkspace(rootDir, sources) {
  const directory = path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${sources.executionResolution.resolutionHash}`,
  );
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    const laneDirectory = path.join(directory, lane);
    fs.mkdirSync(laneDirectory, { mode: 0o700 });
    fs.chmodSync(laneDirectory, 0o700);
  }
  const filename = path.join(directory, 'workspace.json');
  writeJson(filename, sources.workspace, 0o600);
  return filename;
}

function writePrivateInputs(rootDir, sources, workspace, index, { lane } = {}) {
  const privateDir = path.join(rootDir, 'var', 'inputs');
  fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(privateDir, 0o700);
  const filename = (name) => path.join(privateDir, `${name}-${index}.json`);
  const inputs = {
    envelope: filename('envelope'),
    executionRequest: filename('execution-request'),
    executionResolution: filename('execution-resolution'),
    intakeResolution: filename('intake-resolution'),
    plan: filename('plan'),
    workspace,
  };
  writeJson(inputs.envelope, buildEnvelope(sources.workspace, index, lane), 0o600);
  writeJson(inputs.executionRequest, sources.executionRequest, 0o600);
  writeJson(inputs.executionResolution, sources.executionResolution, 0o600);
  writeJson(inputs.intakeResolution, sources.intakeResolution, 0o600);
  writeJson(inputs.plan, sources.privateCollectionPlan, 0o600);
  return inputs;
}

function buildEnvelope(workspace, index, lane = index % 2 === 0
  ? 'answer-quality-cases'
  : 'reviewed-examples') {
  const digest = (offset) => createHash('sha256')
    .update(`content-free-envelope-${index}-${offset}`)
    .digest('hex');
  return {
    lane,
    privacy: {
      consentStatus: 'recorded',
      evidenceSha256: digest(1),
      purpose: 'private-answer-quality-improvement-and-readiness-review',
    },
    redaction: {
      evidenceSha256: digest(2),
      policyId: 'deidentify-before-content-admission-v1',
    },
    retention: {
      deleteBy: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      evidenceSha256: digest(3),
      policyId: 'delete-by-expiry-or-withdrawal-v1',
      withdrawalReferenceSha256: digest(4),
    },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1',
    source: {
      lineageSha256: digest(5),
      referenceSha256: digest(6),
      scopeReferenceSha256: digest(7),
      usageBasis: 'owner-attested-private-quality-improvement',
      usageBasisEvidenceSha256: digest(8),
    },
    submittedBy: 'local-operator-role',
    workspace: {
      id: workspace.id,
      workspaceHash: workspace.workspaceHash,
    },
  };
}

function run(rootDir, inputs, { preloadDates } = {}) {
  const args = [
    scriptPath,
    '--workspace', inputs.workspace,
    '--envelope', inputs.envelope,
    '--execution-resolution', inputs.executionResolution,
    '--execution-request', inputs.executionRequest,
    '--plan', inputs.plan,
    '--intake-resolution', inputs.intakeResolution,
  ];
  const environment = { ...process.env };
  if (preloadDates) {
    args.unshift('--import', datePreload);
    environment.FINE_TUNING_TEST_FIRST_NO_ARG_DATE = preloadDates.first;
    environment.FINE_TUNING_TEST_SECOND_NO_ARG_DATE = preloadDates.second;
  }
  return spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: 'utf8',
    env: environment,
  });
}

function runAsync(rootDir, inputs) {
  const args = [
    scriptPath,
    '--workspace', inputs.workspace,
    '--envelope', inputs.envelope,
    '--execution-resolution', inputs.executionResolution,
    '--execution-request', inputs.executionRequest,
    '--plan', inputs.plan,
    '--intake-resolution', inputs.intakeResolution,
  ];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: rootDir,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, stderr }));
  });
}

function prepareAdmissionRoots(rootDir) {
  for (const leaf of [
    'private-collection-item-admissions',
    'private-collection-item-admission-locks',
  ]) {
    const directory = path.join(rootDir, 'var', 'fine-tuning', leaf);
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  }
}

function admissionRoot(rootDir) {
  return path.join(rootDir, 'var', 'fine-tuning', 'private-collection-item-admissions');
}

function admissionLockRoot(rootDir) {
  return path.join(rootDir, 'var', 'fine-tuning', 'private-collection-item-admission-locks');
}

function admissionDirectories(rootDir) {
  const root = admissionRoot(rootDir);
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root)
    .filter((name) => name.startsWith('fine-tuning-private-collection-item-admission-'))
    .map((name) => path.join(root, name));
}

function assertWorkspaceStillEmpty(directory) {
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    assert.deepEqual(fs.readdirSync(path.join(directory, lane)), []);
  }
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function writeJson(filename, value, mode = 0o644) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { mode });
  fs.chmodSync(filename, mode);
}
