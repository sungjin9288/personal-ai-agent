import {
  buildIdentitySessionContextTimelineEvent,
  buildSandboxDecisionTimelineEvent,
} from './audit-records.mjs';
import { formatIncidentCountMap } from './escalation-analytics.mjs';
import { summarizeGatewayEventForTimeline } from './gateway-event-service.mjs';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function sortTimelineEvents(events) {
  return [...events].sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
}

export function buildMissionGatewayTimelineEvents({ gatewayEvents, mission }) {
  return gatewayEvents.flatMap((event) => {
    const gatewayTimelineEvent = {
      at: event.at,
      detail: summarizeGatewayEventForTimeline(event),
      gatewayEventId: event.id,
      gatewayEventType: event.eventType,
      identitySessionBindingStatus: event.identitySessionContext?.bindingStatus || null,
      identitySessionContext: event.identitySessionContext || null,
      identitySessionContextId: event.identitySessionContext?.id || event.identity?.identitySessionContextId || null,
      identitySessionContextPolicyId: event.identitySessionContext?.policyId || null,
      kind: 'gateway-event-recorded',
      missionId: mission.id,
      permissionApprovalRequired: Boolean(event.permissionDecision?.approvalRequired),
      permissionDecision: event.permissionDecision || null,
      permissionDecisionId: event.permissionDecision?.id || event.permissionPolicy?.permissionDecisionId || null,
      permissionDecisionResult: event.permissionDecision?.decision || event.permissionPolicy?.decision || null,
      permissionPolicyId: event.permissionDecision?.policyId || event.permissionPolicy?.policyId || null,
      providerFallbackPolicy: event.providerRoute?.policyId || null,
      providerId: event.providerRoute?.providerId || event.bindings?.providerId || null,
      route: event.route?.name || null,
      sandboxDecision: event.sandboxDecision || null,
      sandboxDecisionId: event.sandboxDecision?.id || event.sandboxPolicy?.sandboxDecisionId || null,
      sandboxDeniedCapabilities:
        event.sandboxDecision?.capabilities?.deniedCapabilities || event.sandboxPolicy?.deniedCapabilities || [],
      sandboxMode: event.sandboxDecision?.mode || event.sandboxPolicy?.mode || null,
      sandboxPolicyId: event.sandboxDecision?.policyId || event.sandboxPolicy?.policyId || null,
      sandboxReason: event.sandboxDecision?.reason || event.sandboxPolicy?.reason || null,
      sessionId: event.bindings?.sessionId || null,
      sourceType: event.source?.sourceType || null,
      status: event.status || 'recorded',
      workspaceId: event.bindings?.workspaceId || mission.workspaceId,
    };

    return [
      gatewayTimelineEvent,
      buildIdentitySessionContextTimelineEvent({ event, mission }),
      buildSandboxDecisionTimelineEvent({ event, mission }),
    ].filter(Boolean);
  });
}

export function buildOperatorGatewayTimelineEvents({ events, filter = {}, missionById, workspaceById }) {
  return events.flatMap((event) => {
    const mission = event.bindings?.missionId ? missionById.get(event.bindings.missionId) : null;
    const workspace = event.bindings?.workspaceId
      ? workspaceById.get(event.bindings.workspaceId)
      : mission
        ? workspaceById.get(mission.workspaceId)
        : null;

    if (!workspace) {
      return [];
    }
    if (filter.missionId && event.bindings?.missionId !== filter.missionId) {
      return [];
    }
    if (filter.workspaceId && workspace.id !== filter.workspaceId) {
      return [];
    }

    return [
      buildIdentitySessionContextTimelineEvent({ event, mission, workspace }),
      buildSandboxDecisionTimelineEvent({ event, mission, workspace }),
    ].filter(Boolean);
  });
}

export function formatMaintenanceRunTimelineDetail(run) {
  const noOpSuffix = Number(run.totalRemindedCount || 0) === 0 ? ' [no-op]' : '';
  const noteSuffix = run.note ? ` note=${run.note}` : '';
  const specialistRetrySummary = formatIncidentCountMap(
    run.specialistFollowUpRetryPolicyCounts || run.specialistFollowUpRemindersSummary?.retryPolicyCounts || {},
  );
  const specialistRouteSummary = formatIncidentCountMap(
    run.specialistFollowUpRemediationRouteCounts || run.specialistFollowUpRemindersSummary?.remediationRouteCounts || {},
  );
  const specialistSuffix =
    specialistRetrySummary || specialistRouteSummary
      ? ` specialist-retry=${specialistRetrySummary || 'none'}, specialist-routes=${specialistRouteSummary || 'none'},`
      : '';

  return `Maintenance sweep${noOpSuffix}: synced=${run.syncedCount || 0}, reminded=${run.totalRemindedCount || 0}, monitoring=${run.escalationRemindedCount || 0}, handoff=${run.ownerHandoffRemindedCount || 0}, provider-attention=${run.providerAttentionRemindedCount || 0}, specialist-follow-up=${run.specialistFollowUpRemindedCount || 0},${specialistSuffix} acknowledged=${run.acknowledgedMaintenanceRequiredCount || 0}, resolved=${run.resolvedMaintenanceRequiredCount || 0}, remaining=${run.remainingMaintenanceRequiredCount || 0}.${noteSuffix}`;
}

