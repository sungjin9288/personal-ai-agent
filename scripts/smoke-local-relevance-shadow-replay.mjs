import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalRelevanceShadowReplay,
  buildLocalRelevanceShadowReplay,
  buildLocalRelevanceShadowReplayFixtureContract,
} from '../src/core/local-relevance-shadow-replay.mjs';

const repoDir = process.cwd();
const fixtureText = readRequiredFile('fixtures/retrieval-robustness-cases-v1.json');
const fixture = JSON.parse(fixtureText);
const priorShadowEvidence = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-integration.json'),
);
const replay = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-replay.json'),
);
const fullQueryBaseline = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-relevance-shadow-replay-full-query-baseline.json'),
);

assertLocalRelevanceShadowReplay(replay);
assertLocalRelevanceShadowReplay(fullQueryBaseline);
assert.deepEqual(replay, buildLocalRelevanceShadowReplay({
  cases: replay.cases,
  fixtureContract: buildLocalRelevanceShadowReplayFixtureContract({
    fixture,
    fixtureHash: hashValue(fixtureText),
  }),
  observedAt: replay.observedAt,
  priorShadowEvidence,
  queryContract: replay.queryContract,
  runtime: replay.runtime,
}));
assert.equal(fullQueryBaseline.queryContract, 'full-retrieval-query-v1');
assert.equal(fullQueryBaseline.actualLocalRelevanceShadowReplayValidated, false);
assert.equal(fullQueryBaseline.status, 'failed-keep-lexical');
assert.equal(fullQueryBaseline.quality.casePassRate, 0.8);
assert.equal(fullQueryBaseline.variationMetrics['hard-negative'].casePassRate, 0);
assert.equal(replay.queryContract, 'mission-objective-v1');
assert.equal(replay.quality.scenarioCount, 3);
assert.equal(replay.quality.caseCount, 15);
assert.equal(replay.quality.observationCount, 60);
assert.equal(replay.quality.expectedTopOneCount, 60);
assert.equal(replay.quality.casePassRate, 1);
assert.equal(replay.variationMetrics['hard-negative'].caseCount, 3);
assert.equal(replay.variationMetrics['hard-negative'].casePassRate, 1);
assert.equal(replay.variationMetrics['cross-language'].caseCount, 3);
assert.equal(replay.variationMetrics['cross-language'].casePassRate, 1);
assert.equal(replay.cases.every((item) => item.mission.status === 'completed'), true);
assert.equal(
  replay.cases.every((item) => item.mission.storeShadowMetadataFound === false),
  true,
);
assert.equal(
  replay.cases.every((item) => item.mission.artifactShadowMetadataFound === false),
  true,
);
assert.equal(replay.runtime.externalProviderCalls, 'none');
assert.equal(replay.runtimeActivation, false);
assert.equal(replay.productionReadyClaim, false);

assert.throws(
  () => buildLocalRelevanceShadowReplay({
    cases: replay.cases.slice(1),
    fixtureContract: replay.fixtureContract,
    observedAt: replay.observedAt,
    priorShadowEvidence,
    queryContract: replay.queryContract,
    runtime: replay.runtime,
  }),
  /exactly match the fixture contract/,
);
const tampered = structuredClone(replay);
tampered.cases[0].observations[0].providerInput.changed = true;
assert.throws(() => assertLocalRelevanceShadowReplay(tampered), /integrity|contract/);

const evidenceText = JSON.stringify([fullQueryBaseline, replay]);
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
  'status: user-learning-conflict-revocation-current',
  '| R12 Multi-scenario shadow replay | 완료 |',
  'npm run smoke:local-relevance-shadow-replay',
  'actualLocalRelevanceShadowReplayValidated: true',
  'runtimeActivation: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

console.log(JSON.stringify({
  actualLocalRelevanceShadowReplayQualified: false,
  actualLocalRelevanceShadowReplayValidated: true,
  caseCount: replay.quality.caseCount,
  casePassRate: replay.quality.casePassRate,
  costFree: true,
  mode: 'local-relevance-shadow-replay',
  observationCount: replay.quality.observationCount,
  ok: true,
  productionReadyClaim: false,
  runtimeActivation: false,
  scenarioCount: replay.quality.scenarioCount,
}, null, 2));

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${relativePath}.`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
