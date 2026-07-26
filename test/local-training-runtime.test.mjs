import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import {
  buildLocalTrainingPermissionRequest,
  resolveLocalTrainingPermissionRequest,
} from '../src/core/local-training-permission.mjs';
import {
  buildLocalTrainingExecutionApproval,
  createLocalTrainingRuntime,
  LOCAL_TRAINING_APPROVAL_SCHEMA_VERSION,
  LOCAL_TRAINING_PROTOCOL_VERSION,
  LOCAL_TRAINING_RUN_SCHEMA_VERSION,
} from '../src/core/local-training-runtime.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import {
  createLocalTrainingPostAcquisitionReadinessFixture,
} from '../scripts/evaluate-local-training-post-acquisition-readiness.mjs';
import { buildApprovedTrainingRecordFixture } from './helpers/approved-training-record-fixture.mjs';

const commandPath = path.resolve('fixtures/local-training-command.mjs');
const trainerId = 'fixture-local-trainer-v1';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildRecord(missionId, suffix) {
  return buildApprovedTrainingRecord(
    buildApprovedTrainingRecordFixture({
      example: {
        instruction: `Prepare reviewed instruction ${suffix}.`,
        response: `Return grounded response ${suffix} with an explicit next action.`,
      },
      missionId,
      suffix,
    }),
  );
}

function buildReadinessPackage() {
  const records = [
    buildRecord('mission-a', 'a'),
    buildRecord('mission-b', 'b'),
    buildRecord('mission-c', 'c'),
    buildRecord('mission-d', 'd'),
  ];
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: ['a', 'b'].map((suffix) => ({
      answer: {
        citedSourceKeys: ['memory:workspace/fact'],
        text: `Reviewed evidence ${suffix} confirms the decision.`,
      },
      expectedSourceKeys: ['memory:workspace/fact'],
      id: `baseline-${suffix}`,
      requiredAnswerTerms: ['reviewed evidence', 'decision'],
      retrievedItems: [{ sourceKey: 'memory:workspace/fact' }],
      reviewerVerdict: 'pass',
    })),
  });
  return buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest: buildTrainingDatasetManifest({ records, seed: 'local-training-runtime-v1' }),
    records,
  });
}

function buildApproval(readinessPackage, overrides = {}) {
  return buildLocalTrainingExecutionApproval({
    approvedAt: '2026-07-17T01:00:00.000Z',
    approvedBy: 'local-operator',
    baseModelId: 'approved-local-base-model',
    executionKind: 'fixture-simulated',
    expiresAt: '2026-07-17T02:00:00.000Z',
    readinessPackage,
    rollbackOwner: 'local-operator',
    trainerId,
    ...overrides,
  });
}

function buildExecutionPermission(readinessPackage, overrides = {}) {
  const request = buildLocalTrainingPermissionRequest({
    approvalOwner: 'local-operator',
    baseModelId: 'approved-local-base-model',
    evidence: {
      egress: {
        evidenceSha256: sha256('os-egress-isolation-evidence'),
        owner: 'security-owner',
      },
      license: {
        evidenceSha256: sha256('base-model-license-review'),
        owner: 'license-owner',
      },
      resource: {
        evidenceSha256: sha256('resource-envelope-evidence'),
        limits: {
          maxCpuThreads: 4,
          maxDiskBytes: 20_000_000_000,
          maxMemoryBytes: 8_000_000_000,
          maxRuntimeMs: 60_000,
        },
        owner: 'resource-owner',
      },
    },
    expiresAt: '2026-07-17T02:00:00.000Z',
    readinessPackage,
    requestedAt: '2026-07-17T00:50:00.000Z',
    rollbackOwner: 'local-operator',
    trainerId,
    ...overrides,
  });
  return resolveLocalTrainingPermissionRequest({
    decision: 'approve',
    reason: 'Reviewed bounded local execution evidence.',
    request,
    resolvedAt: '2026-07-17T00:55:00.000Z',
    resolvedBy: 'local-operator',
  });
}

function createRuntime(mode = 'success', options = {}) {
  const timestamps = [
    '2026-07-17T01:30:00.000Z',
    '2026-07-17T01:30:01.000Z',
  ];
  return createLocalTrainingRuntime({
    args: [commandPath, '--mode', mode],
    clock: () => timestamps.shift() || '2026-07-17T01:30:01.000Z',
    command: process.execPath,
    env: {
      HOME: process.env.HOME,
      OPENAI_API_KEY: 'must-not-reach-child',
      PATH: process.env.PATH,
    },
    trainerId,
    ...options,
  });
}

