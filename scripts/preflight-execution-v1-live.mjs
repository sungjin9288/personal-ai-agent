import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();

const providerConfig = {
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    liveCommand: 'npm run live:execution-v1:anthropic',
    smokeScripts: ['smoke:execution-flow'],
  },
  local: {
    envKey: 'LOCAL_PROVIDER_BASE_URL',
    liveCommand: 'npm run live:execution-v1:local',
    smokeScripts: ['smoke:execution-flow'],
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    liveCommand: 'npm run live:execution-v1:openai',
    smokeScripts: ['smoke:openai-provider', 'smoke:execution-flow'],
  },
};

const provider = process.argv[2];
const config = providerConfig[provider];

if (!config) {
  console.error(
    [
      'Unsupported provider.',
      'Usage: node scripts/preflight-execution-v1-live.mjs <openai|anthropic|local>',
    ].join('\n'),
  );
  process.exit(1);
}

const checks = [];
for (const scriptName of config.smokeScripts) {
  checks.push(runScript(scriptName));
}

const envReady = Boolean(process.env[config.envKey]);
const recommendedEnv = provider === 'openai' ? { OPENAI_RUN_TIMEOUT_MS: process.env.OPENAI_RUN_TIMEOUT_MS || '60000' } : {};

const ok = checks.every((check) => check.status === 'passed');
console.log(
  JSON.stringify(
    {
      checks,
      envKey: config.envKey,
      envReady,
      liveCommand: config.liveCommand,
      ok,
      provider,
      recommendedEnv,
      status: ok ? (envReady ? 'ready-for-live-validation' : 'ready-but-missing-env') : 'blocked',
    },
    null,
    2,
  ),
);

function runScript(scriptName) {
  const result = spawnSync('npm', ['run', scriptName], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  return {
    script: scriptName,
    status: result.status === 0 ? 'passed' : 'failed',
    summary: result.status === 0 ? 'ok' : compactOutput(result.stderr || result.stdout),
  };
}

function compactOutput(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}
