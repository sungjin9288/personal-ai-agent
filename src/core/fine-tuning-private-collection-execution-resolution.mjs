import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateCollectionExecutionRequest,
  FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS,
  FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS,
} from './fine-tuning-private-collection-execution-request.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_RESOLUTION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-execution-resolution/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_DECISION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-execution-owner-decision/v1';

const BINDING_FIELDS = Object.freeze([
  'assessmentHash',
  'collectionPlanHash',
  'datasetHash',
  'datasetManifestHash',
  'evaluationManifestHash',
  'executionRequestHash',
  'policyHash',
  'privateCollectionPlanHash',
  'readinessHash',
  'requestHash',
  'resolutionHash',
  'trainSha256',
  'validationSha256',
]);
const DECISIONS = new Set(['approve', 'reject']);

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `Fine-tuning private collection execution resolution ${fieldName} must be a valid timestamp.`,
    );
  }
  return new Date(timestamp).toISOString();
}

function requireContentFreeReason(value) {
  const reason = String(value || '').trim();
  if (
    !reason ||
    reason.length > 240 ||
    /[\r\n\0]/u.test(reason) ||
    containsTrainingSecret(reason) ||
    containsRawCustomerPayload(reason)
  ) {
    throw new Error(
      'Fine-tuning private collection execution resolution reason must be content-free metadata.',
    );
  }
  return reason;
}

function requireExactKeys(value, keys, fieldName) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...keys].sort())
  ) {
    throw new Error(
      `Fine-tuning private collection execution resolution ${fieldName} fields are invalid.`,
    );
  }
}

function buildBindings(executionRequest) {
  return {
    assessmentHash: executionRequest.bindings.assessmentHash,
    collectionPlanHash: executionRequest.bindings.collectionPlanHash,
    datasetHash: executionRequest.bindings.datasetHash,
    datasetManifestHash: executionRequest.bindings.datasetManifestHash,
    evaluationManifestHash: executionRequest.bindings.evaluationManifestHash,
    executionRequestHash: executionRequest.requestHash,
    policyHash: executionRequest.bindings.policyHash,
    privateCollectionPlanHash:
      executionRequest.bindings.privateCollectionPlanHash,
    readinessHash: executionRequest.bindings.readinessHash,
    requestHash: executionRequest.bindings.requestHash,
    resolutionHash: executionRequest.bindings.resolutionHash,
    trainSha256: executionRequest.bindings.trainSha256,
    validationSha256: executionRequest.bindings.validationSha256,
  };
}

function normalizeBindings(bindings) {
  requireExactKeys(bindings, BINDING_FIELDS, 'bindings');
  if (BINDING_FIELDS.some((field) => !isSha256(bindings[field]))) {
    throw new Error(
      'Fine-tuning private collection execution resolution bindings are invalid.',
    );
  }
  return Object.fromEntries(
    BINDING_FIELDS.map((field) => [field, bindings[field]]),
  );
}

function normalizeExecutionRequestReference(reference) {
  requireExactKeys(reference, ['id', 'requestHash'], 'executionRequest');
  if (
    !isSha256(reference.requestHash) ||
    reference.id !==
      `fine-tuning-private-collection-execution-request-${reference.requestHash}`
  ) {
    throw new Error(
      'Fine-tuning private collection execution resolution request binding is invalid.',
    );
  }
  return {
    id: reference.id,
    requestHash: reference.requestHash,
  };
}

function normalizeActions(actions) {
  const expected = [...FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS];
  if (JSON.stringify(actions) !== JSON.stringify(expected)) {
    throw new Error(
      'Fine-tuning private collection execution resolution actions are invalid.',
    );
  }
  return expected;
}

function normalizeTargets(targets) {
  requireExactKeys(
    targets,
    ['answerQualityCases', 'reviewedExamples'],
    'targets',
  );
  requireExactKeys(
    targets.answerQualityCases,
    ['countsTowardReviewedExampleMinimum', 'minimumAdditionalItems'],
    'answer quality targets',
  );
  requireExactKeys(
    targets.reviewedExamples,
    [
      'minimumAdditionalItems',
      'observedTrainGap',
      'observedValidationGap',
      'requiredNewMissionScopes',
      'splitAssignmentAuthorized',
      'splitMustBeRebuiltAndRemeasured',
    ],
    'reviewed example targets',
  );
  const expected = {
    answerQualityCases: {
      countsTowardReviewedExampleMinimum: false,
      minimumAdditionalItems: 8,
    },
    reviewedExamples: {
      minimumAdditionalItems: 16,
      observedTrainGap: 13,
      observedValidationGap: 3,
      requiredNewMissionScopes: 6,
      splitAssignmentAuthorized: false,
      splitMustBeRebuiltAndRemeasured: true,
    },
  };
  if (JSON.stringify(targets) !== JSON.stringify(expected)) {
    throw new Error(
      'Fine-tuning private collection execution resolution targets are invalid.',
    );
  }
  return expected;
}

