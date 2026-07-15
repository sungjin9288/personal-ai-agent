import { summarizeOperatorTimeline } from './follow-up-analytics.mjs';
import { sortTimelineEvents } from './timeline-assembly.mjs';

const EMPTY_PROVIDER_EVENT_FAMILY_COUNTS = {
  attention: 0,
  execution: 0,
  fallback: 0,
  probe: 0,
};

function buildSpecialistSummary(parallelActivity) {
  return {
    specialistFollowUpRequiredCount: parallelActivity.specialistFollowUpRequiredCount,
    specialistFollowUpNeedsReminderCount: parallelActivity.specialistFollowUpNeedsReminderCount,
    specialistFollowUpOverdueCount: parallelActivity.specialistFollowUpOverdueCount,
    specialistFollowUpReminderCountTotal: parallelActivity.specialistFollowUpReminderCountTotal,
    specialistLatestQualityGateViolation: parallelActivity.latestQualityGateViolation,
    specialistLatestOrchestrationProfile: parallelActivity.latestOrchestrationProfile,
    specialistLatestFollowUp: parallelActivity.latestFollowUp,
    specialistLatestReminderAt: parallelActivity.specialistLatestReminderAt,
    specialistNextReminderAt: parallelActivity.specialistNextReminderAt,
    specialistQualityGateBlockedCount: parallelActivity.qualityGateBlockedCount,
    specialistQualityGateStatusCounts: parallelActivity.qualityGateStatusCounts,
    specialistOrchestrationProfileCounts: parallelActivity.orchestrationProfileCounts,
    specialistOrchestrationProfileCount: parallelActivity.specialistOrchestrationProfileCount,
    specialistTouchedOrchestrationProfileIds: parallelActivity.touchedOrchestrationProfileIds,
  };
}

function buildProviderHealthDriftSummary(providerHealthDrift) {
  return {
    providerHealthDriftAttentionNeedsReminderCount: providerHealthDrift.attentionNeedsReminderCount,
    providerHealthDriftAttentionOverdueCount: providerHealthDrift.attentionOverdueCount,
    providerHealthDriftAttentionRequiredCount: providerHealthDrift.attentionRequiredCount,
    providerHealthDriftReasonCodes: providerHealthDrift.reasonCodes,
    providerHealthDriftRecentExecutionCountDelta: providerHealthDrift.recentExecutionCountDelta,
    providerHealthDriftRecentExecutionCurrentMonthStartDate:
      providerHealthDrift.recentExecutionCurrentMonthStartDate,
    providerHealthDriftRecentExecutionEstimatedCostUsdTotalDelta:
      providerHealthDrift.recentExecutionEstimatedCostUsdTotalDelta,
    providerHealthDriftRecentExecutionFailedCountDelta:
      providerHealthDrift.recentExecutionFailedCountDelta,
    providerHealthDriftRecentExecutionMonthlyBucketCount:
      providerHealthDrift.recentExecutionMonthlyBucketCount,
    providerHealthDriftRecentExecutionOldestMonthStartDate:
      providerHealthDrift.recentExecutionOldestMonthStartDate,
    providerHealthDriftRecentExecutionPreviousMonthStartDate:
      providerHealthDrift.recentExecutionPreviousMonthStartDate,
    providerHealthDriftStatus: providerHealthDrift.status,
  };
}

function buildMaintenanceSummary({ maintenanceLatestMonthlyBucketDelta, maintenanceMonthlyBuckets }) {
  return {
    maintenanceLatestMonthlyBucketDelta,
    maintenanceLatestMonthlyBucketStartDate: maintenanceMonthlyBuckets[0]?.monthStartDate || null,
    maintenanceMonthlyBucketCount: maintenanceMonthlyBuckets.length,
    maintenanceOldestMonthlyBucketStartDate: maintenanceMonthlyBuckets.at(-1)?.monthStartDate || null,
  };
}

export function buildMissionTimelineReadModel({
  mission,
  providerHealthDrift,
  providerRecentWindow,
  summary,
  timelineEvents,
}) {
  return {
    mission,
    providerHealthDrift,
    providerRecentWindow,
    summary,
    timeline: sortTimelineEvents(timelineEvents),
  };
}

