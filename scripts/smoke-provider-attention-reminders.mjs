import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-attention-reminders-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'provider-attention-reminder-workspace'],
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
    'Provider attention reminder mission',
    '--objective',
    'Create one failed provider execution and verify reminder lifecycle.',
    '--constraints',
    'force-rubric-fail',
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
    if (agentRun.missionId === mission.id && agentRun.status === 'failed') {
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

const dueProviderAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(dueProviderAttention.items.length, 1);
assert.equal(dueProviderAttention.summary.needsReminderCount, 1);
assert.equal(dueProviderAttention.summary.overdueCount, 1);
assert.equal(dueProviderAttention.summary.reminderCountTotal, 0);
assert.equal(dueProviderAttention.items[0].providerId, 'stub');
assert.equal(dueProviderAttention.items[0].eventFamily, 'execution');
assert.equal(dueProviderAttention.items[0].needsReminder, true);
assert.equal(dueProviderAttention.items[0].isOverdue, true);
assert.equal(dueProviderAttention.items[0].dueAt, '2026-03-01T13:00:00.000Z');
assert.equal(dueProviderAttention.items[0].nextReminderAt, '2026-03-01T13:00:00.000Z');

const reminderEligibleInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-attention-required', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(reminderEligibleInbox.items.length, 1);
assert.equal(reminderEligibleInbox.items[0].providerId, 'stub');

const firstReminder = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'remind-provider-attention',
    '--workspace',
    workspace.id,
    '--due',
    '--note',
    'Initial provider attention reminder.',
  ],
});

assert.equal(firstReminder.summary.dueCandidateCount, 1);
assert.equal(firstReminder.summary.remindedCount, 1);
assert.equal(firstReminder.summary.overdueReminderCount, 1);
assert.equal(firstReminder.items.length, 1);
assert.equal(firstReminder.items[0].providerId, 'stub');

const afterFirstReminder = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--workspace', workspace.id],
});

assert.equal(afterFirstReminder.items.length, 1);
assert.equal(afterFirstReminder.items[0].reminderCount, 1);
assert.ok(afterFirstReminder.items[0].latestReminderAt);
assert.equal(afterFirstReminder.items[0].needsReminder, false);
assert.equal(afterFirstReminder.summary.reminderCountTotal, 1);
assert.equal(afterFirstReminder.summary.needsReminderCount, 0);

writeState((state) => {
  state.providerAttentionReminders = state.providerAttentionReminders.map((record) => {
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

const reDueProviderAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(reDueProviderAttention.items.length, 1);
assert.equal(reDueProviderAttention.items[0].reminderCount, 1);
assert.equal(reDueProviderAttention.items[0].needsReminder, true);
assert.equal(reDueProviderAttention.summary.needsReminderCount, 1);

const maintenanceRequiredInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'maintenance-required', '--workspace', workspace.id],
});

assert.equal(maintenanceRequiredInbox.items.length, 1);
assert.equal(maintenanceRequiredInbox.items[0].dueProviderAttentionCount, 1);
assert.equal(maintenanceRequiredInbox.items[0].totalDueCandidateCount, 1);

const maintenance = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'maintenance',
    '--workspace',
    workspace.id,
    '--note',
    'Run maintenance for provider attention reminder pressure.',
  ],
});

assert.equal(maintenance.providerAttentionReminders.summary.dueCandidateCount, 1);
assert.equal(maintenance.providerAttentionReminders.summary.remindedCount, 1);
assert.equal(maintenance.summary.providerAttentionRemindedCount, 1);
assert.equal(maintenance.summary.totalRemindedCount, 1);
assert.equal(maintenance.maintenanceRun.providerAttentionRemindedCount, 1);
assert.equal(maintenance.maintenanceRun.beforePressureSummary.currentDueProviderAttentionCountTotal, 1);
assert.equal(maintenance.maintenanceRun.afterPressureSummary.currentDueProviderAttentionCountTotal, 0);

const afterMaintenance = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(afterMaintenance.items.length, 0);
assert.equal(afterMaintenance.summary.needsReminderCount, 0);

const providerEvents = runCli({
  rootDir: tempRoot,
  args: ['provider', 'events', '--family', 'attention', '--provider', 'stub'],
});

assert.equal(providerEvents.timeline.filter((event) => event.eventKind === 'provider-attention-reminded').length, 2);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(missionTimeline.timeline.filter((event) => event.kind === 'provider-attention-reminded').length, 2);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id],
});

assert.equal(workspaceTimeline.summary.eventCounts['provider-attention-reminded'], 2);

const providerOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'providers'],
});

assert.equal(providerOverview.summary.attentionNeedsReminderCount, 0);
assert.equal(providerOverview.summary.attentionReminderCountTotal, 2);
assert.equal(providerOverview.summary.latestAttentionReminder.providerId, 'stub');

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.providerAttentionNeedsReminderCount, 0);
assert.equal(globalOverview.summary.providerAttentionReminderCount, 2);
assert.equal(globalOverview.summary.latestProviderAttentionReminder.providerId, 'stub');

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'provider-attention-reminders',
      providerAttentionReminderCount: providerOverview.summary.attentionReminderCountTotal,
    },
    null,
    2,
  ),
);