test('local training approval deterministically binds readiness, trainer, model, and rollback owner', () => {
  const readinessPackage = buildReadinessPackage();
  const approval = buildApproval(readinessPackage);
  const replayed = buildApproval(readinessPackage);

  assert.deepEqual(replayed, approval);
  assert.equal(approval.schemaVersion, LOCAL_TRAINING_APPROVAL_SCHEMA_VERSION);
  assert.equal(approval.readinessHash, readinessPackage.readinessHash);
  assert.equal(approval.datasetHash, readinessPackage.dataset.datasetHash);
  assert.equal(approval.localExecutionAuthorized, true);
  assert.equal(approval.externalSubmissionAuthorized, false);
  assert.equal(approval.rolloutAuthorized, false);
  assert.equal(approval.productionReadyClaim, false);
  assert.throws(
    () => buildApproval(readinessPackage, { approvedBy: 'password=operator-secret' }),
    /must be content-free metadata/,
  );
});

test('local training runtime executes the bounded fixture and returns a content-free run record', async () => {
  const readinessPackage = buildReadinessPackage();
  const before = JSON.stringify(readinessPackage);
  const runtime = createRuntime();
  const run = await runtime.run({
    approval: buildApproval(readinessPackage),
    readinessPackage,
  });
  const serialized = JSON.stringify(run);

  assert.equal(JSON.stringify(readinessPackage), before);
  assert.equal(runtime.protocolVersion, LOCAL_TRAINING_PROTOCOL_VERSION);
  assert.equal(runtime.security.shell, false);
  assert.equal(runtime.security.networkIsolation, 'caller-owned');
  assert.deepEqual(runtime.security.environmentKeys.sort(), ['HOME', 'PATH']);
  assert.equal(run.schemaVersion, LOCAL_TRAINING_RUN_SCHEMA_VERSION);
  assert.equal(run.status, 'completed');
  assert.equal(run.actualModelTrainingExecuted, false);
  assert.equal(run.trainerReportedActualModelTrainingExecuted, false);
  assert.equal(run.externalProviderCalls, 'none');
  assert.equal(run.externalSubmissionAuthorized, false);
  assert.equal(run.rolloutAuthorized, false);
  assert.equal(run.productionReadyClaim, false);
  assert.match(run.candidate.artifactSha256, /^[a-f0-9]{64}$/);
  assert.equal(serialized.includes('Prepare reviewed instruction'), false);
  assert.equal(serialized.includes('Return grounded response'), false);
  assert.throws(
    () => createRuntime('success', { args: ['password=process-secret'] }),
    /must not contain secret or customer data/,
  );
});

test('local training runtime rejects tampered readiness and stale or mismatched approval before execution', async () => {
  const readinessPackage = buildReadinessPackage();
  const tampered = structuredClone(readinessPackage);
  tampered.exports.train.content = tampered.exports.train.content.replace(
    'Prepare reviewed instruction',
    'password=customer-secret',
  );
  await assert.rejects(
    createRuntime().run({ approval: buildApproval(readinessPackage), readinessPackage: tampered }),
    /Fine-tuning readiness package failed/,
  );

  const expiredRuntime = createLocalTrainingRuntime({
    args: [commandPath],
    clock: () => '2026-07-17T03:00:00.000Z',
    command: process.execPath,
    trainerId,
  });
  await assert.rejects(
    expiredRuntime.run({ approval: buildApproval(readinessPackage), readinessPackage }),
    /time-window/,
  );

  const mismatchedApproval = buildApproval(readinessPackage, { trainerId: 'another-trainer' });
  await assert.rejects(
    createRuntime().run({ approval: mismatchedApproval, readinessPackage }),
    /operator-binding/,
  );
});

test('local training runtime rejects result drift and unsupported output fields', async () => {
  const readinessPackage = buildReadinessPackage();
  const approval = buildApproval(readinessPackage);

  await assert.rejects(
    createRuntime('mismatch').run({ approval, readinessPackage }),
    /does not match the approved execution request/,
  );
  await assert.rejects(
    createRuntime('unsupported-field').run({ approval, readinessPackage }),
    /contains unsupported fields/,
  );
  await assert.rejects(
    createRuntime('unsafe-metadata').run({ approval, readinessPackage }),
    /requires content-free candidate artifact metadata/,
  );
});

test('actual local model training requires product permission and enforces its runtime budget before spawn', async () => {
  const readinessPackage = buildReadinessPackage();
  assert.throws(
    () =>
      buildApproval(readinessPackage, {
        executionKind: 'local-model-training',
      }),
    /approved product permission/,
  );

  const permission = buildExecutionPermission(readinessPackage);
  const approval = buildApproval(readinessPackage, {
    executionKind: 'local-model-training',
    permission,
  });
  assert.equal(approval.permission.id, permission.id);
  assert.equal(approval.permission.permissionHash, permission.permissionHash);

  let spawnCalled = false;
  const runtime = createLocalTrainingRuntime({
    command: process.execPath,
    spawnProcess: () => {
      spawnCalled = true;
      throw new Error('spawn must not be reached');
    },
    timeoutMs: 60_001,
    trainerId,
  });
  await assert.rejects(
    runtime.run({ approval, readinessPackage }),
    /resource-limit/,
  );
  assert.equal(spawnCalled, false);
});