export function buildWorkspaceTimelineReadModel({
  maintenanceLatestMonthlyBucketDelta,
  maintenanceMonthlyBuckets,
  parallelActivity,
  providerHealthDrift,
  providerRecentWindow,
  providerSince,
  timelineEvents,
  workspace,
}) {
  const timeline = sortTimelineEvents(timelineEvents);

  return {
    providerHealthDrift,
    providerRecentWindow,
    summary: {
      ...summarizeOperatorTimeline(timeline),
      ...buildSpecialistSummary(parallelActivity),
      latestRecentProviderEvent: providerRecentWindow?.latestEvent || null,
      latestRecentProviderExecution: providerRecentWindow?.latestExecution || null,
      providerRecentEventCount: providerRecentWindow?.eventCount || 0,
      providerRecentEventFamilyCounts:
        providerRecentWindow?.eventFamilyCounts || { ...EMPTY_PROVIDER_EVENT_FAMILY_COUNTS },
      providerRecentExecutionCount: providerRecentWindow?.executionCount || 0,
      providerRecentExecutionEstimatedCostUsdTotal: providerRecentWindow?.executionEstimatedCostUsdTotal || 0,
      providerRecentExecutionLatestMonthlyBucketDelta:
        providerRecentWindow?.executionLatestMonthlyBucketDelta || null,
      providerRecentExecutionLatestMonthlyBucketStartDate:
        providerRecentWindow?.executionLatestMonthlyBucketStartDate || null,
      providerRecentExecutionMonthlyBucketCount: providerRecentWindow?.executionMonthlyBucketCount || 0,
      providerRecentExecutionOldestMonthlyBucketStartDate:
        providerRecentWindow?.executionOldestMonthlyBucketStartDate || null,
      ...buildProviderHealthDriftSummary(providerHealthDrift),
      ...buildMaintenanceSummary({ maintenanceLatestMonthlyBucketDelta, maintenanceMonthlyBuckets }),
      providerRecentSince: providerSince || null,
      providerRecentTouchedProviderCount: providerRecentWindow?.touchedProviderCount || 0,
      providerRecentTouchedProviderIds: providerRecentWindow?.touchedProviderIds || [],
    },
    timeline,
    workspace,
  };
}

export function buildGlobalOperatorTimelineReadModel({
  maintenanceLatestMonthlyBucketDelta,
  maintenanceMonthlyBuckets,
  parallelActivity,
  providerHealthDrift,
  providerRecentWindow,
  providerSince,
  timelineEvents,
  workspaces,
}) {
  const timeline = sortTimelineEvents(timelineEvents);

  return {
    providerHealthDrift,
    providerRecentWindow,
    summary: {
      ...summarizeOperatorTimeline(timeline),
      ...buildSpecialistSummary(parallelActivity),
      latestRecentProviderEvent: providerRecentWindow?.latestEvent || null,
      latestRecentProviderExecution: providerRecentWindow?.latestExecution || null,
      latestRecentProviderProbe: providerRecentWindow?.latestProbe || null,
      providerRecentEventCount: providerRecentWindow?.eventTotal || 0,
      providerRecentEventFamilyCounts:
        providerRecentWindow?.eventFamilyCounts || { ...EMPTY_PROVIDER_EVENT_FAMILY_COUNTS },
      providerRecentExecutionCount: providerRecentWindow?.executionTotal || 0,
      providerRecentExecutionEstimatedCostUsdTotal: providerRecentWindow?.executionEstimatedCostUsdTotal || 0,
      providerRecentExecutionLatestMonthlyBucketDelta:
        providerRecentWindow?.executionLatestMonthlyBucketDelta || null,
      providerRecentExecutionLatestMonthlyBucketStartDate:
        providerRecentWindow?.executionLatestMonthlyBucketStartDate || null,
      providerRecentExecutionMonthlyBucketCount: providerRecentWindow?.executionMonthlyBucketCount || 0,
      providerRecentExecutionOldestMonthlyBucketStartDate:
        providerRecentWindow?.executionOldestMonthlyBucketStartDate || null,
      ...buildProviderHealthDriftSummary(providerHealthDrift),
      ...buildMaintenanceSummary({ maintenanceLatestMonthlyBucketDelta, maintenanceMonthlyBuckets }),
      providerRecentProbeTotal: providerRecentWindow?.probeTotal || 0,
      providerRecentSince: providerSince || null,
      providerRecentTouchedProviderCount: providerRecentWindow?.touchedProviderCount || 0,
      providerRecentTouchedProviderIds: providerRecentWindow?.touchedProviderIds || [],
    },
    timeline,
    workspaces,
  };
}
