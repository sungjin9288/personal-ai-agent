import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildMaintenanceDailyBuckets,
  buildMaintenanceLatestBucketDelta,
  buildMaintenanceLatestMonthlyBucketDelta,
  buildMaintenanceLatestWeeklyBucketDelta,
  buildMaintenanceMonthlyBuckets,
  buildMaintenanceWeeklyBuckets,
  getMaintenanceRunAffectedMissionIds,
  isMaintenanceRunEffective,
  isMaintenanceRunImpactful,
  summarizeMaintenanceImpact,
  summarizeMaintenancePressure,
  summarizeMaintenanceRuns,
} from '../src/core/maintenance-analytics.mjs';

// Fixed, deterministic timestamps used across tests.
const DAY_1 = '2024-01-01T09:00:00.000Z'; // Monday
const DAY_1_LATER = '2024-01-01T18:00:00.000Z'; // Monday, same UTC day
const DAY_2 = '2024-01-02T09:00:00.000Z'; // Tuesday, same week as DAY_1
const DAY_8 = '2024-01-08T09:00:00.000Z'; // Monday, next ISO week
const FEB_1 = '2024-02-01T09:00:00.000Z'; // next month

test('getMaintenanceRunAffectedMissionIds', async (t) => {
  await t.test('returns an empty array when there is no missionId or affectedMissionIds', () => {
    assert.deepEqual(getMaintenanceRunAffectedMissionIds({}), []);
  });

  await t.test('merges missionId and affectedMissionIds, dedupes, and sorts', () => {
    const result = getMaintenanceRunAffectedMissionIds({
      missionId: 'mission-b',
      affectedMissionIds: ['mission-a', 'mission-b', 'mission-c'],
    });
    assert.deepEqual(result, ['mission-a', 'mission-b', 'mission-c']);
  });
});

test('isMaintenanceRunEffective', async (t) => {
  await t.test('returns false when reminded/acknowledged/resolved counts are all zero', () => {
    assert.equal(isMaintenanceRunEffective({}), false);
    assert.equal(
      isMaintenanceRunEffective({ totalRemindedCount: 0, acknowledgedMaintenanceRequiredCount: 0, resolvedMaintenanceRequiredCount: 0 }),
      false,
    );
  });

  await t.test('returns true when any of the three counters is positive', () => {
    assert.equal(isMaintenanceRunEffective({ totalRemindedCount: 1 }), true);
    assert.equal(isMaintenanceRunEffective({ acknowledgedMaintenanceRequiredCount: 2 }), true);
    assert.equal(isMaintenanceRunEffective({ resolvedMaintenanceRequiredCount: 3 }), true);
  });
});

test('isMaintenanceRunImpactful', async (t) => {
  await t.test('returns false when there are no affected missions', () => {
    assert.equal(isMaintenanceRunImpactful({}), false);
  });

  await t.test('returns true when missionId or affectedMissionIds produce at least one mission', () => {
    assert.equal(isMaintenanceRunImpactful({ missionId: 'mission-a' }), true);
    assert.equal(isMaintenanceRunImpactful({ affectedMissionIds: ['mission-b'] }), true);
  });
});

