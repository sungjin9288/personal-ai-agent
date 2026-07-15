import { MEMORY_KINDS, MEMORY_SCOPES } from './constants.mjs';

function normalizeText(value) {
  return String(value || '').trim();
}

function validateScope(scope) {
  if (!MEMORY_SCOPES.includes(scope)) {
    throw new Error(`Unsupported memory scope: ${scope}`);
  }
}

function validateKind(kind) {
  if (!MEMORY_KINDS.includes(kind)) {
    throw new Error(`Unsupported memory kind: ${kind}`);
  }
}

export function createMissionMemoryService({ factGraph, getMission, getWorkspace, harness, store }) {
  function validateParent(scope, scopeId) {
    if (scope === 'workspace') {
      getWorkspace(scopeId);
    }
    if (scope === 'mission') {
      getMission(scopeId);
    }
  }

  function getMemoryEntry({ memoryId, scope, scopeId }) {
    const entry = store.listMemoryEntries({ scope, scopeId }).find((item) => item.id === memoryId);

    if (!entry) {
      throw new Error(`Memory entry not found: ${memoryId}`);
    }

    return entry;
  }

  function addMemory({ scope, scopeId, kind, content }) {
    validateScope(scope);
    validateKind(kind);
    const normalizedContent = normalizeText(content);
    if (!normalizedContent) {
      throw new Error('Memory content is required.');
    }

    validateParent(scope, scopeId);
    const entry = harness.addMemoryEntry({
      scope,
      scopeId,
      kind,
      content: normalizedContent,
    });
    factGraph.syncMemoryFact(entry);
    return entry;
  }

  function updateMemory({ scope, scopeId, memoryId, kind, content }) {
    validateScope(scope);
    validateKind(kind);
    const normalizedContent = normalizeText(content);
    if (!normalizedContent) {
      throw new Error('Memory content is required.');
    }

    validateParent(scope, scopeId);
    const previousEntry = getMemoryEntry({ memoryId, scope, scopeId });
    const updatedEntry = store.updateMemoryEntry(memoryId, (entry) => ({
      ...entry,
      content: normalizedContent,
      kind,
      updatedAt: new Date().toISOString(),
    }));
    factGraph.syncMemoryFact(updatedEntry, { previousEntry });
    return updatedEntry;
  }

  function deleteMemory({ scope, scopeId, memoryId }) {
    validateScope(scope);
    validateParent(scope, scopeId);

    const previousEntry = getMemoryEntry({ memoryId, scope, scopeId });
    const removedEntry = store.deleteMemoryEntry(memoryId);
    factGraph.retireMemoryFact(previousEntry, { reason: 'memory-deleted' });
    return removedEntry;
  }

  function listMemory(filter = {}) {
    return store.listMemoryEntries(filter);
  }

  function listFactGraph(filter = {}) {
    return factGraph.listFactGraph(filter);
  }

  return {
    addMemory,
    deleteMemory,
    listFactGraph,
    listMemory,
    updateMemory,
  };
}
