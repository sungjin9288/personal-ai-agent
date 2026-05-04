import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const policyPath = path.join(docsDir, 'incident-slo-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');

const policy = readRequiredFile(policyPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const productPlan = readRequiredFile(productPlanPath);

assert.match(policy, /^# Incident And SLO Policy v1$/m);
assert.match(policy, /^- status: pilot-policy-source-of-record$/m);
assert.match(policy, /This policy defines pilot incident triage and SLO evidence/);
assert.match(policy, /not a production SLO\/SLA commitment/);

for (const severity of ['SEV1', 'SEV2', 'SEV3', 'SEV4']) {
  assert.match(policy, new RegExp(`\\| ${severity} \\|`), `missing severity row: ${severity}`);
}

for (const command of [
  'npm run smoke:execution-v1-status',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:runtime-data-lifecycle',
  'node src/cli.mjs action inbox --overdue',
  'node src/cli.mjs action log-overdue',
]) {
  assert.match(policy, new RegExp(escapeRegExp(command)), `missing command: ${command}`);
}

assert.match(policy, /credential leak, customer data exposure, destructive action without approval/);
assert.match(policy, /runtime data export\/delete verification fails/);
assert.match(policy, /production SLO\/SLA operating evidence is generated from the target deployment model/);

assert.match(releaseReadiness, /\[incident-slo-v1\.md\]\(incident-slo-v1\.md\)/);
assert.match(releaseReadiness, /production SLO\/SLA operating evidence is not generated from a production-like environment/);
assert.match(security, /\[incident-slo-v1\.md\]\(incident-slo-v1\.md\)/);
assert.match(productPlan, /Incident and SLO policy documented/);

console.log(
  JSON.stringify(
    {
      mode: 'incident-slo-policy',
      ok: true,
      policyPath: path.relative(repoDir, policyPath),
      severityCount: 4,
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
