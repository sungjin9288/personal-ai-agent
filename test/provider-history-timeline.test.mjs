import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProviderEventTimelineResult,
  buildProviderExecutionHistoryResult,
  buildProviderExecutionTimelineResult,
  buildProviderProbeHistoryResult,
  buildProviderProbeTimelineResult,
} from '../src/core/provider-history-timeline.mjs';

test('buildProviderProbeHistoryResult keeps probes and their aggregate summary together', () => {
  const probes = [
    { attempted: false, failureKind: 'config', id: 'probe-1', ok: false, providerId: 'openai' },
    { attemptCount: 1, attempted: true, id: 'probe-2', ok: true, providerId: 'local' },
  ];

  const result = buildProviderProbeHistoryResult(probes);

  assert.equal(result.probes, probes);
  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.attemptedCount, 1);
  assert.equal(result.summary.successCount, 1);
  assert.equal(result.summary.failureKindCounts.config, 1);
});

test('buildProviderProbeTimelineResult converts probes before summarizing the timeline', () => {
  const result = buildProviderProbeTimelineResult([
    {
      attempted: true,
      checkedAt: '2026-07-15T00:00:00.000Z',
      id: 'probe-1',
      ok: false,
      providerId: 'anthropic',
      reason: 'upstream unavailable',
    },
  ]);

  assert.equal(result.timeline.length, 1);
  assert.equal(result.timeline[0].kind, 'provider-probe-failed');
  assert.match(result.timeline[0].detail, /upstream unavailable/);
  assert.equal(result.summary.failureCount, 1);
});

test('buildProviderExecutionHistoryResult preserves filters and daily bucket evidence', () => {
  const executions = [
    {
      at: '2026-07-15T01:00:00.000Z',
      estimatedCostUsd: 0.2,
      id: 'run-1',
      providerId: 'local',
      role: 'executor',
      status: 'completed',
      usageTotalTokens: 20,
    },
    {
      at: '2026-07-14T01:00:00.000Z',
      failureKind: 'timeout',
      id: 'run-2',
      providerId: 'local',
      role: 'executor',
      status: 'failed',
      timedOut: true,
    },
  ];

  const result = buildProviderExecutionHistoryResult(executions, {
    missionId: 'mission-1',
    providerId: 'local',
    role: 'executor',
    since: '2026-07-01T00:00:00.000Z',
    status: 'completed',
    workspaceId: 'workspace-1',
  });

  assert.equal(result.executions, executions);
  assert.deepEqual(result.filters, {
    missionId: 'mission-1',
    providerId: 'local',
    role: 'executor',
    since: '2026-07-01T00:00:00.000Z',
    status: 'completed',
    workspaceId: 'workspace-1',
  });
  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.bucketCount, 2);
  assert.equal(result.summary.latestBucketDate, '2026-07-15');
  assert.equal(result.summary.oldestBucketDate, '2026-07-14');
});

test('buildProviderExecutionTimelineResult returns the existing timeline payload shape', () => {
  const result = buildProviderExecutionTimelineResult(
    [
      {
        at: '2026-07-15T01:00:00.000Z',
        id: 'run-1',
        providerId: 'stub',
        role: 'reviewer',
        status: 'completed',
      },
    ],
    { providerId: 'stub', role: 'reviewer' },
  );

  assert.deepEqual(result.filters, {
    missionId: null,
    providerId: 'stub',
    role: 'reviewer',
    since: null,
    status: null,
    workspaceId: null,
  });
  assert.equal(result.timeline[0].kind, 'provider-execution-succeeded');
  assert.equal(result.summary.statusCounts.completed, 1);
});

test('buildProviderEventTimelineResult keeps normalized query filters with event summary', () => {
  const timeline = [
    {
      at: '2026-07-15T01:00:00.000Z',
      eventFamily: 'fallback',
      eventKind: 'provider-fallback-attempted',
      fallbackPolicy: 'recoverable-provider-failure-only',
      fallbackStopReason: 'eligible-provider-failure',
      providerId: 'openai',
    },
  ];

  const result = buildProviderEventTimelineResult(timeline, {
    attempted: true,
    fallbackPolicy: 'recoverable-provider-failure-only',
    family: 'fallback',
    ok: false,
    since: '2026-07-01T00:00:00.000Z',
  });

  assert.equal(result.timeline, timeline);
  assert.deepEqual(result.filters, {
    attempted: true,
    family: 'fallback',
    fallbackPolicy: 'recoverable-provider-failure-only',
    fallbackStopReason: null,
    missionId: null,
    ok: false,
    providerId: null,
    role: null,
    since: '2026-07-01T00:00:00.000Z',
    status: null,
    workspaceId: null,
  });
  assert.equal(result.summary.total, 1);
  assert.equal(result.summary.fallbackPolicyCounts['recoverable-provider-failure-only'], 1);
});
