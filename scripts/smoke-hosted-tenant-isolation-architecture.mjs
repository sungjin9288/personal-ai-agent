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
  /tenant identity source proof with tenant source owner, customer organization mapping, lifecycle owner, trust policy, and source approval/,
  /tenant lifecycle proof for create, suspend, restore, delete, owner transfer, exception review, and orphan tenant review/,
  /tenant-aware authorization policy, service-to-service tenant propagation, stale permission denial, delegated admin boundary, and denial owner proof/,
  /storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema\/bucket\/keyspace boundary, and migration safety/,
  /per-tenant encryption and key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision/,
  /tenant-scoped backup creation, restore authorization, integrity result, other-tenant non-interference, and post-restore denial proof/,
  /tenant administration workflow proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and tenant admin owner/,
  /cross-tenant negative test matrix proof covering API, storage, memory, search, export, delete, backup, support, and observability surfaces/,
  /tenant-scoped telemetry, support ticket visibility, incident review, customer status routing, evidence export, and support owner proof/,
  /retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner evidence per tenant/,
  /release artifact hygiene result and regenerated execution snapshot evidence from the approved hosted or production-like tenant boundary/,
  /migration plan from self-hosted\/local-first runtime roots to hosted tenant partitions/,
  /explicit rollback and tenant data containment plan/,
]) {
  assert.match(decision, packetItem);
}
assert.doesNotMatch(decision, /tenant identity source and customer organization mapping/);
assert.doesNotMatch(decision, /tenant-aware authorization policy and service propagation rules/);
assert.doesNotMatch(decision, /per-tenant encryption, key rotation, revocation, and break-glass evidence/);

assert.match(decision, /^## Release Blocker Closure Linkage$/m);
assert.match(
  decision,
  /\| Blocker \| Architecture Stop Condition \| Shared Operations Stop Condition \| Boundary Stop Condition \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  decision,
  /\| hosted tenant isolation architecture \| hosted-tenant-isolation-architecture-missing \| target-tenant-isolation-operations-missing \| hosted-tenant-boundary-missing-or-mismatched \| 3 \| 21 \| 8 \| 6 \| blocked \|/,
);
assert.match(
  decision,
  /Hosted tenant isolation architecture owns the tenant identity source, customer organization mapping, tenant lifecycle, tenant-aware authorization, service-to-service tenant propagation, storage partitioning, artifact\/memory\/search\/export\/index partitioning, per-tenant encryption and key ownership, backup\/restore isolation, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, migration, rollback, and tenant data containment decision proof/,
);
assert.match(
  decision,
  /Target tenant isolation operations owns the target tenant identity, authorization, storage, encryption\/key, backup\/restore, tenant administration, cross-tenant denial, observability\/support isolation, lifecycle isolation, and tenant containment evidence contract/,
);
assert.match(decision, /Tenant storage administration owns the local pilot tenant storage stop condition/);
assert.match(
  decision,
  /Hosted SaaS architecture, target deployment contract, and target environment evidence intake own the same-boundary hosted tenant isolation evidence verification/,
);
assert.match(
  decision,
  /Keep `productionReadyClaim: false` and `hostedTenantIsolationApproved: false` until linked closure verifications have hosted tenant isolation architecture approval proof/,
);
assert.match(
  decision,
  /tenant data containment proof, release artifact hygiene result, production readiness gate result, and regenerated execution-v1 snapshot evidence from the same approved hosted or production-like tenant boundary/,
);

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
assert.match(
  targetContract,
  /Hosted tenant isolation architecture \| hosted tenant isolation architecture is approved with tenant identity source proof, customer organization mapping proof, tenant lifecycle proof, tenant-aware authorization policy proof, service-to-service tenant propagation proof, storage partitioning proof, artifact\/memory\/search\/export\/index partitioning proof, per-tenant encryption and key ownership proof, key rotation\/revocation\/escrow\/break-glass proof, backup creation\/restore authorization\/non-interference\/post-restore denial proof, tenant administration approval\/audit proof, cross-tenant denial proof, observability\/support isolation proof, lifecycle isolation proof, migration plan, rollback, tenant data containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(targetContract, /npm run smoke:hosted-tenant-isolation-architecture/);
assert.match(releaseReadiness, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(releaseReadiness, /hosted tenant isolation architecture gate: passed/);
assert.match(
  releaseReadiness,
  /hosted tenant isolation architecture is not approved, and hosted tenant isolation architecture evidence for tenant identity source proof with tenant source owner, customer organization mapping, lifecycle owner, trust policy, and source approval, tenant lifecycle proof with create, suspend, restore, delete, owner transfer, exception review, and orphan tenant review, tenant-aware authorization proof with policy, service-to-service tenant propagation, stale permission denial, delegated admin boundary, and denial owner, storage partitioning proof for runtime state, artifacts, memory, search, exports, indexes, schema\/bucket\/keyspace boundary, and migration safety, per-tenant encryption and key ownership proof with key owner, rotation, revocation, escrow, break-glass, access audit, and key custody decision, backup\/restore isolation proof with tenant-scoped backup creation, restore authorization, integrity result, other-tenant non-interference, and post-restore denial, tenant administration proof with create, suspend, restore, delete, role delegation, customer approval, audit history, rollback route, and tenant admin owner, cross-tenant denial proof across API, storage, memory, search, export, delete, backup, support, and observability, observability\/support isolation proof with tenant-scoped logs, traces, alerts, support ticket visibility, incident review, customer status routing, evidence export, and support owner, lifecycle isolation proof with retention, export, delete, provider transcript, legal hold, backup expiry, post-delete absence, and lifecycle owner, migration plan, rollback, tenant data containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'hosted tenant isolation architecture is not approved and target tenant ' +
      'isolation evidence is not generated',
  ),
);
assert.doesNotMatch(
  releaseReadiness,
  /hosted tenant isolation architecture evidence for tenant identity source, customer organization mapping, tenant-aware authorization, service-to-service tenant propagation, storage partitioning, per-tenant encryption and key ownership, backup and restore isolation, tenant administration, cross-tenant denial across API, storage, search, export, delete, backup, support, and observability/,
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
