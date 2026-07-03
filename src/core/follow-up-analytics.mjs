import { REVIEWER_FOLLOW_UP_RESOLUTION_KINDS, REVIEWER_FOLLOW_UP_STATUSES, SPECIALIST_KINDS } from './constants.mjs';
import { deriveSpecialistFollowUpReminderCadenceHours } from './reminder-formatters.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items].sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || ''))).at(-1);
}

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  if (normalized === 'executing') {
    return 'running';
  }
  return normalized;
}

export function resolveSpecialistFollowUpPolicy({ followUpSource = 'run-status', orchestrationProfile, specialistKind, status }) {
  const retryPolicy = normalizeText(orchestrationProfile?.retryPolicy) || 'resume-blocked-or-failed-branch';
  const normalizedSpecialistKind = normalizeText(specialistKind);
  const normalizedStatus = normalizeAgentRunStatus(status);
  const defaultPolicy = {
    priority: normalizedStatus === 'failed' ? 'high' : 'medium',
    reminderCadenceHours: deriveSpecialistFollowUpReminderCadenceHours(normalizedStatus),
    retryPolicy,
    slaHours: 24,
  };

  if (retryPolicy === 'resume-verification-fast' && normalizedSpecialistKind === 'verification') {
    return {
      priority: followUpSource === 'quality-gate' ? 'high' : defaultPolicy.priority,
      reminderCadenceHours: 12,
      retryPolicy,
      slaHours: 12,
    };
  }

  if (
    retryPolicy === 'resume-research-and-verification-fast' &&
    ['research', 'verification'].includes(normalizedSpecialistKind)
  ) {
    return {
      priority: followUpSource === 'quality-gate' || normalizedStatus === 'blocked' ? 'high' : defaultPolicy.priority,
      reminderCadenceHours: 12,
      retryPolicy,
      slaHours: 12,
    };
  }

  return defaultPolicy;
}

export function resolveSpecialistFollowUpRoute({
  actionId,
  followUpSource = 'run-status',
  missionId,
  providerId,
  retryPolicy,
  specialistKind,
}) {
  const normalizedSpecialistKind = normalizeText(specialistKind);
  const normalizedRetryPolicy = normalizeText(retryPolicy) || 'resume-blocked-or-failed-branch';
  const remediationCommand = `node src/cli.mjs action remediate-specialist-follow-up ${actionId}`;
  const fallbackCommand = `node src/cli.mjs mission run ${missionId} --provider ${providerId}`;
  const route = {
    fallbackCommand,
    preferredCommand: remediationCommand,
    routeReason:
      followUpSource === 'quality-gate'
        ? `Profile quality gate requires a fresh ${normalizedSpecialistKind} specialist signal before merge.`
        : `Resume the latest ${normalizedSpecialistKind} specialist branch inside the current parallel group.`,
    routeType: 'standard-branch-remediation',
    routeUrgency: 'standard',
  };

  if (normalizedRetryPolicy === 'resume-verification-fast' && normalizedSpecialistKind === 'verification') {
    return {
      ...route,
      routeReason: `Fast verification retry policy requires the ${normalizedSpecialistKind} specialist branch to be re-driven before merge can continue.`,
      routeType: 'priority-verification-remediation',
      routeUrgency: 'fast',
    };
  }

  if (
    normalizedRetryPolicy === 'resume-research-and-verification-fast' &&
    ['research', 'verification'].includes(normalizedSpecialistKind)
  ) {
    return {
      ...route,
      routeReason: `Fast research-and-verification retry policy requires the ${normalizedSpecialistKind} specialist branch to be re-driven before merge can continue.`,
      routeType: 'priority-research-verification-remediation',
      routeUrgency: 'fast',
    };
  }

  return route;
}

