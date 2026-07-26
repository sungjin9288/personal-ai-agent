import { createHash } from 'node:crypto';

import { assertLocalRelevanceShadowCacheProcessIsolationEvidence } from './local-relevance-shadow-cache-process-isolation.mjs';

export const LOCAL_RELEVANCE_SHADOW_CACHE_TERMINATION_SOAK_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-shadow-cache-termination-soak/v1';

export const LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT = Object.freeze({
  capacity: 16,
  maxHeapGrowthBytes: 64 * 1024 * 1024,
  maxRssGrowthBytes: 128 * 1024 * 1024,
  pairCount: 48,
  replayCount: 16,
});

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isHash(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function buildPriorBinding(evidence) {
  assertLocalRelevanceShadowCacheProcessIsolationEvidence(evidence);
  const content = {
    cacheBinding: { ...evidence.priorLifecycleEvidenceBinding.cacheBinding },
    evidenceHash: normalizeText(evidence.evidenceHash),
    fixtureBinding: { ...evidence.fixtureBinding },
    id: normalizeText(evidence.id),
    runtime: { ...evidence.runtime },
    status: normalizeText(evidence.status),
    validated: evidence.actualLocalRelevanceShadowCacheProcessIsolationValidated === true,
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
    !isHash(content.evidenceHash) ||
    !isHash(content.cacheBinding?.bindingHash) ||
    !isHash(content.fixtureBinding?.fixtureHash) ||
    !isHash(content.fixtureBinding?.inputHash) ||
    !isHash(content.runtime?.modelDigest) ||
    content.validated !== true ||
    content.status !== 'cache-process-isolation-passed-governance-blocked'
  ) {
    throw new Error('Unsupported R15 cache process isolation evidence binding.');
  }
  return binding;
}

function assertMetrics(metrics = {}) {
  const fields = [
    'evictionCount',
    'failureCount',
    'hitCount',
    'inFlightHitCount',
    'invalidatedCompletedEntryCount',
    'invalidatedInFlightEntryCount',
    'invalidationCount',
    'missCount',
    'modelInferenceCount',
    'requestCount',
    'staleResultDropCount',
  ];
  for (const field of fields) {
    if (!Number.isInteger(metrics[field]) || metrics[field] < 0) {
      throw new Error(`R16 cache metric is invalid: ${field}.`);
    }
  }
  if (
    metrics.requestCount !== metrics.hitCount + metrics.inFlightHitCount + metrics.missCount ||
    metrics.modelInferenceCount !== metrics.missCount
  ) {
    throw new Error('R16 cache metrics are inconsistent.');
  }
}

function assertSnapshot(snapshot = {}, bindingHash) {
  const normalized = {
    binding: {
      bindingHash: normalizeText(snapshot.binding?.bindingHash),
      modelDigest: normalizeText(snapshot.binding?.modelDigest),
      modelId: normalizeText(snapshot.binding?.modelId),
      promptHash: normalizeText(snapshot.binding?.promptHash),
      promptVersion: normalizeText(snapshot.binding?.promptVersion),
      scorerId: normalizeText(snapshot.binding?.scorerId),
    },
    closed: snapshot.closed,
    completedEntryContentRetained: snapshot.completedEntryContentRetained,
    completedEntryCount: snapshot.completedEntryCount,
    externalProviderCalls: snapshot.externalProviderCalls,
    generation: snapshot.generation,
    lastInvalidationReason: snapshot.lastInvalidationReason ?? null,
    maxEntries: snapshot.maxEntries,
    metrics: {
      evictionCount: snapshot.metrics?.evictionCount,
      failureCount: snapshot.metrics?.failureCount,
      hitCount: snapshot.metrics?.hitCount,
      inFlightHitCount: snapshot.metrics?.inFlightHitCount,
      invalidatedCompletedEntryCount: snapshot.metrics?.invalidatedCompletedEntryCount,
      invalidatedInFlightEntryCount: snapshot.metrics?.invalidatedInFlightEntryCount,
      invalidationCount: snapshot.metrics?.invalidationCount,
      missCount: snapshot.metrics?.missCount,
      modelInferenceCount: snapshot.metrics?.modelInferenceCount,
      requestCount: snapshot.metrics?.requestCount,
      staleResultDropCount: snapshot.metrics?.staleResultDropCount,
    },
    pendingEntryCount: snapshot.pendingEntryCount,
    persistent: snapshot.persistent,
    productionReadyClaim: snapshot.productionReadyClaim,
    runtimeActivation: snapshot.runtimeActivation,
    schemaVersion: snapshot.schemaVersion,
    strategy: snapshot.strategy,
  };
  assertMetrics(normalized.metrics);
  if (
    normalized.schemaVersion !== 'personal-ai-agent-local-relevance-score-cache/v1' ||
    normalized.strategy !== 'bounded-process-local-lru' ||
    normalized.binding.bindingHash !== bindingHash ||
    !Number.isInteger(normalized.maxEntries) ||
    normalized.maxEntries <= 0 ||
    normalized.maxEntries > 4_096 ||
    !Number.isInteger(normalized.completedEntryCount) ||
    normalized.completedEntryCount < 0 ||
    normalized.completedEntryCount > normalized.maxEntries ||
    !Number.isInteger(normalized.pendingEntryCount) ||
    normalized.pendingEntryCount < 0 ||
    !Number.isInteger(normalized.generation) ||
    normalized.generation < 0 ||
    normalized.completedEntryContentRetained !== false ||
    normalized.externalProviderCalls !== 'none' ||
    normalized.persistent !== false ||
    normalized.productionReadyClaim !== false ||
    normalized.runtimeActivation !== false ||
    typeof normalized.closed !== 'boolean'
  ) {
    throw new Error('Unsupported R16 cache snapshot.');
  }
  return normalized;
}

function isEmptySnapshot(snapshot) {
  return (
    snapshot.closed === false &&
    snapshot.completedEntryCount === 0 &&
    snapshot.pendingEntryCount === 0 &&
    snapshot.generation === 0 &&
    snapshot.lastInvalidationReason === null &&
    Object.values(snapshot.metrics).every((value) => value === 0)
  );
}

function hasSafeEnvironment(worker) {
  return (
    worker.forwardedEnvironmentKeyCount === 0 &&
    worker.secretEnvironmentKeyFound === false &&
    Number.isInteger(worker.environmentKeyCount) &&
    Number.isInteger(worker.platformEnvironmentKeyCount) &&
    worker.environmentKeyCount === worker.platformEnvironmentKeyCount
  );
}

function normalizeForcedWorker(worker = {}, bindingHash) {
  const normalized = {
    cachedScore: Number(worker.cachedScore),
    environmentKeyCount: worker.environmentKeyCount,
    firstScore: Number(worker.firstScore),
    forwardedEnvironmentKeyCount: worker.forwardedEnvironmentKeyCount,
    inputHash: normalizeText(worker.inputHash),
    parentProcessIdentityHash: normalizeText(worker.parentProcessIdentityHash),
    platformEnvironmentKeyCount: worker.platformEnvironmentKeyCount,
    processIdentityHash: normalizeText(worker.processIdentityHash),
    secretEnvironmentKeyFound: worker.secretEnvironmentKeyFound,
    state: normalizeText(worker.state),
    warmCacheSnapshot: assertSnapshot(worker.warmCacheSnapshot, bindingHash),
    workerId: normalizeText(worker.workerId),
  };
  const metrics = normalized.warmCacheSnapshot.metrics;
  if (
    normalized.workerId !== 'forced-worker' ||
    normalized.state !== 'ready-for-termination' ||
    !isHash(normalized.inputHash) ||
    !isHash(normalized.parentProcessIdentityHash) ||
    !isHash(normalized.processIdentityHash) ||
    !Number.isInteger(normalized.firstScore) ||
    normalized.firstScore < 0 ||
    normalized.firstScore > 100 ||
    normalized.cachedScore !== normalized.firstScore ||
    !hasSafeEnvironment(normalized) ||
    normalized.warmCacheSnapshot.closed !== false ||
    normalized.warmCacheSnapshot.maxEntries !== 4 ||
    normalized.warmCacheSnapshot.completedEntryCount !== 1 ||
    metrics.requestCount !== 2 ||
    metrics.modelInferenceCount !== 1 ||
    metrics.hitCount !== 1 ||
    metrics.failureCount !== 0
  ) {
    throw new Error('R16 forced worker did not reach a valid warm state.');
  }
  return normalized;
}

function normalizeRecoveryWorker(worker = {}, bindingHash) {
  const normalized = {
    cachedScore: Number(worker.cachedScore),
    closedCacheSnapshot: assertSnapshot(worker.closedCacheSnapshot, bindingHash),
    environmentKeyCount: worker.environmentKeyCount,
    firstScore: Number(worker.firstScore),
    forwardedEnvironmentKeyCount: worker.forwardedEnvironmentKeyCount,
    initialCacheSnapshot: assertSnapshot(worker.initialCacheSnapshot, bindingHash),
    inputHash: normalizeText(worker.inputHash),
    parentProcessIdentityHash: normalizeText(worker.parentProcessIdentityHash),
    platformEnvironmentKeyCount: worker.platformEnvironmentKeyCount,
    postCloseScoreRejected: worker.postCloseScoreRejected,
    processIdentityHash: normalizeText(worker.processIdentityHash),
    secretEnvironmentKeyFound: worker.secretEnvironmentKeyFound,
    warmCacheSnapshot: assertSnapshot(worker.warmCacheSnapshot, bindingHash),
    workerId: normalizeText(worker.workerId),
  };
  const warmMetrics = normalized.warmCacheSnapshot.metrics;
  const closedMetrics = normalized.closedCacheSnapshot.metrics;
  if (
    normalized.workerId !== 'recovery-worker' ||
    !isHash(normalized.inputHash) ||
    !isHash(normalized.parentProcessIdentityHash) ||
    !isHash(normalized.processIdentityHash) ||
    !Number.isInteger(normalized.firstScore) ||
    normalized.firstScore < 0 ||
    normalized.firstScore > 100 ||
    normalized.cachedScore !== normalized.firstScore ||
    !hasSafeEnvironment(normalized) ||
    !isEmptySnapshot(normalized.initialCacheSnapshot) ||
    normalized.warmCacheSnapshot.completedEntryCount !== 1 ||
    warmMetrics.requestCount !== 2 ||
    warmMetrics.modelInferenceCount !== 1 ||
    warmMetrics.hitCount !== 1 ||
    normalized.closedCacheSnapshot.closed !== true ||
    normalized.closedCacheSnapshot.completedEntryCount !== 0 ||
    normalized.closedCacheSnapshot.lastInvalidationReason !== 'shutdown' ||
    closedMetrics.invalidationCount !== 1 ||
    normalized.postCloseScoreRejected !== true
  ) {
    throw new Error('R16 recovery worker did not start cold and close cleanly.');
  }
  return normalized;
}

function normalizeTermination(termination = {}) {
  const normalized = {
    exitCode: termination.exitCode ?? null,
    finalResultReceived: termination.finalResultReceived,
    observedSignal: normalizeText(termination.observedSignal),
    readyBeforeTermination: termination.readyBeforeTermination,
    requestedSignal: normalizeText(termination.requestedSignal),
    terminatedByParent: termination.terminatedByParent,
  };
  if (
    normalized.exitCode !== null ||
    normalized.finalResultReceived !== false ||
    normalized.observedSignal !== 'SIGKILL' ||
    normalized.readyBeforeTermination !== true ||
    normalized.requestedSignal !== 'SIGKILL' ||
    normalized.terminatedByParent !== true
  ) {
    throw new Error('R16 forced termination was not observed as SIGKILL.');
  }
  return normalized;
}

function normalizeMemorySample(sample = {}) {
  const normalized = {
    heapUsedBytes: sample.heapUsedBytes,
    rssBytes: sample.rssBytes,
  };
  if (
    !Number.isInteger(normalized.heapUsedBytes) ||
    normalized.heapUsedBytes <= 0 ||
    !Number.isInteger(normalized.rssBytes) ||
    normalized.rssBytes <= 0
  ) {
    throw new Error('R16 soak memory sample is invalid.');
  }
  return normalized;
}

function normalizeSoakWorker(worker = {}, bindingHash) {
  const normalized = {
    capacity: worker.capacity,
    closedCacheSnapshot: assertSnapshot(worker.closedCacheSnapshot, bindingHash),
    environmentKeyCount: worker.environmentKeyCount,
    finalMemory: normalizeMemorySample(worker.finalMemory),
    forwardedEnvironmentKeyCount: worker.forwardedEnvironmentKeyCount,
    heapGrowthBytes: worker.heapGrowthBytes,
    initialCacheSnapshot: assertSnapshot(worker.initialCacheSnapshot, bindingHash),
    inputHash: normalizeText(worker.inputHash),
    pairCount: worker.pairCount,
    parentProcessIdentityHash: normalizeText(worker.parentProcessIdentityHash),
    peakMemory: normalizeMemorySample(worker.peakMemory),
    platformEnvironmentKeyCount: worker.platformEnvironmentKeyCount,
    postCloseScoreRejected: worker.postCloseScoreRejected,
    processIdentityHash: normalizeText(worker.processIdentityHash),
    replayCount: worker.replayCount,
    rssGrowthBytes: worker.rssGrowthBytes,
    scoreMaximum: worker.scoreMaximum,
    scoreMinimum: worker.scoreMinimum,
    secretEnvironmentKeyFound: worker.secretEnvironmentKeyFound,
    saturatedCacheSnapshot: assertSnapshot(worker.saturatedCacheSnapshot, bindingHash),
    startMemory: normalizeMemorySample(worker.startMemory),
    workerId: normalizeText(worker.workerId),
  };
  const contract = LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT;
  const saturatedMetrics = normalized.saturatedCacheSnapshot.metrics;
  const closedMetrics = normalized.closedCacheSnapshot.metrics;
  const peakHeapGrowthBytes =
    normalized.peakMemory.heapUsedBytes - normalized.startMemory.heapUsedBytes;
  const peakRssGrowthBytes =
    normalized.peakMemory.rssBytes - normalized.startMemory.rssBytes;
  const finalHeapGrowthBytes = Math.max(
    0,
    normalized.finalMemory.heapUsedBytes - normalized.startMemory.heapUsedBytes,
  );
  const finalRssGrowthBytes = Math.max(
    0,
    normalized.finalMemory.rssBytes - normalized.startMemory.rssBytes,
  );
  if (
    normalized.workerId !== 'soak-worker' ||
    !isHash(normalized.inputHash) ||
    !isHash(normalized.parentProcessIdentityHash) ||
    !isHash(normalized.processIdentityHash) ||
    !hasSafeEnvironment(normalized) ||
    normalized.capacity !== contract.capacity ||
    normalized.pairCount !== contract.pairCount ||
    normalized.replayCount !== contract.replayCount ||
    !isEmptySnapshot(normalized.initialCacheSnapshot) ||
    normalized.saturatedCacheSnapshot.maxEntries !== contract.capacity ||
    normalized.saturatedCacheSnapshot.completedEntryCount !== contract.capacity ||
    saturatedMetrics.requestCount !== contract.pairCount + contract.replayCount ||
    saturatedMetrics.modelInferenceCount !== contract.pairCount ||
    saturatedMetrics.hitCount !== contract.replayCount ||
    saturatedMetrics.evictionCount !== contract.pairCount - contract.capacity ||
    saturatedMetrics.failureCount !== 0 ||
    normalized.closedCacheSnapshot.closed !== true ||
    normalized.closedCacheSnapshot.completedEntryCount !== 0 ||
    normalized.closedCacheSnapshot.lastInvalidationReason !== 'shutdown' ||
    closedMetrics.invalidatedCompletedEntryCount !== contract.capacity ||
    closedMetrics.invalidationCount !== 1 ||
    normalized.postCloseScoreRejected !== true ||
    !Number.isInteger(normalized.scoreMinimum) ||
    normalized.scoreMinimum < 0 ||
    !Number.isInteger(normalized.scoreMaximum) ||
    normalized.scoreMaximum > 100 ||
    normalized.scoreMinimum > normalized.scoreMaximum ||
    !Number.isInteger(normalized.heapGrowthBytes) ||
    normalized.heapGrowthBytes < 0 ||
    normalized.heapGrowthBytes !== finalHeapGrowthBytes ||
    normalized.heapGrowthBytes > contract.maxHeapGrowthBytes ||
    !Number.isInteger(normalized.rssGrowthBytes) ||
    normalized.rssGrowthBytes < 0 ||
    normalized.rssGrowthBytes !== finalRssGrowthBytes ||
    normalized.rssGrowthBytes > contract.maxRssGrowthBytes ||
    normalized.peakMemory.heapUsedBytes < normalized.startMemory.heapUsedBytes ||
    normalized.peakMemory.heapUsedBytes < normalized.finalMemory.heapUsedBytes ||
    normalized.peakMemory.rssBytes < normalized.startMemory.rssBytes ||
    normalized.peakMemory.rssBytes < normalized.finalMemory.rssBytes ||
    peakHeapGrowthBytes > contract.maxHeapGrowthBytes ||
    peakRssGrowthBytes > contract.maxRssGrowthBytes
  ) {
    throw new Error('R16 bounded cache soak contract failed.');
  }
  return normalized;
}

function buildContent({
  observedAt,
  priorProcessIsolationEvidence,
  priorProcessIsolationEvidenceBinding,
  soakWorker,
  terminationProbe,
} = {}) {
  const priorBinding = priorProcessIsolationEvidence
    ? buildPriorBinding(priorProcessIsolationEvidence)
    : normalizePriorBinding(priorProcessIsolationEvidenceBinding);
  const normalizedObservedAt = normalizeText(observedAt);
  if (!Number.isFinite(Date.parse(normalizedObservedAt))) {
    throw new Error('R16 termination and soak evidence requires a valid observedAt.');
  }
  const forcedWorker = normalizeForcedWorker(
    terminationProbe?.forcedWorker,
    priorBinding.cacheBinding.bindingHash,
  );
  const recoveryWorker = normalizeRecoveryWorker(
    terminationProbe?.recoveryWorker,
    priorBinding.cacheBinding.bindingHash,
  );
  const termination = normalizeTermination(terminationProbe?.termination);
  const soak = normalizeSoakWorker(soakWorker, priorBinding.cacheBinding.bindingHash);
  const processIdentityHashes = [
    forcedWorker.processIdentityHash,
    recoveryWorker.processIdentityHash,
    soak.processIdentityHash,
  ];
  const parentIdentityHashes = [
    forcedWorker.parentProcessIdentityHash,
    recoveryWorker.parentProcessIdentityHash,
    soak.parentProcessIdentityHash,
  ];
  const inputBindingPassed = [forcedWorker, recoveryWorker, soak]
    .every((worker) => worker.inputHash === priorBinding.fixtureBinding.inputHash);
  const processIsolationPassed =
    new Set(processIdentityHashes).size === processIdentityHashes.length &&
    new Set(parentIdentityHashes).size === 1;
  const forcedTerminationRecoveryPassed =
    termination.observedSignal === 'SIGKILL' &&
    recoveryWorker.firstScore === forcedWorker.firstScore &&
    recoveryWorker.warmCacheSnapshot.metrics.modelInferenceCount === 1;
  const peakHeapGrowthBytes = soak.peakMemory.heapUsedBytes - soak.startMemory.heapUsedBytes;
  const peakRssGrowthBytes = soak.peakMemory.rssBytes - soak.startMemory.rssBytes;
  const boundedSoakPassed =
    soak.heapGrowthBytes <= LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.maxHeapGrowthBytes &&
    soak.rssGrowthBytes <= LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.maxRssGrowthBytes &&
    peakHeapGrowthBytes <= LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.maxHeapGrowthBytes &&
    peakRssGrowthBytes <= LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.maxRssGrowthBytes;
  const validated =
    priorBinding.validated === true &&
    inputBindingPassed &&
    processIsolationPassed &&
    forcedTerminationRecoveryPassed &&
    boundedSoakPassed;

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRelevanceShadowCacheTerminationSoakQualified: false,
    actualLocalRelevanceShadowCacheTerminationSoakValidated: validated,
    costFree: true,
    decision: validated ? 'hold-lexical-for-governance' : 'keep-lexical',
    externalProviderCalls: 'none',
    observedAt: normalizedObservedAt,
    priorProcessIsolationEvidenceBinding: priorBinding,
    productionReadyClaim: false,
    results: {
      boundedSoakPassed,
      forcedTerminationRecoveryPassed,
      inputBindingPassed,
      processIsolationPassed,
    },
    rollback: {
      stateMigrationRequired: false,
      strategy: 'terminate-evaluation-workers-and-keep-lexical',
    },
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_SHADOW_CACHE_TERMINATION_SOAK_SCHEMA_VERSION,
    soakWorker: soak,
    status: validated
      ? 'cache-termination-soak-passed-governance-blocked'
      : 'failed-keep-lexical',
    terminationProbe: {
      forcedWorker,
      recoveryWorker,
      termination,
    },
  };
}

export function buildLocalRelevanceShadowCacheTerminationSoakEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-relevance-shadow-cache-termination-soak-${evidenceHash}`,
  };
}

export function assertLocalRelevanceShadowCacheTerminationSoakEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    evidenceHash !== expectedHash ||
    id !== `local-relevance-shadow-cache-termination-soak-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildContent({
      observedAt: evidence?.observedAt,
      priorProcessIsolationEvidenceBinding: evidence?.priorProcessIsolationEvidenceBinding,
      soakWorker: evidence?.soakWorker,
      terminationProbe: evidence?.terminationProbe,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  const expectedStatus = evidence?.actualLocalRelevanceShadowCacheTerminationSoakValidated === true
    ? 'cache-termination-soak-passed-governance-blocked'
    : 'failed-keep-lexical';
  if (
    evidence?.actualLocalRelevanceShadowCacheTerminationSoakQualified !== false ||
    evidence?.runtimeActivation !== false ||
    evidence?.productionReadyClaim !== false ||
    evidence?.externalProviderCalls !== 'none' ||
    evidence?.status !== expectedStatus
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(
      `Local relevance shadow cache termination soak failed: ${[...new Set(errors)].join(', ')}.`,
    );
  }
}
