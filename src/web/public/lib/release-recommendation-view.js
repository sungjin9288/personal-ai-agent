import { escapeHtml, formatDate } from './html-format.js';
import {
  renderReleaseProviderFocusActionButton,
  renderReleaseRecommendationActionButton,
} from './render-fragments.js';
import { getReleaseStatusBadge } from './release-status-view.js';

function findRecommendationProvider(item, providerReadiness) {
  const actionProvider = String(item?.actionProvider || '').trim();
  const envKey = String(item?.envKey || '').trim();
  return providerReadiness.find((entry) => {
    const provider = String(entry?.provider || '').trim();
    const providerEnvKey = String(entry?.envKey || '').trim();
    return (actionProvider && provider === actionProvider) || (envKey && providerEnvKey === envKey);
  }) || null;
}

function matchesRecommendationHistory(item, historyItem, providerReadiness) {
  const action = String(item?.action || '').trim();
  const providerEntry = findRecommendationProvider(item, providerReadiness);
  const provider = String(item?.actionProvider || providerEntry?.provider || '').trim();
  const historyAction = String(historyItem?.action || '').trim();
  const historyScope = String(historyItem?.scope || '').trim();
  const historyProvider = String(historyItem?.provider || '').trim();

  if (action === 'regenerate-release-surface') {
    return historyScope === 'current-surface'
      && (historyAction === 'refresh' || historyAction === 'refresh-preflight');
  }
  if (action === 'archive-release-snapshot') {
    return historyScope === 'snapshot'
      && (historyAction === 'snapshot' || historyAction === 'snapshot-preflight');
  }
  if (action === 'run-release-preflight' && provider) {
    return historyAction === 'provider-preflight' && historyProvider === provider;
  }
  return Boolean(!action && provider && historyProvider === provider);
}

function getRecommendationCommand(item, providerEntry) {
  const action = String(item?.action || '').trim();
  const explicitCommand = String(item?.command || '').trim();
  const envKey = String(item?.envKey || '').trim();

  if (explicitCommand) {
    return {
      buttonLabel: action === 'run-release-preflight' ? 'preflight 명령 복사' : 'live 명령 복사',
      command: explicitCommand,
      label: item?.label ? `${item.label} 명령` : '권장 액션 명령',
    };
  }
  if (action === 'run-release-preflight' && providerEntry) {
    return {
      buttonLabel: 'preflight 명령 복사',
      command: String(providerEntry.preflightCommand || '').trim(),
      label: `${providerEntry.label} preflight 명령`,
    };
  }
  if (envKey && providerEntry) {
    return {
      buttonLabel: 'live 명령 복사',
      command: providerEntry.ready
        ? String(providerEntry.command || '').trim()
        : `export ${providerEntry.envKey}="..." && ${providerEntry.command}`,
      label: `${providerEntry.label} live 명령`,
    };
  }
  return null;
}

function getHistoryTargetLabel(action, getActionLabel, fallback) {
  if (!action) {
    return '';
  }
  return `${getActionLabel(action.action)} · ${action.provider || 'provider 미지정'} · ${action.id || action.scope || fallback}`;
}

