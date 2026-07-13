import { escapeHtml, formatDate, markdownToHtml } from './html-format.js';
import {
  getReleaseHandoffStructuredSummaryDetails,
  getReleaseHandoffStructuredSummaryOverviewLine,
  getReleaseHandoffStructuredSummaryRows,
  getReleaseHandoffStructuredSummarySha,
} from './release-handoff-summary.js';
import { renderReleaseClearActionButton } from './render-fragments.js';
import { getReleaseStatusBadge } from './release-status-view.js';
import { formatByteCount } from './text-format.js';

const PREVIEWABLE_FORMATS = new Set(['json', 'markdown', 'text']);

export function isReleaseHandoffPreviewable(item = {}) {
  if (!item || typeof item !== 'object') {
    return false;
  }
  const format = String(item.format || '').trim().toLowerCase();
  return Boolean(item.exists && item.href && PREVIEWABLE_FORMATS.has(format));
}

function getPreviewButtonLabel(active, status) {
  if (!active) {
    return '미리보기';
  }
  if (status === 'loading') {
    return '미리보는 중';
  }
  if (status === 'error') {
    return '다시 시도';
  }
  return '미리보기 닫기';
}

function decorateHandoffArtifact(item, previewId, previewStatus) {
  const id = String(item?.id || '').trim();
  const previewActive = Boolean(id && id === previewId);
  return {
    ...item,
    actionTargetLabel: item?.label || id || item?.path || 'handoff artifact',
    id,
    previewActive,
    previewButtonLabel: getPreviewButtonLabel(previewActive, previewStatus),
    previewable: isReleaseHandoffPreviewable(item),
    structuredSummaryDetails: getReleaseHandoffStructuredSummaryDetails(item),
    structuredSummaryOverviewLine: getReleaseHandoffStructuredSummaryOverviewLine(item),
    structuredSummaryRows: getReleaseHandoffStructuredSummaryRows(item),
    structuredSummarySha: getReleaseHandoffStructuredSummarySha(item),
  };
}

export function createReleaseHandoffDocumentViewModel({ preview = {}, release = {} } = {}) {
  const handoffArtifacts = Array.isArray(release.handoffArtifacts) ? release.handoffArtifacts : [];
  const previewId = String(preview.artifactId || '').trim();
  const previewStatus = String(preview.status || 'idle').trim() || 'idle';
  const artifacts = handoffArtifacts.map((item) => decorateHandoffArtifact(item, previewId, previewStatus));
  const previewArtifact = artifacts.find((item) => item.id === previewId && item.previewable) || null;

  return {
    artifacts,
    baseline: release.baseline || null,
    documents: {
      closeout: release.closeout || {},
      evidence: release.evidence || {},
      handoff: release.handoff || {},
    },
    liveValidation: Array.isArray(release.liveValidation) ? release.liveValidation : [],
    preview: previewArtifact
      ? {
          artifact: previewArtifact,
          content: String(preview.content || ''),
          error: String(preview.error || ''),
          lineCount: Number(preview.lineCount || 0),
          status: previewStatus,
          truncated: Boolean(preview.truncated),
        }
      : null,
    readyCount: artifacts.filter((item) => item.exists).length,
    recommendedCount: artifacts.filter((item) => item.recommended).length,
    refreshPlan: release.refreshPlan || null,
    snapshot: release.snapshot || null,
    snapshotEligibility: release.snapshotEligibility || {
      allowed: false,
      reason: 'snapshot 상태를 확인할 수 없습니다.',
    },
  };
}

