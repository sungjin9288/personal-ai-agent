import assert from 'node:assert/strict';
import { test } from 'node:test';

import { wireReleaseStatusLifecycleActions } from '../src/web/public/lib/release-status-actions.js';

function createButton(action, dataset = {}) {
  const listeners = new Map();
  return {
    dataset: { uiAction: action, ...dataset },
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    async click() {
      await listeners.get('click')?.();
    },
    hasListener(type) {
      return listeners.has(type);
    },
  };
}

function createLifecycle(buttons, state = {}) {
  const calls = [];
  wireReleaseStatusLifecycleActions({
    archiveSnapshot: async () => calls.push('archive'),
    armLiveConfirm: async (provider) => calls.push(`arm-live:${provider}`),
    armRegenerationConfirm: async () => calls.push('arm-regenerate'),
    armSnapshotConfirm: async () => calls.push('arm-snapshot'),
    container: {
      querySelectorAll(selector) {
        assert.equal(selector, '[data-ui-action]');
        return buttons;
      },
    },
    preflight: async (provider) => calls.push(`preflight:${provider}`),
    preflightAll: async () => calls.push('preflight-all'),
    refresh: async () => calls.push('refresh'),
    refreshLive: async (provider) => calls.push(`refresh-live:${provider}`),
    regenerate: async () => calls.push('regenerate'),
    renderStatus: () => calls.push('render'),
    setNotice: (notice) => calls.push(`notice:${notice}`),
    state,
  });
  return calls;
}

test('release lifecycle wiring ignores unrelated quick actions', async () => {
  const unrelated = createButton('switch-tab');
  const refresh = createButton('refresh-release-status');
  const calls = createLifecycle([unrelated, refresh]);

  assert.equal(unrelated.hasListener('click'), false);
  assert.equal(refresh.hasListener('click'), true);
  await refresh.click();
  assert.deepEqual(calls, ['refresh']);
});

test('release regeneration and snapshot actions keep two-step confirmation state', async () => {
  const regenerate = createButton('regenerate-release-surface');
  const cancelRegenerate = createButton('cancel-regenerate-release-surface');
  const snapshot = createButton('archive-release-snapshot');
  const cancelSnapshot = createButton('cancel-archive-release-snapshot');
  const state = {
    releaseRefreshPreflight: { ok: true },
    releaseRegenerationConfirmArmed: false,
    releaseSnapshotConfirmArmed: false,
    releaseSnapshotPreflight: { ok: true },
  };
  const calls = createLifecycle([regenerate, cancelRegenerate, snapshot, cancelSnapshot], state);

  await regenerate.click();
  state.releaseRegenerationConfirmArmed = true;
  await regenerate.click();
  await cancelRegenerate.click();

  await snapshot.click();
  state.releaseSnapshotConfirmArmed = true;
  await snapshot.click();
  await cancelSnapshot.click();

  assert.equal(state.releaseRegenerationConfirmArmed, false);
  assert.equal(state.releaseRefreshPreflight, null);
  assert.equal(state.releaseSnapshotConfirmArmed, false);
  assert.equal(state.releaseSnapshotPreflight, null);
  assert.deepEqual(calls, [
    'arm-regenerate',
    'regenerate',
    'render',
    'notice:current surface 재생성 확인을 취소했습니다.',
    'arm-snapshot',
    'archive',
    'render',
    'notice:release snapshot 고정 확인을 취소했습니다.',
  ]);
});

test('release provider actions preserve provider validation and live-confirm flow', async () => {
  const emptyPreflight = createButton('run-release-preflight');
  const preflight = createButton('run-release-preflight', { uiProvider: ' openai ' });
  const preflightAll = createButton('run-release-preflight-all');
  const live = createButton('refresh-release-status-live', { uiProvider: 'openai' });
  const cancelLive = createButton('cancel-refresh-release-status-live');
  const state = {
    releaseLiveConfirmProvider: '',
    releaseLiveRefreshPreflight: { ok: true },
  };
  const calls = createLifecycle([emptyPreflight, preflight, preflightAll, live, cancelLive], state);

  await emptyPreflight.click();
  await preflight.click();
  await preflightAll.click();
  await live.click();
  state.releaseLiveConfirmProvider = 'openai';
  await live.click();
  await cancelLive.click();

  assert.equal(state.releaseLiveConfirmProvider, '');
  assert.equal(state.releaseLiveRefreshPreflight, null);
  assert.deepEqual(calls, [
    'preflight:openai',
    'preflight-all',
    'arm-live:openai',
    'refresh-live:openai',
    'render',
    'notice:provider live validation 확인을 취소했습니다.',
  ]);
});
