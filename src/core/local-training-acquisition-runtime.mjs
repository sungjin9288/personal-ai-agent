import { createHash } from 'node:crypto';

import {
  assertLocalTrainingAcquisitionRequest,
  buildLocalTrainingAcquisitionPlan,
  LOCAL_TRAINING_ACQUISITION_ACTIONS,
} from './local-training-acquisition-approval.mjs';

export const LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION =
  'personal-ai-agent-local-training-acquisition-runtime/v1';
export const LOCAL_TRAINING_ACQUISITION_RUN_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-run/v1';

const EXECUTION_KINDS = new Set([
  'fixture-simulated',
  'local-acquisition',
]);

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local training acquisition runtime ${fieldName} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function requireExecutionKind(value) {
  const normalized = normalizeText(value);
  if (!EXECUTION_KINDS.has(normalized)) {
    throw new Error(
      `Unsupported local training acquisition execution kind: ${normalized || '<empty>'}.`,
    );
  }
  return normalized;
}

function hasOnlyKeys(value, allowedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).every((key) => allowedKeys.includes(key)),
  );
}

function assertCurrentPlan({
  approval,
  now,
  plan,
  request,
  toolchainDecision,
}) {
  assertLocalTrainingAcquisitionRequest(request, toolchainDecision);
  if (
    approval?.request?.id !== request.id ||
    approval?.request?.requestHash !== request.requestHash
  ) {
    throw new Error(
      'Local training acquisition runtime failed: current-request.',
    );
  }
  const expectedPlan = buildLocalTrainingAcquisitionPlan({
    approval,
    decision: toolchainDecision,
    now,
  });
  if (JSON.stringify(plan) !== JSON.stringify(expectedPlan)) {
    throw new Error(
      'Local training acquisition runtime failed: plan-integrity.',
    );
  }
  return expectedPlan;
}

function buildAdapterPayload({
  approval,
  executionKind,
  plan,
  request,
}) {
  return {
    approval: {
      approvalHash: approval.approvalHash,
      id: approval.id,
    },
    executionKind,
    mutableRoot: plan.mutableRoot,
    networkPolicy: plan.networkPolicy,
    protocolVersion:
      LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
    request: {
      id: request.id,
      requestHash: request.requestHash,
    },
    resourceEnvelope: { ...plan.resourceEnvelope },
    steps: plan.steps.map((step) => ({ ...step })),
    toolchainDecision: structuredClone(plan.toolchainDecision),
  };
}

function validateStepResults(stepResults, expectedSteps, status) {
  if (
    !Array.isArray(stepResults) ||
    stepResults.length !== expectedSteps.length
  ) {
    throw new Error(
      'Local training acquisition adapter result has invalid step results.',
    );
  }
  return stepResults.map((result, index) => {
    if (!hasOnlyKeys(result, ['id', 'order', 'status'])) {
      throw new Error(
        'Local training acquisition adapter result has invalid step results.',
      );
    }
    const expected = expectedSteps[index];
    if (
      result.id !== expected.id ||
      result.order !== expected.order ||
      result.status !== status
    ) {
      throw new Error(
        'Local training acquisition adapter result has invalid step results.',
      );
    }
    return {
      id: result.id,
      order: result.order,
      status: result.status,
    };
  });
}

function validateArtifactEvidence(value, executionKind) {
  if (executionKind === 'fixture-simulated') {
    if (value !== null) {
      throw new Error(
        'Fixture acquisition result must not claim artifact evidence.',
      );
    }
    return null;
  }
  if (
    !hasOnlyKeys(
      value,
      ['sourceModelSha256', 'trainerPackageSha256'],
    ) ||
    !isSha256(value.sourceModelSha256) ||
    !isSha256(value.trainerPackageSha256)
  ) {
    throw new Error(
      'Local acquisition result requires content-free artifact hashes.',
    );
  }
  return {
    sourceModelSha256: value.sourceModelSha256,
    trainerPackageSha256: value.trainerPackageSha256,
  };
}

