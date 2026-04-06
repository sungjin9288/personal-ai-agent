import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-maintenance-history-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'maintenance-history-workspace'],
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
  title: 'Maintenance history monitoring escalation',
  objective: 'Keep one accepted-risk monitoring escalation due for the maintenance history sweep.',
});

const handoffFlow = createAcceptedRiskEscalation({
  title: 'Maintenance history handoff escalation',
  objective: 'Convert one accepted-risk escalation into pending handoff pressure before maintenance history runs.',
});

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

const preMaintenanceInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--workspace', workspace.id, '--class', 'maintenance-required'],
});

assert.equal(preMaintenanceInbox.summary.pendingActionCount, 1);
assert.equal(preMaintenanceInbox.summary.actionCounts.maintenanceSweep, 1);
assert.equal(preMaintenanceInbox.items[0].actionType, 'maintenance-sweep');
assert.equal(preMaintenanceInbox.items[0].totalDueCandidateCount, 2);
assert.equal(preMaintenanceInbox.items[0].dueMonitoringCount, 1);
assert.equal(preMaintenanceInbox.items[0].dueOwnerHandoffCount, 1);
assert.equal(preMaintenanceInbox.items[0].recommendedOwner, 'workspace-owner');
assert.match(preMaintenanceInbox.items[0].commandHint, /action maintenance/);

const preMaintenanceOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'maintenance', '--workspace', workspace.id],
});

assert.equal(preMaintenanceOverview.summary.maintenanceRequiredCount, 1);
assert.equal(preMaintenanceOverview.summary.currentDueCandidateCountTotal, 2);
assert.equal(preMaintenanceOverview.summary.currentDueMonitoringCountTotal, 1);
assert.equal(preMaintenanceOverview.summary.currentDueOwnerHandoffCountTotal, 1);
assert.equal(preMaintenanceOverview.summary.runCount, 0);

const firstMaintenance = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'maintenance',
    '--workspace',
    workspace.id,
    '--note',
    'First maintenance sweep should process due monitoring and handoff reminders.',
  ],
});

assert.equal(firstMaintenance.summary.totalRemindedCount, 2);
assert.equal(firstMaintenance.summary.escalationRemindedCount, 1);
assert.equal(firstMaintenance.summary.ownerHandoffRemindedCount, 1);
assert.equal(firstMaintenance.summary.acknowledgedMaintenanceRequiredCount, 1);
assert.equal(firstMaintenance.summary.resolvedMaintenanceRequiredCount, 1);
assert.equal(firstMaintenance.summary.remainingMaintenanceRequiredCount, 0);
assert.deepEqual(
  [...firstMaintenance.maintenanceRun.affectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.ok(firstMaintenance.maintenanceRun.id);

const secondMaintenance = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'maintenance',
    '--workspace',
    workspace.id,
    '--note',
    'Second maintenance sweep should be a no-op after the first sweep.',
  ],
});

assert.equal(secondMaintenance.summary.totalRemindedCount, 0);
assert.equal(secondMaintenance.summary.escalationRemindedCount, 0);
assert.equal(secondMaintenance.summary.ownerHandoffRemindedCount, 0);
assert.equal(secondMaintenance.summary.acknowledgedMaintenanceRequiredCount, 0);
assert.equal(secondMaintenance.summary.resolvedMaintenanceRequiredCount, 0);
assert.equal(secondMaintenance.summary.remainingMaintenanceRequiredCount, 0);
assert.ok(secondMaintenance.maintenanceRun.id);

const history = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--workspace', workspace.id],
});

