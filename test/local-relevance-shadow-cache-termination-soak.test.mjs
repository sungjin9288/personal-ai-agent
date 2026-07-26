import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalRelevanceShadowCacheTerminationSoakEvidence,
  buildLocalRelevanceShadowCacheTerminationSoakEvidence,
  LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT,
} from '../src/core/local-relevance-shadow-cache-termination-soak.mjs';

const priorEvidence = JSON.parse(
  fs.readFileSync('evidence/output-artifacts/local-relevance-shadow-cache-process-isolation.json'),
);
const binding = priorEvidence.priorLifecycleEvidenceBinding.cacheBinding;
const inputHash = priorEvidence.fixtureBinding.inputHash;

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function metrics(overrides = {}) {
  return {
    evictionCount: 0,
    failureCount: 0,
    hitCount: 0,
    inFlightHitCount: 0,
    invalidatedCompletedEntryCount: 0,
    invalidatedInFlightEntryCount: 0,
    invalidationCount: 0,
    missCount: 0,
    modelInferenceCount: 0,
    requestCount: 0,
    staleResultDropCount: 0,
    ...overrides,
  };
}

function snapshot({ capacity = 4, closed = false, entries = 0, metricValues } = {}) {
  return {
    binding: { ...binding },
    closed,
    completedEntryContentRetained: false,
    completedEntryCount: entries,
    externalProviderCalls: 'none',
    generation: closed ? 1 : 0,
    lastInvalidationReason: closed ? 'shutdown' : null,
    maxEntries: capacity,
    metrics: metrics(metricValues),
    pendingEntryCount: 0,
    persistent: false,
    productionReadyClaim: false,
    runtimeActivation: false,
    schemaVersion: 'personal-ai-agent-local-relevance-score-cache/v1',
    strategy: 'bounded-process-local-lru',
  };
}

function environment() {
  return {
    environmentKeyCount: 1,
    forwardedEnvironmentKeyCount: 0,
    platformEnvironmentKeyCount: 1,
    secretEnvironmentKeyFound: false,
  };
}

function forcedWorker() {
  return {
    cachedScore: 90,
    ...environment(),
    firstScore: 90,
    inputHash,
    parentProcessIdentityHash: hash('parent'),
    processIdentityHash: hash('forced'),
    state: 'ready-for-termination',
    warmCacheSnapshot: snapshot({
      entries: 1,
      metricValues: {
        hitCount: 1,
        missCount: 1,
        modelInferenceCount: 1,
        requestCount: 2,
      },
    }),
    workerId: 'forced-worker',
  };
}

function recoveryWorker() {
  return {
    cachedScore: 90,
    closedCacheSnapshot: snapshot({
      closed: true,
      metricValues: {
        hitCount: 1,
        invalidatedCompletedEntryCount: 1,
        invalidationCount: 1,
        missCount: 1,
        modelInferenceCount: 1,
        requestCount: 2,
      },
    }),
    ...environment(),
    firstScore: 90,
    initialCacheSnapshot: snapshot(),
    inputHash,
    parentProcessIdentityHash: hash('parent'),
    postCloseScoreRejected: true,
    processIdentityHash: hash('recovery'),
    warmCacheSnapshot: snapshot({
      entries: 1,
      metricValues: {
        hitCount: 1,
        missCount: 1,
        modelInferenceCount: 1,
        requestCount: 2,
      },
    }),
    workerId: 'recovery-worker',
  };
}

function soakWorker() {
  const contract = LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT;
  return {
    capacity: contract.capacity,
    closedCacheSnapshot: snapshot({
      capacity: contract.capacity,
      closed: true,
      metricValues: {
        evictionCount: contract.pairCount - contract.capacity,
        hitCount: contract.replayCount,
        invalidatedCompletedEntryCount: contract.capacity,
        invalidationCount: 1,
        missCount: contract.pairCount,
        modelInferenceCount: contract.pairCount,
        requestCount: contract.pairCount + contract.replayCount,
      },
    }),
    ...environment(),
    finalMemory: { heapUsedBytes: 14_000_000, rssBytes: 72_000_000 },
    heapGrowthBytes: 4_000_000,
    initialCacheSnapshot: snapshot({ capacity: contract.capacity }),
    inputHash,
    pairCount: contract.pairCount,
    parentProcessIdentityHash: hash('parent'),
    peakMemory: { heapUsedBytes: 18_000_000, rssBytes: 80_000_000 },
    postCloseScoreRejected: true,
    processIdentityHash: hash('soak'),
    replayCount: contract.replayCount,
    rssGrowthBytes: 8_000_000,
    saturatedCacheSnapshot: snapshot({
      capacity: contract.capacity,
      entries: contract.capacity,
      metricValues: {
        evictionCount: contract.pairCount - contract.capacity,
        hitCount: contract.replayCount,
        missCount: contract.pairCount,
        modelInferenceCount: contract.pairCount,
        requestCount: contract.pairCount + contract.replayCount,
      },
    }),
    scoreMaximum: 95,
    scoreMinimum: 5,
    startMemory: { heapUsedBytes: 10_000_000, rssBytes: 64_000_000 },
    workerId: 'soak-worker',
  };
}

