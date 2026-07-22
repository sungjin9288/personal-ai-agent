import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingProcessSupervisor,
} from './evaluate-local-training-process-supervisor.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-process-supervisor.json',
);
const evidence = await evaluateLocalTrainingProcessSupervisor({
  repoDir,
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualFixtureProcessSpawned:
    evidence.claimBoundary.actualFixtureProcessSpawned,
  actualMlxProcessSpawned:
    evidence.claimBoundary.actualMlxProcessSpawned,
  costFree: evidence.costFree,
  evidenceHash: evidence.evidenceHash,
  mode: evidence.mode,
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  productionReadyClaim:
    evidence.claimBoundary.productionReadyClaim,
}, null, 2));
