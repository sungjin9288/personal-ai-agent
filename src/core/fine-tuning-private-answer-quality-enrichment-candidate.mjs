import { createHash } from 'node:crypto';

import { evaluateAnswerQualityCase } from './answer-quality-evaluation.mjs';
import {
  AGENT_ROLES,
  KNOWLEDGE_DELIVERABLE_TYPES,
  MEMORY_KINDS as CANONICAL_MEMORY_KINDS,
  MEMORY_SCOPES as CANONICAL_MEMORY_SCOPES,
  MISSION_MODES,
} from './constants.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemArtifactRequestRecord } from './fine-tuning-private-collection-item-artifact-request.mjs';
import { assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord } from './fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionItemReviewProjectionRecord } from './fine-tuning-private-collection-item-review-projection.mjs';
import { assertFineTuningPrivateCollectionItemReviewResolutionRecord } from './fine-tuning-private-collection-item-review-resolution.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';
import { buildRetrievalContext } from './retrieval-service.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_INPUT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-input/v1';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-enrichment-candidate/v1';

const MAX_FIELD_BYTES = 16 * 1024;
const MAX_INPUT_BYTES = 48 * 1024;
const MAX_LIST_ITEMS = 16;
const MAX_SOURCE_ITEMS = 16;
const MAX_RETRIEVAL_ITEMS = 16;
const MAX_PRECHECK_COUNT = 64;

const PROHIBITED_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u061c\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/u;
const CUSTOMER_IDENTIFIER = /\b(?:customer|tenant|user|account)[ _-]?(?:id|identifier|email|phone|number)\b|\b\+?[0-9][0-9(). -]{7,}[0-9]\b/iu;
const ROLES = new Set(AGENT_ROLES);
const MODES = new Set(MISSION_MODES);
const DELIVERABLE_TYPES = new Set([
  ...KNOWLEDGE_DELIVERABLE_TYPES,
  'implementation-proposal',
]);
const MEMORY_KINDS = new Set(CANONICAL_MEMORY_KINDS);
const MEMORY_SCOPES = new Set(CANONICAL_MEMORY_SCOPES);

const F1_15_BINDING_KEYS = Object.freeze([
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
  'artifactRequestHash',
  'artifactPreparationDecisionHash',
]);
const CANDIDATE_BINDING_KEYS = Object.freeze([
  ...F1_15_BINDING_KEYS,
  'artifactPreparationResolutionHash',
  'answerQualityCaseEnrichmentInputHash',
]);
const COUNT_KEYS = Object.freeze([
  'citedExpectedSourceCount',
  'citedSourceCount',
  'expectedSourceCount',
  'forbiddenRetrievedSourceCount',
  'forbiddenTermMatchCount',
  'groundedCitationCount',
  'requiredTermCount',
  'requiredTermMatchCount',
  'retrievedExpectedSourceCount',
  'retrievedSourceCount',
  'unsupportedCitationCount',
]);
const METRIC_KEYS = Object.freeze([
  'citationGroundingRate',
  'expectedSourceCitationRate',
  'forbiddenRetrievedSourceCount',
  'forbiddenTermMatchCount',
  'requiredTermCoverage',
  'retrievalHitRate',
  'unsupportedCitationRate',
]);
const SUMMARY_KEYS = Object.freeze([
  'answerHash',
  'citedSourceKeyCount',
  'criteriaHash',
  'expectedSourceKeyCount',
  'forbiddenAnswerTermCount',
  'forbiddenSourceKeyCount',
  'inputHash',
  'requiredAnswerTermCount',
  'retrievalInputHash',
]);
const OBSERVATION_KEYS = Object.freeze([
  'admittedAt',
  'artifactPreparationResolvedAt',
  'artifactRequestedAt',
  'deleteBy',
  'expiresAt',
  'itemStoredAt',
  'projectedAt',
  'reviewResolvedAt',
]);

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
    throw new Error(`Fine-tuning private answer quality enrichment ${label} fields are invalid.`);
  }
}

function timestamp(value, label) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} timestamp is invalid.`);
  }
  return new Date(parsed).toISOString();
}

function reference(value, label, prefix, hashField) {
  requireKeys(value, ['id', hashField], label);
  if (!isSha256(value[hashField]) || value.id !== `${prefix}${value[hashField]}`) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} is invalid.`);
  }
  return { id: value.id, [hashField]: value[hashField] };
}

