import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateCollectionItemAdmission,
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from './fine-tuning-private-collection-item-admission.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
  normalizeTrainingText,
} from './training-content-safety.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_SANITIZED_ITEM_INPUT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-sanitized-item-input/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item/v1';

const BINDING_FIELDS = Object.freeze([
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

const DATA_ORIGINS = new Set([
  'consented-deidentified-user-data',
  'curated-synthetic',
  'owner-authored',
]);

const LANE_CAPACITY = Object.freeze({
  'answer-quality-cases': 8,
  'reviewed-examples': 16,
});

const MAX_FIELD_BYTES = 16 * 1024;
const MAX_COMBINED_BYTES = 32 * 1024;

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
    throw new Error(`Fine-tuning private collection item ${fieldName} fields are invalid.`);
  }
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Fine-tuning private collection item ${fieldName} must be a valid timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

function assertSafeTrainingText(value, fieldName) {
  if (typeof value !== 'string') {
    throw new Error(`Fine-tuning private collection item ${fieldName} must be text.`);
  }
  if (
    /\u0000/u.test(value) ||
    /[\u061c\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(value) ||
    /[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value)
  ) {
    throw new Error(`Fine-tuning private collection item ${fieldName} contains prohibited controls.`);
  }

  const normalized = normalizeTrainingText(value);
  const bytes = Buffer.byteLength(normalized, 'utf8');
  if (bytes <= 0 || bytes > MAX_FIELD_BYTES) {
    throw new Error(`Fine-tuning private collection item ${fieldName} size is invalid.`);
  }
  if (containsTrainingSecret(normalized)) {
    throw new Error(`Fine-tuning private collection item ${fieldName} contains a secret.`);
  }
  if (containsRawCustomerPayload(normalized) || containsRawJson(normalized)) {
    throw new Error(`Fine-tuning private collection item ${fieldName} contains raw customer data.`);
  }
  if (
    /\b(?:customer|tenant|user|account)[ _-]?(?:id|identifier|email|phone|number)\b/iu.test(normalized) ||
    /\b\+?[0-9][0-9(). -]{7,}[0-9]\b/u.test(normalized)
  ) {
    throw new Error(`Fine-tuning private collection item ${fieldName} contains customer identifiers.`);
  }
  return normalized;
}

function containsRawJson(value) {
  if (!/^[\[{]/u.test(value)) {
    return false;
  }
  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed && typeof parsed === 'object');
  } catch {
    return false;
  }
}

function normalizeAdmissionReference(admission) {
  requireExactKeys(admission, ['admissionHash', 'id'], 'input.admission');
  if (
    !isSha256(admission.admissionHash) ||
    admission.id !== `fine-tuning-private-collection-item-admission-${admission.admissionHash}`
  ) {
    throw new Error('Fine-tuning private collection item admission reference is invalid.');
  }
  return {
    admissionHash: admission.admissionHash,
    id: admission.id,
  };
}

function normalizeExample(example) {
  requireExactKeys(example, ['instruction', 'response'], 'input.example');
  const instruction = assertSafeTrainingText(example.instruction, 'input.example.instruction');
  const response = assertSafeTrainingText(example.response, 'input.example.response');
  if (Buffer.byteLength(instruction, 'utf8') + Buffer.byteLength(response, 'utf8') > MAX_COMBINED_BYTES) {
    throw new Error('Fine-tuning private collection item input.example combined size is invalid.');
  }
  return { instruction, response };
}

function normalizeSanitization(sanitization) {
  requireExactKeys(
    sanitization,
    [
      'directIdentifiersRemoved',
      'evidenceSha256',
      'freeTextReviewed',
      'methodVersion',
      'policyId',
      'reidentificationProhibited',
      'reviewedAt',
      'reviewerRole',
      'secretsScanned',
    ],
    'input.sanitization',
  );
  if (
    sanitization.policyId !== 'deidentify-before-content-admission-v1' ||
    !isSha256(sanitization.evidenceSha256) ||
    sanitization.methodVersion !== 'private-sanitized-training-text-v1' ||
    sanitization.reviewerRole !== 'quality-reviewer' ||
    sanitization.directIdentifiersRemoved !== true ||
    sanitization.freeTextReviewed !== true ||
    sanitization.secretsScanned !== true ||
    sanitization.reidentificationProhibited !== true
  ) {
    throw new Error('Fine-tuning private collection item input.sanitization is invalid.');
  }
  return {
    directIdentifiersRemoved: true,
    evidenceSha256: sanitization.evidenceSha256,
    freeTextReviewed: true,
    methodVersion: 'private-sanitized-training-text-v1',
    policyId: 'deidentify-before-content-admission-v1',
    reidentificationProhibited: true,
    reviewedAt: requireTimestamp(sanitization.reviewedAt, 'input.sanitization.reviewedAt'),
    reviewerRole: 'quality-reviewer',
    secretsScanned: true,
  };
}

function normalizeInput(input) {
  requireExactKeys(
    input,
    ['admission', 'dataOrigin', 'example', 'sanitization', 'schemaVersion'],
    'input',
  );
  if (input.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_SANITIZED_ITEM_INPUT_SCHEMA_VERSION) {
    throw new Error('Fine-tuning private collection item input schema is invalid.');
  }
  if (!DATA_ORIGINS.has(input.dataOrigin)) {
    throw new Error('Fine-tuning private collection item data origin is invalid.');
  }
  return {
    admission: normalizeAdmissionReference(input.admission),
    dataOrigin: input.dataOrigin,
    example: normalizeExample(input.example),
    sanitization: normalizeSanitization(input.sanitization),
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_SANITIZED_ITEM_INPUT_SCHEMA_VERSION,
  };
}

function assertAdmissionMatrix(admission, content) {
  if (
    admission.envelope.redaction.policyId !== content.sanitization.policyId ||
    admission.envelope.redaction.evidenceSha256 !== content.sanitization.evidenceSha256
  ) {
    throw new Error('Fine-tuning private collection item sanitization must match admission redaction.');
  }
  const expectedConsent = content.dataOrigin === 'consented-deidentified-user-data'
    ? 'recorded'
    : 'not-required-owner-authored';
  if (admission.envelope.privacy.consentStatus !== expectedConsent) {
    throw new Error('Fine-tuning private collection item origin consent matrix is invalid.');
  }
}

function normalizeBindings(bindings) {
  requireExactKeys(bindings, BINDING_FIELDS, 'bindings');
  if (BINDING_FIELDS.some((field) => !isSha256(bindings[field]))) {
    throw new Error('Fine-tuning private collection item bindings are invalid.');
  }
  return Object.fromEntries(BINDING_FIELDS.map((field) => [field, bindings[field]]));
}

function normalizeWorkspace(workspace) {
  requireExactKeys(workspace, ['id', 'workspaceHash'], 'workspace');
  if (
    !isSha256(workspace.workspaceHash) ||
    workspace.id !== `fine-tuning-private-collection-workspace-${workspace.workspaceHash}`
  ) {
    throw new Error('Fine-tuning private collection item workspace is invalid.');
  }
  return { id: workspace.id, workspaceHash: workspace.workspaceHash };
}

function normalizeRetention(retention) {
  requireExactKeys(
    retention,
    ['deleteBy', 'evidenceSha256', 'policyId', 'withdrawalReferenceSha256'],
    'retention',
  );
  const deleteBy = requireTimestamp(retention.deleteBy, 'retention.deleteBy');
  if (
    retention.policyId !== 'delete-by-expiry-or-withdrawal-v1' ||
    !isSha256(retention.evidenceSha256) ||
    !isSha256(retention.withdrawalReferenceSha256)
  ) {
    throw new Error('Fine-tuning private collection item retention is invalid.');
  }
  return {
    deleteBy,
    evidenceSha256: retention.evidenceSha256,
    policyId: 'delete-by-expiry-or-withdrawal-v1',
    withdrawalReferenceSha256: retention.withdrawalReferenceSha256,
  };
}

function buildBindings(admission, content) {
  return {
    ...admission.bindings,
    admissionHash: admission.admissionHash,
    contentHash: hashRecord(content.example),
    sanitizationHash: hashRecord(content.sanitization),
  };
}

function assembleContent({ admission, bindings, content, storedAt }) {
  const normalizedAdmission = normalizeAdmissionReference({
    admissionHash: admission.admissionHash,
    id: admission.id,
  });
  const workspace = normalizeWorkspace(admission.workspace);
  const retention = normalizeRetention(admission.envelope.retention);
  const normalizedBindings = normalizeBindings(bindings);
  if (
    normalizedBindings.admissionHash !== admission.admissionHash ||
    normalizedBindings.workspaceHash !== workspace.workspaceHash ||
    normalizedBindings.contentHash !== hashRecord(content.example) ||
    normalizedBindings.sanitizationHash !== hashRecord(content.sanitization)
  ) {
    throw new Error('Fine-tuning private collection item bindings are inconsistent.');
  }
  const normalizedStoredAt = requireTimestamp(storedAt, 'storedAt');
  const expiresAt = requireTimestamp(admission.expiresAt, 'expiresAt');
  const reviewedAt = requireTimestamp(
    content.sanitization.reviewedAt,
    'input.sanitization.reviewedAt',
  );
  if (
    Date.parse(reviewedAt) > Date.parse(normalizedStoredAt) ||
    (admission.admittedAt !== undefined &&
      Date.parse(reviewedAt) < Date.parse(requireTimestamp(
        admission.admittedAt,
        'admission.admittedAt',
      )))
  ) {
    throw new Error('Fine-tuning private collection item sanitization timing is invalid.');
  }
  if (
    Date.parse(normalizedStoredAt) >= Date.parse(expiresAt) ||
    Date.parse(normalizedStoredAt) >= Date.parse(retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private collection item retention or approval expired.');
  }
  if (!Object.hasOwn(LANE_CAPACITY, admission.envelope.lane)) {
    throw new Error('Fine-tuning private collection item lane is invalid.');
  }

  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: content.dataOrigin !== 'curated-synthetic',
    admission: normalizedAdmission,
    approvedTrainingRecordCreated: false,
    answerQualityCaseCreated: false,
    bindings: normalizedBindings,
    candidateTrainingReviewAllowed: false,
    collectionContentStored: true,
    collectionEnvelopeCount: 1,
    collectionItemCount: 1,
    collectionStarted: true,
    consentIndependentlyVerified: false,
    dataOrigin: content.dataOrigin,
    dataHandlingEvidenceIndependentlyVerified: false,
    deidentificationIndependentlyVerified: false,
    deletionExecuted: false,
    example: content.example,
    expiresAt,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    lane: admission.envelope.lane,
    ownerDecisionRecorded: false,
    ownerIdentityVerified: false,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    retention,
    retentionPolicyIndependentlyVerified: false,
    sanitizedContentStored: true,
    sanitization: content.sanitization,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_SCHEMA_VERSION,
    sourceDataIncluded: content.dataOrigin === 'consented-deidentified-user-data',
    status: 'private-collection-item-stored-training-not-authorized',
    storedAt: normalizedStoredAt,
    trainingAuthorized: false,
    usageBasisIndependentlyVerified: false,
    withdrawalExecuted: false,
    workspace,
    workspaceContainsCollectionData: true,
    workspaceMutationPerformed: true,
  };
}

function buildContent({ admission, content, storedAt }) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  const normalizedContent = normalizeInput(content);
  if (
    normalizedContent.admission.id !== admission.id ||
    normalizedContent.admission.admissionHash !== admission.admissionHash
  ) {
    throw new Error('Fine-tuning private collection item must bind the exact admission.');
  }
  assertAdmissionMatrix(admission, normalizedContent);
  return assembleContent({
    admission,
    bindings: buildBindings(admission, normalizedContent),
    content: normalizedContent,
    storedAt,
  });
}

function rebuildStoredContent(content) {
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
      'collectionContentStored',
      'collectionEnvelopeCount',
      'collectionItemCount',
      'collectionStarted',
      'consentIndependentlyVerified',
      'dataOrigin',
      'dataHandlingEvidenceIndependentlyVerified',
      'deidentificationIndependentlyVerified',
      'deletionExecuted',
      'example',
      'expiresAt',
      'externalProviderCalls',
      'externalSubmissionAuthorized',
      'lane',
      'ownerDecisionRecorded',
      'ownerIdentityVerified',
      'productionReadyClaim',
      'rawTrainingContentStored',
      'retention',
      'retentionPolicyIndependentlyVerified',
      'sanitizedContentStored',
      'sanitization',
      'schemaVersion',
      'sourceDataIncluded',
      'status',
      'storedAt',
      'trainingAuthorized',
      'usageBasisIndependentlyVerified',
      'withdrawalExecuted',
      'workspace',
      'workspaceContainsCollectionData',
      'workspaceMutationPerformed',
    ],
    'record',
  );
  const admission = {
    admissionHash: content.admission.admissionHash,
    id: content.admission.id,
    bindings: {
      ...content.bindings,
    },
    envelope: {
      lane: content.lane,
      retention: content.retention,
    },
    expiresAt: content.expiresAt,
    workspace: content.workspace,
  };
  const input = {
    admission: content.admission,
    dataOrigin: content.dataOrigin,
    example: content.example,
    sanitization: content.sanitization,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_SANITIZED_ITEM_INPUT_SCHEMA_VERSION,
  };
  const normalizedInput = normalizeInput(input);
  const expected = assembleContent({
    admission,
    bindings: content.bindings,
    content: normalizedInput,
    storedAt: content.storedAt,
  });
  if (
    content.actualModelTrainingExecuted !== false ||
    content.actualUserDataCollected !== (content.dataOrigin !== 'curated-synthetic') ||
    content.approvedTrainingRecordCreated !== false ||
    content.answerQualityCaseCreated !== false ||
    content.candidateTrainingReviewAllowed !== false ||
    content.collectionContentStored !== true ||
    content.collectionEnvelopeCount !== 1 ||
    content.collectionItemCount !== 1 ||
    content.collectionStarted !== true ||
    content.consentIndependentlyVerified !== false ||
    content.dataHandlingEvidenceIndependentlyVerified !== false ||
    content.deidentificationIndependentlyVerified !== false ||
    content.deletionExecuted !== false ||
    content.externalProviderCalls !== 'none' ||
    content.externalSubmissionAuthorized !== false ||
    content.ownerDecisionRecorded !== false ||
    content.ownerIdentityVerified !== false ||
    content.productionReadyClaim !== false ||
    content.rawTrainingContentStored !== false ||
    content.retentionPolicyIndependentlyVerified !== false ||
    content.sanitizedContentStored !== true ||
    content.sourceDataIncluded !== (content.dataOrigin === 'consented-deidentified-user-data') ||
    content.status !== 'private-collection-item-stored-training-not-authorized' ||
    content.trainingAuthorized !== false ||
    content.usageBasisIndependentlyVerified !== false ||
    content.withdrawalExecuted !== false ||
    content.workspaceContainsCollectionData !== true ||
    content.workspaceMutationPerformed !== true ||
    JSON.stringify(content) !== JSON.stringify(expected)
  ) {
    throw new Error('Fine-tuning private collection item integrity failed.');
  }
  return expected;
}

