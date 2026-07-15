import assert from 'node:assert/strict';
import test from 'node:test';

import { createMissionMemoryService } from '../src/core/mission-memory-service.mjs';

function createFixture() {
  const calls = {
    factLists: [],
    missions: [],
    retired: [],
    synced: [],
    workspaces: [],
  };
  const entries = new Map();
  let nextId = 1;

  const store = {
    deleteMemoryEntry(memoryId) {
      const entry = entries.get(memoryId);
      entries.delete(memoryId);
      return entry;
    },
    listMemoryEntries(filter = {}) {
      return [...entries.values()].filter(
        (entry) =>
          (!filter.scope || entry.scope === filter.scope) &&
          (!filter.scopeId || entry.scopeId === filter.scopeId),
      );
    },
    updateMemoryEntry(memoryId, updater) {
      const entry = updater(entries.get(memoryId));
      entries.set(memoryId, entry);
      return entry;
    },
  };

  const harness = {
    addMemoryEntry(input) {
      const entry = {
        ...input,
        createdAt: '2026-07-15T00:00:00.000Z',
        id: `memory-${nextId++}`,
      };
      entries.set(entry.id, entry);
      return entry;
    },
  };

  const factGraph = {
    listFactGraph(filter) {
      calls.factLists.push(filter);
      return { edges: [], nodes: [], summary: { total: 0 } };
    },
    retireMemoryFact(entry, options) {
      calls.retired.push({ entry, options });
    },
    syncMemoryFact(entry, options) {
      calls.synced.push({ entry, options });
    },
  };

  const service = createMissionMemoryService({
    factGraph,
    getMission(missionId) {
      calls.missions.push(missionId);
      if (missionId === 'missing-mission') {
        throw new Error(`Mission not found: ${missionId}`);
      }
      return { id: missionId };
    },
    getWorkspace(workspaceId) {
      calls.workspaces.push(workspaceId);
      if (workspaceId === 'missing-workspace') {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }
      return { id: workspaceId };
    },
    harness,
    store,
  });

  return { calls, entries, service };
}

test('addMemory normalizes content, validates its parent, and syncs the fact graph', () => {
  const fixture = createFixture();

  const entry = fixture.service.addMemory({
    content: '  Keep the decision trace  ',
    kind: 'fact',
    scope: 'workspace',
    scopeId: 'workspace-1',
  });

  assert.equal(entry.content, 'Keep the decision trace');
  assert.deepEqual(fixture.calls.workspaces, ['workspace-1']);
  assert.deepEqual(fixture.calls.missions, []);
  assert.deepEqual(fixture.calls.synced, [{ entry, options: undefined }]);
});

test('addMemory rejects invalid input before writing', async (t) => {
  const cases = [
    {
      expected: /Unsupported memory scope: team/,
      input: { scope: 'team', scopeId: 'team-1', kind: 'fact', content: 'value' },
      name: 'scope',
    },
    {
      expected: /Unsupported memory kind: note/,
      input: { scope: 'user', scopeId: 'user-1', kind: 'note', content: 'value' },
      name: 'kind',
    },
    {
      expected: /Memory content is required\./,
      input: { scope: 'user', scopeId: 'user-1', kind: 'fact', content: '   ' },
      name: 'content',
    },
  ];

  for (const { expected, input, name } of cases) {
    await t.test(name, () => {
      const fixture = createFixture();

      assert.throws(() => fixture.service.addMemory(input), expected);
      assert.equal(fixture.entries.size, 0);
      assert.equal(fixture.calls.synced.length, 0);
    });
  }
});

test('addMemory preserves workspace and mission lookup failures', () => {
  const workspaceFixture = createFixture();
  assert.throws(
    () => workspaceFixture.service.addMemory({
      scope: 'workspace',
      scopeId: 'missing-workspace',
      kind: 'decision',
      content: 'value',
    }),
    /Workspace not found: missing-workspace/,
  );

  const missionFixture = createFixture();
  assert.throws(
    () => missionFixture.service.addMemory({
      scope: 'mission',
      scopeId: 'missing-mission',
      kind: 'decision',
      content: 'value',
    }),
    /Mission not found: missing-mission/,
  );
});

test('updateMemory keeps the previous entry for fact graph revision tracking', () => {
  const fixture = createFixture();
  const created = fixture.service.addMemory({
    scope: 'mission',
    scopeId: 'mission-1',
    kind: 'fact',
    content: 'Original fact',
  });
  fixture.calls.synced.length = 0;

  const updated = fixture.service.updateMemory({
    scope: 'mission',
    scopeId: 'mission-1',
    memoryId: created.id,
    kind: 'decision',
    content: '  Revised decision  ',
  });

  assert.equal(updated.content, 'Revised decision');
  assert.equal(updated.kind, 'decision');
  assert.ok(updated.updatedAt);
  assert.deepEqual(fixture.calls.missions, ['mission-1', 'mission-1']);
  assert.deepEqual(fixture.calls.synced, [{ entry: updated, options: { previousEntry: created } }]);
});

test('updateMemory rejects a missing scoped entry', () => {
  const fixture = createFixture();

  assert.throws(
    () => fixture.service.updateMemory({
      scope: 'user',
      scopeId: 'user-1',
      memoryId: 'missing-memory',
      kind: 'fact',
      content: 'value',
    }),
    /Memory entry not found: missing-memory/,
  );
});

test('deleteMemory retires the fact graph record after removing memory', () => {
  const fixture = createFixture();
  const created = fixture.service.addMemory({
    scope: 'user',
    scopeId: 'user-1',
    kind: 'fact',
    content: 'Temporary fact',
  });

  const removed = fixture.service.deleteMemory({
    scope: 'user',
    scopeId: 'user-1',
    memoryId: created.id,
  });

  assert.equal(removed, created);
  assert.equal(fixture.entries.size, 0);
  assert.deepEqual(fixture.calls.retired, [
    { entry: created, options: { reason: 'memory-deleted' } },
  ]);
});

test('listMemory and listFactGraph preserve their filters', () => {
  const fixture = createFixture();
  fixture.service.addMemory({
    scope: 'user',
    scopeId: 'user-1',
    kind: 'preference',
    content: 'Concise output',
  });
  fixture.service.addMemory({
    scope: 'user',
    scopeId: 'user-2',
    kind: 'preference',
    content: 'Detailed output',
  });

  const memory = fixture.service.listMemory({ scope: 'user', scopeId: 'user-1' });
  const graph = fixture.service.listFactGraph({ scope: 'user', scopeId: 'user-1' });

  assert.equal(memory.length, 1);
  assert.equal(memory[0].content, 'Concise output');
  assert.deepEqual(graph, { edges: [], nodes: [], summary: { total: 0 } });
  assert.deepEqual(fixture.calls.factLists, [{ scope: 'user', scopeId: 'user-1' }]);
});
