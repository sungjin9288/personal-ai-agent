import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-harness-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'ui-harness-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'prd',
    '--title',
    'Harness Browse Smoke',
    '--objective',
    'Validate the harness browse contract and served UI assets.',
  ],
});

const missionRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(missionRun.status, 'completed');

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ rootDir: tempRoot, store });

for (let index = 1; index <= 27; index += 1) {
  service.logDocument({
    type: 'devlog',
    title: `${mission.title} · Harness Browse Doc ${String(index).padStart(2, '0')}`,
    content: `Harness document browse smoke entry ${String(index).padStart(2, '0')}`,
  });
}

for (let index = 1; index <= 2; index += 1) {
  service.logDocument({
    type: 'reference',
    title: `${mission.title} · Harness Reference ${String(index).padStart(2, '0')}`,
    content: `Harness reference entry ${String(index).padStart(2, '0')}`,
  });
}

service.logDocument({
  type: 'incident',
  title: `${mission.title} · Harness Incident 01`,
  content: 'Harness incident record for smoke validation.',
});

for (let index = 1; index <= 12; index += 1) {
  service.addMemory({
    scope: 'mission',
    scopeId: mission.id,
    kind: 'fact',
    content: `Mission fact ${String(index).padStart(2, '0')} for harness smoke coverage`,
  });
}

for (let index = 1; index <= 18; index += 1) {
  service.addMemory({
    scope: 'workspace',
    scopeId: workspace.id,
    kind: 'decision',
    content: `Workspace decision ${String(index).padStart(2, '0')} for harness smoke coverage`,
  });
}

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
  await waitForServer(baseUrl, serverProcess);

  const rootHtml = await fetchText(baseUrl);
  const appJs = await fetchText(`${baseUrl}/app.js`);

  assert.equal(rootHtml.includes('data-detail-tab="harness"'), true);
  assert.equal(rootHtml.includes('data:image/svg+xml'), true);
  assert.equal(appJs.includes('renderHarnessFilterChips'), true);
  assert.equal(appJs.includes('refreshSelectedMissionContext'), true);
  assert.equal(appJs.includes('document-log-search'), true);
  assert.equal(appJs.includes('harness-memory-search'), true);

  const initialDocuments = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/documents?limit=12&offset=0&query=&sort=latest&type=all`,
  );
  assert.equal(initialDocuments.summary.filteredCount, 30);
  assert.equal(initialDocuments.summary.visibleCount, 12);
  assert.equal(initialDocuments.summary.hasPrev, false);
  assert.equal(initialDocuments.summary.hasNext, true);
  assert.equal(initialDocuments.summary.pageStart, 1);
  assert.equal(initialDocuments.summary.pageEnd, 12);

  const devlogPageOne = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/documents?limit=24&offset=0&query=&sort=title&type=devlog`,
  );
  assert.equal(devlogPageOne.summary.filteredCount, 27);
  assert.equal(devlogPageOne.summary.visibleCount, 24);
  assert.equal(devlogPageOne.summary.hasNext, true);
  assert.equal(devlogPageOne.summary.pageStart, 1);
  assert.equal(devlogPageOne.summary.pageEnd, 24);
  assert.equal(devlogPageOne.entries[0].title.includes('Harness Browse Doc 01'), true);
  assert.equal(devlogPageOne.entries.at(-1).title.includes('Harness Browse Doc 24'), true);

  const devlogPageTwo = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/documents?limit=24&offset=24&query=&sort=title&type=devlog`,
  );
  assert.equal(devlogPageTwo.summary.filteredCount, 27);
  assert.equal(devlogPageTwo.summary.visibleCount, 3);
  assert.equal(devlogPageTwo.summary.hasPrev, true);
  assert.equal(devlogPageTwo.summary.hasNext, false);
  assert.equal(devlogPageTwo.summary.pageStart, 25);
  assert.equal(devlogPageTwo.summary.pageEnd, 27);
  assert.equal(devlogPageTwo.entries[0].title.includes('Harness Browse Doc 25'), true);

  const searchedDocuments = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/documents?limit=12&offset=0&query=${encodeURIComponent('Harness Browse Doc 27')}&sort=title&type=devlog`,
  );
  assert.equal(searchedDocuments.summary.filteredCount, 1);
  assert.equal(searchedDocuments.summary.visibleCount, 1);
  assert.equal(searchedDocuments.entries[0].title.includes('Harness Browse Doc 27'), true);
  assert.equal(searchedDocuments.filters.query, 'Harness Browse Doc 27');
  assert.equal(searchedDocuments.filters.type, 'devlog');
  assert.equal(searchedDocuments.filters.limit, 12);

  const initialMemory = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/memory?scope=all&kind=all&query=&sort=latest&limit=12&offset=0`,
  );
  assert.equal(initialMemory.summary.total, 30);
  assert.equal(initialMemory.summary.visibleCount, 12);
  assert.equal(initialMemory.summary.hasPrev, false);
  assert.equal(initialMemory.summary.hasNext, true);

  const searchedMemory = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/memory?scope=workspace&kind=decision&query=${encodeURIComponent('Workspace decision 07')}&sort=latest&limit=12&offset=0`,
  );
  assert.equal(searchedMemory.summary.filteredTotal, 1);
  assert.equal(searchedMemory.summary.visibleCount, 1);
  assert.equal(searchedMemory.entries[0].content.includes('Workspace decision 07'), true);
  assert.equal(searchedMemory.filters.scope, 'workspace');
  assert.equal(searchedMemory.filters.kind, 'decision');
  assert.equal(searchedMemory.filters.query, 'Workspace decision 07');

  const largeMemoryPage = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(mission.id)}/harness/memory?scope=all&kind=all&query=&sort=latest&limit=24&offset=0`,
  );
  assert.equal(largeMemoryPage.summary.visibleCount, 24);
  assert.equal(largeMemoryPage.summary.hasPrev, false);
  assert.equal(largeMemoryPage.summary.hasNext, true);
  assert.equal(largeMemoryPage.summary.pageStart, 1);
  assert.equal(largeMemoryPage.summary.pageEnd, 24);

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'ui-harness-browse-contract-smoke',
        missionId: mission.id,
        port,
        documentsSeeded: 30,
        memorySeeded: 30,
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
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Failed to allocate a local port.'));
        return;
      }
      const { port: resolvedPort } = address;
      server.close(() => resolve(resolvedPort));
    });
    server.on('error', reject);
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return await response.json();
}

async function fetchText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return await response.text();
}

async function waitForServer(baseUrl, childProcess, { timeoutMs = 20_000 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess.exitCode !== null) {
      throw new Error(`UI server exited early: ${serverOutput.stdout}\n${serverOutput.stderr}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until timeout.
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for UI server at ${baseUrl}`);
}

async function waitForExit(childProcess, { timeoutMs = 5_000 } = {}) {
  if (childProcess.exitCode !== null) {
    return;
  }

  const startedAt = Date.now();
  while (childProcess.exitCode === null && Date.now() - startedAt < timeoutMs) {
    await delay(100);
  }

  if (childProcess.exitCode === null) {
    childProcess.kill('SIGKILL');
    const forcedStartedAt = Date.now();
    while (childProcess.exitCode === null && Date.now() - forcedStartedAt < 2_000) {
      await delay(100);
    }
  }
}
