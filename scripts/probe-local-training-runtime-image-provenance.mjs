import { spawn as nodeSpawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalTrainingRuntimeImageProvenance,
  LOCAL_TRAINING_RUNTIME_IMAGE_PROVENANCE_SCHEMA_VERSION,
} from '../src/core/local-training-runtime-image-provenance.mjs';
import {
  buildDarwinTrainingIsolationInvocation,
  LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS,
} from '../src/core/local-training-os-isolation.mjs';

const CHILD_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-image-provenance-child/v1';
const MAX_CHILD_OUTPUT_BYTES = 64 * 1024;
const MAX_FILE_BYTES = 256 * 1024 * 1024;
const MAX_TOOL_OUTPUT_BYTES = 16 * 1024 * 1024;
const PROCESS_TIMEOUT_MS = 10_000;
const TOOL_TIMEOUT_MS = 15_000;
const SYSTEM_TOOLS = Object.freeze([
  '/usr/bin/codesign',
  '/usr/bin/dyld_info',
  '/usr/bin/python3',
  '/usr/bin/sandbox-exec',
  '/usr/bin/vmmap',
]);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashSet(values) {
  return sha256(JSON.stringify([...new Set(values)].sort()));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(String(value || ''));
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

function sameFileReport(left, right) {
  return [
    'byteLength',
    'dev',
    'ino',
    'mode',
    'nlink',
    'pathSha256',
    'sha256',
    'uid',
  ].every((field) => left?.[field] === right?.[field]);
}

function sameCacheFileReport(left, right) {
  return [
    'byteLength',
    'cdHashFull',
    'dev',
    'ino',
    'mode',
    'nlink',
    'pathSha256',
    'uid',
  ].every((field) => left?.[field] === right?.[field]);
}

function inspectFileMetadata(
  filePath,
  expectedUid,
  requireSingleLink = true,
) {
  if (!path.isAbsolute(filePath)) {
    throw new Error(
      'Local training runtime image provenance requires absolute paths.',
    );
  }
  const pathStat = fs.lstatSync(filePath, { bigint: true });
  const canonicalPath = fs.realpathSync(filePath);
  const stat = fs.lstatSync(canonicalPath, { bigint: true });
  if (
    pathStat.isSymbolicLink() ||
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    (requireSingleLink && stat.nlink !== 1n) ||
    stat.uid !== BigInt(expectedUid) ||
    (stat.mode & 0o022n) !== 0n ||
    stat.size <= 0n
  ) {
    throw new Error(
      'Local training runtime image provenance file is unsafe.',
    );
  }
  return {
    canonicalPath,
    report: {
      byteLength: Number(stat.size),
      dev: stat.dev.toString(),
      ino: stat.ino.toString(),
      mode: Number(stat.mode),
      nlink: Number(stat.nlink),
      pathSha256: sha256(filePath),
      uid: Number(stat.uid),
    },
  };
}

function inspectRegularImage(filePath, requireSingleLink = true) {
  const owner = fs.lstatSync(fs.realpathSync(filePath)).uid;
  if (![0, process.getuid()].includes(owner)) {
    throw new Error(
      'Local training runtime image provenance file owner is unsafe.',
    );
  }
  const { canonicalPath, report } = inspectFileMetadata(
    filePath,
    owner,
    requireSingleLink,
  );
  if (report.byteLength > MAX_FILE_BYTES) {
    throw new Error(
      'Local training runtime image provenance file is too large.',
    );
  }
  const content = fs.readFileSync(canonicalPath);
  const afterRead = inspectFileMetadata(
    filePath,
    owner,
    requireSingleLink,
  ).report;
  const withHash = {
    ...report,
    sha256: sha256(content),
  };
  if (
    !sameFileReport(withHash, {
      ...afterRead,
      sha256: withHash.sha256,
    })
  ) {
    throw new Error(
      'Local training runtime image provenance file changed.',
    );
  }
  return { path: filePath, report: withHash };
}

function runTool(command, args) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { LANG: 'C', LC_ALL: 'C' },
    maxBuffer: MAX_TOOL_OUTPUT_BYTES,
    shell: false,
    timeout: TOOL_TIMEOUT_MS,
  });
  if (
    result.error ||
    result.signal != null ||
    result.status !== 0
  ) {
    throw new Error(
      'Local training runtime image provenance tool failed.',
    );
  }
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (Buffer.byteLength(output, 'utf8') > MAX_TOOL_OUTPUT_BYTES) {
    throw new Error(
      'Local training runtime image provenance tool output overflowed.',
    );
  }
  return output;
}

