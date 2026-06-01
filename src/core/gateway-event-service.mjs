import {
  buildGatewayPermissionDecision,
  summarizePermissionDecisionForTimeline,
} from './permission-decision-service.mjs';
import {
  buildGatewaySandboxDecision,
  summarizeSandboxDecisionForTimeline,
} from './sandbox-decision-service.mjs';

export const GATEWAY_EVENT_SCHEMA_VERSION = 'personal-ai-agent-gateway-event/v1';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeSourceContext(value = {}) {
  const source = ensureObject(value);
  const sourceType = normalizeText(source.sourceType, 'service');
  const channel = normalizeText(source.channel) || sourceType;
  const route = normalizeText(source.route);
  const command = normalizeText(source.command);

  return {
    channel,
    command,
    requestId: normalizeText(source.requestId) || null,
    route,
    sourceType,
    startedBy: normalizeText(source.startedBy, 'local-operator'),
    surface: normalizeText(source.surface) || channel || sourceType,
  };
}

function normalizeProviderFallbackContext(sourceContext = {}) {
  if (!sourceContext.providerFallbackRequested) {
    return {};
  }

  return {
    providerFallbackAttempt: Number.isFinite(Number(sourceContext.providerFallbackAttempt))
      ? Number(sourceContext.providerFallbackAttempt)
      : null,
    providerFallbackAttemptCount: Number.isFinite(Number(sourceContext.providerFallbackAttemptCount))
      ? Number(sourceContext.providerFallbackAttemptCount)
      : null,
    providerFallbackFallbacks: ensureArray(sourceContext.providerFallbackFallbacks)
      .map((item) => normalizeText(item))
      .filter(Boolean),
    providerFallbackPolicy: normalizeText(sourceContext.providerFallbackPolicy) || null,
    providerFallbackPrimary: normalizeText(sourceContext.providerFallbackPrimary) || null,
    providerFallbackRequested: true,
  };
}

export function normalizeGatewayEvent({
  at,
  eventType,
  id,
  mission,
  permissionPolicy = {},
  providerId = '',
  route = '',
  sandboxPolicy = {},
  session = null,
  sourceContext = {},
  workspace,
}) {
  const source = normalizeSourceContext({
    ...sourceContext,
    route: route || sourceContext.route,
  });
  const normalizedEventType = normalizeText(eventType, 'mission-run');
  const normalizedRoute = normalizeText(route || source.route || normalizedEventType.replaceAll('-', '.'));
  const fallbackPolicy = normalizeText(sourceContext.providerFallbackPolicy) || null;
  const fallbackRequested = Boolean(sourceContext.providerFallbackRequested);
  const permissionDecision = buildGatewayPermissionDecision({
    at,
    eventId: id,
    eventType: normalizedEventType,
    mission,
    permissionPolicy,
    providerId,
    route: normalizedRoute,
    session,
    source,
    workspace,
  });
  const sandboxDecision = buildGatewaySandboxDecision({
    at,
    eventId: id,
    eventType: normalizedEventType,
    mission,
    providerId,
    route: normalizedRoute,
    sandboxPolicy,
    session,
    source,
    workspace,
  });

  return {
    at,
    bindings: {
      missionId: mission?.id || null,
      providerId: normalizeText(providerId || session?.provider) || null,
      sessionId: session?.id || null,
      workspaceId: workspace?.id || mission?.workspaceId || null,
    },
    eventType: normalizedEventType,
    evidencePolicy: {
      artifactEligible: true,
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      routeVisibleInTimeline: true,
    },
    id,
    status: 'recorded',
    identity: {
      actorType: 'local-operator',
      missionBound: Boolean(mission?.id),
      sessionBound: Boolean(session?.id),
      startedBy: source.startedBy,
      trustBoundary: 'local-first-runtime',
      workspaceBound: Boolean(workspace?.id || mission?.workspaceId),
    },
    permissionPolicy: {
      approvalRequired: permissionDecision.approvalRequired,
      decision: permissionDecision.decision,
      deniedCapabilities: permissionDecision.capabilities.deniedCapabilities,
      permissionDecisionId: permissionDecision.id,
      policyId: permissionDecision.policyId,
      reason: permissionDecision.reason,
    },
    permissionDecision,
    providerRoute: {
      fallbackAttempt: Number.isFinite(Number(sourceContext.providerFallbackAttempt))
        ? Number(sourceContext.providerFallbackAttempt)
        : null,
      fallbackAttemptCount: Number.isFinite(Number(sourceContext.providerFallbackAttemptCount))
        ? Number(sourceContext.providerFallbackAttemptCount)
        : null,
      fallbackProviderIds: ensureArray(sourceContext.providerFallbackFallbacks).map((item) => normalizeText(item)).filter(Boolean),
      fallbackRequested,
      policyId: fallbackPolicy,
      primaryProviderId: normalizeText(sourceContext.providerFallbackPrimary) || null,
      providerId: normalizeText(providerId || session?.provider) || null,
    },
    route: {
      command: source.command,
      deliverableType: mission?.deliverableType || null,
      mode: mission?.mode || null,
      name: normalizedRoute,
      surface: source.surface,
    },
    sandboxDecision,
    sandboxPolicy: {
      deniedCapabilities: sandboxDecision.capabilities.deniedCapabilities,
      mode: sandboxDecision.mode,
      policyId: sandboxDecision.policyId,
      reason: sandboxDecision.reason,
      sandboxDecisionId: sandboxDecision.id,
    },
    schemaVersion: GATEWAY_EVENT_SCHEMA_VERSION,
    source,
  };
}

export function attachGatewayEventToSourceContext(sourceContext = {}, gatewayEvent) {
  const source = normalizeSourceContext({
    ...sourceContext,
    route: gatewayEvent?.route?.name || sourceContext.route,
  });

  return {
    ...source,
    ...normalizeProviderFallbackContext(sourceContext),
    gatewayEventId: gatewayEvent?.id || null,
    gatewayPermissionDecisionId: gatewayEvent?.permissionDecision?.id || null,
    gatewaySandboxDecisionId: gatewayEvent?.sandboxDecision?.id || null,
    gatewayEventSchemaVersion: gatewayEvent?.schemaVersion || GATEWAY_EVENT_SCHEMA_VERSION,
    gatewayEventType: gatewayEvent?.eventType || null,
    gatewayEventRoute: gatewayEvent?.route?.name || source.route,
    route: gatewayEvent?.route?.name || normalizeText(sourceContext.route),
  };
}

export function summarizeGatewayEventForTimeline(event) {
  const sourceType = normalizeText(event?.source?.sourceType, 'service');
  const routeName = normalizeText(event?.route?.name, event?.eventType || 'gateway-event');
  const providerId = normalizeText(event?.providerRoute?.providerId);
  const fallbackPolicy = normalizeText(event?.providerRoute?.policyId);
  const providerSuffix = providerId ? ` provider=${providerId}` : '';
  const fallbackSuffix = fallbackPolicy ? ` fallbackPolicy=${fallbackPolicy}` : '';
  const permissionSummary = summarizePermissionDecisionForTimeline(event?.permissionDecision);
  const permissionSuffix = permissionSummary ? ` ${permissionSummary}.` : '';
  const sandboxSummary = summarizeSandboxDecisionForTimeline(event?.sandboxDecision);
  const sandboxSuffix = sandboxSummary ? ` ${sandboxSummary}.` : '';

  return `${sourceType} gateway event routed through ${routeName}.${providerSuffix}${fallbackSuffix}${permissionSuffix}${sandboxSuffix}`;
}
