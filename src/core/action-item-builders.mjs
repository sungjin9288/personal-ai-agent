import { deriveSlaHoursFromTimestamps } from './escalation-analytics.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function addDispatchMetadata(item, { priority, recommendedOwner, recommendedCommand }) {
  return {
    ...item,
    commandHint: recommendedCommand,
    priority,
    recommendedCommand,
    recommendedOwner,
  };
}

export function addOperationalMetadata(item, { slaHours, escalationRule }) {
  const createdAt = String(item.createdAt || '');
  const dueAt = createdAt ? new Date(new Date(createdAt).getTime() + slaHours * 60 * 60 * 1000).toISOString() : null;
  const isOverdue = dueAt ? Date.now() > new Date(dueAt).getTime() : false;

  return {
    ...item,
    dueAt,
    escalationRule,
    isOverdue,
    slaHours,
  };
}

export function addFixedOperationalMetadata(item, { dueAt, escalationRule, slaHours }) {
  const isOverdue = dueAt ? Date.now() > new Date(dueAt).getTime() : false;

  return {
    ...item,
    dueAt,
    escalationRule,
    isOverdue,
    slaHours,
  };
}

function addReminderMetadata(item, { reminderCadenceHours, reminderRecords = [], remindCommand }) {
  const latestReminder = reminderRecords.at(-1) || null;
  const latestReminderAt = latestReminder?.remindedAt || latestReminder?.createdAt || null;
  const reminderBaseTimestamp = latestReminderAt || item.dueAt || null;
  const reminderBaseMs = reminderBaseTimestamp ? new Date(reminderBaseTimestamp).getTime() : Number.NaN;
  const nextReminderAt =
    item.isOverdue && Number.isFinite(reminderBaseMs)
      ? latestReminder
        ? new Date(reminderBaseMs + Number(reminderCadenceHours || 0) * 60 * 60 * 1000).toISOString()
        : item.dueAt
      : null;
  const nextReminderMs = nextReminderAt ? new Date(nextReminderAt).getTime() : Number.NaN;
  const needsReminder = item.isOverdue && Number.isFinite(nextReminderMs) ? Date.now() >= nextReminderMs : false;

  return {
    ...item,
    lastReminderAt: latestReminderAt,
    latestReminderAt,
    needsReminder,
    nextReminderAt,
    remindCommand,
    reminderCadenceHours,
    reminderCount: reminderRecords.length,
    reminderHistoryCount: reminderRecords.length,
  };
}

export function buildMaintenanceActionItem(entry) {
  const title = entry.missionTitle
    ? `Maintenance sweep required for ${entry.missionTitle}`
    : `Maintenance sweep required for ${entry.workspaceName}`;
  const recommendedCommand = entry.missionId
    ? `node src/cli.mjs action maintenance --mission ${entry.missionId} --note "<note>"`
    : `node src/cli.mjs action maintenance --workspace ${entry.workspaceId} --note "<note>"`;
  const reasonParts = [];

  if (entry.dueMonitoringCount > 0) {
    reasonParts.push(`${entry.dueMonitoringCount} escalation reminder(s) due`);
  }
  if (entry.dueOwnerHandoffCount > 0) {
    reasonParts.push(`${entry.dueOwnerHandoffCount} owner handoff reminder(s) due`);
  }
  if (entry.dueProviderAttentionCount > 0) {
    reasonParts.push(`${entry.dueProviderAttentionCount} provider attention reminder(s) due`);
  }
  if (entry.dueSpecialistFollowUpCount > 0) {
    reasonParts.push(`${entry.dueSpecialistFollowUpCount} specialist follow-up reminder(s) due`);
  }

  return addFixedOperationalMetadata(
    addDispatchMetadata(
      {
        actionClass: 'maintenance-required',
        actionId: entry.actionId,
        actionType: 'maintenance-sweep',
        createdAt: entry.createdAt,
        dueMonitoringCount: entry.dueMonitoringCount,
        dueOwnerHandoffCount: entry.dueOwnerHandoffCount,
        dueProviderAttentionCount: entry.dueProviderAttentionCount,
        dueSpecialistFollowUpCount: entry.dueSpecialistFollowUpCount,
        effectiveRecommendedOwner: entry.effectiveRecommendedOwner,
        latestMaintenanceRunAt: entry.latestMaintenanceRunAt,
        latestMaintenanceRunId: entry.latestMaintenanceRun?.id || null,
        missionId: entry.missionId,
        nextDueAt: entry.nextDueAt,
        reason: reasonParts.join('; '),
        title,
        totalDueCandidateCount: entry.totalDueCandidateCount,
        workspaceId: entry.workspaceId,
        workspaceName: entry.workspaceName,
      },
      {
        priority: 'high',
        recommendedCommand,
        recommendedOwner: 'workspace-owner',
      },
    ),
    {
      dueAt: entry.nextDueAt,
      escalationRule: 'Run action maintenance to sync escalation state and issue due reminders for this scope.',
      slaHours: deriveSlaHoursFromTimestamps(entry.createdAt, entry.nextDueAt),
    },
  );
}

