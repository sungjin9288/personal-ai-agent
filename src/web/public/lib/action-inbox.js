import { escapeHtml } from './html-format.js';
import { summarizeActionInboxGuidance } from './action-inbox-guidance.js';
import {
  renderActionInboxEmptyList,
  renderActionInboxFallbackStopFilterSelect,
  renderActionInboxList,
  renderActionInboxSummaryChip,
  renderActionInboxUnavailableState,
} from './render-fragments.js';
import { getLearningPromotionCandidateId } from './text-format.js';
import { getSanitizedMissionActionsFilter, normalizeUiParam } from './ui-params.js';

export function getMissionActionsFilterLabel(filter = 'all') {
  if (filter === 'needs-reminder') {
    return '재알림 필요';
  }
  if (filter === 'overdue') {
    return '기한 초과';
  }
  return '전체';
}

export function applyMissionActionsFilterUrlState(
  state,
  { actionInboxFilter = 'all', actionInboxFallbackStopReason = '' } = {},
) {
  state.missionActionsFilter = getSanitizedMissionActionsFilter(actionInboxFilter);
  state.missionActionsFallbackStopReasonFilter = normalizeUiParam(actionInboxFallbackStopReason);
}

export function getMissionActionsVisibleFilterLabel(state) {
  const filter = state.missionActionsFilter || 'all';
  const filterLabel = getMissionActionsFilterLabel(filter);
  const fallbackStopReasonFilter = String(state.missionActionsFallbackStopReasonFilter || '').trim();
  if (!fallbackStopReasonFilter) {
    return filterLabel;
  }

  const fallbackStopLabel = `fallback stop ${fallbackStopReasonFilter}`;
  return filter === 'all' ? fallbackStopLabel : `${filterLabel} · ${fallbackStopLabel}`;
}

export function hasActiveMissionActionsFilter(state) {
  return (
    (state.missionActionsFilter || 'all') !== 'all' ||
    Boolean(String(state.missionActionsFallbackStopReasonFilter || '').trim())
  );
}

export function getMissionActionsFallbackStopReasonCounts(payload = null) {
  return (payload?.items || []).reduce((counts, item) => {
    Object.entries(item.providerFallbackStopReasonCounts || {}).forEach(([reason, count]) => {
      const normalizedReason = String(reason || '').trim();
      if (normalizedReason) {
        counts[normalizedReason] = (counts[normalizedReason] || 0) + Number(count || 0);
      }
    });
    return counts;
  }, {});
}

export function buildMissionActionsUrl(
  state,
  missionId,
  { filter = 'all', includeFallbackStopReason = true } = {},
) {
  const params = new URLSearchParams({
    missionId: String(missionId || ''),
    promotionStatus: 'operator-active',
  });

  if (filter === 'needs-reminder') {
    params.set('needsReminderOnly', 'true');
  }
  if (filter === 'overdue') {
    params.set('overdueOnly', 'true');
  }

  const fallbackStopReason = includeFallbackStopReason
    ? String(state.missionActionsFallbackStopReasonFilter || '').trim()
    : '';
  if (fallbackStopReason) {
    params.set('providerFallbackStopReason', fallbackStopReason);
  }

  return `/api/actions?${params.toString()}`;
}

export async function loadMissionActions({ api, missionId, state }) {
  const selectedMissionId = missionId === undefined ? state.selectedMissionId : missionId;
  if (!selectedMissionId) {
    state.missionActions = null;
    state.missionActionsView = null;
    return null;
  }

  const filter = state.missionActionsFilter || 'all';
  const fallbackStopReason = String(state.missionActionsFallbackStopReasonFilter || '').trim();
  const fullPayloadPromise = api(
    buildMissionActionsUrl(state, selectedMissionId, {
      filter: 'all',
      includeFallbackStopReason: false,
    }),
  );
  const viewPayloadPromise =
    filter === 'all' && !fallbackStopReason
      ? Promise.resolve(null)
      : api(buildMissionActionsUrl(state, selectedMissionId, { filter }));
  const [fullPayload, viewPayload] = await Promise.all([fullPayloadPromise, viewPayloadPromise]);

  state.missionActions = fullPayload;
  state.missionActionsView = viewPayload;
  return { fullPayload, viewPayload };
}

export function getVisibleMissionActionsPayload(state) {
  return state.missionActionsView || state.missionActions;
}

