import {
  acquireProviderRateGuardSlot,
  recordProviderRateLimit,
} from './provider-rate-guard.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeMetricNumber(value, fallback = null) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

export function roundUsdAmount(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Number(numericValue.toFixed(8));
}

export function deriveRetryCount(attemptCount) {
  const normalizedAttemptCount = Number(attemptCount);
  if (!Number.isFinite(normalizedAttemptCount) || normalizedAttemptCount <= 1) {
    return 0;
  }

  return normalizedAttemptCount - 1;
}

function normalizeAttemptHistoryEntry(entry = {}) {
  const attempt = Number(entry.attempt || entry.attemptCount || 0);
  if (!Number.isFinite(attempt) || attempt <= 0) {
    return null;
  }

  return {
    attempt,
    durationMs: normalizeMetricNumber(entry.durationMs),
    failureKind: normalizeText(entry.failureKind) || null,
    httpStatus: Number.isFinite(Number(entry.httpStatus)) ? Number(entry.httpStatus) : null,
    ok: Boolean(entry.ok),
    rawMessage: normalizeText(entry.rawMessage) || null,
    recoverable: typeof entry.recoverable === 'boolean' ? entry.recoverable : null,
    timedOut: Boolean(entry.timedOut),
  };
}

function normalizeAttemptHistory(attemptHistory = []) {
  return Array.isArray(attemptHistory)
    ? attemptHistory.map((entry) => normalizeAttemptHistoryEntry(entry)).filter(Boolean)
    : [];
}

function isRetryableStatus(status) {
  const numericStatus = Number(status);
  return numericStatus === 429 || numericStatus >= 500;
}

export class ProviderFailureError extends Error {
  constructor(message, failure = {}) {
    super(message);
    this.name = 'ProviderFailureError';
    const normalizedAttemptCount = Number(failure.attemptCount || 1);
    const normalizedAttemptHistory = normalizeAttemptHistory(failure.attemptHistory);
    const usage = normalizeUsageMetrics({
      inputTokens: failure.usageInputTokens,
      outputTokens: failure.usageOutputTokens,
      totalTokens: failure.usageTotalTokens,
    });
    this.failure = {
      attemptCount: normalizedAttemptCount,
      attemptHistory: normalizedAttemptHistory,
      durationMs: normalizeMetricNumber(failure.durationMs),
      estimatedCostUsd: roundUsdAmount(failure.estimatedCostUsd),
      failureKind: normalizeText(failure.failureKind, 'unknown'),
      httpStatus: Number.isFinite(Number(failure.httpStatus)) ? Number(failure.httpStatus) : null,
      providerResponseId: normalizeText(failure.providerResponseId) || null,
      rawMessage: normalizeText(failure.rawMessage, message),
      recoverable: Boolean(failure.recoverable),
      retryCount: Number.isFinite(Number(failure.retryCount))
        ? Number(failure.retryCount)
        : deriveRetryCount(normalizedAttemptCount),
      timedOut: Boolean(failure.timedOut),
      usageInputTokens: usage.inputTokens,
      usageOutputTokens: usage.outputTokens,
      usageTotalTokens: usage.totalTokens,
    };
  }
}

export function isProviderFailureError(error) {
  return error instanceof ProviderFailureError;
}

export function createProviderFailure(message, failure = {}) {
  return new ProviderFailureError(message, failure);
}

export function extractProviderFailure(error, fallback = {}) {
  if (isProviderFailureError(error)) {
    return {
      ...error.failure,
      message: error.message,
    };
  }

  return {
    attemptCount: Number(fallback.attemptCount || 1),
    attemptHistory: normalizeAttemptHistory(fallback.attemptHistory),
    durationMs: normalizeMetricNumber(fallback.durationMs),
    estimatedCostUsd: roundUsdAmount(fallback.estimatedCostUsd),
    failureKind: normalizeText(fallback.failureKind, 'unknown'),
    httpStatus: Number.isFinite(Number(fallback.httpStatus)) ? Number(fallback.httpStatus) : null,
    message: error instanceof Error ? error.message : String(error),
    providerResponseId: normalizeText(fallback.providerResponseId) || null,
    rawMessage: normalizeText(fallback.rawMessage, error instanceof Error ? error.message : String(error)),
    recoverable: Boolean(fallback.recoverable),
    retryCount: Number.isFinite(Number(fallback.retryCount))
      ? Number(fallback.retryCount)
      : deriveRetryCount(fallback.attemptCount || 1),
    timedOut: Boolean(fallback.timedOut),
    usageInputTokens: normalizeMetricNumber(fallback.usageInputTokens),
    usageOutputTokens: normalizeMetricNumber(fallback.usageOutputTokens),
    usageTotalTokens: normalizeMetricNumber(fallback.usageTotalTokens),
  };
}

