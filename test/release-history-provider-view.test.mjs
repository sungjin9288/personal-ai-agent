import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createReleaseHistoryProviderViewModel,
  renderReleaseActionHistory,
  renderReleaseProviderReadiness,
} from '../src/web/public/lib/release-history-provider-view.js';

function createView(overrides = {}) {
  const release = {
    providerReadiness: [
      {
        command: 'npm run live:openai',
        envKey: 'OPENAI_API_KEY',
        label: 'OpenAI',
        preflightCommand: 'npm run preflight:openai',
        provider: 'openai',
        ready: true,
        status: 'ready-for-live-validation',
      },
      {
        command: 'npm run live:local',
        envKey: 'LOCAL_PROVIDER_MODEL',
        label: 'Local',
        provider: 'local',
        ready: false,
        status: 'missing-env',
      },
    ],
    releaseActionHistory: [
      {
        action: 'live',
        branch: 'main',
        commit: '1234567890abcdef',
        createdAt: '2026-07-13T12:00:00.000Z',
        id: 'history-attention',
        outcome: 'failed',
        provider: 'openai',
        scope: 'provider',
        summary: '<attention>',
      },
      {
        action: 'preflight',
        createdAt: '2026-07-13T11:00:00.000Z',
        id: 'history-ready',
        outcome: 'passed',
        provider: 'openai',
        scope: 'provider',
        summary: 'ready',
      },
      {
        action: 'snapshot',
        createdAt: '2026-07-13T10:00:00.000Z',
        id: 'history-local',
        outcome: 'passed',
        provider: 'local',
        scope: 'release',
        summary: 'local',
      },
    ],
  };

  return createReleaseHistoryProviderViewModel({
    filters: { provider: 'openai' },
    focus: {
      blockerId: 'blocker-openai',
      expandedHistoryId: 'history-ready',
      historyId: 'history-ready',
      provider: 'openai',
    },
    getActionLabel: (action) => `action ${action}`,
    getActionScopeLabel: (scope) => `scope ${scope}`,
    getProviderBlockerActions: ({ provider }) => provider === 'openai'
      ? [{ blocker: 'target proof', id: 'blocker-openai', stopReason: 'target <proof>' }]
      : [],
    getProviderClosureSummary: (_entry, blockers) => ({
      closureVerificationCount: blockers.length,
      commandCount: blockers.length + 1,
      evidenceDocCount: blockers.length + 2,
      productionReadyClaimAllowed: false,
      requiredProofCount: blockers.length + 3,
      targetBoundaryRequiredCount: blockers.length,
    }),
    getProviderLiveCommand: (entry) => `npm run live:${entry.provider}`,
    isAttentionOutcome: (outcome) => ['blocked', 'failed'].includes(String(outcome || '').toLowerCase()),
    isFlowActive: () => ({ attentionFlowActive: true, sameFlowActive: true }),
    liveConfirmProvider: 'openai',
    liveRefreshPreflight: { notes: ['confirm note'], summary: 'confirm live' },
    preflightResults: {
      openai: { checks: [{ status: 'passed' }], status: 'ready-for-live-validation' },
    },
    release,
    releaseActionLabel: 'commit-1',
    releaseAllPreflight: {
      blockedCount: 0,
      missingEnvCount: 1,
      readyForLiveCount: 1,
      status: 'ready-but-missing-env',
    },
    ...overrides,
  });
}

test('history and provider view model keeps filtering, focus order, and closure evidence together', () => {
  const view = createView();

  assert.deepEqual(view.history.items.map((item) => item.id), ['history-ready', 'history-attention']);
  assert.equal(view.history.hasFilter, true);
  assert.equal(view.history.items[0].isFocused, true);
  assert.equal(view.history.items[0].isExpanded, true);
  assert.deepEqual(view.providers.entries.map((item) => item.provider), ['openai', 'local']);
  assert.equal(view.providers.entries[0].liveConfirmArmed, true);
  assert.equal(view.providers.entries[0].preflightSummary, 'preflight 통과 · 1개 smoke passed');
  assert.equal(view.providers.focused.topBlockerId, 'blocker-openai');
  assert.equal(view.providers.focused.closureSummary.productionReadyClaimAllowed, false);
  assert.equal(view.providers.focused.sameFlowActive, true);
  assert.equal(view.providers.focused.attentionFlowActive, true);
  assert.equal(view.providers.aggregate.label, 'ready-but-missing-env · ready 1 · env 1');
});

