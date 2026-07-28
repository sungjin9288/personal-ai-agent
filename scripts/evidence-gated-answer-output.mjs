import fs from 'node:fs';
import path from 'node:path';

export function resolveEvidenceOutputPath({
  defaultRelativePath,
  label,
  repoDir,
  value,
} = {}) {
  const repositoryPath = path.resolve(requiredText(repoDir, 'repository'));
  const repositoryRealPath = fs.realpathSync(repositoryPath);
  const requestedPath = String(value || '').trim();
  const fallbackPath = requiredText(defaultRelativePath, 'default output');
  const outputPath = path.resolve(
    repositoryPath,
    requestedPath || fallbackPath,
  );
  const outputLabel = requiredText(label, 'output label');

  if (!isDescendant(outputPath, repositoryPath)) {
    throw new Error(`${outputLabel} must stay inside the repository.`);
  }

  const parentPath = path.dirname(outputPath);
  assertDirectoryChain({
    parentPath,
    repositoryPath,
    outputLabel,
  });
  const parentRealPath = fs.realpathSync(parentPath);
  if (
    parentRealPath !== repositoryRealPath &&
    !isDescendant(parentRealPath, repositoryRealPath)
  ) {
    throw new Error(`${outputLabel} parent escapes the repository.`);
  }

  if (fs.existsSync(outputPath)) {
    const output = fs.lstatSync(outputPath);
    if (output.isSymbolicLink() || !output.isFile()) {
      throw new Error(`${outputLabel} must be a regular file.`);
    }
  }

  return outputPath;
}

export function writeEvidenceJson({
  defaultRelativePath,
  label,
  repoDir,
  value,
  artifact,
} = {}) {
  const outputPath = resolveEvidenceOutputPath({
    defaultRelativePath,
    label,
    repoDir,
    value,
  });
  const repositoryPath = path.resolve(requiredText(repoDir, 'repository'));
  const repositoryRealPath = fs.realpathSync(repositoryPath);
  const storageOutputPath = path.join(
    repositoryRealPath,
    path.relative(repositoryPath, outputPath),
  );
  const parentPath = path.dirname(storageOutputPath);
  const directoryCheckpoint = captureDirectoryCheckpoint({
    parentPath,
    repositoryPath: repositoryRealPath,
    outputLabel: requiredText(label, 'output label'),
  });
  const destinationCheckpoint = captureDestinationCheckpoint(storageOutputPath, label);
  let expectedBytes;
  let parentDescriptor;
  let tempPath;
  let tempCheckpoint;
  let renamed = false;

  try {
    parentDescriptor = openParentDirectory(parentPath);
    assertDirectoryCheckpoint({
      checkpoint: directoryCheckpoint,
      parentDescriptor,
    });
    recoverSafeOrphanTemps({ parentPath, outputPath: storageOutputPath });
    assertDirectoryCheckpoint({
      checkpoint: directoryCheckpoint,
      parentDescriptor,
    });

    const temp = createExclusiveTemp({ parentPath, outputPath: storageOutputPath });
    tempPath = temp.path;
    const descriptor = temp.descriptor;
    try {
      tempCheckpoint = fileIdentity(fs.fstatSync(descriptor));
      fs.fchmodSync(descriptor, 0o600);
      const serializedArtifact = `${JSON.stringify(artifact, null, 2)}\n`;
      expectedBytes = Buffer.byteLength(serializedArtifact, 'utf8');
      writeAll(descriptor, serializedArtifact);
      fs.fsyncSync(descriptor);
      assertTempFile({
        descriptor,
        expectedBytes,
      });
    } finally {
      fs.closeSync(descriptor);
    }

    assertDirectoryCheckpoint({
      checkpoint: directoryCheckpoint,
      parentDescriptor,
    });
    assertDestinationCheckpoint({
      checkpoint: destinationCheckpoint,
      outputPath: storageOutputPath,
      outputLabel: label,
    });
    assertTempPath({ expectedBytes, tempCheckpoint, tempPath });
    fs.renameSync(tempPath, storageOutputPath);
    renamed = true;
    tempPath = undefined;

    assertFinalFile({
      expectedBytes,
      outputLabel: label,
      outputPath: storageOutputPath,
      tempCheckpoint,
    });
    fs.fsyncSync(parentDescriptor);
  } finally {
    if (parentDescriptor !== undefined) {
      fs.closeSync(parentDescriptor);
    }
    if (!renamed && tempPath && tempCheckpoint) {
      removeSafeWriterTemp({
        checkpoint: directoryCheckpoint,
        tempCheckpoint,
        tempPath,
      });
    }
  }
  return outputPath;
}

