import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  applyUserLearningSelection,
  buildUserLearningSelectionOverrides,
  formatUserLearningSelectionArtifact,
  selectUserLearningMemory,
} from '../src/core/user-learning-selection.mjs';

const hash = (value) => createHash('sha256').update(String(value)).digest('hex');

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

function candidateWithOverride({
  expiresAt,
  id = 'candidate-older',
  memoryId = 'memory-older',
  setAt,
  status = 'active',
  scopeId = 'user',
}) {
  return {
    id,
    promotionDecision: {
      decision: 'approve',
      memoryId,
      scope: 'user',
      scopeId,
      target: 'memory',
    },
    promotionScopeAuthorization: { status: 'consumed' },
    promotionStatus: 'promoted',
    promotionVerification: { status: 'passed' },
    userLearningSelectionOverride: {
      expiresAt,
      id: `${id}:override`,
      memoryId,
      noteHash: hash(`${id} note`),
      scope: 'user',
      scopeId,
      setAt,
      status,
    },
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

test('active operator override selects an older retrieved user decision without injecting context', () => {
  const older = memory({ createdAt: '2026-07-17T00:00:00.000Z', id: 'memory-older' });
  const newer = memory({ createdAt: '2026-07-17T00:01:00.000Z', id: 'memory-newer' });
  const selectionOverrides = buildUserLearningSelectionOverrides({
    learningCandidates: [candidateWithOverride({
      expiresAt: '2026-07-17T02:00:00.000Z',
      setAt: '2026-07-17T01:00:00.000Z',
    })],
    observedAt: '2026-07-17T01:30:00.000Z',
  });

  const selection = selectUserLearningMemory({
    memoryEntries: [older, newer],
    retrievalCorpusRecords: [record(newer, 'newer-hash'), record(older, 'older-hash')],
    selectionOverrides,
  });

  assert.equal(selection.policyId, 'user-decision-operator-override-v1');
  assert.equal(selection.selectionSource, 'operator-override');
  assert.equal(selection.selectedMemoryId, older.id);
  assert.equal(selection.overrideEvaluation.selectedOverrideId, 'candidate-older:override');
  assert.deepEqual(selection.candidates.map((candidate) => candidate.memoryId), [older.id, newer.id]);
  assert.equal(JSON.stringify(selection).includes(older.content), false);
});

test('expired and cleared user overrides fall back to the latest retrieved decision', () => {
  const older = memory({ createdAt: '2026-07-17T00:00:00.000Z', id: 'memory-older' });
  const newer = memory({ createdAt: '2026-07-17T00:01:00.000Z', id: 'memory-newer' });
  const selectionOverrides = buildUserLearningSelectionOverrides({
    learningCandidates: [
      candidateWithOverride({
        expiresAt: '2026-07-17T01:00:00.000Z',
        setAt: '2026-07-17T00:30:00.000Z',
      }),
      candidateWithOverride({
        expiresAt: '2026-07-17T03:00:00.000Z',
        id: 'candidate-cleared',
        memoryId: 'memory-cleared',
        setAt: '2026-07-17T00:45:00.000Z',
        status: 'cleared',
      }),
    ],
    observedAt: '2026-07-17T02:00:00.000Z',
  });

  const selection = selectUserLearningMemory({
    memoryEntries: [older, newer],
    retrievalCorpusRecords: [record(older, 'older-hash'), record(newer, 'newer-hash')],
    selectionOverrides,
  });

  assert.equal(selection.policyId, 'user-decision-latest-revision-v1');
  assert.equal(selection.selectionSource, 'latest-revision-fallback');
  assert.equal(selection.selectedMemoryId, newer.id);
  assert.equal(selection.overrideEvaluation.expiredCount, 1);
  assert.equal(selection.overrideEvaluation.clearedCount, 1);
});

test('operator override cannot inject a foreign-scope or unretrieved user decision', () => {
  const retrieved = memory({ createdAt: '2026-07-17T00:00:00.000Z', id: 'memory-retrieved' });
  const unretrieved = memory({ createdAt: '2026-07-17T00:01:00.000Z', id: 'memory-unretrieved' });
  const selectionOverrides = buildUserLearningSelectionOverrides({
    learningCandidates: [
      candidateWithOverride({
        expiresAt: '2026-07-17T03:00:00.000Z',
        id: 'candidate-foreign',
        memoryId: 'memory-foreign',
        scopeId: 'another-user',
        setAt: '2026-07-17T01:00:00.000Z',
      }),
      candidateWithOverride({
        expiresAt: '2026-07-17T03:00:00.000Z',
        id: 'candidate-unretrieved',
        memoryId: unretrieved.id,
        setAt: '2026-07-17T01:00:00.000Z',
      }),
    ],
    observedAt: '2026-07-17T02:00:00.000Z',
  });

  const selection = selectUserLearningMemory({
    memoryEntries: [retrieved, unretrieved],
    retrievalCorpusRecords: [record(retrieved, 'retrieved-hash')],
    selectionOverrides,
  });

  assert.equal(selection.selectedMemoryId, retrieved.id);
  assert.equal(selection.overrideEvaluation.invalidCount, 1);
  assert.equal(selection.overrideEvaluation.unretrievedActiveCount, 1);
  assert.equal(selection.selectionSource, 'latest-revision-fallback');
});

test('only the latest user override action is eligible so an older active override cannot revive', () => {
  const older = memory({ createdAt: '2026-07-17T00:00:00.000Z', id: 'memory-older' });
  const newer = memory({ createdAt: '2026-07-17T00:01:00.000Z', id: 'memory-newer' });
  const selectionOverrides = buildUserLearningSelectionOverrides({
    learningCandidates: [
      candidateWithOverride({
        expiresAt: '2026-07-17T04:00:00.000Z',
        setAt: '2026-07-17T01:00:00.000Z',
      }),
      candidateWithOverride({
        expiresAt: '2026-07-17T02:00:00.000Z',
        id: 'candidate-newer',
        memoryId: newer.id,
        setAt: '2026-07-17T01:30:00.000Z',
      }),
    ],
    observedAt: '2026-07-17T03:00:00.000Z',
  });

  const selection = selectUserLearningMemory({
    memoryEntries: [older, newer],
    retrievalCorpusRecords: [record(older, 'older-hash'), record(newer, 'newer-hash')],
    selectionOverrides,
  });

  assert.equal(selection.overrideEvaluation.currentOverrideId, 'candidate-newer:override');
  assert.equal(selection.overrideEvaluation.selectedOverrideId, null);
  assert.equal(selection.selectedMemoryId, newer.id);
  assert.equal(selection.selectionSource, 'latest-revision-fallback');
});