function admissionReference(value, label) {
  return reference(value, label, 'fine-tuning-private-collection-item-admission-', 'admissionHash');
}

function workspaceReference(value, label) {
  return reference(value, label, 'fine-tuning-private-collection-workspace-', 'workspaceHash');
}

function itemReference(value, label) {
  return reference(value, label, 'fine-tuning-private-collection-item-', 'itemHash');
}

function projectionReference(value, label) {
  return reference(value, label, 'fine-tuning-private-collection-item-review-projection-', 'projectionHash');
}

function reviewResolutionReference(value, label) {
  return reference(value, label, 'fine-tuning-private-collection-item-review-resolution-', 'resolutionHash');
}

function artifactRequestReference(value, label) {
  return reference(value, label, 'fine-tuning-private-collection-item-artifact-request-', 'artifactRequestHash');
}

function artifactPreparationResolutionReference(value, label) {
  return reference(
    value,
    label,
    'fine-tuning-private-collection-item-artifact-preparation-resolution-',
    'artifactPreparationResolutionHash',
  );
}

function safeText(value, label) {
  if (typeof value !== 'string') {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} must be text.`);
  }
  if (PROHIBITED_TEXT.test(value)) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} contains prohibited controls.`);
  }
  const normalized = value.normalize('NFC').trim();
  if (!normalized || Buffer.byteLength(normalized, 'utf8') > MAX_FIELD_BYTES) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} size is invalid.`);
  }
  if (
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized) ||
    CUSTOMER_IDENTIFIER.test(normalized)
  ) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} is unsafe.`);
  }
  return normalized;
}

function exactList(value, label, normalizeItem, { maximum = MAX_LIST_ITEMS, required = false } = {}) {
  if (!Array.isArray(value) || value.length > maximum || (required && value.length === 0)) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} is invalid.`);
  }
  return value.map((entry, index) => normalizeItem(entry, `${label}[${index}]`));
}

function uniqueTerms(value, label, options = {}) {
  const terms = exactList(value, label, safeText, options);
  const folded = terms.map((term) => term.toLocaleLowerCase('en-US'));
  if (new Set(folded).size !== folded.length) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} must be unique.`);
  }
  return terms;
}

function uniqueSourceKeys(value, label, options = {}) {
  const keys = exactList(value, label, safeText, options);
  if (new Set(keys).size !== keys.length) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} must be unique.`);
  }
  return keys;
}

function normalizeAttachment(value, label) {
  requireKeys(value, ['dataOrigin', 'fileName', 'promptContent'], label);
  if (value.dataOrigin !== 'curated-synthetic') {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} data origin is invalid.`);
  }
  return {
    dataOrigin: 'curated-synthetic',
    fileName: safeText(value.fileName, `${label}.fileName`),
    promptContent: safeText(value.promptContent, `${label}.promptContent`),
  };
}

function normalizeMemoryEntry(value, label) {
  requireKeys(value, ['content', 'dataOrigin', 'kind', 'scope'], label);
  if (
    value.dataOrigin !== 'curated-synthetic' ||
    !MEMORY_KINDS.has(value.kind) ||
    !MEMORY_SCOPES.has(value.scope)
  ) {
    throw new Error(`Fine-tuning private answer quality enrichment ${label} metadata is invalid.`);
  }
  return {
    content: safeText(value.content, `${label}.content`),
    dataOrigin: 'curated-synthetic',
    kind: value.kind,
    scope: value.scope,
  };
}

function normalizeMission(value) {
  requireKeys(value, ['constraints', 'deliverableType', 'mode', 'objective', 'title'], 'input retrieval mission');
  if (!DELIVERABLE_TYPES.has(value.deliverableType) || !MODES.has(value.mode)) {
    throw new Error('Fine-tuning private answer quality enrichment input retrieval mission metadata is invalid.');
  }
  return {
    constraints: uniqueTerms(value.constraints, 'input retrieval mission constraints'),
    deliverableType: value.deliverableType,
    mode: value.mode,
    objective: safeText(value.objective, 'input retrieval mission objective'),
    title: safeText(value.title, 'input retrieval mission title'),
  };
}

function normalizePack(value) {
  requireKeys(value, ['requiredSections', 'reviewRules'], 'input retrieval pack');
  return {
    requiredSections: uniqueTerms(value.requiredSections, 'input retrieval pack requiredSections'),
    reviewRules: exactList(value.reviewRules, 'input retrieval pack reviewRules', (rule, label) => {
      requireKeys(rule, ['description'], label);
      return { description: safeText(rule.description, `${label}.description`) };
    }),
  };
}

