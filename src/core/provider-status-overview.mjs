import { summarizeProviderEvents } from './provider-event-summary.mjs';
import {
  getLatestMatchingRecord,
  summarizeProviderExecutions,
  summarizeProviderProbes,
} from './provider-execution-summary.mjs';

function getLatestItem(items, fieldName) {
  if (!items.length) {
    return null;
  }

  return [...items]
    .sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || '')))
    .at(-1);
}

function deriveProviderAttentionStatus({ latestAttentionRecovery, latestAttentionStateEvent }) {
  if (latestAttentionStateEvent?.eventKind === 'provider-attention-resolved') {
    return 'resolved';
  }
  if (latestAttentionRecovery) {
    return 'recovered';
  }
  if (latestAttentionStateEvent?.eventKind === 'provider-attention-acknowledged') {
    return 'acknowledged';
  }
  if (
    latestAttentionStateEvent &&
    ['provider-probe-failed', 'provider-execution-failed'].includes(latestAttentionStateEvent.eventKind)
  ) {
    return 'pending';
  }
  return 'clear';
}

export function buildProviderStatusEntry({
  latestAttentionAcknowledgement = null,
  latestAttentionRecovery = null,
  latestAttentionRecord = null,
  latestAttentionReminder = null,
  latestAttentionResolution = null,
  latestAttentionStateEvent = null,
  latestEvent = null,
  latestExecution = null,
  latestProbe = null,
  provider,
}) {
  return {
    ...provider,
    attentionStatus: deriveProviderAttentionStatus({ latestAttentionRecovery, latestAttentionStateEvent }),
    latestAttentionAcknowledgement,
    latestAttentionRecovery,
    latestAttentionRecord,
    latestAttentionReminder,
    latestAttentionResolution,
    latestAttentionStateEvent,
    latestEvent,
    latestExecution,
    latestProbe,
  };
}

export function summarizeProviderStatusEntries(providers, { defaultProviderId } = {}) {
  return {
    capabilityCostTelemetryCount: providers.filter((provider) => provider.capabilities?.costTelemetry).length,
    capabilityStructuredJsonCount: providers.filter((provider) => provider.capabilities?.structuredJson).length,
    capabilityUsageMetricsCount: providers.filter((provider) => provider.capabilities?.usageMetrics).length,
    configuredCount: providers.filter((provider) => provider.configured).length,
    defaultProviderId,
    implementedCount: providers.filter((provider) => provider.implemented).length,
    rateLimitedProviderCount: providers.filter((provider) => Number(provider.rateLimit?.maxRequests || 0) > 0).length,
    total: providers.length,
  };
}

export function enrichProviderStatusEntries(
  providers,
  { pendingAttentionItems = [], recoveredAttentionItems = [] } = {},
) {
  const pendingAttentionByProviderId = new Map(pendingAttentionItems.map((item) => [item.providerId, item]));
  const recoveredAttentionByProviderId = new Map(recoveredAttentionItems.map((item) => [item.providerId, item]));

  return providers.map((provider) => {
    const pendingAttention = pendingAttentionByProviderId.get(provider.id) || null;
    const recoveredAttention = recoveredAttentionByProviderId.get(provider.id) || null;
    const attentionStatus = pendingAttention ? 'pending' : recoveredAttention ? 'recovered' : provider.attentionStatus;

    return {
      ...provider,
      attentionStatus,
      latestAttentionRecovery: recoveredAttention || provider.latestAttentionRecovery || null,
      latestRecoveredAttention: recoveredAttention || provider.latestAttentionRecovery || null,
      latestPendingAttention: pendingAttention,
      pendingAttentionDueAt: pendingAttention?.dueAt || null,
      pendingAttentionIsOverdue: Boolean(pendingAttention?.isOverdue),
      pendingAttentionLatestReminderAt: pendingAttention?.latestReminderAt || null,
      pendingAttentionNeedsReminder: Boolean(pendingAttention?.needsReminder),
      pendingAttentionNextReminderAt: pendingAttention?.nextReminderAt || null,
      pendingAttentionReminderCadenceHours: pendingAttention?.reminderCadenceHours || null,
      pendingAttentionReminderCount: Number(pendingAttention?.reminderCount || 0),
      pendingAttentionSlaHours: pendingAttention?.slaHours || null,
    };
  });
}

