import nodeFs from 'node:fs';
import path from 'node:path';
import { execFileSync as nodeExecFileSync, spawn as nodeSpawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  buildFallbackExecutionManifest,
  buildExecutionCommandSpawnSpec,
  evaluateExecutionPolicy,
  getCurrentGitBranch,
  hashExecutionManifest,
  normalizeExecutionManifest,
} from './execution-utils.mjs';
import {
  buildExecutionMutationBatchAudit,
  buildMutationAudit,
  buildNextEditContent,
  collectExecutionMutationAudits,
  hashTextContent,
} from './execution-mutation.mjs';
import { createExecutionMutationBundleBuilder } from './execution-mutation-bundle.mjs';
import { buildExecutionRollbackPlan as assembleExecutionRollbackPlan } from './execution-rollback-plan.mjs';
import {
  completeExecutionSession,
  completeExecutionStep,
  failExecutionSession,
  failExecutionStep,
  startExecutionSession,
  startExecutionStep,
} from './execution-runner-lifecycle.mjs';
import { createId } from './id.mjs';
import { formatApprovalDecisionMemory } from './reminder-formatters.mjs';

const DEFAULT_EXECUTION_WORKSPACE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
);

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items]
    .sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || '')))
    .at(-1);
}

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  return normalized === 'executing' ? 'running' : normalized;
}

/**
 * Owns the one-time execution lease, workspace mutation, runner, log, and
 * rollback lifecycle. Node effects are explicit ports so the service keeps
 * process state inside one mission-service instance and remains testable.
 */
