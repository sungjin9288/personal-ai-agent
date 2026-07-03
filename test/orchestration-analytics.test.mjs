import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ORCHESTRATION_PROFILE_ADOPTION_DRIFT_REASON_CODES,
  ORCHESTRATION_PROFILE_HEALTH_DRIFT_REASON_CODES,
  ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES,
  ORCHESTRATION_PROFILE_WORKSPACE_ADOPTION_DRIFT_REASON_CODES,
  buildOrchestrationProfileUsageLatestMonthlyBucketDelta,
  buildOrchestrationProfileUsageMonthlyBuckets,
  getPreviousUtcMonthStartDate,
  summarizeOrchestrationProfileAdoptionDrift,
  summarizeOrchestrationProfileHealthDrift,
  summarizeOrchestrationProfileOverviewItems,
  summarizeOrchestrationProfileUsageEntries,
  summarizeOrchestrationProfileUsageTrend,
  summarizeOrchestrationProfileWorkspaceUsageTrend,
  summarizeOrchestrationWorkspaceProfileFootprintTrend,
  summarizeWorkspaceAdoptionDrift,
  summarizeWorkspaceAdoptionDriftEntries,
  summarizeWorkspaceHealthDriftEntries,
  summarizeWorkspaceUsageTrendEntries,
} from '../src/core/orchestration-analytics.mjs';

// Fixed, deterministic UTC timestamps used across tests.
const JAN_1 = '2024-01-01T09:00:00.000Z';
const JAN_15 = '2024-01-15T09:00:00.000Z';
const FEB_1 = '2024-02-01T09:00:00.000Z';
const FEB_15 = '2024-02-15T09:00:00.000Z';

test('module exports the exact reason-code / status constant lists', () => {
  assert.deepEqual(ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES, ['declining', 'growing', 'steady', 'unused']);
  assert.deepEqual(ORCHESTRATION_PROFILE_HEALTH_DRIFT_REASON_CODES, [
    'quality-gate-blocked',
    'specialist-follow-up-needs-reminder',
    'specialist-follow-up-open',
    'specialist-follow-up-overdue',
  ]);
  assert.deepEqual(ORCHESTRATION_PROFILE_ADOPTION_DRIFT_REASON_CODES, [
    'mission-volume-declining',
    'mission-volume-growing',
    'unused-profile',
    'workspace-footprint-declining',
    'workspace-footprint-growing',
  ]);
  assert.deepEqual(ORCHESTRATION_PROFILE_WORKSPACE_ADOPTION_DRIFT_REASON_CODES, [
    'unused-workspace',
    'workspace-mission-volume-declining',
    'workspace-mission-volume-growing',
    'workspace-profile-footprint-declining',
    'workspace-profile-footprint-growing',
  ]);
});

test('summarizeOrchestrationProfileHealthDrift', async (t) => {
  await t.test('returns stable status with no reason codes for all-zero defaults', () => {
    const result = summarizeOrchestrationProfileHealthDrift();
    assert.equal(result.status, 'stable');
    assert.deepEqual(result.reasonCodes, []);
    assert.equal(result.qualityGateBlockedGroupCount, 0);
  });

  await t.test('escalates to follow-up-required when quality gate blocked or overdue', () => {
    const blocked = summarizeOrchestrationProfileHealthDrift({ qualityGateBlockedGroupCount: 2 });
    assert.equal(blocked.status, 'follow-up-required');
    assert.ok(blocked.reasonCodes.includes('quality-gate-blocked'));

    const overdue = summarizeOrchestrationProfileHealthDrift({ specialistFollowUpOverdueCount: 1 });
    assert.equal(overdue.status, 'follow-up-required');
    assert.ok(overdue.reasonCodes.includes('specialist-follow-up-overdue'));
  });

  await t.test('degrades to watch when follow-up required or needs-reminder but not overdue/blocked', () => {
    const required = summarizeOrchestrationProfileHealthDrift({ specialistFollowUpRequiredCount: 3 });
    assert.equal(required.status, 'watch');
    assert.ok(required.reasonCodes.includes('specialist-follow-up-open'));

    const needsReminder = summarizeOrchestrationProfileHealthDrift({ specialistFollowUpNeedsReminderCount: 1 });
    assert.equal(needsReminder.status, 'watch');
  });
});