export function buildApprovalActionItem({ approval, mission, session, workspace }) {
  const item = {
    actionId: approval.id,
    actionClass: 'awaiting-human-decision',
    actionType: 'approval',
    approvalId: approval.id,
    createdAt: approval.createdAt,
    decision: approval.decision,
    deliverableType: mission.deliverableType,
    kind: approval.kind,
    missionId: mission.id,
    missionStatus: mission.status,
    missionTitle: mission.title,
    mode: mission.mode,
    reason: approval.reason,
    requestedByRole: approval.requestedByRole,
    resolveCommand: `node src/cli.mjs approval resolve ${approval.id} --decision <approve|reject> --reason "<reason>"`,
    sessionId: session.id,
    sessionStatus: session.status,
    title: approval.title,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };

  return addOperationalMetadata(
    addDispatchMetadata(item, {
      priority: 'high',
      recommendedOwner: 'human-approver',
      recommendedCommand: item.resolveCommand,
    }),
    {
      slaHours: 24,
      escalationRule: 'If overdue, escalate to the workspace owner and request a decision on approval scope.',
    },
  );
}

export function buildBlockedFollowUpActionItem({ latestSession, mission, rejectedApproval, workspace }) {
  const item = {
    actionClass: 'blocked',
    actionId: `blocked-follow-up:${mission.id}:${latestSession.id}`,
    actionType: 'blocked-follow-up',
    createdAt: rejectedApproval.resolvedAt || rejectedApproval.createdAt,
    deliverableType: mission.deliverableType,
    missionId: mission.id,
    missionStatus: mission.status,
    missionTitle: mission.title,
    mode: mission.mode,
    nextStepHint: 'Create a narrower follow-up mission or revise the objective before rerunning.',
    reason: rejectedApproval.decisionReason || rejectedApproval.reason,
    requestedByRole: rejectedApproval.requestedByRole,
    sessionId: latestSession.id,
    sessionStatus: latestSession.status,
    sourceApprovalId: rejectedApproval.id,
    title: `Blocked after rejected approval for ${mission.title}`,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };

  return addOperationalMetadata(
    addDispatchMetadata(item, {
      priority: 'high',
      recommendedOwner: 'mission-owner',
      recommendedCommand: `node src/cli.mjs mission show ${item.missionId}`,
    }),
    {
      slaHours: 12,
      escalationRule: 'If overdue, escalate to the workspace owner and redefine scope before any rerun.',
    },
  );
}

export function buildReviewerFollowUpItemFromRecord(record) {
  const item = {
    ...record,
    resolveCommand: `node src/cli.mjs action resolve-reviewer-follow-up ${record.actionId} --kind <rerun-fixed|superseded|scope-reduced|accepted-risk> --note "<note>"`,
  };

  return addOperationalMetadata(
    addDispatchMetadata(item, {
      priority: 'medium',
      recommendedOwner: 'mission-owner',
      recommendedCommand: `node src/cli.mjs mission run ${record.missionId} --provider stub`,
    }),
    {
      slaHours: 48,
      escalationRule: 'If overdue, escalate to the workspace owner and request a narrower remediation plan.',
    },
  );
}

export function buildSpecialistFollowUpActionItem({
  actionId,
  createdAt,
  detail,
  followUpPolicy,
  followUpSource = 'run-status',
  group,
  mission,
  providerId,
  remediationRoute,
  reminderRecords = [],
  run = null,
  specialistHandoff,
  specialistKind,
  status,
  workspace,
}) {
  const baseItem = addOperationalMetadata(
    addDispatchMetadata(
      {
        actionClass: 'specialist-follow-up-required',
        actionId,
        actionType: 'specialist-follow-up',
        createdAt,
        deliverableType: mission.deliverableType,
        followUpSource,
        mergeStatus: normalizeText(run?.mergeStatus) || 'pending',
        missionId: mission.id,
        orchestrationProfile: group.orchestrationProfile,
        parallelGroupId: group.parallelGroupId,
        parentRunId: normalizeText(run?.parentRunId) || null,
        providerId,
        reason: detail,
        remediationCommand: remediationRoute.preferredCommand,
        remediationRoute,
        fallbackRecommendedCommand: remediationRoute.fallbackCommand,
        retryPolicy: followUpPolicy.retryPolicy,
        reminderCadenceHours: followUpPolicy.reminderCadenceHours,
        resumeFromRunId: normalizeText(run?.resumeFromRunId) || null,
        runId: normalizeText(run?.id) || null,
        sessionId: normalizeText(run?.sessionId) || null,
        specialistHandoff,
        specialistKind,
        specialistRootRunId: normalizeText(run?.specialistRootRunId) || normalizeText(run?.id) || null,
        stageKind: normalizeText(run?.stageKind) || 'specialist-branch',
        status,
        title: `Specialist follow-up required for ${mission.title} (${specialistKind})`,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      },
      {
        priority: followUpPolicy.priority,
        recommendedCommand: remediationRoute.preferredCommand,
        recommendedOwner: 'workspace-owner',
      },
    ),
    {
      escalationRule:
        'Resume the mission run to rerun the blocked or failed specialist branch and allow manager-controlled merge to continue.',
      slaHours: followUpPolicy.slaHours,
    },
  );

  return addReminderMetadata(baseItem, {
    reminderCadenceHours: followUpPolicy.reminderCadenceHours,
    reminderRecords,
    remindCommand: `node src/cli.mjs action remind-specialist-follow-ups --mission ${mission.id} --status ${status} --note "<note>"`,
  });
}

