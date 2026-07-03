import { summarizeGatewayEventForTimeline } from './gateway-event-service.mjs';
import { summarizeIdentitySessionContextForTimeline } from './identity-session-context-service.mjs';
import { summarizeSandboxDecisionForTimeline } from './sandbox-decision-service.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
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

export function buildIdentitySessionContextTimelineEvent({ event, mission = null, workspace = null }) {
  const identitySessionContext = event?.identitySessionContext || null;
  if (!identitySessionContext) {
    return null;
  }

  return {
    actorType: identitySessionContext.actor?.actorType || event.identity?.actorType || null,
    at: event.at,
    channel: identitySessionContext.source?.channel || event.source?.channel || null,
    channelAdapterId: identitySessionContext.source?.channelAdapterId || event.source?.channelAdapterId || null,
    detail: summarizeIdentitySessionContextForTimeline(identitySessionContext),
    gatewayEventId: event.id,
    gatewayEventType: event.eventType,
    identitySessionBindingStatus: identitySessionContext.bindingStatus || null,
    identitySessionContext,
    identitySessionContextId: identitySessionContext.id || event.identity?.identitySessionContextId || null,
    identitySessionContextPolicyId: identitySessionContext.policyId || null,
    kind: 'identity-session-context-recorded',
    memoryLookupAfterBinding: identitySessionContext.scope?.memoryLookupAfterBinding === true,
    memoryScope: identitySessionContext.scope?.memoryScope || null,
    missionBound: identitySessionContext.subject?.missionBound === true,
    missionId: mission?.id || event.bindings?.missionId || null,
    missionTitle: mission?.title || null,
    providerId: event.providerRoute?.providerId || event.bindings?.providerId || null,
    route: event.route?.name || identitySessionContext.route?.name || null,
    sessionBound: identitySessionContext.subject?.sessionBound === true,
    sessionId: event.bindings?.sessionId || null,
    sourceType: identitySessionContext.source?.sourceType || event.source?.sourceType || null,
    status: identitySessionContext.status || event.status || 'recorded',
    trustBoundary: identitySessionContext.actor?.trustBoundary || event.identity?.trustBoundary || null,
    workspaceBound: identitySessionContext.subject?.workspaceBound === true,
    workspaceId: workspace?.id || event.bindings?.workspaceId || mission?.workspaceId || null,
    workspaceName: workspace?.name || null,
  };
}

export function buildIdentitySessionAuditRecord({ event, mission = null, workspace = null }) {
  const identitySessionContext = event?.identitySessionContext || null;
  if (!identitySessionContext) {
    return null;
  }

  const bindings = identitySessionContext.bindings || {};
  const source = identitySessionContext.source || {};
  const scope = identitySessionContext.scope || {};
  const subject = identitySessionContext.subject || {};

  return {
    actorType: identitySessionContext.actor?.actorType || event.identity?.actorType || null,
    at: identitySessionContext.at || event.at,
    bindingStatus: identitySessionContext.bindingStatus || 'partial',
    channel: source.channel || event.source?.channel || null,
    channelAdapterId: source.channelAdapterId || event.source?.channelAdapterId || null,
    channelAdapterPolicyId: source.channelAdapterPolicyId || event.source?.channelAdapterPolicyId || null,
    channelAdapterStatus: source.channelAdapterStatus || event.source?.channelAdapterStatus || null,
    crossScopePromotionAllowed: scope.crossScopePromotionAllowed === true,
    detail: summarizeIdentitySessionContextForTimeline(identitySessionContext),
    evidencePolicy: {
      noRawCustomerPayloads: identitySessionContext.evidencePolicy?.noRawCustomerPayloads === true,
      noRawSecrets: identitySessionContext.evidencePolicy?.noRawSecrets === true,
      rawPayloadIncluded: false,
      routeVisibleInTimeline: identitySessionContext.evidencePolicy?.routeVisibleInTimeline === true,
    },
    externalMessagingEnabled: source.externalMessagingEnabled === true,
    gatewayEventId: event.id,
    gatewayEventType: event.eventType,
    identitySessionContextId: identitySessionContext.id || event.identity?.identitySessionContextId || null,
    memoryLookupAfterBinding: scope.memoryLookupAfterBinding === true,
    memoryScope: scope.memoryScope || null,
    missionBound: subject.missionBound === true,
    missionId: mission?.id || bindings.missionId || event.bindings?.missionId || null,
    missionTitle: mission?.title || null,
    policyId: identitySessionContext.policyId || null,
    providerId: bindings.providerId || event.bindings?.providerId || null,
    route: identitySessionContext.route?.name || event.route?.name || null,
    schemaVersion: identitySessionContext.schemaVersion || null,
    sessionBound: subject.sessionBound === true,
    sessionId: bindings.sessionId || event.bindings?.sessionId || null,
    sessionRequired: subject.sessionRequired === true,
    sessionSeparationRequired: scope.sessionSeparationRequired === true,
    sourceType: source.sourceType || event.source?.sourceType || null,
    status: identitySessionContext.status || event.status || 'recorded',
    surface: source.surface || event.source?.surface || null,
    trustBoundary: identitySessionContext.actor?.trustBoundary || event.identity?.trustBoundary || null,
    workspaceBound: subject.workspaceBound === true,
    workspaceId: workspace?.id || bindings.workspaceId || event.bindings?.workspaceId || mission?.workspaceId || null,
    workspaceName: workspace?.name || null,
  };
}

