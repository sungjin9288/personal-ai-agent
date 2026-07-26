import { spawn as nodeSpawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalTrainingRuntimeExecObservation,
  LOCAL_TRAINING_RUNTIME_EXEC_OBSERVATION_SCHEMA_VERSION,
} from '../src/core/local-training-runtime-exec-observation.mjs';
import {
  buildDarwinTrainingIsolationInvocation,
  LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS,
} from '../src/core/local-training-os-isolation.mjs';

const CHILD_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-exec-child/v1';
const MAX_CAPTURE_BYTES = 8_192;
const MAX_OBSERVED_FILE_BYTES = 256 * 1024 * 1024;
const PROBE_TIMEOUT_MS = 5_000;
const SYSTEM_EXECUTABLES = Object.freeze([
  '/usr/bin/python3',
  '/usr/bin/sandbox-exec',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
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

function inspectTrustedFile(
  filePath,
  expectedUid = process.getuid(),
  requireSingleLink = true,
) {
  if (!path.isAbsolute(filePath)) {
    throw new Error(
      'Local training runtime exec observation requires an absolute file path.',
    );
  }
  const pathStat = fs.lstatSync(filePath);
  const canonicalPath = fs.realpathSync(filePath);
  const stat = fs.lstatSync(canonicalPath);
  if (
    pathStat.isSymbolicLink() ||
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (requireSingleLink && stat.nlink !== 1) ||
    stat.uid !== expectedUid ||
    (stat.mode & 0o022) !== 0 ||
    stat.size <= 0 ||
    stat.size > MAX_OBSERVED_FILE_BYTES
  ) {
    throw new Error(
      'Local training runtime exec observation file is unsafe.',
    );
  }
  const content = fs.readFileSync(canonicalPath);
  const afterRead = fs.lstatSync(canonicalPath);
  const observation = {
    byteLength: content.byteLength,
    dev: stat.dev,
    ino: stat.ino,
    mode: stat.mode,
    nlink: stat.nlink,
    sha256: sha256(content),
    uid: stat.uid,
  };
  if (
    !sameFileIdentity(observation, {
      ...observation,
      byteLength: afterRead.size,
      dev: afterRead.dev,
      ino: afterRead.ino,
      mode: afterRead.mode,
      nlink: afterRead.nlink,
      uid: afterRead.uid,
    })
  ) {
    throw new Error(
      'Local training runtime exec observation file changed during inspection.',
    );
  }
  return observation;
}

function parseJson(value, label) {
  try {
    return JSON.parse(String(value || '').trim());
  } catch {
    throw new Error(
      `Local training runtime exec observation ${label} is invalid.`,
    );
  }
}

function hasExpectedLimitStatus(value) {
  return Boolean(
    hasExactKeys(value, ['limits', 'status']) &&
    value.status === 'applied' &&
    hasExactKeys(
      value.limits,
      Object.keys(LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS),
    ) &&
    Object.entries(LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS)
      .every(([key, expected]) => value.limits[key] === expected),
  );
}

function assertFileReport(value) {
  if (
    !hasExactKeys(value, [
      'byteLength',
      'dev',
      'ino',
      'mode',
      'nlink',
      'sha256',
      'uid',
    ]) ||
    !Number.isSafeInteger(value.byteLength) ||
    value.byteLength <= 0 ||
    value.byteLength > MAX_OBSERVED_FILE_BYTES ||
    !Number.isSafeInteger(value.dev) ||
    value.dev < 0 ||
    !Number.isSafeInteger(value.ino) ||
    value.ino <= 0 ||
    !Number.isSafeInteger(value.mode) ||
    value.mode <= 0 ||
    !Number.isSafeInteger(value.nlink) ||
    value.nlink <= 0 ||
    !Number.isSafeInteger(value.uid) ||
    value.uid < 0 ||
    !/^[a-f0-9]{64}$/u.test(value.sha256)
  ) {
    throw new Error(
      'Local training runtime exec observation child file report is invalid.',
    );
  }
}

function runCommand({
  args,
  command,
  cwd,
  environment,
  spawnProcess = nodeSpawn,
}) {
  return new Promise((resolve) => {
    let child;
    let outputOverflow = false;
    let settled = false;
    let status = '';
    let stderr = '';
    let stdout = '';
    let timedOut = false;
    let timer;

    function append(current, chunk) {
      const next = current + String(chunk);
      if (Buffer.byteLength(next, 'utf8') > MAX_CAPTURE_BYTES) {
        outputOverflow = true;
        child?.kill('SIGKILL');
        return current;
      }
      return next;
    }

    function finish(result) {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve({
        ...result,
        outputOverflow,
        status,
        stderr,
        stdout,
        timedOut,
      });
    }

    try {
      child = spawnProcess(command, args, {
        cwd,
        detached: false,
        env: environment,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe', 'pipe'],
      });
    } catch {
      resolve({
        exitCode: null,
        outputOverflow: false,
        signal: null,
        startFailed: true,
        status: '',
        stderr: '',
        stdout: '',
        timedOut: false,
      });
      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, PROBE_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr = append(stderr, chunk);
    });
    child.stdio[3].on('data', (chunk) => {
      status = append(status, chunk);
    });
    child.once('error', () => {
      finish({ exitCode: null, signal: null, startFailed: true });
    });
    child.once('close', (exitCode, signal) => {
      finish({ exitCode, signal, startFailed: false });
    });
  });
}

export function validateRuntimeExecChildReport({
  after,
  before,
  report,
  run,
} = {}) {
  if (
    !hasExactKeys(report, [
      'entry',
      'executable',
      'moduleLoads',
      'runtimeImages',
      'schemaVersion',
    ]) ||
    report.schemaVersion !== CHILD_SCHEMA_VERSION ||
    !hasExactKeys(report.moduleLoads, ['count', 'setSha256']) ||
    !hasExactKeys(report.runtimeImages, [
      'allAbsolute',
      'count',
      'regularCount',
      'setSha256',
      'unique',
      'unresolvedCount',
    ])
  ) {
    throw new Error(
      'Local training runtime exec observation child report is invalid.',
    );
  }
  assertFileReport(report.entry);
  assertFileReport(report.executable);
  const entryMatched = sameFileIdentity(before.entry, report.entry) &&
    sameFileIdentity(after.entry, report.entry);
  const executableMatched =
    sameFileIdentity(before.executable, report.executable) &&
    sameFileIdentity(after.executable, report.executable);
  const bootstrapStable =
    Array.isArray(before.bootstrap) &&
    Array.isArray(after.bootstrap) &&
    before.bootstrap.length === after.bootstrap.length &&
    before.bootstrap.every((file, index) =>
      sameFileIdentity(file, after.bootstrap[index]));
  const observation = {
    entryFileIdentityMatched: entryMatched,
    entrySha256: report.entry.sha256,
    executableFileIdentityMatched: executableMatched,
    executableSha256: report.executable.sha256,
    moduleLoadCount: report.moduleLoads.count,
    moduleLoadSetSha256: report.moduleLoads.setSha256,
    outputBoundsPreserved: run.outputOverflow === false,
    prePostFileIdentityStable:
      sameFileIdentity(before.entry, after.entry) &&
      sameFileIdentity(before.executable, after.executable) &&
      bootstrapStable,
    regularRuntimeImageCount: report.runtimeImages.regularCount,
    runtimeImageCount: report.runtimeImages.count,
    runtimeImagesAbsolute: report.runtimeImages.allAbsolute,
    runtimeImagesUnique: report.runtimeImages.unique,
    runtimeImageSetSha256: report.runtimeImages.setSha256,
    schemaVersion:
      LOCAL_TRAINING_RUNTIME_EXEC_OBSERVATION_SCHEMA_VERSION,
    unresolvedRuntimeImageCount:
      report.runtimeImages.unresolvedCount,
    wrapperLimitsValidated: hasExpectedLimitStatus(
      parseJson(run.status, 'wrapper status'),
    ),
  };
  return assertLocalTrainingRuntimeExecObservation(observation);
}

export async function probeLocalTrainingRuntimeExecObservation({
  platform = process.platform,
  repoDir = process.cwd(),
  spawnProcess = nodeSpawn,
} = {}) {
  if (platform !== 'darwin') {
    throw new Error(
      'Local training runtime exec observation requires Darwin.',
    );
  }
  const entryPath = path.join(
    repoDir,
    'fixtures',
    'local-training-runtime-exec-observer.mjs',
  );
  const wrapperPath = path.join(
    repoDir,
    'fixtures',
    'local-training-posix-limits-wrapper.py',
  );
  const before = {
    bootstrap: [
      ...SYSTEM_EXECUTABLES.map((filePath) =>
        inspectTrustedFile(filePath, 0, false)),
      inspectTrustedFile(wrapperPath),
    ],
    entry: inspectTrustedFile(entryPath),
    executable: inspectTrustedFile(process.execPath),
  };
  const invocation = buildDarwinTrainingIsolationInvocation({
    childArgs: [entryPath],
    childCommand: process.execPath,
    platform,
    wrapperPath,
  });
  const run = await runCommand({
    args: invocation.args,
    command: invocation.command,
    cwd: repoDir,
    environment: invocation.environment,
    spawnProcess,
  });
  if (
    run.startFailed ||
    run.timedOut ||
    run.outputOverflow ||
    run.exitCode !== 0 ||
    run.signal !== null
  ) {
    throw new Error(
      'Local training runtime exec observation child did not close cleanly.',
    );
  }
  const after = {
    bootstrap: [
      ...SYSTEM_EXECUTABLES.map((filePath) =>
        inspectTrustedFile(filePath, 0, false)),
      inspectTrustedFile(wrapperPath),
    ],
    entry: inspectTrustedFile(entryPath),
    executable: inspectTrustedFile(process.execPath),
  };
  return validateRuntimeExecChildReport({
    after,
    before,
    report: parseJson(run.stdout, 'child report'),
    run,
  });
}
