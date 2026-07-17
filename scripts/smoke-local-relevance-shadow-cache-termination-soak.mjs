import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalRelevanceShadowCacheTerminationSoakEvidence,
  buildLocalRelevanceShadowCacheTerminationSoakEvidence,
  LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT,
} from '../src/core/local-relevance-shadow-cache-termination-soak.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/retrieval-robustness-cases-v1.json'));
const priorEvidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-cache-process-isolation.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-cache-termination-soak.json'),
);

assertLocalRelevanceShadowCacheTerminationSoakEvidence(evidence);
assert.deepEqual(evidence, buildLocalRelevanceShadowCacheTerminationSoakEvidence({
  observedAt: evidence.observedAt,
  priorProcessIsolationEvidence: priorEvidence,
  soakWorker: evidence.soakWorker,
  terminationProbe: evidence.terminationProbe,
}));
assert.equal(evidence.actualLocalRelevanceShadowCacheTerminationSoakValidated, true);
assert.equal(evidence.actualLocalRelevanceShadowCacheTerminationSoakQualified, false);
assert.equal(evidence.status, 'cache-termination-soak-passed-governance-blocked');
assert.deepEqual(evidence.results, {
  boundedSoakPassed: true,
  forcedTerminationRecoveryPassed: true,
  inputBindingPassed: true,
  processIsolationPassed: true,
});
assert.deepEqual(evidence.terminationProbe.termination, {
  exitCode: null,
  finalResultReceived: false,
  observedSignal: 'SIGKILL',
  readyBeforeTermination: true,
  requestedSignal: 'SIGKILL',
  terminatedByParent: true,
});
const forced = evidence.terminationProbe.forcedWorker;
const recovery = evidence.terminationProbe.recoveryWorker;
assert.equal(forced.warmCacheSnapshot.metrics.modelInferenceCount, 1);
assert.equal(forced.warmCacheSnapshot.metrics.hitCount, 1);
assert.equal(recovery.initialCacheSnapshot.metrics.modelInferenceCount, 0);
assert.equal(recovery.warmCacheSnapshot.metrics.modelInferenceCount, 1);
assert.equal(recovery.warmCacheSnapshot.metrics.hitCount, 1);
assert.equal(recovery.firstScore, forced.firstScore);
assert.equal(recovery.closedCacheSnapshot.completedEntryCount, 0);

const soak = evidence.soakWorker;
const contract = LOCAL_RELEVANCE_CACHE_SOAK_CONTRACT;
assert.equal(soak.capacity, contract.capacity);
assert.equal(soak.pairCount, contract.pairCount);
assert.equal(soak.replayCount, contract.replayCount);
assert.equal(soak.saturatedCacheSnapshot.completedEntryCount, contract.capacity);
assert.equal(soak.saturatedCacheSnapshot.metrics.requestCount, 64);
assert.equal(soak.saturatedCacheSnapshot.metrics.modelInferenceCount, 48);
assert.equal(soak.saturatedCacheSnapshot.metrics.hitCount, 16);
assert.equal(soak.saturatedCacheSnapshot.metrics.evictionCount, 32);
assert.ok(soak.heapGrowthBytes <= contract.maxHeapGrowthBytes);
assert.ok(soak.rssGrowthBytes <= contract.maxRssGrowthBytes);
assert.ok(
  soak.peakMemory.heapUsedBytes - soak.startMemory.heapUsedBytes <=
    contract.maxHeapGrowthBytes,
);
assert.ok(
  soak.peakMemory.rssBytes - soak.startMemory.rssBytes <= contract.maxRssGrowthBytes,
);
assert.equal(soak.closedCacheSnapshot.completedEntryCount, 0);
assert.equal(soak.postCloseScoreRejected, true);
for (const worker of [forced, recovery, soak]) {
  assert.equal(worker.forwardedEnvironmentKeyCount, 0);
  assert.equal(worker.secretEnvironmentKeyFound, false);
}
assert.equal(evidence.runtimeActivation, false);
assert.equal(evidence.productionReadyClaim, false);

const evidenceText = JSON.stringify(evidence);
for (const scenario of fixture.scenarios) {
  for (const query of scenario.queries) {
    assert.equal(evidenceText.includes(query.text), false, `evidence leaked ${query.id}`);
  }
  for (const item of [...scenario.memoryEntries, ...scenario.attachments]) {
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
  'CACHE_SOAK_DOCUMENT_VARIANT',
  'CACHE_SOAK_QUERY_VARIANT',
]) {
  assert.equal(evidenceText.includes(forbidden), false, `evidence leaked ${forbidden}`);
}

const runnerSource = readRequiredFile('scripts/local-relevance-cache-process-runner.mjs');
const workerSource = readRequiredFile('scripts/local-relevance-score-cache-worker.mjs');
for (const term of ["child.kill('SIGKILL')", 'ready-for-termination', 'env: {}', 'shell: false']) {
  assert.ok(runnerSource.includes(term), `forced runner missing ${term}`);
}
for (const term of [
  'bounded-soak',
  'CACHE_SOAK_DOCUMENT_VARIANT',
  'memorySample',
  'closeCache',
]) {
  assert.ok(workerSource.includes(term), `soak worker missing ${term}`);
}

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: local-answer-composition-hardening-current',
  '| R16 Shadow cache termination recovery and bounded soak | 완료 |',
  'npm run smoke:local-relevance-shadow-cache-termination-soak',
  'actualLocalRelevanceShadowCacheTerminationSoakValidated: true',
  '4,023,088 bytes',
  '21,938,176 bytes',
  'runtimeActivation: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

const tampered = structuredClone(evidence);
tampered.soakWorker.saturatedCacheSnapshot.metrics.evictionCount = 31;
assert.throws(
  () => assertLocalRelevanceShadowCacheTerminationSoakEvidence(tampered),
  /integrity|contract/,
);

console.log(JSON.stringify({
  actualLocalRelevanceShadowCacheTerminationSoakQualified: false,
  actualLocalRelevanceShadowCacheTerminationSoakValidated: true,
  cacheCapacity: soak.capacity,
  costFree: true,
  evictionCount: soak.saturatedCacheSnapshot.metrics.evictionCount,
  forcedTerminationSignal: evidence.terminationProbe.termination.observedSignal,
  heapGrowthBytes: soak.heapGrowthBytes,
  mode: 'local-relevance-shadow-cache-termination-soak',
  modelInferenceCount: soak.saturatedCacheSnapshot.metrics.modelInferenceCount,
  ok: true,
  productionReadyClaim: false,
  recoveryInferenceCount: recovery.warmCacheSnapshot.metrics.modelInferenceCount,
  rssGrowthBytes: soak.rssGrowthBytes,
  runtimeActivation: false,
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
