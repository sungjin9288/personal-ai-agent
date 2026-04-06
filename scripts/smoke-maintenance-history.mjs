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
const firstMaintenanceRunTimestamp = '2026-04-01T00:00:00.000Z';
const secondMaintenanceRunTimestamp = '2026-04-06T00:00:00.000Z';
const recentMaintenanceCutoff = '2026-04-03T00:00:00.000Z';

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

writeState((state) => {
  state.maintenanceRuns = state.maintenanceRuns.map((run) => {
    if (run.id === firstMaintenance.maintenanceRun.id) {
      return {
        ...run,
        createdAt: firstMaintenanceRunTimestamp,
      };
    }

    if (run.id === secondMaintenance.maintenanceRun.id) {
      return {
        ...run,
        createdAt: secondMaintenanceRunTimestamp,
      };
    }

    return run;
  });
});

firstMaintenance.maintenanceRun.createdAt = firstMaintenanceRunTimestamp;
secondMaintenance.maintenanceRun.createdAt = secondMaintenanceRunTimestamp;

const history = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--workspace', workspace.id],
});

assert.equal(history.summary.runCount, 2);
assert.equal(history.summary.totalRemindedCount, 2);
assert.equal(history.summary.effectiveRunCount, 1);
assert.equal(history.summary.noOpRunCount, 1);
assert.equal(history.summary.impactRunCount, 1);
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
assert.equal(history.summary.latestEffectiveRun.id, firstMaintenance.maintenanceRun.id);
assert.equal(history.summary.latestNoOpRun.id, secondMaintenance.maintenanceRun.id);
assert.deepEqual(
  [...history.summary.latestImpactAffectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(history.summary.runOutcomeCounts.effective, 1);
assert.equal(history.summary.runOutcomeCounts.noOp, 1);
assert.equal(history.summary.runOutcomeCounts.impactful, 1);
assert.equal(history.summary.recentRuns.length, 2);
assert.equal(history.summary.recentRuns[0].id, secondMaintenance.maintenanceRun.id);
assert.equal(history.summary.recentRuns[0].isEffective, false);
assert.equal(history.summary.recentRuns[0].isImpactful, false);
assert.equal(history.summary.recentRuns[1].id, firstMaintenance.maintenanceRun.id);
assert.equal(history.summary.recentRuns[1].isEffective, true);
assert.equal(history.summary.recentRuns[1].isImpactful, true);
assert.deepEqual(
  [...history.summary.recentRuns[1].affectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(history.summary.workspaceCounts[workspace.id], 2);
assert.equal(history.items.length, 2);
assert.equal(history.items[0].note.includes('First maintenance sweep'), true);
assert.equal(history.items[1].note.includes('Second maintenance sweep'), true);
assert.equal(history.summary.latestRun.id, secondMaintenance.maintenanceRun.id);
assert.equal(history.summary.latestRun.totalRemindedCount, 0);
assert.equal(history.summary.bucketCount, 2);
assert.equal(history.summary.latestBucketDate, '2026-04-06');
assert.equal(history.summary.oldestBucketDate, '2026-04-01');
assert.equal(history.summary.latestBucketDelta.currentDate, '2026-04-06');
assert.equal(history.summary.latestBucketDelta.previousDate, '2026-04-01');
assert.equal(history.summary.latestBucketDelta.runCountDelta, 0);
assert.equal(history.summary.latestBucketDelta.effectiveRunCountDelta, -1);
assert.equal(history.summary.latestBucketDelta.noOpRunCountDelta, 1);
assert.equal(history.summary.latestBucketDelta.impactRunCountDelta, -1);
assert.equal(history.summary.latestBucketDelta.totalRemindedCountDelta, -2);
assert.equal(history.summary.latestBucketDelta.affectedMissionCountDelta, -2);
assert.equal(history.summary.dailyBuckets[0].date, '2026-04-06');
assert.equal(history.summary.dailyBuckets[0].runCount, 1);
assert.equal(history.summary.dailyBuckets[0].noOpRunCount, 1);
assert.equal(history.summary.dailyBuckets[0].effectiveRunCount, 0);
assert.equal(history.summary.dailyBuckets[0].affectedMissionCount, 0);
assert.equal(history.summary.dailyBuckets[1].date, '2026-04-01');
assert.equal(history.summary.dailyBuckets[1].runCount, 1);
assert.equal(history.summary.dailyBuckets[1].effectiveRunCount, 1);
assert.equal(history.summary.dailyBuckets[1].impactRunCount, 1);
assert.deepEqual(
  [...history.summary.dailyBuckets[1].affectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(history.summary.maintenanceRequiredCount, 0);
assert.equal(history.summary.currentDueCandidateCountTotal, 0);

const effectiveHistory = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--workspace', workspace.id, '--outcome', 'effective'],
});

assert.equal(effectiveHistory.summary.runCount, 1);
assert.equal(effectiveHistory.summary.effectiveRunCount, 1);
assert.equal(effectiveHistory.summary.noOpRunCount, 0);
assert.equal(effectiveHistory.items[0].id, firstMaintenance.maintenanceRun.id);

const noOpHistory = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--workspace', workspace.id, '--outcome', 'no-op'],
});

assert.equal(noOpHistory.summary.runCount, 1);
assert.equal(noOpHistory.summary.effectiveRunCount, 0);
assert.equal(noOpHistory.summary.noOpRunCount, 1);
assert.equal(noOpHistory.summary.impactRunCount, 0);
assert.equal(noOpHistory.items[0].id, secondMaintenance.maintenanceRun.id);

const recentHistory = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--workspace', workspace.id, '--since', recentMaintenanceCutoff],
});

