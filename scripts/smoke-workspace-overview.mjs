import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-workspace-overview-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'workspace-overview-workspace'],
});

runCli({
  rootDir: tempRoot,
  args: ['memory', 'add', '--scope', 'workspace', '--workspace', workspace.id, '--kind', 'fact', '--content', 'Workspace overview smoke context.'],
});

const completedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'prd',
    '--title',
    'Completed mission',
    '--objective',
    'Produce a completed mission for overview aggregation.',
  ],
});

runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', completedMission.id],
});

const awaitingMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Awaiting mission',
    '--objective',
    'Produce a mission that is waiting for approval.',
  ],
});

const awaitingRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', awaitingMission.id],
});

const failedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Failed mission',
    '--objective',
    'Produce a mission that fails after rejection.',
  ],
});

const failedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', failedMission.id],
});

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    failedRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Reject one mission so workspace aggregation includes failure.',
  ],
});

const providerAttentionMission = runCli({
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
    'Provider attention mission',
    '--objective',
    'Produce one failed provider execution in the workspace.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const providerAttentionRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', providerAttentionMission.id],
});

assert.equal(providerAttentionRun.status, 'failed');

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';
const recentProviderSince = '2026-04-02T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === awaitingRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  if (approval.id === failedRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
      resolvedAt: overdueTimestamp,
    };
  }

  return approval;
});

state.agentRuns = state.agentRuns.map((run) => {
  if (run.missionId === providerAttentionMission.id) {
    return {
      ...run,
      startedAt: '2026-04-03T10:00:00.000Z',
      endedAt: '2026-04-03T10:01:00.000Z',
    };
  }

  return {
    ...run,
    startedAt: '2026-04-01T10:00:00.000Z',
    endedAt: '2026-04-01T10:01:00.000Z',
  };
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const escalationLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue'],
});

assert.equal(escalationLog.logged, true);
assert.equal(escalationLog.count, 4);

const reminderReadyState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
reminderReadyState.escalations = reminderReadyState.escalations.map((escalation) => ({
  ...escalation,
  createdAt: overdueTimestamp,
  updatedAt: overdueTimestamp,
}));
fs.writeFileSync(statePath, `${JSON.stringify(reminderReadyState, null, 2)}\n`, 'utf8');

const maintenanceRun = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance', '--workspace', workspace.id, '--note', 'Workspace overview maintenance sweep.'],
});

assert.equal(maintenanceRun.summary.totalRemindedCount, 5);
assert.equal(maintenanceRun.maintenanceRun.id !== undefined, true);

const overview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

const recentOverview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id, '--provider-since', recentProviderSince],
});

assert.equal(overview.summary.missionCount, 4);
assert.equal(overview.summary.missionCounts.completed, 1);
assert.equal(overview.summary.missionCounts.awaiting_approval, 1);
assert.equal(overview.summary.missionCounts.failed, 2);
assert.equal(overview.summary.approvalCounts.pending, 1);
assert.equal(overview.summary.approvalCounts.rejected, 1);
assert.equal(overview.summary.approvalCounts.total, 2);
assert.equal(overview.summary.escalationCounts.open, 4);
assert.equal(overview.summary.escalationCounts.resolved, 0);
assert.equal(overview.summary.escalationCounts.total, 4);
assert.equal(overview.summary.memoryCounts.workspaceScoped, 1);
assert.equal(overview.summary.memoryCounts.missionScoped >= 1, true);
assert.equal(overview.summary.openEscalationIds.length, 4);
assert.equal(overview.summary.latestEscalation.workspaceId, workspace.id);
assert.equal(overview.summary.maintenanceRunCount, 1);
assert.equal(overview.summary.maintenanceTotalRemindedCount, 5);
assert.equal(overview.summary.maintenanceAffectedMissionCount, 3);
assert.equal(overview.summary.latestMaintenanceImpactRun.id, maintenanceRun.maintenanceRun.id);
assert.deepEqual(
  [...overview.summary.maintenanceAffectedMissionIds].sort(),
  [awaitingMission.id, failedMission.id, providerAttentionMission.id].sort(),
);
assert.deepEqual(
  [...overview.summary.latestMaintenanceImpactAffectedMissionIds].sort(),
  [awaitingMission.id, failedMission.id, providerAttentionMission.id].sort(),
);
assert.equal(overview.summary.providerAttentionRequiredCount, 1);
assert.equal(overview.summary.providerAttentionAcknowledgedCount, 0);
assert.equal(overview.summary.providerAttentionResolvedCount, 0);
assert.equal(overview.summary.providerAttentionStatusCounts.pending, 1);
assert.equal(overview.summary.providerExecutionFailedCount, 1);
assert.equal(overview.summary.providerTouchedCount, 1);
assert.deepEqual(overview.summary.providerTouchedIds, ['stub']);
assert.equal(overview.summary.latestProviderAttentionRequiredEvent.providerId, 'stub');
assert.equal(overview.summary.latestFailedProviderExecution.providerId, 'stub');
assert.equal(overview.summary.latestProviderExecution.providerId, 'stub');
assert.equal(overview.summary.sessionCount, 4);
assert.equal(overview.summary.activeMissionIds.includes(awaitingMission.id), true);
assert.equal(overview.summary.latestMission.mission.id, providerAttentionMission.id);
assert.equal(overview.escalations.length, 4);
assert.equal(overview.missions.length, 4);
assert.equal(
  overview.missions.some((entry) => entry.mission.id === failedMission.id && entry.summary.latestSession.status === 'failed'),
  true,
);

