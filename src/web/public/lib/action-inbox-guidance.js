import { escapeHtml } from './html-format.js';

const EXTERNAL_HANDOFF_CLASSES = new Set([
  'awaiting-human-decision',
  'handoff-required',
]);

const DIRECT_REMEDIATION_TYPES = new Set([
  'maintenance-sweep',
  'provider-attention',
  'reviewer-follow-up',
  'specialist-follow-up',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function getPermissionDecision(item) {
  const permission = item?.permissionDecision || {};
  if (permission.approvalRequired === true) {
    return 'approval-required';
  }
  if (permission.allowed === false) {
    return 'deny';
  }
  if (permission.allowed === true) {
    return 'allow';
  }
  return normalizeText(permission.decision);
}

function requiresExternalHandoff(item) {
  const permissionDecision = getPermissionDecision(item);
  return (
    EXTERNAL_HANDOFF_CLASSES.has(normalizeText(item?.actionClass)) ||
    permissionDecision === 'approval-required' ||
    permissionDecision === 'deny'
  );
}

function getGuidanceLane(item) {
  if (requiresExternalHandoff(item)) {
    return 'external-handoff';
  }
  const actionType = normalizeText(item?.actionType);
  if (actionType === 'provider-attention' && getPermissionDecision(item) !== 'allow') {
    return 'operator-review';
  }
  if (DIRECT_REMEDIATION_TYPES.has(actionType)) {
    return 'operator-remediation';
  }
  return 'operator-review';
}

function getLaneView(lane) {
  if (lane === 'external-handoff') {
    return {
      className: 'status-failed',
      label: '외부 승인·인계 필요',
    };
  }
  if (lane === 'operator-remediation') {
    return {
      className: 'status-retry-ready',
      label: '즉시 실행 가능',
    };
  }
  return {
    className: 'status-running',
    label: '검토 후 실행',
  };
}

function getPermissionLabel(item, lane) {
  const permission = item?.permissionDecision || {};
  const decision = getPermissionDecision(item);
  const permissionId = normalizeText(item?.permissionDecisionId || permission.id);
  const policyId = normalizeText(permission.policyId);

  if (decision) {
    return [
      `permission ${decision}`,
      policyId ? `policy ${policyId}` : '',
      permissionId ? `record ${permissionId}` : '',
    ].filter(Boolean).join(' · ');
  }
  if (lane === 'external-handoff') {
    return `${normalizeText(item?.effectiveRecommendedOwner || item?.recommendedOwner) || 'human-approver'} 결정 기록 필요`;
  }
  if (lane === 'operator-remediation') {
    return '기존 web RBAC와 action mutation 경계에서 실행';
  }
  return 'operator 판단 뒤 기존 action 경계 사용';
}

function getClosureEvidence(item) {
  const actionType = normalizeText(item?.actionType);
  const actionId = normalizeText(item?.actionId || item?.id);

  if (actionType === 'approval') {
    return `approval ${normalizeText(item?.approvalId) || actionId} resolution record`;
  }
  if (actionType === 'owner-handoff') {
    return `escalation ${normalizeText(item?.escalationId) || actionId} owner handoff acknowledgement`;
  }
  if (actionType === 'learning-promotion') {
    return `learning candidate ${normalizeText(item?.learningCandidateId) || actionId} decision record`;
  }
  if (actionType === 'provider-attention') {
    const permissionId = normalizeText(item?.permissionDecisionId || item?.permissionDecision?.id);
    return [
      `provider attention ${actionId} acknowledgement or resolution`,
      permissionId ? `permission ${permissionId}` : '',
    ].filter(Boolean).join(' · ');
  }
  if (actionType === 'specialist-follow-up') {
    const runId = normalizeText(item?.runId || item?.specialistRootRunId || item?.parentRunId);
    return `specialist follow-up ${actionId} remediation result${runId ? ` · run ${runId}` : ''}`;
  }
  if (actionType === 'reviewer-follow-up') {
    return `reviewer follow-up ${actionId} resolution record`;
  }
  if (actionType === 'maintenance-sweep') {
    return `maintenance action ${actionId} run and audit record`;
  }
  if (actionType === 'accepted-risk-monitoring') {
    return `escalation ${normalizeText(item?.escalationId) || actionId} monitoring resolution`;
  }
  if (actionType === 'provider-health-drift') {
    return `mission ${normalizeText(item?.missionId) || actionId} provider timeline review`;
  }
  if (actionType === 'blocked-follow-up') {
    return `approval ${normalizeText(item?.sourceApprovalId) || actionId} scope revision record`;
  }
  return `action ${actionId || 'unknown'} state and audit record`;
}

export function createActionInboxGuidance(item = {}) {
  const lane = getGuidanceLane(item);
  const laneView = getLaneView(lane);

  return {
    closureEvidence: getClosureEvidence(item),
    lane,
    laneClassName: laneView.className,
    laneLabel: laneView.label,
    nextAction: normalizeText(item.recommendedCommand || item.commandHint) || '기록된 다음 행동 없음',
    owner: normalizeText(item.effectiveRecommendedOwner || item.recommendedOwner) || '담당 미지정',
    permission: getPermissionLabel(item, lane),
  };
}

export function summarizeActionInboxGuidance(items = []) {
  const summary = {
    externalHandoff: 0,
    operatorRemediation: 0,
    operatorReview: 0,
    total: 0,
  };

  for (const item of items) {
    const lane = getGuidanceLane(item);
    summary.total += 1;
    if (lane === 'external-handoff') {
      summary.externalHandoff += 1;
    } else if (lane === 'operator-remediation') {
      summary.operatorRemediation += 1;
    } else {
      summary.operatorReview += 1;
    }
  }

  return summary;
}

export function canRunActionInboxRerun(item = {}) {
  return (
    normalizeText(item.actionType) === 'reviewer-follow-up' &&
    normalizeText(item.actionClass) === 'retry-ready' &&
    Boolean(normalizeText(item.missionId))
  );
}

export function canRunProviderAttentionRemediation(item = {}) {
  return (
    normalizeText(item.actionType) === 'provider-attention' &&
    getGuidanceLane(item) === 'operator-remediation'
  );
}

export function renderActionInboxGuidance(item = {}) {
  const guidance = createActionInboxGuidance(item);
  return `
          <div class="action-inbox-guidance" data-action-inbox-guidance="${escapeHtml(guidance.lane)}">
            <div class="status-row">
              <span class="mini-badge ${escapeHtml(guidance.laneClassName)}">${escapeHtml(guidance.laneLabel)}</span>
            </div>
            <div class="item-meta"><strong>담당</strong> ${escapeHtml(guidance.owner)}</div>
            <div class="item-meta"><strong>권한</strong> ${escapeHtml(guidance.permission)}</div>
            <div class="item-meta mono"><strong>다음 행동</strong> ${escapeHtml(guidance.nextAction)}</div>
            <div class="item-meta"><strong>종료 증적</strong> ${escapeHtml(guidance.closureEvidence)}</div>
          </div>`;
}
