import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-escalated-inbox-'));
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
    'Escalated approval action',
    '--objective',
    'Create an overdue approval that becomes an open escalation.',
  ],
});

const approvalRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', approvalMission.id],
});

const blockedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'engineering',
    '--title',
    'Escalated blocked action',
    '--objective',
    'Create an overdue blocked follow-up escalation.',
  ],
});

const blockedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', blockedMission.id],
});

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    blockedRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Blocked and requires escalation tracking.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === approvalRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  if (approval.id === blockedRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
      resolvedAt: overdueTimestamp,
    };
  }

  return approval;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const firstLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue'],
});

assert.equal(firstLog.logged, true);
assert.equal(firstLog.count, 2);
assert.equal(firstLog.escalationIds.length, 2);

const openInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated'],
});

assert.equal(openInbox.filters.status, 'open');
assert.equal(openInbox.filters.tier, null);
assert.equal(openInbox.summary.total, 2);
assert.equal(openInbox.summary.pendingEscalationCount, 2);
assert.equal(openInbox.summary.tierCounts.critical, 2);
assert.equal(openInbox.items.every((item) => item.escalationTier === 'critical'), true);

const secondLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue'],
});

assert.equal(secondLog.logged, true);
assert.equal(secondLog.count, 2);
assert.deepEqual(
  [...secondLog.escalationIds].sort(),
  [...firstLog.escalationIds].sort(),
);

const dedupedOpenInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated'],
});

assert.equal(dedupedOpenInbox.summary.total, 2);
assert.equal(dedupedOpenInbox.items.length, 2);

const approverOpenInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--owner', 'human-approver'],
});

assert.equal(approverOpenInbox.summary.total, 1);
assert.equal(approverOpenInbox.items[0].recommendedOwner, 'human-approver');
assert.equal(approverOpenInbox.items[0].escalationTier, 'critical');

const criticalInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--tier', 'critical'],
});

assert.equal(criticalInbox.filters.tier, 'critical');
assert.equal(criticalInbox.summary.total, 2);
assert.equal(criticalInbox.items.every((item) => item.escalationTier === 'critical'), true);

const escalationToResolve = dedupedOpenInbox.items.find((item) => item.actionType === 'approval');
assert.ok(escalationToResolve);

const resolvedEscalation = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-escalation',
    escalationToResolve.id,
    '--note',
    'Approval handled through manual follow-up.',
  ],
});

assert.equal(resolvedEscalation.status, 'resolved');
assert.equal(resolvedEscalation.resolutionNote, 'Approval handled through manual follow-up.');

const remainingOpenInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated'],
});

assert.equal(remainingOpenInbox.summary.total, 1);
assert.equal(remainingOpenInbox.items[0].actionType, 'blocked-follow-up');

const resolvedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--status', 'resolved', '--tier', 'resolved'],
});

assert.equal(resolvedInbox.filters.status, 'resolved');
assert.equal(resolvedInbox.filters.tier, 'resolved');
assert.equal(resolvedInbox.summary.total, 1);
assert.equal(resolvedInbox.items[0].id, escalationToResolve.id);
assert.equal(resolvedInbox.items[0].resolutionNote, 'Approval handled through manual follow-up.');
assert.equal(resolvedInbox.items[0].escalationTier, 'resolved');

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'escalated-inbox',
      openCount: remainingOpenInbox.summary.total,
      resolvedCount: resolvedInbox.summary.total,
    },
    null,
    2,
  ),
);
