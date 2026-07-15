import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildHarnessDocumentBrowseResult,
  buildHarnessMemoryBrowseResult,
} from '../src/core/mission-harness-browse.mjs';

test('document browse filters records and preserves the registry summary', () => {
  const result = buildHarnessDocumentBrowseResult({
    entries: [
      {
        content: 'Release decision',
        createdAt: '2026-07-01T00:00:00.000Z',
        id: 'document-1',
        title: 'First release',
        type: 'devlog',
      },
      {
        content: 'Release follow-up',
        createdAt: '2026-07-02T00:00:00.000Z',
        id: 'document-2',
        title: 'Second release',
        type: 'devlog',
      },
      {
        content: 'Architecture decision',
        createdAt: '2026-07-03T00:00:00.000Z',
        id: 'document-3',
        title: 'ADR',
        type: 'adr',
      },
    ],
    filter: { limit: 1, offset: 0, query: ' release ', sort: 'latest', type: 'devlog' },
    registrySummary: { availableCount: 4, trackedEntryCount: 3 },
  });

  assert.deepEqual(result.entries.map((entry) => entry.id), ['document-2']);
  assert.deepEqual(result.filters, {
    limit: 1,
    offset: 0,
    query: 'release',
    sort: 'latest',
    type: 'devlog',
  });
  assert.equal(result.hasMore, true);
  assert.equal(result.summary.availableCount, 4);
  assert.equal(result.summary.trackedEntryCount, 3);
  assert.equal(result.summary.filteredCount, 2);
  assert.equal(result.summary.currentPage, 1);
  assert.equal(result.summary.totalPages, 2);
  assert.equal(result.summary.pageStart, 1);
  assert.equal(result.summary.pageEnd, 1);
});

test('document browse keeps type and title sorting deterministic', () => {
  const entries = [
    { createdAt: '2026-07-03T00:00:00.000Z', id: 'b', title: 'Beta', type: 'devlog' },
    { createdAt: '2026-07-02T00:00:00.000Z', id: 'a', title: 'Alpha', type: 'devlog' },
    { createdAt: '2026-07-01T00:00:00.000Z', id: 'c', title: 'Charlie', type: 'adr' },
  ];

  const byType = buildHarnessDocumentBrowseResult({ entries, filter: { sort: 'type' } });
  const byTitle = buildHarnessDocumentBrowseResult({ entries, filter: { sort: 'title' } });

  assert.deepEqual(byType.entries.map((entry) => entry.id), ['c', 'a', 'b']);
  assert.deepEqual(byTitle.entries.map((entry) => entry.id), ['a', 'b', 'c']);
});

test('document browse resolves an oversized offset to the final page', () => {
  const result = buildHarnessDocumentBrowseResult({
    entries: [
      { createdAt: '2026-07-01T00:00:00.000Z', id: '1' },
      { createdAt: '2026-07-02T00:00:00.000Z', id: '2' },
      { createdAt: '2026-07-03T00:00:00.000Z', id: '3' },
    ],
    filter: { limit: 2, offset: 99 },
  });

  assert.equal(result.filters.offset, 2);
  assert.deepEqual(result.entries.map((entry) => entry.id), ['1']);
  assert.equal(result.summary.currentPage, 2);
  assert.equal(result.summary.hasNext, false);
  assert.equal(result.summary.hasPrev, true);
});

test('memory browse filters by scope, kind, and content query', () => {
  const result = buildHarnessMemoryBrowseResult({
    filter: { kind: 'decision', query: ' provider ', scope: 'mission' },
    missionEntries: [
      {
        content: 'Use the local provider first.',
        createdAt: '2026-07-02T00:00:00.000Z',
        id: 'mission-memory-1',
        kind: 'decision',
      },
      {
        content: 'Keep the audit record.',
        createdAt: '2026-07-01T00:00:00.000Z',
        id: 'mission-memory-2',
        kind: 'fact',
      },
    ],
    workspaceEntries: [
      {
        content: 'Workspace provider preference.',
        createdAt: '2026-07-03T00:00:00.000Z',
        id: 'workspace-memory-1',
        kind: 'decision',
      },
    ],
  });

  assert.deepEqual(result.entries.map((entry) => entry.id), ['mission-memory-1']);
  assert.equal(result.entries[0].scope, 'mission');
  assert.equal(result.summary.filteredMissionCount, 1);
  assert.equal(result.summary.filteredWorkspaceCount, 0);
  assert.equal(result.summary.missionTotal, 2);
  assert.equal(result.summary.workspaceTotal, 1);
  assert.equal(result.summary.total, 3);
  assert.deepEqual(result.workspaceEntries, []);
});

test('memory browse keeps kind sorting and page groups stable', () => {
  const result = buildHarnessMemoryBrowseResult({
    filter: { limit: 2, sort: 'kind' },
    missionEntries: [
      {
        content: 'Mission fact',
        createdAt: '2026-07-03T00:00:00.000Z',
        id: 'mission-fact',
        kind: 'fact',
      },
    ],
    workspaceEntries: [
      {
        content: 'Older decision',
        createdAt: '2026-07-01T00:00:00.000Z',
        id: 'workspace-decision-old',
        kind: 'decision',
      },
      {
        content: 'Newer decision',
        createdAt: '2026-07-02T00:00:00.000Z',
        id: 'workspace-decision-new',
        kind: 'decision',
      },
    ],
  });

  assert.deepEqual(result.entries.map((entry) => entry.id), [
    'workspace-decision-new',
    'workspace-decision-old',
  ]);
  assert.deepEqual(result.missionEntries, []);
  assert.deepEqual(result.workspaceEntries.map((entry) => entry.id), [
    'workspace-decision-new',
    'workspace-decision-old',
  ]);
  assert.equal(result.hasMore, true);
});

test('empty harness browse results keep zero-valued paging metadata', () => {
  const documents = buildHarnessDocumentBrowseResult({ entries: [], filter: { offset: 12 } });
  const memory = buildHarnessMemoryBrowseResult({ missionEntries: [], workspaceEntries: [] });

  assert.equal(documents.filters.offset, 0);
  assert.equal(documents.summary.currentPage, 0);
  assert.equal(documents.summary.pageStart, 0);
  assert.equal(documents.summary.totalPages, 0);
  assert.equal(memory.filters.offset, 0);
  assert.equal(memory.summary.currentPage, 0);
  assert.equal(memory.summary.totalPages, 0);
  assert.deepEqual(memory.entries, []);
});