export function parseDyldCacheUuidInventory(output, architecture) {
  if (!['arm64e', 'x86_64'].includes(architecture)) {
    throw new Error(
      'Local training runtime image provenance cache architecture is unsupported.',
    );
  }
  const inventory = new Map();
  let currentPath = null;
  for (const line of String(output || '').split(/\r?\n/u)) {
    const image = line.match(/^(.+) \[([^\]]+)\]:$/u);
    if (image) {
      currentPath = image[2] === architecture ? image[1] : null;
      continue;
    }
    const uuid = line.match(
      /^\s+([0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12})$/u,
    );
    if (!uuid || !currentPath) {
      continue;
    }
    if (!path.isAbsolute(currentPath)) {
      throw new Error(
        'Local training runtime image provenance cache path is invalid.',
      );
    }
    const normalizedUuid = uuid[1].toLowerCase();
    const existing = inventory.get(currentPath);
    if (existing && existing !== normalizedUuid) {
      throw new Error(
        'Local training runtime image provenance cache UUID is ambiguous.',
      );
    }
    inventory.set(currentPath, normalizedUuid);
    currentPath = null;
  }
  if (inventory.size === 0 || inventory.size > 16_384) {
    throw new Error(
      'Local training runtime image provenance cache inventory is invalid.',
    );
  }
  return [...inventory.entries()]
    .map(([imagePath, uuid]) => ({
      path: imagePath,
      pathSha256: sha256(imagePath),
      uuid,
    }))
    .sort((left, right) =>
      left.pathSha256.localeCompare(right.pathSha256));
}

function resolveCacheFiles(architecture) {
  const roots = [
    '/System/Volumes/Preboot/Cryptexes/OS/System/Library/dyld',
    '/System/Library/dyld',
  ];
  const prefix = `dyld_shared_cache_${architecture}`;
  const root = roots.find((candidate) =>
    fs.existsSync(path.join(candidate, prefix)));
  if (!root) {
    throw new Error(
      'Local training runtime image provenance cache is unavailable.',
    );
  }
  const files = fs.readdirSync(root)
    .filter((name) =>
      name === prefix ||
      new RegExp(`^${prefix}\\.\\d{2}(?:\\..+)?$`, 'u').test(name))
    .map((name) => path.join(root, name))
    .sort();
  if (files.length === 0 || files.length > 64) {
    throw new Error(
      'Local training runtime image provenance cache file set is invalid.',
    );
  }
  return files;
}

function inspectCacheFiles(cacheFiles) {
  return cacheFiles.map((filePath) => {
    const before = inspectFileMetadata(filePath, 0).report;
    runTool('/usr/bin/codesign', ['--verify', '--strict', filePath]);
    const details = runTool('/usr/bin/codesign', [
      '-dv',
      '--verbose=4',
      filePath,
    ]);
    const cdHash = details.match(
      /^CandidateCDHashFull sha256=([a-f0-9]{64})$/mu,
    )?.[1];
    const after = inspectFileMetadata(filePath, 0).report;
    if (!cdHash || !sameCacheFileReport(
      { ...before, cdHashFull: cdHash },
      { ...after, cdHashFull: cdHash },
    )) {
      throw new Error(
        'Local training runtime image provenance cache identity failed.',
      );
    }
    return {
      path: filePath,
      report: { ...before, cdHashFull: cdHash },
    };
  });
}

function inspectParentRegularImages() {
  const runtimeImages = process.report.getReport().sharedObjects || [];
  return runtimeImages
    .filter((imagePath) => {
      try {
        return fs.statSync(imagePath).isFile();
      } catch {
        return false;
      }
    })
    .map(inspectRegularImage)
    .sort((left, right) =>
      left.report.pathSha256.localeCompare(right.report.pathSha256));
}

