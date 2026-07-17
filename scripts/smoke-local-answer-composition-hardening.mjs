import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalAnswerCompositionHardening } from '../src/core/local-answer-composition-hardening.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(readRequiredFile('package.json'));
const evidencePath = 'evidence/output-artifacts/local-answer-composition-hardening.json';
const evidenceText = readRequiredFile(evidencePath);
const evidence = JSON.parse(evidenceText);
const baseline = JSON.parse(
  readRequiredFile('evidence/output-artifacts/local-answer-composition-robustness.json'),
);
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');

assert.equal(
  packageJson.scripts['evaluate:local-answer-composition-hardening'],
  'node scripts/evaluate-local-answer-composition-hardening.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-answer-composition-hardening'],
  'node scripts/smoke-local-answer-composition-hardening.mjs',
);
assert.doesNotThrow(() => assertLocalAnswerCompositionHardening(evidence));
assert.equal(evidence.baseline.evidenceHash, baseline.evidenceHash);
assert.equal(evidence.actualModelEvaluated, true);
assert.equal(evidence.actualModelTrainingExecuted, false);
assert.equal(evidence.candidateHardeningValidated, true);
assert.equal(evidence.currentAnswerPathChanged, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.activation.authorized, false);
assert.equal(evidence.rolloutAuthorized, false);
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.status, 'hardening-passed-governance-blocked');
assert.equal(evidence.decision, 'hold-for-governance');
assert.equal(evidence.evaluation.metrics.casePassRate, 1);
assert.equal(evidence.evaluation.metrics.forbiddenTermMatchCount, 0);
assert.equal(evidence.evaluation.caseResults.length, 10);
assert.equal(evidence.comparison.status, 'improved');
assert.equal(evidence.comparison.regressions.length, 0);
assert.equal(evidence.scenarioResults.length, 5);
assert.equal(evidence.scenarioResults.every((result) => result.status === 'passed'), true);
assert.equal(evidence.q3RegressionQualityValidated, true);
assert.equal(evidence.koreanQualityValidated, true);
assert.equal(evidence.multiDomainQualityValidated, true);
assert.equal(evidence.boundedLongContextValidated, true);
assert.equal(evidence.promptInjectionRobustnessValidated, true);
assert.equal(evidence.generalAnswerQualityImprovementValidated, false);
for (const observation of evidence.observations) {
  assert.equal(observation.reviewActionPresent, true);
  assert.equal(observation.reviewActionSpecific, true);
  assert.equal(observation.sourceCoverageComplete, true);
  const definition = evidence.suite.cases.find((item) => item.id === observation.caseId);
  assert.equal(observation.claimCount, definition.evidenceItemCount);
  assert.equal(
    observation.sanitization.applied,
    definition.promptInjectionCase,
  );
}
assert.doesNotMatch(evidenceText, /\/Users\/|\/private\/|https?:\/\//);
assert.doesNotMatch(
  evidenceText,
  /OBJECTIVE_CANARY_91|INJECTION_CANARY_73|The approved action is a read-only rollback/,
);
assert.doesNotMatch(evidenceText, /sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/);

for (const term of [
  'status: local-answer-composition-hardening-current',
  '| Q4 Answer composition robustness and hardening | 완료 |',
  'npm run evaluate:local-answer-composition-hardening',
  'npm run smoke:local-answer-composition-hardening',
  'candidateHardeningValidated: true',
  'currentAnswerPathChanged: false',
  'actualModelTrainingExecuted: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:local-answer-composition-hardening'),
  'README must expose the local answer composition hardening smoke',
);
assert.ok(
  evidenceGallery.includes('| Answer composition robustness hardening |'),
  'evidence gallery must link the answer composition hardening',
);
assert.ok(
  evidenceManifest.includes(
    'Answer composition robustness hardening: verified with `npm run smoke:local-answer-composition-hardening`',
  ),
  'evidence manifest must record the answer composition hardening',
);

const tampered = structuredClone(evidence);
tampered.observations[0].responseHash = '0'.repeat(64);
assert.throws(() => assertLocalAnswerCompositionHardening(tampered), /integrity/);

console.log(
  JSON.stringify(
    {
      candidateHardeningValidated: evidence.candidateHardeningValidated,
      casePassRate: evidence.evaluation.metrics.casePassRate,
      currentAnswerPathChanged: evidence.currentAnswerPathChanged,
      decision: evidence.decision,
      evidenceHash: evidence.evidenceHash,
      mode: 'local-answer-composition-hardening-smoke',
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
