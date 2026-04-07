import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-attention-recovery-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const workspace = service.addWorkspace({
  name: 'provider-recovery-workspace',
  workspacePath,
});

const mission = service.createMission({
  workspaceId: workspace.id,
  mode: 'knowledge',
  deliverableType: 'checklist',
  title: 'Stub provider recovery mission',
  objective: 'Create one failed stub run and one successful rerun for recovery evidence.',
  constraints: ['force-rubric-fail'],
});

const failedRun = await service.runMission(mission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(failedRun.mission.status, 'failed');

store.updateMission(mission.id, (current) => ({
  ...current,
  constraints: [],
}));

const recoveredRun = await service.runMission(mission.id, {
  provider: 'stub',
  providerSpecified: true,
});

assert.equal(recoveredRun.mission.status, 'completed');

const pendingAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--provider', 'stub', '--workspace', workspace.id, '--mission', mission.id],
});

assert.equal(pendingAttention.items.length, 0);
assert.equal(pendingAttention.summary.statusCounts.pending, 0);

const recoveredAttention = runCli({
  rootDir: tempRoot,
  args: [
    'action',
    'provider-attention',
    '--status',
    'recovered',
    '--provider',
    'stub',
    '--workspace',
    workspace.id,
    '--mission',
    mission.id,
  ],
});

assert.equal(recoveredAttention.items.length, 1);
assert.equal(recoveredAttention.summary.statusCounts.recovered, 1);
assert.equal(recoveredAttention.items[0].providerId, 'stub');
assert.equal(recoveredAttention.items[0].eventFamily, 'execution');
assert.equal(recoveredAttention.items[0].status, 'recovered');
assert.ok(recoveredAttention.items[0].recoveredAt);

const providerActionInbox = runCli({
  rootDir: tempRoot,
  args: ['action', 'inbox', '--class', 'provider-attention-required', '--workspace', workspace.id],
});

assert.equal(providerActionInbox.items.length, 0);
assert.equal(providerActionInbox.summary.actionClassCounts.providerAttentionRequired, 0);

const providerCheck = runCli({
  rootDir: tempRoot,
  args: ['provider', 'check', 'stub'],
});

assert.equal(providerCheck.attentionStatus, 'recovered');
assert.equal(providerCheck.latestAttentionRecovery.providerId, 'stub');
assert.equal(providerCheck.latestAttentionRecovery.actionId, recoveredAttention.items[0].actionId);

const providerEvents = runCli({
  rootDir: tempRoot,
  args: ['provider', 'events', '--family', 'attention', '--provider', 'stub'],
});

assert.equal(providerEvents.timeline.length, 2);
assert.equal(providerEvents.timeline[0].eventKind, 'provider-attention-opened');
assert.equal(providerEvents.timeline[1].eventKind, 'provider-attention-recovered');
assert.equal(providerEvents.summary.familyCounts.attention, 2);
assert.equal(providerEvents.summary.latestAttentionEvent.eventKind, 'provider-attention-recovered');

const providerOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'providers'],
});

assert.equal(providerOverview.summary.recoveredAttentionCount, 1);
assert.equal(providerOverview.summary.latestAttentionRecovery.providerId, 'stub');

const missionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', mission.id],
});

assert.equal(missionShow.summary.providerAttentionRecoveredCount, 1);
assert.equal(missionShow.summary.latestProviderAttentionRecovery.providerId, 'stub');

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(
  missionTimeline.timeline.some((event) => event.kind === 'provider-execution-failed' && event.providerId === 'stub'),
  true,
);
assert.equal(
  missionTimeline.timeline.some((event) => event.kind === 'provider-execution-succeeded' && event.providerId === 'stub'),
  true,
);
assert.equal(
  missionTimeline.timeline.some((event) => event.kind === 'provider-attention-opened' && event.providerId === 'stub'),
  true,
);
assert.equal(
  missionTimeline.timeline.some((event) => event.kind === 'provider-attention-recovered' && event.providerId === 'stub'),
  true,
);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id],
});

assert.equal(workspaceTimeline.summary.eventCounts['provider-execution-failed'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['provider-attention-opened'], 1);
assert.equal(workspaceTimeline.summary.eventCounts['provider-attention-recovered'], 1);

const workspaceOverview = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'overview', workspace.id],
});

assert.equal(workspaceOverview.summary.providerAttentionRecoveredCount, 1);
assert.equal(workspaceOverview.summary.latestProviderAttentionRecovery.providerId, 'stub');

const globalOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'global'],
});

assert.equal(globalOverview.summary.providerAttentionRecoveredCount, 1);
assert.equal(globalOverview.summary.latestProviderAttentionRecovery.providerId, 'stub');

console.log(
  JSON.stringify(
    {
      missionId: mission.id,
      mode: 'provider-attention-recovery',
      ok: true,
      recoveredProviderId: recoveredAttention.items[0].providerId,
    },
    null,
    2,
  ),
);
