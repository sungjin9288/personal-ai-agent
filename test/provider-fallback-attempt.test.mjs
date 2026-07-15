import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProviderFallbackAttemptOptions,
  buildProviderFallbackAttemptRecord,
} from '../src/core/provider-fallback-attempt.mjs';

const fallbackPlan = {
  fallbackProviderIds: ['stub'],
  policyId: 'recoverable-provider-failure-only',
  primaryProviderId: 'openai',
  providerIds: ['openai', 'stub'],
};

test('buildProviderFallbackAttemptOptions preserves caller context and adds fallback lineage', () => {
  const options = buildProviderFallbackAttemptOptions({
    fallbackPlan,
    index: 0,
    options: {
      fallbackProvider: 'stub',
      sourceContext: {
        command: 'mission run mission-1',
        route: 'mission.run',
        sourceType: 'cli',
      },
    },
    providerId: 'openai',
  });

  assert.equal(options.fallbackProvider, 'stub');
  assert.equal(options.provider, 'openai');
  assert.equal(options.providerSpecified, true);
  assert.deepEqual(options.sourceContext, {
    command: 'mission run mission-1',
    providerFallbackAttempt: 1,
    providerFallbackAttemptCount: 2,
    providerFallbackFallbacks: ['stub'],
    providerFallbackPolicy: 'recoverable-provider-failure-only',
    providerFallbackPrimary: 'openai',
    providerFallbackRequested: true,
    route: 'mission.run',
    sourceType: 'cli',
  });
});

test('buildProviderFallbackAttemptRecord selects the next provider and keeps gateway bindings', () => {
  const result = buildProviderFallbackAttemptRecord({
    fallbackMission: { id: 'mission-1', workspaceId: 'workspace-1' },
    fallbackPlan,
    fallbackWorkspace: { id: 'workspace-1' },
    index: 0,
    providerFailure: {
      failureKind: 'transport',
      recoverable: true,
      role: 'manager',
      runId: 'run-1',
    },
    providerId: 'openai',
    result: {
      mission: { id: 'mission-1', status: 'failed', workspaceId: 'workspace-1' },
      provider: 'openai',
      session: {
        id: 'session-1',
        provider: 'openai',
        sourceContext: {
          command: 'mission run mission-1',
          gatewayEventId: 'gateway-1',
          gatewayEventRoute: 'mission.run',
          gatewayPermissionDecisionId: 'permission-1',
          gatewaySandboxDecisionId: 'sandbox-1',
          sourceType: 'cli',
        },
        startedAt: '2026-07-15T00:00:00.000Z',
        status: 'failed',
      },
    },
  });

  assert.equal(result.fallbackEligible, true);
  assert.equal(result.fallbackAttempt, 1);
  assert.equal(result.fallbackStopReason, 'eligible-provider-failure');
  assert.equal(result.nextProviderId, 'stub');
  assert.equal(result.gatewayEventId, 'gateway-1');
  assert.equal(result.providerRouteDecision.decision, 'fallback-eligible');
  assert.deepEqual(result.providerRouteDecision.bindings, {
    gatewayEventId: 'gateway-1',
    missionId: 'mission-1',
    permissionDecisionId: 'permission-1',
    sandboxDecisionId: 'sandbox-1',
    sessionId: 'session-1',
    workspaceId: 'workspace-1',
  });
});

test('buildProviderFallbackAttemptRecord records fallback success as a stop condition', () => {
  const record = buildProviderFallbackAttemptRecord({
    fallbackMission: { id: 'mission-1', workspaceId: 'workspace-1' },
    fallbackPlan,
    fallbackWorkspace: { id: 'workspace-1' },
    index: 1,
    providerFailure: null,
    providerId: 'stub',
    result: {
      mission: { id: 'mission-1', status: 'completed', workspaceId: 'workspace-1' },
      provider: 'stub',
      session: { id: 'session-2', provider: 'stub', sourceContext: {}, status: 'completed' },
    },
  });

  assert.equal(record.fallbackEligible, false);
  assert.equal(record.fallbackStopReason, 'mission-status-completed');
  assert.equal(record.nextProviderId, null);
  assert.equal(record.providerRouteDecision.decision, 'fallback-used');
  assert.equal(record.status, 'completed');
});

test('buildProviderFallbackAttemptRecord makes final provider exhaustion explicit', () => {
  const record = buildProviderFallbackAttemptRecord({
    fallbackMission: { id: 'mission-1', workspaceId: 'workspace-1' },
    fallbackPlan,
    fallbackWorkspace: { id: 'workspace-1' },
    index: 1,
    providerFailure: { failureKind: 'transport', recoverable: true },
    providerId: 'stub',
    result: {
      mission: { id: 'mission-1', status: 'failed', workspaceId: 'workspace-1' },
      provider: 'stub',
      session: { id: 'session-2', provider: 'stub', sourceContext: {}, status: 'failed' },
    },
  });

  assert.equal(record.fallbackEligible, false);
  assert.equal(record.fallbackStopReason, 'fallback-provider-exhausted');
  assert.equal(record.nextProviderId, null);
});
