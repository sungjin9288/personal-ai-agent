import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingDarwinSuspendedExec,
} from './evaluate-local-training-darwin-suspended-exec.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-darwin-suspended-exec.json',
);
const evidence = await evaluateLocalTrainingDarwinSuspendedExec({
  repoDir,
});

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualDarwinFixtureEntrypointDescriptorExecutionValidated:
    evidence.claimBoundary
      .actualDarwinFixtureEntrypointDescriptorExecutionValidated,
  actualDarwinFixtureExecutableVerifyToExecValidated:
    evidence.claimBoundary
      .actualDarwinFixtureExecutableVerifyToExecValidated,
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
