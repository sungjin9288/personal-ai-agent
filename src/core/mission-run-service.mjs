import {
  APPROVAL_DECISIONS,
  GLOBAL_USER_SCOPE_ID,
  SPECIALIST_KINDS,
} from './constants.mjs';
import { createId } from './id.mjs';
import {
  buildFallbackSpecialistHandoff,
  normalizeSpecialistHandoff,
} from './specialist-handoff.mjs';
import { buildRetrievalContextWithCorpus } from './retrieval-service.mjs';
import { formatRetrievalArtifactContent } from './retrieval-artifacts.mjs';
import {
  applyWorkspaceLearningSelection,
  buildWorkspaceLearningSelectionOverrides,
  formatWorkspaceLearningSelectionArtifact,
  selectWorkspaceLearningMemory,
} from './workspace-learning-selection.mjs';
import {
  applyUserLearningSelection,
  formatUserLearningSelectionArtifact,
  selectUserLearningMemory,
} from './user-learning-selection.mjs';
import { getMissionPack } from '../packs/index.mjs';
import {
  extractProviderFailure,
  isProviderFailureError,
  roundUsdAmount,
} from '../providers/provider-runtime-utils.mjs';
import {
  normalizeProviderAttemptHistory,
  normalizeProviderFailureKind,
  normalizeTelemetryNumber,
} from './provider-telemetry.mjs';
import {
  evaluateParallelQualityGate,
  parseMissionConstraintDirectives,
  resolveMissionParallelPlan,
} from './mission-parallel-plan.mjs';
import {
  buildMissionStageFailure,
  buildMissionStageRequest,
  buildParallelSpecialistRetryPlan,
  buildParallelStageMetadata,
} from './mission-stage-pipeline.mjs';
import {
  buildApprovalRequest,
  buildExecutionManifestArtifact,
  buildMissionCloseoutResult,
  buildReviewerFollowUpSeed,
  buildReviewerReconciliation,
} from './mission-review-closeout.mjs';
import {
  buildMissionProviderFallbackPlan,
  buildProviderFallbackSummary,
  normalizeProviderFallbackIds,
  normalizeProviderFallbackPolicy,
} from './provider-fallback-policy.mjs';
import {
  buildProviderFallbackAttemptOptions,
  buildProviderFallbackAttemptRecord,
} from './provider-fallback-attempt.mjs';
import {
  formatApprovalDecisionMemory,
  formatApprovalResolution,
  formatApprovedExecutionReadyBrief,
  formatReviewerFailureMemory,
} from './reminder-formatters.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function getLatestSession(sessions) {
  if (!sessions.length) {
    return null;
  }

  return [...sessions]
    .sort((left, right) => String(left.startedAt || '').localeCompare(String(right.startedAt || '')))
    .at(-1);
}

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  return normalized === 'executing' ? 'running' : normalized;
}

