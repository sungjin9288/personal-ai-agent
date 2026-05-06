import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'hosted-saas-architecture-decision-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const targetContract = readRequiredFile(targetContractPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:hosted-saas-architecture-decision'],
  'node scripts/smoke-hosted-saas-architecture-decision.mjs',
);

assert.match(decision, /^# Hosted SaaS Architecture Decision v1$/m);
assert.match(decision, /^- status: local-hosted-saas-architecture-decision-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- hostedSaasApproved: false$/m);
assert.match(decision, /not hosted SaaS implementation/);
assert.match(decision, /not production tenant isolation evidence/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Hosted SaaS and hybrid control-plane claims remain blocked/);

for (const area of [
  'Tenant model',
  'Control plane',
  'Identity and authorization',
  'Storage and encryption',
  'Provider and secret management',
  'Billing and entitlement',
  'Observability and support',
  'Data lifecycle',
  'Deployment and compliance',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /decision owner and approving authority/,
  /tenant model and explicit trust boundaries/,
  /control plane versus customer runtime responsibility split/,
  /identity provider, session lifecycle, role lifecycle, and audit model/,
  /hosted storage, encryption, backup, restore, and data residency model/,
  /provider credential ownership, secret manager paths, quota\/cost guard, and fallback policy/,
  /billing, entitlement, metering, suspension, and customer account lifecycle/,
  /observability, alert routing, support ownership, incident review, and customer status communication/,
  /retention, export, delete, provider transcript, legal hold, backup expiry, and post-delete absence policy/,
  /deployment, rollback, vulnerability management, artifact hygiene, and compliance evidence requirements/,
  /migration plan from self-hosted\/local-first pilot to hosted or hybrid mode/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:hosted-saas-architecture-decision',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(targetContract, /\[hosted-saas-architecture-decision-v1\.md\]\(hosted-saas-architecture-decision-v1\.md\)/);
assert.match(decision, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(decision, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(targetContract, /npm run smoke:hosted-saas-architecture-decision/);
assert.match(targetContract, /hosted SaaS architecture decision is approved/);
assert.match(releaseReadiness, /\[hosted-saas-architecture-decision-v1\.md\]\(hosted-saas-architecture-decision-v1\.md\)/);
assert.match(releaseReadiness, /hosted SaaS architecture decision gate: passed/);
assert.match(security, /\[hosted-saas-architecture-decision-v1\.md\]\(hosted-saas-architecture-decision-v1\.md\)/);
assert.match(deployment, /## Hosted SaaS Architecture Decision/);
assert.match(deployment, /npm run smoke:hosted-saas-architecture-decision/);
assert.match(productPlan, /\[x\] Hosted SaaS architecture decision gate implemented/);
assert.match(readme, /docs\/hosted-saas-architecture-decision-v1\.md/);
assert.match(readme, /npm run smoke:hosted-saas-architecture-decision/);

console.log(
  JSON.stringify(
    {
      areaCount: 9,
      hostedSaasApproved: false,
      mode: 'hosted-saas-architecture-decision',
      ok: true,
      path: 'docs/hosted-saas-architecture-decision-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 7,
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
