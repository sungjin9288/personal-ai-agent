import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';
import {
  acquireProviderRateGuardSlot,
  getProviderRateGuardSnapshot,
  resetProviderRateGuards,
} from '../src/providers/provider-rate-guard.mjs';
import { requestJsonWithPolicy } from '../src/providers/provider-runtime-utils.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-capability-rate-guard-'));

const providerList = runCli({
  rootDir: tempRoot,
  args: ['provider', 'list'],
});

const stubProvider = providerList.providers.find((provider) => provider.id === 'stub');
const openAIProvider = providerList.providers.find((provider) => provider.id === 'openai');
const anthropicProvider = providerList.providers.find((provider) => provider.id === 'anthropic');
const localProvider = providerList.providers.find((provider) => provider.id === 'local');
const hermesProvider = providerList.providers.find((provider) => provider.id === 'hermes');

assert.ok(stubProvider);
assert.ok(openAIProvider);
assert.ok(anthropicProvider);
assert.ok(localProvider);
assert.ok(hermesProvider);
assert.deepEqual(stubProvider.capabilities.roles, ['manager', 'planner', 'executor', 'reviewer', 'specialist']);
assert.equal(stubProvider.capabilities.localOnly, true);
assert.equal(stubProvider.capabilities.structuredJson, true);
assert.equal(openAIProvider.capabilities.modelDiscovery, true);
assert.equal(openAIProvider.capabilities.usageMetrics, true);
assert.equal(openAIProvider.capabilities.costTelemetry, true);
assert.equal(anthropicProvider.capabilities.structuredJson, true);
assert.equal(localProvider.capabilities.localOnly, true);
assert.equal(openAIProvider.rateLimit.maxConcurrency, 4);
assert.equal(openAIProvider.rateLimit.maxRequests, 40);
assert.equal(localProvider.rateLimit.maxConcurrency, 2);
assert.equal(hermesProvider.capabilities.toolCalls, true);
assert.equal(hermesProvider.capabilities.structuredJson, true);
assert.equal(hermesProvider.transport, 'openai-compatible-hermes-chat-completions');
assert.equal(hermesProvider.rateLimit.maxConcurrency, 2);
assert.equal(providerList.summary.capabilityStructuredJsonCount, 5);
assert.equal(providerList.summary.capabilityUsageMetricsCount, 4);
assert.equal(providerList.summary.rateLimitedProviderCount, 4);

resetProviderRateGuards();

let nowMs = 0;
const proactiveSleeps = [];
let proactiveFetchCount = 0;
const proactiveFetch = async () => {
  proactiveFetchCount += 1;
  return {
    ok: true,
    status: 200,
    async json() {
      return { ok: true, proactiveFetchCount };
    },
  };
};

const proactiveRateLimit = {
  maxConcurrency: 2,
  maxRequests: 2,
  nowMs: () => nowMs,
  reactiveBlockMs: 25,
  scope: 'smoke-proactive',
  sleep: async (ms) => {
    proactiveSleeps.push(ms);
    nowMs += ms;
  },
  windowMs: 100,
};

await requestJsonWithPolicy({
  fetchImpl: proactiveFetch,
  maxAttempts: 1,
  providerLabel: 'Smoke',
  rateLimit: proactiveRateLimit,
  url: 'https://example.invalid/proactive',
});
await requestJsonWithPolicy({
  fetchImpl: proactiveFetch,
  maxAttempts: 1,
  providerLabel: 'Smoke',
  rateLimit: proactiveRateLimit,
  url: 'https://example.invalid/proactive',
});
await requestJsonWithPolicy({
  fetchImpl: proactiveFetch,
  maxAttempts: 1,
  providerLabel: 'Smoke',
  rateLimit: proactiveRateLimit,
  url: 'https://example.invalid/proactive',
});

assert.deepEqual(proactiveSleeps, [100]);
assert.equal(proactiveFetchCount, 3);
assert.equal(getProviderRateGuardSnapshot('smoke-proactive', { nowMs: () => nowMs }).windowRequestCount, 1);

resetProviderRateGuards();

let reactiveNowMs = 1000;
const reactiveSleeps = [];
let reactiveFetchCount = 0;
const reactiveFetch = async () => {
  reactiveFetchCount += 1;
  if (reactiveFetchCount === 1) {
    return {
      ok: false,
      status: 429,
      async text() {
        return 'rate limit exceeded';
      },
    };
  }

  return {
    ok: true,
    status: 200,
    async json() {
      return { ok: true };
    },
  };
};

const reactiveResult = await requestJsonWithPolicy({
  fetchImpl: reactiveFetch,
  maxAttempts: 2,
  providerLabel: 'Smoke',
  rateLimit: {
    maxConcurrency: 1,
    maxRequests: 10,
    nowMs: () => reactiveNowMs,
    reactiveBlockMs: 25,
    scope: 'smoke-reactive',
    sleep: async (ms) => {
      reactiveSleeps.push(ms);
      reactiveNowMs += ms;
    },
    windowMs: 1000,
  },
  url: 'https://example.invalid/reactive',
});