assert.equal(recentHistory.filters.since, recentMaintenanceCutoff);
assert.equal(recentHistory.summary.runCount, 1);
assert.equal(recentHistory.summary.noOpRunCount, 1);
assert.equal(recentHistory.summary.effectiveRunCount, 0);
assert.equal(recentHistory.summary.bucketCount, 1);
assert.equal(recentHistory.summary.latestBucketDelta.currentDate, '2026-04-06');
assert.equal(recentHistory.summary.latestBucketDelta.previousDate, null);
assert.equal(recentHistory.summary.latestBucketDelta.noOpRunCountDelta, 1);
assert.equal(recentHistory.summary.latestBucketDelta.totalRemindedCountDelta, 0);
assert.equal(recentHistory.summary.dailyBuckets[0].date, '2026-04-06');
assert.equal(recentHistory.items[0].id, secondMaintenance.maintenanceRun.id);

const recentEffectiveHistory = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--workspace', workspace.id, '--outcome', 'effective', '--since', recentMaintenanceCutoff],
});

assert.equal(recentEffectiveHistory.summary.runCount, 0);
assert.equal(recentEffectiveHistory.items.length, 0);

const missionHistory = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--mission', monitoringFlow.mission.id],
});

assert.equal(missionHistory.summary.runCount, 1);
assert.equal(missionHistory.summary.totalRemindedCount, 2);
assert.equal(missionHistory.summary.affectedMissionCount, 2);
assert.deepEqual(
  [...missionHistory.summary.affectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(missionHistory.summary.missionImpactRunCount, 1);
assert.equal(missionHistory.summary.missionImpactTotalRemindedCount, 1);
assert.equal(missionHistory.summary.missionImpactEscalationRemindedCountTotal, 1);
assert.equal(missionHistory.summary.missionImpactOwnerHandoffRemindedCountTotal, 0);
assert.equal(missionHistory.summary.latestMissionImpactRun.id, firstMaintenance.maintenanceRun.id);
assert.equal(missionHistory.summary.latestMissionImpactRunAt, firstMaintenance.maintenanceRun.createdAt);
assert.equal(missionHistory.summary.bucketCount, 1);
assert.equal(missionHistory.summary.latestBucketDelta.currentDate, '2026-04-01');
assert.equal(missionHistory.summary.latestBucketDelta.previousDate, null);
assert.equal(missionHistory.summary.latestBucketDelta.effectiveRunCountDelta, 1);
assert.equal(missionHistory.summary.latestBucketDelta.totalRemindedCountDelta, 2);
assert.equal(missionHistory.summary.dailyBuckets[0].date, '2026-04-01');
assert.equal(missionHistory.summary.dailyBuckets[0].runCount, 1);
assert.equal(missionHistory.summary.dailyBuckets[0].impactRunCount, 1);
assert.equal(missionHistory.items.length, 1);
assert.equal(missionHistory.items[0].id, firstMaintenance.maintenanceRun.id);

const missionNoOpHistory = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--mission', monitoringFlow.mission.id, '--outcome', 'no-op'],
});

assert.equal(missionNoOpHistory.summary.runCount, 0);
assert.equal(missionNoOpHistory.summary.noOpRunCount, 0);
assert.equal(missionNoOpHistory.summary.bucketCount, 0);
assert.equal(missionNoOpHistory.summary.latestBucketDelta, null);
assert.equal(missionNoOpHistory.items.length, 0);

const recentMissionHistory = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance-history', '--mission', monitoringFlow.mission.id, '--since', recentMaintenanceCutoff],
});

assert.equal(recentMissionHistory.summary.runCount, 0);
assert.equal(recentMissionHistory.summary.bucketCount, 0);
assert.equal(recentMissionHistory.summary.latestBucketDelta, null);
assert.equal(recentMissionHistory.items.length, 0);
assert.equal(recentMissionHistory.filters.since, recentMaintenanceCutoff);

const maintenanceOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'maintenance', '--workspace', workspace.id],
});

