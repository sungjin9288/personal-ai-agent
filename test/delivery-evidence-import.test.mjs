import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { captureDeliverySource, importDeliveryEvidence, validateNodeTestSummary } from '../src/core/delivery-evidence-import.mjs';

const reporter = fileURLToPath(new URL('../scripts/delivery-node-test-reporter.mjs', import.meta.url));
const importer = fileURLToPath(new URL('../scripts/import-delivery-evidence.mjs', import.meta.url));

function git(repo, ...args) {
  const result = spawnSync('git', args, { cwd: repo, encoding: 'utf8', env: {
    PATH: process.env.PATH, HOME: repo, GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test', GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Test', GIT_COMMITTER_EMAIL: 'test@example.invalid',
  } });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function fixture(t, body = "test('approval', () => assert.equal(1, 1));") {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'delivery-import-test-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  fs.writeFileSync(path.join(repo, 'approval.test.mjs'),
    `import test from 'node:test'; import assert from 'node:assert/strict';\n${body}\n`);
  fs.writeFileSync(path.join(repo, 'package.json'), '{"type":"module"}\n');
  fs.writeFileSync(path.join(repo, 'delivery-evidence.json'), JSON.stringify({
    schemaVersion: 'delivery-evidence-manifest/v1', projectId: 'purchasing',
    testFiles: ['approval.test.mjs'], configFiles: ['package.json'],
    requirements: [{ id: 'REQ-1', criterion: 'Two approvers are required.', mappingConfirmed: true }],
  }, null, 2));
  git(repo, 'init', '--quiet');
  git(repo, 'add', 'approval.test.mjs', 'package.json', 'delivery-evidence.json');
  git(repo, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'test fixture');
  const receiptPath = path.join(root, 'receipt.json');
  return { root, repo, receiptPath };
}

function collect(f, options = []) {
  const run = spawnSync(process.execPath, ['--test', `--test-reporter=${reporter}`, ...options, 'approval.test.mjs'], {
    cwd: f.repo, encoding: 'utf8', timeout: 15_000,
    env: { PATH: process.env.PATH },
  });
  if (run.stdout) fs.writeFileSync(f.receiptPath, run.stdout);
  return run;
}

test('real Node tests flow through a bound receipt into the existing D1 gate', t => {
  const f = fixture(t);
  const before = git(f.repo, 'status', '--porcelain');
  const run = collect(f);
  assert.equal(run.status, 0, run.stderr);
  const result = importDeliveryEvidence({ repoDir: f.repo, receiptPath: f.receiptPath });
  assert.equal(result.report.status, 'evidence-current');
  assert.equal(result.report.evidenceAuthenticity, 'unverified');
  assert.equal(result.report.executionAuthorized, false);
  assert.equal(result.packet.evidence[0].sourceRevision, git(f.repo, 'rev-parse', 'HEAD'));
  assert.equal(git(f.repo, 'status', '--porcelain'), before);
  assert.ok(!run.stdout.includes(f.repo));
  const cli = spawnSync(process.execPath, [importer, '--repo', f.repo, '--receipt', f.receiptPath], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stderr);
  assert.deepEqual(JSON.parse(cli.stdout), result);
});

for (const [body, expected] of [
  ["test('approval', () => assert.equal(1, 2));", 'failed'],
  ["test.skip('approval', () => {});", 'skipped'],
  ["test.todo('approval');", 'skipped'],
]) {
  test(`real ${expected} test results never become PASS`, t => {
    const f = fixture(t, body);
    collect(f);
    const result = importDeliveryEvidence({ repoDir: f.repo, receiptPath: f.receiptPath });
    assert.equal(result.packet.evidence[0].result, expected);
    assert.equal(result.report.status, 'blocked');
  });
}

test('cancelled counts are not mislabelled as timeout, including mixed failure', () => {
  for (const failed of [0, 1]) {
    assert.throws(() => validateNodeTestSummary({
      success: false, tests: 1 + failed, passed: 0, failed, cancelled: 1, skipped: 0, todo: 0,
    }), /cancelled/);
  }
});

test('actual timeout and explicit abort produce no completed receipt', t => {
  for (const body of [
    "test('approval', {timeout: 5}, async () => { await new Promise(r => setTimeout(r, 30)); });",
    "const controller = new AbortController(); controller.abort(); test('approval', {signal: controller.signal}, () => {});",
  ]) {
    const f = fixture(t, body);
    const run = collect(f);
    assert.notEqual(run.status, 0);
    assert.equal(run.stdout, '');
  }
});