function normalizeRetrievalInput(value) {
  requireKeys(value, [
    'attachments',
    'memoryEntries',
    'mission',
    'pack',
    'previousOutputs',
    'providerRole',
    'role',
  ], 'input retrievalInput');
  requireKeys(value.previousOutputs, [], 'input retrievalInput previousOutputs');
  if (!ROLES.has(value.providerRole) || !ROLES.has(value.role)) {
    throw new Error('Fine-tuning private answer quality enrichment input retrieval role is invalid.');
  }
  return {
    attachments: exactList(
      value.attachments,
      'input retrieval attachments',
      normalizeAttachment,
      { maximum: MAX_RETRIEVAL_ITEMS },
    ),
    memoryEntries: exactList(
      value.memoryEntries,
      'input retrieval memoryEntries',
      normalizeMemoryEntry,
      { maximum: MAX_RETRIEVAL_ITEMS },
    ),
    mission: normalizeMission(value.mission),
    pack: normalizePack(value.pack),
    previousOutputs: {},
    providerRole: value.providerRole,
    role: value.role,
  };
}

function normalizeInput(input) {
  requireKeys(input, [
    'answer',
    'artifactPreparationResolution',
    'expectedSourceKeys',
    'forbiddenAnswerTerms',
    'forbiddenSourceKeys',
    'item',
    'requiredAnswerTerms',
    'retrievalInput',
    'schemaVersion',
    'workspace',
  ], 'input');
  requireKeys(input.answer, ['citedSourceKeys'], 'input answer');
  if (input.schemaVersion !== FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_INPUT_SCHEMA_VERSION) {
    throw new Error('Fine-tuning private answer quality enrichment input schema is invalid.');
  }

  const answer = {
    citedSourceKeys: uniqueSourceKeys(
      input.answer.citedSourceKeys,
      'input answer citedSourceKeys',
      { maximum: MAX_SOURCE_ITEMS, required: true },
    ),
  };
  const expectedSourceKeys = uniqueSourceKeys(
    input.expectedSourceKeys,
    'input expectedSourceKeys',
    { maximum: MAX_SOURCE_ITEMS, required: true },
  );
  const requiredAnswerTerms = uniqueTerms(
    input.requiredAnswerTerms,
    'input requiredAnswerTerms',
    { required: true },
  );
  const forbiddenAnswerTerms = uniqueTerms(input.forbiddenAnswerTerms, 'input forbiddenAnswerTerms');
  const forbiddenSourceKeys = uniqueSourceKeys(input.forbiddenSourceKeys, 'input forbiddenSourceKeys');
  const retrievalInput = normalizeRetrievalInput(input.retrievalInput);

  const expectedSources = new Set(expectedSourceKeys);
  const requiredTerms = new Set(requiredAnswerTerms.map((term) => term.toLocaleLowerCase('en-US')));
  if (
    answer.citedSourceKeys.some((key) => !expectedSources.has(key)) ||
    forbiddenSourceKeys.some((key) => expectedSources.has(key)) ||
    forbiddenAnswerTerms.some((term) => requiredTerms.has(term.toLocaleLowerCase('en-US')))
  ) {
    throw new Error('Fine-tuning private answer quality enrichment source or term boundaries overlap.');
  }

  const normalized = {
    answer,
    artifactPreparationResolution: artifactPreparationResolutionReference(
      input.artifactPreparationResolution,
      'input artifact preparation resolution',
    ),
    expectedSourceKeys,
    forbiddenAnswerTerms,
    forbiddenSourceKeys,
    item: itemReference(input.item, 'input item'),
    requiredAnswerTerms,
    retrievalInput,
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_INPUT_SCHEMA_VERSION,
    workspace: workspaceReference(input.workspace, 'input workspace'),
  };
  if (Buffer.byteLength(JSON.stringify(normalized), 'utf8') > MAX_INPUT_BYTES) {
    throw new Error('Fine-tuning private answer quality enrichment input is too large.');
  }
  return normalized;
}

export function assertFineTuningPrivateAnswerQualityEnrichmentInput(input) {
  return normalizeInput(input);
}

function sameReference(left, right, hashField) {
  return left?.id === right?.id && left?.[hashField] === right?.[hashField];
}

