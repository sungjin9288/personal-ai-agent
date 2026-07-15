import path from 'node:path';

import { hashTextContent } from './execution-mutation.mjs';

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function buildExecutionRollbackPlan({
  executionSession,
  isPathInsideRoot,
  isSafeSnapshotPath,
  readSnapshot,
  readTargetState,
  snapshotExists,
}) {
  const workspaceRoot = path.resolve(executionSession.workspacePath);
  const simulatedTargetStates = new Map();
  const mutationAudits = ensureArray(executionSession.mutationAudits)
    .filter((audit) => normalizeText(audit.filePath))
    .reverse();
  const readSimulatedOrCurrentState = (targetPath) => {
    const targetKey = path.resolve(targetPath);
    return simulatedTargetStates.has(targetKey)
      ? simulatedTargetStates.get(targetKey)
      : readTargetState(targetPath);
  };

  const items = mutationAudits.map((audit, index) => {
    const action = normalizeText(
      audit.rollbackAction,
      audit.existedBefore ? 'restore-snapshot' : 'delete-created-file',
    );
    const isMoveRestore = action === 'restore-moved-file';
    const sourcePath = path.resolve(workspaceRoot, audit.filePath || '');
    const moveTargetRelativePath = normalizeText(audit.targetFilePath);
    const targetPath = isMoveRestore ? path.resolve(workspaceRoot, moveTargetRelativePath || '') : sourcePath;
    const sourcePathInsideWorkspace = isPathInsideRoot(workspaceRoot, sourcePath);
    const targetPathInsideWorkspace = isPathInsideRoot(workspaceRoot, targetPath);
    const pathInsideWorkspace = targetPathInsideWorkspace && (!isMoveRestore || sourcePathInsideWorkspace);
    const expectedCurrentSha256 = normalizeText(audit.afterSha256);
    const expectedCurrentExists = isMoveRestore ? audit.targetExistsAfter !== false : audit.existsAfter !== false;
    const targetKey = path.resolve(targetPath);
    const sourceKey = path.resolve(sourcePath);
    const currentState = readSimulatedOrCurrentState(targetPath);
    const sourceState = isMoveRestore ? readSimulatedOrCurrentState(sourcePath) : null;
    let restoreSha256 = '';
    let rollbackSnapshotReady = !audit.existedBefore;
    let ready = false;
    let reason = '';

    if (!pathInsideWorkspace) {
      reason = isMoveRestore
        ? `Rollback move source or target escapes selected workspace: ${audit.filePath} -> ${moveTargetRelativePath}`
        : `Rollback target escapes selected workspace: ${targetPath}`;
    } else if (isMoveRestore && !moveTargetRelativePath) {
      reason = `Rollback move audit is missing targetFilePath for ${audit.filePath}`;
    } else if (!expectedCurrentSha256) {
      reason = `Mutation audit is missing afterSha256 for ${audit.filePath}`;
    } else if (expectedCurrentExists && currentState.reason) {
      reason = `Rollback target cannot be hashed for ${audit.filePath}: ${currentState.reason}`;
    } else if (expectedCurrentExists && !currentState.exists) {
      reason = `Rollback target is missing before rollback: ${audit.filePath}`;
    } else if (!expectedCurrentExists && currentState.exists) {
      reason = `Rollback target unexpectedly exists before rollback: ${audit.filePath}`;
    } else if (expectedCurrentExists && currentState.sha256 !== expectedCurrentSha256) {
      reason = `Rollback hash guard failed for ${audit.filePath}`;
    } else if (isMoveRestore && sourceState?.exists) {
      reason = `Rollback move source path already exists before rollback: ${audit.filePath}`;
    } else if (
      isMoveRestore &&
      normalizeText(audit.beforeSha256) &&
      normalizeText(audit.beforeSha256) !== expectedCurrentSha256
    ) {
      reason = `Rollback move before/after hash mismatch for ${audit.filePath}`;
    } else if (isMoveRestore) {
      ready = true;
      restoreSha256 = normalizeText(audit.beforeSha256);
      rollbackSnapshotReady = true;
      simulatedTargetStates.set(targetKey, missingState());
      simulatedTargetStates.set(sourceKey, {
        content: currentState.content || '',
        directoryCount: currentState.directoryCount || 0,
        entryCount: currentState.entryCount || 0,
        exists: true,
        fileCount: currentState.fileCount || 0,
        kind: currentState.kind || 'file',
        sha256: restoreSha256 || currentState.sha256,
      });
    } else if (action === 'delete-created-file') {
      ready = true;
      simulatedTargetStates.set(targetKey, missingState());
    } else {
      const snapshotPath = normalizeText(audit.rollbackSnapshotPath);
      if (!snapshotPath) {
        reason = `Rollback snapshot is missing for ${audit.filePath}`;
      } else if (!isSafeSnapshotPath(executionSession, snapshotPath)) {
        reason = `Rollback snapshot path is outside the execution rollback directory for ${audit.filePath}`;
      } else if (!snapshotExists(snapshotPath)) {
        reason = `Rollback snapshot file does not exist for ${audit.filePath}`;
      } else {
        const restoreContent = readSnapshot(snapshotPath);
        restoreSha256 = hashTextContent(restoreContent);
        rollbackSnapshotReady = restoreSha256 === normalizeText(audit.beforeSha256);
        if (!rollbackSnapshotReady) {
          reason = `Rollback snapshot hash does not match beforeSha256 for ${audit.filePath}`;
        } else {
          ready = true;
          simulatedTargetStates.set(targetKey, {
            content: restoreContent,
            directoryCount: 0,
            entryCount: 1,
            exists: true,
            fileCount: 1,
            kind: 'file',
            sha256: restoreSha256,
          });
        }
      }
    }

    return {
      action,
      actualCurrentSha256: currentState.sha256,
      auditIndex: mutationAudits.length - index - 1,
      beforeSha256: normalizeText(audit.beforeSha256),
      expectedCurrentSha256,
      expectedCurrentExists,
      existsBeforeRollback: currentState.exists,
      filePath: audit.filePath,
      mutationTemplate: normalizeText(audit.mutationTemplate),
      pathInsideWorkspace,
      ready,
      reason,
      restoreSha256,
      rollbackSnapshotPath: normalizeText(audit.rollbackSnapshotPath),
      rollbackSnapshotReady,
      sourceExistsBeforeRollback: sourceState?.exists ?? null,
      sourcePath: isMoveRestore ? sourcePath : '',
      sourcePathInsideWorkspace,
      targetFilePath: moveTargetRelativePath,
      targetPath,
      targetPathInsideWorkspace,
    };
  });

  const ready = items.length > 0 && items.every((item) => item.ready);
  const rollbackActionCounts = items.reduce((counts, item) => {
    counts[item.action] = (counts[item.action] || 0) + 1;
    return counts;
  }, {});
  const batch = {
    itemCount: items.length,
    mutationSetSha256: normalizeText(executionSession.mutationBatchAudit?.mutationSetSha256),
    ready,
    rollbackActionCounts,
    rollbackOrder: items.map((item) => item.filePath).filter(Boolean),
    template: 'ordered-rollback-batch-v1',
  };

  return {
    batch,
    blockedCount: items.filter((item) => !item.ready).length,
    deleteCount: items.filter((item) => item.action === 'delete-created-file').length,
    executionSessionId: executionSession.id,
    itemCount: items.length,
    items,
    ready,
    restoreCount: items.filter((item) => item.action !== 'delete-created-file').length,
    workspacePath: executionSession.workspacePath,
  };
}

function missingState() {
  return {
    content: '',
    directoryCount: 0,
    entryCount: 0,
    exists: false,
    fileCount: 0,
    kind: 'missing',
    sha256: '',
  };
}
