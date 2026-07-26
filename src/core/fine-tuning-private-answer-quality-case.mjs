import { createHash } from 'node:crypto';

import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord,
  assertFineTuningPrivateAnswerQualityEnrichmentInput,
} from './fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord } from './fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';
import { DEFAULT_ANSWER_QUALITY_THRESHOLDS, evaluateAnswerQualityCase } from './answer-quality-evaluation.mjs';
import { buildRetrievalContext } from './retrieval-service.mjs';

export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-case/v1';
export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS = Object.freeze({
  ...DEFAULT_ANSWER_QUALITY_THRESHOLDS,
  requireReviewerPass: true,
});

const BINDING_KEYS = Object.freeze([
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

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function exactKeys(value, keys, label) {
  const hasExactKeys =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) ===
      JSON.stringify([...keys].sort());

  if (!hasExactKeys) {
    throw new Error(`Fine-tuning private answer quality case ${label} fields are invalid.`);
  }
}

function timestamp(value, label) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Fine-tuning private answer quality case ${label} timestamp is invalid.`);
  }
  return new Date(parsed).toISOString();
}

function reference(value, field, prefix, label) {
  exactKeys(value, ['id', field], label);
  if (!isHash(value[field]) || value.id !== `${prefix}${value[field]}`) {
    throw new Error(`Fine-tuning private answer quality case ${label} is invalid.`);
  }
  return { id: value.id, [field]: value[field] };
}

function candidateReference(value, label) {
  exactKeys(value, ['candidateHash', 'id'], label);
  if (
    !isHash(value.candidateHash) ||
    !/^private-answer-quality-case-[a-f0-9]{64}$/u.test(value.id)
  ) {
    throw new Error(`Fine-tuning private answer quality case ${label} is invalid.`);
  }
  return { candidateHash: value.candidateHash, id: value.id };
}

function resolutionReference(value, label) {
  exactKeys(value, ['candidateReviewResolutionHash', 'id'], label);
  if (
    !isHash(value.candidateReviewResolutionHash) ||
    value.id !==
      `fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-${value.candidateReviewResolutionHash}`
  ) {
    throw new Error(`Fine-tuning private answer quality case ${label} is invalid.`);
  }
  return { candidateReviewResolutionHash: value.candidateReviewResolutionHash, id: value.id };
}

function same(left, right, field) {
  return left?.id === right?.id && left?.[field] === right?.[field];
}

function copyCounts(value) {
  exactKeys(value, COUNT_KEYS, 'evaluation counts');
  if (Object.values(value).some((entry) => !Number.isInteger(entry) || entry < 0)) {
    throw new Error('Fine-tuning private answer quality case evaluation counts are invalid.');
  }
  return Object.fromEntries(COUNT_KEYS.map((key) => [key, value[key]]));
}

function copyMetrics(value) {
  exactKeys(value, METRIC_KEYS, 'evaluation metrics');
  const invalidMetric = Object.values(value).some(
    (entry) =>
      typeof entry !== 'number' ||
      !Number.isFinite(entry) ||
      entry < 0 ||
      entry > 1,
  );
  if (invalidMetric) {
    throw new Error('Fine-tuning private answer quality case evaluation metrics are invalid.');
  }
  return Object.fromEntries(METRIC_KEYS.map((key) => [key, value[key]]));
}

function assertLive({ admission, candidate, candidateReviewResolution, item, workspace }) {
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(candidate);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(candidateReviewResolution);
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  const valid = item.lane === 'answer-quality-cases' && item.dataOrigin === 'curated-synthetic' &&
    same(admission.workspace, workspace, 'workspaceHash') &&
    same(item.admission, admission, 'admissionHash') && same(item.workspace, workspace, 'workspaceHash') &&
    same(candidate.admission, admission, 'admissionHash') && same(candidate.item, item, 'itemHash') &&
    same(candidate.workspace, workspace, 'workspaceHash') &&
    same(candidateReviewResolution.admission, admission, 'admissionHash') &&
    same(candidateReviewResolution.item, item, 'itemHash') &&
    same(candidateReviewResolution.workspace, workspace, 'workspaceHash') &&
    same(candidateReviewResolution.candidate, candidate, 'candidateHash') &&
    candidateReviewResolution.decision === 'approve' &&
    candidateReviewResolution.reviewerVerdict === 'pass' &&
    candidateReviewResolution.q1ReviewerGateSatisfied === true &&
    candidateReviewResolution.answerQualityCaseMaterializationAllowed === true &&
    candidateReviewResolution.q1ContractSatisfied === false &&
    candidateReviewResolution.answerQualityCaseCreated === false &&
    candidateReviewResolution.answerQualityCaseEvaluationExecuted === false &&
    candidate.bindings.candidateHash === undefined &&
    candidateReviewResolution.bindings.candidateHash === candidate.candidateHash &&
    candidateReviewResolution.bindings.candidateReviewDecisionHash === candidateReviewResolution.decisionHash &&
    candidate.sourceObservation.expiresAt === item.expiresAt &&
    candidate.sourceObservation.deleteBy === item.retention.deleteBy &&
    candidateReviewResolution.sourceObservation.expiresAt === item.expiresAt &&
    candidateReviewResolution.sourceObservation.deleteBy === item.retention.deleteBy;
  if (!valid) {
    throw new Error('Fine-tuning private answer quality case must bind one approved live F1.17 resolution.');
  }
}

function evaluate({ enrichmentInput, item }) {
  const input = assertFineTuningPrivateAnswerQualityEnrichmentInput(enrichmentInput);
  if (
    input.item.itemHash !== item.itemHash ||
    input.workspace.workspaceHash !== item.workspace.workspaceHash ||
    input.retrievalInput.mission.objective !== item.example.instruction
  ) {
    throw new Error('Fine-tuning private answer quality case enrichment input does not match its live item.');
  }
  const retrievedItems = buildRetrievalContext(input.retrievalInput);
  const definition = {
    answer: { citedSourceKeys: input.answer.citedSourceKeys, text: item.example.response },
    expectedSourceKeys: input.expectedSourceKeys,
    forbiddenAnswerTerms: input.forbiddenAnswerTerms,
    forbiddenSourceKeys: input.forbiddenSourceKeys,
    id: `private-answer-quality-case-${item.itemHash}`,
    requiredAnswerTerms: input.requiredAnswerTerms,
    retrievedItems,
    reviewerVerdict: 'pass',
  };
  const evaluation = evaluateAnswerQualityCase(definition, {
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  if (evaluation.status !== 'passed') {
    throw new Error('Fine-tuning private answer quality case deterministic evaluation failed.');
  }
  return { definition, evaluation, input, retrievedItems };
}

function inputSummary(input, item) {
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

function assertCandidateParity(candidate, summary, evaluation) {
  const precheck = {
    counts: evaluation.counts,
    metrics: evaluation.metrics,
    precheckHash: hash({ counts: evaluation.counts, metrics: evaluation.metrics, status: evaluation.status }),
    status: evaluation.status,
  };
  if (
    JSON.stringify(candidate.inputSummary) !== JSON.stringify(summary) ||
    JSON.stringify(candidate.precheck) !== JSON.stringify(precheck)
  ) {
    throw new Error('Fine-tuning private answer quality case input or deterministic precheck drifted from F1.16 candidate.');
  }
}

function buildContent({ admission, candidate, candidateReviewResolution, enrichmentInput, item, materializedAt, workspace }) {
  assertLive({ admission, candidate, candidateReviewResolution, item, workspace });
  const at = timestamp(materializedAt, 'materializedAt');
  if (Date.parse(at) < Date.parse(candidateReviewResolution.resolvedAt) ||
    Date.parse(at) >= Date.parse(item.expiresAt) || Date.parse(at) >= Date.parse(item.retention.deleteBy)) {
    throw new Error('Fine-tuning private answer quality case materialization window is invalid.');
  }
  const { definition, evaluation, input, retrievedItems } = evaluate({ enrichmentInput, item });
  const candidateSummary = inputSummary(input, item);
  assertCandidateParity(candidate, candidateSummary, evaluation);
  const caseSummary = {
    ...candidateSummary,
    answerQualityCaseDefinitionHash: hash(definition),
    answerQualityCaseEvaluationHash: hash({
      evaluation,
      thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
    }),
    retrievalResultHash: hash(retrievedItems),
    retrievedSourceCount: evaluation.counts.retrievedSourceCount,
  };
  const bindings = {
    ...candidateReviewResolution.bindings,
    candidateReviewResolutionHash: candidateReviewResolution.candidateReviewResolutionHash,
    answerQualityCaseDefinitionHash: caseSummary.answerQualityCaseDefinitionHash,
    answerQualityCaseEvaluationHash: caseSummary.answerQualityCaseEvaluationHash,
  };
  exactKeys(bindings, BINDING_KEYS, 'bindings');
  for (const [key, value] of Object.entries(candidate.bindings)) {
    if (candidateReviewResolution.bindings[key] !== value || bindings[key] !== value) {
      throw new Error('Fine-tuning private answer quality case F1.16 and F1.17 bindings drifted.');
    }
  }
  if (Object.values(bindings).some((value) => !isHash(value))) {
    throw new Error('Fine-tuning private answer quality case bindings are invalid.');
  }
  return {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    admission: reference(
      { id: admission.id, admissionHash: admission.admissionHash },
      'admissionHash',
      'fine-tuning-private-collection-item-admission-',
      'admission',
    ),
    answerQualityCaseCreated: true,
    answerQualityCaseEnrichmentCandidateCreated: true,
    answerQualityCaseEvaluationExecuted: true,
    answerQualityCaseMaterializationAllowed: true,
    bindings,
    candidate: candidateReference(
      { id: candidate.id, candidateHash: candidate.candidateHash },
      'candidate',
    ),
    candidateReviewCreated: true,
    candidateReviewResolved: true,
    candidateReviewResolution: resolutionReference({
      candidateReviewResolutionHash: candidateReviewResolution.candidateReviewResolutionHash,
      id: candidateReviewResolution.id,
    }, 'candidate review resolution'),
    caseSummary,
    contentCopied: false,
    dataOrigin: 'curated-synthetic',
    deploymentAuthorized: false,
    evaluation: {
      counts: copyCounts(evaluation.counts),
      answerQualityCaseEvaluationHash: caseSummary.answerQualityCaseEvaluationHash,
      metrics: copyMetrics(evaluation.metrics),
      status: 'passed',
      thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
    },
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    item: reference(
      { id: item.id, itemHash: item.itemHash },
      'itemHash',
      'fine-tuning-private-collection-item-',
      'item',
    ),
    itemPathStored: false,
    materializationMode: 'content-free-logical-case',
    materializedAt: at,
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    payloadStored: false,
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    q1ContractSatisfied: true,
    q1ReviewerGateSatisfied: true,
    replayRequiresLivePrivateInput: true,
    reviewerReviewRequired: false,
    reviewerVerdict: 'pass',
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_SCHEMA_VERSION,
    sourceObservation: {
      candidateObservedAt: candidate.observedAt,
      candidateReviewResolvedAt: candidateReviewResolution.resolvedAt,
      deleteBy: item.retention.deleteBy,
      expiresAt: item.expiresAt,
      itemStoredAt: item.storedAt,
    },
    status: 'private-answer-quality-case-logically-materialized-q1-passed',
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspace: reference(
      { id: workspace.id, workspaceHash: workspace.workspaceHash },
      'workspaceHash',
      'fine-tuning-private-collection-workspace-',
      'workspace',
    ),
    workspaceMutationPerformed: false,
  };
}

function rebuild(content) {
  const required = [
    'actualModelTrainingExecuted',
    'actualUserDataCollected',
    'admission',
    'answerQualityCaseCreated',
    'answerQualityCaseEnrichmentCandidateCreated',
    'answerQualityCaseEvaluationExecuted',
    'answerQualityCaseMaterializationAllowed',
    'bindings',
    'candidate',
    'candidateReviewCreated',
    'candidateReviewResolved',
    'candidateReviewResolution',
    'caseSummary',
    'contentCopied',
    'dataOrigin',
    'deploymentAuthorized',
    'evaluation',
    'evidenceIndependentlyVerified',
    'externalProviderCalls',
    'externalSubmissionAuthorized',
    'fineTuningExecutionAuthorized',
    'item',
    'itemPathStored',
    'materializationMode',
    'materializedAt',
    'ownerAttestationRecorded',
    'ownerIdentityVerified',
    'payloadStored',
    'productionReadyClaim',
    'providerSubmissionAuthorized',
    'providerSubmissionCreated',
    'q1ContractSatisfied',
    'q1ReviewerGateSatisfied',
    'replayRequiresLivePrivateInput',
    'reviewerReviewRequired',
    'reviewerVerdict',
    'schemaVersion',
    'sourceObservation',
    'status',
    'trainingAuthorized',
    'trainingSubmissionCreated',
    'workspace',
    'workspaceMutationPerformed',
  ];
  exactKeys(content, required, 'record');
  exactKeys(
    content.caseSummary,
    [
      'answerHash',
      'answerQualityCaseDefinitionHash',
      'answerQualityCaseEvaluationHash',
      'citedSourceKeyCount',
      'criteriaHash',
      'expectedSourceKeyCount',
      'forbiddenAnswerTermCount',
      'forbiddenSourceKeyCount',
      'inputHash',
      'requiredAnswerTermCount',
      'retrievalInputHash',
      'retrievalResultHash',
      'retrievedSourceCount',
    ],
    'case summary',
  );
  exactKeys(
    content.sourceObservation,
    [
      'candidateObservedAt',
      'candidateReviewResolvedAt',
      'deleteBy',
      'expiresAt',
      'itemStoredAt',
    ],
    'source observation',
  );
  exactKeys(
    content.evaluation,
    [
      'counts',
      'answerQualityCaseEvaluationHash',
      'metrics',
      'status',
      'thresholds',
    ],
    'evaluation',
  );
  exactKeys(
    content.evaluation.thresholds,
    Object.keys(FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS),
    'evaluation thresholds',
  );
  const admission = reference(
    content.admission,
    'admissionHash',
    'fine-tuning-private-collection-item-admission-',
    'record admission',
  );
  const item = reference(
    content.item,
    'itemHash',
    'fine-tuning-private-collection-item-',
    'record item',
  );
  const workspace = reference(
    content.workspace,
    'workspaceHash',
    'fine-tuning-private-collection-workspace-',
    'record workspace',
  );
  const candidate = candidateReference(content.candidate, 'record candidate');
  const candidateReviewResolution = resolutionReference(
    content.candidateReviewResolution,
    'record candidate review resolution',
  );
  const counts = copyCounts(content.evaluation.counts);
  const metrics = copyMetrics(content.evaluation.metrics);
  const materializedAt = timestamp(content.materializedAt, 'materializedAt');
  const sourceObservation = Object.fromEntries(
    Object.entries(content.sourceObservation).map(([key, value]) => [
      key,
      timestamp(value, `source ${key}`),
    ]),
  );
  const expectedStatic = {
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    answerQualityCaseCreated: true,
    answerQualityCaseEnrichmentCandidateCreated: true,
    answerQualityCaseEvaluationExecuted: true,
    answerQualityCaseMaterializationAllowed: true,
    candidateReviewCreated: true,
    candidateReviewResolved: true,
    contentCopied: false,
    dataOrigin: 'curated-synthetic',
    deploymentAuthorized: false,
    evidenceIndependentlyVerified: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    itemPathStored: false,
    materializationMode: 'content-free-logical-case',
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    payloadStored: false,
    productionReadyClaim: false,
    providerSubmissionAuthorized: false,
    providerSubmissionCreated: false,
    q1ContractSatisfied: true,
    q1ReviewerGateSatisfied: true,
    replayRequiresLivePrivateInput: true,
    reviewerReviewRequired: false,
    reviewerVerdict: 'pass',
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_SCHEMA_VERSION,
    status: 'private-answer-quality-case-logically-materialized-q1-passed',
    trainingAuthorized: false,
    trainingSubmissionCreated: false,
    workspaceMutationPerformed: false,
  };
  const invalid =
    Object.entries(expectedStatic).some(([key, value]) => content[key] !== value) ||
    Object.values(content.bindings).some((value) => !isHash(value)) ||
    JSON.stringify(Object.keys(content.bindings).sort()) !==
      JSON.stringify([...BINDING_KEYS].sort()) ||
    Object.values(content.caseSummary).some((value) =>
      typeof value === 'string'
        ? !isHash(value)
        : !Number.isInteger(value) || value < 0,
    ) ||
    content.evaluation.status !== 'passed' ||
    content.evaluation.answerQualityCaseEvaluationHash !==
      content.caseSummary.answerQualityCaseEvaluationHash ||
    JSON.stringify(content.evaluation.thresholds) !==
      JSON.stringify(FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS) ||
    content.bindings.answerQualityCaseDefinitionHash !==
      content.caseSummary.answerQualityCaseDefinitionHash ||
    content.bindings.answerQualityCaseEvaluationHash !==
      content.caseSummary.answerQualityCaseEvaluationHash ||
    content.bindings.candidateHash !== candidate.candidateHash ||
    content.bindings.candidateReviewResolutionHash !==
      candidateReviewResolution.candidateReviewResolutionHash ||
    candidate.id !== `private-answer-quality-case-${item.itemHash}` ||
    content.bindings.itemHash !== item.itemHash ||
    content.bindings.workspaceHash !== workspace.workspaceHash ||
    metrics.citationGroundingRate !== 1 ||
    metrics.expectedSourceCitationRate !== 1 ||
    metrics.requiredTermCoverage !== 1 ||
    metrics.retrievalHitRate !== 1 ||
    metrics.unsupportedCitationRate !== 0 ||
    metrics.forbiddenRetrievedSourceCount !== 0 ||
    metrics.forbiddenTermMatchCount !== 0 ||
    counts.citedSourceCount !== counts.groundedCitationCount ||
    counts.expectedSourceCount !== counts.citedExpectedSourceCount ||
    counts.expectedSourceCount !== counts.retrievedExpectedSourceCount ||
    counts.requiredTermCount !== counts.requiredTermMatchCount ||
    counts.unsupportedCitationCount !== 0 ||
    counts.forbiddenRetrievedSourceCount !== 0 ||
    counts.forbiddenTermMatchCount !== 0 ||
    Date.parse(sourceObservation.itemStoredAt) >
      Date.parse(sourceObservation.candidateObservedAt) ||
    Date.parse(sourceObservation.candidateObservedAt) >
      Date.parse(sourceObservation.candidateReviewResolvedAt) ||
    Date.parse(sourceObservation.candidateReviewResolvedAt) >
      Date.parse(materializedAt) ||
    Date.parse(materializedAt) >= Date.parse(sourceObservation.expiresAt) ||
    Date.parse(materializedAt) >= Date.parse(sourceObservation.deleteBy);
  if (invalid) {
    throw new Error('Fine-tuning private answer quality case integrity failed.');
  }
  return {
    ...content,
    admission,
    candidate,
    candidateReviewResolution,
    evaluation: {
      ...content.evaluation,
      counts,
      metrics,
      thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
    },
    item,
    materializedAt,
    sourceObservation,
    workspace,
  };
}

export function buildFineTuningPrivateAnswerQualityCase(input = {}) {
  const content = buildContent(input);
  const answerQualityCaseHash = hash(content);
  return {
    ...content,
    answerQualityCaseHash,
    id: `fine-tuning-private-answer-quality-case-${answerQualityCaseHash}`,
  };
}

export function assertFineTuningPrivateAnswerQualityCaseRecord(record) {
  const { answerQualityCaseHash, id, ...content } = record || {};
  const expected = rebuild(content);
  const expectedHash = hash(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    answerQualityCaseHash !== expectedHash ||
    id !== `fine-tuning-private-answer-quality-case-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private answer quality case integrity failed.');
  }
  return record;
}

export function assertFineTuningPrivateAnswerQualityCase(record, input = {}) {
  assertFineTuningPrivateAnswerQualityCaseRecord(record);
  const expected = buildFineTuningPrivateAnswerQualityCase({
    ...input,
    materializedAt: record.materializedAt,
  });
  if (JSON.stringify(record) !== JSON.stringify(expected)) {
    throw new Error('Fine-tuning private answer quality case does not match its live private inputs.');
  }
  return record;
}
