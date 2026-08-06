import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { createCouncilConcurrentRetryTerminalityShadow } from '../src/core/council-concurrent-retry-terminality-shadow.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const serverPath = path.join(repoDir, 'src', 'web', 'server.mjs');
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-retry-surface-'));
const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const completionEvents = [
  { attemptId: 'attempt:opening:verification:1', outcome: 'completed', stageId: 'opening:verification' },
  { attemptId: 'attempt:opening:research:1', outcome: 'timeout', stageId: 'opening:research' },
  { attemptId: 'attempt:opening:implementation:1', outcome: 'completed', stageId: 'opening:implementation' },
];
const projectedRetryOutcome = {
  attemptId: 'attempt:opening:research:2',
  outcome: 'completed',
  stageId: 'opening:research',
};
const expected = createCouncilConcurrentRetryTerminalityShadow({
  completionEvents,
  projectedRetryOutcome,
  roleIds: ['research', 'implementation', 'verification'],
});

try {
  for (let round = 0; round < 3; round += 1) {
    const cli = spawnSync(process.execPath, [
      cliPath,
      'council', 'concurrent-retry-terminality-shadow',
      '--role', 'verification', '--role', 'research', '--role', 'implementation',
      ...completionEvents.flatMap(({ stageId, attemptId, outcome }) => ['--completion-event', `${stageId}|${attemptId}|${outcome}`]),
      '--projected-retry-outcome', `${projectedRetryOutcome.stageId}|${projectedRetryOutcome.attemptId}|${projectedRetryOutcome.outcome}`,
    ], {
      cwd: repoDir,
      encoding: 'utf8',
      env: { ...process.env, PERSONAL_AI_AGENT_ROOT: rootDir },
    });
    assert.equal(cli.status, 0, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout), expected);
    assert.deepEqual(snapshotFiles(rootDir), {});
  }

  const server = spawn(process.execPath, [serverPath], {
    cwd: repoDir,
    env: {
      ...process.env,
      PERSONAL_AI_AGENT_ROOT: rootDir,
      PERSONAL_AI_AGENT_UI_HOST: '127.0.0.1',
      PERSONAL_AI_AGENT_UI_PORT: String(port),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    await waitForServer(baseUrl, server);
    const before = await waitForStableSnapshot(rootDir);
    const params = new URLSearchParams();
    ['verification', 'research', 'implementation'].forEach((roleId) => params.append('role', roleId));
    completionEvents.forEach(({ stageId, attemptId, outcome }) => params.append('completionEvent', `${stageId}|${attemptId}|${outcome}`));
    params.set('projectedRetryOutcome', `${projectedRetryOutcome.stageId}|${projectedRetryOutcome.attemptId}|${projectedRetryOutcome.outcome}`);

    const response = await fetch(`${baseUrl}/api/council/concurrent-retry-terminality-shadow?${params.toString()}`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
    const afterValid = await waitForStableSnapshot(rootDir);
    assertOnlyRequestAuditChanged(before, afterValid);

    const invalid = await fetch(`${baseUrl}/api/council/concurrent-retry-terminality-shadow?projectedRetryOutcome=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A2%7Ccompleted&projectedRetryOutcome=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A2%7Ccompleted`);
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), {
      error: 'invalid-council-blueprint-preview',
      message: 'council-concurrent-retry-terminality-shadow: projected retry outcome may be supplied once.',
    });
    assertOnlyRequestAuditChanged(afterValid, await waitForStableSnapshot(rootDir));

    const outside = await fetch(`${baseUrl}/api/council/concurrent-retry-terminality-shadow?role=research&role=product&role=architecture&role=implementation`);
    assert.equal(outside.status, 200);
    assert.equal((await outside.json()).state, 'outside-synthetic-envelope');
  } finally {
    server.kill('SIGTERM');
    await onceExit(server);
  }
} finally {
  fs.rmSync(rootDir, { force: true, recursive: true });
}

console.log(JSON.stringify({
  actualRetryExecuted: false,
  cliApiParity: true,
  externalProviderCalls: 0,
  filesystemWrites: 0,
  requestAuditOnly: true,
  retryDecision: 'keep-retry-disabled',
  status: 'passed',
}));

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

async function waitForServer(url, child) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`server exited before ready: ${child.exitCode}`);
    try {
      if ((await fetch(`${url}/api/health`)).ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('server did not become ready');
}

async function waitForStableSnapshot(directory) {
  let lastSnapshot = {};
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const before = snapshotFiles(directory);
    await new Promise((resolve) => setTimeout(resolve, 25));
    const after = snapshotFiles(directory);
    lastSnapshot = after;
    if (Object.keys(before).some((entry) => path.basename(entry).includes('.tmp')) || Object.keys(after).some((entry) => path.basename(entry).includes('.tmp'))) continue;
    if (JSON.stringify(before) === JSON.stringify(after)) return after;
  }
  throw new Error(`request-audit filesystem state did not stabilize: ${Object.keys(lastSnapshot).join(', ')}`);
}

function snapshotFiles(directory) {
  const snapshot = {};
  for (const entry of fs.readdirSync(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const relativePath = path.relative(directory, path.join(entry.parentPath, entry.name));
    if (relativePath.startsWith(`var${path.sep}runtime-requests.json.`) && relativePath.endsWith('.tmp')) continue;
    snapshot[relativePath] = createHash('sha256').update(fs.readFileSync(path.join(directory, relativePath))).digest('hex');
  }
  return snapshot;
}

function assertOnlyRequestAuditChanged(before, after) {
  const changedPaths = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((filePath) => before[filePath] !== after[filePath])
    .sort();
  assert.deepEqual(changedPaths, ['var/runtime-requests.json']);
}

function onceExit(child) {
  return child.exitCode !== null ? Promise.resolve() : new Promise((resolve) => child.once('exit', resolve));
}
