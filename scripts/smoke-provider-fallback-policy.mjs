import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { createClosedLocalhostBaseUrl, runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-fallback-policy-'));
const workspacePath = path.join(tempRoot, 'workspace');
const recoverableFailureBaseUrl = await createClosedLocalhostBaseUrl();

fs.mkdirSync(workspacePath, { recursive: true });

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const workspace = service.addWorkspace({
  name: 'provider-fallback-policy-workspace',
  workspacePath,
});

const policyOnlyMission = service.createMission({
  workspaceId: workspace.id,
  mode: 'knowledge',
  deliverableType: 'checklist',
  title: 'Fallback policy without fallback provider mission',
  objective: 'Verify fallback policy cannot be supplied without an actual fallback provider.',
  constraints: [],
});

assert.throws(
  () =>
    runCli({
      rootDir: tempRoot,
      args: [
        'mission',
        'run',
        policyOnlyMission.id,
        '--provider',
        'stub',
        '--fallback-policy',
        'recoverable-provider-failure-only',
      ],
    }),
  /--fallback-policy requires --fallback-provider with at least one distinct fallback provider/,
);
assert.equal(createStore({ rootDir: tempRoot }).listSessionsByMission(policyOnlyMission.id).length, 0);

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
assert.equal(fallbackResult.providerFallback.policyId, 'provider-failure-only');
assert.equal(fallbackResult.providerFallback.primaryProviderId, 'anthropic');
assert.deepEqual(fallbackResult.providerFallback.fallbackProviderIds, ['stub']);
assert.deepEqual(fallbackResult.providerFallback.attemptedProviderIds, ['anthropic', 'stub']);
assert.equal(fallbackResult.providerFallback.fallbackUsed, true);
assert.equal(fallbackResult.providerFallback.selectedProviderId, 'stub');
assert.equal(fallbackResult.providerFallback.attempts.length, 2);
assert.equal(fallbackResult.providerFallback.attempts[0].providerId, 'anthropic');
assert.equal(fallbackResult.providerFallback.attempts[0].fallbackEligible, true);
assert.equal(fallbackResult.providerFallback.attempts[0].fallbackPolicy, 'provider-failure-only');
assert.equal(fallbackResult.providerFallback.attempts[0].fallbackStopReason, 'eligible-provider-failure');
assert.equal(fallbackResult.providerFallback.attempts[0].nextProviderId, 'stub');
assert.equal(fallbackResult.providerFallback.attempts[0].providerFailure.failureKind, 'config');
assert.equal(fallbackResult.providerFallback.attempts[1].providerId, 'stub');
assert.equal(fallbackResult.providerFallback.attempts[1].fallbackStopReason, 'mission-status-completed');
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
assert.equal(fallbackTimeline.summary.providerFallbackPolicyCounts['provider-failure-only'], 2);
assert.equal(fallbackTimeline.summary.providerFallbackUsedCount, 1);
assert.equal(fallbackTimeline.summary.providerFallbackStopReasonCounts['eligible-provider-failure'], 1);
assert.equal(fallbackTimeline.summary.providerFallbackStopReasonCounts['mission-status-completed'], 1);
assert.deepEqual(fallbackTimeline.summary.providerFallbackPrimaryProviderIds, ['anthropic']);
assert.deepEqual(fallbackTimeline.summary.providerFallbackUsedProviderIds, ['stub']);
assert.equal(fallbackTimeline.timeline.filter((event) => event.kind === 'provider-fallback-attempted').length, 1);
assert.equal(fallbackTimeline.timeline.filter((event) => event.kind === 'provider-fallback-used').length, 1);
assert.equal(
  fallbackTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-attempted' &&
      event.providerFailureKind === 'config' &&
      event.fallbackPolicy === 'provider-failure-only' &&
      event.fallbackEligible === true &&
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
assert.equal(workspaceTimeline.summary.providerFallbackPolicyCounts['provider-failure-only'], 2);
assert.equal(workspaceTimeline.summary.providerFallbackUsedCount, 1);
assert.equal(workspaceTimeline.summary.providerFallbackStopReasonCounts['eligible-provider-failure'], 1);
assert.equal(workspaceTimeline.summary.providerFallbackStopReasonCounts['mission-status-completed'], 1);
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
assert.equal(deterministicFailureResult.providerFallback.policyId, 'provider-failure-only');
assert.equal(deterministicFailureResult.providerFallback.fallbackUsed, false);
assert.deepEqual(deterministicFailureResult.providerFallback.attemptedProviderIds, ['stub']);
assert.equal(deterministicFailureResult.providerFallback.attempts.length, 1);
assert.equal(deterministicFailureResult.providerFallback.attempts[0].fallbackStopReason, 'no-provider-failure-metadata');
assert.equal(deterministicFailureResult.providerFallback.attempts[0].providerFailure, null);

const deterministicFailureTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', deterministicFailureMission.id],
});

