import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-escalation-reminder-due-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'reminder-due-workspace'],
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
    'Escalation reminder due policy',
    '--objective',
    'Derive reminder due state from escalation tier and last reminder timestamp.',
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
    'Keep this accepted risk under reminder policy.',
  ],
});

assert.ok(resolution.escalation);

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

const dueEscalatedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(dueEscalatedInbox.items.length, 1);
assert.equal(dueEscalatedInbox.items[0].escalationTier, 'critical');
assert.equal(dueEscalatedInbox.items[0].needsReminder, true);
assert.equal(dueEscalatedInbox.items[0].reminderCadenceHours, 6);
assert.ok(dueEscalatedInbox.items[0].nextReminderAt);
assert.equal(dueEscalatedInbox.summary.needsReminderCount, 1);

const dueReminderRun = runCli({
  rootDir: tempRoot,
  args: ['action', 'remind-escalations', '--workspace', workspace.id, '--due'],
});

assert.equal(dueReminderRun.filters.dueOnly, true);
assert.equal(dueReminderRun.summary.remindedCount, 1);
assert.equal(dueReminderRun.summary.dueCandidateCount, 1);
assert.equal(dueReminderRun.items[0].reminderCount, 1);
assert.equal(dueReminderRun.items[0].needsReminder, false);
assert.ok(dueReminderRun.items[0].nextReminderAt);

const postReminderEscalatedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(postReminderEscalatedInbox.items.length, 0);
assert.equal(postReminderEscalatedInbox.summary.needsReminderCount, 0);

const afterReminderState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
afterReminderState.escalations = afterReminderState.escalations.map((escalation) => {
  if (escalation.id === resolution.escalation.id) {
    return {
      ...escalation,
      lastReminderAt: '2026-04-05T00:00:00.000Z',
      updatedAt: '2026-04-05T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(afterReminderState, null, 2)}\n`, 'utf8');

const dueAgainEscalatedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(dueAgainEscalatedInbox.items.length, 1);
assert.equal(dueAgainEscalatedInbox.items[0].needsReminder, true);
assert.equal(dueAgainEscalatedInbox.items[0].reminderCount, 1);
assert.equal(dueAgainEscalatedInbox.summary.needsReminderCount, 1);

const workspaceOverview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(workspaceOverview.summary.escalationNeedsReminderCount, 1);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.escalationNeedsReminderCount, 1);

console.log(
  JSON.stringify(
    {
      ok: true,
      escalationId: resolution.escalation.id,
      mode: 'escalation-reminder-due',
      reminderCount: dueAgainEscalatedInbox.items[0].reminderCount,
    },
    null,
    2,
  ),
);
