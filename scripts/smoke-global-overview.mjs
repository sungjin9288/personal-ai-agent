import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

process.env.ANTHROPIC_API_KEY = '';
process.env.LOCAL_PROVIDER_MODEL = '';
process.env.OPENAI_API_KEY = '';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-global-overview-'));
const workspaceOnePath = path.join(tempRoot, 'workspace-one');
const workspaceTwoPath = path.join(tempRoot, 'workspace-two');
const recentProviderSince = '2026-04-02T00:00:00.000Z';
const currentMonthStartDate = getUtcMonthStartDate();
const currentWeekStartDate = getUtcWeekStartDate();

fs.mkdirSync(workspaceOnePath, { recursive: true });
fs.mkdirSync(workspaceTwoPath, { recursive: true });

const workspaceOne = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspaceOnePath, '--name', 'workspace-one'],
});

const workspaceTwo = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspaceTwoPath, '--name', 'workspace-two'],
});

const completedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'decision-memo',
    '--title',
    'Completed mission',
    '--objective',
    'Produce one completed mission in workspace one.',
  ],
});

runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', completedMission.id],
});

const pendingMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Pending approval mission',
    '--objective',
    'Leave one pending approval in workspace one.',
  ],
});

const pendingRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', pendingMission.id],
});

const failedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'engineering',
    '--title',
    'Failed mission',
    '--objective',
    'Reject one mission in workspace two.',
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
    'Reject one mission so the global overview contains a failed path.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === pendingRun.approvalId) {
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

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const escalationLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue'],
});

assert.equal(escalationLog.logged, true);
assert.equal(escalationLog.count, 2);

const reminderReadyState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
reminderReadyState.escalations = reminderReadyState.escalations.map((escalation) => ({
  ...escalation,
  createdAt: overdueTimestamp,
  updatedAt: overdueTimestamp,
}));
fs.writeFileSync(statePath, `${JSON.stringify(reminderReadyState, null, 2)}\n`, 'utf8');

const maintenanceRun = runCli({
  rootDir: tempRoot,
  args: ['action', 'maintenance', '--note', 'Global overview maintenance sweep.'],
});

assert.equal(maintenanceRun.summary.totalRemindedCount, 2);
assert.equal(maintenanceRun.maintenanceRun.id !== undefined, true);

runCli({
  rootDir: tempRoot,
  args: ['provider', 'probe', 'stub'],
});

runCli({
  rootDir: tempRoot,
  args: ['provider', 'probe', 'openai'],
});

const providerState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
providerState.providerProbes = providerState.providerProbes.map((probe) => {
  if (probe.providerId === 'stub') {
    return {
      ...probe,
      checkedAt: '2026-04-02T10:00:00.000Z',
      createdAt: '2026-04-02T10:00:00.000Z',
    };
  }

  if (probe.providerId === 'openai') {
    return {
      ...probe,
      checkedAt: '2026-04-03T10:00:00.000Z',
      createdAt: '2026-04-03T10:00:00.000Z',
    };
  }

  return probe;
});
fs.writeFileSync(statePath, `${JSON.stringify(providerState, null, 2)}\n`, 'utf8');