function renderMissionActionsFilterButton(state, filter, label, count) {
  const active = (state.missionActionsFilter || 'all') === filter;
  const countLabel = String(count ?? 0);
  const filterButtonTitle = `${label} action 필터, ${countLabel}건, ${active ? '선택됨' : '선택 안 됨'}`;
  return `<button class="${active ? 'primary-button' : 'ghost-button'}" type="button" data-action-inbox-filter="${escapeHtml(filter)}" aria-label="${escapeHtml(filterButtonTitle)}" aria-pressed="${active ? 'true' : 'false'}" title="${escapeHtml(filterButtonTitle)}">${escapeHtml(label)} ${escapeHtml(countLabel)}</button>`;
}

function renderActionInboxCopyLinkButton({
  buttonText = '현재 action 링크 복사',
  className = 'ghost-button',
  hasSelectedMission = false,
} = {}) {
  const copyLinkTitle = hasSelectedMission
    ? '현재 action inbox 링크 복사'
    : '선택된 mission이 없어 action inbox 링크를 복사할 수 없습니다';
  return `<button class="${escapeHtml(className)}" type="button" data-action-inbox-copy-link="true" aria-disabled="${hasSelectedMission ? 'false' : 'true'}" aria-label="${escapeHtml(copyLinkTitle)}" title="${escapeHtml(copyLinkTitle)}" ${hasSelectedMission ? '' : 'disabled'}>${escapeHtml(buttonText)}</button>`;
}

function renderActionInboxFallbackStopResetButton({
  buttonText = 'stop 필터 초기화',
  className = 'ghost-button',
  hasFallbackStopReason = false,
} = {}) {
  const resetTitle = hasFallbackStopReason
    ? 'fallback stop 필터 초기화'
    : '초기화할 fallback stop 필터가 없습니다';
  return `<button class="${escapeHtml(className)}" type="button" data-action-inbox-fallback-stop-reset="true" aria-disabled="${hasFallbackStopReason ? 'false' : 'true'}" aria-label="${escapeHtml(resetTitle)}" title="${escapeHtml(resetTitle)}" ${hasFallbackStopReason ? '' : 'disabled'}>${escapeHtml(buttonText)}</button>`;
}

function renderActionInboxClearFiltersButton({
  buttonText = '필터 전체 초기화',
  className = 'ghost-button',
  hasActiveFilter = false,
} = {}) {
  const clearFiltersTitle = hasActiveFilter
    ? 'action inbox 필터 전체 초기화'
    : '초기화할 action inbox 필터가 없습니다';
  return `<button class="${escapeHtml(className)}" type="button" data-action-inbox-clear-filters="true" aria-disabled="${hasActiveFilter ? 'false' : 'true'}" aria-label="${escapeHtml(clearFiltersTitle)}" title="${escapeHtml(clearFiltersTitle)}" ${hasActiveFilter ? '' : 'disabled'}>${escapeHtml(buttonText)}</button>`;
}

function renderMissionActionsFallbackStopReasonOptions(state) {
  const counts = getMissionActionsFallbackStopReasonCounts(state.missionActions);
  const activeReason = String(state.missionActionsFallbackStopReasonFilter || '').trim();
  if (activeReason && counts[activeReason] === undefined) {
    counts[activeReason] = 0;
  }

  return Object.entries(counts)
    .sort(([leftReason, leftCount], [rightReason, rightCount]) =>
      Number(rightCount || 0) - Number(leftCount || 0) || leftReason.localeCompare(rightReason),
    )
    .map(
      ([reason, count]) =>
        `<option value="${escapeHtml(reason)}">${escapeHtml(reason)} (${escapeHtml(String(count))})</option>`,
    )
    .join('');
}

