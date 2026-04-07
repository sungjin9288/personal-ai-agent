import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-action-inbox-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const originalFetch = globalThis.fetch;
const originalEnv = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  ANTHROPIC_VERSION: process.env.ANTHROPIC_VERSION,
};

try {
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.test/v1';
  process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6';
  process.env.ANTHROPIC_VERSION = '2023-06-01';

  globalThis.fetch = async (url) => {
    if (url === 'https://api.anthropic.test/v1/models') {
      return {
        ok: false,
        status: 503,
        async text() {
          return 'upstream unavailable';
        },
      };
    }

    throw new Error(`Unexpected provider action inbox url: ${url}`);
  };

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ store, rootDir: tempRoot });

  const workspace = service.addWorkspace({
    name: 'provider-action-workspace',
    workspacePath,
  });

  await service.probeProvider('anthropic');

  const failedMission = service.createMission({
    workspaceId: workspace.id,
    mode: 'knowledge',
    deliverableType: 'checklist',
    title: 'Stub failed mission',
    objective: 'Create one failed stub mission for provider attention.',
    constraints: ['force-rubric-fail'],
  });

  const failedRun = await service.runMission(failedMission.id, {
    provider: 'stub',
    providerSpecified: true,
  });

  assert.equal(failedRun.mission.status, 'failed');

  const pendingProviderAttention = service.getProviderAttentionInbox({
    workspaceId: workspace.id,
  });
  const stubAttention = pendingProviderAttention.items.find(
    (item) => item.providerId === 'stub' && item.eventFamily === 'execution',
  );

  assert.ok(stubAttention);
  service.acknowledgeProviderAttention(stubAttention.actionId, {
    note: 'Acknowledge stub provider attention to expose residual drift.',
  });
  service.resolveProviderAttention(stubAttention.actionId, {
    note: 'Resolve stub provider attention before drift-only follow-up.',
  });
} finally {
  globalThis.fetch = originalFetch;

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
process.env.ANTHROPIC_BASE_URL = 'https://api.anthropic.test/v1';
process.env.ANTHROPIC_MODEL = 'claude-sonnet-4-6';
process.env.ANTHROPIC_VERSION = '2023-06-01';

const inbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox'],
});

assert.equal(inbox.summary.actionClassCounts.providerAttentionRequired, 1);
assert.equal(inbox.summary.actionClassCounts.providerHealthDriftRequired, 1);
assert.equal(inbox.summary.actionCounts.providerAttention, 1);
assert.equal(inbox.summary.actionCounts.providerHealthDrift, 1);

const providerAttentionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-attention-required'],
});

assert.equal(providerAttentionInbox.items.length, 1);
assert.equal(providerAttentionInbox.summary.actionClassCounts.providerAttentionRequired, 1);
assert.equal(providerAttentionInbox.summary.actionCounts.providerAttention, 1);
assert.equal(
  providerAttentionInbox.items.some(
    (item) =>
      item.providerId === 'anthropic' &&
      item.eventFamily === 'probe' &&
      item.recommendedOwner === 'human-approver' &&
      item.priority === 'medium' &&
      item.workspaceId === null,
  ),
  true,
);
assert.equal(providerAttentionInbox.items.every((item) => item.providerId !== 'stub'), true);

const providerHealthDriftInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-health-drift-required'],
});

assert.equal(providerHealthDriftInbox.items.length, 1);
assert.equal(providerHealthDriftInbox.summary.actionClassCounts.providerHealthDriftRequired, 1);
assert.equal(providerHealthDriftInbox.summary.actionCounts.providerHealthDrift, 1);
assert.equal(providerHealthDriftInbox.items[0].providerId, 'stub');
assert.equal(providerHealthDriftInbox.items[0].recommendedOwner, 'mission-owner');
assert.equal(providerHealthDriftInbox.items[0].priority, 'medium');
assert.equal(providerHealthDriftInbox.items[0].driftStatus, 'watch');
assert.deepEqual(providerHealthDriftInbox.items[0].driftReasonCodes, ['monthly-failed-up']);

const dedicatedProviderHealthDriftInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-health-drift'],
});

assert.equal(dedicatedProviderHealthDriftInbox.items.length, 1);
assert.equal(dedicatedProviderHealthDriftInbox.summary.total, 1);
assert.equal(dedicatedProviderHealthDriftInbox.summary.providerCounts.stub, 1);
assert.equal(dedicatedProviderHealthDriftInbox.summary.reasonCodeCounts['monthly-failed-up'], 1);
assert.equal(dedicatedProviderHealthDriftInbox.items[0].actionId, providerHealthDriftInbox.items[0].actionId);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'list'],
})[0];

const workspaceScopedProviderAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-attention-required', '--workspace', workspace.id],
});

assert.equal(workspaceScopedProviderAttention.items.length, 0);

const workspaceScopedProviderHealthDrift = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-health-drift-required', '--workspace', workspace.id],
});

assert.equal(workspaceScopedProviderHealthDrift.items.length, 1);
assert.equal(workspaceScopedProviderHealthDrift.items[0].providerId, 'stub');
assert.equal(workspaceScopedProviderHealthDrift.items[0].missionStatus, 'failed');

const providerScopedProviderHealthDrift = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-health-drift', '--provider', 'stub'],
});

assert.equal(providerScopedProviderHealthDrift.items.length, 1);
assert.equal(providerScopedProviderHealthDrift.items[0].providerId, 'stub');

const missionScopedProviderHealthDrift = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-health-drift-required', '--mission', providerHealthDriftInbox.items[0].missionId],
});

assert.equal(missionScopedProviderHealthDrift.items.length, 1);
assert.equal(missionScopedProviderHealthDrift.items[0].missionId, providerHealthDriftInbox.items[0].missionId);

const overviewProviders = runCli({
  rootDir: tempRoot,
  args: ['overview', 'providers'],
});

assert.equal(overviewProviders.summary.attentionRequiredCount, 1);
assert.equal(overviewProviders.summary.latestAttentionRequiredEvent.providerId, 'anthropic');
assert.deepEqual([...overviewProviders.summary.attentionRequiredProviderIds].sort(), ['anthropic']);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.providerAttentionRequiredCount, 1);
assert.equal(globalOverview.summary.latestProviderAttentionRequiredEvent.providerId, 'anthropic');

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'provider-action-inbox',
      providerAttentionCount: providerAttentionInbox.items.length,
    },
    null,
    2,
  ),
);
