import { createHash } from 'node:crypto';

import {
  assertApprovedFineTuningDataIntakeResolution,
} from './fine-tuning-data-intake-resolution.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_PLAN_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-plan/v1';

export const FINE_TUNING_PRIVATE_COLLECTION_PLAN_STEPS = Object.freeze([
  'prepare-private-owner-only-intake-workspace',
  'bind-source-lineage-and-usage-basis',
  'bind-consent-purpose-and-privacy-check',
  'bind-redaction-and-approved-training-record-gate',
  'bind-retention-and-deletion-evidence',
  'stage-bounded-reviewed-example-and-answer-quality-batches',
  'request-separate-collection-execution-approval',
]);

const BINDING_FIELDS = Object.freeze([
  'assessmentHash',
  'collectionPlanHash',
  'datasetHash',
  'datasetManifestHash',
  'evaluationManifestHash',
  'policyHash',
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
      `Fine-tuning private collection plan ${fieldName} must be a valid timestamp.`,
    );
  }
  return new Date(timestamp).toISOString();
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
      `Fine-tuning private collection plan ${fieldName} fields are invalid.`,
    );
  }
}

function buildBindings({ assessment, collectionPlan, request, resolution }) {
  return {
    assessmentHash: assessment.assessmentHash,
    collectionPlanHash: collectionPlan.planHash,
    datasetHash: request.bindings.datasetHash,
    datasetManifestHash: request.bindings.datasetManifestHash,
    evaluationManifestHash: request.bindings.evaluationManifestHash,
    policyHash: request.bindings.policyHash,
    readinessHash: request.bindings.readinessHash,
    requestHash: request.requestHash,
    resolutionHash: resolution.resolutionHash,
    trainSha256: request.bindings.trainSha256,
    validationSha256: request.bindings.validationSha256,
  };
}

