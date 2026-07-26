import { createHash } from 'node:crypto';

import { createCachedLocalRelevanceScorer } from '../src/core/local-relevance-score-cache.mjs';
import { buildLocalRelevanceCacheInputHash } from '../src/core/local-relevance-shadow-cache-process-isolation.mjs';
import { createOllamaRelevanceScorer } from '../src/core/ollama-relevance-scorer.mjs';

const MAX_INPUT_BYTES = 64 * 1024;
const MAX_TEXT_LENGTH = 16_000;
const WORKER_IDS = new Set([
  'forced-worker',
  'recovery-worker',
  'soak-worker',
  'worker-a',
  'worker-b',
  'worker-a-restarted',
]);
const WORKER_MODES = new Set(['bounded-soak', 'complete', 'wait-for-termination']);

try {
  const input = normalizeInput(JSON.parse(await readStdin()));
  const scorer = createOllamaRelevanceScorer({
    endpoint: input.endpoint,
    model: input.model,
    timeoutMs: input.timeoutMs,
  });
  const cache = createCachedLocalRelevanceScorer({
    maxEntries: input.mode === 'bounded-soak' ? input.capacity : 4,
    modelDigest: input.modelDigest,
    scorer,
  });
  const scoreInput = {
    documentText: input.documentText,
    queryText: input.queryText,
  };
  const initialCacheSnapshot = cache.getCacheSnapshot();
  const result = input.mode === 'bounded-soak'
    ? await runBoundedSoak({ cache, input, initialCacheSnapshot, scoreInput })
    : await runRegularWorker({ cache, input, initialCacheSnapshot, scoreInput });
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${String(error?.message || error).slice(0, 500)}\n`);
  process.exitCode = 1;
}

async function runRegularWorker({ cache, input, initialCacheSnapshot, scoreInput }) {
  const firstResult = await cache.scoreDocument(scoreInput);
  const cachedResult = await cache.scoreDocument(scoreInput);
  const warmCacheSnapshot = cache.getCacheSnapshot();
  const sharedResult = {
    cachedScore: cachedResult.score,
    ...environmentSummary(),
    firstScore: firstResult.score,
    inputHash: buildLocalRelevanceCacheInputHash(scoreInput),
    ...processIdentity(input.runId),
    warmCacheSnapshot,
    workerId: input.workerId,
  };
  if (input.mode === 'wait-for-termination') {
    process.stdout.write(`${JSON.stringify({
      ...sharedResult,
      state: 'ready-for-termination',
    })}\n`);
    await new Promise(() => setInterval(() => {}, 60_000));
  }
  const closedCacheSnapshot = cache.closeCache({ reason: 'shutdown' });
  const postCloseScoreRejected = await rejectsAfterClose(cache, scoreInput);
  const result = {
    ...sharedResult,
    closedCacheSnapshot,
    initialCacheSnapshot,
    postCloseScoreRejected,
  };
  return result;
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function environmentSummary() {
  const environmentKeys = Object.keys(process.env);
  const platformEnvironmentKeys = environmentKeys.filter(
    (key) => key === '__CF_USER_TEXT_ENCODING',
  );
  return {
    environmentKeyCount: environmentKeys.length,
    forwardedEnvironmentKeyCount: environmentKeys.length - platformEnvironmentKeys.length,
    platformEnvironmentKeyCount: platformEnvironmentKeys.length,
    secretEnvironmentKeyFound: environmentKeys.some((key) =>
      /(key|token|secret|password|credential)/i.test(key),
    ),
  };
}

function processIdentity(runId) {
  return {
    parentProcessIdentityHash: hashRecord({ processId: process.ppid, runId }),
    processIdentityHash: hashRecord({ processId: process.pid, runId }),
  };
}

function memorySample() {
  const memory = process.memoryUsage();
  return {
    heapUsedBytes: memory.heapUsed,
    rssBytes: memory.rss,
  };
}

function updatePeak(peak, current) {
  peak.heapUsedBytes = Math.max(peak.heapUsedBytes, current.heapUsedBytes);
  peak.rssBytes = Math.max(peak.rssBytes, current.rssBytes);
}

function soakScoreInput(scoreInput, index) {
  return {
    documentText: `${scoreInput.documentText}\nCACHE_SOAK_DOCUMENT_VARIANT:${index}`,
    queryText: `${scoreInput.queryText}\nCACHE_SOAK_QUERY_VARIANT:${index}`,
  };
}

async function runBoundedSoak({ cache, input, initialCacheSnapshot, scoreInput }) {
  const startMemory = memorySample();
  const peakMemory = { ...startMemory };
  let scoreMinimum = 100;
  let scoreMaximum = 0;
  for (let index = 0; index < input.pairCount; index += 1) {
    const result = await cache.scoreDocument(soakScoreInput(scoreInput, index));
    scoreMinimum = Math.min(scoreMinimum, result.score);
    scoreMaximum = Math.max(scoreMaximum, result.score);
    updatePeak(peakMemory, memorySample());
  }
  for (let index = input.pairCount - input.replayCount; index < input.pairCount; index += 1) {
    await cache.scoreDocument(soakScoreInput(scoreInput, index));
    updatePeak(peakMemory, memorySample());
  }
  const saturatedCacheSnapshot = cache.getCacheSnapshot();
  const closedCacheSnapshot = cache.closeCache({ reason: 'shutdown' });
  const postCloseScoreRejected = await rejectsAfterClose(cache, scoreInput);
  const finalMemory = memorySample();
  updatePeak(peakMemory, finalMemory);
  return {
    capacity: input.capacity,
    closedCacheSnapshot,
    ...environmentSummary(),
    finalMemory,
    heapGrowthBytes: Math.max(0, finalMemory.heapUsedBytes - startMemory.heapUsedBytes),
    initialCacheSnapshot,
    inputHash: buildLocalRelevanceCacheInputHash(scoreInput),
    pairCount: input.pairCount,
    ...processIdentity(input.runId),
    peakMemory,
    postCloseScoreRejected,
    replayCount: input.replayCount,
    rssGrowthBytes: Math.max(0, finalMemory.rssBytes - startMemory.rssBytes),
    saturatedCacheSnapshot,
    scoreMaximum,
    scoreMinimum,
    startMemory,
    workerId: input.workerId,
  };
}

async function rejectsAfterClose(cache, scoreInput) {
  try {
    await cache.scoreDocument(scoreInput);
    return false;
  } catch (error) {
    return /cache is closed/.test(error.message);
  }
}

function normalizeInput(input = {}) {
  const normalized = {
    documentText: String(input.documentText || ''),
    endpoint: String(input.endpoint || '').trim(),
    model: String(input.model || '').trim(),
    modelDigest: String(input.modelDigest || '').trim(),
    mode: String(input.mode || 'complete').trim(),
    capacity: Number(input.capacity),
    pairCount: Number(input.pairCount),
    queryText: String(input.queryText || ''),
    replayCount: Number(input.replayCount),
    runId: String(input.runId || '').trim(),
    timeoutMs: Number(input.timeoutMs),
    workerId: String(input.workerId || '').trim(),
  };
  if (
    !WORKER_IDS.has(normalized.workerId) ||
    !WORKER_MODES.has(normalized.mode) ||
    !normalized.runId ||
    normalized.runId.length > 200 ||
    !normalized.endpoint ||
    !normalized.model ||
    normalized.model.length > 200 ||
    !/^[a-f0-9]{64}$/.test(normalized.modelDigest) ||
    !Number.isInteger(normalized.timeoutMs) ||
    normalized.timeoutMs <= 0 ||
    !normalized.documentText.trim() ||
    normalized.documentText.length > MAX_TEXT_LENGTH ||
    !normalized.queryText.trim() ||
    normalized.queryText.length > MAX_TEXT_LENGTH
  ) {
    throw new Error('Local relevance cache worker input is invalid.');
  }
  if (
    (normalized.mode === 'wait-for-termination' && normalized.workerId !== 'forced-worker') ||
    (normalized.mode === 'bounded-soak' && normalized.workerId !== 'soak-worker') ||
    (normalized.mode === 'bounded-soak' && (
      !Number.isInteger(normalized.capacity) ||
      normalized.capacity <= 0 ||
      normalized.capacity > 64 ||
      !Number.isInteger(normalized.pairCount) ||
      normalized.pairCount <= normalized.capacity ||
      normalized.pairCount > 128 ||
      !Number.isInteger(normalized.replayCount) ||
      normalized.replayCount <= 0 ||
      normalized.replayCount > normalized.capacity
    ))
  ) {
    throw new Error('Local relevance cache worker mode is invalid.');
  }
  return normalized;
}

async function readStdin() {
  const chunks = [];
  let receivedBytes = 0;
  for await (const chunk of process.stdin) {
    receivedBytes += chunk.length;
    if (receivedBytes > MAX_INPUT_BYTES) {
      throw new Error(`Local relevance cache worker input exceeds ${MAX_INPUT_BYTES} bytes.`);
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, receivedBytes).toString('utf8');
}
