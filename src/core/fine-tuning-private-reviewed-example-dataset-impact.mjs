import { createHash } from 'node:crypto';

import {
  assessFineTuningDataSufficiency,
  evaluateFineTuningDataSufficiencyChecks,
} from './fine-tuning-data-sufficiency.mjs';
import { buildFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import { assertFineTuningPrivateReviewedExampleCanonicalizationReceipt } from './fine-tuning-private-reviewed-example-canonicalization.mjs';
import { buildTrainingDatasetManifest } from './training-dataset-quality.mjs';

export const FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_DATASET_IMPACT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-reviewed-example-dataset-impact-shadow/v1';

const DISPOSITIONS = new Set([
  'accepted-in-shadow',
  'excluded-content',
  'excluded-exact',
  'excluded-lineage',
  'excluded-near-response',
]);

const BINDING_KEYS = [
  'datasetHash',
  'datasetManifestHash',
  'evaluationManifestHash',
  'readinessHash',
  'trainSha256',
  'validationSha256',
];

const FALSE_BOUNDARIES = [
  'actualModelTrainingExecuted',
  'actualPrivateDatasetRebuilt',
  'actualSufficiencyChanged',
  'actualUserDataCollected',
  'auditRecorded',
  'candidateTrainingReviewAllowed',
  'collectionActionCompletionRecorded',
  'datasetLevelAdmissionGranted',
  'externalSubmissionAuthorized',
  'fineTuningExecutionAuthorized',
  'mutationPerformed',
  'productionReadyClaim',
  'timelineRecorded',
  'trainingAuthorized',
];

const MEASUREMENT_KEYS = [
  'acceptedExamples',
  'acceptedRiskExamples',
  'acceptedRiskRate',
  'answerQualityCases',
  'missionScopes',
  'trainExamples',
  'validationExamples',
];

const TRACKED_BASELINE_MEASUREMENTS = {
  acceptedExamples: 4,
  acceptedRiskExamples: 0,
  acceptedRiskRate: 0,
  answerQualityCases: 2,
  missionScopes: 4,
  trainExamples: 3,
  validationExamples: 1,
};

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function exactKeys(value, keys) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort())
  );
}

function summarizeAssessment({ assessment, manifest, readiness }) {
  return {
    assessmentSha256: hash(assessment),
    bindings: assessment.bindings,
    datasetManifestSha256: hash(manifest),
    decision: assessment.decision,
    failedCheckIds: assessment.failedCheckIds,
    measurements: assessment.measurements,
    readinessPackageSha256: hash(readiness),
    status: assessment.status,
  };
}

function acceptedRecordIds(manifest) {
  return new Set([
    ...manifest.splits.train.map((entry) => entry.id),
    ...manifest.splits.validation.map((entry) => entry.id),
  ]);
}

function describeDisposition(baselineManifest, shadowManifest, record) {
  const exclusion = shadowManifest.deduplication.excludedRecords.find(
    (entry) => entry.id === record.id,
  );
  if (!exclusion) {
    const baselineIds = acceptedRecordIds(baselineManifest);
    const shadowIds = acceptedRecordIds(shadowManifest);
    return {
      baselineRecordDisplaced: [...baselineIds].some(
        (recordId) => !shadowIds.has(recordId),
      ),
      deduplicationReason: null,
      disposition: 'accepted-in-shadow',
    };
  }
  const disposition = {
    'exact-content': 'excluded-content',
    'exact-lineage': 'excluded-lineage',
    'exact-record': 'excluded-exact',
    'near-response': 'excluded-near-response',
  }[exclusion.reason];
  if (!disposition) {
    throw new Error(
      'Private reviewed example dataset impact deduplication reason is invalid.',
    );
  }
  return {
    baselineRecordDisplaced: false,
    deduplicationReason: exclusion.reason,
    disposition,
  };
}

function measurementDelta(baseline, shadow) {
  return Object.fromEntries(
    MEASUREMENT_KEYS.map((key) => [
      key,
      Number((shadow[key] - baseline[key]).toFixed(6)),
    ]),
  );
}

function rebuildBaseline(context) {
  const manifest = buildTrainingDatasetManifest({
    records: context?.records,
    seed: context?.datasetManifest?.seed,
  });
  if (JSON.stringify(manifest) !== JSON.stringify(context?.datasetManifest)) {
    throw new Error('Private reviewed example dataset impact baseline manifest drifted.');
  }

  const readiness = buildFineTuningReadinessPackage({
    baselineEvaluation: context?.baselineEvaluation,
    datasetManifest: manifest,
    records: context?.records,
  });
  if (JSON.stringify(readiness) !== JSON.stringify(context?.readinessPackage)) {
    throw new Error('Private reviewed example dataset impact baseline readiness drifted.');
  }

  const assessment = assessFineTuningDataSufficiency({ readinessPackage: readiness });
  if (
    context?.sufficiencyAssessment &&
    JSON.stringify(assessment) !== JSON.stringify(context.sufficiencyAssessment)
  ) {
    throw new Error('Private reviewed example dataset impact baseline assessment drifted.');
  }
  return { assessment, manifest, readiness };
}

