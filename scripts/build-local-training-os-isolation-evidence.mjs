import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingOsIsolation,
} from './evaluate-local-training-os-isolation.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-os-isolation.json',
);
const evidence = await evaluateLocalTrainingOsIsolation({ repoDir });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualDarwinFixtureNetworkDenyEnforced:
    evidence.claimBoundary.actualDarwinFixtureNetworkDenyEnforced,
  actualMlxMemoryLimitEnforced:
    evidence.claimBoundary.actualMlxMemoryLimitEnforced,
  actualMlxOsIsolationIntegrated:
    evidence.claimBoundary.actualMlxOsIsolationIntegrated,
  costFree: evidence.costFree,
  evidenceHash: evidence.evidenceHash,
  mode: evidence.mode,
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  productionReadyClaim: evidence.claimBoundary.productionReadyClaim,
}, null, 2));
