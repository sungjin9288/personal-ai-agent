import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProviderAttentionAcknowledgementRecord,
  buildProviderAttentionReminderRecord,
  buildResolvedProviderAttentionRecord,
  buildSpecialistFollowUpReminderRecord,
} from '../src/core/action-mutation-records.mjs';

test('buildSpecialistFollowUpReminderRecord preserves remediation audit context', () => {
  const record = buildSpecialistFollowUpReminderRecord({
    id: 'specialist-reminder-1',
    item: {
      actionId: 'specialist-follow-up:parallel-1:implementation:run-1',
      dueAt: '2026-01-01T12:00:00.000Z',
      fallbackRecommendedCommand: 'node src/cli.mjs mission run mission-1 --provider stub',
      isOverdue: true,
      missionId: 'mission-1',
      parallelGroupId: 'parallel-1',
      priority: 'high',
      providerId: 'stub',
      recommendedCommand: 'node src/cli.mjs action remediate-specialist-follow-up action-1',
      remediationRoute: { routeType: 'standard-branch-remediation', routeUrgency: 'standard' },
      reminderCadenceHours: 24,
      retryPolicy: 'resume-blocked-or-failed-branch',
      sessionId: 'session-1',
      slaHours: 24,
      specialistKind: 'implementation',
      specialistRootRunId: 'run-1',
      status: 'failed',
      title: 'Implementation specialist follow-up',
      workspaceId: 'workspace-1',
      workspaceName: 'Example workspace',
    },
    note: '',
    remindedAt: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(record.id, 'specialist-reminder-1');
  assert.equal(record.createdAt, record.remindedAt);
  assert.equal(record.overdue, true);
  assert.equal(record.runId, 'run-1');
  assert.equal(record.retryPolicy, 'resume-blocked-or-failed-branch');
  assert.equal(record.remediationRoute.routeType, 'standard-branch-remediation');
  assert.equal(record.note, 'Reminder issued for failed implementation specialist follow-up.');
});

test('buildProviderAttentionReminderRecord preserves provider event identity', () => {
  const record = buildProviderAttentionReminderRecord({
    id: 'provider-reminder-1',
    item: {
      actionId: 'provider-attention:anthropic:probe:probe-1',
      dueAt: '2026-01-02T00:00:00.000Z',
      eventFamily: 'probe',
      eventKind: 'provider-probe-failed',
      eventRefId: 'probe-1',
      isOverdue: false,
      missionId: null,
      priority: 'medium',
      providerDisplayName: 'Anthropic',
      providerId: 'anthropic',
      reminderCadenceHours: 24,
      slaHours: 24,
      title: 'Anthropic probe attention',
    },
    note: '',
    remindedAt: '2026-01-01T00:00:00.000Z',
  });

  assert.equal(record.eventFamily, 'probe');
  assert.equal(record.eventKind, 'provider-probe-failed');
  assert.equal(record.eventRefId, 'probe-1');
  assert.equal(record.providerId, 'anthropic');
  assert.equal(record.note, 'Reminder issued for failed Anthropic probe attention.');
});

test('provider acknowledgement and resolution records preserve telemetry and lifecycle state', () => {
  const acknowledged = buildProviderAttentionAcknowledgementRecord({
    acknowledgedAt: '2026-01-02T00:00:00.000Z',
    id: 'provider-attention-ack-1',
    note: '',
    pendingItem: {
      actionId: 'provider-attention:openai:execution:run-1',
      attemptCount: '2',
      attemptHistory: [
        {
          attempt: 1,
          durationMs: '250',
          failureKind: 'network',
          ok: false,
          recoverable: true,
        },
      ],
      createdAt: '2026-01-01T00:00:00.000Z',
      durationMs: '500',
      eventFamily: 'execution',
      eventKind: 'provider-execution-failed',
      eventRefId: 'run-1',
      failureKind: 'network',
      httpStatus: '503',
      missionId: 'mission-1',
      priority: 'high',
      providerDisplayName: 'OpenAI',
      providerId: 'openai',
      reason: 'Provider request failed.',
      recommendedOwner: 'workspace-owner',
      recoverable: true,
      retryCount: '1',
      sessionId: 'session-1',
      timedOut: false,
      title: 'OpenAI execution attention',
      usageInputTokens: '10',
      usageOutputTokens: '5',
      usageTotalTokens: '15',
      workspaceId: 'workspace-1',
      workspaceName: 'Example workspace',
    },
  });

  assert.equal(acknowledged.status, 'acknowledged');
  assert.equal(acknowledged.note, 'Provider attention acknowledged.');
  assert.equal(acknowledged.attemptCount, 2);
  assert.equal(acknowledged.attemptHistory.length, 1);
  assert.equal(acknowledged.durationMs, 500);
  assert.equal(acknowledged.httpStatus, 503);
  assert.equal(acknowledged.usageTotalTokens, 15);

  const resolved = buildResolvedProviderAttentionRecord({
    current: acknowledged,
    note: '',
    resolvedAt: '2026-01-03T00:00:00.000Z',
  });

  assert.equal(resolved.id, acknowledged.id);
  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.resolutionNote, 'Provider attention resolved.');
  assert.equal(resolved.resolvedAt, '2026-01-03T00:00:00.000Z');
});
