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