assert.equal(deterministicFailureTimeline.summary.providerFallbackRequested, true);
assert.equal(deterministicFailureTimeline.summary.providerFallbackAttemptCount, 1);
assert.equal(deterministicFailureTimeline.summary.providerFallbackPolicyCounts['provider-failure-only'], 1);
assert.equal(deterministicFailureTimeline.summary.providerFallbackUsedCount, 0);
assert.equal(
  deterministicFailureTimeline.summary.providerFallbackStopReasonCounts['no-provider-failure-metadata'],
  1,
);
assert.equal(
  deterministicFailureTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-attempted' &&
      event.providerFailureKind === null &&
      event.fallbackStopReason === 'no-provider-failure-metadata',
  ),
  true,
);

const recoverableSuccessMission = service.createMission({
  workspaceId: workspace.id,
  mode: 'knowledge',
  deliverableType: 'checklist',
  title: 'Recoverable-only policy falls back on recoverable provider failure',
  objective: 'Verify recoverable provider failures can fall back under recoverable-only policy.',
  constraints: [],
});

const recoverableSuccessResult = runCli({
  rootDir: tempRoot,
  env: {
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_BASE_URL: recoverableFailureBaseUrl,
  },
  args: [
    'mission',
    'run',
    recoverableSuccessMission.id,
    '--provider',
    'openai',
    '--fallback-provider',
    'stub',
    '--fallback-policy',
    'recoverable-provider-failure-only',
  ],
});

assert.equal(recoverableSuccessResult.status, 'completed');
assert.equal(recoverableSuccessResult.provider, 'stub');
assert.equal(recoverableSuccessResult.providerFallback.policyId, 'recoverable-provider-failure-only');
assert.equal(recoverableSuccessResult.providerFallback.fallbackUsed, true);
assert.deepEqual(recoverableSuccessResult.providerFallback.attemptedProviderIds, ['openai', 'stub']);
assert.equal(recoverableSuccessResult.providerFallback.attempts[0].fallbackEligible, true);
assert.equal(recoverableSuccessResult.providerFallback.attempts[0].fallbackStopReason, 'eligible-provider-failure');
assert.equal(recoverableSuccessResult.providerFallback.attempts[0].providerFailure.failureKind, 'transport');
assert.equal(recoverableSuccessResult.providerFallback.attempts[0].providerFailure.recoverable, true);
assert.equal(recoverableSuccessResult.providerFallback.attempts[0].nextProviderId, 'stub');
assert.equal(recoverableSuccessResult.providerFallback.attempts[1].fallbackStopReason, 'mission-status-completed');

const recoverableSuccessTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', recoverableSuccessMission.id],
});