function buildEvidence({ soak = soakWorker(), termination = {} } = {}) {
  return buildLocalRelevanceShadowCacheTerminationSoakEvidence({
    observedAt: '2026-07-17T00:00:00.000Z',
    priorProcessIsolationEvidence: priorEvidence,
    soakWorker: soak,
    terminationProbe: {
      forcedWorker: forcedWorker(),
      recoveryWorker: recoveryWorker(),
      termination: {
        exitCode: null,
        finalResultReceived: false,
        observedSignal: 'SIGKILL',
        readyBeforeTermination: true,
        requestedSignal: 'SIGKILL',
        terminatedByParent: true,
        ...termination,
      },
    },
  });
}

test('termination soak evidence proves SIGKILL recovery and bounded cache pressure', () => {
  const evidence = buildEvidence();

  assertLocalRelevanceShadowCacheTerminationSoakEvidence(evidence);
  assert.equal(evidence.actualLocalRelevanceShadowCacheTerminationSoakValidated, true);
  assert.deepEqual(evidence.results, {
    boundedSoakPassed: true,
    forcedTerminationRecoveryPassed: true,
    inputBindingPassed: true,
    processIsolationPassed: true,
  });
  assert.equal(evidence.soakWorker.saturatedCacheSnapshot.completedEntryCount, 16);
  assert.equal(evidence.soakWorker.saturatedCacheSnapshot.metrics.evictionCount, 32);
  assert.equal(evidence.soakWorker.closedCacheSnapshot.completedEntryCount, 0);
  assert.equal(evidence.runtimeActivation, false);
  assert.equal(evidence.productionReadyClaim, false);
});

test('wrong termination signal or memory regression is rejected', () => {
  assert.throws(
    () => buildEvidence({ termination: { observedSignal: 'SIGTERM' } }),
    /SIGKILL/,
  );

  const soak = soakWorker();
  soak.heapGrowthBytes = LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.maxHeapGrowthBytes + 1;
  assert.throws(() => buildEvidence({ soak }), /soak contract/);

  const peakRegression = soakWorker();
  peakRegression.peakMemory.heapUsedBytes =
    peakRegression.startMemory.heapUsedBytes +
    LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT.maxHeapGrowthBytes +
    1;
  assert.throws(() => buildEvidence({ soak: peakRegression }), /soak contract/);

  const inconsistentGrowth = soakWorker();
  inconsistentGrowth.rssGrowthBytes -= 1;
  assert.throws(() => buildEvidence({ soak: inconsistentGrowth }), /soak contract/);
});

test('termination soak evidence rejects identity reuse and integrity tampering', () => {
  const reused = buildEvidence();
  reused.terminationProbe.recoveryWorker.processIdentityHash =
    reused.terminationProbe.forcedWorker.processIdentityHash;
  const rebuilt = buildLocalRelevanceShadowCacheTerminationSoakEvidence({
    observedAt: reused.observedAt,
    priorProcessIsolationEvidenceBinding: reused.priorProcessIsolationEvidenceBinding,
    soakWorker: reused.soakWorker,
    terminationProbe: reused.terminationProbe,
  });
  assert.equal(rebuilt.actualLocalRelevanceShadowCacheTerminationSoakValidated, false);
  assert.equal(rebuilt.results.processIsolationPassed, false);
  assert.equal(rebuilt.status, 'failed-keep-lexical');

  const tampered = buildEvidence();
  tampered.results.boundedSoakPassed = false;
  assert.throws(
    () => assertLocalRelevanceShadowCacheTerminationSoakEvidence(tampered),
    /integrity|contract/,
  );
});
