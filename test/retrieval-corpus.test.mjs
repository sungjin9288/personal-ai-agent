import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildAttachmentCorpusRecord,
  buildFactCorpusRecord,
  buildMemoryCorpusRecord,
  RETRIEVAL_CORPUS_SCHEMA_VERSION,
} from '../src/core/retrieval-corpus.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';

const createdAt = '2026-07-16T00:00:00.000Z';
const updatedAt = '2026-07-16T01:00:00.000Z';

test('memory corpus records keep deterministic source, revision, scope, and provenance', () => {
  const entry = {
    content: 'Provider drift recovery requires prompt normalization evidence.',
    createdAt,
    id: 'memory-1',
    kind: 'fact',
    scope: 'workspace',
    scopeId: 'workspace-1',
    updatedAt,
  };

  const first = buildMemoryCorpusRecord(entry);
  const second = buildMemoryCorpusRecord({ ...entry });

  assert.deepEqual(second, first);
  assert.equal(first.schemaVersion, RETRIEVAL_CORPUS_SCHEMA_VERSION);
  assert.equal(first.sourceId, 'memory-1');
  assert.equal(first.sourceIdDerived, false);
  assert.deepEqual(first.scope, { id: 'workspace-1', type: 'workspace' });
  assert.equal(first.revision.at, updatedAt);
  assert.equal(first.revision.number, null);
  assert.deepEqual(first.provenance, {
    kind: 'fact',
    sourceCreatedAt: createdAt,
    sourceId: 'memory-1',
    sourceType: 'memory',
    sourceUpdatedAt: updatedAt,
  });
});

test('content changes produce a new corpus revision and chunk identity', () => {
  const source = {
    createdAt,
    id: 'memory-1',
    kind: 'fact',
    scope: 'workspace',
    scopeId: 'workspace-1',
    updatedAt,
  };
  const before = buildMemoryCorpusRecord({ ...source, content: 'Original evidence.' });
  const after = buildMemoryCorpusRecord({ ...source, content: 'Revised evidence.' });

  assert.notEqual(after.contentHash, before.contentHash);
  assert.notEqual(after.revision.id, before.revision.id);
  assert.notEqual(after.corpusId, before.corpusId);
  assert.notEqual(after.chunkId, before.chunkId);
});

test('attachment corpus records identify each chunk without exposing a local path', () => {
  const attachment = {
    createdAt,
    fileName: 'incident-notes.md',
    id: 'attachment-1',
    mimeType: 'text/markdown',
    missionId: 'mission-1',
    path: '/private/workspace/incident-notes.md',
    source: 'ui',
  };
  const first = buildAttachmentCorpusRecord(attachment, {
    chunkCount: 2,
    chunkIndex: 1,
    content: 'First chunk.',
  });
  const second = buildAttachmentCorpusRecord(attachment, {
    chunkCount: 2,
    chunkIndex: 2,
    content: 'Second chunk.',
  });

  assert.equal(first.chunkCount, 2);
  assert.equal(first.chunkIndex, 1);
  assert.notEqual(first.chunkId, second.chunkId);
  assert.equal(first.scope.type, 'mission');
  assert.equal(first.scope.id, 'mission-1');
  assert.equal(JSON.stringify(first.provenance).includes(attachment.path), false);
  assert.equal(Object.hasOwn(first.provenance, 'path'), false);
});

test('fact corpus records preserve fact version and controlled memory provenance', () => {
  const record = buildFactCorpusRecord({
    createdAt,
    id: 'fact-1',
    provenance: [
      {
        kind: 'fact',
        sourceCreatedAt: createdAt,
        sourceId: 'memory-1',
        sourceType: 'memory',
        sourceUpdatedAt: updatedAt,
      },
    ],
    scope: 'mission',
    scopeId: 'mission-1',
    sourceId: 'memory-1',
    sourceType: 'memory',
    statement: 'The approved provider recovery fact.',
    status: 'active',
    updatedAt,
    validFrom: createdAt,
    version: 3,
  });

  assert.equal(record.sourceType, 'fact');
  assert.equal(record.sourceId, 'fact-1');
  assert.equal(record.revision.number, 3);
  assert.equal(record.provenance.sourceId, 'memory-1');
  assert.equal(record.provenance.sourceType, 'memory');
});

test('missing source ids receive deterministic derived identities', () => {
  const input = {
    content: 'Fixture-only memory without a persisted id.',
    kind: 'fact',
    scope: 'workspace',
  };

  const first = buildMemoryCorpusRecord(input);
  const second = buildMemoryCorpusRecord(input);

  assert.equal(first.sourceIdDerived, true);
  assert.equal(first.sourceId, second.sourceId);
  assert.equal(first.chunkId, second.chunkId);
});

test('empty corpus content is skipped like the existing retrieval candidates', () => {
  assert.equal(buildMemoryCorpusRecord({ content: '   ' }), null);
  assert.equal(buildAttachmentCorpusRecord({}, { content: '' }), null);
  assert.equal(buildFactCorpusRecord({ statement: '' }), null);
});

test('retrieval keeps its serialized payload while retaining internal corpus lineage', () => {
  const { corpusRecords, items: context } = buildRetrievalContextWithCorpus({
    attachments: [],
    memoryEntries: [
      {
        content: 'Provider drift recovery requires prompt normalization evidence.',
        createdAt,
        id: 'memory-1',
        kind: 'fact',
        scope: 'workspace',
        scopeId: 'workspace-1',
      },
    ],
    mission: {
      constraints: [],
      deliverableType: 'decision-memo',
      mode: 'knowledge',
      objective: 'Explain provider drift recovery and prompt normalization evidence.',
      title: 'Provider recovery',
    },
    pack: { requiredSections: [], reviewRules: [] },
    previousOutputs: {},
    providerRole: 'manager',
    role: 'manager',
  });
  const item = context[0];
  const record = corpusRecords[0];

  assert.ok(record);
  assert.equal(record.sourceId, 'memory-1');
  assert.deepEqual(Object.keys(item).sort(), [
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
  assert.equal(JSON.stringify(item).includes('corpusId'), false);
  assert.equal(JSON.stringify(item).includes('contentHash'), false);
});
