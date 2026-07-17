import {
  attachGatewayEventToSourceContext,
  normalizeGatewayEvent,
} from './gateway-event-service.mjs';
import { createId } from './id.mjs';

export function createGatewayEventCoordinator({ harness, now, store }) {
  function recordGatewayEvent({
    eventType,
    mission,
    permissionPolicy = {},
    providerId = '',
    route = '',
    session = null,
    sourceContext = {},
    workspace,
  }) {
    const gatewayEvent = store.saveGatewayEvent(
      normalizeGatewayEvent({
        at: now(),
        eventType,
        id: createId('gatewayevent'),
        mission,
        permissionPolicy,
        providerId,
        route,
        session,
        sourceContext,
        workspace,
      }),
    );

    const updatedSession = session?.id
      ? harness.updateSession(session.id, {
          sourceContext: attachGatewayEventToSourceContext(session.sourceContext || sourceContext, gatewayEvent),
        })
      : null;

    return {
      gatewayEvent,
      session: updatedSession,
    };
  }

  return { recordGatewayEvent };
}
