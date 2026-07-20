import { createHash } from 'node:crypto';

import { assertLocalTrainingToolchainDecision } from './local-training-toolchain-decision.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_ACQUISITION_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-request/v1';
export const LOCAL_TRAINING_ACQUISITION_APPROVAL_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-approval/v1';

const DECISIONS = new Set(['approve', 'reject']);
const MUTABLE_ROOT = 'var/local-training/mlx-lm-lora-qwen2.5-1.5b';
export const LOCAL_TRAINING_ACQUISITION_ACTIONS = Object.freeze([
  'create-isolated-python-environment',
  'install-pinned-trainer-package',
  'download-pinned-trainable-source',
  'record-package-and-model-hashes',
  'close-acquisition-egress',
  'run-offline-resource-canary',
  'request-post-install-product-permission',
]);

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
  return /^[a-f0-9]{64}$/u.test(normalizeText(value));
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
      `Local training acquisition ${fieldName} must be content-free metadata.`,
    );
  }
  return normalized;
}

function requireTimestamp(value, fieldName) {
  const normalized = normalizeText(value);
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new Error(
      `Local training acquisition ${fieldName} must be a valid timestamp.`,
    );
  }
  return normalized;
}

function requirePositiveInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized <= 0) {
    throw new Error(
      `Local training acquisition ${fieldName} must be a positive integer.`,
    );
  }
  return normalized;
}

function summarizeDecision(decision) {
  assertLocalTrainingToolchainDecision(decision);
  if (
    decision.status !== 'candidate-selected-approval-required' ||
    decision.readyForAcquisitionApprovalRequest !== true ||
    decision.acquisitionAuthorized !== false ||
    decision.actualDependencyInstallationPerformed !== false ||
    decision.actualModelDownloadPerformed !== false ||
    decision.actualModelTrainingExecuted !== false
  ) {
    throw new Error(
      'Local training acquisition requires the unexecuted F2c.2 decision.',
    );
  }
  return {
    decisionHash: decision.decisionHash,
    id: decision.id,
    preflightHash: decision.preflight.preflightHash,
    sourceModel: {
      id: decision.recommendedTrack.sourceModel.id,
      licenseId: decision.recommendedTrack.sourceModel.licenseId,
      revision: decision.recommendedTrack.sourceModel.revision,
    },
    trackId: decision.recommendedTrack.id,
    trainer: {
      id: decision.recommendedTrack.trainer.id,
      packageName: decision.recommendedTrack.trainer.packageName,
      releaseCommit: decision.recommendedTrack.trainer.releaseCommit,
      version: decision.recommendedTrack.trainer.version,
    },
  };
}

function normalizeDecisionSummary(decision = {}) {
  if (
    !isSha256(decision.decisionHash) ||
    !isSha256(decision.preflightHash)
  ) {
    throw new Error(
      'Local training acquisition requires exact decision hashes.',
    );
  }
  return {
    decisionHash: decision.decisionHash,
    id: requireMetadata(decision.id, 'decision.id'),
    preflightHash: decision.preflightHash,
    sourceModel: {
      id: requireMetadata(
        decision.sourceModel?.id,
        'decision.sourceModel.id',
      ),
      licenseId: requireMetadata(
        decision.sourceModel?.licenseId,
        'decision.sourceModel.licenseId',
      ),
      revision: requireMetadata(
        decision.sourceModel?.revision,
        'decision.sourceModel.revision',
      ),
    },
    trackId: requireMetadata(decision.trackId, 'decision.trackId'),
    trainer: {
      id: requireMetadata(decision.trainer?.id, 'decision.trainer.id'),
      packageName: requireMetadata(
        decision.trainer?.packageName,
        'decision.trainer.packageName',
      ),
      releaseCommit: requireMetadata(
        decision.trainer?.releaseCommit,
        'decision.trainer.releaseCommit',
      ),
      version: requireMetadata(
        decision.trainer?.version,
        'decision.trainer.version',
      ),
    },
  };
}

function normalizeResourceEnvelope(envelope = {}) {
  return {
    maxConcurrentDownloads: requirePositiveInteger(
      envelope.maxConcurrentDownloads,
      'maxConcurrentDownloads',
    ),
    maxDiskBytes: requirePositiveInteger(
      envelope.maxDiskBytes,
      'maxDiskBytes',
    ),
    maxDownloadBytes: requirePositiveInteger(
      envelope.maxDownloadBytes,
      'maxDownloadBytes',
    ),
    maxRuntimeMs: requirePositiveInteger(
      envelope.maxRuntimeMs,
      'maxRuntimeMs',
    ),
    status: 'proposed-not-measured',
  };
}

