import { createHash } from 'node:crypto';

import {
  FINE_TUNING_DATA_INTAKE_OWNER_ROLES,
} from './fine-tuning-data-intake-request.mjs';
import {
  assertFineTuningPrivateCollectionPlan,
} from './fine-tuning-private-collection-plan.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-execution-request/v1';

export const FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS = Object.freeze([
  'prepare-private-owner-only-collection-workspace',
  'record-source-lineage-and-usage-basis',
  'record-consent-purpose-and-privacy-check',
  'apply-redaction-and-approved-training-record-gate',
  'record-retention-and-deletion-evidence',
  'collect-bounded-reviewed-example-and-answer-quality-batches',
  'rebuild-readiness-and-reassess',
]);

export const FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_ROLES =
  Object.freeze([...FINE_TUNING_DATA_INTAKE_OWNER_ROLES]);

export const FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS =
  Object.freeze([
    {
      id: 'authorize-bounded-private-collection-execution',
      ownerRole: 'collection-approval-owner',
    },
    {
      id: 'verify-source-lineage-and-usage-basis',
      ownerRole: 'data-steward',
    },
    {
      id: 'verify-consent-purpose-and-privacy-boundary',
      ownerRole: 'privacy-reviewer',
    },
    {
      id: 'verify-redaction-and-approved-training-record-gate',
      ownerRole: 'quality-reviewer',
    },
    {
      id: 'verify-retention-and-deletion-evidence',
      ownerRole: 'retention-deletion-owner',
    },
  ].map((review) => Object.freeze(review)));

const BINDING_FIELDS = Object.freeze([
  'assessmentHash',
  'collectionPlanHash',
  'datasetHash',
  'datasetManifestHash',
  'evaluationManifestHash',
  'policyHash',
  'privateCollectionPlanHash',
  'readinessHash',
  'requestHash',
  'resolutionHash',
  'trainSha256',
  'validationSha256',
]);

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `Fine-tuning private collection execution request ${fieldName} must be a valid timestamp.`,
    );
  }
  return new Date(timestamp).toISOString();
}

function requireRequesterRole(value) {
  if (value !== 'local-operator-role') {
    throw new Error(
      'Fine-tuning private collection execution requestedBy must be local-operator-role.',
    );
  }
  return value;
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
      `Fine-tuning private collection execution request ${fieldName} fields are invalid.`,
    );
  }
}

function buildBindings(privateCollectionPlan) {
  return {
    assessmentHash: privateCollectionPlan.bindings.assessmentHash,
    collectionPlanHash: privateCollectionPlan.bindings.collectionPlanHash,
    datasetHash: privateCollectionPlan.bindings.datasetHash,
    datasetManifestHash: privateCollectionPlan.bindings.datasetManifestHash,
    evaluationManifestHash:
      privateCollectionPlan.bindings.evaluationManifestHash,
    policyHash: privateCollectionPlan.bindings.policyHash,
    privateCollectionPlanHash: privateCollectionPlan.planHash,
    readinessHash: privateCollectionPlan.bindings.readinessHash,
    requestHash: privateCollectionPlan.bindings.requestHash,
    resolutionHash: privateCollectionPlan.bindings.resolutionHash,
    trainSha256: privateCollectionPlan.bindings.trainSha256,
    validationSha256: privateCollectionPlan.bindings.validationSha256,
  };
}

function normalizeBindings(bindings) {
  requireExactKeys(bindings, BINDING_FIELDS, 'bindings');
  if (BINDING_FIELDS.some((field) => !isSha256(bindings[field]))) {
    throw new Error(
      'Fine-tuning private collection execution request bindings are invalid.',
    );
  }
  return Object.fromEntries(
    BINDING_FIELDS.map((field) => [field, bindings[field]]),
  );
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
      'Fine-tuning private collection execution request targets are invalid.',
    );
  }
  return expected;
}

function normalizeReference(reference, prefix, hashField, fieldName) {
  requireExactKeys(reference, ['id', hashField], fieldName);
  const hash = reference[hashField];
  if (!isSha256(hash) || reference.id !== `${prefix}-${hash}`) {
    throw new Error(
      `Fine-tuning private collection execution request ${fieldName} binding is invalid.`,
    );
  }
  return { id: reference.id, [hashField]: hash };
}

