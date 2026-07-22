import { createHash } from 'node:crypto';

import {
  assertFineTuningDataSufficiencyAssessment,
} from './fine-tuning-data-sufficiency.mjs';

export const FINE_TUNING_DATA_COLLECTION_PLAN_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-data-collection-plan/v1';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function remaining(current, target) {
  return Math.max(0, target - current);
}

function buildBindings(assessment) {
  return {
    assessmentHash: assessment.assessmentHash,
    assessmentId: assessment.id,
    datasetHash: assessment.bindings.datasetHash,
    datasetManifestHash: assessment.bindings.datasetManifestHash,
    evaluationManifestHash: assessment.bindings.evaluationManifestHash,
    policyHash: assessment.policy.policyHash,
    policyId: assessment.policy.id,
    readinessHash: assessment.bindings.readinessHash,
    trainSha256: assessment.bindings.trainSha256,
    validationSha256: assessment.bindings.validationSha256,
  };
}

function countGap(current, target) {
  return {
    current,
    remaining: remaining(current, target),
    target,
  };
}

function buildGaps(assessment) {
  const { measurements } = assessment;
  const { requirements } = assessment.policy;
  const acceptedExamples = countGap(
    measurements.acceptedExamples,
    requirements.minimumAcceptedExamples,
  );
  const trainExamples = countGap(
    measurements.trainExamples,
    requirements.minimumTrainExamples,
  );
  const validationExamples = countGap(
    measurements.validationExamples,
    requirements.minimumValidationExamples,
  );
  const missionScopes = countGap(
    measurements.missionScopes,
    requirements.minimumMissionScopes,
  );
  const answerQualityCases = countGap(
    measurements.answerQualityCases,
    requirements.minimumAnswerQualityCases,
  );
  const minimumAdditionalReviewedExamples = Math.max(
    acceptedExamples.remaining,
    trainExamples.remaining + validationExamples.remaining,
    missionScopes.remaining,
  );
  const acceptedRiskRemediationRequired =
    measurements.acceptedRiskRate > requirements.maximumAcceptedRiskRate;

  return {
    acceptedRisk: {
      acceptedRiskExamples: measurements.acceptedRiskExamples,
      currentRate: measurements.acceptedRiskRate,
      maximumRate: requirements.maximumAcceptedRiskRate,
      paddingAuthorized: false,
      remediationRequired: acceptedRiskRemediationRequired,
    },
    answerQualityCases,
    missionScopes,
    reviewedExamples: {
      acceptedExamples,
      minimumAdditionalReviewedExamples,
      splitAssignmentAuthorized: false,
      trainExamples,
      validationExamples,
    },
  };
}

function buildActions(gaps) {
  const actions = [];

  if (gaps.acceptedRisk.remediationRequired) {
    actions.push({
      acceptedRiskExamples:
        gaps.acceptedRisk.acceptedRiskExamples,
      currentRate: gaps.acceptedRisk.currentRate,
      id: 'remediate-accepted-risk-governance',
      maximumRate: gaps.acceptedRisk.maximumRate,
      paddingAuthorized: false,
    });
  }

  if (gaps.reviewedExamples.minimumAdditionalReviewedExamples > 0) {
    actions.push({
      countsTowardReviewedExampleMinimum: true,
      id: 'collect-distinct-reviewed-mission-examples',
      minimumAdditionalItems:
        gaps.reviewedExamples.minimumAdditionalReviewedExamples,
      observedTrainGap:
        gaps.reviewedExamples.trainExamples.remaining,
      observedValidationGap:
        gaps.reviewedExamples.validationExamples.remaining,
      requiredNewMissionScopes: gaps.missionScopes.remaining,
      splitMustBeRebuiltAndRemeasured: true,
    });
  }

  if (gaps.answerQualityCases.remaining > 0) {
    actions.push({
      countsTowardReviewedExampleMinimum: false,
      id: 'expand-answer-quality-baseline',
      minimumAdditionalItems: gaps.answerQualityCases.remaining,
    });
  }

  if (actions.length > 0) {
    actions.push({
      id: 'rebuild-readiness-and-reassess',
      requiresExactSourceBindings: true,
    });
  }

  return actions;
}

function buildPlanContent(assessment) {
  const gaps = buildGaps(assessment);
  const actions = buildActions(gaps);
  const dataCollectionRequired =
    gaps.reviewedExamples.minimumAdditionalReviewedExamples > 0 ||
    gaps.answerQualityCases.remaining > 0;
  const governanceRemediationRequired =
    gaps.acceptedRisk.remediationRequired;

  let decision = 'preserve-candidate-review-request-boundary';
  let status = 'no-collection-required';
  if (governanceRemediationRequired) {
    decision = 'remediate-accepted-risk-governance';
    status = 'accepted-risk-remediation-required';
  } else if (dataCollectionRequired) {
    decision = 'collect-more-reviewed-data';
    status = 'reviewed-data-collection-required';
  }

  return {
    actions,
    actualModelTrainingExecuted: false,
    actualUserDataCollected: false,
    bindings: buildBindings(assessment),
    candidateTrainingReviewAllowed: false,
    candidateTrainingReviewReady:
      assessment.candidateTrainingReviewReady,
    collectionExecutionAuthorized: false,
    dataCollectionRequired,
    decision,
    externalSubmissionAuthorized: false,
    gaps,
    governanceRemediationRequired,
    productionQualityThresholdClaim: false,
    productionReadyClaim: false,
    rawTrainingContentStored: false,
    reviewedExampleCollectionAuthorized: false,
    schemaVersion: FINE_TUNING_DATA_COLLECTION_PLAN_SCHEMA_VERSION,
    sourceAssessmentStatus: assessment.status,
    status,
    syntheticTrainingRecordsCreated: false,
    trainingAuthorized: false,
  };
}

export function buildFineTuningDataCollectionPlan({ assessment } = {}) {
  assertFineTuningDataSufficiencyAssessment(assessment);
  const content = buildPlanContent(assessment);
  const planHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-data-collection-plan-${planHash}`,
    planHash,
  };
}

export function assertFineTuningDataCollectionPlan(
  plan,
  { assessment } = {},
) {
  assertFineTuningDataSufficiencyAssessment(assessment);
  const { id, planHash, ...content } = plan || {};
  const expected = buildPlanContent(assessment);
  const expectedHash = hashRecord(expected);

  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    planHash !== expectedHash ||
    id !== `fine-tuning-data-collection-plan-${expectedHash}`
  ) {
    throw new Error('Fine-tuning data collection plan integrity failed.');
  }

  return plan;
}
