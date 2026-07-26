import { ACTION_OWNERS, PROVIDER_ATTENTION_STATUSES } from './constants.mjs';
import { formatDateUtc } from './date-bucket-utils.mjs';
import {
  addDispatchMetadata,
  addOperationalMetadata,
  buildProviderAttentionPendingActionItem,
  buildProviderAttentionStoredActionItem,
} from './action-item-builders.mjs';
import {
  buildProviderAttentionAcknowledgementRecord,
  buildProviderAttentionReminderRecord,
  buildResolvedProviderAttentionRecord,
} from './action-mutation-records.mjs';
import { createProviderAttention } from './provider-attention.mjs';
import { createId } from './id.mjs';
import {
  roundUsdAmount,
} from '../providers/provider-runtime-utils.mjs';
import {
  extractProviderAttemptMetadata,
  extractProviderFailureMetadata,
  normalizeProviderAttemptHistory,
  normalizeProviderFailureKind,
  normalizeTelemetryNumber,
  summarizeAttemptMetrics,
} from './provider-telemetry.mjs';
import {
  buildProviderExecutionTimeline,
  buildProviderProbeTimeline,
  getLatestMatchingRecord,
  summarizeProviderExecutions,
  summarizeProviderProbes,
} from './provider-execution-summary.mjs';
import { summarizeProviderEvents } from './provider-event-summary.mjs';
import {
  buildProviderEventTimelineResult,
  buildProviderExecutionHistoryResult,
  buildProviderExecutionTimelineResult,
  buildProviderProbeHistoryResult,
  buildProviderProbeTimelineResult,
} from './provider-history-timeline.mjs';
import {
  buildProviderOverviewResult,
  buildProviderStatusEntry,
  enrichProviderStatusEntries as enrichProviderStatusReadModel,
  summarizeProviderOverview as summarizeProviderOverviewReadModel,
  summarizeProviderStatusEntries as summarizeProviderStatusReadModel,
} from './provider-status-overview.mjs';
import {
  buildProviderExecutionDailyBuckets,
  buildProviderExecutionLatestBucketDelta,
  buildProviderExecutionLatestMonthlyBucketDelta,
  buildProviderExecutionLatestWeeklyBucketDelta,
  buildProviderExecutionMonthlyBuckets,
  buildProviderExecutionWeeklyBuckets,
} from './provider-execution-buckets.mjs';
import {
  buildProviderAttentionRemediationPermissionDecision,
} from './permission-decision-service.mjs';
import {
  evaluateProviderFallbackPolicy,
  normalizeProviderFallbackPolicy,
} from './provider-fallback-policy.mjs';
import {
  buildProviderFallbackRouteDecision,
  summarizeProviderRouteDecisionForTimeline,
} from './provider-route-decision-service.mjs';
import {
  deriveProviderAttentionReminderCadenceHours,
  formatProviderAttentionReminderDetail,
} from './reminder-formatters.mjs';
import { sortTimelineEvents } from './timeline-assembly.mjs';

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

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items]
    .sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || '')))
    .at(-1);
}

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  return normalized === 'executing' ? 'running' : normalized;
}

