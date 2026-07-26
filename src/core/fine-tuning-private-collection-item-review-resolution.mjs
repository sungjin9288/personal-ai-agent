import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateCollectionItemReviewProjection,
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
} from './fine-tuning-private-collection-item-review-projection.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_RESOLUTION_DECISION_INPUT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_RESOLUTION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-review-resolution/v1';

const ITEM_BINDING_FIELDS = Object.freeze([
  'admissionHash',
  'assessmentHash',
  'collectionPlanHash',
  'contentHash',
  'datasetHash',
  'datasetManifestHash',
  'envelopeHash',
  'evaluationManifestHash',
  'executionRequestHash',
  'executionResolutionHash',
  'policyHash',
  'privateCollectionPlanHash',
  'readinessHash',
  'requestHash',
  'resolutionHash',
  'sanitizationHash',
  'trainSha256',
  'validationSha256',
  'workspaceHash',
]);

const TARGETS = Object.freeze({
  'answer-quality-cases': 'answer-quality-case-enrichment-review',
  'reviewed-examples': 'reviewed-example-candidate-review',
});

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function requireExactKeys(value, keys, fieldName) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())
  ) {
    throw new Error(`Fine-tuning private collection item review resolution ${fieldName} fields are invalid.`);
  }
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Fine-tuning private collection item review resolution ${fieldName} must be a valid timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

function normalizeReference(value, fieldName, prefix, hashField) {
  requireExactKeys(value, ['id', hashField], fieldName);
  if (!isSha256(value[hashField]) || value.id !== `${prefix}${value[hashField]}`) {
    throw new Error(`Fine-tuning private collection item review resolution ${fieldName} is invalid.`);
  }
  return { id: value.id, [hashField]: value[hashField] };
}

function normalizeProjectionReference(value, fieldName) {
  return normalizeReference(
    value,
    fieldName,
    'fine-tuning-private-collection-item-review-projection-',
    'projectionHash',
  );
}

function normalizeDecisionInput(input) {
  requireExactKeys(
    input,
    [
      'admission',
      'confirmationToken',
      'decidedAt',
      'decidedByRole',
      'decision',
      'evidenceSha256',
      'item',
      'projection',
      'schemaVersion',
      'target',
      'workspace',
    ],
    'decision input',
  );
  const projection = normalizeProjectionReference(input.projection, 'decision projection');
  if (
    input.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_RESOLUTION_DECISION_INPUT_SCHEMA_VERSION ||
    input.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(input.decision) ||
    !Object.values(TARGETS).includes(input.target) ||
    !isSha256(input.evidenceSha256) ||
    input.confirmationToken !== `${input.decision}-private-collection-item-review:${projection.projectionHash}`
  ) {
    throw new Error('Fine-tuning private collection item review resolution decision input is invalid.');
  }
  return {
    admission: normalizeReference(
      input.admission,
      'decision admission',
      'fine-tuning-private-collection-item-admission-',
      'admissionHash',
    ),
    confirmationToken: input.confirmationToken,
    decidedAt: requireTimestamp(input.decidedAt, 'decision decidedAt'),
    decidedByRole: 'quality-reviewer',
    decision: input.decision,
    evidenceSha256: input.evidenceSha256,
    item: normalizeReference(
      input.item,
      'decision item',
      'fine-tuning-private-collection-item-',
      'itemHash',
    ),
    projection,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_RESOLUTION_DECISION_INPUT_SCHEMA_VERSION,
    target: input.target,
    workspace: normalizeReference(
      input.workspace,
      'decision workspace',
      'fine-tuning-private-collection-workspace-',
      'workspaceHash',
    ),
  };
}

export function assertFineTuningPrivateCollectionItemReviewResolutionDecisionInput(input) {
  return normalizeDecisionInput(input);
}

function decisionRecord(input) {
  return {
    confirmationTokenSha256: hashValue(input.confirmationToken),
    decidedAt: input.decidedAt,
    decidedByRole: input.decidedByRole,
    decision: input.decision,
    evidenceSha256: input.evidenceSha256,
    schemaVersion: input.schemaVersion,
    target: input.target,
  };
}

function projectionRequest(projection) {
  return {
    admission: projection.admission,
    item: projection.item,
    requestedAt: projection.projectionRequest.requestedAt,
    requestedByRole: projection.projectionRequest.requestedByRole,
    schemaVersion: projection.projectionRequest.schemaVersion,
    target: projection.projectionRequest.target,
    workspace: projection.workspace,
  };
}

function assertLiveProjection({ admission, item, projection, workspace }) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  assertFineTuningPrivateCollectionItemReviewProjection(projection, {
    admission,
    item,
    request: projectionRequest(projection),
    workspace,
  });
}

