import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
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
const currentCommit = runGit(['rev-parse', 'HEAD']);
const sourceCommit = extractBulletValue(rehearsal, 'sourceCommit');

assert.equal(packageJson.scripts['rehearsal:clean-deployment-release'], 'node scripts/build-clean-deployment-release.mjs');
assert.equal(packageJson.scripts['smoke:clean-deployment-release'], 'node scripts/smoke-clean-deployment-release.mjs');

assert.match(rehearsal, /^# Clean Deployment Release Rehearsal v1$/m);
assert.match(rehearsal, /^- status: clean-local-rehearsal-current$/m);
assertArtifactCommitFresh({
  artifactCommit: sourceCommit,
  currentCommit,
  label: 'clean-deployment-release sourceCommit',
});
assert.match(rehearsal, /^- cleanCheckoutMode: tracked-files-only$/m);
assert.match(rehearsal, /^- cleanCheckoutFileCount: [1-9]\d*$/m);
assert.match(rehearsal, /^- excludedRuntimeState: var\/, output\/playwright\/, node_modules\/, \.git\/$/m);
assert.match(rehearsal, /^- productionReadyClaim: false$/m);
assert.match(rehearsal, /not target production deployment evidence/);
assert.match(rehearsal, /not permission to claim `production-ready`/);
assert.match(
  releaseReadiness,
  /clean deployment release evidence for clean checkout proof with source branch, source commit, tracked-file mode, file count, excluded runtime state, and clean checkout owner, command replay proof with incident\/SLO, identity\/session, tenant, support, secret, observability, SLO, data lifecycle, clean deployment architecture and operations, retention, backup, provider, target deployment contract, artifact hygiene, runtime lifecycle, runtime isolation, pilot export, and package validation results, artifact synchronization proof with source commit, execution snapshot, clean deployment release artifact, production-like drill, pilot export package, release artifact hygiene, and artifact-sync-current status, production-like environment proof with approved target boundary, runtime bootstrap, secret injection, dependency install, environment boundary, rollback point, release approval, operator, and timestamp, and failure containment for stale checkout, dependency drift, local runtime leakage, missing artifact, failed smoke, failed hygiene, failed rollback, and misleading production-ready claim is not generated from a production-like environment/,
);
assert.doesNotMatch(
  releaseReadiness,
  new RegExp('clean deployment release evidence is not generated from ' + 'a production-like environment'),
);

for (const command of [
  'npm run smoke:incident-slo-policy',
  'npm run smoke:identity-session-admin',
  'npm run smoke:target-identity-session-operations',
  'npm run smoke:tenant-storage-admin',
  'npm run smoke:target-tenant-isolation-operations',
  'npm run smoke:customer-support-operations',
  'npm run smoke:support-escalation-review',
  'npm run smoke:target-support-architecture',
  'npm run smoke:target-support-operations',
  'npm run smoke:secret-management',
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
  'npm run smoke:retention-delete-policy',
  'npm run smoke:web-auth-rbac',
  'npm run smoke:target-openai-provider-account',
  'npm run smoke:target-anthropic-provider-account',
  'npm run smoke:target-local-provider-architecture',
  'npm run smoke:target-hermes-provider-architecture',
  'npm run smoke:target-provider-operations',
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
      commandCount: 36,
      artifactSyncCommit: sourceCommit !== currentCommit,
      mode: 'clean-deployment-release',
      ok: true,
      path: 'docs/clean-deployment-release-v1.md',
      productionReadyClaim: false,
      sourceCommit,
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

function assertArtifactCommitFresh({ artifactCommit, currentCommit, label }) {
  assert.match(artifactCommit, /^[a-f0-9]{40}$/i, `${label}: invalid artifact commit`);
  assert.match(currentCommit, /^[a-f0-9]{40}$/i, `${label}: invalid current commit`);
  if (artifactCommit === currentCommit) {
    return;
  }

  const changedPaths = runGit(['diff', '--name-only', `${artifactCommit}..${currentCommit}`])
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  assert.equal(changedPaths.length > 0, true, `${label}: no changed paths between artifact and current commit`);
  assert.equal(
    changedPaths.every(isReleaseArtifactSyncPath),
    true,
    JSON.stringify({ artifactCommit, changedPaths, currentCommit, label }, null, 2),
  );
}

function extractBulletValue(markdown, label) {
  const match = String(markdown || '').match(new RegExp(`^- ${escapeRegExp(label)}:\\s+(.+)$`, 'm'));
  return match ? String(match[1] || '').trim() : '';
}

function isReleaseArtifactSyncPath(filePath) {
  const relativePath = String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '');
  return [
    'CHANGELOG.md',
    '_portfolio_export/personal_ai_agent_portfolio_pack.zip',
    'docs/clean-deployment-release-v1.md',
    'docs/evidence-checklist.md',
    'docs/execution-v1-closeout.md',
    'docs/execution-v1-evidence.md',
    'docs/execution-v1-handoff.md',
    'docs/pilot-export-package-v1.md',
    'docs/production-enterprise-controls-v1.md',
    'docs/production-like-release-drill-v1.md',
    'docs/production-provider-readiness-v1.md',
    'docs/production-retention-operating-v1.md',
    'docs/production-slo-operating-v1.md',
    'docs/release-readiness-v1.md',
    'portfolio_manifest.md',
  ].includes(relativePath)
    || relativePath.startsWith('_portfolio_export/personal_ai_agent_portfolio_pack/')
    || relativePath.startsWith('docs/releases/execution-v1/');
}

function runGit(args) {
  const result = spawnSync('git', args, {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 ? String(result.stdout || '').trim() : '';
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
