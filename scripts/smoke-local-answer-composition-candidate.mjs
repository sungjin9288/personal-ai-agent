import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalAnswerCompositionCandidate } from '../src/core/local-answer-composition-candidate.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const evidencePath = 'evidence/output-artifacts/local-answer-composition-candidate.json';
const evidenceText = readRequiredFile(evidencePath);
const evidence = JSON.parse(evidenceText);
const baseline = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-answer-quality-baseline.json'),
);
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(
  packageJson.scripts['evaluate:local-answer-composition-candidate'],
  'node scripts/evaluate-local-answer-composition-candidate.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-answer-composition-candidate'],
  'node scripts/smoke-local-answer-composition-candidate.mjs',
);
assert.doesNotThrow(() => assertLocalAnswerCompositionCandidate(evidence));
assert.equal(evidence.baseline.evidenceHash, baseline.evidenceHash);
assert.equal(evidence.actualModelEvaluated, true);
assert.equal(evidence.actualModelTrainingExecuted, false);
assert.equal(evidence.candidateQualityValidated, true);
assert.equal(evidence.currentAnswerPathChanged, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.runtime.transportLoopback, true);
assert.equal(evidence.runtime.cloudFeaturesDisabled, true);
assert.equal(evidence.activation.authorized, false);
assert.equal(evidence.rolloutAuthorized, false);
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.status, 'quality-improved-governance-blocked');
assert.equal(evidence.decision, 'hold-for-governance');
assert.equal(evidence.candidateGate.status, 'ready-for-review');
assert.equal(evidence.candidateGate.comparison.status, 'passed');
assert.equal(evidence.comparison.status, 'improved');
assert.equal(evidence.comparison.regressions.length, 0);
assert.equal(evidence.observations.length, 2);
for (const observation of evidence.observations) {
  assert.equal(observation.claimCount, 2);
  assert.equal(observation.reviewActionPresent, true);
  assert.equal(observation.sourceCoverageComplete, true);
}
for (const result of evidence.candidateGate.candidate.evaluation.caseResults) {
  assert.equal(result.status, 'passed');
  assert.equal(result.metrics.retrievalHitRate, 1);
  assert.equal(result.metrics.expectedSourceCitationRate, 1);
  assert.equal(result.metrics.citationGroundingRate, 1);
  assert.equal(result.metrics.requiredTermCoverage, 1);
  assert.equal(result.metrics.unsupportedCitationRate, 0);
  assert.equal(result.metrics.forbiddenTermMatchCount, 0);
}
assert.doesNotMatch(evidenceText, /\/Users\/|\/private\/|https?:\/\//);
assert.doesNotMatch(evidenceText, /Prompt normalization resolved provider drift during/);
assert.doesNotMatch(evidenceText, /Temporal fact graph provenance keeps/);
assert.doesNotMatch(evidenceText, /sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/);

for (const term of [
  'status: local-answer-composition-candidate-current',
  '| Q3 Evidence-first answer composition | 완료 |',
  'npm run evaluate:local-answer-composition-candidate',
  'npm run smoke:local-answer-composition-candidate',
  'candidateQualityValidated: true',
  'currentAnswerPathChanged: false',
  'actualModelTrainingExecuted: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-answer-composition-candidate'),
  'README must expose the local answer composition candidate smoke',
);
assert.ok(
  evidenceGallery.includes('| Evidence-first answer composition candidate |'),
  'evidence gallery must link the answer composition candidate',
);
assert.ok(
  evidenceManifest.includes(
    'Evidence-first answer composition candidate: verified with `npm run smoke:local-answer-composition-candidate`',
  ),
  'evidence manifest must record the answer composition candidate',
);

const tampered = structuredClone(evidence);
tampered.observations[0].responseHash = '0'.repeat(64);
assert.throws(() => assertLocalAnswerCompositionCandidate(tampered), /integrity/);

console.log(
  JSON.stringify(
    {
      candidateQualityValidated: evidence.candidateQualityValidated,
      currentAnswerPathChanged: evidence.currentAnswerPathChanged,
      decision: evidence.decision,
      evidenceHash: evidence.evidenceHash,
      mode: 'local-answer-composition-candidate-smoke',
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
