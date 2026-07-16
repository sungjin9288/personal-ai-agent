import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalRelevanceRerankerEvaluation,
  buildLocalRelevanceRerankerEvaluation,
} from '../src/core/local-relevance-reranker-evaluation.mjs';
import {
  buildLocalRetrievalRobustnessEvaluation,
  REQUIRED_RETRIEVAL_VARIATION_TYPES,
} from '../src/core/retrieval-robustness-evaluation.mjs';
import {
  compareRetrievalQualityEvaluations,
  evaluateRetrievalQualitySuite,
} from '../src/core/retrieval-quality-evaluation.mjs';

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildCases({ failedCaseId = null } = {}) {
  return ['auth', 'refund', 'handoff'].flatMap((scenarioId) =>
    REQUIRED_RETRIEVAL_VARIATION_TYPES.map((variationType) => {
      const id = `${scenarioId}:${variationType}`;
      const failed = id === failedCaseId;
      return {
        expectedSources: [{ key: `memory:${scenarioId}`, type: 'memory' }],
        id,
        irrelevantSources: [{ key: `attachment:${scenarioId}-noise`, type: 'attachment' }],
        k: 1,
        retrievedItems: [{
          sourceKey: failed ? `attachment:${scenarioId}-noise` : `memory:${scenarioId}`,
          sourceType: failed ? 'attachment' : 'memory',
        }],
      };
    }),
  );
}

function buildRobustnessEvaluation({ failedCaseId = null, observedAt } = {}) {
  const baselineEvaluation = evaluateRetrievalQualitySuite({
    algorithmId: 'lexical-v1',
    cases: buildCases(),
  });
  const candidateEvaluation = evaluateRetrievalQualitySuite({
    algorithmId: failedCaseId ? 'prior-semantic-v1' : 'local-relevance-v1',
    cases: buildCases({ failedCaseId }),
  });
  return buildLocalRetrievalRobustnessEvaluation({
    baselineEvaluation,
    candidateEvaluation,
    caseMetadata: buildCases().map((item, index) => {
      const [scenarioId, variationType] = item.id.split(':');
      return {
        durationMs: 10 + index,
        id: item.id,
        scenarioId,
        variationType,
      };
    }),
    comparison: compareRetrievalQualityEvaluations({
      baseline: baselineEvaluation,
      candidate: candidateEvaluation,
    }),
    coverage: {
      minimumCasesPerVariation: 3,
      minimumScenarioCount: 3,
      requiredVariationTypes: REQUIRED_RETRIEVAL_VARIATION_TYPES,
    },
    fixtureHash: sha('fixture'),
    model: {
      actualModelEvaluated: true,
      candidateEvidenceHash: sha('candidate'),
      digest: sha('model'),
      id: 'qwen2.5:3b',
      qualificationHash: sha('qualification'),
      qualificationStatus: 'governance-blocked',
      qualified: false,
    },
    observedAt: observedAt || '2026-07-16T00:00:00.000Z',
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      transportLoopback: true,
      version: '0.23.0',
    },
  });
}

function buildInput({ repeatFailure = false, priorPassed = false } = {}) {
  const candidateEvaluation = buildRobustnessEvaluation({
    observedAt: '2026-07-16T01:00:00.000Z',
  });
  const priorEvaluation = buildRobustnessEvaluation({
    failedCaseId: priorPassed ? null : 'auth:noisy-query',
  });
  return {
    candidateEvaluation,
    caseScores: candidateEvaluation.candidate.cases.map((item, index) => ({
      firstDurationMs: 20 + index,
      id: item.id,
      repeatedScoreMatch: repeatFailure ? index > 0 : true,
      secondDurationMs: 21 + index,
      sourceScores: [
        { score: 95, sourceKey: item.evidence.selectedSourceKeys[0] },
        { score: 5, sourceKey: `attachment:noise-${index}` },
      ],
    })),
    observedAt: '2026-07-16T02:00:00.000Z',
    priorEvaluation,
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      transportLoopback: true,
      version: '0.23.0',
    },
    scorer: {
      id: 'ollama-independent-score:qwen2.5:3b',
      modelId: 'qwen2.5:3b',
      promptHash: sha('prompt'),
      promptVersion: 'prompt/v1',
    },
  };
}

test('quality-passing repeat-stable reranker stays governance blocked', () => {
  const evaluation = buildLocalRelevanceRerankerEvaluation(buildInput());

  assert.equal(evaluation.status, 'quality-passed-governance-blocked');
  assert.equal(evaluation.actualLocalRelevanceRerankerQualityValidated, true);
  assert.equal(evaluation.actualLocalRelevanceRerankerQualified, false);
  assert.equal(evaluation.improvement.overLexicalCasePassRate, 0);
  assert.equal(evaluation.improvement.overPriorCandidateCasePassRate, 0.0667);
  assert.equal(evaluation.activation.authorized, false);
  assert.equal(evaluation.runtimeActivation, false);
  assert.equal(evaluation.decision, 'hold-for-governance');
  assert.equal(evaluation.latency.modelInferenceCount, 60);
  assert.equal(evaluation.latency.rerankPassCount, 30);
  assert.doesNotThrow(() => assertLocalRelevanceRerankerEvaluation(evaluation));
});

test('repeat mismatch keeps lexical even when candidate quality passes', () => {
  const evaluation = buildLocalRelevanceRerankerEvaluation(buildInput({ repeatFailure: true }));

  assert.equal(evaluation.actualLocalRelevanceRerankerQualityValidated, false);
  assert.equal(evaluation.status, 'failed-keep-lexical');
  assert.equal(evaluation.decision, 'keep-lexical');
});

test('candidate must improve the prior result instead of merely tying it', () => {
  const evaluation = buildLocalRelevanceRerankerEvaluation(buildInput({ priorPassed: true }));

  assert.equal(evaluation.improvement.overPriorCandidateCasePassRate, 0);
  assert.equal(evaluation.actualLocalRelevanceRerankerQualityValidated, false);
  assert.equal(evaluation.decision, 'keep-lexical');
});

test('evaluation rejects score, decision, and activation tampering', () => {
  const evaluation = buildLocalRelevanceRerankerEvaluation(buildInput());
  const scoreTampered = structuredClone(evaluation);
  scoreTampered.caseScores[0].sourceScores[0].score = 1;
  assert.throws(
    () => assertLocalRelevanceRerankerEvaluation(scoreTampered),
    /integrity|contract/,
  );

  const activationTampered = structuredClone(evaluation);
  activationTampered.activation.authorized = true;
  assert.throws(
    () => assertLocalRelevanceRerankerEvaluation(activationTampered),
    /integrity|claim-boundary|contract/,
  );
});
