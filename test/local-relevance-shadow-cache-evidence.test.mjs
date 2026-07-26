import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalRelevanceShadowCacheEvidence,
  buildLocalRelevanceShadowCacheEvidence,
} from '../src/core/local-relevance-shadow-cache-evidence.mjs';
import { buildLocalRelevanceShadowReplay } from '../src/core/local-relevance-shadow-replay.mjs';

const priorReplay = JSON.parse(
  fs.readFileSync('evidence/output-artifacts/local-relevance-shadow-replay.json', 'utf8'),
);
const scorerBinding = priorReplay.cases[0].observations[0].scorer;

function buildCacheSnapshot(overrides = {}) {
  const bindingContent = {
    modelDigest: priorReplay.runtime.modelDigest,
    modelId: priorReplay.runtime.modelId,
    promptHash: scorerBinding.promptHash,
    promptVersion: scorerBinding.promptVersion,
    scorerId: scorerBinding.id,
  };
  return {
    binding: {
      ...bindingContent,
      bindingHash: hashRecord(bindingContent),
    },
    completedEntryCount: 30,
    completedEntryContentRetained: false,
    externalProviderCalls: 'none',
    maxEntries: 64,
    metrics: {
      evictionCount: 0,
      failureCount: 0,
      hitCount: 90,
      inFlightHitCount: 0,
      missCount: 30,
      modelInferenceCount: 30,
      requestCount: 120,
    },
    pendingEntryCount: 0,
    persistent: false,
    productionReadyClaim: false,
    runtimeActivation: false,
    schemaVersion: 'personal-ai-agent-local-relevance-score-cache/v1',
    strategy: 'bounded-process-local-lru',
    ...overrides,
  };
}

function buildCacheReplay() {
  const cases = structuredClone(priorReplay.cases);
  for (const item of cases) {
    item.observations = item.observations.map((observation, index) =>
      rehashObservation({
        ...observation,
        latencyMs: index === 0 ? 800 : 0.1,
      }),
    );
  }
  return buildLocalRelevanceShadowReplay({
    cases,
    fixtureContract: priorReplay.fixtureContract,
    observedAt: priorReplay.observedAt,
    priorShadowEvidence: priorReplay.priorShadowEvidence,
    queryContract: priorReplay.queryContract,
    runtime: priorReplay.runtime,
  });
}

test('cache evidence preserves R12 quality while reducing exact repeated score pairs', () => {
  const evidence = buildLocalRelevanceShadowCacheEvidence({
    cacheReplay: buildCacheReplay(),
    cacheSnapshot: buildCacheSnapshot(),
    priorReplay,
  });

  assertLocalRelevanceShadowCacheEvidence(evidence);
  assert.equal(evidence.actualLocalRelevanceShadowCacheValidated, true);
  assert.equal(evidence.comparison.scoreRequestCount, 120);
  assert.equal(evidence.comparison.uniqueScorePairCount, 30);
  assert.equal(evidence.comparison.cachedModelInferenceCount, 30);
  assert.equal(evidence.comparison.cacheHitCount, 90);
  assert.equal(evidence.comparison.inferenceReductionRate, 0.75);
  assert.equal(evidence.comparison.qualityParity, true);
  assert.equal(evidence.runtimeActivation, false);
});

test('cache evidence rejects binding drift, inconsistent metrics, and tampering', () => {
  const replay = buildCacheReplay();
  const driftedBinding = buildCacheSnapshot();
  driftedBinding.binding.modelDigest = 'c'.repeat(64);
  driftedBinding.binding.bindingHash = hashRecord({
    modelDigest: driftedBinding.binding.modelDigest,
    modelId: driftedBinding.binding.modelId,
    promptHash: driftedBinding.binding.promptHash,
    promptVersion: driftedBinding.binding.promptVersion,
    scorerId: driftedBinding.binding.scorerId,
  });
  const drifted = buildLocalRelevanceShadowCacheEvidence({
    cacheReplay: replay,
    cacheSnapshot: driftedBinding,
    priorReplay,
  });
  assert.equal(drifted.actualLocalRelevanceShadowCacheValidated, false);
  assert.equal(drifted.status, 'failed-keep-lexical');

  const inconsistent = buildCacheSnapshot();
  inconsistent.metrics.requestCount = 119;
  assert.throws(
    () => buildLocalRelevanceShadowCacheEvidence({
      cacheReplay: replay,
      cacheSnapshot: inconsistent,
      priorReplay,
    }),
    /metrics are inconsistent/,
  );

  const tampered = buildLocalRelevanceShadowCacheEvidence({
    cacheReplay: replay,
    cacheSnapshot: buildCacheSnapshot(),
    priorReplay,
  });
  tampered.comparison.cacheHitCount = 89;
  assert.throws(() => assertLocalRelevanceShadowCacheEvidence(tampered), /integrity|contract/);
});

test('cache failures or quality regressions keep lexical runtime active', () => {
  const failedSnapshot = buildCacheSnapshot({
    completedEntryCount: 29,
    metrics: {
      evictionCount: 0,
      failureCount: 1,
      hitCount: 90,
      inFlightHitCount: 0,
      missCount: 30,
      modelInferenceCount: 30,
      requestCount: 120,
    },
  });
  const evidence = buildLocalRelevanceShadowCacheEvidence({
    cacheReplay: buildCacheReplay(),
    cacheSnapshot: failedSnapshot,
    priorReplay,
  });

  assert.equal(evidence.actualLocalRelevanceShadowCacheValidated, false);
  assert.equal(evidence.decision, 'keep-lexical');
  assert.equal(evidence.runtimeActivation, false);
  assert.doesNotThrow(() => assertLocalRelevanceShadowCacheEvidence(evidence));
});

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function rehashObservation(observation) {
  const { id, observationHash, ...content } = observation;
  const nextHash = hashRecord(content);
  return {
    ...content,
    id: `local-relevance-shadow-observation-${nextHash}`,
    observationHash: nextHash,
  };
}
