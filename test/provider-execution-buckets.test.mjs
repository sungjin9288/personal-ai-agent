import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildProviderExecutionDailyBuckets,
  buildProviderExecutionLatestBucketDelta,
  buildProviderExecutionLatestMonthlyBucketDelta,
  buildProviderExecutionLatestWeeklyBucketDelta,
  buildProviderExecutionMonthlyBuckets,
  buildProviderExecutionWeeklyBuckets,
} from '../src/core/provider-execution-buckets.mjs';

const executions = [
  {
    at: '2026-06-30T12:00:00.000Z',
    estimatedCostUsd: 0.05,
    providerId: 'anthropic',
    role: 'executor',
    status: 'failed',
  },
  {
    at: '2026-07-01T08:00:00.000Z',
    estimatedCostUsd: 0.1,
    providerId: 'openai',
    role: 'planner',
    status: 'completed',
  },
  {
    at: '2026-07-01T09:00:00.000Z',
    providerId: 'local',
    role: 'executor',
    status: 'failed',
  },
  {
    at: '2026-07-08T08:00:00.000Z',
    estimatedCostUsd: 0.2,
    providerId: 'local',
    role: 'executor',
    status: 'completed',
  },
  { providerId: 'stub', role: 'manager', status: 'completed' },
];

test('provider execution buckets preserve counts, cost evidence, and newest-first order', () => {
  const daily = buildProviderExecutionDailyBuckets(executions);
  const weekly = buildProviderExecutionWeeklyBuckets(executions);
  const monthly = buildProviderExecutionMonthlyBuckets(executions);

  assert.deepEqual(daily.map((bucket) => bucket.date), ['2026-07-08', '2026-07-01', '2026-06-30']);
  assert.equal(daily[1].executionCount, 2);
  assert.equal(daily[1].completedCount, 1);
  assert.equal(daily[1].failedCount, 1);
  assert.equal(daily[1].estimatedCostUsdPricedCount, 1);
  assert.deepEqual(daily[1].estimatedCostUsdByProviderId, { openai: 0.1 });
  assert.deepEqual(daily[1].estimatedCostUsdByRole, { planner: 0.1 });

  assert.deepEqual(weekly.map((bucket) => bucket.weekStartDate), ['2026-07-06', '2026-06-29']);
  assert.equal(weekly[1].executionCount, 3);
  assert.equal(weekly[1].estimatedCostUsdTotal, 0.15);

  assert.deepEqual(monthly.map((bucket) => bucket.monthKey), ['2026-07', '2026-06']);
  assert.equal(monthly[0].executionCount, 3);
  assert.equal(monthly[0].estimatedCostUsdTotal, 0.3);
  assert.deepEqual(monthly[0].estimatedCostUsdByProviderId, { local: 0.2, openai: 0.1 });
});

test('provider execution bucket deltas compare the newest period with the previous period', () => {
  const dailyDelta = buildProviderExecutionLatestBucketDelta(buildProviderExecutionDailyBuckets(executions));
  const weeklyDelta = buildProviderExecutionLatestWeeklyBucketDelta(buildProviderExecutionWeeklyBuckets(executions));
  const monthlyDelta = buildProviderExecutionLatestMonthlyBucketDelta(buildProviderExecutionMonthlyBuckets(executions));

  assert.deepEqual(dailyDelta, {
    completedCountDelta: 0,
    currentDate: '2026-07-08',
    estimatedCostUsdPricedCountDelta: 0,
    estimatedCostUsdTotalDelta: 0.1,
    executionCountDelta: -1,
    failedCountDelta: -1,
    previousDate: '2026-07-01',
  });
  assert.equal(weeklyDelta.currentWeekStartDate, '2026-07-06');
  assert.equal(weeklyDelta.previousWeekStartDate, '2026-06-29');
  assert.equal(weeklyDelta.executionCountDelta, -2);
  assert.equal(weeklyDelta.failedCountDelta, -2);
  assert.equal(weeklyDelta.estimatedCostUsdTotalDelta, 0.05);
  assert.equal(monthlyDelta.currentMonthKey, '2026-07');
  assert.equal(monthlyDelta.previousMonthKey, '2026-06');
  assert.equal(monthlyDelta.executionCountDelta, 2);
  assert.equal(monthlyDelta.completedCountDelta, 2);
  assert.equal(monthlyDelta.estimatedCostUsdTotalDelta, 0.25);
});

test('provider execution bucket deltas return null without a current bucket', () => {
  assert.equal(buildProviderExecutionLatestBucketDelta([]), null);
  assert.equal(buildProviderExecutionLatestWeeklyBucketDelta([]), null);
  assert.equal(buildProviderExecutionLatestMonthlyBucketDelta([]), null);
});
