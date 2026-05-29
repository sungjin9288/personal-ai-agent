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
  /release artifact hygiene result and regenerated execution snapshot evidence from the approved hosted or production-like identity boundary/,
  /migration plan from local shared-secret\/OIDC pilot mode to hosted identity control plane/,
  /explicit rollback, lockout recovery, and customer access containment plan/,
]) {
  assert.match(decision, packetItem);
}
assert.match(
  decision,
  /target evidence is generated from the approved hosted or production-like environment for customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  decision,
  /Hosted identity-backed RBAC and session administration remain blocked until a replacement architecture decision is approved, implementation is completed, target evidence is generated from the approved hosted or production-like environment for customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before\/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
);

assert.match(decision, /^## Release Blocker Closure Linkage$/m);
assert.match(
  decision,
  /\| Blocker \| Architecture Stop Condition \| Shared Operations Stop Condition \| Boundary Stop Condition \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  decision,
  /\| hosted identity session architecture \| hosted-identity-session-architecture-missing \| target-identity-session-operations-missing \| hosted-identity-boundary-missing-or-mismatched \| 3 \| 17 \| 8 \| 6 \| blocked \|/,
);
assert.match(
  decision,
  /Hosted identity session architecture owns the customer IdP, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit, break-glass, support impersonation, compliance, and retention decision proof/,
);
assert.match(
  decision,
  /Target identity\/session operations owns the target identity provider onboarding, session lifecycle execution, role administration, permission propagation, audit export, break-glass, support impersonation, and identity retention evidence contract/,
);
assert.match(decision, /Identity session administration owns the local pilot identity\/session stop condition/);
assert.match(
  decision,
  /Hosted SaaS architecture, target deployment contract, and target environment evidence intake own the same-boundary hosted identity evidence verification/,
);
assert.match(
  decision,
  /Keep `productionReadyClaim: false` and `hostedIdentitySessionApproved: false` until linked closure verifications have hosted identity session architecture approval proof/,
);
assert.match(
  decision,
  /customer access containment proof, release artifact hygiene result, production readiness gate result, and regenerated execution-v1 snapshot evidence from the same approved hosted or production-like identity boundary/,
);

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
assert.match(
  targetContract,
  /Hosted identity session architecture \| hosted identity session architecture is approved with customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(targetContract, /npm run smoke:hosted-identity-session-architecture/);
assert.match(releaseReadiness, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(releaseReadiness, /hosted identity session architecture gate: passed/);
assert.match(
  releaseReadiness,
  /hosted identity session architecture is not approved, and hosted identity\/session architecture evidence for customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before\/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'hosted identity session architecture is not approved and target identity/session ' +
      'evidence is not generated',
  ),
);
assert.doesNotMatch(
  releaseReadiness,
  /hosted identity session architecture is not approved, and hosted identity\/session architecture evidence for customer IdP onboarding, metadata ownership, issuer\/audience policy, JWKS rotation, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance and retention, rollback and lockout recovery, and customer access containment is not generated from a production-like environment/,
);
assert.match(security, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(deployment, /## Hosted Identity Session Architecture/);
assert.match(deployment, /npm run smoke:hosted-identity-session-architecture/);
assert.match(productPlan, /\[x\] Hosted identity session architecture gate implemented/);
assert.match(readme, /docs\/hosted-identity-session-architecture-v1\.md/);
assert.match(readme, /npm run smoke:hosted-identity-session-architecture/);
assert.match(readme, /customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, migration plan, rollback, lockout recovery, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence requirements/);

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
