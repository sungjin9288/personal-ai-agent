import { test } from 'node:test';
import assert from 'node:assert/strict';

const appEntryUrl = new URL('../src/web/public/app.js', import.meta.url);

test('frontend module graph links without export binding errors', async () => {
  try {
    await import(appEntryUrl.href);
  } catch (error) {
    assert.equal(
      error instanceof SyntaxError,
      false,
      `frontend module graph failed to link: ${error.message}`,
    );
    assert.match(
      String(error),
      /is not defined/,
      `expected a browser-global evaluation error, got: ${error.message}`,
    );
  }
});
