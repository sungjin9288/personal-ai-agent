import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const demo = fileURLToPath(new URL('../scripts/demo-delivery-evidence.mjs', import.meta.url));
const run = (args = [], cwd) => spawnSync(process.execPath, [demo, ...args], { encoding: 'utf8', timeout: 10_000, cwd });

test('demo explains current stale and unknown without upgrading evidence or authority', () => {
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const report = JSON.parse(result.stdout);
  assert.equal(report.schemaVersion, 'delivery-evidence-demo/v1');
  assert.equal(report.fixtureTrust, 'synthetic');
  assert.equal(report.executionAuthorized, false);
  assert.equal(report.productionReadyClaim, false);
  assert.deepEqual(report.steps.map(step => [step.id, step.evidence.status, step.impact?.status ?? null]), [
    ['reported-current', 'evidence-current', null],
    ['unrelated-declared-change', 'blocked', 'no-declared-impact'],
    ['declared-config-change', 'blocked', 'recheck-required'],
    ['unmodeled-change', 'blocked', 'unknown'],
  ]);
  for (const step of report.steps) {
    assert.equal(step.evidence.executionAuthorized, false);
    assert.equal(step.evidence.productionReadyClaim, false);
    if (step.impact) {
      for (const key of ['evidenceReuseAuthorized', 'ciSkipAuthorized', 'executionAuthorized', 'productionReadyClaim']) {
        assert.equal(step.impact[key], false);
      }
      assert.equal(step.evidence.requirements[0].checks[0].status, 'stale');
    }
  }
  assert.equal(report.evaluation.passed, true);
  assert.equal(report.evaluation.measurements.productivityImprovement, null);
});

test('bundled impact fixture works with the real bounded stdin CLI', () => {
  const fixture = readFileSync(new URL('../examples/delivery-evidence/impact.json', import.meta.url));
  const cli = fileURLToPath(new URL('../scripts/check-delivery-impact.mjs', import.meta.url));
  const result = spawnSync(process.execPath, [cli], { input: fixture, encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 2, result.stderr);
  assert.equal(JSON.parse(result.stdout).status, 'recheck-required');
  assert.equal(result.stderr, '');
});

test('demo is deterministic and does not depend on the current working directory', () => {
  const elsewhere = run([], tmpdir());
  const local = run();
  assert.equal(elsewhere.status, 0, elsewhere.stderr);
  assert.equal(local.status, 0, local.stderr);
  assert.equal(elsewhere.stdout, local.stdout);
});

test('demo Markdown agrees with JSON and labels synthetic limitations', () => {
  const result = run(['--format', 'markdown']);
  assert.equal(result.status, 0, result.stderr);
  const json = JSON.parse(run().stdout);
  for (const step of json.steps) {
    assert.ok(result.stdout.includes(`| ${step.id} | ${step.evidence.status} | ${step.impact?.status ?? 'not-assessed'} |`));
  }
  assert.match(result.stdout, /synthetic/);
  assert.match(result.stdout, /not-measured/);
  assert.match(result.stdout, /ciSkipAuthorized:false/);
});

test('demo refuses output paths arbitrary input and repeated format flags', () => {
  for (const args of [['--output', 'DO-NOT-ECHO'], ['--input', 'DO-NOT-ECHO'], ['--format', 'html'],
    ['--format', 'json', '--format', 'json']]) {
    const result = run(args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Delivery demo failed/);
    assert.doesNotMatch(result.stderr, /DO-NOT-ECHO/);
  }
});
