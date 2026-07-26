import { createHash } from 'node:crypto';

import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_PROJECTION_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_PROJECTION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-review-projection/v1';

const PROJECTIONS = Object.freeze({
  'answer-quality-cases': 'answer-quality-case-enrichment-review',
  'reviewed-examples': 'reviewed-example-candidate-review',
});

const Q1_REQUIRED_FIELDS = Object.freeze([
  'answer',
  'expectedSourceKeys',
  'forbiddenAnswerTerms',
  'forbiddenSourceKeys',
  'id',
  'requiredAnswerTerms',
  'retrievalInput',
  'reviewerVerdict',
]);

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

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
    throw new Error(`Fine-tuning private collection item review projection ${fieldName} fields are invalid.`);
  }
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Fine-tuning private collection item review projection ${fieldName} must be a valid timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

function normalizeReference(value, fieldName, prefix, hashField) {
  requireExactKeys(value, ['id', hashField], fieldName);
  if (!isSha256(value[hashField]) || value.id !== `${prefix}${value[hashField]}`) {
    throw new Error(`Fine-tuning private collection item review projection ${fieldName} is invalid.`);
  }
  return { id: value.id, [hashField]: value[hashField] };
}

function normalizeRequest(request) {
  requireExactKeys(
    request,
    [
      'admission',
      'item',
      'requestedAt',
      'requestedByRole',
      'schemaVersion',
      'target',
      'workspace',
    ],
    'request',
  );
  if (
    request.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_PROJECTION_REQUEST_SCHEMA_VERSION ||
    request.requestedByRole !== 'local-operator-role' ||
    !Object.values(PROJECTIONS).includes(request.target)
  ) {
    throw new Error('Fine-tuning private collection item review projection request is invalid.');
  }
  return {
    admission: normalizeReference(
      request.admission,
      'request admission',
      'fine-tuning-private-collection-item-admission-',
      'admissionHash',
    ),
    item: normalizeReference(
      request.item,
      'request item',
      'fine-tuning-private-collection-item-',
      'itemHash',
    ),
    requestedAt: requireTimestamp(request.requestedAt, 'request requestedAt'),
    requestedByRole: 'local-operator-role',
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_PROJECTION_REQUEST_SCHEMA_VERSION,
    target: request.target,
    workspace: normalizeReference(
      request.workspace,
      'request workspace',
      'fine-tuning-private-collection-workspace-',
      'workspaceHash',
    ),
  };
}

export function assertFineTuningPrivateCollectionItemReviewProjectionRequest(request) {
  return normalizeRequest(request);
}

function buildContent({ admission, item, projectedAt, request, workspace }) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  const normalizedRequest = normalizeRequest(request);
  const normalizedProjectedAt = requireTimestamp(projectedAt, 'projectedAt');
  const projectionKind = PROJECTIONS[item.lane];
  const requestHash = hashRecord(normalizedRequest);

  if (
    !projectionKind ||
    normalizedRequest.target !== projectionKind ||
    normalizedRequest.admission.id !== admission.id ||
    normalizedRequest.admission.admissionHash !== admission.admissionHash ||
    normalizedRequest.item.id !== item.id ||
    normalizedRequest.item.itemHash !== item.itemHash ||
    normalizedRequest.workspace.id !== workspace.id ||
    normalizedRequest.workspace.workspaceHash !== workspace.workspaceHash ||
    item.admission.id !== admission.id ||
    item.admission.admissionHash !== admission.admissionHash ||
    item.workspace.id !== workspace.id ||
    item.workspace.workspaceHash !== workspace.workspaceHash ||
    item.lane !== admission.envelope.lane ||
    item.retention.withdrawalReferenceSha256 !== admission.envelope.retention.withdrawalReferenceSha256 ||
    Date.parse(normalizedRequest.requestedAt) < Date.parse(item.storedAt) ||
    Date.parse(normalizedProjectedAt) < Date.parse(normalizedRequest.requestedAt) ||
    Date.parse(normalizedProjectedAt) >= Date.parse(item.expiresAt) ||
    Date.parse(normalizedProjectedAt) >= Date.parse(item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private collection item review projection must bind one live exact F1.10 item.');
  }

  const bindings = {
    ...item.bindings,
    itemHash: item.itemHash,
    projectionRequestHash: requestHash,
    withdrawalReferenceSha256: item.retention.withdrawalReferenceSha256,
  };
  if (Object.values(bindings).some((value) => !isSha256(value))) {
    throw new Error('Fine-tuning private collection item review projection bindings are invalid.');
  }

  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission: normalizedRequest.admission,
    approvedTrainingRecordCreated: false,
    answerQualityCaseCreated: false,
    bindings,
    candidateTrainingReviewAllowed: false,
    contentCopied: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item: normalizedRequest.item,
    lane: item.lane,
    lifecycle: {
      status: 'stored-at-projection-time',
      terminal: false,
    },
    ownerOnly: true,
    itemPathStored: false,
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    projectedAt: normalizedProjectedAt,
    projectionKind,
    projectionRequest: {
      requestedAt: normalizedRequest.requestedAt,
      requestedByRole: normalizedRequest.requestedByRole,
      schemaVersion: normalizedRequest.schemaVersion,
      target: normalizedRequest.target,
    },
    projectionRequestHash: requestHash,
    review: {
      decisionRecorded: false,
      evidenceRecorded: false,
      ownerRole: 'quality-reviewer',
      status: 'pending-owner-review',
    },
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_PROJECTION_SCHEMA_VERSION,
    sourceObservation: {
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      storedAt: item.storedAt,
    },
    status: 'pending-owner-review',
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace: normalizedRequest.workspace,
    workspaceMutationPerformed: false,
    ...(item.lane === 'reviewed-examples'
      ? {
        reviewedExample: {
          canonicalGateId: 'approved-training-record-v1',
          eligibilityEvaluated: false,
          gateRequired: true,
        },
      }
      : {
        answerQualityCase: {
          contractSatisfied: false,
          enrichmentRequired: true,
          missingQ1Fields: [...Q1_REQUIRED_FIELDS],
        },
      }),
  };
}

