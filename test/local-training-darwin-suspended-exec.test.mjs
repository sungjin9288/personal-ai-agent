import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { test } from 'node:test';

import {
  assertLocalTrainingDarwinSuspendedExecContract,
  buildLocalTrainingDarwinSuspendedExecContract,
} from '../src/core/local-training-darwin-suspended-exec.mjs';
import {
  probeLocalTrainingDarwinSuspendedExec,
  validateDarwinSuspendedExecRuns,
} from '../scripts/probe-local-training-darwin-suspended-exec.mjs';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

const EXECUTABLE_CDHASH = 'a'.repeat(40);
const ENTRY_SHA256 = sha256('verified-entry');
const FILE_REPORT = Object.freeze({
  byteLength: 128,
  dev: '1',
  ino: '2',
  mode: 33_188,
  nlink: 1,
  sha256: ENTRY_SHA256,
  uid: 501,
});

function brokerStatus(matched) {
  return JSON.stringify({
    actualCdHashSha256: sha256('actual-cdhash'),
    cdHashCheckedBeforeResume: true,
    cdHashMatched: matched,
    childExitCode: matched ? 0 : null,
    childResumed: matched,
    childSignal: matched ? null : 9,
    schemaVersion:
      'personal-ai-agent-local-training-darwin-suspended-exec-broker/v1',
  });
}

function runRecord({ matched, replacementSha256 = null } = {}) {
  return {
    brokerAfter: { ...FILE_REPORT },
    brokerBefore: { ...FILE_REPORT },
    entryAfter: {
      ...FILE_REPORT,
      nlink: replacementSha256 === null ? 1 : 0,
    },
    entryBefore: { ...FILE_REPORT },
    exitCode: 0,
    outputOverflow: false,
    replacementSha256,
    signal: null,
    startFailed: false,
    status: brokerStatus(matched),
    stderr: '',
    stdout: matched ? JSON.stringify({
      entrySha256: ENTRY_SHA256,
      schemaVersion:
        'personal-ai-agent-local-training-darwin-suspended-exec-child/v1',
      status: 'executed-after-resume',
    }) : '',
    timedOut: false,
  };
}

function validationInput() {
  return {
    executableAfter: {
      cdHash: EXECUTABLE_CDHASH,
      report: { ...FILE_REPORT, uid: 0 },
      strictSignatureValidated: true,
    },
    executableBefore: {
      cdHash: EXECUTABLE_CDHASH,
      report: { ...FILE_REPORT, uid: 0 },
      strictSignatureValidated: true,
    },
    expectedCdHash: EXECUTABLE_CDHASH,
    mismatch: runRecord({ matched: false }),
    mismatchMarkerExists: false,
    success: runRecord({
      matched: true,
      replacementSha256: sha256('replacement-entry'),
    }),
    successMarkerExists: true,
  };
}

test('Darwin suspended exec contract is deterministic and non-authorizing', () => {
  const contract = buildLocalTrainingDarwinSuspendedExecContract();

  assert.deepEqual(
    buildLocalTrainingDarwinSuspendedExecContract(),
    contract,
  );
  assert.equal(
    assertLocalTrainingDarwinSuspendedExecContract(contract),
    contract,
  );
  assert.equal(contract.dynamicRuntimeClosureComplete, false);
  assert.equal(contract.nativeClosureComplete, false);
  assert.equal(contract.verifyToExecClosed, false);
  assert.equal(contract.actualMlxProcessSpawned, false);
  assert.equal(contract.actualModelTrainingExecuted, false);
  assert.equal(contract.trainingAuthorized, false);
  assert.equal(contract.productionReadyClaim, false);
  assert.throws(
    () => assertLocalTrainingDarwinSuspendedExecContract({
      ...contract,
      contractHash: '0'.repeat(64),
    }),
    /contract failed: integrity/u,
  );
});