function buildReviews() {
  return FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUIRED_REVIEWS.map(
    (review) => ({
      ...review,
      status: 'pending-owner-review',
    }),
  );
}

function normalizeActions(actions) {
  const expected = [...FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS];
  if (JSON.stringify(actions) !== JSON.stringify(expected)) {
    throw new Error(
      'Fine-tuning private collection execution request actions are invalid.',
    );
  }
  return expected;
}

function normalizeOwnerRoles(ownerRoles) {
  const expected = [...FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_ROLES];
  if (JSON.stringify(ownerRoles) !== JSON.stringify(expected)) {
    throw new Error(
      'Fine-tuning private collection execution request owner roles are invalid.',
    );
  }
  return expected;
}

function normalizeReviews(reviews) {
  const expected = buildReviews();
  if (JSON.stringify(reviews) !== JSON.stringify(expected)) {
    throw new Error(
      'Fine-tuning private collection execution request reviews are invalid.',
    );
  }
  return expected;
}

function assembleContent({
  bindings,
  expiresAt,
  intakeRequest,
  intakeResolution,
  privateCollectionPlan,
  requestedActions,
  requestedAt,
  requestedBy,
  requiredOwnerRoles,
  requiredReviews,
  targets,
}) {
  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    answerQualityCaseCollectionAuthorized: false,
    bindings,
    candidateTrainingReviewAllowed: false,
    collectionExecutionApprovalRequired: true,
    collectionExecutionAuthorized: false,
    collectionExecutionApprovalRequestCreated: true,
    dataHandlingEvidenceIndependentlyVerified: false,
    dataHandlingEvidenceRecorded: false,
    dataHandlingEvidenceReferencesRecorded: true,
    expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    intakeRequest,
    intakeResolution,
    operatorAttestationBound: true,
    operatorAttestationRecorded: true,
    ownerDecisionRecorded: false,
    ownerIdentityVerified: false,
    privateCollectionPlan,
    privateCollectionPlanAllowed: true,
    privateCollectionWorkspaceCreationAuthorized: false,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    requestedActions,
    requestedAt,
    requestedBy,
    requiredOwnerRoles,
    requiredReviews,
    reviewedExampleCollectionAuthorized: false,
    schemaVersion:
      FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_REQUEST_SCHEMA_VERSION,
    sourceDataIncluded: false,
    status: 'pending-private-collection-execution-owner-review',
    syntheticTrainingRecordsCreated: false,
    targets,
    trainingAuthorized: false,
  };
}

function buildContent({
  assessment,
  collectionPlan,
  intakeRequest,
  intakeResolution,
  privateCollectionPlan,
  requestedAt,
  requestedBy,
}) {
  const normalizedRequestedAt = requireTimestamp(requestedAt, 'requestedAt');
  assertFineTuningPrivateCollectionPlan(privateCollectionPlan, {
    assessment,
    collectionPlan,
    now: normalizedRequestedAt,
    request: intakeRequest,
    resolution: intakeResolution,
  });
  if (
    Date.parse(normalizedRequestedAt) <
      Date.parse(privateCollectionPlan.plannedAt)
  ) {
    throw new Error(
      'Fine-tuning private collection execution request cannot predate its plan.',
    );
  }
  if (
    Date.parse(normalizedRequestedAt) >=
      Date.parse(privateCollectionPlan.expiresAt)
  ) {
    throw new Error(
      'Fine-tuning private collection execution request expired.',
    );
  }
  return assembleContent({
    bindings: normalizeBindings(buildBindings(privateCollectionPlan)),
    expiresAt: privateCollectionPlan.expiresAt,
    intakeRequest: normalizeReference(
      { id: intakeRequest.id, requestHash: intakeRequest.requestHash },
      'fine-tuning-data-intake-request',
      'requestHash',
      'intakeRequest',
    ),
    intakeResolution: normalizeReference(
      {
        id: intakeResolution.id,
        resolutionHash: intakeResolution.resolutionHash,
      },
      'fine-tuning-data-intake-resolution',
      'resolutionHash',
      'intakeResolution',
    ),
    privateCollectionPlan: normalizeReference(
      {
        id: privateCollectionPlan.id,
        planHash: privateCollectionPlan.planHash,
      },
      'fine-tuning-private-collection-plan',
      'planHash',
      'privateCollectionPlan',
    ),
    requestedActions: [
      ...FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_ACTIONS,
    ],
    requestedAt: normalizedRequestedAt,
    requestedBy: requireRequesterRole(requestedBy),
    requiredOwnerRoles: [
      ...FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_ROLES,
    ],
    requiredReviews: buildReviews(),
    targets: normalizeTargets(privateCollectionPlan.targets),
  });
}

