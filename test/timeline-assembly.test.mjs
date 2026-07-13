import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildMissionGatewayTimelineEvents,
  buildMissionMaintenanceTimelineEvents,
  buildOperatorGatewayTimelineEvents,
  buildOperatorMaintenanceTimelineEvents,
  sortTimelineEvents,
} from '../src/core/timeline-assembly.mjs';

const mission = { id: 'mission-1', title: 'Mission One', workspaceId: 'workspace-1' };
const workspace = { id: 'workspace-1', name: 'Workspace One' };

function buildGatewayEvent(overrides = {}) {
  return {
    at: '2024-01-02T00:00:00.000Z',
    bindings: {
      missionId: mission.id,
      providerId: 'provider-1',
      sessionId: 'session-1',
      workspaceId: workspace.id,
    },
    eventType: 'mission-run',
    id: 'gateway-event-1',
    identity: { identitySessionContextId: 'identity-context-1' },
    identitySessionContext: {
      actor: { actorType: 'human', trustBoundary: 'internal' },
      bindingStatus: 'bound',
      id: 'identity-context-1',
      policyId: 'identity-policy/v1',
      route: { name: 'mission.run' },
      scope: { memoryLookupAfterBinding: true, memoryScope: 'mission' },
      source: { sourceType: 'cli' },
      status: 'recorded',
      subject: { missionBound: true, sessionBound: true, workspaceBound: true },
    },
    permissionDecision: {
      approvalRequired: true,
      decision: 'approved',
      id: 'permission-decision-1',
      policyId: 'permission-policy/v1',
    },
    providerRoute: { policyId: 'provider-fallback-policy/v1', providerId: 'provider-1' },
    route: { name: 'mission.run' },
    sandboxDecision: {
      capabilities: { deniedCapabilities: ['network'] },
      id: 'sandbox-decision-1',
      mode: 'local-runtime',
      policyId: 'sandbox-policy/v1',
      reason: 'Local execution only.',
      status: 'recorded',
    },
    source: { sourceType: 'cli' },
    status: 'recorded',
    ...overrides,
  };
}

test('sortTimelineEvents returns chronological events without mutating the source', () => {
  const events = [
    { at: '2024-01-03T00:00:00.000Z', kind: 'third' },
    { at: '2024-01-01T00:00:00.000Z', kind: 'first' },
    { at: '2024-01-02T00:00:00.000Z', kind: 'second' },
  ];

  assert.deepEqual(sortTimelineEvents(events).map((event) => event.kind), ['first', 'second', 'third']);
  assert.equal(events[0].kind, 'third');
});

test('mission gateway assembly preserves permission, identity, and sandbox evidence', () => {
  const events = buildMissionGatewayTimelineEvents({ gatewayEvents: [buildGatewayEvent()], mission });

  assert.deepEqual(events.map((event) => event.kind), [
    'gateway-event-recorded',
    'identity-session-context-recorded',
    'sandbox-decision-recorded',
  ]);
  assert.equal(events[0].permissionDecisionId, 'permission-decision-1');
  assert.equal(events[0].permissionDecisionResult, 'approved');
  assert.equal(events[1].identitySessionContextId, 'identity-context-1');
  assert.equal(events[2].sandboxDecisionId, 'sandbox-decision-1');
  assert.deepEqual(events[2].sandboxDeniedCapabilities, ['network']);
  assert.equal(events.every((event) => event.missionId === mission.id), true);
  assert.equal(events.every((event) => event.workspaceId === workspace.id), true);
});

test('operator gateway assembly applies scope before returning audit events', () => {
  const missionById = new Map([[mission.id, mission]]);
  const workspaceById = new Map([[workspace.id, workspace]]);
  const event = buildGatewayEvent();

  const included = buildOperatorGatewayTimelineEvents({
    events: [event],
    filter: { workspaceId: workspace.id },
    missionById,
    workspaceById,
  });
  const excluded = buildOperatorGatewayTimelineEvents({
    events: [event],
    filter: { workspaceId: 'workspace-2' },
    missionById,
    workspaceById,
  });

  assert.deepEqual(included.map((entry) => entry.kind), [
    'identity-session-context-recorded',
    'sandbox-decision-recorded',
  ]);
  assert.equal(included.every((entry) => entry.workspaceName === workspace.name), true);
  assert.deepEqual(excluded, []);
});

test('mission maintenance assembly distinguishes direct and workspace impact records', () => {
  const directRun = {
    acknowledgedMaintenanceRequiredCount: 1,
    beforePressureSummary: { currentDueCandidateCountTotal: 2 },
    createdAt: '2024-01-01T00:00:00.000Z',
    id: 'maintenance-direct',
    missionId: mission.id,
    remainingMaintenanceRequiredCount: 0,
    resolvedMaintenanceRequiredCount: 1,
    totalRemindedCount: 2,
  };
  const workspaceRun = {
    affectedMissionSummaries: [{ missionId: mission.id, totalRemindedCount: 1 }],
    createdAt: '2024-01-02T00:00:00.000Z',
    id: 'maintenance-workspace',
    missionId: null,
    note: 'Workspace sweep.',
    totalRemindedCount: 1,
  };

  const events = buildMissionMaintenanceTimelineEvents({ mission, runs: [directRun, workspaceRun] });

  assert.deepEqual(events.map((event) => event.kind), [
    'maintenance-required-acknowledged',
    'maintenance-required-resolved',
    'maintenance-run',
    'maintenance-run',
  ]);
  assert.match(events.at(-1).detail, /Workspace maintenance sweep affected this mission/);
  assert.equal(events.every((event) => event.missionId === mission.id), true);
});

test('operator maintenance assembly adds mission and workspace context', () => {
  const run = {
    createdAt: '2024-01-01T00:00:00.000Z',
    id: 'maintenance-1',
    missionId: mission.id,
    totalRemindedCount: 0,
    workspaceId: workspace.id,
  };
  const events = buildOperatorMaintenanceTimelineEvents({
    filter: { workspaceId: workspace.id },
    missionById: new Map([[mission.id, mission]]),
    runs: [run],
    workspaceById: new Map([[workspace.id, workspace]]),
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].kind, 'maintenance-run');
  assert.equal(events[0].missionTitle, mission.title);
  assert.equal(events[0].workspaceName, workspace.name);
  assert.equal(events[0].status, 'no-op');
});
