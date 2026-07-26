import { createHash } from 'node:crypto';

import { evaluateAnswerQualitySuite } from './answer-quality-evaluation.mjs';
import {
  assessFineTuningDataSufficiency,
  evaluateFineTuningDataSufficiencyChecks,
} from './fine-tuning-data-sufficiency.mjs';
import {
  FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
} from './fine-tuning-private-answer-quality-case.mjs';
import {
  assertFineTuningPrivateAnswerQualityCasePayloadRecord,
} from './fine-tuning-private-answer-quality-case-payload.mjs';
import {
  assertFineTuningPrivateAnswerQualityCaseReplay,
  assertFineTuningPrivateAnswerQualityCaseReplayRelation,
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord,
} from './fine-tuning-private-answer-quality-case-replay.mjs';
import { buildFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import { buildTrainingDatasetManifest } from './training-dataset-quality.mjs';

export const FINE_TUNING_PRIVATE_ANSWER_QUALITY_READINESS_IMPACT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-readiness-impact-shadow/v1';

const MEASUREMENT_KEYS = [
  'acceptedExamples',
  'acceptedRiskExamples',
  'acceptedRiskRate',
  'answerQualityCases',
  'missionScopes',
  'trainExamples',
  'validationExamples',
];

const SUMMARY_COMMITMENT_KEYS = [
  'assessmentSha256',
  'answerQualityEvaluationSha256',
  'bindings',
  'decision',
  'exportDigests',
  'failedCheckIds',
  'measurements',
  'readinessSha256',
  'status',
];

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => canonicalize(entry))
      .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function summarize({ assessment, evaluation, readiness }) {
  const summary = {
    assessmentSha256: hash(assessment),
    answerQualityEvaluationSha256: hash(evaluation),
    bindings: assessment.bindings,
    decision: assessment.decision,
    exportDigests: readiness.exportDigests,
    failedCheckIds: assessment.failedCheckIds,
    measurements: assessment.measurements,
    readinessSha256: hash(readiness),
    status: assessment.status,
  };
  return { ...summary, summaryCommitment: summaryCommitment(summary) };
}

function summaryCommitment(summary) {
  return hash(
    Object.fromEntries(
      SUMMARY_COMMITMENT_KEYS.map((key) => [key, summary[key]]),
    ),
  );
}

function provenanceCommitment({ baseline, projection }) {
  return hash({
    baselineSummaryCommitment: baseline.summaryCommitment,
    projectionSummaryCommitment: projection.summaryCommitment,
    trackedAssessmentSha256: baseline.assessmentSha256,
  });
}

