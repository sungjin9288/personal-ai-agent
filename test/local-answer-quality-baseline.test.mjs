import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  buildCandidateModelEvidence,
  evaluateCandidateModelGate,
} from '../src/core/candidate-model-evaluation.mjs';
import {
  assertLocalAnswerQualityBaseline,
  buildLocalAnswerQualityBaseline,
} from '../src/core/local-answer-quality-baseline.mjs';
import { LOCAL_ANSWER_PROMPT_VERSION } from '../src/core/ollama-answer-generator.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildLocalTrainingReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function buildEvidence({ regress = false } = {}) {
  const fixtureText = fs.readFileSync('fixtures/answer-quality-cases-v1.json', 'utf8');
  const fixture = JSON.parse(fixtureText);
  const fixtureHash = sha256(fixtureText);
  const modelDigest = sha256('model');
  const readinessPackage = buildLocalTrainingReadinessFixture();
  const candidateEvaluation = evaluateAnswerQualitySuite({
    cases: fixture.cases.map(({ retrievalInput, ...definition }, index) => ({
      ...definition,
      answer: regress && index === 0
        ? { citedSourceKeys: ['memory:workspace/fact'], text: 'Insufficient evidence.' }
        : definition.answer,
      retrievedItems: buildRetrievalContext(retrievalInput),
    })),
    thresholds: fixture.thresholds,
  });
  const candidateEvidence = buildCandidateModelEvidence({
    actualModelEvaluated: true,
    candidateEvaluation,
    candidateId: 'local-base-model-qwen2.5-3b',
    evaluatedAt: '2026-07-17T10:00:00.000Z',
    evaluationRunId: 'local-answer-quality-test-v1',
    evaluationSource: 'recorded-model-evaluation',
    evidenceRefs: [`fixture:${fixtureHash}`, `ollama-model:${modelDigest}`],
    modelId: 'qwen2.5:3b',
    provider: 'local-ollama',
    readinessPackage,
  });
  const candidateGate = evaluateCandidateModelGate({
    candidateEvaluation,
    candidateEvidence,
    readinessPackage,
  });
  const observations = fixture.cases.map((definition) => ({
    caseId: definition.id,
    citedSourceKeys: definition.answer.citedSourceKeys,
    durationMs: 10,
    inputHash: sha256(`input:${definition.id}`),
    outputBytes: 100,
    promptHash: sha256('prompt'),
    promptVersion: LOCAL_ANSWER_PROMPT_VERSION,
    responseHash: sha256(`response:${definition.id}`),
  }));
  return buildLocalAnswerQualityBaseline({
    candidateGate,
    model: {
      digest: modelDigest,
      id: 'qwen2.5:3b',
      license: {
        textHash: sha256('license'),
        title: 'Qwen model license evidence',
      },
      modifiedAt: '2026-05-01T00:00:00.000Z',
      sizeBytes: 1_929_912_432,
    },
    observations,
    observedAt: '2026-07-17T10:01:00.000Z',
    runtime: {
      cloudFeaturesDisabled: true,
      endpointAlias: 'loopback-ollama',
      kind: 'ollama',
      transportLoopback: true,
      version: '0.23.0',
    },
    suite: {
      caseIds: fixture.cases.map((definition) => definition.id),
      fixtureHash,
      id: fixture.schemaVersion,
      thresholds: fixture.thresholds,
    },
  });
}

test('local answer quality baseline records a passing actual model without activation authority', () => {
  const evidence = buildEvidence();

  assert.doesNotThrow(() => assertLocalAnswerQualityBaseline(evidence));
  assert.equal(evidence.status, 'quality-passed-governance-blocked');
  assert.equal(evidence.decision, 'hold-for-governance');
  assert.equal(evidence.actualModelEvaluated, true);
  assert.equal(evidence.actualLocalAnswerModelQualityValidated, true);
  assert.equal(evidence.actualLocalAnswerModelQualified, false);
  assert.equal(evidence.actualModelTrainingExecuted, false);
  assert.equal(evidence.activation.authorized, false);
  assert.deepEqual(evidence.activation.blockerCheckIds, [
    'license-review-approved',
    'os-egress-isolation-approved',
    'resource-envelope-approved',
    'rollback-owner-assigned',
  ]);
  assert.equal(JSON.stringify(evidence).includes('Prompt normalization resolved'), false);
});

test('local answer quality regression keeps the current answer path and tampering fails closed', () => {
  const evidence = buildEvidence({ regress: true });
  assert.equal(evidence.status, 'quality-regressed-keep-current');
  assert.equal(evidence.decision, 'keep-current-answer-path');
  assert.equal(evidence.actualLocalAnswerModelQualityValidated, false);
  assert.equal(evidence.activation.blockerCheckIds[0], 'candidate-quality-passed');

  const tampered = structuredClone(evidence);
  tampered.observations[0].responseHash = sha256('tampered');
  assert.throws(() => assertLocalAnswerQualityBaseline(tampered), /integrity/);
});

test('local answer quality evidence rejects model and suite drift after outer hash replacement', () => {
  const mutations = [
    (evidence) => { evidence.model.id = 'another-model'; },
    (evidence) => { evidence.suite.thresholds.minimumRequiredTermCoverage = 0.5; },
  ];
  for (const mutate of mutations) {
    const tampered = structuredClone(buildEvidence());
    mutate(tampered);
    const { evidenceHash: _evidenceHash, id: _id, ...content } = tampered;
    const replacementHash = sha256(JSON.stringify(content));
    tampered.evidenceHash = replacementHash;
    tampered.id = `local-answer-quality-baseline-${replacementHash}`;
    assert.throws(
      () => assertLocalAnswerQualityBaseline(tampered),
      /model and suite evidence must bind/,
    );
  }
});
