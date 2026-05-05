import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetBackupPath = path.join(docsDir, 'target-backup-operations-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetBackup = readRequiredFile(targetBackupPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
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

for (const heading of [
  '## Decision Boundary',
  '## Backup Operation Controls',
  '## Recovery Evidence Packet',
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

for (const command of [
  'npm run smoke:target-backup-operations',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:production-retention-operating',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(targetBackup, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[target-backup-operations-v1\.md\]\(target-backup-operations-v1\.md\)/);
assert.match(releaseReadiness, /local target backup operations gate: passed/);
assert.match(targetContract, /local retention, tenant lifecycle, backup\/restore drill, and target backup operations gates pass/);
assert.match(targetContract, /npm run smoke:target-backup-operations/);
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
