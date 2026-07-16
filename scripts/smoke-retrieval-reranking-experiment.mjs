import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { createLocalCommandEmbeddingAdapter } from '../src/core/embedding-adapter.mjs';
import { rerankRetrievalCandidates } from '../src/core/retrieval-reranker.mjs';
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
const fixture = JSON.parse(readRequiredFile('fixtures/reranking-cases-v1.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(fixture.schemaVersion, 'personal-ai-agent-retrieval-reranking-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.runtimeActivation, false);
assert.equal(fixture.cases.length, 3);

const adapter = createLocalCommandEmbeddingAdapter({
  args: [path.join(repoDir, 'fixtures', 'local-embedding-command.mjs')],
  command: process.execPath,
});
const thresholds = {
  maximumNoiseRateAtK: 0,
  maximumUnlabeledRetrievedSourceCount: 0,
  minimumCasePassRate: 1,
  minimumPrecisionAtK: 1,
  minimumRecallAtK: 1,
  minimumSourceDiversityRate: 1,
};
const semanticCases = [];
const rerankedCases = [];
const rerankingInputs = [];
let semanticDurationMs = 0;

for (const definition of fixture.cases) {
  const corpusRecords = buildSemanticCorpusRecords(definition.retrievalInput);
  const semanticStartedAt = performance.now();
  const semantic = await runSemanticRetrievalExperiment({
    adapter,
    allowedScopes: definition.allowedScopes,
    corpusRecords,
    k: corpusRecords.length,
    queryText: definition.retrievalInput.mission.objective,
  });
  semanticDurationMs += performance.now() - semanticStartedAt;

  const lexical = buildRetrievalContextWithCorpus(definition.retrievalInput);
  const lexicalScoreBySource = new Map(
    lexical.items.map((item, index) => {
      const record = lexical.corpusRecords[index];
      return [`${record.sourceType}:${record.sourceId}`, Number(item.score || 0)];
    }),
  );
  const candidates = semantic.retrievedItems.map((item) => ({
    baselineRank: item.rank,
    chunkId: item.chunkId,
    corpusId: item.corpusId,
    lexicalScore: lexicalScoreBySource.get(item.sourceKey) || 0,
    semanticScore: item.score,
    sourceId: item.sourceId,
    sourceKey: item.sourceKey,
    sourceLabel: item.sourceLabel,
    sourceType: item.sourceType,
  }));
  const reranked = rerankRetrievalCandidates({
    baselineAlgorithmId: semantic.algorithmId,
    candidates,
    k: definition.k,
  });
  const baselineItems = semantic.retrievedItems.slice(0, definition.k);

  assert.deepEqual(
    reranked.rollback.sourceKeys,
    baselineItems.map((item) => item.sourceKey),
    `${definition.id} rollback must reproduce baseline order`,
  );
  assert.equal(reranked.runtimeActivation, false);
  assert.equal(reranked.productionReadyClaim, false);
  assert.equal(JSON.stringify(reranked).includes('promptContent'), false);

  semanticCases.push({ ...definition, retrievedItems: baselineItems });
  rerankedCases.push({ ...definition, retrievedItems: reranked.retrievedItems });
  rerankingInputs.push({ baselineAlgorithmId: semantic.algorithmId, candidates, k: definition.k });
}

const semanticBaseline = evaluateRetrievalQualitySuite({
  algorithmId: 'semantic-fixture-tie-baseline-v1',
  cases: semanticCases,
  thresholds,
});
const rerankedCandidate = evaluateRetrievalQualitySuite({
  algorithmId: 'semantic-lexical-weighted-v1',
  cases: rerankedCases,
  thresholds,
});
const comparison = compareRetrievalQualityEvaluations({
  baseline: semanticBaseline,
  candidate: rerankedCandidate,
});

assert.deepEqual(semanticBaseline.metrics, fixture.expectedMetrics.semanticBaseline);
assert.deepEqual(rerankedCandidate.metrics, fixture.expectedMetrics.rerankedCandidate);
assert.equal(semanticBaseline.status, 'failed');
assert.equal(rerankedCandidate.status, 'passed');
assert.equal(comparison.status, 'passed');
assert.deepEqual(comparison.failures, []);

const benchmarkStartedAt = performance.now();
for (let iteration = 0; iteration < fixture.benchmarkIterations; iteration += 1) {
  for (const input of rerankingInputs) {
    rerankRetrievalCandidates(input);
  }
}
const rerankingDurationMs = performance.now() - benchmarkStartedAt;
const semanticAverageMs = semanticDurationMs / fixture.cases.length;
const rerankingAverageMs = rerankingDurationMs / (fixture.benchmarkIterations * rerankingInputs.length);
assert.equal(Number.isFinite(semanticAverageMs), true);
assert.equal(Number.isFinite(rerankingAverageMs), true);
assert.equal(rerankingAverageMs < semanticAverageMs, true);

for (const term of [
  'status: user-learning-operator-override-current',
  '| R4 Reranking | 완료 |',
  '| L1 승인된 학습 데이터 | 완료 |',
  '| L2 Dataset quality gate | 완료 |',
  'fixtures/reranking-cases-v1.json',
  'npm run smoke:retrieval-reranking-experiment',
  'runtimeActivation: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:retrieval-reranking-experiment'),
  'README must expose the retrieval reranking experiment command',
);
assert.ok(
  evidenceGallery.includes('| Retrieval reranking experiment | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link retrieval reranking experiment',
);
assert.ok(
  evidenceManifest.includes(
    'Retrieval reranking experiment: verified with `npm run smoke:retrieval-reranking-experiment`',
  ),
  'evidence manifest must record retrieval reranking experiment',
);

console.log(
  JSON.stringify(
    {
      caseCount: fixture.cases.length,
      comparisonStatus: comparison.status,
      costFree: true,
      latency: {
        rerankingAverageMs: Number(rerankingAverageMs.toFixed(6)),
        semanticAverageMs: Number(semanticAverageMs.toFixed(3)),
      },
      mode: 'retrieval-reranking-experiment',
      ok: true,
      productionReadyClaim: false,
      rerankedMetrics: rerankedCandidate.metrics,
      rollbackStrategy: 'bypass-reranker',
      runtimeActivation: false,
      semanticBaselineMetrics: semanticBaseline.metrics,
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
