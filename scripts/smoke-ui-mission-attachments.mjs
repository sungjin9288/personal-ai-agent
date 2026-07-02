import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-mission-attachments-'));
const workspacePath = path.join(tempRoot, 'workspace');
const converterPath = path.join(tempRoot, 'fake-markitdown.mjs');

fs.mkdirSync(workspacePath, { recursive: true });
fs.writeFileSync(
  converterPath,
  [
    '#!/usr/bin/env node',
    "const filePath = process.argv.at(-1);",
    "console.log(`# UI Converted Packet\\n\\nConverted from ${filePath.split('/').pop()} with upload conversion evidence.`);",
    '',
  ].join('\n'),
  'utf8',
);
fs.chmodSync(converterPath, 0o755);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'ui-mission-attachments-workspace'],
});

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = { stderr: '', stdout: '' };

const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_ROOT: tempRoot,
    PERSONAL_AI_AGENT_MARKITDOWN_BIN: converterPath,
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

  assert.equal(rootHtml.includes('id="mission-attachment-input"'), true);
  assert.equal(appJs.includes('mission-harness-attachment-form'), true);
  assert.equal(appJs.includes('handleMissionAttachmentUpload'), true);
  assert.equal(appJs.includes('contentBase64'), true);
  assert.equal(appJs.includes('missionAttachmentUploadLabel'), true);
  assert.equal(appJs.includes('첨부 업로드: ${selectedMissionLabel}'), true);
  assert.equal(appJs.includes('renderMissionAttachmentUploadButton'), true);
  assert.equal(appJs.includes('actionLabel: missionAttachmentUploadLabel'), true);

  const createMissionResponse = await fetchJson(`${baseUrl}/api/missions`, {
    body: JSON.stringify({
      attachments: [
        {
          content: '# Attached Brief\n- Review the uploaded brief before planning.\n- Keep the summary grounded in the attached notes.',
          fileName: 'brief.md',
          mimeType: 'text/markdown',
          source: 'ui-create',
        },
      ],
      deliverableType: 'decision-memo',
      mode: 'knowledge',
      objective: 'Validate mission attachment intake over the public mission API.',
      title: 'UI mission attachment smoke',
      workspaceId: workspace.id,
    }),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  const missionId = createMissionResponse.mission.id;
  assert.ok(missionId);

  const missionAfterCreate = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(missionId)}`);
  assert.equal(missionAfterCreate.harness.attachments.summary.total, 1);
  assert.equal(missionAfterCreate.summary.attachmentCounts.total, 1);
  assert.equal(missionAfterCreate.harness.attachments.recentEntries[0].fileName, 'brief.md');

  const createConvertedMissionResponse = await fetchJson(`${baseUrl}/api/missions`, {
    body: JSON.stringify({
      attachments: [
        {
          contentBase64: Buffer.from('%PDF pseudo composer upload fixture\n', 'utf8').toString('base64'),
          contentEncoding: 'base64',
          fileName: 'composer-packet.pdf',
          mimeType: 'application/pdf',
          source: 'ui',
        },
      ],
      deliverableType: 'decision-memo',
      mode: 'knowledge',
      objective: 'Validate converted document intake during public mission creation.',
      title: 'UI converted mission attachment smoke',
      workspaceId: workspace.id,
    }),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  const convertedMissionAfterCreate = await fetchJson(
    `${baseUrl}/api/missions/${encodeURIComponent(createConvertedMissionResponse.mission.id)}`,
  );
  assert.equal(convertedMissionAfterCreate.harness.attachments.summary.total, 1);
  assert.equal(convertedMissionAfterCreate.harness.attachments.recentEntries[0].fileName, 'composer-packet.pdf');
  assert.equal(convertedMissionAfterCreate.harness.attachments.recentEntries[0].source, 'ui-converted');
  assert.equal(convertedMissionAfterCreate.harness.attachments.recentEntries[0].mimeType, 'text/markdown');
  assert.match(convertedMissionAfterCreate.harness.attachments.recentEntries[0].excerpt, /UI Converted Packet/);

  const uploadResponse = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(missionId)}/attachments`, {
    body: JSON.stringify({
      attachments: [
        {
          content: 'operator-log\nlatest triage outcome: attachment routing is stable.',
          fileName: 'operator.log',
          mimeType: 'text/plain',
          source: 'ui-upload',
        },
      ],
    }),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  assert.equal(uploadResponse.attachments.length, 1);
  assert.equal(uploadResponse.attachments[0].fileName, 'operator.log');

  const convertedUploadResponse = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(missionId)}/attachments`, {
    body: JSON.stringify({
      attachments: [
        {
          contentBase64: Buffer.from('%PDF pseudo browser upload fixture\n', 'utf8').toString('base64'),
          contentEncoding: 'base64',
          fileName: 'ui-packet.pdf',
          mimeType: 'application/pdf',
          source: 'ui',
        },
      ],
    }),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
  });

  assert.equal(convertedUploadResponse.attachments.length, 1);
  assert.equal(convertedUploadResponse.attachments[0].fileName, 'ui-packet.pdf');
  assert.equal(convertedUploadResponse.attachments[0].source, 'ui-converted');
  assert.equal(convertedUploadResponse.attachments[0].mimeType, 'text/markdown');
  assert.equal(convertedUploadResponse.attachments[0].conversion?.converted, true);
  assert.equal(convertedUploadResponse.attachments[0].conversion?.converter, path.basename(converterPath));
  assert.match(convertedUploadResponse.attachments[0].excerpt, /UI Converted Packet/);

  const missionAfterUpload = await fetchJson(`${baseUrl}/api/missions/${encodeURIComponent(missionId)}`);
  assert.equal(missionAfterUpload.harness.attachments.summary.total, 3);
  assert.equal(missionAfterUpload.summary.attachmentCounts.total, 3);
  assert.equal(
    missionAfterUpload.harness.attachments.recentEntries.some((entry) => entry.fileName === 'brief.md'),
    true,
  );
  assert.equal(
    missionAfterUpload.harness.attachments.recentEntries.some((entry) => entry.fileName === 'operator.log'),
    true,
  );
  assert.equal(
    missionAfterUpload.harness.attachments.recentEntries.some((entry) => entry.fileName === 'ui-packet.pdf'),
    true,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: 'ui-mission-attachments-contract-smoke',
        missionId,
        port,
        attachmentCount: missionAfterUpload.harness.attachments.summary.total,
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

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}\n${await response.text()}`);
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
      // continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for UI server.\n${serverOutput.stdout}\n${serverOutput.stderr}`);
}

async function waitForExit(childProcess) {
  if (childProcess.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    childProcess.once('exit', () => resolve());
    setTimeout(() => {
      if (childProcess.exitCode === null) {
        childProcess.kill('SIGKILL');
      }
      resolve();
    }, 5_000);
  });
}
