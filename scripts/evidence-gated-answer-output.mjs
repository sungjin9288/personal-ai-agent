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
  const descriptor = fs.openSync(
    outputPath,
    fs.constants.O_WRONLY |
      fs.constants.O_CREAT |
      (fs.constants.O_NOFOLLOW || 0),
    0o600,
  );
  try {
    const stat = fs.fstatSync(descriptor);
    if (!stat.isFile() || stat.nlink !== 1) {
      throw new Error(
        `${label} must be a single-link regular file.`,
      );
    }
    fs.fchmodSync(descriptor, 0o600);
    fs.ftruncateSync(descriptor, 0);
    fs.writeFileSync(
      descriptor,
      `${JSON.stringify(artifact, null, 2)}\n`,
      'utf8',
    );
    fs.fsyncSync(descriptor);
  } finally {
    fs.closeSync(descriptor);
  }
  return outputPath;
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
