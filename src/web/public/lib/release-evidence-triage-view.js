import { escapeHtml } from './html-format.js';
import {
  renderReleaseBlockerFocusButton,
  renderReleaseClearActionButton,
} from './render-fragments.js';
import { getReleaseCountRecordEntries } from './text-format.js';
import { getReleaseProductionBlockerOrdinal } from './ui-params.js';

export function createReleaseEvidenceTriageViewModel({
  filters = {},
  focus = {},
  getCurrentOpenBlockerActions = () => [],
  getSliceSummary = () => ({}),
  getValidProductionBlockerIndex = () => '',
  isBlockerVisible = () => true,
  productionBlockersExpanded = false,
  release = {},
} = {}) {
  const summary = release.summary || {};
  const releaseReadiness = release.releaseReadiness || {};
  const productionBlockers = Array.isArray(releaseReadiness.productionBlockers)
    ? releaseReadiness.productionBlockers
    : [];
  const currentOpenBlockerActions = getCurrentOpenBlockerActions(release);
  const currentOpenBlockerActionSummary = releaseReadiness.currentOpenBlockerActionSummary || {};
  const blockerCategoryFilter = String(filters.category || '').trim();
  const blockerIncludeSharedProviderOperations = filters.includeShared !== false;
  const blockerOwnerFilter = String(filters.owner || '').trim();
  const blockerProviderFilter = String(filters.provider || '').trim();
  const focusedBlockerId = String(focus.blockerId || '').trim();
  const focusedProvider = String(focus.provider || '').trim();
  const hasBlockerFilter = Boolean(
    blockerCategoryFilter
      || blockerOwnerFilter
      || blockerProviderFilter
      || !blockerIncludeSharedProviderOperations,
  );
  const visibleCurrentOpenBlockerActions = currentOpenBlockerActions.filter((item) =>
    isBlockerVisible(item, {
      category: blockerCategoryFilter,
      includeShared: blockerIncludeSharedProviderOperations,
      owner: blockerOwnerFilter,
      provider: blockerProviderFilter,
    }),
  );
  const hasEmptyBlockerFilter = hasBlockerFilter
    && currentOpenBlockerActions.length > 0
    && visibleCurrentOpenBlockerActions.length === 0;
  const currentOpenBlockerSliceSummary = getSliceSummary({
    blockerActions: visibleCurrentOpenBlockerActions,
    totalActions: currentOpenBlockerActions,
  });
  const focusedBlockerEntry = currentOpenBlockerActions.find(
    (item) => String(item.id || '').trim() === focusedBlockerId,
  ) || null;
  const focusedProductionBlockerIndex = getValidProductionBlockerIndex(
    focus.productionBlockerIndex,
    release,
  );
  const focusedProductionBlockerIndexNumber = focusedProductionBlockerIndex === ''
    ? -1
    : Number(focusedProductionBlockerIndex);
  const focusedProductionBlocker = focusedProductionBlockerIndexNumber >= 0
    ? String(productionBlockers[focusedProductionBlockerIndexNumber] || '').trim()
    : '';
  const focusedProductionBlockerOrdinal = getReleaseProductionBlockerOrdinal(
    focusedProductionBlockerIndex,
  );
  const showAllProductionBlockers = Boolean(
    productionBlockersExpanded || focusedProductionBlockerIndexNumber >= 8,
  );
  const visibleProductionBlockers = showAllProductionBlockers
    ? productionBlockers
    : productionBlockers.slice(0, 8);
  const productionBlockerCount = Number.isFinite(Number(summary.productionBlockerCount))
    ? Number(summary.productionBlockerCount)
    : productionBlockers.length;
  const productionReadyStopReason = String(
    summary.productionReadyStopReason
      || releaseReadiness.productionReadyStopReason
      || productionBlockers[0]
      || '',
  ).trim();
  const blockerFilterLabel = [
    `category ${blockerCategoryFilter || 'all'}`,
    `owner ${blockerOwnerFilter || 'all'}`,
    `provider ${blockerProviderFilter || 'all'}`,
    `shared provider ops ${blockerIncludeSharedProviderOperations ? 'included' : 'excluded'}`,
  ].join(' · ');
  const blockerProviderLabel = blockerProviderFilter || focusedProvider || 'provider';
  const blockerTriageFilterActionLabel = `current open blocker slice · ${blockerFilterLabel}`;
  const blockerTriageProviderOnlyActionLabel = `provider-only ${blockerProviderLabel} · ${blockerFilterLabel}`;

  return {
    blockerCategoryFilter,
    blockerFilterLabel,
    blockerIncludeSharedProviderOperations,
    blockerOwnerFilter,
    blockerProviderFilter,
    blockerProviderLabel,
    blockerTriageFilterActionLabel,
    blockerTriageProviderOnlyActionLabel,
    currentOpenBlockerActions,
    currentOpenBlockerActionSummary,
    currentOpenBlockerCategoryEntries: getReleaseCountRecordEntries(currentOpenBlockerActionSummary.categoryCounts),
    currentOpenBlockerOwnerEntries: getReleaseCountRecordEntries(currentOpenBlockerActionSummary.ownerCounts),
    currentOpenBlockerProviderEntries: getReleaseCountRecordEntries(currentOpenBlockerActionSummary.providerCounts),
    currentOpenBlockerSliceSummary,
    focusedBlockerCommands: Array.isArray(focusedBlockerEntry?.commands)
      ? focusedBlockerEntry.commands.slice(0, 3)
      : [],
    focusedBlockerEntry,
    focusedBlockerEvidenceDocs: Array.isArray(focusedBlockerEntry?.evidenceDocs)
      ? focusedBlockerEntry.evidenceDocs.slice(0, 3)
      : [],
    focusedBlockerId,
    focusedBlockerLabel: focusedBlockerEntry
      ? `${focusedBlockerId || 'blocker'} · ${focusedBlockerEntry.blocker || focusedBlockerEntry.stopReason || 'current open blocker'}`
      : focusedBlockerId,
    focusedProductionBlocker,
    focusedProductionBlockerActionLabel: focusedProductionBlockerIndex !== ''
      ? `production blocker #${focusedProductionBlockerOrdinal} · ${focusedProductionBlocker || 'production-ready blocker'}`
      : '',
    focusedProductionBlockerIndex,
    focusedProductionBlockerIndexNumber,
    focusedProductionBlockerOrdinal,
    hasBlockerFilter,
    hasEmptyBlockerFilter,
    hiddenProductionBlockerCount: Math.max(
      0,
      productionBlockers.length - visibleProductionBlockers.length,
    ),
    productionBlockerActionLabel: `${productionBlockerCount} production blockers · ${productionReadyStopReason || 'stop reason not recorded'}`,
    productionBlockerCount,
    productionBlockerEvidenceDocHref: '/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md',
    productionBlockerEvidenceDocLabel: 'release-readiness production-ready blockers',
    productionBlockers,
    productionBlockersExpanded: showAllProductionBlockers,
    productionReadyStopReason,
    targetEvidenceActionLabel: `target evidence intake · ${blockerTriageFilterActionLabel}`,
    targetEvidenceProviderOnlyActionLabel: `provider-only target evidence · ${blockerTriageProviderOnlyActionLabel}`,
    topPriorityBlockerId: String(currentOpenBlockerActionSummary.topPriorityBlockerId || '').trim(),
    topPriorityBlockerLabel: String(
      currentOpenBlockerActionSummary.topPriorityBlocker
        || currentOpenBlockerActionSummary.topPriorityStopReason
        || 'current open blocker',
    ).trim(),
    visibleCurrentOpenBlockerActions,
    visibleProductionBlockers,
  };
}

