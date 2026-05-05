import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const rehearsalPath = path.join(docsDir, 'production-retention-operating-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const retentionPath = path.join(docsDir, 'retention-delete-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const rehearsal = readRequiredFile(rehearsalPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const retention = readRequiredFile(retentionPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(
  packageJson.scripts['rehearsal:production-retention-operating'],
  'node scripts/build-production-retention-operating.mjs',
);
assert.equal(
  packageJson.scripts['smoke:production-retention-operating'],
  'node scripts/smoke-production-retention-operating.mjs',
);

assert.match(rehearsal, /^# Production Retention Operating Rehearsal v1$/m);
assert.match(rehearsal, /^- status: local-retention-operating-current$/m);
assert.match(rehearsal, /^- productionReadyClaim: false$/m);
assert.match(rehearsal, /not hosted production retention evidence/);
assert.match(rehearsal, /not provider transcript deletion proof/);
assert.match(rehearsal, /not permission to claim `production-ready`/);
assert.match(rehearsal, /Production-ready remains blocked/);

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
  assert.match(rehearsal, new RegExp(`\\| \`${escapeRegExp(command)}\` \\| pass \\| 0 \\|`), command);
}

for (const phrase of [
  /retention\/delete policy remains the source/,
  /runtime lifecycle remains the gate/,
  /tenant data lifecycle remains the gate/,
  /target retention operations remains the gate/,
  /backup restore drill remains the gate/,
  /target backup operations remains the gate/,
  /runtime isolation remains the gate/,
  /pilot export package remains the gate/,
  /release artifact hygiene remains the gate/,
]) {
  assert.match(rehearsal, phrase);
}

assert.match(releaseReadiness, /\[production-retention-operating-v1\.md\]\(production-retention-operating-v1\.md\)/);
assert.match(releaseReadiness, /local production retention operating rehearsal: passed/);
assert.match(retention, /\[production-retention-operating-v1\.md\]\(production-retention-operating-v1\.md\)/);
assert.match(deployment, /## Production Retention Operating Rehearsal/);
assert.match(deployment, /npm run rehearsal:production-retention-operating/);
assert.match(deployment, /npm run smoke:production-retention-operating/);
assert.match(productPlan, /\[x\] Production retention operating rehearsal gate implemented/);
assert.match(readme, /npm run rehearsal:production-retention-operating/);
assert.match(readme, /npm run smoke:production-retention-operating/);

console.log(
  JSON.stringify(
    {
      commandCount: 10,
      mode: 'production-retention-operating',
      ok: true,
      path: 'docs/production-retention-operating-v1.md',
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
