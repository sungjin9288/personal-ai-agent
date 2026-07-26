import assert from 'node:assert/strict';
import fs from 'node:fs';

import { assertLocalUserQueryQuality } from '../src/core/local-user-query-quality.mjs';

const evidence = readJson('evidence/output-artifacts/local-user-query-quality.json');
const intake = readJson('evidence/output-artifacts/user-query-evaluation-intake.json');
const fixture = readJson('fixtures/user-query-evaluation-intake-dry-run-v1.json');
const packageJson = readJson('package.json');

assertLocalUserQueryQuality(evidence);
assert.equal(evidence.status, 'local-user-query-quality-failed-keep-current');
assert.equal(evidence.localUserQueryEvaluationValidated, false);
assert.equal(evidence.syntheticUserQueryQualityValidated, false);
assert.equal(evidence.actualUserQueryData, false);
assert.equal(evidence.actualUserQueryQualityValidated, false);
assert.equal(evidence.actualModelEvaluated, true);
assert.equal(evidence.actualModelTrainingExecuted, false);
assert.equal(evidence.currentAnswerPathChanged, false);
assert.equal(evidence.evaluatorContractTermsSentToModel, false);
assert.equal(evidence.generalAnswerQualityImprovementValidated, false);
assert.equal(evidence.rolloutAuthorized, false);
assert.equal(evidence.activation.authorized, false);
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.evaluation.caseResults.length, 12);
assert.equal(evidence.evaluation.domainBreakdown.length, 6);
assert.equal(evidence.evaluation.languageBreakdown.length, 4);
assert.equal(evidence.decision, 'keep-current-answer-path');
assert.equal(evidence.evaluation.metrics.casePassRate, 0.9167);
assert.equal(
  evidence.evaluation.caseResults.filter((item) => item.status === 'failed').length,
  1,
);
assert.equal(
  evidence.observations.filter(
    (item) =>
      item.generationStatus === 'failed' &&
      item.failureKind === 'invalid-review-action',
  ).length,
  1,
);
assert.equal(
  evidence.evaluation.domainBreakdown.filter((item) => item.status === 'failed').length,
  1,
);
assert.equal(
  evidence.evaluation.languageBreakdown.filter((item) => item.status === 'failed').length,
  1,
);
assert.equal(evidence.intake.evidenceHash, intake.evidenceHash);
assert.equal(evidence.suite.intakeEvidenceHash, intake.evidenceHash);

const serialized = JSON.stringify(evidence);
for (const record of fixture.records) {
  assert.equal(serialized.includes(record.query), false);
  for (const text of [
    ...record.evidence,
    ...record.expectedAnswerTerms,
  ]) {
    assert.equal(serialized.includes(text), false);
  }
}

assert.equal(
  packageJson.scripts['evaluate:local-user-query-quality'],
  'node scripts/evaluate-local-user-query-quality.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-user-query-quality'],
  'node scripts/smoke-local-user-query-quality.mjs',
);

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  caseCount: evidence.evaluation.caseResults.length,
  domainCount: evidence.evaluation.domainBreakdown.length,
  evidenceHash: evidence.evidenceHash,
  languageCount: evidence.evaluation.languageBreakdown.length,
  ok: true,
  status: evidence.status,
  validated: evidence.localUserQueryEvaluationValidated,
}, null, 2));

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
