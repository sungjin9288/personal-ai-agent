import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDispatchMetadata,
  addFixedOperationalMetadata,
  addOperationalMetadata,
  buildApprovalActionItem,
  buildBlockedFollowUpActionItem,
  buildMaintenanceActionItem,
  buildReviewerFollowUpItemFromRecord,
} from '../src/core/action-item-builders.mjs';

test('action item metadata keeps dispatch and deadline fields explicit', () => {
  const dispatched = addDispatchMetadata(
    { actionId: 'action-1' },
    {
      priority: 'high',
      recommendedCommand: 'node src/cli.mjs mission show mission-1',
      recommendedOwner: 'mission-owner',
    },
  );
  const scheduled = addOperationalMetadata(dispatched, {
    escalationRule: 'Escalate when overdue.',
    slaHours: 24,
  });

  assert.equal(scheduled.commandHint, 'node src/cli.mjs mission show mission-1');
  assert.equal(scheduled.recommendedCommand, scheduled.commandHint);
  assert.equal(scheduled.recommendedOwner, 'mission-owner');
  assert.equal(scheduled.priority, 'high');
  assert.equal(scheduled.dueAt, null);
  assert.equal(scheduled.isOverdue, false);
  assert.equal(scheduled.slaHours, 24);

  const fixed = addFixedOperationalMetadata(
    { actionId: 'action-2' },
    {
      dueAt: '2000-01-01T00:00:00.000Z',
      escalationRule: 'Escalate now.',
      slaHours: 12,
    },
  );
  assert.equal(fixed.isOverdue, true);
});

test('buildMaintenanceActionItem explains every due action source', () => {
  const item = buildMaintenanceActionItem({
    actionId: 'maintenance-required:workspace-1:mission-1',
    createdAt: '2098-12-31T00:00:00.000Z',
    dueMonitoringCount: 1,
    dueOwnerHandoffCount: 2,
    dueProviderAttentionCount: 3,
    dueSpecialistFollowUpCount: 4,
    effectiveRecommendedOwner: 'human-approver',
    latestMaintenanceRun: { id: 'maintenance-1' },
    latestMaintenanceRunAt: '2098-12-30T00:00:00.000Z',
    missionId: 'mission-1',
    missionTitle: 'Repair release flow',
    nextDueAt: '2099-01-01T00:00:00.000Z',
    totalDueCandidateCount: 10,
    workspaceId: 'workspace-1',
    workspaceName: 'Example workspace',
  });

  assert.equal(item.actionClass, 'maintenance-required');
  assert.equal(item.actionType, 'maintenance-sweep');
  assert.equal(item.title, 'Maintenance sweep required for Repair release flow');
  assert.equal(item.latestMaintenanceRunId, 'maintenance-1');
  assert.equal(item.recommendedOwner, 'workspace-owner');
  assert.equal(item.effectiveRecommendedOwner, 'human-approver');
  assert.equal(item.slaHours, 24);
  assert.equal(item.dueAt, '2099-01-01T00:00:00.000Z');
  assert.equal(item.isOverdue, false);
  assert.match(item.reason, /1 escalation reminder\(s\) due/);
  assert.match(item.reason, /4 specialist follow-up reminder\(s\) due/);
  assert.match(item.recommendedCommand, /action maintenance --mission mission-1/);
});

test('buildMaintenanceActionItem uses workspace scope without a mission', () => {
  const item = buildMaintenanceActionItem({
    actionId: 'maintenance-required:workspace-1:workspace',
    createdAt: '2099-01-01T00:00:00.000Z',
    dueMonitoringCount: 0,
    dueOwnerHandoffCount: 0,
    dueProviderAttentionCount: 1,
    dueSpecialistFollowUpCount: 0,
    effectiveRecommendedOwner: 'workspace-owner',
    latestMaintenanceRun: null,
    latestMaintenanceRunAt: null,
    missionId: null,
    missionTitle: null,
    nextDueAt: '2099-01-02T00:00:00.000Z',
    totalDueCandidateCount: 1,
    workspaceId: 'workspace-1',
    workspaceName: 'Example workspace',
  });

  assert.equal(item.title, 'Maintenance sweep required for Example workspace');
  assert.match(item.recommendedCommand, /action maintenance --workspace workspace-1/);
});

test('buildApprovalActionItem preserves the human approval boundary', () => {
  const item = buildApprovalActionItem({
    approval: {
      createdAt: '2099-01-01T00:00:00.000Z',
      decision: null,
      id: 'approval-1',
      kind: 'workspace-execution',
      reason: 'Execution changes workspace files.',
      requestedByRole: 'executor',
      title: 'Approve workspace execution',
    },
    mission: {
      deliverableType: 'implementation-proposal',
      id: 'mission-1',
      mode: 'engineering',
      status: 'awaiting_approval',
      title: 'Repair release flow',
    },
    session: { id: 'session-1', status: 'awaiting_approval' },
    workspace: { id: 'workspace-1', name: 'Example workspace' },
  });

  assert.equal(item.actionClass, 'awaiting-human-decision');
  assert.equal(item.actionType, 'approval');
  assert.equal(item.recommendedOwner, 'human-approver');
  assert.equal(item.priority, 'high');
  assert.equal(item.dueAt, '2099-01-02T00:00:00.000Z');
  assert.equal(item.recommendedCommand, item.resolveCommand);
  assert.match(item.resolveCommand, /approval resolve approval-1/);
});

test('buildBlockedFollowUpActionItem points to scope review after rejection', () => {
  const item = buildBlockedFollowUpActionItem({
    latestSession: { id: 'session-1', status: 'failed' },
    mission: {
      deliverableType: 'implementation-proposal',
      id: 'mission-1',
      mode: 'engineering',
      status: 'failed',
      title: 'Repair release flow',
    },
    rejectedApproval: {
      createdAt: '2099-01-01T00:00:00.000Z',
      decisionReason: 'Scope is too broad.',
      id: 'approval-1',
      reason: 'Fallback reason',
      requestedByRole: 'executor',
    },
    workspace: { id: 'workspace-1', name: 'Example workspace' },
  });

  assert.equal(item.actionId, 'blocked-follow-up:mission-1:session-1');
  assert.equal(item.reason, 'Scope is too broad.');
  assert.equal(item.recommendedOwner, 'mission-owner');
  assert.equal(item.priority, 'high');
  assert.equal(item.dueAt, '2099-01-01T12:00:00.000Z');
  assert.match(item.recommendedCommand, /mission show mission-1/);
});

test('buildReviewerFollowUpItemFromRecord keeps rerun and resolution commands separate', () => {
  const item = buildReviewerFollowUpItemFromRecord({
    actionId: 'reviewer-follow-up:mission-1:session-1',
    actionClass: 'retry-ready',
    actionType: 'reviewer-follow-up',
    createdAt: '2099-01-01T00:00:00.000Z',
    missionId: 'mission-1',
    status: 'open',
  });

  assert.equal(item.recommendedOwner, 'mission-owner');
  assert.equal(item.priority, 'medium');
  assert.equal(item.dueAt, '2099-01-03T00:00:00.000Z');
  assert.match(item.recommendedCommand, /mission run mission-1 --provider stub/);
  assert.match(item.resolveCommand, /resolve-reviewer-follow-up reviewer-follow-up:mission-1:session-1/);
});
