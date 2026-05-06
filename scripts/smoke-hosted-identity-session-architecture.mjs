import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'hosted-identity-session-architecture-v1.md');
const hostedSaasPath = path.join(docsDir, 'hosted-saas-architecture-decision-v1.md');
const identityAdminPath = path.join(docsDir, 'identity-session-admin-v1.md');
const targetIdentityPath = path.join(docsDir, 'target-identity-session-operations-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const hostedSaas = readRequiredFile(hostedSaasPath);
const identityAdmin = readRequiredFile(identityAdminPath);
const targetIdentity = readRequiredFile(targetIdentityPath);
const targetContract = readRequiredFile(targetContractPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:hosted-identity-session-architecture'],
  'node scripts/smoke-hosted-identity-session-architecture.mjs',
);

assert.match(decision, /^# Hosted Identity Session Architecture v1$/m);
assert.match(decision, /^- status: local-hosted-identity-session-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- hostedIdentitySessionApproved: false$/m);
assert.match(decision, /not hosted identity implementation/);
assert.match(decision, /not customer SSO production evidence/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Hosted identity-backed RBAC and session administration remain blocked/);

for (const area of [
  'Customer identity provider',
  'User lifecycle',
  'Session lifecycle',
  'Role administration',
  'Permission propagation',
  'Audit and evidence',
  'Break-glass access',
  'Support impersonation',
  'Compliance and retention',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /customer IdP onboarding, metadata ownership, issuer\/audience policy, and JWKS rotation evidence/,
  /user lifecycle state machine for provision, invite, suspend, recover, and deprovision/,
  /tenant organization mapping and identity subject normalization rules/,
  /login, refresh, expiry, logout, revocation, idle timeout, and re-auth proof/,
  /persistent role assignment, delegated admin, revocation, and separation-of-duties workflow/,
  /permission propagation and cache invalidation proof across API, worker, agent, support, and observability surfaces/,
  /immutable audit log with actor, subject, tenant, role, session, reason, before\/after state, and timestamp/,
  /break-glass access approval, expiry, monitoring, customer notification, and incident review evidence/,
  /support impersonation approval, scoped session, action log, customer-safe update, and denial test evidence/,
  /identity audit retention, export, legal hold, privacy deletion, and customer handoff evidence/,
  /migration plan from local shared-secret\/OIDC pilot mode to hosted identity control plane/,
  /explicit rollback, lockout recovery, and customer access containment plan/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:hosted-saas-architecture-decision',
  'npm run smoke:identity-session-admin',
  'npm run smoke:target-identity-session-operations',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(hostedSaas, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(identityAdmin, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(targetIdentity, /^# Target Identity Session Operations v1$/m);
assert.match(decision, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(targetContract, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(targetContract, /hosted identity session architecture is approved/);
assert.match(targetContract, /npm run smoke:hosted-identity-session-architecture/);
assert.match(releaseReadiness, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(releaseReadiness, /hosted identity session architecture gate: passed/);
assert.match(security, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(deployment, /## Hosted Identity Session Architecture/);
assert.match(deployment, /npm run smoke:hosted-identity-session-architecture/);
assert.match(productPlan, /\[x\] Hosted identity session architecture gate implemented/);
assert.match(readme, /docs\/hosted-identity-session-architecture-v1\.md/);
assert.match(readme, /npm run smoke:hosted-identity-session-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 9,
      hostedIdentitySessionApproved: false,
      mode: 'hosted-identity-session-architecture',
      ok: true,
      path: 'docs/hosted-identity-session-architecture-v1.md',
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
