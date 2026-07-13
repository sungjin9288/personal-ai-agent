import { getUtcMonthRange, getUtcWeekRange } from './date-bucket-utils.mjs';
import { roundUsdAmount } from '../providers/provider-runtime-utils.mjs';

function normalizeText(value) {
  return String(value || '').trim();
}

function addExecutionToBucket(bucket, execution) {
  bucket.executionCount += 1;
  if (execution.status === 'completed') {
    bucket.completedCount += 1;
  }
  if (execution.status === 'failed') {
    bucket.failedCount += 1;
  }

  const estimatedCostUsd = roundUsdAmount(execution.estimatedCostUsd);
  if (!Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
    return;
  }

  bucket.estimatedCostUsdPricedCount += 1;
  bucket.estimatedCostUsdTotal = roundUsdAmount(bucket.estimatedCostUsdTotal + estimatedCostUsd);

  const providerId = normalizeText(execution.providerId);
  if (providerId) {
    bucket.estimatedCostUsdByProviderId[providerId] = roundUsdAmount(
      Number(bucket.estimatedCostUsdByProviderId[providerId] || 0) + estimatedCostUsd,
    );
  }

  const role = normalizeText(execution.role);
  if (role) {
    bucket.estimatedCostUsdByRole[role] = roundUsdAmount(
      Number(bucket.estimatedCostUsdByRole[role] || 0) + estimatedCostUsd,
    );
  }
}

function createExecutionBucket(fields) {
  return {
    completedCount: 0,
    estimatedCostUsdByProviderId: {},
    estimatedCostUsdByRole: {},
    estimatedCostUsdPricedCount: 0,
    estimatedCostUsdTotal: 0,
    executionCount: 0,
    failedCount: 0,
    ...fields,
  };
}

function createDailyExecutionBucket(date) {
  return {
    completedCount: 0,
    date,
    estimatedCostUsdByProviderId: {},
    estimatedCostUsdByRole: {},
    estimatedCostUsdPricedCount: 0,
    estimatedCostUsdTotal: 0,
    executionCount: 0,
    failedCount: 0,
  };
}

export function buildProviderExecutionDailyBuckets(executions) {
  const buckets = new Map();

  for (const execution of executions) {
    const at = String(execution.at || execution.endedAt || execution.startedAt || '');
    if (!at) {
      continue;
    }

    const date = at.slice(0, 10);
    const bucket = buckets.get(date) || createDailyExecutionBucket(date);
    addExecutionToBucket(bucket, execution);
    buckets.set(date, bucket);
  }

  return [...buckets.values()].sort((left, right) => String(right.date).localeCompare(String(left.date)));
}

export function buildProviderExecutionWeeklyBuckets(executions) {
  const buckets = new Map();

  for (const execution of executions) {
    const at = String(execution.at || execution.endedAt || execution.startedAt || '');
    const week = at ? getUtcWeekRange(at) : null;
    if (!week) {
      continue;
    }

    const bucket =
      buckets.get(week.key) ||
      createExecutionBucket({ weekEndDate: week.weekEndDate, weekStartDate: week.weekStartDate });
    addExecutionToBucket(bucket, execution);
    buckets.set(week.key, bucket);
  }

  return [...buckets.values()].sort((left, right) =>
    String(right.weekStartDate).localeCompare(String(left.weekStartDate)),
  );
}

export function buildProviderExecutionMonthlyBuckets(executions) {
  const buckets = new Map();

  for (const execution of executions) {
    const at = String(execution.at || execution.endedAt || execution.startedAt || '');
    const month = at ? getUtcMonthRange(at) : null;
    if (!month) {
      continue;
    }

    const bucket =
      buckets.get(month.key) ||
      createExecutionBucket({
        monthEndDate: month.monthEndDate,
        monthKey: month.monthKey,
        monthStartDate: month.monthStartDate,
      });
    addExecutionToBucket(bucket, execution);
    buckets.set(month.key, bucket);
  }

  return [...buckets.values()].sort((left, right) =>
    String(right.monthStartDate).localeCompare(String(left.monthStartDate)),
  );
}

export function buildProviderExecutionLatestBucketDelta(dailyBuckets) {
  const current = dailyBuckets[0] || null;
  if (!current) {
    return null;
  }

  const previous = dailyBuckets[1] || null;
  return {
    completedCountDelta: Number(current.completedCount || 0) - Number(previous?.completedCount || 0),
    currentDate: current.date,
    estimatedCostUsdPricedCountDelta:
      Number(current.estimatedCostUsdPricedCount || 0) - Number(previous?.estimatedCostUsdPricedCount || 0),
    estimatedCostUsdTotalDelta: roundUsdAmount(
      Number(current.estimatedCostUsdTotal || 0) - Number(previous?.estimatedCostUsdTotal || 0),
    ),
    executionCountDelta: Number(current.executionCount || 0) - Number(previous?.executionCount || 0),
    failedCountDelta: Number(current.failedCount || 0) - Number(previous?.failedCount || 0),
    previousDate: previous?.date || null,
  };
}

export function buildProviderExecutionLatestWeeklyBucketDelta(weeklyBuckets) {
  const current = weeklyBuckets[0] || null;
  if (!current) {
    return null;
  }

  const previous = weeklyBuckets[1] || null;
  return {
    completedCountDelta: Number(current.completedCount || 0) - Number(previous?.completedCount || 0),
    currentWeekEndDate: current.weekEndDate,
    currentWeekStartDate: current.weekStartDate,
    estimatedCostUsdPricedCountDelta:
      Number(current.estimatedCostUsdPricedCount || 0) - Number(previous?.estimatedCostUsdPricedCount || 0),
    estimatedCostUsdTotalDelta: roundUsdAmount(
      Number(current.estimatedCostUsdTotal || 0) - Number(previous?.estimatedCostUsdTotal || 0),
    ),
    executionCountDelta: Number(current.executionCount || 0) - Number(previous?.executionCount || 0),
    failedCountDelta: Number(current.failedCount || 0) - Number(previous?.failedCount || 0),
    previousWeekEndDate: previous?.weekEndDate || null,
    previousWeekStartDate: previous?.weekStartDate || null,
  };
}

export function buildProviderExecutionLatestMonthlyBucketDelta(monthlyBuckets) {
  const current = monthlyBuckets[0] || null;
  if (!current) {
    return null;
  }

  const previous = monthlyBuckets[1] || null;
  return {
    completedCountDelta: Number(current.completedCount || 0) - Number(previous?.completedCount || 0),
    currentMonthEndDate: current.monthEndDate,
    currentMonthKey: current.monthKey,
    currentMonthStartDate: current.monthStartDate,
    estimatedCostUsdPricedCountDelta:
      Number(current.estimatedCostUsdPricedCount || 0) - Number(previous?.estimatedCostUsdPricedCount || 0),
    estimatedCostUsdTotalDelta: roundUsdAmount(
      Number(current.estimatedCostUsdTotal || 0) - Number(previous?.estimatedCostUsdTotal || 0),
    ),
    executionCountDelta: Number(current.executionCount || 0) - Number(previous?.executionCount || 0),
    failedCountDelta: Number(current.failedCount || 0) - Number(previous?.failedCount || 0),
    previousMonthEndDate: previous?.monthEndDate || null,
    previousMonthKey: previous?.monthKey || null,
    previousMonthStartDate: previous?.monthStartDate || null,
  };
}
