import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingRuntimeExecObservation,
} from './evaluate-local-training-runtime-exec-observation.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-runtime-exec-observation.json',
);
const evidence = await evaluateLocalTrainingRuntimeExecObservation({
  repoDir,
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualDarwinFixtureRuntimeImageSetObserved:
    evidence.claimBoundary
      .actualDarwinFixtureRuntimeImageSetObserved,
  actualMlxRuntimeImageSetObserved:
    evidence.claimBoundary.actualMlxRuntimeImageSetObserved,
  costFree: evidence.costFree,
  evidenceHash: evidence.evidenceHash,
  mode: evidence.mode,
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  productionReadyClaim:
    evidence.claimBoundary.productionReadyClaim,
  verifyToExecClosed:
    evidence.claimBoundary.verifyToExecClosed,
}, null, 2));