export function buildProviderAttentionPendingActionItem({
  actionId,
  eventRefId,
  failureMetadata = {},
  fallbackPolicyId,
  fallbackProviderId,
  latestEvent,
  permissionDecision,
  provider,
  reminderCadenceHours,
  reminderRecords = [],
}) {
  const remediationCommand = `node src/cli.mjs action remediate-provider-attention ${actionId}`;
  const fallbackRecommendedCommand = fallbackProviderId
    ? `${remediationCommand} --fallback-provider ${fallbackProviderId}`
    : null;
  const recoverableFallbackRecommendedCommand = fallbackRecommendedCommand
    ? `${fallbackRecommendedCommand} --fallback-policy recoverable-provider-failure-only`
    : null;
  const isExecutionAttention = latestEvent.eventFamily === 'execution';
  const inspectCommand = isExecutionAttention
    ? `node src/cli.mjs provider activity --provider ${provider.id} --status failed`
    : `node src/cli.mjs provider history --provider ${provider.id} --ok false`;
  const recommendedCommand = isExecutionAttention
    ? remediationCommand
    : `node src/cli.mjs provider probe ${provider.id}`;
  const baseItem = addOperationalMetadata(
    addDispatchMetadata(
      {
        acknowledgeCommand: `node src/cli.mjs action acknowledge-provider-attention ${actionId} --note "<note>"`,
        actionClass: 'provider-attention-required',
        actionId,
        actionType: 'provider-attention',
        createdAt: latestEvent.at,
        deliverableType: null,
        eventFamily: latestEvent.eventFamily,
        eventKind: latestEvent.eventKind,
        eventRefId,
        fallbackPolicyId,
        fallbackPolicyOptions: ['provider-failure-only', 'recoverable-provider-failure-only'],
        fallbackProviderId: fallbackProviderId || null,
        fallbackRecommendedCommand,
        inspectCommand,
        missionId: latestEvent.missionId || null,
        permissionDecision,
        permissionDecisionId: permissionDecision.id,
        providerDisplayName: provider.displayName,
        providerId: provider.id,
        recoverableFallbackRecommendedCommand,
        remediationCommand,
        reason: latestEvent.detail,
        sessionId: latestEvent.sessionId || null,
        status: 'pending',
        title: isExecutionAttention
          ? `Provider execution attention required for ${provider.displayName}`
          : `Provider probe attention required for ${provider.displayName}`,
        workspaceId: latestEvent.workspaceId || null,
        workspaceName: latestEvent.workspaceName || null,
      },
      {
        priority: isExecutionAttention ? 'high' : 'medium',
        recommendedCommand,
        recommendedOwner: isExecutionAttention && latestEvent.workspaceId ? 'workspace-owner' : 'human-approver',
      },
    ),
    {
      escalationRule: isExecutionAttention
        ? 'Inspect the failed provider execution and decide whether to rerun, switch provider, or narrow scope.'
        : 'Re-probe the provider and restore provider connectivity before the next external model run.',
      slaHours: isExecutionAttention ? 12 : 24,
    },
  );

  return addReminderMetadata(
    {
      ...baseItem,
      ...failureMetadata,
    },
    {
      reminderCadenceHours,
      reminderRecords,
      remindCommand: `node src/cli.mjs action remind-provider-attention --provider ${provider.id} --note "<note>"`,
    },
  );
}

export function buildProviderAttentionStoredActionItem({ failureMetadata = {}, providerDisplayName, record, status }) {
  return {
    ...record,
    actionType: 'provider-attention',
    ...failureMetadata,
    providerDisplayName,
    status,
  };
}