assert.equal(recentOverview.summary.providerRecentSince, recentProviderSince);
assert.equal(recentOverview.summary.providerRecentTouchedProviderCount, 1);
assert.deepEqual(recentOverview.summary.providerRecentTouchedProviderIds, ['stub']);
assert.equal(recentOverview.summary.providerRecentEventFamilyCounts.execution > 0, true);
assert.equal(recentOverview.summary.providerRecentEventFamilyCounts.attention > 0, true);
assert.equal(recentOverview.summary.providerRecentExecutionCount > 0, true);
assert.equal(recentOverview.summary.providerRecentExecutionEstimatedCostUsdTotal, 0);
assert.equal(recentOverview.summary.providerRecentExecutionMonthlyBucketCount, 1);
assert.equal(recentOverview.summary.providerRecentExecutionLatestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentOverview.summary.providerRecentExecutionOldestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentOverview.summary.providerRecentExecutionLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(recentOverview.summary.latestRecentProviderExecution.providerId, 'stub');
assert.equal(recentOverview.summary.latestRecentProviderEvent.providerId, 'stub');
assert.equal(recentOverview.providerRecentWindow.filters.since, recentProviderSince);
assert.deepEqual(recentOverview.providerRecentWindow.touchedProviderIds, ['stub']);
assert.equal(recentOverview.providerRecentWindow.executionBucketCount, 1);
assert.equal(recentOverview.providerRecentWindow.executionLatestBucketDate, '2026-04-03');
assert.equal(recentOverview.providerRecentWindow.executionDailyBuckets[0].executionCount, 4);
assert.equal(recentOverview.providerRecentWindow.executionLatestBucketDelta.previousDate, null);
assert.equal(recentOverview.providerRecentWindow.executionMonthlyBucketCount, 1);
assert.equal(recentOverview.providerRecentWindow.executionLatestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentOverview.providerRecentWindow.executionMonthlyBuckets[0].executionCount, 4);
assert.equal(recentOverview.providerRecentWindow.executionLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(recentOverview.providerRecentWindow.executionWeeklyBucketCount, 1);
assert.equal(recentOverview.providerRecentWindow.executionLatestWeeklyBucketStartDate, '2026-03-30');
assert.equal(recentOverview.providerRecentWindow.executionWeeklyBuckets[0].executionCount, 4);
assert.equal(recentOverview.providerRecentWindow.executionLatestWeeklyBucketDelta.previousWeekStartDate, null);
assert.equal(
  overview.missions.some((entry) => entry.mission.id === awaitingMission.id && entry.summary.latestSession.status === 'awaiting_approval'),
  true,
);
assert.equal(
  overview.missions.some(
    (entry) => entry.mission.id === providerAttentionMission.id && entry.summary.latestSession.status === 'failed',
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'workspace-overview',
      workspaceId: workspace.id,
      missionIds: overview.missions.map((entry) => entry.mission.id),
    },
    null,
    2,
  ),
);
