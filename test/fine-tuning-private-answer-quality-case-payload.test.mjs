import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import {
  assertFineTuningPrivateAnswerQualityCasePayload,
  assertFineTuningPrivateAnswerQualityCasePayloadDecision,
  assertFineTuningPrivateAnswerQualityCasePayloadRecord,
  buildFineTuningPrivateAnswerQualityCasePayload,
  buildFineTuningPrivateAnswerQualityCasePayloadDecision,
  FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_DECISION_SCHEMA_VERSION,
} from '../src/core/fine-tuning-private-answer-quality-case-payload.mjs';
import { buildFineTuningPrivateAnswerQualityCase } from '../src/core/fine-tuning-private-answer-quality-case.mjs';
import { buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import {
  buildAnswerQualityEnrichmentInput,
  prepareAnswerQualityEnrichmentCandidateFixture,
} from './helpers/fine-tuning-private-answer-quality-enrichment-candidate-fixture.mjs';
import { withSyntheticLifecycleFixture } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

function withPayload(callback, { decision: decisionKind = 'approve' } = {}) {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
    const resolution =
      buildFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolution({
        admission: fixture.admission,
        candidate: prepared.candidate,
        decision: prepared.decision,
        item: fixture.item,
        resolvedAt: prepared.decision.decidedAt,
        workspace: fixture.workspace,
      });
    const enrichmentInput = buildAnswerQualityEnrichmentInput(
      fixture,
      prepared.lineage.artifactPreparationResolution,
    );
    const answerQualityCase = buildFineTuningPrivateAnswerQualityCase({
      admission: fixture.admission,
      candidate: prepared.candidate,
      candidateReviewResolution: resolution,
      enrichmentInput,
      item: fixture.item,
      materializedAt: after(resolution.resolvedAt),
      workspace: fixture.workspace,
    });
    const decisionInput = {
      answerQualityCase: reference(answerQualityCase, 'answerQualityCaseHash'),
      confirmationToken:
        `materialize-private-answer-quality-case-payload:${fixture.item.itemHash}:` +
        answerQualityCase.answerQualityCaseHash,
      decidedAt: after(answerQualityCase.materializedAt),
      decidedByRole: 'retention-deletion-owner-role',
      decision: decisionKind,
      evidenceSha256: digest(`payload-${decisionKind}`),
      item: reference(fixture.item, 'itemHash'),
      payloadPurpose: 'local-answer-quality-evaluation-replay-only',
      schemaVersion:
        FINE_TUNING_PRIVATE_ANSWER_QUALITY_CASE_PAYLOAD_DECISION_SCHEMA_VERSION,
      target: 'private-answer-quality-case-payload',
      workspace: reference(fixture.workspace, 'workspaceHash'),
    };
    const decision = buildFineTuningPrivateAnswerQualityCasePayloadDecision({
      answerQualityCase,
      decision: decisionInput,
      item: fixture.item,
      workspace: fixture.workspace,
    });
    callback({
      answerQualityCase,
      decision,
      decisionInput,
      enrichmentInput,
      fixture,
      prepared,
      resolution,
    });
  }, { lane: 'answer-quality-cases' });
}

function buildPayload(values) {
  return buildFineTuningPrivateAnswerQualityCasePayload({
    admission: values.fixture.admission,
    answerQualityCase: values.answerQualityCase,
    candidate: values.prepared.candidate,
    candidateReviewResolution: values.resolution,
    decision: values.decision,
    enrichmentInput: values.enrichmentInput,
    item: values.fixture.item,
    storedAt: after(values.decision.decisionRecord.decidedAt),
    workspace: values.fixture.workspace,
  });
}

