import { createHash } from 'node:crypto';

import {
  assertApprovedLocalTrainingAcquisition,
} from './local-training-acquisition-approval.mjs';
import {
  assertLocalTrainingAcquisitionArtifactVerification,
} from './local-training-acquisition-artifact-verification.mjs';
import {
  assertLocalTrainingAcquisitionRun,
} from './local-training-acquisition-runtime.mjs';
import {
  assertApprovedLocalTrainingPermission,
} from './local-training-permission.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_PROVENANCE_REVIEW_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-provenance-review/v1';
export const LOCAL_TRAINING_EGRESS_REVIEW_SCHEMA_VERSION =
  'personal-ai-agent-local-training-egress-closure-review/v1';
export const LOCAL_TRAINING_OFFLINE_RESOURCE_CANARY_SCHEMA_VERSION =
  'personal-ai-agent-local-training-offline-resource-canary/v1';
export const LOCAL_TRAINING_POST_ACQUISITION_READINESS_SCHEMA_VERSION =
  'personal-ai-agent-local-training-post-acquisition-readiness/v1';

const MODES = new Set([
  'fixture-simulated',
  'recorded-local-acquisition',
]);
const CLOSED_NETWORK_POLICY = 'offline-after-acquisition';

function normalizeText(value) {
  return String(value || '').trim();
}

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
}

function hasExactKeys(value, expectedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...expectedKeys].sort()),
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
      `Local training post-acquisition ${fieldName} must be content-free metadata.`,
    );
  }
  return normalized;
}

function requireSha256(value, fieldName) {
  const normalized = normalizeText(value);
  if (!isSha256(normalized)) {
    throw new Error(
      `Local training post-acquisition ${fieldName} must be SHA-256.`,
    );
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local training post-acquisition ${fieldName} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function requirePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(
      `Local training post-acquisition ${fieldName} must be a positive integer.`,
    );
  }
  return normalized;
}

function requireMode(value) {
  const normalized = normalizeText(value);
  if (!MODES.has(normalized)) {
    throw new Error(
      'Unsupported local training post-acquisition readiness mode.',
    );
  }
  return normalized;
}

function verificationReference(verification) {
  assertLocalTrainingAcquisitionArtifactVerification(verification);
  return {
    id: verification.id,
    verificationHash: verification.verificationHash,
  };
}

function runReference(run) {
  assertLocalTrainingAcquisitionRun(run);
  return {
    id: run.id,
    runHash: run.runHash,
  };
}

function sealRecord(record, prefix, hashField) {
  const recordHash = hashRecord(record);
  return {
    ...record,
    id: `${prefix}-${recordHash}`,
    [hashField]: recordHash,
  };
}

export function buildLocalTrainingAcquisitionProvenanceReview({
  evidenceSha256,
  mode,
  owner,
  reviewedAt,
  verification,
} = {}) {
  const normalizedMode = requireMode(mode);
  return sealRecord({
    actualReviewPerformed:
      normalizedMode === 'recorded-local-acquisition',
    artifactVerification: verificationReference(verification),
    evidenceSha256: requireSha256(
      evidenceSha256,
      'provenance evidenceSha256',
    ),
    mode: normalizedMode,
    owner: requireMetadata(owner, 'provenance owner'),
    reviewedAt: requireTimestamp(reviewedAt, 'provenance reviewedAt'),
    schemaVersion:
      LOCAL_TRAINING_PROVENANCE_REVIEW_SCHEMA_VERSION,
    status:
      normalizedMode === 'fixture-simulated'
        ? 'fixture-contract-validated'
        : 'passed',
  }, 'local-training-acquisition-provenance-review', 'reviewHash');
}