assert.equal(reactiveResult.attemptCount, 2);
assert.equal(reactiveResult.retryCount, 1);
assert.equal(reactiveResult.attemptHistory[0].httpStatus, 429);
assert.deepEqual(reactiveSleeps, [25]);
assert.equal(getProviderRateGuardSnapshot('smoke-reactive', { nowMs: () => reactiveNowMs }).remainingBlockedMs, 0);

resetProviderRateGuards();

let retryExhaustedHttpCount = 0;
await assert.rejects(
  requestJsonWithPolicy({
    fetchImpl: async () => {
      retryExhaustedHttpCount += 1;
      return {
        ok: false,
        status: 503,
        async text() {
          return 'service unavailable';
        },
      };
    },
    maxAttempts: 2,
    providerLabel: 'Smoke',
    url: 'https://example.invalid/retry-exhausted',
  }),
  (error) => {
    assert.equal(error.failure.failureKind, 'http-status');
    assert.equal(error.failure.httpStatus, 503);
    assert.equal(error.failure.recoverable, true);
    assert.equal(error.failure.retryCount, 1);
    assert.equal(error.failure.attemptHistory.length, 2);
    assert.equal(error.failure.attemptHistory.every((attempt) => attempt.recoverable === true), true);
    return true;
  },
);
assert.equal(retryExhaustedHttpCount, 2);

let nonRetryableHttpCount = 0;
await assert.rejects(
  requestJsonWithPolicy({
    fetchImpl: async () => {
      nonRetryableHttpCount += 1;
      return {
        ok: false,
        status: 400,
        async text() {
          return 'bad request';
        },
      };
    },
    maxAttempts: 2,
    providerLabel: 'Smoke',
    url: 'https://example.invalid/non-retryable-http',
  }),
  (error) => {
    assert.equal(error.failure.failureKind, 'http-status');
    assert.equal(error.failure.httpStatus, 400);
    assert.equal(error.failure.recoverable, false);
    assert.equal(error.failure.retryCount, 0);
    assert.equal(error.failure.attemptHistory.length, 1);
    return true;
  },
);
assert.equal(nonRetryableHttpCount, 1);

let transportFailureCount = 0;
await assert.rejects(
  requestJsonWithPolicy({
    fetchImpl: async () => {
      transportFailureCount += 1;
      throw new Error('socket hang up');
    },
    maxAttempts: 2,
    providerLabel: 'Smoke',
    url: 'https://example.invalid/transport',
  }),
  (error) => {
    assert.equal(error.failure.failureKind, 'transport');
    assert.equal(error.failure.recoverable, true);
    assert.equal(error.failure.retryCount, 1);
    assert.equal(error.failure.attemptHistory.length, 2);
    assert.equal(error.failure.attemptHistory.every((attempt) => attempt.recoverable === true), true);
    return true;
  },
);
assert.equal(transportFailureCount, 2);

await assert.rejects(
  requestJsonWithPolicy({
    fetchImpl: async () => {
      const error = new Error('The operation timed out.');
      error.name = 'AbortError';
      throw error;
    },
    maxAttempts: 1,
    providerLabel: 'Smoke',
    url: 'https://example.invalid/timeout',
  }),
  (error) => {
    assert.equal(error.failure.failureKind, 'timeout');
    assert.equal(error.failure.recoverable, true);
    assert.equal(error.failure.timedOut, true);
    assert.equal(error.failure.retryCount, 0);
    return true;
  },
);

const releaseFirst = await acquireProviderRateGuardSlot({
  maxConcurrency: 1,
  maxRequests: 0,
  scope: 'smoke-concurrency',
});
let secondResolved = false;
const secondSlot = acquireProviderRateGuardSlot({
  maxConcurrency: 1,
  maxRequests: 0,
  scope: 'smoke-concurrency',
}).then((release) => {
  secondResolved = true;
  return release;
});

await Promise.resolve();
assert.equal(secondResolved, false);
assert.equal(getProviderRateGuardSnapshot('smoke-concurrency').activeCount, 1);
assert.equal(getProviderRateGuardSnapshot('smoke-concurrency').queueDepth, 1);

releaseFirst();
const releaseSecond = await secondSlot;
assert.equal(secondResolved, true);
releaseSecond();
assert.equal(getProviderRateGuardSnapshot('smoke-concurrency').activeCount, 0);

console.log(
  JSON.stringify(
    {
      mode: 'provider-capability-rate-guard',
      ok: true,
      proactiveSleeps,
      reactiveSleeps,
      rateLimitedProviderCount: providerList.summary.rateLimitedProviderCount,
    },
    null,
    2,
  ),
);
