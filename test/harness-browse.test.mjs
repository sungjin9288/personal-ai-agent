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

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

const browseLanes = [
  {
    load: loadHarnessDocuments,
    name: 'document',
    offsetKey: 'harnessDocumentOffset',
    queryKey: 'harnessDocumentQuery',
    reset: resetHarnessDocumentBrowseState,
    resultKey: 'harnessDocumentResult',
  },
  {
    load: loadHarnessMemory,
    name: 'memory',
    offsetKey: 'harnessMemoryOffset',
    queryKey: 'harnessMemoryQuery',
    reset: resetHarnessMemoryBrowseState,
    resultKey: 'harnessMemoryResult',
  },
];

function createBrowseFixture(lane, state = { selectedMissionId: 'mission-1' }) {
  const requests = [];
  const api = (path) => {
    const deferred = createDeferred();
    requests.push({ path, ...deferred });
    return deferred.promise;
  };
  const load = (missionId) => lane.load({
    api,
    ...(missionId === undefined ? {} : { missionId }),
    state,
  });
  return { load, requests, state };
}

function createBrowsePayload(id, offset) {
  return { filters: { offset }, id };
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

for (const lane of browseLanes) {
  test(`harness ${lane.name} browse keeps the newest response and offset`, async () => {
    const { load, requests, state } = createBrowseFixture(lane, {
      [lane.offsetKey]: 4,
      selectedMissionId: 'mission-1',
    });

    const olderRequest = load();
    state[lane.offsetKey] = 8;
    const newerRequest = load();

    assert.equal(requests.length, 2);
    assert.match(requests[0].path, /offset=4/);
    assert.match(requests[1].path, /offset=8/);

    const newerPayload = createBrowsePayload('newer', 8);
    requests[1].resolve(newerPayload);
    assert.equal(await newerRequest, newerPayload);

    const olderPayload = createBrowsePayload('older', 4);
    requests[0].resolve(olderPayload);
    assert.equal(await olderRequest, olderPayload);
    assert.equal(state[lane.resultKey], newerPayload);
    assert.equal(state[lane.offsetKey], 8);
  });

  test(`harness ${lane.name} browse treats identical queries as separate requests`, async () => {
    const { load, requests, state } = createBrowseFixture(lane, {
      [lane.queryKey]: 'duplicate query',
      selectedMissionId: 'mission-1',
    });

    const olderRequest = load();
    const newerRequest = load();

    assert.equal(requests[0].path, requests[1].path);

    const newerPayload = createBrowsePayload('newer', 7);
    requests[1].resolve(newerPayload);
    await newerRequest;

    const olderPayload = createBrowsePayload('older', 3);
    requests[0].resolve(olderPayload);
    await olderRequest;

    assert.equal(state[lane.resultKey], newerPayload);
    assert.equal(state[lane.offsetKey], 7);
  });

  test(`harness ${lane.name} browse reset invalidates a pending response`, async () => {
    const previousResult = { id: 'previous' };
    const { load, requests, state } = createBrowseFixture(lane, {
      [lane.offsetKey]: 24,
      [lane.queryKey]: 'in flight',
      [lane.resultKey]: previousResult,
      selectedMissionId: 'mission-1',
    });
    const pendingRequest = load();

    lane.reset(state);
    requests[0].resolve(createBrowsePayload('stale', 12));
    await pendingRequest;

    assert.equal(state[lane.resultKey], previousResult);
    assert.equal(state[lane.offsetKey], 0);
    assert.equal(state[lane.queryKey], '');
  });

  test(`harness ${lane.name} browse without a selection invalidates a pending response`, async () => {
    const { load, requests, state } = createBrowseFixture(lane, {
      [lane.resultKey]: { id: 'previous' },
      selectedMissionId: 'mission-1',
    });
    const pendingRequest = load();

    state.selectedMissionId = '';
    assert.equal(await load(), null);
    requests[0].resolve(createBrowsePayload('stale', 12));
    await pendingRequest;

    assert.equal(state[lane.resultKey], null);
  });

  test(`harness ${lane.name} browse ignores a response after selection changes`, async () => {
    const previousResult = { id: 'previous' };
    const { load, requests, state } = createBrowseFixture(lane, {
      [lane.offsetKey]: 5,
      [lane.resultKey]: previousResult,
      selectedMissionId: 'mission-1',
    });
    const pendingRequest = load();

    state.selectedMissionId = 'mission-2';
    requests[0].resolve(createBrowsePayload('stale', 12));
    await pendingRequest;

    assert.equal(state[lane.resultKey], previousResult);
    assert.equal(state[lane.offsetKey], 5);
  });

  test(`harness ${lane.name} browse preserves explicit mission ID overrides`, async () => {
    const { load, requests, state } = createBrowseFixture(lane, {
      selectedMissionId: 'selected-mission',
    });
    const pendingRequest = load('override / mission');

    assert.match(requests[0].path, /override%20%2F%20mission/);
    const payload = createBrowsePayload('override', 6);
    requests[0].resolve(payload);
    assert.equal(await pendingRequest, payload);
    assert.equal(state[lane.resultKey], payload);
  });

  test(`harness ${lane.name} browse latest failure prevents an older success from committing`, async () => {
    const previousResult = { id: 'previous' };
    const { load, requests, state } = createBrowseFixture(lane, {
      [lane.offsetKey]: 2,
      [lane.resultKey]: previousResult,
      selectedMissionId: 'mission-1',
    });
    const olderRequest = load();
    const newerRequest = load();
    const failure = new Error('newest request failed');

    requests[1].reject(failure);
    await assert.rejects(newerRequest, failure);

    requests[0].resolve(createBrowsePayload('older', 9));
    await olderRequest;

    assert.equal(state[lane.resultKey], previousResult);
    assert.equal(state[lane.offsetKey], 2);
  });
}

test('harness browse requests are independent across state objects and lanes', async () => {
  const sharedState = { selectedMissionId: 'mission-a' };
  const otherState = { selectedMissionId: 'mission-b' };
  const documentA = createBrowseFixture(browseLanes[0], sharedState);
  const documentB = createBrowseFixture(browseLanes[0], otherState);
  const memoryA = createBrowseFixture(browseLanes[1], sharedState);

  const pending = [
    documentA.load(),
    documentB.load(),
    memoryA.load(),
  ];
  const payloads = [
    createBrowsePayload('document-a', 1),
    createBrowsePayload('document-b', 2),
    createBrowsePayload('memory-a', 3),
  ];
  [documentA, documentB, memoryA].forEach((fixture, index) => {
    fixture.requests[0].resolve(payloads[index]);
  });
  await Promise.all(pending);

  assert.equal(sharedState.harnessDocumentResult, payloads[0]);
  assert.equal(otherState.harnessDocumentResult, payloads[1]);
  assert.equal(sharedState.harnessMemoryResult, payloads[2]);
});

test('harness memory input events keep the latest query response in state', async () => {
  const search = createControl({ value: 'first query' });
  const container = createContainer({ controls: { '#harness-memory-search': search } });
  const state = {
    harnessMemoryOffset: 0,
    harnessMemoryQuery: '',
    selectedMissionId: 'mission-1',
  };
  const requests = [];
  const api = (path) => {
    const deferred = createDeferred();
    requests.push({ path, ...deferred });
    return deferred.promise;
  };

  wireHarnessMemoryBrowseActions({
    container,
    loadMemory: () => loadHarnessMemory({ api, state }),
    onDelete: async () => {},
    onEdit: () => {},
    onError: (error) => assert.fail(error.message),
    renderPanel: () => {},
    resetBrowse: () => resetHarnessMemoryBrowseState(state),
    state,
    syncUrl: () => {},
  });

  const olderEvent = search.emit('input');
  search.value = 'second query';
  const newerEvent = search.emit('input');
  assert.equal(requests.length, 2);
  assert.equal(new URL(requests[0].path, 'http://local').searchParams.get('query'), 'first query');
  assert.equal(new URL(requests[1].path, 'http://local').searchParams.get('query'), 'second query');

  const newerPayload = createBrowsePayload('newer', 8);
  requests[1].resolve(newerPayload);
  await newerEvent;

  requests[0].resolve(createBrowsePayload('older', 3));
  await olderEvent;

  assert.equal(state.harnessMemoryResult, newerPayload);
  assert.equal(state.harnessMemoryOffset, 8);
});
