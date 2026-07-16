import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalRelevanceShadowCacheEvidence,
  buildLocalRelevanceShadowCacheEvidence,
} from '../src/core/local-relevance-shadow-cache-evidence.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/retrieval-robustness-cases-v1.json'));
const priorReplay = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-replay.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-cache.json'),
);

assertLocalRelevanceShadowCacheEvidence(evidence);
assert.deepEqual(evidence, buildLocalRelevanceShadowCacheEvidence({
  cacheReplay: evidence.cacheReplay,
  cacheSnapshot: evidence.cacheSnapshot,
  observedAt: evidence.observedAt,
  priorReplay,
}));
assert.equal(evidence.actualLocalRelevanceShadowCacheValidated, true);
assert.equal(evidence.actualLocalRelevanceShadowCacheQualified, false);
assert.equal(evidence.status, 'bounded-shadow-cache-passed-governance-blocked');
assert.equal(evidence.comparison.qualityParity, true);
assert.equal(evidence.comparison.bindingPassed, true);
assert.equal(evidence.comparison.cacheContractPassed, true);
assert.equal(evidence.comparison.scoreRequestCount, 120);
assert.equal(evidence.comparison.uniqueScorePairCount, 30);
assert.equal(evidence.comparison.baselineModelInferenceCount, 120);
assert.equal(evidence.comparison.cachedModelInferenceCount, 30);
assert.equal(evidence.comparison.cacheHitCount, 90);
assert.equal(evidence.comparison.cacheHitRate, 0.75);
assert.equal(evidence.comparison.inferenceReductionRate, 0.75);
assert.equal(evidence.comparison.totalLatencyReductionRate > 0, true);
assert.equal(
  evidence.comparison.cachedLatency.totalMs < evidence.comparison.baselineLatency.totalMs,
  true,
);
assert.equal(
  evidence.comparison.cachedLatency.maximumMs > evidence.comparison.baselineLatency.maximumMs,
  true,
  'R13 evidence must retain the observed maximum-latency regression',
);
assert.equal(evidence.cacheSnapshot.maxEntries, 64);
assert.equal(evidence.cacheSnapshot.completedEntryCount, 30);
assert.equal(evidence.cacheSnapshot.completedEntryContentRetained, false);
assert.equal(evidence.cacheSnapshot.metrics.evictionCount, 0);
assert.equal(evidence.cacheSnapshot.metrics.failureCount, 0);
assert.equal(evidence.cacheSnapshot.persistent, false);
assert.equal(evidence.cacheReplay.quality.caseCount, 15);
assert.equal(evidence.cacheReplay.quality.casePassRate, 1);
assert.equal(evidence.cacheReplay.quality.expectedTopOneCount, 60);
assert.equal(evidence.cacheReplay.quality.providerInputPreserved, true);
assert.equal(
  evidence.cacheReplay.cases.every((item) => item.mission.storeShadowMetadataFound === false),
  true,
);
assert.equal(
  evidence.cacheReplay.cases.every((item) => item.mission.artifactShadowMetadataFound === false),
  true,
);
assert.equal(evidence.runtimeActivation, false);
assert.equal(evidence.productionReadyClaim, false);

const tampered = structuredClone(evidence);
tampered.cacheSnapshot.metrics.hitCount = 89;
assert.throws(() => assertLocalRelevanceShadowCacheEvidence(tampered), /integrity|contract/);

const evidenceText = JSON.stringify(evidence);
for (const scenario of fixture.scenarios) {
  for (const query of scenario.queries) {
    assert.equal(evidenceText.includes(query.text), false, `evidence leaked query ${query.id}`);
  }
  for (const source of [...scenario.memoryEntries, ...scenario.attachments]) {
    const content = source.content || source.promptContent;
    assert.equal(evidenceText.includes(content), false, `evidence leaked source ${source.id}`);
  }
}
for (const forbidden of ['/Users/', '/private/var/folders/', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) {
  assert.equal(evidenceText.includes(forbidden), false, `evidence leaked ${forbidden}`);
}

const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
for (const term of [
  'status: local-relevance-shadow-cache-process-isolation-current',
  '| R13 Bounded shadow score cache | 완료 |',
  'npm run smoke:local-relevance-shadow-cache',
  'actualLocalRelevanceShadowCacheValidated: true',
  'maximum latency',
  'runtimeActivation: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

console.log(JSON.stringify({
  actualLocalRelevanceShadowCacheQualified: false,
  actualLocalRelevanceShadowCacheValidated: true,
  cacheHitCount: evidence.comparison.cacheHitCount,
  cacheHitRate: evidence.comparison.cacheHitRate,
  caseCount: evidence.cacheReplay.quality.caseCount,
  costFree: true,
  inferenceReductionRate: evidence.comparison.inferenceReductionRate,
  mode: 'local-relevance-shadow-cache',
  modelInferenceCount: evidence.comparison.cachedModelInferenceCount,
  ok: true,
  productionReadyClaim: false,
  runtimeActivation: false,
  scoreRequestCount: evidence.comparison.scoreRequestCount,
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
