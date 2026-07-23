import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateCollectionItemReviewProjection,
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
} from './fine-tuning-private-collection-item-review-projection.mjs';
import { assertFineTuningPrivateCollectionItemReviewResolutionRecord } from './fine-tuning-private-collection-item-review-resolution.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_REQUEST_INPUT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-artifact-request/v1';

const ITEM_BINDING_FIELDS = Object.freeze([
  'admissionHash', 'assessmentHash', 'collectionPlanHash', 'contentHash', 'datasetHash',
  'datasetManifestHash', 'envelopeHash', 'evaluationManifestHash', 'executionRequestHash',
  'executionResolutionHash', 'policyHash', 'privateCollectionPlanHash', 'readinessHash',
  'requestHash', 'resolutionHash', 'sanitizationHash', 'trainSha256', 'validationSha256', 'workspaceHash',
]);
const TARGETS = Object.freeze({
  'reviewed-examples': 'reviewed-example-canonicalization',
  'answer-quality-cases': 'answer-quality-case-enrichment',
});
const Q1_REQUIRED_FIELDS = Object.freeze([
  'answer', 'expectedSourceKeys', 'forbiddenAnswerTerms', 'forbiddenSourceKeys', 'id',
  'requiredAnswerTerms', 'retrievalInput', 'reviewerVerdict',
]);

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function keys(value, expected, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...expected].sort())
  ) {
    throw new Error(`Fine-tuning private collection item artifact request ${label} fields are invalid.`);
  }
}

