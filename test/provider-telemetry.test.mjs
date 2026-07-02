import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeProviderFailureKind,
  summarizeFailureKinds,
  normalizeTelemetryNumber,
  normalizeProviderAttemptHistory,
  extractProviderAttemptMetadata,
  summarizeAttemptMetrics,
  extractProviderUsageMetadata,
  summarizeDurationMetrics,
  summarizeUsageMetrics,
  summarizeEstimatedCostMetrics,
  summarizeEstimatedCostBreakdown,
  extractProviderFailureMetadata,
} from '../src/core/provider-telemetry.mjs';
import { PROVIDER_FAILURE_KINDS } from '../src/core/constants.mjs';

test('normalizeProviderFailureKind', async (t) => {
  await t.test('returns the value unchanged when it is a known failure kind', () => {
    assert.equal(normalizeProviderFailureKind('timeout'), 'timeout');
    assert.equal(normalizeProviderFailureKind('http-status'), 'http-status');
  });

  await t.test('falls back to "unknown" for unrecognized, empty, null, or undefined values', () => {
    assert.equal(normalizeProviderFailureKind('not-a-real-kind'), 'unknown');
    assert.equal(normalizeProviderFailureKind(''), 'unknown');
    assert.equal(normalizeProviderFailureKind(null), 'unknown');
    assert.equal(normalizeProviderFailureKind(undefined), 'unknown');
  });

  await t.test('trims whitespace before matching', () => {
    assert.equal(normalizeProviderFailureKind('  timeout  '), 'timeout');
  });
});

test('summarizeFailureKinds', async (t) => {
  await t.test('returns a zeroed count map for every known failure kind on empty input', () => {
    const result = summarizeFailureKinds([]);
    for (const kind of PROVIDER_FAILURE_KINDS) {
      assert.equal(result[kind], 0);
    }
    assert.equal(Object.keys(result).length, PROVIDER_FAILURE_KINDS.length);
  });

  await t.test('counts items by normalized failureKind, only when failureKind is truthy', () => {
    const result = summarizeFailureKinds([
      { failureKind: 'timeout' },
      { failureKind: 'timeout' },
      { failureKind: 'bogus-kind' }, // normalizes to 'unknown', still counted since truthy
      { failureKind: '' }, // falsy, not counted at all
      {}, // no failureKind, not counted
    ]);

    assert.equal(result.timeout, 2);
    assert.equal(result.unknown, 1);
    assert.equal(result.transport, 0);
  });
});

test('normalizeTelemetryNumber', async (t) => {
  await t.test('returns the numeric value when finite', () => {
    assert.equal(normalizeTelemetryNumber(42), 42);
    assert.equal(normalizeTelemetryNumber('17'), 17);
    assert.equal(normalizeTelemetryNumber(0), 0);
  });

  await t.test('returns the fallback (default null) for non-finite or missing values', () => {
    assert.equal(normalizeTelemetryNumber(undefined), null);
    // Observed behavior: Number(null) === 0, which is finite, so `null` input
    // normalizes to 0, not the fallback. Documented rather than assumed.
    assert.equal(normalizeTelemetryNumber(null), 0);
    assert.equal(normalizeTelemetryNumber('not-a-number'), null);
    assert.equal(normalizeTelemetryNumber(NaN), null);
    assert.equal(normalizeTelemetryNumber(Infinity), null);
  });

  await t.test('uses a custom fallback value when provided', () => {
    assert.equal(normalizeTelemetryNumber('bad', -1), -1);
    assert.equal(normalizeTelemetryNumber(undefined, 0), 0);
  });
});