function parseJson(value, label) {
  try {
    return JSON.parse(String(value || '').trim());
  } catch {
    throw new Error(
      `Local training runtime image provenance ${label} is invalid.`,
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

function assertRegularImageReport(value) {
  if (
    !hasExactKeys(value, [
      'byteLength',
      'dev',
      'ino',
      'mode',
      'nlink',
      'pathSha256',
      'sha256',
      'uid',
    ]) ||
    !Number.isSafeInteger(value.byteLength) ||
    value.byteLength <= 0 ||
    value.byteLength > MAX_FILE_BYTES ||
    !/^\d+$/u.test(value.dev) ||
    !/^[1-9]\d*$/u.test(value.ino) ||
    !Number.isSafeInteger(value.mode) ||
    value.mode <= 0 ||
    !Number.isSafeInteger(value.nlink) ||
    value.nlink !== 1 ||
    !Number.isSafeInteger(value.uid) ||
    value.uid < 0 ||
    !isSha256(value.pathSha256) ||
    !isSha256(value.sha256)
  ) {
    throw new Error(
      'Local training runtime image provenance child file is invalid.',
    );
  }
}

function assertChildReport(value) {
  const images = value?.runtimeImages;
  if (
    !hasExactKeys(value, ['runtimeImages', 'schemaVersion']) ||
    value.schemaVersion !== CHILD_SCHEMA_VERSION ||
    !hasExactKeys(images, [
      'allAbsolute',
      'count',
      'pathHashes',
      'regularImages',
      'setSha256',
      'sharedCachePathHashes',
      'unique',
    ]) ||
    images.allAbsolute !== true ||
    images.unique !== true ||
    !Number.isSafeInteger(images.count) ||
    images.count <= 0 ||
    images.count > 4_096 ||
    !Array.isArray(images.pathHashes) ||
    images.pathHashes.length !== images.count ||
    !Array.isArray(images.regularImages) ||
    images.regularImages.length <= 0 ||
    !Array.isArray(images.sharedCachePathHashes) ||
    images.sharedCachePathHashes.length <= 0 ||
    images.regularImages.length +
        images.sharedCachePathHashes.length !==
      images.count ||
    !isSha256(images.setSha256)
  ) {
    throw new Error(
      'Local training runtime image provenance child report is invalid.',
    );
  }
  images.regularImages.forEach(assertRegularImageReport);
  for (const values of [
    images.pathHashes,
    images.sharedCachePathHashes,
    images.regularImages.map((item) => item.pathSha256),
  ]) {
    if (
      values.some((item) => !isSha256(item)) ||
      JSON.stringify(values) !== JSON.stringify([...values].sort()) ||
      new Set(values).size !== values.length
    ) {
      throw new Error(
        'Local training runtime image provenance child inventory is invalid.',
      );
    }
  }
  const combined = [
    ...images.regularImages.map((item) => item.pathSha256),
    ...images.sharedCachePathHashes,
  ].sort();
  if (JSON.stringify(combined) !== JSON.stringify(images.pathHashes)) {
    throw new Error(
      'Local training runtime image provenance child inventory is invalid.',
    );
  }
  return value;
}

function arraysMatch(left, right, comparator) {
  return Boolean(
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((item, index) => comparator(item, right[index])),
  );
}

export function validateRuntimeImageProvenance({
  cacheArchitecture,
  cacheFilesAfter,
  cacheFilesBefore,
  cacheInventoryAfter,
  cacheInventoryBefore,
  childReport,
  parentRegularAfter,
  parentRegularBefore,
  run,
  vmmapOutput,
} = {}) {
  assertChildReport(childReport);
  const images = childReport.runtimeImages;
  if (
    !arraysMatch(
      parentRegularBefore,
      parentRegularAfter,
      (left, right) =>
        left.path === right.path &&
        sameFileReport(left.report, right.report),
    ) ||
    !arraysMatch(
      cacheFilesBefore,
      cacheFilesAfter,
      (left, right) =>
        left.path === right.path &&
        sameCacheFileReport(left.report, right.report),
    ) ||
    JSON.stringify(cacheInventoryBefore) !==
      JSON.stringify(cacheInventoryAfter)
  ) {
    throw new Error(
      'Local training runtime image provenance changed during observation.',
    );
  }
  const regularByHash = new Map(
    parentRegularBefore.map((item) => [item.report.pathSha256, item]),
  );
  const cacheByHash = new Map(
    cacheInventoryBefore.map((item) => [item.pathSha256, item]),
  );
  const matchedPaths = [];
  for (const childImage of images.regularImages) {
    const parentImage = regularByHash.get(childImage.pathSha256);
    if (!parentImage || !sameFileReport(childImage, parentImage.report)) {
      throw new Error(
        'Local training runtime image provenance regular image mismatch.',
      );
    }
    matchedPaths.push(parentImage.path);
  }
  const sharedCacheIdentities = [];
  for (const pathSha256 of images.sharedCachePathHashes) {
    const cacheImage = cacheByHash.get(pathSha256);
    if (!cacheImage) {
      throw new Error(
        'Local training runtime image provenance cache image mismatch.',
      );
    }
    matchedPaths.push(cacheImage.path);
    sharedCacheIdentities.push(
      `${cacheImage.pathSha256}:${cacheImage.uuid}`,
    );
  }
  const vmmapLines = String(vmmapOutput || '').split(/\r?\n/u);
  if (
    hashSet(matchedPaths) !== images.setSha256 ||
    matchedPaths.some((imagePath) =>
      !vmmapLines.some((line) => line.endsWith(imagePath)))
  ) {
    throw new Error(
      'Local training runtime image provenance cross-process observation failed.',
    );
  }
  const cacheFileIdentities = cacheFilesBefore.map(({ report }) =>
    JSON.stringify(report));
  const regularImageIdentities = images.regularImages.map((report) =>
    JSON.stringify(report));
  const observation = {
    cacheArchitecture,
    cacheEntryCount: cacheInventoryBefore.length,
    cacheFileCount: cacheFilesBefore.length,
    cacheFileIdentitySetSha256: hashSet(cacheFileIdentities),
    childRuntimeImageCount: images.count,
    childRuntimeImageSetSha256: images.setSha256,
    crossProcessMatchedImageCount: matchedPaths.length,
    crossProcessMembershipValidated: true,
    regularRuntimeImageByteSetSha256:
      hashSet(regularImageIdentities),
    regularRuntimeImageBytesVerified: true,
    regularRuntimeImageCount: images.regularImages.length,
    schemaVersion:
      LOCAL_TRAINING_RUNTIME_IMAGE_PROVENANCE_SCHEMA_VERSION,
    sharedCacheImageCount: images.sharedCachePathHashes.length,
    sharedCacheImageIdentitySetSha256:
      hashSet(sharedCacheIdentities),
    sharedCacheImageIdentityVerified: true,
    sharedCacheUuidCount:
      new Set(sharedCacheIdentities.map((item) => item.split(':')[1]))
        .size,
    toolOutputBoundsPreserved:
      Buffer.byteLength(String(vmmapOutput || ''), 'utf8') <=
        MAX_TOOL_OUTPUT_BYTES,
    unmatchedRuntimeImageCount: 0,
    wrapperLimitsValidated: hasExpectedLimitStatus(
      parseJson(run?.status, 'wrapper status'),
    ),
  };
  return assertLocalTrainingRuntimeImageProvenance(observation);
}

function runObservedCommand({
  args,
  command,
  cwd,
  environment,
  inspectProcess,
  spawnProcess = nodeSpawn,
}) {
  return new Promise((resolve) => {
    let child;
    let inspection = null;
    let inspectionFailed = false;
    let inspectionStarted = false;
    let outputOverflow = false;
    let settled = false;
    let status = '';
    let stderr = '';
    let stdout = '';
    let timedOut = false;
    let timer;

    function append(current, chunk, limit) {
      const next = current + String(chunk);
      if (Buffer.byteLength(next, 'utf8') > limit) {
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
        inspection,
        inspectionFailed,
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
        stdio: ['ignore', 'pipe', 'pipe', 'pipe', 'pipe'],
      });
    } catch {
      resolve({
        exitCode: null,
        inspection: null,
        inspectionFailed: false,
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
    }, PROCESS_TIMEOUT_MS);
    child.stdout.on('data', (chunk) => {
      stdout = append(stdout, chunk, MAX_CHILD_OUTPUT_BYTES);
      if (inspectionStarted || !stdout.includes('\n')) {
        return;
      }
      inspectionStarted = true;
      Promise.resolve(inspectProcess(child.pid))
        .then((result) => {
          inspection = result;
          child.stdio[4].end('close\n');
        })
        .catch(() => {
          inspectionFailed = true;
          child.kill('SIGKILL');
        });
    });
    child.stderr.on('data', (chunk) => {
      stderr = append(stderr, chunk, MAX_CHILD_OUTPUT_BYTES);
    });
    child.stdio[3].on('data', (chunk) => {
      status = append(status, chunk, MAX_CHILD_OUTPUT_BYTES);
    });
    child.stdio[4].on('error', () => {
      inspectionFailed = true;
      child.kill('SIGKILL');
    });
    child.once('error', () => {
      finish({ exitCode: null, signal: null, startFailed: true });
    });
    child.once('close', (exitCode, signal) => {
      finish({ exitCode, signal, startFailed: false });
    });
  });
}

export async function probeLocalTrainingRuntimeImageProvenance({
  platform = process.platform,
  repoDir = process.cwd(),
  spawnProcess = nodeSpawn,
} = {}) {
  if (platform !== 'darwin') {
    throw new Error(
      'Local training runtime image provenance requires Darwin.',
    );
  }
  const cacheArchitecture = process.arch === 'arm64'
    ? 'arm64e'
    : process.arch;
  if (!['arm64e', 'x86_64'].includes(cacheArchitecture)) {
    throw new Error(
      'Local training runtime image provenance architecture is unsupported.',
    );
  }
  const entryPath = path.join(
    repoDir,
    'fixtures',
    'local-training-runtime-image-provenance-observer.mjs',
  );
  const wrapperPath = path.join(
    repoDir,
    'fixtures',
    'local-training-posix-limits-wrapper.py',
  );
  for (const toolPath of SYSTEM_TOOLS) {
    inspectRegularImage(toolPath, false);
  }
  inspectRegularImage(wrapperPath);
  inspectRegularImage(entryPath);
  const cacheFiles = resolveCacheFiles(cacheArchitecture);
  const cacheFilesBefore = inspectCacheFiles(cacheFiles);
  const cacheInventoryBefore = parseDyldCacheUuidInventory(
    runTool('/usr/bin/dyld_info', [
      '-arch',
      cacheArchitecture,
      '-uuid',
      '-all_dyld_cache',
    ]),
    cacheArchitecture,
  );
  const parentRegularBefore = inspectParentRegularImages();
  const invocation = buildDarwinTrainingIsolationInvocation({
    childArgs: [entryPath],
    childCommand: process.execPath,
    platform,
    wrapperPath,
  });
  const run = await runObservedCommand({
    args: invocation.args,
    command: invocation.command,
    cwd: repoDir,
    environment: invocation.environment,
    inspectProcess: (pid) => runTool('/usr/bin/vmmap', [
      '-w',
      String(pid),
    ]),
    spawnProcess,
  });
  if (
    run.startFailed ||
    run.timedOut ||
    run.outputOverflow ||
    run.inspectionFailed ||
    !run.inspection ||
    run.exitCode !== 0 ||
    run.signal !== null
  ) {
    throw new Error(
      'Local training runtime image provenance child did not close cleanly.',
    );
  }
  const parentRegularAfter = inspectParentRegularImages();
  const cacheInventoryAfter = parseDyldCacheUuidInventory(
    runTool('/usr/bin/dyld_info', [
      '-arch',
      cacheArchitecture,
      '-uuid',
      '-all_dyld_cache',
    ]),
    cacheArchitecture,
  );
  const cacheFilesAfter = inspectCacheFiles(cacheFiles);
  return validateRuntimeImageProvenance({
    cacheArchitecture,
    cacheFilesAfter,
    cacheFilesBefore,
    cacheInventoryAfter,
    cacheInventoryBefore,
    childReport: parseJson(run.stdout, 'child report'),
    parentRegularAfter,
    parentRegularBefore,
    run,
    vmmapOutput: run.inspection,
  });
}
