import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-operator-timeline-'));
const workspaceOnePath = path.join(tempRoot, 'workspace-one');
const workspaceTwoPath = path.join(tempRoot, 'workspace-two');
const recentProviderSince = '2026-04-02T00:00:00.000Z';

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

const operatorMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Operator timeline mission',
    '--objective',
    'Create approval and escalation lifecycle events in workspace one.',
  ],
});

const firstRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', operatorMission.id],
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
    'Operator timeline requires one rejected approval.',
  ],
});

const secondRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', operatorMission.id],
});

assert.equal(secondRun.status, 'awaiting_approval');

const reviewerMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceTwo.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Reviewer timeline mission',
    '--objective',
    'Create reviewer follow-up activity in workspace two.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const reviewerRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', reviewerMission.id],
});

assert.equal(reviewerRun.status, 'failed');

const providerAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--workspace', workspaceTwo.id],
});

assert.equal(providerAttention.summary.statusCounts.pending, 1);
assert.equal(providerAttention.items.length, 1);
assert.equal(providerAttention.items[0].providerId, 'stub');

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'acknowledge-provider-attention',
    providerAttention.items[0].actionId,
    '--note',
    'Workspace two provider failure acknowledged.',
  ],
});

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-provider-attention',
    providerAttention.items[0].actionId,
    '--note',
    'Workspace two provider failure resolved.',
  ],
});

const reviewerFollowUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'reviewer-followups', '--workspace', workspaceTwo.id],
});

assert.equal(reviewerFollowUps.summary.statusCounts.open, 1);
assert.equal(reviewerFollowUps.items.length, 1);

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-reviewer-follow-up',
    reviewerFollowUps.items[0].actionId,
    '--kind',
    'rerun-fixed',
    '--note',
    'Reviewer follow-up resolved after remediation planning.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === secondRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  return approval;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const escalationLog = runCli({
  rootDir: tempRoot,
  args: ['action', 'log-overdue', '--mission', operatorMission.id],
});

assert.equal(escalationLog.logged, true);
assert.equal(escalationLog.count, 1);

runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-escalation',
    escalationLog.escalationIds[0],
    '--note',
    'Workspace timeline escalation resolved.',
  ],
});

const maintenanceRun = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'maintenance',
    '--workspace',
    workspaceOne.id,
    '--note',
    'Operator timeline maintenance sweep.',
  ],
});

assert.ok(maintenanceRun.maintenanceRun.id);
assert.equal(maintenanceRun.summary.totalRemindedCount, 0);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspaceOne.id],
});

assert.equal(workspaceTimeline.workspace.id, workspaceOne.id);
assert.equal(workspaceTimeline.summary.eventCounts['approval-requested'], 2);
assert.equal(workspaceTimeline.summary.eventCounts['approval-resolved'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['escalation-opened'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['escalation-resolved'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['maintenance-run'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['provider-execution-failed'] || 0, 0);
assert.equal(workspaceTimeline.summary.eventCounts['provider-attention-opened'] || 0, 0);
assert.equal(workspaceTimeline.summary.eventCounts['provider-attention-acknowledged'] || 0, 0);
assert.equal(workspaceTimeline.summary.eventCounts['provider-attention-resolved'] || 0, 0);
assert.equal(workspaceTimeline.summary.eventCounts['reviewer-follow-up-opened'] || 0, 0);
assert.equal(workspaceTimeline.summary.eventCounts['reviewer-follow-up-resolved'] || 0, 0);
assert.equal(workspaceTimeline.timeline.every((event) => event.workspaceId === workspaceOne.id), true);

const reviewerWorkspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspaceTwo.id],
});

const recentReviewerWorkspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspaceTwo.id, '--provider-since', recentProviderSince],
});

