import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalCandidateEvaluationHostRestartReceiptEvidence,
} from '../src/core/local-candidate-evaluation-host-restart-receipt.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-candidate-evaluation-host-restart-receipt.json',
);
const evidence = JSON.parse(
  fs.readFileSync(evidencePath, 'utf8'),
);

assert.doesNotThrow(() =>
  assertLocalCandidateEvaluationHostRestartReceiptEvidence(
    evidence,
  ),
);
assert.equal(
  evidence.actualHostRestartReceiptRecorded,
  true,
);
assert.equal(
  evidence.trackedProjectionContractValidated,
  true,
);
assert.equal(
  evidence.receipt.actualHostRestartObserved,
  true,
);
assert.equal(
  evidence.receipt.bootIdentityChangedObserved,
  true,
);
assert.equal(
  evidence.receipt.priorBootSpawningLeaseRecovered,
  true,
);
assert.equal(
  evidence.claimBoundary.actualEvaluatorRelaunchPerformed,
  false,
);
assert.equal(
  evidence.claimBoundary.actualModelEvaluationExecuted,
  false,
);
assert.equal(
  evidence.claimBoundary.actualModelTrainingExecuted,
  false,
);
assert.equal(
  evidence.claimBoundary.productionReadyClaim,
  false,
);
assert.equal(
  evidence.claimBoundary.independentlyReproducibleFromTrackedFiles,
  false,
);
assert.equal(
  evidence.claimBoundary.privateSourceRequiredForReverification,
  true,
);
assert.equal(evidence.externalProviderCalls, 'none');

const serialized = JSON.stringify(evidence);
for (const forbidden of [
  'preparedBootIdentityHash',
  'resumedBootIdentityHash',
  'sessionHash',
  'recoveryHash',
  'rehearsalDirectory',
  'temporaryDirectory',
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    `Tracked receipt exposes ${forbidden}`,
  );
}

const packageJson = JSON.parse(
  fs.readFileSync(
    path.join(repoDir, 'package.json'),
    'utf8',
  ),
);
assert.equal(
  packageJson.scripts[
    'export:local-candidate-evaluation-host-restart-receipt'
  ],
  'node scripts/export-local-candidate-evaluation-host-restart-receipt.mjs',
);
assert.equal(
  packageJson.scripts[
    'smoke:local-candidate-evaluation-host-restart-receipt'
  ],
  'node scripts/smoke-local-candidate-evaluation-host-restart-receipt.mjs',
);

const docs = [
  'README.md',
  'docs/evidence-checklist.md',
  'docs/evidence-gallery.md',
  'docs/ml-rag-development-plan-v1.md',
  'docs/smoke-validation-summary-v1.md',
  'evidence/evidence_manifest.md',
  'portfolio_manifest.md',
].map((relativePath) =>
  fs.readFileSync(
    path.join(repoDir, relativePath),
    'utf8',
  ),
).join('\n');

for (const term of [
  'F2c.19 Actual host restart receipt',
  'local-candidate-evaluation-host-restart-receipt.json',
  'npm run smoke:local-candidate-evaluation-host-restart-receipt',
  'actualHostRestartReceiptRecorded: true',
  'trackedProjectionContractValidated',
]) {
  assert.ok(
    docs.includes(term),
    `Host restart receipt docs missing ${term}`,
  );
}

process.stdout.write(
  `${JSON.stringify({
    actualHostRestartReceiptRecorded: true,
    externalProviderCalls: 'none',
    mode:
      'local-candidate-evaluation-host-restart-receipt',
    ok: true,
    productionReadyClaim: false,
    trackedProjectionContractValidated: true,
  }, null, 2)}\n`,
);
