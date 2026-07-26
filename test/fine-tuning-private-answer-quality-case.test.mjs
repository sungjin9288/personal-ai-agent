import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
  assertFineTuningPrivateAnswerQualityCase,
  assertFineTuningPrivateAnswerQualityCaseRecord,
  buildFineTuningPrivateAnswerQualityCase,
} from '../src/core/fine-tuning-private-answer-quality-case.mjs';
import { evaluateAnswerQualityCase } from '../src/core/answer-quality-evaluation.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import {
  buildAnswerQualityEnrichmentInput,
  prepareAnswerQualityEnrichmentCandidateFixture,
} from './helpers/fine-tuning-private-answer-quality-enrichment-candidate-fixture.mjs';
import { withSyntheticLifecycleFixture } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

function withCase(callback) {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const resolution = buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
      admission: fixture.admission, candidate: prepared.candidate, decision: prepared.decision,
      item: fixture.item, resolvedAt: prepared.decision.decidedAt, workspace: fixture.workspace,
    });
    const input = buildAnswerQualityEnrichmentInput(fixture, prepared.lineage.artifactPreparationResolution);
    const materializedAt = new Date(Date.parse(resolution.resolvedAt) + 1_000).toISOString();
    callback({ fixture, input, materializedAt, prepared, resolution });
  }, { lane: 'answer-quality-cases' });
}

function build(values) {
  return buildFineTuningPrivateAnswerQualityCase({
    admission: values.fixture.admission, candidate: values.prepared.candidate,
    candidateReviewResolution: values.resolution, enrichmentInput: values.input,
    item: values.fixture.item, materializedAt: values.materializedAt, workspace: values.fixture.workspace,
  });
}

test('F1.18 logically materializes a content-free passed Q1 case', () => {
  withCase((values) => {
    const record = build(values);
    assert.equal(record.status, 'private-answer-quality-case-logically-materialized-q1-passed');
    assert.equal(record.q1ReviewerGateSatisfied, true);
    assert.equal(record.q1ContractSatisfied, true);
    assert.equal(record.answerQualityCaseCreated, true);
    assert.equal(record.answerQualityCaseEvaluationExecuted, true);
    assert.equal(record.evaluation.status, 'passed');
    assert.equal(record.materializationMode, 'content-free-logical-case');
    assert.equal(record.replayRequiresLivePrivateInput, true);
    assert.equal(record.trainingAuthorized, false);
    assert.equal(record.externalProviderCalls, 'none');
    assert.equal(record.productionReadyClaim, false);
    assert.equal(
      record.bindings.answerQualityCaseDefinitionHash,
      record.caseSummary.answerQualityCaseDefinitionHash,
    );
    assert.equal(
      record.bindings.answerQualityCaseEvaluationHash,
      record.caseSummary.answerQualityCaseEvaluationHash,
    );
    assert.equal('definitionHash' in record.bindings, false);
    assert.equal('evaluationHash' in record.bindings, false);
    const evaluation = evaluateAnswerQualityCase({
      answer: {
        citedSourceKeys: values.input.answer.citedSourceKeys,
        text: values.fixture.item.example.response,
      },
      expectedSourceKeys: values.input.expectedSourceKeys,
      forbiddenAnswerTerms: values.input.forbiddenAnswerTerms,
      forbiddenSourceKeys: values.input.forbiddenSourceKeys,
      id: `private-answer-quality-case-${values.fixture.item.itemHash}`,
      requiredAnswerTerms: values.input.requiredAnswerTerms,
      retrievedItems: buildRetrievalContext(values.input.retrievalInput),
      reviewerVerdict: 'pass',
    }, { thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS });
    const expectedEvaluationHash = createHash('sha256').update(JSON.stringify({
      evaluation,
      thresholds: FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_THRESHOLDS,
    })).digest('hex');
    assert.equal(
      record.caseSummary.answerQualityCaseEvaluationHash,
      expectedEvaluationHash,
    );
    for (const forbidden of [
      values.fixture.item.example.instruction, values.fixture.item.example.response,
      values.input.retrievalInput.memoryEntries[0].content,
    ]) assert.equal(JSON.stringify(record).includes(forbidden), false);
    assert.doesNotThrow(() => assertFineTuningPrivateAnswerQualityCase(record, {
      admission: values.fixture.admission, candidate: values.prepared.candidate,
      candidateReviewResolution: values.resolution, enrichmentInput: values.input,
      item: values.fixture.item, workspace: values.fixture.workspace,
    }));
  });
});

test('F1.18 rejects a non-approved reviewer decision and any evaluation drift', () => {
  withCase((values) => {
    const reject = structuredClone(values.resolution);
    reject.decision = 'reject';
    assert.throws(() => buildFineTuningPrivateAnswerQualityCase({
      admission: values.fixture.admission, candidate: values.prepared.candidate,
      candidateReviewResolution: reject, enrichmentInput: values.input,
      item: values.fixture.item, materializedAt: values.materializedAt, workspace: values.fixture.workspace,
    }));
    const record = build(values);
    for (const mutate of [
      (value) => { value.q1ContractSatisfied = false; },
      (value) => { value.evaluation.metrics.retrievalHitRate = 0; },
      (value) => { value.caseSummary.answerHash = 'f'.repeat(64); },
      (value) => { value.payloadStored = true; },
    ]) {
      const changed = structuredClone(record);
      mutate(changed);
      assert.throws(() => assertFineTuningPrivateAnswerQualityCaseRecord(changed));
    }
  });
});

test('F1.18 requires the exact current private answer, criteria, and retrieval input', () => {
  withCase((values) => {
    const record = build(values);
    for (const mutate of [
      (input) => { input.requiredAnswerTerms = ['missing']; },
      (input) => { input.answer.citedSourceKeys = []; },
      (input) => { input.retrievalInput.memoryEntries = []; },
    ]) {
      const changed = structuredClone(values.input);
      mutate(changed);
      assert.throws(() => assertFineTuningPrivateAnswerQualityCase(record, {
        admission: values.fixture.admission, candidate: values.prepared.candidate,
        candidateReviewResolution: values.resolution, enrichmentInput: changed,
        item: values.fixture.item, workspace: values.fixture.workspace,
      }));
    }
  });
});

test('F1.18 record-only validation rejects semantic rehashes', () => {
  withCase((values) => {
    const record = build(values);
    const changed = structuredClone(record);
    changed.evaluation.metrics.retrievalHitRate = 0;
    changed.answerQualityCaseHash = createHash('sha256').update(JSON.stringify(withoutHash(changed))).digest('hex');
    changed.id = `fine-tuning-private-answer-quality-case-${changed.answerQualityCaseHash}`;
    assert.throws(() => assertFineTuningPrivateAnswerQualityCaseRecord(changed));
  });
});

function withoutHash(value) {
  const { answerQualityCaseHash, id, ...content } = value;
  return content;
}