export function createReleaseRecommendationViewModel({
  filters = {},
  focus = {},
  getActionLabel = () => 'release action',
  isAttentionOutcome = () => false,
  isFlowActive = () => ({ attentionFlowActive: false, sameFlowActive: false }),
  release = {},
} = {}) {
  const history = Array.isArray(release.releaseActionHistory) ? release.releaseActionHistory : [];
  const providerReadiness = Array.isArray(release.providerReadiness) ? release.providerReadiness : [];
  const recommendations = Array.isArray(release.recommendedActions) ? release.recommendedActions : [];
  const focusedHistoryId = String(focus.historyId || '').trim();
  const focusedProvider = String(focus.provider || '').trim();
  const historyFilterOutcome = String(filters.outcome || '').trim();
  const historyFilterProvider = String(filters.provider || '').trim();
  const historyFilterScope = String(filters.scope || '').trim();

  const items = recommendations.map((item) => {
    const matches = history.filter((historyItem) =>
      matchesRecommendationHistory(item, historyItem, providerReadiness),
    );
    const attentionMatches = matches.filter((historyItem) => isAttentionOutcome(historyItem?.outcome));
    const latestAction = matches[0] || null;
    const latestAttentionAction = attentionMatches[0] || null;
    const providerEntry = findRecommendationProvider(item, providerReadiness);
    const providerId = String(providerEntry?.provider || '').trim();
    const providerActionLabel = providerEntry?.label || providerId || 'provider';
    const sameProviderFocused = Boolean(providerId && providerId === focusedProvider);
    const flow = latestAction
      ? isFlowActive({ attentionAction: latestAttentionAction, latestAction }, {
          focusedHistoryId,
          historyFilterOutcome,
          historyFilterProvider,
          historyFilterScope,
        })
      : { attentionFlowActive: false, sameFlowActive: false };

    return {
      ...item,
      actionTargetLabel: item.label || item.action || providerActionLabel || '권장 액션',
      attentionCount: attentionMatches.length,
      attentionFlowActive: Boolean(flow.attentionFlowActive),
      command: getRecommendationCommand(item, providerEntry),
      latestAction,
      latestActionIsAttention: latestAction ? isAttentionOutcome(latestAction.outcome) : false,
      latestActionLabel: getHistoryTargetLabel(latestAction, getActionLabel, '최근 기록'),
      latestActionName: latestAction ? getActionLabel(latestAction.action) : '',
      latestAttentionAction,
      latestAttentionLabel: getHistoryTargetLabel(
        latestAttentionAction,
        getActionLabel,
        latestAction?.scope || '최근 문제',
      ),
      latestAttentionName: latestAttentionAction ? getActionLabel(latestAttentionAction.action) : '',
      matchCount: matches.length,
      providerActionLabel,
      providerFocusLabel: sameProviderFocused
        ? `현재 provider 카드: ${providerActionLabel}`
        : `provider 카드 보기: ${providerActionLabel}`,
      providerId,
      sameFlowActive: Boolean(flow.sameFlowActive),
      sameProviderFocused,
    };
  });

  return { focusedHistoryId, items };
}

function renderCommandButton(item, renderReleaseCommandCopyButton = () => '') {
  if (!item.command) {
    return '';
  }
  return renderReleaseCommandCopyButton({
    actionLabel: `${item.command.buttonLabel}: ${item.command.label}`,
    buttonText: item.command.buttonLabel,
    command: item.command.command,
    label: item.command.label,
  });
}

function renderProviderButtons(item, renderReleaseLinkCopyButton = () => '') {
  if (!item.providerId) {
    return '';
  }
  return `
    ${renderReleaseProviderFocusActionButton({
      actionLabel: item.providerFocusLabel,
      buttonText: item.sameProviderFocused ? '현재 provider 카드' : 'provider 카드 보기',
      disabled: item.sameProviderFocused,
      pressed: item.sameProviderFocused,
      provider: item.providerId,
    })}
    ${renderReleaseLinkCopyButton({
      action: 'copy-release-provider-link',
      actionLabel: `provider 링크 복사: ${item.providerActionLabel}`,
      attributes: `data-ui-provider="${escapeHtml(item.providerId)}"`,
      buttonText: 'provider 링크 복사',
      value: item.providerId,
    })}
  `;
}

