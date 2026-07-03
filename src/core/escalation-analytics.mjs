import { ACTION_OWNERS, ESCALATION_STATUSES, ESCALATION_TIERS } from './constants.mjs';
import {
  deriveEscalationReminderCadenceHours,
  deriveOwnerHandoffReminderCadenceHours,
  deriveOwnerHandoffSlaHours,
} from './escalation-handoff.mjs';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function deriveSlaHoursFromTimestamps(createdAt, dueAt) {
  if (!createdAt || !dueAt) {
    return null;
  }

  const durationMs = new Date(dueAt).getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  return Math.round(durationMs / (60 * 60 * 1000));
}

export function buildInitialTierHistoryEntry(tier, at, reason) {
  return {
    at,
    from: null,
    reason,
    to: tier,
  };
}

export function buildInitialOwnerHistoryEntry(owner, at, reason) {
  return {
    at,
    from: null,
    reason,
    to: owner,
  };
}

export function buildEscalationReminderNote(escalation, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  const tier = escalation.currentTier || deriveEscalationTier(escalation);
  return `Reminder issued while escalation is ${tier}.`;
}

function getMeaningfulOwnerTransitions(ownerHistory) {
  return ensureArray(ownerHistory).filter((entry) => entry.from && entry.to && entry.from !== entry.to);
}

function getLatestOwnerTransition(ownerHistory) {
  return getMeaningfulOwnerTransitions(ownerHistory).at(-1) || null;
}

function getLatestOwnerHandoff(ownerHandoffHistory) {
  return ensureArray(ownerHandoffHistory).at(-1) || null;
}

function hasPendingOwnerHandoff({ ownerHistory, ownerHandoffHistory }) {
  const latestOwnerTransition = getLatestOwnerTransition(ownerHistory);
  if (!latestOwnerTransition) {
    return false;
  }

  return !ensureArray(ownerHandoffHistory).some(
    (entry) => entry.transitionAt === latestOwnerTransition.at && entry.owner === latestOwnerTransition.to,
  );
}

function deriveEffectiveActionOwner({ recommendedOwner, reminderCount, needsReminder, status }) {
  const ownerChain = ['mission-owner', 'workspace-owner', 'human-approver'];
  const baseOwner = ACTION_OWNERS.includes(recommendedOwner) ? recommendedOwner : 'workspace-owner';
  const baseIndex = ownerChain.indexOf(baseOwner);
  const safeIndex = baseIndex === -1 ? ownerChain.indexOf('workspace-owner') : baseIndex;

  if (status !== 'open' || !needsReminder) {
    return {
      effectiveRecommendedOwner: baseOwner,
      ownerEscalationLevel: baseOwner === 'human-approver' ? 'final' : 'base',
      ownerEscalationStep: 0,
    };
  }

  const step = Math.min(Number(reminderCount || 0), ownerChain.length - 1 - safeIndex);
  const effectiveRecommendedOwner = ownerChain[safeIndex + step];
  const ownerEscalationLevel = step === 0 ? 'base' : effectiveRecommendedOwner === 'human-approver' ? 'final' : 'escalated';

  return {
    effectiveRecommendedOwner,
    ownerEscalationLevel,
    ownerEscalationStep: step,
  };
}

export function buildOverdueIncidentTitle(count) {
  return `Overdue Action Escalation (${count} items)`;
}

