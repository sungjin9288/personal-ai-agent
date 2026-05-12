import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetTenantPath = path.join(docsDir, 'target-tenant-isolation-operations-v1.md');
const hostedTenantPath = path.join(docsDir, 'hosted-tenant-isolation-architecture-v1.md');
const tenantStoragePath = path.join(docsDir, 'tenant-storage-admin-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const targetEnvironmentPath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetTenant = readRequiredFile(targetTenantPath);
const hostedTenant = readRequiredFile(hostedTenantPath);
const tenantStorage = readRequiredFile(tenantStoragePath);
const targetContract = readRequiredFile(targetContractPath);
const targetEnvironment = readRequiredFile(targetEnvironmentPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-tenant-isolation-operations'],
  'node scripts/smoke-target-tenant-isolation-operations.mjs',
);

assert.match(targetTenant, /^# Target Tenant Isolation Operations v1$/m);
assert.match(targetTenant, /^- status: local-target-tenant-isolation-operations-current$/m);
assert.match(targetTenant, /^- productionReadyClaim: false$/m);
assert.match(targetTenant, /not hosted tenant architecture approval/);
assert.match(targetTenant, /not target tenant isolation evidence/);
assert.match(targetTenant, /not hosted multi-tenant production proof/);
assert.match(targetTenant, /not permission to claim `production-ready`/);
assert.match(targetTenant, /Target tenant isolation operations remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Tenant Isolation Controls',
  '## Tenant Evidence Packet',
  '## Target Evidence Capture Template',
  '## Tenant Isolation Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetTenant, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Tenant identity source',
  'Authorization boundary',
  'Storage partitioning',
  'Encryption and key ownership',
  'Backup/restore isolation',
  'Tenant administration',
  'Cross-tenant denial testing',
  'Observability/support isolation',
  'Lifecycle isolation',
]) {
  assert.match(targetTenant, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const packetItem of [
  /completed target tenant isolation operations evidence capture template for the approved production-like or hosted boundary/,
  /tenant identity source, customer organization mapping, tenant lifecycle owner, and trust policy/,
  /tenant-aware authorization policy, service-to-service tenant propagation, stale permission denial, and delegated admin boundaries/,
  /storage partitioning evidence for runtime state, artifacts, memory, search, exports, indexes, and migration safety/,
  /per-tenant encryption, key ownership, rotation, revocation, escrow, break-glass, and access audit evidence/,
  /tenant-scoped backup creation, restore authorization, integrity proof, other-tenant non-interference, and post-restore denial evidence/,
  /tenant administration evidence for create, suspend, restore, delete, role delegation, customer approval, and audit history/,
  /cross-tenant negative test matrix for API, storage, memory, search, export, delete, backup, support, and observability surfaces/,
  /tenant-scoped observability, support ticket visibility, incident review, customer status routing, and evidence export proof/,
  /retention, export, delete, provider transcript, legal hold, backup expiry, and post-delete absence evidence per tenant/,
  /artifact hygiene and production readiness gate result/,
  /residual risk, decision owner, next review date, and tenant data containment plan/,
]) {
  assert.match(targetTenant, packetItem);
}

assert.match(targetTenant, /## Target Evidence Capture Template/);
assert.match(
  targetTenant,
  /Do not record raw tenant payloads, customer personal data, private tenant identifiers, encryption key material, customer secrets, private account identifiers, or machine-local absolute paths/,
);
for (const field of [
  'targetTenantIsolationOperationName',
  'tenantIdentityEvidence',
  'authorizationBoundaryEvidence',
  'storagePartitioningEvidence',
  'encryptionKeyEvidence',
  'backupRestoreIsolationEvidence',
  'tenantAdministrationEvidence',
  'crossTenantDenialEvidence',
  'observabilitySupportIsolationEvidence',
  'lifecycleIsolationEvidence',
  'productionReadyClaimDecision',
]) {
  assert.match(targetTenant, new RegExp(`\\| ${escapeRegExp(field)} \\|`), field);
}
assert.match(targetTenant, /must prove tenant identity is customer-approved without exposing private tenant identifiers/);
assert.match(targetTenant, /must prove tenant data storage is partitioned without recording tenant payloads/);
assert.match(targetTenant, /must prove backup and restore actions cannot expose or overwrite another tenant boundary/);
assert.match(targetTenant, /must prove cross-tenant reads, writes, restores, exports, and support visibility are denied/);
assert.match(
  targetTenant,
  /hosted tenant isolation architecture approval, tenant storage admin evidence, runtime isolation, backup\/restore drill evidence, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence/,
);

for (const command of [
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:tenant-storage-admin',
  'npm run smoke:web-tenant-isolation',
  'npm run smoke:tenant-data-lifecycle',
  'npm run smoke:runtime-isolation',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(targetTenant, new RegExp(escapeRegExp(command)));
}

assert.match(hostedTenant, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(tenantStorage, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(targetContract, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(targetContract, /target tenant isolation operations evidence is captured/);
assert.match(targetEnvironment, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(targetEnvironment, /target tenant isolation operations evidence/);
assert.match(releaseReadiness, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(releaseReadiness, /target tenant isolation operations gate: passed/);
assert.match(security, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(deployment, /## Target Tenant Isolation Operations/);
assert.match(deployment, /npm run smoke:target-tenant-isolation-operations/);
assert.match(productPlan, /\[x\] Target tenant isolation operations gate implemented/);
assert.match(readme, /docs\/target-tenant-isolation-operations-v1\.md/);
assert.match(readme, /npm run smoke:target-tenant-isolation-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 9,
      mode: 'target-tenant-isolation-operations',
      ok: true,
      path: 'docs/target-tenant-isolation-operations-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 11,
      targetCaptureTemplate: true,
      tenantPacketItemCount: 14,
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