function renderActionInboxSummary({
  fallbackStopReasonFilter = '',
  fallbackStopReasonOptions = '',
  fallbackStopReasonPlaceholder = 'fallback stop 없음',
  fullSummary = {},
  guidanceSummary = {},
  hasActiveFilter = false,
  hasFallbackStopReasonOptions = false,
  hasSelectedMission = false,
  state,
  summary = {},
} = {}) {
  return `
    ${renderActionInboxSummaryChip('전체 작업', fullSummary.pendingActionCount)}
    ${renderActionInboxSummaryChip('표시 작업', summary.pendingActionCount)}
    ${renderActionInboxSummaryChip('재알림 필요', fullSummary.reminderCounts?.needsReminder)}
    ${renderActionInboxSummaryChip('기한 초과', fullSummary.overdueCounts?.overdue)}
    ${renderActionInboxSummaryChip('즉시 실행', guidanceSummary.operatorRemediation)}
    ${renderActionInboxSummaryChip('외부 승인·인계', guidanceSummary.externalHandoff)}
    ${renderActionInboxSummaryChip('검토 필요', guidanceSummary.operatorReview)}
    ${renderActionInboxSummaryChip('fallback stop', fallbackStopReasonFilter || 'all')}
    <div class="action-row action-filter-row">
      ${renderMissionActionsFilterButton(state, 'all', '전체', fullSummary.pendingActionCount)}
      ${renderMissionActionsFilterButton(state, 'needs-reminder', '재알림 필요', fullSummary.reminderCounts?.needsReminder)}
      ${renderMissionActionsFilterButton(state, 'overdue', '기한 초과', fullSummary.overdueCounts?.overdue)}
      ${renderActionInboxFallbackStopFilterSelect({
        hasFallbackStopReasonOptions,
        options: fallbackStopReasonOptions,
        placeholder: fallbackStopReasonPlaceholder,
      })}
      ${renderActionInboxFallbackStopResetButton({ hasFallbackStopReason: Boolean(fallbackStopReasonFilter) })}
      ${renderActionInboxClearFiltersButton({ hasActiveFilter })}
      ${renderActionInboxCopyLinkButton({ hasSelectedMission })}
    </div>
  `;
}

export function wireMissionActionsFilterControls({
  container,
  copyViewLink,
  loadActions,
  render,
  state,
  syncUrl,
}) {
  container.querySelectorAll('[data-action-inbox-filter]').forEach((button) => {
    button.addEventListener('click', async () => {
      const nextFilter = button.dataset.actionInboxFilter || 'all';
      if (state.missionActionsFilter === nextFilter) {
        return;
      }
      state.missionActionsFilter = nextFilter;
      await loadActions(state.selectedMissionId);
      render();
      syncUrl();
    });
  });

  container.querySelector('[data-action-inbox-fallback-stop-filter]')?.addEventListener('change', async (event) => {
    const nextFilter = String(event.target.value || '').trim();
    if (state.missionActionsFallbackStopReasonFilter === nextFilter) {
      return;
    }
    state.missionActionsFallbackStopReasonFilter = nextFilter;
    await loadActions(state.selectedMissionId);
    render();
    syncUrl();
  });

  container.querySelector('[data-action-inbox-fallback-stop-reset]')?.addEventListener('click', async () => {
    if (!state.missionActionsFallbackStopReasonFilter) {
      return;
    }
    state.missionActionsFallbackStopReasonFilter = '';
    await loadActions(state.selectedMissionId);
    render();
    syncUrl();
  });

  container.querySelector('[data-action-inbox-clear-filters]')?.addEventListener('click', async () => {
    if (!hasActiveMissionActionsFilter(state)) {
      return;
    }
    state.missionActionsFilter = 'all';
    state.missionActionsFallbackStopReasonFilter = '';
    await loadActions(state.selectedMissionId);
    render();
    syncUrl();
  });

  container.querySelector('[data-action-inbox-copy-link]')?.addEventListener('click', () => {
    void copyViewLink();
  });
}

function findActionItem(items, actionId) {
  return items.find((item) => item.actionId === actionId) || null;
}

function findLearningPromotionItem(items, candidateId) {
  return items.find((item) => getLearningPromotionCandidateId(item) === candidateId) || null;
}

export function wireActionInboxActions({
  container,
  items = [],
  onLearningPromotionAuditCopy,
  onLearningPromotionExpire,
  onLearningPromotionRemind,
  onLearningPromotionResolve,
  onLearningPromotionRollback,
  onOpenMission,
  onProviderAttentionRemediate,
  onRerun,
  onReviewerFollowUpResolve,
  onSpecialistFollowUpRemediate,
}) {
  container.querySelectorAll('[data-action-open]').forEach((button) => {
    button.addEventListener('click', () => onOpenMission(button.dataset.actionOpen));
  });

  container.querySelectorAll('[data-action-rerun]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findActionItem(items, button.dataset.actionRerun);
      if (item?.missionId) {
        return onRerun(item);
      }
    });
  });

  container.querySelectorAll('[data-provider-attention-remediate]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findActionItem(items, button.dataset.providerAttentionRemediate);
      if (item) {
        return onProviderAttentionRemediate(item, button.dataset.providerAttentionMode || 'primary');
      }
    });
  });

  container.querySelectorAll('[data-specialist-follow-up-remediate]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findActionItem(items, button.dataset.specialistFollowUpRemediate);
      if (item) {
        return onSpecialistFollowUpRemediate(item);
      }
    });
  });

  container.querySelectorAll('[data-learning-promotion-resolve]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findLearningPromotionItem(items, button.dataset.learningPromotionResolve);
      if (item) {
        return onLearningPromotionResolve(item, button.dataset.learningPromotionDecision || 'approve');
      }
    });
  });

  container.querySelectorAll('[data-learning-promotion-audit-copy]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findLearningPromotionItem(items, button.dataset.learningPromotionAuditCopy);
      return onLearningPromotionAuditCopy(item);
    });
  });

  container.querySelectorAll('[data-learning-promotion-expire]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findLearningPromotionItem(items, button.dataset.learningPromotionExpire);
      if (item) {
        return onLearningPromotionExpire(item);
      }
    });
  });

  container.querySelectorAll('[data-learning-promotion-rollback]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findLearningPromotionItem(items, button.dataset.learningPromotionRollback);
      if (item) {
        return onLearningPromotionRollback(item);
      }
    });
  });

  container.querySelectorAll('[data-learning-promotion-remind]').forEach((button) => {
    button.addEventListener('click', () => {
      const item = findLearningPromotionItem(items, button.dataset.learningPromotionRemind);
      if (item) {
        return onLearningPromotionRemind(item);
      }
    });
  });

  container.querySelectorAll('[data-action-resolve]').forEach((button) => {
    button.addEventListener('click', () => onReviewerFollowUpResolve(button.dataset.actionResolve));
  });
}

