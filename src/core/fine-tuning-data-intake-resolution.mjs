import { createHash } from 'node:crypto';

import {
  assertFineTuningDataIntakeRequest,
  FINE_TUNING_DATA_INTAKE_REQUIRED_REVIEWS,
} from './fine-tuning-data-intake-request.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const FINE_TUNING_DATA_INTAKE_RESOLUTION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-data-intake-resolution/v1';
export const FINE_TUNING_DATA_INTAKE_OWNER_DECISION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-data-intake-owner-decision/v1';

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
      `Fine-tuning data intake resolution ${fieldName} must be a valid timestamp.`,
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
      'Fine-tuning data intake resolution reason must be content-free metadata.',
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
      `Fine-tuning data intake resolution ${fieldName} fields are invalid.`,
    );
  }
}

function normalizeReview(review, expected, resolvedAt, { stored = false } = {}) {
  requireExactKeys(
    review,
    stored
      ? ['decision', 'decidedAt', 'evidenceSha256', 'id', 'ownerRole', 'reasonHash']
      : ['decision', 'decidedAt', 'evidenceSha256', 'id', 'ownerRole', 'reason'],
    'review',
  );
  if (review.id !== expected.id || review.ownerRole !== expected.ownerRole) {
    throw new Error(
      'Fine-tuning data intake resolution reviews must match the request order.',
    );
  }
  if (!DECISIONS.has(review.decision) || !isSha256(review.evidenceSha256)) {
    throw new Error('Fine-tuning data intake resolution review is invalid.');
  }
  const decidedAt = requireTimestamp(review.decidedAt, 'review.decidedAt');
  if (Date.parse(decidedAt) > Date.parse(resolvedAt)) {
    throw new Error(
      'Fine-tuning data intake resolution review cannot be after resolvedAt.',
    );
  }
  if (stored) {
    if (!isSha256(review.reasonHash)) {
      throw new Error(
        'Fine-tuning data intake resolution review reasonHash is invalid.',
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

function normalizeOrderedReviews(
  reviews,
  expectedReviews,
  resolvedAt,
  options,
) {
  if (
    !Array.isArray(reviews) ||
    reviews.length !== expectedReviews.length
  ) {
    throw new Error(
      'Fine-tuning data intake resolution requires every owner review exactly once.',
    );
  }
  const normalized = reviews.map((review, index) =>
    normalizeReview(
      review,
      expectedReviews[index],
      resolvedAt,
      options,
    ));
  return normalized;
}

function normalizeReviews(reviews, request, resolvedAt, options) {
  const normalized = normalizeOrderedReviews(
    reviews,
    request.requiredReviews,
    resolvedAt,
    options,
  );
  for (const review of normalized) {
    if (
      Date.parse(review.decidedAt) < Date.parse(request.requestedAt) ||
      Date.parse(review.decidedAt) >= Date.parse(request.expiresAt)
    ) {
      throw new Error(
        'Fine-tuning data intake resolution review is outside the active request window.',
      );
    }
  }
  return normalized;
}

function normalizeRequestBinding(request) {
  requireExactKeys(request, ['id', 'requestHash'], 'request');
  if (
    !isSha256(request.requestHash) ||
    request.id !==
      `fine-tuning-data-intake-request-${request.requestHash}`
  ) {
    throw new Error(
      'Fine-tuning data intake resolution request binding is invalid.',
    );
  }
  return {
    id: request.id,
    requestHash: request.requestHash,
  };
}

function assembleContent({ request, resolvedAt, reviews }) {
  const approved = reviews.every(
    (review) => review.decision === 'approve',
  );
  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    answerQualityCaseCollectionAuthorized: false,
    candidateTrainingReviewAllowed: false,
    collectionExecutionAuthorized: false,
    dataHandlingEvidenceIndependentlyVerified: false,
    dataHandlingEvidenceRecorded: false,
    dataHandlingEvidenceReferencesRecorded: true,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    operatorAttestationRecorded: true,
    ownerDecisionRecorded: false,
    ownerIdentityVerified: false,
    privateCollectionPlanAllowed: approved,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    request,
    resolvedAt,
    reviewedExampleCollectionAuthorized: false,
    reviews,
    schemaVersion: FINE_TUNING_DATA_INTAKE_RESOLUTION_SCHEMA_VERSION,
    sourceDataIncluded: false,
    status: approved
      ? 'approved-for-private-collection-planning'
      : 'rejected',
    syntheticTrainingRecordsCreated: false,
    trainingAuthorized: false,
  };
}

function buildContent({
  assessment,
  collectionPlan,
  request,
  reviews,
  resolvedAt,
  stored = false,
}) {
  const normalizedResolvedAt = requireTimestamp(resolvedAt, 'resolvedAt');
  assertFineTuningDataIntakeRequest(request, {
    assessment,
    collectionPlan,
    now: normalizedResolvedAt,
  });
  const normalizedReviews = normalizeReviews(
    reviews,
    request,
    normalizedResolvedAt,
    { stored },
  );
  return assembleContent({
    request: normalizeRequestBinding({
      id: request.id,
      requestHash: request.requestHash,
    }),
    resolvedAt: normalizedResolvedAt,
    reviews: normalizedReviews,
  });
}

function rebuildStoredContent(content) {
  const resolvedAt = requireTimestamp(content?.resolvedAt, 'resolvedAt');
  const request = normalizeRequestBinding(content?.request);
  const reviews = normalizeOrderedReviews(
    content?.reviews,
    FINE_TUNING_DATA_INTAKE_REQUIRED_REVIEWS,
    resolvedAt,
    { stored: true },
  );
  return assembleContent({ request, resolvedAt, reviews });
}

export function resolveFineTuningDataIntakeRequest({
  assessment,
  collectionPlan,
  request,
  resolvedAt,
  reviews,
} = {}) {
  const content = buildContent({
    assessment,
    collectionPlan,
    request,
    resolvedAt,
    reviews,
  });
  const resolutionHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-data-intake-resolution-${resolutionHash}`,
    resolutionHash,
  };
}

export function assertFineTuningDataIntakeResolution(
  resolution,
  { assessment, collectionPlan, now, request } = {},
) {
  assertFineTuningDataIntakeResolutionRecord(resolution);
  const { id, resolutionHash, ...content } = resolution || {};
  if (
    !request ||
    content.request?.id !== request.id ||
    content.request?.requestHash !== request.requestHash
  ) {
    throw new Error(
      'Fine-tuning data intake resolution must bind the exact request.',
    );
  }
  const expected = buildContent({
    assessment,
    collectionPlan,
    request,
    resolvedAt: content.resolvedAt,
    reviews: content.reviews,
    stored: true,
  });
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    resolutionHash !== expectedHash ||
    id !== `fine-tuning-data-intake-resolution-${expectedHash}`
  ) {
    throw new Error('Fine-tuning data intake resolution integrity failed.');
  }
  if (now !== undefined) {
    assertFineTuningDataIntakeRequest(request, { assessment, collectionPlan, now });
  }
  return resolution;
}

export function assertFineTuningDataIntakeResolutionRecord(resolution) {
  const { id, resolutionHash, ...content } = resolution || {};
  const expected = rebuildStoredContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    resolutionHash !== expectedHash ||
    id !== `fine-tuning-data-intake-resolution-${expectedHash}`
  ) {
    throw new Error(
      'Fine-tuning data intake resolution record integrity failed.',
    );
  }
  return resolution;
}

export function assertApprovedFineTuningDataIntakeResolution(
  resolution,
  sources = {},
) {
  if (sources.now === undefined) {
    throw new Error(
      'Fine-tuning data intake approval requires an explicit current time.',
    );
  }
  requireTimestamp(sources.now, 'now');
  assertFineTuningDataIntakeResolution(resolution, sources);
  if (
    resolution.status !== 'approved-for-private-collection-planning' ||
    resolution.privateCollectionPlanAllowed !== true
  ) {
    throw new Error(
      'Fine-tuning data intake resolution is not approved for private collection planning.',
    );
  }
  return resolution;
}