export function buildLocalTrainingEgressClosureReview({
  evidenceSha256,
  mode,
  owner,
  reviewedAt,
  run,
  verification,
} = {}) {
  const normalizedMode = requireMode(mode);
  return sealRecord({
    actualReviewPerformed:
      normalizedMode === 'recorded-local-acquisition',
    artifactVerification: verificationReference(verification),
    evidenceSha256: requireSha256(
      evidenceSha256,
      'egress evidenceSha256',
    ),
    mode: normalizedMode,
    networkPolicy: CLOSED_NETWORK_POLICY,
    owner: requireMetadata(owner, 'egress owner'),
    reviewedAt: requireTimestamp(reviewedAt, 'egress reviewedAt'),
    run: runReference(run),
    schemaVersion:
      LOCAL_TRAINING_EGRESS_REVIEW_SCHEMA_VERSION,
    status:
      normalizedMode === 'fixture-simulated'
        ? 'fixture-contract-validated'
        : 'passed',
  }, 'local-training-egress-closure-review', 'reviewHash');
}

export function buildLocalTrainingOfflineResourceCanary({
  evidenceSha256,
  mode,
  observedDiskBytes,
  observedRuntimeMs,
  observedAt,
  owner,
  verification,
} = {}) {
  const normalizedMode = requireMode(mode);
  return sealRecord({
    actualCanaryExecuted:
      normalizedMode === 'recorded-local-acquisition',
    artifactVerification: verificationReference(verification),
    evidenceSha256: requireSha256(
      evidenceSha256,
      'resource canary evidenceSha256',
    ),
    externalProviderCalls: 'none',
    mode: normalizedMode,
    networkPolicy: CLOSED_NETWORK_POLICY,
    observedAt: requireTimestamp(
      observedAt,
      'resource canary observedAt',
    ),
    observedDiskBytes: requirePositiveInteger(
      observedDiskBytes,
      'resource canary observedDiskBytes',
    ),
    observedRuntimeMs: requirePositiveInteger(
      observedRuntimeMs,
      'resource canary observedRuntimeMs',
    ),
    owner: requireMetadata(owner, 'resource canary owner'),
    schemaVersion:
      LOCAL_TRAINING_OFFLINE_RESOURCE_CANARY_SCHEMA_VERSION,
    status:
      normalizedMode === 'fixture-simulated'
        ? 'fixture-contract-validated'
        : 'passed',
  }, 'local-training-offline-resource-canary', 'canaryHash');
}

function assertSealedRecord({
  expectedKeys,
  hashField,
  idPrefix,
  record,
  schemaVersion,
}) {
  const {
    id,
    [hashField]: recordHash,
    ...content
  } = record || {};
  const expectedHash = hashRecord(content);
  if (
    !hasExactKeys(record, [...expectedKeys, hashField, 'id']) ||
    content.schemaVersion !== schemaVersion ||
    recordHash !== expectedHash ||
    id !== `${idPrefix}-${expectedHash}`
  ) {
    throw new Error(
      'Local training post-acquisition evidence failed: integrity.',
    );
  }
  return content;
}

function assertCommonReview({
  approval,
  expectedOwner,
  mode,
  record,
  verification,
}) {
  if (
    record.mode !== mode ||
    record.owner !== expectedOwner ||
    record.artifactVerification.id !== verification.id ||
    record.artifactVerification.verificationHash !==
      verification.verificationHash ||
    !isSha256(record.evidenceSha256) ||
    !Number.isFinite(Date.parse(record.reviewedAt)) ||
    Date.parse(record.reviewedAt) <
      Date.parse(verification.observedAt) ||
    Date.parse(record.reviewedAt) >= Date.parse(approval.expiresAt)
  ) {
    throw new Error(
      'Local training post-acquisition evidence failed: binding.',
    );
  }
  const recorded = mode === 'recorded-local-acquisition';
  if (
    record.actualReviewPerformed !== recorded ||
    record.status !==
      (recorded ? 'passed' : 'fixture-contract-validated')
  ) {
    throw new Error(
      'Local training post-acquisition evidence failed: claim-boundary.',
    );
  }
}

