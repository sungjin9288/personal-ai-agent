const RELEASE_STATUS_LIFECYCLE_ACTIONS = new Set([
  'archive-release-snapshot',
  'cancel-archive-release-snapshot',
  'cancel-refresh-release-status-live',
  'cancel-regenerate-release-surface',
  'refresh-release-status',
  'refresh-release-status-live',
  'regenerate-release-surface',
  'run-release-preflight',
  'run-release-preflight-all',
]);

const RELEASE_STATUS_NAVIGATION_ACTIONS = new Set([
  'clear-release-blocker-filter',
  'clear-release-blocker-focus',
  'clear-release-history-filter',
  'clear-release-history-focus',
  'clear-release-production-blocker-focus',
  'clear-release-provider-focus',
  'filter-release-blockers',
  'filter-release-history-attention',
  'filter-release-history-provider',
  'filter-release-history-scope',
  'focus-release-blocker',
  'focus-release-flow',
  'focus-release-history',
  'focus-release-production-blocker',
  'focus-release-provider',
  'toggle-release-history',
  'toggle-release-production-blockers',
]);

export function wireReleaseStatusLifecycleActions({
  archiveSnapshot,
  armLiveConfirm,
  armRegenerationConfirm,
  armSnapshotConfirm,
  container,
  preflight,
  preflightAll,
  refresh,
  refreshLive,
  regenerate,
  renderStatus,
  setNotice,
  state,
}) {
  container.querySelectorAll('[data-ui-action]').forEach((button) => {
    const action = button.dataset.uiAction || '';
    if (!RELEASE_STATUS_LIFECYCLE_ACTIONS.has(action)) {
      return;
    }

    button.addEventListener('click', async () => {
      if (action === 'refresh-release-status') {
        await refresh();
        return;
      }

      if (action === 'regenerate-release-surface') {
        if (state.releaseRegenerationConfirmArmed) {
          await regenerate();
        } else {
          await armRegenerationConfirm();
        }
        return;
      }

      if (action === 'cancel-regenerate-release-surface') {
        state.releaseRegenerationConfirmArmed = false;
        state.releaseRefreshPreflight = null;
        renderStatus();
        setNotice('current surface 재생성 확인을 취소했습니다.');
        return;
      }

      if (action === 'archive-release-snapshot') {
        if (state.releaseSnapshotConfirmArmed) {
          await archiveSnapshot();
        } else {
          await armSnapshotConfirm();
        }
        return;
      }

      if (action === 'cancel-archive-release-snapshot') {
        state.releaseSnapshotConfirmArmed = false;
        state.releaseSnapshotPreflight = null;
        renderStatus();
        setNotice('release snapshot 고정 확인을 취소했습니다.');
        return;
      }

      if (action === 'cancel-refresh-release-status-live') {
        state.releaseLiveConfirmProvider = '';
        state.releaseLiveRefreshPreflight = null;
        renderStatus();
        setNotice('provider live validation 확인을 취소했습니다.');
        return;
      }

      if (action === 'run-release-preflight-all') {
        await preflightAll();
        return;
      }

      const provider = String(button.dataset.uiProvider || '').trim();
      if (!provider) {
        return;
      }

      if (action === 'run-release-preflight') {
        await preflight(provider);
        return;
      }

      if (state.releaseLiveConfirmProvider === provider) {
        await refreshLive(provider);
      } else {
        await armLiveConfirm(provider);
      }
    });
  });
}

