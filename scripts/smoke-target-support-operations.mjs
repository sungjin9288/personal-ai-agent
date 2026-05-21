import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetSupportPath = path.join(docsDir, 'target-support-operations-v1.md');
const targetSupportArchitecturePath = path.join(docsDir, 'target-support-architecture-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const targetEnvironmentPath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetSupport = readRequiredFile(targetSupportPath);
const targetSupportArchitecture = readRequiredFile(targetSupportArchitecturePath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const targetEnvironment = readRequiredFile(targetEnvironmentPath);
const deployment = readRequiredFile(deploymentPath);
const security = readRequiredFile(securityPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-support-operations'], 'node scripts/smoke-target-support-operations.mjs');

assert.match(targetSupport, /^# Target Support Operations v1$/m);
assert.match(targetSupport, /^- status: local-target-support-operations-current$/m);
assert.match(targetSupport, /^- productionReadyClaim: false$/m);
assert.match(targetSupport, /not target support architecture approval/);
assert.match(targetSupport, /not staffed target support evidence/);
assert.match(targetSupport, /not a support ticketing export/);
assert.match(targetSupport, /not permission to claim `production-ready`/);
assert.match(targetSupport, /Target support operations remain blocked for production-ready claims/);
assert.match(targetSupport, /release artifact hygiene/);
assert.match(targetSupport, /regenerated execution snapshot evidence/);

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
  'Escalation ownership',
  'Incident review cadence',
  'On-call handoff',
  'Support data handling',
]) {
  assert.match(targetSupport, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const packetItem of [
  /branch, commit, release label, and deployment boundary from the approved production-like or hosted target environment/,
  /target support architecture approval proof with approved support architecture record, support owner, reviewer, customer\/workspace scope, and review date/,
  /staffed support coverage proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, absence handling, and acknowledgement evidence/,
  /support queue routing proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, access policy, assignment audit, and escalation evidence/,
  /customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, message reference, and closure message/,
  /ticket audit history proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, evidence owner, and closure audit/,
  /escalation ownership proof with incident commander, engineering escalation, provider escalation, executive\/customer escalation, backup owner, retry history, failure fallback, and audit record/,
  /on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, and escalation chain/,
  /incident review cadence proof with review cadence, timeline, mitigation owner, customer impact summary, corrective action owner, due date, review decision, closure evidence, and evidence retention/,
  /support data handling proof with secret redaction, customer data redaction, provider transcript handling, ticket attachment rule, access audit, and hygiene result/,
  /release artifact hygiene result, regenerated execution snapshot evidence, and production readiness gate result/,
  /residual support risk, decision owner, next review date, customer handoff decision, and missed-support containment plan/,
]) {
  assert.match(targetSupport, packetItem);
}

for (const command of [
  'npm run smoke:target-support-operations',
  'npm run smoke:target-support-architecture',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:production-slo-operating',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-slo-operations',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(targetSupport, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[target-support-operations-v1\.md\]\(target-support-operations-v1\.md\)/);
assert.match(
  releaseReadiness,
  /local target support operations gate: passed, with staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, regenerated execution snapshot evidence requirements, and `productionReadyClaim: false`/,
);
assert.match(targetSupportArchitecture, /^# Target Support Architecture v1$/m);
assert.match(targetContract, /local support operations, support escalation review, target support architecture, and target support operations gates pass/);
assert.match(
  targetContract,
  /target support operations evidence is captured with staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  targetContract,
  /dataLifecycleSupportEvidence \| target data lifecycle approval, target retention operations evidence with customer-approved data class proof, target retention configuration proof, export approval proof, delete workflow proof, provider transcript handling proof, post-delete absence proof, audit history proof, release artifact hygiene, and regenerated execution snapshot evidence, target backup operations evidence with backup schedule execution proof, encrypted backup storage proof, backup key ownership proof, restore validation proof, tenant isolation proof, backup expiry\/deletion proof, disaster recovery proof, release artifact hygiene, and regenerated execution snapshot evidence, target support operations evidence with staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(
  targetContract,
  /stop target support claims until the target support architecture record is approved and staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence are captured/,
);
assert.match(targetContract, /npm run smoke:target-support-operations/);
assert.match(targetContract, /npm run smoke:target-support-architecture/);
assert.match(
  targetEnvironment,
  /supportOperationsEvidence \| target support architecture approval, staffed support coverage proof, support queue routing proof, customer communication proof, ticket audit history proof, escalation ownership proof, incident review cadence proof, on-call handoff proof, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(
  releaseReadiness,
  /target support operations evidence for staffed support coverage proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, absence handling, and acknowledgement evidence, support queue routing proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, access policy, assignment audit, and escalation evidence, customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, message reference, and closure message, ticket audit history proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, evidence owner, and closure audit, escalation ownership proof with incident commander, engineering escalation, provider escalation, executive\/customer escalation, backup owner, retry history, failure fallback, and audit record, incident review cadence proof with review cadence, timeline, mitigation owner, customer impact summary, corrective action owner, due date, review decision, closure evidence, and evidence retention, on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, handoff log, and escalation chain, support data handling proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.doesNotMatch(
  releaseReadiness,
  /target support operations evidence for staffed support coverage, support queue routing, customer communication, ticket audit history, escalation ownership, incident review cadence, on-call handoff, and closure evidence is not generated from a production-like environment/,
);
assert.match(deployment, /## Target Support Operations Gate/);
assert.match(deployment, /npm run smoke:target-support-operations/);
assert.match(deployment, /## Target Support Architecture/);
assert.match(deployment, /npm run smoke:target-support-architecture/);
assert.match(security, /\[target-support-operations-v1\.md\]\(target-support-operations-v1\.md\)/);
assert.match(productPlan, /\[x\] Target support operations gate implemented/);
assert.match(readme, /npm run smoke:target-support-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 8,
      mode: 'target-support-operations',
      ok: true,
      path: 'docs/target-support-operations-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 11,
      supportPacketItemCount: 12,
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
