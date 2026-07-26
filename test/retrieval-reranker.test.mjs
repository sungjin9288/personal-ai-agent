import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  rerankRetrievalCandidates,
  RETRIEVAL_RERANKING_EXPERIMENT_SCHEMA_VERSION,
} from '../src/core/retrieval-reranker.mjs';

function buildCandidates() {
  return [
    {
      baselineRank: 1,
      chunkId: 'chunk-irrelevant',
      corpusId: 'corpus-irrelevant',
      lexicalScore: 0,
      semanticScore: 1,
      sourceId: 'attachment-synonym',
      sourceKey: 'attachment:attachment-synonym',
      sourceLabel: 'synonym.md',
      sourceType: 'attachment',
    },
    {
      baselineRank: 2,
      chunkId: 'chunk-expected',
      corpusId: 'corpus-expected',
      lexicalScore: 1,
      semanticScore: 1,
      sourceId: 'memory-exact',
      sourceKey: 'memory:memory-exact',
      sourceLabel: 'mission/fact',
      sourceType: 'memory',
    },
  ];
}

test('reranker combines semantic and lexical signals with an inspectable score', () => {
  const result = rerankRetrievalCandidates({
    baselineAlgorithmId: 'semantic:fixture-v1',
    candidates: buildCandidates(),
    k: 1,
  });

  assert.equal(result.schemaVersion, RETRIEVAL_RERANKING_EXPERIMENT_SCHEMA_VERSION);
  assert.equal(result.algorithmId, 'semantic-lexical-weighted-v1');
  assert.deepEqual(result.featureWeights, { lexical: 0.3, semantic: 0.7 });
  assert.equal(result.retrievedItems[0].sourceKey, 'memory:memory-exact');
  assert.equal(result.retrievedItems[0].semanticContribution, 0.7);
  assert.equal(result.retrievedItems[0].lexicalContribution, 0.3);
  assert.equal(result.retrievedItems[0].combinedScore, 1);
});

test('reranker records an exact state-free rollback to baseline order', () => {
  const result = rerankRetrievalCandidates({
    baselineAlgorithmId: 'semantic:fixture-v1',
    candidates: buildCandidates(),
    k: 1,
  });

  assert.deepEqual(result.rollback, {
    algorithmId: 'semantic:fixture-v1',
    sourceKeys: ['attachment:attachment-synonym'],
    stateMigrationRequired: false,
    strategy: 'bypass-reranker',
  });
  assert.equal(result.runtimeActivation, false);
  assert.equal(result.productionReadyClaim, false);
});

test('reranker output excludes unrecognized candidate content', () => {
  const candidates = buildCandidates();
  candidates[0].content = 'raw corpus text must stay internal';
  candidates[0].promptContent = 'raw attachment payload must stay internal';

  const result = rerankRetrievalCandidates({
    baselineAlgorithmId: 'semantic:fixture-v1',
    candidates,
  });
  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes('raw corpus text'), false);
  assert.equal(serialized.includes('raw attachment payload'), false);
  assert.equal(serialized.includes('promptContent'), false);
});

test('reranker keeps baseline order when combined features tie', () => {
  const candidates = buildCandidates().map((candidate) => ({
    ...candidate,
    lexicalScore: 0,
  }));
  const result = rerankRetrievalCandidates({
    baselineAlgorithmId: 'semantic:fixture-v1',
    candidates,
    k: 2,
  });

  assert.deepEqual(result.retrievedItems.map((item) => item.sourceKey), [
    'attachment:attachment-synonym',
    'memory:memory-exact',
  ]);
});

test('reranker validates identity, rank, score, and result bounds', () => {
  assert.throws(() => rerankRetrievalCandidates(), /baselineAlgorithmId is required/);
  assert.throws(
    () => rerankRetrievalCandidates({ baselineAlgorithmId: 'baseline', candidates: [] }),
    /At least one reranking candidate/,
  );
  assert.throws(
    () => rerankRetrievalCandidates({
      baselineAlgorithmId: 'baseline',
      candidates: [...buildCandidates(), buildCandidates()[0]],
    }),
    /source keys must be unique/,
  );
  assert.throws(
    () => rerankRetrievalCandidates({
      baselineAlgorithmId: 'baseline',
      candidates: buildCandidates().map((candidate) => ({ ...candidate, baselineRank: 1 })),
    }),
    /baseline ranks must be unique/,
  );
  assert.throws(
    () => rerankRetrievalCandidates({
      baselineAlgorithmId: 'baseline',
      candidates: [{ ...buildCandidates()[0], semanticScore: 2 }],
    }),
    /semanticScore must be between -1 and 1/,
  );
  assert.throws(
    () => rerankRetrievalCandidates({
      baselineAlgorithmId: 'baseline',
      candidates: buildCandidates(),
      k: 0,
    }),
    /k must be a positive integer/,
  );
});
