import {
  ACTION_OWNERS,
  ESCALATION_STATUSES,
  ESCALATION_TIERS,
} from './constants.mjs';
import {
  addDispatchMetadata,
  addFixedOperationalMetadata,
} from './action-item-builders.mjs';
import {
  buildEscalatedInboxReadModel,
  selectEscalatedInboxItems,
} from './escalation-inbox-read-model.mjs';
import {
  buildOwnerHandoffReminderNote,
  deriveOwnerHandoffSlaHours,
  formatEscalationOwnerChangeDetail,
} from './escalation-handoff.mjs';
import {
  buildEscalationReminderNote,
  buildInitialOwnerHistoryEntry,
  buildInitialTierHistoryEntry,
  deriveEscalationTier,
  enrichEscalation,
  isBreachTier,
} from './escalation-analytics.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function createEscalationService({
  getMission,
  getWorkspace,
  now,
  store,
}) {
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

    const items = selectEscalatedInboxItems(
      store
        .listEscalations({
          missionId: filter.missionId,
          owner: filter.owner,
          status: filter.status || 'open',
          workspaceId: filter.workspaceId,
        })
        .map((item) => enrichEscalation(item)),
      filter,
    );

    return buildEscalatedInboxReadModel({
      filter,
      items,
      syncSummary: syncResult.summary,
    });
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


  return {
    acknowledgeOwnerHandoff,
    buildOwnerHandoffActionItems,
    getEscalatedInbox,
    getOwnerHandoffInbox,
    remindEscalations,
    remindOwnerHandoffs,
    resolveEscalation,
    syncEscalations,
  };
}

