import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  applyMissionActionsFilterUrlState,
  buildMissionActionsUrl,
  getMissionActionsFallbackStopReasonCounts,
  getMissionActionsVisibleFilterLabel,
  hasActiveMissionActionsFilter,
  loadMissionActions,
  wireActionInboxActions,
  wireMissionActionsFilterControls,
} from '../src/web/public/lib/action-inbox.js';
import {
  renderLearningPromotionActionButtons,
  renderLearningPromotionCommandMeta,
} from '../src/web/public/lib/render-fragments.js';
import {
  buildLearningPromotionAuditPackageText,
  formatLearningPromotionDetails,
} from '../src/web/public/lib/status-labels.js';

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

test('action inbox URL state accepts only supported filters', () => {
  const state = {};

  applyMissionActionsFilterUrlState(state, {
    actionInboxFallbackStopReason: ' recoverable-provider-failure ',
    actionInboxFilter: 'needs-reminder',
  });

  assert.deepEqual(state, {
    missionActionsFallbackStopReasonFilter: 'recoverable-provider-failure',
    missionActionsFilter: 'needs-reminder',
  });

  applyMissionActionsFilterUrlState(state, { actionInboxFilter: 'unsupported' });
  assert.equal(state.missionActionsFilter, 'all');
  assert.equal(state.missionActionsFallbackStopReasonFilter, null);
});

test('action inbox query preserves mission, filter, and fallback stop contracts', () => {
  const state = { missionActionsFallbackStopReasonFilter: 'non-recoverable-provider-failure' };

  assert.equal(
    buildMissionActionsUrl(state, 'mission / 1', { filter: 'needs-reminder' }),
    '/api/actions?missionId=mission+%2F+1&promotionStatus=operator-active&needsReminderOnly=true&providerFallbackStopReason=non-recoverable-provider-failure',
  );
  assert.equal(
    buildMissionActionsUrl(state, 'mission / 1', {
      filter: 'all',
      includeFallbackStopReason: false,
    }),
    '/api/actions?missionId=mission+%2F+1&promotionStatus=operator-active',
  );
});

test('action inbox loader keeps the full queue separate from a filtered view', async () => {
  const paths = [];
  const state = {
    missionActionsFallbackStopReasonFilter: 'quota-exceeded',
    missionActionsFilter: 'overdue',
    selectedMissionId: 'mission-1',
  };
  const api = async (path) => {
    paths.push(path);
    return path.includes('overdueOnly=true') ? { kind: 'view' } : { kind: 'full' };
  };

  const result = await loadMissionActions({ api, state });

  assert.equal(paths.length, 2);
  assert.equal(paths[0], '/api/actions?missionId=mission-1&promotionStatus=operator-active');
  assert.equal(
    paths[1],
    '/api/actions?missionId=mission-1&promotionStatus=operator-active&overdueOnly=true&providerFallbackStopReason=quota-exceeded',
  );
  assert.deepEqual(result, {
    fullPayload: { kind: 'full' },
    viewPayload: { kind: 'view' },
  });
  assert.equal(state.missionActions, result.fullPayload);
  assert.equal(state.missionActionsView, result.viewPayload);
});

test('action inbox loader avoids duplicate requests and clears stale mission state', async () => {
  const paths = [];
  const state = {
    missionActions: { stale: true },
    missionActionsFallbackStopReasonFilter: '',
    missionActionsFilter: 'all',
    missionActionsView: { stale: true },
    selectedMissionId: 'mission-1',
  };
  const api = async (path) => {
    paths.push(path);
    return { kind: 'full' };
  };

  const result = await loadMissionActions({ api, state });
  assert.equal(paths.length, 1);
  assert.deepEqual(result, { fullPayload: { kind: 'full' }, viewPayload: null });

  assert.equal(await loadMissionActions({ api, missionId: '', state }), null);
  assert.equal(state.missionActions, null);
  assert.equal(state.missionActionsView, null);
  assert.equal(paths.length, 1);
});

test('action inbox summary helpers preserve fallback counts and visible labels', () => {
  const payload = {
    items: [
      { providerFallbackStopReasonCounts: { 'quota-exceeded': 2, timeout: 1 } },
      { providerFallbackStopReasonCounts: { 'quota-exceeded': 3, '': 9 } },
    ],
  };
  const state = {
    missionActionsFallbackStopReasonFilter: 'quota-exceeded',
    missionActionsFilter: 'needs-reminder',
  };

  assert.deepEqual(getMissionActionsFallbackStopReasonCounts(payload), {
    'quota-exceeded': 5,
    timeout: 1,
  });
  assert.equal(getMissionActionsVisibleFilterLabel(state), '재알림 필요 · fallback stop quota-exceeded');
  assert.equal(hasActiveMissionActionsFilter(state), true);
});