function rebuildBaseline(context) {
  const datasetManifest = buildTrainingDatasetManifest({
    records: context?.records,
    seed: context?.datasetManifest?.seed,
  });
  if (JSON.stringify(datasetManifest) !== JSON.stringify(context?.datasetManifest)) {
    throw new Error('Private answer-quality readiness impact baseline dataset drifted.');
  }

  if (
    JSON.stringify(context?.baselineEvaluation?.thresholds) !==
    JSON.stringify(FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS)
  ) {
    throw new Error('Private answer-quality readiness impact baseline thresholds drifted.');
  }
  const evaluation = evaluateAnswerQualitySuite({
    cases: context?.answerQualityCases,
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  if (JSON.stringify(evaluation) !== JSON.stringify(context?.baselineEvaluation)) {
    throw new Error('Private answer-quality readiness impact baseline evaluation drifted.');
  }

  const readiness = buildFineTuningReadinessPackage({
    baselineEvaluation: evaluation,
    datasetManifest,
    records: context?.records,
  });
  if (JSON.stringify(readiness) !== JSON.stringify(context?.readinessPackage)) {
    throw new Error('Private answer-quality readiness impact baseline readiness drifted.');
  }

  const assessment = assessFineTuningDataSufficiency({ readinessPackage: readiness });
  if (JSON.stringify(assessment) !== JSON.stringify(context?.sufficiencyAssessment)) {
    throw new Error('Private answer-quality readiness impact baseline assessment drifted.');
  }
  return { assessment, datasetManifest, evaluation, readiness };
}

function assertUniqueProjectionCase(baselineCases, definition) {
  const { id: _id, ...definitionWithoutId } = definition || {};
  const definitionHash = hash(canonicalize(definitionWithoutId));
  if (baselineCases.some((entry) => entry.id === definition.id)) {
    throw new Error('Private answer-quality readiness impact duplicate case id is not allowed.');
  }
  if (
    baselineCases.some((entry) => {
      const { id: _id, ...entryWithoutId } = entry;
      return hash(canonicalize(entryWithoutId)) === definitionHash;
    })
  ) {
    throw new Error('Private answer-quality readiness impact duplicate case definition is not allowed.');
  }
}

function measurementDelta(baseline, projection) {
  return Object.fromEntries(
    MEASUREMENT_KEYS.map((key) => [
      key,
      Number((projection[key] - baseline[key]).toFixed(6)),
    ]),
  );
}

function deriveFineTuningPrivateAnswerQualityReadinessImpactShadow({
  answerQualityCase,
  baselineContext,
  item,
  payload,
  receipt,
  request,
  trackedAssessment,
  workspace,
} = {}) {
  assertTrustedVerificationContext({
    answerQualityCase,
    baselineContext,
    item,
    payload,
    receipt,
    request,
    trackedAssessment,
    workspace,
  });
  assertFineTuningPrivateAnswerQualityCasePayloadRecord(payload);
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(request);
  assertFineTuningPrivateAnswerQualityCaseReplayRelation({ receipt, request });
  assertFineTuningPrivateAnswerQualityCaseReplay(receipt, {
    answerQualityCase,
    item,
    payload,
    request,
    workspace,
  });

  const baseline = rebuildBaseline(baselineContext);
  if (JSON.stringify(baseline.assessment) !== JSON.stringify(trackedAssessment)) {
    throw new Error('Private answer-quality readiness impact tracked sufficiency baseline drifted.');
  }

  const projectedCase = payload.payload.caseDefinition;
  assertUniqueProjectionCase(baselineContext.answerQualityCases, projectedCase);
  const projectionEvaluation = evaluateAnswerQualitySuite({
    cases: [...baselineContext.answerQualityCases, projectedCase],
    thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  });
  if (projectionEvaluation.status !== 'passed') {
    throw new Error('Private answer-quality readiness impact projected Q1 suite failed.');
  }
  const projectionReadiness = buildFineTuningReadinessPackage({
    baselineEvaluation: projectionEvaluation,
    datasetManifest: baseline.datasetManifest,
    records: baselineContext.records,
  });
  const projectionAssessment = assessFineTuningDataSufficiency({
    readinessPackage: projectionReadiness,
  });
  const projectionChecks = evaluateFineTuningDataSufficiencyChecks({
    authority: projectionAssessment,
    bindings: projectionAssessment.bindings,
    measurements: projectionAssessment.measurements,
  });
  if (JSON.stringify(projectionAssessment.checks) !== JSON.stringify(projectionChecks)) {
    throw new Error('Private answer-quality readiness impact projection checks drifted.');
  }

  const baselineSummary = summarize({
    assessment: baseline.assessment,
    evaluation: baseline.evaluation,
    readiness: baseline.readiness,
  });
  const projectionSummary = summarize({
    assessment: projectionAssessment,
    evaluation: projectionEvaluation,
    readiness: projectionReadiness,
  });
  const content = {
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
    provenanceCommitment: provenanceCommitment({
      baseline: baselineSummary,
      projection: projectionSummary,
    }),
    projection: {
      ...projectionSummary,
      delta: measurementDelta(
        baseline.assessment.measurements,
        projectionAssessment.measurements,
      ),
      disposition: 'accepted-in-memory-only',
    },
    receiptDigests: {
      answerQualityCaseSha256: hash(answerQualityCase),
      payloadSha256: hash(payload),
      receiptSha256: hash(receipt),
      replayRequestSha256: hash(request),
    },
    schemaVersion: FINE_TUNING_PRIVATE_ANSWER_QUALITY_READINESS_IMPACT_SCHEMA_VERSION,
    shadowOnly: true,
    timelineRecorded: false,
    trainingAuthorized: false,
  };
  return content;
}

function recordFromContent(content) {
  const projectionHash = hash(content);
  return {
    ...content,
    id: `private-answer-quality-readiness-impact-shadow-${projectionHash}`,
    projectionHash,
  };
}

export function buildFineTuningPrivateAnswerQualityReadinessImpactShadow(context = {}) {
  const value = recordFromContent(
    deriveFineTuningPrivateAnswerQualityReadinessImpactShadow(context),
  );
  return assertFineTuningPrivateAnswerQualityReadinessImpactShadow(value, context);
}

export function assertFineTuningPrivateAnswerQualityReadinessImpactShadow(value, context) {
  const expected = recordFromContent(
    deriveFineTuningPrivateAnswerQualityReadinessImpactShadow(context),
  );
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error(
      'Private answer-quality readiness impact shadow integrity failed against trusted verification context.',
    );
  }
  return value;
}

function assertTrustedVerificationContext(context) {
  const required = [
    'answerQualityCase',
    'baselineContext',
    'item',
    'payload',
    'receipt',
    'request',
    'trackedAssessment',
    'workspace',
  ];
  if (
    !context ||
    typeof context !== 'object' ||
    required.some((key) => context[key] === undefined)
  ) {
    throw new Error(
      'Private answer-quality readiness impact shadow requires trusted verification context.',
    );
  }
}
