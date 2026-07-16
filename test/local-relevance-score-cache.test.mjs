import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createCachedLocalRelevanceScorer } from '../src/core/local-relevance-score-cache.mjs';
import { createLocalRelevanceShadowEvaluator } from '../src/core/local-relevance-shadow.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';

function createScorer(scoreDocument) {
  return {
    id: 'fixture-scorer',
    modelId: 'fixture-model',
    promptHash: 'a'.repeat(64),
    promptVersion: 'fixture-prompt/v1',
    scoreDocument,
  };
}

function createCache({ maxEntries, scoreDocument } = {}) {
  return createCachedLocalRelevanceScorer({
    maxEntries,
    modelDigest: 'b'.repeat(64),
    scorer: createScorer(scoreDocument || (async () => ({ score: 91 }))),
  });
}

test('exact scorer, query, and document pairs reuse one content-free score', async () => {
  let callCount = 0;
  const cache = createCache({
    async scoreDocument() {
      callCount += 1;
      return { score: 91 };
    },
  });
  const input = {
    documentText: 'Sensitive document body',
    queryText: 'Sensitive query body',
  };

  const firstResult = await cache.scoreDocument(input);
  for (let index = 0; index < 3; index += 1) {
    await cache.scoreDocument(input);
  }
  firstResult.score = 0;
  const afterMutation = await cache.scoreDocument(input);

  const snapshot = cache.getCacheSnapshot();
  assert.equal(callCount, 1);
  assert.equal(afterMutation.score, 91);
  assert.deepEqual(snapshot.metrics, {
    evictionCount: 0,
    failureCount: 0,
    hitCount: 4,
    inFlightHitCount: 0,
    missCount: 1,
    modelInferenceCount: 1,
    requestCount: 5,
  });
  assert.equal(snapshot.completedEntryCount, 1);
  assert.equal(snapshot.completedEntryContentRetained, false);
  assert.equal(JSON.stringify(snapshot).includes(input.documentText), false);
  assert.equal(JSON.stringify(snapshot).includes(input.queryText), false);
});

test('query and document identity stay exact while least-recently-used entries are bounded', async () => {
  let callCount = 0;
  const cache = createCache({
    maxEntries: 2,
    async scoreDocument() {
      callCount += 1;
      return { score: 80 + callCount };
    },
  });
  const pair = (queryText, documentText) => ({ documentText, queryText });

  await cache.scoreDocument(pair('query-a', 'document-a'));
  await cache.scoreDocument(pair('query-a', 'document-b'));
  await cache.scoreDocument(pair('query-a', 'document-a'));
  await cache.scoreDocument(pair('query-b', 'document-a'));
  await cache.scoreDocument(pair('query-a', 'document-b'));

  const snapshot = cache.getCacheSnapshot();
  assert.equal(callCount, 4);
  assert.equal(snapshot.completedEntryCount, 2);
  assert.equal(snapshot.metrics.hitCount, 1);
  assert.equal(snapshot.metrics.evictionCount, 2);
});

test('failed and invalid scores are never cached', async () => {
  let callCount = 0;
  const cache = createCache({
    async scoreDocument() {
      callCount += 1;
      if (callCount === 1) {
        throw new Error('temporary scorer failure');
      }
      if (callCount === 2) {
        return { score: 101 };
      }
      return { score: 73 };
    },
  });
  const input = { documentText: 'document', queryText: 'query' };

  await assert.rejects(cache.scoreDocument(input), /temporary scorer failure/);
  await assert.rejects(cache.scoreDocument(input), /invalid score/);
  assert.deepEqual(await cache.scoreDocument(input), { score: 73 });
  assert.deepEqual(await cache.scoreDocument(input), { score: 73 });

  const snapshot = cache.getCacheSnapshot();
  assert.equal(callCount, 3);
  assert.equal(snapshot.metrics.failureCount, 2);
  assert.equal(snapshot.metrics.modelInferenceCount, 3);
  assert.equal(snapshot.metrics.hitCount, 1);
  assert.equal(snapshot.completedEntryCount, 1);
});

test('concurrent identical requests join one in-flight score', async () => {
  let releaseScore;
  let callCount = 0;
  const pendingScore = new Promise((resolve) => {
    releaseScore = resolve;
  });
  const cache = createCache({
    async scoreDocument() {
      callCount += 1;
      return pendingScore;
    },
  });
  const input = { documentText: 'document', queryText: 'query' };

  const results = [
    cache.scoreDocument(input),
    cache.scoreDocument(input),
    cache.scoreDocument(input),
  ];
  await Promise.resolve();
  releaseScore({ score: 88 });

  assert.deepEqual(await Promise.all(results), [{ score: 88 }, { score: 88 }, { score: 88 }]);
  const snapshot = cache.getCacheSnapshot();
  assert.equal(callCount, 1);
  assert.equal(snapshot.metrics.inFlightHitCount, 2);
  assert.equal(snapshot.metrics.modelInferenceCount, 1);
  assert.equal(snapshot.pendingEntryCount, 0);
});

test('cache construction requires a bounded capacity and complete scorer binding', () => {
  assert.throws(() => createCache({ maxEntries: 0 }), /between 1 and 4096/);
  assert.throws(() => createCache({ maxEntries: 4_097 }), /between 1 and 4096/);
  assert.throws(
    () => createCachedLocalRelevanceScorer({
      modelDigest: 'not-a-digest',
      scorer: createScorer(async () => ({ score: 1 })),
    }),
    /complete scorer binding/,
  );
});

test('four-role shadow observation reuses scores without changing lexical provider input', async () => {
  let callCount = 0;
  const scorer = createCache({
    async scoreDocument({ documentText }) {
      callCount += 1;
      return { score: documentText.includes('renew the credential') ? 95 : 5 };
    },
  });
  const evaluator = createLocalRelevanceShadowEvaluator({ scorer });
  const input = {
    attachments: [{
      fileName: 'style.md',
      id: 'attachment-style',
      missionId: 'mission-cache',
      promptContent: 'A visual guide with blue buttons.',
    }],
    memoryEntries: [{
      content: 'To recover access, renew the credential and preserve the audit trail.',
      id: 'memory-procedure',
      kind: 'decision',
      scope: 'mission',
      scopeId: 'mission-cache',
    }],
    mission: {
      constraints: [],
      deliverableType: 'decision-memo',
      id: 'mission-cache',
      mode: 'knowledge',
      objective: 'Explain the credential recovery procedure.',
      title: 'Credential recovery',
    },
    pack: { requiredSections: [], reviewRules: [] },
    previousOutputs: {},
    workspace: { id: 'workspace-cache' },
  };
  const observations = [];
  for (const role of ['manager', 'planner', 'executor', 'reviewer']) {
    const roleInput = { ...input, providerRole: role, role };
    observations.push(await evaluator.observe({
      input: roleInput,
      lexical: buildRetrievalContextWithCorpus(roleInput),
    }));
  }

  const snapshot = scorer.getCacheSnapshot();
  const candidateCount = observations[0].selection.inputCandidateCount;
  assert.equal(callCount, candidateCount);
  assert.equal(snapshot.metrics.requestCount, candidateCount * 4);
  assert.equal(snapshot.metrics.hitCount, candidateCount * 3);
  assert.equal(observations.every((item) => item.status === 'observed'), true);
  assert.equal(observations.every((item) => item.providerInput.changed === false), true);
  assert.equal(new Set(observations.map((item) => item.selection.shadowSourceKeyHashes[0])).size, 1);
});
