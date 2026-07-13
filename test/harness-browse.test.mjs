import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildHarnessDocumentsQueryParams,
  buildHarnessMemoryQueryParams,
  loadHarnessDocuments,
  loadHarnessMemory,
  resetHarnessDocumentBrowseState,
  resetHarnessMemoryBrowseState,
  wireHarnessDocumentBrowseActions,
  wireHarnessMemoryBrowseActions,
} from '../src/web/public/lib/harness-browse.js';

function createControl({ dataset = {}, value = '' } = {}) {
  const listeners = new Map();
  return {
    dataset,
    value,
    addEventListener(type, listener) {
      const registered = listeners.get(type) || [];
      registered.push(listener);
      listeners.set(type, registered);
    },
    async emit(type) {
      for (const listener of listeners.get(type) || []) {
        await listener({ target: this });
      }
    },
  };
}

function createContainer({ controls = {}, groups = {} } = {}) {
  return {
    querySelector(selector) {
      return controls[selector] || null;
    },
    querySelectorAll(selector) {
      return groups[selector] || [];
    },
  };
}

test('harness document query preserves the API filter contract', () => {
  const params = buildHarnessDocumentsQueryParams({
    harnessDocumentFilter: 'devlog',
    harnessDocumentOffset: 24,
    harnessDocumentQuery: 'release notes',
    harnessDocumentSort: 'title',
    harnessDocumentVisibleCount: 48,
  });

  assert.equal(params.toString(), 'limit=48&offset=24&query=release+notes&sort=title&type=devlog');
});

test('harness memory query preserves scope, kind, and paging', () => {
  const params = buildHarnessMemoryQueryParams({
    harnessMemoryFilterKind: 'decision',
    harnessMemoryFilterScope: 'workspace',
    harnessMemoryOffset: 12,
    harnessMemoryQuery: 'provider',
    harnessMemorySort: 'kind',
    harnessMemoryVisibleCount: 24,
  });

  assert.equal(params.toString(), 'kind=decision&limit=24&offset=12&query=provider&scope=workspace&sort=kind');
});

test('harness loaders keep fetched results and normalized offsets in state', async () => {
  const paths = [];
  const state = {
    harnessDocumentFilter: 'all',
    harnessDocumentOffset: 0,
    harnessDocumentQuery: '',
    harnessDocumentSort: 'latest',
    harnessDocumentVisibleCount: 12,
    harnessMemoryFilterKind: 'all',
    harnessMemoryFilterScope: 'all',
    harnessMemoryOffset: 0,
    harnessMemoryQuery: '',
    harnessMemorySort: 'latest',
    harnessMemoryVisibleCount: 12,
    selectedMissionId: 'mission / 1',
  };
  const api = async (path) => {
    paths.push(path);
    return path.includes('/documents?')
      ? { entries: [], filters: { offset: 12 } }
      : { entries: [], filters: { offset: 24 } };
  };

  const documents = await loadHarnessDocuments({ api, state });
  const memory = await loadHarnessMemory({ api, state });

  assert.match(paths[0], /^\/api\/missions\/mission%20%2F%201\/harness\/documents\?/);
  assert.match(paths[1], /^\/api\/missions\/mission%20%2F%201\/harness\/memory\?/);
  assert.equal(state.harnessDocumentResult, documents);
  assert.equal(state.harnessDocumentOffset, 12);
  assert.equal(state.harnessMemoryResult, memory);
  assert.equal(state.harnessMemoryOffset, 24);
});

test('harness loaders clear stale results when no mission is selected', async () => {
  const state = {
    harnessDocumentResult: { stale: true },
    harnessMemoryResult: { stale: true },
    selectedMissionId: '',
  };
  const api = async () => assert.fail('api should not be called without a mission');

  assert.equal(await loadHarnessDocuments({ api, state }), null);
  assert.equal(await loadHarnessMemory({ api, state }), null);
  assert.equal(state.harnessDocumentResult, null);
  assert.equal(state.harnessMemoryResult, null);
});