function normalizeBindings(bindings) {
  requireExactKeys(bindings, BINDING_FIELDS, 'bindings');
  if (BINDING_FIELDS.some((field) => !isSha256(bindings[field]))) {
    throw new Error(
      'Fine-tuning private collection plan bindings are invalid.',
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
  const counts = [
    targets.answerQualityCases.minimumAdditionalItems,
    targets.reviewedExamples.minimumAdditionalItems,
    targets.reviewedExamples.observedTrainGap,
    targets.reviewedExamples.observedValidationGap,
    targets.reviewedExamples.requiredNewMissionScopes,
  ];
  if (
    counts.some((value) => !Number.isInteger(value) || value < 0) ||
    targets.answerQualityCases.countsTowardReviewedExampleMinimum !== false ||
    targets.reviewedExamples.splitAssignmentAuthorized !== false ||
    targets.reviewedExamples.splitMustBeRebuiltAndRemeasured !== true
  ) {
    throw new Error(
      'Fine-tuning private collection plan targets are invalid.',
    );
  }
  return structuredClone(targets);
}

function normalizeReference(reference, prefix, fieldName) {
  requireExactKeys(reference, ['id', `${fieldName}Hash`], fieldName);
  const hash = reference[`${fieldName}Hash`];
  if (!isSha256(hash) || reference.id !== `${prefix}-${hash}`) {
    throw new Error(
      `Fine-tuning private collection plan ${fieldName} binding is invalid.`,
    );
  }
  return {
    id: reference.id,
    [`${fieldName}Hash`]: hash,
  };
}

function buildSteps() {
  return FINE_TUNING_PRIVATE_COLLECTION_PLAN_STEPS.map((id, index) => ({
    id,
    order: index + 1,
    status: 'pending',
  }));
}

function normalizeSteps(steps) {
  if (
    !Array.isArray(steps) ||
    steps.length !== FINE_TUNING_PRIVATE_COLLECTION_PLAN_STEPS.length
  ) {
    throw new Error(
      'Fine-tuning private collection plan steps are invalid.',
    );
  }
  const expected = buildSteps();
  if (JSON.stringify(steps) !== JSON.stringify(expected)) {
    throw new Error(
      'Fine-tuning private collection plan steps are invalid.',
    );
  }
  return expected;
}

function assembleContent({
  bindings,
  expiresAt,
  plannedAt,
  request,
  resolution,
  steps,
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
    dataHandlingEvidenceIndependentlyVerified: false,
    dataHandlingEvidenceRecorded: false,
    dataHandlingEvidenceReferencesRecorded: true,
    expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    operatorAttestationBound: true,
    operatorAttestationRecorded: true,
    ownerDecisionRecorded: false,
    ownerIdentityVerified: false,
    plannedAt,
    privateCollectionPlanAllowed: true,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    request,
    resolution,
    reviewedExampleCollectionAuthorized: false,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_PLAN_SCHEMA_VERSION,
    sourceDataIncluded: false,
    status: 'private-collection-plan-created-execution-approval-required',
    steps,
    syntheticTrainingRecordsCreated: false,
    targets,
    trainingAuthorized: false,
  };
}

function buildContent({
  assessment,
  collectionPlan,
  plannedAt,
  request,
  resolution,
}) {
  const normalizedPlannedAt = requireTimestamp(plannedAt, 'plannedAt');
  assertApprovedFineTuningDataIntakeResolution(resolution, {
    assessment,
    collectionPlan,
    now: normalizedPlannedAt,
    request,
  });
  if (Date.parse(normalizedPlannedAt) < Date.parse(resolution.resolvedAt)) {
    throw new Error(
      'Fine-tuning private collection plan cannot predate its resolution.',
    );
  }
  return assembleContent({
    bindings: normalizeBindings(buildBindings({
      assessment,
      collectionPlan,
      request,
      resolution,
    })),
    expiresAt: requireTimestamp(request.expiresAt, 'expiresAt'),
    plannedAt: normalizedPlannedAt,
    request: normalizeReference(
      { id: request.id, requestHash: request.requestHash },
      'fine-tuning-data-intake-request',
      'request',
    ),
    resolution: normalizeReference(
      { id: resolution.id, resolutionHash: resolution.resolutionHash },
      'fine-tuning-data-intake-resolution',
      'resolution',
    ),
    steps: buildSteps(),
    targets: normalizeTargets(request.targets),
  });
}

function rebuildStoredContent(content) {
  const plannedAt = requireTimestamp(content?.plannedAt, 'plannedAt');
  const expiresAt = requireTimestamp(content?.expiresAt, 'expiresAt');
  if (Date.parse(plannedAt) >= Date.parse(expiresAt)) {
    throw new Error(
      'Fine-tuning private collection plan must be created before expiry.',
    );
  }
  const bindings = normalizeBindings(content?.bindings);
  const request = normalizeReference(
    content?.request,
    'fine-tuning-data-intake-request',
    'request',
  );
  const resolution = normalizeReference(
    content?.resolution,
    'fine-tuning-data-intake-resolution',
    'resolution',
  );
  if (
    bindings.requestHash !== request.requestHash ||
    bindings.resolutionHash !== resolution.resolutionHash
  ) {
    throw new Error(
      'Fine-tuning private collection plan binding references are inconsistent.',
    );
  }
  return assembleContent({
    bindings,
    expiresAt,
    plannedAt,
    request,
    resolution,
    steps: normalizeSteps(content?.steps),
    targets: normalizeTargets(content?.targets),
  });
}

export function buildFineTuningPrivateCollectionPlan(input = {}) {
  const content = buildContent(input);
  const planHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-plan-${planHash}`,
    planHash,
  };
}

export function assertFineTuningPrivateCollectionPlanRecord(plan) {
  const { id, planHash, ...content } = plan || {};
  const expected = rebuildStoredContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    planHash !== expectedHash ||
    id !== `fine-tuning-private-collection-plan-${expectedHash}`
  ) {
    throw new Error(
      'Fine-tuning private collection plan record integrity failed.',
    );
  }
  return plan;
}

export function assertFineTuningPrivateCollectionPlan(
  plan,
  { assessment, collectionPlan, now, request, resolution } = {},
) {
  if (now === undefined) {
    throw new Error(
      'Fine-tuning private collection plan requires an explicit current time.',
    );
  }
  const normalizedNow = requireTimestamp(now, 'now');
  assertFineTuningPrivateCollectionPlanRecord(plan);
  if (Date.parse(normalizedNow) < Date.parse(plan.plannedAt)) {
    throw new Error(
      'Fine-tuning private collection plan is not active before plannedAt.',
    );
  }
  const expected = buildContent({
    assessment,
    collectionPlan,
    plannedAt: plan.plannedAt,
    request,
    resolution,
  });
  if (
    JSON.stringify(plan.bindings) !== JSON.stringify(expected.bindings) ||
    JSON.stringify(plan.request) !== JSON.stringify(expected.request) ||
    JSON.stringify(plan.resolution) !== JSON.stringify(expected.resolution) ||
    JSON.stringify(plan.targets) !== JSON.stringify(expected.targets) ||
    plan.expiresAt !== expected.expiresAt
  ) {
    throw new Error(
      'Fine-tuning private collection plan does not match the current F1 chain.',
    );
  }
  assertApprovedFineTuningDataIntakeResolution(resolution, {
    assessment,
    collectionPlan,
    now: normalizedNow,
    request,
  });
  return plan;
}
