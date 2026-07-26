import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import {
  createLocalCommandEmbeddingAdapter,
  EMBEDDING_PROTOCOL_VERSION,
  validateEmbeddingBatchResult,
} from '../src/core/embedding-adapter.mjs';

const fixtureCommandPath = path.resolve('fixtures/local-embedding-command.mjs');

test('local command adapter exchanges one bounded JSON embedding batch', async () => {
  const adapter = createLocalCommandEmbeddingAdapter({
    args: [fixtureCommandPath],
    command: process.execPath,
  });
  const result = await adapter.embedTexts({
    texts: ['Recover a token after timeout.', 'Renew expired authentication credentials.'],
  });

  assert.equal(adapter.kind, 'local-command');
  assert.equal(adapter.protocolVersion, EMBEDDING_PROTOCOL_VERSION);
  assert.equal(adapter.security.shell, false);
  assert.equal(adapter.security.transport, 'local-process-stdio');
  assert.equal(adapter.security.networkIsolation, 'caller-owned');
  assert.equal(result.modelId, 'fixture-semantic-map-v1');
  assert.equal(result.dimensions, 6);
  assert.equal(result.vectors.length, 2);
});

test('local command adapter passes only allowlisted environment keys', async () => {
  const script = `
let input = '';
process.stdin.on('data', (chunk) => { input += chunk; });
process.stdin.on('end', () => {
  const request = JSON.parse(input);
  process.stdout.write(JSON.stringify({
    schemaVersion: request.schemaVersion,
    modelId: 'env-check',
    dimensions: 1,
    vectors: request.texts.map(() => [process.env.OPENAI_API_KEY ? 1 : 0]),
  }));
});`;
  const adapter = createLocalCommandEmbeddingAdapter({
    args: ['-e', script],
    command: process.execPath,
    env: {
      HOME: '/tmp/home',
      OPENAI_API_KEY: 'must-not-reach-child',
      PATH: process.env.PATH,
    },
  });
  const result = await adapter.embedTexts({ texts: ['environment check'] });

  assert.deepEqual(result.vectors, [[0]]);
  assert.equal(adapter.security.environmentKeys.includes('OPENAI_API_KEY'), false);
});

test('local command adapter validates command and input bounds before spawning', async () => {
  assert.throws(() => createLocalCommandEmbeddingAdapter(), /command is required/);
  const adapter = createLocalCommandEmbeddingAdapter({
    args: [fixtureCommandPath],
    command: process.execPath,
    maxInputChars: 5,
    maxTexts: 1,
  });

  await assert.rejects(() => adapter.embedTexts({ texts: [] }), /At least one embedding text/);
  await assert.rejects(() => adapter.embedTexts({ texts: ['one', 'two'] }), /text count exceeds/);
  await assert.rejects(() => adapter.embedTexts({ texts: ['too long'] }), /input exceeds/);
});

test('local command adapter rejects invalid JSON, non-zero exit, and timeout', async () => {
  const invalidJsonAdapter = createLocalCommandEmbeddingAdapter({
    args: ['-e', "process.stdin.resume(); process.stdin.on('end', () => process.stdout.write('not-json'));"],
    command: process.execPath,
  });
  await assert.rejects(() => invalidJsonAdapter.embedTexts({ texts: ['x'] }), /invalid JSON/);

  const failedAdapter = createLocalCommandEmbeddingAdapter({
    args: ['-e', "process.stderr.write('fixture failure'); process.exit(3);"],
    command: process.execPath,
  });
  await assert.rejects(() => failedAdapter.embedTexts({ texts: ['x'] }), /code 3: fixture failure/);

  const timeoutAdapter = createLocalCommandEmbeddingAdapter({
    args: ['-e', 'setTimeout(() => {}, 10000);'],
    command: process.execPath,
    timeoutMs: 25,
  });
  await assert.rejects(() => timeoutAdapter.embedTexts({ texts: ['x'] }), /timed out after 25ms/);
});

test('embedding result validation enforces protocol, count, dimensions, and finite numbers', () => {
  const valid = validateEmbeddingBatchResult(
    {
      dimensions: 2,
      modelId: 'fixture',
      schemaVersion: EMBEDDING_PROTOCOL_VERSION,
      vectors: [[1, 0], [0, 1]],
    },
    { expectedCount: 2 },
  );
  assert.equal(valid.dimensions, 2);

  assert.throws(
    () => validateEmbeddingBatchResult({ schemaVersion: 'wrong', vectors: [[1]] }),
    /Unsupported embedding schema/,
  );
  assert.throws(
    () => validateEmbeddingBatchResult({ schemaVersion: EMBEDDING_PROTOCOL_VERSION, modelId: 'x', vectors: [[1]] }, { expectedCount: 2 }),
    /expected 2 vectors/,
  );
  assert.throws(
    () => validateEmbeddingBatchResult({ schemaVersion: EMBEDDING_PROTOCOL_VERSION, modelId: 'x', vectors: [[1], [1, 2]] }),
    /one dimension size/,
  );
  assert.throws(
    () => validateEmbeddingBatchResult({ schemaVersion: EMBEDDING_PROTOCOL_VERSION, modelId: 'x', vectors: [[Infinity]] }),
    /non-finite value/,
  );
});
