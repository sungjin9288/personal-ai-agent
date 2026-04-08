import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-action-maintenance-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'maintenance-workspace'],
});

function createAcceptedRiskEscalation({ objective, title }) {
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
      title,
      '--objective',
      objective,
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
      `Track accepted risk for ${title}.`,
    ],
  });

  return {
    mission,
    resolution,
  };
}

const monitoringFlow = createAcceptedRiskEscalation({
  title: 'Maintenance monitoring escalation',
  objective: 'Keep one accepted-risk monitoring escalation due for the maintenance sweep.',
});

const handoffFlow = createAcceptedRiskEscalation({
  title: 'Maintenance owner handoff escalation',
  objective: 'Convert one accepted-risk escalation into a pending owner handoff reminder candidate.',
});

const specialistMission = runCli({
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
    'Maintenance specialist follow-up reminder',
    '--objective',
    'Create one failed specialist branch that becomes due for maintenance reminder sweep.',
    '--constraints',
    'parallel-specialists:research,implementation|parallel-fail:implementation',
  ],
});

const specialistRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', specialistMission.id],
});

assert.equal(specialistRun.status, 'failed');

const statePath = path.join(tempRoot, 'var', 'state.json');
const overdueTimestamp = '2026-03-01T00:00:00.000Z';
const dueTimestamp = '2026-03-02T00:00:00.000Z';
const agedReminderTimestamp = '2026-04-05T00:00:00.000Z';

function writeState(mutator) {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  mutator(state);
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

writeState((state) => {
  state.escalations = state.escalations.map((escalation) => {
    if (
      escalation.id === monitoringFlow.resolution.escalation.id ||
      escalation.id === handoffFlow.resolution.escalation.id
    ) {
      return {
        ...escalation,
        createdAt: overdueTimestamp,
        dueAt: dueTimestamp,
        updatedAt: overdueTimestamp,
      };
    }

    return escalation;
  });
  state.agentRuns = state.agentRuns.map((agentRun) => {
    if (agentRun.missionId === specialistMission.id && agentRun.specialistKind === 'implementation' && agentRun.status === 'failed') {
      return {
        ...agentRun,
        endedAt: overdueTimestamp,
        startedAt: overdueTimestamp,
      };
    }

    return agentRun;
  });
});

runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspace.id],
});

runCli({
  rootDir: tempRoot,
  args: ['action', 'remind-escalations', '--mission', handoffFlow.mission.id, '--due'],
});

writeState((state) => {
  state.escalations = state.escalations.map((escalation) => {
    if (escalation.id === handoffFlow.resolution.escalation.id) {
      return {
        ...escalation,
        lastReminderAt: agedReminderTimestamp,
        updatedAt: agedReminderTimestamp,
      };
    }

    return escalation;
  });
});

runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--mission', handoffFlow.mission.id],
});

writeState((state) => {
  state.escalations = state.escalations.map((escalation) => {
    if (escalation.id === handoffFlow.resolution.escalation.id) {
      const ownerHistory = Array.isArray(escalation.ownerHistory) ? escalation.ownerHistory : [];
      return {
        ...escalation,
        currentEffectiveOwner: 'human-approver',
        lastOwnerEscalatedAt: agedReminderTimestamp,
        ownerHistory: ownerHistory.map((entry, index) =>
          index === ownerHistory.length - 1 && entry.to === 'human-approver'
            ? {
                ...entry,
                at: agedReminderTimestamp,
              }
            : entry,
        ),
        updatedAt: agedReminderTimestamp,
      };
    }

    return escalation;
  });
});

const preMaintenanceReminderInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(preMaintenanceReminderInbox.summary.pendingActionCount, 3);
assert.equal(preMaintenanceReminderInbox.summary.reminderCounts.eligible, 3);
assert.equal(preMaintenanceReminderInbox.summary.reminderCounts.needsReminder, 3);
assert.deepEqual(
  preMaintenanceReminderInbox.items.map((item) => item.actionType).sort(),
  ['accepted-risk-monitoring', 'owner-handoff', 'specialist-follow-up'],
);

const maintenance = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'maintenance',
    '--workspace',
    workspace.id,
    '--note',
    'Run the local-first maintenance sweep for due reminder pressure.',
  ],
});

