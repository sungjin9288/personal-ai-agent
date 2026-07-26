import { createHash } from 'node:crypto';

import {
  assertFineTuningDataCollectionPlan,
} from './fine-tuning-data-collection-plan.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const FINE_TUNING_DATA_INTAKE_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-data-intake-request/v1';

const MAX_REQUEST_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

export const FINE_TUNING_DATA_INTAKE_OWNER_ROLES = Object.freeze([
  'collection-approval-owner',
  'data-steward',
  'privacy-reviewer',
  'quality-reviewer',
  'retention-deletion-owner',
]);

export const FINE_TUNING_DATA_INTAKE_REQUIRED_REVIEWS = Object.freeze([
  {
    id: 'private-owner-only-intake',
    ownerRole: 'collection-approval-owner',
  },
  {
    id: 'source-lineage-and-usage-basis',
    ownerRole: 'data-steward',
  },
  {
    id: 'consent-purpose-and-privacy-boundary',
    ownerRole: 'privacy-reviewer',
  },
  {
    id: 'redaction-and-approved-training-record-gate',
    ownerRole: 'quality-reviewer',
  },
  {
    id: 'retention-and-deletion-evidence',
    ownerRole: 'retention-deletion-owner',
  },
].map((review) => Object.freeze(review)));

const REQUESTED_ACTIONS = Object.freeze([
  'record-private-owner-decision-and-data-handling-evidence',
  'collect-distinct-reviewed-mission-examples',
  'expand-answer-quality-baseline',
  'rebuild-readiness-and-reassess',
]);

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `Fine-tuning data intake ${fieldName} must be a valid timestamp.`,
    );
  }
  return new Date(timestamp).toISOString();
}

function requireRequesterRole(value) {
  const requestedBy = String(value || '').trim();
  if (
    requestedBy !== 'local-operator-role' ||
    containsTrainingSecret(requestedBy) ||
    containsRawCustomerPayload(requestedBy)
  ) {
    throw new Error(
      'Fine-tuning data intake requestedBy must use the fixed content-free local-operator-role.',
    );
  }
  return requestedBy;
}

function assertRequestablePlan(collectionPlan, assessment) {
  assertFineTuningDataCollectionPlan(collectionPlan, { assessment });

  if (collectionPlan.governanceRemediationRequired) {
    throw new Error(
      'Fine-tuning data intake request blocked: accepted-risk remediation required.',
    );
  }

  if (
    collectionPlan.status !== 'reviewed-data-collection-required' ||
    collectionPlan.decision !== 'collect-more-reviewed-data' ||
    collectionPlan.dataCollectionRequired !== true
  ) {
    throw new Error(
      'Fine-tuning data intake request blocked: reviewed data collection is not required.',
    );
  }

  return collectionPlan;
}

function buildBindings(collectionPlan) {
  return {
    assessmentHash: collectionPlan.bindings.assessmentHash,
    collectionPlanHash: collectionPlan.planHash,
    collectionPlanId: collectionPlan.id,
    datasetHash: collectionPlan.bindings.datasetHash,
    datasetManifestHash: collectionPlan.bindings.datasetManifestHash,
    evaluationManifestHash:
      collectionPlan.bindings.evaluationManifestHash,
    policyHash: collectionPlan.bindings.policyHash,
    readinessHash: collectionPlan.bindings.readinessHash,
    trainSha256: collectionPlan.bindings.trainSha256,
    validationSha256: collectionPlan.bindings.validationSha256,
  };
}

function buildTargets(collectionPlan) {
  return {
    answerQualityCases: {
      countsTowardReviewedExampleMinimum: false,
      minimumAdditionalItems:
        collectionPlan.gaps.answerQualityCases.remaining,
    },
    reviewedExamples: {
      minimumAdditionalItems:
        collectionPlan.gaps.reviewedExamples
          .minimumAdditionalReviewedExamples,
      observedTrainGap:
        collectionPlan.gaps.reviewedExamples.trainExamples.remaining,
      observedValidationGap:
        collectionPlan.gaps.reviewedExamples.validationExamples.remaining,
      requiredNewMissionScopes:
        collectionPlan.gaps.missionScopes.remaining,
      splitAssignmentAuthorized: false,
      splitMustBeRebuiltAndRemeasured: true,
    },
  };
}

function buildRequestContent({
  assessment,
  collectionPlan,
  expiresAt,
  requestedAt,
  requestedBy,
}) {
  assertRequestablePlan(collectionPlan, assessment);
  const normalizedRequestedAt = requireTimestamp(
    requestedAt,
    'requestedAt',
  );
  const normalizedExpiresAt = requireTimestamp(expiresAt, 'expiresAt');
  const lifetime =
    Date.parse(normalizedExpiresAt) - Date.parse(normalizedRequestedAt);
  if (lifetime <= 0 || lifetime > MAX_REQUEST_LIFETIME_MS) {
    throw new Error(
      'Fine-tuning data intake request lifetime must be within 7 days.',
    );
  }

  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    answerQualityCaseCollectionAuthorized: false,
    bindings: buildBindings(collectionPlan),
    candidateTrainingReviewAllowed: false,
    collectionExecutionAuthorized: false,
    dataHandlingEvidenceRecorded: false,
    expiresAt: normalizedExpiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    ownerDecisionRecorded: false,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    requestedActions: [...REQUESTED_ACTIONS],
    requestedAt: normalizedRequestedAt,
    requestedBy: requireRequesterRole(requestedBy),
    requiredOwnerRoles: [...FINE_TUNING_DATA_INTAKE_OWNER_ROLES],
    requiredReviews: FINE_TUNING_DATA_INTAKE_REQUIRED_REVIEWS.map((review) => ({
      ...review,
      status: 'pending-owner-review',
    })),
    reviewedExampleCollectionAuthorized: false,
    schemaVersion: FINE_TUNING_DATA_INTAKE_REQUEST_SCHEMA_VERSION,
    sourceDataIncluded: false,
    status: 'pending-owner-review',
    syntheticTrainingRecordsCreated: false,
    targets: buildTargets(collectionPlan),
    trainingAuthorized: false,
  };
}

export function buildFineTuningDataIntakeRequest(input = {}) {
  const content = buildRequestContent(input);
  const requestHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-data-intake-request-${requestHash}`,
    requestHash,
  };
}

export function assertFineTuningDataIntakeRequest(
  request,
  { assessment, collectionPlan, now } = {},
) {
  const { id, requestHash, ...content } = request || {};
  const expected = buildRequestContent({
    assessment,
    collectionPlan,
    expiresAt: content.expiresAt,
    requestedAt: content.requestedAt,
    requestedBy: content.requestedBy,
  });
  const expectedHash = hashRecord(expected);

  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    requestHash !== expectedHash ||
    id !== `fine-tuning-data-intake-request-${expectedHash}`
  ) {
    throw new Error(
      'Fine-tuning data intake request integrity failed.',
    );
  }

  const currentTimestamp = Date.parse(requireTimestamp(now, 'now'));
  if (currentTimestamp < Date.parse(content.requestedAt)) {
    throw new Error(
      'Fine-tuning data intake request is not active yet.',
    );
  }
  if (currentTimestamp >= Date.parse(content.expiresAt)) {
    throw new Error('Fine-tuning data intake request expired.');
  }

  return request;
}
