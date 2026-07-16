import { createHash } from 'node:crypto';

import { assertLocalRelevanceRerankerEvaluation } from './local-relevance-reranker-evaluation.mjs';
import { assertLocalRetrievalRobustnessEvaluation } from './retrieval-robustness-evaluation.mjs';

export const LOCAL_RERANKER_RESOURCE_ENVELOPE_SCHEMA_VERSION =
  'personal-ai-agent-local-reranker-resource-envelope/v1';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '').trim();
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function normalizePositiveNumber(value, fieldName, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0 || (integer && !Number.isInteger(normalized))) {
    throw new Error(`${fieldName} must be a positive ${integer ? 'integer' : 'number'}.`);
  }
  return normalized;
}

function normalizeNonNegativeInteger(value, fieldName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
  return normalized;
}

function normalizeCaseScores(caseScores) {
  const normalized = ensureArray(caseScores)
    .map((item) => {
      const sourceScores = ensureArray(item.sourceScores)
        .map((source) => {
          const score = Number(source.score);
          const sourceKey = normalizeText(source.sourceKey);
          if (!sourceKey || !Number.isInteger(score) || score < 0 || score > 100) {
            throw new Error('Resource envelope source scores require a source key and integer score from 0 to 100.');
          }
          return { score, sourceKey };
        })
        .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));
      if (!sourceScores.length || new Set(sourceScores.map((source) => source.sourceKey)).size !== sourceScores.length) {
        throw new Error('Resource envelope source scores must be non-empty and unique.');
      }
      return {
        firstDurationMs: normalizePositiveNumber(item.firstDurationMs, 'firstDurationMs'),
        id: normalizeText(item.id),
        repeatedScoreMatch: item.repeatedScoreMatch === true,
        secondDurationMs: normalizePositiveNumber(item.secondDurationMs, 'secondDurationMs'),
        sourceScores,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  if (
    !normalized.length ||
    normalized.some((item) => !item.id) ||
    new Set(normalized.map((item) => item.id)).size !== normalized.length
  ) {
    throw new Error('Resource envelope case scores require unique case ids.');
  }
  return normalized;
}

function normalizeSelectionRecords(records) {
  const normalized = ensureArray(records)
    .map((record) => {
      const selectedSourceKeys = ensureArray(record.selectedSourceKeys)
        .map(normalizeText)
        .filter(Boolean);
      const droppedSourceKeys = ensureArray(record.droppedSourceKeys)
        .map(normalizeText)
        .filter(Boolean);
      const inputCandidateCount = normalizePositiveNumber(
        record.inputCandidateCount,
        'inputCandidateCount',
        { integer: true },
      );
      const maxCandidates = normalizePositiveNumber(record.maxCandidates, 'maxCandidates', {
        integer: true,
      });
      const selectedCandidateCount = normalizePositiveNumber(
        record.selectedCandidateCount,
        'selectedCandidateCount',
        { integer: true },
      );
      if (
        normalizeText(record.algorithmId) !== 'lexical-baseline-prefix-v1' ||
        record.expectedSourceRetained !== true ||
        record.stateMigrationRequired !== false ||
        selectedCandidateCount !== selectedSourceKeys.length ||
        inputCandidateCount !== selectedSourceKeys.length + droppedSourceKeys.length ||
        maxCandidates !== 2 ||
        selectedCandidateCount !== 2 ||
        new Set([...selectedSourceKeys, ...droppedSourceKeys]).size !== inputCandidateCount
      ) {
        throw new Error('Resource envelope requires the bounded top-two lexical shortlist contract.');
      }
      return {
        algorithmId: 'lexical-baseline-prefix-v1',
        droppedSourceKeys,
        expectedSourceRetained: true,
        id: normalizeText(record.id),
        inputCandidateCount,
        maxCandidates,
        selectedCandidateCount,
        selectedSourceKeys,
        stateMigrationRequired: false,
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id));
  if (
    !normalized.length ||
    normalized.some((record) => !record.id) ||
    new Set(normalized.map((record) => record.id)).size !== normalized.length
  ) {
    throw new Error('Resource envelope shortlist records require unique case ids.');
  }
  return normalized;
}

function normalizeResourceSnapshot(snapshot = {}, expectedModel) {
  const modelId = normalizeText(snapshot.modelId);
  const modelDigest = normalizeText(snapshot.modelDigest);
  if (
    normalizeText(snapshot.source) !== 'ollama-api-ps' ||
    modelId !== expectedModel.id ||
    modelDigest !== expectedModel.digest ||
    !isSha256(modelDigest)
  ) {
    throw new Error('Resource snapshot must bind the evaluated model to Ollama API ps evidence.');
  }
  return {
    contextLength: normalizePositiveNumber(snapshot.contextLength, 'contextLength', {
      integer: true,
    }),
    loadedModelBytes: normalizePositiveNumber(snapshot.loadedModelBytes, 'loadedModelBytes', {
      integer: true,
    }),
    loadedModelVramBytes: normalizeNonNegativeInteger(
      snapshot.loadedModelVramBytes,
      'loadedModelVramBytes',
    ),
    modelArtifactBytes: normalizePositiveNumber(snapshot.modelArtifactBytes, 'modelArtifactBytes', {
      integer: true,
    }),
    modelDigest,
    modelId,
    source: 'ollama-api-ps',
  };
}

function normalizeRuntime(runtime = {}) {
  if (
    normalizeText(runtime.kind) !== 'ollama' ||
    !normalizeText(runtime.version) ||
    runtime.transportLoopback !== true
  ) {
    throw new Error('Resource envelope requires a loopback Ollama runtime.');
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

function normalizeScorer(scorer = {}, priorEvaluation) {
  const normalized = {
    id: normalizeText(scorer.id),
    modelId: normalizeText(scorer.modelId),
    promptHash: normalizeText(scorer.promptHash),
    promptVersion: normalizeText(scorer.promptVersion),
  };
  if (
    !normalized.id ||
    !normalized.modelId ||
    !isSha256(normalized.promptHash) ||
    !normalized.promptVersion ||
    normalized.id !== priorEvaluation.scorer.id ||
    normalized.modelId !== priorEvaluation.scorer.modelId ||
    normalized.promptHash !== priorEvaluation.scorer.promptHash ||
    normalized.promptVersion !== priorEvaluation.scorer.promptVersion
  ) {
    throw new Error('Resource envelope must retain the R8 scorer identity and prompt binding.');
  }
  return normalized;
}

function percentile(values, percentileValue) {
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(Math.ceil((percentileValue / 100) * sorted.length) - 1, 0);
  return Number(sorted[index].toFixed(3));
}

function reductionRate(previous, current) {
  return Number(((Number(previous) - Number(current)) / Number(previous)).toFixed(4));
}

function sameQualityResult(priorEvaluation, optimizedEvaluation) {
  const priorCandidate = priorEvaluation.candidateEvaluation.candidate;
  const optimizedCandidate = optimizedEvaluation.candidate;
  const summarizeCases = (evaluation) => evaluation.cases.map((item) => ({
    id: item.id,
    metrics: item.metrics,
    selectedSourceKeys: item.evidence.selectedSourceKeys,
    status: item.status,
  }));
  return (
    JSON.stringify(priorCandidate.metrics) === JSON.stringify(optimizedCandidate.metrics) &&
    JSON.stringify(summarizeCases(priorCandidate)) ===
      JSON.stringify(summarizeCases(optimizedCandidate)) &&
    JSON.stringify(priorEvaluation.candidateEvaluation.variationMetrics) ===
      JSON.stringify(optimizedEvaluation.variationMetrics)
  );
}

function buildEnvelopeContent({
  caseScores,
  observedAt,
  optimizedEvaluation,
  priorEvaluation,
  resourceSnapshot,
  runtime,
  scorer,
  selectionRecords,
} = {}) {
  assertLocalRelevanceRerankerEvaluation(priorEvaluation);
  assertLocalRetrievalRobustnessEvaluation(optimizedEvaluation);
  const normalizedObservedAt = normalizeText(observedAt);
  if (!Number.isFinite(Date.parse(normalizedObservedAt))) {
    throw new Error('Resource envelope observedAt must be a valid timestamp.');
  }
  const normalizedScores = normalizeCaseScores(caseScores);
  const normalizedSelections = normalizeSelectionRecords(selectionRecords);
  const normalizedRuntime = normalizeRuntime(runtime);
  const normalizedScorer = normalizeScorer(scorer, priorEvaluation);
  const normalizedResourceSnapshot = normalizeResourceSnapshot(
    resourceSnapshot,
    optimizedEvaluation.model,
  );
  const caseIds = optimizedEvaluation.candidate.cases.map((item) => item.id).sort();
  if (
    JSON.stringify(caseIds) !== JSON.stringify(normalizedScores.map((item) => item.id)) ||
    JSON.stringify(caseIds) !== JSON.stringify(normalizedSelections.map((item) => item.id))
  ) {
    throw new Error('Resource envelope quality, score, and shortlist evidence must use the same cases.');
  }
  for (const score of normalizedScores) {
    const selection = normalizedSelections.find((item) => item.id === score.id);
    if (
      JSON.stringify(score.sourceScores.map((item) => item.sourceKey)) !==
      JSON.stringify([...selection.selectedSourceKeys].sort())
    ) {
      throw new Error(`Resource envelope score sources must match the shortlist: ${score.id}.`);
    }
  }
  if (
    optimizedEvaluation.fixtureHash !== priorEvaluation.candidateEvaluation.fixtureHash ||
    optimizedEvaluation.model.id !== priorEvaluation.candidateEvaluation.model.id ||
    optimizedEvaluation.model.digest !== priorEvaluation.candidateEvaluation.model.digest ||
    optimizedEvaluation.runtime.kind !== normalizedRuntime.kind ||
    optimizedEvaluation.runtime.version !== normalizedRuntime.version ||
    optimizedEvaluation.runtime.transportLoopback !== normalizedRuntime.transportLoopback ||
    optimizedEvaluation.runtime.cloudFeaturesDisabled !==
      normalizedRuntime.cloudFeaturesDisabled ||
    optimizedEvaluation.baseline.evaluationHash !==
      priorEvaluation.candidateEvaluation.candidate.evaluationHash
  ) {
    throw new Error('Resource envelope must retain the R8 fixture, model, runtime, and quality baseline.');
  }

  const durations = normalizedScores.flatMap((item) => [
    item.firstDurationMs,
    item.secondDurationMs,
  ]);
  const modelInferenceCount = normalizedScores.reduce(
    (sum, item) => sum + item.sourceScores.length * 2,
    0,
  );
  const latency = {
    maximumMs: percentile(durations, 100),
    modelInferenceCount,
    p50Ms: percentile(durations, 50),
    p95Ms: percentile(durations, 95),
    rerankPassCount: durations.length,
    totalMs: Number(durations.reduce((sum, value) => sum + value, 0).toFixed(3)),
  };
  const priorLatency = priorEvaluation.latency;
  const qualityParity = sameQualityResult(priorEvaluation, optimizedEvaluation);
  const repeatStable = normalizedScores.every((item) => item.repeatedScoreMatch);
  const shortlistCoveragePassed = normalizedSelections.every(
    (item) => item.expectedSourceRetained,
  );
  const comparison = {
    inferenceReductionRate: reductionRate(priorLatency.modelInferenceCount, modelInferenceCount),
    p50ReductionRate: reductionRate(priorLatency.p50Ms, latency.p50Ms),
    p95ReductionRate: reductionRate(priorLatency.p95Ms, latency.p95Ms),
    priorModelInferenceCount: priorLatency.modelInferenceCount,
    priorP50Ms: priorLatency.p50Ms,
    priorP95Ms: priorLatency.p95Ms,
    priorTotalMs: priorLatency.totalMs,
    totalReductionRate: reductionRate(priorLatency.totalMs, latency.totalMs),
  };
  const envelopePassed =
    optimizedEvaluation.actualLocalRetrievalRobustnessValidated === true &&
    optimizedEvaluation.candidate.status === 'passed' &&
    qualityParity &&
    repeatStable &&
    shortlistCoveragePassed &&
    normalizedRuntime.cloudFeaturesDisabled &&
    comparison.inferenceReductionRate > 0 &&
    comparison.p50ReductionRate > 0 &&
    comparison.p95ReductionRate > 0 &&
    comparison.totalReductionRate > 0;

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRerankerResourceEnvelopeQualified: false,
    actualLocalRerankerResourceEnvelopeValidated: envelopePassed,
    candidatePolicy: {
      evaluationOnly: true,
      maxCandidates: 2,
      minimumExpectedSourceRecall: 1,
      runtimeActivation: false,
    },
    caseScores: normalizedScores,
    comparison,
    costFree: true,
    decision: envelopePassed ? 'hold-shortlist-for-governance' : 'keep-r8-full-scan',
    governance: {
      approvedResourceLimit: false,
      licenseApproved: false,
      networkIsolationProven: false,
      rollbackOwnerApproved: false,
      sustainedConcurrencyValidated: false,
      thermalEnvelopeValidated: false,
    },
    latency,
    observedAt: normalizedObservedAt,
    optimizedEvaluation,
    priorEvaluation,
    productionReadyClaim: false,
    qualityParity,
    repeatStable,
    resourceSnapshot: normalizedResourceSnapshot,
    rollback: {
      primary: 'r8-full-scan',
      secondary: 'lexical',
      stateMigrationRequired: false,
    },
    runtime: normalizedRuntime,
    runtimeActivation: false,
    schemaVersion: LOCAL_RERANKER_RESOURCE_ENVELOPE_SCHEMA_VERSION,
    scorer: normalizedScorer,
    selectionRecords: normalizedSelections,
    shortlistCoveragePassed,
    status: envelopePassed
      ? 'resource-envelope-passed-governance-blocked'
      : 'failed-keep-r8-full-scan',
  };
}

export function buildLocalRerankerResourceEnvelope(input = {}) {
  const content = buildEnvelopeContent(input);
  const envelopeHash = hashRecord(content);
  return {
    ...content,
    envelopeHash,
    id: `local-reranker-resource-envelope-${envelopeHash}`,
  };
}

export function assertLocalRerankerResourceEnvelope(envelope) {
  const { envelopeHash, id, ...content } = envelope || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    envelopeHash !== expectedHash ||
    id !== `local-reranker-resource-envelope-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  if (
    envelope?.activation?.authorized !== false ||
    envelope?.runtimeActivation !== false ||
    envelope?.productionReadyClaim !== false ||
    envelope?.runtime?.externalProviderCalls !== 'none'
  ) {
    errors.push('claim-boundary');
  }
  try {
    const rebuilt = buildEnvelopeContent({
      caseScores: envelope?.caseScores,
      observedAt: envelope?.observedAt,
      optimizedEvaluation: envelope?.optimizedEvaluation,
      priorEvaluation: envelope?.priorEvaluation,
      resourceSnapshot: envelope?.resourceSnapshot,
      runtime: envelope?.runtime,
      scorer: envelope?.scorer,
      selectionRecords: envelope?.selectionRecords,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  if (errors.length) {
    throw new Error(`Local reranker resource envelope failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
