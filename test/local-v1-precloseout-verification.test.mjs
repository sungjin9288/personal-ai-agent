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
      packageJson: packageJsonFixture(),
      runCommand: () => ({ error: '', status: 1, stderr: '', stdout: '', timedOut: false }),
    }),
    /pre-closeout verification failed: unit-tests/,
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
