import { createHash } from 'node:crypto';

import { createCachedLocalRelevanceScorer } from '../src/core/local-relevance-score-cache.mjs';
import { buildLocalRelevanceCacheInputHash } from '../src/core/local-relevance-shadow-cache-process-isolation.mjs';
import { createOllamaRelevanceScorer } from '../src/core/ollama-relevance-scorer.mjs';

const MAX_INPUT_BYTES = 64 * 1024;
const MAX_TEXT_LENGTH = 16_000;
const WORKER_IDS = new Set(['worker-a', 'worker-b', 'worker-a-restarted']);

try {
  const input = normalizeInput(JSON.parse(await readStdin()));
  const scorer = createOllamaRelevanceScorer({
    endpoint: input.endpoint,
    model: input.model,
    timeoutMs: input.timeoutMs,
  });
  const cache = createCachedLocalRelevanceScorer({
    maxEntries: 4,
    modelDigest: input.modelDigest,
    scorer,
  });
  const scoreInput = {
    documentText: input.documentText,
    queryText: input.queryText,
  };
  const initialCacheSnapshot = cache.getCacheSnapshot();
  const firstResult = await cache.scoreDocument(scoreInput);
  const cachedResult = await cache.scoreDocument(scoreInput);
  const warmCacheSnapshot = cache.getCacheSnapshot();
  const closedCacheSnapshot = cache.closeCache({ reason: 'shutdown' });
  let postCloseScoreRejected = false;
  try {
    await cache.scoreDocument(scoreInput);
  } catch (error) {
    postCloseScoreRejected = /cache is closed/.test(error.message);
  }
  const environmentKeys = Object.keys(process.env);
  const platformEnvironmentKeys = environmentKeys.filter(
    (key) => key === '__CF_USER_TEXT_ENCODING',
  );
  const secretEnvironmentKeyFound = environmentKeys.some((key) =>
    /(key|token|secret|password|credential)/i.test(key),
  );
  const result = {
    cachedScore: cachedResult.score,
    closedCacheSnapshot,
    environmentKeyCount: environmentKeys.length,
    firstScore: firstResult.score,
    forwardedEnvironmentKeyCount: environmentKeys.length - platformEnvironmentKeys.length,
    initialCacheSnapshot,
    inputHash: buildLocalRelevanceCacheInputHash(scoreInput),
    parentProcessIdentityHash: hashRecord({ processId: process.ppid, runId: input.runId }),
    platformEnvironmentKeyCount: platformEnvironmentKeys.length,
    postCloseScoreRejected,
    processIdentityHash: hashRecord({ processId: process.pid, runId: input.runId }),
    secretEnvironmentKeyFound,
    warmCacheSnapshot,
    workerId: input.workerId,
  };
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${String(error?.message || error).slice(0, 500)}\n`);
  process.exitCode = 1;
}

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function normalizeInput(input = {}) {
  const normalized = {
    documentText: String(input.documentText || ''),
    endpoint: String(input.endpoint || '').trim(),
    model: String(input.model || '').trim(),
    modelDigest: String(input.modelDigest || '').trim(),
    queryText: String(input.queryText || ''),
    runId: String(input.runId || '').trim(),
    timeoutMs: Number(input.timeoutMs),
    workerId: String(input.workerId || '').trim(),
  };
  if (
    !WORKER_IDS.has(normalized.workerId) ||
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