test('F1.19 stores only the minimal synthetic Q1 replay payload', () => {
  withPayload((values) => {
    const record = buildPayload(values);

    assert.equal(record.status, 'private-answer-quality-case-payload-stored-for-local-replay');
    assert.equal(record.contentCopied, true);
    assert.equal(record.payloadStored, true);
    assert.equal(record.replayRequiresLivePrivateInput, false);
    assert.equal(record.q1ContractSatisfied, true);
    assert.equal(record.trainingAuthorized, false);
    assert.equal(record.externalProviderCalls, 'none');
    assert.equal(record.productionReadyClaim, false);
    assert.deepEqual(Object.keys(record.payload), ['objective', 'caseDefinition']);
    assert.equal(record.payload.objective, values.fixture.item.example.instruction);
    assert.equal(
      record.payload.caseDefinition.answer.text,
      values.fixture.item.example.response,
    );
    assert.equal(
      record.bindings.answerQualityCaseDefinitionHash,
      values.answerQualityCase.caseSummary.answerQualityCaseDefinitionHash,
    );
    assert.equal(
      record.bindings.answerQualityCaseEvaluationHash,
      values.answerQualityCase.caseSummary.answerQualityCaseEvaluationHash,
    );
    assert.equal(
      JSON.stringify(record).includes(values.decisionInput.confirmationToken),
      false,
    );
    assert.doesNotThrow(() =>
      assertFineTuningPrivateAnswerQualityCasePayload(record, {
        admission: values.fixture.admission,
        answerQualityCase: values.answerQualityCase,
        candidate: values.prepared.candidate,
        candidateReviewResolution: values.resolution,
        decision: values.decision,
        enrichmentInput: values.enrichmentInput,
        item: values.fixture.item,
        workspace: values.fixture.workspace,
      }),
    );
  });
});

test('F1.19 owner decision is separate from the F1.17 reviewer approval', () => {
  withPayload((values) => {
    assert.equal(values.decision.decisionRecord.decidedByRole, 'retention-deletion-owner-role');
    assert.equal(values.decision.decisionRecord.decision, 'approve');
    assert.equal(values.decision.decisionRecord.payloadPurpose, 'local-answer-quality-evaluation-replay-only');
    assert.doesNotThrow(() =>
      assertFineTuningPrivateAnswerQualityCasePayloadDecision(values.decision, {
        answerQualityCase: values.answerQualityCase,
        decision: values.decisionInput,
        item: values.fixture.item,
        workspace: values.fixture.workspace,
      }),
    );
  });

  withPayload((values) => {
    const wrongRole = structuredClone(values.decisionInput);
    wrongRole.decidedByRole = 'quality-reviewer';
    assert.throws(() =>
      buildFineTuningPrivateAnswerQualityCasePayloadDecision({
        answerQualityCase: values.answerQualityCase,
        decision: wrongRole,
        item: values.fixture.item,
        workspace: values.fixture.workspace,
      }),
    );
  });
});

test('F1.19 reject decisions cannot build a payload', () => {
  withPayload((values) => {
    assert.equal(values.decision.decisionRecord.decision, 'reject');
    assert.throws(() => buildPayload(values), /approved owner decision/);
  }, { decision: 'reject' });
});

test('F1.19 rejects payload drift from the exact F1.18 definition', () => {
  withPayload((values) => {
    for (const mutate of [
      (input) => {
        input.answer.citedSourceKeys = [];
      },
      (input) => {
        input.requiredAnswerTerms = ['different'];
      },
      (input) => {
        input.retrievalInput.memoryEntries[0].content = 'Different content.';
      },
    ]) {
      const changed = structuredClone(values.enrichmentInput);
      mutate(changed);
      assert.throws(() =>
        buildFineTuningPrivateAnswerQualityCasePayload({
          admission: values.fixture.admission,
          answerQualityCase: values.answerQualityCase,
          candidate: values.prepared.candidate,
          candidateReviewResolution: values.resolution,
          decision: values.decision,
          enrichmentInput: changed,
          item: values.fixture.item,
          storedAt: after(values.decision.decisionRecord.decidedAt),
          workspace: values.fixture.workspace,
        }),
      );
    }
  });
});

test('F1.19 record-only validation rejects nested shape rehashes', () => {
  withPayload((values) => {
    const record = buildPayload(values);
    const changed = structuredClone(record);
    changed.payload.caseDefinition.answer.privateNote = 'must not persist';
    changed.bindings.answerQualityCaseDefinitionHash = digest(
      JSON.stringify(changed.payload.caseDefinition),
    );
    changed.bindings.payloadContentHash = digest(
      JSON.stringify(changed.payload),
    );
    const { answerQualityCasePayloadHash, id, ...content } = changed;
    changed.answerQualityCasePayloadHash = digest(JSON.stringify(content));
    changed.id =
      `fine-tuning-private-answer-quality-case-payload-${changed.answerQualityCasePayloadHash}`;
    assert.throws(() =>
      assertFineTuningPrivateAnswerQualityCasePayloadRecord(changed),
    );
    assert.ok(answerQualityCasePayloadHash);
    assert.ok(id);
  });
});

function reference(value, field) {
  return { id: value.id, [field]: value[field] };
}

function after(value) {
  return new Date(Date.parse(value) + 1_000).toISOString();
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}
