import {
  ACTION_CLASSES,
  ACTION_OWNERS,
  ACTION_PRIORITIES,
} from './constants.mjs';
import {
  buildMaintenanceLatestMonthlyBucketDelta,
  buildMaintenanceMonthlyBuckets,
} from './maintenance-analytics.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function createActionInboxService({
  buildAcceptedRiskMonitoringItems,
  buildActionInboxReadModel,
  buildApprovalInboxItems,
  buildBlockedFollowUpItems,
  buildMaintenanceActionItems,
  buildOwnerHandoffActionItems,
  buildProviderAttentionItems,
  buildProviderHealthDriftActionItems,
  buildReviewerFollowUpItems,
  buildSpecialistFollowUpItems,
  getMission,
  getWorkspace,
  listLearningPromotionItems,
  listMaintenanceOverviewRuns,
  providerRegistry,
  selectActionInboxItems,
  syncEscalations,
}) {
  function getActionInbox(filter = {}) {
    const providerFallbackStopReason = normalizeText(filter.providerFallbackStopReason || filter.fallbackStopReason);

    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.actionClass && !ACTION_CLASSES.includes(filter.actionClass)) {
      throw new Error(`Unsupported action class: ${filter.actionClass}`);
    }
    if (filter.priority && !ACTION_PRIORITIES.includes(filter.priority)) {
      throw new Error(`Unsupported action priority: ${filter.priority}`);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.effectiveOwner && !ACTION_OWNERS.includes(filter.effectiveOwner)) {
      throw new Error(`Unsupported effective action owner: ${filter.effectiveOwner}`);
    }

    syncEscalations({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });

    const collectedItems = [
      ...buildApprovalInboxItems(filter),
      ...buildMaintenanceActionItems(filter),
      ...buildOwnerHandoffActionItems(filter),
      ...buildProviderAttentionItems(filter),
      ...buildProviderHealthDriftActionItems(filter),
      ...buildSpecialistFollowUpItems(filter),
      ...listLearningPromotionItems({ ...filter, promotionStatus: filter.promotionStatus || 'operator-active' }),
      ...buildAcceptedRiskMonitoringItems(filter),
      ...buildBlockedFollowUpItems(filter),
      ...buildReviewerFollowUpItems(filter),
    ];
    const items = selectActionInboxItems(collectedItems, { filter, providerFallbackStopReason });
    let maintenanceLatestMonthlyBucketDelta = null;
    let maintenanceMonthlyBuckets = [];

    if (items.some((item) => item.actionType === 'maintenance-sweep') && !filter.providerId) {
      const maintenanceOverviewRuns = listMaintenanceOverviewRuns({
        missionId: filter.missionId,
        owner: filter.owner,
        workspaceId: filter.workspaceId,
      });
      maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(maintenanceOverviewRuns);
      maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);
    }

    return buildActionInboxReadModel({
      filter,
      items,
      maintenanceLatestMonthlyBucketDelta,
      maintenanceMonthlyBuckets,
      providerFallbackStopReason,
    });
  }

  return { getActionInbox };
}
