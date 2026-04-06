import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-owner-handoff-reminders-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'owner-handoff-reminder-workspace'],
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
    'Owner handoff reminder policy',
    '--objective',
    'Issue reminder events for overdue pending owner handoffs.',
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
    'Escalate accepted risk until the new owner explicitly acknowledges it.',
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

const ownerAgedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
ownerAgedState.escalations = ownerAgedState.escalations.map((escalation) => {
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
fs.writeFileSync(statePath, `${JSON.stringify(ownerAgedState, null, 2)}\n`, 'utf8');

const handoffsNeedingReminder = runCli({
  rootDir: tempRoot,
  args: ['action', 'owner-handoffs', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(handoffsNeedingReminder.items.length, 1);
assert.equal(handoffsNeedingReminder.items[0].handoffNeedsReminder, true);
assert.equal(handoffsNeedingReminder.items[0].handoffReminderCount, 0);
assert.equal(handoffsNeedingReminder.items[0].handoffReminderCadenceHours, 6);
assert.ok(handoffsNeedingReminder.items[0].handoffNextReminderAt);
assert.equal(handoffsNeedingReminder.summary.needsReminderCount, 1);

const actionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'handoff-required'],
});

assert.equal(actionInbox.items.length, 1);
assert.equal(actionInbox.items[0].handoffNeedsReminder, true);
assert.equal(actionInbox.items[0].handoffReminderCount, 0);

const reminderResult = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'remind-owner-handoffs',
    '--workspace',
    workspace.id,
    '--due',
    '--note',
    'Follow up with the human approver about the pending handoff.',
  ],
});

assert.equal(reminderResult.filters.dueOnly, true);
assert.equal(reminderResult.items.length, 1);
assert.equal(reminderResult.items[0].ownerHandoffReminderCount, 1);
assert.equal(reminderResult.items[0].ownerHandoffNeedsReminder, false);
assert.ok(reminderResult.items[0].latestOwnerHandoffReminderAt);
assert.equal(reminderResult.summary.dueCandidateCount, 1);
assert.equal(reminderResult.summary.remindedCount, 1);
assert.equal(reminderResult.summary.reminderCountTotal, 1);

const afterReminderQueue = runCli({
  rootDir: tempRoot,
  args: ['action', 'owner-handoffs', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(afterReminderQueue.items.length, 0);
assert.equal(afterReminderQueue.summary.needsReminderCount, 0);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(
  missionTimeline.timeline.some(
    (event) =>
      event.kind === 'escalation-owner-handoff-reminded' &&
      event.escalationId === resolution.escalation.id &&
      /human-approver/i.test(event.detail),
  ),
  true,
);
assert.equal(missionTimeline.summary.escalationOwnerHandoffReminderCountTotal, 1);
assert.equal(missionTimeline.summary.escalationPendingOwnerHandoffNeedsReminderCount, 0);
assert.ok(missionTimeline.summary.escalationLatestOwnerHandoffReminderAt);

const agedReminderState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
agedReminderState.escalations = agedReminderState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    const reminderHistory = Array.isArray(escalation.ownerHandoffReminderHistory)
      ? escalation.ownerHandoffReminderHistory
      : [];
    return {
      ...escalation,
      lastOwnerHandoffReminderAt: '2026-04-05T00:00:00.000Z',
      ownerHandoffReminderHistory: reminderHistory.map((entry, index) =>
        index === reminderHistory.length - 1
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
fs.writeFileSync(statePath, `${JSON.stringify(agedReminderState, null, 2)}\n`, 'utf8');

const needsReminderAgain = runCli({
  rootDir: tempRoot,
  args: ['action', 'owner-handoffs', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(needsReminderAgain.items.length, 1);
assert.equal(needsReminderAgain.items[0].handoffNeedsReminder, true);
assert.equal(needsReminderAgain.items[0].handoffReminderCount, 1);

const workspaceOverview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(workspaceOverview.summary.escalationPendingOwnerHandoffNeedsReminderCount, 1);
assert.equal(workspaceOverview.summary.escalationOwnerHandoffReminderCountTotal, 1);
assert.ok(workspaceOverview.summary.escalationNextPendingOwnerHandoffReminderAt);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.escalationPendingOwnerHandoffNeedsReminderCount, 1);
assert.equal(globalOverview.summary.escalationOwnerHandoffReminderCountTotal, 1);
assert.ok(globalOverview.summary.escalationNextPendingOwnerHandoffReminderAt);

console.log(
  JSON.stringify(
    {
      ok: true,
      escalationId: resolution.escalation.id,
      mode: 'owner-handoff-reminders',
      ownerHandoffReminderCount: reminderResult.items[0].ownerHandoffReminderCount,
    },
    null,
    2,
  ),
);