export function createProviderRuntimeService({
  getMission,
  getSessionProviderFailureSummary,
  getWorkspace,
  now,
  providerRegistry,
  runMission,
  store,
  summarizeProviderHealthDriftItems,
}) {
  const {
    buildProviderAttentionTimeline,
    buildProviderAttentionReminderTimeline,
    buildProviderAttentionRecoveredTimeline,
    buildProviderAttentionOpenedTimeline,
  } = createProviderAttention({
    formatProviderAttentionReminderDetail,
  });

  function getUtcMonthStartTimestamp(value = now()) {
    const parsed = Date.parse(String(value || ''));
    if (!Number.isFinite(parsed)) {
      return '';
    }

    const date = new Date(parsed);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
  }

  function getLatestProviderProbe(providerId) {
    return store.listProviderProbes({ providerId }).at(-1) || null;
  }

  function getProviderAttentionEventRefId(event) {
    return normalizeText(event?.probeId || event?.runId || event?.eventRefId || '');
  }

  function buildProviderAttentionActionId(event) {
    const providerId = normalizeText(event?.providerId || '');
    const eventFamily = normalizeText(event?.eventFamily || '');
    const eventRefId = getProviderAttentionEventRefId(event);
    return `provider-attention:${providerId}:${eventFamily}:${eventRefId || 'latest'}`;
  }

  function getLatestProviderAttentionAcknowledgement(providerId) {
    return store.listProviderAttentionAcknowledgements({ providerId }).at(-1) || null;
  }

  function getLatestProviderAttentionRecord(providerId) {
    return store.listProviderAttentionAcknowledgements({ providerId }).at(-1) || null;
  }

  function getLatestProviderAttentionResolution(providerId) {
    return (
      store
        .listProviderAttentionAcknowledgements({ providerId })
        .filter((record) => record.status === 'resolved')
        .at(-1) || null
    );
  }

  function getProviderAttentionAcknowledgementForEvent(event) {
    const providerId = normalizeText(event?.providerId || '');
    const eventFamily = normalizeText(event?.eventFamily || '');
    const eventRefId = getProviderAttentionEventRefId(event);

    if (!providerId || !eventFamily || !eventRefId) {
      return null;
    }

    return (
      store
        .listProviderAttentionAcknowledgements({
          eventFamily,
          eventRefId,
          providerId,
        })
        .at(-1) || null
    );
  }

  function listProviderAttentionRemindersForEvent(event) {
    const providerId = normalizeText(event?.providerId || '');
    const eventFamily = normalizeText(event?.eventFamily || '');
    const eventRefId = getProviderAttentionEventRefId(event);

    if (!providerId || !eventFamily || !eventRefId) {
      return [];
    }

    return store.listProviderAttentionReminders({
      eventFamily,
      eventRefId,
      providerId,
    });
  }

  function deriveProviderAttentionRecovery(provider, latestAttentionStateEvent, baseEvents) {
    if (
      !latestAttentionStateEvent ||
      !['provider-probe-succeeded', 'provider-execution-succeeded'].includes(latestAttentionStateEvent.eventKind)
    ) {
      return null;
    }

    const sourceFailure = getLatestMatchingRecord(
      baseEvents,
      (event) =>
        ['provider-probe-failed', 'provider-execution-failed'].includes(event.eventKind) &&
        event.eventFamily === latestAttentionStateEvent.eventFamily &&
        String(event.at || '') < String(latestAttentionStateEvent.at || '') &&
        (latestAttentionStateEvent.eventFamily !== 'execution' ||
          (event.missionId === latestAttentionStateEvent.missionId &&
            event.workspaceId === latestAttentionStateEvent.workspaceId)),
    );

    if (!sourceFailure) {
      return null;
    }

    const existingAcknowledgement = getProviderAttentionAcknowledgementForEvent(sourceFailure);
    if (existingAcknowledgement && (existingAcknowledgement.status || 'acknowledged') === 'resolved') {
      return null;
    }

    const reminderRecords = listProviderAttentionRemindersForEvent(sourceFailure);
    const latestReminder = reminderRecords.at(-1) || null;
    const recommendedOwner =
      sourceFailure.eventFamily === 'execution' && sourceFailure.workspaceId ? 'workspace-owner' : 'human-approver';
    const recommendedCommand =
      sourceFailure.eventFamily === 'execution'
        ? `node src/cli.mjs mission run ${sourceFailure.missionId} --provider ${provider.id}`
        : `node src/cli.mjs provider probe ${provider.id}`;

    return {
      acknowledgedAt: existingAcknowledgement?.acknowledgedAt || null,
      actionId: buildProviderAttentionActionId(sourceFailure),
      actionType: 'provider-attention',
      ...extractProviderFailureMetadata(sourceFailure),
      createdAt: sourceFailure.at,
      deliverableType: null,
      eventFamily: sourceFailure.eventFamily,
      eventKind: sourceFailure.eventKind,
      eventRefId: getProviderAttentionEventRefId(sourceFailure),
      isOverdue: false,
      lastReminderAt: latestReminder?.remindedAt || latestReminder?.createdAt || null,
      latestReminderAt: latestReminder?.remindedAt || latestReminder?.createdAt || null,
      missionId: sourceFailure.missionId || latestAttentionStateEvent.missionId || null,
      needsReminder: false,
      nextReminderAt: null,
      note: existingAcknowledgement?.note || null,
      priority: sourceFailure.eventFamily === 'execution' ? 'high' : 'medium',
      providerDisplayName: provider.displayName,
      providerId: provider.id,
      reason: sourceFailure.detail,
      recommendedCommand,
      recommendedOwner,
      recoveredAt: latestAttentionStateEvent.at,
      recoveryDetail: latestAttentionStateEvent.detail,
      recoveryEventFamily: latestAttentionStateEvent.eventFamily,
      recoveryEventKind: latestAttentionStateEvent.eventKind,
      recoveryEventRefId: getProviderAttentionEventRefId(latestAttentionStateEvent),
      recoveryRunId: latestAttentionStateEvent.runId || null,
      recoveryProbeId: latestAttentionStateEvent.probeId || null,
      reminderCadenceHours: null,
      reminderCount: reminderRecords.length,
      sessionId: sourceFailure.sessionId || latestAttentionStateEvent.sessionId || null,
      slaHours: sourceFailure.eventFamily === 'execution' ? 12 : 24,
      status: 'recovered',
      title:
        sourceFailure.eventFamily === 'execution'
          ? `Provider execution recovered for ${provider.displayName}`
          : `Provider probe recovered for ${provider.displayName}`,
      workspaceId: sourceFailure.workspaceId || latestAttentionStateEvent.workspaceId || null,
      workspaceName: sourceFailure.workspaceName || latestAttentionStateEvent.workspaceName || null,
    };
  }

  function buildProviderExecutionEntries(filter = {}) {
    const state = store.loadState();
    const missionById = new Map(state.missions.map((mission) => [mission.id, mission]));
    const sessionById = new Map(state.sessions.map((session) => [session.id, session]));
    const workspaceById = new Map(state.workspaces.map((workspace) => [workspace.id, workspace]));

    const normalizedStatusFilter = normalizeAgentRunStatus(filter.status);
    const normalizedSinceFilter = normalizeTimestampFilter(filter.since, 'provider execution since timestamp');

    return [...ensureArray(state.agentRuns)]
      .map((run) => {
        const session = sessionById.get(run.sessionId) || null;
        const mission = missionById.get(run.missionId || session?.missionId) || null;
        const workspace = mission ? workspaceById.get(mission.workspaceId) || null : null;
        const providerId = normalizeText(run.providerId || session?.provider);
        const attemptMetadata = extractProviderAttemptMetadata(run);

        return {
          at: run.endedAt || run.startedAt || '',
          ...attemptMetadata,
          durationMs: normalizeTelemetryNumber(run.durationMs),
          endedAt: run.endedAt || null,
          estimatedCostUsd: roundUsdAmount(run.estimatedCostUsd),
          failureKind: normalizeText(run.failureKind) ? normalizeProviderFailureKind(run.failureKind) : null,
          httpStatus: Number.isFinite(Number(run.httpStatus)) ? Number(run.httpStatus) : null,
          id: run.id,
          inputSummary: normalizeText(run.inputSummary),
          mergeStatus: normalizeText(run.mergeStatus),
          missionId: mission?.id || run.missionId || null,
          missionTitle: mission?.title || null,
          outputSummary: normalizeText(run.outputSummary),
          parentRunId: normalizeText(run.parentRunId) || null,
          providerId,
          providerResponseId: normalizeText(run.providerResponseId) || null,
          rawMessage: normalizeText(run.rawMessage) || null,
          recoverable: typeof run.recoverable === 'boolean' ? run.recoverable : null,
          role: normalizeText(run.role),
          resumeFromRunId: normalizeText(run.resumeFromRunId) || null,
          sessionId: session?.id || run.sessionId || null,
          specialistKind: normalizeText(run.specialistKind) || null,
          specialistRootRunId: normalizeText(run.specialistRootRunId) || null,
          startedAt: run.startedAt || null,
          status: normalizeAgentRunStatus(run.status),
          timedOut: Boolean(run.timedOut),
          usageInputTokens: normalizeTelemetryNumber(run.usageInputTokens),
          usageOutputTokens: normalizeTelemetryNumber(run.usageOutputTokens),
          usageTotalTokens: normalizeTelemetryNumber(run.usageTotalTokens),
          workflowRole: normalizeText(run.workflowRole || run.role),
          workspaceId: workspace?.id || null,
          workspaceName: workspace?.name || null,
          parallelGroupId: normalizeText(run.parallelGroupId) || null,
        };
      })
      .filter((entry) => {
        if (!entry.providerId) {
          return false;
        }
        if (filter.providerId && entry.providerId !== filter.providerId) {
          return false;
        }
        if (filter.workspaceId && entry.workspaceId !== filter.workspaceId) {
          return false;
        }
        if (filter.missionId && entry.missionId !== filter.missionId) {
          return false;
        }
        if (filter.role && entry.role !== filter.role) {
          return false;
        }
        if (normalizedStatusFilter && entry.status !== normalizedStatusFilter) {
          return false;
        }
        if (normalizedSinceFilter && String(entry.at || '') < normalizedSinceFilter) {
          return false;
        }
        return true;
      })
      .sort((left, right) => String(left.at).localeCompare(String(right.at)));
  }

  function getLatestProviderExecution(providerId) {
    return buildProviderExecutionEntries({ providerId }).at(-1) || null;
  }

  function buildProviderStatusEntries() {
    return providerRegistry.listProviders().map((provider) => {
      const providerEvents = buildProviderBaseEvents({ providerId: provider.id });
      const latestEvent = getLatestMatchingRecord(providerEvents, () => true);
      const latestAttentionStateEvent = getLatestMatchingRecord(
        providerEvents,
        (event) =>
          [
            'provider-probe-failed',
            'provider-execution-failed',
            'provider-probe-succeeded',
            'provider-execution-succeeded',
            'provider-attention-acknowledged',
            'provider-attention-resolved',
          ].includes(event.eventKind),
      );
      const latestAttentionRecovery = deriveProviderAttentionRecovery(
        provider,
        latestAttentionStateEvent,
        providerEvents,
      );
      const latestAttentionRecord = getLatestProviderAttentionRecord(provider.id);
      const latestAttentionAcknowledgement = getLatestProviderAttentionAcknowledgement(provider.id);
      const latestAttentionResolution = getLatestProviderAttentionResolution(provider.id);
      const latestAttentionReminder = store.listProviderAttentionReminders({ providerId: provider.id }).at(-1) || null;

      return buildProviderStatusEntry({
        latestAttentionAcknowledgement,
        latestAttentionRecovery,
        latestAttentionRecord,
        latestAttentionReminder,
        latestAttentionResolution,
        latestAttentionStateEvent,
        latestEvent,
        latestExecution: getLatestProviderExecution(provider.id),
        latestProbe: getLatestProviderProbe(provider.id),
        provider,
      });
    });
  }

  function summarizeProviderStatusEntries(providers) {
    return summarizeProviderStatusReadModel(providers, {
      defaultProviderId: providerRegistry.getDefaultProviderId(),
    });
  }

  function enrichProviderStatusEntries(providers) {
    const pendingAttentionItems = buildProviderAttentionPendingItemsFromProviders(providers, {});
    const recoveredAttentionItems = buildProviderAttentionRecoveredItemsFromProviders(providers, {});

    return enrichProviderStatusReadModel(providers, {
      pendingAttentionItems,
      recoveredAttentionItems,
    });
  }

  function summarizeProviderOverview(providers, probes) {
    const pendingAttentionItems = buildProviderAttentionPendingItemsFromProviders(providers, {});
    const recoveredAttentionItems = buildProviderAttentionRecoveredItemsFromProviders(providers, {});
    const pendingAttentionSummary = summarizeProviderAttentionItems(pendingAttentionItems);

    return summarizeProviderOverviewReadModel({
      acknowledgedAttentionRecords: store.listProviderAttentionAcknowledgements(),
      attentionReminderRecords: store.listProviderAttentionReminders(),
      defaultProviderId: providerRegistry.getDefaultProviderId(),
      events: buildProviderEvents(),
      executions: buildProviderExecutionEntries(),
      pendingAttentionItems,
      pendingAttentionSummary,
      probes,
      providers,
      recoveredAttentionItems,
    });
  }

  function buildProviderOverviewRecentWindow(since) {
    if (!since) {
      return null;
    }

    const probes = store
      .listProviderProbes()
      .filter((probe) => String(probe.checkedAt || probe.createdAt || '') >= since);
    const probeSummary = summarizeProviderProbes(probes);
    const executions = buildProviderExecutionEntries({ since });
    const executionSummary = summarizeProviderExecutions(executions);
    const executionDailyBuckets = buildProviderExecutionDailyBuckets(executions);
    const executionWeeklyBuckets = buildProviderExecutionWeeklyBuckets(executions);
    const executionMonthlyBuckets = buildProviderExecutionMonthlyBuckets(executions);
    const events = buildProviderEvents({ since });
    const eventSummary = summarizeProviderEvents(events);
    const touchedProviderIds = [
      ...new Set(
        [
          ...probes.map((probe) => probe.providerId),
          ...executions.map((execution) => execution.providerId),
          ...events.map((event) => event.providerId),
        ].filter(Boolean),
      ),
    ].sort((left, right) => String(left).localeCompare(String(right)));

    return {
      eventFamilyCounts: eventSummary.familyCounts,
      eventTotal: eventSummary.total,
      fallbackPolicyCounts: eventSummary.fallbackPolicyCounts,
      fallbackStopReasonCounts: eventSummary.fallbackStopReasonCounts,
      providerRouteDecisionCount: eventSummary.providerRouteDecisionCount,
      providerRouteDecisionPolicyCounts: eventSummary.providerRouteDecisionPolicyCounts,
      providerRouteDecisionRouteCounts: eventSummary.providerRouteDecisionRouteCounts,
      executionEstimatedCostUsdAverage: executionSummary.estimatedCostUsdAverage,
      executionEstimatedCostUsdByProviderId: executionSummary.estimatedCostUsdByProviderId,
      executionEstimatedCostUsdByRole: executionSummary.estimatedCostUsdByRole,
      executionBucketCount: executionDailyBuckets.length,
      executionDailyBuckets,
      executionEstimatedCostUsdMax: executionSummary.estimatedCostUsdMax,
      executionEstimatedCostUsdPricedCount: executionSummary.estimatedCostUsdPricedCount,
      executionEstimatedCostUsdTotal: executionSummary.estimatedCostUsdTotal,
      executionFailedCount: executionSummary.statusCounts.failed,
      executionFailureKindCounts: executionSummary.failureKindCounts,
      executionLatestBucketDate: executionDailyBuckets[0]?.date || null,
      executionLatestBucketDelta: buildProviderExecutionLatestBucketDelta(executionDailyBuckets),
      executionLatestMonthlyBucketDelta: buildProviderExecutionLatestMonthlyBucketDelta(executionMonthlyBuckets),
      executionLatestWeeklyBucketDelta: buildProviderExecutionLatestWeeklyBucketDelta(executionWeeklyBuckets),
      executionOldestBucketDate: executionDailyBuckets.at(-1)?.date || null,
      executionOldestMonthlyBucketStartDate: executionMonthlyBuckets.at(-1)?.monthStartDate || null,
      executionOldestWeeklyBucketStartDate: executionWeeklyBuckets.at(-1)?.weekStartDate || null,
      executionMonthlyBucketCount: executionMonthlyBuckets.length,
      executionMonthlyBuckets,
      executionLatestMonthlyBucketStartDate: executionMonthlyBuckets[0]?.monthStartDate || null,
      executionTotal: executionSummary.total,
      executionWeeklyBucketCount: executionWeeklyBuckets.length,
      executionWeeklyBuckets,
      executionLatestWeeklyBucketStartDate: executionWeeklyBuckets[0]?.weekStartDate || null,
      filters: {
        since,
      },
      latestAttentionEvent: eventSummary.latestAttentionEvent,
      latestEvent: eventSummary.latestEvent,
      latestExecution: executionSummary.latestExecution,
      latestExecutionEvent: eventSummary.latestExecutionEvent,
      latestFallbackEvent: eventSummary.latestFallbackEvent,
      latestProviderRouteDecisionEvent: eventSummary.latestProviderRouteDecisionEvent,
      latestFailedExecution: executionSummary.latestFailedExecution,
      latestFailedProbe: getLatestMatchingRecord(probes, (probe) => probe.attempted && !probe.ok),
      latestProbe: probes.at(-1) || null,
      latestProbeEvent: eventSummary.latestProbeEvent,
      latestSkippedProbe: getLatestMatchingRecord(probes, (probe) => !probe.attempted),
      latestSuccessfulExecution: executionSummary.latestSuccessfulExecution,
      latestSuccessfulProbe: getLatestMatchingRecord(probes, (probe) => probe.ok),
      probeAttemptedCount: probeSummary.attemptedCount,
      probeFailureCount: probeSummary.failureCount,
      probeFailureKindCounts: probeSummary.failureKindCounts,
      probeSkippedCount: probes.filter((probe) => !probe.attempted).length,
      probeSuccessCount: probeSummary.successCount,
      probeTotal: probeSummary.total,
      touchedProviderCount: touchedProviderIds.length,
      touchedProviderIds,
      usageInputTokensTotal: executionSummary.usageInputTokensTotal,
      usageOutputTokensTotal: executionSummary.usageOutputTokensTotal,
      usageTotalTokensTotal: executionSummary.usageTotalTokensTotal,
    };
  }

  function summarizeProviderHealthDrift({ attentionNeedsReminderCount = 0, attentionOverdueCount = 0, attentionRequiredCount = 0, recentWindow = null }) {
    const monthlyDelta = recentWindow?.executionLatestMonthlyBucketDelta || null;
    const recentExecutionMonthlyBucketCount = Number(recentWindow?.executionMonthlyBucketCount || 0);
    const recentExecutionCountDelta = Number(monthlyDelta?.executionCountDelta || 0);
    const recentExecutionFailedCountDelta = Number(monthlyDelta?.failedCountDelta || 0);
    const recentExecutionEstimatedCostUsdTotalDelta = roundUsdAmount(
      Number(monthlyDelta?.estimatedCostUsdTotalDelta || 0),
    );
    const reasonCodes = [];

    if (attentionOverdueCount > 0) {
      reasonCodes.push('attention-overdue');
    }
    if (attentionNeedsReminderCount > 0) {
      reasonCodes.push('attention-needs-reminder');
    }
    if (recentExecutionFailedCountDelta > 0) {
      reasonCodes.push('monthly-failed-up');
    }

    let status = 'stable';
    if (attentionOverdueCount > 0) {
      status = 'attention-required';
    } else if (attentionNeedsReminderCount > 0 || recentExecutionFailedCountDelta > 0) {
      status = 'watch';
    }

    return {
      attentionNeedsReminderCount,
      attentionOverdueCount,
      attentionRequiredCount,
      reasonCodes,
      recentExecutionCountDelta,
      recentExecutionCurrentMonthStartDate: recentWindow?.executionLatestMonthlyBucketStartDate || null,
      recentExecutionEstimatedCostUsdTotalDelta,
      recentExecutionFailedCountDelta,
      recentExecutionMonthlyBucketCount,
      recentExecutionOldestMonthStartDate: recentWindow?.executionOldestMonthlyBucketStartDate || null,
      recentExecutionPreviousMonthStartDate: monthlyDelta?.previousMonthStartDate || null,
      status,
    };
  }

  function buildProviderBaseEvents(filter = {}) {
    const family = normalizeText(filter.family).toLowerCase();
    const events = [];

    if (!family || family === 'probe') {
      const probeTimeline = buildProviderProbeTimeline(
        store.listProviderProbes({
          attempted: filter.attempted,
          ok: filter.ok,
          providerId: filter.providerId,
        }),
      );

      events.push(
        ...probeTimeline.map((event) => ({
          ...event,
          attempted: event.attempted,
          eventFamily: 'probe',
          eventKind: event.kind,
          executionStatus: null,
          ok: event.ok,
          probeId: event.id,
          role: null,
          runId: null,
          status: null,
        })),
      );
    }

    if (!family || family === 'attention') {
      const attentionTimeline = buildProviderAttentionTimeline(
        store.listProviderAttentionAcknowledgements({
          missionId: filter.missionId,
          providerId: filter.providerId,
          workspaceId: filter.workspaceId,
        }),
      );
      const reminderTimeline = buildProviderAttentionReminderTimeline(
        store.listProviderAttentionReminders({
          missionId: filter.missionId,
          providerId: filter.providerId,
          workspaceId: filter.workspaceId,
        }),
      );

      events.push(
        ...attentionTimeline.map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'attention',
          eventKind: event.kind,
          executionStatus: null,
          ok: null,
          probeId: null,
          role: null,
          runId: null,
          status: 'acknowledged',
        })),
        ...reminderTimeline.map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'attention',
          eventKind: event.kind,
          executionStatus: null,
          ok: null,
          probeId: null,
          role: null,
          runId: null,
        })),
      );
    }

    if (!family || family === 'execution') {
      const executionTimeline = buildProviderExecutionTimeline(
        buildProviderExecutionEntries({
          missionId: filter.missionId,
          providerId: filter.providerId,
          role: filter.role,
          status: filter.status,
          workspaceId: filter.workspaceId,
        }),
      );

      events.push(
        ...executionTimeline.map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'execution',
          eventKind: event.kind,
          executionStatus: event.status,
          ok: event.status === 'completed',
          probeId: null,
          runId: event.runId,
        })),
      );
    }

    if (!family || family === 'fallback') {
      events.push(...buildProviderFallbackEventTimeline(filter));
    }

    return sortTimelineEvents(events);
  }

  function buildProviderEvents(filter = {}) {
    const family = normalizeText(filter.family).toLowerCase();
    const fallbackPolicyFilter = normalizeText(filter.fallbackPolicy)
      ? normalizeProviderFallbackPolicy(filter.fallbackPolicy)
      : '';
    const fallbackStopReasonFilter = normalizeText(filter.fallbackStopReason);
    const hasFallbackScopedFilter = Boolean(fallbackPolicyFilter || fallbackStopReasonFilter);
    const normalizedSinceFilter = normalizeTimestampFilter(filter.since, 'provider event since timestamp');
    const events = [...buildProviderBaseEvents(filter)];

    if (!family || family === 'attention') {
      const attentionAcknowledgements = store.listProviderAttentionAcknowledgements({
        missionId: filter.missionId,
        providerId: filter.providerId,
        workspaceId: filter.workspaceId,
      });
      const syntheticOpenedTimeline = buildProviderAttentionOpenedTimeline(
        [
          ...buildProviderAttentionPendingItems({
            missionId: filter.missionId,
            providerId: filter.providerId,
            workspaceId: filter.workspaceId,
          }),
          ...buildProviderAttentionRecoveredItems({
            missionId: filter.missionId,
            providerId: filter.providerId,
            workspaceId: filter.workspaceId,
          }),
        ],
        attentionAcknowledgements,
      );

      events.push(
        ...syntheticOpenedTimeline.map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'attention',
          eventKind: event.kind,
          executionStatus: null,
          ok: null,
          probeId: null,
          role: null,
          runId: null,
          status: event.status,
        })),
        ...buildProviderAttentionRecoveredTimeline(
          buildProviderAttentionRecoveredItems({
            missionId: filter.missionId,
            providerId: filter.providerId,
            workspaceId: filter.workspaceId,
          }),
        ).map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'attention',
          eventKind: event.kind,
          executionStatus: null,
          ok: true,
          probeId: event.recoveryProbeId,
          role: null,
          runId: event.recoveryRunId,
          status: event.status,
        })),
      );
    }

    return sortTimelineEvents(events).filter((event) => {
      if (hasFallbackScopedFilter && event.eventFamily !== 'fallback') {
        return false;
      }
      if (fallbackPolicyFilter && event.fallbackPolicy !== fallbackPolicyFilter) {
        return false;
      }
      if (fallbackStopReasonFilter && normalizeText(event.fallbackStopReason) !== fallbackStopReasonFilter) {
        return false;
      }
      if (!normalizedSinceFilter) {
        return true;
      }
      return String(event.at || '') >= normalizedSinceFilter;
    });
  }

  function listProviders() {
    const providers = enrichProviderStatusEntries(buildProviderStatusEntries());
    return {
      providers,
      summary: summarizeProviderStatusEntries(providers),
    };
  }

  function getProviderOverview(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider overview since timestamp');
    const providers = enrichProviderStatusEntries(buildProviderStatusEntries());
    const probes = store.listProviderProbes();
    const recentWindow = buildProviderOverviewRecentWindow(since);
    const overviewSummary = summarizeProviderOverview(providers, probes);
    const healthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: overviewSummary.attentionNeedsReminderCount,
      attentionOverdueCount: overviewSummary.attentionOverdueCount,
      attentionRequiredCount: overviewSummary.attentionRequiredCount,
      recentWindow,
    });

    return buildProviderOverviewResult({
      healthDrift,
      overviewSummary,
      providers,
      recentWindow,
      since,
    });
  }

  function summarizeScopedProviderActivity(filter = {}) {
    const pendingAttentionItems = buildProviderAttentionPendingItems(filter);
    const acknowledgedAttentionItems = buildProviderAttentionAcknowledgedItems(filter);
    const recoveredAttentionItems = buildProviderAttentionRecoveredItems(filter);
    const resolvedAttentionItems = buildProviderAttentionResolvedItems(filter);
    const reminderRecords = store.listProviderAttentionReminders(filter);
    const attentionAcknowledgements = store.listProviderAttentionAcknowledgements(filter);
    const executionEntries = buildProviderExecutionEntries(filter);
    const executionSummary = summarizeProviderExecutions(executionEntries);
    const scopedProviderEvents = sortTimelineEvents([
      ...buildProviderAttentionOpenedTimeline(
        [...pendingAttentionItems, ...recoveredAttentionItems],
        attentionAcknowledgements,
      ).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'pending',
      })),
      ...buildProviderAttentionTimeline(
        attentionAcknowledgements,
      ).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'acknowledged',
      })),
      ...buildProviderAttentionRecoveredTimeline(recoveredAttentionItems).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: true,
        probeId: event.recoveryProbeId || null,
        role: null,
        runId: event.recoveryRunId || null,
        status: event.status || 'recovered',
      })),
      ...buildProviderAttentionReminderTimeline(reminderRecords).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'pending',
      })),
      ...buildProviderExecutionTimeline(executionEntries).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'execution',
        eventKind: event.kind,
        executionStatus: event.status,
        ok: event.status === 'completed',
        probeId: null,
      })),
    ]);
    const eventSummary = summarizeProviderEvents(scopedProviderEvents);
    const combinedAttentionSummary = summarizeProviderAttentionItems([
      ...pendingAttentionItems,
      ...acknowledgedAttentionItems,
      ...recoveredAttentionItems,
      ...resolvedAttentionItems,
    ]);
    const touchedProviderIds = [
      ...new Set(
        [
          ...pendingAttentionItems.map((item) => item.providerId),
          ...acknowledgedAttentionItems.map((item) => item.providerId),
          ...recoveredAttentionItems.map((item) => item.providerId),
          ...resolvedAttentionItems.map((item) => item.providerId),
          ...executionEntries.map((item) => item.providerId),
        ].filter(Boolean),
      ),
    ].sort((left, right) => String(left).localeCompare(String(right)));

    return {
      latestAttentionAcknowledgement: getLatestItem(acknowledgedAttentionItems, 'acknowledgedAt'),
      latestAttentionRecovery: getLatestItem(recoveredAttentionItems, 'recoveredAt'),
      latestAttentionReminder: getLatestItem(reminderRecords, 'remindedAt'),
      latestAttentionRequiredEvent: getLatestItem(pendingAttentionItems, 'createdAt'),
      latestAttentionResolution: getLatestItem(resolvedAttentionItems, 'resolvedAt'),
      latestExecution: executionSummary.latestExecution,
      latestExecutionEvent: eventSummary.latestExecutionEvent,
      latestFailedExecution: executionSummary.latestFailedExecution,
      latestSuccessfulExecution: executionSummary.latestSuccessfulExecution,
      touchedProviderCount: touchedProviderIds.length,
      touchedProviderIds,
      summary: {
        attentionAcknowledgedCount: acknowledgedAttentionItems.length,
        attentionNeedsReminderCount: pendingAttentionItems.filter((item) => item.needsReminder).length,
        attentionNextReminderAt:
          pendingAttentionItems
            .map((item) => item.nextReminderAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null,
        attentionOverdueCount: pendingAttentionItems.filter((item) => item.isOverdue).length,
        attentionAttemptHistoryEntryCountTotal: combinedAttentionSummary.attemptHistoryEntryCountTotal,
        attentionMaxAttemptCount: combinedAttentionSummary.maxAttemptCount,
        attentionMultiAttemptCount: combinedAttentionSummary.multiAttemptCount,
        attentionReminderCount: reminderRecords.length,
        attentionRequiredCount: pendingAttentionItems.length,
        attentionRecoveredCount: recoveredAttentionItems.length,
        attentionResolvedCount: resolvedAttentionItems.length,
        attentionTotalAttemptCount: combinedAttentionSummary.totalAttemptCount,
        attentionTotalRetryCount: combinedAttentionSummary.retryCountTotal,
        attentionStatusCounts: {
          acknowledged: acknowledgedAttentionItems.length,
          pending: pendingAttentionItems.length,
          recovered: recoveredAttentionItems.length,
          resolved: resolvedAttentionItems.length,
          total:
            pendingAttentionItems.length +
            acknowledgedAttentionItems.length +
            recoveredAttentionItems.length +
            resolvedAttentionItems.length,
        },
        eventCount: eventSummary.total,
        eventFamilyCounts: eventSummary.familyCounts,
        executionAverageDurationMs: executionSummary.averageDurationMs,
        executionFailureKindCounts: executionSummary.failureKindCounts,
        executionCompletedCount: executionSummary.statusCounts.completed,
        executionCount: executionSummary.total,
        executionFailedCount: executionSummary.statusCounts.failed,
        executionMaxDurationMs: executionSummary.maxDurationMs,
        executionMaxAttemptCount: executionSummary.maxAttemptCount,
        executionMultiAttemptCount: executionSummary.multiAttemptCount,
        executionRetryableFailureCount: executionSummary.retryableFailureCount,
        executionRetrySucceededCount: executionSummary.retrySucceededCount,
        executionTimedOutFailureCount: executionSummary.timedOutFailureCount,
        executionTotalAttemptCount: executionSummary.totalAttemptCount,
        executionTotalDurationMs: executionSummary.totalDurationMs,
        executionTotalRetryCount: executionSummary.totalRetryCount,
        executionAttemptHistoryEntryCountTotal: executionSummary.attemptHistoryEntryCountTotal,
        executionEstimatedCostUsdAverage: executionSummary.estimatedCostUsdAverage,
        executionEstimatedCostUsdByProviderId: executionSummary.estimatedCostUsdByProviderId,
        executionEstimatedCostUsdByRole: executionSummary.estimatedCostUsdByRole,
        executionEstimatedCostUsdMax: executionSummary.estimatedCostUsdMax,
        executionEstimatedCostUsdPricedCount: executionSummary.estimatedCostUsdPricedCount,
        executionEstimatedCostUsdTotal: executionSummary.estimatedCostUsdTotal,
        probeAverageDurationMs: eventSummary.probeAverageDurationMs,
        probeMaxDurationMs: eventSummary.probeMaxDurationMs,
        probeTotalDurationMs: eventSummary.probeTotalDurationMs,
        touchedProviderCount: touchedProviderIds.length,
        touchedProviderIds,
        usageInputTokensTotal: executionSummary.usageInputTokensTotal,
        usageOutputTokensTotal: executionSummary.usageOutputTokensTotal,
        usageTotalTokensTotal: executionSummary.usageTotalTokensTotal,
      },
    };
  }

  function summarizeMissionProviderActivity(missionId) {
    return summarizeScopedProviderActivity({ missionId });
  }

  function summarizeWorkspaceProviderActivity(workspaceId) {
    return summarizeScopedProviderActivity({ workspaceId });
  }

  function buildScopedProviderRecentWindow(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'scoped provider since timestamp');
    if (!since) {
      return null;
    }

    const pendingAttentionItems = buildProviderAttentionPendingItems(filter).filter(
      (item) => String(item.createdAt || '') >= since,
    );
    const acknowledgedAttentionItems = buildProviderAttentionAcknowledgedItems(filter).filter(
      (item) => String(item.acknowledgedAt || item.createdAt || '') >= since,
    );
    const recoveredAttentionItems = buildProviderAttentionRecoveredItems(filter).filter(
      (item) => String(item.recoveredAt || item.createdAt || '') >= since,
    );
    const resolvedAttentionItems = buildProviderAttentionResolvedItems(filter).filter(
      (item) => String(item.resolvedAt || item.createdAt || '') >= since,
    );
    const reminderRecords = store.listProviderAttentionReminders(filter).filter(
      (item) => String(item.remindedAt || item.createdAt || '') >= since,
    );
    const attentionAcknowledgements = store.listProviderAttentionAcknowledgements(filter).filter(
      (item) => String(item.acknowledgedAt || item.resolvedAt || item.createdAt || '') >= since,
    );
    const executionEntries = buildProviderExecutionEntries({
      ...filter,
      since,
    });
    const executionSummary = summarizeProviderExecutions(executionEntries);
    const executionDailyBuckets = buildProviderExecutionDailyBuckets(executionEntries);
    const executionWeeklyBuckets = buildProviderExecutionWeeklyBuckets(executionEntries);
    const executionMonthlyBuckets = buildProviderExecutionMonthlyBuckets(executionEntries);
    const scopedProviderEvents = sortTimelineEvents([
      ...buildProviderAttentionOpenedTimeline(
        [...pendingAttentionItems, ...recoveredAttentionItems],
        attentionAcknowledgements,
      ).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'pending',
      })),
      ...buildProviderAttentionTimeline(attentionAcknowledgements).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'acknowledged',
      })),
      ...buildProviderAttentionRecoveredTimeline(recoveredAttentionItems).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: true,
        probeId: event.recoveryProbeId || null,
        role: null,
        runId: event.recoveryRunId || null,
        status: event.status || 'recovered',
      })),
      ...buildProviderAttentionReminderTimeline(reminderRecords).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'pending',
      })),
      ...buildProviderExecutionTimeline(executionEntries).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'execution',
        eventKind: event.kind,
        executionStatus: event.status,
        ok: event.status === 'completed',
        probeId: null,
      })),
    ]);
    const eventSummary = summarizeProviderEvents(scopedProviderEvents);
    const touchedProviderIds = [
      ...new Set(
        [
          ...pendingAttentionItems.map((item) => item.providerId),
          ...acknowledgedAttentionItems.map((item) => item.providerId),
          ...recoveredAttentionItems.map((item) => item.providerId),
          ...resolvedAttentionItems.map((item) => item.providerId),
          ...executionEntries.map((item) => item.providerId),
        ].filter(Boolean),
      ),
    ].sort((left, right) => String(left).localeCompare(String(right)));

    return {
      eventCount: eventSummary.total,
      eventFamilyCounts: eventSummary.familyCounts,
      executionCount: executionSummary.total,
      executionEstimatedCostUsdAverage: executionSummary.estimatedCostUsdAverage,
      executionEstimatedCostUsdByProviderId: executionSummary.estimatedCostUsdByProviderId,
      executionEstimatedCostUsdByRole: executionSummary.estimatedCostUsdByRole,
      executionBucketCount: executionDailyBuckets.length,
      executionDailyBuckets,
      executionEstimatedCostUsdMax: executionSummary.estimatedCostUsdMax,
      executionEstimatedCostUsdPricedCount: executionSummary.estimatedCostUsdPricedCount,
      executionEstimatedCostUsdTotal: executionSummary.estimatedCostUsdTotal,
      executionFailedCount: executionSummary.statusCounts.failed,
      executionFailureKindCounts: executionSummary.failureKindCounts,
      executionLatestBucketDate: executionDailyBuckets[0]?.date || null,
      executionLatestBucketDelta: buildProviderExecutionLatestBucketDelta(executionDailyBuckets),
      executionLatestMonthlyBucketDelta: buildProviderExecutionLatestMonthlyBucketDelta(executionMonthlyBuckets),
      executionLatestWeeklyBucketDelta: buildProviderExecutionLatestWeeklyBucketDelta(executionWeeklyBuckets),
      executionOldestBucketDate: executionDailyBuckets.at(-1)?.date || null,
      executionOldestMonthlyBucketStartDate: executionMonthlyBuckets.at(-1)?.monthStartDate || null,
      executionOldestWeeklyBucketStartDate: executionWeeklyBuckets.at(-1)?.weekStartDate || null,
      executionMonthlyBucketCount: executionMonthlyBuckets.length,
      executionMonthlyBuckets,
      executionLatestMonthlyBucketStartDate: executionMonthlyBuckets[0]?.monthStartDate || null,
      executionWeeklyBucketCount: executionWeeklyBuckets.length,
      executionWeeklyBuckets,
      executionLatestWeeklyBucketStartDate: executionWeeklyBuckets[0]?.weekStartDate || null,
      filters: {
        since,
      },
      latestAttentionEvent: eventSummary.latestAttentionEvent,
      latestEvent: eventSummary.latestEvent,
      latestExecution: executionSummary.latestExecution,
      latestExecutionEvent: eventSummary.latestExecutionEvent,
      latestFallbackEvent: eventSummary.latestFallbackEvent,
      latestFailedExecution: executionSummary.latestFailedExecution,
      latestSuccessfulExecution: executionSummary.latestSuccessfulExecution,
      touchedProviderCount: touchedProviderIds.length,
      touchedProviderIds,
      usageInputTokensTotal: executionSummary.usageInputTokensTotal,
      usageOutputTokensTotal: executionSummary.usageOutputTokensTotal,
      usageTotalTokensTotal: executionSummary.usageTotalTokensTotal,
    };
  }

  function checkProvider(providerId) {
    const provider = enrichProviderStatusEntries(buildProviderStatusEntries()).find((entry) => entry.id === providerId);
    if (!provider) {
      providerRegistry.getProviderStatus(providerId);
      throw new Error(`Provider not found: ${providerId}`);
    }
    return provider;
  }

  async function probeProvider(providerId) {
    const result = await providerRegistry.probeProvider(providerId);
    const checkedAt = result.checkedAt || now();
    const probeRecord = store.saveProviderProbe({
      id: createId('provider-probe'),
      attemptCount: Number(result.attemptCount || 0),
      attemptHistory: normalizeProviderAttemptHistory(result.attemptHistory),
      durationMs: normalizeTelemetryNumber(result.durationMs),
      failureKind: normalizeText(result.failureKind) ? normalizeProviderFailureKind(result.failureKind) : null,
      httpStatus: Number.isFinite(Number(result.httpStatus)) ? Number(result.httpStatus) : null,
      providerId: result.id,
      providerResponseId: normalizeText(result.providerResponseId) || null,
      rawMessage: normalizeText(result.rawMessage) || null,
      recoverable: typeof result.recoverable === 'boolean' ? result.recoverable : null,
      retryCount: Number(result.retryCount || 0),
      attempted: Boolean(result.attempted),
      ok: Boolean(result.ok),
      reason: normalizeText(result.reason),
      endpoint: normalizeText(result.endpoint),
      transport: normalizeText(result.transport),
      model: normalizeText(result.model),
      modelAvailable: Boolean(result.modelAvailable),
      modelCount: Number.isFinite(Number(result.modelCount)) ? Number(result.modelCount) : 0,
      sampleModels: ensureArray(result.sampleModels).map((item) => normalizeText(item)).filter(Boolean),
      checkedAt,
      createdAt: checkedAt,
      timedOut: Boolean(result.timedOut),
    });

    return {
      ...result,
      probeId: probeRecord.id,
    };
  }

  function listProviderProbeHistory(filter = {}) {
    const probes = store.listProviderProbes(filter);
    return buildProviderProbeHistoryResult(probes);
  }

  function getProviderProbeTimeline(filter = {}) {
    const probes = store.listProviderProbes(filter);
    return buildProviderProbeTimelineResult(probes);
  }

  function getProviderExecutionHistory(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider execution since timestamp');
    const executions = buildProviderExecutionEntries({
      ...filter,
      since,
    });
    return buildProviderExecutionHistoryResult(executions, { ...filter, since });
  }

  function getProviderExecutionTimeline(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider execution since timestamp');
    const executions = buildProviderExecutionEntries({
      ...filter,
      since,
    });
    return buildProviderExecutionTimelineResult(executions, { ...filter, since });
  }

  function getProviderEventTimeline(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider event since timestamp');
    const fallbackPolicy = filter.fallbackPolicy ? normalizeProviderFallbackPolicy(filter.fallbackPolicy) : null;
    const timeline = buildProviderEvents({
      ...filter,
      fallbackPolicy,
      since,
    });
    return buildProviderEventTimelineResult(timeline, { ...filter, fallbackPolicy, since });
  }

  function buildProviderAttentionPendingItems(filter = {}) {
    return buildProviderAttentionPendingItemsFromProviders(buildProviderStatusEntries(), filter);
  }

  function buildProviderAttentionRecoveredItems(filter = {}) {
    return buildProviderAttentionRecoveredItemsFromProviders(buildProviderStatusEntries(), filter);
  }

  function buildProviderAttentionRecoveredItemsFromProviders(providers, filter = {}) {
    return providers
      .map((provider) => provider.latestAttentionRecovery || null)
      .filter(Boolean)
      .filter((item) => !filter.providerId || item.providerId === filter.providerId)
      .filter((item) => !filter.workspaceId || item.workspaceId === filter.workspaceId)
      .filter((item) => !filter.missionId || item.missionId === filter.missionId)
      .sort((left, right) => String(left.recoveredAt || left.createdAt || '').localeCompare(String(right.recoveredAt || right.createdAt || '')));
  }

  function buildProviderAttentionPendingItemsFromProviders(providers, filter = {}) {
    return providers
      .map((provider) => {
        const latestEvent = provider.latestAttentionStateEvent;
        if (!latestEvent || !['provider-probe-failed', 'provider-execution-failed'].includes(latestEvent.eventKind)) {
          return null;
        }

        if (filter.providerId && provider.id !== filter.providerId) {
          return null;
        }

        if (filter.workspaceId && latestEvent.workspaceId !== filter.workspaceId) {
          return null;
        }

        if (filter.missionId && latestEvent.missionId !== filter.missionId) {
          return null;
        }

        const existingAcknowledgement = getProviderAttentionAcknowledgementForEvent(latestEvent);
        if (existingAcknowledgement) {
          return null;
        }

        const fallbackPolicyId = 'provider-failure-only';
        const actionId = buildProviderAttentionActionId(latestEvent);
        const fallbackProviderId = latestEvent.eventFamily === 'execution' && provider.id !== 'stub' ? 'stub' : '';
        const permissionDecision = buildProviderAttentionRemediationPermissionDecision({
          actionId,
          at: latestEvent.at,
          attentionItem: {
            eventFamily: latestEvent.eventFamily,
            missionId: latestEvent.missionId || null,
            providerId: provider.id,
            sessionId: latestEvent.sessionId || null,
            workspaceId: latestEvent.workspaceId || null,
          },
          fallbackPolicy: fallbackProviderId ? fallbackPolicyId : '',
          fallbackProvider: fallbackProviderId,
          remediationKind:
            latestEvent.eventFamily === 'execution'
              ? fallbackProviderId
                ? 'mission-fallback-rerun'
                : 'mission-rerun'
              : 'provider-probe',
        });
        const reminderRecords = listProviderAttentionRemindersForEvent(latestEvent);
        const reminderCadenceHours = deriveProviderAttentionReminderCadenceHours(latestEvent.eventFamily);

        return buildProviderAttentionPendingActionItem({
          actionId,
          eventRefId: getProviderAttentionEventRefId(latestEvent),
          failureMetadata: extractProviderFailureMetadata(latestEvent),
          fallbackPolicyId,
          fallbackProviderId,
          latestEvent,
          permissionDecision,
          provider,
          reminderCadenceHours,
          reminderRecords,
        });
      })
      .filter(Boolean)
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildProviderAttentionAcknowledgedItems(filter = {}) {
    const recoveredActionIds = new Set(buildProviderAttentionRecoveredItems(filter).map((item) => item.actionId));

    return store
      .listProviderAttentionAcknowledgements({
        missionId: filter.missionId,
        providerId: filter.providerId,
        workspaceId: filter.workspaceId,
      })
      .filter((record) => (record.status || 'acknowledged') === 'acknowledged')
      .filter((record) => !recoveredActionIds.has(record.actionId))
      .map((record) =>
        buildProviderAttentionStoredActionItem({
          failureMetadata: extractProviderFailureMetadata(record),
          providerDisplayName:
            record.providerDisplayName || providerRegistry.getProviderStatus(record.providerId).displayName,
          record,
          status: 'acknowledged',
        }),
      )
      .sort((left, right) => String(left.acknowledgedAt || left.createdAt || '').localeCompare(String(right.acknowledgedAt || right.createdAt || '')));
  }

  function buildProviderAttentionResolvedItems(filter = {}) {
    return store
      .listProviderAttentionAcknowledgements({
        missionId: filter.missionId,
        providerId: filter.providerId,
        workspaceId: filter.workspaceId,
      })
      .filter((record) => (record.status || 'acknowledged') === 'resolved')
      .map((record) =>
        buildProviderAttentionStoredActionItem({
          failureMetadata: extractProviderFailureMetadata(record),
          providerDisplayName:
            record.providerDisplayName || providerRegistry.getProviderStatus(record.providerId).displayName,
          record,
          status: 'resolved',
        }),
      )
      .sort((left, right) => String(left.resolvedAt || left.acknowledgedAt || left.createdAt || '').localeCompare(String(right.resolvedAt || right.acknowledgedAt || right.createdAt || '')));
  }

  function buildProviderAttentionItems(filter = {}) {
    return buildProviderAttentionPendingItems(filter);
  }

  function buildProviderHealthDriftActionItems(filter = {}) {
    const since = getUtcMonthStartTimestamp();

    return store
      .listMissions()
      .map((mission) => {
        if (mission.status === 'completed') {
          return null;
        }
        if (filter.workspaceId && mission.workspaceId !== filter.workspaceId) {
          return null;
        }
        if (filter.missionId && mission.id !== filter.missionId) {
          return null;
        }

        const workspace = store.getWorkspace(mission.workspaceId);
        if (!workspace) {
          return null;
        }

        const providerRecentWindow = buildScopedProviderRecentWindow({
          missionId: mission.id,
          since,
        });
        const providerActivity = summarizeMissionProviderActivity(mission.id);
        const providerHealthDrift = summarizeProviderHealthDrift({
          attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
          attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
          attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
          recentWindow: providerRecentWindow,
        });

        if (providerHealthDrift.status !== 'watch' || providerHealthDrift.attentionRequiredCount > 0) {
          return null;
        }

        const latestFailedProviderExecution =
          providerRecentWindow?.latestFailedExecution || providerActivity.summary.latestFailedProviderExecution || null;
        const createdAt =
          latestFailedProviderExecution?.at || providerRecentWindow?.latestEvent?.at || providerRecentWindow?.latestExecution?.at || null;

        if (!createdAt) {
          return null;
        }

        const commandSince = providerHealthDrift.recentExecutionCurrentMonthStartDate
          ? `${providerHealthDrift.recentExecutionCurrentMonthStartDate}T00:00:00.000Z`
          : since;
        const recommendedCommand = `node src/cli.mjs mission timeline ${mission.id} --provider-since ${commandSince}`;
        const providerId = latestFailedProviderExecution?.providerId || providerRecentWindow?.latestExecution?.providerId || null;
        if (filter.providerId && providerId !== filter.providerId) {
          return null;
        }
        const reason = providerHealthDrift.reasonCodes.length > 0
          ? providerHealthDrift.reasonCodes.join(', ')
          : 'provider-health-drift';

        return addOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'provider-health-drift-required',
              actionId: `provider-health-drift:${mission.id}:${providerHealthDrift.recentExecutionCurrentMonthStartDate || formatDateUtc(Date.parse(createdAt))}`,
              actionType: 'provider-health-drift',
              createdAt,
              deliverableType: mission.deliverableType,
              driftReasonCodes: providerHealthDrift.reasonCodes,
              driftStatus: providerHealthDrift.status,
              latestFailedProviderExecution,
              missionId: mission.id,
              missionStatus: mission.status,
              missionTitle: mission.title,
              mode: mission.mode,
              providerHealthDrift,
              providerId,
              providerRecentSince: commandSince,
              reason,
              title: `Provider health drift review for ${mission.title}`,
              workspaceId: workspace.id,
              workspaceName: workspace.name,
            },
            {
              priority: 'medium',
              recommendedCommand,
              recommendedOwner: 'mission-owner',
            },
          ),
          {
            escalationRule:
              'Review recent provider execution drift and decide whether to rerun, switch provider, or narrow scope.',
            slaHours: 24,
          },
        );
      })
      .filter(Boolean)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function summarizeProviderAttentionItems(items) {
    const eventFamilyCounts = { execution: 0, probe: 0 };
    const providerCounts = {};
    const statusCounts = { acknowledged: 0, pending: 0, recovered: 0, resolved: 0, total: items.length };
    const overdueProviderIds = new Set();
    const workspaceCounts = {};
    let latestAcknowledgedAt = null;
    let latestDueAt = null;
    let latestReminderAt = null;
    let latestPendingAt = null;
    let latestRecoveredAt = null;
    let nextDueAt = null;
    let nextReminderAt = null;
    let latestResolvedAt = null;
    let needsReminderCount = 0;
    let overdueCount = 0;
    let reminderCountTotal = 0;
    const attemptSummary = summarizeAttemptMetrics(items);

    for (const item of items) {
      providerCounts[item.providerId] = (providerCounts[item.providerId] || 0) + 1;
      if (item.workspaceId) {
        workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
      }
      if (eventFamilyCounts[item.eventFamily] !== undefined) {
        eventFamilyCounts[item.eventFamily] += 1;
      }
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status] += 1;
      }
      if (item.status === 'pending' && (!latestPendingAt || String(latestPendingAt) < String(item.createdAt || ''))) {
        latestPendingAt = item.createdAt || null;
      }
      if (
        item.status === 'recovered' &&
        item.recoveredAt &&
        (!latestRecoveredAt || String(latestRecoveredAt) < String(item.recoveredAt))
      ) {
        latestRecoveredAt = item.recoveredAt;
      }
      if (item.dueAt && (!latestDueAt || String(latestDueAt) < String(item.dueAt))) {
        latestDueAt = item.dueAt;
      }
      if (item.dueAt && (!nextDueAt || String(nextDueAt) > String(item.dueAt))) {
        nextDueAt = item.dueAt;
      }
      if (item.isOverdue) {
        overdueCount += 1;
        if (item.providerId) {
          overdueProviderIds.add(item.providerId);
        }
      }
      reminderCountTotal += Number(item.reminderCount || 0);
      if (item.needsReminder) {
        needsReminderCount += 1;
      }
      if (
        item.latestReminderAt &&
        (!latestReminderAt || String(latestReminderAt) < String(item.latestReminderAt))
      ) {
        latestReminderAt = item.latestReminderAt;
      }
      if (
        item.nextReminderAt &&
        (!nextReminderAt || String(nextReminderAt) > String(item.nextReminderAt))
      ) {
        nextReminderAt = item.nextReminderAt;
      }
      if (
        item.status === 'acknowledged' &&
        item.acknowledgedAt &&
        (!latestAcknowledgedAt || String(latestAcknowledgedAt) < String(item.acknowledgedAt))
      ) {
        latestAcknowledgedAt = item.acknowledgedAt;
      }
      if (
        item.status === 'resolved' &&
        item.resolvedAt &&
        (!latestResolvedAt || String(latestResolvedAt) < String(item.resolvedAt))
      ) {
        latestResolvedAt = item.resolvedAt;
      }
    }

    return {
      eventFamilyCounts,
      latestAcknowledgedAt,
      latestDueAt,
      latestItem: items.at(-1) || null,
      latestPendingAt,
      latestRecoveredAt,
      latestReminderAt,
      latestResolvedAt,
      needsReminderCount,
      nextDueAt,
      nextReminderAt,
      overdueCount,
      overdueProviderIds: [...overdueProviderIds].sort((left, right) => String(left).localeCompare(String(right))),
      providerCounts,
      reminderCountTotal,
      retryCountTotal: attemptSummary.totalRetryCount,
      totalRetryCount: attemptSummary.totalRetryCount,
      totalAttemptCount: attemptSummary.totalAttemptCount,
      maxAttemptCount: attemptSummary.maxAttemptCount || null,
      multiAttemptCount: attemptSummary.multiAttemptCount,
      attemptHistoryEntryCountTotal: attemptSummary.attemptHistoryEntryCountTotal,
      statusCounts,
      total: items.length,
      workspaceCounts,
    };
  }

  function getProviderAttentionInbox(filter = {}) {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.status && !PROVIDER_ATTENTION_STATUSES.includes(filter.status)) {
      throw new Error(`Unsupported provider attention status: ${filter.status}`);
    }

    const effectiveStatus = filter.status || 'pending';
    const items =
      effectiveStatus === 'acknowledged'
        ? buildProviderAttentionAcknowledgedItems(filter)
        : effectiveStatus === 'recovered'
          ? buildProviderAttentionRecoveredItems(filter)
        : effectiveStatus === 'resolved'
          ? buildProviderAttentionResolvedItems(filter)
          : buildProviderAttentionPendingItems(filter);
    const filteredItems = items
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue);

    return {
      filters: {
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        status: effectiveStatus,
        workspaceId: filter.workspaceId || null,
      },
      items: filteredItems,
      summary: summarizeProviderAttentionItems(filteredItems),
    };
  }

  function getProviderHealthDriftInbox(filter = {}) {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }

    const items = buildProviderHealthDriftActionItems(filter).filter((item) => !filter.overdueOnly || item.isOverdue);

    return {
      filters: {
        missionId: filter.missionId || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeProviderHealthDriftItems(items),
    };
  }

  function remindProviderAttention(filter = {}, note = '') {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    const reminderTimestamp = now();
    const normalizedNote = normalizeText(note);
    const candidates = buildProviderAttentionPendingItems({
      missionId: filter.missionId,
      needsReminderOnly: Boolean(filter.dueOnly),
      overdueOnly: Boolean(filter.overdueOnly),
      providerId: filter.providerId,
      workspaceId: filter.workspaceId,
    }).filter((item) => !filter.owner || item.recommendedOwner === filter.owner);

    const items = candidates
      .map((item) =>
        store.saveProviderAttentionReminder(
          buildProviderAttentionReminderRecord({
            id: createId('provider-attention-reminder'),
            item,
            note: normalizedNote,
            remindedAt: reminderTimestamp,
          }),
        ),
      )
      .map((record) => ({
        ...record,
        detail: formatProviderAttentionReminderDetail(record),
      }))
      .sort((left, right) => String(left.remindedAt || left.createdAt || '').localeCompare(String(right.remindedAt || right.createdAt || '')));

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        missionId: filter.missionId || null,
        note: normalizedNote || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        dueCandidateCount: candidates.filter((item) => item.needsReminder).length,
        latestReminderAt:
          [...items]
            .map((item) => item.remindedAt || item.createdAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(-1) || null,
        overdueReminderCount: items.filter((item) => item.overdue).length,
        reminderCountTotal: items.length,
        remindedCount: items.length,
      },
    };
  }

  function acknowledgeProviderAttention(actionId, { note = '' }) {
    const pendingItem = buildProviderAttentionPendingItems({}).find((item) => item.actionId === actionId);
    if (!pendingItem) {
      throw new Error(`Provider attention item not found or no longer pending: ${actionId}`);
    }

    const acknowledgedAt = now();
    return store.saveProviderAttentionAcknowledgement(
      buildProviderAttentionAcknowledgementRecord({
        acknowledgedAt,
        id: createId('provider-attention-ack'),
        note,
        pendingItem,
      }),
    );
  }

  function resolveProviderAttention(actionId, { note = '' }) {
    const record = store.listProviderAttentionAcknowledgements({ actionId }).at(-1) || null;
    if (!record) {
      throw new Error(`Provider attention acknowledgement not found: ${actionId}`);
    }
    if ((record.status || 'acknowledged') === 'resolved') {
      throw new Error(`Provider attention already resolved: ${actionId}`);
    }

    const resolvedAt = now();
    return store.updateProviderAttentionAcknowledgement(record.id, (current) =>
      buildResolvedProviderAttentionRecord({ current, note, resolvedAt }),
    );
  }

  function summarizeProviderAttentionScopedState(filter = {}) {
    const pendingItems = buildProviderAttentionPendingItems(filter);
    const acknowledgedItems = buildProviderAttentionAcknowledgedItems(filter);
    const recoveredItems = buildProviderAttentionRecoveredItems(filter);
    const resolvedItems = buildProviderAttentionResolvedItems(filter);
    let status = 'clear';

    if (pendingItems.length) {
      status = 'pending';
    } else if (acknowledgedItems.length) {
      status = 'acknowledged';
    } else if (recoveredItems.length) {
      status = 'recovered';
    } else if (resolvedItems.length) {
      status = 'resolved';
    }

    return {
      acknowledgedCount: acknowledgedItems.length,
      latestAcknowledgedActionId: acknowledgedItems.at(-1)?.actionId || null,
      latestPendingActionId: pendingItems.at(-1)?.actionId || null,
      latestRecoveredActionId: recoveredItems.at(-1)?.actionId || null,
      latestResolvedActionId: resolvedItems.at(-1)?.actionId || null,
      pendingCount: pendingItems.length,
      recoveredCount: recoveredItems.length,
      resolvedCount: resolvedItems.length,
      status,
    };
  }

  function getProviderAttentionActionState(actionId) {
    const pendingItem = buildProviderAttentionPendingItems({}).find((item) => item.actionId === actionId);
    if (pendingItem) {
      return {
        item: pendingItem,
        status: 'pending',
      };
    }

    const acknowledgedItem = buildProviderAttentionAcknowledgedItems({}).find((item) => item.actionId === actionId);
    if (acknowledgedItem) {
      return {
        item: acknowledgedItem,
        status: 'acknowledged',
      };
    }

    const recoveredItem = buildProviderAttentionRecoveredItems({}).find((item) => item.actionId === actionId);
    if (recoveredItem) {
      return {
        item: recoveredItem,
        status: 'recovered',
      };
    }

    const resolvedItem = buildProviderAttentionResolvedItems({}).find((item) => item.actionId === actionId);
    if (resolvedItem) {
      return {
        item: resolvedItem,
        status: 'resolved',
      };
    }

    return null;
  }

  async function remediateProviderAttention(actionId, options = {}) {
    const actionState = getProviderAttentionActionState(actionId);
    if (!actionState) {
      throw new Error(`Provider attention item not found: ${actionId}`);
    }
    if (['resolved', 'recovered'].includes(actionState.status)) {
      throw new Error(`Provider attention is already closed: ${actionId}`);
    }

    const attentionItem = actionState.item;
    const fallbackProvider = normalizeText(options.fallbackProvider);
    const explicitFallbackPolicy = normalizeText(options.fallbackPolicy);
    let fallbackPolicy = null;
    let remediationKind = '';
    let result = null;

    if (attentionItem.eventFamily === 'probe') {
      if (fallbackProvider) {
        throw new Error('--fallback-provider is only supported for provider execution attention remediation.');
      }
      if (explicitFallbackPolicy) {
        throw new Error('--fallback-policy is only supported for provider execution attention remediation.');
      }

      remediationKind = 'probe';
      const probe = await probeProvider(attentionItem.providerId);
      result = {
        attempted: Boolean(probe.attempted),
        attemptCount: Number(probe.attemptCount || 0),
        checkedAt: probe.checkedAt || null,
        failureKind: normalizeText(probe.failureKind) ? normalizeProviderFailureKind(probe.failureKind) : null,
        ok: Boolean(probe.ok),
        probeId: probe.probeId || null,
        providerId: probe.id,
        reason: probe.reason || '',
        retryCount: Number(probe.retryCount || 0),
      };
    } else if (attentionItem.eventFamily === 'execution') {
      if (!attentionItem.missionId) {
        throw new Error(`Provider execution attention is missing mission context: ${actionId}`);
      }
      if (explicitFallbackPolicy && !fallbackProvider) {
        throw new Error('--fallback-policy requires --fallback-provider for provider execution attention remediation.');
      }

      if (fallbackProvider) {
        fallbackPolicy = normalizeProviderFallbackPolicy(
          explicitFallbackPolicy || attentionItem.fallbackPolicyId || 'provider-failure-only',
        );
      }
      remediationKind = fallbackProvider ? 'mission-fallback-rerun' : 'mission-rerun';
      const rerun = await runMission(attentionItem.missionId, {
        ...(fallbackProvider
          ? {
              fallbackProvider,
              fallbackPolicy,
            }
          : {}),
        provider: attentionItem.providerId,
        providerSpecified: true,
      });
      result = {
        approvalId: rerun.approval?.id || null,
        artifactPath: rerun.artifactPath || null,
        missionId: rerun.mission.id,
        missionStatus: rerun.mission.status,
        provider: rerun.provider,
        providerFallback: rerun.providerFallback || null,
        reviewerVerdict: rerun.reviewerVerdict || null,
        sessionId: rerun.session?.id || null,
      };
    } else {
      throw new Error(`Unsupported provider attention event family: ${attentionItem.eventFamily}`);
    }

    const permissionDecision = buildProviderAttentionRemediationPermissionDecision({
      actionId,
      at: now(),
      attentionItem,
      fallbackPolicy,
      fallbackProvider,
      remediationKind,
    });

    return {
      actionId,
      eventFamily: attentionItem.eventFamily,
      fallbackPolicy: attentionItem.eventFamily === 'execution' ? fallbackPolicy : null,
      missionId: attentionItem.missionId || null,
      permissionDecision,
      permissionDecisionId: permissionDecision.id,
      postAttention: summarizeProviderAttentionScopedState({
        missionId: attentionItem.missionId || null,
        providerId: attentionItem.providerId,
        workspaceId: attentionItem.workspaceId || null,
      }),
      previousStatus: actionState.status,
      primaryProviderId: attentionItem.providerId,
      providerId: attentionItem.providerId,
      remediationKind,
      result,
      workspaceId: attentionItem.workspaceId || null,
    };
  }


  function buildProviderFallbackTimelineEvents({ mission, sessions }) {
    return sessions
      .filter((session) => session.sourceContext?.providerFallbackRequested)
      .map((session) => {
        const sourceContext = session.sourceContext || {};
        const attempt = Number.isFinite(Number(sourceContext.providerFallbackAttempt))
          ? Number(sourceContext.providerFallbackAttempt)
          : 1;
        const attemptCount = Number.isFinite(Number(sourceContext.providerFallbackAttemptCount))
          ? Number(sourceContext.providerFallbackAttemptCount)
          : 1;
        const primaryProviderId = normalizeText(sourceContext.providerFallbackPrimary) || session.provider;
        const fallbackPolicy = normalizeProviderFallbackPolicy(sourceContext.providerFallbackPolicy);
        const fallbackProviderIds = ensureArray(sourceContext.providerFallbackFallbacks)
          .map((providerId) => normalizeText(providerId))
          .filter(Boolean);
        const providerFailure = getSessionProviderFailureSummary(session.id);
        const isFallbackAttempt = attempt > 1;
        const policyDecision = evaluateProviderFallbackPolicy({
          isLastAttempt: attempt >= attemptCount,
          missionStatus: session.status,
          policyId: fallbackPolicy,
          providerFailure,
        });
        const nextProviderId =
          policyDecision.eligible && fallbackProviderIds[attempt - 1] ? fallbackProviderIds[attempt - 1] : null;
        const providerRouteDecision = buildProviderFallbackRouteDecision({
          attempt,
          attemptCount,
          fallbackEligible: policyDecision.eligible,
          fallbackProviderIds,
          mission,
          missionStatus: session.status,
          nextProviderId,
          policyId: policyDecision.policyId,
          primaryProviderId,
          providerFailure,
          providerId: session.provider,
          session,
          stopReason: policyDecision.reason,
          workspace: mission.workspaceId ? { id: mission.workspaceId } : null,
        });
        const stopReasonSuffix = !policyDecision.eligible
          ? ` fallbackStopReason=${policyDecision.reason}.`
          : ` fallbackPolicy=${policyDecision.policyId}; next provider eligible.`;
        const providerFailureSuffix = providerFailure
          ? ` providerFailure=${providerFailure.failureKind}; role=${providerFailure.role || 'unknown'}.`
          : '';
        const routeDecisionSuffix = providerRouteDecision.id
          ? ` providerRouteDecision=${providerRouteDecision.id}.`
          : '';
        const routeSummary = summarizeProviderRouteDecisionForTimeline(providerRouteDecision);

        return {
          at: session.endedAt || session.startedAt,
          attempt,
          attemptCount,
          detail: isFallbackAttempt
            ? `Provider fallback attempt ${attempt}/${attemptCount} used ${session.provider} after primary ${primaryProviderId}; status=${session.status}; policy=${fallbackPolicy}.${providerFailureSuffix}${stopReasonSuffix}${routeSummary ? ` ${routeSummary}.` : ''}${routeDecisionSuffix}`
            : `Provider fallback primary attempt ${attempt}/${attemptCount} used ${session.provider}; status=${session.status}; policy=${fallbackPolicy}.${providerFailureSuffix}${stopReasonSuffix}${routeSummary ? ` ${routeSummary}.` : ''}${routeDecisionSuffix}`,
          fallbackEligible: policyDecision.eligible,
          fallbackNextProviderId: nextProviderId,
          fallbackPolicy,
          fallbackProviderIds,
          fallbackStopReason: policyDecision.reason,
          gatewayEventId: sourceContext.gatewayEventId || null,
          gatewayEventRoute: sourceContext.gatewayEventRoute || sourceContext.route || null,
          gatewayPermissionDecisionId: sourceContext.gatewayPermissionDecisionId || null,
          gatewaySandboxDecisionId: sourceContext.gatewaySandboxDecisionId || null,
          kind: isFallbackAttempt ? 'provider-fallback-used' : 'provider-fallback-attempted',
          missionId: mission.id,
          primaryProviderId,
          providerFailure,
          providerFailureKind: providerFailure?.failureKind || null,
          providerId: session.provider,
          providerRouteDecision,
          providerRouteDecisionId: providerRouteDecision.id,
          providerRouteName: providerRouteDecision.action.route,
          sessionId: session.id,
          status: session.status,
          workspaceId: mission.workspaceId || null,
        };
      })
      .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
  }

  function buildProviderFallbackEventTimeline(filter = {}) {
    const workspaceById = new Map(store.listWorkspaces().map((workspace) => [workspace.id, workspace]));

    return store
      .listMissions()
      .filter((mission) => !filter.missionId || mission.id === filter.missionId)
      .filter((mission) => !filter.workspaceId || mission.workspaceId === filter.workspaceId)
      .flatMap((mission) => {
        const workspace = workspaceById.get(mission.workspaceId) || null;
        return buildProviderFallbackTimelineEvents({
          mission,
          sessions: store.listSessionsByMission(mission.id),
        }).map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'fallback',
          eventKind: event.kind,
          executionStatus: null,
          missionTitle: mission.title,
          ok: event.kind === 'provider-fallback-used' ? true : null,
          probeId: null,
          role: null,
          runId: null,
          workspaceName: workspace?.name || null,
        }));
      })
      .filter((event) => !filter.providerId || event.providerId === filter.providerId)
      .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
  }

  function summarizeMissionProviderFallback({ mission, sessions }) {
    const events = buildProviderFallbackTimelineEvents({
      mission,
      sessions,
    });
    const usedEvents = events.filter((event) => event.kind === 'provider-fallback-used');
    const fallbackPolicyCounts = {};
    const fallbackStopReasonCounts = {};
    const providerRouteDecisionPolicyCounts = {};
    const providerRouteDecisionRouteCounts = {};
    const providerRouteDecisionEvents = [];

    for (const event of events) {
      if (event.fallbackPolicy) {
        fallbackPolicyCounts[event.fallbackPolicy] = (fallbackPolicyCounts[event.fallbackPolicy] || 0) + 1;
      }
      if (event.fallbackStopReason) {
        fallbackStopReasonCounts[event.fallbackStopReason] =
          (fallbackStopReasonCounts[event.fallbackStopReason] || 0) + 1;
      }
      if (event.providerRouteDecision) {
        providerRouteDecisionEvents.push(event);
        const routeName = normalizeText(event.providerRouteDecision.action?.route || event.providerRouteName);
        if (routeName) {
          providerRouteDecisionRouteCounts[routeName] = (providerRouteDecisionRouteCounts[routeName] || 0) + 1;
        }
        const policyId = normalizeText(event.providerRouteDecision.policyId || event.fallbackPolicy);
        if (policyId) {
          providerRouteDecisionPolicyCounts[policyId] = (providerRouteDecisionPolicyCounts[policyId] || 0) + 1;
        }
      }
    }

    return {
      latestProviderFallbackEvent: getLatestItem(events, 'at'),
      latestProviderRouteDecisionEvent: getLatestItem(providerRouteDecisionEvents, 'at'),
      providerFallbackAttemptCount: events.length,
      providerFallbackPolicyCounts: fallbackPolicyCounts,
      providerFallbackPrimaryProviderIds: [...new Set(events.map((event) => event.primaryProviderId).filter(Boolean))],
      providerFallbackRequested: events.length > 0,
      providerFallbackStopReasonCounts: fallbackStopReasonCounts,
      providerFallbackUsedCount: usedEvents.length,
      providerFallbackUsedProviderIds: [...new Set(usedEvents.map((event) => event.providerId).filter(Boolean))],
      providerRouteDecisionCount: providerRouteDecisionEvents.length,
      providerRouteDecisionPolicyCounts,
      providerRouteDecisionRouteCounts,
    };
  }

  return {
    acknowledgeProviderAttention,
    buildProviderFallbackEventTimeline,
    buildProviderFallbackTimelineEvents,
    buildProviderAttentionItems,
    buildProviderAttentionOpenedTimeline,
    buildProviderAttentionPendingItems,
    buildProviderAttentionRecoveredItems,
    buildProviderAttentionRecoveredTimeline,
    buildProviderAttentionReminderTimeline,
    buildProviderAttentionTimeline,
    buildProviderExecutionEntries,
    buildProviderHealthDriftActionItems,
    checkProvider,
    getProviderAttentionInbox,
    getProviderEventTimeline,
    getProviderExecutionHistory,
    getProviderExecutionTimeline,
    getProviderHealthDriftInbox,
    getProviderOverview,
    getProviderProbeTimeline,
    listProviderProbeHistory,
    listProviders,
    probeProvider,
    remediateProviderAttention,
    remindProviderAttention,
    resolveProviderAttention,
    summarizeMissionProviderActivity,
    summarizeMissionProviderFallback,
    summarizeProviderHealthDrift,
    summarizeProviderAttentionScopedState,
    summarizeWorkspaceProviderActivity,
    buildScopedProviderRecentWindow,
  };
}