function classifyTransportFailure(error, attemptCount) {
  const message = error instanceof Error ? error.message : String(error);
  const timedOut =
    (error instanceof Error && error.name === 'AbortError') ||
    /timed out|timeout/i.test(message);

  return createProviderFailure(message, {
    attemptCount,
    durationMs: null,
    failureKind: timedOut ? 'timeout' : 'transport',
    rawMessage: message,
    recoverable: true,
    timedOut,
  });
}

export function normalizeUsageMetrics(metrics = {}) {
  const inputTokens = normalizeMetricNumber(metrics.inputTokens, null);
  const outputTokens = normalizeMetricNumber(metrics.outputTokens, null);
  const totalTokens =
    normalizeMetricNumber(metrics.totalTokens, null) ??
    (inputTokens !== null || outputTokens !== null ? Number(inputTokens || 0) + Number(outputTokens || 0) : null);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export function parseOptionalUsdRate(value, label) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number. Received: ${normalized}`);
  }

  return parsed;
}

export function parseOptionalTimeoutMs(value, fallback, label) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return Number(fallback);
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number. Received: ${normalized}`);
  }

  return parsed;
}

export function estimateUsageCostUsd({ pricing = {}, usage = {} } = {}) {
  const inputTokens = normalizeMetricNumber(usage.inputTokens, null);
  const outputTokens = normalizeMetricNumber(usage.outputTokens, null);
  const inputCostPer1MUsd = normalizeMetricNumber(pricing.inputCostPer1MUsd, null);
  const outputCostPer1MUsd = normalizeMetricNumber(pricing.outputCostPer1MUsd, null);

  const hasInputUsage = Number.isFinite(inputTokens) && inputTokens > 0;
  const hasOutputUsage = Number.isFinite(outputTokens) && outputTokens > 0;
  if (!hasInputUsage && !hasOutputUsage) {
    return null;
  }

  if ((hasInputUsage && inputCostPer1MUsd === null) || (hasOutputUsage && outputCostPer1MUsd === null)) {
    return null;
  }

  const estimatedCostUsd =
    Number((hasInputUsage ? inputTokens : 0)) * Number(inputCostPer1MUsd || 0) / 1_000_000 +
    Number((hasOutputUsage ? outputTokens : 0)) * Number(outputCostPer1MUsd || 0) / 1_000_000;

  return roundUsdAmount(estimatedCostUsd);
}

async function readResponseText(response) {
  if (typeof response?.text !== 'function') {
    return '';
  }

  try {
    return await response.text();
  } catch {
    return '';
  }
}

async function parseResponseJson(response, providerLabel, attemptCount) {
  try {
    return await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw createProviderFailure(`${providerLabel} provider returned a non-JSON API payload: ${message}`, {
      attemptCount,
      failureKind: 'unknown',
      rawMessage: message,
      recoverable: false,
      timedOut: false,
    });
  }
}

