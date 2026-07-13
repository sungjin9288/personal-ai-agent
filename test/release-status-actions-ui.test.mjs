import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  wireReleaseStatusLifecycleActions,
  wireReleaseStatusNavigationActions,
} from '../src/web/public/lib/release-status-actions.js';

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

function createNavigation(buttons, state = {}) {
  const calls = [];
  const record = (name) => (...args) => calls.push([name, ...args]);
  wireReleaseStatusNavigationActions({
    clearBlockerFilter: record('clear-blocker-filter'),
    clearBlockerFocus: record('clear-blocker-focus'),
    clearHistoryFilter: record('clear-history-filter'),
    clearHistoryFocus: record('clear-history-focus'),
    clearProductionBlockerFocus: record('clear-production-blocker-focus'),
    clearProviderFocus: record('clear-provider-focus'),
    container: {
      querySelectorAll(selector) {
        assert.equal(selector, '[data-ui-action]');
        return buttons;
      },
    },
    filterBlockers: record('filter-blockers'),
    filterHistory: record('filter-history'),
    focusBlocker: record('focus-blocker'),
    focusFlow: record('focus-flow'),
    focusHistory: record('focus-history'),
    focusProductionBlocker: record('focus-production-blocker'),
    focusProvider: record('focus-provider'),
    renderStatus: record('render'),
    setNotice: record('notice'),
    state,
    toggleHistory: record('toggle-history'),
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

test('release navigation wiring maps focus actions without claiming copy actions', async () => {
  const copy = createButton('copy-release-triage-link');
  const history = createButton('focus-release-history', { uiValue: 'history-1' });
  const blocker = createButton('focus-release-blocker', {
    uiBlocker: 'blocker-1',
    uiProvider: ' openai ',
  });
  const productionBlocker = createButton('focus-release-production-blocker', { uiIndex: '8' });
  const provider = createButton('focus-release-provider', { uiProvider: 'anthropic' });
  const flow = createButton('focus-release-flow', {
    uiOutcome: 'blocked',
    uiProvider: 'local',
    uiScope: 'snapshot',
    uiValue: 'history-2',
  });
  const state = {};
  const calls = createNavigation([copy, history, blocker, productionBlocker, provider, flow], state);

  assert.equal(copy.hasListener('click'), false);
  await history.click();
  await blocker.click();
  await productionBlocker.click();
  await provider.click();
  await flow.click();

  assert.equal(state.releaseFocusedProvider, 'openai');
  assert.deepEqual(calls, [
    ['focus-history', 'history-1', { historyMode: 'push' }],
    ['notice', '최근 release action 기록으로 이동했습니다.'],
    ['focus-blocker', 'blocker-1', { historyMode: 'push' }],
    ['notice', '선택한 current open blocker로 이동했습니다.'],
    ['focus-production-blocker', '8', { historyMode: 'push' }],
    ['notice', '선택한 production-ready blocker로 이동했습니다.'],
    ['focus-provider', 'anthropic', { historyMode: 'push' }],
    ['notice', '연결된 provider readiness 카드로 이동했습니다.'],
    ['focus-flow', {
      historyId: 'history-2',
      historyMode: 'push',
      outcome: 'blocked',
      provider: 'local',
      scope: 'snapshot',
    }],
    ['notice', '같은 release flow 기준으로 history를 좁혀 봅니다.'],
  ]);
});

test('release blocker navigation keeps filter defaults and production expansion state', async () => {
  const defaultFilter = createButton('filter-release-blockers', {
    uiCategory: 'provider',
    uiOwner: 'operator',
    uiProvider: 'openai',
  });
  const providerOnlyFilter = createButton('filter-release-blockers', { uiIncludeShared: 'false' });
  const toggleProduction = createButton('toggle-release-production-blockers');
  const state = {
    releaseBlockerIncludeSharedProviderOperations: true,
    releaseFocusedProductionBlockerIndex: '9',
    releaseProductionBlockersExpanded: true,
  };
  const calls = createNavigation([defaultFilter, providerOnlyFilter, toggleProduction], state);

  await defaultFilter.click();
  await providerOnlyFilter.click();
  await toggleProduction.click();
  await toggleProduction.click();

  assert.equal(state.releaseProductionBlockersExpanded, true);
  assert.equal(state.releaseFocusedProductionBlockerIndex, '');
  assert.deepEqual(calls, [
    ['filter-blockers', {
      category: 'provider',
      historyMode: 'push',
      includeShared: true,
      owner: 'operator',
      provider: 'openai',
    }],
    ['notice', 'current open blocker 목록을 선택한 triage 기준으로 좁혔습니다.'],
    ['filter-blockers', {
      category: '',
      historyMode: 'push',
      includeShared: false,
      owner: '',
      provider: '',
    }],
    ['notice', 'current open blocker 목록을 선택한 triage 기준으로 좁혔습니다.'],
    ['render'],
    ['notice', 'production-ready blocker 목록을 요약 보기로 접었습니다.'],
    ['render'],
    ['notice', 'production-ready blocker 전체 목록을 펼쳤습니다.'],
  ]);
});

test('release navigation routes history toggles and focus clearing with push history', async () => {
  const actions = [
    createButton('toggle-release-history', { uiValue: 'history-1' }),
    createButton('clear-release-history-focus'),
    createButton('clear-release-blocker-focus'),
    createButton('clear-release-production-blocker-focus'),
    createButton('clear-release-blocker-filter'),
    createButton('clear-release-provider-focus'),
  ];
  const calls = createNavigation(actions);

  for (const button of actions) {
    await button.click();
  }

  assert.deepEqual(calls, [
    ['toggle-history', 'history-1'],
    ['clear-history-focus', { historyMode: 'push' }],
    ['notice', 'release action history 포커스를 해제했습니다.'],
    ['clear-blocker-focus', { historyMode: 'push' }],
    ['notice', 'current open blocker 포커스를 해제했습니다.'],
    ['clear-production-blocker-focus', { historyMode: 'push' }],
    ['notice', 'production-ready blocker 포커스를 해제했습니다.'],
    ['clear-blocker-filter', { historyMode: 'push' }],
    ['notice', 'current open blocker triage 필터를 해제했습니다.'],
    ['clear-provider-focus', { historyMode: 'push' }],
    ['notice', 'provider readiness 카드 포커스를 해제했습니다.'],
  ]);
});

test('release history navigation preserves active filters while changing one dimension', async () => {
  const scope = createButton('filter-release-history-scope', { uiScope: 'snapshot' });
  const provider = createButton('filter-release-history-provider', { uiProvider: 'openai' });
  const attention = createButton('filter-release-history-attention');
  const clear = createButton('clear-release-history-filter');
  const state = {
    releaseHistoryFilterOutcome: 'blocked',
    releaseHistoryFilterProvider: 'local',
    releaseHistoryFilterScope: 'current-surface',
  };
  const calls = createNavigation([scope, provider, attention, clear], state);

  await scope.click();
  await provider.click();
  await attention.click();
  await clear.click();

  assert.deepEqual(calls, [
    ['filter-history', {
      historyMode: 'push',
      outcome: 'blocked',
      provider: 'local',
      scope: 'snapshot',
    }],
    ['notice', '같은 scope 기준으로 release action history를 좁혀 봅니다.'],
    ['filter-history', {
      historyMode: 'push',
      outcome: 'blocked',
      provider: 'openai',
      scope: 'current-surface',
    }],
    ['notice', '같은 provider 기준으로 release action history를 좁혀 봅니다.'],
    ['filter-history', {
      historyMode: 'push',
      outcome: 'attention',
      provider: 'local',
      scope: 'current-surface',
    }],
    ['notice', '주의 상태만 남기도록 release action history를 좁혀 봅니다.'],
    ['clear-history-filter', { historyMode: 'push' }],
    ['notice', 'release action history 필터를 해제했습니다.'],
  ]);
});