const TEMP_MARKER = '.evidence-gated-answer-output-';

function captureDirectoryCheckpoint({ parentPath, repositoryPath, outputLabel }) {
  const paths = [repositoryPath];
  const relativeParent = path.relative(repositoryPath, parentPath);
  let currentPath = repositoryPath;
  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment);
    paths.push(currentPath);
  }

  return paths.map((currentPath) => {
    const stat = fs.lstatSync(currentPath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`${outputLabel} parent must be a real repository directory.`);
    }
    return { dev: stat.dev, ino: stat.ino, path: currentPath };
  });
}

function openParentDirectory(parentPath) {
  return fs.openSync(
    parentPath,
    fs.constants.O_RDONLY |
      (fs.constants.O_DIRECTORY || 0) |
      (fs.constants.O_NOFOLLOW || 0),
  );
}

function assertDirectoryCheckpoint({ checkpoint, parentDescriptor }) {
  for (const expected of checkpoint) {
    const current = fs.lstatSync(expected.path);
    if (
      current.isSymbolicLink() ||
      !current.isDirectory() ||
      current.dev !== expected.dev ||
      current.ino !== expected.ino
    ) {
      throw new Error('Evidence output parent changed during write.');
    }
  }
  const parent = fs.fstatSync(parentDescriptor);
  const expectedParent = checkpoint.at(-1);
  if (
    !parent.isDirectory() ||
    parent.dev !== expectedParent.dev ||
    parent.ino !== expectedParent.ino
  ) {
    throw new Error('Evidence output parent changed during write.');
  }
}

function captureDestinationCheckpoint(outputPath, outputLabel) {
  if (!fs.existsSync(outputPath)) {
    return null;
  }
  const stat = fs.lstatSync(outputPath);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${outputLabel} must be a regular file.`);
  }
  if (stat.nlink !== 1) {
    throw new Error(`${outputLabel} must be a single-link regular file.`);
  }
  return { dev: stat.dev, ino: stat.ino };
}

function assertDestinationCheckpoint({ checkpoint, outputPath, outputLabel }) {
  if (checkpoint === null) {
    if (fs.existsSync(outputPath)) {
      throw new Error(`${outputLabel} changed before replacement.`);
    }
    return;
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error(`${outputLabel} changed before replacement.`);
  }
  const current = fs.lstatSync(outputPath);
  if (
    current.isSymbolicLink() ||
    !current.isFile() ||
    current.nlink !== 1 ||
    current.dev !== checkpoint.dev ||
    current.ino !== checkpoint.ino
  ) {
    throw new Error(`${outputLabel} changed before replacement.`);
  }
}

function createExclusiveTemp({ parentPath, outputPath }) {
  const name = `${path.basename(outputPath)}${TEMP_MARKER}${process.pid}-${randomSuffix()}`;
  const tempPath = path.join(parentPath, name);
  const descriptor = fs.openSync(
    tempPath,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      fs.constants.O_EXCL |
      (fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  return { descriptor, path: tempPath };
}

function randomSuffix() {
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2)}`;
}

function writeAll(descriptor, value) {
  const bytes = Buffer.from(value, 'utf8');
  let offset = 0;
  while (offset < bytes.length) {
    const written = fs.writeSync(descriptor, bytes, offset, bytes.length - offset);
    if (!Number.isInteger(written) || written <= 0) {
      throw new Error('Evidence output write did not make progress.');
    }
    offset += written;
  }
}

function assertTempFile({ descriptor, expectedBytes }) {
  const stat = fs.fstatSync(descriptor);
  if (
    !stat.isFile() ||
    stat.nlink !== 1 ||
    stat.size !== expectedBytes ||
    (stat.mode & 0o777) !== 0o600
  ) {
    throw new Error('Evidence output temporary file verification failed.');
  }
}

