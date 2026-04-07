import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-mission-timeline-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'mission-timeline-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'engineering',
    '--title',
    'Inspect mission timeline',
    '--objective',
    'Verify that mission-level timeline aggregates sessions, approvals, and memory.',
  ],
});

const firstRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(firstRun.status, 'awaiting_approval');

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    firstRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Timeline smoke needs a rejected first attempt before rerun.',
  ],
});

const secondRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id],
});

assert.equal(secondRun.status, 'awaiting_approval');

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';
const recentProviderSince = '2026-04-02T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === secondRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  return approval;
});

state.agentRuns = state.agentRuns.map((run) => ({
  ...run,
  startedAt: '2026-04-01T10:00:00.000Z',
  endedAt: '2026-04-01T10:01:00.000Z',
}));

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const escalationLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--mission', mission.id],
});

assert.equal(escalationLog.logged, true);
assert.equal(escalationLog.count, 1);
assert.equal(escalationLog.escalationIds.length, 1);

const agedState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
agedState.escalations = agedState.escalations.map((escalation) => {
  if (escalation.id === escalationLog.escalationIds[0]) {
    return {
      ...escalation,
      createdAt: overdueTimestamp,
      updatedAt: overdueTimestamp,
    };
  }

  return escalation;
});

fs.writeFileSync(statePath, `${JSON.stringify(agedState, null, 2)}\n`, 'utf8');

const maintenanceRun = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'maintenance',
    '--workspace',
    workspace.id,
    '--note',
    'Mission timeline maintenance sweep.',
  ],
});

assert.equal(maintenanceRun.summary.totalRemindedCount, 1);
assert.equal(maintenanceRun.summary.acknowledgedMaintenanceRequiredCount, 1);
assert.equal(maintenanceRun.summary.resolvedMaintenanceRequiredCount, 1);
assert.equal(maintenanceRun.summary.remainingMaintenanceRequiredCount, 0);
assert.ok(maintenanceRun.maintenanceRun.id);
assert.equal(maintenanceRun.maintenanceRun.missionId, null);
assert.deepEqual(maintenanceRun.maintenanceRun.affectedMissionIds, [mission.id]);

const resolvedEscalation = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-escalation',
    escalationLog.escalationIds[0],
    '--note',
    'Timeline escalation resolved after manual follow-up.',
  ],
});

assert.equal(resolvedEscalation.status, 'resolved');

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
    'Mission provider attention timeline',
    '--objective',
    'Verify provider execution and provider attention mission audit linkage.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const providerAttentionRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', providerAttentionMission.id],
});

assert.equal(providerAttentionRun.status, 'failed');

const providerAttentionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--mission', providerAttentionMission.id],
});

assert.equal(providerAttentionInbox.items.length, 1);
assert.equal(providerAttentionInbox.items[0].providerId, 'stub');

const acknowledgedProviderAttention = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'acknowledge-provider-attention',
    providerAttentionInbox.items[0].actionId,
    '--note',
    'Mission timeline provider attention acknowledged.',
  ],
});

assert.equal(acknowledgedProviderAttention.status, 'acknowledged');

const resolvedProviderAttention = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-provider-attention',
    providerAttentionInbox.items[0].actionId,
    '--note',
    'Mission timeline provider attention resolved.',
  ],
});

assert.equal(resolvedProviderAttention.status, 'resolved');

const recentProviderState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
recentProviderState.agentRuns = recentProviderState.agentRuns.map((run) => {
  if (run.missionId === providerAttentionMission.id) {
    return {
      ...run,
      startedAt: '2026-04-03T10:00:00.000Z',
      endedAt: '2026-04-03T10:01:00.000Z',
    };
  }

  return run;
});
fs.writeFileSync(statePath, `${JSON.stringify(recentProviderState, null, 2)}\n`, 'utf8');

const missionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', mission.id],
});

const timeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

const providerMissionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', providerAttentionMission.id],
});

const recentProviderMissionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', providerAttentionMission.id, '--provider-since', recentProviderSince],
});

const providerTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', providerAttentionMission.id],
});

const recentProviderTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', providerAttentionMission.id, '--provider-since', recentProviderSince],
});

