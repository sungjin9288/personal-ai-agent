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
  'npm run smoke:identity-session-admin',
  'npm run smoke:hosted-identity-session-architecture',
  'npm run smoke:target-identity-session-operations',
  'npm run smoke:tenant-storage-admin',
  'npm run smoke:hosted-tenant-isolation-architecture',
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:target-support-architecture',
  'npm run smoke:target-support-operations',
  'npm run smoke:secret-management',
  'npm run smoke:target-secret-manager-architecture',
  'npm run smoke:target-secret-manager',
  'npm run smoke:observability-telemetry',
  'npm run smoke:target-observability-architecture',
  'npm run smoke:target-observability-operations',
  'npm run smoke:target-slo-architecture',
  'npm run smoke:target-slo-operations',
  'npm run smoke:target-data-lifecycle-architecture',
  'npm run smoke:target-clean-deployment-architecture',
  'npm run smoke:target-clean-deployment-operations',
  'npm run smoke:target-retention-operations',
  'npm run smoke:target-backup-operations',
  'npm run smoke:production-slo-operating',
  'npm run smoke:web-auth-rbac',
  'npm run smoke:production-enterprise-controls',
  'npm run smoke:production-provider-readiness',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:target-deployment-contract',
  'npm run smoke:retention-delete-policy',
  'npm run smoke:production-retention-operating',
  'npm run smoke:clean-deployment-release',
  'npm run smoke:execution-v1-status',
  'npm run smoke:execution-v1-snapshot',
  'npm run smoke:production-readiness-gate',
  'npm run smoke:release-artifact-hygiene',
  'npm run smoke:runtime-data-lifecycle',
  'npm run smoke:tenant-data-lifecycle',
  'npm run smoke:backup-restore-drill',
  'npm run smoke:runtime-isolation',
]) {
  assert.match(drill, new RegExp(`\\| \`${escapeRegExp(command)}\` \\| pass \\| 0 \\|`));
}

for (const blocker of [
  /Anthropic, local, and Hermes live validations are not complete/,
  /target OpenAI provider account is not approved and OpenAI target-boundary live validation evidence is not generated/,
  /target Anthropic provider account is not approved and Anthropic live validation evidence is not generated/,
  /target local provider architecture is not approved and local provider live validation evidence is not generated/,
  /target Hermes provider architecture is not approved and Hermes live validation evidence is not generated/,
  /hosted identity session architecture is not approved and target identity\/session evidence is not generated/,
  /target identity\/session operations evidence is not generated/,
  /hosted tenant isolation architecture is not approved and target tenant isolation evidence is not generated/,
  /target tenant isolation operations evidence is not generated/,
  /target secret manager architecture is not approved and target secret manager evidence is not generated from a production-like environment/,
  /target observability architecture is not approved and target observability evidence is not generated from a production-like environment/,
  /target SLO architecture is not approved and target SLO\/SLA evidence is not generated from a production-like environment/,
  /target SLO operations evidence is not generated from a production-like environment/,
  /target data lifecycle architecture is not approved and target data lifecycle evidence is not generated from a production-like environment/,
  /target retention, export, delete, provider transcript handling, target backup, and post-delete absence evidence is not generated/,
  /production SLO\/SLA operating evidence is not generated from a production-like environment/,
  /target support architecture is not approved and target support evidence is not generated/,
  /target support operations, staffed coverage, support audit history, on-call handoff, and incident review evidence are not generated/,
  /target clean deployment architecture is not approved and target clean deployment evidence is not generated from a production-like environment/,
  /target clean deployment operations evidence is not generated from a production-like environment/,
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
      commandCount: 44,
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