export function renderReleaseProductionBlockerSummary({
  renderLinkCopyButton = () => '',
  renderSummaryCopyButton = () => '',
  view = {},
} = {}) {
  const {
    productionBlockerActionLabel = '',
    productionBlockerCount = 0,
    productionBlockerEvidenceDocHref = '',
    productionBlockers = [],
    productionReadyStopReason = '',
  } = view;

  return `
    <div class="harness-callout" data-release-production-blockers="true">
      <strong>Production-ready blocker ${escapeHtml(String(productionBlockerCount))}건</strong>
      <p>${escapeHtml(productionReadyStopReason || 'production-ready stop reason이 release readiness 문서에 아직 기록되지 않았습니다.')}</p>
      <div class="release-history-filter-chips">
        ${renderSummaryCopyButton({
          actionLabel: `production blocker summary 복사: ${productionBlockerActionLabel}`,
          attributes: 'data-release-production-blocker-summary-copy="true"',
          buttonText: 'production summary 복사',
          copyKey: 'production-blocker-summary',
          disabled: !productionBlockers.length,
        })}
        ${renderLinkCopyButton({
          action: 'copy-release-evidence-doc-link',
          actionLabel: `release-readiness 링크 복사: ${productionBlockerActionLabel}`,
          attributes: 'data-release-production-blocker-release-doc="true" data-ui-href="/api/execution-v1/release-doc?path=docs%2Frelease-readiness-v1.md" data-ui-label="release-readiness"',
          buttonText: 'release-readiness 링크 복사',
          value: productionBlockerEvidenceDocHref,
        })}
      </div>
    </div>
  `;
}

