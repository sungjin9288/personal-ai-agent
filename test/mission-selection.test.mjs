import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

import {
  loadHarnessDocuments as loadHarnessDocumentsFromState,
  loadHarnessMemory as loadHarnessMemoryFromState,
  resetHarnessDocumentBrowseState as resetHarnessDocumentBrowseStateValues,
  resetHarnessMemoryBrowseState as resetHarnessMemoryBrowseStateValues,
} from '../src/web/public/lib/harness-browse.js';
import { loadMissionActions as loadMissionActionsFromState } from '../src/web/public/lib/action-inbox.js';

const appSource = fs.readFileSync(new URL('../src/web/public/app.js', import.meta.url), 'utf8');

function extractExact(startMarker, endMarker) {
  const start = appSource.indexOf(startMarker);
  const end = appSource.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(start, -1, `missing production start marker: ${startMarker}`);
  assert.notEqual(end, -1, `missing production end marker: ${endMarker}`);
  assert.equal(appSource.indexOf(startMarker, start + startMarker.length), -1, `duplicate production marker: ${startMarker}`);
  return appSource.slice(start, end);
}

function extractSelectionRuntime() {
  return appSource.includes('let missionSelectionEpoch')
    ? extractExact('let missionSelectionEpoch', 'function buildOperatorHandoffItems')
    : extractExact('function stopExecutionPolling()', 'function buildOperatorHandoffItems');
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createDeferredApi() {
  const requests = [];
  return {
    api(path) {
      const pending = deferred();
      const request = {
        path,
        promise: pending.promise,
        reject(error) {
          request.settled = true;
          pending.reject(error);
        },
        resolve(value) {
          request.settled = true;
          pending.resolve(value);
        },
        settled: false,
      };
      requests.push(request);
      return pending.promise;
    },
    take(path, occurrence = 0) {
      const matches = requests.filter((request) => request.path === path);
      assert.ok(matches[occurrence], `missing request ${path} at occurrence ${occurrence}`);
      return matches[occurrence];
    },
    paths() {
      return requests.map((request) => request.path);
    },
    unresolved(predicate = () => true) {
      return requests.filter((request) => !request.settled && predicate(request));
    },
    async waitFor(path, occurrence = 0) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const request = requests.filter((candidate) => candidate.path === path)[occurrence];
        if (request) {
          return request;
        }
        await new Promise((resolve) => setImmediate(resolve));
      }
      assert.fail(`request did not arrive: ${path} at occurrence ${occurrence}`);
    },
  };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

async function resolveUnexpectedMissionStages(api) {
  await flushPromises();
  api.unresolved(({ path }) => path.includes('/harness/documents?')).forEach((request) => {
    request.resolve({ filters: { offset: 0 }, marker: `unexpected:${request.path}` });
  });
  api.unresolved(({ path }) => path.includes('/harness/memory?')).forEach((request) => {
    request.resolve({ filters: { offset: 0 }, marker: `unexpected:${request.path}` });
  });
  await flushPromises();
  api.unresolved(({ path }) => path.endsWith('/execution')).forEach((request) => {
    request.resolve({ execution: { latestExecutionSession: null }, marker: `unexpected:${request.path}` });
  });
  await flushPromises();
  api.unresolved(({ path }) => path.includes('/harness/documents?')).forEach((request) => {
    request.resolve({ filters: { offset: 0 }, marker: `unexpected:${request.path}` });
  });
  api.unresolved(({ path }) => path.includes('/harness/memory?')).forEach((request) => {
    request.resolve({ filters: { offset: 0 }, marker: `unexpected:${request.path}` });
  });
  await flushPromises();
}

