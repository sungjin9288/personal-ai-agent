import fs from 'node:fs';
import path from 'node:path';

const MAX_JSON_BYTES = 64 * 1024;

export function readPrivateJsonState(
  filename,
  label,
  {
    allowedRoot,
    expectedMode = 0o600,
    repoDir,
  } = {},
) {
  const input = validatePrivateFilename(filename, label, {
    allowedRoot: allowedRoot || path.join(repoDir, 'var'),
    expectedMode,
    repoDir,
  });
  let descriptor;
  try {
    descriptor = fs.openSync(
      input.canonicalFilename,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
    );
    const before = fs.fstatSync(descriptor);
    assertPrivateFile(before, label, { expectedMode });
    if (
      !sameFile(before, input.initialFile) ||
      fs.realpathSync(input.filename) !== input.canonicalFilename
    ) {
      throw new Error();
    }

    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    const finalFile = fs.lstatSync(input.filename);
    assertNoSymlinkAncestors(input.filename, repoDir);
    assertNoSymlinkAncestors(input.canonicalFilename, repoDir);
    if (
      !sameFile(before, after) ||
      !sameFile(before, finalFile) ||
      bytes.length !== before.size ||
      fs.realpathSync(input.filename) !== input.canonicalFilename
    ) {
      throw new Error();
    }
    return {
      ...input,
      bytes,
      value: JSON.parse(bytes.toString('utf8')),
    };
  } catch {
    throw new Error(`${label} must be a current-owner 0600 bounded regular JSON file.`);
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
  }
}

export function assertSamePrivateJsonState(before, after, label) {
  if (
    !after ||
    before.canonicalFilename !== after.canonicalFilename ||
    !sameFile(before.initialFile, after.initialFile) ||
    !before.bytes.equals(after.bytes)
  ) {
    throw new Error(`${label} changed while resolving.`);
  }
}

export function assertCanonicalPrivateJsonState(state, expectedFilename, label) {
  if (state.canonicalFilename !== expectedFilename) {
    throw new Error(`${label} must use its exact canonical location.`);
  }
}

export function ensurePrivateDirectoryChain(directory, label, { repoDir }) {
  const varDirectory = path.join(repoDir, 'var');
  if (!isPathWithin(varDirectory, directory)) {
    throw new Error(`${label} must stay under the repository private state root.`);
  }

  if (!fs.lstatSync(varDirectory, { throwIfNoEntry: false })) {
    fs.mkdirSync(varDirectory, { mode: 0o700 });
    fs.chmodSync(varDirectory, 0o700);
    fsyncDirectory(path.dirname(varDirectory));
  }
  assertPrivateDirectory(varDirectory, label, { allowGroupRead: true, repoDir });

  let current = varDirectory;
  for (const part of path.relative(varDirectory, directory).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (!fs.lstatSync(current, { throwIfNoEntry: false })) {
      fs.mkdirSync(current, { mode: 0o700 });
      fs.chmodSync(current, 0o700);
      fsyncDirectory(path.dirname(current));
    }
    assertPrivateDirectory(current, label, { repoDir });
  }
  return fs.realpathSync(directory);
}

export function makePrivateDirectory(directory, label, { repoDir }) {
  const varDirectory = path.join(repoDir, 'var');
  if (!isPathWithin(varDirectory, directory)) {
    throw new Error(`${label} must stay under the repository private state root.`);
  }
  try {
    assertNoSymlinkAncestors(path.dirname(directory), repoDir);
    fs.mkdirSync(directory, { mode: 0o700 });
    fs.chmodSync(directory, 0o700);
    assertPrivateDirectory(directory, label, { repoDir });
    fsyncDirectory(path.dirname(directory));
  } catch {
    throw new Error(`${label} must be a new current-owner 0700 directory.`);
  }
}

export function readPrivateDirectory(directory, label, { repoDir }) {
  assertPrivateDirectory(directory, label, { repoDir });
  try {
    return fs.readdirSync(directory).sort();
  } catch {
    throw new Error(`${label} is invalid.`);
  }
}

