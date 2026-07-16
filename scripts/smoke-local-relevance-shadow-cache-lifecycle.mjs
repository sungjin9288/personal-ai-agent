import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalRelevanceShadowCacheLifecycleEvidence,
  buildLocalRelevanceShadowCacheLifecycleEvidence,
} from '../src/core/local-relevance-shadow-cache-lifecycle.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/retrieval-robustness-cases-v1.json'));
const priorCacheEvidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-cache.json'),
);
const evidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-cache-lifecycle.json'),
);

assertLocalRelevanceShadowCacheLifecycleEvidence(evidence);
assert.deepEqual(evidence, buildLocalRelevanceShadowCacheLifecycleEvidence({
  lifecycleProbe: evidence.lifecycleProbe,
  observedAt: evidence.observedAt,
  priorCacheEvidence,
  stressCacheSnapshot: evidence.stress.cacheSnapshot,
  stressReplay: evidence.stress.stressReplay,
}));
assert.equal(evidence.actualLocalRelevanceShadowCacheLifecycleValidated, true);
assert.equal(evidence.actualLocalRelevanceShadowCacheLifecycleQualified, false);
assert.equal(evidence.status, 'shadow-cache-lifecycle-passed-governance-blocked');
assert.equal(evidence.stress.bindingPassed, true);
assert.equal(evidence.stress.qualityParity, true);
assert.equal(evidence.stress.stressContractPassed, true);
assert.equal(evidence.stress.lifecycleContractPassed, true);
assert.equal(evidence.stress.cacheSnapshot.maxEntries, 8);
assert.equal(evidence.stress.cacheSnapshot.completedEntryCount, 8);
assert.equal(evidence.stress.cacheSnapshot.metrics.requestCount, 120);
assert.equal(evidence.stress.cacheSnapshot.metrics.modelInferenceCount, 30);
assert.equal(evidence.stress.cacheSnapshot.metrics.hitCount, 90);
assert.equal(evidence.stress.cacheSnapshot.metrics.evictionCount, 22);
assert.equal(evidence.stress.stressReplay.quality.caseCount, 15);
assert.equal(evidence.stress.stressReplay.quality.casePassRate, 1);
assert.equal(evidence.stress.stressReplay.quality.expectedTopOneCount, 60);
assert.equal(evidence.stress.stressReplay.quality.providerInputPreserved, true);
assert.equal(
  evidence.stress.stressReplay.cases.every(
    (item) => item.mission.storeShadowMetadataFound === false,
  ),
  true,
);
assert.equal(
  evidence.stress.stressReplay.cases.every(
    (item) => item.mission.artifactShadowMetadataFound === false,
  ),
  true,
);
assert.equal(evidence.lifecycleProbe.beforeInvalidation.metrics.inFlightHitCount, 2);
assert.equal(evidence.lifecycleProbe.afterInvalidation.metrics.invalidatedInFlightEntryCount, 1);
assert.equal(evidence.lifecycleProbe.afterRefill.metrics.staleResultDropCount, 1);
assert.equal(evidence.lifecycleProbe.afterClose.closed, true);
assert.equal(evidence.lifecycleProbe.afterClose.completedEntryCount, 0);
assert.equal(evidence.lifecycleProbe.postCloseScoreRejected, true);
assert.equal(evidence.rollback.stateMigrationRequired, false);
assert.equal(evidence.runtimeActivation, false);
assert.equal(evidence.productionReadyClaim, false);

const tampered = structuredClone(evidence);
tampered.lifecycleProbe.afterClose.metrics.staleResultDropCount = 0;
assert.throws(
  () => assertLocalRelevanceShadowCacheLifecycleEvidence(tampered),
  /integrity|contract/,
);

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
  'status: local-relevance-shadow-cache-termination-soak-current',
  '| R14 Shadow cache lifecycle stress | 완료 |',
  'npm run smoke:local-relevance-shadow-cache-lifecycle',
  'actualLocalRelevanceShadowCacheLifecycleValidated: true',
  'eviction 22',
  'staleResultDropCount: 1',
  'runtimeActivation: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

console.log(JSON.stringify({
  actualLocalRelevanceShadowCacheLifecycleQualified: false,
  actualLocalRelevanceShadowCacheLifecycleValidated: true,
  closed: evidence.lifecycleProbe.afterClose.closed,
  costFree: true,
  evictionCount: evidence.stress.cacheSnapshot.metrics.evictionCount,
  hitCount: evidence.stress.cacheSnapshot.metrics.hitCount,
  inFlightHitCount: evidence.lifecycleProbe.beforeInvalidation.metrics.inFlightHitCount,
  mode: 'local-relevance-shadow-cache-lifecycle',
  modelInferenceCount: evidence.stress.cacheSnapshot.metrics.modelInferenceCount,
  ok: true,
  productionReadyClaim: false,
  requestCount: evidence.stress.cacheSnapshot.metrics.requestCount,
  runtimeActivation: false,
  staleResultDropCount: evidence.lifecycleProbe.afterClose.metrics.staleResultDropCount,
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