function createAppHarness({ loadApprovals, loadMissions, resetCurrentView } = {}) {
  const deferredApi = createDeferredApi();
  const approvalButtonListeners = [];
  const calls = [];
  const intervals = [];
  const missionButtonListeners = [];
  const state = {
    activeStep: 'step-setup',
    artifactsById: new Map(),
    currentSessionPayload: null,
    executionLogs: null,
    executionPollTimer: null,
    executionStatus: null,
    harnessDocumentResult: null,
    harnessMemoryResult: null,
    missionActions: null,
    missionActionsFallbackStopReasonFilter: '',
    missionActionsFilter: 'all',
    missionActionsView: null,
    missionDetail: null,
    missionSelectionError: '',
    missionSelectionStatus: 'idle',
    missionTimeline: null,
    selectedArtifactId: null,
    selectedMissionId: null,
    selectedSessionId: null,
  };
  const elements = {
    approvalList: {
      querySelectorAll: () => [{
        dataset: { approvalOpen: 'B' },
        addEventListener(eventName, listener) {
          assert.equal(eventName, 'click');
          approvalButtonListeners.push(listener);
        },
      }],
    },
    missionList: {
      querySelectorAll: () => [{
        dataset: { missionId: 'B' },
        addEventListener(eventName, listener) {
          assert.equal(eventName, 'click');
          missionButtonListeners.push(listener);
        },
      }],
    },
    runFallbackPolicySelect: { value: 'provider-failure-only' },
    runFallbackProviderSelect: { value: '' },
    runMissionButton: { disabled: false, textContent: '이 미션 실행' },
    runProviderSelect: { value: 'local' },
  };
  const record = (name) => (...args) => calls.push([name, ...args]);
  const context = vm.createContext({
    STEP_TO_DETAIL_TAB: {
      'step-output': 'artifacts',
      'step-review': 'actions',
      'step-run': 'runs',
      'step-setup': 'config',
    },
    api: deferredApi.api,
    clearInterval(timer) {
      timer.cleared = true;
    },
    elements,
    getFlowState: () => ({ recommendedStep: 'step-run' }),
    getSanitizedDetailTab: (value) => value || null,
    getSanitizedStepId: (value) => value || null,
    loadApprovals: loadApprovals || (async () => null),
    loadHarnessDocumentsFromState,
    loadHarnessMemoryFromState,
    loadMissionActionsFromState,
    loadMissions: loadMissions || (async () => null),
    renderAgentBlueprintBuilder: record('renderAgentBlueprintBuilder'),
    renderArtifact: record('renderArtifact'),
    renderCouncilBoard: record('renderCouncilBoard'),
    renderDetailContextbar: record('renderDetailContextbar'),
    renderDetailTabLabels: record('renderDetailTabLabels'),
    renderDetailToolbarActions: record('renderDetailToolbarActions'),
    renderExecutionConsole: record('renderExecutionConsole'),
    renderFlowState: record('renderFlowState'),
    renderHarnessPanel: record('renderHarnessPanel'),
    renderHeroMetrics: record('renderHeroMetrics'),
    renderMissionActions: record('renderMissionActions'),
    renderMissionList: record('renderMissionList'),
    renderMissionSummary: record('renderMissionSummary'),
    renderReviewReadiness: record('renderReviewReadiness'),
    renderSelectionBridge: record('renderSelectionBridge'),
    renderSessionDetail: record('renderSessionDetail'),
    renderSessionList: record('renderSessionList'),
    renderSetupHarnessSummary: record('renderSetupHarnessSummary'),
    renderStageSummaries: record('renderStageSummaries'),
    renderTimeline: record('renderTimeline'),
    resetCurrentView: resetCurrentView || (() => null),
    resetDocumentLogForm: record('resetDocumentLogForm'),
    resetHarnessDocumentBrowseStateValues,
    resetHarnessFilterInputs: record('resetHarnessFilterInputs'),
    resetHarnessMemoryBrowseStateValues,
    resetMemoryForm: record('resetMemoryForm'),
    setActiveDetailTab: record('setActiveDetailTab'),
    setActiveStep: record('setActiveStep'),
    setInterval(callback, milliseconds) {
      const timer = { callback, cleared: false, milliseconds };
      intervals.push(timer);
      return timer;
    },
    showApplicationError: (error) => calls.push(['showApplicationError', error.message]),
    state,
    writeUiStateToUrl: record('writeUiStateToUrl'),
  });

  const productionSlices = [
    extractSelectionRuntime(),
    extractExact('function wireQuickActions(', 'async function loadReleaseHandoffPreview('),
    extractExact('function isExecutionMissionSelected()', 'function getHarnessRecommendationAction('),
    extractExact('function wireMissionListSelectionButtons()', 'function renderMissionListFilteredEmptyState()'),
    extractExact('async function handleActionInboxOpenMission(', 'async function handleActionInboxRerun('),
    extractExact('function wireApprovalOpenButtons()', 'function wireApprovalApproveButtons()'),
    extractExact('function resetHarnessFilterState()', 'function resetHarnessDocumentBrowseState()'),
    extractExact('async function loadArtifact(', 'function renderTimelineEmptyState()'),
    extractExact('async function selectSession(', 'export function clearMissionSelection'),
    extractExact('function clearMissionSelection(', 'async function selectMission('),
    extractExact('async function selectMission(', 'async function resolveApproval('),
    extractExact('async function loadExecutionStatus(', 'async function loadReleaseStatus('),
    extractExact('function ensureExecutionPolling(', 'function resolveRestoredMissionId('),
    extractExact('async function loadHarnessDocuments(', 'export async function loadHarnessMemory('),
    extractExact('async function loadHarnessMemory(', 'async function loadHarnessBrowsers('),
    extractExact('async function loadHarnessBrowsers(', 'export async function refreshSelectedMissionContext('),
    extractExact('async function refreshSelectedMissionContext(', 'async function handleMissionCreate('),
    extractExact('async function handleMissionRun()', 'async function handleExecutionPreflight('),
    extractExact('async function handleExecutionPreflight(', 'async function handleExecutionStart('),
  ];
  vm.runInContext(productionSlices.join('\n'), context);

  return {
    approvalButtonListeners,
    calls,
    context,
    deferredApi,
    elements,
    intervals,
    missionButtonListeners,
    state,
  };
}