assert.equal(maintenance.filters.workspaceId, workspace.id);
assert.match(maintenance.filters.note, /maintenance sweep/i);
assert.equal(maintenance.sync.summary.syncedCount, 2);
assert.equal(maintenance.escalationReminders.filters.dueOnly, true);
assert.equal(maintenance.escalationReminders.filters.excludePendingOwnerHandoff, true);
assert.equal(maintenance.escalationReminders.summary.dueCandidateCount, 1);
assert.equal(maintenance.escalationReminders.summary.remindedCount, 1);
assert.equal(maintenance.escalationReminders.items[0].id, monitoringFlow.resolution.escalation.id);
assert.equal(maintenance.ownerHandoffReminders.filters.dueOnly, true);
assert.equal(maintenance.ownerHandoffReminders.summary.dueCandidateCount, 1);
assert.equal(maintenance.ownerHandoffReminders.summary.remindedCount, 1);
assert.equal(maintenance.ownerHandoffReminders.items[0].id, handoffFlow.resolution.escalation.id);
assert.equal(maintenance.specialistFollowUpReminders.filters.dueOnly, true);
assert.equal(maintenance.specialistFollowUpReminders.summary.dueCandidateCount, 1);
assert.equal(maintenance.specialistFollowUpReminders.summary.remindedCount, 1);
assert.equal(maintenance.specialistFollowUpReminders.summary.retryPolicyCounts['resume-blocked-or-failed-branch'], 1);
assert.equal(maintenance.specialistFollowUpReminders.summary.remediationRouteCounts['standard-branch-remediation'], 1);
assert.equal(maintenance.specialistFollowUpReminders.items[0].missionId, specialistMission.id);
assert.equal(maintenance.specialistFollowUpReminders.items[0].specialistKind, 'implementation');
assert.equal(maintenance.summary.dueCandidateCountTotal, 3);
assert.equal(maintenance.summary.escalationRemindedCount, 1);
assert.equal(maintenance.summary.ownerHandoffRemindedCount, 1);
assert.equal(maintenance.summary.specialistFollowUpRemindedCount, 1);
assert.equal(maintenance.summary.specialistFollowUpRetryPolicyCounts['resume-blocked-or-failed-branch'], 1);
assert.equal(maintenance.summary.specialistFollowUpRemediationRouteCounts['standard-branch-remediation'], 1);
assert.equal(maintenance.summary.maintenanceMonthlyBucketCount, 1);
assert.equal(maintenance.summary.maintenanceLatestMonthlyBucketStartDate, '2026-04-01');
assert.equal(maintenance.summary.maintenanceOldestMonthlyBucketStartDate, '2026-04-01');
assert.equal(maintenance.summary.maintenanceLatestMonthlyBucketDelta.currentMonthStartDate, '2026-04-01');
assert.equal(maintenance.summary.maintenanceLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(maintenance.summary.totalRemindedCount, 3);
assert.equal(maintenance.summary.acknowledgedMaintenanceRequiredCount, 1);
assert.equal(maintenance.summary.resolvedMaintenanceRequiredCount, 1);
assert.equal(maintenance.summary.remainingMaintenanceRequiredCount, 0);
assert.ok(maintenance.summary.latestReminderAt);
assert.equal(maintenance.maintenanceRun.acknowledgedMaintenanceRequiredCount, 1);
assert.equal(maintenance.maintenanceRun.resolvedMaintenanceRequiredCount, 1);
assert.equal(maintenance.maintenanceRun.remainingMaintenanceRequiredCount, 0);
assert.equal(maintenance.maintenanceRun.beforePressureSummary.maintenanceRequiredCount, 1);
assert.equal(maintenance.maintenanceRun.afterPressureSummary.maintenanceRequiredCount, 0);
assert.equal(maintenance.maintenanceRun.beforePressureSummary.currentDueSpecialistFollowUpCountTotal, 1);
assert.equal(maintenance.maintenanceRun.afterPressureSummary.currentDueSpecialistFollowUpCountTotal, 0);
assert.equal(maintenance.maintenanceRun.specialistFollowUpRemindedCount, 1);
assert.equal(maintenance.maintenanceRun.specialistFollowUpRetryPolicyCounts['resume-blocked-or-failed-branch'], 1);
assert.equal(maintenance.maintenanceRun.specialistFollowUpRemediationRouteCounts['standard-branch-remediation'], 1);

const postMaintenanceReminderInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--workspace', workspace.id, '--needs-reminder'],
});

assert.equal(postMaintenanceReminderInbox.summary.pendingActionCount, 0);
assert.equal(postMaintenanceReminderInbox.summary.reminderCounts.needsReminder, 0);

const escalatedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'escalated', '--workspace', workspace.id],
});

const monitoringEscalation = escalatedInbox.items.find((item) => item.id === monitoringFlow.resolution.escalation.id);
const handoffEscalation = escalatedInbox.items.find((item) => item.id === handoffFlow.resolution.escalation.id);

assert.ok(monitoringEscalation);
assert.ok(handoffEscalation);
assert.equal(monitoringEscalation.reminderCount, 1);
assert.equal(monitoringEscalation.ownerHandoffReminderCount, 0);
assert.equal(handoffEscalation.reminderCount, 1);
assert.equal(handoffEscalation.ownerHandoffReminderCount, 1);

console.log(
  JSON.stringify(
    {
      ok: true,
      escalationRemindedCount: maintenance.summary.escalationRemindedCount,
      ownerHandoffRemindedCount: maintenance.summary.ownerHandoffRemindedCount,
      mode: 'action-maintenance',
      specialistFollowUpRemindedCount: maintenance.summary.specialistFollowUpRemindedCount,
      totalRemindedCount: maintenance.summary.totalRemindedCount,
    },
    null,
    2,
  ),
);
