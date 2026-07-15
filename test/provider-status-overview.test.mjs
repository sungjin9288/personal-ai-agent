import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProviderOverviewResult,
  buildProviderStatusEntry,
  enrichProviderStatusEntries,
  summarizeProviderOverview,
  summarizeProviderStatusEntries,
} from '../src/core/provider-status-overview.mjs';

test('buildProviderStatusEntry preserves attention status precedence and evidence', () => {
  const provider = { displayName: 'OpenAI', id: 'openai' };
  const recovery = { recoveredAt: '2026-07-15T00:00:00.000Z' };

  assert.equal(
    buildProviderStatusEntry({
      latestAttentionRecovery: recovery,
      latestAttentionStateEvent: { eventKind: 'provider-attention-resolved' },
      provider,
    }).attentionStatus,
    'resolved',
  );
  assert.equal(buildProviderStatusEntry({ latestAttentionRecovery: recovery, provider }).attentionStatus, 'recovered');
  assert.equal(
    buildProviderStatusEntry({
      latestAttentionStateEvent: { eventKind: 'provider-attention-acknowledged' },
      provider,
    }).attentionStatus,
    'acknowledged',
  );
  assert.equal(
    buildProviderStatusEntry({
      latestAttentionStateEvent: { eventKind: 'provider-execution-failed' },
      provider,
    }).attentionStatus,
    'pending',
  );
  assert.equal(
    buildProviderStatusEntry({
      latestAttentionStateEvent: { eventKind: 'provider-probe-succeeded' },
      latestProbe: { id: 'probe-1' },
      provider,
    }).attentionStatus,
    'clear',
  );
});

test('summarizeProviderStatusEntries keeps capability, readiness, and default provider counts', () => {
  const summary = summarizeProviderStatusEntries(
    [
      {
        capabilities: { costTelemetry: true, structuredJson: true, usageMetrics: true },
        configured: true,
        id: 'stub',
        implemented: true,
        rateLimit: { maxRequests: 0 },
      },
      {
        capabilities: { costTelemetry: false, structuredJson: true, usageMetrics: false },
        configured: false,
        id: 'openai',
        implemented: true,
        rateLimit: { maxRequests: 10 },
      },
    ],
    { defaultProviderId: 'stub' },
  );

  assert.deepEqual(summary, {
    capabilityCostTelemetryCount: 1,
    capabilityStructuredJsonCount: 2,
    capabilityUsageMetricsCount: 1,
    configuredCount: 1,
    defaultProviderId: 'stub',
    implementedCount: 2,
    rateLimitedProviderCount: 1,
    total: 2,
  });
});

test('enrichProviderStatusEntries applies pending and recovered attention records', () => {
  const recoveredAttention = { providerId: 'local', recoveredAt: '2026-07-15T00:05:00.000Z' };
  const providers = enrichProviderStatusEntries(
    [
      { attentionStatus: 'clear', id: 'openai' },
      { attentionStatus: 'clear', id: 'local', latestAttentionRecovery: null },
    ],
    {
      pendingAttentionItems: [
        {
          dueAt: '2026-07-15T01:00:00.000Z',
          isOverdue: true,
          latestReminderAt: '2026-07-15T00:30:00.000Z',
          needsReminder: true,
          nextReminderAt: '2026-07-15T00:45:00.000Z',
          providerId: 'openai',
          reminderCadenceHours: 1,
          reminderCount: 2,
          slaHours: 12,
        },
      ],
      recoveredAttentionItems: [recoveredAttention],
    },
  );

  assert.equal(providers[0].attentionStatus, 'pending');
  assert.equal(providers[0].pendingAttentionIsOverdue, true);
  assert.equal(providers[0].pendingAttentionReminderCount, 2);
  assert.equal(providers[1].attentionStatus, 'recovered');
  assert.equal(providers[1].latestAttentionRecovery, recoveredAttention);
  assert.equal(providers[1].latestRecoveredAttention, recoveredAttention);
});