test('summarizeMaintenanceImpact', async (t) => {
  await t.test('returns zeroed defaults for empty input', () => {
    const result = summarizeMaintenanceImpact([]);
    assert.deepEqual(result, {
      affectedMissionCount: 0,
      affectedMissionIds: [],
      latestImpactAffectedMissionIds: [],
      latestImpactRun: null,
      latestImpactRunAt: null,
    });
  });

  await t.test('aggregates affected mission ids across runs and tracks the latest impactful run', () => {
    const runA = { id: 'run-a', createdAt: DAY_1, missionId: 'mission-1' };
    const runB = { id: 'run-b', createdAt: DAY_2, missionId: 'mission-2', affectedMissionIds: ['mission-3'] };
    const runC = { id: 'run-c', createdAt: DAY_8 }; // no-impact run, should not overwrite latest

    const result = summarizeMaintenanceImpact([runA, runB, runC]);
    assert.deepEqual(result.affectedMissionIds, ['mission-1', 'mission-2', 'mission-3']);
    assert.equal(result.affectedMissionCount, 3);
    assert.equal(result.latestImpactRun.id, 'run-b');
    assert.equal(result.latestImpactRunAt, DAY_2);
    assert.deepEqual(result.latestImpactAffectedMissionIds, ['mission-2', 'mission-3']);
  });

  await t.test('scopeMissionIds filters which mission ids count as affected', () => {
    const runA = { id: 'run-a', createdAt: DAY_1, missionId: 'mission-1', affectedMissionIds: ['mission-2'] };
    const result = summarizeMaintenanceImpact([runA], ['mission-2']);
    assert.deepEqual(result.affectedMissionIds, ['mission-2']);
    assert.equal(result.latestImpactRun.id, 'run-a');
  });
});

test('summarizeMaintenanceRuns', async (t) => {
  await t.test('returns zeroed defaults for an empty items array', () => {
    const result = summarizeMaintenanceRuns([]);
    assert.equal(result.runCount, 0);
    assert.equal(result.effectiveRunCount, 0);
    assert.equal(result.noOpRunCount, 0);
    assert.equal(result.impactRunCount, 0);
    assert.equal(result.latestRun, null);
    assert.deepEqual(result.recentRuns, []);
    assert.deepEqual(result.runOutcomeCounts, { effective: 0, impactful: 0, noOp: 0, total: 0 });
  });

  await t.test('aggregates a single effective+impactful run', () => {
    const run = {
      id: 'run-1',
      createdAt: DAY_1,
      workspaceId: 'ws-1',
      missionId: 'mission-1',
      totalRemindedCount: 2,
      acknowledgedMaintenanceRequiredCount: 1,
      resolvedMaintenanceRequiredCount: 0,
    };
    const result = summarizeMaintenanceRuns([run]);
    assert.equal(result.runCount, 1);
    assert.equal(result.effectiveRunCount, 1);
    assert.equal(result.impactRunCount, 1);
    assert.equal(result.noOpRunCount, 0);
    assert.equal(result.latestRun.id, 'run-1');
    assert.equal(result.latestEffectiveRun.id, 'run-1');
    assert.equal(result.latestNoOpRun, null);
    assert.equal(result.workspaceCounts['ws-1'], 1);
    assert.equal(result.totalRemindedCount, 2);
    assert.equal(result.acknowledgedMaintenanceRequiredCountTotal, 1);
  });

  await t.test('multi-run aggregation splits effective vs no-op and tracks latest of each, plus retains most recent overall', () => {
    const effectiveRun = {
      id: 'effective',
      createdAt: DAY_1,
      workspaceId: 'ws-1',
      totalRemindedCount: 5,
    };
    const noOpRun = {
      id: 'no-op',
      createdAt: DAY_2,
      workspaceId: 'ws-1',
    };
    const result = summarizeMaintenanceRuns([effectiveRun, noOpRun]);
    assert.equal(result.runCount, 2);
    assert.equal(result.effectiveRunCount, 1);
    assert.equal(result.noOpRunCount, 1);
    assert.equal(result.latestEffectiveRun.id, 'effective');
    assert.equal(result.latestNoOpRun.id, 'no-op');
    assert.equal(result.latestRun.id, 'no-op'); // DAY_2 is later
    assert.equal(result.workspaceCounts['ws-1'], 2);
  });

  await t.test('recentRuns is capped at 5 and sorted by createdAt descending', () => {
    const items = Array.from({ length: 7 }, (_, index) => ({
      id: `run-${index}`,
      createdAt: `2024-01-0${index + 1}T00:00:00.000Z`,
      totalRemindedCount: 1,
    }));
    const result = summarizeMaintenanceRuns(items);
    assert.equal(result.recentRuns.length, 5);
    assert.equal(result.recentRuns[0].id, 'run-6');
    assert.equal(result.recentRuns[4].id, 'run-2');
  });
});

