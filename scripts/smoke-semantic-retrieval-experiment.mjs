import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { createLocalCommandEmbeddingAdapter } from '../src/core/embedding-adapter.mjs';
import {
  compareRetrievalQualityEvaluations,
  evaluateRetrievalQualitySuite,
} from '../src/core/retrieval-quality-evaluation.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';
import {
  buildSemanticCorpusRecords,
  runSemanticRetrievalExperiment,
} from '../src/core/semantic-retrieval.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/semantic-retrieval-cases-v1.json'));
const fixtureCommand = readRequiredFile('fixtures/local-embedding-command.mjs');
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(fixture.schemaVersion, 'personal-ai-agent-semantic-retrieval-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.runtimeActivation, false);
assert.equal(fixture.cases.length, 3);
assert.doesNotMatch(fixtureCommand, /node:https|node:http|fetch\(|axios|openai|anthropic/i);

const adapter = createLocalCommandEmbeddingAdapter({
  args: [path.join(repoDir, 'fixtures', 'local-embedding-command.mjs')],
  command: process.execPath,
  env: {
    ...process.env,
    ANTHROPIC_API_KEY: 'must-not-reach-fixture',
    OPENAI_API_KEY: 'must-not-reach-fixture',
  },
});

assert.equal(adapter.security.shell, false);
assert.equal(adapter.security.transport, 'local-process-stdio');
assert.equal(adapter.security.environmentPolicy, 'allowlist');
assert.equal(adapter.security.networkIsolation, 'caller-owned');
assert.equal(adapter.security.environmentKeys.includes('OPENAI_API_KEY'), false);
assert.equal(adapter.security.environmentKeys.includes('ANTHROPIC_API_KEY'), false);

const thresholds = {
  maximumNoiseRateAtK: 0,
  maximumUnlabeledRetrievedSourceCount: 0,
  minimumCasePassRate: 1,
  minimumPrecisionAtK: 1,
  minimumRecallAtK: 1,
  minimumSourceDiversityRate: 1,
};
const lexicalCases = [];
const semanticCases = [];
const experimentResults = [];

for (const definition of fixture.cases) {
  const labeledSourceKeys = [...definition.expectedSources, ...definition.irrelevantSources]
    .map((source) => source.key)
    .sort();
  const inputSourceKeys = [
    ...definition.retrievalInput.memoryEntries.map((entry) => `memory:${entry.id}`),
    ...definition.retrievalInput.attachments.map((attachment) => `attachment:${attachment.id}`),
  ].sort();
  assert.deepEqual(labeledSourceKeys, inputSourceKeys, `${definition.id} must label every fixture source`);

  const lexical = buildRetrievalContextWithCorpus(definition.retrievalInput);
  lexicalCases.push({
    ...definition,
    retrievedItems: lexical.items.map((item, index) => ({
      ...item,
      sourceKey: `${lexical.corpusRecords[index].sourceType}:${lexical.corpusRecords[index].sourceId}`,
    })),
  });

  const semantic = await runSemanticRetrievalExperiment({
    adapter,
    allowedScopes: definition.allowedScopes,
    corpusRecords: buildSemanticCorpusRecords(definition.retrievalInput),
    k: definition.k,
    queryText: definition.queryText,
  });
  assert.equal(semantic.runtimeActivation, false);
  assert.equal(semantic.productionReadyClaim, false);
  assert.equal(semantic.embedding.modelId, fixture.embeddingModelId);
  assert.equal(JSON.stringify(semantic).includes('promptContent'), false);
  experimentResults.push(semantic);
  semanticCases.push({
    ...definition,
    retrievedItems: semantic.retrievedItems,
  });
}

const lexicalBaseline = evaluateRetrievalQualitySuite({
  algorithmId: 'hybrid-lexical-bm25-phrase-v1',
  cases: lexicalCases,
  thresholds,
});
const semanticCandidate = evaluateRetrievalQualitySuite({
  algorithmId: `semantic-local-command:${fixture.embeddingModelId}`,
  cases: semanticCases,
  thresholds,
});
const comparison = compareRetrievalQualityEvaluations({
  baseline: lexicalBaseline,
  candidate: semanticCandidate,
});

assert.deepEqual(lexicalBaseline.metrics, fixture.expectedMetrics.lexicalBaseline);
assert.deepEqual(semanticCandidate.metrics, fixture.expectedMetrics.semanticFixture);
assert.equal(lexicalBaseline.status, 'failed');
assert.equal(semanticCandidate.status, 'passed');
assert.equal(comparison.status, 'passed');
assert.deepEqual(comparison.failures, []);
assert.equal(semanticCandidate.metrics.recallAtK > lexicalBaseline.metrics.recallAtK, true);
assert.equal(semanticCandidate.metrics.noiseRateAtK < lexicalBaseline.metrics.noiseRateAtK, true);
assert.equal(
  semanticCandidate.cases.every((result) => result.evidence.missingExpectedSourceKeys.length === 0),
  true,
);

for (const term of [
  'status: user-learning-operator-surface-current',
  '| R3 Optional semantic retrieval | 완료 |',
  '| R4 Reranking | 완료 |',
  '| L1 승인된 학습 데이터 | 완료 |',
  '| L2 Dataset quality gate | 완료 |',
  'fixtures/semantic-retrieval-cases-v1.json',
  'npm run smoke:semantic-retrieval-experiment',
  'runtimeActivation: false',
  'productionReadyClaim: false',
  'externalProviderCalls: none',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:semantic-retrieval-experiment'),
  'README must expose the semantic retrieval experiment command',
);
assert.ok(
  evidenceGallery.includes('| Semantic retrieval experiment | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link semantic retrieval experiment',
);
assert.ok(
  evidenceManifest.includes(
    'Semantic retrieval experiment: verified with `npm run smoke:semantic-retrieval-experiment`',
  ),
  'evidence manifest must record semantic retrieval experiment',
);

console.log(
  JSON.stringify(
    {
      caseCount: fixture.cases.length,
      comparisonStatus: comparison.status,
      costFree: true,
      embeddingModelId: fixture.embeddingModelId,
      lexicalMetrics: lexicalBaseline.metrics,
      mode: 'semantic-retrieval-experiment',
      ok: true,
      productionReadyClaim: false,
      runtimeActivation: false,
      semanticMetrics: semanticCandidate.metrics,
    },
    null,
    2,
  ),
);

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
