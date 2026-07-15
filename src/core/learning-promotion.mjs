import {
  ACTION_OWNERS,
  GLOBAL_USER_SCOPE_ID,
  LEARNING_PROMOTION_DECISIONS,
  LEARNING_PROMOTION_REVIEW_TTL_HOURS,
  LEARNING_PROMOTION_STATUSES,
  LEARNING_PROMOTION_TARGETS,
  MEMORY_SCOPES,
} from './constants.mjs';
import { addDispatchMetadata, addOperationalMetadata } from './action-item-builders.mjs';
import { createId } from './id.mjs';
import {
  buildLearningPromotionStopConditionReminderNote,
  deriveLearningPromotionStopConditionReminderCadenceHours,
  formatLearningPromotionStopConditionReminderDetail,
} from './reminder-formatters.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function countByNormalizedField(items, fieldName) {
  return ensureArray(items).reduce((counts, item) => {
    const key = normalizeText(item?.[fieldName], 'unknown');
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items]
    .sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || '')))
    .at(-1);
}

export function normalizeLearningPromotionTarget(value, fallback = 'memory') {
  const normalized = normalizeText(value, fallback).replaceAll('_', '-');
  if (!LEARNING_PROMOTION_TARGETS.includes(normalized)) {
    throw new Error(`Unsupported learning promotion target: ${normalized}`);
  }

  return normalized;
}

export function normalizeLearningPromotionScope(value, fallback = 'mission') {
  const normalized = normalizeText(value, fallback);
  if (!MEMORY_SCOPES.includes(normalized)) {
    throw new Error(`Unsupported learning promotion scope: ${normalized}`);
  }

  return normalized;
}

export function getLearningPromotionExpiresAt(candidate) {
  return candidate?.retention?.expiresAt || candidate?.proposal?.expiresAt || null;
}

export function getLearningPromotionExpirationPolicy(candidate) {
  const expiresAt = getLearningPromotionExpiresAt(candidate);
  const ttlHours =
    Number(candidate?.retention?.reviewTtlHours || candidate?.proposal?.reviewTtlHours) ||
    LEARNING_PROMOTION_REVIEW_TTL_HOURS;
  const expiresAtMs = Date.parse(String(expiresAt || ''));
  const expiredAt = candidate?.promotionExpiration?.expiredAt || null;
  const expiredByStatus = candidate?.promotionStatus === 'expired';
  const expiredByClock =
    candidate?.promotionStatus === 'pending-review' && Number.isFinite(expiresAtMs) && Date.now() >= expiresAtMs;

  return {
    expired: Boolean(expiredByStatus || expiredByClock),
    expiredAt,
    expiresAt,
    policyId: candidate?.retention?.policy || 'pending-review-expires-unpromoted',
    reviewTtlHours: ttlHours,
    status: expiredByStatus ? 'expired' : expiredByClock ? 'overdue-for-expiration' : 'active',
  };
}

export function defaultLearningPromotionTarget(candidate) {
  const target = normalizeText(candidate?.proposal?.target, 'memory');
  if (LEARNING_PROMOTION_TARGETS.includes(target)) {
    return target;
  }

  if (target === 'skill-or-template') {
    return 'skill';
  }
  if (target === 'template-or-memory') {
    return 'template';
  }

  return 'memory';
}

export function learningPromotionPriority(candidate) {
  if (candidate.recordType === 'provider-lesson' || candidate.recordType === 'quality-regression') {
    return 'high';
  }
  if (candidate.recordType === 'failure-pattern') {
    return 'medium';
  }
  return 'low';
}

function resolveLearningPromotionScopeId(candidate, scope) {
  if (scope === 'mission') {
    return candidate.missionId;
  }
  if (scope === 'workspace') {
    return candidate.workspaceId;
  }
  return GLOBAL_USER_SCOPE_ID;
}

function formatLearningPromotionMemory({ candidate, note, target }) {
  const noteSuffix = note ? ` note=${note}` : '';
  return `Learning candidate promoted [${target}] for mission ${candidate.missionId}: ${candidate.summary}${noteSuffix}`;
}

/**
 * Learning promotion domain.
 *
 * Owns the queue, reminders, decisions, expiration, and rollback lifecycle.
 * The mission service supplies only stateful ports and delegates the public
 * methods without rebuilding promotion state outside this boundary.
 */