export function summarizeIdentitySessionAudit(records, filter = {}) {
  const bindingStatusCounts = {};
  const channelAdapterStatusCounts = {};
  const channelCounts = {};
  const memoryScopeCounts = {};
  const missionCounts = {};
  const policyCounts = {};
  const providerCounts = {};
  const sourceTypeCounts = {};
  const workspaceCounts = {};
  let crossScopePromotionAllowedCount = 0;
  let externalMessagingEnabledCount = 0;
  let memoryLookupAfterBindingCount = 0;
  let missionBoundCount = 0;
  let noRawCustomerPayloadsCount = 0;
  let noRawSecretsCount = 0;
  let routeVisibleInTimelineCount = 0;
  let sessionBoundCount = 0;
  let sessionRequiredCount = 0;
  let sessionSeparationRequiredCount = 0;
  let workspaceBoundCount = 0;

  for (const record of records) {
    const bindingStatus = normalizeText(record.bindingStatus, 'unknown');
    bindingStatusCounts[bindingStatus] = (bindingStatusCounts[bindingStatus] || 0) + 1;

    const channelAdapterStatus = normalizeText(record.channelAdapterStatus, 'unknown');
    channelAdapterStatusCounts[channelAdapterStatus] =
      (channelAdapterStatusCounts[channelAdapterStatus] || 0) + 1;

    const channel = normalizeText(record.channel, 'unknown');
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;

    const memoryScope = normalizeText(record.memoryScope, 'unknown');
    memoryScopeCounts[memoryScope] = (memoryScopeCounts[memoryScope] || 0) + 1;

    const missionId = normalizeText(record.missionId);
    if (missionId) {
      missionCounts[missionId] = (missionCounts[missionId] || 0) + 1;
    }

    const policyId = normalizeText(record.policyId, 'unknown');
    policyCounts[policyId] = (policyCounts[policyId] || 0) + 1;

    const providerId = normalizeText(record.providerId, 'none');
    providerCounts[providerId] = (providerCounts[providerId] || 0) + 1;

    const sourceType = normalizeText(record.sourceType, 'unknown');
    sourceTypeCounts[sourceType] = (sourceTypeCounts[sourceType] || 0) + 1;

    const workspaceId = normalizeText(record.workspaceId);
    if (workspaceId) {
      workspaceCounts[workspaceId] = (workspaceCounts[workspaceId] || 0) + 1;
    }

    if (record.crossScopePromotionAllowed === true) {
      crossScopePromotionAllowedCount += 1;
    }
    if (record.externalMessagingEnabled === true) {
      externalMessagingEnabledCount += 1;
    }
    if (record.memoryLookupAfterBinding === true) {
      memoryLookupAfterBindingCount += 1;
    }
    if (record.missionBound === true) {
      missionBoundCount += 1;
    }
    if (record.evidencePolicy?.noRawCustomerPayloads === true) {
      noRawCustomerPayloadsCount += 1;
    }
    if (record.evidencePolicy?.noRawSecrets === true) {
      noRawSecretsCount += 1;
    }
    if (record.evidencePolicy?.routeVisibleInTimeline === true) {
      routeVisibleInTimelineCount += 1;
    }
    if (record.sessionBound === true) {
      sessionBoundCount += 1;
    }
    if (record.sessionRequired === true) {
      sessionRequiredCount += 1;
    }
    if (record.sessionSeparationRequired === true) {
      sessionSeparationRequiredCount += 1;
    }
    if (record.workspaceBound === true) {
      workspaceBoundCount += 1;
    }
  }

  return {
    bindingStatusCounts,
    channelAdapterStatusCounts,
    channelCounts,
    crossScopePromotionAllowedCount,
    evidencePolicy: {
      noRawCustomerPayloadsCount,
      noRawSecretsCount,
      rawPayloadIncluded: false,
      routeVisibleInTimelineCount,
    },
    externalMessagingEnabledCount,
    filter,
    latestRecord: getLatestItem(records, 'at'),
    memoryLookupAfterBindingCount,
    memoryScopeCounts,
    missionBoundCount,
    missionCounts,
    policyCounts,
    productionReadyClaim: false,
    providerCounts,
    recordCount: records.length,
    sessionBoundCount,
    sessionRequiredCount,
    sessionSeparationRequiredCount,
    sourceTypeCounts,
    stopReason: records.length ? '' : 'no-identity-session-context-records',
    targetIdentitySessionOperationsClaimAllowed: false,
    workspaceBoundCount,
    workspaceCounts,
  };
}

