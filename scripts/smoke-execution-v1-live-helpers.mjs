import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { buildLiveValidationEntries } from './execution-v1-live-evidence-utils.mjs';

const repoDir = process.cwd();
const liveHelperProviders = [
  {
    command: 'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai',
    envKey: 'OPENAI_API_KEY',
    preflightChecks: [
      ['smoke:openai-provider', 'passed'],
      ['smoke:execution-flow', 'passed'],
    ],
    provider: 'openai',
  },
  {
    command: 'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    preflightChecks: [
      ['smoke:execution-flow', 'passed'],
    ],
    provider: 'anthropic',
  },
  {
    command: 'export LOCAL_PROVIDER_MODEL="..." && npm run live:execution-v1:local',
    envKey: 'LOCAL_PROVIDER_MODEL',
    preflightChecks: [
      ['smoke:execution-flow', 'passed'],
    ],
    provider: 'local',
  },
  {
    command: 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes',
    envKey: 'HERMES_PROVIDER_MODEL',
    preflightChecks: [
      ['smoke:hermes-provider', 'passed'],
      ['smoke:execution-flow', 'passed'],
    ],
    provider: 'hermes',
  },
];

for (const providerConfig of liveHelperProviders) {
  const preflight = runJsonCommand({
    args: ['scripts/preflight-execution-v1-live.mjs', providerConfig.provider],
    env: buildMissingProviderEnv(),
    expectedStatus: 0,
  });

  assert.equal(preflight.provider, providerConfig.provider);
  assert.equal(preflight.envKey, providerConfig.envKey);
  assert.equal(preflight.envReady, false);
  assert.equal(preflight.liveCommand, `npm run live:execution-v1:${providerConfig.provider}`);
  assert.equal(preflight.missingEnvCommand, providerConfig.command);
  assert.equal(preflight.ok, true);
  assert.equal(preflight.status, 'ready-but-missing-env');
  assert.deepEqual(
    preflight.checks.map((check) => [check.script, check.status]),
    providerConfig.preflightChecks,
  );

  const missingEnv = runJsonCommand({
    args: ['scripts/run-execution-v1-live.mjs', providerConfig.provider],
    env: buildMissingProviderEnv(),
    expectedStatus: 1,
    stream: 'stderr',
  });

  assert.equal(missingEnv.ok, false);
  assert.equal(missingEnv.provider, providerConfig.provider);
  assert.equal(missingEnv.envKey, providerConfig.envKey);
  assert.equal(missingEnv.reason, `Missing ${providerConfig.envKey}`);
  assert.equal(missingEnv.status, 'missing-env');
  assert.equal(missingEnv.command, providerConfig.command);
}

const aggregatePreflight = runJsonCommand({
  args: ['scripts/preflight-execution-v1-all.mjs'],
  env: {
    ANTHROPIC_API_KEY: '',
    HERMES_PROVIDER_MODEL: '',
    LOCAL_PROVIDER_BASE_URL: '',
    LOCAL_PROVIDER_MODEL: '',
    OPENAI_API_KEY: '',
  },
  expectedStatus: 0,
});

assert.equal(aggregatePreflight.ok, true);
assert.equal(aggregatePreflight.blockedCount, 0);
assert.equal(aggregatePreflight.missingEnvCount, 4);
assert.equal(aggregatePreflight.readyForLiveCount, 0);
assert.equal(aggregatePreflight.status, 'ready-but-missing-env');
assert.deepEqual(
  aggregatePreflight.providers.map((entry) => [entry.provider, entry.envReady, entry.status, entry.missingEnvCommand]),
  [
    ['openai', false, 'ready-but-missing-env', 'export OPENAI_RUN_TIMEOUT_MS=60000 OPENAI_API_KEY="..." && npm run live:execution-v1:openai'],
    ['anthropic', false, 'ready-but-missing-env', 'export ANTHROPIC_API_KEY="..." && npm run live:execution-v1:anthropic'],
    ['local', false, 'ready-but-missing-env', 'export LOCAL_PROVIDER_MODEL="..." && npm run live:execution-v1:local'],
    ['hermes', false, 'ready-but-missing-env', 'export HERMES_PROVIDER_MODEL="..." && npm run live:execution-v1:hermes'],
  ],
);

const liveOnlyMissingEnv = runJsonCommand({
  args: ['scripts/verify-execution-v1.mjs', '--live-only', '--live-local'],
  env: buildMissingProviderEnv(),
  expectedStatus: 0,
});

assert.equal(liveOnlyMissingEnv.mode, 'execution-v1-verification');
assert.deepEqual(liveOnlyMissingEnv.deterministic, []);
assert.deepEqual(liveOnlyMissingEnv.liveValidation, [
  {
    provider: 'local',
    reason: 'Missing LOCAL_PROVIDER_MODEL',
    status: 'skipped',
  },
]);

const preservedEntries = buildLiveValidationEntries(
  [
    {
      executionSessionId: 'execsession_new_local',
      missionId: 'mission_new_local',
      provider: 'local',
      status: 'passed',
      verificationStatus: 'passed',
    },
  ],
  [
    [
      '# Execution v1 Evidence',
      '',
      '## Live Validation',
      '',
      '- openai: passed (missionId=mission_old_openai, executionSessionId=execsession_old_openai, verification=passed)',
      '- anthropic: failed (anthropic live mission run failed | rootDir=<temp>/anthropic | missionId=mission_old_anthropic)',
      '  - failure: anthropic live mission run failed',
      '  - recoverable: false',
      '- local: passed (missionId=mission_old_local, executionSessionId=execsession_old_local, verification=passed)',
      '',
      '## Raw Summary',
    ].join('\n'),
  ],
);
const preservedLines = preservedEntries.flatMap((entry) => entry.lines);
assert.deepEqual(
  preservedEntries.map((entry) => [entry.summary.provider, entry.status]),
  [
    ['openai', 'passed'],
    ['anthropic', 'failed'],
    ['local', 'passed'],
  ],
);
assert.equal(preservedLines.some((line) => line.includes('mission_old_openai')), true);
assert.equal(preservedLines.some((line) => line.includes('mission_old_anthropic')), true);
assert.equal(preservedLines.some((line) => line.includes('mission_new_local')), true);
assert.equal(preservedLines.some((line) => line.includes('mission_old_local')), false);

console.log(
  JSON.stringify(
    {
      aggregateStatus: aggregatePreflight.status,
      archivedLivePreservation: true,
      liveOnlyValidation: true,
      missingEnvCount: aggregatePreflight.missingEnvCount,
      mode: 'execution-v1-live-helpers',
      ok: true,
      validatedProviders: liveHelperProviders.map((item) => item.provider),
    },
    null,
    2,
  ),
);

function buildMissingProviderEnv() {
  return {
    ANTHROPIC_API_KEY: '',
    HERMES_PROVIDER_MODEL: '',
    LOCAL_PROVIDER_BASE_URL: '',
    LOCAL_PROVIDER_MODEL: '',
    OPENAI_API_KEY: '',
  };
}

function runJsonCommand({ args, env = {}, expectedStatus = 0, stream = 'stdout' }) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  });

  assert.equal(result.status, expectedStatus, result.stderr || result.stdout);
  const rawOutput = String(stream === 'stderr' ? result.stderr : result.stdout).trim();
  assert.ok(rawOutput, `expected ${stream} JSON output from ${args.join(' ')}`);
  return JSON.parse(rawOutput);
}