test('normalizeProviderAttemptHistory', async (t) => {
  await t.test('returns an empty array for non-array input (including default/undefined)', () => {
    assert.deepEqual(normalizeProviderAttemptHistory(), []);
    assert.deepEqual(normalizeProviderAttemptHistory(null), []);
    assert.deepEqual(normalizeProviderAttemptHistory('not-an-array'), []);
    assert.deepEqual(normalizeProviderAttemptHistory({}), []);
  });

  await t.test('filters out entries with a non-positive or non-finite attempt number', () => {
    const result = normalizeProviderAttemptHistory([
      { attempt: 0 },
      { attempt: -1 },
      { attempt: 'not-a-number' },
      {},
    ]);
    assert.deepEqual(result, []);
  });

  await t.test('normalizes a well-formed entry, deriving attempt from attempt or attemptCount', () => {
    const result = normalizeProviderAttemptHistory([
      {
        attempt: 2,
        durationMs: 150,
        failureKind: 'timeout',
        httpStatus: 504,
        ok: false,
        rawMessage: 'Gateway timeout',
        recoverable: true,
        timedOut: true,
      },
      { attemptCount: 3, ok: true },
    ]);

    assert.equal(result.length, 2);
    assert.deepEqual(result[0], {
      attempt: 2,
      durationMs: 150,
      failureKind: 'timeout',
      httpStatus: 504,
      ok: false,
      rawMessage: 'Gateway timeout',
      recoverable: true,
      timedOut: true,
    });
    // Second entry uses attemptCount fallback for attempt, and defaults for
    // everything else since only attemptCount/ok were provided.
    assert.equal(result[1].attempt, 3);
    assert.equal(result[1].ok, true);
    assert.equal(result[1].durationMs, null);
    assert.equal(result[1].failureKind, null);
    assert.equal(result[1].httpStatus, null);
    assert.equal(result[1].rawMessage, null);
    assert.equal(result[1].recoverable, null);
    assert.equal(result[1].timedOut, false);
  });

  await t.test('normalizes an unrecognized failureKind string to "unknown" (not null)', () => {
    const result = normalizeProviderAttemptHistory([{ attempt: 1, failureKind: 'made-up' }]);
    assert.equal(result[0].failureKind, 'unknown');
  });

  await t.test('leaves recoverable as null unless it is strictly a boolean', () => {
    const result = normalizeProviderAttemptHistory([
      { attempt: 1, recoverable: 'true' },
      { attempt: 2, recoverable: true },
    ]);
    assert.equal(result[0].recoverable, null);
    assert.equal(result[1].recoverable, true);
  });
});

test('extractProviderAttemptMetadata', async (t) => {
  await t.test('handles undefined/empty item: zeroed attemptCount, empty history, zero retryCount', () => {
    const result = extractProviderAttemptMetadata(undefined);
    assert.deepEqual(result, {
      attemptCount: 0,
      attemptHistory: [],
      attemptHistoryCount: 0,
      retryCount: 0,
    });
  });

  await t.test('prefers explicit item.attemptCount over the attemptHistory-derived fallback', () => {
    const result = extractProviderAttemptMetadata({
      attemptCount: 5,
      attemptHistory: [{ attempt: 1 }, { attempt: 2 }],
    });
    assert.equal(result.attemptCount, 5);
    assert.equal(result.attemptHistoryCount, 2);
  });

  await t.test('falls back to the last attemptHistory entry attempt number when attemptCount is missing', () => {
    const result = extractProviderAttemptMetadata({
      attemptHistory: [{ attempt: 1 }, { attempt: 3 }],
    });
    assert.equal(result.attemptCount, 3);
  });

  await t.test('prefers explicit item.retryCount over deriveRetryCount(attemptCount)', () => {
    const result = extractProviderAttemptMetadata({ attemptCount: 4, retryCount: 99 });
    assert.equal(result.retryCount, 99);
  });

  await t.test('derives retryCount from attemptCount when retryCount is not provided', () => {
    const result = extractProviderAttemptMetadata({ attemptCount: 4 });
    assert.equal(result.retryCount, 3);

    const singleAttempt = extractProviderAttemptMetadata({ attemptCount: 1 });
    assert.equal(singleAttempt.retryCount, 0);
  });
});

test('summarizeAttemptMetrics', async (t) => {
  await t.test('returns all-zero totals for an empty items array', () => {
    const result = summarizeAttemptMetrics([]);
    assert.deepEqual(result, {
      attemptHistoryEntryCountTotal: 0,
      maxAttemptCount: 0,
      multiAttemptCount: 0,
      retrySucceededCount: 0,
      totalAttemptCount: 0,
      totalRetryCount: 0,
    });
  });

  await t.test('aggregates attemptCount, retryCount, and history length across items', () => {
    const items = [
      { attemptCount: 1, attemptHistory: [{ attempt: 1 }] },
      { attemptCount: 3, attemptHistory: [{ attempt: 1 }, { attempt: 2 }, { attempt: 3 }] },
    ];
    const result = summarizeAttemptMetrics(items);

    assert.equal(result.totalAttemptCount, 4);
    assert.equal(result.maxAttemptCount, 3);
    assert.equal(result.multiAttemptCount, 1); // only the attemptCount:3 item is > 1
    assert.equal(result.attemptHistoryEntryCountTotal, 4);
    assert.equal(result.totalRetryCount, 2); // deriveRetryCount(1)=0, deriveRetryCount(3)=2
  });

  await t.test('counts retrySucceededCount only when attemptCount > 1 AND isSuccessful(item) is true', () => {
    const items = [
      { attemptCount: 2, ok: true },
      { attemptCount: 1, ok: true }, // single attempt, does not count even though "successful"
      { attemptCount: 3, ok: false }, // not successful
    ];
    const result = summarizeAttemptMetrics(items, (item) => item.ok === true);
    assert.equal(result.retrySucceededCount, 1);
  });

  await t.test('defaults isSuccessful to a function returning false when not provided', () => {
    const result = summarizeAttemptMetrics([{ attemptCount: 5 }]);
    assert.equal(result.retrySucceededCount, 0);
  });

  await t.test('treats a missing/non-finite explicit retryCount by deriving from attemptCount', () => {
    const result = summarizeAttemptMetrics([{ attemptCount: 4, retryCount: 'not-a-number' }]);
    assert.equal(result.totalRetryCount, 3);
  });
});

