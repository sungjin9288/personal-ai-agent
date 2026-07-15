import { AGENT_ROLES, AGENT_RUN_STATUSES } from './constants.mjs';
import { roundUsdAmount } from '../providers/provider-runtime-utils.mjs';
import {
  normalizeProviderAttemptHistory,
  normalizeTelemetryNumber,
  summarizeAttemptMetrics,
  summarizeDurationMetrics,
  summarizeEstimatedCostBreakdown,
  summarizeEstimatedCostMetrics,
  summarizeFailureKinds,
  summarizeUsageMetrics,
} from './provider-telemetry.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function formatProviderFailureDetail({ detail, failureKind, httpStatus, timedOut, attemptCount, recoverable }) {
  const summary = normalizeText(detail);
  const metadata = [];

  if (failureKind) {
    metadata.push(`kind=${failureKind}`);
  }
  if (Number.isFinite(Number(httpStatus)) && Number(httpStatus) > 0) {
    metadata.push(`http=${Number(httpStatus)}`);
  }
  if (timedOut) {
    metadata.push('timedOut=true');
  }
  if (Number.isFinite(Number(attemptCount)) && Number(attemptCount) > 1) {
    metadata.push(`attempts=${Number(attemptCount)}`);
  }
  if (typeof recoverable === 'boolean') {
    metadata.push(`recoverable=${recoverable ? 'true' : 'false'}`);
  }

  return metadata.length ? `${summary} [${metadata.join(', ')}]` : summary;
}

export function getLatestMatchingRecord(records, predicate) {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    if (predicate(records[index])) {
      return records[index];
    }
  }

  return null;
}

export function summarizeProviderExecutions(executions) {
  const providerCounts = {};
  const roleCounts = Object.fromEntries(AGENT_ROLES.map((role) => [role, 0]));
  const statusCounts = {
    ...Object.fromEntries(AGENT_RUN_STATUSES.map((status) => [status, 0])),
    total: executions.length,
  };
  const durationSummary = summarizeDurationMetrics(executions);
  const usageSummary = summarizeUsageMetrics(executions);
  const estimatedCostSummary = summarizeEstimatedCostMetrics(executions);
  const estimatedCostByProviderId = summarizeEstimatedCostBreakdown(executions, 'providerId');
  const estimatedCostByRole = summarizeEstimatedCostBreakdown(executions, 'role');
  const attemptSummary = summarizeAttemptMetrics(executions, (execution) => execution.status === 'completed');

  for (const execution of executions) {
    providerCounts[execution.providerId] = (providerCounts[execution.providerId] || 0) + 1;
    if (roleCounts[execution.role] !== undefined) {
      roleCounts[execution.role] += 1;
    }
    if (statusCounts[execution.status] !== undefined) {
      statusCounts[execution.status] += 1;
    }
  }

  return {
    averageDurationMs: durationSummary.averageDurationMs,
    failureKindCounts: summarizeFailureKinds(executions.filter((execution) => execution.status === 'failed')),
    latestExecution: executions.at(-1) || null,
    latestFailedExecution: getLatestMatchingRecord(executions, (execution) => execution.status === 'failed'),
    latestSuccessfulExecution: getLatestMatchingRecord(executions, (execution) => execution.status === 'completed'),
    maxDurationMs: durationSummary.maxDurationMs,
    providerCounts,
    retryableFailureCount: executions.filter((execution) => execution.status === 'failed' && execution.recoverable).length,
    totalAttemptCount: attemptSummary.totalAttemptCount,
    totalRetryCount: attemptSummary.totalRetryCount,
    timedOutFailureCount: executions.filter((execution) => execution.status === 'failed' && execution.timedOut).length,
    retrySucceededCount: attemptSummary.retrySucceededCount,
    multiAttemptCount: attemptSummary.multiAttemptCount,
    maxAttemptCount: attemptSummary.maxAttemptCount || null,
    attemptHistoryEntryCountTotal: attemptSummary.attemptHistoryEntryCountTotal,
    totalDurationMs: durationSummary.totalDurationMs,
    roleCounts,
    statusCounts,
    total: executions.length,
    estimatedCostUsdByProviderId: estimatedCostByProviderId,
    estimatedCostUsdByRole: estimatedCostByRole,
    ...estimatedCostSummary,
    ...usageSummary,
  };
}

