export const LEARNING_CANDIDATE_SCHEMA_VERSION = 'personal-ai-agent-learning-candidate/v1';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function countBy(items, fieldName) {
  return ensureArray(items).reduce((counts, item) => {
    const key = normalizeText(item?.[fieldName], 'unknown');
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function deriveRecordType({ missionStatus, providerFailure, reviewerVerdict }) {
  if (providerFailure) {
    return 'provider-lesson';
  }
  if (reviewerVerdict === 'fail') {
    return 'quality-regression';
  }
  if (['failed', 'blocked'].includes(normalizeText(missionStatus))) {
    return 'failure-pattern';
  }
  return 'success-pattern';
}

function deriveProposalTarget(recordType) {
  if (recordType === 'provider-lesson') {
    return 'provider-policy';
  }
  if (recordType === 'quality-regression' || recordType === 'failure-pattern') {
    return 'skill';
  }
  return 'template';
}

export function buildLearningCandidate({
  agentRuns = [],
  artifacts = [],
  at,
  id,
  mission,
  missionStatus,
  outcomeReason = '',
  providerFallback = null,
  providerFailure = null,
  providerId = '',
  reviewerVerdict = '',
  session,
  workspace,
}) {
  const recordType = deriveRecordType({ missionStatus, providerFailure, reviewerVerdict });
  const normalizedMissionStatus = normalizeText(missionStatus, mission?.status || 'unknown');
  const normalizedReviewerVerdict = normalizeText(reviewerVerdict) || null;
  const runIds = ensureArray(agentRuns).map((run) => run.id).filter(Boolean);
  const artifactIds = ensureArray(artifacts).map((artifact) => artifact.id).filter(Boolean);
  const artifactKinds = countBy(artifacts, 'kind');
  const runStatusCounts = countBy(agentRuns, 'status');
  const gatewayEventId = normalizeText(session?.sourceContext?.gatewayEventId) || null;
  const summaryReason =
    normalizeText(outcomeReason) ||
    normalizeText(providerFailure?.rawMessage) ||
    `Mission finished with status ${normalizedMissionStatus}.`;

  return {
    artifactId: null,
    artifactPath: null,
    autoPromotion: false,
    createdAt: at,
    evidence: {
      artifactIds,
      artifactKinds,
      gatewayEventId,
      gatewayEventRoute: normalizeText(session?.sourceContext?.gatewayEventRoute || session?.sourceContext?.route) || null,
      gatewayEventSchemaVersion: normalizeText(session?.sourceContext?.gatewayEventSchemaVersion) || null,
      gatewayEventType: normalizeText(session?.sourceContext?.gatewayEventType) || null,
      providerFallbackPolicy: normalizeText(providerFallback?.policyId) || null,
      providerFallbackStopReasonCounts: ensureObject(providerFallback?.fallbackStopReasonCounts),
      providerFallbackSummary: providerFallback
        ? {
            attemptedProviderIds: ensureArray(providerFallback.attemptedProviderIds),
            enabled: Boolean(providerFallback.enabled),
            fallbackUsed: Boolean(providerFallback.fallbackUsed),
            finalStatus: normalizeText(providerFallback.finalStatus) || null,
            policyId: normalizeText(providerFallback.policyId) || null,
            primaryProviderId: normalizeText(providerFallback.primaryProviderId) || null,
            selectedProviderId: normalizeText(providerFallback.selectedProviderId) || null,
          }
        : null,
      providerFailure: providerFailure
        ? {
            attemptCount: Number(providerFailure.attemptCount || 0),
            failureKind: providerFailure.failureKind || null,
            recoverable: typeof providerFailure.recoverable === 'boolean' ? providerFailure.recoverable : null,
            role: providerFailure.role || null,
            runId: providerFailure.runId || null,
            timedOut: Boolean(providerFailure.timedOut),
          }
        : null,
      providerId: normalizeText(providerId || session?.provider) || null,
      reviewerVerdict: normalizedReviewerVerdict,
      runIds,
      runStatusCounts,
    },
    id,
    missionId: mission.id,
    missionStatus: normalizedMissionStatus,
    promotionStatus: 'pending-review',
    proposal: {
      action: 'review-and-promote-manually',
      approvalRequired: true,
      autoPromotion: false,
      reviewerRequired: true,
      target: deriveProposalTarget(recordType),
    },
    recordType,
    retention: {
      class: 'mission-evidence',
      deleteWithMissionScope: true,
      expiresAt: null,
    },
    rollback: {
      action: 'delete-or-ignore-learning-candidate',
      safeWithoutRuntimeMutation: true,
    },
    safety: {
      crossScopePromotionAllowed: false,
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      promotionRequiresApproval: true,
      scopeLocked: true,
    },
    schemaVersion: LEARNING_CANDIDATE_SCHEMA_VERSION,
    scope: 'mission',
    scopeId: mission.id,
    sessionId: session.id,
    status: 'proposed',
    summary: summaryReason,
    title: `${recordType} candidate for ${mission.title}`,
    updatedAt: at,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };
}

export function formatLearningCandidateArtifactContent(candidate) {
  return `${JSON.stringify(candidate, null, 2)}\n`;
}