function buildContent({ admission, decision, item, projection, resolvedAt, workspace }) {
  assertLiveProjection({ admission, item, projection, workspace });
  const normalizedDecision = normalizeDecisionInput(decision);
  const normalizedResolvedAt = requireTimestamp(resolvedAt, 'resolvedAt');
  const expectedTarget = TARGETS[item.lane];
  const storedDecision = decisionRecord(normalizedDecision);
  const decisionHash = hashRecord(storedDecision);

  if (
    !expectedTarget ||
    normalizedDecision.target !== expectedTarget ||
    normalizedDecision.workspace.id !== workspace.id ||
    normalizedDecision.workspace.workspaceHash !== workspace.workspaceHash ||
    normalizedDecision.admission.id !== admission.id ||
    normalizedDecision.admission.admissionHash !== admission.admissionHash ||
    normalizedDecision.item.id !== item.id ||
    normalizedDecision.item.itemHash !== item.itemHash ||
    normalizedDecision.projection.id !== projection.id ||
    normalizedDecision.projection.projectionHash !== projection.projectionHash ||
    projection.workspace.id !== workspace.id ||
    projection.admission.id !== admission.id ||
    projection.item.id !== item.id ||
    projection.projectionKind !== expectedTarget ||
    Date.parse(normalizedDecision.decidedAt) < Date.parse(projection.projectedAt) ||
    Date.parse(normalizedResolvedAt) < Date.parse(normalizedDecision.decidedAt) ||
    Date.parse(normalizedResolvedAt) >= Date.parse(item.expiresAt) ||
    Date.parse(normalizedResolvedAt) >= Date.parse(item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private collection item review resolution must bind one live exact F1.12 projection.');
  }

  const bindings = {
    ...projection.bindings,
    decisionHash,
    projectionHash: projection.projectionHash,
  };
  if (Object.values(bindings).some((value) => !isSha256(value))) {
    throw new Error('Fine-tuning private collection item review resolution bindings are invalid.');
  }

  const approveReviewedExample = item.lane === 'reviewed-examples' && normalizedDecision.decision === 'approve';
  const approveAnswerQuality = item.lane === 'answer-quality-cases' && normalizedDecision.decision === 'approve';
  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission: normalizedDecision.admission,
    answerQualityCaseCreated: false,
    answerQualityCaseEnrichmentRequestAllowed: approveAnswerQuality,
    approvedTrainingRecordCreated: false,
    bindings,
    candidateTrainingReviewAllowed: false,
    contentCopied: false,
    decision: storedDecision.decision,
    decisionHash,
    decisionRecord: storedDecision,
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item: normalizedDecision.item,
    itemPathStored: false,
    lane: item.lane,
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    ownerOnly: true,
    productionReadyClaim: false,
    projection: normalizedDecision.projection,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    resolvedAt: normalizedResolvedAt,
    reviewedExampleCanonicalizationRequestAllowed: approveReviewedExample,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_RESOLUTION_SCHEMA_VERSION,
    sourceObservation: {
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      projectedAt: projection.projectedAt,
    },
    status: normalizedDecision.decision === 'reject'
      ? 'rejected-by-owner-review'
      : approveReviewedExample
        ? 'approved-for-reviewed-example-canonicalization-request'
        : 'approved-for-answer-quality-case-enrichment-request',
    target: expectedTarget,
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace: normalizedDecision.workspace,
    workspaceMutationPerformed: false,
  };
}

function rebuildDecisionRecord(value) {
  requireExactKeys(
    value,
    ['confirmationTokenSha256', 'decidedAt', 'decidedByRole', 'decision', 'evidenceSha256', 'schemaVersion', 'target'],
    'stored decision',
  );
  if (
    !isSha256(value.confirmationTokenSha256) ||
    !isSha256(value.evidenceSha256) ||
    value.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(value.decision) ||
    value.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_RESOLUTION_DECISION_INPUT_SCHEMA_VERSION ||
    !Object.values(TARGETS).includes(value.target)
  ) {
    throw new Error('Fine-tuning private collection item review resolution stored decision is invalid.');
  }
  return {
    ...value,
    decidedAt: requireTimestamp(value.decidedAt, 'stored decision decidedAt'),
  };
}