assert.equal(maintenanceOverview.summary.runCount, 2);
assert.equal(maintenanceOverview.summary.totalRemindedCount, 2);
assert.equal(maintenanceOverview.summary.latestRun.id, secondMaintenance.maintenanceRun.id);
assert.equal(maintenanceOverview.summary.latestEffectiveRun.id, firstMaintenance.maintenanceRun.id);
assert.equal(maintenanceOverview.summary.latestNoOpRun.id, secondMaintenance.maintenanceRun.id);
assert.equal(maintenanceOverview.summary.effectiveRunCount, 1);
assert.equal(maintenanceOverview.summary.noOpRunCount, 1);
assert.equal(maintenanceOverview.summary.impactRunCount, 1);
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
assert.equal(maintenanceOverview.summary.bucketCount, 2);
assert.equal(maintenanceOverview.summary.latestBucketDelta.currentDate, '2026-04-06');
assert.equal(maintenanceOverview.summary.latestBucketDelta.previousDate, '2026-04-01');
assert.equal(maintenanceOverview.summary.dailyBuckets[0].date, '2026-04-06');
assert.equal(maintenanceOverview.summary.dailyBuckets[1].date, '2026-04-01');
assert.equal(maintenanceOverview.summary.maintenanceRequiredCount, 0);
assert.equal(maintenanceOverview.summary.currentDueCandidateCountTotal, 0);

const missionMaintenanceOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'maintenance', '--mission', monitoringFlow.mission.id],
});

assert.equal(missionMaintenanceOverview.summary.runCount, 1);
assert.equal(missionMaintenanceOverview.summary.totalRemindedCount, 2);
assert.equal(missionMaintenanceOverview.summary.effectiveRunCount, 1);
assert.equal(missionMaintenanceOverview.summary.noOpRunCount, 0);
assert.equal(missionMaintenanceOverview.summary.impactRunCount, 1);
assert.equal(missionMaintenanceOverview.summary.affectedMissionCount, 2);
assert.deepEqual(
  [...missionMaintenanceOverview.summary.affectedMissionIds].sort(),
  [handoffFlow.mission.id, monitoringFlow.mission.id].sort(),
);
assert.equal(missionMaintenanceOverview.summary.missionImpactRunCount, 1);
assert.equal(missionMaintenanceOverview.summary.missionImpactTotalRemindedCount, 1);
assert.equal(missionMaintenanceOverview.summary.missionImpactEscalationRemindedCountTotal, 1);
assert.equal(missionMaintenanceOverview.summary.missionImpactOwnerHandoffRemindedCountTotal, 0);
assert.equal(missionMaintenanceOverview.summary.latestMissionImpactRun.id, firstMaintenance.maintenanceRun.id);
assert.equal(missionMaintenanceOverview.summary.latestMissionImpactRunAt, firstMaintenance.maintenanceRun.createdAt);
assert.equal(missionMaintenanceOverview.summary.bucketCount, 1);
assert.equal(missionMaintenanceOverview.summary.latestBucketDelta.currentDate, '2026-04-01');
assert.equal(missionMaintenanceOverview.summary.latestBucketDelta.previousDate, null);
assert.equal(missionMaintenanceOverview.summary.dailyBuckets[0].date, '2026-04-01');
assert.equal(missionMaintenanceOverview.summary.maintenanceRequiredCount, 0);
assert.equal(missionMaintenanceOverview.summary.currentDueCandidateCountTotal, 0);

const filteredMaintenanceOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'maintenance', '--workspace', workspace.id, '--outcome', 'effective'],
});

assert.equal(filteredMaintenanceOverview.summary.runCount, 1);
assert.equal(filteredMaintenanceOverview.summary.effectiveRunCount, 1);
assert.equal(filteredMaintenanceOverview.summary.noOpRunCount, 0);
assert.equal(filteredMaintenanceOverview.summary.bucketCount, 1);
assert.equal(filteredMaintenanceOverview.summary.latestBucketDelta.currentDate, '2026-04-01');
assert.equal(filteredMaintenanceOverview.summary.latestBucketDelta.previousDate, null);
assert.equal(filteredMaintenanceOverview.items[0].id, firstMaintenance.maintenanceRun.id);

const recentMaintenanceOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'maintenance', '--workspace', workspace.id, '--since', recentMaintenanceCutoff],
});

assert.equal(recentMaintenanceOverview.summary.runCount, 1);
assert.equal(recentMaintenanceOverview.summary.noOpRunCount, 1);
assert.equal(recentMaintenanceOverview.summary.effectiveRunCount, 0);
assert.equal(recentMaintenanceOverview.summary.bucketCount, 1);
assert.equal(recentMaintenanceOverview.summary.latestBucketDelta.currentDate, '2026-04-06');
assert.equal(recentMaintenanceOverview.summary.latestBucketDelta.previousDate, null);
assert.equal(recentMaintenanceOverview.summary.dailyBuckets[0].date, '2026-04-06');
assert.equal(recentMaintenanceOverview.items[0].id, secondMaintenance.maintenanceRun.id);

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
