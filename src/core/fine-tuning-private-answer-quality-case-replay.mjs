import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateAnswerQualityCaseRecord,
  FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
} from './fine-tuning-private-answer-quality-case.mjs';
import { assertFineTuningPrivateAnswerQualityCasePayloadRecord } from './fine-tuning-private-answer-quality-case-payload.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';
import { evaluateAnswerQualityCase } from './answer-quality-evaluation.mjs';

export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_REQUEST_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-case-replay-request/v1';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-case-replay/v1';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_PURPOSE =
  'local-frozen-q1-payload-replay-only';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_TARGET =
  'private-answer-quality-case-payload-replay';

const REQUEST_INPUT_KEYS = Object.freeze([
  'answerQualityCase',
  'confirmationToken',
  'evidenceSha256',
  'expiresAt',
  'item',
  'payload',
  'purpose',
  'requestedAt',
  'requestedByRole',
  'schemaVersion',
  'target',
  'workspace',
]);
const REQUEST_RECORD_KEYS = Object.freeze([
  'confirmationTokenSha256',
  'evidenceSha256',
  'expiresAt',
  'purpose',
  'requestedAt',
  'requestedByRole',
  'schemaVersion',
  'target',
]);
const RECEIPT_KEYS = Object.freeze([
  'actualModelEvaluated',
  'actualModelTrainingExecuted',
  'actualUserDataCollected',
  'answerQualityCase',
  'bindings',
  'counts',
  'deploymentAuthorized',
  'evaluationStatus',
  'evidenceIndependentlyVerified',
  'externalProviderCalls',
  'externalSubmissionAuthorized',
  'fineTuningExecutionAuthorized',
  'item',
  'metrics',
  'payload',
  'productionReadyClaim',
  'providerSubmissionAuthorized',
  'replayCompletedAt',
  'replayRequest',
  'schemaVersion',
  'sourceObservation',
  'status',
  'trainingAuthorized',
  'workspace',
]);
const COUNT_KEYS = Object.freeze([
  'citedExpectedSourceCount', 'citedSourceCount', 'expectedSourceCount',
  'forbiddenRetrievedSourceCount', 'forbiddenTermMatchCount', 'groundedCitationCount',
  'requiredTermCount', 'requiredTermMatchCount', 'retrievedExpectedSourceCount',
  'retrievedSourceCount', 'unsupportedCitationCount',
]);
const METRIC_KEYS = Object.freeze([
  'citationGroundingRate', 'expectedSourceCitationRate', 'forbiddenRetrievedSourceCount',
  'forbiddenTermMatchCount', 'requiredTermCoverage', 'retrievalHitRate',
  'unsupportedCitationRate',
]);

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function exactKeys(value, keys, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())
  ) {
    throw new Error(`Fine-tuning private answer quality case replay ${label} fields are invalid.`);
  }
}

function isHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function timestamp(value, label) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Fine-tuning private answer quality case replay ${label} timestamp is invalid.`);
  }
  return new Date(parsed).toISOString();
}

function reference(value, field, prefix, label) {
  exactKeys(value, ['id', field], label);
  if (!isHash(value[field]) || value.id !== `${prefix}${value[field]}`) {
    throw new Error(`Fine-tuning private answer quality case replay ${label} is invalid.`);
  }
  return { id: value.id, [field]: value[field] };
}

function copyReference(value, field, prefix, label) {
  return reference({ id: value.id, [field]: value[field] }, field, prefix, label);
}

function requestEnvelope({ answerQualityCase, item, payload, requestRecord, workspace }) {
  return { answerQualityCase, item, payload, requestRecord, workspace };
}

function assertCounts(value) {
  exactKeys(value, COUNT_KEYS, 'receipt counts');
  if (!Object.values(value).every((entry) => Number.isInteger(entry) && entry >= 0)) {
    throw new Error('Fine-tuning private answer quality case replay receipt counts are invalid.');
  }
}

function assertMetrics(value) {
  exactKeys(value, METRIC_KEYS, 'receipt metrics');
  for (const [key, entry] of Object.entries(value)) {
    const count = key.endsWith('Count');
    if (count ? !Number.isInteger(entry) || entry < 0 : !Number.isFinite(entry) || entry < 0 || entry > 1) {
      throw new Error('Fine-tuning private answer quality case replay receipt metrics are invalid.');
    }
  }
}

function normalizeRequest(input, { answerQualityCase, item, payload, workspace }) {
  exactKeys(input, REQUEST_INPUT_KEYS, 'request input');
  const requestedAt = timestamp(input.requestedAt, 'request requestedAt');
  const expiresAt = timestamp(input.expiresAt, 'request expiresAt');
  const expectedToken =
    `replay-private-answer-quality-case-payload:${item.itemHash}:` +
    payload.answerQualityCasePayloadHash;
  const valid =
    input.schemaVersion === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_REQUEST_SCHEMA_VERSION &&
    input.target === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_TARGET &&
    input.purpose === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_PURPOSE &&
    input.requestedByRole === 'local-operator-role' &&
    input.confirmationToken === expectedToken &&
    isHash(input.evidenceSha256) &&
    sameReference(input.workspace, workspace, 'workspaceHash') &&
    sameReference(input.item, item, 'itemHash') &&
    sameReference(input.answerQualityCase, answerQualityCase, 'answerQualityCaseHash') &&
    sameReference(input.payload, payload, 'answerQualityCasePayloadHash') &&
    Date.parse(requestedAt) >= Date.parse(payload.storedAt) &&
    Date.parse(requestedAt) >= Date.parse(answerQualityCase.materializedAt) &&
    Date.parse(requestedAt) < Date.parse(expiresAt) &&
    Date.parse(expiresAt) <= Date.parse(item.expiresAt) &&
    Date.parse(expiresAt) <= Date.parse(item.retention.deleteBy);
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case replay request is invalid.');
  }
  return {
    confirmationTokenSha256: hash(input.confirmationToken),
    evidenceSha256: input.evidenceSha256,
    expiresAt,
    purpose: input.purpose,
    requestedAt,
    requestedByRole: input.requestedByRole,
    schemaVersion: input.schemaVersion,
    target: input.target,
  };
}

function sameReference(left, right, field) {
  return left?.id === right?.id && left?.[field] === right?.[field];
}

function evaluate(payload, answerQualityCase) {
  const result = evaluateAnswerQualityCase(payload.payload.caseDefinition, {
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  const evaluationHash = hash({
    evaluation: result,
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  if (
    result.status !== 'passed' ||
    hash(payload.payload.caseDefinition) !== answerQualityCase.bindings.answerQualityCaseDefinitionHash ||
    evaluationHash !== answerQualityCase.bindings.answerQualityCaseEvaluationHash ||
    JSON.stringify(result.counts) !== JSON.stringify(answerQualityCase.evaluation.counts) ||
    JSON.stringify(result.metrics) !== JSON.stringify(answerQualityCase.evaluation.metrics)
  ) {
    throw new Error('Fine-tuning private answer quality case replay evaluation parity failed.');
  }
  return { evaluationHash, result };
}

function assertLiveBindings({ answerQualityCase, item, payload, workspace }) {
  assertFineTuningPrivateAnswerQualityCaseRecord(answerQualityCase);
  assertFineTuningPrivateAnswerQualityCasePayloadRecord(payload);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  const valid =
    sameReference(payload.workspace, workspace, 'workspaceHash') &&
    sameReference(payload.item, item, 'itemHash') &&
    sameReference(payload.answerQualityCase, answerQualityCase, 'answerQualityCaseHash') &&
    payload.bindings.answerQualityCaseDefinitionHash === answerQualityCase.bindings.answerQualityCaseDefinitionHash &&
    payload.bindings.answerQualityCaseEvaluationHash === answerQualityCase.bindings.answerQualityCaseEvaluationHash;
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case replay live lineage is invalid.');
  }
}

export function buildFineTuningPrivateAnswerQualityCaseReplayRequest(input = {}) {
  const { answerQualityCase, item, payload, request, workspace } = input;
  assertLiveBindings({ answerQualityCase, item, payload, workspace });
  const requestRecord = normalizeRequest(request, {
    answerQualityCase,
    item,
    payload,
    workspace,
  });
  const answerQualityCaseReference = copyReference(answerQualityCase, 'answerQualityCaseHash', 'fine-tuning-private-answer-quality-case-', 'request answer quality case');
  const itemReference = copyReference(item, 'itemHash', 'fine-tuning-private-collection-item-', 'request item');
  const payloadReference = copyReference(payload, 'answerQualityCasePayloadHash', 'fine-tuning-private-answer-quality-case-payload-', 'request payload');
  const workspaceReference = copyReference(workspace, 'workspaceHash', 'fine-tuning-private-collection-workspace-', 'request workspace');
  const replayRequestHash = hash(requestEnvelope({
    answerQualityCase: answerQualityCaseReference, item: itemReference, payload: payloadReference,
    requestRecord, workspace: workspaceReference,
  }));
  return {
    answerQualityCase: answerQualityCaseReference,
    id: `fine-tuning-private-answer-quality-case-replay-request-${replayRequestHash}`,
    item: itemReference,
    payload: payloadReference,
    replayRequestHash,
    requestRecord,
    workspace: workspaceReference,
  };
}

export function assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(value) {
  exactKeys(value, ['answerQualityCase', 'id', 'item', 'payload', 'replayRequestHash', 'requestRecord', 'workspace'], 'stored request');
  const answerQualityCase = reference(value.answerQualityCase, 'answerQualityCaseHash', 'fine-tuning-private-answer-quality-case-', 'stored request answer quality case');
  const item = reference(value.item, 'itemHash', 'fine-tuning-private-collection-item-', 'stored request item');
  const payload = reference(value.payload, 'answerQualityCasePayloadHash', 'fine-tuning-private-answer-quality-case-payload-', 'stored request payload');
  const workspace = reference(value.workspace, 'workspaceHash', 'fine-tuning-private-collection-workspace-', 'stored request workspace');
  exactKeys(value.requestRecord, REQUEST_RECORD_KEYS, 'stored request record');
  const record = value.requestRecord;
  const valid =
    record.confirmationTokenSha256 === hash(`replay-private-answer-quality-case-payload:${item.itemHash}:${payload.answerQualityCasePayloadHash}`) &&
    isHash(record.evidenceSha256) &&
    record.expiresAt === timestamp(record.expiresAt, 'stored request expiresAt') &&
    record.requestedAt === timestamp(record.requestedAt, 'stored request requestedAt') &&
    record.schemaVersion === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_REQUEST_SCHEMA_VERSION &&
    record.target === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_TARGET &&
    record.purpose === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_PURPOSE &&
    record.requestedByRole === 'local-operator-role' &&
    Date.parse(record.requestedAt) < Date.parse(record.expiresAt) &&
    value.replayRequestHash === hash(requestEnvelope({ answerQualityCase, item, payload, requestRecord: record, workspace })) &&
    value.id === `fine-tuning-private-answer-quality-case-replay-request-${value.replayRequestHash}` &&
    answerQualityCase.id === value.answerQualityCase.id && item.id === value.item.id &&
    payload.id === value.payload.id && workspace.id === value.workspace.id;
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case replay stored request is invalid.');
  }
  return value;
}

export function assertFineTuningPrivateAnswerQualityCaseReplayRequest(value, input = {}) {
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(value);
  const expected = buildFineTuningPrivateAnswerQualityCaseReplayRequest(input);
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private answer quality case replay request does not match live inputs.');
  }
  return value;
}

export function buildFineTuningPrivateAnswerQualityCaseReplay(input = {}) {
  const { answerQualityCase, item, payload, replayCompletedAt, request, workspace } = input;
  assertLiveBindings({ answerQualityCase, item, payload, workspace });
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(request);
  const at = timestamp(replayCompletedAt, 'replayCompletedAt');
  const evaluated = evaluate(payload, answerQualityCase);
  const validTime =
    Date.parse(at) > Date.parse(request.requestRecord.requestedAt) &&
    Date.parse(at) < Date.parse(request.requestRecord.expiresAt) &&
    Date.parse(at) < Date.parse(item.expiresAt) &&
    Date.parse(at) < Date.parse(item.retention.deleteBy);
  if (!validTime) {
    throw new Error('Fine-tuning private answer quality case replay window is invalid.');
  }
  const content = {
    actualModelEvaluated: false,
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    answerQualityCase: copyReference(answerQualityCase, 'answerQualityCaseHash', 'fine-tuning-private-answer-quality-case-', 'receipt answer quality case'),
    bindings: {
      answerQualityCaseDefinitionHash: answerQualityCase.bindings.answerQualityCaseDefinitionHash,
      answerQualityCaseEvaluationHash: answerQualityCase.bindings.answerQualityCaseEvaluationHash,
      answerQualityCasePayloadHash: payload.answerQualityCasePayloadHash,
      payloadContentHash: payload.bindings.payloadContentHash,
      replayRequestHash: request.replayRequestHash,
    },
    counts: evaluated.result.counts,
    deploymentAuthorized: false,
    evaluationStatus: evaluated.result.status,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item: copyReference(item, 'itemHash', 'fine-tuning-private-collection-item-', 'receipt item'),
    metrics: evaluated.result.metrics,
    payload: copyReference(payload, 'answerQualityCasePayloadHash', 'fine-tuning-private-answer-quality-case-payload-', 'receipt payload'),
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    replayCompletedAt: at,
    replayRequest: { id: request.id, replayRequestHash: request.replayRequestHash },
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_SCHEMA_VERSION,
    sourceObservation: {
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      payloadStoredAt: payload.storedAt,
      requestExpiresAt: request.requestRecord.expiresAt,
      requestRequestedAt: request.requestRecord.requestedAt,
    },
    status: 'private-answer-quality-case-payload-replayed-with-frozen-q1',
    trainingAuthorized: false,
    workspace: copyReference(workspace, 'workspaceHash', 'fine-tuning-private-collection-workspace-', 'receipt workspace'),
  };
  const privateAnswerQualityCaseReplayHash = hash(content);
  return {
    ...content,
    id: `fine-tuning-private-answer-quality-case-replay-${privateAnswerQualityCaseReplayHash}`,
    privateAnswerQualityCaseReplayHash,
  };
}

export function assertFineTuningPrivateAnswerQualityCaseReplayRecord(value) {
  const { id, privateAnswerQualityCaseReplayHash, ...content } = value || {};
  exactKeys(content, RECEIPT_KEYS, 'receipt');
  exactKeys(content.bindings, ['answerQualityCaseDefinitionHash', 'answerQualityCaseEvaluationHash', 'answerQualityCasePayloadHash', 'payloadContentHash', 'replayRequestHash'], 'receipt bindings');
  exactKeys(content.replayRequest, ['id', 'replayRequestHash'], 'receipt request');
  exactKeys(content.sourceObservation, ['deleteBy', 'expiresAt', 'payloadStoredAt', 'requestExpiresAt', 'requestRequestedAt'], 'receipt source observation');
  const answerQualityCase = reference(content.answerQualityCase, 'answerQualityCaseHash', 'fine-tuning-private-answer-quality-case-', 'receipt answer quality case');
  const item = reference(content.item, 'itemHash', 'fine-tuning-private-collection-item-', 'receipt item');
  const payload = reference(content.payload, 'answerQualityCasePayloadHash', 'fine-tuning-private-answer-quality-case-payload-', 'receipt payload');
  const workspace = reference(content.workspace, 'workspaceHash', 'fine-tuning-private-collection-workspace-', 'receipt workspace');
  assertCounts(content.counts);
  assertMetrics(content.metrics);
  const staticValues = {
    actualModelEvaluated: false, actualModelTrainingExecuted: false, actualUserDataCollected: false,
    deploymentAuthorized: false, evaluationStatus: 'passed', evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none', externalSubmissionAuthorized: false, fineTuningExecutionAuthorized: false,
    productionReadyClaim: false, providerSubmissionAuthorized: false,
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_REPLAY_SCHEMA_VERSION,
    status: 'private-answer-quality-case-payload-replayed-with-frozen-q1', trainingAuthorized: false,
  };
  const valid =
    Object.entries(staticValues).every(([key, expected]) => content[key] === expected) &&
    Object.values(content.bindings).every(isHash) &&
    content.bindings.answerQualityCasePayloadHash === payload.answerQualityCasePayloadHash &&
    content.replayRequest.id === `fine-tuning-private-answer-quality-case-replay-request-${content.replayRequest.replayRequestHash}` &&
    content.bindings.replayRequestHash === content.replayRequest.replayRequestHash &&
    content.replayCompletedAt === timestamp(content.replayCompletedAt, 'receipt replayCompletedAt') &&
    Object.entries(content.sourceObservation).every(([key, entry]) => entry === timestamp(entry, `receipt ${key}`)) &&
    Date.parse(content.sourceObservation.payloadStoredAt) <= Date.parse(content.sourceObservation.requestRequestedAt) &&
    Date.parse(content.sourceObservation.requestRequestedAt) < Date.parse(content.replayCompletedAt) &&
    Date.parse(content.replayCompletedAt) < Date.parse(content.sourceObservation.requestExpiresAt) &&
    Date.parse(content.replayCompletedAt) < Date.parse(content.sourceObservation.expiresAt) &&
    Date.parse(content.replayCompletedAt) < Date.parse(content.sourceObservation.deleteBy) &&
    privateAnswerQualityCaseReplayHash === hash(content) &&
    id === `fine-tuning-private-answer-quality-case-replay-${privateAnswerQualityCaseReplayHash}` &&
    answerQualityCase.id === content.answerQualityCase.id && item.id === content.item.id &&
    workspace.id === content.workspace.id;
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case replay receipt integrity failed.');
  }
  return value;
}

export function assertFineTuningPrivateAnswerQualityCaseReplayRelation({ receipt, request }) {
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(request);
  assertFineTuningPrivateAnswerQualityCaseReplayRecord(receipt);
  const valid =
    sameReference(receipt.workspace, request.workspace, 'workspaceHash') &&
    sameReference(receipt.item, request.item, 'itemHash') &&
    sameReference(receipt.answerQualityCase, request.answerQualityCase, 'answerQualityCaseHash') &&
    sameReference(receipt.payload, request.payload, 'answerQualityCasePayloadHash') &&
    receipt.replayRequest.id === request.id &&
    receipt.replayRequest.replayRequestHash === request.replayRequestHash &&
    receipt.bindings.replayRequestHash === request.replayRequestHash &&
    receipt.sourceObservation.requestRequestedAt === request.requestRecord.requestedAt &&
    receipt.sourceObservation.requestExpiresAt === request.requestRecord.expiresAt &&
    Date.parse(request.requestRecord.expiresAt) <= Date.parse(receipt.sourceObservation.expiresAt) &&
    Date.parse(request.requestRecord.expiresAt) <= Date.parse(receipt.sourceObservation.deleteBy) &&
    Date.parse(receipt.replayCompletedAt) > Date.parse(request.requestRecord.requestedAt);
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case replay request and receipt relation is invalid.');
  }
  return { receipt, request };
}

export function assertFineTuningPrivateAnswerQualityCaseReplay(value, input = {}) {
  assertFineTuningPrivateAnswerQualityCaseReplayRecord(value);
  const expected = buildFineTuningPrivateAnswerQualityCaseReplay({
    ...input,
    replayCompletedAt: value.replayCompletedAt,
  });
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private answer quality case replay receipt does not match live inputs.');
  }
  assertFineTuningPrivateAnswerQualityCaseReplayRelation({ receipt: value, request: input.request });
  return value;
}