test('summarizeProviderOverview composes provider, probe, execution, attention, and fallback evidence', () => {
  const probes = [
    { attempted: false, checkedAt: '2026-07-15T00:00:00.000Z', id: 'probe-1', ok: false, providerId: 'stub' },
    { attemptCount: 1, attempted: true, checkedAt: '2026-07-15T00:01:00.000Z', failureKind: 'config', id: 'probe-2', ok: false, providerId: 'openai' },
    { attemptCount: 1, attempted: true, checkedAt: '2026-07-15T00:02:00.000Z', id: 'probe-3', ok: true, providerId: 'local' },
  ];
  const providers = [
    { attentionStatus: 'clear', configured: true, id: 'stub', implemented: true, latestProbe: probes[0] },
    { attentionStatus: 'pending', configured: false, id: 'openai', implemented: true, latestProbe: probes[1] },
    { attentionStatus: 'recovered', configured: true, id: 'local', implemented: true, latestProbe: probes[2] },
    { attentionStatus: 'acknowledged', configured: true, id: 'anthropic', implemented: true, latestProbe: null },
  ];
  const pendingAttentionItems = [
    {
      createdAt: '2026-07-15T00:01:00.000Z',
      eventFamily: 'probe',
      eventKind: 'provider-probe-failed',
      providerId: 'openai',
    },
  ];
  const summary = summarizeProviderOverview({
    acknowledgedAttentionRecords: [
      { acknowledgedAt: '2026-07-15T00:03:00.000Z', providerId: 'anthropic', status: 'acknowledged' },
    ],
    attentionReminderRecords: [{ providerId: 'openai', remindedAt: '2026-07-15T00:04:00.000Z' }],
    defaultProviderId: 'stub',
    events: [
      {
        eventFamily: 'fallback',
        eventKind: 'provider-fallback-attempted',
        fallbackPolicy: 'provider-failure-only',
        fallbackStopReason: 'eligible-provider-failure',
        providerId: 'openai',
      },
    ],
    executions: [
      {
        attemptCount: 1,
        estimatedCostUsd: 0.1,
        id: 'run-1',
        providerId: 'local',
        role: 'executor',
        status: 'completed',
        usageTotalTokens: 30,
      },
    ],
    pendingAttentionItems,
    pendingAttentionSummary: {
      attemptHistoryEntryCountTotal: 1,
      maxAttemptCount: 1,
      multiAttemptCount: 0,
      needsReminderCount: 1,
      nextDueAt: '2026-07-15T01:00:00.000Z',
      nextReminderAt: '2026-07-15T00:30:00.000Z',
      overdueCount: 1,
      overdueProviderIds: ['openai'],
      reminderCountTotal: 1,
      retryCountTotal: 0,
      totalAttemptCount: 1,
    },
    probes,
    providers,
    recoveredAttentionItems: [{ providerId: 'local', recoveredAt: '2026-07-15T00:02:00.000Z' }],
  });

  assert.equal(summary.total, 4);
  assert.equal(summary.defaultProviderId, 'stub');
  assert.deepEqual(summary.configuredProviderIds, ['stub', 'local', 'anthropic']);
  assert.deepEqual(summary.readyProviderIds, ['stub', 'local', 'anthropic']);
  assert.deepEqual(summary.latestProbeFailureProviderIds, ['openai']);
  assert.deepEqual(summary.latestProbeSkippedProviderIds, ['stub']);
  assert.deepEqual(summary.latestProbeSuccessProviderIds, ['local']);
  assert.deepEqual(summary.unprobedProviderIds, ['anthropic']);
  assert.equal(summary.attentionRequiredCount, 1);
  assert.equal(summary.attentionOverdueCount, 1);
  assert.equal(summary.executionTotal, 1);
  assert.equal(summary.executionEstimatedCostUsdTotal, 0.1);
  assert.equal(summary.usageTotalTokensTotal, 30);
  assert.equal(summary.eventFamilyCounts.fallback, 1);
  assert.equal(summary.fallbackStopReasonCounts['eligible-provider-failure'], 1);
});

test('buildProviderOverviewResult keeps recent-window and health-drift fields aligned', () => {
  const result = buildProviderOverviewResult({
    healthDrift: {
      attentionNeedsReminderCount: 1,
      attentionOverdueCount: 1,
      attentionRequiredCount: 2,
      reasonCodes: ['attention-overdue'],
      recentExecutionCountDelta: 3,
      recentExecutionCurrentMonthStartDate: '2026-07-01',
      recentExecutionEstimatedCostUsdTotalDelta: 0.2,
      recentExecutionFailedCountDelta: 1,
      recentExecutionMonthlyBucketCount: 2,
      recentExecutionOldestMonthStartDate: '2026-06-01',
      recentExecutionPreviousMonthStartDate: '2026-06-01',
      status: 'attention-required',
    },
    overviewSummary: { total: 2 },
    providers: [{ id: 'stub' }, { id: 'openai' }],
    recentWindow: {
      eventFamilyCounts: { attention: 1, execution: 1, fallback: 0, probe: 1 },
      eventTotal: 3,
      executionEstimatedCostUsdTotal: 0.2,
      executionLatestMonthlyBucketDelta: { executionCountDelta: 3 },
      executionLatestMonthlyBucketStartDate: '2026-07-01',
      executionMonthlyBucketCount: 2,
      executionOldestMonthlyBucketStartDate: '2026-06-01',
      executionTotal: 1,
      latestEvent: { id: 'event-1' },
      latestExecution: { id: 'run-1' },
      latestFallbackEvent: null,
      latestProbe: { id: 'probe-1' },
      probeTotal: 1,
      touchedProviderCount: 2,
      touchedProviderIds: ['openai', 'stub'],
    },
    since: '2026-07-01T00:00:00.000Z',
  });

  assert.equal(result.filters.since, '2026-07-01T00:00:00.000Z');
  assert.equal(result.summary.providerHealthDriftStatus, 'attention-required');
  assert.equal(result.summary.providerRecentEventCount, 3);
  assert.equal(result.summary.providerRecentExecutionCount, 1);
  assert.deepEqual(result.summary.providerRecentTouchedProviderIds, ['openai', 'stub']);
  assert.equal(result.summary.latestRecentProviderProbe.id, 'probe-1');
});
