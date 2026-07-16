import { createHash } from 'node:crypto';

import { assertLocalRetrievalRobustnessEvaluation } from './retrieval-robustness-evaluation.mjs';

export const LOCAL_RELEVANCE_RERANKER_EVALUATION_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-reranker-evaluation/v1';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function isValidTimestamp(value) {
  return Number.isFinite(Date.parse(normalizeText(value)));
}

function normalizeDuration(value, fieldName) {
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error(`${fieldName} must be a positive number.`);
  }
  return duration;
}

function normalizeCaseScores(caseScores) {
  const normalized = ensureArray(caseScores)
    .map((item) => {
      const sourceScores = ensureArray(item.sourceScores)
        .map((source) => {
          const score = Number(source.score);
          if (!normalizeText(source.sourceKey) || !Number.isInteger(score) || score < 0 || score > 100) {
            throw new Error('Relevance source scores require a source key and integer score from 0 to 100.');
          }
          return { score, sourceKey: normalizeText(source.sourceKey) };
        })
        .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));
      if (!sourceScores.length || new Set(sourceScores.map((source) => source.sourceKey)).size !== sourceScores.length) {
        throw new Error('Relevance source scores must be non-empty and unique.');
      }
      return {
        firstDurationMs: normalizeDuration(item.firstDurationMs, 'firstDurationMs'),
        id: normalizeText(item.id),
        repeatedScoreMatch: item.repeatedScoreMatch === true,
        secondDurationMs: normalizeDuration(item.secondDurationMs, 'secondDurationMs'),
        sourceScores,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  if (
    !normalized.length ||
    normalized.some((item) => !item.id) ||
    new Set(normalized.map((item) => item.id)).size !== normalized.length
  ) {
    throw new Error('Relevance case scores require unique case ids.');
  }
  return normalized;
}

function normalizeScorer(scorer = {}) {
  if (
    !normalizeText(scorer.id) ||
    !normalizeText(scorer.modelId) ||
    !normalizeText(scorer.promptVersion) ||
    !isSha256(scorer.promptHash)
  ) {
    throw new Error('Relevance scorer identity, model, prompt version, and prompt hash are required.');
  }
  return {
    id: normalizeText(scorer.id),
    independentPairScoring: true,
    modelId: normalizeText(scorer.modelId),
    outputSchema: 'integer-score-0-100',
    promptHash: normalizeText(scorer.promptHash),
    promptVersion: normalizeText(scorer.promptVersion),
    repeatedPairScoring: true,
    untrustedInputBoundary: true,
  };
}

function normalizeRuntime(runtime = {}) {
  if (
    normalizeText(runtime.kind) !== 'ollama' ||
    !normalizeText(runtime.version) ||
    runtime.transportLoopback !== true
  ) {
    throw new Error('Relevance evaluation requires a loopback Ollama runtime.');
  }
  return {
    cloudFeaturesDisabled: runtime.cloudFeaturesDisabled === true,
    externalProviderCalls: 'none',
    kind: 'ollama',
    networkIsolation: 'not-proven',
    transportLoopback: true,
    version: normalizeText(runtime.version),
  };
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(Math.ceil((percentileValue / 100) * sorted.length) - 1, 0);
  return Number(sorted[index].toFixed(3));
}

function metricDelta(current, previous) {
  return Number((Number(current || 0) - Number(previous || 0)).toFixed(4));
}

function buildEvaluationContent({
  candidateEvaluation,
  caseScores,
  observedAt,
  priorEvaluation,
  runtime,
  scorer,
} = {}) {
  assertLocalRetrievalRobustnessEvaluation(candidateEvaluation);
  assertLocalRetrievalRobustnessEvaluation(priorEvaluation);
  const normalizedObservedAt = normalizeText(observedAt);
  if (!isValidTimestamp(normalizedObservedAt)) {
    throw new Error('Relevance evaluation observedAt must be a valid timestamp.');
  }
  const normalizedCaseScores = normalizeCaseScores(caseScores);
  const normalizedScorer = normalizeScorer(scorer);
  const normalizedRuntime = normalizeRuntime(runtime);
  const candidateCaseIds = candidateEvaluation.candidate.cases.map((item) => item.id).sort();
  const priorCaseIds = priorEvaluation.candidate.cases.map((item) => item.id).sort();
  if (
    JSON.stringify(candidateCaseIds) !== JSON.stringify(priorCaseIds) ||
    JSON.stringify(candidateCaseIds) !==
      JSON.stringify(normalizedCaseScores.map((item) => item.id))
  ) {
    throw new Error('Relevance candidate, prior evaluation, and score evidence must use the same cases.');
  }
  if (
    candidateEvaluation.fixtureHash !== priorEvaluation.fixtureHash ||
    candidateEvaluation.model.id !== priorEvaluation.model.id ||
    candidateEvaluation.model.digest !== priorEvaluation.model.digest ||
    normalizedScorer.modelId !== candidateEvaluation.model.id
  ) {
    throw new Error('Relevance evaluation must retain the prior fixture and model binding.');
  }
  const repeatStable = normalizedCaseScores.every((item) => item.repeatedScoreMatch);
  const candidateMetrics = candidateEvaluation.candidate.metrics;
  const priorMetrics = priorEvaluation.candidate.metrics;
  const baselineMetrics = priorEvaluation.baseline.metrics;
  const qualityPassed =
    repeatStable &&
    normalizedRuntime.cloudFeaturesDisabled &&
    candidateEvaluation.actualLocalRetrievalRobustnessValidated === true &&
    candidateEvaluation.candidate.status === 'passed' &&
    candidateEvaluation.comparison.status === 'passed' &&
    candidateMetrics.casePassRate > priorMetrics.casePassRate &&
    candidateMetrics.casePassRate >= baselineMetrics.casePassRate;
  const durations = normalizedCaseScores.flatMap((item) => [
    item.firstDurationMs,
    item.secondDurationMs,
  ]);

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRelevanceRerankerQualified: false,
    actualLocalRelevanceRerankerQualityValidated: qualityPassed,
    candidateEvaluation,
    caseScores: normalizedCaseScores,
    costFree: true,
    decision: qualityPassed ? 'hold-for-governance' : 'keep-lexical',
    improvement: {
      overLexicalCasePassRate: metricDelta(
        candidateMetrics.casePassRate,
        baselineMetrics.casePassRate,
      ),
      overPriorCandidateCasePassRate: metricDelta(
        candidateMetrics.casePassRate,
        priorMetrics.casePassRate,
      ),
    },
    latency: {
      modelInferenceCount: normalizedCaseScores.reduce(
        (sum, item) => sum + item.sourceScores.length * 2,
        0,
      ),
      maximumMs: percentile(durations, 100),
      p50Ms: percentile(durations, 50),
      p95Ms: percentile(durations, 95),
      rerankPassCount: durations.length,
      totalMs: Number(durations.reduce((sum, value) => sum + value, 0).toFixed(3)),
    },
    observedAt: normalizedObservedAt,
    priorEvaluation,
    productionReadyClaim: false,
    rollback: {
      mode: 'lexical',
      stateMigrationRequired: false,
    },
    runtime: normalizedRuntime,
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_RERANKER_EVALUATION_SCHEMA_VERSION,
    scorer: normalizedScorer,
    status: qualityPassed ? 'quality-passed-governance-blocked' : 'failed-keep-lexical',
  };
}

