import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseLiveValidationReason } from './live-validation-utils.mjs';

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
    recommendedEnv: {
      OPENAI_RUN_TIMEOUT_MS: '60000',
    },
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
        command: buildMissingEnvCommand(provider, config),
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

const childEnv = buildChildEnv(config);
const evidenceResult = runJsonScript(evidenceScriptPath, [config.flag], childEnv);
const closeoutResult = runJsonScript(closeoutScriptPath, [config.flag], childEnv);
const liveResult = Array.isArray(evidenceResult.liveValidation)
  ? evidenceResult.liveValidation.find((item) => item.provider === provider) || null
  : null;

if (!liveResult || liveResult.status !== 'passed') {
  const parsedReason = parseLiveValidationReason(liveResult?.reason || '');
  console.error(
    JSON.stringify(
      {
        checklistPath: closeoutResult.checklistPath || null,
        evidencePath: evidenceResult.outputPath || null,
        failure: parsedReason?.message || null,
        liveFailureDetails: parsedReason?.details || null,
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
      recommendedEnv: summarizeEffectiveRecommendedEnv(config, childEnv),
      rootDir: liveResult.rootDir || null,
      status: 'passed',
      workspaceId: liveResult.workspaceId || null,
    },
    null,
    2,
  ),
);

function runJsonScript(command, args, env = process.env) {
  const result = spawnSync(process.execPath, [command, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env,
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

function buildChildEnv(config) {
  const childEnv = { ...process.env };
  for (const [key, value] of Object.entries(config.recommendedEnv || {})) {
    if (!childEnv[key]) {
      childEnv[key] = value;
    }
  }
  return childEnv;
}

function summarizeEffectiveRecommendedEnv(config, env) {
  return Object.fromEntries(
    Object.entries(config.recommendedEnv || {})
      .filter(([key]) => Boolean(env[key]))
      .map(([key]) => [key, env[key]]),
  );
}

function buildMissingEnvCommand(provider, config) {
  const recommendedPairs = Object.entries(config.recommendedEnv || {});
  if (!recommendedPairs.length) {
    return `export ${config.envKey}="..." && npm run live:execution-v1:${provider}`;
  }

  return `export ${recommendedPairs
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')} ${config.envKey}="..." && npm run live:execution-v1:${provider}`;
}
