import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createRouteRegistry } from '../src/web/route-registry.mjs';

test('exact route returns its handler with no path parameters', () => {
  const registry = createRouteRegistry();
  const handler = () => 'meta';
  registry.registerExactRoute('GET', '/api/meta', handler);

  assert.deepEqual(registry.matchRoute('GET', '/api/meta'), {
    handler,
    params: {},
  });
});

test('param route extracts raw path segments for the handler to decode', () => {
  const registry = createRouteRegistry();
  const handler = () => 'mission';
  registry.registerParamRoute('GET', '/api/missions/:missionId/artifacts/:artifactId', handler);

  assert.deepEqual(
    registry.matchRoute('GET', '/api/missions/mission%2Fone/artifacts/artifact-1'),
    {
      handler,
      params: {
        artifactId: 'artifact-1',
        missionId: 'mission%2Fone',
      },
    },
  );
});

test('exact route takes priority over an overlapping param route', () => {
  const registry = createRouteRegistry();
  const paramHandler = () => 'param';
  const exactHandler = () => 'exact';
  registry.registerParamRoute('GET', '/api/providers/:providerId', paramHandler);
  registry.registerExactRoute('GET', '/api/providers/events', exactHandler);

  assert.deepEqual(registry.matchRoute('GET', '/api/providers/events'), {
    handler: exactHandler,
    params: {},
  });
});

test('ambiguous param routes preserve registration order', () => {
  const registry = createRouteRegistry();
  const firstHandler = () => 'first';
  registry.registerParamRoute('GET', '/api/items/:itemId', firstHandler);
  registry.registerParamRoute('GET', '/api/items/:itemSlug', () => 'second');

  assert.deepEqual(registry.matchRoute('GET', '/api/items/item-1'), {
    handler: firstHandler,
    params: { itemId: 'item-1' },
  });
});

test('static param patterns and exact route replacement preserve existing registration behavior', () => {
  const registry = createRouteRegistry();
  const staticHandler = () => 'expire';
  const replacementHandler = () => 'replacement';
  registry.registerParamRoute('POST', '/api/actions/learning-promotions/expire', staticHandler);
  registry.registerExactRoute('GET', '/api/health', () => 'initial');
  registry.registerExactRoute('GET', '/api/health', replacementHandler);

  assert.deepEqual(
    registry.matchRoute('POST', '/api/actions/learning-promotions/expire'),
    {
      handler: staticHandler,
      params: {},
    },
  );
  assert.deepEqual(registry.matchRoute('GET', '/api/health'), {
    handler: replacementHandler,
    params: {},
  });
});

test('method, segment count, and static segment mismatches return no route', () => {
  const registry = createRouteRegistry();
  registry.registerExactRoute('GET', '/api/meta', () => 'meta');
  registry.registerParamRoute('GET', '/api/missions/:missionId', () => 'mission');

  assert.equal(registry.matchRoute('POST', '/api/meta'), null);
  assert.equal(registry.matchRoute('GET', '/api/missions'), null);
  assert.equal(registry.matchRoute('GET', '/api/workspaces/workspace-1'), null);
});
