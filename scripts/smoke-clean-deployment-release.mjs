import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const docsDir = path.join(repoDir, 'docs');
const rehearsalPath = path.join(docsDir, 'clean-deployment-release-v1.md');
const releaseReadinessPath = path.join(docsDir, 'release-readiness-v1.md');
const deploymentPath = path.join(docsDir, 'deployment-pilot-v1.md');
const productPlanPath = path.join(docsDir, 'product-plan-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const rehearsal = readRequiredFile(rehearsalPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const deployment = readRequiredFile(deploymentPath);
const productPlan = readRequiredFile(productPlanPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['rehearsal:clean-deployment-release'], 'node scripts/build-clean-deployment-release.mjs');
assert.equal(packageJson.scripts['smoke:clean-deployment-release'], 'node scripts/smoke-clean-deployment-release.mjs');

assert.match(rehearsal, /^# Clean Deployment Release Rehearsal v1$/m);
assert.match(rehearsal, /^- status: clean-local-rehearsal-current$/m);
assert.match(rehearsal, /^- cleanCheckoutMode: tracked-files-only$/m);
assert.match(rehearsal, /^- cleanCheckoutFileCount: [1-9]\d*$/m);
assert.match(rehearsal, /^- excludedRuntimeState: var\/, output\/playwright\/, node_modules\/, \.git\/$/m);
assert.match(rehearsal, /^- productionReadyClaim: false$/m);
assert.match(rehearsal, /not target production deployment evidence/);
assert.match(rehearsal, /not permission to claim `production-ready`/);

for (const command of [
  'npm run smoke:incident-slo-policy',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:secret-management',
  'npm run smoke:observability-telemetry',
  'npm run smoke:retention-delete-policy',
  'npm run smoke:web-auth-rbac',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:runtime-data-lifecycle',
  'npm run smoke:tenant-data-lifecycle',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:runtime-isolation',
  'npm run package:pilot-export',
  'npm run smoke:pilot-export-package',
]) {
  assert.match(rehearsal, new RegExp(`\\| \`${escapeRegExp(command)}\` \\| pass \\| 0 \\|`), command);
}

assert.match(releaseReadiness, /\[clean-deployment-release-v1\.md\]\(clean-deployment-release-v1\.md\)/);
assert.match(releaseReadiness, /clean deployment release rehearsal: passed/);
assert.match(deployment, /## Clean Deployment Release Rehearsal/);
assert.match(deployment, /npm run rehearsal:clean-deployment-release/);
assert.match(deployment, /npm run smoke:clean-deployment-release/);
assert.match(productPlan, /\[x\] Clean deployment release rehearsal gate implemented/);
assert.match(readme, /npm run rehearsal:clean-deployment-release/);
assert.match(readme, /npm run smoke:clean-deployment-release/);

console.log(
  JSON.stringify(
    {
      commandCount: 15,
      mode: 'clean-deployment-release',
      ok: true,
      path: 'docs/clean-deployment-release-v1.md',
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