export function summarizeReviewerFollowUps(items) {
  const statusCounts = {
    ...Object.fromEntries(REVIEWER_FOLLOW_UP_STATUSES.map((status) => [status, 0])),
    total: items.length,
  };
  const resolutionKindCounts = {
    ...Object.fromEntries(REVIEWER_FOLLOW_UP_RESOLUTION_KINDS.map((kind) => [kind, 0])),
    unresolved: 0,
  };
  const workspaceCounts = {};

  for (const item of items) {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
    if (item.resolutionKind) {
      resolutionKindCounts[item.resolutionKind] = (resolutionKindCounts[item.resolutionKind] || 0) + 1;
    } else {
      resolutionKindCounts.unresolved += 1;
    }
  }

  return {
    latestFollowUp:
      [...items]
        .sort((left, right) =>
          String(left.updatedAt || left.createdAt || '').localeCompare(String(right.updatedAt || right.createdAt || '')),
        )
        .at(-1) || null,
    resolutionKindCounts,
    statusCounts,
    total: items.length,
    workspaceCounts,
  };
}

export function summarizeSpecialistFollowUpItems(items) {
  const providerCounts = {};
  const remediationRouteCounts = {};
  const retryPolicyCounts = {};
  const specialistKindCounts = Object.fromEntries(SPECIALIST_KINDS.map((kind) => [kind, 0]));
  const statusCounts = {
    blocked: 0,
    failed: 0,
    total: items.length,
  };
  const workspaceCounts = {};
  let overdueCount = 0;
  let latestReminderAt = null;
  let nextReminderAt = null;
  let needsReminderCount = 0;
  let reminderCountTotal = 0;

  for (const item of items) {
    if (item.providerId) {
      providerCounts[item.providerId] = (providerCounts[item.providerId] || 0) + 1;
    }
    if (item.remediationRoute?.routeType) {
      remediationRouteCounts[item.remediationRoute.routeType] =
        (remediationRouteCounts[item.remediationRoute.routeType] || 0) + 1;
    }
    if (item.retryPolicy) {
      retryPolicyCounts[item.retryPolicy] = (retryPolicyCounts[item.retryPolicy] || 0) + 1;
    }
    if (item.workspaceId) {
      workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
    }
    if (SPECIALIST_KINDS.includes(item.specialistKind)) {
      specialistKindCounts[item.specialistKind] = (specialistKindCounts[item.specialistKind] || 0) + 1;
    }
    if (item.status === 'blocked' || item.status === 'failed') {
      statusCounts[item.status] += 1;
    }
    if (item.isOverdue) {
      overdueCount += 1;
    }
    if (item.needsReminder) {
      needsReminderCount += 1;
    }
    reminderCountTotal += Number(item.reminderCount || 0);
    if (
      item.latestReminderAt &&
      (!latestReminderAt || String(latestReminderAt) < String(item.latestReminderAt))
    ) {
      latestReminderAt = item.latestReminderAt;
    }
    if (item.nextReminderAt && (!nextReminderAt || String(nextReminderAt) > String(item.nextReminderAt))) {
      nextReminderAt = item.nextReminderAt;
    }
  }

  return {
    latestItem: items.at(-1) || null,
      latestReminderAt,
      needsReminderCount,
      nextReminderAt,
      overdueCount,
      providerCounts,
      remediationRouteCounts,
      reminderCountTotal,
      retryPolicyCounts,
      specialistKindCounts,
      statusCounts,
      total: items.length,
      workspaceCounts,
    };
}

