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

  function startSession({ missionId, provider }) {
    return store.saveSession({
      id: createId('session'),
      missionId,
      currentStage: 'manager',
      provider,
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

  function startAgentRun({ missionId, sessionId, role, inputSummary }) {
    const agentRun = store.saveAgentRun({
      id: createId('agentrun'),
      missionId,
      sessionId,
      role,
      status: 'executing',
      inputSummary,
      outputSummary: '',
      artifactIds: [],
      startedAt: now(),
      endedAt: null,
    });

    updateSession(sessionId, {
      agentRunIds: appendUnique(store.getSession(sessionId).agentRunIds, agentRun.id),
      currentStage: role,
    });

    return agentRun;
  }

  function completeAgentRun(runId, { status, outputSummary, artifactIds }) {
    const nextRun = store.updateAgentRun(runId, (agentRun) => ({
      ...agentRun,
      status,
      outputSummary,
      artifactIds,
      endedAt: now(),
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

  function createApproval({ missionId, sessionId, requestedByRole, kind, title, reason }) {
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
    listMemoryEntries,
    resolveApproval,
    startAgentRun,
    startSession,
    touchMission,
    updateSession,
    writeArtifact,
  };
}
