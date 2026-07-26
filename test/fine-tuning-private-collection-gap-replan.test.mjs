import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildDeterministicFineTuningBaselineContext,
} from '../scripts/local-training-permission-fixture.mjs';
import {
  buildFineTuningDataCollectionPlan,
} from '../src/core/fine-tuning-data-collection-plan.mjs';
import {
  buildFineTuningPrivateCollectionGapReplanShadow,
  assertFineTuningPrivateCollectionGapReplanShadow,
} from '../src/core/fine-tuning-private-collection-gap-replan.mjs';
import {
  buildFineTuningPrivateReviewedExampleCanonicalRecord,
  buildFineTuningPrivateReviewedExampleCanonicalizationReceipt,
} from '../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import {
  f1_19FinalDirectory,
  f1_20FinalDirectory,
  runPayload,
  runReplay,
  withReadyPrivateAnswerQualityPayload,
  writeReplayRequest,
} from './helpers/fine-tuning-private-answer-quality-case-payload-fixture.mjs';
import {
  prepareReviewedExampleCanonicalizationFixture,
  withReviewedExampleCanonicalizationFixture,
} from './helpers/fine-tuning-private-reviewed-example-canonicalization-fixture.mjs';

test('F1.25 replans the F1.24 projection in memory without replacing tracked state', () => {
  withCollectionGapInputs((inputs) => {
    const result = buildFineTuningPrivateCollectionGapReplanShadow(inputs);
    assertFineTuningPrivateCollectionGapReplanShadow(result, inputs);

    assert.deepEqual(result.projection.measurements, {
      acceptedExamples: 5,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 3,
      missionScopes: 5,
      trainExamples: 4,
      validationExamples: 1,
    });
    assert.equal(result.projection.failedCheckIds.length, 5);
    assert.deepEqual(result.projection.actionIds, [
      'collect-distinct-reviewed-mission-examples',
      'expand-answer-quality-baseline',
      'rebuild-readiness-and-reassess',
    ]);
    assert.equal(
      result.projection.gaps.reviewedExamples.minimumAdditionalReviewedExamples,
      15,
    );
    assert.equal(result.projection.gaps.reviewedExamples.trainExamples.remaining, 12);
    assert.equal(result.projection.gaps.reviewedExamples.validationExamples.remaining, 3);
    assert.equal(result.projection.gaps.missionScopes.remaining, 5);
    assert.equal(result.projection.gaps.answerQualityCases.remaining, 7);
    for (const boundary of [
      'acceptedRiskRemediationRequired',
      'actualDatasetRebuilt',
      'actualModelTrainingExecuted',
      'actualReadinessReplaced',
      'actualSufficiencyChanged',
      'actualUserDataCollected',
      'auditRecorded',
      'candidateTrainingReviewAllowed',
      'collectionActionCompletionRecorded',
      'collectionAuthorized',
      'collectionExecutionAuthorized',
      'deploymentAuthorized',
      'externalSubmissionAuthorized',
      'fineTuningExecutionAuthorized',
      'mutationPerformed',
      'productionReadyClaim',
      'providerAuthorized',
      'reviewedExampleCollectionAuthorized',
      'timelineRecorded',
      'trackedIntakeRequestAmended',
      'trackedPlanReplaced',
      'trainingAuthorized',
    ]) {
      assert.equal(result[boundary], false, boundary);
    }
    assert.equal(result.externalProviderCalls, 'none');
    assert.equal(JSON.stringify(result).includes(inputs.record.example.response), false);
    assert.equal(JSON.stringify(result).includes(inputs.item.example.response), false);
  });
});

test('F1.25 rejects a self-rehashed result, missing context, and tracked plan drift', () => {
  withCollectionGapInputs((inputs) => {
    const result = buildFineTuningPrivateCollectionGapReplanShadow(inputs);
    result.projection.gaps.answerQualityCases.remaining = 0;
    rehash(result);
    assert.throws(
      () => assertFineTuningPrivateCollectionGapReplanShadow(result, inputs),
      /integrity failed/,
    );
    assert.throws(
      () => buildFineTuningPrivateCollectionGapReplanShadow(),
      /trusted verification context/,
    );
    assert.throws(
      () => buildFineTuningPrivateCollectionGapReplanShadow({
        ...inputs,
        trackedCollectionPlan: {
          ...inputs.trackedCollectionPlan,
          status: 'no-collection-required',
        },
      }),
      /tracked F1\.2 plan drifted/,
    );
  });
});

function withCollectionGapInputs(callback) {
  withReadyPrivateAnswerQualityPayload((answer) => {
    assert.equal(runPayload(answer).status, 0);
    answer.replayRequestFilename = writeReplayRequest(
      answer.fixture,
      answer.answerQualityCase,
    );
    assert.equal(runReplay(answer).status, 0);
    withReviewedExampleCanonicalizationFixture((recordFixture) => {
      const prepared = prepareReviewedExampleCanonicalizationFixture(recordFixture);
      const record = buildFineTuningPrivateReviewedExampleCanonicalRecord({
        admission: recordFixture.admission,
        artifactPreparationResolution: prepared.artifactPreparationResolution,
        item: recordFixture.item,
        materializedAt: new Date().toISOString(),
        sourceBundle: prepared.sourceBundle,
        workspace: recordFixture.workspace,
      });
      const recordReceipt = buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
        admission: recordFixture.admission,
        artifactPreparationResolution: prepared.artifactPreparationResolution,
        item: recordFixture.item,
        record,
        sourceBundle: prepared.sourceBundle,
        workspace: recordFixture.workspace,
      });
      const baselineContext = buildDeterministicFineTuningBaselineContext();
      callback({
        answerQualityCase: answer.answerQualityCase,
        baselineContext,
        item: answer.fixture.item,
        payload: readJson(path.join(f1_19FinalDirectory(answer.fixture), 'payload.json')),
        record,
        recordReceipt,
        replayReceipt: readJson(
          path.join(f1_20FinalDirectory(answer.fixture), 'receipt.json'),
        ),
        replayRequest: readJson(
          path.join(f1_20FinalDirectory(answer.fixture), 'request.json'),
        ),
        trackedAssessment: baselineContext.sufficiencyAssessment,
        trackedCollectionPlan: buildFineTuningDataCollectionPlan({
          assessment: baselineContext.sufficiencyAssessment,
        }),
        workspace: answer.fixture.workspace,
      });
    });
  });
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function rehash(value) {
  const { id: _id, projectionHash: _hash, ...content } = value;
  const projectionHash = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
  value.projectionHash = projectionHash;
  value.id = `private-collection-gap-replan-shadow-${projectionHash}`;
}
