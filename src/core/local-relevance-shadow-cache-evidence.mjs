import { createHash } from 'node:crypto';

import {
  LOCAL_RELEVANCE_SCORE_CACHE_SCHEMA_VERSION,
} from './local-relevance-score-cache.mjs';
import {
  assertLocalRelevanceShadowReplay,
} from './local-relevance-shadow-replay.mjs';

export const LOCAL_RELEVANCE_SHADOW_CACHE_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-shadow-cache-evidence/v1';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function ratio(numerator, denominator) {
  if (!denominator) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

function buildPriorReplayBinding(replay) {
  assertLocalRelevanceShadowReplay(replay);
  const scorer = firstObservation(replay)?.scorer || {};
  const content = {
    actualLocalRelevanceShadowReplayValidated:
      replay.actualLocalRelevanceShadowReplayValidated === true,
    fixtureContractHash: normalizeText(replay.fixtureContract?.contractHash),
    id: normalizeText(replay.id),
    latency: { ...replay.latency },
    priorShadowEvidenceId: normalizeText(replay.priorShadowEvidence?.id),
    quality: { ...replay.quality },
    queryContract: normalizeText(replay.queryContract),
    replayHash: normalizeText(replay.replayHash),
    scorer: {
      id: normalizeText(scorer.id),
      modelId: normalizeText(scorer.modelId),
      promptHash: normalizeText(scorer.promptHash),
      promptVersion: normalizeText(scorer.promptVersion),
    },
    runtime: {
      modelDigest: normalizeText(replay.runtime?.modelDigest),
      modelId: normalizeText(replay.runtime?.modelId),
      version: normalizeText(replay.runtime?.version),
    },
    status: normalizeText(replay.status),
  };
  return {
    ...content,
    bindingHash: hashRecord(content),
  };
}

function normalizePriorReplayBinding(binding = {}) {
  const { bindingHash, ...content } = binding;
  if (
    bindingHash !== hashRecord(content) ||
    !content.id ||
    !/^[a-f0-9]{64}$/.test(content.replayHash) ||
    !/^[a-f0-9]{64}$/.test(content.fixtureContractHash) ||
    !content.priorShadowEvidenceId ||
    content.queryContract !== 'mission-objective-v1' ||
    !/^[a-f0-9]{64}$/.test(content.runtime?.modelDigest) ||
    !content.runtime?.modelId ||
    !content.runtime?.version ||
    !content.scorer?.id ||
    !content.scorer?.modelId ||
    !/^[a-f0-9]{64}$/.test(content.scorer?.promptHash) ||
    !content.scorer?.promptVersion
  ) {
    throw new Error('Unsupported local relevance shadow replay binding.');
  }
  return binding;
}

function normalizeCacheSnapshot(snapshot = {}) {
  const binding = snapshot.binding || {};
  const { bindingHash, ...bindingContent } = binding;
  const metrics = snapshot.metrics || {};
  if (
    snapshot.schemaVersion !== LOCAL_RELEVANCE_SCORE_CACHE_SCHEMA_VERSION ||
    bindingHash !== hashRecord(bindingContent) ||
    !Number.isInteger(snapshot.maxEntries) ||
    snapshot.maxEntries <= 0 ||
    !Number.isInteger(snapshot.completedEntryCount) ||
    snapshot.completedEntryCount < 0 ||
    snapshot.completedEntryCount > snapshot.maxEntries ||
    snapshot.completedEntryContentRetained !== false ||
    snapshot.pendingEntryCount !== 0 ||
    snapshot.persistent !== false ||
    snapshot.externalProviderCalls !== 'none' ||
    snapshot.runtimeActivation !== false ||
    snapshot.productionReadyClaim !== false ||
    snapshot.strategy !== 'bounded-process-local-lru'
  ) {
    throw new Error('Unsupported local relevance score cache snapshot.');
  }
  for (const field of [
    'evictionCount',
    'failureCount',
    'hitCount',
    'inFlightHitCount',
    'missCount',
    'modelInferenceCount',
    'requestCount',
  ]) {
    if (!Number.isInteger(metrics[field]) || metrics[field] < 0) {
      throw new Error(`Local relevance score cache metric is invalid: ${field}.`);
    }
  }
  if (
    metrics.requestCount !== metrics.hitCount + metrics.inFlightHitCount + metrics.missCount ||
    metrics.modelInferenceCount !== metrics.missCount
  ) {
    throw new Error('Local relevance score cache metrics are inconsistent.');
  }
  return snapshot;
}