function buildRequestContent({
  decision,
  expiresAt,
  proposedResourceEnvelope,
  requestedAt,
  requestedBy,
}) {
  const normalizedRequestedAt = requireTimestamp(
    requestedAt,
    'requestedAt',
  );
  const normalizedExpiresAt = requireTimestamp(expiresAt, 'expiresAt');
  if (Date.parse(normalizedExpiresAt) <= Date.parse(normalizedRequestedAt)) {
    throw new Error(
      'Local training acquisition expiration must follow requestedAt.',
    );
  }
  return {
    acquisitionAuthorized: false,
    actualDependencyInstallationPerformed: false,
    actualModelDownloadPerformed: false,
    actualModelTrainingExecuted: false,
    decision: normalizeDecisionSummary(decision),
    expiresAt: normalizedExpiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    mutableRoot: MUTABLE_ROOT,
    networkPolicy: 'acquisition-egress-caller-owned-then-offline',
    productionReadyClaim: false,
    proposedResourceEnvelope: normalizeResourceEnvelope(
      proposedResourceEnvelope,
    ),
    requestedActions: [...LOCAL_TRAINING_ACQUISITION_ACTIONS],
    requestedAt: normalizedRequestedAt,
    requestedBy: requireMetadata(requestedBy, 'requestedBy'),
    requiredOwnerRoles: [
      'approval-owner',
      'egress-owner',
      'license-owner',
      'resource-owner',
      'rollback-owner',
    ],
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_ACQUISITION_REQUEST_SCHEMA_VERSION,
    status: 'pending-owner-review',
    trainingAuthorized: false,
  };
}

function assertRequestIntegrity(request) {
  const {
    id,
    requestHash,
    ...content
  } = request || {};
  const expected = buildRequestContent({
    decision: content.decision,
    expiresAt: content.expiresAt,
    proposedResourceEnvelope: content.proposedResourceEnvelope,
    requestedAt: content.requestedAt,
    requestedBy: content.requestedBy,
  });
  const expectedHash = hashRecord(expected);
  if (
    requestHash !== expectedHash ||
    id !== `local-training-acquisition-request-${expectedHash}` ||
    JSON.stringify(content) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local training acquisition request failed: integrity.',
    );
  }
  return request;
}

export function assertLocalTrainingAcquisitionRequest(
  request,
  toolchainDecision,
) {
  assertRequestIntegrity(request);
  const currentDecision = summarizeDecision(toolchainDecision);
  if (
    JSON.stringify(request.decision) !== JSON.stringify(currentDecision)
  ) {
    throw new Error(
      'Local training acquisition request failed: current-decision.',
    );
  }
  return request;
}

export function buildLocalTrainingAcquisitionRequest({
  decision,
  expiresAt,
  proposedResourceEnvelope,
  requestedAt,
  requestedBy,
} = {}) {
  const content = buildRequestContent({
    decision: summarizeDecision(decision),
    expiresAt,
    proposedResourceEnvelope,
    requestedAt,
    requestedBy,
  });
  const requestHash = hashRecord(content);
  return {
    ...content,
    id: `local-training-acquisition-request-${requestHash}`,
    requestHash,
  };
}

function normalizeOwners(owners = {}) {
  return {
    approvalOwner: requireMetadata(
      owners.approvalOwner,
      'owners.approvalOwner',
    ),
    egressOwner: requireMetadata(
      owners.egressOwner,
      'owners.egressOwner',
    ),
    licenseOwner: requireMetadata(
      owners.licenseOwner,
      'owners.licenseOwner',
    ),
    resourceOwner: requireMetadata(
      owners.resourceOwner,
      'owners.resourceOwner',
    ),
    rollbackOwner: requireMetadata(
      owners.rollbackOwner,
      'owners.rollbackOwner',
    ),
  };
}

export function resolveLocalTrainingAcquisitionRequest({
  decision,
  owners,
  reason,
  request,
  resolvedAt,
  resolvedBy,
  toolchainDecision,
} = {}) {
  assertLocalTrainingAcquisitionRequest(request, toolchainDecision);
  const normalizedDecision = normalizeText(decision);
  if (!DECISIONS.has(normalizedDecision)) {
    throw new Error(
      `Unsupported local training acquisition decision: ${normalizedDecision}.`,
    );
  }
  const normalizedOwners = normalizeOwners(owners);
  const normalizedResolvedBy = requireMetadata(
    resolvedBy,
    'resolvedBy',
  );
  if (normalizedResolvedBy !== normalizedOwners.approvalOwner) {
    throw new Error(
      'Local training acquisition resolution failed: approval-owner.',
    );
  }
  const normalizedResolvedAt = requireTimestamp(resolvedAt, 'resolvedAt');
  if (Date.parse(normalizedResolvedAt) < Date.parse(request.requestedAt)) {
    throw new Error(
      'Local training acquisition resolution must not precede the request.',
    );
  }
  if (
    normalizedDecision === 'approve' &&
    Date.parse(normalizedResolvedAt) >= Date.parse(request.expiresAt)
  ) {
    throw new Error(
      'Local training acquisition request expired before approval.',
    );
  }
  const approval = {
    acquisitionAuthorized: normalizedDecision === 'approve',
    actualDependencyInstallationPerformed: false,
    actualModelDownloadPerformed: false,
    actualModelTrainingExecuted: false,
    decision: normalizedDecision,
    expiresAt: request.expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    mutableRoot: request.mutableRoot,
    networkPolicy: request.networkPolicy,
    owners: normalizedOwners,
    productionReadyClaim: false,
    reasonHash: hashValue(requireMetadata(reason, 'reason')),
    request: {
      id: request.id,
      requestHash: request.requestHash,
    },
    requestedActions: [...request.requestedActions],
    resolvedAt: normalizedResolvedAt,
    resolvedBy: normalizedResolvedBy,
    resourceEnvelope: normalizeResourceEnvelope(
      request.proposedResourceEnvelope,
    ),
    rolloutAuthorized: false,
    schemaVersion: LOCAL_TRAINING_ACQUISITION_APPROVAL_SCHEMA_VERSION,
    status: normalizedDecision === 'approve' ? 'approved' : 'rejected',
    toolchainDecision: normalizeDecisionSummary(request.decision),
    trainingAuthorized: false,
  };
  const approvalHash = hashRecord(approval);
  return {
    ...approval,
    approvalHash,
    id: `local-training-acquisition-approval-${approvalHash}`,
  };
}

