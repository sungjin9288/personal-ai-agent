// URL-state layer extracted from app.js.
// Serializes UI state into the query string, restores it on load, and
// writes it back on navigation. Keeps its exclusive param constants local
// (STEP_IDS/DETAIL_TAB_IDS) and re-imports a small surface from app.js
// (module cycles with function declarations are safe in browsers).
import { state } from './app-state.js';
import {
  normalizeUiParam,
  normalizeReleaseProductionBlockerStateIndex,
  normalizeReleaseProductionBlockerQueryIndex,
  getReleaseProductionBlockerOrdinal,
  getSanitizedReleaseHistoryOutcome,
  getSanitizedRetrievalSourceType,
  getSanitizedMissionActionsFilter,
} from './ui-params.js';
import { STEP_META, getSelectedWorkspaceId } from '../app.js';

const DETAIL_TAB_IDS = new Set(['artifacts', 'runs', 'reviews', 'config', 'harness', 'release']);
const STEP_IDS = new Set(Object.keys(STEP_META));

export function getSanitizedStepId(stepId) {
  const normalized = normalizeUiParam(stepId);
  return normalized && STEP_IDS.has(normalized) ? normalized : null;
}

export function getSanitizedDetailTab(tabId) {
  const normalized = normalizeUiParam(tabId);
  return normalized && DETAIL_TAB_IDS.has(normalized) ? normalized : null;
}

export function parseUiStateFromUrl() {
  const params = new URL(window.location.href).searchParams;
  return {
    actionInboxFilter: getSanitizedMissionActionsFilter(params.get('afilter')),
    actionInboxFallbackStopReason: normalizeUiParam(params.get('afstop')),
    artifactId: normalizeUiParam(params.get('artifact')),
    releaseHandoffPreviewId: normalizeUiParam(params.get('rartifact')),
    retrievalSourceLabel: normalizeUiParam(params.get('hsource')),
    retrievalSourceType: getSanitizedRetrievalSourceType(params.get('hstype')),
    detailTab: getSanitizedDetailTab(params.get('tab')),
    missionId: normalizeUiParam(params.get('mission')),
    releaseBlockerCategoryFilter: normalizeUiParam(params.get('rbcategory')),
    releaseBlockerIncludeSharedProviderOperations: params.get('rbshared') !== 'false',
    releaseBlockerOwnerFilter: normalizeUiParam(params.get('rbowner')),
    releaseBlockerProviderFilter: normalizeUiParam(params.get('rbprovider')),
    releaseFocusedBlockerId: normalizeUiParam(params.get('rblocker')),
    releaseFocusedProductionBlockerIndex: normalizeReleaseProductionBlockerQueryIndex(params.get('rpblocker')),
    releaseFocusedProvider: normalizeUiParam(params.get('rcard')),
    releaseFocusedHistoryId: normalizeUiParam(params.get('rhistory')),
    releaseHistoryOutcome: getSanitizedReleaseHistoryOutcome(params.get('routcome')),
    releaseHistoryProvider: normalizeUiParam(params.get('rprovider')),
    releaseHistoryScope: normalizeUiParam(params.get('rscope')),
    sessionId: normalizeUiParam(params.get('session')),
    stepId: getSanitizedStepId(params.get('step')),
    workspaceId: normalizeUiParam(params.get('workspace')),
  };
}

