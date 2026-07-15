import assert from 'node:assert/strict';
import test from 'node:test';

import { createGatewayEventCoordinator } from '../src/core/gateway-event-coordinator.mjs';

test('gateway recording persists the event before updating session source context', () => {
  const effects = [];
  const session = {
    id: 'session-1',
    missionId: 'mission-1',
    sourceContext: { requestId: 'request-1' },
  };
  const coordinator = createGatewayEventCoordinator({
    harness: {
      updateSession(sessionId, patch) {
        effects.push(`session-update:${sessionId}`);
        return { ...session, ...patch };
      },
    },
    now: () => '2026-07-16T00:00:00.000Z',
    store: {
      saveGatewayEvent(event) {
        effects.push(`gateway-save:${event.eventType}`);
        return event;
      },
    },
  });

  const result = coordinator.recordGatewayEvent({
    eventType: 'mission-run-requested',
    mission: { id: 'mission-1', workspaceId: 'workspace-1' },
    session,
    workspace: { id: 'workspace-1' },
  });

  assert.deepEqual(effects, [
    'gateway-save:mission-run-requested',
    'session-update:session-1',
  ]);
  assert.equal(result.session.sourceContext.gatewayEventId, result.gatewayEvent.id);
});

test('gateway recording does not update a session when no session is supplied', () => {
  const effects = [];
  const coordinator = createGatewayEventCoordinator({
    harness: {
      updateSession() {
        effects.push('session-update');
      },
    },
    now: () => '2026-07-16T00:00:00.000Z',
    store: {
      saveGatewayEvent(event) {
        effects.push('gateway-save');
        return event;
      },
    },
  });

  const result = coordinator.recordGatewayEvent({
    eventType: 'mission-created',
    mission: { id: 'mission-1', workspaceId: 'workspace-1' },
    workspace: { id: 'workspace-1' },
  });

  assert.deepEqual(effects, ['gateway-save']);
  assert.equal(result.session, null);
});