test('summarizeMaintenancePressure', async (t) => {
  await t.test('returns zeroed defaults for empty entries', () => {
    const result = summarizeMaintenancePressure([]);
    assert.equal(result.maintenanceRequiredCount, 0);
    assert.equal(result.nextDueAt, null);
    assert.equal(result.latestRequiredAction, null);
    assert.deepEqual(result.maintenanceDueWorkspaceIds, []);
  });

  await t.test('aggregates a single pressure entry', () => {
    const entry = {
      id: 'pressure-1',
      workspaceId: 'ws-1',
      createdAt: DAY_1,
      totalDueCandidateCount: 3,
      dueMonitoringCount: 1,
      dueOwnerHandoffCount: 1,
      dueProviderAttentionCount: 0,
      dueSpecialistFollowUpCount: 1,
      nextDueAt: DAY_2,
    };
    const result = summarizeMaintenancePressure([entry]);
    assert.equal(result.maintenanceRequiredCount, 1);
    assert.equal(result.currentDueCandidateCountTotal, 3);
    assert.equal(result.nextDueAt, DAY_2);
    assert.equal(result.latestRequiredAction.id, 'pressure-1');
    assert.deepEqual(result.maintenanceDueWorkspaceIds, ['ws-1']);
    assert.equal(result.dueWorkspaceCounts['ws-1'], 1);
  });

  await t.test('multi-entry aggregation sums totals, tracks earliest nextDueAt, and latest createdAt entry', () => {
    const entryA = {
      id: 'entry-a',
      workspaceId: 'ws-1',
      createdAt: DAY_1,
      totalDueCandidateCount: 2,
      nextDueAt: DAY_8,
    };
    const entryB = {
      id: 'entry-b',
      workspaceId: 'ws-2',
      createdAt: DAY_2,
      totalDueCandidateCount: 4,
      nextDueAt: DAY_1_LATER,
    };
    const result = summarizeMaintenancePressure([entryA, entryB]);
    assert.equal(result.maintenanceRequiredCount, 2);
    assert.equal(result.currentDueCandidateCountTotal, 6);
    // earliest nextDueAt should win
    assert.equal(result.nextDueAt, DAY_1_LATER);
    assert.equal(result.latestRequiredAction.id, 'entry-b');
    assert.deepEqual(result.maintenanceDueWorkspaceIds.sort(), ['ws-1', 'ws-2']);
  });
});

test('buildMaintenanceDailyBuckets', async (t) => {
  await t.test('returns an empty array for empty input', () => {
    assert.deepEqual(buildMaintenanceDailyBuckets([]), []);
  });

  await t.test('skips items without createdAt', () => {
    assert.deepEqual(buildMaintenanceDailyBuckets([{ id: 'no-date' }]), []);
  });

  await t.test('groups a single run into one daily bucket', () => {
    const buckets = buildMaintenanceDailyBuckets([
      { id: 'run-1', createdAt: DAY_1, totalRemindedCount: 3, missionId: 'mission-1' },
    ]);
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0].date, '2024-01-01');
    assert.equal(buckets[0].runCount, 1);
    assert.equal(buckets[0].effectiveRunCount, 1);
    assert.equal(buckets[0].noOpRunCount, 0);
    assert.equal(buckets[0].impactRunCount, 1);
    assert.equal(buckets[0].totalRemindedCount, 3);
    assert.deepEqual(buckets[0].affectedMissionIds, ['mission-1']);
  });

  await t.test('multi-bucket aggregation groups by date and sorts descending', () => {
    const buckets = buildMaintenanceDailyBuckets([
      { id: 'run-1', createdAt: DAY_1, totalRemindedCount: 1 },
      { id: 'run-2', createdAt: DAY_1_LATER }, // no-op, same day as run-1
      { id: 'run-3', createdAt: DAY_8, totalRemindedCount: 2 },
    ]);
    assert.equal(buckets.length, 2);
    assert.equal(buckets[0].date, '2024-01-08');
    assert.equal(buckets[1].date, '2024-01-01');
    assert.equal(buckets[1].runCount, 2);
    assert.equal(buckets[1].effectiveRunCount, 1);
    assert.equal(buckets[1].noOpRunCount, 1);
  });
});

