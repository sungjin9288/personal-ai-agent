import fs from 'node:fs';
import path from 'node:path';

import {
  AGENT_ROLES,
  AGENT_RUN_STATUSES,
  ACTION_CLASSES,
  ACTION_OWNERS,
  ACTION_PRIORITIES,
  APPROVAL_DECISIONS,
  ESCALATION_REMINDER_CADENCE_HOURS,
  ESCALATION_STATUSES,
  ESCALATION_TIERS,
  GLOBAL_USER_SCOPE_ID,
  KNOWLEDGE_DELIVERABLE_TYPES,
  MAINTENANCE_RUN_OUTCOMES,
  MEMORY_KINDS,
  MEMORY_SCOPES,
  MISSION_MODES,
  MISSION_STATUSES,
  OWNER_HANDOFF_ACK_SLA_HOURS,
  OWNER_HANDOFF_REMINDER_CADENCE_HOURS,
  PROVIDER_ATTENTION_REMINDER_CADENCE_HOURS,
  PROVIDER_ATTENTION_STATUSES,
  PROVIDER_FAILURE_KINDS,
  REVIEWER_FOLLOW_UP_RESOLUTION_KINDS,
  REVIEWER_FOLLOW_UP_STATUSES,
  SPECIALIST_FOLLOW_UP_REMINDER_CADENCE_HOURS,
  SPECIALIST_KINDS,
} from './constants.mjs';
import { createDocService } from './doc-service.mjs';
import { createId } from './id.mjs';
import { createRuntimeHarness } from '../harness/runtime-harness.mjs';
import { getMissionPack } from '../packs/index.mjs';
import { createProviderRegistry } from '../providers/index.mjs';
import {
  deriveRetryCount,
  extractProviderFailure,
  isProviderFailureError,
  roundUsdAmount,
} from '../providers/provider-runtime-utils.mjs';
import { resolveOrchestrationProfile } from './orchestration-profiles.mjs';

function now() {
  return new Date().toISOString();
}

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

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function formatDateUtc(value) {
  if (!Number.isFinite(value)) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}

function normalizeStringList(items) {
  return ensureArray(items).map((item) => normalizeText(item)).filter(Boolean);
}

function normalizeActionOwner(value, fallback = 'workspace-owner') {
  const normalized = normalizeText(value, fallback);
  return ACTION_OWNERS.includes(normalized) ? normalized : fallback;
}

function normalizeSpecialistHandoff(handoff, fallback = {}) {
  const source = ensureObject(handoff);
  const nextSource = ensureObject(source.nextHandoff);
  const currentState = normalizeText(source.currentState, fallback.currentState || fallback.summaryText || '');
  const deliverables = normalizeStringList(source.deliverables);
  const acceptanceCriteria = normalizeStringList(source.acceptanceCriteria);
  const evidence = normalizeStringList(source.evidence);
  const blockers = normalizeStringList(source.blockers);
  const nextHandoff = {
    recommendedOwner: normalizeActionOwner(nextSource.recommendedOwner, fallback.recommendedOwner || 'workspace-owner'),
    request: normalizeText(nextSource.request, fallback.nextAction || ''),
    targetRole: normalizeText(nextSource.targetRole, fallback.targetRole || 'manager-merge'),
  };

  if (!currentState && !deliverables.length && !acceptanceCriteria.length && !evidence.length && !nextHandoff.request) {
    return null;
  }

  return {
    acceptanceCriteria,
    blockers,
    currentState,
    deliverables,
    evidence,
    nextHandoff,
  };
}

function buildFallbackSpecialistHandoff({
  specialistKind,
  status,
  summaryText,
  nextAction = '',
  recommendedOwner = 'workspace-owner',
}) {
  return normalizeSpecialistHandoff(
    {
      acceptanceCriteria: [`Close the ${specialistKind} branch in status ${status}.`],
      blockers: ['blocked', 'failed'].includes(status) ? [summaryText || `${specialistKind} branch requires follow-up.`] : [],
      currentState: summaryText || `${specialistKind} branch is ${status}.`,
      deliverables: [summaryText || `${specialistKind} specialist branch recorded a draft.`],
      evidence: [summaryText || `${specialistKind} specialist branch state captured.`],
      nextHandoff: {
        recommendedOwner,
        request: nextAction || `Review the ${specialistKind} branch and decide whether to resume or merge it.`,
        targetRole: 'manager-merge',
      },
    },
    {},
  );
}

function getUtcMonthStartTimestamp(value = now()) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    return '';
  }

  const date = new Date(parsed);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function getUtcWeekRange(isoTimestamp) {
  const parsed = Date.parse(String(isoTimestamp || ''));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  const day = date.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + diffToMonday);
  const end = start + 6 * 24 * 60 * 60 * 1000;

  return {
    key: formatDateUtc(start),
    weekEndDate: formatDateUtc(end),
    weekStartDate: formatDateUtc(start),
  };
}

function getUtcMonthRange(isoTimestamp) {
  const parsed = Date.parse(String(isoTimestamp || ''));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  const monthStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
  const monthEnd = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
  const monthKey = formatDateUtc(monthStart).slice(0, 7);

  return {
    key: monthKey,
    monthEndDate: formatDateUtc(monthEnd),
    monthKey,
    monthStartDate: formatDateUtc(monthStart),
  };
}

function dedupeEntries(entries) {
  const seenIds = new Set();
  return entries.filter((entry) => {
    if (seenIds.has(entry.id)) {
      return false;
    }
    seenIds.add(entry.id);
    return true;
  });
}

function getDefaultDeliverableType(mode, requestedType) {
  if (mode === 'engineering') {
    const normalized = normalizeText(requestedType, 'implementation-proposal');
    if (normalized !== 'implementation-proposal') {
      throw new Error(`Unsupported engineering deliverable type: ${normalized}`);
    }
    return normalized;
  }

  const normalized = normalizeText(requestedType, 'decision-memo');
  if (!KNOWLEDGE_DELIVERABLE_TYPES.includes(normalized)) {
    throw new Error(`Unsupported knowledge deliverable type: ${normalized}`);
  }

  return normalized;
}

function getLatestSession(sessions) {
  if (!sessions.length) {
    return null;
  }

  return [...sessions].sort((left, right) => String(left.startedAt || '').localeCompare(String(right.startedAt || ''))).at(-1);
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items].sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || ''))).at(-1);
}

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  if (normalized === 'executing') {
    return 'running';
  }
  return normalized;
}

function normalizeProviderFailureKind(value) {
  const normalized = normalizeText(value);
  return PROVIDER_FAILURE_KINDS.includes(normalized) ? normalized : 'unknown';
}

function summarizeFailureKinds(items) {
  const counts = Object.fromEntries(PROVIDER_FAILURE_KINDS.map((kind) => [kind, 0]));

  for (const item of items) {
    const failureKind = normalizeProviderFailureKind(item.failureKind);
    if (item.failureKind) {
      counts[failureKind] += 1;
    }
  }

  return counts;
}

function normalizeTelemetryNumber(value, fallback = null) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeProviderAttemptHistory(items = []) {
  return Array.isArray(items)
    ? items
        .map((item) => {
          const attempt = Number(item?.attempt || item?.attemptCount || 0);
          if (!Number.isFinite(attempt) || attempt <= 0) {
            return null;
          }

          return {
            attempt,
            durationMs: normalizeTelemetryNumber(item?.durationMs),
            failureKind: normalizeText(item?.failureKind) ? normalizeProviderFailureKind(item.failureKind) : null,
            httpStatus: Number.isFinite(Number(item?.httpStatus)) ? Number(item.httpStatus) : null,
            ok: Boolean(item?.ok),
            rawMessage: normalizeText(item?.rawMessage) || null,
            recoverable: typeof item?.recoverable === 'boolean' ? item.recoverable : null,
            timedOut: Boolean(item?.timedOut),
          };
        })
        .filter(Boolean)
    : [];
}

function extractProviderAttemptMetadata(item) {
  const attemptHistory = normalizeProviderAttemptHistory(item?.attemptHistory);
  const fallbackAttemptCount = attemptHistory.at(-1)?.attempt || 0;
  const attemptCount = Number.isFinite(Number(item?.attemptCount))
    ? Number(item.attemptCount)
    : fallbackAttemptCount;
  const retryCount = Number.isFinite(Number(item?.retryCount))
    ? Number(item.retryCount)
    : deriveRetryCount(attemptCount);

  return {
    attemptCount,
    attemptHistory,
    attemptHistoryCount: attemptHistory.length,
    retryCount,
  };
}

function summarizeAttemptMetrics(items, isSuccessful = () => false) {
  return items.reduce(
    (summary, item) => {
      const attemptCount = Number(item?.attemptCount || 0);
      const retryCount = Number.isFinite(Number(item?.retryCount))
        ? Number(item.retryCount)
        : deriveRetryCount(attemptCount);

      return {
        attemptHistoryEntryCountTotal:
          summary.attemptHistoryEntryCountTotal + normalizeProviderAttemptHistory(item?.attemptHistory).length,
        maxAttemptCount: Math.max(summary.maxAttemptCount, attemptCount),
        multiAttemptCount: summary.multiAttemptCount + (attemptCount > 1 ? 1 : 0),
        retrySucceededCount: summary.retrySucceededCount + (attemptCount > 1 && isSuccessful(item) ? 1 : 0),
        totalAttemptCount: summary.totalAttemptCount + attemptCount,
        totalRetryCount: summary.totalRetryCount + retryCount,
      };
    },
    {
      attemptHistoryEntryCountTotal: 0,
      maxAttemptCount: 0,
      multiAttemptCount: 0,
      retrySucceededCount: 0,
      totalAttemptCount: 0,
      totalRetryCount: 0,
    },
  );
}

function extractProviderUsageMetadata(item) {
  return {
    estimatedCostUsd: roundUsdAmount(item?.estimatedCostUsd),
    usageInputTokens: normalizeTelemetryNumber(item?.usageInputTokens),
    usageOutputTokens: normalizeTelemetryNumber(item?.usageOutputTokens),
    usageTotalTokens: normalizeTelemetryNumber(item?.usageTotalTokens),
  };
}

function summarizeDurationMetrics(items, fieldName = 'durationMs') {
  const durations = items
    .map((item) => normalizeTelemetryNumber(item?.[fieldName]))
    .filter((value) => Number.isFinite(value) && value >= 0);

  const totalDurationMs = durations.reduce((sum, value) => sum + value, 0);
  return {
    averageDurationMs: durations.length ? Math.round(totalDurationMs / durations.length) : null,
    maxDurationMs: durations.length ? Math.max(...durations) : null,
    totalDurationMs,
  };
}

function summarizeUsageMetrics(items) {
  return items.reduce(
    (totals, item) => ({
      usageInputTokensTotal: totals.usageInputTokensTotal + Number(normalizeTelemetryNumber(item?.usageInputTokens, 0) || 0),
      usageOutputTokensTotal:
        totals.usageOutputTokensTotal + Number(normalizeTelemetryNumber(item?.usageOutputTokens, 0) || 0),
      usageTotalTokensTotal: totals.usageTotalTokensTotal + Number(normalizeTelemetryNumber(item?.usageTotalTokens, 0) || 0),
    }),
    {
      usageInputTokensTotal: 0,
      usageOutputTokensTotal: 0,
      usageTotalTokensTotal: 0,
    },
  );
}

function summarizeEstimatedCostMetrics(items, fieldName = 'estimatedCostUsd') {
  const pricedValues = items
    .map((item) => roundUsdAmount(item?.[fieldName]))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const totalEstimatedCostUsd = roundUsdAmount(pricedValues.reduce((sum, value) => sum + value, 0));

  return {
    estimatedCostUsdAverage: pricedValues.length ? roundUsdAmount(totalEstimatedCostUsd / pricedValues.length) : null,
    estimatedCostUsdMax: pricedValues.length ? roundUsdAmount(Math.max(...pricedValues)) : null,
    estimatedCostUsdPricedCount: pricedValues.length,
    estimatedCostUsdTotal: pricedValues.length ? totalEstimatedCostUsd : null,
  };
}

function summarizeEstimatedCostBreakdown(items, keyFieldName, costFieldName = 'estimatedCostUsd') {
  return items.reduce((totals, item) => {
    const key = normalizeText(item?.[keyFieldName]);
    const estimatedCostUsd = roundUsdAmount(item?.[costFieldName]);

    if (!key || !Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
      return totals;
    }

    return {
      ...totals,
      [key]: roundUsdAmount(Number(totals[key] || 0) + estimatedCostUsd),
    };
  }, {});
}

function extractProviderFailureMetadata(item) {
  const attemptMetadata = extractProviderAttemptMetadata(item);
  return {
    ...attemptMetadata,
    durationMs: normalizeTelemetryNumber(item?.durationMs),
    failureKind: normalizeText(item?.failureKind) ? normalizeProviderFailureKind(item.failureKind) : null,
    httpStatus: Number.isFinite(Number(item?.httpStatus)) ? Number(item.httpStatus) : null,
    providerResponseId: normalizeText(item?.providerResponseId) || null,
    rawMessage: normalizeText(item?.rawMessage) || null,
    recoverable: typeof item?.recoverable === 'boolean' ? item.recoverable : null,
    timedOut: Boolean(item?.timedOut),
    ...extractProviderUsageMetadata(item),
  };
}

function formatProviderFailureDetail({ detail, failureKind, httpStatus, timedOut, attemptCount, recoverable }) {
  const summary = normalizeText(detail);
  const meta = [];

  if (failureKind) {
    meta.push(`kind=${failureKind}`);
  }
  if (Number.isFinite(Number(httpStatus)) && Number(httpStatus) > 0) {
    meta.push(`http=${Number(httpStatus)}`);
  }
  if (timedOut) {
    meta.push('timedOut=true');
  }
  if (Number.isFinite(Number(attemptCount)) && Number(attemptCount) > 1) {
    meta.push(`attempts=${Number(attemptCount)}`);
  }
  if (typeof recoverable === 'boolean') {
    meta.push(`recoverable=${recoverable ? 'true' : 'false'}`);
  }

  if (!meta.length) {
    return summary;
  }

  return `${summary} [${meta.join(', ')}]`;
}

function parseMissionConstraintDirectives(mission) {
  const directives = {
    orchestrationProfileId: '',
    parallelSpecialists: [],
    specialistAbandonKinds: [],
    specialistBlockKinds: [],
    specialistFailKinds: [],
  };

  for (const constraint of ensureArray(mission?.constraints)) {
    const normalized = normalizeText(constraint);
    if (!normalized) {
      continue;
    }

    const [rawKey, rawValue = ''] = normalized.split(':');
    const key = normalizeText(rawKey).toLowerCase();
    const values = rawValue
      .split(',')
      .map((item) => normalizeText(item).toLowerCase())
      .filter((item) => SPECIALIST_KINDS.includes(item));

    if (key === 'orchestration-profile') {
      directives.orchestrationProfileId = normalizeText(rawValue).toLowerCase();
    } else if (key === 'parallel-specialists') {
      directives.parallelSpecialists = values;
    } else if (key === 'parallel-fail') {
      directives.specialistFailKinds = values;
    } else if (key === 'parallel-block') {
      directives.specialistBlockKinds = values;
    } else if (key === 'parallel-abandon') {
      directives.specialistAbandonKinds = values;
    }
  }

  return directives;
}

function extractOrchestrationProfileMetadata(item) {
  const profileId = normalizeText(item?.orchestrationProfileId).toLowerCase();
  if (!profileId) {
    return null;
  }

  return {
    deliverableTypes: normalizeStringList(item?.orchestrationProfileDeliverableTypes),
    description: normalizeText(item?.orchestrationProfileDescription) || null,
    displayName: normalizeText(item?.orchestrationProfileDisplayName, profileId),
    id: profileId,
    mergeOwner: normalizeText(item?.orchestrationProfileMergeOwner) || null,
    mode: normalizeText(item?.orchestrationProfileMode) || null,
    parallelSpecialistKinds: normalizeStringList(item?.orchestrationProfileParallelSpecialistKinds).filter((kind) =>
      SPECIALIST_KINDS.includes(kind),
    ),
    qualityGate: normalizeText(item?.orchestrationProfileQualityGate) || null,
    retryPolicy: normalizeText(item?.orchestrationProfileRetryPolicy) || null,
    source: normalizeText(item?.orchestrationProfileSource) || null,
  };
}

function createOrchestrationProfileMetadata(profile, { effectiveKinds = [], source = '' } = {}) {
  if (!profile) {
    return null;
  }

  return {
    ...profile,
    source: normalizeText(source) || null,
  };
}

function getLatestOrchestrationProfileMetadata(items, getTimestamp) {
  let latest = null;

  for (const item of ensureArray(items)) {
    const metadata = extractOrchestrationProfileMetadata(item);
    if (!metadata) {
      continue;
    }

    const at = normalizeText(getTimestamp(item));
    if (!latest || String(latest.at) <= at) {
      latest = {
        at,
        metadata,
      };
    }
  }

  return latest?.metadata || null;
}

function resolveMissionParallelPlan(mission) {
  const directives = parseMissionConstraintDirectives(mission);
  const explicitKinds = [...new Set(directives.parallelSpecialists)].slice(0, 3);
  const profile = directives.orchestrationProfileId
    ? resolveOrchestrationProfile({
        deliverableType: mission?.deliverableType,
        mode: mission?.mode,
        profileId: directives.orchestrationProfileId,
      })
    : null;
  const effectiveKinds = [...new Set(explicitKinds.length ? explicitKinds : profile?.parallelSpecialistKinds || [])].slice(0, 3);
  const source = explicitKinds.length
    ? profile
      ? 'profile-with-explicit-specialists'
      : 'explicit-specialists'
    : profile
      ? 'orchestration-profile'
      : 'none';

  return {
    directives,
    effectiveKinds,
    orchestrationProfile: createOrchestrationProfileMetadata(profile, {
      effectiveKinds,
      source,
    }),
    source,
  };
}

function getOrchestrationQualityGateRequiredKinds(profile, requiredKinds = []) {
  const qualityGate = normalizeText(profile?.qualityGate);
  const availableKinds = normalizeStringList(
    requiredKinds.length ? requiredKinds : profile?.parallelSpecialistKinds || [],
  ).filter((kind) => SPECIALIST_KINDS.includes(kind));

  if (qualityGate === 'verification-signal-required') {
    return availableKinds.filter((kind) => kind === 'verification');
  }

  if (qualityGate === 'research-and-verification-signal-required') {
    return availableKinds.filter((kind) => ['research', 'verification'].includes(kind));
  }

  return [];
}

function evaluateParallelQualityGate({ latestByKind, orchestrationProfile, requiredKinds = [] }) {
  const profile = orchestrationProfile || null;
  const qualityGate = normalizeText(profile?.qualityGate);

  if (!profile || !qualityGate) {
    return {
      latestViolation: null,
      qualityGate: null,
      requiredKinds: [],
      rerunKinds: [],
      status: 'none',
      violationCount: 0,
      violations: [],
    };
  }

  const gateKinds = getOrchestrationQualityGateRequiredKinds(profile, requiredKinds);
  if (qualityGate === 'manager-merge-ready' || !gateKinds.length) {
    return {
      latestViolation: null,
      qualityGate,
      requiredKinds: gateKinds,
      rerunKinds: [],
      status: 'passed',
      violationCount: 0,
      violations: [],
    };
  }

  const violations = gateKinds
    .map((specialistKind) => {
      const run = latestByKind.get(specialistKind) || null;
      const actualStatus = run ? normalizeAgentRunStatus(run.status) : 'missing';
      if (actualStatus === 'completed') {
        return null;
      }

      const profileLabel = normalizeText(profile.displayName, profile.id || 'selected profile');
      return {
        actualStatus,
        at: normalizeText(run?.endedAt || run?.startedAt || ''),
        detail: `${profileLabel} requires a completed ${specialistKind} specialist signal before merge. Latest status=${actualStatus}.`,
        parallelGroupId: normalizeText(run?.parallelGroupId) || null,
        requiredStatus: 'completed',
        runId: normalizeText(run?.id) || null,
        sessionId: normalizeText(run?.sessionId) || null,
        sourceRun: run,
        specialistKind,
        status: actualStatus === 'failed' ? 'failed' : 'blocked',
      };
    })
    .filter(Boolean)
    .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));

  return {
    latestViolation: violations.at(-1) || null,
    qualityGate,
    requiredKinds: gateKinds,
    rerunKinds: [...new Set(violations.map((item) => item.specialistKind))],
    status: violations.length ? 'blocked' : 'passed',
    violationCount: violations.length,
    violations,
  };
}

function sortTimelineEvents(items) {
  return [...items].sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
}

function parseMarkdownBulletSection(content, sectionName) {
  const normalizedContent = String(content || '');
  const header = `## ${sectionName}`;
  const startIndex = normalizedContent.indexOf(header);

  if (startIndex === -1) {
    return [];
  }

  const nextHeaderIndex = normalizedContent.indexOf('\n## ', startIndex + header.length);
  const sectionBody = normalizedContent
    .slice(startIndex + header.length, nextHeaderIndex === -1 ? undefined : nextHeaderIndex)
    .trim();

  return sectionBody
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean);
}

function addDispatchMetadata(item, { priority, recommendedOwner, recommendedCommand }) {
  return {
    ...item,
    commandHint: recommendedCommand,
    priority,
    recommendedCommand,
    recommendedOwner,
  };
}

function addOperationalMetadata(item, { slaHours, escalationRule }) {
  const createdAt = String(item.createdAt || '');
  const dueAt = createdAt ? new Date(new Date(createdAt).getTime() + slaHours * 60 * 60 * 1000).toISOString() : null;
  const isOverdue = dueAt ? Date.now() > new Date(dueAt).getTime() : false;

  return {
    ...item,
    dueAt,
    escalationRule,
    isOverdue,
    slaHours,
  };
}

function addFixedOperationalMetadata(item, { dueAt, escalationRule, slaHours }) {
  const isOverdue = dueAt ? Date.now() > new Date(dueAt).getTime() : false;

  return {
    ...item,
    dueAt,
    escalationRule,
    isOverdue,
    slaHours,
  };
}

function deriveSlaHoursFromTimestamps(createdAt, dueAt) {
  if (!createdAt || !dueAt) {
    return null;
  }

  const durationMs = new Date(dueAt).getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return null;
  }

  return Math.round(durationMs / (60 * 60 * 1000));
}

function buildInitialTierHistoryEntry(tier, at, reason) {
  return {
    at,
    from: null,
    reason,
    to: tier,
  };
}

function buildInitialOwnerHistoryEntry(owner, at, reason) {
  return {
    at,
    from: null,
    reason,
    to: owner,
  };
}

function buildEscalationReminderNote(escalation, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  const tier = escalation.currentTier || deriveEscalationTier(escalation);
  return `Reminder issued while escalation is ${tier}.`;
}

function formatEscalationReminderDetail(reminder) {
  const tierPrefix = reminder.tier ? `[${reminder.tier}] ` : '';
  return `${tierPrefix}${reminder.note || 'Escalation reminder issued.'}`;
}

function formatEscalationOwnerChangeDetail(ownerChange) {
  const reasonSuffix = ownerChange.reason ? ` (${ownerChange.reason})` : '';
  return `${ownerChange.from} -> ${ownerChange.to}${reasonSuffix}`;
}

function formatEscalationOwnerHandoffDetail(handoff) {
  const overdueSuffix = handoff.wasOverdue ? ' [overdue]' : '';
  return `${handoff.owner} acknowledged owner handoff${overdueSuffix}: ${handoff.note || 'No explicit note recorded.'}`;
}

function buildOwnerHandoffReminderNote(escalation, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  return `Reminder issued for pending owner handoff to ${escalation.ownerHandoffTargetOwner || escalation.effectiveRecommendedOwner || 'assigned owner'}.`;
}

function formatEscalationOwnerHandoffReminderDetail(reminder) {
  const overdueSuffix = reminder.overdue ? ' [overdue]' : '';
  return `${reminder.owner}${overdueSuffix} owner handoff reminder: ${reminder.note || 'No explicit note recorded.'}`;
}

function formatMaintenanceRunDetail(run) {
  const noOpSuffix = Number(run.totalRemindedCount || 0) === 0 ? ' [no-op]' : '';
  const noteSuffix = run.note ? ` note=${run.note}` : '';
  return `Maintenance sweep${noOpSuffix}: synced=${run.syncedCount || 0}, reminded=${run.totalRemindedCount || 0}, monitoring=${run.escalationRemindedCount || 0}, handoff=${run.ownerHandoffRemindedCount || 0}, provider-attention=${run.providerAttentionRemindedCount || 0}, specialist-follow-up=${run.specialistFollowUpRemindedCount || 0}, acknowledged=${run.acknowledgedMaintenanceRequiredCount || 0}, resolved=${run.resolvedMaintenanceRequiredCount || 0}, remaining=${run.remainingMaintenanceRequiredCount || 0}.${noteSuffix}`;
}

function getMeaningfulOwnerTransitions(ownerHistory) {
  return ensureArray(ownerHistory).filter((entry) => entry.from && entry.to && entry.from !== entry.to);
}

function getLatestOwnerTransition(ownerHistory) {
  return getMeaningfulOwnerTransitions(ownerHistory).at(-1) || null;
}

function getLatestOwnerHandoff(ownerHandoffHistory) {
  return ensureArray(ownerHandoffHistory).at(-1) || null;
}

function hasPendingOwnerHandoff({ ownerHistory, ownerHandoffHistory }) {
  const latestOwnerTransition = getLatestOwnerTransition(ownerHistory);
  if (!latestOwnerTransition) {
    return false;
  }

  return !ensureArray(ownerHandoffHistory).some(
    (entry) => entry.transitionAt === latestOwnerTransition.at && entry.owner === latestOwnerTransition.to,
  );
}

function deriveEscalationReminderCadenceHours(tier) {
  return ESCALATION_REMINDER_CADENCE_HOURS[tier] || null;
}

function deriveOwnerHandoffSlaHours(owner) {
  return OWNER_HANDOFF_ACK_SLA_HOURS[owner] || null;
}

function deriveOwnerHandoffReminderCadenceHours(owner) {
  return OWNER_HANDOFF_REMINDER_CADENCE_HOURS[owner] || null;
}

function deriveProviderAttentionReminderCadenceHours(eventFamily) {
  return PROVIDER_ATTENTION_REMINDER_CADENCE_HOURS[eventFamily] || null;
}

function deriveSpecialistFollowUpReminderCadenceHours(status) {
  return SPECIALIST_FOLLOW_UP_REMINDER_CADENCE_HOURS[status] || null;
}

function resolveSpecialistFollowUpPolicy({ followUpSource = 'run-status', orchestrationProfile, specialistKind, status }) {
  const retryPolicy = normalizeText(orchestrationProfile?.retryPolicy) || 'resume-blocked-or-failed-branch';
  const normalizedSpecialistKind = normalizeText(specialistKind);
  const normalizedStatus = normalizeAgentRunStatus(status);
  const defaultPolicy = {
    priority: normalizedStatus === 'failed' ? 'high' : 'medium',
    reminderCadenceHours: deriveSpecialistFollowUpReminderCadenceHours(normalizedStatus),
    retryPolicy,
    slaHours: 24,
  };

  if (retryPolicy === 'resume-verification-fast' && normalizedSpecialistKind === 'verification') {
    return {
      priority: followUpSource === 'quality-gate' ? 'high' : defaultPolicy.priority,
      reminderCadenceHours: 12,
      retryPolicy,
      slaHours: 12,
    };
  }

  if (
    retryPolicy === 'resume-research-and-verification-fast' &&
    ['research', 'verification'].includes(normalizedSpecialistKind)
  ) {
    return {
      priority: followUpSource === 'quality-gate' || normalizedStatus === 'blocked' ? 'high' : defaultPolicy.priority,
      reminderCadenceHours: 12,
      retryPolicy,
      slaHours: 12,
    };
  }

  return defaultPolicy;
}

function deriveEffectiveActionOwner({ recommendedOwner, reminderCount, needsReminder, status }) {
  const ownerChain = ['mission-owner', 'workspace-owner', 'human-approver'];
  const baseOwner = ACTION_OWNERS.includes(recommendedOwner) ? recommendedOwner : 'workspace-owner';
  const baseIndex = ownerChain.indexOf(baseOwner);
  const safeIndex = baseIndex === -1 ? ownerChain.indexOf('workspace-owner') : baseIndex;

  if (status !== 'open' || !needsReminder) {
    return {
      effectiveRecommendedOwner: baseOwner,
      ownerEscalationLevel: baseOwner === 'human-approver' ? 'final' : 'base',
      ownerEscalationStep: 0,
    };
  }

  const step = Math.min(Number(reminderCount || 0), ownerChain.length - 1 - safeIndex);
  const effectiveRecommendedOwner = ownerChain[safeIndex + step];
  const ownerEscalationLevel = step === 0 ? 'base' : effectiveRecommendedOwner === 'human-approver' ? 'final' : 'escalated';

  return {
    effectiveRecommendedOwner,
    ownerEscalationLevel,
    ownerEscalationStep: step,
  };
}

function formatAgentInputSummary({ role, mission, providerId }) {
  return `${role} preparing ${mission.deliverableType} for mission ${mission.id} with provider ${providerId}.`;
}

function formatApprovalResolution(decision, reason) {
  return `# Approval Resolution

## Decision
- decision: ${decision}
- reason: ${reason || 'No explicit reason recorded.'}
`;
}

function formatReviewerFailureMemory({ mission, findings }) {
  return `Reviewer failed ${mission.deliverableType} for mission ${mission.id}: ${findings.join(' | ')}`;
}

function formatApprovalDecisionMemory({ mission, decision, reason }) {
  return `Approval ${decision} for mission ${mission.id} (${mission.deliverableType}): ${reason || 'No explicit reason recorded.'}`;
}

function buildProviderAttentionReminderNote(item, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  return item.eventFamily === 'execution'
    ? `Reminder issued for failed ${item.providerDisplayName} execution attention.`
    : `Reminder issued for failed ${item.providerDisplayName} probe attention.`;
}

function formatProviderAttentionReminderDetail(reminder) {
  const overdueSuffix = reminder.overdue ? ' [overdue]' : '';
  return `${reminder.providerDisplayName || reminder.providerId}${overdueSuffix} provider attention reminder: ${reminder.note || 'No explicit note recorded.'}`;
}

function buildSpecialistFollowUpReminderNote(item, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  return `Reminder issued for ${item.status} ${item.specialistKind} specialist follow-up.`;
}

function formatSpecialistFollowUpReminderDetail(reminder) {
  const overdueSuffix = reminder.overdue ? ' [overdue]' : '';
  return `${reminder.specialistKind}${overdueSuffix} specialist follow-up reminder: ${reminder.note || 'No explicit note recorded.'}`;
}

function formatReviewerFollowUpResolutionMemory({ mission, note, resolutionKind }) {
  return `Reviewer follow-up resolved for mission ${mission.id} (${mission.deliverableType}) [${resolutionKind || 'accepted-risk'}]: ${note || 'Resolved without additional note.'}`;
}

function formatReviewerFollowUpResolutionDetail({ resolutionKind, resolutionNote }) {
  const prefix = resolutionKind ? `${resolutionKind}: ` : '';
  return `${prefix}${resolutionNote || 'Reviewer follow-up resolved.'}`;
}

function formatAcceptedRiskEscalationTitle(missionTitle) {
  return `Accepted risk monitoring for ${missionTitle}`;
}

function formatApprovedExecutionReadyBrief({ mission, workspace, approval, deliverableArtifact }) {
  return `# Execution Ready Brief

## Mission
- mission id: ${mission.id}
- title: ${mission.title}
- workspace: ${workspace.name}
- path: ${workspace.path}

## Approval
- approval id: ${approval.id}
- decision: ${approval.decision}
- reason: ${approval.decisionReason || 'No explicit reason recorded.'}

## Approved Deliverable
- artifact: ${deliverableArtifact ? deliverableArtifact.fileName : 'unknown'}
- path: ${deliverableArtifact ? deliverableArtifact.path : 'unknown'}

## Handoff
- the bounded proposal has been reviewed and explicitly approved
- the next execution owner should validate repo-local commands inside ${workspace.path}
- keep verification scoped to the proposal and capture exact evidence before any broader mutation

## Next Action
- open the approved proposal and execute only the bounded path that was reviewed
`;
}

function buildOverdueIncidentTitle(count) {
  return `Overdue Action Escalation (${count} items)`;
}

function formatIncidentCountMap(counts = {}) {
  return Object.entries(counts)
    .filter(([, count]) => Number(count || 0) > 0)
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
    .map(([key, count]) => `${key}=${count}`)
    .join(', ');
}

