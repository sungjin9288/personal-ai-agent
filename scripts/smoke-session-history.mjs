import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-session-history-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'session-history-workspace'],
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
    'Inspect session history',
    '--objective',
    'Verify that multiple runs are inspectable as session history.',
  ],
});

const firstRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(firstRun.status, 'awaiting_approval');

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    firstRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Reject the first proposal so a second session is created.',
  ],
});

const secondRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(secondRun.status, 'awaiting_approval');

const sessions = runCli({
  rootDir: tempRoot,
  args: ['session', 'list', mission.id],
});

assert.equal(sessions.length, 2);
assert.equal(sessions[0].status, 'failed');
assert.equal(sessions[1].status, 'awaiting_approval');
assert.equal(sessions[0].approvalCount, 1);
assert.equal(sessions[1].approvalCount, 1);
assert.equal(sessions[0].agentRunCount, 4);
assert.equal(sessions[1].agentRunCount, 4);

const firstSessionDetail = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id, '--session', sessions[0].id],
});

const latestSessionDetail = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id],
});

assert.equal(firstSessionDetail.session.id, sessions[0].id);
assert.equal(firstSessionDetail.summary.status, 'failed');
assert.equal(latestSessionDetail.session.id, sessions[1].id);
assert.equal(latestSessionDetail.summary.status, 'awaiting_approval');
assert.match(
  fs.readFileSync(latestSessionDetail.artifacts.find((artifact) => artifact.fileName === 'planner-plan.md').path, 'utf8'),
  /Reject the first proposal so a second session is created\./,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'session-history',
      missionId: mission.id,
      sessionIds: sessions.map((session) => session.id),
    },
    null,
    2,
  ),
);
