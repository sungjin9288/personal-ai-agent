import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-approval-inbox-'));
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

const pendingMissionOne = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Pending inbox one',
    '--objective',
    'Create a pending approval in workspace one.',
  ],
});

const pendingRunOne = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', pendingMissionOne.id],
});

const rejectedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Rejected inbox item',
    '--objective',
    'Create and reject an approval in workspace one.',
  ],
});

const rejectedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', rejectedMission.id],
});

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    rejectedRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Rejected approvals must not remain in inbox.',
  ],
});

const pendingMissionTwo = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'engineering',
    '--title',
    'Pending inbox two',
    '--objective',
    'Create a pending approval in workspace two.',
  ],
});

const pendingRunTwo = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', pendingMissionTwo.id],
});

const inbox = runCli({
  rootDir: tempRoot,
  args: ['approval', 'inbox'],
});

assert.equal(inbox.summary.pendingCount, 2);
assert.equal(inbox.items.length, 2);
assert.equal(inbox.items.every((item) => item.sessionStatus === 'awaiting_approval'), true);
assert.equal(inbox.items.some((item) => item.approvalId === rejectedRun.approvalId), false);
assert.equal(inbox.items.some((item) => item.approvalId === pendingRunOne.approvalId), true);
assert.equal(inbox.items.some((item) => item.approvalId === pendingRunTwo.approvalId), true);
assert.equal(inbox.items.every((item) => item.resolveCommand.includes('approval resolve')), true);
assert.equal(inbox.summary.workspaceCounts[workspaceOne.id], 1);
assert.equal(inbox.summary.workspaceCounts[workspaceTwo.id], 1);

const workspaceFilteredInbox = runCli({
  rootDir: tempRoot,
  args: ['approval', 'inbox', '--workspace', workspaceOne.id],
});

assert.equal(workspaceFilteredInbox.summary.pendingCount, 1);
assert.equal(workspaceFilteredInbox.items[0].workspaceId, workspaceOne.id);
assert.equal(workspaceFilteredInbox.items[0].missionTitle, 'Pending inbox one');

console.log(
  JSON.stringify(
    {
      ok: true,
      inboxCount: inbox.items.length,
      mode: 'approval-inbox',
      workspaceIds: Object.keys(inbox.summary.workspaceCounts),
    },
    null,
    2,
  ),
);
