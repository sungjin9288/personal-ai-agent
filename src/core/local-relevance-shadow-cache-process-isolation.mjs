import { createHash } from 'node:crypto';

import { assertLocalRelevanceShadowCacheLifecycleEvidence } from './local-relevance-shadow-cache-lifecycle.mjs';

export const LOCAL_RELEVANCE_SHADOW_CACHE_PROCESS_ISOLATION_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-shadow-cache-process-isolation/v1';

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashText(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function isHash(value) {
  return /^[a-f0-9]{64}$/.test(normalizeText(value));
}

function normalizeCacheBinding(binding = {}) {
  const content = {
    modelDigest: normalizeText(binding.modelDigest),
    modelId: normalizeText(binding.modelId),
    promptHash: normalizeText(binding.promptHash),
    promptVersion: normalizeText(binding.promptVersion),
    scorerId: normalizeText(binding.scorerId),
  };
  const bindingHash = normalizeText(binding.bindingHash);
  if (
    !isHash(content.modelDigest) ||
    !content.modelId ||
    !isHash(content.promptHash) ||
    !content.promptVersion ||
    !content.scorerId ||
    bindingHash !== hashRecord(content)
  ) {
    throw new Error('R15 process isolation cache binding is invalid.');
  }
  return { ...content, bindingHash };
}

export function buildLocalRelevanceCacheInputHash({ documentText, queryText } = {}) {
  return hashRecord({
    documentHash: hashText(documentText),
    queryHash: hashText(queryText),
  });
}

function buildPriorBinding(evidence) {
  assertLocalRelevanceShadowCacheLifecycleEvidence(evidence);
  const content = {
    cacheBinding: { ...evidence.stress.cacheSnapshot.binding },
    evidenceHash: normalizeText(evidence.evidenceHash),
    id: normalizeText(evidence.id),
    status: normalizeText(evidence.status),
    validated: evidence.actualLocalRelevanceShadowCacheLifecycleValidated === true,
  };
  return {
    ...content,
    bindingHash: hashRecord(content),
  };
}

function normalizePriorBinding(binding = {}) {
  const { bindingHash, ...content } = binding;
  const normalizedContent = {
    cacheBinding: normalizeCacheBinding(content.cacheBinding),
    evidenceHash: normalizeText(content.evidenceHash),
    id: normalizeText(content.id),
    status: normalizeText(content.status),
    validated: content.validated,
  };
  if (
    bindingHash !== hashRecord(normalizedContent) ||
    !normalizedContent.id ||
    !isHash(normalizedContent.evidenceHash) ||
    normalizedContent.validated !== true ||
    normalizedContent.status !== 'shadow-cache-lifecycle-passed-governance-blocked'
  ) {
    throw new Error('Unsupported R14 cache lifecycle evidence binding.');
  }
  return { ...normalizedContent, bindingHash };
}

function normalizeFixtureBinding(binding = {}) {
  const normalized = {
    fixtureHash: normalizeText(binding.fixtureHash),
    inputHash: normalizeText(binding.inputHash),
    queryId: normalizeText(binding.queryId),
    scenarioId: normalizeText(binding.scenarioId),
  };
  if (
    !isHash(normalized.fixtureHash) ||
    !isHash(normalized.inputHash) ||
    !normalized.queryId ||
    !normalized.scenarioId
  ) {
    throw new Error('R15 process isolation requires a complete fixture binding.');
  }
  return normalized;
}

function normalizeRuntime(runtime = {}) {
  const normalized = {
    adapter: normalizeText(runtime.adapter),
    cloudFeaturesDisabled: runtime.cloudFeaturesDisabled,
    modelDigest: normalizeText(runtime.modelDigest),
    modelId: normalizeText(runtime.modelId),
    runtimeVersion: normalizeText(runtime.runtimeVersion),
    transport: normalizeText(runtime.transport),
  };
  if (
    normalized.adapter !== 'ollama-independent-score' ||
    normalized.cloudFeaturesDisabled !== true ||
    !isHash(normalized.modelDigest) ||
    !normalized.modelId ||
    !normalized.runtimeVersion ||
    normalized.transport !== 'loopback-http'
  ) {
    throw new Error('R15 process isolation requires a complete local runtime binding.');
  }
  return normalized;
}

function normalizeMetrics(metrics = {}) {
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
  const normalized = {};
  for (const field of fields) {
    if (!Number.isInteger(metrics[field]) || metrics[field] < 0) {
      throw new Error(`R15 process cache metric is invalid: ${field}.`);
    }
    normalized[field] = metrics[field];
  }
  if (
    normalized.requestCount !==
      normalized.hitCount + normalized.inFlightHitCount + normalized.missCount ||
    normalized.modelInferenceCount !== normalized.missCount
  ) {
    throw new Error('R15 process cache metrics are inconsistent.');
  }
  return normalized;
}

function normalizeSnapshot(snapshot = {}) {
  const normalized = {
    binding: normalizeCacheBinding(snapshot.binding),
    closed: snapshot.closed,
    completedEntryContentRetained: snapshot.completedEntryContentRetained,
    completedEntryCount: snapshot.completedEntryCount,
    externalProviderCalls: snapshot.externalProviderCalls,
    generation: snapshot.generation,
    lastInvalidationReason: snapshot.lastInvalidationReason ?? null,
    maxEntries: snapshot.maxEntries,
    metrics: normalizeMetrics(snapshot.metrics),
    pendingEntryCount: snapshot.pendingEntryCount,
    persistent: snapshot.persistent,
    productionReadyClaim: snapshot.productionReadyClaim,
    runtimeActivation: snapshot.runtimeActivation,
    schemaVersion: snapshot.schemaVersion,
    strategy: snapshot.strategy,
  };
  if (
    normalized.schemaVersion !== 'personal-ai-agent-local-relevance-score-cache/v1' ||
    normalized.strategy !== 'bounded-process-local-lru' ||
    !isHash(normalized.binding.bindingHash) ||
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
    throw new Error('Unsupported R15 process cache snapshot.');
  }
  return normalized;
}

function isZeroMetrics(metrics) {
  return Object.values(metrics).every((value) => value === 0);
}

function workerContractPassed(worker) {
  const initial = worker.initialCacheSnapshot;
  const warm = worker.warmCacheSnapshot;
  const closed = worker.closedCacheSnapshot;
  return (
    worker.firstScore === worker.cachedScore &&
    worker.postCloseScoreRejected === true &&
    worker.forwardedEnvironmentKeyCount === 0 &&
    worker.environmentKeyCount === worker.platformEnvironmentKeyCount &&
    worker.secretEnvironmentKeyFound === false &&
    initial.closed === false &&
    initial.completedEntryCount === 0 &&
    initial.pendingEntryCount === 0 &&
    initial.generation === 0 &&
    initial.lastInvalidationReason === null &&
    isZeroMetrics(initial.metrics) &&
    warm.closed === false &&
    warm.completedEntryCount === 1 &&
    warm.pendingEntryCount === 0 &&
    warm.generation === 0 &&
    warm.lastInvalidationReason === null &&
    warm.metrics.requestCount === 2 &&
    warm.metrics.missCount === 1 &&
    warm.metrics.modelInferenceCount === 1 &&
    warm.metrics.hitCount === 1 &&
    warm.metrics.inFlightHitCount === 0 &&
    warm.metrics.failureCount === 0 &&
    warm.metrics.evictionCount === 0 &&
    warm.metrics.invalidationCount === 0 &&
    warm.metrics.staleResultDropCount === 0 &&
    closed.closed === true &&
    closed.completedEntryCount === 0 &&
    closed.pendingEntryCount === 0 &&
    closed.generation === 1 &&
    closed.lastInvalidationReason === 'shutdown' &&
    closed.metrics.requestCount === 2 &&
    closed.metrics.modelInferenceCount === 1 &&
    closed.metrics.hitCount === 1 &&
    closed.metrics.invalidationCount === 1 &&
    closed.metrics.invalidatedCompletedEntryCount === 1 &&
    closed.metrics.invalidatedInFlightEntryCount === 0 &&
    closed.metrics.staleResultDropCount === 0
  );
}

function normalizeWorker(worker = {}) {
  const normalized = {
    cachedScore: Number(worker.cachedScore),
    closedCacheSnapshot: normalizeSnapshot(worker.closedCacheSnapshot),
    environmentKeyCount: worker.environmentKeyCount,
    firstScore: Number(worker.firstScore),
    forwardedEnvironmentKeyCount: worker.forwardedEnvironmentKeyCount,
    initialCacheSnapshot: normalizeSnapshot(worker.initialCacheSnapshot),
    inputHash: normalizeText(worker.inputHash),
    parentProcessIdentityHash: normalizeText(worker.parentProcessIdentityHash),
    platformEnvironmentKeyCount: worker.platformEnvironmentKeyCount,
    postCloseScoreRejected: worker.postCloseScoreRejected,
    processIdentityHash: normalizeText(worker.processIdentityHash),
    secretEnvironmentKeyFound: worker.secretEnvironmentKeyFound,
    warmCacheSnapshot: normalizeSnapshot(worker.warmCacheSnapshot),
    workerId: normalizeText(worker.workerId),
  };
  if (
    !Number.isInteger(normalized.firstScore) ||
    normalized.firstScore < 0 ||
    normalized.firstScore > 100 ||
    !Number.isInteger(normalized.cachedScore) ||
    normalized.cachedScore < 0 ||
    normalized.cachedScore > 100 ||
    !Number.isInteger(normalized.environmentKeyCount) ||
    normalized.environmentKeyCount < 0 ||
    !Number.isInteger(normalized.forwardedEnvironmentKeyCount) ||
    normalized.forwardedEnvironmentKeyCount < 0 ||
    !Number.isInteger(normalized.platformEnvironmentKeyCount) ||
    normalized.platformEnvironmentKeyCount < 0 ||
    !isHash(normalized.inputHash) ||
    !isHash(normalized.parentProcessIdentityHash) ||
    !isHash(normalized.processIdentityHash) ||
    !normalized.workerId
  ) {
    throw new Error('R15 process worker result is malformed.');
  }
  return {
    ...normalized,
    contractPassed: workerContractPassed(normalized),
  };
}

function normalizeProbe(probe = {}) {
  const concurrentWorkers = Array.isArray(probe.concurrentWorkers)
    ? probe.concurrentWorkers.map(normalizeWorker)
    : [];
  if (concurrentWorkers.length !== 2) {
    throw new Error('R15 process isolation requires two concurrent workers.');
  }
  return {
    cloudFeaturesDisabled: probe.cloudFeaturesDisabled,
    concurrentWorkers,
    environmentForwarding: normalizeText(probe.environmentForwarding),
    processBoundary: normalizeText(probe.processBoundary),
    restartedWorker: normalizeWorker(probe.restartedWorker),
    restartOfWorkerId: normalizeText(probe.restartOfWorkerId),
    runIdHash: normalizeText(probe.runIdHash),
  };
}

function buildContent({
  fixtureBinding,
  observedAt,
  priorLifecycleEvidence,
  priorLifecycleEvidenceBinding,
  processProbe,
  runtime,
} = {}) {
  const priorBinding = priorLifecycleEvidence
    ? buildPriorBinding(priorLifecycleEvidence)
    : normalizePriorBinding(priorLifecycleEvidenceBinding);
  const fixture = normalizeFixtureBinding(fixtureBinding);
  const probe = normalizeProbe(processProbe);
  const localRuntime = normalizeRuntime(runtime);
  const normalizedObservedAt = normalizeText(observedAt);
  if (!Number.isFinite(Date.parse(normalizedObservedAt))) {
    throw new Error('R15 process isolation evidence requires a valid observedAt.');
  }
  if (!isHash(probe.runIdHash)) {
    throw new Error('R15 process isolation evidence requires a run id hash.');
  }

  const workers = [...probe.concurrentWorkers, probe.restartedWorker];
  const identities = new Set(workers.map((worker) => worker.processIdentityHash));
  const parents = new Set(workers.map((worker) => worker.parentProcessIdentityHash));
  const scores = new Set(workers.map((worker) => worker.firstScore));
  const bindings = new Set(
    workers.flatMap((worker) => [
      worker.initialCacheSnapshot.binding.bindingHash,
      worker.warmCacheSnapshot.binding.bindingHash,
      worker.closedCacheSnapshot.binding.bindingHash,
    ]),
  );
  const workerContractsPassed = workers.every((worker) => worker.contractPassed);
  const workerIsolationPassed =
    probe.processBoundary === 'node-child-process' &&
    probe.environmentForwarding === 'none' &&
    probe.cloudFeaturesDisabled === true &&
    probe.concurrentWorkers[0].workerId === 'worker-a' &&
    probe.concurrentWorkers[1].workerId === 'worker-b' &&
    identities.size === workers.length &&
    parents.size === 1;
  const restartColdStartPassed =
    probe.restartOfWorkerId === 'worker-a' &&
    probe.restartedWorker.workerId === 'worker-a-restarted' &&
    probe.restartedWorker.warmCacheSnapshot.metrics.modelInferenceCount === 1 &&
    probe.restartedWorker.warmCacheSnapshot.metrics.hitCount === 1;
  const bindingPassed =
    bindings.size === 1 &&
    bindings.has(priorBinding.cacheBinding.bindingHash) &&
    localRuntime.modelDigest === priorBinding.cacheBinding.modelDigest &&
    localRuntime.modelId === priorBinding.cacheBinding.modelId;
  const inputBindingPassed = workers.every((worker) => worker.inputHash === fixture.inputHash);
  const scoreParityPassed = scores.size === 1;
  const validated =
    priorBinding.validated === true &&
    workerContractsPassed &&
    workerIsolationPassed &&
    restartColdStartPassed &&
    bindingPassed &&
    inputBindingPassed &&
    scoreParityPassed;

  return {
    activation: {
      authorized: false,
      status: 'blocked',
    },
    actualLocalRelevanceShadowCacheProcessIsolationQualified: false,
    actualLocalRelevanceShadowCacheProcessIsolationValidated: validated,
    costFree: true,
    decision: validated ? 'hold-lexical-for-governance' : 'keep-lexical',
    externalProviderCalls: 'none',
    fixtureBinding: fixture,
    observedAt: normalizedObservedAt,
    priorLifecycleEvidenceBinding: priorBinding,
    processProbe: probe,
    productionReadyClaim: false,
    results: {
      bindingPassed,
      inputBindingPassed,
      restartColdStartPassed,
      scoreParityPassed,
      workerContractsPassed,
      workerIsolationPassed,
    },
    rollback: {
      stateMigrationRequired: false,
      strategy: 'stop-child-processes-and-keep-lexical',
    },
    runtime: localRuntime,
    runtimeActivation: false,
    schemaVersion: LOCAL_RELEVANCE_SHADOW_CACHE_PROCESS_ISOLATION_SCHEMA_VERSION,
    status: validated
      ? 'cache-process-isolation-passed-governance-blocked'
      : 'failed-keep-lexical',
  };
}

export function buildLocalRelevanceShadowCacheProcessIsolationEvidence(input = {}) {
  const content = buildContent(input);
  const evidenceHash = hashRecord(content);
  return {
    ...content,
    evidenceHash,
    id: `local-relevance-shadow-cache-process-isolation-${evidenceHash}`,
  };
}

export function assertLocalRelevanceShadowCacheProcessIsolationEvidence(evidence) {
  const { evidenceHash, id, ...content } = evidence || {};
  const expectedHash = hashRecord(content);
  const errors = [];
  if (
    evidenceHash !== expectedHash ||
    id !== `local-relevance-shadow-cache-process-isolation-${expectedHash}`
  ) {
    errors.push('integrity');
  }
  try {
    const rebuilt = buildContent({
      fixtureBinding: evidence?.fixtureBinding,
      observedAt: evidence?.observedAt,
      priorLifecycleEvidenceBinding: evidence?.priorLifecycleEvidenceBinding,
      processProbe: evidence?.processProbe,
      runtime: evidence?.runtime,
    });
    if (JSON.stringify(content) !== JSON.stringify(rebuilt)) {
      errors.push('contract');
    }
  } catch (error) {
    errors.push(`contract:${error.message}`);
  }
  const expectedStatus = evidence?.actualLocalRelevanceShadowCacheProcessIsolationValidated === true
    ? 'cache-process-isolation-passed-governance-blocked'
    : 'failed-keep-lexical';
  if (
    evidence?.actualLocalRelevanceShadowCacheProcessIsolationQualified !== false ||
    evidence?.runtimeActivation !== false ||
    evidence?.productionReadyClaim !== false ||
    evidence?.externalProviderCalls !== 'none' ||
    evidence?.status !== expectedStatus
  ) {
    errors.push('claim-boundary');
  }
  if (errors.length) {
    throw new Error(
      `Local relevance shadow cache process isolation failed: ${[...new Set(errors)].join(', ')}.`,
    );
  }
}
