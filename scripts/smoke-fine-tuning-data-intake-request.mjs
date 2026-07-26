import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningDataIntakeRequest,
  FINE_TUNING_DATA_INTAKE_OWNER_ROLES,
} from '../src/core/fine-tuning-data-intake-request.mjs';
import { evaluateFineTuningDataCollectionPlan } from './evaluate-fine-tuning-data-collection-plan.mjs';
import { evaluateFineTuningDataSufficiency } from './evaluate-fine-tuning-data-sufficiency.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'fine-tuning-data-intake-request.json',
);
const storedText = fs.readFileSync(evidencePath, 'utf8');
const stored = JSON.parse(storedText);
const assessment = evaluateFineTuningDataSufficiency({ repoDir });
const collectionPlan = evaluateFineTuningDataCollectionPlan({ repoDir });
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
);
const developmentPlan = fs.readFileSync(
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
  assertFineTuningDataIntakeRequest(stored, {
    assessment,
    collectionPlan,
    now: new Date().toISOString(),
  }));
assert.equal(stored.status, 'pending-owner-review');
assert.equal(stored.bindings.collectionPlanId, collectionPlan.id);
assert.equal(
  stored.bindings.collectionPlanHash,
  collectionPlan.planHash,
);
assert.equal(
  stored.targets.reviewedExamples.minimumAdditionalItems,
  16,
);
assert.equal(stored.targets.reviewedExamples.observedTrainGap, 13);
assert.equal(stored.targets.reviewedExamples.observedValidationGap, 3);
assert.equal(
  stored.targets.reviewedExamples.requiredNewMissionScopes,
  6,
);
assert.equal(
  stored.targets.reviewedExamples.splitAssignmentAuthorized,
  false,
);
assert.equal(
  stored.targets.reviewedExamples.splitMustBeRebuiltAndRemeasured,
  true,
);
assert.equal(
  stored.targets.answerQualityCases.minimumAdditionalItems,
  8,
);
assert.equal(
  stored.targets.answerQualityCases
    .countsTowardReviewedExampleMinimum,
  false,
);
assert.deepEqual(
  stored.requiredOwnerRoles,
  FINE_TUNING_DATA_INTAKE_OWNER_ROLES,
);
assert.equal(
  stored.requiredReviews.every(
    (review) => review.status === 'pending-owner-review',
  ),
  true,
);
assert.equal(stored.actualModelTrainingExecuted, false);
assert.equal(stored.actualUserDataCollected, false);
assert.equal(stored.answerQualityCaseCollectionAuthorized, false);
assert.equal(stored.candidateTrainingReviewAllowed, false);
assert.equal(stored.collectionExecutionAuthorized, false);
assert.equal(stored.dataHandlingEvidenceRecorded, false);
assert.equal(stored.externalProviderCalls, 'none');
assert.equal(stored.externalSubmissionAuthorized, false);
assert.equal(stored.ownerDecisionRecorded, false);
assert.equal(stored.productionReadyClaim, false);
assert.equal(stored.rawTrainingContentStored, false);
assert.equal(stored.reviewedExampleCollectionAuthorized, false);
assert.equal(stored.sourceDataIncluded, false);
assert.equal(stored.syntheticTrainingRecordsCreated, false);
assert.equal(stored.trainingAuthorized, false);
assert.doesNotMatch(
  storedText,
  /instruction|response|customer(?:Id|Name|Email|Phone)|missionId|sessionId|artifactId|\/Users\/|\/private\/|https?:\/\//iu,
);
assert.doesNotMatch(
  storedText,
  /sk-|OPENAI_API_KEY|ANTHROPIC_API_KEY/iu,
);
assert.equal(
  packageJson.scripts[
    'build:fine-tuning-data-intake-request-evidence'
  ],
  'node scripts/build-fine-tuning-data-intake-request-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-data-intake-request'],
  'node scripts/smoke-fine-tuning-data-intake-request.mjs',
);

for (const term of [
  '| F1.3 Reviewed-data intake request | 완료 · owner review 대기 |',
  'fineTuningDataIntakeRequestStatus: pending-owner-review',
  'ownerDecisionRecorded: false',
  'npm run smoke:fine-tuning-data-intake-request',
]) {
  assert.ok(
    developmentPlan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  readme.includes('npm run smoke:fine-tuning-data-intake-request'),
  'README must expose the fine-tuning data intake request smoke',
);
assert.ok(
  gallery.includes('| Fine-tuning reviewed-data intake request |'),
  'evidence gallery must link the reviewed-data intake request',
);
assert.ok(
  manifest.includes(
    'Fine-tuning reviewed-data intake request: verified with `npm run smoke:fine-tuning-data-intake-request`',
  ),
  'evidence manifest must record the reviewed-data intake request',
);

console.log(JSON.stringify({
  actualUserDataCollected: stored.actualUserDataCollected,
  collectionExecutionAuthorized:
    stored.collectionExecutionAuthorized,
  costFree: true,
  externalProviderCalls: stored.externalProviderCalls,
  minimumAdditionalReviewedExamples:
    stored.targets.reviewedExamples.minimumAdditionalItems,
  mode: 'fine-tuning-data-intake-request',
  ok: true,
  requiredNewMissionScopes:
    stored.targets.reviewedExamples.requiredNewMissionScopes,
  status: stored.status,
  trainingAuthorized: stored.trainingAuthorized,
}, null, 2));
