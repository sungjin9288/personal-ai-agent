import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { test } from 'node:test';

import { createLocalCommandEmbeddingAdapter } from '../src/core/embedding-adapter.mjs';
import {
  normalizeLoopbackEndpoint,
  requestLoopbackJson,
} from '../src/core/loopback-json-client.mjs';

test('loopback endpoint rejects remote, authenticated, and path-bearing origins', () => {
  assert.equal(normalizeLoopbackEndpoint('http://127.0.0.1:11434'), 'http://127.0.0.1:11434');
  assert.equal(normalizeLoopbackEndpoint('http://localhost:11434/'), 'http://localhost:11434');
  assert.throws(() => normalizeLoopbackEndpoint('https://127.0.0.1:11434'), /loopback HTTP origin/);
  assert.throws(() => normalizeLoopbackEndpoint('http://example.com'), /loopback HTTP origin/);
  assert.throws(() => normalizeLoopbackEndpoint('http://user:pass@localhost'), /loopback HTTP origin/);
  assert.throws(() => normalizeLoopbackEndpoint('http://localhost/api'), /loopback HTTP origin/);
});

test('loopback JSON client allows only the bounded Ollama paths and response size', async () => {
  await assert.rejects(
    () => requestLoopbackJson({ endpoint: 'http://127.0.0.1:1', pathname: '/api/chat' }),
    /Unsupported local model API path/,
  );

  const server = http.createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ value: 'response-too-large' }));
  });
  await listen(server);
  const endpoint = endpointFor(server);
  await assert.rejects(
    () => requestLoopbackJson({ endpoint, maxResponseBytes: 5, pathname: '/api/version' }),
    /response exceeds 5 bytes/,
  );
  await close(server);
});

test('loopback JSON client permits only the recorded structured generation path', async () => {
  const server = http.createServer(async (request, response) => {
    assert.equal(request.url, '/api/generate');
    assert.equal(request.method, 'POST');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ response: '{"score":90}' }));
  });
  await listen(server);
  try {
    const result = await requestLoopbackJson({
      body: { model: 'fixture', stream: false },
      endpoint: endpointFor(server),
      pathname: '/api/generate',
    });
    assert.equal(result.response, '{"score":90}');
  } finally {
    await close(server);
  }
});

test('loopback JSON client permits the read-only loaded-model resource path', async () => {
  const server = http.createServer((request, response) => {
    assert.equal(request.url, '/api/ps');
    assert.equal(request.method, 'GET');
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ models: [{ name: 'fixture', size: 1024, size_vram: 512 }] }));
  });
  await listen(server);
  try {
    const result = await requestLoopbackJson({
      endpoint: endpointFor(server),
      pathname: '/api/ps',
    });
    assert.equal(result.models[0].size, 1024);
    assert.equal(result.models[0].size_vram, 512);
  } finally {
    await close(server);
  }
});

test('Ollama command exchanges the embedding protocol with a loopback server', async () => {
  let receivedBody;
  const server = http.createServer(async (request, response) => {
    receivedBody = JSON.parse(await readBody(request));
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ embeddings: [[1, 0], [0, 1]] }));
  });
  await listen(server);
  const endpoint = endpointFor(server);
  const adapter = createLocalCommandEmbeddingAdapter({
    args: [
      path.resolve('scripts/ollama-embedding-command.mjs'),
      '--endpoint',
      endpoint,
      '--model',
      'fixture-model',
    ],
    command: process.execPath,
  });
  const result = await adapter.embedTexts({ texts: ['first', 'second'] });

  assert.equal(result.modelId, 'fixture-model');
  assert.equal(result.dimensions, 2);
  assert.deepEqual(result.vectors, [[1, 0], [0, 1]]);
  assert.deepEqual(receivedBody, {
    input: ['first', 'second'],
    model: 'fixture-model',
    truncate: false,
  });
  await close(server);
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
