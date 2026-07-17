import { createHash } from 'node:crypto';

import { assertFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_PERMISSION_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-local-training-permission-request/v1';
export const LOCAL_TRAINING_PERMISSION_SCHEMA_VERSION =
  'personal-ai-agent-local-training-permission/v1';
export const LOCAL_TRAINING_PERMISSION_REVOCATION_SCHEMA_VERSION =
  'personal-ai-agent-local-training-permission-revocation/v1';

const DECISIONS = new Set(['approve', 'reject']);

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

function requireContentFreeText(value, fieldName) {
  const normalized = normalizeText(value);
  if (
    !normalized ||
    normalized.length > 500 ||
    /[\r\n\0]/.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(`Local training permission ${fieldName} must be content-free metadata.`);
  }
  return normalized;
}

function requireSha256(value, fieldName) {
  const normalized = normalizeText(value);
  if (!isSha256(normalized)) {
    throw new Error(`Local training permission ${fieldName} must be a sha256 digest.`);
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(`Local training permission ${fieldName} must be a valid timestamp.`);
  }
  return normalized;
}

function requirePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(`Local training permission ${fieldName} must be a positive integer.`);
  }
  return normalized;
}

function buildEvidence(evidence = {}) {
  return {
    egress: {
      control: 'os-level-egress-isolation',
      evidenceSha256: requireSha256(
        evidence.egress?.evidenceSha256,
        'egress evidenceSha256',
      ),
      owner: requireContentFreeText(evidence.egress?.owner, 'egress owner'),
      review: 'required',
    },
    license: {
      evidenceSha256: requireSha256(
        evidence.license?.evidenceSha256,
        'license evidenceSha256',
      ),
      owner: requireContentFreeText(evidence.license?.owner, 'license owner'),
      review: 'required',
    },
    resource: {
      enforcement: 'caller-owned',
      evidenceSha256: requireSha256(
        evidence.resource?.evidenceSha256,
        'resource evidenceSha256',
      ),
      limits: {
        maxCpuThreads: requirePositiveInteger(
          evidence.resource?.limits?.maxCpuThreads,
          'maxCpuThreads',
        ),
        maxDiskBytes: requirePositiveInteger(
          evidence.resource?.limits?.maxDiskBytes,
          'maxDiskBytes',
        ),
        maxMemoryBytes: requirePositiveInteger(
          evidence.resource?.limits?.maxMemoryBytes,
          'maxMemoryBytes',
        ),
        maxRuntimeMs: requirePositiveInteger(
          evidence.resource?.limits?.maxRuntimeMs,
          'maxRuntimeMs',
        ),
      },
      owner: requireContentFreeText(evidence.resource?.owner, 'resource owner'),
      review: 'required',
    },
  };
}

function assertRequestIntegrity(request) {
  const { id, requestHash, ...content } = request || {};
  const expectedHash = hashRecord(content);
  if (
    request?.schemaVersion !== LOCAL_TRAINING_PERMISSION_REQUEST_SCHEMA_VERSION ||
    requestHash !== expectedHash ||
    id !== `local-training-permission-request-${expectedHash}`
  ) {
    throw new Error('Local training permission request failed: integrity.');
  }

  buildEvidence(request.evidence);
  requireContentFreeText(request.approvalOwner, 'approvalOwner');
  requireContentFreeText(request.baseModelId, 'baseModelId');
  requireContentFreeText(request.rollbackOwner, 'rollbackOwner');
  requireContentFreeText(request.trainerId, 'trainerId');
  const requestedAt = requireTimestamp(request.requestedAt, 'requestedAt');
  const expiresAt = requireTimestamp(request.expiresAt, 'expiresAt');
  if (Date.parse(expiresAt) <= Date.parse(requestedAt)) {
    throw new Error('Local training permission request expiration must follow requestedAt.');
  }
  if (
    !isSha256(request.readinessHash) ||
    !isSha256(request.datasetHash) ||
    !isSha256(request.exportDigests?.train) ||
    !isSha256(request.exportDigests?.validation) ||
    request.executionKind !== 'local-model-training' ||
    request.status !== 'pending-review' ||
    request.localExecutionAuthorized !== false ||
    request.externalSubmissionAuthorized !== false ||
    request.rolloutAuthorized !== false ||
    request.productionReadyClaim !== false
  ) {
    throw new Error('Local training permission request failed: authority-boundary.');
  }
}