function resolveMissionInitial(api, missionId, occurrence, detail) {
  api.take(`/api/missions/${missionId}`, occurrence).resolve(detail);
  api.take(`/api/missions/${missionId}/timeline`, occurrence).resolve({ marker: detail.marker, timeline: [] });
  api.take(`/api/actions?missionId=${missionId}&promotionStatus=operator-active`, occurrence).resolve({
    marker: detail.marker,
  });
}

async function resolveMissionPipeline(api, missionId, occurrence, detail, downstreamOccurrence = 0) {
  resolveMissionInitial(api, missionId, occurrence, detail);
  (await api.waitFor(`/api/missions/${missionId}/harness/documents?limit=12&offset=0&query=&sort=latest&type=all`, downstreamOccurrence)).resolve({
    filters: { offset: 0 },
    marker: detail.marker,
  });
  (await api.waitFor(`/api/missions/${missionId}/harness/memory?kind=all&limit=12&offset=0&query=&scope=all&sort=latest`, downstreamOccurrence)).resolve({
    filters: { offset: 0 },
    marker: detail.marker,
  });
  (await api.waitFor(`/api/missions/${missionId}/execution`, downstreamOccurrence)).resolve({
    execution: { latestExecutionSession: null },
    marker: detail.marker,
  });
}

test('selectMission clears the previous mission payload and repaints loading before its first await', () => {
  const { calls, context, elements, state } = createAppHarness();
  Object.assign(state, {
    currentSessionPayload: { marker: 'A-session' },
    executionLogs: { marker: 'A-logs' },
    executionStatus: { marker: 'A-execution' },
    harnessDocumentResult: { marker: 'A-documents' },
    harnessMemoryResult: { marker: 'A-memory' },
    missionActions: { marker: 'A-actions' },
    missionActionsView: { marker: 'A-actions-view' },
    missionDetail: { marker: 'A-detail', mission: { id: 'A', mode: 'engineering' } },
    missionSelectionStatus: 'ready',
    missionTimeline: { marker: 'A-timeline' },
    selectedArtifactId: 'artifact-A',
    selectedMissionId: 'A',
    selectedSessionId: 'session-A',
  });

  void context.selectMission('B');

  assert.equal(state.selectedMissionId, 'B');
  assert.equal(state.missionSelectionStatus, 'loading');
  assert.equal(state.missionSelectionError, '');
  assert.equal(state.missionDetail, null);
  assert.equal(state.missionTimeline, null);
  assert.equal(state.missionActions, null);
  assert.equal(state.missionActionsView, null);
  assert.equal(state.currentSessionPayload, null);
  assert.equal(state.selectedSessionId, null);
  assert.equal(state.selectedArtifactId, null);
  assert.equal(state.executionStatus, null);
  assert.equal(state.executionLogs, null);
  assert.equal(state.harnessDocumentResult, null);
  assert.equal(state.harnessMemoryResult, null);
  assert.equal(elements.runMissionButton.disabled, true);
  assert.ok(calls.some(([name]) => name === 'renderMissionSummary'));
  assert.ok(calls.some(([name]) => name === 'renderTimeline'));
  assert.ok(calls.some(([name]) => name === 'renderMissionActions'));
});

test('loading selection blocks mission run and engineering preflight when detail belongs to another mission', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  Object.assign(state, {
    missionDetail: { mission: { id: 'A', mode: 'engineering' } },
    missionSelectionStatus: 'loading',
    selectedMissionId: 'B',
  });

  assert.equal(context.isExecutionMissionSelected(), false);
  await context.handleMissionRun();
  await context.handleExecutionPreflight(true);

  assert.equal(api.paths().some((path) => path.endsWith('/run')), false);
  assert.equal(api.paths().some((path) => path.includes('/execution/preflight')), false);
});

