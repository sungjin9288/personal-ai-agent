// Copy-state management for release, blocker, retrieval, and handoff copy actions.
//
// Each surface has a triple: `get<Surface>CopyKey` derives the stable copy-key from
// the current filter/selection state, `isCopied<Surface>` reports whether that key is
// the active "just copied" marker, and `markCopied<Surface>` sets the marker, schedules
// its auto-clear timer, and re-renders the owning surface. Impurities are limited to the
// shared `state`, window timers, and the render callbacks imported from `../app.js`.

import { state } from './app-state.js';
import {
  normalizeUiParam,
  getReleaseCommandCopyKey,
  getReleaseLinkCopyKey,
  getRetrievalSourceKey,
  getReleaseHandoffStructuredSummaryDetailCopyKey,
  getReleaseHandoffStructuredSummaryStableLineCopyKey,
} from './ui-params.js';
import {
  getReleaseProductionBlockerSummaryCopyKey,
  getReleaseProviderReadinessPackageCopyKey,
} from './status-labels.js';
import {
  renderReleaseStatus,
  renderFlowState,
  renderRetrievalSourceSurfaces,
} from '../app.js';

export function isCopiedRetrievalSource(sourceType = '', sourceLabel = '') {
  return state.retrievalCopiedSourceKey === getRetrievalSourceKey(sourceType, sourceLabel);
}

export function isCopiedReleaseHandoffPreviewLink(artifactId = '') {
  return state.releaseHandoffCopiedPreviewLinkId === normalizeUiParam(artifactId);
}

export function isCopiedReleaseHandoffSummary(artifactId = '') {
  return state.releaseHandoffCopiedSummaryId === normalizeUiParam(artifactId);
}

export function isCopiedReleaseHandoffSummaryDetail(artifactId = '', detailKey = '') {
  return state.releaseHandoffCopiedSummaryDetailKey === getReleaseHandoffStructuredSummaryDetailCopyKey(artifactId, detailKey);
}

export function isCopiedReleaseHandoffSummaryStableLine(artifactId = '', detailKey = '', lineIndex = -1) {
  return state.releaseHandoffCopiedSummaryStableLineKey === getReleaseHandoffStructuredSummaryStableLineCopyKey(artifactId, detailKey, lineIndex);
}

export function isCopiedReleaseCommand(command = '', label = '') {
  return state.releaseCommandCopiedKey === getReleaseCommandCopyKey(command, label);
}

