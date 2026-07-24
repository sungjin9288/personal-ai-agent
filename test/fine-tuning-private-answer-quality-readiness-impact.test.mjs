import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  assertFineTuningPrivateAnswerQualityReadinessImpactShadow,
  buildFineTuningPrivateAnswerQualityReadinessImpactShadow,
} from '../src/core/fine-tuning-private-answer-quality-readiness-impact.mjs';
import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import { buildDeterministicFineTuningBaselineContext } from '../scripts/local-training-permission-fixture.mjs';
import {
  f1_19FinalDirectory,
  f1_20FinalDirectory,
  runPayload,
  runReplay,
  withReadyPrivateAnswerQualityPayload,
  writeReplayRequest,
} from './helpers/fine-tuning-private-answer-quality-case-payload-fixture.mjs';

test('F1.23 projects one final F1.20 case in memory without changing dataset or authority', () => {
  withReplay((values) => {
    const inputs = projectionInputs(values);
    const result = buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs);

    assertFineTuningPrivateAnswerQualityReadinessImpactShadow(result, inputs);
    assert.equal(result.baseline.measurements.answerQualityCases, 2);
    assert.equal(result.projection.measurements.answerQualityCases, 3);
    assert.equal(result.projection.delta.answerQualityCases, 1);
    for (const key of [
      'acceptedExamples',
      'acceptedRiskExamples',
      'acceptedRiskRate',
      'missionScopes',
      'trainExamples',
      'validationExamples',
    ]) assert.equal(result.projection.delta[key], 0);
    assert.equal(result.projection.failedCheckIds.length, 5);
    for (const key of ['datasetHash', 'datasetManifestHash', 'trainSha256', 'validationSha256']) {
      assert.equal(result.baseline.bindings[key], result.projection.bindings[key]);
    }
    assert.deepEqual(result.baseline.exportDigests, result.projection.exportDigests);
    assert.equal(result.actualModelEvaluated, false);
    assert.equal(result.actualModelTrainingExecuted, false);
    assert.equal(result.actualUserDataCollected, false);
    assert.equal(result.auditRecorded, false);
    assert.equal(result.timelineRecorded, false);
    assert.equal(result.mutationPerformed, false);
    assert.equal(result.externalProviderCalls, 'none');
    assert.equal(JSON.stringify(result).includes(values.fixture.item.example.instruction), false);
    assert.equal(JSON.stringify(result).includes(values.fixture.item.example.response), false);
  });
});

test('F1.23 rejects duplicate private case ids and semantic definitions before count inflation', () => {
  withReplay((values) => {
    const inputs = projectionInputs(values);
    const duplicateIdContext = contextWithExtraCase(
      inputs.baselineContext,
      { ...inputs.payload.payload.caseDefinition, id: inputs.payload.payload.caseDefinition.id },
    );
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityReadinessImpactShadow({ ...inputs, baselineContext: duplicateIdContext, trackedAssessment: duplicateIdContext.sufficiencyAssessment }),
      /duplicate case id/,
    );

    const duplicateDefinitionContext = contextWithExtraCase(
      inputs.baselineContext,
      { ...inputs.payload.payload.caseDefinition, id: 'tracked-equivalent-definition' },
    );
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityReadinessImpactShadow({ ...inputs, baselineContext: duplicateDefinitionContext, trackedAssessment: duplicateDefinitionContext.sufficiencyAssessment }),
      /duplicate case definition/,
    );

    const reorderedDefinition = reorderDefinition(inputs.payload.payload.caseDefinition);
    reorderedDefinition.id = 'tracked-reordered-equivalent-definition';
    const reorderedDefinitionContext = contextWithExtraCase(
      inputs.baselineContext,
      reorderedDefinition,
    );
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityReadinessImpactShadow({ ...inputs, baselineContext: reorderedDefinitionContext, trackedAssessment: reorderedDefinitionContext.sufficiencyAssessment }),
      /duplicate case definition/,
    );
  });
});

