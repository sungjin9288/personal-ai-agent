import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateAnswerQualityCaseRecord,
  FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
} from './fine-tuning-private-answer-quality-case.mjs';
import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord,
  assertFineTuningPrivateAnswerQualityEnrichmentInput,
} from './fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord } from './fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';
import { evaluateAnswerQualityCase } from './answer-quality-evaluation.mjs';
import { buildRetrievalContext } from './retrieval-service.mjs';

export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_DECISION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-case-payload-decision-input/v1';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-case-payload/v1';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_PURPOSE =
  'local-answer-quality-evaluation-replay-only';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_TARGET =
  'private-answer-quality-case-payload';

const DECISION_INPUT_KEYS = Object.freeze([
  'answerQualityCase',
  'confirmationToken',
  'decidedAt',
  'decidedByRole',
  'decision',
  'evidenceSha256',
  'item',
  'payloadPurpose',
  'schemaVersion',
  'target',
  'workspace',
]);
const DECISION_RECORD_KEYS = Object.freeze([
  'confirmationTokenSha256',
  'decidedAt',
  'decidedByRole',
  'decision',
  'evidenceSha256',
  'payloadPurpose',
  'schemaVersion',
  'target',
]);
const F1_18_BINDING_KEYS = Object.freeze([
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
  'artifactPreparationResolutionHash',
  'answerQualityCaseEnrichmentInputHash',
  'candidateHash',
  'candidateReviewDecisionHash',
  'candidateReviewResolutionHash',
  'answerQualityCaseDefinitionHash',
  'answerQualityCaseEvaluationHash',
]);
const PAYLOAD_BINDING_KEYS = Object.freeze([
  ...F1_18_BINDING_KEYS,
  'answerQualityCaseHash',
  'payloadContentHash',
  'payloadDecisionHash',
]);
const PAYLOAD_RECORD_KEYS = Object.freeze([
  'actualModelTrainingExecuted',
  'actualUserDataCollected',
  'admission',
  'answerQualityCase',
  'bindings',
  'candidate',
  'candidateReviewResolution',
  'contentCopied',
  'dataOrigin',
  'deploymentAuthorized',
  'evidenceIndependentlyVerified',
  'externalProviderCalls',
  'externalSubmissionAuthorized',
  'fineTuningExecutionAuthorized',
  'item',
  'materializationMode',
  'ownerIdentityVerified',
  'payload',
  'payloadDecision',
  'payloadPurpose',
  'payloadStored',
  'productionReadyClaim',
  'providerSubmissionAuthorized',
  'providerSubmissionCreated',
  'q1ContractSatisfied',
  'replayRequiresLivePrivateInput',
  'schemaVersion',
  'sourceObservation',
  'status',
  'storedAt',
  'trainingAuthorized',
  'trainingSubmissionCreated',
  'workspace',
  'workspaceMutationPerformed',
]);

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function exactKeys(value, keys, label) {
  const valid =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort());
  if (!valid) {
    throw new Error(`Fine-tuning private answer quality case payload ${label} fields are invalid.`);
  }
}

