import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalCandidateEvaluationRuntime,
} from './evaluate-local-candidate-evaluation-runtime.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-candidate-evaluation-runtime.json',
);
const evidence =
  await evaluateLocalCandidateEvaluationRuntime({
    repoDir,
  });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualModelEvaluated:
    evidence.claimBoundary.actualModelEvaluated,
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