test('extractProviderUsageMetadata', async (t) => {
  await t.test('returns nulls for an empty/undefined item', () => {
    assert.deepEqual(extractProviderUsageMetadata(undefined), {
      estimatedCostUsd: null,
      usageInputTokens: null,
      usageOutputTokens: null,
      usageTotalTokens: null,
    });
  });

  await t.test('normalizes numeric usage fields and rounds estimatedCostUsd', () => {
    const result = extractProviderUsageMetadata({
      estimatedCostUsd: 0.123456789123,
      usageInputTokens: '100',
      usageOutputTokens: 200,
      usageTotalTokens: 300,
    });

    assert.equal(result.estimatedCostUsd, 0.12345679);
    assert.equal(result.usageInputTokens, 100);
    assert.equal(result.usageOutputTokens, 200);
    assert.equal(result.usageTotalTokens, 300);
  });
});

test('summarizeDurationMetrics', async (t) => {
  await t.test('returns nulls and zero total for an empty items array', () => {
    const result = summarizeDurationMetrics([]);
    assert.deepEqual(result, {
      averageDurationMs: null,
      maxDurationMs: null,
      totalDurationMs: 0,
    });
  });

  await t.test('ignores negative and non-finite durations, and computes average/max/total from the rest', () => {
    const result = summarizeDurationMetrics([
      { durationMs: 100 },
      { durationMs: 200 },
      { durationMs: -5 }, // excluded: negative
      { durationMs: 'nope' }, // excluded: non-finite
      { durationMs: 0 }, // included: zero is >= 0
    ]);

    assert.equal(result.totalDurationMs, 300);
    assert.equal(result.averageDurationMs, 100); // (100+200+0)/3 = 100
    assert.equal(result.maxDurationMs, 200);
  });

  await t.test('supports a custom fieldName', () => {
    const result = summarizeDurationMetrics([{ waitMs: 10 }, { waitMs: 30 }], 'waitMs');
    assert.equal(result.totalDurationMs, 40);
    assert.equal(result.averageDurationMs, 20);
    assert.equal(result.maxDurationMs, 30);
  });
});

test('summarizeUsageMetrics', async (t) => {
  await t.test('returns all-zero totals for an empty items array', () => {
    assert.deepEqual(summarizeUsageMetrics([]), {
      usageInputTokensTotal: 0,
      usageOutputTokensTotal: 0,
      usageTotalTokensTotal: 0,
    });
  });

  await t.test('sums usage fields across items, treating missing/invalid values as 0', () => {
    const result = summarizeUsageMetrics([
      { usageInputTokens: 10, usageOutputTokens: 20, usageTotalTokens: 30 },
      { usageInputTokens: 'bad' }, // usageOutputTokens/usageTotalTokens missing entirely
      {},
    ]);

    assert.equal(result.usageInputTokensTotal, 10);
    assert.equal(result.usageOutputTokensTotal, 20);
    assert.equal(result.usageTotalTokensTotal, 30);
  });
});

test('summarizeEstimatedCostMetrics', async (t) => {
  await t.test('returns nulls and a zero priced count for an empty items array', () => {
    const result = summarizeEstimatedCostMetrics([]);
    assert.deepEqual(result, {
      estimatedCostUsdAverage: null,
      estimatedCostUsdMax: null,
      estimatedCostUsdPricedCount: 0,
      estimatedCostUsdTotal: null,
    });
  });

  await t.test('excludes negative and non-finite costs, aggregates the rest', () => {
    const result = summarizeEstimatedCostMetrics([
      { estimatedCostUsd: 1.5 },
      { estimatedCostUsd: 2.5 },
      { estimatedCostUsd: -1 }, // excluded
      { estimatedCostUsd: undefined }, // excluded (roundUsdAmount -> null, not finite)
    ]);

    assert.equal(result.estimatedCostUsdPricedCount, 2);
    assert.equal(result.estimatedCostUsdTotal, 4);
    assert.equal(result.estimatedCostUsdAverage, 2);
    assert.equal(result.estimatedCostUsdMax, 2.5);
  });

  await t.test('supports a custom fieldName', () => {
    const result = summarizeEstimatedCostMetrics([{ costUsd: 3 }, { costUsd: 5 }], 'costUsd');
    assert.equal(result.estimatedCostUsdTotal, 8);
    assert.equal(result.estimatedCostUsdMax, 5);
  });

  await t.test('a single zero-cost item counts as priced (0 is >= 0) and yields zero totals, not null', () => {
    const result = summarizeEstimatedCostMetrics([{ estimatedCostUsd: 0 }]);
    assert.equal(result.estimatedCostUsdPricedCount, 1);
    assert.equal(result.estimatedCostUsdTotal, 0);
    assert.equal(result.estimatedCostUsdAverage, 0);
    assert.equal(result.estimatedCostUsdMax, 0);
  });
});

