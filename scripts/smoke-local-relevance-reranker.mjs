import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';
import { assertLocalRelevanceRerankerEvaluation } from '../src/core/local-relevance-reranker-evaluation.mjs';
import { assertLocalRetrievalRobustnessEvaluation } from '../src/core/retrieval-robustness-evaluation.mjs';

const repoDir = process.cwd();
const evidencePath = 'evidence/output-artifacts/local-relevance-reranker-evaluation.json';
const priorPath = 'evidence/output-artifacts/local-retrieval-robustness.json';
const qualificationPath = 'evidence/output-artifacts/local-embedding-model-qualification.json';
const evidenceText = readRequiredFile(evidencePath);
const evaluation = JSON.parse(evidenceText);
const prior = JSON.parse(readRequiredFile(priorPath));
const qualification = JSON.parse(readRequiredFile(qualificationPath));
const packageJson = JSON.parse(readRequiredFile('package.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(
  packageJson.scripts['evaluate:local-relevance-reranker'],
  'node scripts/evaluate-local-relevance-reranker.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-relevance-reranker'],
  'node scripts/smoke-local-relevance-reranker.mjs',
);
assert.doesNotThrow(() => assertLocalEmbeddingModelQualification(qualification));
assert.doesNotThrow(() => assertLocalRetrievalRobustnessEvaluation(prior));
assert.doesNotThrow(() => assertLocalRelevanceRerankerEvaluation(evaluation));
assert.equal(evaluation.status, 'quality-passed-governance-blocked');
assert.equal(evaluation.decision, 'hold-for-governance');
assert.equal(evaluation.actualLocalRelevanceRerankerQualityValidated, true);
assert.equal(evaluation.actualLocalRelevanceRerankerQualified, false);
assert.equal(evaluation.activation.authorized, false);
assert.equal(evaluation.runtimeActivation, false);
assert.equal(evaluation.productionReadyClaim, false);
assert.equal(evaluation.runtime.cloudFeaturesDisabled, true);
assert.equal(evaluation.runtime.networkIsolation, 'not-proven');
assert.equal(evaluation.runtime.externalProviderCalls, 'none');
assert.equal(evaluation.scorer.modelId, qualification.selection.modelId);
assert.equal(evaluation.candidateEvaluation.model.digest, prior.model.digest);
assert.equal(
  evaluation.candidateEvaluation.model.qualificationHash,
  qualification.qualificationHash,
);
assert.equal(evaluation.priorEvaluation.evaluationHash, prior.evaluationHash);
assert.equal(evaluation.caseScores.length, 15);
assert.equal(evaluation.caseScores.every((item) => item.repeatedScoreMatch), true);
assert.equal(evaluation.caseScores.every((item) => item.sourceScores.length === 3), true);
assert.equal(evaluation.latency.modelInferenceCount, 90);
assert.equal(evaluation.latency.rerankPassCount, 30);
assert.equal(evaluation.latency.totalMs > 0, true);
assert.deepEqual(evaluation.candidateEvaluation.candidate.metrics, {
  casePassRate: 1,
  noiseRateAtK: 0,
  precisionAtK: 1,
  recallAtK: 1,
  sourceDiversityRate: 1,
  unlabeledRetrievedSourceCount: 0,
});
assert.equal(evaluation.candidateEvaluation.variationMetrics['hard-negative'].casePassRate, 1);
assert.deepEqual(evaluation.improvement, {
  overLexicalCasePassRate: 0.3333,
  overPriorCandidateCasePassRate: 0.4667,
});

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
  'status: approved-learning-feedback-quality-current',
  '| R8 Local relevance reranker evaluation | 완료 |',
  'actualLocalRelevanceRerankerQualityValidated: true',
  'actualLocalRelevanceRerankerQualified: false',
  'npm run evaluate:local-relevance-reranker',
  'npm run smoke:local-relevance-reranker',
  'quality-passed-governance-blocked',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-relevance-reranker'),
  'README must expose the local relevance reranker smoke',
);
assert.ok(
  evidenceGallery.includes('| Local relevance reranker |'),
  'evidence gallery must link local relevance reranker evidence',
);
assert.ok(
  evidenceManifest.includes(
    'Local relevance reranker: verified with `npm run smoke:local-relevance-reranker`',
  ),
  'evidence manifest must record local relevance reranker verification',
);

console.log(
  JSON.stringify(
    {
      activationAuthorized: evaluation.activation.authorized,
      actualLocalRelevanceRerankerQualified:
        evaluation.actualLocalRelevanceRerankerQualified,
      actualLocalRelevanceRerankerQualityValidated:
        evaluation.actualLocalRelevanceRerankerQualityValidated,
      candidateCasePassRate: evaluation.candidateEvaluation.candidate.metrics.casePassRate,
      caseCount: evaluation.caseScores.length,
      mode: 'local-relevance-reranker-smoke',
      modelInferenceCount: evaluation.latency.modelInferenceCount,
      ok: true,
      productionReadyClaim: false,
      repeatStable: true,
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