function assertBindingsExtend(record, resolutionBindings, label) {
  for (const [key, value] of Object.entries(record.bindings)) {
    if (!isSha256(value) || (key in resolutionBindings && resolutionBindings[key] !== value)) {
      throw new Error(`Fine-tuning private answer quality enrichment ${label} bindings drifted.`);
    }
  }
}

function assertLiveLineage({
  admission,
  artifactPreparationResolution,
  artifactRequest,
  item,
  observedAt,
  projection,
  reviewResolution,
  workspace,
}) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
  assertFineTuningPrivateCollectionItemReviewResolutionRecord(reviewResolution);
  assertFineTuningPrivateCollectionItemArtifactRequestRecord(artifactRequest);
  assertFineTuningPrivateCollectionItemArtifactPreparationResolutionRecord(artifactPreparationResolution);

  const normalizedObservedAt = timestamp(observedAt, 'observedAt');
  const resolutionBindings = artifactPreparationResolution.bindings;
  requireKeys(resolutionBindings, F1_15_BINDING_KEYS, 'F1.15 resolution bindings');
  for (const record of [admission, item, projection, reviewResolution, artifactRequest]) {
    assertBindingsExtend(record, resolutionBindings, record.schemaVersion);
  }

  const exact =
    item.lane === 'answer-quality-cases' &&
    item.dataOrigin === 'curated-synthetic' &&
    sameReference(admission.workspace, workspace, 'workspaceHash') &&
    sameReference(admission.envelope.workspace, workspace, 'workspaceHash') &&
    sameReference(item.admission, admission, 'admissionHash') &&
    sameReference(item.workspace, workspace, 'workspaceHash') &&
    admission.expiresAt === item.expiresAt &&
    admission.envelope.retention.deleteBy === item.retention.deleteBy &&
    admission.envelope.retention.withdrawalReferenceSha256 ===
      item.retention.withdrawalReferenceSha256 &&
    workspace.expiresAt === item.expiresAt &&
    sameReference(projection.admission, admission, 'admissionHash') &&
    sameReference(projection.item, item, 'itemHash') &&
    sameReference(projection.workspace, workspace, 'workspaceHash') &&
    sameReference(reviewResolution.admission, admission, 'admissionHash') &&
    sameReference(reviewResolution.item, item, 'itemHash') &&
    sameReference(reviewResolution.projection, projection, 'projectionHash') &&
    sameReference(reviewResolution.workspace, workspace, 'workspaceHash') &&
    sameReference(artifactRequest.admission, admission, 'admissionHash') &&
    sameReference(artifactRequest.item, item, 'itemHash') &&
    sameReference(artifactRequest.projection, projection, 'projectionHash') &&
    sameReference(artifactRequest.reviewResolution, reviewResolution, 'resolutionHash') &&
    sameReference(artifactRequest.workspace, workspace, 'workspaceHash') &&
    sameReference(artifactPreparationResolution.admission, admission, 'admissionHash') &&
    sameReference(artifactPreparationResolution.item, item, 'itemHash') &&
    sameReference(artifactPreparationResolution.projection, projection, 'projectionHash') &&
    sameReference(artifactPreparationResolution.reviewResolution, reviewResolution, 'resolutionHash') &&
    sameReference(artifactPreparationResolution.artifactRequest, artifactRequest, 'artifactRequestHash') &&
    sameReference(artifactPreparationResolution.workspace, workspace, 'workspaceHash') &&
    artifactPreparationResolution.artifactPreparationAuthorized === true &&
    artifactPreparationResolution.decision === 'approve' &&
    artifactPreparationResolution.target === 'answer-quality-case-enrichment' &&
    artifactPreparationResolution.answerQualityCaseEnrichmentPreparationAllowed === true &&
    projection.sourceObservation.storedAt === item.storedAt &&
    projection.sourceObservation.expiresAt === item.expiresAt &&
    projection.sourceObservation.deleteBy === item.retention.deleteBy &&
    reviewResolution.sourceObservation.projectedAt === projection.projectedAt &&
    reviewResolution.sourceObservation.expiresAt === item.expiresAt &&
    reviewResolution.sourceObservation.deleteBy === item.retention.deleteBy &&
    artifactRequest.sourceObservation.projectedAt === projection.projectedAt &&
    artifactRequest.sourceObservation.resolvedAt === reviewResolution.resolvedAt &&
    artifactRequest.sourceObservation.expiresAt === item.expiresAt &&
    artifactRequest.sourceObservation.deleteBy === item.retention.deleteBy &&
    artifactPreparationResolution.sourceObservation.requestedAt === artifactRequest.createdAt &&
    artifactPreparationResolution.sourceObservation.expiresAt === item.expiresAt &&
    artifactPreparationResolution.sourceObservation.deleteBy === item.retention.deleteBy &&
    artifactPreparationResolution.bindings.admissionHash === admission.admissionHash &&
    artifactPreparationResolution.bindings.itemHash === item.itemHash &&
    artifactPreparationResolution.bindings.workspaceHash === workspace.workspaceHash &&
    artifactPreparationResolution.bindings.projectionHash === projection.projectionHash &&
    artifactPreparationResolution.bindings.itemReviewResolutionHash === reviewResolution.resolutionHash &&
    artifactPreparationResolution.bindings.artifactRequestHash === artifactRequest.artifactRequestHash &&
    Date.parse(artifactPreparationResolution.resolvedAt) <= Date.parse(normalizedObservedAt) &&
    Date.parse(normalizedObservedAt) < Date.parse(item.expiresAt) &&
    Date.parse(normalizedObservedAt) < Date.parse(item.retention.deleteBy);

  if (!exact) {
    throw new Error('Fine-tuning private answer quality enrichment must bind one approved live synthetic F1.15 resolution.');
  }
  return normalizedObservedAt;
}

