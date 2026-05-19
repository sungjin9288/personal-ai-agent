import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const rehearsalPath = path.join(docsDir, 'production-slo-operating-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const incidentSloPath = path.join(docsDir, 'incident-slo-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const rehearsal = readRequiredFile(rehearsalPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const incidentSlo = readRequiredFile(incidentSloPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['rehearsal:production-slo-operating'], 'node scripts/build-production-slo-operating.mjs');
assert.equal(packageJson.scripts['smoke:production-slo-operating'], 'node scripts/smoke-production-slo-operating.mjs');

assert.match(rehearsal, /^# Production SLO Operating Rehearsal v1$/m);
assert.match(rehearsal, /^- status: local-slo-operating-current$/m);
assert.match(rehearsal, /^- productionReadyClaim: false$/m);
assert.match(rehearsal, /not customer production SLO\/SLA evidence/);
assert.match(rehearsal, /not permission to claim `production-ready`/);
assert.match(rehearsal, /Production-ready remains blocked/);

for (const command of [
  'npm run smoke:incident-slo-policy',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-slo-operations',
  'npm run smoke:observability-telemetry',
  'npm run smoke:target-observability-architecture',
  'npm run smoke:target-observability-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:target-support-architecture',
  'npm run smoke:target-support-operations',
  'npm run smoke:execution-v1-status',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:runtime-data-lifecycle',
  'npm run smoke:runtime-isolation',
]) {
  assert.match(rehearsal, new RegExp(`\\| \`${escapeRegExp(command)}\` \\| pass \\| 0 \\|`), command);
}

for (const phrase of [
  /deterministic release status and snapshot integrity/,
  /target SLO architecture remains the gate/,
  /target SLO operations remains the gate/,
  /observability telemetry/,
  /target observability architecture/,
  /target observability operations/,
  /support escalation review/,
  /target support architecture/,
  /target support operations/,
  /release artifact hygiene/,
  /runtime lifecycle and runtime isolation/,
  /incident\/SLO policy/,
]) {
  assert.match(rehearsal, phrase);
}

assert.match(releaseReadiness, /\[production-slo-operating-v1\.md\]\(production-slo-operating-v1\.md\)/);
assert.match(rehearsal, /\[target-slo-architecture-v1\.md\]\(target-slo-architecture-v1\.md\)/);
assert.match(rehearsal, /\[target-slo-operations-v1\.md\]\(target-slo-operations-v1\.md\)/);
assert.match(rehearsal, /\[target-observability-architecture-v1\.md\]\(target-observability-architecture-v1\.md\)/);
assert.match(releaseReadiness, /local production SLO operating rehearsal: passed/);
assert.match(
  releaseReadiness,
  /production SLO\/SLA operating evidence for incident\/SLO policy replay, target SLO architecture and operations gates, observability telemetry and target observability operations, support escalation and target support operations, release artifact hygiene, runtime lifecycle, runtime isolation, staffed incident ownership, customer-approved SLO\/SLA terms, and provider\/deployment evidence is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp('production SLO/SLA operating evidence is not generated from ' + 'a production-like environment'),
);
assert.match(incidentSlo, /\[production-slo-operating-v1\.md\]\(production-slo-operating-v1\.md\)/);
assert.match(deployment, /## Production SLO Operating Rehearsal/);
assert.match(deployment, /npm run rehearsal:production-slo-operating/);
assert.match(deployment, /npm run smoke:production-slo-operating/);
assert.match(productPlan, /\[x\] Production SLO operating rehearsal gate implemented/);
assert.match(readme, /npm run rehearsal:production-slo-operating/);
assert.match(readme, /npm run smoke:production-slo-operating/);

console.log(
  JSON.stringify(
    {
      commandCount: 14,
      mode: 'production-slo-operating',
      ok: true,
      path: 'docs/production-slo-operating-v1.md',
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
