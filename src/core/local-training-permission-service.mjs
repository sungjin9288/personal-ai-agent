import fs from 'node:fs';
import path from 'node:path';

import { assertFineTuningReadinessPackage } from './fine-tuning-readiness.mjs';
import {
  buildLocalTrainingPermissionRequest,
  revokeLocalTrainingPermission,
  resolveLocalTrainingPermissionRequest,
} from './local-training-permission.mjs';
import { buildLocalTrainingExecutionApproval } from './local-training-runtime.mjs';
import {
  containsRawCustomerPayload,
  containsTrainingSecret,
} from './training-content-safety.mjs';

export const LOCAL_TRAINING_APPROVAL_KIND = 'local_training_execution';

const MAX_READINESS_ARTIFACT_BYTES = 32 * 1024 * 1024;
const READINESS_FILE_NAME = 'local-training-readiness.private.json';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function requireContentFreeText(value, fieldName) {
  const normalized = normalizeText(value);
  if (
    !normalized ||
    normalized.length > 500 ||
    /[\r\n\0]/.test(normalized) ||
    containsTrainingSecret(normalized) ||
    containsRawCustomerPayload(normalized)
  ) {
    throw new Error(`Local training permission ${fieldName} must be content-free metadata.`);
  }
  return normalized;
}

function assertPathInside(rootDir, targetPath) {
  const root = path.resolve(rootDir);
  const target = path.resolve(targetPath);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('Local training readiness artifact must remain inside the runtime root.');
  }
  return target;
}

function buildSourceContext(sourceContext, { command, startedBy }) {
  const channel = requireContentFreeText(sourceContext?.channel || 'service', 'source channel');
  const sourceType = requireContentFreeText(
    sourceContext?.sourceType || channel,
    'source type',
  );
  return {
    channel,
    command,
    sourceType,
    startedBy,
    surface: requireContentFreeText(sourceContext?.surface || channel, 'source surface'),
  };
}

function formatPermissionRequestArtifact(request) {
  return `${JSON.stringify({
    actualModelTrainingExecuted: false,
    externalSubmissionAuthorized: false,
    productionReadyClaim: false,
    request,
    rolloutAuthorized: false,
  }, null, 2)}\n`;
}

function formatPermissionResolutionArtifact({ executionApproval, permission }) {
  return `${JSON.stringify({
    actualModelTrainingExecuted: false,
    executionApproval,
    externalSubmissionAuthorized: false,
    permission,
    productionReadyClaim: false,
    rolloutAuthorized: false,
  }, null, 2)}\n`;
}

function buildReadModel({ approval, executionApproval = null, permission, revocation = null }) {
  return {
    actualModelTrainingExecuted: false,
    approval,
    executionApproval,
    externalSubmissionAuthorized: false,
    localExecutionAuthorized:
      permission?.status === 'approved' && !revocation && permission.localExecutionAuthorized === true,
    permission,
    productionReadyClaim: false,
    revocation,
    rolloutAuthorized: false,
  };
}

