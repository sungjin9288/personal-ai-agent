import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateCollectionItemArtifactRequest,
  assertFineTuningPrivateCollectionItemArtifactRequestRecord,
} from './fine-tuning-private-collection-item-artifact-request.mjs';
import { assertFineTuningPrivateCollectionItemReviewProjectionRecord } from './fine-tuning-private-collection-item-review-projection.mjs';
import { assertFineTuningPrivateCollectionItemReviewResolutionRecord } from './fine-tuning-private-collection-item-review-resolution.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_PREPARATION_DECISION_INPUT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_PREPARATION_RESOLUTION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-resolution/v1';

const TARGETS = Object.freeze({
  'reviewed-examples': 'reviewed-example-canonicalization',
  'answer-quality-cases': 'answer-quality-case-enrichment',
});
const ARTIFACT_REQUEST_BINDING_FIELDS = Object.freeze([
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
  'itemHash',
  'projectionRequestHash',
  'withdrawalReferenceSha256',
  'projectionHash',
  'itemReviewResolutionHash',
  'artifactRequestInputHash',
]);

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function requireKeys(value, expected, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`Fine-tuning private collection item artifact preparation resolution ${label} fields are invalid.`);
  }
}

function timestamp(value, label) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Fine-tuning private collection item artifact preparation resolution ${label} must be a valid timestamp.`);
  }
  return new Date(parsed).toISOString();
}

function reference(value, label, prefix, hashField) {
  requireKeys(value, ['id', hashField], label);
  if (!isSha256(value[hashField]) || value.id !== `${prefix}${value[hashField]}`) {
    throw new Error(`Fine-tuning private collection item artifact preparation resolution ${label} is invalid.`);
  }
  return { id: value.id, [hashField]: value[hashField] };
}

function artifactRequestReference(value, label) {
  return reference(
    value,
    label,
    'fine-tuning-private-collection-item-artifact-request-',
    'artifactRequestHash',
  );
}

function projectionReference(value, label) {
  return reference(
    value,
    label,
    'fine-tuning-private-collection-item-review-projection-',
    'projectionHash',
  );
}

function reviewResolutionReference(value, label) {
  return reference(
    value,
    label,
    'fine-tuning-private-collection-item-review-resolution-',
    'resolutionHash',
  );
}

function normalizeDecision(input) {
  requireKeys(input, [
    'artifactRequest',
    'confirmationToken',
    'decidedAt',
    'decidedByRole',
    'decision',
    'evidenceSha256',
    'item',
    'schemaVersion',
    'target',
    'workspace',
  ], 'decision input');
  const artifactRequest = artifactRequestReference(input.artifactRequest, 'decision artifact request');
  if (
    input.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_PREPARATION_DECISION_INPUT_SCHEMA_VERSION ||
    input.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(input.decision) ||
    !Object.values(TARGETS).includes(input.target) ||
    !isSha256(input.evidenceSha256) ||
    input.confirmationToken !== `${input.decision}-private-collection-item-artifact-preparation:${artifactRequest.artifactRequestHash}`
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution decision input is invalid.');
  }
  return {
    artifactRequest,
    confirmationToken: input.confirmationToken,
    decidedAt: timestamp(input.decidedAt, 'decision decidedAt'),
    decidedByRole: 'quality-reviewer',
    decision: input.decision,
    evidenceSha256: input.evidenceSha256,
    item: reference(input.item, 'decision item', 'fine-tuning-private-collection-item-', 'itemHash'),
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_PREPARATION_DECISION_INPUT_SCHEMA_VERSION,
    target: input.target,
    workspace: reference(input.workspace, 'decision workspace', 'fine-tuning-private-collection-workspace-', 'workspaceHash'),
  };
}

export function assertFineTuningPrivateCollectionItemArtifactPreparationDecisionInput(input) {
  return normalizeDecision(input);
}

function decisionRecord(decision) {
  return {
    confirmationTokenSha256: sha256(decision.confirmationToken),
    decidedAt: decision.decidedAt,
    decidedByRole: decision.decidedByRole,
    decision: decision.decision,
    evidenceSha256: decision.evidenceSha256,
    schemaVersion: decision.schemaVersion,
    target: decision.target,
  };
}

function artifactInput(request) {
  return {
    admission: request.admission,
    item: request.item,
    projection: request.projection,
    requestedAt: request.artifactRequestInput.requestedAt,
    requestedByRole: request.artifactRequestInput.requestedByRole,
    reviewResolution: request.reviewResolution,
    schemaVersion: request.artifactRequestInput.schemaVersion,
    target: request.artifactRequestInput.target,
    workspace: request.workspace,
  };
}

function assertLive({ admission, artifactRequest, item, projection, reviewResolution, workspace }) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(reviewResolution);
  assertFineTuningPrivateCollectionItemArtifactRequest(artifactRequest, {
    admission,
    artifactRequestInput: artifactInput(artifactRequest),
    item,
    projection,
    reviewResolution,
    workspace,
  });
}

function buildContent({ admission, artifactRequest, decision, item, projection, resolvedAt, reviewResolution, workspace }) {
  assertLive({ admission, artifactRequest, item, projection, reviewResolution, workspace });
  const normalizedDecision = normalizeDecision(decision);
  const normalizedResolvedAt = timestamp(resolvedAt, 'resolvedAt');
  const expectedTarget = TARGETS[item.lane];
  const storedDecision = decisionRecord(normalizedDecision);
  const artifactPreparationDecisionHash = hash(storedDecision);

  if (
    !expectedTarget ||
    artifactRequest.target !== expectedTarget ||
    !artifactRequest.artifactPreparationRequestCreated ||
    normalizedDecision.target !== expectedTarget ||
    normalizedDecision.workspace.id !== workspace.id ||
    normalizedDecision.workspace.workspaceHash !== workspace.workspaceHash ||
    normalizedDecision.item.id !== item.id ||
    normalizedDecision.item.itemHash !== item.itemHash ||
    normalizedDecision.artifactRequest.id !== artifactRequest.id ||
    normalizedDecision.artifactRequest.artifactRequestHash !== artifactRequest.artifactRequestHash ||
    artifactRequest.admission.id !== admission.id ||
    artifactRequest.item.id !== item.id ||
    artifactRequest.projection.id !== projection.id ||
    artifactRequest.reviewResolution.id !== reviewResolution.id ||
    artifactRequest.workspace.id !== workspace.id ||
    Date.parse(normalizedDecision.decidedAt) < Date.parse(artifactRequest.createdAt) ||
    Date.parse(normalizedResolvedAt) < Date.parse(normalizedDecision.decidedAt) ||
    Date.parse(normalizedResolvedAt) >= Date.parse(item.expiresAt) ||
    Date.parse(normalizedResolvedAt) >= Date.parse(item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution must bind one live exact F1.14 request.');
  }

  const bindings = {
    ...artifactRequest.bindings,
    artifactRequestHash: artifactRequest.artifactRequestHash,
    artifactPreparationDecisionHash,
  };
  if (Object.values(bindings).some((value) => !isSha256(value))) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution bindings are invalid.');
  }

  const approved = normalizedDecision.decision === 'approve';
  const reviewedExampleAllowed = approved && item.lane === 'reviewed-examples';
  const answerQualityAllowed = approved && item.lane === 'answer-quality-cases';
  const status = !approved
    ? 'rejected-artifact-preparation'
    : reviewedExampleAllowed
      ? 'approved-for-reviewed-example-canonicalization-preparation'
      : 'approved-for-answer-quality-case-enrichment-preparation';

  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission: artifactRequest.admission,
    answerQualityCaseCreated: false,
    answerQualityCaseEnrichmentPreparationAllowed: answerQualityAllowed,
    approvedTrainingRecordCreated: false,
    artifactPreparationApprovalResolved: true,
    artifactPreparationAuthorized: approved,
    artifactRequest: artifactRequestReference({
      id: artifactRequest.id,
      artifactRequestHash: artifactRequest.artifactRequestHash,
    }, 'record artifact request'),
    bindings,
    candidateTrainingReviewAllowed: false,
    contentCopied: false,
    decision: storedDecision.decision,
    decisionRecord: storedDecision,
    deploymentAuthorized: false,
    eligibilityEvaluated: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item: artifactRequest.item,
    itemPathStored: false,
    lane: item.lane,
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    ownerOnly: true,
    productionReadyClaim: false,
    projection: artifactRequest.projection,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    resolvedAt: normalizedResolvedAt,
    reviewResolution: artifactRequest.reviewResolution,
    reviewedExampleCanonicalizationPreparationAllowed: reviewedExampleAllowed,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_PREPARATION_RESOLUTION_SCHEMA_VERSION,
    sourceObservation: {
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      requestedAt: artifactRequest.createdAt,
    },
    status,
    target: expectedTarget,
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace: artifactRequest.workspace,
    workspaceMutationPerformed: false,
  };
}

function rebuildDecision(value) {
  requireKeys(value, [
    'confirmationTokenSha256',
    'decidedAt',
    'decidedByRole',
    'decision',
    'evidenceSha256',
    'schemaVersion',
    'target',
  ], 'stored decision');
  if (
    !isSha256(value.confirmationTokenSha256) ||
    !isSha256(value.evidenceSha256) ||
    value.decidedByRole !== 'quality-reviewer' ||
    !['approve', 'reject'].includes(value.decision) ||
    value.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_PREPARATION_DECISION_INPUT_SCHEMA_VERSION ||
    !Object.values(TARGETS).includes(value.target)
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution stored decision is invalid.');
  }
  return { ...value, decidedAt: timestamp(value.decidedAt, 'stored decision decidedAt') };
}

function rebuildContent(value) {
  requireKeys(value, [
    'actualModelTrainingExecuted',
    'actualUserDataCollected',
    'admission',
    'answerQualityCaseCreated',
    'answerQualityCaseEnrichmentPreparationAllowed',
    'approvedTrainingRecordCreated',
    'artifactPreparationApprovalResolved',
    'artifactPreparationAuthorized',
    'artifactRequest',
    'bindings',
    'candidateTrainingReviewAllowed',
    'contentCopied',
    'decision',
    'decisionRecord',
    'deploymentAuthorized',
    'eligibilityEvaluated',
    'evidenceIndependentlyVerified',
    'externalProviderCalls',
    'externalSubmissionAuthorized',
    'fineTuningExecutionAuthorized',
    'item',
    'itemPathStored',
    'lane',
    'ownerAttestationRecorded',
    'ownerIdentityVerified',
    'ownerOnly',
    'productionReadyClaim',
    'projection',
    'providerSubmissionAuthorized',
    'providerSubmissionCreated',
    'resolvedAt',
    'reviewResolution',
    'reviewedExampleCanonicalizationPreparationAllowed',
    'schemaVersion',
    'sourceObservation',
    'status',
    'target',
    'trainingAuthorized',
    'trainingSubmissionCreated',
    'workspace',
    'workspaceMutationPerformed',
  ], 'record');
  const admission = reference(value.admission, 'record admission', 'fine-tuning-private-collection-item-admission-', 'admissionHash');
  const item = reference(value.item, 'record item', 'fine-tuning-private-collection-item-', 'itemHash');
  const projection = projectionReference(value.projection, 'record projection');
  const reviewResolution = reviewResolutionReference(value.reviewResolution, 'record review resolution');
  const artifactRequest = artifactRequestReference(value.artifactRequest, 'record artifact request');
  const workspace = reference(value.workspace, 'record workspace', 'fine-tuning-private-collection-workspace-', 'workspaceHash');
  const storedDecision = rebuildDecision(value.decisionRecord);
  const artifactPreparationDecisionHash = hash(storedDecision);
  requireKeys(value.sourceObservation, ['deleteBy', 'expiresAt', 'requestedAt'], 'source observation');
  const sourceObservation = {
    deleteBy: timestamp(value.sourceObservation.deleteBy, 'source observation deleteBy'),
    expiresAt: timestamp(value.sourceObservation.expiresAt, 'source observation expiresAt'),
    requestedAt: timestamp(value.sourceObservation.requestedAt, 'source observation requestedAt'),
  };
  const expectedBindingKeys = [
    ...ARTIFACT_REQUEST_BINDING_FIELDS,
    'artifactRequestHash',
    'artifactPreparationDecisionHash',
  ];
  requireKeys(value.bindings, expectedBindingKeys, 'record bindings');
  const bindings = {
    ...value.bindings,
    artifactRequestHash: artifactRequest.artifactRequestHash,
    artifactPreparationDecisionHash,
  };
  const expectedTarget = TARGETS[value.lane];
  const approved = storedDecision.decision === 'approve';
  const reviewedExampleAllowed = approved && value.lane === 'reviewed-examples';
  const answerQualityAllowed = approved && value.lane === 'answer-quality-cases';
  const status = !approved
    ? 'rejected-artifact-preparation'
    : reviewedExampleAllowed
      ? 'approved-for-reviewed-example-canonicalization-preparation'
      : 'approved-for-answer-quality-case-enrichment-preparation';
  const expected = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission,
    answerQualityCaseCreated: false,
    answerQualityCaseEnrichmentPreparationAllowed: answerQualityAllowed,
    approvedTrainingRecordCreated: false,
    artifactPreparationApprovalResolved: true,
    artifactPreparationAuthorized: approved,
    artifactRequest,
    bindings,
    candidateTrainingReviewAllowed: false,
    contentCopied: false,
    decision: storedDecision.decision,
    decisionRecord: storedDecision,
    deploymentAuthorized: false,
    eligibilityEvaluated: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item,
    itemPathStored: false,
    lane: value.lane,
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    ownerOnly: true,
    productionReadyClaim: false,
    projection,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    resolvedAt: timestamp(value.resolvedAt, 'resolvedAt'),
    reviewResolution,
    reviewedExampleCanonicalizationPreparationAllowed: reviewedExampleAllowed,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_PREPARATION_RESOLUTION_SCHEMA_VERSION,
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
    Object.values(bindings).some((binding) => !isSha256(binding)) ||
    bindings.admissionHash !== admission.admissionHash ||
    bindings.itemHash !== item.itemHash ||
    bindings.workspaceHash !== workspace.workspaceHash ||
    value.decision !== storedDecision.decision ||
    storedDecision.target !== expectedTarget ||
    Date.parse(storedDecision.decidedAt) < Date.parse(sourceObservation.requestedAt) ||
    Date.parse(expected.resolvedAt) < Date.parse(storedDecision.decidedAt) ||
    Date.parse(expected.resolvedAt) >= Date.parse(sourceObservation.expiresAt) ||
    Date.parse(expected.resolvedAt) >= Date.parse(sourceObservation.deleteBy) ||
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution integrity failed.');
  }
  return expected;
}

export function buildFineTuningPrivateCollectionItemArtifactPreparationResolution(input = {}) {
  const value = buildContent(input);
  const artifactPreparationResolutionHash = hash(value);
  return {
    ...value,
    id: `fine-tuning-private-collection-item-artifact-preparation-resolution-${artifactPreparationResolutionHash}`,
    artifactPreparationResolutionHash,
  };
}

export function assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(resolution) {
  const { artifactPreparationResolutionHash, id, ...value } = resolution || {};
  const expected = rebuildContent(value);
  const expectedHash = hash(expected);
  if (
    JSON.stringify(value) !== JSON.stringify(expected) ||
    artifactPreparationResolutionHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-artifact-preparation-resolution-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution integrity failed.');
  }
  return resolution;
}

export function assertFineTuningPrivateCollectionItemArtifactPreparationResolution(
  resolution,
  { admission, artifactRequest, decision, item, projection, reviewResolution, workspace } = {},
) {
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(resolution);
  assertFineTuningPrivateCollectionItemArtifactRequestRecord(artifactRequest);
  const expected = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
    admission,
    artifactRequest,
    decision,
    item,
    projection,
    resolvedAt: resolution.resolvedAt,
    reviewResolution,
    workspace,
  });
  if (JSON.stringify(resolution) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private collection item artifact preparation resolution does not match the live F1.14 request.');
  }
  return resolution;
}
