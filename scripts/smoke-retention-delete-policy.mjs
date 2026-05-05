import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const policyPath = path.join(docsDir, 'retention-delete-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const securityPath = path.join(docsDir, 'security-model-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const policy = readRequiredFile(policyPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const security = readRequiredFile(securityPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['smoke:retention-delete-policy'], 'node scripts/smoke-retention-delete-policy.mjs');

assert.match(policy, /^# Retention And Delete Policy v1$/m);
assert.match(policy, /^- status: pilot-policy-evidence-current$/m);
assert.match(policy, /^- productionReadyClaim: false$/m);
assert.match(policy, /not production deletion evidence/);
assert.match(policy, /Production-ready remains blocked/);

for (const heading of [
  '## Data Class Retention',
  '## Export Checklist',
  '## Delete Checklist',
  '## Required Commands',
  '## Stop Conditions',
  '## Production Gap',
]) {
  assert.match(policy, new RegExp(`^${escapeRegExp(heading)}$`, 'm'));
}

for (const dataClass of [
  'Local runtime state under `var/`',
  'Tenant-scoped runtime records',
  'Local runtime backup manifest',
  'Isolated customer runtime root',
  'Immutable release snapshots',
  'Pilot export package manifest',
  'Provider transcript and raw provider payload',
  'Visual and browser evidence artifacts',
]) {
  assert.match(policy, new RegExp(`\\| ${escapeRegExp(dataClass)} \\|`));
}

for (const command of [
  'npm run smoke:retention-delete-policy',
  'npm run smoke:runtime-data-lifecycle',
  'npm run smoke:tenant-data-lifecycle',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:target-retention-operations',
  'npm run smoke:target-backup-operations',
  'npm run smoke:runtime-isolation',
  'npm run package:pilot-export',
  'npm run smoke:pilot-export-package',
  'npm run smoke:release-artifact-hygiene',
]) {
  assert.match(policy, new RegExp(escapeRegExp(command)));
}

for (const requiredPhrase of [
  /confirmation token/,
  /repository-relative/,
  /sha256 digest/,
  /raw provider payloads/,
  /provider transcript handling/,
  /post-delete absence/,
]) {
  assert.match(policy, requiredPhrase);
}

assert.match(releaseReadiness, /\[retention-delete-v1\.md\]\(retention-delete-v1\.md\)/);
assert.match(releaseReadiness, /pilot retention\/export\/delete policy gate: passed/);
assert.match(security, /\[retention-delete-v1\.md\]\(retention-delete-v1\.md\)/);
assert.match(security, /smoke:retention-delete-policy/);
assert.match(deployment, /## Retention And Delete Policy/);
assert.match(deployment, /npm run smoke:retention-delete-policy/);
assert.match(productPlan, /\[x\] Retention\/delete policy gate implemented/);
assert.match(readme, /npm run smoke:retention-delete-policy/);

console.log(
  JSON.stringify(
    {
      dataClassCount: 8,
      mode: 'retention-delete-policy',
      ok: true,
      path: 'docs/retention-delete-v1.md',
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
