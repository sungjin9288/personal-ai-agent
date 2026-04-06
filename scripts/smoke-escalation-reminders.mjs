import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-escalation-reminders-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'reminder-workspace'],
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
    'Escalation reminder lifecycle',
    '--objective',
    'Track reminder attempts for accepted-risk monitoring escalation.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(runResult.status, 'failed');

const followUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'reviewer-followups', '--mission', mission.id],
});

const resolution = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-reviewer-follow-up',
    followUps.items[0].actionId,
    '--kind',
    'accepted-risk',
    '--note',
    'Accept the checklist gap but keep reminder pressure visible.',
  ],
});

assert.ok(resolution.escalation);

const statePath = path.join(tempRoot, 'var', 'state.json');
const agedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
agedState.escalations = agedState.escalations.map((escalation) => {
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
fs.writeFileSync(statePath, `${JSON.stringify(agedState, null, 2)}\n`, 'utf8');

const syncResult = runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

assert.equal(syncResult.summary.syncedCount, 1);

const preReminderEscalated = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--tier', 'critical'],
});

assert.equal(preReminderEscalated.items.length, 1);
assert.equal(preReminderEscalated.items[0].escalationTier, 'critical');

const firstReminder = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'remind-escalations',
    '--workspace',
    workspace.id,
    '--tier',
    'critical',
    '--note',
    'Escalate monitoring pressure to the workspace owner.',
  ],
});

assert.equal(firstReminder.summary.remindedCount, 1);
assert.equal(firstReminder.summary.overdueReminderCount, 1);
assert.equal(firstReminder.items[0].reminderCount, 1);
assert.equal(firstReminder.items[0].reminderHistoryCount, 1);
assert.equal(firstReminder.items[0].lastReminderAt, firstReminder.summary.latestReminderAt);
assert.equal(firstReminder.items[0].reminderHistory[0].tier, 'critical');
assert.match(firstReminder.items[0].reminderHistory[0].note, /workspace owner/i);

const secondReminder = runCli({
  rootDir: tempRoot,
  args: ['action', 'remind-escalations', '--workspace', workspace.id, '--overdue'],
});

assert.equal(secondReminder.summary.remindedCount, 1);
assert.equal(secondReminder.items[0].reminderCount, 2);
assert.equal(secondReminder.items[0].reminderHistoryCount, 2);
assert.match(secondReminder.items[0].reminderHistory.at(-1).note, /Reminder issued while escalation is critical\./);

const escalatedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--tier', 'critical'],
});

assert.equal(escalatedInbox.items.length, 1);
assert.equal(escalatedInbox.items[0].reminderCount, 2);
assert.equal(escalatedInbox.items[0].reminderHistoryCount, 2);
assert.ok(escalatedInbox.items[0].lastReminderAt);
assert.equal(escalatedInbox.summary.reminderCountTotal, 2);

const monitoringInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--workspace', workspace.id, '--class', 'monitoring-required'],
});

assert.equal(monitoringInbox.items.length, 1);
assert.equal(monitoringInbox.items[0].reminderCount, 2);
assert.equal(monitoringInbox.items[0].reminderHistoryCount, 2);
assert.ok(monitoringInbox.items[0].lastReminderAt);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

const reminderEvents = missionTimeline.timeline.filter((event) => event.kind === 'escalation-reminded');
assert.equal(reminderEvents.length, 2);
assert.match(reminderEvents[0].detail, /\[critical\]/);
assert.match(reminderEvents[0].detail, /workspace owner/i);
assert.equal(missionTimeline.summary.escalationReminderCountTotal, 2);
assert.ok(missionTimeline.summary.escalationLatestReminderAt);

const workspaceOverview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(workspaceOverview.summary.escalationReminderCountTotal, 2);
assert.ok(workspaceOverview.summary.escalationLatestReminderAt);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.escalationReminderCountTotal, 2);
assert.ok(globalOverview.summary.escalationLatestReminderAt);

const operatorTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

assert.equal(
  operatorTimeline.timeline.filter(
    (event) => event.kind === 'escalation-reminded' && event.escalationId === resolution.escalation.id,
  ).length,
  2,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      escalationId: resolution.escalation.id,
      mode: 'escalation-reminders',
      reminderCount: escalatedInbox.items[0].reminderCount,
    },
    null,
    2,
  ),
);
