import { spawn as nodeSpawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalTrainingDarwinSuspendedExecObservation,
  LOCAL_TRAINING_DARWIN_SUSPENDED_EXEC_SCHEMA_VERSION,
} from '../src/core/local-training-darwin-suspended-exec.mjs';

const BROKER_SCHEMA_VERSION =
  'personal-ai-agent-local-training-darwin-suspended-exec-broker/v1';
const CHILD_SCHEMA_VERSION =
  'personal-ai-agent-local-training-darwin-suspended-exec-child/v1';
const BROKER_ENTRY =
  'fixtures/local-training-darwin-suspended-exec-broker.py';
const CHILD_ENTRY =
  'fixtures/local-training-darwin-suspended-exec-child.py';
const CODESIGN = '/usr/bin/codesign';
const XCRUN = '/usr/bin/xcrun';
const CLEAN_ENVIRONMENT = Object.freeze({
  LANG: 'C',
  LC_ALL: 'C',
});
const MAX_CAPTURE_BYTES = 16 * 1024;
const MAX_FILE_BYTES = 256 * 1024 * 1024;
const PROBE_TIMEOUT_MS = 5_000;

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashSet(values) {
  return sha256(JSON.stringify([...new Set(values)].sort()));
}

function hasExactKeys(value, expectedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === expectedKeys.length &&
    Object.keys(value).every((key) => expectedKeys.includes(key)),
  );
}

function sameFileIdentity(left, right) {
  return [
    'byteLength',
    'dev',
    'ino',
    'mode',
    'nlink',
    'sha256',
    'uid',
  ].every((field) => left[field] === right[field]);
}

function sameDescriptorIdentity(left, right) {
  return [
    'byteLength',
    'dev',
    'ino',
    'mode',
    'sha256',
    'uid',
  ].every((field) => left[field] === right[field]);
}

function readDescriptor(fd, byteLength) {
  const content = Buffer.alloc(byteLength);
  let offset = 0;
  while (offset < content.byteLength) {
    const read = fs.readSync(
      fd,
      content,
      offset,
      content.byteLength - offset,
      offset,
    );
    if (read <= 0) {
      throw new Error(
        'Local training Darwin suspended exec descriptor ended early.',
      );
    }
    offset += read;
  }
  return content;
}

function inspectOpenDescriptor(
  filePath,
  expectedUid,
  requireSingleLink = true,
) {
  if (!path.isAbsolute(filePath)) {
    throw new Error(
      'Local training Darwin suspended exec requires an absolute file path.',
    );
  }
  const pathStat = fs.lstatSync(filePath, { bigint: true });
  if (pathStat.isSymbolicLink()) {
    throw new Error(
      'Local training Darwin suspended exec rejects symbolic links.',
    );
  }
  const fd = fs.openSync(
    filePath,
    fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW,
  );
  try {
    const stat = fs.fstatSync(fd, { bigint: true });
    if (
      !stat.isFile() ||
      (requireSingleLink && stat.nlink !== 1n) ||
      stat.uid !== BigInt(expectedUid) ||
      (stat.mode & 0o22n) !== 0n ||
      stat.size <= 0n ||
      stat.size > BigInt(MAX_FILE_BYTES)
    ) {
      throw new Error(
        'Local training Darwin suspended exec file is unsafe.',
      );
    }
    const content = readDescriptor(fd, Number(stat.size));
    const afterRead = fs.fstatSync(fd, { bigint: true });
    const report = {
      byteLength: content.byteLength,
      dev: String(stat.dev),
      ino: String(stat.ino),
      mode: Number(stat.mode),
      nlink: Number(stat.nlink),
      sha256: sha256(content),
      uid: Number(stat.uid),
    };
    const afterReport = {
      ...report,
      byteLength: Number(afterRead.size),
      dev: String(afterRead.dev),
      ino: String(afterRead.ino),
      mode: Number(afterRead.mode),
      nlink: Number(afterRead.nlink),
      uid: Number(afterRead.uid),
    };
    if (!sameFileIdentity(report, afterReport)) {
      throw new Error(
        'Local training Darwin suspended exec file changed during inspection.',
      );
    }
    return { fd, report };
  } catch (error) {
    fs.closeSync(fd);
    throw error;
  }
}

