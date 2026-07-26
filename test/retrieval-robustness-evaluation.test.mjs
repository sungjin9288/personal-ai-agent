import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalRetrievalRobustnessEvaluation,
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
      return {
        expectedSources: [{ key: `memory:${scenarioId}`, type: 'memory' }],
        id,
        irrelevantSources: [{ key: `attachment:${scenarioId}-noise`, type: 'attachment' }],
        k: 1,
        retrievedItems: [{
          sourceKey: failedCaseId === id
            ? `attachment:${scenarioId}-noise`
            : `memory:${scenarioId}`,
          sourceType: failedCaseId === id ? 'attachment' : 'memory',
        }],
      };
    }),
  );
}

function buildQualityEvaluation(algorithmId, options) {
  return evaluateRetrievalQualitySuite({
    algorithmId,
    cases: buildCases(options),
  });
}

function buildInput({ failedCaseId = null, caseMetadata } = {}) {
  const baselineEvaluation = buildQualityEvaluation('lexical-v1');
  const candidateEvaluation = buildQualityEvaluation('semantic-rerank-v1', { failedCaseId });
  return {
    baselineEvaluation,
    candidateEvaluation,
    caseMetadata: caseMetadata || buildCases().map((item, index) => {
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
    fixtureHash: sha('robustness-fixture'),
    model: {
      actualModelEvaluated: true,
      candidateEvidenceHash: sha('candidate'),
      digest: sha('model'),
      id: 'qwen2.5:3b',
      qualificationHash: sha('qualification'),
      qualificationStatus: 'governance-blocked',
      qualified: false,
    },
    observedAt: '2026-07-16T00:00:00.000Z',
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      transportLoopback: true,
      version: '0.23.0',
    },
  };
}

test('robustness evaluation passes complete variation coverage without authorizing activation', () => {
  const evaluation = buildLocalRetrievalRobustnessEvaluation(buildInput());

  assert.equal(evaluation.status, 'passed-governance-blocked');
  assert.equal(evaluation.actualLocalRetrievalRobustnessValidated, true);
  assert.equal(evaluation.coverage.scenarioCount, 3);
  assert.equal(evaluation.coverage.matrixComplete, true);
  assert.deepEqual(evaluation.coverage.variationCounts, {
    canonical: 3,
    paraphrase: 3,
    'noisy-query': 3,
    'cross-language': 3,
    'hard-negative': 3,
  });
  assert.equal(evaluation.activation.authorized, false);
  assert.equal(evaluation.decision, 'hold-for-governance');
  assert.equal(evaluation.rollback.mode, 'lexical');
  assert.doesNotThrow(() => assertLocalRetrievalRobustnessEvaluation(evaluation));
});

test('one quality regression keeps lexical rollback even when coverage is complete', () => {
  const evaluation = buildLocalRetrievalRobustnessEvaluation(
    buildInput({ failedCaseId: 'auth:noisy-query' }),
  );

  assert.equal(evaluation.status, 'failed-keep-lexical');
  assert.equal(evaluation.actualLocalRetrievalRobustnessValidated, false);
  assert.equal(evaluation.comparison.status, 'failed');
  assert.equal(evaluation.decision, 'keep-lexical');
});

test('missing variation coverage fails the gate without weakening quality thresholds', () => {
  const input = buildInput();
  input.caseMetadata = input.caseMetadata.map((item) =>
    item.id === 'auth:cross-language'
      ? { ...item, scenarioId: 'refund' }
      : item,
  );
  const evaluation = buildLocalRetrievalRobustnessEvaluation(input);

  assert.equal(evaluation.coverage.matrixComplete, false);
  assert.equal(evaluation.actualLocalRetrievalRobustnessValidated, false);
  assert.equal(evaluation.decision, 'keep-lexical');
});

test('unsupported variation and algorithm drift are rejected', () => {
  const unsupported = buildInput();
  unsupported.caseMetadata[0].variationType = 'unknown';
  assert.throws(
    () => buildLocalRetrievalRobustnessEvaluation(unsupported),
    /unsupported variation type/,
  );

  const drifted = buildInput();
  drifted.comparison.candidateAlgorithmId = 'another-candidate';
  assert.throws(
    () => buildLocalRetrievalRobustnessEvaluation(drifted),
    /bind the baseline and candidate algorithms/,
  );
});

test('integrity and claim-boundary tampering are rejected', () => {
  const evaluation = buildLocalRetrievalRobustnessEvaluation(buildInput());
  const metricTampered = structuredClone(evaluation);
  metricTampered.variationMetrics.canonical.recallAtK = 0.5;
  assert.throws(
    () => assertLocalRetrievalRobustnessEvaluation(metricTampered),
    /integrity|contract/,
  );

  const activationTampered = structuredClone(evaluation);
  activationTampered.activation.authorized = true;
  assert.throws(
    () => assertLocalRetrievalRobustnessEvaluation(activationTampered),
    /integrity|claim-boundary|contract/,
  );
});
