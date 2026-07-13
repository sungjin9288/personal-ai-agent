import { escapeHtml, formatDate } from './html-format.js';
import {
  renderReleaseBlockerFocusButton,
  renderReleaseClearActionButton,
  renderReleasePreflightAllButton,
  renderReleaseProviderActionButton,
  renderReleaseProviderFocusActionButton,
  renderReleaseSimpleActionButton,
} from './render-fragments.js';
import { getReleaseStatusBadge } from './release-status-view.js';

function getProviderPreflightSummary(preflight) {
  if (!preflight) {
    return 'preflight를 아직 실행하지 않았습니다.';
  }
  if (preflight.status === 'ready-for-live-validation') {
    return `preflight 통과 · ${preflight.checks?.length || 0}개 smoke passed`;
  }
  if (preflight.status === 'ready-but-missing-env') {
    return `preflight 통과 · ${preflight.envKey} 필요`;
  }
  if (preflight.status === 'blocked') {
    const failedCheckCount = (preflight.checks || []).filter((check) => check.status !== 'passed').length;
    return `preflight blocked · ${failedCheckCount}개 실패`;
  }
  return `preflight ${preflight.status}`;
}

export function createReleaseHistoryProviderViewModel({
  filters = {},
  focus = {},
  getActionLabel = () => 'release action',
  getActionScopeLabel = () => 'release',
  getProviderBlockerActions = () => [],
  getProviderClosureSummary = () => ({}),
  getProviderLiveCommand = () => '',
  isAttentionOutcome = () => false,
  isFlowActive = () => ({ attentionFlowActive: false, sameFlowActive: false }),
  liveConfirmProvider = '',
  liveRefreshPreflight = null,
  preflightResults = {},
  release = {},
  releaseActionLabel = 'execution-v1 release',
  releaseAllPreflight = null,
} = {}) {
  const releaseActionHistory = Array.isArray(release.releaseActionHistory)
    ? release.releaseActionHistory
    : [];
  const providerReadiness = Array.isArray(release.providerReadiness)
    ? release.providerReadiness
    : [];
  const focusedHistoryId = String(focus.historyId || '').trim();
  const expandedHistoryId = String(focus.expandedHistoryId || '').trim();
  const focusedProviderId = String(focus.provider || '').trim();
  const focusedBlockerId = String(focus.blockerId || '').trim();
  const historyFilterOutcome = String(filters.outcome || '').trim();
  const historyFilterScope = String(filters.scope || '').trim();
  const historyFilterProvider = String(filters.provider || '').trim();
  const hasHistoryFilter = Boolean(
    historyFilterOutcome || historyFilterScope || historyFilterProvider,
  );
  const filteredHistory = releaseActionHistory.filter((item) => {
    const itemOutcome = String(item?.outcome || '').trim().toLowerCase();
    const itemScope = String(item?.scope || '').trim();
    const itemProvider = String(item?.provider || '').trim();
    if (historyFilterOutcome === 'attention' && !isAttentionOutcome(itemOutcome)) {
      return false;
    }
    if (historyFilterScope && itemScope !== historyFilterScope) {
      return false;
    }
    if (historyFilterProvider && itemProvider !== historyFilterProvider) {
      return false;
    }
    return true;
  });
  const orderedHistory = focusedHistoryId
    ? [
        ...filteredHistory.filter((item) => String(item?.id || '').trim() === focusedHistoryId),
        ...filteredHistory.filter((item) => String(item?.id || '').trim() !== focusedHistoryId),
      ]
    : filteredHistory;
  const historyItems = orderedHistory.map((item) => {
    const id = String(item?.id || '').trim();
    const provider = String(item?.provider || '').trim();
    const scope = String(item?.scope || '').trim();
    const outcome = String(item?.outcome || '').trim();
    const actionLabel = getActionLabel(item?.action);
    const scopeLabel = getActionScopeLabel(scope);
    return {
      ...item,
      actionLabel,
      actionSummaryLabel: `${id || 'release action'} · ${actionLabel} · ${outcome || 'unknown'} · ${scopeLabel}${provider ? ` · ${provider}` : ''}`,
      id,
      isAttention: isAttentionOutcome(outcome),
      isExpanded: Boolean(expandedHistoryId && id === expandedHistoryId),
      isFocused: Boolean(focusedHistoryId && id === focusedHistoryId),
      outcome,
      provider,
      scope,
      scopeLabel,
    };
  });

  const orderedProviderReadiness = focusedProviderId
    ? [
        ...providerReadiness.filter((item) => String(item?.provider || '').trim() === focusedProviderId),
        ...providerReadiness.filter((item) => String(item?.provider || '').trim() !== focusedProviderId),
      ]
    : providerReadiness;
  const providerEntries = orderedProviderReadiness.map((item) => {
    const provider = String(item?.provider || '').trim();
    const preflight = preflightResults?.[provider] || null;
    const liveConfirmArmed = String(liveConfirmProvider || '').trim() === provider;
    const isFocused = focusedProviderId === provider;
    const actionLabel = item?.label || provider || 'provider';
    const blockerActions = getProviderBlockerActions({ provider, releaseStatus: release });
    const topBlocker = blockerActions[0] || null;
    const topBlockerId = String(topBlocker?.id || '').trim();
    const closureSummary = getProviderClosureSummary(item, blockerActions);
    return {
      ...item,
      actionLabel,
      blockerActions,
      closureSummary,
      focusButtonLabel: isFocused
        ? `provider 포커스 해제: ${actionLabel}`
        : `이 provider 카드 보기: ${actionLabel}`,
      isFocused,
      liveCommand: getProviderLiveCommand(item, preflight),
      liveConfirmArmed,
      liveButtonLabel: item?.ready
        ? liveConfirmArmed
          ? `provider live 검증 확인: ${actionLabel}`
          : `provider live 검증 실행: ${actionLabel}`
        : `provider env 필요: ${actionLabel}`,
      preflight,
      preflightStatus: preflight?.status || 'not-run',
      preflightSummary: getProviderPreflightSummary(preflight),
      provider,
      topBlocker,
      topBlockerId,
    };
  });
  const focusedProviderEntry = providerEntries.find((item) => item.provider === focusedProviderId) || null;
  const focusedProviderBlockerActions = focusedProviderId
    ? getProviderBlockerActions({ provider: focusedProviderId, releaseStatus: release })
    : [];
  const focusedProviderTopBlocker = focusedProviderEntry?.topBlocker
    || focusedProviderBlockerActions[0]
    || null;
  const focusedProviderTopBlockerId = String(focusedProviderTopBlocker?.id || '').trim();
  const focusedProviderHistory = focusedProviderId
    ? releaseActionHistory.filter((item) => String(item?.provider || '').trim() === focusedProviderId)
    : [];
  const focusedProviderLatestAction = focusedProviderHistory[0] || null;
  const focusedProviderAttentionHistory = focusedProviderHistory.filter((item) =>
    isAttentionOutcome(item?.outcome),
  );
  const focusedProviderLatestAttentionAction = focusedProviderAttentionHistory[0] || null;
  const providerFlowState = focusedProviderLatestAction
    ? isFlowActive({
        attentionAction: focusedProviderLatestAttentionAction,
        latestAction: focusedProviderLatestAction,
      }, {
        focusedHistoryId,
        historyFilterOutcome,
        historyFilterProvider,
        historyFilterScope,
      })
    : { attentionFlowActive: false, sameFlowActive: false };

  return {
    history: {
      expandedHistoryId,
      filterOutcome: historyFilterOutcome,
      filterProvider: historyFilterProvider,
      filterScope: historyFilterScope,
      filterScopeLabel: historyFilterScope ? getActionScopeLabel(historyFilterScope) : '',
      focusedHistoryId,
      hasFilter: hasHistoryFilter,
      items: historyItems,
      releaseActionLabel,
    },
    providers: {
      aggregate: {
        blockedLabel: releaseAllPreflight
          ? `blocked ${Number(releaseAllPreflight.blockedCount || 0)}`
          : 'blocked not tracked',
        label: releaseAllPreflight
          ? `${releaseAllPreflight.status || 'unknown'} · ready ${Number(releaseAllPreflight.readyForLiveCount || 0)} · env ${Number(releaseAllPreflight.missingEnvCount || 0)}`
          : 'not-run',
        missingEnvLabel: releaseAllPreflight
          ? `missing env ${Number(releaseAllPreflight.missingEnvCount || 0)}`
          : 'missing env not tracked',
        readyLabel: releaseAllPreflight
          ? `ready ${Number(releaseAllPreflight.readyForLiveCount || 0)}`
          : 'ready not tracked',
        result: releaseAllPreflight,
      },
      entries: providerEntries,
      focused: focusedProviderId
        ? {
            actionLabel: focusedProviderEntry?.label || focusedProviderId || 'provider',
            attentionFlowActive: Boolean(providerFlowState.attentionFlowActive),
            attentionHistory: focusedProviderAttentionHistory,
            blockerActions: focusedProviderBlockerActions,
            closureSummary: focusedProviderEntry?.closureSummary || null,
            entry: focusedProviderEntry,
            history: focusedProviderHistory,
            id: focusedProviderId,
            latestAction: focusedProviderLatestAction,
            latestActionIsAttention: focusedProviderLatestAction
              ? isAttentionOutcome(focusedProviderLatestAction.outcome)
              : false,
            latestActionLabel: focusedProviderLatestAction
              ? getActionLabel(focusedProviderLatestAction.action)
              : 'provider record',
            latestAttentionAction: focusedProviderLatestAttentionAction,
            latestAttentionLabel: focusedProviderLatestAttentionAction
              ? getActionLabel(focusedProviderLatestAttentionAction.action)
              : 'provider attention',
            preflight: focusedProviderEntry?.preflight || null,
            sameFlowActive: Boolean(providerFlowState.sameFlowActive),
            topBlocker: focusedProviderTopBlocker,
            topBlockerId: focusedProviderTopBlockerId,
          }
        : null,
      focusedBlockerId,
      historyFilterOutcome,
      historyFilterProvider,
      liveRefreshPreflight,
      releaseActionLabel,
    },
  };
}

