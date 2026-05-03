const DEFAULT_SCOPE = 'default-provider';

const guardStates = new Map();

function normalizeNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function normalizeScope(scope) {
  return String(scope || DEFAULT_SCOPE).trim() || DEFAULT_SCOPE;
}

function defaultNowMs() {
  return Date.now();
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function getState(scope) {
  const normalizedScope = normalizeScope(scope);
  const existing = guardStates.get(normalizedScope);
  if (existing) {
    return existing;
  }

  const state = {
    activeCount: 0,
    blockedUntilMs: 0,
    queue: [],
    scope: normalizedScope,
    timestamps: [],
  };
  guardStates.set(normalizedScope, state);
  return state;
}

async function waitForConcurrencySlot(state, maxConcurrency) {
  if (state.activeCount < maxConcurrency) {
    state.activeCount += 1;
    return;
  }

  await new Promise((resolve) => {
    state.queue.push(resolve);
  });
  state.activeCount += 1;
}

function releaseConcurrencySlot(state) {
  state.activeCount = Math.max(0, state.activeCount - 1);
  const next = state.queue.shift();
  if (next) {
    next();
  }
}

function pruneTimestamps(state, nowMs, windowMs) {
  const oldestAllowedMs = nowMs - windowMs;
  state.timestamps = state.timestamps.filter((timestamp) => timestamp > oldestAllowedMs);
}

function readRetryAfterMs(response) {
  const retryAfter = response?.headers?.get?.('retry-after');
  if (!retryAfter) {
    return null;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAtMs = Date.parse(retryAfter);
  if (Number.isFinite(retryAtMs)) {
    return Math.max(0, retryAtMs - Date.now());
  }

  return null;
}

export function resetProviderRateGuards() {
  guardStates.clear();
}

export function getProviderRateGuardSnapshot(scope = DEFAULT_SCOPE, { nowMs = defaultNowMs } = {}) {
  const state = getState(scope);
  const now = nowMs();
  return {
    activeCount: state.activeCount,
    blockedUntilMs: state.blockedUntilMs,
    queueDepth: state.queue.length,
    remainingBlockedMs: Math.max(0, state.blockedUntilMs - now),
    scope: state.scope,
    windowRequestCount: state.timestamps.length,
  };
}

export async function acquireProviderRateGuardSlot({
  scope = DEFAULT_SCOPE,
  maxConcurrency = 1,
  maxRequests = 0,
  nowMs = defaultNowMs,
  sleep = defaultSleep,
  windowMs = 60_000,
} = {}) {
  const limit = normalizeNumber(maxRequests, 0);
  const windowDurationMs = normalizeNumber(windowMs, 60_000);
  const concurrency = Math.max(1, normalizeNumber(maxConcurrency, 1));
  const state = getState(scope);

  await waitForConcurrencySlot(state, concurrency);

  try {
    const blockedWaitMs = Math.max(0, state.blockedUntilMs - nowMs());
    if (blockedWaitMs > 0) {
      await sleep(blockedWaitMs);
    }

    if (limit > 0) {
      pruneTimestamps(state, nowMs(), windowDurationMs);
      if (state.timestamps.length >= limit) {
        const oldestTimestamp = state.timestamps[0];
        const waitMs = Math.max(0, oldestTimestamp + windowDurationMs - nowMs());
        if (waitMs > 0) {
          await sleep(waitMs);
        }
        pruneTimestamps(state, nowMs(), windowDurationMs);
      }
      state.timestamps.push(nowMs());
    }

    return () => releaseConcurrencySlot(state);
  } catch (error) {
    releaseConcurrencySlot(state);
    throw error;
  }
}

export function recordProviderRateLimit({
  defaultBlockMs = 1000,
  response = null,
  scope = DEFAULT_SCOPE,
  nowMs = defaultNowMs,
} = {}) {
  const state = getState(scope);
  const retryAfterMs = readRetryAfterMs(response);
  const blockMs = normalizeNumber(retryAfterMs, normalizeNumber(defaultBlockMs, 1000));
  state.blockedUntilMs = Math.max(state.blockedUntilMs, nowMs() + blockMs);

  return {
    blockedUntilMs: state.blockedUntilMs,
    blockMs,
    scope: state.scope,
  };
}
