import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

export function assertPrivateActualEvaluationPaths({
  actualUserQueryData,
  errorMessage,
  paths,
  repoDir,
}) {
  if (!actualUserQueryData) {
    return paths.map(() => null);
  }

  const canonicalRepoDir = canonicalizePath(repoDir);
  const canonicalVarDir = canonicalizePath(path.join(repoDir, 'var'));
  const canonicalPaths = paths.map((filename) =>
    filename ? canonicalizePath(filename) : null);
  const presentPaths = canonicalPaths.filter(Boolean);

  if (
    new Set(presentPaths).size !== presentPaths.length ||
    presentPaths.some((filename) =>
      isPathWithin(canonicalRepoDir, filename) &&
      !isPathWithin(canonicalVarDir, filename))
  ) {
    throw new Error(errorMessage);
  }
  return canonicalPaths;
}

export function isPathWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' ||
    (
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    );
}

export function readBoundedEvaluationJson({
  errorMessage,
  filename,
  label,
  maxBytes,
}) {
  const resolved = path.resolve(String(filename || ''));
  const stat = fs.lstatSync(resolved);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size <= 0 ||
    stat.size > maxBytes
  ) {
    throw new Error(
      errorMessage ||
        `Local user query evaluation ${label} must be a bounded regular file.`,
    );
  }
  const content = fs.readFileSync(resolved, 'utf8');
  return {
    content,
    filename: resolved,
    label,
    maxBytes,
    stat,
    value: JSON.parse(content),
  };
}

export function assertOwnerOnlyActualEvaluationInputs({
  actualUserQueryData,
  inputs,
}) {
  if (!actualUserQueryData) {
    return inputs;
  }
  const ownerUserId = currentUserId();
  return inputs.map((input) =>
    readOwnerOnlyActualEvaluationInput(input, ownerUserId));
}

export function writeEvaluationJson({
  actualUserQueryData,
  authorizedPath,
  filename,
  outputErrorMessage =
    'Local user query evaluation output must be a regular file.',
  value,
}) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  if (!actualUserQueryData) {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    const existing = fs.existsSync(filename) ? fs.lstatSync(filename) : null;
    if (existing?.isSymbolicLink() || (existing && !existing.isFile())) {
      throw new Error(outputErrorMessage);
    }
    fs.writeFileSync(filename, content, 'utf8');
    return;
  }

  const ownerUserId = currentUserId();
  assertAuthorizedActualOutput(filename, authorizedPath);
  const directory = path.dirname(filename);
  fs.mkdirSync(directory, {
    mode: PRIVATE_DIRECTORY_MODE,
    recursive: true,
  });
  const directoryIdentity = hardenOwnerOnlyDirectory(
    directory,
    ownerUserId,
  );
  assertAuthorizedActualOutput(filename, authorizedPath);
  assertSafeExistingOutput(filename, ownerUserId);

  const temporaryPath = path.join(
    directory,
    `.${path.basename(filename)}.${randomUUID()}.tmp`,
  );
  const noFollow = requireNoFollowSupport();
  const descriptor = fs.openSync(
    temporaryPath,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      noFollow,
    PRIVATE_FILE_MODE,
  );
  let temporaryExists = true;
  try {
    fs.writeFileSync(descriptor, content, 'utf8');
    fs.fchmodSync(descriptor, PRIVATE_FILE_MODE);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    assertDirectoryIdentity(directory, directoryIdentity, ownerUserId);
    assertAuthorizedActualOutput(filename, authorizedPath);
    fs.renameSync(temporaryPath, filename);
    temporaryExists = false;
    syncDirectory(directory, directoryIdentity, ownerUserId);
  } catch (error) {
    try {
      fs.closeSync(descriptor);
    } catch {
      // The descriptor was already closed after a complete write.
    }
    throw error;
  } finally {
    if (temporaryExists) {
      fs.rmSync(temporaryPath, { force: true });
    }
  }
  assertOwnerOnlyFile(filename, ownerUserId);
}

function readOwnerOnlyActualEvaluationInput(input, ownerUserId) {
  const noFollow = requireNoFollowSupport();
  const descriptor = fs.openSync(
    input.filename,
    fs.constants.O_RDONLY | noFollow,
  );
  try {
    const opened = fs.fstatSync(descriptor);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      opened.dev !== input.stat.dev ||
      opened.ino !== input.stat.ino ||
      opened.size !== input.stat.size ||
      opened.size <= 0 ||
      opened.size > input.maxBytes ||
      opened.uid !== ownerUserId ||
      !hasExactPermissions(opened, PRIVATE_FILE_MODE)
    ) {
      throw new Error(
        'Actual user query evaluation inputs must be owner-only regular files.',
      );
    }
    assertOwnerOnlyDirectory(path.dirname(input.filename), ownerUserId);
    const content = fs.readFileSync(descriptor, 'utf8');
    if (content !== input.content) {
      throw new Error(
        `Local user query evaluation ${input.label} changed before reading.`,
      );
    }
    return {
      ...input,
      content,
      stat: opened,
      value: JSON.parse(content),
    };
  } finally {
    fs.closeSync(descriptor);
  }
}

