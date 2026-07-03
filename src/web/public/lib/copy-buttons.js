// Copy-action button renderers for the release, blocker, retrieval, and handoff surfaces.
//
// Each `render*CopyButton` produces the button HTML for a copy action, reading the
// "just copied" state via the `isCopied*` helpers and stable copy-keys from
// `./copy-state.js`. `renderReleaseCopiedActionButton` is the shared base renderer;
// `renderReleaseToggleActionButton` and `renderReleaseProviderNavigationButton` render
// the sibling non-copy release action buttons that live alongside the copy cluster.

import { state } from './app-state.js';
import { normalizeUiParam } from './ui-params.js';
import { escapeHtml } from './html-format.js';
import {
  getReleaseProductionBlockerSummaryCopyKey,
  getReleaseProviderReadinessPackageCopyKey,
  getRetrievalSourceActionLabel,
} from './status-labels.js';
import {
  getReleaseTargetEvidenceIntakeSummaryCopyKey,
  isCopiedReleaseTargetEvidenceIntakeSummary,
  getReleaseTargetEvidenceCaptureTemplateCopyKey,
  isCopiedReleaseTargetEvidenceCaptureTemplate,
  getReleaseTargetEvidenceRequiredCommandsCopyKey,
  isCopiedReleaseTargetEvidenceRequiredCommands,
  getReleaseTargetEvidenceProductionGapCopyKey,
  isCopiedReleaseTargetEvidenceProductionGap,
  getReleaseTargetEvidenceExceptionRegisterCopyKey,
  isCopiedReleaseTargetEvidenceExceptionRegister,
  getReleaseTargetEvidenceRiskDecisionRegisterCopyKey,
  isCopiedReleaseTargetEvidenceRiskDecisionRegister,
  getReleaseTargetEvidenceProviderReferencesCopyKey,
  isCopiedReleaseTargetEvidenceProviderReferences,
  getReleaseTargetEvidenceResidualBlockersCopyKey,
  isCopiedReleaseTargetEvidenceResidualBlockers,
  getReleaseTargetEvidenceClosureRulesCopyKey,
  isCopiedReleaseTargetEvidenceClosureRules,
  getReleaseTargetEvidenceSubmissionManifestCopyKey,
  isCopiedReleaseTargetEvidenceSubmissionManifest,
  getReleaseTargetEvidenceSanitizedRegisterCopyKey,
  isCopiedReleaseTargetEvidenceSanitizedRegister,
  getReleaseTargetEvidenceBoundaryMapCopyKey,
  isCopiedReleaseTargetEvidenceBoundaryMap,
  getReleaseTargetEvidenceCommandRerunLogCopyKey,
  isCopiedReleaseTargetEvidenceCommandRerunLog,
  getReleaseTargetEvidenceDecisionRecordCopyKey,
  isCopiedReleaseTargetEvidenceDecisionRecord,
  getReleaseTargetEvidenceBlockerDispositionCopyKey,
  isCopiedReleaseTargetEvidenceBlockerDisposition,
  getReleaseTargetEvidenceReleaseRefreshCopyKey,
  isCopiedReleaseTargetEvidenceReleaseRefresh,
  getReleaseTargetEvidenceIntakePacketCopyKey,
  isCopiedReleaseTargetEvidenceIntakePacket,
} from './release-target-evidence-copy.js';
import {
  getReleaseBlockerClosureChecklistCopyKey,
  getReleaseBlockerClosureMatrixCopyKey,
  getReleaseBlockerCommandsCopyKey,
  getReleaseBlockerEvidenceCopyKey,
  getReleaseBlockerHandoffCopyKey,
  getReleaseBlockerPackageCopyKey,
  getReleaseBlockerSummaryCopyKey,
  getReleaseProductionBlockerDetailCopyKey,
  isCopiedReleaseBlockerClosureChecklist,
  isCopiedReleaseBlockerClosureMatrix,
  isCopiedReleaseBlockerCommands,
  isCopiedReleaseBlockerEvidence,
  isCopiedReleaseBlockerHandoff,
  isCopiedReleaseBlockerPackage,
  isCopiedReleaseBlockerSummary,
  isCopiedReleaseCommand,
  isCopiedReleaseHandoffPreviewLink,
  isCopiedReleaseHandoffSummary,
  isCopiedReleaseHandoffSummaryDetail,
  isCopiedReleaseHandoffSummaryStableLine,
  isCopiedReleaseLink,
  isCopiedReleaseProductionBlockerDetail,
  isCopiedReleaseProductionBlockerSummary,
  isCopiedReleaseProviderReadinessPackage,
  isCopiedRetrievalSource,
} from './copy-state.js';