export function assertApprovedLocalTrainingAcquisition({
  approval,
  decision,
  now,
} = {}) {
  const {
    approvalHash,
    id,
    ...content
  } = approval || {};
  const expectedHash = hashRecord(content);
  const currentDecision = summarizeDecision(decision);
  const normalizedNow = requireTimestamp(now, 'now');
  const normalizedOwners = normalizeOwners(approval?.owners);
  const normalizedResourceEnvelope = normalizeResourceEnvelope(
    approval?.resourceEnvelope,
  );
  if (
    approval?.schemaVersion !==
      LOCAL_TRAINING_ACQUISITION_APPROVAL_SCHEMA_VERSION ||
    approvalHash !== expectedHash ||
    id !== `local-training-acquisition-approval-${expectedHash}` ||
    approval.status !== 'approved' ||
    approval.decision !== 'approve' ||
    approval.acquisitionAuthorized !== true ||
    approval.actualDependencyInstallationPerformed !== false ||
    approval.actualModelDownloadPerformed !== false ||
    approval.actualModelTrainingExecuted !== false ||
    approval.trainingAuthorized !== false ||
    approval.externalProviderCalls !== 'none' ||
    approval.externalSubmissionAuthorized !== false ||
    approval.rolloutAuthorized !== false ||
    approval.productionReadyClaim !== false ||
    approval.mutableRoot !== MUTABLE_ROOT ||
    approval.networkPolicy !==
      'acquisition-egress-caller-owned-then-offline' ||
    !isSha256(approval.reasonHash) ||
    !isSha256(approval.request?.requestHash) ||
    approval.request?.id !==
      `local-training-acquisition-request-${approval.request?.requestHash}` ||
    approval.resolvedBy !== normalizedOwners.approvalOwner ||
    Date.parse(approval.resolvedAt) >= Date.parse(approval.expiresAt) ||
    Date.parse(approval.resolvedAt) > Date.parse(normalizedNow) ||
    JSON.stringify(approval.owners) !==
      JSON.stringify(normalizedOwners) ||
    JSON.stringify(approval.resourceEnvelope) !==
      JSON.stringify(normalizedResourceEnvelope) ||
    JSON.stringify(approval.requestedActions) !==
      JSON.stringify(LOCAL_TRAINING_ACQUISITION_ACTIONS) ||
    Date.parse(approval.expiresAt) <= Date.parse(normalizedNow) ||
    JSON.stringify(approval.toolchainDecision) !==
      JSON.stringify(currentDecision)
  ) {
    throw new Error(
      'Local training acquisition approval failed: authority-boundary.',
    );
  }
  return approval;
}

export function buildLocalTrainingAcquisitionPlan({
  approval,
  decision,
  now,
} = {}) {
  assertApprovedLocalTrainingAcquisition({ approval, decision, now });
  return {
    acquisitionAuthorized: true,
    actualDependencyInstallationPerformed: false,
    actualModelDownloadPerformed: false,
    actualModelTrainingExecuted: false,
    approval: {
      approvalHash: approval.approvalHash,
      id: approval.id,
    },
    externalProviderCalls: 'none',
    mutableRoot: approval.mutableRoot,
    networkPolicy: approval.networkPolicy,
    productionReadyClaim: false,
    resourceEnvelope: normalizeResourceEnvelope(
      approval.resourceEnvelope,
    ),
    rolloutAuthorized: false,
    status: 'approved-acquisition-not-executed',
    steps: approval.requestedActions.map((id, index) => ({
      id,
      order: index + 1,
      status: 'pending',
    })),
    toolchainDecision: normalizeDecisionSummary(
      approval.toolchainDecision,
    ),
    trainingAuthorized: false,
  };
}
