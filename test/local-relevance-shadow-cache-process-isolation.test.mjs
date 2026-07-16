import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalRelevanceShadowCacheProcessIsolationEvidence,
  buildLocalRelevanceCacheInputHash,
  buildLocalRelevanceShadowCacheProcessIsolationEvidence,
} from '../src/core/local-relevance-shadow-cache-process-isolation.mjs';

const fixtureText = fs.readFileSync('fixtures/retrieval-robustness-cases-v1.json', 'utf8');
const fixture = JSON.parse(fixtureText);
const priorLifecycleEvidence = JSON.parse(
  fs.readFileSync('evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json', 'utf8'),
);
const scenario = fixture.scenarios[0];
const query = scenario.queries[0];
const source = scenario.memoryEntries[0];
const cacheBinding = priorLifecycleEvidence.stress.cacheSnapshot.binding;

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

function snapshot({ closed = false, completedEntryCount = 0, generation = 0, metricValues } = {}) {
  return {
    binding: { ...cacheBinding },
    closed,
    completedEntryContentRetained: false,
    completedEntryCount,
    externalProviderCalls: 'none',
    generation,
    lastInvalidationReason: closed ? 'shutdown' : null,
    maxEntries: 4,
    metrics: metrics(metricValues),
    pendingEntryCount: 0,
    persistent: false,
    productionReadyClaim: false,
    runtimeActivation: false,
    schemaVersion: 'personal-ai-agent-local-relevance-score-cache/v1',
    strategy: 'bounded-process-local-lru',
  };
}

function worker(workerId, processIdentity) {
  return {
    cachedScore: 91,
    closedCacheSnapshot: snapshot({
      closed: true,
      generation: 1,
      metricValues: {
        hitCount: 1,
        invalidatedCompletedEntryCount: 1,
        invalidationCount: 1,
        missCount: 1,
        modelInferenceCount: 1,
        requestCount: 2,
      },
    }),
    environmentKeyCount: 0,
    firstScore: 91,
    forwardedEnvironmentKeyCount: 0,
    initialCacheSnapshot: snapshot(),
    inputHash: buildLocalRelevanceCacheInputHash({
      documentText: source.content,
      queryText: query.text,
    }),
    parentProcessIdentityHash: hash('parent'),
    platformEnvironmentKeyCount: 0,
    postCloseScoreRejected: true,
    processIdentityHash: hash(processIdentity),
    secretEnvironmentKeyFound: false,
    warmCacheSnapshot: snapshot({
      completedEntryCount: 1,
      metricValues: {
        hitCount: 1,
        missCount: 1,
        modelInferenceCount: 1,
        requestCount: 2,
      },
    }),
    workerId,
  };
}

function buildEvidence(overrides = {}) {
  const processProbe = {
    cloudFeaturesDisabled: true,
    concurrentWorkers: [worker('worker-a', 'worker-a-1'), worker('worker-b', 'worker-b-1')],
    environmentForwarding: 'none',
    processBoundary: 'node-child-process',
    restartedWorker: worker('worker-a-restarted', 'worker-a-2'),
    restartOfWorkerId: 'worker-a',
    runIdHash: hash('run'),
    ...overrides,
  };
  return buildLocalRelevanceShadowCacheProcessIsolationEvidence({
    fixtureBinding: {
      fixtureHash: hash(fixtureText),
      inputHash: buildLocalRelevanceCacheInputHash({
        documentText: source.content,
        queryText: query.text,
      }),
      queryId: query.id,
      scenarioId: scenario.id,
    },
    observedAt: '2026-07-17T00:00:00.000Z',
    priorLifecycleEvidence,
    processProbe,
    runtime: {
      adapter: 'ollama-independent-score',
      cloudFeaturesDisabled: true,
      modelDigest: cacheBinding.modelDigest,
      modelId: cacheBinding.modelId,
      runtimeVersion: '0.23.0',
      transport: 'loopback-http',
    },
  });
}

test('process isolation evidence proves worker-local warm hits and restart cold start', () => {
  const evidence = buildEvidence();

  assertLocalRelevanceShadowCacheProcessIsolationEvidence(evidence);
  assert.equal(evidence.actualLocalRelevanceShadowCacheProcessIsolationValidated, true);
  assert.deepEqual(evidence.results, {
    bindingPassed: true,
    inputBindingPassed: true,
    restartColdStartPassed: true,
    scoreParityPassed: true,
    workerContractsPassed: true,
    workerIsolationPassed: true,
  });
  assert.equal(
    new Set([
      ...evidence.processProbe.concurrentWorkers,
      evidence.processProbe.restartedWorker,
    ].map((item) => item.processIdentityHash)).size,
    3,
  );
  assert.equal(evidence.runtimeActivation, false);
  assert.equal(evidence.productionReadyClaim, false);
});

test('shared process identity or restart cache reuse keeps lexical active', () => {
  const sharedProcessWorkers = [worker('worker-a', 'same-process'), worker('worker-b', 'same-process')];
  const sharedProcessEvidence = buildEvidence({ concurrentWorkers: sharedProcessWorkers });
  assert.equal(sharedProcessEvidence.actualLocalRelevanceShadowCacheProcessIsolationValidated, false);
  assert.equal(sharedProcessEvidence.results.workerIsolationPassed, false);
  assert.equal(sharedProcessEvidence.status, 'failed-keep-lexical');

  const restartedWorker = worker('worker-a-restarted', 'worker-a-2');
  restartedWorker.warmCacheSnapshot.metrics.modelInferenceCount = 0;
  restartedWorker.warmCacheSnapshot.metrics.missCount = 0;
  restartedWorker.warmCacheSnapshot.metrics.hitCount = 2;
  const reusedCacheEvidence = buildEvidence({ restartedWorker });
  assert.equal(reusedCacheEvidence.actualLocalRelevanceShadowCacheProcessIsolationValidated, false);
  assert.equal(reusedCacheEvidence.results.restartColdStartPassed, false);
  assert.equal(reusedCacheEvidence.results.workerContractsPassed, false);
});

test('process isolation evidence rejects malformed snapshots and integrity tampering', () => {
  const malformedWorker = worker('worker-a', 'worker-a-1');
  malformedWorker.warmCacheSnapshot.binding.bindingHash = 'wrong';
  assert.throws(
    () => buildEvidence({
      concurrentWorkers: [malformedWorker, worker('worker-b', 'worker-b-1')],
    }),
    /snapshot|binding/,
  );

  const tampered = buildEvidence();
  tampered.results.scoreParityPassed = false;
  assert.throws(
    () => assertLocalRelevanceShadowCacheProcessIsolationEvidence(tampered),
    /integrity|contract/,
  );
});
