import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildFineTuningPrivateCollectionItemLifecycleDecision } from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import {
  finalizeFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade,
  prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade,
} from '../scripts/helpers/fine-tuning-private-reviewed-example-canonicalization-cascade.mjs';
import { buildSmokeFailureDiagnostics } from '../scripts/smoke-failure-diagnostics.mjs';
import { prepareReviewedExampleCanonicalizationFixture, withReviewedExampleCanonicalizationFixture } from './helpers/fine-tuning-private-reviewed-example-canonicalization-fixture.mjs';
import { writeJson } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';
import { writeLifecycleDecision } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const script = path.join(process.cwd(), 'scripts', 'materialize-fine-tuning-private-reviewed-example.mjs');

test('F1.21 CLI publishes an exact replayable local canonical record without outputting content', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const first = run(fixture, prepared);
    const second = run(fixture, prepared);
    assertChildSucceeded(first, { phase: 'initial materialization' });
    assertChildSucceeded(second, { phase: 'replay materialization' });
    assert.equal(first.stdout, second.stdout);
    assert.equal(first.stdout.includes(fixture.item.example.response), false);
    const directory = finalDirectory(fixture);
    assert.deepEqual(fs.readdirSync(directory), ['receipt.json', 'record.json']);
    assert.equal(fs.statSync(path.join(directory, 'record.json')).mode & 0o777, 0o600);
  });
});

test('F1.21 positive child failures report bounded sanitized diagnostics', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const secret = 'synthetic-secret-value-1234567890';
    const sentinel = 'synthetic-child-diagnostic-sentinel';
    const env = {
      ...process.env,
      F1_21_FIXTURE_PATH: fixture.rootDir,
      F1_21_SYNTHETIC_SECRET: secret,
    };
    const result = spawnSync(process.execPath, ['-e', `
      process.stdout.write(process.env.F1_21_SYNTHETIC_SENTINEL + ' stdout ' + process.env.F1_21_FIXTURE_PATH + '\\n' + 'x'.repeat(8192));
      process.stderr.write(process.env.F1_21_SYNTHETIC_SENTINEL + ' stderr ' + process.env.F1_21_FIXTURE_PATH + ' secret=' + process.env.F1_21_SYNTHETIC_SECRET + '\\n');
      process.exit(17);
    `], {
      cwd: fixture.rootDir,
      encoding: 'utf8',
      env: { ...env, F1_21_SYNTHETIC_SENTINEL: sentinel },
    });

    let failure;
    try {
      assertChildSucceeded(result, {
        env,
        frontier: 'synthetic-frontier',
        phase: 'synthetic diagnostic probe',
        repoDir: fixture.rootDir,
      });
    } catch (error) {
      failure = error;
    }
    assert.ok(failure);
    assert.match(failure.message, /"phase": "synthetic diagnostic probe"/);
    assert.match(failure.message, /"frontier": "synthetic-frontier"/);
    assert.match(failure.message, /"status": 17/);
    assert.match(failure.message, /"signal": null/);
    assert.match(failure.message, /"error": null/);
    assert.match(failure.message, /"stderr": \{/);
    assert.match(failure.message, /"stdout": \{/);
    assert.match(failure.message, /synthetic-child-diagnostic-sentinel/);
    assert.match(failure.message, /<local-path>/);
    assert.match(failure.message, /<redacted>/);
    assert.match(failure.message, /"truncated": true/);
    assert.ok(Buffer.byteLength(failure.message) < 8 * 1024);
    assert.equal(failure.message.includes(fixture.rootDir), false);
    assert.equal(failure.message.includes(secret), false);
  });
});

test('F1.21 rejects content injection and recovers only an empty pending directory', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const source = structuredClone(prepared.sourceBundle);
    source.example.instruction = 'different';
    writeJson(prepared.sourceBundleFilename, source);
    const result = run(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(historyRoot(fixture)), false);
  });

  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const pending = pendingDirectory(fixture, prepared);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    const result = run(fixture, prepared);
    assertChildSucceeded(result, { phase: 'empty pending directory recovery' });
    assert.equal(fs.existsSync(pending), false);
  });
});

