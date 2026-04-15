import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();

const providerConfig = {
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    flag: '--live-anthropic',
  },
  local: {
    envKey: 'LOCAL_PROVIDER_BASE_URL',
    flag: '--live-local',
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    flag: '--live-openai',
  },
};

const provider = process.argv[2];
const config = providerConfig[provider];

if (!config) {
  console.error(
    [
      'Unsupported provider.',
      'Usage: node scripts/run-execution-v1-live.mjs <openai|anthropic|local>',
    ].join('\n'),
  );
  process.exit(1);
}

if (!process.env[config.envKey]) {
  console.error(
    JSON.stringify(
      {
        command: `export ${config.envKey}="..." && npm run live:execution-v1:${provider}`,
        envKey: config.envKey,
        ok: false,
        provider,
        reason: `Missing ${config.envKey}`,
        status: 'missing-env',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

runOrExit('npm', ['run', 'evidence:execution-v1', '--', config.flag]);
runOrExit('npm', ['run', 'closeout:execution-v1', '--', config.flag]);

console.log(
  JSON.stringify(
    {
      ok: true,
      provider,
      scripts: [
        `npm run evidence:execution-v1 -- ${config.flag}`,
        `npm run closeout:execution-v1 -- ${config.flag}`,
      ],
      status: 'completed',
    },
    null,
    2,
  ),
);

function runOrExit(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
