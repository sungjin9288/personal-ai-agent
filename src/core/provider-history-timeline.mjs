import {
  buildProviderExecutionTimeline,
  buildProviderProbeTimeline,
  summarizeProviderExecutionTimeline,
  summarizeProviderExecutions,
  summarizeProviderProbeTimeline,
  summarizeProviderProbes,
} from './provider-execution-summary.mjs';
import {
  buildProviderExecutionDailyBuckets,
  buildProviderExecutionLatestBucketDelta,
} from './provider-execution-buckets.mjs';
import { summarizeProviderEvents } from './provider-event-summary.mjs';

function buildProviderExecutionFilters(filter = {}) {
  return {
    missionId: filter.missionId || null,
    providerId: filter.providerId || null,
    role: filter.role || null,
    since: filter.since || null,
    status: filter.status || null,
    workspaceId: filter.workspaceId || null,
  };
}

function buildProviderEventFilters(filter = {}) {
  return {
    attempted: typeof filter.attempted === 'boolean' ? filter.attempted : null,
    family: filter.family || null,
    fallbackPolicy: filter.fallbackPolicy || null,
    fallbackStopReason: filter.fallbackStopReason || null,
    missionId: filter.missionId || null,
    ok: typeof filter.ok === 'boolean' ? filter.ok : null,
    providerId: filter.providerId || null,
    role: filter.role || null,
    since: filter.since || null,
    status: filter.status || null,
    workspaceId: filter.workspaceId || null,
  };
}

export function buildProviderProbeHistoryResult(probes) {
  return {
    probes,
    summary: summarizeProviderProbes(probes),
  };
}

export function buildProviderProbeTimelineResult(probes) {
  const timeline = buildProviderProbeTimeline(probes);

  return {
    summary: summarizeProviderProbeTimeline(timeline),
    timeline,
  };
}

export function buildProviderExecutionHistoryResult(executions, filter = {}) {
  const dailyBuckets = buildProviderExecutionDailyBuckets(executions);

  return {
    executions,
    filters: buildProviderExecutionFilters(filter),
    summary: {
      ...summarizeProviderExecutions(executions),
      bucketCount: dailyBuckets.length,
      dailyBuckets,
      latestBucketDate: dailyBuckets[0]?.date || null,
      latestBucketDelta: buildProviderExecutionLatestBucketDelta(dailyBuckets),
      oldestBucketDate: dailyBuckets.at(-1)?.date || null,
    },
  };
}

export function buildProviderExecutionTimelineResult(executions, filter = {}) {
  const timeline = buildProviderExecutionTimeline(executions);

  return {
    filters: buildProviderExecutionFilters(filter),
    summary: summarizeProviderExecutionTimeline(timeline),
    timeline,
  };
}

export function buildProviderEventTimelineResult(timeline, filter = {}) {
  return {
    filters: buildProviderEventFilters(filter),
    summary: summarizeProviderEvents(timeline),
    timeline,
  };
}
