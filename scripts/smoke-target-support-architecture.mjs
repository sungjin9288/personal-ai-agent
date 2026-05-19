import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-support-architecture-v1.md');
const targetSupportOperationsPath = path.join(docsDir, 'target-support-operations-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const targetSupportOperations = readRequiredFile(targetSupportOperationsPath);
const targetContract = readRequiredFile(targetContractPath);
const intake = readRequiredFile(intakePath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-support-architecture'],
  'node scripts/smoke-target-support-architecture.mjs',
);

assert.match(decision, /^# Target Support Architecture v1$/m);
assert.match(decision, /^- status: local-target-support-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetSupportApproved: false$/m);
assert.match(decision, /not staffed support implementation/);
assert.match(decision, /not ticketing system proof/);
assert.match(decision, /not on-call rota proof/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Target support readiness remains blocked/);

for (const area of [
  'Staffing model',
  'Support queue platform',
  'Severity and routing policy',
  'Customer communication boundary',
  'Ticket audit and retention',
  'On-call handoff',
  'Incident commander ownership',
  'Escalation and backup coverage',
  'Support data handling',
  'Incident review governance',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /staffing model proof with support owner, coverage window, primary rota, secondary rota, backup policy, timezone coverage, and absence handling/,
  /support queue proof with ticketing system, queue identifier, severity mapping, routing rule, retry path, queue owner, and access policy/,
  /severity routing proof with acknowledgement target, escalation timeout, incident commander handoff, customer impact rule, and audit record/,
  /customer communication proof with approved channel, update cadence, message owner, approval path, status route, customer-visible timestamp, and closure message/,
  /ticket audit proof with lifecycle history, assignment history, customer-visible update history, redaction result, retention period, and evidence owner/,
  /on-call handoff proof with primary owner, secondary owner, acknowledgement timestamp, missed-ack rule, paging fallback, and handoff log/,
  /incident commander proof with assignment record, decision authority, mitigation owner, rollback owner, and communication owner/,
  /escalation proof with engineering escalation, provider escalation, executive\/customer escalation, backup owner, retry history, and failure fallback/,
  /support data handling proof with secret redaction, customer data redaction, provider transcript handling, attachment rule, access audit, and hygiene result/,
  /incident review governance proof with review cadence, corrective action owner, due date, customer impact summary, closure decision, and evidence retention/,
  /migration plan from local customer support operations, support escalation review, and target support operations gates to approved target support architecture/,
  /explicit containment plan for missed acknowledgement, queue misrouting, customer communication failure, ticket audit gaps, and unstaffed escalation/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:target-support-architecture',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:target-support-operations',
  'npm run smoke:incident-slo-policy',
  'npm run smoke:production-slo-operating',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(targetSupportOperations, /\[target-support-architecture-v1\.md\]\(target-support-architecture-v1\.md\)/);
assert.match(targetSupportOperations, /npm run smoke:target-support-architecture/);
assert.match(targetContract, /\[target-support-architecture-v1\.md\]\(target-support-architecture-v1\.md\)/);
assert.match(targetContract, /target support architecture is approved/);
assert.match(intake, /\[target-support-architecture-v1\.md\]\(target-support-architecture-v1\.md\)/);
assert.match(intake, /npm run smoke:target-support-architecture/);
assert.match(releaseReadiness, /\[target-support-architecture-v1\.md\]\(target-support-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target support architecture gate: passed/);
assert.match(
  releaseReadiness,
  /target support architecture is not approved, and target support architecture evidence for staffing model, support queue platform, severity routing, customer communication boundary, ticket audit and retention, on-call handoff, incident commander ownership, escalation and backup coverage, support data handling, incident review governance, migration plan, and missed-acknowledgement, queue-misrouting, customer-communication, ticket-audit, and unstaffed-escalation containment is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp('target support architecture is not approved and target support evidence is not generated from ' + 'a production-like environment'),
);
assert.match(security, /\[target-support-architecture-v1\.md\]\(target-support-architecture-v1\.md\)/);
assert.match(deployment, /## Target Support Architecture/);
assert.match(deployment, /npm run smoke:target-support-architecture/);
assert.match(productPlan, /\[x\] Target support architecture gate implemented/);
assert.match(readme, /docs\/target-support-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-support-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-support-architecture',
      ok: true,
      path: 'docs/target-support-architecture-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 11,
      targetSupportApproved: false,
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
