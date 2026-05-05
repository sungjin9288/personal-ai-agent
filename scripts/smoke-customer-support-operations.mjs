import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const supportPath = path.join(docsDir, 'customer-support-operations-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const support = readRequiredFile(supportPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:customer-support-operations'],
  'node scripts/smoke-customer-support-operations.mjs',
);

assert.match(support, /^# Customer Support Operations v1$/m);
assert.match(support, /^- status: local-support-operations-current$/m);
assert.match(support, /^- productionReadyClaim: false$/m);
assert.match(support, /not staffed production support evidence/);
assert.match(support, /not permission to claim `production-ready`/);
assert.match(support, /Customer support operations remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Support Roles',
  '## Support Intake Classes',
  '## Escalation Matrix',
  '## Customer Communication Rules',
  '## Pilot Handoff Checklist',
  '## Required Commands',
  '## Evidence Requirements',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(support, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const role of ['Support owner', 'Technical operator', 'Incident commander', 'Customer contact', 'Evidence owner']) {
  assert.match(support, new RegExp(`\\| ${escapeRegExp(role)} \\|`));
}

for (const intakeClass of [
  'Access or auth issue',
  'Provider execution issue',
  'Data lifecycle issue',
  'Release evidence issue',
  'Incident or security issue',
]) {
  assert.match(support, new RegExp(`\\| ${escapeRegExp(intakeClass)} \\|`));
}

for (const command of [
  'npm run smoke:customer-support-operations',
  'npm run smoke:incident-slo-policy',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:execution-v1-status',
]) {
  assert.match(support, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[customer-support-operations-v1\.md\]\(customer-support-operations-v1\.md\)/);
assert.match(releaseReadiness, /local customer support operations gate: passed/);
assert.match(targetContract, /local support operations and support escalation review gates pass/);
assert.match(targetContract, /npm run smoke:customer-support-operations/);
assert.match(deployment, /## Customer Support Operations Gate/);
assert.match(deployment, /npm run smoke:customer-support-operations/);
assert.match(productPlan, /\[x\] Customer support operations gate implemented/);
assert.match(readme, /npm run smoke:customer-support-operations/);

console.log(
  JSON.stringify(
    {
      communicationRuleCount: extractListItems(extractSection(support, '## Customer Communication Rules')).length,
      intakeClassCount: 5,
      mode: 'customer-support-operations',
      ok: true,
      path: 'docs/customer-support-operations-v1.md',
      productionReadyClaim: false,
      supportRoleCount: 5,
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