function renderHistoryActions(item, view, copyButtons) {
  const {
    renderReleaseLinkCopyButton = () => '',
    renderReleaseProviderNavigationButton = () => '',
  } = copyButtons;
  const latestAction = item.latestAction;
  const attentionAction = item.latestAttentionAction;

  return `
    ${renderReleaseProviderNavigationButton({
      action: 'focus-release-history',
      actionLabel: `최근 기록 보기: ${item.latestActionLabel}`,
      buttonText: '최근 기록 보기',
      pressed: String(latestAction.id || '').trim() === view.focusedHistoryId,
      value: latestAction.id || '',
    })}
    ${renderReleaseLinkCopyButton({
      action: 'copy-release-history-link',
      actionLabel: `기록 링크 복사: ${item.latestActionLabel}`,
      buttonText: '기록 링크 복사',
      value: latestAction.id || '',
    })}
    ${attentionAction && attentionAction.id !== latestAction.id
      ? `
          ${renderReleaseProviderNavigationButton({
            action: 'focus-release-history',
            actionLabel: `최근 문제 보기: ${item.latestAttentionLabel}`,
            buttonText: '최근 문제 보기',
            pressed: String(attentionAction.id || '').trim() === view.focusedHistoryId,
            value: attentionAction.id || '',
          })}
          ${renderReleaseLinkCopyButton({
            action: 'copy-release-history-link',
            actionLabel: `문제 기록 링크 복사: ${item.latestAttentionLabel}`,
            buttonText: '문제 기록 링크 복사',
            value: attentionAction.id || '',
          })}
        `
      : ''}
    ${renderReleaseProviderNavigationButton({
      action: 'focus-release-flow',
      actionLabel: item.sameFlowActive ? `현재 flow: ${item.latestActionLabel}` : `같은 flow 보기: ${item.latestActionLabel}`,
      buttonText: item.sameFlowActive ? '현재 flow' : '같은 flow 보기',
      disabled: item.sameFlowActive ? true : null,
      outcome: item.latestActionIsAttention ? 'attention' : '',
      pressed: item.sameFlowActive,
      provider: String(latestAction.provider || '').trim(),
      scope: String(latestAction.scope || '').trim(),
      value: latestAction.id || '',
    })}
    ${renderReleaseLinkCopyButton({
      action: 'copy-release-flow-link',
      actionLabel: `flow 링크 복사: ${item.latestActionLabel}`,
      attributes: `data-ui-outcome="${escapeHtml(item.latestActionIsAttention ? 'attention' : '')}" data-ui-scope="${escapeHtml(String(latestAction.scope || '').trim())}" data-ui-provider="${escapeHtml(String(latestAction.provider || '').trim())}"`,
      buttonText: 'flow 링크 복사',
      value: latestAction.id || '',
    })}
    ${attentionAction
      ? `
          ${renderReleaseProviderNavigationButton({
            action: 'focus-release-flow',
            actionLabel: item.attentionFlowActive ? `현재 문제 흐름: ${item.latestAttentionLabel}` : `같은 문제 흐름 보기: ${item.latestAttentionLabel}`,
            buttonText: item.attentionFlowActive ? '현재 문제 흐름' : '같은 문제 흐름 보기',
            disabled: item.attentionFlowActive ? true : null,
            outcome: 'attention',
            pressed: item.attentionFlowActive,
            provider: String(attentionAction.provider || latestAction.provider || '').trim(),
            scope: String(attentionAction.scope || latestAction.scope || '').trim(),
            value: attentionAction.id || '',
          })}
          ${renderReleaseLinkCopyButton({
            action: 'copy-release-flow-link',
            actionLabel: `문제 흐름 링크 복사: ${item.latestAttentionLabel}`,
            attributes: `data-ui-outcome="attention" data-ui-scope="${escapeHtml(String(attentionAction.scope || latestAction.scope || '').trim())}" data-ui-provider="${escapeHtml(String(attentionAction.provider || latestAction.provider || '').trim())}"`,
            buttonText: '문제 흐름 링크 복사',
            value: attentionAction.id || '',
          })}
        `
      : ''}
  `;
}