function assertAuthorizedActualOutput(filename, authorizedPath) {
  if (
    !authorizedPath ||
    canonicalizePath(filename) !== authorizedPath
  ) {
    throw new Error(
      'Actual user query evaluation output moved outside its authorized private path.',
    );
  }
}

function canonicalizePath(filename) {
  const unresolvedSegments = [];
  let existingPath = path.resolve(filename);

  while (!fs.existsSync(existingPath)) {
    const parent = path.dirname(existingPath);
    if (parent === existingPath) {
      break;
    }
    unresolvedSegments.unshift(path.basename(existingPath));
    existingPath = parent;
  }

  return path.resolve(fs.realpathSync(existingPath), ...unresolvedSegments);
}

function currentUserId() {
  if (typeof process.getuid !== 'function') {
    throw new Error(
      'Actual user query evaluation requires operating-system file ownership checks.',
    );
  }
  return process.getuid();
}

function requireNoFollowSupport() {
  if (!Number.isInteger(fs.constants.O_NOFOLLOW)) {
    throw new Error(
      'Actual user query evaluation requires no-follow file access.',
    );
  }
  return fs.constants.O_NOFOLLOW;
}

function hasExactPermissions(stat, mode) {
  return (stat.mode & 0o777) === mode;
}

function assertOwnerOnlyDirectory(directory, ownerUserId) {
  const stat = fs.lstatSync(directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== ownerUserId ||
    !hasExactPermissions(stat, PRIVATE_DIRECTORY_MODE)
  ) {
    throw new Error(
      'Actual user query evaluation directories must be owner-only.',
    );
  }
}

function hardenOwnerOnlyDirectory(directory, ownerUserId) {
  const before = fs.lstatSync(directory);
  if (
    !before.isDirectory() ||
    before.isSymbolicLink() ||
    before.uid !== ownerUserId
  ) {
    throw new Error(
      'Actual user query evaluation output directory is unsafe.',
    );
  }
  const directoryOnly = fs.constants.O_DIRECTORY;
  if (!Number.isInteger(directoryOnly)) {
    throw new Error(
      'Actual user query evaluation requires directory descriptor checks.',
    );
  }
  const descriptor = fs.openSync(
    directory,
    fs.constants.O_RDONLY |
      requireNoFollowSupport() |
      directoryOnly,
  );
  try {
    const opened = fs.fstatSync(descriptor);
    if (
      !opened.isDirectory() ||
      opened.uid !== ownerUserId ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino
    ) {
      throw new Error(
        'Actual user query evaluation output directory changed before writing.',
      );
    }
    fs.fchmodSync(descriptor, PRIVATE_DIRECTORY_MODE);
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  assertOwnerOnlyDirectory(directory, ownerUserId);
  return {
    dev: before.dev,
    ino: before.ino,
  };
}

function assertSafeExistingOutput(filename, ownerUserId) {
  if (!fs.existsSync(filename)) {
    return;
  }
  assertOwnerOnlyFile(filename, ownerUserId);
}

function assertOwnerOnlyFile(filename, ownerUserId) {
  const stat = fs.lstatSync(filename);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.uid !== ownerUserId ||
    !hasExactPermissions(stat, PRIVATE_FILE_MODE)
  ) {
    throw new Error(
      'Actual user query evaluation output must be an owner-only regular file.',
    );
  }
}

function assertDirectoryIdentity(directory, identity, ownerUserId) {
  const stat = fs.lstatSync(directory);
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    stat.uid !== ownerUserId ||
    !hasExactPermissions(stat, PRIVATE_DIRECTORY_MODE) ||
    stat.dev !== identity.dev ||
    stat.ino !== identity.ino
  ) {
    throw new Error(
      'Actual user query evaluation output directory changed before commit.',
    );
  }
}

function syncDirectory(directory, identity, ownerUserId) {
  const descriptor = fs.openSync(
    directory,
    fs.constants.O_RDONLY |
      requireNoFollowSupport() |
      fs.constants.O_DIRECTORY,
  );
  try {
    const opened = fs.fstatSync(descriptor);
    if (
      !opened.isDirectory() ||
      opened.uid !== ownerUserId ||
      opened.dev !== identity.dev ||
      opened.ino !== identity.ino
    ) {
      throw new Error(
        'Actual user query evaluation output directory changed before sync.',
      );
    }
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}
