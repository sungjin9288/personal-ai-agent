import { deriveSlaHoursFromTimestamps } from './escalation-analytics.mjs';

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