assert.equal(missionShow.summary.sessionCount, 2);
assert.equal(missionShow.summary.approvalCounts.rejected, 1);
assert.equal(missionShow.summary.approvalCounts.pending, 1);
assert.equal(missionShow.summary.escalationCounts.open, 0);
assert.equal(missionShow.summary.escalationCounts.resolved, 1);
assert.equal(missionShow.summary.escalationCounts.total, 1);
assert.equal(missionShow.summary.memoryCounts.decision >= 1, true);
assert.equal(missionShow.summary.latestSession.status, 'awaiting_approval');
assert.equal(missionShow.summary.latestEscalation.id, escalationLog.escalationIds[0]);
assert.equal(missionShow.summary.maintenanceRunCount, 0);
assert.equal(missionShow.summary.maintenanceTotalRemindedCount, 0);
assert.equal(missionShow.summary.maintenanceAcknowledgedMaintenanceRequiredCountTotal, 0);
assert.equal(missionShow.summary.maintenanceResolvedMaintenanceRequiredCountTotal, 0);
assert.equal(missionShow.summary.maintenanceRemainingMaintenanceRequiredCountTotal, 0);
assert.equal(missionShow.summary.latestMaintenanceRun, null);
assert.equal(missionShow.summary.maintenanceRelatedRunCount, 1);
assert.equal(missionShow.summary.maintenanceImpactRunCount, 1);
assert.equal(missionShow.summary.maintenanceImpactTotalRemindedCount, 1);
assert.equal(missionShow.summary.maintenanceImpactEscalationRemindedCountTotal, 1);
assert.equal(missionShow.summary.maintenanceImpactOwnerHandoffRemindedCountTotal, 0);
assert.equal(missionShow.summary.latestMaintenanceImpactRun.id, maintenanceRun.maintenanceRun.id);
assert.equal(missionShow.summary.latestRelatedMaintenanceRun.id, maintenanceRun.maintenanceRun.id);
assert.equal(missionShow.summary.maintenanceRequiredCount, 0);
assert.equal(missionShow.summary.providerAttentionRequiredCount, 0);
assert.equal(missionShow.summary.providerAttentionAcknowledgedCount, 0);
assert.equal(missionShow.summary.providerAttentionResolvedCount, 0);
assert.equal(missionShow.summary.providerExecutionFailedCount, 0);
assert.equal(missionShow.summary.providerTouchedCount, 1);
assert.deepEqual(missionShow.summary.providerTouchedIds, ['stub']);

assert.equal(timeline.summary.sessionCount, 2);
assert.equal(timeline.timeline.some((event) => event.kind === 'mission-created'), true);
assert.equal(timeline.timeline.filter((event) => event.kind === 'session-started').length, 2);
assert.equal(timeline.timeline.filter((event) => event.kind === 'approval-requested').length, 2);
assert.equal(timeline.timeline.filter((event) => event.kind === 'approval-resolved').length, 1);
assert.equal(timeline.timeline.filter((event) => event.kind === 'provider-execution-succeeded').length, 8);
assert.equal(timeline.timeline.filter((event) => event.kind === 'provider-execution-failed').length, 0);
assert.equal(timeline.timeline.filter((event) => event.kind === 'provider-attention-opened').length, 0);
assert.equal(timeline.timeline.filter((event) => event.kind === 'escalation-opened').length, 1);
assert.equal(timeline.timeline.filter((event) => event.kind === 'escalation-resolved').length, 1);
assert.equal(timeline.timeline.filter((event) => event.kind === 'maintenance-run').length, 1);
assert.equal(timeline.timeline.filter((event) => event.kind === 'maintenance-required-acknowledged').length, 0);
assert.equal(timeline.timeline.filter((event) => event.kind === 'maintenance-required-resolved').length, 0);
assert.equal(timeline.timeline.some((event) => event.kind === 'memory-recorded' && /Timeline smoke needs a rejected first attempt/.test(event.detail)), true);
assert.equal(
  timeline.timeline.some((event) => event.kind === 'escalation-resolved' && /Timeline escalation resolved after manual follow-up/.test(event.detail)),
  true,
);
assert.equal(
  timeline.timeline.some(
    (event) =>
      event.kind === 'maintenance-run' &&
      /Mission timeline maintenance sweep/i.test(event.detail) &&
      /Workspace maintenance sweep affected this mission/i.test(event.detail) &&
      /reminded=1/i.test(event.detail) &&
      /monitoring=1/i.test(event.detail),
    ),
  true,
);