function buildInputSummary(input, item) {
  return {
    answerHash: hash({ citedSourceKeys: input.answer.citedSourceKeys, text: item.example.response }),
    citedSourceKeyCount: input.answer.citedSourceKeys.length,
    criteriaHash: hash({
      expectedSourceKeys: input.expectedSourceKeys,
      forbiddenAnswerTerms: input.forbiddenAnswerTerms,
      forbiddenSourceKeys: input.forbiddenSourceKeys,
      requiredAnswerTerms: input.requiredAnswerTerms,
    }),
    expectedSourceKeyCount: input.expectedSourceKeys.length,
    forbiddenAnswerTermCount: input.forbiddenAnswerTerms.length,
    forbiddenSourceKeyCount: input.forbiddenSourceKeys.length,
    inputHash: hash(input),
    requiredAnswerTermCount: input.requiredAnswerTerms.length,
    retrievalInputHash: hash(input.retrievalInput),
  };
}

function buildContent({
  admission,
  artifactPreparationResolution,
  artifactRequest,
  input,
  item,
  observedAt,
  projection,
  reviewResolution,
  workspace,
}) {
  const normalizedObservedAt = assertLiveLineage({
    admission,
    artifactPreparationResolution,
    artifactRequest,
    item,
    observedAt,
    projection,
    reviewResolution,
    workspace,
  });
  const normalizedInput = normalizeInput(input);
  if (
    !sameReference(normalizedInput.workspace, workspace, 'workspaceHash') ||
    !sameReference(normalizedInput.item, item, 'itemHash') ||
    !sameReference(
      normalizedInput.artifactPreparationResolution,
      artifactPreparationResolution,
      'artifactPreparationResolutionHash',
    ) ||
    normalizedInput.retrievalInput.mission.objective !== item.example.instruction
  ) {
    throw new Error('Fine-tuning private answer quality enrichment input does not match its live lineage.');
  }

  const precheck = evaluateAnswerQualityCase({
    answer: {
      citedSourceKeys: normalizedInput.answer.citedSourceKeys,
      text: item.example.response,
    },
    expectedSourceKeys: normalizedInput.expectedSourceKeys,
    forbiddenAnswerTerms: normalizedInput.forbiddenAnswerTerms,
    forbiddenSourceKeys: normalizedInput.forbiddenSourceKeys,
    id: `private-answer-quality-case-${item.itemHash}`,
    requiredAnswerTerms: normalizedInput.requiredAnswerTerms,
    retrievedItems: buildRetrievalContext(normalizedInput.retrievalInput),
    reviewerVerdict: 'not-reviewed',
  }, { thresholds: { requireReviewerPass: false } });
  if (precheck.status !== 'passed') {
    throw new Error('Fine-tuning private answer quality enrichment deterministic precheck failed.');
  }

  const inputSummary = buildInputSummary(normalizedInput, item);
  const precheckSummary = {
    counts: precheck.counts,
    metrics: precheck.metrics,
    precheckHash: hash({
      counts: precheck.counts,
      metrics: precheck.metrics,
      status: precheck.status,
    }),
    status: precheck.status,
  };
  const bindings = {
    ...artifactPreparationResolution.bindings,
    artifactPreparationResolutionHash:
      artifactPreparationResolution.artifactPreparationResolutionHash,
    answerQualityCaseEnrichmentInputHash: inputSummary.inputHash,
  };
  requireKeys(bindings, CANDIDATE_BINDING_KEYS, 'candidate bindings');

  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission: admissionReference(
      { admissionHash: admission.admissionHash, id: admission.id },
      'candidate admission',
    ),
    answerQualityCaseCreated: false,
    answerQualityCaseEnrichmentCandidateCreated: true,
    artifactPreparationAuthorized: true,
    artifactPreparationResolution: artifactPreparationResolutionReference(
      {
        artifactPreparationResolutionHash:
          artifactPreparationResolution.artifactPreparationResolutionHash,
        id: artifactPreparationResolution.id,
      },
      'candidate artifact preparation resolution',
    ),
    artifactRequest: artifactRequestReference(
      { artifactRequestHash: artifactRequest.artifactRequestHash, id: artifactRequest.id },
      'candidate artifact request',
    ),
    bindings,
    candidateReviewCreated: false,
    contentCopied: false,
    dataOrigin: 'curated-synthetic',
    deploymentAuthorized: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    inputSummary,
    item: itemReference({ id: item.id, itemHash: item.itemHash }, 'candidate item'),
    itemPathStored: false,
    observedAt: normalizedObservedAt,
    payloadStored: false,
    precheck: precheckSummary,
    productionReadyClaim: false,
    projection: projectionReference(
      { id: projection.id, projectionHash: projection.projectionHash },
      'candidate projection',
    ),
    providerSubmissionAuthorized: false,
    q1ContractSatisfied: false,
    reviewerReviewRequired: true,
    reviewerVerdict: 'not-reviewed',
    reviewResolution: reviewResolutionReference(
      { id: reviewResolution.id, resolutionHash: reviewResolution.resolutionHash },
      'candidate review resolution',
    ),
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_SCHEMA_VERSION,
    sourceObservation: {
      admittedAt: admission.admittedAt,
      artifactPreparationResolvedAt: artifactPreparationResolution.resolvedAt,
      artifactRequestedAt: artifactRequest.createdAt,
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      itemStoredAt: item.storedAt,
      projectedAt: projection.projectedAt,
      reviewResolvedAt: reviewResolution.resolvedAt,
    },
    status: 'private-answer-quality-case-enrichment-candidate-awaiting-review',
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace: workspaceReference(
      { id: workspace.id, workspaceHash: workspace.workspaceHash },
      'candidate workspace',
    ),
  };
}

