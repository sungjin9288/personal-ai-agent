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

const RELEASE_COPY_KEY_HANDLER_NAMES = new Map([
  ['copy-release-production-blocker-summary', 'copyReleaseProductionBlockerSummary'],
  ['copy-release-blocker-filter-summary', 'copyReleaseBlockerFilterSummary'],
  ['copy-release-blocker-provider-only-summary', 'copyReleaseBlockerProviderOnlySummary'],
  ['copy-release-blocker-api-link', 'copyReleaseBlockerApiLink'],
  ['copy-release-blocker-provider-only-api-link', 'copyReleaseBlockerProviderOnlyApiLink'],
  ['copy-release-blocker-filter-package', 'copyReleaseBlockerFilterPackage'],
  ['copy-release-blocker-provider-only-package', 'copyReleaseBlockerProviderOnlyPackage'],
  ['copy-release-blocker-filter-closure-checklist', 'copyReleaseBlockerFilterClosureChecklist'],
  ['copy-release-blocker-provider-only-closure-checklist', 'copyReleaseBlockerProviderOnlyClosureChecklist'],
  ['copy-release-blocker-filter-closure-matrix', 'copyReleaseBlockerFilterClosureMatrixPackage'],
  ['copy-release-blocker-provider-only-closure-matrix', 'copyReleaseBlockerProviderOnlyClosureMatrixPackage'],
  ['copy-release-target-evidence-intake-summary', 'copyReleaseTargetEvidenceIntakeSummary'],
  ['copy-release-target-evidence-provider-only-intake-summary', 'copyReleaseTargetEvidenceProviderOnlyIntakeSummary'],
  ['copy-release-target-evidence-capture-template', 'copyReleaseTargetEvidenceCaptureTemplate'],
  ['copy-release-target-evidence-provider-only-capture-template', 'copyReleaseTargetEvidenceProviderOnlyCaptureTemplate'],
  ['copy-release-target-evidence-required-commands', 'copyReleaseTargetEvidenceRequiredCommands'],
  ['copy-release-target-evidence-provider-only-required-commands', 'copyReleaseTargetEvidenceProviderOnlyRequiredCommands'],
  ['copy-release-target-evidence-production-gap', 'copyReleaseTargetEvidenceProductionGap'],
  ['copy-release-target-evidence-provider-only-production-gap', 'copyReleaseTargetEvidenceProviderOnlyProductionGap'],
  ['copy-release-target-evidence-exception-register', 'copyReleaseTargetEvidenceExceptionRegister'],
  ['copy-release-target-evidence-provider-only-exception-register', 'copyReleaseTargetEvidenceProviderOnlyExceptionRegister'],
  ['copy-release-target-evidence-risk-decision-register', 'copyReleaseTargetEvidenceRiskDecisionRegister'],
  ['copy-release-target-evidence-provider-only-risk-decision-register', 'copyReleaseTargetEvidenceProviderOnlyRiskDecisionRegister'],
  ['copy-release-target-evidence-provider-references', 'copyReleaseTargetEvidenceProviderEvidenceReferences'],
  ['copy-release-target-evidence-provider-only-provider-references', 'copyReleaseTargetEvidenceProviderOnlyProviderEvidenceReferences'],
  ['copy-release-target-evidence-residual-blockers', 'copyReleaseTargetEvidenceResidualBlockers'],
  ['copy-release-target-evidence-provider-only-residual-blockers', 'copyReleaseTargetEvidenceProviderOnlyResidualBlockers'],
  ['copy-release-target-evidence-closure-rules', 'copyReleaseTargetEvidenceClosureRules'],
  ['copy-release-target-evidence-provider-only-closure-rules', 'copyReleaseTargetEvidenceProviderOnlyClosureRules'],
  ['copy-release-target-evidence-submission-manifest', 'copyReleaseTargetEvidenceSubmissionManifest'],
  ['copy-release-target-evidence-provider-only-submission-manifest', 'copyReleaseTargetEvidenceProviderOnlySubmissionManifest'],
  ['copy-release-target-evidence-sanitized-register', 'copyReleaseTargetEvidenceSanitizedRegister'],
  ['copy-release-target-evidence-provider-only-sanitized-register', 'copyReleaseTargetEvidenceProviderOnlySanitizedRegister'],
  ['copy-release-target-evidence-boundary-map', 'copyReleaseTargetEvidenceBoundaryMap'],
  ['copy-release-target-evidence-provider-only-boundary-map', 'copyReleaseTargetEvidenceProviderOnlyBoundaryMap'],
  ['copy-release-target-evidence-command-rerun-log', 'copyReleaseTargetEvidenceCommandRerunLog'],
  ['copy-release-target-evidence-provider-only-command-rerun-log', 'copyReleaseTargetEvidenceProviderOnlyCommandRerunLog'],
  ['copy-release-target-evidence-decision-record', 'copyReleaseTargetEvidenceDecisionRecord'],
  ['copy-release-target-evidence-provider-only-decision-record', 'copyReleaseTargetEvidenceProviderOnlyDecisionRecord'],
  ['copy-release-target-evidence-blocker-disposition', 'copyReleaseTargetEvidenceBlockerDispositionRegister'],
  ['copy-release-target-evidence-provider-only-blocker-disposition', 'copyReleaseTargetEvidenceProviderOnlyBlockerDispositionRegister'],
  ['copy-release-target-evidence-release-refresh', 'copyReleaseTargetEvidenceReleaseRefreshEvidence'],
  ['copy-release-target-evidence-provider-only-release-refresh', 'copyReleaseTargetEvidenceProviderOnlyReleaseRefreshEvidence'],
  ['copy-release-target-evidence-intake-packet', 'copyReleaseTargetEvidenceIntakePacket'],
  ['copy-release-target-evidence-provider-only-intake-packet', 'copyReleaseTargetEvidenceProviderOnlyIntakePacket'],
  ['copy-release-blocker-filter-handoff', 'copyReleaseBlockerFilterHandoff'],
  ['copy-release-blocker-provider-only-handoff', 'copyReleaseBlockerProviderOnlyHandoff'],
  ['copy-release-blocker-filter-commands', 'copyReleaseBlockerFilterCommands'],
  ['copy-release-blocker-provider-only-commands', 'copyReleaseBlockerProviderOnlyCommands'],
  ['copy-release-blocker-filter-evidence', 'copyReleaseBlockerFilterEvidence'],
  ['copy-release-blocker-provider-only-evidence', 'copyReleaseBlockerProviderOnlyEvidence'],
]);

