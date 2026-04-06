import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-escalation-owner-handoff-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'owner-handoff-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Escalation owner handoff',
    '--objective',
    'Acknowledge a pending owner handoff after owner chain escalation.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(runResult.status, 'failed');

const openFollowUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'reviewer-followups', '--mission', mission.id],
});

const resolution = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-reviewer-follow-up',
    openFollowUps.items[0].actionId,
    '--kind',
    'accepted-risk',
    '--note',
    'Escalation should require owner handoff acknowledgement.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const initialState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
initialState.escalations = initialState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      createdAt: '2026-03-01T00:00:00.000Z',
      dueAt: '2026-03-02T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(initialState, null, 2)}\n`, 'utf8');

runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

runCli({
  rootDir: tempRoot,
  args: ['action', 'remind-escalations', '--workspace', workspace.id, '--due'],
});

const reminderAgedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
reminderAgedState.escalations = reminderAgedState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      lastReminderAt: '2026-04-05T00:00:00.000Z',
      updatedAt: '2026-04-05T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(reminderAgedState, null, 2)}\n`, 'utf8');

runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

const afterSyncState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
afterSyncState.escalations = afterSyncState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    const ownerHistory = Array.isArray(escalation.ownerHistory) ? escalation.ownerHistory : [];
    return {
      ...escalation,
      currentEffectiveOwner: 'human-approver',
      lastOwnerEscalatedAt: '2026-04-05T00:00:00.000Z',
      ownerHistory: ownerHistory.map((entry, index) =>
        index === ownerHistory.length - 1 && entry.to === 'human-approver'
          ? {
              ...entry,
              at: '2026-04-05T00:00:00.000Z',
            }
          : entry,
      ),
      updatedAt: '2026-04-05T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(afterSyncState, null, 2)}\n`, 'utf8');

const pendingHandoffs = runCli({
  rootDir: tempRoot,
  args: ['action', 'owner-handoffs', '--workspace', workspace.id],
});

assert.equal(pendingHandoffs.filters.status, 'pending');
assert.equal(pendingHandoffs.filters.overdueOnly, false);
assert.equal(pendingHandoffs.items.length, 1);
assert.equal(pendingHandoffs.items[0].targetOwner, 'human-approver');
assert.equal(pendingHandoffs.items[0].handoffSlaHours, 12);
assert.equal(pendingHandoffs.items[0].handoffIsOverdue, true);
assert.ok(pendingHandoffs.items[0].handoffDueAt);
assert.match(pendingHandoffs.items[0].ownerTransitionDetail, /workspace-owner -> human-approver/);
assert.equal(pendingHandoffs.summary.overdueCount, 1);
assert.ok(pendingHandoffs.summary.nextDueAt);
assert.equal(pendingHandoffs.summary.pendingCount, 1);

const overduePendingHandoffs = runCli({
  rootDir: tempRoot,
  args: ['action', 'owner-handoffs', '--workspace', workspace.id, '--overdue'],
});

assert.equal(overduePendingHandoffs.items.length, 1);

const missionBeforeAck = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', mission.id],
});

assert.equal(missionBeforeAck.summary.escalationPendingOwnerHandoffCount, 1);
assert.equal(missionBeforeAck.summary.escalationPendingOwnerHandoffOverdueCount, 1);
assert.ok(missionBeforeAck.summary.escalationNextPendingOwnerHandoffDueAt);

const workspaceBeforeAck = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(workspaceBeforeAck.summary.escalationPendingOwnerHandoffCount, 1);
assert.equal(workspaceBeforeAck.summary.escalationPendingOwnerHandoffOverdueCount, 1);
assert.ok(workspaceBeforeAck.summary.escalationNextPendingOwnerHandoffDueAt);

const acknowledged = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'acknowledge-owner-handoff',
    resolution.escalation.id,
    '--note',
    'Human approver acknowledged the escalated ownership.',
  ],
});

assert.equal(acknowledged.pendingOwnerHandoff, false);
assert.equal(acknowledged.ownerHandoffCount, 1);
assert.ok(acknowledged.latestOwnerHandoffAt);

const pendingAfterAck = runCli({
  rootDir: tempRoot,
  args: ['action', 'owner-handoffs', '--workspace', workspace.id],
});

assert.equal(pendingAfterAck.items.length, 0);
assert.equal(pendingAfterAck.summary.pendingCount, 0);

const acknowledgedQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'owner-handoffs', '--workspace', workspace.id, '--status', 'acknowledged'],
});

assert.equal(acknowledgedQueue.items.length, 1);
assert.equal(acknowledgedQueue.items[0].targetOwner, 'human-approver');
assert.equal(acknowledgedQueue.items[0].handoffIsOverdue, true);
assert.match(acknowledgedQueue.items[0].lastHandoffNote, /acknowledged the escalated ownership/i);

const overdueAcknowledgedQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'owner-handoffs', '--workspace', workspace.id, '--status', 'acknowledged', '--overdue'],
});

assert.equal(overdueAcknowledgedQueue.items.length, 1);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(
  missionTimeline.timeline.some(
    (event) =>
      event.kind === 'escalation-owner-handoff-acknowledged' &&
      event.escalationId === resolution.escalation.id &&
      /human-approver acknowledged owner handoff/i.test(event.detail) &&
      /\[overdue\]/i.test(event.detail),
  ),
  true,
);
assert.equal(missionTimeline.summary.escalationPendingOwnerHandoffCount, 0);
assert.equal(missionTimeline.summary.escalationPendingOwnerHandoffOverdueCount, 0);
assert.equal(missionTimeline.summary.escalationOwnerHandoffCountTotal, 1);
assert.equal(missionTimeline.summary.escalationNextPendingOwnerHandoffDueAt, null);
assert.ok(missionTimeline.summary.escalationLatestOwnerHandoffAt);

const workspaceAfterAck = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(workspaceAfterAck.summary.escalationPendingOwnerHandoffCount, 0);
assert.equal(workspaceAfterAck.summary.escalationPendingOwnerHandoffOverdueCount, 0);
assert.equal(workspaceAfterAck.summary.escalationNextPendingOwnerHandoffDueAt, null);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.escalationPendingOwnerHandoffCount, 0);
assert.equal(globalOverview.summary.escalationPendingOwnerHandoffOverdueCount, 0);
assert.equal(globalOverview.summary.escalationOwnerHandoffCountTotal, 1);
assert.equal(globalOverview.summary.escalationNextPendingOwnerHandoffDueAt, null);
assert.ok(globalOverview.summary.escalationLatestOwnerHandoffAt);

console.log(
  JSON.stringify(
    {
      ok: true,
      escalationId: resolution.escalation.id,
      mode: 'escalation-owner-handoff',
      ownerHandoffCount: acknowledged.ownerHandoffCount,
    },
    null,
    2,
  ),
);