function reinspectDescriptor(descriptor) {
  const stat = fs.fstatSync(descriptor.fd, { bigint: true });
  const content = readDescriptor(descriptor.fd, Number(stat.size));
  return {
    byteLength: content.byteLength,
    dev: String(stat.dev),
    ino: String(stat.ino),
    mode: Number(stat.mode),
    nlink: Number(stat.nlink),
    sha256: sha256(content),
    uid: Number(stat.uid),
  };
}

function inspectSignedExecutable(filePath) {
  const descriptor = inspectOpenDescriptor(filePath, 0, false);
  try {
    const verify = spawnSync(
      CODESIGN,
      ['--verify', '--strict', filePath],
      {
        encoding: 'utf8',
        env: CLEAN_ENVIRONMENT,
        maxBuffer: MAX_CAPTURE_BYTES,
        shell: false,
        timeout: PROBE_TIMEOUT_MS,
      },
    );
    const describe = spawnSync(
      CODESIGN,
      ['-d', '--verbose=4', filePath],
      {
        encoding: 'utf8',
        env: CLEAN_ENVIRONMENT,
        maxBuffer: MAX_CAPTURE_BYTES,
        shell: false,
        timeout: PROBE_TIMEOUT_MS,
      },
    );
    const output = `${describe.stdout || ''}${describe.stderr || ''}`;
    const match = output.match(/^CDHash=([a-f0-9]{40})$/mu);
    if (
      verify.status !== 0 ||
      verify.error ||
      describe.status !== 0 ||
      describe.error ||
      !match
    ) {
      throw new Error(
        'Local training Darwin suspended exec code signature failed.',
      );
    }
    return {
      cdHash: match[1],
      report: descriptor.report,
      strictSignatureValidated: true,
    };
  } finally {
    fs.closeSync(descriptor.fd);
  }
}

function resolveSystemPython() {
  const result = spawnSync(
    XCRUN,
    ['--find', 'python3'],
    {
      encoding: 'utf8',
      env: CLEAN_ENVIRONMENT,
      maxBuffer: MAX_CAPTURE_BYTES,
      shell: false,
      timeout: PROBE_TIMEOUT_MS,
    },
  );
  const selected = String(result.stdout || '').trim();
  if (
    result.status !== 0 ||
    result.error ||
    !path.isAbsolute(selected) ||
    /[\r\n\0]/u.test(selected)
  ) {
    throw new Error(
      'Local training Darwin suspended exec could not resolve Python.',
    );
  }
  return fs.realpathSync(selected);
}

function appendBounded(state, chunk) {
  const next = state.value + String(chunk);
  if (Buffer.byteLength(next, 'utf8') > MAX_CAPTURE_BYTES) {
    state.overflow = true;
    return;
  }
  state.value = next;
}

function runBroker({
  brokerPath,
  entryPath,
  expectedCdHash,
  markerPath,
  pythonPath,
  replaceEntryPath = false,
  spawnProcess = nodeSpawn,
}) {
  const broker = inspectOpenDescriptor(brokerPath, process.getuid());
  const entry = inspectOpenDescriptor(entryPath, process.getuid());
  let replacementSha256 = null;
  if (replaceEntryPath) {
    const replacementPath = `${entryPath}.replacement`;
    const replacement = Buffer.from('raise SystemExit(97)\n', 'utf8');
    fs.writeFileSync(replacementPath, replacement, {
      flag: 'wx',
      mode: 0o600,
    });
    fs.renameSync(replacementPath, entryPath);
    replacementSha256 = sha256(replacement);
  }

  return new Promise((resolve) => {
    const stdout = { overflow: false, value: '' };
    const stderr = { overflow: false, value: '' };
    const status = { overflow: false, value: '' };
    let child;
    let settled = false;
    let timedOut = false;
    let timer;

    function finish(result) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      const brokerAfter = reinspectDescriptor(broker);
      const entryAfter = reinspectDescriptor(entry);
      fs.closeSync(broker.fd);
      fs.closeSync(entry.fd);
      resolve({
        brokerAfter,
        brokerBefore: broker.report,
        entryAfter,
        entryBefore: entry.report,
        outputOverflow:
          stdout.overflow || stderr.overflow || status.overflow,
        replacementSha256,
        status: status.value,
        stderr: stderr.value,
        stdout: stdout.value,
        timedOut,
        ...result,
      });
    }

    try {
      child = spawnProcess(
        pythonPath,
        [
          '-E',
          '-S',
          '-B',
          '-',
          expectedCdHash,
          pythonPath,
          '-E',
          '-S',
          '-B',
          '-',
          markerPath,
        ],
        {
          env: CLEAN_ENVIRONMENT,
          shell: false,
          stdio: [
            broker.fd,
            'pipe',
            'pipe',
            'ignore',
            entry.fd,
            'pipe',
          ],
        },
      );
    } catch {
      finish({ exitCode: null, signal: null, startFailed: true });
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, PROBE_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => appendBounded(stdout, chunk));
    child.stderr.on('data', (chunk) => appendBounded(stderr, chunk));
    child.stdio[5].on('data', (chunk) => appendBounded(status, chunk));
    child.once('error', () => {
      finish({ exitCode: null, signal: null, startFailed: true });
    });
    child.once('close', (exitCode, signal) => {
      finish({ exitCode, signal, startFailed: false });
    });
  });
}