export function createLocalTrainingPermissionService({
  getMission,
  getWorkspace,
  harness,
  now = () => new Date().toISOString(),
  recordGatewayEvent,
  store,
} = {}) {
  function getApproval(approvalId) {
    const approval = store.getApproval(approvalId);
    if (!approval || approval.kind !== LOCAL_TRAINING_APPROVAL_KIND) {
      throw new Error(`Local training approval not found: ${approvalId}`);
    }
    return approval;
  }

  function getApprovalContext(approval) {
    const mission = getMission(approval.missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const session = store.getSession(approval.sessionId);
    if (!session) {
      throw new Error(`Session not found for local training approval: ${approval.sessionId}`);
    }
    return { mission, session, workspace };
  }

  function readReadinessPackage(approval) {
    const readinessFileName = approval.metadata?.localTrainingPermission?.readinessFileName;
    if (readinessFileName !== READINESS_FILE_NAME) {
      throw new Error('Local training readiness artifact is missing.');
    }
    const artifactPath = assertPathInside(
      store.rootDir,
      path.join(store.getSessionDir(approval.missionId, approval.sessionId), readinessFileName),
    );
    const stat = fs.statSync(artifactPath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_READINESS_ARTIFACT_BYTES) {
      throw new Error('Local training readiness artifact is outside the allowed size boundary.');
    }
    const readinessPackage = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    assertFineTuningReadinessPackage(readinessPackage);
    return readinessPackage;
  }

  function requestLocalTrainingPermission(missionId, input = {}) {
    const mission = getMission(missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const requestedAt = now();
    const request = buildLocalTrainingPermissionRequest({
      ...input,
      requestedAt,
    });
    const sourceContext = buildSourceContext(input.sourceContext, {
      command: 'approval request-local-training',
      startedBy: request.approvalOwner,
    });
    const existing = store
      .listApprovals({ missionId })
      .filter((approval) => approval.kind === LOCAL_TRAINING_APPROVAL_KIND)
      .find((approval) => {
        if (approval.status === 'pending') {
          return true;
        }
        const localTraining = approval.metadata?.localTrainingPermission;
        return (
          approval.status === 'approved' &&
          !localTraining?.revocation &&
          Date.parse(localTraining?.permission?.expiresAt || '') > Date.parse(requestedAt)
        );
      });
    if (existing) {
      throw new Error(`Local training permission is already active: ${existing.id}`);
    }

    const readinessContent = `${JSON.stringify(input.readinessPackage, null, 2)}\n`;
    if (Buffer.byteLength(readinessContent, 'utf8') > MAX_READINESS_ARTIFACT_BYTES) {
      throw new Error('Local training readiness artifact exceeds the allowed size boundary.');
    }

    const session = harness.startSession({
      missionId: mission.id,
      provider: 'local',
      sourceContext,
    });
    store.writeArtifactContent({
      content: readinessContent,
      fileName: READINESS_FILE_NAME,
      missionId: mission.id,
      sessionId: session.id,
    });
    const approval = harness.createApproval({
      kind: LOCAL_TRAINING_APPROVAL_KIND,
      metadata: {
        localTrainingPermission: {
          readinessFileName: READINESS_FILE_NAME,
          request,
        },
      },
      missionId: mission.id,
      reason:
        `Review license, OS egress isolation, resource envelope, and rollback ownership ` +
        `bound to readiness ${request.readinessHash}.`,
      requestedByRole: 'manager',
      sessionId: session.id,
      title: `Approve bounded local training for ${request.baseModelId}`,
    });
    const requestArtifact = harness.writeArtifact({
      content: formatPermissionRequestArtifact(request),
      fileName: 'local-training-permission-request.json',
      kind: 'local-training-permission-request',
      missionId: mission.id,
      role: 'manager',
      sessionId: session.id,
      title: 'Local Training Permission Request',
    });
    store.updateApproval(approval.id, (current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        localTrainingPermission: {
          ...current.metadata.localTrainingPermission,
          requestArtifactId: requestArtifact.id,
        },
      },
    }));
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'awaiting_approval',
    });
    harness.touchMission(mission.id, 'awaiting_approval');
    recordGatewayEvent({
      eventType: 'local-training-permission-request',
      mission,
      permissionPolicy: {
        approvalRequired: true,
        decision: 'approval-required',
        deniedCapabilities: ['local-model-training'],
        policyId: 'local-training-product-permission/v1',
        reason: 'owner-reviewed-local-training-evidence-required',
      },
      route: 'approval.request-local-training',
      session: store.getSession(session.id),
      sourceContext,
      workspace,
    });

    return {
      ...buildReadModel({
        approval: store.getApproval(approval.id),
        permission: null,
      }),
      readinessFileName: READINESS_FILE_NAME,
      request,
      requestArtifactId: requestArtifact.id,
      session: store.getSession(session.id),
    };
  }

  function resolveLocalTrainingPermission(approvalId, { decision, reason = '' } = {}) {
    const approval = getApproval(approvalId);
    if (approval.status !== 'pending') {
      throw new Error(`Approval ${approvalId} is already resolved.`);
    }
    const { mission, session, workspace } = getApprovalContext(approval);
    const request = approval.metadata?.localTrainingPermission?.request;
    const resolvedAt = now();
    const permission = resolveLocalTrainingPermissionRequest({
      decision,
      reason,
      request,
      resolvedAt,
      resolvedBy: request?.approvalOwner,
    });
    let executionApproval = null;
    if (permission.status === 'approved') {
      const readinessPackage = readReadinessPackage(approval);
      executionApproval = buildLocalTrainingExecutionApproval({
        approvedAt: resolvedAt,
        approvedBy: permission.resolvedBy,
        baseModelId: permission.baseModelId,
        executionKind: 'local-model-training',
        expiresAt: permission.expiresAt,
        permission,
        readinessPackage,
        rollbackOwner: permission.rollbackOwner,
        trainerId: permission.trainerId,
      });
    }

    harness.resolveApproval(approval.id, { decision, reason });
    const resolvedApproval = store.updateApproval(approval.id, (current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        localTrainingPermission: {
          ...current.metadata.localTrainingPermission,
          executionApproval,
          permission,
        },
      },
    }));
    const resolutionArtifact = harness.writeArtifact({
      content: formatPermissionResolutionArtifact({ executionApproval, permission }),
      fileName: 'local-training-permission-resolution.json',
      kind: 'local-training-permission-resolution',
      missionId: mission.id,
      role: 'manager',
      sessionId: session.id,
      title: 'Local Training Permission Resolution',
    });
    store.updateApproval(approval.id, (current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        localTrainingPermission: {
          ...current.metadata.localTrainingPermission,
          resolutionArtifactId: resolutionArtifact.id,
        },
      },
    }));
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      endedAt: resolvedAt,
      status: decision === 'approve' ? 'completed' : 'failed',
    });
    harness.touchMission(mission.id, decision === 'approve' ? 'completed' : 'failed');
    const sourceContext = buildSourceContext(session.sourceContext, {
      command: `approval resolve ${approval.id}`,
      startedBy: request.approvalOwner,
    });
    recordGatewayEvent({
      eventType: `local-training-permission-${permission.status}`,
      mission,
      permissionPolicy: {
        approvalRequired: false,
        allowedCapabilities: decision === 'approve' ? ['local-model-training'] : [],
        decision: decision === 'approve' ? 'allow' : 'deny',
        deniedCapabilities: decision === 'approve' ? [] : ['local-model-training'],
        policyId: 'local-training-product-permission/v1',
        reason: `local-training-permission-${permission.status}`,
      },
      route: 'approval.resolve-local-training',
      session: store.getSession(session.id),
      sourceContext,
      workspace,
    });

    return {
      ...buildReadModel({
        approval: store.getApproval(resolvedApproval.id),
        executionApproval,
        permission,
      }),
      resolutionArtifactId: resolutionArtifact.id,
    };
  }

  function revokePermission(approvalId, { reason = '' } = {}) {
    const approval = getApproval(approvalId);
    const { mission, session, workspace } = getApprovalContext(approval);
    const localTraining = approval.metadata?.localTrainingPermission;
    if (approval.status !== 'approved' || !localTraining?.permission) {
      throw new Error(`Local training approval is not active: ${approvalId}`);
    }
    if (localTraining.revocation) {
      throw new Error(`Local training permission is already revoked: ${approvalId}`);
    }
    const revocation = revokeLocalTrainingPermission({
      permission: localTraining.permission,
      reason,
      revokedAt: now(),
      revokedBy: localTraining.permission.approvalOwner,
    });
    store.updateApproval(approval.id, (current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        localTrainingPermission: {
          ...current.metadata.localTrainingPermission,
          revocation,
        },
      },
    }));
    const artifact = harness.writeArtifact({
      content: `${JSON.stringify({
        actualModelTrainingExecuted: false,
        productionReadyClaim: false,
        revocation,
      }, null, 2)}\n`,
      fileName: 'local-training-permission-revocation.json',
      kind: 'local-training-permission-revocation',
      missionId: mission.id,
      role: 'manager',
      sessionId: session.id,
      title: 'Local Training Permission Revocation',
    });
    store.updateApproval(approval.id, (current) => ({
      ...current,
      metadata: {
        ...current.metadata,
        localTrainingPermission: {
          ...current.metadata.localTrainingPermission,
          revocationArtifactId: artifact.id,
        },
      },
    }));
    const sourceContext = buildSourceContext(session.sourceContext, {
      command: `approval revoke-local-training ${approval.id}`,
      startedBy: localTraining.permission.approvalOwner,
    });
    recordGatewayEvent({
      eventType: 'local-training-permission-revoked',
      mission,
      permissionPolicy: {
        approvalRequired: false,
        decision: 'deny',
        deniedCapabilities: ['local-model-training'],
        policyId: 'local-training-product-permission/v1',
        reason: 'local-training-permission-revoked',
      },
      route: 'approval.revoke-local-training',
      session: store.getSession(session.id),
      sourceContext,
      workspace,
    });
    return {
      ...buildReadModel({
        approval: store.getApproval(approval.id),
        executionApproval: localTraining.executionApproval,
        permission: localTraining.permission,
        revocation,
      }),
      revocationArtifactId: artifact.id,
    };
  }

  function getLocalTrainingPermission(approvalId) {
    const approval = getApproval(approvalId);
    const localTraining = approval.metadata?.localTrainingPermission || {};
    return buildReadModel({
      approval,
      executionApproval: localTraining.executionApproval || null,
      permission: localTraining.permission || null,
      revocation: localTraining.revocation || null,
    });
  }

  return {
    getLocalTrainingPermission,
    requestLocalTrainingPermission,
    resolveLocalTrainingPermission,
    revokeLocalTrainingPermission: revokePermission,
  };
}