assert.equal(recoverableSuccessTimeline.summary.providerFallbackAttemptCount, 2);
assert.equal(
  recoverableSuccessTimeline.summary.providerFallbackPolicyCounts['recoverable-provider-failure-only'],
  2,
);
assert.equal(recoverableSuccessTimeline.summary.providerFallbackUsedCount, 1);
assert.equal(recoverableSuccessTimeline.summary.providerFallbackStopReasonCounts['eligible-provider-failure'], 1);
assert.equal(recoverableSuccessTimeline.summary.providerFallbackStopReasonCounts['mission-status-completed'], 1);
assert.deepEqual(recoverableSuccessTimeline.summary.providerFallbackPrimaryProviderIds, ['openai']);
assert.deepEqual(recoverableSuccessTimeline.summary.providerFallbackUsedProviderIds, ['stub']);
assert.equal(
  recoverableSuccessTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-attempted' &&
      event.providerId === 'openai' &&
      event.providerFailureKind === 'transport' &&
      event.fallbackPolicy === 'recoverable-provider-failure-only' &&
      event.fallbackEligible === true &&
      event.fallbackStopReason === 'eligible-provider-failure',
  ),
  true,
);
assert.equal(
  recoverableSuccessTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-used' &&
      event.providerId === 'stub' &&
      event.primaryProviderId === 'openai',
  ),
  true,
);

const recoverablePolicyMission = service.createMission({
  workspaceId: workspace.id,
  mode: 'knowledge',
  deliverableType: 'checklist',
  title: 'Recoverable-only policy does not fallback on config failure',
  objective: 'Verify non-recoverable provider failures stop policy-aware fallback.',
  constraints: [],
});

const recoverablePolicyResult = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: [
    'mission',
    'run',
    recoverablePolicyMission.id,
    '--provider',
    'anthropic',
    '--fallback-provider',
    'stub',
    '--fallback-policy',
    'recoverable-provider-failure-only',
  ],
});

assert.equal(recoverablePolicyResult.status, 'failed');
assert.equal(recoverablePolicyResult.provider, 'anthropic');
assert.equal(recoverablePolicyResult.providerFallback.policyId, 'recoverable-provider-failure-only');
assert.equal(recoverablePolicyResult.providerFallback.fallbackUsed, false);
assert.deepEqual(recoverablePolicyResult.providerFallback.attemptedProviderIds, ['anthropic']);
assert.equal(recoverablePolicyResult.providerFallback.attempts[0].fallbackEligible, false);
assert.equal(recoverablePolicyResult.providerFallback.attempts[0].fallbackStopReason, 'non-recoverable-provider-failure');
assert.equal(recoverablePolicyResult.providerFallback.attempts[0].providerFailure.failureKind, 'config');

const recoverablePolicyTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', recoverablePolicyMission.id],
});

assert.equal(recoverablePolicyTimeline.summary.providerFallbackAttemptCount, 1);
assert.equal(recoverablePolicyTimeline.summary.providerFallbackPolicyCounts['recoverable-provider-failure-only'], 1);
assert.equal(
  recoverablePolicyTimeline.summary.providerFallbackStopReasonCounts['non-recoverable-provider-failure'],
  1,
);
assert.equal(recoverablePolicyTimeline.summary.providerFallbackUsedCount, 0);

const operatorTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

assert.equal(operatorTimeline.summary.providerFallbackAttemptCount, 6);
assert.equal(operatorTimeline.summary.providerFallbackPolicyCounts['provider-failure-only'], 3);
assert.equal(operatorTimeline.summary.providerFallbackPolicyCounts['recoverable-provider-failure-only'], 3);
assert.equal(operatorTimeline.summary.providerFallbackUsedCount, 2);
assert.equal(operatorTimeline.summary.providerFallbackStopReasonCounts['eligible-provider-failure'], 2);
assert.equal(operatorTimeline.summary.providerFallbackStopReasonCounts['mission-status-completed'], 2);
assert.equal(operatorTimeline.summary.providerFallbackStopReasonCounts['non-recoverable-provider-failure'], 1);
assert.deepEqual(operatorTimeline.summary.providerFallbackPrimaryProviderIds, ['anthropic', 'stub', 'openai']);
assert.deepEqual(operatorTimeline.summary.providerFallbackUsedProviderIds, ['stub']);
assert.equal(operatorTimeline.timeline.filter((event) => event.kind === 'provider-fallback-attempted').length, 4);
assert.equal(operatorTimeline.timeline.filter((event) => event.kind === 'provider-fallback-used').length, 2);