function parseJson(value, label) {
  try {
    return JSON.parse(String(value || '').trim());
  } catch {
    throw new Error(
      `Local training Darwin suspended exec ${label} is invalid.`,
    );
  }
}

function assertBrokerStatus(value, matched) {
  if (
    !hasExactKeys(value, [
      'actualCdHashSha256',
      'cdHashCheckedBeforeResume',
      'cdHashMatched',
      'childExitCode',
      'childResumed',
      'childSignal',
      'schemaVersion',
    ]) ||
    value.schemaVersion !== BROKER_SCHEMA_VERSION ||
    value.cdHashCheckedBeforeResume !== true ||
    value.cdHashMatched !== matched ||
    value.childResumed !== matched ||
    !/^[a-f0-9]{64}$/u.test(value.actualCdHashSha256)
  ) {
    throw new Error(
      'Local training Darwin suspended exec broker status failed.',
    );
  }
}

export function validateDarwinSuspendedExecRuns({
  executableAfter,
  executableBefore,
  expectedCdHash,
  mismatch,
  mismatchMarkerExists,
  success,
  successMarkerExists,
} = {}) {
  const successStatus = parseJson(success?.status, 'success status');
  const mismatchStatus = parseJson(mismatch?.status, 'mismatch status');
  const childReport = parseJson(success?.stdout, 'child report');
  assertBrokerStatus(successStatus, true);
  assertBrokerStatus(mismatchStatus, false);
  if (
    !hasExactKeys(childReport, [
      'entrySha256',
      'schemaVersion',
      'status',
    ]) ||
    childReport.schemaVersion !== CHILD_SCHEMA_VERSION ||
    childReport.status !== 'executed-after-resume' ||
    childReport.entrySha256 !== success.entryBefore.sha256 ||
    !/^[a-f0-9]{40}$/u.test(expectedCdHash) ||
    successStatus.childExitCode !== 0 ||
    successStatus.childSignal !== null ||
    mismatchStatus.childExitCode !== null ||
    mismatchStatus.childSignal !== 9 ||
    success.exitCode !== 0 ||
    success.signal !== null ||
    success.startFailed ||
    mismatch.exitCode !== 0 ||
    mismatch.signal !== null ||
    mismatch.startFailed ||
    success.timedOut ||
    mismatch.timedOut ||
    success.outputOverflow ||
    mismatch.outputOverflow ||
    success.stderr !== '' ||
    mismatch.stderr !== '' ||
    mismatch.stdout !== '' ||
    success.replacementSha256 === success.entryBefore.sha256 ||
    successMarkerExists !== true ||
    mismatchMarkerExists !== false
  ) {
    throw new Error(
      'Local training Darwin suspended exec run failed: integrity.',
    );
  }

  const observation = {
    brokerEntrypointDescriptorMatched:
      sameFileIdentity(success.brokerBefore, success.brokerAfter) &&
      sameFileIdentity(mismatch.brokerBefore, mismatch.brokerAfter),
    brokerInterpreterStrictSignatureValidated:
      executableBefore.strictSignatureValidated === true &&
      executableAfter.strictSignatureValidated === true,
    childEntrypointDescriptorMatched:
      sameDescriptorIdentity(success.entryBefore, success.entryAfter) &&
      success.entryBefore.nlink === 1 &&
      success.entryAfter.nlink === 0 &&
      sameFileIdentity(mismatch.entryBefore, mismatch.entryAfter) &&
      childReport.entrySha256 === success.entryBefore.sha256,
    childEntrypointPathReplacementResisted:
      success.replacementSha256 !== null &&
      success.replacementSha256 !== success.entryBefore.sha256 &&
      childReport.entrySha256 === success.entryBefore.sha256,
    childEntrypointSha256: childReport.entrySha256,
    executableCdHashMatchedBeforeResume:
      successStatus.cdHashCheckedBeforeResume === true &&
      successStatus.cdHashMatched === true &&
      successStatus.childResumed === true,
    executableCdHashSetSha256: hashSet([expectedCdHash]),
    executableFileIdentityStable:
      expectedCdHash === executableBefore.cdHash &&
      expectedCdHash === executableAfter.cdHash &&
      sameFileIdentity(
        executableBefore.report,
        executableAfter.report,
      ),
    mismatchedExecutableBlockedBeforeResume:
      mismatchStatus.cdHashCheckedBeforeResume === true &&
      mismatchStatus.cdHashMatched === false &&
      mismatchStatus.childResumed === false &&
      mismatchStatus.childSignal === 9 &&
      mismatch.stdout === '',
    mismatchedExecutableMarkerAbsent: mismatchMarkerExists === false,
    outputBoundsPreserved:
      success.outputOverflow === false &&
      mismatch.outputOverflow === false,
    schemaVersion:
      LOCAL_TRAINING_DARWIN_SUSPENDED_EXEC_SCHEMA_VERSION,
    successfulChildExitCode: successStatus.childExitCode,
  };
  return assertLocalTrainingDarwinSuspendedExecObservation(observation);
}