test('actual local model training revalidates post-acquisition admission and records its lineage', async (t) => {
  const fixture =
    await createLocalTrainingPostAcquisitionReadinessFixture({
      mode: 'recorded-local-acquisition',
    });
  t.after(fixture.cleanup);
  const target = fixture.postAcquisitionReadiness.trainingTarget;
  const approval = buildLocalTrainingExecutionApproval({
    approvedAt: fixture.permission.resolvedAt,
    approvedBy: fixture.permission.resolvedBy,
    baseModelId: target.baseModelId,
    executionKind: 'local-model-training',
    expiresAt: fixture.permission.expiresAt,
    permission: fixture.permission,
    readinessPackage: fixture.readinessPackage,
    rollbackOwner: target.rollbackOwner,
    trainerId: target.trainerId,
  });
  const timestamps = [
    '2026-07-17T08:41:00.000Z',
    '2026-07-17T08:41:01.000Z',
  ];
  const runtime = createRuntime('simulate-local-model-training', {
    clock: () => timestamps.shift() || '2026-07-17T08:41:01.000Z',
    trainerId: target.trainerId,
  });
  const run = await runtime.run({
    approval,
    currentPermission: fixture.permission,
    permissionRevocation: null,
    postAcquisitionReadiness:
      fixture.postAcquisitionReadiness,
    readinessPackage: fixture.readinessPackage,
  });

  assert.equal(run.actualModelTrainingExecuted, false);
  assert.equal(
    run.trainerReportedActualModelTrainingExecuted,
    true,
  );
  assert.equal(
    run.admission.postAcquisitionReadiness.readinessHash,
    fixture.postAcquisitionReadiness.readinessHash,
  );
  assert.equal(
    run.admission.productPermission.permissionHash,
    fixture.permission.permissionHash,
  );
  assert.equal(run.externalSubmissionAuthorized, false);
  assert.equal(run.rolloutAuthorized, false);
  assert.equal(run.productionReadyClaim, false);
});

test('actual local model training blocks missing, stale, or revoked admission before spawn', async (t) => {
  const fixture =
    await createLocalTrainingPostAcquisitionReadinessFixture({
      mode: 'recorded-local-acquisition',
    });
  t.after(fixture.cleanup);
  const target = fixture.postAcquisitionReadiness.trainingTarget;
  const approval = buildLocalTrainingExecutionApproval({
    approvedAt: fixture.permission.resolvedAt,
    approvedBy: fixture.permission.resolvedBy,
    baseModelId: target.baseModelId,
    executionKind: 'local-model-training',
    expiresAt: fixture.permission.expiresAt,
    permission: fixture.permission,
    readinessPackage: fixture.readinessPackage,
    rollbackOwner: target.rollbackOwner,
    trainerId: target.trainerId,
  });
  let spawnCount = 0;

  function blockedRuntime() {
    return createLocalTrainingRuntime({
      clock: () => '2026-07-17T08:41:00.000Z',
      command: process.execPath,
      spawnProcess: () => {
        spawnCount += 1;
        throw new Error('spawn must not be reached');
      },
      trainerId: target.trainerId,
    });
  }

  await assert.rejects(
    blockedRuntime().run({
      approval,
      currentPermission: fixture.permission,
      permissionRevocation: null,
      readinessPackage: fixture.readinessPackage,
    }),
    /post-acquisition-admission/,
  );
  await assert.rejects(
    blockedRuntime().run({
      approval,
      currentPermission: {
        ...fixture.permission,
        id: 'local-training-permission-stale',
      },
      permissionRevocation: null,
      postAcquisitionReadiness:
        fixture.postAcquisitionReadiness,
      readinessPackage: fixture.readinessPackage,
    }),
    /permission-current-state/,
  );
  await assert.rejects(
    blockedRuntime().run({
      approval,
      currentPermission: fixture.permission,
      permissionRevocation: {
        status: 'revoked',
      },
      postAcquisitionReadiness:
        fixture.postAcquisitionReadiness,
      readinessPackage: fixture.readinessPackage,
    }),
    /post-acquisition-admission/,
  );
  assert.equal(spawnCount, 0);
});

test('local training runtime bounds timeout and output without leaking child stderr', async () => {
  const readinessPackage = buildReadinessPackage();
  const approval = buildApproval(readinessPackage);

  await assert.rejects(
    createRuntime('hang', { timeoutMs: 50 }).run({ approval, readinessPackage }),
    /timed out after 50ms/,
  );
  await assert.rejects(
    createRuntime('large-output', { maxOutputBytes: 512 }).run({ approval, readinessPackage }),
    /stdout exceeds 512 bytes/,
  );
  await assert.rejects(
    createRuntime('fail').run({ approval, readinessPackage }),
    (error) => {
      assert.match(error.message, /exited with code 9/);
      assert.equal(error.message.includes('raw-customer-secret'), false);
      return true;
    },
  );
});