test('buildMaintenanceWeeklyBuckets', async (t) => {
  await t.test('returns an empty array for empty input', () => {
    assert.deepEqual(buildMaintenanceWeeklyBuckets([]), []);
  });

  await t.test('single-bucket: groups runs within the same ISO week', () => {
    const buckets = buildMaintenanceWeeklyBuckets([
      { id: 'run-1', createdAt: DAY_1, totalRemindedCount: 1 },
      { id: 'run-2', createdAt: DAY_2, totalRemindedCount: 2 },
    ]);
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0].weekStartDate, '2024-01-01');
    assert.equal(buckets[0].weekEndDate, '2024-01-07');
    assert.equal(buckets[0].runCount, 2);
    assert.equal(buckets[0].totalRemindedCount, 3);
  });

  await t.test('multi-bucket aggregation across two distinct weeks, sorted descending by weekStartDate', () => {
    const buckets = buildMaintenanceWeeklyBuckets([
      { id: 'run-1', createdAt: DAY_1, totalRemindedCount: 1 },
      { id: 'run-2', createdAt: DAY_8, totalRemindedCount: 5 },
    ]);
    assert.equal(buckets.length, 2);
    assert.equal(buckets[0].weekStartDate, '2024-01-08');
    assert.equal(buckets[1].weekStartDate, '2024-01-01');
  });
});

test('buildMaintenanceMonthlyBuckets', async (t) => {
  await t.test('returns an empty array for empty input', () => {
    assert.deepEqual(buildMaintenanceMonthlyBuckets([]), []);
  });

  await t.test('single-bucket: groups runs within the same UTC month', () => {
    const buckets = buildMaintenanceMonthlyBuckets([
      { id: 'run-1', createdAt: DAY_1, totalRemindedCount: 1 },
      { id: 'run-2', createdAt: DAY_8, totalRemindedCount: 2 },
    ]);
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0].monthKey, '2024-01');
    assert.equal(buckets[0].monthStartDate, '2024-01-01');
    assert.equal(buckets[0].runCount, 2);
    assert.equal(buckets[0].totalRemindedCount, 3);
  });

  await t.test('multi-bucket aggregation across two distinct months, sorted descending by monthStartDate', () => {
    const buckets = buildMaintenanceMonthlyBuckets([
      { id: 'run-1', createdAt: DAY_1, totalRemindedCount: 1 },
      { id: 'run-2', createdAt: FEB_1, totalRemindedCount: 5 },
    ]);
    assert.equal(buckets.length, 2);
    assert.equal(buckets[0].monthKey, '2024-02');
    assert.equal(buckets[1].monthKey, '2024-01');
  });
});

