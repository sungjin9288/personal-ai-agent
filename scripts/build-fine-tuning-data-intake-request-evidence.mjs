import fs from 'node:fs';
import path from 'node:path';

import { evaluateFineTuningDataIntakeRequest } from './evaluate-fine-tuning-data-intake-request.mjs';

const repoDir = process.cwd();
const requestedAt = new Date();
const expiresAt = new Date(
  requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
);
const request = evaluateFineTuningDataIntakeRequest({
  expiresAt: expiresAt.toISOString(),
  repoDir,
  requestedAt: requestedAt.toISOString(),
});
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'fine-tuning-data-intake-request.json',
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(request, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualUserDataCollected: request.actualUserDataCollected,
  collectionExecutionAuthorized:
    request.collectionExecutionAuthorized,
  costFree: true,
  externalProviderCalls: request.externalProviderCalls,
  minimumAdditionalReviewedExamples:
    request.targets.reviewedExamples.minimumAdditionalItems,
  mode: 'fine-tuning-data-intake-request',
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  requiredNewMissionScopes:
    request.targets.reviewedExamples.requiredNewMissionScopes,
  status: request.status,
  trainingAuthorized: request.trainingAuthorized,
}, null, 2));