export function buildMissionMaintenanceTimelineEvents({ mission, runs }) {
  return runs.flatMap((run) => {
    const events = [];
    const isDirectMissionRun = run.missionId === mission.id;
    const missionEffect = ensureArray(run.affectedMissionSummaries).find((entry) => entry.missionId === mission.id) || null;

    if (isDirectMissionRun && Number(run.acknowledgedMaintenanceRequiredCount || 0) > 0) {
      events.push({
        acknowledgedCount: run.acknowledgedMaintenanceRequiredCount,
        at: run.createdAt,
        detail: `Maintenance sweep acknowledged ${run.acknowledgedMaintenanceRequiredCount} maintenance-required action(s) covering ${run.beforePressureSummary?.currentDueCandidateCountTotal || 0} due candidate(s).`,
        kind: 'maintenance-required-acknowledged',
        maintenanceRunId: run.id,
        missionId: mission.id,
      });
    }

    if (isDirectMissionRun && Number(run.resolvedMaintenanceRequiredCount || 0) > 0) {
      events.push({
        at: run.createdAt,
        detail: `Maintenance sweep resolved ${run.resolvedMaintenanceRequiredCount} maintenance-required action(s); remaining=${run.remainingMaintenanceRequiredCount || 0}.`,
        kind: 'maintenance-required-resolved',
        maintenanceRunId: run.id,
        missionId: mission.id,
        resolvedCount: run.resolvedMaintenanceRequiredCount,
      });
    }

    events.push({
      at: run.createdAt,
      detail: isDirectMissionRun
        ? formatMaintenanceRunTimelineDetail(run)
        : `Workspace maintenance sweep affected this mission: reminded=${missionEffect?.totalRemindedCount || 0}, monitoring=${missionEffect?.escalationRemindedCount || 0}, handoff=${missionEffect?.ownerHandoffRemindedCount || 0}, provider-attention=${missionEffect?.providerAttentionRemindedCount || 0}, specialist-follow-up=${missionEffect?.specialistFollowUpRemindedCount || 0}.${run.note ? ` note=${run.note}` : ''}`,
      kind: 'maintenance-run',
      maintenanceRunId: run.id,
      missionId: mission.id,
      note: run.note || null,
      remindedCount: run.totalRemindedCount || 0,
      status: Number(run.totalRemindedCount || 0) > 0 ? 'completed' : 'no-op',
    });

    return events;
  });
}

export function buildOperatorMaintenanceTimelineEvents({ filter = {}, missionById, runs, workspaceById }) {
  return runs.flatMap((run) => {
    const workspace = workspaceById.get(run.workspaceId);
    const mission = run.missionId ? missionById.get(run.missionId) : null;

    if (!workspace) {
      return [];
    }
    if (filter.workspaceId && workspace.id !== filter.workspaceId) {
      return [];
    }
    if (filter.missionId && run.missionId !== filter.missionId) {
      return [];
    }

    const context = {
      maintenanceRunId: run.id,
      missionId: mission ? mission.id : run.missionId || null,
      missionTitle: mission ? mission.title : null,
      note: run.note || null,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
    const events = [];

    if (Number(run.acknowledgedMaintenanceRequiredCount || 0) > 0) {
      events.push({
        ...context,
        acknowledgedCount: run.acknowledgedMaintenanceRequiredCount,
        at: run.createdAt,
        detail: `Maintenance sweep acknowledged ${run.acknowledgedMaintenanceRequiredCount} maintenance-required action(s) covering ${run.beforePressureSummary?.currentDueCandidateCountTotal || 0} due candidate(s).`,
        kind: 'maintenance-required-acknowledged',
        status: 'acknowledged',
      });
    }

    if (Number(run.resolvedMaintenanceRequiredCount || 0) > 0) {
      events.push({
        ...context,
        at: run.createdAt,
        detail: `Maintenance sweep resolved ${run.resolvedMaintenanceRequiredCount} maintenance-required action(s); remaining=${run.remainingMaintenanceRequiredCount || 0}.`,
        kind: 'maintenance-required-resolved',
        resolvedCount: run.resolvedMaintenanceRequiredCount,
        status: 'resolved',
      });
    }

    events.push({
      ...context,
      at: run.createdAt,
      detail: formatMaintenanceRunTimelineDetail(run),
      kind: 'maintenance-run',
      remindedCount: run.totalRemindedCount || 0,
      status: Number(run.totalRemindedCount || 0) > 0 ? 'completed' : 'no-op',
    });

    return events;
  });
}