export function buildProviderExecutionTimeline(executions) {
  return executions.map((execution) => ({
    at: execution.at,
    attemptCount: Number(execution.attemptCount || 0),
    attemptHistory: normalizeProviderAttemptHistory(execution.attemptHistory),
    attemptHistoryCount: Number(execution.attemptHistoryCount || 0),
    durationMs: normalizeTelemetryNumber(execution.durationMs),
    estimatedCostUsd: roundUsdAmount(execution.estimatedCostUsd),
    detail:
      formatProviderFailureDetail({
        attemptCount: execution.attemptCount,
        detail:
          execution.outputSummary ||
          execution.inputSummary ||
          `Provider ${execution.providerId} ${execution.role} run ${execution.status}.`,
        failureKind: execution.status === 'failed' ? execution.failureKind : null,
        httpStatus: execution.httpStatus,
        recoverable: execution.recoverable,
        timedOut: execution.timedOut,
      }) ||
      execution.inputSummary ||
      `Provider ${execution.providerId} ${execution.role} run ${execution.status}.`,
    failureKind: execution.failureKind || null,
    httpStatus: execution.httpStatus,
    kind:
      execution.status === 'failed'
        ? 'provider-execution-failed'
        : execution.status === 'completed'
          ? 'provider-execution-succeeded'
          : 'provider-execution-started',
    missionId: execution.missionId,
    missionTitle: execution.missionTitle,
    providerId: execution.providerId,
    providerResponseId: execution.providerResponseId,
    rawMessage: execution.rawMessage,
    recoverable: execution.recoverable,
    retryCount: Number(execution.retryCount || 0),
    role: execution.role,
    runId: execution.id,
    executionStatus: execution.status,
    specialistKind: execution.specialistKind,
    sessionId: execution.sessionId,
    status: execution.status,
    timedOut: execution.timedOut,
    usageInputTokens: normalizeTelemetryNumber(execution.usageInputTokens),
    usageOutputTokens: normalizeTelemetryNumber(execution.usageOutputTokens),
    usageTotalTokens: normalizeTelemetryNumber(execution.usageTotalTokens),
    workspaceId: execution.workspaceId,
    workspaceName: execution.workspaceName,
  }));
}

export function summarizeProviderExecutionTimeline(events) {
  const eventCounts = {};
  const providerCounts = {};
  const roleCounts = Object.fromEntries(AGENT_ROLES.map((role) => [role, 0]));
  const statusCounts = {
    ...Object.fromEntries(AGENT_RUN_STATUSES.map((status) => [status, 0])),
    total: events.length,
  };
  const durationSummary = summarizeDurationMetrics(events);
  const usageSummary = summarizeUsageMetrics(events);
  const estimatedCostSummary = summarizeEstimatedCostMetrics(events);
  const estimatedCostByProviderId = summarizeEstimatedCostBreakdown(events, 'providerId');
  const estimatedCostByRole = summarizeEstimatedCostBreakdown(events, 'role');
  const attemptSummary = summarizeAttemptMetrics(events, (event) => event.status === 'completed');

  for (const event of events) {
    eventCounts[event.kind] = (eventCounts[event.kind] || 0) + 1;
    providerCounts[event.providerId] = (providerCounts[event.providerId] || 0) + 1;
    if (roleCounts[event.role] !== undefined) {
      roleCounts[event.role] += 1;
    }
    if (statusCounts[event.status] !== undefined) {
      statusCounts[event.status] += 1;
    }
  }

  return {
    averageDurationMs: durationSummary.averageDurationMs,
    eventCounts,
    failureKindCounts: summarizeFailureKinds(events.filter((event) => event.executionStatus === 'failed')),
    latestEvent: events.at(-1) || null,
    maxDurationMs: durationSummary.maxDurationMs,
    providerCounts,
    retryableFailureCount: events.filter((event) => event.executionStatus === 'failed' && event.recoverable).length,
    totalAttemptCount: attemptSummary.totalAttemptCount,
    totalRetryCount: attemptSummary.totalRetryCount,
    roleCounts,
    retrySucceededCount: attemptSummary.retrySucceededCount,
    statusCounts,
    multiAttemptCount: attemptSummary.multiAttemptCount,
    timedOutFailureCount: events.filter((event) => event.executionStatus === 'failed' && event.timedOut).length,
    maxAttemptCount: attemptSummary.maxAttemptCount || null,
    attemptHistoryEntryCountTotal: attemptSummary.attemptHistoryEntryCountTotal,
    total: events.length,
    totalDurationMs: durationSummary.totalDurationMs,
    estimatedCostUsdByProviderId: estimatedCostByProviderId,
    estimatedCostUsdByRole: estimatedCostByRole,
    ...estimatedCostSummary,
    ...usageSummary,
  };
}

