import { createHash } from 'node:crypto';

import { assertFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import {
  assertLocalTrainingCandidateArtifactVerification,
} from './local-training-candidate-artifact-verification.mjs';
import {
  assertApprovedLocalTrainingPermission,
} from './local-training-permission.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_CANDIDATE_EVALUATION_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-request/v1';
export const LOCAL_CANDIDATE_EVALUATION_ADMISSION_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-admission/v1';

const REQUEST_STATUS = 'pending-local-candidate-evaluation-admission';
const ADMISSION_STATUS = 'authorized-for-bounded-local-candidate-evaluation';
const REMAINING_GATES = Object.freeze([
  'training-process-provenance-review',
  'local-candidate-evaluation-execution',
  'candidate-quality-non-regression',
  'rollout-review',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
}

function hasExactKeys(value, expectedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === expectedKeys.length &&
    Object.keys(value).every((key) => expectedKeys.includes(key)),
  );
}

function requireMetadata(value, fieldName) {
  const normalized = normalizeText(value);
  if (
    !normalized ||
    normalized.length > 240 ||
    /[\r\n\0]/u.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(
      `Local candidate evaluation ${fieldName} must be content-free metadata.`,
    );
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local candidate evaluation ${fieldName} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function requirePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(
      `Local candidate evaluation ${fieldName} must be a positive integer.`,
    );
  }
  return normalized;
}

function buildEvaluationSuite(readinessPackage) {
  const baseline =
    readinessPackage.evaluationManifest.answerQualityBaseline;
  const caseIds = baseline.caseResults
    .map((result) => requireMetadata(result.id, 'case id'))
    .sort();
  if (
    caseIds.length === 0 ||
    new Set(caseIds).size !== caseIds.length ||
    !isSha256(baseline.evaluationHash)
  ) {
    throw new Error(
      'Local candidate evaluation requires a valid F1 evaluation suite.',
    );
  }
  return {
    baselineEvaluationHash: baseline.evaluationHash,
    caseIds,
    thresholdsHash: hashRecord(baseline.thresholds),
  };
}

function assertRecordedCandidateVerification(verification) {
  assertLocalTrainingCandidateArtifactVerification(verification);
  if (
    verification.mode !== 'recorded-local-training' ||
    verification.actualCandidateArtifactsObserved !== true ||
    verification.readyForExplicitCandidateEvaluationRequest !== true ||
    verification.independentCandidateArtifactVerificationPassed !== true ||
    verification.candidateEvaluationAuthorized !== false ||
    verification.rolloutAuthorized !== false ||
    verification.productionReadyClaim !== false
  ) {
    throw new Error(
      'Local candidate evaluation requires a recorded candidate artifact verification.',
    );
  }
}

function assertCurrentPermission({
  currentPermission,
  now,
  permissionRevocation,
  readinessPackage,
  verification,
}) {
  if (permissionRevocation !== null) {
    throw new Error(
      'Local candidate evaluation requires an explicit current no-revocation state.',
    );
  }
  assertApprovedLocalTrainingPermission({
    baseModelId: currentPermission?.baseModelId,
    now,
    permission: currentPermission,
    readinessPackage,
    rollbackOwner: currentPermission?.rollbackOwner,
    trainerId: currentPermission?.trainerId,
  });
  if (
    verification.productPermission.id !== currentPermission.id ||
    verification.productPermission.permissionHash !==
      currentPermission.permissionHash
  ) {
    throw new Error(
      'Local candidate evaluation failed: current-permission-binding.',
    );
  }
}

function buildRequestContent({
  candidateArtifactVerification,
  currentPermission,
  expiresAt,
  readinessPackage,
  requestedAt,
  requestedBy,
}) {
  return {
    actualModelEvaluated: false,
    candidate: {
      artifactFormat:
        candidateArtifactVerification.candidate.artifactFormat,
      artifactSetSha256:
        candidateArtifactVerification.candidate.artifactSetSha256,
      modelId: candidateArtifactVerification.candidate.modelId,
    },
    candidateArtifactVerification: {
      id: candidateArtifactVerification.id,
      verificationHash:
        candidateArtifactVerification.verificationHash,
    },
    candidateEvaluationAuthorized: false,
    dataset: {
      datasetHash: readinessPackage.dataset.datasetHash,
      readinessHash: readinessPackage.readinessHash,
    },
    evaluationSuite: buildEvaluationSuite(readinessPackage),
    expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    productPermission: {
      id: currentPermission.id,
      permissionHash: currentPermission.permissionHash,
    },
    productionReadyClaim: false,
    requestedAt,
    requestedBy,
    resourceLimits: {
      ...currentPermission.evidence.resource.limits,
    },
    rolloutAuthorized: false,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_REQUEST_SCHEMA_VERSION,
    status: REQUEST_STATUS,
    trainingAuthorized: false,
  };
}

export function buildLocalCandidateEvaluationRequest({
  candidateArtifactVerification,
  currentPermission,
  expiresAt,
  permissionRevocation,
  readinessPackage,
  requestedAt,
  requestedBy,
} = {}) {
  assertFineTuningReadinessPackage(readinessPackage);
  assertRecordedCandidateVerification(
    candidateArtifactVerification,
  );
  const normalizedRequestedAt = requireTimestamp(
    requestedAt,
    'requestedAt',
  );
  const normalizedExpiresAt = requireTimestamp(
    expiresAt,
    'expiresAt',
  );
  assertCurrentPermission({
    currentPermission,
    now: normalizedRequestedAt,
    permissionRevocation,
    readinessPackage,
    verification: candidateArtifactVerification,
  });
  if (
    Date.parse(normalizedRequestedAt) <
      Date.parse(candidateArtifactVerification.observedAt) ||
    Date.parse(normalizedExpiresAt) <=
      Date.parse(normalizedRequestedAt) ||
    Date.parse(normalizedExpiresAt) >
      Date.parse(currentPermission.expiresAt)
  ) {
    throw new Error(
      'Local candidate evaluation request has an invalid time window.',
    );
  }
  const content = buildRequestContent({
    candidateArtifactVerification,
    currentPermission,
    expiresAt: normalizedExpiresAt,
    readinessPackage,
    requestedAt: normalizedRequestedAt,
    requestedBy: requireMetadata(requestedBy, 'requestedBy'),
  });
  const requestHash = hashRecord(content);
  return {
    ...content,
    id: `local-candidate-evaluation-request-${requestHash}`,
    requestHash,
  };
}

export function assertLocalCandidateEvaluationRequest({
  candidateArtifactVerification,
  currentPermission,
  now,
  permissionRevocation,
  readinessPackage,
  request,
} = {}) {
  assertFineTuningReadinessPackage(readinessPackage);
  assertRecordedCandidateVerification(
    candidateArtifactVerification,
  );
  const normalizedNow = requireTimestamp(now, 'admission now');
  assertCurrentPermission({
    currentPermission,
    now: normalizedNow,
    permissionRevocation,
    readinessPackage,
    verification: candidateArtifactVerification,
  });
  const requestedAt = requireTimestamp(
    request?.requestedAt,
    'requestedAt',
  );
  const expiresAt = requireTimestamp(
    request?.expiresAt,
    'expiresAt',
  );
  const requestedBy = requireMetadata(
    request?.requestedBy,
    'requestedBy',
  );
  const { id, requestHash, ...content } = request || {};
  const expectedHash = hashRecord(content);
  const expectedContent = buildRequestContent({
    candidateArtifactVerification,
    currentPermission,
    expiresAt,
    readinessPackage,
    requestedAt,
    requestedBy,
  });
  if (
    !hasExactKeys(content, Object.keys(expectedContent)) ||
    JSON.stringify(content) !== JSON.stringify(expectedContent) ||
    requestHash !== expectedHash ||
    id !== `local-candidate-evaluation-request-${expectedHash}` ||
    Date.parse(requestedAt) >
      Date.parse(normalizedNow) ||
    Date.parse(expiresAt) <=
      Date.parse(normalizedNow) ||
    Date.parse(requestedAt) <
      Date.parse(candidateArtifactVerification.observedAt) ||
    Date.parse(expiresAt) >
      Date.parse(currentPermission.expiresAt)
  ) {
    throw new Error(
      'Local candidate evaluation request failed: integrity-or-current-binding.',
    );
  }
  return request;
}

function buildAdmissionContent({
  admittedAt,
  candidateArtifactVerification,
  currentPermission,
  request,
}) {
  return {
    actualModelEvaluated: false,
    admittedAt,
    candidate: request.candidate,
    candidateArtifactVerification:
      request.candidateArtifactVerification,
    candidateEvaluationAuthorized: true,
    evaluationSuite: request.evaluationSuite,
    expiresAt: request.expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    productPermission: request.productPermission,
    productionReadyClaim: false,
    remainingGates: [...REMAINING_GATES],
    request: {
      id: request.id,
      requestHash: request.requestHash,
    },
    resourceLimits: request.resourceLimits,
    rollback: {
      activationAuthorized: false,
      baseline: 'current-provider-model-prompt-and-rag-path',
      owner: currentPermission.rollbackOwner,
    },
    rolloutAuthorized: false,
    schemaVersion:
      LOCAL_CANDIDATE_EVALUATION_ADMISSION_SCHEMA_VERSION,
    status: ADMISSION_STATUS,
    trainingAuthorized: false,
    trainingProcessProvenanceVerified:
      candidateArtifactVerification
        .trainingProcessProvenanceVerified,
  };
}

export function admitLocalCandidateEvaluation({
  candidateArtifactVerification,
  currentPermission,
  now,
  permissionRevocation,
  readinessPackage,
  request,
} = {}) {
  const normalizedNow = requireTimestamp(now, 'admittedAt');
  assertLocalCandidateEvaluationRequest({
    candidateArtifactVerification,
    currentPermission,
    now: normalizedNow,
    permissionRevocation,
    readinessPackage,
    request,
  });
  const content = buildAdmissionContent({
    admittedAt: normalizedNow,
    candidateArtifactVerification,
    currentPermission,
    request,
  });
  const admissionHash = hashRecord(content);
  return assertLocalCandidateEvaluationAdmission({
    ...content,
    admissionHash,
    id: `local-candidate-evaluation-admission-${admissionHash}`,
  });
}

function assertAdmissionShape(content) {
  if (
    !hasExactKeys(content, [
      'actualModelEvaluated',
      'admittedAt',
      'candidate',
      'candidateArtifactVerification',
      'candidateEvaluationAuthorized',
      'evaluationSuite',
      'expiresAt',
      'externalProviderCalls',
      'externalSubmissionAuthorized',
      'productPermission',
      'productionReadyClaim',
      'remainingGates',
      'request',
      'resourceLimits',
      'rollback',
      'rolloutAuthorized',
      'schemaVersion',
      'status',
      'trainingAuthorized',
      'trainingProcessProvenanceVerified',
    ]) ||
    !hasExactKeys(content.candidate, [
      'artifactFormat',
      'artifactSetSha256',
      'modelId',
    ]) ||
    !hasExactKeys(content.candidateArtifactVerification, [
      'id',
      'verificationHash',
    ]) ||
    !hasExactKeys(content.evaluationSuite, [
      'baselineEvaluationHash',
      'caseIds',
      'thresholdsHash',
    ]) ||
    !hasExactKeys(content.productPermission, [
      'id',
      'permissionHash',
    ]) ||
    !hasExactKeys(content.request, ['id', 'requestHash']) ||
    !hasExactKeys(content.resourceLimits, [
      'maxCpuThreads',
      'maxDiskBytes',
      'maxMemoryBytes',
      'maxRuntimeMs',
    ]) ||
    !hasExactKeys(content.rollback, [
      'activationAuthorized',
      'baseline',
      'owner',
    ])
  ) {
    throw new Error(
      'Local candidate evaluation admission failed: integrity.',
    );
  }
}

function assertAdmissionReferences(content) {
  const caseIds = content.evaluationSuite.caseIds;
  requireMetadata(content.candidate.modelId, 'candidate modelId');
  requireMetadata(
    content.candidate.artifactFormat,
    'candidate artifactFormat',
  );
  requireMetadata(content.rollback.owner, 'rollback owner');
  for (const [fieldName, value] of Object.entries(
    content.resourceLimits,
  )) {
    requirePositiveInteger(value, fieldName);
  }
  if (
    !isSha256(content.candidate.artifactSetSha256) ||
    !isSha256(
      content.candidateArtifactVerification.verificationHash,
    ) ||
    content.candidateArtifactVerification.id !==
      `local-training-candidate-artifact-verification-${content.candidateArtifactVerification.verificationHash}` ||
    !isSha256(content.evaluationSuite.baselineEvaluationHash) ||
    !isSha256(content.evaluationSuite.thresholdsHash) ||
    !Array.isArray(caseIds) ||
    caseIds.length === 0 ||
    new Set(caseIds).size !== caseIds.length ||
    JSON.stringify(caseIds) !== JSON.stringify([...caseIds].sort()) ||
    !isSha256(content.productPermission.permissionHash) ||
    content.productPermission.id !==
      `local-training-permission-${content.productPermission.permissionHash}` ||
    !isSha256(content.request.requestHash) ||
    content.request.id !==
      `local-candidate-evaluation-request-${content.request.requestHash}`
  ) {
    throw new Error(
      'Local candidate evaluation admission failed: references.',
    );
  }
  for (const caseId of caseIds) {
    requireMetadata(caseId, 'case id');
  }
}

function assertAdmissionAuthority(content) {
  if (
    content.schemaVersion !==
      LOCAL_CANDIDATE_EVALUATION_ADMISSION_SCHEMA_VERSION ||
    content.status !== ADMISSION_STATUS ||
    content.actualModelEvaluated !== false ||
    content.candidateEvaluationAuthorized !== true ||
    content.trainingAuthorized !== false ||
    content.externalProviderCalls !== 'none' ||
    content.externalSubmissionAuthorized !== false ||
    content.rolloutAuthorized !== false ||
    content.productionReadyClaim !== false ||
    content.trainingProcessProvenanceVerified !== false ||
    content.rollback.activationAuthorized !== false ||
    content.rollback.baseline !==
      'current-provider-model-prompt-and-rag-path' ||
    JSON.stringify(content.remainingGates) !==
      JSON.stringify(REMAINING_GATES)
  ) {
    throw new Error(
      'Local candidate evaluation admission failed: authority-boundary.',
    );
  }
}

export function assertLocalCandidateEvaluationAdmission(admission) {
  const { admissionHash, id, ...content } = admission || {};
  assertAdmissionShape(content);
  assertAdmissionReferences(content);
  assertAdmissionAuthority(content);
  const expectedHash = hashRecord(content);
  if (
    !Number.isFinite(Date.parse(content.admittedAt)) ||
    !Number.isFinite(Date.parse(content.expiresAt)) ||
    Date.parse(content.expiresAt) <=
      Date.parse(content.admittedAt) ||
    admissionHash !== expectedHash ||
    id !==
      `local-candidate-evaluation-admission-${expectedHash}`
  ) {
    throw new Error(
      'Local candidate evaluation admission failed: integrity.',
    );
  }
  return admission;
}