export function renderReleaseActionHistory({ copyButtons = {}, view = {} } = {}) {
  const {
    renderReleaseLinkCopyButton = () => '',
    renderReleaseProviderNavigationButton = () => '',
    renderReleaseToggleActionButton = () => '',
  } = copyButtons;
  const {
    filterOutcome = '',
    filterProvider = '',
    filterScope = '',
    filterScopeLabel = '',
    focusedHistoryId = '',
    hasFilter = false,
    items = [],
    releaseActionLabel = 'execution-v1 release',
  } = view.history || {};

  return `
    <div class="mini-head">
      <div>
        <p class="section-kicker">Release Action History</p>
        <h4>최근 preflight, refresh, snapshot, live action</h4>
      </div>
    </div>
    ${focusedHistoryId
      ? `
          <div class="harness-callout release-history-focus-callout">
            <strong>현재 포커스된 release action</strong>
            <p>선택한 기록을 리스트 상단에 유지하고 있습니다. 상세를 확인한 뒤 포커스를 해제할 수 있습니다.</p>
            <div class="release-history-focus-actions">
              ${renderReleaseClearActionButton({
                action: 'clear-release-history-focus',
                actionLabel: `release history 포커스 해제: ${focusedHistoryId}`,
                buttonText: '포커스 해제',
              })}
              ${renderReleaseLinkCopyButton({
                actionLabel: `현재 triage 링크 복사: focused release history ${focusedHistoryId}`,
                buttonText: '현재 triage 링크 복사',
                value: `focused-history:${focusedHistoryId}`,
              })}
              ${hasFilter
                ? renderReleaseClearActionButton({
                    action: 'clear-release-history-filter',
                    actionLabel: `release history 필터 해제: ${releaseActionLabel}`,
                    buttonText: '필터 해제',
                  })
                : ''}
            </div>
            ${hasFilter
              ? `
                  <div class="release-history-filter-chips">
                    ${filterOutcome === 'attention' ? '<span class="mini-badge status-failed">outcome · 주의 상태만</span>' : ''}
                    ${filterScope ? `<span class="mini-badge status-running">scope · ${escapeHtml(filterScopeLabel || filterScope)}</span>` : ''}
                    ${filterProvider ? `<span class="mini-badge status-running">provider · ${escapeHtml(filterProvider)}</span>` : ''}
                  </div>
                `
              : ''}
          </div>
        `
      : ''}
    <div class="release-history-list">
      ${items.length
        ? items.map((item) => `
            <article class="release-snapshot-card ${item.isFocused ? 'is-highlighted' : ''} ${item.isExpanded ? 'is-expanded' : ''}" data-release-history-id="${escapeHtml(item.id)}">
              <div class="release-provider-meta">
                <div>
                  <div class="item-title">${escapeHtml(item.actionLabel)}</div>
                  <div class="item-meta">${escapeHtml(item.scopeLabel)}${item.provider ? ` · ${escapeHtml(item.provider)}` : ''}</div>
                </div>
                <div class="release-history-actions">
                  <span class="mini-badge ${getReleaseStatusBadge(item.outcome)}">${escapeHtml(item.outcome || 'unknown')}</span>
                  ${item.isFocused
                    ? renderReleaseClearActionButton({
                        action: 'clear-release-history-focus',
                        actionLabel: `release history 포커스 해제: ${item.actionSummaryLabel}`,
                        buttonText: '포커스 해제',
                        pressed: true,
                      })
                    : renderReleaseProviderNavigationButton({
                        action: 'focus-release-history',
                        actionLabel: `release history 기록 고정: ${item.actionSummaryLabel}`,
                        buttonText: '이 기록 고정',
                        pressed: false,
                        value: item.id,
                      })}
                  ${renderReleaseToggleActionButton({
                    action: 'toggle-release-history',
                    actionLabel: `release history ${item.isExpanded ? '상세 닫기' : '상세 보기'}: ${item.actionSummaryLabel}`,
                    buttonText: item.isExpanded ? '상세 닫기' : '상세 보기',
                    expanded: item.isExpanded,
                    value: item.id,
                  })}
                </div>
              </div>
              <div class="item-meta">${escapeHtml(item.summary || 'release action summary가 없습니다.')}</div>
              <div class="release-meta release-meta-secondary">
                <span class="item-meta">${escapeHtml(formatDate(item.createdAt))}</span>
                ${item.branch ? `<span class="item-meta">${escapeHtml(item.branch)}</span>` : ''}
                ${item.commit ? `<span class="item-meta mono">${escapeHtml(String(item.commit).slice(0, 12))}</span>` : ''}
              </div>
              ${item.isExpanded
                ? `
                    <div class="release-history-detail">
                      <div class="release-history-filter-actions">
                        ${renderReleaseLinkCopyButton({
                          action: 'copy-release-history-link',
                          actionLabel: `release history 링크 복사: ${item.actionSummaryLabel}`,
                          buttonText: '이 기록 링크 복사',
                          value: item.id,
                        })}
                        ${renderReleaseLinkCopyButton({
                          action: 'copy-release-flow-link',
                          actionLabel: `release flow 링크 복사: ${item.actionSummaryLabel}`,
                          attributes: `data-ui-outcome="${escapeHtml(item.isAttention ? 'attention' : '')}" data-ui-scope="${escapeHtml(item.scope)}" data-ui-provider="${escapeHtml(item.provider)}"`,
                          buttonText: '이 flow 링크 복사',
                          value: item.id,
                        })}
                        ${renderReleaseProviderNavigationButton({
                          action: 'filter-release-history-attention',
                          actionLabel: `release history 주의 상태만 보기: ${item.actionSummaryLabel}`,
                          buttonText: '주의 상태만',
                          outcome: 'attention',
                          pressed: filterOutcome === 'attention',
                        })}
                        ${renderReleaseProviderNavigationButton({
                          action: 'filter-release-history-scope',
                          actionLabel: `release history 같은 scope 보기: ${item.actionSummaryLabel}`,
                          buttonText: '같은 scope 보기',
                          pressed: filterScope === item.scope,
                          scope: item.scope,
                        })}
                        ${item.provider
                          ? renderReleaseProviderNavigationButton({
                              action: 'filter-release-history-provider',
                              actionLabel: `release history 같은 provider 보기: ${item.actionSummaryLabel}`,
                              buttonText: '같은 provider 보기',
                              pressed: filterProvider === item.provider,
                              provider: item.provider,
                            })
                          : ''}
                        ${hasFilter
                          ? renderReleaseClearActionButton({
                              action: 'clear-release-history-filter',
                              actionLabel: `release history 필터 해제: ${item.actionSummaryLabel}`,
                              buttonText: '필터 해제',
                            })
                          : ''}
                      </div>
                      <div class="release-history-detail-grid">
                        <div><span class="section-kicker">Action Id</span><div class="item-meta mono">${escapeHtml(item.id || 'id 없음')}</div></div>
                        <div><span class="section-kicker">Outcome</span><div class="item-meta">${escapeHtml(item.outcome || 'unknown')}</div></div>
                        <div><span class="section-kicker">Scope</span><div class="item-meta">${escapeHtml(item.scopeLabel)}</div></div>
                        <div><span class="section-kicker">Provider</span><div class="item-meta">${escapeHtml(item.provider || '없음')}</div></div>
                      </div>
                    </div>
                  `
                : ''}
            </article>
          `).join('')
        : `
            <article class="release-snapshot-card is-empty">
              <div class="item-title">${hasFilter ? '현재 필터와 맞는 release action 기록이 없습니다.' : '최근 release action 기록이 없습니다.'}</div>
              <p class="item-meta">${hasFilter ? '필터를 해제하면 전체 history를 다시 볼 수 있습니다.' : 'preflight, current surface 재생성, snapshot 고정, provider live validation을 실행하면 이 영역에 최근 action history가 쌓입니다.'}</p>
            </article>
          `}
    </div>
  `;
}

