import assert from 'node:assert/strict';
import { test } from 'node:test';

import { wireApplicationEvents } from '../src/web/public/lib/application-events.js';

function createEventTarget(dataset = {}) {
  const listeners = new Map();
  return {
    dataset,
    addEventListener(eventName, listener) {
      const eventListeners = listeners.get(eventName) || [];
      eventListeners.push(listener);
      listeners.set(eventName, eventListeners);
    },
    async dispatch(eventName) {
      const event = { currentTarget: this, target: this, type: eventName };
      await Promise.all((listeners.get(eventName) || []).map((listener) => listener(event)));
    },
    listenerCount(eventName) {
      return listeners.get(eventName)?.length || 0;
    },
  };
}

function createElements() {
  const missionForm = createEventTarget();
  missionForm.elements = { mode: createEventTarget() };
  return {
    cancelWorkspaceFormButton: createEventTarget(),
    detailTabButtons: [createEventTarget({ detailTab: 'release' })],
    documentLogCancelButton: createEventTarget(),
    documentLogFile: createEventTarget(),
    documentLogFilter: createEventTarget(),
    documentLogForm: createEventTarget(),
    documentLogSearch: createEventTarget(),
    memoryCancelButton: createEventTarget(),
    memoryForm: createEventTarget(),
    missionAttachmentInput: createEventTarget(),
    missionFilter: createEventTarget(),
    missionForm,
    runFallbackProviderSelect: createEventTarget(),
    runMissionButton: createEventTarget(),
    stepButtons: [createEventTarget({ stepTarget: 'step-output' })],
    themeToggleButton: createEventTarget(),
    toggleCreateButton: createEventTarget(),
    toggleWorkspaceFormButton: createEventTarget(),
    workspaceForm: createEventTarget(),
    workspaceMemoryCancelButton: createEventTarget(),
    workspaceMemoryForm: createEventTarget(),
    workspaceSelect: createEventTarget(),
  };
}

function createActions(calls) {
  const record = (name) => (...args) => calls.push([name, ...args]);
  return {
    cancelDocument: record('cancel-document'),
    cancelMissionMemory: record('cancel-mission-memory'),
    cancelWorkspaceMemory: record('cancel-workspace-memory'),
    closeWorkspaceForm: record('close-workspace-form'),
    createDocument: record('create-document'),
    createMission: record('create-mission'),
    createMissionMemory: record('create-mission-memory'),
    createWorkspace: record('create-workspace'),
    createWorkspaceMemory: record('create-workspace-memory'),
    filterDocuments: record('filter-documents'),
    filterMissions: record('filter-missions'),
    openMissionComposer: record('open-mission-composer'),
    renderBlueprint: record('render-blueprint'),
    restoreHistory: record('restore-history'),
    runMission: record('run-mission'),
    searchDocuments: record('search-documents'),
    selectDetailTab: record('select-detail-tab'),
    selectDocumentFile: record('select-document-file'),
    selectStep: record('select-step'),
    selectWorkspace: record('select-workspace'),
    toggleTheme: record('toggle-theme'),
    toggleWorkspaceForm: record('toggle-workspace-form'),
    updateFallbackControls: record('update-fallback-controls'),
  };
}

function createErrors(calls) {
  const record = (name) => (error) => calls.push([name, error.message]);
  return {
    createDocument: record('create-document-error'),
    createMissionMemory: record('create-mission-memory-error'),
    createWorkspace: record('create-workspace-error'),
    createWorkspaceMemory: record('create-workspace-memory-error'),
    default: record('default-error'),
    runMission: record('run-mission-error'),
    selectDocumentFile: record('select-document-file-error'),
  };
}

