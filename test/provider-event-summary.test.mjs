import assert from 'node:assert/strict';
import test from 'node:test';

import { summarizeProviderEvents } from '../src/core/provider-event-summary.mjs';

test('summarizeProviderEvents returns a stable empty read model', () => {
  const summary = summarizeProviderEvents([]);

  assert.equal(summary.total, 0);
  assert.deepEqual(summary.familyCounts, { attention: 0, execution: 0, fallback: 0, probe: 0 });
  assert.equal(summary.latestEvent, null);
  assert.equal(summary.latestAttentionEvent, null);
  assert.equal(summary.latestExecutionEvent, null);
  assert.equal(summary.latestFallbackEvent, null);
  assert.equal(summary.latestProbeEvent, null);
  assert.equal(summary.executionEstimatedCostUsdTotal, null);
  assert.equal(summary.usageTotalTokensTotal, 0);
});

test('summarizeProviderEvents keeps probe, execution, attention, and fallback evidence together', () => {
  const summary = summarizeProviderEvents([
    {
      attempted: false,
      eventFamily: 'probe',
      eventKind: 'provider-probe-skipped',
      ok: false,
      providerId: 'stub',
    },
    {
      attemptCount: 2,
      attemptHistory: [{ attempt: 1, ok: false }, { attempt: 2, ok: false }],
      attempted: true,
      durationMs: 100,
      eventFamily: 'probe',
      eventKind: 'provider-probe-failed',
      failureKind: 'timeout',
      ok: false,
      providerId: 'anthropic',
      recoverable: true,
      retryCount: 1,
      timedOut: true,
    },
    {
      attemptCount: 2,
      attemptHistory: [{ attempt: 1, ok: false }, { attempt: 2, ok: true }],
      durationMs: 200,
      estimatedCostUsd: 0.3,
      eventFamily: 'execution',
      eventKind: 'provider-execution-succeeded',
      executionStatus: 'completed',
      providerId: 'openai',
      retryCount: 1,
      role: 'executor',
      usageInputTokens: 10,
      usageOutputTokens: 20,
      usageTotalTokens: 30,
    },
    {
      attemptCount: 1,
      durationMs: 50,
      estimatedCostUsd: 0.1,
      eventFamily: 'execution',
      eventKind: 'provider-execution-failed',
      executionStatus: 'failed',
      failureKind: 'config',
      providerId: 'openai',
      role: 'planner',
    },
    {
      eventFamily: 'attention',
      eventKind: 'provider-attention-opened',
      providerId: 'anthropic',
    },
    {
      eventFamily: 'attention',
      eventKind: 'provider-attention-recovered',
      providerId: 'anthropic',
    },
    {
      eventFamily: 'fallback',
      eventKind: 'provider-fallback-attempted',
      fallbackPolicy: 'recoverable-provider-failure-only',
      fallbackStopReason: 'non-recoverable-provider-failure',
      providerId: 'anthropic',
      providerRouteDecision: {
        action: { route: 'mission.run' },
        policyId: 'recoverable-provider-failure-only',
      },
    },
  ]);

  assert.deepEqual(summary.familyCounts, { attention: 2, execution: 2, fallback: 1, probe: 2 });
  assert.equal(summary.probeAttemptedCount, 1);
  assert.equal(summary.probeSkippedCount, 1);
  assert.equal(summary.probeFailureCount, 1);
  assert.equal(summary.probeRetryableFailureCount, 1);
  assert.equal(summary.probeTimedOutFailureCount, 1);
  assert.equal(summary.executionCompletedCount, 1);
  assert.equal(summary.executionFailedCount, 1);
  assert.equal(summary.executionRetrySucceededCount, 1);
  assert.equal(summary.executionEstimatedCostUsdTotal, 0.4);
  assert.equal(summary.usageTotalTokensTotal, 30);
  assert.equal(summary.attentionStatusCounts.opened, 1);
  assert.equal(summary.attentionStatusCounts.recovered, 1);
  assert.equal(summary.fallbackPolicyCounts['recoverable-provider-failure-only'], 1);
  assert.equal(summary.fallbackStopReasonCounts['non-recoverable-provider-failure'], 1);
  assert.equal(summary.providerRouteDecisionCount, 1);
  assert.equal(summary.providerRouteDecisionRouteCounts['mission.run'], 1);
  assert.equal(summary.latestFallbackEvent.eventKind, 'provider-fallback-attempted');
  assert.equal(summary.latestProviderRouteDecisionEvent.providerId, 'anthropic');
});