export function renderReleaseProviderReadiness({ copyButtons = {}, view = {} } = {}) {
  const {
    renderReleaseBlockerPackageCopyButton = () => '',
    renderReleaseCommandCopyButton = () => '',
    renderReleaseLinkCopyButton = () => '',
    renderReleaseProviderNavigationButton = () => '',
    renderReleaseProviderReadinessPackageCopyButton = () => '',
  } = copyButtons;
  const {
    aggregate = {},
    entries = [],
    focused = null,
    focusedBlockerId = '',
    historyFilterOutcome = '',
    historyFilterProvider = '',
    liveRefreshPreflight = null,
    releaseActionLabel = 'execution-v1 release',
  } = view.providers || {};

  return `
    ${focused
      ? `
          <div class="harness-callout release-provider-focus-callout">
            <strong>현재 포커스된 provider readiness 카드</strong>
            <p>${escapeHtml(focused.id)} provider card를 강조하고 있습니다. preflight/live action이나 command handoff를 확인한 뒤 포커스를 해제할 수 있습니다.</p>
            ${focused.entry
              ? `
                  <div class="release-history-filter-chips">
                    <span class="mini-badge ${getReleaseStatusBadge(focused.entry.status)}">${escapeHtml(focused.entry.status)}</span>
                    <span class="mini-badge ${getReleaseStatusBadge(focused.preflight?.status || 'not-run')}">${escapeHtml(focused.preflight?.status || 'not-run')}</span>
                  </div>
                `
              : ''}
            <p class="item-meta" data-release-provider-blocker-summary="${escapeHtml(focused.id)}">
              provider blockers ${escapeHtml(String(focused.blockerActions.length))}
              ${focused.topBlocker
                ? ` · top ${escapeHtml(focused.topBlockerId || 'unknown')}: ${escapeHtml(String(focused.topBlocker.stopReason || focused.topBlocker.blocker || '').trim())}`
                : ''}
            </p>
            ${focused.closureSummary
              ? `
                  <p class="item-meta" data-release-provider-closure-summary="${escapeHtml(focused.id)}">
                    closure verifications ${escapeHtml(String(focused.closureSummary.closureVerificationCount))}
                    · required proofs ${escapeHtml(String(focused.closureSummary.requiredProofCount))}
                    · commands ${escapeHtml(String(focused.closureSummary.commandCount))}
                    · evidence docs ${escapeHtml(String(focused.closureSummary.evidenceDocCount))}
                  </p>
                  <div class="release-history-filter-chips" data-release-provider-closure-metrics="${escapeHtml(focused.id)}">
                    <span class="mini-badge status-failed" data-release-provider-closure-count="${escapeHtml(focused.id)}">${escapeHtml(`closure ${focused.closureSummary.closureVerificationCount}`)}</span>
                    <span class="mini-badge status-running" data-release-provider-required-proof-count="${escapeHtml(focused.id)}">${escapeHtml(`proofs ${focused.closureSummary.requiredProofCount}`)}</span>
                    <span class="mini-badge status-running" data-release-provider-command-count="${escapeHtml(focused.id)}">${escapeHtml(`commands ${focused.closureSummary.commandCount}`)}</span>
                    <span class="mini-badge status-running" data-release-provider-evidence-doc-count="${escapeHtml(focused.id)}">${escapeHtml(`evidence ${focused.closureSummary.evidenceDocCount}`)}</span>
                    <span class="mini-badge ${focused.closureSummary.productionReadyClaimAllowed ? 'status-completed' : 'status-failed'}" data-release-provider-production-ready-claim="${escapeHtml(focused.id)}">${escapeHtml(focused.closureSummary.productionReadyClaimAllowed ? 'claim allowed' : 'claim blocked')}</span>
                    <span class="mini-badge ${focused.closureSummary.targetBoundaryRequiredCount ? 'status-failed' : 'status-completed'}" data-release-provider-target-boundary-count="${escapeHtml(focused.id)}">${escapeHtml(`target boundary ${focused.closureSummary.targetBoundaryRequiredCount}`)}</span>
                  </div>
                `
              : ''}
            ${focused.latestAction
              ? `
                  <div class="item-meta">
                    최근 provider 시도 · ${escapeHtml(focused.latestActionLabel)} · ${escapeHtml(focused.latestAction.outcome || 'unknown')} · ${escapeHtml(formatDate(focused.latestAction.createdAt))}
                  </div>
                  <div class="item-meta">${escapeHtml(focused.latestAction.summary || '최근 provider action summary가 없습니다.')}</div>
                  <div class="release-history-filter-chips">
                    <span class="mini-badge status-running">같은 provider ${escapeHtml(String(focused.history.length))}건</span>
                    ${focused.attentionHistory.length
                      ? `<span class="mini-badge status-failed">문제 흐름 ${escapeHtml(String(focused.attentionHistory.length))}건</span>`
                      : ''}
                    ${focused.sameFlowActive
                      ? '<span class="mini-badge status-running">현재 provider flow 적용 중</span>'
                      : ''}
                    ${focused.attentionFlowActive
                      ? '<span class="mini-badge status-failed">현재 provider 문제 흐름 적용 중</span>'
                      : ''}
                  </div>
                  ${focused.latestAttentionAction
                    ? `
                        <div class="item-meta">
                          최근 provider 문제 · ${escapeHtml(focused.latestAttentionLabel)} · ${escapeHtml(formatDate(focused.latestAttentionAction.createdAt))}
                        </div>
                        <div class="item-meta">${escapeHtml(focused.latestAttentionAction.summary || '최근 provider 문제 summary가 없습니다.')}</div>
                      `
                    : ''}
                `
              : '<div class="item-meta">이 provider에 연결된 release action history가 아직 없습니다.</div>'}
            <div class="release-history-focus-actions">
              ${focused.entry
                ? `
                    ${renderReleaseProviderActionButton({
                      action: 'run-release-preflight',
                      actionLabel: `provider preflight 실행: ${focused.actionLabel}`,
                      buttonText: 'preflight 실행',
                      provider: focused.entry.provider,
                    })}
                    ${renderReleaseCommandCopyButton({
                      actionLabel: `provider preflight 명령 복사: ${focused.actionLabel}`,
                      buttonText: 'preflight 명령 복사',
                      command: focused.entry.preflightCommand || `npm run preflight:execution-v1:${focused.entry.provider}`,
                      label: `${focused.entry.label} preflight 명령`,
                    })}
                    ${renderReleaseProviderActionButton({
                      action: 'refresh-release-status-live',
                      actionLabel: focused.entry.liveButtonLabel,
                      buttonText: focused.entry.ready ? (focused.entry.liveConfirmArmed ? 'live 검증 확인' : 'live 검증 실행') : 'env 필요',
                      className: focused.entry.liveConfirmArmed ? 'primary-button' : 'ghost-button',
                      disabled: !focused.entry.ready,
                      pressed: focused.entry.liveConfirmArmed,
                      provider: focused.entry.provider,
                    })}
                    ${renderReleaseCommandCopyButton({
                      actionLabel: `provider live 명령 복사: ${focused.actionLabel}`,
                      buttonText: 'live 명령 복사',
                      command: focused.entry.liveCommand,
                      label: `${focused.entry.label} live 명령`,
                    })}
                    ${renderReleaseProviderReadinessPackageCopyButton({
                      actionLabel: `provider package 복사: ${focused.actionLabel}`,
                      buttonText: 'provider package 복사',
                      provider: focused.entry.provider,
                    })}
                  `
                : ''}
              ${focused.topBlocker
                ? `
                    ${renderReleaseProviderNavigationButton({
                      action: 'focus-release-blocker',
                      actionLabel: `provider blocker 보기: ${focused.actionLabel}`,
                      blocker: focused.topBlockerId,
                      buttonText: 'provider blocker 보기',
                      pressed: focused.topBlockerId === focusedBlockerId,
                      provider: focused.id,
                    })}
                    ${renderReleaseBlockerPackageCopyButton({
                      actionLabel: `provider blocker package 복사: ${focused.actionLabel}`,
                      attributes: 'data-release-provider-blocker-package="true"',
                      blockerId: focused.topBlockerId,
                      buttonText: 'provider blocker package 복사',
                      provider: focused.id,
                    })}
                  `
                : ''}
              ${focused.latestAction
                ? `
                    ${renderReleaseProviderNavigationButton({
                      action: 'focus-release-history',
                      actionLabel: `최근 provider 기록 보기: ${focused.actionLabel} ${focused.latestActionLabel}`,
                      buttonText: '최근 provider 기록 보기',
                      pressed: String(focused.latestAction.id || '').trim() === (view.history?.focusedHistoryId || ''),
                      value: String(focused.latestAction.id || '').trim(),
                    })}
                    ${renderReleaseProviderNavigationButton({
                      action: 'filter-release-history-provider',
                      actionLabel: `같은 provider 기록만 보기: ${focused.actionLabel}`,
                      buttonText: '같은 provider 기록만 보기',
                      pressed: historyFilterProvider === focused.id,
                      provider: focused.id,
                    })}
                    ${renderReleaseProviderNavigationButton({
                      action: 'focus-release-flow',
                      actionLabel: focused.sameFlowActive
                        ? `현재 provider flow: ${focused.actionLabel} ${focused.latestActionLabel}`
                        : `같은 provider flow 보기: ${focused.actionLabel} ${focused.latestActionLabel}`,
                      buttonText: focused.sameFlowActive ? '현재 provider flow' : '같은 provider flow 보기',
                      disabled: focused.sameFlowActive,
                      outcome: focused.latestActionIsAttention ? 'attention' : '',
                      pressed: focused.sameFlowActive,
                      provider: String(focused.latestAction.provider || '').trim(),
                      scope: String(focused.latestAction.scope || '').trim(),
                      value: String(focused.latestAction.id || '').trim(),
                    })}
                    ${renderReleaseLinkCopyButton({
                      action: 'copy-release-flow-link',
                      actionLabel: `provider flow 링크 복사: ${focused.actionLabel} ${focused.latestActionLabel}`,
                      attributes: `data-ui-outcome="${escapeHtml(focused.latestActionIsAttention ? 'attention' : '')}" data-ui-scope="${escapeHtml(String(focused.latestAction.scope || '').trim())}" data-ui-provider="${escapeHtml(String(focused.latestAction.provider || '').trim())}"`,
                      buttonText: 'provider flow 링크 복사',
                      value: String(focused.latestAction.id || '').trim(),
                    })}
                  `
                : ''}
              ${focused.latestAttentionAction
                ? `
                    ${renderReleaseProviderNavigationButton({
                      action: 'focus-release-history',
                      actionLabel: `최근 provider 문제 보기: ${focused.actionLabel} ${focused.latestAttentionLabel}`,
                      buttonText: '최근 provider 문제 보기',
                      pressed: String(focused.latestAttentionAction.id || '').trim() === (view.history?.focusedHistoryId || ''),
                      value: String(focused.latestAttentionAction.id || '').trim(),
                    })}
                    ${renderReleaseProviderNavigationButton({
                      action: 'filter-release-history-attention',
                      actionLabel: `주의 상태만 보기: ${focused.actionLabel}`,
                      buttonText: '주의 상태만',
                      outcome: 'attention',
                      pressed: historyFilterOutcome === 'attention',
                    })}
                    ${renderReleaseProviderNavigationButton({
                      action: 'focus-release-flow',
                      actionLabel: focused.attentionFlowActive
                        ? `현재 provider 문제 흐름: ${focused.actionLabel} ${focused.latestAttentionLabel}`
                        : `같은 provider 문제 흐름 보기: ${focused.actionLabel} ${focused.latestAttentionLabel}`,
                      buttonText: focused.attentionFlowActive ? '현재 provider 문제 흐름' : '같은 provider 문제 흐름 보기',
                      disabled: focused.attentionFlowActive,
                      outcome: 'attention',
                      pressed: focused.attentionFlowActive,
                      provider: String(focused.latestAttentionAction.provider || focused.latestAction?.provider || '').trim(),
                      scope: String(focused.latestAttentionAction.scope || focused.latestAction?.scope || '').trim(),
                      value: String(focused.latestAttentionAction.id || '').trim(),
                    })}
                    ${renderReleaseLinkCopyButton({
                      action: 'copy-release-flow-link',
                      actionLabel: `provider 문제 흐름 링크 복사: ${focused.actionLabel} ${focused.latestAttentionLabel}`,
                      attributes: `data-ui-outcome="attention" data-ui-scope="${escapeHtml(String(focused.latestAttentionAction.scope || focused.latestAction?.scope || '').trim())}" data-ui-provider="${escapeHtml(String(focused.latestAttentionAction.provider || focused.latestAction?.provider || '').trim())}"`,
                      buttonText: 'provider 문제 흐름 링크 복사',
                      value: String(focused.latestAttentionAction.id || '').trim(),
                    })}
                  `
                : ''}
              ${renderReleaseClearActionButton({
                action: 'clear-release-provider-focus',
                actionLabel: `provider 포커스 해제: ${focused.actionLabel}`,
                buttonText: 'provider 포커스 해제',
              })}
              ${renderReleaseLinkCopyButton({
                action: 'copy-release-provider-link',
                actionLabel: `provider 링크 복사: ${focused.actionLabel}`,
                attributes: `data-ui-provider="${escapeHtml(focused.id)}"`,
                buttonText: 'provider 링크 복사',
                value: focused.id,
              })}
              ${renderReleaseLinkCopyButton({
                actionLabel: `현재 triage 링크 복사: ${focused.actionLabel}`,
                buttonText: '현재 triage 링크 복사',
                value: `focused-provider:${focused.id}`,
              })}
            </div>
          </div>
        `
      : ''}
    <div class="harness-callout release-provider-focus-callout">
      <strong>전체 provider preflight</strong>
      <p>OpenAI, Anthropic, local, Hermes live validation prerequisites를 한 번에 확인합니다. 현재 결과: ${escapeHtml(aggregate.label || 'not-run')}</p>
      <div class="release-history-filter-chips">
        <span class="mini-badge ${getReleaseStatusBadge(aggregate.result?.status || 'not-run')}">${escapeHtml(aggregate.result?.status || 'not-run')}</span>
        <span class="mini-badge status-running">${escapeHtml(aggregate.readyLabel || 'ready not tracked')}</span>
        <span class="mini-badge ${aggregate.result ? 'status-failed' : 'status-running'}">${escapeHtml(aggregate.missingEnvLabel || 'missing env not tracked')}</span>
        <span class="mini-badge ${aggregate.result?.blockedCount ? 'status-failed' : 'status-completed'}">${escapeHtml(aggregate.blockedLabel || 'blocked not tracked')}</span>
      </div>
      <div class="release-history-focus-actions">
        ${renderReleasePreflightAllButton({ actionLabel: `전체 preflight 실행: ${releaseActionLabel}` })}
        ${renderReleaseCommandCopyButton({
          actionLabel: `전체 preflight 명령 복사: ${releaseActionLabel}`,
          buttonText: '전체 preflight 명령 복사',
          command: 'npm run preflight:execution-v1:all',
          label: '전체 preflight 명령',
        })}
        ${renderReleaseProviderReadinessPackageCopyButton({
          actionLabel: `전체 readiness package 복사: ${releaseActionLabel}`,
          buttonText: '전체 readiness package 복사',
        })}
      </div>
    </div>
    <div class="release-provider-grid">
      ${entries.length
        ? entries.map((item) => `
            <article class="release-provider-card ${item.ready ? 'is-ready' : 'is-blocked'} ${item.isFocused ? 'is-highlighted' : ''}" data-release-provider="${escapeHtml(item.provider)}">
              <div><div class="item-title">${escapeHtml(item.label)}</div><div class="item-meta mono">${escapeHtml(item.envKey)}</div></div>
              <div class="release-provider-meta">
                <span class="mini-badge ${getReleaseStatusBadge(item.status)}">${escapeHtml(item.status)}</span>
                <span class="mini-badge ${getReleaseStatusBadge(item.preflightStatus)}">${escapeHtml(item.preflightStatus)}</span>
                <span class="mini-badge ${item.blockerActions.length ? 'status-failed' : 'status-completed'}" data-release-provider-blocker-count="${escapeHtml(item.provider)}">blockers ${escapeHtml(String(item.blockerActions.length))}</span>
                <span class="mini-badge ${item.closureSummary.productionReadyClaimAllowed ? 'status-completed' : 'status-failed'}" data-release-provider-closure-count="${escapeHtml(item.provider)}">closure ${escapeHtml(String(item.closureSummary.closureVerificationCount))}</span>
                <span class="mini-badge status-running" data-release-provider-required-proof-count="${escapeHtml(item.provider)}">proofs ${escapeHtml(String(item.closureSummary.requiredProofCount))}</span>
              </div>
              <div class="release-provider-meta">
                ${renderReleaseProviderActionButton({ action: 'run-release-preflight', actionLabel: `provider preflight 실행: ${item.actionLabel}`, buttonText: 'preflight 실행', provider: item.provider })}
                ${renderReleaseCommandCopyButton({ actionLabel: `provider preflight 명령 복사: ${item.actionLabel}`, buttonText: 'preflight 명령 복사', command: item.preflightCommand || `npm run preflight:execution-v1:${item.provider}`, label: `${item.label} preflight 명령` })}
                ${renderReleaseProviderActionButton({ action: 'refresh-release-status-live', actionLabel: item.liveButtonLabel, buttonText: item.ready ? (item.liveConfirmArmed ? 'live 검증 확인' : 'live 검증 실행') : 'env 필요', className: item.liveConfirmArmed ? 'primary-button' : 'ghost-button', disabled: !item.ready, pressed: item.liveConfirmArmed, provider: item.provider })}
                ${renderReleaseCommandCopyButton({ actionLabel: `provider live 명령 복사: ${item.actionLabel}`, buttonText: 'live 명령 복사', command: item.liveCommand, label: `${item.label} live 명령` })}
                ${renderReleaseProviderReadinessPackageCopyButton({ actionLabel: `provider package 복사: ${item.actionLabel}`, buttonText: 'provider package 복사', provider: item.provider })}
                ${item.topBlocker
                  ? `
                      ${renderReleaseBlockerFocusButton({ actionLabel: `provider blocker 보기: ${item.actionLabel}`, blocker: item.topBlockerId, buttonText: 'provider blocker 보기', pressed: item.topBlockerId === focusedBlockerId, provider: item.provider })}
                      ${renderReleaseBlockerPackageCopyButton({ actionLabel: `provider blocker package 복사: ${item.actionLabel}`, attributes: 'data-release-provider-blocker-package="true"', blockerId: item.topBlockerId, buttonText: 'blocker package 복사', provider: item.provider })}
                    `
                  : ''}
                ${renderReleaseProviderFocusActionButton({ action: item.isFocused ? 'clear-release-provider-focus' : 'focus-release-provider', actionLabel: item.focusButtonLabel, buttonText: item.isFocused ? 'provider 포커스 해제' : '이 provider 카드 보기', pressed: item.isFocused, provider: item.provider })}
                ${renderReleaseLinkCopyButton({ action: 'copy-release-provider-link', actionLabel: `provider 링크 복사: ${item.actionLabel}`, attributes: `data-ui-provider="${escapeHtml(item.provider)}"`, buttonText: 'provider 링크 복사', value: item.provider })}
                ${item.liveConfirmArmed
                  ? renderReleaseSimpleActionButton({ action: 'cancel-refresh-release-status-live', actionLabel: `provider live 검증 취소: ${item.actionLabel}`, buttonText: '현재 live 검증 취소' })
                  : ''}
              </div>
              <p class="item-meta">${escapeHtml(item.ready ? `준비됨 · ${item.command}` : `실행 전 ${item.envKey}가 필요합니다 · ${item.liveCommand}`)}</p>
              <p class="item-meta">${escapeHtml(item.preflightSummary)}</p>
              <p class="item-meta" data-release-provider-closure-summary="${escapeHtml(item.provider)}">${escapeHtml(`closure verifications ${item.closureSummary.closureVerificationCount} · required proofs ${item.closureSummary.requiredProofCount} · commands ${item.closureSummary.commandCount} · evidence docs ${item.closureSummary.evidenceDocCount} · target boundary ${item.closureSummary.targetBoundaryRequiredCount}`)}</p>
              ${item.topBlocker
                ? `<p class="item-meta" data-release-provider-blocker-summary="${escapeHtml(item.provider)}">linked blocker · ${escapeHtml(item.topBlockerId || 'unknown')} · ${escapeHtml(String(item.topBlocker.stopReason || item.topBlocker.blocker || '').trim())}</p>`
                : `<p class="item-meta" data-release-provider-blocker-summary="${escapeHtml(item.provider)}">linked blocker 없음</p>`}
              ${item.liveConfirmArmed && liveRefreshPreflight
                ? `
                    <div class="release-stale-note">
                      <div class="release-stale-line">${escapeHtml(liveRefreshPreflight.summary || 'live validation 확인이 준비되었습니다.')}</div>
                      ${(liveRefreshPreflight.notes || []).map((note) => `<div class="release-stale-line">${escapeHtml(note)}</div>`).join('')}
                    </div>
                  `
                : ''}
            </article>
          `).join('')
        : `
            <article class="release-provider-card is-blocked" data-release-provider-empty="true">
              <div class="item-title">provider readiness 정보가 없습니다.</div>
              <p class="item-meta">release status를 다시 읽어 provider readiness 근거를 확인하세요.</p>
            </article>
          `}
    </div>
  `;
}
