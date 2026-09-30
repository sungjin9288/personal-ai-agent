import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const scripts = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).scripts;

test('canonical test command bounds file concurrency without narrowing the full suite', () => {
  assert.equal(scripts.test, 'node --test --test-concurrency=4 test/*.test.mjs');
});

test('delivery evidence regression command is connected to the existing Node 24 CI job', () => {
  assert.equal(scripts['test:delivery-evidence'], 'node --test --test-concurrency=4 test/delivery-evidence-*.test.mjs');
  const workflow = readFileSync(new URL('../.github/workflows/provider-smoke.yml', import.meta.url), 'utf8');
  assert.match(workflow, /node-version: '24'/);
  assert.ok(/\n      - name: Run delivery evidence regression gate\n        run: npm run test:delivery-evidence\n/.test(workflow),
    'existing CI job must run the delivery evidence gate');
});

test('selective Portfolio package includes the delivery evidence case study and development record', () => {
  const { files } = JSON.parse(readFileSync(new URL('../config/portfolio-package-files.json', import.meta.url), 'utf8'));
  for (const file of ['docs/delivery-evidence-case-study.md', 'docs/delivery-evidence-development-plan.md']) {
    assert.ok(files.includes(file), `Portfolio package must include ${file}`);
  }
  assert.deepEqual(files, [...new Set(files)].sort());
});
