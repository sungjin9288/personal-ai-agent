import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingPostAcquisitionReadinessEvidence,
} from './evaluate-local-training-post-acquisition-readiness.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-post-acquisition-readiness.json',
);
const evidence =
  await evaluateLocalTrainingPostAcquisitionReadinessEvidence({
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
