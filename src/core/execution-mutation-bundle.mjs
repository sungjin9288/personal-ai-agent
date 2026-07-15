import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildMutationBatchSummary,
  buildNextEditContent,
  buildRollbackPreview,
  countTextLines,
  hashTextContent,
} from './execution-mutation.mjs';

const DEFAULT_MAX_DIRECTORY_BYTES = 1_000_000;
const DEFAULT_MAX_DIRECTORY_ENTRIES = 300;
const DEFAULT_MAX_DIRECTORY_FILES = 200;

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export function createExecutionMutationBundleBuilder({
  isPathInsideCandidateRoot,
  isPathInsideRoot,
  isSecretLikePath,
  maxDirectoryBytes = DEFAULT_MAX_DIRECTORY_BYTES,
  maxDirectoryEntries = DEFAULT_MAX_DIRECTORY_ENTRIES,
  maxDirectoryFiles = DEFAULT_MAX_DIRECTORY_FILES,
}) {
  function collectDirectoryMoveState(directoryPath) {
    const rootPath = path.resolve(directoryPath);
    const digestEntries = [];
    let directoryCount = 0;
    let fileCount = 0;
    let totalBytes = 0;

    function walk(currentPath) {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name));

      for (const entry of entries) {
        const childPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootPath, childPath).replaceAll(path.sep, '/');

        if (isSecretLikePath(relativePath)) {
          throw new Error(`directory-move source contains a secret-like descendant: ${relativePath}`);
        }
        if (entry.isSymbolicLink()) {
          throw new Error(`directory-move source contains a symbolic link: ${relativePath}`);
        }
        if (entry.isDirectory()) {
          directoryCount += 1;
          digestEntries.push({
            bytes: 0,
            kind: 'directory',
            relativePath,
            sha256: '',
          });
          if (digestEntries.length > maxDirectoryEntries) {
            throw new Error(`directory-move source entry count exceeds ${maxDirectoryEntries}`);
          }
          walk(childPath);
          continue;
        }
        if (!entry.isFile()) {
          throw new Error(`directory-move source contains a non-regular file: ${relativePath}`);
        }

        const content = fs.readFileSync(childPath);
        const bytes = content.byteLength;
        fileCount += 1;
        totalBytes += bytes;
        digestEntries.push({
          bytes,
          kind: 'file',
          relativePath,
          sha256: crypto.createHash('sha256').update(content).digest('hex'),
        });

        if (fileCount > maxDirectoryFiles) {
          throw new Error(`directory-move source file count exceeds ${maxDirectoryFiles}`);
        }
        if (digestEntries.length > maxDirectoryEntries) {
          throw new Error(`directory-move source entry count exceeds ${maxDirectoryEntries}`);
        }
        if (totalBytes > maxDirectoryBytes) {
          throw new Error(`directory-move source byte size exceeds ${maxDirectoryBytes}`);
        }
      }
    }

    walk(rootPath);

    const digest = crypto.createHash('sha256');
    for (const entry of digestEntries) {
      digest.update(entry.kind);
      digest.update('\0');
      digest.update(entry.relativePath);
      digest.update('\0');
      digest.update(String(entry.bytes));
      digest.update('\0');
      digest.update(entry.sha256);
      digest.update('\n');
    }

    return {
      bytes: totalBytes,
      content: '',
      directoryCount,
      entryCount: digestEntries.length,
      exists: true,
      fileCount,
      kind: 'directory',
      lineCount: 0,
      sha256: digest.digest('hex'),
    };
  }

  function buildEmptyMutationPathState() {
    return {
      bytes: 0,
      content: '',
      directoryCount: 0,
      entryCount: 0,
      exists: false,
      fileCount: 0,
      kind: 'missing',
      lineCount: 0,
      reason: '',
      sha256: '',
    };
  }

  function readMutationPathState(targetPath) {
    if (!fs.existsSync(targetPath)) {
      return buildEmptyMutationPathState();
    }

    try {
      const stat = fs.lstatSync(targetPath);
      if (stat.isSymbolicLink()) {
        return {
          ...buildEmptyMutationPathState(),
          exists: true,
          kind: 'unsupported',
          reason: `Rollback target is a symbolic link: ${targetPath}`,
        };
      }
      if (stat.isDirectory()) {
        return collectDirectoryMoveState(targetPath);
      }
      if (!stat.isFile()) {
        return {
          ...buildEmptyMutationPathState(),
          exists: true,
          kind: 'unsupported',
          reason: `Rollback target is not a regular file or directory: ${targetPath}`,
        };
      }

      const content = fs.readFileSync(targetPath, 'utf8');
      return {
        bytes: Buffer.byteLength(content, 'utf8'),
        content,
        directoryCount: 0,
        entryCount: 1,
        exists: true,
        fileCount: 1,
        kind: 'file',
        lineCount: countTextLines(content),
        reason: '',
        sha256: hashTextContent(content),
      };
    } catch (error) {
      return {
        ...buildEmptyMutationPathState(),
        exists: true,
        kind: 'unsupported',
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  function buildMutationBundle({ manifest, workspacePath }) {
    const workspaceRoot = path.resolve(workspacePath);
    const editSteps = ensureArray(manifest?.steps).filter((step) => step.kind === 'edit');
    const items = editSteps.map((step) => {
      const targetPath = path.resolve(workspaceRoot, step.filePath || '');
      const moveTargetPath = step.targetPath ? path.resolve(workspaceRoot, step.targetPath) : '';
      const sourcePathInsideWorkspace = isPathInsideRoot(workspaceRoot, targetPath);
      const targetPathInsideWorkspace = !moveTargetPath || isPathInsideRoot(workspaceRoot, moveTargetPath);
      const pathInsideWorkspace = sourcePathInsideWorkspace && targetPathInsideWorkspace;
      const isDirectoryMove = step.mutationTemplate === 'directory-move';

      if (isDirectoryMove) {
        return buildDirectoryMovePrediction({
          moveTargetPath,
          pathInsideWorkspace,
          sourcePathInsideWorkspace,
          step,
          targetPath,
          targetPathInsideWorkspace,
        });
      }

      return buildFileMutationPrediction({
        moveTargetPath,
        pathInsideWorkspace,
        sourcePathInsideWorkspace,
        step,
        targetPath,
        targetPathInsideWorkspace,
      });
    });
    const templateCounts = items.reduce((counts, item) => {
      counts[item.mutationTemplate] = (counts[item.mutationTemplate] || 0) + 1;
      return counts;
    }, {});
    const filePaths = [
      ...new Set(
        items
          .flatMap((item) => [item.filePath, item.targetFilePath])
          .filter(Boolean),
      ),
    ];
    const rollbackReadyCount = items.filter((item) => item.rollbackPreview?.ready === true).length;
    const batch = buildMutationBatchSummary({
      filePaths,
      items,
      rollbackReadyCount,
      templateCounts,
    });

    return {
      batch,
      fileCount: filePaths.length,
      filePaths,
      itemCount: items.length,
      items,
      rollbackPreviewReady: rollbackReadyCount === items.length,
      rollbackReadyCount,
      templateCounts,
      totalByteDelta: items.reduce((total, item) => total + item.byteDelta, 0),
      totalLineDelta: items.reduce((total, item) => total + item.lineDelta, 0),
    };
  }

  function buildDirectoryMovePrediction({
    moveTargetPath,
    pathInsideWorkspace,
    sourcePathInsideWorkspace,
    step,
    targetPath,
    targetPathInsideWorkspace,
  }) {
    let predictionError = '';
    let beforeState = buildEmptyMutationPathState();

    if (pathInsideWorkspace) {
      try {
        if (isSecretLikePath(step.filePath) || isSecretLikePath(step.targetPath)) {
          throw new Error(`directory-move refuses secret-like source or target path for ${step.title}`);
        }
        if (!step.targetPath) {
          throw new Error(`directory-move requires targetPath for ${step.title}`);
        }
        if (fs.existsSync(moveTargetPath)) {
          throw new Error(`directory-move targetPath already exists ${step.targetPath}`);
        }
        if (path.resolve(targetPath) === path.resolve(moveTargetPath)) {
          throw new Error(`directory-move source and targetPath are identical for ${step.filePath}`);
        }
        if (isPathInsideCandidateRoot(targetPath, moveTargetPath)) {
          throw new Error(`directory-move targetPath cannot be inside source ${step.targetPath}`);
        }
        if (!fs.existsSync(targetPath)) {
          throw new Error(`directory-move source directory does not exist ${step.filePath}`);
        }
        const sourceStat = fs.lstatSync(targetPath);
        if (!sourceStat.isDirectory()) {
          throw new Error(`directory-move source is not a directory ${step.filePath}`);
        }
        beforeState = collectDirectoryMoveState(targetPath);
      } catch (error) {
        predictionError = error instanceof Error ? error.message : String(error);
      }
    } else if (!sourcePathInsideWorkspace) {
      predictionError = `Edit path escapes selected workspace: ${targetPath}`;
    } else {
      predictionError = `directory-move targetPath escapes selected workspace: ${moveTargetPath}`;
    }

    return {
      afterBytes: beforeState.bytes,
      afterLineCount: beforeState.lineCount,
      afterSha256: beforeState.sha256,
      beforeBytes: beforeState.bytes,
      beforeLineCount: beforeState.lineCount,
      beforeSha256: beforeState.sha256,
      byteDelta: 0,
      directoryEntryCount: beforeState.entryCount,
      directoryFileCount: beforeState.fileCount,
      existedBefore: beforeState.exists,
      existsAfter: false,
      filePath: step.filePath || '',
      id: step.id,
      lineDelta: 0,
      mutationTemplate: step.mutationTemplate || '',
      operation: step.operation || '',
      pathInsideWorkspace,
      pathKind: beforeState.kind,
      predictionError,
      riskClassification: step.riskClassification || '',
      rollbackPreview: predictionError
        ? {
            action: 'manual-review-required',
            ready: false,
            reason: predictionError,
          }
        : {
            action: 'restore-moved-file',
            expectedCurrentFilePath: step.targetPath || '',
            expectedCurrentSha256: beforeState.sha256,
            ready: true,
            restoreFilePath: step.filePath || '',
            restoreSha256: beforeState.sha256,
            restoreStrategy: 'rename-directory-back',
          },
      targetExistsAfter: !predictionError,
      targetFilePath: step.targetPath || '',
      targetPathInsideWorkspace,
      title: step.title,
    };
  }

  function buildFileMutationPrediction({
    moveTargetPath,
    pathInsideWorkspace,
    sourcePathInsideWorkspace,
    step,
    targetPath,
    targetPathInsideWorkspace,
  }) {
    const existedBefore = pathInsideWorkspace && fs.existsSync(targetPath);
    const moveTargetExistsBefore = pathInsideWorkspace && moveTargetPath ? fs.existsSync(moveTargetPath) : false;
    const targetStat = existedBefore ? fs.lstatSync(targetPath) : null;
    const beforeContent = existedBefore && !targetStat?.isDirectory() ? fs.readFileSync(targetPath, 'utf8') : '';
    let afterContent = beforeContent;
    let predictionError = '';

    if (pathInsideWorkspace) {
      try {
        if (step.operation === 'move' && !step.targetPath) {
          throw new Error(`file-move requires targetPath for ${step.title}`);
        }
        if (step.operation === 'move' && moveTargetExistsBefore) {
          throw new Error(`file-move targetPath already exists ${step.targetPath}`);
        }
        afterContent = buildNextEditContent(step, beforeContent, existedBefore);
      } catch (error) {
        predictionError = error instanceof Error ? error.message : String(error);
      }
    } else if (!sourcePathInsideWorkspace) {
      predictionError = `Edit path escapes selected workspace: ${targetPath}`;
    } else {
      predictionError = `file-move targetPath escapes selected workspace: ${moveTargetPath}`;
    }

    const beforeBytes = Buffer.byteLength(beforeContent, 'utf8');
    const afterBytes = Buffer.byteLength(afterContent, 'utf8');
    const beforeLineCount = countTextLines(beforeContent);
    const afterLineCount = countTextLines(afterContent);
    const existsAfter = !predictionError && !['delete', 'move'].includes(step.operation);
    const targetExistsAfter = !predictionError && step.operation === 'move';

    return {
      afterBytes,
      afterLineCount,
      afterSha256: hashTextContent(afterContent),
      beforeBytes,
      beforeLineCount,
      beforeSha256: hashTextContent(beforeContent),
      byteDelta: afterBytes - beforeBytes,
      existedBefore,
      existsAfter,
      filePath: step.filePath || '',
      id: step.id,
      lineDelta: afterLineCount - beforeLineCount,
      mutationTemplate: step.mutationTemplate || '',
      operation: step.operation || '',
      pathInsideWorkspace,
      predictionError,
      riskClassification: step.riskClassification || '',
      rollbackPreview: predictionError
        ? {
            action: 'manual-review-required',
            ready: false,
            reason: predictionError,
          }
        : buildRollbackPreview({
            afterContent,
            beforeContent,
            existedBefore,
            step,
          }),
      targetExistsAfter,
      targetFilePath: step.targetPath || '',
      targetPathInsideWorkspace,
      title: step.title,
    };
  }

  return {
    buildMutationBundle,
    collectDirectoryMoveState,
    readMutationPathState,
  };
}
