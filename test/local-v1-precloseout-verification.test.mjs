import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import {
  LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS,
  LOCAL_V1_VERIFICATION_SCHEMA_VERSION,
  sha256Text,
} from '../src/core/local-v1-completion-closeout.mjs';
import {
  assertLocalV1BuilderState,
  runLocalV1PrecloseoutVerification,
} from '../scripts/local-v1-precloseout-verification.mjs';

const implementationCommit = 'a'.repeat(40);

test('Local v1 pre-closeout receipt runs the exact canonical commands in order', () => {
  const calls = [];
  const packageJson = packageJsonFixture();
  let tick = 0;
  const report = runLocalV1PrecloseoutVerification({
    implementationCommit,
    now: () => tick++,
    packageJson,
    runCommand(command, args, options) {
      calls.push({ args, command, options });
      return { error: '', status: 0, stderr: `${command} stderr`, stdout: `${command} stdout`, timedOut: false };
    },
  });

  assert.deepEqual(
    calls.map(({ command, args }) => [command, ...args]),
    LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS.map(({ command }) => command),
  );
  assert.equal(report.schemaVersion, LOCAL_V1_VERIFICATION_SCHEMA_VERSION);
  assert.equal(report.implementationCommit, implementationCommit);
  assert.equal(report.packageJsonSha256, sha256Text(JSON.stringify(packageJson)));
  assert.deepEqual(report.checks.map((check) => check.id), LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS.map(({ id }) => id));
  for (const [index, check] of report.checks.entries()) {
    const definition = LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS[index];
    assert.equal(check.command, definition.command.join(' '));
    assert.equal(check.commandSha256, sha256Text(check.command));
    assert.equal(check.packageScriptSha256, definition.packageScriptCommand === null
      ? null
      : sha256Text(definition.packageScriptCommand));
    assert.equal(check.exitCode, 0);
    assert.equal(check.timedOut, false);
    assert.match(check.stdoutSha256, /^[a-f0-9]{64}$/);
    assert.match(check.stderrSha256, /^[a-f0-9]{64}$/);
  }
});

test('Local v1 pre-closeout verification fails closed on script drift and command failures', () => {
  const packageJson = packageJsonFixture();
  packageJson.scripts.test = 'node --test another-suite';
  assert.throws(
    () => runLocalV1PrecloseoutVerification({ implementationCommit, packageJson }),
    /package script drifted: test/,
  );

  assert.throws(
    () => runLocalV1PrecloseoutVerification({
      implementationCommit,
      now: sequenceClock(10, 37),
      packageJson: packageJsonFixture(),
      runCommand: () => ({
        error: 'process helper failed',
        signal: 'SIGTERM',
        status: 1,
        stderr: 'stderr sentinel',
        stdout: 'stdout sentinel',
        timedOut: true,
      }),
    }),
    (error) => {
      assert.match(error.message, /pre-closeout verification failed: unit-tests/);
      assert.match(error.message, /command=npm test/);
      assert.match(error.message, /error=process helper failed/);
      assert.match(error.message, /signal=SIGTERM/);
      assert.match(error.message, /status=1/);
      assert.match(error.message, /timedOut=true/);
      assert.match(error.message, /durationMs=27/);
      assert.match(error.message, /timeoutMs=600000/);
      assert.match(error.message, /stdoutBytes=15/);
      assert.match(error.message, /stderrBytes=15/);
      assert.match(error.message, /stdoutTail:\nstdout sentinel/);
      assert.match(error.message, /stderrTail:\nstderr sentinel/);
      return true;
    },
  );
});

test('Local v1 pre-closeout failure diagnostics keep only bounded stream tails', () => {
  const discardedPrefix = 'discarded-prefix-'.repeat(600);

  assert.throws(
    () => runLocalV1PrecloseoutVerification({
      implementationCommit,
      packageJson: packageJsonFixture(),
      runCommand: () => ({
        error: '',
        signal: '',
        status: 2,
        stderr: `${discardedPrefix}stderr sentinel`,
        stdout: `${discardedPrefix}stdout sentinel`,
        timedOut: false,
      }),
    }),
    (error) => {
      assert.equal(error.message.includes(discardedPrefix), false);
      assert.match(error.message, /stdoutTail:\n[^\n]*stdout sentinel/);
      assert.match(error.message, /stderrTail:\n[^\n]*stderr sentinel/);
      return true;
    },
  );
});

test('Local v1 builder requires current HEAD and a clean tracked worktree', () => {
  assert.throws(
    () => assertLocalV1BuilderState({
      implementationCommit,
      runGit: () => ({ error: '', status: 0, stdout: `${'b'.repeat(40)}\n` }),
    }),
    /must match the current HEAD/,
  );

  const results = [
    { error: '', status: 0, stdout: `${implementationCommit}\n` },
    { error: '', status: 1, stdout: '' },
  ];
  assert.throws(
    () => assertLocalV1BuilderState({ implementationCommit, runGit: () => results.shift() }),
    /Tracked worktree must be clean/,
  );
});

test('Local v1 closeout builder rejects the legacy caller-provided verification report', () => {
  const result = spawnSync(process.execPath, [
    'scripts/build-local-v1-completion-closeout.mjs',
    '--verification-report',
    'forged-report.json',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Expected --implementation-commit and --output/);
});

function packageJsonFixture() {
  return {
    scripts: Object.fromEntries(
      LOCAL_V1_PRE_CLOSEOUT_VERIFICATION_COMMANDS
        .filter(({ packageScript }) => packageScript !== null)
        .map(({ packageScript, packageScriptCommand }) => [packageScript, packageScriptCommand]),
    ),
  };
}

function sequenceClock(...values) {
  return () => values.shift();
}
