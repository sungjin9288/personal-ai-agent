import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const repoDir = process.cwd();
const serverEntry = path.join(repoDir, 'src', 'web', 'server.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-ui-doctor-'));
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
  await waitForServer(baseUrl, serverProcess, serverOutput);

  const rootHtml = await fetchText(baseUrl);
  const appJs = await fetchText(`${baseUrl}/app.js`);
  const doctor = await fetchJson(`${baseUrl}/api/doctor`);
  const serializedDoctor = JSON.stringify(doctor);

  assert.equal(rootHtml.includes('id="doctor-summary"'), true);
  assert.equal(rootHtml.includes('로컬 진단'), true);
  assert.equal(appJs.includes("api('/api/doctor')"), true);
  assert.equal(appJs.includes('renderDoctorSummary'), true);
  assert.equal(appJs.includes('renderDoctorDetailPanel'), true);
  assert.equal(appJs.includes('wireDoctorSummaryActions'), true);
  assert.equal(appJs.includes('buildDoctorDiagnosticsSummary'), true);
  assert.equal(appJs.includes('copyDoctorDiagnosticsSummary'), true);
  assert.equal(appJs.includes('loadDoctor'), true);
  assert.equal(appJs.includes('doctorLoading'), true);
  assert.equal(appJs.includes('data-doctor-copy-summary="true"'), true);
  assert.equal(appJs.includes('data-doctor-refresh="true"'), true);
  assert.equal(appJs.includes('data-doctor-detail-toggle="true"'), true);
  assert.equal(appJs.includes('id="doctor-detail-panel"'), true);
  assert.equal(appJs.includes('Provider env'), true);
  assert.equal(appJs.includes('Boundary: missing environment variable names only; secret values are not included.'), true);
  assert.equal(appJs.includes('갱신 ${escapeHtml(formatDate(generatedAt))}'), true);
  assert.equal(appJs.includes('새로고침 중'), true);

  assert.equal(doctor.mode, 'doctor');
  assert.equal(doctor.ok, true, JSON.stringify(doctor.checks, null, 2));
  assert.equal(doctor.summary.fail, 0);
  assert.equal(doctor.checks.some((check) => check.id === 'script:doctor' && check.status === 'pass'), true);
  assert.equal(doctor.checks.some((check) => check.id === 'script:smoke:doctor' && check.status === 'pass'), true);
  assert.equal(doctor.providers.some((provider) => provider.id === 'stub' && provider.configured), true);
  assert.equal(
    doctor.providers.some((provider) => provider.id === 'openai' && provider.missingEnv.includes('OPENAI_API_KEY')),
    true,
  );

  assert.doesNotMatch(serializedDoctor, /sk-[A-Za-z0-9_-]{10,}/);
  assert.doesNotMatch(serializedDoctor, /\/Users\//);
  assert.doesNotMatch(serializedDoctor, /\/private\/var\/folders\//);
  assert.doesNotMatch(serializedDoctor, /\/var\/folders\//);

  console.log(
    JSON.stringify(
      {
        mode: 'ui-doctor-surface-smoke',
        ok: true,
        checkCount: doctor.summary.total,
        warningCount: doctor.summary.warn,
        port,
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
      throw new Error(`UI server exited early: ${child.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl);
      if (response.ok) {
        return;
      }
    } catch {}

    await delay(150);
  }

  throw new Error(`Timed out waiting for UI server. stdout=${output.stdout} stderr=${output.stderr}`);
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}\n${text}`);
  }
  return text;
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}\n${JSON.stringify(payload)}`);
  }
  return payload;
}

async function waitForExit(child) {
  if (child.exitCode !== null) {
    return;
  }

  await new Promise((resolve) => {
    child.once('exit', resolve);
  });
}
