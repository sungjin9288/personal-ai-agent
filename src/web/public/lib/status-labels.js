// Extracted pure UI helpers (round 2). Byte-identical function/const bodies moved
// from app.js; served as an ES module under /lib/.
import {
  formatDate,
  getDisplayLabel,
} from './html-format.js';
import {
  formatLearningPromotionAuditValue,
  getLearningPromotionCandidateId,
  inferCommandOption,
  inferFallbackPolicyFromCommand,
} from './text-format.js';
import {
  getRetrievalArtifactTargetLabel,
  normalizeUiParam,
} from './ui-params.js';

export const SPECIALIST_KIND_META = {
  design: {
    badge: 'UX',
    description: '정보 구조, 화면 흐름, 사용자 언어를 다듬습니다.',
    label: '디자인 AI',
    shortLabel: '디자인',
  },
  documentation: {
    badge: 'DOC',
    description: '핸드오프 문서, 체크리스트, 운영 정리를 맡습니다.',
    label: '문서화 AI',
    shortLabel: '문서화',
  },
  implementation: {
    badge: 'IMP',
    description: '구현안과 산출물 초안을 빠르게 만듭니다.',
    label: '구현 AI',
    shortLabel: '구현',
  },
  research: {
    badge: 'RES',
    description: '리스크, 옵션, 근거와 unknown을 먼저 정리합니다.',
    label: '리서치 AI',
    shortLabel: '리서치',
  },
  verification: {
    badge: 'VER',
    description: '검증 기준, 테스트 관점, 완료 신호를 점검합니다.',
    label: '검증 AI',
    shortLabel: '검증',
  },
};

export function formatSpecialistShortLabel(kind = '') {
  const meta = SPECIALIST_KIND_META[String(kind || '').trim()];
  return meta?.shortLabel || getDisplayLabel(kind, kind);
}

export function getRetrievalSourceActionLabel(actionLabel = 'retrieval source', sourceType = '', sourceLabel = '') {
  const sourceTitle = formatRetrievalSourceLabel({ sourceLabel, sourceType });
  return `${String(actionLabel || 'retrieval source').trim()}: ${sourceTitle}`;
}

export function getRetrievalArtifactOpenLabel(artifact = {}, actionLabel = 'retrieval 근거 열기') {
  return `${String(actionLabel || 'retrieval 근거 열기').trim()}: ${getRetrievalArtifactTargetLabel(artifact)}`;
}

export function getReleaseProviderReadinessPackageCopyKey(provider = '') {
  return normalizeUiParam(provider) || 'all-providers';
}

export function getReleaseProductionBlockerSummaryCopyKey(copyKey = '') {
  return normalizeUiParam(copyKey) || 'copy-release-production-blocker-summary';
}

export function getReleaseActionButtonContext(button, context = {}) {
  const action = String(button?.dataset?.uiAction || '').trim();
  const provider = String(button?.dataset?.uiProvider || '').trim();
  const blocker = String(button?.dataset?.uiBlocker || '').trim();
  const category = String(button?.dataset?.uiCategory || '').trim();
  const owner = String(button?.dataset?.uiOwner || '').trim();
  const index = String(button?.dataset?.uiIndex || '').trim();
  const label = String(button?.dataset?.uiLabel || '').trim();
  const href = String(button?.dataset?.uiHref || '').trim();
  const parts = [];

  if (provider) {
    parts.push(`provider ${provider}`);
  }
  if (blocker) {
    parts.push(`blocker ${blocker}`);
  }
  if (index) {
    parts.push(`production blocker #${Number(index) + 1}`);
  }
  if (label) {
    parts.push(label);
  }
  if (href && !label) {
    parts.push(href);
  }
  if (action === 'filter-release-blockers') {
    parts.push(`category ${category || 'all'}`);
    parts.push(`owner ${owner || 'all'}`);
    parts.push(`provider ${provider || 'all'}`);
    if (button?.dataset?.uiIncludeShared) {
      parts.push(`shared provider ops ${button.dataset.uiIncludeShared === 'true' ? 'included' : 'excluded'}`);
    }
  } else if (action.includes('target-evidence-provider-only')) {
    parts.push(`provider-only ${context.blockerProviderLabel || provider || 'provider'}`);
  } else if (action.includes('target-evidence')) {
    parts.push('target evidence intake');
  } else if (action.includes('blocker-provider-only')) {
    parts.push(`provider-only ${context.blockerProviderLabel || provider || 'provider'}`);
  } else if (action.includes('blocker-filter')) {
    parts.push(`triage slice ${context.blockerFilterLabel || 'all current blockers'}`);
  } else if (action.includes('production-blocker')) {
    parts.push('production-ready blocker');
  } else if (action.includes('release-blocker')) {
    parts.push(`current blocker ${context.focusedBlockerLabel || context.blockerFilterLabel || 'release blocker'}`);
  }

  return parts.filter(Boolean).join(' · ') || context.releaseActionLabel || 'release';
}

