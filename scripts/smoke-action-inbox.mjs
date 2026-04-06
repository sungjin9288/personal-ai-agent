import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-action-inbox-'));
const workspaceOnePath = path.join(tempRoot, 'workspace-one');
const workspaceTwoPath = path.join(tempRoot, 'workspace-two');

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

const approvalMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Pending approval action',
    '--objective',
    'Leave one pending approval in the action inbox.',
  ],
});

const approvalRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', approvalMission.id],
});

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
    'Reviewer follow-up action',
    '--objective',
    'Trigger a reviewer failure that should require follow-up.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const reviewerRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', reviewerMission.id],
});

assert.equal(reviewerRun.status, 'failed');

const handoffMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Owner handoff action',
    '--objective',
    'Create a pending owner handoff that should reappear in the action inbox.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const handoffRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', handoffMission.id],
});

assert.equal(handoffRun.status, 'failed');

const rejectedMission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspaceOne.id,
    '--mode',
    'engineering',
    '--title',
    'Rejected approval should not remain open',
    '--objective',
    'Prove resolved approvals do not stay in the action inbox.',
  ],
});

const rejectedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', rejectedMission.id],
});

runCli({
  rootDir: tempRoot,
  args: [
    'approval',
    'resolve',
    rejectedRun.approvalId,
    '--decision',
    'reject',
    '--reason',
    'Resolved approvals must leave the action inbox.',
  ],
});

const reviewerSession = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', reviewerMission.id],
});

const handoffFollowUps = runCli({
  rootDir: tempRoot,
  args: ['action', 'reviewer-followups', '--mission', handoffMission.id],
});

const handoffResolution = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'resolve-reviewer-follow-up',
    handoffFollowUps.items[0].actionId,
    '--kind',
    'accepted-risk',
    '--note',
    'Escalate accepted risk until a human approver explicitly acknowledges the handoff.',
  ],
});

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';

state.approvals = state.approvals.map((approval) => {
  if (approval.id === approvalRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
    };
  }

  if (approval.id === rejectedRun.approvalId) {
    return {
      ...approval,
      createdAt: overdueTimestamp,
      resolvedAt: overdueTimestamp,
    };
  }

  return approval;
});

state.artifacts = state.artifacts.map((artifact) => {
  if (artifact.id === reviewerSession.artifacts.find((entry) => entry.fileName === 'reviewer-report.md')?.id) {
    return {
      ...artifact,
      createdAt: '2026-04-06T00:00:00.000Z',
    };
  }

  return artifact;
});

state.escalations = state.escalations.map((escalation) => {
  if (escalation.id === handoffResolution.escalation.id) {
    return {
      ...escalation,
      createdAt: overdueTimestamp,
      dueAt: '2026-03-02T00:00:00.000Z',
      updatedAt: overdueTimestamp,
    };
  }

  return escalation;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspaceOne.id],
});

runCli({
  rootDir: tempRoot,
  args: ['action', 'remind-escalations', '--workspace', workspaceOne.id, '--due'],
});