const providerFallbackEvents = runCli({
  rootDir: tempRoot,
  args: ['provider', 'events', '--family', 'fallback'],
});

assert.equal(providerFallbackEvents.summary.familyCounts.fallback, 6);
assert.equal(providerFallbackEvents.summary.eventCounts['provider-fallback-attempted'], 4);
assert.equal(providerFallbackEvents.summary.eventCounts['provider-fallback-used'], 2);
assert.equal(providerFallbackEvents.summary.latestFallbackEvent.eventKind, 'provider-fallback-attempted');
assert.equal(providerFallbackEvents.summary.fallbackPolicyCounts['provider-failure-only'], 3);
assert.equal(providerFallbackEvents.summary.fallbackPolicyCounts['recoverable-provider-failure-only'], 3);
assert.equal(providerFallbackEvents.summary.fallbackStopReasonCounts['non-recoverable-provider-failure'], 1);
assert.equal(providerFallbackEvents.summary.fallbackStopReasonCounts['eligible-provider-failure'], 2);
assert.equal(providerFallbackEvents.timeline.filter((event) => event.eventFamily === 'fallback').length, 6);

const anthropicFallbackEvents = runCli({
  rootDir: tempRoot,
  args: ['provider', 'events', '--provider', 'anthropic', '--family', 'fallback'],
});

assert.equal(anthropicFallbackEvents.summary.familyCounts.fallback, 2);
assert.equal(anthropicFallbackEvents.timeline[0].providerId, 'anthropic');
assert.equal(anthropicFallbackEvents.timeline[0].providerFailureKind, 'config');
assert.equal(anthropicFallbackEvents.timeline.at(-1).fallbackStopReason, 'non-recoverable-provider-failure');

const stubFallbackEvents = runCli({
  rootDir: tempRoot,
  args: ['provider', 'events', '--provider', 'stub', '--family', 'fallback'],
});

assert.equal(stubFallbackEvents.summary.familyCounts.fallback, 3);
assert.equal(stubFallbackEvents.timeline.filter((event) => event.kind === 'provider-fallback-used').length, 2);

const openAiFallbackEvents = runCli({
  rootDir: tempRoot,
  args: ['provider', 'events', '--provider', 'openai', '--family', 'fallback'],
});

assert.equal(openAiFallbackEvents.summary.familyCounts.fallback, 1);
assert.equal(openAiFallbackEvents.timeline[0].providerId, 'openai');
assert.equal(openAiFallbackEvents.timeline[0].providerFailureKind, 'transport');
assert.equal(openAiFallbackEvents.timeline[0].fallbackPolicy, 'recoverable-provider-failure-only');
assert.equal(openAiFallbackEvents.timeline[0].fallbackStopReason, 'eligible-provider-failure');

const providerOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'providers'],
});

assert.equal(providerOverview.summary.eventFamilyCounts.fallback, 6);
assert.equal(providerOverview.summary.fallbackPolicyCounts['recoverable-provider-failure-only'], 3);
assert.equal(providerOverview.summary.fallbackStopReasonCounts['non-recoverable-provider-failure'], 1);
assert.equal(providerOverview.summary.fallbackStopReasonCounts['eligible-provider-failure'], 2);
assert.equal(providerOverview.summary.latestFallbackEvent.eventKind, 'provider-fallback-attempted');

console.log(
  JSON.stringify(
    {
      deterministicFailureFallbackUsed: deterministicFailureResult.providerFallback.fallbackUsed,
      fallbackUsed: fallbackResult.providerFallback.fallbackUsed,
      mode: 'provider-fallback-policy',
      ok: true,
      recoverablePolicyFallbackUsed: recoverablePolicyResult.providerFallback.fallbackUsed,
      recoverablePolicyPositiveFallbackUsed: recoverableSuccessResult.providerFallback.fallbackUsed,
    },
    null,
    2,
  ),
);
