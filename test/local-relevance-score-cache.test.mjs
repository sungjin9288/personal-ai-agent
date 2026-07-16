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
    invalidatedCompletedEntryCount: 0,
    invalidatedInFlightEntryCount: 0,
    invalidationCount: 0,
    missCount: 1,
    modelInferenceCount: 1,
    requestCount: 5,
    staleResultDropCount: 0,
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

test('invalidation drops an older in-flight result and forces a fresh score', async () => {
  const releases = [];
  let callCount = 0;
  const cache = createCache({
    scoreDocument() {
      callCount += 1;
      return new Promise((resolve) => releases.push(resolve));
    },
  });
  const input = { documentText: 'document', queryText: 'query' };

  const oldRequest = cache.scoreDocument(input);
  await Promise.resolve();
  const invalidated = cache.invalidateCache({ reason: 'model-or-prompt-replaced' });
  const freshRequest = cache.scoreDocument(input);
  await Promise.resolve();
  releases[0]({ score: 11 });
  assert.deepEqual(await oldRequest, { score: 11 });
  releases[1]({ score: 91 });
  assert.deepEqual(await freshRequest, { score: 91 });
  assert.deepEqual(await cache.scoreDocument(input), { score: 91 });

  const snapshot = cache.getCacheSnapshot();
  assert.equal(callCount, 2);
  assert.equal(invalidated.completedEntryCount, 0);
  assert.equal(invalidated.pendingEntryCount, 0);
  assert.equal(snapshot.metrics.invalidationCount, 1);
  assert.equal(snapshot.metrics.invalidatedInFlightEntryCount, 1);
  assert.equal(snapshot.metrics.staleResultDropCount, 1);
  assert.equal(snapshot.metrics.modelInferenceCount, 2);
  assert.equal(snapshot.metrics.hitCount, 1);
  assert.equal(snapshot.completedEntryCount, 1);
  assert.equal(snapshot.lastInvalidationReason, 'model-or-prompt-replaced');
});

test('different model and prompt bindings never share completed scores', async () => {
  let callCount = 0;
  const scorer = createScorer(async () => {
    callCount += 1;
    return { score: 70 + callCount };
  });
  const first = createCachedLocalRelevanceScorer({
    modelDigest: 'b'.repeat(64),
    scorer,
  });
  const second = createCachedLocalRelevanceScorer({
    modelDigest: 'c'.repeat(64),
    scorer: { ...scorer, promptHash: 'd'.repeat(64) },
  });
  const input = { documentText: 'document', queryText: 'query' };

  assert.deepEqual(await first.scoreDocument(input), { score: 71 });
  assert.deepEqual(await first.scoreDocument(input), { score: 71 });
  assert.deepEqual(await second.scoreDocument(input), { score: 72 });
  assert.equal(callCount, 2);
  assert.notEqual(
    first.getCacheSnapshot().binding.bindingHash,
    second.getCacheSnapshot().binding.bindingHash,
  );
});

test('rollback close clears state, stays idempotent, and rejects future cache use', async () => {
  const cache = createCache();
  await cache.scoreDocument({ documentText: 'document', queryText: 'query' });

  const closed = cache.closeCache({ reason: 'rollback' });
  const closedAgain = cache.closeCache({ reason: 'rollback' });

  assert.equal(closed.closed, true);
  assert.equal(closed.completedEntryCount, 0);
  assert.equal(closed.lastInvalidationReason, 'rollback');
  assert.equal(closed.metrics.invalidationCount, 1);
  assert.deepEqual(closedAgain, closed);
  await assert.rejects(
    cache.scoreDocument({ documentText: 'document', queryText: 'query' }),
    /cache is closed/,
  );
  assert.throws(() => cache.invalidateCache({ reason: 'manual' }), /cache is closed/);
});

test('cache lifecycle rejects unsupported invalidation reasons', async () => {
  const cache = createCache();
  assert.throws(() => cache.invalidateCache({ reason: 'unknown' }), /supported invalidation reason/);
  assert.throws(() => cache.closeCache({ reason: 'unknown' }), /supported invalidation reason/);
});