export function renderCurrentViewLinkCopyButton({
  buttonText = '현재 링크 복사',
  className = 'ghost-button',
  copiedText = '복사됨',
  targetLabel = '현재 흐름',
} = {}) {
  const copied = state.currentViewLinkCopied;
  const actionLabel = copied
    ? `현재 보기 링크 복사됨: ${targetLabel}`
    : `현재 보기 링크 복사: ${targetLabel}`;
  const nextClassName = `${className}${copied ? ' is-copied' : ''}`;
  return `<button class="${escapeHtml(nextClassName)}" type="button" data-ui-action="copy-view-link" aria-pressed="${copied ? 'true' : 'false'}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(copied ? copiedText : buttonText)}</button>`;
}

export function renderRetrievalSourceCopyButton({
  actionLabel = 'retrieval source 링크 복사',
  attributes = '',
  buttonText = '링크',
  className = 'ghost-button',
  copiedText = '복사됨',
  sourceLabel = '',
  sourceType = '',
} = {}) {
  const copied = isCopiedRetrievalSource(sourceType, sourceLabel);
  const nextActionLabel = getRetrievalSourceActionLabel(
    copied ? `${actionLabel}됨` : actionLabel,
    sourceType,
    sourceLabel,
  );
  const nextClassName = `${className}${copied ? ' is-copied' : ''}`;
  return `<button class="${escapeHtml(nextClassName)}" type="button" ${attributes} data-ui-action="copy-retrieval-source-link" data-ui-source-type="${escapeHtml(sourceType)}" data-ui-source-label="${escapeHtml(sourceLabel)}" aria-pressed="${copied ? 'true' : 'false'}" aria-label="${escapeHtml(nextActionLabel)}" title="${escapeHtml(nextActionLabel)}">${escapeHtml(copied ? copiedText : buttonText)}</button>`;
}

export function renderReleaseCopiedActionButton({
  action = '',
  actionLabel = 'release copy',
  attributes = '',
  buttonText = '복사',
  className = 'ghost-button',
  copied = false,
  copiedText = '복사됨',
  disabled = false,
} = {}) {
  const nextActionLabel = copied ? `${actionLabel} · 복사됨` : actionLabel;
  const nextClassName = `${className}${copied ? ' is-copied' : ''}`;
  return `<button class="${escapeHtml(nextClassName)}" type="button" ${attributes} data-ui-action="${escapeHtml(action)}" aria-pressed="${copied ? 'true' : 'false'}" aria-label="${escapeHtml(nextActionLabel)}" title="${escapeHtml(nextActionLabel)}" ${disabled ? 'disabled' : ''}>${escapeHtml(copied ? copiedText : buttonText)}</button>`;
}

