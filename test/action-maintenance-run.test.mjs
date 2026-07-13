import assert from 'node:assert/strict';
import { test } from 'node:test';

import { prepareActionMaintenanceRun } from '../src/core/action-maintenance-run.mjs';

function buildReminderResult({ dueCandidateCount, items, latestReminderAt, remindedCount, summary = {} }) {
  return {
    items,
    summary: {
      dueCandidateCount,
      latestReminderAt,
      remindedCount,
      ...summary,
    },
  };
}

test('prepareActionMaintenanceRun keeps reminder impact and audit record aligned', () => {
  const prepared = prepareActionMaintenanceRun({
    afterPressure: [
      {
        actionId: 'maintenance:mission-2',
        createdAt: '2026-01-02T00:00:00.000Z',
        totalDueCandidateCount: 1,
        workspaceId: 'workspace-1',
      },
    ],
    beforePressure: [
      {
        actionId: 'maintenance:mission-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        totalDueCandidateCount: 3,
        workspaceId: 'workspace-1',
      },
      {
        actionId: 'maintenance:mission-2',
        createdAt: '2026-01-02T00:00:00.000Z',
        totalDueCandidateCount: 1,
        workspaceId: 'workspace-1',
      },
    ],
    createdAt: '2026-01-03T00:00:00.000Z',
    escalationReminders: buildReminderResult({
      dueCandidateCount: 1,
      items: [{ missionId: 'mission-1' }],
      latestReminderAt: '2026-01-03T00:00:00.000Z',
      remindedCount: 1,
    }),
    filter: { missionId: null, owner: 'workspace-owner', workspaceId: 'workspace-1' },
    id: 'maintenance-run-1',
    note: 'Maintenance pass.',
    ownerHandoffReminders: buildReminderResult({
      dueCandidateCount: 1,
      items: [{ missionId: 'mission-1' }],
      latestReminderAt: '2026-01-03T00:01:00.000Z',
      remindedCount: 1,
    }),
    providerAttentionReminders: buildReminderResult({
      dueCandidateCount: 1,
      items: [{ missionId: 'mission-2' }],
      latestReminderAt: '2026-01-03T00:02:00.000Z',
      remindedCount: 1,
    }),
    specialistFollowUpReminders: buildReminderResult({
      dueCandidateCount: 1,
      items: [{ missionId: 'mission-1' }],
      latestReminderAt: '2026-01-03T00:03:00.000Z',
      remindedCount: 1,
      summary: {
        remediationRouteCounts: { 'standard-branch-remediation': 1 },
        retryPolicyCounts: { 'resume-blocked-or-failed-branch': 1 },
      },
    }),
    syncSummary: { syncedCount: 2 },
  });

  assert.equal(prepared.summary.acknowledgedMaintenanceRequiredCount, 2);
  assert.equal(prepared.summary.resolvedMaintenanceRequiredCount, 1);
  assert.equal(prepared.summary.remainingMaintenanceRequiredCount, 1);
  assert.equal(prepared.summary.dueCandidateCountTotal, 4);
  assert.equal(prepared.summary.totalRemindedCount, 4);
  assert.equal(prepared.summary.latestReminderAt, '2026-01-03T00:03:00.000Z');
  assert.deepEqual(prepared.record.affectedMissionIds, ['mission-1', 'mission-2']);
  assert.deepEqual(prepared.record.affectedMissionSummaries, [
    {
      escalationRemindedCount: 1,
      missionId: 'mission-1',
      ownerHandoffRemindedCount: 1,
      providerAttentionRemindedCount: 0,
      specialistFollowUpRemindedCount: 1,
      totalRemindedCount: 3,
    },
    {
      escalationRemindedCount: 0,
      missionId: 'mission-2',
      ownerHandoffRemindedCount: 0,
      providerAttentionRemindedCount: 1,
      specialistFollowUpRemindedCount: 0,
      totalRemindedCount: 1,
    },
  ]);
  assert.deepEqual(prepared.record.resolvedActionIds, ['maintenance:mission-1']);
  assert.deepEqual(prepared.record.remainingActionIds, ['maintenance:mission-2']);
  assert.equal(prepared.record.syncSummary.syncedCount, 2);
  assert.equal(prepared.record.filters.note, 'Maintenance pass.');
});

test('prepareActionMaintenanceRun records a no-op pass without invented impact', () => {
  const emptyReminders = buildReminderResult({
    dueCandidateCount: 0,
    items: [],
    latestReminderAt: null,
    remindedCount: 0,
  });
  const prepared = prepareActionMaintenanceRun({
    afterPressure: [],
    beforePressure: [],
    createdAt: '2026-01-03T00:00:00.000Z',
    escalationReminders: emptyReminders,
    filter: {},
    id: 'maintenance-run-2',
    note: '',
    ownerHandoffReminders: emptyReminders,
    providerAttentionReminders: emptyReminders,
    specialistFollowUpReminders: emptyReminders,
    syncSummary: { syncedCount: 0 },
  });

  assert.equal(prepared.summary.totalRemindedCount, 0);
  assert.equal(prepared.summary.dueCandidateCountTotal, 0);
  assert.equal(prepared.summary.latestReminderAt, null);
  assert.deepEqual(prepared.record.affectedMissionIds, []);
  assert.deepEqual(prepared.record.acknowledgedActionIds, []);
  assert.equal(prepared.record.filters.missionId, null);
  assert.equal(prepared.record.filters.workspaceId, null);
});
