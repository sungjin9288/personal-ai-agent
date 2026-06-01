import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMissionService } from '../src/core/mission-service.mjs';
import { createStore } from '../src/core/store.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-provider-route-decision-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const store = createStore({ rootDir: tempRoot });
const service = createMissionService({ store, rootDir: tempRoot });

const workspace = service.addWorkspace({
  name: 'provider-route-decision-workspace',
  workspacePath,
});

const mission = service.createMission({
  workspaceId: workspace.id,
  mode: 'knowledge',
  deliverableType: 'checklist',
  title: 'Provider route decision fallback mission',
  objective: 'Verify provider fallback route decisions are inspectable across control-plane views.',
  constraints: [],
});

const fallbackResult = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: ['mission', 'run', mission.id, '--provider', 'anthropic', '--fallback-provider', 'stub'],
});

assert.equal(fallbackResult.status, 'completed');
assert.equal(fallbackResult.providerFallback.providerRouteDecisionCount, 2);
assert.equal(fallbackResult.providerFallback.providerRouteDecisionPolicyCounts['provider-failure-only'], 2);
assert.equal(fallbackResult.providerFallback.providerRouteDecisionRouteCounts['mission.run'], 2);

const [primaryAttempt, fallbackAttempt] = fallbackResult.providerFallback.attempts;

assert.equal(primaryAttempt.providerRouteDecision.schemaVersion, 'personal-ai-agent-provider-route-decision/v1');
assert.equal(primaryAttempt.providerRouteDecisionId, primaryAttempt.providerRouteDecision.id);
assert.equal(primaryAttempt.providerRouteDecision.decision, 'fallback-eligible');
assert.equal(primaryAttempt.providerRouteDecision.action.route, 'mission.run');
assert.equal(primaryAttempt.providerRouteDecision.bindings.gatewayEventId, primaryAttempt.gatewayEventId);
assert.equal(primaryAttempt.providerRouteDecision.bindings.missionId, mission.id);
assert.equal(primaryAttempt.providerRouteDecision.bindings.sessionId, primaryAttempt.sessionId);
assert.equal(primaryAttempt.providerRouteDecision.bindings.workspaceId, workspace.id);
assert.equal(primaryAttempt.providerRouteDecision.evidencePolicy.noRawSecrets, true);
assert.equal(primaryAttempt.providerRouteDecision.policyId, 'provider-failure-only');
assert.equal(primaryAttempt.providerRouteDecision.providerRoute.primaryProviderId, 'anthropic');
assert.equal(primaryAttempt.providerRouteDecision.providerRoute.providerId, 'anthropic');
assert.equal(primaryAttempt.providerRouteDecision.providerRoute.nextProviderId, 'stub');
assert.equal(primaryAttempt.providerRouteDecision.providerRoute.stopReason, 'eligible-provider-failure');
assert.equal(primaryAttempt.providerRouteDecision.providerFailure.failureKind, 'config');
assert.equal(primaryAttempt.providerRouteDecision.providerFailure.rawMessage, undefined);

assert.equal(fallbackAttempt.providerRouteDecision.decision, 'fallback-used');
assert.equal(fallbackAttempt.providerRouteDecision.providerRoute.primaryProviderId, 'anthropic');
assert.equal(fallbackAttempt.providerRouteDecision.providerRoute.providerId, 'stub');
assert.equal(fallbackAttempt.providerRouteDecision.providerRoute.stopReason, 'mission-status-completed');

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

assert.equal(missionTimeline.summary.providerRouteDecisionCount, 2);
assert.equal(missionTimeline.summary.providerRouteDecisionPolicyCounts['provider-failure-only'], 2);
assert.equal(missionTimeline.summary.providerRouteDecisionRouteCounts['mission.run'], 2);
assert.equal(missionTimeline.summary.latestProviderRouteDecisionEvent.providerRouteDecisionId, fallbackAttempt.providerRouteDecisionId);
assert.equal(
  missionTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-attempted' &&
      event.gatewayEventId === primaryAttempt.gatewayEventId &&
      event.providerRouteDecisionId === primaryAttempt.providerRouteDecisionId &&
      event.providerRouteDecision.decision === 'fallback-eligible' &&
      event.providerRouteDecision.bindings.gatewayEventId === primaryAttempt.gatewayEventId,
  ),
  true,
);
assert.equal(
  missionTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-used' &&
      event.gatewayEventId === fallbackAttempt.gatewayEventId &&
      event.providerRouteDecisionId === fallbackAttempt.providerRouteDecisionId &&
      event.providerRouteDecision.decision === 'fallback-used',
  ),
  true,
);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id],
});

assert.equal(workspaceTimeline.summary.providerRouteDecisionCount, 2);
assert.equal(workspaceTimeline.summary.providerRouteDecisionPolicyCounts['provider-failure-only'], 2);
assert.equal(workspaceTimeline.summary.providerRouteDecisionRouteCounts['mission.run'], 2);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) =>
      event.kind === 'provider-fallback-attempted' &&
      event.providerRouteDecisionId === primaryAttempt.providerRouteDecisionId &&
      event.workspaceId === workspace.id,
  ),
  true,
);

const operatorTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

assert.equal(operatorTimeline.summary.providerRouteDecisionCount, 2);
assert.equal(operatorTimeline.summary.providerRouteDecisionPolicyCounts['provider-failure-only'], 2);
assert.equal(operatorTimeline.summary.providerRouteDecisionRouteCounts['mission.run'], 2);
assert.equal(operatorTimeline.summary.latestProviderRouteDecisionEvent.providerRouteDecisionId, fallbackAttempt.providerRouteDecisionId);

const providerFallbackEvents = runCli({
  rootDir: tempRoot,
  args: ['provider', 'events', '--family', 'fallback'],
});

assert.equal(providerFallbackEvents.summary.providerRouteDecisionCount, 2);
assert.equal(providerFallbackEvents.summary.providerRouteDecisionPolicyCounts['provider-failure-only'], 2);
assert.equal(providerFallbackEvents.summary.providerRouteDecisionRouteCounts['mission.run'], 2);
assert.equal(providerFallbackEvents.summary.latestProviderRouteDecisionEvent.providerRouteDecisionId, fallbackAttempt.providerRouteDecisionId);
assert.equal(
  providerFallbackEvents.timeline.some(
    (event) =>
      event.eventFamily === 'fallback' &&
      event.providerRouteDecisionId === primaryAttempt.providerRouteDecisionId &&
      event.providerRouteDecision.bindings.gatewayEventId === primaryAttempt.gatewayEventId,
  ),
  true,
);

const providerOverview = runCli({
  rootDir: tempRoot,
  args: ['overview', 'providers'],
});

assert.equal(providerOverview.summary.providerRouteDecisionCount, 2);
assert.equal(providerOverview.summary.providerRouteDecisionPolicyCounts['provider-failure-only'], 2);
assert.equal(providerOverview.summary.providerRouteDecisionRouteCounts['mission.run'], 2);
assert.equal(providerOverview.summary.latestProviderRouteDecisionEvent.providerRouteDecisionId, fallbackAttempt.providerRouteDecisionId);

console.log(
  JSON.stringify(
    {
      mode: 'provider-fallback-route-decision',
      ok: true,
      providerRouteDecisionCount: providerFallbackEvents.summary.providerRouteDecisionCount,
      primaryProviderRouteDecisionId: primaryAttempt.providerRouteDecisionId,
    },
    null,
    2,
  ),
);