export async function probeLocalTrainingDarwinSuspendedExec({
  platform = process.platform,
  repoDir = process.cwd(),
} = {}) {
  if (platform !== 'darwin') {
    throw new Error(
      'Local training Darwin suspended exec requires Darwin.',
    );
  }
  if (typeof process.getuid !== 'function') {
    throw new Error(
      'Local training Darwin suspended exec requires a POSIX user.',
    );
  }

  const brokerPath = path.join(repoDir, BROKER_ENTRY);
  const childFixturePath = path.join(repoDir, CHILD_ENTRY);
  const pythonPath = resolveSystemPython();
  const executableBefore = inspectSignedExecutable(pythonPath);
  const temporaryRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), 'personal-ai-agent-suspended-exec-'),
  );
  fs.chmodSync(temporaryRoot, 0o700);
  try {
    const successEntry = path.join(temporaryRoot, 'success-entry.py');
    const mismatchEntry = path.join(temporaryRoot, 'mismatch-entry.py');
    const successMarker = path.join(temporaryRoot, 'success-marker');
    const mismatchMarker = path.join(temporaryRoot, 'mismatch-marker');
    fs.copyFileSync(childFixturePath, successEntry);
    fs.copyFileSync(childFixturePath, mismatchEntry);
    fs.chmodSync(successEntry, 0o600);
    fs.chmodSync(mismatchEntry, 0o600);

    const success = await runBroker({
      brokerPath,
      entryPath: successEntry,
      expectedCdHash: executableBefore.cdHash,
      markerPath: successMarker,
      pythonPath,
      replaceEntryPath: true,
    });
    const mismatch = await runBroker({
      brokerPath,
      entryPath: mismatchEntry,
      expectedCdHash: '0'.repeat(40),
      markerPath: mismatchMarker,
      pythonPath,
    });
    const executableAfter = inspectSignedExecutable(pythonPath);
    return validateDarwinSuspendedExecRuns({
      executableAfter,
      executableBefore,
      expectedCdHash: executableBefore.cdHash,
      mismatch,
      mismatchMarkerExists: fs.existsSync(mismatchMarker),
      success,
      successMarkerExists: fs.existsSync(successMarker),
    });
  } finally {
    fs.rmSync(temporaryRoot, { force: true, recursive: true });
  }
}
