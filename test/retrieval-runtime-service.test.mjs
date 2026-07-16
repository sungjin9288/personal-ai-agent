import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import { createLocalCommandEmbeddingAdapter } from '../src/core/embedding-adapter.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';
import {
  createRetrievalRuntimeService,
  createRetrievalRuntimeServiceFromEnvironment,
  RETRIEVAL_RUNTIME_MODES,
} from '../src/core/retrieval-runtime-service.mjs';

const fixtureAdapter = createLocalCommandEmbeddingAdapter({
  args: [path.resolve('fixtures/local-embedding-command.mjs')],
  command: process.execPath,
});

function buildInput() {
  return {
    attachments: [
      {
        id: 'attachment-auth-ui',
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
    mission: {
      constraints: [],
      deliverableType: 'decision-memo',
      id: 'mission-1',
      mode: 'knowledge',
      objective: 'Recover a sign-in token after timeout.',
      title: 'Sign-in recovery',
    },
    pack: { requiredSections: [], reviewRules: [] },
    previousOutputs: {},
    providerRole: 'manager',
    role: 'manager',
    workspace: { id: 'workspace-1' },
  };
}

test('default retrieval runtime preserves the lexical result exactly', async () => {
  const input = buildInput();
  const runtime = createRetrievalRuntimeService();

  assert.equal(runtime.mode, RETRIEVAL_RUNTIME_MODES.LEXICAL);
  assert.equal(runtime.runtimeActivation, false);
  assert.deepEqual(await runtime.retrieve(input), buildRetrievalContextWithCorpus(input));
});

test('semantic rerank runtime selects local semantic evidence in the existing item shape', async () => {
  const runtime = createRetrievalRuntimeService({
    embeddingAdapter: fixtureAdapter,
    mode: RETRIEVAL_RUNTIME_MODES.SEMANTIC_RERANK,
  });
  const result = await runtime.retrieve(buildInput());

  assert.equal(runtime.runtimeActivation, true);
  assert.equal(runtime.productionReadyClaim, false);
  assert.equal(runtime.rollbackMode, RETRIEVAL_RUNTIME_MODES.LEXICAL);
  assert.equal(result.corpusRecords[0].sourceId, 'memory-auth');
  assert.equal(result.items[0].sourceLabel, 'mission/fact');
  assert.match(result.items[0].retrievalReason, /local model fixture-semantic-map-v1/);
  assert.deepEqual(Object.keys(result.items[0]).sort(), [
    'bm25Score',
    'chunkIndex',
    'fileName',
    'lexicalScore',
    'matchTermCount',
    'matchedTerms',
    'phraseBoostScore',
    'retrievalReason',
    'score',
    'snippet',
    'sourceLabel',
    'sourceType',
  ]);
});

test('semantic rerank runtime rejects corpus outside the mission runtime scopes', async () => {
  const input = buildInput();
  input.memoryEntries[0].scopeId = 'another-mission';
  const runtime = createRetrievalRuntimeService({
    embeddingAdapter: fixtureAdapter,
    mode: RETRIEVAL_RUNTIME_MODES.SEMANTIC_RERANK,
  });

  await assert.rejects(() => runtime.retrieve(input), /Corpus scope is not allowed/);
});

test('switching back to lexical mode is a state-free exact rollback', async () => {
  const input = buildInput();
  const lexical = createRetrievalRuntimeService({ mode: RETRIEVAL_RUNTIME_MODES.LEXICAL });

  assert.deepEqual(await lexical.retrieve(input), buildRetrievalContextWithCorpus(input));
});

test('environment factory requires explicit valid local semantic configuration', () => {
  assert.throws(
    () => createRetrievalRuntimeServiceFromEnvironment({ env: { PERSONAL_AI_AGENT_RETRIEVAL_MODE: 'unknown' } }),
    /Unsupported retrieval runtime mode/,
  );
  assert.throws(
    () => createRetrievalRuntimeServiceFromEnvironment({ env: { PERSONAL_AI_AGENT_RETRIEVAL_MODE: 'semantic-rerank' } }),
    /EMBEDDING_COMMAND is required/,
  );
  assert.throws(
    () => createRetrievalRuntimeServiceFromEnvironment({
      env: {
        PERSONAL_AI_AGENT_EMBEDDING_ARGS_JSON: '{}',
        PERSONAL_AI_AGENT_EMBEDDING_COMMAND: process.execPath,
        PERSONAL_AI_AGENT_RETRIEVAL_MODE: 'semantic-rerank',
      },
    }),
    /must be a JSON string array/,
  );
});
