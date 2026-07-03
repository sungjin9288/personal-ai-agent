import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEscalationReminderNote,
  buildInitialOwnerHistoryEntry,
  buildInitialTierHistoryEntry,
  buildOverdueIncidentContent,
  buildOverdueIncidentTitle,
  deriveEscalationTier,
  deriveSlaHoursFromTimestamps,
  enrichEscalation,
  formatIncidentCountMap,
  isBreachTier,
  summarizeEscalations,
} from '../src/core/escalation-analytics.mjs';

// Fixed, deterministic UTC timestamps used across tests.
const JAN_1 = '2024-01-01T09:00:00.000Z';
const JAN_2 = '2024-01-02T09:00:00.000Z';
const JAN_5 = '2024-01-05T09:00:00.000Z';

function buildEscalation(overrides = {}) {
  return {
    id: 'escalation-1',
    createdAt: JAN_1,
    dueAt: JAN_2,
    priority: 'high',
    recommendedOwner: 'workspace-owner',
    status: 'open',
    workspaceId: 'workspace-1',
    ...overrides,
  };
}

// --- deriveEscalationTier -------------------------------------------------

test('deriveEscalationTier returns "resolved" when status is not open', () => {
  assert.equal(deriveEscalationTier({ status: 'resolved', dueAt: JAN_1 }), 'resolved');
});

test('deriveEscalationTier returns "normal" when there is no dueAt', () => {
  assert.equal(deriveEscalationTier({ status: 'open', dueAt: null }), 'normal');
});

test('deriveEscalationTier returns "normal" when dueAt is in the future', () => {
  const farFuture = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  assert.equal(deriveEscalationTier({ status: 'open', dueAt: farFuture }), 'normal');
});

test('deriveEscalationTier returns "warning" when overdue by less than 24 hours', () => {
  const overdueBy1Hour = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
  assert.equal(deriveEscalationTier({ status: 'open', dueAt: overdueBy1Hour }), 'warning');
});

test('deriveEscalationTier returns "critical" when overdue by 24 hours or more', () => {
  const overdueBy25Hours = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  assert.equal(deriveEscalationTier({ status: 'open', dueAt: overdueBy25Hours }), 'critical');
});

// --- isBreachTier ----------------------------------------------------------

test('isBreachTier returns true for warning and critical tiers', () => {
  assert.equal(isBreachTier('warning'), true);
  assert.equal(isBreachTier('critical'), true);
});

test('isBreachTier returns false for normal and resolved tiers', () => {
  assert.equal(isBreachTier('normal'), false);
  assert.equal(isBreachTier('resolved'), false);
});

// --- enrichEscalation --------------------------------------------------

test('enrichEscalation without prior owner/tier history yields empty histories and base owner', () => {
  const enriched = enrichEscalation(buildEscalation({ status: 'resolved' }));

  assert.equal(enriched.currentTier, 'resolved');
  assert.deepEqual(enriched.ownerHistory, []);
  assert.deepEqual(enriched.ownerHandoffHistory, []);
  assert.equal(enriched.ownerHistoryCount, 0);
  assert.equal(enriched.pendingOwnerHandoff, false);
  assert.equal(enriched.effectiveRecommendedOwner, 'workspace-owner');
  assert.equal(enriched.ownerEscalationLevel, 'base');
});

test('enrichEscalation with prior owner transition history surfaces pending handoff signals', () => {
  const ownerHistory = [
    { at: JAN_1, from: null, reason: 'created', to: 'workspace-owner' },
    { at: JAN_2, from: 'workspace-owner', reason: 'escalated', to: 'human-approver' },
  ];

  const enriched = enrichEscalation(
    buildEscalation({
      ownerHandoffHistory: [],
      ownerHistory,
      recommendedOwner: 'human-approver',
    }),
  );

  assert.equal(enriched.ownerHistoryCount, 2);
  assert.deepEqual(enriched.latestOwnerTransition, ownerHistory[1]);
  assert.equal(enriched.pendingOwnerHandoff, true);
  assert.equal(enriched.ownerHandoffTargetOwner, 'human-approver');
  assert.equal(enriched.ownerHandoffSlaHours, 12);
});

// --- summarizeEscalations ---------------------------------------------

test('summarizeEscalations on an empty list returns zeroed totals', () => {
  const summary = summarizeEscalations([]);

  assert.equal(summary.total, 0);
  assert.equal(summary.pendingEscalationCount, 0);
  assert.equal(summary.breachCountTotal, 0);
  assert.deepEqual(summary.openEscalationIds, []);
  assert.equal(summary.statusCounts.total, 0);
});

test('summarizeEscalations on a single open escalation counts it correctly', () => {
  const summary = summarizeEscalations([buildEscalation({ id: 'escalation-a' })]);

  assert.equal(summary.total, 1);
  assert.equal(summary.pendingEscalationCount, 1);
  assert.deepEqual(summary.openEscalationIds, ['escalation-a']);
  assert.equal(summary.statusCounts.open, 1);
  assert.equal(summary.workspaceCounts['workspace-1'], 1);
});

