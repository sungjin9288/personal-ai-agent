import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-action-inbox-'));
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

const approvalMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Pending approval action',
    '--objective',
    'Leave one pending approval in the action inbox.',
  ],
});

const approvalRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', approvalMission.id],
});

const reviewerMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Reviewer follow-up action',
    '--objective',
    'Trigger a reviewer failure that should require follow-up.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const reviewerRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', reviewerMission.id],
});

assert.equal(reviewerRun.status, 'failed');

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
    'Rejected approval should not remain open',
    '--objective',
    'Prove resolved approvals do not stay in the action inbox.',
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
    'Resolved approvals must leave the action inbox.',
  ],
});

const inbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox'],
});

assert.equal(inbox.summary.pendingActionCount, 3);
assert.equal(inbox.summary.actionCounts.total, 3);
assert.equal(inbox.summary.actionCounts.approval, 1);
assert.equal(inbox.summary.actionCounts.blockedFollowUp, 1);
assert.equal(inbox.summary.actionCounts.reviewerFollowUp, 1);
assert.equal(inbox.summary.actionClassCounts.total, 3);
assert.equal(inbox.summary.actionClassCounts.awaitingHumanDecision, 1);
assert.equal(inbox.summary.actionClassCounts.blocked, 1);
assert.equal(inbox.summary.actionClassCounts.retryReady, 1);
assert.equal(inbox.summary.workspaceCounts[workspaceOne.id], 2);
assert.equal(inbox.summary.workspaceCounts[workspaceTwo.id], 1);

const approvalItem = inbox.items.find((item) => item.actionType === 'approval');
assert.ok(approvalItem);
assert.equal(approvalItem.approvalId, approvalRun.approvalId);
assert.equal(approvalItem.actionClass, 'awaiting-human-decision');
assert.match(approvalItem.commandHint, /approval resolve/);

const reviewerItem = inbox.items.find((item) => item.actionType === 'reviewer-follow-up');
assert.ok(reviewerItem);
assert.equal(reviewerItem.missionId, reviewerMission.id);
assert.equal(reviewerItem.actionClass, 'retry-ready');
assert.equal(reviewerItem.sessionStatus, 'failed');
assert.equal(reviewerItem.reportPath.endsWith('reviewer-report.md'), true);
assert.equal(reviewerItem.findings.some((finding) => finding.includes('Checklist section does not contain checkbox items')), true);
assert.match(reviewerItem.commandHint, /mission run/);

const blockedItem = inbox.items.find((item) => item.actionType === 'blocked-follow-up');
assert.ok(blockedItem);
assert.equal(blockedItem.actionClass, 'blocked');
assert.equal(blockedItem.sourceApprovalId, rejectedRun.approvalId);
assert.equal(blockedItem.workspaceId, workspaceOne.id);
assert.match(blockedItem.commandHint, /mission show/);
assert.match(blockedItem.nextStepHint, /narrower follow-up mission/i);

const workspaceFilteredInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--workspace', workspaceTwo.id],
});

assert.equal(workspaceFilteredInbox.summary.pendingActionCount, 1);
assert.equal(workspaceFilteredInbox.items[0].actionType, 'reviewer-follow-up');
assert.equal(workspaceFilteredInbox.items[0].workspaceId, workspaceTwo.id);

const retryReadyInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'retry-ready'],
});

assert.equal(retryReadyInbox.summary.pendingActionCount, 1);
assert.equal(retryReadyInbox.items[0].actionType, 'reviewer-follow-up');

const blockedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'blocked'],
});

assert.equal(blockedInbox.summary.pendingActionCount, 1);
assert.equal(blockedInbox.items[0].actionType, 'blocked-follow-up');

console.log(
  JSON.stringify(
    {
      ok: true,
      actionCount: inbox.items.length,
      actionClasses: inbox.items.map((item) => item.actionClass),
      actionTypes: inbox.items.map((item) => item.actionType),
      mode: 'action-inbox',
    },
    null,
    2,
  ),
);
