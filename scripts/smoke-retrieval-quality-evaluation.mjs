import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildRetrievalQualityBaselineSnapshot,
  compareRetrievalQualityEvaluations,
  evaluateRetrievalQualitySuite,
  formatRetrievalQualityEvaluationReport,
} from '../src/core/retrieval-quality-evaluation.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/retrieval-quality-cases-v1.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(fixture.schemaVersion, 'personal-ai-agent-retrieval-quality-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.cases.length, 3);

for (const definition of fixture.cases) {
  const labeledSourceKeys = [...definition.expectedSources, ...definition.irrelevantSources]
    .map((source) => source.key)
    .sort();
  const inputSourceKeys = [
    ...definition.retrievalInput.memoryEntries.map((entry) => `memory:${entry.id}`),
    ...definition.retrievalInput.attachments.map((attachment) => `attachment:${attachment.id}`),
  ].sort();
  assert.deepEqual(labeledSourceKeys, inputSourceKeys, `${definition.id} must label every fixture source`);
}

function evaluateFixtureCases(caseDefinitions, algorithmId = fixture.algorithmId) {
  const cases = caseDefinitions.map(({ retrievalInput, ...definition }) => {
    const retrieval = buildRetrievalContextWithCorpus(retrievalInput);
    return {
      ...definition,
      retrievedItems: retrieval.items.map((item, index) => ({
        ...item,
        sourceKey: `${retrieval.corpusRecords[index].sourceType}:${retrieval.corpusRecords[index].sourceId}`,
      })),
    };
  });

  return evaluateRetrievalQualitySuite({
    algorithmId,
    cases,
    thresholds: fixture.thresholds,
  });
}

const baseline = evaluateFixtureCases(fixture.cases);
const repeatedBaseline = evaluateFixtureCases(fixture.cases);

assert.deepEqual(repeatedBaseline, baseline);
assert.equal(baseline.status, 'passed');
assert.equal(baseline.productionReadyClaim, false);
assert.equal(baseline.metrics.casePassRate, 1);
assert.equal(baseline.metrics.precisionAtK, 1);
assert.equal(baseline.metrics.recallAtK, 1);
assert.equal(baseline.metrics.noiseRateAtK, 0);
assert.equal(baseline.metrics.sourceDiversityRate, 1);
assert.equal(baseline.metrics.unlabeledRetrievedSourceCount, 0);
assert.deepEqual(buildRetrievalQualityBaselineSnapshot(baseline), fixture.baseline);

for (const result of baseline.cases) {
  assert.deepEqual(result.evidence.missingExpectedSourceKeys, []);
  assert.deepEqual(result.evidence.retrievedIrrelevantSourceKeys, []);
  assert.deepEqual(result.evidence.unlabeledRetrievedSourceKeys, []);
  assert.equal(result.metrics.recallAtK, 1);
  assert.equal(result.metrics.noiseRateAtK, 0);
  assert.equal(result.metrics.sourceDiversityRate, 1);
}

const unchangedCandidate = evaluateFixtureCases(fixture.cases, 'candidate-same-ranking-v1');
const unchangedComparison = compareRetrievalQualityEvaluations({
  baseline,
  candidate: unchangedCandidate,
});
assert.equal(unchangedComparison.status, 'passed');
assert.deepEqual(unchangedComparison.failures, []);

const regressedCases = structuredClone(fixture.cases);
regressedCases[0].retrievalInput.mission.objective = 'Mountain hiking routes and lunch reservations.';
regressedCases[0].retrievalInput.mission.title = 'Weekend planning';
const regressedCandidate = evaluateFixtureCases(regressedCases, 'candidate-regression-v1');
const regressedComparison = compareRetrievalQualityEvaluations({
  baseline,
  candidate: regressedCandidate,
});

assert.equal(regressedCandidate.status, 'failed');
assert.equal(regressedComparison.status, 'failed');
assert.equal(
  regressedComparison.failures.some(
    (failure) => failure.check === 'regression:recallAtK' || failure.check === 'regression:noiseRateAtK',
  ),
  true,
);
assert.equal(
  regressedComparison.failures.some((failure) => failure.check === 'candidate-gate'),
  true,
);

const report = formatRetrievalQualityEvaluationReport(baseline);
assert.match(report, /# Retrieval Quality Evaluation/);
assert.match(report, /algorithmId: hybrid-lexical-bm25-phrase-v1/);
assert.match(report, /precision@k/);
assert.match(report, /recall@k/);
assert.match(report, /noise@k/);
assert.match(report, /source diversity/);
assert.match(report, /productionReadyClaim: false/);

for (const term of [
  'status: retrieval-evaluation-current',
  '| R2 Retrieval evaluation | 완료 |',
  '| R3 Optional semantic retrieval | 다음 |',
  'fixtures/retrieval-quality-cases-v1.json',
  'npm run smoke:retrieval-quality-evaluation',
  'productionReadyClaim: false',
  'externalProviderCalls: none',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:retrieval-quality-evaluation'),
  'README must expose the retrieval quality evaluation command',
);
assert.ok(
  evidenceGallery.includes('| Retrieval quality evaluation | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link retrieval quality evaluation',
);
assert.ok(
  evidenceManifest.includes(
    'Retrieval quality evaluation: verified with `npm run smoke:retrieval-quality-evaluation`',
  ),
  'evidence manifest must record retrieval quality evaluation',
);

console.log(
  JSON.stringify(
    {
      algorithmId: baseline.algorithmId,
      baselineSnapshotMatched: true,
      caseCount: baseline.cases.length,
      costFree: true,
      mode: 'retrieval-quality-evaluation',
      ok: true,
      productionReadyClaim: false,
      regressionGateVerified: true,
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
