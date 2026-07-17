import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createActionInbox } from '../src/core/action-inbox.mjs';

// The action-inbox summarize/read domain reads nothing from the store; it works
// purely off the item arrays handed to it. The only injected dependency is the
// specialist follow-up summarizer, faked here for determinism. The fake mirrors
// the shape summarizeActionInbox consumes.
function fakeSpecialistFollowUpSummary(items) {
  return {
    specialistKindCounts: { research: items.length },
    latestReminderAt: items.at(-1)?.latestReminderAt || null,
    needsReminderCount: items.filter((item) => item.needsReminder).length,
    nextReminderAt: items[0]?.nextReminderAt || null,
    overdueCount: items.filter((item) => item.isOverdue).length,
    providerCounts: {},
    remediationRouteCounts: {},
    reminderCountTotal: 0,
    retryPolicyCounts: {},
    statusCounts: { blocked: 0, failed: 0, total: items.length },
  };
}

function makeInbox(overrides = {}) {
  return createActionInbox({
    summarizeSpecialistFollowUpItems: fakeSpecialistFollowUpSummary,
    ...overrides,
  });
}

test('getActionInboxReminderState', async (t) => {
  const { getActionInboxReminderState } = makeInbox();

  await t.test('reports no reminder for a bare item', () => {
    const state = getActionInboxReminderState({ actionClass: 'blocked' });
    assert.equal(state.hasReminder, false);
    assert.equal(state.needsReminder, false);
    assert.equal(state.reminderCount, 0);
    assert.equal(state.nextReminderAt, null);
    assert.equal(state.lastReminderAt, null);
  });

  await t.test('treats monitoring-required as reminder-eligible', () => {
    const state = getActionInboxReminderState({ actionClass: 'monitoring-required' });
    assert.equal(state.hasReminder, true);
  });

  await t.test('falls back to handoff-prefixed reminder fields', () => {
    const state = getActionInboxReminderState({
      actionClass: 'handoff-required',
      handoffNextReminderAt: '2026-02-01T00:00:00.000Z',
      handoffLatestReminderAt: '2026-01-15T00:00:00.000Z',
      handoffReminderCadenceHours: 24,
      handoffReminderCount: 3,
      handoffNeedsReminder: true,
    });
    assert.equal(state.hasReminder, true);
    assert.equal(state.needsReminder, true);
    assert.equal(state.nextReminderAt, '2026-02-01T00:00:00.000Z');
    assert.equal(state.lastReminderAt, '2026-01-15T00:00:00.000Z');
    assert.equal(state.reminderCadenceHours, 24);
    assert.equal(state.reminderCount, 3);
  });

  await t.test('prefers direct reminder fields over handoff fallbacks', () => {
    const state = getActionInboxReminderState({
      actionClass: 'blocked',
      reminderCount: 5,
      handoffReminderCount: 9,
    });
    assert.equal(state.reminderCount, 5);
    assert.equal(state.hasReminder, true); // reminderCount > 0
  });
});

test('summarizeProviderHealthDriftItems', async (t) => {
  const { summarizeProviderHealthDriftItems } = makeInbox();

  await t.test('returns zeroed summary for an empty list', () => {
    const summary = summarizeProviderHealthDriftItems([]);
    assert.equal(summary.total, 0);
    assert.equal(summary.overdueCount, 0);
    assert.equal(summary.latestItem, null);
    assert.deepEqual(summary.providerCounts, {});
    assert.deepEqual(summary.reasonCodeCounts, {});
  });

  await t.test('aggregates provider, reason-code, and overdue counts', () => {
    const items = [
      { providerId: 'anthropic', workspaceId: 'ws-1', driftReasonCodes: ['latency', 'error-rate'], isOverdue: true },
      { providerId: 'anthropic', workspaceId: 'ws-2', driftReasonCodes: ['latency'], isOverdue: false },
    ];
    const summary = summarizeProviderHealthDriftItems(items);
    assert.equal(summary.total, 2);
    assert.equal(summary.overdueCount, 1);
    assert.equal(summary.providerCounts.anthropic, 2);
    assert.equal(summary.workspaceCounts['ws-1'], 1);
    assert.equal(summary.reasonCodeCounts.latency, 2);
    assert.equal(summary.reasonCodeCounts['error-rate'], 1);
    assert.equal(summary.latestItem, items[1]);
  });

  await t.test('tolerates malformed items missing drift reason codes', () => {
    const summary = summarizeProviderHealthDriftItems([{ isOverdue: true }, {}]);
    assert.equal(summary.total, 2);
    assert.equal(summary.overdueCount, 1);
    assert.deepEqual(summary.providerCounts, {});
    assert.deepEqual(summary.reasonCodeCounts, {});
  });
});

