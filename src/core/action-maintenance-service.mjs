import {
  ACTION_OWNERS,
  MAINTENANCE_RUN_OUTCOMES,
} from './constants.mjs';
import { createId } from './id.mjs';
import { prepareActionMaintenanceRun } from './action-maintenance-run.mjs';
import {
  buildMaintenanceDailyBuckets,
  buildMaintenanceLatestBucketDelta,
  buildMaintenanceLatestMonthlyBucketDelta,
  buildMaintenanceLatestWeeklyBucketDelta,
  buildMaintenanceMonthlyBuckets,
  buildMaintenanceWeeklyBuckets,
  summarizeMaintenancePressure,
  summarizeMaintenanceRuns,
} from './maintenance-analytics.mjs';
import {
  buildOverdueIncidentContent,
  buildOverdueIncidentTitle,
} from './escalation-analytics.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeTimestampFilter(value, label) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }

  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid ${label}: ${normalized}`);
  }

  return new Date(timestamp).toISOString();
}

export function createActionMaintenanceService({
  getActionInbox,
  getMission,
  getWorkspace,
  listMaintenanceOverviewRuns,
  listMaintenancePressureEntries,
  logIncidentDocument,
  now,
  remindEscalations,
  remindOwnerHandoffs,
  remindProviderAttention,
  remindSpecialistFollowUps,
  store,
  summarizeMissionMaintenanceImpact,
  syncEscalations,
}) {
  function logOverdueActions(filter = {}) {
    const overdueInbox = getActionInbox({
      ...filter,
      overdueOnly: true,
    });

    if (!overdueInbox.items.length) {
      return {
        count: 0,
        filters: overdueInbox.filters,
        logged: false,
        path: null,
        title: null,
      };
    }

    const title = buildOverdueIncidentTitle(overdueInbox.items.length);
    const summary = overdueInbox.summary;
    const content = buildOverdueIncidentContent({
      filters: overdueInbox.filters,
      items: overdueInbox.items,
      summary,
    });
    const path = logIncidentDocument({ content, title });
    const escalationIds = overdueInbox.items.map((item) => {
      const existingOpenEscalation = store
        .listEscalations({ actionId: item.actionId, status: 'open' })
        .at(-1) || null;

      if (existingOpenEscalation) {
        return store.updateEscalation(existingOpenEscalation.id, (escalation) => ({
          ...escalation,
          dueAt: item.dueAt,
          escalationRule: item.escalationRule,
          incidentPath: path,
          incidentTitle: title,
          isOverdue: item.isOverdue,
          lastSeenAt: now(),
          priority: item.priority,
          recommendedCommand: item.recommendedCommand,
          recommendedOwner: item.recommendedOwner,
          title: item.title,
          updatedAt: now(),
        })).id;
      }

      return store.saveEscalation({
        id: createId('escalation'),
        actionId: item.actionId,
        actionClass: item.actionClass,
        actionType: item.actionType,
        dueAt: item.dueAt,
        escalationRule: item.escalationRule,
        incidentPath: path,
        incidentTitle: title,
        isOverdue: item.isOverdue,
        lastSeenAt: now(),
        missionId: item.missionId,
        priority: item.priority,
        reason: item.reason,
        recommendedCommand: item.recommendedCommand,
        recommendedOwner: item.recommendedOwner,
        resolutionNote: '',
        resolvedAt: null,
        sessionId: item.sessionId,
        status: 'open',
        title: item.title,
        workspaceId: item.workspaceId,
        workspaceName: item.workspaceName,
        reminderCount: 0,
        reminderHistory: [],
        lastReminderAt: null,
        createdAt: now(),
        updatedAt: now(),
      }).id;
    });

    return {
      count: overdueInbox.items.length,
      escalationIds,
      filters: overdueInbox.filters,
      itemIds: overdueInbox.items.map((item) => item.actionId),
      logged: true,
      path,
      summary,
      title,
    };
  }

  function runActionMaintenance(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    const note = normalizeText(filter.note);
    const pressureFilter = {
      missionId: filter.missionId,
      owner: filter.owner,
      workspaceId: filter.workspaceId,
    };
    const beforePressure = listMaintenancePressureEntries(pressureFilter);
    const sync = syncEscalations({
      ...pressureFilter,
      status: 'open',
    });
    const escalationReminders = remindEscalations({
      ...pressureFilter,
      dueOnly: true,
      excludePendingOwnerHandoff: true,
      note,
    });
    const ownerHandoffReminders = remindOwnerHandoffs(
      { ...pressureFilter, dueOnly: true },
      note,
    );
    const providerAttentionReminders = remindProviderAttention(
      { ...pressureFilter, dueOnly: true },
      note,
    );
    const specialistFollowUpReminders = remindSpecialistFollowUps(
      { ...pressureFilter, dueOnly: true },
      note,
    );
    const afterPressure = listMaintenancePressureEntries(pressureFilter);
    const preparedRun = prepareActionMaintenanceRun({
      afterPressure,
      beforePressure,
      createdAt: now(),
      escalationReminders,
      filter,
      id: createId('maintenance'),
      note,
      ownerHandoffReminders,
      providerAttentionReminders,
      specialistFollowUpReminders,
      syncSummary: sync.summary,
    });
    const maintenanceRun = store.saveMaintenanceRun(preparedRun.record);
    const summary = preparedRun.summary;
    const maintenanceOverviewRuns = listMaintenanceOverviewRuns(pressureFilter);
    const maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(maintenanceOverviewRuns);
    const maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);

    summary.maintenanceMonthlyBucketCount = maintenanceMonthlyBuckets.length;
    summary.maintenanceLatestMonthlyBucketStartDate = maintenanceMonthlyBuckets[0]?.monthStartDate || null;
    summary.maintenanceOldestMonthlyBucketStartDate = maintenanceMonthlyBuckets.at(-1)?.monthStartDate || null;
    summary.maintenanceLatestMonthlyBucketDelta = maintenanceLatestMonthlyBucketDelta;

    return {
      escalationReminders,
      filters: {
        missionId: filter.missionId || null,
        note: note || null,
        owner: filter.owner || null,
        workspaceId: filter.workspaceId || null,
      },
      maintenanceRun,
      ownerHandoffReminders,
      providerAttentionReminders,
      specialistFollowUpReminders,
      summary,
      sync,
    };
  }

  function getMaintenanceOverview(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.outcome && !MAINTENANCE_RUN_OUTCOMES.includes(filter.outcome)) {
      throw new Error(`Unsupported maintenance run outcome: ${filter.outcome}`);
    }

    const since = normalizeTimestampFilter(filter.since, 'maintenance since timestamp');
    const items = listMaintenanceOverviewRuns({ ...filter, since });
    const current = listMaintenancePressureEntries(filter);
    const dailyBuckets = buildMaintenanceDailyBuckets(items);
    const weeklyBuckets = buildMaintenanceWeeklyBuckets(items);
    const monthlyBuckets = buildMaintenanceMonthlyBuckets(items);
    const latestBucketDelta = buildMaintenanceLatestBucketDelta(dailyBuckets);
    const latestWeeklyBucketDelta = buildMaintenanceLatestWeeklyBucketDelta(weeklyBuckets);
    const latestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(monthlyBuckets);
    const missionImpactSummary = filter.missionId ? summarizeMissionMaintenanceImpact(filter.missionId, items) : null;

    return {
      current,
      filters: {
        missionId: filter.missionId || null,
        outcome: filter.outcome || null,
        owner: filter.owner || null,
        since: since || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        ...summarizeMaintenanceRuns(items),
        ...summarizeMaintenancePressure(current),
        bucketCount: dailyBuckets.length,
        dailyBuckets,
        latestBucketDate: dailyBuckets[0]?.date || null,
        latestBucketDelta,
        latestMonthlyBucketDelta,
        latestWeeklyBucketDelta,
        latestMonthlyBucketStartDate: monthlyBuckets[0]?.monthStartDate || null,
        oldestBucketDate: dailyBuckets.at(-1)?.date || null,
        oldestMonthlyBucketStartDate: monthlyBuckets.at(-1)?.monthStartDate || null,
        oldestWeeklyBucketStartDate: weeklyBuckets.at(-1)?.weekStartDate || null,
        monthlyBucketCount: monthlyBuckets.length,
        monthlyBuckets,
        weeklyBucketCount: weeklyBuckets.length,
        weeklyBuckets,
        latestWeeklyBucketStartDate: weeklyBuckets[0]?.weekStartDate || null,
        ...(missionImpactSummary
          ? {
              latestMissionImpactRun: missionImpactSummary.latestRun,
              latestMissionImpactRunAt: missionImpactSummary.latestRunAt,
              missionImpactEscalationRemindedCountTotal: missionImpactSummary.escalationRemindedCountTotal,
              missionImpactOwnerHandoffRemindedCountTotal: missionImpactSummary.ownerHandoffRemindedCountTotal,
              missionImpactProviderAttentionRemindedCountTotal:
                missionImpactSummary.providerAttentionRemindedCountTotal,
              missionImpactSpecialistFollowUpRemindedCountTotal:
                missionImpactSummary.specialistFollowUpRemindedCountTotal,
              missionImpactRunCount: missionImpactSummary.runCount,
              missionImpactTotalRemindedCount: missionImpactSummary.totalRemindedCount,
            }
          : {}),
      },
    };
  }

  return {
    getMaintenanceOverview,
    logOverdueActions,
    runActionMaintenance,
  };
}
