import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalRelevanceShadowCacheProcessIsolationEvidence,
  buildLocalRelevanceCacheInputHash,
  buildLocalRelevanceShadowCacheProcessIsolationEvidence,
} from '../src/core/local-relevance-shadow-cache-process-isolation.mjs';

const repoDir = process.cwd();
const fixtureText = readRequiredFile('fixtures/retrieval-robustness-cases-v1.json');
const fixture = JSON.parse(fixtureText);
const priorLifecycleEvidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-cache-process-isolation.json'),
);
const scenario = fixture.scenarios[0];
const query = scenario.queries[0];
const source = scenario.memoryEntries[0];

assertLocalRelevanceShadowCacheProcessIsolationEvidence(evidence);
assert.deepEqual(evidence, buildLocalRelevanceShadowCacheProcessIsolationEvidence({
  fixtureBinding: {
    fixtureHash: hash(fixtureText),
    inputHash: buildLocalRelevanceCacheInputHash({
      documentText: source.content,
      queryText: query.text,
    }),
    queryId: query.id,
    scenarioId: scenario.id,
  },
  observedAt: evidence.observedAt,
  priorLifecycleEvidence,
  processProbe: evidence.processProbe,
  runtime: evidence.runtime,
}));
assert.equal(evidence.actualLocalRelevanceShadowCacheProcessIsolationValidated, true);
assert.equal(evidence.actualLocalRelevanceShadowCacheProcessIsolationQualified, false);
assert.equal(evidence.status, 'cache-process-isolation-passed-governance-blocked');
assert.deepEqual(evidence.results, {
  bindingPassed: true,
  inputBindingPassed: true,
  restartColdStartPassed: true,
  scoreParityPassed: true,
  workerContractsPassed: true,
  workerIsolationPassed: true,
});
assert.equal(evidence.runtime.runtimeVersion, '0.23.0');
assert.equal(evidence.runtime.modelId, 'qwen2.5:3b');
assert.equal(evidence.runtime.cloudFeaturesDisabled, true);
assert.equal(evidence.processProbe.processBoundary, 'node-child-process');
assert.equal(evidence.processProbe.environmentForwarding, 'none');
assert.equal(evidence.processProbe.concurrentWorkers.length, 2);
assert.equal(evidence.processProbe.restartOfWorkerId, 'worker-a');
const workers = [
  ...evidence.processProbe.concurrentWorkers,
  evidence.processProbe.restartedWorker,
];
assert.equal(new Set(workers.map((worker) => worker.processIdentityHash)).size, 3);
assert.equal(new Set(workers.map((worker) => worker.parentProcessIdentityHash)).size, 1);
assert.equal(new Set(workers.map((worker) => worker.firstScore)).size, 1);
for (const worker of workers) {
  assert.equal(worker.contractPassed, true);
  assert.equal(worker.firstScore, worker.cachedScore);
  assert.equal(worker.forwardedEnvironmentKeyCount, 0);
  assert.equal(worker.secretEnvironmentKeyFound, false);
  assert.equal(worker.initialCacheSnapshot.metrics.modelInferenceCount, 0);
  assert.equal(worker.warmCacheSnapshot.metrics.requestCount, 2);
  assert.equal(worker.warmCacheSnapshot.metrics.modelInferenceCount, 1);
  assert.equal(worker.warmCacheSnapshot.metrics.hitCount, 1);
  assert.equal(worker.closedCacheSnapshot.closed, true);
  assert.equal(worker.closedCacheSnapshot.completedEntryCount, 0);
  assert.equal(worker.postCloseScoreRejected, true);
}
assert.equal(evidence.runtimeActivation, false);
assert.equal(evidence.productionReadyClaim, false);

const evidenceText = JSON.stringify(evidence);
for (const fixtureScenario of fixture.scenarios) {
  for (const fixtureQuery of fixtureScenario.queries) {
    assert.equal(evidenceText.includes(fixtureQuery.text), false, `evidence leaked ${fixtureQuery.id}`);
  }
  for (const item of [...fixtureScenario.memoryEntries, ...fixtureScenario.attachments]) {
    const content = item.content || item.promptContent;
    assert.equal(evidenceText.includes(content), false, `evidence leaked ${item.id}`);
  }
}
for (const forbidden of [
  '/Users/',
  '/private/var/folders/',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'documentText',
  'queryText',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `evidence leaked ${forbidden}`);
}

const workerSource = readRequiredFile('scripts/local-relevance-score-cache-worker.mjs');
const runnerSource = readRequiredFile('scripts/local-relevance-cache-process-runner.mjs');
for (const term of ['env: {}', 'shell: false', 'process.execPath', 'MAX_STDOUT_BYTES']) {
  assert.ok(runnerSource.includes(term), `process runner missing ${term}`);
}
for (const term of [
  'forwardedEnvironmentKeyCount',
  'secretEnvironmentKeyFound',
  "closeCache({ reason: 'shutdown' })",
  'postCloseScoreRejected',
]) {
  assert.ok(workerSource.includes(term), `process worker missing ${term}`);
}

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: workspace-learning-personalization-current',
  '| R15 Shadow cache process isolation | 완료 |',
  'npm run smoke:local-relevance-shadow-cache-process-isolation',
  'actualLocalRelevanceShadowCacheProcessIsolationValidated: true',
  'forwarded environment key / secret-like key',
  'runtimeActivation: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

const tampered = structuredClone(evidence);
tampered.processProbe.restartedWorker.warmCacheSnapshot.metrics.modelInferenceCount = 0;
assert.throws(
  () => assertLocalRelevanceShadowCacheProcessIsolationEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualLocalRelevanceShadowCacheProcessIsolationQualified: false,
  actualLocalRelevanceShadowCacheProcessIsolationValidated: true,
  costFree: true,
  localCacheHitCount: workers.reduce(
    (total, worker) => total + worker.warmCacheSnapshot.metrics.hitCount,
    0,
  ),
  mode: 'local-relevance-shadow-cache-process-isolation',
  modelInferenceCount: workers.reduce(
    (total, worker) => total + worker.warmCacheSnapshot.metrics.modelInferenceCount,
    0,
  ),
  ok: true,
  processCount: workers.length,
  productionReadyClaim: false,
  restartColdStartPassed: true,
  runtimeActivation: false,
  workerIsolationPassed: true,
}, null, 2));

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