function normalizeSummary(value) {
  requireKeys(value, SUMMARY_KEYS, 'candidate input summary');
  for (const field of ['answerHash', 'criteriaHash', 'inputHash', 'retrievalInputHash']) {
    if (!isSha256(value[field])) {
      throw new Error('Fine-tuning private answer quality enrichment candidate input summary is invalid.');
    }
  }
  for (const field of SUMMARY_KEYS.filter((key) => key.endsWith('Count'))) {
    if (!Number.isSafeInteger(value[field]) || value[field] < 0 || value[field] > MAX_SOURCE_ITEMS) {
      throw new Error('Fine-tuning private answer quality enrichment candidate input summary is invalid.');
    }
  }
  if (
    value.citedSourceKeyCount === 0 ||
    value.expectedSourceKeyCount === 0 ||
    value.requiredAnswerTermCount === 0
  ) {
    throw new Error('Fine-tuning private answer quality enrichment candidate input summary is invalid.');
  }
  return { ...value };
}

function ratio(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(4)) : null;
}

function normalizePrecheck(value, summary) {
  requireKeys(value, ['counts', 'metrics', 'precheckHash', 'status'], 'candidate precheck');
  requireKeys(value.counts, COUNT_KEYS, 'candidate precheck counts');
  requireKeys(value.metrics, METRIC_KEYS, 'candidate precheck metrics');
  const counts = Object.fromEntries(COUNT_KEYS.map((key) => {
    const count = value.counts[key];
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_PRECHECK_COUNT) {
      throw new Error('Fine-tuning private answer quality enrichment candidate precheck count is invalid.');
    }
    return [key, count];
  }));
  const expectedMetrics = {
    citationGroundingRate: ratio(counts.groundedCitationCount, counts.citedSourceCount),
    expectedSourceCitationRate: ratio(counts.citedExpectedSourceCount, counts.expectedSourceCount),
    forbiddenRetrievedSourceCount: counts.forbiddenRetrievedSourceCount,
    forbiddenTermMatchCount: counts.forbiddenTermMatchCount,
    requiredTermCoverage: ratio(counts.requiredTermMatchCount, counts.requiredTermCount),
    retrievalHitRate: ratio(counts.retrievedExpectedSourceCount, counts.expectedSourceCount),
    unsupportedCitationRate: ratio(counts.unsupportedCitationCount, counts.citedSourceCount) ?? 0,
  };
  const validRelations =
    counts.citedSourceCount === counts.citedExpectedSourceCount &&
    counts.citedExpectedSourceCount === counts.expectedSourceCount &&
    counts.groundedCitationCount === counts.citedSourceCount &&
    counts.requiredTermMatchCount <= counts.requiredTermCount &&
    counts.retrievedExpectedSourceCount <= counts.expectedSourceCount &&
    counts.retrievedExpectedSourceCount <= counts.retrievedSourceCount &&
    counts.unsupportedCitationCount <= counts.citedSourceCount &&
    counts.citedSourceCount === summary.citedSourceKeyCount &&
    summary.citedSourceKeyCount === summary.expectedSourceKeyCount &&
    counts.expectedSourceCount === summary.expectedSourceKeyCount &&
    counts.requiredTermCount === summary.requiredAnswerTermCount;
  const reviewerFreePass =
    expectedMetrics.retrievalHitRate === 1 &&
    expectedMetrics.expectedSourceCitationRate === 1 &&
    expectedMetrics.citationGroundingRate === 1 &&
    expectedMetrics.requiredTermCoverage === 1 &&
    expectedMetrics.unsupportedCitationRate === 0 &&
    expectedMetrics.forbiddenRetrievedSourceCount === 0 &&
    expectedMetrics.forbiddenTermMatchCount === 0;
  if (
    !validRelations ||
    !reviewerFreePass ||
    value.status !== 'passed' ||
    JSON.stringify(value.metrics) !== JSON.stringify(expectedMetrics) ||
    !isSha256(value.precheckHash) ||
    value.precheckHash !== hash({ counts, metrics: expectedMetrics, status: 'passed' })
  ) {
    throw new Error('Fine-tuning private answer quality enrichment candidate precheck integrity failed.');
  }
  return {
    counts,
    metrics: expectedMetrics,
    precheckHash: value.precheckHash,
    status: 'passed',
  };
}

