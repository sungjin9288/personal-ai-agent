import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createProviderAttention } from '../src/core/provider-attention.mjs';

// The provider-attention timeline domain reads nothing from the store; it works
// purely off the record/item arrays handed to it. The only injected dependency
// is the reminder-detail formatter, faked here for determinism. The fake mirrors
// the shape the real module-scope formatProviderAttentionReminderDetail returns.
function fakeReminderDetail(reminder) {
  const overdueSuffix = reminder.overdue ? ' [overdue]' : '';
  return `${reminder.providerDisplayName || reminder.providerId}${overdueSuffix} reminder: ${reminder.note || 'none'}`;
}

function makeProviderAttention(overrides = {}) {
  return createProviderAttention({
    formatProviderAttentionReminderDetail: fakeReminderDetail,
    ...overrides,
  });
}

test('formatProviderAttentionRecoveryDetail', async (t) => {
  const { formatProviderAttentionRecoveryDetail } = makeProviderAttention();

  await t.test('labels execution recovery with recovery detail', () => {
    const detail = formatProviderAttentionRecoveryDetail({
      eventFamily: 'execution',
      recoveryDetail: 'probe succeeded',
      acknowledgedAt: null,
    });
    assert.equal(detail, 'Recovered after successful provider execution: probe succeeded');
  });

  await t.test('uses acknowledged prefix and falls back to reason', () => {
    const detail = formatProviderAttentionRecoveryDetail({
      eventFamily: 'probe',
      reason: 'timeout cleared',
      acknowledgedAt: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(
      detail,
      'Acknowledged attention recovered after successful provider probe: timeout cleared',
    );
  });

  await t.test('omits suffix when neither recovery detail nor reason present', () => {
    const detail = formatProviderAttentionRecoveryDetail({ eventFamily: 'probe' });
    assert.equal(detail, 'Recovered after successful provider probe.');
  });
});

test('buildProviderAttentionTimeline', async (t) => {
  const { buildProviderAttentionTimeline } = makeProviderAttention();

  await t.test('emits opened + acknowledged for an acknowledged record', () => {
    const events = buildProviderAttentionTimeline([
      {
        actionId: 'act-1',
        providerId: 'prov-1',
        openedAt: '2026-01-01T00:00:00.000Z',
        acknowledgedAt: '2026-01-01T01:00:00.000Z',
        reason: 'rate limited',
        note: 'ack note',
        status: 'acknowledged',
      },
    ]);
    assert.equal(events.length, 2);
    assert.equal(events[0].kind, 'provider-attention-opened');
    assert.equal(events[0].at, '2026-01-01T00:00:00.000Z');
    assert.equal(events[0].detail, 'rate limited');
    assert.equal(events[1].kind, 'provider-attention-acknowledged');
    assert.equal(events[1].at, '2026-01-01T01:00:00.000Z');
    assert.equal(events[1].detail, 'ack note');
  });

  await t.test('appends resolved event when resolved with resolvedAt', () => {
    const events = buildProviderAttentionTimeline([
      {
        actionId: 'act-2',
        providerId: 'prov-2',
        acknowledgedAt: '2026-01-02T00:00:00.000Z',
        status: 'resolved',
        resolvedAt: '2026-01-02T02:00:00.000Z',
        resolutionNote: 'fixed',
      },
    ]);
    assert.equal(events.length, 3);
    const resolved = events.at(-1);
    assert.equal(resolved.kind, 'provider-attention-resolved');
    assert.equal(resolved.at, '2026-01-02T02:00:00.000Z');
    assert.equal(resolved.detail, 'fixed');
  });

  await t.test('does not append resolved event when resolvedAt is missing', () => {
    const events = buildProviderAttentionTimeline([
      { actionId: 'act-3', providerId: 'prov-3', status: 'resolved' },
    ]);
    assert.equal(events.length, 2);
    assert.ok(!events.some((event) => event.kind === 'provider-attention-resolved'));
  });

  await t.test('supplies defaults for missing telemetry and returns [] for empty input', () => {
    assert.deepEqual(buildProviderAttentionTimeline([]), []);
    const [opened] = buildProviderAttentionTimeline([{ actionId: 'a', providerId: 'p' }]);
    assert.equal(opened.attemptCount, 0);
    assert.deepEqual(opened.attemptHistory, []);
    assert.equal(opened.attemptHistoryCount, 0);
    assert.equal(opened.httpStatus, null);
    assert.equal(opened.failureKind, null);
    assert.equal(opened.recoverable, null);
    assert.equal(opened.status, 'acknowledged');
    assert.equal(opened.detail, 'Provider attention opened.');
  });
});

test('buildProviderAttentionReminderTimeline', async (t) => {
  const { buildProviderAttentionReminderTimeline } = makeProviderAttention();

  await t.test('maps records to reminded events using injected formatter', () => {
    const events = buildProviderAttentionReminderTimeline([
      {
        actionId: 'act-1',
        providerId: 'prov-1',
        providerDisplayName: 'Provider One',
        remindedAt: '2026-01-03T00:00:00.000Z',
        note: 'please look',
      },
    ]);
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'provider-attention-reminded');
    assert.equal(events[0].status, 'pending');
    assert.equal(events[0].at, '2026-01-03T00:00:00.000Z');
    assert.equal(events[0].detail, 'Provider One reminder: please look');
  });

  await t.test('falls back to createdAt and returns [] for empty input', () => {
    assert.deepEqual(buildProviderAttentionReminderTimeline([]), []);
    const [event] = buildProviderAttentionReminderTimeline([
      { actionId: 'a', providerId: 'p', createdAt: '2026-01-04T00:00:00.000Z' },
    ]);
    assert.equal(event.at, '2026-01-04T00:00:00.000Z');
    assert.equal(event.eventRefId, null);
    assert.equal(event.workspaceName, null);
  });
});

test('buildProviderAttentionRecoveredTimeline', async (t) => {
  const { buildProviderAttentionRecoveredTimeline } = makeProviderAttention();

  await t.test('maps items to recovered events with recovery detail', () => {
    const events = buildProviderAttentionRecoveredTimeline([
      {
        actionId: 'act-1',
        providerId: 'prov-1',
        recoveredAt: '2026-01-05T00:00:00.000Z',
        eventFamily: 'execution',
        recoveryDetail: 'back online',
        acknowledgedAt: '2026-01-04T00:00:00.000Z',
        recoveryProbeId: 'probe-9',
      },
    ]);
    assert.equal(events.length, 1);
    assert.equal(events[0].kind, 'provider-attention-recovered');
    assert.equal(events[0].status, 'recovered');
    assert.equal(events[0].at, '2026-01-05T00:00:00.000Z');
    assert.equal(events[0].recoveredAt, '2026-01-05T00:00:00.000Z');
    assert.equal(events[0].recoveryProbeId, 'probe-9');
    assert.equal(
      events[0].detail,
      'Acknowledged attention recovered after successful provider execution: back online',
    );
  });

  await t.test('supplies defaults for missing telemetry and returns [] for empty input', () => {
    assert.deepEqual(buildProviderAttentionRecoveredTimeline([]), []);
    const [event] = buildProviderAttentionRecoveredTimeline([
      { actionId: 'a', providerId: 'p', recoveredAt: '2026-01-06T00:00:00.000Z' },
    ]);
    assert.equal(event.attemptCount, 0);
    assert.equal(event.retryCount, 0);
    assert.equal(event.recoverable, null);
    assert.equal(event.recoveryEventKind, null);
    assert.equal(event.acknowledgedAt, null);
  });
});

test('buildProviderAttentionOpenedTimeline', async (t) => {
  const { buildProviderAttentionOpenedTimeline } = makeProviderAttention();

  await t.test('filters out items already acknowledged', () => {
    const items = [
      { actionId: 'act-1', providerId: 'prov-1', createdAt: '2026-01-07T00:00:00.000Z' },
      { actionId: 'act-2', providerId: 'prov-2', createdAt: '2026-01-07T01:00:00.000Z' },
    ];
    const events = buildProviderAttentionOpenedTimeline(items, [{ actionId: 'act-1' }]);
    assert.equal(events.length, 1);
    assert.equal(events[0].actionId, 'act-2');
    assert.equal(events[0].kind, 'provider-attention-opened');
    assert.equal(events[0].status, 'pending');
  });

  await t.test('defaults acknowledgementRecords to [] so all items pass through', () => {
    const events = buildProviderAttentionOpenedTimeline([
      { actionId: 'act-3', providerId: 'prov-3', createdAt: '2026-01-08T00:00:00.000Z', title: 'attn' },
    ]);
    assert.equal(events.length, 1);
    assert.equal(events[0].detail, 'attn');
  });

  await t.test('returns [] for empty items and defaults telemetry fields', () => {
    assert.deepEqual(buildProviderAttentionOpenedTimeline([]), []);
    const [event] = buildProviderAttentionOpenedTimeline([{ actionId: 'a', providerId: 'p' }]);
    assert.equal(event.attemptCount, 0);
    assert.equal(event.httpStatus, null);
    assert.equal(event.failureKind, null);
    assert.equal(event.detail, 'Provider attention opened.');
  });
});