function normalizeReview(review, expected, resolvedAt, { stored = false } = {}) {
  requireExactKeys(
    review,
    stored
      ? [
          'decision',
          'decidedAt',
          'evidenceSha256',
          'id',
          'ownerRole',
          'reasonHash',
        ]
      : [
          'decision',
          'decidedAt',
          'evidenceSha256',
          'id',
          'ownerRole',
          'reason',
        ],
    'review',
  );
  if (review.id !== expected.id || review.ownerRole !== expected.ownerRole) {
    throw new Error(
      'Fine-tuning private collection execution resolution reviews must match the request order.',
    );
  }
  if (!DECISIONS.has(review.decision) || !isSha256(review.evidenceSha256)) {
    throw new Error(
      'Fine-tuning private collection execution resolution review is invalid.',
    );
  }
  const decidedAt = requireTimestamp(review.decidedAt, 'review.decidedAt');
  if (Date.parse(decidedAt) > Date.parse(resolvedAt)) {
    throw new Error(
      'Fine-tuning private collection execution resolution review cannot be after resolvedAt.',
    );
  }
  if (stored) {
    if (!isSha256(review.reasonHash)) {
      throw new Error(
        'Fine-tuning private collection execution resolution review reasonHash is invalid.',
      );
    }
    return {
      decision: review.decision,
      decidedAt,
      evidenceSha256: review.evidenceSha256,
      id: review.id,
      ownerRole: review.ownerRole,
      reasonHash: review.reasonHash,
    };
  }
  return {
    decision: review.decision,
    decidedAt,
    evidenceSha256: review.evidenceSha256,
    id: review.id,
    ownerRole: review.ownerRole,
    reasonHash: hashValue(requireContentFreeReason(review.reason)),
  };
}

function normalizeOrderedReviews(reviews, resolvedAt, options) {
  if (
    !Array.isArray(reviews) ||
    reviews.length !==
      FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS.length
  ) {
    throw new Error(
      'Fine-tuning private collection execution resolution requires every owner review exactly once.',
    );
  }
  return reviews.map((review, index) =>
    normalizeReview(
      review,
      FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS[index],
      resolvedAt,
      options,
    ));
}

function normalizeReviews(reviews, executionRequest, resolvedAt, options) {
  const normalized = normalizeOrderedReviews(reviews, resolvedAt, options);
  for (const review of normalized) {
    if (
      Date.parse(review.decidedAt) < Date.parse(executionRequest.requestedAt) ||
      Date.parse(review.decidedAt) >= Date.parse(executionRequest.expiresAt)
    ) {
      throw new Error(
        'Fine-tuning private collection execution resolution review is outside the active request window.',
      );
    }
  }
  return normalized;
}

function assembleContent({
  bindings,
  executionRequest,
  expiresAt,
  requestedActions,
  resolvedAt,
  reviews,
  targets,
}) {
  const approved = reviews.every((review) => review.decision === 'approve');
  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    answerQualityCaseCollectionAuthorized: approved,
    bindings,
    candidateTrainingReviewAllowed: false,
    collectionExecutionApprovalRequestCreated: true,
    collectionExecutionApprovalRequired: true,
    collectionExecutionApprovalResolved: true,
    collectionExecutionAuthorized: approved,
    dataHandlingEvidenceIndependentlyVerified: false,
    dataHandlingEvidenceRecorded: false,
    dataHandlingEvidenceReferencesRecorded: true,
    executionRequest,
    expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    operatorAttestationBound: true,
    operatorAttestationRecorded: true,
    ownerDecisionRecorded: false,
    ownerIdentityVerified: false,
    privateCollectionPlanAllowed: true,
    privateCollectionWorkspaceCreationAuthorized: approved,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    requestedActions,
    resolvedAt,
    reviewedExampleCollectionAuthorized: approved,
    reviews,
    schemaVersion:
      FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_RESOLUTION_SCHEMA_VERSION,
    sourceDataIncluded: false,
    status: approved
      ? 'approved-for-bounded-private-collection-execution'
      : 'rejected',
    syntheticTrainingRecordsCreated: false,
    targets,
    trainingAuthorized: false,
  };
}

