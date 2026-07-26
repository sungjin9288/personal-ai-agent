import assert from 'node:assert/strict';
import http from 'node:http';
import { test } from 'node:test';

import {
  ensureOllamaModelUnloaded,
  readLoadedOllamaModel,
} from '../src/core/ollama-model-runtime.mjs';

test('loaded model snapshot is content-free and normalized', async () => {
  const server = http.createServer((request, response) => {
    assert.equal(request.url, '/api/ps');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({
      models: [{
        context_length: 4096,
        digest: 'a'.repeat(64),
        name: 'qwen2.5:3b',
        size: 2_390_300_672,
        size_vram: 2_390_300_672,
      }],
    }));
  });
  await listen(server);
  try {
    const snapshot = await readLoadedOllamaModel({
      endpoint: endpointFor(server),
      model: 'qwen2.5:3b',
    });
    assert.deepEqual(snapshot, {
      contextLength: 4096,
      loadedModelBytes: 2_390_300_672,
      loadedModelVramBytes: 2_390_300_672,
      modelDigest: 'a'.repeat(64),
      modelId: 'qwen2.5:3b',
      source: 'ollama-api-ps',
    });
  } finally {
    await close(server);
  }
});

test('unload lifecycle waits until the requested model is absent', async () => {
  let loaded = true;
  let unloadBody;
  const server = http.createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url === '/api/ps') {
      response.end(JSON.stringify({
        models: loaded ? [{ name: 'qwen2.5:3b' }] : [],
      }));
      return;
    }
    assert.equal(request.url, '/api/generate');
    unloadBody = JSON.parse(await readBody(request));
    loaded = false;
    response.end(JSON.stringify({ done: true, done_reason: 'unload' }));
  });
  await listen(server);
  try {
    const result = await ensureOllamaModelUnloaded({
      endpoint: endpointFor(server),
      model: 'qwen2.5:3b',
      pollIntervalMs: 1,
      timeoutMs: 1_000,
    });
    assert.deepEqual(unloadBody, { keep_alive: 0, model: 'qwen2.5:3b' });
    assert.equal(result.initiallyLoaded, true);
    assert.equal(result.unloadRequested, true);
    assert.equal(result.modelAbsentBeforeCold, true);
    assert.equal(result.pollCount >= 1, true);
  } finally {
    await close(server);
  }
});

test('already absent model does not issue an unload mutation', async () => {
  let generateCallCount = 0;
  const server = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url === '/api/generate') {
      generateCallCount += 1;
    }
    response.end(JSON.stringify({ models: [] }));
  });
  await listen(server);
  try {
    const result = await ensureOllamaModelUnloaded({
      endpoint: endpointFor(server),
      model: 'qwen2.5:3b',
    });
    assert.equal(generateCallCount, 0);
    assert.equal(result.initiallyLoaded, false);
    assert.equal(result.unloadRequested, false);
    assert.equal(result.modelAbsentBeforeCold, true);
  } finally {
    await close(server);
  }
});

function endpointFor(server) {
  return `http://127.0.0.1:${server.address().port}`;
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()),
  );
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}
