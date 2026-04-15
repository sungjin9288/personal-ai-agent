import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();
const evidenceScriptPath = path.join(repoDir, 'scripts', 'build-execution-v1-evidence.mjs');
const closeoutScriptPath = path.join(repoDir, 'scripts', 'build-execution-v1-closeout.mjs');

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

const evidenceResult = runJsonScript(evidenceScriptPath, [config.flag]);
const closeoutResult = runJsonScript(closeoutScriptPath, [config.flag]);
const liveResult = Array.isArray(evidenceResult.liveValidation)
  ? evidenceResult.liveValidation.find((item) => item.provider === provider) || null
  : null;

if (!liveResult || liveResult.status !== 'passed') {
  console.error(
    JSON.stringify(
      {
        checklistPath: closeoutResult.checklistPath || null,
        evidencePath: evidenceResult.outputPath || null,
        ok: false,
        provider,
        reason: liveResult?.reason || `No ${provider} live validation result recorded`,
        status: liveResult?.status || 'failed',
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      checklistPath: closeoutResult.checklistPath || null,
      evidencePath: evidenceResult.outputPath || null,
      executionSessionId: liveResult.executionSessionId || null,
      missionId: liveResult.missionId || null,
      ok: true,
      provider,
      rootDir: liveResult.rootDir || null,
      status: 'passed',
      workspaceId: liveResult.workspaceId || null,
    },
    null,
    2,
  ),
);

function runJsonScript(command, args) {
  const result = spawnSync(process.execPath, [command, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const stdout = String(result.stdout || '').trim();
  return stdout ? JSON.parse(stdout) : {};
}
