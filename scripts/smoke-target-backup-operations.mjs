import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetBackupPath = path.join(docsDir, 'target-backup-operations-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetBackup = readRequiredFile(targetBackupPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const intake = readRequiredFile(intakePath);
const deployment = readRequiredFile(deploymentPath);
const security = readRequiredFile(securityPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-backup-operations'], 'node scripts/smoke-target-backup-operations.mjs');

assert.match(targetBackup, /^# Target Backup Operations v1$/m);
assert.match(targetBackup, /^- status: local-target-backup-operations-current$/m);
assert.match(targetBackup, /^- productionReadyClaim: false$/m);
assert.match(targetBackup, /not target backup evidence/);
assert.match(targetBackup, /not encrypted backup storage proof/);
assert.match(targetBackup, /not permission to claim `production-ready`/);
assert.match(targetBackup, /Target backup operations remain blocked for production-ready claims/);
assert.match(targetBackup, /release artifact hygiene/);
assert.match(targetBackup, /regenerated execution snapshot evidence/);

for (const heading of [
  '## Decision Boundary',
  '## Backup Operation Controls',
  '## Recovery Evidence Packet',
  '## Release Blocker Closure Linkage',
  '## Disaster Recovery Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetBackup, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Backup schedule',
  'Encrypted storage',
  'Key ownership',
  'Restore validation',
  'Tenant isolation',
  'Backup expiry and deletion',
]) {
  assert.match(targetBackup, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const packetItem of [
  /backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement/,
  /encrypted backup storage proof with storage class, encryption mode, retention class, location alias, storage owner, and access audit/,
  /backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry\/delete evidence, and access audit/,
  /restore validation proof with objective, duration, restored data class inventory, checksum or equivalent integrity proof, tenant isolation, cross-tenant denial, and validation owner/,
  /tenant isolation proof with tenant-scoped backup selection, restore authorization, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route/,
  /backup expiry\/deletion proof with expiry schedule, delete proof, post-delete absence check, deletion owner, and audit record/,
  /disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail/,
  /release artifact hygiene result, regenerated execution snapshot evidence, and production readiness gate result/,
  /residual recovery risk, next review date, customer handoff decision, and failed-restore containment plan/,
]) {
  assert.match(targetBackup, packetItem);
}

assert.match(
  targetBackup,
  /\| Blocker \| Operations Stop Condition \| Architecture Stop Condition \| Retention Stop Condition \| Boundary Stop Condition \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  targetBackup,
  /\| target backup operations \| target-backup-operations-missing \| target-data-lifecycle-architecture-missing \| target-retention-operations-missing \| target-retention-backup-boundary-missing-or-mismatched \| 4 \| 10 \| 9 \| 6 \| blocked \|/,
);
assert.match(targetBackup, /Target backup operations owns the backup schedule execution/);
assert.match(targetBackup, /Target data lifecycle architecture owns the backup, restore, and disaster recovery decision proof/);
assert.match(targetBackup, /Target retention operations owns the retention\/delete and post-delete absence proof affected by backup expiry and restore behavior/);
assert.match(targetBackup, /Backup\/restore drill and production retention operating own the local pilot recovery stop conditions/);
assert.match(targetBackup, /Target deployment contract and target environment evidence intake own the same-boundary backup evidence verification/);
assert.match(
  targetBackup,
  /regenerated execution-v1 snapshot evidence from the same approved production-like or hosted target backup boundary/,
);

for (const command of [
  'npm run smoke:target-backup-operations',
  'npm run smoke:target-data-lifecycle-architecture',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:production-retention-operating',
  'npm run smoke:target-retention-operations',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(targetBackup, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[target-backup-operations-v1\.md\]\(target-backup-operations-v1\.md\)/);
assert.match(targetBackup, /\[target-data-lifecycle-architecture-v1\.md\]\(target-data-lifecycle-architecture-v1\.md\)/);
assert.match(
  releaseReadiness,
  /local target backup operations gate: passed, with backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene, regenerated execution snapshot evidence requirements, and `productionReadyClaim: false`/,
);
assert.match(
  releaseReadiness,
  /target backup operations evidence for backup schedule execution proof with backup policy id, schedule, execution timestamps, missed-run handling, and owner acknowledgement, encrypted backup storage proof with storage class, encryption mode, retention class, location alias, and access audit, backup key ownership proof with key owner, rotation cadence, revocation path, break-glass route, expiry\/delete evidence, and access audit, restore validation proof with objective, duration, restored data class inventory, checksum or integrity proof, tenant isolation, cross-tenant denial, and validation owner, backup expiry\/deletion proof with expiry schedule, delete proof, post-delete absence check, and audit record, disaster recovery proof with DR owner, runbook execution, outage scenario, restore priority, customer communication, rollback path, residual risk decision, and audit trail, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  releaseReadiness,
  /target backup operations evidence for backup schedule execution, encrypted backup storage, key ownership, restore validation, tenant isolation, backup expiry\/deletion, disaster recovery runbook, and audit trail/,
);
assert.match(
  targetContract,
  /local retention, tenant lifecycle, target data lifecycle architecture, target retention operations, backup\/restore drill, and target backup operations gates pass/,
);
assert.match(
  targetContract,
  /target backup operations evidence is captured with backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(targetContract, /npm run smoke:target-backup-operations/);
assert.match(
  intake,
  /target backup operations evidence for backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(deployment, /## Target Backup Operations Gate/);
assert.match(deployment, /npm run smoke:target-backup-operations/);
assert.match(security, /\[target-backup-operations-v1\.md\]\(target-backup-operations-v1\.md\)/);
assert.match(productPlan, /\[x\] Target backup operations gate implemented/);
assert.match(readme, /npm run smoke:target-backup-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 6,
      mode: 'target-backup-operations',
      ok: true,
      path: 'docs/target-backup-operations-v1.md',
      productionReadyClaim: false,
      recoveryPacketItemCount: 10,
      requiredCommandCount: 9,
    },
    null,
    2,
  ),
);

function readRequiredFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