export function buildGatewayEventAuditRecord({ event, mission = null, workspace = null }) {
  if (!event) {
    return null;
  }

  const bindings = event.bindings || {};
  const evidencePolicy = event.evidencePolicy || {};
  const identitySessionContext = event.identitySessionContext || null;
  const permissionDecision = event.permissionDecision || null;
  const providerRoute = event.providerRoute || {};
  const sandboxDecision = event.sandboxDecision || null;
  const source = event.source || {};

  const providerFallbackProviderIds = ensureArray(providerRoute.fallbackProviderIds)
    .map((providerId) => normalizeText(providerId))
    .filter(Boolean);

  return {
    at: event.at,
    channel: source.channel || null,
    channelAdapterId: source.channelAdapterId || null,
    channelAdapterPolicyId: source.channelAdapterPolicyId || null,
    channelAdapterStatus: source.channelAdapterStatus || null,
    channelAdapterStopReason: source.channelAdapterStopReason || null,
    detail: summarizeGatewayEventForTimeline(event),
    eventType: event.eventType || null,
    evidencePolicy: {
      artifactEligible: evidencePolicy.artifactEligible === true,
      noRawCustomerPayloads: evidencePolicy.noRawCustomerPayloads === true,
      noRawSecrets: evidencePolicy.noRawSecrets === true,
      rawPayloadIncluded: false,
      routeVisibleInTimeline: evidencePolicy.routeVisibleInTimeline === true,
    },
    externalMessagingEnabled: source.externalMessagingEnabled === true,
    gatewayEventId: event.id,
    identityBindingStatus: identitySessionContext?.bindingStatus || null,
    identitySessionContext,
    identitySessionContextId: identitySessionContext?.id || event.identity?.identitySessionContextId || null,
    identitySessionContextPolicyId: identitySessionContext?.policyId || null,
    missionId: mission?.id || bindings.missionId || null,
    missionTitle: mission?.title || null,
    permissionApprovalRequired:
      permissionDecision?.approvalRequired === true || event.permissionPolicy?.approvalRequired === true,
    permissionDecision,
    permissionDecisionId: permissionDecision?.id || event.permissionPolicy?.permissionDecisionId || null,
    permissionDecisionResult: permissionDecision?.decision || event.permissionPolicy?.decision || null,
    permissionPolicyId: permissionDecision?.policyId || event.permissionPolicy?.policyId || null,
    providerFallbackAttempt: Number.isFinite(Number(providerRoute.fallbackAttempt))
      ? Number(providerRoute.fallbackAttempt)
      : null,
    providerFallbackAttemptCount: Number.isFinite(Number(providerRoute.fallbackAttemptCount))
      ? Number(providerRoute.fallbackAttemptCount)
      : null,
    providerFallbackPolicy: providerRoute.policyId || null,
    providerFallbackPrimaryProviderId: providerRoute.primaryProviderId || null,
    providerFallbackProviderIds,
    providerFallbackRequested: providerRoute.fallbackRequested === true,
    providerFallbackStopReason: providerRoute.stopReason || null,
    providerId: providerRoute.providerId || bindings.providerId || null,
    route: event.route?.name || source.route || null,
    sandboxDecision,
    sandboxDecisionId: sandboxDecision?.id || event.sandboxPolicy?.sandboxDecisionId || null,
    sandboxMode: sandboxDecision?.mode || event.sandboxPolicy?.mode || null,
    sandboxPolicyId: sandboxDecision?.policyId || event.sandboxPolicy?.policyId || null,
    schemaVersion: event.schemaVersion || null,
    sessionId: bindings.sessionId || null,
    sourceType: source.sourceType || null,
    status: event.status || 'recorded',
    surface: source.surface || event.route?.surface || null,
    workspaceId: workspace?.id || bindings.workspaceId || mission?.workspaceId || null,
    workspaceName: workspace?.name || null,
  };
}

