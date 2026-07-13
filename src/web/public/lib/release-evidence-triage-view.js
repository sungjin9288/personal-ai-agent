import { escapeHtml } from './html-format.js';
import {
  renderReleaseBlockerFilterButton,
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

export function renderReleaseCurrentOpenBlockers({
  buildReleaseBlockerApiUrl = () => '',
  copyButtons = {},
  view = {},
} = {}) {
  const {
    blockerCategoryFilter = '',
    blockerFilterLabel = '',
    blockerIncludeSharedProviderOperations = true,
    blockerOwnerFilter = '',
    blockerProviderFilter = '',
    blockerTriageFilterActionLabel = '',
    blockerTriageProviderOnlyActionLabel = '',
    currentOpenBlockerActions = [],
    currentOpenBlockerActionSummary = {},
    currentOpenBlockerCategoryEntries = [],
    currentOpenBlockerOwnerEntries = [],
    currentOpenBlockerProviderEntries = [],
    currentOpenBlockerSliceSummary = {},
    focusedBlockerCommands = [],
    focusedBlockerEntry = null,
    focusedBlockerEvidenceDocs = [],
    focusedBlockerId = '',
    focusedBlockerLabel = '',
    hasBlockerFilter = false,
    hasEmptyBlockerFilter = false,
    targetEvidenceActionLabel = '',
    targetEvidenceProviderOnlyActionLabel = '',
    topPriorityBlockerId = '',
    topPriorityBlockerLabel = '',
    visibleCurrentOpenBlockerActions = [],
  } = view;
  const {
    renderReleaseBlockerClosureChecklistCopyButton = () => '',
    renderReleaseBlockerClosureMatrixCopyButton = () => '',
    renderReleaseBlockerCommandsCopyButton = () => '',
    renderReleaseBlockerEvidenceCopyButton = () => '',
    renderReleaseBlockerHandoffCopyButton = () => '',
    renderReleaseBlockerPackageCopyButton = () => '',
    renderReleaseBlockerSummaryCopyButton = () => '',
    renderReleaseCommandCopyButton = () => '',
    renderReleaseLinkCopyButton = () => '',
    renderReleaseTargetEvidenceBlockerDispositionCopyButton = () => '',
    renderReleaseTargetEvidenceBoundaryMapCopyButton = () => '',
    renderReleaseTargetEvidenceCaptureTemplateCopyButton = () => '',
    renderReleaseTargetEvidenceClosureRulesCopyButton = () => '',
    renderReleaseTargetEvidenceCommandRerunLogCopyButton = () => '',
    renderReleaseTargetEvidenceDecisionRecordCopyButton = () => '',
    renderReleaseTargetEvidenceExceptionRegisterCopyButton = () => '',
    renderReleaseTargetEvidenceIntakePacketCopyButton = () => '',
    renderReleaseTargetEvidenceIntakeSummaryCopyButton = () => '',
    renderReleaseTargetEvidenceProductionGapCopyButton = () => '',
    renderReleaseTargetEvidenceProviderReferencesCopyButton = () => '',
    renderReleaseTargetEvidenceReleaseRefreshCopyButton = () => '',
    renderReleaseTargetEvidenceRequiredCommandsCopyButton = () => '',
    renderReleaseTargetEvidenceResidualBlockersCopyButton = () => '',
    renderReleaseTargetEvidenceRiskDecisionRegisterCopyButton = () => '',
    renderReleaseTargetEvidenceSanitizedRegisterCopyButton = () => '',
    renderReleaseTargetEvidenceSubmissionManifestCopyButton = () => '',
  } = copyButtons;

  return `
            <div class="harness-callout" data-release-current-open-blocker-triage="true">
              <strong>Open blocker triage · ${escapeHtml(String(Number(currentOpenBlockerActionSummary.actionCount || currentOpenBlockerActions.length || 0)))} actions</strong>
              <p>${escapeHtml(topPriorityBlockerId ? `Top priority ${topPriorityBlockerId}: ${topPriorityBlockerLabel}` : 'current open blocker triage summary가 없습니다.')}</p>
              ${hasBlockerFilter
                ? `<p class="item-meta" data-release-current-open-blocker-filter-summary="true">filtered ${escapeHtml(String(visibleCurrentOpenBlockerActions.length))}/${escapeHtml(String(currentOpenBlockerActions.length))} · category ${escapeHtml(blockerCategoryFilter || 'all')} · owner ${escapeHtml(blockerOwnerFilter || 'all')} · provider ${escapeHtml(blockerProviderFilter || 'all')} · shared provider ops ${escapeHtml(blockerIncludeSharedProviderOperations ? 'included' : 'excluded')}</p>`
                : '<p class="item-meta" data-release-current-open-blocker-filter-summary="true">all current open blockers visible · shared provider ops included</p>'}
              ${hasEmptyBlockerFilter
                ? `<p class="item-meta" data-release-current-open-blocker-filter-empty="true">이 category/owner/provider 조합에 해당하는 current open blocker가 없습니다. category, owner, provider 중 하나만 유지하거나 필터를 해제하세요.</p>`
                : ''}
              <p class="item-meta" data-release-current-open-blocker-slice-summary="true">
                slice metrics ·
                <span data-release-current-open-blocker-slice-closure-count="${escapeHtml(String(currentOpenBlockerSliceSummary.closureVerificationCount))}">closure verifications ${escapeHtml(String(currentOpenBlockerSliceSummary.closureVerificationCount))}</span>
                ·
                <span data-release-current-open-blocker-slice-required-proof-count="${escapeHtml(String(currentOpenBlockerSliceSummary.requiredProofCount))}">required proofs ${escapeHtml(String(currentOpenBlockerSliceSummary.requiredProofCount))}</span>
                ·
                <span data-release-current-open-blocker-slice-command-count="${escapeHtml(String(currentOpenBlockerSliceSummary.commandCount))}">commands ${escapeHtml(String(currentOpenBlockerSliceSummary.commandCount))}</span>
                ·
                <span data-release-current-open-blocker-slice-evidence-count="${escapeHtml(String(currentOpenBlockerSliceSummary.evidenceDocCount))}">evidence docs ${escapeHtml(String(currentOpenBlockerSliceSummary.evidenceDocCount))}</span>
                ·
                <span data-release-current-open-blocker-slice-top="${escapeHtml(currentOpenBlockerSliceSummary.topVisibleBlockerId || 'none')}">top ${escapeHtml(currentOpenBlockerSliceSummary.topVisibleBlockerId || 'none')}</span>
              </p>
              <div class="release-history-filter-chips">
                ${currentOpenBlockerCategoryEntries.length
                  ? currentOpenBlockerCategoryEntries
                    .map(
                      ([category, count]) => `
                        ${renderReleaseBlockerFilterButton({
                          actionLabel: `blocker category 필터: ${category} ${count}건 · ${blockerFilterLabel}`,
                          buttonText: `${category} ${count}`,
                          category,
                          countAttributeName: 'data-release-current-open-blocker-category-count',
                          countAttributeValue: category,
                          disabled: blockerCategoryFilter === category,
                          owner: blockerOwnerFilter,
                          pressed: blockerCategoryFilter === category,
                          provider: blockerProviderFilter,
                        })}
                      `,
                    )
                    .join('')
                  : '<span class="mini-badge status-running">category 없음</span>'}
                ${currentOpenBlockerOwnerEntries.length
                  ? currentOpenBlockerOwnerEntries
                    .map(
                      ([owner, count]) => `
                        ${renderReleaseBlockerFilterButton({
                          actionLabel: `blocker owner 필터: ${owner} ${count}건 · ${blockerFilterLabel}`,
                          buttonText: `${owner} ${count}`,
                          category: blockerCategoryFilter,
                          countAttributeName: 'data-release-current-open-blocker-owner-count',
                          countAttributeValue: owner,
                          disabled: blockerOwnerFilter === owner,
                          owner,
                          pressed: blockerOwnerFilter === owner,
                          provider: blockerProviderFilter,
                        })}
                      `,
                    )
                    .join('')
                  : '<span class="mini-badge status-running">owner 없음</span>'}
                ${currentOpenBlockerProviderEntries.length
                  ? currentOpenBlockerProviderEntries
                    .map(
                      ([provider, count]) => `
                        ${renderReleaseBlockerFilterButton({
                          actionLabel: `blocker provider 필터: ${provider} ${count}건 · ${blockerFilterLabel}`,
                          buttonText: `${provider} ${count}`,
                          category: blockerCategoryFilter,
                          countAttributeName: 'data-release-current-open-blocker-provider-count',
                          countAttributeValue: provider,
                          disabled: blockerProviderFilter === provider,
                          owner: blockerOwnerFilter,
                          pressed: blockerProviderFilter === provider,
                          provider,
                        })}
                      `,
                    )
                    .join('')
                  : '<span class="mini-badge status-running">provider blocker 없음</span>'}
                <span
                  class="mini-badge ${blockerIncludeSharedProviderOperations ? 'status-running' : 'status-blocked'}"
                  data-release-current-open-blocker-shared-scope="${blockerIncludeSharedProviderOperations ? 'included' : 'excluded'}"
                >shared provider ops ${blockerIncludeSharedProviderOperations ? 'included' : 'excluded'}</span>
                ${renderReleaseBlockerFilterButton({
                  actionLabel: blockerIncludeSharedProviderOperations ? `shared provider ops 제외: ${blockerTriageFilterActionLabel}` : `shared provider ops 포함: ${blockerTriageFilterActionLabel}`,
                  buttonText: blockerIncludeSharedProviderOperations ? 'shared provider ops 제외' : 'shared provider ops 포함',
                  category: blockerCategoryFilter,
                  countAttributeName: 'data-release-current-open-blocker-shared-scope-toggle',
                  countAttributeValue: 'true',
                  includeShared: !blockerIncludeSharedProviderOperations,
                  owner: blockerOwnerFilter,
                  pressed: blockerIncludeSharedProviderOperations,
                  provider: blockerProviderFilter,
                })}
                        ${renderReleaseBlockerSummaryCopyButton({
                          action: 'copy-release-blocker-filter-summary',
                          actionLabel: `slice 요약 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-filter-summary-copy="true"',
                          buttonText: 'slice 요약 복사',
                          category: blockerCategoryFilter,
                          includeShared: true,
                          owner: blockerOwnerFilter,
                          provider: blockerProviderFilter,
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseBlockerSummaryCopyButton({
                              action: 'copy-release-blocker-provider-only-summary',
                              actionLabel: `provider-only summary 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-summary-copy="true"',
                              buttonText: 'provider-only summary 복사',
                              category: blockerCategoryFilter,
                              includeShared: false,
                              owner: blockerOwnerFilter,
                              provider: blockerProviderFilter,
                            })}
                  `
                  : ''}
                        ${renderReleaseLinkCopyButton({
                          action: 'copy-release-blocker-api-link',
                          actionLabel: `API 링크 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-api-link="true"',
                          buttonText: 'API 링크 복사',
                          value: buildReleaseBlockerApiUrl({
                            category: blockerCategoryFilter,
                            includeShared: true,
                            owner: blockerOwnerFilter,
                            provider: blockerProviderFilter,
                          }),
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseLinkCopyButton({
                              action: 'copy-release-blocker-provider-only-api-link',
                              actionLabel: `provider-only API 링크 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-api-link="true"',
                              buttonText: 'provider-only API 링크 복사',
                              value: buildReleaseBlockerApiUrl({
                                category: blockerCategoryFilter,
                                includeShared: false,
                                owner: blockerOwnerFilter,
                                provider: blockerProviderFilter,
                              }),
                            })}
                  `
                  : ''}
                        ${renderReleaseBlockerPackageCopyButton({
                          action: 'copy-release-blocker-filter-package',
                          actionLabel: `slice package 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-filter-package="true"',
                          buttonText: 'slice package 복사',
                          category: blockerCategoryFilter,
                          includeShared: true,
                          owner: blockerOwnerFilter,
                          provider: blockerProviderFilter,
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseBlockerPackageCopyButton({
                              action: 'copy-release-blocker-provider-only-package',
                              actionLabel: `provider-only package 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-package="true"',
                              buttonText: 'provider-only package 복사',
                              category: blockerCategoryFilter,
                              includeShared: false,
                              owner: blockerOwnerFilter,
                              provider: blockerProviderFilter,
                            })}
                  `
                  : ''}
                        ${renderReleaseBlockerClosureChecklistCopyButton({
                          action: 'copy-release-blocker-filter-closure-checklist',
                          actionLabel: `slice closure 체크리스트 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-filter-closure-checklist="true"',
                          buttonText: 'slice closure 체크리스트 복사',
                          category: blockerCategoryFilter,
                          includeShared: true,
                          owner: blockerOwnerFilter,
                          provider: blockerProviderFilter,
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseBlockerClosureChecklistCopyButton({
                              action: 'copy-release-blocker-provider-only-closure-checklist',
                              actionLabel: `provider-only closure checklist 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-closure-checklist="true"',
                              buttonText: 'provider-only closure checklist 복사',
                              category: blockerCategoryFilter,
                              includeShared: false,
                              owner: blockerOwnerFilter,
                              provider: blockerProviderFilter,
                            })}
                  `
                  : ''}
                        ${renderReleaseBlockerClosureMatrixCopyButton({
                          action: 'copy-release-blocker-filter-closure-matrix',
                          actionLabel: `closure matrix 복사: ${blockerTriageFilterActionLabel}`,
                          attributes: 'data-release-current-open-blocker-filter-closure-matrix="true"',
                          buttonText: 'closure matrix 복사',
                          category: blockerCategoryFilter,
                          includeShared: true,
                          owner: blockerOwnerFilter,
                          provider: blockerProviderFilter,
                        })}
                ${blockerProviderFilter
                  ? `
                            ${renderReleaseBlockerClosureMatrixCopyButton({
                              action: 'copy-release-blocker-provider-only-closure-matrix',
                              actionLabel: `provider-only closure matrix 복사: ${blockerTriageProviderOnlyActionLabel}`,
                              attributes: 'data-release-current-open-blocker-provider-only-closure-matrix="true"',
                              buttonText: 'provider-only closure matrix 복사',
                              category: blockerCategoryFilter,
                              includeShared: false,
                              owner: blockerOwnerFilter,
                              provider: blockerProviderFilter,
                            })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceIntakeSummaryCopyButton({
                  action: 'copy-release-target-evidence-intake-summary',
                  actionLabel: `target evidence summary 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-intake-summary="true"',
                  buttonText: 'target evidence summary 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceIntakeSummaryCopyButton({
                      action: 'copy-release-target-evidence-provider-only-intake-summary',
                      actionLabel: `provider-only target summary 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-intake-summary="true"',
                      buttonText: 'provider-only target summary 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceCaptureTemplateCopyButton({
                  action: 'copy-release-target-evidence-capture-template',
                  actionLabel: `target capture template 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-capture-template="true"',
                  buttonText: 'target capture template 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceCaptureTemplateCopyButton({
                      action: 'copy-release-target-evidence-provider-only-capture-template',
                      actionLabel: `provider-only capture template 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-capture-template="true"',
                      buttonText: 'provider-only capture template 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceRequiredCommandsCopyButton({
                  action: 'copy-release-target-evidence-required-commands',
                  actionLabel: `target required commands 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-required-commands="true"',
                  buttonText: 'target required commands 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceRequiredCommandsCopyButton({
                      action: 'copy-release-target-evidence-provider-only-required-commands',
                      actionLabel: `provider-only commands 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-required-commands="true"',
                      buttonText: 'provider-only commands 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceProductionGapCopyButton({
                  action: 'copy-release-target-evidence-production-gap',
                  actionLabel: `target production gap 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-production-gap="true"',
                  buttonText: 'target production gap 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceProductionGapCopyButton({
                      action: 'copy-release-target-evidence-provider-only-production-gap',
                      actionLabel: `provider-only gap 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-production-gap="true"',
                      buttonText: 'provider-only gap 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceExceptionRegisterCopyButton({
                  action: 'copy-release-target-evidence-exception-register',
                  actionLabel: `target exception register 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-exception-register="true"',
                  buttonText: 'target exception register 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceExceptionRegisterCopyButton({
                      action: 'copy-release-target-evidence-provider-only-exception-register',
                      actionLabel: `provider-only exception 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-exception-register="true"',
                      buttonText: 'provider-only exception 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceRiskDecisionRegisterCopyButton({
                  action: 'copy-release-target-evidence-risk-decision-register',
                  actionLabel: `target risk decision 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-risk-decision-register="true"',
                  buttonText: 'target risk decision 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceRiskDecisionRegisterCopyButton({
                      action: 'copy-release-target-evidence-provider-only-risk-decision-register',
                      actionLabel: `provider-only risk 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-risk-decision-register="true"',
                      buttonText: 'provider-only risk 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceProviderReferencesCopyButton({
                  action: 'copy-release-target-evidence-provider-references',
                  actionLabel: `target provider refs 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-provider-references="true"',
                  buttonText: 'target provider refs 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceProviderReferencesCopyButton({
                      action: 'copy-release-target-evidence-provider-only-provider-references',
                      actionLabel: `provider-only refs 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-provider-references="true"',
                      buttonText: 'provider-only refs 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceResidualBlockersCopyButton({
                  action: 'copy-release-target-evidence-residual-blockers',
                  actionLabel: `target residual blockers 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-residual-blockers="true"',
                  buttonText: 'target residual blockers 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceResidualBlockersCopyButton({
                      action: 'copy-release-target-evidence-provider-only-residual-blockers',
                      actionLabel: `provider-only residual 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-residual-blockers="true"',
                      buttonText: 'provider-only residual 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceClosureRulesCopyButton({
                  action: 'copy-release-target-evidence-closure-rules',
                  actionLabel: `target closure rules 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-closure-rules="true"',
                  buttonText: 'target closure rules 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceClosureRulesCopyButton({
                      action: 'copy-release-target-evidence-provider-only-closure-rules',
                      actionLabel: `provider-only closure 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-closure-rules="true"',
                      buttonText: 'provider-only closure 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceSubmissionManifestCopyButton({
                  action: 'copy-release-target-evidence-submission-manifest',
                  actionLabel: `target submission manifest 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-submission-manifest="true"',
                  buttonText: 'target submission manifest 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceSubmissionManifestCopyButton({
                      action: 'copy-release-target-evidence-provider-only-submission-manifest',
                      actionLabel: `provider-only manifest 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-submission-manifest="true"',
                      buttonText: 'provider-only manifest 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceSanitizedRegisterCopyButton({
                  action: 'copy-release-target-evidence-sanitized-register',
                  actionLabel: `target sanitized register 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-sanitized-register="true"',
                  buttonText: 'target sanitized register 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceSanitizedRegisterCopyButton({
                      action: 'copy-release-target-evidence-provider-only-sanitized-register',
                      actionLabel: `provider-only sanitized 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-sanitized-register="true"',
                      buttonText: 'provider-only sanitized 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceBoundaryMapCopyButton({
                  action: 'copy-release-target-evidence-boundary-map',
                  actionLabel: `target boundary map 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-boundary-map="true"',
                  buttonText: 'target boundary map 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceBoundaryMapCopyButton({
                      action: 'copy-release-target-evidence-provider-only-boundary-map',
                      actionLabel: `provider-only boundary 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-boundary-map="true"',
                      buttonText: 'provider-only boundary 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceCommandRerunLogCopyButton({
                  action: 'copy-release-target-evidence-command-rerun-log',
                  actionLabel: `target command log 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-command-rerun-log="true"',
                  buttonText: 'target command log 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceCommandRerunLogCopyButton({
                      action: 'copy-release-target-evidence-provider-only-command-rerun-log',
                      actionLabel: `provider-only command log 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-command-rerun-log="true"',
                      buttonText: 'provider-only command log 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceDecisionRecordCopyButton({
                  action: 'copy-release-target-evidence-decision-record',
                  actionLabel: `target decision record 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-decision-record="true"',
                  buttonText: 'target decision record 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceDecisionRecordCopyButton({
                      action: 'copy-release-target-evidence-provider-only-decision-record',
                      actionLabel: `provider-only decision 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-decision-record="true"',
                      buttonText: 'provider-only decision 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceBlockerDispositionCopyButton({
                  action: 'copy-release-target-evidence-blocker-disposition',
                  actionLabel: `target disposition register 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-blocker-disposition="true"',
                  buttonText: 'target disposition register 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceBlockerDispositionCopyButton({
                      action: 'copy-release-target-evidence-provider-only-blocker-disposition',
                      actionLabel: `provider-only disposition 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-blocker-disposition="true"',
                      buttonText: 'provider-only disposition 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceReleaseRefreshCopyButton({
                  action: 'copy-release-target-evidence-release-refresh',
                  actionLabel: `target refresh evidence 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-release-refresh="true"',
                  buttonText: 'target refresh evidence 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceReleaseRefreshCopyButton({
                      action: 'copy-release-target-evidence-provider-only-release-refresh',
                      actionLabel: `provider-only refresh 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-release-refresh="true"',
                      buttonText: 'provider-only refresh 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseTargetEvidenceIntakePacketCopyButton({
                  action: 'copy-release-target-evidence-intake-packet',
                  actionLabel: `target evidence packet 복사: ${targetEvidenceActionLabel}`,
                  attributes: 'data-release-target-evidence-intake-packet="true"',
                  buttonText: 'target evidence packet 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseTargetEvidenceIntakePacketCopyButton({
                      action: 'copy-release-target-evidence-provider-only-intake-packet',
                      actionLabel: `provider-only target packet 복사: ${targetEvidenceProviderOnlyActionLabel}`,
                      attributes: 'data-release-target-evidence-provider-only-intake-packet="true"',
                      buttonText: 'provider-only target packet 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseBlockerHandoffCopyButton({
                  action: 'copy-release-blocker-filter-handoff',
                  actionLabel: `slice handoff 복사: ${blockerTriageFilterActionLabel}`,
                  attributes: 'data-release-current-open-blocker-filter-handoff="true"',
                  buttonText: 'slice handoff 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseBlockerHandoffCopyButton({
                      action: 'copy-release-blocker-provider-only-handoff',
                      actionLabel: `provider-only handoff 복사: ${blockerTriageProviderOnlyActionLabel}`,
                      attributes: 'data-release-current-open-blocker-provider-only-handoff="true"',
                      buttonText: 'provider-only handoff 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseBlockerCommandsCopyButton({
                  action: 'copy-release-blocker-filter-commands',
                  actionLabel: `slice 명령 복사: ${blockerTriageFilterActionLabel}`,
                  attributes: 'data-release-current-open-blocker-filter-command="true"',
                  buttonText: 'slice 명령 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseBlockerCommandsCopyButton({
                      action: 'copy-release-blocker-provider-only-commands',
                      actionLabel: `provider-only slice 명령 복사: ${blockerTriageProviderOnlyActionLabel}`,
                      attributes: 'data-release-current-open-blocker-provider-only-command="true"',
                      buttonText: 'provider-only slice 명령 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${renderReleaseBlockerEvidenceCopyButton({
                  action: 'copy-release-blocker-filter-evidence',
                  actionLabel: `slice 근거 복사: ${blockerTriageFilterActionLabel}`,
                  attributes: 'data-release-current-open-blocker-filter-evidence="true"',
                  buttonText: 'slice 근거 복사',
                  category: blockerCategoryFilter,
                  includeShared: true,
                  owner: blockerOwnerFilter,
                  provider: blockerProviderFilter,
                })}
                ${blockerProviderFilter
                  ? `
                    ${renderReleaseBlockerEvidenceCopyButton({
                      action: 'copy-release-blocker-provider-only-evidence',
                      actionLabel: `provider-only slice 근거 복사: ${blockerTriageProviderOnlyActionLabel}`,
                      attributes: 'data-release-current-open-blocker-provider-only-evidence="true"',
                      buttonText: 'provider-only slice 근거 복사',
                      category: blockerCategoryFilter,
                      includeShared: false,
                      owner: blockerOwnerFilter,
                      provider: blockerProviderFilter,
                    })}
                  `
                  : ''}
                ${hasEmptyBlockerFilter && blockerCategoryFilter && blockerOwnerFilter
                  ? `
                    ${renderReleaseBlockerFilterButton({
                      actionLabel: `empty blocker filter category만 유지: ${blockerCategoryFilter} · ${blockerFilterLabel}`,
                      buttonText: 'category만 유지',
                      category: blockerCategoryFilter,
                      countAttributeName: 'data-release-current-open-blocker-filter-empty-category',
                      countAttributeValue: 'true',
                      owner: '',
                      pressed: Boolean(blockerCategoryFilter),
                      provider: '',
                    })}
                    ${renderReleaseBlockerFilterButton({
                      actionLabel: `empty blocker filter owner만 유지: ${blockerOwnerFilter} · ${blockerFilterLabel}`,
                      buttonText: 'owner만 유지',
                      category: '',
                      countAttributeName: 'data-release-current-open-blocker-filter-empty-owner',
                      countAttributeValue: 'true',
                      owner: blockerOwnerFilter,
                      pressed: Boolean(blockerOwnerFilter),
                      provider: '',
                    })}
                    ${blockerProviderFilter
                      ? `
                        ${renderReleaseBlockerFilterButton({
                          actionLabel: `empty blocker filter provider만 유지: ${blockerProviderFilter} · ${blockerFilterLabel}`,
                          buttonText: 'provider만 유지',
                          category: '',
                          countAttributeName: 'data-release-current-open-blocker-filter-empty-provider',
                          countAttributeValue: 'true',
                          owner: '',
                          pressed: Boolean(blockerProviderFilter),
                          provider: blockerProviderFilter,
                        })}
                      `
                      : ''}
                  `
                  : hasEmptyBlockerFilter && blockerProviderFilter
                    ? `
                      ${renderReleaseBlockerFilterButton({
                        actionLabel: `empty blocker filter provider만 유지: ${blockerProviderFilter} · ${blockerFilterLabel}`,
                        buttonText: 'provider만 유지',
                        category: '',
                        countAttributeName: 'data-release-current-open-blocker-filter-empty-provider',
                        countAttributeValue: 'true',
                        owner: '',
                        pressed: Boolean(blockerProviderFilter),
                        provider: blockerProviderFilter,
                      })}
                    `
                    : ''}
                ${hasBlockerFilter
                  ? renderReleaseClearActionButton({
                      action: 'clear-release-blocker-filter',
                      actionLabel: `${hasEmptyBlockerFilter ? 'empty blocker filter 조합 해제' : 'blocker 필터 해제'}: ${blockerFilterLabel}`,
                      attributes: `data-release-current-open-blocker-filter-empty-clear="${hasEmptyBlockerFilter ? 'true' : 'false'}"`,
                      buttonText: hasEmptyBlockerFilter ? '조합 해제' : '필터 해제',
                    })
                  : ''}
              </div>
            </div>
            ${focusedBlockerId
              ? `
                  <div class="harness-callout release-blocker-focus-callout" data-release-current-open-blocker-focus="${escapeHtml(focusedBlockerId)}">
                    <strong>Focused current open blocker</strong>
                    <p>${escapeHtml(focusedBlockerEntry?.blocker || focusedBlockerEntry?.stopReason || focusedBlockerId)}</p>
                    ${focusedBlockerEvidenceDocs.length
                      ? `
                          <div class="release-history-filter-chips release-evidence-doc-chips" data-release-current-open-blocker-focus-evidence-list="${escapeHtml(focusedBlockerId)}">
                            ${focusedBlockerEvidenceDocs
                              .map((doc) => {
                                const docHref = String(doc.href || '').trim();
                                const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
                                const docPath = String(doc.path || '').trim();
                                const evidenceDocOpenLabel = `근거 문서 열기: ${docPath || docLabel} · blocker ${focusedBlockerId}`;
                                return `
                                  <span
                                    class="release-evidence-doc-chip"
                                    data-release-current-open-blocker-evidence-doc="${escapeHtml(focusedBlockerId)}"
                                    data-release-current-open-blocker-focus-evidence-doc="${escapeHtml(focusedBlockerId)}"
                                  >
                                    ${docHref
                                      ? `
                                          <a
                                            class="mini-badge status-running release-evidence-doc-link"
                                            href="${escapeHtml(docHref)}"
                                            target="_blank"
                                            rel="noreferrer"
                                            data-release-evidence-doc-href="${escapeHtml(docHref)}"
                                            data-release-evidence-doc-path="${escapeHtml(docPath)}"
                                            aria-label="${escapeHtml(evidenceDocOpenLabel)}"
                                            title="${escapeHtml(evidenceDocOpenLabel)}"
                                          >${escapeHtml(docPath || docLabel)}</a>
                                        `
                                      : `<span class="mini-badge status-running">${escapeHtml(docPath || docLabel)}</span>`}
                                    ${docHref
                                      ? `
                                          ${renderReleaseLinkCopyButton({
                                            action: 'copy-release-evidence-doc-link',
                                            actionLabel: `문서 링크 복사: ${evidenceDocOpenLabel}`,
                                            attributes: `data-ui-href="${escapeHtml(docHref)}" data-ui-label="${escapeHtml(docLabel)}"`,
                                            buttonText: '문서 링크 복사',
                                            className: 'ghost-button release-evidence-doc-copy',
                                            value: docHref,
                                          })}
                                        `
                                      : ''}
                                  </span>
                                `;
                              })
                              .join('')}
                          </div>
                        `
                      : ''}
                    <div class="release-history-focus-actions">
                      ${renderReleaseBlockerHandoffCopyButton({
                        actionLabel: `focused blocker handoff 복사: ${focusedBlockerLabel || focusedBlockerId}`,
                        attributes: `data-release-current-open-blocker-handoff="${escapeHtml(focusedBlockerId)}"`,
                        blockerId: focusedBlockerId,
                        buttonText: 'handoff 복사',
                      })}
                      ${renderReleaseBlockerClosureChecklistCopyButton({
                        actionLabel: `focused blocker closure 체크리스트 복사: ${focusedBlockerLabel || focusedBlockerId}`,
                        attributes: `data-release-current-open-blocker-closure-checklist="${escapeHtml(focusedBlockerId)}"`,
                        blockerId: focusedBlockerId,
                        buttonText: 'closure 체크리스트 복사',
                      })}
                      ${renderReleaseBlockerPackageCopyButton({
                        actionLabel: `focused blocker package 복사: ${focusedBlockerLabel || focusedBlockerId}`,
                        attributes: `data-release-current-open-blocker-package="${escapeHtml(focusedBlockerId)}"`,
                        blockerId: focusedBlockerId,
                        buttonText: 'package 복사',
                      })}
                      ${renderReleaseLinkCopyButton({
                        action: 'copy-release-blocker-link',
                        actionLabel: `focused blocker 링크 복사: ${focusedBlockerLabel || focusedBlockerId}`,
                        attributes: `data-ui-blocker="${escapeHtml(focusedBlockerId)}"`,
                        buttonText: 'blocker 링크 복사',
                        value: focusedBlockerId,
                      })}
                      ${focusedBlockerCommands
                        .map(
                          (command) => renderReleaseCommandCopyButton({
                            actionLabel: `focused blocker 명령 복사: ${command.label || 'blocker command'} · ${focusedBlockerLabel || focusedBlockerId}`,
                            attributes: `data-release-current-open-blocker-command="${escapeHtml(focusedBlockerId)}" data-release-current-open-blocker-focus-command="${escapeHtml(focusedBlockerId)}"`,
                            buttonText: command.label || 'command 복사',
                            command: command.command || '',
                            label: command.label || 'blocker command',
                          }),
                        )
                        .join('')}
                      ${renderReleaseClearActionButton({
                        action: 'clear-release-blocker-focus',
                        actionLabel: `focused blocker 포커스 해제: ${focusedBlockerLabel || focusedBlockerId}`,
                        buttonText: '포커스 해제',
                      })}
                    </div>
                  </div>
                `
              : ''}
            <div class="release-current-status" data-release-current-open-blocker-list="true">
              ${visibleCurrentOpenBlockerActions.length
                ? visibleCurrentOpenBlockerActions
                  .map(
                    (item) => {
                      const commands = Array.isArray(item.commands) ? item.commands.slice(0, 3) : [];
                      const evidenceDocs = Array.isArray(item.evidenceDocs) ? item.evidenceDocs.slice(0, 3) : [];
                      const actionId = String(item.id || '').trim();
                      const isFocusedBlocker = Boolean(actionId) && actionId === focusedBlockerId;
                      const blockerActionLabel = `${actionId || 'blocker'} · ${item.blocker || item.stopReason || 'current open blocker'}`;
                      return `
                      <div class="harness-row ${isFocusedBlocker ? 'is-focused-blocker' : ''}" data-release-current-open-blocker-row="true" data-release-current-open-blocker-action-row="${escapeHtml(actionId)}">
                        <div>
                          <div class="item-title">${escapeHtml(item.blocker || item.stopReason || 'current open blocker')}</div>
                          <div class="item-meta">${escapeHtml(item.nextEvidence || 'release-readiness current open blocker')}</div>
                          ${evidenceDocs.length
                            ? `
                                <div class="release-history-filter-chips release-evidence-doc-chips">
                                  ${evidenceDocs
                                    .map((doc) => {
                                      const docHref = String(doc.href || '').trim();
                                      const docLabel = String(doc.label || doc.path || 'evidence doc').trim();
                                      const docPath = String(doc.path || '').trim();
                                      const evidenceDocOpenLabel = `근거 문서 열기: ${docPath || docLabel} · blocker ${actionId}`;
                                      return `
                                        <span class="release-evidence-doc-chip" data-release-current-open-blocker-evidence-doc="${escapeHtml(actionId)}">
                                          ${docHref
                                            ? `
                                                <a
                                                  class="mini-badge status-running release-evidence-doc-link"
                                                  href="${escapeHtml(docHref)}"
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  data-release-evidence-doc-href="${escapeHtml(docHref)}"
                                                  data-release-evidence-doc-path="${escapeHtml(docPath)}"
                                                  aria-label="${escapeHtml(evidenceDocOpenLabel)}"
                                                  title="${escapeHtml(evidenceDocOpenLabel)}"
                                                >${escapeHtml(docPath || docLabel)}</a>
                                              `
                                            : `<span class="mini-badge status-running">${escapeHtml(docPath || docLabel)}</span>`}
                                          ${docHref
                                            ? `
                                                ${renderReleaseLinkCopyButton({
                                                  action: 'copy-release-evidence-doc-link',
                                                  actionLabel: `문서 링크 복사: ${evidenceDocOpenLabel}`,
                                                  attributes: `data-ui-href="${escapeHtml(docHref)}" data-ui-label="${escapeHtml(docLabel)}"`,
                                                  buttonText: '문서 링크 복사',
                                                  className: 'ghost-button release-evidence-doc-copy',
                                                  value: docHref,
                                                })}
                                              `
                                            : ''}
                                        </span>
                                      `;
                                    })
                                    .join('')}
                                </div>
                              `
                            : ''}
                        </div>
                        <div class="harness-row-meta">
                          <span class="mini-badge status-failed">${escapeHtml(item.category || 'stop-condition')}</span>
                          ${item.provider
                            ? `<span class="mini-badge status-failed" data-release-current-open-blocker-provider="${escapeHtml(actionId)}">${escapeHtml(item.provider)}</span>`
                            : ''}
                          <span class="item-meta">${escapeHtml(item.owner || 'release-owner')}</span>
                          <span class="mini-badge status-failed">stop-condition</span>
                          ${renderReleaseBlockerFocusButton({
                            actionLabel: `${isFocusedBlocker ? '현재 blocker' : 'blocker 보기'}: ${blockerActionLabel}`,
                            blocker: actionId,
                            buttonText: isFocusedBlocker ? '현재 blocker' : 'blocker 보기',
                            disabled: isFocusedBlocker,
                            pressed: isFocusedBlocker,
                          })}
                          ${renderReleaseBlockerHandoffCopyButton({
                            actionLabel: `blocker handoff 복사: ${blockerActionLabel}`,
                            attributes: `data-release-current-open-blocker-handoff="${escapeHtml(actionId)}"`,
                            blockerId: actionId,
                            buttonText: 'handoff 복사',
                          })}
                          ${renderReleaseBlockerClosureChecklistCopyButton({
                            actionLabel: `blocker closure 체크리스트 복사: ${blockerActionLabel}`,
                            attributes: `data-release-current-open-blocker-closure-checklist="${escapeHtml(actionId)}"`,
                            blockerId: actionId,
                            buttonText: 'closure 체크리스트 복사',
                          })}
                          ${renderReleaseBlockerPackageCopyButton({
                            actionLabel: `blocker package 복사: ${blockerActionLabel}`,
                            attributes: `data-release-current-open-blocker-package="${escapeHtml(actionId)}"`,
                            blockerId: actionId,
                            buttonText: 'package 복사',
                          })}
                          ${renderReleaseLinkCopyButton({
                            action: 'copy-release-blocker-link',
                            actionLabel: `blocker 링크 복사: ${blockerActionLabel}`,
                            attributes: `data-ui-blocker="${escapeHtml(actionId)}"`,
                            buttonText: 'blocker 링크 복사',
                            value: actionId,
                          })}
                          ${commands
                            .map(
                              (command) => renderReleaseCommandCopyButton({
                                actionLabel: `blocker 명령 복사: ${command.label || 'blocker command'} · ${blockerActionLabel}`,
                                attributes: `data-release-current-open-blocker-command="${escapeHtml(actionId)}"`,
                                buttonText: command.label || 'command 복사',
                                command: command.command || '',
                                label: command.label || 'blocker command',
                              }),
                            )
                            .join('')}
                        </div>
                      </div>
                    `;
                    },
                  )
                  .join('')
                : `
                    <article class="release-snapshot-card is-empty">
                      <div class="item-title">${hasBlockerFilter ? '현재 triage 필터에 맞는 blocker가 없습니다.' : 'current open blocker가 없습니다.'}</div>
                      <p class="item-meta">${hasBlockerFilter ? 'category 또는 owner 필터를 해제해 전체 current open blocker를 확인하세요.' : 'release-readiness 문서의 Current Open Blockers 섹션이 비어 있습니다.'}</p>
                    </article>
                  `}
            </div>
  `;
}