export function renderReleaseToggleActionButton({
  action = '',
  actionLabel = '',
  attributes = '',
  buttonText = '',
  className = 'ghost-button',
  disabled = false,
  expanded = false,
  value = '',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^(toggle-release-production-blockers|toggle-release-history|toggle-release-handoff-preview)$/.test(actionName)) {
    return '';
  }
  const attributeList = [];
  if (attributes) {
    attributeList.push(attributes);
  }
  const valueName = String(value || '').trim();
  if (valueName) {
    attributeList.push(`data-ui-value="${escapeHtml(valueName)}"`);
  }
  const attributeMarkup = attributeList.length ? ` ${attributeList.join(' ')}` : '';
  return `<button class="${escapeHtml(className)}" type="button"${attributeMarkup} data-ui-action="${escapeHtml(actionName)}" aria-expanded="${expanded ? 'true' : 'false'}" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}"${disabled ? ' disabled' : ''}>${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseProviderNavigationButton({
  action = '',
  actionLabel = '',
  attributes = '',
  blocker = '',
  buttonText = '',
  className = 'ghost-button',
  disabled = null,
  outcome = '',
  pressed = null,
  provider = '',
  scope = '',
  value = '',
} = {}) {
  const actionName = String(action || '').trim();
  if (!/^(focus-release-blocker|focus-release-history|filter-release-history-provider|filter-release-history-scope|filter-release-history-attention|focus-release-flow)$/.test(actionName)) {
    return '';
  }
  const attributeList = [];
  if (attributes) {
    attributeList.push(attributes);
  }
  const blockerValue = String(blocker || '').trim();
  const valueName = String(value || '').trim();
  const outcomeName = String(outcome || '').trim();
  const scopeName = String(scope || '').trim();
  const providerName = String(provider || '').trim();
  if (blockerValue) {
    attributeList.push(`data-ui-blocker="${escapeHtml(blockerValue)}"`);
  }
  if (valueName) {
    attributeList.push(`data-ui-value="${escapeHtml(valueName)}"`);
  }
  if (outcomeName) {
    attributeList.push(`data-ui-outcome="${escapeHtml(outcomeName)}"`);
  }
  if (scopeName) {
    attributeList.push(`data-ui-scope="${escapeHtml(scopeName)}"`);
  }
  if (providerName) {
    attributeList.push(`data-ui-provider="${escapeHtml(providerName)}"`);
  }
  const attributeMarkup = attributeList.length ? ` ${attributeList.join(' ')}` : '';
  const pressedMarkup = pressed === true || pressed === false ? ` aria-pressed="${pressed ? 'true' : 'false'}"` : '';
  const disabledMarkup = disabled === true || disabled === false
    ? ` aria-disabled="${disabled ? 'true' : 'false'}"${disabled ? ' disabled' : ''}`
    : '';
  return `<button class="${escapeHtml(className)}" type="button"${attributeMarkup} data-ui-action="${escapeHtml(actionName)}"${pressedMarkup}${disabledMarkup} aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">${escapeHtml(buttonText)}</button>`;
}

