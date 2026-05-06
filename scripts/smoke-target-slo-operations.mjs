import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetSloOperationsPath = path.join(docsDir, 'target-slo-operations-v1.md');
const targetSloArchitecturePath = path.join(docsDir, 'target-slo-architecture-v1.md');
const productionSloPath = path.join(docsDir, 'production-slo-operating-v1.md');
const incidentSloPath = path.join(docsDir, 'incident-slo-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const targetEnvironmentPath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetSloOperations = readRequiredFile(targetSloOperationsPath);
const targetSloArchitecture = readRequiredFile(targetSloArchitecturePath);
const productionSlo = readRequiredFile(productionSloPath);
const incidentSlo = readRequiredFile(incidentSloPath);
const targetContract = readRequiredFile(targetContractPath);
const targetEnvironment = readRequiredFile(targetEnvironmentPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-slo-operations'], 'node scripts/smoke-target-slo-operations.mjs');

assert.match(targetSloOperations, /^# Target SLO Operations v1$/m);
assert.match(targetSloOperations, /^- status: local-target-slo-operations-current$/m);
assert.match(targetSloOperations, /^- productionReadyClaim: false$/m);
assert.match(targetSloOperations, /not contractual SLA approval/);
assert.match(targetSloOperations, /not target SLO architecture approval/);
assert.match(targetSloOperations, /not service credit policy approval/);
assert.match(targetSloOperations, /not permission to claim `production-ready`/);
assert.match(targetSloOperations, /Target SLO operations remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## SLO Operation Controls',
  '## SLO Evidence Packet',
  '## SLO Operation Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetSloOperations, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Customer SLO terms',
  'Error budget policy',
  'Telemetry measurement',
  'Alert acknowledgement',
  'On-call response',
  'Customer communication',
  'Incident review',
  'Provider outage handling',
  'Maintenance and degradation',
  'Service credit and contractual escalation',
]) {
  assert.match(targetSloOperations, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const packetItem of [
  /customer-approved SLO\/SLA terms with availability, latency, error rate, support response, maintenance window, exclusions, and decision owner/,
  /error budget policy with measurement window, budget owner, burn-rate threshold, freeze rule, exception handling, and review cadence/,
  /telemetry measurement proof with metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, and retention period/,
  /alert acknowledgement proof with severity mapping, alert route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, and audit record/,
  /staffed on-call proof with rota, primary owner, secondary owner, handoff rule, timezone coverage, absence handling, and escalation chain/,
  /customer communication proof with status route, update owner, approval path, message template, cadence, impact summary, and closure evidence/,
  /incident review proof with timeline, customer impact, corrective action owner, due date, evidence packet, review decision, and closure rule/,
  /provider outage playbook proof with provider health signal, fallback decision, retry\/disable policy, customer impact rule, accepted-risk owner, and post-incident review/,
  /maintenance and degradation proof with maintenance approval, customer notice, degradation mode, rollback owner, recovery target, and post-maintenance review/,
  /service credit and contractual escalation proof with legal\/commercial owner, escalation path, customer approval, credit trigger, and evidence retention rule/,
  /artifact hygiene and production readiness gate result/,
  /residual risk, decision owner, next review date, and missed-SLO containment plan/,
]) {
  assert.match(targetSloOperations, packetItem);
}

for (const command of [
  'npm run smoke:target-slo-operations',
  'npm run smoke:target-slo-architecture',
  'npm run rehearsal:production-slo-operating',
  'npm run smoke:production-slo-operating',
  'npm run smoke:incident-slo-policy',
  'npm run smoke:observability-telemetry',
  'npm run smoke:target-observability-architecture',
  'npm run smoke:target-observability-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:target-support-operations',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(targetSloOperations, new RegExp(escapeRegExp(command)));
}

assert.match(targetSloArchitecture, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(productionSlo, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(incidentSlo, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(targetContract, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(targetContract, /target SLO operations evidence is captured/);
assert.match(targetEnvironment, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(targetEnvironment, /target SLO operations evidence/);
assert.match(releaseReadiness, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(releaseReadiness, /target SLO operations gate: passed/);
assert.match(security, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(deployment, /## Target SLO Operations/);
assert.match(deployment, /npm run smoke:target-slo-operations/);
assert.match(productPlan, /\[x\] Target SLO operations gate implemented/);
assert.match(readme, /docs\/target-slo-operations-v1\.md/);
assert.match(readme, /npm run smoke:target-slo-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 10,
      mode: 'target-slo-operations',
      ok: true,
      path: 'docs/target-slo-operations-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 14,
      sloPacketItemCount: 14,
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
