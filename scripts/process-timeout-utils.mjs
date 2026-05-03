import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function runCommandWithHardTimeout(command, args, {
  cwd = process.cwd(),
  env = process.env,
  tempDir = os.tmpdir(),
  timeoutMs,
} = {}) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`timeoutMs must be a positive number, received ${timeoutMs}`);
  }

  const commandId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const payloadPath = path.join(tempDir, `process-${commandId}.payload.json`);
  const stdoutPath = path.join(tempDir, `process-${commandId}.stdout`);
  const stderrPath = path.join(tempDir, `process-${commandId}.stderr`);
  const helperPayload = {
    args,
    command,
    cwd,
    stderrPath,
    stdoutPath,
    timeoutMs,
  };
  const helperScript = `
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const payload = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
const stdoutFd = fs.openSync(payload.stdoutPath, 'w');
const stderrFd = fs.openSync(payload.stderrPath, 'w');
const child = spawn(payload.command, payload.args, {
  cwd: payload.cwd,
  detached: true,
  env: process.env,
  stdio: ['ignore', stdoutFd, stderrFd],
});
let settled = false;
let timedOut = false;

function closeFiles() {
  try { fs.closeSync(stdoutFd); } catch {}
  try { fs.closeSync(stderrFd); } catch {}
}

function finish(result) {
  if (settled) {
    return;
  }
  settled = true;
  clearTimeout(timer);
  closeFiles();
  process.stdout.write(JSON.stringify(result));
}

const timer = setTimeout(() => {
  timedOut = true;
  try { process.kill(-child.pid, 'SIGKILL'); } catch {}
  try { child.kill('SIGKILL'); } catch {}
}, payload.timeoutMs);

child.on('error', (error) => {
  finish({ error: String(error && error.message ? error.message : error), status: 1, timedOut });
});

child.on('exit', (status, signal) => {
  finish({ signal, status, timedOut });
});
`;

  fs.mkdirSync(tempDir, { recursive: true });
  fs.writeFileSync(payloadPath, JSON.stringify(helperPayload));
  const helperResult = spawnSync(process.execPath, ['-e', helperScript, payloadPath], {
    cwd,
    encoding: 'utf8',
    env,
    maxBuffer: 1024 * 1024,
    timeout: timeoutMs + 5_000,
  });

  const stdout = fs.existsSync(stdoutPath) ? fs.readFileSync(stdoutPath, 'utf8') : '';
  const stderr = fs.existsSync(stderrPath) ? fs.readFileSync(stderrPath, 'utf8') : '';
  fs.rmSync(payloadPath, { force: true });
  fs.rmSync(stdoutPath, { force: true });
  fs.rmSync(stderrPath, { force: true });

  if (helperResult.error?.code === 'ETIMEDOUT') {
    return {
      error: '',
      signal: '',
      status: 1,
      stderr,
      stdout,
      timedOut: true,
    };
  }
  if (helperResult.status !== 0) {
    const helperError = [
      'process helper failed',
      `status=${helperResult.status}`,
      `signal=${helperResult.signal || ''}`,
      helperResult.stderr ? `stderr=${helperResult.stderr}` : '',
      helperResult.error?.message ? `error=${helperResult.error.message}` : '',
    ].filter(Boolean).join(' ');
    return {
      error: helperError,
      signal: '',
      status: helperResult.status,
      stderr,
      stdout,
      timedOut: false,
    };
  }

  let metadata = {};
  try {
    metadata = JSON.parse(String(helperResult.stdout || '{}'));
  } catch (error) {
    return {
      error: `failed to parse process helper metadata: ${error.message}`,
      signal: '',
      status: 1,
      stderr,
      stdout,
      timedOut: false,
    };
  }

  return {
    error: metadata.error || '',
    signal: metadata.signal || '',
    status: metadata.status ?? 1,
    stderr,
    stdout,
    timedOut: Boolean(metadata.timedOut),
  };
}