export function buildFineTuningPrivateReviewedExampleDatasetImpactShadow({
  baselineContext,
  record,
  receipt,
  trackedAssessment,
} = {}) {
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(receipt, { record });

  const baseline = rebuildBaseline(baselineContext);
  if (
    trackedAssessment &&
    JSON.stringify(baseline.assessment) !== JSON.stringify(trackedAssessment)
  ) {
    throw new Error(
      'Private reviewed example dataset impact tracked sufficiency baseline drifted.',
    );
  }

  const shadowRecords = [...baselineContext.records, record];
  const shadowManifest = buildTrainingDatasetManifest({
    records: shadowRecords,
    seed: baseline.manifest.seed,
  });
  const shadowReadiness = buildFineTuningReadinessPackage({
    baselineEvaluation: baselineContext.baselineEvaluation,
    datasetManifest: shadowManifest,
    records: shadowRecords,
  });
  const shadowAssessment = assessFineTuningDataSufficiency({
    readinessPackage: shadowReadiness,
  });

  const baselineSummary = summarizeAssessment({
    assessment: baseline.assessment,
    manifest: baseline.manifest,
    readiness: baseline.readiness,
  });
  const projectionSummary = summarizeAssessment({
    assessment: shadowAssessment,
    manifest: shadowManifest,
    readiness: shadowReadiness,
  });
  const content = {
    actualModelTrainingExecuted: false,
    actualPrivateDatasetRebuilt: false,
    actualSufficiencyChanged: false,
    actualUserDataCollected: false,
    auditRecorded: false,
    baseline: baselineSummary,
    candidateTrainingReviewAllowed: false,
    collectionActionCompletionRecorded: false,
    datasetLevelAdmissionGranted: false,
    executionAction: 'rebuild-readiness-and-reassess',
    executionMode: 'shadow-only',
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    mutationPerformed: false,
    productionReadyClaim: false,
    projection: {
      ...projectionSummary,
      ...describeDisposition(baseline.manifest, shadowManifest, record),
      delta: measurementDelta(
        baseline.assessment.measurements,
        shadowAssessment.measurements,
      ),
    },
    recordEligibilityPreviouslyValidated: true,
    recordReceiptDigests: {
      receiptSha256: hash(receipt),
      recordSha256: hash(record),
    },
    schemaVersion:
      FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_DATASET_IMPACT_SCHEMA_VERSION,
    syntheticShadowProjection: true,
    timelineRecorded: false,
    trainingAuthorized: false,
  };
  const projectionHash = hash(content);
  return assertFineTuningPrivateReviewedExampleDatasetImpactShadow({
    ...content,
    id: `private-reviewed-example-dataset-impact-shadow-${projectionHash}`,
    projectionHash,
  });
}

