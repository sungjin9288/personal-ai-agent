import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertFineTuningDataCollectionPlan,
  buildFineTuningDataCollectionPlan,
} from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildSufficientFineTuningDataSufficiencyFixture } from './helpers/fine-tuning-data-sufficiency-fixture.mjs';

function buildCurrentAssessment() {
  return assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
}

test('current insufficiency becomes one non-overlapping reviewed-data collection target', () => {
  const assessment = buildCurrentAssessment();
  const plan = buildFineTuningDataCollectionPlan({ assessment });

  assert.doesNotThrow(() =>
    assertFineTuningDataCollectionPlan(plan, { assessment }));
  assert.equal(plan.status, 'reviewed-data-collection-required');
  assert.equal(plan.decision, 'collect-more-reviewed-data');
  assert.equal(plan.dataCollectionRequired, true);
  assert.deepEqual(plan.gaps.reviewedExamples, {
    acceptedExamples: { current: 4, remaining: 16, target: 20 },
    minimumAdditionalReviewedExamples: 16,
    splitAssignmentAuthorized: false,
    trainExamples: { current: 3, remaining: 13, target: 16 },
    validationExamples: { current: 1, remaining: 3, target: 4 },
  });
  assert.deepEqual(plan.gaps.missionScopes, {
    current: 4,
    remaining: 6,
    target: 10,
  });
  assert.deepEqual(plan.gaps.answerQualityCases, {
    current: 2,
    remaining: 8,
    target: 10,
  });
  assert.deepEqual(
    plan.actions.map((action) => action.id),
    [
      'collect-distinct-reviewed-mission-examples',
      'expand-answer-quality-baseline',
      'rebuild-readiness-and-reassess',
    ],
  );
  assert.equal(plan.actions[0].minimumAdditionalItems, 16);
  assert.equal(plan.actions[0].requiredNewMissionScopes, 6);
  assert.equal(plan.actions[0].observedTrainGap, 13);
  assert.equal(plan.actions[0].observedValidationGap, 3);
  assert.equal(plan.actions[1].countsTowardReviewedExampleMinimum, false);
  assert.equal(plan.actions[1].minimumAdditionalItems, 8);
});

test('collection plan never grants collection, review, training, or submission authority', () => {
  const assessment = buildCurrentAssessment();
  const plan = buildFineTuningDataCollectionPlan({ assessment });

  assert.equal(plan.actualModelTrainingExecuted, false);
  assert.equal(plan.actualUserDataCollected, false);
  assert.equal(plan.candidateTrainingReviewAllowed, false);
  assert.equal(plan.candidateTrainingReviewReady, false);
  assert.equal(plan.collectionExecutionAuthorized, false);
  assert.equal(plan.externalSubmissionAuthorized, false);
  assert.equal(plan.productionQualityThresholdClaim, false);
  assert.equal(plan.productionReadyClaim, false);
  assert.equal(plan.rawTrainingContentStored, false);
  assert.equal(plan.reviewedExampleCollectionAuthorized, false);
  assert.equal(plan.syntheticTrainingRecordsCreated, false);
  assert.equal(plan.trainingAuthorized, false);
});

test('sufficient assessment produces no collection work and preserves review approval boundary', () => {
  const assessment =
    buildSufficientFineTuningDataSufficiencyFixture();
  const plan = buildFineTuningDataCollectionPlan({ assessment });

  assert.equal(plan.status, 'no-collection-required');
  assert.equal(
    plan.decision,
    'preserve-candidate-review-request-boundary',
  );
  assert.equal(plan.dataCollectionRequired, false);
  assert.equal(plan.governanceRemediationRequired, false);
  assert.deepEqual(plan.actions, []);
  assert.equal(
    plan.gaps.reviewedExamples.minimumAdditionalReviewedExamples,
    0,
  );
  assert.equal(plan.gaps.answerQualityCases.remaining, 0);
  assert.equal(plan.candidateTrainingReviewReady, true);
  assert.equal(plan.candidateTrainingReviewAllowed, false);
  assert.equal(plan.trainingAuthorized, false);
});

test('accepted-risk excess requires governance remediation instead of data padding', () => {
  const assessment = buildSufficientFineTuningDataSufficiencyFixture({
    acceptedRiskCount: 3,
  });
  const plan = buildFineTuningDataCollectionPlan({ assessment });

  assert.equal(plan.status, 'accepted-risk-remediation-required');
  assert.equal(plan.decision, 'remediate-accepted-risk-governance');
  assert.equal(plan.dataCollectionRequired, false);
  assert.equal(plan.governanceRemediationRequired, true);
  assert.equal(
    plan.gaps.reviewedExamples.minimumAdditionalReviewedExamples,
    0,
  );
  assert.deepEqual(plan.gaps.acceptedRisk, {
    acceptedRiskExamples: 3,
    currentRate: 0.15,
    maximumRate: 0.1,
    paddingAuthorized: false,
    remediationRequired: true,
  });
  assert.deepEqual(
    plan.actions.map((action) => action.id),
    [
      'remediate-accepted-risk-governance',
      'rebuild-readiness-and-reassess',
    ],
  );
});

test('accepted-risk remediation stays first when data is also insufficient', () => {
  const assessment = buildSufficientFineTuningDataSufficiencyFixture({
    acceptedRiskCount: 1,
    answerQualityCaseCount: 2,
    recordCount: 4,
  });
  const plan = buildFineTuningDataCollectionPlan({ assessment });

  assert.equal(plan.status, 'accepted-risk-remediation-required');
  assert.equal(plan.decision, 'remediate-accepted-risk-governance');
  assert.equal(plan.dataCollectionRequired, true);
  assert.equal(plan.governanceRemediationRequired, true);
  assert.equal(
    plan.actions[0].id,
    'remediate-accepted-risk-governance',
  );
  assert.equal(plan.actions[0].paddingAuthorized, false);
  assert.equal(
    plan.actions[1].id,
    'collect-distinct-reviewed-mission-examples',
  );
});

test('plan and source assessment tampering fail integrity checks', () => {
  const assessment = buildCurrentAssessment();
  const plan = buildFineTuningDataCollectionPlan({ assessment });
  const changedPlan = structuredClone(plan);
  changedPlan.actions[0].minimumAdditionalItems = 15;
  assert.throws(
    () => assertFineTuningDataCollectionPlan(changedPlan, { assessment }),
    /collection plan integrity/,
  );

  const changedAssessment = structuredClone(assessment);
  changedAssessment.measurements.acceptedExamples = 5;
  assert.throws(
    () => assertFineTuningDataCollectionPlan(plan, {
      assessment: changedAssessment,
    }),
    /data sufficiency (assessment integrity|measurements are invalid)/,
  );
});
