export const PROVIDER_ROUTE_DECISION_SCHEMA_VERSION = 'personal-ai-agent-provider-route-decision/v1';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeInteger(value, fallback = null) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeBindings(bindings = {}) {
  const source = ensureObject(bindings);

  return {
    gatewayEventId: normalizeText(source.gatewayEventId) || null,
    permissionDecisionId: normalizeText(source.permissionDecisionId) || null,
    sandboxDecisionId: normalizeText(source.sandboxDecisionId) || null,
    missionId: normalizeText(source.missionId) || null,
    sessionId: normalizeText(source.sessionId) || null,
    workspaceId: normalizeText(source.workspaceId) || null,
  };
}

function normalizeProviderFailure(providerFailure = null) {
  const source = ensureObject(providerFailure);
  if (!Object.keys(source).length) {
    return null;
  }

  return {
    attemptCount: normalizeInteger(source.attemptCount, 1),
    failureKind: normalizeText(source.failureKind) || null,
    httpStatus: normalizeInteger(source.httpStatus, null),
    recoverable: typeof source.recoverable === 'boolean' ? source.recoverable : null,
    retryCount: normalizeInteger(source.retryCount, 0),
    role: normalizeText(source.role) || null,
    runId: normalizeText(source.runId) || null,
    timedOut: Boolean(source.timedOut),
  };
}

function normalizeDecision(value, { fallbackEligible = false, fallbackUsed = false } = {}) {
  const normalized = normalizeText(value);
  if (['fallback-eligible', 'fallback-used', 'stop-condition'].includes(normalized)) {
    return normalized;
  }
  if (fallbackUsed) {
    return 'fallback-used';
  }
  if (fallbackEligible) {
    return 'fallback-eligible';
  }
  return 'stop-condition';
}

export function normalizeProviderRouteDecision(input = {}) {
  const source = ensureObject(input);
  const bindings = normalizeBindings(source.bindings);
  const attempt = normalizeInteger(source.attempt, 1);
  const attemptCount = normalizeInteger(source.attemptCount, attempt);
  const fallbackEligible = Boolean(source.fallbackEligible);
  const fallbackUsed = Boolean(source.fallbackUsed);
  const policyId = normalizeText(source.policyId, 'provider-failure-only');
  const providerId = normalizeText(source.providerId) || null;

  return {
    action: {
      command: normalizeText(source.command) || null,
      route: normalizeText(source.route, 'mission.run'),
      surface: normalizeText(source.surface, 'cli'),
      type: normalizeText(source.actionType, 'provider-fallback-route'),
    },
    at: normalizeText(source.at) || null,
    bindings,
    decision: normalizeDecision(source.decision, { fallbackEligible, fallbackUsed }),
    evidencePolicy: {
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      routeVisibleInTimeline: true,
    },
    id: normalizeText(source.id) || null,
    metadata: ensureObject(source.metadata),
    policyId,
    providerFailure: normalizeProviderFailure(source.providerFailure),
    providerRoute: {
      attempt,
      attemptCount,
      fallbackEligible,
      fallbackProviderIds: ensureArray(source.fallbackProviderIds)
        .map((item) => normalizeText(item))
        .filter(Boolean),
      fallbackUsed,
      nextProviderId: normalizeText(source.nextProviderId) || null,
      primaryProviderId: normalizeText(source.primaryProviderId || providerId) || null,
      providerId,
      selectedProviderId: normalizeText(source.selectedProviderId || providerId) || null,
      stopReason: normalizeText(source.stopReason) || null,
    },
    resource: {
      id: providerId,
      type: 'provider',
    },
    schemaVersion: PROVIDER_ROUTE_DECISION_SCHEMA_VERSION,
    status: 'recorded',
  };
}

export function buildProviderFallbackRouteDecision({
  attempt = 1,
  attemptCount = 1,
  fallbackEligible = false,
  fallbackProviderIds = [],
  mission,
  missionStatus = '',
  nextProviderId = '',
  policyId = 'provider-failure-only',
  primaryProviderId = '',
  providerFailure = null,
  providerId = '',
  session = null,
  stopReason = '',
  workspace = null,
}) {
  const sourceContext = ensureObject(session?.sourceContext);
  const gatewayEventId = normalizeText(sourceContext.gatewayEventId);
  const fallbackUsed = Number(attempt) > 1;

  return normalizeProviderRouteDecision({
    actionType: 'provider-fallback-route',
    at: session?.endedAt || session?.startedAt || null,
    attempt,
    attemptCount,
    bindings: {
      gatewayEventId,
      permissionDecisionId: normalizeText(sourceContext.gatewayPermissionDecisionId),
      sandboxDecisionId: normalizeText(sourceContext.gatewaySandboxDecisionId),
      missionId: normalizeText(mission?.id || session?.missionId),
      sessionId: normalizeText(session?.id),
      workspaceId: normalizeText(workspace?.id || mission?.workspaceId),
    },
    command: normalizeText(sourceContext.command),
    decision: fallbackUsed ? 'fallback-used' : fallbackEligible ? 'fallback-eligible' : 'stop-condition',
    fallbackEligible,
    fallbackProviderIds,
    fallbackUsed,
    id: gatewayEventId ? `${gatewayEventId}:provider-route` : session?.id ? `${session.id}:provider-route` : null,
    metadata: {
      gatewayEventRoute: normalizeText(sourceContext.gatewayEventRoute) || null,
      missionStatus: normalizeText(missionStatus) || null,
      sourceType: normalizeText(sourceContext.sourceType, 'service'),
    },
    nextProviderId,
    policyId,
    primaryProviderId,
    providerFailure,
    providerId: providerId || session?.provider,
    route: normalizeText(sourceContext.gatewayEventRoute || sourceContext.route, 'mission.run'),
    selectedProviderId: providerId || session?.provider,
    stopReason,
    surface: normalizeText(sourceContext.surface || sourceContext.channel || sourceContext.sourceType, 'cli'),
  });
}

export function summarizeProviderRouteDecisionForTimeline(providerRouteDecision) {
  if (!providerRouteDecision) {
    return '';
  }

  const decision = normalizeText(providerRouteDecision.decision, 'stop-condition');
  const route = normalizeText(providerRouteDecision.action?.route, 'mission.run');
  const providerId = normalizeText(providerRouteDecision.providerRoute?.providerId);
  const policyId = normalizeText(providerRouteDecision.policyId, 'provider-failure-only');
  const stopReason = normalizeText(providerRouteDecision.providerRoute?.stopReason);
  const nextProviderId = normalizeText(providerRouteDecision.providerRoute?.nextProviderId);
  const nextSuffix = nextProviderId ? ` nextProvider=${nextProviderId}` : '';
  const stopSuffix = stopReason ? ` stopReason=${stopReason}` : '';

  return `provider route ${decision} route=${route} provider=${providerId} policy=${policyId}${stopSuffix}${nextSuffix}`;
}
