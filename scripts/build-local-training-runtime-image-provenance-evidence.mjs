import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingRuntimeImageProvenance,
} from './evaluate-local-training-runtime-image-provenance.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-runtime-image-provenance.json',
);
const evidence = await evaluateLocalTrainingRuntimeImageProvenance({
  repoDir,
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualDarwinFixtureRuntimeImageProvenanceValidated:
    evidence.claimBoundary
      .actualDarwinFixtureRuntimeImageProvenanceValidated,
  actualMlxNativeRuntimeClosureValidated:
    evidence.claimBoundary.actualMlxNativeRuntimeClosureValidated,
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
