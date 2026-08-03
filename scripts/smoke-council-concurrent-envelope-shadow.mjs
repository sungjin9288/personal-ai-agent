import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import { createCouncilConcurrentEnvelopeShadow } from '../src/core/council-concurrent-envelope-shadow.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const serverPath = path.join(repoDir, 'src', 'web', 'server.mjs');
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-concurrent-envelope-shadow-'));
const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const roleArgs = ['--role', 'verification', '--role', 'research', '--role', 'implementation'];
const expected = createCouncilConcurrentEnvelopeShadow({ roleIds: ['research', 'implementation', 'verification'] });

try {
  for (let round = 0; round < 3; round += 1) {
    const cli = spawnSync(process.execPath, [cliPath, 'council', 'concurrent-envelope-shadow', ...roleArgs], {
      cwd: repoDir,
      encoding: 'utf8',
      env: { ...process.env, PERSONAL_AI_AGENT_ROOT: rootDir },
    });
    assert.equal(cli.status, 0, cli.stderr);
    assert.deepEqual(JSON.parse(cli.stdout), expected);
    assert.deepEqual(await waitForStableSnapshot(rootDir), {});
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
    const beforeRead = await waitForStableSnapshot(rootDir);
    const response = await fetch(`${baseUrl}/api/council/concurrent-envelope-shadow?role=verification&role=research&role=implementation`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);
    const afterEnvelope = await waitForStableSnapshot(rootDir);
    assertOnlyRequestAuditChanged(beforeRead, afterEnvelope);
    assertAuditContains(rootDir, '/api/council/concurrent-envelope-shadow');

    const outside = await fetch(`${baseUrl}/api/council/concurrent-envelope-shadow?role=research&role=product&role=architecture&role=implementation`);
    assert.equal(outside.status, 200);
    assert.deepEqual((await outside.json()).safetyEnvelope.failureCodes, ['parallelism-envelope-exceeded', 'resource-envelope-exceeded']);
    const afterOutside = await waitForStableSnapshot(rootDir);
    assertOnlyRequestAuditChanged(afterEnvelope, afterOutside);
    assertAuditContains(rootDir, '/api/council/concurrent-envelope-shadow');
  } finally {
    server.kill('SIGTERM');
    await onceExit(server);
  }
} finally {
  fs.rmSync(rootDir, { force: true, recursive: true });
}

console.log(JSON.stringify({
  actualMeasurements: false,
  cliApiParity: true,
  apiDomainStoreMutations: 0,
  cliCreatedNoFiles: true,
  externalProviderCalls: 0,
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

function onceExit(child) {
  return child.exitCode !== null ? Promise.resolve() : new Promise((resolve) => child.once('exit', resolve));
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
    if (
      relativePath.startsWith(`var${path.sep}runtime-requests.json.`) &&
      relativePath.endsWith('.tmp')
    ) {
      continue;
    }
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

function assertAuditContains(rootDir, requestPath) {
  const audit = JSON.parse(fs.readFileSync(path.join(rootDir, 'var', 'runtime-requests.json'), 'utf8'));
  assert.deepEqual(audit.active, []);
  assert.equal(audit.terminal.some((entry) => entry.method === 'GET' && entry.path === requestPath && entry.statusCode === 200), true);
}