test('F1.23 rejects tracked baseline drift and output tampering', () => {
  withReplay((values) => {
    const inputs = projectionInputs(values);
    assert.throws(
      () =>
        buildFineTuningPrivateAnswerQualityReadinessImpactShadow({
          ...inputs,
          trackedAssessment: { ...inputs.baselineContext.sufficiencyAssessment, status: 'forged' },
        }),
      /tracked sufficiency baseline drifted/,
    );
    const result = buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs);
    result.trainingAuthorized = true;
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(result, inputs),
      /integrity failed/,
    );
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(result),
      /trusted verification context/,
    );

    const forgedMeasurement = structuredClone(
      buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs),
    );
    forgedMeasurement.baseline.measurements.answerQualityCases = 1;
    rehash(forgedMeasurement);
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(forgedMeasurement, inputs),
      /integrity failed/,
    );

    const forgedStatus = structuredClone(
      buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs),
    );
    forgedStatus.projection.status = 'sufficient-for-candidate-review-request';
    rehash(forgedStatus);
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(forgedStatus, inputs),
      /integrity failed/,
    );

    const forgedBindings = structuredClone(
      buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs),
    );
    forgedBindings.baseline.bindings.datasetHash = 'f'.repeat(64);
    forgedBindings.projection.bindings.datasetHash = 'f'.repeat(64);
    recommit(forgedBindings);
    rehash(forgedBindings);
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(forgedBindings, inputs),
      /integrity failed/,
    );

    const forgedAssessment = structuredClone(
      buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs),
    );
    forgedAssessment.baseline.assessmentSha256 = 'e'.repeat(64);
    recommit(forgedAssessment);
    rehash(forgedAssessment);
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(forgedAssessment, inputs),
      /integrity failed/,
    );

    const paddedExportDigests = structuredClone(
      buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs),
    );
    paddedExportDigests.baseline.exportDigests.padding = 'forged';
    rehash(paddedExportDigests);
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(paddedExportDigests, inputs),
      /integrity failed/,
    );

    const forgedProjection = structuredClone(
      buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs),
    );
    forgedProjection.projection.assessmentSha256 = 'a'.repeat(64);
    forgedProjection.projection.answerQualityEvaluationSha256 = 'b'.repeat(64);
    forgedProjection.projection.readinessSha256 = 'c'.repeat(64);
    forgedProjection.projection.bindings.evaluationManifestHash = 'd'.repeat(64);
    forgedProjection.projection.bindings.readinessHash = 'e'.repeat(64);
    recommit(forgedProjection);
    rehash(forgedProjection);
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(forgedProjection, inputs),
      /integrity failed/,
    );

    const forgedReceiptDigest = structuredClone(
      buildFineTuningPrivateAnswerQualityReadinessImpactShadow(inputs),
    );
    forgedReceiptDigest.receiptDigests.receiptSha256 = 'f'.repeat(64);
    recommit(forgedReceiptDigest);
    rehash(forgedReceiptDigest);
    assert.throws(
      () => assertFineTuningPrivateAnswerQualityReadinessImpactShadow(forgedReceiptDigest, inputs),
      /integrity failed/,
    );

    const driftedContext = contextWithThreshold(
      inputs.baselineContext,
      { ...inputs.baselineContext.baselineEvaluation.thresholds, minimumCasePassRate: 0.9 },
    );
    assert.throws(
      () => buildFineTuningPrivateAnswerQualityReadinessImpactShadow({ ...inputs, baselineContext: driftedContext }),
      /baseline thresholds drifted/,
    );
    assert.throws(
      () =>
        buildFineTuningPrivateAnswerQualityReadinessImpactShadow({
          ...inputs,
          baselineContext: driftedContext,
          trackedAssessment: driftedContext.sufficiencyAssessment,
        }),
      /baseline thresholds drifted/,
    );
  });
});

function withReplay(callback) {
  withReadyPrivateAnswerQualityPayload((values) => {
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    const replay = runReplay(values);
    assert.equal(replay.status, 0, replay.stderr);
    callback(values);
  });
}

function projectionInputs(values) {
  const baselineContext = buildDeterministicFineTuningBaselineContext();
  const payload = readJson(path.join(f1_19FinalDirectory(values.fixture), 'payload.json'));
  const receipt = readJson(path.join(f1_20FinalDirectory(values.fixture), 'receipt.json'));
  const request = readJson(path.join(f1_20FinalDirectory(values.fixture), 'request.json'));
  return {
    answerQualityCase: values.answerQualityCase,
    baselineContext,
    item: values.fixture.item,
    payload,
    receipt,
    request,
    trackedAssessment: baselineContext.sufficiencyAssessment,
    workspace: values.fixture.workspace,
  };
}

function reorderDefinition(value) {
  if (Array.isArray(value)) return [...value].reverse().map(reorderDefinition);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .reverse()
      .map((key) => [key, reorderDefinition(value[key])]),
  );
}

function rehash(value) {
  const { id: _id, projectionHash: _hash, ...content } = value;
  value.projectionHash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  value.id = `private-answer-quality-readiness-impact-shadow-${value.projectionHash}`;
}

function recommit(value) {
  for (const summary of [value.baseline, value.projection]) {
    const {
      delta: _delta,
      disposition: _disposition,
      summaryCommitment: _commitment,
      ...content
    } = summary;
    summary.summaryCommitment = createHash('sha256')
      .update(JSON.stringify(content))
      .digest('hex');
  }
  value.provenanceCommitment = createHash('sha256')
    .update(JSON.stringify({
      baselineSummaryCommitment: value.baseline.summaryCommitment,
      projectionSummaryCommitment: value.projection.summaryCommitment,
      trackedAssessmentSha256: value.baseline.assessmentSha256,
    }))
    .digest('hex');
}

function contextWithExtraCase(baselineContext, extraCase) {
  const answerQualityCases = [...baselineContext.answerQualityCases, extraCase];
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: answerQualityCases,
    thresholds: baselineContext.baselineEvaluation.thresholds,
  });
  const readinessPackage = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest: baselineContext.datasetManifest,
    records: baselineContext.records,
  });
  return {
    ...baselineContext,
    answerQualityCases,
    baselineEvaluation,
    readinessPackage,
    sufficiencyAssessment: assessFineTuningDataSufficiency({ readinessPackage }),
  };
}

function contextWithThreshold(baselineContext, thresholds) {
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: baselineContext.answerQualityCases,
    thresholds,
  });
  const readinessPackage = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest: baselineContext.datasetManifest,
    records: baselineContext.records,
  });
  return {
    ...baselineContext,
    baselineEvaluation,
    readinessPackage,
    sufficiencyAssessment: assessFineTuningDataSufficiency({ readinessPackage }),
  };
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