export function assertPrivateDirectory(
  directory,
  label,
  { allowGroupRead = false, repoDir } = {},
) {
  try {
    if (repoDir) {
      const varDirectory = path.join(repoDir, 'var');
      if (!isPathWithin(varDirectory, directory)) {
        throw new Error();
      }
      assertNoSymlinkAncestors(directory, repoDir);
    }
    const stat = fs.lstatSync(directory);
    const forbiddenMode = allowGroupRead ? 0o022 : 0o077;
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      !isCurrentOwner(stat) ||
      (stat.mode & forbiddenMode) !== 0
    ) {
      throw new Error();
    }
    if (!allowGroupRead && (stat.mode & 0o777) !== 0o700) {
      throw new Error();
    }
    if (fs.realpathSync(directory) !== directory) {
      throw new Error();
    }
  } catch {
    throw new Error(`${label} must be a current-owner 0700 directory.`);
  }
}

export function writeExclusivePrivateJson(filename, value, label, { repoDir }) {
  const varDirectory = path.join(repoDir, 'var');
  if (!isPathWithin(varDirectory, filename)) {
    throw new Error(`${label} must stay under the repository private state root.`);
  }
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
  if (bytes.length === 0 || bytes.length > MAX_JSON_BYTES) {
    throw new Error(`${label} exceeds the private JSON size boundary.`);
  }

  let descriptor;
  try {
    assertPrivateDirectory(path.dirname(filename), label, { repoDir });
    descriptor = fs.openSync(
      filename,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        (fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    const stat = fs.fstatSync(descriptor);
    assertPrivateFile(stat, label);
    if (stat.size !== bytes.length) {
      throw new Error();
    }
  } catch {
    throw new Error(`${label} could not be written as exclusive current-owner 0600 JSON.`);
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
  }
}

export function fsyncPrivateDirectory(directory, label, { repoDir }) {
  assertPrivateDirectory(directory, label, {
    allowGroupRead: directory === path.join(repoDir, 'var'),
    repoDir,
  });
  fsyncDirectory(directory);
}

function validatePrivateFilename(filename, label, {
  allowedRoot,
  expectedMode,
  repoDir,
}) {
  const resolvedFilename = path.resolve(repoDir, filename);
  const root = path.resolve(repoDir, allowedRoot);
  try {
    if (!isPathWithin(repoDir, root) || !isPathWithin(root, resolvedFilename)) {
      throw new Error();
    }
    assertNoSymlinkAncestors(root, repoDir);
    const initialFile = fs.lstatSync(resolvedFilename);
    assertPrivateFile(initialFile, label, { expectedMode });
    assertNoSymlinkAncestors(resolvedFilename, repoDir);
    const canonicalFilename = fs.realpathSync(resolvedFilename);
    if (
      initialFile.isSymbolicLink() ||
      !sameFile(initialFile, fs.statSync(canonicalFilename))
    ) {
      throw new Error();
    }
    if (!isPathWithin(root, canonicalFilename)) {
      throw new Error();
    }
    assertNoSymlinkAncestors(canonicalFilename, repoDir);
    return {
      canonicalFilename,
      filename: resolvedFilename,
      initialFile,
      repoDir,
    };
  } catch {
    throw new Error(`${label} must be a current-owner 0600 bounded regular JSON file.`);
  }
}

function assertNoSymlinkAncestors(filename, repoDir) {
  const root = isPathWithin(repoDir, filename) ? repoDir : path.parse(filename).root;
  let current = root;
  if (fs.lstatSync(current).isSymbolicLink()) {
    throw new Error();
  }
  for (const part of path.relative(root, filename).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) {
      throw new Error();
    }
  }
}

function assertPrivateFile(stat, label, { expectedMode = 0o600 } = {}) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES ||
    !isCurrentOwner(stat) ||
    (stat.mode & 0o777) !== expectedMode
  ) {
    throw new Error(`${label} must be a current-owner 0600 bounded regular JSON file.`);
  }
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.nlink === right.nlink &&
    left.uid === right.uid &&
    (left.mode & 0o777) === (right.mode & 0o777)
  );
}

function isCurrentOwner(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}

function isPathWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== '..' &&
      !path.isAbsolute(relative))
  );
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}
