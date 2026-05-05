import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const observabilityPath = path.join(docsDir, 'observability-telemetry-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const observability = readRequiredFile(observabilityPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:observability-telemetry'], 'node scripts/smoke-observability-telemetry.mjs');

assert.match(observability, /^# Observability Telemetry v1$/m);
assert.match(observability, /^- status: local-observability-telemetry-current$/m);
assert.match(observability, /^- productionReadyClaim: false$/m);
assert.match(observability, /not hosted telemetry evidence/);
assert.match(observability, /not permission to claim `production-ready`/);
assert.match(observability, /Observability and telemetry remain blocked for production-ready claims/);

for (const heading of [
  '## Decision Boundary',
  '## Telemetry Signals',
  '## Alert Triggers',
  '## Required Commands',
  '## Handoff Requirements',
  '## Acceptance Rule',
  '## Production Gap',
]) {
  assert.match(observability, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const signal of [
  'Release state',
  'Snapshot integrity',
  'Provider readiness',
  'Artifact hygiene',
  'Runtime lifecycle',
  'Incident queue',
]) {
  assert.match(observability, new RegExp(`\\| ${escapeRegExp(signal)} \\|`));
}

for (const command of [
  'npm run smoke:observability-telemetry',
  'npm run smoke:execution-v1-status',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(observability, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[observability-telemetry-v1\.md\]\(observability-telemetry-v1\.md\)/);
assert.match(releaseReadiness, /local observability telemetry gate: passed/);
assert.match(targetContract, /local SLO operating and observability telemetry gates pass/);
assert.match(targetContract, /npm run smoke:observability-telemetry/);
assert.match(deployment, /## Observability Telemetry Gate/);
assert.match(deployment, /npm run smoke:observability-telemetry/);
assert.match(productPlan, /\[x\] Observability telemetry gate implemented/);
assert.match(readme, /npm run smoke:observability-telemetry/);

console.log(
  JSON.stringify(
    {
      alertTriggerCount: 5,
      mode: 'observability-telemetry',
      ok: true,
      path: 'docs/observability-telemetry-v1.md',
      productionReadyClaim: false,
      telemetrySignalCount: 6,
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
