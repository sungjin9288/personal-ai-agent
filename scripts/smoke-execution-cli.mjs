import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-execution-cli-'));

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', repoDir, '--name', 'execution-cli-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Execution CLI Smoke',
    '--objective',
    'Verify CLI preflight, approval lease, execution status, and execution logs.',
  ],
});

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(runResult.status, 'reviewed');

const preflight = runCli({
  rootDir: tempRoot,
  args: ['mission', 'execution', 'preflight', mission.id, '--request-approval'],
});

assert.equal(preflight.execution.supported, true);
assert.equal(preflight.execution.eligibility, 'pending-approval');
assert.equal(preflight.approval.kind, 'execution_lease');

const approval = runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    preflight.approval.id,
    '--decision',
    'approve',
    '--reason',
    'Execution CLI smoke approves one bounded execution session.',
  ],
});

assert.equal(approval.approval.status, 'approved');
assert.equal(approval.lease.status, 'active');

const startResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'execution', 'start', mission.id],
});

assert.equal(startResult.execution.status, 'running');

let statusResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'execution', 'status', mission.id],
});

for (let index = 0; index < 40; index += 1) {
  if (statusResult.execution.latestExecutionSession?.status !== 'running') {
    break;
  }
  await delay(200);
  statusResult = runCli({
    rootDir: tempRoot,
    args: ['mission', 'execution', 'status', mission.id],
  });
}

const executionSession = statusResult.execution.latestExecutionSession;
assert.ok(executionSession);
assert.equal(executionSession.status, 'completed');
assert.equal(statusResult.execution.latestLease.status, 'used');
assert.equal(statusResult.mission.status, 'completed');

const logs = runCli({
  rootDir: tempRoot,
  args: ['mission', 'execution', 'logs', mission.id, '--execution', executionSession.id],
});

assert.equal(Array.isArray(logs.lines), true);
assert.match(logs.lines.join('\n'), /execution completed/);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'execution-cli',
      missionId: mission.id,
      approvalId: preflight.approval.id,
      executionSessionId: executionSession.id,
      verificationStatus: executionSession.verification.status,
    },
    null,
    2,
  ),
);