assert.equal(providerMissionShow.summary.sessionCount, 1);
assert.equal(providerMissionShow.summary.status, 'failed');
assert.equal(providerMissionShow.summary.providerAttentionRequiredCount, 0);
assert.equal(providerMissionShow.summary.providerAttentionAcknowledgedCount, 0);
assert.equal(providerMissionShow.summary.providerAttentionResolvedCount, 1);
assert.equal(providerMissionShow.summary.providerAttentionStatusCounts.resolved, 1);
assert.equal(providerMissionShow.summary.providerEventCount, 7);
assert.equal(providerMissionShow.summary.providerEventFamilyCounts.execution, 4);
assert.equal(providerMissionShow.summary.providerEventFamilyCounts.attention, 3);
assert.equal(providerMissionShow.summary.providerExecutionCount, 4);
assert.equal(providerMissionShow.summary.providerExecutionCompletedCount, 3);
assert.equal(providerMissionShow.summary.providerExecutionFailedCount, 1);
assert.equal(providerMissionShow.summary.providerTouchedCount, 1);
assert.deepEqual(providerMissionShow.summary.providerTouchedIds, ['stub']);
assert.equal(providerMissionShow.summary.latestProviderAttentionResolution.providerId, 'stub');
assert.equal(providerMissionShow.summary.latestFailedProviderExecution.providerId, 'stub');
assert.equal(providerMissionShow.summary.latestProviderExecution.providerId, 'stub');
assert.equal(providerMissionShow.summary.latestProviderExecution.role, 'reviewer');
assert.equal(recentProviderMissionShow.summary.providerRecentSince, recentProviderSince);
assert.equal(recentProviderMissionShow.summary.providerRecentTouchedProviderCount, 1);
assert.deepEqual(recentProviderMissionShow.summary.providerRecentTouchedProviderIds, ['stub']);
assert.equal(recentProviderMissionShow.summary.providerRecentEventFamilyCounts.execution, 4);
assert.equal(recentProviderMissionShow.summary.providerRecentEventFamilyCounts.attention, 3);
assert.equal(recentProviderMissionShow.summary.providerRecentExecutionCount, 4);
assert.equal(recentProviderMissionShow.summary.latestRecentProviderExecution.providerId, 'stub');
assert.equal(recentProviderMissionShow.summary.latestRecentProviderEvent.providerId, 'stub');
assert.equal(recentProviderMissionShow.providerRecentWindow.filters.since, recentProviderSince);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionCount, 4);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionBucketCount, 1);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionLatestBucketDate, '2026-04-03');
assert.equal(recentProviderMissionShow.providerRecentWindow.executionDailyBuckets[0].executionCount, 4);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionLatestBucketDelta.previousDate, null);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionMonthlyBucketCount, 1);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionLatestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentProviderMissionShow.providerRecentWindow.executionMonthlyBuckets[0].executionCount, 4);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionWeeklyBucketCount, 1);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionLatestWeeklyBucketStartDate, '2026-03-30');
assert.equal(recentProviderMissionShow.providerRecentWindow.executionWeeklyBuckets[0].executionCount, 4);
assert.equal(recentProviderMissionShow.providerRecentWindow.executionLatestWeeklyBucketDelta.previousWeekStartDate, null);

assert.equal(providerTimeline.summary.sessionCount, 1);
assert.equal(providerTimeline.timeline.filter((event) => event.kind === 'provider-execution-succeeded').length, 3);
assert.equal(providerTimeline.timeline.filter((event) => event.kind === 'provider-execution-failed').length, 1);
assert.equal(providerTimeline.timeline.filter((event) => event.kind === 'provider-attention-opened').length, 1);
assert.equal(providerTimeline.timeline.filter((event) => event.kind === 'provider-attention-acknowledged').length, 1);
assert.equal(providerTimeline.timeline.filter((event) => event.kind === 'provider-attention-resolved').length, 1);
assert.equal(
  providerTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-attention-acknowledged' &&
      /Mission timeline provider attention acknowledged/.test(event.detail),
  ),
  true,
);
assert.equal(
  providerTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-attention-resolved' &&
      /Mission timeline provider attention resolved/.test(event.detail),
  ),
  true,
);
assert.equal(recentProviderTimeline.summary.providerRecentSince, recentProviderSince);
assert.equal(recentProviderTimeline.providerRecentWindow.filters.since, recentProviderSince);
assert.equal(recentProviderTimeline.summary.providerRecentExecutionCount, 4);
assert.equal(recentProviderTimeline.providerRecentWindow.executionBucketCount, 1);
assert.equal(recentProviderTimeline.providerRecentWindow.executionMonthlyBucketCount, 1);
assert.equal(recentProviderTimeline.providerRecentWindow.executionWeeklyBucketCount, 1);

for (let index = 1; index < timeline.timeline.length; index += 1) {
  assert.ok(String(timeline.timeline[index - 1].at) <= String(timeline.timeline[index].at));
}

for (let index = 1; index < providerTimeline.timeline.length; index += 1) {
  assert.ok(String(providerTimeline.timeline[index - 1].at) <= String(providerTimeline.timeline[index].at));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'mission-timeline',
      missionId: mission.id,
      timelineLength: timeline.timeline.length,
      providerMissionId: providerAttentionMission.id,
      providerTimelineLength: providerTimeline.timeline.length,
    },
    null,
    2,
  ),
);
