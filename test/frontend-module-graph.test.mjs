import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const appEntryUrl = new URL('../src/web/public/app.js', import.meta.url);
const appEntryPath = fileURLToPath(appEntryUrl);

test('frontend module graph links without export binding errors', async () => {
  try {
    await import(appEntryUrl.href);
  } catch (error) {
    assert.equal(
      error instanceof SyntaxError,
      false,
      `frontend module graph failed to link: ${error.message}`,
    );
    assert.doesNotMatch(
      String(error),
      /before initialization/,
      `temporal-dead-zone circular-import bug reached at module evaluation: ${error.message}`,
    );
    assert.match(
      String(error),
      /is not defined/,
      `expected a browser-global evaluation error, got: ${error.message}`,
    );
  }
});

// The bare import above stops at the first missing browser global (usually
// `document`), which can mask temporal-dead-zone bugs that only trigger later
// in evaluation order — exactly what broke the console in real browsers when a
// lib module read a circular app.js export at module top level. This stage
// stubs just enough browser surface in an isolated child process so module
// evaluation runs to completion, surfacing any TDZ error.
test('frontend module graph evaluates fully under browser-global stubs (TDZ guard)', () => {
  const stubPreamble = `
    process.on('unhandledRejection', () => {});
    const element = () => ({
      addEventListener() {}, removeEventListener() {}, setAttribute() {}, getAttribute() { return null; },
      appendChild() {}, querySelector: () => null, querySelectorAll: () => [],
      dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
      value: '', textContent: '', innerHTML: '', focus() {}, click() {},
    });
    const defineGlobal = (name, value) => {
      try {
        Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
      } catch {
        // Node already provides a non-configurable version; leave it in place.
      }
    };
    defineGlobal('window', globalThis);
    defineGlobal('document', {
      getElementById: () => element(), querySelector: () => element(), querySelectorAll: () => [],
      addEventListener() {}, createElement: () => element(),
      body: element(), documentElement: { dataset: {}, style: {} },
    });
    defineGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
    defineGlobal('navigator', { clipboard: {} });
    defineGlobal('location', { href: 'http://127.0.0.1/', origin: 'http://127.0.0.1', pathname: '/', search: '', hash: '' });
    defineGlobal('history', { pushState() {}, replaceState() {} });
    defineGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    defineGlobal('alert', () => {});
    defineGlobal('fetch', () => Promise.reject(new Error('offline stub')));
  `;
  const script = `${stubPreamble}
    import(${JSON.stringify(appEntryUrl.href)})
      .then(() => { console.log('MODULE_EVAL_OK'); process.exit(0); })
      .catch((error) => { console.log('MODULE_EVAL_ERR ' + error.message); process.exit(0); });
  `;
  const outcome = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  const output = `${outcome.stdout}\n${outcome.stderr}`;
  assert.doesNotMatch(
    output,
    /before initialization/,
    `temporal-dead-zone circular-import bug in the frontend module graph:\n${output}`,
  );
  assert.match(
    output,
    /MODULE_EVAL_OK|MODULE_EVAL_ERR/,
    `stubbed evaluation produced no verdict (crash?):\n${output}\nentry: ${appEntryPath}`,
  );
});
