import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { runCommandWithHardTimeout } from './process-timeout-utils.mjs';

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
    envKey: 'LOCAL_PROVIDER_MODEL',
    flag: '--live-local',
    provider: 'local',
  },
  {
    envKey: 'HERMES_PROVIDER_MODEL',
    flag: '--live-hermes',
    provider: 'hermes',
  },
];

const deterministicScripts = [
  'smoke:execution-flow',
  'smoke:execution-cli',
  'smoke:ui-execution-console',
  'smoke:ui-execution-browser-e2e',
  'smoke:reference-adoptions',
  'smoke:execution-v1-live-helpers',
  'smoke:execution-v1-handoff',
  'smoke:production-readiness-gate',
];
const npmScriptTimeoutMs = parsePositiveIntegerEnv(
  'PERSONAL_AI_AGENT_VERIFY_SCRIPT_TIMEOUT_MS',
  20 * 60 * 1000,
);
const npmScriptMaxBufferBytes = parsePositiveIntegerEnv(
  'PERSONAL_AI_AGENT_VERIFY_MAX_BUFFER_BYTES',
  128 * 1024 * 1024,
);

const requestedLiveProviders = liveProviders.filter((item) => process.argv.includes(item.flag));
const captureLiveFailures = process.argv.includes('--capture-live-failures');
const liveOnly = process.argv.includes('--live-only');

const summary = {
  deterministic: [],
  liveValidation: [],
  ok: true,
  mode: 'execution-v1-verification',
};

if (!liveOnly) {
  for (const scriptName of deterministicScripts) {
    summary.deterministic.push(runNpmScript(scriptName));
  }
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
  const startedAt = Date.now();
  const result = runCommandWithHardTimeout('npm', ['run', scriptName], {
    cwd: repoDir,
    env: process.env,
    timeoutMs: npmScriptTimeoutMs,
  });
  const durationMs = Date.now() - startedAt;
  const stdoutBytes = Buffer.byteLength(result.stdout || '', 'utf8');
  const stderrBytes = Buffer.byteLength(result.stderr || '', 'utf8');

  if (stdoutBytes > npmScriptMaxBufferBytes || stderrBytes > npmScriptMaxBufferBytes) {
    throw new Error(
      formatNpmFailure(scriptName, result, {
        durationMs,
        stderrBytes,
        stdoutBytes,
        timeoutMs: npmScriptTimeoutMs,
      }),
    );
  }

  if (result.timedOut || result.error) {
    throw new Error(
      formatNpmFailure(scriptName, result, {
        durationMs,
        stderrBytes,
        stdoutBytes,
        timeoutMs: npmScriptTimeoutMs,
      }),
    );
  }

  if (result.status !== 0) {
    throw new Error(
      formatNpmFailure(scriptName, result, {
        durationMs,
        stderrBytes,
        stdoutBytes,
        timeoutMs: npmScriptTimeoutMs,
      }),
    );
  }

  const scriptSummary = {
    durationMs,
    script: scriptName,
    status: 'passed',
    stderrBytes,
    stdoutBytes,
    timeoutMs: npmScriptTimeoutMs,
  };

  if (scriptName === 'smoke:reference-adoptions') {
    const referenceAdoptionSummary = parseReferenceAdoptionSummary(result.stdout || '');
    if (referenceAdoptionSummary) {
      scriptSummary.referenceAdoptionSummary = referenceAdoptionSummary;
    }
  }

  return scriptSummary;
}

function parseReferenceAdoptionSummary(stdout) {
  const parsed = parseLastJsonObject(stdout);
  if (!parsed || parsed.mode !== 'reference-adoptions-smoke' || !Array.isArray(parsed.results)) {
    return null;
  }

  return {
    mode: parsed.mode,
    ok: parsed.ok === true,
    scriptCount: parsed.results.length,
    scripts: parsed.results.map((item) => ({
      durationMs: Number(item.durationMs || 0),
      ok: item.ok === true,
      script: String(item.script || '').trim(),
      timedOut: item.timedOut === true,
      timeoutMs: Number(item.timeoutMs || 0),
    })),
    totalDurationMs: Number(parsed.totalDurationMs || 0),
  };
}

