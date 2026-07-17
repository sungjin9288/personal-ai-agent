import fs from 'node:fs';
import path from 'node:path';

export function assertPrivateActualEvaluationPaths({
  actualUserQueryData,
  errorMessage,
  paths,
  repoDir,
}) {
  if (!actualUserQueryData) {
    return;
  }

  const canonicalRepoDir = canonicalizePath(repoDir);
  const canonicalVarDir = canonicalizePath(path.join(repoDir, 'var'));
  const canonicalPaths = paths
    .filter(Boolean)
    .map(canonicalizePath);

  if (
    canonicalPaths.length !== paths.length ||
    new Set(canonicalPaths).size !== canonicalPaths.length ||
    canonicalPaths.some((filename) =>
      isPathWithin(canonicalRepoDir, filename) &&
      !isPathWithin(canonicalVarDir, filename))
  ) {
    throw new Error(errorMessage);
  }
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
