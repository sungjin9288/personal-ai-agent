import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const cliPath = path.join(repoRoot, 'src', 'cli.mjs');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-overview-'));

function runCli({ args, env = {} }) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
      PERSONAL_AI_AGENT_ROOT: tempRoot,
    },
  });

  return {
    status: result.status,
    stderr: String(result.stderr || ''),
    stdout: String(result.stdout || ''),
  };
}

const missingOpenAIProbeResult = runCli({
  args: ['provider', 'probe', 'openai'],
  env: {
    OPENAI_API_KEY: '',
  },
});

assert.equal(missingOpenAIProbeResult.status, 0);
const missingOpenAIProbe = JSON.parse(missingOpenAIProbeResult.stdout);
assert.equal(missingOpenAIProbe.id, 'openai');
assert.equal(missingOpenAIProbe.attempted, false);
assert.equal(missingOpenAIProbe.ok, false);

const originalFetch = globalThis.fetch;
const originalEnv = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_VERSION: process.env.ANTHROPIC_VERSION,
  LOCAL_PROVIDER_API_KEY: process.env.LOCAL_PROVIDER_API_KEY,
  LOCAL_PROVIDER_BASE_URL: process.env.LOCAL_PROVIDER_BASE_URL,
  LOCAL_PROVIDER_MODEL: process.env.LOCAL_PROVIDER_MODEL,
};

