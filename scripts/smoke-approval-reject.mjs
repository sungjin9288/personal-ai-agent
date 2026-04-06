import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-approval-reject-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'approval-reject-workspace'],
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
    'Reject risky execution proposal',
    '--objective',
    'Verify that approval rejection ends the mission cleanly.',
  ],
});

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(runResult.status, 'awaiting_approval');
assert.ok(runResult.approvalId);

const resolution = runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    runResult.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Do not proceed with workspace execution before narrowing the proposal.',
  ],
});

assert.equal(resolution.mission.status, 'failed');
assert.equal(resolution.approval.status, 'rejected');
assert.ok(fs.existsSync(resolution.artifactPath));
assert.match(fs.readFileSync(resolution.artifactPath, 'utf8'), /decision: reject/);

const session = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id],
});

assert.equal(session.session.status, 'failed');
assert.equal(session.approvals.length, 1);
assert.equal(session.approvals[0].decision, 'reject');
assert.equal(session.approvals[0].status, 'rejected');

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'approval-reject',
      missionId: mission.id,
      approvalId: runResult.approvalId,
    },
    null,
    2,
  ),
);
