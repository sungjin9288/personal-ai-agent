import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalRelevanceShadowCacheLifecycleEvidence,
  buildLocalRelevanceShadowCacheLifecycleEvidence,
} from '../src/core/local-relevance-shadow-cache-lifecycle.mjs';
import { buildLocalRelevanceShadowReplay } from '../src/core/local-relevance-shadow-replay.mjs';

const priorCacheEvidence = JSON.parse(
  fs.readFileSync('evidence/output-artifacts/local-relevance-shadow-cache.json', 'utf8'),
);

function buildStressReplay() {
  const prior = priorCacheEvidence.cacheReplay;
  return buildLocalRelevanceShadowReplay({
    cases: prior.cases,
    fixtureContract: prior.fixtureContract,
    observedAt: '2026-07-17T02:00:00.000Z',
    priorShadowEvidence: prior.priorShadowEvidence,
    queryContract: prior.queryContract,
    runtime: prior.runtime,
  });
}

function buildMetrics(overrides = {}) {
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

function buildSnapshot({
  closed = false,
  completedEntryCount = 0,
  generation = 0,
  lastInvalidationReason = null,
  maxEntries = 4,
  metrics = buildMetrics(),
  pendingEntryCount = 0,
} = {}) {
  return {
    binding: { ...priorCacheEvidence.cacheSnapshot.binding },
    closed,
    completedEntryCount,
    completedEntryContentRetained: false,
    externalProviderCalls: 'none',
    generation,
    lastInvalidationReason,
    maxEntries,
    metrics,
    pendingEntryCount,
    persistent: false,
    productionReadyClaim: false,
    runtimeActivation: false,
    schemaVersion: 'personal-ai-agent-local-relevance-score-cache/v1',
    strategy: 'bounded-process-local-lru',
  };
}

function buildStressSnapshot(overrides = {}) {
  return buildSnapshot({
    completedEntryCount: 8,
    maxEntries: 8,
    metrics: buildMetrics({
      evictionCount: 22,
      hitCount: 90,
      missCount: 30,
      modelInferenceCount: 30,
      requestCount: 120,
    }),
    ...overrides,
  });
}

function buildLifecycleProbe() {
  const beforeInvalidation = buildSnapshot({
    metrics: buildMetrics({
      inFlightHitCount: 2,
      missCount: 1,
      modelInferenceCount: 1,
      requestCount: 3,
    }),
    pendingEntryCount: 1,
  });
  const afterInvalidation = buildSnapshot({
    generation: 1,
    lastInvalidationReason: 'model-or-prompt-replaced',
    metrics: buildMetrics({
      inFlightHitCount: 2,
      invalidatedInFlightEntryCount: 1,
      invalidationCount: 1,
      missCount: 1,
      modelInferenceCount: 1,
      requestCount: 3,
    }),
  });
  const afterRefill = buildSnapshot({
    completedEntryCount: 1,
    generation: 1,
    lastInvalidationReason: 'model-or-prompt-replaced',
    metrics: buildMetrics({
      hitCount: 1,
      inFlightHitCount: 2,
      invalidatedInFlightEntryCount: 1,
      invalidationCount: 1,
      missCount: 2,
      modelInferenceCount: 2,
      requestCount: 5,
      staleResultDropCount: 1,
    }),
  });
  const afterClose = buildSnapshot({
    closed: true,
    generation: 2,
    lastInvalidationReason: 'rollback',
    metrics: buildMetrics({
      hitCount: 1,
      inFlightHitCount: 2,
      invalidatedCompletedEntryCount: 1,
      invalidatedInFlightEntryCount: 1,
      invalidationCount: 2,
      missCount: 2,
      modelInferenceCount: 2,
      requestCount: 5,
      staleResultDropCount: 1,
    }),
  });
  return {
    afterClose,
    afterInvalidation,
    afterRefill,
    beforeInvalidation,
    concurrentScoreParity: true,
    postCloseScoreRejected: true,
    refillScoreParity: true,
  };
}

function buildInput(overrides = {}) {
  return {
    lifecycleProbe: buildLifecycleProbe(),
    priorCacheEvidence,
    stressCacheSnapshot: buildStressSnapshot(),
    stressReplay: buildStressReplay(),
    ...overrides,
  };
}

test('lifecycle evidence preserves quality through eviction, invalidation, and rollback', () => {
  const evidence = buildLocalRelevanceShadowCacheLifecycleEvidence(buildInput());

  assertLocalRelevanceShadowCacheLifecycleEvidence(evidence);
  assert.equal(evidence.actualLocalRelevanceShadowCacheLifecycleValidated, true);
  assert.equal(evidence.stress.qualityParity, true);
  assert.equal(evidence.stress.evictionCount, 22);
  assert.equal(evidence.stress.cacheSnapshot.completedEntryCount, 8);
  assert.equal(evidence.lifecycleProbe.afterRefill.metrics.staleResultDropCount, 1);
  assert.equal(evidence.rollback.cacheClosed, true);
  assert.equal(evidence.runtimeActivation, false);
});

test('lifecycle evidence keeps lexical rollback on eviction or quality drift', () => {
  const evictionDrift = buildStressSnapshot();
  evictionDrift.metrics.evictionCount = 21;
  const evidence = buildLocalRelevanceShadowCacheLifecycleEvidence(
    buildInput({ stressCacheSnapshot: evictionDrift }),
  );
  assert.equal(evidence.actualLocalRelevanceShadowCacheLifecycleValidated, false);
  assert.equal(evidence.status, 'failed-keep-lexical');
  assert.doesNotThrow(() => assertLocalRelevanceShadowCacheLifecycleEvidence(evidence));

  const qualityDrift = buildStressReplay();
  qualityDrift.quality = { ...qualityDrift.quality, casePassRate: 0.9 };
  assert.throws(
    () => buildLocalRelevanceShadowCacheLifecycleEvidence(
      buildInput({ stressReplay: qualityDrift }),
    ),
    /shadow replay failed/,
  );
});

test('lifecycle evidence rejects malformed probes and integrity tampering', () => {
  const probe = buildLifecycleProbe();
  probe.afterRefill.metrics.staleResultDropCount = 0;
  assert.throws(
    () => buildLocalRelevanceShadowCacheLifecycleEvidence(
      buildInput({ lifecycleProbe: probe }),
    ),
    /invalidation contract/,
  );

  const evidence = buildLocalRelevanceShadowCacheLifecycleEvidence(buildInput());
  evidence.stress.evictionCount = 21;
  assert.throws(
    () => assertLocalRelevanceShadowCacheLifecycleEvidence(evidence),
    /integrity|contract/,
  );
});
