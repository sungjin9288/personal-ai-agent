import assert from 'node:assert/strict';
import test from 'node:test';

import { createEscalationService } from '../src/core/escalation-service.mjs';

const NOW = '2026-07-16T00:00:00.000Z';

function createFixture(initialEscalations = []) {
  const effects = [];
  const escalations = initialEscalations.map((item) => structuredClone(item));
  const store = {
    getEscalation(id) {
      return escalations.find((item) => item.id === id) || null;
    },
    listEscalations(filter = {}) {
      effects.push('escalation-list');
      return escalations.filter(
        (item) =>
          (!filter.actionId || item.actionId === filter.actionId) &&
          (!filter.missionId || item.missionId === filter.missionId) &&
          (!filter.owner || item.recommendedOwner === filter.owner) &&
          (!filter.status || item.status === filter.status) &&
          (!filter.workspaceId || item.workspaceId === filter.workspaceId),
      );
    },
    updateEscalation(id, updater) {
      const index = escalations.findIndex((item) => item.id === id);
      escalations[index] = updater(escalations[index]);
      effects.push(`escalation-update:${id}:${escalations[index].status}`);
      return escalations[index];
    },
  };

  const service = createEscalationService({
    getMission: (missionId) => ({ id: missionId }),
    getWorkspace: (workspaceId) => ({ id: workspaceId }),
    now: () => NOW,
    store,
  });

  return { effects, escalations, service };
}

function createOpenEscalation(overrides = {}) {
  return {
    actionId: 'action-1',
    createdAt: '2026-07-10T00:00:00.000Z',
    dueAt: '2026-07-11T00:00:00.000Z',
    id: 'escalation-1',
    missionId: 'mission-1',
    ownerHandoffHistory: [],
    ownerHandoffReminderHistory: [],
    ownerHistory: [],
    priority: 'high',
    recommendedOwner: 'workspace-owner',
    reminderCount: 0,
    reminderHistory: [],
    status: 'open',
    tierHistory: [],
    title: 'Escalation',
    workspaceId: 'workspace-1',
    ...overrides,
  };
}

test('syncEscalations backfills tier and owner history before returning the read summary', () => {
  const fixture = createFixture([createOpenEscalation()]);

  const result = fixture.service.syncEscalations();

  assert.deepEqual(fixture.effects, ['escalation-list', 'escalation-update:escalation-1:open']);
  assert.equal(result.summary.syncedCount, 1);
  assert.equal(fixture.escalations[0].tierHistory[0].reason, 'backfilled');
  assert.equal(fixture.escalations[0].ownerHistory[0].reason, 'backfilled');
  assert.equal(fixture.escalations[0].lastSyncedAt, NOW);
});

test('getEscalatedInbox performs sync mutation before building the escalated read model', () => {
  const fixture = createFixture([createOpenEscalation()]);

  const result = fixture.service.getEscalatedInbox({ status: 'open' });

  assert.deepEqual(fixture.effects.slice(0, 3), [
    'escalation-list',
    'escalation-update:escalation-1:open',
    'escalation-list',
  ]);
  assert.equal(result.items.length, 1);
  assert.equal(result.summary.sync.syncedCount, 1);
});

test('acknowledgeOwnerHandoff appends owner history without rewriting the transition', () => {
  const fixture = createFixture([
    createOpenEscalation({
      currentEffectiveOwner: 'human-approver',
      currentTier: 'critical',
      ownerHistory: [
        { at: '2026-07-10T00:00:00.000Z', from: null, reason: 'backfilled', to: 'workspace-owner' },
        {
          at: '2026-07-10T01:00:00.000Z',
          from: 'workspace-owner',
          reason: 'sync-owner-chain',
          to: 'human-approver',
        },
      ],
      tierHistory: [{ at: '2026-07-10T00:00:00.000Z', from: null, reason: 'backfilled', to: 'critical' }],
    }),
  ]);

  const result = fixture.service.acknowledgeOwnerHandoff('escalation-1', { note: 'ownership accepted' });

  assert.deepEqual(fixture.effects, ['escalation-update:escalation-1:open']);
  assert.equal(result.ownerHandoffHistory.length, 1);
  assert.equal(result.ownerHandoffHistory[0].transitionTo, 'human-approver');
  assert.equal(result.ownerHandoffHistory[0].note, 'ownership accepted');
  assert.equal(result.ownerHistory.length, 2);
});

test('resolveEscalation preserves the established duplicate resolution error', () => {
  const fixture = createFixture([createOpenEscalation()]);

  const resolved = fixture.service.resolveEscalation('escalation-1', { note: 'closed' });

  assert.equal(resolved.status, 'resolved');
  assert.equal(resolved.resolutionNote, 'closed');
  assert.throws(
    () => fixture.service.resolveEscalation('escalation-1', { note: 'duplicate' }),
    /Escalation escalation-1 is already resolved\./,
  );
});