test('current selection failure becomes failed, clears partial state, rejects, and reports through the mission list boundary', async () => {
  const { calls, context, deferredApi: api, missionButtonListeners, state } = createAppHarness();
  context.wireMissionListSelectionButtons();
  assert.equal(missionButtonListeners.length, 1);

  const clickResult = missionButtonListeners[0]();
  api.take('/api/missions/B').reject(new Error('B detail failed'));
  api.take('/api/missions/B/timeline').resolve({ marker: 'partial-B-timeline' });
  api.take('/api/actions?missionId=B&promotionStatus=operator-active').resolve({ marker: 'partial-B-actions' });
  await assert.doesNotReject(async () => clickResult);
  await flushPromises();

  assert.equal(state.selectedMissionId, 'B');
  assert.equal(state.missionSelectionStatus, 'failed');
  assert.equal(state.missionSelectionError, 'B detail failed');
  assert.equal(state.missionDetail, null);
  assert.equal(state.missionTimeline, null);
  assert.equal(state.missionActions, null);
  assert.deepEqual(calls.filter(([name]) => name === 'showApplicationError'), [
    ['showApplicationError', 'B detail failed'],
  ]);
});

test('failure invalidates the epoch before a late action sibling can repopulate failed state', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  const pending = context.selectMission('B');

  api.take('/api/missions/B').reject(new Error('B detail failed'));
  await assert.rejects(pending, /B detail failed/);
  api.take('/api/missions/B/timeline').resolve({ marker: 'late-B-timeline' });
  api.take('/api/actions?missionId=B&promotionStatus=operator-active').resolve({ marker: 'late-B-actions' });
  await flushPromises();

  assert.equal(state.missionSelectionStatus, 'failed');
  assert.equal(state.missionTimeline, null);
  assert.equal(state.missionActions, null);
});

test('downstream harness failure clears partial detail and never marks the selection ready', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  const pending = context.selectMission('B');
  resolveMissionInitial(api, 'B', 0, { marker: 'partial-B', mission: { id: 'B' }, sessions: [] });
  (await api.waitFor('/api/missions/B/harness/documents?limit=12&offset=0&query=&sort=latest&type=all')).resolve({
    filters: { offset: 0 },
    marker: 'partial-B-documents',
  });
  (await api.waitFor('/api/missions/B/harness/memory?kind=all&limit=12&offset=0&query=&scope=all&sort=latest')).reject(
    new Error('B memory failed'),
  );

  await assert.rejects(pending, /B memory failed/);
  assert.equal(state.missionSelectionStatus, 'failed');
  assert.equal(state.missionDetail, null);
  assert.equal(state.missionTimeline, null);
  assert.equal(state.harnessDocumentResult, null);
  assert.equal(state.harnessMemoryResult, null);
});

test('obsolete A and B failures after latest A ready do not change state, polling, errors, or URL', async () => {
  const { calls, context, deferredApi: api, intervals, state } = createAppHarness();
  const firstA = context.selectMission('A');
  const staleB = context.selectMission('B');
  const latestA = context.selectMission('A');

  await resolveMissionPipeline(api, 'A', 1, {
    marker: 'latest-A',
    mission: { id: 'A', mode: 'knowledge' },
    sessions: [],
  });
  await latestA;
  api.take('/api/missions/A', 0).reject(new Error('obsolete A failed'));
  api.take('/api/missions/A/timeline', 0).resolve({ marker: 'obsolete-A-timeline' });
  api.take('/api/actions?missionId=A&promotionStatus=operator-active', 0).resolve({ marker: 'obsolete-A-actions' });
  api.take('/api/missions/B').reject(new Error('obsolete B failed'));
  api.take('/api/missions/B/timeline').resolve({ marker: 'obsolete-B-timeline' });
  api.take('/api/actions?missionId=B&promotionStatus=operator-active').resolve({ marker: 'obsolete-B-actions' });

  await assert.doesNotReject(() => Promise.all([firstA, staleB]));
  assert.equal(state.selectedMissionId, 'A');
  assert.equal(state.missionSelectionStatus, 'ready');
  assert.equal(state.missionSelectionError, '');
  assert.equal(state.missionDetail.marker, 'latest-A');
  assert.equal(intervals.length, 0);
  assert.equal(calls.filter(([name]) => name === 'writeUiStateToUrl').length, 1);
});

test('clearMissionSelection keeps idle when an obsolete request later fails', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  const pending = context.selectMission('A');
  context.clearMissionSelection({ syncUrl: false });

  api.take('/api/missions/A').reject(new Error('obsolete after clear'));
  api.take('/api/missions/A/timeline').resolve({ marker: 'obsolete-timeline' });
  api.take('/api/actions?missionId=A&promotionStatus=operator-active').resolve({ marker: 'obsolete-actions' });
  await assert.doesNotReject(() => pending);

  assert.equal(state.selectedMissionId, null);
  assert.equal(state.missionSelectionStatus, 'idle');
  assert.equal(state.missionSelectionError, '');
  assert.equal(state.missionDetail, null);
  assert.equal(state.missionActions, null);
});

