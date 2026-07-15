import { AGENT_RUN_STATUSES } from './constants.mjs';
import { getLatestMatchingRecord } from './provider-execution-summary.mjs';
import {
  summarizeAttemptMetrics,
  summarizeDurationMetrics,
  summarizeEstimatedCostBreakdown,
  summarizeEstimatedCostMetrics,
  summarizeFailureKinds,
  summarizeUsageMetrics,
} from './provider-telemetry.mjs';

function normalizeText(value) {
  return String(value || '').trim();
}

export function summarizeProviderEvents(events) {
  const eventCounts = {};
  const familyCounts = { attention: 0, execution: 0, fallback: 0, probe: 0 };
  const fallbackPolicyCounts = {};
  const fallbackStopReasonCounts = {};
  const providerRouteDecisionPolicyCounts = {};
  const providerRouteDecisionRouteCounts = {};
  const providerCounts = {};
  const executionEvents = events.filter((event) => event.eventFamily === 'execution');
  const probeEvents = events.filter((event) => event.eventFamily === 'probe');
  const executionDurationSummary = summarizeDurationMetrics(executionEvents);
  const executionAttemptSummary = summarizeAttemptMetrics(
    executionEvents,
    (event) => event.executionStatus === 'completed',
  );
  const executionUsageSummary = summarizeUsageMetrics(executionEvents);
  const executionEstimatedCostSummary = summarizeEstimatedCostMetrics(executionEvents);
  const executionEstimatedCostByProviderId = summarizeEstimatedCostBreakdown(executionEvents, 'providerId');
  const executionEstimatedCostByRole = summarizeEstimatedCostBreakdown(executionEvents, 'role');
  const probeDurationSummary = summarizeDurationMetrics(probeEvents);
  const probeAttemptSummary = summarizeAttemptMetrics(probeEvents, (event) => event.ok);
  const executionStatusCounts = {
    ...Object.fromEntries(AGENT_RUN_STATUSES.map((status) => [status, 0])),
    total: 0,
  };
  const attentionStatusCounts = {
    acknowledged: 0,
    opened: 0,
    recovered: 0,
    reminded: 0,
    resolved: 0,
    total: 0,
  };
  let probeAttemptedCount = 0;
  let probeFailureCount = 0;
  let probeSkippedCount = 0;
  let probeSuccessCount = 0;

  for (const event of events) {
    eventCounts[event.eventKind] = (eventCounts[event.eventKind] || 0) + 1;
    providerCounts[event.providerId] = (providerCounts[event.providerId] || 0) + 1;

    if (event.eventFamily === 'probe') {
      familyCounts.probe += 1;
      if (!event.attempted) {
        probeSkippedCount += 1;
        continue;
      }

      probeAttemptedCount += 1;
      if (event.ok) {
        probeSuccessCount += 1;
      } else {
        probeFailureCount += 1;
      }
      continue;
    }

    if (event.eventFamily === 'attention') {
      familyCounts.attention += 1;
      attentionStatusCounts.total += 1;
      if (event.eventKind === 'provider-attention-opened') {
        attentionStatusCounts.opened += 1;
      } else if (event.eventKind === 'provider-attention-acknowledged') {
        attentionStatusCounts.acknowledged += 1;
      } else if (event.eventKind === 'provider-attention-reminded') {
        attentionStatusCounts.reminded += 1;
      } else if (event.eventKind === 'provider-attention-recovered') {
        attentionStatusCounts.recovered += 1;
      } else if (event.eventKind === 'provider-attention-resolved') {
        attentionStatusCounts.resolved += 1;
      }
      continue;
    }

    if (event.eventFamily === 'fallback') {
      familyCounts.fallback += 1;
      const fallbackPolicy = normalizeText(event.fallbackPolicy);
      if (fallbackPolicy) {
        fallbackPolicyCounts[fallbackPolicy] = (fallbackPolicyCounts[fallbackPolicy] || 0) + 1;
      }

      const fallbackStopReason = normalizeText(event.fallbackStopReason);
      if (fallbackStopReason) {
        fallbackStopReasonCounts[fallbackStopReason] = (fallbackStopReasonCounts[fallbackStopReason] || 0) + 1;
      }

      if (event.providerRouteDecision) {
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
      continue;
    }

    familyCounts.execution += 1;
    executionStatusCounts.total += 1;
    if (executionStatusCounts[event.executionStatus] !== undefined) {
      executionStatusCounts[event.executionStatus] += 1;
    }
  }

  return {
    attentionStatusCounts,
    eventCounts,
    executionAttemptHistoryEntryCountTotal: executionAttemptSummary.attemptHistoryEntryCountTotal,
    executionAverageDurationMs: executionDurationSummary.averageDurationMs,
    executionCompletedCount: executionStatusCounts.completed,
    executionEstimatedCostUsdAverage: executionEstimatedCostSummary.estimatedCostUsdAverage,
    executionEstimatedCostUsdByProviderId: executionEstimatedCostByProviderId,
    executionEstimatedCostUsdByRole: executionEstimatedCostByRole,
    executionEstimatedCostUsdMax: executionEstimatedCostSummary.estimatedCostUsdMax,
    executionEstimatedCostUsdPricedCount: executionEstimatedCostSummary.estimatedCostUsdPricedCount,
    executionEstimatedCostUsdTotal: executionEstimatedCostSummary.estimatedCostUsdTotal,
    executionFailedCount: executionStatusCounts.failed,
    executionFailureKindCounts: summarizeFailureKinds(
      events.filter((event) => event.eventFamily === 'execution' && event.executionStatus === 'failed'),
    ),
    executionMaxAttemptCount: executionAttemptSummary.maxAttemptCount || null,
    executionMaxDurationMs: executionDurationSummary.maxDurationMs,
    executionMultiAttemptCount: executionAttemptSummary.multiAttemptCount,
    executionRetryableFailureCount: events.filter(
      (event) => event.eventFamily === 'execution' && event.executionStatus === 'failed' && event.recoverable,
    ).length,
    executionRetrySucceededCount: executionAttemptSummary.retrySucceededCount,
    executionStatusCounts,
    executionTimedOutFailureCount: events.filter(
      (event) => event.eventFamily === 'execution' && event.executionStatus === 'failed' && event.timedOut,
    ).length,
    executionTotalAttemptCount: executionAttemptSummary.totalAttemptCount,
    executionTotalDurationMs: executionDurationSummary.totalDurationMs,
    executionTotalRetryCount: executionAttemptSummary.totalRetryCount,
    familyCounts,
    fallbackPolicyCounts,
    fallbackStopReasonCounts,
    latestAttentionEvent: getLatestMatchingRecord(events, (event) => event.eventFamily === 'attention'),
    latestEvent: events.at(-1) || null,
    latestExecutionEvent: getLatestMatchingRecord(events, (event) => event.eventFamily === 'execution'),
    latestFallbackEvent: getLatestMatchingRecord(events, (event) => event.eventFamily === 'fallback'),
    latestProbeEvent: getLatestMatchingRecord(events, (event) => event.eventFamily === 'probe'),
    latestProviderRouteDecisionEvent: getLatestMatchingRecord(
      events,
      (event) => event.eventFamily === 'fallback' && Boolean(event.providerRouteDecision),
    ),
    probeAttemptedCount,
    probeAttemptHistoryEntryCountTotal: probeAttemptSummary.attemptHistoryEntryCountTotal,
    probeAverageDurationMs: probeDurationSummary.averageDurationMs,
    probeFailureCount,
    probeFailureKindCounts: summarizeFailureKinds(
      events.filter((event) => event.eventFamily === 'probe' && event.attempted && !event.ok),
    ),
    probeMaxAttemptCount: probeAttemptSummary.maxAttemptCount || null,
    probeMaxDurationMs: probeDurationSummary.maxDurationMs,
    probeMultiAttemptCount: probeAttemptSummary.multiAttemptCount,
    probeRetryableFailureCount: events.filter(
      (event) => event.eventFamily === 'probe' && event.attempted && !event.ok && event.recoverable,
    ).length,
    probeRetrySucceededCount: probeAttemptSummary.retrySucceededCount,
    probeSkippedCount,
    probeSuccessCount,
    probeTimedOutFailureCount: events.filter(
      (event) => event.eventFamily === 'probe' && event.attempted && !event.ok && event.timedOut,
    ).length,
    probeTotalAttemptCount: probeAttemptSummary.totalAttemptCount,
    probeTotalDurationMs: probeDurationSummary.totalDurationMs,
    probeTotalRetryCount: probeAttemptSummary.totalRetryCount,
    providerCounts,
    providerRouteDecisionCount: events.filter(
      (event) => event.eventFamily === 'fallback' && Boolean(event.providerRouteDecision),
    ).length,
    providerRouteDecisionPolicyCounts,
    providerRouteDecisionRouteCounts,
    total: events.length,
    ...executionUsageSummary,
  };
}
