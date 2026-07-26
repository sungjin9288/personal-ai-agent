import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalCandidateEvaluationHostRestartReceiptEvidence,
  buildLocalCandidateEvaluationHostRestartReceiptEvidence,
} from '../src/core/local-candidate-evaluation-host-restart-receipt.mjs';
import {
  resumeLocalCandidateEvaluationHostRestartRehearsal,
} from './local-candidate-evaluation-host-restart-rehearsal.mjs';

function parseRehearsalId(args) {
  if (
    args.length !== 2 ||
    args[0] !== '--id' ||
    !args[1]
  ) {
    throw new Error(
      'Expected --id <rehearsal-id>.',
    );
  }
  return args[1];
}

const repoDir = process.cwd();
const receipt =
  resumeLocalCandidateEvaluationHostRestartRehearsal({
    rehearsalId: parseRehearsalId(
      process.argv.slice(2),
    ),
  });
const evidence =
  buildLocalCandidateEvaluationHostRestartReceiptEvidence({
    exportedAt: new Date().toISOString(),
    receipt,
  });

assertLocalCandidateEvaluationHostRestartReceiptEvidence(
  evidence,
);

const outputPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-candidate-evaluation-host-restart-receipt.json',
);
fs.mkdirSync(path.dirname(outputPath), {
  recursive: true,
});
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(evidence, null, 2)}\n`,
  'utf8',
);

process.stdout.write(
  `${JSON.stringify({
    actualHostRestartReceiptRecorded:
      evidence.actualHostRestartReceiptRecorded,
    evidenceHash: evidence.evidenceHash,
    externalProviderCalls:
      evidence.externalProviderCalls,
    ok: true,
    outputPath: path.relative(repoDir, outputPath),
    productionReadyClaim:
      evidence.claimBoundary.productionReadyClaim,
    trackedProjectionContractValidated:
      evidence.trackedProjectionContractValidated,
  }, null, 2)}\n`,
);
