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
  assertLocalAnswerCompositionCandidate,
  buildLocalAnswerCompositionCandidate,
} from '../src/core/local-answer-composition-candidate.mjs';
import { createEvidenceFirstOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildLocalTrainingReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function buildCandidate({ omitBaselineReference = false } = {}) {
  const fixtureText = fs.readFileSync('fixtures/answer-quality-cases-v1.json', 'utf8');
  const fixture = JSON.parse(fixtureText);
  const fixtureHash = sha256(fixtureText);
  const baseline = JSON.parse(
    fs.readFileSync('evidence/output-artifacts/local-answer-quality-baseline.json', 'utf8'),
  );
  const readinessPackage = buildLocalTrainingReadinessFixture();
  const generator = createEvidenceFirstOllamaAnswerGenerator({
    endpoint: 'http://127.0.0.1:1',
    model: baseline.model.id,
  });
  const candidateEvaluation = evaluateAnswerQualitySuite({
    cases: fixture.cases.map(({ retrievalInput, ...definition }) => ({
      ...definition,
      retrievedItems: buildRetrievalContext(retrievalInput),
    })),
    thresholds: fixture.thresholds,
  });
  const candidateEvidence = buildCandidateModelEvidence({
    actualModelEvaluated: true,
    candidateEvaluation,
    candidateId: 'local-answer-composition-test',
    evaluatedAt: '2026-07-17T11:00:00.000Z',
    evaluationRunId: 'local-answer-composition-test-v1',
    evaluationSource: 'recorded-model-evaluation',
    evidenceRefs: [
      ...(omitBaselineReference ? [] : [`baseline:${baseline.evidenceHash}`]),
      `fixture:${fixtureHash}`,
      `ollama-model:${baseline.model.digest}`,
      `prompt:${generator.promptHash}`,
    ],
    modelId: baseline.model.id,
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
    claimCount: definition.expectedSourceKeys.length,
    durationMs: 10,
    inputHash: sha256(`input:${definition.id}`),
    outputBytes: 100,
    promptHash: generator.promptHash,
    promptVersion: generator.promptVersion,
    responseHash: sha256(`response:${definition.id}`),
    reviewActionPresent: true,
    sourceCoverageComplete: true,
  }));
  return {
    baseline,
    candidateGate,
    input: {
      baseline,
      candidateGate,
      observations,
      observedAt: '2026-07-17T11:01:00.000Z',
      runtime: {
        cloudFeaturesDisabled: true,
        endpointAlias: 'loopback-ollama',
        kind: 'ollama',
        transportLoopback: true,
        version: baseline.runtime.version,
      },
    },
  };
}

test('evidence-first composition improves the actual baseline without activation authority', () => {
  const { input } = buildCandidate();
  const evidence = buildLocalAnswerCompositionCandidate(input);

  assert.doesNotThrow(() => assertLocalAnswerCompositionCandidate(evidence));
  assert.equal(evidence.status, 'quality-improved-governance-blocked');
  assert.equal(evidence.decision, 'hold-for-governance');
  assert.equal(evidence.candidateQualityValidated, true);
  assert.equal(evidence.currentAnswerPathChanged, false);
  assert.equal(evidence.actualModelTrainingExecuted, false);
  assert.equal(evidence.activation.authorized, false);
  assert.equal(evidence.comparison.regressions.length, 0);
  assert.equal(
    evidence.comparison.improvements.some(
      (delta) => delta.scope === 'suite' && delta.metric === 'requiredTermCoverage',
    ),
    true,
  );
  assert.equal(JSON.stringify(evidence).includes('Prompt normalization resolved'), false);
});

test('composition evidence rejects missing baseline binding and tampering', () => {
  const incomplete = buildCandidate({ omitBaselineReference: true });
  assert.throws(
    () => buildLocalAnswerCompositionCandidate(incomplete.input),
    /bind the baseline, model, prompt, and suite/,
  );

  const evidence = buildLocalAnswerCompositionCandidate(buildCandidate().input);
  const tampered = structuredClone(evidence);
  tampered.observations[0].responseHash = sha256('tampered');
  assert.throws(() => assertLocalAnswerCompositionCandidate(tampered), /integrity/);
});
