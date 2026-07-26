import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalAnswerQualityBaseline } from '../src/core/local-answer-quality-baseline.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const evidencePath = 'evidence/output-artifacts/local-answer-quality-baseline.json';
const evidenceText = readRequiredFile(evidencePath);
const evidence = JSON.parse(evidenceText);
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(
  packageJson.scripts['evaluate:local-answer-quality-baseline'],
  'node scripts/evaluate-local-answer-quality-baseline.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-answer-quality-baseline'],
  'node scripts/smoke-local-answer-quality-baseline.mjs',
);
assert.doesNotThrow(() => assertLocalAnswerQualityBaseline(evidence));
assert.equal(evidence.actualModelEvaluated, true);
assert.equal(evidence.actualModelTrainingExecuted, false);
assert.equal(evidence.actualLocalAnswerModelQualityValidated, false);
assert.equal(evidence.actualLocalAnswerModelQualified, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.runtime.transportLoopback, true);
assert.equal(evidence.runtime.cloudFeaturesDisabled, true);
assert.equal(evidence.model.id, 'qwen2.5:3b');
assert.equal(evidence.activation.authorized, false);
assert.equal(evidence.rolloutAuthorized, false);
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.status, 'quality-regressed-keep-current');
assert.equal(evidence.decision, 'keep-current-answer-path');
assert.equal(evidence.candidateGate.status, 'rollback-required');
assert.equal(evidence.candidateGate.comparison.status, 'failed');
assert.equal(evidence.activation.blockerCheckIds[0], 'candidate-quality-passed');
assert.equal(evidence.observations.length, 2);
assert.deepEqual(
  evidence.observations.map((observation) => observation.caseId),
  ['fact-revision-provenance', 'provider-drift-recovery'],
);
for (const result of evidence.candidateGate.candidate.evaluation.caseResults) {
  assert.equal(result.status, 'failed');
  assert.equal(result.metrics.retrievalHitRate, 1);
  assert.equal(result.metrics.expectedSourceCitationRate, 1);
  assert.equal(result.metrics.citationGroundingRate, 1);
  assert.equal(result.metrics.requiredTermCoverage, 0.6667);
  assert.equal(result.metrics.unsupportedCitationRate, 0);
  assert.equal(result.metrics.forbiddenTermMatchCount, 0);
}
assert.doesNotMatch(evidenceText, /\/Users\/|\/private\/|https?:\/\//);
assert.doesNotMatch(evidenceText, /Prompt normalization resolved provider drift during/);
assert.doesNotMatch(evidenceText, /Temporal fact graph provenance keeps/);
assert.doesNotMatch(evidenceText, /sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/);

for (const term of [
  'status: local-answer-input-boundary-current',
  '| Q2 Actual local answer-quality baseline | 완료 |',
  'npm run evaluate:local-answer-quality-baseline',
  'npm run smoke:local-answer-quality-baseline',
  'actualModelEvaluated: true',
  'actualModelTrainingExecuted: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-answer-quality-baseline'),
  'README must expose the local answer quality baseline smoke',
);
assert.ok(
  evidenceGallery.includes('| Actual local answer-quality baseline |'),
  'evidence gallery must link the local answer quality baseline',
);
assert.ok(
  evidenceManifest.includes(
    'Actual local answer-quality baseline: verified with `npm run smoke:local-answer-quality-baseline`',
  ),
  'evidence manifest must record the local answer quality baseline',
);

const tampered = structuredClone(evidence);
tampered.observations[0].responseHash = '0'.repeat(64);
assert.throws(() => assertLocalAnswerQualityBaseline(tampered), /integrity/);

console.log(
  JSON.stringify(
    {
      actualLocalAnswerModelQualified: evidence.actualLocalAnswerModelQualified,
      actualLocalAnswerModelQualityValidated: evidence.actualLocalAnswerModelQualityValidated,
      actualModelEvaluated: evidence.actualModelEvaluated,
      actualModelTrainingExecuted: evidence.actualModelTrainingExecuted,
      decision: evidence.decision,
      evidenceHash: evidence.evidenceHash,
      mode: 'local-answer-quality-baseline-smoke',
      ok: true,
      productionReadyClaim: evidence.productionReadyClaim,
      status: evidence.status,
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
