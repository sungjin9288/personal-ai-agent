import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  assertLocalAnswerReviewActionGeneralization,
} from '../src/core/local-answer-review-action-generalization.mjs';

const evidenceText = fs.readFileSync(
  'evidence/output-artifacts/local-answer-review-action-generalization.json',
  'utf8',
);
const evidence = JSON.parse(evidenceText);
const q4Baseline = readJson(
  'evidence/output-artifacts/local-answer-composition-boundary-regression.json',
);
const q6Baseline = readJson(
  'evidence/output-artifacts/local-user-query-quality.json',
);
const fixture = readJson(
  'fixtures/user-query-evaluation-intake-dry-run-v1.json',
);
const packageJson = readJson('package.json');
const readme = fs.readFileSync('README.md', 'utf8');
const developmentPlan = fs.readFileSync(
  'docs/ml-rag-development-plan-v1.md',
  'utf8',
);
const evidenceGallery = fs.readFileSync('docs/evidence-gallery.md', 'utf8');
const evidenceManifest = fs.readFileSync(
  'evidence/evidence_manifest.md',
  'utf8',
);

assertLocalAnswerReviewActionGeneralization(evidence);
assert.equal(
  evidence.baselines.q4.evidenceHash,
  q4Baseline.evidenceHash,
);
assert.equal(
  evidence.baselines.q6.evidenceHash,
  q6Baseline.evidenceHash,
);
assert.equal(evidence.reviewActionGeneralizationValidated, true);
assert.equal(evidence.localUserQueryEvaluationValidated, true);
assert.equal(evidence.syntheticUserQueryQualityValidated, true);
assert.equal(evidence.actualUserQueryData, false);
assert.equal(evidence.actualUserQueryQualityValidated, false);
assert.equal(evidence.actualModelTrainingExecuted, false);
assert.equal(evidence.currentAnswerPathChanged, false);
assert.equal(evidence.activation.authorized, false);
assert.equal(evidence.rolloutAuthorized, false);
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.candidate.q4.caseCount, 10);
assert.equal(evidence.candidate.q4.evaluation.metrics.casePassRate, 1);
assert.equal(evidence.candidate.q6.caseCount, 12);
assert.equal(evidence.candidate.q6.evaluation.metrics.casePassRate, 1);
assert.equal(
  evidence.candidate.q6.observations.every(
    (item) =>
      item.generationStatus === 'passed' &&
      item.failureKind === null &&
      item.reviewActionSpecific &&
      item.sourceCoverageComplete,
  ),
  true,
);
assert.equal(
  packageJson.scripts['evaluate:local-answer-review-action-generalization'],
  'node scripts/evaluate-local-answer-review-action-generalization.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-answer-review-action-generalization'],
  'node scripts/smoke-local-answer-review-action-generalization.mjs',
);
for (const document of [
  readme,
  developmentPlan,
  evidenceGallery,
  evidenceManifest,
]) {
  assert.match(
    document,
    /local-answer-review-action-generalization/u,
  );
}
assert.match(
  developmentPlan,
  /\| Q7 Reviewer action generalization \| 완료 \|/u,
);

for (const record of fixture.records) {
  assert.equal(evidenceText.includes(record.query), false);
  for (const text of [...record.evidence, ...record.expectedAnswerTerms]) {
    assert.equal(evidenceText.includes(text), false);
  }
}
assert.doesNotMatch(
  evidenceText,
  /\/Users\/|\/private\/|https?:\/\/|sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/u,
);

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  evidenceHash: evidence.evidenceHash,
  mode: 'local-answer-review-action-generalization-smoke',
  ok: true,
  q4CasePassRate: evidence.candidate.q4.evaluation.metrics.casePassRate,
  q6CasePassRate: evidence.candidate.q6.evaluation.metrics.casePassRate,
  status: evidence.status,
  validated: evidence.reviewActionGeneralizationValidated,
}, null, 2));

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
