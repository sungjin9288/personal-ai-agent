import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  createReleaseRecommendationViewModel,
  renderReleaseRecommendations,
} from '../src/web/public/lib/release-recommendation-view.js';

function createView(overrides = {}) {
  return createReleaseRecommendationViewModel({
    filters: { outcome: 'attention', provider: 'openai', scope: 'provider' },
    focus: { historyId: 'attempt-1', provider: 'openai' },
    getActionLabel: (action) => `action ${action}`,
    isAttentionOutcome: (outcome) => outcome === 'failed',
    isFlowActive: () => ({ attentionFlowActive: true, sameFlowActive: true }),
    release: {
      providerReadiness: [{
        command: 'npm run live:openai',
        envKey: 'OPENAI_API_KEY',
        label: 'OpenAI <primary>',
        preflightCommand: 'npm run preflight:openai',
        provider: 'openai',
        ready: false,
      }],
      recommendedActions: [{
        action: 'run-release-preflight',
        actionProvider: 'openai',
        category: 'required',
        description: '확인 <필요>',
        label: 'OpenAI <검증>',
      }],
      releaseActionHistory: [{
        action: 'provider-preflight',
        createdAt: '2026-07-14T01:00:00.000Z',
        id: 'attempt-1',
        outcome: 'failed',
        provider: 'openai',
        scope: 'provider',
        summary: '실패 <원인>',
      }],
    },
    ...overrides,
  });
}

test('recommendation view model keeps provider, command, history, and active flow together', () => {
  const view = createView();
  const [item] = view.items;

  assert.equal(item.providerId, 'openai');
  assert.equal(item.command.command, 'npm run preflight:openai');
  assert.equal(item.latestAction.id, 'attempt-1');
  assert.equal(item.latestAttentionAction.id, 'attempt-1');
  assert.equal(item.sameProviderFocused, true);
  assert.equal(item.sameFlowActive, true);
  assert.equal(item.attentionFlowActive, true);
  assert.equal(item.matchCount, 1);
});

test('recommendation renderer escapes evidence and preserves navigation and copy contracts', () => {
  const navigationCalls = [];
  const linkCalls = [];
  const commandCalls = [];
  const html = renderReleaseRecommendations({
    copyButtons: {
      renderReleaseCommandCopyButton(options) {
        commandCalls.push(options);
        return '<button data-command-copy="true"></button>';
      },
      renderReleaseLinkCopyButton(options) {
        linkCalls.push(options);
        return `<button data-link-copy="${options.action}"></button>`;
      },
      renderReleaseProviderNavigationButton(options) {
        navigationCalls.push(options);
        return `<button data-navigation="${options.action}"></button>`;
      },
    },
    view: createView(),
  });

  assert.match(html, /OpenAI &lt;검증&gt;/);
  assert.match(html, /실패 &lt;원인&gt;/);
  assert.doesNotMatch(html, /<검증>|<원인>/);
  assert.match(html, /is-active-flow/);
  assert.match(html, /is-active-provider/);
  assert.equal(commandCalls[0].command, 'npm run preflight:openai');
  assert.equal(navigationCalls.some((item) => item.action === 'focus-release-history'), true);
  assert.equal(navigationCalls.some((item) => item.action === 'focus-release-flow'), true);
  assert.equal(linkCalls.some((item) => item.action === 'copy-release-provider-link'), true);
  assert.equal(linkCalls.some((item) => item.action === 'copy-release-flow-link'), true);
});

test('recommendation renderer keeps executable and honest empty states distinct', () => {
  const actionableView = createReleaseRecommendationViewModel({
    release: {
      recommendedActions: [{
        action: 'archive-release-snapshot',
        category: 'release',
        label: 'snapshot 고정',
      }],
    },
  });
  const actionableHtml = renderReleaseRecommendations({ view: actionableView });
  const emptyHtml = renderReleaseRecommendations({
    view: createReleaseRecommendationViewModel(),
  });
  const optionalProviderHtml = renderReleaseRecommendations({
    view: createReleaseRecommendationViewModel({
      release: {
        providerReadiness: [{
          command: 'npm run live:local',
          envKey: 'LOCAL_PROVIDER_MODEL',
          label: 'Local',
          provider: 'local',
          ready: false,
        }],
        recommendedActions: [{ envKey: 'LOCAL_PROVIDER_MODEL', label: 'local env 준비' }],
      },
    }),
  });

  assert.match(actionableHtml, /data-ui-action="archive-release-snapshot"/);
  assert.match(optionalProviderHtml, /LOCAL_PROVIDER_MODEL/);
  assert.match(emptyHtml, /필수 다음 액션 없음/);
  assert.match(emptyHtml, /optional provider expansion/);
});