test('summarizeEstimatedCostBreakdown', async (t) => {
  await t.test('returns an empty object for an empty items array', () => {
    assert.deepEqual(summarizeEstimatedCostBreakdown([], 'providerId'), {});
  });

  await t.test('groups and sums estimatedCostUsd by the given key field', () => {
    const result = summarizeEstimatedCostBreakdown(
      [
        { providerId: 'anthropic', estimatedCostUsd: 1.1 },
        { providerId: 'anthropic', estimatedCostUsd: 2.2 },
        { providerId: 'openai', estimatedCostUsd: 3 },
      ],
      'providerId',
    );

    assert.equal(result.anthropic, 3.3);
    assert.equal(result.openai, 3);
  });

  await t.test('skips items with a missing/empty key or a negative/non-finite cost', () => {
    const result = summarizeEstimatedCostBreakdown(
      [
        { providerId: '', estimatedCostUsd: 5 }, // empty key
        { estimatedCostUsd: 5 }, // missing key
        { providerId: 'anthropic', estimatedCostUsd: -1 }, // negative cost
        { providerId: 'anthropic', estimatedCostUsd: undefined }, // non-finite cost
      ],
      'providerId',
    );

    assert.deepEqual(result, {});
  });

  await t.test('supports a custom costFieldName', () => {
    const result = summarizeEstimatedCostBreakdown(
      [{ model: 'gpt-4', spend: 1 }, { model: 'gpt-4', spend: 2 }],
      'model',
      'spend',
    );
    assert.equal(result['gpt-4'], 3);
  });
});

test('extractProviderFailureMetadata', async (t) => {
  await t.test('handles undefined item, producing all null/zero/empty defaults', () => {
    const result = extractProviderFailureMetadata(undefined);
    assert.equal(result.attemptCount, 0);
    assert.deepEqual(result.attemptHistory, []);
    assert.equal(result.attemptHistoryCount, 0);
    assert.equal(result.retryCount, 0);
    assert.equal(result.durationMs, null);
    assert.equal(result.failureKind, null);
    assert.equal(result.httpStatus, null);
    assert.equal(result.providerResponseId, null);
    assert.equal(result.rawMessage, null);
    assert.equal(result.recoverable, null);
    assert.equal(result.timedOut, false);
    assert.equal(result.estimatedCostUsd, null);
    assert.equal(result.usageInputTokens, null);
    assert.equal(result.usageOutputTokens, null);
    assert.equal(result.usageTotalTokens, null);
  });

  await t.test('merges attempt metadata, failure fields, and usage metadata from a full item', () => {
    const result = extractProviderFailureMetadata({
      attemptCount: 2,
      attemptHistory: [{ attempt: 1 }, { attempt: 2 }],
      durationMs: 500,
      estimatedCostUsd: 1.23456789,
      failureKind: 'timeout',
      httpStatus: 504,
      providerResponseId: 'resp-123',
      rawMessage: 'Gateway timeout',
      recoverable: true,
      retryCount: 1,
      timedOut: true,
      usageInputTokens: 10,
      usageOutputTokens: 20,
      usageTotalTokens: 30,
    });

    assert.equal(result.attemptCount, 2);
    assert.equal(result.attemptHistoryCount, 2);
    assert.equal(result.retryCount, 1);
    assert.equal(result.durationMs, 500);
    assert.equal(result.failureKind, 'timeout');
    assert.equal(result.httpStatus, 504);
    assert.equal(result.providerResponseId, 'resp-123');
    assert.equal(result.rawMessage, 'Gateway timeout');
    assert.equal(result.recoverable, true);
    assert.equal(result.timedOut, true);
    assert.equal(result.estimatedCostUsd, 1.23456789);
    assert.equal(result.usageInputTokens, 10);
    assert.equal(result.usageOutputTokens, 20);
    assert.equal(result.usageTotalTokens, 30);
  });

  await t.test('normalizes an unrecognized failureKind to "unknown" rather than passing it through', () => {
    const result = extractProviderFailureMetadata({ failureKind: 'totally-made-up' });
    assert.equal(result.failureKind, 'unknown');
  });
});
