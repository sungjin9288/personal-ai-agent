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
    env: {
      ...process.env,
      PERSONAL_AI_AGENT_REFRESH_STEP_TIMEOUT_MS: '12345',
    },
  },
);

assert.equal(result.status, 0, result.stderr || result.stdout);
const payload = JSON.parse(String(result.stdout || '{}'));

assert.equal(payload.ok, true);
assert.equal(payload.dryRun, true);
assert.equal(payload.preserveArchivedLiveValidation, true);
assert.equal(payload.stepTimeoutMs, 12345);
assert.deepEqual(payload.liveFlags, []);
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
assert.equal(evidenceStep.timeoutMs, 12345);
assert.match(evidenceStep.command, /--preserve-archived-live-validation/);
assert.doesNotMatch(evidenceStep.command, /--live-/);
assert.equal(
  payload.steps.filter((step) => /archive-execution-v1-snapshot\.mjs/.test(step.command)).length,
  2,
);
const pilotExportStep = payload.steps.find((step) => step.name === 'pilot-export-package');
assert.match(pilotExportStep.command, /build-pilot-export-package\.mjs/);

const deterministicOnlyResult = spawnSync(
  process.execPath,
  ['scripts/refresh-execution-v1-artifacts.mjs', '--dry-run', '--no-preserve-archived-live-validation'],
  {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  },
);

assert.equal(deterministicOnlyResult.status, 0, deterministicOnlyResult.stderr || deterministicOnlyResult.stdout);
const deterministicOnlyPayload = JSON.parse(String(deterministicOnlyResult.stdout || '{}'));
const deterministicEvidenceStep = deterministicOnlyPayload.steps.find((step) => step.name === 'evidence');

assert.equal(deterministicOnlyPayload.preserveArchivedLiveValidation, false);
assert.deepEqual(deterministicOnlyPayload.liveFlags, []);
assert.doesNotMatch(deterministicEvidenceStep.command, /--preserve-archived-live-validation/);
assert.doesNotMatch(deterministicEvidenceStep.command, /--live-/);

const explicitLiveResult = spawnSync(
  process.execPath,
  ['scripts/refresh-execution-v1-artifacts.mjs', '--dry-run', '--live-openai'],
  {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  },
);

assert.equal(explicitLiveResult.status, 0, explicitLiveResult.stderr || explicitLiveResult.stdout);
const explicitLivePayload = JSON.parse(String(explicitLiveResult.stdout || '{}'));
const explicitLiveEvidenceStep = explicitLivePayload.steps.find((step) => step.name === 'evidence');

assert.deepEqual(explicitLivePayload.liveFlags, ['--live-openai']);
assert.match(explicitLiveEvidenceStep.command, /--live-openai/);

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
