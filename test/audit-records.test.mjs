import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGatewayEventAuditRecord,
  buildIdentitySessionAuditRecord,
  buildIdentitySessionContextTimelineEvent,
  buildSandboxDecisionTimelineEvent,
  summarizeGatewayEventAudit,
  summarizeIdentitySessionAudit,
} from '../src/core/audit-records.mjs';

// Fixed, deterministic UTC timestamps used across tests.
const JAN_1 = '2024-01-01T09:00:00.000Z';
const JAN_15 = '2024-01-15T09:00:00.000Z';

const MISSION = { id: 'mission-1', title: 'Mission One', workspaceId: 'workspace-1' };
const WORKSPACE = { id: 'workspace-1', name: 'Workspace One' };

function buildIdentitySessionContext(overrides = {}) {
  return {
    actor: { actorType: 'human', trustBoundary: 'internal' },
    at: JAN_1,
    bindingStatus: 'bound',
    bindings: { missionId: 'mission-1', providerId: 'provider-1', sessionId: 'session-1', workspaceId: 'workspace-1' },
    evidencePolicy: { noRawCustomerPayloads: true, noRawSecrets: true, routeVisibleInTimeline: true },
    id: 'identity-session-context-1',
    policyId: 'identity-session-policy/v1',
    route: { name: 'route-a' },
    schemaVersion: 1,
    scope: {
      crossScopePromotionAllowed: false,
      memoryLookupAfterBinding: true,
      memoryScope: 'workspace',
      sessionSeparationRequired: true,
    },
    source: {
      channel: 'web',
      channelAdapterId: 'adapter-1',
      channelAdapterPolicyId: 'adapter-policy-1',
      channelAdapterStatus: 'active',
      externalMessagingEnabled: false,
      sourceType: 'chat',
      surface: 'app',
    },
    status: 'recorded',
    subject: { missionBound: true, sessionBound: true, sessionRequired: true, workspaceBound: true },
    ...overrides,
  };
}

function buildGatewayEvent(overrides = {}) {
  return {
    at: JAN_1,
    bindings: { missionId: 'mission-1', providerId: 'provider-1', sessionId: 'session-1', workspaceId: 'workspace-1' },
    eventType: 'agent-turn',
    evidencePolicy: { artifactEligible: true, noRawCustomerPayloads: true, noRawSecrets: true, routeVisibleInTimeline: true },
    id: 'gateway-event-1',
    identity: { actorType: 'human', identitySessionContextId: 'identity-session-context-1', trustBoundary: 'internal' },
    permissionDecision: { approvalRequired: true, decision: 'approved', id: 'permission-decision-1', policyId: 'permission-policy-1' },
    providerRoute: {
      fallbackAttempt: 0,
      fallbackAttemptCount: 1,
      fallbackProviderIds: ['provider-2', ''],
      fallbackRequested: false,
      policyId: 'provider-fallback-policy-1',
      primaryProviderId: 'provider-1',
      providerId: 'provider-1',
      stopReason: '',
    },
    route: { name: 'route-a', surface: 'app' },
    sandboxDecision: {
      capabilities: { deniedCapabilities: ['network'] },
      id: 'sandbox-decision-1',
      mode: 'local-runtime',
      policyId: 'local-runtime-sandbox-policy/v1',
      reason: 'default policy',
      status: 'recorded',
    },
    schemaVersion: 1,
    source: { channel: 'web', channelAdapterId: 'adapter-1', channelAdapterStatus: 'active', externalMessagingEnabled: false, sourceType: 'chat', surface: 'app' },
    status: 'recorded',
    ...overrides,
  };
}

test('buildIdentitySessionContextTimelineEvent', async (t) => {
  await t.test('returns null when event has no identitySessionContext', () => {
    assert.equal(buildIdentitySessionContextTimelineEvent({ event: { at: JAN_1 } }), null);
  });

  await t.test('builds a timeline event with mission and workspace present', () => {
    const event = buildGatewayEvent({ identitySessionContext: buildIdentitySessionContext() });
    const result = buildIdentitySessionContextTimelineEvent({ event, mission: MISSION, workspace: WORKSPACE });

    assert.equal(result.kind, 'identity-session-context-recorded');
    assert.equal(result.missionId, 'mission-1');
    assert.equal(result.missionTitle, 'Mission One');
    assert.equal(result.workspaceId, 'workspace-1');
    assert.equal(result.workspaceName, 'Workspace One');
    assert.equal(result.identitySessionContextId, 'identity-session-context-1');
    assert.equal(result.missionBound, true);
    assert.equal(result.sessionBound, true);
  });

  await t.test('falls back to event bindings when mission and workspace are null', () => {
    const event = buildGatewayEvent({ identitySessionContext: buildIdentitySessionContext() });
    const result = buildIdentitySessionContextTimelineEvent({ event });

    assert.equal(result.missionId, 'mission-1');
    assert.equal(result.workspaceId, 'workspace-1');
    assert.equal(result.missionTitle, null);
    assert.equal(result.workspaceName, null);
  });
});