export function summarizeOperatorTimeline(events) {
  const eventCounts = {};
  const identitySessionContextBindingStatusCounts = {};
  const identitySessionContextPolicyCounts = {};
  const identitySessionContextSourceTypeCounts = {};
  const providerFallbackPolicyCounts = {};
  const providerFallbackStopReasonCounts = {};
  const providerRouteDecisionPolicyCounts = {};
  const providerRouteDecisionRouteCounts = {};
  const sandboxDecisionModeCounts = {};
  const sandboxDecisionPolicyCounts = {};
  const workspaceCounts = {};
  const providerFallbackEvents = [];
  const providerFallbackUsedEvents = [];
  const identitySessionContextEvents = [];
  const providerRouteDecisionEvents = [];
  const sandboxDecisionEvents = [];

  for (const event of events) {
    eventCounts[event.kind] = (eventCounts[event.kind] || 0) + 1;
    if (event.workspaceId) {
      workspaceCounts[event.workspaceId] = (workspaceCounts[event.workspaceId] || 0) + 1;
    }
    if (event.kind === 'identity-session-context-recorded') {
      identitySessionContextEvents.push(event);
      const bindingStatus = normalizeText(event.identitySessionBindingStatus);
      if (bindingStatus) {
        identitySessionContextBindingStatusCounts[bindingStatus] =
          (identitySessionContextBindingStatusCounts[bindingStatus] || 0) + 1;
      }
      const policyId = normalizeText(event.identitySessionContextPolicyId);
      if (policyId) {
        identitySessionContextPolicyCounts[policyId] = (identitySessionContextPolicyCounts[policyId] || 0) + 1;
      }
      const sourceType = normalizeText(event.sourceType);
      if (sourceType) {
        identitySessionContextSourceTypeCounts[sourceType] =
          (identitySessionContextSourceTypeCounts[sourceType] || 0) + 1;
      }
    }
    if (event.kind === 'provider-fallback-attempted' || event.kind === 'provider-fallback-used') {
      providerFallbackEvents.push(event);
      const fallbackPolicy = normalizeText(event.fallbackPolicy);
      if (fallbackPolicy) {
        providerFallbackPolicyCounts[fallbackPolicy] = (providerFallbackPolicyCounts[fallbackPolicy] || 0) + 1;
      }
      const fallbackStopReason = normalizeText(event.fallbackStopReason);
      if (fallbackStopReason) {
        providerFallbackStopReasonCounts[fallbackStopReason] =
          (providerFallbackStopReasonCounts[fallbackStopReason] || 0) + 1;
      }
      if (event.providerRouteDecision) {
        providerRouteDecisionEvents.push(event);
        const routeName = normalizeText(event.providerRouteDecision.action?.route || event.providerRouteName);
        if (routeName) {
          providerRouteDecisionRouteCounts[routeName] = (providerRouteDecisionRouteCounts[routeName] || 0) + 1;
        }
        const routePolicyId = normalizeText(event.providerRouteDecision.policyId || event.fallbackPolicy);
        if (routePolicyId) {
          providerRouteDecisionPolicyCounts[routePolicyId] =
            (providerRouteDecisionPolicyCounts[routePolicyId] || 0) + 1;
        }
      }
    }
    if (event.kind === 'provider-fallback-used') {
      providerFallbackUsedEvents.push(event);
    }
    if (event.kind === 'sandbox-decision-recorded') {
      sandboxDecisionEvents.push(event);
      const sandboxMode = normalizeText(event.sandboxMode);
      if (sandboxMode) {
        sandboxDecisionModeCounts[sandboxMode] = (sandboxDecisionModeCounts[sandboxMode] || 0) + 1;
      }
      const sandboxPolicyId = normalizeText(event.sandboxPolicyId);
      if (sandboxPolicyId) {
        sandboxDecisionPolicyCounts[sandboxPolicyId] = (sandboxDecisionPolicyCounts[sandboxPolicyId] || 0) + 1;
      }
    }
  }

  return {
    eventCounts,
    identitySessionContextBindingStatusCounts,
    identitySessionContextCount: identitySessionContextEvents.length,
    identitySessionContextPolicyCounts,
    identitySessionContextSourceTypeCounts,
    latestIdentitySessionContextEvent: getLatestItem(identitySessionContextEvents, 'at'),
    latestEvent: events.at(-1) || null,
    latestProviderFallbackEvent: getLatestItem(providerFallbackEvents, 'at'),
    latestProviderRouteDecisionEvent: getLatestItem(providerRouteDecisionEvents, 'at'),
    latestSandboxDecisionEvent: getLatestItem(sandboxDecisionEvents, 'at'),
    providerFallbackAttemptCount: providerFallbackEvents.length,
    providerFallbackPolicyCounts,
    providerFallbackPrimaryProviderIds: [
      ...new Set(providerFallbackEvents.map((event) => event.primaryProviderId).filter(Boolean)),
    ],
    providerFallbackStopReasonCounts,
    providerFallbackUsedCount: providerFallbackUsedEvents.length,
    providerFallbackUsedProviderIds: [
      ...new Set(providerFallbackUsedEvents.map((event) => event.providerId).filter(Boolean)),
    ],
    providerRouteDecisionCount: providerRouteDecisionEvents.length,
    providerRouteDecisionPolicyCounts,
    providerRouteDecisionRouteCounts,
    sandboxDecisionCount: sandboxDecisionEvents.length,
    sandboxDecisionModeCounts,
    sandboxDecisionPolicyCounts,
    total: events.length,
    workspaceCounts,
  };
}