function validateAdapterResult(result, {
  executionKind,
  payload,
}) {
  const allowedKeys = [
    'actualDependencyInstallationPerformed',
    'actualModelDownloadPerformed',
    'actualModelTrainingExecuted',
    'approvalId',
    'artifactEvidence',
    'egressClosed',
    'executionKind',
    'externalProviderCalls',
    'requestId',
    'schemaVersion',
    'status',
    'stepResults',
  ];
  if (!hasOnlyKeys(result, allowedKeys)) {
    throw new Error(
      'Local training acquisition adapter result contains unsupported fields.',
    );
  }

  const isFixture = executionKind === 'fixture-simulated';
  const expectedStatus = isFixture ? 'simulated' : 'completed';
  const expectedStepStatus = isFixture ? 'simulated' : 'completed';
  const expectedExternalCalls = isFixture
    ? 'none'
    : 'not-observed-by-runtime';
  if (
    result.schemaVersion !==
      LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION ||
    result.executionKind !== executionKind ||
    result.status !== expectedStatus ||
    result.approvalId !== payload.approval.id ||
    result.requestId !== payload.request.id ||
    result.actualDependencyInstallationPerformed !== !isFixture ||
    result.actualModelDownloadPerformed !== !isFixture ||
    result.actualModelTrainingExecuted !== false ||
    result.egressClosed !== !isFixture ||
    result.externalProviderCalls !== expectedExternalCalls
  ) {
    throw new Error(
      'Local training acquisition adapter result does not match the approved plan.',
    );
  }

  return {
    actualDependencyInstallationPerformed:
      result.actualDependencyInstallationPerformed,
    actualModelDownloadPerformed:
      result.actualModelDownloadPerformed,
    artifactEvidence: validateArtifactEvidence(
      result.artifactEvidence,
      executionKind,
    ),
    egressClosed: result.egressClosed,
    externalProviderCalls: result.externalProviderCalls,
    stepResults: validateStepResults(
      result.stepResults,
      payload.steps,
      expectedStepStatus,
    ),
  };
}

function buildRunRecord({
  adapterResult,
  approval,
  completedAt,
  executionKind,
  request,
  security,
  startedAt,
}) {
  const isFixture = executionKind === 'fixture-simulated';
  const record = {
    actualDependencyInstallationPerformed: false,
    actualModelDownloadPerformed: false,
    actualModelTrainingExecuted: false,
    adapterReport: {
      artifactEvidence: adapterResult.artifactEvidence,
      dependencyInstallationPerformed:
        adapterResult.actualDependencyInstallationPerformed,
      egressClosed: adapterResult.egressClosed,
      modelDownloadPerformed:
        adapterResult.actualModelDownloadPerformed,
    },
    approval: {
      approvalHash: approval.approvalHash,
      id: approval.id,
    },
    completedAt,
    execution: {
      kind: executionKind,
      protocolVersion:
        LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
      stepCount: adapterResult.stepResults.length,
    },
    externalProviderCalls: adapterResult.externalProviderCalls,
    externalSubmissionAuthorized: false,
    independentVerificationRequired: !isFixture,
    productionReadyClaim: false,
    request: {
      id: request.id,
      requestHash: request.requestHash,
    },
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_ACQUISITION_RUN_SCHEMA_VERSION,
    security,
    startedAt,
    status: isFixture
      ? 'fixture-validated'
      : 'adapter-completed-independent-verification-required',
    steps: adapterResult.stepResults,
    trainingAuthorized: false,
  };
  const runHash = hashRecord(record);
  return {
    ...record,
    id: `local-training-acquisition-run-${runHash}`,
    runHash,
  };
}

