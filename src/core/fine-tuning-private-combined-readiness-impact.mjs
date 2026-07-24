import { createHash } from 'node:crypto';

import { evaluateAnswerQualitySuite } from './answer-quality-evaluation.mjs';
import { assessFineTuningDataSufficiency } from './fine-tuning-data-sufficiency.mjs';
import { FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS } from './fine-tuning-private-answer-quality-case.mjs';
import {
  assertFineTuningPrivateAnswerQualityCasePayloadRecord,
} from './fine-tuning-private-answer-quality-case-payload.mjs';
import {
  assertFineTuningPrivateAnswerQualityCaseReplay,
  assertFineTuningPrivateAnswerQualityCaseReplayRelation,
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord,
} from './fine-tuning-private-answer-quality-case-replay.mjs';
import { buildFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import {
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt,
} from './fine-tuning-private-reviewed-example-canonicalization.mjs';
import { buildTrainingDatasetManifest } from './training-dataset-quality.mjs';

export const FINE_TUNING_PRIVATE_COMBINED_READINESS_IMPACT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-combined-readiness-impact-shadow/v1';

const MEASUREMENT_KEYS = [
  'acceptedExamples',
  'acceptedRiskExamples',
  'acceptedRiskRate',
  'answerQualityCases',
  'missionScopes',
  'trainExamples',
  'validationExamples',
];

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function measurementDelta(baseline, projection) {
  return Object.fromEntries(
    MEASUREMENT_KEYS.map((key) => [
      key,
      Number((projection[key] - baseline[key]).toFixed(6)),
    ]),
  );
}

function summarize({ assessment, evaluation, manifest, readiness }) {
  return {
    assessmentSha256: hash(assessment),
    answerQualityEvaluationSha256: hash(evaluation),
    bindings: assessment.bindings,
    datasetManifestSha256: hash(manifest),
    decision: assessment.decision,
    exportDigests: readiness.exportDigests,
    failedCheckIds: assessment.failedCheckIds,
    measurements: assessment.measurements,
    readinessSha256: hash(readiness),
    status: assessment.status,
  };
}

function rebuildBaseline(context) {
  const manifest = buildTrainingDatasetManifest({
    records: context.records,
    seed: context.datasetManifest.seed,
  });
  if (JSON.stringify(manifest) !== JSON.stringify(context.datasetManifest)) {
    throw new Error('Private combined readiness impact baseline dataset drifted.');
  }
  if (
    JSON.stringify(context.baselineEvaluation.thresholds) !==
    JSON.stringify(FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS)
  ) {
    throw new Error('Private combined readiness impact baseline thresholds drifted.');
  }
  const evaluation = evaluateAnswerQualitySuite({
    cases: context.answerQualityCases,
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  if (JSON.stringify(evaluation) !== JSON.stringify(context.baselineEvaluation)) {
    throw new Error('Private combined readiness impact baseline evaluation drifted.');
  }
  const readiness = buildFineTuningReadinessPackage({
    baselineEvaluation: evaluation,
    datasetManifest: manifest,
    records: context.records,
  });
  if (JSON.stringify(readiness) !== JSON.stringify(context.readinessPackage)) {
    throw new Error('Private combined readiness impact baseline readiness drifted.');
  }
  const assessment = assessFineTuningDataSufficiency({ readinessPackage: readiness });
  if (JSON.stringify(assessment) !== JSON.stringify(context.sufficiencyAssessment)) {
    throw new Error('Private combined readiness impact baseline assessment drifted.');
  }
  return { assessment, evaluation, manifest, readiness };
}

function assertUniqueCase(cases, candidate) {
  if (cases.some((entry) => entry.id === candidate.id)) {
    throw new Error('Private combined readiness impact duplicate case id is not allowed.');
  }
  const { id: _candidateId, ...candidateDefinition } = candidate;
  const candidateHash = hash(canonicalize(candidateDefinition));
  if (cases.some((entry) => {
    const { id: _entryId, ...definition } = entry;
    return hash(canonicalize(definition)) === candidateHash;
  })) {
    throw new Error('Private combined readiness impact duplicate case definition is not allowed.');
  }
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function derive(context) {
  assertTrustedContext(context);
  const {
    answerQualityCase,
    baselineContext,
    item,
    payload,
    record,
    recordReceipt,
    replayReceipt,
    replayRequest,
    trackedAssessment,
    workspace,
  } = context;
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(recordReceipt, { record });
  assertFineTuningPrivateAnswerQualityCasePayloadRecord(payload);
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(replayRequest);
  assertFineTuningPrivateAnswerQualityCaseReplayRelation({ receipt: replayReceipt, request: replayRequest });
  assertFineTuningPrivateAnswerQualityCaseReplay(replayReceipt, {
    answerQualityCase,
    item,
    payload,
    request: replayRequest,
    workspace,
  });

  const baseline = rebuildBaseline(baselineContext);
  if (JSON.stringify(baseline.assessment) !== JSON.stringify(trackedAssessment)) {
    throw new Error('Private combined readiness impact tracked sufficiency baseline drifted.');
  }

  const records = [...baselineContext.records, record];
  const manifest = buildTrainingDatasetManifest({ records, seed: baseline.manifest.seed });
  const baselineIds = new Set([
    ...baseline.manifest.splits.train.map((entry) => entry.id),
    ...baseline.manifest.splits.validation.map((entry) => entry.id),
  ]);
  const projectedIds = new Set([
    ...manifest.splits.train.map((entry) => entry.id),
    ...manifest.splits.validation.map((entry) => entry.id),
  ]);
  if (
    !projectedIds.has(record.id) ||
    projectedIds.size !== baselineIds.size + 1 ||
    [...baselineIds].some((id) => !projectedIds.has(id))
  ) {
    throw new Error('Private combined readiness impact requires accepted record growth without displacement.');
  }

  const projectedCase = payload.payload.caseDefinition;
  assertUniqueCase(baselineContext.answerQualityCases, projectedCase);
  const evaluation = evaluateAnswerQualitySuite({
    cases: [...baselineContext.answerQualityCases, projectedCase],
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  if (evaluation.status !== 'passed') {
    throw new Error('Private combined readiness impact projected Q1 suite failed.');
  }
  const readiness = buildFineTuningReadinessPackage({
    baselineEvaluation: evaluation,
    datasetManifest: manifest,
    records,
  });
  const assessment = assessFineTuningDataSufficiency({ readinessPackage: readiness });
  const baselineSummary = summarize(baseline);
  const projectionSummary = summarize({ assessment, evaluation, manifest, readiness });
  const delta = measurementDelta(baseline.assessment.measurements, assessment.measurements);
  if (
    JSON.stringify(delta) !== JSON.stringify({
      acceptedExamples: 1,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 1,
      missionScopes: 1,
      trainExamples: 1,
      validationExamples: 0,
    }) ||
    assessment.failedCheckIds.length !== 5 ||
    assessment.decision !== 'collect-more-reviewed-data' ||
    assessment.status !== 'insufficient-data'
  ) {
    throw new Error('Private combined readiness impact projection did not match the frozen synthetic expectation.');
  }
  return {
    actualDatasetRebuilt: false,
    actualDeploymentPerformed: false,
    actualModelEvaluated: false,
    actualModelTrainingExecuted: false,
    actualReadinessReplaced: false,
    actualSufficiencyChanged: false,
    actualUserDataCollected: false,
    auditRecorded: false,
    baseline: baselineSummary,
    candidateTrainingReviewAllowed: false,
    collectionActionCompletionRecorded: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    mutationPerformed: false,
    productionReadyClaim: false,
    providerAuthorized: false,
    projection: { ...projectionSummary, delta, disposition: 'accepted-in-memory-only' },
    receiptDigests: {
      answerQualityCaseSha256: hash(answerQualityCase),
      payloadSha256: hash(payload),
      recordReceiptSha256: hash(recordReceipt),
      recordSha256: hash(record),
      replayReceiptSha256: hash(replayReceipt),
      replayRequestSha256: hash(replayRequest),
    },
    schemaVersion: FINE_TUNING_PRIVATE_COMBINED_READINESS_IMPACT_SCHEMA_VERSION,
    shadowOnly: true,
    deploymentAuthorized: false,
    timelineRecorded: false,
    trainingAuthorized: false,
  };
}

export function buildFineTuningPrivateCombinedReadinessImpactShadow(context = {}) {
  const content = derive(context);
  const projectionHash = hash(content);
  return assertFineTuningPrivateCombinedReadinessImpactShadow({
    ...content,
    id: `private-combined-readiness-impact-shadow-${projectionHash}`,
    projectionHash,
  }, context);
}

export function assertFineTuningPrivateCombinedReadinessImpactShadow(value, context) {
  const content = derive(context);
  const projectionHash = hash(content);
  const expected = {
    ...content,
    id: `private-combined-readiness-impact-shadow-${projectionHash}`,
    projectionHash,
  };
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error('Private combined readiness impact shadow integrity failed against trusted verification context.');
  }
  return value;
}

function assertTrustedContext(context) {
  const required = [
    'answerQualityCase', 'baselineContext', 'item', 'payload', 'record', 'recordReceipt',
    'replayReceipt', 'replayRequest', 'trackedAssessment', 'workspace',
  ];
  if (!context || typeof context !== 'object' || required.some((key) => context[key] === undefined)) {
    throw new Error('Private combined readiness impact shadow requires trusted verification context.');
  }
}
