import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const allSmokeScripts = Object.keys(packageJson.scripts).filter((name) => name.startsWith('smoke:'));

// Scripts that cannot run in a headless/offline sweep: the Playwright browser
// end-to-end smokes download a browser and hang without network/display.
const EXCLUDE_ALWAYS = new Set([
  'smoke:ui-execution-browser-e2e',
  'smoke:ui-execution-browser-e2e-artifact-restore',
  'smoke:workspace-learning-operator-surface-browser',
  // The sweep runners themselves are smoke:* scripts; never recurse into them.
  'smoke:all',
  'smoke:docs-gates',
]);

// Curated groups. `docs-gates` is the CI-safe subset: pure documentation/gate
// content assertions with no git-history or artifact-freshness dependency, so
// they never false-fail on a normal code commit. They caught 33 silent README
// drift failures on 2026-07-03; running them in CI stops that class recurring.
const GROUPS = {
  'docs-gates': [
    'smoke:target-deployment-contract',
    'smoke:hosted-saas-architecture-decision',
    'smoke:hosted-identity-session-architecture',
    'smoke:hosted-tenant-isolation-architecture',
    'smoke:target-tenant-isolation-operations',
    'smoke:identity-session-admin',
    'smoke:tenant-storage-admin',
    'smoke:target-retention-operations',
    'smoke:target-backup-operations',
    'smoke:target-support-architecture',
    'smoke:target-support-operations',
    'smoke:secret-management',
    'smoke:target-secret-manager',
    'smoke:target-secret-manager-architecture',
    'smoke:observability-telemetry',
    'smoke:target-observability-architecture',
    'smoke:target-observability-operations',
    'smoke:target-slo-architecture',
    'smoke:target-slo-operations',
    'smoke:production-slo-operating',
    'smoke:production-retention-operating',
    'smoke:target-identity-session-operations',
    'smoke:target-provider-evidence-intake',
    'smoke:target-openai-provider-account',
    'smoke:target-anthropic-provider-account',
    'smoke:target-local-provider-architecture',
    'smoke:target-hermes-provider-architecture',
    'smoke:target-environment-evidence-intake',
    'smoke:production-enterprise-controls',
    'smoke:retention-delete-policy',
    'smoke:target-data-lifecycle-architecture',
    'smoke:target-clean-deployment-architecture',
    'smoke:target-clean-deployment-operations',
  ],
};

function parseArgs(argv) {
  const args = { group: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--group') {
      args.group = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

const { group } = parseArgs(process.argv.slice(2));

let scriptsToRun;
if (group) {
  const groupScripts = GROUPS[group];
  assert.ok(groupScripts, `Unknown smoke group: ${group}. Known: ${Object.keys(GROUPS).join(', ')}`);
  for (const name of groupScripts) {
    assert.ok(
      packageJson.scripts[name],
      `Group ${group} references missing script ${name}; update GROUPS in scripts/run-all-smokes.mjs`,
    );
  }
  scriptsToRun = groupScripts;
} else {
  scriptsToRun = allSmokeScripts.filter((name) => !EXCLUDE_ALWAYS.has(name));
}

const startedAt = Date.now();
const results = [];
for (const name of scriptsToRun) {
  const outcome = spawnSync('npm', ['run', name, '--silent'], {
    cwd: repoDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const ok = outcome.status === 0;
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
}

const failures = results.filter((result) => !result.ok);
const durationSeconds = Math.round((Date.now() - startedAt) / 1000);

console.log(
  JSON.stringify(
    {
      mode: group ? `smoke-sweep:${group}` : 'smoke-sweep:all',
      total: results.length,
      passed: results.length - failures.length,
      failed: failures.length,
      failedScripts: failures.map((result) => result.name),
      excludedPlaywrightE2E: group ? [] : [...EXCLUDE_ALWAYS],
      durationSeconds,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  process.exitCode = 1;
}
