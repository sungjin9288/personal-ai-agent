import { createHash } from 'node:crypto';

import { assertLocalRelevanceShadowCacheEvidence } from './local-relevance-shadow-cache-evidence.mjs';
import { assertLocalRelevanceShadowReplay } from './local-relevance-shadow-replay.mjs';

export const LOCAL_RELEVANCE_SHADOW_CACHE_LIFECYCLE_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-shadow-cache-lifecycle/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
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

function buildPriorBinding(evidence) {
  assertLocalRelevanceShadowCacheEvidence(evidence);
  const content = {
    cacheBinding: { ...evidence.cacheSnapshot.binding },
    cacheReplayHash: normalizeText(evidence.cacheReplay.replayHash),
    comparison: { ...evidence.comparison },
    evidenceHash: normalizeText(evidence.evidenceHash),
    id: normalizeText(evidence.id),
    quality: qualitySnapshot(evidence.cacheReplay),
  };
  return {
    ...content,
    bindingHash: hashRecord(content),
  };
}

function normalizePriorBinding(binding = {}) {
  const { bindingHash, ...content } = binding;
  if (
    bindingHash !== hashRecord(content) ||
    !content.id ||
    !/^[a-f0-9]{64}$/.test(content.evidenceHash) ||
    !/^[a-f0-9]{64}$/.test(content.cacheReplayHash) ||
    !/^[a-f0-9]{64}$/.test(content.cacheBinding?.bindingHash)
  ) {
    throw new Error('Unsupported R13 shadow cache evidence binding.');
  }
  return binding;
}

function assertCacheSnapshot(snapshot, { lifecycle = false } = {}) {
  const metrics = snapshot?.metrics || {};
  if (
    snapshot?.schemaVersion !== 'personal-ai-agent-local-relevance-score-cache/v1' ||
    snapshot?.strategy !== 'bounded-process-local-lru' ||
    !Number.isInteger(snapshot?.maxEntries) ||
    snapshot.maxEntries <= 0 ||
    snapshot.maxEntries > 4_096 ||
    !Number.isInteger(snapshot?.completedEntryCount) ||
    snapshot.completedEntryCount < 0 ||
    snapshot.completedEntryCount > snapshot.maxEntries ||
    snapshot?.completedEntryContentRetained !== false ||
    snapshot?.persistent !== false ||
    snapshot?.runtimeActivation !== false ||
    snapshot?.productionReadyClaim !== false ||
    snapshot?.externalProviderCalls !== 'none'
  ) {
    throw new Error('Unsupported R14 score cache snapshot.');
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
      throw new Error(`R14 score cache metric is invalid: ${field}.`);
    }
  }
  if (
    metrics.requestCount !== metrics.hitCount + metrics.inFlightHitCount + metrics.missCount ||
    metrics.modelInferenceCount !== metrics.missCount
  ) {
    throw new Error('R14 score cache metrics are inconsistent.');
  }
  if (lifecycle) {
    for (const field of [
      'invalidatedCompletedEntryCount',
      'invalidatedInFlightEntryCount',
      'invalidationCount',
      'staleResultDropCount',
    ]) {
      if (!Number.isInteger(metrics[field]) || metrics[field] < 0) {
        throw new Error(`R14 lifecycle metric is invalid: ${field}.`);
      }
    }
    if (!Number.isInteger(snapshot.generation) || snapshot.generation < 0) {
      throw new Error('R14 cache generation is invalid.');
    }
  }
}

function normalizeLifecycleProbe(probe = {}) {
  for (const snapshot of [
    probe.beforeInvalidation,
    probe.afterInvalidation,
    probe.afterRefill,
    probe.afterClose,
  ]) {
    assertCacheSnapshot(snapshot, { lifecycle: true });
  }
  if (
    probe.concurrentScoreParity !== true ||
    probe.refillScoreParity !== true ||
    probe.postCloseScoreRejected !== true ||
    probe.beforeInvalidation.metrics.requestCount !== 3 ||
    probe.beforeInvalidation.metrics.modelInferenceCount !== 1 ||
    probe.beforeInvalidation.metrics.inFlightHitCount !== 2 ||
    probe.beforeInvalidation.pendingEntryCount !== 1 ||
    probe.afterInvalidation.completedEntryCount !== 0 ||
    probe.afterInvalidation.pendingEntryCount !== 0 ||
    probe.afterInvalidation.metrics.invalidationCount !== 1 ||
    probe.afterInvalidation.metrics.invalidatedInFlightEntryCount !== 1 ||
    probe.afterInvalidation.lastInvalidationReason !== 'model-or-prompt-replaced' ||
    probe.afterRefill.metrics.requestCount !== 5 ||
    probe.afterRefill.metrics.modelInferenceCount !== 2 ||
    probe.afterRefill.metrics.hitCount !== 1 ||
    probe.afterRefill.metrics.staleResultDropCount !== 1 ||
    probe.afterRefill.completedEntryCount !== 1 ||
    probe.afterClose.closed !== true ||
    probe.afterClose.completedEntryCount !== 0 ||
    probe.afterClose.metrics.invalidationCount !== 2 ||
    probe.afterClose.lastInvalidationReason !== 'rollback'
  ) {
    throw new Error('R14 lifecycle probe did not preserve the invalidation contract.');
  }
  return probe;
}