test('summarizeOrchestrationProfileAdoptionDrift', async (t) => {
  await t.test('defaults to unused with unused-profile reason when no trends given', () => {
    const result = summarizeOrchestrationProfileAdoptionDrift();
    assert.equal(result.status, 'unused');
    assert.deepEqual(result.reasonCodes, ['unused-profile']);
  });

  await t.test('declining mission-volume trend produces declining status', () => {
    const result = summarizeOrchestrationProfileAdoptionDrift({
      usageTrend: { status: 'declining' },
      workspaceUsageTrend: { status: 'steady' },
    });
    assert.equal(result.status, 'declining');
    assert.ok(result.reasonCodes.includes('mission-volume-declining'));
  });

  await t.test('growing workspace footprint trend produces growing status', () => {
    const result = summarizeOrchestrationProfileAdoptionDrift({
      usageTrend: { status: 'steady' },
      workspaceUsageTrend: { status: 'growing' },
    });
    assert.equal(result.status, 'growing');
    assert.ok(result.reasonCodes.includes('workspace-footprint-growing'));
  });
});

test('summarizeWorkspaceAdoptionDrift', async (t) => {
  await t.test('defaults to unused with unused-workspace reason', () => {
    const result = summarizeWorkspaceAdoptionDrift();
    assert.equal(result.status, 'unused');
    assert.deepEqual(result.reasonCodes, ['unused-workspace']);
  });

  await t.test('declining mission trend yields declining status', () => {
    const result = summarizeWorkspaceAdoptionDrift({
      missionTrend: { status: 'declining' },
      profileFootprintTrend: { status: 'steady' },
    });
    assert.equal(result.status, 'declining');
    assert.ok(result.reasonCodes.includes('workspace-mission-volume-declining'));
  });
});

test('getPreviousUtcMonthStartDate', async (t) => {
  await t.test('returns null for an unparsable date', () => {
    assert.equal(getPreviousUtcMonthStartDate('not-a-date'), null);
    assert.equal(getPreviousUtcMonthStartDate(null), null);
  });

  await t.test('rolls back one month within the same year', () => {
    assert.equal(getPreviousUtcMonthStartDate('2024-02-01'), '2024-01-01');
  });

  await t.test('rolls back across a year boundary', () => {
    assert.equal(getPreviousUtcMonthStartDate('2024-01-01'), '2023-12-01');
  });
});

test('buildOrchestrationProfileUsageMonthlyBuckets', async (t) => {
  await t.test('returns an empty array for empty input', () => {
    assert.deepEqual(buildOrchestrationProfileUsageMonthlyBuckets([]), []);
  });

  await t.test('skips entries without a resolvable latestAt', () => {
    assert.deepEqual(buildOrchestrationProfileUsageMonthlyBuckets([{ mission: {} }]), []);
  });

  await t.test('groups a single entry into one monthly bucket', () => {
    const buckets = buildOrchestrationProfileUsageMonthlyBuckets([
      {
        latestAt: JAN_1,
        mission: { id: 'mission-1', mode: 'engineering' },
        profile: { id: 'profile-1' },
        workspace: { id: 'ws-1' },
      },
    ]);
    assert.equal(buckets.length, 1);
    assert.equal(buckets[0].monthKey, '2024-01');
    assert.equal(buckets[0].missionCount, 1);
    assert.deepEqual(buckets[0].missionIds, ['mission-1']);
    assert.equal(buckets[0].modeCounts.engineering, 1);
    assert.equal(buckets[0].usedProfileCount, 1);
    assert.equal(buckets[0].usedWorkspaceCount, 1);
  });

  await t.test('multi-entry aggregation across two months, sorted descending by monthStartDate', () => {
    const buckets = buildOrchestrationProfileUsageMonthlyBuckets([
      {
        latestAt: JAN_1,
        mission: { id: 'mission-1', mode: 'engineering' },
        profile: { id: 'profile-1' },
        workspace: { id: 'ws-1' },
      },
      {
        latestAt: JAN_15,
        mission: { id: 'mission-2', mode: 'knowledge' },
        profile: { id: 'profile-1' },
        workspace: { id: 'ws-2' },
      },
      {
        latestAt: FEB_1,
        mission: { id: 'mission-3', mode: 'engineering' },
        profile: { id: 'profile-2' },
        workspace: { id: 'ws-1' },
      },
    ]);
    assert.equal(buckets.length, 2);
    assert.equal(buckets[0].monthKey, '2024-02');
    assert.equal(buckets[1].monthKey, '2024-01');
    assert.equal(buckets[1].missionCount, 2);
    assert.equal(buckets[1].profileCounts['profile-1'], 2);
    assert.equal(buckets[1].workspaceCounts['ws-1'], 1);
    assert.equal(buckets[1].workspaceCounts['ws-2'], 1);
  });
});

