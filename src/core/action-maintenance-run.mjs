import { summarizeMaintenancePressure } from './maintenance-analytics.mjs';

function addAffectedMissionItems(summaryMap, items, countField) {
  for (const item of items) {
    if (!item.missionId) {
      continue;
    }

    const current = summaryMap.get(item.missionId) || {
      escalationRemindedCount: 0,
      missionId: item.missionId,
      ownerHandoffRemindedCount: 0,
      providerAttentionRemindedCount: 0,
      specialistFollowUpRemindedCount: 0,
      totalRemindedCount: 0,
    };
    current[countField] += 1;
    current.totalRemindedCount += 1;
    summaryMap.set(item.missionId, current);
  }
}

function getLatestReminderAt(reminderResults) {
  const latestReminderAt = reminderResults
    .map((result) => result.summary.latestReminderAt)
    .filter(Boolean)
    .sort((left, right) => String(left).localeCompare(String(right)))
    .at(-1);

  return latestReminderAt || null;
}

export function prepareActionMaintenanceRun({
  afterPressure,
  beforePressure,
  createdAt,
  escalationReminders,
  filter,
  id,
  note,
  ownerHandoffReminders,
  providerAttentionReminders,
  specialistFollowUpReminders,
  syncSummary,
}) {
  const beforePressureSummary = summarizeMaintenancePressure(beforePressure);
  const afterPressureSummary = summarizeMaintenancePressure(afterPressure);
  const afterPressureIds = new Set(afterPressure.map((entry) => entry.actionId));
  const acknowledgedActionIds = beforePressure.map((entry) => entry.actionId);
  const resolvedActionIds = acknowledgedActionIds.filter((actionId) => !afterPressureIds.has(actionId));
  const remainingActionIds = afterPressure.map((entry) => entry.actionId);
  const affectedMissionSummaryMap = new Map();

  addAffectedMissionItems(affectedMissionSummaryMap, escalationReminders.items, 'escalationRemindedCount');
  addAffectedMissionItems(affectedMissionSummaryMap, ownerHandoffReminders.items, 'ownerHandoffRemindedCount');
  addAffectedMissionItems(affectedMissionSummaryMap, providerAttentionReminders.items, 'providerAttentionRemindedCount');
  addAffectedMissionItems(
    affectedMissionSummaryMap,
    specialistFollowUpReminders.items,
    'specialistFollowUpRemindedCount',
  );

  const affectedMissionSummaries = [...affectedMissionSummaryMap.values()].sort((left, right) =>
    String(left.missionId).localeCompare(String(right.missionId)),
  );
  const affectedMissionIds = affectedMissionSummaries.map((item) => item.missionId);
  const dueCandidateCountTotal =
    Number(escalationReminders.summary.dueCandidateCount || 0) +
    Number(ownerHandoffReminders.summary.dueCandidateCount || 0) +
    Number(providerAttentionReminders.summary.dueCandidateCount || 0) +
    Number(specialistFollowUpReminders.summary.dueCandidateCount || 0);
  const totalRemindedCount =
    Number(escalationReminders.summary.remindedCount || 0) +
    Number(ownerHandoffReminders.summary.remindedCount || 0) +
    Number(providerAttentionReminders.summary.remindedCount || 0) +
    Number(specialistFollowUpReminders.summary.remindedCount || 0);
  const summary = {
    acknowledgedMaintenanceRequiredCount: acknowledgedActionIds.length,
    afterDueCandidateCountTotal: Number(afterPressureSummary.currentDueCandidateCountTotal || 0),
    afterMaintenanceRequiredCount: Number(afterPressureSummary.maintenanceRequiredCount || 0),
    beforeDueCandidateCountTotal: Number(beforePressureSummary.currentDueCandidateCountTotal || 0),
    beforeMaintenanceRequiredCount: Number(beforePressureSummary.maintenanceRequiredCount || 0),
    dueCandidateCountTotal,
    escalationRemindedCount: Number(escalationReminders.summary.remindedCount || 0),
    latestReminderAt: getLatestReminderAt([
      escalationReminders,
      ownerHandoffReminders,
      providerAttentionReminders,
      specialistFollowUpReminders,
    ]),
    ownerHandoffRemindedCount: Number(ownerHandoffReminders.summary.remindedCount || 0),
    providerAttentionRemindedCount: Number(providerAttentionReminders.summary.remindedCount || 0),
    specialistFollowUpRemediationRouteCounts: specialistFollowUpReminders.summary.remediationRouteCounts || {},
    specialistFollowUpRemindedCount: Number(specialistFollowUpReminders.summary.remindedCount || 0),
    specialistFollowUpRetryPolicyCounts: specialistFollowUpReminders.summary.retryPolicyCounts || {},
    remainingMaintenanceRequiredCount: remainingActionIds.length,
    resolvedMaintenanceRequiredCount: resolvedActionIds.length,
    syncedCount: Number(syncSummary.syncedCount || 0),
    totalRemindedCount,
  };
  const filters = {
    missionId: filter.missionId || null,
    note: note || null,
    owner: filter.owner || null,
    workspaceId: filter.workspaceId || null,
  };
  const record = {
    acknowledgedActionIds,
    acknowledgedMaintenanceRequiredCount: summary.acknowledgedMaintenanceRequiredCount,
    afterPressureSummary,
    beforePressureSummary,
    createdAt,
    dueCandidateCountTotal,
    escalationRemindedCount: summary.escalationRemindedCount,
    escalationRemindersSummary: escalationReminders.summary,
    filters,
    affectedMissionIds,
    affectedMissionSummaries,
    id,
    latestReminderAt: summary.latestReminderAt,
    missionId: filters.missionId,
    note: filters.note,
    owner: filters.owner,
    ownerHandoffRemindedCount: summary.ownerHandoffRemindedCount,
    ownerHandoffRemindersSummary: ownerHandoffReminders.summary,
    providerAttentionRemindedCount: summary.providerAttentionRemindedCount,
    providerAttentionRemindersSummary: providerAttentionReminders.summary,
    specialistFollowUpRemediationRouteCounts: summary.specialistFollowUpRemediationRouteCounts,
    specialistFollowUpRemindedCount: summary.specialistFollowUpRemindedCount,
    specialistFollowUpRemindersSummary: specialistFollowUpReminders.summary,
    specialistFollowUpRetryPolicyCounts: summary.specialistFollowUpRetryPolicyCounts,
    remainingActionIds,
    remainingMaintenanceRequiredCount: summary.remainingMaintenanceRequiredCount,
    resolvedActionIds,
    resolvedMaintenanceRequiredCount: summary.resolvedMaintenanceRequiredCount,
    syncedCount: summary.syncedCount,
    syncSummary,
    totalRemindedCount,
    workspaceId: filters.workspaceId,
  };

  return { record, summary };
}
