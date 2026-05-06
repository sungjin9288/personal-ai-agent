import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const tenantPath = path.join(docsDir, 'tenant-storage-admin-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const tenant = readRequiredFile(tenantPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const security = readRequiredFile(securityPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:tenant-storage-admin'], 'node scripts/smoke-tenant-storage-admin.mjs');

assert.match(tenant, /^# Tenant Storage Administration v1$/m);
assert.match(tenant, /^- status: local-tenant-storage-admin-current$/m);
assert.match(tenant, /^- productionReadyClaim: false$/m);
assert.match(tenant, /not hosted tenant isolation evidence/);
assert.match(tenant, /not permission to claim `production-ready`/);
assert.match(tenant, /Hosted tenant isolation remains blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Tenant Storage Controls',
  '## Tenant Admin Operations',
  '## Audit Packet Requirements',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(tenant, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Tenant identity binding',
  'Storage partitioning',
  'Runtime boundary',
  'Backup/restore isolation',
  'Tenant administration',
]) {
  assert.match(tenant, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const operation of ['Tenant create', 'Tenant access change', 'Tenant export', 'Tenant delete', 'Tenant restore']) {
  assert.match(tenant, new RegExp(`\\| ${escapeRegExp(operation)} \\|`));
}

for (const packetItem of [
  'branch and commit',
  'tenant identifier and tenant owner',
  'admin operation and reason',
  'approval or confirmation token class',
  'rollback, restore, or deletion follow-up',
]) {
  assert.match(tenant, new RegExp(`- ${escapeRegExp(packetItem)}`));
}

for (const command of [
  'npm run smoke:tenant-storage-admin',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:web-tenant-isolation',
  'npm run smoke:tenant-data-lifecycle',
  'npm run smoke:runtime-isolation',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(tenant, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[tenant-storage-admin-v1\.md\]\(tenant-storage-admin-v1\.md\)/);
assert.match(tenant, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(releaseReadiness, /local tenant storage administration gate: passed/);
assert.match(targetContract, /local tenant storage administration, OIDC tenant API isolation, tenant lifecycle, and runtime isolation gates pass/);
assert.match(targetContract, /npm run smoke:tenant-storage-admin/);
assert.match(deployment, /## Tenant Storage Administration Gate/);
assert.match(deployment, /npm run smoke:tenant-storage-admin/);
assert.match(productPlan, /\[x\] Tenant storage administration gate implemented/);
assert.match(security, /\[tenant-storage-admin-v1\.md\]\(tenant-storage-admin-v1\.md\)/);
assert.match(readme, /npm run smoke:tenant-storage-admin/);

console.log(
  JSON.stringify(
    {
      auditPacketItemCount: 10,
      controlCount: 5,
      mode: 'tenant-storage-admin',
      ok: true,
      operationCount: 5,
      path: 'docs/tenant-storage-admin-v1.md',
      productionReadyClaim: false,
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
