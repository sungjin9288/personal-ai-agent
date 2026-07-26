import { LEARNING_PROMOTION_STATUSES } from './constants.mjs';
import {
  defaultLearningPromotionTarget,
  getLearningPromotionExpirationPolicy,
  learningPromotionPriority,
  normalizeLearningPromotionScope,
  normalizeLearningPromotionTarget,
} from './learning-promotion.mjs';

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

  return [...items].sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || ''))).at(-1);
}

/**
 * Learning candidate audit domain (read/summarize half of learning promotion).
 *
 * Instantiated once inside createMissionService. Captures the store-reader
 * wrappers and imports the shared promotion policy directly from its domain.
 */
export function createLearningCandidateAudit({
  store,
  getMission,
  getWorkspace,
}) {
  function buildLearningCandidateAuditRecord(candidate) {
    const mission = store.getMission(candidate.missionId);
    const workspace = mission ? store.getWorkspace(mission.workspaceId) : store.getWorkspace(candidate.workspaceId);

    if (!mission || !workspace) {
      return null;
    }

    const expirationPolicy = getLearningPromotionExpirationPolicy(candidate);
    const providerFallbackSummary = candidate.evidence?.providerFallbackSummary || null;
    const providerFailure = candidate.evidence?.providerFailure || null;
    const providerFallbackFailureAttempt = ensureArray(providerFallbackSummary?.attempts).find((attempt) =>
      Boolean(attempt?.providerFailureKind),
    );
    const promotionDecision = candidate.promotionDecision || null;
    const promotionRollback = candidate.promotionRollback || null;
    const promotionStopCondition = candidate.promotionStopCondition || null;
    const promotionVerification = candidate.promotionVerification || null;
    const proposalTarget = defaultLearningPromotionTarget(candidate);
    const promotionStatus = normalizeText(candidate.promotionStatus, 'pending-review');

    return {
      artifactCount: ensureArray(candidate.evidence?.artifactIds).length,
      artifactKinds: candidate.evidence?.artifactKinds || {},
      approvalRequired: candidate.proposal?.approvalRequired === true,
      autoPromotion: candidate.autoPromotion === true,
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
      gatewayEventId: candidate.evidence?.gatewayEventId || null,
      gatewayEventRoute: candidate.evidence?.gatewayEventRoute || null,
      gatewayEventSchemaVersion: candidate.evidence?.gatewayEventSchemaVersion || null,
      gatewayEventType: candidate.evidence?.gatewayEventType || null,
      learningCandidateId: candidate.id,
      memoryPromotionId: promotionDecision?.memoryId || null,
      missionId: mission.id,
      missionStatus: candidate.missionStatus || mission.status || null,
      missionTitle: mission.title,
      priority: learningPromotionPriority(candidate),
      productionReadyClaim: false,
      promotionDecision: promotionDecision
        ? {
            decidedAt: promotionDecision.decidedAt || null,
            decidedBy: promotionDecision.decidedBy || null,
            decision: promotionDecision.decision || null,
            memoryId: promotionDecision.memoryId || null,
            remediationAt: promotionDecision.remediationAt || null,
            remediationBy: promotionDecision.remediationBy || null,
            remediationDecision: promotionDecision.remediationDecision || null,
            scope: promotionDecision.scope || null,
            scopeId: promotionDecision.scopeId || null,
            target: promotionDecision.target || null,
            verificationId: promotionDecision.verificationId || promotionVerification?.id || null,
          }
        : null,
      promotionDecisionResult: promotionDecision?.decision || null,
      promotionDecisionTarget: promotionDecision?.target || null,
      promotionRollback: promotionRollback
        ? {
            memoryId: promotionRollback.memoryId || null,
            memoryRollbackStatus: promotionRollback.memoryRollbackStatus || null,
            previousPromotionStatus: promotionRollback.previousPromotionStatus || null,
            rolledBackAt: promotionRollback.rolledBackAt || null,
            rolledBackBy: promotionRollback.rolledBackBy || null,
            scope: promotionRollback.scope || null,
            scopeId: promotionRollback.scopeId || null,
            target: promotionRollback.target || null,
          }
        : null,
      promotionStatus,
      promotionStopCondition: promotionStopCondition
        ? {
            blockedAt: promotionStopCondition.blockedAt || null,
            blockedBy: promotionStopCondition.blockedBy || null,
            id: promotionStopCondition.id || null,
            latestReminderAt: promotionStopCondition.latestReminderAt || null,
            previousPromotionStatus: promotionStopCondition.previousPromotionStatus || null,
            reason: promotionStopCondition.reason || null,
            reminderCount: Number(promotionStopCondition.reminderCount || ensureArray(promotionStopCondition.reminders).length),
            reminders: ensureArray(promotionStopCondition.reminders),
            resolution: promotionStopCondition.resolution || null,
            resolutionNote: promotionStopCondition.resolutionNote || null,
            resolvedAt: promotionStopCondition.resolvedAt || null,
            resolvedBy: promotionStopCondition.resolvedBy || null,
            requestedDecision: promotionStopCondition.requestedDecision || null,
            scope: promotionStopCondition.scope || null,
            scopeId: promotionStopCondition.scopeId || null,
            status: promotionStopCondition.status || null,
            target: promotionStopCondition.target || null,
            verificationId: promotionStopCondition.verificationId || null,
          }
        : null,
      promotionStopConditionResolution: candidate.promotionStopConditionResolution || null,
      promotionStopConditionReason: promotionStopCondition?.reason || null,
      promotionVerification: promotionVerification
        ? {
            autonomousPromotionEnabled: promotionVerification.autonomousPromotionEnabled === true,
            checkCounts: promotionVerification.checkCounts || {},
            decision: promotionVerification.decision || null,
            id: promotionVerification.id || null,
            productionReadyClaim: promotionVerification.productionReadyClaim === true,
            rollbackTarget: promotionVerification.rollbackTarget || null,
            schemaVersion: promotionVerification.schemaVersion || null,
            scope: promotionVerification.scope || null,
            scopeId: promotionVerification.scopeId || null,
            status: promotionVerification.status || null,
            stopReason: promotionVerification.stopReason ?? null,
            target: promotionVerification.target || null,
            verificationPhase: promotionVerification.verificationPhase || null,
            verificationType: promotionVerification.verificationType || null,
            verifiedAt: promotionVerification.verifiedAt || null,
          }
        : null,
      promotionVerificationCheckCounts: promotionVerification?.checkCounts || {},
      promotionVerificationId: promotionVerification?.id || null,
      promotionVerificationPassed: promotionVerification?.status === 'passed',
      promotionVerificationStatus: promotionVerification?.status || null,
      promotionVerificationStopReason: promotionVerification?.stopReason ?? null,
      promotionVerificationType: promotionVerification?.verificationType || null,
      proposalTarget,
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
      recordType: candidate.recordType,
      retentionPolicy: candidate.retention?.policy || null,
      retentionReviewTtlHours: candidate.retention?.reviewTtlHours || null,
      reviewerRequired: candidate.proposal?.reviewerRequired === true,
      reviewerVerdict: candidate.evidence?.reviewerVerdict || null,
      rollbackEligible: ['approved', 'promoted'].includes(promotionStatus),
      runCount: ensureArray(candidate.evidence?.runIds).length,
      runStatusCounts: candidate.evidence?.runStatusCounts || {},
      schemaVersion: candidate.schemaVersion || null,
      scope: candidate.scope || null,
      scopeId: candidate.scopeId || null,
      sessionId: candidate.sessionId || null,
      status: candidate.status || null,
      summary: candidate.summary || null,
      title: candidate.title || null,
      updatedAt: candidate.updatedAt,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
  }

  function summarizeLearningCandidateAudit(records, filter = {}) {
    const expirationStatusCounts = {};
    const gatewayEventRouteCounts = {};
    const gatewayEventTypeCounts = {};
    const missionCounts = {};
    const priorityCounts = {};
    const promotionDecisionResultCounts = {};
    const promotionDecisionTargetCounts = {};
    const promotionStatusCounts = {};
    const promotionStopConditionReasonCounts = {};
    const proposalTargetCounts = {};
    const providerCounts = {};
    const providerFailureKindCounts = {};
    const providerFallbackPolicyCounts = {};
    const providerFallbackStopReasonCounts = {};
    const promotionVerificationStatusCounts = {};
    const promotionVerificationStopReasonCounts = {};
    const promotionVerificationTypeCounts = {};
    const recordTypeCounts = {};
    const scopeCounts = {};
    const statusCounts = {};
    const workspaceCounts = {};
    let approvalRequiredCount = 0;
    let autoPromotionCount = 0;
    let crossScopePromotionAllowedCount = 0;
    let noRawCustomerPayloadsCount = 0;
    let noRawSecretsCount = 0;
    let providerFailureRecoverableCount = 0;
    let providerFallbackUsedCount = 0;
    let promotionRequiresApprovalCount = 0;
    let promotionStopConditionCount = 0;
    let promotionVerificationCount = 0;
    let promotionVerificationFailedCount = 0;
    let promotionVerificationPassedCount = 0;
    let reviewerRequiredCount = 0;
    let rollbackEligibleCount = 0;
    let scopeLockedCount = 0;

    for (const record of records) {
      const expirationStatus = normalizeText(record.expirationPolicy?.status, 'unknown');
      expirationStatusCounts[expirationStatus] = (expirationStatusCounts[expirationStatus] || 0) + 1;

      const gatewayEventRoute = normalizeText(record.gatewayEventRoute, 'unknown');
      gatewayEventRouteCounts[gatewayEventRoute] = (gatewayEventRouteCounts[gatewayEventRoute] || 0) + 1;

      const gatewayEventType = normalizeText(record.gatewayEventType, 'unknown');
      gatewayEventTypeCounts[gatewayEventType] = (gatewayEventTypeCounts[gatewayEventType] || 0) + 1;

      const missionId = normalizeText(record.missionId);
      if (missionId) {
        missionCounts[missionId] = (missionCounts[missionId] || 0) + 1;
      }

      const priority = normalizeText(record.priority, 'unknown');
      priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

      const promotionDecisionResult = normalizeText(record.promotionDecisionResult, 'none');
      promotionDecisionResultCounts[promotionDecisionResult] =
        (promotionDecisionResultCounts[promotionDecisionResult] || 0) + 1;

      const promotionDecisionTarget = normalizeText(record.promotionDecisionTarget, 'none');
      promotionDecisionTargetCounts[promotionDecisionTarget] =
        (promotionDecisionTargetCounts[promotionDecisionTarget] || 0) + 1;

      const promotionStatus = normalizeText(record.promotionStatus, 'unknown');
      promotionStatusCounts[promotionStatus] = (promotionStatusCounts[promotionStatus] || 0) + 1;

      const promotionStopConditionReason = normalizeText(record.promotionStopConditionReason);
      if (promotionStopConditionReason) {
        promotionStopConditionCount += 1;
        promotionStopConditionReasonCounts[promotionStopConditionReason] =
          (promotionStopConditionReasonCounts[promotionStopConditionReason] || 0) + 1;
      }

      const promotionVerificationStatus = normalizeText(record.promotionVerificationStatus);
      if (promotionVerificationStatus) {
        promotionVerificationCount += 1;
        promotionVerificationStatusCounts[promotionVerificationStatus] =
          (promotionVerificationStatusCounts[promotionVerificationStatus] || 0) + 1;
        if (promotionVerificationStatus === 'passed') {
          promotionVerificationPassedCount += 1;
        }
        if (promotionVerificationStatus === 'failed') {
          promotionVerificationFailedCount += 1;
        }
      }

      const promotionVerificationStopReason = normalizeText(record.promotionVerificationStopReason);
      if (promotionVerificationStopReason) {
        promotionVerificationStopReasonCounts[promotionVerificationStopReason] =
          (promotionVerificationStopReasonCounts[promotionVerificationStopReason] || 0) + 1;
      }

      const promotionVerificationType = normalizeText(record.promotionVerificationType);
      if (promotionVerificationType) {
        promotionVerificationTypeCounts[promotionVerificationType] =
          (promotionVerificationTypeCounts[promotionVerificationType] || 0) + 1;
      }

      const proposalTarget = normalizeText(record.proposalTarget, 'unknown');
      proposalTargetCounts[proposalTarget] = (proposalTargetCounts[proposalTarget] || 0) + 1;

      const providerId = normalizeText(record.providerId, 'none');
      providerCounts[providerId] = (providerCounts[providerId] || 0) + 1;

      const providerFailureKind = normalizeText(record.providerFailureKind);
      if (providerFailureKind) {
        providerFailureKindCounts[providerFailureKind] =
          (providerFailureKindCounts[providerFailureKind] || 0) + 1;
      }

      const providerFallbackPolicy = normalizeText(record.providerFallbackPolicy);
      if (providerFallbackPolicy) {
        providerFallbackPolicyCounts[providerFallbackPolicy] =
          (providerFallbackPolicyCounts[providerFallbackPolicy] || 0) + 1;
      }

      for (const [reason, count] of Object.entries(record.providerFallbackStopReasonCounts || {})) {
        const normalizedReason = normalizeText(reason);
        if (normalizedReason) {
          providerFallbackStopReasonCounts[normalizedReason] =
            (providerFallbackStopReasonCounts[normalizedReason] || 0) + Number(count || 0);
        }
      }

      const recordType = normalizeText(record.recordType, 'unknown');
      recordTypeCounts[recordType] = (recordTypeCounts[recordType] || 0) + 1;

      const scope = normalizeText(record.scope, 'unknown');
      scopeCounts[scope] = (scopeCounts[scope] || 0) + 1;

      const status = normalizeText(record.status, 'unknown');
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const workspaceId = normalizeText(record.workspaceId);
      if (workspaceId) {
        workspaceCounts[workspaceId] = (workspaceCounts[workspaceId] || 0) + 1;
      }

      if (record.approvalRequired === true) {
        approvalRequiredCount += 1;
      }
      if (record.autoPromotion === true) {
        autoPromotionCount += 1;
      }
      if (record.evidencePolicy?.crossScopePromotionAllowed === true) {
        crossScopePromotionAllowedCount += 1;
      }
      if (record.evidencePolicy?.noRawCustomerPayloads === true) {
        noRawCustomerPayloadsCount += 1;
      }
      if (record.evidencePolicy?.noRawSecrets === true) {
        noRawSecretsCount += 1;
      }
      if (record.providerFailureRecoverable === true) {
        providerFailureRecoverableCount += 1;
      }
      if (record.providerFallbackUsed === true) {
        providerFallbackUsedCount += 1;
      }
      if (record.evidencePolicy?.promotionRequiresApproval === true) {
        promotionRequiresApprovalCount += 1;
      }
      if (record.reviewerRequired === true) {
        reviewerRequiredCount += 1;
      }
      if (record.rollbackEligible === true) {
        rollbackEligibleCount += 1;
      }
      if (record.evidencePolicy?.scopeLocked === true) {
        scopeLockedCount += 1;
      }
    }

    return {
      approvalRequiredCount,
      autonomousPromotionEnabled: false,
      autoPromotionCount,
      evidencePolicy: {
        crossScopePromotionAllowedCount,
        noRawCustomerPayloadsCount,
        noRawSecretsCount,
        promotionRequiresApprovalCount,
        rawPayloadIncluded: false,
        scopeLockedCount,
      },
      expirationStatusCounts,
      filter,
      gatewayEventRouteCounts,
      gatewayEventTypeCounts,
      latestRecord: getLatestItem(records, 'updatedAt') || getLatestItem(records, 'createdAt'),
      missionCounts,
      priorityCounts,
      productionReadyClaim: false,
      promotionDecisionResultCounts,
      promotionDecisionTargetCounts,
      promotionStatusCounts,
      promotionStopConditionCount,
      promotionStopConditionReasonCounts,
      promotionVerificationCount,
      promotionVerificationFailedCount,
      promotionVerificationPassedCount,
      promotionVerificationStatusCounts,
      promotionVerificationStopReasonCounts,
      promotionVerificationTypeCounts,
      proposalTargetCounts,
      providerCounts,
      providerFailureKindCounts,
      providerFailureRecoverableCount,
      providerFallbackPolicyCounts,
      providerFallbackStopReasonCounts,
      providerFallbackUsedCount,
      recordCount: records.length,
      recordTypeCounts,
      reviewerRequiredCount,
      rollbackEligibleCount,
      scopeCounts,
      statusCounts,
      stopReason: records.length ? '' : 'no-learning-candidates',
      workspaceCounts,
    };
  }

  function getLearningCandidateAudit(filter = {}) {
    const workspaceId = normalizeText(filter.workspaceId);
    const missionId = normalizeText(filter.missionId);
    const sessionId = normalizeText(filter.sessionId);
    const recordType = normalizeText(filter.recordType);
    const promotionStatus = normalizeText(filter.promotionStatus || filter.status);
    const proposalTarget = filter.target ? normalizeLearningPromotionTarget(filter.target) : '';
    const scope = filter.scope ? normalizeLearningPromotionScope(filter.scope) : '';
    const providerId = normalizeText(filter.providerId);
    const gatewayEventRoute = normalizeText(filter.gatewayEventRoute || filter.route);
    const providerFallbackPolicy = normalizeText(filter.providerFallbackPolicy);
    const providerFallbackStopReason = normalizeText(filter.providerFallbackStopReason || filter.fallbackStopReason);
    const since = normalizeTimestampFilter(filter.since, 'learning candidate audit since timestamp');

    if (promotionStatus && promotionStatus !== 'all' && !LEARNING_PROMOTION_STATUSES.includes(promotionStatus)) {
      throw new Error(`Unsupported learning candidate promotion status: ${promotionStatus}`);
    }

    const workspaceFilter = workspaceId ? getWorkspace(workspaceId) : null;
    const missionFilter = missionId ? getMission(missionId) : null;
    if (workspaceFilter && missionFilter && missionFilter.workspaceId !== workspaceFilter.id) {
      throw new Error(`Mission ${missionFilter.id} does not belong to workspace ${workspaceFilter.id}.`);
    }

    const sessionFilter = sessionId ? store.getSession(sessionId) : null;
    if (sessionId && !sessionFilter) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (sessionFilter && missionFilter && sessionFilter.missionId !== missionFilter.id) {
      throw new Error(`Session ${sessionFilter.id} does not belong to mission ${missionFilter.id}.`);
    }
    if (sessionFilter && workspaceFilter) {
      const sessionMission = getMission(sessionFilter.missionId);
      if (sessionMission.workspaceId !== workspaceFilter.id) {
        throw new Error(`Session ${sessionFilter.id} does not belong to workspace ${workspaceFilter.id}.`);
      }
    }

    const candidates = store
      .listLearningCandidates({
        missionId,
        recordType,
        sessionId,
        workspaceId: workspaceFilter?.id || missionFilter?.workspaceId || '',
        ...(promotionStatus && promotionStatus !== 'all' ? { promotionStatus } : {}),
      })
      .map((candidate) => buildLearningCandidateAuditRecord(candidate))
      .filter(Boolean)
      .filter((record) => !since || String(record.updatedAt || record.createdAt || '') >= since)
      .filter((record) => !proposalTarget || record.proposalTarget === proposalTarget)
      .filter((record) => !scope || record.scope === scope)
      .filter((record) => !providerId || record.providerId === providerId)
      .filter((record) => !gatewayEventRoute || record.gatewayEventRoute === gatewayEventRoute)
      .filter((record) => !providerFallbackPolicy || record.providerFallbackPolicy === providerFallbackPolicy)
      .filter(
        (record) =>
          !providerFallbackStopReason ||
          Number(record.providerFallbackStopReasonCounts?.[providerFallbackStopReason] || 0) > 0,
      );

    const normalizedFilter = {
      gatewayEventRoute: gatewayEventRoute || null,
      missionId: missionId || null,
      promotionStatus: promotionStatus || null,
      providerFallbackPolicy: providerFallbackPolicy || null,
      providerFallbackStopReason: providerFallbackStopReason || null,
      providerId: providerId || null,
      recordType: recordType || null,
      scope: scope || null,
      sessionId: sessionId || null,
      since: since || null,
      target: proposalTarget || null,
      workspaceId: workspaceId || null,
    };

    return {
      records: candidates,
      summary: summarizeLearningCandidateAudit(candidates, normalizedFilter),
    };
  }

  return {
    buildLearningCandidateAuditRecord,
    summarizeLearningCandidateAudit,
    getLearningCandidateAudit,
  };
}
