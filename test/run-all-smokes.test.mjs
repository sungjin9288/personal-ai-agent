import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildSmokeFailureDiagnostics,
  MAX_CAPTURE_BYTES,
  sanitizeDiagnosticText,
} from '../scripts/smoke-failure-diagnostics.mjs';

const repoDir = process.cwd();
const runnerSource = path.join(repoDir, 'scripts/run-all-smokes.mjs');
const diagnosticsSource = path.join(repoDir, 'scripts/smoke-failure-diagnostics.mjs');

test('diagnostic sanitizer covers configured capture size, provider tokens, assignments, and local paths', () => {
  const pathBearingSecret = '/workspace/private-token-value';
  const values = [
    `sk-${'o'.repeat(24)}`,
    `sk-ant-${'a'.repeat(24)}`,
    `AIza${'g'.repeat(24)}`,
    `xoxb-${'s'.repeat(24)}`,
    `ghp_${'h'.repeat(24)}`,
    `github_pat_${'p'.repeat(24)}`,
    `Bearer ${'b'.repeat(32)}`,
  ];
  const input = [
    ...values,
    'DATABASE_PASSWORD=plain-password-value',
    '/Users/example/private/file',
    '/home/example/private/file',
    '/private/var/folders/zz/private/file',
    '/tmp/private/file',
    pathBearingSecret,
  ].join('\n');
  const sanitized = sanitizeDiagnosticText(input, {
    env: { AUTH_TOKEN: pathBearingSecret },
    repoDir: '/workspace/repository',
    homeDir: '/workspace',
    tempDir: '/temporary',
  });

  assert.equal(MAX_CAPTURE_BYTES, 1024 * 1024);
  for (const value of values) {
    assert.doesNotMatch(sanitized, new RegExp(escapeRegExp(value)));
  }
  assert.doesNotMatch(sanitized, /plain-password-value|\/Users\/|\/home\/|\/var\/folders\/|\/tmp\//);
  assert.doesNotMatch(sanitized, /private-token-value/);
  assert.match(sanitized, /DATABASE_PASSWORD=<redacted>/);
  assert.match(sanitized, /<local-path>/);
});

test('all-pass sweep preserves order, hides child output, and keeps the summary schema', () => {
  const fixture = createRunnerFixture({
    'smoke:first': "process.stdout.write('hidden first\\n'); append('first')",
    'smoke:second': "process.stderr.write('hidden second\\n'); append('second')",
  });
  try {
    const result = runFixture(fixture.rootDir);
    const summary = parseSummary(result.stdout);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(readInvocations(fixture.rootDir), ['first', 'second']);
    assert.deepEqual(readResultLines(result.stdout), [
      'PASS smoke:first',
      'PASS smoke:second',
    ]);
    assert.doesNotMatch(result.stdout, /hidden first|hidden second/);
    assert.equal(result.stderr, '');
    assert.deepEqual(Object.keys(summary), [
      'mode',
      'total',
      'passed',
      'failed',
      'failedScripts',
      'excludedSmokeScripts',
      'durationSeconds',
    ]);
    assert.equal(summary.mode, 'smoke-sweep:all');
    assert.equal(summary.total, 2);
    assert.equal(summary.passed, 2);
    assert.equal(summary.failed, 0);
    assert.deepEqual(summary.failedScripts, []);
  } finally {
    fixture.cleanup();
  }
});

test('failed smoke reports bounded sanitized streams and later smokes still run once', () => {
  const secret = 'owner-secret-value-123456789';
  const githubToken = `ghp_${'a'.repeat(24)}`;
  const bearerToken = `Bearer ${'b'.repeat(32)}`;
  const fixture = createRunnerFixture({
    'smoke:fail': [
      "append('fail')",
      "process.stderr.write('\\u001b[31mstderr-start\\u001b[0m\\u0000 ' + process.env.OWNER_AUTH_TOKEN + ' ' + process.cwd() + ' stderr-end\\n')",
      `process.stdout.write('stdout-start API_KEY=${githubToken} ${bearerToken} /Users/example/private/file stdout-end\\n')`,
      'process.exitCode = 7',
    ].join('; '),
    'smoke:after': "append('after')",
  });
  try {
    const result = runFixture(fixture.rootDir, {
      OWNER_AUTH_TOKEN: secret,
    });
    const diagnostics = parseDiagnostics(result.stderr);
    const summary = parseSummary(result.stdout);
    const serialized = JSON.stringify(diagnostics);

    assert.equal(result.status, 1);
    assert.deepEqual(readInvocations(fixture.rootDir), ['fail', 'after']);
    assert.deepEqual(readResultLines(result.stdout), [
      'FAIL smoke:fail',
      'PASS smoke:after',
    ]);
    assert.equal(diagnostics.status, 7);
    assert.equal(diagnostics.signal, null);
    assert.equal(diagnostics.error, null);
    assert.deepEqual(Object.keys(diagnostics), ['status', 'signal', 'error', 'stderr', 'stdout']);
    assert.ok(diagnostics.stderr.originalBytes > 0);
    assert.ok(diagnostics.stdout.originalBytes > 0);
    assert.match(diagnostics.stderr.head, /stderr-start/);
    assert.match(diagnostics.stdout.head, /stdout-start/);
    assert.doesNotMatch(serialized, new RegExp(escapeRegExp(secret)));
    assert.doesNotMatch(serialized, new RegExp(escapeRegExp(githubToken)));
    assert.doesNotMatch(serialized, new RegExp(escapeRegExp(bearerToken)));
    assert.doesNotMatch(serialized, /\u001b|\u0000|\/Users\/example|smoke-runner-/);
    assert.match(serialized, /<redacted>/);
    assert.match(serialized, /<local-path>/);
    assert.equal(summary.failed, 1);
    assert.deepEqual(summary.failedScripts, ['smoke:fail']);
  } finally {
    fixture.cleanup();
  }
});

test('large failure output retains a four-KiB head and tail preview for each stream', () => {
  const fixture = createRunnerFixture({
    'smoke:large': [
      "process.stderr.write('stderr-head-' + 'e'.repeat(9000) + '-stderr-tail')",
      "process.stdout.write('stdout-head-' + 'o'.repeat(9000) + '-stdout-tail')",
      'process.exitCode = 2',
    ].join('; '),
  });
  try {
    const result = runFixture(fixture.rootDir);
    const diagnostics = parseDiagnostics(result.stderr);

    assert.equal(result.status, 1);
    for (const [streamName, expectedHead, expectedTail] of [
      ['stderr', 'stderr-head-', '-stderr-tail'],
      ['stdout', 'stdout-head-', '-stdout-tail'],
    ]) {
      const stream = diagnostics[streamName];
      assert.equal(stream.truncated, true);
      assert.ok(stream.originalBytes > 9000);
      assert.match(stream.head, new RegExp(`^${expectedHead}`));
      assert.match(stream.tail, new RegExp(`${expectedTail}$`));
      assert.ok(Buffer.byteLength(stream.head) + Buffer.byteLength(stream.tail) <= 4096);
    }
  } finally {
    fixture.cleanup();
  }
});

test('spawn failures are safe, reported, and do not stop the ordered sweep', () => {
  const fixture = createRunnerFixture({
    'smoke:first': "append('unreachable-first')",
    'smoke:second': "append('unreachable-second')",
  });
  try {
    const result = runFixture(fixture.rootDir, { PATH: '' });
    const diagnostics = result.stderr
      .trim()
      .split('\n')
      .map(parseDiagnosticsLine);
    const summary = parseSummary(result.stdout);

    assert.equal(result.status, 1);
    assert.deepEqual(readResultLines(result.stdout), [
      'FAIL smoke:first',
      'FAIL smoke:second',
    ]);
    assert.equal(diagnostics.length, 2);
    assert.deepEqual(diagnostics.map((entry) => entry.status), [null, null]);
    assert.deepEqual(diagnostics.map((entry) => entry.error.code), ['ENOENT', 'ENOENT']);
    for (const entry of diagnostics) {
      assert.deepEqual(Object.keys(entry.error), ['code']);
    }

    const unsafeError = Object.assign(
      new Error(`error-message-sentinel ${fixture.rootDir}`),
      { code: 'ENOENT' },
    );
    const safeError = buildSmokeFailureDiagnostics({
      status: null,
      signal: null,
      error: unsafeError,
      stderr: '',
      stdout: '',
    }, { repoDir: fixture.rootDir });
    const serializedSafeError = JSON.stringify(safeError);
    assert.deepEqual(Object.keys(safeError.error), ['code']);
    assert.doesNotMatch(serializedSafeError, /error-message-sentinel|smoke-runner-/);
    assert.deepEqual(readInvocations(fixture.rootDir), []);
    assert.equal(summary.total, 2);
    assert.equal(summary.passed, 0);
    assert.equal(summary.failed, 2);
    assert.deepEqual(summary.failedScripts, ['smoke:first', 'smoke:second']);
  } finally {
    fixture.cleanup();
  }
});

function createRunnerFixture(smokeBodies) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-runner-'));
  fs.mkdirSync(path.join(rootDir, 'scripts'));
  fs.copyFileSync(runnerSource, path.join(rootDir, 'scripts/run-all-smokes.mjs'));
  fs.copyFileSync(diagnosticsSource, path.join(rootDir, 'scripts/smoke-failure-diagnostics.mjs'));

  const scripts = {};
  let index = 0;
  for (const [name, body] of Object.entries(smokeBodies)) {
    const filename = `fixture-${index}.mjs`;
    scripts[name] = `node ${filename}`;
    fs.writeFileSync(
      path.join(rootDir, filename),
      [
        "import fs from 'node:fs'",
        "const append = (value) => fs.appendFileSync('invocations.log', `${value}\\n`)",
        body,
        '',
      ].join('\n'),
      'utf8',
    );
    index += 1;
  }
  scripts['smoke:all'] = 'node scripts/run-all-smokes.mjs';
  scripts['smoke:docs-gates'] = 'node scripts/run-all-smokes.mjs --group docs-gates';

  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    `${JSON.stringify({ private: true, type: 'module', scripts }, null, 2)}\n`,
    'utf8',
  );

  return {
    rootDir,
    cleanup: () => fs.rmSync(rootDir, { recursive: true, force: true }),
  };
}

function runFixture(rootDir, env = {}) {
  return spawnSync(process.execPath, ['scripts/run-all-smokes.mjs'], {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    maxBuffer: 2 * 1024 * 1024,
  });
}

function readInvocations(rootDir) {
  const filename = path.join(rootDir, 'invocations.log');
  return fs.existsSync(filename)
    ? fs.readFileSync(filename, 'utf8').trim().split('\n').filter(Boolean)
    : [];
}

function readResultLines(stdout) {
  return stdout.split('\n').filter((line) => /^(?:PASS|FAIL) smoke:/.test(line));
}

function parseSummary(stdout) {
  const start = stdout.indexOf('{\n');
  assert.notEqual(start, -1, `summary not found in stdout:\n${stdout}`);
  return JSON.parse(stdout.slice(start));
}

function parseDiagnostics(stderr) {
  const lines = stderr.trim().split('\n').filter(Boolean);
  assert.equal(lines.length, 1, stderr);
  return parseDiagnosticsLine(lines[0]);
}

function parseDiagnosticsLine(line) {
  const match = line.match(/^FAIL_DIAGNOSTICS smoke:[^ ]+ (\{.*\})$/);
  assert.ok(match, `diagnostics not found: ${line}`);
  return JSON.parse(match[1]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