export function buildLocalRelevanceRerankerEvaluation(input = {}) {
  const content = buildEvaluationContent(input);
  const evaluationHash = hashRecord(content);
  return {
    ...content,
    evaluationHash,
    id: `local-relevance-reranker-evaluation-${evaluationHash}`,
  };
}

export function assertLocalRelevanceRerankerEvaluation(evaluation) {
  const { evaluationHash, id, ...content } = evaluation || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (evaluationHash !== expectedHash || id !== `local-relevance-reranker-evaluation-${expectedHash}`) {
    errors.push('integrity');
  }
  if (
    evaluation?.activation?.authorized !== false ||
    evaluation?.runtimeActivation !== false ||
    evaluation?.productionReadyClaim !== false ||
    evaluation?.runtime?.externalProviderCalls !== 'none'
  ) {
    errors.push('claim-boundary');
  }
  try {
    const rebuilt = buildEvaluationContent({
      candidateEvaluation: evaluation?.candidateEvaluation,
      caseScores: evaluation?.caseScores,
      observedAt: evaluation?.observedAt,
      priorEvaluation: evaluation?.priorEvaluation,
      runtime: evaluation?.runtime,
      scorer: evaluation?.scorer,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  if (errors.length) {
    throw new Error(`Local relevance reranker evaluation failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