const RELEASE_BLOCKER_COPY_HANDLER_NAMES = new Map([
  ['copy-release-blocker-handoff', 'copyReleaseBlockerHandoff'],
  ['copy-release-blocker-closure-checklist', 'copyReleaseBlockerClosureChecklist'],
  ['copy-release-blocker-package', 'copyReleaseBlockerPackage'],
]);

const RELEASE_PRODUCTION_BLOCKER_COPY_HANDLER_NAMES = new Map([
  ['copy-release-production-blocker-handoff', 'copyReleaseProductionBlockerHandoff'],
  ['copy-release-production-blocker-commands', 'copyReleaseProductionBlockerCommands'],
  ['copy-release-production-blocker-package', 'copyReleaseProductionBlockerPackage'],
]);

const RELEASE_HANDOFF_COPY_HANDLER_NAMES = new Map([
  ['copy-release-handoff-preview-link', 'copyReleaseHandoffPreviewLink'],
  ['copy-release-handoff-open-link', 'copyReleaseHandoffOpenLink'],
  ['copy-release-handoff-structured-summary', 'copyReleaseHandoffStructuredSummary'],
]);

const RELEASE_SPECIAL_COPY_ACTIONS = [
  'copy-release-triage-link',
  'copy-release-history-link',
  'copy-release-blocker-link',
  'copy-release-production-blocker-link',
  'copy-release-provider-readiness-package',
  'copy-release-evidence-doc-link',
  'copy-release-command',
  'copy-release-handoff-structured-summary-detail',
  'copy-release-handoff-structured-summary-stable-line',
  'copy-release-flow-link',
  'copy-release-provider-link',
];

export const RELEASE_STATUS_COPY_ACTIONS = Object.freeze([
  ...RELEASE_COPY_KEY_HANDLER_NAMES.keys(),
  ...RELEASE_BLOCKER_COPY_HANDLER_NAMES.keys(),
  ...RELEASE_PRODUCTION_BLOCKER_COPY_HANDLER_NAMES.keys(),
  ...RELEASE_HANDOFF_COPY_HANDLER_NAMES.keys(),
  ...RELEASE_SPECIAL_COPY_ACTIONS,
]);

const RELEASE_STATUS_COPY_ACTION_SET = new Set(RELEASE_STATUS_COPY_ACTIONS);

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

