export const IDENTITY_SESSION_CONTEXT_SCHEMA_VERSION = 'personal-ai-agent-identity-session-context/v1';
export const IDENTITY_SESSION_CONTEXT_POLICY_ID = 'local-runtime-identity-session-policy/v1';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeSource(source = {}) {
  return {
    channel: normalizeText(source.channel, source.sourceType || 'service'),
    channelAdapterId: normalizeText(source.channelAdapterId) || null,
    channelAdapterPolicyId: normalizeText(source.channelAdapterPolicyId) || null,
    channelAdapterStatus: normalizeText(source.channelAdapterStatus) || null,
    channelAdapterStopReason: normalizeText(source.channelAdapterStopReason) || null,
    externalMessagingEnabled: source.externalMessagingEnabled === true,
    sourceType: normalizeText(source.sourceType, 'service'),
    surface: normalizeText(source.surface, source.channel || source.sourceType || 'service'),
  };
}

export function buildGatewayIdentitySessionContext({
  at,
  eventId,
  eventType,
  mission,
  providerId = '',
  route = '',
  session = null,
  source = {},
  workspace,
}) {
  const normalizedSource = normalizeSource(source);
  const normalizedEventType = normalizeText(eventType, 'gateway-event');
  const sessionRequired = normalizedEventType !== 'mission-create';
  const missionBound = Boolean(mission?.id);
  const sessionBound = Boolean(session?.id);
  const workspaceBound = Boolean(workspace?.id || mission?.workspaceId);
  const bindingComplete = missionBound && workspaceBound && (!sessionRequired || sessionBound);

  return {
    actor: {
      actorType: 'local-operator',
      startedBy: normalizeText(source.startedBy, 'local-operator'),
      trustBoundary: 'local-first-runtime',
    },
    at,
    bindingStatus: bindingComplete ? 'bound' : 'partial',
    bindings: {
      missionId: mission?.id || null,
      providerId: normalizeText(providerId || session?.provider) || null,
      sessionId: session?.id || null,
      workspaceId: workspace?.id || mission?.workspaceId || null,
    },
    evidencePolicy: {
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      routeVisibleInTimeline: true,
    },
    id: eventId ? `${eventId}:identity-session` : null,
    policyId: IDENTITY_SESSION_CONTEXT_POLICY_ID,
    route: {
      eventType: normalizedEventType,
      name: normalizeText(route, normalizedEventType.replaceAll('-', '.')),
    },
    schemaVersion: IDENTITY_SESSION_CONTEXT_SCHEMA_VERSION,
    scope: {
      crossScopePromotionAllowed: false,
      memoryLookupAfterBinding: true,
      memoryScope: mission?.id ? 'mission' : workspace?.id || mission?.workspaceId ? 'workspace' : 'none',
      sessionSeparationRequired: true,
    },
    source: normalizedSource,
    status: 'recorded',
    subject: {
      missionBound,
      sessionBound,
      sessionRequired,
      workspaceBound,
    },
  };
}

export function summarizeIdentitySessionContextForTimeline(identitySessionContext) {
  if (!identitySessionContext) {
    return '';
  }

  const actorType = normalizeText(identitySessionContext.actor?.actorType, 'local-operator');
  const routeName = normalizeText(identitySessionContext.route?.name, 'gateway-event');
  const sourceType = normalizeText(identitySessionContext.source?.sourceType, 'service');
  const bindingStatus = normalizeText(identitySessionContext.bindingStatus, 'partial');
  const memoryScope = normalizeText(identitySessionContext.scope?.memoryScope, 'none');

  return `identity/session ${bindingStatus} for ${routeName} via ${sourceType}; actor=${actorType}; memoryScope=${memoryScope}`;
}