export function markCopiedReleaseCommand(command = '', label = '') {
  const nextKey = getReleaseCommandCopyKey(command, label);
  if (!nextKey) {
    return;
  }

  state.releaseCommandCopiedKey = nextKey;
  if (state.releaseCommandCopiedTimer) {
    window.clearTimeout(state.releaseCommandCopiedTimer);
    state.releaseCommandCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseCommandCopiedTimer = window.setTimeout(() => {
    state.releaseCommandCopiedKey = '';
    state.releaseCommandCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseBlockerCommandsCopyKey({
  action = 'copy-release-blocker-filter-commands',
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedCopyKey = normalizeUiParam(copyKey);
  if (normalizedCopyKey) {
    return normalizedCopyKey;
  }
  const normalizedAction = normalizeUiParam(action);
  if (!normalizedAction) {
    return '';
  }
  return [
    normalizedAction,
    normalizeUiParam(category) || 'all-categories',
    normalizeUiParam(owner) || 'all-owners',
    normalizeUiParam(provider) || 'all-providers',
    includeShared ? 'shared-included' : 'shared-excluded',
  ].join(':');
}

export function isCopiedReleaseBlockerCommands(options = {}) {
  return state.releaseBlockerCommandsCopiedKey === getReleaseBlockerCommandsCopyKey(options);
}

export function markCopiedReleaseBlockerCommands(options = {}) {
  const nextKey = getReleaseBlockerCommandsCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseBlockerCommandsCopiedKey = nextKey;
  if (state.releaseBlockerCommandsCopiedTimer) {
    window.clearTimeout(state.releaseBlockerCommandsCopiedTimer);
    state.releaseBlockerCommandsCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseBlockerCommandsCopiedTimer = window.setTimeout(() => {
    state.releaseBlockerCommandsCopiedKey = '';
    state.releaseBlockerCommandsCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseBlockerEvidenceCopyKey({
  action = 'copy-release-blocker-filter-evidence',
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedCopyKey = normalizeUiParam(copyKey);
  if (normalizedCopyKey) {
    return normalizedCopyKey;
  }
  const normalizedAction = normalizeUiParam(action);
  if (!normalizedAction) {
    return '';
  }
  return [
    normalizedAction,
    normalizeUiParam(category) || 'all-categories',
    normalizeUiParam(owner) || 'all-owners',
    normalizeUiParam(provider) || 'all-providers',
    includeShared ? 'shared-included' : 'shared-excluded',
  ].join(':');
}

export function isCopiedReleaseBlockerEvidence(options = {}) {
  return state.releaseBlockerEvidenceCopiedKey === getReleaseBlockerEvidenceCopyKey(options);
}

export function markCopiedReleaseBlockerEvidence(options = {}) {
  const nextKey = getReleaseBlockerEvidenceCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseBlockerEvidenceCopiedKey = nextKey;
  if (state.releaseBlockerEvidenceCopiedTimer) {
    window.clearTimeout(state.releaseBlockerEvidenceCopiedTimer);
    state.releaseBlockerEvidenceCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseBlockerEvidenceCopiedTimer = window.setTimeout(() => {
    state.releaseBlockerEvidenceCopiedKey = '';
    state.releaseBlockerEvidenceCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function isCopiedReleaseLink(action = '', value = '') {
  return state.releaseLinkCopiedKey === getReleaseLinkCopyKey(action, value);
}

export function markCopiedReleaseLink(action = '', value = '') {
  const nextKey = getReleaseLinkCopyKey(action, value);
  if (!nextKey) {
    return;
  }

  state.releaseLinkCopiedKey = nextKey;
  if (state.releaseLinkCopiedTimer) {
    window.clearTimeout(state.releaseLinkCopiedTimer);
    state.releaseLinkCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseLinkCopiedTimer = window.setTimeout(() => {
    state.releaseLinkCopiedKey = '';
    state.releaseLinkCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function isCopiedReleaseProviderReadinessPackage(provider = '') {
  return state.releaseProviderReadinessPackageCopiedKey === getReleaseProviderReadinessPackageCopyKey(provider);
}

export function markCopiedReleaseProviderReadinessPackage(provider = '') {
  const nextKey = getReleaseProviderReadinessPackageCopyKey(provider);
  if (!nextKey) {
    return;
  }

  state.releaseProviderReadinessPackageCopiedKey = nextKey;
  if (state.releaseProviderReadinessPackageCopiedTimer) {
    window.clearTimeout(state.releaseProviderReadinessPackageCopiedTimer);
    state.releaseProviderReadinessPackageCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseProviderReadinessPackageCopiedTimer = window.setTimeout(() => {
    state.releaseProviderReadinessPackageCopiedKey = '';
    state.releaseProviderReadinessPackageCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseBlockerPackageCopyKey(options = '') {
  if (!options || typeof options !== 'object') {
    return normalizeUiParam(options);
  }

  const {
    action = 'copy-release-blocker-package',
    blockerId = '',
    category = state.releaseBlockerCategoryFilter,
    copyKey = '',
    includeShared = true,
    owner = state.releaseBlockerOwnerFilter,
    provider = state.releaseBlockerProviderFilter,
  } = options;
  const normalizedCopyKey = normalizeUiParam(copyKey);
  if (normalizedCopyKey) {
    return normalizedCopyKey;
  }
  const normalizedBlockerId = normalizeUiParam(blockerId);
  if (normalizedBlockerId) {
    return normalizedBlockerId;
  }
  const normalizedAction = normalizeUiParam(action);
  if (!normalizedAction) {
    return '';
  }
  return [
    normalizedAction,
    normalizeUiParam(category) || 'all-categories',
    normalizeUiParam(owner) || 'all-owners',
    normalizeUiParam(provider) || 'all-providers',
    includeShared ? 'shared-included' : 'shared-excluded',
  ].join(':');
}

export function isCopiedReleaseBlockerPackage(options = '') {
  return state.releaseBlockerPackageCopiedKey === getReleaseBlockerPackageCopyKey(options);
}

export function markCopiedReleaseBlockerPackage(options = '') {
  const nextKey = getReleaseBlockerPackageCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseBlockerPackageCopiedKey = nextKey;
  if (state.releaseBlockerPackageCopiedTimer) {
    window.clearTimeout(state.releaseBlockerPackageCopiedTimer);
    state.releaseBlockerPackageCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseBlockerPackageCopiedTimer = window.setTimeout(() => {
    state.releaseBlockerPackageCopiedKey = '';
    state.releaseBlockerPackageCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseBlockerClosureChecklistCopyKey(options = '') {
  if (!options || typeof options !== 'object') {
    return normalizeUiParam(options);
  }

  const {
    action = 'copy-release-blocker-closure-checklist',
    blockerId = '',
    category = state.releaseBlockerCategoryFilter,
    copyKey = '',
    includeShared = true,
    owner = state.releaseBlockerOwnerFilter,
    provider = state.releaseBlockerProviderFilter,
  } = options;
  const normalizedCopyKey = normalizeUiParam(copyKey);
  if (normalizedCopyKey) {
    return normalizedCopyKey;
  }
  const normalizedBlockerId = normalizeUiParam(blockerId);
  if (normalizedBlockerId) {
    return normalizedBlockerId;
  }
  const normalizedAction = normalizeUiParam(action);
  if (!normalizedAction) {
    return '';
  }
  return [
    normalizedAction,
    normalizeUiParam(category) || 'all-categories',
    normalizeUiParam(owner) || 'all-owners',
    normalizeUiParam(provider) || 'all-providers',
    includeShared ? 'shared-included' : 'shared-excluded',
  ].join(':');
}

export function isCopiedReleaseBlockerClosureChecklist(options = '') {
  return state.releaseBlockerClosureChecklistCopiedKey === getReleaseBlockerClosureChecklistCopyKey(options);
}

export function markCopiedReleaseBlockerClosureChecklist(options = '') {
  const nextKey = getReleaseBlockerClosureChecklistCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseBlockerClosureChecklistCopiedKey = nextKey;
  if (state.releaseBlockerClosureChecklistCopiedTimer) {
    window.clearTimeout(state.releaseBlockerClosureChecklistCopiedTimer);
    state.releaseBlockerClosureChecklistCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseBlockerClosureChecklistCopiedTimer = window.setTimeout(() => {
    state.releaseBlockerClosureChecklistCopiedKey = '';
    state.releaseBlockerClosureChecklistCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseBlockerClosureMatrixCopyKey({
  action = 'copy-release-blocker-filter-closure-matrix',
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedCopyKey = normalizeUiParam(copyKey);
  if (normalizedCopyKey) {
    return normalizedCopyKey;
  }
  const normalizedAction = normalizeUiParam(action);
  if (!normalizedAction) {
    return '';
  }
  return [
    normalizedAction,
    normalizeUiParam(category) || 'all-categories',
    normalizeUiParam(owner) || 'all-owners',
    normalizeUiParam(provider) || 'all-providers',
    includeShared ? 'shared-included' : 'shared-excluded',
  ].join(':');
}

export function isCopiedReleaseBlockerClosureMatrix(options = {}) {
  return state.releaseBlockerClosureMatrixCopiedKey === getReleaseBlockerClosureMatrixCopyKey(options);
}

export function markCopiedReleaseBlockerClosureMatrix(options = {}) {
  const nextKey = getReleaseBlockerClosureMatrixCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseBlockerClosureMatrixCopiedKey = nextKey;
  if (state.releaseBlockerClosureMatrixCopiedTimer) {
    window.clearTimeout(state.releaseBlockerClosureMatrixCopiedTimer);
    state.releaseBlockerClosureMatrixCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseBlockerClosureMatrixCopiedTimer = window.setTimeout(() => {
    state.releaseBlockerClosureMatrixCopiedKey = '';
    state.releaseBlockerClosureMatrixCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseBlockerHandoffCopyKey(options = '') {
  if (!options || typeof options !== 'object') {
    return normalizeUiParam(options);
  }

  const {
    action = 'copy-release-blocker-handoff',
    blockerId = '',
    category = state.releaseBlockerCategoryFilter,
    copyKey = '',
    includeShared = true,
    owner = state.releaseBlockerOwnerFilter,
    provider = state.releaseBlockerProviderFilter,
  } = options;
  const normalizedCopyKey = normalizeUiParam(copyKey);
  if (normalizedCopyKey) {
    return normalizedCopyKey;
  }
  const normalizedBlockerId = normalizeUiParam(blockerId);
  if (normalizedBlockerId) {
    return normalizedBlockerId;
  }
  const normalizedAction = normalizeUiParam(action);
  if (!normalizedAction) {
    return '';
  }
  return [
    normalizedAction,
    normalizeUiParam(category) || 'all-categories',
    normalizeUiParam(owner) || 'all-owners',
    normalizeUiParam(provider) || 'all-providers',
    includeShared ? 'shared-included' : 'shared-excluded',
  ].join(':');
}

export function isCopiedReleaseBlockerHandoff(options = '') {
  return state.releaseBlockerHandoffCopiedKey === getReleaseBlockerHandoffCopyKey(options);
}

export function markCopiedReleaseBlockerHandoff(options = '') {
  const nextKey = getReleaseBlockerHandoffCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseBlockerHandoffCopiedKey = nextKey;
  if (state.releaseBlockerHandoffCopiedTimer) {
    window.clearTimeout(state.releaseBlockerHandoffCopiedTimer);
    state.releaseBlockerHandoffCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseBlockerHandoffCopiedTimer = window.setTimeout(() => {
    state.releaseBlockerHandoffCopiedKey = '';
    state.releaseBlockerHandoffCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseBlockerSummaryCopyKey({
  action = 'copy-release-blocker-filter-summary',
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedCopyKey = normalizeUiParam(copyKey);
  if (normalizedCopyKey) {
    return normalizedCopyKey;
  }
  const normalizedAction = normalizeUiParam(action);
  if (!normalizedAction) {
    return '';
  }
  return [
    normalizedAction,
    normalizeUiParam(category) || 'all-categories',
    normalizeUiParam(owner) || 'all-owners',
    normalizeUiParam(provider) || 'all-providers',
    includeShared ? 'shared-included' : 'shared-excluded',
  ].join(':');
}

export function isCopiedReleaseBlockerSummary(options = {}) {
  return state.releaseBlockerSummaryCopiedKey === getReleaseBlockerSummaryCopyKey(options);
}

export function markCopiedReleaseBlockerSummary(options = {}) {
  const nextKey = getReleaseBlockerSummaryCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseBlockerSummaryCopiedKey = nextKey;
  if (state.releaseBlockerSummaryCopiedTimer) {
    window.clearTimeout(state.releaseBlockerSummaryCopiedTimer);
    state.releaseBlockerSummaryCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseBlockerSummaryCopiedTimer = window.setTimeout(() => {
    state.releaseBlockerSummaryCopiedKey = '';
    state.releaseBlockerSummaryCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function isCopiedReleaseProductionBlockerSummary(copyKey = '') {
  return state.releaseProductionBlockerSummaryCopiedKey === getReleaseProductionBlockerSummaryCopyKey(copyKey);
}

export function markCopiedReleaseProductionBlockerSummary(copyKey = '') {
  const nextKey = getReleaseProductionBlockerSummaryCopyKey(copyKey);
  if (!nextKey) {
    return;
  }

  state.releaseProductionBlockerSummaryCopiedKey = nextKey;
  if (state.releaseProductionBlockerSummaryCopiedTimer) {
    window.clearTimeout(state.releaseProductionBlockerSummaryCopiedTimer);
    state.releaseProductionBlockerSummaryCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseProductionBlockerSummaryCopiedTimer = window.setTimeout(() => {
    state.releaseProductionBlockerSummaryCopiedKey = '';
    state.releaseProductionBlockerSummaryCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseProductionBlockerDetailCopyKey({
  action = 'copy-release-production-blocker-handoff',
  blockerIndex = state.releaseFocusedProductionBlockerIndex,
  copyKey = '',
} = {}) {
  const normalizedCopyKey = normalizeUiParam(copyKey);
  if (normalizedCopyKey) {
    return normalizedCopyKey;
  }
  const normalizedAction = normalizeUiParam(action);
  const normalizedIndex = String(blockerIndex ?? '').trim();
  if (!normalizedAction || !normalizedIndex) {
    return '';
  }
  return `${normalizedAction}:${normalizedIndex}`;
}

export function isCopiedReleaseProductionBlockerDetail(options = {}) {
  return state.releaseProductionBlockerDetailCopiedKey === getReleaseProductionBlockerDetailCopyKey(options);
}

export function markCopiedReleaseProductionBlockerDetail(options = {}) {
  const nextKey = getReleaseProductionBlockerDetailCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseProductionBlockerDetailCopiedKey = nextKey;
  if (state.releaseProductionBlockerDetailCopiedTimer) {
    window.clearTimeout(state.releaseProductionBlockerDetailCopiedTimer);
    state.releaseProductionBlockerDetailCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseProductionBlockerDetailCopiedTimer = window.setTimeout(() => {
    state.releaseProductionBlockerDetailCopiedKey = '';
    state.releaseProductionBlockerDetailCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function markCopiedCurrentViewLink() {
  state.currentViewLinkCopied = true;
  if (state.currentViewLinkCopiedTimer) {
    window.clearTimeout(state.currentViewLinkCopiedTimer);
    state.currentViewLinkCopiedTimer = null;
  }
  renderFlowState();
  state.currentViewLinkCopiedTimer = window.setTimeout(() => {
    state.currentViewLinkCopied = false;
    state.currentViewLinkCopiedTimer = null;
    renderFlowState();
  }, 1800);
}

export function markCopiedRetrievalSource(sourceType = '', sourceLabel = '') {
  const nextKey = getRetrievalSourceKey(sourceType, sourceLabel);
  if (!nextKey) {
    return;
  }

  state.retrievalCopiedSourceKey = nextKey;
  if (state.retrievalCopiedSourceTimer) {
    window.clearTimeout(state.retrievalCopiedSourceTimer);
    state.retrievalCopiedSourceTimer = null;
  }
  renderRetrievalSourceSurfaces();
  state.retrievalCopiedSourceTimer = window.setTimeout(() => {
    state.retrievalCopiedSourceKey = '';
    state.retrievalCopiedSourceTimer = null;
    renderRetrievalSourceSurfaces();
  }, 1800);
}

export function markCopiedReleaseHandoffPreviewLink(artifactId = '') {
  const nextArtifactId = normalizeUiParam(artifactId);
  if (!nextArtifactId) {
    return;
  }

  state.releaseHandoffCopiedPreviewLinkId = nextArtifactId;
  if (state.releaseHandoffCopiedPreviewLinkTimer) {
    window.clearTimeout(state.releaseHandoffCopiedPreviewLinkTimer);
    state.releaseHandoffCopiedPreviewLinkTimer = null;
  }
  renderReleaseStatus();
  state.releaseHandoffCopiedPreviewLinkTimer = window.setTimeout(() => {
    state.releaseHandoffCopiedPreviewLinkId = '';
    state.releaseHandoffCopiedPreviewLinkTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function markCopiedReleaseHandoffSummary(artifactId = '') {
  const nextArtifactId = normalizeUiParam(artifactId);
  if (!nextArtifactId) {
    return;
  }

  state.releaseHandoffCopiedSummaryId = nextArtifactId;
  if (state.releaseHandoffCopiedSummaryTimer) {
    window.clearTimeout(state.releaseHandoffCopiedSummaryTimer);
    state.releaseHandoffCopiedSummaryTimer = null;
  }
  renderReleaseStatus();
  state.releaseHandoffCopiedSummaryTimer = window.setTimeout(() => {
    state.releaseHandoffCopiedSummaryId = '';
    state.releaseHandoffCopiedSummaryTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function markCopiedReleaseHandoffSummaryDetail(artifactId = '', detailKey = '') {
  const nextCopyKey = getReleaseHandoffStructuredSummaryDetailCopyKey(artifactId, detailKey);
  if (!nextCopyKey) {
    return;
  }

  state.releaseHandoffCopiedSummaryDetailKey = nextCopyKey;
  if (state.releaseHandoffCopiedSummaryDetailTimer) {
    window.clearTimeout(state.releaseHandoffCopiedSummaryDetailTimer);
    state.releaseHandoffCopiedSummaryDetailTimer = null;
  }
  renderReleaseStatus();
  state.releaseHandoffCopiedSummaryDetailTimer = window.setTimeout(() => {
    state.releaseHandoffCopiedSummaryDetailKey = '';
    state.releaseHandoffCopiedSummaryDetailTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function markCopiedReleaseHandoffSummaryStableLine(artifactId = '', detailKey = '', lineIndex = -1) {
  const nextCopyKey = getReleaseHandoffStructuredSummaryStableLineCopyKey(artifactId, detailKey, lineIndex);
  if (!nextCopyKey) {
    return;
  }

  state.releaseHandoffCopiedSummaryStableLineKey = nextCopyKey;
  if (state.releaseHandoffCopiedSummaryStableLineTimer) {
    window.clearTimeout(state.releaseHandoffCopiedSummaryStableLineTimer);
    state.releaseHandoffCopiedSummaryStableLineTimer = null;
  }
  renderReleaseStatus();
  state.releaseHandoffCopiedSummaryStableLineTimer = window.setTimeout(() => {
    state.releaseHandoffCopiedSummaryStableLineKey = '';
    state.releaseHandoffCopiedSummaryStableLineTimer = null;
    renderReleaseStatus();
  }, 1800);
}