function parseLastJsonObject(stdout) {
  const text = String(stdout || '').trim();
  if (!text) {
    return null;
  }

  for (let index = text.lastIndexOf('{'); index >= 0; index = text.lastIndexOf('{', index - 1)) {
    try {
      return JSON.parse(text.slice(index));
    } catch {
      // npm script banners precede the JSON payload; keep scanning left.
    }
  }

  return null;
}

function parsePositiveIntegerEnv(envKey, fallbackValue) {
  const rawValue = process.env[envKey];
  if (rawValue === undefined || rawValue === '') {
    return fallbackValue;
  }
  const parsedValue = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function formatNpmFailure(scriptName, result, { durationMs, stderrBytes, stdoutBytes, timeoutMs }) {
  const output = result.stderr || result.stdout || '';
  const outputTail = String(output).slice(-8000);
  return [
    `npm run ${scriptName} failed`,
    result.error ? `error=${result.error}` : null,
    result.signal ? `signal=${result.signal}` : null,
    result.timedOut ? 'timedOut=true' : null,
    result.status !== null ? `status=${result.status}` : null,
    `durationMs=${durationMs}`,
    `timeoutMs=${timeoutMs}`,
    `stdoutBytes=${stdoutBytes}`,
    `stderrBytes=${stderrBytes}`,
    outputTail ? `outputTail:\n${outputTail}` : null,
  ]
    .filter(Boolean)
    .join('\n');
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
      '--constraints',
      [
        'Execution manifest must use cwd .',
        'Execution manifest must include only read-only inspect commands and node --check src/cli.mjs',
        'Do not write files',
        'Do not use placeholder or TBD commands',
        'Do not run network, install, git commit, git push, or deployment commands',
      ].join('|'),
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
        `rootDir=${tempRoot}`,
        `workspaceId=${workspace.id}`,
        `missionId=${mission.id}`,
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
  const reviewedMissionDetail = runCli({
    rootDir: tempRoot,
    args: ['mission', 'show', mission.id],
  });
  const reviewedSession = Array.isArray(reviewedMissionDetail.sessions)
    ? reviewedMissionDetail.sessions.at(-1)
    : null;
  forceLiveValidationExecutionManifest({
    missionId: mission.id,
    rootDir: tempRoot,
    sessionId: reviewedSession?.id,
  });

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
    rootDir: tempRoot,
    status: 'passed',
    verificationStatus: executionSession.verification.status,
    workspaceId: workspace.id,
  };
}

function forceLiveValidationExecutionManifest({ missionId, rootDir, sessionId }) {
  if (!sessionId) {
    throw new Error(`Cannot force live validation manifest without a reviewed session for ${missionId}`);
  }

  const statePath = path.join(rootDir, 'var', 'state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const manifest = {
    source: 'live-validation-fixture',
    summary: 'Deterministic live validation execution manifest that runs one bounded Node syntax check.',
    steps: [
      {
        command: 'node --check src/cli.mjs',
        cwd: '.',
        expectedOutputs: ['Exit code 0 from Node syntax check'],
        kind: 'test',
        reason: 'Keep provider live validation deterministic while still exercising the approved execution loop.',
        riskClassification: 'low',
        title: 'Check CLI entrypoint syntax',
        verificationTarget: 'src/cli.mjs parses successfully under Node.',
      },
    ],
  };

  let patched = false;
  for (const run of state.agentRuns || []) {
    if (run?.missionId === missionId && run?.sessionId === sessionId && run?.role === 'executor') {
      run.executionManifest = manifest;
      run.outputSummary = `${run.outputSummary || ''} Live validation fixture normalized executionManifest to a single deterministic node --check command.`.trim();
      patched = true;
    }
  }

  if (!patched) {
    throw new Error(`Cannot find executor run to force live validation manifest for ${missionId}/${sessionId}`);
  }

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}
