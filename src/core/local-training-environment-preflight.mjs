import { createHash } from 'node:crypto';

import { assertFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import { assertApprovedLocalTrainingPermission } from './local-training-permission.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_ENVIRONMENT_PREFLIGHT_SCHEMA_VERSION =
  'personal-ai-agent-local-training-environment-preflight/v1';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function isTimestamp(value) {
  return Number.isFinite(Date.parse(normalizeText(value)));
}

function requireMetadata(value, fieldName) {
  const normalized = normalizeText(value);
  if (
    !normalized ||
    normalized.length > 200 ||
    /[\r\n\0]/.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(`Local training preflight ${fieldName} must be content-free metadata.`);
  }
  return normalized;
}

function normalizePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(`Local training preflight ${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function normalizeOptionalHash(value, fieldName) {
  const normalized = normalizeText(value) || null;
  if (normalized && !isSha256(normalized)) {
    throw new Error(`Local training preflight ${fieldName} must be SHA-256.`);
  }
  return normalized;
}

function normalizeOptionalMetadata(value, fieldName) {
  return normalizeText(value)
    ? requireMetadata(value, fieldName)
    : null;
}

function normalizeOptionalTimestamp(value, fieldName) {
  const normalized = normalizeText(value) || null;
  if (normalized && !isTimestamp(normalized)) {
    throw new Error(
      `Local training preflight ${fieldName} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function summarizeReadinessPackage(readinessPackage) {
  assertFineTuningReadinessPackage(readinessPackage);
  return normalizeReadiness({
    datasetHash: readinessPackage.dataset.datasetHash,
    readinessHash: readinessPackage.readinessHash,
    trainLineCount: readinessPackage.exports.train.lineCount,
    trainSha256: readinessPackage.exportDigests.train,
    validationLineCount: readinessPackage.exports.validation.lineCount,
    validationSha256: readinessPackage.exportDigests.validation,
  });
}

function normalizeReadiness(readiness = {}) {
  if (
    !isSha256(readiness.datasetHash) ||
    !isSha256(readiness.readinessHash) ||
    !isSha256(readiness.trainSha256) ||
    !isSha256(readiness.validationSha256)
  ) {
    throw new Error('Local training preflight requires the exact F1 readiness hashes.');
  }
  return {
    datasetHash: readiness.datasetHash,
    readinessHash: readiness.readinessHash,
    trainLineCount: normalizePositiveInteger(
      readiness.trainLineCount,
      'trainLineCount',
    ),
    trainSha256: readiness.trainSha256,
    validationLineCount: normalizePositiveInteger(
      readiness.validationLineCount,
      'validationLineCount',
    ),
    validationSha256: readiness.validationSha256,
  };
}

function normalizeBaseModel(baseModel = {}) {
  const installed = baseModel.installed === true;
  const artifactSizeBytes = installed
    ? normalizePositiveInteger(baseModel.artifactSizeBytes, 'artifactSizeBytes')
    : null;
  const model = {
    artifactDigest: normalizeOptionalHash(
      baseModel.artifactDigest,
      'artifactDigest',
    ),
    artifactFormat: normalizeOptionalMetadata(
      baseModel.artifactFormat,
      'artifactFormat',
    ),
    artifactHashVerified: baseModel.artifactHashVerified === true,
    artifactSizeBytes,
    id: requireMetadata(baseModel.id, 'baseModel.id'),
    installed,
    license: {
      hashVerified: baseModel.license?.hashVerified === true,
      textHash: normalizeOptionalHash(
        baseModel.license?.textHash,
        'license.textHash',
      ),
      title: normalizeOptionalMetadata(
        baseModel.license?.title,
        'license.title',
      ),
    },
    manifestHash: normalizeOptionalHash(
      baseModel.manifestHash,
      'manifestHash',
    ),
    source: requireMetadata(baseModel.source, 'baseModel.source'),
    trainableSourceVerified: baseModel.trainableSourceVerified === true,
  };
  if (
    installed &&
    (
      !model.artifactDigest ||
      !model.artifactFormat ||
      !model.manifestHash
    )
  ) {
    throw new Error(
      'Installed local training base model requires artifact and manifest metadata.',
    );
  }
  return model;
}

function normalizeTrainer(trainer = {}) {
  const candidates = Array.isArray(trainer.candidates)
    ? trainer.candidates.map((candidate) => ({
        available: candidate?.available === true,
        command: requireMetadata(candidate?.command, 'trainer.command'),
        id: requireMetadata(candidate?.id, 'trainer.id'),
      }))
    : [];
  if (
    candidates.length === 0 ||
    new Set(candidates.map((candidate) => candidate.id)).size !==
      candidates.length
  ) {
    throw new Error(
      'Local training preflight requires unique trainer candidates.',
    );
  }
  const selectedCandidateId = normalizeOptionalMetadata(
    trainer.selectedCandidateId,
    'trainer.selectedCandidateId',
  );
  if (
    selectedCandidateId &&
    !candidates.some(
      (candidate) =>
        candidate.id === selectedCandidateId &&
        candidate.available,
    )
  ) {
    throw new Error(
      'Selected local training trainer must be an available candidate.',
    );
  }
  return {
    candidates: candidates.sort((left, right) =>
      left.id.localeCompare(right.id)),
    selectedCandidateId,
  };
}

function normalizeSystem(system = {}) {
  return {
    architecture: requireMetadata(system.architecture, 'system.architecture'),
    availableDiskBytes: normalizePositiveInteger(
      system.availableDiskBytes,
      'availableDiskBytes',
    ),
    platform: requireMetadata(system.platform, 'system.platform'),
    platformVersion: requireMetadata(
      system.platformVersion,
      'system.platformVersion',
    ),
    totalMemoryBytes: normalizePositiveInteger(
      system.totalMemoryBytes,
      'totalMemoryBytes',
    ),
  };
}

function normalizePermission(permission = {}) {
  const approved = permission.approved === true;
  const normalized = {
    approved,
    egressEvidenceSha256: normalizeOptionalHash(
      permission.egressEvidenceSha256,
      'permission.egressEvidenceSha256',
    ),
    expiresAt: normalizeOptionalTimestamp(
      permission.expiresAt,
      'permission.expiresAt',
    ),
    id: normalizeOptionalMetadata(permission.id, 'permission.id'),
    licenseEvidenceSha256: normalizeOptionalHash(
      permission.licenseEvidenceSha256,
      'permission.licenseEvidenceSha256',
    ),
    permissionHash: normalizeOptionalHash(
      permission.permissionHash,
      'permission.permissionHash',
    ),
    resourceEvidenceSha256: normalizeOptionalHash(
      permission.resourceEvidenceSha256,
      'permission.resourceEvidenceSha256',
    ),
    rollbackOwner: normalizeOptionalMetadata(
      permission.rollbackOwner,
      'permission.rollbackOwner',
    ),
    trainerId: normalizeOptionalMetadata(
      permission.trainerId,
      'permission.trainerId',
    ),
  };
  if (
    approved &&
    (
      !normalized.id ||
      !normalized.permissionHash ||
      !isTimestamp(normalized.expiresAt) ||
      !normalized.licenseEvidenceSha256 ||
      !normalized.egressEvidenceSha256 ||
      !normalized.resourceEvidenceSha256 ||
      !normalized.rollbackOwner ||
      !normalized.trainerId
    )
  ) {
    throw new Error(
      'Approved local training preflight permission requires complete content-free evidence.',
    );
  }
  return normalized;
}

function summarizePermission({
  baseModelId,
  observedAt,
  permission,
  readinessPackage,
  trainerId,
}) {
  if (!permission) {
    return normalizePermission();
  }
  if (!trainerId) {
    throw new Error(
      'Approved local training permission requires an available selected trainer.',
    );
  }
  assertApprovedLocalTrainingPermission({
    baseModelId,
    now: observedAt,
    permission,
    readinessPackage,
    rollbackOwner: permission.rollbackOwner,
    trainerId,
  });
  return normalizePermission({
    approved: true,
    egressEvidenceSha256: permission.evidence.egress.evidenceSha256,
    expiresAt: permission.expiresAt,
    id: permission.id,
    licenseEvidenceSha256: permission.evidence.license.evidenceSha256,
    permissionHash: permission.permissionHash,
    resourceEvidenceSha256: permission.evidence.resource.evidenceSha256,
    rollbackOwner: permission.rollbackOwner,
    trainerId: permission.trainerId,
  });
}

function normalizeIndependentReview(review = {}, expectedEvidenceSha256) {
  const approved = review.approved === true;
  const normalized = {
    approved,
    evidenceSha256: normalizeOptionalHash(
      review.evidenceSha256,
      'review.evidenceSha256',
    ),
    reviewedAt: normalizeOptionalTimestamp(
      review.reviewedAt,
      'review.reviewedAt',
    ),
    reviewedBy: normalizeOptionalMetadata(
      review.reviewedBy,
      'review.reviewedBy',
    ),
  };
  if (
    approved &&
    (
      !expectedEvidenceSha256 ||
      normalized.evidenceSha256 !== expectedEvidenceSha256 ||
      !isTimestamp(normalized.reviewedAt) ||
      !normalized.reviewedBy
    )
  ) {
    throw new Error(
      'Approved local training review must match current permission evidence.',
    );
  }
  return normalized;
}

function normalizeGovernance(governance = {}) {
  const permission = normalizePermission(governance.permission);
  return {
    licenseReview: normalizeIndependentReview(
      governance.licenseReview,
      permission.licenseEvidenceSha256,
    ),
    networkIsolationReview: normalizeIndependentReview(
      governance.networkIsolationReview,
      permission.egressEvidenceSha256,
    ),
    permission,
    resourceEnforcementReview: normalizeIndependentReview(
      governance.resourceEnforcementReview,
      permission.resourceEvidenceSha256,
    ),
  };
}

function check(id, passed) {
  return {
    id,
    passed: Boolean(passed),
    status: passed ? 'passed' : 'failed',
  };
}

function buildPreflightContent({
  baseModel,
  governance,
  observedAt,
  readiness,
  system,
  trainer,
}) {
  const normalizedObservedAt = normalizeText(observedAt);
  if (!isTimestamp(normalizedObservedAt)) {
    throw new Error(
      'Local training preflight observedAt must be a valid timestamp.',
    );
  }
  const normalizedReadiness = normalizeReadiness(readiness);
  const normalizedBaseModel = normalizeBaseModel(baseModel);
  const normalizedTrainer = normalizeTrainer(trainer);
  const normalizedSystem = normalizeSystem(system);
  const normalizedGovernance = normalizeGovernance(governance);
  const selectedTrainer = normalizedTrainer.candidates.find(
    (candidate) =>
      candidate.id === normalizedTrainer.selectedCandidateId &&
      candidate.available,
  );
  const checks = [
    check('f1-readiness-bound', true),
    check(
      'base-model-artifact-integrity',
      normalizedBaseModel.installed &&
        normalizedBaseModel.artifactHashVerified &&
        isSha256(normalizedBaseModel.artifactDigest) &&
        isSha256(normalizedBaseModel.manifestHash),
    ),
    check(
      'trainable-source-model-verified',
      normalizedBaseModel.trainableSourceVerified,
    ),
    check('trainer-available', Boolean(selectedTrainer)),
    check(
      'license-evidence-bound',
      normalizedBaseModel.license.hashVerified &&
        isSha256(normalizedBaseModel.license.textHash) &&
        Boolean(normalizedBaseModel.license.title),
    ),
    check(
      'resource-capacity-observed',
      normalizedSystem.totalMemoryBytes > 0 &&
        normalizedSystem.availableDiskBytes > 0,
    ),
    check(
      'license-review-approved',
      normalizedGovernance.licenseReview.approved,
    ),
    check(
      'network-isolation-approved',
      normalizedGovernance.networkIsolationReview.approved,
    ),
    check(
      'resource-enforcement-approved',
      normalizedGovernance.resourceEnforcementReview.approved,
    ),
    check(
      'product-permission-approved',
      normalizedGovernance.permission.approved,
    ),
    check(
      'rollback-owner-assigned',
      Boolean(normalizedGovernance.permission.rollbackOwner),
    ),
  ];
  const blockerCheckIds = checks
    .filter((item) => !item.passed)
    .map((item) => item.id);
  const readyForExplicitTrainingRequest = blockerCheckIds.length === 0;

  return {
    actualModelTrainingExecuted: false,
    baseModel: normalizedBaseModel,
    blockerCheckIds,
    checks,
    costFree: true,
    decision: readyForExplicitTrainingRequest
      ? 'request-explicit-local-training-execution'
      : 'stop-before-local-training',
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    governance: normalizedGovernance,
    machineIdentityStored: false,
    observedAt: normalizedObservedAt,
    productionReadyClaim: false,
    readiness: normalizedReadiness,
    readyForExplicitTrainingRequest,
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_ENVIRONMENT_PREFLIGHT_SCHEMA_VERSION,
    status: readyForExplicitTrainingRequest
      ? 'ready-for-explicit-local-training-request'
      : 'blocked-before-local-training',
    system: normalizedSystem,
    trainer: normalizedTrainer,
    trainingAuthorized: false,
  };
}

export function buildLocalTrainingEnvironmentPreflight({
  governance = {},
  observedAt,
  permission = null,
  readinessPackage,
  snapshot,
} = {}) {
  const baseModel = normalizeBaseModel(snapshot?.baseModel);
  const trainer = normalizeTrainer(snapshot?.trainer);
  const permissionSummary = summarizePermission({
    baseModelId: baseModel.id,
    observedAt,
    permission,
    readinessPackage,
    trainerId: trainer.selectedCandidateId,
  });
  const content = buildPreflightContent({
    baseModel,
    governance: {
      ...governance,
      permission: permissionSummary,
    },
    observedAt,
    readiness: summarizeReadinessPackage(readinessPackage),
    system: snapshot?.system,
    trainer,
  });
  const preflightHash = hashRecord(content);
  return {
    ...content,
    id: `local-training-environment-preflight-${preflightHash}`,
    preflightHash,
  };
}

export function assertLocalTrainingEnvironmentPreflight(preflight) {
  const {
    id,
    preflightHash,
    ...content
  } = preflight || {};
  const expected = buildPreflightContent({
    baseModel: content.baseModel,
    governance: content.governance,
    observedAt: content.observedAt,
    readiness: content.readiness,
    system: content.system,
    trainer: content.trainer,
  });
  const expectedHash = hashRecord(expected);
  if (
    preflightHash !== expectedHash ||
    id !== `local-training-environment-preflight-${expectedHash}` ||
    JSON.stringify(content) !== JSON.stringify(expected) ||
    content.actualModelTrainingExecuted !== false ||
    content.externalProviderCalls !== 'none' ||
    content.externalSubmissionAuthorized !== false ||
    content.productionReadyClaim !== false ||
    content.rolloutAuthorized !== false ||
    content.trainingAuthorized !== false
  ) {
    throw new Error('Local training environment preflight integrity failed.');
  }
  return preflight;
}