test('F1.21 lifecycle removes the canonical record before deleting the reviewed item and rejects resurrection', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    assertChildSucceeded(run(fixture, prepared), { phase: 'pre-withdrawal materialization' });
    writeLifecycleDecision(fixture, 'withdraw');
    const result = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'lifecycle-fine-tuning-private-collection-item.mjs'),
      '--workspace', fs.realpathSync(fixture.workspaceFilename),
      '--admission', fs.realpathSync(fixture.admissionFilename),
      '--item', fs.realpathSync(fixture.itemFilename),
      '--decision', fs.realpathSync(fixture.decisionFilename),
    ], { cwd: fixture.rootDir, encoding: 'utf8' });
    assertChildSucceeded(result, { phase: 'withdrawal lifecycle' });
    assert.equal(fs.existsSync(finalDirectory(fixture)), false);
    const cascade = path.join(
      fixture.rootDir,
      'var', 'fine-tuning',
      'private-reviewed-example-canonical-record-deletion-cascades',
      fixture.workspace.workspaceHash,
      fixture.admission.envelope.retention.withdrawalReferenceSha256,
    );
    assert.deepEqual(fs.readdirSync(cascade), ['absence-receipt.json']);
    fs.mkdirSync(finalDirectory(fixture), { recursive: true, mode: 0o700 });
    const replay = spawnSync(process.execPath, [
      path.join(process.cwd(), 'scripts', 'lifecycle-fine-tuning-private-collection-item.mjs'),
      '--workspace', fs.realpathSync(fixture.workspaceFilename),
      '--admission', fs.realpathSync(fixture.admissionFilename),
      '--item', fixture.itemFilename,
      '--decision', fs.realpathSync(fixture.decisionFilename),
    ], { cwd: fixture.rootDir, encoding: 'utf8' });
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /resurrected record history/);
  });
});

test('F1.21 refuses copied inputs, unsafe links, missing predecessors, and terminal item resurrection', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const copiedItem = path.join(fixture.rootDir, 'var', 'inputs', 'copied-item.json');
    fs.copyFileSync(fixture.itemFilename, copiedItem);
    fs.chmodSync(copiedItem, 0o600);
    assert.notEqual(run(fixture, prepared, { item: copiedItem }).status, 0);

    const hardLink = path.join(fixture.rootDir, 'var', 'inputs', 'source-hard-link.json');
    fs.linkSync(prepared.sourceBundleFilename, hardLink);
    assert.notEqual(run(fixture, prepared, { sourceBundle: hardLink }).status, 0);
    fs.unlinkSync(hardLink);

    const request = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-artifact-requests',
      fixture.workspace.workspaceHash,
      `${fixture.item.itemHash}.json`,
    );
    fs.unlinkSync(request);
    assert.notEqual(run(fixture, prepared).status, 0);
  });

  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const backup = fs.readFileSync(fixture.itemFilename);
    assertChildSucceeded(run(fixture, prepared), { phase: 'pre-resurrection materialization' });
    writeLifecycleDecision(fixture, 'withdraw');
    assertChildSucceeded(runLifecycle(fixture), { phase: 'withdrawal lifecycle before resurrection' });
    fs.mkdirSync(path.dirname(fixture.itemFilename), { recursive: true, mode: 0o700 });
    fs.chmodSync(path.dirname(fixture.itemFilename), 0o700);
    fs.writeFileSync(fixture.itemFilename, backup, { mode: 0o600 });
    fs.chmodSync(fixture.itemFilename, 0o600);
    const replay = run(fixture, prepared);
    assert.notEqual(replay.status, 0);
    assert.match(replay.stderr, /terminal history|deletion cascade history/);
  });
});

