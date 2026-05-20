import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetIdentityPath = path.join(docsDir, 'target-identity-session-operations-v1.md');
const hostedIdentityPath = path.join(docsDir, 'hosted-identity-session-architecture-v1.md');
const identityAdminPath = path.join(docsDir, 'identity-session-admin-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const targetEnvironmentPath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetIdentity = readRequiredFile(targetIdentityPath);
const hostedIdentity = readRequiredFile(hostedIdentityPath);
const identityAdmin = readRequiredFile(identityAdminPath);
const targetContract = readRequiredFile(targetContractPath);
const targetEnvironment = readRequiredFile(targetEnvironmentPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-identity-session-operations'],
  'node scripts/smoke-target-identity-session-operations.mjs',
);

assert.match(targetIdentity, /^# Target Identity Session Operations v1$/m);
assert.match(targetIdentity, /^- status: local-target-identity-session-operations-current$/m);
assert.match(targetIdentity, /^- productionReadyClaim: false$/m);
assert.match(targetIdentity, /not hosted identity architecture approval/);
assert.match(targetIdentity, /not target identity\/session evidence/);
assert.match(targetIdentity, /not customer SSO production proof/);
assert.match(targetIdentity, /not permission to claim `production-ready`/);
assert.match(targetIdentity, /Target identity\/session operations remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Identity Operation Controls',
  '## Identity Evidence Packet',
  '## Target Evidence Capture Template',
  '## Identity Operation Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetIdentity, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Customer IdP onboarding',
  'User lifecycle',
  'Session lifecycle',
  'Role administration',
  'Permission propagation',
  'Audit export',
  'Break-glass access',
  'Support impersonation',
  'Compliance and retention',
]) {
  assert.match(targetIdentity, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const packetItem of [
  /completed target identity\/session operations evidence capture template for the approved production-like or hosted boundary/,
  /customer IdP metadata alias, owner, issuer, audience, JWKS rotation owner, and fallback owner/,
  /user lifecycle evidence for provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review/,
  /session lifecycle evidence for login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth/,
  /role administration evidence for persistent assignment, revocation, delegated admin approval, separation of duties, and rollback/,
  /permission propagation evidence across API, worker, agent, support, observability, and cache invalidation surfaces/,
  /immutable audit export with actor, subject, tenant, role, session, reason, before\/after state, timestamp, and export checksum/,
  /break-glass evidence with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review/,
  /support impersonation evidence with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure/,
  /identity retention, legal hold, audit export, privacy deletion, and customer handoff evidence/,
  /artifact hygiene and production readiness gate result/,
  /regenerated execution snapshot evidence from the approved production-like or hosted identity boundary/,
  /residual risk, decision owner, next review date, and customer access containment plan/,
]) {
  assert.match(targetIdentity, packetItem);
}
assert.match(
  targetIdentity,
  /Production-ready remains blocked until the approved target environment proves customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before\/after state, timestamp, and checksum, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  targetIdentity,
  /Target identity\/session operations remain blocked for production-ready claims until customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before\/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence are captured from the approved production-like or hosted target environment/,
);

assert.match(targetIdentity, /## Target Evidence Capture Template/);
assert.match(
  targetIdentity,
  /Do not record raw tokens, private IdP credentials, customer secrets, customer personal data, tenant payloads, private account identifiers, or machine-local absolute paths/,
);
for (const field of [
  'targetIdentitySessionOperationName',
  'idpOnboardingEvidence',
  'userLifecycleEvidence',
  'sessionLifecycleEvidence',
  'roleAdministrationEvidence',
  'permissionPropagationEvidence',
  'auditExportEvidence',
  'breakGlassEvidence',
  'supportImpersonationEvidence',
  'complianceRetentionEvidence',
  'productionReadyClaimDecision',
]) {
  assert.match(targetIdentity, new RegExp(`\\| ${escapeRegExp(field)} \\|`), field);
}
assert.match(targetIdentity, /must prove customer IdP onboarding is approved without recording private credentials or raw tokens/);
assert.match(targetIdentity, /must prove session termination and stale session denial are verified from the target boundary/);
assert.match(targetIdentity, /must prove support access is explicitly approved, scoped, denied by default, and closed/);
assert.match(
  targetIdentity,
  /hosted identity session architecture approval, identity session admin evidence, target deployment contract, target environment evidence intake, release artifact hygiene, and production readiness gate evidence/,
);

for (const command of [
  'npm run smoke:target-identity-session-operations',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:identity-session-admin',
  'npm run smoke:web-auth-rbac',
  'npm run smoke:web-oidc-rbac',
  'npm run smoke:web-tenant-isolation',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(targetIdentity, new RegExp(escapeRegExp(command)));
}

assert.match(hostedIdentity, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(identityAdmin, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(targetContract, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(
  targetContract,
  /Target identity session operations \| target identity session operations evidence is captured with customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(targetEnvironment, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(
  targetEnvironment,
  /Identity and sessions \| hosted identity\/session approval, customer IdP onboarding proof, user lifecycle proof, session lifecycle proof, role administration proof, permission propagation proof, immutable audit export proof, break-glass governance proof, support impersonation proof, compliance and retention proof, target identity session operations evidence, customer access containment, release artifact hygiene, and regenerated execution snapshot evidence are proven/,
);
assert.match(releaseReadiness, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(releaseReadiness, /target identity session operations gate: passed/);
assert.match(
  releaseReadiness,
  /target identity\/session operations evidence for customer IdP onboarding proof with metadata alias, issuer, audience, JWKS rotation owner, fallback owner, and customer approval, user lifecycle proof with provision, invitation, suspension, recovery, deprovision, tenant mapping, and orphan account review, session lifecycle proof with login, refresh, expiry, logout, revocation, idle timeout, device inventory, and re-auth, role administration proof with persistent assignment, revocation, delegated admin approval, separation-of-duties, and rollback, permission propagation proof across API, worker, agent, support, observability, cache invalidation, and stale permission denial, immutable audit export proof with actor, subject, tenant, role, session, reason, before\/after state, timestamp, and checksum, break-glass governance proof with owner, approver, scope, expiry, monitoring, customer notification, revocation, and post-use review, support impersonation proof with approval, scoped session, action log, customer-safe update, denial tests, expiry, and closure, compliance and retention proof with identity log retention, legal hold, audit export, privacy deletion, post-delete absence, and customer handoff, customer access containment, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  /target identity\/session operations evidence for customer IdP onboarding, user lifecycle, session lifecycle, role administration, permission propagation, immutable audit export, break-glass access, support impersonation, compliance, retention, and customer access containment is not generated from a production-like environment/,
);
assert.match(security, /\[target-identity-session-operations-v1\.md\]\(target-identity-session-operations-v1\.md\)/);
assert.match(deployment, /## Target Identity Session Operations/);
assert.match(deployment, /npm run smoke:target-identity-session-operations/);
assert.match(productPlan, /\[x\] Target identity session operations gate implemented/);
assert.match(readme, /docs\/target-identity-session-operations-v1\.md/);
assert.match(readme, /npm run smoke:target-identity-session-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 9,
      identityPacketItemCount: 15,
      mode: 'target-identity-session-operations',
      ok: true,
      path: 'docs/target-identity-session-operations-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 10,
      targetCaptureTemplate: true,
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