test('summarizeActionInbox', async (t) => {
  const { summarizeActionInbox } = makeInbox();

  await t.test('returns a fully zeroed summary for an empty inbox', () => {
    const summary = summarizeActionInbox([]);
    assert.equal(summary.pendingActionCount, 0);
    assert.equal(summary.actionCounts.total, 0);
    assert.equal(summary.actionClassCounts.total, 0);
    assert.equal(summary.overdueCounts.total, 0);
    assert.equal(summary.reminderCounts.total, 0);
    assert.equal(summary.latestReminderAt, null);
    assert.equal(summary.nextReminderAt, null);
    assert.deepEqual(summary.providerCounts, {});
    assert.deepEqual(summary.workspaceCounts, {});
    // specialist / drift sub-summaries still present with zero totals
    assert.equal(summary.providerHealthDriftOverdueCount, 0);
    assert.equal(summary.specialistFollowUpOverdueCount, 0);
    assert.deepEqual(summary.userLearningSelectionOverrideCounts, {
      active: 0,
      cleared: 0,
      eligible: 0,
      expired: 0,
      invalid: 0,
      notSet: 0,
    });
    assert.deepEqual(summary.workspaceLearningSelectionOverrideCounts, {
      active: 0,
      cleared: 0,
      eligible: 0,
      expired: 0,
      invalid: 0,
      notSet: 0,
    });
  });

  await t.test('summarizes user learning selection override states without reading notes', () => {
    const summary = summarizeActionInbox([
      {
        actionClass: 'monitoring-required',
        actionType: 'learning-promotion',
        userLearningSelectionOverride: { status: 'active' },
      },
      {
        actionClass: 'monitoring-required',
        actionType: 'learning-promotion',
        userLearningSelectionOverride: { status: 'cleared' },
      },
      {
        actionClass: 'monitoring-required',
        actionType: 'learning-promotion',
        userLearningSelectionOverride: { status: 'invalid' },
      },
    ]);

    assert.deepEqual(summary.userLearningSelectionOverrideCounts, {
      active: 1,
      cleared: 1,
      eligible: 3,
      expired: 0,
      invalid: 1,
      notSet: 0,
    });
  });

  await t.test('summarizes workspace learning selection override states without reading notes', () => {
    const summary = summarizeActionInbox([
      {
        actionClass: 'monitoring-required',
        actionType: 'learning-promotion',
        workspaceLearningSelectionOverride: { status: 'active' },
      },
      {
        actionClass: 'monitoring-required',
        actionType: 'learning-promotion',
        workspaceLearningSelectionOverride: { status: 'expired' },
      },
      {
        actionClass: 'monitoring-required',
        actionType: 'learning-promotion',
        workspaceLearningSelectionOverride: { status: 'not-set' },
      },
    ]);

    assert.deepEqual(summary.workspaceLearningSelectionOverrideCounts, {
      active: 1,
      cleared: 0,
      eligible: 3,
      expired: 1,
      invalid: 0,
      notSet: 1,
    });
  });

  await t.test('tallies action types, classes, owners, priorities, and overdue', () => {
    const items = [
      {
        actionType: 'approval',
        actionClass: 'awaiting-human-decision',
        recommendedOwner: 'human-approver',
        effectiveRecommendedOwner: 'human-approver',
        priority: 'high',
        providerId: 'anthropic',
        workspaceId: 'ws-1',
        isOverdue: true,
      },
      {
        actionType: 'owner-handoff',
        actionClass: 'handoff-required',
        recommendedOwner: 'mission-owner',
        priority: 'low',
        workspaceId: 'ws-1',
        handoffNextReminderAt: '2026-03-01T00:00:00.000Z',
        handoffLatestReminderAt: '2026-02-20T00:00:00.000Z',
        handoffNeedsReminder: true,
        isOverdue: false,
      },
    ];
    const summary = summarizeActionInbox(items);
    assert.equal(summary.pendingActionCount, 2);
    assert.equal(summary.actionCounts.approval, 1);
    assert.equal(summary.actionCounts.ownerHandoff, 1);
    assert.equal(summary.actionClassCounts.awaitingHumanDecision, 1);
    assert.equal(summary.actionClassCounts.handoffRequired, 1);
    assert.equal(summary.ownerCounts['human-approver'], 1);
    assert.equal(summary.ownerCounts['mission-owner'], 1);
    // effectiveRecommendedOwner falls back to recommendedOwner when absent
    assert.equal(summary.effectiveOwnerCounts['mission-owner'], 1);
    assert.equal(summary.priorityCounts.high, 1);
    assert.equal(summary.priorityCounts.low, 1);
    assert.equal(summary.providerCounts.anthropic, 1);
    assert.equal(summary.workspaceCounts['ws-1'], 2);
    assert.equal(summary.overdueCounts.overdue, 1);
    assert.equal(summary.overdueCounts.onTime, 1);
    // reminder rollup: handoff item is eligible + needs reminder
    assert.equal(summary.reminderCounts.eligible, 1);
    assert.equal(summary.reminderCounts.needsReminder, 1);
    assert.equal(summary.nextReminderAt, '2026-03-01T00:00:00.000Z');
    assert.equal(summary.latestReminderAt, '2026-02-20T00:00:00.000Z');
  });

  await t.test('routes specialist and drift items to injected/moved summarizers', () => {
    const items = [
      { actionClass: 'specialist-follow-up-required', actionType: 'specialist-follow-up', isOverdue: true, needsReminder: true },
      { actionClass: 'provider-health-drift-required', actionType: 'provider-health-drift', providerId: 'openai', driftReasonCodes: ['latency'], isOverdue: true },
    ];
    const summary = summarizeActionInbox(items);
    assert.equal(summary.actionClassCounts.specialistFollowUpRequired, 1);
    assert.equal(summary.actionClassCounts.providerHealthDriftRequired, 1);
    // drift sub-summary comes from the moved summarizeProviderHealthDriftItems
    assert.equal(summary.providerHealthDriftOverdueCount, 1);
    assert.equal(summary.providerHealthDriftProviderCounts.openai, 1);
    assert.equal(summary.providerHealthDriftReasonCodeCounts.latency, 1);
    // specialist sub-summary comes from the injected fake
    assert.equal(summary.specialistFollowUpOverdueCount, 1);
    assert.equal(summary.specialistFollowUpKindCounts.research, 1);
    assert.equal(summary.specialistFollowUpNeedsReminderCount, 1);
  });
});