try {
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.test/v1';
  process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6';
  process.env.ANTHROPIC_VERSION = '2023-06-01';
  process.env.LOCAL_PROVIDER_API_KEY = 'test-local-key';
  process.env.LOCAL_PROVIDER_BASE_URL = 'http://127.0.0.1:1234/v1';
  process.env.LOCAL_PROVIDER_MODEL = 'llama3.1-local';

  globalThis.fetch = async (url) => {
    if (url === 'https://api.anthropic.test/v1/models') {
      return {
        ok: false,
        status: 503,
        async text() {
          return 'upstream unavailable';
        },
      };
    }

    if (url === 'http://127.0.0.1:1234/v1/models') {
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            data: [{ id: 'llama3.1-local' }, { id: 'qwen3-local' }],
          };
        },
      };
    }

    throw new Error(`Unexpected provider overview probe url: ${url}`);
  };

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ store, rootDir: tempRoot });

  await service.probeProvider('stub');
  await service.probeProvider('anthropic');
  await service.probeProvider('local');
} finally {
  globalThis.fetch = originalFetch;

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

const statePath = path.join(tempRoot, 'var', 'state.json');
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
const overdueTimestamp = '2026-03-01T00:00:00.000Z';
const recentWindowSince = '2026-04-02T00:00:00.000Z';

state.providerProbes = state.providerProbes.map((probe) => {
  if (probe.providerId === 'stub') {
    return {
      ...probe,
      checkedAt: '2026-04-02T10:00:00.000Z',
      createdAt: '2026-04-02T10:00:00.000Z',
    };
  }

  if (probe.providerId === 'anthropic') {
    return {
      ...probe,
      checkedAt: overdueTimestamp,
      createdAt: overdueTimestamp,
    };
  }

  if (probe.providerId === 'local') {
    return {
      ...probe,
      checkedAt: '2026-04-04T10:00:00.000Z',
      createdAt: '2026-04-04T10:00:00.000Z',
    };
  }

  if (probe.providerId === 'openai') {
    return {
      ...probe,
      checkedAt: '2026-04-03T10:00:00.000Z',
      createdAt: '2026-04-03T10:00:00.000Z',
    };
  }

  return probe;
});

fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

const configuredEnv = {
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  ANTHROPIC_BASE_URL: 'https://api.anthropic.test/v1',
  ANTHROPIC_MODEL: 'claude-sonnet-4-6',
  ANTHROPIC_VERSION: '2023-06-01',
  LOCAL_PROVIDER_API_KEY: 'test-local-key',
  LOCAL_PROVIDER_BASE_URL: 'http://127.0.0.1:1234/v1',
  LOCAL_PROVIDER_MODEL: 'llama3.1-local',
  OPENAI_API_KEY: '',
};

const anthropicCheckResult = runCli({
  args: ['provider', 'check', 'anthropic'],
  env: configuredEnv,
});

assert.equal(anthropicCheckResult.status, 0);
const anthropicCheck = JSON.parse(anthropicCheckResult.stdout);
assert.equal(anthropicCheck.attentionStatus, 'pending');
assert.equal(anthropicCheck.pendingAttentionIsOverdue, true);
assert.equal(anthropicCheck.pendingAttentionDueAt, '2026-03-02T00:00:00.000Z');
assert.equal(anthropicCheck.pendingAttentionNeedsReminder, true);
assert.equal(anthropicCheck.pendingAttentionNextReminderAt, '2026-03-02T00:00:00.000Z');
assert.equal(anthropicCheck.pendingAttentionReminderCount, 0);
assert.equal(anthropicCheck.latestPendingAttention.providerId, 'anthropic');
assert.equal(anthropicCheck.latestPendingAttention.failureKind, 'http-status');
assert.equal(anthropicCheck.latestPendingAttention.httpStatus, 503);
assert.equal(anthropicCheck.latestPendingAttention.recoverable, true);
assert.equal(anthropicCheck.latestPendingAttention.attemptCount, 2);
assert.equal(anthropicCheck.latestPendingAttention.retryCount, 1);
assert.equal(anthropicCheck.latestPendingAttention.attemptHistoryCount, 2);

const providerOverviewResult = runCli({
  args: ['overview', 'providers'],
  env: configuredEnv,
});

assert.equal(providerOverviewResult.status, 0);
const providerOverview = JSON.parse(providerOverviewResult.stdout);

assert.equal(providerOverview.summary.total, 4);
assert.equal(providerOverview.summary.implementedCount, 4);
assert.equal(providerOverview.summary.configuredCount, 3);
assert.equal(providerOverview.summary.readyCount, 3);
assert.equal(providerOverview.summary.probeTotal, 4);
assert.equal(providerOverview.summary.probeAttemptedCount, 3);
assert.equal(providerOverview.summary.probeSuccessCount, 2);
assert.equal(providerOverview.summary.probeFailureCount, 2);
assert.equal(providerOverview.summary.probeFailureKindCounts.config, 1);
assert.equal(providerOverview.summary.probeFailureKindCounts['http-status'], 1);
assert.equal(providerOverview.summary.probeRetryableFailureCount, 1);
assert.equal(providerOverview.summary.probeTotalAttemptCount, 4);
assert.equal(providerOverview.summary.probeTotalRetryCount, 1);
assert.equal(providerOverview.summary.probeMaxAttemptCount, 2);
assert.equal(providerOverview.summary.probeMultiAttemptCount, 1);
assert.equal(providerOverview.summary.probeRetrySucceededCount, 0);
assert.equal(providerOverview.summary.probeTimedOutFailureCount, 0);
assert.equal(providerOverview.summary.attentionRequiredCount, 1);
assert.equal(providerOverview.summary.attentionOverdueCount, 1);
assert.equal(providerOverview.summary.attentionNeedsReminderCount, 1);
assert.equal(providerOverview.summary.attentionTotalAttemptCount, 2);
assert.equal(providerOverview.summary.attentionTotalRetryCount, 1);
assert.equal(providerOverview.summary.attentionNextDueAt, '2026-03-02T00:00:00.000Z');
assert.equal(providerOverview.summary.attentionNextReminderAt, '2026-03-02T00:00:00.000Z');
assert.equal(providerOverview.summary.attentionReminderCountTotal, 0);
assert.deepEqual(providerOverview.summary.attentionOverdueProviderIds, ['anthropic']);
assert.equal(providerOverview.summary.latestProbeSuccessCount, 2);
assert.equal(providerOverview.summary.latestProbeFailureCount, 1);
assert.equal(providerOverview.summary.latestProbeSkippedCount, 1);
assert.equal(providerOverview.summary.unprobedCount, 0);
assert.deepEqual(providerOverview.summary.unconfiguredProviderIds, ['openai']);
assert.equal(providerOverview.summary.latestProbe.providerId, 'local');
assert.equal(providerOverview.summary.latestSuccessfulProbe.providerId, 'local');
assert.equal(providerOverview.summary.latestFailedProbe.providerId, 'anthropic');
assert.equal(providerOverview.summary.latestSkippedProbe.providerId, 'openai');
assert.equal(providerOverview.providers.length, 4);
assert.equal(
  providerOverview.providers.some((provider) => provider.id === 'local' && provider.latestProbe.ok === true),
  true,
);
assert.equal(
  providerOverview.providers.some((provider) => provider.id === 'anthropic' && provider.latestProbe.ok === false),
  true,
);
assert.equal(
  providerOverview.providers.some(
    (provider) => provider.id === 'openai' && provider.latestProbe.failureKind === 'config' && provider.latestProbe.attemptCount === 0,
  ),
  true,
);
assert.equal(
  providerOverview.providers.some(
    (provider) =>
      provider.id === 'anthropic' &&
      provider.pendingAttentionIsOverdue === true &&
      provider.pendingAttentionDueAt === '2026-03-02T00:00:00.000Z',
  ),
  true,
);

const recentProviderOverviewResult = runCli({
  args: ['overview', 'providers', '--since', recentWindowSince],
  env: configuredEnv,
});

assert.equal(recentProviderOverviewResult.status, 0);
const recentProviderOverview = JSON.parse(recentProviderOverviewResult.stdout);
assert.equal(recentProviderOverview.filters.since, recentWindowSince);
assert.equal(recentProviderOverview.summary.total, 4);
assert.equal(recentProviderOverview.recentWindow.filters.since, recentWindowSince);
assert.equal(recentProviderOverview.recentWindow.probeTotal, 3);
assert.equal(recentProviderOverview.recentWindow.probeAttemptedCount, 2);
assert.equal(recentProviderOverview.recentWindow.probeSuccessCount, 2);
assert.equal(recentProviderOverview.recentWindow.probeFailureCount, 1);
assert.equal(recentProviderOverview.recentWindow.probeSkippedCount, 1);
assert.equal(recentProviderOverview.recentWindow.executionTotal, 0);
assert.equal(recentProviderOverview.recentWindow.executionBucketCount, 0);
assert.deepEqual(recentProviderOverview.recentWindow.executionDailyBuckets, []);
assert.equal(recentProviderOverview.recentWindow.executionLatestBucketDate, null);
assert.equal(recentProviderOverview.recentWindow.executionOldestBucketDate, null);
assert.equal(recentProviderOverview.recentWindow.executionLatestBucketDelta, null);
assert.equal(recentProviderOverview.recentWindow.executionMonthlyBucketCount, 0);
assert.deepEqual(recentProviderOverview.recentWindow.executionMonthlyBuckets, []);
assert.equal(recentProviderOverview.recentWindow.executionLatestMonthlyBucketStartDate, null);
assert.equal(recentProviderOverview.recentWindow.executionOldestMonthlyBucketStartDate, null);
assert.equal(recentProviderOverview.recentWindow.executionLatestMonthlyBucketDelta, null);
assert.equal(recentProviderOverview.recentWindow.executionWeeklyBucketCount, 0);
assert.deepEqual(recentProviderOverview.recentWindow.executionWeeklyBuckets, []);
assert.equal(recentProviderOverview.recentWindow.executionLatestWeeklyBucketStartDate, null);
assert.equal(recentProviderOverview.recentWindow.executionOldestWeeklyBucketStartDate, null);
assert.equal(recentProviderOverview.recentWindow.executionLatestWeeklyBucketDelta, null);
assert.equal(recentProviderOverview.recentWindow.eventTotal, 3);
assert.equal(recentProviderOverview.recentWindow.eventFamilyCounts.probe, 3);
assert.equal(recentProviderOverview.recentWindow.eventFamilyCounts.execution, 0);
assert.equal(recentProviderOverview.recentWindow.eventFamilyCounts.attention, 0);
assert.deepEqual(recentProviderOverview.recentWindow.touchedProviderIds, ['local', 'openai', 'stub']);
assert.equal(recentProviderOverview.recentWindow.latestProbe.providerId, 'local');
assert.equal(recentProviderOverview.recentWindow.latestEvent.providerId, 'local');
assert.equal(recentProviderOverview.recentWindow.latestFailedProbe, null);
assert.equal(recentProviderOverview.recentWindow.latestAttentionEvent, null);

const globalOverviewResult = runCli({
  args: ['overview', 'global'],
  env: configuredEnv,
});

assert.equal(globalOverviewResult.status, 0);
const globalOverview = JSON.parse(globalOverviewResult.stdout);

assert.equal(globalOverview.summary.providerCount, 4);
assert.equal(globalOverview.summary.providerConfiguredCount, 3);
assert.equal(globalOverview.summary.providerReadyCount, 3);
assert.equal(globalOverview.summary.providerAttentionRequiredCount, 1);
assert.equal(globalOverview.summary.providerAttentionOverdueCount, 1);
assert.equal(globalOverview.summary.providerAttentionNeedsReminderCount, 1);
assert.equal(globalOverview.summary.providerAttentionNextDueAt, '2026-03-02T00:00:00.000Z');
assert.equal(globalOverview.summary.providerAttentionNextReminderAt, '2026-03-02T00:00:00.000Z');
assert.equal(globalOverview.summary.providerAttentionReminderCount, 0);
assert.equal(globalOverview.summary.providerUnprobedCount, 0);
assert.equal(globalOverview.summary.providerLatestProbeFailureCount, 1);
assert.equal(globalOverview.summary.providerLatestProbeSkippedCount, 1);
assert.equal(globalOverview.summary.providerProbeFailureKindCounts.config, 1);
assert.equal(globalOverview.summary.providerProbeFailureKindCounts['http-status'], 1);
assert.equal(globalOverview.summary.providerProbeRetryableFailureCount, 1);
assert.equal(globalOverview.summary.providerProbeTotalAttemptCount, 4);
assert.equal(globalOverview.summary.providerProbeTotalRetryCount, 1);
assert.equal(globalOverview.summary.providerProbeMaxAttemptCount, 2);
assert.equal(globalOverview.summary.providerProbeMultiAttemptCount, 1);
assert.equal(globalOverview.summary.providerProbeRetrySucceededCount, 0);
assert.equal(globalOverview.summary.providerProbeTimedOutFailureCount, 0);
assert.equal(globalOverview.summary.providerAttentionTotalAttemptCount, 2);
assert.equal(globalOverview.summary.providerAttentionTotalRetryCount, 1);
assert.equal(globalOverview.summary.latestProviderProbe.providerId, 'local');
assert.equal(globalOverview.summary.latestFailedProviderProbe.providerId, 'anthropic');
assert.equal(globalOverview.summary.latestSuccessfulProviderProbe.providerId, 'local');
assert.equal(globalOverview.providerOverview.summary.probeTotal, 4);
assert.equal(globalOverview.providerOverview.summary.latestSkippedProbe.providerId, 'openai');

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'provider-overview',
      providerCount: providerOverview.summary.total,
    },
    null,
    2,
  ),
);
