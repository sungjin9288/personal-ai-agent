import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetRetentionPath = path.join(docsDir, 'target-retention-operations-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetRetention = readRequiredFile(targetRetentionPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const security = readRequiredFile(securityPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-retention-operations'], 'node scripts/smoke-target-retention-operations.mjs');

assert.match(targetRetention, /^# Target Retention Operations v1$/m);
assert.match(targetRetention, /^- status: local-target-retention-operations-current$/m);
assert.match(targetRetention, /^- productionReadyClaim: false$/m);
assert.match(targetRetention, /not target retention evidence/);
assert.match(targetRetention, /not provider transcript deletion proof/);
assert.match(targetRetention, /not permission to claim `production-ready`/);
assert.match(targetRetention, /Target retention operations remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Retention Operation Controls',
  '## Retention Evidence Packet',
  '## Data Lifecycle Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetRetention, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Customer-approved data classes',
  'Retention configuration',
  'Export package approval',
  'Delete workflow',
  'Provider transcript handling',
  'Post-delete absence',
]) {
  assert.match(targetRetention, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const command of [
  'npm run smoke:target-retention-operations',
  'npm run smoke:retention-delete-policy',
  'npm run smoke:tenant-data-lifecycle',
  'npm run smoke:target-backup-operations',
  'npm run smoke:production-retention-operating',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(targetRetention, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[target-retention-operations-v1\.md\]\(target-retention-operations-v1\.md\)/);
assert.match(releaseReadiness, /local target retention operations gate: passed/);
assert.match(targetContract, /local retention, tenant lifecycle, target retention operations, backup\/restore drill, and target backup operations gates pass/);
assert.match(targetContract, /npm run smoke:target-retention-operations/);
assert.match(deployment, /## Target Retention Operations Gate/);
assert.match(deployment, /npm run smoke:target-retention-operations/);
assert.match(security, /\[target-retention-operations-v1\.md\]\(target-retention-operations-v1\.md\)/);
assert.match(productPlan, /\[x\] Target retention operations gate implemented/);
assert.match(readme, /npm run smoke:target-retention-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 6,
      mode: 'target-retention-operations',
      ok: true,
      path: 'docs/target-retention-operations-v1.md',
      productionReadyClaim: false,
      retentionPacketItemCount: 10,
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
