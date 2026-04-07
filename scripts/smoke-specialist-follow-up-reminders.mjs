import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-specialist-follow-up-reminders-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'specialist-follow-up-reminder-workspace'],
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
    'Specialist follow-up reminder mission',
    '--objective',
    'Create one failed specialist branch and verify reminder lifecycle.',
    '--constraints',
    'parallel-specialists:research,implementation|parallel-fail:implementation',
  ],
});

const runResult = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(runResult.status, 'failed');

const statePath = path.join(tempRoot, 'var', 'state.json');
const baselineTimestamp = '2026-03-01T00:00:00.000Z';
const failureTimestamp = '2026-03-01T01:00:00.000Z';
const agedReminderTimestamp = '2026-04-05T00:00:00.000Z';

function writeState(mutator) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  mutator(state);
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

writeState((state) => {
  state.agentRuns = state.agentRuns.map((agentRun) => {
    if (agentRun.missionId === mission.id && agentRun.specialistKind === 'implementation' && agentRun.status === 'failed') {
      return {
        ...agentRun,
        endedAt: failureTimestamp,
        startedAt: failureTimestamp,
      };
    }

    if (agentRun.missionId === mission.id) {
      return {
        ...agentRun,
        endedAt: baselineTimestamp,
        startedAt: baselineTimestamp,
      };
    }

    return agentRun;
  });
});

const dueFollowUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(dueFollowUps.items.length, 1);
assert.equal(dueFollowUps.filters.needsReminderOnly, true);
assert.equal(dueFollowUps.summary.needsReminderCount, 1);
assert.equal(dueFollowUps.summary.overdueCount, 1);
assert.equal(dueFollowUps.summary.reminderCountTotal, 0);
assert.equal(dueFollowUps.items[0].providerId, 'stub');
assert.equal(dueFollowUps.items[0].specialistKind, 'implementation');
assert.equal(dueFollowUps.items[0].status, 'failed');
assert.equal(dueFollowUps.items[0].needsReminder, true);
assert.equal(dueFollowUps.items[0].isOverdue, true);
assert.equal(dueFollowUps.items[0].dueAt, '2026-03-02T01:00:00.000Z');
assert.equal(dueFollowUps.items[0].nextReminderAt, '2026-03-02T01:00:00.000Z');

const reminderEligibleInbox = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'inbox',
    '--class',
    'specialist-follow-up-required',
    '--workspace',
    workspace.id,
    '--needs-reminder',
  ],
});

assert.equal(reminderEligibleInbox.items.length, 1);
assert.equal(reminderEligibleInbox.items[0].actionId, dueFollowUps.items[0].actionId);

const firstReminder = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'remind-specialist-follow-ups',
    '--workspace',
    workspace.id,
    '--status',
    'failed',
    '--due',
    '--note',
    'Initial specialist follow-up reminder.',
  ],
});

assert.equal(firstReminder.summary.dueCandidateCount, 1);
assert.equal(firstReminder.summary.remindedCount, 1);
assert.equal(firstReminder.summary.overdueReminderCount, 1);
assert.equal(firstReminder.items.length, 1);
assert.equal(firstReminder.items[0].providerId, 'stub');
assert.equal(firstReminder.items[0].specialistKind, 'implementation');

const afterFirstReminder = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--workspace', workspace.id],
});

assert.equal(afterFirstReminder.items.length, 1);
assert.equal(afterFirstReminder.items[0].reminderCount, 1);
assert.ok(afterFirstReminder.items[0].latestReminderAt);
assert.equal(afterFirstReminder.items[0].needsReminder, false);
assert.equal(afterFirstReminder.summary.reminderCountTotal, 1);
assert.equal(afterFirstReminder.summary.needsReminderCount, 0);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(missionTimeline.timeline.filter((event) => event.kind === 'specialist-follow-up-reminded').length, 1);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id],
});

assert.equal(workspaceTimeline.summary.eventCounts['specialist-follow-up-reminded'], 1);

writeState((state) => {
  state.specialistFollowUpReminders = state.specialistFollowUpReminders.map((record) => {
    if (record.actionId === afterFirstReminder.items[0].actionId) {
      return {
        ...record,
        createdAt: agedReminderTimestamp,
        remindedAt: agedReminderTimestamp,
      };
    }

    return record;
  });
});

const reDueFollowUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'specialist-follow-ups', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(reDueFollowUps.items.length, 1);
assert.equal(reDueFollowUps.items[0].reminderCount, 1);
assert.equal(reDueFollowUps.items[0].needsReminder, true);
assert.equal(reDueFollowUps.summary.needsReminderCount, 1);

console.log(
  JSON.stringify(
    {
      missionId: mission.id,
      mode: 'specialist-follow-up-reminders',
      ok: true,
      workspaceId: workspace.id,
    },
    null,
    2,
  ),
);
