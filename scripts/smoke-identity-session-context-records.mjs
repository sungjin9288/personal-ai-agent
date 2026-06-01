import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  IDENTITY_SESSION_CONTEXT_POLICY_ID,
  IDENTITY_SESSION_CONTEXT_SCHEMA_VERSION,
} from '../src/core/identity-session-context-service.mjs';
import { runCli } from './cli-test-helpers.mjs';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-identity-session-context-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'identity-session-context-workspace'],
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
    'decision-memo',
    '--title',
    'Identity session context records',
    '--objective',
    'Verify gateway identity and session binding records are durable timeline evidence.',
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
assert.equal(session.summary.identitySessionContextCount, 1);
assert.equal(session.summary.identitySessionContextBindingStatusCounts.bound, 1);
assert.equal(session.summary.identitySessionContextPolicyCounts[IDENTITY_SESSION_CONTEXT_POLICY_ID], 1);

const gatewayEvent = session.gatewayEvents[0];
const identitySessionContext = gatewayEvent.identitySessionContext;
assert.ok(identitySessionContext, 'gateway event should carry identitySessionContext');
assert.equal(identitySessionContext.schemaVersion, IDENTITY_SESSION_CONTEXT_SCHEMA_VERSION);
assert.equal(identitySessionContext.id, `${gatewayEvent.id}:identity-session`);
assert.equal(identitySessionContext.policyId, IDENTITY_SESSION_CONTEXT_POLICY_ID);
assert.equal(identitySessionContext.bindingStatus, 'bound');
assert.equal(identitySessionContext.actor.actorType, 'local-operator');
assert.equal(identitySessionContext.actor.startedBy, 'local-operator');
assert.equal(identitySessionContext.actor.trustBoundary, 'local-first-runtime');
assert.equal(identitySessionContext.bindings.missionId, mission.id);
assert.equal(identitySessionContext.bindings.providerId, 'stub');
assert.equal(identitySessionContext.bindings.sessionId, run.sessionId);
assert.equal(identitySessionContext.bindings.workspaceId, workspace.id);
assert.equal(identitySessionContext.evidencePolicy.noRawSecrets, true);
assert.equal(identitySessionContext.evidencePolicy.noRawCustomerPayloads, true);
assert.equal(identitySessionContext.route.name, 'mission.run');
assert.equal(identitySessionContext.scope.memoryLookupAfterBinding, true);
assert.equal(identitySessionContext.scope.memoryScope, 'mission');
assert.equal(identitySessionContext.scope.sessionSeparationRequired, true);
assert.equal(identitySessionContext.scope.crossScopePromotionAllowed, false);
assert.equal(identitySessionContext.source.channel, 'cli');
assert.equal(identitySessionContext.source.channelAdapterId, 'cli');
assert.equal(identitySessionContext.source.externalMessagingEnabled, false);
assert.equal(identitySessionContext.source.sourceType, 'cli');
assert.equal(identitySessionContext.subject.missionBound, true);
assert.equal(identitySessionContext.subject.sessionBound, true);
assert.equal(identitySessionContext.subject.sessionRequired, true);
assert.equal(identitySessionContext.subject.workspaceBound, true);
assert.equal(gatewayEvent.identity.identitySessionContextId, identitySessionContext.id);
assert.equal(session.session.sourceContext.gatewayIdentitySessionContextId, identitySessionContext.id);

const missionShow = runCli({
  rootDir: tempRoot,
  args: ['mission', 'show', mission.id],
});

assert.equal(missionShow.summary.gatewayEventCount, 2);
assert.equal(missionShow.summary.identitySessionContextCount, 2);
assert.equal(missionShow.summary.identitySessionContextBindingStatusCounts.bound, 2);
assert.equal(missionShow.summary.identitySessionContextPolicyCounts[IDENTITY_SESSION_CONTEXT_POLICY_ID], 2);

const missionTimeline = runCli({
  rootDir: tempRoot,
  args: ['mission', 'timeline', mission.id],
});

const gatewayTimelineEvent = missionTimeline.timeline.find(
  (event) => event.kind === 'gateway-event-recorded' && event.gatewayEventId === gatewayEvent.id,
);
assert.ok(gatewayTimelineEvent);
assert.equal(gatewayTimelineEvent.identitySessionContextId, identitySessionContext.id);
assert.equal(gatewayTimelineEvent.identitySessionContextPolicyId, IDENTITY_SESSION_CONTEXT_POLICY_ID);
assert.equal(gatewayTimelineEvent.identitySessionBindingStatus, 'bound');
assert.match(gatewayTimelineEvent.detail, /identity\/session bound for mission\.run/);

const missionIdentityEvents = missionTimeline.timeline.filter(
  (event) => event.kind === 'identity-session-context-recorded',
);
assert.equal(missionIdentityEvents.length, 2);
assert.ok(
  missionIdentityEvents.some(
    (event) =>
      event.gatewayEventId === gatewayEvent.id &&
      event.identitySessionContextId === identitySessionContext.id &&
      event.identitySessionBindingStatus === 'bound' &&
      event.memoryLookupAfterBinding === true &&
      event.memoryScope === 'mission' &&
      event.sessionBound === true &&
      event.workspaceBound === true,
  ),
);

const workspaceTimeline = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'timeline', workspace.id],
});

assert.equal(workspaceTimeline.summary.eventCounts['identity-session-context-recorded'], 2);
assert.equal(workspaceTimeline.summary.identitySessionContextCount, 2);
assert.equal(workspaceTimeline.summary.identitySessionContextBindingStatusCounts.bound, 2);
assert.equal(workspaceTimeline.summary.identitySessionContextPolicyCounts[IDENTITY_SESSION_CONTEXT_POLICY_ID], 2);
assert.equal(workspaceTimeline.summary.identitySessionContextSourceTypeCounts.cli, 2);
assert.equal(
  workspaceTimeline.timeline.some(
    (event) =>
      event.kind === 'identity-session-context-recorded' &&
      event.identitySessionContextId === identitySessionContext.id &&
      event.workspaceId === workspace.id,
  ),
  true,
);

const operatorTimeline = runCli({
  rootDir: tempRoot,
  args: ['overview', 'operator-timeline'],
});

assert.equal(operatorTimeline.summary.eventCounts['identity-session-context-recorded'], 2);
assert.equal(operatorTimeline.summary.identitySessionContextCount, 2);
assert.equal(operatorTimeline.summary.identitySessionContextBindingStatusCounts.bound, 2);
assert.equal(operatorTimeline.summary.identitySessionContextPolicyCounts[IDENTITY_SESSION_CONTEXT_POLICY_ID], 2);
assert.equal(operatorTimeline.summary.identitySessionContextSourceTypeCounts.cli, 2);
assert.equal(operatorTimeline.summary.latestIdentitySessionContextEvent.identitySessionContextId, identitySessionContext.id);
assert.equal(
  operatorTimeline.timeline.some(
    (event) =>
      event.kind === 'identity-session-context-recorded' &&
      event.identitySessionContextId === identitySessionContext.id &&
      event.missionId === mission.id &&
      event.workspaceId === workspace.id,
  ),
  true,
);

console.log(
  JSON.stringify(
    {
      identitySessionContextCount: operatorTimeline.summary.identitySessionContextCount,
      identitySessionContextId: identitySessionContext.id,
      mode: 'identity-session-context-records',
      ok: true,
    },
    null,
    2,
  ),
);