function buildContent({
  lifecycleProbe,
  observedAt,
  priorCacheEvidence,
  priorCacheEvidenceBinding,
  stressCacheSnapshot,
  stressReplay,
} = {}) {
  assertLocalRelevanceShadowReplay(stressReplay);
  assertCacheSnapshot(stressCacheSnapshot, { lifecycle: true });
  const priorBinding = priorCacheEvidence
    ? buildPriorBinding(priorCacheEvidence)
    : normalizePriorBinding(priorCacheEvidenceBinding);
  const probe = normalizeLifecycleProbe(lifecycleProbe);
  const normalizedObservedAt = normalizeText(observedAt || stressReplay.observedAt);
  if (!Number.isFinite(Date.parse(normalizedObservedAt))) {
    throw new Error('R14 lifecycle evidence requires a valid observedAt.');
  }

  const stressScorer = firstObservation(stressReplay)?.scorer || {};
  const bindingPassed =
    stressReplay.replayHash !== priorBinding.cacheReplayHash &&
    stressReplay.runtime.modelDigest === priorBinding.cacheBinding.modelDigest &&
    stressReplay.runtime.modelId === priorBinding.cacheBinding.modelId &&
    stressScorer.id === priorBinding.cacheBinding.scorerId &&
    stressScorer.promptHash === priorBinding.cacheBinding.promptHash &&
    stressScorer.promptVersion === priorBinding.cacheBinding.promptVersion &&
    stressCacheSnapshot.binding.bindingHash === priorBinding.cacheBinding.bindingHash;
  const qualityParity =
    JSON.stringify(qualitySnapshot(stressReplay)) === JSON.stringify(priorBinding.quality);
  const stressContractPassed =
    stressCacheSnapshot.maxEntries === 8 &&
    stressCacheSnapshot.completedEntryCount === 8 &&
    stressCacheSnapshot.metrics.requestCount === 120 &&
    stressCacheSnapshot.metrics.modelInferenceCount === 30 &&
    stressCacheSnapshot.metrics.hitCount === 90 &&
    stressCacheSnapshot.metrics.inFlightHitCount === 0 &&
    stressCacheSnapshot.metrics.evictionCount === 22 &&
    stressCacheSnapshot.metrics.failureCount === 0 &&
    stressCacheSnapshot.metrics.invalidationCount === 0 &&
    stressCacheSnapshot.metrics.staleResultDropCount === 0;
  const lifecycleContractPassed =
    probe.afterClose.closed === true &&
    probe.afterClose.metrics.staleResultDropCount === 1 &&
    probe.afterClose.metrics.invalidatedInFlightEntryCount === 1;
  const validated =
    stressReplay.actualLocalRelevanceShadowReplayValidated === true &&
    stressReplay.quality.providerInputPreserved === true &&
    bindingPassed &&
    qualityParity &&
    stressContractPassed &&
    lifecycleContractPassed;

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRelevanceShadowCacheLifecycleQualified: false,
    actualLocalRelevanceShadowCacheLifecycleValidated: validated,
    costFree: true,
    decision: validated ? 'hold-lexical-for-governance' : 'keep-lexical',
    externalProviderCalls: 'none',
    lifecycleProbe: probe,
    observedAt: normalizedObservedAt,
    priorCacheEvidenceBinding: priorBinding,
    productionReadyClaim: false,
    rollback: {
      cacheClosed: probe.afterClose.closed === true,
      stateMigrationRequired: false,
      strategy: 'remove-cache-wrapper-and-keep-lexical',
    },
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_SHADOW_CACHE_LIFECYCLE_SCHEMA_VERSION,
    status: validated
      ? 'shadow-cache-lifecycle-passed-governance-blocked'
      : 'failed-keep-lexical',
    stress: {
      bindingPassed,
      cacheSnapshot: stressCacheSnapshot,
      evictionCount: stressCacheSnapshot.metrics.evictionCount,
      lifecycleContractPassed,
      qualityParity,
      stressContractPassed,
      stressReplay,
    },
  };
}

export function buildLocalRelevanceShadowCacheLifecycleEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-relevance-shadow-cache-lifecycle-${evidenceHash}`,
  };
}

export function assertLocalRelevanceShadowCacheLifecycleEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (evidenceHash !== expectedHash || id !== `local-relevance-shadow-cache-lifecycle-${expectedHash}`) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildContent({
      lifecycleProbe: evidence?.lifecycleProbe,
      observedAt: evidence?.observedAt,
      priorCacheEvidenceBinding: evidence?.priorCacheEvidenceBinding,
      stressCacheSnapshot: evidence?.stress?.cacheSnapshot,
      stressReplay: evidence?.stress?.stressReplay,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  const expectedStatus = evidence?.actualLocalRelevanceShadowCacheLifecycleValidated === true
    ? 'shadow-cache-lifecycle-passed-governance-blocked'
    : 'failed-keep-lexical';
  if (
    evidence?.actualLocalRelevanceShadowCacheLifecycleQualified !== false ||
    evidence?.runtimeActivation !== false ||
    evidence?.productionReadyClaim !== false ||
    evidence?.externalProviderCalls !== 'none' ||
    evidence?.status !== expectedStatus
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(`Local relevance shadow cache lifecycle failed: ${[...new Set(errors)].join(', ')}.`);
  }
}
