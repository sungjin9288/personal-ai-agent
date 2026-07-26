import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  buildLocalTrainingAcquisitionPlan,
  buildLocalTrainingAcquisitionRequest,
  resolveLocalTrainingAcquisitionRequest,
} from '../src/core/local-training-acquisition-approval.mjs';
import {
  createLocalTrainingAcquisitionRuntime,
  LOCAL_TRAINING_ACQUISITION_RUN_SCHEMA_VERSION,
  LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
} from '../src/core/local-training-acquisition-runtime.mjs';

const toolchainDecision = JSON.parse(fs.readFileSync(
  new URL(
    '../evidence/output-artifacts/local-training-toolchain-decision.json',
    import.meta.url,
  ),
  'utf8',
));

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildFixture() {
  const request = buildLocalTrainingAcquisitionRequest({
    decision: toolchainDecision,
    expiresAt: '2026-07-17T10:00:00.000Z',
    proposedResourceEnvelope: {
      maxConcurrentDownloads: 2,
      maxDiskBytes: 16 * 1024 ** 3,
      maxDownloadBytes: 8 * 1024 ** 3,
      maxRuntimeMs: 60 * 60 * 1000,
    },
    requestedAt: '2026-07-17T08:00:00.000Z',
    requestedBy: 'local-operator',
  });
  const approval = resolveLocalTrainingAcquisitionRequest({
    decision: 'approve',
    owners: {
      approvalOwner: 'local-acquisition-owner',
      egressOwner: 'local-security-owner',
      licenseOwner: 'local-license-owner',
      resourceOwner: 'local-resource-owner',
      rollbackOwner: 'local-rollback-owner',
    },
    reason: 'Reviewed bounded acquisition only.',
    request,
    resolvedAt: '2026-07-17T08:10:00.000Z',
    resolvedBy: 'local-acquisition-owner',
    toolchainDecision,
  });
  const plan = buildLocalTrainingAcquisitionPlan({
    approval,
    decision: toolchainDecision,
    now: '2026-07-17T08:20:00.000Z',
  });
  return {
    approval,
    plan,
    request,
    toolchainDecision,
  };
}

function buildResult(payload, {
  executionKind = payload.executionKind,
  extra = {},
} = {}) {
  const isFixture = executionKind === 'fixture-simulated';
  return {
    actualDependencyInstallationPerformed: !isFixture,
    actualModelDownloadPerformed: !isFixture,
    actualModelTrainingExecuted: false,
    approvalId: payload.approval.id,
    artifactEvidence: isFixture
      ? null
      : {
          sourceModelSha256: sha256('source-model'),
          trainerPackageSha256: sha256('trainer-package'),
        },
    egressClosed: !isFixture,
    executionKind,
    externalProviderCalls: isFixture
      ? 'none'
      : 'not-observed-by-runtime',
    requestId: payload.request.id,
    schemaVersion:
      LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
    status: isFixture ? 'simulated' : 'completed',
    stepResults: payload.steps.map((step) => ({
      id: step.id,
      order: step.order,
      status: isFixture ? 'simulated' : 'completed',
    })),
    ...extra,
  };
}

function createRuntime({
  executeAcquisition,
  executionKind = 'fixture-simulated',
  timestamps = [
    '2026-07-17T08:30:00.000Z',
    '2026-07-17T08:31:00.000Z',
  ],
} = {}) {
  return createLocalTrainingAcquisitionRuntime({
    clock: () => timestamps.shift() || '2026-07-17T08:31:00.000Z',
    executeAcquisition:
      executeAcquisition || (async (payload) => buildResult(payload)),
    executionKind,
  });
}

test('fixture runtime passes only content-free plan metadata and records no acquisition', async () => {
  const fixture = buildFixture();
  let adapterPayload;
  const runtime = createRuntime({
    executeAcquisition: async (payload) => {
      adapterPayload = payload;
      return buildResult(payload);
    },
  });
  const run = await runtime.run(fixture);
  const serializedPayload = JSON.stringify(adapterPayload);

  assert.equal(runtime.protocolVersion,
    LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION);
  assert.equal(runtime.security.inputPolicy, 'content-free-metadata-only');
  assert.equal(serializedPayload.includes('local-acquisition-owner'), false);
  assert.equal(serializedPayload.includes('Reviewed bounded acquisition'), false);
  assert.equal(run.schemaVersion,
    LOCAL_TRAINING_ACQUISITION_RUN_SCHEMA_VERSION);
  assert.equal(run.status, 'fixture-validated');
  assert.equal(run.actualDependencyInstallationPerformed, false);
  assert.equal(run.actualModelDownloadPerformed, false);
  assert.equal(run.actualModelTrainingExecuted, false);
  assert.equal(run.adapterReport.dependencyInstallationPerformed, false);
  assert.equal(run.adapterReport.modelDownloadPerformed, false);
  assert.equal(run.externalProviderCalls, 'none');
  assert.equal(run.externalSubmissionAuthorized, false);
  assert.equal(run.trainingAuthorized, false);
  assert.equal(run.rolloutAuthorized, false);
  assert.equal(run.productionReadyClaim, false);
  assert.equal(run.steps.length, 7);
  assert.match(run.runHash, /^[a-f0-9]{64}$/u);
});