export function summarizeProviderOverview({
  acknowledgedAttentionRecords,
  attentionReminderRecords,
  defaultProviderId,
  events,
  executions,
  pendingAttentionItems,
  pendingAttentionSummary,
  probes,
  providers,
  recoveredAttentionItems,
}) {
  const attentionEvents = pendingAttentionItems.map((item) => ({
    at: item.createdAt,
    eventFamily: item.eventFamily,
    eventKind: item.eventKind,
    missionId: item.missionId,
    providerDisplayName: item.providerDisplayName,
    providerId: item.providerId,
    sessionId: item.sessionId,
    workspaceId: item.workspaceId,
    workspaceName: item.workspaceName,
  }));
  const configuredProviderIds = [];
  const latestProbeFailureProviderIds = [];
  const latestProbeSkippedProviderIds = [];
  const latestProbeSuccessProviderIds = [];
  const readyProviderIds = [];
  const acknowledgedAttentionProviderIds = [];
  const recoveredAttentionProviderIds = [];
  const resolvedAttentionProviderIds = [];
  const unconfiguredProviderIds = [];
  const unprobedProviderIds = [];

  for (const provider of providers) {
    if (provider.configured) {
      configuredProviderIds.push(provider.id);
    } else {
      unconfiguredProviderIds.push(provider.id);
    }

    if (provider.configured && provider.implemented) {
      readyProviderIds.push(provider.id);
    }

    if (provider.attentionStatus === 'acknowledged') {
      acknowledgedAttentionProviderIds.push(provider.id);
    }
    if (provider.attentionStatus === 'recovered') {
      recoveredAttentionProviderIds.push(provider.id);
    }
    if (provider.attentionStatus === 'resolved') {
      resolvedAttentionProviderIds.push(provider.id);
    }

    if (!provider.latestProbe) {
      unprobedProviderIds.push(provider.id);
    } else if (provider.latestProbe.ok) {
      latestProbeSuccessProviderIds.push(provider.id);
    } else if (provider.latestProbe.attempted) {
      latestProbeFailureProviderIds.push(provider.id);
    } else {
      latestProbeSkippedProviderIds.push(provider.id);
    }
  }

  const probeSummary = summarizeProviderProbes(probes);
  const executionSummary = summarizeProviderExecutions(executions);
  const eventSummary = summarizeProviderEvents(events);

  return {
    ...summarizeProviderStatusEntries(providers, { defaultProviderId }),
    acknowledgedAttentionCount: acknowledgedAttentionProviderIds.length,
    acknowledgedAttentionProviderIds,
    attentionStatusCounts: {
      acknowledged: acknowledgedAttentionProviderIds.length,
      clear: providers.filter((provider) => provider.attentionStatus === 'clear').length,
      pending: pendingAttentionItems.length,
      recovered: recoveredAttentionProviderIds.length,
      resolved: resolvedAttentionProviderIds.length,
      total: providers.length,
    },
    attentionOverdueCount: pendingAttentionSummary.overdueCount,
    attentionOverdueProviderIds: pendingAttentionSummary.overdueProviderIds,
    attentionNeedsReminderCount: pendingAttentionSummary.needsReminderCount,
    attentionNextDueAt: pendingAttentionSummary.nextDueAt,
    attentionNextReminderAt: pendingAttentionSummary.nextReminderAt,
    attentionAttemptHistoryEntryCountTotal: pendingAttentionSummary.attemptHistoryEntryCountTotal,
    attentionMaxAttemptCount: pendingAttentionSummary.maxAttemptCount,
    attentionMultiAttemptCount: pendingAttentionSummary.multiAttemptCount,
    attentionReminderCountTotal: pendingAttentionSummary.reminderCountTotal,
    attentionTotalAttemptCount: pendingAttentionSummary.totalAttemptCount,
    attentionTotalRetryCount: pendingAttentionSummary.retryCountTotal,
    attentionRequiredCount: attentionEvents.length,
    attentionRequiredProviderIds: pendingAttentionItems.map((item) => item.providerId),
    configuredProviderIds,
    eventCounts: eventSummary.eventCounts,
    eventFamilyCounts: eventSummary.familyCounts,
    eventTotal: eventSummary.total,
    executionAttemptHistoryEntryCountTotal: executionSummary.attemptHistoryEntryCountTotal,
    executionAverageDurationMs: executionSummary.averageDurationMs,
    executionCompletedCount: executionSummary.statusCounts.completed,
    executionEstimatedCostUsdAverage: executionSummary.estimatedCostUsdAverage,
    executionEstimatedCostUsdByProviderId: executionSummary.estimatedCostUsdByProviderId,
    executionEstimatedCostUsdByRole: executionSummary.estimatedCostUsdByRole,
    executionEstimatedCostUsdMax: executionSummary.estimatedCostUsdMax,
    executionEstimatedCostUsdPricedCount: executionSummary.estimatedCostUsdPricedCount,
    executionEstimatedCostUsdTotal: executionSummary.estimatedCostUsdTotal,
    executionFailedCount: executionSummary.statusCounts.failed,
    executionFailureKindCounts: executionSummary.failureKindCounts,
    executionMaxAttemptCount: executionSummary.maxAttemptCount,
    executionMaxDurationMs: executionSummary.maxDurationMs,
    executionMultiAttemptCount: executionSummary.multiAttemptCount,
    executionRetryableFailureCount: executionSummary.retryableFailureCount,
    executionRetrySucceededCount: executionSummary.retrySucceededCount,
    executionStatusCounts: executionSummary.statusCounts,
    executionTimedOutFailureCount: executionSummary.timedOutFailureCount,
    executionTotal: executionSummary.total,
    executionTotalAttemptCount: executionSummary.totalAttemptCount,
    executionTotalDurationMs: executionSummary.totalDurationMs,
    executionTotalRetryCount: executionSummary.totalRetryCount,
    fallbackPolicyCounts: eventSummary.fallbackPolicyCounts,
    fallbackStopReasonCounts: eventSummary.fallbackStopReasonCounts,
    latestAttentionAcknowledgement: getLatestItem(acknowledgedAttentionRecords, 'acknowledgedAt'),
    latestAttentionEvent: eventSummary.latestAttentionEvent,
    latestAttentionRecovery: getLatestItem(recoveredAttentionItems, 'recoveredAt'),
    latestAttentionReminder: getLatestItem(attentionReminderRecords, 'remindedAt'),
    latestAttentionRequiredEvent: getLatestItem(attentionEvents, 'at'),
    latestAttentionResolution: getLatestItem(
      acknowledgedAttentionRecords.filter((record) => (record.status || 'acknowledged') === 'resolved'),
      'resolvedAt',
    ),
    latestEvent: eventSummary.latestEvent,
    latestExecution: executionSummary.latestExecution,
    latestExecutionEvent: eventSummary.latestExecutionEvent,
    latestFailedExecution: executionSummary.latestFailedExecution,
    latestFailedProbe: getLatestMatchingRecord(probes, (probe) => probe.attempted && !probe.ok),
    latestFallbackEvent: eventSummary.latestFallbackEvent,
    latestProbe: probes.at(-1) || null,
    latestProbeEvent: eventSummary.latestProbeEvent,
    latestProbeFailureCount: latestProbeFailureProviderIds.length,
    latestProbeFailureProviderIds,
    latestProbeSkippedCount: latestProbeSkippedProviderIds.length,
    latestProbeSkippedProviderIds,
    latestProbeSuccessCount: latestProbeSuccessProviderIds.length,
    latestProbeSuccessProviderIds,
    latestProviderRouteDecisionEvent: eventSummary.latestProviderRouteDecisionEvent,
    latestSkippedProbe: getLatestMatchingRecord(probes, (probe) => !probe.attempted),
    latestSuccessfulExecution: executionSummary.latestSuccessfulExecution,
    latestSuccessfulProbe: getLatestMatchingRecord(probes, (probe) => probe.ok),
    probeAttemptedCount: probeSummary.attemptedCount,
    probeAttemptHistoryEntryCountTotal: probeSummary.attemptHistoryEntryCountTotal,
    probeAverageDurationMs: probeSummary.averageDurationMs,
    probeFailureCount: probeSummary.failureCount,
    probeFailureKindCounts: probeSummary.failureKindCounts,
    probeMaxAttemptCount: probeSummary.maxAttemptCount,
    probeMaxDurationMs: probeSummary.maxDurationMs,
    probeMultiAttemptCount: probeSummary.multiAttemptCount,
    probeRetryableFailureCount: probeSummary.retryableFailureCount,
    probeRetrySucceededCount: probeSummary.retrySucceededCount,
    probeSuccessCount: probeSummary.successCount,
    probeTimedOutFailureCount: probeSummary.timedOutFailureCount,
    probeTotal: probeSummary.total,
    probeTotalAttemptCount: probeSummary.totalAttemptCount,
    probeTotalDurationMs: probeSummary.totalDurationMs,
    probeTotalRetryCount: probeSummary.totalRetryCount,
    providerRouteDecisionCount: eventSummary.providerRouteDecisionCount,
    providerRouteDecisionPolicyCounts: eventSummary.providerRouteDecisionPolicyCounts,
    providerRouteDecisionRouteCounts: eventSummary.providerRouteDecisionRouteCounts,
    readyCount: readyProviderIds.length,
    readyProviderIds,
    recoveredAttentionCount: recoveredAttentionProviderIds.length,
    recoveredAttentionProviderIds,
    resolvedAttentionCount: resolvedAttentionProviderIds.length,
    resolvedAttentionProviderIds,
    unconfiguredCount: unconfiguredProviderIds.length,
    unconfiguredProviderIds,
    unprobedCount: unprobedProviderIds.length,
    unprobedProviderIds,
    usageInputTokensTotal: executionSummary.usageInputTokensTotal,
    usageOutputTokensTotal: executionSummary.usageOutputTokensTotal,
    usageTotalTokensTotal: executionSummary.usageTotalTokensTotal,
  };
}

