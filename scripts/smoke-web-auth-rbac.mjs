import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { evaluateWebAuth } from '../src/core/web-auth-policy.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-web-auth-rbac-'));
const authToken = 'test-web-auth-token-123';

assert.equal(evaluateWebAuth({ mode: 'off' }).allowed, true);
assert.equal(evaluateWebAuth({ mode: 'enforce', configuredToken: '' }).error, 'auth-not-configured');
assert.equal(evaluateWebAuth({ mode: 'enforce', configuredToken: authToken }).error, 'auth-token-required');
assert.equal(
  evaluateWebAuth({
    authorizationHeader: 'Bearer wrong-token',
    configuredToken: authToken,
    mode: 'enforce',
  }).error,
  'auth-token-invalid',
);
assert.equal(
  evaluateWebAuth({
    authorizationHeader: `Bearer ${authToken}`,
    configuredToken: authToken,
    mode: 'enforce',
  }).authenticated,
  true,
);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'web-auth-rbac-workspace'],
});

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = { stderr: '', stdout: '' };

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_RBAC_MODE: 'enforce',
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
    PERSONAL_AI_AGENT_UI_PORT: String(port),
    PERSONAL_AI_AGENT_WEB_AUTH_MODE: 'enforce',
    PERSONAL_AI_AGENT_WEB_AUTH_TOKEN: authToken,
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

  const unauthenticatedHealth = await fetchJson(`${baseUrl}/api/health`, {}, { expectOk: false });
  assert.equal(unauthenticatedHealth.status, 401);
  assert.equal(unauthenticatedHealth.body.error, 'auth-token-required');

  const invalidHealth = await fetchJson(
    `${baseUrl}/api/health`,
    { headers: { authorization: 'Bearer wrong-token' } },
    { expectOk: false },
  );
  assert.equal(invalidHealth.status, 401);
  assert.equal(invalidHealth.body.error, 'auth-token-invalid');

  const authenticatedHealth = await fetchJson(`${baseUrl}/api/health`, {
    headers: { authorization: `Bearer ${authToken}` },
  });
  assert.equal(authenticatedHealth.ok, true);

  const meta = await fetchJson(`${baseUrl}/api/meta`, {
    headers: { 'x-personal-ai-agent-auth-token': authToken },
  });
  assert.equal(meta.webAuth.mode, 'enforce');
  assert.equal(meta.webAuth.required, true);
  assert.equal(JSON.stringify(meta).includes(authToken), false);

  const authenticatedViewerMutation = await fetchJson(
    `${baseUrl}/api/missions`,
    {
      body: JSON.stringify({
        mode: 'knowledge',
        objective: 'authenticated viewer should still be blocked by RBAC.',
        title: 'Authenticated viewer blocked mission',
        workspaceId: workspace.id,
      }),
      headers: {
        authorization: `Bearer ${authToken}`,
        'content-type': 'application/json',
      },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(authenticatedViewerMutation.status, 403);
  assert.equal(authenticatedViewerMutation.body.error, 'rbac-forbidden');
  assert.equal(authenticatedViewerMutation.body.rbac.requiredRole, 'operator');

  const operatorMission = await fetchJson(`${baseUrl}/api/missions`, {
    body: JSON.stringify({
      mode: 'knowledge',
      objective: 'authenticated operator can create a mission under auth plus RBAC.',
      title: 'Authenticated operator mission',
      workspaceId: workspace.id,
    }),
    headers: {
      'content-type': 'application/json',
      'x-personal-ai-agent-auth-token': authToken,
      'x-personal-ai-agent-role': 'operator',
    },
    method: 'POST',
  });
  assert.equal(operatorMission.mission.status, 'created');

  console.log(
    JSON.stringify(
      {
        authMode: 'enforce',
        mode: 'web-auth-rbac',
        ok: true,
        port,
        roleChecks: {
          authenticatedOperatorMissionCreated: true,
          authenticatedViewerMutationBlocked: true,
          invalidTokenBlocked: true,
          missingTokenBlocked: true,
        },
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
  fs.rmSync(tempRoot, { recursive: true, force: true });
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

async function waitForServer(baseUrl, child, output) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`UI server exited early: ${child.exitCode}\n${output.stderr || output.stdout}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        headers: { authorization: `Bearer ${authToken}` },
      });
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the server starts listening.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`UI server did not start on ${baseUrl}\n${output.stderr || output.stdout}`);
}

async function fetchJson(url, init = {}, { expectOk = true } = {}) {
  const response = await fetch(url, init);
  const body = await response.json();
  if (expectOk && !response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}: ${JSON.stringify(body)}`);
  }
  if (!expectOk) {
    return {
      body,
      status: response.status,
    };
  }
  return body;
}

async function waitForExit(child) {
  if (child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    child.once('exit', resolve);
    setTimeout(resolve, 1000);
  });
}