test('buildOrchestrationProfileUsageLatestMonthlyBucketDelta', async (t) => {
  await t.test('returns null when there are no buckets', () => {
    assert.equal(buildOrchestrationProfileUsageLatestMonthlyBucketDelta([]), null);
  });

  await t.test('treats a missing previous bucket as an all-zero baseline', () => {
    const current = { missionCount: 3, monthStartDate: '2024-02-01', usedProfileCount: 2, usedWorkspaceCount: 1 };
    const delta = buildOrchestrationProfileUsageLatestMonthlyBucketDelta([current]);
    assert.equal(delta.missionCountDelta, 3);
    assert.equal(delta.previousMonthStartDate, null);
    assert.equal(delta.usedProfileCountDelta, 2);
    assert.equal(delta.usedWorkspaceCountDelta, 1);
  });

  await t.test('computes deltas against the previous bucket when both exist', () => {
    const current = {
      missionCount: 5,
      modeCounts: { engineering: 3, knowledge: 2 },
      monthStartDate: '2024-02-01',
      profileCounts: { 'profile-1': 4 },
      usedProfileCount: 2,
      usedWorkspaceCount: 3,
      workspaceCounts: { 'ws-1': 5 },
    };
    const previous = {
      missionCount: 2,
      modeCounts: { engineering: 1, knowledge: 1 },
      monthStartDate: '2024-01-01',
      profileCounts: { 'profile-1': 1 },
      usedProfileCount: 1,
      usedWorkspaceCount: 1,
      workspaceCounts: { 'ws-1': 2 },
    };
    const delta = buildOrchestrationProfileUsageLatestMonthlyBucketDelta([current, previous]);
    assert.equal(delta.currentMonthStartDate, '2024-02-01');
    assert.equal(delta.previousMonthStartDate, '2024-01-01');
    assert.equal(delta.missionCountDelta, 3);
    assert.equal(delta.usedProfileCountDelta, 1);
    assert.equal(delta.usedWorkspaceCountDelta, 2);
    assert.deepEqual(delta.modeCountsDelta, { engineering: 2, knowledge: 1 });
    assert.deepEqual(delta.profileCountsDelta, { 'profile-1': 3 });
    assert.deepEqual(delta.workspaceCountsDelta, { 'ws-1': 3 });
  });
});

test('summarizeOrchestrationProfileUsageEntries', async (t) => {
  await t.test('returns nulled-out defaults for empty entries', () => {
    const result = summarizeOrchestrationProfileUsageEntries([]);
    assert.equal(result.usageMonthlyBucketCount, 0);
    assert.deepEqual(result.usageMonthlyBuckets, []);
    assert.equal(result.usageLatestMonthlyBucketDelta, null);
    assert.equal(result.usageLatestMonthlyBucketStartDate, null);
    assert.equal(result.usageOldestMonthlyBucketStartDate, null);
  });

  await t.test('aggregates multi-month entries into buckets with delta and boundary dates', () => {
    const result = summarizeOrchestrationProfileUsageEntries([
      { latestAt: JAN_1, mission: { id: 'mission-1', mode: 'engineering' }, profile: { id: 'p1' }, workspace: { id: 'ws-1' } },
      { latestAt: FEB_1, mission: { id: 'mission-2', mode: 'engineering' }, profile: { id: 'p1' }, workspace: { id: 'ws-1' } },
      { latestAt: FEB_15, mission: { id: 'mission-3', mode: 'engineering' }, profile: { id: 'p1' }, workspace: { id: 'ws-1' } },
    ]);
    assert.equal(result.usageMonthlyBucketCount, 2);
    assert.equal(result.usageLatestMonthlyBucketStartDate, '2024-02-01');
    assert.equal(result.usageOldestMonthlyBucketStartDate, '2024-01-01');
    assert.equal(result.usageLatestMonthlyBucketDelta.missionCountDelta, 1);
  });
});

