import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGlobalOperatorTimelineReadModel,
  buildMissionTimelineReadModel,
  buildWorkspaceTimelineReadModel,
} from '../src/core/timeline-read-model.mjs';

const timelineEvents = [
  { at: '2026-03-02T00:00:00.000Z', kind: 'second', workspaceId: 'workspace-1' },
  { at: '2026-03-01T00:00:00.000Z', kind: 'first', workspaceId: 'workspace-1' },
];

const parallelActivity = {
  latestFollowUp: { actionId: 'follow-up-1' },
  latestOrchestrationProfile: { id: 'profile-1' },
  latestQualityGateViolation: { detail: 'verification required' },
  orchestrationProfileCounts: { balanced: 1 },
  qualityGateBlockedCount: 1,
  qualityGateStatusCounts: { blocked: 1 },
  specialistFollowUpNeedsReminderCount: 1,
  specialistFollowUpOverdueCount: 1,
  specialistFollowUpReminderCountTotal: 2,
  specialistFollowUpRequiredCount: 1,
  specialistLatestReminderAt: '2026-03-02T00:00:00.000Z',
  specialistNextReminderAt: '2026-03-03T00:00:00.000Z',
  specialistOrchestrationProfileCount: 1,
  touchedOrchestrationProfileIds: ['profile-1'],
};

const providerHealthDrift = {
  attentionNeedsReminderCount: 1,
  attentionOverdueCount: 1,
  attentionRequiredCount: 2,
  reasonCodes: ['attention-overdue'],
  recentExecutionCountDelta: 2,
  recentExecutionCurrentMonthStartDate: '2026-03-01',
  recentExecutionEstimatedCostUsdTotalDelta: 0,
  recentExecutionFailedCountDelta: 1,
  recentExecutionMonthlyBucketCount: 2,
  recentExecutionOldestMonthStartDate: '2026-02-01',
  recentExecutionPreviousMonthStartDate: '2026-02-01',
  status: 'attention-required',
};

test('buildMissionTimelineReadModel sorts collected events without changing the source array', () => {
  const source = [...timelineEvents];
  const mission = { id: 'mission-1' };
  const summary = { sessionCount: 2 };
  const result = buildMissionTimelineReadModel({
    mission,
    providerHealthDrift,
    providerRecentWindow: { eventCount: 2 },
    summary,
    timelineEvents: source,
  });

  assert.deepEqual(result.timeline.map((event) => event.kind), ['first', 'second']);
  assert.deepEqual(source.map((event) => event.kind), ['second', 'first']);
  assert.equal(result.mission, mission);
  assert.equal(result.summary, summary);
});

test('buildWorkspaceTimelineReadModel assembles workspace analytics from precomputed inputs', () => {
  const maintenanceDelta = { remindedCount: 3 };
  const providerRecentWindow = {
    eventCount: 4,
    eventFamilyCounts: { attention: 1, execution: 2, fallback: 1, probe: 0 },
    executionCount: 2,
    executionEstimatedCostUsdTotal: 0,
    executionLatestMonthlyBucketDelta: { total: 1 },
    executionLatestMonthlyBucketStartDate: '2026-03-01',
    executionMonthlyBucketCount: 2,
    executionOldestMonthlyBucketStartDate: '2026-02-01',
    latestEvent: { id: 'event-1' },
    latestExecution: { id: 'execution-1' },
    touchedProviderCount: 1,
    touchedProviderIds: ['stub'],
  };
  const result = buildWorkspaceTimelineReadModel({
    maintenanceLatestMonthlyBucketDelta: maintenanceDelta,
    maintenanceMonthlyBuckets: [
      { monthStartDate: '2026-03-01' },
      { monthStartDate: '2026-02-01' },
    ],
    parallelActivity,
    providerHealthDrift,
    providerRecentWindow,
    providerSince: '2026-02-01T00:00:00.000Z',
    timelineEvents,
    workspace: { id: 'workspace-1' },
  });

  assert.deepEqual(result.timeline.map((event) => event.kind), ['first', 'second']);
  assert.equal(result.summary.total, 2);
  assert.equal(result.summary.specialistFollowUpRequiredCount, 1);
  assert.equal(result.summary.providerRecentEventCount, 4);
  assert.equal(result.summary.providerRecentExecutionCount, 2);
  assert.equal(result.summary.providerHealthDriftStatus, 'attention-required');
  assert.equal(result.summary.maintenanceLatestMonthlyBucketDelta, maintenanceDelta);
  assert.equal(result.summary.maintenanceMonthlyBucketCount, 2);
  assert.deepEqual(result.summary.providerRecentTouchedProviderIds, ['stub']);
});

test('buildGlobalOperatorTimelineReadModel uses global provider totals and probe evidence', () => {
  const providerRecentWindow = {
    eventTotal: 6,
    executionTotal: 3,
    latestEvent: { id: 'event-2' },
    latestExecution: { id: 'execution-2' },
    latestProbe: { id: 'probe-1' },
    probeTotal: 2,
    touchedProviderCount: 2,
    touchedProviderIds: ['stub', 'local'],
  };
  const workspaces = [{ id: 'workspace-1' }];
  const result = buildGlobalOperatorTimelineReadModel({
    maintenanceLatestMonthlyBucketDelta: null,
    maintenanceMonthlyBuckets: [],
    parallelActivity,
    providerHealthDrift,
    providerRecentWindow,
    providerSince: '',
    timelineEvents,
    workspaces,
  });

  assert.equal(result.summary.providerRecentEventCount, 6);
  assert.equal(result.summary.providerRecentExecutionCount, 3);
  assert.equal(result.summary.providerRecentProbeTotal, 2);
  assert.equal(result.summary.latestRecentProviderProbe, providerRecentWindow.latestProbe);
  assert.deepEqual(result.summary.providerRecentEventFamilyCounts, {
    attention: 0,
    execution: 0,
    fallback: 0,
    probe: 0,
  });
  assert.equal(result.summary.maintenanceMonthlyBucketCount, 0);
  assert.equal(result.workspaces, workspaces);
});