export function wireReleaseStatusCopyActions({
  container,
  handlers,
}) {
  container.querySelectorAll('[data-ui-action]').forEach((button) => {
    const action = button.dataset.uiAction || '';
    if (!RELEASE_STATUS_COPY_ACTION_SET.has(action)) {
      return;
    }

    button.addEventListener('click', () => {
      const value = button.dataset.uiValue || '';
      const copyKey = button.dataset.uiCopyKey || '';
      const copyKeyHandlerName = RELEASE_COPY_KEY_HANDLER_NAMES.get(action);
      if (copyKeyHandlerName) {
        void handlers[copyKeyHandlerName]({ copyKey });
        return;
      }

      const blockerHandlerName = RELEASE_BLOCKER_COPY_HANDLER_NAMES.get(action);
      if (blockerHandlerName) {
        const blockerId = button.dataset.uiBlocker || value;
        void handlers[blockerHandlerName]({
          blockerId,
          copyKey: copyKey || blockerId,
        });
        return;
      }

      const productionBlockerHandlerName = RELEASE_PRODUCTION_BLOCKER_COPY_HANDLER_NAMES.get(action);
      if (productionBlockerHandlerName) {
        void handlers[productionBlockerHandlerName]({
          blockerIndex: button.dataset.uiIndex || value || 0,
          copyKey,
        });
        return;
      }

      const handoffHandlerName = RELEASE_HANDOFF_COPY_HANDLER_NAMES.get(action);
      if (handoffHandlerName) {
        void handlers[handoffHandlerName]({
          artifactId: value,
          successNotice: button.dataset.uiSuccessNotice || '',
        });
        return;
      }

      if (action === 'copy-release-triage-link') {
        void handlers.copyReleaseTriageLink({ copyAction: action, copyKey });
        return;
      }

      if (action === 'copy-release-history-link') {
        void handlers.copyReleaseTriageLink({
          copyAction: action,
          copyKey,
          focusedBlockerId: '',
          focusedProductionBlockerIndex: '',
          focusedProvider: '',
          focusedHistoryId: value,
          historyOutcome: '',
          historyProvider: '',
          historyScope: '',
          successNotice: '선택한 release 기록 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-blocker-link') {
        const blockerId = button.dataset.uiBlocker || value;
        void handlers.copyReleaseBlockerLink({
          blockerId,
          copyKey: copyKey || blockerId,
          successNotice: '선택한 release blocker 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-production-blocker-link') {
        const blockerIndexValue = button.dataset.uiIndex || value;
        void handlers.copyReleaseProductionBlockerLink({
          blockerIndex: blockerIndexValue || 0,
          copyKey: copyKey || blockerIndexValue,
          successNotice: '선택한 production-ready blocker 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-provider-readiness-package') {
        const provider = button.dataset.uiProvider || value;
        void handlers.copyReleaseProviderReadinessPackage({
          copyKey: copyKey || provider,
          provider,
        });
        return;
      }

      if (action === 'copy-release-evidence-doc-link') {
        const href = button.dataset.uiHref || value;
        void handlers.copyReleaseEvidenceDocLink({
          copyAction: action,
          copyKey: copyKey || href,
          href,
          label: button.dataset.uiLabel || '',
        });
        return;
      }

      if (action === 'copy-release-command') {
        void handlers.copyReleaseCommand({
          command: value,
          label: button.dataset.uiLabel || 'release command',
        });
        return;
      }

      if (action === 'copy-release-handoff-structured-summary-detail') {
        void handlers.copyReleaseHandoffStructuredSummaryDetail({
          artifactId: value,
          detailKey: button.dataset.uiDetailKey || '',
          successNotice: button.dataset.uiSuccessNotice || '',
        });
        return;
      }

      if (action === 'copy-release-handoff-structured-summary-stable-line') {
        void handlers.copyReleaseHandoffStructuredSummaryStableLine({
          artifactId: value,
          detailKey: button.dataset.uiDetailKey || '',
          lineIndex: button.dataset.uiLineIndex || '',
          successNotice: button.dataset.uiSuccessNotice || '',
        });
        return;
      }

      if (action === 'copy-release-flow-link') {
        void handlers.copyReleaseTriageLink({
          copyAction: action,
          copyKey,
          focusedBlockerId: '',
          focusedProductionBlockerIndex: '',
          focusedProvider: '',
          focusedHistoryId: value,
          historyOutcome: button.dataset.uiOutcome || '',
          historyProvider: button.dataset.uiProvider || '',
          historyScope: button.dataset.uiScope || '',
          successNotice: '선택한 release flow 링크를 복사했습니다.',
        });
        return;
      }

      if (action === 'copy-release-provider-link') {
        const provider = button.dataset.uiProvider || value;
        void handlers.copyReleaseTriageLink({
          copyAction: action,
          copyKey,
          focusedBlockerId: '',
          focusedProductionBlockerIndex: '',
          focusedProvider: provider,
          focusedHistoryId: '',
          historyOutcome: '',
          historyProvider: '',
          historyScope: '',
          successNotice: '선택한 provider spotlight 링크를 복사했습니다.',
        });
      }
    });
  });
}