function rebuildContent(content) {
  requireExactKeys(
    content,
    [
      'actualModelTrainingExecuted',
      'actualUserDataCollected',
      'admission',
      'approvedTrainingRecordCreated',
      'answerQualityCaseCreated',
      'bindings',
      'candidateTrainingReviewAllowed',
      'contentCopied',
      'externalProviderCalls',
      'externalSubmissionAuthorized',
      'fineTuningExecutionAuthorized',
      'item',
      'lane',
      'lifecycle',
      'ownerOnly',
      'itemPathStored',
      'productionReadyClaim',
      'providerSubmissionAuthorized',
      'providerSubmissionCreated',
      'projectedAt',
      'projectionKind',
      'projectionRequest',
      'projectionRequestHash',
      'review',
      'schemaVersion',
      'sourceObservation',
      'status',
      'trainingAuthorized',
      'trainingSubmissionCreated',
      'workspace',
      'workspaceMutationPerformed',
      content.lane === 'reviewed-examples' ? 'reviewedExample' : 'answerQualityCase',
    ],
    'record',
  );
  const admission = normalizeReference(
    content.admission,
    'record admission',
    'fine-tuning-private-collection-item-admission-',
    'admissionHash',
  );
  const item = normalizeReference(
    content.item,
    'record item',
    'fine-tuning-private-collection-item-',
    'itemHash',
  );
  const workspace = normalizeReference(
    content.workspace,
    'record workspace',
    'fine-tuning-private-collection-workspace-',
    'workspaceHash',
  );
  const request = normalizeRequest({
    admission,
    item,
    requestedAt: content.projectionRequest?.requestedAt,
    requestedByRole: content.projectionRequest?.requestedByRole,
    schemaVersion: content.projectionRequest?.schemaVersion,
    target: content.projectionRequest?.target,
    workspace,
  });
  requireExactKeys(
    content.bindings,
    [...ITEM_BINDING_FIELDS, 'itemHash', 'projectionRequestHash', 'withdrawalReferenceSha256'],
    'record bindings',
  );
  if (
    Object.values(content.bindings).some((value) => !isSha256(value)) ||
    content.bindings.admissionHash !== admission.admissionHash ||
    content.bindings.itemHash !== item.itemHash ||
    content.bindings.projectionRequestHash !== hashRecord(request) ||
    content.bindings.projectionRequestHash !== content.projectionRequestHash ||
    content.bindings.workspaceHash !== workspace.workspaceHash
  ) {
    throw new Error('Fine-tuning private collection item review projection bindings are invalid.');
  }
  requireExactKeys(content.sourceObservation, ['deleteBy', 'expiresAt', 'storedAt'], 'source observation');
  const sourceObservation = {
    deleteBy: requireTimestamp(content.sourceObservation.deleteBy, 'source observation deleteBy'),
    expiresAt: requireTimestamp(content.sourceObservation.expiresAt, 'source observation expiresAt'),
    storedAt: requireTimestamp(content.sourceObservation.storedAt, 'source observation storedAt'),
  };
  const projectedAt = requireTimestamp(content.projectedAt, 'projectedAt');
  const expectedKind = PROJECTIONS[content.lane];
  if (
    !expectedKind ||
    content.projectionKind !== expectedKind ||
    request.target !== expectedKind ||
    Date.parse(request.requestedAt) < Date.parse(sourceObservation.storedAt) ||
    Date.parse(projectedAt) < Date.parse(request.requestedAt) ||
    Date.parse(projectedAt) >= Date.parse(sourceObservation.expiresAt) ||
    Date.parse(projectedAt) >= Date.parse(sourceObservation.deleteBy)
  ) {
    throw new Error('Fine-tuning private collection item review projection timing or lane is invalid.');
  }
  requireExactKeys(content.lifecycle, ['status', 'terminal'], 'lifecycle');
  requireExactKeys(content.review, ['decisionRecorded', 'evidenceRecorded', 'ownerRole', 'status'], 'review');
  const laneSpecific = content.lane === 'reviewed-examples'
    ? {
      reviewedExample: {
        canonicalGateId: content.reviewedExample?.canonicalGateId,
        eligibilityEvaluated: content.reviewedExample?.eligibilityEvaluated,
        gateRequired: content.reviewedExample?.gateRequired,
      },
    }
    : {
      answerQualityCase: {
        contractSatisfied: content.answerQualityCase?.contractSatisfied,
        enrichmentRequired: content.answerQualityCase?.enrichmentRequired,
        missingQ1Fields: content.answerQualityCase?.missingQ1Fields,
      },
    };
  if (
    JSON.stringify(content.lifecycle) !== JSON.stringify({ status: 'stored-at-projection-time', terminal: false }) ||
    JSON.stringify(content.review) !== JSON.stringify({
      decisionRecorded: false,
      evidenceRecorded: false,
      ownerRole: 'quality-reviewer',
      status: 'pending-owner-review',
    }) ||
    (content.lane === 'reviewed-examples' && JSON.stringify(laneSpecific.reviewedExample) !== JSON.stringify({
      canonicalGateId: 'approved-training-record-v1',
      eligibilityEvaluated: false,
      gateRequired: true,
    })) ||
    (content.lane === 'answer-quality-cases' && JSON.stringify(laneSpecific.answerQualityCase) !== JSON.stringify({
      contractSatisfied: false,
      enrichmentRequired: true,
      missingQ1Fields: [...Q1_REQUIRED_FIELDS],
    }))
  ) {
    throw new Error('Fine-tuning private collection item review projection review state is invalid.');
  }
  const expected = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission,
    approvedTrainingRecordCreated: false,
    answerQualityCaseCreated: false,
    bindings: Object.fromEntries([
      ...ITEM_BINDING_FIELDS.map((field) => [field, content.bindings[field]]),
      ['itemHash', item.itemHash],
      ['projectionRequestHash', content.projectionRequestHash],
      ['withdrawalReferenceSha256', content.bindings.withdrawalReferenceSha256],
    ]),
    candidateTrainingReviewAllowed: false,
    contentCopied: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item,
    lane: content.lane,
    lifecycle: { status: 'stored-at-projection-time', terminal: false },
    ownerOnly: true,
    itemPathStored: false,
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    projectedAt,
    projectionKind: expectedKind,
    projectionRequest: {
      requestedAt: request.requestedAt,
      requestedByRole: request.requestedByRole,
      schemaVersion: request.schemaVersion,
      target: request.target,
    },
    projectionRequestHash: content.projectionRequestHash,
    review: {
      decisionRecorded: false,
      evidenceRecorded: false,
      ownerRole: 'quality-reviewer',
      status: 'pending-owner-review',
    },
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_REVIEW_PROJECTION_SCHEMA_VERSION,
    sourceObservation,
    status: 'pending-owner-review',
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace,
    workspaceMutationPerformed: false,
    ...laneSpecific,
  };
  if (
    content.actualModelTrainingExecuted !== false ||
    content.actualUserDataCollected !== false ||
    content.approvedTrainingRecordCreated !== false ||
    content.answerQualityCaseCreated !== false ||
    content.candidateTrainingReviewAllowed !== false ||
    content.contentCopied !== false ||
    content.externalProviderCalls !== 'none' ||
    content.externalSubmissionAuthorized !== false ||
    content.fineTuningExecutionAuthorized !== false ||
    content.ownerOnly !== true ||
    content.itemPathStored !== false ||
    content.productionReadyClaim !== false ||
    content.providerSubmissionAuthorized !== false ||
    content.providerSubmissionCreated !== false ||
    content.status !== 'pending-owner-review' ||
    content.trainingAuthorized !== false ||
    content.trainingSubmissionCreated !== false ||
    content.workspaceMutationPerformed !== false ||
    JSON.stringify(content) !== JSON.stringify(expected)
  ) {
    throw new Error('Fine-tuning private collection item review projection integrity failed.');
  }
  return expected;
}

export function buildFineTuningPrivateCollectionItemReviewProjection(input = {}) {
  const content = buildContent(input);
  const projectionHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-item-review-projection-${projectionHash}`,
    projectionHash,
  };
}

export function assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection) {
  const { id, projectionHash, ...content } = projection || {};
  const expected = rebuildContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    projectionHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-review-projection-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item review projection integrity failed.');
  }
  return projection;
}

export function assertFineTuningPrivateCollectionItemReviewProjection(
  projection,
  { admission, item, request, workspace } = {},
) {
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
  const expected = buildFineTuningPrivateCollectionItemReviewProjection({
    admission,
    item,
    projectedAt: projection.projectedAt,
    request,
    workspace,
  });
  if (JSON.stringify(projection) !== JSON.stringify(expected)) {
    throw new Error(
      'Fine-tuning private collection item review projection does not match the live F1.10 item.',
    );
  }
  return projection;
}
