import { ACTION_OWNERS, ACTION_PRIORITIES } from './constants.mjs';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Action inbox summarize/read domain.
 *
 * Instantiated once inside createMissionService. This module owns the
 * read/summarize half of the action-inbox domain: the reminder-state
 * derivation, the provider-health-drift summarizer, and the top-level
 * `summarizeActionInbox` roll-up.
 *
 * Mission-service retains validation, escalation sync, store access, and the
 * action item builders. This module receives those collected items and owns
 * the filtering, ordering, summary, and response payload.
 *
 * `summarizeSpecialistFollowUpItems` is a pure module-scope helper in
 * mission-service that the roll-up needs; it is INJECTED rather than moved so
 * its other call sites stay put.
 */
export function createActionInbox({ summarizeSpecialistFollowUpItems }) {
  function summarizeProviderHealthDriftItems(items) {
    const providerCounts = {};
    const workspaceCounts = {};
    const reasonCodeCounts = {};
    let overdueCount = 0;

    for (const item of items) {
      if (item.providerId) {
        providerCounts[item.providerId] = (providerCounts[item.providerId] || 0) + 1;
      }
      if (item.workspaceId) {
        workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
      }
      for (const reasonCode of ensureArray(item.driftReasonCodes)) {
        reasonCodeCounts[reasonCode] = (reasonCodeCounts[reasonCode] || 0) + 1;
      }
      if (item.isOverdue) {
        overdueCount += 1;
      }
    }

    return {
      latestItem: items.at(-1) || null,
      overdueCount,
      providerCounts,
      reasonCodeCounts,
      total: items.length,
      workspaceCounts,
    };
  }

  function getActionInboxReminderState(item) {
    const nextReminderAt = item.nextReminderAt || item.handoffNextReminderAt || null;
    const lastReminderAt = item.lastReminderAt || item.handoffLatestReminderAt || null;
    const reminderCadenceHours = item.reminderCadenceHours || item.handoffReminderCadenceHours || null;
    const reminderCount = Number.isFinite(Number(item.reminderCount))
      ? Number(item.reminderCount)
      : Number(item.handoffReminderCount || 0);
    const needsReminder = Boolean(item.needsReminder || item.handoffNeedsReminder);
    const hasReminder =
      item.actionClass === 'monitoring-required' ||
      item.actionClass === 'handoff-required' ||
      Boolean(nextReminderAt) ||
      Boolean(lastReminderAt) ||
      Boolean(reminderCadenceHours) ||
      reminderCount > 0;

    return {
      hasReminder,
      lastReminderAt,
      needsReminder,
      nextReminderAt,
      reminderCadenceHours,
      reminderCount,
    };
  }

  function summarizeActionInbox(items) {
    const specialistFollowUpSummary = summarizeSpecialistFollowUpItems(
      items.filter((item) => item.actionClass === 'specialist-follow-up-required'),
    );
    const providerHealthDriftSummary = summarizeProviderHealthDriftItems(
      items.filter((item) => item.actionClass === 'provider-health-drift-required'),
    );
    const providerCounts = {};
    const workspaceCounts = {};
    const actionClassCounts = {
      awaitingHumanDecision: 0,
      blocked: 0,
      providerHealthDriftRequired: 0,
      handoffRequired: 0,
      maintenanceRequired: 0,
      monitoringRequired: 0,
      providerAttentionRequired: 0,
      retryReady: 0,
      specialistFollowUpRequired: 0,
      total: items.length,
    };
    const actionCounts = {
      acceptedRiskMonitoring: 0,
      approval: 0,
      blockedFollowUp: 0,
      learningPromotion: 0,
      maintenanceSweep: 0,
      ownerHandoff: 0,
      providerAttention: 0,
      providerHealthDrift: 0,
      reviewerFollowUp: 0,
      specialistFollowUp: 0,
      total: items.length,
    };
    const ownerCounts = Object.fromEntries(ACTION_OWNERS.map((owner) => [owner, 0]));
    const effectiveOwnerCounts = Object.fromEntries(ACTION_OWNERS.map((owner) => [owner, 0]));
    const priorityCounts = Object.fromEntries(ACTION_PRIORITIES.map((priority) => [priority, 0]));
    const reminderCounts = {
      eligible: 0,
      needsReminder: 0,
      notNeeded: 0,
      total: items.length,
    };
    const overdueCounts = {
      overdue: 0,
      onTime: 0,
      total: items.length,
    };
    let latestReminderAt = null;
    let nextReminderAt = null;

    for (const item of items) {
      if (item.providerId) {
        providerCounts[item.providerId] = (providerCounts[item.providerId] || 0) + 1;
      }

      if (item.workspaceId) {
        workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
      }

      if (item.actionType === 'approval') {
        actionCounts.approval += 1;
      }

      if (item.actionType === 'accepted-risk-monitoring') {
        actionCounts.acceptedRiskMonitoring += 1;
      }

      if (item.actionType === 'blocked-follow-up') {
        actionCounts.blockedFollowUp += 1;
      }

      if (item.actionType === 'learning-promotion') {
        actionCounts.learningPromotion += 1;
      }

      if (item.actionType === 'maintenance-sweep') {
        actionCounts.maintenanceSweep += 1;
      }

      if (item.actionType === 'owner-handoff') {
        actionCounts.ownerHandoff += 1;
      }

      if (item.actionType === 'provider-attention') {
        actionCounts.providerAttention += 1;
      }

      if (item.actionType === 'provider-health-drift') {
        actionCounts.providerHealthDrift += 1;
      }

      if (item.actionType === 'reviewer-follow-up') {
        actionCounts.reviewerFollowUp += 1;
      }

      if (item.actionType === 'specialist-follow-up') {
        actionCounts.specialistFollowUp += 1;
      }

      if (item.actionClass === 'awaiting-human-decision') {
        actionClassCounts.awaitingHumanDecision += 1;
      }

      if (item.actionClass === 'blocked') {
        actionClassCounts.blocked += 1;
      }

      if (item.actionClass === 'handoff-required') {
        actionClassCounts.handoffRequired += 1;
      }

      if (item.actionClass === 'maintenance-required') {
        actionClassCounts.maintenanceRequired += 1;
      }

      if (item.actionClass === 'monitoring-required') {
        actionClassCounts.monitoringRequired += 1;
      }

      if (item.actionClass === 'provider-attention-required') {
        actionClassCounts.providerAttentionRequired += 1;
      }

      if (item.actionClass === 'provider-health-drift-required') {
        actionClassCounts.providerHealthDriftRequired += 1;
      }

      if (item.actionClass === 'retry-ready') {
        actionClassCounts.retryReady += 1;
      }

      if (item.actionClass === 'specialist-follow-up-required') {
        actionClassCounts.specialistFollowUpRequired += 1;
      }

      if (ownerCounts[item.recommendedOwner] !== undefined) {
        ownerCounts[item.recommendedOwner] += 1;
      }

      if (effectiveOwnerCounts[item.effectiveRecommendedOwner || item.recommendedOwner] !== undefined) {
        effectiveOwnerCounts[item.effectiveRecommendedOwner || item.recommendedOwner] += 1;
      }

      if (priorityCounts[item.priority] !== undefined) {
        priorityCounts[item.priority] += 1;
      }

      const reminderState = getActionInboxReminderState(item);

      if (reminderState.hasReminder) {
        reminderCounts.eligible += 1;

        if (reminderState.needsReminder) {
          reminderCounts.needsReminder += 1;
        } else {
          reminderCounts.notNeeded += 1;
        }

        if (
          reminderState.nextReminderAt &&
          (!nextReminderAt || String(nextReminderAt) > String(reminderState.nextReminderAt))
        ) {
          nextReminderAt = reminderState.nextReminderAt;
        }

        if (
          reminderState.lastReminderAt &&
          (!latestReminderAt || String(latestReminderAt) < String(reminderState.lastReminderAt))
        ) {
          latestReminderAt = reminderState.lastReminderAt;
        }
      }

      if (item.isOverdue) {
        overdueCounts.overdue += 1;
      } else {
        overdueCounts.onTime += 1;
      }
    }

    return {
      actionCounts,
      actionClassCounts,
      effectiveOwnerCounts,
      ownerCounts,
      pendingActionCount: items.length,
      priorityCounts,
      providerCounts,
      reminderCounts,
      latestReminderAt,
      nextReminderAt,
      overdueCounts,
      providerHealthDriftOverdueCount: providerHealthDriftSummary.overdueCount,
      providerHealthDriftProviderCounts: providerHealthDriftSummary.providerCounts,
      providerHealthDriftReasonCodeCounts: providerHealthDriftSummary.reasonCodeCounts,
      specialistFollowUpKindCounts: specialistFollowUpSummary.specialistKindCounts,
      specialistFollowUpLatestReminderAt: specialistFollowUpSummary.latestReminderAt,
      specialistFollowUpNeedsReminderCount: specialistFollowUpSummary.needsReminderCount,
      specialistFollowUpNextReminderAt: specialistFollowUpSummary.nextReminderAt,
      specialistFollowUpOverdueCount: specialistFollowUpSummary.overdueCount,
      specialistFollowUpProviderCounts: specialistFollowUpSummary.providerCounts,
      specialistFollowUpRemediationRouteCounts: specialistFollowUpSummary.remediationRouteCounts,
      specialistFollowUpReminderCountTotal: specialistFollowUpSummary.reminderCountTotal,
      specialistFollowUpRetryPolicyCounts: specialistFollowUpSummary.retryPolicyCounts,
      specialistFollowUpStatusCounts: specialistFollowUpSummary.statusCounts,
      workspaceCounts,
    };
  }

  function selectActionInboxItems(items, { filter = {}, providerFallbackStopReason = '' } = {}) {
    return items
      .filter((item) => {
        if (filter.actionClass && item.actionClass !== filter.actionClass) {
          return false;
        }
        if (filter.providerId && item.providerId !== filter.providerId) {
          return false;
        }
        if (filter.priority && item.priority !== filter.priority) {
          return false;
        }
        if (filter.owner && item.recommendedOwner !== filter.owner) {
          return false;
        }
        if (filter.effectiveOwner && (item.effectiveRecommendedOwner || item.recommendedOwner) !== filter.effectiveOwner) {
          return false;
        }
        if (filter.needsReminderOnly && !getActionInboxReminderState(item).needsReminder) {
          return false;
        }
        if (filter.overdueOnly && !item.isOverdue) {
          return false;
        }
        if (
          providerFallbackStopReason &&
          Number(item.providerFallbackStopReasonCounts?.[providerFallbackStopReason] || 0) <= 0
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildActionInboxReadModel({
    filter = {},
    items,
    maintenanceLatestMonthlyBucketDelta = null,
    maintenanceMonthlyBuckets = [],
    providerFallbackStopReason = '',
  }) {
    const summary = summarizeActionInbox(items);

    summary.maintenanceMonthlyBucketCount = maintenanceMonthlyBuckets.length;
    summary.maintenanceLatestMonthlyBucketStartDate = maintenanceMonthlyBuckets[0]?.monthStartDate || null;
    summary.maintenanceOldestMonthlyBucketStartDate = maintenanceMonthlyBuckets.at(-1)?.monthStartDate || null;
    summary.maintenanceLatestMonthlyBucketDelta = maintenanceLatestMonthlyBucketDelta;

    return {
      filters: {
        actionClass: filter.actionClass || null,
        effectiveOwner: filter.effectiveOwner || null,
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        providerFallbackStopReason: providerFallbackStopReason || null,
        priority: filter.priority || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary,
    };
  }

  return {
    buildActionInboxReadModel,
    summarizeProviderHealthDriftItems,
    getActionInboxReminderState,
    selectActionInboxItems,
    summarizeActionInbox,
  };
}