test('history view escapes evidence and preserves focus, filter, detail, and copy actions', () => {
  const navigationCalls = [];
  const linkCalls = [];
  const html = renderReleaseActionHistory({
    copyButtons: {
      renderReleaseLinkCopyButton(options) {
        linkCalls.push(options);
        return `<button data-link-copy="${options.action || 'triage'}"></button>`;
      },
      renderReleaseProviderNavigationButton(options) {
        navigationCalls.push(options);
        return `<button data-navigation="${options.action}"></button>`;
      },
      renderReleaseToggleActionButton(options) {
        return `<button data-toggle="${options.value}"></button>`;
      },
    },
    view: createView(),
  });

  assert.match(html, /data-release-history-id="history-ready"/);
  assert.match(html, /data-toggle="history-ready"/);
  assert.match(html, /scope provider/);
  assert.match(html, /&lt;attention&gt;/);
  assert.doesNotMatch(html, /<attention>/);
  assert.equal(navigationCalls.some((item) => item.action === 'filter-release-history-attention'), true);
  assert.equal(linkCalls.some((item) => item.action === 'copy-release-flow-link'), true);
});

test('history view keeps an honest empty filtered state', () => {
  const view = createView({ filters: { provider: 'missing' }, focus: {} });
  const html = renderReleaseActionHistory({ view });

  assert.equal(view.history.items.length, 0);
  assert.match(html, /현재 필터와 맞는 release action 기록이 없습니다/);
  assert.match(html, /필터를 해제하면 전체 history를 다시 볼 수 있습니다/);
});

test('provider view preserves blocked claims, live confirmation, blocker focus, and copy contracts', () => {
  const commandCalls = [];
  const linkCalls = [];
  const packageCalls = [];
  const html = renderReleaseProviderReadiness({
    copyButtons: {
      renderReleaseBlockerPackageCopyButton(options) {
        packageCalls.push(options);
        return '<button data-blocker-package="true"></button>';
      },
      renderReleaseCommandCopyButton(options) {
        commandCalls.push(options);
        return `<button data-command="${options.command}"></button>`;
      },
      renderReleaseLinkCopyButton(options) {
        linkCalls.push(options);
        return `<button data-link="${options.value}"></button>`;
      },
      renderReleaseProviderNavigationButton(options) {
        return `<button data-navigation="${options.action}"></button>`;
      },
      renderReleaseProviderReadinessPackageCopyButton(options) {
        packageCalls.push(options);
        return '<button data-provider-package="true"></button>';
      },
    },
    view: createView(),
  });

  assert.match(html, /현재 포커스된 provider readiness 카드/);
  assert.match(html, /data-release-provider-production-ready-claim="openai">claim blocked/);
  assert.match(html, /data-release-provider-target-boundary-count="openai">target boundary 1/);
  assert.match(html, /data-release-provider="openai"/);
  assert.match(html, /data-release-provider="local"/);
  assert.match(html, /confirm live/);
  assert.match(html, /target &lt;proof&gt;/);
  assert.equal(commandCalls.some((item) => item.command === 'npm run live:openai'), true);
  assert.equal(linkCalls.some((item) => item.value === 'openai'), true);
  assert.equal(packageCalls.some((item) => item.blockerId === 'blocker-openai'), true);
});

test('provider view renders an honest empty readiness state', () => {
  const view = createReleaseHistoryProviderViewModel();
  const html = renderReleaseProviderReadiness({ view });

  assert.match(html, /data-release-provider-empty="true"/);
  assert.match(html, /provider readiness 정보가 없습니다/);
  assert.doesNotMatch(html, /claim allowed/);
});
