import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const targetObservabilityPath = path.join(docsDir, 'target-observability-operations-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const targetContractPath = path.join(docsDir, 'target-deployment-contract-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const targetObservability = readRequiredFile(targetObservabilityPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const targetContract = readRequiredFile(targetContractPath);
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

for (const heading of [
  '## Decision Boundary',
  '## Observability Operation Controls',
  '## Operations Evidence Packet',
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
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:production-readiness-gate',
]) {
  assert.match(targetObservability, new RegExp(escapeRegExp(command)));
}

assert.match(releaseReadiness, /\[target-observability-operations-v1\.md\]\(target-observability-operations-v1\.md\)/);
assert.match(targetObservability, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(releaseReadiness, /local target observability operations gate: passed/);
assert.match(
  targetContract,
  /local SLO operating, observability telemetry, target observability architecture, target observability operations, and target SLO architecture gates pass/,
);
assert.match(targetContract, /npm run smoke:target-observability-operations/);
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
