import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';
import { assertLocalRetrievalRobustnessEvaluation } from '../src/core/retrieval-robustness-evaluation.mjs';

const repoDir = process.cwd();
const evidencePath = 'evidence/output-artifacts/local-retrieval-robustness.json';
const qualificationPath = 'evidence/output-artifacts/local-embedding-model-qualification.json';
const evidenceText = readRequiredFile(evidencePath);
const evaluation = JSON.parse(evidenceText);
const qualification = JSON.parse(readRequiredFile(qualificationPath));
const packageJson = JSON.parse(readRequiredFile('package.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(
  packageJson.scripts['evaluate:local-retrieval-robustness'],
  'node scripts/evaluate-local-retrieval-robustness.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-retrieval-robustness'],
  'node scripts/smoke-local-retrieval-robustness.mjs',
);
assert.doesNotThrow(() => assertLocalEmbeddingModelQualification(qualification));
assert.doesNotThrow(() => assertLocalRetrievalRobustnessEvaluation(evaluation));
assert.equal(evaluation.candidate.cases.length, 15);
assert.equal(evaluation.coverage.scenarioCount, 3);
assert.equal(evaluation.coverage.matrixComplete, true);
assert.equal(evaluation.coverage.passed, true);
assert.deepEqual(evaluation.coverage.variationCounts, {
  canonical: 3,
  paraphrase: 3,
  'noisy-query': 3,
  'cross-language': 3,
  'hard-negative': 3,
});
assert.equal(evaluation.model.id, qualification.selection.modelId);
assert.equal(evaluation.model.digest, qualification.candidates.find(
  (candidate) => candidate.modelId === evaluation.model.id,
)?.modelDigest);
assert.equal(evaluation.model.qualificationHash, qualification.qualificationHash);
assert.equal(evaluation.model.qualificationStatus, 'governance-blocked');
assert.equal(evaluation.model.qualified, false);
assert.equal(evaluation.actualLocalRetrievalRobustnessValidated, false);
assert.equal(evaluation.status, 'failed-keep-lexical');
assert.equal(evaluation.decision, 'keep-lexical');
assert.equal(evaluation.activation.authorized, false);
assert.equal(evaluation.rollback.mode, 'lexical');
assert.equal(evaluation.productionReadyClaim, false);
assert.equal(evaluation.runtime.transportLoopback, true);
assert.equal(evaluation.runtime.cloudFeaturesDisabled, true);
assert.equal(evaluation.runtime.networkIsolation, 'not-proven');
assert.equal(evaluation.runtime.externalProviderCalls, 'none');
assert.deepEqual(evaluation.baseline.metrics, {
  casePassRate: 0.6667,
  noiseRateAtK: 0.3333,
  precisionAtK: 0.6667,
  recallAtK: 0.6667,
  sourceDiversityRate: 0.6667,
  unlabeledRetrievedSourceCount: 0,
});
assert.deepEqual(evaluation.candidate.metrics, {
  casePassRate: 0.5333,
  noiseRateAtK: 0.4667,
  precisionAtK: 0.5333,
  recallAtK: 0.5333,
  sourceDiversityRate: 0.5333,
  unlabeledRetrievedSourceCount: 0,
});
assert.equal(evaluation.variationMetrics['hard-negative'].casePassRate, 0);
assert.equal(evaluation.candidate.cases.filter((item) => item.status === 'failed').length, 7);
assert.equal(evaluation.baseline.cases.filter((item) => item.status === 'failed').length, 5);
assert.equal(evaluation.latency.caseCount, 15);
assert.equal(evaluation.latency.totalMs > 0, true);

for (const forbiddenText of [
  'expird auth token',
  '만료된 인증 토큰',
  'blue button',
  'Lunch menu',
  '/Users/',
  '/private/',
  'http://',
  'https://',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
]) {
  assert.equal(evidenceText.includes(forbiddenText), false, `evidence leaked ${forbiddenText}`);
}

for (const term of [
  'status: approved-learning-rag-feedback-current',
  '| R7 Retrieval robustness evaluation | 완료 |',
  'actualLocalRetrievalRobustnessValidated: false',
  'fixtures/retrieval-robustness-cases-v1.json',
  'npm run evaluate:local-retrieval-robustness',
  'npm run smoke:local-retrieval-robustness',
  'failed-keep-lexical',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-retrieval-robustness'),
  'README must expose the retrieval robustness smoke',
);
assert.ok(
  evidenceGallery.includes('| Local retrieval robustness |'),
  'evidence gallery must link local retrieval robustness',
);
assert.ok(
  evidenceManifest.includes(
    'Local retrieval robustness: verified with `npm run smoke:local-retrieval-robustness`',
  ),
  'evidence manifest must record local retrieval robustness',
);

console.log(
  JSON.stringify(
    {
      activationAuthorized: evaluation.activation.authorized,
      actualLocalRetrievalRobustnessValidated:
        evaluation.actualLocalRetrievalRobustnessValidated,
      baselineCasePassRate: evaluation.baseline.metrics.casePassRate,
      candidateCasePassRate: evaluation.candidate.metrics.casePassRate,
      caseCount: evaluation.candidate.cases.length,
      decision: evaluation.decision,
      mode: 'local-retrieval-robustness-smoke',
      ok: true,
      productionReadyClaim: false,
      status: evaluation.status,
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
