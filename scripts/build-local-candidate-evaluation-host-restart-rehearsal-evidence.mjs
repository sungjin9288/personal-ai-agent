import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalCandidateEvaluationHostRestartRehearsal,
} from './evaluate-local-candidate-evaluation-host-restart-rehearsal.mjs';

const repoDir = process.cwd();
const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-candidate-evaluation-host-restart-rehearsal.json',
);
const evidence =
  evaluateLocalCandidateEvaluationHostRestartRehearsal();

fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify({
  actualHostRestartObserved:
    evidence.claimBoundary.actualHostRestartObserved,
  evidenceHash: evidence.evidenceHash,
  externalProviderCalls:
    evidence.claimBoundary.externalProviderCalls,
  mode: evidence.mode,
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  productionReadyClaim:
    evidence.claimBoundary.productionReadyClaim,
}, null, 2));
