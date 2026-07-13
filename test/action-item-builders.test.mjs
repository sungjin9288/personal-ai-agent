import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDispatchMetadata,
  addFixedOperationalMetadata,
  addOperationalMetadata,
  buildApprovalActionItem,
  buildBlockedFollowUpActionItem,
  buildMaintenanceActionItem,
  buildProviderAttentionPendingActionItem,
  buildProviderAttentionStoredActionItem,
  buildReviewerFollowUpItemFromRecord,
  buildSpecialistFollowUpActionItem,
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

test('buildSpecialistFollowUpActionItem keeps remediation and reminder state together', () => {
  const item = buildSpecialistFollowUpActionItem({
    actionId: 'specialist-follow-up:parallel-1:implementation:run-1',
    createdAt: '2020-01-01T00:00:00.000Z',
    detail: 'Implementation branch failed deterministic validation.',
    followUpPolicy: {
      priority: 'high',
      reminderCadenceHours: 24,
      retryPolicy: 'resume-blocked-or-failed-branch',
      slaHours: 24,
    },
    group: {
      orchestrationProfile: 'engineering-triad',
      parallelGroupId: 'parallel-1',
    },
    mission: {
      deliverableType: 'implementation-proposal',
      id: 'mission-1',
      title: 'Repair release flow',
    },
    providerId: 'stub',
    remediationRoute: {
      fallbackCommand: 'node src/cli.mjs mission run mission-1 --provider stub',
      preferredCommand: 'node src/cli.mjs action remediate-specialist-follow-up specialist-action-1',
      routeType: 'standard-branch-remediation',
    },
    reminderRecords: [{ remindedAt: '2020-01-03T00:00:00.000Z' }],
    run: {
      id: 'run-1',
      mergeStatus: 'pending',
      parentRunId: 'manager-run-1',
      sessionId: 'session-1',
      specialistRootRunId: 'root-run-1',
      stageKind: 'specialist-branch',
    },
    specialistHandoff: {
      currentState: 'failed',
      nextHandoff: { recommendedOwner: 'workspace-owner' },
    },
    specialistKind: 'implementation',
    status: 'failed',
    workspace: { id: 'workspace-1', name: 'Example workspace' },
  });

  assert.equal(item.actionClass, 'specialist-follow-up-required');
  assert.equal(item.recommendedOwner, 'workspace-owner');
  assert.equal(item.recommendedCommand, item.remediationCommand);
  assert.equal(item.fallbackRecommendedCommand, 'node src/cli.mjs mission run mission-1 --provider stub');
  assert.equal(item.dueAt, '2020-01-02T00:00:00.000Z');
  assert.equal(item.latestReminderAt, '2020-01-03T00:00:00.000Z');
  assert.equal(item.nextReminderAt, '2020-01-04T00:00:00.000Z');
  assert.equal(item.needsReminder, true);
  assert.equal(item.reminderCount, 1);
  assert.match(item.remindCommand, /remind-specialist-follow-ups --mission mission-1 --status failed/);
});

test('buildProviderAttentionPendingActionItem preserves execution fallback and permission metadata', () => {
  const permissionDecision = {
    allowed: true,
    id: 'permission-decision-1',
    remediationKind: 'mission-fallback-rerun',
  };
  const item = buildProviderAttentionPendingActionItem({
    actionId: 'provider-attention:anthropic:execution:run-1',
    eventRefId: 'run-1',
    failureMetadata: {
      failureKind: 'config',
      recoverable: false,
    },
    fallbackPolicyId: 'provider-failure-only',
    fallbackProviderId: 'stub',
    latestEvent: {
      at: '2020-01-01T00:00:00.000Z',
      detail: 'Anthropic credentials are missing.',
      eventFamily: 'execution',
      eventKind: 'provider-execution-failed',
      missionId: 'mission-1',
      sessionId: 'session-1',
      workspaceId: 'workspace-1',
      workspaceName: 'Example workspace',
    },
    permissionDecision,
    provider: { displayName: 'Anthropic', id: 'anthropic' },
    reminderCadenceHours: 12,
  });

  assert.equal(item.actionClass, 'provider-attention-required');
  assert.equal(item.priority, 'high');
  assert.equal(item.recommendedOwner, 'workspace-owner');
  assert.equal(item.permissionDecision, permissionDecision);
  assert.equal(item.permissionDecisionId, permissionDecision.id);
  assert.equal(item.fallbackProviderId, 'stub');
  assert.match(item.fallbackRecommendedCommand, /--fallback-provider stub$/);
  assert.match(item.recoverableFallbackRecommendedCommand, /recoverable-provider-failure-only$/);
  assert.match(item.inspectCommand, /provider activity --provider anthropic --status failed/);
  assert.equal(item.failureKind, 'config');
  assert.equal(item.recoverable, false);
  assert.equal(item.dueAt, '2020-01-01T12:00:00.000Z');
  assert.equal(item.nextReminderAt, item.dueAt);
  assert.equal(item.needsReminder, true);
});

test('buildProviderAttentionPendingActionItem keeps probe remediation human-owned', () => {
  const item = buildProviderAttentionPendingActionItem({
    actionId: 'provider-attention:openai:probe:probe-1',
    eventRefId: 'probe-1',
    fallbackPolicyId: 'provider-failure-only',
    fallbackProviderId: '',
    latestEvent: {
      at: '2099-01-01T00:00:00.000Z',
      detail: 'Provider probe failed.',
      eventFamily: 'probe',
      eventKind: 'provider-probe-failed',
    },
    permissionDecision: { allowed: true, id: 'permission-decision-2' },
    provider: { displayName: 'OpenAI', id: 'openai' },
    reminderCadenceHours: 24,
  });

  assert.equal(item.priority, 'medium');
  assert.equal(item.recommendedOwner, 'human-approver');
  assert.equal(item.recommendedCommand, 'node src/cli.mjs provider probe openai');
  assert.equal(item.fallbackProviderId, null);
  assert.equal(item.fallbackRecommendedCommand, null);
  assert.equal(item.recoverableFallbackRecommendedCommand, null);
  assert.match(item.inspectCommand, /provider history --provider openai --ok false/);
  assert.equal(item.dueAt, '2099-01-02T00:00:00.000Z');
  assert.equal(item.nextReminderAt, null);
  assert.equal(item.needsReminder, false);
});

test('buildProviderAttentionStoredActionItem normalizes acknowledged and resolved records', () => {
  const record = {
    actionId: 'provider-attention:anthropic:probe:probe-1',
    providerId: 'anthropic',
    providerDisplayName: '',
  };
  const item = buildProviderAttentionStoredActionItem({
    failureMetadata: { failureKind: 'http' },
    providerDisplayName: 'Anthropic',
    record,
    status: 'resolved',
  });

  assert.equal(item.actionType, 'provider-attention');
  assert.equal(item.providerDisplayName, 'Anthropic');
  assert.equal(item.failureKind, 'http');
  assert.equal(item.status, 'resolved');
});
