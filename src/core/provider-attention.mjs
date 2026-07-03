import {
  normalizeProviderAttemptHistory,
  normalizeProviderFailureKind,
  normalizeTelemetryNumber,
} from './provider-telemetry.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

/**
 * Provider attention timeline domain (build side of the provider-attention feature).
 *
 * Instantiated once inside createMissionService. This module owns the four pure
 * timeline builders that fold provider-attention acknowledgement / reminder /
 * recovered / opened records into normalized timeline events.
 *
 * The builders are pure (no `store`, no `now`): they only reshape their record
 * inputs using the provider-telemetry normalizers (imported directly from
 * ./provider-telemetry.mjs so they stay out of the injection budget) and the
 * provider-attention detail formatters.
 *
 * `formatProviderAttentionRecoveryDetail` is moved here because its only call
 * site is the recovered-timeline builder. `formatProviderAttentionReminderDetail`
 * is INJECTED rather than moved because it also has a call site inside
 * `remindProviderAttention` in mission-service, so it stays defined there.
 */
export function createProviderAttention({ formatProviderAttentionReminderDetail }) {
  function formatProviderAttentionRecoveryDetail(item) {
    const recoveryLabel =
      item.eventFamily === 'execution' ? 'successful provider execution' : 'successful provider probe';
    const recoveryDetail = normalizeText(item.recoveryDetail);
    const failureDetail = normalizeText(item.reason);
    const acknowledgedPrefix = item.acknowledgedAt ? 'Acknowledged attention recovered after ' : 'Recovered after ';
    const detailSuffix = recoveryDetail || failureDetail;

    return detailSuffix ? `${acknowledgedPrefix}${recoveryLabel}: ${detailSuffix}` : `${acknowledgedPrefix}${recoveryLabel}.`;
  }

  function buildProviderAttentionTimeline(records) {
    return records.flatMap((record) => {
      const baseEvent = {
        actionId: record.actionId,
        acknowledgedAt: record.acknowledgedAt || record.createdAt || null,
        attemptCount: Number(record.attemptCount || 0),
        attemptHistory: normalizeProviderAttemptHistory(record.attemptHistory),
        attemptHistoryCount: normalizeProviderAttemptHistory(record.attemptHistory).length,
        durationMs: normalizeTelemetryNumber(record.durationMs),
        eventRefId: record.eventRefId || null,
        failureKind: normalizeText(record.failureKind) ? normalizeProviderFailureKind(record.failureKind) : null,
        httpStatus: Number.isFinite(Number(record.httpStatus)) ? Number(record.httpStatus) : null,
        missionId: record.missionId || null,
        openedAt: record.openedAt || null,
        providerDisplayName: record.providerDisplayName || null,
        providerId: record.providerId,
        providerResponseId: record.providerResponseId || null,
        rawMessage: record.rawMessage || null,
        recoverable: typeof record.recoverable === 'boolean' ? record.recoverable : null,
        retryCount: Number(record.retryCount || 0),
        resolvedAt: record.resolvedAt || null,
        resolutionNote: record.resolutionNote || null,
        sessionId: record.sessionId || null,
        status: record.status || 'acknowledged',
        timedOut: Boolean(record.timedOut),
        usageInputTokens: normalizeTelemetryNumber(record.usageInputTokens),
        usageOutputTokens: normalizeTelemetryNumber(record.usageOutputTokens),
        usageTotalTokens: normalizeTelemetryNumber(record.usageTotalTokens),
        workspaceId: record.workspaceId || null,
        workspaceName: record.workspaceName || null,
      };

      const events = [
        {
          ...baseEvent,
          at: record.openedAt || record.acknowledgedAt || record.createdAt || null,
          detail: record.reason || record.title || 'Provider attention opened.',
          kind: 'provider-attention-opened',
        },
        {
          ...baseEvent,
          at: record.acknowledgedAt || record.createdAt || null,
          detail: record.note || 'Provider attention acknowledged.',
          kind: 'provider-attention-acknowledged',
        },
      ];

      if ((record.status || 'acknowledged') === 'resolved' && record.resolvedAt) {
        events.push({
          ...baseEvent,
          at: record.resolvedAt,
          detail: record.resolutionNote || 'Provider attention resolved.',
          kind: 'provider-attention-resolved',
        });
      }

      return events;
    });
  }

  function buildProviderAttentionReminderTimeline(records) {
    return records.map((record) => ({
      actionId: record.actionId,
      at: record.remindedAt || record.createdAt || null,
      detail: formatProviderAttentionReminderDetail(record),
      eventRefId: record.eventRefId || null,
      kind: 'provider-attention-reminded',
      missionId: record.missionId || null,
      providerDisplayName: record.providerDisplayName || null,
      providerId: record.providerId,
      sessionId: record.sessionId || null,
      status: 'pending',
      workspaceId: record.workspaceId || null,
      workspaceName: record.workspaceName || null,
    }));
  }

  function buildProviderAttentionRecoveredTimeline(items) {
    return items.map((item) => ({
      acknowledgedAt: item.acknowledgedAt || null,
      actionId: item.actionId,
      at: item.recoveredAt,
      attemptCount: Number(item.attemptCount || 0),
      attemptHistory: normalizeProviderAttemptHistory(item.attemptHistory),
      attemptHistoryCount: normalizeProviderAttemptHistory(item.attemptHistory).length,
      durationMs: normalizeTelemetryNumber(item.durationMs),
      detail: formatProviderAttentionRecoveryDetail(item),
      eventRefId: item.eventRefId || null,
      failureKind: normalizeText(item.failureKind) ? normalizeProviderFailureKind(item.failureKind) : null,
      httpStatus: Number.isFinite(Number(item.httpStatus)) ? Number(item.httpStatus) : null,
      kind: 'provider-attention-recovered',
      missionId: item.missionId || null,
      providerDisplayName: item.providerDisplayName || null,
      providerId: item.providerId,
      providerResponseId: item.providerResponseId || null,
      rawMessage: item.rawMessage || null,
      recoveredAt: item.recoveredAt,
      recoveryEventKind: item.recoveryEventKind || null,
      recoveryProbeId: item.recoveryProbeId || null,
      recoveryRunId: item.recoveryRunId || null,
      recoverable: typeof item.recoverable === 'boolean' ? item.recoverable : null,
      retryCount: Number(item.retryCount || 0),
      sessionId: item.sessionId || null,
      status: 'recovered',
      timedOut: Boolean(item.timedOut),
      usageInputTokens: normalizeTelemetryNumber(item.usageInputTokens),
      usageOutputTokens: normalizeTelemetryNumber(item.usageOutputTokens),
      usageTotalTokens: normalizeTelemetryNumber(item.usageTotalTokens),
      workspaceId: item.workspaceId || null,
      workspaceName: item.workspaceName || null,
    }));
  }

  function buildProviderAttentionOpenedTimeline(items, acknowledgementRecords = []) {
    const acknowledgedActionIds = new Set(acknowledgementRecords.map((record) => record.actionId));

    return items
      .filter((item) => !acknowledgedActionIds.has(item.actionId))
      .map((item) => ({
        actionId: item.actionId,
        at: item.createdAt,
        attemptCount: Number(item.attemptCount || 0),
        attemptHistory: normalizeProviderAttemptHistory(item.attemptHistory),
        attemptHistoryCount: normalizeProviderAttemptHistory(item.attemptHistory).length,
        durationMs: normalizeTelemetryNumber(item.durationMs),
        detail: item.reason || item.title || 'Provider attention opened.',
        eventRefId: item.eventRefId || null,
        failureKind: normalizeText(item.failureKind) ? normalizeProviderFailureKind(item.failureKind) : null,
        httpStatus: Number.isFinite(Number(item.httpStatus)) ? Number(item.httpStatus) : null,
        kind: 'provider-attention-opened',
        missionId: item.missionId || null,
        providerDisplayName: item.providerDisplayName || null,
        providerId: item.providerId,
        providerResponseId: item.providerResponseId || null,
        rawMessage: item.rawMessage || null,
        recoverable: typeof item.recoverable === 'boolean' ? item.recoverable : null,
        retryCount: Number(item.retryCount || 0),
        sessionId: item.sessionId || null,
        status: 'pending',
        timedOut: Boolean(item.timedOut),
        usageInputTokens: normalizeTelemetryNumber(item.usageInputTokens),
        usageOutputTokens: normalizeTelemetryNumber(item.usageOutputTokens),
        usageTotalTokens: normalizeTelemetryNumber(item.usageTotalTokens),
        workspaceId: item.workspaceId || null,
        workspaceName: item.workspaceName || null,
      }));
  }

  return {
    formatProviderAttentionRecoveryDetail,
    buildProviderAttentionTimeline,
    buildProviderAttentionReminderTimeline,
    buildProviderAttentionRecoveredTimeline,
    buildProviderAttentionOpenedTimeline,
  };
}
