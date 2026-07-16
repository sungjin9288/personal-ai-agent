import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';
import { assertLocalRelevanceRerankerEvaluation } from '../src/core/local-relevance-reranker-evaluation.mjs';
import { assertLocalRerankerResourceEnvelope } from '../src/core/local-reranker-resource-envelope.mjs';

const repoDir = process.cwd();
const evidencePath = 'evidence/output-artifacts/local-reranker-resource-envelope.json';
const priorPath = 'evidence/output-artifacts/local-relevance-reranker-evaluation.json';
const qualificationPath = 'evidence/output-artifacts/local-embedding-model-qualification.json';
const evidenceText = readRequiredFile(evidencePath);
const envelope = JSON.parse(evidenceText);
const prior = JSON.parse(readRequiredFile(priorPath));
const qualification = JSON.parse(readRequiredFile(qualificationPath));
const packageJson = JSON.parse(readRequiredFile('package.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(
  packageJson.scripts['evaluate:local-reranker-resource-envelope'],
  'node scripts/evaluate-local-reranker-resource-envelope.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-reranker-resource-envelope'],
  'node scripts/smoke-local-reranker-resource-envelope.mjs',
);
assert.doesNotThrow(() => assertLocalEmbeddingModelQualification(qualification));
assert.doesNotThrow(() => assertLocalRelevanceRerankerEvaluation(prior));
assert.doesNotThrow(() => assertLocalRerankerResourceEnvelope(envelope));
assert.equal(envelope.status, 'resource-envelope-passed-governance-blocked');
assert.equal(envelope.decision, 'hold-shortlist-for-governance');
assert.equal(envelope.actualLocalRerankerResourceEnvelopeValidated, true);
assert.equal(envelope.actualLocalRerankerResourceEnvelopeQualified, false);
assert.equal(envelope.activation.authorized, false);
assert.equal(envelope.runtimeActivation, false);
assert.equal(envelope.productionReadyClaim, false);
assert.equal(envelope.runtime.cloudFeaturesDisabled, true);
assert.equal(envelope.runtime.networkIsolation, 'not-proven');
assert.equal(envelope.runtime.externalProviderCalls, 'none');
assert.equal(envelope.qualityParity, true);
assert.equal(envelope.repeatStable, true);
assert.equal(envelope.shortlistCoveragePassed, true);
assert.equal(envelope.selectionRecords.length, 15);
assert.equal(envelope.selectionRecords.every((item) => item.inputCandidateCount === 3), true);
assert.equal(envelope.selectionRecords.every((item) => item.selectedCandidateCount === 2), true);
assert.equal(envelope.selectionRecords.every((item) => item.expectedSourceRetained), true);
assert.equal(envelope.caseScores.every((item) => item.sourceScores.length === 2), true);
assert.equal(envelope.latency.modelInferenceCount, 60);
assert.equal(envelope.latency.rerankPassCount, 30);
assert.equal(envelope.comparison.priorModelInferenceCount, 90);
assert.equal(envelope.comparison.inferenceReductionRate, 0.3333);
assert.equal(envelope.comparison.p50ReductionRate > 0, true);
assert.equal(envelope.comparison.p95ReductionRate > 0, true);
assert.equal(envelope.comparison.totalReductionRate > 0, true);
assert.equal(envelope.latency.maximumMs > envelope.priorEvaluation.latency.maximumMs, true);
assert.equal(envelope.optimizedEvaluation.candidate.metrics.casePassRate, 1);
assert.equal(envelope.optimizedEvaluation.variationMetrics['hard-negative'].casePassRate, 1);
assert.equal(
  envelope.optimizedEvaluation.baseline.evaluationHash,
  prior.candidateEvaluation.candidate.evaluationHash,
);
assert.equal(envelope.resourceSnapshot.modelId, qualification.selection.modelId);
assert.equal(
  envelope.resourceSnapshot.modelDigest,
  envelope.optimizedEvaluation.model.digest,
);
const qualifiedCandidate = qualification.candidates.find(
  (item) => item.modelId === envelope.resourceSnapshot.modelId,
);
assert.ok(qualifiedCandidate);
assert.equal(envelope.resourceSnapshot.modelArtifactBytes, qualifiedCandidate.modelSizeBytes);
assert.equal(envelope.resourceSnapshot.loadedModelBytes > 0, true);
assert.equal(envelope.resourceSnapshot.loadedModelVramBytes >= 0, true);
assert.equal(envelope.resourceSnapshot.contextLength, 4096);
assertCliFailure(
  ['--endpoint', 'https://example.com', '--model', 'qwen2.5:3b'],
  /loopback HTTP origin/,
);
assertCliFailure(
  [
    '--endpoint',
    'http://127.0.0.1:1',
    '--model',
    'qwen2.5:3b',
    '--output',
    '../resource-envelope-escape.json',
  ],
  /output must stay inside the repository/,
);
assertCliFailure(
  ['--endpoint', 'http://127.0.0.1:1', '--model', 'qwen2.5:3b', '--unknown', 'value'],
  /Expected unique resource envelope options/,
);

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
  'status: workspace-learning-operator-override-current',
  '| R9 Local reranker resource envelope | 완료 |',
  'actualLocalRerankerResourceEnvelopeValidated: true',
  'actualLocalRerankerResourceEnvelopeQualified: false',
  'npm run evaluate:local-reranker-resource-envelope',
  'npm run smoke:local-reranker-resource-envelope',
  'resource-envelope-passed-governance-blocked',
  'maximum 관측치는 R8보다 커졌으므로',
  '1643.582ms',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-reranker-resource-envelope'),
  'README must expose the local reranker resource envelope smoke',
);
assert.ok(
  readme.includes('maximum observation increased from 1462.735ms to 1643.582ms'),
  'README must disclose the measured maximum-latency regression',
);
assert.ok(
  evidenceGallery.includes('| Local reranker resource envelope |'),
  'evidence gallery must link local reranker resource evidence',
);
assert.ok(
  evidenceManifest.includes(
    'Local reranker resource envelope: verified with `npm run smoke:local-reranker-resource-envelope`',
  ),
  'evidence manifest must record local reranker resource verification',
);

console.log(
  JSON.stringify(
    {
      activationAuthorized: envelope.activation.authorized,
      actualLocalRerankerResourceEnvelopeQualified:
        envelope.actualLocalRerankerResourceEnvelopeQualified,
      actualLocalRerankerResourceEnvelopeValidated:
        envelope.actualLocalRerankerResourceEnvelopeValidated,
      inferenceReductionRate: envelope.comparison.inferenceReductionRate,
      mode: 'local-reranker-resource-envelope-smoke',
      modelInferenceCount: envelope.latency.modelInferenceCount,
      ok: true,
      productionReadyClaim: false,
      qualityParity: envelope.qualityParity,
      status: envelope.status,
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

function assertCliFailure(args, pattern) {
  const result = spawnSync(
    process.execPath,
    ['scripts/evaluate-local-reranker-resource-envelope.mjs', ...args],
    { cwd: repoDir, encoding: 'utf8' },
  );
  assert.notEqual(result.status, 0, `resource envelope CLI unexpectedly passed: ${args.join(' ')}`);
  assert.match(`${result.stdout}\n${result.stderr}`, pattern);
}