test('summarizeEscalations across multiple escalations aggregates owner/priority/status counts', () => {
  const summary = summarizeEscalations([
    buildEscalation({ id: 'escalation-a', priority: 'high', status: 'open' }),
    buildEscalation({ id: 'escalation-b', priority: 'low', status: 'resolved' }),
    buildEscalation({ id: 'escalation-c', priority: 'high', recommendedOwner: 'mission-owner', status: 'open' }),
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.pendingEscalationCount, 2);
  assert.equal(summary.priorityCounts.high, 2);
  assert.equal(summary.priorityCounts.low, 1);
  assert.equal(summary.ownerCounts['workspace-owner'], 2);
  assert.equal(summary.ownerCounts['mission-owner'], 1);
  assert.equal(summary.statusCounts.open, 2);
  assert.equal(summary.statusCounts.resolved, 1);
});

// --- buildOverdueIncidentTitle / formatIncidentCountMap ----------------

test('buildOverdueIncidentTitle renders the item count', () => {
  assert.equal(buildOverdueIncidentTitle(0), 'Overdue Action Escalation (0 items)');
  assert.equal(buildOverdueIncidentTitle(7), 'Overdue Action Escalation (7 items)');
});

test('formatIncidentCountMap sorts keys and filters zero/negative counts', () => {
  assert.equal(
    formatIncidentCountMap({ zebra: 2, apple: 5, ignored: 0, negative: -1 }),
    'apple=5, zebra=2',
  );
});

test('formatIncidentCountMap returns an empty string for an empty map', () => {
  assert.equal(formatIncidentCountMap({}), '');
  assert.equal(formatIncidentCountMap(), '');
});

// --- buildOverdueIncidentContent ----------------------------------------

test('buildOverdueIncidentContent renders filters and per-item detail lines', () => {
  const content = buildOverdueIncidentContent({
    filters: { actionClass: 'overdue', owner: 'workspace-owner' },
    items: [
      {
        actionClass: 'overdue-action',
        dueAt: JAN_2,
        escalationRule: 'sla-breach',
        missionId: 'mission-1',
        priority: 'high',
        recommendedCommand: 'node src/cli.mjs action ack a1',
        recommendedOwner: 'workspace-owner',
        title: 'Fix the thing',
        workspaceName: 'Workspace One',
      },
    ],
    summary: {},
  });

  assert.match(content, /overdue action count: 1/);
  assert.match(content, /filters: class=overdue, owner=workspace-owner/);
  assert.match(content, /\[overdue-action\/high\] Fix the thing \| workspace=Workspace One/);
  assert.match(content, /command: node src\/cli\.mjs action ack a1/);
});

test('buildOverdueIncidentContent omits optional summary sections when absent', () => {
  const content = buildOverdueIncidentContent({
    filters: {},
    items: [],
    summary: {},
  });

  assert.match(content, /overdue action count: 0/);
  assert.match(content, /filters: none/);
  assert.doesNotMatch(content, /specialist follow-up/);
  assert.doesNotMatch(content, /provider health drift/);
});

// --- buildEscalationReminderNote ----------------------------------------

test('buildEscalationReminderNote returns the trimmed explicit note when provided', () => {
  assert.equal(
    buildEscalationReminderNote(buildEscalation({ currentTier: 'critical' }), '  custom note  '),
    'custom note',
  );
});

test('buildEscalationReminderNote falls back to a tier-derived message when note is empty', () => {
  assert.equal(
    buildEscalationReminderNote(buildEscalation({ currentTier: 'warning' }), ''),
    'Reminder issued while escalation is warning.',
  );
});

// --- deriveSlaHoursFromTimestamps ---------------------------------------

test('deriveSlaHoursFromTimestamps computes rounded hour duration between createdAt and dueAt', () => {
  assert.equal(deriveSlaHoursFromTimestamps(JAN_1, JAN_2), 24);
  assert.equal(deriveSlaHoursFromTimestamps(JAN_1, JAN_5), 96);
});

test('deriveSlaHoursFromTimestamps returns null for missing or non-positive durations', () => {
  assert.equal(deriveSlaHoursFromTimestamps(null, JAN_2), null);
  assert.equal(deriveSlaHoursFromTimestamps(JAN_1, null), null);
  assert.equal(deriveSlaHoursFromTimestamps(JAN_2, JAN_1), null);
  assert.equal(deriveSlaHoursFromTimestamps(JAN_1, JAN_1), null);
});

// --- buildInitialTierHistoryEntry / buildInitialOwnerHistoryEntry -------

test('buildInitialTierHistoryEntry builds a from:null history entry for the given tier', () => {
  assert.deepEqual(buildInitialTierHistoryEntry('critical', JAN_1, 'backfilled'), {
    at: JAN_1,
    from: null,
    reason: 'backfilled',
    to: 'critical',
  });
});

test('buildInitialOwnerHistoryEntry builds a from:null history entry for the given owner', () => {
  assert.deepEqual(buildInitialOwnerHistoryEntry('human-approver', JAN_2, 'backfilled'), {
    at: JAN_2,
    from: null,
    reason: 'backfilled',
    to: 'human-approver',
  });
});