function buildOverdueIncidentContent({ items, filters, summary }) {
  const filterSummary = [
    filters.actionClass ? `class=${filters.actionClass}` : null,
    filters.providerId ? `provider=${filters.providerId}` : null,
    filters.priority ? `priority=${filters.priority}` : null,
    filters.owner ? `owner=${filters.owner}` : null,
    filters.workspaceId ? `workspace=${filters.workspaceId}` : null,
    filters.missionId ? `mission=${filters.missionId}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const lines = [
    `overdue action count: ${items.length}`,
    `filters: ${filterSummary || 'none'}`,
  ];

  if (summary?.specialistFollowUpStatusCounts?.total > 0) {
    lines.push(`specialist follow-up overdue count: ${summary.specialistFollowUpOverdueCount || 0}`);
    lines.push(`specialist follow-up needs-reminder count: ${summary.specialistFollowUpNeedsReminderCount || 0}`);
    lines.push(`specialist follow-up reminder total: ${summary.specialistFollowUpReminderCountTotal || 0}`);

    const providerSummary = formatIncidentCountMap(summary.specialistFollowUpProviderCounts || {});
    if (providerSummary) {
      lines.push(`specialist follow-up providers: ${providerSummary}`);
    }

    const kindSummary = formatIncidentCountMap(summary.specialistFollowUpKindCounts || {});
    if (kindSummary) {
      lines.push(`specialist follow-up kinds: ${kindSummary}`);
    }

    if (summary.specialistFollowUpLatestReminderAt) {
      lines.push(`specialist follow-up latest reminder at: ${summary.specialistFollowUpLatestReminderAt}`);
    }

    if (summary.specialistFollowUpNextReminderAt) {
      lines.push(`specialist follow-up next reminder at: ${summary.specialistFollowUpNextReminderAt}`);
    }
  }

  if ((summary?.providerHealthDriftOverdueCount || 0) > 0) {
    lines.push(`provider health drift overdue count: ${summary.providerHealthDriftOverdueCount || 0}`);

    const providerSummary = formatIncidentCountMap(summary.providerHealthDriftProviderCounts || {});
    if (providerSummary) {
      lines.push(`provider health drift providers: ${providerSummary}`);
    }

    const reasonSummary = formatIncidentCountMap(summary.providerHealthDriftReasonCodeCounts || {});
    if (reasonSummary) {
      lines.push(`provider health drift reason codes: ${reasonSummary}`);
    }
  }

  for (const item of items) {
    lines.push(
      `[${item.actionClass}/${item.priority}] ${item.title} | workspace=${item.workspaceName} | mission=${item.missionId} | owner=${item.recommendedOwner} | dueAt=${item.dueAt}`,
    );
    lines.push(`command: ${item.recommendedCommand}`);
    lines.push(`escalation: ${item.escalationRule}`);
  }

  return lines.join('\n');
}

function deriveEscalationTier(item) {
  if (item.status !== 'open') {
    return 'resolved';
  }

  if (!item.dueAt) {
    return 'normal';
  }

  const nowMs = Date.now();
  const dueMs = new Date(item.dueAt).getTime();
  if (!Number.isFinite(dueMs) || nowMs <= dueMs) {
    return 'normal';
  }

  const overdueHours = (nowMs - dueMs) / (60 * 60 * 1000);
  if (overdueHours >= 24) {
    return 'critical';
  }

  return 'warning';
}

function isBreachTier(tier) {
  return tier === 'warning' || tier === 'critical';
}

function enrichEscalation(item) {
  const currentTier = item.currentTier || deriveEscalationTier(item);
  const dueTimestamp = item.dueAt ? new Date(item.dueAt).getTime() : Number.NaN;
  const isOverdue = item.status === 'open' && Number.isFinite(dueTimestamp) ? Date.now() > dueTimestamp : false;
  const reminderCadenceHours = item.status === 'open' ? deriveEscalationReminderCadenceHours(currentTier) : null;
  const reminderBaseTimestamp = item.lastReminderAt || item.createdAt || null;
  const reminderBaseMs = reminderBaseTimestamp ? new Date(reminderBaseTimestamp).getTime() : Number.NaN;
  const nextReminderAt =
    reminderCadenceHours && Number.isFinite(reminderBaseMs)
      ? new Date(reminderBaseMs + reminderCadenceHours * 60 * 60 * 1000).toISOString()
      : null;
  const nextReminderMs = nextReminderAt ? new Date(nextReminderAt).getTime() : Number.NaN;
  const needsReminder = item.status === 'open' && Number.isFinite(nextReminderMs) ? Date.now() >= nextReminderMs : false;
  const ownerSignals = deriveEffectiveActionOwner({
    recommendedOwner: item.recommendedOwner,
    reminderCount: Number(item.reminderCount || 0),
    needsReminder,
    status: item.status,
  });
  const ownerHistory = Array.isArray(item.ownerHistory) ? item.ownerHistory : [];
  const ownerHandoffHistory = Array.isArray(item.ownerHandoffHistory) ? item.ownerHandoffHistory : [];
  const ownerHandoffReminderHistory = Array.isArray(item.ownerHandoffReminderHistory) ? item.ownerHandoffReminderHistory : [];
  const latestOwnerTransition = getLatestOwnerTransition(ownerHistory);
  const latestOwnerHandoff = getLatestOwnerHandoff(ownerHandoffHistory);
  const pendingOwnerHandoff = item.status === 'open' && hasPendingOwnerHandoff({ ownerHistory, ownerHandoffHistory });
  const ownerHandoffTargetOwner = latestOwnerTransition?.to || null;
  const ownerHandoffSlaHours =
    pendingOwnerHandoff && ownerHandoffTargetOwner ? deriveOwnerHandoffSlaHours(ownerHandoffTargetOwner) : null;
  const ownerHandoffDueAt =
    pendingOwnerHandoff && ownerHandoffSlaHours && latestOwnerTransition?.at
      ? new Date(new Date(latestOwnerTransition.at).getTime() + ownerHandoffSlaHours * 60 * 60 * 1000).toISOString()
      : null;
  const ownerHandoffDueMs = ownerHandoffDueAt ? new Date(ownerHandoffDueAt).getTime() : Number.NaN;
  const ownerHandoffIsOverdue =
    pendingOwnerHandoff && Number.isFinite(ownerHandoffDueMs) ? Date.now() > ownerHandoffDueMs : false;
  const latestOwnerHandoffReminder = ownerHandoffReminderHistory.at(-1) || null;
  const ownerHandoffReminderCadenceHours =
    pendingOwnerHandoff && ownerHandoffTargetOwner ? deriveOwnerHandoffReminderCadenceHours(ownerHandoffTargetOwner) : null;
  const ownerHandoffReminderBaseTimestamp = latestOwnerHandoffReminder?.at || ownerHandoffDueAt || null;
  const ownerHandoffReminderBaseMs = ownerHandoffReminderBaseTimestamp
    ? new Date(ownerHandoffReminderBaseTimestamp).getTime()
    : Number.NaN;
  const nextOwnerHandoffReminderAt =
    pendingOwnerHandoff && ownerHandoffIsOverdue && Number.isFinite(ownerHandoffReminderBaseMs)
      ? latestOwnerHandoffReminder
        ? new Date(
            ownerHandoffReminderBaseMs + Number(ownerHandoffReminderCadenceHours || 0) * 60 * 60 * 1000,
          ).toISOString()
        : ownerHandoffDueAt
      : null;
  const nextOwnerHandoffReminderMs = nextOwnerHandoffReminderAt
    ? new Date(nextOwnerHandoffReminderAt).getTime()
    : Number.NaN;
  const ownerHandoffNeedsReminder =
    pendingOwnerHandoff && ownerHandoffIsOverdue && Number.isFinite(nextOwnerHandoffReminderMs)
      ? Date.now() >= nextOwnerHandoffReminderMs
      : false;

  return {
    ...item,
    breachCount: Number(item.breachCount || 0),
    currentTier,
    currentEffectiveOwner: item.currentEffectiveOwner || ownerSignals.effectiveRecommendedOwner,
    escalationTier: currentTier,
    escalationTierHistoryCount: Array.isArray(item.tierHistory) ? item.tierHistory.length : 0,
    isOverdue,
    lastBreachAt: item.lastBreachAt || null,
    lastOwnerEscalatedAt: item.lastOwnerEscalatedAt || null,
    lastReminderAt: item.lastReminderAt || null,
    lastSyncedAt: item.lastSyncedAt || null,
    needsReminder,
    nextReminderAt,
    effectiveRecommendedOwner: ownerSignals.effectiveRecommendedOwner,
    ownerEscalationLevel: ownerSignals.ownerEscalationLevel,
    ownerEscalationStep: ownerSignals.ownerEscalationStep,
    ownerHandoffHistory,
    ownerHandoffHistoryCount: ownerHandoffHistory.length,
    ownerHandoffCount: ownerHandoffHistory.length,
    ownerHistory,
    ownerHistoryCount: ownerHistory.length,
    latestOwnerHandoff,
    latestOwnerHandoffAt: item.lastOwnerHandoffAt || latestOwnerHandoff?.at || null,
    latestOwnerHandoffReminder,
    latestOwnerHandoffReminderAt: item.lastOwnerHandoffReminderAt || latestOwnerHandoffReminder?.at || null,
    latestOwnerTransition,
    ownerHandoffDueAt,
    ownerHandoffIsOverdue,
    ownerHandoffNeedsReminder,
    ownerHandoffReminderCadenceHours,
    ownerHandoffReminderCount: ownerHandoffReminderHistory.length,
    ownerHandoffReminderHistory,
    ownerHandoffReminderHistoryCount: ownerHandoffReminderHistory.length,
    ownerHandoffSlaHours,
    ownerHandoffTargetOwner,
    nextOwnerHandoffReminderAt,
    pendingOwnerHandoff,
    reminderCadenceHours,
    reminderCount: Number(item.reminderCount || 0),
    reminderHistory: Array.isArray(item.reminderHistory) ? item.reminderHistory : [],
    reminderHistoryCount: Array.isArray(item.reminderHistory) ? item.reminderHistory.length : 0,
    tierHistory: Array.isArray(item.tierHistory) ? item.tierHistory : [],
  };
}

function summarizeEscalations(items) {
  const enrichedItems = items.map((item) => enrichEscalation(item));
  const ownerCounts = {};
  const priorityCounts = {};
  const effectiveOwnerCounts = {};
  const statusCounts = {
    ...Object.fromEntries(ESCALATION_STATUSES.map((status) => [status, 0])),
    total: enrichedItems.length,
  };
  const tierCounts = {
    ...Object.fromEntries(ESCALATION_TIERS.map((tier) => [tier, 0])),
  };
  const workspaceCounts = {};
  let breachCountTotal = 0;
  let latestReminderAt = null;
  let latestOwnerEscalatedAt = null;
  let latestOwnerHandoffAt = null;
  let latestOwnerHandoffReminderAt = null;
  let needsReminderCount = 0;
  let pendingOwnerHandoffCount = 0;
  let pendingOwnerHandoffNeedsReminderCount = 0;
  let pendingOwnerHandoffOverdueCount = 0;
  let ownerHandoffCountTotal = 0;
  let ownerHandoffReminderCountTotal = 0;
  let ownerTransitionCountTotal = 0;
  let nextPendingOwnerHandoffDueAt = null;
  let nextPendingOwnerHandoffReminderAt = null;
  let reminderCountTotal = 0;

  for (const item of enrichedItems) {
    workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
    ownerCounts[item.recommendedOwner] = (ownerCounts[item.recommendedOwner] || 0) + 1;
    effectiveOwnerCounts[item.effectiveRecommendedOwner] = (effectiveOwnerCounts[item.effectiveRecommendedOwner] || 0) + 1;
    priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1;
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    tierCounts[item.escalationTier] = (tierCounts[item.escalationTier] || 0) + 1;
    breachCountTotal += Number(item.breachCount || 0);
    reminderCountTotal += Number(item.reminderCount || 0);
    ownerHandoffCountTotal += Number(item.ownerHandoffCount || 0);
    ownerHandoffReminderCountTotal += Number(item.ownerHandoffReminderCount || 0);
    ownerTransitionCountTotal += Math.max(0, Number(item.ownerHistoryCount || 0) - 1);
    if (item.needsReminder) {
      needsReminderCount += 1;
    }
    if (item.pendingOwnerHandoff) {
      pendingOwnerHandoffCount += 1;
      if (item.ownerHandoffIsOverdue) {
        pendingOwnerHandoffOverdueCount += 1;
      }
      if (item.ownerHandoffNeedsReminder) {
        pendingOwnerHandoffNeedsReminderCount += 1;
      }
      if (
        item.ownerHandoffDueAt &&
        (!nextPendingOwnerHandoffDueAt || String(nextPendingOwnerHandoffDueAt) > String(item.ownerHandoffDueAt))
      ) {
        nextPendingOwnerHandoffDueAt = item.ownerHandoffDueAt;
      }
      if (
        item.ownerHandoffNeedsReminder &&
        item.nextOwnerHandoffReminderAt &&
        (!nextPendingOwnerHandoffReminderAt ||
          String(nextPendingOwnerHandoffReminderAt) > String(item.nextOwnerHandoffReminderAt))
      ) {
        nextPendingOwnerHandoffReminderAt = item.nextOwnerHandoffReminderAt;
      }
    }
    if (item.latestOwnerHandoffAt && (!latestOwnerHandoffAt || String(latestOwnerHandoffAt) < String(item.latestOwnerHandoffAt))) {
      latestOwnerHandoffAt = item.latestOwnerHandoffAt;
    }
    if (
      item.latestOwnerHandoffReminderAt &&
      (!latestOwnerHandoffReminderAt || String(latestOwnerHandoffReminderAt) < String(item.latestOwnerHandoffReminderAt))
    ) {
      latestOwnerHandoffReminderAt = item.latestOwnerHandoffReminderAt;
    }
    if (
      item.lastOwnerEscalatedAt &&
      (!latestOwnerEscalatedAt || String(latestOwnerEscalatedAt) < String(item.lastOwnerEscalatedAt))
    ) {
      latestOwnerEscalatedAt = item.lastOwnerEscalatedAt;
    }
    if (item.lastReminderAt && (!latestReminderAt || String(latestReminderAt) < String(item.lastReminderAt))) {
      latestReminderAt = item.lastReminderAt;
    }
  }

  return {
    latestEscalation:
      [...enrichedItems]
        .sort((left, right) =>
          String(left.updatedAt || left.createdAt || '').localeCompare(String(right.updatedAt || right.createdAt || '')),
        )
        .at(-1) || null,
    openEscalationIds: enrichedItems.filter((item) => item.status === 'open').map((item) => item.id),
    effectiveOwnerCounts,
    ownerCounts,
    pendingEscalationCount: enrichedItems.filter((item) => item.status === 'open').length,
    priorityCounts,
    statusCounts,
    tierCounts,
    breachCountTotal,
    latestOwnerHandoffAt,
    latestOwnerHandoffReminderAt,
    latestReminderAt,
    latestOwnerEscalatedAt,
    needsReminderCount,
    nextPendingOwnerHandoffDueAt,
    nextPendingOwnerHandoffReminderAt,
    ownerHandoffCountTotal,
    ownerHandoffReminderCountTotal,
    ownerTransitionCountTotal,
    pendingOwnerHandoffCount,
    pendingOwnerHandoffNeedsReminderCount,
    pendingOwnerHandoffOverdueCount,
    reminderCountTotal,
    total: enrichedItems.length,
    workspaceCounts,
  };
}

function summarizeMaintenanceRuns(items) {
  const maintenanceImpactSummary = summarizeMaintenanceImpact(items);
  let acknowledgedMaintenanceRequiredCountTotal = 0;
  let effectiveRunCount = 0;
  const workspaceCounts = {};
  let escalationRemindedCountTotal = 0;
  let dueCandidateCountTotal = 0;
  let impactRunCount = 0;
  let latestEffectiveRun = null;
  let latestEffectiveRunAt = null;
  let latestNoOpRun = null;
  let latestNoOpRunAt = null;
  let latestRun = null;
  let latestRunAt = null;
  let ownerHandoffRemindedCountTotal = 0;
  let providerAttentionRemindedCountTotal = 0;
  let specialistFollowUpRemindedCountTotal = 0;
  let noOpRunCount = 0;
  let remainingMaintenanceRequiredCountTotal = 0;
  const recentRuns = [];
  let resolvedMaintenanceRequiredCountTotal = 0;
  let syncedCountTotal = 0;
  let totalRemindedCount = 0;

  for (const item of items) {
    const workspaceKey = item.workspaceId || 'global';
    workspaceCounts[workspaceKey] = (workspaceCounts[workspaceKey] || 0) + 1;
    acknowledgedMaintenanceRequiredCountTotal += Number(item.acknowledgedMaintenanceRequiredCount || 0);
    escalationRemindedCountTotal += Number(item.escalationRemindedCount || 0);
    dueCandidateCountTotal += Number(item.dueCandidateCountTotal || 0);
    ownerHandoffRemindedCountTotal += Number(item.ownerHandoffRemindedCount || 0);
    providerAttentionRemindedCountTotal += Number(item.providerAttentionRemindedCount || 0);
    specialistFollowUpRemindedCountTotal += Number(item.specialistFollowUpRemindedCount || 0);
    remainingMaintenanceRequiredCountTotal += Number(item.remainingMaintenanceRequiredCount || 0);
    resolvedMaintenanceRequiredCountTotal += Number(item.resolvedMaintenanceRequiredCount || 0);
    syncedCountTotal += Number(item.syncedCount || 0);
    totalRemindedCount += Number(item.totalRemindedCount || 0);
    const affectedMissionIds = getMaintenanceRunAffectedMissionIds(item);
    const isEffective = isMaintenanceRunEffective(item);
    const isImpactful = isMaintenanceRunImpactful(item);

    if (isEffective) {
      effectiveRunCount += 1;
      if (!latestEffectiveRunAt || String(latestEffectiveRunAt) < String(item.createdAt || '')) {
        latestEffectiveRunAt = item.createdAt || null;
        latestEffectiveRun = item;
      }
    } else {
      noOpRunCount += 1;
      if (!latestNoOpRunAt || String(latestNoOpRunAt) < String(item.createdAt || '')) {
        latestNoOpRunAt = item.createdAt || null;
        latestNoOpRun = item;
      }
    }

    if (isImpactful) {
      impactRunCount += 1;
    }

    recentRuns.push({
      affectedMissionCount: affectedMissionIds.length,
      affectedMissionIds: affectedMissionIds.sort((left, right) => String(left).localeCompare(String(right))),
      createdAt: item.createdAt || null,
      id: item.id,
      isEffective,
      isImpactful,
      totalRemindedCount: Number(item.totalRemindedCount || 0),
    });

    if (!latestRunAt || String(latestRunAt) < String(item.createdAt || '')) {
      latestRunAt = item.createdAt || null;
      latestRun = item;
    }
  }

  return {
    acknowledgedMaintenanceRequiredCountTotal,
    affectedMissionCount: maintenanceImpactSummary.affectedMissionCount,
    affectedMissionIds: maintenanceImpactSummary.affectedMissionIds,
    dueCandidateCountTotal,
    effectiveRunCount,
    escalationRemindedCountTotal,
    impactRunCount,
    latestImpactAffectedMissionIds: maintenanceImpactSummary.latestImpactAffectedMissionIds,
    latestImpactRun: maintenanceImpactSummary.latestImpactRun,
    latestImpactRunAt: maintenanceImpactSummary.latestImpactRunAt,
    latestEffectiveRun,
    latestEffectiveRunAt,
    latestNoOpRun,
    latestNoOpRunAt,
    latestRun,
    latestRunAt,
    noOpRunCount,
    ownerHandoffRemindedCountTotal,
    providerAttentionRemindedCountTotal,
    specialistFollowUpRemindedCountTotal,
    recentRuns: recentRuns
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
      .slice(0, 5),
    remainingMaintenanceRequiredCountTotal,
    resolvedMaintenanceRequiredCountTotal,
    runCount: items.length,
    runOutcomeCounts: {
      effective: effectiveRunCount,
      impactful: impactRunCount,
      noOp: noOpRunCount,
      total: items.length,
    },
    syncedCountTotal,
    totalRemindedCount,
    workspaceCounts,
  };
}

function summarizeMaintenancePressure(entries) {
  const dueWorkspaceCounts = {};
  let currentDueCandidateCountTotal = 0;
  let currentDueMonitoringCountTotal = 0;
  let currentDueOwnerHandoffCountTotal = 0;
  let currentDueProviderAttentionCountTotal = 0;
  let currentDueSpecialistFollowUpCountTotal = 0;
  let latestRequiredAction = null;
  let latestRequiredActionAt = null;
  let nextDueAt = null;

  for (const entry of entries) {
    const workspaceKey = entry.workspaceId || 'global';
    dueWorkspaceCounts[workspaceKey] = (dueWorkspaceCounts[workspaceKey] || 0) + 1;
    currentDueCandidateCountTotal += Number(entry.totalDueCandidateCount || 0);
    currentDueMonitoringCountTotal += Number(entry.dueMonitoringCount || 0);
    currentDueOwnerHandoffCountTotal += Number(entry.dueOwnerHandoffCount || 0);
    currentDueProviderAttentionCountTotal += Number(entry.dueProviderAttentionCount || 0);
    currentDueSpecialistFollowUpCountTotal += Number(entry.dueSpecialistFollowUpCount || 0);

    if (entry.nextDueAt && (!nextDueAt || String(nextDueAt) > String(entry.nextDueAt))) {
      nextDueAt = entry.nextDueAt;
    }

    if (!latestRequiredActionAt || String(latestRequiredActionAt) < String(entry.createdAt || '')) {
      latestRequiredActionAt = entry.createdAt || null;
      latestRequiredAction = entry;
    }
  }

  return {
    currentDueCandidateCountTotal,
    currentDueMonitoringCountTotal,
    currentDueOwnerHandoffCountTotal,
    currentDueProviderAttentionCountTotal,
    currentDueSpecialistFollowUpCountTotal,
    latestRequiredAction,
    latestRequiredActionAt,
    maintenanceDueWorkspaceIds: [...new Set(entries.map((entry) => entry.workspaceId).filter(Boolean))],
    maintenanceRequiredCount: entries.length,
    nextDueAt,
    dueWorkspaceCounts,
  };
}

function getMaintenanceRunAffectedMissionIds(item) {
  return [...new Set([item.missionId, ...ensureArray(item.affectedMissionIds)].filter(Boolean))].sort((left, right) =>
    String(left).localeCompare(String(right)),
  );
}

function isMaintenanceRunEffective(item) {
  return (
    Number(item.totalRemindedCount || 0) > 0 ||
    Number(item.acknowledgedMaintenanceRequiredCount || 0) > 0 ||
    Number(item.resolvedMaintenanceRequiredCount || 0) > 0
  );
}

function isMaintenanceRunImpactful(item) {
  return getMaintenanceRunAffectedMissionIds(item).length > 0;
}

function buildMaintenanceDailyBuckets(items) {
  const bucketMap = new Map();

  for (const item of items) {
    const createdAt = String(item.createdAt || '');
    if (!createdAt) {
      continue;
    }

    const date = createdAt.slice(0, 10);
    const affectedMissionIds = getMaintenanceRunAffectedMissionIds(item);
    const isEffective = isMaintenanceRunEffective(item);
    const isImpactful = affectedMissionIds.length > 0;
    const current = bucketMap.get(date) || {
      affectedMissionIds: new Set(),
      date,
      effectiveRunCount: 0,
      impactRunCount: 0,
      noOpRunCount: 0,
      runCount: 0,
      totalRemindedCount: 0,
    };

    current.runCount += 1;
    current.totalRemindedCount += Number(item.totalRemindedCount || 0);
    if (isEffective) {
      current.effectiveRunCount += 1;
    } else {
      current.noOpRunCount += 1;
    }
    if (isImpactful) {
      current.impactRunCount += 1;
    }
    for (const missionId of affectedMissionIds) {
      current.affectedMissionIds.add(missionId);
    }
    bucketMap.set(date, current);
  }

  return [...bucketMap.values()]
    .map((bucket) => {
      const affectedMissionIds = [...bucket.affectedMissionIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
      return {
        affectedMissionCount: affectedMissionIds.length,
        affectedMissionIds,
        date: bucket.date,
        effectiveRunCount: bucket.effectiveRunCount,
        impactRunCount: bucket.impactRunCount,
        noOpRunCount: bucket.noOpRunCount,
        runCount: bucket.runCount,
        totalRemindedCount: bucket.totalRemindedCount,
      };
    })
    .sort((left, right) => String(right.date).localeCompare(String(left.date)));
}

function buildMaintenanceLatestBucketDelta(dailyBuckets) {
  const current = dailyBuckets[0] || null;
  if (!current) {
    return null;
  }

  const previous = dailyBuckets[1] || null;
  return {
    affectedMissionCountDelta: Number(current.affectedMissionCount || 0) - Number(previous?.affectedMissionCount || 0),
    currentDate: current.date,
    effectiveRunCountDelta: Number(current.effectiveRunCount || 0) - Number(previous?.effectiveRunCount || 0),
    impactRunCountDelta: Number(current.impactRunCount || 0) - Number(previous?.impactRunCount || 0),
    noOpRunCountDelta: Number(current.noOpRunCount || 0) - Number(previous?.noOpRunCount || 0),
    previousDate: previous?.date || null,
    runCountDelta: Number(current.runCount || 0) - Number(previous?.runCount || 0),
    totalRemindedCountDelta: Number(current.totalRemindedCount || 0) - Number(previous?.totalRemindedCount || 0),
  };
}

function summarizeMaintenanceImpact(items, scopeMissionIds = null) {
  const affectedMissionIds = new Set();
  let latestImpactRun = null;
  let latestImpactRunAt = null;
  let latestImpactAffectedMissionIds = [];
  const allowedMissionIds = scopeMissionIds ? new Set(scopeMissionIds) : null;

  for (const item of items) {
    const runAffectedMissionIds = [...new Set([item.missionId, ...ensureArray(item.affectedMissionIds)].filter(Boolean))].filter(
      (missionId) => !allowedMissionIds || allowedMissionIds.has(missionId),
    );
    for (const missionId of runAffectedMissionIds) {
      affectedMissionIds.add(missionId);
    }

    if (
      runAffectedMissionIds.length > 0 &&
      (!latestImpactRunAt || String(latestImpactRunAt) < String(item.createdAt || ''))
    ) {
      latestImpactRunAt = item.createdAt || null;
      latestImpactRun = item;
      latestImpactAffectedMissionIds = [...runAffectedMissionIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      );
    }
  }

  return {
    affectedMissionCount: affectedMissionIds.size,
    affectedMissionIds: [...affectedMissionIds].sort((left, right) => String(left).localeCompare(String(right))),
    latestImpactAffectedMissionIds,
    latestImpactRun,
    latestImpactRunAt,
  };
}

function summarizeReviewerFollowUps(items) {
  const statusCounts = {
    ...Object.fromEntries(REVIEWER_FOLLOW_UP_STATUSES.map((status) => [status, 0])),
    total: items.length,
  };
  const resolutionKindCounts = {
    ...Object.fromEntries(REVIEWER_FOLLOW_UP_RESOLUTION_KINDS.map((kind) => [kind, 0])),
    unresolved: 0,
  };
  const workspaceCounts = {};

  for (const item of items) {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
    workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
    if (item.resolutionKind) {
      resolutionKindCounts[item.resolutionKind] = (resolutionKindCounts[item.resolutionKind] || 0) + 1;
    } else {
      resolutionKindCounts.unresolved += 1;
    }
  }

  return {
    latestFollowUp:
      [...items]
        .sort((left, right) =>
          String(left.updatedAt || left.createdAt || '').localeCompare(String(right.updatedAt || right.createdAt || '')),
        )
        .at(-1) || null,
    resolutionKindCounts,
    statusCounts,
    total: items.length,
    workspaceCounts,
  };
}

function summarizeSpecialistFollowUpItems(items) {
  const providerCounts = {};
  const retryPolicyCounts = {};
  const specialistKindCounts = Object.fromEntries(SPECIALIST_KINDS.map((kind) => [kind, 0]));
  const statusCounts = {
    blocked: 0,
    failed: 0,
    total: items.length,
  };
  const workspaceCounts = {};
  let overdueCount = 0;
  let latestReminderAt = null;
  let nextReminderAt = null;
  let needsReminderCount = 0;
  let reminderCountTotal = 0;

  for (const item of items) {
    if (item.providerId) {
      providerCounts[item.providerId] = (providerCounts[item.providerId] || 0) + 1;
    }
    if (item.retryPolicy) {
      retryPolicyCounts[item.retryPolicy] = (retryPolicyCounts[item.retryPolicy] || 0) + 1;
    }
    if (item.workspaceId) {
      workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
    }
    if (SPECIALIST_KINDS.includes(item.specialistKind)) {
      specialistKindCounts[item.specialistKind] = (specialistKindCounts[item.specialistKind] || 0) + 1;
    }
    if (item.status === 'blocked' || item.status === 'failed') {
      statusCounts[item.status] += 1;
    }
    if (item.isOverdue) {
      overdueCount += 1;
    }
    if (item.needsReminder) {
      needsReminderCount += 1;
    }
    reminderCountTotal += Number(item.reminderCount || 0);
    if (
      item.latestReminderAt &&
      (!latestReminderAt || String(latestReminderAt) < String(item.latestReminderAt))
    ) {
      latestReminderAt = item.latestReminderAt;
    }
    if (item.nextReminderAt && (!nextReminderAt || String(nextReminderAt) > String(item.nextReminderAt))) {
      nextReminderAt = item.nextReminderAt;
    }
  }

  return {
    latestItem: items.at(-1) || null,
      latestReminderAt,
      needsReminderCount,
      nextReminderAt,
      overdueCount,
      providerCounts,
      reminderCountTotal,
      retryPolicyCounts,
      specialistKindCounts,
      statusCounts,
      total: items.length,
      workspaceCounts,
    };
}

function summarizeOperatorTimeline(events) {
  const eventCounts = {};
  const workspaceCounts = {};

  for (const event of events) {
    eventCounts[event.kind] = (eventCounts[event.kind] || 0) + 1;
    if (event.workspaceId) {
      workspaceCounts[event.workspaceId] = (workspaceCounts[event.workspaceId] || 0) + 1;
    }
  }

  return {
    eventCounts,
    latestEvent: events.at(-1) || null,
    total: events.length,
    workspaceCounts,
  };
}

export function createMissionService({ store, rootDir = store.rootDir }) {
  const docService = createDocService({ rootDir });
  const providerRegistry = createProviderRegistry({ rootDir });
  const harness = createRuntimeHarness({ store });

  docService.ensureDocs();

  function addWorkspace({ workspacePath, name }) {
    const normalizedPath = normalizeText(workspacePath);
    if (!normalizedPath) {
      throw new Error('workspacePath is required.');
    }

    const existingWorkspace = store
      .listWorkspaces()
      .find((workspace) => workspace.path === normalizedPath);

    if (existingWorkspace) {
      return existingWorkspace;
    }

    return store.saveWorkspace({
      id: createId('workspace'),
      name: normalizeText(name, path.basename(normalizedPath) || 'workspace'),
      path: normalizedPath,
      createdAt: now(),
    });
  }

  function getWorkspace(workspaceId) {
    const workspace = store.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    return workspace;
  }

  function createMission(input) {
    const workspace = getWorkspace(input.workspaceId);
    const mode = normalizeText(input.mode, 'knowledge');

    if (!MISSION_MODES.includes(mode)) {
      throw new Error(`Unsupported mode: ${mode}`);
    }

    const createdAt = now();
    const mission = {
      id: createId('mission'),
      workspaceId: workspace.id,
      mode,
      title: normalizeText(input.title, 'Untitled mission'),
      objective: normalizeText(input.objective, 'Clarify the next best move.'),
      constraints: ensureArray(input.constraints)
        .map((item) => normalizeText(item))
        .filter(Boolean),
      deliverableType: getDefaultDeliverableType(mode, input.deliverableType),
      status: 'created',
      createdAt,
      updatedAt: createdAt,
    };

    resolveMissionParallelPlan(mission);

    return store.saveMission(mission);
  }

  function listMissions() {
    return store.listMissions();
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

  function listSpecialistFollowUpRemindersForItem(item) {
    const actionId = normalizeText(item?.actionId || '');
    if (!actionId) {
      return [];
    }

    return store.listSpecialistFollowUpReminders({ actionId });
  }

  function formatProviderAttentionRecoveryDetail(item) {
    const recoveryLabel =
      item.eventFamily === 'execution' ? 'successful provider execution' : 'successful provider probe';
    const recoveryDetail = normalizeText(item.recoveryDetail);
    const failureDetail = normalizeText(item.reason);
    const acknowledgedPrefix = item.acknowledgedAt ? 'Acknowledged attention recovered after ' : 'Recovered after ';
    const detailSuffix = recoveryDetail || failureDetail;

    return detailSuffix ? `${acknowledgedPrefix}${recoveryLabel}: ${detailSuffix}` : `${acknowledgedPrefix}${recoveryLabel}.`;
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

function summarizeProviderExecutions(executions) {
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

  function buildProviderExecutionDailyBuckets(executions) {
    const bucketMap = new Map();

    for (const execution of executions) {
      const at = String(execution.at || execution.endedAt || execution.startedAt || '');
      if (!at) {
        continue;
      }

      const date = at.slice(0, 10);
      const current = bucketMap.get(date) || {
        completedCount: 0,
        date,
        estimatedCostUsdByProviderId: {},
        estimatedCostUsdByRole: {},
        estimatedCostUsdPricedCount: 0,
        estimatedCostUsdTotal: 0,
        executionCount: 0,
        failedCount: 0,
      };

      current.executionCount += 1;
      if (execution.status === 'completed') {
        current.completedCount += 1;
      }
      if (execution.status === 'failed') {
        current.failedCount += 1;
      }

      const estimatedCostUsd = roundUsdAmount(execution.estimatedCostUsd);
      if (Number.isFinite(estimatedCostUsd) && estimatedCostUsd >= 0) {
        current.estimatedCostUsdPricedCount += 1;
        current.estimatedCostUsdTotal = roundUsdAmount(current.estimatedCostUsdTotal + estimatedCostUsd);

        const providerId = normalizeText(execution.providerId);
        if (providerId) {
          current.estimatedCostUsdByProviderId[providerId] = roundUsdAmount(
            Number(current.estimatedCostUsdByProviderId[providerId] || 0) + estimatedCostUsd,
          );
        }

        const role = normalizeText(execution.role);
        if (role) {
          current.estimatedCostUsdByRole[role] = roundUsdAmount(
            Number(current.estimatedCostUsdByRole[role] || 0) + estimatedCostUsd,
          );
        }
      }

      bucketMap.set(date, current);
    }

    return [...bucketMap.values()].sort((left, right) => String(right.date).localeCompare(String(left.date)));
  }

  function buildProviderExecutionWeeklyBuckets(executions) {
    const bucketMap = new Map();

    for (const execution of executions) {
      const at = String(execution.at || execution.endedAt || execution.startedAt || '');
      if (!at) {
        continue;
      }

      const weekRange = getUtcWeekRange(at);
      if (!weekRange) {
        continue;
      }

      const current = bucketMap.get(weekRange.key) || {
        completedCount: 0,
        estimatedCostUsdByProviderId: {},
        estimatedCostUsdByRole: {},
        estimatedCostUsdPricedCount: 0,
        estimatedCostUsdTotal: 0,
        executionCount: 0,
        failedCount: 0,
        weekEndDate: weekRange.weekEndDate,
        weekStartDate: weekRange.weekStartDate,
      };

      current.executionCount += 1;
      if (execution.status === 'completed') {
        current.completedCount += 1;
      }
      if (execution.status === 'failed') {
        current.failedCount += 1;
      }

      const estimatedCostUsd = roundUsdAmount(execution.estimatedCostUsd);
      if (Number.isFinite(estimatedCostUsd) && estimatedCostUsd >= 0) {
        current.estimatedCostUsdPricedCount += 1;
        current.estimatedCostUsdTotal = roundUsdAmount(current.estimatedCostUsdTotal + estimatedCostUsd);

        const providerId = normalizeText(execution.providerId);
        if (providerId) {
          current.estimatedCostUsdByProviderId[providerId] = roundUsdAmount(
            Number(current.estimatedCostUsdByProviderId[providerId] || 0) + estimatedCostUsd,
          );
        }

        const role = normalizeText(execution.role);
        if (role) {
          current.estimatedCostUsdByRole[role] = roundUsdAmount(
            Number(current.estimatedCostUsdByRole[role] || 0) + estimatedCostUsd,
          );
        }
      }

      bucketMap.set(weekRange.key, current);
    }

    return [...bucketMap.values()].sort((left, right) =>
      String(right.weekStartDate).localeCompare(String(left.weekStartDate)),
    );
  }

  function buildProviderExecutionMonthlyBuckets(executions) {
    const bucketMap = new Map();

    for (const execution of executions) {
      const at = String(execution.at || execution.endedAt || execution.startedAt || '');
      if (!at) {
        continue;
      }

      const monthRange = getUtcMonthRange(at);
      if (!monthRange) {
        continue;
      }

      const current = bucketMap.get(monthRange.key) || {
        completedCount: 0,
        estimatedCostUsdByProviderId: {},
        estimatedCostUsdByRole: {},
        estimatedCostUsdPricedCount: 0,
        estimatedCostUsdTotal: 0,
        executionCount: 0,
        failedCount: 0,
        monthEndDate: monthRange.monthEndDate,
        monthKey: monthRange.monthKey,
        monthStartDate: monthRange.monthStartDate,
      };

      current.executionCount += 1;
      if (execution.status === 'completed') {
        current.completedCount += 1;
      }
      if (execution.status === 'failed') {
        current.failedCount += 1;
      }

      const estimatedCostUsd = roundUsdAmount(execution.estimatedCostUsd);
      if (Number.isFinite(estimatedCostUsd) && estimatedCostUsd >= 0) {
        current.estimatedCostUsdPricedCount += 1;
        current.estimatedCostUsdTotal = roundUsdAmount(current.estimatedCostUsdTotal + estimatedCostUsd);

        const providerId = normalizeText(execution.providerId);
        if (providerId) {
          current.estimatedCostUsdByProviderId[providerId] = roundUsdAmount(
            Number(current.estimatedCostUsdByProviderId[providerId] || 0) + estimatedCostUsd,
          );
        }

        const role = normalizeText(execution.role);
        if (role) {
          current.estimatedCostUsdByRole[role] = roundUsdAmount(
            Number(current.estimatedCostUsdByRole[role] || 0) + estimatedCostUsd,
          );
        }
      }

      bucketMap.set(monthRange.key, current);
    }

    return [...bucketMap.values()].sort((left, right) =>
      String(right.monthStartDate).localeCompare(String(left.monthStartDate)),
    );
  }

  function buildProviderExecutionLatestBucketDelta(dailyBuckets) {
    const current = dailyBuckets[0] || null;
    if (!current) {
      return null;
    }

    const previous = dailyBuckets[1] || null;
    return {
      completedCountDelta: Number(current.completedCount || 0) - Number(previous?.completedCount || 0),
      currentDate: current.date,
      estimatedCostUsdPricedCountDelta:
        Number(current.estimatedCostUsdPricedCount || 0) - Number(previous?.estimatedCostUsdPricedCount || 0),
      estimatedCostUsdTotalDelta: roundUsdAmount(
        Number(current.estimatedCostUsdTotal || 0) - Number(previous?.estimatedCostUsdTotal || 0),
      ),
      executionCountDelta: Number(current.executionCount || 0) - Number(previous?.executionCount || 0),
      failedCountDelta: Number(current.failedCount || 0) - Number(previous?.failedCount || 0),
      previousDate: previous?.date || null,
    };
  }

  function buildProviderExecutionLatestWeeklyBucketDelta(weeklyBuckets) {
    const current = weeklyBuckets[0] || null;
    if (!current) {
      return null;
    }

    const previous = weeklyBuckets[1] || null;
    return {
      completedCountDelta: Number(current.completedCount || 0) - Number(previous?.completedCount || 0),
      currentWeekEndDate: current.weekEndDate,
      currentWeekStartDate: current.weekStartDate,
      estimatedCostUsdPricedCountDelta:
        Number(current.estimatedCostUsdPricedCount || 0) - Number(previous?.estimatedCostUsdPricedCount || 0),
      estimatedCostUsdTotalDelta: roundUsdAmount(
        Number(current.estimatedCostUsdTotal || 0) - Number(previous?.estimatedCostUsdTotal || 0),
      ),
      executionCountDelta: Number(current.executionCount || 0) - Number(previous?.executionCount || 0),
      failedCountDelta: Number(current.failedCount || 0) - Number(previous?.failedCount || 0),
      previousWeekEndDate: previous?.weekEndDate || null,
      previousWeekStartDate: previous?.weekStartDate || null,
    };
  }

  function buildProviderExecutionLatestMonthlyBucketDelta(monthlyBuckets) {
    const current = monthlyBuckets[0] || null;
    if (!current) {
      return null;
    }

    const previous = monthlyBuckets[1] || null;
    return {
      completedCountDelta: Number(current.completedCount || 0) - Number(previous?.completedCount || 0),
      currentMonthEndDate: current.monthEndDate,
      currentMonthKey: current.monthKey,
      currentMonthStartDate: current.monthStartDate,
      estimatedCostUsdPricedCountDelta:
        Number(current.estimatedCostUsdPricedCount || 0) - Number(previous?.estimatedCostUsdPricedCount || 0),
      estimatedCostUsdTotalDelta: roundUsdAmount(
        Number(current.estimatedCostUsdTotal || 0) - Number(previous?.estimatedCostUsdTotal || 0),
      ),
      executionCountDelta: Number(current.executionCount || 0) - Number(previous?.executionCount || 0),
      failedCountDelta: Number(current.failedCount || 0) - Number(previous?.failedCount || 0),
      previousMonthEndDate: previous?.monthEndDate || null,
      previousMonthKey: previous?.monthKey || null,
      previousMonthStartDate: previous?.monthStartDate || null,
    };
  }

  function buildProviderExecutionTimeline(executions) {
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

  function summarizeProviderExecutionTimeline(events) {
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

  function summarizeProviderProbes(probes) {
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

  function getLatestMatchingRecord(records, predicate) {
    for (let index = records.length - 1; index >= 0; index -= 1) {
      if (predicate(records[index])) {
        return records[index];
      }
    }

    return null;
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
      const attentionStatus =
        latestAttentionStateEvent?.eventKind === 'provider-attention-resolved'
          ? 'resolved'
          : latestAttentionRecovery
            ? 'recovered'
          : latestAttentionStateEvent?.eventKind === 'provider-attention-acknowledged'
            ? 'acknowledged'
            : latestAttentionStateEvent &&
                ['provider-probe-failed', 'provider-execution-failed'].includes(latestAttentionStateEvent.eventKind)
              ? 'pending'
              : 'clear';

      return {
        ...provider,
        attentionStatus,
        latestAttentionAcknowledgement,
        latestAttentionRecovery,
        latestAttentionRecord,
        latestAttentionReminder,
        latestAttentionResolution,
        latestAttentionStateEvent,
        latestEvent,
        latestExecution: getLatestProviderExecution(provider.id),
        latestProbe: getLatestProviderProbe(provider.id),
      };
    });
  }

  function summarizeProviderStatusEntries(providers) {
    return {
      configuredCount: providers.filter((provider) => provider.configured).length,
      defaultProviderId: providers.find((provider) => provider.defaultProvider)?.id || 'stub',
      implementedCount: providers.filter((provider) => provider.implemented).length,
      total: providers.length,
    };
  }

  function enrichProviderStatusEntries(providers) {
    const pendingAttentionItems = buildProviderAttentionPendingItemsFromProviders(providers, {});
    const recoveredAttentionItems = buildProviderAttentionRecoveredItemsFromProviders(providers, {});
    const pendingAttentionByProviderId = new Map(
      pendingAttentionItems.map((item) => [item.providerId, item]),
    );
    const recoveredAttentionByProviderId = new Map(
      recoveredAttentionItems.map((item) => [item.providerId, item]),
    );

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

  function summarizeProviderOverview(providers, probes) {
    const pendingAttentionItems = buildProviderAttentionPendingItemsFromProviders(providers, {});
    const recoveredAttentionItems = buildProviderAttentionRecoveredItemsFromProviders(providers, {});
    const pendingAttentionSummary = summarizeProviderAttentionItems(pendingAttentionItems);
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
    const acknowledgedAttentionRecords = store.listProviderAttentionAcknowledgements();
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
        continue;
      }

      if (provider.latestProbe.ok) {
        latestProbeSuccessProviderIds.push(provider.id);
        continue;
      }

      if (provider.latestProbe.attempted) {
        latestProbeFailureProviderIds.push(provider.id);
        continue;
      }

      latestProbeSkippedProviderIds.push(provider.id);
    }

    const probeSummary = summarizeProviderProbes(probes);
    const executions = buildProviderExecutionEntries();
    const executionSummary = summarizeProviderExecutions(executions);
    const eventSummary = summarizeProviderEvents(buildProviderEvents());

    return {
      ...summarizeProviderStatusEntries(providers),
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
      executionAverageDurationMs: executionSummary.averageDurationMs,
      executionCompletedCount: executionSummary.statusCounts.completed,
      executionFailedCount: executionSummary.statusCounts.failed,
      executionFailureKindCounts: executionSummary.failureKindCounts,
      executionMaxDurationMs: executionSummary.maxDurationMs,
      executionMaxAttemptCount: executionSummary.maxAttemptCount,
      executionMultiAttemptCount: executionSummary.multiAttemptCount,
      executionRetrySucceededCount: executionSummary.retrySucceededCount,
      executionStatusCounts: executionSummary.statusCounts,
      executionTotal: executionSummary.total,
      executionTotalAttemptCount: executionSummary.totalAttemptCount,
      executionTotalDurationMs: executionSummary.totalDurationMs,
      executionTotalRetryCount: executionSummary.totalRetryCount,
      executionAttemptHistoryEntryCountTotal: executionSummary.attemptHistoryEntryCountTotal,
      eventTotal: eventSummary.total,
      latestFailedProbe: getLatestMatchingRecord(probes, (probe) => probe.attempted && !probe.ok),
      latestFailedExecution: executionSummary.latestFailedExecution,
      latestEvent: eventSummary.latestEvent,
      latestAttentionAcknowledgement: getLatestItem(acknowledgedAttentionRecords, 'acknowledgedAt'),
      latestAttentionRecovery: getLatestItem(recoveredAttentionItems, 'recoveredAt'),
      latestAttentionReminder: getLatestItem(store.listProviderAttentionReminders(), 'remindedAt'),
      latestAttentionResolution: getLatestItem(
        acknowledgedAttentionRecords.filter((record) => (record.status || 'acknowledged') === 'resolved'),
        'resolvedAt',
      ),
      latestAttentionRequiredEvent: getLatestItem(attentionEvents, 'at'),
      latestAttentionEvent: eventSummary.latestAttentionEvent,
      latestExecutionEvent: eventSummary.latestExecutionEvent,
      latestProbe: probes.at(-1) || null,
      latestProbeFailureCount: latestProbeFailureProviderIds.length,
      latestProbeFailureProviderIds,
      latestProbeEvent: eventSummary.latestProbeEvent,
      latestProbeSkippedCount: latestProbeSkippedProviderIds.length,
      latestProbeSkippedProviderIds,
      latestProbeSuccessCount: latestProbeSuccessProviderIds.length,
      latestProbeSuccessProviderIds,
      latestExecution: executionSummary.latestExecution,
      latestSkippedProbe: getLatestMatchingRecord(probes, (probe) => !probe.attempted),
      latestSuccessfulExecution: executionSummary.latestSuccessfulExecution,
      latestSuccessfulProbe: getLatestMatchingRecord(probes, (probe) => probe.ok),
      probeAttemptedCount: probeSummary.attemptedCount,
      probeAverageDurationMs: probeSummary.averageDurationMs,
      probeFailureCount: probeSummary.failureCount,
      probeFailureKindCounts: probeSummary.failureKindCounts,
      probeMaxAttemptCount: probeSummary.maxAttemptCount,
      probeMaxDurationMs: probeSummary.maxDurationMs,
      probeMultiAttemptCount: probeSummary.multiAttemptCount,
      probeSuccessCount: probeSummary.successCount,
      probeRetryableFailureCount: probeSummary.retryableFailureCount,
      probeRetrySucceededCount: probeSummary.retrySucceededCount,
      probeTimedOutFailureCount: probeSummary.timedOutFailureCount,
      probeTotalAttemptCount: probeSummary.totalAttemptCount,
      executionRetryableFailureCount: executionSummary.retryableFailureCount,
      executionTimedOutFailureCount: executionSummary.timedOutFailureCount,
      executionEstimatedCostUsdAverage: executionSummary.estimatedCostUsdAverage,
      executionEstimatedCostUsdByProviderId: executionSummary.estimatedCostUsdByProviderId,
      executionEstimatedCostUsdByRole: executionSummary.estimatedCostUsdByRole,
      executionEstimatedCostUsdMax: executionSummary.estimatedCostUsdMax,
      executionEstimatedCostUsdPricedCount: executionSummary.estimatedCostUsdPricedCount,
      executionEstimatedCostUsdTotal: executionSummary.estimatedCostUsdTotal,
      probeTotalDurationMs: probeSummary.totalDurationMs,
      probeTotalRetryCount: probeSummary.totalRetryCount,
      probeAttemptHistoryEntryCountTotal: probeSummary.attemptHistoryEntryCountTotal,
      probeTotal: probeSummary.total,
      readyCount: readyProviderIds.length,
      readyProviderIds,
      recoveredAttentionCount: recoveredAttentionProviderIds.length,
      recoveredAttentionProviderIds,
      resolvedAttentionCount: resolvedAttentionProviderIds.length,
      resolvedAttentionProviderIds,
      unconfiguredCount: unconfiguredProviderIds.length,
      unconfiguredProviderIds,
      usageInputTokensTotal: executionSummary.usageInputTokensTotal,
      usageOutputTokensTotal: executionSummary.usageOutputTokensTotal,
      usageTotalTokensTotal: executionSummary.usageTotalTokensTotal,
      unprobedCount: unprobedProviderIds.length,
      unprobedProviderIds,
    };
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

  function buildProviderProbeTimeline(probes) {
    return probes.map((probe) => {
      const kind = probe.attempted
        ? probe.ok
          ? 'provider-probe-succeeded'
          : 'provider-probe-failed'
        : 'provider-probe-skipped';

      return {
        at: probe.checkedAt || probe.createdAt,
        attempted: probe.attempted,
        attemptHistory: normalizeProviderAttemptHistory(probe.attemptHistory),
        attemptHistoryCount: normalizeProviderAttemptHistory(probe.attemptHistory).length,
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
        sampleModels: ensureArray(probe.sampleModels),
        timedOut: Boolean(probe.timedOut),
        transport: probe.transport || null,
        attemptCount: Number(probe.attemptCount || 0),
      };
    });
  }

  function summarizeProviderProbeTimeline(events) {
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
      averageDurationMs: durationSummary.averageDurationMs,
      eventCounts,
      failureKindCounts: summarizeFailureKinds(events.filter((event) => event.attempted && !event.ok)),
      failureCount,
      latestEvent: events.at(-1) || null,
      maxDurationMs: durationSummary.maxDurationMs,
      providerCounts,
      retryableFailureCount: events.filter((event) => event.attempted && !event.ok && event.recoverable).length,
      totalAttemptCount: attemptSummary.totalAttemptCount,
      totalRetryCount: attemptSummary.totalRetryCount,
      successCount,
      retrySucceededCount: attemptSummary.retrySucceededCount,
      multiAttemptCount: attemptSummary.multiAttemptCount,
      timedOutFailureCount: events.filter((event) => event.attempted && !event.ok && event.timedOut).length,
      maxAttemptCount: attemptSummary.maxAttemptCount || null,
      attemptHistoryEntryCountTotal: attemptSummary.attemptHistoryEntryCountTotal,
      total: events.length,
      totalDurationMs: durationSummary.totalDurationMs,
    };
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

  function buildSpecialistFollowUpReminderTimeline(records) {
    return records.map((record) => ({
      actionId: record.actionId,
      at: record.remindedAt || record.createdAt || null,
      detail: formatSpecialistFollowUpReminderDetail(record),
      kind: 'specialist-follow-up-reminded',
      missionId: record.missionId || null,
      parallelGroupId: record.parallelGroupId || null,
      providerId: record.providerId || null,
      runId: record.runId || null,
      sessionId: record.sessionId || null,
      specialistKind: record.specialistKind || null,
      status: record.status || null,
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

    return sortTimelineEvents(events);
  }

  function buildProviderEvents(filter = {}) {
    const family = normalizeText(filter.family).toLowerCase();
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
      if (!normalizedSinceFilter) {
        return true;
      }
      return String(event.at || '') >= normalizedSinceFilter;
    });
  }

  function summarizeProviderEvents(events) {
    const eventCounts = {};
    const familyCounts = { attention: 0, execution: 0, probe: 0 };
    const providerCounts = {};
    const executionEvents = events.filter((event) => event.eventFamily === 'execution');
    const probeEvents = events.filter((event) => event.eventFamily === 'probe');
    const executionDurationSummary = summarizeDurationMetrics(
      executionEvents,
    );
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
    let probeAttemptedCount = 0;
    let probeFailureCount = 0;
    let probeSkippedCount = 0;
    let probeSuccessCount = 0;
    const attentionStatusCounts = {
      acknowledged: 0,
      opened: 0,
      recovered: 0,
      reminded: 0,
      resolved: 0,
      total: 0,
    };

    for (const event of events) {
      eventCounts[event.eventKind] = (eventCounts[event.eventKind] || 0) + 1;
      providerCounts[event.providerId] = (providerCounts[event.providerId] || 0) + 1;

      if (event.eventFamily === 'probe') {
        familyCounts.probe += 1;
        if (event.attempted) {
          probeAttemptedCount += 1;
        } else {
          probeSkippedCount += 1;
          continue;
        }
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

      familyCounts.execution += 1;
      executionStatusCounts.total += 1;
      if (executionStatusCounts[event.executionStatus] !== undefined) {
        executionStatusCounts[event.executionStatus] += 1;
      }
    }

    return {
      attentionStatusCounts,
      eventCounts,
      executionAverageDurationMs: executionDurationSummary.averageDurationMs,
      executionCompletedCount: executionStatusCounts.completed,
      executionFailureKindCounts: summarizeFailureKinds(
        events.filter((event) => event.eventFamily === 'execution' && event.executionStatus === 'failed'),
      ),
      executionFailedCount: executionStatusCounts.failed,
      executionMaxDurationMs: executionDurationSummary.maxDurationMs,
      executionMaxAttemptCount: executionAttemptSummary.maxAttemptCount || null,
      executionMultiAttemptCount: executionAttemptSummary.multiAttemptCount,
      executionRetryableFailureCount: events.filter(
        (event) => event.eventFamily === 'execution' && event.executionStatus === 'failed' && event.recoverable,
      ).length,
      executionRetrySucceededCount: executionAttemptSummary.retrySucceededCount,
      executionStatusCounts,
      executionTotalAttemptCount: executionAttemptSummary.totalAttemptCount,
      executionTotalDurationMs: executionDurationSummary.totalDurationMs,
      executionTotalRetryCount: executionAttemptSummary.totalRetryCount,
      executionAttemptHistoryEntryCountTotal: executionAttemptSummary.attemptHistoryEntryCountTotal,
      executionEstimatedCostUsdAverage: executionEstimatedCostSummary.estimatedCostUsdAverage,
      executionEstimatedCostUsdByProviderId: executionEstimatedCostByProviderId,
      executionEstimatedCostUsdByRole: executionEstimatedCostByRole,
      executionEstimatedCostUsdMax: executionEstimatedCostSummary.estimatedCostUsdMax,
      executionEstimatedCostUsdPricedCount: executionEstimatedCostSummary.estimatedCostUsdPricedCount,
      executionEstimatedCostUsdTotal: executionEstimatedCostSummary.estimatedCostUsdTotal,
      executionTimedOutFailureCount: events.filter(
        (event) => event.eventFamily === 'execution' && event.executionStatus === 'failed' && event.timedOut,
      ).length,
      familyCounts,
      latestAttentionEvent: getLatestMatchingRecord(events, (event) => event.eventFamily === 'attention'),
      latestEvent: events.at(-1) || null,
      latestExecutionEvent: getLatestMatchingRecord(events, (event) => event.eventFamily === 'execution'),
      latestProbeEvent: getLatestMatchingRecord(events, (event) => event.eventFamily === 'probe'),
      probeAttemptedCount,
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
      probeTotalAttemptCount: probeAttemptSummary.totalAttemptCount,
      probeTotalDurationMs: probeDurationSummary.totalDurationMs,
      probeTotalRetryCount: probeAttemptSummary.totalRetryCount,
      probeAttemptHistoryEntryCountTotal: probeAttemptSummary.attemptHistoryEntryCountTotal,
      probeTimedOutFailureCount: events.filter(
        (event) => event.eventFamily === 'probe' && event.attempted && !event.ok && event.timedOut,
      ).length,
      providerCounts,
      total: events.length,
      ...executionUsageSummary,
    };
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
        latestRecentProviderProbe: recentWindow?.latestProbe || null,
        providerHealthDriftAttentionNeedsReminderCount: healthDrift.attentionNeedsReminderCount,
        providerHealthDriftAttentionOverdueCount: healthDrift.attentionOverdueCount,
        providerHealthDriftAttentionRequiredCount: healthDrift.attentionRequiredCount,
        providerHealthDriftReasonCodes: healthDrift.reasonCodes,
        providerHealthDriftRecentExecutionCountDelta: healthDrift.recentExecutionCountDelta,
        providerHealthDriftRecentExecutionCurrentMonthStartDate:
          healthDrift.recentExecutionCurrentMonthStartDate,
        providerHealthDriftRecentExecutionEstimatedCostUsdTotalDelta:
          healthDrift.recentExecutionEstimatedCostUsdTotalDelta,
        providerHealthDriftRecentExecutionFailedCountDelta: healthDrift.recentExecutionFailedCountDelta,
        providerHealthDriftRecentExecutionMonthlyBucketCount: healthDrift.recentExecutionMonthlyBucketCount,
        providerHealthDriftRecentExecutionOldestMonthStartDate:
          healthDrift.recentExecutionOldestMonthStartDate,
        providerHealthDriftRecentExecutionPreviousMonthStartDate:
          healthDrift.recentExecutionPreviousMonthStartDate,
        providerHealthDriftStatus: healthDrift.status,
        providerRecentEventCount: recentWindow?.eventTotal || 0,
        providerRecentEventFamilyCounts: recentWindow?.eventFamilyCounts || { attention: 0, execution: 0, probe: 0 },
        providerRecentExecutionCount: recentWindow?.executionTotal || 0,
        providerRecentExecutionEstimatedCostUsdTotal: recentWindow?.executionEstimatedCostUsdTotal || 0,
        providerRecentExecutionLatestMonthlyBucketDelta:
          recentWindow?.executionLatestMonthlyBucketDelta || null,
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

  function summarizeScopedParallelActivity(filter = {}) {
    const groups = buildParallelGroupStates(filter);
    const orchestrationProfileCounts = {};
    const qualityGateStatusCounts = {
      blocked: 0,
      none: 0,
      passed: 0,
      total: groups.length,
    };
    const specialistKindCounts = Object.fromEntries(SPECIALIST_KINDS.map((kind) => [kind, 0]));
    const statusCounts = Object.fromEntries(AGENT_RUN_STATUSES.map((status) => [status, 0]));
    const touchedOrchestrationProfileIds = new Set();
    const touchedSpecialistKinds = new Set();
    let latestQualityGateViolation = null;
    let mergeRunCount = 0;
    let qualityGateBlockedCount = 0;
    let specialistRunCount = 0;

    for (const group of groups) {
      if (group.orchestrationProfile?.id) {
        orchestrationProfileCounts[group.orchestrationProfile.id] =
          (orchestrationProfileCounts[group.orchestrationProfile.id] || 0) + 1;
        touchedOrchestrationProfileIds.add(group.orchestrationProfile.id);
      }
      if (qualityGateStatusCounts[group.qualityGate?.status] !== undefined) {
        qualityGateStatusCounts[group.qualityGate.status] += 1;
      }
      if (group.qualityGate?.status === 'blocked') {
        qualityGateBlockedCount += 1;
      }
      if (
        group.qualityGate?.latestViolation &&
        (!latestQualityGateViolation || String(latestQualityGateViolation.at || '') <= String(group.qualityGate.latestViolation.at || ''))
      ) {
        latestQualityGateViolation = group.qualityGate.latestViolation;
      }

      for (const run of group.runs) {
        if (normalizeText(run.stageKind) === 'parallel-merge') {
          mergeRunCount += 1;
          continue;
        }
        if (!normalizeText(run.specialistKind)) {
          continue;
        }
        specialistRunCount += 1;
      }

      for (const run of group.latestByKind.values()) {
        const specialistKind = normalizeText(run.specialistKind);
        const status = normalizeAgentRunStatus(run.status);
        if (SPECIALIST_KINDS.includes(specialistKind)) {
          specialistKindCounts[specialistKind] += 1;
          touchedSpecialistKinds.add(specialistKind);
        }
        if (statusCounts[status] !== undefined) {
          statusCounts[status] += 1;
        }
      }
    }

    const followUpItems = buildSpecialistFollowUpItems(filter);
    const followUpSummary = summarizeSpecialistFollowUpItems(followUpItems);
    const latestParallelGroup =
      getLatestItem(
        groups.map((group) => ({
          createdAt:
            getLatestItem(
              group.runs.map((run) => ({ createdAt: run.endedAt || run.startedAt || '' })),
              'createdAt',
            )?.createdAt || '',
          id: group.parallelGroupId,
          orchestrationProfile: group.orchestrationProfile,
          qualityGate: group.qualityGate,
          requiredKinds: group.requiredKinds,
        })),
        'createdAt',
      ) || null;

    return {
      latestFollowUp: followUpSummary.latestItem,
      latestMergeRun:
        getLatestItem(
          groups
            .map((group) => group.latestMergeRun)
            .filter(Boolean),
            'endedAt',
          ) || null,
      latestOrchestrationProfile: latestParallelGroup?.orchestrationProfile || null,
      latestParallelGroup,
      mergeCompletedCount: groups.filter((group) => group.wasMerged).length,
      mergeRunCount,
      orchestrationProfileCounts,
      qualityGateBlockedCount,
      qualityGateStatusCounts,
      specialistOrchestrationProfileCount: touchedOrchestrationProfileIds.size,
      specialistFollowUpRequiredCount: followUpItems.length,
      specialistFollowUpNeedsReminderCount: followUpSummary.needsReminderCount,
      specialistFollowUpOverdueCount: followUpSummary.overdueCount,
      specialistFollowUpReminderCountTotal: followUpSummary.reminderCountTotal,
      specialistKindCounts,
      latestQualityGateViolation,
      specialistLatestReminderAt: followUpSummary.latestReminderAt,
      specialistNextReminderAt: followUpSummary.nextReminderAt,
      specialistRunCount,
      statusCounts,
      touchedOrchestrationProfileIds: [...touchedOrchestrationProfileIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      ),
      touchedSpecialistKinds: [...touchedSpecialistKinds].sort((left, right) => String(left).localeCompare(String(right))),
      totalGroupCount: groups.length,
    };
  }

  function summarizeMissionParallelActivity(missionId) {
    return summarizeScopedParallelActivity({ missionId });
  }

  function summarizeWorkspaceParallelActivity(workspaceId) {
    return summarizeScopedParallelActivity({ workspaceId });
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
    return {
      probes,
      summary: summarizeProviderProbes(probes),
    };
  }

  function getProviderProbeTimeline(filter = {}) {
    const probes = store.listProviderProbes(filter);
    const timeline = buildProviderProbeTimeline(probes);
    return {
      summary: summarizeProviderProbeTimeline(timeline),
      timeline,
    };
  }

  function getProviderExecutionHistory(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider execution since timestamp');
    const executions = buildProviderExecutionEntries({
      ...filter,
      since,
    });
    const dailyBuckets = buildProviderExecutionDailyBuckets(executions);
    return {
      executions,
      filters: {
        missionId: filter.missionId || null,
        providerId: filter.providerId || null,
        role: filter.role || null,
        since: since || null,
        status: filter.status || null,
        workspaceId: filter.workspaceId || null,
      },
      summary: {
        ...summarizeProviderExecutions(executions),
        bucketCount: dailyBuckets.length,
        dailyBuckets,
        latestBucketDate: dailyBuckets[0]?.date || null,
        latestBucketDelta: buildProviderExecutionLatestBucketDelta(dailyBuckets),
        oldestBucketDate: dailyBuckets.at(-1)?.date || null,
      },
    };
  }

  function getProviderExecutionTimeline(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider execution since timestamp');
    const executions = buildProviderExecutionEntries({
      ...filter,
      since,
    });
    const timeline = buildProviderExecutionTimeline(executions);
    return {
      filters: {
        missionId: filter.missionId || null,
        providerId: filter.providerId || null,
        role: filter.role || null,
        since: since || null,
        status: filter.status || null,
        workspaceId: filter.workspaceId || null,
      },
      summary: summarizeProviderExecutionTimeline(timeline),
      timeline,
    };
  }

  function getProviderEventTimeline(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider event since timestamp');
    const timeline = buildProviderEvents({
      ...filter,
      since,
    });
    return {
      filters: {
        attempted: typeof filter.attempted === 'boolean' ? filter.attempted : null,
        family: filter.family || null,
        missionId: filter.missionId || null,
        ok: typeof filter.ok === 'boolean' ? filter.ok : null,
        providerId: filter.providerId || null,
        role: filter.role || null,
        since: since || null,
        status: filter.status || null,
        workspaceId: filter.workspaceId || null,
      },
      summary: summarizeProviderEvents(timeline),
      timeline,
    };
  }

  function getMission(missionId) {
    const mission = store.getMission(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    return mission;
  }

  function collectRelevantMemoryEntries({ mission, workspace }) {
    return dedupeEntries([
      ...harness.listMemoryEntries({ scope: 'user', scopeId: GLOBAL_USER_SCOPE_ID }),
      ...harness.listMemoryEntries({ scope: 'workspace', scopeId: workspace.id }),
      ...harness.listMemoryEntries({ scope: 'mission', scopeId: mission.id }),
    ]);
  }

  function getParallelSpecialistKinds(mission) {
    return resolveMissionParallelPlan(mission).effectiveKinds;
  }

  function getLatestParallelGroupState(missionId) {
    const runs = store
      .loadState()
      .agentRuns.filter((run) => run.missionId === missionId && normalizeText(run.parallelGroupId));

    if (!runs.length) {
      return null;
    }

    const latestGroupById = new Map();
    for (const run of runs) {
      const groupId = normalizeText(run.parallelGroupId);
      const at = String(run.endedAt || run.startedAt || '');
      const current = latestGroupById.get(groupId);
      if (!current || String(current.at) <= at) {
        latestGroupById.set(groupId, {
          at,
          groupId,
        });
      }
    }
    const latestGroupId =
      [...latestGroupById.values()]
        .sort((left, right) => String(left.at).localeCompare(String(right.at)))
        .at(-1)?.groupId || null;
    if (!latestGroupId) {
      return null;
    }

    const groupRuns = runs.filter((run) => run.parallelGroupId === latestGroupId);
    const latestByKind = new Map();
    const mergeRuns = [];

    for (const run of groupRuns) {
      if (normalizeText(run.stageKind) === 'parallel-merge') {
        mergeRuns.push(run);
        continue;
      }

      const specialistKind = normalizeText(run.specialistKind);
      if (!specialistKind) {
        continue;
      }

      const current = latestByKind.get(specialistKind);
      const currentAt = String(current?.endedAt || current?.startedAt || '');
      const nextAt = String(run.endedAt || run.startedAt || '');
      if (!current || currentAt <= nextAt) {
        latestByKind.set(specialistKind, run);
      }
    }

    const latestMergeRun =
      [...mergeRuns].sort((left, right) =>
        String(left.endedAt || left.startedAt || '').localeCompare(String(right.endedAt || right.startedAt || '')),
      ).at(-1) || null;
    const orchestrationProfile = getLatestOrchestrationProfileMetadata(groupRuns, (run) => run.endedAt || run.startedAt || '');
    const requiredKinds = latestMergeRun?.parallelRequiredKinds?.length
      ? ensureArray(latestMergeRun.parallelRequiredKinds)
      : [...new Set(groupRuns.flatMap((run) => ensureArray(run.parallelRequiredKinds).concat(normalizeText(run.specialistKind))))]
          .filter(Boolean)
          .filter((kind) => SPECIALIST_KINDS.includes(kind));
    const latestRuns = [...latestByKind.values()];
    const qualityGate = evaluateParallelQualityGate({
      latestByKind,
      orchestrationProfile,
      requiredKinds,
    });
    const unresolvedRuns = latestRuns.filter((run) => ['blocked', 'failed'].includes(normalizeAgentRunStatus(run.status)));

    return {
      latestMergeRun,
      latestRuns,
      orchestrationProfile,
      parallelGroupId: latestGroupId,
      qualityGate,
      requiredKinds,
      unresolvedRuns,
      wasMerged: Boolean(latestMergeRun && ['completed', 'merged'].includes(normalizeAgentRunStatus(latestMergeRun.status))),
    };
  }

  function getRunArtifact(run, kind = 'deliverable') {
    const artifactId = ensureArray(run?.artifactIds)
      .map((artifactId) => store.getArtifact(artifactId))
      .filter(Boolean)
      .find((artifact) => artifact.kind === kind)?.id;

    return artifactId ? store.getArtifact(artifactId) : null;
  }

  function buildSpecialistOutputEntry(run) {
    const artifact = getRunArtifact(run);
    const artifactContent = artifact?.path && fs.existsSync(artifact.path) ? fs.readFileSync(artifact.path, 'utf8') : '';
    const specialistKind = normalizeText(run.specialistKind);
    const status = normalizeAgentRunStatus(run.status);
    const handoff =
      normalizeSpecialistHandoff(run.specialistHandoff, {
        nextAction: `Use the ${specialistKind} specialist branch in the next manager merge decision.`,
        recommendedOwner: 'workspace-owner',
        summaryText: normalizeText(run.outputSummary),
      }) ||
      buildFallbackSpecialistHandoff({
        specialistKind,
        status,
        summaryText: normalizeText(run.outputSummary),
      });

    return {
      artifactId: artifact?.id || null,
      content: artifactContent,
      handoff,
      path: artifact?.path || null,
      runId: run.id,
      specialistKind,
      status,
      summaryText: normalizeText(run.outputSummary, handoff?.currentState || ''),
    };
  }

  function finalizeMissionFailure({ mission, session, currentStage, artifactPath = null, providerId, reviewerVerdict = null }) {
    harness.updateSession(session.id, {
      currentStage,
      status: 'failed',
      endedAt: now(),
    });
    const failedMission = harness.touchMission(mission.id, 'failed');

    return {
      approval: null,
      artifactPath,
      mission: failedMission,
      provider: providerId,
      reviewerVerdict,
      session: store.getSession(session.id),
    };
  }

  function applySpecialistOutcomeDirective({ mission, parallelGroupId, requiredKinds, runStage }) {
    const directives = parseMissionConstraintDirectives(mission);
    const specialistKind = normalizeText(runStage.run.specialistKind);
    const baseStatus = normalizeAgentRunStatus(runStage.run.status);

    if (!specialistKind || !['completed', 'failed'].includes(baseStatus)) {
      return runStage;
    }

    let nextStatus = baseStatus;
    let nextSummary = runStage.run.outputSummary;
    let nextHandoff =
      normalizeSpecialistHandoff(runStage.run.specialistHandoff, {
        nextAction: `Review the ${specialistKind} specialist branch before merge.`,
        recommendedOwner: 'workspace-owner',
        summaryText: runStage.run.outputSummary,
      }) ||
      buildFallbackSpecialistHandoff({
        specialistKind,
        status: baseStatus,
        summaryText: runStage.run.outputSummary,
      });

    if (directives.specialistAbandonKinds.includes(specialistKind)) {
      nextStatus = 'abandoned';
      nextSummary = `${nextSummary} Specialist branch was intentionally abandoned for ${specialistKind}.`.trim();
    } else if (directives.specialistBlockKinds.includes(specialistKind)) {
      nextStatus = 'blocked';
      nextSummary = `${nextSummary} Specialist branch is blocked and requires follow-up for ${specialistKind}.`.trim();
    } else if (directives.specialistFailKinds.includes(specialistKind) && baseStatus !== 'failed') {
      nextStatus = 'failed';
      nextSummary = `${nextSummary} Specialist branch failed deterministic validation for ${specialistKind}.`.trim();
    }

    if (nextStatus === baseStatus && nextSummary === runStage.run.outputSummary) {
      return runStage;
    }

    nextHandoff = normalizeSpecialistHandoff(
      {
        ...nextHandoff,
        blockers:
          nextStatus === 'blocked' || nextStatus === 'failed'
            ? [...new Set([...(nextHandoff?.blockers || []), nextSummary].filter(Boolean))]
            : nextHandoff?.blockers || [],
        currentState: nextSummary,
        deliverables:
          nextStatus === 'abandoned'
            ? [...new Set([...(nextHandoff?.deliverables || []), `${specialistKind} branch was intentionally abandoned.`])]
            : nextHandoff?.deliverables || [],
        nextHandoff: {
          ...(nextHandoff?.nextHandoff || {}),
          recommendedOwner: 'workspace-owner',
          request:
            nextStatus === 'completed'
              ? `Merge the ${specialistKind} specialist artifact into the manager-controlled executor draft.`
              : `Resolve the ${specialistKind} specialist ${nextStatus} state before merge.`,
        },
      },
      {
        nextAction: `Resolve the ${specialistKind} specialist ${nextStatus} state before merge.`,
        recommendedOwner: 'workspace-owner',
        summaryText: nextSummary,
      },
    );

    const updatedRun = store.updateAgentRun(runStage.run.id, (current) => ({
      ...current,
      mergeStatus: nextStatus === 'completed' ? 'pending' : normalizeText(current.mergeStatus, 'pending'),
      outputSummary: nextSummary,
      parallelGroupId,
      parallelRequiredKinds: requiredKinds,
      specialistHandoff: nextHandoff,
      status: nextStatus,
      updatedAt: now(),
    }));

    return {
      ...runStage,
      output: runStage.output
        ? {
            ...runStage.output,
            specialistHandoff: nextHandoff,
            summaryText: nextSummary,
          }
        : runStage.output,
      run: updatedRun,
    };
  }

  function markParallelGroupBranchesMerged(parallelGroupId) {
    for (const run of store.loadState().agentRuns.filter((item) => item.parallelGroupId === parallelGroupId && item.specialistKind)) {
      if (!['completed', 'abandoned'].includes(normalizeAgentRunStatus(run.status))) {
        continue;
      }
      store.updateAgentRun(run.id, (current) => ({
        ...current,
        mergeStatus: 'merged',
      }));
    }
  }

  async function runAgentStage({
    role,
    providerRole = role,
    mission,
    workspace,
    session,
    provider,
    providerId,
    pack,
    memoryEntries,
    previousOutputs,
    runMetadata = {},
    outputFileName = null,
    outputTitle = null,
    promptFileName = null,
  }) {
    const providerInput = {
      role,
      providerRole,
      mission,
      workspace,
      pack,
      memoryEntries,
      previousOutputs,
      parallelGroupId: normalizeText(runMetadata.parallelGroupId) || null,
      parallelRequiredKinds: ensureArray(runMetadata.parallelRequiredKinds),
      resumeFromRunId: normalizeText(runMetadata.resumeFromRunId) || null,
      specialistKind: normalizeText(runMetadata.specialistKind) || null,
      specialistMergeMode: normalizeText(runMetadata.stageKind) === 'parallel-merge',
    };
    const promptContent = await provider.preparePrompt(providerInput);

    const agentRun = harness.startAgentRun({
      missionId: mission.id,
      sessionId: session.id,
      role,
      inputSummary: formatAgentInputSummary({ role, mission, providerId }),
      metadata: {
        providerId,
        workflowRole: providerRole,
        ...runMetadata,
      },
    });

    const promptArtifact = harness.writeArtifact({
      missionId: mission.id,
      sessionId: session.id,
      role,
      kind: 'prompt',
      fileName: promptFileName || `${role}-prompt.md`,
      title: `${role} prompt`,
      content: promptContent,
    });

    try {
      const providerOutput = await provider.run(providerInput);
      const normalizedOutput = provider.normalizeOutput(providerOutput, providerInput);
      const specialistHandoff =
        role === 'specialist'
          ? normalizeSpecialistHandoff(normalizedOutput.specialistHandoff, {
              nextAction: normalizedOutput.nextAction,
              recommendedOwner: 'workspace-owner',
              summaryText: normalizedOutput.summaryText,
            }) ||
            buildFallbackSpecialistHandoff({
              nextAction: normalizedOutput.nextAction,
              specialistKind: normalizeText(runMetadata.specialistKind) || 'implementation',
              status: 'completed',
              summaryText: normalizedOutput.summaryText,
            })
          : null;

      const outputArtifact = harness.writeArtifact({
        missionId: mission.id,
        sessionId: session.id,
        role,
        kind: role === 'executor' || role === 'specialist' ? 'deliverable' : 'agent-output',
        fileName: outputFileName || normalizedOutput.artifactFileName,
        title: outputTitle || normalizedOutput.artifactTitle,
        content: normalizedOutput.artifactContent,
      });

      const completedRun = harness.completeAgentRun(agentRun.id, {
        status: normalizedOutput.verdict === 'fail' ? 'failed' : 'completed',
        outputSummary: normalizedOutput.summaryText,
        artifactIds: [promptArtifact.id, outputArtifact.id],
        metadata: {
          attemptCount: Number(providerOutput?.attemptCount || 1),
          attemptHistory: normalizeProviderAttemptHistory(providerOutput?.attemptHistory),
          durationMs: normalizeTelemetryNumber(providerOutput?.durationMs),
          estimatedCostUsd: roundUsdAmount(providerOutput?.estimatedCostUsd),
          providerId,
          providerResponseId: normalizeText(providerOutput?.providerResponseId) || null,
          retryCount: Number(providerOutput?.retryCount || 0),
          usageInputTokens: normalizeTelemetryNumber(providerOutput?.usageInputTokens),
          usageOutputTokens: normalizeTelemetryNumber(providerOutput?.usageOutputTokens),
          usageTotalTokens: normalizeTelemetryNumber(providerOutput?.usageTotalTokens),
          workflowRole: providerRole,
          ...runMetadata,
          specialistHandoff,
          specialistRootRunId:
            normalizeText(runMetadata.specialistKind) && !normalizeText(runMetadata.specialistRootRunId)
              ? agentRun.id
              : runMetadata.specialistRootRunId || null,
        },
      });

      return {
        artifact: outputArtifact,
        error: null,
        promptArtifact,
        run: completedRun,
        output: normalizedOutput,
      };
    } catch (error) {
      const failure = extractProviderFailure(error);
      const failedRun = harness.completeAgentRun(agentRun.id, {
        status: 'failed',
        outputSummary: failure.message,
        artifactIds: [promptArtifact.id],
        metadata: {
          attemptCount: Number(failure.attemptCount || 1),
          attemptHistory: normalizeProviderAttemptHistory(failure.attemptHistory),
          durationMs: normalizeTelemetryNumber(failure.durationMs),
          estimatedCostUsd: roundUsdAmount(failure.estimatedCostUsd),
          failureKind: normalizeProviderFailureKind(failure.failureKind),
          httpStatus: Number.isFinite(Number(failure.httpStatus)) ? Number(failure.httpStatus) : null,
          providerId,
          providerResponseId: normalizeText(failure.providerResponseId) || null,
          rawMessage: normalizeText(failure.rawMessage) || null,
          recoverable: typeof failure.recoverable === 'boolean' ? failure.recoverable : null,
          retryCount: Number(failure.retryCount || 0),
          timedOut: Boolean(failure.timedOut),
          usageInputTokens: normalizeTelemetryNumber(failure.usageInputTokens),
          usageOutputTokens: normalizeTelemetryNumber(failure.usageOutputTokens),
          usageTotalTokens: normalizeTelemetryNumber(failure.usageTotalTokens),
          workflowRole: providerRole,
          ...runMetadata,
          specialistHandoff:
            role === 'specialist'
              ? buildFallbackSpecialistHandoff({
                  nextAction: `Resolve the ${normalizeText(runMetadata.specialistKind) || 'specialist'} branch failure before merge.`,
                  specialistKind: normalizeText(runMetadata.specialistKind) || 'implementation',
                  status: 'failed',
                  summaryText: failure.message,
                })
              : null,
          specialistRootRunId:
            normalizeText(runMetadata.specialistKind) && !normalizeText(runMetadata.specialistRootRunId)
              ? agentRun.id
              : runMetadata.specialistRootRunId || null,
        },
      });

      return {
        artifact: null,
        error: isProviderFailureError(error) ? error : error,
        promptArtifact,
        run: failedRun,
        output: null,
      };
    }
  }

  function ensureNoPendingApproval(missionId) {
    const latestSession = getLatestSession(store.listSessionsByMission(missionId));
    if (!latestSession || latestSession.status !== 'awaiting_approval') {
      return;
    }

    const pendingApproval = store
      .listApprovals({ missionId, sessionId: latestSession.id, status: 'pending' })
      .at(-1);

    if (pendingApproval) {
      throw new Error(`Mission ${missionId} is awaiting approval ${pendingApproval.id}. Resolve it before rerunning.`);
    }
  }

  async function runMission(missionId, options = {}) {
    const mission = getMission(missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const providerId = normalizeText(options.provider, 'stub');
    const explicitProviderSelection = Boolean(options.providerSpecified);
    const provider = providerRegistry.getProvider(providerId);

    if (!provider.implemented) {
      throw new Error(`Provider not implemented yet: ${providerId}. Use --provider stub for the current milestone.`);
    }

    ensureNoPendingApproval(missionId);

    const pack = getMissionPack({ mission, workspace });
    const memoryEntries = collectRelevantMemoryEntries({ mission, workspace });
    const parallelPlan = resolveMissionParallelPlan(mission);
    const parallelSpecialistKinds = parallelPlan.effectiveKinds;
    const previousParallelGroup = parallelSpecialistKinds.length >= 2 ? getLatestParallelGroupState(mission.id) : null;
    const shouldRunParallelSpecialists = parallelSpecialistKinds.length >= 2;
    const session = harness.startSession({
      missionId: mission.id,
      provider: providerId,
    });

    const previousOutputs = {};

    const managerStage = await runAgentStage({
      role: 'manager',
      mission,
      workspace,
      session,
      provider,
      providerId,
      pack,
      memoryEntries,
      previousOutputs,
    });
    if (managerStage.error) {
      return finalizeMissionFailure({
        artifactPath: null,
        currentStage: 'manager',
        mission,
        providerId,
        session,
      });
    }
    previousOutputs.manager = managerStage.output;

    harness.updateSession(session.id, {
      currentStage: 'planner',
    });

    const plannerStage = await runAgentStage({
      role: 'planner',
      mission,
      workspace,
      session,
      provider,
      providerId,
      pack,
      memoryEntries,
      previousOutputs,
    });
    if (plannerStage.error) {
      return finalizeMissionFailure({
        artifactPath: null,
        currentStage: 'planner',
        mission,
        providerId,
        session,
      });
    }
    previousOutputs.planner = plannerStage.output;
    harness.touchMission(mission.id, 'planned');

    let executorArtifactPath = null;
    let executorOutput = null;

    if (shouldRunParallelSpecialists) {
      const parallelGroupId =
        previousParallelGroup && !previousParallelGroup.wasMerged
          ? previousParallelGroup.parallelGroupId
          : createId('parallel-group');
      const unresolvedByKind = new Map(
        ensureArray(previousParallelGroup?.unresolvedRuns).map((run) => [normalizeText(run.specialistKind), run]),
      );
      const latestRunByKind = new Map(
        ensureArray(previousParallelGroup?.latestRuns).map((run) => [normalizeText(run.specialistKind), run]),
      );
      const qualityGateRerunKinds = new Set(ensureArray(previousParallelGroup?.qualityGate?.rerunKinds));
      const specialistKindsToRun =
        previousParallelGroup && !previousParallelGroup.wasMerged
          ? parallelSpecialistKinds.filter((kind) => unresolvedByKind.has(kind) || qualityGateRerunKinds.has(kind))
          : parallelSpecialistKinds;
      const completedBranchOutputs = ensureArray(previousParallelGroup?.latestRuns)
        .filter((run) => ['completed', 'abandoned'].includes(normalizeAgentRunStatus(run.status)))
        .filter((run) => !specialistKindsToRun.includes(normalizeText(run.specialistKind)))
        .map((run) => buildSpecialistOutputEntry(run));

      previousOutputs.specialists = [...completedBranchOutputs];

      harness.updateSession(session.id, {
        currentStage: 'specialist',
      });

      for (const specialistKind of specialistKindsToRun) {
        const previousBranchRun = unresolvedByKind.get(specialistKind) || latestRunByKind.get(specialistKind) || null;
        const stage = await runAgentStage({
          role: 'specialist',
          providerRole: 'executor',
          mission,
          workspace,
          session,
          provider,
          providerId,
          pack,
          memoryEntries,
          previousOutputs,
          promptFileName: `specialist-${specialistKind}-prompt.md`,
          outputFileName: `specialist-${specialistKind}-${pack.artifactFileName}`,
          outputTitle: `${specialistKind} specialist ${pack.artifactTitle}`,
          runMetadata: {
            mergeStatus: 'pending',
            orchestrationProfileDeliverableTypes: parallelPlan.orchestrationProfile?.deliverableTypes || [],
            orchestrationProfileDescription: parallelPlan.orchestrationProfile?.description || null,
            orchestrationProfileDisplayName: parallelPlan.orchestrationProfile?.displayName || null,
            orchestrationProfileId: parallelPlan.orchestrationProfile?.id || null,
            orchestrationProfileMergeOwner: parallelPlan.orchestrationProfile?.mergeOwner || null,
            orchestrationProfileMode: parallelPlan.orchestrationProfile?.mode || null,
            orchestrationProfileParallelSpecialistKinds:
              parallelPlan.orchestrationProfile?.parallelSpecialistKinds || [],
            orchestrationProfileQualityGate: parallelPlan.orchestrationProfile?.qualityGate || null,
            orchestrationProfileRetryPolicy: parallelPlan.orchestrationProfile?.retryPolicy || null,
            orchestrationProfileSource: parallelPlan.source,
            parallelGroupId,
            parallelRequiredKinds: parallelSpecialistKinds,
            parentRunId: plannerStage.run.id,
            resumeFromRunId: previousBranchRun?.id || null,
            specialistKind,
            specialistRootRunId: previousBranchRun?.specialistRootRunId || previousBranchRun?.id || null,
            stageKind: 'specialist-branch',
          },
        });
        const normalizedStage = applySpecialistOutcomeDirective({
          mission,
          parallelGroupId,
          requiredKinds: parallelSpecialistKinds,
          runStage: stage,
        });
        if (['completed', 'abandoned'].includes(normalizeAgentRunStatus(normalizedStage.run.status))) {
          previousOutputs.specialists.push(buildSpecialistOutputEntry(normalizedStage.run));
        }
      }

      const latestParallelGroup = getLatestParallelGroupState(mission.id);
      const unresolvedRuns = ensureArray(latestParallelGroup?.unresolvedRuns);
      const qualityGateRerunCount = Number(latestParallelGroup?.qualityGate?.rerunKinds?.length || 0);
      if (unresolvedRuns.length || qualityGateRerunCount > 0) {
        return finalizeMissionFailure({
          artifactPath: previousOutputs.specialists.at(-1)?.path || null,
          currentStage: 'specialist',
          mission,
          providerId,
          session,
        });
      }

      previousOutputs.specialists = ensureArray(latestParallelGroup?.latestRuns)
        .filter((run) => ['completed', 'abandoned'].includes(normalizeAgentRunStatus(run.status)))
        .map((run) => buildSpecialistOutputEntry(run));
      previousOutputs.specialistMergeMode = true;

      harness.updateSession(session.id, {
        currentStage: 'executor',
      });

      const executorStage = await runAgentStage({
        role: 'executor',
        mission,
        workspace,
        session,
        provider,
        providerId,
        pack,
        memoryEntries,
        previousOutputs,
        runMetadata: {
          mergeStatus: 'merged',
          orchestrationProfileDeliverableTypes: parallelPlan.orchestrationProfile?.deliverableTypes || [],
          orchestrationProfileDescription: parallelPlan.orchestrationProfile?.description || null,
          orchestrationProfileDisplayName: parallelPlan.orchestrationProfile?.displayName || null,
          orchestrationProfileId: parallelPlan.orchestrationProfile?.id || null,
          orchestrationProfileMergeOwner: parallelPlan.orchestrationProfile?.mergeOwner || null,
          orchestrationProfileMode: parallelPlan.orchestrationProfile?.mode || null,
          orchestrationProfileParallelSpecialistKinds: parallelPlan.orchestrationProfile?.parallelSpecialistKinds || [],
          orchestrationProfileQualityGate: parallelPlan.orchestrationProfile?.qualityGate || null,
          orchestrationProfileRetryPolicy: parallelPlan.orchestrationProfile?.retryPolicy || null,
          orchestrationProfileSource: parallelPlan.source,
          parallelGroupId,
          parallelRequiredKinds: parallelSpecialistKinds,
          parentRunId: plannerStage.run.id,
          stageKind: 'parallel-merge',
        },
      });
      if (executorStage.error) {
        return finalizeMissionFailure({
          artifactPath: null,
          currentStage: 'executor',
          mission,
          providerId,
          session,
        });
      }

      markParallelGroupBranchesMerged(parallelGroupId);
      executorArtifactPath = executorStage.artifact.path;
      executorOutput = executorStage.output;
      previousOutputs.executor = executorStage.output;
    } else {
      harness.updateSession(session.id, {
        currentStage: 'executor',
      });

      const executorStage = await runAgentStage({
        role: 'executor',
        mission,
        workspace,
        session,
        provider,
        providerId,
        pack,
        memoryEntries,
        previousOutputs,
      });
      if (executorStage.error) {
        return finalizeMissionFailure({
          artifactPath: null,
          currentStage: 'executor',
          mission,
          providerId,
          session,
        });
      }

      executorArtifactPath = executorStage.artifact.path;
      executorOutput = executorStage.output;
      previousOutputs.executor = executorStage.output;
    }

    harness.touchMission(mission.id, 'executing');

    harness.updateSession(session.id, {
      currentStage: 'reviewer',
    });

    const reviewerStage = await runAgentStage({
      role: 'reviewer',
      mission,
      workspace,
      session,
      provider,
      providerId,
      pack,
      memoryEntries,
      previousOutputs,
    });
    if (reviewerStage.error) {
      return finalizeMissionFailure({
        artifactPath: executorArtifactPath,
        currentStage: 'reviewer',
        mission,
        providerId,
        session,
      });
    }
    previousOutputs.reviewer = reviewerStage.output;

    if (reviewerStage.output.verdict === 'fail') {
      createReviewerFollowUpRecord({
        actionClass: 'retry-ready',
        actionId: `reviewer-follow-up:${mission.id}:${session.id}`,
        actionType: 'reviewer-follow-up',
        createdAt: reviewerStage.artifact.createdAt || now(),
        deliverableType: mission.deliverableType,
        findings: reviewerStage.output.findings,
        missionId: mission.id,
        missionStatus: 'failed',
        missionTitle: mission.title,
        mode: mission.mode,
        reason: reviewerStage.run.outputSummary,
        reportPath: reviewerStage.artifact.path,
        requestedByRole: 'reviewer',
        resolutionNote: '',
        resolvedAt: null,
        sessionId: session.id,
        sessionStatus: 'failed',
        status: 'open',
      title: `Reviewer follow-up required for ${mission.title}`,
      updatedAt: reviewerStage.artifact.createdAt || now(),
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      resolutionKind: '',
    });

      harness.addMemoryEntry({
        scope: 'mission',
        scopeId: mission.id,
        kind: 'fact',
        content: formatReviewerFailureMemory({
          mission,
          findings: reviewerStage.output.findings,
        }),
      });

      harness.updateSession(session.id, {
        currentStage: 'reviewer',
        status: 'failed',
        endedAt: now(),
      });
      const failedMission = harness.touchMission(mission.id, 'failed');
      const failedSession = store.getSession(session.id);

      return {
        approval: null,
        artifactPath: executorArtifactPath,
        mission: failedMission,
        provider: providerId,
        reviewerVerdict: reviewerStage.output.verdict,
        session: failedSession,
      };
    }

    harness.touchMission(mission.id, 'reviewed');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'reviewed',
    });

    const risk = harness.classifyRisk({
      providerId,
      explicitProviderSelection,
      executorOutput,
    });

    if (risk.approvalRequired) {
      const approval = harness.createApproval({
        missionId: mission.id,
        sessionId: session.id,
        requestedByRole: 'reviewer',
        kind: risk.kind,
        title: risk.title,
        reason: risk.reason,
      });

      const awaitingMission = harness.touchMission(mission.id, 'awaiting_approval');
      harness.updateSession(session.id, {
        currentStage: 'reviewer',
        status: 'awaiting_approval',
      });

      return {
        approval,
        artifactPath: executorArtifactPath,
        mission: awaitingMission,
        provider: providerId,
        reviewerVerdict: reviewerStage.output.verdict,
        session: store.getSession(session.id),
      };
    }

    const completedMission = harness.touchMission(mission.id, 'completed');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'completed',
      endedAt: now(),
    });

    return {
      approval: null,
      artifactPath: executorArtifactPath,
      mission: completedMission,
      provider: providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
    };
  }

  function summarizeSession(session, missionId) {
    const agentRuns = store.listAgentRunsBySession(session.id);
    const approvals = store.listApprovals({ missionId, sessionId: session.id });
    const artifacts = store.listArtifactsBySession(session.id);
    const latestApproval = getLatestItem(approvals, 'createdAt');
    const latestArtifact = getLatestItem(artifacts, 'createdAt');
    const reviewerRun = agentRuns.find((run) => run.role === 'reviewer') || null;

    return {
      agentRunCount: agentRuns.length,
      approvalCount: approvals.length,
      currentStage: session.currentStage,
      endedAt: session.endedAt,
      id: session.id,
      latestApprovalStatus: latestApproval ? latestApproval.status : null,
      latestArtifactFileName: latestArtifact ? latestArtifact.fileName : null,
      provider: session.provider,
      reviewerStatus: reviewerRun ? reviewerRun.status : null,
      reviewerSummary: reviewerRun ? reviewerRun.outputSummary : null,
      startedAt: session.startedAt,
      status: session.status,
    };
  }

  function summarizeMission(mission, filter = {}) {
    const parallelPlan = resolveMissionParallelPlan(mission);
    const sessions = listSessions(mission.id);
    const approvals = store.listApprovals({ missionId: mission.id });
    const escalations = store.listEscalations({ missionId: mission.id });
    const providerActivity = summarizeMissionProviderActivity(mission.id);
    const providerRecentWindow = buildScopedProviderRecentWindow({
      missionId: mission.id,
      since: filter.providerSince,
    });
    const parallelActivity = summarizeMissionParallelActivity(mission.id);
    const maintenanceSummary = summarizeMaintenanceRuns(store.listMaintenanceRuns({ missionId: mission.id }));
    const maintenancePressureSummary = summarizeMaintenancePressure(listMaintenancePressureEntries({ missionId: mission.id }));
    const maintenanceImpactSummary = summarizeMissionMaintenanceImpact(mission.id);
    const relatedMaintenanceRuns = listRelatedMaintenanceRunsForMission(mission.id);
    const latestRelatedMaintenanceRun = getLatestItem(relatedMaintenanceRuns, 'createdAt');
    const memoryEntries = store.listMemoryEntries({ scope: 'mission', scopeId: mission.id });
    const latestSession = sessions.at(-1) || null;
    const escalationSummary = summarizeEscalations(escalations);
    const missionQualityGate = parallelActivity.latestParallelGroup?.qualityGate || {
      latestViolation: null,
      qualityGate: parallelPlan.orchestrationProfile?.qualityGate || null,
      requiredKinds: getOrchestrationQualityGateRequiredKinds(
        parallelPlan.orchestrationProfile,
        parallelPlan.effectiveKinds,
      ),
      status: parallelPlan.orchestrationProfile ? 'pending' : 'none',
      violationCount: 0,
      violations: [],
    };
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });

    return {
      approvalCounts: {
        approved: approvals.filter((approval) => approval.status === 'approved').length,
        pending: approvals.filter((approval) => approval.status === 'pending').length,
        rejected: approvals.filter((approval) => approval.status === 'rejected').length,
        total: approvals.length,
      },
      escalationCounts: escalationSummary.statusCounts,
      escalationBreachCountTotal: escalationSummary.breachCountTotal,
      escalationLatestOwnerHandoffAt: escalationSummary.latestOwnerHandoffAt,
      escalationLatestOwnerHandoffReminderAt: escalationSummary.latestOwnerHandoffReminderAt,
      escalationLatestReminderAt: escalationSummary.latestReminderAt,
      escalationLatestOwnerEscalatedAt: escalationSummary.latestOwnerEscalatedAt,
      escalationNeedsReminderCount: escalationSummary.needsReminderCount,
      escalationNextPendingOwnerHandoffDueAt: escalationSummary.nextPendingOwnerHandoffDueAt,
      escalationNextPendingOwnerHandoffReminderAt: escalationSummary.nextPendingOwnerHandoffReminderAt,
      escalationOwnerHandoffCountTotal: escalationSummary.ownerHandoffCountTotal,
      escalationOwnerHandoffReminderCountTotal: escalationSummary.ownerHandoffReminderCountTotal,
      escalationOwnerTransitionCountTotal: escalationSummary.ownerTransitionCountTotal,
      escalationPendingOwnerHandoffCount: escalationSummary.pendingOwnerHandoffCount,
      escalationPendingOwnerHandoffNeedsReminderCount: escalationSummary.pendingOwnerHandoffNeedsReminderCount,
      escalationPendingOwnerHandoffOverdueCount: escalationSummary.pendingOwnerHandoffOverdueCount,
      escalationReminderCountTotal: escalationSummary.reminderCountTotal,
      escalationTierCounts: escalationSummary.tierCounts,
      id: mission.id,
      latestEscalation: escalationSummary.latestEscalation,
      latestMaintenanceImpactRun: maintenanceImpactSummary.latestRun,
      latestMaintenanceImpactRunAt: maintenanceImpactSummary.latestRunAt,
      latestRelatedMaintenanceRun,
      latestRelatedMaintenanceRunAt: latestRelatedMaintenanceRun?.createdAt || null,
      latestMaintenanceRequiredAction: maintenancePressureSummary.latestRequiredAction,
      latestMaintenanceRequiredActionAt: maintenancePressureSummary.latestRequiredActionAt,
      latestMaintenanceRun: maintenanceSummary.latestRun,
      latestMaintenanceRunAt: maintenanceSummary.latestRunAt,
      latestSession,
      maintenanceAcknowledgedMaintenanceRequiredCountTotal:
        maintenanceSummary.acknowledgedMaintenanceRequiredCountTotal,
      maintenanceDueCandidateCountTotal: maintenanceSummary.dueCandidateCountTotal,
      maintenanceEscalationRemindedCountTotal: maintenanceSummary.escalationRemindedCountTotal,
      maintenanceImpactEscalationRemindedCountTotal: maintenanceImpactSummary.escalationRemindedCountTotal,
      maintenanceImpactOwnerHandoffRemindedCountTotal: maintenanceImpactSummary.ownerHandoffRemindedCountTotal,
      maintenanceImpactProviderAttentionRemindedCountTotal:
        maintenanceImpactSummary.providerAttentionRemindedCountTotal,
      maintenanceImpactSpecialistFollowUpRemindedCountTotal:
        maintenanceImpactSummary.specialistFollowUpRemindedCountTotal,
      maintenanceImpactRunCount: maintenanceImpactSummary.runCount,
      maintenanceImpactTotalRemindedCount: maintenanceImpactSummary.totalRemindedCount,
      maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
      maintenanceResolvedMaintenanceRequiredCountTotal:
        maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
      maintenanceRemainingMaintenanceRequiredCountTotal:
        maintenanceSummary.remainingMaintenanceRequiredCountTotal,
      maintenanceRelatedRunCount: relatedMaintenanceRuns.length,
      maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
      maintenanceProviderAttentionRemindedCountTotal: maintenanceSummary.providerAttentionRemindedCountTotal,
      maintenanceSpecialistFollowUpRemindedCountTotal: maintenanceSummary.specialistFollowUpRemindedCountTotal,
      maintenanceRunCount: maintenanceSummary.runCount,
      maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
      maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
      maintenanceCurrentDueSpecialistFollowUpCountTotal:
        maintenancePressureSummary.currentDueSpecialistFollowUpCountTotal,
      maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
      memoryCounts: {
        decision: memoryEntries.filter((entry) => entry.kind === 'decision').length,
        fact: memoryEntries.filter((entry) => entry.kind === 'fact').length,
        preference: memoryEntries.filter((entry) => entry.kind === 'preference').length,
        total: memoryEntries.length,
      },
      latestProviderAttentionAcknowledgement: providerActivity.latestAttentionAcknowledgement,
      latestProviderAttentionRecovery: providerActivity.latestAttentionRecovery,
      latestProviderAttentionReminder: providerActivity.latestAttentionReminder,
      latestProviderAttentionRequiredEvent: providerActivity.latestAttentionRequiredEvent,
      latestProviderAttentionResolution: providerActivity.latestAttentionResolution,
      latestProviderExecution: providerActivity.latestExecution,
      latestProviderExecutionEvent: providerActivity.latestExecutionEvent,
      latestFailedProviderExecution: providerActivity.latestFailedExecution,
      latestRecentProviderEvent: providerRecentWindow?.latestEvent || null,
      latestRecentProviderExecution: providerRecentWindow?.latestExecution || null,
      latestSuccessfulProviderExecution: providerActivity.latestSuccessfulExecution,
      providerAttentionAcknowledgedCount: providerActivity.summary.attentionAcknowledgedCount,
      providerAttentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      providerAttentionNextReminderAt: providerActivity.summary.attentionNextReminderAt,
      providerAttentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      providerAttentionAttemptHistoryEntryCountTotal: providerActivity.summary.attentionAttemptHistoryEntryCountTotal,
      providerAttentionMaxAttemptCount: providerActivity.summary.attentionMaxAttemptCount,
      providerAttentionMultiAttemptCount: providerActivity.summary.attentionMultiAttemptCount,
      providerAttentionReminderCount: providerActivity.summary.attentionReminderCount,
      providerAttentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      providerAttentionRecoveredCount: providerActivity.summary.attentionRecoveredCount,
      providerAttentionResolvedCount: providerActivity.summary.attentionResolvedCount,
      providerAttentionStatusCounts: providerActivity.summary.attentionStatusCounts,
      providerAttentionTotalAttemptCount: providerActivity.summary.attentionTotalAttemptCount,
      providerAttentionTotalRetryCount: providerActivity.summary.attentionTotalRetryCount,
      providerEventCount: providerActivity.summary.eventCount,
      providerEventFamilyCounts: providerActivity.summary.eventFamilyCounts,
      providerRecentEventCount: providerRecentWindow?.eventCount || 0,
      providerRecentEventFamilyCounts:
        providerRecentWindow?.eventFamilyCounts || { attention: 0, execution: 0, probe: 0 },
      providerRecentExecutionCount: providerRecentWindow?.executionCount || 0,
      providerRecentExecutionEstimatedCostUsdTotal: providerRecentWindow?.executionEstimatedCostUsdTotal || 0,
      providerRecentExecutionLatestMonthlyBucketDelta:
        providerRecentWindow?.executionLatestMonthlyBucketDelta || null,
      providerRecentExecutionLatestMonthlyBucketStartDate:
        providerRecentWindow?.executionLatestMonthlyBucketStartDate || null,
      providerRecentExecutionMonthlyBucketCount: providerRecentWindow?.executionMonthlyBucketCount || 0,
      providerRecentExecutionOldestMonthlyBucketStartDate:
        providerRecentWindow?.executionOldestMonthlyBucketStartDate || null,
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
      providerRecentSince: filter.providerSince || null,
      providerRecentTouchedProviderCount: providerRecentWindow?.touchedProviderCount || 0,
      providerRecentTouchedProviderIds: providerRecentWindow?.touchedProviderIds || [],
      providerExecutionAverageDurationMs: providerActivity.summary.executionAverageDurationMs,
      providerExecutionCompletedCount: providerActivity.summary.executionCompletedCount,
      providerExecutionCount: providerActivity.summary.executionCount,
      providerExecutionFailureKindCounts: providerActivity.summary.executionFailureKindCounts,
      providerExecutionFailedCount: providerActivity.summary.executionFailedCount,
      providerExecutionAttemptHistoryEntryCountTotal: providerActivity.summary.executionAttemptHistoryEntryCountTotal,
      providerExecutionMaxDurationMs: providerActivity.summary.executionMaxDurationMs,
      providerExecutionMaxAttemptCount: providerActivity.summary.executionMaxAttemptCount,
      providerExecutionMultiAttemptCount: providerActivity.summary.executionMultiAttemptCount,
      providerExecutionRetryableFailureCount: providerActivity.summary.executionRetryableFailureCount,
      providerExecutionRetrySucceededCount: providerActivity.summary.executionRetrySucceededCount,
      providerExecutionTotalAttemptCount: providerActivity.summary.executionTotalAttemptCount,
      providerExecutionTotalDurationMs: providerActivity.summary.executionTotalDurationMs,
      providerExecutionTotalRetryCount: providerActivity.summary.executionTotalRetryCount,
      providerExecutionTimedOutFailureCount: providerActivity.summary.executionTimedOutFailureCount,
      providerExecutionEstimatedCostUsdAverage: providerActivity.summary.executionEstimatedCostUsdAverage,
      providerExecutionEstimatedCostUsdByProviderId: providerActivity.summary.executionEstimatedCostUsdByProviderId,
      providerExecutionEstimatedCostUsdByRole: providerActivity.summary.executionEstimatedCostUsdByRole,
      providerExecutionEstimatedCostUsdMax: providerActivity.summary.executionEstimatedCostUsdMax,
      providerExecutionEstimatedCostUsdPricedCount: providerActivity.summary.executionEstimatedCostUsdPricedCount,
      providerExecutionEstimatedCostUsdTotal: providerActivity.summary.executionEstimatedCostUsdTotal,
      providerExecutionUsageInputTokensTotal: providerActivity.summary.usageInputTokensTotal,
      providerExecutionUsageOutputTokensTotal: providerActivity.summary.usageOutputTokensTotal,
      providerExecutionUsageTotalTokensTotal: providerActivity.summary.usageTotalTokensTotal,
      specialistFollowUpRequiredCount: parallelActivity.specialistFollowUpRequiredCount,
      specialistFollowUpNeedsReminderCount: parallelActivity.specialistFollowUpNeedsReminderCount,
      specialistFollowUpOverdueCount: parallelActivity.specialistFollowUpOverdueCount,
      specialistFollowUpReminderCountTotal: parallelActivity.specialistFollowUpReminderCountTotal,
      specialistConfiguredKinds: parallelPlan.effectiveKinds,
      specialistKindCounts: parallelActivity.specialistKindCounts,
      specialistLatestQualityGateViolation: parallelActivity.latestQualityGateViolation,
      specialistLatestOrchestrationProfile: parallelActivity.latestOrchestrationProfile,
      specialistLatestFollowUp: parallelActivity.latestFollowUp,
      specialistLatestReminderAt: parallelActivity.specialistLatestReminderAt,
      specialistLatestMergeRun: parallelActivity.latestMergeRun,
      specialistLatestParallelGroup: parallelActivity.latestParallelGroup,
      specialistMergeCompletedCount: parallelActivity.mergeCompletedCount,
      specialistMergeRunCount: parallelActivity.mergeRunCount,
      specialistNextReminderAt: parallelActivity.specialistNextReminderAt,
      specialistQualityGate: missionQualityGate.qualityGate,
      specialistQualityGateBlockedCount: parallelActivity.qualityGateBlockedCount,
      specialistQualityGateRequiredKinds: missionQualityGate.requiredKinds,
      specialistQualityGateStatus: missionQualityGate.status,
      specialistQualityGateStatusCounts: parallelActivity.qualityGateStatusCounts,
      specialistQualityGateViolationCount: missionQualityGate.violationCount,
      specialistOrchestrationProfileCounts: parallelActivity.orchestrationProfileCounts,
      specialistOrchestrationProfileCount: parallelActivity.specialistOrchestrationProfileCount,
      specialistOrchestrationProfileDeliverableTypes: parallelPlan.orchestrationProfile?.deliverableTypes || [],
      specialistOrchestrationProfileDescription: parallelPlan.orchestrationProfile?.description || null,
      specialistOrchestrationProfileDisplayName: parallelPlan.orchestrationProfile?.displayName || null,
      specialistOrchestrationProfileId: parallelPlan.orchestrationProfile?.id || null,
      specialistOrchestrationProfileMergeOwner: parallelPlan.orchestrationProfile?.mergeOwner || null,
      specialistOrchestrationProfileMode: parallelPlan.orchestrationProfile?.mode || null,
      specialistOrchestrationProfilePresetKinds: parallelPlan.orchestrationProfile?.parallelSpecialistKinds || [],
      specialistOrchestrationProfileQualityGate: parallelPlan.orchestrationProfile?.qualityGate || null,
      specialistOrchestrationProfileRetryPolicy: parallelPlan.orchestrationProfile?.retryPolicy || null,
      specialistOrchestrationProfileSource: parallelPlan.source,
      specialistRunCount: parallelActivity.specialistRunCount,
      specialistStatusCounts: parallelActivity.statusCounts,
      specialistTouchedOrchestrationProfileIds: parallelActivity.touchedOrchestrationProfileIds,
      specialistTouchedKinds: parallelActivity.touchedSpecialistKinds,
      specialistTotalGroupCount: parallelActivity.totalGroupCount,
      providerTouchedCount: providerActivity.summary.touchedProviderCount,
      providerTouchedIds: providerActivity.summary.touchedProviderIds,
      sessionCount: sessions.length,
      status: mission.status,
      updatedAt: mission.updatedAt,
    };
  }

  function listMissionSummariesByWorkspace(workspaceId) {
    return store
      .listMissions()
      .filter((mission) => mission.workspaceId === workspaceId)
      .map((mission) => ({
        mission,
        summary: summarizeMission(mission),
      }))
      .sort((left, right) => String(left.mission.updatedAt || '').localeCompare(String(right.mission.updatedAt || '')));
  }

  function listRelatedMaintenanceRunsForMission(missionId) {
    return store
      .listMaintenanceRuns()
      .filter((item) => item.missionId === missionId || ensureArray(item.affectedMissionIds).includes(missionId));
  }

  function listMaintenanceRunsForWorkspaceImpact(workspaceId) {
    const missionIds = new Set(
      store
        .listMissions()
        .filter((mission) => mission.workspaceId === workspaceId)
        .map((mission) => mission.id),
    );

    return store.listMaintenanceRuns().filter((item) => {
      if (item.workspaceId === workspaceId) {
        return true;
      }
      if (item.missionId && missionIds.has(item.missionId)) {
        return true;
      }
      return ensureArray(item.affectedMissionIds).some((missionId) => missionIds.has(missionId));
    });
  }

  function listMaintenanceOverviewRuns(filter = {}) {
    let items;

    if (filter.missionId) {
      const mission = getMission(filter.missionId);

      if (filter.workspaceId && mission.workspaceId !== filter.workspaceId) {
        return [];
      }

      items = listRelatedMaintenanceRunsForMission(mission.id);
    } else if (filter.workspaceId) {
      items = listMaintenanceRunsForWorkspaceImpact(filter.workspaceId);
    } else {
      items = store.listMaintenanceRuns();
    }

    return items.filter((item) => {
      if (filter.owner && item.owner !== filter.owner) {
        return false;
      }
      if (filter.since && String(item.createdAt || '') < filter.since) {
        return false;
      }
      if (!filter.outcome) {
        return true;
      }
      if (filter.outcome === 'effective') {
        return isMaintenanceRunEffective(item);
      }
      if (filter.outcome === 'no-op') {
        return !isMaintenanceRunEffective(item);
      }
      if (filter.outcome === 'impactful') {
        return isMaintenanceRunImpactful(item);
      }
      return true;
    });
  }

  function getMaintenanceMissionEffect(item, missionId) {
    return ensureArray(item.affectedMissionSummaries).find((entry) => entry.missionId === missionId) || null;
  }

function summarizeMissionMaintenanceImpact(missionId, runs = null) {
  const effectiveRuns = runs || listRelatedMaintenanceRunsForMission(missionId);
  let escalationRemindedCountTotal = 0;
  let latestRun = null;
  let latestRunAt = null;
  let ownerHandoffRemindedCountTotal = 0;
  let providerAttentionRemindedCountTotal = 0;
  let specialistFollowUpRemindedCountTotal = 0;
  let totalRemindedCount = 0;

    for (const run of effectiveRuns) {
      const isDirectMissionRun = run.missionId === missionId;
      const effect = isDirectMissionRun
        ? {
            escalationRemindedCount: Number(run.escalationRemindedCount || 0),
            ownerHandoffRemindedCount: Number(run.ownerHandoffRemindedCount || 0),
            providerAttentionRemindedCount: Number(run.providerAttentionRemindedCount || 0),
            specialistFollowUpRemindedCount: Number(run.specialistFollowUpRemindedCount || 0),
            totalRemindedCount: Number(run.totalRemindedCount || 0),
          }
        : getMaintenanceMissionEffect(run, missionId) || {
            escalationRemindedCount: 0,
            ownerHandoffRemindedCount: 0,
            providerAttentionRemindedCount: 0,
            specialistFollowUpRemindedCount: 0,
            totalRemindedCount: 0,
          };

      escalationRemindedCountTotal += Number(effect.escalationRemindedCount || 0);
      ownerHandoffRemindedCountTotal += Number(effect.ownerHandoffRemindedCount || 0);
      providerAttentionRemindedCountTotal += Number(effect.providerAttentionRemindedCount || 0);
      specialistFollowUpRemindedCountTotal += Number(effect.specialistFollowUpRemindedCount || 0);
      totalRemindedCount += Number(effect.totalRemindedCount || 0);

      if (!latestRunAt || String(latestRunAt) < String(run.createdAt || '')) {
        latestRunAt = run.createdAt || null;
        latestRun = run;
      }
    }

    return {
      escalationRemindedCountTotal,
      latestRun,
      latestRunAt,
      ownerHandoffRemindedCountTotal,
      providerAttentionRemindedCountTotal,
      specialistFollowUpRemindedCountTotal,
      runCount: effectiveRuns.length,
      totalRemindedCount,
    };
  }

  function getWorkspaceOverview(workspaceId, filter = {}) {
    const workspace = getWorkspace(workspaceId);
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'workspace provider since timestamp');
    syncEscalations({ workspaceId: workspace.id });
    const missionEntries = listMissionSummariesByWorkspace(workspace.id);
    const providerActivity = summarizeWorkspaceProviderActivity(workspace.id);
    const providerRecentWindow = buildScopedProviderRecentWindow({
      since: providerSince,
      workspaceId: workspace.id,
    });
    const parallelActivity = summarizeWorkspaceParallelActivity(workspace.id);
    const maintenanceRuns = listMaintenanceRunsForWorkspaceImpact(workspace.id);
    const maintenanceSummary = summarizeMaintenanceRuns(maintenanceRuns);
    const maintenanceImpactSummary = summarizeMaintenanceImpact(
      maintenanceRuns,
      missionEntries.map((entry) => entry.mission.id),
    );
    const maintenancePressureSummary = summarizeMaintenancePressure(listMaintenancePressureEntries({ workspaceId: workspace.id }));
    const escalations = store.listEscalations({ workspaceId: workspace.id }).map((item) => enrichEscalation(item));
    const escalationSummary = summarizeEscalations(escalations);
    const workspaceMemoryEntries = store.listMemoryEntries({ scope: 'workspace', scopeId: workspace.id });
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });
    const missionCounts = Object.fromEntries(MISSION_STATUSES.map((status) => [status, 0]));
    const approvalCounts = { approved: 0, pending: 0, rejected: 0, total: 0 };
    const memoryCounts = {
      workspaceScoped: workspaceMemoryEntries.length,
      missionScoped: 0,
      total: workspaceMemoryEntries.length,
    };

    for (const entry of missionEntries) {
      missionCounts[entry.mission.status] += 1;
      approvalCounts.approved += entry.summary.approvalCounts.approved;
      approvalCounts.pending += entry.summary.approvalCounts.pending;
      approvalCounts.rejected += entry.summary.approvalCounts.rejected;
      approvalCounts.total += entry.summary.approvalCounts.total;
      memoryCounts.missionScoped += entry.summary.memoryCounts.total;
      memoryCounts.total += entry.summary.memoryCounts.total;
    }

    const latestMissionEntry = missionEntries.at(-1) || null;

    return {
      escalations,
      missions: missionEntries,
      providerHealthDrift,
      providerRecentWindow,
      summary: {
        activeMissionIds: missionEntries
          .filter((entry) => !['completed', 'failed'].includes(entry.mission.status))
          .map((entry) => entry.mission.id),
        approvalCounts,
        escalationCounts: escalationSummary.statusCounts,
        escalationBreachCountTotal: escalationSummary.breachCountTotal,
        escalationLatestOwnerHandoffAt: escalationSummary.latestOwnerHandoffAt,
        escalationLatestOwnerHandoffReminderAt: escalationSummary.latestOwnerHandoffReminderAt,
        escalationLatestReminderAt: escalationSummary.latestReminderAt,
        escalationLatestOwnerEscalatedAt: escalationSummary.latestOwnerEscalatedAt,
        escalationNeedsReminderCount: escalationSummary.needsReminderCount,
        escalationNextPendingOwnerHandoffDueAt: escalationSummary.nextPendingOwnerHandoffDueAt,
        escalationNextPendingOwnerHandoffReminderAt: escalationSummary.nextPendingOwnerHandoffReminderAt,
        escalationOwnerHandoffCountTotal: escalationSummary.ownerHandoffCountTotal,
        escalationOwnerHandoffReminderCountTotal: escalationSummary.ownerHandoffReminderCountTotal,
        escalationOwnerTransitionCountTotal: escalationSummary.ownerTransitionCountTotal,
        escalationPendingOwnerHandoffCount: escalationSummary.pendingOwnerHandoffCount,
        escalationPendingOwnerHandoffNeedsReminderCount: escalationSummary.pendingOwnerHandoffNeedsReminderCount,
        escalationPendingOwnerHandoffOverdueCount: escalationSummary.pendingOwnerHandoffOverdueCount,
        escalationReminderCountTotal: escalationSummary.reminderCountTotal,
        escalationTierCounts: escalationSummary.tierCounts,
        latestEscalation: escalationSummary.latestEscalation,
        latestMaintenanceImpactRun: maintenanceImpactSummary.latestImpactRun,
        latestMaintenanceImpactRunAt: maintenanceImpactSummary.latestImpactRunAt,
        latestMaintenanceImpactAffectedMissionIds: maintenanceImpactSummary.latestImpactAffectedMissionIds,
        latestMaintenanceRun: maintenanceSummary.latestRun,
        latestMaintenanceRequiredAction: maintenancePressureSummary.latestRequiredAction,
        latestMission: latestMissionEntry
          ? {
              mission: latestMissionEntry.mission,
              summary: latestMissionEntry.summary,
            }
          : null,
        latestMaintenanceRunAt: maintenanceSummary.latestRunAt,
        latestMaintenanceRequiredActionAt: maintenancePressureSummary.latestRequiredActionAt,
        maintenanceAcknowledgedMaintenanceRequiredCountTotal:
          maintenanceSummary.acknowledgedMaintenanceRequiredCountTotal,
        maintenanceAffectedMissionCount: maintenanceImpactSummary.affectedMissionCount,
        maintenanceAffectedMissionIds: maintenanceImpactSummary.affectedMissionIds,
        maintenanceDueCandidateCountTotal: maintenanceSummary.dueCandidateCountTotal,
        maintenanceEscalationRemindedCountTotal: maintenanceSummary.escalationRemindedCountTotal,
        maintenanceDueWorkspaceIds: maintenancePressureSummary.maintenanceDueWorkspaceIds,
        maintenanceCurrentDueProviderAttentionCountTotal: maintenancePressureSummary.currentDueProviderAttentionCountTotal,
        maintenanceCurrentDueSpecialistFollowUpCountTotal:
          maintenancePressureSummary.currentDueSpecialistFollowUpCountTotal,
        maintenanceResolvedMaintenanceRequiredCountTotal:
          maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
        maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
        maintenanceRemainingMaintenanceRequiredCountTotal:
          maintenanceSummary.remainingMaintenanceRequiredCountTotal,
        maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
        maintenanceProviderAttentionRemindedCountTotal: maintenanceSummary.providerAttentionRemindedCountTotal,
        maintenanceSpecialistFollowUpRemindedCountTotal: maintenanceSummary.specialistFollowUpRemindedCountTotal,
        maintenanceRunCount: maintenanceSummary.runCount,
        maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
        maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
        maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
        memoryCounts,
        latestProviderAttentionAcknowledgement: providerActivity.latestAttentionAcknowledgement,
        latestProviderAttentionRecovery: providerActivity.latestAttentionRecovery,
        latestProviderAttentionReminder: providerActivity.latestAttentionReminder,
        latestProviderAttentionRequiredEvent: providerActivity.latestAttentionRequiredEvent,
        latestProviderAttentionResolution: providerActivity.latestAttentionResolution,
        latestProviderExecution: providerActivity.latestExecution,
        latestProviderExecutionEvent: providerActivity.latestExecutionEvent,
        latestFailedProviderExecution: providerActivity.latestFailedExecution,
        latestRecentProviderEvent: providerRecentWindow?.latestEvent || null,
        latestRecentProviderExecution: providerRecentWindow?.latestExecution || null,
        latestSuccessfulProviderExecution: providerActivity.latestSuccessfulExecution,
        missionCount: missionEntries.length,
        missionCounts,
        openEscalationIds: escalationSummary.openEscalationIds,
        providerAttentionAcknowledgedCount: providerActivity.summary.attentionAcknowledgedCount,
        providerAttentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
        providerAttentionNextReminderAt: providerActivity.summary.attentionNextReminderAt,
        providerAttentionOverdueCount: providerActivity.summary.attentionOverdueCount,
        providerAttentionAttemptHistoryEntryCountTotal: providerActivity.summary.attentionAttemptHistoryEntryCountTotal,
        providerAttentionMaxAttemptCount: providerActivity.summary.attentionMaxAttemptCount,
        providerAttentionMultiAttemptCount: providerActivity.summary.attentionMultiAttemptCount,
        providerAttentionReminderCount: providerActivity.summary.attentionReminderCount,
        providerAttentionRequiredCount: providerActivity.summary.attentionRequiredCount,
        providerAttentionRecoveredCount: providerActivity.summary.attentionRecoveredCount,
        providerAttentionResolvedCount: providerActivity.summary.attentionResolvedCount,
        providerAttentionStatusCounts: providerActivity.summary.attentionStatusCounts,
        providerAttentionTotalAttemptCount: providerActivity.summary.attentionTotalAttemptCount,
        providerAttentionTotalRetryCount: providerActivity.summary.attentionTotalRetryCount,
        providerEventCount: providerActivity.summary.eventCount,
        providerEventFamilyCounts: providerActivity.summary.eventFamilyCounts,
        providerRecentEventCount: providerRecentWindow?.eventCount || 0,
        providerRecentEventFamilyCounts:
          providerRecentWindow?.eventFamilyCounts || { attention: 0, execution: 0, probe: 0 },
        providerRecentExecutionCount: providerRecentWindow?.executionCount || 0,
        providerRecentExecutionEstimatedCostUsdTotal: providerRecentWindow?.executionEstimatedCostUsdTotal || 0,
        providerRecentExecutionLatestMonthlyBucketDelta:
          providerRecentWindow?.executionLatestMonthlyBucketDelta || null,
        providerRecentExecutionLatestMonthlyBucketStartDate:
          providerRecentWindow?.executionLatestMonthlyBucketStartDate || null,
        providerRecentExecutionMonthlyBucketCount: providerRecentWindow?.executionMonthlyBucketCount || 0,
        providerRecentExecutionOldestMonthlyBucketStartDate:
          providerRecentWindow?.executionOldestMonthlyBucketStartDate || null,
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
        providerRecentSince: providerSince || null,
        providerRecentTouchedProviderCount: providerRecentWindow?.touchedProviderCount || 0,
        providerRecentTouchedProviderIds: providerRecentWindow?.touchedProviderIds || [],
        providerExecutionAverageDurationMs: providerActivity.summary.executionAverageDurationMs,
        providerExecutionCompletedCount: providerActivity.summary.executionCompletedCount,
        providerExecutionCount: providerActivity.summary.executionCount,
        providerExecutionFailureKindCounts: providerActivity.summary.executionFailureKindCounts,
        providerExecutionFailedCount: providerActivity.summary.executionFailedCount,
        providerExecutionAttemptHistoryEntryCountTotal: providerActivity.summary.executionAttemptHistoryEntryCountTotal,
        providerExecutionMaxDurationMs: providerActivity.summary.executionMaxDurationMs,
        providerExecutionMaxAttemptCount: providerActivity.summary.executionMaxAttemptCount,
        providerExecutionMultiAttemptCount: providerActivity.summary.executionMultiAttemptCount,
        providerExecutionRetryableFailureCount: providerActivity.summary.executionRetryableFailureCount,
        providerExecutionRetrySucceededCount: providerActivity.summary.executionRetrySucceededCount,
        providerExecutionTotalAttemptCount: providerActivity.summary.executionTotalAttemptCount,
        providerExecutionTotalDurationMs: providerActivity.summary.executionTotalDurationMs,
        providerExecutionTotalRetryCount: providerActivity.summary.executionTotalRetryCount,
        providerExecutionTimedOutFailureCount: providerActivity.summary.executionTimedOutFailureCount,
        providerExecutionEstimatedCostUsdAverage: providerActivity.summary.executionEstimatedCostUsdAverage,
        providerExecutionEstimatedCostUsdByProviderId: providerActivity.summary.executionEstimatedCostUsdByProviderId,
        providerExecutionEstimatedCostUsdByRole: providerActivity.summary.executionEstimatedCostUsdByRole,
        providerExecutionEstimatedCostUsdMax: providerActivity.summary.executionEstimatedCostUsdMax,
        providerExecutionEstimatedCostUsdPricedCount: providerActivity.summary.executionEstimatedCostUsdPricedCount,
        providerExecutionEstimatedCostUsdTotal: providerActivity.summary.executionEstimatedCostUsdTotal,
        providerExecutionUsageInputTokensTotal: providerActivity.summary.usageInputTokensTotal,
        providerExecutionUsageOutputTokensTotal: providerActivity.summary.usageOutputTokensTotal,
        providerExecutionUsageTotalTokensTotal: providerActivity.summary.usageTotalTokensTotal,
        specialistFollowUpRequiredCount: parallelActivity.specialistFollowUpRequiredCount,
        specialistFollowUpNeedsReminderCount: parallelActivity.specialistFollowUpNeedsReminderCount,
        specialistFollowUpOverdueCount: parallelActivity.specialistFollowUpOverdueCount,
        specialistFollowUpReminderCountTotal: parallelActivity.specialistFollowUpReminderCountTotal,
        specialistKindCounts: parallelActivity.specialistKindCounts,
        specialistLatestQualityGateViolation: parallelActivity.latestQualityGateViolation,
        specialistLatestOrchestrationProfile: parallelActivity.latestOrchestrationProfile,
        specialistLatestFollowUp: parallelActivity.latestFollowUp,
        specialistLatestReminderAt: parallelActivity.specialistLatestReminderAt,
        specialistLatestMergeRun: parallelActivity.latestMergeRun,
        specialistLatestParallelGroup: parallelActivity.latestParallelGroup,
        specialistMergeCompletedCount: parallelActivity.mergeCompletedCount,
        specialistMergeRunCount: parallelActivity.mergeRunCount,
        specialistNextReminderAt: parallelActivity.specialistNextReminderAt,
        specialistQualityGateBlockedCount: parallelActivity.qualityGateBlockedCount,
        specialistQualityGateStatusCounts: parallelActivity.qualityGateStatusCounts,
        specialistOrchestrationProfileCounts: parallelActivity.orchestrationProfileCounts,
        specialistOrchestrationProfileCount: parallelActivity.specialistOrchestrationProfileCount,
        specialistRunCount: parallelActivity.specialistRunCount,
        specialistStatusCounts: parallelActivity.statusCounts,
        specialistTouchedOrchestrationProfileIds: parallelActivity.touchedOrchestrationProfileIds,
        specialistTouchedKinds: parallelActivity.touchedSpecialistKinds,
        specialistTotalGroupCount: parallelActivity.totalGroupCount,
        providerTouchedCount: providerActivity.summary.touchedProviderCount,
        providerTouchedIds: providerActivity.summary.touchedProviderIds,
        sessionCount: missionEntries.reduce((count, entry) => count + entry.summary.sessionCount, 0),
        workspaceId: workspace.id,
      },
      workspace,
    };
  }

  function listMaintenancePressureEntries(filter = {}) {
    const targets = [];

    if (filter.missionId) {
      const mission = getMission(filter.missionId);
      const workspace = getWorkspace(mission.workspaceId);

      if (filter.workspaceId && workspace.id !== filter.workspaceId) {
        return [];
      }

      targets.push({
        mission,
        workspace,
      });
    } else if (filter.workspaceId) {
      const workspace = getWorkspace(filter.workspaceId);
      targets.push({
        mission: null,
        workspace,
      });
    } else {
      for (const workspace of store.listWorkspaces()) {
        targets.push({
          mission: null,
          workspace,
        });
      }
    }

    return targets
      .map((target) => {
        const escalations = store
          .listEscalations({
            missionId: target.mission ? target.mission.id : undefined,
            status: 'open',
            workspaceId: target.workspace.id,
          })
          .map((item) => enrichEscalation(item));

        const dueMonitoringItems = escalations.filter((item) => {
          if (item.pendingOwnerHandoff) {
            return false;
          }
          if (!item.needsReminder) {
            return false;
          }
          if (filter.owner && item.recommendedOwner !== filter.owner) {
            return false;
          }
          return true;
        });

        const dueOwnerHandoffItems = escalations.filter((item) => {
          if (!item.pendingOwnerHandoff || !item.ownerHandoffNeedsReminder) {
            return false;
          }
          if (filter.owner && item.ownerHandoffTargetOwner !== filter.owner) {
            return false;
          }
          return true;
        });

        const dueProviderAttentionItems = buildProviderAttentionPendingItems({
          missionId: target.mission ? target.mission.id : undefined,
          needsReminderOnly: true,
          workspaceId: target.workspace.id,
        }).filter((item) => {
          if (filter.owner && item.recommendedOwner !== filter.owner) {
            return false;
          }
          return true;
        });

        const dueSpecialistFollowUpItems = buildSpecialistFollowUpItems({
          missionId: target.mission ? target.mission.id : undefined,
          needsReminderOnly: true,
          workspaceId: target.workspace.id,
        }).filter((item) => {
          if (filter.owner && item.recommendedOwner !== filter.owner) {
            return false;
          }
          return true;
        });

        const dueItems = [
          ...dueMonitoringItems,
          ...dueOwnerHandoffItems,
          ...dueProviderAttentionItems,
          ...dueSpecialistFollowUpItems,
        ];
        if (!dueItems.length) {
          return null;
        }

        const nextDueAt =
          [
            ...dueMonitoringItems.map((item) => item.nextReminderAt),
            ...dueOwnerHandoffItems.map((item) => item.nextOwnerHandoffReminderAt),
            ...dueProviderAttentionItems.map((item) => item.nextReminderAt),
            ...dueSpecialistFollowUpItems.map((item) => item.nextReminderAt),
          ]
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null;
        const createdAt =
          [
            ...dueMonitoringItems.map((item) => item.createdAt),
            ...dueOwnerHandoffItems.map((item) => item.ownerTransitionAt || item.createdAt),
            ...dueProviderAttentionItems.map((item) => item.createdAt),
            ...dueSpecialistFollowUpItems.map((item) => item.createdAt),
          ]
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null;
        const latestMaintenanceRun =
          store
            .listMaintenanceRuns({
              missionId: target.mission ? target.mission.id : undefined,
              owner: filter.owner,
              workspaceId: target.workspace.id,
            })
            .at(-1) || null;
        const effectiveRecommendedOwner =
          dueOwnerHandoffItems.some((item) => item.ownerHandoffTargetOwner === 'human-approver') ||
          dueMonitoringItems.some((item) => item.effectiveRecommendedOwner === 'human-approver') ||
          dueProviderAttentionItems.some((item) => item.recommendedOwner === 'human-approver')
            ? 'human-approver'
            : 'workspace-owner';

        return {
          actionId: `maintenance-required:${target.workspace.id}:${target.mission ? target.mission.id : 'workspace'}`,
          actionType: 'maintenance-sweep',
          createdAt: createdAt || nextDueAt || now(),
          dueMonitoringCount: dueMonitoringItems.length,
          dueOwnerHandoffCount: dueOwnerHandoffItems.length,
          dueProviderAttentionCount: dueProviderAttentionItems.length,
          dueSpecialistFollowUpCount: dueSpecialistFollowUpItems.length,
          effectiveRecommendedOwner,
          latestMaintenanceRun,
          latestMaintenanceRunAt: latestMaintenanceRun?.createdAt || null,
          missionId: target.mission ? target.mission.id : null,
          missionTitle: target.mission ? target.mission.title : null,
          nextDueAt,
          totalDueCandidateCount: dueItems.length,
          workspaceId: target.workspace.id,
          workspaceName: target.workspace.name,
        };
      })
      .filter(Boolean);
  }

  function buildMaintenanceActionItems(filter = {}) {
    return listMaintenancePressureEntries(filter)
      .map((entry) => {
        const title = entry.missionTitle
          ? `Maintenance sweep required for ${entry.missionTitle}`
          : `Maintenance sweep required for ${entry.workspaceName}`;
        const recommendedCommand = entry.missionId
          ? `node src/cli.mjs action maintenance --mission ${entry.missionId} --note "<note>"`
          : `node src/cli.mjs action maintenance --workspace ${entry.workspaceId} --note "<note>"`;
        const reasonParts = [];

        if (entry.dueMonitoringCount > 0) {
          reasonParts.push(`${entry.dueMonitoringCount} escalation reminder(s) due`);
        }
        if (entry.dueOwnerHandoffCount > 0) {
          reasonParts.push(`${entry.dueOwnerHandoffCount} owner handoff reminder(s) due`);
        }
        if (entry.dueProviderAttentionCount > 0) {
          reasonParts.push(`${entry.dueProviderAttentionCount} provider attention reminder(s) due`);
        }
        if (entry.dueSpecialistFollowUpCount > 0) {
          reasonParts.push(`${entry.dueSpecialistFollowUpCount} specialist follow-up reminder(s) due`);
        }

        return addFixedOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'maintenance-required',
              actionId: entry.actionId,
              actionType: 'maintenance-sweep',
              createdAt: entry.createdAt,
              dueMonitoringCount: entry.dueMonitoringCount,
              dueOwnerHandoffCount: entry.dueOwnerHandoffCount,
              dueProviderAttentionCount: entry.dueProviderAttentionCount,
              dueSpecialistFollowUpCount: entry.dueSpecialistFollowUpCount,
              effectiveRecommendedOwner: entry.effectiveRecommendedOwner,
              latestMaintenanceRunAt: entry.latestMaintenanceRunAt,
              latestMaintenanceRunId: entry.latestMaintenanceRun?.id || null,
              missionId: entry.missionId,
              nextDueAt: entry.nextDueAt,
              reason: reasonParts.join('; '),
              title,
              totalDueCandidateCount: entry.totalDueCandidateCount,
              workspaceId: entry.workspaceId,
              workspaceName: entry.workspaceName,
            },
            {
              priority: 'high',
              recommendedCommand,
              recommendedOwner: 'workspace-owner',
            },
          ),
          {
            dueAt: entry.nextDueAt,
            escalationRule: 'Run action maintenance to sync escalation state and issue due reminders for this scope.',
            slaHours: deriveSlaHoursFromTimestamps(entry.createdAt, entry.nextDueAt),
          },
        );
      })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildApprovalInboxItems(filter = {}) {
    const approvals = store.listApprovals({ status: 'pending' });

    return approvals
      .map((approval) => {
        const mission = store.getMission(approval.missionId);
        const workspace = mission ? store.getWorkspace(mission.workspaceId) : null;
        const session = store.getSession(approval.sessionId);

        if (!mission || !workspace || !session) {
          return null;
        }

        if (filter.workspaceId && workspace.id !== filter.workspaceId) {
          return null;
        }

        if (filter.missionId && mission.id !== filter.missionId) {
          return null;
        }

        return {
          actionId: approval.id,
          actionClass: 'awaiting-human-decision',
          actionType: 'approval',
          approvalId: approval.id,
          createdAt: approval.createdAt,
          decision: approval.decision,
          deliverableType: mission.deliverableType,
          kind: approval.kind,
          missionId: mission.id,
          missionStatus: mission.status,
          missionTitle: mission.title,
          mode: mission.mode,
          reason: approval.reason,
          requestedByRole: approval.requestedByRole,
          resolveCommand: `node src/cli.mjs approval resolve ${approval.id} --decision <approve|reject> --reason "<reason>"`,
          sessionId: session.id,
          sessionStatus: session.status,
          title: approval.title,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        };
      })
      .map((item) =>
        item
          ? addOperationalMetadata(
              addDispatchMetadata(item, {
                priority: 'high',
                recommendedOwner: 'human-approver',
                recommendedCommand: item.resolveCommand,
              }),
              {
                slaHours: 24,
                escalationRule: 'If overdue, escalate to the workspace owner and request a decision on approval scope.',
              },
            )
          : null,
      )
      .filter(Boolean)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildBlockedFollowUpItems(filter = {}) {
    return store
      .listMissions()
      .map((mission) => {
        if (mission.status !== 'failed') {
          return null;
        }

        const workspace = store.getWorkspace(mission.workspaceId);
        if (!workspace) {
          return null;
        }

        if (filter.workspaceId && workspace.id !== filter.workspaceId) {
          return null;
        }

        if (filter.missionId && mission.id !== filter.missionId) {
          return null;
        }

        const latestSession = getLatestSession(store.listSessionsByMission(mission.id));
        if (!latestSession || latestSession.status !== 'failed') {
          return null;
        }

        const rejectedApproval =
          getLatestItem(
            store
              .listApprovals({ missionId: mission.id, sessionId: latestSession.id })
              .filter((approval) => approval.status === 'rejected'),
            'resolvedAt',
          ) || null;

        if (!rejectedApproval) {
          return null;
        }

        return {
          actionClass: 'blocked',
          actionId: `blocked-follow-up:${mission.id}:${latestSession.id}`,
          actionType: 'blocked-follow-up',
          createdAt: rejectedApproval.resolvedAt || rejectedApproval.createdAt,
          deliverableType: mission.deliverableType,
          missionId: mission.id,
          missionStatus: mission.status,
          missionTitle: mission.title,
          mode: mission.mode,
          nextStepHint: 'Create a narrower follow-up mission or revise the objective before rerunning.',
          reason: rejectedApproval.decisionReason || rejectedApproval.reason,
          requestedByRole: rejectedApproval.requestedByRole,
          sessionId: latestSession.id,
          sessionStatus: latestSession.status,
          sourceApprovalId: rejectedApproval.id,
          title: `Blocked after rejected approval for ${mission.title}`,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        };
      })
      .map((item) =>
        item
          ? addOperationalMetadata(
              addDispatchMetadata(item, {
                priority: 'high',
                recommendedOwner: 'mission-owner',
                recommendedCommand: item.commandHint || `node src/cli.mjs mission show ${item.missionId}`,
              }),
              {
                slaHours: 12,
                escalationRule: 'If overdue, escalate to the workspace owner and redefine scope before any rerun.',
              },
            )
          : null,
      )
      .filter(Boolean)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function deriveReviewerFollowUpSeed(mission, filter = {}) {
    const workspace = store.getWorkspace(mission.workspaceId);
    if (!workspace) {
      return null;
    }

    if (filter.workspaceId && workspace.id !== filter.workspaceId) {
      return null;
    }

    if (filter.missionId && mission.id !== filter.missionId) {
      return null;
    }

    const latestSession = getLatestSession(store.listSessionsByMission(mission.id));
    if (!latestSession || latestSession.status !== 'failed') {
      return null;
    }

    const reviewerRun = store.listAgentRunsBySession(latestSession.id).find((run) => run.role === 'reviewer') || null;
    if (!reviewerRun || reviewerRun.status !== 'failed') {
      return null;
    }

    const reviewerReport =
      store
        .listArtifactsBySession(latestSession.id)
        .filter((artifact) => artifact.fileName === 'reviewer-report.md')
        .at(-1) || null;

    const findings =
      reviewerReport && fs.existsSync(reviewerReport.path)
        ? parseMarkdownBulletSection(fs.readFileSync(reviewerReport.path, 'utf8'), 'Findings')
        : [];

    return {
      actionClass: 'retry-ready',
      actionId: `reviewer-follow-up:${mission.id}:${latestSession.id}`,
      actionType: 'reviewer-follow-up',
      createdAt: reviewerReport?.createdAt || reviewerRun.endedAt || latestSession.endedAt || latestSession.startedAt,
      deliverableType: mission.deliverableType,
      findings,
      missionId: mission.id,
      missionStatus: mission.status,
      missionTitle: mission.title,
      mode: mission.mode,
      reason: reviewerRun.outputSummary,
      reportPath: reviewerReport ? reviewerReport.path : null,
      requestedByRole: 'reviewer',
      resolutionKind: '',
      resolutionNote: '',
      resolvedAt: null,
      sessionId: latestSession.id,
      sessionStatus: latestSession.status,
      status: 'open',
      title: `Reviewer follow-up required for ${mission.title}`,
      updatedAt: reviewerReport?.createdAt || reviewerRun.endedAt || latestSession.updatedAt || latestSession.endedAt || latestSession.startedAt,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
  }

  function buildReviewerFollowUpItemFromRecord(record) {
    const item = {
      ...record,
      resolveCommand: `node src/cli.mjs action resolve-reviewer-follow-up ${record.actionId} --kind <rerun-fixed|superseded|scope-reduced|accepted-risk> --note "<note>"`,
    };

    return addOperationalMetadata(
      addDispatchMetadata(item, {
        priority: 'medium',
        recommendedOwner: 'mission-owner',
        recommendedCommand: `node src/cli.mjs mission run ${record.missionId} --provider stub`,
      }),
      {
        slaHours: 48,
        escalationRule: 'If overdue, escalate to the workspace owner and request a narrower remediation plan.',
      },
    );
  }

  function listReviewerFollowUpRecords(filter = {}) {
    if (filter.status && !REVIEWER_FOLLOW_UP_STATUSES.includes(filter.status)) {
      throw new Error(`Unsupported reviewer follow-up status: ${filter.status}`);
    }
    if (filter.resolutionKind && !REVIEWER_FOLLOW_UP_RESOLUTION_KINDS.includes(filter.resolutionKind)) {
      throw new Error(`Unsupported reviewer follow-up resolution kind: ${filter.resolutionKind}`);
    }

    const allRecords = store.listReviewerFollowUps({
      actionId: filter.actionId,
      missionId: filter.missionId,
      sessionId: filter.sessionId,
      workspaceId: filter.workspaceId,
    });
    const records = allRecords.filter((record) => {
      if (filter.status && record.status !== filter.status) {
        return false;
      }
      if (filter.resolutionKind && record.resolutionKind !== filter.resolutionKind) {
        return false;
      }
      return true;
    });
    const recordActionIds = new Set(allRecords.map((record) => record.actionId));

    if (filter.status === 'resolved') {
      return records.sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    }

    const seeds = store
      .listMissions()
      .map((mission) => deriveReviewerFollowUpSeed(mission, filter))
      .filter(Boolean)
      .filter((seed) => !recordActionIds.has(seed.actionId));

    return [...records, ...seeds].sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function getReviewerFollowUpInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }

    const effectiveStatus = filter.status || 'open';
    const items = listReviewerFollowUpRecords({
      actionId: filter.actionId,
      missionId: filter.missionId,
      resolutionKind: filter.kind || filter.resolutionKind,
      status: effectiveStatus,
      workspaceId: filter.workspaceId,
    })
      .map((record) => buildReviewerFollowUpItemFromRecord(record))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        kind: filter.kind || filter.resolutionKind || null,
        missionId: filter.missionId || null,
        status: effectiveStatus,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeReviewerFollowUps(items),
    };
  }

  function ensureReviewerFollowUpRecord(actionId) {
    const existingRecord = store.listReviewerFollowUps({ actionId }).at(-1) || null;
    if (existingRecord) {
      return existingRecord;
    }

    const seed =
      store
        .listMissions()
        .map((mission) => deriveReviewerFollowUpSeed(mission))
        .find((item) => item && item.actionId === actionId) || null;

    if (!seed) {
      throw new Error(`Reviewer follow-up not found: ${actionId}`);
    }

    return store.saveReviewerFollowUp({
      id: createId('reviewerfollowup'),
      ...seed,
      createdAt: seed.createdAt || now(),
      updatedAt: seed.updatedAt || seed.createdAt || now(),
    });
  }

  function createReviewerFollowUpRecord(seed) {
    const existingRecord = store.listReviewerFollowUps({ actionId: seed.actionId }).at(-1) || null;
    if (existingRecord) {
      return existingRecord;
    }

    return store.saveReviewerFollowUp({
      id: createId('reviewerfollowup'),
      ...seed,
      createdAt: seed.createdAt || now(),
      updatedAt: seed.updatedAt || seed.createdAt || now(),
    });
  }

  function buildReviewerFollowUpItems(filter = {}) {
    return listReviewerFollowUpRecords({ ...filter, status: 'open' })
      .map((record) => buildReviewerFollowUpItemFromRecord(record))
      .filter(Boolean)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildAcceptedRiskMonitoringItems(filter = {}) {
    return store
      .listEscalations({
        missionId: filter.missionId,
        owner: filter.owner,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((escalation) => enrichEscalation(escalation))
      .filter(
        (escalation) =>
          (escalation.actionType === 'reviewer-accepted-risk' || escalation.sourceResolutionKind === 'accepted-risk') &&
          !escalation.pendingOwnerHandoff,
      )
      .map((escalation) =>
        addFixedOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'monitoring-required',
              actionId: escalation.actionId,
              actionType: 'accepted-risk-monitoring',
              createdAt: escalation.createdAt,
              deliverableType: escalation.deliverableType || null,
              escalationId: escalation.id,
              effectiveRecommendedOwner: escalation.effectiveRecommendedOwner || escalation.recommendedOwner || 'workspace-owner',
              missionId: escalation.missionId,
              reason: escalation.reason,
              recommendedCommand: escalation.recommendedCommand,
              recommendedOwner: escalation.recommendedOwner,
              sessionId: escalation.sessionId,
              sourceResolutionKind: escalation.sourceResolutionKind || 'accepted-risk',
              title: escalation.title,
              workspaceId: escalation.workspaceId,
              workspaceName: escalation.workspaceName,
              lastReminderAt: escalation.lastReminderAt || null,
              needsReminder: Boolean(escalation.needsReminder),
              nextReminderAt: escalation.nextReminderAt || null,
              ownerEscalationLevel: escalation.ownerEscalationLevel || 'base',
              ownerEscalationStep: Number(escalation.ownerEscalationStep || 0),
              ownerHistoryCount: Array.isArray(escalation.ownerHistory) ? escalation.ownerHistory.length : 0,
              lastOwnerEscalatedAt: escalation.lastOwnerEscalatedAt || null,
              reminderCount: Number(escalation.reminderCount || 0),
              reminderCadenceHours: escalation.reminderCadenceHours || null,
              reminderHistoryCount: Array.isArray(escalation.reminderHistory) ? escalation.reminderHistory.length : 0,
            },
            {
              priority: escalation.priority || 'medium',
              recommendedCommand: escalation.recommendedCommand,
              recommendedOwner: escalation.recommendedOwner || 'workspace-owner',
            },
          ),
          {
            dueAt: escalation.dueAt,
            escalationRule: escalation.escalationRule,
            slaHours: deriveSlaHoursFromTimestamps(escalation.createdAt, escalation.dueAt),
          },
        ),
      )
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildOwnerHandoffActionItems(filter = {}) {
    return store
      .listEscalations({
        missionId: filter.missionId,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((escalation) => enrichEscalation(escalation))
      .filter((escalation) => escalation.pendingOwnerHandoff && escalation.latestOwnerTransition)
      .map((escalation) =>
        addFixedOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'handoff-required',
              actionId: `owner-handoff:${escalation.id}`,
              actionType: 'owner-handoff',
              createdAt: escalation.latestOwnerTransition?.at || escalation.createdAt,
              deliverableType: escalation.deliverableType || null,
              effectiveRecommendedOwner: escalation.latestOwnerTransition?.to || escalation.effectiveRecommendedOwner,
              escalationId: escalation.id,
              handoffDueAt: escalation.ownerHandoffDueAt,
              handoffLatestReminderAt: escalation.latestOwnerHandoffReminderAt,
              handoffNeedsReminder: escalation.ownerHandoffNeedsReminder,
              handoffNextReminderAt: escalation.nextOwnerHandoffReminderAt,
              handoffReminderCadenceHours: escalation.ownerHandoffReminderCadenceHours,
              handoffReminderCount: escalation.ownerHandoffReminderCount,
              handoffSlaHours: escalation.ownerHandoffSlaHours,
              lastReminderAt: escalation.latestOwnerHandoffReminderAt,
              missionId: escalation.missionId,
              needsReminder: escalation.ownerHandoffNeedsReminder,
              nextReminderAt: escalation.nextOwnerHandoffReminderAt,
              ownerTransitionAt: escalation.latestOwnerTransition?.at || null,
              ownerTransitionDetail: escalation.latestOwnerTransition
                ? formatEscalationOwnerChangeDetail(escalation.latestOwnerTransition)
                : null,
              ownerTransitionFrom: escalation.latestOwnerTransition?.from || null,
              ownerTransitionTo: escalation.latestOwnerTransition?.to || null,
              pendingOwnerHandoff: escalation.pendingOwnerHandoff,
              recommendedCommand: `node src/cli.mjs action acknowledge-owner-handoff ${escalation.id} --note "<note>"`,
              recommendedOwner: escalation.latestOwnerTransition?.to || escalation.effectiveRecommendedOwner,
              reminderCadenceHours: escalation.ownerHandoffReminderCadenceHours,
              reminderCount: escalation.ownerHandoffReminderCount,
              sessionId: escalation.sessionId,
              title: escalation.title,
              workspaceId: escalation.workspaceId,
              workspaceName: escalation.workspaceName,
            },
            {
              priority: 'high',
              recommendedCommand: `node src/cli.mjs action acknowledge-owner-handoff ${escalation.id} --note "<note>"`,
              recommendedOwner: escalation.latestOwnerTransition?.to || escalation.effectiveRecommendedOwner,
            },
          ),
          {
            dueAt: escalation.ownerHandoffDueAt,
            escalationRule: 'Acknowledge the owner handoff so the escalated monitoring responsibility is explicit.',
            slaHours: escalation.ownerHandoffSlaHours,
          },
        ),
      )
      .filter((item) => !filter.owner || item.recommendedOwner === filter.owner)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildParallelGroupStates(filter = {}) {
    const state = store.loadState();
    const missionById = new Map(state.missions.map((mission) => [mission.id, mission]));
    const sessionById = new Map(state.sessions.map((session) => [session.id, session]));
    const workspaceById = new Map(state.workspaces.map((workspace) => [workspace.id, workspace]));
    const groups = new Map();

    for (const run of ensureArray(state.agentRuns)) {
      const parallelGroupId = normalizeText(run.parallelGroupId);
      if (!parallelGroupId) {
        continue;
      }
      if (filter.parallelGroupId && parallelGroupId !== filter.parallelGroupId) {
        continue;
      }
      const mission = missionById.get(run.missionId) || null;
      const workspace = mission ? workspaceById.get(mission.workspaceId) || null : null;
      if (filter.missionId && mission?.id !== filter.missionId) {
        continue;
      }
      if (filter.workspaceId && workspace?.id !== filter.workspaceId) {
        continue;
      }

      const current = groups.get(parallelGroupId) || {
        mission,
        orchestrationProfile: null,
        orchestrationProfileAt: '',
        parallelGroupId,
        requiredKinds: [],
        runs: [],
        sessionById,
        workspace,
      };
      current.runs.push(run);
      current.requiredKinds = [
        ...new Set(
          [...current.requiredKinds, ...ensureArray(run.parallelRequiredKinds), normalizeText(run.specialistKind)]
            .filter(Boolean)
            .filter((kind) => SPECIALIST_KINDS.includes(kind)),
        ),
      ];
      const orchestrationProfile = extractOrchestrationProfileMetadata(run);
      const orchestrationProfileAt = normalizeText(run.endedAt || run.startedAt || '');
      if (orchestrationProfile && (!current.orchestrationProfile || String(current.orchestrationProfileAt) <= orchestrationProfileAt)) {
        current.orchestrationProfile = orchestrationProfile;
        current.orchestrationProfileAt = orchestrationProfileAt;
      }
      groups.set(parallelGroupId, current);
    }

    return [...groups.values()].map((group) => {
      const latestByKind = new Map();
      let latestMergeRun = null;

      for (const run of group.runs) {
        if (normalizeText(run.stageKind) === 'parallel-merge') {
          const currentAt = String(latestMergeRun?.endedAt || latestMergeRun?.startedAt || '');
          const nextAt = String(run.endedAt || run.startedAt || '');
          if (!latestMergeRun || currentAt <= nextAt) {
            latestMergeRun = run;
          }
          continue;
        }

        const specialistKind = normalizeText(run.specialistKind);
        if (!specialistKind) {
          continue;
        }
        const current = latestByKind.get(specialistKind);
        const currentAt = String(current?.endedAt || current?.startedAt || '');
        const nextAt = String(run.endedAt || run.startedAt || '');
        if (!current || currentAt <= nextAt) {
          latestByKind.set(specialistKind, run);
        }
      }

      const latestRuns = [...latestByKind.values()];
      const qualityGate = evaluateParallelQualityGate({
        latestByKind,
        orchestrationProfile: group.orchestrationProfile,
        requiredKinds: group.requiredKinds,
      });
      const unresolvedRuns = latestRuns.filter((run) => ['blocked', 'failed'].includes(normalizeAgentRunStatus(run.status)));

      return {
        latestByKind,
        latestMergeRun,
        latestRuns,
        mission: group.mission,
        orchestrationProfile: group.orchestrationProfile,
        parallelGroupId: group.parallelGroupId,
        qualityGate,
        requiredKinds: group.requiredKinds,
        runs: group.runs,
        unresolvedRuns,
        wasMerged: Boolean(
          latestMergeRun && ['completed', 'merged'].includes(normalizeAgentRunStatus(latestMergeRun.status)),
        ),
        workspace: group.workspace,
      };
    });
  }

  function attachSpecialistFollowUpReminderState(baseItem, status) {
    const reminderRecords = listSpecialistFollowUpRemindersForItem(baseItem);
    const latestReminder = reminderRecords.at(-1) || null;
    const reminderCadenceHours =
      Number(baseItem.reminderCadenceHours || 0) || deriveSpecialistFollowUpReminderCadenceHours(status);
    const reminderBaseTimestamp = latestReminder?.remindedAt || latestReminder?.createdAt || baseItem.dueAt || null;
    const reminderBaseMs = reminderBaseTimestamp ? new Date(reminderBaseTimestamp).getTime() : Number.NaN;
    const nextReminderAt =
      baseItem.isOverdue && Number.isFinite(reminderBaseMs)
        ? latestReminder
          ? new Date(reminderBaseMs + Number(reminderCadenceHours || 0) * 60 * 60 * 1000).toISOString()
          : baseItem.dueAt
        : null;
    const nextReminderMs = nextReminderAt ? new Date(nextReminderAt).getTime() : Number.NaN;
    const needsReminder = baseItem.isOverdue && Number.isFinite(nextReminderMs) ? Date.now() >= nextReminderMs : false;

    return {
      ...baseItem,
      lastReminderAt: latestReminder?.remindedAt || latestReminder?.createdAt || null,
      latestReminderAt: latestReminder?.remindedAt || latestReminder?.createdAt || null,
      needsReminder,
      nextReminderAt,
      remindCommand: `node src/cli.mjs action remind-specialist-follow-ups --mission ${baseItem.missionId} --status ${status} --note "<note>"`,
      reminderCadenceHours,
      reminderCount: reminderRecords.length,
      reminderHistoryCount: reminderRecords.length,
    };
  }

  function buildSpecialistFollowUpItem({
    actionId,
    createdAt,
    detail,
    followUpSource = 'run-status',
    group,
    mission,
    providerId,
    recommendedOwner = 'workspace-owner',
    run = null,
    specialistHandoff,
    specialistKind,
    status,
    workspace,
  }) {
    const followUpPolicy = resolveSpecialistFollowUpPolicy({
      followUpSource,
      orchestrationProfile: group.orchestrationProfile,
      specialistKind,
      status,
    });
    const recommendedCommand = `node src/cli.mjs mission run ${mission.id} --provider ${providerId}`;
    const baseItem = addOperationalMetadata(
      addDispatchMetadata(
        {
          actionClass: 'specialist-follow-up-required',
          actionId,
          actionType: 'specialist-follow-up',
          createdAt,
          deliverableType: mission.deliverableType,
          followUpSource,
          mergeStatus: normalizeText(run?.mergeStatus) || 'pending',
          missionId: mission.id,
          orchestrationProfile: group.orchestrationProfile,
          parallelGroupId: group.parallelGroupId,
          parentRunId: normalizeText(run?.parentRunId) || null,
          providerId,
          reason: detail,
          recommendedOwner,
          retryPolicy: followUpPolicy.retryPolicy,
          reminderCadenceHours: followUpPolicy.reminderCadenceHours,
          resumeFromRunId: normalizeText(run?.resumeFromRunId) || null,
          runId: normalizeText(run?.id) || null,
          sessionId: normalizeText(run?.sessionId) || null,
          specialistHandoff,
          specialistKind,
          specialistRootRunId: normalizeText(run?.specialistRootRunId) || normalizeText(run?.id) || null,
          stageKind: normalizeText(run?.stageKind) || 'specialist-branch',
          status,
          title: `Specialist follow-up required for ${mission.title} (${specialistKind})`,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        },
        {
          priority: followUpPolicy.priority,
          recommendedCommand,
          recommendedOwner: 'workspace-owner',
        },
      ),
      {
        escalationRule:
          'Resume the mission run to rerun the blocked or failed specialist branch and allow manager-controlled merge to continue.',
        slaHours: followUpPolicy.slaHours,
      },
    );

    return attachSpecialistFollowUpReminderState(baseItem, status);
  }

  function buildSpecialistFollowUpItems(filter = {}) {
    return buildParallelGroupStates(filter)
      .flatMap((group) => {
        const mission = group.mission;
        const workspace = group.workspace;
        if (!mission || !workspace) {
          return [];
        }

        const directItems = [...group.latestByKind.values()]
          .filter((run) => ['blocked', 'failed'].includes(normalizeAgentRunStatus(run.status)))
          .map((run) => {
            const specialistKind = normalizeText(run.specialistKind);
            const status = normalizeAgentRunStatus(run.status);
            const session = store.getSession(run.sessionId);
            const providerId = normalizeText(session?.provider || run.providerId, 'stub');
            const specialistHandoff =
              normalizeSpecialistHandoff(run.specialistHandoff, {
                nextAction: `Resolve the ${specialistKind} specialist ${status} state before merge.`,
                recommendedOwner: 'workspace-owner',
                summaryText: run.outputSummary,
              }) ||
              buildFallbackSpecialistHandoff({
                specialistKind,
                status,
                summaryText: normalizeText(run.outputSummary),
              });

            return buildSpecialistFollowUpItem({
              actionId: `specialist-follow-up:${group.parallelGroupId}:${specialistKind}:${run.id}`,
              createdAt: run.endedAt || run.startedAt || now(),
              detail: formatProviderFailureDetail({
                attemptCount: run.attemptCount,
                detail: run.outputSummary || `${specialistKind} specialist branch requires follow-up.`,
                failureKind: normalizeProviderFailureKind(run.failureKind),
                httpStatus: run.httpStatus,
                recoverable: typeof run.recoverable === 'boolean' ? run.recoverable : null,
                timedOut: Boolean(run.timedOut),
              }),
              group,
              mission,
              providerId,
              recommendedOwner: specialistHandoff?.nextHandoff?.recommendedOwner || 'workspace-owner',
              run,
              specialistHandoff,
              specialistKind,
              status,
              workspace,
            });
          });

        const directKinds = new Set(directItems.map((item) => item.specialistKind));
        const qualityGateItems = ensureArray(group.qualityGate?.violations)
          .filter((violation) => !directKinds.has(violation.specialistKind))
          .map((violation) => {
            const run = violation.sourceRun || group.latestByKind.get(violation.specialistKind) || null;
            const providerId = normalizeText(
              store.getSession(run?.sessionId)?.provider || run?.providerId,
              'stub',
            );
            const gateRequest = `Produce a completed ${violation.specialistKind} specialist signal to satisfy the ${group.qualityGate.qualityGate} gate before merge.`;
            const baseSpecialistHandoff =
              normalizeSpecialistHandoff(run?.specialistHandoff, {
                nextAction: gateRequest,
                recommendedOwner: 'workspace-owner',
                summaryText: violation.detail,
              }) ||
              buildFallbackSpecialistHandoff({
                nextAction: gateRequest,
                specialistKind: violation.specialistKind,
                status: 'blocked',
                summaryText: violation.detail,
              });
            const specialistHandoff = normalizeSpecialistHandoff(
              {
                ...baseSpecialistHandoff,
                blockers: [...new Set([...(baseSpecialistHandoff?.blockers || []), violation.detail].filter(Boolean))],
                currentState: violation.detail,
                nextHandoff: {
                  ...(baseSpecialistHandoff?.nextHandoff || {}),
                  recommendedOwner:
                    baseSpecialistHandoff?.nextHandoff?.recommendedOwner || 'workspace-owner',
                  request: gateRequest,
                },
              },
              {
                nextAction: gateRequest,
                recommendedOwner: 'workspace-owner',
                summaryText: violation.detail,
              },
            );

            return buildSpecialistFollowUpItem({
              actionId: `specialist-follow-up:${group.parallelGroupId}:${violation.specialistKind}:quality-gate`,
              createdAt: violation.at || run?.endedAt || run?.startedAt || now(),
              detail: violation.detail,
              followUpSource: 'quality-gate',
              group,
              mission,
              providerId,
              recommendedOwner: specialistHandoff?.nextHandoff?.recommendedOwner || 'workspace-owner',
              run,
              specialistHandoff,
              specialistKind: violation.specialistKind,
              status: 'blocked',
              workspace,
            });
          });

        return [...directItems, ...qualityGateItems];
      })
      .filter((item) => !filter.providerId || item.providerId === filter.providerId)
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function summarizeSpecialistFollowUpScopedState(filter = {}) {
    const items = buildSpecialistFollowUpItems(filter);
    const blockedItems = items.filter((item) => normalizeAgentRunStatus(item.status) === 'blocked');
    const failedItems = items.filter((item) => normalizeAgentRunStatus(item.status) === 'failed');
    let status = 'clear';

    if (failedItems.length) {
      status = 'failed';
    } else if (blockedItems.length) {
      status = 'blocked';
    }

    return {
      blockedCount: blockedItems.length,
      failedCount: failedItems.length,
      latestActionId: items.at(-1)?.actionId || null,
      latestBlockedActionId: blockedItems.at(-1)?.actionId || null,
      latestFailedActionId: failedItems.at(-1)?.actionId || null,
      pendingCount: items.length,
      status,
    };
  }

  function getSpecialistFollowUpActionState(actionId) {
    const followUpItem = buildSpecialistFollowUpItems({}).find((item) => item.actionId === actionId);
    if (!followUpItem) {
      return null;
    }

    return {
      item: followUpItem,
      status: normalizeAgentRunStatus(followUpItem.status),
    };
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

        const recommendedOwner =
          latestEvent.eventFamily === 'execution' && latestEvent.workspaceId ? 'workspace-owner' : 'human-approver';
        const recommendedCommand =
          latestEvent.eventFamily === 'execution'
            ? `node src/cli.mjs provider activity --provider ${provider.id} --status failed`
            : `node src/cli.mjs provider probe ${provider.id}`;
        const actionId = buildProviderAttentionActionId(latestEvent);
        const baseItem = addOperationalMetadata(
          addDispatchMetadata(
            {
              acknowledgeCommand: `node src/cli.mjs action acknowledge-provider-attention ${actionId} --note "<note>"`,
              actionClass: 'provider-attention-required',
              actionId,
              actionType: 'provider-attention',
              createdAt: latestEvent.at,
              deliverableType: null,
              eventFamily: latestEvent.eventFamily,
              eventKind: latestEvent.eventKind,
              eventRefId: getProviderAttentionEventRefId(latestEvent),
              missionId: latestEvent.missionId || null,
              providerDisplayName: provider.displayName,
              providerId: provider.id,
              reason: latestEvent.detail,
              sessionId: latestEvent.sessionId || null,
              status: 'pending',
              title:
                latestEvent.eventFamily === 'execution'
                  ? `Provider execution attention required for ${provider.displayName}`
                  : `Provider probe attention required for ${provider.displayName}`,
              workspaceId: latestEvent.workspaceId || null,
              workspaceName: latestEvent.workspaceName || null,
            },
            {
              priority: latestEvent.eventFamily === 'execution' ? 'high' : 'medium',
              recommendedCommand,
              recommendedOwner,
            },
          ),
          {
            escalationRule:
              latestEvent.eventFamily === 'execution'
                ? 'Inspect the failed provider execution and decide whether to rerun, switch provider, or narrow scope.'
                : 'Re-probe the provider and restore provider connectivity before the next external model run.',
            slaHours: latestEvent.eventFamily === 'execution' ? 12 : 24,
          },
        );
        const reminderRecords = listProviderAttentionRemindersForEvent(latestEvent);
        const latestReminder = reminderRecords.at(-1) || null;
        const reminderCadenceHours = deriveProviderAttentionReminderCadenceHours(latestEvent.eventFamily);
        const reminderBaseTimestamp = latestReminder?.remindedAt || latestReminder?.createdAt || baseItem.dueAt || null;
        const reminderBaseMs = reminderBaseTimestamp ? new Date(reminderBaseTimestamp).getTime() : Number.NaN;
        const nextReminderAt =
          baseItem.isOverdue && Number.isFinite(reminderBaseMs)
            ? latestReminder
              ? new Date(reminderBaseMs + Number(reminderCadenceHours || 0) * 60 * 60 * 1000).toISOString()
              : baseItem.dueAt
            : null;
        const nextReminderMs = nextReminderAt ? new Date(nextReminderAt).getTime() : Number.NaN;
        const needsReminder =
          baseItem.isOverdue && Number.isFinite(nextReminderMs) ? Date.now() >= nextReminderMs : false;

        return {
          ...baseItem,
          ...extractProviderFailureMetadata(latestEvent),
          lastReminderAt: latestReminder?.remindedAt || latestReminder?.createdAt || null,
          latestReminderAt: latestReminder?.remindedAt || latestReminder?.createdAt || null,
          needsReminder,
          nextReminderAt,
          remindCommand: `node src/cli.mjs action remind-provider-attention --provider ${provider.id} --note "<note>"`,
          reminderCadenceHours,
          reminderCount: reminderRecords.length,
          reminderHistoryCount: reminderRecords.length,
        };
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
      .map((record) => ({
        ...record,
        actionType: 'provider-attention',
        ...extractProviderFailureMetadata(record),
        providerDisplayName:
          record.providerDisplayName || providerRegistry.getProviderStatus(record.providerId).displayName,
        status: 'acknowledged',
      }))
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
      .map((record) => ({
        ...record,
        actionType: 'provider-attention',
        ...extractProviderFailureMetadata(record),
        providerDisplayName:
          record.providerDisplayName || providerRegistry.getProviderStatus(record.providerId).displayName,
        status: 'resolved',
      }))
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

  function summarizeProviderHealthDriftItems(items) {
    const providerCounts = {};
    const workspaceCounts = {};
    const reasonCodeCounts = {};
    let overdueCount = 0;

    for (const item of items) {
      if (item.providerId) {
        providerCounts[item.providerId] = (providerCounts[item.providerId] || 0) + 1;
      }
      if (item.workspaceId) {
        workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
      }
      for (const reasonCode of ensureArray(item.driftReasonCodes)) {
        reasonCodeCounts[reasonCode] = (reasonCodeCounts[reasonCode] || 0) + 1;
      }
      if (item.isOverdue) {
        overdueCount += 1;
      }
    }

    return {
      latestItem: items.at(-1) || null,
      overdueCount,
      providerCounts,
      reasonCodeCounts,
      total: items.length,
      workspaceCounts,
    };
  }

  function getActionInboxReminderState(item) {
    const nextReminderAt = item.nextReminderAt || item.handoffNextReminderAt || null;
    const lastReminderAt = item.lastReminderAt || item.handoffLatestReminderAt || null;
    const reminderCadenceHours = item.reminderCadenceHours || item.handoffReminderCadenceHours || null;
    const reminderCount = Number.isFinite(Number(item.reminderCount))
      ? Number(item.reminderCount)
      : Number(item.handoffReminderCount || 0);
    const needsReminder = Boolean(item.needsReminder || item.handoffNeedsReminder);
    const hasReminder =
      item.actionClass === 'monitoring-required' ||
      item.actionClass === 'handoff-required' ||
      Boolean(nextReminderAt) ||
      Boolean(lastReminderAt) ||
      Boolean(reminderCadenceHours) ||
      reminderCount > 0;

    return {
      hasReminder,
      lastReminderAt,
      needsReminder,
      nextReminderAt,
      reminderCadenceHours,
      reminderCount,
    };
  }

  function summarizeActionInbox(items) {
    const specialistFollowUpSummary = summarizeSpecialistFollowUpItems(
      items.filter((item) => item.actionClass === 'specialist-follow-up-required'),
    );
    const providerHealthDriftSummary = summarizeProviderHealthDriftItems(
      items.filter((item) => item.actionClass === 'provider-health-drift-required'),
    );
    const providerCounts = {};
    const workspaceCounts = {};
    const actionClassCounts = {
      awaitingHumanDecision: 0,
      blocked: 0,
      providerHealthDriftRequired: 0,
      handoffRequired: 0,
      maintenanceRequired: 0,
      monitoringRequired: 0,
      providerAttentionRequired: 0,
      retryReady: 0,
      specialistFollowUpRequired: 0,
      total: items.length,
    };
    const actionCounts = {
      acceptedRiskMonitoring: 0,
      approval: 0,
      blockedFollowUp: 0,
      maintenanceSweep: 0,
      ownerHandoff: 0,
      providerAttention: 0,
      providerHealthDrift: 0,
      reviewerFollowUp: 0,
      specialistFollowUp: 0,
      total: items.length,
    };
    const ownerCounts = Object.fromEntries(ACTION_OWNERS.map((owner) => [owner, 0]));
    const effectiveOwnerCounts = Object.fromEntries(ACTION_OWNERS.map((owner) => [owner, 0]));
    const priorityCounts = Object.fromEntries(ACTION_PRIORITIES.map((priority) => [priority, 0]));
    const reminderCounts = {
      eligible: 0,
      needsReminder: 0,
      notNeeded: 0,
      total: items.length,
    };
    const overdueCounts = {
      overdue: 0,
      onTime: 0,
      total: items.length,
    };
    let latestReminderAt = null;
    let nextReminderAt = null;

    for (const item of items) {
      if (item.providerId) {
        providerCounts[item.providerId] = (providerCounts[item.providerId] || 0) + 1;
      }

      if (item.workspaceId) {
        workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
      }

      if (item.actionType === 'approval') {
        actionCounts.approval += 1;
      }

      if (item.actionType === 'accepted-risk-monitoring') {
        actionCounts.acceptedRiskMonitoring += 1;
      }

      if (item.actionType === 'blocked-follow-up') {
        actionCounts.blockedFollowUp += 1;
      }

      if (item.actionType === 'maintenance-sweep') {
        actionCounts.maintenanceSweep += 1;
      }

      if (item.actionType === 'owner-handoff') {
        actionCounts.ownerHandoff += 1;
      }

      if (item.actionType === 'provider-attention') {
        actionCounts.providerAttention += 1;
      }

      if (item.actionType === 'provider-health-drift') {
        actionCounts.providerHealthDrift += 1;
      }

      if (item.actionType === 'reviewer-follow-up') {
        actionCounts.reviewerFollowUp += 1;
      }

      if (item.actionType === 'specialist-follow-up') {
        actionCounts.specialistFollowUp += 1;
      }

      if (item.actionClass === 'awaiting-human-decision') {
        actionClassCounts.awaitingHumanDecision += 1;
      }

      if (item.actionClass === 'blocked') {
        actionClassCounts.blocked += 1;
      }

      if (item.actionClass === 'handoff-required') {
        actionClassCounts.handoffRequired += 1;
      }

      if (item.actionClass === 'maintenance-required') {
        actionClassCounts.maintenanceRequired += 1;
      }

      if (item.actionClass === 'monitoring-required') {
        actionClassCounts.monitoringRequired += 1;
      }

      if (item.actionClass === 'provider-attention-required') {
        actionClassCounts.providerAttentionRequired += 1;
      }

      if (item.actionClass === 'provider-health-drift-required') {
        actionClassCounts.providerHealthDriftRequired += 1;
      }

      if (item.actionClass === 'retry-ready') {
        actionClassCounts.retryReady += 1;
      }

      if (item.actionClass === 'specialist-follow-up-required') {
        actionClassCounts.specialistFollowUpRequired += 1;
      }

      if (ownerCounts[item.recommendedOwner] !== undefined) {
        ownerCounts[item.recommendedOwner] += 1;
      }

      if (effectiveOwnerCounts[item.effectiveRecommendedOwner || item.recommendedOwner] !== undefined) {
        effectiveOwnerCounts[item.effectiveRecommendedOwner || item.recommendedOwner] += 1;
      }

      if (priorityCounts[item.priority] !== undefined) {
        priorityCounts[item.priority] += 1;
      }

      const reminderState = getActionInboxReminderState(item);

      if (reminderState.hasReminder) {
        reminderCounts.eligible += 1;

        if (reminderState.needsReminder) {
          reminderCounts.needsReminder += 1;
        } else {
          reminderCounts.notNeeded += 1;
        }

        if (
          reminderState.nextReminderAt &&
          (!nextReminderAt || String(nextReminderAt) > String(reminderState.nextReminderAt))
        ) {
          nextReminderAt = reminderState.nextReminderAt;
        }

        if (
          reminderState.lastReminderAt &&
          (!latestReminderAt || String(latestReminderAt) < String(reminderState.lastReminderAt))
        ) {
          latestReminderAt = reminderState.lastReminderAt;
        }
      }

      if (item.isOverdue) {
        overdueCounts.overdue += 1;
      } else {
        overdueCounts.onTime += 1;
      }
    }

    return {
      actionCounts,
      actionClassCounts,
      effectiveOwnerCounts,
      ownerCounts,
      pendingActionCount: items.length,
      priorityCounts,
      providerCounts,
      reminderCounts,
      latestReminderAt,
      nextReminderAt,
      overdueCounts,
      providerHealthDriftOverdueCount: providerHealthDriftSummary.overdueCount,
      providerHealthDriftProviderCounts: providerHealthDriftSummary.providerCounts,
      providerHealthDriftReasonCodeCounts: providerHealthDriftSummary.reasonCodeCounts,
      specialistFollowUpKindCounts: specialistFollowUpSummary.specialistKindCounts,
      specialistFollowUpLatestReminderAt: specialistFollowUpSummary.latestReminderAt,
      specialistFollowUpNeedsReminderCount: specialistFollowUpSummary.needsReminderCount,
      specialistFollowUpNextReminderAt: specialistFollowUpSummary.nextReminderAt,
      specialistFollowUpOverdueCount: specialistFollowUpSummary.overdueCount,
      specialistFollowUpProviderCounts: specialistFollowUpSummary.providerCounts,
      specialistFollowUpReminderCountTotal: specialistFollowUpSummary.reminderCountTotal,
      specialistFollowUpRetryPolicyCounts: specialistFollowUpSummary.retryPolicyCounts,
      specialistFollowUpStatusCounts: specialistFollowUpSummary.statusCounts,
      workspaceCounts,
    };
  }

  function getApprovalInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }

    const items = buildApprovalInboxItems(filter);
    const byWorkspace = {};

    for (const item of items) {
      byWorkspace[item.workspaceId] = (byWorkspace[item.workspaceId] || 0) + 1;
    }

    return {
      items,
      summary: {
        pendingCount: items.length,
        workspaceCounts: byWorkspace,
      },
    };
  }

  function syncEscalations(filter = {}) {
    const currentTimestamp = now();
    const candidates = store.listEscalations({
      missionId: filter.missionId,
      owner: filter.owner,
      status: filter.status,
      workspaceId: filter.workspaceId,
    });
    const results = [];

    for (const escalation of candidates) {
      const previousEffectiveOwner = escalation.currentEffectiveOwner || enrichEscalation(escalation).effectiveRecommendedOwner;
      const nextTier = deriveEscalationTier(escalation);
      const previousTier = escalation.currentTier || deriveEscalationTier(escalation);
      const existingHistory = Array.isArray(escalation.tierHistory) ? escalation.tierHistory : [];
      const tierHistory =
        existingHistory.length > 0
          ? [...existingHistory]
          : [buildInitialTierHistoryEntry(previousTier, escalation.createdAt || currentTimestamp, 'backfilled')];
      const existingOwnerHistory = Array.isArray(escalation.ownerHistory) ? escalation.ownerHistory : [];
      const ownerHistory =
        existingOwnerHistory.length > 0
          ? [...existingOwnerHistory]
          : [buildInitialOwnerHistoryEntry(previousEffectiveOwner, escalation.createdAt || currentTimestamp, 'backfilled')];
      let breachCount = Number.isFinite(Number(escalation.breachCount)) ? Number(escalation.breachCount) : 0;
      let lastBreachAt = escalation.lastBreachAt || null;
      let lastOwnerEscalatedAt = escalation.lastOwnerEscalatedAt || null;
      let changed =
        !escalation.currentTier ||
        !escalation.lastSyncedAt ||
        existingHistory.length === 0 ||
        !escalation.currentEffectiveOwner ||
        existingOwnerHistory.length === 0;

      if (nextTier !== previousTier) {
        tierHistory.push({
          at: currentTimestamp,
          from: previousTier,
          reason: 'sync',
          to: nextTier,
        });
        changed = true;

        if (isBreachTier(nextTier)) {
          breachCount += 1;
          lastBreachAt = currentTimestamp;
        }
      }

      const effectiveOwnerPreview = enrichEscalation({
        ...escalation,
        breachCount,
        currentTier: nextTier,
        lastBreachAt,
        lastSyncedAt: currentTimestamp,
        tierHistory,
      }).effectiveRecommendedOwner;

      if (effectiveOwnerPreview !== previousEffectiveOwner) {
        ownerHistory.push({
          at: currentTimestamp,
          from: previousEffectiveOwner,
          reason: 'sync-owner-chain',
          to: effectiveOwnerPreview,
        });
        lastOwnerEscalatedAt = currentTimestamp;
        changed = true;
      }

      const basePatch = {
        breachCount,
        currentTier: nextTier,
        currentEffectiveOwner: effectiveOwnerPreview,
        lastBreachAt,
        lastOwnerEscalatedAt,
        lastSyncedAt: currentTimestamp,
        ownerHistory,
        tierHistory,
        updatedAt: escalation.updatedAt,
      };

      if (changed) {
        const updated = store.updateEscalation(escalation.id, (current) => ({
          ...current,
          breachCount: basePatch.breachCount,
          currentTier: basePatch.currentTier,
          currentEffectiveOwner: basePatch.currentEffectiveOwner,
          lastBreachAt: basePatch.lastBreachAt,
          lastOwnerEscalatedAt: basePatch.lastOwnerEscalatedAt,
          lastSyncedAt: basePatch.lastSyncedAt,
          ownerHistory: basePatch.ownerHistory,
          tierHistory: basePatch.tierHistory,
        }));

        results.push({
          breachCount: updated.breachCount,
          currentTier: updated.currentTier,
          effectiveRecommendedOwner: updated.currentEffectiveOwner || effectiveOwnerPreview,
          escalationId: updated.id,
          ownerTransitionRecorded: effectiveOwnerPreview !== previousEffectiveOwner,
          transitionRecorded: nextTier !== previousTier,
        });
        continue;
      }

      const updated = store.updateEscalation(escalation.id, (current) => ({
        ...current,
        currentEffectiveOwner: basePatch.currentEffectiveOwner,
        lastSyncedAt: currentTimestamp,
        ownerHistory: basePatch.ownerHistory,
      }));

      results.push({
        breachCount: updated.breachCount || breachCount,
        currentTier: updated.currentTier || nextTier,
        effectiveRecommendedOwner: updated.currentEffectiveOwner || effectiveOwnerPreview,
        escalationId: updated.id,
        ownerTransitionRecorded: false,
        transitionRecorded: false,
      });
    }

    return {
      items: results,
      summary: {
        breachCountTotal: results.reduce((count, item) => count + Number(item.breachCount || 0), 0),
        ownerTransitionedCount: results.filter((item) => item.ownerTransitionRecorded).length,
        syncedCount: results.length,
        transitionedCount: results.filter((item) => item.transitionRecorded).length,
      },
    };
  }

  function getActionInbox(filter = {}) {
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

    const items = [
      ...buildApprovalInboxItems(filter),
      ...buildMaintenanceActionItems(filter),
      ...buildOwnerHandoffActionItems(filter),
      ...buildProviderAttentionItems(filter),
      ...buildProviderHealthDriftActionItems(filter),
      ...buildSpecialistFollowUpItems(filter),
      ...buildAcceptedRiskMonitoringItems(filter),
      ...buildBlockedFollowUpItems(filter),
      ...buildReviewerFollowUpItems(filter),
    ]
      .filter((item) => {
        if (filter.actionClass && item.actionClass !== filter.actionClass) {
          return false;
        }
        if (filter.providerId && item.providerId !== filter.providerId) {
          return false;
        }
        if (filter.priority && item.priority !== filter.priority) {
          return false;
        }
        if (filter.owner && item.recommendedOwner !== filter.owner) {
          return false;
        }
        if (filter.effectiveOwner && (item.effectiveRecommendedOwner || item.recommendedOwner) !== filter.effectiveOwner) {
          return false;
        }
        if (filter.needsReminderOnly && !getActionInboxReminderState(item).needsReminder) {
          return false;
        }
        if (filter.overdueOnly && !item.isOverdue) {
          return false;
        }
        return true;
      })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        actionClass: filter.actionClass || null,
        effectiveOwner: filter.effectiveOwner || null,
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        priority: filter.priority || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeActionInbox(items),
    };
  }

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
    const summary = summarizeActionInbox(overdueInbox.items);
    const content = buildOverdueIncidentContent({
      filters: overdueInbox.filters,
      items: overdueInbox.items,
      summary,
    });
    const path = docService.logDocument({
      type: 'incident',
      title,
      content,
    });
    const escalationIds = overdueInbox.items.map((item) => {
      const existingOpenEscalation =
        store
          .listEscalations({
            actionId: item.actionId,
            status: 'open',
          })
          .at(-1) || null;

      if (existingOpenEscalation) {
        const updatedEscalation = store.updateEscalation(existingOpenEscalation.id, (escalation) => ({
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
        }));

        return updatedEscalation.id;
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

  function getEscalatedInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.effectiveOwner && !ACTION_OWNERS.includes(filter.effectiveOwner)) {
      throw new Error(`Unsupported effective action owner: ${filter.effectiveOwner}`);
    }
    if (filter.status && !ESCALATION_STATUSES.includes(filter.status)) {
      throw new Error(`Unsupported escalation status: ${filter.status}`);
    }
    if (filter.tier && !ESCALATION_TIERS.includes(filter.tier)) {
      throw new Error(`Unsupported escalation tier: ${filter.tier}`);
    }

    const syncResult = syncEscalations({
      missionId: filter.missionId,
      owner: filter.owner,
      status: filter.status,
      workspaceId: filter.workspaceId,
    });

    const effectiveStatus = filter.status || 'open';
    const items = store
      .listEscalations({
        missionId: filter.missionId,
        owner: filter.owner,
        status: effectiveStatus,
        workspaceId: filter.workspaceId,
      })
      .map((item) => enrichEscalation(item))
      .filter((item) => {
        if (filter.effectiveOwner && item.effectiveRecommendedOwner !== filter.effectiveOwner) {
          return false;
        }
        if (filter.tier && item.escalationTier !== filter.tier) {
          return false;
        }
        if (filter.needsReminderOnly && !item.needsReminder) {
          return false;
        }
        return true;
      })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        missionId: filter.missionId || null,
        effectiveOwner: filter.effectiveOwner || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        owner: filter.owner || null,
        status: effectiveStatus,
        tier: filter.tier || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        ...summarizeEscalations(items),
        sync: syncResult.summary,
      },
    };
  }

  function remindEscalations(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.tier && !ESCALATION_TIERS.includes(filter.tier)) {
      throw new Error(`Unsupported escalation tier: ${filter.tier}`);
    }

    syncEscalations({
      missionId: filter.missionId,
      owner: filter.owner,
      status: 'open',
      workspaceId: filter.workspaceId,
    });

    const reminderTimestamp = now();
    const note = normalizeText(filter.note);
    const candidates = store
      .listEscalations({
        missionId: filter.missionId,
        owner: filter.owner,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((item) => enrichEscalation(item))
      .filter((item) => {
        if (filter.tier && item.escalationTier !== filter.tier) {
          return false;
        }
        if (filter.excludePendingOwnerHandoff && item.pendingOwnerHandoff) {
          return false;
        }
        if (filter.dueOnly && !item.needsReminder) {
          return false;
        }
        if (filter.overdueOnly && !item.isOverdue) {
          return false;
        }
        return true;
      });

    const items = candidates
      .map((item) =>
        store.updateEscalation(item.id, (current) => {
          const normalizedCurrent = enrichEscalation(current);
          const reminderEntry = {
            at: reminderTimestamp,
            note: buildEscalationReminderNote(normalizedCurrent, note),
            owner: normalizedCurrent.recommendedOwner || 'workspace-owner',
            overdue: normalizedCurrent.isOverdue,
            tier:
              normalizedCurrent.currentTier ||
              normalizedCurrent.escalationTier ||
              deriveEscalationTier(normalizedCurrent),
          };

          return {
            ...current,
            lastReminderAt: reminderTimestamp,
            reminderCount: Number(normalizedCurrent.reminderCount || 0) + 1,
            reminderHistory: [...normalizedCurrent.reminderHistory, reminderEntry],
            updatedAt: reminderTimestamp,
          };
        }),
      )
      .map((item) => enrichEscalation(item))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        excludePendingOwnerHandoff: Boolean(filter.excludePendingOwnerHandoff),
        missionId: filter.missionId || null,
        note: note || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        tier: filter.tier || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        dueCandidateCount: candidates.filter((item) => item.needsReminder).length,
        latestReminderAt:
          [...items]
            .map((item) => item.lastReminderAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(-1) || null,
        overdueReminderCount: items.filter((item) => item.isOverdue).length,
        reminderCountTotal: items.reduce((count, item) => count + Number(item.reminderCount || 0), 0),
        remindedCount: items.length,
      },
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
    const beforePressure = listMaintenancePressureEntries({
      missionId: filter.missionId,
      owner: filter.owner,
      workspaceId: filter.workspaceId,
    });
    const beforePressureSummary = summarizeMaintenancePressure(beforePressure);
    const sync = syncEscalations({
      missionId: filter.missionId,
      owner: filter.owner,
      status: 'open',
      workspaceId: filter.workspaceId,
    });
    const escalationReminders = remindEscalations({
      dueOnly: true,
      excludePendingOwnerHandoff: true,
      missionId: filter.missionId,
      note,
      owner: filter.owner,
      workspaceId: filter.workspaceId,
    });
    const ownerHandoffReminders = remindOwnerHandoffs(
      {
        dueOnly: true,
        missionId: filter.missionId,
        owner: filter.owner,
        workspaceId: filter.workspaceId,
      },
      note,
    );
    const providerAttentionReminders = remindProviderAttention(
      {
        dueOnly: true,
        missionId: filter.missionId,
        owner: filter.owner,
        workspaceId: filter.workspaceId,
      },
      note,
    );
    const specialistFollowUpReminders = remindSpecialistFollowUps(
      {
        dueOnly: true,
        missionId: filter.missionId,
        owner: filter.owner,
        workspaceId: filter.workspaceId,
      },
      note,
    );
    const afterPressure = listMaintenancePressureEntries({
      missionId: filter.missionId,
      owner: filter.owner,
      workspaceId: filter.workspaceId,
    });
    const afterPressureSummary = summarizeMaintenancePressure(afterPressure);
    const afterPressureIds = new Set(afterPressure.map((entry) => entry.actionId));
    const acknowledgedActionIds = beforePressure.map((entry) => entry.actionId);
    const resolvedActionIds = acknowledgedActionIds.filter((actionId) => !afterPressureIds.has(actionId));
    const remainingActionIds = afterPressure.map((entry) => entry.actionId);

    const latestReminderAt = [
      escalationReminders.summary.latestReminderAt,
      ownerHandoffReminders.summary.latestReminderAt,
      providerAttentionReminders.summary.latestReminderAt,
      specialistFollowUpReminders.summary.latestReminderAt,
    ]
      .filter(Boolean)
      .sort((left, right) => String(left).localeCompare(String(right)))
      .at(-1) || null;
    const affectedMissionSummaryMap = new Map();

    for (const item of escalationReminders.items) {
      if (!item.missionId) {
        continue;
      }

      const current = affectedMissionSummaryMap.get(item.missionId) || {
        escalationRemindedCount: 0,
        missionId: item.missionId,
        ownerHandoffRemindedCount: 0,
        providerAttentionRemindedCount: 0,
        specialistFollowUpRemindedCount: 0,
        totalRemindedCount: 0,
      };
      current.escalationRemindedCount += 1;
      current.totalRemindedCount += 1;
      affectedMissionSummaryMap.set(item.missionId, current);
    }

    for (const item of ownerHandoffReminders.items) {
      if (!item.missionId) {
        continue;
      }

      const current = affectedMissionSummaryMap.get(item.missionId) || {
        escalationRemindedCount: 0,
        missionId: item.missionId,
        ownerHandoffRemindedCount: 0,
        providerAttentionRemindedCount: 0,
        specialistFollowUpRemindedCount: 0,
        totalRemindedCount: 0,
      };
      current.ownerHandoffRemindedCount += 1;
      current.totalRemindedCount += 1;
      affectedMissionSummaryMap.set(item.missionId, current);
    }

    for (const item of providerAttentionReminders.items) {
      if (!item.missionId) {
        continue;
      }

      const current = affectedMissionSummaryMap.get(item.missionId) || {
        escalationRemindedCount: 0,
        missionId: item.missionId,
        ownerHandoffRemindedCount: 0,
        providerAttentionRemindedCount: 0,
        specialistFollowUpRemindedCount: 0,
        totalRemindedCount: 0,
      };
      current.providerAttentionRemindedCount += 1;
      current.totalRemindedCount += 1;
      affectedMissionSummaryMap.set(item.missionId, current);
    }

    for (const item of specialistFollowUpReminders.items) {
      if (!item.missionId) {
        continue;
      }

      const current = affectedMissionSummaryMap.get(item.missionId) || {
        escalationRemindedCount: 0,
        missionId: item.missionId,
        ownerHandoffRemindedCount: 0,
        providerAttentionRemindedCount: 0,
        specialistFollowUpRemindedCount: 0,
        totalRemindedCount: 0,
      };
      current.specialistFollowUpRemindedCount += 1;
      current.totalRemindedCount += 1;
      affectedMissionSummaryMap.set(item.missionId, current);
    }

    const affectedMissionSummaries = [...affectedMissionSummaryMap.values()].sort((left, right) =>
      String(left.missionId).localeCompare(String(right.missionId)),
    );
    const affectedMissionIds = affectedMissionSummaries.map((item) => item.missionId);

    const summary = {
      acknowledgedMaintenanceRequiredCount: acknowledgedActionIds.length,
      afterDueCandidateCountTotal: Number(afterPressureSummary.currentDueCandidateCountTotal || 0),
      afterMaintenanceRequiredCount: Number(afterPressureSummary.maintenanceRequiredCount || 0),
      beforeDueCandidateCountTotal: Number(beforePressureSummary.currentDueCandidateCountTotal || 0),
      beforeMaintenanceRequiredCount: Number(beforePressureSummary.maintenanceRequiredCount || 0),
      dueCandidateCountTotal:
        Number(escalationReminders.summary.dueCandidateCount || 0) +
        Number(ownerHandoffReminders.summary.dueCandidateCount || 0) +
        Number(providerAttentionReminders.summary.dueCandidateCount || 0) +
        Number(specialistFollowUpReminders.summary.dueCandidateCount || 0),
      escalationRemindedCount: Number(escalationReminders.summary.remindedCount || 0),
      latestReminderAt,
      ownerHandoffRemindedCount: Number(ownerHandoffReminders.summary.remindedCount || 0),
      providerAttentionRemindedCount: Number(providerAttentionReminders.summary.remindedCount || 0),
      specialistFollowUpRemindedCount: Number(specialistFollowUpReminders.summary.remindedCount || 0),
      remainingMaintenanceRequiredCount: remainingActionIds.length,
      resolvedMaintenanceRequiredCount: resolvedActionIds.length,
      syncedCount: Number(sync.summary.syncedCount || 0),
      totalRemindedCount:
        Number(escalationReminders.summary.remindedCount || 0) +
        Number(ownerHandoffReminders.summary.remindedCount || 0) +
        Number(providerAttentionReminders.summary.remindedCount || 0) +
        Number(specialistFollowUpReminders.summary.remindedCount || 0),
    };

    const maintenanceRun = store.saveMaintenanceRun({
      acknowledgedActionIds,
      acknowledgedMaintenanceRequiredCount: summary.acknowledgedMaintenanceRequiredCount,
      afterPressureSummary,
      beforePressureSummary,
      createdAt: now(),
      dueCandidateCountTotal: summary.dueCandidateCountTotal,
      escalationRemindedCount: summary.escalationRemindedCount,
      escalationRemindersSummary: escalationReminders.summary,
      filters: {
        missionId: filter.missionId || null,
        note: note || null,
        owner: filter.owner || null,
        workspaceId: filter.workspaceId || null,
      },
      affectedMissionIds,
      affectedMissionSummaries,
      id: createId('maintenance'),
      latestReminderAt: summary.latestReminderAt,
      missionId: filter.missionId || null,
      note: note || null,
      owner: filter.owner || null,
      ownerHandoffRemindedCount: summary.ownerHandoffRemindedCount,
      ownerHandoffRemindersSummary: ownerHandoffReminders.summary,
      providerAttentionRemindedCount: summary.providerAttentionRemindedCount,
      providerAttentionRemindersSummary: providerAttentionReminders.summary,
      specialistFollowUpRemindedCount: summary.specialistFollowUpRemindedCount,
      specialistFollowUpRemindersSummary: specialistFollowUpReminders.summary,
      remainingActionIds,
      remainingMaintenanceRequiredCount: summary.remainingMaintenanceRequiredCount,
      resolvedActionIds,
      resolvedMaintenanceRequiredCount: summary.resolvedMaintenanceRequiredCount,
      syncedCount: summary.syncedCount,
      syncSummary: sync.summary,
      totalRemindedCount: summary.totalRemindedCount,
      workspaceId: filter.workspaceId || null,
    });

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

    const items = listMaintenanceOverviewRuns({
      ...filter,
      since,
    });
    const current = listMaintenancePressureEntries(filter);
    const dailyBuckets = buildMaintenanceDailyBuckets(items);
    const latestBucketDelta = buildMaintenanceLatestBucketDelta(dailyBuckets);
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
        oldestBucketDate: dailyBuckets.at(-1)?.date || null,
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

  function getOwnerHandoffInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.status && !['pending', 'acknowledged'].includes(filter.status)) {
      throw new Error(`Unsupported owner handoff status: ${filter.status}`);
    }

    syncEscalations({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });

    const effectiveStatus = filter.status || 'pending';
    const items = store
      .listEscalations({
        missionId: filter.missionId,
        workspaceId: filter.workspaceId,
      })
      .map((item) => enrichEscalation(item))
      .filter((item) => {
        if (filter.owner) {
          const targetOwner =
            (effectiveStatus === 'pending' ? item.latestOwnerTransition?.to : item.latestOwnerHandoff?.owner) ||
            item.effectiveRecommendedOwner;
          if (targetOwner !== filter.owner) {
            return false;
          }
        }

        if (effectiveStatus === 'pending') {
          return item.pendingOwnerHandoff;
        }

        return !item.pendingOwnerHandoff && item.ownerHandoffCount > 0;
      })
      .map((item) => {
        const latestOwnerTransition = item.latestOwnerTransition;
        const latestOwnerHandoff = item.latestOwnerHandoff;
        const targetOwner =
          (effectiveStatus === 'pending' ? latestOwnerTransition?.to : latestOwnerHandoff?.owner) ||
          item.effectiveRecommendedOwner;
        const handoffDueAt = effectiveStatus === 'pending' ? item.ownerHandoffDueAt : latestOwnerHandoff?.dueAt || null;
        const handoffIsOverdue =
          effectiveStatus === 'pending' ? item.ownerHandoffIsOverdue : Boolean(latestOwnerHandoff?.wasOverdue);
        const handoffSlaHours =
          effectiveStatus === 'pending'
            ? item.ownerHandoffSlaHours
            : latestOwnerHandoff?.slaHours || deriveOwnerHandoffSlaHours(targetOwner);
        const handoffLatestReminderAt = item.latestOwnerHandoffReminderAt;
        const handoffNeedsReminder = effectiveStatus === 'pending' ? item.ownerHandoffNeedsReminder : false;
        const handoffNextReminderAt = effectiveStatus === 'pending' ? item.nextOwnerHandoffReminderAt : null;
        const handoffReminderCadenceHours = item.ownerHandoffReminderCadenceHours;
        const handoffReminderCount = item.ownerHandoffReminderCount;

        return {
          escalationId: item.id,
          handoffDueAt,
          handoffIsOverdue,
          handoffLatestReminderAt,
          handoffNeedsReminder,
          handoffNextReminderAt,
          handoffReminderCadenceHours,
          handoffReminderCount,
          handoffSlaHours,
          handoffStatus: effectiveStatus,
          latestOwnerHandoffAt: item.latestOwnerHandoffAt,
          ownerHandoffCount: item.ownerHandoffCount,
          ownerTransitionAt: latestOwnerTransition?.at || null,
          ownerTransitionDetail: latestOwnerTransition ? formatEscalationOwnerChangeDetail(latestOwnerTransition) : null,
          ownerTransitionTo: latestOwnerTransition?.to || null,
          ownerTransitionFrom: latestOwnerTransition?.from || null,
          pendingOwnerHandoff: item.pendingOwnerHandoff,
          recommendedCommand:
            effectiveStatus === 'pending'
              ? `node src/cli.mjs action acknowledge-owner-handoff ${item.id} --note "<note>"`
              : null,
          sessionId: item.sessionId,
          title: item.title,
          workspaceId: item.workspaceId,
          workspaceName: item.workspaceName,
          missionId: item.missionId,
          targetOwner,
          lastHandoffNote: latestOwnerHandoff?.note || null,
        };
      })
      .filter((item) => !filter.needsReminderOnly || item.handoffNeedsReminder)
      .filter((item) => !filter.overdueOnly || item.handoffIsOverdue)
      .sort((left, right) =>
        String(left.handoffDueAt || left.ownerTransitionAt || left.latestOwnerHandoffAt || '').localeCompare(
          String(right.handoffDueAt || right.ownerTransitionAt || right.latestOwnerHandoffAt || ''),
        ),
      );

    const ownerCounts = {};
    for (const item of items) {
      ownerCounts[item.targetOwner] = (ownerCounts[item.targetOwner] || 0) + 1;
    }

    return {
      filters: {
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        status: effectiveStatus,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        nextDueAt:
          items
            .map((item) => item.handoffDueAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null,
        nextReminderAt:
          items
            .map((item) => item.handoffNextReminderAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null,
        needsReminderCount: items.filter((item) => item.handoffNeedsReminder).length,
        ownerCounts,
        overdueCount: items.filter((item) => item.handoffIsOverdue).length,
        pendingCount: items.filter((item) => item.handoffStatus === 'pending').length,
        reminderCountTotal: items.reduce((count, item) => count + Number(item.handoffReminderCount || 0), 0),
        total: items.length,
      },
    };
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

  function getSpecialistFollowUpInbox(filter = {}) {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.status && !['blocked', 'failed'].includes(filter.status)) {
      throw new Error(`Unsupported specialist follow-up status: ${filter.status}`);
    }

    const items = buildSpecialistFollowUpItems(filter)
      .filter((item) => !filter.status || item.status === filter.status)
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue);

    return {
      filters: {
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        status: filter.status || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeSpecialistFollowUpItems(items),
    };
  }

  function remindSpecialistFollowUps(filter = {}, note = '') {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.status && !['blocked', 'failed'].includes(filter.status)) {
      throw new Error(`Unsupported specialist follow-up status: ${filter.status}`);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    const reminderTimestamp = now();
    const normalizedNote = normalizeText(note);
    const candidates = buildSpecialistFollowUpItems({
      missionId: filter.missionId,
      needsReminderOnly: Boolean(filter.dueOnly),
      overdueOnly: Boolean(filter.overdueOnly),
      providerId: filter.providerId,
      workspaceId: filter.workspaceId,
    })
      .filter((item) => !filter.status || item.status === filter.status)
      .filter((item) => !filter.owner || item.recommendedOwner === filter.owner);

    const items = candidates
      .map((item) =>
        store.saveSpecialistFollowUpReminder({
          actionId: item.actionId,
          createdAt: reminderTimestamp,
          dueAt: item.dueAt,
          id: createId('specialist-follow-up-reminder'),
          missionId: item.missionId,
          note: buildSpecialistFollowUpReminderNote(item, normalizedNote),
          overdue: item.isOverdue,
          parallelGroupId: item.parallelGroupId,
          priority: item.priority,
          providerId: item.providerId || null,
          remindedAt: reminderTimestamp,
          reminderCadenceHours: item.reminderCadenceHours,
          runId: item.runId || item.specialistRootRunId || null,
          sessionId: item.sessionId || null,
          slaHours: item.slaHours,
          specialistKind: item.specialistKind,
          status: item.status,
          title: item.title,
          workspaceId: item.workspaceId || null,
          workspaceName: item.workspaceName || null,
        }),
      )
      .map((record) => ({
        ...record,
        detail: formatSpecialistFollowUpReminderDetail(record),
      }))
      .sort((left, right) =>
        String(left.remindedAt || left.createdAt || '').localeCompare(String(right.remindedAt || right.createdAt || '')),
      );

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        missionId: filter.missionId || null,
        note: normalizedNote || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        status: filter.status || null,
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
        remindedCount: items.length,
      },
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
        store.saveProviderAttentionReminder({
          actionId: item.actionId,
          createdAt: reminderTimestamp,
          dueAt: item.dueAt,
          eventFamily: item.eventFamily,
          eventKind: item.eventKind,
          eventRefId: item.eventRefId,
          id: createId('provider-attention-reminder'),
          missionId: item.missionId,
          note: buildProviderAttentionReminderNote(item, normalizedNote),
          overdue: item.isOverdue,
          priority: item.priority,
          providerDisplayName: item.providerDisplayName,
          providerId: item.providerId,
          remindedAt: reminderTimestamp,
          reminderCadenceHours: item.reminderCadenceHours,
          sessionId: item.sessionId || null,
          slaHours: item.slaHours,
          title: item.title,
          workspaceId: item.workspaceId || null,
          workspaceName: item.workspaceName || null,
        }),
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

  function remindOwnerHandoffs(filter = {}, note = '') {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    syncEscalations({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });

    const reminderTimestamp = now();
    const candidates = store
      .listEscalations({
        missionId: filter.missionId,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((item) => enrichEscalation(item))
      .filter((item) => item.pendingOwnerHandoff)
      .filter((item) => !filter.owner || item.ownerHandoffTargetOwner === filter.owner)
      .filter((item) => !filter.dueOnly || item.ownerHandoffNeedsReminder)
      .filter((item) => !filter.overdueOnly || item.ownerHandoffIsOverdue);

    const items = candidates
      .map((item) =>
        store.updateEscalation(item.id, (current) => {
          const normalizedCurrent = enrichEscalation(current);
          const reminderEntry = {
            at: reminderTimestamp,
            dueAt: normalizedCurrent.ownerHandoffDueAt,
            note: buildOwnerHandoffReminderNote(normalizedCurrent, note),
            owner: normalizedCurrent.ownerHandoffTargetOwner || normalizedCurrent.effectiveRecommendedOwner,
            overdue: normalizedCurrent.ownerHandoffIsOverdue,
            reminderCadenceHours: normalizedCurrent.ownerHandoffReminderCadenceHours,
            slaHours: normalizedCurrent.ownerHandoffSlaHours,
            transitionAt: normalizedCurrent.latestOwnerTransition?.at || null,
            transitionTo: normalizedCurrent.ownerHandoffTargetOwner || normalizedCurrent.effectiveRecommendedOwner,
          };

          return {
            ...current,
            lastOwnerHandoffReminderAt: reminderTimestamp,
            ownerHandoffReminderHistory: [...normalizedCurrent.ownerHandoffReminderHistory, reminderEntry],
            updatedAt: reminderTimestamp,
          };
        }),
      )
      .map((item) => enrichEscalation(item))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        missionId: filter.missionId || null,
        note: note || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        dueCandidateCount: candidates.filter((item) => item.ownerHandoffNeedsReminder).length,
        latestReminderAt:
          [...items]
            .map((item) => item.latestOwnerHandoffReminderAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(-1) || null,
        overdueReminderCount: items.filter((item) => item.ownerHandoffIsOverdue).length,
        reminderCountTotal: items.reduce((count, item) => count + Number(item.ownerHandoffReminderCount || 0), 0),
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
    return store.saveProviderAttentionAcknowledgement({
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
      id: createId('provider-attention-ack'),
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
    });
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
    return store.updateProviderAttentionAcknowledgement(record.id, (current) => ({
      ...current,
      resolutionNote: normalizeText(note, 'Provider attention resolved.'),
      resolvedAt,
      status: 'resolved',
    }));
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

  async function remediateProviderAttention(actionId) {
    const actionState = getProviderAttentionActionState(actionId);
    if (!actionState) {
      throw new Error(`Provider attention item not found: ${actionId}`);
    }
    if (['resolved', 'recovered'].includes(actionState.status)) {
      throw new Error(`Provider attention is already closed: ${actionId}`);
    }

    const attentionItem = actionState.item;
    let remediationKind = '';
    let result = null;

    if (attentionItem.eventFamily === 'probe') {
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

      remediationKind = 'mission-rerun';
      const rerun = await runMission(attentionItem.missionId, {
        provider: attentionItem.providerId,
        providerSpecified: true,
      });
      result = {
        approvalId: rerun.approval?.id || null,
        artifactPath: rerun.artifactPath || null,
        missionId: rerun.mission.id,
        missionStatus: rerun.mission.status,
        provider: rerun.provider,
        reviewerVerdict: rerun.reviewerVerdict || null,
        sessionId: rerun.session?.id || null,
      };
    } else {
      throw new Error(`Unsupported provider attention event family: ${attentionItem.eventFamily}`);
    }

    return {
      actionId,
      eventFamily: attentionItem.eventFamily,
      missionId: attentionItem.missionId || null,
      postAttention: summarizeProviderAttentionScopedState({
        missionId: attentionItem.missionId || null,
        providerId: attentionItem.providerId,
        workspaceId: attentionItem.workspaceId || null,
      }),
      previousStatus: actionState.status,
      providerId: attentionItem.providerId,
      remediationKind,
      result,
      workspaceId: attentionItem.workspaceId || null,
    };
  }

  async function remediateSpecialistFollowUp(actionId) {
    const actionState = getSpecialistFollowUpActionState(actionId);
    if (!actionState) {
      throw new Error(`Specialist follow-up item not found: ${actionId}`);
    }

    const followUpItem = actionState.item;
    if (!followUpItem.missionId) {
      throw new Error(`Specialist follow-up is missing mission context: ${actionId}`);
    }

    const providerId = normalizeText(followUpItem.providerId, 'stub');
    const rerun = await runMission(followUpItem.missionId, {
      provider: providerId,
      providerSpecified: true,
    });
    const latestParallelGroup = getLatestParallelGroupState(followUpItem.missionId);

    return {
      actionId,
      missionId: followUpItem.missionId,
      parallelGroupId: followUpItem.parallelGroupId || null,
      postFollowUp: summarizeSpecialistFollowUpScopedState({
        missionId: followUpItem.missionId,
        parallelGroupId: followUpItem.parallelGroupId || null,
        providerId,
      }),
      previousStatus: actionState.status,
      providerId,
      remediationKind: 'mission-rerun',
      result: {
        approvalId: rerun.approval?.id || null,
        artifactPath: rerun.artifactPath || null,
        missionId: rerun.mission.id,
        missionStatus: rerun.mission.status,
        parallelGroupId: latestParallelGroup?.parallelGroupId || null,
        provider: rerun.provider,
        reviewerVerdict: rerun.reviewerVerdict || null,
        sessionId: rerun.session?.id || null,
      },
      specialistKind: followUpItem.specialistKind,
      workspaceId: followUpItem.workspaceId || null,
    };
  }

  function acknowledgeOwnerHandoff(escalationId, { note = '' }) {
    const escalation = store.getEscalation(escalationId);
    if (!escalation) {
      throw new Error(`Escalation not found: ${escalationId}`);
    }

    const normalizedEscalation = enrichEscalation(escalation);
    if (!normalizedEscalation.pendingOwnerHandoff || !normalizedEscalation.latestOwnerTransition) {
      throw new Error(`Escalation ${escalationId} does not have a pending owner handoff.`);
    }

    const acknowledgedAt = now();
    const handoffEntry = {
      at: acknowledgedAt,
      dueAt: normalizedEscalation.ownerHandoffDueAt,
      note: normalizeText(note, 'Owner handoff acknowledged.'),
      owner: normalizedEscalation.latestOwnerTransition.to,
      slaHours: normalizedEscalation.ownerHandoffSlaHours,
      transitionAt: normalizedEscalation.latestOwnerTransition.at,
      transitionTo: normalizedEscalation.latestOwnerTransition.to,
      wasOverdue: normalizedEscalation.ownerHandoffIsOverdue,
    };

    const updated = store.updateEscalation(escalationId, (current) => {
      const currentEscalation = enrichEscalation(current);
      return {
        ...current,
        lastOwnerHandoffAt: acknowledgedAt,
        ownerHandoffHistory: [...currentEscalation.ownerHandoffHistory, handoffEntry],
        updatedAt: acknowledgedAt,
      };
    });

    return enrichEscalation(updated);
  }

  function openAcceptedRiskEscalation(followUp, resolutionNote) {
    const actionId = `accepted-risk:${followUp.actionId}`;
    const currentTimestamp = now();
    const existingOpenEscalation =
      store
        .listEscalations({
          actionId,
          status: 'open',
        })
        .at(-1) || null;

    if (existingOpenEscalation) {
      return store.updateEscalation(existingOpenEscalation.id, (current) => ({
        ...current,
        dueAt: new Date(new Date(currentTimestamp).getTime() + 72 * 60 * 60 * 1000).toISOString(),
        escalationRule: 'Track the accepted risk until a deliberate close or replacement plan is recorded.',
        incidentPath: current.incidentPath || null,
        incidentTitle: current.incidentTitle || null,
        isOverdue: false,
        lastSeenAt: currentTimestamp,
        priority: 'medium',
        reason: resolutionNote,
        recommendedCommand: current.recommendedCommand,
        recommendedOwner: 'workspace-owner',
        sourceResolutionKind: 'accepted-risk',
        sourceReviewerFollowUpActionId: followUp.actionId,
        title: formatAcceptedRiskEscalationTitle(followUp.missionTitle),
        updatedAt: currentTimestamp,
      }));
    }

    const escalationId = createId('escalation');
    return store.saveEscalation({
      id: escalationId,
      actionId,
      actionClass: 'accepted-risk-monitoring',
      actionType: 'reviewer-accepted-risk',
      dueAt: new Date(new Date(currentTimestamp).getTime() + 72 * 60 * 60 * 1000).toISOString(),
      escalationRule: 'Track the accepted risk until a deliberate close or replacement plan is recorded.',
      incidentPath: null,
      incidentTitle: null,
      isOverdue: false,
      lastSeenAt: currentTimestamp,
      missionId: followUp.missionId,
      priority: 'medium',
      reason: resolutionNote,
      recommendedCommand: `node src/cli.mjs action resolve-escalation ${escalationId} --note "<note>"`,
      recommendedOwner: 'workspace-owner',
      resolutionNote: '',
      resolvedAt: null,
      sessionId: followUp.sessionId,
      sourceResolutionKind: 'accepted-risk',
      sourceReviewerFollowUpActionId: followUp.actionId,
      status: 'open',
      title: formatAcceptedRiskEscalationTitle(followUp.missionTitle),
      workspaceId: followUp.workspaceId,
      workspaceName: followUp.workspaceName,
      reminderCount: 0,
      reminderHistory: [],
      lastReminderAt: null,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    });
  }

  function resolveReviewerFollowUp(actionId, { kind = '', note = '' }) {
    const followUp = ensureReviewerFollowUpRecord(actionId);
    if (followUp.status !== 'open') {
      throw new Error(`Reviewer follow-up ${actionId} is already resolved.`);
    }

    const resolutionKind = normalizeText(kind, 'accepted-risk');
    if (!REVIEWER_FOLLOW_UP_RESOLUTION_KINDS.includes(resolutionKind)) {
      throw new Error(`Unsupported reviewer follow-up resolution kind: ${resolutionKind}`);
    }
    const resolutionNote = normalizeText(note, 'Resolved without additional note.');
    const resolvedFollowUp = store.updateReviewerFollowUp(followUp.id, (current) => ({
      ...current,
      resolutionKind,
      resolutionNote,
      resolvedAt: now(),
      status: 'resolved',
      updatedAt: now(),
    }));

    const mission = getMission(resolvedFollowUp.missionId);
    harness.addMemoryEntry({
      scope: 'mission',
      scopeId: mission.id,
      kind: 'decision',
      content: formatReviewerFollowUpResolutionMemory({
        mission,
        note: resolutionNote,
        resolutionKind,
      }),
    });

    let escalation = null;
    if (resolutionKind === 'accepted-risk') {
      escalation = openAcceptedRiskEscalation(resolvedFollowUp, resolutionNote);
    }

    return {
      escalation,
      followUp: resolvedFollowUp,
    };
  }

  function resolveEscalation(escalationId, { note = '' }) {
    const escalation = store.getEscalation(escalationId);
    if (!escalation) {
      throw new Error(`Escalation not found: ${escalationId}`);
    }
    if (escalation.status !== 'open') {
      throw new Error(`Escalation ${escalationId} is already resolved.`);
    }

    return store.updateEscalation(escalationId, (current) => ({
      ...current,
      resolutionNote: normalizeText(note, 'Resolved without additional note.'),
      resolvedAt: now(),
      status: 'resolved',
      updatedAt: now(),
    }));
  }

  function getGlobalOverview(filter = {}) {
    syncEscalations();
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'global provider since timestamp');
    const workspaceOverviews = store.listWorkspaces().map((workspace) => getWorkspaceOverview(workspace.id));
    const maintenanceRuns = store.listMaintenanceRuns();
    const maintenanceSummary = summarizeMaintenanceRuns(maintenanceRuns);
    const maintenanceImpactSummary = summarizeMaintenanceImpact(maintenanceRuns);
    const maintenancePressureSummary = summarizeMaintenancePressure(listMaintenancePressureEntries());
    const missionCounts = Object.fromEntries(MISSION_STATUSES.map((status) => [status, 0]));
    const approvalCounts = { approved: 0, pending: 0, rejected: 0, total: 0 };
    const memoryCounts = { missionScoped: 0, total: 0, workspaceScoped: 0 };
    const inbox = buildApprovalInboxItems();
    const allEscalations = store.listEscalations().map((item) => enrichEscalation(item));
    const openEscalations = allEscalations.filter((item) => item.status === 'open');
    const escalationSummary = summarizeEscalations(allEscalations);
    const providerOverview = getProviderOverview({
      since: providerSince,
    });
    const providerHealthDrift = providerOverview.healthDrift;
    const parallelActivity = summarizeScopedParallelActivity();

    for (const overview of workspaceOverviews) {
      for (const status of MISSION_STATUSES) {
        missionCounts[status] += overview.summary.missionCounts[status];
      }

      approvalCounts.approved += overview.summary.approvalCounts.approved;
      approvalCounts.pending += overview.summary.approvalCounts.pending;
      approvalCounts.rejected += overview.summary.approvalCounts.rejected;
      approvalCounts.total += overview.summary.approvalCounts.total;

      memoryCounts.workspaceScoped += overview.summary.memoryCounts.workspaceScoped;
      memoryCounts.missionScoped += overview.summary.memoryCounts.missionScoped;
      memoryCounts.total += overview.summary.memoryCounts.total;

      void overview;
    }

    return {
      escalations: openEscalations,
      inbox,
      providerHealthDrift,
      providerOverview,
      providerRecentWindow: providerOverview.recentWindow,
      summary: {
        activeWorkspaceIds: workspaceOverviews
          .filter((overview) => overview.summary.activeMissionIds.length > 0)
          .map((overview) => overview.workspace.id),
        approvalCounts,
        escalatedWorkspaceIds: [...new Set(openEscalations.map((item) => item.workspaceId))],
        escalationCounts: escalationSummary.statusCounts,
        escalationBreachCountTotal: escalationSummary.breachCountTotal,
        escalationLatestOwnerHandoffAt: escalationSummary.latestOwnerHandoffAt,
        escalationLatestOwnerHandoffReminderAt: escalationSummary.latestOwnerHandoffReminderAt,
        escalationLatestReminderAt: escalationSummary.latestReminderAt,
        escalationLatestOwnerEscalatedAt: escalationSummary.latestOwnerEscalatedAt,
        escalationNeedsReminderCount: escalationSummary.needsReminderCount,
        escalationNextPendingOwnerHandoffDueAt: escalationSummary.nextPendingOwnerHandoffDueAt,
        escalationNextPendingOwnerHandoffReminderAt: escalationSummary.nextPendingOwnerHandoffReminderAt,
        escalationOwnerHandoffCountTotal: escalationSummary.ownerHandoffCountTotal,
        escalationOwnerHandoffReminderCountTotal: escalationSummary.ownerHandoffReminderCountTotal,
        escalationOwnerTransitionCountTotal: escalationSummary.ownerTransitionCountTotal,
        escalationPendingOwnerHandoffCount: escalationSummary.pendingOwnerHandoffCount,
        escalationPendingOwnerHandoffNeedsReminderCount: escalationSummary.pendingOwnerHandoffNeedsReminderCount,
        escalationPendingOwnerHandoffOverdueCount: escalationSummary.pendingOwnerHandoffOverdueCount,
        escalationReminderCountTotal: escalationSummary.reminderCountTotal,
        escalationTierCounts: escalationSummary.tierCounts,
        inboxCount: inbox.length,
        latestEscalation: escalationSummary.latestEscalation,
        latestMaintenanceImpactRun: maintenanceImpactSummary.latestImpactRun,
        latestMaintenanceImpactRunAt: maintenanceImpactSummary.latestImpactRunAt,
        latestMaintenanceImpactAffectedMissionIds: maintenanceImpactSummary.latestImpactAffectedMissionIds,
        latestMaintenanceRun: maintenanceSummary.latestRun,
        latestMaintenanceRequiredAction: maintenancePressureSummary.latestRequiredAction,
        latestMaintenanceRunAt: maintenanceSummary.latestRunAt,
        latestMaintenanceRequiredActionAt: maintenancePressureSummary.latestRequiredActionAt,
        maintenanceAcknowledgedMaintenanceRequiredCountTotal:
          maintenanceSummary.acknowledgedMaintenanceRequiredCountTotal,
        maintenanceAffectedMissionCount: maintenanceImpactSummary.affectedMissionCount,
        maintenanceAffectedMissionIds: maintenanceImpactSummary.affectedMissionIds,
        maintenanceDueCandidateCountTotal: maintenanceSummary.dueCandidateCountTotal,
        maintenanceDueWorkspaceIds: maintenancePressureSummary.maintenanceDueWorkspaceIds,
        maintenanceEscalationRemindedCountTotal: maintenanceSummary.escalationRemindedCountTotal,
        maintenanceCurrentDueProviderAttentionCountTotal: maintenancePressureSummary.currentDueProviderAttentionCountTotal,
        maintenanceCurrentDueSpecialistFollowUpCountTotal:
          maintenancePressureSummary.currentDueSpecialistFollowUpCountTotal,
        maintenanceResolvedMaintenanceRequiredCountTotal:
          maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
        maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
        maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
        maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
        maintenanceProviderAttentionRemindedCountTotal: maintenanceSummary.providerAttentionRemindedCountTotal,
        maintenanceSpecialistFollowUpRemindedCountTotal: maintenanceSummary.specialistFollowUpRemindedCountTotal,
        maintenanceRemainingMaintenanceRequiredCountTotal:
          maintenanceSummary.remainingMaintenanceRequiredCountTotal,
        maintenanceRunCount: maintenanceSummary.runCount,
        maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
        maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
        memoryCounts,
        missionCount: workspaceOverviews.reduce((count, overview) => count + overview.summary.missionCount, 0),
        missionCounts,
        openEscalationCount: openEscalations.length,
        latestProviderEvent: providerOverview.summary.latestEvent,
        latestProviderAttentionAcknowledgement: providerOverview.summary.latestAttentionAcknowledgement,
        latestProviderAttentionEvent: providerOverview.summary.latestAttentionEvent,
        latestProviderAttentionRecovery: providerOverview.summary.latestAttentionRecovery,
        latestProviderAttentionReminder: providerOverview.summary.latestAttentionReminder,
        latestProviderAttentionResolution: providerOverview.summary.latestAttentionResolution,
        latestProviderAttentionRequiredEvent: providerOverview.summary.latestAttentionRequiredEvent,
        latestProviderExecutionEvent: providerOverview.summary.latestExecutionEvent,
        latestFailedProviderExecution: providerOverview.summary.latestFailedExecution,
        latestProviderExecution: providerOverview.summary.latestExecution,
        latestFailedProviderProbe: providerOverview.summary.latestFailedProbe,
        latestProviderProbe: providerOverview.summary.latestProbe,
        latestProviderProbeEvent: providerOverview.summary.latestProbeEvent,
        latestRecentProviderEvent: providerOverview.recentWindow?.latestEvent || null,
        latestRecentProviderExecution: providerOverview.recentWindow?.latestExecution || null,
        latestRecentProviderProbe: providerOverview.recentWindow?.latestProbe || null,
        latestSuccessfulProviderExecution: providerOverview.summary.latestSuccessfulExecution,
        latestSuccessfulProviderProbe: providerOverview.summary.latestSuccessfulProbe,
        providerConfiguredCount: providerOverview.summary.configuredCount,
        providerCount: providerOverview.summary.total,
        providerRecentEventCount: providerOverview.recentWindow?.eventTotal || 0,
        providerRecentEventFamilyCounts:
          providerOverview.recentWindow?.eventFamilyCounts || { attention: 0, execution: 0, probe: 0 },
        providerRecentExecutionCount: providerOverview.recentWindow?.executionTotal || 0,
        providerRecentExecutionLatestMonthlyBucketDelta:
          providerOverview.recentWindow?.executionLatestMonthlyBucketDelta || null,
        providerRecentExecutionLatestMonthlyBucketStartDate:
          providerOverview.recentWindow?.executionLatestMonthlyBucketStartDate || null,
        providerRecentExecutionMonthlyBucketCount:
          providerOverview.recentWindow?.executionMonthlyBucketCount || 0,
        providerRecentExecutionOldestMonthlyBucketStartDate:
          providerOverview.recentWindow?.executionOldestMonthlyBucketStartDate || null,
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
        providerRecentProbeTotal: providerOverview.recentWindow?.probeTotal || 0,
        providerRecentSince: providerSince || null,
        providerRecentTouchedProviderCount: providerOverview.recentWindow?.touchedProviderCount || 0,
        providerRecentTouchedProviderIds: providerOverview.recentWindow?.touchedProviderIds || [],
        providerAttentionAcknowledgedCount: providerOverview.summary.acknowledgedAttentionCount,
        providerAttentionNeedsReminderCount: providerOverview.summary.attentionNeedsReminderCount,
        providerAttentionNextDueAt: providerOverview.summary.attentionNextDueAt,
        providerAttentionNextReminderAt: providerOverview.summary.attentionNextReminderAt,
        providerAttentionOverdueCount: providerOverview.summary.attentionOverdueCount,
        providerAttentionAttemptHistoryEntryCountTotal: providerOverview.summary.attentionAttemptHistoryEntryCountTotal,
        providerAttentionMaxAttemptCount: providerOverview.summary.attentionMaxAttemptCount,
        providerAttentionMultiAttemptCount: providerOverview.summary.attentionMultiAttemptCount,
        providerAttentionReminderCount: providerOverview.summary.attentionReminderCountTotal,
        providerAttentionRequiredCount: providerOverview.summary.attentionRequiredCount,
        providerAttentionRecoveredCount: providerOverview.summary.recoveredAttentionCount,
        providerAttentionResolvedCount: providerOverview.summary.resolvedAttentionCount,
        providerAttentionStatusCounts: providerOverview.summary.attentionStatusCounts,
        providerAttentionTotalAttemptCount: providerOverview.summary.attentionTotalAttemptCount,
        providerAttentionTotalRetryCount: providerOverview.summary.attentionTotalRetryCount,
        providerEventCount: providerOverview.summary.eventTotal,
        providerEventFamilyCounts: providerOverview.summary.eventFamilyCounts,
        providerExecutionAverageDurationMs: providerOverview.summary.executionAverageDurationMs,
        providerExecutionCompletedCount: providerOverview.summary.executionCompletedCount,
        providerExecutionCount: providerOverview.summary.executionTotal,
        providerExecutionFailedCount: providerOverview.summary.executionFailedCount,
        providerExecutionFailureKindCounts: providerOverview.summary.executionFailureKindCounts,
        providerExecutionAttemptHistoryEntryCountTotal: providerOverview.summary.executionAttemptHistoryEntryCountTotal,
        providerExecutionMaxDurationMs: providerOverview.summary.executionMaxDurationMs,
        providerExecutionMaxAttemptCount: providerOverview.summary.executionMaxAttemptCount,
        providerExecutionMultiAttemptCount: providerOverview.summary.executionMultiAttemptCount,
        providerExecutionRetryableFailureCount: providerOverview.summary.executionRetryableFailureCount,
        providerExecutionRetrySucceededCount: providerOverview.summary.executionRetrySucceededCount,
        providerExecutionTotalAttemptCount: providerOverview.summary.executionTotalAttemptCount,
        providerExecutionTotalDurationMs: providerOverview.summary.executionTotalDurationMs,
        providerExecutionTotalRetryCount: providerOverview.summary.executionTotalRetryCount,
        providerExecutionTimedOutFailureCount: providerOverview.summary.executionTimedOutFailureCount,
        providerExecutionEstimatedCostUsdAverage: providerOverview.summary.executionEstimatedCostUsdAverage,
        providerExecutionEstimatedCostUsdByProviderId: providerOverview.summary.executionEstimatedCostUsdByProviderId,
        providerExecutionEstimatedCostUsdByRole: providerOverview.summary.executionEstimatedCostUsdByRole,
        providerExecutionEstimatedCostUsdMax: providerOverview.summary.executionEstimatedCostUsdMax,
        providerExecutionEstimatedCostUsdPricedCount: providerOverview.summary.executionEstimatedCostUsdPricedCount,
        providerExecutionEstimatedCostUsdTotal: providerOverview.summary.executionEstimatedCostUsdTotal,
        providerExecutionUsageInputTokensTotal: providerOverview.summary.usageInputTokensTotal,
        providerExecutionUsageOutputTokensTotal: providerOverview.summary.usageOutputTokensTotal,
        providerExecutionUsageTotalTokensTotal: providerOverview.summary.usageTotalTokensTotal,
        providerLatestProbeFailureCount: providerOverview.summary.latestProbeFailureCount,
        providerLatestProbeSkippedCount: providerOverview.summary.latestProbeSkippedCount,
        providerProbeAverageDurationMs: providerOverview.summary.probeAverageDurationMs,
        providerProbeAttemptHistoryEntryCountTotal: providerOverview.summary.probeAttemptHistoryEntryCountTotal,
        providerProbeFailureKindCounts: providerOverview.summary.probeFailureKindCounts,
        providerProbeMaxAttemptCount: providerOverview.summary.probeMaxAttemptCount,
        providerProbeMaxDurationMs: providerOverview.summary.probeMaxDurationMs,
        providerProbeMultiAttemptCount: providerOverview.summary.probeMultiAttemptCount,
        providerProbeRetryableFailureCount: providerOverview.summary.probeRetryableFailureCount,
        providerProbeRetrySucceededCount: providerOverview.summary.probeRetrySucceededCount,
        providerProbeTotalAttemptCount: providerOverview.summary.probeTotalAttemptCount,
        providerProbeTotalDurationMs: providerOverview.summary.probeTotalDurationMs,
        providerProbeTotalRetryCount: providerOverview.summary.probeTotalRetryCount,
        providerProbeTimedOutFailureCount: providerOverview.summary.probeTimedOutFailureCount,
        providerReadyCount: providerOverview.summary.readyCount,
        specialistFollowUpRequiredCount: parallelActivity.specialistFollowUpRequiredCount,
        specialistFollowUpNeedsReminderCount: parallelActivity.specialistFollowUpNeedsReminderCount,
        specialistFollowUpOverdueCount: parallelActivity.specialistFollowUpOverdueCount,
        specialistFollowUpReminderCountTotal: parallelActivity.specialistFollowUpReminderCountTotal,
        specialistKindCounts: parallelActivity.specialistKindCounts,
        specialistLatestQualityGateViolation: parallelActivity.latestQualityGateViolation,
        specialistLatestOrchestrationProfile: parallelActivity.latestOrchestrationProfile,
        specialistLatestFollowUp: parallelActivity.latestFollowUp,
        specialistLatestReminderAt: parallelActivity.specialistLatestReminderAt,
        specialistLatestMergeRun: parallelActivity.latestMergeRun,
        specialistLatestParallelGroup: parallelActivity.latestParallelGroup,
        specialistMergeCompletedCount: parallelActivity.mergeCompletedCount,
        specialistMergeRunCount: parallelActivity.mergeRunCount,
        specialistNextReminderAt: parallelActivity.specialistNextReminderAt,
        specialistQualityGateBlockedCount: parallelActivity.qualityGateBlockedCount,
        specialistQualityGateStatusCounts: parallelActivity.qualityGateStatusCounts,
        specialistOrchestrationProfileCounts: parallelActivity.orchestrationProfileCounts,
        specialistOrchestrationProfileCount: parallelActivity.specialistOrchestrationProfileCount,
        specialistRunCount: parallelActivity.specialistRunCount,
        specialistStatusCounts: parallelActivity.statusCounts,
        specialistTouchedOrchestrationProfileIds: parallelActivity.touchedOrchestrationProfileIds,
        specialistTouchedKinds: parallelActivity.touchedSpecialistKinds,
        specialistTotalGroupCount: parallelActivity.totalGroupCount,
        providerUnprobedCount: providerOverview.summary.unprobedCount,
        sessionCount: workspaceOverviews.reduce((count, overview) => count + overview.summary.sessionCount, 0),
        workspaceCount: workspaceOverviews.length,
      },
      workspaces: workspaceOverviews.map((overview) => ({
        summary: overview.summary,
        workspace: overview.workspace,
      })),
    };
  }

  function buildSpecialistTimelineEvents(filter = {}) {
    return buildParallelGroupStates(filter)
      .flatMap((group) => {
        const runEvents = group.runs
          .filter((run) => !filter.missionId || run.missionId === filter.missionId)
          .map((run) => {
            const mission = group.mission;
            const workspace = group.workspace;
            const status = normalizeAgentRunStatus(run.status);
            const at = run.endedAt || run.startedAt || now();

            if (normalizeText(run.stageKind) === 'parallel-merge') {
              return {
                at,
                detail: run.outputSummary || `Parallel specialist merge ${status}.`,
                kind: status === 'failed' ? 'specialist-merge-failed' : 'specialist-merge-completed',
                missionId: mission?.id || null,
                parallelGroupId: group.parallelGroupId,
                role: run.role,
                runId: run.id,
                sessionId: run.sessionId || null,
                status,
                workspaceId: workspace?.id || null,
                workspaceName: workspace?.name || null,
              };
            }

            if (!normalizeText(run.specialistKind)) {
              return null;
            }

            return {
              at,
              detail: run.outputSummary || `${run.specialistKind} specialist ${status}.`,
              kind: `specialist-branch-${status}`,
              missionId: mission?.id || null,
              parallelGroupId: group.parallelGroupId,
              role: run.role,
              runId: run.id,
              sessionId: run.sessionId || null,
              specialistKind: normalizeText(run.specialistKind),
              status,
              workspaceId: workspace?.id || null,
              workspaceName: workspace?.name || null,
            };
          })
          .filter(Boolean);
        const qualityGateEvents = ensureArray(group.qualityGate?.violations)
          .filter((violation) => {
            const latestRun = group.latestByKind.get(violation.specialistKind);
            return !['blocked', 'failed'].includes(normalizeAgentRunStatus(latestRun?.status));
          })
          .map((violation) => ({
            at: violation.at || now(),
            detail: violation.detail,
            kind: 'specialist-quality-gate-blocked',
            missionId: group.mission?.id || null,
            parallelGroupId: group.parallelGroupId,
            runId: violation.runId || null,
            sessionId: violation.sessionId || null,
            specialistKind: violation.specialistKind,
            status: violation.status || 'blocked',
            workspaceId: group.workspace?.id || null,
            workspaceName: group.workspace?.name || null,
          }));

        return [...runEvents, ...qualityGateEvents];
      })
      .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
  }

  function buildMissionTimeline(mission) {
    const sessions = listSessions(mission.id);
    const approvals = store.listApprovals({ missionId: mission.id });
    const escalations = store.listEscalations({ missionId: mission.id });
    const reviewerFollowUps = listReviewerFollowUpRecords({ missionId: mission.id });
    const providerExecutions = buildProviderExecutionEntries({ missionId: mission.id });
    const providerAttentionAcknowledgements = store.listProviderAttentionAcknowledgements({ missionId: mission.id });
    const providerAttentionRecoveredItems = buildProviderAttentionRecoveredItems({ missionId: mission.id });
    const memoryEntries = store.listMemoryEntries({ scope: 'mission', scopeId: mission.id });
    const timeline = [
      {
        at: mission.createdAt,
        detail: `${mission.mode} mission created.`,
        kind: 'mission-created',
        missionId: mission.id,
      },
    ];

    for (const session of sessions) {
      timeline.push({
        at: session.startedAt,
        detail: `Session started with provider ${session.provider}.`,
        kind: 'session-started',
        missionId: mission.id,
        sessionId: session.id,
        status: session.status,
      });

      if (session.endedAt) {
        timeline.push({
          at: session.endedAt,
          detail: `Session ended with status ${session.status}.`,
          kind: 'session-ended',
          missionId: mission.id,
          sessionId: session.id,
          status: session.status,
        });
      }
    }

    for (const approval of approvals) {
      timeline.push({
        approvalId: approval.id,
        at: approval.createdAt,
        detail: approval.title,
        kind: 'approval-requested',
        missionId: mission.id,
        sessionId: approval.sessionId,
        status: approval.status,
      });

      if (approval.resolvedAt) {
        timeline.push({
          approvalId: approval.id,
          at: approval.resolvedAt,
          detail: approval.decisionReason || 'Approval resolved.',
          kind: 'approval-resolved',
          missionId: mission.id,
          sessionId: approval.sessionId,
          status: approval.status,
        });
      }
    }

    for (const followUp of reviewerFollowUps) {
      timeline.push({
        actionId: followUp.actionId,
        at: followUp.createdAt,
        detail: followUp.reason || followUp.title,
        kind: 'reviewer-follow-up-opened',
        missionId: mission.id,
        sessionId: followUp.sessionId,
        status: followUp.status,
      });

      if (followUp.resolvedAt) {
        timeline.push({
          actionId: followUp.actionId,
          at: followUp.resolvedAt,
          detail: formatReviewerFollowUpResolutionDetail({
            resolutionKind: followUp.resolutionKind,
            resolutionNote: followUp.resolutionNote,
          }),
          kind: 'reviewer-follow-up-resolved',
          missionId: mission.id,
          sessionId: followUp.sessionId,
          status: followUp.status,
        });
      }
    }

    for (const execution of buildProviderExecutionTimeline(providerExecutions)) {
      timeline.push({
        at: execution.at,
        detail: execution.detail,
        estimatedCostUsd: execution.estimatedCostUsd,
        kind: execution.kind,
        missionId: mission.id,
        providerId: execution.providerId,
        role: execution.role,
        runId: execution.runId,
        sessionId: execution.sessionId,
        status: execution.status,
        workspaceId: execution.workspaceId || mission.workspaceId,
        workspaceName: execution.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionOpenedTimeline(
      [
        ...buildProviderAttentionPendingItems({ missionId: mission.id }),
        ...providerAttentionRecoveredItems,
      ],
      providerAttentionAcknowledgements,
    )) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        providerDisplayName: event.providerDisplayName,
        providerId: event.providerId,
        sessionId: event.sessionId || null,
        status: event.status || 'pending',
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionTimeline(providerAttentionAcknowledgements)) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        providerDisplayName: event.providerDisplayName,
        providerId: event.providerId,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionRecoveredTimeline(
      providerAttentionRecoveredItems,
    )) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        providerDisplayName: event.providerDisplayName,
        providerId: event.providerId,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionReminderTimeline(
      store.listProviderAttentionReminders({ missionId: mission.id }),
    )) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        providerDisplayName: event.providerDisplayName,
        providerId: event.providerId,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildSpecialistTimelineEvents({ missionId: mission.id })) {
      timeline.push(event);
    }

    for (const event of buildSpecialistFollowUpReminderTimeline(
      store.listSpecialistFollowUpReminders({ missionId: mission.id }),
    )) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        parallelGroupId: event.parallelGroupId || null,
        providerId: event.providerId || null,
        runId: event.runId || null,
        sessionId: event.sessionId || null,
        specialistKind: event.specialistKind || null,
        status: event.status || null,
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const escalation of escalations) {
      timeline.push({
        at: escalation.createdAt,
        detail: escalation.title,
        escalationId: escalation.id,
        kind: 'escalation-opened',
        missionId: mission.id,
        sessionId: escalation.sessionId,
        status: escalation.status,
      });

      if (escalation.resolvedAt) {
        timeline.push({
          at: escalation.resolvedAt,
          detail: escalation.resolutionNote || 'Escalation resolved.',
          escalationId: escalation.id,
          kind: 'escalation-resolved',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }

      for (const reminder of ensureArray(escalation.reminderHistory)) {
        timeline.push({
          at: reminder.at,
          detail: formatEscalationReminderDetail(reminder),
          escalationId: escalation.id,
          kind: 'escalation-reminded',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }

      for (const ownerChange of ensureArray(escalation.ownerHistory)) {
        if (!ownerChange.from || !ownerChange.to || ownerChange.from === ownerChange.to) {
          continue;
        }

        timeline.push({
          at: ownerChange.at,
          detail: formatEscalationOwnerChangeDetail(ownerChange),
          escalationId: escalation.id,
          kind: 'escalation-owner-changed',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }

      for (const handoff of ensureArray(escalation.ownerHandoffHistory)) {
        timeline.push({
          at: handoff.at,
          detail: formatEscalationOwnerHandoffDetail(handoff),
          escalationId: escalation.id,
          kind: 'escalation-owner-handoff-acknowledged',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }

      for (const reminder of ensureArray(escalation.ownerHandoffReminderHistory)) {
        timeline.push({
          at: reminder.at,
          detail: formatEscalationOwnerHandoffReminderDetail(reminder),
          escalationId: escalation.id,
          kind: 'escalation-owner-handoff-reminded',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }
    }

    for (const maintenanceRun of listRelatedMaintenanceRunsForMission(mission.id)) {
      const missionEffect = getMaintenanceMissionEffect(maintenanceRun, mission.id);
      const isDirectMissionRun = maintenanceRun.missionId === mission.id;

      if (isDirectMissionRun && Number(maintenanceRun.acknowledgedMaintenanceRequiredCount || 0) > 0) {
        timeline.push({
          acknowledgedCount: maintenanceRun.acknowledgedMaintenanceRequiredCount,
          at: maintenanceRun.createdAt,
          detail: `Maintenance sweep acknowledged ${maintenanceRun.acknowledgedMaintenanceRequiredCount} maintenance-required action(s) covering ${maintenanceRun.beforePressureSummary?.currentDueCandidateCountTotal || 0} due candidate(s).`,
          kind: 'maintenance-required-acknowledged',
          maintenanceRunId: maintenanceRun.id,
          missionId: mission.id,
        });
      }

      if (isDirectMissionRun && Number(maintenanceRun.resolvedMaintenanceRequiredCount || 0) > 0) {
        timeline.push({
          at: maintenanceRun.createdAt,
          detail: `Maintenance sweep resolved ${maintenanceRun.resolvedMaintenanceRequiredCount} maintenance-required action(s); remaining=${maintenanceRun.remainingMaintenanceRequiredCount || 0}.`,
          kind: 'maintenance-required-resolved',
          maintenanceRunId: maintenanceRun.id,
          missionId: mission.id,
          resolvedCount: maintenanceRun.resolvedMaintenanceRequiredCount,
        });
      }

      timeline.push({
        at: maintenanceRun.createdAt,
        detail: isDirectMissionRun
          ? formatMaintenanceRunDetail(maintenanceRun)
          : `Workspace maintenance sweep affected this mission: reminded=${missionEffect?.totalRemindedCount || 0}, monitoring=${missionEffect?.escalationRemindedCount || 0}, handoff=${missionEffect?.ownerHandoffRemindedCount || 0}, provider-attention=${missionEffect?.providerAttentionRemindedCount || 0}, specialist-follow-up=${missionEffect?.specialistFollowUpRemindedCount || 0}.${maintenanceRun.note ? ` note=${maintenanceRun.note}` : ''}`,
        kind: 'maintenance-run',
        maintenanceRunId: maintenanceRun.id,
        missionId: mission.id,
        note: maintenanceRun.note || null,
        remindedCount: maintenanceRun.totalRemindedCount || 0,
        status: Number(maintenanceRun.totalRemindedCount || 0) > 0 ? 'completed' : 'no-op',
      });
    }

    for (const entry of memoryEntries) {
      timeline.push({
        at: entry.createdAt,
        detail: entry.content,
        kind: 'memory-recorded',
        memoryId: entry.id,
        memoryKind: entry.kind,
        missionId: mission.id,
      });
    }

    return sortTimelineEvents(timeline);
  }

  function buildOperatorTimelineEvents(filter = {}) {
    const workspaceById = new Map(store.listWorkspaces().map((workspace) => [workspace.id, workspace]));
    const missionById = new Map(store.listMissions().map((mission) => [mission.id, mission]));
    const reviewerFollowUps = listReviewerFollowUpRecords(filter);
    const events = [];

    for (const approval of store.listApprovals()) {
      const mission = missionById.get(approval.missionId);
      const workspace = mission ? workspaceById.get(mission.workspaceId) : null;
      if (!mission || !workspace) {
        continue;
      }
      if (filter.workspaceId && workspace.id !== filter.workspaceId) {
        continue;
      }
      if (filter.missionId && mission.id !== filter.missionId) {
        continue;
      }

      events.push({
        approvalId: approval.id,
        at: approval.createdAt,
        detail: approval.title,
        kind: 'approval-requested',
        missionId: mission.id,
        missionTitle: mission.title,
        sessionId: approval.sessionId,
        status: approval.status,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });

      if (approval.resolvedAt) {
        events.push({
          approvalId: approval.id,
          at: approval.resolvedAt,
          detail: approval.decisionReason || 'Approval resolved.',
          kind: 'approval-resolved',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: approval.sessionId,
          status: approval.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }
    }

    for (const followUp of reviewerFollowUps) {
      const mission = missionById.get(followUp.missionId);
      const workspace = mission ? workspaceById.get(mission.workspaceId) : workspaceById.get(followUp.workspaceId);
      if (!mission || !workspace) {
        continue;
      }

      events.push({
        actionId: followUp.actionId,
        at: followUp.createdAt,
        detail: followUp.reason || followUp.title,
        kind: 'reviewer-follow-up-opened',
        missionId: mission.id,
        missionTitle: mission.title,
        sessionId: followUp.sessionId,
        status: followUp.status,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });

      if (followUp.resolvedAt) {
        events.push({
          actionId: followUp.actionId,
          at: followUp.resolvedAt,
          detail: formatReviewerFollowUpResolutionDetail({
            resolutionKind: followUp.resolutionKind,
            resolutionNote: followUp.resolutionNote,
          }),
          kind: 'reviewer-follow-up-resolved',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: followUp.sessionId,
          status: followUp.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }
    }

    for (const event of buildProviderExecutionTimeline(
      buildProviderExecutionEntries({
        missionId: filter.missionId,
        status: 'failed',
        workspaceId: filter.workspaceId,
      }),
    )) {
      events.push({
        at: event.at,
        detail: event.detail,
        estimatedCostUsd: event.estimatedCostUsd,
        kind: event.kind,
        missionId: event.missionId || null,
        missionTitle: event.missionTitle || null,
        providerId: event.providerId,
        role: event.role,
        runId: event.runId,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    const operatorAttentionAcknowledgements = store.listProviderAttentionAcknowledgements({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });
    const operatorRecoveredAttentionItems = buildProviderAttentionRecoveredItems({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });

    for (const event of buildProviderAttentionOpenedTimeline(
      [
        ...buildProviderAttentionPendingItems({
          missionId: filter.missionId,
          workspaceId: filter.workspaceId,
        }),
        ...operatorRecoveredAttentionItems,
      ],
      operatorAttentionAcknowledgements,
    )) {
      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: event.missionId || null,
        providerId: event.providerId,
        providerDisplayName: event.providerDisplayName,
        sessionId: event.sessionId || null,
        status: event.status || 'pending',
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionTimeline(
      operatorAttentionAcknowledgements,
    )) {
      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: event.missionId || null,
        providerId: event.providerId,
        providerDisplayName: event.providerDisplayName,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionRecoveredTimeline(
      operatorRecoveredAttentionItems,
    )) {
      if (!event.workspaceId) {
        continue;
      }

      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: event.missionId || null,
        providerId: event.providerId,
        providerDisplayName: event.providerDisplayName,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionReminderTimeline(
      store.listProviderAttentionReminders({
        missionId: filter.missionId,
        workspaceId: filter.workspaceId,
      }),
    )) {
      if (!event.workspaceId) {
        continue;
      }

      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: event.missionId || null,
        providerId: event.providerId,
        providerDisplayName: event.providerDisplayName,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const escalation of store.listEscalations()) {
      const mission = missionById.get(escalation.missionId);
      const workspace = mission ? workspaceById.get(mission.workspaceId) : workspaceById.get(escalation.workspaceId);
      if (!mission || !workspace) {
        continue;
      }
      if (filter.workspaceId && workspace.id !== filter.workspaceId) {
        continue;
      }
      if (filter.missionId && mission.id !== filter.missionId) {
        continue;
      }

      events.push({
        at: escalation.createdAt,
        detail: escalation.title,
        escalationId: escalation.id,
        kind: 'escalation-opened',
        missionId: mission.id,
        missionTitle: mission.title,
        sessionId: escalation.sessionId,
        status: escalation.status,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });

      if (escalation.resolvedAt) {
        events.push({
          at: escalation.resolvedAt,
          detail: escalation.resolutionNote || 'Escalation resolved.',
          escalationId: escalation.id,
          kind: 'escalation-resolved',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      for (const reminder of ensureArray(escalation.reminderHistory)) {
        events.push({
          at: reminder.at,
          detail: formatEscalationReminderDetail(reminder),
          escalationId: escalation.id,
          kind: 'escalation-reminded',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      for (const ownerChange of ensureArray(escalation.ownerHistory)) {
        if (!ownerChange.from || !ownerChange.to || ownerChange.from === ownerChange.to) {
          continue;
        }

        events.push({
          at: ownerChange.at,
          detail: formatEscalationOwnerChangeDetail(ownerChange),
          escalationId: escalation.id,
          kind: 'escalation-owner-changed',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      for (const handoff of ensureArray(escalation.ownerHandoffHistory)) {
        events.push({
          at: handoff.at,
          detail: formatEscalationOwnerHandoffDetail(handoff),
          escalationId: escalation.id,
          kind: 'escalation-owner-handoff-acknowledged',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      for (const reminder of ensureArray(escalation.ownerHandoffReminderHistory)) {
        events.push({
          at: reminder.at,
          detail: formatEscalationOwnerHandoffReminderDetail(reminder),
          escalationId: escalation.id,
          kind: 'escalation-owner-handoff-reminded',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }
    }

    for (const event of buildSpecialistTimelineEvents({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    })) {
      if (!event.workspaceId) {
        continue;
      }

      const mission = event.missionId ? missionById.get(event.missionId) : null;
      const workspace = workspaceById.get(event.workspaceId);
      if (!workspace) {
        continue;
      }

      events.push({
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission?.id || event.missionId || null,
        missionTitle: mission?.title || null,
        parallelGroupId: event.parallelGroupId || null,
        runId: event.runId || null,
        sessionId: event.sessionId || null,
        specialistKind: event.specialistKind || null,
        status: event.status || null,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });
    }

    for (const event of buildSpecialistFollowUpReminderTimeline(
      store.listSpecialistFollowUpReminders({
        missionId: filter.missionId,
        workspaceId: filter.workspaceId,
      }),
    )) {
      if (!event.workspaceId) {
        continue;
      }

      const mission = event.missionId ? missionById.get(event.missionId) : null;
      const workspace = workspaceById.get(event.workspaceId);
      if (!workspace) {
        continue;
      }

      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission?.id || event.missionId || null,
        missionTitle: mission?.title || null,
        parallelGroupId: event.parallelGroupId || null,
        providerId: event.providerId || null,
        runId: event.runId || null,
        sessionId: event.sessionId || null,
        specialistKind: event.specialistKind || null,
        status: event.status || null,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });
    }

    for (const maintenanceRun of store.listMaintenanceRuns()) {
      const workspace = workspaceById.get(maintenanceRun.workspaceId);
      const mission = maintenanceRun.missionId ? missionById.get(maintenanceRun.missionId) : null;
      if (!workspace) {
        continue;
      }
      if (filter.workspaceId && workspace.id !== filter.workspaceId) {
        continue;
      }
      if (filter.missionId && maintenanceRun.missionId !== filter.missionId) {
        continue;
      }

      if (Number(maintenanceRun.acknowledgedMaintenanceRequiredCount || 0) > 0) {
        events.push({
          acknowledgedCount: maintenanceRun.acknowledgedMaintenanceRequiredCount,
          at: maintenanceRun.createdAt,
          detail: `Maintenance sweep acknowledged ${maintenanceRun.acknowledgedMaintenanceRequiredCount} maintenance-required action(s) covering ${maintenanceRun.beforePressureSummary?.currentDueCandidateCountTotal || 0} due candidate(s).`,
          kind: 'maintenance-required-acknowledged',
          maintenanceRunId: maintenanceRun.id,
          missionId: mission ? mission.id : maintenanceRun.missionId || null,
          missionTitle: mission ? mission.title : null,
          note: maintenanceRun.note || null,
          status: 'acknowledged',
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      if (Number(maintenanceRun.resolvedMaintenanceRequiredCount || 0) > 0) {
        events.push({
          at: maintenanceRun.createdAt,
          detail: `Maintenance sweep resolved ${maintenanceRun.resolvedMaintenanceRequiredCount} maintenance-required action(s); remaining=${maintenanceRun.remainingMaintenanceRequiredCount || 0}.`,
          kind: 'maintenance-required-resolved',
          maintenanceRunId: maintenanceRun.id,
          missionId: mission ? mission.id : maintenanceRun.missionId || null,
          missionTitle: mission ? mission.title : null,
          note: maintenanceRun.note || null,
          resolvedCount: maintenanceRun.resolvedMaintenanceRequiredCount,
          status: 'resolved',
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      events.push({
        at: maintenanceRun.createdAt,
        detail: formatMaintenanceRunDetail(maintenanceRun),
        kind: 'maintenance-run',
        maintenanceRunId: maintenanceRun.id,
        missionId: mission ? mission.id : maintenanceRun.missionId || null,
        missionTitle: mission ? mission.title : null,
        note: maintenanceRun.note || null,
        remindedCount: maintenanceRun.totalRemindedCount || 0,
        status: Number(maintenanceRun.totalRemindedCount || 0) > 0 ? 'completed' : 'no-op',
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });
    }

    return sortTimelineEvents(events);
  }

  function getWorkspaceTimeline(workspaceId, filter = {}) {
    const workspace = getWorkspace(workspaceId);
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'workspace timeline provider since timestamp');
    const timeline = buildOperatorTimelineEvents({ workspaceId: workspace.id });
    const parallelActivity = summarizeWorkspaceParallelActivity(workspace.id);
    const providerRecentWindow = buildScopedProviderRecentWindow({
      since: providerSince,
      workspaceId: workspace.id,
    });
    const providerActivity = summarizeWorkspaceProviderActivity(workspace.id);
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });

    return {
      providerHealthDrift,
      providerRecentWindow,
      summary: {
        ...summarizeOperatorTimeline(timeline),
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
        latestRecentProviderEvent: providerRecentWindow?.latestEvent || null,
        latestRecentProviderExecution: providerRecentWindow?.latestExecution || null,
        providerRecentEventCount: providerRecentWindow?.eventCount || 0,
        providerRecentEventFamilyCounts:
          providerRecentWindow?.eventFamilyCounts || { attention: 0, execution: 0, probe: 0 },
        providerRecentExecutionCount: providerRecentWindow?.executionCount || 0,
        providerRecentExecutionEstimatedCostUsdTotal: providerRecentWindow?.executionEstimatedCostUsdTotal || 0,
        providerRecentExecutionLatestMonthlyBucketDelta:
          providerRecentWindow?.executionLatestMonthlyBucketDelta || null,
        providerRecentExecutionLatestMonthlyBucketStartDate:
          providerRecentWindow?.executionLatestMonthlyBucketStartDate || null,
        providerRecentExecutionMonthlyBucketCount: providerRecentWindow?.executionMonthlyBucketCount || 0,
        providerRecentExecutionOldestMonthlyBucketStartDate:
          providerRecentWindow?.executionOldestMonthlyBucketStartDate || null,
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
        providerRecentSince: providerSince || null,
        providerRecentTouchedProviderCount: providerRecentWindow?.touchedProviderCount || 0,
        providerRecentTouchedProviderIds: providerRecentWindow?.touchedProviderIds || [],
      },
      timeline,
      workspace,
    };
  }

  function getGlobalOperatorTimeline(filter = {}) {
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'operator timeline provider since timestamp');
    const timeline = buildOperatorTimelineEvents();
    const parallelActivity = summarizeScopedParallelActivity();
    const providerOverview = getProviderOverview({
      since: providerSince,
    });
    const providerHealthDrift = providerOverview.healthDrift;

    return {
      providerHealthDrift,
      providerRecentWindow: providerOverview.recentWindow,
      summary: {
        ...summarizeOperatorTimeline(timeline),
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
        latestRecentProviderEvent: providerOverview.recentWindow?.latestEvent || null,
        latestRecentProviderExecution: providerOverview.recentWindow?.latestExecution || null,
        latestRecentProviderProbe: providerOverview.recentWindow?.latestProbe || null,
        providerRecentEventCount: providerOverview.recentWindow?.eventTotal || 0,
        providerRecentEventFamilyCounts:
          providerOverview.recentWindow?.eventFamilyCounts || { attention: 0, execution: 0, probe: 0 },
        providerRecentExecutionCount: providerOverview.recentWindow?.executionTotal || 0,
        providerRecentExecutionEstimatedCostUsdTotal: providerOverview.recentWindow?.executionEstimatedCostUsdTotal || 0,
        providerRecentExecutionLatestMonthlyBucketDelta:
          providerOverview.recentWindow?.executionLatestMonthlyBucketDelta || null,
        providerRecentExecutionLatestMonthlyBucketStartDate:
          providerOverview.recentWindow?.executionLatestMonthlyBucketStartDate || null,
        providerRecentExecutionMonthlyBucketCount:
          providerOverview.recentWindow?.executionMonthlyBucketCount || 0,
        providerRecentExecutionOldestMonthlyBucketStartDate:
          providerOverview.recentWindow?.executionOldestMonthlyBucketStartDate || null,
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
        providerRecentProbeTotal: providerOverview.recentWindow?.probeTotal || 0,
        providerRecentSince: providerSince || null,
        providerRecentTouchedProviderCount: providerOverview.recentWindow?.touchedProviderCount || 0,
        providerRecentTouchedProviderIds: providerOverview.recentWindow?.touchedProviderIds || [],
      },
      timeline,
      workspaces: store.listWorkspaces(),
    };
  }

  function listSessions(missionId) {
    const mission = getMission(missionId);
    return store.listSessionsByMission(mission.id).map((session) => summarizeSession(session, mission.id));
  }

  function showSession(missionId, options = {}) {
    const mission = getMission(missionId);
    const session = options.sessionId
      ? store.getSession(options.sessionId)
      : getLatestSession(store.listSessionsByMission(mission.id));

    if (!session) {
      throw new Error(`No session found for mission: ${mission.id}`);
    }
    if (session.missionId !== mission.id) {
      throw new Error(`Session ${session.id} does not belong to mission ${mission.id}.`);
    }

    return {
      agentRuns: store.listAgentRunsBySession(session.id),
      approvals: store.listApprovals({ missionId: mission.id, sessionId: session.id }),
      artifacts: store.listArtifactsBySession(session.id),
      mission,
      summary: summarizeSession(session, mission.id),
      session,
    };
  }

  function listApprovals(filter = {}) {
    return store.listApprovals(filter);
  }

  function resolveApproval(approvalId, { decision, reason = '' }) {
    if (!APPROVAL_DECISIONS.includes(decision)) {
      throw new Error(`Unsupported approval decision: ${decision}`);
    }

    const approval = store.getApproval(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }
    if (approval.status !== 'pending') {
      throw new Error(`Approval ${approvalId} is already resolved.`);
    }

    const mission = getMission(approval.missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const session = store.getSession(approval.sessionId);
    if (!session) {
      throw new Error(`Session not found for approval: ${approval.sessionId}`);
    }

    const deliverableArtifact =
      store
        .listArtifactsBySession(session.id)
        .filter((artifact) => artifact.kind === 'deliverable')
        .at(-1) || null;

    const resolvedApproval = harness.resolveApproval(approvalId, { decision, reason });
    const resolutionArtifact = harness.writeArtifact({
      missionId: mission.id,
      sessionId: session.id,
      role: 'manager',
      kind: 'approval-resolution',
      fileName: 'approval-resolution.md',
      title: 'Approval Resolution',
      content: formatApprovalResolution(decision, reason),
    });

    if (decision === 'approve') {
      const handoffArtifact = harness.writeArtifact({
        missionId: mission.id,
        sessionId: session.id,
        role: 'manager',
        kind: 'execution-handoff',
        fileName: 'execution-ready-brief.md',
        title: 'Execution Ready Brief',
        content: formatApprovedExecutionReadyBrief({
          mission,
          workspace,
          approval: resolvedApproval,
          deliverableArtifact,
        }),
      });

      harness.addMemoryEntry({
        scope: 'mission',
        scopeId: mission.id,
        kind: 'decision',
        content: formatApprovalDecisionMemory({ mission, decision, reason }),
      });

      const completedMission = harness.touchMission(mission.id, 'completed');
      harness.updateSession(session.id, {
        currentStage: 'reviewer',
        status: 'completed',
        endedAt: now(),
      });

      return {
        approval: resolvedApproval,
        artifactPath: handoffArtifact.path,
        resolutionArtifactPath: resolutionArtifact.path,
        mission: completedMission,
        session: store.getSession(session.id),
      };
    }

    harness.addMemoryEntry({
      scope: 'mission',
      scopeId: mission.id,
      kind: 'decision',
      content: formatApprovalDecisionMemory({ mission, decision, reason }),
    });

    const failedMission = harness.touchMission(mission.id, 'failed');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'failed',
      endedAt: now(),
    });

    return {
      approval: resolvedApproval,
      artifactPath: resolutionArtifact.path,
      mission: failedMission,
      session: store.getSession(session.id),
    };
  }

  function addMemory({ scope, scopeId, kind, content }) {
    if (!MEMORY_SCOPES.includes(scope)) {
      throw new Error(`Unsupported memory scope: ${scope}`);
    }
    if (!MEMORY_KINDS.includes(kind)) {
      throw new Error(`Unsupported memory kind: ${kind}`);
    }
    if (!normalizeText(content)) {
      throw new Error('Memory content is required.');
    }

    if (scope === 'workspace') {
      getWorkspace(scopeId);
    }
    if (scope === 'mission') {
      getMission(scopeId);
    }

    return harness.addMemoryEntry({
      scope,
      scopeId,
      kind,
      content: normalizeText(content),
    });
  }

  function listMemory(filter = {}) {
    return store.listMemoryEntries(filter);
  }

  function logDocument({ type, title, content }) {
    const normalizedTitle = normalizeText(title);
    const normalizedContent = normalizeText(content);

    if (!normalizedTitle) {
      throw new Error('Document log title is required.');
    }
    if (!normalizedContent) {
      throw new Error('Document log content is required.');
    }

    return {
      path: docService.logDocument({
        type,
        title: normalizedTitle,
        content: normalizedContent,
      }),
      title: normalizedTitle,
      type,
    };
  }

  function showMission(missionId, filter = {}) {
    const mission = getMission(missionId);
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'mission provider since timestamp');
    const providerRecentWindow = buildScopedProviderRecentWindow({
      missionId: mission.id,
      since: providerSince,
    });
    const providerActivity = summarizeMissionProviderActivity(mission.id);
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });
    syncEscalations({ missionId: mission.id });
    return {
      mission,
      providerHealthDrift,
      providerRecentWindow,
      summary: summarizeMission(mission, { providerSince }),
      sessions: listSessions(mission.id),
    };
  }

  function getMissionTimeline(missionId, filter = {}) {
    const mission = getMission(missionId);
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'mission provider since timestamp');
    const providerRecentWindow = buildScopedProviderRecentWindow({
      missionId: mission.id,
      since: providerSince,
    });
    const providerActivity = summarizeMissionProviderActivity(mission.id);
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });
    syncEscalations({ missionId: mission.id });
    return {
      mission,
      providerHealthDrift,
      providerRecentWindow,
      summary: summarizeMission(mission, { providerSince }),
      timeline: buildMissionTimeline(mission),
    };
  }

  return {
    addMemory,
    addWorkspace,
    acknowledgeProviderAttention,
    checkProvider,
    createMission,
    getActionInbox,
    getApprovalInbox,
    getGlobalOperatorTimeline,
    getEscalatedInbox,
    getGlobalOverview,
    getMaintenanceOverview,
    getOwnerHandoffInbox,
    getProviderAttentionInbox,
    getProviderHealthDriftInbox,
    getSpecialistFollowUpInbox,
    getProviderExecutionHistory,
    getProviderExecutionTimeline,
    getProviderEventTimeline,
    getProviderOverview,
    getProviderProbeTimeline,
    getReviewerFollowUpInbox,
    getWorkspace,
    getWorkspaceOverview,
    getWorkspaceTimeline,
    getMissionTimeline,
    listApprovals,
    listMemory,
    listMissions,
    listProviderProbeHistory,
    listProviders,
    listSessions,
    logOverdueActions,
    logDocument,
    acknowledgeOwnerHandoff,
    resolveProviderAttention,
    runActionMaintenance,
    remindEscalations,
    remindOwnerHandoffs,
    remindProviderAttention,
    remindSpecialistFollowUps,
    syncEscalations,
    resolveEscalation,
    resolveApproval,
    resolveReviewerFollowUp,
    probeProvider,
    remediateProviderAttention,
    remediateSpecialistFollowUp,
    runMission,
    showMission,
    showSession,
  };
}