const afterReminderState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
afterReminderState.escalations = afterReminderState.escalations.map((escalation) => {
  if (escalation.id === handoffResolution.escalation.id) {
    return {
      ...escalation,
      lastReminderAt: '2026-04-05T00:00:00.000Z',
      updatedAt: '2026-04-05T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(afterReminderState, null, 2)}\n`, 'utf8');

runCli({
  rootDir: tempRoot,
  args: ['action', 'sync-escalations', '--workspace', workspaceOne.id],
});

const afterOwnerSyncState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
afterOwnerSyncState.escalations = afterOwnerSyncState.escalations.map((escalation) => {
  if (escalation.id === handoffResolution.escalation.id) {
    const ownerHistory = Array.isArray(escalation.ownerHistory) ? escalation.ownerHistory : [];
    return {
      ...escalation,
      currentEffectiveOwner: 'human-approver',
      lastOwnerEscalatedAt: '2026-04-05T00:00:00.000Z',
      ownerHistory: ownerHistory.map((entry, index) =>
        index === ownerHistory.length - 1 && entry.to === 'human-approver'
          ? {
              ...entry,
              at: '2026-04-05T00:00:00.000Z',
            }
          : entry,
      ),
      updatedAt: '2026-04-05T00:00:00.000Z',
    };
  }

  return escalation;
});
fs.writeFileSync(statePath, `${JSON.stringify(afterOwnerSyncState, null, 2)}\n`, 'utf8');

const inbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox'],
});

assert.equal(inbox.summary.pendingActionCount, 4);
assert.equal(inbox.summary.actionCounts.total, 4);
assert.equal(inbox.summary.actionCounts.acceptedRiskMonitoring, 0);
assert.equal(inbox.summary.actionCounts.approval, 1);
assert.equal(inbox.summary.actionCounts.blockedFollowUp, 1);
assert.equal(inbox.summary.actionCounts.ownerHandoff, 1);
assert.equal(inbox.summary.actionCounts.reviewerFollowUp, 1);
assert.equal(inbox.summary.actionClassCounts.total, 4);
assert.equal(inbox.summary.actionClassCounts.awaitingHumanDecision, 1);
assert.equal(inbox.summary.actionClassCounts.blocked, 1);
assert.equal(inbox.summary.actionClassCounts.handoffRequired, 1);
assert.equal(inbox.summary.actionClassCounts.monitoringRequired, 0);
assert.equal(inbox.summary.actionClassCounts.retryReady, 1);
assert.equal(inbox.summary.priorityCounts.low, 0);
assert.equal(inbox.summary.priorityCounts.medium, 1);
assert.equal(inbox.summary.priorityCounts.high, 3);
assert.equal(inbox.summary.priorityCounts.urgent, 0);
assert.equal(inbox.summary.ownerCounts['human-approver'], 2);
assert.equal(inbox.summary.ownerCounts['mission-owner'], 2);
assert.equal(inbox.summary.ownerCounts['workspace-owner'], 0);
assert.equal(inbox.summary.overdueCounts.total, 4);
assert.equal(inbox.summary.overdueCounts.overdue, 3);
assert.equal(inbox.summary.overdueCounts.onTime, 1);
assert.equal(inbox.summary.workspaceCounts[workspaceOne.id], 3);
assert.equal(inbox.summary.workspaceCounts[workspaceTwo.id], 1);
assert.equal(inbox.filters.actionClass, null);
assert.equal(inbox.filters.priority, null);
assert.equal(inbox.filters.owner, null);
assert.equal(inbox.filters.overdueOnly, false);

const approvalItem = inbox.items.find((item) => item.actionType === 'approval');
assert.ok(approvalItem);
assert.equal(approvalItem.approvalId, approvalRun.approvalId);
assert.equal(approvalItem.actionClass, 'awaiting-human-decision');
assert.equal(approvalItem.priority, 'high');
assert.equal(approvalItem.recommendedOwner, 'human-approver');
assert.match(approvalItem.commandHint, /approval resolve/);
assert.equal(approvalItem.recommendedCommand, approvalItem.commandHint);
assert.equal(approvalItem.slaHours, 24);
assert.equal(approvalItem.isOverdue, true);
assert.ok(approvalItem.dueAt);
assert.match(approvalItem.escalationRule, /workspace owner/i);

const reviewerItem = inbox.items.find((item) => item.actionType === 'reviewer-follow-up');
assert.ok(reviewerItem);
assert.equal(reviewerItem.missionId, reviewerMission.id);
assert.equal(reviewerItem.actionClass, 'retry-ready');
assert.equal(reviewerItem.priority, 'medium');
assert.equal(reviewerItem.recommendedOwner, 'mission-owner');
assert.equal(reviewerItem.sessionStatus, 'failed');
assert.equal(reviewerItem.reportPath.endsWith('reviewer-report.md'), true);
assert.equal(reviewerItem.findings.some((finding) => finding.includes('Checklist section does not contain checkbox items')), true);
assert.match(reviewerItem.commandHint, /mission run/);
assert.equal(reviewerItem.recommendedCommand, reviewerItem.commandHint);
assert.match(reviewerItem.resolveCommand, /resolve-reviewer-follow-up/);
assert.equal(reviewerItem.slaHours, 48);
assert.equal(reviewerItem.isOverdue, false);
assert.ok(reviewerItem.dueAt);
assert.match(reviewerItem.escalationRule, /narrower remediation plan/i);

const blockedItem = inbox.items.find((item) => item.actionType === 'blocked-follow-up');
assert.ok(blockedItem);
assert.equal(blockedItem.actionClass, 'blocked');
assert.equal(blockedItem.priority, 'high');
assert.equal(blockedItem.recommendedOwner, 'mission-owner');
assert.equal(blockedItem.sourceApprovalId, rejectedRun.approvalId);
assert.equal(blockedItem.workspaceId, workspaceOne.id);
assert.match(blockedItem.commandHint, /mission show/);
assert.match(blockedItem.nextStepHint, /narrower follow-up mission/i);
assert.equal(blockedItem.slaHours, 12);
assert.equal(blockedItem.isOverdue, true);
assert.ok(blockedItem.dueAt);
assert.match(blockedItem.escalationRule, /workspace owner/i);

const handoffItem = inbox.items.find((item) => item.actionType === 'owner-handoff');
assert.ok(handoffItem);
assert.equal(handoffItem.actionClass, 'handoff-required');
assert.equal(handoffItem.priority, 'high');
assert.equal(handoffItem.recommendedOwner, 'human-approver');
assert.equal(handoffItem.effectiveRecommendedOwner, 'human-approver');
assert.equal(handoffItem.missionId, handoffMission.id);
assert.equal(handoffItem.escalationId, handoffResolution.escalation.id);
assert.equal(handoffItem.pendingOwnerHandoff, true);
assert.equal(handoffItem.slaHours, 12);
assert.equal(handoffItem.isOverdue, true);
assert.ok(handoffItem.dueAt);
assert.match(handoffItem.ownerTransitionDetail, /workspace-owner -> human-approver/);
assert.match(handoffItem.commandHint, /acknowledge-owner-handoff/);

const workspaceFilteredInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--workspace', workspaceTwo.id],
});