export function assertFineTuningPrivateReviewedExampleDatasetImpactShadow(value) {
  const { id, projectionHash, ...content } = value || {};
  const contentKeys = [
    ...FALSE_BOUNDARIES,
    'baseline',
    'executionAction',
    'executionMode',
    'externalProviderCalls',
    'projection',
    'recordEligibilityPreviouslyValidated',
    'recordReceiptDigests',
    'schemaVersion',
    'syntheticShadowProjection',
  ];
  const summaryKeys = [
    'assessmentSha256',
    'bindings',
    'datasetManifestSha256',
    'decision',
    'failedCheckIds',
    'measurements',
    'readinessPackageSha256',
    'status',
  ];
  const expectedDelta = content.baseline?.measurements && content.projection?.measurements
    ? measurementDelta(
      content.baseline.measurements,
      content.projection.measurements,
    )
    : null;
  if (
    !exactKeys(value, [...contentKeys, 'id', 'projectionHash']) ||
    !exactKeys(content, contentKeys) ||
    !exactKeys(content.baseline, summaryKeys) ||
    !exactKeys(content.projection, [
      ...summaryKeys,
      'baselineRecordDisplaced',
      'deduplicationReason',
      'delta',
      'disposition',
    ]) ||
    !exactKeys(content.recordReceiptDigests, ['receiptSha256', 'recordSha256']) ||
    !exactKeys(content.baseline.bindings, BINDING_KEYS) ||
    !exactKeys(content.projection.bindings, BINDING_KEYS) ||
    !exactKeys(content.baseline.measurements, MEASUREMENT_KEYS) ||
    !exactKeys(content.projection.measurements, MEASUREMENT_KEYS) ||
    !exactKeys(content.projection.delta, MEASUREMENT_KEYS) ||
    content.schemaVersion !==
      FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_DATASET_IMPACT_SCHEMA_VERSION ||
    projectionHash !== hash(content) ||
    id !== `private-reviewed-example-dataset-impact-shadow-${projectionHash}` ||
    content.executionAction !== 'rebuild-readiness-and-reassess' ||
    content.executionMode !== 'shadow-only' ||
    content.externalProviderCalls !== 'none' ||
    FALSE_BOUNDARIES.some((key) => content[key] !== false) ||
    content.recordEligibilityPreviouslyValidated !== true ||
    content.syntheticShadowProjection !== true ||
    !DISPOSITIONS.has(content.projection.disposition) ||
    !dispositionMatchesReason(
      content.projection.disposition,
      content.projection.deduplicationReason,
    ) ||
    typeof content.projection.baselineRecordDisplaced !== 'boolean' ||
    JSON.stringify(content.baseline.measurements) !==
      JSON.stringify(TRACKED_BASELINE_MEASUREMENTS) ||
    JSON.stringify(content.projection.delta) !== JSON.stringify(expectedDelta) ||
    !sufficiencySummaryMatchesChecks(content.baseline, content) ||
    !sufficiencySummaryMatchesChecks(content.projection, content) ||
    content.projection.delta.answerQualityCases !== 0 ||
    !dispositionMatchesDelta(
      content.projection.disposition,
      content.projection.baselineRecordDisplaced,
      content.projection.delta,
    ) ||
    !MEASUREMENT_KEYS.every(
      (key) =>
        Number.isFinite(content.baseline.measurements?.[key]) &&
        Number.isFinite(content.projection.measurements?.[key]) &&
        Number.isFinite(content.projection.delta?.[key]),
    ) ||
    !BINDING_KEYS.every(
      (key) =>
        /^[a-f0-9]{64}$/u.test(content.baseline.bindings?.[key]) &&
        /^[a-f0-9]{64}$/u.test(content.projection.bindings?.[key]),
    ) ||
    ![
      content.baseline.assessmentSha256,
      content.baseline.datasetManifestSha256,
      content.baseline.readinessPackageSha256,
      content.projection.assessmentSha256,
      content.projection.datasetManifestSha256,
      content.projection.readinessPackageSha256,
      content.recordReceiptDigests.receiptSha256,
      content.recordReceiptDigests.recordSha256,
    ].every((digest) => /^[a-f0-9]{64}$/u.test(digest))
  ) {
    throw new Error('Private reviewed example dataset impact shadow is invalid.');
  }
  return value;
}

function dispositionMatchesReason(disposition, reason) {
  return (
    (disposition === 'accepted-in-shadow' && reason === null) ||
    (disposition === 'excluded-exact' && reason === 'exact-record') ||
    (disposition === 'excluded-lineage' && reason === 'exact-lineage') ||
    (disposition === 'excluded-content' && reason === 'exact-content') ||
    (disposition === 'excluded-near-response' && reason === 'near-response')
  );
}

function dispositionMatchesDelta(disposition, baselineRecordDisplaced, delta) {
  if (disposition === 'accepted-in-shadow') {
    const acceptedDelta = baselineRecordDisplaced ? 0 : 1;
    const validMissionScopeDeltas = baselineRecordDisplaced
      ? [-1, 0, 1]
      : [0, 1];
    return (
      delta.acceptedExamples === acceptedDelta &&
      delta.trainExamples + delta.validationExamples === acceptedDelta &&
      validMissionScopeDeltas.includes(delta.missionScopes)
    );
  }
  return (
    baselineRecordDisplaced === false &&
    delta.acceptedExamples === 0 &&
    delta.trainExamples === 0 &&
    delta.validationExamples === 0 &&
    delta.missionScopes === 0
  );
}

function sufficiencySummaryMatchesChecks(summary, authority) {
  const checks = evaluateFineTuningDataSufficiencyChecks({
    authority,
    bindings: summary.bindings,
    measurements: summary.measurements,
  });
  const failedCheckIds = checks
    .filter((check) => !check.passed)
    .map((check) => check.id);
  const sufficient = failedCheckIds.length === 0;
  return (
    JSON.stringify(summary.failedCheckIds) === JSON.stringify(failedCheckIds) &&
    summary.decision === (
      sufficient
        ? 'request-candidate-training-review-approval'
        : 'collect-more-reviewed-data'
    ) &&
    summary.status === (
      sufficient
        ? 'sufficient-for-candidate-review-request'
        : 'insufficient-data'
    )
  );
}
