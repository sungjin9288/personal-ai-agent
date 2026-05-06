import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const identityPath = path.join(docsDir, 'identity-session-admin-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const identity = readRequiredFile(identityPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const security = readRequiredFile(securityPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:identity-session-admin'], 'node scripts/smoke-identity-session-admin.mjs');

assert.match(identity, /^# Identity Session Administration v1$/m);
assert.match(identity, /^- status: local-identity-session-admin-current$/m);
assert.match(identity, /^- productionReadyClaim: false$/m);
assert.match(identity, /not hosted identity evidence/);
assert.match(identity, /not permission to claim `production-ready`/);
assert.match(identity, /Identity-backed RBAC and session administration remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Identity Controls',
  '## Session Lifecycle',
  '## Audit Packet Requirements',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(identity, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'OIDC/JWKS bearer validation',
  'Role claim mapping',
  'Shared-secret fallback',
  'Session boundary',
  'Permission audit',
]) {
  assert.match(identity, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const event of ['Login', 'Expiry', 'Logout', 'Revocation', 'Role change']) {
  assert.match(identity, new RegExp(`\\| ${escapeRegExp(event)} \\|`));
}

for (const packetItem of [
  'branch and commit',
  'release label and deployment boundary',
  'identity mode and token source',
  'role assignment or revocation reason',
  'rollback or revocation step',
]) {
  assert.match(identity, new RegExp(`- ${escapeRegExp(packetItem)}`));
}

for (const command of [
  'npm run smoke:identity-session-admin',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:web-auth-rbac',
  'npm run smoke:web-oidc-rbac',
  'npm run smoke:web-tenant-isolation',
  'npm run smoke:production-enterprise-controls',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(identity, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[identity-session-admin-v1\.md\]\(identity-session-admin-v1\.md\)/);
assert.match(identity, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(releaseReadiness, /local identity session administration gate: passed/);
assert.match(targetContract, /local identity session administration, shared-secret, OIDC\/JWKS, and RBAC gates pass/);
assert.match(targetContract, /npm run smoke:identity-session-admin/);
assert.match(deployment, /## Identity Session Administration Gate/);
assert.match(deployment, /npm run smoke:identity-session-admin/);
assert.match(productPlan, /\[x\] Identity session administration gate implemented/);
assert.match(security, /\[identity-session-admin-v1\.md\]\(identity-session-admin-v1\.md\)/);
assert.match(readme, /npm run smoke:identity-session-admin/);

console.log(
  JSON.stringify(
    {
      auditPacketItemCount: 10,
      controlCount: 5,
      mode: 'identity-session-admin',
      ok: true,
      path: 'docs/identity-session-admin-v1.md',
      productionReadyClaim: false,
      sessionEventCount: 5,
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
