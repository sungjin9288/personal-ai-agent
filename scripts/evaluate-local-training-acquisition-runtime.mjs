import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildLocalTrainingAcquisitionPlan,
  buildLocalTrainingAcquisitionRequest,
  resolveLocalTrainingAcquisitionRequest,
} from '../src/core/local-training-acquisition-approval.mjs';
import {
  createLocalTrainingAcquisitionRuntime,
  LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
} from '../src/core/local-training-acquisition-runtime.mjs';

export const LOCAL_TRAINING_ACQUISITION_RUNTIME_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-runtime-evidence/v1';

const STARTED_AT = '2026-07-17T08:30:00.000Z';
const COMPLETED_AT = '2026-07-17T08:31:00.000Z';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function readJson(repoDir, relativePath) {
  return JSON.parse(fs.readFileSync(
    path.join(repoDir, relativePath),
    'utf8',
  ));
}

function buildFixture(toolchainDecision) {
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
      approvalOwner: 'fixture-acquisition-owner',
      egressOwner: 'fixture-security-owner',
      licenseOwner: 'fixture-license-owner',
      resourceOwner: 'fixture-resource-owner',
      rollbackOwner: 'fixture-rollback-owner',
    },
    reason: 'Fixture-only acquisition runtime review.',
    request,
    resolvedAt: '2026-07-17T08:10:00.000Z',
    resolvedBy: 'fixture-acquisition-owner',
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

function createFixtureRuntime(executeAcquisition, timestamps = [
  STARTED_AT,
  COMPLETED_AT,
]) {
  return createLocalTrainingAcquisitionRuntime({
    clock: () => timestamps.shift() || COMPLETED_AT,
    executeAcquisition,
    executionKind: 'fixture-simulated',
  });
}

function buildFixtureResult(payload, overrides = {}) {
  return {
    actualDependencyInstallationPerformed: false,
    actualModelDownloadPerformed: false,
    actualModelTrainingExecuted: false,
    approvalId: payload.approval.id,
    artifactEvidence: null,
    egressClosed: false,
    executionKind: 'fixture-simulated',
    externalProviderCalls: 'none',
    requestId: payload.request.id,
    schemaVersion:
      LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
    status: 'simulated',
    stepResults: payload.steps.map((step) => ({
      id: step.id,
      order: step.order,
      status: 'simulated',
    })),
    ...overrides,
  };
}

async function rejectionMatches(operation, pattern) {
  try {
    await operation();
    return false;
  } catch (error) {
    return pattern.test(String(error?.message || ''));
  }
}

export async function evaluateLocalTrainingAcquisitionRuntime({
  repoDir = process.cwd(),
} = {}) {
  const toolchainDecision = readJson(
    repoDir,
    'evidence/output-artifacts/local-training-toolchain-decision.json',
  );
  const fixture = buildFixture(toolchainDecision);
  let payloadContainsPrivateOwner = true;
  const runtime = createFixtureRuntime(async (payload) => {
    const serialized = JSON.stringify(payload);
    payloadContainsPrivateOwner =
      serialized.includes('fixture-acquisition-owner');
    return buildFixtureResult(payload);
  });
  const run = await runtime.run(fixture);

  const tamperedPlan = structuredClone(fixture.plan);
  tamperedPlan.steps[0].status = 'completed';
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
  const failureGuards = {
    actualTrainingClaimBlocked: await rejectionMatches(
      () => createFixtureRuntime(async (payload) => buildFixtureResult(
        payload,
        { actualModelTrainingExecuted: true },
      )).run(fixture),
      /does not match the approved plan/,
    ),
    expiredApprovalBlocked: await rejectionMatches(
      () => createFixtureRuntime(
        async (payload) => buildFixtureResult(payload),
        ['2026-07-17T10:00:00.000Z'],
      ).run(fixture),
      /authority-boundary/,
    ),
    payloadOwnerExcluded: payloadContainsPrivateOwner === false,
    planTamperingBlocked: await rejectionMatches(
      () => createFixtureRuntime(
        async (payload) => buildFixtureResult(payload),
      ).run({ ...fixture, plan: tamperedPlan }),
      /plan-integrity/,
    ),
    resultDriftBlocked: await rejectionMatches(
      () => createFixtureRuntime(async (payload) => buildFixtureResult(
        payload,
        { requestId: 'wrong-request' },
      )).run(fixture),
      /does not match the approved plan/,
    ),
    staleRequestBlocked: await rejectionMatches(
      () => createFixtureRuntime(
        async (payload) => buildFixtureResult(payload),
      ).run({ ...fixture, request: staleRequest }),
      /current-request/,
    ),
    stepOrderDriftBlocked: await rejectionMatches(
      () => createFixtureRuntime(async (payload) => buildFixtureResult(
        payload,
        {
          stepResults: payload.steps
            .map((step) => ({
              id: step.id,
              order: step.order,
              status: 'simulated',
            }))
            .reverse(),
        },
      )).run(fixture),
      /invalid step results/,
    ),
    unsupportedOutputBlocked: await rejectionMatches(
      () => createFixtureRuntime(async (payload) => buildFixtureResult(
        payload,
        { rawOutput: 'not-allowed' },
      )).run(fixture),
      /unsupported fields/,
    ),
  };
  assert.equal(
    Object.values(failureGuards).every(Boolean),
    true,
    'every acquisition runtime failure guard must pass',
  );

  const evidence = {
    claimBoundary: {
      actualDependencyInstallationPerformed: false,
      actualModelDownloadPerformed: false,
      actualModelTrainingExecuted: false,
      externalProviderCalls: 'none',
      externalSubmissionAuthorized: false,
      localTrainingAcquisitionRuntimeContractValidated: true,
      productionReadyClaim: false,
      rolloutAuthorized: false,
      trainingAuthorized: false,
    },
    execution: {
      adapterReportedDependencyInstallationPerformed:
        run.adapterReport.dependencyInstallationPerformed,
      adapterReportedModelDownloadPerformed:
        run.adapterReport.modelDownloadPerformed,
      approvalHash: run.approval.approvalHash,
      approvalId: run.approval.id,
      protocolVersion: runtime.protocolVersion,
      requestHash: run.request.requestHash,
      requestId: run.request.id,
      runHash: run.runHash,
      status: run.status,
      stepCount: run.steps.length,
    },
    failureGuards,
    mode: 'local-training-acquisition-runtime-contract',
    schemaVersion:
      LOCAL_TRAINING_ACQUISITION_RUNTIME_EVIDENCE_SCHEMA_VERSION,
    security: runtime.security,
  };
  const evidenceHash = hashRecord(evidence);
  return {
    ...evidence,
    evidenceHash,
    id: `local-training-acquisition-runtime-evidence-${evidenceHash}`,
  };
}
