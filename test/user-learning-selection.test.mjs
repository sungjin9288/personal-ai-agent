import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyUserLearningSelection,
  formatUserLearningSelectionArtifact,
  selectUserLearningMemory,
} from '../src/core/user-learning-selection.mjs';

function memory({ createdAt, id, kind = 'decision', scope = 'user', scopeId = 'user', updatedAt }) {
  return {
    content: `content for ${id}`,
    createdAt,
    id,
    kind,
    scope,
    scopeId,
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function record(entry, contentHash) {
  return {
    contentHash,
    provenance: {
      kind: entry.kind,
      sourceId: entry.id,
    },
    revision: {
      at: entry.updatedAt || entry.createdAt,
    },
    scope: {
      id: entry.scopeId,
      type: entry.scope,
    },
    sourceId: entry.id,
    sourceType: 'memory',
  };
}

test('user learning selection chooses the latest retrieved decision without copying content', () => {
  const older = memory({ createdAt: '2026-07-17T00:00:00.000Z', id: 'memory-older' });
  const newer = memory({ createdAt: '2026-07-17T00:01:00.000Z', id: 'memory-newer' });

  const selection = selectUserLearningMemory({
    memoryEntries: [older, newer],
    retrievalCorpusRecords: [record(older, 'older-hash'), record(newer, 'newer-hash')],
  });

  assert.equal(selection.status, 'selected');
  assert.equal(selection.scope, 'user');
  assert.equal(selection.scopeId, 'user');
  assert.equal(selection.selectedMemoryId, newer.id);
  assert.equal(selection.selectedContentHash, 'newer-hash');
  assert.deepEqual(selection.candidates.map((candidate) => candidate.memoryId), [
    newer.id,
    older.id,
  ]);
  assert.deepEqual(selection.candidates.map((candidate) => candidate.retrievalRank), [2, 1]);
  assert.equal(JSON.stringify(selection).includes(older.content), false);
  assert.equal(JSON.stringify(selection).includes(newer.content), false);
});

test('updatedAt wins and memory id resolves a user decision timestamp tie deterministically', () => {
  const revised = memory({
    createdAt: '2026-07-17T00:00:00.000Z',
    id: 'memory-a',
    updatedAt: '2026-07-17T00:02:00.000Z',
  });
  const sameTime = memory({ createdAt: '2026-07-17T00:02:00.000Z', id: 'memory-z' });

  const selection = selectUserLearningMemory({
    memoryEntries: [revised, sameTime],
    retrievalCorpusRecords: [record(revised, 'a-hash'), record(sameTime, 'z-hash')],
  });

  assert.equal(selection.selectedMemoryId, sameTime.id);
  assert.deepEqual(selection.candidates.map((candidate) => candidate.memoryId), [
    sameTime.id,
    revised.id,
  ]);
});

test('selection ignores preferences, foreign scope ids, and unretrieved user decisions', () => {
  const retrieved = memory({ createdAt: '2026-07-17T00:00:00.000Z', id: 'memory-retrieved' });
  const unretrieved = memory({ createdAt: '2026-07-17T00:03:00.000Z', id: 'memory-unretrieved' });
  const foreign = memory({
    createdAt: '2026-07-17T00:04:00.000Z',
    id: 'memory-foreign',
    scopeId: 'another-user',
  });
  const preference = memory({
    createdAt: '2026-07-17T00:05:00.000Z',
    id: 'memory-preference',
    kind: 'preference',
  });

  const selection = selectUserLearningMemory({
    memoryEntries: [retrieved, unretrieved, foreign, preference],
    retrievalCorpusRecords: [
      record(retrieved, 'retrieved-hash'),
      record(foreign, 'foreign-hash'),
      record(preference, 'preference-hash'),
    ],
  });

  assert.equal(selection.candidateCount, 1);
  assert.equal(selection.selectedMemoryId, retrieved.id);
});

test('provider context keeps one user decision while preserving preferences and aligned records', () => {
  const older = memory({ createdAt: '2026-07-17T00:00:00.000Z', id: 'memory-older' });
  const newer = memory({ createdAt: '2026-07-17T00:01:00.000Z', id: 'memory-newer' });
  const preference = memory({
    createdAt: '2026-07-17T00:02:00.000Z',
    id: 'memory-preference',
    kind: 'preference',
  });
  const workspaceDecision = memory({
    createdAt: '2026-07-17T00:03:00.000Z',
    id: 'memory-workspace',
    scope: 'workspace',
    scopeId: 'workspace-a',
  });
  const retrievalCorpusRecords = [
    record(older, 'older-hash'),
    record(newer, 'newer-hash'),
    record(preference, 'preference-hash'),
    record(workspaceDecision, 'workspace-hash'),
  ];
  const retrievalContext = [
    { label: 'older' },
    { label: 'newer' },
    { label: 'preference' },
    { label: 'workspace' },
  ];
  const memoryEntries = [older, newer, preference, workspaceDecision];
  const selection = selectUserLearningMemory({ memoryEntries, retrievalCorpusRecords });

  const filtered = applyUserLearningSelection({
    memoryEntries,
    retrievalContext,
    retrievalCorpusRecords,
    selection,
  });

  assert.deepEqual(filtered.memoryEntries.map((entry) => entry.id), [
    newer.id,
    preference.id,
    workspaceDecision.id,
  ]);
  assert.deepEqual(filtered.retrievalContext, [
    { label: 'newer' },
    { label: 'preference' },
    { label: 'workspace' },
  ]);
  assert.deepEqual(filtered.retrievalCorpusRecords, retrievalCorpusRecords.slice(1));
  assert.deepEqual(memoryEntries, [older, newer, preference, workspaceDecision]);
  assert.equal(
    JSON.parse(formatUserLearningSelectionArtifact(selection)).selectedMemoryId,
    newer.id,
  );
});

test('revoking user decisions falls back to the older revision and then to no selection', () => {
  const older = memory({ createdAt: '2026-07-17T00:00:00.000Z', id: 'memory-older' });
  const newer = memory({ createdAt: '2026-07-17T00:01:00.000Z', id: 'memory-newer' });

  const conflict = selectUserLearningMemory({
    memoryEntries: [older, newer],
    retrievalCorpusRecords: [record(older, 'older-hash'), record(newer, 'newer-hash')],
  });
  const afterNewerRevocation = selectUserLearningMemory({
    memoryEntries: [older],
    retrievalCorpusRecords: [record(older, 'older-hash')],
  });
  const afterFullRollback = selectUserLearningMemory();

  assert.equal(conflict.selectedMemoryId, newer.id);
  assert.equal(afterNewerRevocation.selectedMemoryId, older.id);
  assert.equal(afterFullRollback.selectedMemoryId, null);
  assert.equal(afterFullRollback.status, 'not-applicable');
});