assert.equal(reviewerWorkspaceTimeline.summary.eventCounts['provider-execution-failed'], 1);
assert.equal(reviewerWorkspaceTimeline.summary.eventCounts['reviewer-follow-up-opened'], 1);
assert.equal(reviewerWorkspaceTimeline.summary.eventCounts['reviewer-follow-up-resolved'], 1);
assert.equal(reviewerWorkspaceTimeline.summary.eventCounts['provider-attention-opened'], 1);
assert.equal(reviewerWorkspaceTimeline.summary.eventCounts['provider-attention-acknowledged'], 1);
assert.equal(reviewerWorkspaceTimeline.summary.eventCounts['provider-attention-resolved'], 1);
assert.equal(reviewerWorkspaceTimeline.timeline.every((event) => event.workspaceId === workspaceTwo.id), true);
assert.equal(
  reviewerWorkspaceTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-execution-failed' &&
      event.providerId === 'stub' &&
      event.role === 'reviewer' &&
      event.workspaceId === workspaceTwo.id,
  ),
  true,
);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerRecentSince, recentProviderSince);
assert.equal(recentReviewerWorkspaceTimeline.providerRecentWindow.filters.since, recentProviderSince);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerRecentExecutionCount, 4);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerRecentExecutionEstimatedCostUsdTotal, 0);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerRecentExecutionMonthlyBucketCount, 1);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerRecentExecutionLatestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentReviewerWorkspaceTimeline.summary.providerRecentExecutionOldestMonthlyBucketStartDate, '2026-04-01');
assert.equal(
  recentReviewerWorkspaceTimeline.summary.providerRecentExecutionLatestMonthlyBucketDelta.previousMonthStartDate,
  null,
);
assert.equal(recentReviewerWorkspaceTimeline.providerHealthDrift.status, 'watch');
assert.deepEqual(recentReviewerWorkspaceTimeline.providerHealthDrift.reasonCodes, ['monthly-failed-up']);
assert.equal(recentReviewerWorkspaceTimeline.providerHealthDrift.attentionRequiredCount, 0);
assert.equal(recentReviewerWorkspaceTimeline.providerHealthDrift.recentExecutionMonthlyBucketCount, 1);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerHealthDriftStatus, 'watch');
assert.deepEqual(recentReviewerWorkspaceTimeline.summary.providerHealthDriftReasonCodes, ['monthly-failed-up']);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerHealthDriftAttentionRequiredCount, 0);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerHealthDriftRecentExecutionMonthlyBucketCount, 1);
assert.equal(recentReviewerWorkspaceTimeline.summary.providerRecentEventFamilyCounts.probe, 0);
assert.deepEqual(recentReviewerWorkspaceTimeline.summary.providerRecentTouchedProviderIds, ['stub']);
assert.deepEqual(recentReviewerWorkspaceTimeline.providerRecentWindow.touchedProviderIds, ['stub']);
assert.equal(recentReviewerWorkspaceTimeline.providerRecentWindow.executionBucketCount, 1);
assert.equal(recentReviewerWorkspaceTimeline.providerRecentWindow.executionLatestBucketDate, '2026-04-07');
assert.equal(recentReviewerWorkspaceTimeline.providerRecentWindow.executionMonthlyBucketCount, 1);
assert.equal(recentReviewerWorkspaceTimeline.providerRecentWindow.executionLatestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentReviewerWorkspaceTimeline.providerRecentWindow.executionWeeklyBucketCount, 1);
assert.equal(recentReviewerWorkspaceTimeline.providerRecentWindow.executionLatestWeeklyBucketStartDate, '2026-04-06');
assert.equal(recentReviewerWorkspaceTimeline.summary.latestRecentProviderEvent.providerId, 'stub');
assert.equal(recentReviewerWorkspaceTimeline.summary.latestRecentProviderExecution.providerId, 'stub');

const globalTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

const recentGlobalTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline', '--provider-since', recentProviderSince],
});

assert.equal(globalTimeline.summary.eventCounts['approval-requested'], 2);
assert.equal(globalTimeline.summary.eventCounts['approval-resolved'], 1);
assert.equal(globalTimeline.summary.eventCounts['escalation-opened'], 1);
assert.equal(globalTimeline.summary.eventCounts['escalation-resolved'], 1);
assert.equal(globalTimeline.summary.eventCounts['maintenance-run'], 1);
assert.equal(globalTimeline.summary.eventCounts['provider-execution-failed'], 1);
assert.equal(globalTimeline.summary.eventCounts['provider-attention-opened'], 1);
assert.equal(globalTimeline.summary.eventCounts['provider-attention-acknowledged'], 1);
assert.equal(globalTimeline.summary.eventCounts['provider-attention-resolved'], 1);
assert.equal(globalTimeline.summary.eventCounts['reviewer-follow-up-opened'], 1);
assert.equal(globalTimeline.summary.eventCounts['reviewer-follow-up-resolved'], 1);
assert.equal(globalTimeline.summary.workspaceCounts[workspaceOne.id] >= 5, true);
assert.equal(globalTimeline.summary.workspaceCounts[workspaceTwo.id], 6);
assert.equal(globalTimeline.workspaces.some((workspace) => workspace.id === workspaceOne.id), true);
assert.equal(globalTimeline.workspaces.some((workspace) => workspace.id === workspaceTwo.id), true);
assert.equal(
  globalTimeline.timeline.some(
    (event) => event.kind === 'reviewer-follow-up-opened' && event.workspaceId === workspaceTwo.id,
  ),
  true,
);
assert.equal(
  globalTimeline.timeline.some(
    (event) =>
      event.kind === 'reviewer-follow-up-resolved' &&
      event.workspaceId === workspaceTwo.id &&
      /rerun-fixed:/.test(event.detail) &&
      /resolved after remediation planning/i.test(event.detail),
  ),
  true,
);
assert.equal(
  globalTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-execution-failed' &&
      event.workspaceId === workspaceTwo.id &&
      event.providerId === 'stub' &&
      event.role === 'reviewer',
  ),
  true,
);
assert.equal(
  globalTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-attention-acknowledged' &&
      event.workspaceId === workspaceTwo.id &&
      /acknowledged/i.test(event.detail),
  ),
  true,
);
assert.equal(
  globalTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-attention-resolved' &&
      event.workspaceId === workspaceTwo.id &&
      /resolved/i.test(event.detail),
  ),
  true,
);
assert.equal(
  globalTimeline.timeline.some(
    (event) => event.kind === 'escalation-resolved' && /Workspace timeline escalation resolved/.test(event.detail),
  ),
  true,
);
assert.equal(
  globalTimeline.timeline.some(
    (event) =>
      event.kind === 'maintenance-run' &&
      event.workspaceId === workspaceOne.id &&
      /\[no-op\]/.test(event.detail) &&
      /Operator timeline maintenance sweep/i.test(event.detail),
  ),
  true,
);