export function buildUiStateUrl(overrides = {}) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const workspaceId =
    overrides.workspaceId !== undefined
      ? normalizeUiParam(overrides.workspaceId)
      : getSelectedWorkspaceId();
  const missionId =
    overrides.missionId !== undefined
      ? normalizeUiParam(overrides.missionId)
      : normalizeUiParam(state.selectedMissionId);
  const stepId =
    overrides.stepId !== undefined
      ? getSanitizedStepId(overrides.stepId)
      : getSanitizedStepId(state.activeStep);
  const detailTab =
    overrides.detailTab !== undefined
      ? getSanitizedDetailTab(overrides.detailTab)
      : getSanitizedDetailTab(state.activeDetailTab);
  const sessionId =
    overrides.sessionId !== undefined
      ? normalizeUiParam(overrides.sessionId)
      : normalizeUiParam(state.selectedSessionId);
  const artifactId =
    overrides.artifactId !== undefined
      ? normalizeUiParam(overrides.artifactId)
      : normalizeUiParam(state.selectedArtifactId);
  const actionInboxFilter =
    overrides.actionInboxFilter !== undefined
      ? getSanitizedMissionActionsFilter(overrides.actionInboxFilter)
      : getSanitizedMissionActionsFilter(state.missionActionsFilter);
  const actionInboxFallbackStopReason =
    overrides.actionInboxFallbackStopReason !== undefined
      ? normalizeUiParam(overrides.actionInboxFallbackStopReason)
      : normalizeUiParam(state.missionActionsFallbackStopReasonFilter);
  const releaseFocusedProvider =
    overrides.releaseFocusedProvider !== undefined
      ? normalizeUiParam(overrides.releaseFocusedProvider)
      : normalizeUiParam(state.releaseFocusedProvider);
  const releaseFocusedBlockerId =
    overrides.releaseFocusedBlockerId !== undefined
      ? normalizeUiParam(overrides.releaseFocusedBlockerId)
      : normalizeUiParam(state.releaseFocusedBlockerId);
  const releaseFocusedProductionBlockerIndex =
    overrides.releaseFocusedProductionBlockerIndex !== undefined
      ? normalizeReleaseProductionBlockerStateIndex(overrides.releaseFocusedProductionBlockerIndex)
      : normalizeReleaseProductionBlockerStateIndex(state.releaseFocusedProductionBlockerIndex);
  const releaseBlockerCategoryFilter =
    overrides.releaseBlockerCategoryFilter !== undefined
      ? normalizeUiParam(overrides.releaseBlockerCategoryFilter)
      : normalizeUiParam(state.releaseBlockerCategoryFilter);
  const releaseBlockerIncludeSharedProviderOperations =
    overrides.releaseBlockerIncludeSharedProviderOperations !== undefined
      ? overrides.releaseBlockerIncludeSharedProviderOperations !== false
      : state.releaseBlockerIncludeSharedProviderOperations !== false;
  const releaseBlockerOwnerFilter =
    overrides.releaseBlockerOwnerFilter !== undefined
      ? normalizeUiParam(overrides.releaseBlockerOwnerFilter)
      : normalizeUiParam(state.releaseBlockerOwnerFilter);
  const releaseBlockerProviderFilter =
    overrides.releaseBlockerProviderFilter !== undefined
      ? normalizeUiParam(overrides.releaseBlockerProviderFilter)
      : normalizeUiParam(state.releaseBlockerProviderFilter);
  const releaseFocusedHistoryId =
    overrides.releaseFocusedHistoryId !== undefined
      ? normalizeUiParam(overrides.releaseFocusedHistoryId)
      : normalizeUiParam(state.releaseFocusedHistoryId);
  const releaseHandoffPreviewId =
    overrides.releaseHandoffPreviewId !== undefined
      ? normalizeUiParam(overrides.releaseHandoffPreviewId)
      : normalizeUiParam(state.releaseHandoffPreviewId);
  const releaseHistoryOutcome =
    overrides.releaseHistoryOutcome !== undefined
      ? getSanitizedReleaseHistoryOutcome(overrides.releaseHistoryOutcome)
      : getSanitizedReleaseHistoryOutcome(state.releaseHistoryFilterOutcome);
  const releaseHistoryProvider =
    overrides.releaseHistoryProvider !== undefined
      ? normalizeUiParam(overrides.releaseHistoryProvider)
      : normalizeUiParam(state.releaseHistoryFilterProvider);
  const releaseHistoryScope =
    overrides.releaseHistoryScope !== undefined
      ? normalizeUiParam(overrides.releaseHistoryScope)
      : normalizeUiParam(state.releaseHistoryFilterScope);
  const retrievalSourceType =
    overrides.retrievalSourceType !== undefined
      ? getSanitizedRetrievalSourceType(overrides.retrievalSourceType)
      : getSanitizedRetrievalSourceType(state.retrievalSourceFocusType);
  const retrievalSourceLabel =
    overrides.retrievalSourceLabel !== undefined
      ? normalizeUiParam(overrides.retrievalSourceLabel)
      : normalizeUiParam(state.retrievalSourceFocusLabel);

  if (workspaceId) {
    params.set('workspace', workspaceId);
  } else {
    params.delete('workspace');
  }

  if (missionId) {
    params.set('mission', missionId);
    if (stepId) {
      params.set('step', stepId);
    } else {
      params.delete('step');
    }
    if (detailTab) {
      params.set('tab', detailTab);
    } else {
      params.delete('tab');
    }
    if (sessionId) {
      params.set('session', sessionId);
    } else {
      params.delete('session');
    }
    if (artifactId) {
      params.set('artifact', artifactId);
    } else {
      params.delete('artifact');
    }
    if (retrievalSourceType && retrievalSourceLabel) {
      params.set('hstype', retrievalSourceType);
      params.set('hsource', retrievalSourceLabel);
    } else {
      params.delete('hstype');
      params.delete('hsource');
    }
    if (actionInboxFilter && actionInboxFilter !== 'all') {
      params.set('afilter', actionInboxFilter);
    } else {
      params.delete('afilter');
    }
    if (actionInboxFallbackStopReason) {
      params.set('afstop', actionInboxFallbackStopReason);
    } else {
      params.delete('afstop');
    }
  } else {
    params.delete('mission');
    params.delete('session');
    params.delete('artifact');
    params.delete('hstype');
    params.delete('hsource');
    params.delete('afilter');
    params.delete('afstop');

    if (stepId && stepId !== 'step-setup') {
      params.set('step', stepId);
    } else {
      params.delete('step');
    }

    if (detailTab && detailTab !== 'config') {
      params.set('tab', detailTab);
    } else {
      params.delete('tab');
    }
  }

  if (detailTab === 'release') {
    if (releaseBlockerCategoryFilter) {
      params.set('rbcategory', releaseBlockerCategoryFilter);
    } else {
      params.delete('rbcategory');
    }
    if (releaseBlockerIncludeSharedProviderOperations === false) {
      params.set('rbshared', 'false');
    } else {
      params.delete('rbshared');
    }
    if (releaseBlockerOwnerFilter) {
      params.set('rbowner', releaseBlockerOwnerFilter);
    } else {
      params.delete('rbowner');
    }
    if (releaseBlockerProviderFilter) {
      params.set('rbprovider', releaseBlockerProviderFilter);
    } else {
      params.delete('rbprovider');
    }
    if (releaseFocusedBlockerId) {
      params.set('rblocker', releaseFocusedBlockerId);
    } else {
      params.delete('rblocker');
    }
    const releaseFocusedProductionBlockerOrdinal = getReleaseProductionBlockerOrdinal(
      releaseFocusedProductionBlockerIndex,
    );
    if (releaseFocusedProductionBlockerOrdinal) {
      params.set('rpblocker', releaseFocusedProductionBlockerOrdinal);
    } else {
      params.delete('rpblocker');
    }
    if (releaseFocusedProvider) {
      params.set('rcard', releaseFocusedProvider);
    } else {
      params.delete('rcard');
    }
    if (releaseFocusedHistoryId) {
      params.set('rhistory', releaseFocusedHistoryId);
    } else {
      params.delete('rhistory');
    }
    if (releaseHandoffPreviewId) {
      params.set('rartifact', releaseHandoffPreviewId);
    } else {
      params.delete('rartifact');
    }
    if (releaseHistoryOutcome) {
      params.set('routcome', releaseHistoryOutcome);
    } else {
      params.delete('routcome');
    }
    if (releaseHistoryProvider) {
      params.set('rprovider', releaseHistoryProvider);
    } else {
      params.delete('rprovider');
    }
    if (releaseHistoryScope) {
      params.set('rscope', releaseHistoryScope);
    } else {
      params.delete('rscope');
    }
  } else {
    params.delete('rblocker');
    params.delete('rpblocker');
    params.delete('rbcategory');
    params.delete('rbshared');
    params.delete('rbowner');
    params.delete('rbprovider');
    params.delete('rcard');
    params.delete('rhistory');
    params.delete('rartifact');
    params.delete('routcome');
    params.delete('rprovider');
    params.delete('rscope');
  }

  return `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}${url.hash}`;
}

export function writeUiStateToUrl({ historyMode = 'replace' } = {}) {
  const nextUrl = buildUiStateUrl();
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) {
    const method = historyMode === 'push' ? 'pushState' : 'replaceState';
    window.history[method](null, '', nextUrl);
  }
}
