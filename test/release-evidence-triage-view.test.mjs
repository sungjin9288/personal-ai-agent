import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createReleaseEvidenceTriageViewModel,
  renderReleaseCurrentOpenBlockers,
  renderReleaseProductionBlockerDetails,
  renderReleaseProductionBlockerSummary,
} from '../src/web/public/lib/release-evidence-triage-view.js';

function createTriageView(overrides = {}) {
  const actions = [
    {
      blocker: 'shared blocker',
      category: 'shared',
      commands: [{ command: 'npm run shared', label: 'shared command' }],
      evidenceDocs: [{ href: '/shared', label: 'shared evidence' }],
      id: 'blocker-shared',
      owner: 'platform',
    },
    {
      blocker: 'provider blocker',
      category: 'provider',
      closureVerification: {
        productionReadyClaimAllowed: false,
        requiredCommands: [{ command: 'npm run closure', label: 'closure command' }],
        requiredEvidenceDocs: [{ href: '/closure', label: 'closure evidence', path: 'docs/closure.md' }],
        requiredProofs: ['approved provider proof'],
        targetBoundaryRequired: true,
      },
      commands: [
        { command: 'npm run provider', label: 'provider command' },
        { command: 'npm run verify', label: 'verify command' },
        { command: 'npm run evidence', label: 'evidence command' },
        { command: 'npm run hidden', label: 'hidden command' },
      ],
      evidenceDocs: [
        { href: '/one', label: 'one' },
        { href: '/two', label: 'two' },
        { href: '/three', label: 'three' },
        { href: '/hidden', label: 'hidden' },
      ],
      id: 'blocker-provider',
      nextEvidence: 'capture <provider> proof',
      owner: 'provider-owner',
      provider: 'openai',
    },
  ];
  const productionBlockers = Array.from({ length: 10 }, (_, index) => `production blocker ${index + 1}`);

  return createReleaseEvidenceTriageViewModel({
    filters: {
      category: 'provider',
      includeShared: false,
      owner: 'provider-owner',
      provider: 'openai',
    },
    focus: {
      blockerId: 'blocker-provider',
      productionBlockerIndex: '9',
      provider: 'openai',
    },
    getCurrentOpenBlockerActions: () => actions,
    getSliceSummary: ({ blockerActions, totalActions }) => ({
      closureVerificationCount: blockerActions.length,
      commandCount: blockerActions.length,
      evidenceDocCount: blockerActions.length,
      requiredProofCount: blockerActions.length * 2,
      topVisibleBlockerId: blockerActions[0]?.id || '',
      totalCount: totalActions.length,
      visibleCount: blockerActions.length,
    }),
    getValidProductionBlockerIndex: (value) => String(value),
    isBlockerVisible: (item, filters) =>
      item.category === filters.category
      && item.owner === filters.owner
      && filters.provider === 'openai'
      && filters.includeShared === false,
    productionBlockersExpanded: false,
    release: {
      releaseReadiness: {
        currentOpenBlockerActionSummary: {
          actionCount: 2,
          categoryCounts: { shared: 1, provider: 1 },
          ownerCounts: { platform: 1, 'provider-owner': 1 },
          providerCounts: { openai: 1 },
          topPriorityBlocker: 'provider blocker',
          topPriorityBlockerId: 'blocker-provider',
        },
        productionBlockers,
        productionReadyStopReason: 'target proof missing',
      },
    },
    ...overrides,
  });
}

test('release evidence triage view model keeps filters, focus, and display limits together', () => {
  const view = createTriageView();

  assert.equal(view.hasBlockerFilter, true);
  assert.equal(view.hasEmptyBlockerFilter, false);
  assert.deepEqual(view.visibleCurrentOpenBlockerActions.map((item) => item.id), ['blocker-provider']);
  assert.equal(view.currentOpenBlockerSliceSummary.visibleCount, 1);
  assert.equal(view.focusedBlockerLabel, 'blocker-provider · provider blocker');
  assert.equal(view.focusedBlockerCommands.length, 3);
  assert.equal(view.focusedBlockerEvidenceDocs.length, 3);
  assert.equal(view.focusedBlockerVerificationFlow.command.command, 'npm run closure');
  assert.equal(view.focusedBlockerVerificationFlow.nextEvidence, 'capture <provider> proof');
  assert.equal(view.focusedBlockerVerificationFlow.productionReadyClaimAllowed, false);
  assert.equal(view.focusedProductionBlocker, 'production blocker 10');
  assert.equal(view.focusedProductionBlockerOrdinal, '10');
  assert.equal(view.productionBlockersExpanded, true);
  assert.equal(view.visibleProductionBlockers.length, 10);
  assert.equal(view.hiddenProductionBlockerCount, 0);
  assert.match(view.blockerFilterLabel, /shared provider ops excluded/);
  assert.match(view.targetEvidenceProviderOnlyActionLabel, /provider-only openai/);
});

