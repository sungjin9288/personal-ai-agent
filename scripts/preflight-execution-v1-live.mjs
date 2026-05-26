import { spawnSync } from 'node:child_process';

const repoDir = process.cwd();

const providerConfig = {
  anthropic: {
    envKey: 'ANTHROPIC_API_KEY',
    evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-anthropic',
    liveCommand: 'npm run live:execution-v1:anthropic',
    requiredClosingEvidence: 'target Anthropic account approval, billing/credit remediation, target secret injection, model access, target-boundary live validation, provider operations proof, release artifact hygiene, and regenerated execution-v1 artifacts',
    smokeScripts: ['smoke:execution-flow'],
    targetStopConditionId: 'anthropic-live-validation-missing-or-failed',
  },
  local: {
    envKey: 'LOCAL_PROVIDER_MODEL',
    evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-local',
    liveCommand: 'npm run live:execution-v1:local',
    requiredClosingEvidence: 'target local provider architecture approval, endpoint/model pinning, network isolation, quota/resource guard, target-boundary live validation, provider operations proof, release artifact hygiene, and regenerated execution-v1 artifacts',
    smokeScripts: ['smoke:execution-flow'],
    targetStopConditionId: 'target-local-provider-approval-missing',
  },
  hermes: {
    envKey: 'HERMES_PROVIDER_MODEL',
    evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-hermes',
    liveCommand: 'npm run live:execution-v1:hermes',
    requiredClosingEvidence: 'target Hermes provider architecture approval, endpoint/model pinning, target secret injection, tool-call parsing proof, target-boundary live validation, provider operations proof, release artifact hygiene, and regenerated execution-v1 artifacts',
    smokeScripts: ['smoke:hermes-provider', 'smoke:execution-flow'],
    targetStopConditionId: 'target-hermes-provider-approval-missing',
  },
  openai: {
    envKey: 'OPENAI_API_KEY',
    evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-openai',
    liveCommand: 'npm run live:execution-v1:openai',
    requiredClosingEvidence: 'target OpenAI account approval, billing/quota proof, target secret injection, model access, target-boundary live validation, provider operations proof, release artifact hygiene, and regenerated execution-v1 artifacts',
    smokeScripts: ['smoke:openai-provider', 'smoke:execution-flow'],
    targetStopConditionId: 'target-openai-provider-account-approval-missing',
  },
};

const provider = process.argv[2];
const config = providerConfig[provider];

if (!config) {
  console.error(
    [
      'Unsupported provider.',
      'Usage: node scripts/preflight-execution-v1-live.mjs <openai|anthropic|local|hermes>',
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
const missingEnvCommand = buildMissingEnvCommand(provider, config, recommendedEnv);

const ok = checks.every((check) => check.status === 'passed');
const status = ok ? (envReady ? 'ready-for-live-validation' : 'ready-but-missing-env') : 'blocked';
const stopCondition = buildStopCondition({
  config,
  envReady,
  ok,
  provider,
  status,
});
console.log(
  JSON.stringify(
    {
      claimImpact: 'Provider cannot be included in production-ready or live-provider-complete claims until target-boundary evidence closes the target stop-condition.',
      checks,
      envKey: config.envKey,
      envReady,
      evidenceCommand: config.evidenceCommand,
      liveCommand: config.liveCommand,
      missingEnvCommand,
      ok,
      provider,
      recommendedEnv,
      requiredClosingEvidence: config.requiredClosingEvidence,
      status,
      stopCondition,
      stopConditionId: stopCondition?.id || '',
      stopReason: stopCondition?.reason || '',
      targetStopConditionId: config.targetStopConditionId,
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

function buildMissingEnvCommand(providerName, config, recommendedEnv) {
  const recommendedPairs = Object.entries(recommendedEnv || {});
  if (!recommendedPairs.length) {
    return `export ${config.envKey}="..." && npm run live:execution-v1:${providerName}`;
  }

  return `export ${recommendedPairs
    .map(([key, value]) => `${key}=${value}`)
    .join(' ')} ${config.envKey}="..." && npm run live:execution-v1:${providerName}`;
}

function buildStopCondition({ config, envReady, ok, provider, status }) {
  if (!ok) {
    return {
      claimImpact: 'Do not run live validation or expand provider claims until deterministic provider prerequisites pass.',
      evidenceCommand: config.evidenceCommand,
      id: `${provider}-preflight-smoke-failed`,
      nextVerificationCommand: `npm run preflight:execution-v1:${provider}`,
      reason: 'deterministic provider preflight failed',
      requiredClosingEvidence: 'failed provider smoke output, remediation note, passing provider preflight, release artifact hygiene, and regenerated execution-v1 artifacts when source-of-record changes',
      status,
      targetStopConditionId: config.targetStopConditionId,
    };
  }

  if (!envReady) {
    return {
      claimImpact: 'Live validation cannot run from this shell and provider claims remain blocked unless archived target-boundary proof already applies to the claimed scope.',
      evidenceCommand: config.evidenceCommand,
      id: `${provider}-live-env-missing`,
      nextVerificationCommand: config.liveCommand,
      reason: `Missing ${config.envKey}`,
      requiredClosingEvidence: config.requiredClosingEvidence,
      status,
      targetStopConditionId: config.targetStopConditionId,
    };
  }

  return null;
}
