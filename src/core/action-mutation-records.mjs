import {
  buildProviderAttentionReminderNote,
  buildSpecialistFollowUpReminderNote,
} from './reminder-formatters.mjs';
import {
  normalizeProviderAttemptHistory,
  normalizeTelemetryNumber,
} from './provider-telemetry.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function buildSpecialistFollowUpReminderRecord({ id, item, note, remindedAt }) {
  return {
    actionId: item.actionId,
    createdAt: remindedAt,
    dueAt: item.dueAt,
    fallbackRecommendedCommand: item.fallbackRecommendedCommand || null,
    id,
    missionId: item.missionId,
    note: buildSpecialistFollowUpReminderNote(item, note),
    overdue: item.isOverdue,
    parallelGroupId: item.parallelGroupId,
    priority: item.priority,
    providerId: item.providerId || null,
    recommendedCommand: item.recommendedCommand || null,
    remediationRoute: item.remediationRoute || null,
    remindedAt,
    reminderCadenceHours: item.reminderCadenceHours,
    retryPolicy: item.retryPolicy || null,
    runId: item.runId || item.specialistRootRunId || null,
    sessionId: item.sessionId || null,
    slaHours: item.slaHours,
    specialistKind: item.specialistKind,
    status: item.status,
    title: item.title,
    workspaceId: item.workspaceId || null,
    workspaceName: item.workspaceName || null,
  };
}

export function buildProviderAttentionReminderRecord({ id, item, note, remindedAt }) {
  return {
    actionId: item.actionId,
    createdAt: remindedAt,
    dueAt: item.dueAt,
    eventFamily: item.eventFamily,
    eventKind: item.eventKind,
    eventRefId: item.eventRefId,
    id,
    missionId: item.missionId,
    note: buildProviderAttentionReminderNote(item, note),
    overdue: item.isOverdue,
    priority: item.priority,
    providerDisplayName: item.providerDisplayName,
    providerId: item.providerId,
    remindedAt,
    reminderCadenceHours: item.reminderCadenceHours,
    sessionId: item.sessionId || null,
    slaHours: item.slaHours,
    title: item.title,
    workspaceId: item.workspaceId || null,
    workspaceName: item.workspaceName || null,
  };
}

export function buildProviderAttentionAcknowledgementRecord({ acknowledgedAt, id, note, pendingItem }) {
  return {
    acknowledgedAt,
    actionId: pendingItem.actionId,
    attemptCount: Number(pendingItem.attemptCount || 0),
    attemptHistory: normalizeProviderAttemptHistory(pendingItem.attemptHistory),
    createdAt: acknowledgedAt,
    durationMs: normalizeTelemetryNumber(pendingItem.durationMs),
    eventFamily: pendingItem.eventFamily,
    eventKind: pendingItem.eventKind,
    eventRefId: pendingItem.eventRefId,
    failureKind: pendingItem.failureKind || null,
    httpStatus: Number.isFinite(Number(pendingItem.httpStatus)) ? Number(pendingItem.httpStatus) : null,
    id,
    missionId: pendingItem.missionId,
    note: normalizeText(note, 'Provider attention acknowledged.'),
    openedAt: pendingItem.createdAt,
    priority: pendingItem.priority,
    providerDisplayName: pendingItem.providerDisplayName,
    providerId: pendingItem.providerId,
    providerResponseId: pendingItem.providerResponseId || null,
    rawMessage: pendingItem.rawMessage || null,
    reason: pendingItem.reason,
    recommendedOwner: pendingItem.recommendedOwner,
    recoverable: typeof pendingItem.recoverable === 'boolean' ? pendingItem.recoverable : null,
    retryCount: Number(pendingItem.retryCount || 0),
    sessionId: pendingItem.sessionId,
    status: 'acknowledged',
    timedOut: Boolean(pendingItem.timedOut),
    usageInputTokens: normalizeTelemetryNumber(pendingItem.usageInputTokens),
    usageOutputTokens: normalizeTelemetryNumber(pendingItem.usageOutputTokens),
    usageTotalTokens: normalizeTelemetryNumber(pendingItem.usageTotalTokens),
    title: pendingItem.title,
    workspaceId: pendingItem.workspaceId,
    workspaceName: pendingItem.workspaceName,
  };
}

export function buildResolvedProviderAttentionRecord({ current, note, resolvedAt }) {
  return {
    ...current,
    resolutionNote: normalizeText(note, 'Provider attention resolved.'),
    resolvedAt,
    status: 'resolved',
  };
}