export function summarizeGatewayEventAudit(records, filter = {}) {
  const channelAdapterStatusCounts = {};
  const channelCounts = {};
  const eventTypeCounts = {};
  const identityBindingStatusCounts = {};
  const missionCounts = {};
  const permissionDecisionPolicyCounts = {};
  const permissionDecisionResultCounts = {};
  const providerCounts = {};
  const providerFallbackPolicyCounts = {};
  const providerFallbackStopReasonCounts = {};
  const routeCounts = {};
  const sandboxModeCounts = {};
  const sandboxPolicyCounts = {};
  const sourceTypeCounts = {};
  const workspaceCounts = {};
  let artifactEligibleCount = 0;
  let externalMessagingEnabledCount = 0;
  let identitySessionContextCount = 0;
  let noRawCustomerPayloadsCount = 0;
  let noRawSecretsCount = 0;
  let permissionApprovalRequiredCount = 0;
  let permissionDecisionCount = 0;
  let providerFallbackRequestedCount = 0;
  let routeVisibleInTimelineCount = 0;
  let sandboxDecisionCount = 0;

  for (const record of records) {
    const channel = normalizeText(record.channel, 'unknown');
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;

    const channelAdapterStatus = normalizeText(record.channelAdapterStatus, 'unknown');
    channelAdapterStatusCounts[channelAdapterStatus] =
      (channelAdapterStatusCounts[channelAdapterStatus] || 0) + 1;

    const eventType = normalizeText(record.eventType, 'unknown');
    eventTypeCounts[eventType] = (eventTypeCounts[eventType] || 0) + 1;

    const identityBindingStatus = normalizeText(record.identityBindingStatus, 'unknown');
    identityBindingStatusCounts[identityBindingStatus] =
      (identityBindingStatusCounts[identityBindingStatus] || 0) + 1;

    const missionId = normalizeText(record.missionId);
    if (missionId) {
      missionCounts[missionId] = (missionCounts[missionId] || 0) + 1;
    }

    const permissionDecisionResult = normalizeText(record.permissionDecisionResult, 'unknown');
    permissionDecisionResultCounts[permissionDecisionResult] =
      (permissionDecisionResultCounts[permissionDecisionResult] || 0) + 1;

    const permissionPolicyId = normalizeText(record.permissionPolicyId, 'unknown');
    permissionDecisionPolicyCounts[permissionPolicyId] =
      (permissionDecisionPolicyCounts[permissionPolicyId] || 0) + 1;

    const providerId = normalizeText(record.providerId, 'none');
    providerCounts[providerId] = (providerCounts[providerId] || 0) + 1;

    const providerFallbackPolicy = normalizeText(record.providerFallbackPolicy);
    if (providerFallbackPolicy) {
      providerFallbackPolicyCounts[providerFallbackPolicy] =
        (providerFallbackPolicyCounts[providerFallbackPolicy] || 0) + 1;
    }

    const providerFallbackStopReason = normalizeText(record.providerFallbackStopReason);
    if (providerFallbackStopReason) {
      providerFallbackStopReasonCounts[providerFallbackStopReason] =
        (providerFallbackStopReasonCounts[providerFallbackStopReason] || 0) + 1;
    }

    const route = normalizeText(record.route, 'unknown');
    routeCounts[route] = (routeCounts[route] || 0) + 1;

    const sandboxMode = normalizeText(record.sandboxMode, 'unknown');
    sandboxModeCounts[sandboxMode] = (sandboxModeCounts[sandboxMode] || 0) + 1;

    const sandboxPolicyId = normalizeText(record.sandboxPolicyId, 'unknown');
    sandboxPolicyCounts[sandboxPolicyId] = (sandboxPolicyCounts[sandboxPolicyId] || 0) + 1;

    const sourceType = normalizeText(record.sourceType, 'unknown');
    sourceTypeCounts[sourceType] = (sourceTypeCounts[sourceType] || 0) + 1;

    const workspaceId = normalizeText(record.workspaceId);
    if (workspaceId) {
      workspaceCounts[workspaceId] = (workspaceCounts[workspaceId] || 0) + 1;
    }

    if (record.evidencePolicy?.artifactEligible === true) {
      artifactEligibleCount += 1;
    }
    if (record.externalMessagingEnabled === true) {
      externalMessagingEnabledCount += 1;
    }
    if (record.identitySessionContextId) {
      identitySessionContextCount += 1;
    }
    if (record.evidencePolicy?.noRawCustomerPayloads === true) {
      noRawCustomerPayloadsCount += 1;
    }
    if (record.evidencePolicy?.noRawSecrets === true) {
      noRawSecretsCount += 1;
    }
    if (record.permissionApprovalRequired === true) {
      permissionApprovalRequiredCount += 1;
    }
    if (record.permissionDecisionId) {
      permissionDecisionCount += 1;
    }
    if (record.providerFallbackRequested === true) {
      providerFallbackRequestedCount += 1;
    }
    if (record.evidencePolicy?.routeVisibleInTimeline === true) {
      routeVisibleInTimelineCount += 1;
    }
    if (record.sandboxDecisionId) {
      sandboxDecisionCount += 1;
    }
  }

  return {
    channelAdapterStatusCounts,
    channelCounts,
    eventTypeCounts,
    evidencePolicy: {
      artifactEligibleCount,
      noRawCustomerPayloadsCount,
      noRawSecretsCount,
      rawPayloadIncluded: false,
      routeVisibleInTimelineCount,
    },
    externalMessagingEnabledCount,
    filter,
    identityBindingStatusCounts,
    identitySessionContextCount,
    latestRecord: getLatestItem(records, 'at'),
    missionCounts,
    permissionApprovalRequiredCount,
    permissionDecisionCount,
    permissionDecisionPolicyCounts,
    permissionDecisionResultCounts,
    productionReadyClaim: false,
    providerCounts,
    providerFallbackPolicyCounts,
    providerFallbackRequestedCount,
    providerFallbackStopReasonCounts,
    recordCount: records.length,
    routeCounts,
    sandboxDecisionCount,
    sandboxModeCounts,
    sandboxPolicyCounts,
    sourceTypeCounts,
    stopReason: records.length ? '' : 'no-gateway-events',
    workspaceCounts,
  };
}