export function buildLocalTrainingPermissionRequest({
  approvalOwner,
  baseModelId,
  evidence,
  expiresAt,
  readinessPackage,
  requestedAt,
  rollbackOwner,
  trainerId,
} = {}) {
  assertFineTuningReadinessPackage(readinessPackage);
  const normalizedRequestedAt = requireTimestamp(requestedAt, 'requestedAt');
  const normalizedExpiresAt = requireTimestamp(expiresAt, 'expiresAt');
  if (Date.parse(normalizedExpiresAt) <= Date.parse(normalizedRequestedAt)) {
    throw new Error('Local training permission request expiration must follow requestedAt.');
  }

  const request = {
    approvalOwner: requireContentFreeText(approvalOwner, 'approvalOwner'),
    baseModelId: requireContentFreeText(baseModelId, 'baseModelId'),
    datasetHash: readinessPackage.dataset.datasetHash,
    evidence: buildEvidence(evidence),
    executionKind: 'local-model-training',
    expiresAt: normalizedExpiresAt,
    exportDigests: {
      train: readinessPackage.exportDigests.train,
      validation: readinessPackage.exportDigests.validation,
    },
    externalSubmissionAuthorized: false,
    localExecutionAuthorized: false,
    productionReadyClaim: false,
    readinessHash: readinessPackage.readinessHash,
    requestedAt: normalizedRequestedAt,
    rollbackOwner: requireContentFreeText(rollbackOwner, 'rollbackOwner'),
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_PERMISSION_REQUEST_SCHEMA_VERSION,
    status: 'pending-review',
    trainerId: requireContentFreeText(trainerId, 'trainerId'),
  };
  const requestHash = hashRecord(request);
  return {
    ...request,
    id: `local-training-permission-request-${requestHash}`,
    requestHash,
  };
}

export function resolveLocalTrainingPermissionRequest({
  decision,
  reason,
  request,
  resolvedAt,
  resolvedBy,
} = {}) {
  assertRequestIntegrity(request);
  const normalizedDecision = normalizeText(decision);
  if (!DECISIONS.has(normalizedDecision)) {
    throw new Error(`Unsupported local training permission decision: ${normalizedDecision}.`);
  }
  const normalizedResolvedAt = requireTimestamp(resolvedAt, 'resolvedAt');
  const normalizedResolvedBy = requireContentFreeText(resolvedBy, 'resolvedBy');
  const normalizedReason = requireContentFreeText(reason, 'reason');
  if (normalizedResolvedBy !== request.approvalOwner) {
    throw new Error('Local training permission resolution failed: approval-owner.');
  }
  if (Date.parse(normalizedResolvedAt) < Date.parse(request.requestedAt)) {
    throw new Error('Local training permission resolution must not precede the request.');
  }
  if (
    normalizedDecision === 'approve' &&
    Date.parse(normalizedResolvedAt) >= Date.parse(request.expiresAt)
  ) {
    throw new Error('Local training permission request expired before approval.');
  }

  const permission = {
    approvalOwner: request.approvalOwner,
    baseModelId: request.baseModelId,
    datasetHash: request.datasetHash,
    decision: normalizedDecision,
    evidence: request.evidence,
    executionKind: request.executionKind,
    expiresAt: request.expiresAt,
    exportDigests: request.exportDigests,
    externalSubmissionAuthorized: false,
    localExecutionAuthorized: normalizedDecision === 'approve',
    productionReadyClaim: false,
    readinessHash: request.readinessHash,
    reasonHash: hashValue(normalizedReason),
    request: {
      id: request.id,
      requestHash: request.requestHash,
    },
    resolvedAt: normalizedResolvedAt,
    resolvedBy: normalizedResolvedBy,
    rollbackOwner: request.rollbackOwner,
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_PERMISSION_SCHEMA_VERSION,
    status: normalizedDecision === 'approve' ? 'approved' : 'rejected',
    trainerId: request.trainerId,
  };
  const permissionHash = hashRecord(permission);
  return {
    ...permission,
    id: `local-training-permission-${permissionHash}`,
    permissionHash,
  };
}

