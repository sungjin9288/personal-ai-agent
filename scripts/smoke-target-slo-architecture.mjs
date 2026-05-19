import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-slo-architecture-v1.md');
const incidentSloPath = path.join(docsDir, 'incident-slo-v1.md');
const observabilityTelemetryPath = path.join(docsDir, 'observability-telemetry-v1.md');
const targetObservabilityArchitecturePath = path.join(docsDir, 'target-observability-architecture-v1.md');
const targetObservabilityOperationsPath = path.join(docsDir, 'target-observability-operations-v1.md');
const supportEscalationPath = path.join(docsDir, 'support-escalation-review-v1.md');
const targetSupportPath = path.join(docsDir, 'target-support-operations-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const incidentSlo = readRequiredFile(incidentSloPath);
const observabilityTelemetry = readRequiredFile(observabilityTelemetryPath);
const targetObservabilityArchitecture = readRequiredFile(targetObservabilityArchitecturePath);
const targetObservabilityOperations = readRequiredFile(targetObservabilityOperationsPath);
const supportEscalation = readRequiredFile(supportEscalationPath);
const targetSupport = readRequiredFile(targetSupportPath);
const targetContract = readRequiredFile(targetContractPath);
const intake = readRequiredFile(intakePath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:target-slo-architecture'], 'node scripts/smoke-target-slo-architecture.mjs');

assert.match(decision, /^# Target SLO Architecture v1$/m);
assert.match(decision, /^- status: local-target-slo-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetSloApproved: false$/m);
assert.match(decision, /not contractual SLA approval/);
assert.match(decision, /not service credit policy approval/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Target SLO readiness remains blocked/);

for (const area of [
  'Customer SLO terms',
  'Error budget policy',
  'Telemetry measurement',
  'Alerting and acknowledgement',
  'On-call response',
  'Customer communication',
  'Incident review',
  'Provider outage handling',
  'Maintenance and degradation',
  'Service credit and contractual escalation',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /customer-approved SLO\/SLA terms with availability, latency, error rate, support response, maintenance window, exclusions, and decision owner/,
  /error budget policy with measurement window, budget owner, burn-rate threshold, freeze rule, exception handling, and review cadence/,
  /telemetry measurement proof with metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, and retention period/,
  /alert acknowledgement proof with severity mapping, route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, and audit record/,
  /staffed on-call proof with rota, primary owner, secondary owner, handoff rule, timezone coverage, absence handling, and escalation chain/,
  /customer communication proof with status route, update owner, approval path, message template, cadence, impact summary, and closure evidence/,
  /incident review proof with timeline, customer impact, corrective action owner, due date, evidence packet, review decision, and closure rule/,
  /provider outage playbook proof with provider health signal, fallback decision, retry\/disable policy, customer impact rule, accepted-risk owner, and post-incident review/,
  /maintenance and degradation proof with maintenance approval, customer notice, degradation mode, rollback owner, recovery target, and post-maintenance review/,
  /service credit and contractual escalation proof with legal\/commercial owner, escalation path, customer approval, credit trigger, and evidence retention rule/,
  /migration plan from pilot incident\/SLO policy and local production SLO rehearsal to approved target SLO\/SLA operations/,
  /explicit rollback, communication misfire, false-positive alert, alert fatigue, and missed-SLO containment plan/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-slo-operations',
  'npm run smoke:incident-slo-policy',
  'npm run rehearsal:production-slo-operating',
  'npm run smoke:production-slo-operating',
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
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(incidentSlo, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(observabilityTelemetry, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(targetObservabilityArchitecture, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(targetObservabilityOperations, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(supportEscalation, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(targetSupport, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(targetContract, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(targetContract, /target SLO architecture is approved/);
assert.match(intake, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(intake, /npm run smoke:target-slo-architecture/);
assert.match(releaseReadiness, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target SLO architecture gate: passed/);
assert.match(
  releaseReadiness,
  /target SLO architecture is not approved, and target SLO\/SLA architecture evidence for customer-approved availability, latency, error rate, support response, maintenance window, exclusions, decision owner, error budget policy with measurement window, budget owner, burn-rate threshold, freeze rule, exception handling, review cadence, telemetry measurement proof for metrics backend, uptime check, synthetic probe, latency histogram, provider failure signal, data source owner, retention period, alert acknowledgement proof with severity mapping, route, acknowledgement SLA, escalation timeout, delivery receipt, fallback route, audit record, staffed on-call proof with rota, primary and secondary owner, handoff rule, timezone coverage, absence handling, escalation chain, customer communication proof, incident review proof, provider outage playbook proof, maintenance and degradation proof, service credit and contractual escalation proof, migration plan, rollback, communication misfire, false-positive alert, alert fatigue, and missed-SLO containment is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp(
    'target SLO architecture is not approved and target SLO/SLA ' +
      'evidence is not generated from a production-like environment',
  ),
);
assert.match(security, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(deployment, /## Target SLO Architecture/);
assert.match(deployment, /npm run smoke:target-slo-architecture/);
assert.match(productPlan, /\[x\] Target SLO architecture gate implemented/);
assert.match(readme, /docs\/target-slo-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-slo-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 10,
      mode: 'target-slo-architecture',
      ok: true,
      path: 'docs/target-slo-architecture-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 14,
      targetSloApproved: false,
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
