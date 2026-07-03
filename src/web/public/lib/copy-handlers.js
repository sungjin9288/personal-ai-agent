// Impure release-copy-handler domain extracted from app.js.
// Owns the async `copy*` clipboard flows for the release/triage surface:
// current-view + retrieval-source links, release triage/blocker links,
// blocker + production-blocker handoffs/packages, filtered/provider-only
// slices, and the release target-evidence register family. Each handler reads
// shared `state`, builds text/URLs via the pure lib layer, drives the clipboard
// through `copyPlainTextValue`/`copyUiLink` (kept in app.js), and records
// copied-flag state via the copy-state helpers. Function declarations cycle
// safely with the `../app.js` re-imports in browsers.
import { state } from './app-state.js';
import { normalizeUiParam, getSanitizedRetrievalSourceType } from './ui-params.js';
import { buildUiStateUrl } from './url-state.js';
import {
  getReleaseHandoffStructuredSummaryDetails,
  getReleaseHandoffStructuredSummaryOverviewLine,
} from './release-handoff-summary.js';
import {
  markCopiedCurrentViewLink,
  markCopiedReleaseBlockerClosureChecklist,
  markCopiedReleaseBlockerClosureMatrix,
  markCopiedReleaseBlockerCommands,
  markCopiedReleaseBlockerEvidence,
  markCopiedReleaseBlockerHandoff,
  markCopiedReleaseBlockerPackage,
  markCopiedReleaseBlockerSummary,
  markCopiedReleaseCommand,
  markCopiedReleaseHandoffPreviewLink,
  markCopiedReleaseHandoffSummary,
  markCopiedReleaseHandoffSummaryDetail,
  markCopiedReleaseHandoffSummaryStableLine,
  markCopiedReleaseLink,
  markCopiedReleaseProductionBlockerDetail,
  markCopiedReleaseProductionBlockerSummary,
  markCopiedReleaseProviderReadinessPackage,
  markCopiedRetrievalSource,
} from './copy-state.js';
import {
  markCopiedReleaseTargetEvidenceBlockerDisposition,
  markCopiedReleaseTargetEvidenceBoundaryMap,
  markCopiedReleaseTargetEvidenceCaptureTemplate,
  markCopiedReleaseTargetEvidenceClosureRules,
  markCopiedReleaseTargetEvidenceCommandRerunLog,
  markCopiedReleaseTargetEvidenceDecisionRecord,
  markCopiedReleaseTargetEvidenceExceptionRegister,
  markCopiedReleaseTargetEvidenceIntakePacket,
  markCopiedReleaseTargetEvidenceIntakeSummary,
  markCopiedReleaseTargetEvidenceProductionGap,
  markCopiedReleaseTargetEvidenceProviderReferences,
  markCopiedReleaseTargetEvidenceReleaseRefresh,
  markCopiedReleaseTargetEvidenceRequiredCommands,
  markCopiedReleaseTargetEvidenceResidualBlockers,
  markCopiedReleaseTargetEvidenceRiskDecisionRegister,
  markCopiedReleaseTargetEvidenceSanitizedRegister,
  markCopiedReleaseTargetEvidenceSubmissionManifest,
} from './release-target-evidence-copy.js';
import {
  buildReleaseBlockerClosureChecklistText,
  buildReleaseBlockerClosureMatrixPackageText,
  buildReleaseBlockerHandoffText,
  buildReleaseBlockerPackageText,
  buildReleaseBlockerSliceClosureChecklistText,
  buildReleaseBlockerSliceCommandText,
  buildReleaseBlockerSliceEvidenceText,
  buildReleaseBlockerSliceHandoffText,
  buildReleaseBlockerSlicePackageText,
  buildReleaseBlockerSliceSummaryText,
  buildReleaseProductionBlockerCommandText,
  buildReleaseProductionBlockerHandoffText,
  buildReleaseProductionBlockerPackageText,
  buildReleaseProductionBlockerSummaryText,
  buildReleaseProviderReadinessPackageText,
  buildReleaseTargetEvidenceBlockerDispositionRegisterText,
  buildReleaseTargetEvidenceBoundaryConsistencyMapText,
  buildReleaseTargetEvidenceCaptureTemplateText,
  buildReleaseTargetEvidenceClosureRulesText,
  buildReleaseTargetEvidenceCommandRerunLogText,
  buildReleaseTargetEvidenceExceptionRegisterText,
  buildReleaseTargetEvidenceIntakePacketText,
  buildReleaseTargetEvidenceIntakeSummaryText,
  buildReleaseTargetEvidenceProductionGapText,
  buildReleaseTargetEvidenceProviderEvidenceReferencesText,
  buildReleaseTargetEvidenceReleaseRefreshEvidenceText,
  buildReleaseTargetEvidenceRequiredCommandsText,
  buildReleaseTargetEvidenceResidualBlockersText,
  buildReleaseTargetEvidenceReviewerDecisionRecordText,
  buildReleaseTargetEvidenceRiskDecisionRegisterText,
  buildReleaseTargetEvidenceSanitizedRegisterText,
  buildReleaseTargetEvidenceSubmissionManifestText,
} from './release-evidence-text.js';
import {
  buildProviderFallbackEventAuditPackageText,
  buildReleaseBlockerApiUrl,
  copyPlainTextValue,
  copyUiLink,
  getAbsoluteReleaseUrl,
  getReleaseCurrentOpenBlockerAction,
  getReleaseCurrentOpenBlockerActions,
  getValidReleaseProductionBlockerIndex,
  isReleaseBlockerActionVisibleForCopyScope,
  isReleaseHandoffPreviewable,
  setUiNotice,
} from '../app.js';