function countUniqueScorePairs(replay) {
  const pairs = new Set();
  for (const item of replay.cases) {
    for (const observation of item.observations) {
      for (const candidate of ensureArray(observation.candidateBindings)) {
        pairs.add(`${observation.queryHash}:${candidate.contentHash}`);
      }
    }
  }
  return pairs.size;
}

function countScoreRequests(replay) {
  return replay.cases.reduce(
    (total, item) => total + item.observations.reduce(
      (caseTotal, observation) =>
        caseTotal + ensureArray(observation.candidateBindings).length,
      0,
    ),
    0,
  );
}

function latencySnapshot(latency = {}) {
  return {
    maximumMs: latency.maximumMs,
    p50Ms: latency.p50Ms,
    p95Ms: latency.p95Ms,
    shadowRerankPassCount: latency.shadowRerankPassCount,
    totalMs: latency.totalMs,
  };
}

function firstObservation(replay) {
  return replay.cases?.[0]?.observations?.[0] || null;
}

function qualitySnapshot(replay) {
  return {
    caseCount: replay.quality.caseCount,
    casePassRate: replay.quality.casePassRate,
    changedTopOneCount: replay.quality.changedTopOneCount,
    expectedTopOneCount: replay.quality.expectedTopOneCount,
    lexicalExpectedTopOneCount: replay.quality.lexicalExpectedTopOneCount,
    observationCount: replay.quality.observationCount,
    providerInputPreserved: replay.quality.providerInputPreserved,
    scenarioCount: replay.quality.scenarioCount,
  };
}

