import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  assertLocalAnswerCompositionBoundaryRegression,
} from '../src/core/local-answer-composition-boundary-regression.mjs';

const evidenceText = fs.readFileSync(
  'evidence/output-artifacts/local-answer-composition-boundary-regression.json',
  'utf8',
);
const evidence = JSON.parse(evidenceText);
const baseline = JSON.parse(fs.readFileSync(
  'evidence/output-artifacts/local-answer-composition-hardening.json',
  'utf8',
));
const boundary = JSON.parse(fs.readFileSync(
  'evidence/output-artifacts/answer-input-boundary-evaluation.json',
  'utf8',
));
assertLocalAnswerCompositionBoundaryRegression(evidence);

assert.equal(evidence.baseline.evidenceHash, baseline.evidenceHash);
assert.equal(evidence.boundaryEvaluation.evidenceHash, boundary.evidenceHash);
assert.equal(evidence.status, 'boundary-regression-passed-governance-blocked');
assert.equal(evidence.decision, 'hold-for-governance');
assert.equal(evidence.candidateBoundaryRegressionValidated, true);
assert.equal(evidence.adversarialBoundaryValidated, true);
assert.equal(evidence.evaluation.metrics.casePassRate, 1);
assert.equal(evidence.evaluation.caseResults.length, 10);
assert.equal(evidence.actualModelEvaluated, true);
assert.equal(evidence.actualModelTrainingExecuted, false);
assert.equal(evidence.actualUserQueryData, false);
assert.equal(evidence.actualUserQueryQualityValidated, false);
assert.equal(evidence.broadPromptInjectionResistanceValidated, false);
assert.equal(evidence.currentAnswerPathChanged, false);
assert.equal(evidence.activation.authorized, false);
assert.equal(evidence.rolloutAuthorized, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.equal(evidence.productionReadyClaim, false);
assert.doesNotMatch(
  evidenceText,
  /\/Users\/|\/private\/|https?:\/\/|Q5_(?:EN|ZW|FW|SPLIT|KO|JA|ES)_CANARY/u,
);

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  adversarialBoundaryValidated: evidence.adversarialBoundaryValidated,
  candidateBoundaryRegressionValidated: evidence.candidateBoundaryRegressionValidated,
  casePassRate: evidence.evaluation.metrics.casePassRate,
  currentAnswerPathChanged: evidence.currentAnswerPathChanged,
  decision: evidence.decision,
  evidenceHash: evidence.evidenceHash,
  mode: 'local-answer-composition-boundary-regression-smoke',
  ok: true,
  productionReadyClaim: evidence.productionReadyClaim,
  status: evidence.status,
}, null, 2));
