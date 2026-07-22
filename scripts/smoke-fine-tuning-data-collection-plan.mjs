import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningDataCollectionPlan,
} from '../src/core/fine-tuning-data-collection-plan.mjs';
import { evaluateFineTuningDataCollectionPlan } from './evaluate-fine-tuning-data-collection-plan.mjs';
import { evaluateFineTuningDataSufficiency } from './evaluate-fine-tuning-data-sufficiency.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'fine-tuning-data-collection-plan.json',
);
const storedText = fs.readFileSync(evidencePath, 'utf8');
const stored = JSON.parse(storedText);
const assessment = evaluateFineTuningDataSufficiency({ repoDir });
const current = evaluateFineTuningDataCollectionPlan({ repoDir });
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
  assertFineTuningDataCollectionPlan(stored, { assessment }));
assert.deepEqual(stored, current);
assert.equal(stored.status, 'reviewed-data-collection-required');
assert.equal(stored.decision, 'collect-more-reviewed-data');
assert.equal(stored.dataCollectionRequired, true);
assert.equal(
  stored.gaps.reviewedExamples.minimumAdditionalReviewedExamples,
  16,
);
assert.equal(stored.gaps.reviewedExamples.trainExamples.remaining, 13);
assert.equal(stored.gaps.reviewedExamples.validationExamples.remaining, 3);
assert.equal(stored.gaps.missionScopes.remaining, 6);
assert.equal(stored.gaps.answerQualityCases.remaining, 8);
assert.equal(stored.gaps.acceptedRisk.paddingAuthorized, false);
assert.equal(stored.gaps.reviewedExamples.splitAssignmentAuthorized, false);
assert.equal(stored.actualUserDataCollected, false);
assert.equal(stored.syntheticTrainingRecordsCreated, false);
assert.equal(stored.rawTrainingContentStored, false);
assert.equal(stored.collectionExecutionAuthorized, false);
assert.equal(stored.reviewedExampleCollectionAuthorized, false);
assert.equal(stored.candidateTrainingReviewAllowed, false);
assert.equal(stored.trainingAuthorized, false);
assert.equal(stored.actualModelTrainingExecuted, false);
assert.equal(stored.externalSubmissionAuthorized, false);
assert.equal(stored.productionReadyClaim, false);
assert.doesNotMatch(
  storedText,
  /instruction|response|customer(?:Id)?|mission-(?:sufficiency|risk)|\/Users\/|https?:\/\//iu,
);
assert.equal(
  packageJson.scripts['build:fine-tuning-data-collection-plan-evidence'],
  'node scripts/build-fine-tuning-data-collection-plan-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-data-collection-plan'],
  'node scripts/smoke-fine-tuning-data-collection-plan.mjs',
);

for (const term of [
  '| F1.2 Reviewed-data collection plan | 완료 · 수집 미승인 |',
  'minimumAdditionalReviewedExamples: 16',
  'reviewedExampleCollectionAuthorized: false',
  'npm run smoke:fine-tuning-data-collection-plan',
]) {
  assert.ok(
    developmentPlan.includes(term),
    `ML/RAG development plan missing ${term}`,
  );
}
assert.ok(
  readme.includes('npm run smoke:fine-tuning-data-collection-plan'),
  'README must expose the reviewed-data collection plan smoke',
);
assert.ok(
  gallery.includes('| Fine-tuning reviewed-data collection plan |'),
  'evidence gallery must link the reviewed-data collection plan',
);
assert.ok(
  manifest.includes(
    'Fine-tuning reviewed-data collection plan: verified with `npm run smoke:fine-tuning-data-collection-plan`',
  ),
  'evidence manifest must record the reviewed-data collection plan',
);

console.log(JSON.stringify({
  actualUserDataCollected: stored.actualUserDataCollected,
  answerQualityCaseGap: stored.gaps.answerQualityCases.remaining,
  collectionExecutionAuthorized: stored.collectionExecutionAuthorized,
  costFree: true,
  externalProviderCalls: 'none',
  minimumAdditionalReviewedExamples:
    stored.gaps.reviewedExamples.minimumAdditionalReviewedExamples,
  mode: 'fine-tuning-data-collection-plan',
  ok: true,
  requiredNewMissionScopes: stored.gaps.missionScopes.remaining,
  status: stored.status,
  trainingAuthorized: stored.trainingAuthorized,
}, null, 2));
