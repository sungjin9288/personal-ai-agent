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

assert.equal(inbox.summary.actionClassCounts.providerAttentionRequired, 2);
assert.equal(inbox.summary.actionCounts.providerAttention, 2);

const providerAttentionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-attention-required'],
});

assert.equal(providerAttentionInbox.items.length, 2);
assert.equal(providerAttentionInbox.summary.actionClassCounts.providerAttentionRequired, 2);
assert.equal(providerAttentionInbox.summary.actionCounts.providerAttention, 2);
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
assert.equal(
  providerAttentionInbox.items.some(
    (item) =>
      item.providerId === 'stub' &&
      item.eventFamily === 'execution' &&
      item.recommendedOwner === 'workspace-owner' &&
      item.priority === 'high' &&
      item.workspaceId !== null,
  ),
  true,
);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'list'],
})[0];

const workspaceScopedProviderAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-attention-required', '--workspace', workspace.id],
});

assert.equal(workspaceScopedProviderAttention.items.length, 1);
assert.equal(workspaceScopedProviderAttention.items[0].providerId, 'stub');
assert.equal(workspaceScopedProviderAttention.items[0].eventFamily, 'execution');

const overviewProviders = runCli({
  rootDir: tempRoot,
  args: ['overview', 'providers'],
});

assert.equal(overviewProviders.summary.attentionRequiredCount, 2);
assert.equal(overviewProviders.summary.latestAttentionRequiredEvent.providerId, 'stub');
assert.deepEqual([...overviewProviders.summary.attentionRequiredProviderIds].sort(), ['anthropic', 'stub']);

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.providerAttentionRequiredCount, 2);
assert.equal(globalOverview.summary.latestProviderAttentionRequiredEvent.providerId, 'stub');

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
