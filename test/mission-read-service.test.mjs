import assert from 'node:assert/strict';
import test from 'node:test';

import { createMissionReadService } from '../src/core/mission-read-service.mjs';

test('mission read service exposes the registered channel adapter seam', () => {
  const service = createMissionReadService({});
  const registry = service.listChannelAdapters();

  assert.ok(Array.isArray(registry.adapters));
  assert.ok(registry.adapters.length > 0);
  assert.equal(service.getChannelAdapter(registry.adapters[0].id).id, registry.adapters[0].id);
});

test('mission read service keeps the channel adapter not-found error', () => {
  const service = createMissionReadService({});

  assert.throws(
    () => service.getChannelAdapter('missing-adapter'),
    /Channel adapter not found: missing-adapter/,
  );
});
