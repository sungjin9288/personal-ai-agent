import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningDataSufficiencyAssessment,
} from '../src/core/fine-tuning-data-sufficiency.mjs';
import { evaluateFineTuningDataSufficiency } from './evaluate-fine-tuning-data-sufficiency.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'fine-tuning-data-sufficiency.json',
);
const storedText = fs.readFileSync(evidencePath, 'utf8');
const stored = JSON.parse(storedText);
const current = evaluateFineTuningDataSufficiency({ repoDir });
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
);
const plan = fs.readFileSync(
  path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
  'utf8',
);
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const gallery = fs.readFileSync(
  path.join(repoDir, 'docs', 'evidence-gallery.md'),
  'utf8',
);
const manifest = fs.readFileSync(
  path.join(repoDir, 'evidence', 'evidence_manifest.md'),
  'utf8',
);

assert.doesNotThrow(() =>
  assertFineTuningDataSufficiencyAssessment(stored));
assert.deepEqual(stored, current);
assert.equal(stored.status, 'insufficient-data');
assert.equal(stored.decision, 'collect-more-reviewed-data');
assert.equal(stored.developmentGatePassed, false);
assert.equal(stored.candidateTrainingReviewAllowed, false);
assert.equal(stored.candidateTrainingReviewReady, false);
assert.equal(stored.reviewerApprovalRequired, true);
assert.equal(stored.trustedReadinessAdmissionBound, false);
assert.equal(stored.measurements.acceptedExamples, 4);
assert.equal(stored.measurements.trainExamples, 3);
assert.equal(stored.measurements.validationExamples, 1);
assert.equal(stored.measurements.missionScopes, 4);
assert.equal(stored.measurements.answerQualityCases, 2);
assert.equal(stored.trainingAuthorized, false);
assert.equal(stored.actualModelTrainingExecuted, false);
assert.equal(stored.externalSubmissionAuthorized, false);
assert.equal(stored.productionReadyClaim, false);
assert.equal(stored.policy.productionQualityThresholdClaim, false);
assert.doesNotMatch(
  storedText,
  /Prepare reviewed instruction|Return grounded response|\/Users\/|https?:\/\//u,
);
assert.equal(
  packageJson.scripts['build:fine-tuning-data-sufficiency-evidence'],
  'node scripts/build-fine-tuning-data-sufficiency-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-data-sufficiency'],
  'node scripts/smoke-fine-tuning-data-sufficiency.mjs',
);

for (const term of [
  '| F1.1 Fine-tuning data sufficiency | 완료 · 현재 데이터 부족 |',
  'development-stop-condition-not-production-quality-claim',
  'npm run smoke:fine-tuning-data-sufficiency',
  'candidateTrainingReviewAllowed: false',
  'productionQualityThresholdClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:fine-tuning-data-sufficiency'),
  'README must expose the fine-tuning data sufficiency smoke',
);
assert.ok(
  gallery.includes('| Fine-tuning data sufficiency gate |'),
  'evidence gallery must link the fine-tuning data sufficiency gate',
);
assert.ok(
  manifest.includes(
    'Fine-tuning data sufficiency gate: verified with `npm run smoke:fine-tuning-data-sufficiency`',
  ),
  'evidence manifest must record the fine-tuning data sufficiency gate',
);

console.log(JSON.stringify({
  acceptedExamples: stored.measurements.acceptedExamples,
  actualModelTrainingExecuted: stored.actualModelTrainingExecuted,
  candidateTrainingReviewAllowed: stored.candidateTrainingReviewAllowed,
  costFree: true,
  externalProviderCalls: 'none',
  failedCheckIds: stored.failedCheckIds,
  mode: 'fine-tuning-data-sufficiency',
  ok: true,
  productionReadyClaim: stored.productionReadyClaim,
  status: stored.status,
}, null, 2));