test('failed B can be reselected to ready while an old run finally cannot re-enable loading controls', async () => {
  const { context, deferredApi: api, elements, state } = createAppHarness();
  Object.assign(state, {
    missionDetail: { mission: { id: 'A', mode: 'knowledge' } },
    missionSelectionStatus: 'ready',
    selectedMissionId: 'A',
  });
  const oldRun = context.handleMissionRun();
  const firstB = context.selectMission('B');

  api.take('/api/missions/A/run').reject(new Error('old A run failed'));
  await assert.rejects(oldRun, /old A run failed/);
  assert.equal(elements.runMissionButton.disabled, true);
  api.take('/api/missions/B').reject(new Error('first B failed'));
  api.take('/api/missions/B/timeline').resolve({ marker: 'first-B-timeline' });
  api.take('/api/actions?missionId=B&promotionStatus=operator-active').resolve({ marker: 'first-B-actions' });
  await assert.rejects(firstB, /first B failed/);
  assert.equal(state.missionSelectionStatus, 'failed');
  assert.equal(elements.runMissionButton.disabled, true);

  const retryB = context.selectMission('B');
  await resolveMissionPipeline(api, 'B', 1, {
    marker: 'ready-B',
    mission: { id: 'B', mode: 'knowledge' },
    sessions: [],
  });
  await retryB;

  assert.equal(state.missionSelectionStatus, 'ready');
  assert.equal(state.missionSelectionError, '');
  assert.equal(state.missionDetail.marker, 'ready-B');
  assert.equal(elements.runMissionButton.disabled, false);
});

test('old A run success after B starts loading does not retry B or push URL and step effects', async () => {
  const { calls, context, deferredApi: api, state } = createAppHarness();
  Object.assign(state, {
    approvals: [],
    missionDetail: { mission: { id: 'A', mode: 'knowledge' } },
    missionSelectionStatus: 'ready',
    selectedMissionId: 'A',
  });
  const oldRun = context.handleMissionRun();
  void context.selectMission('B');

  api.take('/api/missions/A/run').resolve({ session: { id: 'run-A' } });
  await flushPromises();

  assert.equal(api.paths().filter((path) => path === '/api/missions/A').length, 0);
  assert.equal(api.paths().filter((path) => path === '/api/missions/B').length, 1);
  await oldRun;
  assert.equal(calls.filter(([name]) => name === 'writeUiStateToUrl').length, 0);
  assert.equal(calls.filter(([name]) => name === 'setActiveStep').length, 0);
});

test('run continuation stops when selection changes during post-run list and approval refresh', async () => {
  const approvals = deferred();
  const { calls, context, deferredApi: api, state } = createAppHarness({
    loadApprovals: () => approvals.promise,
  });
  Object.assign(state, {
    approvals: [],
    missionDetail: { mission: { id: 'A', mode: 'knowledge' } },
    missionSelectionStatus: 'ready',
    selectedMissionId: 'A',
  });
  const oldRun = context.handleMissionRun();
  api.take('/api/missions/A/run').resolve({ session: { id: 'run-A' } });
  await flushPromises();

  void context.selectMission('B');
  approvals.resolve(null);
  await flushPromises();

  assert.equal(api.paths().filter((path) => path === '/api/missions/A').length, 0);
  assert.equal(api.paths().filter((path) => path === '/api/missions/B').length, 1);
  await oldRun;
  assert.equal(calls.filter(([name]) => name === 'writeUiStateToUrl').length, 0);
  assert.equal(calls.filter(([name]) => name === 'setActiveStep').length, 0);
});

test('run continuation stops when its A reselection becomes stale before completion', async () => {
  const { calls, context, deferredApi: api, state } = createAppHarness();
  Object.assign(state, {
    approvals: [],
    missionDetail: { mission: { id: 'A', mode: 'knowledge' } },
    missionSelectionStatus: 'ready',
    selectedMissionId: 'A',
  });
  const oldRun = context.handleMissionRun();
  api.take('/api/missions/A/run').resolve({ session: { id: 'run-A' } });
  await api.waitFor('/api/missions/A');

  void context.selectMission('B');
  resolveMissionInitial(api, 'A', 0, {
    marker: 'stale-A-refresh',
    mission: { id: 'A', mode: 'knowledge' },
    sessions: [],
  });
  await oldRun;

  assert.equal(state.selectedMissionId, 'B');
  assert.equal(calls.filter(([name]) => name === 'writeUiStateToUrl').length, 0);
  assert.equal(calls.filter(([name]) => name === 'setActiveStep').length, 0);
});