function renderRefreshPlan(refreshPlan) {
  if (!refreshPlan) {
    return '';
  }
  return `
    <article class="release-snapshot-card">
      <div class="item-title">Current Surface 재생성 영향</div>
      <div class="release-doc-status-list">
        ${(refreshPlan.affectsPaths || []).map((path) => `
          <div class="harness-row">
            <div>
              <div class="item-title">rewrite target</div>
              <div class="item-meta mono">${escapeHtml(path)}</div>
            </div>
          </div>
        `).join('')}
        <div class="harness-row">
          <div>
            <div class="item-title">deterministic verification</div>
            <div class="item-meta">${escapeHtml(refreshPlan.rerunsDeterministicVerification ? '다시 실행됨' : '다시 실행되지 않음')}</div>
          </div>
        </div>
        <div class="harness-row">
          <div>
            <div class="item-title">provider live validation</div>
            <div class="item-meta">${escapeHtml(refreshPlan.rerunsLiveValidation ? '재실행됨' : '기본 regenerate에서는 재실행되지 않음')}</div>
          </div>
        </div>
        <div class="harness-row">
          <div>
            <div class="item-title">release snapshot</div>
            <div class="item-meta">${escapeHtml(refreshPlan.snapshotChanges ? '같이 갱신됨' : '자동으로 변경되지 않음')}</div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderSnapshot(view) {
  const { baseline, snapshot, snapshotEligibility } = view;
  return `
    <div class="release-stale-note">
      <div class="release-stale-line">${escapeHtml(snapshotEligibility.allowed
        ? 'current HEAD 기준 evidence/closeout/handoff가 fresh해서 snapshot을 바로 고정할 수 있습니다.'
        : snapshotEligibility.reason || '현재 상태에서는 snapshot을 고정할 수 없습니다.')}</div>
    </div>
    ${snapshot
      ? `
          <article class="release-snapshot-card">
            <div class="mini-head">
              <div>
                <p class="section-kicker">Release Snapshot</p>
                <h4>마지막으로 고정한 verified artifact</h4>
              </div>
            </div>
            <div class="release-meta">
              <span class="item-meta">verified ${escapeHtml(snapshot.verifiedCommit || '-')}</span>
              <span class="item-meta">${escapeHtml(formatDate(snapshot.archivedAt))}</span>
            </div>
            <div class="release-meta release-meta-secondary">
              <span class="mini-badge ${baseline?.ready ? 'status-completed' : 'status-pending'}">${escapeHtml(baseline?.ready ? 'baseline ready' : 'baseline 검토 필요')}</span>
              <span class="mini-badge ${snapshot.matchesCurrentHead ? 'status-completed' : 'status-pending'}">${escapeHtml(snapshot.matchesCurrentHead ? 'current head와 일치' : '이전 verified snapshot')}</span>
              <span class="mini-badge ${snapshot.matchesGeneratedCommit ? 'status-completed' : 'status-pending'}">${escapeHtml(snapshot.matchesGeneratedCommit ? '현재 evidence와 연결됨' : '현재 evidence와 분리됨')}</span>
            </div>
            <div class="release-doc-status-list">
              ${[
                ['snapshot evidence', snapshot.evidencePath],
                ['snapshot closeout', snapshot.closeoutPath],
                ['snapshot handoff', snapshot.handoffPath],
              ].map(([label, path]) => `
                <div class="harness-row">
                  <div>
                    <div class="item-title">${label}</div>
                    <div class="item-meta mono">${escapeHtml(path || '-')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </article>
        `
      : `
          <article class="release-snapshot-card is-empty">
            <div class="item-title">Release snapshot이 아직 없습니다.</div>
            <p class="item-meta">상태 다시 읽기는 read-only reload이고, current surface evidence/closeout/handoff를 다시 만들려면 위의 current surface 재생성 또는 provider별 live validation을 실행하면 됩니다.</p>
          </article>
        `}
  `;
}

function renderLiveValidation(liveValidation) {
  const items = liveValidation.length
    ? liveValidation
    : [{ provider: 'live validation', status: 'not requested' }];
  return `
    <div class="release-live-list">
      ${items.map((item) => `
        <div class="harness-row">
          <div><div class="item-title">${escapeHtml(item.provider)}</div></div>
          <div class="harness-row-meta">
            <span class="mini-badge ${getReleaseStatusBadge(item.status)}">${escapeHtml(item.status)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderStructuredSummary(artifact, copyButtons, { currentPreview = false } = {}) {
  if (!artifact.structuredSummaryRows.length) {
    return '';
  }
  const {
    renderReleaseHandoffStructuredSummaryCopyButton = () => '',
  } = copyButtons;
  const currentLabel = currentPreview ? '현재 ' : '';
  const detailWrapperAttribute = currentPreview
    ? 'data-release-handoff-preview-structured-summary-detail="true"'
    : `data-release-handoff-structured-summary-detail="${escapeHtml(artifact.id)}"`;

  return `
    <div class="release-handoff-summary ${currentPreview ? 'release-handoff-preview-summary' : ''}">
      ${artifact.structuredSummaryRows.map((row) => `
        <div class="harness-row">
          <div class="item-title">${escapeHtml(row.label)}</div>
          <div class="item-meta">${escapeHtml(row.value)}</div>
        </div>
      `).join('')}
      ${artifact.structuredSummaryDetails.length
        ? `
            <div class="release-handoff-summary-details">
              ${artifact.structuredSummaryDetails.map((detail) => `
                <div class="release-handoff-summary-detail" ${detailWrapperAttribute}>
                  <div class="release-handoff-summary-detail-head">
                    <span class="item-title">${escapeHtml(detail.label)}</span>
                    ${renderReleaseHandoffStructuredSummaryCopyButton({
                      action: 'copy-release-handoff-structured-summary-detail',
                      actionLabel: `${currentLabel}handoff summary line 복사: ${artifact.actionTargetLabel} ${detail.label || detail.key || 'detail'}`,
                      artifactId: artifact.id,
                      attributes: currentPreview
                        ? `data-release-handoff-current-preview-structured-summary-detail-copy="${escapeHtml(detail.key || '')}"`
                        : `data-release-handoff-structured-summary-detail-copy="${escapeHtml(`${artifact.id}:${detail.key || ''}`)}"`,
                      buttonText: currentPreview ? '현재 line 복사' : 'line 복사',
                      copiedText: currentPreview ? '현재 line 복사됨' : undefined,
                      detailKey: detail.key || '',
                      successNotice: `${artifact.label || (currentPreview ? '현재 handoff summary' : 'handoff summary')} ${detail.label || 'detail'} line을 복사했습니다.`,
                    })}
                  </div>
                  <span class="item-meta mono">${escapeHtml(detail.overviewLine)}</span>
                  ${detail.stableLines?.length
                    ? `
                        <div class="release-handoff-summary-stable-lines">
                          <span class="item-meta">stable lines ${escapeHtml(String(detail.stableLineCount || detail.stableLines.length))}</span>
                          ${detail.stableLines.map((line, lineIndex) => `
                            <div class="release-handoff-summary-stable-line-row">
                              <span class="item-meta mono release-handoff-summary-stable-line">${escapeHtml(line)}</span>
                              ${renderReleaseHandoffStructuredSummaryCopyButton({
                                action: 'copy-release-handoff-structured-summary-stable-line',
                                actionLabel: `${currentLabel}handoff summary stable line 복사: ${artifact.actionTargetLabel} ${detail.label || detail.key || 'detail'} ${lineIndex + 1}`,
                                artifactId: artifact.id,
                                attributes: currentPreview
                                  ? `data-release-handoff-current-preview-structured-summary-stable-line-copy="${escapeHtml(`${detail.key || ''}:${lineIndex}`)}"`
                                  : `data-release-handoff-structured-summary-stable-line-copy="${escapeHtml(`${artifact.id}:${detail.key || ''}:${lineIndex}`)}"`,
                                buttonText: currentPreview ? '현재 stable line 복사' : 'stable line 복사',
                                copiedText: currentPreview ? '현재 stable line 복사됨' : undefined,
                                detailKey: detail.key || '',
                                lineIndex,
                                successNotice: `${artifact.label || (currentPreview ? '현재 handoff summary' : 'handoff summary')} ${detail.label || 'detail'} stable line을 복사했습니다.`,
                              })}
                            </div>
                          `).join('')}
                        </div>
                      `
                    : ''}
                </div>
              `).join('')}
            </div>
          `
        : ''}
      ${artifact.structuredSummaryOverviewLine
        ? `
            <div class="item-meta mono release-handoff-summary-overview" ${currentPreview
              ? 'data-release-handoff-preview-structured-summary-overview="true"'
              : `data-release-handoff-structured-summary-overview="${escapeHtml(artifact.id)}"`}>
              ${escapeHtml(artifact.structuredSummaryOverviewLine)}
            </div>
            <div class="release-handoff-summary-actions">
              ${renderReleaseHandoffStructuredSummaryCopyButton({
                action: 'copy-release-handoff-structured-summary',
                actionLabel: `${currentLabel}handoff summary overview 복사: ${artifact.actionTargetLabel}`,
                artifactId: artifact.id,
                attributes: currentPreview
                  ? 'data-release-handoff-current-preview-structured-summary-copy="true"'
                  : `data-release-handoff-structured-summary-copy="${escapeHtml(artifact.id)}"`,
                buttonText: currentPreview ? '현재 요약 복사' : 'overview 복사',
                copiedText: currentPreview ? '현재 요약 복사됨' : undefined,
                successNotice: `${artifact.label || (currentPreview ? '현재 handoff summary' : 'handoff summary')} overview line을 복사했습니다.`,
              })}
            </div>
          `
        : ''}
      ${artifact.structuredSummarySha
        ? `
            <div class="item-meta mono release-handoff-summary-sha" ${currentPreview
              ? 'data-release-handoff-preview-structured-summary-sha="true"'
              : `data-release-handoff-structured-summary-sha="${escapeHtml(artifact.id)}"`}>
              sha ${escapeHtml(artifact.structuredSummarySha)}
            </div>
          `
        : ''}
    </div>
  `;
}

function renderArtifactCard(item, previewStatus, copyButtons) {
  const {
    renderReleaseCommandCopyButton = () => '',
    renderReleaseHandoffLinkCopyButton = () => '',
    renderReleaseToggleActionButton = () => '',
  } = copyButtons;
  return `
    <article class="release-handoff-card ${item.exists ? 'is-ready' : 'is-missing'} ${item.recommended ? 'is-recommended' : ''} ${item.previewActive ? 'is-preview-active' : ''}" data-release-handoff-id="${escapeHtml(item.id)}">
      <div class="release-handoff-head">
        <div>
          <div class="item-title">${escapeHtml(item.label || '-')}</div>
          <div class="item-meta">${escapeHtml(item.description || '')}</div>
        </div>
        <div class="release-provider-meta">
          <span class="mini-badge ${getReleaseStatusBadge(item.exists ? 'ready' : 'blocked')}">${escapeHtml(item.exists ? 'ready' : 'missing')}</span>
          <span class="mini-badge status-running">${escapeHtml(item.kind || 'artifact')}</span>
          <span class="mini-badge">${escapeHtml(item.format || 'file')}</span>
          ${item.recommended ? '<span class="mini-badge status-completed">recommended</span>' : ''}
        </div>
      </div>
      <div class="item-meta mono release-handoff-path">${escapeHtml(item.path || '-')}</div>
      <div class="release-handoff-meta">
        <span class="item-meta">${escapeHtml(item.exists ? formatByteCount(item.bytes) : '파일 없음')}</span>
        <span class="item-meta">${escapeHtml(item.updatedAt ? formatDate(item.updatedAt) : '미생성')}</span>
      </div>
      ${renderStructuredSummary(item, copyButtons)}
      <div class="release-provider-meta">
        ${item.previewable
          ? `
              ${renderReleaseToggleActionButton({
                action: 'toggle-release-handoff-preview',
                actionLabel: `${item.previewButtonLabel}: ${item.actionTargetLabel}`,
                attributes: `data-release-handoff-preview-trigger="${escapeHtml(item.id)}"`,
                buttonText: item.previewButtonLabel,
                disabled: item.previewActive && previewStatus === 'loading',
                expanded: item.previewActive,
                value: item.id,
              })}
              ${renderReleaseHandoffLinkCopyButton({
                action: 'copy-release-handoff-preview-link',
                actionLabel: `handoff preview 링크 복사: ${item.actionTargetLabel}`,
                artifactId: item.id,
                attributes: `data-release-handoff-preview-link-copy="${escapeHtml(item.id)}"`,
                buttonText: '링크',
                successNotice: `${item.label || 'handoff preview'} 링크를 복사했습니다.`,
              })}
            `
          : ''}
        ${item.href
          ? `
              ${!item.previewable
                ? renderReleaseHandoffLinkCopyButton({
                    action: 'copy-release-handoff-open-link',
                    actionLabel: `handoff artifact 열기 링크 복사: ${item.actionTargetLabel}`,
                    artifactId: item.id,
                    attributes: `data-release-handoff-open-link-copy="${escapeHtml(item.id)}"`,
                    buttonText: '링크',
                    successNotice: `${item.label || 'handoff artifact'} 열기 링크를 복사했습니다.`,
                  })
                : ''}
              <a class="ghost-button" data-release-handoff-open="true" href="${escapeHtml(item.href)}" rel="noreferrer" target="_blank" aria-label="${escapeHtml(`handoff artifact 열기: ${item.actionTargetLabel}`)}" title="${escapeHtml(`handoff artifact 열기: ${item.actionTargetLabel}`)}">열기</a>
            `
          : ''}
        ${renderReleaseCommandCopyButton({
          actionLabel: `handoff artifact 경로 복사: ${item.actionTargetLabel}`,
          buttonText: '경로 복사',
          command: item.path || '',
          label: `${item.label || 'artifact'} 경로`,
        })}
      </div>
    </article>
  `;
}

function renderPreview(view, copyButtons) {
  if (!view.preview) {
    return '';
  }
  const { artifact, content, error, lineCount, status, truncated } = view.preview;
  const { renderReleaseHandoffLinkCopyButton = () => '' } = copyButtons;
  return `
    <section class="release-handoff-preview" data-release-handoff-preview-panel="${escapeHtml(artifact.id)}" data-release-handoff-preview-state="${escapeHtml(status)}">
      <div class="release-handoff-preview-head">
        <div>
          <p class="section-kicker">Inline Preview</p>
          <div class="item-title">${escapeHtml(artifact.label || '-')}</div>
          <div class="item-meta">${escapeHtml(artifact.description || '')}</div>
        </div>
        <div class="release-provider-meta">
          <span class="mini-badge status-running" data-release-handoff-preview-format>${escapeHtml(artifact.format || 'file')}</span>
          <span class="mini-badge">${escapeHtml(artifact.kind || 'artifact')}</span>
          ${artifact.href
            ? `<a class="ghost-button" href="${escapeHtml(artifact.href)}" rel="noreferrer" target="_blank" aria-label="${escapeHtml(`handoff preview 새 탭 열기: ${artifact.actionTargetLabel}`)}" title="${escapeHtml(`handoff preview 새 탭 열기: ${artifact.actionTargetLabel}`)}">새 탭 열기</a>`
            : ''}
          ${renderReleaseHandoffLinkCopyButton({
            action: 'copy-release-handoff-preview-link',
            actionLabel: `현재 handoff preview 링크 복사: ${artifact.actionTargetLabel}`,
            artifactId: artifact.id,
            attributes: 'data-release-handoff-current-preview-link-copy="true"',
            buttonText: '현재 링크 복사',
            copiedText: '현재 링크 복사됨',
            successNotice: `${artifact.label || '현재 handoff preview'} 링크를 복사했습니다.`,
          })}
          ${renderReleaseClearActionButton({
            action: 'clear-release-handoff-preview',
            actionLabel: `handoff preview 닫기: ${artifact.actionTargetLabel}`,
            buttonText: '미리보기 닫기',
          })}
        </div>
      </div>
      <div class="release-handoff-meta">
        <span class="item-meta mono">${escapeHtml(artifact.path || '-')}</span>
        <span class="item-meta">${escapeHtml(artifact.updatedAt ? formatDate(artifact.updatedAt) : '미생성')}</span>
        ${lineCount ? `<span class="item-meta">${escapeHtml(String(lineCount))}줄</span>` : ''}
      </div>
      ${renderStructuredSummary(artifact, copyButtons, { currentPreview: true })}
      ${status === 'loading'
        ? '<div class="release-handoff-preview-body release-handoff-preview-loading" data-release-handoff-preview-body>선택한 artifact를 불러오는 중입니다.</div>'
        : status === 'error'
          ? `<div class="release-stale-note"><div class="release-stale-line" data-release-handoff-preview-body>${escapeHtml(error || 'artifact preview를 불러오지 못했습니다.')}</div></div>`
          : String(artifact.format || '').trim().toLowerCase() === 'markdown'
            ? `<div class="release-handoff-preview-body markdown-surface" data-release-handoff-preview-body>${markdownToHtml(content || '미리볼 내용이 없습니다.')}</div>`
            : `<pre class="release-handoff-preview-code" data-release-handoff-preview-body>${escapeHtml(content || '미리볼 내용이 없습니다.')}</pre>`}
      ${status === 'ready' && truncated
        ? `<div class="item-meta" data-release-handoff-preview-note>총 ${escapeHtml(String(lineCount))}줄 중 앞부분만 표시했습니다. 전체 내용은 열기 링크로 확인하세요.</div>`
        : ''}
    </section>
  `;
}

function renderHandoff(view, copyButtons) {
  if (!view.artifacts.length) {
    return '';
  }
  const previewStatus = view.preview?.status || 'idle';
  return `
    <article class="release-snapshot-card">
      <div class="mini-head">
        <div>
          <p class="section-kicker">Release Handoff</p>
          <h4>검토용 artifact 바로가기</h4>
        </div>
      </div>
      <div class="release-meta">
        <span class="item-meta">ready ${escapeHtml(String(view.readyCount))}/${escapeHtml(String(view.artifacts.length))}</span>
        <span class="item-meta">recommended ${escapeHtml(String(view.recommendedCount))}개</span>
      </div>
      <div class="release-handoff-grid">
        ${view.artifacts.map((item) => renderArtifactCard(item, previewStatus, copyButtons)).join('')}
      </div>
      ${renderPreview(view, copyButtons)}
    </article>
  `;
}

function renderDocuments(documents) {
  return `
    <div class="release-doc-grid">
      ${['closeout', 'evidence', 'handoff'].map((kind) => {
        const document = documents[kind] || {};
        return `
          <article class="release-doc-surface markdown-surface" data-release-doc-kind="${kind}">
            <div class="release-doc-head">
              <strong>${kind}</strong>
              <span class="item-meta mono">${escapeHtml(document.path || '-')}</span>
            </div>
            ${markdownToHtml(document.markdown || '문서가 없습니다.')}
          </article>
        `;
      }).join('')}
    </div>
  `;
}

export function renderReleaseHandoffDocuments({ copyButtons = {}, view = {} } = {}) {
  const safeView = {
    artifacts: [],
    baseline: null,
    documents: {},
    liveValidation: [],
    preview: null,
    readyCount: 0,
    recommendedCount: 0,
    refreshPlan: null,
    snapshot: null,
    snapshotEligibility: { allowed: false, reason: 'snapshot 상태를 확인할 수 없습니다.' },
    ...view,
  };
  return `
    ${renderRefreshPlan(safeView.refreshPlan)}
    ${renderSnapshot(safeView)}
    ${renderLiveValidation(safeView.liveValidation)}
    ${renderHandoff(safeView, copyButtons)}
    ${renderDocuments(safeView.documents)}
  `;
}
