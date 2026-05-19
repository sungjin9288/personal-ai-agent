import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'hosted-tenant-isolation-architecture-v1.md');
const hostedSaasPath = path.join(docsDir, 'hosted-saas-architecture-decision-v1.md');
const tenantStoragePath = path.join(docsDir, 'tenant-storage-admin-v1.md');
const targetTenantPath = path.join(docsDir, 'target-tenant-isolation-operations-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const hostedSaas = readRequiredFile(hostedSaasPath);
const tenantStorage = readRequiredFile(tenantStoragePath);
const targetTenant = readRequiredFile(targetTenantPath);
const targetContract = readRequiredFile(targetContractPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:hosted-tenant-isolation-architecture'],
  'node scripts/smoke-hosted-tenant-isolation-architecture.mjs',
);

assert.match(decision, /^# Hosted Tenant Isolation Architecture v1$/m);
assert.match(decision, /^- status: local-hosted-tenant-isolation-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- hostedTenantIsolationApproved: false$/m);
assert.match(decision, /not hosted tenant isolation implementation/);
assert.match(decision, /not production tenant evidence/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Hosted tenant isolation remains blocked/);

for (const area of [
  'Tenant identity source',
  'Authorization boundary',
  'Storage partitioning',
  'Encryption and key ownership',
  'Backup and restore isolation',
  'Tenant administration',
  'Cross-tenant denial testing',
  'Observability and support isolation',
  'Data lifecycle isolation',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /tenant identity source and customer organization mapping/,
  /tenant lifecycle state machine and ownership model/,
  /tenant-aware authorization policy and service propagation rules/,
  /storage partitioning proof for runtime state, artifacts, memory, search, and exports/,
  /per-tenant encryption, key rotation, revocation, and break-glass evidence/,
  /tenant-scoped backup creation, restore authorization, and post-restore denial proof/,
  /tenant administration workflow with audit history and customer approval trail/,
  /cross-tenant negative test matrix covering API, storage, export, delete, backup, support, and observability surfaces/,
  /tenant-scoped telemetry, support ticket, incident review, and customer status communication proof/,
  /retention, export, delete, provider transcript, legal hold, backup expiry, and post-delete absence evidence per tenant/,
  /migration plan from self-hosted\/local-first runtime roots to hosted tenant partitions/,
  /explicit rollback and tenant data containment plan/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:hosted-saas-architecture-decision',
  'npm run smoke:tenant-storage-admin',
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(hostedSaas, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(tenantStorage, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(targetTenant, /^# Target Tenant Isolation Operations v1$/m);
assert.match(decision, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(targetContract, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(targetContract, /hosted tenant isolation architecture is approved/);
assert.match(targetContract, /npm run smoke:hosted-tenant-isolation-architecture/);
assert.match(releaseReadiness, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(releaseReadiness, /hosted tenant isolation architecture gate: passed/);
assert.match(
  releaseReadiness,
  /hosted tenant isolation architecture is not approved, and hosted tenant isolation architecture evidence for tenant identity source, customer organization mapping, tenant-aware authorization, service-to-service tenant propagation, storage partitioning, per-tenant encryption and key ownership, backup and restore isolation, tenant administration, cross-tenant denial across API, storage, search, export, delete, backup, support, and observability, tenant-scoped telemetry and support visibility, data lifecycle isolation, migration plan, rollback, and tenant data containment is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'hosted tenant isolation architecture is not approved and target tenant ' +
      'isolation evidence is not generated',
  ),
);
assert.match(security, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(deployment, /## Hosted Tenant Isolation Architecture/);
assert.match(deployment, /npm run smoke:hosted-tenant-isolation-architecture/);
assert.match(productPlan, /\[x\] Hosted tenant isolation architecture gate implemented/);
assert.match(readme, /docs\/hosted-tenant-isolation-architecture-v1\.md/);
assert.match(readme, /npm run smoke:hosted-tenant-isolation-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 9,
      hostedTenantIsolationApproved: false,
      mode: 'hosted-tenant-isolation-architecture',
      ok: true,
      path: 'docs/hosted-tenant-isolation-architecture-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 8,
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