test('same-selection successful run refreshes A and advances to the output step', async () => {
  const { calls, context, deferredApi: api, elements, state } = createAppHarness();
  Object.assign(state, {
    approvals: [],
    missionDetail: { mission: { id: 'A', mode: 'knowledge' } },
    missionSelectionStatus: 'ready',
    selectedMissionId: 'A',
  });
  const run = context.handleMissionRun();
  api.take('/api/missions/A/run').resolve({ session: { id: 'run-A' } });
  await api.waitFor('/api/missions/A');
  await resolveMissionPipeline(api, 'A', 0, {
    marker: 'refreshed-A',
    mission: { id: 'A', mode: 'knowledge' },
    sessions: [],
  });
  await run;

  assert.equal(state.selectedMissionId, 'A');
  assert.equal(state.missionSelectionStatus, 'ready');
  assert.equal(state.missionDetail.marker, 'refreshed-A');
  assert.equal(elements.runMissionButton.disabled, false);
  const finalStep = calls.filter(([name]) => name === 'setActiveStep').at(-1);
  assert.equal(finalStep[1], 'step-output');
  assert.equal(finalStep[2].urlMode, 'push');
});

test('action inbox mission open reports a current failure once and ignores a stale failure', async () => {
  const { calls, context, deferredApi: api } = createAppHarness();
  const current = context.handleActionInboxOpenMission('B');
  api.take('/api/missions/B').reject(new Error('action B failed'));
  api.take('/api/missions/B/timeline').resolve({ marker: 'B-timeline' });
  api.take('/api/actions?missionId=B&promotionStatus=operator-active').resolve({ marker: 'B-actions' });

  await assert.doesNotReject(() => current);
  assert.deepEqual(calls.filter(([name]) => name === 'showApplicationError'), [
    ['showApplicationError', 'action B failed'],
  ]);

  const stale = context.handleActionInboxOpenMission('C');
  void context.selectMission('D');
  api.take('/api/missions/C').reject(new Error('stale C failed'));
  api.take('/api/missions/C/timeline').resolve({ marker: 'C-timeline' });
  api.take('/api/actions?missionId=C&promotionStatus=operator-active').resolve({ marker: 'C-actions' });
  await assert.doesNotReject(() => stale);
  assert.equal(calls.filter(([name]) => name === 'showApplicationError').length, 1);
});

test('approval mission open reports a current selection failure once without an unhandled rejection', async () => {
  const { approvalButtonListeners, calls, context, deferredApi: api } = createAppHarness();
  context.wireApprovalOpenButtons();
  assert.equal(approvalButtonListeners.length, 1);

  const clickResult = approvalButtonListeners[0]();
  api.take('/api/missions/B').reject(new Error('approval B failed'));
  api.take('/api/missions/B/timeline').resolve({ marker: 'B-timeline' });
  api.take('/api/actions?missionId=B&promotionStatus=operator-active').resolve({ marker: 'B-actions' });

  await assert.doesNotReject(async () => clickResult);
  assert.deepEqual(calls.filter(([name]) => name === 'showApplicationError'), [
    ['showApplicationError', 'approval B failed'],
  ]);
});

test('reset-view quick action routes an asynchronous failure to the application error boundary', () => {
  const failure = new Error('reset view failed');
  const { calls, context } = createAppHarness({
    resetCurrentView: () => ({
      catch(onError) {
        onError(failure);
        return Promise.resolve();
      },
    }),
  });
  let clickListener;
  const scope = {
    querySelectorAll: () => [{
      dataset: { uiAction: 'reset-view', uiValue: '' },
      addEventListener(eventName, listener) {
        assert.equal(eventName, 'click');
        clickListener = listener;
      },
    }],
  };

  context.wireQuickActions(scope);
  clickListener();

  assert.deepEqual(calls.filter(([name]) => name === 'showApplicationError'), [
    ['showApplicationError', 'reset view failed'],
  ]);
});