export function applyReleaseActionButtonLabels(root, context = {}) {
  if (!root) {
    return;
  }
  root.querySelectorAll('button[data-ui-action]').forEach((button) => {
    const hasLabel = String(button.getAttribute('aria-label') || '').trim();
    const hasTitle = String(button.getAttribute('title') || '').trim();
    if (hasLabel && hasTitle) {
      return;
    }
    const visibleLabel = String(button.textContent || button.dataset.uiAction || 'release action')
      .replace(/\s+/g, ' ')
      .trim();
    const contextLabel = getReleaseActionButtonContext(button, context);
    const actionLabel = `${visibleLabel}: ${contextLabel}`;
    if (!hasLabel) {
      button.setAttribute('aria-label', actionLabel);
    }
    if (!hasTitle) {
      button.setAttribute('title', actionLabel);
    }
  });
}

export function getReleaseProviderClosureSummary(providerReadinessEntry = {}, providerBlockerActions = []) {
  const summary = providerReadinessEntry?.blockerClosureVerification || {};
  const blockerActions = Array.isArray(providerBlockerActions) ? providerBlockerActions : [];
  const fallbackClosureIds = blockerActions
    .map((action) => String(getReleaseBlockerClosureVerification(action).id || '').trim())
    .filter(Boolean);
  const fallbackCommands = blockerActions.flatMap((action) => getReleaseBlockerRequiredCommands(action));
  const fallbackEvidenceDocs = new Set(
    blockerActions
      .flatMap((action) => getReleaseBlockerRequiredEvidenceDocs(action))
      .map((doc) => String(doc?.href || doc?.path || doc?.label || '').trim())
      .filter(Boolean),
  );
  const fallbackRequiredProofs = new Set(blockerActions.flatMap((action) => getReleaseBlockerRequiredProofs(action)));
  const productionReadyBlockedCount = Number.isFinite(Number(summary.productionReadyBlockedCount))
    ? Number(summary.productionReadyBlockedCount)
    : blockerActions.filter((action) =>
      getReleaseBlockerClosureVerification(action).productionReadyClaimAllowed === false,
    ).length;
  const targetBoundaryRequiredCount = Number.isFinite(Number(summary.targetBoundaryRequiredCount))
    ? Number(summary.targetBoundaryRequiredCount)
    : blockerActions.filter((action) =>
      getReleaseBlockerClosureVerification(action).targetBoundaryRequired === true,
    ).length;

  return {
    closureVerificationCount: Number.isFinite(Number(summary.closureVerificationCount))
      ? Number(summary.closureVerificationCount)
      : fallbackClosureIds.length,
    commandCount: Number.isFinite(Number(summary.commandCount))
      ? Number(summary.commandCount)
      : fallbackCommands.length,
    evidenceDocCount: Number.isFinite(Number(summary.evidenceDocCount))
      ? Number(summary.evidenceDocCount)
      : fallbackEvidenceDocs.size,
    productionReadyBlockedCount,
    productionReadyClaimAllowed: summary.productionReadyClaimAllowed === true
      && productionReadyBlockedCount === 0,
    requiredProofCount: Number.isFinite(Number(summary.requiredProofCount))
      ? Number(summary.requiredProofCount)
      : fallbackRequiredProofs.size,
    targetBoundaryRequiredCount,
  };
}

