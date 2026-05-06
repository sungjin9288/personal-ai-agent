import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const supportReviewPath = path.join(docsDir, 'support-escalation-review-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const supportReview = readRequiredFile(supportReviewPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:support-escalation-review'], 'node scripts/smoke-support-escalation-review.mjs');

assert.match(supportReview, /^# Support Escalation Review v1$/m);
assert.match(supportReview, /^- status: local-support-escalation-review-current$/m);
assert.match(supportReview, /^- productionReadyClaim: false$/m);
assert.match(supportReview, /not staffed production support evidence/);
assert.match(supportReview, /not permission to claim `production-ready`/);
assert.match(supportReview, /Support escalation and incident review remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Escalation Routes',
  '## Audit Packet Requirements',
  '## Incident Review Cadence',
  '## Customer Update Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(supportReview, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const route of [
  'SEV1 customer-impacting incident',
  'SEV2 pilot blocker',
  'SEV3 operational follow-up',
  'SEV4 backlog item',
]) {
  assert.match(supportReview, new RegExp(`\\| ${escapeRegExp(route)} \\|`));
}

for (const review of ['Initial triage', 'Customer update', 'Closure review', 'Monthly pilot review']) {
  assert.match(supportReview, new RegExp(`\\| ${escapeRegExp(review)} \\|`));
}

for (const packetItem of [
  'branch and commit',
  'release label and deployment boundary',
  'artifact hygiene result',
  'owner and next update time',
  'mitigation, accepted risk, or closure decision',
]) {
  assert.match(supportReview, new RegExp(`- ${escapeRegExp(packetItem)}`));
}

for (const command of [
  'npm run smoke:support-escalation-review',
  'npm run smoke:customer-support-operations',
  'npm run smoke:incident-slo-policy',
  'npm run smoke:observability-telemetry',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(supportReview, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[support-escalation-review-v1\.md\]\(support-escalation-review-v1\.md\)/);
assert.match(releaseReadiness, /local support escalation review gate: passed/);
assert.match(targetContract, /local support operations, support escalation review, target support architecture, and target support operations gates pass/);
assert.match(targetContract, /npm run smoke:support-escalation-review/);
assert.match(deployment, /## Support Escalation Review Gate/);
assert.match(deployment, /npm run smoke:support-escalation-review/);
assert.match(productPlan, /\[x\] Support escalation review gate implemented/);
assert.match(readme, /npm run smoke:support-escalation-review/);

console.log(
  JSON.stringify(
    {
      auditPacketItemCount: 10,
      escalationRouteCount: 4,
      mode: 'support-escalation-review',
      ok: true,
      path: 'docs/support-escalation-review-v1.md',
      productionReadyClaim: false,
      reviewCadenceCount: 4,
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
