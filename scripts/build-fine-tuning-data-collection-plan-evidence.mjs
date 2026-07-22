import fs from 'node:fs';
import path from 'node:path';

import { evaluateFineTuningDataCollectionPlan } from './evaluate-fine-tuning-data-collection-plan.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'fine-tuning-data-collection-plan.json',
);
const plan = evaluateFineTuningDataCollectionPlan({ repoDir });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(plan, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  answerQualityCaseGap: plan.gaps.answerQualityCases.remaining,
  collectionExecutionAuthorized: plan.collectionExecutionAuthorized,
  costFree: true,
  externalProviderCalls: 'none',
  minimumAdditionalReviewedExamples:
    plan.gaps.reviewedExamples.minimumAdditionalReviewedExamples,
  mode: 'fine-tuning-data-collection-plan',
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  requiredNewMissionScopes: plan.gaps.missionScopes.remaining,
  status: plan.status,
  trainingAuthorized: plan.trainingAuthorized,
}, null, 2));