export function renderMissionActions({
  actionList,
  actionSummary,
  copyViewLink,
  loadActions,
  onLearningPromotionAuditCopy,
  onLearningPromotionExpire,
  onLearningPromotionRemind,
  onLearningPromotionResolve,
  onLearningPromotionRollback,
  onOpenMission,
  onProviderAttentionRemediate,
  onRerun,
  onReviewerFollowUpResolve,
  onSpecialistFollowUpRemediate,
  rerender,
  state,
  syncUrl,
  wireQuickActions,
}) {
  if (!state.missionActions) {
    const unavailableState = renderActionInboxUnavailableState();
    actionSummary.innerHTML = unavailableState.summaryHtml;
    actionList.innerHTML = unavailableState.listHtml;
    wireQuickActions(actionList);
    return;
  }

  const visibleActions = getVisibleMissionActionsPayload(state) || state.missionActions;
  const summary = visibleActions.summary || {};
  const fullSummary = state.missionActions.summary || summary;
  const guidanceSummary = summarizeActionInboxGuidance(state.missionActions.items || []);
  const fallbackStopReasonFilter = String(state.missionActionsFallbackStopReasonFilter || '').trim();
  const fallbackStopReasonOptions = renderMissionActionsFallbackStopReasonOptions(state);
  const hasFallbackStopReasonOptions = Boolean(fallbackStopReasonOptions.trim());
  const fallbackStopReasonPlaceholder = hasFallbackStopReasonOptions ? 'fallback stop 전체' : 'fallback stop 없음';
  const hasActiveFilter = hasActiveMissionActionsFilter(state);
  const hasSelectedMission = Boolean(state.selectedMissionId);

  actionSummary.innerHTML = renderActionInboxSummary({
    fallbackStopReasonFilter,
    fallbackStopReasonOptions,
    fallbackStopReasonPlaceholder,
    fullSummary,
    guidanceSummary,
    hasActiveFilter,
    hasFallbackStopReasonOptions,
    hasSelectedMission,
    state,
    summary,
  });

  const fallbackStopSelect = actionSummary.querySelector('[data-action-inbox-fallback-stop-filter]');
  if (fallbackStopSelect) {
    fallbackStopSelect.value = fallbackStopReasonFilter;
  }
  wireMissionActionsFilterControls({
    container: actionSummary,
    copyViewLink,
    loadActions,
    render: rerender,
    state,
    syncUrl,
  });

  const items = visibleActions.items || [];
  const visibleFilterLabel = getMissionActionsVisibleFilterLabel(state);
  if (!items.length) {
    actionList.innerHTML = renderActionInboxEmptyList({ hasActiveFilter, visibleFilterLabel });
    return;
  }

  actionList.innerHTML = renderActionInboxList({ hasActiveFilter, items, visibleFilterLabel });
  wireActionInboxActions({
    container: actionList,
    items,
    onLearningPromotionAuditCopy,
    onLearningPromotionExpire,
    onLearningPromotionRemind,
    onLearningPromotionResolve,
    onLearningPromotionRollback,
    onOpenMission,
    onProviderAttentionRemediate,
    onRerun,
    onReviewerFollowUpResolve,
    onSpecialistFollowUpRemediate,
  });
}