test('selectMission epoch keeps only the newest A-B-A pipeline through nested writers and final controls', async () => {
  const { calls, context, deferredApi: api, state } = createAppHarness();
  const firstA = context.selectMission('A');
  const staleB = context.selectMission('B');
  const latestA = context.selectMission('A', {
    preferredDetailTab: 'actions',
    preferredStep: 'step-review',
  });

  resolveMissionInitial(api, 'A', 1, { marker: 'latest-A', mission: { id: 'A' }, sessions: [] });
  (await api.waitFor('/api/missions/A/harness/documents?limit=12&offset=0&query=&sort=latest&type=all')).resolve({
    filters: { offset: 0 },
    marker: 'latest-A',
  });
  (await api.waitFor('/api/missions/A/harness/memory?kind=all&limit=12&offset=0&query=&scope=all&sort=latest')).resolve({
    filters: { offset: 0 },
    marker: 'latest-A',
  });
  (await api.waitFor('/api/missions/A/execution')).resolve({
    execution: { latestExecutionSession: null },
    marker: 'latest-A',
  });
  await latestA;

  resolveMissionInitial(api, 'A', 0, { marker: 'first-A', mission: { id: 'A' }, sessions: [] });
  resolveMissionInitial(api, 'B', 0, { marker: 'stale-B', mission: { id: 'B' }, sessions: [] });
  await resolveUnexpectedMissionStages(api);
  await Promise.all([firstA, staleB]);

  assert.equal(state.selectedMissionId, 'A');
  assert.equal(state.missionDetail.marker, 'latest-A');
  assert.equal(state.missionTimeline.marker, 'latest-A');
  assert.equal(state.missionActions.marker, 'latest-A');
  assert.equal(state.harnessDocumentResult.marker, 'latest-A');
  assert.equal(state.harnessMemoryResult.marker, 'latest-A');
  assert.equal(state.executionStatus.marker, 'latest-A');
  assert.equal(state.selectedSessionId, null);
  const activeStepCall = calls.filter(([name]) => name === 'setActiveStep').at(-1);
  assert.equal(activeStepCall[1], 'step-review');
  assert.equal(activeStepCall[2].syncDetailTab, false);
  assert.equal(activeStepCall[2].syncUrl, false);
  const activeDetailTabCall = calls.filter(([name]) => name === 'setActiveDetailTab').at(-1);
  assert.equal(activeDetailTabCall[1], 'actions');
  assert.equal(activeDetailTabCall[2].syncUrl, false);
  assert.equal(calls.filter(([name]) => name === 'writeUiStateToUrl').length, 1);
  assert.equal(api.paths().some((path) => path.includes('/missions/B/harness/')), false);
});

test('clearMissionSelection invalidates an in-flight mission before detail, actions, or later stages can write', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  const pending = context.selectMission('A');

  context.clearMissionSelection({ syncUrl: false });
  resolveMissionInitial(api, 'A', 0, { marker: 'stale-A', mission: { id: 'A' }, sessions: [] });
  await resolveUnexpectedMissionStages(api);
  await pending;

  assert.equal(state.selectedMissionId, null);
  assert.equal(state.missionDetail, null);
  assert.equal(state.missionTimeline, null);
  assert.equal(state.missionActions, null);
  assert.equal(api.paths().some((path) => path.includes('/harness/')), false);
  assert.equal(api.paths().some((path) => path.endsWith('/execution')), false);
});

test('selectSession token keeps the latest payload and honors a cached preferred artifact', async () => {
  const { calls, context, deferredApi: api, state } = createAppHarness();
  state.selectedMissionId = 'A';
  state.artifactsById.set('artifact-B', { artifact: { id: 'artifact-B' }, content: 'cached' });

  const stale = context.selectSession('session-A');
  const latest = context.selectSession('session-B', { preferredArtifactId: 'artifact-B' });
  api.take('/api/missions/A/session?sessionId=session-B').resolve({
    artifacts: [{ id: 'artifact-B', kind: 'deliverable' }],
    marker: 'latest-session',
  });
  await latest;
  api.take('/api/missions/A/session?sessionId=session-A').resolve({ artifacts: [], marker: 'stale-session' });
  await stale;

  assert.equal(state.selectedSessionId, 'session-B');
  assert.equal(state.currentSessionPayload.marker, 'latest-session');
  assert.equal(state.selectedArtifactId, 'artifact-B');
  assert.equal(api.paths().some((path) => path.startsWith('/api/artifacts/')), false);
  assert.equal(calls.filter(([name]) => name === 'writeUiStateToUrl').length, 1);
});

test('loadArtifact ignores an uncached response after its mission or session context changes', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  state.selectedMissionId = 'A';
  state.selectedSessionId = 'session-A';
  const pending = context.loadArtifact('artifact-A');

  state.selectedSessionId = 'session-B';
  api.take('/api/artifacts/artifact-A').resolve({ artifact: { id: 'artifact-A' }, content: 'stale' });
  await pending;

  assert.equal(state.artifactsById.has('artifact-A'), false);
  assert.equal(state.selectedArtifactId, null);
});

test('loadArtifact propagates a current request rejection without writing cache state', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  state.selectedMissionId = 'A';
  state.selectedSessionId = 'session-A';
  const pending = context.loadArtifact('artifact-A');

  api.take('/api/artifacts/artifact-A').reject(new Error('artifact load failed'));
  await assert.rejects(pending, /artifact load failed/);
  assert.equal(state.artifactsById.has('artifact-A'), false);
  assert.equal(state.selectedArtifactId, null);
});

