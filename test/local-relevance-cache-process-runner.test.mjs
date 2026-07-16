import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

import { buildLocalRelevanceCacheInputHash } from '../src/core/local-relevance-shadow-cache-process-isolation.mjs';
import {
  runForcedTerminationCacheWorkerProcess,
  runLocalRelevanceCacheWorkerProcess,
} from '../scripts/local-relevance-cache-process-runner.mjs';

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

test('runner observes a warm worker before forcing SIGKILL', async (context) => {
  const server = createScoringServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();

  const result = await runForcedTerminationCacheWorkerProcess({
    input: createInput(address.port),
    timeoutMs: 10_000,
  });

  assert.equal(result.forcedWorker.state, 'ready-for-termination');
  assert.equal(result.forcedWorker.warmCacheSnapshot.metrics.modelInferenceCount, 1);
  assert.equal(result.forcedWorker.warmCacheSnapshot.metrics.hitCount, 1);
  assert.deepEqual(result.termination, {
    exitCode: null,
    finalResultReceived: false,
    observedSignal: 'SIGKILL',
    readyBeforeTermination: true,
    requestedSignal: 'SIGKILL',
    terminatedByParent: true,
  });
});

test('bounded soak keeps capacity while replaying recent entries as hits', async (context) => {
  const server = createScoringServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();

  const result = await runLocalRelevanceCacheWorkerProcess({
    input: {
      ...createInput(address.port),
      capacity: 2,
      mode: 'bounded-soak',
      pairCount: 4,
      replayCount: 2,
      workerId: 'soak-worker',
    },
    timeoutMs: 10_000,
  });

  assert.equal(result.saturatedCacheSnapshot.completedEntryCount, 2);
  assert.equal(result.saturatedCacheSnapshot.metrics.modelInferenceCount, 4);
  assert.equal(result.saturatedCacheSnapshot.metrics.hitCount, 2);
  assert.equal(result.saturatedCacheSnapshot.metrics.evictionCount, 2);
  assert.equal(result.closedCacheSnapshot.completedEntryCount, 0);
  assert.equal(result.postCloseScoreRejected, true);
  assert.equal(result.forwardedEnvironmentKeyCount, 0);
});

function createScoringServer() {
  return http.createServer(async (request, response) => {
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
}

function createInput(port) {
  return {
    documentText: 'private document',
    endpoint: `http://127.0.0.1:${port}`,
    model: 'fixture-model',
    modelDigest: 'a'.repeat(64),
    queryText: 'private query',
    runId: 'fixture-run',
    timeoutMs: 5_000,
    workerId: 'recovery-worker',
  };
}