test('buildMaintenanceLatestBucketDelta', async (t) => {
  await t.test('returns null when there are no buckets', () => {
    assert.equal(buildMaintenanceLatestBucketDelta([]), null);
  });

  await t.test('computes deltas against the previous bucket when both exist', () => {
    const current = { date: '2024-01-08', runCount: 5, effectiveRunCount: 3, impactRunCount: 2, noOpRunCount: 2, affectedMissionCount: 4, totalRemindedCount: 10 };
    const previous = { date: '2024-01-01', runCount: 2, effectiveRunCount: 1, impactRunCount: 1, noOpRunCount: 1, affectedMissionCount: 1, totalRemindedCount: 3 };
    const delta = buildMaintenanceLatestBucketDelta([current, previous]);
    assert.equal(delta.currentDate, '2024-01-08');
    assert.equal(delta.previousDate, '2024-01-01');
    assert.equal(delta.runCountDelta, 3);
    assert.equal(delta.effectiveRunCountDelta, 2);
    assert.equal(delta.impactRunCountDelta, 1);
    assert.equal(delta.noOpRunCountDelta, 1);
    assert.equal(delta.affectedMissionCountDelta, 3);
    assert.equal(delta.totalRemindedCountDelta, 7);
  });

  await t.test('treats a missing previous bucket as all-zero baseline', () => {
    const current = { date: '2024-01-08', runCount: 4, totalRemindedCount: 6 };
    const delta = buildMaintenanceLatestBucketDelta([current]);
    assert.equal(delta.previousDate, null);
    assert.equal(delta.runCountDelta, 4);
    assert.equal(delta.totalRemindedCountDelta, 6);
  });
});

test('buildMaintenanceLatestWeeklyBucketDelta', async (t) => {
  await t.test('returns null when there are no buckets', () => {
    assert.equal(buildMaintenanceLatestWeeklyBucketDelta([]), null);
  });

  await t.test('computes deltas against the previous week bucket when both exist', () => {
    const current = { weekStartDate: '2024-01-08', weekEndDate: '2024-01-14', runCount: 6, totalRemindedCount: 12 };
    const previous = { weekStartDate: '2024-01-01', weekEndDate: '2024-01-07', runCount: 2, totalRemindedCount: 4 };
    const delta = buildMaintenanceLatestWeeklyBucketDelta([current, previous]);
    assert.equal(delta.currentWeekStartDate, '2024-01-08');
    assert.equal(delta.previousWeekStartDate, '2024-01-01');
    assert.equal(delta.runCountDelta, 4);
    assert.equal(delta.totalRemindedCountDelta, 8);
  });

  await t.test('treats a missing previous bucket as all-zero baseline', () => {
    const current = { weekStartDate: '2024-01-08', weekEndDate: '2024-01-14', runCount: 3, totalRemindedCount: 9 };
    const delta = buildMaintenanceLatestWeeklyBucketDelta([current]);
    assert.equal(delta.previousWeekStartDate, null);
    assert.equal(delta.runCountDelta, 3);
    assert.equal(delta.totalRemindedCountDelta, 9);
  });
});

test('buildMaintenanceLatestMonthlyBucketDelta', async (t) => {
  await t.test('returns null when there are no buckets', () => {
    assert.equal(buildMaintenanceLatestMonthlyBucketDelta([]), null);
  });

  await t.test('computes deltas against the previous month bucket when both exist', () => {
    const current = { monthKey: '2024-02', monthStartDate: '2024-02-01', monthEndDate: '2024-02-29', runCount: 8, totalRemindedCount: 20 };
    const previous = { monthKey: '2024-01', monthStartDate: '2024-01-01', monthEndDate: '2024-01-31', runCount: 3, totalRemindedCount: 5 };
    const delta = buildMaintenanceLatestMonthlyBucketDelta([current, previous]);
    assert.equal(delta.currentMonthKey, '2024-02');
    assert.equal(delta.previousMonthKey, '2024-01');
    assert.equal(delta.runCountDelta, 5);
    assert.equal(delta.totalRemindedCountDelta, 15);
  });

  await t.test('treats a missing previous bucket as all-zero baseline', () => {
    const current = { monthKey: '2024-02', monthStartDate: '2024-02-01', monthEndDate: '2024-02-29', runCount: 1, totalRemindedCount: 2 };
    const delta = buildMaintenanceLatestMonthlyBucketDelta([current]);
    assert.equal(delta.previousMonthKey, null);
    assert.equal(delta.runCountDelta, 1);
    assert.equal(delta.totalRemindedCountDelta, 2);
  });
});