function rebuildContent(content) {
  requireExactKeys(
    content,
    [
      'actualModelTrainingExecuted', 'actualUserDataCollected', 'admission', 'answerQualityCaseCreated',
      'answerQualityCaseEnrichmentRequestAllowed', 'approvedTrainingRecordCreated', 'bindings',
      'candidateTrainingReviewAllowed', 'contentCopied', 'decision', 'decisionHash', 'decisionRecord',
      'deploymentAuthorized', 'evidenceIndependentlyVerified', 'externalProviderCalls',
      'externalSubmissionAuthorized', 'fineTuningExecutionAuthorized', 'item', 'itemPathStored', 'lane',
      'ownerAttestationRecorded', 'ownerIdentityVerified', 'ownerOnly', 'productionReadyClaim', 'projection',
      'providerSubmissionAuthorized', 'providerSubmissionCreated', 'resolvedAt',
      'reviewedExampleCanonicalizationRequestAllowed', 'schemaVersion', 'sourceObservation', 'status', 'target',
      'trainingAuthorized', 'trainingSubmissionCreated', 'workspace', 'workspaceMutationPerformed',
    ],
    'record',
  );
  const admission = normalizeReference(content.admission, 'record admission', 'fine-tuning-private-collection-item-admission-', 'admissionHash');
  const item = normalizeReference(content.item, 'record item', 'fine-tuning-private-collection-item-', 'itemHash');
  const projection = normalizeProjectionReference(content.projection, 'record projection');
  const workspace = normalizeReference(content.workspace, 'record workspace', 'fine-tuning-private-collection-workspace-', 'workspaceHash');
  const storedDecision = rebuildDecisionRecord(content.decisionRecord);
  const decisionHash = hashRecord(storedDecision);
  const expectedTarget = TARGETS[content.lane];
  const resolvedAt = requireTimestamp(content.resolvedAt, 'resolvedAt');
  requireExactKeys(content.sourceObservation, ['deleteBy', 'expiresAt', 'projectedAt'], 'source observation');
  const sourceObservation = {
    deleteBy: requireTimestamp(content.sourceObservation.deleteBy, 'source observation deleteBy'),
    expiresAt: requireTimestamp(content.sourceObservation.expiresAt, 'source observation expiresAt'),
    projectedAt: requireTimestamp(content.sourceObservation.projectedAt, 'source observation projectedAt'),
  };
  requireExactKeys(content.bindings, [...ITEM_BINDING_FIELDS, 'decisionHash', 'itemHash', 'projectionHash', 'projectionRequestHash', 'withdrawalReferenceSha256'], 'record bindings');
  const bindings = {
    ...Object.fromEntries(ITEM_BINDING_FIELDS.map((field) => [field, content.bindings[field]])),
    itemHash: item.itemHash,
    projectionRequestHash: content.bindings.projectionRequestHash,
    withdrawalReferenceSha256: content.bindings.withdrawalReferenceSha256,
    decisionHash,
    projectionHash: projection.projectionHash,
  };
  const approveReviewedExample = content.lane === 'reviewed-examples' && storedDecision.decision === 'approve';
  const approveAnswerQuality = content.lane === 'answer-quality-cases' && storedDecision.decision === 'approve';
  const status = storedDecision.decision === 'reject'
    ? 'rejected-by-owner-review'
    : approveReviewedExample
      ? 'approved-for-reviewed-example-canonicalization-request'
      : 'approved-for-answer-quality-case-enrichment-request';
  const expected = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission,
    answerQualityCaseCreated: false,
    answerQualityCaseEnrichmentRequestAllowed: approveAnswerQuality,
    approvedTrainingRecordCreated: false,
    bindings,
    candidateTrainingReviewAllowed: false,
    contentCopied: false,
    decision: storedDecision.decision,
    decisionHash,
    decisionRecord: storedDecision,
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item,
    itemPathStored: false,
    lane: content.lane,
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    ownerOnly: true,
    productionReadyClaim: false,
    projection,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    resolvedAt,
    reviewedExampleCanonicalizationRequestAllowed: approveReviewedExample,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_RESOLUTION_SCHEMA_VERSION,
    sourceObservation,
    status,
    target: expectedTarget,
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace,
    workspaceMutationPerformed: false,
  };
  if (
    !expectedTarget ||
    Object.values(bindings).some((value) => !isSha256(value)) ||
    bindings.admissionHash !== admission.admissionHash ||
    bindings.itemHash !== item.itemHash ||
    bindings.workspaceHash !== workspace.workspaceHash ||
    content.decision !== storedDecision.decision ||
    content.decisionHash !== decisionHash ||
    content.target !== expectedTarget ||
    storedDecision.target !== expectedTarget ||
    Date.parse(storedDecision.decidedAt) < Date.parse(sourceObservation.projectedAt) ||
    Date.parse(resolvedAt) < Date.parse(storedDecision.decidedAt) ||
    Date.parse(resolvedAt) >= Date.parse(sourceObservation.expiresAt) ||
    Date.parse(resolvedAt) >= Date.parse(sourceObservation.deleteBy) ||
    JSON.stringify(content) !== JSON.stringify(expected)
  ) {
    throw new Error('Fine-tuning private collection item review resolution integrity failed.');
  }
  return expected;
}

export function buildFineTuningPrivateCollectionItemReviewResolution(input = {}) {
  const content = buildContent(input);
  const resolutionHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-item-review-resolution-${resolutionHash}`,
    resolutionHash,
  };
}

export function assertFineTuningPrivateCollectionItemReviewResolutionRecord(resolution) {
  const { id, resolutionHash, ...content } = resolution || {};
  const expected = rebuildContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    resolutionHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-review-resolution-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item review resolution integrity failed.');
  }
  return resolution;
}

export function assertFineTuningPrivateCollectionItemReviewResolution(
  resolution,
  { admission, decision, item, projection, workspace } = {},
) {
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(resolution);
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
  const expected = buildFineTuningPrivateCollectionItemReviewResolution({
    admission,
    decision,
    item,
    projection,
    resolvedAt: resolution.resolvedAt,
    workspace,
  });
  if (JSON.stringify(resolution) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private collection item review resolution does not match the live F1.12 projection.');
  }
  return resolution;
}