export function buildSandboxDecisionTimelineEvent({ event, mission = null, workspace = null }) {
  const sandboxDecision = event?.sandboxDecision || null;
  if (!sandboxDecision) {
    return null;
  }

  const deniedCapabilities = ensureArray(
    sandboxDecision.capabilities?.deniedCapabilities || event.sandboxPolicy?.deniedCapabilities,
  )
    .map((item) => normalizeText(item))
    .filter(Boolean);
  const sandboxMode = normalizeText(sandboxDecision.mode || event.sandboxPolicy?.mode, 'local-runtime');
  const sandboxPolicyId = normalizeText(
    sandboxDecision.policyId || event.sandboxPolicy?.policyId,
    'local-runtime-sandbox-policy/v1',
  );

  return {
    at: event.at,
    detail: summarizeSandboxDecisionForTimeline(sandboxDecision),
    gatewayEventId: event.id,
    gatewayEventType: event.eventType,
    kind: 'sandbox-decision-recorded',
    missionId: mission?.id || event.bindings?.missionId || null,
    missionTitle: mission?.title || null,
    providerId: event.providerRoute?.providerId || event.bindings?.providerId || null,
    route: event.route?.name || sandboxDecision.action?.route || null,
    sandboxDecision,
    sandboxDecisionId: sandboxDecision.id || event.sandboxPolicy?.sandboxDecisionId || null,
    sandboxDeniedCapabilities: deniedCapabilities,
    sandboxMode,
    sandboxPolicyId,
    sandboxReason: normalizeText(sandboxDecision.reason || event.sandboxPolicy?.reason) || null,
    sessionId: event.bindings?.sessionId || null,
    sourceType: event.source?.sourceType || null,
    status: sandboxDecision.status || event.status || 'recorded',
    workspaceId: workspace?.id || event.bindings?.workspaceId || mission?.workspaceId || null,
    workspaceName: workspace?.name || null,
  };
}
