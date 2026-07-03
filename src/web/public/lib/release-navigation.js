import { state, elements } from './app-state.js';
import { writeUiStateToUrl } from './url-state.js';
import { normalizeReleaseProductionBlockerStateIndex } from './ui-params.js';
import {
  renderReleaseStatus,
  getReleaseCurrentOpenBlockerAction,
  getReleaseCurrentOpenBlockerActions,
  getFilteredReleaseCurrentOpenBlockerActions,
  getValidReleaseProductionBlockerIndex,
  isReleaseAttentionOutcome,
} from '../app.js';

export function focusReleaseHistoryEntry(historyId = '', { historyMode = 'replace', scroll = true } = {}) {
  const normalizedHistoryId = String(historyId || '').trim();
  if (!normalizedHistoryId) {
    return;
  }
  state.releaseFocusedHistoryId = normalizedHistoryId;
  state.releaseExpandedHistoryId = normalizedHistoryId;
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
  if (!scroll || !elements.releaseStatus) {
    return;
  }
  window.requestAnimationFrame(() => {
    const target = elements.releaseStatus.querySelector(`[data-release-history-id="${CSS.escape(normalizedHistoryId)}"]`);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });
}

export function focusReleaseBlocker(blockerId = '', { historyMode = 'replace', scroll = true } = {}) {
  const normalizedBlockerId = String(blockerId || '').trim();
  if (!normalizedBlockerId || !getReleaseCurrentOpenBlockerAction(normalizedBlockerId)) {
    return;
  }
  state.releaseFocusedBlockerId = normalizedBlockerId;
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
  if (!scroll || !elements.releaseStatus) {
    return;
  }
  window.requestAnimationFrame(() => {
    const target = elements.releaseStatus.querySelector(
      `[data-release-current-open-blocker-action-row="${CSS.escape(normalizedBlockerId)}"]`,
    );
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });
}

export function focusReleaseProductionBlocker(blockerIndex = '', { historyMode = 'replace', scroll = true } = {}) {
  const normalizedIndex = getValidReleaseProductionBlockerIndex(blockerIndex);
  if (normalizedIndex === '') {
    return;
  }
  state.releaseFocusedProductionBlockerIndex = normalizedIndex;
  if (Number(normalizedIndex) >= 8) {
    state.releaseProductionBlockersExpanded = true;
  }
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
  if (!scroll || !elements.releaseStatus) {
    return;
  }
  window.requestAnimationFrame(() => {
    const target = elements.releaseStatus.querySelector(
      `[data-release-production-blocker-row-index="${CSS.escape(normalizedIndex)}"]`,
    );
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });
}

