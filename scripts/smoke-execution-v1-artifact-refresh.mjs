import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));

assert.equal(
  packageJson.scripts['refresh:execution-v1-artifacts'],
  'node scripts/refresh-execution-v1-artifacts.mjs',
);
assert.equal(
  packageJson.scripts['smoke:execution-v1-artifact-refresh'],
  'node scripts/smoke-execution-v1-artifact-refresh.mjs',
);

const result = spawnSync(
  process.execPath,
  ['scripts/refresh-execution-v1-artifacts.mjs', '--dry-run'],
  {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  },
);

assert.equal(result.status, 0, result.stderr || result.stdout);
const payload = JSON.parse(String(result.stdout || '{}'));

assert.equal(payload.ok, true);
assert.equal(payload.dryRun, true);
assert.equal(payload.preserveArchivedLiveValidation, true);
assert.deepEqual(payload.liveFlags, ['--live-openai', '--live-anthropic', '--live-local']);
assert.deepEqual(
  payload.steps.map((step) => step.name),
  [
    'evidence',
    'closeout',
    'handoff-before-snapshot',
    'production-provider-readiness',
    'snapshot-before-handoff-refresh',
    'handoff-after-snapshot',
    'snapshot-final',
    'pilot-export-package',
  ],
);

const evidenceStep = payload.steps.find((step) => step.name === 'evidence');
assert.match(evidenceStep.command, /build-execution-v1-evidence\.mjs/);
assert.match(evidenceStep.command, /--preserve-archived-live-validation/);
assert.match(evidenceStep.command, /--live-openai/);
assert.match(evidenceStep.command, /--live-anthropic/);
assert.match(evidenceStep.command, /--live-local/);
assert.doesNotMatch(evidenceStep.command, /--live-hermes/);
assert.equal(
  payload.steps.filter((step) => /archive-execution-v1-snapshot\.mjs/.test(step.command)).length,
  2,
);
const pilotExportStep = payload.steps.find((step) => step.name === 'pilot-export-package');
assert.match(pilotExportStep.command, /build-pilot-export-package\.mjs/);

console.log(
  JSON.stringify(
    {
      mode: 'execution-v1-artifact-refresh-smoke',
      ok: true,
      liveFlags: payload.liveFlags,
      stepCount: payload.steps.length,
    },
    null,
    2,
  ),
);