assert.equal(recentGlobalTimeline.summary.providerRecentSince, recentProviderSince);
assert.equal(recentGlobalTimeline.providerRecentWindow.filters.since, recentProviderSince);
assert.equal(
  recentGlobalTimeline.summary.providerRecentEventCount,
  recentGlobalTimeline.providerRecentWindow.eventTotal,
);
assert.equal(
  recentGlobalTimeline.summary.providerRecentExecutionCount,
  recentGlobalTimeline.providerRecentWindow.executionTotal,
);
assert.equal(recentGlobalTimeline.summary.providerRecentExecutionMonthlyBucketCount, 1);
assert.equal(recentGlobalTimeline.summary.providerRecentExecutionLatestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentGlobalTimeline.summary.providerRecentExecutionOldestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentGlobalTimeline.summary.providerRecentExecutionLatestMonthlyBucketDelta.previousMonthStartDate, null);
assert.equal(recentGlobalTimeline.providerHealthDrift.status, 'watch');
assert.deepEqual(recentGlobalTimeline.providerHealthDrift.reasonCodes, ['monthly-failed-up']);
assert.equal(recentGlobalTimeline.providerHealthDrift.attentionRequiredCount, 0);
assert.equal(recentGlobalTimeline.providerHealthDrift.recentExecutionMonthlyBucketCount, 1);
assert.equal(recentGlobalTimeline.summary.providerHealthDriftStatus, 'watch');
assert.deepEqual(recentGlobalTimeline.summary.providerHealthDriftReasonCodes, ['monthly-failed-up']);
assert.equal(recentGlobalTimeline.summary.providerHealthDriftAttentionRequiredCount, 0);
assert.equal(recentGlobalTimeline.summary.providerHealthDriftRecentExecutionMonthlyBucketCount, 1);
assert.deepEqual(
  recentGlobalTimeline.summary.providerRecentEventFamilyCounts,
  recentGlobalTimeline.providerRecentWindow.eventFamilyCounts,
);
assert.deepEqual(recentGlobalTimeline.summary.providerRecentTouchedProviderIds, ['stub']);
assert.deepEqual(recentGlobalTimeline.providerRecentWindow.touchedProviderIds, ['stub']);
assert.equal(recentGlobalTimeline.providerRecentWindow.eventFamilyCounts.probe, 0);
assert.equal(recentGlobalTimeline.providerRecentWindow.executionBucketCount, 1);
assert.equal(recentGlobalTimeline.providerRecentWindow.executionLatestBucketDate, '2026-04-07');
assert.equal(recentGlobalTimeline.providerRecentWindow.executionMonthlyBucketCount, 1);
assert.equal(recentGlobalTimeline.providerRecentWindow.executionLatestMonthlyBucketStartDate, '2026-04-01');
assert.equal(recentGlobalTimeline.providerRecentWindow.executionWeeklyBucketCount, 1);
assert.equal(recentGlobalTimeline.providerRecentWindow.executionLatestWeeklyBucketStartDate, '2026-04-06');
assert.equal(recentGlobalTimeline.summary.latestRecentProviderEvent.kind, 'provider-attention-resolved');
assert.equal(recentGlobalTimeline.summary.latestRecentProviderExecution.providerId, 'stub');

for (let index = 1; index < globalTimeline.timeline.length; index += 1) {
  assert.ok(String(globalTimeline.timeline[index - 1].at) <= String(globalTimeline.timeline[index].at));
}

console.log(
  JSON.stringify(
    {
      ok: true,
      globalEventCount: globalTimeline.summary.total,
      mode: 'operator-timeline',
      workspaceEventCount: workspaceTimeline.summary.total,
    },
    null,
    2,
  ),
);
