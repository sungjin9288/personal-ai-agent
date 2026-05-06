import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const decisionPath = path.join(docsDir, 'target-observability-architecture-v1.md');
const observabilityTelemetryPath = path.join(docsDir, 'observability-telemetry-v1.md');
const targetObservabilityPath = path.join(docsDir, 'target-observability-operations-v1.md');
const productionSloPath = path.join(docsDir, 'production-slo-operating-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const intakePath = path.join(docsDir, 'target-environment-evidence-intake-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const decision = readRequiredFile(decisionPath);
const observabilityTelemetry = readRequiredFile(observabilityTelemetryPath);
const targetObservability = readRequiredFile(targetObservabilityPath);
const productionSlo = readRequiredFile(productionSloPath);
const targetContract = readRequiredFile(targetContractPath);
const intake = readRequiredFile(intakePath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['smoke:target-observability-architecture'],
  'node scripts/smoke-target-observability-architecture.mjs',
);

assert.match(decision, /^# Target Observability Architecture v1$/m);
assert.match(decision, /^- status: local-target-observability-architecture-current$/m);
assert.match(decision, /^- productionReadyClaim: false$/m);
assert.match(decision, /^- targetObservabilityApproved: false$/m);
assert.match(decision, /not target telemetry implementation/);
assert.match(decision, /not production log aggregation evidence/);
assert.match(decision, /not permission to claim `production-ready`/);
assert.match(decision, /Target observability readiness remains blocked/);

for (const area of [
  'Telemetry backend',
  'Signal taxonomy',
  'Alert routing',
  'On-call staffing',
  'Log and trace retention',
  'Customer communication',
  'Incident response',
  'Audit and compliance',
  'Disaster recovery',
]) {
  assert.match(decision, new RegExp(`\\| ${escapeRegExp(area)} \\|`), area);
}

for (const packetItem of [
  /approved telemetry backend, region, tenancy boundary, owner, fallback, and data residency decision/,
  /signal inventory for release, provider, mission, approval, runtime, security, support, and incident domains/,
  /ingestion proof for metrics, logs, traces, audit events, provider events, release events, and support events/,
  /alert routing proof with severity mapping, primary route, secondary route, retry policy, acknowledgement SLA, and delivery receipt/,
  /staffed on-call proof with rota, primary owner, backup owner, handoff rule, timezone coverage, acknowledgement timestamp, and escalation chain/,
  /log and trace retention proof with period, storage class, redaction policy, query role, customer export boundary, and deletion path/,
  /customer status communication proof with route, owner, approval, timestamp, message, cadence, and closure evidence/,
  /incident response proof with timeline, mitigation owner, customer impact, review decision, corrective actions, due dates, and closure evidence/,
  /audit export for alert delivery, acknowledgement, customer update, query access, review decision, and corrective action closure/,
  /disaster recovery evidence for telemetry backend outage, alert route outage, incident bridge fallback, log export fallback, and evidence recovery/,
  /migration plan from local observability signals to target telemetry backend and on-call workflow/,
  /explicit rollback, false-positive triage, alert fatigue, and customer communication containment plan/,
]) {
  assert.match(decision, packetItem);
}

for (const command of [
  'npm run smoke:target-observability-architecture',
  'npm run smoke:target-observability-operations',
  'npm run smoke:observability-telemetry',
  'npm run smoke:production-slo-operating',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:target-environment-evidence-intake',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(decision, new RegExp(escapeRegExp(command)));
}

assert.match(observabilityTelemetry, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(targetObservability, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(productionSlo, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(targetContract, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(targetContract, /target observability architecture is approved/);
assert.match(targetContract, /npm run smoke:target-observability-architecture/);
assert.match(intake, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(intake, /npm run smoke:target-observability-architecture/);
assert.match(releaseReadiness, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(releaseReadiness, /target observability architecture gate: passed/);
assert.match(security, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(deployment, /## Target Observability Architecture/);
assert.match(deployment, /npm run smoke:target-observability-architecture/);
assert.match(productPlan, /\[x\] Target observability architecture gate implemented/);
assert.match(readme, /docs\/target-observability-architecture-v1\.md/);
assert.match(readme, /npm run smoke:target-observability-architecture/);

console.log(
  JSON.stringify(
    {
      areaCount: 9,
      mode: 'target-observability-architecture',
      ok: true,
      path: 'docs/target-observability-architecture-v1.md',
      productionReadyClaim: false,
      requiredCommandCount: 9,
      targetObservabilityApproved: false,
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
