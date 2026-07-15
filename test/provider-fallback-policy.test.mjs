import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMissionProviderFallbackPlan,
  buildProviderFallbackSummary,
  evaluateProviderFallbackPolicy,
  normalizeProviderFallbackIds,
  normalizeProviderFallbackPolicy,
} from '../src/core/provider-fallback-policy.mjs';

test('fallback input normalization keeps supported policies and ordered provider ids', () => {
  assert.deepEqual(normalizeProviderFallbackIds(' anthropic, stub ,,local '), ['anthropic', 'stub', 'local']);
  assert.deepEqual(normalizeProviderFallbackIds(['openai', '', ' stub ']), ['openai', 'stub']);
  assert.equal(normalizeProviderFallbackPolicy(), 'provider-failure-only');
  assert.equal(
    normalizeProviderFallbackPolicy('recoverable-provider-failure-only'),
    'recoverable-provider-failure-only',
  );
  assert.throws(
    () => normalizeProviderFallbackPolicy('always'),
    /Unsupported provider fallback policy: always/,
  );
});

test('buildMissionProviderFallbackPlan preserves the validated provider order', () => {
  assert.deepEqual(
    buildMissionProviderFallbackPlan({
      explicitPolicyId: 'recoverable-provider-failure-only',
      providerIds: ['openai', 'stub', 'local'],
    }),
    {
      enabled: true,
      fallbackProviderIds: ['stub', 'local'],
      policyId: 'recoverable-provider-failure-only',
      primaryProviderId: 'openai',
      providerIds: ['openai', 'stub', 'local'],
    },
  );

  assert.throws(
    () =>
      buildMissionProviderFallbackPlan({
        explicitPolicyId: 'provider-failure-only',
        providerIds: ['stub'],
      }),
    /--fallback-policy requires --fallback-provider/,
  );
});

test('evaluateProviderFallbackPolicy reports each deterministic stop condition', () => {
  const cases = [
    {
      input: { missionStatus: 'completed', policyId: 'provider-failure-only', providerFailure: {} },
      expected: { eligible: false, reason: 'mission-status-completed' },
    },
    {
      input: { missionStatus: 'failed', policyId: 'provider-failure-only', providerFailure: null },
      expected: { eligible: false, reason: 'no-provider-failure-metadata' },
    },
    {
      input: {
        isLastAttempt: true,
        missionStatus: 'failed',
        policyId: 'provider-failure-only',
        providerFailure: { recoverable: true },
      },
      expected: { eligible: false, reason: 'fallback-provider-exhausted' },
    },
    {
      input: {
        missionStatus: 'failed',
        policyId: 'recoverable-provider-failure-only',
        providerFailure: { recoverable: false },
      },
      expected: { eligible: false, reason: 'non-recoverable-provider-failure' },
    },
    {
      input: {
        missionStatus: 'failed',
        policyId: 'recoverable-provider-failure-only',
        providerFailure: { recoverable: true },
      },
      expected: { eligible: true, reason: 'eligible-provider-failure' },
    },
  ];

  for (const { expected, input } of cases) {
    assert.deepEqual(evaluateProviderFallbackPolicy(input), {
      ...expected,
      policyId: input.policyId,
    });
  }
});

test('buildProviderFallbackSummary aggregates stop reasons and route decisions', () => {
  const attempts = [
    {
      fallbackStopReason: 'eligible-provider-failure',
      providerId: 'openai',
      providerRouteDecision: {
        action: { route: 'mission.run' },
        at: '2026-07-15T00:00:00.000Z',
        id: 'route-1',
        policyId: 'recoverable-provider-failure-only',
      },
    },
    {
      fallbackStopReason: 'mission-status-completed',
      providerId: 'stub',
      providerRouteDecision: {
        action: { route: 'action.remediate-provider-attention' },
        at: '2026-07-15T00:01:00.000Z',
        id: 'route-2',
        policyId: 'recoverable-provider-failure-only',
      },
    },
  ];

  const summary = buildProviderFallbackSummary({
    attempts,
    fallbackProviderIds: ['stub'],
    policyId: 'recoverable-provider-failure-only',
    primaryProviderId: 'openai',
    result: { mission: { status: 'completed' }, provider: 'stub' },
  });

  assert.deepEqual(summary.attemptedProviderIds, ['openai', 'stub']);
  assert.equal(summary.fallbackUsed, true);
  assert.equal(summary.finalStatus, 'completed');
  assert.equal(summary.latestProviderRouteDecision.id, 'route-2');
  assert.deepEqual(summary.fallbackStopReasonCounts, {
    'eligible-provider-failure': 1,
    'mission-status-completed': 1,
  });
  assert.deepEqual(summary.providerRouteDecisionRouteCounts, {
    'action.remediate-provider-attention': 1,
    'mission.run': 1,
  });
  assert.deepEqual(summary.providerRouteDecisionPolicyCounts, {
    'recoverable-provider-failure-only': 2,
  });
});