export function setReleaseBlockerFilter({
  category = state.releaseBlockerCategoryFilter,
  includeShared = state.releaseBlockerIncludeSharedProviderOperations,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
  historyMode = 'replace',
} = {}) {
  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const actions = getReleaseCurrentOpenBlockerActions();
  const providerReadiness = state.releaseStatus?.providerReadiness || [];
  const categoryIsValid = !normalizedCategory || actions.some((item) => String(item.category || '').trim() === normalizedCategory);
  const ownerIsValid = !normalizedOwner || actions.some((item) => String(item.owner || '').trim() === normalizedOwner);
  const providerIsValid = !normalizedProvider || providerReadiness.some((item) => String(item.provider || '').trim() === normalizedProvider);

  state.releaseBlockerCategoryFilter = categoryIsValid ? normalizedCategory : '';
  state.releaseBlockerIncludeSharedProviderOperations = includeShared !== false;
  state.releaseBlockerOwnerFilter = ownerIsValid ? normalizedOwner : '';
  state.releaseBlockerProviderFilter = providerIsValid ? normalizedProvider : '';
  if (state.releaseBlockerProviderFilter) {
    state.releaseFocusedProvider = state.releaseBlockerProviderFilter;
  }

  if (
    state.releaseFocusedBlockerId
    && !getFilteredReleaseCurrentOpenBlockerActions().some(
      (item) => String(item.id || '').trim() === state.releaseFocusedBlockerId,
    )
  ) {
    state.releaseFocusedBlockerId = '';
  }

  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function toggleReleaseHistoryEntry(historyId = '') {
  const normalizedHistoryId = String(historyId || '').trim();
  if (!normalizedHistoryId) {
    return;
  }
  const nextExpandedId =
    state.releaseExpandedHistoryId === normalizedHistoryId ? '' : normalizedHistoryId;
  state.releaseExpandedHistoryId = nextExpandedId;
  if (nextExpandedId) {
    state.releaseFocusedHistoryId = normalizedHistoryId;
  }
  renderReleaseStatus();
}

export function clearReleaseHistoryFocus({ historyMode = 'replace' } = {}) {
  state.releaseFocusedHistoryId = '';
  state.releaseExpandedHistoryId = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function clearReleaseBlockerFocus({ historyMode = 'replace' } = {}) {
  state.releaseFocusedBlockerId = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function clearReleaseProductionBlockerFocus({ historyMode = 'replace' } = {}) {
  state.releaseFocusedProductionBlockerIndex = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function clearReleaseBlockerFilter({ historyMode = 'replace' } = {}) {
  state.releaseBlockerCategoryFilter = '';
  state.releaseBlockerIncludeSharedProviderOperations = true;
  state.releaseBlockerOwnerFilter = '';
  state.releaseBlockerProviderFilter = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function setReleaseHistoryFilter({
  outcome = state.releaseHistoryFilterOutcome,
  scope = state.releaseHistoryFilterScope,
  provider = state.releaseHistoryFilterProvider,
  historyMode = 'replace',
} = {}) {
  state.releaseHistoryFilterOutcome = String(outcome || '').trim();
  state.releaseHistoryFilterScope = String(scope || '').trim();
  state.releaseHistoryFilterProvider = String(provider || '').trim();
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function clearReleaseHistoryFilter({ historyMode = 'replace' } = {}) {
  state.releaseHistoryFilterOutcome = '';
  state.releaseHistoryFilterScope = '';
  state.releaseHistoryFilterProvider = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function applyReleaseHistoryUrlState({
  focusedHistoryId = '',
  outcome = '',
  provider = '',
  scope = '',
} = {}) {
  const history = state.releaseStatus?.releaseActionHistory || [];
  const normalizedFocusedHistoryId = String(focusedHistoryId || '').trim();
  const normalizedOutcome = String(outcome || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const normalizedScope = String(scope || '').trim();

  state.releaseFocusedHistoryId = history.some((item) => item.id === normalizedFocusedHistoryId)
    ? normalizedFocusedHistoryId
    : '';
  state.releaseExpandedHistoryId = state.releaseFocusedHistoryId;
  state.releaseHistoryFilterOutcome =
    normalizedOutcome === 'attention' && history.some((item) => isReleaseAttentionOutcome(item.outcome))
      ? 'attention'
      : '';
  state.releaseHistoryFilterScope = history.some((item) => String(item.scope || '').trim() === normalizedScope)
    ? normalizedScope
    : '';
  state.releaseHistoryFilterProvider = history.some((item) => String(item.provider || '').trim() === normalizedProvider)
    ? normalizedProvider
    : '';
  renderReleaseStatus();
}

export function applyReleaseBlockerUrlState(blockerId = '') {
  const normalizedBlockerId = String(blockerId || '').trim();
  const currentOpenBlockerActions = getFilteredReleaseCurrentOpenBlockerActions();
  state.releaseFocusedBlockerId = currentOpenBlockerActions.some(
    (item) => String(item.id || '').trim() === normalizedBlockerId,
  )
    ? normalizedBlockerId
    : '';
  renderReleaseStatus();
}

export function applyReleaseProductionBlockerUrlState(blockerIndex = '') {
  const normalizedIndex = state.releaseStatus
    ? getValidReleaseProductionBlockerIndex(blockerIndex)
    : normalizeReleaseProductionBlockerStateIndex(blockerIndex);
  state.releaseFocusedProductionBlockerIndex = normalizedIndex;
  if (normalizedIndex !== '' && Number(normalizedIndex) >= 8) {
    state.releaseProductionBlockersExpanded = true;
  }
  renderReleaseStatus();
}

export function applyReleaseBlockerFilterUrlState({
  category = '',
  includeShared = true,
  owner = '',
  provider = '',
} = {}) {
  const actions = getReleaseCurrentOpenBlockerActions();
  const providerReadiness = state.releaseStatus?.providerReadiness || [];
  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  state.releaseBlockerCategoryFilter = actions.some((item) => String(item.category || '').trim() === normalizedCategory)
    ? normalizedCategory
    : '';
  state.releaseBlockerIncludeSharedProviderOperations = includeShared !== false;
  state.releaseBlockerOwnerFilter = actions.some((item) => String(item.owner || '').trim() === normalizedOwner)
    ? normalizedOwner
    : '';
  state.releaseBlockerProviderFilter = providerReadiness.some((item) => String(item.provider || '').trim() === normalizedProvider)
    ? normalizedProvider
    : '';
  if (state.releaseBlockerProviderFilter && !state.releaseFocusedProvider) {
    state.releaseFocusedProvider = state.releaseBlockerProviderFilter;
  }
  renderReleaseStatus();
}

export function focusReleaseHistoryFlow({
  historyId = '',
  outcome = '',
  provider = '',
  scope = '',
  historyMode = 'replace',
} = {}) {
  const normalizedHistoryId = String(historyId || '').trim();
  const normalizedOutcome = String(outcome || '').trim();
  const normalizedScope = String(scope || '').trim();
  const normalizedProvider = String(provider || '').trim();

  if (!normalizedHistoryId && !normalizedOutcome && !normalizedScope && !normalizedProvider) {
    return;
  }

  state.releaseHistoryFilterOutcome = normalizedOutcome;
  state.releaseHistoryFilterScope = normalizedScope;
  state.releaseHistoryFilterProvider = normalizedProvider;
  if (normalizedHistoryId) {
    focusReleaseHistoryEntry(normalizedHistoryId, { historyMode });
    return;
  }
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function focusReleaseProvider(provider = '', { historyMode = 'replace', scroll = true } = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    return;
  }
  state.releaseFocusedProvider = normalizedProvider;
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
  if (!scroll || !elements.releaseStatus) {
    return;
  }
  window.requestAnimationFrame(() => {
    const target = elements.releaseStatus.querySelector(`[data-release-provider="${CSS.escape(normalizedProvider)}"]`);
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  });
}

export function clearReleaseProviderFocus({ historyMode = 'replace' } = {}) {
  state.releaseFocusedProvider = '';
  renderReleaseStatus();
  writeUiStateToUrl({ historyMode });
}

export function applyReleaseProviderUrlState(provider = '') {
  const normalizedProvider = String(provider || '').trim();
  const providerReadiness = state.releaseStatus?.providerReadiness || [];
  if (!normalizedProvider) {
    const normalizedFilterProvider = String(state.releaseBlockerProviderFilter || '').trim();
    state.releaseFocusedProvider = providerReadiness.some(
      (item) => String(item.provider || '').trim() === normalizedFilterProvider,
    )
      ? normalizedFilterProvider
      : '';
  } else {
    state.releaseFocusedProvider = providerReadiness.some((item) => String(item.provider || '').trim() === normalizedProvider)
      ? normalizedProvider
      : '';
  }
  renderReleaseStatus();
}