function buildEvidenceContent({
  cacheReplay,
  cacheSnapshot,
  observedAt,
  priorReplay,
  priorReplayBinding,
} = {}) {
  assertLocalRelevanceShadowReplay(cacheReplay);
  const priorBinding = priorReplay
    ? buildPriorReplayBinding(priorReplay)
    : normalizePriorReplayBinding(priorReplayBinding);
  const normalizedCache = normalizeCacheSnapshot(cacheSnapshot);
  const normalizedObservedAt = normalizeText(observedAt || cacheReplay.observedAt);
  if (!Number.isFinite(Date.parse(normalizedObservedAt))) {
    throw new Error('Local relevance shadow cache evidence requires a valid observedAt.');
  }

  const scoreRequestCount = countScoreRequests(cacheReplay);
  const uniqueScorePairCount = countUniqueScorePairs(cacheReplay);
  const cachedModelInferenceCount = normalizedCache.metrics.modelInferenceCount;
  const cacheHitCount = normalizedCache.metrics.hitCount + normalizedCache.metrics.inFlightHitCount;
  const baselineModelInferenceCount = priorBinding.latency.modelInferenceCount;
  const cachedScorer = firstObservation(cacheReplay)?.scorer || {};
  const qualityParity = JSON.stringify(qualitySnapshot(cacheReplay)) ===
    JSON.stringify(qualitySnapshot({ quality: priorBinding.quality }));
  const bindingPassed =
    cacheReplay.fixtureContract.contractHash === priorBinding.fixtureContractHash &&
    cacheReplay.priorShadowEvidence.id === priorBinding.priorShadowEvidenceId &&
    cacheReplay.queryContract === priorBinding.queryContract &&
    cacheReplay.runtime.modelDigest === priorBinding.runtime.modelDigest &&
    cacheReplay.runtime.modelId === priorBinding.runtime.modelId &&
    cacheReplay.runtime.version === priorBinding.runtime.version &&
    normalizedCache.binding.modelDigest === priorBinding.runtime.modelDigest &&
    normalizedCache.binding.modelId === priorBinding.runtime.modelId &&
    normalizedCache.binding.scorerId === priorBinding.scorer.id &&
    normalizedCache.binding.promptHash === priorBinding.scorer.promptHash &&
    normalizedCache.binding.promptVersion === priorBinding.scorer.promptVersion &&
    cachedScorer.id === priorBinding.scorer.id &&
    cachedScorer.modelId === priorBinding.scorer.modelId &&
    cachedScorer.promptHash === priorBinding.scorer.promptHash &&
    cachedScorer.promptVersion === priorBinding.scorer.promptVersion;
  const cacheContractPassed =
    normalizedCache.metrics.failureCount === 0 &&
    normalizedCache.metrics.evictionCount === 0 &&
    normalizedCache.metrics.requestCount === scoreRequestCount &&
    cacheReplay.latency.modelInferenceCount === scoreRequestCount &&
    cachedModelInferenceCount === uniqueScorePairCount &&
    cacheHitCount === scoreRequestCount - uniqueScorePairCount &&
    normalizedCache.completedEntryCount === uniqueScorePairCount;
  const validated =
    priorBinding.actualLocalRelevanceShadowReplayValidated === true &&
    priorBinding.status === 'multi-scenario-shadow-replay-passed-governance-blocked' &&
    priorBinding.quality.casePassRate === 1 &&
    cacheReplay.actualLocalRelevanceShadowReplayValidated === true &&
    cacheReplay.quality.providerInputPreserved === true &&
    qualityParity &&
    bindingPassed &&
    cacheContractPassed &&
    cachedModelInferenceCount < baselineModelInferenceCount &&
    cacheReplay.latency.totalMs < priorBinding.latency.totalMs;

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRelevanceShadowCacheQualified: false,
    actualLocalRelevanceShadowCacheValidated: validated,
    cacheReplay,
    cacheSnapshot: normalizedCache,
    comparison: {
      baselineLatency: latencySnapshot(priorBinding.latency),
      baselineModelInferenceCount,
      bindingPassed,
      cacheContractPassed,
      cacheHitCount,
      cacheHitRate: ratio(cacheHitCount, scoreRequestCount),
      cachedLatency: latencySnapshot(cacheReplay.latency),
      cachedModelInferenceCount,
      inferenceReductionCount: baselineModelInferenceCount - cachedModelInferenceCount,
      inferenceReductionRate: ratio(
        baselineModelInferenceCount - cachedModelInferenceCount,
        baselineModelInferenceCount,
      ),
      qualityParity,
      scoreRequestCount,
      totalLatencyReductionRate: ratio(
        priorBinding.latency.totalMs - cacheReplay.latency.totalMs,
        priorBinding.latency.totalMs,
      ),
      uniqueScorePairCount,
    },
    costFree: true,
    decision: validated ? 'hold-lexical-for-governance' : 'keep-lexical',
    externalProviderCalls: 'none',
    governance: {
      cacheLifecycleApproved: false,
      licenseApproved: false,
      osLevelEgressIsolationProven: false,
      productionLatencyApproved: false,
      rollbackOwnerApproved: false,
      runtimeActivationApproved: false,
    },
    observedAt: normalizedObservedAt,
    priorReplayBinding: priorBinding,
    productionReadyClaim: false,
    rollback: {
      cacheRemovalRequiresStateMigration: false,
      mode: 'lexical',
    },
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_SHADOW_CACHE_EVIDENCE_SCHEMA_VERSION,
    status: validated
      ? 'bounded-shadow-cache-passed-governance-blocked'
      : 'failed-keep-lexical',
  };
}

export function buildLocalRelevanceShadowCacheEvidence(input = {}) {
  const content = buildEvidenceContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-relevance-shadow-cache-evidence-${evidenceHash}`,
  };
}

export function assertLocalRelevanceShadowCacheEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    evidenceHash !== expectedHash ||
    id !== `local-relevance-shadow-cache-evidence-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildEvidenceContent({
      cacheReplay: evidence?.cacheReplay,
      cacheSnapshot: evidence?.cacheSnapshot,
      observedAt: evidence?.observedAt,
      priorReplayBinding: evidence?.priorReplayBinding,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  const expectedStatus = evidence?.actualLocalRelevanceShadowCacheValidated === true
    ? 'bounded-shadow-cache-passed-governance-blocked'
    : 'failed-keep-lexical';
  if (
    evidence?.actualLocalRelevanceShadowCacheQualified !== false ||
    evidence?.runtimeActivation !== false ||
    evidence?.productionReadyClaim !== false ||
    evidence?.externalProviderCalls !== 'none' ||
    evidence?.status !== expectedStatus
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(`Local relevance shadow cache evidence failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
