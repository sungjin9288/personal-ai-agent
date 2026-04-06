import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-attention-lifecycle-'));
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

    throw new Error(`Unexpected provider attention lifecycle url: ${url}`);
  };

  const store = createStore({ rootDir: tempRoot });
  const service = createMissionService({ store, rootDir: tempRoot });

  const workspace = service.addWorkspace({
    name: 'provider-attention-workspace',
    workspacePath,
  });

  await service.probeProvider('anthropic');

  const failedMission = service.createMission({
    workspaceId: workspace.id,
    mode: 'knowledge',
    deliverableType: 'checklist',
    title: 'Stub failed mission',
    objective: 'Create one failed stub mission for provider attention acknowledgement.',
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

const pendingAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention'],
});

assert.equal(pendingAttention.summary.statusCounts.pending, 2);
assert.equal(pendingAttention.items.length, 2);

const anthropicPending = pendingAttention.items.find((item) => item.providerId === 'anthropic');
assert.ok(anthropicPending);

const acknowledged = runCli({
  rootDir: tempRoot,
  args: ['action', 'acknowledge-provider-attention', anthropicPending.actionId, '--note', 'Anthropic probe acknowledged.'],
});

assert.equal(acknowledged.providerId, 'anthropic');
assert.equal(acknowledged.eventFamily, 'probe');
assert.equal(acknowledged.note, 'Anthropic probe acknowledged.');

const pendingAfterAck = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention'],
});

assert.equal(pendingAfterAck.items.length, 1);
assert.equal(pendingAfterAck.items[0].providerId, 'stub');
assert.equal(pendingAfterAck.summary.statusCounts.pending, 1);

const acknowledgedList = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--status', 'acknowledged', '--provider', 'anthropic'],
});

assert.equal(acknowledgedList.items.length, 1);
assert.equal(acknowledgedList.items[0].providerId, 'anthropic');
assert.equal(acknowledgedList.items[0].status, 'acknowledged');
assert.equal(acknowledgedList.summary.statusCounts.acknowledged, 1);

const resolved = runCli({
  rootDir: tempRoot,
  args: ['action', 'resolve-provider-attention', anthropicPending.actionId, '--note', 'Anthropic probe recovered.'],
});

assert.equal(resolved.providerId, 'anthropic');
assert.equal(resolved.status, 'resolved');
assert.equal(resolved.resolutionNote, 'Anthropic probe recovered.');

const acknowledgedAfterResolve = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--status', 'acknowledged', '--provider', 'anthropic'],
});

assert.equal(acknowledgedAfterResolve.items.length, 0);
assert.equal(acknowledgedAfterResolve.summary.statusCounts.acknowledged, 0);

const resolvedList = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--status', 'resolved', '--provider', 'anthropic'],
});

assert.equal(resolvedList.items.length, 1);
assert.equal(resolvedList.items[0].providerId, 'anthropic');
assert.equal(resolvedList.items[0].status, 'resolved');
assert.equal(resolvedList.summary.statusCounts.resolved, 1);

const providerAttentionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-attention-required'],
});

assert.equal(providerAttentionInbox.items.length, 1);
assert.equal(providerAttentionInbox.items[0].providerId, 'stub');
assert.equal(providerAttentionInbox.summary.actionClassCounts.providerAttentionRequired, 1);

const providerCheck = runCli({
  rootDir: tempRoot,
  args: ['provider', 'check', 'anthropic'],
});

assert.equal(providerCheck.attentionStatus, 'resolved');
assert.equal(providerCheck.latestAttentionAcknowledgement.providerId, 'anthropic');
assert.equal(providerCheck.latestAttentionResolution.providerId, 'anthropic');
assert.equal(providerCheck.latestAttentionAcknowledgement.actionId, anthropicPending.actionId);

const attentionEvents = runCli({
  rootDir: tempRoot,
  args: ['provider', 'events', '--family', 'attention', '--provider', 'anthropic'],
});

assert.equal(attentionEvents.summary.total, 2);
assert.equal(attentionEvents.summary.familyCounts.attention, 2);
assert.equal(attentionEvents.summary.latestAttentionEvent.providerId, 'anthropic');
assert.equal(attentionEvents.timeline[0].eventKind, 'provider-attention-acknowledged');
assert.equal(attentionEvents.timeline[1].eventKind, 'provider-attention-resolved');

const providerOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'providers'],
});

assert.equal(providerOverview.summary.attentionRequiredCount, 1);
assert.equal(providerOverview.summary.acknowledgedAttentionCount, 0);
assert.equal(providerOverview.summary.resolvedAttentionCount, 1);
assert.equal(providerOverview.summary.latestAttentionRequiredEvent.providerId, 'stub');
assert.equal(providerOverview.summary.latestAttentionAcknowledgement.providerId, 'anthropic');
assert.equal(providerOverview.summary.latestAttentionResolution.providerId, 'anthropic');

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.providerAttentionRequiredCount, 1);
assert.equal(globalOverview.summary.providerAttentionAcknowledgedCount, 0);
assert.equal(globalOverview.summary.providerAttentionResolvedCount, 1);
assert.equal(globalOverview.summary.latestProviderAttentionRequiredEvent.providerId, 'stub');
assert.equal(globalOverview.summary.latestProviderAttentionAcknowledgement.providerId, 'anthropic');
assert.equal(globalOverview.summary.latestProviderAttentionResolution.providerId, 'anthropic');

console.log(
  JSON.stringify(
    {
      resolvedProviderId: resolved.providerId,
      mode: 'provider-attention-lifecycle',
      ok: true,
      pendingProviderAttentionCount: pendingAfterAck.items.length,
    },
    null,
    2,
  ),
);