test('local acquisition report remains unverified until independent evidence exists', async () => {
  const fixture = buildFixture();
  const runtime = createRuntime({
    executeAcquisition: async (payload) => buildResult(payload),
    executionKind: 'local-acquisition',
  });
  const run = await runtime.run(fixture);

  assert.equal(
    run.status,
    'adapter-completed-independent-verification-required',
  );
  assert.equal(run.adapterReport.dependencyInstallationPerformed, true);
  assert.equal(run.adapterReport.modelDownloadPerformed, true);
  assert.equal(run.adapterReport.egressClosed, true);
  assert.match(
    run.adapterReport.artifactEvidence.sourceModelSha256,
    /^[a-f0-9]{64}$/u,
  );
  assert.equal(run.actualDependencyInstallationPerformed, false);
  assert.equal(run.actualModelDownloadPerformed, false);
  assert.equal(run.actualModelTrainingExecuted, false);
  assert.equal(run.independentVerificationRequired, true);
  assert.equal(run.externalProviderCalls, 'not-observed-by-runtime');
});

test('approval, current request, and plan drift stop before adapter execution', async () => {
  const fixture = buildFixture();
  let adapterCallCount = 0;
  const runtime = createRuntime({
    executeAcquisition: async (payload) => {
      adapterCallCount += 1;
      return buildResult(payload);
    },
  });

  const tamperedPlan = structuredClone(fixture.plan);
  tamperedPlan.steps[0].status = 'completed';
  await assert.rejects(
    runtime.run({ ...fixture, plan: tamperedPlan }),
    /plan-integrity/,
  );

  const staleRequest = buildLocalTrainingAcquisitionRequest({
    decision: toolchainDecision,
    expiresAt: '2026-07-17T11:00:00.000Z',
    proposedResourceEnvelope: {
      maxConcurrentDownloads: 2,
      maxDiskBytes: 16 * 1024 ** 3,
      maxDownloadBytes: 8 * 1024 ** 3,
      maxRuntimeMs: 60 * 60 * 1000,
    },
    requestedAt: '2026-07-17T08:05:00.000Z',
    requestedBy: 'local-operator',
  });
  await assert.rejects(
    createRuntime().run({ ...fixture, request: staleRequest }),
    /current-request/,
  );

  await assert.rejects(
    createRuntime({
      timestamps: ['2026-07-17T10:00:00.000Z'],
    }).run(fixture),
    /authority-boundary/,
  );
  assert.equal(adapterCallCount, 0);
});

test('adapter result drift and unsupported output fail closed', async () => {
  const fixture = buildFixture();
  await assert.rejects(
    createRuntime({
      executeAcquisition: async (payload) => buildResult(payload, {
        extra: { rawOutput: 'customer payload' },
      }),
    }).run(fixture),
    /unsupported fields/,
  );
  await assert.rejects(
    createRuntime({
      executeAcquisition: async (payload) => ({
        ...buildResult(payload),
        requestId: 'wrong-request',
      }),
    }).run(fixture),
    /does not match the approved plan/,
  );
  await assert.rejects(
    createRuntime({
      executeAcquisition: async (payload) => ({
        ...buildResult(payload),
        stepResults: [...buildResult(payload).stepResults].reverse(),
      }),
    }).run(fixture),
    /invalid step results/,
  );
});

test('actual adapter hashes and training claims are validated', async () => {
  const fixture = buildFixture();
  await assert.rejects(
    createRuntime({
      executionKind: 'local-acquisition',
      executeAcquisition: async (payload) => ({
        ...buildResult(payload, {
          executionKind: 'local-acquisition',
        }),
        artifactEvidence: {
          sourceModelSha256: 'not-a-hash',
          trainerPackageSha256: sha256('trainer-package'),
        },
      }),
    }).run(fixture),
    /requires content-free artifact hashes/,
  );
  await assert.rejects(
    createRuntime({
      executeAcquisition: async (payload) => ({
        ...buildResult(payload),
        actualModelTrainingExecuted: true,
      }),
    }).run(fixture),
    /does not match the approved plan/,
  );
});

test('runtime requires an adapter and a supported execution kind', () => {
  assert.throws(
    () => createLocalTrainingAcquisitionRuntime(),
    /requires executeAcquisition/,
  );
  assert.throws(
    () => createLocalTrainingAcquisitionRuntime({
      executeAcquisition: async () => ({}),
      executionKind: 'external-provider',
    }),
    /Unsupported local training acquisition execution kind/,
  );
});
