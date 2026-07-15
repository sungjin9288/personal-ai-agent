function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function getLatestItem(items, fieldName) {
  if (!items.length) {
    return null;
  }

  return [...items]
    .sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || '')))
    .at(-1);
}

export function normalizeProviderFallbackIds(value) {
  const rawItems = Array.isArray(value) ? value : String(value || '').split(',');
  return rawItems.map((providerId) => normalizeText(providerId)).filter(Boolean);
}

export function normalizeProviderFallbackPolicy(value) {
  const normalized = normalizeText(value, 'provider-failure-only');
  if (normalized === 'provider-failure-only' || normalized === 'recoverable-provider-failure-only') {
    return normalized;
  }
  throw new Error(
    `Unsupported provider fallback policy: ${normalized}. Use provider-failure-only or recoverable-provider-failure-only.`,
  );
}

export function buildMissionProviderFallbackPlan({ explicitPolicyId = '', providerIds = [] } = {}) {
  if (explicitPolicyId && providerIds.length <= 1) {
    throw new Error('--fallback-policy requires --fallback-provider with at least one distinct fallback provider.');
  }

  return {
    enabled: providerIds.length > 1,
    fallbackProviderIds: providerIds.slice(1),
    policyId: normalizeProviderFallbackPolicy(explicitPolicyId || 'provider-failure-only'),
    primaryProviderId: providerIds[0] || '',
    providerIds: [...providerIds],
  };
}

export function evaluateProviderFallbackPolicy({
  isLastAttempt = false,
  missionStatus,
  policyId,
  providerFailure,
}) {
  const normalizedPolicyId = normalizeProviderFallbackPolicy(policyId);
  const normalizedMissionStatus = normalizeText(missionStatus);

  if (normalizedMissionStatus !== 'failed') {
    return {
      eligible: false,
      policyId: normalizedPolicyId,
      reason: `mission-status-${normalizedMissionStatus || 'unknown'}`,
    };
  }

  if (!providerFailure) {
    return {
      eligible: false,
      policyId: normalizedPolicyId,
      reason: 'no-provider-failure-metadata',
    };
  }

  if (isLastAttempt) {
    return {
      eligible: false,
      policyId: normalizedPolicyId,
      reason: 'fallback-provider-exhausted',
    };
  }

  if (normalizedPolicyId === 'recoverable-provider-failure-only' && providerFailure.recoverable !== true) {
    return {
      eligible: false,
      policyId: normalizedPolicyId,
      reason: 'non-recoverable-provider-failure',
    };
  }

  return {
    eligible: true,
    policyId: normalizedPolicyId,
    reason: 'eligible-provider-failure',
  };
}

export function buildProviderFallbackSummary({
  attempts,
  fallbackProviderIds,
  policyId,
  primaryProviderId,
  result,
}) {
  const selectedProviderId = normalizeText(result?.provider);
  const fallbackStopReasonCounts = {};
  const providerRouteDecisionPolicyCounts = {};
  const providerRouteDecisionRouteCounts = {};
  const providerRouteDecisions = [];

  for (const attempt of attempts) {
    const stopReason = normalizeText(attempt.fallbackStopReason);
    if (stopReason) {
      fallbackStopReasonCounts[stopReason] = (fallbackStopReasonCounts[stopReason] || 0) + 1;
    }

    if (!attempt.providerRouteDecision) {
      continue;
    }

    providerRouteDecisions.push(attempt.providerRouteDecision);
    const routeName = normalizeText(attempt.providerRouteDecision.action?.route);
    if (routeName) {
      providerRouteDecisionRouteCounts[routeName] = (providerRouteDecisionRouteCounts[routeName] || 0) + 1;
    }
    const routePolicyId = normalizeText(attempt.providerRouteDecision.policyId);
    if (routePolicyId) {
      providerRouteDecisionPolicyCounts[routePolicyId] =
        (providerRouteDecisionPolicyCounts[routePolicyId] || 0) + 1;
    }
  }

  return {
    attemptedProviderIds: attempts.map((attempt) => attempt.providerId),
    attempts,
    enabled: fallbackProviderIds.length > 0,
    fallbackProviderIds,
    fallbackStopReasonCounts,
    fallbackUsed: selectedProviderId !== primaryProviderId,
    finalStatus: normalizeText(result?.mission?.status),
    latestProviderRouteDecision: getLatestItem(providerRouteDecisions, 'at'),
    policyId: normalizeProviderFallbackPolicy(policyId),
    primaryProviderId,
    providerRouteDecisionCount: providerRouteDecisions.length,
    providerRouteDecisionPolicyCounts,
    providerRouteDecisionRouteCounts,
    selectedProviderId,
  };
}
