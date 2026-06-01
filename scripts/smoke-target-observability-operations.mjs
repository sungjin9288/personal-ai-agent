import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetObservabilityPath = path.join(docsDir, 'target-observability-operations-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetObservability = readRequiredFile(targetObservabilityPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const intake = readRequiredFile(intakePath);
const deployment = readRequiredFile(deploymentPath);
const security = readRequiredFile(securityPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-observability-operations'],
  'node scripts/smoke-target-observability-operations.mjs',
);

assert.match(targetObservability, /^# Target Observability Operations v1$/m);
assert.match(targetObservability, /^- status: local-target-observability-operations-current$/m);
assert.match(targetObservability, /^- productionReadyClaim: false$/m);
assert.match(targetObservability, /not target observability evidence/);
assert.match(targetObservability, /not permission to claim `production-ready`/);
assert.match(targetObservability, /Target observability operations remain blocked for production-ready claims/);
assert.match(
  targetObservability,
  /telemetry ingestion proof, alert delivery proof, trace\/log retention proof, staffed on-call routing and acknowledgement proof, customer-facing status communication proof, incident response proof, incident review history proof, audit export proof, release artifact hygiene result, and regenerated execution snapshot evidence requirements/,
);

for (const heading of [
  '## Decision Boundary',
  '## Observability Operation Controls',
  '## Operations Evidence Packet',
  '## Release Blocker Closure Linkage',
  '## On-Call Rules',
  '## Required Commands',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(targetObservability, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const control of [
  'Telemetry pipeline',
  'Alert delivery',
  'Log and trace retention',
  'On-call routing',
  'Customer status communication',
  'Incident review history',
]) {
  assert.match(targetObservability, new RegExp(`\\| ${escapeRegExp(control)} \\|`));
}

for (const command of [
  'npm run smoke:target-observability-operations',
  'npm run smoke:target-observability-architecture',
  'npm run smoke:observability-telemetry',
  'npm run smoke:production-slo-operating',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(targetObservability, new RegExp(escapeRegExp(command)));
}

for (const packetItem of [
  /branch, commit, release label, and deployment boundary from the approved production-like or hosted target environment/,
  /telemetry backend or logical pipeline identifier, ingestion owner, event taxonomy, and metrics\/logs\/traces\/audit\/provider\/release\/support event sample references/,
  /alert route, severity, delivery receipt, retry policy, acknowledgement SLA, escalation evidence, and retry outcome/,
  /staffed on-call owner, backup owner, rota reference, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain/,
  /log and trace retention policy reference with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit/,
  /redaction and sensitive-data review result for production logs, traces, support packets, browser artifacts, screenshots, release exports, and provider errors/,
  /customer status communication owner, channel, approval reference, timestamp, message, cadence, and closure evidence/,
  /incident timeline, mitigation owner, customer impact, response evidence, review decision, corrective actions, due dates, residual risk, and closure evidence/,
  /audit export proof for alert delivery, acknowledgement, customer update, query access, review decision, and corrective action closure/,
  /release artifact hygiene result, regenerated execution snapshot evidence, production readiness gate result, residual risk, decision owner, and next review date/,
]) {
  assert.match(targetObservability, packetItem);
}

assert.match(
  targetObservability,
  /\| Blocker \| Operations Stop Condition \| Architecture Stop Condition \| Boundary Stop Condition \| Closure Verifications \| Required Proofs \| Required Commands \| Required Evidence Docs \| Production Claim \|/,
);
assert.match(
  targetObservability,
  /\| target observability operations \| target-observability-operations-missing \| target-observability-architecture-missing \| target-observability-slo-boundary-missing-or-mismatched \| 3 \| 10 \| 9 \| 6 \| blocked \|/,
);
assert.match(targetObservability, /Target observability operations owns the telemetry ingestion/);
assert.match(targetObservability, /Target observability architecture owns the telemetry backend and signal taxonomy decision proof/);
assert.match(targetObservability, /Observability telemetry owns the local observability stop condition/);
assert.match(targetObservability, /Target SLO architecture and target SLO operations own the linked SLO\/SLA evidence boundary/);
assert.match(targetObservability, /Target deployment contract and target environment evidence intake own the same-boundary observability evidence verification/);
assert.match(
  targetObservability,
  /regenerated execution-v1 snapshot evidence from the same approved production-like or hosted target observability boundary/,
);

assert.match(releaseReadiness, /\[target-observability-operations-v1\.md\]\(target-observability-operations-v1\.md\)/);
assert.match(targetObservability, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(targetObservability, /\[target-environment-evidence-intake-v1\.md\]\(target-environment-evidence-intake-v1\.md\)/);
assert.match(releaseReadiness, /local target observability operations gate: passed/);
assert.match(
  releaseReadiness,
  /target observability operations evidence for telemetry ingestion proof with metrics, logs, traces, audit events, provider events, release events, and support events, alert delivery proof with route, severity, delivery receipt, retry policy, acknowledgement SLA, and escalation evidence, trace\/log retention proof with period, storage class, redaction policy, query role, customer export boundary, deletion path, and query access audit, staffed on-call routing and acknowledgement proof with rota, primary and backup owner, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain, customer-facing status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence, incident response proof with timeline, mitigation owner, customer impact, review decision, corrective actions, due dates, and closure evidence, incident review history proof, audit export proof, release artifact hygiene result, and regenerated execution snapshot evidence is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  /target observability operations evidence for telemetry ingestion, alert delivery, trace\/log retention, staffed on-call routing and acknowledgement, customer-facing status communication, incident response, and incident review history is not generated from a production-like environment/,
);
assert.match(
  targetContract,
  /local SLO operating, observability telemetry, target observability architecture, target observability operations, target SLO architecture, and target SLO operations gates pass/,
);
assert.match(
  targetContract,
  /secretObservabilityEvidence \| target secret manager approval, approved platform proof, secret class inventory proof, runtime injection proof, least-privilege access policy proof, rotation\/revocation evidence, audit log proof, break-glass governance proof, leakage review proof, target observability architecture approval, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, staffed on-call proof, log\/trace retention proof, customer status communication proof, incident response proof, audit export proof, disaster recovery proof, target observability operations evidence, target SLO architecture approval, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, alert acknowledgement proof, staffed on-call response proof, customer communication proof, incident review proof, provider outage handling proof, maintenance\/degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, target SLO operations evidence, incident review evidence, release artifact hygiene, and regenerated execution snapshot evidence/,
);
assert.match(targetContract, /npm run smoke:target-observability-operations/);
assert.match(
  intake,
  /observabilitySloEvidence \| target observability architecture approval proof, approved telemetry backend proof, signal inventory proof, telemetry ingestion proof, alert routing proof, alert delivery receipt proof, alert acknowledgement proof, staffed on-call coverage proof, log and trace retention proof, customer status communication proof, incident response proof, incident review proof, audit export proof, disaster recovery proof, target SLO architecture approval proof, customer-approved SLO\/SLA terms proof, error budget policy proof, telemetry measurement proof, staffed on-call response proof, customer communication proof, provider outage handling proof, maintenance and degradation proof, service credit proof, evidence retention proof, missed-SLO containment proof, release artifact hygiene result, and regenerated execution snapshot evidence/,
);
assert.match(deployment, /## Target Observability Operations Gate/);
assert.match(deployment, /npm run smoke:target-observability-operations/);
assert.match(security, /\[target-observability-operations-v1\.md\]\(target-observability-operations-v1\.md\)/);
assert.match(productPlan, /\[x\] Target observability operations gate implemented/);
assert.match(readme, /npm run smoke:target-observability-operations/);

console.log(
  JSON.stringify(
    {
      controlCount: 6,
      mode: 'target-observability-operations',
      ok: true,
      operationsPacketItemCount: 10,
      path: 'docs/target-observability-operations-v1.md',
      productionReadyClaim: false,
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
