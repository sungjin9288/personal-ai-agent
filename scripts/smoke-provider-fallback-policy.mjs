import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-fallback-policy-'));
const workspacePath = path.join(tempRoot, 'workspace');

fs.mkdirSync(workspacePath, { recursive: true });

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const workspace = service.addWorkspace({
  name: 'provider-fallback-policy-workspace',
  workspacePath,
});

const fallbackMission = service.createMission({
  workspaceId: workspace.id,
  mode: 'knowledge',
  deliverableType: 'checklist',
  title: 'Anthropic fallback to stub mission',
  objective: 'Verify provider failure can fall back to stub without operator intervention.',
  constraints: [],
});

const fallbackResult = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: ['mission', 'run', fallbackMission.id, '--provider', 'anthropic', '--fallback-provider', 'stub'],
});

assert.equal(fallbackResult.status, 'completed');
assert.equal(fallbackResult.provider, 'stub');
assert.equal(fallbackResult.providerFallback.enabled, true);
assert.equal(fallbackResult.providerFallback.primaryProviderId, 'anthropic');
assert.deepEqual(fallbackResult.providerFallback.fallbackProviderIds, ['stub']);
assert.deepEqual(fallbackResult.providerFallback.attemptedProviderIds, ['anthropic', 'stub']);
assert.equal(fallbackResult.providerFallback.fallbackUsed, true);
assert.equal(fallbackResult.providerFallback.selectedProviderId, 'stub');
assert.equal(fallbackResult.providerFallback.attempts.length, 2);
assert.equal(fallbackResult.providerFallback.attempts[0].providerId, 'anthropic');
assert.equal(fallbackResult.providerFallback.attempts[0].providerFailure.failureKind, 'config');
assert.equal(fallbackResult.providerFallback.attempts[1].providerId, 'stub');
assert.equal(fallbackResult.providerFallback.attempts[1].providerFailure, null);

const fallbackSessions = createStore({ rootDir: tempRoot }).listSessionsByMission(fallbackMission.id);
assert.equal(fallbackSessions.length, 2);
assert.equal(fallbackSessions.find((session) => session.provider === 'anthropic')?.status, 'failed');
assert.equal(fallbackSessions.find((session) => session.provider === 'stub')?.status, 'completed');

const fallbackTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', fallbackMission.id],
});

assert.equal(fallbackTimeline.summary.providerFallbackRequested, true);
assert.equal(fallbackTimeline.summary.providerFallbackAttemptCount, 2);
assert.equal(fallbackTimeline.summary.providerFallbackUsedCount, 1);
assert.deepEqual(fallbackTimeline.summary.providerFallbackPrimaryProviderIds, ['anthropic']);
assert.deepEqual(fallbackTimeline.summary.providerFallbackUsedProviderIds, ['stub']);
assert.equal(fallbackTimeline.timeline.filter((event) => event.kind === 'provider-fallback-attempted').length, 1);
assert.equal(fallbackTimeline.timeline.filter((event) => event.kind === 'provider-fallback-used').length, 1);
assert.equal(
  fallbackTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-attempted' &&
      event.providerFailureKind === 'config' &&
      event.primaryProviderId === 'anthropic',
  ),
  true,
);
assert.equal(
  fallbackTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-used' &&
      event.providerId === 'stub' &&
      event.primaryProviderId === 'anthropic',
  ),
  true,
);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id],
});

assert.equal(workspaceTimeline.summary.providerFallbackAttemptCount, 2);
assert.equal(workspaceTimeline.summary.providerFallbackUsedCount, 1);
assert.deepEqual(workspaceTimeline.summary.providerFallbackPrimaryProviderIds, ['anthropic']);
assert.deepEqual(workspaceTimeline.summary.providerFallbackUsedProviderIds, ['stub']);
assert.equal(workspaceTimeline.timeline.filter((event) => event.kind === 'provider-fallback-attempted').length, 1);
assert.equal(workspaceTimeline.timeline.filter((event) => event.kind === 'provider-fallback-used').length, 1);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-used' &&
      event.missionId === fallbackMission.id &&
      event.workspaceId === workspace.id,
  ),
  true,
);

const deterministicFailureMission = service.createMission({
  workspaceId: workspace.id,
  mode: 'knowledge',
  deliverableType: 'checklist',
  title: 'Reviewer failure does not fallback mission',
  objective: 'Verify deterministic reviewer failure is not retried as provider failover.',
  constraints: ['force-rubric-fail'],
});

const deterministicFailureResult = runCli({
  rootDir: tempRoot,
  env: {
    OPENAI_API_KEY: '',
  },
  args: ['mission', 'run', deterministicFailureMission.id, '--provider', 'stub', '--fallback-provider', 'openai'],
});

assert.equal(deterministicFailureResult.status, 'failed');
assert.equal(deterministicFailureResult.provider, 'stub');
assert.equal(deterministicFailureResult.providerFallback.enabled, true);
assert.equal(deterministicFailureResult.providerFallback.fallbackUsed, false);
assert.deepEqual(deterministicFailureResult.providerFallback.attemptedProviderIds, ['stub']);
assert.equal(deterministicFailureResult.providerFallback.attempts.length, 1);
assert.equal(deterministicFailureResult.providerFallback.attempts[0].providerFailure, null);

const deterministicFailureTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', deterministicFailureMission.id],
});

assert.equal(deterministicFailureTimeline.summary.providerFallbackRequested, true);
assert.equal(deterministicFailureTimeline.summary.providerFallbackAttemptCount, 1);
assert.equal(deterministicFailureTimeline.summary.providerFallbackUsedCount, 0);
assert.equal(
  deterministicFailureTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-attempted' &&
      event.providerFailureKind === null &&
      /fallback stopped because no provider failure metadata was detected/.test(event.detail),
  ),
  true,
);

const operatorTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

assert.equal(operatorTimeline.summary.providerFallbackAttemptCount, 3);
assert.equal(operatorTimeline.summary.providerFallbackUsedCount, 1);
assert.deepEqual(operatorTimeline.summary.providerFallbackPrimaryProviderIds, ['anthropic', 'stub']);
assert.deepEqual(operatorTimeline.summary.providerFallbackUsedProviderIds, ['stub']);
assert.equal(operatorTimeline.timeline.filter((event) => event.kind === 'provider-fallback-attempted').length, 2);
assert.equal(operatorTimeline.timeline.filter((event) => event.kind === 'provider-fallback-used').length, 1);

console.log(
  JSON.stringify(
    {
      deterministicFailureFallbackUsed: deterministicFailureResult.providerFallback.fallbackUsed,
      fallbackUsed: fallbackResult.providerFallback.fallbackUsed,
      mode: 'provider-fallback-policy',
      ok: true,
    },
    null,
    2,
  ),
);