export function assertLocalTrainingAcquisitionRun(run) {
  const {
    id,
    runHash,
    ...record
  } = run || {};
  const expectedHash = hashRecord(record);
  const executionKind = record.execution?.kind;
  const isFixture = executionKind === 'fixture-simulated';
  const expectedStatus = isFixture
    ? 'fixture-validated'
    : 'adapter-completed-independent-verification-required';
  const expectedStepStatus = isFixture ? 'simulated' : 'completed';
  const expectedExternalCalls = isFixture
    ? 'none'
    : 'not-observed-by-runtime';
  const artifactEvidence = record.adapterReport?.artifactEvidence;
  const validArtifactEvidence = isFixture
    ? artifactEvidence === null
    : hasOnlyKeys(
        artifactEvidence,
        ['sourceModelSha256', 'trainerPackageSha256'],
      ) &&
      isSha256(artifactEvidence.sourceModelSha256) &&
      isSha256(artifactEvidence.trainerPackageSha256);
  const validSteps =
    Array.isArray(record.steps) &&
    record.steps.length === LOCAL_TRAINING_ACQUISITION_ACTIONS.length &&
    record.steps.every(
      (step, index) =>
        hasOnlyKeys(step, ['id', 'order', 'status']) &&
        step.id === LOCAL_TRAINING_ACQUISITION_ACTIONS[index] &&
        step.order === index + 1 &&
        step.status === expectedStepStatus,
    );
  if (
    !hasOnlyKeys(record, [
      'actualDependencyInstallationPerformed',
      'actualModelDownloadPerformed',
      'actualModelTrainingExecuted',
      'adapterReport',
      'approval',
      'completedAt',
      'execution',
      'externalProviderCalls',
      'externalSubmissionAuthorized',
      'independentVerificationRequired',
      'productionReadyClaim',
      'request',
      'rolloutAuthorized',
      'schemaVersion',
      'security',
      'startedAt',
      'status',
      'steps',
      'trainingAuthorized',
    ]) ||
    !hasOnlyKeys(record.adapterReport, [
      'artifactEvidence',
      'dependencyInstallationPerformed',
      'egressClosed',
      'modelDownloadPerformed',
    ]) ||
    !hasOnlyKeys(record.approval, ['approvalHash', 'id']) ||
    !hasOnlyKeys(record.execution, [
      'kind',
      'protocolVersion',
      'stepCount',
    ]) ||
    !hasOnlyKeys(record.request, ['id', 'requestHash']) ||
    !hasOnlyKeys(record.security, [
      'adapterSideEffects',
      'inputPolicy',
      'networkIsolation',
      'timeoutEnforcement',
    ]) ||
    !EXECUTION_KINDS.has(executionKind) ||
    record.schemaVersion !==
      LOCAL_TRAINING_ACQUISITION_RUN_SCHEMA_VERSION ||
    record.execution.protocolVersion !==
      LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION ||
    record.execution.stepCount !==
      LOCAL_TRAINING_ACQUISITION_ACTIONS.length ||
    record.status !== expectedStatus ||
    record.actualDependencyInstallationPerformed !== false ||
    record.actualModelDownloadPerformed !== false ||
    record.actualModelTrainingExecuted !== false ||
    record.adapterReport.dependencyInstallationPerformed !== !isFixture ||
    record.adapterReport.modelDownloadPerformed !== !isFixture ||
    record.adapterReport.egressClosed !== !isFixture ||
    record.externalProviderCalls !== expectedExternalCalls ||
    record.externalSubmissionAuthorized !== false ||
    record.independentVerificationRequired !== !isFixture ||
    record.productionReadyClaim !== false ||
    record.rolloutAuthorized !== false ||
    record.trainingAuthorized !== false ||
    record.security.adapterSideEffects !== 'caller-owned' ||
    record.security.inputPolicy !== 'content-free-metadata-only' ||
    record.security.networkIsolation !== 'caller-owned' ||
    record.security.timeoutEnforcement !== 'adapter-caller-owned' ||
    !isSha256(record.approval.approvalHash) ||
    record.approval.id !==
      `local-training-acquisition-approval-${record.approval.approvalHash}` ||
    !isSha256(record.request.requestHash) ||
    record.request.id !==
      `local-training-acquisition-request-${record.request.requestHash}` ||
    !Number.isFinite(Date.parse(record.startedAt)) ||
    !Number.isFinite(Date.parse(record.completedAt)) ||
    Date.parse(record.completedAt) < Date.parse(record.startedAt) ||
    !validArtifactEvidence ||
    !validSteps ||
    runHash !== expectedHash ||
    id !== `local-training-acquisition-run-${expectedHash}`
  ) {
    throw new Error(
      'Local training acquisition run failed: integrity.',
    );
  }
  return run;
}

export function createLocalTrainingAcquisitionRuntime({
  clock = () => new Date().toISOString(),
  executeAcquisition,
  executionKind = 'local-acquisition',
} = {}) {
  if (typeof executeAcquisition !== 'function') {
    throw new Error(
      'Local training acquisition runtime requires executeAcquisition.',
    );
  }
  const normalizedExecutionKind = requireExecutionKind(executionKind);
  const security = {
    adapterSideEffects: 'caller-owned',
    inputPolicy: 'content-free-metadata-only',
    networkIsolation: 'caller-owned',
    timeoutEnforcement: 'adapter-caller-owned',
  };

  return {
    executionKind: normalizedExecutionKind,
    protocolVersion:
      LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
    security,
    async run({
      approval,
      plan,
      request,
      toolchainDecision,
    } = {}) {
      const startedAt = requireTimestamp(clock(), 'startedAt');
      const currentPlan = assertCurrentPlan({
        approval,
        now: startedAt,
        plan,
        request,
        toolchainDecision,
      });
      const payload = buildAdapterPayload({
        approval,
        executionKind: normalizedExecutionKind,
        plan: currentPlan,
        request,
      });
      const result = await executeAcquisition(payload);
      const adapterResult = validateAdapterResult(result, {
        executionKind: normalizedExecutionKind,
        payload,
      });
      const completedAt = requireTimestamp(clock(), 'completedAt');
      if (Date.parse(completedAt) < Date.parse(startedAt)) {
        throw new Error(
          'Local training acquisition runtime completedAt must not precede startedAt.',
        );
      }
      return buildRunRecord({
        adapterResult,
        approval,
        completedAt,
        executionKind: normalizedExecutionKind,
        request,
        security,
        startedAt,
      });
    },
  };
}
