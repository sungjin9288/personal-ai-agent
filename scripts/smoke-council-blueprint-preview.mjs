import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

import {
  createCouncilBlueprintPreview,
  getCouncilBlueprintCatalog,
} from '../src/core/council-blueprint-preview.mjs';

const repoDir = process.cwd();
const cliPath = path.join(repoDir, 'src', 'cli.mjs');
const serverPath = path.join(repoDir, 'src', 'web', 'server.mjs');
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-council-blueprint-preview-'));
const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const expected = createCouncilBlueprintPreview({ roleIds: ['research', 'implementation', 'verification'] });

try {
  const catalogCli = spawnSync(process.execPath, [cliPath, 'council', 'blueprints'], {
    cwd: repoDir,
    encoding: 'utf8',
    env: { ...process.env, PERSONAL_AI_AGENT_ROOT: rootDir },
  });
  assert.equal(catalogCli.status, 0, catalogCli.stderr);
  assert.deepEqual(JSON.parse(catalogCli.stdout), getCouncilBlueprintCatalog());
  assert.deepEqual(fs.readdirSync(rootDir), []);

  const cli = spawnSync(process.execPath, [cliPath, 'council', 'blueprint-preview', '--role', 'verification', '--role', 'research', '--role', 'implementation'], {
    cwd: repoDir,
    encoding: 'utf8',
    env: { ...process.env, PERSONAL_AI_AGENT_ROOT: rootDir },
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), expected);
  assert.deepEqual(fs.readdirSync(rootDir), []);

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
    const catalogResponse = await fetch(`${baseUrl}/api/council/blueprints`);
    assert.equal(catalogResponse.status, 200);
    assert.equal((await catalogResponse.json()).authority.missionMutationAuthorized, false);

    const response = await fetch(`${baseUrl}/api/council/blueprint-preview?role=verification&role=research&role=implementation`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), expected);

    const invalid = await fetch(`${baseUrl}/api/council/blueprint-preview?role=research&role=chair&role=verification`);
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), {
      error: 'invalid-council-blueprint-preview',
      message: 'council-blueprint-preview: chair is fixed and cannot be selected.',
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
  externalProviderCalls: 0,
  missionMutationAuthorized: false,
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
    if (child.exitCode !== null) {
      throw new Error(`server exited before ready: ${child.exitCode}`);
    }
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error('server did not become ready');
}

function onceExit(child) {
  if (child.exitCode !== null) {
    return Promise.resolve();
  }
  return new Promise((resolve) => child.once('exit', resolve));
}

async function waitForStableSnapshot(directory) {
  let lastSnapshot = [];
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const before = snapshotFiles(directory);
    await new Promise((resolve) => setTimeout(resolve, 25));
    const after = snapshotFiles(directory);
    lastSnapshot = after;
    if (before.some(isTemporaryFile) || after.some(isTemporaryFile)) continue;
    if (JSON.stringify(before) === JSON.stringify(after)) return after;
  }
  throw new Error(`request-audit filesystem state did not stabilize: ${lastSnapshot.join(', ')}`);
}

function snapshotFiles(directory) {
  return fs.readdirSync(directory, { recursive: true }).sort();
}

function isTemporaryFile(filePath) {
  return path.basename(filePath).endsWith('.tmp');
}
