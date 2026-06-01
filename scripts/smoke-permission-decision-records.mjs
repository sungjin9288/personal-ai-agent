import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-permission-decisions-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

function readState() {
  return JSON.parse(fs.readFileSync(path.join(tempRoot, 'var', 'state.json'), 'utf8'));
}

function writeState(state) {
  fs.writeFileSync(path.join(tempRoot, 'var', 'state.json'), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function clearMissionConstraints(missionId) {
  const state = readState();
  state.missions = state.missions.map((mission) =>
    mission.id === missionId
      ? {
          ...mission,
          constraints: [],
        }
      : mission,
  );
  writeState(state);
}

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'permission-decision-workspace'],
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
    'Gateway permission decision',
    '--objective',
    'Verify gateway permission decisions are durable route evidence.',
  ],
});

const run = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', mission.id, '--provider', 'stub'],
});

assert.equal(run.status, 'completed');

const session = runCli({
  rootDir: tempRoot,
  args: ['session', 'show', mission.id, '--session', run.sessionId],
});

assert.equal(session.gatewayEvents.length, 1);
const gatewayEvent = session.gatewayEvents[0];
assert.equal(gatewayEvent.permissionDecision.schemaVersion, 'personal-ai-agent-permission-decision/v1');
assert.equal(gatewayEvent.permissionDecision.id, `${gatewayEvent.id}:permission`);
assert.equal(gatewayEvent.permissionDecision.policyId, 'local-runtime-gateway-permission/v1');
assert.equal(gatewayEvent.permissionDecision.decision, 'allow');
assert.equal(gatewayEvent.permissionDecision.approvalRequired, false);
assert.equal(gatewayEvent.permissionDecision.action.type, 'mission-run');
assert.equal(gatewayEvent.permissionDecision.action.route, 'mission.run');
assert.equal(gatewayEvent.permissionDecision.resource.type, 'mission');
assert.equal(gatewayEvent.permissionDecision.bindings.providerId, 'stub');
assert.equal(gatewayEvent.permissionDecision.bindings.missionId, mission.id);
assert.equal(gatewayEvent.permissionDecision.evidencePolicy.noRawSecrets, true);
assert.equal(gatewayEvent.permissionPolicy.permissionDecisionId, gatewayEvent.permissionDecision.id);
assert.equal(session.session.sourceContext.gatewayPermissionDecisionId, gatewayEvent.permissionDecision.id);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

const gatewayTimelineEvent = missionTimeline.timeline.find(
  (event) => event.kind === 'gateway-event-recorded' && event.gatewayEventId === gatewayEvent.id,
);
assert.ok(gatewayTimelineEvent);
assert.equal(gatewayTimelineEvent.permissionDecisionId, gatewayEvent.permissionDecision.id);
assert.equal(gatewayTimelineEvent.permissionDecisionResult, 'allow');
assert.equal(gatewayTimelineEvent.permissionPolicyId, 'local-runtime-gateway-permission/v1');
assert.equal(gatewayTimelineEvent.permissionApprovalRequired, false);
assert.match(gatewayTimelineEvent.detail, /permission allow for mission-run/);

const failureMission = runCli({
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
    'Provider remediation permission decision',
    '--objective',
    'Verify provider attention remediation carries a permission decision.',
    '--constraints',
    'force-rubric-fail',
  ],
});

const failedRun = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', failureMission.id, '--provider', 'stub'],
});

assert.equal(failedRun.status, 'failed');

const pendingProviderAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--mission', failureMission.id, '--provider', 'stub'],
});

assert.equal(pendingProviderAttention.items.length, 1);
assert.equal(pendingProviderAttention.items[0].permissionDecision.decision, 'allow');
assert.equal(pendingProviderAttention.items[0].permissionDecision.policyId, 'provider-attention-remediation-permission/v1');
assert.equal(pendingProviderAttention.items[0].permissionDecision.action.type, 'provider-attention-remediation');
assert.equal(pendingProviderAttention.items[0].permissionDecision.resource.type, 'provider');
assert.equal(pendingProviderAttention.items[0].permissionDecision.resource.id, 'stub');
assert.equal(pendingProviderAttention.items[0].permissionDecision.metadata.remediationKind, 'mission-rerun');

clearMissionConstraints(failureMission.id);

const remediation = runCli({
  rootDir: tempRoot,
  args: ['action', 'remediate-provider-attention', pendingProviderAttention.items[0].actionId],
});

assert.equal(remediation.remediationKind, 'mission-rerun');
assert.equal(remediation.result.missionStatus, 'completed');
assert.equal(remediation.permissionDecision.id, `${pendingProviderAttention.items[0].actionId}:permission`);
assert.equal(remediation.permissionDecision.decision, 'allow');
assert.equal(remediation.permissionDecision.policyId, 'provider-attention-remediation-permission/v1');
assert.equal(remediation.permissionDecision.bindings.providerId, 'stub');
assert.equal(remediation.permissionDecision.metadata.remediationKind, 'mission-rerun');
assert.deepEqual(remediation.permissionDecision.capabilities.deniedCapabilities, []);

const fallbackMission = runCli({
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
    'Provider fallback remediation permission decision',
    '--objective',
    'Verify provider fallback remediation carries the selected policy and provider.',
  ],
});

const failedAnthropicRun = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: ['mission', 'run', fallbackMission.id, '--provider', 'anthropic'],
});

assert.equal(failedAnthropicRun.status, 'failed');

const fallbackAttention = runCli({
  rootDir: tempRoot,
  args: ['action', 'provider-attention', '--mission', fallbackMission.id, '--provider', 'anthropic'],
});

assert.equal(fallbackAttention.items.length, 1);
assert.equal(fallbackAttention.items[0].permissionDecision.metadata.fallbackProviderId, 'stub');
assert.equal(fallbackAttention.items[0].permissionDecision.metadata.fallbackPolicy, 'provider-failure-only');
assert.equal(fallbackAttention.items[0].permissionDecision.metadata.remediationKind, 'mission-fallback-rerun');
assert.ok(fallbackAttention.items[0].permissionDecision.capabilities.allowedCapabilities.includes('provider-fallback-rerun'));

const fallbackRemediation = runCli({
  rootDir: tempRoot,
  env: {
    ANTHROPIC_API_KEY: '',
    ANTHROPIC_BASE_URL: '',
    ANTHROPIC_MODEL: '',
  },
  args: [
    'action',
    'remediate-provider-attention',
    fallbackAttention.items[0].actionId,
    '--fallback-provider',
    'stub',
    '--fallback-policy',
    'provider-failure-only',
  ],
});

assert.equal(fallbackRemediation.remediationKind, 'mission-fallback-rerun');
assert.equal(fallbackRemediation.result.missionStatus, 'completed');
assert.equal(fallbackRemediation.permissionDecision.decision, 'allow');
assert.equal(fallbackRemediation.permissionDecision.metadata.fallbackProviderId, 'stub');
assert.equal(fallbackRemediation.permissionDecision.metadata.fallbackPolicy, 'provider-failure-only');
assert.ok(fallbackRemediation.permissionDecision.capabilities.allowedCapabilities.includes('provider-fallback-rerun'));

console.log(
  JSON.stringify(
    {
      fallbackPermissionDecisionId: fallbackRemediation.permissionDecision.id,
      gatewayPermissionDecisionId: gatewayEvent.permissionDecision.id,
      mode: 'permission-decision-records',
      ok: true,
      remediationPermissionDecisionId: remediation.permissionDecision.id,
    },
    null,
    2,
  ),
);
