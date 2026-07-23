import fs from 'node:fs';
import path from 'node:path';

const LOCK_CONTENT = 'fine-tuning-private-collection-item-admission-lock/v1\n';

export function acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash,
  errorPrefix = 'Fine-tuning private collection item admission lock',
}) {
  if (!isSha256(workspaceHash)) {
    throw new Error(`${errorPrefix} is invalid.`);
  }

  const lockRoot = prepareLockRoot(repoDir, errorPrefix);
  assertLockHistory(lockRoot, errorPrefix);
  const filename = path.join(lockRoot, `${workspaceHash}.lock`);
  let descriptor;

  try {
    descriptor = fs.openSync(
      filename,
      fs.constants.O_WRONLY |
        fs.constants.O_CREAT |
        fs.constants.O_EXCL |
        (fs.constants.O_NOFOLLOW || 0),
      0o600,
    );
  } catch {
    throw new Error(`${errorPrefix} is already held.`);
  }

  try {
    fs.writeFileSync(descriptor, LOCK_CONTENT, 'utf8');
    fs.fsyncSync(descriptor);
    const stat = fs.fstatSync(descriptor);
    assertLockFile(stat, errorPrefix);
    fsyncDirectory(lockRoot);

    return {
      release() {
        releaseLock({
          errorPrefix,
          filename,
          initialFile: {
            dev: stat.dev,
            ino: stat.ino,
            mode: stat.mode & 0o777,
            size: stat.size,
          },
          lockRoot,
        });
      },
    };
  } catch (error) {
    if (error?.message === `${errorPrefix} is invalid.`) {
      throw error;
    }
    throw new Error(`${errorPrefix} is invalid.`);
  } finally {
    fs.closeSync(descriptor);
  }
}

function prepareLockRoot(repoDir, errorPrefix) {
  const varDirectory = path.join(repoDir, 'var');
  const fineTuningDirectory = path.join(varDirectory, 'fine-tuning');
  const lockRoot = path.join(
    fineTuningDirectory,
    'private-collection-item-admission-locks',
  );

  try {
    for (const [index, directory] of [
      varDirectory,
      fineTuningDirectory,
      lockRoot,
    ].entries()) {
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { mode: 0o700 });
        fs.chmodSync(directory, 0o700);
      }
      assertOwnerOnlyDirectory(directory, {
        allowGroupRead: index === 0,
        errorPrefix,
      });
    }
    const canonicalRoot = fs.realpathSync(lockRoot);
    if (!isPathWithin(varDirectory, canonicalRoot)) {
      throw new Error();
    }
    return canonicalRoot;
  } catch {
    throw new Error(`${errorPrefix} is invalid.`);
  }
}

function assertLockHistory(lockRoot, errorPrefix) {
  let names;
  try {
    names = fs.readdirSync(lockRoot);
  } catch {
    throw new Error(`${errorPrefix} history is invalid.`);
  }

  for (const name of names) {
    if (!/^[a-f0-9]{64}\.lock$/u.test(name)) {
      throw new Error(`${errorPrefix} history is invalid.`);
    }
    try {
      assertLockFile(fs.lstatSync(path.join(lockRoot, name)), errorPrefix);
    } catch {
      throw new Error(`${errorPrefix} history is invalid.`);
    }
  }
}

function releaseLock(lock) {
  let current;
  try {
    current = fs.lstatSync(lock.filename);
    assertLockFile(current, lock.errorPrefix);
  } catch {
    throw new Error(`${lock.errorPrefix} release failed.`);
  }

  const initial = lock.initialFile;
  if (
    current.dev !== initial.dev ||
    current.ino !== initial.ino ||
    (current.mode & 0o777) !== initial.mode ||
    current.size !== initial.size
  ) {
    throw new Error(`${lock.errorPrefix} release failed.`);
  }

  const releasingFilename = lock.filename.replace(/\.lock$/u, '.releasing');
  try {
    if (fs.existsSync(releasingFilename)) {
      throw new Error();
    }
    fs.renameSync(lock.filename, releasingFilename);
    fsyncDirectory(lock.lockRoot);
    fs.unlinkSync(releasingFilename);
  } catch {
    throw new Error(`${lock.errorPrefix} release failed.`);
  }
}

function assertLockFile(stat, errorPrefix) {
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.nlink !== 1 ||
    stat.size <= 0 ||
    stat.size > 256 ||
    (stat.mode & 0o077) !== 0 ||
    !isCurrentUserOwned(stat)
  ) {
    throw new Error(`${errorPrefix} is invalid.`);
  }
}

function assertOwnerOnlyDirectory(directory, { allowGroupRead, errorPrefix }) {
  const stat = fs.lstatSync(directory);
  const forbiddenMode = allowGroupRead ? 0o022 : 0o077;
  if (
    !stat.isDirectory() ||
    stat.isSymbolicLink() ||
    !isCurrentUserOwned(stat) ||
    (stat.mode & forbiddenMode) !== 0
  ) {
    throw new Error(`${errorPrefix} is invalid.`);
  }
}

function fsyncDirectory(directory) {
  const descriptor = fs.openSync(directory, fs.constants.O_RDONLY);
  try {
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
}

function isCurrentUserOwned(stat) {
  return typeof process.getuid !== 'function' || stat.uid === process.getuid();
}

function isPathWithin(directory, candidate) {
  const relative = path.relative(directory, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}
