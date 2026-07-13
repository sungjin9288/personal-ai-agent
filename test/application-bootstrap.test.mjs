import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bootstrapApplication } from '../src/web/public/lib/application-bootstrap.js';

function createBootstrap(overrides = () => ({})) {
  const calls = [];
  return {
    calls,
    options: {
      initializeTheme: () => calls.push('theme'),
      wireEvents: () => calls.push('events'),
      renderStaticSurfaces: () => calls.push('render'),
      loadData: async () => calls.push('load'),
      restoreState: async () => calls.push('restore'),
      onError: (error) => calls.push(`error:${error.message}`),
      ...overrides(calls),
    },
  };
}

test('application bootstrap preserves the startup sequence', async () => {
  const { calls, options } = createBootstrap(() => ({}));

  await bootstrapApplication(options);

  assert.deepEqual(calls, ['theme', 'events', 'render', 'load', 'restore']);
});

test('application bootstrap reports load failures without restoring partial state', async () => {
  const { calls, options } = createBootstrap((recordedCalls) => ({
    loadData: async () => {
      recordedCalls.push('load');
      throw new Error('load failed');
    },
  }));

  await bootstrapApplication(options);

  assert.deepEqual(calls, ['theme', 'events', 'render', 'load', 'error:load failed']);
});

test('application bootstrap reports state restoration failures after data is loaded', async () => {
  const { calls, options } = createBootstrap((recordedCalls) => ({
    restoreState: async () => {
      recordedCalls.push('restore');
      throw new Error('restore failed');
    },
  }));

  await bootstrapApplication(options);

  assert.deepEqual(calls, ['theme', 'events', 'render', 'load', 'restore', 'error:restore failed']);
});
