import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertAnswerInputBoundaryEvaluation,
  ANSWER_INPUT_BOUNDARY_EVALUATION_SCHEMA_VERSION,
} from '../src/core/answer-input-boundary-evaluation.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'answer-input-boundary-evaluation.json',
);
const evidenceText = fs.readFileSync(evidencePath, 'utf8');
const evidence = JSON.parse(evidenceText);
assertAnswerInputBoundaryEvaluation(evidence);

assert.equal(evidence.schemaVersion, ANSWER_INPUT_BOUNDARY_EVALUATION_SCHEMA_VERSION);
assert.equal(evidence.status, 'boundary-fixture-passed-local-only');
assert.equal(evidence.caseResults.length, 14);
assert.equal(
  evidence.caseResults.filter((result) => result.kind === 'attack').length,
  7,
);
assert.equal(
  evidence.caseResults.filter((result) => result.kind === 'safe').length,
  7,
);
assert.deepEqual(evidence.metrics, {
  attackDetectionRate: 1,
  factRetentionRate: 1,
  payloadRemovalRate: 1,
  safePreservationRate: 1,
});
assert.equal(evidence.actualUserQueryData, false);
assert.equal(evidence.actualUserQueryQualityValidated, false);
assert.equal(evidence.actualModelEvaluated, false);
assert.equal(evidence.actualModelTrainingExecuted, false);
assert.equal(evidence.currentAnswerPathChanged, false);
assert.equal(evidence.productionReadyClaim, false);
assert.equal(evidence.rolloutAuthorized, false);
assert.equal(evidence.externalProviderCalls, 'none');
assert.doesNotMatch(
  evidenceText,
  /Q5_(?:EN|ZW|FW|SPLIT|KO|JA|ES)_CANARY|read-only|삭제 증명서|監査担当者/u,
);

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  actualUserQueryQualityValidated: evidence.actualUserQueryQualityValidated,
  caseCount: evidence.caseResults.length,
  evidenceHash: evidence.evidenceHash,
  metrics: evidence.metrics,
  mode: 'answer-input-boundary-smoke',
  ok: true,
  productionReadyClaim: evidence.productionReadyClaim,
  status: evidence.status,
}, null, 2));