test('F1.21 deletion cascade resumes every durable cleanup frontier', () => {
  for (const frontier of ['record.json', 'receipt.json', 'record-directory', 'inventory.json']) {
    withReviewedExampleCanonicalizationFixture((fixture) => {
      const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
      assertChildSucceeded(run(fixture, prepared), {
        phase: 'durable cleanup frontier materialization',
        frontier,
      });
      const input = writeLifecycleDecision(fixture, 'withdraw');
      const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
        admission: fixture.admission,
        executionAt: input.decidedAt,
        input,
        item: fixture.item,
        workspace: fixture.workspace,
      });
      const current = {
        admission: fixture.admission,
        item: fixture.item,
        workspace: fixture.workspace,
      };
      const repoDir = fs.realpathSync(fixture.rootDir);
      const originalUnlink = fs.unlinkSync;
      const originalRmdir = fs.rmdirSync;
      let injected = false;
      fs.unlinkSync = (filename) => {
        originalUnlink(filename);
        if (!injected && path.basename(filename) === frontier) {
          injected = true;
          throw new Error(`injected crash after ${frontier}`);
        }
      };
      fs.rmdirSync = (directory) => {
        originalRmdir(directory);
        if (!injected && frontier === 'record-directory' && path.basename(directory) === 'record') {
          injected = true;
          throw new Error('injected crash after record directory removal');
        }
      };
      try {
        assert.throws(
          () => prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
            current,
            decision,
            repoDir,
          }),
          /injected crash/,
        );
      } finally {
        fs.unlinkSync = originalUnlink;
        fs.rmdirSync = originalRmdir;
      }
      assert.equal(injected, true);
      const cascade = prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
        current,
        decision,
        repoDir,
      });
      finalizeFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
        cascade,
        current,
        decision,
        repoDir,
      });
      assert.equal(fs.existsSync(finalDirectory(fixture)), false);
      assert.deepEqual(
        fs.readdirSync(cascade.finalDirectory),
        ['absence-receipt.json'],
      );
    });
  }
});

test('F1.21 deletion cascade resumes after the absence receipt and final rename', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    assertChildSucceeded(run(fixture, prepared), { phase: 'pre-final-rename materialization' });
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: fixture.admission,
      executionAt: input.decidedAt,
      input,
      item: fixture.item,
      workspace: fixture.workspace,
    });
    const current = {
      admission: fixture.admission,
      item: fixture.item,
      workspace: fixture.workspace,
    };
    const repoDir = fs.realpathSync(fixture.rootDir);
    const cascade = prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
      current,
      decision,
      repoDir,
    });
    const resumed = prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
      current,
      decision,
      repoDir,
    });
    assert.deepEqual(resumed, cascade);

    const originalRename = fs.renameSync;
    let injected = false;
    fs.renameSync = (source, target) => {
      originalRename(source, target);
      if (!injected && source === cascade.pendingDirectory && target === cascade.finalDirectory) {
        injected = true;
        throw new Error('injected crash after final rename');
      }
    };
    try {
      assert.throws(
        () => finalizeFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
          cascade,
          current,
          decision,
          repoDir,
        }),
        /injected crash/,
      );
    } finally {
      fs.renameSync = originalRename;
    }
    assert.equal(injected, true);
    finalizeFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
      cascade,
      current,
      decision,
      repoDir,
    });
    assert.deepEqual(fs.readdirSync(cascade.finalDirectory), ['absence-receipt.json']);
  });
});

test('F1.21 deletion cascade blocks record resurrection before deleting the reviewed item', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    assertChildSucceeded(run(fixture, prepared), { phase: 'resurrection guard materialization' });
    const recordDirectory = finalDirectory(fixture);
    const record = fs.readFileSync(path.join(recordDirectory, 'record.json'));
    const receipt = fs.readFileSync(path.join(recordDirectory, 'receipt.json'));
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: fixture.admission,
      executionAt: input.decidedAt,
      input,
      item: fixture.item,
      workspace: fixture.workspace,
    });
    prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
      current: {
        admission: fixture.admission,
        item: fixture.item,
        workspace: fixture.workspace,
      },
      decision,
      repoDir: fs.realpathSync(fixture.rootDir),
    });

    fs.mkdirSync(recordDirectory, { mode: 0o700 });
    fs.writeFileSync(path.join(recordDirectory, 'record.json'), record, {
      mode: 0o600,
    });
    fs.writeFileSync(path.join(recordDirectory, 'receipt.json'), receipt, {
      mode: 0o600,
    });

    const result = runLifecycle(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /source reappeared before item deletion/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
    assert.equal(fs.existsSync(recordDirectory), true);
  });
});

test('F1.21 rejects invalid authority before reading the private source bundle', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture, {
      artifactDecision: 'reject',
    });
    const sourceBundleArgument = fs.realpathSync(prepared.sourceBundleFilename);
    fs.unlinkSync(sourceBundleArgument);

    const result = run(fixture, prepared, { sourceBundleArgument });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /requires one approved live F1\.15/);
    assert.doesNotMatch(result.stderr, /ENOENT|sourceBundle/);
  });
});

