import {
  GLOBAL_USER_SCOPE_ID,
  LEARNING_PROMOTION_DECISIONS,
  LEARNING_PROMOTION_TARGETS,
  MEMORY_SCOPES,
} from './constants.mjs';

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

function formatLearningPromotionMemory({ candidate, note, target }) {
  const noteSuffix = note ? ` note=${note}` : '';
  return `Learning candidate promoted [${target}] for mission ${candidate.missionId}: ${candidate.summary}${noteSuffix}`;
}

/**
 * Learning promotion domain (mutation half of learning promotion).
 *
 * Instantiated once inside createMissionService near the sibling store-factory
 * blocks. Owns the promotion resolution/expiration writes plus the exclusive
 * verification/cutoff helpers, and injects the high-fan-in queue-item builder
 * (`buildLearningPromotionQueueItem`), the memory writers, and the shared
 * learning-promotion pure helpers (which stay defined in mission-service
 * because the read/audit half and other closure functions also depend on them).
 */
export function createLearningPromotion({
  store,
  now,
  addMemoryEntry,
  deleteMemory,
  getMission,
  getWorkspace,
  buildLearningPromotionQueueItem,
  writeUpdatedLearningCandidateArtifact,
  resolveLearningPromotionScopeId,
  getLearningPromotionExpiresAt,
  getLearningPromotionExpirationPolicy,
  defaultLearningPromotionTarget,
  normalizeLearningPromotionTarget,
  normalizeLearningPromotionScope,
}) {
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

  return {
    buildLearningPromotionVerification,
    resolveLearningPromotion,
    expireLearningPromotions,
  };
}