export async function copyCurrentViewLink() {
  const currentUrl = `${window.location.origin}${buildUiStateUrl()}`;
  const result = await copyUiLink(currentUrl, {
    promptMessage: '현재 작업면 링크를 복사하세요.',
    shownNotice: '현재 작업면 링크를 표시했습니다.',
    successNotice: '현재 작업면 링크를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedCurrentViewLink();
  }
}
export async function copyReleaseCommand({
  command = '',
  label = 'release command',
} = {}) {
  const normalizedLabel = String(label || 'release command').trim() || 'release command';
  const result = await copyPlainTextValue(command, {
    promptMessage: `${normalizedLabel}를 복사하세요.`,
    shownNotice: `${normalizedLabel}를 표시했습니다.`,
    successNotice: `${normalizedLabel}를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseCommand(command, normalizedLabel);
  }
}

export async function copyProviderFallbackEventAuditPackage() {
  const packageText = buildProviderFallbackEventAuditPackageText();
  if (!packageText) {
    setUiNotice('복사할 provider fallback event audit package가 없습니다.');
    return;
  }

  await copyPlainTextValue(packageText, {
    promptMessage: 'provider fallback event audit package를 복사하세요.',
    shownNotice: 'provider fallback event audit package를 표시했습니다.',
    successNotice: 'provider fallback event audit package를 복사했습니다.',
  });
}
export async function copyReleaseTriageLink({
  blockerCategory = state.releaseBlockerCategoryFilter,
  blockerOwner = state.releaseBlockerOwnerFilter,
  blockerProvider = state.releaseBlockerProviderFilter,
  copyAction = 'copy-release-triage-link',
  copyKey = '',
  focusedBlockerId = state.releaseFocusedBlockerId,
  focusedProductionBlockerIndex = state.releaseFocusedProductionBlockerIndex,
  focusedProvider = state.releaseFocusedProvider,
  focusedHistoryId = state.releaseFocusedHistoryId,
  historyOutcome = state.releaseHistoryFilterOutcome,
  historyProvider = state.releaseHistoryFilterProvider,
  historyScope = state.releaseHistoryFilterScope,
  successNotice = '현재 release triage 링크를 복사했습니다.',
} = {}) {
  const triageUrl = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseBlockerCategoryFilter: blockerCategory,
    releaseBlockerOwnerFilter: blockerOwner,
    releaseBlockerProviderFilter: blockerProvider,
    releaseFocusedBlockerId: focusedBlockerId,
    releaseFocusedProductionBlockerIndex: focusedProductionBlockerIndex,
    releaseFocusedProvider: focusedProvider,
    releaseFocusedHistoryId: focusedHistoryId,
    releaseHistoryOutcome: historyOutcome,
    releaseHistoryProvider: historyProvider,
    releaseHistoryScope: historyScope,
  })}`;
  const result = await copyUiLink(triageUrl, {
    promptMessage: '현재 release triage 링크를 복사하세요.',
    shownNotice: '현재 release triage 링크를 표시했습니다.',
    successNotice,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseLink(copyAction, copyKey || triageUrl);
  }
}

export async function copyReleaseBlockerLink({
  blockerId = state.releaseFocusedBlockerId,
  copyKey = '',
  successNotice = '',
} = {}) {
  const normalizedBlockerId = normalizeUiParam(blockerId);
  if (!getReleaseCurrentOpenBlockerAction(normalizedBlockerId)) {
    setUiNotice('복사할 release blocker 링크가 없습니다.');
    return;
  }

  await copyReleaseTriageLink({
    blockerCategory: '',
    blockerOwner: '',
    copyKey,
    focusedBlockerId: normalizedBlockerId,
    focusedProductionBlockerIndex: '',
    focusedProvider: '',
    focusedHistoryId: '',
    historyOutcome: '',
    historyProvider: '',
    historyScope: '',
    successNotice: successNotice || '선택한 release blocker 링크를 복사했습니다.',
  });
}

export async function copyReleaseProductionBlockerLink({
  blockerIndex = state.releaseFocusedProductionBlockerIndex,
  copyKey = '',
  successNotice = '',
} = {}) {
  const normalizedIndex = getValidReleaseProductionBlockerIndex(blockerIndex);
  if (normalizedIndex === '') {
    setUiNotice('복사할 production-ready blocker 링크가 없습니다.');
    return;
  }

  await copyReleaseTriageLink({
    blockerCategory: '',
    blockerOwner: '',
    copyKey,
    focusedBlockerId: '',
    focusedProductionBlockerIndex: normalizedIndex,
    focusedProvider: '',
    focusedHistoryId: '',
    historyOutcome: '',
    historyProvider: '',
    historyScope: '',
    successNotice: successNotice || '선택한 production-ready blocker 링크를 복사했습니다.',
  });
}

export async function copyReleaseBlockerHandoff({
  blockerId = state.releaseFocusedBlockerId,
  copyKey = '',
} = {}) {
  const normalizedBlockerId = normalizeUiParam(blockerId);
  const normalizedCopyKey = normalizeUiParam(copyKey || normalizedBlockerId);
  const blockerAction = getReleaseCurrentOpenBlockerAction(normalizedBlockerId);
  const handoffText = buildReleaseBlockerHandoffText(blockerAction);
  if (!handoffText) {
    setUiNotice('복사할 release blocker handoff가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(handoffText, {
    promptMessage: 'release blocker handoff를 복사하세요.',
    shownNotice: 'release blocker handoff를 표시했습니다.',
    successNotice: 'release blocker handoff를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerHandoff(normalizedCopyKey);
  }
}

export async function copyReleaseBlockerClosureChecklist({
  blockerId = state.releaseFocusedBlockerId,
  copyKey = '',
} = {}) {
  const normalizedBlockerId = normalizeUiParam(blockerId);
  const normalizedCopyKey = normalizeUiParam(copyKey || normalizedBlockerId);
  const blockerAction = getReleaseCurrentOpenBlockerAction(normalizedBlockerId);
  const checklistText = buildReleaseBlockerClosureChecklistText(blockerAction);
  if (!checklistText) {
    setUiNotice('복사할 release blocker closure checklist가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(checklistText, {
    promptMessage: 'release blocker closure checklist를 복사하세요.',
    shownNotice: 'release blocker closure checklist를 표시했습니다.',
    successNotice: 'release blocker closure checklist를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureChecklist(normalizedCopyKey);
  }
}

export async function copyReleaseBlockerPackage({
  blockerId = state.releaseFocusedBlockerId,
  copyKey = '',
} = {}) {
  const normalizedBlockerId = normalizeUiParam(blockerId);
  const normalizedCopyKey = normalizeUiParam(copyKey || normalizedBlockerId);
  const blockerAction = getReleaseCurrentOpenBlockerAction(normalizedBlockerId);
  const packageText = buildReleaseBlockerPackageText(blockerAction);
  if (!packageText) {
    setUiNotice('복사할 release blocker package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'release blocker package를 복사하세요.',
    shownNotice: 'release blocker package를 표시했습니다.',
    successNotice: 'release blocker package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerPackage(normalizedCopyKey);
  }
}

export async function copyReleaseProductionBlockerSummary({
  copyKey = '',
} = {}) {
  const summaryText = buildReleaseProductionBlockerSummaryText();
  if (!summaryText) {
    setUiNotice('복사할 production-ready blocker summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'production-ready blocker summary를 복사하세요.',
    shownNotice: 'production-ready blocker summary를 표시했습니다.',
    successNotice: 'production-ready blocker summary를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProductionBlockerSummary(copyKey);
  }
}

export async function copyReleaseProductionBlockerHandoff({
  blockerIndex = 0,
  copyKey = '',
} = {}) {
  const handoffText = buildReleaseProductionBlockerHandoffText({ blockerIndex });
  if (!handoffText) {
    setUiNotice('복사할 production-ready blocker handoff가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(handoffText, {
    promptMessage: 'production-ready blocker handoff를 복사하세요.',
    shownNotice: 'production-ready blocker handoff를 표시했습니다.',
    successNotice: 'production-ready blocker handoff를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProductionBlockerDetail({
      action: 'copy-release-production-blocker-handoff',
      blockerIndex,
      copyKey,
    });
  }
}

export async function copyReleaseProductionBlockerCommands({
  blockerIndex = 0,
  copyKey = '',
} = {}) {
  const commandText = buildReleaseProductionBlockerCommandText({ blockerIndex });
  if (!commandText) {
    setUiNotice('복사할 production-ready blocker 검증 명령이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'production-ready blocker 검증 명령을 복사하세요.',
    shownNotice: 'production-ready blocker 검증 명령을 표시했습니다.',
    successNotice: 'production-ready blocker 검증 명령을 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProductionBlockerDetail({
      action: 'copy-release-production-blocker-commands',
      blockerIndex,
      copyKey,
    });
  }
}

export async function copyReleaseProductionBlockerPackage({
  blockerIndex = 0,
  copyKey = '',
} = {}) {
  const packageText = buildReleaseProductionBlockerPackageText({ blockerIndex });
  if (!packageText) {
    setUiNotice('복사할 production-ready blocker package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'production-ready blocker package를 복사하세요.',
    shownNotice: 'production-ready blocker package를 표시했습니다.',
    successNotice: 'production-ready blocker package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProductionBlockerDetail({
      action: 'copy-release-production-blocker-package',
      blockerIndex,
      copyKey,
    });
  }
}

export async function copyReleaseProviderReadinessPackage({
  copyKey = '',
  provider = '',
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  const normalizedCopyKey = String(copyKey || normalizedProvider || '').trim();
  const packageText = buildReleaseProviderReadinessPackageText({ provider: normalizedProvider });
  if (!packageText) {
    setUiNotice('복사할 provider readiness handoff package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'provider readiness handoff package를 복사하세요.',
    shownNotice: 'provider readiness handoff package를 표시했습니다.',
    successNotice: normalizedProvider
      ? `${normalizedProvider} provider readiness handoff package를 복사했습니다.`
      : '전체 provider readiness handoff package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseProviderReadinessPackage(normalizedCopyKey);
  }
}

export async function copyReleaseBlockerFilterSummary({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const summaryText = buildReleaseBlockerSliceSummaryText(copyScope);
  if (!summaryText) {
    setUiNotice('복사할 release blocker slice summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'release blocker slice summary를 복사하세요.',
    shownNotice: 'release blocker slice summary를 표시했습니다.',
    successNotice: 'release blocker slice summary를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerSummary({
      action: 'copy-release-blocker-filter-summary',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerProviderOnlySummary({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only summary는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const summaryText = buildReleaseBlockerSliceSummaryText(copyScope);
  if (!summaryText) {
    setUiNotice('복사할 provider-only release blocker slice summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'provider-only release blocker slice summary를 복사하세요.',
    shownNotice: 'provider-only release blocker slice summary를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker slice summary를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerSummary({
      action: 'copy-release-blocker-provider-only-summary',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerApiLink({
  category = state.releaseBlockerCategoryFilter,
  copyAction = 'copy-release-blocker-api-link',
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  promptMessage = 'release blocker API 링크를 복사하세요.',
  provider = state.releaseBlockerProviderFilter,
  shownNotice = 'release blocker API 링크를 표시했습니다.',
  successNotice = 'release blocker API 링크를 복사했습니다.',
} = {}) {
  const apiUrl = buildReleaseBlockerApiUrl({ category, includeShared, owner, provider });
  if (!apiUrl) {
    setUiNotice('복사할 release blocker API 링크가 없습니다.');
    return;
  }

  const result = await copyUiLink(apiUrl, {
    promptMessage,
    shownNotice,
    successNotice,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseLink(copyAction, copyKey || apiUrl);
  }
}

export async function copyReleaseBlockerProviderOnlyApiLink({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only API 링크는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  await copyReleaseBlockerApiLink({
    category,
    copyAction: 'copy-release-blocker-provider-only-api-link',
    copyKey,
    includeShared: false,
    owner,
    promptMessage: 'provider-only release blocker API 링크를 복사하세요.',
    provider: normalizedProvider,
    shownNotice: 'provider-only release blocker API 링크를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker API 링크를 복사했습니다.`,
  });
}

export function getReleaseBlockerFilteredCopyScope({
  category = state.releaseBlockerCategoryFilter,
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedCategory = String(category || '').trim();
  const normalizedOwner = String(owner || '').trim();
  const normalizedProvider = String(provider || '').trim();
  const totalActions = getReleaseCurrentOpenBlockerActions();
  const blockerActions = totalActions.filter((item) =>
    isReleaseBlockerActionVisibleForCopyScope(item, {
      category: normalizedCategory,
      includeShared,
      owner: normalizedOwner,
      provider: normalizedProvider,
    }),
  );

  return {
    blockerActions,
    category: normalizedCategory,
    includeShared,
    owner: normalizedOwner,
    provider: normalizedProvider,
    totalActions,
  };
}

export async function copyReleaseBlockerFilterPackage({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const packageText = buildReleaseBlockerSlicePackageText(copyScope);
  if (!packageText) {
    setUiNotice('복사할 release blocker slice package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'release blocker slice package를 복사하세요.',
    shownNotice: 'release blocker slice package를 표시했습니다.',
    successNotice: 'release blocker slice package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerPackage({
      action: 'copy-release-blocker-filter-package',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerProviderOnlyPackage({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only package는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const packageText = buildReleaseBlockerSlicePackageText(copyScope);
  if (!packageText) {
    setUiNotice('복사할 provider-only release blocker package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packageText, {
    promptMessage: 'provider-only release blocker package를 복사하세요.',
    shownNotice: 'provider-only release blocker package를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker package를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerPackage({
      action: 'copy-release-blocker-provider-only-package',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerFilterClosureChecklist({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const checklistText = buildReleaseBlockerSliceClosureChecklistText(copyScope);
  if (!checklistText) {
    setUiNotice('복사할 release blocker slice closure checklist가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(checklistText, {
    promptMessage: 'release blocker slice closure checklist를 복사하세요.',
    shownNotice: 'release blocker slice closure checklist를 표시했습니다.',
    successNotice: 'release blocker slice closure checklist를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureChecklist({
      action: 'copy-release-blocker-filter-closure-checklist',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerProviderOnlyClosureChecklist({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only closure checklist는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const checklistText = buildReleaseBlockerSliceClosureChecklistText(copyScope);
  if (!checklistText) {
    setUiNotice('복사할 provider-only release blocker closure checklist가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(checklistText, {
    promptMessage: 'provider-only release blocker closure checklist를 복사하세요.',
    shownNotice: 'provider-only release blocker closure checklist를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker closure checklist를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureChecklist({
      action: 'copy-release-blocker-provider-only-closure-checklist',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerFilterClosureMatrixPackage({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const matrixText = buildReleaseBlockerClosureMatrixPackageText(copyScope);
  if (!matrixText) {
    setUiNotice('복사할 release blocker closure matrix package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(matrixText, {
    promptMessage: 'release blocker closure matrix package를 복사하세요.',
    shownNotice: 'release blocker closure matrix package를 표시했습니다.',
    successNotice: 'release blocker closure matrix package를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureMatrix({
      action: 'copy-release-blocker-filter-closure-matrix',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerProviderOnlyClosureMatrixPackage({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only closure matrix는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const matrixText = buildReleaseBlockerClosureMatrixPackageText(copyScope);
  if (!matrixText) {
    setUiNotice('복사할 provider-only release blocker closure matrix package가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(matrixText, {
    promptMessage: 'provider-only release blocker closure matrix package를 복사하세요.',
    shownNotice: 'provider-only release blocker closure matrix package를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker closure matrix package를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerClosureMatrix({
      action: 'copy-release-blocker-provider-only-closure-matrix',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceIntakeSummary({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const summaryText = buildReleaseTargetEvidenceIntakeSummaryText(copyScope);
  if (!summaryText) {
    setUiNotice('복사할 target evidence intake summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'target evidence intake summary를 복사하세요.',
    shownNotice: 'target evidence intake summary를 표시했습니다.',
    successNotice: 'target evidence intake summary를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceIntakeSummary({
      action: 'copy-release-target-evidence-intake-summary',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyIntakeSummary({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only target evidence summary는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const summaryText = buildReleaseTargetEvidenceIntakeSummaryText(copyScope);
  if (!summaryText) {
    setUiNotice('복사할 provider-only target evidence intake summary가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(summaryText, {
    promptMessage: 'provider-only target evidence intake summary를 복사하세요.',
    shownNotice: 'provider-only target evidence intake summary를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence intake summary를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceIntakeSummary({
      action: 'copy-release-target-evidence-provider-only-intake-summary',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceCaptureTemplate({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const templateText = buildReleaseTargetEvidenceCaptureTemplateText(copyScope);
  if (!templateText) {
    setUiNotice('복사할 target evidence capture template가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(templateText, {
    promptMessage: 'target evidence capture template를 복사하세요.',
    shownNotice: 'target evidence capture template를 표시했습니다.',
    successNotice: 'target evidence capture template를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceCaptureTemplate({
      action: 'copy-release-target-evidence-capture-template',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyCaptureTemplate({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only capture template는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const templateText = buildReleaseTargetEvidenceCaptureTemplateText(copyScope);
  if (!templateText) {
    setUiNotice('복사할 provider-only target evidence capture template가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(templateText, {
    promptMessage: 'provider-only target evidence capture template를 복사하세요.',
    shownNotice: 'provider-only target evidence capture template를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence capture template를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceCaptureTemplate({
      action: 'copy-release-target-evidence-provider-only-capture-template',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceRequiredCommands({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const commandText = buildReleaseTargetEvidenceRequiredCommandsText(copyScope);
  if (!commandText) {
    setUiNotice('복사할 target evidence required commands가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'target evidence required commands를 복사하세요.',
    shownNotice: 'target evidence required commands를 표시했습니다.',
    successNotice: 'target evidence required commands를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceRequiredCommands({
      action: 'copy-release-target-evidence-required-commands',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyRequiredCommands({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only required commands는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const commandText = buildReleaseTargetEvidenceRequiredCommandsText(copyScope);
  if (!commandText) {
    setUiNotice('복사할 provider-only target evidence required commands가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'provider-only target evidence required commands를 복사하세요.',
    shownNotice: 'provider-only target evidence required commands를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence required commands를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceRequiredCommands({
      action: 'copy-release-target-evidence-provider-only-required-commands',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProductionGap({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const gapText = buildReleaseTargetEvidenceProductionGapText(copyScope);
  if (!gapText) {
    setUiNotice('복사할 target evidence production gap이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(gapText, {
    promptMessage: 'target evidence production gap을 복사하세요.',
    shownNotice: 'target evidence production gap을 표시했습니다.',
    successNotice: 'target evidence production gap을 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceProductionGap({
      action: 'copy-release-target-evidence-production-gap',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyProductionGap({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only production gap은 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const gapText = buildReleaseTargetEvidenceProductionGapText(copyScope);
  if (!gapText) {
    setUiNotice('복사할 provider-only target evidence production gap guard가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(gapText, {
    promptMessage: 'provider-only target evidence production gap guard를 복사하세요.',
    shownNotice: 'provider-only target evidence production gap guard를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence production gap guard를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceProductionGap({
      action: 'copy-release-target-evidence-provider-only-production-gap',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceExceptionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const registerText = buildReleaseTargetEvidenceExceptionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 target evidence exception register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'target evidence exception register를 복사하세요.',
    shownNotice: 'target evidence exception register를 표시했습니다.',
    successNotice: 'target evidence exception register를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceExceptionRegister({
      action: 'copy-release-target-evidence-exception-register',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyExceptionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only exception register는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const registerText = buildReleaseTargetEvidenceExceptionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 provider-only target evidence exception register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'provider-only target evidence exception register를 복사하세요.',
    shownNotice: 'provider-only target evidence exception register를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence exception register를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceExceptionRegister({
      action: 'copy-release-target-evidence-provider-only-exception-register',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceRiskDecisionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const registerText = buildReleaseTargetEvidenceRiskDecisionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 target evidence risk decision register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'target evidence risk decision register를 복사하세요.',
    shownNotice: 'target evidence risk decision register를 표시했습니다.',
    successNotice: 'target evidence risk decision register를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceRiskDecisionRegister({
      action: 'copy-release-target-evidence-risk-decision-register',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyRiskDecisionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only risk decision register는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const registerText = buildReleaseTargetEvidenceRiskDecisionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 provider-only target evidence risk decision register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'provider-only target evidence risk decision register를 복사하세요.',
    shownNotice: 'provider-only target evidence risk decision register를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence risk decision register를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceRiskDecisionRegister({
      action: 'copy-release-target-evidence-provider-only-risk-decision-register',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderEvidenceReferences({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const referencesText = buildReleaseTargetEvidenceProviderEvidenceReferencesText(copyScope);
  if (!referencesText) {
    setUiNotice('복사할 target evidence provider references가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(referencesText, {
    promptMessage: 'target evidence provider references를 복사하세요.',
    shownNotice: 'target evidence provider references를 표시했습니다.',
    successNotice: 'target evidence provider references를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceProviderReferences({
      action: 'copy-release-target-evidence-provider-references',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyProviderEvidenceReferences({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only provider refs는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const referencesText = buildReleaseTargetEvidenceProviderEvidenceReferencesText(copyScope);
  if (!referencesText) {
    setUiNotice('복사할 provider-only target evidence provider references가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(referencesText, {
    promptMessage: 'provider-only target evidence provider references를 복사하세요.',
    shownNotice: 'provider-only target evidence provider references를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence provider references를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceProviderReferences({
      action: 'copy-release-target-evidence-provider-only-provider-references',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceResidualBlockers({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const blockersText = buildReleaseTargetEvidenceResidualBlockersText(copyScope);
  if (!blockersText) {
    setUiNotice('복사할 target evidence residual blockers가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(blockersText, {
    promptMessage: 'target evidence residual blockers를 복사하세요.',
    shownNotice: 'target evidence residual blockers를 표시했습니다.',
    successNotice: 'target evidence residual blockers를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceResidualBlockers({
      action: 'copy-release-target-evidence-residual-blockers',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyResidualBlockers({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only residual blockers는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const blockersText = buildReleaseTargetEvidenceResidualBlockersText(copyScope);
  if (!blockersText) {
    setUiNotice('복사할 provider-only target evidence residual blockers가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(blockersText, {
    promptMessage: 'provider-only target evidence residual blockers를 복사하세요.',
    shownNotice: 'provider-only target evidence residual blockers를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence residual blockers를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceResidualBlockers({
      action: 'copy-release-target-evidence-provider-only-residual-blockers',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceClosureRules({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const rulesText = buildReleaseTargetEvidenceClosureRulesText(copyScope);
  if (!rulesText) {
    setUiNotice('복사할 target evidence closure rules가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(rulesText, {
    promptMessage: 'target evidence closure rules를 복사하세요.',
    shownNotice: 'target evidence closure rules를 표시했습니다.',
    successNotice: 'target evidence closure rules를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceClosureRules({
      action: 'copy-release-target-evidence-closure-rules',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyClosureRules({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only closure rules는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const rulesText = buildReleaseTargetEvidenceClosureRulesText(copyScope);
  if (!rulesText) {
    setUiNotice('복사할 provider-only target evidence closure rules가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(rulesText, {
    promptMessage: 'provider-only target evidence closure rules를 복사하세요.',
    shownNotice: 'provider-only target evidence closure rules를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence closure rules를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceClosureRules({
      action: 'copy-release-target-evidence-provider-only-closure-rules',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceSubmissionManifest({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const manifestText = buildReleaseTargetEvidenceSubmissionManifestText(copyScope);
  if (!manifestText) {
    setUiNotice('복사할 target evidence submission manifest가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(manifestText, {
    promptMessage: 'target evidence submission manifest를 복사하세요.',
    shownNotice: 'target evidence submission manifest를 표시했습니다.',
    successNotice: 'target evidence submission manifest를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceSubmissionManifest({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlySubmissionManifest({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only submission manifest는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const manifestText = buildReleaseTargetEvidenceSubmissionManifestText(copyScope);
  if (!manifestText) {
    setUiNotice('복사할 provider-only target evidence submission manifest가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(manifestText, {
    promptMessage: 'provider-only target evidence submission manifest를 복사하세요.',
    shownNotice: 'provider-only target evidence submission manifest를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence submission manifest를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceSubmissionManifest({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceSanitizedRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const registerText = buildReleaseTargetEvidenceSanitizedRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 target evidence sanitized register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'target evidence sanitized register를 복사하세요.',
    shownNotice: 'target evidence sanitized register를 표시했습니다.',
    successNotice: 'target evidence sanitized register를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceSanitizedRegister({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlySanitizedRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only sanitized register는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const registerText = buildReleaseTargetEvidenceSanitizedRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 provider-only target evidence sanitized register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'provider-only target evidence sanitized register를 복사하세요.',
    shownNotice: 'provider-only target evidence sanitized register를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence sanitized register를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceSanitizedRegister({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceBoundaryMap({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const mapText = buildReleaseTargetEvidenceBoundaryConsistencyMapText(copyScope);
  if (!mapText) {
    setUiNotice('복사할 target evidence boundary map이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(mapText, {
    promptMessage: 'target evidence boundary map을 복사하세요.',
    shownNotice: 'target evidence boundary map을 표시했습니다.',
    successNotice: 'target evidence boundary map을 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceBoundaryMap({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyBoundaryMap({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only boundary map은 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const mapText = buildReleaseTargetEvidenceBoundaryConsistencyMapText(copyScope);
  if (!mapText) {
    setUiNotice('복사할 provider-only target evidence boundary consistency map이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(mapText, {
    promptMessage: 'provider-only target evidence boundary consistency map을 복사하세요.',
    shownNotice: 'provider-only target evidence boundary consistency map을 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence boundary consistency map을 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceBoundaryMap({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceCommandRerunLog({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const rerunLogText = buildReleaseTargetEvidenceCommandRerunLogText(copyScope);
  if (!rerunLogText) {
    setUiNotice('복사할 target evidence command rerun log가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(rerunLogText, {
    promptMessage: 'target evidence command rerun log를 복사하세요.',
    shownNotice: 'target evidence command rerun log를 표시했습니다.',
    successNotice: 'target evidence command rerun log를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceCommandRerunLog({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyCommandRerunLog({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only command log는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const rerunLogText = buildReleaseTargetEvidenceCommandRerunLogText(copyScope);
  if (!rerunLogText) {
    setUiNotice('복사할 provider-only target evidence command rerun log가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(rerunLogText, {
    promptMessage: 'provider-only target evidence command rerun log를 복사하세요.',
    shownNotice: 'provider-only target evidence command rerun log를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence command rerun log를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceCommandRerunLog({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceDecisionRecord({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const decisionText = buildReleaseTargetEvidenceReviewerDecisionRecordText(copyScope);
  if (!decisionText) {
    setUiNotice('복사할 target evidence reviewer decision record가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(decisionText, {
    promptMessage: 'target evidence reviewer decision record를 복사하세요.',
    shownNotice: 'target evidence reviewer decision record를 표시했습니다.',
    successNotice: 'target evidence reviewer decision record를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceDecisionRecord({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyDecisionRecord({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only decision record는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const decisionText = buildReleaseTargetEvidenceReviewerDecisionRecordText(copyScope);
  if (!decisionText) {
    setUiNotice('복사할 provider-only target evidence reviewer decision record가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(decisionText, {
    promptMessage: 'provider-only target evidence reviewer decision record를 복사하세요.',
    shownNotice: 'provider-only target evidence reviewer decision record를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence reviewer decision record를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceDecisionRecord({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceBlockerDispositionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const registerText = buildReleaseTargetEvidenceBlockerDispositionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 target evidence blocker disposition register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'target evidence blocker disposition register를 복사하세요.',
    shownNotice: 'target evidence blocker disposition register를 표시했습니다.',
    successNotice: 'target evidence blocker disposition register를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceBlockerDisposition({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyBlockerDispositionRegister({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only disposition register는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const registerText = buildReleaseTargetEvidenceBlockerDispositionRegisterText(copyScope);
  if (!registerText) {
    setUiNotice('복사할 provider-only target evidence blocker disposition register가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(registerText, {
    promptMessage: 'provider-only target evidence blocker disposition register를 복사하세요.',
    shownNotice: 'provider-only target evidence blocker disposition register를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence blocker disposition register를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceBlockerDisposition({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceReleaseRefreshEvidence({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const evidenceText = buildReleaseTargetEvidenceReleaseRefreshEvidenceText(copyScope);
  if (!evidenceText) {
    setUiNotice('복사할 target evidence release refresh evidence가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(evidenceText, {
    promptMessage: 'target evidence release refresh evidence를 복사하세요.',
    shownNotice: 'target evidence release refresh evidence를 표시했습니다.',
    successNotice: 'target evidence release refresh evidence를 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceReleaseRefresh({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyReleaseRefreshEvidence({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only refresh evidence는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const evidenceText = buildReleaseTargetEvidenceReleaseRefreshEvidenceText(copyScope);
  if (!evidenceText) {
    setUiNotice('복사할 provider-only target evidence release refresh evidence가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(evidenceText, {
    promptMessage: 'provider-only target evidence release refresh evidence를 복사하세요.',
    shownNotice: 'provider-only target evidence release refresh evidence를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence release refresh evidence를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceReleaseRefresh({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceIntakePacket({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const packetText = buildReleaseTargetEvidenceIntakePacketText(copyScope);
  if (!packetText) {
    setUiNotice('복사할 target evidence intake packet이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packetText, {
    promptMessage: 'target evidence intake packet을 복사하세요.',
    shownNotice: 'target evidence intake packet을 표시했습니다.',
    successNotice: 'target evidence intake packet을 복사했습니다.',
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceIntakePacket({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseTargetEvidenceProviderOnlyIntakePacket({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only target evidence packet은 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const packetText = buildReleaseTargetEvidenceIntakePacketText(copyScope);
  if (!packetText) {
    setUiNotice('복사할 provider-only target evidence packet이 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(packetText, {
    promptMessage: 'provider-only target evidence packet을 복사하세요.',
    shownNotice: 'provider-only target evidence packet을 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only target evidence packet을 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseTargetEvidenceIntakePacket({
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerFilterHandoff({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const handoffText = buildReleaseBlockerSliceHandoffText(copyScope);
  if (!handoffText) {
    setUiNotice('복사할 release blocker slice handoff가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(handoffText, {
    promptMessage: 'release blocker slice handoff를 복사하세요.',
    shownNotice: 'release blocker slice handoff를 표시했습니다.',
    successNotice: 'release blocker slice handoff를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerHandoff({
      action: 'copy-release-blocker-filter-handoff',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerProviderOnlyHandoff({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only handoff는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const handoffText = buildReleaseBlockerSliceHandoffText(copyScope);
  if (!handoffText) {
    setUiNotice('복사할 provider-only release blocker slice handoff가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(handoffText, {
    promptMessage: 'provider-only release blocker slice handoff를 복사하세요.',
    shownNotice: 'provider-only release blocker slice handoff를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker slice handoff를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerHandoff({
      action: 'copy-release-blocker-provider-only-handoff',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerFilterCommands({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const commandText = buildReleaseBlockerSliceCommandText(copyScope);
  if (!commandText) {
    setUiNotice('복사할 release blocker slice command가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'release blocker slice command를 복사하세요.',
    shownNotice: 'release blocker slice command를 표시했습니다.',
    successNotice: 'release blocker slice command를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerCommands({
      action: 'copy-release-blocker-filter-commands',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerProviderOnlyCommands({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only slice commands는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const commandText = buildReleaseBlockerSliceCommandText(copyScope);
  if (!commandText) {
    setUiNotice('복사할 provider-only release blocker slice commands가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(commandText, {
    promptMessage: 'provider-only release blocker slice commands를 복사하세요.',
    shownNotice: 'provider-only release blocker slice commands를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker slice commands를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerCommands({
      action: 'copy-release-blocker-provider-only-commands',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerFilterEvidence({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyScope = getReleaseBlockerFilteredCopyScope({ category, owner, provider });
  const evidenceText = buildReleaseBlockerSliceEvidenceText(copyScope);
  if (!evidenceText) {
    setUiNotice('복사할 release blocker slice evidence가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(evidenceText, {
    promptMessage: 'release blocker slice evidence를 복사하세요.',
    shownNotice: 'release blocker slice evidence를 표시했습니다.',
    successNotice: 'release blocker slice evidence를 복사했습니다.',
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerEvidence({
      action: 'copy-release-blocker-filter-evidence',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseBlockerProviderOnlyEvidence({
  category = state.releaseBlockerCategoryFilter,
  copyKey = '',
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const normalizedProvider = String(provider || '').trim();
  if (!normalizedProvider) {
    setUiNotice('provider-only slice evidence는 provider 필터를 먼저 선택해야 복사할 수 있습니다.');
    return;
  }

  const copyScope = getReleaseBlockerFilteredCopyScope({
    category,
    includeShared: false,
    owner,
    provider: normalizedProvider,
  });
  const evidenceText = buildReleaseBlockerSliceEvidenceText(copyScope);
  if (!evidenceText) {
    setUiNotice('복사할 provider-only release blocker slice evidence가 없습니다.');
    return;
  }

  const result = await copyPlainTextValue(evidenceText, {
    promptMessage: 'provider-only release blocker slice evidence를 복사하세요.',
    shownNotice: 'provider-only release blocker slice evidence를 표시했습니다.',
    successNotice: `${normalizedProvider} provider-only release blocker slice evidence를 복사했습니다.`,
  });
  if (result?.method && result.method !== 'unavailable') {
    markCopiedReleaseBlockerEvidence({
      action: 'copy-release-blocker-provider-only-evidence',
      category: copyScope.category,
      copyKey,
      includeShared: copyScope.includeShared,
      owner: copyScope.owner,
      provider: copyScope.provider,
    });
  }
}

export async function copyReleaseEvidenceDocLink({
  copyAction = 'copy-release-evidence-doc-link',
  copyKey = '',
  href = '',
  label = '',
} = {}) {
  const normalizedHref = String(href || '').trim();
  const normalizedLabel = String(label || 'release evidence doc').trim();
  if (!normalizedHref) {
    setUiNotice('복사할 evidence doc 링크가 없습니다.');
    return;
  }

  const docUrl = getAbsoluteReleaseUrl(normalizedHref);
  const result = await copyUiLink(docUrl, {
    promptMessage: `${normalizedLabel} 링크를 복사하세요.`,
    shownNotice: `${normalizedLabel} 링크를 표시했습니다.`,
    successNotice: `${normalizedLabel} 링크를 복사했습니다.`,
  });
  if (result.method !== 'unavailable') {
    markCopiedReleaseLink(copyAction, copyKey || normalizedHref);
  }
}

export async function copyReleaseHandoffPreviewLink({
  artifactId = state.releaseHandoffPreviewId,
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;

  if (!isReleaseHandoffPreviewable(handoffArtifact)) {
    setUiNotice('복사할 handoff preview 링크가 없습니다.');
    return;
  }

  const previewUrl = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'release',
    releaseHandoffPreviewId: normalizedArtifactId,
    stepId: 'step-output',
  })}`;

  const copyResult = await copyUiLink(previewUrl, {
    promptMessage: `${handoffArtifact.label || 'handoff preview'} 링크를 복사하세요.`,
    shownNotice: `${handoffArtifact.label || 'handoff preview'} 링크를 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact.label || 'handoff preview'} 링크를 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffPreviewLink(normalizedArtifactId);
  }
}

export async function copyReleaseHandoffStructuredSummary({
  artifactId = state.releaseHandoffPreviewId,
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;
  const overviewLine = getReleaseHandoffStructuredSummaryOverviewLine(handoffArtifact);
  if (!overviewLine) {
    setUiNotice('복사할 handoff summary가 없습니다.');
    return;
  }
  const copyResult = await copyPlainTextValue(overviewLine, {
    promptMessage: `${handoffArtifact?.label || 'handoff summary'} overview line을 복사하세요.`,
    shownNotice: `${handoffArtifact?.label || 'handoff summary'} overview line을 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact?.label || 'handoff summary'} overview line을 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffSummary(normalizedArtifactId);
  }
}

export async function copyReleaseHandoffStructuredSummaryDetail({
  artifactId = state.releaseHandoffPreviewId,
  detailKey = '',
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const normalizedDetailKey = normalizeUiParam(detailKey);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;
  const detailEntry = getReleaseHandoffStructuredSummaryDetails(handoffArtifact).find(
    (detail) => normalizeUiParam(detail.key) === normalizedDetailKey,
  );
  const overviewLine = String(detailEntry?.overviewLine || '').trim();
  if (!overviewLine) {
    setUiNotice('복사할 handoff summary detail이 없습니다.');
    return;
  }
  const copyResult = await copyPlainTextValue(overviewLine, {
    promptMessage: `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} line을 복사하세요.`,
    shownNotice: `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} line을 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} line을 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffSummaryDetail(normalizedArtifactId, normalizedDetailKey);
  }
}

export async function copyReleaseHandoffStructuredSummaryStableLine({
  artifactId = state.releaseHandoffPreviewId,
  detailKey = '',
  lineIndex = -1,
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const normalizedDetailKey = normalizeUiParam(detailKey);
  const normalizedLineIndex = Number.isInteger(lineIndex) ? lineIndex : Number.parseInt(lineIndex, 10);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;
  const detailEntry = getReleaseHandoffStructuredSummaryDetails(handoffArtifact).find(
    (detail) => normalizeUiParam(detail.key) === normalizedDetailKey,
  );
  const stableLine = String(detailEntry?.stableLines?.[normalizedLineIndex] || '').trim();
  if (!stableLine) {
    setUiNotice('복사할 handoff stable line이 없습니다.');
    return;
  }
  const copyResult = await copyPlainTextValue(stableLine, {
    promptMessage: `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} stable line을 복사하세요.`,
    shownNotice: `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} stable line을 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact?.label || 'handoff summary'} ${detailEntry?.label || 'detail'} stable line을 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffSummaryStableLine(normalizedArtifactId, normalizedDetailKey, normalizedLineIndex);
  }
}

export async function copyReleaseHandoffOpenLink({
  artifactId = '',
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const handoffArtifacts = state.releaseStatus?.handoffArtifacts || [];
  const handoffArtifact = handoffArtifacts.find((item) => String(item.id || '').trim() === normalizedArtifactId) || null;

  if (!handoffArtifact?.href) {
    setUiNotice('복사할 handoff artifact 링크가 없습니다.');
    return;
  }

  const artifactUrl = `${window.location.origin}${handoffArtifact.href}`;
  const copyResult = await copyUiLink(artifactUrl, {
    promptMessage: `${handoffArtifact.label || 'handoff artifact'} 열기 링크를 복사하세요.`,
    shownNotice: `${handoffArtifact.label || 'handoff artifact'} 열기 링크를 표시했습니다.`,
    successNotice: successNotice || `${handoffArtifact.label || 'handoff artifact'} 열기 링크를 복사했습니다.`,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedReleaseHandoffPreviewLink(normalizedArtifactId);
  }
}

export async function copyRetrievalSourceLink({
  sourceType = state.retrievalSourceFocusType,
  sourceLabel = state.retrievalSourceFocusLabel,
  successNotice = '현재 retrieval source 링크를 복사했습니다.',
} = {}) {
  const normalizedType = getSanitizedRetrievalSourceType(sourceType);
  const normalizedLabel = normalizeUiParam(sourceLabel);

  if (!state.selectedMissionId || !normalizedType || !normalizedLabel) {
    setUiNotice('복사할 retrieval source 링크가 없습니다.');
    return;
  }

  const retrievalUrl = `${window.location.origin}${buildUiStateUrl({
    detailTab: 'harness',
    retrievalSourceLabel: normalizedLabel,
    retrievalSourceType: normalizedType,
    stepId: 'step-setup',
  })}`;

  const copyResult = await copyUiLink(retrievalUrl, {
    promptMessage: '현재 retrieval source 링크를 복사하세요.',
    shownNotice: '현재 retrieval source 링크를 표시했습니다.',
    successNotice,
  });
  if (copyResult?.method === 'clipboard') {
    markCopiedRetrievalSource(normalizedType, normalizedLabel);
  }
}
