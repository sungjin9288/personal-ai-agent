import path from 'node:path';

import {
  AGENT_RUN_STATUSES,
  MISSION_MODES,
  MISSION_STATUSES,
  SPECIALIST_KINDS,
} from './constants.mjs';
import {
  buildApprovalActionItem,
  buildBlockedFollowUpActionItem,
  buildMaintenanceActionItem,
} from './action-item-builders.mjs';
import {
  buildGatewayEventAuditRecord,
  buildIdentitySessionAuditRecord,
  summarizeGatewayEventAudit,
  summarizeIdentitySessionAudit,
} from './audit-records.mjs';
import {
  buildChannelAdapterRegistry,
  getChannelAdapter as getRegisteredChannelAdapter,
} from './channel-adapter-registry.mjs';
import {
  enrichEscalation,
  summarizeEscalations,
} from './escalation-analytics.mjs';
import {
  formatEscalationOwnerChangeDetail,
  formatEscalationOwnerHandoffDetail,
  formatEscalationOwnerHandoffReminderDetail,
  formatEscalationReminderDetail,
} from './escalation-handoff.mjs';
import { summarizeSpecialistFollowUpItems } from './follow-up-analytics.mjs';
import {
  buildMaintenanceLatestMonthlyBucketDelta,
  buildMaintenanceMonthlyBuckets,
  isMaintenanceRunEffective,
  isMaintenanceRunImpactful,
  summarizeMaintenanceImpact,
  summarizeMaintenancePressure,
  summarizeMaintenanceRuns,
} from './maintenance-analytics.mjs';
import {
  buildHarnessDocumentBrowseResult,
  buildHarnessMemoryBrowseResult,
} from './mission-harness-browse.mjs';
import { buildMissionHarnessSummary } from './mission-harness-summary.mjs';
import {
  getOrchestrationQualityGateRequiredKinds,
  resolveMissionParallelPlan,
} from './mission-parallel-plan.mjs';
import {
  buildMissionSummary,
  buildSessionSummary,
} from './mission-summary-read-model.mjs';
import {
  ORCHESTRATION_PROFILE_ADOPTION_DRIFT_REASON_CODES,
  ORCHESTRATION_PROFILE_HEALTH_DRIFT_REASON_CODES,
  ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES,
  ORCHESTRATION_PROFILE_WORKSPACE_ADOPTION_DRIFT_REASON_CODES,
  summarizeOrchestrationProfileAdoptionDrift,
  summarizeOrchestrationProfileHealthDrift,
  summarizeOrchestrationProfileOverviewItems,
  summarizeOrchestrationProfileUsageEntries,
  summarizeOrchestrationProfileUsageTrend,
  summarizeOrchestrationProfileWorkspaceUsageTrend,
  summarizeOrchestrationWorkspaceProfileFootprintTrend,
  summarizeWorkspaceAdoptionDrift,
  summarizeWorkspaceAdoptionDriftEntries,
  summarizeWorkspaceHealthDriftEntries,
  summarizeWorkspaceUsageTrendEntries,
} from './orchestration-analytics.mjs';
import { listOrchestrationProfiles } from './orchestration-profiles.mjs';
import { buildProviderExecutionTimeline } from './provider-execution-summary.mjs';
import {
  formatLearningPromotionStopConditionReminderDetail,
  formatReviewerFollowUpResolutionDetail,
  formatSpecialistFollowUpReminderDetail,
} from './reminder-formatters.mjs';
import {
  compareRetrievalPreviewWithLatestArtifact,
  summarizeStoredRetrievalArtifact,
} from './retrieval-artifacts.mjs';
import { summarizeMissionRetrievalPreview } from './retrieval-service.mjs';
import {
  buildMissionGatewayTimelineEvents,
  buildMissionMaintenanceTimelineEvents,
  buildOperatorGatewayTimelineEvents,
  buildOperatorMaintenanceTimelineEvents,
} from './timeline-assembly.mjs';
import {
  buildGlobalOperatorTimelineReadModel,
  buildMissionTimelineReadModel,
  buildWorkspaceTimelineReadModel,
} from './timeline-read-model.mjs';
import { getMissionPack } from '../packs/index.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function normalizeTimestampFilter(value, label) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return '';
  }

  const timestamp = Date.parse(normalized);
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Invalid ${label}: ${normalized}`);
  }

  return new Date(timestamp).toISOString();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function getUtcMonthStartTimestamp(value) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    return '';
  }

  const date = new Date(parsed);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
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

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  if (normalized === 'executing') {
    return 'running';
  }
  return normalized;
}

export function createMissionReadService({
  buildParallelGroupStates,
  buildProviderFallbackTimelineEvents,
  buildProviderAttentionOpenedTimeline,
  buildProviderAttentionPendingItems,
  buildProviderAttentionRecoveredItems,
  buildProviderAttentionRecoveredTimeline,
  buildProviderAttentionReminderTimeline,
  buildProviderAttentionTimeline,
  buildProviderExecutionEntries,
  buildScopedProviderRecentWindow,
  buildSpecialistFollowUpItems,
  collectMissionAttachmentContext,
  collectRelevantMemoryEntries,
  docService,
  factGraph,
  fileSystem,
  getActionInbox,
  getExecutionStatus,
  getMission,
  getParallelSpecialistKinds,
  getProviderOverview,
  getWorkspace,
  harness,
  listReviewerFollowUpRecords,
  now,
  providerRegistry,
  rootDir,
  store,
  summarizeMissionProviderActivity,
  summarizeMissionProviderFallback,
  summarizeProviderHealthDrift,
  summarizeWorkspaceProviderActivity,
  syncEscalations,
}) {
  function listChannelAdapters(filter = {}) {
    return buildChannelAdapterRegistry(filter);
  }

  function getChannelAdapter(adapterId) {
    const adapter = getRegisteredChannelAdapter(adapterId);
    if (!adapter) {
      throw new Error(`Channel adapter not found: ${adapterId}`);
    }

    return adapter;
  }

  function buildSpecialistFollowUpReminderTimeline(records) {
    return records.map((record) => ({
      actionId: record.actionId,
      at: record.remindedAt || record.createdAt || null,
      detail: formatSpecialistFollowUpReminderDetail(record),
      kind: 'specialist-follow-up-reminded',
      missionId: record.missionId || null,
      parallelGroupId: record.parallelGroupId || null,
      providerId: record.providerId || null,
      runId: record.runId || null,
      sessionId: record.sessionId || null,
      specialistKind: record.specialistKind || null,
      status: record.status || null,
      workspaceId: record.workspaceId || null,
      workspaceName: record.workspaceName || null,
    }));
  }

  function summarizeScopedParallelActivity(filter = {}) {
    const groups = buildParallelGroupStates(filter);
    const orchestrationProfileCounts = {};
    const qualityGateStatusCounts = {
      blocked: 0,
      none: 0,
      passed: 0,
      total: groups.length,
    };
    const specialistKindCounts = Object.fromEntries(SPECIALIST_KINDS.map((kind) => [kind, 0]));
    const statusCounts = Object.fromEntries(AGENT_RUN_STATUSES.map((status) => [status, 0]));
    const touchedOrchestrationProfileIds = new Set();
    const touchedSpecialistKinds = new Set();
    let latestQualityGateViolation = null;
    let mergeRunCount = 0;
    let qualityGateBlockedCount = 0;
    let specialistRunCount = 0;

    for (const group of groups) {
      if (group.orchestrationProfile?.id) {
        orchestrationProfileCounts[group.orchestrationProfile.id] =
          (orchestrationProfileCounts[group.orchestrationProfile.id] || 0) + 1;
        touchedOrchestrationProfileIds.add(group.orchestrationProfile.id);
      }
      if (qualityGateStatusCounts[group.qualityGate?.status] !== undefined) {
        qualityGateStatusCounts[group.qualityGate.status] += 1;
      }
      if (group.qualityGate?.status === 'blocked') {
        qualityGateBlockedCount += 1;
      }
      if (
        group.qualityGate?.latestViolation &&
        (!latestQualityGateViolation || String(latestQualityGateViolation.at || '') <= String(group.qualityGate.latestViolation.at || ''))
      ) {
        latestQualityGateViolation = group.qualityGate.latestViolation;
      }

      for (const run of group.runs) {
        if (normalizeText(run.stageKind) === 'parallel-merge') {
          mergeRunCount += 1;
          continue;
        }
        if (!normalizeText(run.specialistKind)) {
          continue;
        }
        specialistRunCount += 1;
      }

      for (const run of group.latestByKind.values()) {
        const specialistKind = normalizeText(run.specialistKind);
        const status = normalizeAgentRunStatus(run.status);
        if (SPECIALIST_KINDS.includes(specialistKind)) {
          specialistKindCounts[specialistKind] += 1;
          touchedSpecialistKinds.add(specialistKind);
        }
        if (statusCounts[status] !== undefined) {
          statusCounts[status] += 1;
        }
      }
    }

    const followUpItems = buildSpecialistFollowUpItems(filter);
    const followUpSummary = summarizeSpecialistFollowUpItems(followUpItems);
    const latestParallelGroup =
      getLatestItem(
        groups.map((group) => ({
          createdAt:
            getLatestItem(
              group.runs.map((run) => ({ createdAt: run.endedAt || run.startedAt || '' })),
              'createdAt',
            )?.createdAt || '',
          id: group.parallelGroupId,
          orchestrationProfile: group.orchestrationProfile,
          qualityGate: group.qualityGate,
          requiredKinds: group.requiredKinds,
        })),
        'createdAt',
      ) || null;

    return {
      latestFollowUp: followUpSummary.latestItem,
      latestMergeRun:
        getLatestItem(
          groups
            .map((group) => group.latestMergeRun)
            .filter(Boolean),
            'endedAt',
          ) || null,
      latestOrchestrationProfile: latestParallelGroup?.orchestrationProfile || null,
      latestParallelGroup,
      mergeCompletedCount: groups.filter((group) => group.wasMerged).length,
      mergeRunCount,
      orchestrationProfileCounts,
      qualityGateBlockedCount,
      qualityGateStatusCounts,
      specialistOrchestrationProfileCount: touchedOrchestrationProfileIds.size,
      specialistFollowUpRequiredCount: followUpItems.length,
      specialistFollowUpNeedsReminderCount: followUpSummary.needsReminderCount,
      specialistFollowUpOverdueCount: followUpSummary.overdueCount,
      specialistFollowUpReminderCountTotal: followUpSummary.reminderCountTotal,
      specialistKindCounts,
      latestQualityGateViolation,
      specialistLatestReminderAt: followUpSummary.latestReminderAt,
      specialistNextReminderAt: followUpSummary.nextReminderAt,
      specialistRunCount,
      statusCounts,
      touchedOrchestrationProfileIds: [...touchedOrchestrationProfileIds].sort((left, right) =>
        String(left).localeCompare(String(right)),
      ),
      touchedSpecialistKinds: [...touchedSpecialistKinds].sort((left, right) => String(left).localeCompare(String(right))),
      totalGroupCount: groups.length,
    };
  }

  function summarizeMissionParallelActivity(missionId) {
    return summarizeScopedParallelActivity({ missionId });
  }

  function summarizeWorkspaceParallelActivity(workspaceId) {
    return summarizeScopedParallelActivity({ workspaceId });
  }


  function summarizeSession(session, missionId) {
    return buildSessionSummary({
      agentRuns: store.listAgentRunsBySession(session.id),
      approvals: store.listApprovals({ missionId, sessionId: session.id }),
      artifacts: store.listArtifactsBySession(session.id),
      gatewayEvents: store.listGatewayEvents({ sessionId: session.id }),
      learningCandidates: store.listLearningCandidates({ sessionId: session.id }),
      session,
    });
  }

  function summarizeMission(mission, filter = {}) {
    const parallelPlan = resolveMissionParallelPlan(mission);
    const sessions = listSessions(mission.id);
    const rawSessions = store.listSessionsByMission(mission.id);
    const approvals = store.listApprovals({ missionId: mission.id });
    const escalations = store.listEscalations({ missionId: mission.id });
    const providerActivity = summarizeMissionProviderActivity(mission.id);
    const providerRecentWindow = buildScopedProviderRecentWindow({
      missionId: mission.id,
      since: filter.providerSince,
    });
    const parallelActivity = summarizeMissionParallelActivity(mission.id);
    const missionMaintenanceRuns = store.listMaintenanceRuns({ missionId: mission.id });
    const maintenanceSummary = summarizeMaintenanceRuns(missionMaintenanceRuns);
    const maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(missionMaintenanceRuns);
    const maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);
    const maintenancePressureSummary = summarizeMaintenancePressure(listMaintenancePressureEntries({ missionId: mission.id }));
    const maintenanceImpactSummary = summarizeMissionMaintenanceImpact(mission.id);
    const relatedMaintenanceRuns = listRelatedMaintenanceRunsForMission(mission.id);
    const latestRelatedMaintenanceRun = getLatestItem(relatedMaintenanceRuns, 'createdAt');
    const memoryEntries = store.listMemoryEntries({ scope: 'mission', scopeId: mission.id });
    const gatewayEvents = store.listGatewayEvents({ missionId: mission.id });
    const identitySessionContexts = gatewayEvents.map((event) => event.identitySessionContext).filter(Boolean);
    const sandboxDecisions = gatewayEvents.map((event) => event.sandboxDecision).filter(Boolean);
    const learningCandidates = store.listLearningCandidates({ missionId: mission.id });
    const latestGatewayEvent = getLatestItem(gatewayEvents, 'at');
    const latestIdentitySessionContext = getLatestItem(identitySessionContexts, 'at');
    const latestSandboxDecision = getLatestItem(sandboxDecisions, 'at');
    const latestLearningCandidate = getLatestItem(learningCandidates, 'createdAt');
    const missionAttachments = store.listMissionAttachments({ missionId: mission.id });
    const latestSession = sessions.at(-1) || null;
    const escalationSummary = summarizeEscalations(escalations);
    const missionQualityGate = parallelActivity.latestParallelGroup?.qualityGate || {
      latestViolation: null,
      qualityGate: parallelPlan.orchestrationProfile?.qualityGate || null,
      requiredKinds: getOrchestrationQualityGateRequiredKinds(
        parallelPlan.orchestrationProfile,
        parallelPlan.effectiveKinds,
      ),
      status: parallelPlan.orchestrationProfile ? 'pending' : 'none',
      violationCount: 0,
      violations: [],
    };
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });

    return buildMissionSummary({
      approvals,
      escalationSummary,
      filter,
      gatewayEvents,
      identitySessionContexts,
      latestGatewayEvent,
      latestIdentitySessionContext,
      latestLearningCandidate,
      latestRelatedMaintenanceRun,
      latestSandboxDecision,
      latestSession,
      learningCandidates,
      maintenanceImpactSummary,
      maintenanceLatestMonthlyBucketDelta,
      maintenanceMonthlyBuckets,
      maintenancePressureSummary,
      maintenanceSummary,
      memoryEntries,
      mission,
      missionAttachments,
      missionQualityGate,
      parallelActivity,
      parallelPlan,
      providerActivity,
      providerFallbackSummary: summarizeMissionProviderFallback({ mission, sessions: rawSessions }),
      providerHealthDrift,
      providerRecentWindow,
      relatedMaintenanceRuns,
      sandboxDecisions,
      sessions,
    });
  }

  function buildHarnessDocumentRegistry() {
    const docsDir = docService.docsDir;
    const adrDir = path.join(docsDir, 'adr');
    const legacyStatus = docService.getLegacyDocumentLogStatus();
    const trackedEntries = docService.listDocumentLogEntries({ limit: null });
    const baseEntries = [
      {
        id: 'roadmap',
        category: 'core-doc',
        label: '로드맵',
        filePath: path.join(docsDir, 'roadmap.md'),
      },
      {
        id: 'reference-repos',
        category: 'core-doc',
        label: '참고 레포 기록',
        filePath: path.join(docsDir, 'reference-repos.md'),
      },
      {
        id: 'devlog',
        category: 'operating-log',
        label: '개발 로그',
        filePath: path.join(docsDir, 'devlog.md'),
      },
      {
        id: 'incidents',
        category: 'operating-log',
        label: '인시던트 기록',
        filePath: path.join(docsDir, 'incidents.md'),
      },
    ];
    const adrEntries = fileSystem.existsSync(adrDir)
      ? fileSystem
          .readdirSync(adrDir)
          .filter((fileName) => fileName.endsWith('.md'))
          .sort()
          .map((fileName, index) => ({
            id: `adr-${index + 1}`,
            category: 'adr',
            label: fileName.replace(/\.md$/i, ''),
            filePath: path.join(adrDir, fileName),
          }))
      : [];
    const items = [...baseEntries, ...adrEntries].map((entry) => {
      const exists = fileSystem.existsSync(entry.filePath);
      const stats = exists ? fileSystem.statSync(entry.filePath) : null;
      return {
        category: entry.category,
        exists,
        id: entry.id,
        label: entry.label,
        path: exists ? path.relative(rootDir, entry.filePath) : path.relative(rootDir, entry.filePath),
        updatedAt: stats ? stats.mtime.toISOString() : null,
      };
    });
    const availableCount = items.filter((item) => item.exists).length;
    const latestItem = items
      .filter((item) => item.updatedAt)
      .sort((left, right) => String(left.updatedAt || '').localeCompare(String(right.updatedAt || '')))
      .at(-1);

    return {
      entries: trackedEntries,
      items,
      recentEntries: trackedEntries.slice(0, 6),
      summary: {
        adrCount: adrEntries.length,
        availableCount,
        legacyDevlogCount: legacyStatus.legacyDevlogCount,
        latestUpdatedAt: latestItem?.updatedAt || null,
        trackedEntryCount: trackedEntries.length,
        totalCount: items.length,
        trackedDevlogCount: legacyStatus.trackedDevlogCount,
      },
    };
  }

  function browseMissionHarnessDocuments(missionId, filter = {}) {
    getMission(missionId);

    const documentRegistry = buildHarnessDocumentRegistry();

    return buildHarnessDocumentBrowseResult({
      entries: documentRegistry.entries,
      filter,
      registrySummary: documentRegistry.summary,
    });
  }

  function browseMissionHarnessMemory(missionId, filter = {}) {
    const mission = getMission(missionId);

    return buildHarnessMemoryBrowseResult({
      filter,
      missionEntries: store.listMemoryEntries({ scope: 'mission', scopeId: mission.id }),
      workspaceEntries: store.listMemoryEntries({ scope: 'workspace', scopeId: mission.workspaceId }),
    });
  }

  function summarizeMissionHarness(mission, summary) {
    const missionSessions = store.listSessionsByMission(mission.id);
    const missionArtifacts = missionSessions
      .flatMap((session) => store.listArtifactsBySession(session.id))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    const latestArtifact = missionArtifacts
      .filter((artifact) => ['deliverable', 'execution-handoff', 'approval-resolution', 'reviewer-report'].includes(artifact.kind))
      .at(-1) || null;
    const latestRetrievalArtifact = missionArtifacts
      .filter((artifact) => artifact.kind === 'retrieval')
      .at(-1) || null;
    const latestRetrievalSession = latestRetrievalArtifact ? store.getSession(latestRetrievalArtifact.sessionId) : null;
    const missionMemoryEntries = store
      .listMemoryEntries({ scope: 'mission', scopeId: mission.id })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    const learningCandidates = store
      .listLearningCandidates({ missionId: mission.id })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    const missionAttachments = store
      .listMissionAttachments({ missionId: mission.id })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    const workspaceMemoryEntries = store
      .listMemoryEntries({ scope: 'workspace', scopeId: mission.workspaceId })
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    const documentRegistry = buildHarnessDocumentRegistry();
    const actionInbox = getActionInbox({ missionId: mission.id });
    const workspace = getWorkspace(mission.workspaceId);
    const retrievalPreview = summarizeMissionRetrievalPreview({
      attachments: collectMissionAttachmentContext(mission.id),
      memoryEntries: collectRelevantMemoryEntries({ mission, workspace }),
      mission,
      pack: getMissionPack({ mission, workspace }),
      specialistKinds: getParallelSpecialistKinds(mission),
    });
    const latestRetrievalSummary = summarizeStoredRetrievalArtifact(latestRetrievalArtifact);
    const retrievalCompare = compareRetrievalPreviewWithLatestArtifact(
      retrievalPreview.previewItems,
      latestRetrievalSummary,
    );

    return buildMissionHarnessSummary({
      actionInbox,
      allFactGraph: factGraph.listFactGraph({ status: 'all' }),
      documentRegistry,
      latestArtifact,
      latestRetrievalArtifact,
      latestRetrievalSession,
      latestRetrievalSummary,
      learningCandidates,
      missionAttachments,
      missionFactGraph: factGraph.listFactGraph({ scope: 'mission', scopeId: mission.id, status: 'all' }),
      missionMemoryEntries,
      retrievalCompare,
      retrievalPreview,
      rootDir,
      summary,
      workspaceFactGraph: factGraph.listFactGraph({
        scope: 'workspace',
        scopeId: mission.workspaceId,
        status: 'all',
      }),
      workspaceMemoryEntries,
    });
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

  function listRelatedMaintenanceRunsForMission(missionId) {
    return store
      .listMaintenanceRuns()
      .filter((item) => item.missionId === missionId || ensureArray(item.affectedMissionIds).includes(missionId));
  }

  function listMaintenanceRunsForWorkspaceImpact(workspaceId) {
    const missionIds = new Set(
      store
        .listMissions()
        .filter((mission) => mission.workspaceId === workspaceId)
        .map((mission) => mission.id),
    );

    return store.listMaintenanceRuns().filter((item) => {
      if (item.workspaceId === workspaceId) {
        return true;
      }
      if (item.missionId && missionIds.has(item.missionId)) {
        return true;
      }
      return ensureArray(item.affectedMissionIds).some((missionId) => missionIds.has(missionId));
    });
  }

  function listMaintenanceOverviewRuns(filter = {}) {
    let items;

    if (filter.missionId) {
      const mission = getMission(filter.missionId);

      if (filter.workspaceId && mission.workspaceId !== filter.workspaceId) {
        return [];
      }

      items = listRelatedMaintenanceRunsForMission(mission.id);
    } else if (filter.workspaceId) {
      items = listMaintenanceRunsForWorkspaceImpact(filter.workspaceId);
    } else {
      items = store.listMaintenanceRuns();
    }

    return items.filter((item) => {
      if (filter.owner && item.owner !== filter.owner) {
        return false;
      }
      if (filter.since && String(item.createdAt || '') < filter.since) {
        return false;
      }
      if (!filter.outcome) {
        return true;
      }
      if (filter.outcome === 'effective') {
        return isMaintenanceRunEffective(item);
      }
      if (filter.outcome === 'no-op') {
        return !isMaintenanceRunEffective(item);
      }
      if (filter.outcome === 'impactful') {
        return isMaintenanceRunImpactful(item);
      }
      return true;
    });
  }

  function getMaintenanceMissionEffect(item, missionId) {
    return ensureArray(item.affectedMissionSummaries).find((entry) => entry.missionId === missionId) || null;
  }

  function summarizeMissionMaintenanceImpact(missionId, runs = null) {
  const effectiveRuns = runs || listRelatedMaintenanceRunsForMission(missionId);
  let escalationRemindedCountTotal = 0;
  let latestRun = null;
  let latestRunAt = null;
  let ownerHandoffRemindedCountTotal = 0;
  let providerAttentionRemindedCountTotal = 0;
  let specialistFollowUpRemindedCountTotal = 0;
  let totalRemindedCount = 0;

    for (const run of effectiveRuns) {
      const isDirectMissionRun = run.missionId === missionId;
      const effect = isDirectMissionRun
        ? {
            escalationRemindedCount: Number(run.escalationRemindedCount || 0),
            ownerHandoffRemindedCount: Number(run.ownerHandoffRemindedCount || 0),
            providerAttentionRemindedCount: Number(run.providerAttentionRemindedCount || 0),
            specialistFollowUpRemindedCount: Number(run.specialistFollowUpRemindedCount || 0),
            totalRemindedCount: Number(run.totalRemindedCount || 0),
          }
        : getMaintenanceMissionEffect(run, missionId) || {
            escalationRemindedCount: 0,
            ownerHandoffRemindedCount: 0,
            providerAttentionRemindedCount: 0,
            specialistFollowUpRemindedCount: 0,
            totalRemindedCount: 0,
          };

      escalationRemindedCountTotal += Number(effect.escalationRemindedCount || 0);
      ownerHandoffRemindedCountTotal += Number(effect.ownerHandoffRemindedCount || 0);
      providerAttentionRemindedCountTotal += Number(effect.providerAttentionRemindedCount || 0);
      specialistFollowUpRemindedCountTotal += Number(effect.specialistFollowUpRemindedCount || 0);
      totalRemindedCount += Number(effect.totalRemindedCount || 0);

      if (!latestRunAt || String(latestRunAt) < String(run.createdAt || '')) {
        latestRunAt = run.createdAt || null;
        latestRun = run;
      }
    }

    return {
      escalationRemindedCountTotal,
      latestRun,
      latestRunAt,
      ownerHandoffRemindedCountTotal,
      providerAttentionRemindedCountTotal,
      specialistFollowUpRemindedCountTotal,
      runCount: effectiveRuns.length,
      totalRemindedCount,
    };
  }

  function getWorkspaceOverview(workspaceId, filter = {}) {
    const workspace = getWorkspace(workspaceId);
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'workspace provider since timestamp');
    syncEscalations({ workspaceId: workspace.id });
    const missionEntries = listMissionSummariesByWorkspace(workspace.id);
    const providerActivity = summarizeWorkspaceProviderActivity(workspace.id);
    const providerRecentWindow = buildScopedProviderRecentWindow({
      since: providerSince,
      workspaceId: workspace.id,
    });
    const parallelActivity = summarizeWorkspaceParallelActivity(workspace.id);
    const maintenanceRuns = listMaintenanceRunsForWorkspaceImpact(workspace.id);
    const maintenanceSummary = summarizeMaintenanceRuns(maintenanceRuns);
    const maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(maintenanceRuns);
    const maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);
    const maintenanceImpactSummary = summarizeMaintenanceImpact(
      maintenanceRuns,
      missionEntries.map((entry) => entry.mission.id),
    );
    const maintenancePressureSummary = summarizeMaintenancePressure(listMaintenancePressureEntries({ workspaceId: workspace.id }));
    const escalations = store.listEscalations({ workspaceId: workspace.id }).map((item) => enrichEscalation(item));
    const escalationSummary = summarizeEscalations(escalations);
    const workspaceMemoryEntries = store.listMemoryEntries({ scope: 'workspace', scopeId: workspace.id });
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });
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
      escalations,
      missions: missionEntries,
      providerHealthDrift,
      providerRecentWindow,
      summary: {
        activeMissionIds: missionEntries
          .filter((entry) => !['completed', 'failed'].includes(entry.mission.status))
          .map((entry) => entry.mission.id),
        approvalCounts,
        escalationCounts: escalationSummary.statusCounts,
        escalationBreachCountTotal: escalationSummary.breachCountTotal,
        escalationLatestOwnerHandoffAt: escalationSummary.latestOwnerHandoffAt,
        escalationLatestOwnerHandoffReminderAt: escalationSummary.latestOwnerHandoffReminderAt,
        escalationLatestReminderAt: escalationSummary.latestReminderAt,
        escalationLatestOwnerEscalatedAt: escalationSummary.latestOwnerEscalatedAt,
        escalationNeedsReminderCount: escalationSummary.needsReminderCount,
        escalationNextPendingOwnerHandoffDueAt: escalationSummary.nextPendingOwnerHandoffDueAt,
        escalationNextPendingOwnerHandoffReminderAt: escalationSummary.nextPendingOwnerHandoffReminderAt,
        escalationOwnerHandoffCountTotal: escalationSummary.ownerHandoffCountTotal,
        escalationOwnerHandoffReminderCountTotal: escalationSummary.ownerHandoffReminderCountTotal,
        escalationOwnerTransitionCountTotal: escalationSummary.ownerTransitionCountTotal,
        escalationPendingOwnerHandoffCount: escalationSummary.pendingOwnerHandoffCount,
        escalationPendingOwnerHandoffNeedsReminderCount: escalationSummary.pendingOwnerHandoffNeedsReminderCount,
        escalationPendingOwnerHandoffOverdueCount: escalationSummary.pendingOwnerHandoffOverdueCount,
        escalationReminderCountTotal: escalationSummary.reminderCountTotal,
        escalationTierCounts: escalationSummary.tierCounts,
        latestEscalation: escalationSummary.latestEscalation,
        latestMaintenanceImpactRun: maintenanceImpactSummary.latestImpactRun,
        latestMaintenanceImpactRunAt: maintenanceImpactSummary.latestImpactRunAt,
        latestMaintenanceImpactAffectedMissionIds: maintenanceImpactSummary.latestImpactAffectedMissionIds,
        latestMaintenanceRun: maintenanceSummary.latestRun,
        latestMaintenanceRequiredAction: maintenancePressureSummary.latestRequiredAction,
        latestMission: latestMissionEntry
          ? {
              mission: latestMissionEntry.mission,
              summary: latestMissionEntry.summary,
            }
          : null,
        latestMaintenanceRunAt: maintenanceSummary.latestRunAt,
        latestMaintenanceRequiredActionAt: maintenancePressureSummary.latestRequiredActionAt,
        maintenanceAcknowledgedMaintenanceRequiredCountTotal:
          maintenanceSummary.acknowledgedMaintenanceRequiredCountTotal,
        maintenanceAffectedMissionCount: maintenanceImpactSummary.affectedMissionCount,
        maintenanceAffectedMissionIds: maintenanceImpactSummary.affectedMissionIds,
        maintenanceDueCandidateCountTotal: maintenanceSummary.dueCandidateCountTotal,
        maintenanceEscalationRemindedCountTotal: maintenanceSummary.escalationRemindedCountTotal,
        maintenanceDueWorkspaceIds: maintenancePressureSummary.maintenanceDueWorkspaceIds,
        maintenanceCurrentDueProviderAttentionCountTotal: maintenancePressureSummary.currentDueProviderAttentionCountTotal,
        maintenanceCurrentDueSpecialistFollowUpCountTotal:
          maintenancePressureSummary.currentDueSpecialistFollowUpCountTotal,
        maintenanceResolvedMaintenanceRequiredCountTotal:
          maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
        maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
        maintenanceRemainingMaintenanceRequiredCountTotal:
          maintenanceSummary.remainingMaintenanceRequiredCountTotal,
        maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
        maintenanceProviderAttentionRemindedCountTotal: maintenanceSummary.providerAttentionRemindedCountTotal,
        maintenanceSpecialistFollowUpRemindedCountTotal: maintenanceSummary.specialistFollowUpRemindedCountTotal,
        maintenanceMonthlyBucketCount: maintenanceMonthlyBuckets.length,
        maintenanceLatestMonthlyBucketStartDate: maintenanceMonthlyBuckets[0]?.monthStartDate || null,
        maintenanceOldestMonthlyBucketStartDate: maintenanceMonthlyBuckets.at(-1)?.monthStartDate || null,
        maintenanceLatestMonthlyBucketDelta: maintenanceLatestMonthlyBucketDelta,
        maintenanceRunCount: maintenanceSummary.runCount,
        maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
        maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
        maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
        memoryCounts,
        latestProviderAttentionAcknowledgement: providerActivity.latestAttentionAcknowledgement,
        latestProviderAttentionRecovery: providerActivity.latestAttentionRecovery,
        latestProviderAttentionReminder: providerActivity.latestAttentionReminder,
        latestProviderAttentionRequiredEvent: providerActivity.latestAttentionRequiredEvent,
        latestProviderAttentionResolution: providerActivity.latestAttentionResolution,
        latestProviderExecution: providerActivity.latestExecution,
        latestProviderExecutionEvent: providerActivity.latestExecutionEvent,
        latestFailedProviderExecution: providerActivity.latestFailedExecution,
        latestRecentProviderEvent: providerRecentWindow?.latestEvent || null,
        latestRecentProviderExecution: providerRecentWindow?.latestExecution || null,
        latestSuccessfulProviderExecution: providerActivity.latestSuccessfulExecution,
        missionCount: missionEntries.length,
        missionCounts,
        openEscalationIds: escalationSummary.openEscalationIds,
        providerAttentionAcknowledgedCount: providerActivity.summary.attentionAcknowledgedCount,
        providerAttentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
        providerAttentionNextReminderAt: providerActivity.summary.attentionNextReminderAt,
        providerAttentionOverdueCount: providerActivity.summary.attentionOverdueCount,
        providerAttentionAttemptHistoryEntryCountTotal: providerActivity.summary.attentionAttemptHistoryEntryCountTotal,
        providerAttentionMaxAttemptCount: providerActivity.summary.attentionMaxAttemptCount,
        providerAttentionMultiAttemptCount: providerActivity.summary.attentionMultiAttemptCount,
        providerAttentionReminderCount: providerActivity.summary.attentionReminderCount,
        providerAttentionRequiredCount: providerActivity.summary.attentionRequiredCount,
        providerAttentionRecoveredCount: providerActivity.summary.attentionRecoveredCount,
        providerAttentionResolvedCount: providerActivity.summary.attentionResolvedCount,
        providerAttentionStatusCounts: providerActivity.summary.attentionStatusCounts,
        providerAttentionTotalAttemptCount: providerActivity.summary.attentionTotalAttemptCount,
        providerAttentionTotalRetryCount: providerActivity.summary.attentionTotalRetryCount,
        providerEventCount: providerActivity.summary.eventCount,
        providerEventFamilyCounts: providerActivity.summary.eventFamilyCounts,
        providerRecentEventCount: providerRecentWindow?.eventCount || 0,
        providerRecentEventFamilyCounts:
          providerRecentWindow?.eventFamilyCounts || { attention: 0, execution: 0, fallback: 0, probe: 0 },
        providerRecentExecutionCount: providerRecentWindow?.executionCount || 0,
        providerRecentExecutionEstimatedCostUsdTotal: providerRecentWindow?.executionEstimatedCostUsdTotal || 0,
        providerRecentExecutionLatestMonthlyBucketDelta:
          providerRecentWindow?.executionLatestMonthlyBucketDelta || null,
        providerRecentExecutionLatestMonthlyBucketStartDate:
          providerRecentWindow?.executionLatestMonthlyBucketStartDate || null,
        providerRecentExecutionMonthlyBucketCount: providerRecentWindow?.executionMonthlyBucketCount || 0,
        providerRecentExecutionOldestMonthlyBucketStartDate:
          providerRecentWindow?.executionOldestMonthlyBucketStartDate || null,
        providerHealthDriftAttentionNeedsReminderCount: providerHealthDrift.attentionNeedsReminderCount,
        providerHealthDriftAttentionOverdueCount: providerHealthDrift.attentionOverdueCount,
        providerHealthDriftAttentionRequiredCount: providerHealthDrift.attentionRequiredCount,
        providerHealthDriftReasonCodes: providerHealthDrift.reasonCodes,
        providerHealthDriftRecentExecutionCountDelta: providerHealthDrift.recentExecutionCountDelta,
        providerHealthDriftRecentExecutionCurrentMonthStartDate:
          providerHealthDrift.recentExecutionCurrentMonthStartDate,
        providerHealthDriftRecentExecutionEstimatedCostUsdTotalDelta:
          providerHealthDrift.recentExecutionEstimatedCostUsdTotalDelta,
        providerHealthDriftRecentExecutionFailedCountDelta:
          providerHealthDrift.recentExecutionFailedCountDelta,
        providerHealthDriftRecentExecutionMonthlyBucketCount:
          providerHealthDrift.recentExecutionMonthlyBucketCount,
        providerHealthDriftRecentExecutionOldestMonthStartDate:
          providerHealthDrift.recentExecutionOldestMonthStartDate,
        providerHealthDriftRecentExecutionPreviousMonthStartDate:
          providerHealthDrift.recentExecutionPreviousMonthStartDate,
        providerHealthDriftStatus: providerHealthDrift.status,
        providerRecentSince: providerSince || null,
        providerRecentTouchedProviderCount: providerRecentWindow?.touchedProviderCount || 0,
        providerRecentTouchedProviderIds: providerRecentWindow?.touchedProviderIds || [],
        providerExecutionAverageDurationMs: providerActivity.summary.executionAverageDurationMs,
        providerExecutionCompletedCount: providerActivity.summary.executionCompletedCount,
        providerExecutionCount: providerActivity.summary.executionCount,
        providerExecutionFailureKindCounts: providerActivity.summary.executionFailureKindCounts,
        providerExecutionFailedCount: providerActivity.summary.executionFailedCount,
        providerExecutionAttemptHistoryEntryCountTotal: providerActivity.summary.executionAttemptHistoryEntryCountTotal,
        providerExecutionMaxDurationMs: providerActivity.summary.executionMaxDurationMs,
        providerExecutionMaxAttemptCount: providerActivity.summary.executionMaxAttemptCount,
        providerExecutionMultiAttemptCount: providerActivity.summary.executionMultiAttemptCount,
        providerExecutionRetryableFailureCount: providerActivity.summary.executionRetryableFailureCount,
        providerExecutionRetrySucceededCount: providerActivity.summary.executionRetrySucceededCount,
        providerExecutionTotalAttemptCount: providerActivity.summary.executionTotalAttemptCount,
        providerExecutionTotalDurationMs: providerActivity.summary.executionTotalDurationMs,
        providerExecutionTotalRetryCount: providerActivity.summary.executionTotalRetryCount,
        providerExecutionTimedOutFailureCount: providerActivity.summary.executionTimedOutFailureCount,
        providerExecutionEstimatedCostUsdAverage: providerActivity.summary.executionEstimatedCostUsdAverage,
        providerExecutionEstimatedCostUsdByProviderId: providerActivity.summary.executionEstimatedCostUsdByProviderId,
        providerExecutionEstimatedCostUsdByRole: providerActivity.summary.executionEstimatedCostUsdByRole,
        providerExecutionEstimatedCostUsdMax: providerActivity.summary.executionEstimatedCostUsdMax,
        providerExecutionEstimatedCostUsdPricedCount: providerActivity.summary.executionEstimatedCostUsdPricedCount,
        providerExecutionEstimatedCostUsdTotal: providerActivity.summary.executionEstimatedCostUsdTotal,
        providerExecutionUsageInputTokensTotal: providerActivity.summary.usageInputTokensTotal,
        providerExecutionUsageOutputTokensTotal: providerActivity.summary.usageOutputTokensTotal,
        providerExecutionUsageTotalTokensTotal: providerActivity.summary.usageTotalTokensTotal,
        specialistFollowUpRequiredCount: parallelActivity.specialistFollowUpRequiredCount,
        specialistFollowUpNeedsReminderCount: parallelActivity.specialistFollowUpNeedsReminderCount,
        specialistFollowUpOverdueCount: parallelActivity.specialistFollowUpOverdueCount,
        specialistFollowUpReminderCountTotal: parallelActivity.specialistFollowUpReminderCountTotal,
        specialistKindCounts: parallelActivity.specialistKindCounts,
        specialistLatestQualityGateViolation: parallelActivity.latestQualityGateViolation,
        specialistLatestOrchestrationProfile: parallelActivity.latestOrchestrationProfile,
        specialistLatestFollowUp: parallelActivity.latestFollowUp,
        specialistLatestReminderAt: parallelActivity.specialistLatestReminderAt,
        specialistLatestMergeRun: parallelActivity.latestMergeRun,
        specialistLatestParallelGroup: parallelActivity.latestParallelGroup,
        specialistMergeCompletedCount: parallelActivity.mergeCompletedCount,
        specialistMergeRunCount: parallelActivity.mergeRunCount,
        specialistNextReminderAt: parallelActivity.specialistNextReminderAt,
        specialistQualityGateBlockedCount: parallelActivity.qualityGateBlockedCount,
        specialistQualityGateStatusCounts: parallelActivity.qualityGateStatusCounts,
        specialistOrchestrationProfileCounts: parallelActivity.orchestrationProfileCounts,
        specialistOrchestrationProfileCount: parallelActivity.specialistOrchestrationProfileCount,
        specialistRunCount: parallelActivity.specialistRunCount,
        specialistStatusCounts: parallelActivity.statusCounts,
        specialistTouchedOrchestrationProfileIds: parallelActivity.touchedOrchestrationProfileIds,
        specialistTouchedKinds: parallelActivity.touchedSpecialistKinds,
        specialistTotalGroupCount: parallelActivity.totalGroupCount,
        providerTouchedCount: providerActivity.summary.touchedProviderCount,
        providerTouchedIds: providerActivity.summary.touchedProviderIds,
        sessionCount: missionEntries.reduce((count, entry) => count + entry.summary.sessionCount, 0),
        workspaceId: workspace.id,
      },
      workspace,
    };
  }

  function listMaintenancePressureEntries(filter = {}) {
    const targets = [];

    if (filter.missionId) {
      const mission = getMission(filter.missionId);
      const workspace = getWorkspace(mission.workspaceId);

      if (filter.workspaceId && workspace.id !== filter.workspaceId) {
        return [];
      }

      targets.push({
        mission,
        workspace,
      });
    } else if (filter.workspaceId) {
      const workspace = getWorkspace(filter.workspaceId);
      targets.push({
        mission: null,
        workspace,
      });
    } else {
      for (const workspace of store.listWorkspaces()) {
        targets.push({
          mission: null,
          workspace,
        });
      }
    }

    return targets
      .map((target) => {
        const escalations = store
          .listEscalations({
            missionId: target.mission ? target.mission.id : undefined,
            status: 'open',
            workspaceId: target.workspace.id,
          })
          .map((item) => enrichEscalation(item));

        const dueMonitoringItems = escalations.filter((item) => {
          if (item.pendingOwnerHandoff) {
            return false;
          }
          if (!item.needsReminder) {
            return false;
          }
          if (filter.owner && item.recommendedOwner !== filter.owner) {
            return false;
          }
          return true;
        });

        const dueOwnerHandoffItems = escalations.filter((item) => {
          if (!item.pendingOwnerHandoff || !item.ownerHandoffNeedsReminder) {
            return false;
          }
          if (filter.owner && item.ownerHandoffTargetOwner !== filter.owner) {
            return false;
          }
          return true;
        });

        const dueProviderAttentionItems = buildProviderAttentionPendingItems({
          missionId: target.mission ? target.mission.id : undefined,
          needsReminderOnly: true,
          workspaceId: target.workspace.id,
        }).filter((item) => {
          if (filter.owner && item.recommendedOwner !== filter.owner) {
            return false;
          }
          return true;
        });

        const dueSpecialistFollowUpItems = buildSpecialistFollowUpItems({
          missionId: target.mission ? target.mission.id : undefined,
          needsReminderOnly: true,
          workspaceId: target.workspace.id,
        }).filter((item) => {
          if (filter.owner && item.recommendedOwner !== filter.owner) {
            return false;
          }
          return true;
        });

        const dueItems = [
          ...dueMonitoringItems,
          ...dueOwnerHandoffItems,
          ...dueProviderAttentionItems,
          ...dueSpecialistFollowUpItems,
        ];
        if (!dueItems.length) {
          return null;
        }

        const nextDueAt =
          [
            ...dueMonitoringItems.map((item) => item.nextReminderAt),
            ...dueOwnerHandoffItems.map((item) => item.nextOwnerHandoffReminderAt),
            ...dueProviderAttentionItems.map((item) => item.nextReminderAt),
            ...dueSpecialistFollowUpItems.map((item) => item.nextReminderAt),
          ]
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null;
        const createdAt =
          [
            ...dueMonitoringItems.map((item) => item.createdAt),
            ...dueOwnerHandoffItems.map((item) => item.ownerTransitionAt || item.createdAt),
            ...dueProviderAttentionItems.map((item) => item.createdAt),
            ...dueSpecialistFollowUpItems.map((item) => item.createdAt),
          ]
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null;
        const latestMaintenanceRun =
          store
            .listMaintenanceRuns({
              missionId: target.mission ? target.mission.id : undefined,
              owner: filter.owner,
              workspaceId: target.workspace.id,
            })
            .at(-1) || null;
        const effectiveRecommendedOwner =
          dueOwnerHandoffItems.some((item) => item.ownerHandoffTargetOwner === 'human-approver') ||
          dueMonitoringItems.some((item) => item.effectiveRecommendedOwner === 'human-approver') ||
          dueProviderAttentionItems.some((item) => item.recommendedOwner === 'human-approver')
            ? 'human-approver'
            : 'workspace-owner';

        return {
          actionId: `maintenance-required:${target.workspace.id}:${target.mission ? target.mission.id : 'workspace'}`,
          actionType: 'maintenance-sweep',
          createdAt: createdAt || nextDueAt || now(),
          dueMonitoringCount: dueMonitoringItems.length,
          dueOwnerHandoffCount: dueOwnerHandoffItems.length,
          dueProviderAttentionCount: dueProviderAttentionItems.length,
          dueSpecialistFollowUpCount: dueSpecialistFollowUpItems.length,
          effectiveRecommendedOwner,
          latestMaintenanceRun,
          latestMaintenanceRunAt: latestMaintenanceRun?.createdAt || null,
          missionId: target.mission ? target.mission.id : null,
          missionTitle: target.mission ? target.mission.title : null,
          nextDueAt,
          totalDueCandidateCount: dueItems.length,
          workspaceId: target.workspace.id,
          workspaceName: target.workspace.name,
        };
      })
      .filter(Boolean);
  }

  function buildMaintenanceActionItems(filter = {}) {
    return listMaintenancePressureEntries(filter)
      .map((entry) => buildMaintenanceActionItem(entry))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
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

        return buildApprovalActionItem({ approval, mission, session, workspace });
      })
      .filter(Boolean)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildBlockedFollowUpItems(filter = {}) {
    return store
      .listMissions()
      .map((mission) => {
        if (mission.status !== 'failed') {
          return null;
        }

        const workspace = store.getWorkspace(mission.workspaceId);
        if (!workspace) {
          return null;
        }

        if (filter.workspaceId && workspace.id !== filter.workspaceId) {
          return null;
        }

        if (filter.missionId && mission.id !== filter.missionId) {
          return null;
        }

        const latestSession = getLatestSession(store.listSessionsByMission(mission.id));
        if (!latestSession || latestSession.status !== 'failed') {
          return null;
        }

        const rejectedApproval =
          getLatestItem(
            store
              .listApprovals({ missionId: mission.id, sessionId: latestSession.id })
              .filter((approval) => approval.status === 'rejected'),
            'resolvedAt',
          ) || null;

        if (!rejectedApproval) {
          return null;
        }

        return buildBlockedFollowUpActionItem({ latestSession, mission, rejectedApproval, workspace });
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

  function getGlobalOverview(filter = {}) {
    syncEscalations();
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'global provider since timestamp');
    const workspaceOverviews = store.listWorkspaces().map((workspace) => getWorkspaceOverview(workspace.id));
    const maintenanceRuns = store.listMaintenanceRuns();
    const maintenanceSummary = summarizeMaintenanceRuns(maintenanceRuns);
    const maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(maintenanceRuns);
    const maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);
    const maintenanceImpactSummary = summarizeMaintenanceImpact(maintenanceRuns);
    const maintenancePressureSummary = summarizeMaintenancePressure(listMaintenancePressureEntries());
    const missionCounts = Object.fromEntries(MISSION_STATUSES.map((status) => [status, 0]));
    const approvalCounts = { approved: 0, pending: 0, rejected: 0, total: 0 };
    const memoryCounts = { missionScoped: 0, total: 0, workspaceScoped: 0 };
    const inbox = buildApprovalInboxItems();
    const allEscalations = store.listEscalations().map((item) => enrichEscalation(item));
    const openEscalations = allEscalations.filter((item) => item.status === 'open');
    const escalationSummary = summarizeEscalations(allEscalations);
    const providerOverview = getProviderOverview({
      since: providerSince,
    });
    const providerHealthDrift = providerOverview.healthDrift;
    const parallelActivity = summarizeScopedParallelActivity();

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
      escalations: openEscalations,
      inbox,
      providerHealthDrift,
      providerOverview,
      providerRecentWindow: providerOverview.recentWindow,
      summary: {
        activeWorkspaceIds: workspaceOverviews
          .filter((overview) => overview.summary.activeMissionIds.length > 0)
          .map((overview) => overview.workspace.id),
        approvalCounts,
        escalatedWorkspaceIds: [...new Set(openEscalations.map((item) => item.workspaceId))],
        escalationCounts: escalationSummary.statusCounts,
        escalationBreachCountTotal: escalationSummary.breachCountTotal,
        escalationLatestOwnerHandoffAt: escalationSummary.latestOwnerHandoffAt,
        escalationLatestOwnerHandoffReminderAt: escalationSummary.latestOwnerHandoffReminderAt,
        escalationLatestReminderAt: escalationSummary.latestReminderAt,
        escalationLatestOwnerEscalatedAt: escalationSummary.latestOwnerEscalatedAt,
        escalationNeedsReminderCount: escalationSummary.needsReminderCount,
        escalationNextPendingOwnerHandoffDueAt: escalationSummary.nextPendingOwnerHandoffDueAt,
        escalationNextPendingOwnerHandoffReminderAt: escalationSummary.nextPendingOwnerHandoffReminderAt,
        escalationOwnerHandoffCountTotal: escalationSummary.ownerHandoffCountTotal,
        escalationOwnerHandoffReminderCountTotal: escalationSummary.ownerHandoffReminderCountTotal,
        escalationOwnerTransitionCountTotal: escalationSummary.ownerTransitionCountTotal,
        escalationPendingOwnerHandoffCount: escalationSummary.pendingOwnerHandoffCount,
        escalationPendingOwnerHandoffNeedsReminderCount: escalationSummary.pendingOwnerHandoffNeedsReminderCount,
        escalationPendingOwnerHandoffOverdueCount: escalationSummary.pendingOwnerHandoffOverdueCount,
        escalationReminderCountTotal: escalationSummary.reminderCountTotal,
        escalationTierCounts: escalationSummary.tierCounts,
        inboxCount: inbox.length,
        latestEscalation: escalationSummary.latestEscalation,
        latestMaintenanceImpactRun: maintenanceImpactSummary.latestImpactRun,
        latestMaintenanceImpactRunAt: maintenanceImpactSummary.latestImpactRunAt,
        latestMaintenanceImpactAffectedMissionIds: maintenanceImpactSummary.latestImpactAffectedMissionIds,
        latestMaintenanceRun: maintenanceSummary.latestRun,
        latestMaintenanceRequiredAction: maintenancePressureSummary.latestRequiredAction,
        latestMaintenanceRunAt: maintenanceSummary.latestRunAt,
        latestMaintenanceRequiredActionAt: maintenancePressureSummary.latestRequiredActionAt,
        maintenanceAcknowledgedMaintenanceRequiredCountTotal:
          maintenanceSummary.acknowledgedMaintenanceRequiredCountTotal,
        maintenanceAffectedMissionCount: maintenanceImpactSummary.affectedMissionCount,
        maintenanceAffectedMissionIds: maintenanceImpactSummary.affectedMissionIds,
        maintenanceDueCandidateCountTotal: maintenanceSummary.dueCandidateCountTotal,
        maintenanceDueWorkspaceIds: maintenancePressureSummary.maintenanceDueWorkspaceIds,
        maintenanceEscalationRemindedCountTotal: maintenanceSummary.escalationRemindedCountTotal,
        maintenanceCurrentDueProviderAttentionCountTotal: maintenancePressureSummary.currentDueProviderAttentionCountTotal,
        maintenanceCurrentDueSpecialistFollowUpCountTotal:
          maintenancePressureSummary.currentDueSpecialistFollowUpCountTotal,
        maintenanceResolvedMaintenanceRequiredCountTotal:
          maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
        maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
        maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
        maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
        maintenanceProviderAttentionRemindedCountTotal: maintenanceSummary.providerAttentionRemindedCountTotal,
        maintenanceSpecialistFollowUpRemindedCountTotal: maintenanceSummary.specialistFollowUpRemindedCountTotal,
        maintenanceMonthlyBucketCount: maintenanceMonthlyBuckets.length,
        maintenanceLatestMonthlyBucketStartDate: maintenanceMonthlyBuckets[0]?.monthStartDate || null,
        maintenanceOldestMonthlyBucketStartDate: maintenanceMonthlyBuckets.at(-1)?.monthStartDate || null,
        maintenanceLatestMonthlyBucketDelta: maintenanceLatestMonthlyBucketDelta,
        maintenanceRemainingMaintenanceRequiredCountTotal:
          maintenanceSummary.remainingMaintenanceRequiredCountTotal,
        maintenanceRunCount: maintenanceSummary.runCount,
        maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
        maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
        memoryCounts,
        missionCount: workspaceOverviews.reduce((count, overview) => count + overview.summary.missionCount, 0),
        missionCounts,
        openEscalationCount: openEscalations.length,
        latestProviderEvent: providerOverview.summary.latestEvent,
        latestProviderAttentionAcknowledgement: providerOverview.summary.latestAttentionAcknowledgement,
        latestProviderAttentionEvent: providerOverview.summary.latestAttentionEvent,
        latestProviderAttentionRecovery: providerOverview.summary.latestAttentionRecovery,
        latestProviderAttentionReminder: providerOverview.summary.latestAttentionReminder,
        latestProviderAttentionResolution: providerOverview.summary.latestAttentionResolution,
        latestProviderAttentionRequiredEvent: providerOverview.summary.latestAttentionRequiredEvent,
        latestProviderExecutionEvent: providerOverview.summary.latestExecutionEvent,
        latestFailedProviderExecution: providerOverview.summary.latestFailedExecution,
        latestProviderExecution: providerOverview.summary.latestExecution,
        latestFailedProviderProbe: providerOverview.summary.latestFailedProbe,
        latestProviderProbe: providerOverview.summary.latestProbe,
        latestProviderProbeEvent: providerOverview.summary.latestProbeEvent,
        latestRecentProviderEvent: providerOverview.recentWindow?.latestEvent || null,
        latestRecentProviderExecution: providerOverview.recentWindow?.latestExecution || null,
        latestRecentProviderProbe: providerOverview.recentWindow?.latestProbe || null,
        latestSuccessfulProviderExecution: providerOverview.summary.latestSuccessfulExecution,
        latestSuccessfulProviderProbe: providerOverview.summary.latestSuccessfulProbe,
        providerConfiguredCount: providerOverview.summary.configuredCount,
        providerCount: providerOverview.summary.total,
        providerRecentEventCount: providerOverview.recentWindow?.eventTotal || 0,
        providerRecentEventFamilyCounts:
          providerOverview.recentWindow?.eventFamilyCounts || { attention: 0, execution: 0, fallback: 0, probe: 0 },
        providerRecentExecutionCount: providerOverview.recentWindow?.executionTotal || 0,
        providerRecentExecutionLatestMonthlyBucketDelta:
          providerOverview.recentWindow?.executionLatestMonthlyBucketDelta || null,
        providerRecentExecutionLatestMonthlyBucketStartDate:
          providerOverview.recentWindow?.executionLatestMonthlyBucketStartDate || null,
        providerRecentExecutionMonthlyBucketCount:
          providerOverview.recentWindow?.executionMonthlyBucketCount || 0,
        providerRecentExecutionOldestMonthlyBucketStartDate:
          providerOverview.recentWindow?.executionOldestMonthlyBucketStartDate || null,
        providerHealthDriftAttentionNeedsReminderCount: providerHealthDrift.attentionNeedsReminderCount,
        providerHealthDriftAttentionOverdueCount: providerHealthDrift.attentionOverdueCount,
        providerHealthDriftAttentionRequiredCount: providerHealthDrift.attentionRequiredCount,
        providerHealthDriftReasonCodes: providerHealthDrift.reasonCodes,
        providerHealthDriftRecentExecutionCountDelta: providerHealthDrift.recentExecutionCountDelta,
        providerHealthDriftRecentExecutionCurrentMonthStartDate:
          providerHealthDrift.recentExecutionCurrentMonthStartDate,
        providerHealthDriftRecentExecutionEstimatedCostUsdTotalDelta:
          providerHealthDrift.recentExecutionEstimatedCostUsdTotalDelta,
        providerHealthDriftRecentExecutionFailedCountDelta:
          providerHealthDrift.recentExecutionFailedCountDelta,
        providerHealthDriftRecentExecutionMonthlyBucketCount:
          providerHealthDrift.recentExecutionMonthlyBucketCount,
        providerHealthDriftRecentExecutionOldestMonthStartDate:
          providerHealthDrift.recentExecutionOldestMonthStartDate,
        providerHealthDriftRecentExecutionPreviousMonthStartDate:
          providerHealthDrift.recentExecutionPreviousMonthStartDate,
        providerHealthDriftStatus: providerHealthDrift.status,
        providerRecentProbeTotal: providerOverview.recentWindow?.probeTotal || 0,
        providerRecentSince: providerSince || null,
        providerRecentTouchedProviderCount: providerOverview.recentWindow?.touchedProviderCount || 0,
        providerRecentTouchedProviderIds: providerOverview.recentWindow?.touchedProviderIds || [],
        providerAttentionAcknowledgedCount: providerOverview.summary.acknowledgedAttentionCount,
        providerAttentionNeedsReminderCount: providerOverview.summary.attentionNeedsReminderCount,
        providerAttentionNextDueAt: providerOverview.summary.attentionNextDueAt,
        providerAttentionNextReminderAt: providerOverview.summary.attentionNextReminderAt,
        providerAttentionOverdueCount: providerOverview.summary.attentionOverdueCount,
        providerAttentionAttemptHistoryEntryCountTotal: providerOverview.summary.attentionAttemptHistoryEntryCountTotal,
        providerAttentionMaxAttemptCount: providerOverview.summary.attentionMaxAttemptCount,
        providerAttentionMultiAttemptCount: providerOverview.summary.attentionMultiAttemptCount,
        providerAttentionReminderCount: providerOverview.summary.attentionReminderCountTotal,
        providerAttentionRequiredCount: providerOverview.summary.attentionRequiredCount,
        providerAttentionRecoveredCount: providerOverview.summary.recoveredAttentionCount,
        providerAttentionResolvedCount: providerOverview.summary.resolvedAttentionCount,
        providerAttentionStatusCounts: providerOverview.summary.attentionStatusCounts,
        providerAttentionTotalAttemptCount: providerOverview.summary.attentionTotalAttemptCount,
        providerAttentionTotalRetryCount: providerOverview.summary.attentionTotalRetryCount,
        providerEventCount: providerOverview.summary.eventTotal,
        providerEventFamilyCounts: providerOverview.summary.eventFamilyCounts,
        providerExecutionAverageDurationMs: providerOverview.summary.executionAverageDurationMs,
        providerExecutionCompletedCount: providerOverview.summary.executionCompletedCount,
        providerExecutionCount: providerOverview.summary.executionTotal,
        providerExecutionFailedCount: providerOverview.summary.executionFailedCount,
        providerExecutionFailureKindCounts: providerOverview.summary.executionFailureKindCounts,
        providerExecutionAttemptHistoryEntryCountTotal: providerOverview.summary.executionAttemptHistoryEntryCountTotal,
        providerExecutionMaxDurationMs: providerOverview.summary.executionMaxDurationMs,
        providerExecutionMaxAttemptCount: providerOverview.summary.executionMaxAttemptCount,
        providerExecutionMultiAttemptCount: providerOverview.summary.executionMultiAttemptCount,
        providerExecutionRetryableFailureCount: providerOverview.summary.executionRetryableFailureCount,
        providerExecutionRetrySucceededCount: providerOverview.summary.executionRetrySucceededCount,
        providerExecutionTotalAttemptCount: providerOverview.summary.executionTotalAttemptCount,
        providerExecutionTotalDurationMs: providerOverview.summary.executionTotalDurationMs,
        providerExecutionTotalRetryCount: providerOverview.summary.executionTotalRetryCount,
        providerExecutionTimedOutFailureCount: providerOverview.summary.executionTimedOutFailureCount,
        providerExecutionEstimatedCostUsdAverage: providerOverview.summary.executionEstimatedCostUsdAverage,
        providerExecutionEstimatedCostUsdByProviderId: providerOverview.summary.executionEstimatedCostUsdByProviderId,
        providerExecutionEstimatedCostUsdByRole: providerOverview.summary.executionEstimatedCostUsdByRole,
        providerExecutionEstimatedCostUsdMax: providerOverview.summary.executionEstimatedCostUsdMax,
        providerExecutionEstimatedCostUsdPricedCount: providerOverview.summary.executionEstimatedCostUsdPricedCount,
        providerExecutionEstimatedCostUsdTotal: providerOverview.summary.executionEstimatedCostUsdTotal,
        providerExecutionUsageInputTokensTotal: providerOverview.summary.usageInputTokensTotal,
        providerExecutionUsageOutputTokensTotal: providerOverview.summary.usageOutputTokensTotal,
        providerExecutionUsageTotalTokensTotal: providerOverview.summary.usageTotalTokensTotal,
        providerLatestProbeFailureCount: providerOverview.summary.latestProbeFailureCount,
        providerLatestProbeSkippedCount: providerOverview.summary.latestProbeSkippedCount,
        providerProbeAverageDurationMs: providerOverview.summary.probeAverageDurationMs,
        providerProbeAttemptHistoryEntryCountTotal: providerOverview.summary.probeAttemptHistoryEntryCountTotal,
        providerProbeFailureKindCounts: providerOverview.summary.probeFailureKindCounts,
        providerProbeMaxAttemptCount: providerOverview.summary.probeMaxAttemptCount,
        providerProbeMaxDurationMs: providerOverview.summary.probeMaxDurationMs,
        providerProbeMultiAttemptCount: providerOverview.summary.probeMultiAttemptCount,
        providerProbeRetryableFailureCount: providerOverview.summary.probeRetryableFailureCount,
        providerProbeRetrySucceededCount: providerOverview.summary.probeRetrySucceededCount,
        providerProbeTotalAttemptCount: providerOverview.summary.probeTotalAttemptCount,
        providerProbeTotalDurationMs: providerOverview.summary.probeTotalDurationMs,
        providerProbeTotalRetryCount: providerOverview.summary.probeTotalRetryCount,
        providerProbeTimedOutFailureCount: providerOverview.summary.probeTimedOutFailureCount,
        providerReadyCount: providerOverview.summary.readyCount,
        specialistFollowUpRequiredCount: parallelActivity.specialistFollowUpRequiredCount,
        specialistFollowUpNeedsReminderCount: parallelActivity.specialistFollowUpNeedsReminderCount,
        specialistFollowUpOverdueCount: parallelActivity.specialistFollowUpOverdueCount,
        specialistFollowUpReminderCountTotal: parallelActivity.specialistFollowUpReminderCountTotal,
        specialistKindCounts: parallelActivity.specialistKindCounts,
        specialistLatestQualityGateViolation: parallelActivity.latestQualityGateViolation,
        specialistLatestOrchestrationProfile: parallelActivity.latestOrchestrationProfile,
        specialistLatestFollowUp: parallelActivity.latestFollowUp,
        specialistLatestReminderAt: parallelActivity.specialistLatestReminderAt,
        specialistLatestMergeRun: parallelActivity.latestMergeRun,
        specialistLatestParallelGroup: parallelActivity.latestParallelGroup,
        specialistMergeCompletedCount: parallelActivity.mergeCompletedCount,
        specialistMergeRunCount: parallelActivity.mergeRunCount,
        specialistNextReminderAt: parallelActivity.specialistNextReminderAt,
        specialistQualityGateBlockedCount: parallelActivity.qualityGateBlockedCount,
        specialistQualityGateStatusCounts: parallelActivity.qualityGateStatusCounts,
        specialistOrchestrationProfileCounts: parallelActivity.orchestrationProfileCounts,
        specialistOrchestrationProfileCount: parallelActivity.specialistOrchestrationProfileCount,
        specialistRunCount: parallelActivity.specialistRunCount,
        specialistStatusCounts: parallelActivity.statusCounts,
        specialistTouchedOrchestrationProfileIds: parallelActivity.touchedOrchestrationProfileIds,
        specialistTouchedKinds: parallelActivity.touchedSpecialistKinds,
        specialistTotalGroupCount: parallelActivity.totalGroupCount,
        providerUnprobedCount: providerOverview.summary.unprobedCount,
        sessionCount: workspaceOverviews.reduce((count, overview) => count + overview.summary.sessionCount, 0),
        workspaceCount: workspaceOverviews.length,
      },
      workspaces: workspaceOverviews.map((overview) => ({
        summary: overview.summary,
        workspace: overview.workspace,
      })),
    };
  }

  function getOrchestrationProfilesOverview(filter = {}) {
    if (
      filter.adoptionDriftReasonCode &&
      !ORCHESTRATION_PROFILE_ADOPTION_DRIFT_REASON_CODES.includes(filter.adoptionDriftReasonCode)
    ) {
      throw new Error(
        `Unsupported orchestration profile adoption drift reason code: ${filter.adoptionDriftReasonCode}`,
      );
    }
    if (
      filter.adoptionDriftStatus &&
      !ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.includes(filter.adoptionDriftStatus)
    ) {
      throw new Error(
        `Unsupported orchestration profile adoption drift status: ${filter.adoptionDriftStatus}`,
      );
    }
    if (filter.mode && !MISSION_MODES.includes(filter.mode)) {
      throw new Error(`Unsupported mission mode: ${filter.mode}`);
    }
    if (
      filter.reasonCode &&
      !ORCHESTRATION_PROFILE_HEALTH_DRIFT_REASON_CODES.includes(filter.reasonCode)
    ) {
      throw new Error(
        `Unsupported orchestration profile health drift reason code: ${filter.reasonCode}`,
      );
    }
    if (
      filter.status &&
      !['stable', 'watch', 'follow-up-required'].includes(filter.status)
    ) {
      throw new Error(`Unsupported orchestration profile health drift status: ${filter.status}`);
    }
    if (
      filter.usageTrend &&
      !ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.includes(filter.usageTrend)
    ) {
      throw new Error(`Unsupported orchestration profile usage trend status: ${filter.usageTrend}`);
    }
    if (
      filter.workspaceUsageTrend &&
      !ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.includes(filter.workspaceUsageTrend)
    ) {
      throw new Error(
        `Unsupported orchestration profile workspace usage trend status: ${filter.workspaceUsageTrend}`,
      );
    }
    if (
      filter.workspaceAdoptionDriftReasonCode &&
      !ORCHESTRATION_PROFILE_WORKSPACE_ADOPTION_DRIFT_REASON_CODES.includes(
        filter.workspaceAdoptionDriftReasonCode,
      )
    ) {
      throw new Error(
        `Unsupported orchestration profile workspace adoption drift reason code: ${filter.workspaceAdoptionDriftReasonCode}`,
      );
    }
    if (
      filter.workspaceAdoptionDriftStatus &&
      !ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.includes(filter.workspaceAdoptionDriftStatus)
    ) {
      throw new Error(
        `Unsupported orchestration profile workspace adoption drift status: ${filter.workspaceAdoptionDriftStatus}`,
      );
    }
    if (
      filter.workspaceReasonCode &&
      !ORCHESTRATION_PROFILE_HEALTH_DRIFT_REASON_CODES.includes(filter.workspaceReasonCode)
    ) {
      throw new Error(
        `Unsupported orchestration profile workspace health drift reason code: ${filter.workspaceReasonCode}`,
      );
    }
    if (
      filter.workspaceStatus &&
      !['stable', 'watch', 'follow-up-required'].includes(filter.workspaceStatus)
    ) {
      throw new Error(
        `Unsupported orchestration profile workspace health drift status: ${filter.workspaceStatus}`,
      );
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }

    const workspaceById = new Map(store.listWorkspaces().map((workspace) => [workspace.id, workspace]));
    const profileGroups = buildParallelGroupStates({
      workspaceId: filter.workspaceId,
    });
    const profileFollowUps = buildSpecialistFollowUpItems({
      workspaceId: filter.workspaceId,
    });
    const missionEntries = store
      .listMissions()
      .map((mission) => {
        const plan = resolveMissionParallelPlan(mission);
        if (!plan.orchestrationProfile) {
          return null;
        }

        const workspace = workspaceById.get(mission.workspaceId) || null;
        if (filter.workspaceId && workspace?.id !== filter.workspaceId) {
          return null;
        }
        return {
          latestAt: mission.updatedAt || mission.createdAt || '',
          mission,
          profile: plan.orchestrationProfile,
          workspace,
        };
      })
      .filter(Boolean);
    const latestMissionEntryForUsage =
      getLatestItem(missionEntries, 'latestAt') || null;
    const scopeLatestMonthStartDate = latestMissionEntryForUsage?.latestAt
      ? getUtcMonthStartTimestamp(latestMissionEntryForUsage.latestAt).slice(0, 10)
      : null;

    const items = listOrchestrationProfiles()
      .filter((profile) => !filter.mode || profile.mode === filter.mode)
      .map((profile) => {
        const missions = missionEntries.filter((entry) => entry.profile.id === profile.id);
        const missionIds = new Set(missions.map((entry) => entry.mission.id));
        const workspaceMissionCounts = {};
        const groups = profileGroups.filter((group) => group.orchestrationProfile?.id === profile.id);
        const followUps = profileFollowUps.filter((item) => item.orchestrationProfile?.id === profile.id);
        const followUpSummary = summarizeSpecialistFollowUpItems(followUps);
        const missionStatusCounts = Object.fromEntries(MISSION_STATUSES.map((status) => [status, 0]));
        const latestMissionEntry = getLatestItem(missions, 'latestAt');
        const latestGroupEntry = getLatestItem(
          groups.map((group) => ({
            group,
            latestAt:
              getLatestItem(
                group.runs.map((run) => ({ latestAt: run.endedAt || run.startedAt || '' })),
                'latestAt',
              )?.latestAt || '',
          })),
          'latestAt',
        );
        const touchedWorkspaceIds = [...new Set(missions.map((entry) => entry.workspace?.id).filter(Boolean))].sort((left, right) =>
          String(left).localeCompare(String(right)),
        );

        for (const entry of missions) {
          if (missionStatusCounts[entry.mission.status] !== undefined) {
            missionStatusCounts[entry.mission.status] += 1;
          }
          if (entry.workspace?.id) {
            workspaceMissionCounts[entry.workspace.id] = (workspaceMissionCounts[entry.workspace.id] || 0) + 1;
          }
        }

        const healthDrift = summarizeOrchestrationProfileHealthDrift({
          qualityGateBlockedGroupCount: groups.filter((group) => group.qualityGate?.status === 'blocked').length,
          specialistFollowUpLatestReminderAt: followUpSummary.latestReminderAt,
          specialistFollowUpNeedsReminderCount: followUpSummary.needsReminderCount,
          specialistFollowUpNextReminderAt: followUpSummary.nextReminderAt,
          specialistFollowUpOverdueCount: followUpSummary.overdueCount,
          specialistFollowUpRequiredCount: followUps.length,
          specialistFollowUpReminderCountTotal: followUpSummary.reminderCountTotal,
        });
        const latestHealthProfileLink =
          followUpSummary.latestReminderAt || latestMissionEntry?.latestAt || latestGroupEntry?.latestAt
            ? {
                displayName: profile.displayName,
                id: profile.id,
                latestMission:
                  latestMissionEntry?.mission
                    ? {
                        id: latestMissionEntry.mission.id,
                        status: latestMissionEntry.mission.status,
                        updatedAt: latestMissionEntry.latestAt || null,
                        workspaceId: latestMissionEntry.workspace?.id || null,
                        workspaceName: latestMissionEntry.workspace?.name || null,
                      }
                    : null,
                latestParallelGroup: latestGroupEntry?.group
                  ? {
                      id: latestGroupEntry.group.id,
                      missionId: latestGroupEntry.group.missionId,
                      status: latestGroupEntry.group.status,
                      workspaceId: latestGroupEntry.group.workspace?.id || null,
                      workspaceName: latestGroupEntry.group.workspace?.name || null,
                    }
                  : null,
                latestUsedAt:
                  followUpSummary.latestReminderAt ||
                  latestMissionEntry?.latestAt ||
                  latestGroupEntry?.latestAt ||
                  null,
                reasonCodes: healthDrift.reasonCodes,
                status: healthDrift.status,
              }
            : null;
        healthDrift.latestProfile = latestHealthProfileLink;
        healthDrift.latestFollowUpRequiredProfile =
          healthDrift.status === 'follow-up-required' ? latestHealthProfileLink : null;
        healthDrift.latestWatchProfile =
          healthDrift.status === 'watch' ? latestHealthProfileLink : null;
        healthDrift.latestStableProfile =
          healthDrift.status === 'stable' ? latestHealthProfileLink : null;
        const workspaceHealthEntries = touchedWorkspaceIds.map((workspaceId) => {
          const workspace = workspaceById.get(workspaceId) || null;
          const workspaceGroups = groups.filter((group) => group.workspace?.id === workspaceId);
          const workspaceFollowUps = followUps.filter((item) => item.workspaceId === workspaceId);
          const workspaceFollowUpSummary = summarizeSpecialistFollowUpItems(workspaceFollowUps);
          const workspaceLatestMissionEntry = getLatestItem(
            missions.filter((entry) => entry.workspace?.id === workspaceId),
            'latestAt',
          );
          const workspaceLatestGroupEntry = getLatestItem(
            workspaceGroups.map((group) => ({
              group,
              latestAt:
                getLatestItem(
                  group.runs.map((run) => ({ latestAt: run.endedAt || run.startedAt || '' })),
                  'latestAt',
                )?.latestAt || '',
            })),
            'latestAt',
          );
          const workspaceHealthDrift = summarizeOrchestrationProfileHealthDrift({
            qualityGateBlockedGroupCount: workspaceGroups.filter((group) => group.qualityGate?.status === 'blocked')
              .length,
            specialistFollowUpLatestReminderAt: workspaceFollowUpSummary.latestReminderAt,
            specialistFollowUpNeedsReminderCount: workspaceFollowUpSummary.needsReminderCount,
            specialistFollowUpNextReminderAt: workspaceFollowUpSummary.nextReminderAt,
            specialistFollowUpOverdueCount: workspaceFollowUpSummary.overdueCount,
            specialistFollowUpRequiredCount: workspaceFollowUps.length,
            specialistFollowUpReminderCountTotal: workspaceFollowUpSummary.reminderCountTotal,
          });

          return {
            id: workspaceId,
            latestAt:
              workspaceFollowUpSummary.latestReminderAt ||
              workspaceLatestMissionEntry?.latestAt ||
              workspaceLatestGroupEntry?.latestAt ||
              null,
            name:
              workspace?.name ||
              workspaceLatestMissionEntry?.workspace?.name ||
              workspaceLatestGroupEntry?.group.workspace?.name ||
              null,
            profileDisplayName: profile.displayName,
            profileId: profile.id,
            reasonCodes: workspaceHealthDrift.reasonCodes,
            status: workspaceHealthDrift.status,
          };
        });
        const workspaceHealthDrift = summarizeWorkspaceHealthDriftEntries(workspaceHealthEntries);
        workspaceHealthDrift.workspaceProfileCounts = Object.fromEntries(
          workspaceHealthEntries
            .filter((entry) => entry.status !== 'stable')
            .map((entry) => [entry.id, 1]),
        );
        workspaceHealthDrift.workspaceStatusCounts = {
          'follow-up-required': Object.fromEntries(
            workspaceHealthEntries
              .filter((entry) => entry.status === 'follow-up-required')
              .map((entry) => [entry.id, 1]),
          ),
          stable: {},
          watch: Object.fromEntries(
            workspaceHealthEntries
              .filter((entry) => entry.status === 'watch')
              .map((entry) => [entry.id, 1]),
          ),
        };
        const usageSummary = summarizeOrchestrationProfileUsageEntries(missions);
        const usageTrend = summarizeOrchestrationProfileUsageTrend({
          currentMonthStartDate: scopeLatestMonthStartDate,
          monthlyBuckets: usageSummary.usageMonthlyBuckets,
          used: missions.length > 0,
        });
        const workspaceUsageTrend = summarizeOrchestrationProfileWorkspaceUsageTrend({
          currentMonthStartDate: scopeLatestMonthStartDate,
          monthlyBuckets: usageSummary.usageMonthlyBuckets,
          used: missions.length > 0,
        });
        const workspaceUsageEntries = touchedWorkspaceIds.map((workspaceId) => {
          const workspace = workspaceById.get(workspaceId) || null;
          const workspaceMissions = missions.filter((entry) => entry.workspace?.id === workspaceId);
          const workspaceUsageSummary = summarizeOrchestrationProfileUsageEntries(workspaceMissions);
          const workspaceLatestMissionEntry = getLatestItem(workspaceMissions, 'latestAt');
          const perWorkspaceUsageTrend = summarizeOrchestrationProfileWorkspaceUsageTrend({
            currentMonthStartDate: scopeLatestMonthStartDate,
            monthlyBuckets: workspaceUsageSummary.usageMonthlyBuckets,
            used: workspaceMissions.length > 0,
          });
          const perWorkspaceMissionTrend = summarizeOrchestrationProfileUsageTrend({
            currentMonthStartDate: scopeLatestMonthStartDate,
            monthlyBuckets: workspaceUsageSummary.usageMonthlyBuckets,
            used: workspaceMissions.length > 0,
          });
          const perWorkspaceProfileFootprintTrend = summarizeOrchestrationWorkspaceProfileFootprintTrend({
            currentMonthStartDate: scopeLatestMonthStartDate,
            monthlyBuckets: workspaceUsageSummary.usageMonthlyBuckets,
            used: workspaceMissions.length > 0,
          });
          const workspaceAdoptionDrift = summarizeWorkspaceAdoptionDrift({
            missionTrend: perWorkspaceMissionTrend,
            profileFootprintTrend: perWorkspaceProfileFootprintTrend,
          });

          return {
            id: workspaceId,
            latestAt: workspaceLatestMissionEntry?.latestAt || null,
            missionTrend: perWorkspaceMissionTrend,
            name: workspace?.name || workspaceLatestMissionEntry?.workspace?.name || null,
            profileDisplayName: profile.displayName,
            profileId: profile.id,
            profileFootprintTrend: perWorkspaceProfileFootprintTrend,
            reasonCodes: workspaceAdoptionDrift.reasonCodes,
            status: perWorkspaceUsageTrend.status,
            adoptionDrift: workspaceAdoptionDrift,
            workspaceUsageTrend: perWorkspaceUsageTrend,
          };
        });
        const workspaceUsageAggregate = summarizeWorkspaceUsageTrendEntries(workspaceUsageEntries);
        workspaceUsageTrend.latestDecliningWorkspace = workspaceUsageAggregate.latestDecliningWorkspace;
        workspaceUsageTrend.latestGrowingWorkspace = workspaceUsageAggregate.latestGrowingWorkspace;
        workspaceUsageTrend.latestWorkspace = workspaceUsageAggregate.latestWorkspace;
        workspaceUsageTrend.workspaceCount = workspaceUsageAggregate.workspaceCount;
        workspaceUsageTrend.workspaceIdsByStatus = workspaceUsageAggregate.workspaceIdsByStatus;
        workspaceUsageTrend.workspaceStatusCounts = workspaceUsageAggregate.statusCounts;
        const workspaceAdoptionDrift = summarizeWorkspaceAdoptionDriftEntries(workspaceUsageEntries);
        const adoptionDrift = summarizeOrchestrationProfileAdoptionDrift({
          usageTrend,
          workspaceUsageTrend,
        });

        return {
          adoptionDrift,
          ...profile,
          healthDrift,
          latestMission: latestMissionEntry
            ? {
                id: latestMissionEntry.mission.id,
                status: latestMissionEntry.mission.status,
                title: latestMissionEntry.mission.title,
                updatedAt: latestMissionEntry.latestAt || null,
                workspaceId: latestMissionEntry.workspace?.id || latestMissionEntry.mission.workspaceId,
                workspaceName: latestMissionEntry.workspace?.name || null,
              }
            : null,
          latestParallelGroup: latestGroupEntry
            ? {
                latestAt: latestGroupEntry.latestAt || null,
                missionId: latestGroupEntry.group.mission?.id || null,
                missionTitle: latestGroupEntry.group.mission?.title || null,
                parallelGroupId: latestGroupEntry.group.parallelGroupId,
                qualityGate: latestGroupEntry.group.qualityGate,
                requiredKinds: latestGroupEntry.group.requiredKinds,
                wasMerged: latestGroupEntry.group.wasMerged,
                workspaceId: latestGroupEntry.group.workspace?.id || null,
                workspaceName: latestGroupEntry.group.workspace?.name || null,
              }
            : null,
          latestUsedAt: latestMissionEntry?.latestAt || latestGroupEntry?.latestAt || null,
          mergedParallelGroupCount: groups.filter((group) => group.wasMerged).length,
          missionCount: missions.length,
          missionStatusCounts,
          parallelGroupCount: groups.length,
          qualityGateBlockedGroupCount: groups.filter((group) => group.qualityGate?.status === 'blocked').length,
          specialistFollowUpKindCounts: followUpSummary.specialistKindCounts,
          specialistFollowUpLatestItem: followUpSummary.latestItem,
          specialistFollowUpLatestReminderAt: followUpSummary.latestReminderAt,
          specialistFollowUpNeedsReminderCount: followUpSummary.needsReminderCount,
          specialistFollowUpNextReminderAt: followUpSummary.nextReminderAt,
          specialistFollowUpOverdueCount: followUpSummary.overdueCount,
          specialistFollowUpProviderCounts: followUpSummary.providerCounts,
          specialistFollowUpRemediationRouteCounts: followUpSummary.remediationRouteCounts,
          specialistFollowUpRequiredCount: followUps.length,
          specialistFollowUpReminderCountTotal: followUpSummary.reminderCountTotal,
          specialistFollowUpRetryPolicyCounts: followUpSummary.retryPolicyCounts,
          specialistFollowUpStatusCounts: followUpSummary.statusCounts,
          touchedMissionIds: [...missionIds].sort((left, right) => String(left).localeCompare(String(right))),
          touchedWorkspaceIds,
          used: missions.length > 0,
          usageLatestMonthlyBucketDelta: usageSummary.usageLatestMonthlyBucketDelta,
          usageLatestMonthlyBucketStartDate: usageSummary.usageLatestMonthlyBucketStartDate,
          usageMonthlyBucketCount: usageSummary.usageMonthlyBucketCount,
          usageMonthlyBuckets: usageSummary.usageMonthlyBuckets,
          usageOldestMonthlyBucketStartDate: usageSummary.usageOldestMonthlyBucketStartDate,
          usageTrend,
          workspaceCount: touchedWorkspaceIds.length,
          workspaceAdoptionDrift,
          workspaceHealthDrift,
          workspaceUsageTrend,
          workspaceMissionCounts,
        };
      })
      .filter(
        (item) =>
          !filter.adoptionDriftReasonCode ||
          item.adoptionDrift.reasonCodes.includes(filter.adoptionDriftReasonCode),
      )
      .filter(
        (item) => !filter.adoptionDriftStatus || item.adoptionDrift.status === filter.adoptionDriftStatus,
      )
      .filter((item) => !filter.driftOnly || item.healthDrift.status !== 'stable')
      .filter((item) => !filter.reasonCode || item.healthDrift.reasonCodes.includes(filter.reasonCode))
      .filter((item) => !filter.status || item.healthDrift.status === filter.status)
      .filter((item) => !filter.usageTrend || item.usageTrend.status === filter.usageTrend)
      .filter(
        (item) =>
          !filter.workspaceUsageTrend || item.workspaceUsageTrend.status === filter.workspaceUsageTrend,
      )
      .filter(
        (item) =>
          !filter.workspaceAdoptionDriftReasonCode ||
          item.workspaceAdoptionDrift.reasonCodes.includes(filter.workspaceAdoptionDriftReasonCode),
      )
      .filter(
        (item) =>
          !filter.workspaceAdoptionDriftStatus ||
          item.workspaceAdoptionDrift.status === filter.workspaceAdoptionDriftStatus,
      )
      .filter((item) => !filter.workspaceDriftOnly || item.workspaceHealthDrift.status !== 'stable')
      .filter(
        (item) =>
          !filter.workspaceReasonCode ||
          item.workspaceHealthDrift.reasonCodes.includes(filter.workspaceReasonCode),
      )
      .filter((item) => !filter.workspaceStatus || item.workspaceHealthDrift.status === filter.workspaceStatus)
      .filter((item) => !filter.usedOnly || item.used)
      .sort((left, right) => {
        const leftUsed = left.used ? 1 : 0;
        const rightUsed = right.used ? 1 : 0;
        if (leftUsed !== rightUsed) {
          return rightUsed - leftUsed;
        }
        if (left.missionCount !== right.missionCount) {
          return right.missionCount - left.missionCount;
        }
        return String(left.id).localeCompare(String(right.id));
      });

    const summary = summarizeOrchestrationProfileOverviewItems(items);
    const usageSummary = summarizeOrchestrationProfileUsageEntries(missionEntries);
    summary.usageLatestMonthlyBucketDelta = usageSummary.usageLatestMonthlyBucketDelta;
    summary.usageLatestMonthlyBucketStartDate = usageSummary.usageLatestMonthlyBucketStartDate;
    summary.usageMonthlyBucketCount = usageSummary.usageMonthlyBucketCount;
    summary.usageMonthlyBuckets = usageSummary.usageMonthlyBuckets;
    summary.usageOldestMonthlyBucketStartDate = usageSummary.usageOldestMonthlyBucketStartDate;
    const workspaceAdoptionEntries = [...workspaceById.keys()]
      .map((workspaceId) => {
        const workspaceEntries = missionEntries.filter((entry) => entry.workspace?.id === workspaceId);
        if (workspaceEntries.length === 0) {
          return null;
        }
        const workspace = workspaceById.get(workspaceId) || null;
        const workspaceUsageSummary = summarizeOrchestrationProfileUsageEntries(workspaceEntries);
        const missionTrend = summarizeOrchestrationProfileUsageTrend({
          currentMonthStartDate: scopeLatestMonthStartDate,
          monthlyBuckets: workspaceUsageSummary.usageMonthlyBuckets,
          used: workspaceEntries.length > 0,
        });
        const profileFootprintTrend = summarizeOrchestrationWorkspaceProfileFootprintTrend({
          currentMonthStartDate: scopeLatestMonthStartDate,
          monthlyBuckets: workspaceUsageSummary.usageMonthlyBuckets,
          used: workspaceEntries.length > 0,
        });
        const adoptionDrift = summarizeWorkspaceAdoptionDrift({
          missionTrend,
          profileFootprintTrend,
        });
        const latestWorkspaceEntry = getLatestItem(workspaceEntries, 'latestAt');

        return {
          adoptionDrift,
          id: workspaceId,
          latestAt: latestWorkspaceEntry?.latestAt || null,
          missionTrend,
          name: workspace?.name || latestWorkspaceEntry?.workspace?.name || null,
          profileDisplayName: latestWorkspaceEntry?.profile?.displayName || null,
          profileId: latestWorkspaceEntry?.profile?.id || null,
          profileFootprintTrend,
          reasonCodes: adoptionDrift.reasonCodes,
          status: adoptionDrift.status,
        };
      })
      .filter(Boolean);
    const usageTrend = summarizeOrchestrationProfileUsageTrend({
      currentMonthStartDate: scopeLatestMonthStartDate,
      monthlyBuckets: usageSummary.usageMonthlyBuckets,
      used: missionEntries.length > 0,
    });
    const workspaceUsageTrend = summarizeOrchestrationProfileWorkspaceUsageTrend({
      currentMonthStartDate: scopeLatestMonthStartDate,
      monthlyBuckets: usageSummary.usageMonthlyBuckets,
      used: missionEntries.length > 0,
    });
    const adoptionDrift = summarizeOrchestrationProfileAdoptionDrift({
      usageTrend,
      workspaceUsageTrend,
    });
    const workspaceAdoptionDrift = summarizeWorkspaceAdoptionDriftEntries(workspaceAdoptionEntries);
    summary.usageTrendCounts = Object.fromEntries(
      ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, 0]),
    );
    for (const item of items) {
      if (summary.usageTrendCounts[item.usageTrend.status] !== undefined) {
        summary.usageTrendCounts[item.usageTrend.status] += 1;
      }
    }
    summary.latestGrowingProfile =
      getLatestItem(
        items
          .filter((item) => item.usageTrend.status === 'growing')
          .map((item) => ({
            displayName: item.displayName,
            id: item.id,
            latestUsedAt: item.latestUsedAt || '',
            usageTrend: item.usageTrend,
          })),
        'latestUsedAt',
      ) || null;
    summary.latestDecliningProfile =
      getLatestItem(
        items
          .filter((item) => item.usageTrend.status === 'declining')
          .map((item) => ({
            displayName: item.displayName,
            id: item.id,
            latestUsedAt: item.latestUsedAt || '',
            usageTrend: item.usageTrend,
          })),
        'latestUsedAt',
      ) || null;
    summary.latestUnusedProfile =
      items
        .filter((item) => item.usageTrend.status === 'unused')
        .map((item) => ({
          displayName: item.displayName,
          id: item.id,
          latestUsedAt: item.latestUsedAt || null,
          usageTrend: item.usageTrend,
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id)))[0] || null;
    summary.workspaceUsageTrendCounts = Object.fromEntries(
      ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, 0]),
    );
    for (const item of items) {
      if (summary.workspaceUsageTrendCounts[item.workspaceUsageTrend.status] !== undefined) {
        summary.workspaceUsageTrendCounts[item.workspaceUsageTrend.status] += 1;
      }
    }
    summary.latestGrowingWorkspaceUsageProfile =
      getLatestItem(
        items
          .filter((item) => item.workspaceUsageTrend.status === 'growing')
          .map((item) => ({
            displayName: item.displayName,
            id: item.id,
            latestUsedAt: item.latestUsedAt || '',
            workspaceUsageTrend: item.workspaceUsageTrend,
          })),
        'latestUsedAt',
      ) || null;
    summary.latestDecliningWorkspaceUsageProfile =
      getLatestItem(
        items
          .filter((item) => item.workspaceUsageTrend.status === 'declining')
          .map((item) => ({
            displayName: item.displayName,
            id: item.id,
            latestUsedAt: item.latestUsedAt || '',
            workspaceUsageTrend: item.workspaceUsageTrend,
          })),
        'latestUsedAt',
      ) || null;
    summary.latestUnusedWorkspaceUsageProfile =
      items
        .filter((item) => item.workspaceUsageTrend.status === 'unused')
        .map((item) => ({
          displayName: item.displayName,
          id: item.id,
          latestUsedAt: item.latestUsedAt || null,
          workspaceUsageTrend: item.workspaceUsageTrend,
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id)))[0] || null;
    summary.latestGrowingWorkspaceUsageWorkspace =
      getLatestItem(
        items
          .filter((item) => item.used && item.workspaceUsageTrend.status === 'growing')
          .map((item) => ({
            id:
              item.latestMission?.workspaceId ||
              item.latestParallelGroup?.workspaceId ||
              item.touchedWorkspaceIds?.[0] ||
              null,
            latestUsedAt: item.latestUsedAt || '',
            name:
              item.latestMission?.workspaceName ||
              item.latestParallelGroup?.workspaceName ||
              null,
            profileDisplayName: item.displayName,
            profileId: item.id,
            workspaceUsageTrend: item.workspaceUsageTrend,
          }))
          .filter((item) => item.id),
        'latestUsedAt',
      ) || null;
    summary.latestDecliningWorkspaceUsageWorkspace =
      getLatestItem(
        items
          .filter((item) => item.used && item.workspaceUsageTrend.status === 'declining')
          .map((item) => ({
            id:
              item.latestMission?.workspaceId ||
              item.latestParallelGroup?.workspaceId ||
              item.touchedWorkspaceIds?.[0] ||
              null,
            latestUsedAt: item.latestUsedAt || '',
            name:
              item.latestMission?.workspaceName ||
              item.latestParallelGroup?.workspaceName ||
              null,
            profileDisplayName: item.displayName,
            profileId: item.id,
            workspaceUsageTrend: item.workspaceUsageTrend,
          }))
          .filter((item) => item.id),
        'latestUsedAt',
      ) || null;
    summary.adoptionDriftCounts = Object.fromEntries(
      ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [status, 0]),
    );
    for (const item of items) {
      if (summary.adoptionDriftCounts[item.adoptionDrift.status] !== undefined) {
        summary.adoptionDriftCounts[item.adoptionDrift.status] += 1;
      }
    }
    summary.latestGrowingAdoptionProfile =
      getLatestItem(
        items
          .filter((item) => item.adoptionDrift.status === 'growing')
          .map((item) => ({
            adoptionDrift: item.adoptionDrift,
            displayName: item.displayName,
            id: item.id,
            latestUsedAt: item.latestUsedAt || '',
          })),
        'latestUsedAt',
      ) || null;
    summary.latestDecliningAdoptionProfile =
      getLatestItem(
        items
          .filter((item) => item.adoptionDrift.status === 'declining')
          .map((item) => ({
            adoptionDrift: item.adoptionDrift,
            displayName: item.displayName,
            id: item.id,
            latestUsedAt: item.latestUsedAt || '',
          })),
        'latestUsedAt',
      ) || null;
    summary.latestUnusedAdoptionProfile =
      items
        .filter((item) => item.adoptionDrift.status === 'unused')
        .map((item) => ({
          adoptionDrift: item.adoptionDrift,
          displayName: item.displayName,
          id: item.id,
          latestUsedAt: item.latestUsedAt || null,
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id)))[0] || null;
    summary.latestGrowingWorkspaceAdoptionProfile =
      getLatestItem(
        items
          .filter((item) => item.workspaceAdoptionDrift.status === 'growing')
          .map((item) => ({
            displayName: item.displayName,
            id: item.id,
            latestUsedAt: item.latestUsedAt || '',
            workspaceAdoptionDrift: item.workspaceAdoptionDrift,
          })),
        'latestUsedAt',
      ) || null;
    summary.latestDecliningWorkspaceAdoptionProfile =
      getLatestItem(
        items
          .filter((item) => item.workspaceAdoptionDrift.status === 'declining')
          .map((item) => ({
            displayName: item.displayName,
            id: item.id,
            latestUsedAt: item.latestUsedAt || '',
            workspaceAdoptionDrift: item.workspaceAdoptionDrift,
          })),
        'latestUsedAt',
      ) || null;
    summary.latestGrowingWorkspaceAdoptionWorkspace =
      getLatestItem(
        workspaceAdoptionEntries
          .filter((entry) => entry.status === 'growing')
          .map((entry) => ({
            adoptionDrift: entry.adoptionDrift,
            id: entry.id,
            latestAt: entry.latestAt || '',
            missionTrend: entry.missionTrend || null,
            name: entry.name || null,
            profileFootprintTrend: entry.profileFootprintTrend || null,
          })),
        'latestAt',
      ) || null;
    summary.latestDecliningWorkspaceAdoptionWorkspace =
      getLatestItem(
        workspaceAdoptionEntries
          .filter((entry) => entry.status === 'declining')
          .map((entry) => ({
            adoptionDrift: entry.adoptionDrift,
            id: entry.id,
            latestAt: entry.latestAt || '',
            missionTrend: entry.missionTrend || null,
            name: entry.name || null,
            profileFootprintTrend: entry.profileFootprintTrend || null,
          })),
        'latestAt',
      ) || null;
    const healthDrift = {
      latestFollowUpRequiredProfile: summary.latestHealthDriftFollowUpRequiredProfile,
      latestProfile: summary.latestHealthDriftProfile,
      latestStableProfile: summary.latestHealthDriftStableProfile,
      latestWatchProfile: summary.latestHealthDriftWatchProfile,
      profileCount: summary.healthDriftProfileCount,
      reasonCodeCounts: summary.healthDriftReasonCodeCounts,
      reasonCodes: Object.keys(summary.healthDriftReasonCodeCounts).sort((left, right) =>
        String(left).localeCompare(String(right)),
      ),
      status:
        summary.healthDriftStatusCounts['follow-up-required'] > 0
          ? 'follow-up-required'
          : summary.healthDriftStatusCounts.watch > 0
            ? 'watch'
            : 'stable',
      statusCounts: summary.healthDriftStatusCounts,
    };
    summary.healthDriftStatus = healthDrift.status;
    summary.healthDriftCounts = healthDrift.statusCounts;
    summary.healthDriftReasonCodes = healthDrift.reasonCodes;
    summary.healthDriftLatestFollowUpRequiredProfile = healthDrift.latestFollowUpRequiredProfile;
    summary.healthDriftLatestProfile = healthDrift.latestProfile;
    summary.healthDriftLatestStableProfile = healthDrift.latestStableProfile;
    summary.healthDriftLatestWatchProfile = healthDrift.latestWatchProfile;
    usageTrend.latestDecliningProfile = summary.latestDecliningProfile;
    usageTrend.latestGrowingProfile = summary.latestGrowingProfile;
    usageTrend.latestProfile = summary.latestUsedProfile;
    usageTrend.latestUnusedProfile = summary.latestUnusedProfile;
    usageTrend.profileCount = summary.total;
    usageTrend.statusCounts = summary.usageTrendCounts;
    adoptionDrift.latestDecliningProfile = summary.latestDecliningAdoptionProfile;
    adoptionDrift.latestGrowingProfile = summary.latestGrowingAdoptionProfile;
    adoptionDrift.latestProfile = summary.latestAdoptionDriftProfile;
    adoptionDrift.latestUnusedProfile = summary.latestUnusedAdoptionProfile;
    adoptionDrift.profileCount = summary.adoptionDriftProfileCount;
    adoptionDrift.reasonCodeCounts = summary.adoptionDriftReasonCodeCounts;
    adoptionDrift.reasonCodes = Object.keys(summary.adoptionDriftReasonCodeCounts).sort((left, right) =>
      String(left).localeCompare(String(right)),
    );
    adoptionDrift.statusCounts = summary.adoptionDriftStatusCounts;
    workspaceUsageTrend.latestDecliningProfile = summary.latestDecliningWorkspaceUsageProfile;
    workspaceUsageTrend.latestDecliningWorkspace = summary.latestDecliningWorkspaceUsageWorkspace;
    workspaceUsageTrend.latestGrowingProfile = summary.latestGrowingWorkspaceUsageProfile;
    workspaceUsageTrend.latestGrowingWorkspace = summary.latestGrowingWorkspaceUsageWorkspace;
    workspaceUsageTrend.latestProfile = summary.latestUsedProfile;
    workspaceUsageTrend.latestUnusedProfile = summary.latestUnusedWorkspaceUsageProfile;
    workspaceUsageTrend.latestWorkspace = summary.latestUsedWorkspace;
    workspaceUsageTrend.latestWorkspaceId = workspaceUsageTrend.latestWorkspace?.id || null;
    workspaceUsageTrend.latestWorkspaceName = workspaceUsageTrend.latestWorkspace?.name || null;
    workspaceUsageTrend.latestWorkspaceProfileId =
      workspaceUsageTrend.latestWorkspace?.profileId || null;
    workspaceUsageTrend.latestWorkspaceStatus =
      workspaceUsageTrend.latestWorkspace?.workspaceUsageTrend?.status || null;
    workspaceUsageTrend.profileCount = summary.total;
    workspaceUsageTrend.statusCounts = summary.workspaceUsageTrendCounts;
    workspaceUsageTrend.workspaceCount = Object.keys(summary.workspaceUsageTrendProfileCounts || {}).length;
    workspaceUsageTrend.workspaceIdsByStatus = Object.fromEntries(
      ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [
        status,
        Object.keys(summary.workspaceUsageTrendStatusCounts?.[status] || {}).sort((left, right) =>
          String(left).localeCompare(String(right)),
        ),
      ]),
    );
    workspaceUsageTrend.workspaceProfileCounts = summary.workspaceUsageTrendProfileCounts;
    workspaceUsageTrend.workspaceStatusCounts = Object.fromEntries(
      ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES.map((status) => [
        status,
        Object.keys(summary.workspaceUsageTrendStatusCounts?.[status] || {}).length,
      ]),
    );
    workspaceAdoptionDrift.latestDecliningProfile = summary.latestDecliningWorkspaceAdoptionProfile;
    workspaceAdoptionDrift.latestDecliningWorkspace = summary.latestDecliningWorkspaceAdoptionWorkspace;
    workspaceAdoptionDrift.latestGrowingProfile = summary.latestGrowingWorkspaceAdoptionProfile;
    workspaceAdoptionDrift.latestGrowingWorkspace = summary.latestGrowingWorkspaceAdoptionWorkspace;
    const workspaceHealthDrift = summarizeWorkspaceHealthDriftEntries(
      summary.touchedWorkspaceIds.map((workspaceId) => {
        const workspace = workspaceById.get(workspaceId) || null;
        const workspaceMissions = missionEntries.filter((entry) => entry.workspace?.id === workspaceId);
        const workspaceGroups = profileGroups.filter((group) => group.workspace?.id === workspaceId);
        const workspaceFollowUps = profileFollowUps.filter((item) => item.workspaceId === workspaceId);
        const workspaceFollowUpSummary = summarizeSpecialistFollowUpItems(workspaceFollowUps);
        const workspaceLatestMissionEntry = getLatestItem(workspaceMissions, 'latestAt');
        const workspaceLatestGroupEntry = getLatestItem(
          workspaceGroups.map((group) => ({
            group,
            latestAt:
              getLatestItem(
                group.runs.map((run) => ({ latestAt: run.endedAt || run.startedAt || '' })),
                'latestAt',
              )?.latestAt || '',
          })),
          'latestAt',
        );
        const workspaceDrift = summarizeOrchestrationProfileHealthDrift({
          qualityGateBlockedGroupCount: workspaceGroups.filter((group) => group.qualityGate?.status === 'blocked')
            .length,
          specialistFollowUpLatestReminderAt: workspaceFollowUpSummary.latestReminderAt,
          specialistFollowUpNeedsReminderCount: workspaceFollowUpSummary.needsReminderCount,
          specialistFollowUpNextReminderAt: workspaceFollowUpSummary.nextReminderAt,
          specialistFollowUpOverdueCount: workspaceFollowUpSummary.overdueCount,
          specialistFollowUpRequiredCount: workspaceFollowUps.length,
          specialistFollowUpReminderCountTotal: workspaceFollowUpSummary.reminderCountTotal,
        });

        return {
          id: workspaceId,
          latestAt:
            workspaceFollowUpSummary.latestReminderAt ||
            workspaceLatestMissionEntry?.latestAt ||
            workspaceLatestGroupEntry?.latestAt ||
            null,
          name:
            workspace?.name ||
            workspaceLatestMissionEntry?.workspace?.name ||
            workspaceLatestGroupEntry?.group.workspace?.name ||
            null,
          profileDisplayName:
            summary.latestHealthDriftWorkspace?.id === workspaceId
              ? summary.latestHealthDriftWorkspace.profileDisplayName ||
                workspaceLatestMissionEntry?.profile?.displayName ||
                workspaceLatestGroupEntry?.group.orchestrationProfile?.displayName ||
                null
              : workspaceLatestMissionEntry?.profile?.displayName ||
                workspaceLatestGroupEntry?.group.orchestrationProfile?.displayName ||
                null,
          profileId:
            summary.latestHealthDriftWorkspace?.id === workspaceId
              ? summary.latestHealthDriftWorkspace.profileId ||
                workspaceLatestMissionEntry?.profile?.id ||
                workspaceLatestGroupEntry?.group.orchestrationProfile?.id ||
                null
              : workspaceLatestMissionEntry?.profile?.id ||
                workspaceLatestGroupEntry?.group.orchestrationProfile?.id ||
                null,
          reasonCodes:
            workspaceDrift.status === 'follow-up-required'
              ? ['workspace-profile-follow-up-required']
              : workspaceDrift.status === 'watch'
                ? ['workspace-profile-watch']
                : [],
          status: workspaceDrift.status,
        };
      }),
    );
    workspaceHealthDrift.workspaceProfileCounts =
      summary.workspaceHealthDriftProfileCounts;
    workspaceHealthDrift.workspaceStatusCounts =
      summary.workspaceHealthDriftStatusCounts;
    workspaceHealthDrift.latestWorkspace = summary.latestHealthDriftWorkspace;
    summary.workspaceHealthDriftStatus = workspaceHealthDrift.status;
    summary.workspaceHealthDriftCounts = workspaceHealthDrift.statusCounts;
    summary.workspaceHealthDriftReasonCodes = workspaceHealthDrift.reasonCodes;
    summary.workspaceHealthDriftReasonCodeCounts =
      workspaceHealthDrift.reasonCodeCounts;
    summary.workspaceHealthDriftLatestFollowUpRequiredWorkspace =
      workspaceHealthDrift.latestFollowUpRequiredWorkspace;
    summary.workspaceHealthDriftLatestStableWorkspace =
      workspaceHealthDrift.latestStableWorkspace;
    summary.workspaceHealthDriftLatestWatchWorkspace =
      workspaceHealthDrift.latestWatchWorkspace;
    summary.workspaceHealthDriftLatestWorkspace = workspaceHealthDrift.latestWorkspace;
    summary.workspaceHealthDriftWorkspaceCount = workspaceHealthDrift.workspaceCount;
    summary.workspaceHealthDriftWorkspaceProfileCounts =
      summary.workspaceHealthDriftProfileCounts;
    summary.workspaceHealthDriftWorkspaceStatusCounts =
      summary.workspaceHealthDriftStatusCounts;
    summary.workspaceHealthDriftWorkspaceIdsByStatus =
      workspaceHealthDrift.workspaceIdsByStatus;
    summary.workspaceAdoptionDriftCounts = workspaceAdoptionDrift.statusCounts;
    summary.workspaceAdoptionDriftMissionTrendStatus =
      workspaceAdoptionDrift.missionTrendStatus;
    summary.workspaceAdoptionDriftMissionTrendStatusCounts =
      workspaceAdoptionDrift.missionTrendStatusCounts;
    summary.workspaceAdoptionDriftProfileFootprintTrendStatus =
      workspaceAdoptionDrift.profileFootprintTrendStatus;
    summary.workspaceAdoptionDriftProfileFootprintTrendStatusCounts =
      workspaceAdoptionDrift.profileFootprintTrendStatusCounts;
    summary.workspaceAdoptionDriftStatus = workspaceAdoptionDrift.status;
    summary.workspaceAdoptionDriftReasonCodes = workspaceAdoptionDrift.reasonCodes;
    summary.workspaceAdoptionDriftReasonCodeCounts = workspaceAdoptionDrift.reasonCodeCounts;
    summary.workspaceAdoptionDriftLatestGrowingProfile =
      workspaceAdoptionDrift.latestGrowingProfile;
    summary.workspaceAdoptionDriftLatestDecliningProfile =
      workspaceAdoptionDrift.latestDecliningProfile;
    summary.workspaceAdoptionDriftLatestProfile = workspaceAdoptionDrift.latestProfile;
    summary.workspaceAdoptionDriftLatestGrowingWorkspace =
      workspaceAdoptionDrift.latestGrowingWorkspace;
    summary.workspaceAdoptionDriftLatestDecliningWorkspace =
      workspaceAdoptionDrift.latestDecliningWorkspace;
    summary.workspaceAdoptionDriftLatestWorkspace = workspaceAdoptionDrift.latestWorkspace;
    summary.workspaceAdoptionDriftWorkspaceCount = workspaceAdoptionDrift.workspaceCount;
    summary.workspaceAdoptionDriftWorkspaceProfileCounts =
      summary.workspaceAdoptionDriftProfileCounts;
    summary.workspaceAdoptionDriftWorkspaceStatusCounts =
      summary.workspaceAdoptionDriftStatusCounts;
    summary.workspaceAdoptionDriftWorkspaceIdsByStatus =
      workspaceAdoptionDrift.workspaceIdsByStatus;
    summary.workspaceUsageTrendStatus = workspaceUsageTrend.status;
    summary.workspaceUsageTrendProfileCount = workspaceUsageTrend.profileCount;
    summary.workspaceUsageTrendCurrentMonthStartDate =
      workspaceUsageTrend.currentMonthStartDate;
    summary.workspaceUsageTrendCurrentMonthWorkspaceCount =
      workspaceUsageTrend.currentMonthWorkspaceCount;
    summary.workspaceUsageTrendPreviousMonthStartDate =
      workspaceUsageTrend.previousMonthStartDate;
    summary.workspaceUsageTrendPreviousMonthWorkspaceCount =
      workspaceUsageTrend.previousMonthWorkspaceCount;
    summary.workspaceUsageTrendWorkspaceCountDelta =
      workspaceUsageTrend.workspaceCountDelta;
    summary.workspaceUsageTrendWorkspaceCount = workspaceUsageTrend.workspaceCount;
    summary.workspaceUsageTrendProfileStatusCounts =
      workspaceUsageTrend.statusCounts;
    summary.workspaceUsageTrendWorkspaceProfileCounts =
      workspaceUsageTrend.workspaceProfileCounts;
    summary.workspaceUsageTrendLatestGrowingProfile =
      workspaceUsageTrend.latestGrowingProfile;
    summary.workspaceUsageTrendLatestDecliningProfile =
      workspaceUsageTrend.latestDecliningProfile;
    summary.workspaceUsageTrendLatestUnusedProfile =
      workspaceUsageTrend.latestUnusedProfile;
    summary.workspaceUsageTrendWorkspaceIdsByStatus =
      workspaceUsageTrend.workspaceIdsByStatus;
    summary.workspaceUsageTrendWorkspaceStatusCounts =
      workspaceUsageTrend.workspaceStatusCounts;
    summary.workspaceUsageTrendLatestGrowingWorkspace =
      workspaceUsageTrend.latestGrowingWorkspace;
    summary.workspaceUsageTrendLatestDecliningWorkspace =
      workspaceUsageTrend.latestDecliningWorkspace;
    summary.workspaceUsageTrendLatestProfile = workspaceUsageTrend.latestProfile;
    summary.workspaceUsageTrendLatestWorkspace = workspaceUsageTrend.latestWorkspace;
    summary.workspaceUsageTrendLatestWorkspaceProfileId =
      workspaceUsageTrend.latestWorkspace?.profileId || null;
    summary.workspaceUsageTrendLatestWorkspaceId =
      workspaceUsageTrend.latestWorkspace?.id || null;
    summary.workspaceUsageTrendLatestWorkspaceName =
      workspaceUsageTrend.latestWorkspace?.name || null;
    summary.workspaceUsageTrendLatestWorkspaceStatus =
      workspaceUsageTrend.latestWorkspace?.workspaceUsageTrend?.status || null;
    summary.usageTrendStatus = usageTrend.status;
    summary.usageTrendProfileCount = usageTrend.profileCount;
    summary.usageTrendCurrentMonthStartDate = usageTrend.currentMonthStartDate;
    summary.usageTrendCurrentMonthMissionCount = usageTrend.currentMonthMissionCount;
    summary.usageTrendPreviousMonthStartDate = usageTrend.previousMonthStartDate;
    summary.usageTrendPreviousMonthMissionCount = usageTrend.previousMonthMissionCount;
    summary.usageTrendMissionCountDelta = usageTrend.missionCountDelta;
    summary.usageTrendStatusCounts = usageTrend.statusCounts;
    summary.usageTrendLatestGrowingProfile = usageTrend.latestGrowingProfile;
    summary.usageTrendLatestDecliningProfile = usageTrend.latestDecliningProfile;
    summary.usageTrendLatestProfile = usageTrend.latestProfile;
    summary.usageTrendLatestUnusedProfile = usageTrend.latestUnusedProfile;
    summary.adoptionDriftStatus = adoptionDrift.status;
    summary.adoptionDriftStatusCounts = adoptionDrift.statusCounts;
    summary.adoptionDriftReasonCodes = adoptionDrift.reasonCodes;
    summary.adoptionDriftUsageTrendStatus = adoptionDrift.usageTrendStatus;
    summary.adoptionDriftWorkspaceUsageTrendStatus =
      adoptionDrift.workspaceUsageTrendStatus;
    summary.adoptionDriftLatestProfile = adoptionDrift.latestProfile;
    summary.adoptionDriftLatestGrowingProfile = adoptionDrift.latestGrowingProfile;
    summary.adoptionDriftLatestDecliningProfile = adoptionDrift.latestDecliningProfile;
    summary.adoptionDriftLatestUnusedProfile = adoptionDrift.latestUnusedProfile;

    return {
      filters: {
        adoptionDriftReasonCode: filter.adoptionDriftReasonCode || null,
        adoptionDriftStatus: filter.adoptionDriftStatus || null,
        driftOnly: Boolean(filter.driftOnly),
        mode: filter.mode || null,
        reasonCode: filter.reasonCode || null,
        status: filter.status || null,
        usageTrend: filter.usageTrend || null,
        usedOnly: Boolean(filter.usedOnly),
        workspaceDriftOnly: Boolean(filter.workspaceDriftOnly),
        workspaceAdoptionDriftReasonCode: filter.workspaceAdoptionDriftReasonCode || null,
        workspaceAdoptionDriftStatus: filter.workspaceAdoptionDriftStatus || null,
        workspaceId: filter.workspaceId || null,
        workspaceReasonCode: filter.workspaceReasonCode || null,
        workspaceStatus: filter.workspaceStatus || null,
        workspaceUsageTrend: filter.workspaceUsageTrend || null,
      },
      adoptionDrift,
      healthDrift,
      usageTrend,
      workspaceAdoptionDrift,
      workspaceHealthDrift,
      workspaceUsageTrend,
      items,
      summary,
    };
  }

  function buildSpecialistTimelineEvents(filter = {}) {
    return buildParallelGroupStates(filter)
      .flatMap((group) => {
        const runEvents = group.runs
          .filter((run) => !filter.missionId || run.missionId === filter.missionId)
          .map((run) => {
            const mission = group.mission;
            const workspace = group.workspace;
            const status = normalizeAgentRunStatus(run.status);
            const at = run.endedAt || run.startedAt || now();

            if (normalizeText(run.stageKind) === 'parallel-merge') {
              return {
                at,
                detail: run.outputSummary || `Parallel specialist merge ${status}.`,
                kind: status === 'failed' ? 'specialist-merge-failed' : 'specialist-merge-completed',
                missionId: mission?.id || null,
                parallelGroupId: group.parallelGroupId,
                role: run.role,
                runId: run.id,
                sessionId: run.sessionId || null,
                status,
                workspaceId: workspace?.id || null,
                workspaceName: workspace?.name || null,
              };
            }

            if (!normalizeText(run.specialistKind)) {
              return null;
            }

            return {
              at,
              detail: run.outputSummary || `${run.specialistKind} specialist ${status}.`,
              kind: `specialist-branch-${status}`,
              missionId: mission?.id || null,
              parallelGroupId: group.parallelGroupId,
              role: run.role,
              runId: run.id,
              sessionId: run.sessionId || null,
              specialistKind: normalizeText(run.specialistKind),
              status,
              workspaceId: workspace?.id || null,
              workspaceName: workspace?.name || null,
            };
          })
          .filter(Boolean);
        const qualityGateEvents = ensureArray(group.qualityGate?.violations)
          .filter((violation) => {
            const latestRun = group.latestByKind.get(violation.specialistKind);
            return !['blocked', 'failed'].includes(normalizeAgentRunStatus(latestRun?.status));
          })
          .map((violation) => ({
            at: violation.at || now(),
            detail: violation.detail,
            kind: 'specialist-quality-gate-blocked',
            missionId: group.mission?.id || null,
            parallelGroupId: group.parallelGroupId,
            runId: violation.runId || null,
            sessionId: violation.sessionId || null,
            specialistKind: violation.specialistKind,
            status: violation.status || 'blocked',
            workspaceId: group.workspace?.id || null,
            workspaceName: group.workspace?.name || null,
          }));

        return [...runEvents, ...qualityGateEvents];
      })
      .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
  }


  function collectMissionTimelineEvents(mission) {
    const sessions = listSessions(mission.id);
    const rawSessions = store.listSessionsByMission(mission.id);
    const approvals = store.listApprovals({ missionId: mission.id });
    const escalations = store.listEscalations({ missionId: mission.id });
    const reviewerFollowUps = listReviewerFollowUpRecords({ missionId: mission.id });
    const providerExecutions = buildProviderExecutionEntries({ missionId: mission.id });
    const providerAttentionAcknowledgements = store.listProviderAttentionAcknowledgements({ missionId: mission.id });
    const providerAttentionRecoveredItems = buildProviderAttentionRecoveredItems({ missionId: mission.id });
    const gatewayEvents = store.listGatewayEvents({ missionId: mission.id });
    const learningCandidates = store.listLearningCandidates({ missionId: mission.id });
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

    for (const followUp of reviewerFollowUps) {
      timeline.push({
        actionId: followUp.actionId,
        at: followUp.createdAt,
        detail: followUp.reason || followUp.title,
        kind: 'reviewer-follow-up-opened',
        missionId: mission.id,
        sessionId: followUp.sessionId,
        status: followUp.status,
      });

      if (followUp.resolvedAt) {
        timeline.push({
          actionId: followUp.actionId,
          at: followUp.resolvedAt,
          detail: formatReviewerFollowUpResolutionDetail({
            resolutionKind: followUp.resolutionKind,
            resolutionNote: followUp.resolutionNote,
          }),
          kind: 'reviewer-follow-up-resolved',
          missionId: mission.id,
          sessionId: followUp.sessionId,
          status: followUp.status,
        });
      }
    }

    timeline.push(...buildMissionGatewayTimelineEvents({ gatewayEvents, mission }));

    for (const candidate of learningCandidates) {
      timeline.push({
        at: candidate.createdAt,
        detail: candidate.summary || candidate.title,
        kind: 'learning-candidate-created',
        learningCandidateId: candidate.id,
        missionId: mission.id,
        promotionStatus: candidate.promotionStatus || null,
        providerFallbackPolicy: candidate.evidence?.providerFallbackPolicy || null,
        providerFallbackStopReasonCounts: candidate.evidence?.providerFallbackStopReasonCounts || {},
        providerFallbackSummary: candidate.evidence?.providerFallbackSummary || null,
        recordType: candidate.recordType,
        sessionId: candidate.sessionId,
        status: candidate.status,
        workspaceId: candidate.workspaceId || mission.workspaceId,
      });

      if (candidate.promotionScopeAuthorization?.authorizedAt) {
        const authorization = candidate.promotionScopeAuthorization;
        timeline.push({
          at: authorization.authorizedAt,
          authorizedBy: authorization.authorizedBy,
          detail: `authorized learning candidate scope ${authorization.fromScope}→${authorization.toScope}: ${authorization.note}`,
          fromScope: authorization.fromScope,
          fromScopeId: authorization.fromScopeId,
          kind: 'learning-candidate-promotion-scope-authorized',
          learningCandidateId: candidate.id,
          missionId: mission.id,
          promotionStatus: candidate.promotionStatus || null,
          scopeAuthorizationId: authorization.id,
          sessionId: candidate.sessionId,
          status: 'authorized',
          authorizationStatus: authorization.status,
          toScope: authorization.toScope,
          toScopeId: authorization.toScopeId,
          workspaceId: candidate.workspaceId || mission.workspaceId,
        });
      }

      if (candidate.promotionDecision?.decidedAt) {
        const promotionDecision = candidate.promotionDecision;
        const promotionDecisionKind =
          promotionDecision.decision === 'approve'
            ? 'learning-candidate-promotion-approved'
            : promotionDecision.decision === 'blocked'
              ? 'learning-candidate-promotion-verification-blocked'
              : 'learning-candidate-promotion-rejected';
        const stopReasonSuffix = candidate.promotionStopCondition?.reason
          ? ` stopReason=${candidate.promotionStopCondition.reason}.`
          : '';
        timeline.push({
          at: promotionDecision.decidedAt,
          detail: `${promotionDecision.decision} learning candidate promotion target=${promotionDecision.target} scope=${promotionDecision.scope}:${stopReasonSuffix} ${promotionDecision.note}`,
          kind: promotionDecisionKind,
          learningCandidateId: candidate.id,
          memoryId: promotionDecision.memoryId || null,
          missionId: mission.id,
          promotionStopCondition: candidate.promotionStopCondition || null,
          promotionStopReason: candidate.promotionStopCondition?.reason || null,
          promotionStatus: candidate.promotionStatus || null,
          promotionVerificationId: promotionDecision.verificationId || candidate.promotionVerification?.id || null,
          promotionVerificationStatus: candidate.promotionVerification?.status || null,
          promotionVerificationStopReason: candidate.promotionVerification?.stopReason ?? null,
          promotionVerificationType: candidate.promotionVerification?.verificationType || null,
          requestedDecision: promotionDecision.requestedDecision || promotionDecision.decision || null,
          recordType: candidate.recordType,
          ...(promotionDecision.scopeAuthorizationId
            ? { scopeAuthorizationId: promotionDecision.scopeAuthorizationId }
            : {}),
          sessionId: candidate.sessionId,
          status: candidate.status,
          target: promotionDecision.target,
          workspaceId: candidate.workspaceId || mission.workspaceId,
        });
      }

      const workspaceSelectionOverrideHistory = Array.isArray(
        candidate.workspaceLearningSelectionOverrideHistory,
      )
        ? candidate.workspaceLearningSelectionOverrideHistory
        : [];
      for (const overrideEvent of workspaceSelectionOverrideHistory) {
        timeline.push({
          at: overrideEvent.at,
          detail:
            overrideEvent.action === 'clear'
              ? `cleared workspace learning selection override: ${overrideEvent.note}`
              : `set workspace learning selection override until ${overrideEvent.expiresAt}: ${overrideEvent.note}`,
          expiresAt: overrideEvent.expiresAt || null,
          kind:
            overrideEvent.action === 'clear'
              ? 'workspace-learning-selection-override-cleared'
              : 'workspace-learning-selection-override-set',
          learningCandidateId: candidate.id,
          memoryId: overrideEvent.memoryId,
          missionId: mission.id,
          noteHash: overrideEvent.noteHash,
          overrideId: overrideEvent.overrideId,
          performedBy: overrideEvent.performedBy,
          sessionId: candidate.sessionId,
          status: overrideEvent.action === 'clear' ? 'cleared' : 'active',
          workspaceId: overrideEvent.workspaceId,
        });
      }

      const userSelectionOverrideHistory = Array.isArray(
        candidate.userLearningSelectionOverrideHistory,
      )
        ? candidate.userLearningSelectionOverrideHistory
        : [];
      for (const overrideEvent of userSelectionOverrideHistory) {
        timeline.push({
          at: overrideEvent.at,
          detail:
            overrideEvent.action === 'clear'
              ? `cleared user learning selection override: ${overrideEvent.note}`
              : `set user learning selection override until ${overrideEvent.expiresAt}: ${overrideEvent.note}`,
          expiresAt: overrideEvent.expiresAt || null,
          kind:
            overrideEvent.action === 'clear'
              ? 'user-learning-selection-override-cleared'
              : 'user-learning-selection-override-set',
          learningCandidateId: candidate.id,
          memoryId: overrideEvent.memoryId,
          missionId: mission.id,
          noteHash: overrideEvent.noteHash,
          overrideId: overrideEvent.overrideId,
          performedBy: overrideEvent.performedBy,
          scope: overrideEvent.scope,
          scopeId: overrideEvent.scopeId,
          sessionId: candidate.sessionId,
          status: overrideEvent.action === 'clear' ? 'cleared' : 'active',
          workspaceId: candidate.workspaceId || mission.workspaceId,
        });
      }

      if (candidate.promotionStopCondition?.resolvedAt) {
        const stopCondition = candidate.promotionStopCondition;
        timeline.push({
          at: stopCondition.resolvedAt,
          detail: `resolved learning candidate promotion stop-condition resolution=${stopCondition.resolution || 'unknown'} reason=${stopCondition.reason || 'unknown'}: ${stopCondition.resolutionNote || ''}`,
          kind: 'learning-candidate-promotion-stop-condition-resolved',
          learningCandidateId: candidate.id,
          memoryId: null,
          missionId: mission.id,
          promotionStopCondition: stopCondition,
          promotionStopReason: stopCondition.reason || null,
          promotionStatus: candidate.promotionStatus || null,
          promotionVerificationId: stopCondition.verificationId || candidate.promotionVerification?.id || null,
          promotionVerificationStatus: candidate.promotionVerification?.status || null,
          promotionVerificationStopReason: candidate.promotionVerification?.stopReason ?? null,
          recordType: candidate.recordType,
          requestedDecision: stopCondition.requestedDecision || null,
          resolution: stopCondition.resolution || null,
          sessionId: candidate.sessionId,
          status: candidate.status,
          target: stopCondition.target || null,
          workspaceId: candidate.workspaceId || mission.workspaceId,
        });
      }

      for (const reminder of ensureArray(candidate.promotionStopCondition?.reminders)) {
        timeline.push({
          actionId: reminder.actionId || `learning-promotion:${candidate.id}`,
          at: reminder.remindedAt || reminder.createdAt,
          detail: formatLearningPromotionStopConditionReminderDetail(reminder),
          kind: 'learning-candidate-promotion-stop-condition-reminded',
          learningCandidateId: candidate.id,
          missionId: mission.id,
          overdue: reminder.overdue === true,
          promotionStopReason: reminder.promotionStopReason || candidate.promotionStopCondition?.reason || null,
          promotionStatus: candidate.promotionStatus || null,
          reminderCadenceHours: reminder.reminderCadenceHours || null,
          reminderId: reminder.id || null,
          sessionId: candidate.sessionId,
          status: candidate.status,
          workspaceId: candidate.workspaceId || mission.workspaceId,
        });
      }

      if (candidate.promotionExpiration?.expiredAt) {
        timeline.push({
          at: candidate.promotionExpiration.expiredAt,
          detail: `expired learning candidate promotion policy=${candidate.promotionExpiration.policyId}: ${candidate.promotionExpiration.note}`,
          kind: 'learning-candidate-promotion-expired',
          learningCandidateId: candidate.id,
          missionId: mission.id,
          promotionStatus: candidate.promotionStatus || null,
          recordType: candidate.recordType,
          sessionId: candidate.sessionId,
          status: candidate.status,
          workspaceId: candidate.workspaceId || mission.workspaceId,
        });
      }

      if (candidate.promotionRollback?.rolledBackAt) {
        timeline.push({
          at: candidate.promotionRollback.rolledBackAt,
          detail: `rolled back learning candidate promotion target=${candidate.promotionRollback.target} scope=${candidate.promotionRollback.scope}: ${candidate.promotionRollback.note}`,
          kind: 'learning-candidate-promotion-rolled-back',
          learningCandidateId: candidate.id,
          memoryId: candidate.promotionRollback.memoryId || null,
          memoryRollbackStatus: candidate.promotionRollback.memoryRollbackStatus || null,
          missionId: mission.id,
          promotionStatus: candidate.promotionStatus || null,
          recordType: candidate.recordType,
          ...(candidate.promotionDecision?.scopeAuthorizationId
            ? { scopeAuthorizationId: candidate.promotionDecision.scopeAuthorizationId }
            : {}),
          sessionId: candidate.sessionId,
          status: candidate.status,
          target: candidate.promotionRollback.target,
          workspaceId: candidate.workspaceId || mission.workspaceId,
        });
      }
    }

    for (const execution of buildProviderExecutionTimeline(providerExecutions)) {
      timeline.push({
        at: execution.at,
        detail: execution.detail,
        estimatedCostUsd: execution.estimatedCostUsd,
        kind: execution.kind,
        missionId: mission.id,
        providerId: execution.providerId,
        role: execution.role,
        runId: execution.runId,
        sessionId: execution.sessionId,
        status: execution.status,
        workspaceId: execution.workspaceId || mission.workspaceId,
        workspaceName: execution.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionOpenedTimeline(
      [
        ...buildProviderAttentionPendingItems({ missionId: mission.id }),
        ...providerAttentionRecoveredItems,
      ],
      providerAttentionAcknowledgements,
    )) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        providerDisplayName: event.providerDisplayName,
        providerId: event.providerId,
        sessionId: event.sessionId || null,
        status: event.status || 'pending',
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionTimeline(providerAttentionAcknowledgements)) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        providerDisplayName: event.providerDisplayName,
        providerId: event.providerId,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionRecoveredTimeline(
      providerAttentionRecoveredItems,
    )) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        providerDisplayName: event.providerDisplayName,
        providerId: event.providerId,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionReminderTimeline(
      store.listProviderAttentionReminders({ missionId: mission.id }),
    )) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        providerDisplayName: event.providerDisplayName,
        providerId: event.providerId,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderFallbackTimelineEvents({ mission, sessions: rawSessions })) {
      timeline.push(event);
    }

    for (const event of buildSpecialistTimelineEvents({ missionId: mission.id })) {
      timeline.push(event);
    }

    for (const event of buildSpecialistFollowUpReminderTimeline(
      store.listSpecialistFollowUpReminders({ missionId: mission.id }),
    )) {
      timeline.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission.id,
        parallelGroupId: event.parallelGroupId || null,
        providerId: event.providerId || null,
        runId: event.runId || null,
        sessionId: event.sessionId || null,
        specialistKind: event.specialistKind || null,
        status: event.status || null,
        workspaceId: event.workspaceId || mission.workspaceId,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const escalation of escalations) {
      timeline.push({
        at: escalation.createdAt,
        detail: escalation.title,
        escalationId: escalation.id,
        kind: 'escalation-opened',
        missionId: mission.id,
        sessionId: escalation.sessionId,
        status: escalation.status,
      });

      if (escalation.resolvedAt) {
        timeline.push({
          at: escalation.resolvedAt,
          detail: escalation.resolutionNote || 'Escalation resolved.',
          escalationId: escalation.id,
          kind: 'escalation-resolved',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }

      for (const reminder of ensureArray(escalation.reminderHistory)) {
        timeline.push({
          at: reminder.at,
          detail: formatEscalationReminderDetail(reminder),
          escalationId: escalation.id,
          kind: 'escalation-reminded',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }

      for (const ownerChange of ensureArray(escalation.ownerHistory)) {
        if (!ownerChange.from || !ownerChange.to || ownerChange.from === ownerChange.to) {
          continue;
        }

        timeline.push({
          at: ownerChange.at,
          detail: formatEscalationOwnerChangeDetail(ownerChange),
          escalationId: escalation.id,
          kind: 'escalation-owner-changed',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }

      for (const handoff of ensureArray(escalation.ownerHandoffHistory)) {
        timeline.push({
          at: handoff.at,
          detail: formatEscalationOwnerHandoffDetail(handoff),
          escalationId: escalation.id,
          kind: 'escalation-owner-handoff-acknowledged',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }

      for (const reminder of ensureArray(escalation.ownerHandoffReminderHistory)) {
        timeline.push({
          at: reminder.at,
          detail: formatEscalationOwnerHandoffReminderDetail(reminder),
          escalationId: escalation.id,
          kind: 'escalation-owner-handoff-reminded',
          missionId: mission.id,
          sessionId: escalation.sessionId,
          status: escalation.status,
        });
      }
    }

    timeline.push(
      ...buildMissionMaintenanceTimelineEvents({
        mission,
        runs: listRelatedMaintenanceRunsForMission(mission.id),
      }),
    );

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

    return timeline;
  }

  function collectOperatorTimelineEvents(filter = {}) {
    const workspaceById = new Map(store.listWorkspaces().map((workspace) => [workspace.id, workspace]));
    const missionById = new Map(store.listMissions().map((mission) => [mission.id, mission]));
    const reviewerFollowUps = listReviewerFollowUpRecords(filter);
    const events = [];

    for (const approval of store.listApprovals()) {
      const mission = missionById.get(approval.missionId);
      const workspace = mission ? workspaceById.get(mission.workspaceId) : null;
      if (!mission || !workspace) {
        continue;
      }
      if (filter.workspaceId && workspace.id !== filter.workspaceId) {
        continue;
      }
      if (filter.missionId && mission.id !== filter.missionId) {
        continue;
      }

      events.push({
        approvalId: approval.id,
        at: approval.createdAt,
        detail: approval.title,
        kind: 'approval-requested',
        missionId: mission.id,
        missionTitle: mission.title,
        sessionId: approval.sessionId,
        status: approval.status,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });

      if (approval.resolvedAt) {
        events.push({
          approvalId: approval.id,
          at: approval.resolvedAt,
          detail: approval.decisionReason || 'Approval resolved.',
          kind: 'approval-resolved',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: approval.sessionId,
          status: approval.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }
    }

    for (const followUp of reviewerFollowUps) {
      const mission = missionById.get(followUp.missionId);
      const workspace = mission ? workspaceById.get(mission.workspaceId) : workspaceById.get(followUp.workspaceId);
      if (!mission || !workspace) {
        continue;
      }

      events.push({
        actionId: followUp.actionId,
        at: followUp.createdAt,
        detail: followUp.reason || followUp.title,
        kind: 'reviewer-follow-up-opened',
        missionId: mission.id,
        missionTitle: mission.title,
        sessionId: followUp.sessionId,
        status: followUp.status,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });

      if (followUp.resolvedAt) {
        events.push({
          actionId: followUp.actionId,
          at: followUp.resolvedAt,
          detail: formatReviewerFollowUpResolutionDetail({
            resolutionKind: followUp.resolutionKind,
            resolutionNote: followUp.resolutionNote,
          }),
          kind: 'reviewer-follow-up-resolved',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: followUp.sessionId,
          status: followUp.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }
    }

    for (const event of buildProviderExecutionTimeline(
      buildProviderExecutionEntries({
        missionId: filter.missionId,
        status: 'failed',
        workspaceId: filter.workspaceId,
      }),
    )) {
      events.push({
        at: event.at,
        detail: event.detail,
        estimatedCostUsd: event.estimatedCostUsd,
        kind: event.kind,
        missionId: event.missionId || null,
        missionTitle: event.missionTitle || null,
        providerId: event.providerId,
        role: event.role,
        runId: event.runId,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    const operatorAttentionAcknowledgements = store.listProviderAttentionAcknowledgements({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });
    const operatorRecoveredAttentionItems = buildProviderAttentionRecoveredItems({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });

    for (const event of buildProviderAttentionOpenedTimeline(
      [
        ...buildProviderAttentionPendingItems({
          missionId: filter.missionId,
          workspaceId: filter.workspaceId,
        }),
        ...operatorRecoveredAttentionItems,
      ],
      operatorAttentionAcknowledgements,
    )) {
      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: event.missionId || null,
        providerId: event.providerId,
        providerDisplayName: event.providerDisplayName,
        sessionId: event.sessionId || null,
        status: event.status || 'pending',
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionTimeline(
      operatorAttentionAcknowledgements,
    )) {
      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: event.missionId || null,
        providerId: event.providerId,
        providerDisplayName: event.providerDisplayName,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionRecoveredTimeline(
      operatorRecoveredAttentionItems,
    )) {
      if (!event.workspaceId) {
        continue;
      }

      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: event.missionId || null,
        providerId: event.providerId,
        providerDisplayName: event.providerDisplayName,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const event of buildProviderAttentionReminderTimeline(
      store.listProviderAttentionReminders({
        missionId: filter.missionId,
        workspaceId: filter.workspaceId,
      }),
    )) {
      if (!event.workspaceId) {
        continue;
      }

      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: event.missionId || null,
        providerId: event.providerId,
        providerDisplayName: event.providerDisplayName,
        sessionId: event.sessionId || null,
        status: event.status || null,
        workspaceId: event.workspaceId || null,
        workspaceName: event.workspaceName || null,
      });
    }

    for (const mission of store.listMissions()) {
      const workspace = workspaceById.get(mission.workspaceId);
      if (!workspace) {
        continue;
      }
      if (filter.workspaceId && workspace.id !== filter.workspaceId) {
        continue;
      }
      if (filter.missionId && mission.id !== filter.missionId) {
        continue;
      }

      for (const event of buildProviderFallbackTimelineEvents({
        mission,
        sessions: store.listSessionsByMission(mission.id),
      })) {
        events.push({
          at: event.at,
          attempt: event.attempt,
          attemptCount: event.attemptCount,
          detail: event.detail,
          fallbackEligible: event.fallbackEligible,
          fallbackPolicy: event.fallbackPolicy,
          fallbackProviderIds: event.fallbackProviderIds,
          fallbackStopReason: event.fallbackStopReason,
          kind: event.kind,
          fallbackNextProviderId: event.fallbackNextProviderId || null,
          gatewayEventId: event.gatewayEventId || null,
          gatewayEventRoute: event.gatewayEventRoute || null,
          gatewayPermissionDecisionId: event.gatewayPermissionDecisionId || null,
          gatewaySandboxDecisionId: event.gatewaySandboxDecisionId || null,
          missionId: mission.id,
          missionTitle: mission.title,
          primaryProviderId: event.primaryProviderId,
          providerFailure: event.providerFailure,
          providerFailureKind: event.providerFailureKind,
          providerId: event.providerId,
          providerRouteDecision: event.providerRouteDecision || null,
          providerRouteDecisionId: event.providerRouteDecisionId || null,
          providerRouteName: event.providerRouteName || null,
          sessionId: event.sessionId || null,
          status: event.status || null,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }
    }

    events.push(
      ...buildOperatorGatewayTimelineEvents({
        events: store.listGatewayEvents({
          missionId: filter.missionId,
          workspaceId: filter.workspaceId,
        }),
        filter,
        missionById,
        workspaceById,
      }),
    );

    for (const escalation of store.listEscalations()) {
      const mission = missionById.get(escalation.missionId);
      const workspace = mission ? workspaceById.get(mission.workspaceId) : workspaceById.get(escalation.workspaceId);
      if (!mission || !workspace) {
        continue;
      }
      if (filter.workspaceId && workspace.id !== filter.workspaceId) {
        continue;
      }
      if (filter.missionId && mission.id !== filter.missionId) {
        continue;
      }

      events.push({
        at: escalation.createdAt,
        detail: escalation.title,
        escalationId: escalation.id,
        kind: 'escalation-opened',
        missionId: mission.id,
        missionTitle: mission.title,
        sessionId: escalation.sessionId,
        status: escalation.status,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });

      if (escalation.resolvedAt) {
        events.push({
          at: escalation.resolvedAt,
          detail: escalation.resolutionNote || 'Escalation resolved.',
          escalationId: escalation.id,
          kind: 'escalation-resolved',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      for (const reminder of ensureArray(escalation.reminderHistory)) {
        events.push({
          at: reminder.at,
          detail: formatEscalationReminderDetail(reminder),
          escalationId: escalation.id,
          kind: 'escalation-reminded',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      for (const ownerChange of ensureArray(escalation.ownerHistory)) {
        if (!ownerChange.from || !ownerChange.to || ownerChange.from === ownerChange.to) {
          continue;
        }

        events.push({
          at: ownerChange.at,
          detail: formatEscalationOwnerChangeDetail(ownerChange),
          escalationId: escalation.id,
          kind: 'escalation-owner-changed',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      for (const handoff of ensureArray(escalation.ownerHandoffHistory)) {
        events.push({
          at: handoff.at,
          detail: formatEscalationOwnerHandoffDetail(handoff),
          escalationId: escalation.id,
          kind: 'escalation-owner-handoff-acknowledged',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }

      for (const reminder of ensureArray(escalation.ownerHandoffReminderHistory)) {
        events.push({
          at: reminder.at,
          detail: formatEscalationOwnerHandoffReminderDetail(reminder),
          escalationId: escalation.id,
          kind: 'escalation-owner-handoff-reminded',
          missionId: mission.id,
          missionTitle: mission.title,
          sessionId: escalation.sessionId,
          status: escalation.status,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
        });
      }
    }

    for (const event of buildSpecialistTimelineEvents({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    })) {
      if (!event.workspaceId) {
        continue;
      }

      const mission = event.missionId ? missionById.get(event.missionId) : null;
      const workspace = workspaceById.get(event.workspaceId);
      if (!workspace) {
        continue;
      }

      events.push({
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission?.id || event.missionId || null,
        missionTitle: mission?.title || null,
        parallelGroupId: event.parallelGroupId || null,
        runId: event.runId || null,
        sessionId: event.sessionId || null,
        specialistKind: event.specialistKind || null,
        status: event.status || null,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });
    }

    for (const event of buildSpecialistFollowUpReminderTimeline(
      store.listSpecialistFollowUpReminders({
        missionId: filter.missionId,
        workspaceId: filter.workspaceId,
      }),
    )) {
      if (!event.workspaceId) {
        continue;
      }

      const mission = event.missionId ? missionById.get(event.missionId) : null;
      const workspace = workspaceById.get(event.workspaceId);
      if (!workspace) {
        continue;
      }

      events.push({
        actionId: event.actionId,
        at: event.at,
        detail: event.detail,
        kind: event.kind,
        missionId: mission?.id || event.missionId || null,
        missionTitle: mission?.title || null,
        parallelGroupId: event.parallelGroupId || null,
        providerId: event.providerId || null,
        runId: event.runId || null,
        sessionId: event.sessionId || null,
        specialistKind: event.specialistKind || null,
        status: event.status || null,
        workspaceId: workspace.id,
        workspaceName: workspace.name,
      });
    }

    events.push(
      ...buildOperatorMaintenanceTimelineEvents({
        filter,
        missionById,
        runs: store.listMaintenanceRuns(),
        workspaceById,
      }),
    );

    return events;
  }

  function getWorkspaceTimeline(workspaceId, filter = {}) {
    const workspace = getWorkspace(workspaceId);
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'workspace timeline provider since timestamp');
    const timelineEvents = collectOperatorTimelineEvents({ workspaceId: workspace.id });
    const maintenanceRuns = listMaintenanceRunsForWorkspaceImpact(workspace.id);
    const maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(maintenanceRuns);
    const maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);
    const parallelActivity = summarizeWorkspaceParallelActivity(workspace.id);
    const providerRecentWindow = buildScopedProviderRecentWindow({
      since: providerSince,
      workspaceId: workspace.id,
    });
    const providerActivity = summarizeWorkspaceProviderActivity(workspace.id);
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });

    return buildWorkspaceTimelineReadModel({
      maintenanceLatestMonthlyBucketDelta,
      maintenanceMonthlyBuckets,
      parallelActivity,
      providerHealthDrift,
      providerRecentWindow,
      providerSince,
      timelineEvents,
      workspace,
    });
  }

  function getGlobalOperatorTimeline(filter = {}) {
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'operator timeline provider since timestamp');
    const timelineEvents = collectOperatorTimelineEvents();
    const maintenanceRuns = store.listMaintenanceRuns();
    const maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(maintenanceRuns);
    const maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);
    const parallelActivity = summarizeScopedParallelActivity();
    const providerOverview = getProviderOverview({
      since: providerSince,
    });
    const providerHealthDrift = providerOverview.healthDrift;

    return buildGlobalOperatorTimelineReadModel({
      maintenanceLatestMonthlyBucketDelta,
      maintenanceMonthlyBuckets,
      parallelActivity,
      providerHealthDrift,
      providerRecentWindow: providerOverview.recentWindow,
      providerSince,
      timelineEvents,
      workspaces: store.listWorkspaces(),
    });
  }

  function getIdentitySessionAudit(filter = {}) {
    const workspaceId = normalizeText(filter.workspaceId);
    const missionId = normalizeText(filter.missionId);
    const sessionId = normalizeText(filter.sessionId);
    const bindingStatus = normalizeText(filter.bindingStatus);
    const sourceType = normalizeText(filter.sourceType);
    const since = normalizeTimestampFilter(filter.since, 'identity session audit since timestamp');

    if (bindingStatus && !['bound', 'partial'].includes(bindingStatus)) {
      throw new Error(`Unsupported identity session binding status: ${bindingStatus}`);
    }

    const workspaceFilter = workspaceId ? getWorkspace(workspaceId) : null;
    const missionFilter = missionId ? getMission(missionId) : null;
    if (workspaceFilter && missionFilter && missionFilter.workspaceId !== workspaceFilter.id) {
      throw new Error(`Mission ${missionFilter.id} does not belong to workspace ${workspaceFilter.id}.`);
    }

    const sessionFilter = sessionId ? store.getSession(sessionId) : null;
    if (sessionId && !sessionFilter) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (sessionFilter && missionFilter && sessionFilter.missionId !== missionFilter.id) {
      throw new Error(`Session ${sessionFilter.id} does not belong to mission ${missionFilter.id}.`);
    }
    if (sessionFilter && workspaceFilter) {
      const sessionMission = getMission(sessionFilter.missionId);
      if (sessionMission.workspaceId !== workspaceFilter.id) {
        throw new Error(`Session ${sessionFilter.id} does not belong to workspace ${workspaceFilter.id}.`);
      }
    }

    const workspaceById = new Map(store.listWorkspaces().map((workspace) => [workspace.id, workspace]));
    const missionById = new Map(store.listMissions().map((mission) => [mission.id, mission]));
    const records = store
      .listGatewayEvents({
        missionId,
        sessionId,
        workspaceId: workspaceFilter?.id || missionFilter?.workspaceId || '',
      })
      .map((event) => {
        const mission = event.bindings?.missionId ? missionById.get(event.bindings.missionId) : null;
        const workspace = event.bindings?.workspaceId
          ? workspaceById.get(event.bindings.workspaceId)
          : mission
            ? workspaceById.get(mission.workspaceId)
            : null;
        return buildIdentitySessionAuditRecord({ event, mission, workspace });
      })
      .filter(Boolean)
      .filter((record) => !since || String(record.at || '') >= since)
      .filter((record) => !bindingStatus || record.bindingStatus === bindingStatus)
      .filter((record) => !sourceType || record.sourceType === sourceType);

    const normalizedFilter = {
      bindingStatus: bindingStatus || null,
      missionId: missionId || null,
      sessionId: sessionId || null,
      since: since || null,
      sourceType: sourceType || null,
      workspaceId: workspaceId || null,
    };

    return {
      records,
      summary: summarizeIdentitySessionAudit(records, normalizedFilter),
    };
  }

  function getGatewayEventAudit(filter = {}) {
    const workspaceId = normalizeText(filter.workspaceId);
    const missionId = normalizeText(filter.missionId);
    const sessionId = normalizeText(filter.sessionId);
    const eventType = normalizeText(filter.eventType);
    const permissionDecision = normalizeText(filter.permissionDecision);
    const route = normalizeText(filter.route);
    const sandboxMode = normalizeText(filter.sandboxMode);
    const sourceType = normalizeText(filter.sourceType);
    const since = normalizeTimestampFilter(filter.since, 'gateway event audit since timestamp');

    if (permissionDecision && !['allow', 'approval-required', 'deny'].includes(permissionDecision)) {
      throw new Error(`Unsupported gateway event permission decision: ${permissionDecision}`);
    }

    const workspaceFilter = workspaceId ? getWorkspace(workspaceId) : null;
    const missionFilter = missionId ? getMission(missionId) : null;
    if (workspaceFilter && missionFilter && missionFilter.workspaceId !== workspaceFilter.id) {
      throw new Error(`Mission ${missionFilter.id} does not belong to workspace ${workspaceFilter.id}.`);
    }

    const sessionFilter = sessionId ? store.getSession(sessionId) : null;
    if (sessionId && !sessionFilter) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    if (sessionFilter && missionFilter && sessionFilter.missionId !== missionFilter.id) {
      throw new Error(`Session ${sessionFilter.id} does not belong to mission ${missionFilter.id}.`);
    }
    if (sessionFilter && workspaceFilter) {
      const sessionMission = getMission(sessionFilter.missionId);
      if (sessionMission.workspaceId !== workspaceFilter.id) {
        throw new Error(`Session ${sessionFilter.id} does not belong to workspace ${workspaceFilter.id}.`);
      }
    }

    const workspaceById = new Map(store.listWorkspaces().map((workspace) => [workspace.id, workspace]));
    const missionById = new Map(store.listMissions().map((mission) => [mission.id, mission]));
    const records = store
      .listGatewayEvents({
        eventType,
        missionId,
        sessionId,
        workspaceId: workspaceFilter?.id || missionFilter?.workspaceId || '',
      })
      .map((event) => {
        const mission = event.bindings?.missionId ? missionById.get(event.bindings.missionId) : null;
        const workspace = event.bindings?.workspaceId
          ? workspaceById.get(event.bindings.workspaceId)
          : mission
            ? workspaceById.get(mission.workspaceId)
            : null;
        return buildGatewayEventAuditRecord({ event, mission, workspace });
      })
      .filter(Boolean)
      .filter((record) => !since || String(record.at || '') >= since)
      .filter((record) => !route || record.route === route)
      .filter((record) => !sourceType || record.sourceType === sourceType)
      .filter((record) => !permissionDecision || record.permissionDecisionResult === permissionDecision)
      .filter((record) => !sandboxMode || record.sandboxMode === sandboxMode);

    const normalizedFilter = {
      eventType: eventType || null,
      missionId: missionId || null,
      permissionDecision: permissionDecision || null,
      route: route || null,
      sandboxMode: sandboxMode || null,
      sessionId: sessionId || null,
      since: since || null,
      sourceType: sourceType || null,
      workspaceId: workspaceId || null,
    };

    return {
      records,
      summary: summarizeGatewayEventAudit(records, normalizedFilter),
    };
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
      gatewayEvents: store.listGatewayEvents({ sessionId: session.id }),
      learningCandidates: store.listLearningCandidates({ sessionId: session.id }),
      mission,
      summary: summarizeSession(session, mission.id),
      session,
    };
  }

  function showMission(missionId, filter = {}) {
    const mission = getMission(missionId);
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'mission provider since timestamp');
    const providerRecentWindow = buildScopedProviderRecentWindow({
      missionId: mission.id,
      since: providerSince,
    });
    const providerActivity = summarizeMissionProviderActivity(mission.id);
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });
    syncEscalations({ missionId: mission.id });
    const summary = summarizeMission(mission, { providerSince });
    return {
      execution: getExecutionStatus(mission.id).execution,
      harness: summarizeMissionHarness(mission, summary),
      mission,
      providerHealthDrift,
      providerRecentWindow,
      summary,
      sessions: listSessions(mission.id),
    };
  }

  function getMissionTimeline(missionId, filter = {}) {
    const mission = getMission(missionId);
    const providerSince = normalizeTimestampFilter(filter.providerSince, 'mission provider since timestamp');
    const providerRecentWindow = buildScopedProviderRecentWindow({
      missionId: mission.id,
      since: providerSince,
    });
    const providerActivity = summarizeMissionProviderActivity(mission.id);
    const providerHealthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
      attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
      attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
      recentWindow: providerRecentWindow,
    });
    syncEscalations({ missionId: mission.id });
    return buildMissionTimelineReadModel({
      mission,
      providerHealthDrift,
      providerRecentWindow,
      summary: summarizeMission(mission, { providerSince }),
      timelineEvents: collectMissionTimelineEvents(mission),
    });
  }

  return {
    browseMissionHarnessDocuments,
    browseMissionHarnessMemory,
    buildApprovalInboxItems,
    buildBlockedFollowUpItems,
    buildMaintenanceActionItems,
    getApprovalInbox,
    getChannelAdapter,
    getGatewayEventAudit,
    getGlobalOperatorTimeline,
    getGlobalOverview,
    getIdentitySessionAudit,
    getMissionTimeline,
    getOrchestrationProfilesOverview,
    getWorkspaceOverview,
    getWorkspaceTimeline,
    listChannelAdapters,
    listMaintenanceOverviewRuns,
    listMaintenancePressureEntries,
    listSessions,
    showMission,
    showSession,
    summarizeMissionMaintenanceImpact,
  };
}