export function renderReleaseProductionBlockerDetails({
  gaps = [],
  renderDetailCopyButton = () => '',
  renderLinkCopyButton = () => '',
  renderToggleActionButton = () => '',
  view = {},
} = {}) {
  const {
    focusedProductionBlocker = '',
    focusedProductionBlockerActionLabel = '',
    focusedProductionBlockerIndex = '',
    focusedProductionBlockerIndexNumber = -1,
    focusedProductionBlockerOrdinal = '',
    hiddenProductionBlockerCount = 0,
    productionBlockerEvidenceDocHref = '',
    productionBlockerEvidenceDocLabel = '',
    productionBlockers = [],
    productionBlockersExpanded = false,
    visibleProductionBlockers = [],
  } = view;

  return `
    ${focusedProductionBlockerIndex !== ''
      ? `
          <div class="harness-callout release-blocker-focus-callout" data-release-production-blocker-focus="${escapeHtml(focusedProductionBlockerOrdinal)}">
            <strong>Focused production-ready blocker</strong>
            <p>${escapeHtml(focusedProductionBlocker || `production-ready blocker #${focusedProductionBlockerOrdinal}`)}</p>
            <div class="release-history-focus-actions">
              ${renderDetailCopyButton({
                action: 'copy-release-production-blocker-handoff',
                actionLabel: `focused production blocker handoff 복사: ${focusedProductionBlockerActionLabel}`,
                attributes: `data-release-production-blocker-handoff="${escapeHtml(focusedProductionBlockerIndex)}"`,
                blockerIndex: focusedProductionBlockerIndex,
                buttonText: 'handoff 복사',
              })}
              ${renderLinkCopyButton({
                action: 'copy-release-production-blocker-link',
                actionLabel: `focused production blocker 링크 복사: ${focusedProductionBlockerActionLabel}`,
                attributes: `data-release-production-blocker-link="${escapeHtml(focusedProductionBlockerIndex)}" data-ui-index="${escapeHtml(focusedProductionBlockerIndex)}"`,
                buttonText: 'blocker 링크 복사',
                value: focusedProductionBlockerIndex,
              })}
              <a
                class="ghost-button"
                href="${escapeHtml(productionBlockerEvidenceDocHref)}"
                target="_blank"
                rel="noreferrer"
                data-release-production-blocker-evidence-doc="${escapeHtml(focusedProductionBlockerIndex)}"
                data-release-production-blocker-evidence-doc-href="${escapeHtml(productionBlockerEvidenceDocHref)}"
                aria-label="${escapeHtml(`근거 문서 열기: ${productionBlockerEvidenceDocLabel} · production blocker #${focusedProductionBlockerOrdinal}`)}"
                title="${escapeHtml(`근거 문서 열기: ${productionBlockerEvidenceDocLabel} · production blocker #${focusedProductionBlockerOrdinal}`)}"
              >근거 문서 열기</a>
              ${renderLinkCopyButton({
                action: 'copy-release-evidence-doc-link',
                actionLabel: `focused production blocker 근거 링크 복사: ${productionBlockerEvidenceDocLabel} · ${focusedProductionBlockerActionLabel}`,
                attributes: `data-release-production-blocker-evidence-doc-copy="${escapeHtml(focusedProductionBlockerIndex)}" data-ui-href="${escapeHtml(productionBlockerEvidenceDocHref)}" data-ui-label="${escapeHtml(productionBlockerEvidenceDocLabel)}"`,
                buttonText: '근거 링크 복사',
                value: productionBlockerEvidenceDocHref,
              })}
              ${renderDetailCopyButton({
                action: 'copy-release-production-blocker-commands',
                actionLabel: `focused production blocker 검증 명령 복사: ${focusedProductionBlockerActionLabel}`,
                attributes: `data-release-production-blocker-commands="${escapeHtml(focusedProductionBlockerIndex)}"`,
                blockerIndex: focusedProductionBlockerIndex,
                buttonText: '검증 명령 복사',
              })}
              ${renderDetailCopyButton({
                action: 'copy-release-production-blocker-package',
                actionLabel: `focused production blocker package 복사: ${focusedProductionBlockerActionLabel}`,
                attributes: `data-release-production-blocker-package="${escapeHtml(focusedProductionBlockerIndex)}"`,
                blockerIndex: focusedProductionBlockerIndex,
                buttonText: 'package 복사',
              })}
              ${renderReleaseClearActionButton({
                action: 'clear-release-production-blocker-focus',
                actionLabel: `focused production blocker 포커스 해제: ${focusedProductionBlockerActionLabel}`,
                buttonText: '포커스 해제',
              })}
            </div>
          </div>
        `
      : ''}
    <div
      class="release-current-status"
      data-release-production-blocker-list="true"
      data-release-production-blocker-list-expanded="${productionBlockersExpanded ? 'true' : 'false'}"
      data-release-production-blocker-visible-count="${escapeHtml(String(visibleProductionBlockers.length))}"
    >
      ${productionBlockers.length
        ? visibleProductionBlockers
          .map((item, index) => {
            const isFocusedProductionBlocker = index === focusedProductionBlockerIndexNumber;
            const productionBlockerRowActionLabel = `production blocker #${index + 1} · ${item || 'production-ready blocker'}`;
            return `
              <div class="harness-row ${isFocusedProductionBlocker ? 'is-focused-blocker' : ''}" data-release-production-blocker-row="true" data-release-production-blocker-row-index="${escapeHtml(String(index))}" data-release-production-blocker-focused="${isFocusedProductionBlocker ? 'true' : 'false'}">
                <div>
                  <div class="item-title">${escapeHtml(item)}</div>
                  <div class="item-meta">production-ready claim blocker</div>
                </div>
                <div class="harness-row-meta">
                  ${isFocusedProductionBlocker ? '<span class="mini-badge status-running">focused</span>' : ''}
                  <span class="mini-badge status-failed">blocked</span>
                  ${renderReleaseBlockerFocusButton({
                    action: 'focus-release-production-blocker',
                    actionLabel: `${isFocusedProductionBlocker ? 'production blocker 포커스됨' : 'production blocker 포커스'}: ${productionBlockerRowActionLabel}`,
                    buttonText: isFocusedProductionBlocker ? '포커스됨' : '포커스',
                    disabled: isFocusedProductionBlocker,
                    index,
                    pressed: isFocusedProductionBlocker,
                  })}
                  ${renderLinkCopyButton({
                    action: 'copy-release-production-blocker-link',
                    actionLabel: `production blocker 링크 복사: ${productionBlockerRowActionLabel}`,
                    attributes: `data-release-production-blocker-link="${escapeHtml(String(index))}" data-ui-index="${escapeHtml(String(index))}"`,
                    buttonText: '링크 복사',
                    value: String(index),
                  })}
                  <a
                    class="ghost-button"
                    href="${escapeHtml(productionBlockerEvidenceDocHref)}"
                    target="_blank"
                    rel="noreferrer"
                    data-release-production-blocker-evidence-doc="${escapeHtml(String(index))}"
                    data-release-production-blocker-evidence-doc-href="${escapeHtml(productionBlockerEvidenceDocHref)}"
                    aria-label="${escapeHtml(`근거 문서 열기: ${productionBlockerEvidenceDocLabel} · production blocker #${index + 1}`)}"
                    title="${escapeHtml(`근거 문서 열기: ${productionBlockerEvidenceDocLabel} · production blocker #${index + 1}`)}"
                  >근거 문서</a>
                  ${renderLinkCopyButton({
                    action: 'copy-release-evidence-doc-link',
                    actionLabel: `production blocker 근거 링크 복사: ${productionBlockerEvidenceDocLabel} · ${productionBlockerRowActionLabel}`,
                    attributes: `data-release-production-blocker-evidence-doc-copy="${escapeHtml(String(index))}" data-ui-href="${escapeHtml(productionBlockerEvidenceDocHref)}" data-ui-label="${escapeHtml(productionBlockerEvidenceDocLabel)}"`,
                    buttonText: '근거 링크 복사',
                    value: productionBlockerEvidenceDocHref,
                  })}
                  ${renderDetailCopyButton({
                    action: 'copy-release-production-blocker-commands',
                    actionLabel: `production blocker 검증 명령 복사: ${productionBlockerRowActionLabel}`,
                    attributes: `data-release-production-blocker-commands="${escapeHtml(String(index))}"`,
                    blockerIndex: String(index),
                    buttonText: '검증 명령 복사',
                  })}
                  ${renderDetailCopyButton({
                    action: 'copy-release-production-blocker-package',
                    actionLabel: `production blocker package 복사: ${productionBlockerRowActionLabel}`,
                    attributes: `data-release-production-blocker-package="${escapeHtml(String(index))}"`,
                    blockerIndex: String(index),
                    buttonText: 'package 복사',
                  })}
                  ${renderDetailCopyButton({
                    action: 'copy-release-production-blocker-handoff',
                    actionLabel: `production blocker handoff 복사: ${productionBlockerRowActionLabel}`,
                    attributes: `data-release-production-blocker-handoff="${escapeHtml(String(index))}"`,
                    blockerIndex: String(index),
                    buttonText: 'blocker handoff 복사',
                  })}
                </div>
              </div>
            `;
          })
          .join('')
        : `
            <article class="release-snapshot-card is-empty">
              <div class="item-title">production-ready blocker가 없습니다.</div>
              <p class="item-meta">release-readiness 문서의 Production Ready blocker list가 비어 있습니다.</p>
            </article>
          `}
      ${productionBlockers.length > 8
        ? `
            <div class="harness-row" data-release-production-blocker-overflow="true" data-release-production-blocker-hidden-count="${escapeHtml(String(hiddenProductionBlockerCount))}">
              <div>
                <div class="item-title">${productionBlockersExpanded ? '전체 production-ready blocker 표시 중' : `추가 blocker ${escapeHtml(String(hiddenProductionBlockerCount))}건`}</div>
                <div class="item-meta">현재 ${escapeHtml(String(visibleProductionBlockers.length))}/${escapeHtml(String(productionBlockers.length))}건을 표시합니다. 전체 목록은 docs/release-readiness-v1.md의 Production Ready 섹션을 기준으로 합니다.</div>
              </div>
              <div class="harness-row-meta">
                <span class="mini-badge status-running">${productionBlockersExpanded ? 'expanded' : 'summarized'}</span>
                ${renderToggleActionButton({
                  action: 'toggle-release-production-blockers',
                  actionLabel: `production blocker 목록 ${productionBlockersExpanded ? '축소' : '확장'}: ${visibleProductionBlockers.length}/${productionBlockers.length} 표시`,
                  attributes: `data-release-production-blocker-toggle="${productionBlockersExpanded ? 'collapse' : 'expand'}"`,
                  buttonText: productionBlockersExpanded ? '8개만 보기' : '전체 보기',
                  expanded: productionBlockersExpanded,
                })}
              </div>
            </div>
          `
        : ''}
    </div>
    <div class="harness-callout">
      <strong>남은 gap ${escapeHtml(String(gaps.length))}건</strong>
      <p>${escapeHtml(gaps[0] || '남은 gap이 없습니다.')}</p>
    </div>
  `;
}
