function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeMetricNumber(value, fallback = null) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function isRetryableStatus(status) {
  const numericStatus = Number(status);
  return numericStatus === 429 || numericStatus >= 500;
}

export class ProviderFailureError extends Error {
  constructor(message, failure = {}) {
    super(message);
    this.name = 'ProviderFailureError';
    this.failure = {
      attemptCount: Number(failure.attemptCount || 1),
      durationMs: normalizeMetricNumber(failure.durationMs),
      failureKind: normalizeText(failure.failureKind, 'unknown'),
      httpStatus: Number.isFinite(Number(failure.httpStatus)) ? Number(failure.httpStatus) : null,
      providerResponseId: normalizeText(failure.providerResponseId) || null,
      rawMessage: normalizeText(failure.rawMessage, message),
      recoverable: Boolean(failure.recoverable),
      timedOut: Boolean(failure.timedOut),
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
    durationMs: normalizeMetricNumber(fallback.durationMs),
    failureKind: normalizeText(fallback.failureKind, 'unknown'),
    httpStatus: Number.isFinite(Number(fallback.httpStatus)) ? Number(fallback.httpStatus) : null,
    message: error instanceof Error ? error.message : String(error),
    providerResponseId: normalizeText(fallback.providerResponseId) || null,
    rawMessage: normalizeText(fallback.rawMessage, error instanceof Error ? error.message : String(error)),
    recoverable: Boolean(fallback.recoverable),
    timedOut: Boolean(fallback.timedOut),
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

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutHandle =
      controller && timeoutMs > 0
        ? setTimeout(() => {
            controller.abort();
          }, timeoutMs)
        : null;

    try {
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

        if (failure.failure.recoverable && attempt < totalAttempts) {
          continue;
        }

        throw failure;
      }

      const payload = await parseResponseJson(response, providerLabel, attempt);
      return {
        attemptCount: attempt,
        durationMs: Date.now() - startedAtMs,
        payload,
      };
    } catch (error) {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      const normalizedFailure = isProviderFailureError(error) ? error : classifyTransportFailure(error, attempt);
      const failureWithDuration = createProviderFailure(normalizedFailure.message, {
        ...normalizedFailure.failure,
        durationMs: Date.now() - startedAtMs,
      });
      if (failureWithDuration.failure.recoverable && attempt < totalAttempts) {
        continue;
      }
      throw failureWithDuration;
    }
  }

  throw createProviderFailure(`${providerLabel} provider request failed.`, {
    attemptCount: totalAttempts,
    durationMs: Date.now() - startedAtMs,
    failureKind: 'unknown',
    rawMessage: 'Provider request failed without a captured error.',
    recoverable: false,
    timedOut: false,
  });
}
