import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateAnswerQualitySuite,
  formatAnswerQualityEvaluationReport,
} from '../src/core/answer-quality-evaluation.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/answer-quality-cases-v1.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(fixture.schemaVersion, 'personal-ai-agent-answer-quality-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);
assert.equal(fixture.cases.length, 2);

const evaluatedCases = fixture.cases.map(({ retrievalInput, ...definition }) => ({
  ...definition,
  retrievedItems: buildRetrievalContext(retrievalInput),
}));
const evaluation = evaluateAnswerQualitySuite({
  cases: evaluatedCases,
  thresholds: fixture.thresholds,
});

assert.equal(evaluation.status, 'passed');
assert.equal(evaluation.productionReadyClaim, false);
assert.equal(evaluation.summary.caseCount, 2);
assert.equal(evaluation.summary.metrics.casePassRate, 1);
assert.equal(evaluation.summary.metrics.retrievalHitRate, 1);
assert.equal(evaluation.summary.metrics.expectedSourceCitationRate, 1);
assert.equal(evaluation.summary.metrics.citationGroundingRate, 1);
assert.equal(evaluation.summary.metrics.requiredTermCoverage, 1);
assert.equal(evaluation.summary.metrics.unsupportedCitationRate, 0);
assert.equal(evaluation.summary.metrics.forbiddenRetrievedSourceCount, 0);
assert.equal(evaluation.summary.metrics.forbiddenTermMatchCount, 0);

for (const result of evaluation.cases) {
  assert.deepEqual(result.evidence.matchedForbiddenRetrievedSourceKeys, []);
  assert.deepEqual(result.evidence.matchedForbiddenTerms, []);
  assert.deepEqual(result.evidence.unsupportedCitationKeys, []);
}

const report = formatAnswerQualityEvaluationReport(evaluation);
assert.match(report, /# Answer Quality Evaluation/);
assert.match(report, /productionReadyClaim: false/);
assert.match(report, /provider-drift-recovery \| passed/);
assert.match(report, /fact-revision-provenance \| passed/);

const regressedCases = structuredClone(evaluatedCases);
regressedCases[0].answer.text = 'Provider drift remains unresolved.';
regressedCases[0].answer.citedSourceKeys = ['attachment:invented-source.md'];
regressedCases[0].reviewerVerdict = 'fail';

const regression = evaluateAnswerQualitySuite({
  cases: regressedCases,
  thresholds: fixture.thresholds,
});

assert.equal(regression.status, 'failed');
assert.ok(regression.failures.some((failure) => failure.check === 'case-pass-rate'));
assert.ok(regression.failures.some((failure) => failure.check === 'expected-source-citation-rate'));
assert.ok(regression.failures.some((failure) => failure.check === 'citation-grounding-rate'));
assert.ok(regression.failures.some((failure) => failure.check === 'required-term-coverage'));
assert.ok(regression.failures.some((failure) => failure.check === 'unsupported-citation-rate'));
assert.ok(regression.failures.some((failure) => failure.check === 'reviewer-failure-count'));

for (const term of [
  '# ML, RAG, and Fine-tuning Development Plan v1',
  'status: local-relevance-shadow-cache-process-isolation-current',
  '| Q1 Answer quality foundation | 완료 |',
  'productionReadyClaim: false',
  'costFreeDefault: true',
  'retrieval hit rate',
  'expected source citation rate',
  'citation grounding rate',
  'required term coverage',
  'unsupported citation rate',
  '승인된 학습 데이터',
  '외부 fine-tuning 실행',
  'npm run smoke:answer-quality-evaluation',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}

assert.ok(
  readme.includes('ML/RAG and fine-tuning development plan: [docs/ml-rag-development-plan-v1.md](docs/ml-rag-development-plan-v1.md)'),
  'README must link the ML/RAG development plan',
);
assert.ok(
  readme.includes('npm run smoke:answer-quality-evaluation'),
  'README must expose the answer quality evaluation command',
);
assert.ok(
  evidenceGallery.includes('| Answer quality evaluation foundation | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link the answer quality evaluation foundation',
);
assert.ok(
  evidenceManifest.includes('Answer quality evaluation foundation: verified with `npm run smoke:answer-quality-evaluation`'),
  'evidence manifest must record the answer quality evaluation command',
);

console.log(
  JSON.stringify(
    {
      caseCount: evaluation.summary.caseCount,
      costFree: true,
      mode: 'answer-quality-evaluation-smoke',
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
