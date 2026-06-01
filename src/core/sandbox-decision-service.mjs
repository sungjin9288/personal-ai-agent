export const SANDBOX_DECISION_SCHEMA_VERSION = 'personal-ai-agent-sandbox-decision/v1';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeCapabilities(value) {
  return ensureArray(value)
    .map((item) => normalizeText(item))
    .filter(Boolean);
}

function normalizeBindings(bindings = {}) {
  const source = ensureObject(bindings);

  return {
    missionId: normalizeText(source.missionId) || null,
    providerId: normalizeText(source.providerId) || null,
    sessionId: normalizeText(source.sessionId) || null,
    workspaceId: normalizeText(source.workspaceId) || null,
  };
}

export function normalizeSandboxDecision(input = {}) {
  const source = ensureObject(input);
  const bindings = normalizeBindings(source.bindings);
  const actionType = normalizeText(source.actionType, 'runtime-action');
  const resourceType = normalizeText(source.resourceType, 'runtime');
  const policyId = normalizeText(source.policyId, 'local-runtime-sandbox-policy/v1');

  return {
    action: {
      command: normalizeText(source.command) || null,
      route: normalizeText(source.route) || null,
      surface: normalizeText(source.surface, 'local-runtime'),
      type: actionType,
    },
    at: normalizeText(source.at) || null,
    bindings,
    capabilities: {
      deniedCapabilities: normalizeCapabilities(source.deniedCapabilities),
    },
    evidencePolicy: {
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      routeVisibleInTimeline: true,
    },
    id: normalizeText(source.id) || null,
    metadata: ensureObject(source.metadata),
    mode: normalizeText(source.mode, 'local-runtime'),
    policyId,
    reason: normalizeText(source.reason, 'default-local-runtime-boundary'),
    resource: {
      id: normalizeText(source.resourceId) || bindings.missionId || bindings.workspaceId || null,
      type: resourceType,
    },
    schemaVersion: SANDBOX_DECISION_SCHEMA_VERSION,
    status: 'recorded',
  };
}

export function buildGatewaySandboxDecision({
  at,
  eventId,
  eventType,
  mission,
  providerId = '',
  route = '',
  sandboxPolicy = {},
  session = null,
  source,
  workspace,
}) {
  const normalizedEventType = normalizeText(eventType, 'gateway-event');
  const normalizedPolicy = ensureObject(sandboxPolicy);
  const normalizedSource = ensureObject(source);
  const missionId = normalizeText(mission?.id);
  const workspaceId = normalizeText(workspace?.id || mission?.workspaceId);

  return normalizeSandboxDecision({
    actionType: normalizedEventType,
    at,
    bindings: {
      missionId,
      providerId: normalizeText(providerId || session?.provider),
      sessionId: normalizeText(session?.id),
      workspaceId,
    },
    command: normalizedSource.command,
    deniedCapabilities: normalizedPolicy.deniedCapabilities,
    id: eventId ? `${eventId}:sandbox` : null,
    metadata: {
      channel: normalizeText(normalizedSource.channel) || null,
      sourceType: normalizeText(normalizedSource.sourceType, 'service'),
    },
    mode: normalizedPolicy.mode || 'local-runtime',
    policyId: normalizedPolicy.policyId || 'local-runtime-sandbox-policy/v1',
    reason: normalizedPolicy.reason || 'default-local-runtime-boundary',
    resourceId: missionId || workspaceId,
    resourceType: missionId ? 'mission' : 'workspace',
    route,
    surface: normalizedSource.surface || normalizedSource.channel || normalizedSource.sourceType,
  });
}

export function summarizeSandboxDecisionForTimeline(sandboxDecision) {
  if (!sandboxDecision) {
    return '';
  }

  const mode = normalizeText(sandboxDecision.mode, 'local-runtime');
  const actionType = normalizeText(sandboxDecision.action?.type, 'runtime-action');
  const resourceType = normalizeText(sandboxDecision.resource?.type, 'runtime');
  const policyId = normalizeText(sandboxDecision.policyId, 'local-runtime-sandbox-policy/v1');
  const deniedCapabilities = normalizeCapabilities(sandboxDecision.capabilities?.deniedCapabilities);
  const deniedSuffix = deniedCapabilities.length ? ` denied=${deniedCapabilities.join(',')}` : '';

  return `sandbox ${mode} for ${actionType} on ${resourceType} policy=${policyId}${deniedSuffix}`;
}
