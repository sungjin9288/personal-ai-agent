import assert from 'node:assert/strict';

import { runReleaseArtifactHygiene } from './release-artifact-hygiene-utils.mjs';

const result = runReleaseArtifactHygiene();

assert.equal(result.ok, true, JSON.stringify(result.findings, null, 2));
assert.equal(result.secretFindingCount, 0, JSON.stringify(result.findings, null, 2));
assert.equal(result.machinePathFindingCount, 0, JSON.stringify(result.findings, null, 2));
assert.equal(result.scannedFiles.includes('docs/execution-v1-evidence.md'), true);
assert.equal(result.scannedFiles.includes('docs/execution-v1-closeout.md'), true);
assert.equal(result.scannedFiles.includes('docs/execution-v1-handoff.md'), true);
assert.equal(result.scannedFiles.includes('docs/pilot-export-package-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-like-release-drill-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/retention-delete-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/clean-deployment-release-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-slo-operating-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-retention-operating-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-provider-readiness-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/production-enterprise-controls-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/target-deployment-contract-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/backup-restore-drill-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/customer-support-operations-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/support-escalation-review-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/secret-management-v1.md'), true);
assert.equal(result.scannedFiles.includes('docs/observability-telemetry-v1.md'), true);
assert.equal(Boolean(result.verifiedCommit), true);
assert.equal(
  result.scannedFiles.some(
    (filePath) =>
      filePath === `docs/releases/execution-v1/${result.verifiedCommit}/execution-v1-evidence.md`,
  ),
  true,
);
assert.equal(
  result.scannedFiles.some(
    (filePath) =>
      filePath === `docs/releases/execution-v1/${result.verifiedCommit}/execution-v1-handoff.md`,
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      machinePathFindingCount: result.machinePathFindingCount,
      mode: 'release-artifact-hygiene',
      ok: true,
      scannedFileCount: result.scannedFiles.length,
      secretFindingCount: result.secretFindingCount,
      verifiedCommit: result.verifiedCommit,
    },
    null,
    2,
  ),
);
