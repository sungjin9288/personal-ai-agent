import { escapeHtml } from './html-format.js';
import {
  getReleaseBlockerClosureVerification,
  getReleaseBlockerRequiredCommands,
  getReleaseBlockerRequiredEvidenceDocs,
  getReleaseBlockerRequiredProofs,
} from './status-labels.js';

function normalizeCommand(command = null) {
  const value = String(command?.command || '').trim();
  if (!value) {
    return null;
  }
  return {
    command: value,
    kind: String(command?.kind || 'verification').trim() || 'verification',
    label: String(command?.label || '검증 명령').trim() || '검증 명령',
  };
}

function normalizeEvidenceDoc(doc = null) {
  const href = String(doc?.href || '').trim();
  const label = String(doc?.label || doc?.path || '').trim();
  const path = String(doc?.path || '').trim();
  if (!href && !label && !path) {
    return null;
  }
  return { href, label: label || path, path };
}

function getClaimView(productionReadyClaimAllowed) {
  if (productionReadyClaimAllowed === true) {
    return { className: 'status-completed', label: 'claim allowed' };
  }
  if (productionReadyClaimAllowed === false) {
    return { className: 'status-failed', label: 'claim blocked' };
  }
  return { className: 'status-failed', label: 'claim unverified' };
}

function getDecisionText(targetBoundaryRequired) {
  if (targetBoundaryRequired === true) {
    return '승인된 target boundary의 증적과 명령 결과가 같은 blocker 기록에 연결되어야 합니다.';
  }
  if (targetBoundaryRequired === false) {
    return '증적과 명령 결과를 같은 blocker 기록에 연결한 뒤 closure를 다시 확인합니다.';
  }
  return 'closure 판정 경계가 기록되지 않았습니다. blocker package에서 완료 조건을 먼저 확인하세요.';
}

export function createReleaseVerificationFlow(blockerAction = null, {
  fallbackCommand = null,
} = {}) {
  const blocker = blockerAction || {};
  const closureVerification = getReleaseBlockerClosureVerification(blocker);
  const commands = getReleaseBlockerRequiredCommands(blocker);
  const evidenceDocs = getReleaseBlockerRequiredEvidenceDocs(blocker);
  const requiredProofs = getReleaseBlockerRequiredProofs(blocker)
    .map((proof) => String(proof || '').trim())
    .filter(Boolean);
  const command = commands.map(normalizeCommand).find(Boolean) || normalizeCommand(fallbackCommand);
  const evidenceDoc = evidenceDocs.map(normalizeEvidenceDoc).find(Boolean) || null;
  const nextEvidence = String(blocker.nextEvidence || requiredProofs[0] || '').trim();
  const productionReadyClaimAllowed = typeof closureVerification.productionReadyClaimAllowed === 'boolean'
    ? closureVerification.productionReadyClaimAllowed
    : null;
  const targetBoundaryRequired = typeof closureVerification.targetBoundaryRequired === 'boolean'
    ? closureVerification.targetBoundaryRequired
    : null;

  return {
    blockerId: String(blocker.id || '').trim(),
    command,
    evidenceDoc,
    nextEvidence,
    productionReadyClaimAllowed,
    requiredProofCount: requiredProofs.length,
    targetBoundaryRequired,
  };
}

export function renderReleaseVerificationFlow({
  actionLabel = 'release verification',
  context = 'release',
  flow = {},
  renderCommandCopyButton = () => '',
  renderLinkCopyButton = () => '',
} = {}) {
  const evidenceDoc = flow.evidenceDoc || null;
  const evidenceDocHref = String(evidenceDoc?.href || '').trim();
  const evidenceDocLabel = String(evidenceDoc?.path || evidenceDoc?.label || '').trim();
  const evidenceDocOpenLabel = `근거 문서 열기: ${evidenceDocLabel || evidenceDocHref} · ${actionLabel}`;
  const claimView = getClaimView(flow.productionReadyClaimAllowed);
  const decisionText = getDecisionText(flow.targetBoundaryRequired);
  const requiredProofCount = Number(flow.requiredProofCount) || 0;
  const evidenceStepLabel = requiredProofCount > 1
    ? `1 · 필요한 증적 ${requiredProofCount}개`
    : '1 · 필요한 증적';

  return `
    <div class="release-stale-note release-verification-flow" data-release-verification-flow="${escapeHtml(context)}">
      <div class="release-stale-line"><strong>다음 검증 흐름</strong></div>
      <div class="release-stale-line" data-release-verification-step="evidence">
        <span class="mini-badge status-running">${escapeHtml(evidenceStepLabel)}</span>
        <span>${escapeHtml(flow.nextEvidence || '필요 증적이 blocker에 연결되지 않았습니다.')}</span>
      </div>
      ${evidenceDoc
        ? `
            <div class="release-stale-line" data-release-verification-evidence-doc="${escapeHtml(evidenceDocLabel || evidenceDocHref)}">
              <span class="mini-badge status-running">근거 문서</span>
              ${evidenceDocHref
                ? `<a class="release-evidence-doc-link" href="${escapeHtml(evidenceDocHref)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(evidenceDocOpenLabel)}" title="${escapeHtml(evidenceDocOpenLabel)}">${escapeHtml(evidenceDocLabel || evidenceDocHref)}</a>`
                : `<span>${escapeHtml(evidenceDocLabel)}</span>`}
              ${evidenceDocHref
                ? renderLinkCopyButton({
                    action: 'copy-release-evidence-doc-link',
                    actionLabel: `다음 검증 근거 문서 링크 복사: ${actionLabel}`,
                    attributes: `data-ui-href="${escapeHtml(evidenceDocHref)}" data-ui-label="${escapeHtml(evidenceDocLabel || 'evidence doc')}"`,
                    buttonText: '근거 문서 링크 복사',
                    className: 'ghost-button release-evidence-doc-copy',
                    value: evidenceDocHref,
                  })
                : ''}
            </div>
          `
        : ''}
      <div class="release-stale-line" data-release-verification-step="command">
        <span class="mini-badge status-running">2 · 다음 검증</span>
        <span class="mono">${escapeHtml(flow.command ? `${flow.command.label} · ${flow.command.command}` : '다음 검증 명령이 blocker에 연결되지 않았습니다.')}</span>
        ${flow.command
          ? renderCommandCopyButton({
              actionLabel: `다음 검증 명령 복사: ${actionLabel}`,
              attributes: `data-release-verification-command="${escapeHtml(context)}"`,
              buttonText: '다음 검증 명령 복사',
              command: flow.command.command,
              label: flow.command.label,
            })
          : ''}
      </div>
      <div class="release-stale-line" data-release-verification-step="decision">
        <span class="mini-badge ${claimView.className}">${escapeHtml(`3 · ${claimView.label}`)}</span>
        <span>${escapeHtml(decisionText)}</span>
      </div>
    </div>
  `;
}