test('application event wiring registers each global listener once and routes navigation values', async () => {
  const calls = [];
  const elements = createElements();
  const historyTarget = createEventTarget();

  wireApplicationEvents({
    actions: createActions(calls),
    elements,
    errors: createErrors(calls),
    historyTarget,
  });

  const listenerContracts = [
    [elements.documentLogForm, 'submit'],
    [elements.documentLogSearch, 'input'],
    [elements.documentLogFilter, 'change'],
    [elements.documentLogCancelButton, 'click'],
    [elements.documentLogFile, 'change'],
    [elements.memoryForm, 'submit'],
    [elements.memoryCancelButton, 'click'],
    [elements.workspaceMemoryForm, 'submit'],
    [elements.workspaceMemoryCancelButton, 'click'],
    [elements.missionForm, 'submit'],
    [elements.missionForm.elements.mode, 'change'],
    [elements.missionAttachmentInput, 'change'],
    [elements.runMissionButton, 'click'],
    [elements.runFallbackProviderSelect, 'change'],
    [elements.toggleCreateButton, 'click'],
    [elements.toggleWorkspaceFormButton, 'click'],
    [elements.cancelWorkspaceFormButton, 'click'],
    [elements.workspaceForm, 'submit'],
    [elements.missionFilter, 'input'],
    [elements.workspaceSelect, 'change'],
    [elements.stepButtons[0], 'click'],
    [elements.detailTabButtons[0], 'click'],
    [elements.themeToggleButton, 'click'],
    [historyTarget, 'popstate'],
  ];
  listenerContracts.forEach(([target, eventName]) => {
    assert.equal(target.listenerCount(eventName), 1);
  });

  await elements.stepButtons[0].dispatch('click');
  await elements.detailTabButtons[0].dispatch('click');
  await historyTarget.dispatch('popstate');
  await elements.themeToggleButton.dispatch('click');

  assert.equal(calls[0][0], 'select-step');
  assert.equal(calls[0][1], 'step-output');
  assert.equal(calls[1][0], 'select-detail-tab');
  assert.equal(calls[1][1], 'release');
  assert.equal(calls[2][0], 'restore-history');
  assert.equal(calls[2][1].type, 'popstate');
  assert.equal(calls[3][0], 'toggle-theme');
  assert.equal(calls[3][1].type, 'click');
});

test('application event wiring keeps each form-specific error recovery callback', async () => {
  const calls = [];
  const elements = createElements();
  const historyTarget = createEventTarget();
  const failure = (message) => async () => {
    throw new Error(message);
  };
  const actions = createActions(calls);
  actions.createDocument = failure('document');
  actions.createMissionMemory = failure('mission-memory');
  actions.createWorkspaceMemory = failure('workspace-memory');
  actions.createWorkspace = failure('workspace');
  actions.runMission = failure('run');
  actions.selectDocumentFile = failure('file');
  actions.createMission = failure('mission');
  actions.restoreHistory = failure('history');

  wireApplicationEvents({
    actions,
    elements,
    errors: createErrors(calls),
    historyTarget,
  });

  await elements.documentLogForm.dispatch('submit');
  await elements.memoryForm.dispatch('submit');
  await elements.workspaceMemoryForm.dispatch('submit');
  await elements.workspaceForm.dispatch('submit');
  await elements.runMissionButton.dispatch('click');
  await elements.documentLogFile.dispatch('change');
  await elements.missionForm.dispatch('submit');
  await historyTarget.dispatch('popstate');

  assert.deepEqual(calls, [
    ['create-document-error', 'document'],
    ['create-mission-memory-error', 'mission-memory'],
    ['create-workspace-memory-error', 'workspace-memory'],
    ['create-workspace-error', 'workspace'],
    ['run-mission-error', 'run'],
    ['select-document-file-error', 'file'],
    ['default-error', 'mission'],
    ['default-error', 'history'],
  ]);
});

test('application event wiring tolerates optional controls that are not rendered', () => {
  assert.doesNotThrow(() => wireApplicationEvents({
    actions: {},
    elements: { detailTabButtons: [], stepButtons: [] },
    errors: {},
    historyTarget: null,
  }));
});
