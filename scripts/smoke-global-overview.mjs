import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-global-overview-'));
const workspaceOnePath = path.join(tempRoot, 'workspace-one');
const workspaceTwoPath = path.join(tempRoot, 'workspace-two');

fs.mkdirSync(workspaceOnePath, { recursive: true });
fs.mkdirSync(workspaceTwoPath, { recursive: true });

const workspaceOne = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspaceOnePath, '--name', 'workspace-one'],
});

const workspaceTwo = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspaceTwoPath, '--name', 'workspace-two'],
});

const completedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'decision-memo',
    '--title',
    'Completed mission',
    '--objective',
    'Produce one completed mission in workspace one.',
  ],
});

runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', completedMission.id],
});

const pendingMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Pending approval mission',
    '--objective',
    'Leave one pending approval in workspace one.',
  ],
});

const pendingRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', pendingMission.id],
});

const failedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'engineering',
    '--title',
    'Failed mission',
    '--objective',
    'Reject one mission in workspace two.',
  ],
});

const failedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', failedMission.id],
});

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    failedRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Reject one mission so the global overview contains a failed path.',
  ],
});

const overview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(overview.summary.workspaceCount, 2);
assert.equal(overview.summary.missionCount, 3);
assert.equal(overview.summary.sessionCount, 3);
assert.equal(overview.summary.missionCounts.completed, 1);
assert.equal(overview.summary.missionCounts.awaiting_approval, 1);
assert.equal(overview.summary.missionCounts.failed, 1);
assert.equal(overview.summary.approvalCounts.pending, 1);
assert.equal(overview.summary.approvalCounts.rejected, 1);
assert.equal(overview.summary.approvalCounts.total, 2);
assert.equal(overview.summary.inboxCount, 1);
assert.equal(overview.summary.activeWorkspaceIds.includes(workspaceOne.id), true);
assert.equal(overview.summary.activeWorkspaceIds.includes(workspaceTwo.id), false);
assert.equal(overview.inbox.length, 1);
assert.equal(overview.inbox[0].approvalId, pendingRun.approvalId);
assert.equal(overview.inbox[0].workspaceId, workspaceOne.id);
assert.equal(overview.workspaces.length, 2);
assert.equal(
  overview.workspaces.some((entry) => entry.workspace.id === workspaceOne.id && entry.summary.missionCounts.awaiting_approval === 1),
  true,
);
assert.equal(
  overview.workspaces.some((entry) => entry.workspace.id === workspaceTwo.id && entry.summary.missionCounts.failed === 1),
  true,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      inboxCount: overview.inbox.length,
      mode: 'global-overview',
      workspaceIds: overview.workspaces.map((entry) => entry.workspace.id),
    },
    null,
    2,
  ),
);
