import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-sandbox-decisions-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'sandbox-decision-workspace'],
});

const mission = runCli({
  rootDir: tempRoot,
  args: [
    'mission',
    'create',
    '--workspace',
    workspace.id,
    '--mode',
    'knowledge',
    '--deliverable',
    'checklist',
    '--title',
    'Sandbox decision timelines',
    '--objective',
    'Verify sandbox decisions are durable gateway and operator timeline evidence.',
  ],
});

assert.ok(mission.gatewayEventId, 'mission create should record a gateway event id');

const run = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(run.status, 'completed');
assert.ok(run.gatewayEventId, 'mission run should record a gateway event id');

const session = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id, '--session', run.sessionId],
});

assert.equal(session.gatewayEvents.length, 1);
assert.equal(session.summary.sandboxDecisionCount, 1);
assert.equal(session.summary.sandboxDecisionModeCounts['local-runtime'], 1);

const gatewayEvent = session.gatewayEvents[0];
assert.equal(gatewayEvent.sandboxDecision.schemaVersion, 'personal-ai-agent-sandbox-decision/v1');
assert.equal(gatewayEvent.sandboxDecision.id, `${gatewayEvent.id}:sandbox`);
assert.equal(gatewayEvent.sandboxDecision.policyId, 'local-runtime-sandbox-policy/v1');
assert.equal(gatewayEvent.sandboxDecision.mode, 'local-runtime');
assert.equal(gatewayEvent.sandboxDecision.reason, 'default-local-runtime-boundary');
assert.equal(gatewayEvent.sandboxDecision.action.type, 'mission-run');
assert.equal(gatewayEvent.sandboxDecision.action.route, 'mission.run');
assert.equal(gatewayEvent.sandboxDecision.resource.type, 'mission');
assert.equal(gatewayEvent.sandboxDecision.bindings.providerId, 'stub');
assert.equal(gatewayEvent.sandboxDecision.bindings.missionId, mission.id);
assert.equal(gatewayEvent.sandboxDecision.evidencePolicy.noRawSecrets, true);
assert.equal(gatewayEvent.sandboxDecision.evidencePolicy.noRawCustomerPayloads, true);
assert.equal(gatewayEvent.sandboxPolicy.sandboxDecisionId, gatewayEvent.sandboxDecision.id);
assert.equal(gatewayEvent.sandboxPolicy.policyId, 'local-runtime-sandbox-policy/v1');
assert.equal(session.session.sourceContext.gatewaySandboxDecisionId, gatewayEvent.sandboxDecision.id);

const missionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', mission.id],
});

assert.equal(missionShow.summary.gatewayEventCount, 2);
assert.equal(missionShow.summary.sandboxDecisionCount, 2);
assert.equal(missionShow.summary.sandboxDecisionModeCounts['local-runtime'], 2);
assert.equal(missionShow.summary.sandboxDecisionPolicyCounts['local-runtime-sandbox-policy/v1'], 2);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

const gatewayTimelineEvent = missionTimeline.timeline.find(
  (event) => event.kind === 'gateway-event-recorded' && event.gatewayEventId === gatewayEvent.id,
);
assert.ok(gatewayTimelineEvent);
assert.equal(gatewayTimelineEvent.sandboxDecisionId, gatewayEvent.sandboxDecision.id);
assert.equal(gatewayTimelineEvent.sandboxMode, 'local-runtime');
assert.equal(gatewayTimelineEvent.sandboxPolicyId, 'local-runtime-sandbox-policy/v1');
assert.match(gatewayTimelineEvent.detail, /sandbox local-runtime for mission-run/);

const missionSandboxEvents = missionTimeline.timeline.filter((event) => event.kind === 'sandbox-decision-recorded');
assert.equal(missionSandboxEvents.length, 2);
assert.ok(
  missionSandboxEvents.some(
    (event) =>
      event.gatewayEventId === gatewayEvent.id &&
      event.sandboxDecisionId === gatewayEvent.sandboxDecision.id &&
      event.sandboxMode === 'local-runtime' &&
      event.sandboxPolicyId === 'local-runtime-sandbox-policy/v1',
  ),
);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id],
});

assert.equal(workspaceTimeline.summary.eventCounts['sandbox-decision-recorded'], 2);
assert.equal(workspaceTimeline.summary.sandboxDecisionCount, 2);
assert.equal(workspaceTimeline.summary.sandboxDecisionModeCounts['local-runtime'], 2);
assert.equal(workspaceTimeline.summary.sandboxDecisionPolicyCounts['local-runtime-sandbox-policy/v1'], 2);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) =>
      event.kind === 'sandbox-decision-recorded' &&
      event.gatewayEventId === gatewayEvent.id &&
      event.workspaceId === workspace.id,
  ),
  true,
);

const operatorTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

assert.equal(operatorTimeline.summary.eventCounts['sandbox-decision-recorded'], 2);
assert.equal(operatorTimeline.summary.sandboxDecisionCount, 2);
assert.equal(operatorTimeline.summary.sandboxDecisionModeCounts['local-runtime'], 2);
assert.equal(operatorTimeline.summary.sandboxDecisionPolicyCounts['local-runtime-sandbox-policy/v1'], 2);
assert.equal(operatorTimeline.summary.latestSandboxDecisionEvent.sandboxDecisionId, gatewayEvent.sandboxDecision.id);
assert.equal(
  operatorTimeline.timeline.some(
    (event) =>
      event.kind === 'sandbox-decision-recorded' &&
      event.gatewayEventId === gatewayEvent.id &&
      event.missionId === mission.id &&
      event.workspaceId === workspace.id,
  ),
  true,
);

for (let index = 1; index < missionTimeline.timeline.length; index += 1) {
  assert.ok(String(missionTimeline.timeline[index - 1].at) <= String(missionTimeline.timeline[index].at));
}

for (let index = 1; index < operatorTimeline.timeline.length; index += 1) {
  assert.ok(String(operatorTimeline.timeline[index - 1].at) <= String(operatorTimeline.timeline[index].at));
}

console.log(
  JSON.stringify(
    {
      gatewaySandboxDecisionId: gatewayEvent.sandboxDecision.id,
      mode: 'sandbox-decision-timelines',
      ok: true,
      operatorSandboxDecisionCount: operatorTimeline.summary.sandboxDecisionCount,
    },
    null,
    2,
  ),
);
