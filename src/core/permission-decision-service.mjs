export const PERMISSION_DECISION_SCHEMA_VERSION = 'personal-ai-agent-permission-decision/v1';

const PERMISSION_DECISIONS = new Set(['allow', 'approval-required', 'deny']);

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeDecision(value, approvalRequired = false) {
  const normalized = normalizeText(value);
  if (PERMISSION_DECISIONS.has(normalized)) {
    return normalized;
  }
  return approvalRequired ? 'approval-required' : 'allow';
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

export function normalizePermissionDecision(input = {}) {
  const source = ensureObject(input);
  const explicitApprovalRequired =
    typeof source.approvalRequired === 'boolean' ? source.approvalRequired : null;
  const decision = normalizeDecision(source.decision, Boolean(explicitApprovalRequired));
  const approvalRequired = explicitApprovalRequired ?? decision === 'approval-required';
  const bindings = normalizeBindings(source.bindings);
  const actionType = normalizeText(source.actionType, 'runtime-action');
  const resourceType = normalizeText(source.resourceType, 'runtime');
  const policyId = normalizeText(source.policyId, 'local-runtime-permission-policy/v1');

  return {
    action: {
      command: normalizeText(source.command) || null,
      route: normalizeText(source.route) || null,
      surface: normalizeText(source.surface, 'local-runtime'),
      type: actionType,
    },
    approvalRequired,
    at: normalizeText(source.at) || null,
    bindings,
    capabilities: {
      allowedCapabilities: normalizeCapabilities(source.allowedCapabilities),
      deniedCapabilities: normalizeCapabilities(source.deniedCapabilities),
    },
    decision,
    evidencePolicy: {
      noRawCustomerPayloads: true,
      noRawSecrets: true,
      routeVisibleInTimeline: true,
    },
    id: normalizeText(source.id) || null,
    metadata: ensureObject(source.metadata),
    policyId,
    reason: normalizeText(source.reason, policyId),
    resource: {
      id: normalizeText(source.resourceId) || bindings.providerId || bindings.missionId || null,
      type: resourceType,
    },
    schemaVersion: PERMISSION_DECISION_SCHEMA_VERSION,
    status: 'recorded',
  };
}

export function buildGatewayPermissionDecision({
  at,
  eventId,
  eventType,
  mission,
  permissionPolicy = {},
  providerId = '',
  route = '',
  session = null,
  source,
  workspace,
}) {
  const normalizedEventType = normalizeText(eventType, 'gateway-event');
  const normalizedSource = ensureObject(source);
  const normalizedPolicy = ensureObject(permissionPolicy);
  const missionId = normalizeText(mission?.id);
  const workspaceId = normalizeText(workspace?.id || mission?.workspaceId);

  return normalizePermissionDecision({
    actionType: normalizedEventType,
    allowedCapabilities: normalizedPolicy.allowedCapabilities || ['gateway-route'],
    approvalRequired: normalizedPolicy.approvalRequired,
    at,
    bindings: {
      missionId,
      providerId: normalizeText(providerId || session?.provider),
      sessionId: normalizeText(session?.id),
      workspaceId,
    },
    command: normalizedSource.command,
    decision: normalizedPolicy.decision,
    deniedCapabilities: normalizedPolicy.deniedCapabilities,
    id: eventId ? `${eventId}:permission` : null,
    metadata: {
      channel: normalizeText(normalizedSource.channel) || null,
      sourceType: normalizeText(normalizedSource.sourceType, 'service'),
    },
    policyId: normalizedPolicy.policyId || 'local-runtime-gateway-permission/v1',
    reason: normalizedPolicy.reason || 'local-runtime-gateway-event',
    resourceId: missionId || workspaceId,
    resourceType: missionId ? 'mission' : 'workspace',
    route,
    surface: normalizedSource.surface || normalizedSource.channel || normalizedSource.sourceType,
  });
}

export function buildProviderAttentionRemediationPermissionDecision({
  actionId,
  at,
  attentionItem,
  fallbackPolicy = '',
  fallbackProvider = '',
  remediationKind = '',
}) {
  const providerId = normalizeText(attentionItem?.providerId);
  const eventFamily = normalizeText(attentionItem?.eventFamily);
  const fallbackProviderId = normalizeText(fallbackProvider);
  const normalizedFallbackPolicy = normalizeText(fallbackPolicy);
  const normalizedRemediationKind = normalizeText(remediationKind, 'provider-attention-remediation');

  return normalizePermissionDecision({
    actionType: 'provider-attention-remediation',
    allowedCapabilities: [
      normalizedRemediationKind,
      fallbackProviderId ? 'provider-fallback-rerun' : 'same-provider-rerun',
    ],
    at,
    bindings: {
      missionId: normalizeText(attentionItem?.missionId),
      providerId,
      sessionId: normalizeText(attentionItem?.sessionId),
      workspaceId: normalizeText(attentionItem?.workspaceId),
    },
    command: `action remediate-provider-attention ${normalizeText(actionId)}`.trim(),
    decision: 'allow',
    id: actionId ? `${actionId}:permission` : null,
    metadata: {
      eventFamily: eventFamily || null,
      fallbackPolicy: normalizedFallbackPolicy || null,
      fallbackProviderId: fallbackProviderId || null,
      remediationKind: normalizedRemediationKind,
    },
    policyId: 'provider-attention-remediation-permission/v1',
    reason: fallbackProviderId
      ? 'operator-requested-provider-fallback-remediation'
      : 'operator-requested-provider-attention-remediation',
    resourceId: providerId,
    resourceType: 'provider',
    route: 'action.remediate-provider-attention',
    surface: 'cli',
  });
}

export function summarizePermissionDecisionForTimeline(permissionDecision) {
  if (!permissionDecision) {
    return '';
  }

  const decision = normalizeText(permissionDecision.decision, 'allow');
  const actionType = normalizeText(permissionDecision.action?.type, 'runtime-action');
  const resourceType = normalizeText(permissionDecision.resource?.type, 'runtime');
  const policyId = normalizeText(permissionDecision.policyId, 'local-runtime-permission-policy/v1');
  const approvalSuffix = permissionDecision.approvalRequired ? ' approvalRequired=true' : '';

  return `permission ${decision} for ${actionType} on ${resourceType} policy=${policyId}${approvalSuffix}`;
}
