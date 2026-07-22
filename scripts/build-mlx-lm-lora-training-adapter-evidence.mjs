import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'mlx-lm-lora-training-adapter.json',
);
const evidence = await evaluateMlxLmLoraTrainingAdapter({ repoDir });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualModelTrainingExecuted:
    evidence.claimBoundary.actualModelTrainingExecuted,
  actualMlxProcessSpawned:
    evidence.claimBoundary.actualMlxProcessSpawned,
  costFree: true,
  evidenceHash: evidence.evidenceHash,
  externalProviderCalls:
    evidence.claimBoundary.externalProviderCalls,
  mode: evidence.mode,
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  productionReadyClaim:
    evidence.claimBoundary.productionReadyClaim,
}, null, 2));
