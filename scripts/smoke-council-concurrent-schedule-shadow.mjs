import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { createCouncilConcurrentScheduleShadow } from '../src/core/council-concurrent-schedule-shadow.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const serverPath = path.join(repoDir, 'src', 'web', 'server.mjs');
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-concurrent-schedule-shadow-'));
const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const completionEvents = [
  ['opening:verification', 'attempt:opening:verification:1', 'completed'],
  ['opening:research', 'attempt:opening:research:1', 'completed'],
  ['opening:implementation', 'attempt:opening:implementation:1', 'completed'],
];
const expected = createCouncilConcurrentScheduleShadow({
  completionEvents: completionEvents.map(([stageId, attemptId, outcome]) => ({ attemptId, outcome, stageId })),
  roleIds: ['research', 'implementation', 'verification'],
});

try {
  for (let round = 0; round < 5; round += 1) {
    const cli = spawnSync(process.execPath, [
      cliPath,
      'council',
      'concurrent-schedule-shadow',
      '--role', 'verification', '--role', 'research', '--role', 'implementation',
      ...completionEvents.flatMap(([stageId, attemptId, outcome]) => ['--completion-event', `${stageId}|${attemptId}|${outcome}`]),
    ], {
      cwd: repoDir,
      encoding: 'utf8',
      env: { ...process.env, PERSONAL_AI_AGENT_ROOT: rootDir },
    });
    assert.equal(cli.status, 0, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout), expected);
    assert.deepEqual(await waitForStableSnapshot(rootDir), []);
  }

  const valueLessCli = spawnSync(process.execPath, [cliPath, 'council', 'concurrent-schedule-shadow', '--completion-event'], {
    cwd: repoDir,
    encoding: 'utf8',
    env: { ...process.env, PERSONAL_AI_AGENT_ROOT: rootDir },
  });
  assert.equal(valueLessCli.status, 1);
  assert.deepEqual(JSON.parse(valueLessCli.stdout), {
    error: 'invalid-council-blueprint-preview',
    message: 'council-concurrent-schedule-shadow: completion events must use stageId|attemptId|outcome.',
  });

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
    const beforeRead = await waitForStableSnapshot(rootDir);
    const params = new URLSearchParams();
    ['verification', 'research', 'implementation'].forEach((roleId) => params.append('role', roleId));
    completionEvents.forEach(([stageId, attemptId, outcome]) => params.append('completionEvent', `${stageId}|${attemptId}|${outcome}`));
    for (let round = 0; round < 5; round += 1) {
      const response = await fetch(`${baseUrl}/api/council/concurrent-schedule-shadow?${params.toString()}`);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), expected);
      assert.deepEqual(await waitForStableSnapshot(rootDir), beforeRead);
    }

    const invalid = await fetch(`${baseUrl}/api/council/concurrent-schedule-shadow?role=research&role=implementation&role=verification&completionEvent=opening%3Aresearch%7Cattempt%3Aopening%3Aresearch%3A2%7Ccompleted`);
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), {
      error: 'invalid-council-blueprint-preview',
      message: 'council-concurrent-schedule-shadow: stale attemptId for opening:research.',
    });
    assert.deepEqual(await waitForStableSnapshot(rootDir), beforeRead);

    const emptyEvent = await fetch(`${baseUrl}/api/council/concurrent-schedule-shadow?role=research&role=implementation&role=verification&completionEvent=`);
    assert.equal(emptyEvent.status, 400);
    assert.deepEqual(await emptyEvent.json(), {
      error: 'invalid-council-blueprint-preview',
      message: 'council-concurrent-schedule-shadow: completion events must use stageId|attemptId|outcome.',
    });
    assert.deepEqual(await waitForStableSnapshot(rootDir), beforeRead);
  } finally {
    server.kill('SIGTERM');
    await onceExit(server);
  }
} finally {
  fs.rmSync(rootDir, { force: true, recursive: true });
}

console.log(JSON.stringify({
  cliApiParity: true,
  commandCreatedNoFiles: true,
  actualConcurrentDispatch: false,
  externalProviderCalls: 0,
  repeatedSmokeRuns: 5,
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

function onceExit(child) {
  return child.exitCode !== null ? Promise.resolve() : new Promise((resolve) => child.once('exit', resolve));
}

async function waitForStableSnapshot(directory) {
  let lastSnapshot = [];
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const before = snapshotFiles(directory);
    await new Promise((resolve) => setTimeout(resolve, 25));
    const after = snapshotFiles(directory);
    lastSnapshot = after;
    if (before.some((entry) => path.basename(entry).includes('.tmp')) || after.some((entry) => path.basename(entry).includes('.tmp'))) continue;
    if (JSON.stringify(before) === JSON.stringify(after)) return after;
  }
  throw new Error(`request-audit filesystem state did not stabilize: ${lastSnapshot.join(', ')}`);
}

function snapshotFiles(directory) {
  return fs.readdirSync(directory, { recursive: true }).sort();
}