test('harness browse reset functions restore the documented defaults', () => {
  const state = {
    harnessAttachmentFocus: 'attachment.md',
    harnessDocumentFilter: 'devlog',
    harnessDocumentOffset: 24,
    harnessDocumentQuery: 'query',
    harnessDocumentSort: 'title',
    harnessDocumentVisibleCount: 48,
    harnessMemoryFilterKind: 'decision',
    harnessMemoryFilterScope: 'workspace',
    harnessMemoryOffset: 12,
    harnessMemoryQuery: 'query',
    harnessMemorySort: 'kind',
    harnessMemoryVisibleCount: 24,
    retrievalSourceFocusLabel: 'source',
    retrievalSourceFocusType: 'memory',
  };

  resetHarnessDocumentBrowseState(state);
  resetHarnessMemoryBrowseState(state);

  assert.deepEqual(state, {
    harnessAttachmentFocus: '',
    harnessDocumentFilter: 'all',
    harnessDocumentOffset: 0,
    harnessDocumentQuery: '',
    harnessDocumentSort: 'latest',
    harnessDocumentVisibleCount: 12,
    harnessMemoryFilterKind: 'all',
    harnessMemoryFilterScope: 'all',
    harnessMemoryOffset: 0,
    harnessMemoryQuery: '',
    harnessMemorySort: 'latest',
    harnessMemoryVisibleCount: 12,
    retrievalSourceFocusLabel: '',
    retrievalSourceFocusType: '',
  });
});

test('document browse wiring applies sort and delegates mutation actions', async () => {
  const sort = createControl({ value: 'oldest' });
  const edit = createControl({ dataset: { documentId: 'document-1' } });
  const remove = createControl({ dataset: { documentId: 'document-2' } });
  const container = createContainer({
    controls: { '#document-log-sort': sort },
    groups: {
      '[data-document-action="delete"]': [remove],
      '[data-document-action="edit"]': [edit],
    },
  });
  const calls = [];
  const state = { harnessDocumentOffset: 24, harnessDocumentSort: 'latest' };

  wireHarnessDocumentBrowseActions({
    container,
    loadDocuments: async () => calls.push('load'),
    onDelete: async (entryId) => calls.push(`delete:${entryId}`),
    onEdit: (entryId) => calls.push(`edit:${entryId}`),
    onError: (error) => assert.fail(error.message),
    onMigrate: async () => calls.push('migrate'),
    renderPanel: () => calls.push('render'),
    resetBrowse: () => calls.push('reset'),
    state,
  });

  await sort.emit('change');
  await edit.emit('click');
  await remove.emit('click');

  assert.equal(state.harnessDocumentSort, 'oldest');
  assert.equal(state.harnessDocumentOffset, 0);
  assert.deepEqual(calls, ['load', 'render', 'edit:document-1', 'delete:document-2']);
});

test('memory browse wiring clears retrieval focus and synchronizes URL state', async () => {
  const search = createControl({ value: 'decision record' });
  const edit = createControl({ dataset: { memoryId: 'memory-1', memoryScope: 'workspace' } });
  const container = createContainer({
    controls: { '#harness-memory-search': search },
    groups: { '[data-memory-action="edit"]': [edit] },
  });
  const calls = [];
  const state = {
    harnessMemoryOffset: 12,
    harnessMemoryQuery: '',
    retrievalSourceFocusLabel: 'focused source',
    retrievalSourceFocusType: 'memory',
  };

  wireHarnessMemoryBrowseActions({
    container,
    loadMemory: async () => calls.push('load'),
    onDelete: async () => calls.push('delete'),
    onEdit: ({ memoryId, scope }) => calls.push(`edit:${scope}:${memoryId}`),
    onError: (error) => assert.fail(error.message),
    renderPanel: () => calls.push('render'),
    resetBrowse: () => calls.push('reset'),
    state,
    syncUrl: () => calls.push('sync-url'),
  });

  await search.emit('input');
  await edit.emit('click');

  assert.equal(state.harnessMemoryQuery, 'decision record');
  assert.equal(state.harnessMemoryOffset, 0);
  assert.equal(state.retrievalSourceFocusLabel, '');
  assert.equal(state.retrievalSourceFocusType, '');
  assert.deepEqual(calls, ['load', 'render', 'sync-url', 'edit:workspace:memory-1']);
});
