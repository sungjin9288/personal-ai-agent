import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { getDocumentConversionCapabilities } from '../src/core/document-conversion-service.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-document-conversion-diagnostics-'));
const converterPath = path.join(tempRoot, 'fake-markitdown.mjs');
const missingConverterPath = path.join(tempRoot, 'missing-markitdown');

fs.writeFileSync(
  converterPath,
  [
    '#!/bin/sh',
    'printf "%s\\n" "fake MarkItDown help probe: $*"',
    '',
  ].join('\n'),
  'utf8',
);
fs.chmodSync(converterPath, 0o755);

const cliDiagnostics = runCli({
  rootDir: tempRoot,
  args: ['converter', 'diagnostics'],
  env: {
    PERSONAL_AI_AGENT_MARKITDOWN_BIN: converterPath,
  },
});

assert.equal(cliDiagnostics.available, true);
assert.equal(cliDiagnostics.configured, true);
assert.equal(cliDiagnostics.converter.command, converterPath);
assert.equal(cliDiagnostics.converter.source, 'env');
assert.equal(cliDiagnostics.converter.probe.ok, true);
assert.equal(cliDiagnostics.disabledReason, '');
assert.equal(cliDiagnostics.security.localFilesOnly, true);
assert.equal(cliDiagnostics.security.urlConversionEnabled, false);
assert.equal(cliDiagnostics.security.ocrEnabled, false);
assert.equal(cliDiagnostics.supportedExtensions.nativeText.includes('.md'), true);
assert.equal(cliDiagnostics.supportedExtensions.markitdown.includes('.pdf'), true);
assert.equal(cliDiagnostics.supportedExtensions.unsupportedPolicy, 'reject');

const directDiagnostics = await getDocumentConversionCapabilities({
  converterCommand: converterPath,
  env: {},
});

assert.equal(directDiagnostics.available, true);
assert.equal(directDiagnostics.configured, true);
assert.equal(directDiagnostics.converter.source, 'option');

const missingDiagnostics = runCli({
  rootDir: tempRoot,
  args: ['converter', 'diagnostics', '--converter', missingConverterPath],
});

assert.equal(missingDiagnostics.available, false);
assert.equal(missingDiagnostics.configured, true);
assert.equal(missingDiagnostics.disabledReason, 'converter-not-found');
assert.equal(missingDiagnostics.converter.probe.ok, false);

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const serverOutput = { stderr: '', stdout: '' };
const serverProcess = spawn(process.execPath, [serverEntry], {
  cwd: repoDir,
  env: {
    ...process.env,
    PERSONAL_AI_AGENT_MARKITDOWN_BIN: converterPath,
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
  const apiResponse = await fetch(`${baseUrl}/api/converter/diagnostics`);
  assert.equal(apiResponse.status, 200);

  const apiDiagnostics = await apiResponse.json();
  assert.equal(apiDiagnostics.available, true);
  assert.equal(apiDiagnostics.converter.command, converterPath);
  assert.equal(apiDiagnostics.security.networkFetchEnabled, false);
  assert.equal(apiDiagnostics.supportedExtensions.markitdown.includes('.pptx'), true);

  console.log(
    JSON.stringify(
      {
        apiAvailable: apiDiagnostics.available,
        cliAvailable: cliDiagnostics.available,
        mode: 'document-conversion-diagnostics',
        ok: true,
      },
      null,
      2,
    ),
  );
} finally {
  serverProcess.kill('SIGTERM');
}

async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

async function waitForServer(baseUrl, serverProcess) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5000) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Server exited early.\nSTDOUT:\n${serverOutput.stdout}\nSTDERR:\n${serverOutput.stderr}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the local server writes its listener.
    }

    await delay(50);
  }

  throw new Error(`Timed out waiting for server.\nSTDOUT:\n${serverOutput.stdout}\nSTDERR:\n${serverOutput.stderr}`);
}
