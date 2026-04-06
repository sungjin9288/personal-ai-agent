import path from 'node:path';

import {
  APPROVAL_DECISIONS,
  GLOBAL_USER_SCOPE_ID,
  KNOWLEDGE_DELIVERABLE_TYPES,
  MEMORY_KINDS,
  MEMORY_SCOPES,
  MISSION_MODES,
  MISSION_STATUSES,
} from './constants.mjs';
import { createDocService } from './doc-service.mjs';
import { createId } from './id.mjs';
import { createRuntimeHarness } from '../harness/runtime-harness.mjs';
import { getMissionPack } from '../packs/index.mjs';
import { createProviderRegistry } from '../providers/index.mjs';

function now() {
  return new Date().toISOString();
}

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function dedupeEntries(entries) {
  const seenIds = new Set();
  return entries.filter((entry) => {
    if (seenIds.has(entry.id)) {
      return false;
    }
    seenIds.add(entry.id);
    return true;
  });
}

function getDefaultDeliverableType(mode, requestedType) {
  if (mode === 'engineering') {
    const normalized = normalizeText(requestedType, 'implementation-proposal');
    if (normalized !== 'implementation-proposal') {
      throw new Error(`Unsupported engineering deliverable type: ${normalized}`);
    }
    return normalized;
  }

  const normalized = normalizeText(requestedType, 'decision-memo');
  if (!KNOWLEDGE_DELIVERABLE_TYPES.includes(normalized)) {
    throw new Error(`Unsupported knowledge deliverable type: ${normalized}`);
  }

  return normalized;
}

function getLatestSession(sessions) {
  if (!sessions.length) {
    return null;
  }

  return [...sessions].sort((left, right) => String(left.startedAt || '').localeCompare(String(right.startedAt || ''))).at(-1);
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items].sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || ''))).at(-1);
}

function sortTimelineEvents(items) {
  return [...items].sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
}

function formatAgentInputSummary({ role, mission, providerId }) {
  return `${role} preparing ${mission.deliverableType} for mission ${mission.id} with provider ${providerId}.`;
}

function formatApprovalResolution(decision, reason) {
  return `# Approval Resolution

## Decision
- decision: ${decision}
- reason: ${reason || 'No explicit reason recorded.'}
`;
}

function formatReviewerFailureMemory({ mission, findings }) {
  return `Reviewer failed ${mission.deliverableType} for mission ${mission.id}: ${findings.join(' | ')}`;
}

function formatApprovalDecisionMemory({ mission, decision, reason }) {
  return `Approval ${decision} for mission ${mission.id} (${mission.deliverableType}): ${reason || 'No explicit reason recorded.'}`;
}

function formatApprovedExecutionReadyBrief({ mission, workspace, approval, deliverableArtifact }) {
  return `# Execution Ready Brief

## Mission
- mission id: ${mission.id}
- title: ${mission.title}
- workspace: ${workspace.name}
- path: ${workspace.path}

## Approval
- approval id: ${approval.id}
- decision: ${approval.decision}
- reason: ${approval.decisionReason || 'No explicit reason recorded.'}

## Approved Deliverable
- artifact: ${deliverableArtifact ? deliverableArtifact.fileName : 'unknown'}
- path: ${deliverableArtifact ? deliverableArtifact.path : 'unknown'}

## Handoff
- the bounded proposal has been reviewed and explicitly approved
- the next execution owner should validate repo-local commands inside ${workspace.path}
- keep verification scoped to the proposal and capture exact evidence before any broader mutation

## Next Action
- open the approved proposal and execute only the bounded path that was reviewed
`;
}