export function createLearningPromotion({
  store,
  now,
  addMemoryEntry,
  deleteMemory,
  getMission,
  getWorkspace,
  writeUpdatedLearningCandidateArtifact,
}) {
  function buildLearningPromotionQueueItem(candidate) {
    const mission = store.getMission(candidate.missionId);
    const workspace = mission ? store.getWorkspace(mission.workspaceId) : store.getWorkspace(candidate.workspaceId);

    if (!mission || !workspace) {
      return null;
    }

    const providerFallbackSummary = candidate.evidence?.providerFallbackSummary || null;
    const providerFailure = candidate.evidence?.providerFailure || null;
    const providerFallbackFailureAttempt = ensureArray(providerFallbackSummary?.attempts).find((attempt) =>
      Boolean(attempt?.providerFailureKind),
    );
    const target = defaultLearningPromotionTarget(candidate);
    const scope = normalizeText(candidate.scope, 'mission');
    const promotionStatus = normalizeText(candidate.promotionStatus, 'pending-review');
    const expirationPolicy = getLearningPromotionExpirationPolicy(candidate);
    const resolveCommand = `node src/cli.mjs action resolve-learning-promotion ${candidate.id} --decision <approve|reject> --target ${target} --scope ${scope} --note "<note>"`;
    const stopConditionRejectCommand = `node src/cli.mjs action resolve-learning-promotion ${candidate.id} --decision reject --target ${target} --scope ${scope} --note "<note>"`;
    const rollbackCommand = `node src/cli.mjs action rollback-learning-promotion ${candidate.id} --note "<note>"`;
    const expireCommand = `node src/cli.mjs action expire-learning-promotions --mission ${mission.id} --before ${expirationPolicy.expiresAt || '<iso-timestamp>'} --note "<note>"`;
    const isPending = promotionStatus === 'pending-review';
    const isVerificationBlocked = promotionStatus === 'verification-blocked';
    const isRollbackEligible = ['approved', 'promoted'].includes(promotionStatus);
    const actionClass = isVerificationBlocked ? 'blocked' : isPending ? 'awaiting-human-decision' : 'monitoring-required';
    const recommendedCommand = isPending
      ? resolveCommand
      : isVerificationBlocked
        ? stopConditionRejectCommand
        : isRollbackEligible
          ? rollbackCommand
          : null;
    const recommendedOwner = isPending || isVerificationBlocked ? 'human-approver' : 'mission-owner';
    const promotionStopReason =
      candidate.promotionStopCondition?.reason || candidate.promotionVerification?.stopReason || null;
    const stopConditionReminders = ensureArray(candidate.promotionStopCondition?.reminders);
    const latestStopConditionReminder = getLatestItem(stopConditionReminders, 'remindedAt');
    const reminderCadenceHours = isVerificationBlocked ? deriveLearningPromotionStopConditionReminderCadenceHours() : null;
    const reminderBaseAt =
      latestStopConditionReminder?.remindedAt ||
      candidate.promotionStopCondition?.blockedAt ||
      candidate.promotionDecision?.decidedAt ||
      candidate.updatedAt ||
      candidate.createdAt ||
      '';
    const reminderBaseMs = Date.parse(String(reminderBaseAt || ''));
    const nextReminderAt =
      isVerificationBlocked && reminderCadenceHours && Number.isFinite(reminderBaseMs)
        ? new Date(reminderBaseMs + reminderCadenceHours * 60 * 60 * 1000).toISOString()
        : null;
    const nextReminderMs = Date.parse(String(nextReminderAt || ''));
    const needsReminder =
      isVerificationBlocked && Number.isFinite(nextReminderMs) ? Date.now() >= nextReminderMs : false;

    return addOperationalMetadata(
      addDispatchMetadata(
        {
          actionClass,
          actionId: `learning-promotion:${candidate.id}`,
          actionType: 'learning-promotion',
          approvalRequired: candidate.proposal?.approvalRequired === true,
          artifactCount: ensureArray(candidate.evidence?.artifactIds).length,
          artifactKinds: candidate.evidence?.artifactKinds || {},
          autoPromotion: candidate.autoPromotion === true,
          autoPromotionAllowed: candidate.autoPromotion === true,
          createdAt: candidate.createdAt,
          evidencePolicy: {
            crossScopePromotionAllowed: candidate.safety?.crossScopePromotionAllowed === true,
            noRawCustomerPayloads: candidate.safety?.noRawCustomerPayloads === true,
            noRawSecrets: candidate.safety?.noRawSecrets === true,
            promotionRequiresApproval: candidate.safety?.promotionRequiresApproval === true,
            rawPayloadIncluded: false,
            scopeLocked: candidate.safety?.scopeLocked === true,
          },
          expirationPolicy,
          expireCommand,
          gatewayEventId: candidate.evidence?.gatewayEventId || null,
          gatewayEventRoute: candidate.evidence?.gatewayEventRoute || null,
          gatewayEventSchemaVersion: candidate.evidence?.gatewayEventSchemaVersion || null,
          gatewayEventType: candidate.evidence?.gatewayEventType || null,
          learningCandidateId: candidate.id,
          missionId: mission.id,
          missionStatus: mission.status,
          missionTitle: mission.title,
          mode: mission.mode,
          lastReminderAt: latestStopConditionReminder?.remindedAt || null,
          needsReminder,
          nextReminderAt,
          promotionStatus,
          promotionStopCondition: candidate.promotionStopCondition || null,
          promotionStopReason,
          promotionVerificationId: candidate.promotionVerification?.id || null,
          promotionVerificationStatus: candidate.promotionVerification?.status || null,
          promotionVerificationStopReason: candidate.promotionVerification?.stopReason || null,
          proposalTarget: target,
          providerFallbackPolicy: candidate.evidence?.providerFallbackPolicy || providerFallbackSummary?.policyId || null,
          providerFallbackPrimaryProviderId: providerFallbackSummary?.primaryProviderId || null,
          providerFallbackSelectedProviderId: providerFallbackSummary?.selectedProviderId || null,
          providerFallbackStopReasonCounts: candidate.evidence?.providerFallbackStopReasonCounts || {},
          providerFallbackUsed: providerFallbackSummary?.fallbackUsed === true,
          providerFailureKind: providerFailure?.failureKind || providerFallbackFailureAttempt?.providerFailureKind || null,
          providerFailureRecoverable:
            typeof providerFailure?.recoverable === 'boolean'
              ? providerFailure.recoverable
              : typeof providerFallbackFailureAttempt?.providerFailureRecoverable === 'boolean'
                ? providerFallbackFailureAttempt.providerFailureRecoverable
                : null,
          providerId: candidate.evidence?.providerId || null,
          reason:
            isVerificationBlocked && promotionStopReason
              ? `${candidate.summary} Stop-condition reason: ${promotionStopReason}.`
              : candidate.summary,
          recordType: candidate.recordType,
          remindCommand: `node src/cli.mjs action remind-learning-promotion-stop-conditions --mission ${mission.id} --due --note "<note>"`,
          reminderCadenceHours,
          reminderCount: stopConditionReminders.length,
          reminderHistory: stopConditionReminders,
          resolveCommand,
          reviewerRequired: candidate.proposal?.reviewerRequired === true,
          reviewerVerdict: candidate.evidence?.reviewerVerdict || null,
          rollbackCommand,
          rollbackEligible: isRollbackEligible,
          runCount: ensureArray(candidate.evidence?.runIds).length,
          runStatusCounts: candidate.evidence?.runStatusCounts || {},
          scope,
          scopeId: candidate.scopeId,
          sessionId: candidate.sessionId,
          status: candidate.status,
          stopConditionRejectCommand,
          title: candidate.title,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        },
        {
          priority: isVerificationBlocked ? 'high' : learningPromotionPriority(candidate),
          recommendedCommand,
          recommendedOwner,
        },
      ),
      {
        escalationRule: isVerificationBlocked
          ? 'Reject the blocked promotion or create a corrected candidate; do not retry approval until verification evidence is fixed.'
          : isPending
            ? 'If overdue, expire the candidate or request an explicit approve or reject decision.'
            : 'If promoted behavior regresses, rollback the promotion before broader reuse.',
        slaHours: isVerificationBlocked ? 24 : 72,
      },
    );
  }

  function listLearningPromotionItems(filter = {}) {
    const promotionStatus = normalizeText(filter.promotionStatus || filter.status, 'pending-review');
    const providerFallbackStopReason = normalizeText(filter.providerFallbackStopReason || filter.fallbackStopReason);
    const includeAllStatuses = promotionStatus === 'all';
    const includeOperatorActiveStatuses = promotionStatus === 'operator-active';
    const candidates = store.listLearningCandidates({
      missionId: filter.missionId,
      recordType: filter.recordType,
      workspaceId: filter.workspaceId,
      ...(includeAllStatuses || includeOperatorActiveStatuses ? {} : { promotionStatus }),
    });

    return candidates
      .map((candidate) => buildLearningPromotionQueueItem(candidate))
      .filter(Boolean)
      .filter((item) => {
        if (
          includeOperatorActiveStatuses &&
          !['pending-review', 'approved', 'promoted', 'verification-blocked'].includes(item.promotionStatus)
        ) {
          return false;
        }
        if (filter.target && item.proposalTarget !== filter.target) {
          return false;
        }
        if (filter.scope && item.scope !== filter.scope) {
          return false;
        }
        if (
          providerFallbackStopReason &&
          Number(item.providerFallbackStopReasonCounts?.[providerFallbackStopReason] || 0) <= 0
        ) {
          return false;
        }
        return true;
      })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function summarizeLearningPromotionQueue(items) {
    const expirationCounts = {
      active: items.filter((item) => item.expirationPolicy?.status === 'active').length,
      expired: items.filter((item) => item.expirationPolicy?.status === 'expired').length,
      notConfigured: items.filter((item) => !item.expirationPolicy?.expiresAt).length,
      overdueForExpiration: items.filter((item) => item.expirationPolicy?.status === 'overdue-for-expiration').length,
      total: items.length,
    };

    return {
      expirationCounts,
      pendingCount: items.filter((item) => item.promotionStatus === 'pending-review').length,
      priorityCounts: countByNormalizedField(items, 'priority'),
      recordTypeCounts: countByNormalizedField(items, 'recordType'),
      scopeCounts: countByNormalizedField(items, 'scope'),
      statusCounts: countByNormalizedField(items, 'promotionStatus'),
      targetCounts: countByNormalizedField(items, 'proposalTarget'),
      total: items.length,
      workspaceCounts: countByNormalizedField(items, 'workspaceId'),
    };
  }

  function getLearningPromotionQueue(filter = {}) {
    const normalizedFilter = {
      ...filter,
      scope: filter.scope ? normalizeLearningPromotionScope(filter.scope) : '',
      target: filter.target ? normalizeLearningPromotionTarget(filter.target) : '',
    };
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (
      filter.status &&
      !['all', 'operator-active'].includes(filter.status) &&
      !LEARNING_PROMOTION_STATUSES.includes(filter.status)
    ) {
      throw new Error(`Unsupported learning promotion status: ${filter.status}`);
    }

    const items = listLearningPromotionItems(normalizedFilter);

    return {
      filters: {
        missionId: filter.missionId || null,
        providerFallbackStopReason: normalizedFilter.providerFallbackStopReason || normalizedFilter.fallbackStopReason || null,
        recordType: filter.recordType || null,
        scope: normalizedFilter.scope || null,
        status: filter.status || filter.promotionStatus || 'pending-review',
        target: normalizedFilter.target || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeLearningPromotionQueue(items),
    };
  }

  function remindLearningPromotionStopConditions(filter = {}, note = '') {
    const learningCandidateId = normalizeText(filter.learningCandidateId);
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (learningCandidateId && !store.getLearningCandidate(learningCandidateId)) {
      throw new Error(`Learning candidate not found: ${learningCandidateId}`);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    const reminderTimestamp = now();
    const normalizedNote = normalizeText(note);
    const candidates = listLearningPromotionItems({
      missionId: filter.missionId,
      promotionStatus: 'verification-blocked',
      workspaceId: filter.workspaceId,
    })
      .filter((item) => !learningCandidateId || item.learningCandidateId === learningCandidateId)
      .filter((item) => !filter.owner || item.recommendedOwner === filter.owner)
      .filter((item) => !filter.dueOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue);

    const items = candidates
      .map((item) => {
        const updatedCandidate = store.updateLearningCandidate(item.learningCandidateId, (current) => {
          const promotionStopCondition = current.promotionStopCondition || {};
          const reminders = ensureArray(promotionStopCondition.reminders);
          const reminderEntry = {
            actionId: item.actionId,
            createdAt: reminderTimestamp,
            dueAt: item.dueAt,
            id: createId('learning-promotion-stop-condition-reminder'),
            learningCandidateId: item.learningCandidateId,
            missionId: item.missionId,
            nextReminderAt: item.nextReminderAt || null,
            note: buildLearningPromotionStopConditionReminderNote(item, normalizedNote),
            overdue: item.isOverdue,
            priority: item.priority,
            promotionStopReason: item.promotionStopReason || null,
            recommendedCommand: item.recommendedCommand || null,
            recommendedOwner: item.recommendedOwner || null,
            remindedAt: reminderTimestamp,
            reminderCadenceHours: item.reminderCadenceHours,
            slaHours: item.slaHours,
            target: item.proposalTarget || null,
            title: item.title,
            workspaceId: item.workspaceId || null,
            workspaceName: item.workspaceName || null,
          };

          return {
            ...current,
            promotionStopCondition: {
              ...promotionStopCondition,
              latestReminderAt: reminderTimestamp,
              reminderCount: reminders.length + 1,
              reminders: [...reminders, reminderEntry],
            },
            updatedAt: reminderTimestamp,
          };
        });

        writeUpdatedLearningCandidateArtifact(updatedCandidate);
        const queueItem = buildLearningPromotionQueueItem(updatedCandidate);
        const latestReminder = getLatestItem(queueItem?.reminderHistory || [], 'remindedAt');
        return {
          ...queueItem,
          latestReminder,
          reminderDetail: latestReminder ? formatLearningPromotionStopConditionReminderDetail(latestReminder) : null,
        };
      })
      .filter(Boolean)
      .sort((left, right) => String(left.lastReminderAt || '').localeCompare(String(right.lastReminderAt || '')));

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        learningCandidateId: learningCandidateId || null,
        missionId: filter.missionId || null,
        note: normalizedNote || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
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
        stopReasonCounts: countByNormalizedField(items, 'promotionStopReason'),
        workspaceCounts: countByNormalizedField(items, 'workspaceId'),
      },
    };
  }

  function normalizeLearningPromotionExpirationCutoff(value) {
    const normalized = normalizeText(value);
    if (!normalized) {
      return now();
    }

    const timestamp = Date.parse(normalized);
    if (!Number.isFinite(timestamp)) {
      throw new Error(`Invalid learning promotion expiration cutoff: ${normalized}`);
    }

    return new Date(timestamp).toISOString();
  }

  function buildLearningPromotionVerification({
    candidate,
    decidedAt,
    decision,
    memoryEntry = null,
    mutationPhase = 'final',
    note,
    scope,
    scopeId,
    target,
  }) {
    const normalizedDecision = normalizeText(decision);
    const normalizedScope = normalizeText(scope, 'mission');
    const normalizedTarget = normalizeText(target, defaultLearningPromotionTarget(candidate));
    const expectedScope = normalizeText(candidate.scope, 'mission');
    const expectedScopeId = resolveLearningPromotionScopeId(candidate, normalizedScope);
    const artifactCount = ensureArray(candidate.evidence?.artifactIds).length;
    const runCount = ensureArray(candidate.evidence?.runIds).length;
    const hasEvidence = Boolean(candidate.evidence?.gatewayEventId || artifactCount || runCount);
    const isPreMutation = mutationPhase === 'pre-mutation';
    const rollbackAction = memoryEntry ? 'delete-memory-entry' : 'ignore-learning-candidate-decision';
    const checks = [
      {
        id: 'manual-approval-recorded',
        passed: ['approve', 'reject'].includes(normalizedDecision),
        reason: 'Learning promotion must be resolved by an explicit local operator decision.',
      },
      {
        id: 'autonomous-promotion-disabled',
        passed: candidate.autoPromotion !== true,
        reason: 'Hermes-style learning candidates remain recommendation-only by default.',
      },
      {
        id: 'scope-locked',
        passed:
          normalizedScope === expectedScope &&
          scopeId === expectedScopeId &&
          candidate.safety?.scopeLocked === true &&
          candidate.safety?.crossScopePromotionAllowed !== true,
        reason: 'Promotion must stay inside the candidate scope unless cross-scope promotion is explicitly enabled.',
      },
      {
        id: 'no-raw-secrets',
        passed: candidate.safety?.noRawSecrets === true,
        reason: 'Promotion evidence must not include raw credentials or secrets.',
      },
      {
        id: 'no-raw-customer-payloads',
        passed: candidate.safety?.noRawCustomerPayloads === true,
        reason: 'Promotion evidence must not include raw customer payloads.',
      },
      {
        id: 'review-required',
        passed: candidate.proposal?.approvalRequired === true && candidate.proposal?.reviewerRequired === true,
        reason: 'Learning promotion requires an approval and reviewer gate.',
      },
      {
        id: 'retention-policy-present',
        passed: Boolean(candidate.retention?.policy && getLearningPromotionExpiresAt(candidate)),
        reason: 'Promotion candidates need a retention and expiration policy.',
      },
      {
        id: 'evidence-bound',
        passed: hasEvidence,
        reason: 'Promotion decisions must retain artifact, run, or gateway event evidence.',
      },
      {
        id: 'target-allowed',
        passed: LEARNING_PROMOTION_TARGETS.includes(normalizedTarget),
        reason: 'Promotion target must be one of the bounded learning target types.',
      },
      {
        id: 'rollback-path-present',
        passed:
          normalizedDecision === 'approve' && normalizedTarget === 'memory'
            ? isPreMutation || Boolean(memoryEntry?.id)
            : true,
        reason: 'Approved memory promotions must carry a concrete rollback target.',
      },
    ].map((check) => ({
      ...check,
      status: check.passed ? 'passed' : 'failed',
    }));
    const checkCounts = checks.reduce(
      (counts, check) => {
        counts[check.status] = (counts[check.status] || 0) + 1;
        return counts;
      },
      { failed: 0, passed: 0 },
    );
    const failedCheck = checks.find((check) => check.status === 'failed') || null;
    const status = failedCheck ? 'failed' : 'passed';
    const stopReason = failedCheck ? `learning-promotion-verification-${failedCheck.id}` : '';

    return {
      autonomousPromotionEnabled: false,
      checkCounts,
      checks,
      decidedAt,
      decision: normalizedDecision,
      evidence: {
        artifactCount,
        gatewayEventId: candidate.evidence?.gatewayEventId || null,
        gatewayEventRoute: candidate.evidence?.gatewayEventRoute || null,
        providerFallbackPolicy:
          candidate.evidence?.providerFallbackPolicy || candidate.evidence?.providerFallbackSummary?.policyId || null,
        providerFallbackStopReasonCounts: candidate.evidence?.providerFallbackStopReasonCounts || {},
        runCount,
      },
      id: `${candidate.id}:promotion-verification:${normalizedDecision}`,
      note,
      productionReadyClaim: false,
      rollbackTarget: {
        action: rollbackAction,
        memoryId: memoryEntry?.id || null,
        scope: normalizedScope,
        scopeId,
      },
      schemaVersion: 'personal-ai-agent-learning-promotion-verification/v1',
      scope: normalizedScope,
      scopeId,
      status,
      stopReason,
      target: normalizedTarget,
      verifiedAt: decidedAt,
      verificationPhase: mutationPhase,
      verificationType: 'local-deterministic-promotion-gate',
    };
  }

  function resolveLearningPromotion(candidateId, { decision = '', note = '', scope = '', target = '' } = {}) {
    const candidate = store.getLearningCandidate(candidateId);
    if (!candidate) {
      throw new Error(`Learning candidate not found: ${candidateId}`);
    }

    const normalizedDecision = normalizeText(decision);
    if (!LEARNING_PROMOTION_DECISIONS.includes(normalizedDecision)) {
      throw new Error(`Unsupported learning promotion decision: ${normalizedDecision}`);
    }

    if (candidate.promotionStatus === 'verification-blocked') {
      if (normalizedDecision !== 'reject') {
        throw new Error(
          `Learning candidate ${candidateId} is verification-blocked; only --decision reject can close the stop-condition.`,
        );
      }

      const resolvedAt = now();
      const resolutionNote = normalizeText(note, 'Rejected verification-blocked learning promotion.');
      const fallbackScope = normalizeLearningPromotionScope(scope, candidate.scope || 'mission');
      const fallbackScopeId = resolveLearningPromotionScopeId(candidate, fallbackScope);
      const fallbackTarget = normalizeLearningPromotionTarget(target, defaultLearningPromotionTarget(candidate));
      const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
        ...current,
        promotionDecision: current.promotionDecision
          ? {
              ...current.promotionDecision,
              remediationAt: resolvedAt,
              remediationBy: 'local-operator',
              remediationDecision: 'reject',
              remediationNote: resolutionNote,
            }
          : {
              decidedAt: resolvedAt,
              decidedBy: 'local-operator',
              decision: 'reject',
              memoryId: null,
              note: resolutionNote,
              rollback: {
                action: 'ignore-learning-candidate-decision',
                memoryId: null,
              },
              scope: fallbackScope,
              scopeId: fallbackScopeId,
              target: fallbackTarget,
              verificationId: current.promotionVerification?.id || null,
            },
        promotionStatus: 'rejected',
        promotionStopCondition: {
          ...(current.promotionStopCondition || {
            blockedAt: current.promotionDecision?.decidedAt || resolvedAt,
            blockedBy: current.promotionDecision?.decidedBy || 'local-operator',
            id: `${candidate.id}:promotion-stop-condition:resolved-reject`,
            previousPromotionStatus: 'verification-blocked',
            reason: current.promotionVerification?.stopReason || 'learning-promotion-verification-failed',
            requestedDecision: current.promotionDecision?.requestedDecision || 'approve',
            scope: current.promotionDecision?.scope || fallbackScope,
            scopeId: current.promotionDecision?.scopeId || fallbackScopeId,
            target: current.promotionDecision?.target || fallbackTarget,
            verificationId: current.promotionVerification?.id || null,
          }),
          resolution: 'rejected',
          resolutionNote,
          resolvedAt,
          resolvedBy: 'local-operator',
          status: 'resolved',
        },
        promotionStopConditionResolution: {
          resolvedAt,
          resolvedBy: 'local-operator',
          resolution: 'rejected',
          resolutionNote,
          stopReason: current.promotionStopCondition?.reason || current.promotionVerification?.stopReason || null,
        },
        updatedAt: resolvedAt,
      }));

      writeUpdatedLearningCandidateArtifact(updatedCandidate);

      return {
        learningCandidate: updatedCandidate,
        memoryEntry: null,
        queueItem: buildLearningPromotionQueueItem(updatedCandidate),
      };
    }

    if (candidate.promotionStatus !== 'pending-review') {
      throw new Error(`Learning candidate ${candidateId} is not pending review.`);
    }

    const normalizedTarget = normalizeLearningPromotionTarget(target, defaultLearningPromotionTarget(candidate));
    const normalizedScope = normalizeLearningPromotionScope(scope, candidate.scope || 'mission');
    if (normalizedScope !== normalizeText(candidate.scope, 'mission')) {
      throw new Error(
        `Learning candidate ${candidateId} is scope-locked to ${candidate.scope || 'mission'}; cross-scope promotion is not enabled.`,
      );
    }

    const decidedAt = now();
    const resolutionNote = normalizeText(note, 'Resolved without additional note.');
    const scopeId = resolveLearningPromotionScopeId(candidate, normalizedScope);
    const preMutationVerification = buildLearningPromotionVerification({
      candidate,
      decidedAt,
      decision: normalizedDecision,
      mutationPhase: 'pre-mutation',
      note: resolutionNote,
      scope: normalizedScope,
      scopeId,
      target: normalizedTarget,
    });

    if (preMutationVerification.status !== 'passed') {
      const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
        ...current,
        promotionDecision: {
          decidedAt,
          decidedBy: 'local-operator',
          decision: 'blocked',
          memoryId: null,
          note: resolutionNote,
          requestedDecision: normalizedDecision,
          rollback: {
            action: 'ignore-learning-candidate-decision',
            memoryId: null,
          },
          scope: normalizedScope,
          scopeId,
          target: normalizedTarget,
          verificationId: preMutationVerification.id,
        },
        promotionStatus: 'verification-blocked',
        promotionStopCondition: {
          blockedAt: decidedAt,
          blockedBy: 'local-operator',
          id: `${candidate.id}:promotion-stop-condition:${preMutationVerification.stopReason || 'verification-failed'}`,
          previousPromotionStatus: current.promotionStatus,
          reason: preMutationVerification.stopReason || 'learning-promotion-verification-failed',
          requestedDecision: normalizedDecision,
          scope: normalizedScope,
          scopeId,
          status: 'blocked',
          target: normalizedTarget,
          verificationId: preMutationVerification.id,
        },
        promotionVerification: preMutationVerification,
        updatedAt: decidedAt,
      }));

      writeUpdatedLearningCandidateArtifact(updatedCandidate);

      return {
        learningCandidate: updatedCandidate,
        memoryEntry: null,
        queueItem: buildLearningPromotionQueueItem(updatedCandidate),
      };
    }

    let memoryEntry = null;
    let nextPromotionStatus = 'rejected';

    if (normalizedDecision === 'approve') {
      if (normalizedTarget === 'memory') {
        memoryEntry = addMemoryEntry({
          scope: normalizedScope,
          scopeId,
          kind: 'decision',
          content: formatLearningPromotionMemory({
            candidate,
            note: resolutionNote,
            target: normalizedTarget,
          }),
        });
        nextPromotionStatus = 'promoted';
      } else {
        nextPromotionStatus = 'approved';
      }
    }

    const promotionVerification = buildLearningPromotionVerification({
      candidate,
      decidedAt,
      decision: normalizedDecision,
      memoryEntry,
      note: resolutionNote,
      scope: normalizedScope,
      scopeId,
      target: normalizedTarget,
    });
    let finalMemoryEntry = memoryEntry;
    let finalPromotionStatus = nextPromotionStatus;
    let promotionStopCondition = null;

    if (promotionVerification.status !== 'passed') {
      if (memoryEntry?.id) {
        deleteMemory({ memoryId: memoryEntry.id, scope: normalizedScope, scopeId });
        finalMemoryEntry = null;
      }
      finalPromotionStatus = 'verification-blocked';
      promotionStopCondition = {
        blockedAt: decidedAt,
        blockedBy: 'local-operator',
        id: `${candidate.id}:promotion-stop-condition:${promotionVerification.stopReason || 'verification-failed'}`,
        previousPromotionStatus: candidate.promotionStatus,
        reason: promotionVerification.stopReason || 'learning-promotion-verification-failed',
        requestedDecision: normalizedDecision,
        scope: normalizedScope,
        scopeId,
        status: 'blocked',
        target: normalizedTarget,
        verificationId: promotionVerification.id,
      };
    }

    const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
      ...current,
      promotionDecision: {
        decidedAt,
        decidedBy: 'local-operator',
        decision: promotionVerification.status === 'passed' ? normalizedDecision : 'blocked',
        memoryId: finalMemoryEntry?.id || null,
        note: resolutionNote,
        requestedDecision: normalizedDecision,
        rollback: {
          action: finalMemoryEntry ? 'delete-memory-entry' : 'ignore-learning-candidate-decision',
          memoryId: finalMemoryEntry?.id || null,
        },
        scope: normalizedScope,
        scopeId,
        target: normalizedTarget,
        verificationId: promotionVerification.id,
      },
      promotionStatus: finalPromotionStatus,
      ...(promotionStopCondition ? { promotionStopCondition } : {}),
      promotionVerification,
      updatedAt: decidedAt,
    }));

    writeUpdatedLearningCandidateArtifact(updatedCandidate);

    return {
      learningCandidate: updatedCandidate,
      memoryEntry: finalMemoryEntry,
      queueItem: buildLearningPromotionQueueItem(updatedCandidate),
    };
  }

  function expireLearningPromotions({
    before = '',
    missionId = '',
    note = '',
    recordType = '',
    scope = '',
    target = '',
    workspaceId = '',
  } = {}) {
    if (workspaceId) {
      getWorkspace(workspaceId);
    }
    if (missionId) {
      getMission(missionId);
    }

    const cutoffAt = normalizeLearningPromotionExpirationCutoff(before);
    const cutoffMs = Date.parse(cutoffAt);
    const normalizedScope = scope ? normalizeLearningPromotionScope(scope) : '';
    const normalizedTarget = target ? normalizeLearningPromotionTarget(target) : '';
    const expirationNote = normalizeText(note, 'Expired pending learning promotion after review TTL.');

    const candidates = store
      .listLearningCandidates({
        missionId,
        promotionStatus: 'pending-review',
        recordType,
        workspaceId,
      })
      .filter((candidate) => {
        if (normalizedScope && normalizeText(candidate.scope, 'mission') !== normalizedScope) {
          return false;
        }
        if (normalizedTarget && defaultLearningPromotionTarget(candidate) !== normalizedTarget) {
          return false;
        }

        const expiresAtMs = Date.parse(String(getLearningPromotionExpiresAt(candidate) || ''));
        return Number.isFinite(expiresAtMs) && expiresAtMs <= cutoffMs;
      });

    const expiredAt = now();
    const expiredCandidates = candidates.map((candidate) => {
      const expirationPolicy = getLearningPromotionExpirationPolicy(candidate);
      const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
        ...current,
        promotionExpiration: {
          cutoffAt,
          expiredAt,
          expiredBy: 'local-operator',
          note: expirationNote,
          policyId: expirationPolicy.policyId,
          previousPromotionStatus: current.promotionStatus,
          reviewTtlHours: expirationPolicy.reviewTtlHours,
        },
        promotionStatus: 'expired',
        updatedAt: expiredAt,
      }));
      writeUpdatedLearningCandidateArtifact(updatedCandidate);
      return updatedCandidate;
    });

    const items = expiredCandidates.map((candidate) => buildLearningPromotionQueueItem(candidate)).filter(Boolean);

    return {
      expiredCandidates,
      filters: {
        before: cutoffAt,
        missionId: missionId || null,
        recordType: recordType || null,
        scope: normalizedScope || null,
        target: normalizedTarget || null,
        workspaceId: workspaceId || null,
      },
      items,
      summary: {
        expiredCount: expiredCandidates.length,
        statusCounts: countByNormalizedField(items, 'promotionStatus'),
      },
    };
  }

  function rollbackLearningPromotion(candidateId, { note = '' } = {}) {
    const candidate = store.getLearningCandidate(candidateId);
    if (!candidate) {
      throw new Error(`Learning candidate not found: ${candidateId}`);
    }
    if (!['approved', 'promoted'].includes(candidate.promotionStatus)) {
      throw new Error(`Learning candidate ${candidateId} is not rollback eligible.`);
    }
    if (!candidate.promotionDecision) {
      throw new Error(`Learning candidate ${candidateId} has no promotion decision to rollback.`);
    }

    const rolledBackAt = now();
    const rollbackNote = normalizeText(note, 'Rolled back learning promotion by local operator.');
    const decision = candidate.promotionDecision;
    const memoryId = decision.memoryId || null;
    const scope = normalizeLearningPromotionScope(decision.scope, candidate.scope || 'mission');
    const scopeId = decision.scopeId || resolveLearningPromotionScopeId(candidate, scope);
    let memoryRollbackStatus = memoryId ? 'memory-not-found' : 'not-applicable';
    let removedMemoryEntry = null;

    if (memoryId) {
      const existingMemory = store.listMemoryEntries({ scope, scopeId }).find((entry) => entry.id === memoryId);
      if (existingMemory) {
        removedMemoryEntry = deleteMemory({ memoryId, scope, scopeId });
        memoryRollbackStatus = 'memory-deleted';
      }
    }

    const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
      ...current,
      promotionDecision: {
        ...current.promotionDecision,
        rollback: {
          ...(current.promotionDecision?.rollback || {}),
          completedAt: rolledBackAt,
          memoryId,
          memoryRollbackStatus,
          note: rollbackNote,
          status: 'completed',
        },
      },
      promotionRollback: {
        memoryId,
        memoryRollbackStatus,
        note: rollbackNote,
        previousPromotionStatus: current.promotionStatus,
        rolledBackAt,
        rolledBackBy: 'local-operator',
        scope,
        scopeId,
        target: decision.target || defaultLearningPromotionTarget(candidate),
      },
      promotionStatus: 'rolled-back',
      updatedAt: rolledBackAt,
    }));

    writeUpdatedLearningCandidateArtifact(updatedCandidate);

    return {
      learningCandidate: updatedCandidate,
      queueItem: buildLearningPromotionQueueItem(updatedCandidate),
      removedMemoryEntry,
    };
  }

  return {
    expireLearningPromotions,
    getLearningPromotionQueue,
    listLearningPromotionItems,
    remindLearningPromotionStopConditions,
    resolveLearningPromotion,
    rollbackLearningPromotion,
  };
}