const overview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(overview.summary.workspaceCount, 2);
assert.equal(overview.summary.missionCount, 3);
assert.equal(overview.summary.sessionCount, 3);
assert.equal(overview.summary.providerCount, 5);
assert.equal(overview.summary.providerConfiguredCount, 1);
assert.equal(overview.summary.providerReadyCount, 1);
assert.equal(overview.summary.providerUnprobedCount, 3);
assert.equal(overview.summary.providerLatestProbeFailureCount, 0);
assert.equal(overview.summary.providerLatestProbeSkippedCount, 1);
assert.equal(overview.summary.missionCounts.completed, 1);
assert.equal(overview.summary.missionCounts.awaiting_approval, 1);
assert.equal(overview.summary.missionCounts.failed, 1);
assert.equal(overview.summary.approvalCounts.pending, 1);
assert.equal(overview.summary.approvalCounts.rejected, 1);
assert.equal(overview.summary.approvalCounts.total, 2);
assert.equal(overview.summary.escalationCounts.open, 2);
assert.equal(overview.summary.escalationCounts.resolved, 0);
assert.equal(overview.summary.escalationCounts.total, 2);
assert.equal(overview.summary.inboxCount, 1);
assert.equal(overview.summary.openEscalationCount, 2);
assert.equal(overview.summary.maintenanceRunCount, 1);
assert.equal(overview.summary.maintenanceTotalRemindedCount, 2);
assert.equal(overview.summary.maintenanceMonthlyBucketCount, 1);
assert.equal(overview.summary.maintenanceLatestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(overview.summary.maintenanceOldestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(overview.summary.maintenanceLatestMonthlyBucketDelta.currentMonthStartDate, currentMonthStartDate);
assert.equal(overview.summary.maintenanceLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(overview.summary.maintenanceAffectedMissionCount, 2);
assert.equal(overview.summary.latestMaintenanceImpactRun.id, maintenanceRun.maintenanceRun.id);
assert.deepEqual(
  [...overview.summary.maintenanceAffectedMissionIds].sort(),
  [pendingMission.id, failedMission.id].sort(),
);
assert.deepEqual(
  [...overview.summary.latestMaintenanceImpactAffectedMissionIds].sort(),
  [pendingMission.id, failedMission.id].sort(),
);
assert.equal(overview.summary.activeWorkspaceIds.includes(workspaceOne.id), true);
assert.equal(overview.summary.activeWorkspaceIds.includes(workspaceTwo.id), false);
assert.equal(overview.summary.escalatedWorkspaceIds.includes(workspaceOne.id), true);
assert.equal(overview.summary.escalatedWorkspaceIds.includes(workspaceTwo.id), true);
assert.equal(overview.summary.latestEscalation !== null, true);
assert.equal(overview.summary.latestProviderProbe.providerId, 'openai');
assert.equal(overview.summary.latestFailedProviderProbe, null);
assert.equal(overview.summary.latestSuccessfulProviderProbe.providerId, 'stub');
assert.equal(overview.escalations.length, 2);
assert.equal(overview.inbox.length, 1);
assert.equal(overview.providerOverview.summary.total, 5);
assert.equal(overview.providerOverview.summary.unprobedCount, 3);
assert.equal(overview.providerHealthDrift.status, 'stable');
assert.deepEqual(overview.providerHealthDrift.reasonCodes, []);
assert.equal(overview.providerOverview.providers.length, 5);

const recentOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global', '--provider-since', recentProviderSince],
});

assert.equal(recentOverview.summary.providerRecentSince, recentProviderSince);
assert.equal(recentOverview.summary.providerRecentEventCount, 14);
assert.equal(recentOverview.summary.providerRecentEventFamilyCounts.probe, 2);
assert.equal(recentOverview.summary.providerRecentEventFamilyCounts.execution, 12);
assert.equal(recentOverview.summary.providerRecentEventFamilyCounts.attention, 0);
assert.equal(recentOverview.summary.providerRecentProbeTotal, 2);
assert.equal(recentOverview.summary.providerRecentExecutionCount, 12);
assert.equal(recentOverview.summary.providerRecentExecutionMonthlyBucketCount, 1);
assert.equal(recentOverview.summary.providerRecentExecutionLatestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(recentOverview.summary.providerRecentExecutionOldestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(recentOverview.summary.providerRecentExecutionLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(recentOverview.providerHealthDrift.status, 'stable');
assert.deepEqual(recentOverview.providerHealthDrift.reasonCodes, []);
assert.equal(recentOverview.providerHealthDrift.recentExecutionMonthlyBucketCount, 1);
assert.equal(recentOverview.providerHealthDrift.recentExecutionCurrentMonthStartDate, currentMonthStartDate);
assert.equal(recentOverview.summary.providerHealthDriftStatus, 'stable');
assert.deepEqual(recentOverview.summary.providerHealthDriftReasonCodes, []);
assert.equal(recentOverview.summary.providerHealthDriftRecentExecutionMonthlyBucketCount, 1);
assert.equal(recentOverview.summary.providerRecentTouchedProviderCount, 2);
assert.deepEqual(recentOverview.summary.providerRecentTouchedProviderIds, ['openai', 'stub']);
assert.equal(recentOverview.summary.latestRecentProviderProbe.providerId, 'openai');
assert.equal(recentOverview.summary.latestRecentProviderEvent.providerId, 'stub');
assert.equal(recentOverview.summary.latestRecentProviderExecution.providerId, 'stub');
assert.equal(recentOverview.providerRecentWindow.filters.since, recentProviderSince);
assert.equal(recentOverview.providerRecentWindow.probeTotal, 2);
assert.equal(recentOverview.providerRecentWindow.executionTotal, 12);
assert.equal(recentOverview.providerRecentWindow.executionBucketCount, 1);
assert.equal(
  recentOverview.providerRecentWindow.executionLatestBucketDate,
  recentOverview.providerRecentWindow.executionDailyBuckets[0].date,
);
assert.equal(
  recentOverview.providerRecentWindow.executionOldestBucketDate,
  recentOverview.providerRecentWindow.executionDailyBuckets[0].date,
);
assert.equal(recentOverview.providerRecentWindow.executionDailyBuckets[0].executionCount, 12);
assert.equal(recentOverview.providerRecentWindow.executionLatestBucketDelta.previousDate, null);
assert.equal(recentOverview.providerRecentWindow.executionMonthlyBucketCount, 1);
assert.equal(recentOverview.providerRecentWindow.executionLatestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(recentOverview.providerRecentWindow.executionOldestMonthlyBucketStartDate, currentMonthStartDate);
assert.equal(recentOverview.providerRecentWindow.executionMonthlyBuckets[0].executionCount, 12);
assert.equal(recentOverview.providerRecentWindow.executionLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(recentOverview.providerRecentWindow.executionWeeklyBucketCount, 1);
assert.equal(recentOverview.providerRecentWindow.executionLatestWeeklyBucketStartDate, currentWeekStartDate);
assert.equal(recentOverview.providerRecentWindow.executionOldestWeeklyBucketStartDate, currentWeekStartDate);
assert.equal(recentOverview.providerRecentWindow.executionWeeklyBuckets[0].executionCount, 12);
assert.equal(recentOverview.providerRecentWindow.executionLatestWeeklyBucketDelta.previousWeekStartDate, null);
assert.equal(recentOverview.providerRecentWindow.probeSkippedCount, 1);
assert.equal(recentOverview.providerRecentWindow.probeSuccessCount, 1);
assert.equal(recentOverview.providerRecentWindow.probeFailureCount, 1);
assert.equal(overview.inbox[0].approvalId, pendingRun.approvalId);
assert.equal(overview.inbox[0].workspaceId, workspaceOne.id);
assert.equal(overview.workspaces.length, 2);
assert.equal(
  overview.workspaces.some(
    (entry) =>
      entry.workspace.id === workspaceOne.id &&
      entry.summary.missionCounts.awaiting_approval === 1 &&
      entry.summary.escalationCounts.open === 1 &&
      entry.summary.maintenanceAffectedMissionCount === 1,
  ),
  true,
);
assert.equal(
  overview.workspaces.some(
    (entry) =>
      entry.workspace.id === workspaceTwo.id &&
      entry.summary.missionCounts.failed === 1 &&
      entry.summary.escalationCounts.open === 1 &&
      entry.summary.maintenanceAffectedMissionCount === 1,
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      inboxCount: overview.inbox.length,
      mode: 'global-overview',
      workspaceIds: overview.workspaces.map((entry) => entry.workspace.id),
    },
    null,
    2,
  ),
);

function getUtcMonthStartDate(timestamp = Date.now()) {
  const date = new Date(timestamp);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function getUtcWeekStartDate(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + mondayOffset));
  return start.toISOString().slice(0, 10);
}