function fileIdentity(stat) {
  return { dev: stat.dev, ino: stat.ino };
}

function assertFinalFile({ expectedBytes, outputLabel, outputPath, tempCheckpoint }) {
  const stat = fs.lstatSync(outputPath);
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    stat.nlink !== 1 ||
    stat.size !== expectedBytes ||
    (stat.mode & 0o777) !== 0o600 ||
    stat.dev !== tempCheckpoint.dev ||
    stat.ino !== tempCheckpoint.ino
  ) {
    throw new Error(`${outputLabel} final file verification failed.`);
  }
}

function assertTempPath({ expectedBytes, tempCheckpoint, tempPath }) {
  const stat = fs.lstatSync(tempPath);
  if (
    stat.isSymbolicLink() ||
    !stat.isFile() ||
    stat.nlink !== 1 ||
    stat.size !== expectedBytes ||
    (stat.mode & 0o777) !== 0o600 ||
    stat.dev !== tempCheckpoint.dev ||
    stat.ino !== tempCheckpoint.ino
  ) {
    throw new Error('Evidence output temporary file verification failed.');
  }
}

function recoverSafeOrphanTemps({ parentPath, outputPath }) {
  const pattern = tempPattern(outputPath);
  for (const name of fs.readdirSync(parentPath)) {
    const match = pattern.exec(name);
    if (!match || processIsLive(Number(match[1]))) {
      continue;
    }
    const tempPath = path.join(parentPath, name);
    const stat = safeLstat(tempPath);
    if (!isSafeOrphan(stat)) {
      throw new Error('Evidence output orphan temp is not safe to remove.');
    }
    fs.unlinkSync(tempPath);
  }
}

function removeSafeWriterTemp({ checkpoint, tempCheckpoint, tempPath }) {
  try {
    const expectedParent = checkpoint.at(-1);
    const currentParent = fs.lstatSync(expectedParent.path);
    if (
      currentParent.isSymbolicLink() ||
      !currentParent.isDirectory() ||
      currentParent.dev !== expectedParent.dev ||
      currentParent.ino !== expectedParent.ino
    ) {
      return;
    }
    const stat = safeLstat(tempPath);
    if (
      !stat ||
      !stat.isFile() ||
      stat.nlink !== 1 ||
      stat.uid !== process.getuid() ||
      (stat.mode & 0o777) !== 0o600 ||
      stat.dev !== tempCheckpoint.dev ||
      stat.ino !== tempCheckpoint.ino
    ) {
      return;
    }
    fs.unlinkSync(tempPath);
  } catch {
    // A failed cleanup must not replace the original write error.
  }
}

function tempPattern(outputPath) {
  return new RegExp(
    `^${escapeRegExp(path.basename(outputPath))}${escapeRegExp(TEMP_MARKER)}(\\d+)-[a-z0-9-]+$`,
  );
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function safeLstat(filename) {
  try {
    return fs.lstatSync(filename);
  } catch {
    return null;
  }
}

function isSafeOrphan(stat) {
  return Boolean(
    stat &&
    stat.isFile() &&
    stat.nlink === 1 &&
    stat.uid === process.getuid() &&
    (stat.mode & 0o777) === 0o600,
  );
}

function processIsLive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) {
    return true;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

function assertDirectoryChain({
  parentPath,
  repositoryPath,
  outputLabel,
}) {
  const relativeParent = path.relative(repositoryPath, parentPath);
  let currentPath = repositoryPath;
  for (const segment of relativeParent.split(path.sep).filter(Boolean)) {
    currentPath = path.join(currentPath, segment);
    if (!fs.existsSync(currentPath)) {
      throw new Error(`${outputLabel} parent must already exist.`);
    }
    const current = fs.lstatSync(currentPath);
    if (current.isSymbolicLink() || !current.isDirectory()) {
      throw new Error(
        `${outputLabel} parent must be a real repository directory.`,
      );
    }
  }
}

function isDescendant(candidatePath, parentPath) {
  return (
    candidatePath !== parentPath &&
    candidatePath.startsWith(`${parentPath}${path.sep}`)
  );
}

function requiredText(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new Error(`Evidence output ${label} is required.`);
  }
  return normalized;
}