export function renderReleaseCommandCopyButton({
  actionLabel = 'release command 복사',
  attributes = '',
  buttonText = '명령 복사',
  className = 'ghost-button',
  command = '',
  label = 'release command',
} = {}) {
  const copied = isCopiedReleaseCommand(command, label);
  return renderReleaseCopiedActionButton({
    action: 'copy-release-command',
    actionLabel,
    attributes: `${attributes} data-ui-label="${escapeHtml(label)}" data-ui-value="${escapeHtml(command)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseBlockerCommandsCopyButton({
  action = 'copy-release-blocker-filter-commands',
  actionLabel = 'release blocker slice commands 복사',
  attributes = '',
  buttonText = 'slice 명령 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseBlockerCommandsCopyKey(copyOptions);
  const copied = isCopiedReleaseBlockerCommands(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseBlockerEvidenceCopyButton({
  action = 'copy-release-blocker-filter-evidence',
  actionLabel = 'release blocker slice evidence 복사',
  attributes = '',
  buttonText = 'slice 근거 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseBlockerEvidenceCopyKey(copyOptions);
  const copied = isCopiedReleaseBlockerEvidence(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseLinkCopyButton({
  action = 'copy-release-triage-link',
  actionLabel = 'release 링크 복사',
  attributes = '',
  buttonText = '링크 복사',
  className = 'ghost-button',
  value = '',
} = {}) {
  const copied = isCopiedReleaseLink(action, value);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(value)}" data-ui-value="${escapeHtml(value)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseProviderReadinessPackageCopyButton({
  actionLabel = 'provider readiness package 복사',
  attributes = '',
  buttonText = 'provider package 복사',
  className = 'secondary-button',
  provider = '',
} = {}) {
  const copyKey = getReleaseProviderReadinessPackageCopyKey(provider);
  const copied = isCopiedReleaseProviderReadinessPackage(copyKey);
  const providerAttribute = normalizeUiParam(provider)
    ? `data-ui-provider="${escapeHtml(provider)}"`
    : '';
  return renderReleaseCopiedActionButton({
    action: 'copy-release-provider-readiness-package',
    actionLabel,
    attributes: `${attributes} ${providerAttribute} data-ui-copy-key="${escapeHtml(copyKey)}" data-release-provider-readiness-package="true"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseBlockerPackageCopyButton({
  action = 'copy-release-blocker-package',
  actionLabel = 'release blocker package 복사',
  attributes = '',
  blockerId = '',
  buttonText = 'package 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = '',
} = {}) {
  const nextCopyKey = getReleaseBlockerPackageCopyKey({
    action,
    blockerId,
    category,
    copyKey,
    includeShared,
    owner,
    provider,
  });
  const copied = isCopiedReleaseBlockerPackage(nextCopyKey);
  const providerAttribute = normalizeUiParam(provider)
    ? `data-ui-provider="${escapeHtml(provider)}"`
    : '';
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-blocker="${escapeHtml(blockerId)}" ${providerAttribute} data-ui-copy-key="${escapeHtml(nextCopyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseBlockerClosureChecklistCopyButton({
  action = 'copy-release-blocker-closure-checklist',
  actionLabel = 'release blocker closure checklist 복사',
  attributes = '',
  blockerId = '',
  buttonText = 'closure 체크리스트 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = '',
} = {}) {
  const nextCopyKey = getReleaseBlockerClosureChecklistCopyKey({
    action,
    blockerId,
    category,
    copyKey,
    includeShared,
    owner,
    provider,
  });
  const copied = isCopiedReleaseBlockerClosureChecklist(nextCopyKey);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-blocker="${escapeHtml(blockerId)}" data-ui-copy-key="${escapeHtml(nextCopyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseBlockerClosureMatrixCopyButton({
  action = 'copy-release-blocker-filter-closure-matrix',
  actionLabel = 'release blocker closure matrix 복사',
  attributes = '',
  buttonText = 'closure matrix 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseBlockerClosureMatrixCopyKey(copyOptions);
  const copied = isCopiedReleaseBlockerClosureMatrix(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseBlockerHandoffCopyButton({
  action = 'copy-release-blocker-handoff',
  actionLabel = 'release blocker handoff 복사',
  attributes = '',
  blockerId = '',
  buttonText = 'handoff 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  copyKey = '',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = '',
} = {}) {
  const nextCopyKey = getReleaseBlockerHandoffCopyKey({
    action,
    blockerId,
    category,
    copyKey,
    includeShared,
    owner,
    provider,
  });
  const copied = isCopiedReleaseBlockerHandoff(nextCopyKey);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-blocker="${escapeHtml(blockerId)}" data-ui-copy-key="${escapeHtml(nextCopyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseBlockerSummaryCopyButton({
  action = 'copy-release-blocker-filter-summary',
  actionLabel = 'release blocker slice summary 복사',
  attributes = '',
  buttonText = 'slice 요약 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseBlockerSummaryCopyKey(copyOptions);
  const copied = isCopiedReleaseBlockerSummary(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceIntakeSummaryCopyButton({
  action = 'copy-release-target-evidence-intake-summary',
  actionLabel = 'target evidence summary 복사',
  attributes = '',
  buttonText = 'target evidence summary 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceIntakeSummaryCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceIntakeSummary(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceCaptureTemplateCopyButton({
  action = 'copy-release-target-evidence-capture-template',
  actionLabel = 'target capture template 복사',
  attributes = '',
  buttonText = 'target capture template 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceCaptureTemplateCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceCaptureTemplate(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceRequiredCommandsCopyButton({
  action = 'copy-release-target-evidence-required-commands',
  actionLabel = 'target required commands 복사',
  attributes = '',
  buttonText = 'target required commands 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceRequiredCommandsCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceRequiredCommands(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceProductionGapCopyButton({
  action = 'copy-release-target-evidence-production-gap',
  actionLabel = 'target production gap 복사',
  attributes = '',
  buttonText = 'target production gap 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceProductionGapCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceProductionGap(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceExceptionRegisterCopyButton({
  action = 'copy-release-target-evidence-exception-register',
  actionLabel = 'target exception register 복사',
  attributes = '',
  buttonText = 'target exception register 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceExceptionRegisterCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceExceptionRegister(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceRiskDecisionRegisterCopyButton({
  action = 'copy-release-target-evidence-risk-decision-register',
  actionLabel = 'target risk decision 복사',
  attributes = '',
  buttonText = 'target risk decision 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceRiskDecisionRegisterCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceRiskDecisionRegister(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceProviderReferencesCopyButton({
  action = 'copy-release-target-evidence-provider-references',
  actionLabel = 'target provider refs 복사',
  attributes = '',
  buttonText = 'target provider refs 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceProviderReferencesCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceProviderReferences(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceResidualBlockersCopyButton({
  action = 'copy-release-target-evidence-residual-blockers',
  actionLabel = 'target residual blockers 복사',
  attributes = '',
  buttonText = 'target residual blockers 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceResidualBlockersCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceResidualBlockers(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceClosureRulesCopyButton({
  action = 'copy-release-target-evidence-closure-rules',
  actionLabel = 'target closure rules 복사',
  attributes = '',
  buttonText = 'target closure rules 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceClosureRulesCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceClosureRules(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceSubmissionManifestCopyButton({
  action = 'copy-release-target-evidence-submission-manifest',
  actionLabel = 'target submission manifest 복사',
  attributes = '',
  buttonText = 'target submission manifest 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceSubmissionManifestCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceSubmissionManifest(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceSanitizedRegisterCopyButton({
  action = 'copy-release-target-evidence-sanitized-register',
  actionLabel = 'target sanitized register 복사',
  attributes = '',
  buttonText = 'target sanitized register 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceSanitizedRegisterCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceSanitizedRegister(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceBoundaryMapCopyButton({
  action = 'copy-release-target-evidence-boundary-map',
  actionLabel = 'target boundary map 복사',
  attributes = '',
  buttonText = 'target boundary map 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceBoundaryMapCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceBoundaryMap(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceCommandRerunLogCopyButton({
  action = 'copy-release-target-evidence-command-rerun-log',
  actionLabel = 'target command log 복사',
  attributes = '',
  buttonText = 'target command log 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceCommandRerunLogCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceCommandRerunLog(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceDecisionRecordCopyButton({
  action = 'copy-release-target-evidence-decision-record',
  actionLabel = 'target decision record 복사',
  attributes = '',
  buttonText = 'target decision record 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceDecisionRecordCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceDecisionRecord(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceBlockerDispositionCopyButton({
  action = 'copy-release-target-evidence-blocker-disposition',
  actionLabel = 'target disposition register 복사',
  attributes = '',
  buttonText = 'target disposition register 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceBlockerDispositionCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceBlockerDisposition(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceReleaseRefreshCopyButton({
  action = 'copy-release-target-evidence-release-refresh',
  actionLabel = 'target refresh evidence 복사',
  attributes = '',
  buttonText = 'target refresh evidence 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceReleaseRefreshCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceReleaseRefresh(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseTargetEvidenceIntakePacketCopyButton({
  action = 'copy-release-target-evidence-intake-packet',
  actionLabel = 'target evidence packet 복사',
  attributes = '',
  buttonText = 'target evidence packet 복사',
  category = state.releaseBlockerCategoryFilter,
  className = 'ghost-button',
  includeShared = true,
  owner = state.releaseBlockerOwnerFilter,
  provider = state.releaseBlockerProviderFilter,
} = {}) {
  const copyOptions = { action, category, includeShared, owner, provider };
  const copyKey = getReleaseTargetEvidenceIntakePacketCopyKey(copyOptions);
  const copied = isCopiedReleaseTargetEvidenceIntakePacket(copyOptions);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(copyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseProductionBlockerSummaryCopyButton({
  actionLabel = 'production blocker summary 복사',
  attributes = '',
  buttonText = 'production summary 복사',
  className = 'ghost-button',
  copyKey = '',
  disabled = false,
} = {}) {
  const nextCopyKey = getReleaseProductionBlockerSummaryCopyKey(copyKey);
  const copied = isCopiedReleaseProductionBlockerSummary(nextCopyKey);
  return renderReleaseCopiedActionButton({
    action: 'copy-release-production-blocker-summary',
    actionLabel,
    attributes: `${attributes} data-ui-copy-key="${escapeHtml(nextCopyKey)}"`,
    buttonText,
    className,
    copied,
    disabled,
  });
}

export function renderReleaseProductionBlockerDetailCopyButton({
  action = 'copy-release-production-blocker-handoff',
  actionLabel = 'production blocker detail 복사',
  attributes = '',
  blockerIndex = state.releaseFocusedProductionBlockerIndex,
  buttonText = '복사',
  className = 'ghost-button',
  copyKey = '',
} = {}) {
  const copyOptions = { action, blockerIndex, copyKey };
  const nextCopyKey = getReleaseProductionBlockerDetailCopyKey(copyOptions);
  const copied = isCopiedReleaseProductionBlockerDetail({ action, blockerIndex, copyKey: nextCopyKey });
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-index="${escapeHtml(blockerIndex)}" data-ui-copy-key="${escapeHtml(nextCopyKey)}"`,
    buttonText,
    className,
    copied,
  });
}

export function renderReleaseHandoffLinkCopyButton({
  action = 'copy-release-handoff-preview-link',
  actionLabel = 'handoff preview 링크 복사',
  artifactId = '',
  attributes = '',
  buttonText = '링크',
  className = 'ghost-button',
  copiedText = '복사됨',
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const copied = isCopiedReleaseHandoffPreviewLink(normalizedArtifactId);
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} data-ui-success-notice="${escapeHtml(successNotice)}" data-ui-value="${escapeHtml(normalizedArtifactId)}"`,
    buttonText,
    className,
    copied,
    copiedText,
  });
}

export function renderReleaseHandoffStructuredSummaryCopyButton({
  action = 'copy-release-handoff-structured-summary',
  actionLabel = 'handoff summary overview 복사',
  artifactId = '',
  attributes = '',
  buttonText = 'overview 복사',
  className = 'ghost-button',
  copiedText = '복사됨',
  detailKey = '',
  lineIndex = -1,
  successNotice = '',
} = {}) {
  const normalizedArtifactId = normalizeUiParam(artifactId);
  const normalizedDetailKey = normalizeUiParam(detailKey);
  const normalizedLineIndex = Number.isInteger(lineIndex) ? lineIndex : Number.parseInt(lineIndex, 10);
  const copied = action === 'copy-release-handoff-structured-summary-detail'
    ? isCopiedReleaseHandoffSummaryDetail(normalizedArtifactId, normalizedDetailKey)
    : action === 'copy-release-handoff-structured-summary-stable-line'
      ? isCopiedReleaseHandoffSummaryStableLine(normalizedArtifactId, normalizedDetailKey, normalizedLineIndex)
      : isCopiedReleaseHandoffSummary(normalizedArtifactId);
  const detailAttribute = normalizedDetailKey
    ? `data-ui-detail-key="${escapeHtml(normalizedDetailKey)}"`
    : '';
  const lineIndexAttribute = Number.isInteger(normalizedLineIndex) && normalizedLineIndex >= 0
    ? `data-ui-line-index="${escapeHtml(String(normalizedLineIndex))}"`
    : '';
  return renderReleaseCopiedActionButton({
    action,
    actionLabel,
    attributes: `${attributes} ${detailAttribute} ${lineIndexAttribute} data-ui-success-notice="${escapeHtml(successNotice)}" data-ui-value="${escapeHtml(normalizedArtifactId)}"`,
    buttonText,
    className,
    copied,
    copiedText,
  });
}