function rebuildStoredContent(content) {
  const requestedAt = requireTimestamp(content?.requestedAt, 'requestedAt');
  const expiresAt = requireTimestamp(content?.expiresAt, 'expiresAt');
  if (Date.parse(requestedAt) >= Date.parse(expiresAt)) {
    throw new Error(
      'Fine-tuning private collection execution request must be created before expiry.',
    );
  }
  const bindings = normalizeBindings(content?.bindings);
  const intakeRequest = normalizeReference(
    content?.intakeRequest,
    'fine-tuning-data-intake-request',
    'requestHash',
    'intakeRequest',
  );
  const intakeResolution = normalizeReference(
    content?.intakeResolution,
    'fine-tuning-data-intake-resolution',
    'resolutionHash',
    'intakeResolution',
  );
  const privateCollectionPlan = normalizeReference(
    content?.privateCollectionPlan,
    'fine-tuning-private-collection-plan',
    'planHash',
    'privateCollectionPlan',
  );
  if (
    bindings.requestHash !== intakeRequest.requestHash ||
    bindings.resolutionHash !== intakeResolution.resolutionHash ||
    bindings.privateCollectionPlanHash !== privateCollectionPlan.planHash
  ) {
    throw new Error(
      'Fine-tuning private collection execution request references are inconsistent.',
    );
  }
  return assembleContent({
    bindings,
    expiresAt,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedActions: normalizeActions(content?.requestedActions),
    requestedAt,
    requestedBy: requireRequesterRole(content?.requestedBy),
    requiredOwnerRoles: normalizeOwnerRoles(content?.requiredOwnerRoles),
    requiredReviews: normalizeReviews(content?.requiredReviews),
    targets: normalizeTargets(content?.targets),
  });
}

export function buildFineTuningPrivateCollectionExecutionRequest(input = {}) {
  const content = buildContent(input);
  const requestHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-execution-request-${requestHash}`,
    requestHash,
  };
}

export function assertFineTuningPrivateCollectionExecutionRequestRecord(
  request,
) {
  const { id, requestHash, ...content } = request || {};
  const expected = rebuildStoredContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    requestHash !== expectedHash ||
    id !==
      `fine-tuning-private-collection-execution-request-${expectedHash}`
  ) {
    throw new Error(
      'Fine-tuning private collection execution request integrity failed.',
    );
  }
  return request;
}

export function assertFineTuningPrivateCollectionExecutionRequest(
  request,
  {
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    now,
    privateCollectionPlan,
  } = {},
) {
  if (now === undefined) {
    throw new Error(
      'Fine-tuning private collection execution request requires an explicit current time.',
    );
  }
  const normalizedNow = requireTimestamp(now, 'now');
  assertFineTuningPrivateCollectionExecutionRequestRecord(request);
  if (Date.parse(normalizedNow) < Date.parse(request.requestedAt)) {
    throw new Error(
      'Fine-tuning private collection execution request is not active yet.',
    );
  }
  if (Date.parse(normalizedNow) >= Date.parse(request.expiresAt)) {
    throw new Error(
      'Fine-tuning private collection execution request expired.',
    );
  }
  const expected = buildContent({
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedAt: request.requestedAt,
    requestedBy: request.requestedBy,
  });
  if (JSON.stringify(request) !== JSON.stringify({
    ...expected,
    id: request.id,
    requestHash: request.requestHash,
  })) {
    throw new Error(
      'Fine-tuning private collection execution request does not match the current F1 chain.',
    );
  }
  assertFineTuningPrivateCollectionPlan(privateCollectionPlan, {
    assessment,
    collectionPlan,
    now: normalizedNow,
    request: intakeRequest,
    resolution: intakeResolution,
  });
  return request;
}