export function buildProviderProbeTimeline(probes) {
  return probes.map((probe) => {
    const attemptHistory = normalizeProviderAttemptHistory(probe.attemptHistory);
    const kind = probe.attempted
      ? probe.ok
        ? 'provider-probe-succeeded'
        : 'provider-probe-failed'
      : 'provider-probe-skipped';

    return {
      at: probe.checkedAt || probe.createdAt,
      attempted: probe.attempted,
      attemptCount: Number(probe.attemptCount || 0),
      attemptHistory,
      attemptHistoryCount: attemptHistory.length,
      durationMs: normalizeTelemetryNumber(probe.durationMs),
      detail: formatProviderFailureDetail({
        attemptCount: probe.attemptCount,
        detail: probe.reason || (probe.ok ? 'Provider probe succeeded.' : 'Provider probe failed.'),
        failureKind: probe.ok ? null : probe.failureKind,
        httpStatus: probe.httpStatus,
        recoverable: probe.recoverable,
        timedOut: probe.timedOut,
      }),
      endpoint: probe.endpoint || null,
      failureKind: probe.failureKind || null,
      httpStatus: Number.isFinite(Number(probe.httpStatus)) ? Number(probe.httpStatus) : null,
      id: probe.id,
      kind,
      model: probe.model || null,
      modelAvailable: probe.modelAvailable,
      modelCount: probe.modelCount,
      ok: probe.ok,
      providerId: probe.providerId,
      providerResponseId: probe.providerResponseId || null,
      rawMessage: probe.rawMessage || null,
      recoverable: typeof probe.recoverable === 'boolean' ? probe.recoverable : null,
      retryCount: Number(probe.retryCount || 0),
      sampleModels: Array.isArray(probe.sampleModels) ? probe.sampleModels : [],
      timedOut: Boolean(probe.timedOut),
      transport: probe.transport || null,
    };
  });
}

export function summarizeProviderProbeTimeline(events) {
  const eventCounts = {};
  const providerCounts = {};
  let attemptedCount = 0;
  let failureCount = 0;
  let successCount = 0;
  const durationSummary = summarizeDurationMetrics(events);
  const attemptSummary = summarizeAttemptMetrics(events, (event) => event.ok);

  for (const event of events) {
    eventCounts[event.kind] = (eventCounts[event.kind] || 0) + 1;
    providerCounts[event.providerId] = (providerCounts[event.providerId] || 0) + 1;
    if (event.attempted) {
      attemptedCount += 1;
    }
    if (event.ok) {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  }

  return {
    attemptedCount,
    attemptHistoryEntryCountTotal: attemptSummary.attemptHistoryEntryCountTotal,
    averageDurationMs: durationSummary.averageDurationMs,
    eventCounts,
    failureCount,
    failureKindCounts: summarizeFailureKinds(events.filter((event) => event.attempted && !event.ok)),
    latestEvent: events.at(-1) || null,
    maxAttemptCount: attemptSummary.maxAttemptCount || null,
    maxDurationMs: durationSummary.maxDurationMs,
    multiAttemptCount: attemptSummary.multiAttemptCount,
    providerCounts,
    retryableFailureCount: events.filter((event) => event.attempted && !event.ok && event.recoverable).length,
    retrySucceededCount: attemptSummary.retrySucceededCount,
    successCount,
    timedOutFailureCount: events.filter((event) => event.attempted && !event.ok && event.timedOut).length,
    total: events.length,
    totalAttemptCount: attemptSummary.totalAttemptCount,
    totalDurationMs: durationSummary.totalDurationMs,
    totalRetryCount: attemptSummary.totalRetryCount,
  };
}

export function summarizeProviderProbes(probes) {
  const providerCounts = {};
  let attemptedCount = 0;
  let failureCount = 0;
  let successCount = 0;
  const durationSummary = summarizeDurationMetrics(probes);
  const attemptSummary = summarizeAttemptMetrics(probes, (probe) => probe.ok);

  for (const probe of probes) {
    providerCounts[probe.providerId] = (providerCounts[probe.providerId] || 0) + 1;
    if (probe.attempted) {
      attemptedCount += 1;
    }
    if (probe.ok) {
      successCount += 1;
    } else {
      failureCount += 1;
    }
  }

  return {
    attemptedCount,
    averageDurationMs: durationSummary.averageDurationMs,
    failureKindCounts: summarizeFailureKinds(probes.filter((probe) => !probe.ok)),
    failureCount,
    latestProbe: probes.at(-1) || null,
    maxDurationMs: durationSummary.maxDurationMs,
    providerCounts,
    retryableFailureCount: probes.filter((probe) => !probe.ok && probe.recoverable).length,
    totalAttemptCount: attemptSummary.totalAttemptCount,
    totalRetryCount: attemptSummary.totalRetryCount,
    successCount,
    retrySucceededCount: attemptSummary.retrySucceededCount,
    multiAttemptCount: attemptSummary.multiAttemptCount,
    timedOutFailureCount: probes.filter((probe) => !probe.ok && probe.timedOut).length,
    maxAttemptCount: attemptSummary.maxAttemptCount || null,
    attemptHistoryEntryCountTotal: attemptSummary.attemptHistoryEntryCountTotal,
    total: probes.length,
    totalDurationMs: durationSummary.totalDurationMs,
  };
}