export function buildFineTuningPrivateCollectionItem(input = {}) {
  const content = buildContent(input);
  const itemHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-item-${itemHash}`,
    itemHash,
  };
}

export function assertFineTuningPrivateCollectionItemRecord(item) {
  const { id, itemHash, ...content } = item || {};
  const expected = rebuildStoredContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    itemHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item integrity failed.');
  }
  return item;
}

export function assertFineTuningPrivateCollectionItem(item, sources = {}) {
  assertFineTuningPrivateCollectionItemRecord(item);
  const { admission } = sources;
  if (!admission || item.admission.id !== admission.id || item.admission.admissionHash !== admission.admissionHash) {
    throw new Error('Fine-tuning private collection item must bind the exact admission.');
  }
  assertFineTuningPrivateCollectionItemAdmission(admission, {
    ...sources,
    now: item.storedAt,
  });
  const expected = buildContent({
    admission,
    content: {
      admission: item.admission,
      dataOrigin: item.dataOrigin,
      example: item.example,
      sanitization: item.sanitization,
      schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_SANITIZED_ITEM_INPUT_SCHEMA_VERSION,
    },
    storedAt: item.storedAt,
  });
  const expectedHash = hashRecord(expected);
  if (JSON.stringify(item) !== JSON.stringify({
    ...expected,
    id: `fine-tuning-private-collection-item-${expectedHash}`,
    itemHash: expectedHash,
  })) {
    throw new Error('Fine-tuning private collection item does not match the current F1 chain.');
  }
  if (sources.now !== undefined) {
    const now = requireTimestamp(sources.now, 'now');
    if (Date.parse(now) >= Date.parse(item.expiresAt) || Date.parse(now) >= Date.parse(item.retention.deleteBy)) {
      throw new Error('Fine-tuning private collection item retention or approval expired.');
    }
  }
  return item;
}

export function getFineTuningPrivateCollectionItemLaneCapacity(lane) {
  if (!Object.hasOwn(LANE_CAPACITY, lane)) {
    throw new Error('Fine-tuning private collection item lane is invalid.');
  }
  return LANE_CAPACITY[lane];
}
