import { PROVIDER_FAILURE_KINDS } from './constants.mjs';
import { deriveRetryCount, roundUsdAmount } from '../providers/provider-runtime-utils.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function normalizeProviderFailureKind(value) {
  const normalized = normalizeText(value);
  return PROVIDER_FAILURE_KINDS.includes(normalized) ? normalized : 'unknown';
}

export function summarizeFailureKinds(items) {
  const counts = Object.fromEntries(PROVIDER_FAILURE_KINDS.map((kind) => [kind, 0]));

  for (const item of items) {
    const failureKind = normalizeProviderFailureKind(item.failureKind);
    if (item.failureKind) {
      counts[failureKind] += 1;
    }
  }

  return counts;
}

export function normalizeTelemetryNumber(value, fallback = null) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function normalizeProviderAttemptHistory(items = []) {
  return Array.isArray(items)
    ? items
        .map((item) => {
          const attempt = Number(item?.attempt || item?.attemptCount || 0);
          if (!Number.isFinite(attempt) || attempt <= 0) {
            return null;
          }

          return {
            attempt,
            durationMs: normalizeTelemetryNumber(item?.durationMs),
            failureKind: normalizeText(item?.failureKind) ? normalizeProviderFailureKind(item.failureKind) : null,
            httpStatus: Number.isFinite(Number(item?.httpStatus)) ? Number(item.httpStatus) : null,
            ok: Boolean(item?.ok),
            rawMessage: normalizeText(item?.rawMessage) || null,
            recoverable: typeof item?.recoverable === 'boolean' ? item.recoverable : null,
            timedOut: Boolean(item?.timedOut),
          };
        })
        .filter(Boolean)
    : [];
}

export function extractProviderAttemptMetadata(item) {
  const attemptHistory = normalizeProviderAttemptHistory(item?.attemptHistory);
  const fallbackAttemptCount = attemptHistory.at(-1)?.attempt || 0;
  const attemptCount = Number.isFinite(Number(item?.attemptCount))
    ? Number(item.attemptCount)
    : fallbackAttemptCount;
  const retryCount = Number.isFinite(Number(item?.retryCount))
    ? Number(item.retryCount)
    : deriveRetryCount(attemptCount);

  return {
    attemptCount,
    attemptHistory,
    attemptHistoryCount: attemptHistory.length,
    retryCount,
  };
}

export function summarizeAttemptMetrics(items, isSuccessful = () => false) {
  return items.reduce(
    (summary, item) => {
      const attemptCount = Number(item?.attemptCount || 0);
      const retryCount = Number.isFinite(Number(item?.retryCount))
        ? Number(item.retryCount)
        : deriveRetryCount(attemptCount);

      return {
        attemptHistoryEntryCountTotal:
          summary.attemptHistoryEntryCountTotal + normalizeProviderAttemptHistory(item?.attemptHistory).length,
        maxAttemptCount: Math.max(summary.maxAttemptCount, attemptCount),
        multiAttemptCount: summary.multiAttemptCount + (attemptCount > 1 ? 1 : 0),
        retrySucceededCount: summary.retrySucceededCount + (attemptCount > 1 && isSuccessful(item) ? 1 : 0),
        totalAttemptCount: summary.totalAttemptCount + attemptCount,
        totalRetryCount: summary.totalRetryCount + retryCount,
      };
    },
    {
      attemptHistoryEntryCountTotal: 0,
      maxAttemptCount: 0,
      multiAttemptCount: 0,
      retrySucceededCount: 0,
      totalAttemptCount: 0,
      totalRetryCount: 0,
    },
  );
}

export function extractProviderUsageMetadata(item) {
  return {
    estimatedCostUsd: roundUsdAmount(item?.estimatedCostUsd),
    usageInputTokens: normalizeTelemetryNumber(item?.usageInputTokens),
    usageOutputTokens: normalizeTelemetryNumber(item?.usageOutputTokens),
    usageTotalTokens: normalizeTelemetryNumber(item?.usageTotalTokens),
  };
}

export function summarizeDurationMetrics(items, fieldName = 'durationMs') {
  const durations = items
    .map((item) => normalizeTelemetryNumber(item?.[fieldName]))
    .filter((value) => Number.isFinite(value) && value >= 0);

  const totalDurationMs = durations.reduce((sum, value) => sum + value, 0);
  return {
    averageDurationMs: durations.length ? Math.round(totalDurationMs / durations.length) : null,
    maxDurationMs: durations.length ? Math.max(...durations) : null,
    totalDurationMs,
  };
}

export function summarizeUsageMetrics(items) {
  return items.reduce(
    (totals, item) => ({
      usageInputTokensTotal: totals.usageInputTokensTotal + Number(normalizeTelemetryNumber(item?.usageInputTokens, 0) || 0),
      usageOutputTokensTotal:
        totals.usageOutputTokensTotal + Number(normalizeTelemetryNumber(item?.usageOutputTokens, 0) || 0),
      usageTotalTokensTotal: totals.usageTotalTokensTotal + Number(normalizeTelemetryNumber(item?.usageTotalTokens, 0) || 0),
    }),
    {
      usageInputTokensTotal: 0,
      usageOutputTokensTotal: 0,
      usageTotalTokensTotal: 0,
    },
  );
}

export function summarizeEstimatedCostMetrics(items, fieldName = 'estimatedCostUsd') {
  const pricedValues = items
    .map((item) => roundUsdAmount(item?.[fieldName]))
    .filter((value) => Number.isFinite(value) && value >= 0);
  const totalEstimatedCostUsd = roundUsdAmount(pricedValues.reduce((sum, value) => sum + value, 0));

  return {
    estimatedCostUsdAverage: pricedValues.length ? roundUsdAmount(totalEstimatedCostUsd / pricedValues.length) : null,
    estimatedCostUsdMax: pricedValues.length ? roundUsdAmount(Math.max(...pricedValues)) : null,
    estimatedCostUsdPricedCount: pricedValues.length,
    estimatedCostUsdTotal: pricedValues.length ? totalEstimatedCostUsd : null,
  };
}

export function summarizeEstimatedCostBreakdown(items, keyFieldName, costFieldName = 'estimatedCostUsd') {
  return items.reduce((totals, item) => {
    const key = normalizeText(item?.[keyFieldName]);
    const estimatedCostUsd = roundUsdAmount(item?.[costFieldName]);

    if (!key || !Number.isFinite(estimatedCostUsd) || estimatedCostUsd < 0) {
      return totals;
    }

    return {
      ...totals,
      [key]: roundUsdAmount(Number(totals[key] || 0) + estimatedCostUsd),
    };
  }, {});
}

export function extractProviderFailureMetadata(item) {
  const attemptMetadata = extractProviderAttemptMetadata(item);
  return {
    ...attemptMetadata,
    durationMs: normalizeTelemetryNumber(item?.durationMs),
    failureKind: normalizeText(item?.failureKind) ? normalizeProviderFailureKind(item.failureKind) : null,
    httpStatus: Number.isFinite(Number(item?.httpStatus)) ? Number(item.httpStatus) : null,
    providerResponseId: normalizeText(item?.providerResponseId) || null,
    rawMessage: normalizeText(item?.rawMessage) || null,
    recoverable: typeof item?.recoverable === 'boolean' ? item.recoverable : null,
    timedOut: Boolean(item?.timedOut),
    ...extractProviderUsageMetadata(item),
  };
}