function buildContent({
  assessment,
  collectionPlan,
  executionRequest,
  intakeRequest,
  intakeResolution,
  privateCollectionPlan,
  resolvedAt,
  reviews,
  stored = false,
}) {
  const normalizedResolvedAt = requireTimestamp(resolvedAt, 'resolvedAt');
  assertFineTuningPrivateCollectionExecutionRequest(executionRequest, {
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    now: normalizedResolvedAt,
    privateCollectionPlan,
  });
  const normalizedReviews = normalizeReviews(
    reviews,
    executionRequest,
    normalizedResolvedAt,
    { stored },
  );
  const expiresAt = requireTimestamp(executionRequest.expiresAt, 'expiresAt');
  if (Date.parse(normalizedResolvedAt) >= Date.parse(expiresAt)) {
    throw new Error(
      'Fine-tuning private collection execution resolution expired.',
    );
  }
  return assembleContent({
    bindings: normalizeBindings(buildBindings(executionRequest)),
    executionRequest: normalizeExecutionRequestReference({
      id: executionRequest.id,
      requestHash: executionRequest.requestHash,
    }),
    expiresAt,
    requestedActions: normalizeActions(executionRequest.requestedActions),
    resolvedAt: normalizedResolvedAt,
    reviews: normalizedReviews,
    targets: normalizeTargets(executionRequest.targets),
  });
}

function rebuildStoredContent(content) {
  const resolvedAt = requireTimestamp(content?.resolvedAt, 'resolvedAt');
  const expiresAt = requireTimestamp(content?.expiresAt, 'expiresAt');
  if (Date.parse(resolvedAt) >= Date.parse(expiresAt)) {
    throw new Error(
      'Fine-tuning private collection execution resolution must be created before expiry.',
    );
  }
  const bindings = normalizeBindings(content?.bindings);
  const executionRequest = normalizeExecutionRequestReference(
    content?.executionRequest,
  );
  if (bindings.executionRequestHash !== executionRequest.requestHash) {
    throw new Error(
      'Fine-tuning private collection execution resolution references are inconsistent.',
    );
  }
  return assembleContent({
    bindings,
    executionRequest,
    expiresAt,
    requestedActions: normalizeActions(content?.requestedActions),
    resolvedAt,
    reviews: normalizeOrderedReviews(content?.reviews, resolvedAt, {
      stored: true,
    }),
    targets: normalizeTargets(content?.targets),
  });
}

export function resolveFineTuningPrivateCollectionExecutionRequest(
  input = {},
) {
  const content = buildContent(input);
  const resolutionHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-execution-resolution-${resolutionHash}`,
    resolutionHash,
  };
}

export function assertFineTuningPrivateCollectionExecutionResolutionRecord(
  resolution,
) {
  const { id, resolutionHash, ...content } = resolution || {};
  const expected = rebuildStoredContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    resolutionHash !== expectedHash ||
    id !==
      `fine-tuning-private-collection-execution-resolution-${expectedHash}`
  ) {
    throw new Error(
      'Fine-tuning private collection execution resolution integrity failed.',
    );
  }
  return resolution;
}

export function assertFineTuningPrivateCollectionExecutionResolution(
  resolution,
  {
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    now,
    privateCollectionPlan,
  } = {},
) {
  assertFineTuningPrivateCollectionExecutionResolutionRecord(resolution);
  if (
    !executionRequest ||
    resolution.executionRequest?.id !== executionRequest.id ||
    resolution.executionRequest?.requestHash !== executionRequest.requestHash
  ) {
    throw new Error(
      'Fine-tuning private collection execution resolution must bind the exact request.',
    );
  }
  const expected = buildContent({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: resolution.resolvedAt,
    reviews: resolution.reviews,
    stored: true,
  });
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(resolution) !== JSON.stringify({
      ...expected,
      id: `fine-tuning-private-collection-execution-resolution-${expectedHash}`,
      resolutionHash: expectedHash,
    })
  ) {
    throw new Error(
      'Fine-tuning private collection execution resolution does not match the current F1 chain.',
    );
  }
  if (now !== undefined) {
    const normalizedNow = requireTimestamp(now, 'now');
    if (Date.parse(normalizedNow) < Date.parse(resolution.resolvedAt)) {
      throw new Error(
        'Fine-tuning private collection execution resolution is not active yet.',
      );
    }
    assertFineTuningPrivateCollectionExecutionRequest(executionRequest, {
      assessment,
      collectionPlan,
      intakeRequest,
      intakeResolution,
      now: normalizedNow,
      privateCollectionPlan,
    });
  }
  return resolution;
}

export function assertApprovedFineTuningPrivateCollectionExecutionResolution(
  resolution,
  sources = {},
) {
  if (sources.now === undefined) {
    throw new Error(
      'Fine-tuning private collection execution approval requires an explicit current time.',
    );
  }
  requireTimestamp(sources.now, 'now');
  assertFineTuningPrivateCollectionExecutionResolution(resolution, sources);
  if (
    resolution.status !==
      'approved-for-bounded-private-collection-execution' ||
    resolution.privateCollectionWorkspaceCreationAuthorized !== true ||
    resolution.reviewedExampleCollectionAuthorized !== true ||
    resolution.answerQualityCaseCollectionAuthorized !== true ||
    resolution.collectionExecutionAuthorized !== true
  ) {
    throw new Error(
      'Fine-tuning private collection execution resolution is not approved for bounded collection execution.',
    );
  }
  return resolution;
}