test('action inbox read model', async (t) => {
  const { buildActionInboxReadModel, selectActionInboxItems } = makeInbox();

  await t.test('selects matching items and preserves chronological order', () => {
    const items = selectActionInboxItems(
      [
        {
          actionClass: 'monitoring-required',
          actionId: 'later',
          createdAt: '2026-03-02T00:00:00.000Z',
          effectiveRecommendedOwner: 'workspace-owner',
          isOverdue: true,
          needsReminder: true,
          priority: 'high',
          providerFallbackStopReasonCounts: { 'provider-timeout': 1 },
          recommendedOwner: 'mission-owner',
        },
        {
          actionClass: 'monitoring-required',
          actionId: 'earlier',
          createdAt: '2026-03-01T00:00:00.000Z',
          effectiveRecommendedOwner: 'workspace-owner',
          isOverdue: true,
          needsReminder: true,
          priority: 'high',
          providerFallbackStopReasonCounts: { 'provider-timeout': 2 },
          recommendedOwner: 'mission-owner',
        },
        {
          actionClass: 'blocked',
          actionId: 'excluded',
          createdAt: '2026-02-28T00:00:00.000Z',
          priority: 'high',
          recommendedOwner: 'mission-owner',
        },
      ],
      {
        filter: {
          actionClass: 'monitoring-required',
          effectiveOwner: 'workspace-owner',
          needsReminderOnly: true,
          overdueOnly: true,
          owner: 'mission-owner',
          priority: 'high',
        },
        providerFallbackStopReason: 'provider-timeout',
      },
    );

    assert.deepEqual(items.map((item) => item.actionId), ['earlier', 'later']);
  });

  await t.test('assembles filters, summary, and maintenance trend without store access', () => {
    const items = [
      {
        actionClass: 'maintenance-required',
        actionId: 'maintenance-1',
        actionType: 'maintenance-sweep',
        createdAt: '2026-03-01T00:00:00.000Z',
        isOverdue: false,
        priority: 'high',
        recommendedOwner: 'workspace-owner',
        workspaceId: 'workspace-1',
      },
    ];
    const delta = { remindedCount: 2 };
    const readModel = buildActionInboxReadModel({
      filter: { missionId: 'mission-1', needsReminderOnly: true },
      items,
      maintenanceLatestMonthlyBucketDelta: delta,
      maintenanceMonthlyBuckets: [
        { monthStartDate: '2026-03-01' },
        { monthStartDate: '2026-02-01' },
      ],
      providerFallbackStopReason: 'provider-timeout',
    });

    assert.equal(readModel.filters.missionId, 'mission-1');
    assert.equal(readModel.filters.needsReminderOnly, true);
    assert.equal(readModel.filters.providerFallbackStopReason, 'provider-timeout');
    assert.equal(readModel.summary.pendingActionCount, 1);
    assert.equal(readModel.summary.maintenanceMonthlyBucketCount, 2);
    assert.equal(readModel.summary.maintenanceLatestMonthlyBucketStartDate, '2026-03-01');
    assert.equal(readModel.summary.maintenanceOldestMonthlyBucketStartDate, '2026-02-01');
    assert.equal(readModel.summary.maintenanceLatestMonthlyBucketDelta, delta);
  });
});
