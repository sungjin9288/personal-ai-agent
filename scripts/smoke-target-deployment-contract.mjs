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
assert.match(contract, /blocked by unapproved ADR/);

for (const control of [
  'Hosted SaaS architecture decision',
  'Hosted identity session architecture',
  'Hosted tenant isolation architecture',
  'Target secret manager architecture',
  'Target provider validation',
  'Identity-backed RBAC and session administration',
  'Hosted tenant isolation',
  'Secret management',
  'Retention, export, delete',
  'SLO/SLA operations',
  'Clean deployment release',
  'Customer support operations',
  'Target environment evidence intake',
]) {
  assert.match(contract, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const command of [
  'npm run smoke:target-deployment-contract',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:hosted-saas-architecture-decision',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-provider-evidence-intake',
  'npm run smoke:production-enterprise-controls',
  'npm run smoke:identity-session-admin',
  'npm run smoke:tenant-storage-admin',
  'npm run smoke:production-retention-operating',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:target-retention-operations',
  'npm run smoke:target-backup-operations',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:target-support-operations',
  'npm run smoke:secret-management',
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:target-secret-manager',
  'npm run smoke:observability-telemetry',
  'npm run smoke:target-observability-operations',
  'npm run smoke:production-slo-operating',
  'npm run smoke:clean-deployment-release',
]) {
  assert.match(contract, new RegExp(escapeRegExp(command)));
}

for (const blocker of [
  /stop production-ready claims if any provider included in the production claim lacks provider account approval, target secret injection, target-boundary live validation, quota\/cost guard, model\/endpoint pinning, and fallback evidence/,
  /stop production-ready claims if the target environment evidence intake packet is incomplete/,
  /stop hosted SaaS claims until the hosted SaaS architecture decision record is approved and target evidence is generated/,
  /stop hosted identity-backed RBAC claims until the hosted identity session architecture record is approved and target identity\/session evidence is generated/,
  /stop hosted multi-tenant isolation claims until the hosted tenant isolation architecture record is approved and target isolation evidence is generated/,
  /stop multi-tenant claims until tenant storage, encryption, backup, restore, and tenant administration evidence exist/,
  /stop enterprise RBAC claims until identity-backed user\/session lifecycle/,
  /stop target secret manager claims until the target secret manager architecture record is approved and target secret manager evidence is generated/,
  /stop secret management claims until target secret manager injection, rotation, access policy, audit trail, break-glass, and revocation evidence are captured/,
  /stop retention\/delete claims until target retention configuration, export approval, delete workflow, provider transcript handling, target backup execution, encrypted storage, backup expiry, and post-delete absence evidence are captured/,
  /stop observability claims until target observability telemetry, alert delivery, log\/trace retention, staffed on-call route, customer status communication, and incident review evidence are captured/,
  /stop SLO\/SLA claims until target telemetry, alerting, on-call, and incident response evidence exist/,
  /stop customer support claims until staffed ownership, support queue routing, customer communication route, ticket audit history, on-call handoff, and incident review cadence are proven in the target environment/,
]) {
  assert.match(contract, blocker);
}

assert.match(releaseReadiness, /\[target-deployment-contract-v1\.md\]\(target-deployment-contract-v1\.md\)/);
assert.match(contract, /\[target-provider-evidence-intake-v1\.md\]\(target-provider-evidence-intake-v1\.md\)/);
assert.match(contract, /\[target-environment-evidence-intake-v1\.md\]\(target-environment-evidence-intake-v1\.md\)/);
assert.match(contract, /\[hosted-saas-architecture-decision-v1\.md\]\(hosted-saas-architecture-decision-v1\.md\)/);
assert.match(contract, /\[hosted-identity-session-architecture-v1\.md\]\(hosted-identity-session-architecture-v1\.md\)/);
assert.match(contract, /\[hosted-tenant-isolation-architecture-v1\.md\]\(hosted-tenant-isolation-architecture-v1\.md\)/);
assert.match(contract, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target deployment contract gate: passed/);
assert.match(security, /\[target-deployment-contract-v1\.md\]\(target-deployment-contract-v1\.md\)/);
assert.match(security, /\[hosted-saas-architecture-decision-v1\.md\]\(hosted-saas-architecture-decision-v1\.md\)/);
assert.match(deployment, /## Target Deployment Contract/);
assert.match(deployment, /npm run smoke:target-deployment-contract/);
assert.match(productPlan, /\[x\] Target deployment contract gate implemented/);
assert.match(readme, /npm run smoke:target-deployment-contract/);

console.log(
  JSON.stringify(
    {
      controlCount: 13,
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
