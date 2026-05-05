import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const manifestPath = path.join(repoDir, 'docs', 'pilot-export-package-v1.md');
const releaseReadinessPath = path.join(repoDir, 'docs', 'release-readiness-v1.md');
const deploymentPath = path.join(repoDir, 'docs', 'deployment-pilot-v1.md');
const securityPath = path.join(repoDir, 'docs', 'security-model-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const manifest = readRequiredFile(manifestPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const deployment = readRequiredFile(deploymentPath);
const security = readRequiredFile(securityPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['package:pilot-export'], 'node scripts/build-pilot-export-package.mjs');
assert.equal(packageJson.scripts['smoke:pilot-export-package'], 'node scripts/smoke-pilot-export-package.mjs');

assert.match(manifest, /^# Pilot Export Package v1$/m);
assert.match(manifest, /^- status: dry-run-package-current$/m);
assert.match(manifest, /^- packageMode: manifest-only$/m);
assert.match(manifest, /^- productionReadyClaim: false$/m);
assert.match(manifest, /^- shareable: yes-after-hygiene-pass$/m);
assert.match(manifest, /^- bundleSha256: [a-f0-9]{64}$/m);
assert.match(manifest, /^- fileCount: 35$/m);
assert.match(manifest, /It is not production deployment evidence/);
assert.match(manifest, /not permission to claim `production-ready`/);

const verifiedCommit = extractBulletValue(manifest, 'verifiedCommit');
assert.match(verifiedCommit, /^[a-f0-9]{40}$/);

for (const requiredPath of [
  'README.md',
  'docs/product-plan-v1.md',
  'docs/security-model-v1.md',
  'docs/operator-runbook-v1.md',
  'docs/deployment-pilot-v1.md',
  'docs/pilot-onboarding-v1.md',
  'docs/demo-scenarios-v1.md',
  'docs/incident-slo-v1.md',
  'docs/customer-support-operations-v1.md',
  'docs/support-escalation-review-v1.md',
  'docs/secret-management-v1.md',
  'docs/target-secret-manager-v1.md',
  'docs/observability-telemetry-v1.md',
  'docs/target-observability-operations-v1.md',
  'docs/runtime-isolation-v1.md',
  'docs/retention-delete-v1.md',
  'docs/backup-restore-drill-v1.md',
  'docs/target-backup-operations-v1.md',
  'docs/identity-session-admin-v1.md',
  'docs/tenant-storage-admin-v1.md',
  'docs/clean-deployment-release-v1.md',
  'docs/production-slo-operating-v1.md',
  'docs/production-retention-operating-v1.md',
  'docs/production-provider-readiness-v1.md',
  'docs/production-enterprise-controls-v1.md',
  'docs/target-deployment-contract-v1.md',
  'docs/release-readiness-v1.md',
  'docs/production-like-release-drill-v1.md',
  'docs/execution-v1-evidence.md',
  'docs/execution-v1-closeout.md',
  'docs/execution-v1-handoff.md',
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-evidence.md`,
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-closeout.md`,
  `docs/releases/execution-v1/${verifiedCommit}/execution-v1-handoff.md`,
  `docs/releases/execution-v1/${verifiedCommit}/snapshot.json`,
]) {
  assert.equal(fs.existsSync(path.join(repoDir, requiredPath)), true, requiredPath);
  assert.match(manifest, new RegExp(`\\| \`${escapeRegExp(requiredPath)}\` \\| \\d+ \\| \`[a-f0-9]{64}\` \\|`));
}

assert.doesNotMatch(manifest, /\/Users\/|\/private\/var\/folders\/|\/var\/folders\//);
assert.match(releaseReadiness, /\[pilot-export-package-v1\.md\]\(pilot-export-package-v1\.md\)/);
assert.match(releaseReadiness, /pilot export package manifest: passed/);
assert.match(deployment, /## Pilot Export Package/);
assert.match(deployment, /npm run package:pilot-export/);
assert.match(deployment, /npm run smoke:pilot-export-package/);
assert.match(security, /pilot export package manifest/);
assert.match(security, /retention\/export\/delete policy gate/);
assert.match(readme, /npm run package:pilot-export/);

console.log(
  JSON.stringify(
    {
      fileCount: 35,
      mode: 'pilot-export-package',
      ok: true,
      path: 'docs/pilot-export-package-v1.md',
      verifiedCommit,
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

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
