import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runCommandWithHardTimeout } from './process-timeout-utils.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-process-timeout-'));

try {
  const successResult = runCommandWithHardTimeout(
    process.execPath,
    ['-e', 'console.log(JSON.stringify({ ok: true, mode: "success-fixture" }))'],
    {
      tempDir: tempRoot,
      timeoutMs: 5_000,
    },
  );

  assert.equal(successResult.status, 0);
  assert.equal(successResult.timedOut, false);
  assert.match(successResult.stdout, /success-fixture/);

  const timeoutResult = runCommandWithHardTimeout(
    process.execPath,
    ['-e', 'setTimeout(() => {}, 10_000)'],
    {
      tempDir: tempRoot,
      timeoutMs: 250,
    },
  );

  assert.equal(timeoutResult.timedOut, true);
  assert.notEqual(timeoutResult.status, 0);

  const detachedChildScript = `
const { spawn } = require('node:child_process');
const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 10000)'], {
  detached: false,
  stdio: 'ignore',
});
console.log(JSON.stringify({ childPid: child.pid }));
setTimeout(() => {}, 10000);
`;
  const nestedResult = runCommandWithHardTimeout(
    process.execPath,
    ['-e', detachedChildScript],
    {
      tempDir: tempRoot,
      timeoutMs: 500,
    },
  );

  assert.equal(nestedResult.timedOut, true);

  const nestedPayload = parseLastJsonObject(nestedResult.stdout);
  if (nestedPayload?.childPid) {
    const psResult = spawnSync('ps', ['-p', String(nestedPayload.childPid)], {
      encoding: 'utf8',
    });
    assert.equal(
      /node/.test(psResult.stdout || ''),
      false,
      `expected nested child ${nestedPayload.childPid} to be terminated, ps output: ${psResult.stdout}`,
    );
  }

  console.log(
    JSON.stringify(
      {
        mode: 'process-timeout-utils-smoke',
        nestedChildObserved: Boolean(nestedPayload?.childPid),
        ok: true,
      },
      null,
      2,
    ),
  );
} finally {
  fs.rmSync(tempRoot, { force: true, recursive: true });
}

function parseLastJsonObject(stdout) {
  const text = String(stdout || '').trim();
  if (!text) {
    return null;
  }

  for (let index = text.lastIndexOf('{'); index >= 0; index = text.lastIndexOf('{', index - 1)) {
    try {
      return JSON.parse(text.slice(index));
    } catch {
      // Keep scanning left in case earlier output precedes the JSON payload.
    }
  }

  return null;
}
