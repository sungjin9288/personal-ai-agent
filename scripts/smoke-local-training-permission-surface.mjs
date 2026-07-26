import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';
import {
  buildLocalTrainingPermissionCliArgs,
  buildLocalTrainingReadinessFixture,
} from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-training-permission-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const readinessPackage = buildLocalTrainingReadinessFixture({ repoDir });
const readinessPath = path.join(tempRoot, 'readiness.json');
fs.writeFileSync(readinessPath, `${JSON.stringify(readinessPackage, null, 2)}\n`, 'utf8');

const workspace = runCli({
  args: ['workspace', 'add', workspacePath, '--name', 'local-training-permission-workspace'],
  rootDir: tempRoot,
});
const mission = runCli({
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'decision-memo',
    '--title',
    'Local training permission review',
    '--objective',
    'Review bounded local model training permission without executing training.',
  ],
  rootDir: tempRoot,
});
const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const request = runCli({
  args: buildLocalTrainingPermissionCliArgs({
    expiresAt,
    missionId: mission.id,
    readinessPath,
  }),
  rootDir: tempRoot,
});

assert.equal(request.approval.kind, 'local_training_execution');
assert.equal(request.approval.status, 'pending');
assert.equal(request.localExecutionAuthorized, false);
assert.equal(request.actualModelTrainingExecuted, false);
assert.equal(request.productionReadyClaim, false);
assert.equal(JSON.stringify(request).includes('Prepare reviewed instruction'), false);

const pending = runCli({
  args: ['action', 'inbox', '--mission', mission.id, '--class', 'awaiting-human-decision'],
  rootDir: tempRoot,
});
assert.equal(pending.items.length, 1);
assert.equal(pending.items[0].kind, 'local_training_execution');
assert.equal(pending.items[0].approvalId, request.approval.id);

const store = createStore({ rootDir: tempRoot });
assert.equal(JSON.stringify(store.loadState()).includes('Prepare reviewed instruction'), false);
const storedReadinessPath = path.join(
  store.getSessionDir(mission.id, request.session.id),
  request.readinessFileName,
);
assert.deepEqual(
  JSON.parse(fs.readFileSync(storedReadinessPath, 'utf8')),
  readinessPackage,
);
assert.equal(
  store
    .listArtifactsBySession(request.session.id)
    .some((artifact) => artifact.kind === 'local-training-readiness-private'),
  false,
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

  const operatorResolve = await fetchJson(
    `${baseUrl}/api/approvals/${encodeURIComponent(request.approval.id)}/resolve`,
    {
      body: JSON.stringify({
        decision: 'approve',
        reason: 'Operator role must not approve local model training.',
      }),
      headers: {
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'operator',
      },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(operatorResolve.status, 403);
  assert.equal(operatorResolve.body.rbac.requiredRole, 'approver');

  const approved = await fetchJson(
    `${baseUrl}/api/approvals/${encodeURIComponent(request.approval.id)}/resolve`,
    {
      body: JSON.stringify({
        decision: 'approve',
        reason: 'Reviewed bounded local execution evidence.',
      }),
      headers: {
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'approver',
      },
      method: 'POST',
    },
  );
  assert.equal(approved.permission.status, 'approved');
  assert.equal(approved.executionApproval.executionKind, 'local-model-training');
  assert.equal(approved.actualModelTrainingExecuted, false);
  assert.equal(approved.productionReadyClaim, false);

  const current = await fetchJson(
    `${baseUrl}/api/approvals/${encodeURIComponent(request.approval.id)}/local-training`,
  );
  assert.equal(current.localExecutionAuthorized, true);
  assert.equal(current.permission.evidence.egress.control, 'os-level-egress-isolation');
  assert.equal(current.permission.evidence.resource.enforcement, 'caller-owned');

  const operatorRevoke = await fetchJson(
    `${baseUrl}/api/approvals/${encodeURIComponent(request.approval.id)}/local-training/revoke`,
    {
      body: JSON.stringify({ reason: 'Operator role must not revoke approval.' }),
      headers: {
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'operator',
      },
      method: 'POST',
    },
    { expectOk: false },
  );
  assert.equal(operatorRevoke.status, 403);
  assert.equal(operatorRevoke.body.rbac.requiredRole, 'approver');

  const revoked = await fetchJson(
    `${baseUrl}/api/approvals/${encodeURIComponent(request.approval.id)}/local-training/revoke`,
    {
      body: JSON.stringify({ reason: 'Resource owner withdrew the approved envelope.' }),
      headers: {
        'content-type': 'application/json',
        'x-personal-ai-agent-role': 'approver',
      },
      method: 'POST',
    },
  );
  assert.equal(revoked.revocation.status, 'revoked');
  assert.equal(revoked.localExecutionAuthorized, false);
  assert.equal(revoked.actualModelTrainingExecuted, false);

  const cliRead = runCli({
    args: ['approval', 'show-local-training', request.approval.id],
    rootDir: tempRoot,
  });
  assert.equal(cliRead.revocation.status, 'revoked');
  assert.equal(cliRead.localExecutionAuthorized, false);
} finally {
  serverProcess.kill('SIGTERM');
  await waitForExit(serverProcess);
}

const gatewayEvents = createStore({ rootDir: tempRoot })
  .listGatewayEvents({ missionId: mission.id })
  .filter((event) => event.eventType.startsWith('local-training-permission-'));
assert.deepEqual(
  gatewayEvents.map((event) => event.eventType),
  [
    'local-training-permission-request',
    'local-training-permission-approved',
    'local-training-permission-revoked',
  ],
);
assert.deepEqual(
  gatewayEvents.map((event) => event.permissionPolicy.decision),
  ['approval-required', 'allow', 'deny'],
);

console.log(
  JSON.stringify(
    {
      actualModelTrainingExecuted: false,
      approvalKind: request.approval.kind,
      costFree: true,
      eventCount: gatewayEvents.length,
      externalProviderCalls: 'none',
      mode: 'local-training-permission-surface',
      ok: true,
      productionReadyClaim: false,
      rbac: {
        approve: 'approver',
        revoke: 'approver',
      },
      status: 'revoked',
    },
    null,
    2,
  ),
);

fs.rmSync(tempRoot, { force: true, recursive: true });

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const freePort = typeof address === 'object' && address ? address.port : null;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(freePort);
      });
    });
  });
}

async function waitForServer(baseUrl, processHandle, output) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Server exited early. stdout=${output.stdout} stderr=${output.stderr}`);
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // The local listener may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for server. stdout=${output.stdout} stderr=${output.stderr}`);
}

async function fetchJson(url, options = {}, { expectOk = true } = {}) {
  const response = await fetch(url, options);
  const body = await response.json();
  if (expectOk && !response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
  }
  return expectOk ? body : { body, status: response.status };
}

async function waitForExit(processHandle) {
  if (processHandle.exitCode !== null) {
    return;
  }
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      processHandle.kill('SIGKILL');
    }, 2_000);
    processHandle.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}