test('summarizeOrchestrationProfileUsageTrend', async (t) => {
  await t.test('returns unused status with no monthly counts when not used', () => {
    const result = summarizeOrchestrationProfileUsageTrend({ currentMonthStartDate: '2024-02-01', used: false });
    assert.equal(result.status, 'unused');
    assert.equal(result.currentMonthMissionCount, 0);
    assert.equal(result.previousMonthStartDate, '2024-01-01');
  });

  await t.test('growing status when current month mission count exceeds previous', () => {
    const monthlyBuckets = [
      { missionCount: 5, monthStartDate: '2024-02-01' },
      { missionCount: 2, monthStartDate: '2024-01-01' },
    ];
    const result = summarizeOrchestrationProfileUsageTrend({
      currentMonthStartDate: '2024-02-01',
      monthlyBuckets,
      used: true,
    });
    assert.equal(result.status, 'growing');
    assert.equal(result.missionCountDelta, 3);
  });

  await t.test('declining status when current month mission count is below previous', () => {
    const monthlyBuckets = [
      { missionCount: 1, monthStartDate: '2024-02-01' },
      { missionCount: 4, monthStartDate: '2024-01-01' },
    ];
    const result = summarizeOrchestrationProfileUsageTrend({
      currentMonthStartDate: '2024-02-01',
      monthlyBuckets,
      used: true,
    });
    assert.equal(result.status, 'declining');
    assert.equal(result.missionCountDelta, -3);
  });

  await t.test('steady status when current equals previous', () => {
    const monthlyBuckets = [
      { missionCount: 3, monthStartDate: '2024-02-01' },
      { missionCount: 3, monthStartDate: '2024-01-01' },
    ];
    const result = summarizeOrchestrationProfileUsageTrend({
      currentMonthStartDate: '2024-02-01',
      monthlyBuckets,
      used: true,
    });
    assert.equal(result.status, 'steady');
    assert.equal(result.missionCountDelta, 0);
  });
});

test('summarizeOrchestrationProfileWorkspaceUsageTrend', async (t) => {
  await t.test('returns unused defaults when not used', () => {
    const result = summarizeOrchestrationProfileWorkspaceUsageTrend({ used: false });
    assert.equal(result.status, 'unused');
    assert.equal(result.currentMonthWorkspaceCount, 0);
  });

  await t.test('growing status when current month workspace count exceeds previous', () => {
    const monthlyBuckets = [
      { monthStartDate: '2024-02-01', usedWorkspaceCount: 4 },
      { monthStartDate: '2024-01-01', usedWorkspaceCount: 1 },
    ];
    const result = summarizeOrchestrationProfileWorkspaceUsageTrend({
      currentMonthStartDate: '2024-02-01',
      monthlyBuckets,
      used: true,
    });
    assert.equal(result.status, 'growing');
    assert.equal(result.workspaceCountDelta, 3);
  });
});

test('summarizeOrchestrationWorkspaceProfileFootprintTrend', async (t) => {
  await t.test('returns unused defaults when not used', () => {
    const result = summarizeOrchestrationWorkspaceProfileFootprintTrend({ used: false });
    assert.equal(result.status, 'unused');
    assert.equal(result.currentMonthProfileCount, 0);
  });

  await t.test('declining status when current month profile count drops below previous', () => {
    const monthlyBuckets = [
      { monthStartDate: '2024-02-01', usedProfileCount: 1 },
      { monthStartDate: '2024-01-01', usedProfileCount: 3 },
    ];
    const result = summarizeOrchestrationWorkspaceProfileFootprintTrend({
      currentMonthStartDate: '2024-02-01',
      monthlyBuckets,
      used: true,
    });
    assert.equal(result.status, 'declining');
    assert.equal(result.profileCountDelta, -2);
  });
});

test('summarizeWorkspaceHealthDriftEntries', async (t) => {
  await t.test('returns stable defaults for empty entries', () => {
    const result = summarizeWorkspaceHealthDriftEntries([]);
    assert.equal(result.status, 'stable');
    assert.equal(result.workspaceCount, 0);
    assert.equal(result.latestWorkspace, null);
  });

  await t.test('single follow-up-required entry drives overall status and latest pointer', () => {
    const result = summarizeWorkspaceHealthDriftEntries([
      { id: 'ws-1', latestAt: JAN_1, name: 'Workspace 1', reasonCodes: ['quality-gate-blocked'], status: 'follow-up-required' },
    ]);
    assert.equal(result.status, 'follow-up-required');
    assert.equal(result.latestFollowUpRequiredWorkspace.id, 'ws-1');
    assert.equal(result.reasonCodeCounts['quality-gate-blocked'], 1);
  });

  await t.test('multi-entry: worst status wins (follow-up-required over watch over stable), latest tracked per bucket', () => {
    const result = summarizeWorkspaceHealthDriftEntries([
      { id: 'ws-stable', latestAt: JAN_1, status: 'stable', reasonCodes: [] },
      { id: 'ws-watch', latestAt: JAN_15, status: 'watch', reasonCodes: ['specialist-follow-up-open'] },
      { id: 'ws-follow-up', latestAt: FEB_1, status: 'follow-up-required', reasonCodes: ['specialist-follow-up-overdue'] },
    ]);
    assert.equal(result.status, 'follow-up-required');
    assert.equal(result.workspaceCount, 3);
    assert.equal(result.latestWorkspace.id, 'ws-follow-up');
    assert.equal(result.latestStableWorkspace.id, 'ws-stable');
    assert.equal(result.latestWatchWorkspace.id, 'ws-watch');
    assert.deepEqual(result.workspaceIdsByStatus['follow-up-required'], ['ws-follow-up']);
  });
});