export function assertApprovedLocalTrainingPermission({
  baseModelId,
  now,
  permission,
  readinessPackage,
  rollbackOwner,
  trainerId,
} = {}) {
  assertFineTuningReadinessPackage(readinessPackage);
  const { id, permissionHash, ...content } = permission || {};
  const expectedHash = hashRecord(content);
  const nowMs = Date.parse(normalizeText(now));
  const resolvedAtMs = Date.parse(normalizeText(permission?.resolvedAt));
  const expiresAtMs = Date.parse(normalizeText(permission?.expiresAt));
  const errors = [];

  if (
    permission?.schemaVersion !== LOCAL_TRAINING_PERMISSION_SCHEMA_VERSION ||
    permissionHash !== expectedHash ||
    id !== `local-training-permission-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  try {
    buildEvidence(permission?.evidence);
    requireContentFreeText(permission?.approvalOwner, 'approvalOwner');
    requireContentFreeText(permission?.resolvedBy, 'resolvedBy');
  } catch {
    errors.push('evidence');
  }
  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(resolvedAtMs) ||
    !Number.isFinite(expiresAtMs) ||
    resolvedAtMs > nowMs ||
    expiresAtMs <= nowMs
  ) {
    errors.push('time-window');
  }
  if (
    permission?.readinessHash !== readinessPackage.readinessHash ||
    permission?.datasetHash !== readinessPackage.dataset.datasetHash ||
    permission?.exportDigests?.train !== readinessPackage.exportDigests.train ||
    permission?.exportDigests?.validation !== readinessPackage.exportDigests.validation
  ) {
    errors.push('dataset-binding');
  }
  if (
    permission?.baseModelId !== normalizeText(baseModelId) ||
    permission?.trainerId !== normalizeText(trainerId) ||
    permission?.rollbackOwner !== normalizeText(rollbackOwner) ||
    permission?.executionKind !== 'local-model-training' ||
    permission?.resolvedBy !== permission?.approvalOwner
  ) {
    errors.push('execution-binding');
  }
  if (
    permission?.status !== 'approved' ||
    permission?.decision !== 'approve' ||
    permission?.localExecutionAuthorized !== true ||
    permission?.externalSubmissionAuthorized !== false ||
    permission?.rolloutAuthorized !== false ||
    permission?.productionReadyClaim !== false
  ) {
    errors.push('authority-boundary');
  }
  if (errors.length > 0) {
    throw new Error(`Local training permission failed: ${[...new Set(errors)].join(', ')}.`);
  }
}

export function revokeLocalTrainingPermission({
  permission,
  reason,
  revokedAt,
  revokedBy,
} = {}) {
  const normalizedRevokedAt = requireTimestamp(revokedAt, 'revokedAt');
  const normalizedRevokedBy = requireContentFreeText(revokedBy, 'revokedBy');
  const normalizedReason = requireContentFreeText(reason, 'reason');
  const { id, permissionHash, ...permissionContent } = permission || {};
  const expectedPermissionHash = hashRecord(permissionContent);
  if (
    permission?.schemaVersion !== LOCAL_TRAINING_PERMISSION_SCHEMA_VERSION ||
    permission?.status !== 'approved' ||
    permission?.decision !== 'approve' ||
    permissionHash !== expectedPermissionHash ||
    id !== `local-training-permission-${expectedPermissionHash}`
  ) {
    throw new Error('Only an approved local training permission can be revoked.');
  }
  if (normalizedRevokedBy !== permission.approvalOwner) {
    throw new Error('Local training permission revocation failed: approval-owner.');
  }
  if (Date.parse(normalizedRevokedAt) < Date.parse(permission.resolvedAt)) {
    throw new Error('Local training permission revocation must not precede approval.');
  }

  const revocation = {
    externalSubmissionAuthorized: false,
    localExecutionAuthorized: false,
    permission: {
      id: permission.id,
      permissionHash: permission.permissionHash,
    },
    productionReadyClaim: false,
    reasonHash: hashValue(normalizedReason),
    revokedAt: normalizedRevokedAt,
    revokedBy: normalizedRevokedBy,
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_PERMISSION_REVOCATION_SCHEMA_VERSION,
    status: 'revoked',
  };
  const revocationHash = hashRecord(revocation);
  return {
    ...revocation,
    id: `local-training-permission-revocation-${revocationHash}`,
    revocationHash,
  };
}
