import { createHash } from 'node:crypto';

export const LOCAL_RELEVANCE_SCORE_CACHE_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-score-cache/v1';

const DEFAULT_MAX_ENTRIES = 64;
const MAX_ENTRIES = 4_096;
const INVALIDATION_REASONS = new Set([
  'manual',
  'model-or-prompt-replaced',
  'rollback',
  'shutdown',
]);

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashText(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeMaxEntries(value) {
  const maxEntries = value === undefined ? DEFAULT_MAX_ENTRIES : Number(value);
  if (!Number.isInteger(maxEntries) || maxEntries <= 0 || maxEntries > MAX_ENTRIES) {
    throw new Error(`Local relevance score cache maxEntries must be between 1 and ${MAX_ENTRIES}.`);
  }
  return maxEntries;
}

function normalizeBinding({ modelDigest, scorer } = {}) {
  const binding = {
    modelDigest: normalizeText(modelDigest),
    modelId: normalizeText(scorer?.modelId),
    promptHash: normalizeText(scorer?.promptHash),
    promptVersion: normalizeText(scorer?.promptVersion),
    scorerId: normalizeText(scorer?.id),
  };
  if (
    typeof scorer?.scoreDocument !== 'function' ||
    !binding.scorerId ||
    !binding.modelId ||
    !/^[a-f0-9]{64}$/.test(binding.modelDigest) ||
    !/^[a-f0-9]{64}$/.test(binding.promptHash) ||
    !binding.promptVersion
  ) {
    throw new Error('Local relevance score cache requires a complete scorer binding.');
  }
  return binding;
}

function normalizeScoreResult(result) {
  const score = Number(result?.score);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error('Local relevance score cache received an invalid score.');
  }
  return { score };
}

function normalizeInvalidationReason(value) {
  const reason = normalizeText(value);
  if (!INVALIDATION_REASONS.has(reason)) {
    throw new Error('Local relevance score cache requires a supported invalidation reason.');
  }
  return reason;
}

function cloneScore(result) {
  return { score: result.score };
}

export function createCachedLocalRelevanceScorer({
  maxEntries,
  modelDigest,
  scorer,
} = {}) {
  const capacity = normalizeMaxEntries(maxEntries);
  const binding = normalizeBinding({ modelDigest, scorer });
  const bindingHash = hashRecord(binding);
  const completed = new Map();
  const inFlight = new Map();
  let closed = false;
  let generation = 0;
  let lastInvalidationReason = null;
  const metrics = {
    evictionCount: 0,
    failureCount: 0,
    hitCount: 0,
    inFlightHitCount: 0,
    invalidatedCompletedEntryCount: 0,
    invalidatedInFlightEntryCount: 0,
    invalidationCount: 0,
    missCount: 0,
    modelInferenceCount: 0,
    requestCount: 0,
    staleResultDropCount: 0,
  };

  function cacheKey({ documentText, queryText } = {}) {
    return hashRecord({
      bindingHash,
      documentHash: hashText(documentText),
      queryHash: hashText(queryText),
    });
  }

  function readCompleted(key) {
    const result = completed.get(key);
    if (!result) {
      return null;
    }
    completed.delete(key);
    completed.set(key, result);
    return cloneScore(result);
  }

  function storeCompleted(key, result) {
    completed.set(key, result);
    if (completed.size <= capacity) {
      return;
    }
    const oldestKey = completed.keys().next().value;
    completed.delete(oldestKey);
    metrics.evictionCount += 1;
  }

  async function scoreDocument(input = {}) {
    if (closed) {
      throw new Error('Local relevance score cache is closed.');
    }
    metrics.requestCount += 1;
    const key = cacheKey(input);
    const cached = readCompleted(key);
    if (cached) {
      metrics.hitCount += 1;
      return cached;
    }
    if (inFlight.has(key)) {
      metrics.inFlightHitCount += 1;
      return cloneScore(await inFlight.get(key));
    }

    metrics.missCount += 1;
    metrics.modelInferenceCount += 1;
    const requestGeneration = generation;
    const pending = Promise.resolve()
      .then(() => scorer.scoreDocument(input))
      .then(normalizeScoreResult)
      .then((result) => {
        if (!closed && requestGeneration === generation) {
          storeCompleted(key, result);
        } else {
          metrics.staleResultDropCount += 1;
        }
        return result;
      })
      .catch((error) => {
        metrics.failureCount += 1;
        throw error;
      });
    inFlight.set(key, pending);
    try {
      return cloneScore(await pending);
    } finally {
      if (inFlight.get(key) === pending) {
        inFlight.delete(key);
      }
    }
  }

  function invalidateEntries(reason) {
    const invalidationReason = normalizeInvalidationReason(reason);
    metrics.invalidatedCompletedEntryCount += completed.size;
    metrics.invalidatedInFlightEntryCount += inFlight.size;
    metrics.invalidationCount += 1;
    generation += 1;
    lastInvalidationReason = invalidationReason;
    completed.clear();
    inFlight.clear();
  }

  function invalidateCache({ reason } = {}) {
    if (closed) {
      throw new Error('Local relevance score cache is closed.');
    }
    invalidateEntries(reason);
    return getCacheSnapshot();
  }

  function closeCache({ reason = 'shutdown' } = {}) {
    if (!closed) {
      invalidateEntries(reason);
      closed = true;
    }
    return getCacheSnapshot();
  }

  function getCacheSnapshot() {
    return {
      binding: { ...binding, bindingHash },
      closed,
      completedEntryCount: completed.size,
      completedEntryContentRetained: false,
      externalProviderCalls: 'none',
      maxEntries: capacity,
      metrics: { ...metrics },
      generation,
      lastInvalidationReason,
      pendingEntryCount: inFlight.size,
      persistent: false,
      productionReadyClaim: false,
      runtimeActivation: false,
      schemaVersion: LOCAL_RELEVANCE_SCORE_CACHE_SCHEMA_VERSION,
      strategy: 'bounded-process-local-lru',
    };
  }

  return {
    id: binding.scorerId,
    modelId: binding.modelId,
    promptHash: binding.promptHash,
    promptVersion: binding.promptVersion,
    closeCache,
    getCacheSnapshot,
    invalidateCache,
    scoreDocument,
  };
}
