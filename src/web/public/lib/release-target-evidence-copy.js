// Copy-state management for the release target-evidence surface.
//
// Each evidence type has a triple: `get<Type>CopyKey` derives the stable copy-key
// from the current filter state, `isCopied<Type>` reports whether that key is the
// active "just copied" marker, and `markCopied<Type>` sets the marker, schedules its
// auto-clear timer, and re-renders the release status surface. Impurities are limited
// to shared `state`, window timers, and the `renderReleaseStatus` re-render callback.

import { state } from './app-state.js';
import { normalizeUiParam } from './ui-params.js';
import { renderReleaseStatus } from '../app.js';

export function getReleaseTargetEvidenceIntakeSummaryCopyKey({
  action = 'copy-release-target-evidence-intake-summary',
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

export function isCopiedReleaseTargetEvidenceIntakeSummary(options = {}) {
  return state.releaseTargetEvidenceIntakeSummaryCopiedKey
    === getReleaseTargetEvidenceIntakeSummaryCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceIntakeSummary(options = {}) {
  const nextKey = getReleaseTargetEvidenceIntakeSummaryCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceIntakeSummaryCopiedKey = nextKey;
  if (state.releaseTargetEvidenceIntakeSummaryCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceIntakeSummaryCopiedTimer);
    state.releaseTargetEvidenceIntakeSummaryCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceIntakeSummaryCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceIntakeSummaryCopiedKey = '';
    state.releaseTargetEvidenceIntakeSummaryCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceCaptureTemplateCopyKey({
  action = 'copy-release-target-evidence-capture-template',
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

export function isCopiedReleaseTargetEvidenceCaptureTemplate(options = {}) {
  return state.releaseTargetEvidenceCaptureTemplateCopiedKey
    === getReleaseTargetEvidenceCaptureTemplateCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceCaptureTemplate(options = {}) {
  const nextKey = getReleaseTargetEvidenceCaptureTemplateCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceCaptureTemplateCopiedKey = nextKey;
  if (state.releaseTargetEvidenceCaptureTemplateCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceCaptureTemplateCopiedTimer);
    state.releaseTargetEvidenceCaptureTemplateCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceCaptureTemplateCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceCaptureTemplateCopiedKey = '';
    state.releaseTargetEvidenceCaptureTemplateCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceRequiredCommandsCopyKey({
  action = 'copy-release-target-evidence-required-commands',
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

export function isCopiedReleaseTargetEvidenceRequiredCommands(options = {}) {
  return state.releaseTargetEvidenceRequiredCommandsCopiedKey
    === getReleaseTargetEvidenceRequiredCommandsCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceRequiredCommands(options = {}) {
  const nextKey = getReleaseTargetEvidenceRequiredCommandsCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceRequiredCommandsCopiedKey = nextKey;
  if (state.releaseTargetEvidenceRequiredCommandsCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceRequiredCommandsCopiedTimer);
    state.releaseTargetEvidenceRequiredCommandsCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceRequiredCommandsCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceRequiredCommandsCopiedKey = '';
    state.releaseTargetEvidenceRequiredCommandsCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceProductionGapCopyKey({
  action = 'copy-release-target-evidence-production-gap',
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

export function isCopiedReleaseTargetEvidenceProductionGap(options = {}) {
  return state.releaseTargetEvidenceProductionGapCopiedKey
    === getReleaseTargetEvidenceProductionGapCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceProductionGap(options = {}) {
  const nextKey = getReleaseTargetEvidenceProductionGapCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceProductionGapCopiedKey = nextKey;
  if (state.releaseTargetEvidenceProductionGapCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceProductionGapCopiedTimer);
    state.releaseTargetEvidenceProductionGapCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceProductionGapCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceProductionGapCopiedKey = '';
    state.releaseTargetEvidenceProductionGapCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceExceptionRegisterCopyKey({
  action = 'copy-release-target-evidence-exception-register',
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

export function isCopiedReleaseTargetEvidenceExceptionRegister(options = {}) {
  return state.releaseTargetEvidenceExceptionRegisterCopiedKey
    === getReleaseTargetEvidenceExceptionRegisterCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceExceptionRegister(options = {}) {
  const nextKey = getReleaseTargetEvidenceExceptionRegisterCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceExceptionRegisterCopiedKey = nextKey;
  if (state.releaseTargetEvidenceExceptionRegisterCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceExceptionRegisterCopiedTimer);
    state.releaseTargetEvidenceExceptionRegisterCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceExceptionRegisterCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceExceptionRegisterCopiedKey = '';
    state.releaseTargetEvidenceExceptionRegisterCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceRiskDecisionRegisterCopyKey({
  action = 'copy-release-target-evidence-risk-decision-register',
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

export function isCopiedReleaseTargetEvidenceRiskDecisionRegister(options = {}) {
  return state.releaseTargetEvidenceRiskDecisionRegisterCopiedKey
    === getReleaseTargetEvidenceRiskDecisionRegisterCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceRiskDecisionRegister(options = {}) {
  const nextKey = getReleaseTargetEvidenceRiskDecisionRegisterCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceRiskDecisionRegisterCopiedKey = nextKey;
  if (state.releaseTargetEvidenceRiskDecisionRegisterCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceRiskDecisionRegisterCopiedTimer);
    state.releaseTargetEvidenceRiskDecisionRegisterCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceRiskDecisionRegisterCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceRiskDecisionRegisterCopiedKey = '';
    state.releaseTargetEvidenceRiskDecisionRegisterCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceProviderReferencesCopyKey({
  action = 'copy-release-target-evidence-provider-references',
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

export function isCopiedReleaseTargetEvidenceProviderReferences(options = {}) {
  return state.releaseTargetEvidenceProviderReferencesCopiedKey
    === getReleaseTargetEvidenceProviderReferencesCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceProviderReferences(options = {}) {
  const nextKey = getReleaseTargetEvidenceProviderReferencesCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceProviderReferencesCopiedKey = nextKey;
  if (state.releaseTargetEvidenceProviderReferencesCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceProviderReferencesCopiedTimer);
    state.releaseTargetEvidenceProviderReferencesCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceProviderReferencesCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceProviderReferencesCopiedKey = '';
    state.releaseTargetEvidenceProviderReferencesCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceResidualBlockersCopyKey({
  action = 'copy-release-target-evidence-residual-blockers',
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

export function isCopiedReleaseTargetEvidenceResidualBlockers(options = {}) {
  return state.releaseTargetEvidenceResidualBlockersCopiedKey
    === getReleaseTargetEvidenceResidualBlockersCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceResidualBlockers(options = {}) {
  const nextKey = getReleaseTargetEvidenceResidualBlockersCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceResidualBlockersCopiedKey = nextKey;
  if (state.releaseTargetEvidenceResidualBlockersCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceResidualBlockersCopiedTimer);
    state.releaseTargetEvidenceResidualBlockersCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceResidualBlockersCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceResidualBlockersCopiedKey = '';
    state.releaseTargetEvidenceResidualBlockersCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceClosureRulesCopyKey({
  action = 'copy-release-target-evidence-closure-rules',
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

export function isCopiedReleaseTargetEvidenceClosureRules(options = {}) {
  return state.releaseTargetEvidenceClosureRulesCopiedKey
    === getReleaseTargetEvidenceClosureRulesCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceClosureRules(options = {}) {
  const nextKey = getReleaseTargetEvidenceClosureRulesCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceClosureRulesCopiedKey = nextKey;
  if (state.releaseTargetEvidenceClosureRulesCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceClosureRulesCopiedTimer);
    state.releaseTargetEvidenceClosureRulesCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceClosureRulesCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceClosureRulesCopiedKey = '';
    state.releaseTargetEvidenceClosureRulesCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceSubmissionManifestCopyKey({
  action = 'copy-release-target-evidence-submission-manifest',
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

export function isCopiedReleaseTargetEvidenceSubmissionManifest(options = {}) {
  return state.releaseTargetEvidenceSubmissionManifestCopiedKey
    === getReleaseTargetEvidenceSubmissionManifestCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceSubmissionManifest(options = {}) {
  const nextKey = getReleaseTargetEvidenceSubmissionManifestCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceSubmissionManifestCopiedKey = nextKey;
  if (state.releaseTargetEvidenceSubmissionManifestCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceSubmissionManifestCopiedTimer);
    state.releaseTargetEvidenceSubmissionManifestCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceSubmissionManifestCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceSubmissionManifestCopiedKey = '';
    state.releaseTargetEvidenceSubmissionManifestCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceSanitizedRegisterCopyKey({
  action = 'copy-release-target-evidence-sanitized-register',
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

export function isCopiedReleaseTargetEvidenceSanitizedRegister(options = {}) {
  return state.releaseTargetEvidenceSanitizedRegisterCopiedKey
    === getReleaseTargetEvidenceSanitizedRegisterCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceSanitizedRegister(options = {}) {
  const nextKey = getReleaseTargetEvidenceSanitizedRegisterCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceSanitizedRegisterCopiedKey = nextKey;
  if (state.releaseTargetEvidenceSanitizedRegisterCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceSanitizedRegisterCopiedTimer);
    state.releaseTargetEvidenceSanitizedRegisterCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceSanitizedRegisterCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceSanitizedRegisterCopiedKey = '';
    state.releaseTargetEvidenceSanitizedRegisterCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceBoundaryMapCopyKey({
  action = 'copy-release-target-evidence-boundary-map',
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

export function isCopiedReleaseTargetEvidenceBoundaryMap(options = {}) {
  return state.releaseTargetEvidenceBoundaryMapCopiedKey
    === getReleaseTargetEvidenceBoundaryMapCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceBoundaryMap(options = {}) {
  const nextKey = getReleaseTargetEvidenceBoundaryMapCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceBoundaryMapCopiedKey = nextKey;
  if (state.releaseTargetEvidenceBoundaryMapCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceBoundaryMapCopiedTimer);
    state.releaseTargetEvidenceBoundaryMapCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceBoundaryMapCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceBoundaryMapCopiedKey = '';
    state.releaseTargetEvidenceBoundaryMapCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceCommandRerunLogCopyKey({
  action = 'copy-release-target-evidence-command-rerun-log',
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

export function isCopiedReleaseTargetEvidenceCommandRerunLog(options = {}) {
  return state.releaseTargetEvidenceCommandRerunLogCopiedKey
    === getReleaseTargetEvidenceCommandRerunLogCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceCommandRerunLog(options = {}) {
  const nextKey = getReleaseTargetEvidenceCommandRerunLogCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceCommandRerunLogCopiedKey = nextKey;
  if (state.releaseTargetEvidenceCommandRerunLogCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceCommandRerunLogCopiedTimer);
    state.releaseTargetEvidenceCommandRerunLogCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceCommandRerunLogCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceCommandRerunLogCopiedKey = '';
    state.releaseTargetEvidenceCommandRerunLogCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceDecisionRecordCopyKey({
  action = 'copy-release-target-evidence-decision-record',
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

export function isCopiedReleaseTargetEvidenceDecisionRecord(options = {}) {
  return state.releaseTargetEvidenceDecisionRecordCopiedKey
    === getReleaseTargetEvidenceDecisionRecordCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceDecisionRecord(options = {}) {
  const nextKey = getReleaseTargetEvidenceDecisionRecordCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceDecisionRecordCopiedKey = nextKey;
  if (state.releaseTargetEvidenceDecisionRecordCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceDecisionRecordCopiedTimer);
    state.releaseTargetEvidenceDecisionRecordCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceDecisionRecordCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceDecisionRecordCopiedKey = '';
    state.releaseTargetEvidenceDecisionRecordCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceBlockerDispositionCopyKey({
  action = 'copy-release-target-evidence-blocker-disposition',
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

export function isCopiedReleaseTargetEvidenceBlockerDisposition(options = {}) {
  return state.releaseTargetEvidenceBlockerDispositionCopiedKey
    === getReleaseTargetEvidenceBlockerDispositionCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceBlockerDisposition(options = {}) {
  const nextKey = getReleaseTargetEvidenceBlockerDispositionCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceBlockerDispositionCopiedKey = nextKey;
  if (state.releaseTargetEvidenceBlockerDispositionCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceBlockerDispositionCopiedTimer);
    state.releaseTargetEvidenceBlockerDispositionCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceBlockerDispositionCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceBlockerDispositionCopiedKey = '';
    state.releaseTargetEvidenceBlockerDispositionCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceReleaseRefreshCopyKey({
  action = 'copy-release-target-evidence-release-refresh',
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

export function isCopiedReleaseTargetEvidenceReleaseRefresh(options = {}) {
  return state.releaseTargetEvidenceReleaseRefreshCopiedKey
    === getReleaseTargetEvidenceReleaseRefreshCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceReleaseRefresh(options = {}) {
  const nextKey = getReleaseTargetEvidenceReleaseRefreshCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceReleaseRefreshCopiedKey = nextKey;
  if (state.releaseTargetEvidenceReleaseRefreshCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceReleaseRefreshCopiedTimer);
    state.releaseTargetEvidenceReleaseRefreshCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceReleaseRefreshCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceReleaseRefreshCopiedKey = '';
    state.releaseTargetEvidenceReleaseRefreshCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}

export function getReleaseTargetEvidenceIntakePacketCopyKey({
  action = 'copy-release-target-evidence-intake-packet',
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

export function isCopiedReleaseTargetEvidenceIntakePacket(options = {}) {
  return state.releaseTargetEvidenceIntakePacketCopiedKey
    === getReleaseTargetEvidenceIntakePacketCopyKey(options);
}

export function markCopiedReleaseTargetEvidenceIntakePacket(options = {}) {
  const nextKey = getReleaseTargetEvidenceIntakePacketCopyKey(options);
  if (!nextKey) {
    return;
  }

  state.releaseTargetEvidenceIntakePacketCopiedKey = nextKey;
  if (state.releaseTargetEvidenceIntakePacketCopiedTimer) {
    window.clearTimeout(state.releaseTargetEvidenceIntakePacketCopiedTimer);
    state.releaseTargetEvidenceIntakePacketCopiedTimer = null;
  }
  renderReleaseStatus();
  state.releaseTargetEvidenceIntakePacketCopiedTimer = window.setTimeout(() => {
    state.releaseTargetEvidenceIntakePacketCopiedKey = '';
    state.releaseTargetEvidenceIntakePacketCopiedTimer = null;
    renderReleaseStatus();
  }, 1800);
}