test('Darwin suspended exec validates CDHash before resume and keeps entry bytes descriptor-bound', () => {
  const observation = validateDarwinSuspendedExecRuns(
    validationInput(),
  );

  assert.equal(observation.executableCdHashMatchedBeforeResume, true);
  assert.equal(observation.childEntrypointDescriptorMatched, true);
  assert.equal(
    observation.childEntrypointPathReplacementResisted,
    true,
  );
  assert.equal(
    observation.mismatchedExecutableBlockedBeforeResume,
    true,
  );
  assert.equal(observation.mismatchedExecutableMarkerAbsent, true);
});

test('Darwin suspended exec rejects resume, marker, and descriptor drift', () => {
  const resumedMismatch = validationInput();
  resumedMismatch.mismatch.status = brokerStatus(true);
  assert.throws(
    () => validateDarwinSuspendedExecRuns(resumedMismatch),
    /broker status failed/u,
  );

  const mismatchMarker = validationInput();
  mismatchMarker.mismatchMarkerExists = true;
  assert.throws(
    () => validateDarwinSuspendedExecRuns(mismatchMarker),
    /run failed: integrity/u,
  );

  const descriptorDrift = validationInput();
  descriptorDrift.success.entryAfter.sha256 = 'f'.repeat(64);
  assert.throws(
    () => validateDarwinSuspendedExecRuns(descriptorDrift),
    /observation failed: integrity/u,
  );
});

test('Darwin suspended exec refuses unsupported platforms before spawn', async () => {
  await assert.rejects(
    () => probeLocalTrainingDarwinSuspendedExec({ platform: 'linux' }),
    /requires Darwin/u,
  );
});

for (const [scenario, reason, result] of [
  ['timeout', 'timeout', { status: null, error: Object.assign(new Error('private detail'), { code: 'ETIMEDOUT' }) }],
  ['spawn-error', 'spawn-error', { status: null, error: Object.assign(new Error('private detail'), { code: 'ENOENT' }) }],
  ['exit-failure', 'exit-failure', { status: 1, stdout: '/private/interpreter\n' }],
  ['empty-path', 'invalid-path', { status: 0, stdout: '' }],
  ['relative-path', 'invalid-path', { status: 0, stdout: 'relative/python3\n' }],
  ['multiline-path', 'invalid-path', { status: 0, stdout: '/private/first\n/private/second\n' }],
]) {
  test(`Darwin Python resolution reports ${scenario} without raw output or a fallback`, async t => {
    const calls = [];
    t.mock.method(childProcess, 'spawnSync', (command, args, options) => {
      calls.push({ command, args, options });
      return { stderr: 'private stderr', ...result };
    });
    syncBuiltinESMExports();
    try {
      await assert.rejects(
        () => probeLocalTrainingDarwinSuspendedExec({ platform: 'darwin' }),
        error => {
          assert.equal(error.message, `Local training Darwin suspended exec could not resolve Python: ${reason}.`);
          assert.doesNotMatch(error.message, /private/);
          return true;
        },
      );
      assert.equal(calls.length, 1);
      assert.equal(calls[0].command, '/usr/bin/xcrun');
      assert.deepEqual(calls[0].args, ['--find', 'python3']);
      assert.deepEqual(calls[0].options.env, { LANG: 'C', LC_ALL: 'C' });
      assert.equal(calls[0].options.timeout, 5_000);
      assert.equal(calls[0].options.maxBuffer, 16 * 1024);
      assert.equal(calls[0].options.shell, false);
    } finally {
      t.mock.restoreAll();
      syncBuiltinESMExports();
    }
  });
}

test(
  'Darwin suspended exec observes an actual suspended signed fixture child',
  { skip: process.platform !== 'darwin' },
  async () => {
    const observation = await probeLocalTrainingDarwinSuspendedExec();

    assert.equal(
      observation.executableCdHashMatchedBeforeResume,
      true,
    );
    assert.equal(
      observation.childEntrypointPathReplacementResisted,
      true,
    );
    assert.equal(
      observation.mismatchedExecutableBlockedBeforeResume,
      true,
    );
  },
);