test('action inbox filter controls load, render, and sync only after state changes', async () => {
  const filter = createControl({ dataset: { actionInboxFilter: 'overdue' } });
  const fallbackReset = createControl();
  const copyLink = createControl();
  const container = createContainer({
    controls: {
      '[data-action-inbox-copy-link]': copyLink,
      '[data-action-inbox-fallback-stop-reset]': fallbackReset,
    },
    groups: { '[data-action-inbox-filter]': [filter] },
  });
  const calls = [];
  const state = {
    missionActionsFallbackStopReasonFilter: 'timeout',
    missionActionsFilter: 'all',
    selectedMissionId: 'mission-1',
  };

  wireMissionActionsFilterControls({
    container,
    copyViewLink: () => calls.push('copy'),
    loadActions: async (missionId) => calls.push(`load:${missionId}`),
    render: () => calls.push('render'),
    state,
    syncUrl: () => calls.push('sync-url'),
  });

  await filter.emit('click');
  await fallbackReset.emit('click');
  await copyLink.emit('click');

  assert.equal(state.missionActionsFilter, 'overdue');
  assert.equal(state.missionActionsFallbackStopReasonFilter, '');
  assert.deepEqual(calls, [
    'load:mission-1',
    'render',
    'sync-url',
    'load:mission-1',
    'render',
    'sync-url',
    'copy',
  ]);
});

test('action inbox item wiring resolves records before delegating mutations', async () => {
  const rerun = createControl({ dataset: { actionRerun: 'action-1' } });
  const provider = createControl({
    dataset: {
      providerAttentionMode: 'recoverable-fallback',
      providerAttentionRemediate: 'action-2',
    },
  });
  const learning = createControl({
    dataset: {
      learningPromotionDecision: 'reject',
      learningPromotionResolve: 'candidate-1',
    },
  });
  const reviewer = createControl({ dataset: { actionResolve: 'action-3' } });
  const overrideSet = createControl({
    dataset: { workspaceLearningSelectionOverrideSet: 'candidate-1' },
  });
  const overrideClear = createControl({
    dataset: { workspaceLearningSelectionOverrideClear: 'candidate-1' },
  });
  const container = createContainer({
    groups: {
      '[data-action-rerun]': [rerun],
      '[data-action-resolve]': [reviewer],
      '[data-learning-promotion-resolve]': [learning],
      '[data-provider-attention-remediate]': [provider],
      '[data-workspace-learning-selection-override-clear]': [overrideClear],
      '[data-workspace-learning-selection-override-set]': [overrideSet],
    },
  });
  const calls = [];
  const items = [
    { actionId: 'action-1', missionId: 'mission-1' },
    { actionId: 'action-2', missionId: 'mission-1' },
    { actionId: 'action-4', learningCandidateId: 'candidate-1', missionId: 'mission-1' },
  ];

  wireActionInboxActions({
    container,
    items,
    onLearningPromotionAuditCopy: () => {},
    onLearningPromotionExpire: () => {},
    onLearningPromotionRemind: () => {},
    onLearningPromotionResolve: (item, decision) => calls.push(`learning:${item.learningCandidateId}:${decision}`),
    onLearningPromotionRollback: () => {},
    onOpenMission: () => {},
    onProviderAttentionRemediate: (item, mode) => calls.push(`provider:${item.actionId}:${mode}`),
    onRerun: (item) => calls.push(`rerun:${item.actionId}`),
    onReviewerFollowUpResolve: (actionId) => calls.push(`reviewer:${actionId}`),
    onSpecialistFollowUpRemediate: () => {},
    onWorkspaceLearningSelectionOverrideClear: (item) =>
      calls.push(`override-clear:${item.learningCandidateId}`),
    onWorkspaceLearningSelectionOverrideSet: (item) =>
      calls.push(`override-set:${item.learningCandidateId}`),
  });

  await rerun.emit('click');
  await provider.emit('click');
  await learning.emit('click');
  await reviewer.emit('click');
  await overrideSet.emit('click');
  await overrideClear.emit('click');

  assert.deepEqual(calls, [
    'rerun:action-1',
    'provider:action-2:recoverable-fallback',
    'learning:candidate-1:reject',
    'reviewer:action-3',
    'override-set:candidate-1',
    'override-clear:candidate-1',
  ]);
});

test('workspace learning override rendering exposes content-free state and bounded controls', () => {
  const item = {
    actionType: 'learning-promotion',
    learningCandidateId: 'candidate-1',
    promotionStatus: 'promoted',
    workspaceLearningSelectionOverride: {
      current: {
        expiresAt: '2026-07-18T00:00:00.000Z',
        id: 'override-1',
        memoryId: 'memory-1',
        note: 'raw note must stay hidden',
        noteHash: 'a'.repeat(64),
        setAt: '2026-07-17T00:00:00.000Z',
      },
      historyCount: 1,
      observedAt: '2026-07-17T01:00:00.000Z',
      status: 'active',
    },
    workspaceLearningSelectionOverrideClearCommand: 'clear override command',
    workspaceLearningSelectionOverrideSetCommand: 'set override command',
  };

  const details = formatLearningPromotionDetails(item);
  const commands = renderLearningPromotionCommandMeta(item);
  const buttons = renderLearningPromotionActionButtons(item);
  const auditPackage = buildLearningPromotionAuditPackageText(item);

  assert.match(details, /selection override active/);
  assert.match(commands, /override-set: set override command/);
  assert.match(commands, /override-clear: clear override command/);
  assert.match(buttons, /data-workspace-learning-selection-override-set="candidate-1"/);
  assert.match(buttons, /data-workspace-learning-selection-override-clear="candidate-1"/);
  assert.match(auditPackage, /noteHash: a{64}/);
  assert.equal(auditPackage.includes('raw note must stay hidden'), false);
});