export function isReleaseSharedProviderBlockerAction(blockerAction = null) {
  return String(blockerAction?.category || '').trim() === 'provider-operations';
}

export function getReleaseBlockerClosureVerification(blockerAction = {}) {
  return blockerAction && typeof blockerAction.closureVerification === 'object' && blockerAction.closureVerification
    ? blockerAction.closureVerification
    : {};
}

export function getReleaseBlockerRequiredCommands(blockerAction = {}) {
  const closureVerification = getReleaseBlockerClosureVerification(blockerAction);
  if (Array.isArray(closureVerification.requiredCommands)) {
    return closureVerification.requiredCommands;
  }
  return Array.isArray(blockerAction.commands) ? blockerAction.commands : [];
}

export function getReleaseBlockerRequiredEvidenceDocs(blockerAction = {}) {
  const closureVerification = getReleaseBlockerClosureVerification(blockerAction);
  if (Array.isArray(closureVerification.requiredEvidenceDocs)) {
    return closureVerification.requiredEvidenceDocs;
  }
  return Array.isArray(blockerAction.evidenceDocs) ? blockerAction.evidenceDocs : [];
}

export function getReleaseBlockerRequiredProofs(blockerAction = {}) {
  const closureVerification = getReleaseBlockerClosureVerification(blockerAction);
  return Array.isArray(closureVerification.requiredProofs) ? closureVerification.requiredProofs : [];
}

export function formatRetrievalSourceLabel(item = {}) {
  const sourceType = String(item.sourceType || '').trim();
  const sourceLabel = String(item.sourceLabel || item.fileName || '').trim();

  if (!sourceLabel) {
    return sourceType === 'attachment' ? '첨부' : '메모';
  }

  if (sourceType === 'memory') {
    const [scope = 'memory', kind = 'note'] = sourceLabel.split('/');
    return `${getDisplayLabel(scope, scope)} · ${getDisplayLabel(kind, kind)}`;
  }

  return sourceLabel;
}

export function inferFallbackProviderFromCommand(command = '') {
  return inferCommandOption(command, '--fallback-provider');
}

export function getProviderAttentionRemediationPayload(item, mode = 'primary') {
  if (!item || mode === 'primary') {
    return {};
  }

  const command =
    mode === 'recoverable-fallback'
      ? item.recoverableFallbackRecommendedCommand || item.fallbackRecommendedCommand || ''
      : item.fallbackRecommendedCommand || item.recoverableFallbackRecommendedCommand || '';
  const fallbackProvider = item.fallbackProviderId || inferFallbackProviderFromCommand(command);
  const fallbackPolicy =
    mode === 'recoverable-fallback'
      ? 'recoverable-provider-failure-only'
      : inferFallbackPolicyFromCommand(command) || item.fallbackPolicyId || 'provider-failure-only';

  return {
    fallbackPolicy,
    fallbackProvider,
  };
}

