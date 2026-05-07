import { createId } from '../core/id.mjs';

function now() {
  return new Date().toISOString();
}

function appendUnique(list, value) {
  return list.includes(value) ? list : [...list, value];
}

export function createRuntimeHarness({ store }) {
  function touchMission(missionId, status) {
    return store.updateMission(missionId, (mission) => ({
      ...mission,
      status,
      updatedAt: now(),
    }));
  }

  function startSession({ missionId, provider, sourceContext = {} }) {
    return store.saveSession({
      id: createId('session'),
      missionId,
      currentStage: 'manager',
      provider,
      sourceContext,
      status: 'executing',
      agentRunIds: [],
      approvalIds: [],
      artifactIds: [],
      startedAt: now(),
      endedAt: null,
    });
  }

  function updateSession(sessionId, patch) {
    return store.updateSession(sessionId, (session) => ({
      ...session,
      ...patch,
    }));
  }

  function startAgentRun({ missionId, sessionId, role, inputSummary, metadata = {} }) {
    const agentRun = store.saveAgentRun({
      id: createId('agentrun'),
      missionId,
      sessionId,
      role,
      status: 'running',
      inputSummary,
      outputSummary: '',
      artifactIds: [],
      startedAt: now(),
      endedAt: null,
      ...metadata,
    });

    updateSession(sessionId, {
      agentRunIds: appendUnique(store.getSession(sessionId).agentRunIds, agentRun.id),
      currentStage: role,
    });

    return agentRun;
  }

  function completeAgentRun(runId, { status, outputSummary, artifactIds, metadata = {} }) {
    const nextRun = store.updateAgentRun(runId, (agentRun) => ({
      ...agentRun,
      status,
      outputSummary,
      artifactIds,
      endedAt: now(),
      ...metadata,
    }));

    updateSession(nextRun.sessionId, {
      agentRunIds: appendUnique(store.getSession(nextRun.sessionId).agentRunIds, nextRun.id),
    });

    return nextRun;
  }

  function writeArtifact({ missionId, sessionId, role, kind, fileName, title, content }) {
    const artifactPath = store.writeArtifactContent({
      missionId,
      sessionId,
      fileName,
      content,
    });

    const artifact = store.saveArtifact({
      id: createId('artifact'),
      missionId,
      sessionId,
      role,
      kind,
      title,
      fileName,
      path: artifactPath,
      createdAt: now(),
    });

    updateSession(sessionId, {
      artifactIds: appendUnique(store.getSession(sessionId).artifactIds, artifact.id),
    });

    return artifact;
  }

  function classifyRisk({ providerId, explicitProviderSelection, executorOutput }) {
    const reasons = [];
    let approvalRequired = false;
    let kind = null;
    let title = '';

    if (executorOutput?.proposedAction?.requiresApproval) {
      approvalRequired = true;
      kind = 'workspace_execution';
      title = executorOutput.proposedAction.title;
      reasons.push(executorOutput.proposedAction.reason);
    }

    if (providerId !== 'stub' && !explicitProviderSelection) {
      approvalRequired = true;
      kind = kind || 'provider_selection';
      title = title || `Approve provider escalation for ${providerId}`;
      reasons.push(`Provider ${providerId} cannot run implicitly. Select it explicitly before external model use.`);
    }

    return {
      approvalRequired,
      kind,
      title,
      reason: reasons.join(' '),
    };
  }

  function createApproval({ missionId, sessionId, requestedByRole, kind, title, reason, metadata = {} }) {
    const approval = store.saveApproval({
      id: createId('approval'),
      missionId,
      sessionId,
      kind,
      status: 'pending',
      requestedByRole,
      title,
      reason,
      decision: null,
      decisionReason: '',
      metadata,
      createdAt: now(),
      resolvedAt: null,
    });

    updateSession(sessionId, {
      approvalIds: appendUnique(store.getSession(sessionId).approvalIds, approval.id),
    });

    return approval;
  }

  function resolveApproval(approvalId, { decision, reason }) {
    return store.updateApproval(approvalId, (approval) => ({
      ...approval,
      status: decision === 'approve' ? 'approved' : 'rejected',
      decision,
      decisionReason: reason || '',
      resolvedAt: now(),
    }));
  }

  function issueExecutionLease({
    approvalId,
    gitBranch,
    manifestHash,
    missionId,
    mutationBundle = null,
    provider,
    sessionId,
    workspacePath,
  }) {
    return store.saveExecutionLease({
      id: createId('lease'),
      approvalId,
      manifestHash,
      missionId,
      mutationBundle,
      provider,
      sessionId,
      status: 'active',
      workspacePath,
      gitBranch,
      createdAt: now(),
      usedAt: null,
      revokedAt: null,
    });
  }

  function updateExecutionLease(leaseId, patch) {
    return store.updateExecutionLease(leaseId, (lease) => ({
      ...lease,
      ...patch,
      updatedAt: now(),
    }));
  }

  function startExecutionSession({
    approvalId = '',
    leaseId,
    manifest,
    manifestHash,
    missionId,
    mutationBundle = null,
    provider,
    reviewSessionId,
    workspaceId,
    workspacePath,
  }) {
    return store.saveExecutionSession({
      id: createId('execsession'),
      approvalId,
      blockedReasons: [],
      changedFiles: [],
      commandSummary: [],
      createdAt: now(),
      currentStepIndex: -1,
      endedAt: null,
      leaseId,
      logFilePath: null,
      manifest,
      manifestHash,
      missionId,
      mutationAudits: [],
      mutationBundle,
      provider,
      reviewSessionId,
      startedAt: null,
      status: 'pending',
      stopRequested: false,
      steps: Array.isArray(manifest?.steps)
        ? manifest.steps.map((step) => ({
            ...step,
            endedAt: null,
            exitCode: null,
            startedAt: null,
            status: 'pending',
          }))
        : [],
      verification: {
        status: 'pending',
        summary: '',
      },
      workspaceId,
      workspacePath,
    });
  }

  function updateExecutionSession(executionSessionId, patch) {
    return store.updateExecutionSession(executionSessionId, (session) => ({
      ...session,
      ...patch,
      updatedAt: now(),
    }));
  }

  function addMemoryEntry({ scope, scopeId, kind, content }) {
    return store.saveMemoryEntry({
      id: createId('memory'),
      scope,
      scopeId,
      kind,
      content,
      createdAt: now(),
    });
  }

  function listMemoryEntries(filter) {
    return store.listMemoryEntries(filter);
  }

  return {
    addMemoryEntry,
    classifyRisk,
    completeAgentRun,
    createApproval,
    issueExecutionLease,
    listMemoryEntries,
    resolveApproval,
    startAgentRun,
    startExecutionSession,
    startSession,
    touchMission,
    updateExecutionLease,
    updateExecutionSession,
    updateSession,
    writeArtifact,
  };
}
