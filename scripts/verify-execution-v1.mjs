import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');

const liveProviders = [
  {
    envKey: 'OPENAI_API_KEY',
    flag: '--live-openai',
    provider: 'openai',
  },
  {
    envKey: 'ANTHROPIC_API_KEY',
    flag: '--live-anthropic',
    provider: 'anthropic',
  },
  {
    envKey: 'LOCAL_PROVIDER_BASE_URL',
    flag: '--live-local',
    provider: 'local',
  },
];

const deterministicScripts = [
  'smoke:execution-flow',
  'smoke:execution-cli',
  'smoke:ui-execution-console',
  'smoke:ui-execution-browser-e2e',
];

const requestedLiveProviders = liveProviders.filter((item) => process.argv.includes(item.flag));
const captureLiveFailures = process.argv.includes('--capture-live-failures');

const summary = {
  deterministic: [],
  liveValidation: [],
  ok: true,
  mode: 'execution-v1-verification',
};

for (const scriptName of deterministicScripts) {
  summary.deterministic.push(runNpmScript(scriptName));
}

for (const liveProvider of requestedLiveProviders) {
  try {
    summary.liveValidation.push(await runLiveValidation(liveProvider.provider, liveProvider.envKey));
  } catch (error) {
    if (!captureLiveFailures) {
      throw error;
    }

    summary.ok = false;
    summary.liveValidation.push({
      provider: liveProvider.provider,
      reason: error instanceof Error ? error.message : 'unknown-live-validation-error',
      status: 'failed',
    });
  }
}

console.log(JSON.stringify(summary, null, 2));

function runNpmScript(scriptName) {
  const result = spawnSync('npm', ['run', scriptName], {
    cwd: repoDir,
    encoding: 'utf8',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`npm run ${scriptName} failed\n${result.stderr || result.stdout}`);
  }

  return {
    script: scriptName,
    status: 'passed',
  };
}

function runCli({ rootDir, args, env = {} }) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      PERSONAL_AI_AGENT_ROOT: rootDir,
    },
  });

  if (result.status !== 0) {
    throw new Error(`CLI failed (${args.join(' ')}): ${result.stderr || result.stdout}`);
  }

  const stdout = String(result.stdout || '').trim();
  return stdout ? JSON.parse(stdout) : null;
}

async function runLiveValidation(provider, envKey) {
  if (!process.env[envKey]) {
    return {
      provider,
      reason: `Missing ${envKey}`,
      status: 'skipped',
    };
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `personal-ai-agent-live-${provider}-`));

  const workspace = runCli({
    rootDir: tempRoot,
    args: ['workspace', 'add', repoDir, '--name', `${provider}-live-validation-workspace`],
  });

  const mission = runCli({
    rootDir: tempRoot,
    args: [
      'mission',
      'create',
      '--workspace',
      workspace.id,
      '--mode',
      'engineering',
      '--title',
      `${provider} execution live validation`,
      '--objective',
      'Validate the bounded engineering execution loop against a live provider.',
    ],
  });

  const runResult = runCli({
    rootDir: tempRoot,
    args: ['mission', 'run', mission.id, '--provider', provider],
  });

  if (runResult.status === 'failed') {
    const missionDetail = runCli({
      rootDir: tempRoot,
      args: ['mission', 'show', mission.id],
    });
    const latestSession = Array.isArray(missionDetail.sessions) ? missionDetail.sessions.at(-1) : null;
    throw new Error(
      [
        `${provider} live mission run failed`,
        latestSession?.reviewerSummary ? `reviewerSummary=${latestSession.reviewerSummary}` : null,
        latestSession?.latestArtifactFileName ? `artifact=${latestSession.latestArtifactFileName}` : null,
        latestSession?.id ? `sessionId=${latestSession.id}` : null,
        missionDetail?.mission?.status ? `missionStatus=${missionDetail.mission.status}` : null,
      ]
        .filter(Boolean)
        .join(' | '),
    );
  }

  assert.equal(runResult.status, 'reviewed');

  const preflight = runCli({
    rootDir: tempRoot,
    args: ['mission', 'execution', 'preflight', mission.id, '--request-approval'],
  });

  assert.equal(preflight.execution.eligibility, 'pending-approval');

  runCli({
    rootDir: tempRoot,
    args: [
      'approval',
      'resolve',
      preflight.approval.id,
      '--decision',
      'approve',
      '--reason',
      `${provider} live validation approved one bounded execution session.`,
    ],
  });

  const startResult = runCli({
    rootDir: tempRoot,
    args: ['mission', 'execution', 'start', mission.id],
  });

  assert.equal(startResult.execution.status, 'running');

  let statusResult = runCli({
    rootDir: tempRoot,
    args: ['mission', 'execution', 'status', mission.id],
  });

  for (let index = 0; index < 120; index += 1) {
    if (statusResult.execution.latestExecutionSession?.status !== 'running') {
      break;
    }
    await delay(500);
    statusResult = runCli({
      rootDir: tempRoot,
      args: ['mission', 'execution', 'status', mission.id],
    });
  }

  const executionSession = statusResult.execution.latestExecutionSession;
  assert.ok(executionSession);
  assert.equal(executionSession.status, 'completed');
  assert.equal(executionSession.verification.status, 'passed');

  return {
    executionSessionId: executionSession.id,
    missionId: mission.id,
    provider,
    status: 'passed',
    verificationStatus: executionSession.verification.status,
  };
}