function renderRecommendationActions(item, view, copyButtons) {
  const commandButton = renderCommandButton(item, copyButtons.renderReleaseCommandCopyButton);
  const providerButtons = renderProviderButtons(item, copyButtons.renderReleaseLinkCopyButton);

  if (item.latestAction) {
    return `${renderHistoryActions(item, view, copyButtons)}${commandButton}${providerButtons}`;
  }
  if (item.action) {
    return `
      ${renderReleaseRecommendationActionButton({
        action: item.action,
        actionLabel: `권장 액션 실행: ${item.actionTargetLabel}`,
        provider: item.actionProvider,
      })}
      ${commandButton}
      ${providerButtons}
    `;
  }
  if (item.envKey) {
    return `<span class="item-meta mono">${escapeHtml(item.envKey)}</span>${commandButton}${providerButtons}`;
  }
  return '';
}

export function renderReleaseRecommendations({ copyButtons = {}, view = {} } = {}) {
  const items = Array.isArray(view.items) ? view.items : [];
  return `
    <div class="release-recommendation-list">
      ${items.length
        ? items.map((item) => `
            <article class="release-recommendation-card release-recommendation-${escapeHtml(item.category || 'info')} ${item.sameFlowActive || item.attentionFlowActive ? 'is-active-flow' : ''} ${item.sameProviderFocused ? 'is-active-provider' : ''} ${item.attentionCount ? 'has-attention-flow' : ''}">
              <div>
                <div class="item-title">${escapeHtml(item.label || '권장 액션')}</div>
                <div class="item-meta">${escapeHtml(item.description || '')}</div>
                ${item.latestAction
                  ? `
                      <div class="item-meta">최근 시도 · ${escapeHtml(item.latestActionName)} · ${escapeHtml(item.latestAction.outcome || 'unknown')} · ${escapeHtml(formatDate(item.latestAction.createdAt))}</div>
                      <div class="item-meta">${escapeHtml(item.latestAction.summary || '최근 action summary가 없습니다.')}</div>
                      <div class="release-history-filter-chips">
                        <span class="mini-badge status-running">같은 flow ${escapeHtml(String(item.matchCount))}건</span>
                        ${item.attentionCount ? `<span class="mini-badge status-failed">문제 흐름 ${escapeHtml(String(item.attentionCount))}건</span>` : ''}
                      </div>
                      ${item.latestAttentionAction
                        ? `
                            <div class="item-meta">최근 문제 · ${escapeHtml(item.latestAttentionName)} · ${escapeHtml(formatDate(item.latestAttentionAction.createdAt))}</div>
                            <div class="item-meta">${escapeHtml(item.latestAttentionAction.summary || '최근 문제 summary가 없습니다.')}</div>
                          `
                        : ''}
                      ${item.sameFlowActive || item.attentionFlowActive
                        ? `
                            <div class="release-history-filter-chips">
                              ${item.sameFlowActive ? '<span class="mini-badge status-running">현재 flow 적용 중</span>' : ''}
                              ${item.attentionFlowActive ? '<span class="mini-badge status-failed">현재 문제 흐름 적용 중</span>' : ''}
                              ${item.sameProviderFocused ? '<span class="mini-badge status-running">현재 provider 적용 중</span>' : ''}
                            </div>
                          `
                        : ''}
                    `
                  : ''}
              </div>
              <div class="release-provider-meta">
                <span class="mini-badge ${getReleaseStatusBadge(item.category === 'required' ? 'blocked' : item.category === 'release' ? 'ready' : 'not-run')}">${escapeHtml(item.category || 'info')}</span>
                <div class="release-recommendation-actions">
                  ${renderRecommendationActions(item, view, copyButtons)}
                </div>
              </div>
            </article>
          `).join('')
        : `
            <article class="release-recommendation-card release-recommendation-release">
              <div>
                <div class="item-title">필수 다음 액션 없음</div>
                <div class="item-meta">verified baseline 기준 필수 closeout은 닫혀 있고, 남은 것은 optional provider expansion 또는 mutable current surface 운영뿐입니다.</div>
              </div>
            </article>
          `}
    </div>
  `;
}