export function createExecutionRuntimeService({
  executeFileSync = nodeExecFileSync,
  executionWorkspaceRoot = DEFAULT_EXECUTION_WORKSPACE_ROOT,
  fileSystem = nodeFs,
  getMission,
  getWorkspace,
  harness,
  now,
  processEnvironment = process.env,
  spawnProcess = nodeSpawn,
  store,
}) {
  const activeExecutionRuntimes = new Map();

  function isPathInsideRoot(rootDir, candidatePath) {
    const relativePath = path.relative(rootDir, candidatePath);
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  }

  function isPathInsideCandidateRoot(rootPath, candidatePath) {
    const relativePath = path.relative(rootPath, candidatePath);
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
  }

  function isSecretLikeMutationPath(value) {
    const normalized = normalizeText(value).replaceAll('\\', '/').toLowerCase();
    const basename = path.basename(normalized);
    return (
      basename === '.env' ||
      basename.startsWith('.env.') ||
      basename === 'id_rsa' ||
      basename === 'id_dsa' ||
      basename === 'id_ecdsa' ||
      basename === 'id_ed25519' ||
      /\.(?:key|pem|p12|pfx)$/.test(basename) ||
      normalized === '.git' ||
      normalized.startsWith('.git/') ||
      normalized === '.ssh' ||
      normalized.startsWith('.ssh/') ||
      normalized.includes('/.ssh/') ||
      normalized.includes('/.git/')
    );
  }

  const {
    buildMutationBundle,
    collectDirectoryMoveState,
    readMutationPathState,
  } = createExecutionMutationBundleBuilder({
    isPathInsideCandidateRoot,
    isPathInsideRoot,
    isSecretLikePath: isSecretLikeMutationPath,
  });


  function getExecutionDir(missionId, executionSessionId) {
    return path.join(store.getMissionDir(missionId), 'executions', executionSessionId);
  }

  function ensureExecutionDir(missionId, executionSessionId) {
    const executionDir = getExecutionDir(missionId, executionSessionId);
    fileSystem.mkdirSync(executionDir, { recursive: true });
    return executionDir;
  }

  function getExecutionRollbackDir(missionId, executionSessionId) {
    return path.join(ensureExecutionDir(missionId, executionSessionId), 'rollback');
  }

  function buildRollbackSnapshotPath({ executionSessionId, filePath, missionId, stepId }) {
    const rollbackDir = getExecutionRollbackDir(missionId, executionSessionId);
    fileSystem.mkdirSync(rollbackDir, { recursive: true });
    const safeStepId = normalizeText(stepId, 'step').replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 64) || 'step';
    const filePathDigest = hashTextContent(filePath).slice(0, 16);
    return path.join(rollbackDir, `${safeStepId}-${filePathDigest}.before.txt`);
  }

  function isSafeRollbackSnapshotPath(executionSession, snapshotPath) {
    const normalizedSnapshotPath = normalizeText(snapshotPath);
    if (!normalizedSnapshotPath) {
      return false;
    }

    const rollbackDir = getExecutionRollbackDir(executionSession.missionId, executionSession.id);
    return isPathInsideRoot(rollbackDir, path.resolve(normalizedSnapshotPath));
  }

  function isExecutionCapableWorkspace(workspace) {
    return isPathInsideRoot(executionWorkspaceRoot, path.resolve(workspace.path));
  }

  function isExecutionCapableMission(mission, workspace) {
    return mission.mode === 'engineering' && isExecutionCapableWorkspace(workspace);
  }

  function getLatestExecutionSessionForMission(missionId) {
    return getLatestItem(store.listExecutionSessions({ missionId }), 'createdAt');
  }

  function getCurrentExecutionLeaseForMission(missionId) {
    return getLatestItem(
      store.listExecutionLeases({ missionId }).filter((lease) => lease.status === 'active'),
      'createdAt',
    );
  }

  function getLatestExecutionLeaseForMission(missionId) {
    return getLatestItem(store.listExecutionLeases({ missionId }), 'createdAt');
  }

  function getLatestExecutionApprovalForSession(sessionId) {
    return getLatestItem(
      store
        .listApprovals({ sessionId })
        .filter((approval) => normalizeText(approval.kind) === 'execution_lease'),
      'createdAt',
    );
  }

  function getLatestReviewableEngineeringSession(missionId) {
    const sessions = store.listSessionsByMission(missionId);
    return [...sessions]
      .reverse()
      .find((session) => {
        const deliverableArtifact = store
          .listArtifactsBySession(session.id)
          .filter((artifact) => artifact.kind === 'deliverable')
          .at(-1);
        if (!deliverableArtifact) {
          return false;
        }
        const reviewerRun = store
          .listAgentRunsBySession(session.id)
          .filter((run) => run.role === 'reviewer')
          .at(-1);
        if (!reviewerRun) {
          return false;
        }
        return normalizeAgentRunStatus(reviewerRun.status) !== 'failed';
      }) || null;
  }

  function deriveExecutionManifest({ mission, reviewSession, workspace }) {
    const agentRuns = store.listAgentRunsBySession(reviewSession.id);
    const plannerRun = agentRuns.filter((run) => run.role === 'planner').at(-1) || null;
    const executorRun = agentRuns.filter((run) => run.role === 'executor').at(-1) || null;
    const deliverableArtifact = store
      .listArtifactsBySession(reviewSession.id)
      .filter((artifact) => artifact.kind === 'deliverable')
      .at(-1);
    const proposalContent =
      deliverableArtifact?.path && fileSystem.existsSync(deliverableArtifact.path)
        ? fileSystem.readFileSync(deliverableArtifact.path, 'utf8')
        : '';
    const normalizedManifest = normalizeExecutionManifest(executorRun?.executionManifest, {
      workspacePath: workspace.path,
    });

    if (normalizedManifest) {
      return normalizedManifest;
    }

    return buildFallbackExecutionManifest({
      mission,
      plannerSteps: ensureArray(plannerRun?.planSteps),
      proposalContent,
      workspace,
    });
  }

  function buildExecutionPolicySummary(policy) {
    return {
      allowed: Boolean(policy.allowed),
      allowedCount: ensureArray(policy.allowedItems).length,
      blockedCount: ensureArray(policy.blockedItems).length,
      warningCount: ensureArray(policy.warningItems).length,
      allowedItems: ensureArray(policy.allowedItems),
      blockedItems: ensureArray(policy.blockedItems),
      warningItems: ensureArray(policy.warningItems),
    };
  }

  function buildExecutionContext(missionId) {
    const mission = getMission(missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const reviewSession = getLatestReviewableEngineeringSession(mission.id);
    const executionSupported = isExecutionCapableMission(mission, workspace);
    const blockedReasons = [];

    if (mission.mode !== 'engineering') {
      blockedReasons.push('knowledge 모드는 문서/메모 중심이며 직접 실행을 지원하지 않습니다.');
    } else if (!executionSupported) {
      blockedReasons.push(`현재 personal workspace 루트(${executionWorkspaceRoot}) 아래 경로만 실행 대상으로 지원합니다.`);
    }

    if (!reviewSession) {
      blockedReasons.push('실행에 사용할 검토 완료 세션이 아직 없습니다.');
    }

    const manifest = reviewSession && executionSupported
      ? deriveExecutionManifest({
          mission,
          reviewSession,
          workspace,
        })
      : null;
    const manifestHash = manifest ? hashExecutionManifest(manifest) : '';
    const mutationBundle = manifest
      ? buildMutationBundle({
          manifest,
          workspacePath: workspace.path,
        })
      : null;
    const policy = manifest
      ? evaluateExecutionPolicy({
          manifest,
          rootDir: path.resolve(workspace.path),
          workspacePath: path.resolve(workspace.path),
        })
      : {
          allowed: false,
          allowedItems: [],
          blockedItems: [],
          warningItems: [],
        };

    blockedReasons.push(...ensureArray(policy.blockedItems));

    const latestExecutionSession = getLatestExecutionSessionForMission(mission.id);
    const latestExecutionApproval = reviewSession ? getLatestExecutionApprovalForSession(reviewSession.id) : null;
    let latestLease = getLatestExecutionLeaseForMission(mission.id);
    const currentLease = getCurrentExecutionLeaseForMission(mission.id);
    const activeLease =
      currentLease &&
      currentLease.status === 'active' &&
      currentLease.manifestHash === manifestHash &&
      currentLease.sessionId === reviewSession?.id
        ? currentLease
        : null;

    if (currentLease && !activeLease && currentLease.status === 'active') {
      latestLease = harness.updateExecutionLease(currentLease.id, {
        revokedAt: now(),
        status: 'revoked',
      });
    }

    const approvalStatus = activeLease
      ? 'ready'
      : latestExecutionApproval?.status === 'pending'
        ? 'pending'
        : latestExecutionApproval?.status === 'approved'
          ? 'consumed'
          : 'required';

    return {
      activeLease,
      approvalStatus,
      blockedReasons,
      executionSupported,
      latestExecutionApproval,
      latestLease,
      latestExecutionSession,
      manifest,
      manifestHash,
      mission,
      mutationBundle,
      policy: buildExecutionPolicySummary(policy),
      reviewSession,
      workspace,
    };
  }

  function appendExecutionLog(executionSessionId, line) {
    const executionSession = store.getExecutionSession(executionSessionId);
    if (!executionSession) {
      return;
    }

    const executionDir = ensureExecutionDir(executionSession.missionId, executionSessionId);
    const logFilePath = executionSession.logFilePath || path.join(executionDir, 'execution.log');
    fileSystem.appendFileSync(logFilePath, `${line}\n`, 'utf8');

    if (executionSession.logFilePath !== logFilePath) {
      store.updateExecutionSession(executionSessionId, (current) => ({
        ...current,
        logFilePath,
      }));
    }
  }

  function updateExecutionStepRecord(executionSessionId, stepIndex, updater) {
    return store.updateExecutionSession(executionSessionId, (session) => {
      const nextSteps = ensureArray(session.steps).map((step, index) =>
        index === stepIndex ? updater(step) : step,
      );
      return {
        ...session,
        steps: nextSteps,
        updatedAt: now(),
      };
    });
  }

  function resolveExecutionStepCwd(workspacePath, stepCwd = '.') {
    const normalizedWorkspacePath = path.resolve(workspacePath || '.');
    const rawCwd = normalizeText(stepCwd, '.');
    const resolvedCwd = path.resolve(normalizedWorkspacePath, rawCwd || '.');
    if (fileSystem.existsSync(resolvedCwd)) {
      return resolvedCwd;
    }

    // Some live providers omit the leading slash when echoing an absolute cwd.
    // Normalize that shape before failing the execution session on a missing cwd.
    if (!path.isAbsolute(rawCwd) && /^[A-Za-z0-9_.-]+\//.test(rawCwd)) {
      const absoluteCandidate = path.resolve(path.sep, rawCwd);
      if (fileSystem.existsSync(absoluteCandidate)) {
        return absoluteCandidate;
      }
    }

    return resolvedCwd;
  }

  function captureChangedFiles(workspacePath) {
    try {
      const output = normalizeText(
        fileSystem.existsSync(path.join(workspacePath, '.git'))
          ? executeFileSync('git', ['status', '--short'], {
              cwd: workspacePath,
              encoding: 'utf8',
            })
          : '',
      );
      return output
        .split('\n')
        .map((line) => normalizeText(line))
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function computeExecutionVerification(steps) {
    const verificationSteps = ensureArray(steps).filter((step) => ['test', 'build'].includes(step.kind));
    if (!verificationSteps.length) {
      return {
        status: 'not-run',
        summary: '검증 step가 manifest에 없습니다.',
      };
    }

    const failed = verificationSteps.filter((step) => step.status !== 'completed');
    return {
      status: failed.length ? 'failed' : 'passed',
      summary: failed.length
        ? `검증 step ${failed.length}건이 실패하거나 중단되었습니다.`
        : `검증 step ${verificationSteps.length}건이 모두 통과했습니다.`,
    };
  }

  function applyEditStep(step, executionSession) {
    const workspacePath = executionSession.workspacePath;
    const workspaceRoot = path.resolve(workspacePath);
    const targetPath = path.resolve(workspacePath, step.filePath || '');
    if (!isPathInsideRoot(workspaceRoot, targetPath)) {
      throw new Error(`Edit path escapes selected workspace: ${targetPath}`);
    }

    if (step.mutationTemplate === 'directory-move') {
      if (!step.targetPath) {
        throw new Error(`directory-move requires targetPath for ${step.filePath}`);
      }
      if (isSecretLikeMutationPath(step.filePath) || isSecretLikeMutationPath(step.targetPath)) {
        throw new Error(`directory-move refuses secret-like source or target path for ${step.filePath}`);
      }
      const moveTargetPath = path.resolve(workspaceRoot, step.targetPath);
      if (!isPathInsideRoot(workspaceRoot, moveTargetPath)) {
        throw new Error(`directory-move targetPath escapes selected workspace: ${moveTargetPath}`);
      }
      if (path.resolve(targetPath) === path.resolve(moveTargetPath)) {
        throw new Error(`directory-move source and targetPath are identical for ${step.filePath}`);
      }
      if (isPathInsideCandidateRoot(targetPath, moveTargetPath)) {
        throw new Error(`directory-move targetPath cannot be inside source: ${step.targetPath}`);
      }
      if (fileSystem.existsSync(moveTargetPath)) {
        throw new Error(`directory-move targetPath already exists: ${step.targetPath}`);
      }
      if (!fileSystem.existsSync(targetPath)) {
        throw new Error(`directory-move source directory does not exist: ${step.filePath}`);
      }
      const sourceStat = fileSystem.lstatSync(targetPath);
      if (!sourceStat.isDirectory()) {
        throw new Error(`directory-move source is not a directory: ${step.filePath}`);
      }

      const beforeState = collectDirectoryMoveState(targetPath);
      fileSystem.mkdirSync(path.dirname(moveTargetPath), { recursive: true });
      fileSystem.renameSync(targetPath, moveTargetPath);
      return {
        afterBytes: beforeState.bytes,
        afterLineCount: beforeState.lineCount,
        afterSha256: beforeState.sha256,
        beforeBytes: beforeState.bytes,
        beforeLineCount: beforeState.lineCount,
        beforeSha256: beforeState.sha256,
        byteDelta: 0,
        changed: true,
        directoryEntryCount: beforeState.entryCount,
        directoryFileCount: beforeState.fileCount,
        existedBefore: true,
        existsAfter: false,
        filePath: step.filePath,
        lineDelta: 0,
        mutationTemplate: step.mutationTemplate,
        operation: step.operation,
        pathKind: 'directory',
        rollbackAction: 'restore-moved-file',
        rollbackReady: true,
        rollbackSnapshotPath: '',
        targetExistsAfter: true,
        targetFilePath: step.targetPath,
        targetPathKind: 'directory',
      };
    }

    const existedBefore = fileSystem.existsSync(targetPath);
    const targetStat = existedBefore ? fileSystem.lstatSync(targetPath) : null;
    if (targetStat?.isDirectory()) {
      throw new Error(`Edit source is a directory and requires directory-move template: ${step.filePath}`);
    }
    const existingContent = existedBefore ? fileSystem.readFileSync(targetPath, 'utf8') : '';
    const rollbackSnapshotPath = existedBefore
      ? buildRollbackSnapshotPath({
          executionSessionId: executionSession.id,
          filePath: step.filePath,
          missionId: executionSession.missionId,
          stepId: step.id,
        })
      : '';
    if (rollbackSnapshotPath) {
      fileSystem.writeFileSync(rollbackSnapshotPath, existingContent, 'utf8');
    }

    const nextContent = buildNextEditContent(step, existingContent, existedBefore);

    if (step.operation === 'move') {
      if (!step.targetPath) {
        throw new Error(`file-move requires targetPath for ${step.filePath}`);
      }
      const moveTargetPath = path.resolve(workspaceRoot, step.targetPath);
      if (!isPathInsideRoot(workspaceRoot, moveTargetPath)) {
        throw new Error(`file-move targetPath escapes selected workspace: ${moveTargetPath}`);
      }
      if (path.resolve(targetPath) === path.resolve(moveTargetPath)) {
        throw new Error(`file-move source and targetPath are identical for ${step.filePath}`);
      }
      if (fileSystem.existsSync(moveTargetPath)) {
        throw new Error(`file-move targetPath already exists: ${step.targetPath}`);
      }

      fileSystem.mkdirSync(path.dirname(moveTargetPath), { recursive: true });
      fileSystem.renameSync(targetPath, moveTargetPath);
      return buildMutationAudit({
        afterContent: nextContent,
        beforeContent: existingContent,
        existedBefore,
        existsAfter: false,
        filePath: step.filePath,
        mutationTemplate: step.mutationTemplate,
        operation: step.operation,
        rollbackAction: 'restore-moved-file',
        rollbackSnapshotPath,
        targetExistsAfter: true,
        targetFilePath: step.targetPath,
      });
    }

    fileSystem.mkdirSync(path.dirname(targetPath), { recursive: true });

    const existsAfter = step.operation !== 'delete';
    if (existsAfter) {
      fileSystem.writeFileSync(targetPath, nextContent, 'utf8');
    } else {
      fileSystem.rmSync(targetPath, { force: true });
    }
    return buildMutationAudit({
      afterContent: nextContent,
      beforeContent: existingContent,
      existedBefore,
      existsAfter,
      filePath: step.filePath,
      mutationTemplate: step.mutationTemplate,
      operation: step.operation,
      rollbackAction: existedBefore ? 'restore-snapshot' : 'delete-created-file',
      rollbackSnapshotPath,
    });
  }

  function resolveRollbackExecutionSession(missionId, executionId = '') {
    const mission = getMission(missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const normalizedExecutionId = normalizeText(executionId);
    const executionSession = normalizedExecutionId
      ? store.getExecutionSession(normalizedExecutionId)
      : [...store.listExecutionSessions({ missionId: mission.id })]
          .reverse()
          .find((session) => ensureArray(session.mutationAudits).length > 0);

    if (!executionSession) {
      throw new Error(normalizedExecutionId ? `Execution session not found: ${normalizedExecutionId}` : 'No rollback-capable execution session found.');
    }
    if (executionSession.missionId !== mission.id) {
      throw new Error(`Execution session ${executionSession.id} does not belong to mission ${mission.id}.`);
    }
    if (['pending', 'running'].includes(normalizeText(executionSession.status))) {
      throw new Error(`Execution session ${executionSession.id} is still ${executionSession.status}; rollback requires a finished session.`);
    }

    return {
      executionSession,
      mission,
      workspace,
    };
  }

  function readRollbackTargetState(targetPath) {
    return readMutationPathState(targetPath);
  }

  function buildExecutionRollbackPlan(executionSession) {
    return assembleExecutionRollbackPlan({
      executionSession,
      isPathInsideRoot,
      isSafeSnapshotPath: isSafeRollbackSnapshotPath,
      readSnapshot(snapshotPath) {
        return fileSystem.readFileSync(snapshotPath, 'utf8');
      },
      readTargetState: readRollbackTargetState,
      snapshotExists(snapshotPath) {
        return fileSystem.existsSync(snapshotPath);
      },
    });
  }

  function rollbackExecution(missionId, { dryRun = false, executionId = '' } = {}) {
    const { executionSession, mission, workspace } = resolveRollbackExecutionSession(missionId, executionId);
    const requestedAt = now();
    const plan = buildExecutionRollbackPlan(executionSession);
    const baseRollback = {
      id: createId('rollback'),
      dryRun: Boolean(dryRun),
      executionSessionId: executionSession.id,
      missionId: mission.id,
      requestedAt,
      ...plan,
    };

    if (dryRun) {
      return {
        execution: executionSession,
        mission,
        rollback: {
          ...baseRollback,
          status: 'preview',
          summary: plan.ready
            ? `Rollback preview is ready for ${plan.itemCount} mutation item(s).`
            : `Rollback preview found ${plan.blockedCount} blocked mutation item(s).`,
        },
        workspace,
      };
    }

    if (!plan.itemCount) {
      const skippedRollback = {
        ...baseRollback,
        completedAt: now(),
        status: 'skipped',
        summary: 'No mutation audit entries are available for rollback.',
      };
      const updatedSession = store.updateExecutionSession(executionSession.id, (session) => ({
        ...session,
        rollback: skippedRollback,
        updatedAt: now(),
      }));
      return {
        execution: updatedSession,
        mission,
        rollback: skippedRollback,
        workspace,
      };
    }

    if (!plan.ready) {
      const blockedRollback = {
        ...baseRollback,
        completedAt: now(),
        status: 'blocked',
        summary: `Rollback blocked by ${plan.blockedCount} hash/snapshot guard failure(s).`,
      };
      const updatedSession = store.updateExecutionSession(executionSession.id, (session) => ({
        ...session,
        rollback: blockedRollback,
        updatedAt: now(),
      }));
      appendExecutionLog(executionSession.id, `[${now()}] rollback blocked :: ${blockedRollback.summary}`);
      return {
        execution: updatedSession,
        mission,
        rollback: blockedRollback,
        workspace,
      };
    }

    appendExecutionLog(executionSession.id, `[${now()}] rollback started :: ${plan.itemCount} mutation item(s)`);
    const appliedItems = [];

    for (const item of plan.items) {
      const currentState = readRollbackTargetState(item.targetPath);
      if (item.expectedCurrentExists && (!currentState.exists || currentState.sha256 !== item.expectedCurrentSha256)) {
        throw new Error(`Rollback hash guard changed during rollback for ${item.filePath}`);
      }
      if (!item.expectedCurrentExists && currentState.exists) {
        throw new Error(`Rollback hash guard changed during rollback for ${item.filePath}`);
      }

      if (item.action === 'delete-created-file') {
        fileSystem.rmSync(item.targetPath, { force: true });
        appliedItems.push({
          ...item,
          status: 'deleted',
        });
        appendExecutionLog(executionSession.id, `[${now()}] rollback delete-created-file :: ${item.filePath}`);
        continue;
      }

      if (item.action === 'restore-moved-file') {
        const sourceState = readRollbackTargetState(item.sourcePath);
        if (sourceState.exists) {
          throw new Error(`Rollback move source path changed during rollback for ${item.filePath}`);
        }
        fileSystem.mkdirSync(path.dirname(item.sourcePath), { recursive: true });
        fileSystem.renameSync(item.targetPath, item.sourcePath);
        appliedItems.push({
          ...item,
          status: 'restored',
        });
        appendExecutionLog(
          executionSession.id,
          `[${now()}] rollback restore-moved-file :: ${item.targetFilePath} -> ${item.filePath}`,
        );
        continue;
      }

      const restoreContent = fileSystem.readFileSync(item.rollbackSnapshotPath, 'utf8');
      fileSystem.writeFileSync(item.targetPath, restoreContent, 'utf8');
      appliedItems.push({
        ...item,
        status: 'restored',
      });
      appendExecutionLog(executionSession.id, `[${now()}] rollback restore-snapshot :: ${item.filePath}`);
    }

    const completedRollback = {
      ...baseRollback,
      completedAt: now(),
      deletedCount: appliedItems.filter((item) => item.status === 'deleted').length,
      items: appliedItems,
      restoredCount: appliedItems.filter((item) => item.status === 'restored').length,
      status: 'completed',
      summary: `Rollback completed for ${appliedItems.length} mutation item(s).`,
    };
    const updatedSession = store.updateExecutionSession(executionSession.id, (session) => ({
      ...session,
      changedFiles: captureChangedFiles(session.workspacePath),
      rollback: completedRollback,
      updatedAt: now(),
    }));
    appendExecutionLog(executionSession.id, `[${now()}] rollback completed`);

    return {
      execution: updatedSession,
      mission: getMission(mission.id),
      rollback: completedRollback,
      workspace,
    };
  }

  function startExecutionRunner(executionSessionId) {
    const executionSession = store.getExecutionSession(executionSessionId);
    if (!executionSession || activeExecutionRuntimes.has(executionSessionId)) {
      return;
    }

    const runtimeState = {
      currentChild: null,
      stopRequested: false,
    };
    activeExecutionRuntimes.set(executionSessionId, runtimeState);

    const run = async () => {
      const baseSession = store.getExecutionSession(executionSessionId);
      if (!baseSession) {
        activeExecutionRuntimes.delete(executionSessionId);
        return;
      }

      store.updateExecutionSession(executionSessionId, (current) => startExecutionSession(current, now()));
      appendExecutionLog(executionSessionId, `[${now()}] execution started`);

      try {
        for (let index = 0; index < ensureArray(baseSession.steps).length; index += 1) {
          const latestSession = store.getExecutionSession(executionSessionId);
          const step = ensureArray(latestSession?.steps)[index];
          if (!latestSession || !step) {
            break;
          }

          if (runtimeState.stopRequested || latestSession.stopRequested) {
            throw new Error('Execution stopped by operator.');
          }

          store.updateExecutionSession(executionSessionId, (current) => ({
            ...current,
            currentStepIndex: index,
            updatedAt: now(),
          }));
          updateExecutionStepRecord(executionSessionId, index, (current) => startExecutionStep(current, now()));
          appendExecutionLog(executionSessionId, `[${now()}] ${step.id} start :: ${step.title}`);

          try {
            let mutationAudit = null;
            if (step.kind === 'edit') {
              mutationAudit = applyEditStep(step, latestSession);
              appendExecutionLog(
                executionSessionId,
                `[${now()}] ${step.id} edit applied :: ${step.filePath} (${mutationAudit.mutationTemplate}, bytes ${mutationAudit.byteDelta >= 0 ? '+' : ''}${mutationAudit.byteDelta}, lines ${mutationAudit.lineDelta >= 0 ? '+' : ''}${mutationAudit.lineDelta})`,
              );
            } else if (step.kind === 'artifact') {
              appendExecutionLog(executionSessionId, `[${now()}] ${step.id} artifact noted`);
            } else {
              const spawnSpec = buildExecutionCommandSpawnSpec(step.command);
              await new Promise((resolve, reject) => {
                const child = spawnProcess(spawnSpec.command, spawnSpec.args, {
                  cwd: resolveExecutionStepCwd(latestSession.workspacePath, step.cwd),
                  env: {
                    ...processEnvironment,
                    ...spawnSpec.env,
                  },
                  shell: false,
                  stdio: ['ignore', 'pipe', 'pipe'],
                });
                runtimeState.currentChild = child;

                child.stdout.on('data', (chunk) => {
                  String(chunk)
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .forEach((line) => appendExecutionLog(executionSessionId, `[stdout] ${line}`));
                });
                child.stderr.on('data', (chunk) => {
                  String(chunk)
                    .split(/\r?\n/)
                    .filter(Boolean)
                    .forEach((line) => appendExecutionLog(executionSessionId, `[stderr] ${line}`));
                });
                child.on('error', reject);
                child.on('close', (code, signal) => {
                  runtimeState.currentChild = null;
                  if (signal && runtimeState.stopRequested) {
                    reject(new Error('Execution stopped by operator.'));
                    return;
                  }
                  if (code !== 0) {
                    reject(new Error(`Command exited with code ${code}: ${step.command}`));
                    return;
                  }
                  resolve();
                });
              });
            }

            updateExecutionStepRecord(executionSessionId, index, (current) =>
              completeExecutionStep(current, {
                at: now(),
                mutationAudit,
              }),
            );
          } catch (error) {
            updateExecutionStepRecord(executionSessionId, index, (current) =>
              failExecutionStep(current, {
                at: now(),
                error,
                stopRequested: runtimeState.stopRequested,
              }),
            );
            throw error;
          }
        }

        const completedSession = store.updateExecutionSession(executionSessionId, (current) => {
          const mutationAudits = collectExecutionMutationAudits(current.steps);
          return completeExecutionSession(current, {
            at: now(),
            changedFiles: captureChangedFiles(current.workspacePath),
            mutationAudits,
            mutationBatchAudit: buildExecutionMutationBatchAudit({
              mutationAudits,
              mutationBundle: current.mutationBundle,
            }),
            verification: computeExecutionVerification(current.steps),
          });
        });
        harness.updateExecutionLease(completedSession.leaseId, {
          status: 'used',
          usedAt: now(),
        });
        harness.touchMission(completedSession.missionId, 'completed');
        appendExecutionLog(executionSessionId, `[${now()}] execution completed`);
      } catch (error) {
        const current = store.getExecutionSession(executionSessionId);
        const finalStatus = runtimeState.stopRequested ? 'stopped' : 'failed';
        store.updateExecutionSession(executionSessionId, (session) => {
          const mutationAudits = collectExecutionMutationAudits(session.steps);
          return failExecutionSession(session, {
            at: now(),
            changedFiles: captureChangedFiles(session.workspacePath),
            error,
            mutationAudits,
            mutationBatchAudit: buildExecutionMutationBatchAudit({
              mutationAudits,
              mutationBundle: session.mutationBundle,
            }),
            stopRequested: runtimeState.stopRequested,
            verification: computeExecutionVerification(session.steps),
          });
        });
        if (current?.leaseId) {
          harness.updateExecutionLease(current.leaseId, {
            status: 'used',
            usedAt: now(),
          });
        }
        harness.touchMission(current?.missionId, 'failed');
        appendExecutionLog(executionSessionId, `[${now()}] execution ${finalStatus}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        activeExecutionRuntimes.delete(executionSessionId);
      }
    };

    void run();
  }

  function ensureExecutionApproval(context) {
    const existingPendingApproval = context.reviewSession
      ? getLatestItem(
          store
            .listApprovals({ missionId: context.mission.id, sessionId: context.reviewSession.id })
            .filter((approval) => normalizeText(approval.kind) === 'execution_lease' && approval.status === 'pending'),
          'createdAt',
        )
      : null;

    if (existingPendingApproval) {
      return existingPendingApproval;
    }

    if (!context.reviewSession || !context.manifest) {
      return null;
    }

    return harness.createApproval({
      kind: 'execution_lease',
      metadata: {
        gitBranch: getCurrentGitBranch(context.workspace.path),
        manifestHash: context.manifestHash,
        mutationBundle: context.mutationBundle,
        reviewSessionId: context.reviewSession.id,
        stepCount: context.manifest.steps.length,
        workspacePath: context.workspace.path,
      },
      missionId: context.mission.id,
      reason: `One-time execution lease is required before running shell/edit steps against ${context.workspace.path}.`,
      requestedByRole: 'operator-console',
      sessionId: context.reviewSession.id,
      title: `Approve one-time execution lease for ${context.mission.title}`,
    });
  }

  function preflightExecution(missionId, { requestApproval = false } = {}) {
    const context = buildExecutionContext(missionId);
    const latestApproval = context.latestExecutionApproval;
    let approval = latestApproval || null;

    if (requestApproval && !context.blockedReasons.length && !context.activeLease && approval?.status !== 'pending') {
      approval = ensureExecutionApproval(context);
    }

    return {
      approval,
      execution: {
        blockedReasons: context.blockedReasons,
        eligibility: context.blockedReasons.length
          ? 'blocked'
          : context.activeLease
            ? 'ready'
            : approval?.status === 'pending'
              ? 'pending-approval'
              : 'approval-required',
        currentLease: context.activeLease,
        latestLease: context.latestLease,
        latestApproval: approval,
        latestExecutionSession: context.latestExecutionSession,
        manifest: context.manifest,
        manifestHash: context.manifestHash,
        mutationBundle: context.mutationBundle,
        policy: context.policy,
        reviewSessionId: context.reviewSession?.id || null,
        supported: context.executionSupported,
        workspacePath: context.workspace.path,
      },
      mission: context.mission,
      workspace: context.workspace,
    };
  }

  function getExecutionStatus(missionId) {
    const context = buildExecutionContext(missionId);
    return {
      currentLease: context.activeLease,
      execution: {
        blockedReasons: context.blockedReasons,
        currentLease: context.activeLease,
        eligibility: context.blockedReasons.length
          ? 'blocked'
          : context.activeLease
            ? 'ready'
            : context.latestExecutionApproval?.status === 'pending'
              ? 'pending-approval'
              : 'approval-required',
        latestApproval: context.latestExecutionApproval,
        latestLease: context.latestLease,
        latestExecutionSession: context.latestExecutionSession,
        manifest: context.manifest,
        manifestHash: context.manifestHash,
        mutationBundle: context.mutationBundle,
        policy: context.policy,
        reviewSessionId: context.reviewSession?.id || null,
        supported: context.executionSupported,
        workspacePath: context.workspace.path,
      },
      mission: context.mission,
      workspace: context.workspace,
    };
  }

  function startExecution(missionId) {
    const context = buildExecutionContext(missionId);
    if (context.blockedReasons.length) {
      throw new Error(`Execution blocked: ${context.blockedReasons.join(' ')}`);
    }
    if (!context.activeLease) {
      throw new Error('No active execution lease is available. Request approval first.');
    }

    const runningSession = store
      .listExecutionSessions({ missionId: context.mission.id })
      .find((session) => session.status === 'running');
    if (runningSession) {
      return {
        execution: runningSession,
        lease: context.activeLease,
        mission: context.mission,
        workspace: context.workspace,
      };
    }

    const executionSession = harness.startExecutionSession({
      approvalId: context.activeLease.approvalId,
      leaseId: context.activeLease.id,
      manifest: context.manifest,
      manifestHash: context.manifestHash,
      mutationBundle: context.mutationBundle,
      missionId: context.mission.id,
      provider: context.reviewSession?.provider || 'stub',
      reviewSessionId: context.reviewSession?.id || null,
      workspaceId: context.workspace.id,
      workspacePath: context.workspace.path,
    });

    harness.touchMission(context.mission.id, 'execution_running');
    startExecutionRunner(executionSession.id);

    return {
      execution: store.getExecutionSession(executionSession.id),
      lease: context.activeLease,
      mission: getMission(context.mission.id),
      workspace: context.workspace,
    };
  }

  function stopExecution(missionId) {
    const latestExecutionSession = getLatestExecutionSessionForMission(missionId);
    if (!latestExecutionSession || latestExecutionSession.status !== 'running') {
      throw new Error('No running execution session found.');
    }

    const runtime = activeExecutionRuntimes.get(latestExecutionSession.id);
    if (!runtime) {
      throw new Error('Execution runtime handle is not available.');
    }

    runtime.stopRequested = true;
    store.updateExecutionSession(latestExecutionSession.id, (session) => ({
      ...session,
      stopRequested: true,
      updatedAt: now(),
    }));

    if (runtime.currentChild) {
      runtime.currentChild.kill('SIGTERM');
    }

    return {
      execution: store.getExecutionSession(latestExecutionSession.id),
    };
  }

  function getExecutionLogs(missionId, filter = {}) {
    const executionId = normalizeText(filter.executionId);
    const executionSession = executionId
      ? store.getExecutionSession(executionId)
      : getLatestExecutionSessionForMission(missionId);

    if (!executionSession) {
      return {
        execution: null,
        lines: [],
      };
    }
    if (executionSession.missionId !== missionId) {
      throw new Error(`Execution session ${executionSession.id} does not belong to mission ${missionId}.`);
    }

    const content =
      executionSession.logFilePath && fileSystem.existsSync(executionSession.logFilePath)
        ? fileSystem.readFileSync(executionSession.logFilePath, 'utf8')
        : '';
    const lines = content ? content.split(/\r?\n/).filter(Boolean) : [];

    return {
      execution: executionSession,
      lines,
      logFilePath: executionSession.logFilePath || null,
    };
  }


  function completeExecutionLeaseApproval({
    approval,
    decision,
    mission,
    reason = '',
    resolutionArtifactPath,
    session,
    workspace,
  }) {
    const metadata = ensureObject(approval.metadata);

    if (decision === 'approve') {
      const lease = harness.issueExecutionLease({
        approvalId: approval.id,
        gitBranch: normalizeText(metadata.gitBranch, getCurrentGitBranch(workspace.path)),
        manifestHash: normalizeText(metadata.manifestHash),
        missionId: mission.id,
        mutationBundle: ensureObject(metadata.mutationBundle),
        provider: session.provider,
        sessionId: session.id,
        workspacePath: workspace.path,
      });

      harness.addMemoryEntry({
        scope: 'mission',
        scopeId: mission.id,
        kind: 'decision',
        content: formatApprovalDecisionMemory({ mission, decision, reason }),
      });

      const executionReadyMission = harness.touchMission(mission.id, 'execution_ready');

      return {
        approval,
        execution: getExecutionStatus(mission.id).execution,
        lease,
        mission: executionReadyMission,
        resolutionArtifactPath,
        session: store.getSession(session.id),
      };
    }

    harness.addMemoryEntry({
      scope: 'mission',
      scopeId: mission.id,
      kind: 'decision',
      content: formatApprovalDecisionMemory({ mission, decision, reason }),
    });

    const reviewedMission = harness.touchMission(mission.id, 'reviewed');
    return {
      approval,
      execution: getExecutionStatus(mission.id).execution,
      mission: reviewedMission,
      resolutionArtifactPath,
      session: store.getSession(session.id),
    };
  }

  return {
    buildExecutionContext,
    completeExecutionLeaseApproval,
    getExecutionLogs,
    getExecutionStatus,
    isExecutionCapableMission,
    preflightExecution,
    rollbackExecution,
    startExecution,
    stopExecution,
  };
}
