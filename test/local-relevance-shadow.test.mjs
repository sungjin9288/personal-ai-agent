import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalRelevanceShadowObservation,
  createLocalRelevanceShadowEvaluator,
} from '../src/core/local-relevance-shadow.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function buildInput(role = 'manager') {
  return {
    attachments: [{
      id: 'attachment-style',
      fileName: 'style.md',
      missionId: 'mission-1',
      promptContent: 'Authentication token recovery screen uses a blue button and compact typography.',
    }],
    memoryEntries: [{
      content: 'Renew the expired credential, revalidate identity, and preserve the audit trail.',
      id: 'memory-procedure',
      kind: 'decision',
      scope: 'mission',
      scopeId: 'mission-1',
    }],
    mission: {
      constraints: [],
      deliverableType: 'decision-memo',
      id: 'mission-1',
      mode: 'knowledge',
      objective: 'Explain the expired authentication token renewal procedure.',
      title: 'Authentication recovery',
    },
    pack: { requiredSections: [], reviewRules: [] },
    previousOutputs: {},
    providerRole: role,
    role,
    workspace: { id: 'workspace-1' },
  };
}

function buildScorer({ fail = false } = {}) {
  return {
    id: 'fixture-local-relevance',
    modelId: 'fixture-model',
    promptHash: 'a'.repeat(64),
    promptVersion: 'fixture-prompt/v1',
    async scoreDocument({ documentText }) {
      if (fail) {
        throw new Error('raw scorer failure with sensitive input');
      }
      return { score: documentText.includes('Renew the expired credential') ? 95 : 5 };
    },
  };
}

test('shadow observation reranks a bounded shortlist without retaining query or document text', async () => {
  const observations = [];
  const input = buildInput();
  const lexical = buildRetrievalContextWithCorpus(input);
  const evaluator = createLocalRelevanceShadowEvaluator({
    clock: () => '2026-07-17T00:00:00.000Z',
    recordObservation: (observation) => observations.push(observation),
    scorer: buildScorer(),
  });

  const observation = await evaluator.observe({ input, lexical });

  assert.equal(observations.length, 1);
  assert.deepEqual(observations[0], observation);
  assertLocalRelevanceShadowObservation(observation);
  assert.equal(observation.status, 'observed');
  assert.equal(observation.runtimeActivation, false);
  assert.equal(observation.providerInput.changed, false);
  assert.equal(
    observation.selection.shadowSourceKeyHashes[0],
    hashValue('memory:memory-procedure'),
  );
  assert.equal(observation.selection.inputCandidateCount, 2);
  assert.equal(JSON.stringify(observation).includes('Renew the expired credential'), false);
  assert.equal(JSON.stringify(observation).includes('blue button'), false);
  assert.equal(JSON.stringify(observation).includes('Explain the expired'), false);
});

test('scorer and observation writer failures stay content-free and preserve the lexical policy', async () => {
  const input = buildInput();
  const lexical = buildRetrievalContextWithCorpus(input);
  const evaluator = createLocalRelevanceShadowEvaluator({
    clock: () => '2026-07-17T00:00:00.000Z',
    recordObservation() {
      throw new Error('writer failed');
    },
    scorer: buildScorer({ fail: true }),
  });

  const observation = await evaluator.observe({ input, lexical });

  assertLocalRelevanceShadowObservation(observation);
  assert.equal(observation.status, 'failed-lexical-preserved');
  assert.equal(observation.failureCode, 'scorer-failed');
  assert.deepEqual(observation.selection.shadowSourceKeyHashes, []);
  assert.equal(JSON.stringify(observation).includes('raw scorer failure'), false);
  assert.equal(observation.providerInput.lexicalResultHash, observation.providerInput.returnedResultHash);
});

test('shadow scoring keeps the qualified query contract on the mission objective', async () => {
  const input = buildInput('reviewer');
  input.mission.title = 'A title with unrelated dashboard wording';
  input.previousOutputs = {
    executor: { summaryText: 'Generated output about blue visual layout.' },
  };
  const queries = [];
  const scorer = buildScorer();
  const evaluator = createLocalRelevanceShadowEvaluator({
    clock: () => '2026-07-17T00:00:00.000Z',
    scorer: {
      ...scorer,
      async scoreDocument({ documentText, queryText }) {
        queries.push(queryText);
        return scorer.scoreDocument({ documentText, queryText });
      },
    },
  });

  const observation = await evaluator.observe({
    input,
    lexical: buildRetrievalContextWithCorpus(input),
  });

  assert.deepEqual([...new Set(queries)], [input.mission.objective]);
  assert.equal(observation.queryHash, hashValue(input.mission.objective));
  assert.equal(JSON.stringify(observation).includes('blue visual layout'), false);
});
