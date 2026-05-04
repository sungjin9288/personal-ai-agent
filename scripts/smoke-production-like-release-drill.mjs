import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const drillPath = path.join(repoDir, 'docs', 'production-like-release-drill-v1.md');
const releaseReadinessPath = path.join(repoDir, 'docs', 'release-readiness-v1.md');
const deploymentPath = path.join(repoDir, 'docs', 'deployment-pilot-v1.md');
const readmePath = path.join(repoDir, 'README.md');
const packagePath = path.join(repoDir, 'package.json');

const drill = readRequiredFile(drillPath);
const releaseReadiness = readRequiredFile(releaseReadinessPath);
const deployment = readRequiredFile(deploymentPath);
const readme = readRequiredFile(readmePath);
const packageJson = JSON.parse(readRequiredFile(packagePath));

assert.equal(packageJson.scripts['drill:production-like-release'], 'node scripts/build-production-like-release-drill.mjs');
assert.equal(packageJson.scripts['smoke:production-like-release-drill'], 'node scripts/smoke-production-like-release-drill.mjs');

assert.match(drill, /^# Production-Like Release Drill v1$/m);
assert.match(drill, /^- status: dry-run-evidence-current$/m);
assert.match(drill, /^- productionReadyClaim: false$/m);
assert.match(drill, /It is not production deployment evidence/);
assert.match(drill, /not permission to claim `production-ready`/);
assert.match(drill, /productionReadyClaim: false/);

for (const command of [
  'npm run smoke:incident-slo-policy',
  'npm run smoke:retention-delete-policy',
  'npm run smoke:clean-deployment-release',
  'npm run smoke:execution-v1-status',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:runtime-data-lifecycle',
  'npm run smoke:runtime-isolation',
]) {
  assert.match(drill, new RegExp(`\\| \`${escapeRegExp(command)}\` \\| pass \\| 0 \\|`));
}

for (const blocker of [
  /Anthropic, local, and Hermes live validations are not complete/,
  /authenticated RBAC is not implemented/,
  /hosted tenant isolation is out of v1 scope/,
  /production retention\/export\/delete verification is not complete/,
  /production SLO\/SLA operating evidence is not generated from a production-like environment/,
  /clean deployment release evidence is not generated/,
]) {
  assert.match(drill, blocker);
}

assert.match(releaseReadiness, /\[production-like-release-drill-v1\.md\]\(production-like-release-drill-v1\.md\)/);
assert.match(releaseReadiness, /local deterministic production-like release drill: passed/);
assert.match(deployment, /## Production-Like Release Drill/);
assert.match(deployment, /npm run drill:production-like-release/);
assert.match(deployment, /npm run smoke:production-like-release-drill/);
assert.match(readme, /npm run drill:production-like-release/);
assert.match(readme, /productionReadyClaim: false/);

console.log(
  JSON.stringify(
    {
      commandCount: 9,
      mode: 'production-like-release-drill',
      ok: true,
      path: 'docs/production-like-release-drill-v1.md',
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