test('buildIdentitySessionAuditRecord', async (t) => {
  await t.test('returns null when event has no identitySessionContext', () => {
    assert.equal(buildIdentitySessionAuditRecord({ event: { at: JAN_1 } }), null);
  });

  await t.test('builds an audit record with mission and workspace present', () => {
    const event = buildGatewayEvent({ identitySessionContext: buildIdentitySessionContext() });
    const result = buildIdentitySessionAuditRecord({ event, mission: MISSION, workspace: WORKSPACE });

    assert.equal(result.bindingStatus, 'bound');
    assert.equal(result.missionId, 'mission-1');
    assert.equal(result.workspaceId, 'workspace-1');
    assert.equal(result.evidencePolicy.noRawCustomerPayloads, true);
    assert.equal(result.evidencePolicy.rawPayloadIncluded, false);
    assert.equal(result.sessionSeparationRequired, true);
  });

  await t.test('builds an audit record with mission and workspace null, using event bindings', () => {
    const event = buildGatewayEvent({ identitySessionContext: buildIdentitySessionContext() });
    const result = buildIdentitySessionAuditRecord({ event, mission: null, workspace: null });

    assert.equal(result.missionId, 'mission-1');
    assert.equal(result.workspaceId, 'workspace-1');
    assert.equal(result.missionTitle, null);
    assert.equal(result.workspaceName, null);
  });
});

test('summarizeIdentitySessionAudit', async (t) => {
  await t.test('handles an empty records array', () => {
    const result = summarizeIdentitySessionAudit([], { channel: 'web' });

    assert.equal(result.recordCount, 0);
    assert.equal(result.latestRecord, null);
    assert.equal(result.stopReason, 'no-identity-session-context-records');
    assert.deepEqual(result.filter, { channel: 'web' });
    assert.deepEqual(result.bindingStatusCounts, {});
  });

  await t.test('summarizes a single record', () => {
    const event = buildGatewayEvent({ identitySessionContext: buildIdentitySessionContext() });
    const record = buildIdentitySessionAuditRecord({ event, mission: MISSION, workspace: WORKSPACE });
    const result = summarizeIdentitySessionAudit([record]);

    assert.equal(result.recordCount, 1);
    assert.equal(result.stopReason, '');
    assert.equal(result.latestRecord, record);
    assert.equal(result.bindingStatusCounts.bound, 1);
    assert.equal(result.missionBoundCount, 1);
    assert.equal(result.sessionBoundCount, 1);
    assert.equal(result.missionCounts['mission-1'], 1);
    assert.equal(result.workspaceCounts['workspace-1'], 1);
  });

  await t.test('aggregates counts and picks latest record across multiple records', () => {
    const earlierEvent = buildGatewayEvent({
      at: JAN_1,
      identitySessionContext: buildIdentitySessionContext({ at: JAN_1, bindingStatus: 'partial' }),
    });
    const laterEvent = buildGatewayEvent({
      at: JAN_15,
      identitySessionContext: buildIdentitySessionContext({ at: JAN_15, bindingStatus: 'bound' }),
    });
    const earlierRecord = buildIdentitySessionAuditRecord({ event: earlierEvent, mission: MISSION, workspace: WORKSPACE });
    const laterRecord = buildIdentitySessionAuditRecord({ event: laterEvent, mission: MISSION, workspace: WORKSPACE });

    const result = summarizeIdentitySessionAudit([earlierRecord, laterRecord]);

    assert.equal(result.recordCount, 2);
    assert.equal(result.bindingStatusCounts.partial, 1);
    assert.equal(result.bindingStatusCounts.bound, 1);
    assert.equal(result.latestRecord, laterRecord);
    assert.equal(result.missionCounts['mission-1'], 2);
  });

  await t.test('applies filter passthrough without altering aggregation', () => {
    const event = buildGatewayEvent({ identitySessionContext: buildIdentitySessionContext() });
    const record = buildIdentitySessionAuditRecord({ event, mission: MISSION, workspace: WORKSPACE });
    const filter = { missionId: 'mission-1', workspaceId: 'workspace-1' };
    const result = summarizeIdentitySessionAudit([record], filter);

    assert.deepEqual(result.filter, filter);
    assert.equal(result.recordCount, 1);
  });
});

