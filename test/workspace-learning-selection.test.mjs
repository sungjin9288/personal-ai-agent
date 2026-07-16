import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyWorkspaceLearningSelection,
  formatWorkspaceLearningSelectionArtifact,
  selectWorkspaceLearningMemory,
} from '../src/core/workspace-learning-selection.mjs';

function memory({ createdAt, id, kind = 'decision', scopeId = 'workspace-a', updatedAt }) {
  return {
    content: `content for ${id}`,
    createdAt,
    id,
    kind,
    scope: 'workspace',
    scopeId,
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function record(entry, contentHash, overrides = {}) {
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
    ...overrides,
  };
}

test('workspace learning selection chooses the latest retrieved decision without copying content', () => {
  const older = memory({
    createdAt: '2026-07-17T00:00:00.000Z',
    id: 'memory-older',
  });
  const newer = memory({
    createdAt: '2026-07-17T00:01:00.000Z',
    id: 'memory-newer',
  });

  const selection = selectWorkspaceLearningMemory({
    memoryEntries: [older, newer],
    retrievalCorpusRecords: [record(older, 'older-hash'), record(newer, 'newer-hash')],
    workspaceId: 'workspace-a',
  });

  assert.equal(selection.status, 'selected');
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

test('updatedAt wins and memory id resolves an exact timestamp tie deterministically', () => {
  const revised = memory({
    createdAt: '2026-07-17T00:00:00.000Z',
    id: 'memory-a',
    updatedAt: '2026-07-17T00:02:00.000Z',
  });
  const sameTime = memory({
    createdAt: '2026-07-17T00:02:00.000Z',
    id: 'memory-z',
  });

  const selection = selectWorkspaceLearningMemory({
    memoryEntries: [revised, sameTime],
    retrievalCorpusRecords: [record(revised, 'a-hash'), record(sameTime, 'z-hash')],
    workspaceId: 'workspace-a',
  });

  assert.equal(selection.selectedMemoryId, sameTime.id);
  assert.deepEqual(selection.candidates.map((candidate) => candidate.memoryId), [
    sameTime.id,
    revised.id,
  ]);
});

test('selection ignores foreign, non-decision, and unretrieved workspace memory', () => {
  const retrieved = memory({
    createdAt: '2026-07-17T00:00:00.000Z',
    id: 'memory-retrieved',
  });
  const unretrieved = memory({
    createdAt: '2026-07-17T00:03:00.000Z',
    id: 'memory-unretrieved',
  });
  const foreign = memory({
    createdAt: '2026-07-17T00:04:00.000Z',
    id: 'memory-foreign',
    scopeId: 'workspace-b',
  });
  const fact = memory({
    createdAt: '2026-07-17T00:05:00.000Z',
    id: 'memory-fact',
    kind: 'fact',
  });

  const selection = selectWorkspaceLearningMemory({
    memoryEntries: [retrieved, unretrieved, foreign, fact],
    retrievalCorpusRecords: [
      record(retrieved, 'retrieved-hash'),
      record(foreign, 'foreign-hash'),
      record(fact, 'fact-hash'),
    ],
    workspaceId: 'workspace-a',
  });

  assert.equal(selection.candidateCount, 1);
  assert.equal(selection.selectedMemoryId, retrieved.id);
});

test('provider context keeps selected workspace decision and preserves aligned retrieval records', () => {
  const older = memory({
    createdAt: '2026-07-17T00:00:00.000Z',
    id: 'memory-older',
  });
  const newer = memory({
    createdAt: '2026-07-17T00:01:00.000Z',
    id: 'memory-newer',
  });
  const missionMemory = {
    content: 'mission note',
    id: 'memory-mission',
    kind: 'note',
    scope: 'mission',
    scopeId: 'mission-a',
  };
  const retrievalCorpusRecords = [
    record(older, 'older-hash'),
    record(newer, 'newer-hash'),
    {
      provenance: { sourceId: missionMemory.id },
      scope: { id: missionMemory.scopeId, type: missionMemory.scope },
      sourceType: 'memory',
    },
  ];
  const retrievalContext = [{ label: 'older' }, { label: 'newer' }, { label: 'mission' }];
  const memoryEntries = [older, newer, missionMemory];
  const selection = selectWorkspaceLearningMemory({
    memoryEntries,
    retrievalCorpusRecords,
    workspaceId: 'workspace-a',
  });

  const filtered = applyWorkspaceLearningSelection({
    memoryEntries,
    retrievalContext,
    retrievalCorpusRecords,
    selection,
    workspaceId: 'workspace-a',
  });

  assert.deepEqual(filtered.memoryEntries.map((entry) => entry.id), [newer.id, missionMemory.id]);
  assert.deepEqual(filtered.retrievalContext, [{ label: 'newer' }, { label: 'mission' }]);
  assert.deepEqual(filtered.retrievalCorpusRecords, [
    retrievalCorpusRecords[1],
    retrievalCorpusRecords[2],
  ]);
  assert.deepEqual(memoryEntries, [older, newer, missionMemory]);
  assert.equal(JSON.parse(formatWorkspaceLearningSelectionArtifact(selection)).selectedMemoryId, newer.id);
});