assert.equal(history.summary.runCount, 2);
assert.equal(history.summary.totalRemindedCount, 2);
assert.equal(history.summary.escalationRemindedCountTotal, 1);
assert.equal(history.summary.ownerHandoffRemindedCountTotal, 1);
assert.equal(history.summary.acknowledgedMaintenanceRequiredCountTotal, 1);
assert.equal(history.summary.affectedMissionCount, 2);
assert.deepEqual(
  [...history.summary.affectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(history.summary.resolvedMaintenanceRequiredCountTotal, 1);
assert.equal(history.summary.remainingMaintenanceRequiredCountTotal, 0);
assert.equal(history.summary.latestImpactRun.id, firstMaintenance.maintenanceRun.id);
assert.deepEqual(
  [...history.summary.latestImpactAffectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(history.summary.workspaceCounts[workspace.id], 2);
assert.equal(history.items.length, 2);
assert.equal(history.items[0].note.includes('First maintenance sweep'), true);
assert.equal(history.items[1].note.includes('Second maintenance sweep'), true);
assert.equal(history.summary.latestRun.id, secondMaintenance.maintenanceRun.id);
assert.equal(history.summary.latestRun.totalRemindedCount, 0);
assert.equal(history.summary.maintenanceRequiredCount, 0);
assert.equal(history.summary.currentDueCandidateCountTotal, 0);

const maintenanceOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'maintenance', '--workspace', workspace.id],
});

assert.equal(maintenanceOverview.summary.runCount, 2);
assert.equal(maintenanceOverview.summary.totalRemindedCount, 2);
assert.equal(maintenanceOverview.summary.latestRun.id, secondMaintenance.maintenanceRun.id);
assert.equal(maintenanceOverview.summary.acknowledgedMaintenanceRequiredCountTotal, 1);
assert.equal(maintenanceOverview.summary.affectedMissionCount, 2);
assert.deepEqual(
  [...maintenanceOverview.summary.affectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(maintenanceOverview.summary.resolvedMaintenanceRequiredCountTotal, 1);
assert.equal(maintenanceOverview.summary.remainingMaintenanceRequiredCountTotal, 0);
assert.equal(maintenanceOverview.summary.latestImpactRun.id, firstMaintenance.maintenanceRun.id);
assert.deepEqual(
  [...maintenanceOverview.summary.latestImpactAffectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(maintenanceOverview.summary.maintenanceRequiredCount, 0);
assert.equal(maintenanceOverview.summary.currentDueCandidateCountTotal, 0);

const workspaceOverview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(workspaceOverview.summary.maintenanceRunCount, 2);
assert.equal(workspaceOverview.summary.maintenanceTotalRemindedCount, 2);
assert.equal(workspaceOverview.summary.maintenanceEscalationRemindedCountTotal, 1);
assert.equal(workspaceOverview.summary.maintenanceOwnerHandoffRemindedCountTotal, 1);
assert.equal(workspaceOverview.summary.maintenanceAcknowledgedMaintenanceRequiredCountTotal, 1);
assert.equal(workspaceOverview.summary.maintenanceResolvedMaintenanceRequiredCountTotal, 1);
assert.equal(workspaceOverview.summary.maintenanceRemainingMaintenanceRequiredCountTotal, 0);
assert.equal(workspaceOverview.summary.latestMaintenanceRun.id, secondMaintenance.maintenanceRun.id);
assert.equal(workspaceOverview.summary.maintenanceRequiredCount, 0);
assert.equal(workspaceOverview.summary.maintenanceDueCandidateCountTotal, 2);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.maintenanceRunCount, 2);
assert.equal(globalOverview.summary.maintenanceTotalRemindedCount, 2);
assert.equal(globalOverview.summary.maintenanceEscalationRemindedCountTotal, 1);
assert.equal(globalOverview.summary.maintenanceOwnerHandoffRemindedCountTotal, 1);
assert.equal(globalOverview.summary.maintenanceAcknowledgedMaintenanceRequiredCountTotal, 1);
assert.equal(globalOverview.summary.maintenanceResolvedMaintenanceRequiredCountTotal, 1);
assert.equal(globalOverview.summary.maintenanceRemainingMaintenanceRequiredCountTotal, 0);
assert.equal(globalOverview.summary.latestMaintenanceRun.id, secondMaintenance.maintenanceRun.id);
assert.equal(globalOverview.summary.maintenanceRequiredCount, 0);
assert.equal(globalOverview.summary.maintenanceDueCandidateCountTotal, 2);

const postMaintenanceInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--workspace', workspace.id, '--class', 'maintenance-required'],
});

assert.equal(postMaintenanceInbox.summary.pendingActionCount, 0);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id],
});

assert.equal(workspaceTimeline.summary.eventCounts['maintenance-run'], 2);
assert.equal(workspaceTimeline.summary.eventCounts['maintenance-required-acknowledged'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['maintenance-required-resolved'], 1);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) =>
      event.kind === 'maintenance-required-acknowledged' &&
      /covering 2 due candidate/i.test(event.detail),
  ),
  true,
);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) =>
      event.kind === 'maintenance-required-resolved' &&
      /resolved 1 maintenance-required action/i.test(event.detail) &&
      /remaining=0/i.test(event.detail),
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      latestMaintenanceRunId: secondMaintenance.maintenanceRun.id,
      mode: 'maintenance-history',
      runCount: history.summary.runCount,
      totalRemindedCount: history.summary.totalRemindedCount,
    },
    null,
    2,
  ),
);
