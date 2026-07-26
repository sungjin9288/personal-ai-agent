import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { createLocalCommandEmbeddingAdapter } from '../src/core/embedding-adapter.mjs';
import {
  buildSemanticCorpusRecords,
  calculateCosineSimilarity,
  runSemanticRetrievalExperiment,
  SEMANTIC_RETRIEVAL_EXPERIMENT_SCHEMA_VERSION,
} from '../src/core/semantic-retrieval.mjs';

const fixtureAdapter = createLocalCommandEmbeddingAdapter({
  args: [path.resolve('fixtures/local-embedding-command.mjs')],
  command: process.execPath,
});

function buildFixtureSources() {
  return {
    attachments: [
      {
        id: 'attachment-ui',
        missionId: 'mission-1',
        fileName: 'sign-in-page.md',
        mimeType: 'text/markdown',
        promptContent: 'The sign-in page uses blue color and compact typography.',
        source: 'fixture',
      },
    ],
    memoryEntries: [
      {
        content: 'Renew expired authentication credentials and preserve verification evidence.',
        id: 'memory-auth',
        kind: 'fact',
        scope: 'mission',
        scopeId: 'mission-1',
      },
    ],
  };
}

test('cosine similarity handles aligned, orthogonal, and zero vectors', () => {
  assert.equal(calculateCosineSimilarity([1, 0], [1, 0]), 1);
  assert.equal(calculateCosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(calculateCosineSimilarity([0, 0], [1, 0]), 0);
  assert.throws(() => calculateCosineSimilarity([1], [1, 2]), /one dimension size/);
  assert.throws(() => calculateCosineSimilarity([1], [Infinity]), /finite numbers/);
});

test('semantic corpus builder preserves source identities and attachment chunks', () => {
  const records = buildSemanticCorpusRecords(buildFixtureSources());

  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => `${record.sourceType}:${record.sourceId}`).sort(), [
    'attachment:attachment-ui',
    'memory:memory-auth',
  ]);
  assert.equal(records.every((record) => record.contentHash && record.chunkId), true);
});

test('semantic experiment selects synonym-related evidence without exposing corpus content', async () => {
  const records = buildSemanticCorpusRecords(buildFixtureSources());
  const result = await runSemanticRetrievalExperiment({
    adapter: fixtureAdapter,
    allowedScopes: ['mission:mission-1'],
    corpusRecords: records,
    k: 1,
    queryText: 'Recover a sign-in token after timeout.',
  });

  assert.equal(result.schemaVersion, SEMANTIC_RETRIEVAL_EXPERIMENT_SCHEMA_VERSION);
  assert.equal(result.productionReadyClaim, false);
  assert.equal(result.runtimeActivation, false);
  assert.equal(result.embedding.modelId, 'fixture-semantic-map-v1');
  assert.equal(result.retrievedItems[0].sourceKey, 'memory:memory-auth');
  assert.equal(JSON.stringify(result).includes('Renew expired'), false);
});

test('semantic experiment requires explicit allowed scopes and rejects cross-scope corpus', async () => {
  const records = buildSemanticCorpusRecords(buildFixtureSources());

  await assert.rejects(
    () => runSemanticRetrievalExperiment({ adapter: fixtureAdapter, corpusRecords: records, queryText: 'x' }),
    /allowedScopes are required/,
  );
  await assert.rejects(
    () =>
      runSemanticRetrievalExperiment({
        adapter: fixtureAdapter,
        allowedScopes: ['mission:another-mission'],
        corpusRecords: records,
        queryText: 'x',
      }),
    /Corpus scope is not allowed/,
  );
});

test('semantic experiment excludes inactive records and reports their count', async () => {
  const records = buildSemanticCorpusRecords(buildFixtureSources());
  records[0] = { ...records[0], status: 'retired' };
  const result = await runSemanticRetrievalExperiment({
    adapter: fixtureAdapter,
    allowedScopes: ['mission:mission-1'],
    corpusRecords: records,
    queryText: 'Recover authentication credentials.',
  });

  assert.equal(result.evidence.activeCorpusRecordCount, 1);
  assert.equal(result.evidence.inactiveCorpusRecordCount, 1);
  assert.equal(result.retrievedItems.some((item) => item.sourceKey === 'memory:memory-auth'), false);
});

test('semantic experiment keeps only the strongest chunk per source', async () => {
  const sources = buildFixtureSources();
  sources.attachments[0].promptContent = [
    'The sign-in page uses blue color.',
    '',
    'Renew expired authentication credentials after a token timeout.',
  ].join('\n');
  const records = buildSemanticCorpusRecords(sources);
  const result = await runSemanticRetrievalExperiment({
    adapter: fixtureAdapter,
    allowedScopes: ['mission:mission-1'],
    corpusRecords: records,
    k: 6,
    queryText: 'Recover a token after timeout.',
  });

  assert.equal(new Set(result.retrievedItems.map((item) => item.sourceKey)).size, result.retrievedItems.length);
  assert.equal(result.retrievedItems.filter((item) => item.sourceKey === 'attachment:attachment-ui').length, 1);
});
