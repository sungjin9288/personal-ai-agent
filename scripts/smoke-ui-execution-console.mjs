import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { runCli } from './cli-test-helpers.mjs';
import { fetchServedFrontendBundle } from './ui-smoke-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-execution-'));

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'ui-execution-workspace'],
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
    'UI Execution Console Smoke',
    '--objective',
    'Verify execution preflight and execution session APIs through the UI server contract.',
  ],
});

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(runResult.status, 'reviewed');

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = { stderr: '', stdout: '' };

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

serverProcess.stdout.on('data', (chunk) => {
  serverOutput.stdout += String(chunk);
});

serverProcess.stderr.on('data', (chunk) => {
  serverOutput.stderr += String(chunk);
});

try {
  await waitForServer(baseUrl, serverProcess, serverOutput);

  const rootHtml = await fetchText(baseUrl);
  const appJs = await fetchServedFrontendBundle(baseUrl);

  assert.equal(rootHtml.includes('id="execution-console"'), true);
  assert.equal(rootHtml.includes('preflight, 승인 lease, 라이브 로그'), true);
  assert.equal(appJs.includes('buildOperatorHandoffItems'), true);
  assert.equal(appJs.includes('완료 게이트'), true);
  assert.equal(appJs.includes('Provider 경로'), true);
  assert.equal(appJs.includes('세션 증적'), true);
  assert.equal(appJs.includes('handleExecutionPreflight'), true);
  assert.equal(appJs.includes('handleExecutionStart'), true);
  assert.equal(appJs.includes('handleExecutionStop'), true);

  const preflight = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/execution/preflight`, {
    body: JSON.stringify({ requestApproval: true }),
    headers: { 'content-type': 'application/json' },
    method: 'POST',
  });

  assert.equal(preflight.execution.supported, true);
  assert.equal(preflight.execution.eligibility, 'pending-approval');
  assert.equal(preflight.approval.kind, 'execution_lease');

  const approvalResolution = await fetchJson(
    `${baseUrl}/api/approvals/${encodeURIComponent(preflight.approval.id)}/resolve`,
    {
      body: JSON.stringify({
        decision: 'approve',
        reason: 'UI execution console smoke approves one bounded execution session.',
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  );

  assert.equal(approvalResolution.approval.status, 'approved');
  assert.equal(approvalResolution.lease.status, 'active');

  const startResult = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/execution/start`, {
    method: 'POST',
  });

  assert.equal(startResult.execution.status, 'running');

  let statusPayload = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/execution`);
  for (let index = 0; index < 40; index += 1) {
    if (statusPayload.execution.latestExecutionSession?.status !== 'running') {
      break;
    }
    await delay(200);
    statusPayload = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/execution`);
  }

  const executionSession = statusPayload.execution.latestExecutionSession;
  assert.ok(executionSession);
  assert.equal(executionSession.status, 'completed');
  assert.equal(executionSession.verification.status, 'passed');
  assert.equal(statusPayload.execution.latestLease.status, 'used');

  const logs = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/execution/logs?executionId=${encodeURIComponent(executionSession.id)}`,
  );

  assert.match(logs.lines.join('\n'), /execution completed/);

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'ui-execution-console-contract-smoke',
        missionId: mission.id,
        approvalId: preflight.approval.id,
        executionSessionId: executionSession.id,
        port,
      },
      null,
      2,
    ),
  );
} finally {
  if (!serverProcess.killed) {
    serverProcess.kill('SIGTERM');
  }

  await waitForExit(serverProcess);
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(address.port);
      });
    });
  });
}

async function waitForServer(baseUrl, child, serverOutput) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`UI server exited early: ${child.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {}

    await delay(150);
  }

  throw new Error(`Timed out waiting for UI server. stdout=${serverOutput.stdout} stderr=${serverOutput.stderr}`);
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}\n${text}`);
  }
  return text;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}\n${JSON.stringify(payload)}`);
  }
  return payload;
}

async function waitForExit(child) {
  if (child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    child.once('exit', resolve);
  });
}