export function createMissionService({ store, rootDir = store.rootDir }) {
  const docService = createDocService({ rootDir });
  const providerRegistry = createProviderRegistry({ rootDir });
  const harness = createRuntimeHarness({ store });

  docService.ensureDocs();

  function addWorkspace({ workspacePath, name }) {
    const normalizedPath = normalizeText(workspacePath);
    if (!normalizedPath) {
      throw new Error('workspacePath is required.');
    }

    const existingWorkspace = store
      .listWorkspaces()
      .find((workspace) => workspace.path === normalizedPath);

    if (existingWorkspace) {
      return existingWorkspace;
    }

    return store.saveWorkspace({
      id: createId('workspace'),
      name: normalizeText(name, path.basename(normalizedPath) || 'workspace'),
      path: normalizedPath,
      createdAt: now(),
    });
  }

  function getWorkspace(workspaceId) {
    const workspace = store.getWorkspace(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace not found: ${workspaceId}`);
    }

    return workspace;
  }

  function createMission(input) {
    const workspace = getWorkspace(input.workspaceId);
    const mode = normalizeText(input.mode, 'knowledge');

    if (!MISSION_MODES.includes(mode)) {
      throw new Error(`Unsupported mode: ${mode}`);
    }

    const createdAt = now();
    const mission = {
      id: createId('mission'),
      workspaceId: workspace.id,
      mode,
      title: normalizeText(input.title, 'Untitled mission'),
      objective: normalizeText(input.objective, 'Clarify the next best move.'),
      constraints: ensureArray(input.constraints)
        .map((item) => normalizeText(item))
        .filter(Boolean),
      deliverableType: getDefaultDeliverableType(mode, input.deliverableType),
      status: 'created',
      createdAt,
      updatedAt: createdAt,
    };

    return store.saveMission(mission);
  }

  function listMissions() {
    return store.listMissions();
  }

  function getMission(missionId) {
    const mission = store.getMission(missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${missionId}`);
    }

    return mission;
  }

  function collectRelevantMemoryEntries({ mission, workspace }) {
    return dedupeEntries([
      ...harness.listMemoryEntries({ scope: 'user', scopeId: GLOBAL_USER_SCOPE_ID }),
      ...harness.listMemoryEntries({ scope: 'workspace', scopeId: workspace.id }),
      ...harness.listMemoryEntries({ scope: 'mission', scopeId: mission.id }),
    ]);
  }

  function runAgentStage({ role, mission, workspace, session, provider, providerId, pack, memoryEntries, previousOutputs }) {
    const promptContent = provider.preparePrompt({
      role,
      mission,
      workspace,
      pack,
      memoryEntries,
      previousOutputs,
    });

    const agentRun = harness.startAgentRun({
      missionId: mission.id,
      sessionId: session.id,
      role,
      inputSummary: formatAgentInputSummary({ role, mission, providerId }),
    });

    const promptArtifact = harness.writeArtifact({
      missionId: mission.id,
      sessionId: session.id,
      role,
      kind: 'prompt',
      fileName: `${role}-prompt.md`,
      title: `${role} prompt`,
      content: promptContent,
    });

    const normalizedOutput = provider.normalizeOutput(
      provider.run({
        role,
        mission,
        workspace,
        pack,
        memoryEntries,
        previousOutputs,
      }),
    );

    const outputArtifact = harness.writeArtifact({
      missionId: mission.id,
      sessionId: session.id,
      role,
      kind: role === 'executor' ? 'deliverable' : 'agent-output',
      fileName: normalizedOutput.artifactFileName,
      title: normalizedOutput.artifactTitle,
      content: normalizedOutput.artifactContent,
    });

    const completedRun = harness.completeAgentRun(agentRun.id, {
      status: normalizedOutput.verdict === 'fail' ? 'failed' : 'completed',
      outputSummary: normalizedOutput.summaryText,
      artifactIds: [promptArtifact.id, outputArtifact.id],
    });

    return {
      artifact: outputArtifact,
      promptArtifact,
      run: completedRun,
      output: normalizedOutput,
    };
  }

  function ensureNoPendingApproval(missionId) {
    const latestSession = getLatestSession(store.listSessionsByMission(missionId));
    if (!latestSession || latestSession.status !== 'awaiting_approval') {
      return;
    }

    const pendingApproval = store
      .listApprovals({ missionId, sessionId: latestSession.id, status: 'pending' })
      .at(-1);

    if (pendingApproval) {
      throw new Error(`Mission ${missionId} is awaiting approval ${pendingApproval.id}. Resolve it before rerunning.`);
    }
  }

  function runMission(missionId, options = {}) {
    const mission = getMission(missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const providerId = normalizeText(options.provider, 'stub');
    const explicitProviderSelection = Boolean(options.providerSpecified);
    const provider = providerRegistry.getProvider(providerId);

    if (!provider.implemented) {
      throw new Error(`Provider not implemented yet: ${providerId}. Use --provider stub for the current milestone.`);
    }

    ensureNoPendingApproval(missionId);

    const pack = getMissionPack({ mission, workspace });
    const memoryEntries = collectRelevantMemoryEntries({ mission, workspace });
    const session = harness.startSession({
      missionId: mission.id,
      provider: providerId,
    });

    const previousOutputs = {};

    const managerStage = runAgentStage({
      role: 'manager',
      mission,
      workspace,
      session,
      provider,
      providerId,
      pack,
      memoryEntries,
      previousOutputs,
    });
    previousOutputs.manager = managerStage.output;

    harness.updateSession(session.id, {
      currentStage: 'planner',
    });

    const plannerStage = runAgentStage({
      role: 'planner',
      mission,
      workspace,
      session,
      provider,
      providerId,
      pack,
      memoryEntries,
      previousOutputs,
    });
    previousOutputs.planner = plannerStage.output;
    harness.touchMission(mission.id, 'planned');

    harness.updateSession(session.id, {
      currentStage: 'executor',
    });

    const executorStage = runAgentStage({
      role: 'executor',
      mission,
      workspace,
      session,
      provider,
      providerId,
      pack,
      memoryEntries,
      previousOutputs,
    });
    previousOutputs.executor = executorStage.output;
    harness.touchMission(mission.id, 'executing');

    harness.updateSession(session.id, {
      currentStage: 'reviewer',
    });

    const reviewerStage = runAgentStage({
      role: 'reviewer',
      mission,
      workspace,
      session,
      provider,
      providerId,
      pack,
      memoryEntries,
      previousOutputs,
    });
    previousOutputs.reviewer = reviewerStage.output;

    if (reviewerStage.output.verdict === 'fail') {
      harness.addMemoryEntry({
        scope: 'mission',
        scopeId: mission.id,
        kind: 'fact',
        content: formatReviewerFailureMemory({
          mission,
          findings: reviewerStage.output.findings,
        }),
      });

      harness.updateSession(session.id, {
        currentStage: 'reviewer',
        status: 'failed',
        endedAt: now(),
      });
      const failedMission = harness.touchMission(mission.id, 'failed');
      const failedSession = store.getSession(session.id);

      return {
        approval: null,
        artifactPath: executorStage.artifact.path,
        mission: failedMission,
        provider: providerId,
        reviewerVerdict: reviewerStage.output.verdict,
        session: failedSession,
      };
    }

    harness.touchMission(mission.id, 'reviewed');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'reviewed',
    });

    const risk = harness.classifyRisk({
      providerId,
      explicitProviderSelection,
      executorOutput: executorStage.output,
    });

    if (risk.approvalRequired) {
      const approval = harness.createApproval({
        missionId: mission.id,
        sessionId: session.id,
        requestedByRole: 'reviewer',
        kind: risk.kind,
        title: risk.title,
        reason: risk.reason,
      });

      const awaitingMission = harness.touchMission(mission.id, 'awaiting_approval');
      harness.updateSession(session.id, {
        currentStage: 'reviewer',
        status: 'awaiting_approval',
      });

      return {
        approval,
        artifactPath: executorStage.artifact.path,
        mission: awaitingMission,
        provider: providerId,
        reviewerVerdict: reviewerStage.output.verdict,
        session: store.getSession(session.id),
      };
    }

    const completedMission = harness.touchMission(mission.id, 'completed');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'completed',
      endedAt: now(),
    });

    return {
      approval: null,
      artifactPath: executorStage.artifact.path,
      mission: completedMission,
      provider: providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
    };
  }

  function summarizeSession(session, missionId) {
    const agentRuns = store.listAgentRunsBySession(session.id);
    const approvals = store.listApprovals({ missionId, sessionId: session.id });
    const artifacts = store.listArtifactsBySession(session.id);
    const latestApproval = getLatestItem(approvals, 'createdAt');
    const latestArtifact = getLatestItem(artifacts, 'createdAt');
    const reviewerRun = agentRuns.find((run) => run.role === 'reviewer') || null;

    return {
      agentRunCount: agentRuns.length,
      approvalCount: approvals.length,
      currentStage: session.currentStage,
      endedAt: session.endedAt,
      id: session.id,
      latestApprovalStatus: latestApproval ? latestApproval.status : null,
      latestArtifactFileName: latestArtifact ? latestArtifact.fileName : null,
      provider: session.provider,
      reviewerStatus: reviewerRun ? reviewerRun.status : null,
      reviewerSummary: reviewerRun ? reviewerRun.outputSummary : null,
      startedAt: session.startedAt,
      status: session.status,
    };
  }

  function summarizeMission(mission) {
    const sessions = listSessions(mission.id);
    const approvals = store.listApprovals({ missionId: mission.id });
    const memoryEntries = store.listMemoryEntries({ scope: 'mission', scopeId: mission.id });
    const latestSession = sessions.at(-1) || null;

    return {
      approvalCounts: {
        approved: approvals.filter((approval) => approval.status === 'approved').length,
        pending: approvals.filter((approval) => approval.status === 'pending').length,
        rejected: approvals.filter((approval) => approval.status === 'rejected').length,
        total: approvals.length,
      },
      id: mission.id,
      latestSession,
      memoryCounts: {
        decision: memoryEntries.filter((entry) => entry.kind === 'decision').length,
        fact: memoryEntries.filter((entry) => entry.kind === 'fact').length,
        preference: memoryEntries.filter((entry) => entry.kind === 'preference').length,
        total: memoryEntries.length,
      },
      sessionCount: sessions.length,
      status: mission.status,
      updatedAt: mission.updatedAt,
    };
  }

  function listMissionSummariesByWorkspace(workspaceId) {
    return store
      .listMissions()
      .filter((mission) => mission.workspaceId === workspaceId)
      .map((mission) => ({
        mission,
        summary: summarizeMission(mission),
      }))
      .sort((left, right) => String(left.mission.updatedAt || '').localeCompare(String(right.mission.updatedAt || '')));
  }

  function getWorkspaceOverview(workspaceId) {
    const workspace = getWorkspace(workspaceId);
    const missionEntries = listMissionSummariesByWorkspace(workspace.id);
    const workspaceMemoryEntries = store.listMemoryEntries({ scope: 'workspace', scopeId: workspace.id });
    const missionCounts = Object.fromEntries(MISSION_STATUSES.map((status) => [status, 0]));
    const approvalCounts = { approved: 0, pending: 0, rejected: 0, total: 0 };
    const memoryCounts = {
      workspaceScoped: workspaceMemoryEntries.length,
      missionScoped: 0,
      total: workspaceMemoryEntries.length,
    };

    for (const entry of missionEntries) {
      missionCounts[entry.mission.status] += 1;
      approvalCounts.approved += entry.summary.approvalCounts.approved;
      approvalCounts.pending += entry.summary.approvalCounts.pending;
      approvalCounts.rejected += entry.summary.approvalCounts.rejected;
      approvalCounts.total += entry.summary.approvalCounts.total;
      memoryCounts.missionScoped += entry.summary.memoryCounts.total;
      memoryCounts.total += entry.summary.memoryCounts.total;
    }

    const latestMissionEntry = missionEntries.at(-1) || null;

    return {
      missions: missionEntries,
      summary: {
        activeMissionIds: missionEntries
          .filter((entry) => !['completed', 'failed'].includes(entry.mission.status))
          .map((entry) => entry.mission.id),
        approvalCounts,
        latestMission: latestMissionEntry
          ? {
              mission: latestMissionEntry.mission,
              summary: latestMissionEntry.summary,
            }
          : null,
        memoryCounts,
        missionCount: missionEntries.length,
        missionCounts,
        sessionCount: missionEntries.reduce((count, entry) => count + entry.summary.sessionCount, 0),
        workspaceId: workspace.id,
      },
      workspace,
    };
  }

  function buildApprovalInboxItems(filter = {}) {
    const approvals = store.listApprovals({ status: 'pending' });

    return approvals
      .map((approval) => {
        const mission = store.getMission(approval.missionId);
        const workspace = mission ? store.getWorkspace(mission.workspaceId) : null;
        const session = store.getSession(approval.sessionId);

        if (!mission || !workspace || !session) {
          return null;
        }

        if (filter.workspaceId && workspace.id !== filter.workspaceId) {
          return null;
        }

        if (filter.missionId && mission.id !== filter.missionId) {
          return null;
        }

        return {
          approvalId: approval.id,
          createdAt: approval.createdAt,
          decision: approval.decision,
          deliverableType: mission.deliverableType,
          kind: approval.kind,
          missionId: mission.id,
          missionStatus: mission.status,
          missionTitle: mission.title,
          mode: mission.mode,
          reason: approval.reason,
          requestedByRole: approval.requestedByRole,
          resolveCommand: `node src/cli.mjs approval resolve ${approval.id} --decision <approve|reject> --reason "<reason>"`,
          sessionId: session.id,
          sessionStatus: session.status,
          title: approval.title,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        };
      })
      .filter(Boolean)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function getApprovalInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }

    const items = buildApprovalInboxItems(filter);
    const byWorkspace = {};

    for (const item of items) {
      byWorkspace[item.workspaceId] = (byWorkspace[item.workspaceId] || 0) + 1;
    }

    return {
      items,
      summary: {
        pendingCount: items.length,
        workspaceCounts: byWorkspace,
      },
    };
  }

  function getGlobalOverview() {
    const workspaceOverviews = store.listWorkspaces().map((workspace) => getWorkspaceOverview(workspace.id));
    const missionCounts = Object.fromEntries(MISSION_STATUSES.map((status) => [status, 0]));
    const approvalCounts = { approved: 0, pending: 0, rejected: 0, total: 0 };
    const memoryCounts = { missionScoped: 0, total: 0, workspaceScoped: 0 };
    const inbox = buildApprovalInboxItems();

    for (const overview of workspaceOverviews) {
      for (const status of MISSION_STATUSES) {
        missionCounts[status] += overview.summary.missionCounts[status];
      }

      approvalCounts.approved += overview.summary.approvalCounts.approved;
      approvalCounts.pending += overview.summary.approvalCounts.pending;
      approvalCounts.rejected += overview.summary.approvalCounts.rejected;
      approvalCounts.total += overview.summary.approvalCounts.total;

      memoryCounts.workspaceScoped += overview.summary.memoryCounts.workspaceScoped;
      memoryCounts.missionScoped += overview.summary.memoryCounts.missionScoped;
      memoryCounts.total += overview.summary.memoryCounts.total;

      void overview;
    }

    return {
      inbox,
      summary: {
        activeWorkspaceIds: workspaceOverviews
          .filter((overview) => overview.summary.activeMissionIds.length > 0)
          .map((overview) => overview.workspace.id),
        approvalCounts,
        inboxCount: inbox.length,
        memoryCounts,
        missionCount: workspaceOverviews.reduce((count, overview) => count + overview.summary.missionCount, 0),
        missionCounts,
        sessionCount: workspaceOverviews.reduce((count, overview) => count + overview.summary.sessionCount, 0),
        workspaceCount: workspaceOverviews.length,
      },
      workspaces: workspaceOverviews.map((overview) => ({
        summary: overview.summary,
        workspace: overview.workspace,
      })),
    };
  }

  function buildMissionTimeline(mission) {
    const sessions = listSessions(mission.id);
    const approvals = store.listApprovals({ missionId: mission.id });
    const memoryEntries = store.listMemoryEntries({ scope: 'mission', scopeId: mission.id });
    const timeline = [
      {
        at: mission.createdAt,
        detail: `${mission.mode} mission created.`,
        kind: 'mission-created',
        missionId: mission.id,
      },
    ];

    for (const session of sessions) {
      timeline.push({
        at: session.startedAt,
        detail: `Session started with provider ${session.provider}.`,
        kind: 'session-started',
        missionId: mission.id,
        sessionId: session.id,
        status: session.status,
      });

      if (session.endedAt) {
        timeline.push({
          at: session.endedAt,
          detail: `Session ended with status ${session.status}.`,
          kind: 'session-ended',
          missionId: mission.id,
          sessionId: session.id,
          status: session.status,
        });
      }
    }

    for (const approval of approvals) {
      timeline.push({
        approvalId: approval.id,
        at: approval.createdAt,
        detail: approval.title,
        kind: 'approval-requested',
        missionId: mission.id,
        sessionId: approval.sessionId,
        status: approval.status,
      });

      if (approval.resolvedAt) {
        timeline.push({
          approvalId: approval.id,
          at: approval.resolvedAt,
          detail: approval.decisionReason || 'Approval resolved.',
          kind: 'approval-resolved',
          missionId: mission.id,
          sessionId: approval.sessionId,
          status: approval.status,
        });
      }
    }

    for (const entry of memoryEntries) {
      timeline.push({
        at: entry.createdAt,
        detail: entry.content,
        kind: 'memory-recorded',
        memoryId: entry.id,
        memoryKind: entry.kind,
        missionId: mission.id,
      });
    }

    return sortTimelineEvents(timeline);
  }

  function listSessions(missionId) {
    const mission = getMission(missionId);
    return store.listSessionsByMission(mission.id).map((session) => summarizeSession(session, mission.id));
  }

  function showSession(missionId, options = {}) {
    const mission = getMission(missionId);
    const session = options.sessionId
      ? store.getSession(options.sessionId)
      : getLatestSession(store.listSessionsByMission(mission.id));

    if (!session) {
      throw new Error(`No session found for mission: ${mission.id}`);
    }
    if (session.missionId !== mission.id) {
      throw new Error(`Session ${session.id} does not belong to mission ${mission.id}.`);
    }

    return {
      agentRuns: store.listAgentRunsBySession(session.id),
      approvals: store.listApprovals({ missionId: mission.id, sessionId: session.id }),
      artifacts: store.listArtifactsBySession(session.id),
      mission,
      summary: summarizeSession(session, mission.id),
      session,
    };
  }

  function listApprovals(filter = {}) {
    return store.listApprovals(filter);
  }

  function resolveApproval(approvalId, { decision, reason = '' }) {
    if (!APPROVAL_DECISIONS.includes(decision)) {
      throw new Error(`Unsupported approval decision: ${decision}`);
    }

    const approval = store.getApproval(approvalId);
    if (!approval) {
      throw new Error(`Approval not found: ${approvalId}`);
    }
    if (approval.status !== 'pending') {
      throw new Error(`Approval ${approvalId} is already resolved.`);
    }

    const mission = getMission(approval.missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const session = store.getSession(approval.sessionId);
    if (!session) {
      throw new Error(`Session not found for approval: ${approval.sessionId}`);
    }

    const deliverableArtifact =
      store
        .listArtifactsBySession(session.id)
        .filter((artifact) => artifact.kind === 'deliverable')
        .at(-1) || null;

    const resolvedApproval = harness.resolveApproval(approvalId, { decision, reason });
    const resolutionArtifact = harness.writeArtifact({
      missionId: mission.id,
      sessionId: session.id,
      role: 'manager',
      kind: 'approval-resolution',
      fileName: 'approval-resolution.md',
      title: 'Approval Resolution',
      content: formatApprovalResolution(decision, reason),
    });

    if (decision === 'approve') {
      const handoffArtifact = harness.writeArtifact({
        missionId: mission.id,
        sessionId: session.id,
        role: 'manager',
        kind: 'execution-handoff',
        fileName: 'execution-ready-brief.md',
        title: 'Execution Ready Brief',
        content: formatApprovedExecutionReadyBrief({
          mission,
          workspace,
          approval: resolvedApproval,
          deliverableArtifact,
        }),
      });

      harness.addMemoryEntry({
        scope: 'mission',
        scopeId: mission.id,
        kind: 'decision',
        content: formatApprovalDecisionMemory({ mission, decision, reason }),
      });

      const completedMission = harness.touchMission(mission.id, 'completed');
      harness.updateSession(session.id, {
        currentStage: 'reviewer',
        status: 'completed',
        endedAt: now(),
      });

      return {
        approval: resolvedApproval,
        artifactPath: handoffArtifact.path,
        resolutionArtifactPath: resolutionArtifact.path,
        mission: completedMission,
        session: store.getSession(session.id),
      };
    }

    harness.addMemoryEntry({
      scope: 'mission',
      scopeId: mission.id,
      kind: 'decision',
      content: formatApprovalDecisionMemory({ mission, decision, reason }),
    });

    const failedMission = harness.touchMission(mission.id, 'failed');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'failed',
      endedAt: now(),
    });

    return {
      approval: resolvedApproval,
      artifactPath: resolutionArtifact.path,
      mission: failedMission,
      session: store.getSession(session.id),
    };
  }

  function addMemory({ scope, scopeId, kind, content }) {
    if (!MEMORY_SCOPES.includes(scope)) {
      throw new Error(`Unsupported memory scope: ${scope}`);
    }
    if (!MEMORY_KINDS.includes(kind)) {
      throw new Error(`Unsupported memory kind: ${kind}`);
    }
    if (!normalizeText(content)) {
      throw new Error('Memory content is required.');
    }

    if (scope === 'workspace') {
      getWorkspace(scopeId);
    }
    if (scope === 'mission') {
      getMission(scopeId);
    }

    return harness.addMemoryEntry({
      scope,
      scopeId,
      kind,
      content: normalizeText(content),
    });
  }

  function listMemory(filter = {}) {
    return store.listMemoryEntries(filter);
  }

  function logDocument({ type, title, content }) {
    const normalizedTitle = normalizeText(title);
    const normalizedContent = normalizeText(content);

    if (!normalizedTitle) {
      throw new Error('Document log title is required.');
    }
    if (!normalizedContent) {
      throw new Error('Document log content is required.');
    }

    return {
      path: docService.logDocument({
        type,
        title: normalizedTitle,
        content: normalizedContent,
      }),
      title: normalizedTitle,
      type,
    };
  }

  function showMission(missionId) {
    const mission = getMission(missionId);
    return {
      mission,
      summary: summarizeMission(mission),
      sessions: listSessions(mission.id),
    };
  }

  function getMissionTimeline(missionId) {
    const mission = getMission(missionId);
    return {
      mission,
      summary: summarizeMission(mission),
      timeline: buildMissionTimeline(mission),
    };
  }

  return {
    addMemory,
    addWorkspace,
    createMission,
    getApprovalInbox,
    getGlobalOverview,
    getWorkspace,
    getWorkspaceOverview,
    getMissionTimeline,
    listApprovals,
    listMemory,
    listMissions,
    listSessions,
    logDocument,
    resolveApproval,
    runMission,
    showMission,
    showSession,
  };
}
