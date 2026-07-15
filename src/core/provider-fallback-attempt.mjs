import { evaluateProviderFallbackPolicy } from './provider-fallback-policy.mjs';
import { buildProviderFallbackRouteDecision } from './provider-route-decision-service.mjs';

function normalizeText(value) {
  return String(value || '').trim();
}

export function buildProviderFallbackAttemptOptions({ fallbackPlan, index, options = {}, providerId }) {
  return {
    ...options,
    provider: providerId,
    providerSpecified: true,
    sourceContext: {
      ...options.sourceContext,
      providerFallbackAttempt: index + 1,
      providerFallbackAttemptCount: fallbackPlan.providerIds.length,
      providerFallbackFallbacks: fallbackPlan.fallbackProviderIds,
      providerFallbackPolicy: fallbackPlan.policyId,
      providerFallbackPrimary: fallbackPlan.primaryProviderId,
      providerFallbackRequested: true,
    },
  };
}

export function buildProviderFallbackAttemptRecord({
  fallbackMission,
  fallbackPlan,
  fallbackWorkspace,
  index,
  providerFailure,
  providerId,
  result,
}) {
  const missionStatus = normalizeText(result.mission?.status);
  const fallbackPolicyDecision = evaluateProviderFallbackPolicy({
    isLastAttempt: index >= fallbackPlan.providerIds.length - 1,
    missionStatus,
    policyId: fallbackPlan.policyId,
    providerFailure,
  });
  const nextProviderId = fallbackPolicyDecision.eligible ? fallbackPlan.providerIds[index + 1] || null : null;
  const providerRouteDecision = buildProviderFallbackRouteDecision({
    attempt: index + 1,
    attemptCount: fallbackPlan.providerIds.length,
    fallbackEligible: fallbackPolicyDecision.eligible,
    fallbackProviderIds: fallbackPlan.fallbackProviderIds,
    mission: result.mission || fallbackMission,
    missionStatus,
    nextProviderId,
    policyId: fallbackPolicyDecision.policyId,
    primaryProviderId: fallbackPlan.primaryProviderId,
    providerFailure,
    providerId,
    session: result.session,
    stopReason: fallbackPolicyDecision.reason,
    workspace: fallbackWorkspace,
  });

  return {
    fallbackEligible: fallbackPolicyDecision.eligible,
    fallbackAttempt: index + 1,
    fallbackPolicy: fallbackPolicyDecision.policyId,
    fallbackStopReason: fallbackPolicyDecision.reason,
    gatewayEventId: result.session?.sourceContext?.gatewayEventId || null,
    missionStatus,
    nextProviderId,
    providerFailure,
    providerId,
    providerRouteDecision,
    providerRouteDecisionId: providerRouteDecision.id,
    sessionId: result.session.id,
    status: normalizeText(result.session?.status),
  };
}