test('summarizeWorkspaceAdoptionDriftEntries', async (t) => {
  await t.test('returns unused defaults for empty entries', () => {
    const result = summarizeWorkspaceAdoptionDriftEntries([]);
    assert.equal(result.status, 'unused');
    assert.equal(result.workspaceCount, 0);
    assert.equal(result.latestWorkspace, null);
  });

  await t.test('single growing entry produces growing status and populates latestGrowingWorkspace', () => {
    const result = summarizeWorkspaceAdoptionDriftEntries([
      {
        adoptionDrift: { status: 'growing' },
        id: 'ws-1',
        latestAt: JAN_1,
        missionTrend: { status: 'growing' },
        name: 'Workspace 1',
        profileFootprintTrend: { status: 'steady' },
        profileId: 'profile-1',
        reasonCodes: ['workspace-mission-volume-growing'],
      },
    ]);
    assert.equal(result.status, 'growing');
    assert.equal(result.latestGrowingWorkspace.id, 'ws-1');
    assert.equal(result.latestProfile.id, 'profile-1');
  });

  await t.test('multi-entry aggregation: declining beats growing/steady, latest-per-bucket tracked independently', () => {
    const result = summarizeWorkspaceAdoptionDriftEntries([
      { adoptionDrift: { status: 'growing' }, id: 'ws-growing', latestAt: JAN_1, missionTrend: { status: 'growing' }, profileFootprintTrend: { status: 'unused' } },
      { adoptionDrift: { status: 'declining' }, id: 'ws-declining', latestAt: JAN_15, missionTrend: { status: 'declining' }, profileFootprintTrend: { status: 'unused' } },
    ]);
    assert.equal(result.status, 'declining');
    assert.equal(result.latestDecliningWorkspace.id, 'ws-declining');
    assert.equal(result.latestGrowingWorkspace.id, 'ws-growing');
    assert.equal(result.workspaceCount, 2);
    assert.deepEqual(result.workspaceIdsByStatus.declining, ['ws-declining']);
    assert.deepEqual(result.workspaceIdsByStatus.growing, ['ws-growing']);
  });
});

test('summarizeWorkspaceUsageTrendEntries', async (t) => {
  await t.test('returns zeroed defaults for empty entries', () => {
    const result = summarizeWorkspaceUsageTrendEntries([]);
    assert.equal(result.workspaceCount, 0);
    assert.equal(result.latestWorkspace, null);
    assert.deepEqual(result.statusCounts, { declining: 0, growing: 0, steady: 0, unused: 0 });
  });

  await t.test('single declining entry tracked as latestDecliningWorkspace', () => {
    const result = summarizeWorkspaceUsageTrendEntries([
      { id: 'ws-1', latestAt: JAN_1, name: 'Workspace 1', status: 'declining' },
    ]);
    assert.equal(result.statusCounts.declining, 1);
    assert.equal(result.latestDecliningWorkspace.id, 'ws-1');
    assert.equal(result.latestWorkspace.id, 'ws-1');
  });

  await t.test('multi-entry: latest overall tracked by latestAt regardless of status, plus per-status latest', () => {
    const result = summarizeWorkspaceUsageTrendEntries([
      { id: 'ws-growing', latestAt: JAN_1, status: 'growing' },
      { id: 'ws-declining', latestAt: FEB_1, status: 'declining' },
    ]);
    assert.equal(result.latestWorkspace.id, 'ws-declining');
    assert.equal(result.latestGrowingWorkspace.id, 'ws-growing');
    assert.equal(result.latestDecliningWorkspace.id, 'ws-declining');
    assert.equal(result.workspaceCount, 2);
  });
});