test('buildGatewayEventAuditRecord', async (t) => {
  await t.test('returns null when event is missing', () => {
    assert.equal(buildGatewayEventAuditRecord({ event: null }), null);
  });

  await t.test('builds an audit record with mission and workspace present', () => {
    const event = buildGatewayEvent();
    const result = buildGatewayEventAuditRecord({ event, mission: MISSION, workspace: WORKSPACE });

    assert.equal(result.missionId, 'mission-1');
    assert.equal(result.workspaceId, 'workspace-1');
    assert.equal(result.eventType, 'agent-turn');
    assert.equal(result.sandboxDecisionId, 'sandbox-decision-1');
    assert.deepEqual(result.providerFallbackProviderIds, ['provider-2']);
    assert.equal(result.evidencePolicy.artifactEligible, true);
  });

  await t.test('builds an audit record with mission and workspace null, using event bindings', () => {
    const event = buildGatewayEvent();
    const result = buildGatewayEventAuditRecord({ event, mission: null, workspace: null });

    assert.equal(result.missionId, 'mission-1');
    assert.equal(result.workspaceId, 'workspace-1');
    assert.equal(result.missionTitle, null);
    assert.equal(result.workspaceName, null);
  });
});

test('summarizeGatewayEventAudit', async (t) => {
  await t.test('handles an empty records array', () => {
    const result = summarizeGatewayEventAudit([], { eventType: 'agent-turn' });

    assert.equal(result.recordCount, 0);
    assert.equal(result.latestRecord, null);
    assert.equal(result.stopReason, 'no-gateway-events');
    assert.deepEqual(result.filter, { eventType: 'agent-turn' });
  });

  await t.test('summarizes a single record', () => {
    const event = buildGatewayEvent();
    const record = buildGatewayEventAuditRecord({ event, mission: MISSION, workspace: WORKSPACE });
    const result = summarizeGatewayEventAudit([record]);

    assert.equal(result.recordCount, 1);
    assert.equal(result.stopReason, '');
    assert.equal(result.latestRecord, record);
    assert.equal(result.eventTypeCounts['agent-turn'], 1);
    assert.equal(result.sandboxDecisionCount, 1);
    assert.equal(result.permissionDecisionCount, 1);
    assert.equal(result.permissionApprovalRequiredCount, 1);
  });

  await t.test('aggregates counts and applies filter application across multiple records', () => {
    const eventOne = buildGatewayEvent({ at: JAN_1, eventType: 'agent-turn' });
    const eventTwo = buildGatewayEvent({ at: JAN_15, eventType: 'tool-call', id: 'gateway-event-2' });
    const recordOne = buildGatewayEventAuditRecord({ event: eventOne, mission: MISSION, workspace: WORKSPACE });
    const recordTwo = buildGatewayEventAuditRecord({ event: eventTwo, mission: MISSION, workspace: WORKSPACE });

    const filter = { missionId: 'mission-1' };
    const result = summarizeGatewayEventAudit([recordOne, recordTwo], filter);

    assert.equal(result.recordCount, 2);
    assert.equal(result.eventTypeCounts['agent-turn'], 1);
    assert.equal(result.eventTypeCounts['tool-call'], 1);
    assert.equal(result.latestRecord, recordTwo);
    assert.deepEqual(result.filter, filter);
    assert.equal(result.missionCounts['mission-1'], 2);
  });
});

test('buildSandboxDecisionTimelineEvent', async (t) => {
  await t.test('returns null when event has no sandboxDecision', () => {
    assert.equal(buildSandboxDecisionTimelineEvent({ event: { at: JAN_1 } }), null);
  });

  await t.test('builds a timeline event with mission and workspace present', () => {
    const event = buildGatewayEvent();
    const result = buildSandboxDecisionTimelineEvent({ event, mission: MISSION, workspace: WORKSPACE });

    assert.equal(result.kind, 'sandbox-decision-recorded');
    assert.equal(result.missionId, 'mission-1');
    assert.equal(result.workspaceId, 'workspace-1');
    assert.equal(result.sandboxDecisionId, 'sandbox-decision-1');
    assert.equal(result.sandboxMode, 'local-runtime');
    assert.deepEqual(result.sandboxDeniedCapabilities, ['network']);
  });

  await t.test('builds a timeline event with mission and workspace null, using defaults', () => {
    const event = buildGatewayEvent({
      bindings: {},
      sandboxDecision: { id: 'sandbox-decision-2', status: 'recorded' },
    });
    const result = buildSandboxDecisionTimelineEvent({ event, mission: null, workspace: null });

    assert.equal(result.missionId, null);
    assert.equal(result.workspaceId, null);
    assert.equal(result.sandboxMode, 'local-runtime');
    assert.equal(result.sandboxPolicyId, 'local-runtime-sandbox-policy/v1');
    assert.deepEqual(result.sandboxDeniedCapabilities, []);
  });
});