function normalizeStringList(items) {
  return ensureArray(items).map((item) => normalizeText(item)).filter(Boolean);
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

function extractOrchestrationProfileMetadata(item) {
  const profileId = normalizeText(item?.orchestrationProfileId).toLowerCase();
  if (!profileId) {
    return null;
  }

  return {
    deliverableTypes: normalizeStringList(item?.orchestrationProfileDeliverableTypes),
    description: normalizeText(item?.orchestrationProfileDescription) || null,
    displayName: normalizeText(item?.orchestrationProfileDisplayName, profileId),
    harnessPatterns: normalizeStringList(item?.orchestrationProfileHarnessPatterns),
    id: profileId,
    mergeOwner: normalizeText(item?.orchestrationProfileMergeOwner) || null,
    mode: normalizeText(item?.orchestrationProfileMode) || null,
    parallelSpecialistKinds: normalizeStringList(item?.orchestrationProfileParallelSpecialistKinds).filter((kind) =>
      SPECIALIST_KINDS.includes(kind),
    ),
    qualityGate: normalizeText(item?.orchestrationProfileQualityGate) || null,
    recommendedProvider: normalizeText(item?.orchestrationProfileRecommendedProvider) || null,
    runtimeBlueprint: normalizeText(item?.orchestrationProfileRuntimeBlueprint) || null,
    retryPolicy: normalizeText(item?.orchestrationProfileRetryPolicy) || null,
    source: normalizeText(item?.orchestrationProfileSource) || null,
  };
}

function getLatestOrchestrationProfileMetadata(items, getTimestamp) {
  let latest = null;

  for (const item of ensureArray(items)) {
    const metadata = extractOrchestrationProfileMetadata(item);
    if (!metadata) {
      continue;
    }

    const at = normalizeText(getTimestamp(item));
    if (!latest || String(latest.at) <= at) {
      latest = {
        at,
        metadata,
      };
    }
  }

  return latest?.metadata || null;
}

const MISSION_ATTACHMENT_MAX_PROMPT_ATTACHMENTS = 5;
const MISSION_ATTACHMENT_MAX_PROMPT_CHARS = 12_000;
const MISSION_ATTACHMENT_MAX_PROMPT_CHARS_PER_FILE = 3_000;

function getRunArtifactFilePrefix({ role, specialistKind }) {
  const normalizedSpecialistKind = normalizeText(specialistKind);
  if (role === 'specialist' && normalizedSpecialistKind) {
    return `specialist-${normalizedSpecialistKind}`;
  }

  return normalizeText(role, 'agent');
}

function evaluateArtifactContent({ artifactContent, pack }) {
  const content = normalizeText(artifactContent);
  const requiredSections = ensureArray(pack?.requiredSections);
  const missingSections = requiredSections.filter((sectionName) => !content.includes(`## ${sectionName}`));
  const findings = missingSections.map((sectionName) => `Missing required section: ${sectionName}`);
  const checks = [{
    id: 'required-sections',
    description: `Required sections present: ${requiredSections.join(', ') || 'none'}`,
    passed: missingSections.length === 0,
  }];

  for (const rule of ensureArray(pack?.reviewRules)) {
    const passed = Boolean(rule?.pattern?.test(content));
    checks.push({
      id: normalizeText(rule?.id, 'rule'),
      description: normalizeText(rule?.description, 'review rule'),
      passed,
    });
    if (!passed) {
      findings.push(normalizeText(rule?.message, 'Review rule failed.'));
    }
  }

  return {
    verdict: findings.length ? 'fail' : 'pass',
    findings,
    checks,
  };
}

function formatAgentInputSummary({ role, mission, providerId }) {
  return `${role} preparing ${mission.deliverableType} for mission ${mission.id} with provider ${providerId}.`;
}

function normalizeSessionSourceContext(value = {}) {
  const sourceType = normalizeText(value.sourceType, 'service');
  const sourceContext = {
    channel: normalizeText(value.channel) || sourceType,
    channelAdapterId: normalizeText(value.channelAdapterId) || null,
    channelAdapterPolicyId: normalizeText(value.channelAdapterPolicyId) || null,
    channelAdapterStatus: normalizeText(value.channelAdapterStatus) || null,
    channelAdapterStopReason: normalizeText(value.channelAdapterStopReason) || null,
    command: normalizeText(value.command),
    externalMessagingEnabled: value.externalMessagingEnabled === true,
    requestId: normalizeText(value.requestId),
    route: normalizeText(value.route),
    sourceType,
    startedBy: normalizeText(value.startedBy),
  };

  if (value.providerFallbackRequested) {
    return {
      ...sourceContext,
      providerFallbackAttempt: Number.isFinite(Number(value.providerFallbackAttempt))
        ? Number(value.providerFallbackAttempt)
        : null,
      providerFallbackAttemptCount: Number.isFinite(Number(value.providerFallbackAttemptCount))
        ? Number(value.providerFallbackAttemptCount)
        : null,
      providerFallbackFallbacks: ensureArray(value.providerFallbackFallbacks).map((providerId) => normalizeText(providerId)),
      providerFallbackPolicy: normalizeProviderFallbackPolicy(value.providerFallbackPolicy),
      providerFallbackPrimary: normalizeText(value.providerFallbackPrimary),
      providerFallbackRequested: true,
    };
  }

  return sourceContext;
}

export function createMissionRunService({
  attachProviderFallbackSummary,
  buildExecutionContext,
  completeExecutionLeaseApproval,
  createReviewerFollowUpRecord,
  emitLearningCandidate,
  fileSystem,
  getMission,
  getWorkspace,
  harness,
  isExecutionCapableMission,
  now,
  providerRegistry,
  recordGatewayEvent,
  retrievalRuntime,
  store,
  workspaceLearningClock = now,
}) {
  function collectRelevantMemoryEntries({ mission, workspace }) {
    return dedupeEntries([
      ...harness.listMemoryEntries({ scope: 'user', scopeId: GLOBAL_USER_SCOPE_ID }),
      ...harness.listMemoryEntries({ scope: 'workspace', scopeId: workspace.id }),
      ...harness.listMemoryEntries({ scope: 'mission', scopeId: mission.id }),
    ]);
  }

  function collectMissionAttachmentContext(missionId) {
    const attachments = store.listMissionAttachments({ missionId }).slice(-MISSION_ATTACHMENT_MAX_PROMPT_ATTACHMENTS);
    let remainingChars = MISSION_ATTACHMENT_MAX_PROMPT_CHARS;

    return attachments
      .map((attachment) => {
        if (!remainingChars) {
          return null;
        }

        let content = '';
        try {
          content = fileSystem.readFileSync(attachment.path, 'utf8');
        } catch {
          content = '';
        }

        const promptContent = String(content || '').slice(
          0,
          Math.min(MISSION_ATTACHMENT_MAX_PROMPT_CHARS_PER_FILE, remainingChars),
        );

        remainingChars = Math.max(remainingChars - promptContent.length, 0);

        return {
          ...attachment,
          promptContent,
        };
      })
      .filter((attachment) => attachment && normalizeText(attachment.promptContent));
  }

  function getParallelSpecialistKinds(mission) {
    return resolveMissionParallelPlan(mission).effectiveKinds;
  }

  function getLatestParallelGroupState(missionId) {
    const runs = store
      .loadState()
      .agentRuns.filter((run) => run.missionId === missionId && normalizeText(run.parallelGroupId));

    if (!runs.length) {
      return null;
    }

    const latestGroupById = new Map();
    for (const run of runs) {
      const groupId = normalizeText(run.parallelGroupId);
      const at = String(run.endedAt || run.startedAt || '');
      const current = latestGroupById.get(groupId);
      if (!current || String(current.at) <= at) {
        latestGroupById.set(groupId, {
          at,
          groupId,
        });
      }
    }
    const latestGroupId =
      [...latestGroupById.values()]
        .sort((left, right) => String(left.at).localeCompare(String(right.at)))
        .at(-1)?.groupId || null;
    if (!latestGroupId) {
      return null;
    }

    const groupRuns = runs.filter((run) => run.parallelGroupId === latestGroupId);
    const latestByKind = new Map();
    const mergeRuns = [];

    for (const run of groupRuns) {
      if (normalizeText(run.stageKind) === 'parallel-merge') {
        mergeRuns.push(run);
        continue;
      }

      const specialistKind = normalizeText(run.specialistKind);
      if (!specialistKind) {
        continue;
      }

      const current = latestByKind.get(specialistKind);
      const currentAt = String(current?.endedAt || current?.startedAt || '');
      const nextAt = String(run.endedAt || run.startedAt || '');
      if (!current || currentAt <= nextAt) {
        latestByKind.set(specialistKind, run);
      }
    }

    const latestMergeRun =
      [...mergeRuns].sort((left, right) =>
        String(left.endedAt || left.startedAt || '').localeCompare(String(right.endedAt || right.startedAt || '')),
      ).at(-1) || null;
    const orchestrationProfile = getLatestOrchestrationProfileMetadata(groupRuns, (run) => run.endedAt || run.startedAt || '');
    const requiredKinds = latestMergeRun?.parallelRequiredKinds?.length
      ? ensureArray(latestMergeRun.parallelRequiredKinds)
      : [...new Set(groupRuns.flatMap((run) => ensureArray(run.parallelRequiredKinds).concat(normalizeText(run.specialistKind))))]
          .filter(Boolean)
          .filter((kind) => SPECIALIST_KINDS.includes(kind));
    const latestRuns = [...latestByKind.values()];
    const qualityGate = evaluateParallelQualityGate({
      latestByKind,
      orchestrationProfile,
      requiredKinds,
    });
    const unresolvedRuns = latestRuns.filter((run) => ['blocked', 'failed'].includes(normalizeAgentRunStatus(run.status)));

    return {
      latestMergeRun,
      latestRuns,
      orchestrationProfile,
      parallelGroupId: latestGroupId,
      qualityGate,
      requiredKinds,
      unresolvedRuns,
      wasMerged: Boolean(latestMergeRun && ['completed', 'merged'].includes(normalizeAgentRunStatus(latestMergeRun.status))),
    };
  }

  function buildParallelGroupStates(filter = {}) {
    const state = store.loadState();
    const missionById = new Map(state.missions.map((mission) => [mission.id, mission]));
    const sessionById = new Map(state.sessions.map((session) => [session.id, session]));
    const workspaceById = new Map(state.workspaces.map((workspace) => [workspace.id, workspace]));
    const groups = new Map();

    for (const run of ensureArray(state.agentRuns)) {
      const parallelGroupId = normalizeText(run.parallelGroupId);
      if (!parallelGroupId) {
        continue;
      }
      if (filter.parallelGroupId && parallelGroupId !== filter.parallelGroupId) {
        continue;
      }
      const mission = missionById.get(run.missionId) || null;
      const workspace = mission ? workspaceById.get(mission.workspaceId) || null : null;
      if (filter.missionId && mission?.id !== filter.missionId) {
        continue;
      }
      if (filter.workspaceId && workspace?.id !== filter.workspaceId) {
        continue;
      }

      const current = groups.get(parallelGroupId) || {
        mission,
        orchestrationProfile: null,
        orchestrationProfileAt: '',
        parallelGroupId,
        requiredKinds: [],
        runs: [],
        sessionById,
        workspace,
      };
      current.runs.push(run);
      current.requiredKinds = [
        ...new Set(
          [...current.requiredKinds, ...ensureArray(run.parallelRequiredKinds), normalizeText(run.specialistKind)]
            .filter(Boolean)
            .filter((kind) => SPECIALIST_KINDS.includes(kind)),
        ),
      ];
      const orchestrationProfile = extractOrchestrationProfileMetadata(run);
      const orchestrationProfileAt = normalizeText(run.endedAt || run.startedAt || '');
      if (orchestrationProfile && (!current.orchestrationProfile || String(current.orchestrationProfileAt) <= orchestrationProfileAt)) {
        current.orchestrationProfile = orchestrationProfile;
        current.orchestrationProfileAt = orchestrationProfileAt;
      }
      groups.set(parallelGroupId, current);
    }

    return [...groups.values()].map((group) => {
      const latestByKind = new Map();
      let latestMergeRun = null;

      for (const run of group.runs) {
        if (normalizeText(run.stageKind) === 'parallel-merge') {
          const currentAt = String(latestMergeRun?.endedAt || latestMergeRun?.startedAt || '');
          const nextAt = String(run.endedAt || run.startedAt || '');
          if (!latestMergeRun || currentAt <= nextAt) {
            latestMergeRun = run;
          }
          continue;
        }

        const specialistKind = normalizeText(run.specialistKind);
        if (!specialistKind) {
          continue;
        }
        const current = latestByKind.get(specialistKind);
        const currentAt = String(current?.endedAt || current?.startedAt || '');
        const nextAt = String(run.endedAt || run.startedAt || '');
        if (!current || currentAt <= nextAt) {
          latestByKind.set(specialistKind, run);
        }
      }

      const latestRuns = [...latestByKind.values()];
      const qualityGate = evaluateParallelQualityGate({
        latestByKind,
        orchestrationProfile: group.orchestrationProfile,
        requiredKinds: group.requiredKinds,
      });
      const unresolvedRuns = latestRuns.filter((run) => ['blocked', 'failed'].includes(normalizeAgentRunStatus(run.status)));

      return {
        latestByKind,
        latestMergeRun,
        latestRuns,
        mission: group.mission,
        orchestrationProfile: group.orchestrationProfile,
        parallelGroupId: group.parallelGroupId,
        qualityGate,
        requiredKinds: group.requiredKinds,
        runs: group.runs,
        unresolvedRuns,
        wasMerged: Boolean(
          latestMergeRun && ['completed', 'merged'].includes(normalizeAgentRunStatus(latestMergeRun.status)),
        ),
        workspace: group.workspace,
      };
    });
  }

  function getRunArtifact(run, kind = 'deliverable') {
    const artifactId = ensureArray(run?.artifactIds)
      .map((artifactId) => store.getArtifact(artifactId))
      .filter(Boolean)
      .find((artifact) => artifact.kind === kind)?.id;

    return artifactId ? store.getArtifact(artifactId) : null;
  }

  function buildSpecialistOutputEntry(run) {
    const artifact = getRunArtifact(run);
    const artifactContent = artifact?.path && fileSystem.existsSync(artifact.path) ? fileSystem.readFileSync(artifact.path, 'utf8') : '';
    const specialistKind = normalizeText(run.specialistKind);
    const status = normalizeAgentRunStatus(run.status);
    const handoff =
      normalizeSpecialistHandoff(run.specialistHandoff, {
        nextAction: `Use the ${specialistKind} specialist branch in the next manager merge decision.`,
        recommendedOwner: 'workspace-owner',
        summaryText: normalizeText(run.outputSummary),
      }) ||
      buildFallbackSpecialistHandoff({
        specialistKind,
        status,
        summaryText: normalizeText(run.outputSummary),
      });

    return {
      artifactId: artifact?.id || null,
      content: artifactContent,
      handoff,
      path: artifact?.path || null,
      runId: run.id,
      specialistKind,
      status,
      summaryText: normalizeText(run.outputSummary, handoff?.currentState || ''),
    };
  }

  function finalizeMissionFailure({ mission, session, currentStage, artifactPath = null, providerId, reviewerVerdict = null }) {
    harness.updateSession(session.id, {
      currentStage,
      status: 'failed',
      endedAt: now(),
    });
    const failedMission = harness.touchMission(mission.id, 'failed');
    const workspace = getWorkspace(mission.workspaceId);
    const learningCandidate = emitLearningCandidate({
      mission: failedMission,
      missionStatus: failedMission.status,
      outcomeReason: `Mission failed during ${currentStage}.`,
      providerId,
      reviewerVerdict,
      session: store.getSession(session.id),
      workspace,
    });

    return {
      approval: null,
      artifactPath,
      learningCandidate,
      mission: failedMission,
      provider: providerId,
      reviewerVerdict,
      session: store.getSession(session.id),
    };
  }

  function applySpecialistOutcomeDirective({ mission, parallelGroupId, requiredKinds, runStage }) {
    const directives = parseMissionConstraintDirectives(mission);
    const specialistKind = normalizeText(runStage.run.specialistKind);
    const baseStatus = normalizeAgentRunStatus(runStage.run.status);

    if (!specialistKind || !['completed', 'failed'].includes(baseStatus)) {
      return runStage;
    }

    let nextStatus = baseStatus;
    let nextSummary = runStage.run.outputSummary;
    let nextHandoff =
      normalizeSpecialistHandoff(runStage.run.specialistHandoff, {
        nextAction: `Review the ${specialistKind} specialist branch before merge.`,
        recommendedOwner: 'workspace-owner',
        summaryText: runStage.run.outputSummary,
      }) ||
      buildFallbackSpecialistHandoff({
        specialistKind,
        status: baseStatus,
        summaryText: runStage.run.outputSummary,
      });

    if (directives.specialistAbandonKinds.includes(specialistKind)) {
      nextStatus = 'abandoned';
      nextSummary = `${nextSummary} Specialist branch was intentionally abandoned for ${specialistKind}.`.trim();
    } else if (directives.specialistBlockKinds.includes(specialistKind)) {
      nextStatus = 'blocked';
      nextSummary = `${nextSummary} Specialist branch is blocked and requires follow-up for ${specialistKind}.`.trim();
    } else if (directives.specialistFailKinds.includes(specialistKind) && baseStatus !== 'failed') {
      nextStatus = 'failed';
      nextSummary = `${nextSummary} Specialist branch failed deterministic validation for ${specialistKind}.`.trim();
    }

    if (nextStatus === baseStatus && nextSummary === runStage.run.outputSummary) {
      return runStage;
    }

    nextHandoff = normalizeSpecialistHandoff(
      {
        ...nextHandoff,
        blockers:
          nextStatus === 'blocked' || nextStatus === 'failed'
            ? [...new Set([...(nextHandoff?.blockers || []), nextSummary].filter(Boolean))]
            : nextHandoff?.blockers || [],
        currentState: nextSummary,
        deliverables:
          nextStatus === 'abandoned'
            ? [...new Set([...(nextHandoff?.deliverables || []), `${specialistKind} branch was intentionally abandoned.`])]
            : nextHandoff?.deliverables || [],
        nextHandoff: {
          ...(nextHandoff?.nextHandoff || {}),
          recommendedOwner: 'workspace-owner',
          request:
            nextStatus === 'completed'
              ? `Merge the ${specialistKind} specialist artifact into the manager-controlled executor draft.`
              : `Resolve the ${specialistKind} specialist ${nextStatus} state before merge.`,
        },
      },
      {
        nextAction: `Resolve the ${specialistKind} specialist ${nextStatus} state before merge.`,
        recommendedOwner: 'workspace-owner',
        summaryText: nextSummary,
      },
    );

    const updatedRun = store.updateAgentRun(runStage.run.id, (current) => ({
      ...current,
      mergeStatus: nextStatus === 'completed' ? 'pending' : normalizeText(current.mergeStatus, 'pending'),
      outputSummary: nextSummary,
      parallelGroupId,
      parallelRequiredKinds: requiredKinds,
      specialistHandoff: nextHandoff,
      status: nextStatus,
      updatedAt: now(),
    }));

    return {
      ...runStage,
      output: runStage.output
        ? {
            ...runStage.output,
            specialistHandoff: nextHandoff,
            summaryText: nextSummary,
          }
        : runStage.output,
      run: updatedRun,
    };
  }

  function markParallelGroupBranchesMerged(parallelGroupId) {
    for (const run of store.loadState().agentRuns.filter((item) => item.parallelGroupId === parallelGroupId && item.specialistKind)) {
      if (!['completed', 'abandoned'].includes(normalizeAgentRunStatus(run.status))) {
        continue;
      }
      store.updateAgentRun(run.id, (current) => ({
        ...current,
        mergeStatus: 'merged',
      }));
    }
  }

  async function runAgentStage({
    role,
    providerRole = role,
    mission,
    workspace,
    session,
    provider,
    providerId,
    pack,
    attachments,
    memoryEntries,
    previousOutputs,
    runMetadata = {},
    outputFileName = null,
    outputTitle = null,
    promptFileName = null,
    workspaceLearningSelectionOverrides = [],
  }) {
    const artifactFilePrefix = getRunArtifactFilePrefix({
      role,
      specialistKind: runMetadata.specialistKind,
    });
    const retrievalInput = {
      attachments,
      memoryEntries,
      mission,
      pack,
      previousOutputs,
      providerRole,
      role,
      workspace,
    };
    const rawRetrieval = retrievalRuntime
      ? await retrievalRuntime.retrieve(retrievalInput)
      : buildRetrievalContextWithCorpus(retrievalInput);
    const workspaceLearningSelection = selectWorkspaceLearningMemory({
      memoryEntries,
      retrievalCorpusRecords: rawRetrieval.corpusRecords,
      selectionOverrides: workspaceLearningSelectionOverrides,
      workspaceId: workspace.id,
    });
    const workspaceFilteredContext = applyWorkspaceLearningSelection({
      memoryEntries,
      retrievalContext: rawRetrieval.items,
      retrievalCorpusRecords: rawRetrieval.corpusRecords,
      selection: workspaceLearningSelection,
      workspaceId: workspace.id,
    });
    const userLearningSelection = selectUserLearningMemory({
      memoryEntries: workspaceFilteredContext.memoryEntries,
      retrievalCorpusRecords: workspaceFilteredContext.retrievalCorpusRecords,
    });
    const providerContext = applyUserLearningSelection({
      memoryEntries: workspaceFilteredContext.memoryEntries,
      retrievalContext: workspaceFilteredContext.retrievalContext,
      retrievalCorpusRecords: workspaceFilteredContext.retrievalCorpusRecords,
      selection: userLearningSelection,
    });
    const {
      memoryEntries: providerMemoryEntries,
      retrievalContext,
      retrievalCorpusRecords,
    } = providerContext;
    const providerInput = {
      attachments,
      role,
      providerRole,
      mission,
      workspace,
      pack,
      memoryEntries: providerMemoryEntries,
      retrievalContext,
      sessionSourceContext: session.sourceContext || normalizeSessionSourceContext(),
      previousOutputs,
      parallelGroupId: normalizeText(runMetadata.parallelGroupId) || null,
      parallelRequiredKinds: ensureArray(runMetadata.parallelRequiredKinds),
      resumeFromRunId: normalizeText(runMetadata.resumeFromRunId) || null,
      specialistKind: normalizeText(runMetadata.specialistKind) || null,
      specialistMergeMode: normalizeText(runMetadata.stageKind) === 'parallel-merge',
      userLearningSelection,
      workspaceLearningSelection,
    };
    const promptContent = await provider.preparePrompt(providerInput);

    const agentRun = harness.startAgentRun({
      missionId: mission.id,
      sessionId: session.id,
      role,
      inputSummary: formatAgentInputSummary({ role, mission, providerId }),
      metadata: {
        providerId,
        workflowRole: providerRole,
        ...runMetadata,
      },
    });

    const promptArtifact = harness.writeArtifact({
      missionId: mission.id,
      sessionId: session.id,
      role,
      kind: 'prompt',
      fileName: promptFileName || `${artifactFilePrefix}-prompt.md`,
      title: `${role} prompt`,
      content: promptContent,
    });
    const workspaceLearningSelectionArtifact =
      role === 'planner' && workspaceLearningSelection.status === 'selected'
        ? harness.writeArtifact({
            missionId: mission.id,
            sessionId: session.id,
            role,
            kind: 'learning-selection',
            fileName: `${artifactFilePrefix}-workspace-learning-selection.json`,
            title: `${role} workspace learning selection`,
            content: formatWorkspaceLearningSelectionArtifact(workspaceLearningSelection),
          })
        : null;
    const userLearningSelectionArtifact =
      role === 'planner' && userLearningSelection.status === 'selected'
        ? harness.writeArtifact({
            missionId: mission.id,
            sessionId: session.id,
            role,
            kind: 'learning-selection',
            fileName: `${artifactFilePrefix}-user-learning-selection.json`,
            title: `${role} user learning selection`,
            content: formatUserLearningSelectionArtifact(userLearningSelection),
          })
        : null;
    const retrievalArtifact = retrievalContext.length
      ? harness.writeArtifact({
          missionId: mission.id,
          sessionId: session.id,
          role,
          kind: 'retrieval',
          fileName: `${artifactFilePrefix}-retrieval.md`,
          title: `${role} retrieval context`,
          content: formatRetrievalArtifactContent({
            providerRole,
            retrievalContext,
            retrievalCorpusRecords,
            role,
            specialistKind: normalizeText(runMetadata.specialistKind),
          }),
        })
      : null;

    try {
      const providerOutput = await provider.run(providerInput);
      const normalizedOutput = provider.normalizeOutput(providerOutput, providerInput);
      const specialistHandoff =
        role === 'specialist'
          ? normalizeSpecialistHandoff(normalizedOutput.specialistHandoff, {
              nextAction: normalizedOutput.nextAction,
              recommendedOwner: 'workspace-owner',
              summaryText: normalizedOutput.summaryText,
            }) ||
            buildFallbackSpecialistHandoff({
              nextAction: normalizedOutput.nextAction,
              specialistKind: normalizeText(runMetadata.specialistKind) || 'implementation',
              status: 'completed',
              summaryText: normalizedOutput.summaryText,
            })
          : null;

      const outputArtifact = harness.writeArtifact({
        missionId: mission.id,
        sessionId: session.id,
        role,
        kind: role === 'executor' || role === 'specialist' ? 'deliverable' : 'agent-output',
        fileName: outputFileName || normalizedOutput.artifactFileName,
        title: outputTitle || normalizedOutput.artifactTitle,
        content: normalizedOutput.artifactContent,
      });

      const completedRun = harness.completeAgentRun(agentRun.id, {
        status: normalizedOutput.verdict === 'fail' ? 'failed' : 'completed',
        outputSummary: normalizedOutput.summaryText,
        artifactIds: [
          promptArtifact.id,
          workspaceLearningSelectionArtifact?.id,
          userLearningSelectionArtifact?.id,
          retrievalArtifact?.id,
          outputArtifact.id,
        ].filter(Boolean),
        metadata: {
          attemptCount: Number(providerOutput?.attemptCount || 1),
          attemptHistory: normalizeProviderAttemptHistory(providerOutput?.attemptHistory),
          durationMs: normalizeTelemetryNumber(providerOutput?.durationMs),
          estimatedCostUsd: roundUsdAmount(providerOutput?.estimatedCostUsd),
          providerId,
          providerResponseId: normalizeText(providerOutput?.providerResponseId) || null,
          retryCount: Number(providerOutput?.retryCount || 0),
          usageInputTokens: normalizeTelemetryNumber(providerOutput?.usageInputTokens),
          usageOutputTokens: normalizeTelemetryNumber(providerOutput?.usageOutputTokens),
          usageTotalTokens: normalizeTelemetryNumber(providerOutput?.usageTotalTokens),
          workflowRole: providerRole,
          adaptationNotes: ensureArray(normalizedOutput.adaptationNotes),
          executionManifest: ensureObject(normalizedOutput.executionManifest),
          nextAction: normalizeText(normalizedOutput.nextAction),
          planSteps: ensureArray(normalizedOutput.planSteps),
          ...runMetadata,
          specialistHandoff,
          specialistRootRunId:
            normalizeText(runMetadata.specialistKind) && !normalizeText(runMetadata.specialistRootRunId)
              ? agentRun.id
              : runMetadata.specialistRootRunId || null,
        },
      });

      return {
        artifact: outputArtifact,
        error: null,
        promptArtifact,
        retrievalArtifact,
        run: completedRun,
        output: normalizedOutput,
      };
    } catch (error) {
      const failure = extractProviderFailure(error);
      const failedRun = harness.completeAgentRun(agentRun.id, {
        status: 'failed',
        outputSummary: failure.message,
        artifactIds: [
          promptArtifact.id,
          workspaceLearningSelectionArtifact?.id,
          userLearningSelectionArtifact?.id,
          retrievalArtifact?.id,
        ].filter(Boolean),
        metadata: {
          attemptCount: Number(failure.attemptCount || 1),
          attemptHistory: normalizeProviderAttemptHistory(failure.attemptHistory),
          durationMs: normalizeTelemetryNumber(failure.durationMs),
          estimatedCostUsd: roundUsdAmount(failure.estimatedCostUsd),
          failureKind: normalizeProviderFailureKind(failure.failureKind),
          httpStatus: Number.isFinite(Number(failure.httpStatus)) ? Number(failure.httpStatus) : null,
          providerId,
          providerResponseId: normalizeText(failure.providerResponseId) || null,
          rawMessage: normalizeText(failure.rawMessage) || null,
          recoverable: typeof failure.recoverable === 'boolean' ? failure.recoverable : null,
          retryCount: Number(failure.retryCount || 0),
          timedOut: Boolean(failure.timedOut),
          usageInputTokens: normalizeTelemetryNumber(failure.usageInputTokens),
          usageOutputTokens: normalizeTelemetryNumber(failure.usageOutputTokens),
          usageTotalTokens: normalizeTelemetryNumber(failure.usageTotalTokens),
          workflowRole: providerRole,
          ...runMetadata,
          specialistHandoff:
            role === 'specialist'
              ? buildFallbackSpecialistHandoff({
                  nextAction: `Resolve the ${normalizeText(runMetadata.specialistKind) || 'specialist'} branch failure before merge.`,
                  specialistKind: normalizeText(runMetadata.specialistKind) || 'implementation',
                  status: 'failed',
                  summaryText: failure.message,
                })
              : null,
          specialistRootRunId:
            normalizeText(runMetadata.specialistKind) && !normalizeText(runMetadata.specialistRootRunId)
              ? agentRun.id
              : runMetadata.specialistRootRunId || null,
        },
      });

      return {
        artifact: null,
        error: isProviderFailureError(error) ? error : error,
        promptArtifact,
        retrievalArtifact,
        run: failedRun,
        output: null,
      };
    }
  }

  async function runRequiredMissionStage({ artifactPath = null, currentStage, stageRequest }) {
    const stage = await runAgentStage(stageRequest);
    const failure = buildMissionStageFailure({
      artifactPath,
      currentStage,
      mission: stageRequest.mission,
      providerId: stageRequest.providerId,
      session: stageRequest.session,
      stage,
    });

    return {
      failure: failure ? finalizeMissionFailure(failure) : null,
      stage,
    };
  }

  function reconcileMissionReviewerStage({ deterministicReview, reviewerStage }) {
    const reconciliation = buildReviewerReconciliation({
      deterministicReview,
      reviewerStage,
      updatedAt: now(),
    });
    if (!reconciliation) {
      return reviewerStage;
    }

    if (reviewerStage.artifact?.path) {
      fileSystem.writeFileSync(reviewerStage.artifact.path, reconciliation.output.artifactContent, 'utf8');
    }
    if (reviewerStage.artifact?.id) {
      store.updateArtifact(reviewerStage.artifact.id, (current) => ({
        ...current,
        title: normalizeText(current.title, 'Reviewer Report'),
      }));
    }
    const updatedRun = store.updateAgentRun(reviewerStage.run.id, (current) => ({
      ...current,
      ...reconciliation.runPatch,
    }));

    return {
      ...reviewerStage,
      output: reconciliation.output,
      run: updatedRun,
    };
  }

  function finalizeReviewerFailure({ artifactPath, mission, providerId, reviewerStage, session, workspace }) {
    const followUpAt = reviewerStage.artifact.createdAt || now();
    createReviewerFollowUpRecord(
      buildReviewerFollowUpSeed({
        at: followUpAt,
        mission,
        reviewerStage,
        session,
        workspace,
      }),
    );
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
    const learningCandidate = emitLearningCandidate({
      mission: failedMission,
      missionStatus: failedMission.status,
      outcomeReason: reviewerStage.run.outputSummary,
      providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: failedSession,
      workspace,
    });

    return buildMissionCloseoutResult({
      artifactPath,
      learningCandidate,
      mission: failedMission,
      providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
    });
  }

  function finalizeExecutionCapableReview({ artifactPath, mission, providerId, reviewerStage, session, workspace }) {
    const execution = buildExecutionContext(mission.id);
    const manifestArtifact = buildExecutionManifestArtifact({
      executionContext: execution,
      generatedAt: now(),
      mission,
      session,
      workspace,
    });
    if (manifestArtifact) {
      harness.writeArtifact(manifestArtifact);
    }

    const learningCandidate = emitLearningCandidate({
      mission,
      missionStatus: mission.status,
      outcomeReason: 'Mission review completed and execution manifest was prepared.',
      providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
      workspace,
    });

    return buildMissionCloseoutResult({
      artifactPath,
      execution,
      learningCandidate,
      mission,
      providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
    });
  }

  function finalizeAwaitingApprovalReview({
    artifactPath,
    mission,
    providerId,
    reviewerStage,
    risk,
    session,
    workspace,
  }) {
    const approval = harness.createApproval(buildApprovalRequest({ mission, risk, session }));
    const awaitingMission = harness.touchMission(mission.id, 'awaiting_approval');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'awaiting_approval',
    });
    const learningCandidate = emitLearningCandidate({
      mission: awaitingMission,
      missionStatus: awaitingMission.status,
      outcomeReason: risk.reason,
      providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
      workspace,
    });

    return buildMissionCloseoutResult({
      approval,
      artifactPath,
      learningCandidate,
      mission: awaitingMission,
      providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
    });
  }

  function finalizeCompletedReview({ artifactPath, mission, providerId, reviewerStage, session, workspace }) {
    const completedMission = harness.touchMission(mission.id, 'completed');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      status: 'completed',
      endedAt: now(),
    });
    const learningCandidate = emitLearningCandidate({
      mission: completedMission,
      missionStatus: completedMission.status,
      outcomeReason: 'Mission completed successfully.',
      providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
      workspace,
    });

    return buildMissionCloseoutResult({
      artifactPath,
      learningCandidate,
      mission: completedMission,
      providerId,
      reviewerVerdict: reviewerStage.output.verdict,
      session: store.getSession(session.id),
    });
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

  function resolveMissionProviderFallbackPlan(options = {}) {
    const primaryProviderId = normalizeText(options.provider) || providerRegistry.getDefaultProviderId();
    const explicitPolicyId = normalizeText(options.fallbackPolicy || options.providerFallbackPolicy);
    const requestedFallbackProviderIds = normalizeProviderFallbackIds(
      options.fallbackProvider || options.fallbackProviders || options.providerFallback,
    );
    const providerIds = [];

    for (const providerId of [primaryProviderId, ...requestedFallbackProviderIds]) {
      const provider = providerRegistry.getProvider(providerId);
      if (!provider.implemented) {
        throw new Error(`Provider not implemented yet: ${providerId}. Use --provider stub for the current milestone.`);
      }
      if (!providerIds.includes(providerId)) {
        providerIds.push(providerId);
      }
    }

    return buildMissionProviderFallbackPlan({
      explicitPolicyId,
      providerIds,
    });
  }

  function getSessionProviderFailureSummary(sessionId) {
    const failedRuns = store
      .listAgentRunsBySession(sessionId)
      .filter((run) => normalizeAgentRunStatus(run.status) === 'failed')
      .filter((run) => normalizeText(run.metadata?.failureKind || run.failureKind));
    const latestFailedRun = failedRuns.at(-1) || null;

    if (!latestFailedRun) {
      return null;
    }

    return {
      attemptCount: Number.isFinite(Number(latestFailedRun.metadata?.attemptCount || latestFailedRun.attemptCount))
        ? Number(latestFailedRun.metadata?.attemptCount || latestFailedRun.attemptCount)
        : 1,
      failureKind: normalizeProviderFailureKind(latestFailedRun.metadata?.failureKind || latestFailedRun.failureKind),
      httpStatus: Number.isFinite(Number(latestFailedRun.metadata?.httpStatus || latestFailedRun.httpStatus))
        ? Number(latestFailedRun.metadata?.httpStatus || latestFailedRun.httpStatus)
        : null,
      rawMessage: normalizeText(
        latestFailedRun.metadata?.rawMessage || latestFailedRun.rawMessage || latestFailedRun.outputSummary,
      ),
      recoverable:
        typeof latestFailedRun.metadata?.recoverable === 'boolean'
          ? latestFailedRun.metadata.recoverable
          : typeof latestFailedRun.recoverable === 'boolean'
            ? latestFailedRun.recoverable
            : null,
      retryCount: Number.isFinite(Number(latestFailedRun.metadata?.retryCount || latestFailedRun.retryCount))
        ? Number(latestFailedRun.metadata?.retryCount || latestFailedRun.retryCount)
        : 0,
      role: normalizeText(latestFailedRun.role),
      runId: latestFailedRun.id,
      timedOut: Boolean(latestFailedRun.metadata?.timedOut || latestFailedRun.timedOut),
    };
  }

  async function runMissionAttempt(missionId, options = {}) {
    const mission = getMission(missionId);
    const workspace = getWorkspace(mission.workspaceId);
    const providerId = normalizeText(options.provider) || providerRegistry.getDefaultProviderId();
    const explicitProviderSelection = Boolean(options.providerSpecified);
    const provider = providerRegistry.getProvider(providerId);

    if (!provider.implemented) {
      throw new Error(`Provider not implemented yet: ${providerId}. Use --provider stub for the current milestone.`);
    }

    ensureNoPendingApproval(missionId);

    const pack = getMissionPack({ mission, workspace });
    const attachments = collectMissionAttachmentContext(mission.id);
    const memoryEntries = collectRelevantMemoryEntries({ mission, workspace });
    const workspaceLearningSelectionOverrides = buildWorkspaceLearningSelectionOverrides({
      learningCandidates: store.listLearningCandidates({ workspaceId: workspace.id }),
      observedAt: workspaceLearningClock(),
      workspaceId: workspace.id,
    });
    const parallelPlan = resolveMissionParallelPlan(mission);
    const parallelSpecialistKinds = parallelPlan.effectiveKinds;
    const previousParallelGroup = parallelSpecialistKinds.length >= 2 ? getLatestParallelGroupState(mission.id) : null;
    const shouldRunParallelSpecialists = parallelSpecialistKinds.length >= 2;
    let session = harness.startSession({
      missionId: mission.id,
      provider: providerId,
      sourceContext: normalizeSessionSourceContext(options.sourceContext),
    });
    const gatewayRecord = recordGatewayEvent({
      eventType: 'mission-run',
      mission,
      providerId,
      route: normalizeText(options.sourceContext?.route, 'mission.run'),
      session,
      sourceContext: options.sourceContext,
      workspace,
    });
    session = gatewayRecord.session || session;

    const previousOutputs = {};
    const stageContext = {
      attachments,
      memoryEntries,
      mission,
      pack,
      previousOutputs,
      provider,
      providerId,
      session,
      workspace,
      workspaceLearningSelectionOverrides,
    };

    const managerResult = await runRequiredMissionStage({
      currentStage: 'manager',
      stageRequest: buildMissionStageRequest({ context: stageContext, role: 'manager' }),
    });
    if (managerResult.failure) {
      return managerResult.failure;
    }
    previousOutputs.manager = managerResult.stage.output;

    harness.updateSession(session.id, {
      currentStage: 'planner',
    });

    const plannerResult = await runRequiredMissionStage({
      currentStage: 'planner',
      stageRequest: buildMissionStageRequest({ context: stageContext, role: 'planner' }),
    });
    if (plannerResult.failure) {
      return plannerResult.failure;
    }
    const plannerStage = plannerResult.stage;
    previousOutputs.planner = plannerStage.output;
    harness.touchMission(mission.id, 'planned');

    let executorArtifactPath = null;
    let executorOutput = null;

    if (shouldRunParallelSpecialists) {
      const parallelGroupId =
        previousParallelGroup && !previousParallelGroup.wasMerged
          ? previousParallelGroup.parallelGroupId
          : createId('parallel-group');
      const specialistRetryPlan = buildParallelSpecialistRetryPlan({
        parallelSpecialistKinds,
        previousParallelGroup,
      });

      previousOutputs.specialists = specialistRetryPlan.completedRuns.map((run) => buildSpecialistOutputEntry(run));

      harness.updateSession(session.id, {
        currentStage: 'specialist',
      });

      for (const specialistKind of specialistRetryPlan.specialistKindsToRun) {
        const previousBranchRun = specialistRetryPlan.previousRunByKind[specialistKind] || null;
        const stage = await runAgentStage(
          buildMissionStageRequest({
            context: stageContext,
            role: 'specialist',
            stageOptions: {
              providerRole: 'executor',
              promptFileName: `specialist-${specialistKind}-prompt.md`,
              outputFileName: `specialist-${specialistKind}-${pack.artifactFileName}`,
              outputTitle: `${specialistKind} specialist ${pack.artifactTitle}`,
              runMetadata: buildParallelStageMetadata({
                parallelGroupId,
                parallelPlan,
                parallelSpecialistKinds,
                parentRunId: plannerStage.run.id,
                previousBranchRun,
                specialistKind,
                stageKind: 'specialist-branch',
              }),
            },
          }),
        );
        const normalizedStage = applySpecialistOutcomeDirective({
          mission,
          parallelGroupId,
          requiredKinds: parallelSpecialistKinds,
          runStage: stage,
        });
        if (['completed', 'abandoned'].includes(normalizeAgentRunStatus(normalizedStage.run.status))) {
          previousOutputs.specialists.push(buildSpecialistOutputEntry(normalizedStage.run));
        }
      }

      const latestParallelGroup = getLatestParallelGroupState(mission.id);
      const unresolvedRuns = ensureArray(latestParallelGroup?.unresolvedRuns);
      const qualityGateRerunCount = Number(latestParallelGroup?.qualityGate?.rerunKinds?.length || 0);
      if (unresolvedRuns.length || qualityGateRerunCount > 0) {
        return finalizeMissionFailure({
          artifactPath: previousOutputs.specialists.at(-1)?.path || null,
          currentStage: 'specialist',
          mission,
          providerId,
          session,
        });
      }

      previousOutputs.specialists = ensureArray(latestParallelGroup?.latestRuns)
        .filter((run) => ['completed', 'abandoned'].includes(normalizeAgentRunStatus(run.status)))
        .map((run) => buildSpecialistOutputEntry(run));
      previousOutputs.specialistMergeMode = true;

      harness.updateSession(session.id, {
        currentStage: 'executor',
      });

      const executorResult = await runRequiredMissionStage({
        currentStage: 'executor',
        stageRequest: buildMissionStageRequest({
          context: stageContext,
          role: 'executor',
          stageOptions: {
            runMetadata: buildParallelStageMetadata({
              parallelGroupId,
              parallelPlan,
              parallelSpecialistKinds,
              parentRunId: plannerStage.run.id,
              stageKind: 'parallel-merge',
            }),
          },
        }),
      });
      if (executorResult.failure) {
        return executorResult.failure;
      }
      const executorStage = executorResult.stage;

      markParallelGroupBranchesMerged(parallelGroupId);
      executorArtifactPath = executorStage.artifact.path;
      executorOutput = executorStage.output;
      previousOutputs.executor = executorStage.output;
    } else {
      harness.updateSession(session.id, {
        currentStage: 'executor',
      });

      const executorResult = await runRequiredMissionStage({
        currentStage: 'executor',
        stageRequest: buildMissionStageRequest({ context: stageContext, role: 'executor' }),
      });
      if (executorResult.failure) {
        return executorResult.failure;
      }
      const executorStage = executorResult.stage;

      executorArtifactPath = executorStage.artifact.path;
      executorOutput = executorStage.output;
      previousOutputs.executor = executorStage.output;
    }

    harness.touchMission(mission.id, 'executing');

    harness.updateSession(session.id, {
      currentStage: 'reviewer',
    });

    const reviewerResult = await runRequiredMissionStage({
      artifactPath: executorArtifactPath,
      currentStage: 'reviewer',
      stageRequest: buildMissionStageRequest({ context: stageContext, role: 'reviewer' }),
    });
    if (reviewerResult.failure) {
      return reviewerResult.failure;
    }
    const deterministicReview = evaluateArtifactContent({
      artifactContent: executorOutput?.artifactContent || '',
      pack,
    });
    const reviewerStage = reconcileMissionReviewerStage({
      deterministicReview,
      reviewerStage: reviewerResult.stage,
    });
    previousOutputs.reviewer = reviewerStage.output;

    if (reviewerStage.output.verdict === 'fail') {
      return finalizeReviewerFailure({
        artifactPath: executorArtifactPath,
        mission,
        providerId,
        reviewerStage,
        session,
        workspace,
      });
    }

    const executionCapable = isExecutionCapableMission(mission, workspace);
    const reviewedMission = harness.touchMission(mission.id, 'reviewed');
    harness.updateSession(session.id, {
      currentStage: 'reviewer',
      endedAt: executionCapable ? now() : null,
      status: executionCapable ? 'completed' : 'reviewed',
    });

    if (executionCapable) {
      return finalizeExecutionCapableReview({
        artifactPath: executorArtifactPath,
        mission: reviewedMission,
        providerId,
        reviewerStage,
        session,
        workspace,
      });
    }

    const risk = harness.classifyRisk({
      providerId,
      explicitProviderSelection,
      executorOutput,
    });

    if (risk.approvalRequired) {
      return finalizeAwaitingApprovalReview({
        artifactPath: executorArtifactPath,
        mission,
        providerId,
        reviewerStage,
        risk,
        session,
        workspace,
      });
    }

    return finalizeCompletedReview({
      artifactPath: executorArtifactPath,
      mission,
      providerId,
      reviewerStage,
      session,
      workspace,
    });
  }

  async function runMission(missionId, options = {}) {
    const fallbackPlan = resolveMissionProviderFallbackPlan(options);

    if (!fallbackPlan.enabled) {
      return runMissionAttempt(missionId, {
        ...options,
        provider: fallbackPlan.primaryProviderId,
      });
    }

    const fallbackMission = getMission(missionId);
    const fallbackWorkspace = getWorkspace(fallbackMission.workspaceId);
    const attempts = [];
    let latestResult = null;

    for (const [index, providerId] of fallbackPlan.providerIds.entries()) {
      const result = await runMissionAttempt(
        missionId,
        buildProviderFallbackAttemptOptions({ fallbackPlan, index, options, providerId }),
      );
      const providerFailure = getSessionProviderFailureSummary(result.session.id);
      const attempt = buildProviderFallbackAttemptRecord({
        fallbackMission,
        fallbackPlan,
        fallbackWorkspace,
        index,
        providerFailure,
        providerId,
        result,
      });

      latestResult = result;
      attempts.push(attempt);

      if (!attempt.fallbackEligible) {
        return attachProviderFallbackSummary(
          result,
          buildProviderFallbackSummary({
            attempts,
            fallbackProviderIds: fallbackPlan.fallbackProviderIds,
            policyId: fallbackPlan.policyId,
            primaryProviderId: fallbackPlan.primaryProviderId,
            result,
          }),
        );
      }
    }

    return attachProviderFallbackSummary(
      latestResult,
      buildProviderFallbackSummary({
        attempts,
        fallbackProviderIds: fallbackPlan.fallbackProviderIds,
        policyId: fallbackPlan.policyId,
        primaryProviderId: fallbackPlan.primaryProviderId,
        result: latestResult,
      }),
    );
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

    if (normalizeText(approval.kind) === 'execution_lease') {
      return completeExecutionLeaseApproval({
        approval: resolvedApproval,
        decision,
        mission,
        reason,
        resolutionArtifactPath: resolutionArtifact.path,
        session,
        workspace,
      });
    }

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


  return {
    buildParallelGroupStates,
    collectMissionAttachmentContext,
    collectRelevantMemoryEntries,
    getLatestParallelGroupState,
    getParallelSpecialistKinds,
    getSessionProviderFailureSummary,
    listApprovals,
    resolveApproval,
    runMission,
  };
}
