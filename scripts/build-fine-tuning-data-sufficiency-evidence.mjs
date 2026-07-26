import fs from 'node:fs';
import path from 'node:path';

import { evaluateFineTuningDataSufficiency } from './evaluate-fine-tuning-data-sufficiency.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'fine-tuning-data-sufficiency.json',
);
const assessment = evaluateFineTuningDataSufficiency({ repoDir });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(assessment, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  acceptedExamples: assessment.measurements.acceptedExamples,
  actualModelTrainingExecuted: assessment.actualModelTrainingExecuted,
  candidateTrainingReviewAllowed:
    assessment.candidateTrainingReviewAllowed,
  costFree: true,
  externalProviderCalls: 'none',
  failedCheckIds: assessment.failedCheckIds,
  mode: 'fine-tuning-data-sufficiency',
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  status: assessment.status,
  trainingAuthorized: assessment.trainingAuthorized,
}, null, 2));
