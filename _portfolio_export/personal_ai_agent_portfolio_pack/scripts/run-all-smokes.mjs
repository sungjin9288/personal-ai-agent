import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildSmokeFailureDiagnostics,
  MAX_CAPTURE_BYTES,
} from './smoke-failure-diagnostics.mjs';

const repoDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const allSmokeScripts = Object.keys(packageJson.scripts).filter((name) => name.startsWith('smoke:'));

// Scripts that cannot run in a deterministic headless/offline sweep. Browser
// smokes need a display/runtime, the local claim-attribution smoke invokes an
// actual Ollama model, and runtime-image provenance is bound to the current
// Darwin host image set. Each remains available as an explicit standalone gate.
const EXCLUDE_ALWAYS = new Set([
  'smoke:ui-execution-browser-e2e',
  'smoke:ui-execution-browser-e2e-artifact-restore',
  'smoke:workspace-learning-operator-surface-browser',
  'smoke:user-learning-operator-surface-browser',
  'smoke:local-training-permission-surface-browser',
  'smoke:local-evidence-gated-answer-claim-attribution',
  'smoke:local-training-runtime-image-provenance',
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
    'smoke:council-blueprint-preview',
    'smoke:council-concurrent-schedule-shadow',
    'smoke:council-concurrent-envelope-shadow',
    'smoke:council-concurrent-retry-lineage-shadow',
    'smoke:council-concurrent-retry-terminality-shadow',
    'smoke:council-concurrent-retry-surface',
    'smoke:council-closeout',
    'smoke:local-council-provider-shadow',
    'smoke:local-council-seat-contract-shadow',
    'smoke:local-council-claim-contract-robustness',
    'smoke:local-council-rebuttal-synthesis-shadow',
    'smoke:local-council-chair-synthesis-contract-shadow',
    'smoke:local-council-rebuttal-stability-shadow',
    'smoke:local-council-strict-prompt-candidate-qualification',
    'smoke:local-council-v6-actual-compatibility-observation',
    'smoke:local-v1-completion-closeout',
    'smoke:smoke-validation-summary',
    'smoke:external-evidence-blockers',
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
    'smoke:rag-evidence-sufficiency',
    'smoke:local-rag-evidence-sufficiency-shadow',
    'smoke:evidence-gated-answer-shadow',
    'smoke:evidence-gated-answer-robustness',
    'smoke:evidence-gated-answer-claim-attribution',
    'smoke:evidence-gated-answer-output-hardening',
    'smoke:local-evidence-gated-answer-shadow',
    'smoke:local-evidence-gated-answer-robustness',
  ],
};

const GROUP_EXCLUSIONS = {
  'docs-gates': new Set(['smoke:local-v1-completion-closeout']),
};

function parseArgs(argv) {
  const args = { excludedScripts: [], group: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--group') {
      if (args.group || !argv[index + 1] || argv[index + 1].startsWith('--')) {
        throw new Error('--group requires one value.');
      }
      args.group = argv[index + 1];
      index += 1;
    } else if (argv[index] === '--exclude') {
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) {
        throw new Error('--exclude requires one smoke script.');
      }
      args.excludedScripts.push(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argv[index]}.`);
    }
  }
  return args;
}

const { excludedScripts, group } = parseArgs(process.argv.slice(2));
if (new Set(excludedScripts).size !== excludedScripts.length) {
  throw new Error('Duplicate smoke exclusion.');
}
if (excludedScripts.length > 0 && !group) {
  throw new Error('--exclude requires --group.');
}
const allowedExclusions = GROUP_EXCLUSIONS[group] || new Set();
for (const excludedScript of excludedScripts) {
  if (!allowedExclusions.has(excludedScript)) {
    throw new Error(`Unsupported smoke exclusion: ${excludedScript}.`);
  }
}

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
  scriptsToRun = groupScripts.filter((name) => !excludedScripts.includes(name));
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
    maxBuffer: MAX_CAPTURE_BYTES,
  });
  const ok = outcome.status === 0;
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) {
    console.error(
      `FAIL_DIAGNOSTICS ${name} ${JSON.stringify(buildSmokeFailureDiagnostics(outcome, { repoDir }))}`,
    );
  }
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
      excludedSmokeScripts: group ? excludedScripts : [...EXCLUDE_ALWAYS],
      durationSeconds,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  process.exitCode = 1;
}