assert.equal(workspaceFilteredInbox.summary.pendingActionCount, 1);
assert.equal(workspaceFilteredInbox.items[0].actionType, 'reviewer-follow-up');
assert.equal(workspaceFilteredInbox.items[0].workspaceId, workspaceTwo.id);

const retryReadyInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'retry-ready'],
});

assert.equal(retryReadyInbox.summary.pendingActionCount, 1);
assert.equal(retryReadyInbox.filters.actionClass, 'retry-ready');
assert.equal(retryReadyInbox.items[0].actionType, 'reviewer-follow-up');

const blockedInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'blocked'],
});

assert.equal(blockedInbox.summary.pendingActionCount, 1);
assert.equal(blockedInbox.items[0].actionType, 'blocked-follow-up');

const highPriorityInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--priority', 'high'],
});

assert.equal(highPriorityInbox.summary.pendingActionCount, 3);
assert.equal(highPriorityInbox.filters.priority, 'high');
assert.equal(highPriorityInbox.items.every((item) => item.priority === 'high'), true);

const ownerFilteredInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--owner', 'human-approver'],
});

assert.equal(ownerFilteredInbox.summary.pendingActionCount, 2);
assert.equal(ownerFilteredInbox.filters.owner, 'human-approver');
assert.deepEqual(
  ownerFilteredInbox.items.map((item) => item.actionType).sort(),
  ['approval', 'owner-handoff'],
);

const handoffRequiredInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'handoff-required'],
});

assert.equal(handoffRequiredInbox.summary.pendingActionCount, 1);
assert.equal(handoffRequiredInbox.filters.actionClass, 'handoff-required');
assert.equal(handoffRequiredInbox.items[0].actionType, 'owner-handoff');

const overdueInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--overdue'],
});

assert.equal(overdueInbox.summary.pendingActionCount, 3);
assert.equal(overdueInbox.filters.overdueOnly, true);
assert.equal(overdueInbox.items.every((item) => item.isOverdue === true), true);

console.log(
  JSON.stringify(
    {
      ok: true,
      actionCount: inbox.items.length,
      actionClasses: inbox.items.map((item) => item.actionClass),
      overdueCount: inbox.summary.overdueCounts.overdue,
      priorities: inbox.items.map((item) => item.priority),
      actionTypes: inbox.items.map((item) => item.actionType),
      mode: 'action-inbox',
    },
    null,
    2,
  ),
);
