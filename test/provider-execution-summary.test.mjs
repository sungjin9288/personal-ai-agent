import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProviderExecutionTimeline,
  formatProviderFailureDetail,
  getLatestMatchingRecord,
  summarizeProviderExecutionTimeline,
  summarizeProviderExecutions,
  summarizeProviderProbes,
} from '../src/core/provider-execution-summary.mjs';

test('formatProviderFailureDetail appends only available failure evidence', () => {
  assert.equal(formatProviderFailureDetail({ detail: 'request failed' }), 'request failed');
  assert.equal(
    formatProviderFailureDetail({
      attemptCount: 2,
      detail: 'request failed',
      failureKind: 'timeout',
      httpStatus: 504,
      recoverable: true,
      timedOut: true,
    }),
    'request failed [kind=timeout, http=504, timedOut=true, attempts=2, recoverable=true]',
  );
});

test('getLatestMatchingRecord returns the last matching item', () => {
  const records = [
    { id: 'run-1', status: 'failed' },
    { id: 'run-2', status: 'completed' },
    { id: 'run-3', status: 'failed' },
  ];

  assert.equal(getLatestMatchingRecord(records, (record) => record.status === 'failed')?.id, 'run-3');
  assert.equal(getLatestMatchingRecord(records, (record) => record.status === 'blocked'), null);
});

test('summarizeProviderExecutions returns a stable empty summary', () => {
  const summary = summarizeProviderExecutions([]);

  assert.equal(summary.total, 0);
  assert.equal(summary.latestExecution, null);
  assert.equal(summary.latestFailedExecution, null);
  assert.equal(summary.latestSuccessfulExecution, null);
  assert.equal(summary.averageDurationMs, null);
  assert.equal(summary.estimatedCostUsdTotal, null);
  assert.equal(summary.statusCounts.total, 0);
  assert.deepEqual(summary.providerCounts, {});
});

test('summarizeProviderExecutions keeps retry, failure, usage, and cost evidence', () => {
  const executions = [
    {
      attemptCount: 1,
      attemptHistory: [{ attempt: 1, ok: true }],
      durationMs: 100,
      estimatedCostUsd: 0.1,
      id: 'run-1',
      providerId: 'openai',
      role: 'planner',
      status: 'completed',
      usageInputTokens: 10,
      usageOutputTokens: 20,
      usageTotalTokens: 30,
    },
    {
      attemptCount: 2,
      attemptHistory: [
        { attempt: 1, failureKind: 'timeout', ok: false },
        { attempt: 2, failureKind: 'timeout', ok: false },
      ],
      durationMs: 300,
      failureKind: 'timeout',
      id: 'run-2',
      providerId: 'anthropic',
      recoverable: true,
      retryCount: 1,
      role: 'executor',
      status: 'failed',
      timedOut: true,
    },
    {
      attemptCount: 2,
      attemptHistory: [
        { attempt: 1, failureKind: 'transport', ok: false },
        { attempt: 2, ok: true },
      ],
      durationMs: 200,
      estimatedCostUsd: 0.2,
      id: 'run-3',
      providerId: 'openai',
      retryCount: 1,
      role: 'executor',
      status: 'completed',
      usageInputTokens: 30,
      usageOutputTokens: 40,
      usageTotalTokens: 70,
    },
  ];

  const summary = summarizeProviderExecutions(executions);

  assert.equal(summary.total, 3);
  assert.equal(summary.latestExecution.id, 'run-3');
  assert.equal(summary.latestFailedExecution.id, 'run-2');
  assert.equal(summary.latestSuccessfulExecution.id, 'run-3');
  assert.deepEqual(summary.providerCounts, { anthropic: 1, openai: 2 });
  assert.equal(summary.roleCounts.planner, 1);
  assert.equal(summary.roleCounts.executor, 2);
  assert.equal(summary.statusCounts.completed, 2);
  assert.equal(summary.statusCounts.failed, 1);
  assert.equal(summary.failureKindCounts.timeout, 1);
  assert.equal(summary.retryableFailureCount, 1);
  assert.equal(summary.timedOutFailureCount, 1);
  assert.equal(summary.totalAttemptCount, 5);
  assert.equal(summary.totalRetryCount, 2);
  assert.equal(summary.retrySucceededCount, 1);
  assert.equal(summary.estimatedCostUsdTotal, 0.3);
  assert.deepEqual(summary.estimatedCostUsdByProviderId, { openai: 0.3 });
  assert.equal(summary.usageTotalTokensTotal, 100);
});

test('provider execution timeline preserves run identity and failure evidence', () => {
  const timeline = buildProviderExecutionTimeline([
    {
      at: '2026-07-13T00:00:00.000Z',
      attemptCount: 2,
      attemptHistory: [
        { attempt: 1, failureKind: 'timeout', ok: false },
        { attempt: 2, failureKind: 'timeout', ok: false },
      ],
      attemptHistoryCount: 2,
      durationMs: 250,
      failureKind: 'timeout',
      httpStatus: 504,
      id: 'run-failed',
      missionId: 'mission-1',
      missionTitle: 'Inspect provider',
      outputSummary: 'provider timed out',
      providerId: 'anthropic',
      recoverable: true,
      retryCount: 1,
      role: 'executor',
      sessionId: 'session-1',
      status: 'failed',
      timedOut: true,
      usageTotalTokens: 42,
      workspaceId: 'workspace-1',
      workspaceName: 'Example',
    },
  ]);

  assert.equal(timeline[0].kind, 'provider-execution-failed');
  assert.equal(timeline[0].runId, 'run-failed');
  assert.equal(timeline[0].missionId, 'mission-1');
  assert.equal(timeline[0].attemptHistory.length, 2);
  assert.equal(timeline[0].usageTotalTokens, 42);
  assert.match(timeline[0].detail, /kind=timeout/);
  assert.match(timeline[0].detail, /recoverable=true/);

  const summary = summarizeProviderExecutionTimeline(timeline);
  assert.equal(summary.total, 1);
  assert.equal(summary.eventCounts['provider-execution-failed'], 1);
  assert.equal(summary.failureKindCounts.timeout, 1);
  assert.equal(summary.retryableFailureCount, 1);
  assert.equal(summary.timedOutFailureCount, 1);
});

test('summarizeProviderProbes keeps skipped and retried probe outcomes visible', () => {
  const probes = [
    {
      attemptCount: 0,
      attempted: false,
      durationMs: 0,
      ok: false,
      providerId: 'stub',
    },
    {
      attemptCount: 2,
      attemptHistory: [
        { attempt: 1, failureKind: 'transport', ok: false },
        { attempt: 2, ok: true },
      ],
      attempted: true,
      durationMs: 120,
      ok: true,
      providerId: 'local',
      retryCount: 1,
    },
    {
      attemptCount: 1,
      attempted: true,
      durationMs: 80,
      failureKind: 'http-status',
      ok: false,
      providerId: 'anthropic',
      recoverable: false,
    },
  ];

  const summary = summarizeProviderProbes(probes);

  assert.equal(summary.total, 3);
  assert.equal(summary.attemptedCount, 2);
  assert.equal(summary.successCount, 1);
  assert.equal(summary.failureCount, 2);
  assert.equal(summary.retrySucceededCount, 1);
  assert.equal(summary.totalAttemptCount, 3);
  assert.equal(summary.totalRetryCount, 1);
  assert.equal(summary.failureKindCounts['http-status'], 1);
  assert.deepEqual(summary.providerCounts, { anthropic: 1, local: 1, stub: 1 });
});
