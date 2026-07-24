import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildDeterministicFineTuningBaselineContext,
} from '../scripts/local-training-permission-fixture.mjs';
import {
  evaluateAnswerQualitySuite,
} from '../src/core/answer-quality-evaluation.mjs';
import {
  assessFineTuningDataSufficiency,
} from '../src/core/fine-tuning-data-sufficiency.mjs';
import {
  buildFineTuningReadinessPackage,
} from '../src/core/fine-tuning-readiness.mjs';
import {
  buildFineTuningPrivateReviewedExampleCanonicalRecord,
  buildFineTuningPrivateReviewedExampleCanonicalizationReceipt,
} from '../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import {
  assertFineTuningPrivateCombinedReadinessImpactShadow,
  buildFineTuningPrivateCombinedReadinessImpactShadow,
} from '../src/core/fine-tuning-private-combined-readiness-impact.mjs';
import {
  buildTrainingDatasetManifest,
} from '../src/core/training-dataset-quality.mjs';
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

test('F1.24 projects one reviewed example and one frozen Q1 case in memory only', () => {
  withCombinedInputs((inputs) => {
    const result = buildFineTuningPrivateCombinedReadinessImpactShadow(inputs);
    assertFineTuningPrivateCombinedReadinessImpactShadow(result, inputs);
    assert.deepEqual(result.baseline.measurements, {
      acceptedExamples: 4,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 2,
      missionScopes: 4,
      trainExamples: 3,
      validationExamples: 1,
    });
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
    assert.equal(result.projection.decision, 'collect-more-reviewed-data');
    assert.equal(result.projection.status, 'insufficient-data');
    for (const boundary of [
      'actualDatasetRebuilt',
      'actualDeploymentPerformed',
      'actualModelEvaluated',
      'actualModelTrainingExecuted',
      'actualReadinessReplaced',
      'actualSufficiencyChanged',
      'actualUserDataCollected',
      'auditRecorded',
      'candidateTrainingReviewAllowed',
      'collectionActionCompletionRecorded',
      'deploymentAuthorized',
      'externalSubmissionAuthorized',
      'fineTuningExecutionAuthorized',
      'mutationPerformed',
      'productionReadyClaim',
      'providerAuthorized',
      'timelineRecorded',
      'trainingAuthorized',
    ]) {
      assert.equal(result[boundary], false, boundary);
    }
    assert.equal(result.externalProviderCalls, 'none');
    assert.equal(
      JSON.stringify(result).includes(inputs.record.example.response),
      false,
    );
    assert.equal(
      JSON.stringify(result).includes(inputs.item.example.response),
      false,
    );
  });
});

test('F1.24 rejects self-rehashed output and missing trusted context', () => {
  withCombinedInputs((inputs) => {
    const result = buildFineTuningPrivateCombinedReadinessImpactShadow(inputs);
    result.projection.measurements.acceptedExamples = 99;
    rehash(result);
    assert.throws(
      () => assertFineTuningPrivateCombinedReadinessImpactShadow(result, inputs),
      /integrity failed/,
    );
    assert.throws(
      () => assertFineTuningPrivateCombinedReadinessImpactShadow(result),
      /trusted verification context/,
    );
  });
});

test('F1.24 rejects duplicate reviewed records, duplicate cases, and threshold drift', () => {
  withCombinedInputs((inputs) => {
    const duplicatedRecordContext = rebuildContext(inputs.baselineContext, {
      records: [...inputs.baselineContext.records, inputs.record],
    });
    assert.throws(
      () => buildFineTuningPrivateCombinedReadinessImpactShadow({
        ...inputs,
        baselineContext: duplicatedRecordContext,
        trackedAssessment: duplicatedRecordContext.sufficiencyAssessment,
      }),
      /accepted record growth without displacement/,
    );
    const duplicatedCaseContext = rebuildContext(inputs.baselineContext, {
      answerQualityCases: [
        ...inputs.baselineContext.answerQualityCases,
        { ...inputs.payload.payload.caseDefinition, id: 'same-definition-different-id' },
      ],
    });
    assert.throws(
      () => buildFineTuningPrivateCombinedReadinessImpactShadow({
        ...inputs,
        baselineContext: duplicatedCaseContext,
        trackedAssessment: duplicatedCaseContext.sufficiencyAssessment,
      }),
      /duplicate case definition/,
    );
    const reorderedCaseContext = rebuildContext(inputs.baselineContext, {
      answerQualityCases: [
        ...inputs.baselineContext.answerQualityCases,
        { ...reorder(inputs.payload.payload.caseDefinition), id: 'reordered-definition' },
      ],
    });
    assert.throws(
      () => buildFineTuningPrivateCombinedReadinessImpactShadow({
        ...inputs,
        baselineContext: reorderedCaseContext,
        trackedAssessment: reorderedCaseContext.sufficiencyAssessment,
      }),
      /duplicate case definition/,
    );
    const thresholdDrift = rebuildContext(inputs.baselineContext, {
      thresholds: { ...inputs.baselineContext.baselineEvaluation.thresholds, minimumCasePassRate: 0.9 },
    });
    assert.throws(
      () => buildFineTuningPrivateCombinedReadinessImpactShadow({
        ...inputs,
        baselineContext: thresholdDrift,
        trackedAssessment: thresholdDrift.sufficiencyAssessment,
      }),
      /baseline thresholds drifted/,
    );
  });
});

function withCombinedInputs(callback) {
  withReadyPrivateAnswerQualityPayload((answer) => {
    assert.equal(runPayload(answer).status, 0);
    answer.replayRequestFilename = writeReplayRequest(answer.fixture, answer.answerQualityCase);
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
      const final = f1_20FinalDirectory(answer.fixture);
      const baselineContext = buildDeterministicFineTuningBaselineContext();
      callback({
        answerQualityCase: answer.answerQualityCase,
        baselineContext,
        item: answer.fixture.item,
        payload: readJson(path.join(f1_19FinalDirectory(answer.fixture), 'payload.json')),
        record,
        recordReceipt,
        replayReceipt: readJson(path.join(final, 'receipt.json')),
        replayRequest: readJson(path.join(final, 'request.json')),
        trackedAssessment: baselineContext.sufficiencyAssessment,
        workspace: answer.fixture.workspace,
      });
    });
  });
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function rebuildContext(baselineContext, {
  answerQualityCases = baselineContext.answerQualityCases,
  records = baselineContext.records,
  thresholds = baselineContext.baselineEvaluation.thresholds,
} = {}) {
  const datasetManifest = buildTrainingDatasetManifest({
    records,
    seed: baselineContext.datasetManifest.seed,
  });
  const baselineEvaluation = evaluateAnswerQualitySuite({ cases: answerQualityCases, thresholds });
  const readinessPackage = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest,
    records,
  });
  return {
    ...baselineContext,
    answerQualityCases,
    baselineEvaluation,
    datasetManifest,
    readinessPackage,
    records,
    sufficiencyAssessment: assessFineTuningDataSufficiency({ readinessPackage }),
  };
}

function reorder(value) {
  if (Array.isArray(value)) return [...value].reverse().map(reorder);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).reverse().map((key) => [key, reorder(value[key])]));
}

function rehash(value) {
  const { id: _id, projectionHash: _hash, ...content } = value;
  const projectionHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  value.projectionHash = projectionHash;
  value.id = `private-combined-readiness-impact-shadow-${projectionHash}`;
}