export function formatSpecialistFollowUpRoute(item) {
  const route = item?.remediationRoute || null;
  if (!route) {
    return '';
  }

  return [
    route.routeType ? `route ${route.routeType}` : '',
    route.routeUrgency ? `urgency ${route.routeUrgency}` : '',
    item.retryPolicy ? `retry ${item.retryPolicy}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export function buildLearningPromotionAuditPackageText(item) {
  if (item?.actionType !== 'learning-promotion') {
    return '';
  }

  const candidateId = getLearningPromotionCandidateId(item);
  if (!candidateId) {
    return '';
  }

  const evidencePolicy = item.evidencePolicy || {};
  const autoPromotionAllowed =
    typeof item.autoPromotionAllowed === 'boolean' ? item.autoPromotionAllowed : item.autoPromotion === true;

  return [
    'Learning promotion audit package',
    '',
    '[Identity]',
    `learningCandidateId: ${candidateId}`,
    `actionId: ${formatLearningPromotionAuditValue(item.actionId)}`,
    `missionId: ${formatLearningPromotionAuditValue(item.missionId)}`,
    `workspaceId: ${formatLearningPromotionAuditValue(item.workspaceId)}`,
    `workspaceName: ${formatLearningPromotionAuditValue(item.workspaceName)}`,
    `sessionId: ${formatLearningPromotionAuditValue(item.sessionId)}`,
    '',
    '[Promotion]',
    `promotionStatus: ${formatLearningPromotionAuditValue(item.promotionStatus)}`,
    `promotionStopReason: ${formatLearningPromotionAuditValue(item.promotionStopReason)}`,
    `promotionVerificationStatus: ${formatLearningPromotionAuditValue(item.promotionVerificationStatus)}`,
    `promotionVerificationStopReason: ${formatLearningPromotionAuditValue(item.promotionVerificationStopReason)}`,
    `proposalTarget: ${formatLearningPromotionAuditValue(item.proposalTarget)}`,
    `scope: ${formatLearningPromotionAuditValue(item.scope)}`,
    `scopeId: ${formatLearningPromotionAuditValue(item.scopeId)}`,
    `recordType: ${formatLearningPromotionAuditValue(item.recordType)}`,
    `reviewerVerdict: ${formatLearningPromotionAuditValue(item.reviewerVerdict)}`,
    '',
    '[Gateway and provider evidence]',
    `gatewayEventId: ${formatLearningPromotionAuditValue(item.gatewayEventId)}`,
    `gatewayEventRoute: ${formatLearningPromotionAuditValue(item.gatewayEventRoute)}`,
    `gatewayEventType: ${formatLearningPromotionAuditValue(item.gatewayEventType)}`,
    `providerId: ${formatLearningPromotionAuditValue(item.providerId)}`,
    `providerFallbackPolicy: ${formatLearningPromotionAuditValue(item.providerFallbackPolicy)}`,
    `providerFallbackUsed: ${formatLearningPromotionAuditValue(item.providerFallbackUsed)}`,
    `providerFallbackPrimaryProviderId: ${formatLearningPromotionAuditValue(item.providerFallbackPrimaryProviderId)}`,
    `providerFallbackSelectedProviderId: ${formatLearningPromotionAuditValue(item.providerFallbackSelectedProviderId)}`,
    `providerFallbackStopReasonCounts: ${formatLearningPromotionAuditValue(item.providerFallbackStopReasonCounts)}`,
    `providerFailureKind: ${formatLearningPromotionAuditValue(item.providerFailureKind)}`,
    `providerFailureRecoverable: ${formatLearningPromotionAuditValue(item.providerFailureRecoverable)}`,
    '',
    '[Safety and approval]',
    `approvalRequired: ${formatLearningPromotionAuditValue(item.approvalRequired)}`,
    `reviewerRequired: ${formatLearningPromotionAuditValue(item.reviewerRequired)}`,
    `autoPromotionAllowed: ${formatLearningPromotionAuditValue(autoPromotionAllowed)}`,
    `rollbackEligible: ${formatLearningPromotionAuditValue(item.rollbackEligible)}`,
    `productionReadyClaim: false`,
    `scopeLocked: ${formatLearningPromotionAuditValue(evidencePolicy.scopeLocked)}`,
    `promotionRequiresApproval: ${formatLearningPromotionAuditValue(evidencePolicy.promotionRequiresApproval)}`,
    `crossScopePromotionAllowed: ${formatLearningPromotionAuditValue(evidencePolicy.crossScopePromotionAllowed)}`,
    `noRawSecrets: ${formatLearningPromotionAuditValue(evidencePolicy.noRawSecrets)}`,
    `noRawCustomerPayloads: ${formatLearningPromotionAuditValue(evidencePolicy.noRawCustomerPayloads)}`,
    `rawPayloadIncluded: ${formatLearningPromotionAuditValue(evidencePolicy.rawPayloadIncluded)}`,
    '',
    '[Reminder and expiration]',
    `needsReminder: ${formatLearningPromotionAuditValue(item.needsReminder)}`,
    `reminderCadenceHours: ${formatLearningPromotionAuditValue(item.reminderCadenceHours)}`,
    `reminderCount: ${formatLearningPromotionAuditValue(item.reminderCount)}`,
    `lastReminderAt: ${formatLearningPromotionAuditValue(item.lastReminderAt)}`,
    `nextReminderAt: ${formatLearningPromotionAuditValue(item.nextReminderAt)}`,
    `expirationStatus: ${formatLearningPromotionAuditValue(item.expirationPolicy?.status)}`,
    `expiresAt: ${formatLearningPromotionAuditValue(item.expirationPolicy?.expiresAt)}`,
    '',
    '[Commands]',
    `recommendedCommand: ${formatLearningPromotionAuditValue(item.recommendedCommand)}`,
    `resolveCommand: ${formatLearningPromotionAuditValue(item.resolveCommand)}`,
    `expireCommand: ${formatLearningPromotionAuditValue(item.expireCommand)}`,
    `rollbackCommand: ${formatLearningPromotionAuditValue(item.rollbackCommand)}`,
    `stopConditionRejectCommand: ${formatLearningPromotionAuditValue(item.stopConditionRejectCommand)}`,
    `remindCommand: ${formatLearningPromotionAuditValue(item.remindCommand)}`,
    '',
    '[Operator guardrails]',
    '- Do not promote autonomously; keep learning promotion behind explicit human approval.',
    '- Keep scope locked to the candidate scope unless a reviewer creates a new candidate.',
    '- Reject or expire the candidate when verification evidence is missing or unsafe.',
    '- Roll back promoted memory first if the promoted behavior regresses.',
  ].join('\n');
}

export function formatLearningPromotionDetails(item) {
  if (item?.actionType !== 'learning-promotion') {
    return '';
  }

  return [
    item.promotionStatus ? `status ${item.promotionStatus}` : '',
    item.proposalTarget ? `target ${item.proposalTarget}` : '',
    item.scope ? `scope ${item.scope}` : '',
    item.recordType ? `record ${item.recordType}` : '',
    item.gatewayEventRoute ? `gateway ${item.gatewayEventRoute}` : '',
    item.providerId ? `provider ${item.providerId}` : '',
    item.providerFallbackPolicy ? `fallback ${item.providerFallbackPolicy}` : '',
    item.providerFallbackUsed ? 'fallback used' : '',
    item.providerFailureKind ? `failure ${item.providerFailureKind}` : '',
    item.promotionStopReason ? `stop ${item.promotionStopReason}` : '',
    item.promotionVerificationStatus ? `verification ${item.promotionVerificationStatus}` : '',
    item.autoPromotionAllowed === false || item.autoPromotion === false ? 'auto-promotion off' : '',
    item.rollbackEligible ? 'rollback eligible' : '',
    item.reminderCadenceHours ? `reminder ${item.reminderCadenceHours}h` : '',
    item.needsReminder ? 'reminder due' : '',
    Number(item.reminderCount || 0) ? `reminders ${item.reminderCount}` : '',
    item.expirationPolicy?.status ? `expiration ${item.expirationPolicy.status}` : '',
    item.expirationPolicy?.expiresAt ? `expires ${formatDate(item.expirationPolicy.expiresAt)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}