function timestamp(value, label) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Fine-tuning private collection item artifact request ${label} must be a valid timestamp.`);
  }
  return new Date(parsed).toISOString();
}

function reference(value, label, prefix, hashField) {
  keys(value, ['id', hashField], label);
  if (!isSha256(value[hashField]) || value.id !== `${prefix}${value[hashField]}`) {
    throw new Error(`Fine-tuning private collection item artifact request ${label} is invalid.`);
  }
  return { id: value.id, [hashField]: value[hashField] };
}

function projectionReference(value, label) {
  return reference(value, label, 'fine-tuning-private-collection-item-review-projection-', 'projectionHash');
}

function resolutionReference(value, label) {
  return reference(value, label, 'fine-tuning-private-collection-item-review-resolution-', 'resolutionHash');
}

function normalizeInput(input) {
  keys(
    input,
    [
      'admission',
      'item',
      'projection',
      'requestedAt',
      'requestedByRole',
      'reviewResolution',
      'schemaVersion',
      'target',
      'workspace',
    ],
    'input',
  );
  if (
    input.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_REQUEST_INPUT_SCHEMA_VERSION ||
    input.requestedByRole !== 'local-operator-role' ||
    !Object.values(TARGETS).includes(input.target)
  ) {
    throw new Error('Fine-tuning private collection item artifact request input is invalid.');
  }
  return {
    admission: reference(input.admission, 'input admission', 'fine-tuning-private-collection-item-admission-', 'admissionHash'),
    item: reference(input.item, 'input item', 'fine-tuning-private-collection-item-', 'itemHash'),
    projection: projectionReference(input.projection, 'input projection'),
    requestedAt: timestamp(input.requestedAt, 'input requestedAt'),
    requestedByRole: 'local-operator-role',
    reviewResolution: resolutionReference(input.reviewResolution, 'input review resolution'),
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_REQUEST_INPUT_SCHEMA_VERSION,
    target: input.target,
    workspace: reference(input.workspace, 'input workspace', 'fine-tuning-private-collection-workspace-', 'workspaceHash'),
  };
}

export function assertFineTuningPrivateCollectionItemArtifactRequestInput(input) {
  return normalizeInput(input);
}

function projectionInput(projection) {
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

function assertLive({ admission, item, projection, reviewResolution, workspace }) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  assertFineTuningPrivateCollectionItemReviewProjection(projection, { admission, item, request: projectionInput(projection), workspace });
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(reviewResolution);
  if (
    reviewResolution.workspace.id !== workspace.id ||
    reviewResolution.workspace.workspaceHash !== workspace.workspaceHash ||
    reviewResolution.admission.id !== admission.id ||
    reviewResolution.admission.admissionHash !== admission.admissionHash ||
    reviewResolution.item.id !== item.id ||
    reviewResolution.item.itemHash !== item.itemHash ||
    reviewResolution.projection.id !== projection.id ||
    reviewResolution.projection.projectionHash !== projection.projectionHash ||
    Object.entries(projection.bindings).some(([key, value]) => reviewResolution.bindings[key] !== value)
  ) {
    throw new Error('Fine-tuning private collection item artifact request must inherit one exact F1.13 resolution binding.');
  }
}

function laneDetails(lane) {
  if (lane === 'reviewed-examples') {
    return {
      reviewedExample: {
        canonicalGateId: 'approved-training-record-v1',
        canonicalizationRequested: true,
        eligibilityEvaluated: false,
      },
      reviewedExampleCanonicalizationRequestCreated: true,
      answerQualityCaseEnrichmentRequestCreated: false,
    };
  }
  return {
    answerQualityCase: {
      contractSatisfied: false,
      enrichmentRequested: true,
      missingQ1Fields: [...Q1_REQUIRED_FIELDS],
    },
    reviewedExampleCanonicalizationRequestCreated: false,
    answerQualityCaseEnrichmentRequestCreated: true,
  };
}

function reducedInput(input) {
  return {
    schemaVersion: input.schemaVersion,
    requestedAt: input.requestedAt,
    requestedByRole: input.requestedByRole,
    target: input.target,
  };
}

function content({ admission, artifactRequestInput, createdAt, item, projection, reviewResolution, workspace }) {
  assertLive({ admission, item, projection, reviewResolution, workspace });
  const input = normalizeInput(artifactRequestInput);
  const normalizedCreatedAt = timestamp(createdAt, 'createdAt');
  const expectedTarget = TARGETS[item.lane];
  const artifactRequestInputHash = hashRecord(input);
  const itemReviewResolutionHash = reviewResolution.resolutionHash;
  if (
    !expectedTarget ||
    reviewResolution.decision !== 'approve' ||
    (item.lane === 'reviewed-examples' && !reviewResolution.reviewedExampleCanonicalizationRequestAllowed) ||
    (item.lane === 'answer-quality-cases' && !reviewResolution.answerQualityCaseEnrichmentRequestAllowed) ||
    input.target !== expectedTarget ||
    input.workspace.id !== workspace.id ||
    input.workspace.workspaceHash !== workspace.workspaceHash ||
    input.admission.id !== admission.id ||
    input.admission.admissionHash !== admission.admissionHash ||
    input.item.id !== item.id ||
    input.item.itemHash !== item.itemHash ||
    input.projection.id !== projection.id ||
    input.projection.projectionHash !== projection.projectionHash ||
    input.reviewResolution.id !== reviewResolution.id ||
    input.reviewResolution.resolutionHash !== itemReviewResolutionHash ||
    Date.parse(input.requestedAt) < Date.parse(reviewResolution.resolvedAt) ||
    Date.parse(normalizedCreatedAt) < Date.parse(input.requestedAt) ||
    Date.parse(normalizedCreatedAt) >= Date.parse(item.expiresAt) ||
    Date.parse(normalizedCreatedAt) >= Date.parse(item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private collection item artifact request must bind one approved live exact F1.13 resolution.');
  }
  const bindings = {
    ...Object.fromEntries(ITEM_BINDING_FIELDS.map((field) => [field, projection.bindings[field]])),
    itemHash: item.itemHash,
    projectionRequestHash: projection.bindings.projectionRequestHash,
    withdrawalReferenceSha256: projection.bindings.withdrawalReferenceSha256,
    projectionHash: projection.projectionHash,
    itemReviewResolutionHash,
    artifactRequestInputHash,
  };
  if (Object.values(bindings).some((value) => !isSha256(value))) {
    throw new Error('Fine-tuning private collection item artifact request bindings are invalid.');
  }
  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission: input.admission,
    answerQualityCaseCreated: false,
    approvedTrainingRecordCreated: false,
    artifactPreparationApprovalRequired: true,
    artifactPreparationAuthorized: false,
    artifactPreparationRequestCreated: true,
    artifactRequestInput: reducedInput(input),
    artifactRequestInputHash,
    bindings,
    candidateTrainingReviewAllowed: false,
    contentCopied: false,
    createdAt: normalizedCreatedAt,
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item: input.item,
    itemPathStored: false,
    lane: item.lane,
    ownerOnly: true,
    productionReadyClaim: false,
    projection: input.projection,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    reviewResolution: input.reviewResolution,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_REQUEST_SCHEMA_VERSION,
    sourceObservation: {
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      projectedAt: projection.projectedAt,
      resolvedAt: reviewResolution.resolvedAt,
    },
    status: item.lane === 'reviewed-examples' ? 'pending-reviewed-example-canonicalization-preparation' : 'pending-answer-quality-case-enrichment-preparation',
    target: expectedTarget,
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace: input.workspace,
    workspaceMutationPerformed: false,
    ...laneDetails(item.lane),
  };
}

function rebuild(value) {
  const laneKey = value?.lane === 'reviewed-examples' ? 'reviewedExample' : 'answerQualityCase';
  const expectedKeys = [
    'actualModelTrainingExecuted',
    'actualUserDataCollected',
    'admission',
    'answerQualityCaseCreated',
    'answerQualityCaseEnrichmentRequestCreated',
    'approvedTrainingRecordCreated',
    'artifactPreparationApprovalRequired',
    'artifactPreparationAuthorized',
    'artifactPreparationRequestCreated',
    'artifactRequestInput',
    'artifactRequestInputHash',
    'bindings',
    'candidateTrainingReviewAllowed',
    'contentCopied',
    'createdAt',
    'deploymentAuthorized',
    'evidenceIndependentlyVerified',
    'externalProviderCalls',
    'externalSubmissionAuthorized',
    'fineTuningExecutionAuthorized',
    'item',
    'itemPathStored',
    'lane',
    'ownerOnly',
    'productionReadyClaim',
    'projection',
    'providerSubmissionAuthorized',
    'providerSubmissionCreated',
    'reviewedExampleCanonicalizationRequestCreated',
    'reviewResolution',
    'schemaVersion',
    'sourceObservation',
    'status',
    'target',
    'trainingAuthorized',
    'trainingSubmissionCreated',
    'workspace',
    'workspaceMutationPerformed',
    laneKey,
  ];
  keys(value, expectedKeys, 'record');
  const admission = reference(value.admission, 'record admission', 'fine-tuning-private-collection-item-admission-', 'admissionHash');
  const item = reference(value.item, 'record item', 'fine-tuning-private-collection-item-', 'itemHash');
  const projection = projectionReference(value.projection, 'record projection');
  const reviewResolution = resolutionReference(value.reviewResolution, 'record review resolution');
  const workspace = reference(value.workspace, 'record workspace', 'fine-tuning-private-collection-workspace-', 'workspaceHash');
  keys(value.artifactRequestInput, ['requestedAt', 'requestedByRole', 'schemaVersion', 'target'], 'reduced input');
  const input = normalizeInput({
    ...value.artifactRequestInput,
    admission,
    item,
    projection,
    reviewResolution,
    workspace,
  });
  const createdAt = timestamp(value.createdAt, 'createdAt');
  keys(value.sourceObservation, ['deleteBy', 'expiresAt', 'projectedAt', 'resolvedAt'], 'source observation');
  const sourceObservation = Object.fromEntries(
    Object.entries(value.sourceObservation).map(([key, itemValue]) => [
      key,
      timestamp(itemValue, `source observation ${key}`),
    ]),
  );
  const artifactRequestInputHash = hashRecord(input);
  keys(
    value.bindings,
    [
      ...ITEM_BINDING_FIELDS,
      'artifactRequestInputHash',
      'itemHash',
      'itemReviewResolutionHash',
      'projectionHash',
      'projectionRequestHash',
      'withdrawalReferenceSha256',
    ],
    'record bindings',
  );
  const bindings = {
    ...Object.fromEntries(ITEM_BINDING_FIELDS.map((field) => [field, value.bindings[field]])),
    itemHash: item.itemHash,
    projectionRequestHash: value.bindings.projectionRequestHash,
    withdrawalReferenceSha256: value.bindings.withdrawalReferenceSha256,
    projectionHash: projection.projectionHash,
    itemReviewResolutionHash: reviewResolution.resolutionHash,
    artifactRequestInputHash,
  };
  const expectedTarget = TARGETS[value.lane];
  const expected = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission,
    answerQualityCaseCreated: false,
    approvedTrainingRecordCreated: false,
    artifactPreparationApprovalRequired: true,
    artifactPreparationAuthorized: false,
    artifactPreparationRequestCreated: true,
    artifactRequestInput: reducedInput(input),
    artifactRequestInputHash,
    bindings,
    candidateTrainingReviewAllowed: false,
    contentCopied: false,
    createdAt,
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item,
    itemPathStored: false,
    lane: value.lane,
    ownerOnly: true,
    productionReadyClaim: false,
    projection,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    reviewResolution,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ARTIFACT_REQUEST_SCHEMA_VERSION,
    sourceObservation,
    status: value.lane === 'reviewed-examples' ? 'pending-reviewed-example-canonicalization-preparation' : 'pending-answer-quality-case-enrichment-preparation',
    target: expectedTarget,
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace,
    workspaceMutationPerformed: false,
    ...laneDetails(value.lane),
  };
  if (
    !expectedTarget ||
    Object.values(bindings).some((itemValue) => !isSha256(itemValue)) ||
    bindings.admissionHash !== admission.admissionHash ||
    bindings.itemHash !== item.itemHash ||
    bindings.workspaceHash !== workspace.workspaceHash ||
    input.target !== expectedTarget ||
    input.admission.id !== admission.id ||
    input.item.id !== item.id ||
    input.projection.id !== projection.id ||
    input.reviewResolution.id !== reviewResolution.id ||
    input.workspace.id !== workspace.id ||
    Date.parse(createdAt) < Date.parse(input.requestedAt) ||
    Date.parse(input.requestedAt) < Date.parse(sourceObservation.resolvedAt) ||
    Date.parse(createdAt) >= Date.parse(sourceObservation.expiresAt) ||
    Date.parse(createdAt) >= Date.parse(sourceObservation.deleteBy) ||
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    throw new Error('Fine-tuning private collection item artifact request integrity failed.');
  }
  return expected;
}

export function buildFineTuningPrivateCollectionItemArtifactRequest(input = {}) {
  const value = content(input);
  const artifactRequestHash = hashRecord(value);
  return { ...value, id: `fine-tuning-private-collection-item-artifact-request-${artifactRequestHash}`, artifactRequestHash };
}

export function assertFineTuningPrivateCollectionItemArtifactRequestRecord(request) {
  const { id, artifactRequestHash, ...value } = request || {};
  const expected = rebuild(value);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(value) !== JSON.stringify(expected) ||
    artifactRequestHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-artifact-request-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item artifact request integrity failed.');
  }
  return request;
}

export function assertFineTuningPrivateCollectionItemArtifactRequest(request, { admission, artifactRequestInput, item, projection, reviewResolution, workspace } = {}) {
  assertFineTuningPrivateCollectionItemArtifactRequestRecord(request);
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
  const expected = buildFineTuningPrivateCollectionItemArtifactRequest({
    admission,
    artifactRequestInput,
    createdAt: request.createdAt,
    item,
    projection,
    reviewResolution,
    workspace,
  });
  if (JSON.stringify(request) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private collection item artifact request does not match the live F1.13 resolution.');
  }
  return request;
}
