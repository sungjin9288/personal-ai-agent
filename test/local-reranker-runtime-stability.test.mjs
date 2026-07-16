import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { buildLocalRerankerResourceEnvelope } from '../src/core/local-reranker-resource-envelope.mjs';
import {
  assertLocalRerankerRuntimeStability,
  buildLocalRerankerRuntimeStability,
} from '../src/core/local-reranker-runtime-stability.mjs';

const priorEnvelope = JSON.parse(
  fs.readFileSync('evidence/output-artifacts/local-reranker-resource-envelope.json', 'utf8'),
);

function buildRunEnvelope(multiplier, observedAt) {
  return buildLocalRerankerResourceEnvelope({
    caseScores: priorEnvelope.caseScores.map((item) => ({
      ...item,
      firstDurationMs: item.firstDurationMs * multiplier,
      secondDurationMs: item.secondDurationMs * multiplier,
    })),
    observedAt,
    optimizedEvaluation: priorEnvelope.optimizedEvaluation,
    priorEvaluation: priorEnvelope.priorEvaluation,
    resourceSnapshot: priorEnvelope.resourceSnapshot,
    runtime: priorEnvelope.runtime,
    scorer: priorEnvelope.scorer,
    selectionRecords: priorEnvelope.selectionRecords,
  });
}

function buildRuns({ concurrentMultiplier = 2, lastWarmMultiplier = 1.05 } = {}) {
  const definitions = [
    ['cold-1', 'cold', null, 1.5],
    ['warm-1', 'warm', null, 1],
    ['warm-2', 'warm', null, 0.95],
    ['warm-3', 'warm', null, lastWarmMultiplier],
    ['concurrent-1', 'concurrent', 1, concurrentMultiplier],
    ['concurrent-2', 'concurrent', 2, concurrentMultiplier],
  ];
  return definitions.map(([id, lane, workerIndex, multiplier], index) => {
    const observedAt = `2026-07-16T05:00:0${index}.000Z`;
    const resourceEnvelope = buildRunEnvelope(multiplier, observedAt);
    return {
      id,
      lane,
      observedAt,
      resourceEnvelope,
      wallDurationMs: resourceEnvelope.latency.totalMs + 10,
      workerIndex,
    };
  });
}

function buildInput(options = {}) {
  return {
    concurrencyBatchWallMs: 55_000,
    lifecycle: {
      elapsedMs: 100,
      initiallyLoaded: true,
      modelAbsentBeforeCold: true,
      modelId: priorEnvelope.resourceSnapshot.modelId,
      pollCount: 2,
      source: 'ollama-api-ps-and-conditional-generate-unload',
      unloadRequested: true,
    },
    observedAt: '2026-07-16T05:01:00.000Z',
    priorEnvelope,
    runs: buildRuns(options),
  };
}

test('six-run bounded stability passes without authorizing runtime activation', () => {
  const stability = buildLocalRerankerRuntimeStability(buildInput());

  assert.equal(stability.status, 'bounded-runtime-stability-passed-governance-blocked');
  assert.equal(stability.actualLocalRerankerRuntimeStabilityValidated, true);
  assert.equal(stability.actualLocalRerankerRuntimeStabilityQualified, false);
  assert.equal(stability.qualityParity, true);
  assert.equal(stability.resourceStable, true);
  assert.deepEqual(stability.runContract, {
    coldRunCount: 1,
    concurrentRunCount: 2,
    expectedModelInferenceCount: 360,
    totalRunCount: 6,
    warmRunCount: 3,
  });
  assert.equal(stability.latency.all.modelInferenceCount, 360);
  assert.equal(stability.latency.all.rerankPassCount, 180);
  assert.equal(stability.latency.warm.p95DriftRate <= 0.25, true);
  assert.equal(stability.concurrency.p95WarmMultiplier <= 2.5, true);
  assert.equal(stability.governance.productionSustainedConcurrencyValidated, false);
  assert.equal(stability.governance.thermalEnvelopeValidated, false);
  assert.equal(stability.activation.authorized, false);
  assert.equal(stability.runtimeActivation, false);
  assert.equal(stability.productionReadyClaim, false);
  assert.doesNotThrow(() => assertLocalRerankerRuntimeStability(stability));
});

test('warm drift beyond the bounded gate keeps the R9 single-run evidence', () => {
  const stability = buildLocalRerankerRuntimeStability(
    buildInput({ lastWarmMultiplier: 1.5 }),
  );

  assert.equal(stability.actualLocalRerankerRuntimeStabilityValidated, false);
  assert.equal(stability.status, 'failed-keep-r9-single-run-evidence');
  assert.equal(stability.decision, 'keep-r9-single-run-evidence');
});

test('concurrency latency beyond the bounded gate keeps the R9 evidence', () => {
  const stability = buildLocalRerankerRuntimeStability(
    buildInput({ concurrentMultiplier: 3 }),
  );

  assert.equal(stability.actualLocalRerankerRuntimeStabilityValidated, false);
  assert.equal(stability.concurrency.p95WarmMultiplier > 2.5, true);
});

test('run order, lifecycle, resource, and activation tampering are rejected', () => {
  const input = buildInput();
  const reordered = structuredClone(input);
  [reordered.runs[0], reordered.runs[1]] = [reordered.runs[1], reordered.runs[0]];
  assert.throws(
    () => buildLocalRerankerRuntimeStability(reordered),
    /fixed cold, warm, and concurrent order/,
  );

  const lifecycleTampered = structuredClone(input);
  lifecycleTampered.lifecycle.modelAbsentBeforeCold = false;
  assert.throws(
    () => buildLocalRerankerRuntimeStability(lifecycleTampered),
    /confirmed model absence/,
  );

  const stability = buildLocalRerankerRuntimeStability(input);
  const resourceTampered = structuredClone(stability);
  resourceTampered.runs[0].resourceSnapshot.loadedModelBytes += 1;
  assert.throws(
    () => assertLocalRerankerRuntimeStability(resourceTampered),
    /integrity|contract/,
  );

  const activationTampered = structuredClone(stability);
  activationTampered.activation.authorized = true;
  assert.throws(
    () => assertLocalRerankerRuntimeStability(activationTampered),
    /integrity|claim-boundary|contract/,
  );
});
