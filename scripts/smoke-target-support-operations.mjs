import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetSupportPath = path.join(docsDir, 'target-support-operations-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetSupport = readRequiredFile(targetSupportPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const security = readRequiredFile(securityPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-support-operations'], 'node scripts/smoke-target-support-operations.mjs');

assert.match(targetSupport, /^# Target Support Operations v1$/m);
assert.match(targetSupport, /^- status: local-target-support-operations-current$/m);
assert.match(targetSupport, /^- productionReadyClaim: false$/m);
assert.match(targetSupport, /not staffed target support evidence/);
assert.match(targetSupport, /not a support ticketing export/);
assert.match(targetSupport, /not permission to claim `production-ready`/);
assert.match(targetSupport, /Target support operations remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Support Operation Controls',
  '## Support Evidence Packet',
  '## Customer Support Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetSupport, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Staffed coverage',
  'Support queue routing',
  'Customer communication',
  'Ticket audit history',
  'Incident review cadence',
  'On-call handoff',
]) {
  assert.match(targetSupport, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const command of [
  'npm run smoke:target-support-operations',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:production-slo-operating',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(targetSupport, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[target-support-operations-v1\.md\]\(target-support-operations-v1\.md\)/);
assert.match(releaseReadiness, /local target support operations gate: passed/);
assert.match(targetContract, /local support operations, support escalation review, and target support operations gates pass/);
assert.match(targetContract, /npm run smoke:target-support-operations/);
assert.match(deployment, /## Target Support Operations Gate/);
assert.match(deployment, /npm run smoke:target-support-operations/);
assert.match(security, /\[target-support-operations-v1\.md\]\(target-support-operations-v1\.md\)/);
assert.match(productPlan, /\[x\] Target support operations gate implemented/);
assert.match(readme, /npm run smoke:target-support-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 6,
      mode: 'target-support-operations',
      ok: true,
      path: 'docs/target-support-operations-v1.md',
      productionReadyClaim: false,
      supportPacketItemCount: 10,
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
