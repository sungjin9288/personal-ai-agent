import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const secretManagementPath = path.join(docsDir, 'secret-management-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const secretManagement = readRequiredFile(secretManagementPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const security = readRequiredFile(securityPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:secret-management'], 'node scripts/smoke-secret-management.mjs');

assert.match(secretManagement, /^# Secret Management v1$/m);
assert.match(secretManagement, /^- status: local-secret-management-current$/m);
assert.match(secretManagement, /^- productionReadyClaim: false$/m);
assert.match(secretManagement, /not target secret manager evidence/);
assert.match(secretManagement, /not permission to claim `production-ready`/);
assert.match(secretManagement, /Secret management remains blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Secret Classes',
  '## Injection Rules',
  '## Redaction And Hygiene Rules',
  '## Rotation And Revocation Checklist',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(secretManagement, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const secretClass of [
  'Provider API key',
  'Web auth token',
  'OIDC/JWKS material',
  'Runtime export material',
  'Emergency access material',
]) {
  assert.match(secretManagement, new RegExp(`\\| ${escapeRegExp(secretClass)} \\|`));
}

for (const command of [
  'npm run smoke:secret-management',
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(secretManagement, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[secret-management-v1\.md\]\(secret-management-v1\.md\)/);
assert.match(secretManagement, /\[target-secret-manager-architecture-v1\.md\]\(target-secret-manager-architecture-v1\.md\)/);
assert.match(releaseReadiness, /local secret management gate: passed/);
assert.match(targetContract, /local secret management, target secret manager contract, and release artifact hygiene pass/);
assert.match(targetContract, /npm run smoke:secret-management/);
assert.match(deployment, /## Secret Management Gate/);
assert.match(deployment, /npm run smoke:secret-management/);
assert.match(security, /\[secret-management-v1\.md\]\(secret-management-v1\.md\)/);
assert.match(productPlan, /\[x\] Secret management gate implemented/);
assert.match(readme, /npm run smoke:secret-management/);

console.log(
  JSON.stringify(
    {
      injectionRuleCount: extractListItems(extractSection(secretManagement, '## Injection Rules')).length,
      mode: 'secret-management',
      ok: true,
      path: 'docs/secret-management-v1.md',
      productionReadyClaim: false,
      secretClassCount: 5,
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

function extractSection(markdown, heading) {
  const escapedHeading = escapeRegExp(heading);
  const match = String(markdown || '').match(new RegExp(`${escapedHeading}\\n([\\s\\S]*?)(?:\\n## |$)`));
  return match ? String(match[1] || '').trim() : '';
}

function extractListItems(markdown) {
  return String(markdown || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
