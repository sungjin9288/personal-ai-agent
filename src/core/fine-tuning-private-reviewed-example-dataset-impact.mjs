import { createHash } from 'node:crypto';

import { assessFineTuningDataSufficiency } from './fine-tuning-data-sufficiency.mjs';
import { buildFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import { assertFineTuningPrivateReviewedExampleCanonicalizationReceipt } from './fine-tuning-private-reviewed-example-canonicalization.mjs';
import { buildTrainingDatasetManifest } from './training-dataset-quality.mjs';

export const FINE_TUNING_PRIVATE_REVIEWED_EXAMPLE_DATASET_IMPACT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-reviewed-example-dataset-impact-shadow/v1';

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
  const trustedContext = {
    baselineContext,
    record,
    receipt,
    trackedAssessment: trackedAssessment || baselineContext?.sufficiencyAssessment,
  };
  const content = deriveFineTuningPrivateReviewedExampleDatasetImpactShadow(trustedContext);
  const projectionHash = hash(content);
  return assertFineTuningPrivateReviewedExampleDatasetImpactShadow({
    ...content,
    id: `private-reviewed-example-dataset-impact-shadow-${projectionHash}`,
    projectionHash,
  }, trustedContext);
}

function deriveFineTuningPrivateReviewedExampleDatasetImpactShadow({
  baselineContext,
  record,
  receipt,
  trackedAssessment,
} = {}) {
  assertTrustedVerificationContext({
    baselineContext,
    record,
    receipt,
    trackedAssessment,
  });
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
  return content;
}

export function assertFineTuningPrivateReviewedExampleDatasetImpactShadow(value, context) {
  assertTrustedVerificationContext(context);
  const content = deriveFineTuningPrivateReviewedExampleDatasetImpactShadow(context);
  const projectionHash = hash(content);
  const expected = {
    ...content,
    id: `private-reviewed-example-dataset-impact-shadow-${projectionHash}`,
    projectionHash,
  };
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error(
      'Private reviewed example dataset impact shadow integrity failed against trusted verification context.',
    );
  }
  return value;
}

function assertTrustedVerificationContext(context) {
  if (
    !context ||
    typeof context !== 'object' ||
    ['baselineContext', 'record', 'receipt', 'trackedAssessment'].some(
      (key) => context[key] === undefined,
    )
  ) {
    throw new Error(
      'Private reviewed example dataset impact shadow requires trusted verification context.',
    );
  }
}