export function buildProviderOverviewResult({ healthDrift, overviewSummary, providers, recentWindow, since }) {
  return {
    filters: {
      since: since || null,
    },
    healthDrift,
    providers,
    recentWindow,
    summary: {
      ...overviewSummary,
      latestRecentProviderEvent: recentWindow?.latestEvent || null,
      latestRecentProviderExecution: recentWindow?.latestExecution || null,
      latestRecentProviderFallbackEvent: recentWindow?.latestFallbackEvent || null,
      latestRecentProviderProbe: recentWindow?.latestProbe || null,
      providerHealthDriftAttentionNeedsReminderCount: healthDrift.attentionNeedsReminderCount,
      providerHealthDriftAttentionOverdueCount: healthDrift.attentionOverdueCount,
      providerHealthDriftAttentionRequiredCount: healthDrift.attentionRequiredCount,
      providerHealthDriftReasonCodes: healthDrift.reasonCodes,
      providerHealthDriftRecentExecutionCountDelta: healthDrift.recentExecutionCountDelta,
      providerHealthDriftRecentExecutionCurrentMonthStartDate: healthDrift.recentExecutionCurrentMonthStartDate,
      providerHealthDriftRecentExecutionEstimatedCostUsdTotalDelta:
        healthDrift.recentExecutionEstimatedCostUsdTotalDelta,
      providerHealthDriftRecentExecutionFailedCountDelta: healthDrift.recentExecutionFailedCountDelta,
      providerHealthDriftRecentExecutionMonthlyBucketCount: healthDrift.recentExecutionMonthlyBucketCount,
      providerHealthDriftRecentExecutionOldestMonthStartDate: healthDrift.recentExecutionOldestMonthStartDate,
      providerHealthDriftRecentExecutionPreviousMonthStartDate: healthDrift.recentExecutionPreviousMonthStartDate,
      providerHealthDriftStatus: healthDrift.status,
      providerRecentEventCount: recentWindow?.eventTotal || 0,
      providerRecentEventFamilyCounts:
        recentWindow?.eventFamilyCounts || { attention: 0, execution: 0, fallback: 0, probe: 0 },
      providerRecentExecutionCount: recentWindow?.executionTotal || 0,
      providerRecentExecutionEstimatedCostUsdTotal: recentWindow?.executionEstimatedCostUsdTotal || 0,
      providerRecentExecutionLatestMonthlyBucketDelta: recentWindow?.executionLatestMonthlyBucketDelta || null,
      providerRecentExecutionLatestMonthlyBucketStartDate:
        recentWindow?.executionLatestMonthlyBucketStartDate || null,
      providerRecentExecutionMonthlyBucketCount: recentWindow?.executionMonthlyBucketCount || 0,
      providerRecentExecutionOldestMonthlyBucketStartDate:
        recentWindow?.executionOldestMonthlyBucketStartDate || null,
      providerRecentProbeTotal: recentWindow?.probeTotal || 0,
      providerRecentSince: since || null,
      providerRecentTouchedProviderCount: recentWindow?.touchedProviderCount || 0,
      providerRecentTouchedProviderIds: recentWindow?.touchedProviderIds || [],
    },
  };
}
