import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const contractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const contract = readRequiredFile(contractPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-deployment-contract'], 'node scripts/smoke-target-deployment-contract.mjs');

assert.match(contract, /^# Target Deployment Contract v1$/m);
assert.match(contract, /^- status: target-contract-current$/m);
assert.match(contract, /^- productionReadyClaim: false$/m);
assert.match(contract, /not permission to claim `production-ready`/);
assert.match(contract, /OpenAI-scoped pilot-ready only/);

for (const heading of [
  '## Decision Boundary',
  '## Target Deployment Profiles',
  '## Mandatory Controls',
  '## Required Commands',
  '## Blocking Rules',
  '## Operator Handoff',
]) {
  assert.match(contract, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const profile of [
  'Self-hosted local-first pilot',
  'Production-like single-tenant deployment',
  'Hosted multi-tenant SaaS',
  'Hybrid control plane',
]) {
  assert.match(contract, new RegExp(`\\| ${escapeRegExp(profile)} \\|`));
}

for (const control of [
  'Target provider validation',
  'Identity-backed RBAC and session administration',
  'Hosted tenant isolation',
  'Secret management',
  'Retention, export, delete',
  'SLO/SLA operations',
  'Clean deployment release',
  'Customer support operations',
]) {
  assert.match(contract, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const command of [
  'npm run smoke:target-deployment-contract',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:production-enterprise-controls',
  'npm run smoke:production-retention-operating',
  'npm run smoke:customer-support-operations',
  'npm run smoke:secret-management',
  'npm run smoke:production-slo-operating',
  'npm run smoke:clean-deployment-release',
]) {
  assert.match(contract, new RegExp(escapeRegExp(command)));
}

for (const blocker of [
  /stop production-ready claims if any provider included in the production claim lacks successful live validation/,
  /stop hosted SaaS claims until a separate SaaS architecture decision record exists/,
  /stop multi-tenant claims until tenant storage, encryption, backup, restore, and tenant administration evidence exist/,
  /stop enterprise RBAC claims until identity-backed user\/session lifecycle/,
  /stop secret management claims until target secret manager injection, rotation, access policy, audit trail, break-glass, and revocation evidence are captured/,
  /stop retention\/delete claims until target backup expiry, provider transcript handling, and post-delete absence evidence are captured/,
  /stop SLO\/SLA claims until target telemetry, alerting, on-call, and incident response evidence exist/,
  /stop customer support claims until staffed ownership, customer communication route, support audit history, and incident review cadence are proven in the target environment/,
]) {
  assert.match(contract, blocker);
}

assert.match(releaseReadiness, /\[target-deployment-contract-v1\.md\]\(target-deployment-contract-v1\.md\)/);
assert.match(releaseReadiness, /target deployment contract gate: passed/);
assert.match(security, /\[target-deployment-contract-v1\.md\]\(target-deployment-contract-v1\.md\)/);
assert.match(security, /cloud SaaS mode requires a separate architecture decision record/);
assert.match(deployment, /## Target Deployment Contract/);
assert.match(deployment, /npm run smoke:target-deployment-contract/);
assert.match(productPlan, /\[x\] Target deployment contract gate implemented/);
assert.match(readme, /npm run smoke:target-deployment-contract/);

console.log(
  JSON.stringify(
    {
      controlCount: 8,
      mode: 'target-deployment-contract',
      ok: true,
      path: 'docs/target-deployment-contract-v1.md',
      productionReadyClaim: false,
      profileCount: 4,
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