function timestamp(value, label) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Fine-tuning private answer quality case payload ${label} timestamp is invalid.`);
  }
  return new Date(parsed).toISOString();
}

function reference(value, field, prefix, label) {
  exactKeys(value, ['id', field], label);
  if (!isHash(value[field]) || value.id !== `${prefix}${value[field]}`) {
    throw new Error(`Fine-tuning private answer quality case payload ${label} is invalid.`);
  }
  return { id: value.id, [field]: value[field] };
}

function copyReference(value, field, prefix, label) {
  return reference({ id: value.id, [field]: value[field] }, field, prefix, label);
}

function candidateReference(value, label) {
  exactKeys(value, ['candidateHash', 'id'], label);
  if (
    !isHash(value.candidateHash) ||
    !/^private-answer-quality-case-[a-f0-9]{64}$/u.test(value.id)
  ) {
    throw new Error(`Fine-tuning private answer quality case payload ${label} is invalid.`);
  }
  return { candidateHash: value.candidateHash, id: value.id };
}

function copyCandidateReference(value, label) {
  return candidateReference(
    { candidateHash: value.candidateHash, id: value.id },
    label,
  );
}

function candidateResolutionReference(value, label) {
  exactKeys(value, ['candidateReviewResolutionHash', 'id'], label);
  if (
    !isHash(value.candidateReviewResolutionHash) ||
    value.id !==
      `fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-${value.candidateReviewResolutionHash}`
  ) {
    throw new Error(`Fine-tuning private answer quality case payload ${label} is invalid.`);
  }
  return {
    candidateReviewResolutionHash: value.candidateReviewResolutionHash,
    id: value.id,
  };
}

function copyCandidateResolutionReference(value, label) {
  return candidateResolutionReference(
    {
      candidateReviewResolutionHash: value.candidateReviewResolutionHash,
      id: value.id,
    },
    label,
  );
}

function sameReference(left, right, field) {
  return left?.id === right?.id && left?.[field] === right?.[field];
}

function assertDecisionWindow(decidedAt, answerQualityCase, item) {
  if (
    Date.parse(decidedAt) < Date.parse(answerQualityCase.materializedAt) ||
    Date.parse(decidedAt) >= Date.parse(item.expiresAt) ||
    Date.parse(decidedAt) >= Date.parse(item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private answer quality case payload decision timing is invalid.');
  }
}

function normalizeDecisionInput(input, { answerQualityCase, item, workspace }) {
  exactKeys(input, DECISION_INPUT_KEYS, 'decision input');
  const decidedAt = timestamp(input.decidedAt, 'decision decidedAt');
  const answerQualityCaseReference = reference(
    input.answerQualityCase,
    'answerQualityCaseHash',
    'fine-tuning-private-answer-quality-case-',
    'decision answer quality case',
  );
  const itemReference = reference(
    input.item,
    'itemHash',
    'fine-tuning-private-collection-item-',
    'decision item',
  );
  const workspaceReference = reference(
    input.workspace,
    'workspaceHash',
    'fine-tuning-private-collection-workspace-',
    'decision workspace',
  );
  const expectedToken =
    `materialize-private-answer-quality-case-payload:${item.itemHash}:` +
    answerQualityCase.answerQualityCaseHash;
  const valid =
    input.schemaVersion ===
      FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_DECISION_SCHEMA_VERSION &&
    ['approve', 'reject'].includes(input.decision) &&
    input.target === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_TARGET &&
    input.payloadPurpose === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_PURPOSE &&
    input.decidedByRole === 'retention-deletion-owner-role' &&
    input.confirmationToken === expectedToken &&
    isHash(input.evidenceSha256) &&
    sameReference(answerQualityCaseReference, answerQualityCase, 'answerQualityCaseHash') &&
    sameReference(itemReference, item, 'itemHash') &&
    sameReference(workspaceReference, workspace, 'workspaceHash');
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case payload decision authority is invalid.');
  }
  assertDecisionWindow(decidedAt, answerQualityCase, item);
  return {
    confirmationTokenSha256: hashText(input.confirmationToken),
    decidedAt,
    decidedByRole: input.decidedByRole,
    decision: input.decision,
    evidenceSha256: input.evidenceSha256,
    payloadPurpose: input.payloadPurpose,
    schemaVersion: input.schemaVersion,
    target: input.target,
  };
}

function assertLiveChain({
  admission,
  answerQualityCase,
  candidate,
  candidateReviewResolution,
  item,
  workspace,
}) {
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(candidate);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
    candidateReviewResolution,
  );
  assertFineTuningPrivateAnswerQualityCaseRecord(answerQualityCase);

  const valid =
    item.lane === 'answer-quality-cases' &&
    item.dataOrigin === 'curated-synthetic' &&
    sameReference(admission.workspace, workspace, 'workspaceHash') &&
    sameReference(item.admission, admission, 'admissionHash') &&
    sameReference(item.workspace, workspace, 'workspaceHash') &&
    sameReference(candidate.admission, admission, 'admissionHash') &&
    sameReference(candidate.item, item, 'itemHash') &&
    sameReference(candidate.workspace, workspace, 'workspaceHash') &&
    sameReference(candidateReviewResolution.admission, admission, 'admissionHash') &&
    sameReference(candidateReviewResolution.candidate, candidate, 'candidateHash') &&
    sameReference(candidateReviewResolution.item, item, 'itemHash') &&
    sameReference(candidateReviewResolution.workspace, workspace, 'workspaceHash') &&
    sameReference(answerQualityCase.admission, admission, 'admissionHash') &&
    sameReference(answerQualityCase.candidate, candidate, 'candidateHash') &&
    sameReference(
      answerQualityCase.candidateReviewResolution,
      candidateReviewResolution,
      'candidateReviewResolutionHash',
    ) &&
    sameReference(answerQualityCase.item, item, 'itemHash') &&
    sameReference(answerQualityCase.workspace, workspace, 'workspaceHash') &&
    candidateReviewResolution.decision === 'approve' &&
    candidateReviewResolution.q1ReviewerGateSatisfied === true &&
    candidateReviewResolution.answerQualityCaseMaterializationAllowed === true &&
    answerQualityCase.q1ContractSatisfied === true &&
    answerQualityCase.payloadStored === false &&
    answerQualityCase.contentCopied === false &&
    answerQualityCase.replayRequiresLivePrivateInput === true &&
    answerQualityCase.dataOrigin === 'curated-synthetic' &&
    answerQualityCase.sourceObservation.expiresAt === item.expiresAt &&
    answerQualityCase.sourceObservation.deleteBy === item.retention.deleteBy;
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case payload must bind one exact live F1.18 case.');
  }
}

function buildCasePayload({ answerQualityCase, enrichmentInput, item }) {
  const input = assertFineTuningPrivateAnswerQualityEnrichmentInput(enrichmentInput);
  if (
    !sameReference(input.item, item, 'itemHash') ||
    !sameReference(input.workspace, item.workspace, 'workspaceHash') ||
    input.retrievalInput.mission.objective !== item.example.instruction
  ) {
    throw new Error('Fine-tuning private answer quality case payload input does not match its live item.');
  }
  const retrievedItems = buildRetrievalContext(input.retrievalInput);
  const caseDefinition = {
    answer: {
      citedSourceKeys: input.answer.citedSourceKeys,
      text: item.example.response,
    },
    expectedSourceKeys: input.expectedSourceKeys,
    forbiddenAnswerTerms: input.forbiddenAnswerTerms,
    forbiddenSourceKeys: input.forbiddenSourceKeys,
    id: `private-answer-quality-case-${item.itemHash}`,
    requiredAnswerTerms: input.requiredAnswerTerms,
    retrievedItems,
    reviewerVerdict: 'pass',
  };
  const evaluation = evaluateAnswerQualityCase(caseDefinition, {
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  const definitionHash = hash(caseDefinition);
  const evaluationHash = hash({
    evaluation,
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  const exact =
    evaluation.status === 'passed' &&
    definitionHash === answerQualityCase.caseSummary.answerQualityCaseDefinitionHash &&
    evaluationHash === answerQualityCase.caseSummary.answerQualityCaseEvaluationHash &&
    JSON.stringify(evaluation.counts) ===
      JSON.stringify(answerQualityCase.evaluation.counts) &&
    JSON.stringify(evaluation.metrics) ===
      JSON.stringify(answerQualityCase.evaluation.metrics);
  if (!exact) {
    throw new Error('Fine-tuning private answer quality case payload drifted from F1.18.');
  }
  return {
    objective: item.example.instruction,
    caseDefinition,
  };
}

function assertStoredPayloadContent(payload, itemHash, contentHash) {
  exactKeys(payload, ['caseDefinition', 'objective'], 'stored payload content');
  const definition = payload.caseDefinition;
  exactKeys(
    definition,
    [
      'answer',
      'expectedSourceKeys',
      'forbiddenAnswerTerms',
      'forbiddenSourceKeys',
      'id',
      'requiredAnswerTerms',
      'retrievedItems',
      'reviewerVerdict',
    ],
    'stored payload case definition',
  );
  exactKeys(
    definition.answer,
    ['citedSourceKeys', 'text'],
    'stored payload answer',
  );
  assertStoredText(payload.objective, 'objective');
  assertStoredText(definition.answer.text, 'answer text');
  assertStoredTextList(
    definition.answer.citedSourceKeys,
    'cited source keys',
    { required: true },
  );
  assertStoredTextList(
    definition.expectedSourceKeys,
    'expected source keys',
    { required: true },
  );
  assertStoredTextList(
    definition.forbiddenAnswerTerms,
    'forbidden answer terms',
  );
  assertStoredTextList(
    definition.forbiddenSourceKeys,
    'forbidden source keys',
  );
  assertStoredTextList(
    definition.requiredAnswerTerms,
    'required answer terms',
    { required: true },
  );
  if (
    definition.id !== `private-answer-quality-case-${itemHash}` ||
    definition.reviewerVerdict !== 'pass' ||
    !Array.isArray(definition.retrievedItems) ||
    definition.retrievedItems.length === 0 ||
    definition.retrievedItems.length > 6 ||
    hash({
      instruction: payload.objective,
      response: definition.answer.text,
    }) !== contentHash
  ) {
    throw new Error(
      'Fine-tuning private answer quality case payload stored content is invalid.',
    );
  }
  definition.retrievedItems.forEach(assertStoredRetrievedItem);
}

function assertStoredRetrievedItem(item, index) {
  exactKeys(
    item,
    [
      'bm25Score',
      'chunkIndex',
      'fileName',
      'lexicalScore',
      'matchedTerms',
      'matchTermCount',
      'phraseBoostScore',
      'retrievalReason',
      'score',
      'snippet',
      'sourceLabel',
      'sourceType',
    ],
    `stored payload retrieved item ${index}`,
  );
  assertStoredText(item.retrievalReason, `retrieved item ${index} reason`);
  assertStoredText(item.snippet, `retrieved item ${index} snippet`);
  assertStoredText(item.sourceLabel, `retrieved item ${index} source label`);
  assertStoredText(item.sourceType, `retrieved item ${index} source type`);
  assertStoredTextList(
    item.matchedTerms,
    `retrieved item ${index} matched terms`,
  );
  const numeric = [
    item.bm25Score,
    item.lexicalScore,
    item.phraseBoostScore,
    item.score,
  ];
  const valid =
    numeric.every((value) => Number.isFinite(value) && value >= 0) &&
    Number.isInteger(item.matchTermCount) &&
    item.matchTermCount === item.matchedTerms.length &&
    (item.chunkIndex === null ||
      (Number.isInteger(item.chunkIndex) && item.chunkIndex > 0)) &&
    (item.fileName === null ||
      (typeof item.fileName === 'string' &&
        item.fileName.normalize('NFC').trim() === item.fileName &&
        item.fileName.length > 0));
  if (!valid) {
    throw new Error(
      `Fine-tuning private answer quality case payload retrieved item ${index} is invalid.`,
    );
  }
}

function assertStoredText(value, label) {
  if (
    typeof value !== 'string' ||
    value.normalize('NFC').trim() !== value ||
    value.length === 0
  ) {
    throw new Error(
      `Fine-tuning private answer quality case payload stored ${label} is invalid.`,
    );
  }
}

function assertStoredTextList(value, label, { required = false } = {}) {
  if (
    !Array.isArray(value) ||
    value.length > 32 ||
    (required && value.length === 0) ||
    value.some((entry) => {
      try {
        assertStoredText(entry, label);
        return false;
      } catch {
        return true;
      }
    }) ||
    new Set(value).size !== value.length
  ) {
    throw new Error(
      `Fine-tuning private answer quality case payload stored ${label} is invalid.`,
    );
  }
}

export function buildFineTuningPrivateAnswerQualityCasePayloadDecision(input = {}) {
  const { answerQualityCase, decision, item, workspace } = input;
  assertFineTuningPrivateAnswerQualityCaseRecord(answerQualityCase);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  const decisionRecord = normalizeDecisionInput(decision, {
    answerQualityCase,
    item,
    workspace,
  });
  const decisionHash = hash(decisionRecord);
  return {
    answerQualityCase: copyReference(
      answerQualityCase,
      'answerQualityCaseHash',
      'fine-tuning-private-answer-quality-case-',
      'decision answer quality case',
    ),
    decisionHash,
    decisionRecord,
    id: `fine-tuning-private-answer-quality-case-payload-decision-${decisionHash}`,
    item: copyReference(
      item,
      'itemHash',
      'fine-tuning-private-collection-item-',
      'decision item',
    ),
    workspace: copyReference(
      workspace,
      'workspaceHash',
      'fine-tuning-private-collection-workspace-',
      'decision workspace',
    ),
  };
}

export function assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(value) {
  exactKeys(
    value,
    ['answerQualityCase', 'decisionHash', 'decisionRecord', 'id', 'item', 'workspace'],
    'stored decision',
  );
  const answerQualityCase = reference(
    value.answerQualityCase,
    'answerQualityCaseHash',
    'fine-tuning-private-answer-quality-case-',
    'stored decision answer quality case',
  );
  const item = reference(
    value.item,
    'itemHash',
    'fine-tuning-private-collection-item-',
    'stored decision item',
  );
  const workspace = reference(
    value.workspace,
    'workspaceHash',
    'fine-tuning-private-collection-workspace-',
    'stored decision workspace',
  );
  exactKeys(value.decisionRecord, DECISION_RECORD_KEYS, 'stored decision record');
  const record = value.decisionRecord;
  const decidedAt = timestamp(record.decidedAt, 'stored decision decidedAt');
  const valid =
    isHash(record.confirmationTokenSha256) &&
    isHash(record.evidenceSha256) &&
    record.decidedAt === decidedAt &&
    record.decidedByRole === 'retention-deletion-owner-role' &&
    ['approve', 'reject'].includes(record.decision) &&
    record.payloadPurpose === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_PURPOSE &&
    record.schemaVersion ===
      FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_DECISION_SCHEMA_VERSION &&
    record.target === FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_TARGET &&
    value.decisionHash === hash(record) &&
    value.id ===
      `fine-tuning-private-answer-quality-case-payload-decision-${value.decisionHash}` &&
    answerQualityCase.id === value.answerQualityCase.id &&
    item.id === value.item.id &&
    workspace.id === value.workspace.id;
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case payload stored decision is invalid.');
  }
  return value;
}

export function assertFineTuningPrivateAnswerQualityCasePayloadDecision(
  value,
  input = {},
) {
  assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(value);
  const expected = buildFineTuningPrivateAnswerQualityCasePayloadDecision(input);
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private answer quality case payload decision does not match live inputs.');
  }
  return value;
}

export function buildFineTuningPrivateAnswerQualityCasePayload(input = {}) {
  const {
    admission,
    answerQualityCase,
    candidate,
    candidateReviewResolution,
    decision,
    enrichmentInput,
    item,
    storedAt,
    workspace,
  } = input;
  assertLiveChain({
    admission,
    answerQualityCase,
    candidate,
    candidateReviewResolution,
    item,
    workspace,
  });
  assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(decision);
  if (
    decision.decisionRecord.decision !== 'approve' ||
    !sameReference(
      decision.answerQualityCase,
      answerQualityCase,
      'answerQualityCaseHash',
    ) ||
    !sameReference(decision.item, item, 'itemHash') ||
    !sameReference(decision.workspace, workspace, 'workspaceHash')
  ) {
    throw new Error('Fine-tuning private answer quality case payload requires one approved owner decision.');
  }
  const at = timestamp(storedAt, 'storedAt');
  if (
    Date.parse(at) < Date.parse(decision.decisionRecord.decidedAt) ||
    Date.parse(at) >= Date.parse(item.expiresAt) ||
    Date.parse(at) >= Date.parse(item.retention.deleteBy)
  ) {
    throw new Error('Fine-tuning private answer quality case payload storage window is invalid.');
  }
  const payload = buildCasePayload({ answerQualityCase, enrichmentInput, item });
  const bindings = {
    ...answerQualityCase.bindings,
    answerQualityCaseHash: answerQualityCase.answerQualityCaseHash,
    payloadContentHash: hash(payload),
    payloadDecisionHash: decision.decisionHash,
  };
  exactKeys(bindings, PAYLOAD_BINDING_KEYS, 'bindings');

  const content = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission: copyReference(
      admission,
      'admissionHash',
      'fine-tuning-private-collection-item-admission-',
      'admission',
    ),
    answerQualityCase: copyReference(
      answerQualityCase,
      'answerQualityCaseHash',
      'fine-tuning-private-answer-quality-case-',
      'answer quality case',
    ),
    bindings,
    candidate: copyCandidateReference(candidate, 'candidate'),
    candidateReviewResolution: copyCandidateResolutionReference(
      candidateReviewResolution,
      'candidate review resolution',
    ),
    contentCopied: true,
    dataOrigin: 'curated-synthetic',
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item: copyReference(
      item,
      'itemHash',
      'fine-tuning-private-collection-item-',
      'item',
    ),
    materializationMode: 'owner-authorized-local-answer-quality-evaluation-replay-payload',
    ownerIdentityVerified: false,
    payload,
    payloadDecision: {
      id: decision.id,
      payloadDecisionHash: decision.decisionHash,
    },
    payloadPurpose: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_PURPOSE,
    payloadStored: true,
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    q1ContractSatisfied: true,
    replayRequiresLivePrivateInput: false,
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_SCHEMA_VERSION,
    sourceObservation: {
      answerQualityCaseMaterializedAt: answerQualityCase.materializedAt,
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      payloadDecisionDecidedAt: decision.decisionRecord.decidedAt,
    },
    status: 'private-answer-quality-case-payload-stored-for-local-replay',
    storedAt: at,
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace: copyReference(
      workspace,
      'workspaceHash',
      'fine-tuning-private-collection-workspace-',
      'workspace',
    ),
    workspaceMutationPerformed: false,
  };
  return {
    ...content,
    answerQualityCasePayloadHash: hash(content),
    id: `fine-tuning-private-answer-quality-case-payload-${hash(content)}`,
  };
}

export function assertFineTuningPrivateAnswerQualityCasePayloadRecord(value) {
  const { answerQualityCasePayloadHash, id, ...content } = value || {};
  exactKeys(content, PAYLOAD_RECORD_KEYS, 'stored payload');
  exactKeys(content.bindings, PAYLOAD_BINDING_KEYS, 'stored payload bindings');
  exactKeys(
    content.sourceObservation,
    ['answerQualityCaseMaterializedAt', 'deleteBy', 'expiresAt', 'payloadDecisionDecidedAt'],
    'stored payload source observation',
  );
  const admission = reference(
    content.admission,
    'admissionHash',
    'fine-tuning-private-collection-item-admission-',
    'stored payload admission',
  );
  const answerQualityCase = reference(
    content.answerQualityCase,
    'answerQualityCaseHash',
    'fine-tuning-private-answer-quality-case-',
    'stored payload answer quality case',
  );
  const candidate = candidateReference(content.candidate, 'stored payload candidate');
  const candidateReviewResolution = candidateResolutionReference(
    content.candidateReviewResolution,
    'stored payload candidate review resolution',
  );
  const item = reference(
    content.item,
    'itemHash',
    'fine-tuning-private-collection-item-',
    'stored payload item',
  );
  const workspace = reference(
    content.workspace,
    'workspaceHash',
    'fine-tuning-private-collection-workspace-',
    'stored payload workspace',
  );
  assertStoredPayloadContent(
    content.payload,
    item.itemHash,
    content.bindings.contentHash,
  );
  exactKeys(content.payloadDecision, ['id', 'payloadDecisionHash'], 'stored payload decision');
  const evaluated = evaluateAnswerQualityCase(content.payload.caseDefinition, {
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  const evaluatedHash = hash({
    evaluation: evaluated,
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  const expectedStatic = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    contentCopied: true,
    dataOrigin: 'curated-synthetic',
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    materializationMode: 'owner-authorized-local-answer-quality-evaluation-replay-payload',
    ownerIdentityVerified: false,
    payloadPurpose: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_PURPOSE,
    payloadStored: true,
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    q1ContractSatisfied: true,
    replayRequiresLivePrivateInput: false,
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_SCHEMA_VERSION,
    status: 'private-answer-quality-case-payload-stored-for-local-replay',
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspaceMutationPerformed: false,
  };
  const storedAt = timestamp(content.storedAt, 'stored payload storedAt');
  const observed = Object.fromEntries(
    Object.entries(content.sourceObservation).map(([key, entry]) => [
      key,
      timestamp(entry, `stored payload ${key}`),
    ]),
  );
  const invalid =
    Object.entries(expectedStatic).some(([key, expected]) => content[key] !== expected) ||
    Object.values(content.bindings).some((entry) => !isHash(entry)) ||
    !isHash(content.payloadDecision.payloadDecisionHash) ||
    content.payloadDecision.id !==
      `fine-tuning-private-answer-quality-case-payload-decision-${content.payloadDecision.payloadDecisionHash}` ||
    content.bindings.admissionHash !== admission.admissionHash ||
    content.bindings.answerQualityCaseHash !== answerQualityCase.answerQualityCaseHash ||
    content.bindings.candidateHash !== candidate.candidateHash ||
    content.bindings.candidateReviewResolutionHash !==
      candidateReviewResolution.candidateReviewResolutionHash ||
    content.bindings.itemHash !== item.itemHash ||
    content.bindings.workspaceHash !== workspace.workspaceHash ||
    content.bindings.payloadDecisionHash !== content.payloadDecision.payloadDecisionHash ||
    content.bindings.payloadContentHash !== hash(content.payload) ||
    content.bindings.answerQualityCaseDefinitionHash !== hash(content.payload.caseDefinition) ||
    content.bindings.answerQualityCaseEvaluationHash !== evaluatedHash ||
    content.payload.caseDefinition.id !== `private-answer-quality-case-${item.itemHash}` ||
    content.payload.caseDefinition.reviewerVerdict !== 'pass' ||
    evaluated.status !== 'passed' ||
    Date.parse(observed.answerQualityCaseMaterializedAt) >
      Date.parse(observed.payloadDecisionDecidedAt) ||
    Date.parse(observed.payloadDecisionDecidedAt) > Date.parse(storedAt) ||
    Date.parse(storedAt) >= Date.parse(observed.expiresAt) ||
    Date.parse(storedAt) >= Date.parse(observed.deleteBy) ||
    answerQualityCasePayloadHash !== hash(content) ||
    id !==
      `fine-tuning-private-answer-quality-case-payload-${answerQualityCasePayloadHash}`;
  if (invalid) {
    throw new Error('Fine-tuning private answer quality case payload integrity failed.');
  }
  return value;
}

export function assertFineTuningPrivateAnswerQualityCasePayload(value, input = {}) {
  assertFineTuningPrivateAnswerQualityCasePayloadRecord(value);
  const expected = buildFineTuningPrivateAnswerQualityCasePayload({
    ...input,
    storedAt: value.storedAt,
  });
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private answer quality case payload does not match live inputs.');
  }
  return value;
}