test('raw test output and assertion details do not enter the receipt', t => {
  const f = fixture(t, "test('SECRET-TEST-NAME', () => { console.log('SECRET-OUTPUT'); assert.fail('SECRET-FAILURE'); });");
  const run = collect(f);
  assert.doesNotMatch(run.stdout, /SECRET-|assert\.fail|file:\/\//);
  assert.equal(importDeliveryEvidence({ repoDir: f.repo, receiptPath: f.receiptPath }).report.status, 'blocked');
});

test('filtered runs are rejected instead of describing a narrower run as the whole suite', t => {
  const f = fixture(t);
  const run = collect(f, ['--test-name-pattern=approval']);
  assert.notEqual(run.status, 0);
  assert.throws(() => JSON.parse(run.stdout));
});

test('source identity rejects another clean clone even at the same commit', t => {
  const f = fixture(t);
  assert.equal(collect(f).status, 0);
  const other = path.join(f.root, 'other');
  git(f.root, 'clone', '--quiet', '--no-hardlinks', f.repo, other);
  assert.throws(() => importDeliveryEvidence({ repoDir: other, receiptPath: f.receiptPath }), /source-binding/);
});

test('dirty, staged and untracked source are rejected without cleaning them', t => {
  const f = fixture(t);
  fs.appendFileSync(path.join(f.repo, 'approval.test.mjs'), '// change\n');
  assert.throws(() => captureDeliverySource(f.repo), /source/);
  git(f.repo, 'add', 'approval.test.mjs');
  assert.throws(() => captureDeliverySource(f.repo), /source/);
  git(f.repo, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'test change');
  fs.writeFileSync(path.join(f.repo, 'untracked.txt'), 'preserve');
  assert.throws(() => captureDeliverySource(f.repo), /source/);
  assert.equal(fs.readFileSync(path.join(f.repo, 'untracked.txt'), 'utf8'), 'preserve');
});

test('assume-unchanged cannot hide modified definition bytes', t => {
  const f = fixture(t);
  git(f.repo, 'update-index', '--assume-unchanged', 'approval.test.mjs');
  fs.appendFileSync(path.join(f.repo, 'approval.test.mjs'), '// hidden change\n');
  assert.throws(() => captureDeliverySource(f.repo), /source/);
});

test('old receipt cannot be rebound to a new committed requirement', t => {
  const f = fixture(t);
  assert.equal(collect(f).status, 0);
  const filename = path.join(f.repo, 'delivery-evidence.json');
  const manifest = JSON.parse(fs.readFileSync(filename));
  manifest.requirements[0].criterion = 'Three approvers are required.';
  fs.writeFileSync(filename, JSON.stringify(manifest));
  git(f.repo, 'add', 'delivery-evidence.json');
  git(f.repo, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'test new requirement');
  assert.throws(() => importDeliveryEvidence({ repoDir: f.repo, receiptPath: f.receiptPath }), /source-binding/);
});

test('receipt symlinks, oversized files, truncation and extra fields are rejected', t => {
  const f = fixture(t);
  const run = collect(f);
  const alias = path.join(f.root, 'alias.json');
  fs.symlinkSync(f.receiptPath, alias);
  assert.throws(() => importDeliveryEvidence({ repoDir: f.repo, receiptPath: alias }), /receipt/);
  for (const content of [run.stdout.slice(0, -10), 'x'.repeat(1024 * 1024 + 1),
    JSON.stringify({ ...JSON.parse(run.stdout), verified: true })]) {
    fs.writeFileSync(f.receiptPath, content);
    assert.throws(() => importDeliveryEvidence({ repoDir: f.repo, receiptPath: f.receiptPath }));
  }
});

test('source symlinks cannot enter a source snapshot', t => {
  const f = fixture(t);
  fs.symlinkSync('package.json', path.join(f.repo, 'alias.json'));
  git(f.repo, 'add', 'alias.json');
  git(f.repo, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'test symlink');
  assert.throws(() => captureDeliverySource(f.repo), /source/);
});

test('changing an already-read file during source capture is detected', t => {
  const f = fixture(t);
  const read = fs.readSync;
  let changed = false;
  t.mock.method(fs, 'readSync', (...args) => {
    const count = read(...args);
    if (!changed && args[1].toString('utf8').includes('delivery-evidence-manifest/v1')) {
      changed = true;
      fs.appendFileSync(path.join(f.repo, 'approval.test.mjs'), '// changed during capture\n');
    }
    return count;
  });
  assert.throws(() => captureDeliverySource(f.repo), /source/);
  assert.equal(changed, true);
});

test('missing or invalid root counts cannot masquerade as a completed suite', () => {
  const summary = { success: true, tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0 };
  assert.equal(validateNodeTestSummary(summary), 'passed');
  for (const candidate of [undefined, {}, { ...summary, tests: 0 }, { ...summary, passed: 2 },
    { ...summary, success: false }, { ...summary, passed: -1 }, { ...summary, extra: true }]) {
    assert.throws(() => validateNodeTestSummary(candidate), /summary/);
  }
});

test('a subset of the declared files does not produce a receipt', t => {
  const f = fixture(t);
  fs.copyFileSync(path.join(f.repo, 'approval.test.mjs'), path.join(f.repo, 'second.test.mjs'));
  const filename = path.join(f.repo, 'delivery-evidence.json');
  const manifest = JSON.parse(fs.readFileSync(filename));
  manifest.testFiles.push('second.test.mjs');
  fs.writeFileSync(filename, JSON.stringify(manifest));
  git(f.repo, 'add', 'second.test.mjs', 'delivery-evidence.json');
  git(f.repo, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'test suite coverage');
  const run = collect(f);
  assert.notEqual(run.status, 0);
  assert.throws(() => JSON.parse(run.stdout));
});

test('missing config and traversal paths are rejected', t => {
  const f = fixture(t);
  const filename = path.join(f.repo, 'delivery-evidence.json');
  const manifest = JSON.parse(fs.readFileSync(filename));
  for (const configFiles of [[], ['missing.json'], ['../package.json']]) {
    fs.writeFileSync(filename, JSON.stringify({ ...manifest, configFiles }));
    git(f.repo, 'add', 'delivery-evidence.json');
    git(f.repo, '-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', 'test invalid config');
    assert.throws(() => captureDeliverySource(f.repo), /source/);
  }
});

test('source changes during import fail closed', t => {
  const f = fixture(t);
  collect(f);
  let captures = 0;
  assert.throws(() => importDeliveryEvidence({ repoDir: f.repo, receiptPath: f.receiptPath }, {
    captureSource(repo) {
      captures++;
      if (captures === 2) fs.appendFileSync(path.join(repo, 'approval.test.mjs'), '// drift\n');
      return captureDeliverySource(repo);
    },
  }), /source/);
  assert.equal(captures, 2);
});