test('summarizeOrchestrationProfileOverviewItems', async (t) => {
  await t.test('returns zeroed defaults for an empty items array', () => {
    const result = summarizeOrchestrationProfileOverviewItems([]);
    assert.equal(result.total, 0);
    assert.equal(result.usedCount, 0);
    assert.equal(result.unusedCount, 0);
    assert.equal(result.latestUsedProfile, null);
    assert.equal(result.latestHealthDriftProfile, null);
    assert.equal(result.latestAdoptionDriftProfile, null);
    assert.deepEqual(result.touchedProfileIds, []);
    assert.deepEqual(result.touchedWorkspaceIds, []);
  });

  await t.test('aggregates a single used, stable, steady profile item', () => {
    const item = {
      displayName: 'Profile One',
      id: 'profile-1',
      latestUsedAt: JAN_1,
      mode: 'engineering',
      missionCount: 3,
      parallelGroupCount: 2,
      qualityGate: 'manager-merge-ready',
      retryPolicy: 'default',
      touchedWorkspaceIds: ['ws-1'],
      used: true,
      workspaceMissionCounts: { 'ws-1': 3 },
    };
    const result = summarizeOrchestrationProfileOverviewItems([item]);
    assert.equal(result.total, 1);
    assert.equal(result.usedCount, 1);
    assert.equal(result.unusedCount, 0);
    assert.equal(result.missionCountTotal, 3);
    assert.equal(result.parallelGroupCountTotal, 2);
    assert.equal(result.modeCounts.engineering, 1);
    assert.equal(result.qualityGateCounts['manager-merge-ready'], 1);
    assert.equal(result.latestUsedProfile.id, 'profile-1');
    assert.equal(result.latestUsedWorkspace.id, 'ws-1');
    assert.equal(result.healthDriftStatusCounts.stable, 1);
    assert.equal(result.adoptionDriftStatusCounts.unused, 1);
    assert.deepEqual(result.touchedProfileIds, ['profile-1']);
    assert.deepEqual(result.touchedWorkspaceIds, ['ws-1']);
    assert.equal(result.usedWorkspaceCount, 1);
  });

  await t.test('multi-item aggregation surfaces the latest follow-up-required drift profile/workspace', () => {
    const stableItem = {
      displayName: 'Stable Profile',
      healthDrift: { reasonCodes: [], status: 'stable' },
      id: 'profile-stable',
      latestMission: { workspaceId: 'ws-1', workspaceName: 'Workspace 1' },
      latestUsedAt: JAN_1,
      mode: 'engineering',
      touchedWorkspaceIds: ['ws-1'],
      used: true,
    };
    const followUpItem = {
      displayName: 'Follow Up Profile',
      healthDrift: {
        reasonCodes: ['specialist-follow-up-overdue'],
        status: 'follow-up-required',
      },
      id: 'profile-follow-up',
      latestMission: { workspaceId: 'ws-2', workspaceName: 'Workspace 2' },
      latestUsedAt: FEB_1,
      mode: 'knowledge',
      qualityGateBlockedGroupCount: 1,
      specialistFollowUpLatestReminderAt: FEB_1,
      specialistFollowUpOverdueCount: 1,
      touchedWorkspaceIds: ['ws-2'],
      used: true,
    };
    const result = summarizeOrchestrationProfileOverviewItems([stableItem, followUpItem]);
    assert.equal(result.total, 2);
    assert.equal(result.usedCount, 2);
    assert.equal(result.healthDriftProfileCount, 1);
    assert.equal(result.healthDriftStatusCounts['follow-up-required'], 1);
    assert.equal(result.healthDriftStatusCounts.stable, 1);
    assert.equal(result.latestHealthDriftProfile.id, 'profile-follow-up');
    assert.equal(result.latestHealthDriftFollowUpRequiredProfile.id, 'profile-follow-up');
    assert.equal(result.latestHealthDriftStableProfile.id, 'profile-stable');
    assert.equal(result.latestHealthDriftWorkspace.id, 'ws-2');
    assert.equal(result.workspaceHealthDriftProfileCounts['ws-2'], 1);
    assert.equal(result.specialistFollowUpLatestReminderAt, FEB_1);
    assert.deepEqual(result.touchedWorkspaceIds, ['ws-1', 'ws-2']);
  });
});
