import fs from 'node:fs';
import path from 'node:path';

import { evaluateLocalTrainingAcquisitionArtifactVerification } from './evaluate-local-training-acquisition-artifact-verification.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-acquisition-artifact-verification.json',
);
const evidence =
  await evaluateLocalTrainingAcquisitionArtifactVerification({
    repoDir,
  });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualArtifactSetsObserved:
    evidence.claimBoundary.actualArtifactSetsObserved,
  actualDependencyInstallationPerformed:
    evidence.claimBoundary.actualDependencyInstallationPerformed,
  actualModelDownloadPerformed:
    evidence.claimBoundary.actualModelDownloadPerformed,
  actualModelTrainingExecuted:
    evidence.claimBoundary.actualModelTrainingExecuted,
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