export function evaluateLocalTrainingPostAcquisitionReadiness({
  approval,
  egressReview,
  mode,
  now,
  permission,
  permissionRevocation,
  provenanceReview,
  readinessPackage,
  resourceCanary,
  run,
  toolchainDecision,
  verification,
} = {}) {
  const normalizedMode = requireMode(mode);
  const normalizedNow = requireTimestamp(now, 'now');
  assertApprovedLocalTrainingAcquisition({
    approval,
    decision: toolchainDecision,
    now: normalizedNow,
  });
  assertLocalTrainingAcquisitionArtifactVerification(verification);
  assertLocalTrainingAcquisitionRun(run);

  if (
    verification.mode !== normalizedMode ||
    verification.approval.id !== approval.id ||
    verification.approval.approvalHash !== approval.approvalHash ||
    verification.run.id !== run.id ||
    verification.run.runHash !== run.runHash ||
    verification.request.id !== approval.request.id ||
    verification.request.requestHash !== approval.request.requestHash ||
    Date.parse(verification.observedAt) > Date.parse(normalizedNow)
  ) {
    throw new Error(
      'Local training post-acquisition readiness failed: acquisition-binding.',
    );
  }

  const provenance = assertSealedRecord({
    expectedKeys: [
      'actualReviewPerformed',
      'artifactVerification',
      'evidenceSha256',
      'mode',
      'owner',
      'reviewedAt',
      'schemaVersion',
      'status',
    ],
    hashField: 'reviewHash',
    idPrefix: 'local-training-acquisition-provenance-review',
    record: provenanceReview,
    schemaVersion:
      LOCAL_TRAINING_PROVENANCE_REVIEW_SCHEMA_VERSION,
  });
  assertCommonReview({
    approval,
    expectedOwner: approval.owners.licenseOwner,
    mode: normalizedMode,
    record: provenance,
    verification,
  });

  const egress = assertSealedRecord({
    expectedKeys: [
      'actualReviewPerformed',
      'artifactVerification',
      'evidenceSha256',
      'mode',
      'networkPolicy',
      'owner',
      'reviewedAt',
      'run',
      'schemaVersion',
      'status',
    ],
    hashField: 'reviewHash',
    idPrefix: 'local-training-egress-closure-review',
    record: egressReview,
    schemaVersion:
      LOCAL_TRAINING_EGRESS_REVIEW_SCHEMA_VERSION,
  });
  assertCommonReview({
    approval,
    expectedOwner: approval.owners.egressOwner,
    mode: normalizedMode,
    record: egress,
    verification,
  });
  if (
    egress.networkPolicy !== CLOSED_NETWORK_POLICY ||
    egress.run.id !== run.id ||
    egress.run.runHash !== run.runHash ||
    run.adapterReport.egressClosed !== true
  ) {
    throw new Error(
      'Local training post-acquisition readiness failed: egress-closure.',
    );
  }

  const canary = assertSealedRecord({
    expectedKeys: [
      'actualCanaryExecuted',
      'artifactVerification',
      'evidenceSha256',
      'externalProviderCalls',
      'mode',
      'networkPolicy',
      'observedAt',
      'observedDiskBytes',
      'observedRuntimeMs',
      'owner',
      'schemaVersion',
      'status',
    ],
    hashField: 'canaryHash',
    idPrefix: 'local-training-offline-resource-canary',
    record: resourceCanary,
    schemaVersion:
      LOCAL_TRAINING_OFFLINE_RESOURCE_CANARY_SCHEMA_VERSION,
  });
  const recorded =
    normalizedMode === 'recorded-local-acquisition';
  const expectedArtifactBytes =
    verification.artifacts.sourceModel.totalBytes +
    verification.artifacts.trainerPackage.totalBytes;
  if (
    canary.mode !== normalizedMode ||
    canary.owner !== approval.owners.resourceOwner ||
    canary.artifactVerification.id !== verification.id ||
    canary.artifactVerification.verificationHash !==
      verification.verificationHash ||
    !isSha256(canary.evidenceSha256) ||
    canary.externalProviderCalls !== 'none' ||
    canary.networkPolicy !== CLOSED_NETWORK_POLICY ||
    canary.actualCanaryExecuted !== recorded ||
    canary.status !==
      (recorded ? 'passed' : 'fixture-contract-validated') ||
    canary.observedDiskBytes !== expectedArtifactBytes ||
    canary.observedDiskBytes >
      approval.resourceEnvelope.maxDiskBytes ||
    canary.observedRuntimeMs >
      approval.resourceEnvelope.maxRuntimeMs ||
    Date.parse(canary.observedAt) <
      Date.parse(verification.observedAt) ||
    Date.parse(canary.observedAt) >=
      Date.parse(approval.expiresAt)
  ) {
    throw new Error(
      'Local training post-acquisition readiness failed: resource-canary.',
    );
  }

  if (permissionRevocation !== null) {
    throw new Error(
      'Local training post-acquisition readiness failed: product-permission.',
    );
  }
  assertApprovedLocalTrainingPermission({
    baseModelId: approval.toolchainDecision.sourceModel.id,
    now: normalizedNow,
    permission,
    readinessPackage,
    rollbackOwner: approval.owners.rollbackOwner,
    trainerId: approval.toolchainDecision.trainer.id,
  });
  const reviewsCompletedAt = Math.max(
    Date.parse(provenance.reviewedAt),
    Date.parse(egress.reviewedAt),
    Date.parse(canary.observedAt),
  );
  if (
    Date.parse(permission.resolvedAt) < reviewsCompletedAt ||
    permission.evidence.license.owner !==
      approval.owners.licenseOwner ||
    permission.evidence.license.evidenceSha256 !==
      provenance.evidenceSha256 ||
    permission.evidence.egress.owner !==
      approval.owners.egressOwner ||
    permission.evidence.egress.evidenceSha256 !==
      egress.evidenceSha256 ||
    permission.evidence.resource.owner !==
      approval.owners.resourceOwner ||
    permission.evidence.resource.evidenceSha256 !==
      canary.evidenceSha256 ||
    permission.evidence.resource.limits.maxDiskBytes !==
      approval.resourceEnvelope.maxDiskBytes ||
    permission.evidence.resource.limits.maxRuntimeMs !==
      approval.resourceEnvelope.maxRuntimeMs
  ) {
    throw new Error(
      'Local training post-acquisition readiness failed: product-permission.',
    );
  }

  const remainingGates = recorded
    ? []
    : [
        'acquisition-provenance-reviewed',
        'egress-closure-independently-reviewed',
        'offline-resource-canary-passed',
        'post-install-product-permission-approved',
      ];
  const readiness = {
    actualAcquisitionProvenanceReviewed: recorded,
    actualArtifactSetsObserved: recorded,
    actualEgressClosureReviewed: recorded,
    actualOfflineResourceCanaryExecuted: recorded,
    actualPostInstallProductPermissionApproved: recorded,
    actualModelTrainingExecuted: false,
    artifactVerification: verificationReference(verification),
    externalProviderCalls: recorded
      ? 'not-observed-by-readiness'
      : 'none',
    externalSubmissionAuthorized: false,
    mode: normalizedMode,
    observedAt: normalizedNow,
    productionReadyClaim: false,
    readyForExplicitTrainingRequest: recorded,
    remainingGates,
    rolloutAuthorized: false,
    schemaVersion:
      LOCAL_TRAINING_POST_ACQUISITION_READINESS_SCHEMA_VERSION,
    status: recorded
      ? 'ready-for-explicit-training-request'
      : 'fixture-readiness-validated-no-acquisition',
    trainingAuthorized: false,
  };
  const readinessHash = hashRecord(readiness);
  return {
    ...readiness,
    id:
      `local-training-post-acquisition-readiness-${readinessHash}`,
    readinessHash,
  };
}