export function formatIncidentCountMap(counts = {}) {
  return Object.entries(counts)
    .filter(([, count]) => Number(count || 0) > 0)
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

export function buildOverdueIncidentContent({ items, filters, summary }) {
  const filterSummary = [
    filters.actionClass ? `class=${filters.actionClass}` : null,
    filters.providerId ? `provider=${filters.providerId}` : null,
    filters.priority ? `priority=${filters.priority}` : null,
    filters.owner ? `owner=${filters.owner}` : null,
    filters.workspaceId ? `workspace=${filters.workspaceId}` : null,
    filters.missionId ? `mission=${filters.missionId}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const lines = [
    `overdue action count: ${items.length}`,
    `filters: ${filterSummary || 'none'}`,
  ];

  if (summary?.specialistFollowUpStatusCounts?.total > 0) {
    lines.push(`specialist follow-up overdue count: ${summary.specialistFollowUpOverdueCount || 0}`);
    lines.push(`specialist follow-up needs-reminder count: ${summary.specialistFollowUpNeedsReminderCount || 0}`);
    lines.push(`specialist follow-up reminder total: ${summary.specialistFollowUpReminderCountTotal || 0}`);

    const providerSummary = formatIncidentCountMap(summary.specialistFollowUpProviderCounts || {});
    if (providerSummary) {
      lines.push(`specialist follow-up providers: ${providerSummary}`);
    }

    const kindSummary = formatIncidentCountMap(summary.specialistFollowUpKindCounts || {});
    if (kindSummary) {
      lines.push(`specialist follow-up kinds: ${kindSummary}`);
    }

    const retryPolicySummary = formatIncidentCountMap(summary.specialistFollowUpRetryPolicyCounts || {});
    if (retryPolicySummary) {
      lines.push(`specialist follow-up retry policies: ${retryPolicySummary}`);
    }

    const remediationRouteSummary = formatIncidentCountMap(summary.specialistFollowUpRemediationRouteCounts || {});
    if (remediationRouteSummary) {
      lines.push(`specialist follow-up remediation routes: ${remediationRouteSummary}`);
    }

    if (summary.specialistFollowUpLatestReminderAt) {
      lines.push(`specialist follow-up latest reminder at: ${summary.specialistFollowUpLatestReminderAt}`);
    }

    if (summary.specialistFollowUpNextReminderAt) {
      lines.push(`specialist follow-up next reminder at: ${summary.specialistFollowUpNextReminderAt}`);
    }
  }

  if ((summary?.providerHealthDriftOverdueCount || 0) > 0) {
    lines.push(`provider health drift overdue count: ${summary.providerHealthDriftOverdueCount || 0}`);

    const providerSummary = formatIncidentCountMap(summary.providerHealthDriftProviderCounts || {});
    if (providerSummary) {
      lines.push(`provider health drift providers: ${providerSummary}`);
    }

    const reasonSummary = formatIncidentCountMap(summary.providerHealthDriftReasonCodeCounts || {});
    if (reasonSummary) {
      lines.push(`provider health drift reason codes: ${reasonSummary}`);
    }
  }

  if ((summary?.actionCounts?.maintenanceSweep || 0) > 0) {
    lines.push(`maintenance monthly bucket count: ${summary.maintenanceMonthlyBucketCount || 0}`);
    lines.push(`maintenance latest monthly bucket start: ${summary.maintenanceLatestMonthlyBucketStartDate || 'none'}`);
    lines.push(`maintenance oldest monthly bucket start: ${summary.maintenanceOldestMonthlyBucketStartDate || 'none'}`);
    if (summary.maintenanceLatestMonthlyBucketDelta) {
      lines.push(
        `maintenance latest monthly delta: current=${summary.maintenanceLatestMonthlyBucketDelta.currentMonthStartDate || 'none'} previous=${summary.maintenanceLatestMonthlyBucketDelta.previousMonthStartDate || 'none'}`,
      );
    } else {
      lines.push('maintenance latest monthly delta: none');
    }
  }

  for (const item of items) {
    lines.push(
      `[${item.actionClass}/${item.priority}] ${item.title} | workspace=${item.workspaceName} | mission=${item.missionId} | owner=${item.recommendedOwner} | dueAt=${item.dueAt}`,
    );
    lines.push(`command: ${item.recommendedCommand}`);
    if (item.actionClass === 'provider-attention-required' && item.fallbackRecommendedCommand) {
      lines.push(`fallback: ${item.fallbackRecommendedCommand}`);
      if (item.recoverableFallbackRecommendedCommand) {
        lines.push(`fallback recoverable-only: ${item.recoverableFallbackRecommendedCommand}`);
      }
    }
    if (item.actionClass === 'specialist-follow-up-required' && item.remediationRoute) {
      lines.push(
        `route: type=${item.remediationRoute.routeType} urgency=${item.remediationRoute.routeUrgency} reason=${item.remediationRoute.routeReason}`,
      );
      if (item.fallbackRecommendedCommand) {
        lines.push(`fallback: ${item.fallbackRecommendedCommand}`);
      }
    }
    lines.push(`escalation: ${item.escalationRule}`);
  }

  return lines.join('\n');
}

export function deriveEscalationTier(item) {
  if (item.status !== 'open') {
    return 'resolved';
  }

  if (!item.dueAt) {
    return 'normal';
  }

  const nowMs = Date.now();
  const dueMs = new Date(item.dueAt).getTime();
  if (!Number.isFinite(dueMs) || nowMs <= dueMs) {
    return 'normal';
  }

  const overdueHours = (nowMs - dueMs) / (60 * 60 * 1000);
  if (overdueHours >= 24) {
    return 'critical';
  }

  return 'warning';
}

export function isBreachTier(tier) {
  return tier === 'warning' || tier === 'critical';
}

export function enrichEscalation(item) {
  const currentTier = item.currentTier || deriveEscalationTier(item);
  const dueTimestamp = item.dueAt ? new Date(item.dueAt).getTime() : Number.NaN;
  const isOverdue = item.status === 'open' && Number.isFinite(dueTimestamp) ? Date.now() > dueTimestamp : false;
  const reminderCadenceHours = item.status === 'open' ? deriveEscalationReminderCadenceHours(currentTier) : null;
  const reminderBaseTimestamp = item.lastReminderAt || item.createdAt || null;
  const reminderBaseMs = reminderBaseTimestamp ? new Date(reminderBaseTimestamp).getTime() : Number.NaN;
  const nextReminderAt =
    reminderCadenceHours && Number.isFinite(reminderBaseMs)
      ? new Date(reminderBaseMs + reminderCadenceHours * 60 * 60 * 1000).toISOString()
      : null;
  const nextReminderMs = nextReminderAt ? new Date(nextReminderAt).getTime() : Number.NaN;
  const needsReminder = item.status === 'open' && Number.isFinite(nextReminderMs) ? Date.now() >= nextReminderMs : false;
  const ownerSignals = deriveEffectiveActionOwner({
    recommendedOwner: item.recommendedOwner,
    reminderCount: Number(item.reminderCount || 0),
    needsReminder,
    status: item.status,
  });
  const ownerHistory = Array.isArray(item.ownerHistory) ? item.ownerHistory : [];
  const ownerHandoffHistory = Array.isArray(item.ownerHandoffHistory) ? item.ownerHandoffHistory : [];
  const ownerHandoffReminderHistory = Array.isArray(item.ownerHandoffReminderHistory) ? item.ownerHandoffReminderHistory : [];
  const latestOwnerTransition = getLatestOwnerTransition(ownerHistory);
  const latestOwnerHandoff = getLatestOwnerHandoff(ownerHandoffHistory);
  const pendingOwnerHandoff = item.status === 'open' && hasPendingOwnerHandoff({ ownerHistory, ownerHandoffHistory });
  const ownerHandoffTargetOwner = latestOwnerTransition?.to || null;
  const ownerHandoffSlaHours =
    pendingOwnerHandoff && ownerHandoffTargetOwner ? deriveOwnerHandoffSlaHours(ownerHandoffTargetOwner) : null;
  const ownerHandoffDueAt =
    pendingOwnerHandoff && ownerHandoffSlaHours && latestOwnerTransition?.at
      ? new Date(new Date(latestOwnerTransition.at).getTime() + ownerHandoffSlaHours * 60 * 60 * 1000).toISOString()
      : null;
  const ownerHandoffDueMs = ownerHandoffDueAt ? new Date(ownerHandoffDueAt).getTime() : Number.NaN;
  const ownerHandoffIsOverdue =
    pendingOwnerHandoff && Number.isFinite(ownerHandoffDueMs) ? Date.now() > ownerHandoffDueMs : false;
  const latestOwnerHandoffReminder = ownerHandoffReminderHistory.at(-1) || null;
  const ownerHandoffReminderCadenceHours =
    pendingOwnerHandoff && ownerHandoffTargetOwner ? deriveOwnerHandoffReminderCadenceHours(ownerHandoffTargetOwner) : null;
  const ownerHandoffReminderBaseTimestamp = latestOwnerHandoffReminder?.at || ownerHandoffDueAt || null;
  const ownerHandoffReminderBaseMs = ownerHandoffReminderBaseTimestamp
    ? new Date(ownerHandoffReminderBaseTimestamp).getTime()
    : Number.NaN;
  const nextOwnerHandoffReminderAt =
    pendingOwnerHandoff && ownerHandoffIsOverdue && Number.isFinite(ownerHandoffReminderBaseMs)
      ? latestOwnerHandoffReminder
        ? new Date(
            ownerHandoffReminderBaseMs + Number(ownerHandoffReminderCadenceHours || 0) * 60 * 60 * 1000,
          ).toISOString()
        : ownerHandoffDueAt
      : null;
  const nextOwnerHandoffReminderMs = nextOwnerHandoffReminderAt
    ? new Date(nextOwnerHandoffReminderAt).getTime()
    : Number.NaN;
  const ownerHandoffNeedsReminder =
    pendingOwnerHandoff && ownerHandoffIsOverdue && Number.isFinite(nextOwnerHandoffReminderMs)
      ? Date.now() >= nextOwnerHandoffReminderMs
      : false;

  return {
    ...item,
    breachCount: Number(item.breachCount || 0),
    currentTier,
    currentEffectiveOwner: item.currentEffectiveOwner || ownerSignals.effectiveRecommendedOwner,
    escalationTier: currentTier,
    escalationTierHistoryCount: Array.isArray(item.tierHistory) ? item.tierHistory.length : 0,
    isOverdue,
    lastBreachAt: item.lastBreachAt || null,
    lastOwnerEscalatedAt: item.lastOwnerEscalatedAt || null,
    lastReminderAt: item.lastReminderAt || null,
    lastSyncedAt: item.lastSyncedAt || null,
    needsReminder,
    nextReminderAt,
    effectiveRecommendedOwner: ownerSignals.effectiveRecommendedOwner,
    ownerEscalationLevel: ownerSignals.ownerEscalationLevel,
    ownerEscalationStep: ownerSignals.ownerEscalationStep,
    ownerHandoffHistory,
    ownerHandoffHistoryCount: ownerHandoffHistory.length,
    ownerHandoffCount: ownerHandoffHistory.length,
    ownerHistory,
    ownerHistoryCount: ownerHistory.length,
    latestOwnerHandoff,
    latestOwnerHandoffAt: item.lastOwnerHandoffAt || latestOwnerHandoff?.at || null,
    latestOwnerHandoffReminder,
    latestOwnerHandoffReminderAt: item.lastOwnerHandoffReminderAt || latestOwnerHandoffReminder?.at || null,
    latestOwnerTransition,
    ownerHandoffDueAt,
    ownerHandoffIsOverdue,
    ownerHandoffNeedsReminder,
    ownerHandoffReminderCadenceHours,
    ownerHandoffReminderCount: ownerHandoffReminderHistory.length,
    ownerHandoffReminderHistory,
    ownerHandoffReminderHistoryCount: ownerHandoffReminderHistory.length,
    ownerHandoffSlaHours,
    ownerHandoffTargetOwner,
    nextOwnerHandoffReminderAt,
    pendingOwnerHandoff,
    reminderCadenceHours,
    reminderCount: Number(item.reminderCount || 0),
    reminderHistory: Array.isArray(item.reminderHistory) ? item.reminderHistory : [],
    reminderHistoryCount: Array.isArray(item.reminderHistory) ? item.reminderHistory.length : 0,
    tierHistory: Array.isArray(item.tierHistory) ? item.tierHistory : [],
  };
}

export function summarizeEscalations(items) {
  const enrichedItems = items.map((item) => enrichEscalation(item));
  const ownerCounts = {};
  const priorityCounts = {};
  const effectiveOwnerCounts = {};
  const statusCounts = {
    ...Object.fromEntries(ESCALATION_STATUSES.map((status) => [status, 0])),
    total: enrichedItems.length,
  };
  const tierCounts = {
    ...Object.fromEntries(ESCALATION_TIERS.map((tier) => [tier, 0])),
  };
  const workspaceCounts = {};
  let breachCountTotal = 0;
  let latestReminderAt = null;
  let latestOwnerEscalatedAt = null;
  let latestOwnerHandoffAt = null;
  let latestOwnerHandoffReminderAt = null;
  let needsReminderCount = 0;
  let pendingOwnerHandoffCount = 0;
  let pendingOwnerHandoffNeedsReminderCount = 0;
  let pendingOwnerHandoffOverdueCount = 0;
  let ownerHandoffCountTotal = 0;
  let ownerHandoffReminderCountTotal = 0;
  let ownerTransitionCountTotal = 0;
  let nextPendingOwnerHandoffDueAt = null;
  let nextPendingOwnerHandoffReminderAt = null;
  let reminderCountTotal = 0;

  for (const item of enrichedItems) {
    workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
    ownerCounts[item.recommendedOwner] = (ownerCounts[item.recommendedOwner] || 0) + 1;
    effectiveOwnerCounts[item.effectiveRecommendedOwner] = (effectiveOwnerCounts[item.effectiveRecommendedOwner] || 0) + 1;
    priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    tierCounts[item.escalationTier] = (tierCounts[item.escalationTier] || 0) + 1;
    breachCountTotal += Number(item.breachCount || 0);
    reminderCountTotal += Number(item.reminderCount || 0);
    ownerHandoffCountTotal += Number(item.ownerHandoffCount || 0);
    ownerHandoffReminderCountTotal += Number(item.ownerHandoffReminderCount || 0);
    ownerTransitionCountTotal += Math.max(0, Number(item.ownerHistoryCount || 0) - 1);
    if (item.needsReminder) {
      needsReminderCount += 1;
    }
    if (item.pendingOwnerHandoff) {
      pendingOwnerHandoffCount += 1;
      if (item.ownerHandoffIsOverdue) {
        pendingOwnerHandoffOverdueCount += 1;
      }
      if (item.ownerHandoffNeedsReminder) {
        pendingOwnerHandoffNeedsReminderCount += 1;
      }
      if (
        item.ownerHandoffDueAt &&
        (!nextPendingOwnerHandoffDueAt || String(nextPendingOwnerHandoffDueAt) > String(item.ownerHandoffDueAt))
      ) {
        nextPendingOwnerHandoffDueAt = item.ownerHandoffDueAt;
      }
      if (
        item.ownerHandoffNeedsReminder &&
        item.nextOwnerHandoffReminderAt &&
        (!nextPendingOwnerHandoffReminderAt ||
          String(nextPendingOwnerHandoffReminderAt) > String(item.nextOwnerHandoffReminderAt))
      ) {
        nextPendingOwnerHandoffReminderAt = item.nextOwnerHandoffReminderAt;
      }
    }
    if (item.latestOwnerHandoffAt && (!latestOwnerHandoffAt || String(latestOwnerHandoffAt) < String(item.latestOwnerHandoffAt))) {
      latestOwnerHandoffAt = item.latestOwnerHandoffAt;
    }
    if (
      item.latestOwnerHandoffReminderAt &&
      (!latestOwnerHandoffReminderAt || String(latestOwnerHandoffReminderAt) < String(item.latestOwnerHandoffReminderAt))
    ) {
      latestOwnerHandoffReminderAt = item.latestOwnerHandoffReminderAt;
    }
    if (
      item.lastOwnerEscalatedAt &&
      (!latestOwnerEscalatedAt || String(latestOwnerEscalatedAt) < String(item.lastOwnerEscalatedAt))
    ) {
      latestOwnerEscalatedAt = item.lastOwnerEscalatedAt;
    }
    if (item.lastReminderAt && (!latestReminderAt || String(latestReminderAt) < String(item.lastReminderAt))) {
      latestReminderAt = item.lastReminderAt;
    }
  }

  return {
    latestEscalation:
      [...enrichedItems]
        .sort((left, right) =>
          String(left.updatedAt || left.createdAt || '').localeCompare(String(right.updatedAt || right.createdAt || '')),
        )
        .at(-1) || null,
    openEscalationIds: enrichedItems.filter((item) => item.status === 'open').map((item) => item.id),
    effectiveOwnerCounts,
    ownerCounts,
    pendingEscalationCount: enrichedItems.filter((item) => item.status === 'open').length,
    priorityCounts,
    statusCounts,
    tierCounts,
    breachCountTotal,
    latestOwnerHandoffAt,
    latestOwnerHandoffReminderAt,
    latestReminderAt,
    latestOwnerEscalatedAt,
    needsReminderCount,
    nextPendingOwnerHandoffDueAt,
    nextPendingOwnerHandoffReminderAt,
    ownerHandoffCountTotal,
    ownerHandoffReminderCountTotal,
    ownerTransitionCountTotal,
    pendingOwnerHandoffCount,
    pendingOwnerHandoffNeedsReminderCount,
    pendingOwnerHandoffOverdueCount,
    reminderCountTotal,
    total: enrichedItems.length,
    workspaceCounts,
  };
}
