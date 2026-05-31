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
  '## Release Blocker Closure Linkage',
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
  /tenant identity source, customer organization mapping, tenant lifecycle owner, trust policy, source approval, and orphan tenant review proof/,
  /tenant-aware authorization policy, service-to-service tenant propagation, stale permission denial, delegated admin boundaries, and denial owner proof/,
  /storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema\/bucket\/keyspace boundary, and migration safety/,
  /per-tenant encryption, key ownership, rotation, revocation, escrow, break-glass, access audit, and key custody evidence/,
  /tenant-scoped backup creation, restore authorization, integrity proof, other-tenant non-interference, and post-restore denial proof/,
  /tenant administration evidence for create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and tenant admin owner/,
  /cross-tenant negative test matrix proof for API, storage, memory, search, export, delete, backup, support, and observability surfaces/,
  /tenant-scoped observability, support ticket visibility, incident review, customer status routing, evidence export, and support owner proof/,
  /retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner evidence per tenant/,
  /release artifact hygiene result, production readiness gate result, and regenerated execution snapshot evidence from the approved production-like or hosted tenant boundary/,
  /residual risk, decision owner, next review date, and tenant data containment plan/,
]) {
  assert.match(targetTenant, packetItem);
}
assert.doesNotMatch(targetTenant, /tenant identity source, customer organization mapping, tenant lifecycle owner, and trust policy/);
assert.doesNotMatch(targetTenant, /storage partitioning evidence for runtime state, artifacts, memory, search, exports, indexes, and migration safety/);
assert.doesNotMatch(targetTenant, /artifact hygiene and production readiness gate result/);

assert.match(
  targetTenant,
  /\| Blocker \| Operations Stop Condition \| Architecture Stop Condition \| Boundary Stop Condition \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  targetTenant,
  /\| target tenant isolation operations \| target-tenant-isolation-operations-missing \| hosted-tenant-isolation-architecture-missing \| target-tenant-boundary-missing-or-mismatched \| 3 \| 18 \| 11 \| 7 \| blocked \|/,
);
assert.match(
  targetTenant,
  /Target tenant isolation operations owns the target tenant identity, authorization, storage partitioning, encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant containment evidence contract/,
);
assert.match(
  targetTenant,
  /Hosted tenant isolation architecture owns the tenant isolation architecture approval and tenant control-plane decision proof/,
);
assert.match(targetTenant, /Tenant storage administration owns the local pilot tenant storage stop condition/);
assert.match(
  targetTenant,
  /Target deployment contract and target environment evidence intake own the same-boundary target tenant isolation evidence verification/,
);
assert.match(
  targetTenant,
  /Keep `productionReadyClaim: false` until linked closure verifications have target tenant isolation operations evidence capture template proof/,
);
assert.match(
  targetTenant,
  /tenant data containment proof, release artifact hygiene result, production readiness gate result, and regenerated execution-v1 snapshot evidence from the same approved production-like or hosted tenant boundary/,
);

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
  /hosted tenant isolation architecture approval, tenant storage admin evidence, runtime isolation, backup\/restore drill evidence, target deployment contract, target environment evidence intake, release artifact hygiene, regenerated execution snapshot evidence, and production readiness gate evidence/,
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
assert.match(
  targetContract,
  /Target tenant isolation operations \| target tenant isolation operations evidence is captured with tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(targetEnvironment, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(
  targetEnvironment,
  /target tenant isolation operations evidence for tenant identity source proof, tenant-scoped authorization proof, storage partitioning proof, per-tenant encryption\/key ownership proof, backup\/restore isolation proof, tenant administration proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(releaseReadiness, /\[target-tenant-isolation-operations-v1\.md\]\(target-tenant-isolation-operations-v1\.md\)/);
assert.match(releaseReadiness, /target tenant isolation operations gate: passed/);
assert.match(
  releaseReadiness,
  /target tenant isolation operations evidence for tenant identity source proof with source owner, customer organization mapping, tenant lifecycle owner, trust policy, source approval, and orphan tenant review, tenant-scoped authorization proof with permission policy, service propagation, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema\/bucket\/keyspace boundary, and migration safety, per-tenant encryption\/key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup\/restore isolation proof with tenant-scoped backup selection, restore authorization, integrity result, other-tenant non-interference, post-restore denial, backup owner, and restore rollback route, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, tenant admin owner, and approval expiry, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability\/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, support owner, and retention class, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, lifecycle owner, and exception policy, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  /target tenant isolation operations evidence for tenant identity source, tenant-scoped authorization, storage partitioning, per-tenant encryption\/key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant data containment is not generated from a production-like environment/,
);
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