test('F1.21 deletion cascade rejects a tampered final receipt and final-pending ambiguity', () => {
  for (const attack of ['tamper', 'duplicate-pending']) {
    withReviewedExampleCanonicalizationFixture((fixture) => {
      const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
      assertChildSucceeded(run(fixture, prepared), { phase: 'cascade integrity materialization' });
      const input = writeLifecycleDecision(fixture, 'withdraw');
      const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
        admission: fixture.admission,
        executionAt: input.decidedAt,
        input,
        item: fixture.item,
        workspace: fixture.workspace,
      });
      const current = {
        admission: fixture.admission,
        item: fixture.item,
        workspace: fixture.workspace,
      };
      const repoDir = fs.realpathSync(fixture.rootDir);
      const cascade = prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
        current,
        decision,
        repoDir,
      });
      finalizeFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
        cascade,
        current,
        decision,
        repoDir,
      });
      const receiptFilename = path.join(cascade.finalDirectory, 'absence-receipt.json');
      const receipt = JSON.parse(fs.readFileSync(receiptFilename, 'utf8'));
      if (attack === 'tamper') {
        receipt.trainingAuthorized = true;
        writeJson(receiptFilename, receipt);
      } else {
        fs.mkdirSync(cascade.pendingDirectory, { mode: 0o700 });
        fs.chmodSync(cascade.pendingDirectory, 0o700);
        writeJson(
          path.join(cascade.pendingDirectory, 'absence-receipt.json'),
          receipt,
        );
      }
      assert.throws(
        () => prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
          current,
          decision,
          repoDir,
        }),
        /invalid|conflict/,
      );
    });
  }
});

function run(fixture, prepared, overrides = {}) {
  const sourceBundleFilename = overrides.sourceBundleArgument ||
    fs.realpathSync(overrides.sourceBundle || prepared.sourceBundleFilename);
  return spawnSync(process.execPath, [script,
    '--workspace', fs.realpathSync(fixture.workspaceFilename),
    '--admission', fs.realpathSync(fixture.admissionFilename),
    '--item', fs.realpathSync(overrides.item || fixture.itemFilename),
    '--intake-resolution', fs.realpathSync(prepared.intakeResolutionFilename),
    '--private-collection-plan', fs.realpathSync(prepared.privateCollectionPlanFilename),
    '--execution-request', fs.realpathSync(prepared.executionRequestFilename),
    '--execution-resolution', fs.realpathSync(prepared.executionResolutionFilename),
    '--artifact-preparation-resolution', fs.realpathSync(prepared.resolutionFilename),
    '--source-bundle', sourceBundleFilename,
  ], { cwd: fixture.rootDir, encoding: 'utf8' });
}

function runLifecycle(fixture) {
  return spawnSync(process.execPath, [
    path.join(process.cwd(), 'scripts', 'lifecycle-fine-tuning-private-collection-item.mjs'),
    '--workspace', fs.realpathSync(fixture.workspaceFilename),
    '--admission', fs.realpathSync(fixture.admissionFilename),
    '--item', fixture.itemFilename,
    '--decision', fs.realpathSync(fixture.decisionFilename),
  ], { cwd: fixture.rootDir, encoding: 'utf8' });
}

function assertChildSucceeded(result, {
  env = process.env,
  frontier,
  phase,
  repoDir = process.cwd(),
}) {
  if (result.status === 0) return;
  assert.equal(result.status, 0, JSON.stringify({
    phase,
    ...(frontier === undefined ? {} : { frontier }),
    ...buildSmokeFailureDiagnostics(result, { env, repoDir }),
  }, null, 2));
}

function historyRoot(fixture) {
  return path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-reviewed-example-canonical-records', fixture.workspace.workspaceHash);
}

function finalDirectory(fixture) {
  return path.join(historyRoot(fixture), fixture.item.itemHash);
}

function pendingDirectory(fixture, prepared) {
  return path.join(historyRoot(fixture), `.private-reviewed-example-canonical-record-pending-${fixture.item.itemHash}-${prepared.artifactPreparationResolution.artifactPreparationResolutionHash}`);
}
