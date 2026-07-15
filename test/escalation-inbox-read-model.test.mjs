import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEscalatedInboxReadModel,
  selectEscalatedInboxItems,
} from '../src/core/escalation-inbox-read-model.mjs';

test('selectEscalatedInboxItems filters the read view and sorts it chronologically', () => {
  const items = selectEscalatedInboxItems(
    [
      {
        createdAt: '2026-03-02T00:00:00.000Z',
        effectiveRecommendedOwner: 'human-approver',
        escalationTier: 'critical',
        id: 'later',
        needsReminder: true,
      },
      {
        createdAt: '2026-03-01T00:00:00.000Z',
        effectiveRecommendedOwner: 'human-approver',
        escalationTier: 'critical',
        id: 'earlier',
        needsReminder: true,
      },
      {
        createdAt: '2026-02-28T00:00:00.000Z',
        effectiveRecommendedOwner: 'workspace-owner',
        escalationTier: 'warning',
        id: 'excluded',
        needsReminder: false,
      },
    ],
    {
      effectiveOwner: 'human-approver',
      needsReminderOnly: true,
      tier: 'critical',
    },
  );

  assert.deepEqual(items.map((item) => item.id), ['earlier', 'later']);
});

test('buildEscalatedInboxReadModel preserves filters, analytics, and sync evidence', () => {
  const syncSummary = { syncedCount: 1, transitionedCount: 0 };
  const readModel = buildEscalatedInboxReadModel({
    filter: {
      effectiveOwner: 'workspace-owner',
      missionId: 'mission-1',
      needsReminderOnly: true,
      owner: 'workspace-owner',
      tier: 'warning',
      workspaceId: 'workspace-1',
    },
    items: [
      {
        createdAt: '2026-03-01T00:00:00.000Z',
        currentEffectiveOwner: 'workspace-owner',
        currentTier: 'warning',
        id: 'escalation-1',
        priority: 'high',
        recommendedOwner: 'workspace-owner',
        status: 'open',
        workspaceId: 'workspace-1',
      },
    ],
    syncSummary,
  });

  assert.equal(readModel.filters.status, 'open');
  assert.equal(readModel.filters.missionId, 'mission-1');
  assert.equal(readModel.filters.needsReminderOnly, true);
  assert.equal(readModel.summary.pendingEscalationCount, 1);
  assert.deepEqual(readModel.summary.openEscalationIds, ['escalation-1']);
  assert.equal(readModel.summary.sync, syncSummary);
});
