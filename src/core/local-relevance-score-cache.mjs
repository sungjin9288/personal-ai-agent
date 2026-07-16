import { createHash } from 'node:crypto';

export const LOCAL_RELEVANCE_SCORE_CACHE_SCHEMA_VERSION =
  'personal-ai-agent-local-relevance-score-cache/v1';

const DEFAULT_MAX_ENTRIES = 64;
const MAX_ENTRIES = 4_096;

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
  const metrics = {
    evictionCount: 0,
    failureCount: 0,
    hitCount: 0,
    inFlightHitCount: 0,
    missCount: 0,
    modelInferenceCount: 0,
    requestCount: 0,
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
    const pending = Promise.resolve()
      .then(() => scorer.scoreDocument(input))
      .then(normalizeScoreResult)
      .then((result) => {
        storeCompleted(key, result);
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
      inFlight.delete(key);
    }
  }

  function getCacheSnapshot() {
    return {
      binding: { ...binding, bindingHash },
      completedEntryCount: completed.size,
      completedEntryContentRetained: false,
      externalProviderCalls: 'none',
      maxEntries: capacity,
      metrics: { ...metrics },
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
    getCacheSnapshot,
    scoreDocument,
  };
}
