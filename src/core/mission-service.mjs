import fs from 'node:fs';
import path from 'node:path';

import {
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
  REVIEWER_FOLLOW_UP_RESOLUTION_KINDS,
  REVIEWER_FOLLOW_UP_STATUSES,
} from './constants.mjs';
import { createDocService } from './doc-service.mjs';
import { createId } from './id.mjs';
import { createRuntimeHarness } from '../harness/runtime-harness.mjs';
import { getMissionPack } from '../packs/index.mjs';
import { createProviderRegistry } from '../providers/index.mjs';

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
  return `Maintenance sweep${noOpSuffix}: synced=${run.syncedCount || 0}, reminded=${run.totalRemindedCount || 0}, monitoring=${run.escalationRemindedCount || 0}, handoff=${run.ownerHandoffRemindedCount || 0}, acknowledged=${run.acknowledgedMaintenanceRequiredCount || 0}, resolved=${run.resolvedMaintenanceRequiredCount || 0}, remaining=${run.remainingMaintenanceRequiredCount || 0}.${noteSuffix}`;
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

function buildOverdueIncidentContent({ items, filters }) {
  const filterSummary = [
    filters.actionClass ? `class=${filters.actionClass}` : null,
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
  let latestRequiredAction = null;
  let latestRequiredActionAt = null;
  let nextDueAt = null;

  for (const entry of entries) {
    const workspaceKey = entry.workspaceId || 'global';
    dueWorkspaceCounts[workspaceKey] = (dueWorkspaceCounts[workspaceKey] || 0) + 1;
    currentDueCandidateCountTotal += Number(entry.totalDueCandidateCount || 0);
    currentDueMonitoringCountTotal += Number(entry.dueMonitoringCount || 0);
    currentDueOwnerHandoffCountTotal += Number(entry.dueOwnerHandoffCount || 0);

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

    return store.saveMission(mission);
  }

  function listMissions() {
    return store.listMissions();
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

  async function runAgentStage({ role, mission, workspace, session, provider, providerId, pack, memoryEntries, previousOutputs }) {
    const providerInput = {
      role,
      mission,
      workspace,
      pack,
      memoryEntries,
      previousOutputs,
    };
    const promptContent = await provider.preparePrompt(providerInput);

    const agentRun = harness.startAgentRun({
      missionId: mission.id,
      sessionId: session.id,
      role,
      inputSummary: formatAgentInputSummary({ role, mission, providerId }),
    });

    const promptArtifact = harness.writeArtifact({
      missionId: mission.id,
      sessionId: session.id,
      role,
      kind: 'prompt',
      fileName: `${role}-prompt.md`,
      title: `${role} prompt`,
      content: promptContent,
    });

    const providerOutput = await provider.run(providerInput);
    const normalizedOutput = provider.normalizeOutput(providerOutput, providerInput);

    const outputArtifact = harness.writeArtifact({
      missionId: mission.id,
      sessionId: session.id,
      role,
      kind: role === 'executor' ? 'deliverable' : 'agent-output',
      fileName: normalizedOutput.artifactFileName,
      title: normalizedOutput.artifactTitle,
      content: normalizedOutput.artifactContent,
    });

    const completedRun = harness.completeAgentRun(agentRun.id, {
      status: normalizedOutput.verdict === 'fail' ? 'failed' : 'completed',
      outputSummary: normalizedOutput.summaryText,
      artifactIds: [promptArtifact.id, outputArtifact.id],
    });

    return {
      artifact: outputArtifact,
      promptArtifact,
      run: completedRun,
      output: normalizedOutput,
    };
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
    previousOutputs.planner = plannerStage.output;
    harness.touchMission(mission.id, 'planned');

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
    previousOutputs.executor = executorStage.output;
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
        artifactPath: executorStage.artifact.path,
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
      executorOutput: executorStage.output,
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
        artifactPath: executorStage.artifact.path,
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
      artifactPath: executorStage.artifact.path,
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

  function summarizeMission(mission) {
    const sessions = listSessions(mission.id);
    const approvals = store.listApprovals({ missionId: mission.id });
    const escalations = store.listEscalations({ missionId: mission.id });
    const maintenanceSummary = summarizeMaintenanceRuns(store.listMaintenanceRuns({ missionId: mission.id }));
    const maintenancePressureSummary = summarizeMaintenancePressure(listMaintenancePressureEntries({ missionId: mission.id }));
    const maintenanceImpactSummary = summarizeMissionMaintenanceImpact(mission.id);
    const relatedMaintenanceRuns = listRelatedMaintenanceRunsForMission(mission.id);
    const latestRelatedMaintenanceRun = getLatestItem(relatedMaintenanceRuns, 'createdAt');
    const memoryEntries = store.listMemoryEntries({ scope: 'mission', scopeId: mission.id });
    const latestSession = sessions.at(-1) || null;
    const escalationSummary = summarizeEscalations(escalations);

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
      maintenanceImpactRunCount: maintenanceImpactSummary.runCount,
      maintenanceImpactTotalRemindedCount: maintenanceImpactSummary.totalRemindedCount,
      maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
      maintenanceResolvedMaintenanceRequiredCountTotal:
        maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
      maintenanceRemainingMaintenanceRequiredCountTotal:
        maintenanceSummary.remainingMaintenanceRequiredCountTotal,
      maintenanceRelatedRunCount: relatedMaintenanceRuns.length,
      maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
      maintenanceRunCount: maintenanceSummary.runCount,
      maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
      maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
      maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
      memoryCounts: {
        decision: memoryEntries.filter((entry) => entry.kind === 'decision').length,
        fact: memoryEntries.filter((entry) => entry.kind === 'fact').length,
        preference: memoryEntries.filter((entry) => entry.kind === 'preference').length,
        total: memoryEntries.length,
      },
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
    let totalRemindedCount = 0;

    for (const run of effectiveRuns) {
      const isDirectMissionRun = run.missionId === missionId;
      const effect = isDirectMissionRun
        ? {
            escalationRemindedCount: Number(run.escalationRemindedCount || 0),
            ownerHandoffRemindedCount: Number(run.ownerHandoffRemindedCount || 0),
            totalRemindedCount: Number(run.totalRemindedCount || 0),
          }
        : getMaintenanceMissionEffect(run, missionId) || {
            escalationRemindedCount: 0,
            ownerHandoffRemindedCount: 0,
            totalRemindedCount: 0,
          };

      escalationRemindedCountTotal += Number(effect.escalationRemindedCount || 0);
      ownerHandoffRemindedCountTotal += Number(effect.ownerHandoffRemindedCount || 0);
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
      runCount: effectiveRuns.length,
      totalRemindedCount,
    };
  }

  function getWorkspaceOverview(workspaceId) {
    const workspace = getWorkspace(workspaceId);
    syncEscalations({ workspaceId: workspace.id });
    const missionEntries = listMissionSummariesByWorkspace(workspace.id);
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
        maintenanceResolvedMaintenanceRequiredCountTotal:
          maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
        maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
        maintenanceRemainingMaintenanceRequiredCountTotal:
          maintenanceSummary.remainingMaintenanceRequiredCountTotal,
        maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
        maintenanceRunCount: maintenanceSummary.runCount,
        maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
        maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
        maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
        memoryCounts,
        missionCount: missionEntries.length,
        missionCounts,
        openEscalationIds: escalationSummary.openEscalationIds,
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

        const dueItems = [...dueMonitoringItems, ...dueOwnerHandoffItems];
        if (!dueItems.length) {
          return null;
        }

        const nextDueAt =
          [
            ...dueMonitoringItems.map((item) => item.nextReminderAt),
            ...dueOwnerHandoffItems.map((item) => item.nextOwnerHandoffReminderAt),
          ]
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null;
        const createdAt =
          [
            ...dueMonitoringItems.map((item) => item.createdAt),
            ...dueOwnerHandoffItems.map((item) => item.ownerTransitionAt || item.createdAt),
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
          dueMonitoringItems.some((item) => item.effectiveRecommendedOwner === 'human-approver')
            ? 'human-approver'
            : 'workspace-owner';

        return {
          actionId: `maintenance-required:${target.workspace.id}:${target.mission ? target.mission.id : 'workspace'}`,
          actionType: 'maintenance-sweep',
          createdAt: createdAt || nextDueAt || now(),
          dueMonitoringCount: dueMonitoringItems.length,
          dueOwnerHandoffCount: dueOwnerHandoffItems.length,
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

        return addFixedOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'maintenance-required',
              actionId: entry.actionId,
              actionType: 'maintenance-sweep',
              createdAt: entry.createdAt,
              dueMonitoringCount: entry.dueMonitoringCount,
              dueOwnerHandoffCount: entry.dueOwnerHandoffCount,
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
    const workspaceCounts = {};
    const actionClassCounts = {
      awaitingHumanDecision: 0,
      blocked: 0,
      handoffRequired: 0,
      maintenanceRequired: 0,
      monitoringRequired: 0,
      retryReady: 0,
      total: items.length,
    };
    const actionCounts = {
      acceptedRiskMonitoring: 0,
      approval: 0,
      blockedFollowUp: 0,
      maintenanceSweep: 0,
      ownerHandoff: 0,
      reviewerFollowUp: 0,
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
      workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;

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

      if (item.actionType === 'reviewer-follow-up') {
        actionCounts.reviewerFollowUp += 1;
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

      if (item.actionClass === 'retry-ready') {
        actionClassCounts.retryReady += 1;
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
      reminderCounts,
      latestReminderAt,
      nextReminderAt,
      overdueCounts,
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
      ...buildAcceptedRiskMonitoringItems(filter),
      ...buildBlockedFollowUpItems(filter),
      ...buildReviewerFollowUpItems(filter),
    ]
      .filter((item) => {
        if (filter.actionClass && item.actionClass !== filter.actionClass) {
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
    const content = buildOverdueIncidentContent({
      filters: overdueInbox.filters,
      items: overdueInbox.items,
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

    const latestReminderAt = [escalationReminders.summary.latestReminderAt, ownerHandoffReminders.summary.latestReminderAt]
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
        totalRemindedCount: 0,
      };
      current.ownerHandoffRemindedCount += 1;
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
        Number(ownerHandoffReminders.summary.dueCandidateCount || 0),
      escalationRemindedCount: Number(escalationReminders.summary.remindedCount || 0),
      latestReminderAt,
      ownerHandoffRemindedCount: Number(ownerHandoffReminders.summary.remindedCount || 0),
      remainingMaintenanceRequiredCount: remainingActionIds.length,
      resolvedMaintenanceRequiredCount: resolvedActionIds.length,
      syncedCount: Number(sync.summary.syncedCount || 0),
      totalRemindedCount:
        Number(escalationReminders.summary.remindedCount || 0) +
        Number(ownerHandoffReminders.summary.remindedCount || 0),
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

  function getGlobalOverview() {
    syncEscalations();
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
        maintenanceResolvedMaintenanceRequiredCountTotal:
          maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
        maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
        maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
        maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
        maintenanceRemainingMaintenanceRequiredCountTotal:
          maintenanceSummary.remainingMaintenanceRequiredCountTotal,
        maintenanceRunCount: maintenanceSummary.runCount,
        maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
        maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
        memoryCounts,
        missionCount: workspaceOverviews.reduce((count, overview) => count + overview.summary.missionCount, 0),
        missionCounts,
        openEscalationCount: openEscalations.length,
        sessionCount: workspaceOverviews.reduce((count, overview) => count + overview.summary.sessionCount, 0),
        workspaceCount: workspaceOverviews.length,
      },
      workspaces: workspaceOverviews.map((overview) => ({
        summary: overview.summary,
        workspace: overview.workspace,
      })),
    };
  }

  function buildMissionTimeline(mission) {
    const sessions = listSessions(mission.id);
    const approvals = store.listApprovals({ missionId: mission.id });
    const escalations = store.listEscalations({ missionId: mission.id });
    const reviewerFollowUps = listReviewerFollowUpRecords({ missionId: mission.id });
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
          : `Workspace maintenance sweep affected this mission: reminded=${missionEffect?.totalRemindedCount || 0}, monitoring=${missionEffect?.escalationRemindedCount || 0}, handoff=${missionEffect?.ownerHandoffRemindedCount || 0}.${maintenanceRun.note ? ` note=${maintenanceRun.note}` : ''}`,
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

  function getWorkspaceTimeline(workspaceId) {
    const workspace = getWorkspace(workspaceId);
    const timeline = buildOperatorTimelineEvents({ workspaceId: workspace.id });

    return {
      summary: summarizeOperatorTimeline(timeline),
      timeline,
      workspace,
    };
  }

  function getGlobalOperatorTimeline() {
    const timeline = buildOperatorTimelineEvents();

    return {
      summary: summarizeOperatorTimeline(timeline),
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

  function showMission(missionId) {
    const mission = getMission(missionId);
    syncEscalations({ missionId: mission.id });
    return {
      mission,
      summary: summarizeMission(mission),
      sessions: listSessions(mission.id),
    };
  }

  function getMissionTimeline(missionId) {
    const mission = getMission(missionId);
    syncEscalations({ missionId: mission.id });
    return {
      mission,
      summary: summarizeMission(mission),
      timeline: buildMissionTimeline(mission),
    };
  }

  return {
    addMemory,
    addWorkspace,
    createMission,
    getActionInbox,
    getApprovalInbox,
    getGlobalOperatorTimeline,
    getEscalatedInbox,
    getGlobalOverview,
    getMaintenanceOverview,
    getOwnerHandoffInbox,
    getReviewerFollowUpInbox,
    getWorkspace,
    getWorkspaceOverview,
    getWorkspaceTimeline,
    getMissionTimeline,
    listApprovals,
    listMemory,
    listMissions,
    listSessions,
    logOverdueActions,
    logDocument,
    acknowledgeOwnerHandoff,
    runActionMaintenance,
    remindEscalations,
    remindOwnerHandoffs,
    syncEscalations,
    resolveEscalation,
    resolveApproval,
    resolveReviewerFollowUp,
    runMission,
    showMission,
    showSession,
  };
}
