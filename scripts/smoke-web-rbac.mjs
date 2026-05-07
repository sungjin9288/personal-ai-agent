import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { evaluateApiRbac } from '../src/core/rbac-policy.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-web-rbac-'));

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'web-rbac-workspace'],
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
    'Web RBAC Smoke',
    '--objective',
    'Verify optional web API RBAC enforcement for mutating routes.',
  ],
});

runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(evaluateApiRbac({ method: 'GET', mode: 'enforce', pathname: '/api/health', role: 'viewer' }).allowed, true);
assert.equal(
  evaluateApiRbac({ method: 'POST', mode: 'enforce', pathname: '/api/missions', role: 'viewer' }).allowed,
  false,
);
assert.equal(
  evaluateApiRbac({ method: 'POST', mode: 'enforce', pathname: '/api/approvals/approval_x/resolve', role: 'operator' })
    .requiredRole,
  'approver',
);
assert.equal(
  evaluateApiRbac({ method: 'POST', mode: 'enforce', pathname: '/api/execution-v1/snapshot', role: 'operator' })
    .requiredRole,
  'admin',
);

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

  const health = await fetchJson(`${baseUrl}/api/health`);
  assert.equal(health.ok, true);

  const viewerCreateMission = await fetchJson(
    `${baseUrl}/api/missions`,
    {
      body: JSON.stringify({
        mode: 'knowledge',
        objective: 'viewer should not create this mission',
        title: 'Viewer blocked mission',
        workspaceId: workspace.id,
      }),
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(viewerCreateMission.status, 403);
  assert.equal(viewerCreateMission.body.error, 'rbac-forbidden');
  assert.equal(viewerCreateMission.body.rbac.requiredRole, 'operator');

  const operatorMission = await fetchJson(`${baseUrl}/api/missions`, {
    body: JSON.stringify({
      mode: 'knowledge',
      objective: 'operator can create a mission under enforced RBAC.',
      title: 'Operator RBAC mission',
      workspaceId: workspace.id,
    }),
    headers: {
      'content-type': 'application/json',
      'x-personal-ai-agent-role': 'operator',
    },
    method: 'POST',
  });
  assert.equal(operatorMission.mission.status, 'created');

  const operatorSnapshot = await fetchJson(
    `${baseUrl}/api/execution-v1/snapshot`,
    {
      body: JSON.stringify({ confirmSnapshotFreeze: true }),
      headers: {
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'operator',
      },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(operatorSnapshot.status, 403);
  assert.equal(operatorSnapshot.body.rbac.requiredRole, 'admin');

  const executionPreflight = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/execution/preflight`, {
    body: JSON.stringify({ requestApproval: true }),
    headers: {
      'content-type': 'application/json',
      'x-personal-ai-agent-role': 'operator',
    },
    method: 'POST',
  });
  assert.equal(executionPreflight.approval.kind, 'execution_lease');

  const operatorApprovalResolve = await fetchJson(
    `${baseUrl}/api/approvals/${encodeURIComponent(executionPreflight.approval.id)}/resolve`,
    {
      body: JSON.stringify({
        decision: 'approve',
        reason: 'operator should not be allowed to approve execution leases under enforced RBAC.',
      }),
      headers: {
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'operator',
      },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(operatorApprovalResolve.status, 403);
  assert.equal(operatorApprovalResolve.body.rbac.requiredRole, 'approver');

  const approverApprovalResolve = await fetchJson(
    `${baseUrl}/api/approvals/${encodeURIComponent(executionPreflight.approval.id)}/resolve`,
    {
      body: JSON.stringify({
        decision: 'approve',
        reason: 'approver can approve one bounded execution lease under enforced RBAC.',
      }),
      headers: {
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'approver',
      },
      method: 'POST',
    },
  );
  assert.equal(approverApprovalResolve.approval.status, 'approved');

  const viewerRollback = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/execution/rollback`,
    {
      body: JSON.stringify({ dryRun: true }),
      headers: {
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'viewer',
      },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(viewerRollback.status, 403);
  assert.equal(viewerRollback.body.rbac.requiredRole, 'operator');

  console.log(
    JSON.stringify(
      {
        mode: 'web-rbac',
        ok: true,
        port,
        roleChecks: {
          adminOnlySnapshotBlockedForOperator: true,
          approverResolvedApproval: true,
          executionRollbackBlockedForViewer: true,
          operatorMissionCreated: true,
          viewerMutationBlocked: true,
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
      const response = await fetch(`${baseUrl}/api/health`);
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
