import fs from 'node:fs';
import path from 'node:path';

import { resolveWithinRoot } from './path-guard.mjs';

const SNAPSHOT_PATH_PREFIX = 'docs/releases/execution-v1/';

function normalizeRepoRelativePath(filePath = '') {
  return String(filePath || '').replace(/\\/g, '/').replace(/^\.\//, '').trim();
}

function isSafeRepoRelativePath(filePath = '') {
  const segments = filePath.split('/');
  return Boolean(filePath)
    && !path.posix.isAbsolute(filePath)
    && segments.every((segment) => segment && segment !== '.' && segment !== '..');
}

function isSnapshotPath(filePath = '') {
  return filePath.startsWith(SNAPSHOT_PATH_PREFIX)
    && filePath.length > SNAPSHOT_PATH_PREFIX.length;
}

export function createExecutionV1ReleaseArtifactResolver({
  evidenceDocPaths = [],
  handoffArtifactSpecs = [],
  mutableArtifactPaths = [],
  rootDir,
}) {
  const allowedEvidenceDocPaths = new Set(evidenceDocPaths);
  const allowedMutableArtifactPaths = new Set(mutableArtifactPaths);

  function isReleaseArtifactPath(filePath = '') {
    const relativePath = normalizeRepoRelativePath(filePath);
    if (!isSafeRepoRelativePath(relativePath)) {
      return false;
    }
    return allowedMutableArtifactPaths.has(relativePath) || isSnapshotPath(relativePath);
  }

  function isReleaseEvidenceDocPath(filePath = '') {
    const relativePath = normalizeRepoRelativePath(filePath);
    if (!isSafeRepoRelativePath(relativePath)) {
      return false;
    }
    return allowedEvidenceDocPaths.has(relativePath) || isSnapshotPath(relativePath);
  }

  function resolveHandoffArtifact(artifactId) {
    const entry = handoffArtifactSpecs.find((item) => item.id === artifactId);
    if (!entry) {
      return null;
    }

    const artifactPath = resolveWithinRoot(rootDir, entry.path);
    if (!artifactPath || !fs.existsSync(artifactPath) || fs.statSync(artifactPath).isDirectory()) {
      return null;
    }

    return {
      artifactPath,
      entry,
    };
  }

  function resolveEvidenceDoc(filePath = '') {
    const relativePath = normalizeRepoRelativePath(filePath);
    if (!isReleaseEvidenceDocPath(relativePath)) {
      return null;
    }

    const docsRoot = path.resolve(rootDir, 'docs');
    const resolvedPath = resolveWithinRoot(docsRoot, path.resolve(rootDir, relativePath));
    if (!resolvedPath || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      return null;
    }

    return {
      path: resolvedPath,
      relativePath,
    };
  }

  return {
    isReleaseArtifactPath,
    isReleaseEvidenceDocPath,
    normalizePath: normalizeRepoRelativePath,
    resolveEvidenceDoc,
    resolveHandoffArtifact,
  };
}
