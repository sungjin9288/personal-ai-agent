import { createHash } from 'node:crypto';

import {
  buildFineTuningDataCollectionPlan,
} from './fine-tuning-data-collection-plan.mjs';
import {
  rebuildFineTuningPrivateCombinedReadinessImpact,
} from './fine-tuning-private-combined-readiness-impact.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_GAP_REPLAN_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-gap-replan-shadow/v1';

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function summarizeAssessment(assessment) {
  return {
    assessmentSha256: hash(assessment),
    failedCheckIds: assessment.failedCheckIds,
    measurements: assessment.measurements,
  };
}

function summarizePlan(plan) {
  return {
    actionIds: plan.actions.map((action) => action.id),
    dataCollectionPlanSha256: hash(plan),
    decision: plan.decision,
    gaps: plan.gaps,
    status: plan.status,
  };
}

function derive(context) {
  if (!context || typeof context !== 'object' || !context.trackedCollectionPlan) {
    throw new Error('Private collection-gap replan requires trusted verification context.');
  }

  const { baseline, projection } =
    rebuildFineTuningPrivateCombinedReadinessImpact(context);
  const baselinePlan = buildFineTuningDataCollectionPlan({
    assessment: baseline.assessment,
  });
  if (
    JSON.stringify(baselinePlan) !== JSON.stringify(context.trackedCollectionPlan)
  ) {
    throw new Error('Private collection-gap replan tracked F1.2 plan drifted.');
  }

  const projectedPlan = buildFineTuningDataCollectionPlan({
    assessment: projection.assessment,
  });
  const { measurements } = projection.assessment;
  const { gaps } = projectedPlan;
  const expectedActions = [
    'collect-distinct-reviewed-mission-examples',
    'expand-answer-quality-baseline',
    'rebuild-readiness-and-reassess',
  ];
  if (
    JSON.stringify(measurements) !== JSON.stringify({
      acceptedExamples: 5,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 3,
      missionScopes: 5,
      trainExamples: 4,
      validationExamples: 1,
    }) ||
    gaps.reviewedExamples.acceptedExamples.remaining !== 15 ||
    gaps.reviewedExamples.trainExamples.remaining !== 12 ||
    gaps.reviewedExamples.validationExamples.remaining !== 3 ||
    gaps.missionScopes.remaining !== 5 ||
    gaps.answerQualityCases.remaining !== 7 ||
    gaps.reviewedExamples.minimumAdditionalReviewedExamples !== 15 ||
    projectedPlan.governanceRemediationRequired !== false ||
    projection.assessment.failedCheckIds.length !== 5 ||
    projectedPlan.decision !== 'collect-more-reviewed-data' ||
    projectedPlan.status !== 'reviewed-data-collection-required' ||
    JSON.stringify(projectedPlan.actions.map((action) => action.id)) !==
      JSON.stringify(expectedActions)
  ) {
    throw new Error(
      'Private collection-gap replan did not match the frozen synthetic expectation.',
    );
  }

  return {
    acceptedRiskRemediationRequired: false,
    actualDatasetRebuilt: false,
    actualModelTrainingExecuted: false,
    actualReadinessReplaced: false,
    actualSufficiencyChanged: false,
    actualUserDataCollected: false,
    auditRecorded: false,
    baseline: {
      ...summarizeAssessment(baseline.assessment),
      trackedDataCollectionPlanSha256: hash(context.trackedCollectionPlan),
    },
    candidateTrainingReviewAllowed: false,
    collectionActionCompletionRecorded: false,
    collectionAuthorized: false,
    collectionExecutionAuthorized: false,
    deploymentAuthorized: false,
    externalProviderCalls: 'none',
    externalSubmissionAuthorized: false,
    fineTuningExecutionAuthorized: false,
    mutationPerformed: false,
    productionReadyClaim: false,
    projection: {
      ...summarizeAssessment(projection.assessment),
      ...summarizePlan(projectedPlan),
    },
    providerAuthorized: false,
    reviewedExampleCollectionAuthorized: false,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_GAP_REPLAN_SCHEMA_VERSION,
    shadowOnly: true,
    timelineRecorded: false,
    trackedIntakeRequestAmended: false,
    trackedPlanReplaced: false,
    trainingAuthorized: false,
  };
}

export function buildFineTuningPrivateCollectionGapReplanShadow(context = {}) {
  const content = derive(context);
  const projectionHash = hash(content);
  return assertFineTuningPrivateCollectionGapReplanShadow({
    ...content,
    id: `private-collection-gap-replan-shadow-${projectionHash}`,
    projectionHash,
  }, context);
}

export function assertFineTuningPrivateCollectionGapReplanShadow(value, context) {
  const content = derive(context);
  const projectionHash = hash(content);
  const expected = {
    ...content,
    id: `private-collection-gap-replan-shadow-${projectionHash}`,
    projectionHash,
  };
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new Error(
      'Private collection-gap replan shadow integrity failed against trusted verification context.',
    );
  }
  return value;
}