test('release evidence triage view model keeps an honest empty filtered slice', () => {
  const view = createTriageView({
    filters: { category: 'missing' },
    focus: {},
    getValidProductionBlockerIndex: () => '',
    isBlockerVisible: () => false,
    productionBlockersExpanded: false,
  });

  assert.equal(view.hasBlockerFilter, true);
  assert.equal(view.hasEmptyBlockerFilter, true);
  assert.equal(view.visibleCurrentOpenBlockerActions.length, 0);
  assert.equal(view.focusedBlockerEntry, null);
  assert.equal(view.focusedProductionBlockerIndex, '');
  assert.equal(view.productionBlockersExpanded, false);
  assert.equal(view.visibleProductionBlockers.length, 8);
  assert.equal(view.hiddenProductionBlockerCount, 2);
});

test('current open blocker view preserves filters, focus, evidence, and copy contracts', () => {
  const copyCalls = [];
  const linkCalls = [];
  const commandCalls = [];
  const html = renderReleaseCurrentOpenBlockers({
    buildReleaseBlockerApiUrl(filters) {
      return `/blockers?shared=${filters.includeShared}`;
    },
    copyButtons: {
      renderReleaseBlockerClosureChecklistCopyButton(options) {
        copyCalls.push(options);
        return `<button data-copy-action="${options.action || 'closure'}"></button>`;
      },
      renderReleaseBlockerHandoffCopyButton(options) {
        copyCalls.push(options);
        return '<button data-handoff-copy="true"></button>';
      },
      renderReleaseBlockerPackageCopyButton(options) {
        copyCalls.push(options);
        return '<button data-package-copy="true"></button>';
      },
      renderReleaseBlockerSummaryCopyButton(options) {
        copyCalls.push(options);
        return `<button data-summary-copy="${options.action}"></button>`;
      },
      renderReleaseCommandCopyButton(options) {
        commandCalls.push(options);
        return `<button data-command-copy="${options.command}"></button>`;
      },
      renderReleaseLinkCopyButton(options) {
        linkCalls.push(options);
        return `<button data-link-copy="${options.value}"></button>`;
      },
    },
    view: createTriageView(),
  });

  assert.match(html, /Open blocker triage · 2 actions/);
  assert.match(html, /filtered 1\/2/);
  assert.match(html, /closure verifications 1/);
  assert.match(html, /required proofs 2/);
  assert.match(html, /data-release-current-open-blocker-focus="blocker-provider"/);
  assert.match(html, /data-release-verification-flow="blocker:blocker-provider"/);
  assert.match(html, /승인된 target boundary/);
  assert.match(html, /data-release-current-open-blocker-action-row="blocker-provider"/);
  assert.match(html, /capture &lt;provider&gt; proof/);
  assert.doesNotMatch(html, /capture <provider> proof/);
  assert.match(html, /data-release-evidence-doc-href="\/one"/);
  assert.equal(linkCalls.some((item) => item.value === '/blockers?shared=true'), true);
  assert.equal(linkCalls.some((item) => item.value === '/blockers?shared=false'), true);
  assert.equal(linkCalls.some((item) => item.value === '/one'), true);
  assert.equal(linkCalls.some((item) => item.value === '/closure'), true);
  assert.equal(commandCalls.some((item) => item.command === 'npm run provider'), true);
  assert.equal(commandCalls.some((item) => item.command === 'npm run closure'), true);
  assert.equal(copyCalls.some((item) => item.action === 'copy-release-blocker-filter-summary'), true);
});