export async function requestJsonWithPolicy({
  fetchImpl,
  headers = {},
  init = {},
  maxAttempts = 2,
  method = 'GET',
  providerLabel,
  rateLimit = null,
  timeoutMs = 15000,
  url,
}) {
  if (typeof fetchImpl !== 'function') {
    throw createProviderFailure(`Global fetch is not available for the ${providerLabel} provider.`, {
      failureKind: 'transport',
      rawMessage: 'Global fetch is not available.',
      recoverable: false,
      timedOut: false,
    });
  }

  const totalAttempts = Math.max(1, Number(maxAttempts || 1));
  const startedAtMs = Date.now();
  const attemptHistory = [];

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const attemptStartedAtMs = Date.now();
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    let releaseRateGuardSlot = null;
    const timeoutHandle =
      controller && timeoutMs > 0
        ? setTimeout(() => {
            controller.abort();
          }, timeoutMs)
        : null;

    try {
      if (rateLimit) {
        releaseRateGuardSlot = await acquireProviderRateGuardSlot({
          maxConcurrency: rateLimit.maxConcurrency,
          maxRequests: rateLimit.maxRequests,
          nowMs: rateLimit.nowMs,
          scope: rateLimit.scope,
          sleep: rateLimit.sleep,
          windowMs: rateLimit.windowMs,
        });
      }

      const response = await fetchImpl(url, {
        ...init,
        headers,
        method,
        signal: controller?.signal,
      });

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (!response.ok) {
        const errorText = await readResponseText(response);
        const attemptDurationMs = Date.now() - attemptStartedAtMs;
        const failure = createProviderFailure(
          `${providerLabel} provider request failed (${response.status}): ${normalizeText(errorText, 'No response body returned.')}`,
          {
            attemptCount: attempt,
            durationMs: Date.now() - startedAtMs,
            failureKind: 'http-status',
            httpStatus: response.status,
            rawMessage: normalizeText(errorText, `HTTP ${response.status}`),
            recoverable: isRetryableStatus(response.status),
            timedOut: false,
          },
        );
        if (rateLimit && Number(response.status) === 429) {
          recordProviderRateLimit({
            defaultBlockMs: rateLimit?.reactiveBlockMs,
            nowMs: rateLimit?.nowMs,
            response,
            scope: rateLimit?.scope,
          });
        }
        attemptHistory.push(
          normalizeAttemptHistoryEntry({
            attempt,
            durationMs: attemptDurationMs,
            failureKind: failure.failure.failureKind,
            httpStatus: failure.failure.httpStatus,
            ok: false,
            rawMessage: failure.failure.rawMessage,
            recoverable: failure.failure.recoverable,
            timedOut: failure.failure.timedOut,
          }),
        );

        if (failure.failure.recoverable && attempt < totalAttempts) {
          continue;
        }

        throw createProviderFailure(failure.message, {
          ...failure.failure,
          attemptHistory,
          retryCount: deriveRetryCount(attempt),
        });
      }

      let payload;
      try {
        payload = await parseResponseJson(response, providerLabel, attempt);
      } catch (error) {
        const normalizedFailure = isProviderFailureError(error) ? error : classifyTransportFailure(error, attempt);
        const attemptDurationMs = Date.now() - attemptStartedAtMs;
        attemptHistory.push(
          normalizeAttemptHistoryEntry({
            attempt,
            durationMs: attemptDurationMs,
            failureKind: normalizedFailure.failure.failureKind,
            httpStatus: normalizedFailure.failure.httpStatus,
            ok: false,
            rawMessage: normalizedFailure.failure.rawMessage,
            recoverable: normalizedFailure.failure.recoverable,
            timedOut: normalizedFailure.failure.timedOut,
          }),
        );
        throw createProviderFailure(normalizedFailure.message, {
          ...normalizedFailure.failure,
          attemptHistory,
          durationMs: Date.now() - startedAtMs,
          retryCount: deriveRetryCount(attempt),
        });
      }

      attemptHistory.push(
        normalizeAttemptHistoryEntry({
          attempt,
          durationMs: Date.now() - attemptStartedAtMs,
          httpStatus: Number.isFinite(Number(response.status)) ? Number(response.status) : null,
          ok: true,
          rawMessage: null,
          recoverable: false,
          timedOut: false,
        }),
      );
      return {
        attemptCount: attempt,
        attemptHistory,
        durationMs: Date.now() - startedAtMs,
        payload,
        retryCount: deriveRetryCount(attempt),
      };
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (isProviderFailureError(error) && Array.isArray(error.failure?.attemptHistory)) {
        if (error.failure.recoverable && attempt < totalAttempts) {
          continue;
        }
        throw error;
      }

      const normalizedFailure = isProviderFailureError(error) ? error : classifyTransportFailure(error, attempt);
      const attemptDurationMs = Date.now() - attemptStartedAtMs;
      attemptHistory.push(
        normalizeAttemptHistoryEntry({
          attempt,
          durationMs: attemptDurationMs,
          failureKind: normalizedFailure.failure.failureKind,
          httpStatus: normalizedFailure.failure.httpStatus,
          ok: false,
          rawMessage: normalizedFailure.failure.rawMessage,
          recoverable: normalizedFailure.failure.recoverable,
          timedOut: normalizedFailure.failure.timedOut,
        }),
      );
      const failureWithDuration = createProviderFailure(normalizedFailure.message, {
        ...normalizedFailure.failure,
        attemptHistory,
        durationMs: Date.now() - startedAtMs,
        retryCount: deriveRetryCount(attempt),
      });
      if (failureWithDuration.failure.recoverable && attempt < totalAttempts) {
        continue;
      }
      throw failureWithDuration;
    } finally {
      if (typeof releaseRateGuardSlot === 'function') {
        releaseRateGuardSlot();
      }
    }
  }

  throw createProviderFailure(`${providerLabel} provider request failed.`, {
    attemptCount: totalAttempts,
    attemptHistory,
    durationMs: Date.now() - startedAtMs,
    failureKind: 'unknown',
    rawMessage: 'Provider request failed without a captured error.',
    recoverable: false,
    retryCount: deriveRetryCount(totalAttempts),
    timedOut: false,
  });
}