function rebuild(value) {
  requireKeys(value, [
    'actualModelTrainingExecuted',
    'actualUserDataCollected',
    'admission',
    'answerQualityCaseCreated',
    'answerQualityCaseEnrichmentCandidateCreated',
    'artifactPreparationAuthorized',
    'artifactPreparationResolution',
    'artifactRequest',
    'bindings',
    'candidateReviewCreated',
    'contentCopied',
    'dataOrigin',
    'deploymentAuthorized',
    'externalProviderCalls',
    'externalSubmissionAuthorized',
    'fineTuningExecutionAuthorized',
    'inputSummary',
    'item',
    'itemPathStored',
    'observedAt',
    'payloadStored',
    'precheck',
    'productionReadyClaim',
    'projection',
    'providerSubmissionAuthorized',
    'q1ContractSatisfied',
    'reviewerReviewRequired',
    'reviewerVerdict',
    'reviewResolution',
    'schemaVersion',
    'sourceObservation',
    'status',
    'trainingAuthorized',
    'trainingSubmissionCreated',
    'workspace',
  ], 'candidate');

  const admission = admissionReference(value.admission, 'candidate admission');
  const workspace = workspaceReference(value.workspace, 'candidate workspace');
  const item = itemReference(value.item, 'candidate item');
  const projection = projectionReference(value.projection, 'candidate projection');
  const reviewResolution = reviewResolutionReference(
    value.reviewResolution,
    'candidate review resolution',
  );
  const artifactRequest = artifactRequestReference(
    value.artifactRequest,
    'candidate artifact request',
  );
  const artifactPreparationResolution = artifactPreparationResolutionReference(
    value.artifactPreparationResolution,
    'candidate artifact preparation resolution',
  );
  const inputSummary = normalizeSummary(value.inputSummary);
  const precheck = normalizePrecheck(value.precheck, inputSummary);
  requireKeys(value.bindings, CANDIDATE_BINDING_KEYS, 'candidate bindings');
  const bindings = Object.fromEntries(CANDIDATE_BINDING_KEYS.map((key) => [key, value.bindings[key]]));
  if (Object.values(bindings).some((binding) => !isSha256(binding))) {
    throw new Error('Fine-tuning private answer quality enrichment candidate bindings are invalid.');
  }
  requireKeys(value.sourceObservation, OBSERVATION_KEYS, 'candidate source observation');
  const sourceObservation = Object.fromEntries(
    OBSERVATION_KEYS.map((key) => [key, timestamp(value.sourceObservation[key], `source observation ${key}`)]),
  );
  const observedAt = timestamp(value.observedAt, 'observedAt');

  const expected = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission,
    answerQualityCaseCreated: false,
    answerQualityCaseEnrichmentCandidateCreated: true,
    artifactPreparationAuthorized: true,
    artifactPreparationResolution,
    artifactRequest,
    bindings,
    candidateReviewCreated: false,
    contentCopied: false,
    dataOrigin: 'curated-synthetic',
    deploymentAuthorized: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    inputSummary,
    item,
    itemPathStored: false,
    observedAt,
    payloadStored: false,
    precheck,
    productionReadyClaim: false,
    projection,
    providerSubmissionAuthorized: false,
    q1ContractSatisfied: false,
    reviewerReviewRequired: true,
    reviewerVerdict: 'not-reviewed',
    reviewResolution,
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_ENRICHMENT_CANDIDATE_SCHEMA_VERSION,
    sourceObservation,
    status: 'private-answer-quality-case-enrichment-candidate-awaiting-review',
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace,
  };
  if (
    bindings.admissionHash !== admission.admissionHash ||
    bindings.workspaceHash !== workspace.workspaceHash ||
    bindings.itemHash !== item.itemHash ||
    bindings.projectionHash !== projection.projectionHash ||
    bindings.itemReviewResolutionHash !== reviewResolution.resolutionHash ||
    bindings.artifactRequestHash !== artifactRequest.artifactRequestHash ||
    bindings.artifactPreparationResolutionHash !==
      artifactPreparationResolution.artifactPreparationResolutionHash ||
    bindings.answerQualityCaseEnrichmentInputHash !== inputSummary.inputHash ||
    Date.parse(sourceObservation.admittedAt) > Date.parse(sourceObservation.itemStoredAt) ||
    Date.parse(sourceObservation.itemStoredAt) > Date.parse(sourceObservation.projectedAt) ||
    Date.parse(sourceObservation.projectedAt) > Date.parse(sourceObservation.reviewResolvedAt) ||
    Date.parse(sourceObservation.reviewResolvedAt) > Date.parse(sourceObservation.artifactRequestedAt) ||
    Date.parse(sourceObservation.artifactRequestedAt) >
      Date.parse(sourceObservation.artifactPreparationResolvedAt) ||
    Date.parse(sourceObservation.artifactPreparationResolvedAt) > Date.parse(observedAt) ||
    Date.parse(observedAt) >= Date.parse(sourceObservation.expiresAt) ||
    Date.parse(observedAt) >= Date.parse(sourceObservation.deleteBy) ||
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    throw new Error('Fine-tuning private answer quality enrichment candidate integrity failed.');
  }
  return expected;
}

export function buildFineTuningPrivateAnswerQualityEnrichmentCandidate(input = {}) {
  const value = buildContent(input);
  const candidateHash = hash(value);
  return {
    ...value,
    candidateHash,
    id: `private-answer-quality-case-${value.item.itemHash}`,
  };
}

export function assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(candidate) {
  const { candidateHash, id, ...value } = candidate || {};
  const expected = rebuild(value);
  const expectedHash = hash(expected);
  if (
    JSON.stringify(value) !== JSON.stringify(expected) ||
    candidateHash !== expectedHash ||
    id !== `private-answer-quality-case-${expected.item.itemHash}`
  ) {
    throw new Error('Fine-tuning private answer quality enrichment candidate integrity failed.');
  }
  return candidate;
}