test('current open blocker view renders recovery actions for an empty filtered slice', () => {
  const view = createTriageView({
    filters: {
      category: 'missing-category',
      includeShared: false,
      owner: 'missing-owner',
      provider: 'openai',
    },
    focus: {},
    isBlockerVisible: () => false,
  });
  const html = renderReleaseCurrentOpenBlockers({ view });

  assert.match(html, /data-release-current-open-blocker-filter-empty="true"/);
  assert.match(html, /data-release-current-open-blocker-filter-empty-category="true"/);
  assert.match(html, /data-release-current-open-blocker-filter-empty-owner="true"/);
  assert.match(html, /data-release-current-open-blocker-filter-empty-provider="true"/);
  assert.match(html, /data-release-current-open-blocker-filter-empty-clear="true"/);
  assert.match(html, /현재 triage 필터에 맞는 blocker가 없습니다/);
  assert.doesNotMatch(html, /data-release-current-open-blocker-action-row=/);
});

test('current open blocker view keeps a safe honest state without view data', () => {
  const html = renderReleaseCurrentOpenBlockers();

  assert.match(html, /Open blocker triage · 0 actions/);
  assert.match(html, /current open blocker triage summary가 없습니다/);
  assert.match(html, /current open blocker가 없습니다/);
  assert.doesNotMatch(html, /data-release-current-open-blocker-filter-empty="true"/);
});

test('production blocker summary escapes evidence text and forwards copy contracts', () => {
  const calls = [];
  const html = renderReleaseProductionBlockerSummary({
    renderLinkCopyButton(options) {
      calls.push(['link', options]);
      return '<button data-link-copy="true"></button>';
    },
    renderSummaryCopyButton(options) {
      calls.push(['summary', options]);
      return '<button data-summary-copy="true"></button>';
    },
    view: {
      productionBlockerActionLabel: '2 blockers',
      productionBlockerCount: 2,
      productionBlockerEvidenceDocHref: '/evidence',
      productionBlockers: ['one', 'two'],
      productionReadyStopReason: '<script>unsafe</script>',
    },
  });

  assert.match(html, /Production-ready blocker 2건/);
  assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>unsafe<\/script>/);
  assert.match(html, /data-summary-copy="true"/);
  assert.match(html, /data-link-copy="true"/);
  assert.equal(calls[0][0], 'summary');
  assert.equal(calls[0][1].disabled, false);
  assert.equal(calls[1][1].value, '/evidence');
});

test('production blocker details preserve focus, audit links, actions, and gaps', () => {
  const detailCalls = [];
  const linkCalls = [];
  const html = renderReleaseProductionBlockerDetails({
    gaps: ['<gap>'],
    renderDetailCopyButton(options) {
      detailCalls.push(options);
      return `<button data-detail-copy="${options.action}"></button>`;
    },
    renderLinkCopyButton(options) {
      linkCalls.push(options);
      return `<button data-link-copy="${options.action}"></button>`;
    },
    renderToggleActionButton: () => '<button data-toggle="true"></button>',
    view: createTriageView(),
  });

  assert.match(html, /data-release-production-blocker-focus="10"/);
  assert.match(html, /data-release-production-blocker-row-index="9"/);
  assert.match(html, /data-release-production-blocker-focused="true"/);
  assert.match(html, /data-release-production-blocker-evidence-doc-href="\/api\/execution-v1\/release-doc/);
  assert.match(html, /남은 gap 1건/);
  assert.match(html, /&lt;gap&gt;/);
  assert.equal(detailCalls.some((item) => item.action === 'copy-release-production-blocker-commands'), true);
  assert.equal(linkCalls.some((item) => item.action === 'copy-release-evidence-doc-link'), true);
});

test('production blocker details summarize long lists and keep an honest empty state', () => {
  const collapsedView = createTriageView({
    focus: {},
    getValidProductionBlockerIndex: () => '',
    productionBlockersExpanded: false,
  });
  const collapsedHtml = renderReleaseProductionBlockerDetails({
    renderToggleActionButton: () => '<button data-toggle="true"></button>',
    view: collapsedView,
  });
  const emptyHtml = renderReleaseProductionBlockerDetails({
    view: {
      productionBlockers: [],
      visibleProductionBlockers: [],
    },
  });

  assert.match(collapsedHtml, /data-release-production-blocker-visible-count="8"/);
  assert.match(collapsedHtml, /data-release-production-blocker-hidden-count="2"/);
  assert.match(collapsedHtml, /data-toggle="true"/);
  assert.match(emptyHtml, /production-ready blocker가 없습니다/);
  assert.match(emptyHtml, /남은 gap 0건/);
});
