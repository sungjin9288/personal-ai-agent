import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

import { buildLocalRelevanceCacheInputHash } from '../src/core/local-relevance-shadow-cache-process-isolation.mjs';
import { runLocalRelevanceCacheWorkerProcess } from '../scripts/local-relevance-cache-process-runner.mjs';

test('child process keeps cache local, forwards no parent environment, and closes cleanly', async (context) => {
  const server = http.createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({
      model: body.model,
      response: JSON.stringify({ score: 88 }),
    }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  const input = {
    documentText: 'private document',
    endpoint: `http://127.0.0.1:${address.port}`,
    model: 'fixture-model',
    modelDigest: 'a'.repeat(64),
    queryText: 'private query',
    runId: 'fixture-run',
    timeoutMs: 5_000,
    workerId: 'worker-a',
  };

  const result = await runLocalRelevanceCacheWorkerProcess({ input, timeoutMs: 10_000 });

  assert.equal(result.firstScore, 88);
  assert.equal(result.cachedScore, 88);
  assert.equal(result.forwardedEnvironmentKeyCount, 0);
  assert.equal(result.environmentKeyCount, result.platformEnvironmentKeyCount);
  assert.equal(result.secretEnvironmentKeyFound, false);
  assert.equal(result.inputHash, buildLocalRelevanceCacheInputHash(input));
  assert.equal(result.initialCacheSnapshot.completedEntryCount, 0);
  assert.equal(result.warmCacheSnapshot.completedEntryCount, 1);
  assert.equal(result.warmCacheSnapshot.metrics.modelInferenceCount, 1);
  assert.equal(result.warmCacheSnapshot.metrics.hitCount, 1);
  assert.equal(result.closedCacheSnapshot.closed, true);
  assert.equal(result.closedCacheSnapshot.completedEntryCount, 0);
  assert.equal(result.postCloseScoreRejected, true);
  assert.equal(JSON.stringify(result).includes(input.documentText), false);
  assert.equal(JSON.stringify(result).includes(input.queryText), false);
});

test('runner rejects oversized input before spawning a worker', () => {
  assert.throws(
    () => runLocalRelevanceCacheWorkerProcess({
      input: {
        documentText: 'x'.repeat(70_000),
        workerId: 'worker-a',
      },
    }),
    /input exceeds/,
  );
});
