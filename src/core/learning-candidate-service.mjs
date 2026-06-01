import { LEARNING_PROMOTION_REVIEW_TTL_HOURS } from './constants.mjs';

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

function addHours(isoTimestamp, hours) {
  const timestamp = Date.parse(String(isoTimestamp || ''));
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp + hours * 60 * 60 * 1000).toISOString();
}

function countBy(items, fieldName) {
  return ensureArray(items).reduce((counts, item) => {
    const key = normalizeText(item?.[fieldName], 'unknown');
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function countProviderFallbackStopReasons(attempts) {
  return ensureArray(attempts).reduce((counts, attempt) => {
    const stopReason = normalizeText(attempt?.fallbackStopReason);
    if (stopReason) {
      counts[stopReason] = (counts[stopReason] || 0) + 1;
    }
    return counts;
  }, {});
}

export function buildProviderFallbackLearningEvidence(providerFallback) {
  if (!providerFallback) {
    return {
      providerFallbackPolicy: null,
      providerFallbackStopReasonCounts: {},
      providerFallbackSummary: null,
    };
  }

  const attempts = ensureArray(providerFallback.attempts).map((attempt) => ({
    fallbackAttempt: Number(attempt?.fallbackAttempt || 0) || null,
    fallbackEligible: typeof attempt?.fallbackEligible === 'boolean' ? attempt.fallbackEligible : null,
    fallbackPolicy: normalizeText(attempt?.fallbackPolicy) || null,
    fallbackStopReason: normalizeText(attempt?.fallbackStopReason) || null,
    missionStatus: normalizeText(attempt?.missionStatus) || null,
    nextProviderId: normalizeText(attempt?.nextProviderId) || null,
    providerFailureKind: normalizeText(attempt?.providerFailure?.failureKind) || null,
    providerFailureRecoverable:
      typeof attempt?.providerFailure?.recoverable === 'boolean' ? attempt.providerFailure.recoverable : null,
    providerId: normalizeText(attempt?.providerId) || null,
    sessionId: normalizeText(attempt?.sessionId) || null,
    status: normalizeText(attempt?.status) || null,
  }));
  const fallbackStopReasonCounts = {
    ...countProviderFallbackStopReasons(attempts),
    ...ensureObject(providerFallback.fallbackStopReasonCounts),
  };

  return {
    providerFallbackPolicy: normalizeText(providerFallback.policyId) || null,
    providerFallbackStopReasonCounts: fallbackStopReasonCounts,
    providerFallbackSummary: {
      attemptedProviderIds: ensureArray(providerFallback.attemptedProviderIds),
      attempts,
      enabled: Boolean(providerFallback.enabled),
      fallbackProviderIds: ensureArray(providerFallback.fallbackProviderIds),
      fallbackUsed: Boolean(providerFallback.fallbackUsed),
      finalStatus: normalizeText(providerFallback.finalStatus) || null,
      policyId: normalizeText(providerFallback.policyId) || null,
      primaryProviderId: normalizeText(providerFallback.primaryProviderId) || null,
      selectedProviderId: normalizeText(providerFallback.selectedProviderId) || null,
    },
  };
}

export function hasProviderFallbackProviderFailure(providerFallback) {
  return ensureArray(providerFallback?.attempts).some((attempt) => Boolean(attempt?.providerFailure));
}

export function formatProviderFallbackLearningSummary(providerFallback) {
  const fallbackEvidence = buildProviderFallbackLearningEvidence(providerFallback);
  const summary = fallbackEvidence.providerFallbackSummary;
  if (!summary) {
    return '';
  }

  const stopReasons = Object.entries(fallbackEvidence.providerFallbackStopReasonCounts)
    .map(([reason, count]) => `${reason}=${count}`)
    .join(', ');
  const selectedProvider = summary.selectedProviderId || 'none';
  const primaryProvider = summary.primaryProviderId || 'unknown';
  const status = summary.finalStatus || 'unknown';
  const used = summary.fallbackUsed ? `selected fallback provider ${selectedProvider}` : 'stopped without fallback use';
  const stopReasonSuffix = stopReasons ? ` stopReasons: ${stopReasons}.` : '';

  return `Provider fallback policy ${summary.policyId || 'unknown'} routed primary ${primaryProvider} and ${used}; finalStatus=${status}.${stopReasonSuffix}`;
}

function deriveRecordType({ missionStatus, providerFailure, providerFallback, reviewerVerdict }) {
  if (providerFailure || hasProviderFallbackProviderFailure(providerFallback)) {
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
  const providerFallbackEvidence = buildProviderFallbackLearningEvidence(providerFallback);
  const recordType = deriveRecordType({ missionStatus, providerFailure, providerFallback, reviewerVerdict });
  const normalizedMissionStatus = normalizeText(missionStatus, mission?.status || 'unknown');
  const normalizedReviewerVerdict = normalizeText(reviewerVerdict) || null;
  const runIds = ensureArray(agentRuns).map((run) => run.id).filter(Boolean);
  const artifactIds = ensureArray(artifacts).map((artifact) => artifact.id).filter(Boolean);
  const artifactKinds = countBy(artifacts, 'kind');
  const runStatusCounts = countBy(agentRuns, 'status');
  const gatewayEventId = normalizeText(session?.sourceContext?.gatewayEventId) || null;
  const providerFallbackSummaryReason = hasProviderFallbackProviderFailure(providerFallback)
    ? formatProviderFallbackLearningSummary(providerFallback)
    : '';
  const summaryReason =
    providerFallbackSummaryReason ||
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
      ...providerFallbackEvidence,
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
      expiresAt: addHours(at, LEARNING_PROMOTION_REVIEW_TTL_HOURS),
      reviewTtlHours: LEARNING_PROMOTION_REVIEW_TTL_HOURS,
      reviewerRequired: true,
      target: deriveProposalTarget(recordType),
    },
    recordType,
    retention: {
      class: 'mission-evidence',
      deleteWithMissionScope: true,
      expiresAt: addHours(at, LEARNING_PROMOTION_REVIEW_TTL_HOURS),
      policy: 'pending-review-expires-unpromoted',
      reviewTtlHours: LEARNING_PROMOTION_REVIEW_TTL_HOURS,
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