test('resetHarnessFilterState uses real reset helpers to invalidate pending browse loaders', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  state.selectedMissionId = 'A';
  const documentLoad = loadHarnessDocumentsFromState({ api: api.api, state });
  const memoryLoad = loadHarnessMemoryFromState({ api: api.api, state });

  context.resetHarnessFilterState();
  api.take('/api/missions/A/harness/documents?limit=12&offset=0&query=&sort=latest&type=all').resolve({
    filters: { offset: 7 },
    marker: 'stale-document',
  });
  api.take('/api/missions/A/harness/memory?kind=all&limit=12&offset=0&query=&scope=all&sort=latest').resolve({
    filters: { offset: 9 },
    marker: 'stale-memory',
  });
  await Promise.all([documentLoad, memoryLoad]);

  assert.equal(state.harnessDocumentResult, null);
  assert.equal(state.harnessMemoryResult, null);
  assert.equal(state.harnessDocumentOffset, 0);
  assert.equal(state.harnessMemoryOffset, 0);
});

test('loadExecutionStatus does not write delayed logs after the selection epoch changes', async () => {
  const { context, deferredApi: api, state } = createAppHarness();
  state.selectedMissionId = 'A';
  const pending = context.loadExecutionStatus('A');
  api.take('/api/missions/A/execution').resolve({
    execution: { latestExecutionSession: { id: 'exec-A', status: 'running' } },
    marker: 'old-status',
  });
  const logsRequest = await api.waitFor('/api/missions/A/execution/logs?executionId=exec-A');

  context.clearMissionSelection({ syncUrl: false });
  state.selectedMissionId = 'B';
  state.executionStatus = { marker: 'new-status' };
  state.executionLogs = { marker: 'new-logs' };
  logsRequest.resolve({ lines: ['stale'], marker: 'old-logs' });
  await pending;

  assert.equal(state.executionStatus.marker, 'new-status');
  assert.equal(state.executionLogs.marker, 'new-logs');
});

test('refreshSelectedMissionContext captures its epoch and stops before execution, harness, and renders when cleared', async () => {
  const { calls, context, deferredApi: api, state } = createAppHarness();
  state.selectedMissionId = 'A';
  const pending = context.refreshSelectedMissionContext({ preserveHarnessBrowse: true });

  context.clearMissionSelection({ syncUrl: false });
  const callCountAfterClear = calls.length;
  resolveMissionInitial(api, 'A', 0, { marker: 'stale-refresh', mission: { id: 'A' }, sessions: [] });
  await resolveUnexpectedMissionStages(api);
  await pending;

  assert.equal(state.selectedMissionId, null);
  assert.equal(state.missionDetail, null);
  assert.equal(state.missionTimeline, null);
  assert.equal(state.missionActions, null);
  assert.equal(api.paths().some((path) => path.includes('/harness/')), false);
  assert.equal(api.paths().some((path) => path.endsWith('/execution')), false);
  assert.equal(calls.length, callCountAfterClear);
});

test('obsolete polling continuation neither refreshes nor stops a newer mission timer', async () => {
  const approvals = deferred();
  const { context, deferredApi: api, intervals, state } = createAppHarness({
    loadApprovals: () => approvals.promise,
  });
  state.selectedMissionId = 'A';
  state.executionStatus = { execution: { latestExecutionSession: { id: 'exec-A', status: 'running' } } };
  context.ensureExecutionPolling();
  const oldTimer = intervals[0];
  const oldTick = oldTimer.callback();

  context.clearMissionSelection({ syncUrl: false });
  state.selectedMissionId = 'B';
  state.executionStatus = { execution: { latestExecutionSession: { id: 'exec-B', status: 'running' } } };
  context.ensureExecutionPolling();
  const newTimer = intervals[1];

  api.take('/api/missions/A/execution').resolve({ execution: { latestExecutionSession: null } });
  approvals.resolve(null);
  await flushPromises();
  api.unresolved(({ path }) => /^\/api\/missions\/[^/]+$/.test(path)).forEach((request) => {
    const missionId = request.path.split('/').at(-1);
    request.resolve({ marker: `unexpected-refresh:${missionId}`, mission: { id: missionId }, sessions: [] });
  });
  api.unresolved(({ path }) => path.endsWith('/timeline')).forEach((request) => {
    request.resolve({ marker: `unexpected-refresh:${request.path}`, timeline: [] });
  });
  api.unresolved(({ path }) => path.startsWith('/api/actions?')).forEach((request) => {
    request.resolve({ marker: `unexpected-refresh:${request.path}` });
  });
  await resolveUnexpectedMissionStages(api);
  await oldTick;

  assert.equal(state.executionPollTimer, newTimer);
  assert.equal(newTimer.cleared, false);
  assert.equal(api.paths().filter((path) => /^\/api\/missions\/[^/]+$/.test(path)).length, 0);
});

test('ensureExecutionPolling does not start without a selected mission even when stale execution looks running', () => {
  const { context, intervals, state } = createAppHarness();
  state.executionStatus = { execution: { latestExecutionSession: { id: 'stale', status: 'running' } } };

  context.ensureExecutionPolling();

  assert.equal(intervals.length, 0);
  assert.equal(state.executionPollTimer, null);
});