export function wireReleaseStatusNavigationActions({
  clearBlockerFilter,
  clearBlockerFocus,
  clearHistoryFilter,
  clearHistoryFocus,
  clearProductionBlockerFocus,
  clearProviderFocus,
  container,
  filterBlockers,
  filterHistory,
  focusBlocker,
  focusFlow,
  focusHistory,
  focusProductionBlocker,
  focusProvider,
  renderStatus,
  setNotice,
  state,
  toggleHistory,
}) {
  container.querySelectorAll('[data-ui-action]').forEach((button) => {
    const action = button.dataset.uiAction || '';
    if (!RELEASE_STATUS_NAVIGATION_ACTIONS.has(action)) {
      return;
    }

    button.addEventListener('click', () => {
      const value = button.dataset.uiValue || '';

      if (action === 'focus-release-history') {
        focusHistory(value, { historyMode: 'push' });
        setNotice('최근 release action 기록으로 이동했습니다.');
        return;
      }

      if (action === 'focus-release-blocker') {
        const provider = String(button.dataset.uiProvider || '').trim();
        if (provider) {
          state.releaseFocusedProvider = provider;
        }
        focusBlocker(button.dataset.uiBlocker || value, { historyMode: 'push' });
        setNotice('선택한 current open blocker로 이동했습니다.');
        return;
      }

      if (action === 'focus-release-production-blocker') {
        focusProductionBlocker(button.dataset.uiIndex || value, { historyMode: 'push' });
        setNotice('선택한 production-ready blocker로 이동했습니다.');
        return;
      }

      if (action === 'filter-release-blockers') {
        const includeSharedValue = button.dataset.uiIncludeShared;
        filterBlockers({
          category: button.dataset.uiCategory || '',
          historyMode: 'push',
          includeShared: includeSharedValue === undefined
            ? state.releaseBlockerIncludeSharedProviderOperations
            : includeSharedValue !== 'false',
          owner: button.dataset.uiOwner || '',
          provider: button.dataset.uiProvider || '',
        });
        setNotice('current open blocker 목록을 선택한 triage 기준으로 좁혔습니다.');
        return;
      }

      if (action === 'toggle-release-production-blockers') {
        state.releaseProductionBlockersExpanded = !state.releaseProductionBlockersExpanded;
        if (!state.releaseProductionBlockersExpanded && Number(state.releaseFocusedProductionBlockerIndex) >= 8) {
          state.releaseFocusedProductionBlockerIndex = '';
        }
        renderStatus();
        setNotice(
          state.releaseProductionBlockersExpanded
            ? 'production-ready blocker 전체 목록을 펼쳤습니다.'
            : 'production-ready blocker 목록을 요약 보기로 접었습니다.',
        );
        return;
      }

      if (action === 'focus-release-provider') {
        focusProvider(button.dataset.uiProvider || value, { historyMode: 'push' });
        setNotice('연결된 provider readiness 카드로 이동했습니다.');
        return;
      }

      if (action === 'focus-release-flow') {
        focusFlow({
          historyId: value,
          historyMode: 'push',
          outcome: button.dataset.uiOutcome || '',
          provider: button.dataset.uiProvider || '',
          scope: button.dataset.uiScope || '',
        });
        setNotice('같은 release flow 기준으로 history를 좁혀 봅니다.');
        return;
      }

      if (action === 'toggle-release-history') {
        toggleHistory(value);
        return;
      }

      if (action === 'clear-release-history-focus') {
        clearHistoryFocus({ historyMode: 'push' });
        setNotice('release action history 포커스를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-blocker-focus') {
        clearBlockerFocus({ historyMode: 'push' });
        setNotice('current open blocker 포커스를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-production-blocker-focus') {
        clearProductionBlockerFocus({ historyMode: 'push' });
        setNotice('production-ready blocker 포커스를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-blocker-filter') {
        clearBlockerFilter({ historyMode: 'push' });
        setNotice('current open blocker triage 필터를 해제했습니다.');
        return;
      }

      if (action === 'clear-release-provider-focus') {
        clearProviderFocus({ historyMode: 'push' });
        setNotice('provider readiness 카드 포커스를 해제했습니다.');
        return;
      }

      if (action === 'filter-release-history-scope') {
        filterHistory({
          historyMode: 'push',
          outcome: state.releaseHistoryFilterOutcome,
          provider: state.releaseHistoryFilterProvider,
          scope: button.dataset.uiScope || '',
        });
        setNotice('같은 scope 기준으로 release action history를 좁혀 봅니다.');
        return;
      }

      if (action === 'filter-release-history-provider') {
        filterHistory({
          historyMode: 'push',
          outcome: state.releaseHistoryFilterOutcome,
          provider: button.dataset.uiProvider || '',
          scope: state.releaseHistoryFilterScope,
        });
        setNotice('같은 provider 기준으로 release action history를 좁혀 봅니다.');
        return;
      }

      if (action === 'filter-release-history-attention') {
        filterHistory({
          historyMode: 'push',
          outcome: button.dataset.uiOutcome || 'attention',
          provider: state.releaseHistoryFilterProvider,
          scope: state.releaseHistoryFilterScope,
        });
        setNotice('주의 상태만 남기도록 release action history를 좁혀 봅니다.');
        return;
      }

      clearHistoryFilter({ historyMode: 'push' });
      setNotice('release action history 필터를 해제했습니다.');
    });
  });
}
