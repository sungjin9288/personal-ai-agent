import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  AGENT_RUN_STATUSES,
  ACTION_CLASSES,
  APPROVAL_KINDS,
  ACTION_OWNERS,
  ACTION_PRIORITIES,
  APPROVAL_DECISIONS,
  EXECUTION_LEASE_STATUSES,
  EXECUTION_SESSION_STATUSES,
  ESCALATION_STATUSES,
  ESCALATION_TIERS,
  GLOBAL_USER_SCOPE_ID,
  KNOWLEDGE_DELIVERABLE_TYPES,
  MAINTENANCE_RUN_OUTCOMES,
  MISSION_MODES,
  MISSION_STATUSES,
  PROVIDER_ATTENTION_STATUSES,
  REVIEWER_FOLLOW_UP_RESOLUTION_KINDS,
  REVIEWER_FOLLOW_UP_STATUSES,
  SPECIALIST_KINDS,
} from './constants.mjs';
import {
  accumulateCountMap,
  buildCountMapDelta,
  formatDateUtc,
} from './date-bucket-utils.mjs';
import { createDocService } from './doc-service.mjs';
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
import { createFactGraphService } from './fact-graph-service.mjs';
import {
  buildHarnessDocumentBrowseResult,
  buildHarnessMemoryBrowseResult,
} from './mission-harness-browse.mjs';
import { buildMissionHarnessSummary } from './mission-harness-summary.mjs';
import { createMissionMemoryService } from './mission-memory-service.mjs';
import {
  buildMissionSummary,
  buildSessionSummary,
} from './mission-summary-read-model.mjs';
import {
  attachGatewayEventToSourceContext,
  normalizeGatewayEvent,
} from './gateway-event-service.mjs';
import { createId } from './id.mjs';
import { createLearningCandidateAudit } from './learning-candidate-audit.mjs';
import { createLearningCandidateEmitter } from './learning-candidate-emitter.mjs';
import { createLearningPromotion } from './learning-promotion.mjs';
import { createDocumentLog } from './document-log.mjs';
import { createActionInbox } from './action-inbox.mjs';
import {
  buildEscalatedInboxReadModel,
  selectEscalatedInboxItems,
} from './escalation-inbox-read-model.mjs';
import { prepareActionMaintenanceRun } from './action-maintenance-run.mjs';
import {
  addDispatchMetadata,
  addFixedOperationalMetadata,
  addOperationalMetadata,
  buildApprovalActionItem,
  buildBlockedFollowUpActionItem,
  buildMaintenanceActionItem,
  buildProviderAttentionPendingActionItem,
  buildProviderAttentionStoredActionItem,
  buildReviewerFollowUpItemFromRecord,
  buildSpecialistFollowUpActionItem,
} from './action-item-builders.mjs';
import {
  buildProviderAttentionAcknowledgementRecord,
  buildProviderAttentionReminderRecord,
  buildResolvedProviderAttentionRecord,
  buildSpecialistFollowUpReminderRecord,
} from './action-mutation-records.mjs';
import { createProviderAttention } from './provider-attention.mjs';
import { summarizeIdentitySessionContextForTimeline } from './identity-session-context-service.mjs';
import {
  buildProviderFallbackLearningEvidence,
  formatLearningCandidateArtifactContent,
  formatProviderFallbackLearningSummary,
  hasProviderFallbackProviderFailure,
} from './learning-candidate-service.mjs';
import { buildRetrievalContext, summarizeMissionRetrievalPreview } from './retrieval-service.mjs';
import {
  buildChannelAdapterRegistry,
  getChannelAdapter as getRegisteredChannelAdapter,
} from './channel-adapter-registry.mjs';
import { createRuntimeHarness } from '../harness/runtime-harness.mjs';
import { getMissionPack } from '../packs/index.mjs';
import { createProviderRegistry } from '../providers/index.mjs';
import {
  extractProviderFailure,
  isProviderFailureError,
  roundUsdAmount,
} from '../providers/provider-runtime-utils.mjs';
import {
  extractProviderAttemptMetadata,
  extractProviderFailureMetadata,
  extractProviderUsageMetadata,
  normalizeProviderAttemptHistory,
  normalizeProviderFailureKind,
  normalizeTelemetryNumber,
  summarizeAttemptMetrics,
} from './provider-telemetry.mjs';
import {
  buildProviderExecutionTimeline,
  buildProviderProbeTimeline,
  formatProviderFailureDetail,
  getLatestMatchingRecord,
  summarizeProviderExecutions,
  summarizeProviderProbes,
} from './provider-execution-summary.mjs';
import { summarizeProviderEvents } from './provider-event-summary.mjs';
import {
  buildProviderEventTimelineResult,
  buildProviderExecutionHistoryResult,
  buildProviderExecutionTimelineResult,
  buildProviderProbeHistoryResult,
  buildProviderProbeTimelineResult,
} from './provider-history-timeline.mjs';
import {
  buildProviderOverviewResult,
  buildProviderStatusEntry,
  enrichProviderStatusEntries as enrichProviderStatusReadModel,
  summarizeProviderOverview as summarizeProviderOverviewReadModel,
  summarizeProviderStatusEntries as summarizeProviderStatusReadModel,
} from './provider-status-overview.mjs';
import {
  buildProviderExecutionDailyBuckets,
  buildProviderExecutionLatestBucketDelta,
  buildProviderExecutionLatestMonthlyBucketDelta,
  buildProviderExecutionLatestWeeklyBucketDelta,
  buildProviderExecutionMonthlyBuckets,
  buildProviderExecutionWeeklyBuckets,
} from './provider-execution-buckets.mjs';
import {
  buildOwnerHandoffReminderNote,
  deriveEscalationReminderCadenceHours,
  deriveOwnerHandoffReminderCadenceHours,
  deriveOwnerHandoffSlaHours,
  formatEscalationOwnerChangeDetail,
  formatEscalationOwnerHandoffDetail,
  formatEscalationOwnerHandoffReminderDetail,
  formatEscalationReminderDetail,
} from './escalation-handoff.mjs';
import { listOrchestrationProfiles } from './orchestration-profiles.mjs';
import {
  evaluateParallelQualityGate,
  getOrchestrationQualityGateRequiredKinds,
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
  buildProviderAttentionRemediationPermissionDecision,
} from './permission-decision-service.mjs';
import { summarizeSandboxDecisionForTimeline } from './sandbox-decision-service.mjs';
import {
  buildProviderFallbackRouteDecision,
  summarizeProviderRouteDecisionForTimeline,
} from './provider-route-decision-service.mjs';
import {
  buildMissionProviderFallbackPlan,
  buildProviderFallbackSummary,
  evaluateProviderFallbackPolicy,
  normalizeProviderFallbackIds,
  normalizeProviderFallbackPolicy,
} from './provider-fallback-policy.mjs';
import {
  buildProviderFallbackAttemptOptions,
  buildProviderFallbackAttemptRecord,
} from './provider-fallback-attempt.mjs';
import {
  inferMissionAttachmentMimeType,
  isSupportedMissionAttachment,
  normalizeMissionAttachmentFileName,
  sanitizeMissionAttachmentContent,
} from './mission-attachments.mjs';
import {
  compareRetrievalPreviewWithLatestArtifact,
  formatRetrievalArtifactContent,
  summarizeStoredRetrievalArtifact,
} from './retrieval-artifacts.mjs';
import {
  buildMaintenanceDailyBuckets,
  buildMaintenanceLatestBucketDelta,
  buildMaintenanceLatestMonthlyBucketDelta,
  buildMaintenanceLatestWeeklyBucketDelta,
  buildMaintenanceMonthlyBuckets,
  buildMaintenanceWeeklyBuckets,
  getMaintenanceRunAffectedMissionIds,
  isMaintenanceRunEffective,
  isMaintenanceRunImpactful,
  summarizeMaintenanceImpact,
  summarizeMaintenancePressure,
  summarizeMaintenanceRuns,
} from './maintenance-analytics.mjs';
import {
  ORCHESTRATION_PROFILE_ADOPTION_DRIFT_REASON_CODES,
  ORCHESTRATION_PROFILE_HEALTH_DRIFT_REASON_CODES,
  ORCHESTRATION_PROFILE_USAGE_TREND_STATUSES,
  ORCHESTRATION_PROFILE_WORKSPACE_ADOPTION_DRIFT_REASON_CODES,
  buildOrchestrationProfileUsageLatestMonthlyBucketDelta,
  buildOrchestrationProfileUsageMonthlyBuckets,
  getPreviousUtcMonthStartDate,
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
import {
  buildGatewayEventAuditRecord,
  buildIdentitySessionAuditRecord,
  summarizeGatewayEventAudit,
  summarizeIdentitySessionAudit,
} from './audit-records.mjs';
import {
  buildMissionGatewayTimelineEvents,
  buildMissionMaintenanceTimelineEvents,
  buildOperatorGatewayTimelineEvents,
  buildOperatorMaintenanceTimelineEvents,
  sortTimelineEvents,
} from './timeline-assembly.mjs';
import {
  buildGlobalOperatorTimelineReadModel,
  buildMissionTimelineReadModel,
  buildWorkspaceTimelineReadModel,
} from './timeline-read-model.mjs';
import {
  buildEscalationReminderNote,
  buildInitialOwnerHistoryEntry,
  buildInitialTierHistoryEntry,
  buildOverdueIncidentContent,
  buildOverdueIncidentTitle,
  deriveEscalationTier,
  deriveSlaHoursFromTimestamps,
  enrichEscalation,
  formatIncidentCountMap,
  isBreachTier,
  summarizeEscalations,
} from './escalation-analytics.mjs';
import {
  deriveProviderAttentionReminderCadenceHours,
  formatAcceptedRiskEscalationTitle,
  formatApprovalDecisionMemory,
  formatApprovalResolution,
  formatApprovedExecutionReadyBrief,
  formatLearningPromotionStopConditionReminderDetail,
  formatProviderAttentionReminderDetail,
  formatReviewerFailureMemory,
  formatReviewerFollowUpResolutionDetail,
  formatReviewerFollowUpResolutionMemory,
  formatSpecialistFollowUpReminderDetail,
} from './reminder-formatters.mjs';
import {
  resolveSpecialistFollowUpPolicy,
  resolveSpecialistFollowUpRoute,
  summarizeReviewerFollowUps,
  summarizeSpecialistFollowUpItems,
} from './follow-up-analytics.mjs';

function now() {
  return new Date().toISOString();
}

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

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function countByNormalizedField(items, fieldName) {
  return ensureArray(items).reduce((counts, item) => {
    const key = normalizeText(item?.[fieldName], 'unknown');
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function normalizeStringList(items) {
  return ensureArray(items).map((item) => normalizeText(item)).filter(Boolean);
}

const MISSION_ATTACHMENT_MAX_CONTENT_CHARS = 12_000;
const MISSION_ATTACHMENT_MAX_PROMPT_ATTACHMENTS = 5;
const MISSION_ATTACHMENT_MAX_PROMPT_CHARS = 12_000;
const MISSION_ATTACHMENT_MAX_PROMPT_CHARS_PER_FILE = 3_000;
const MISSION_ATTACHMENT_PREVIEW_CHARS = 280;

function getRunArtifactFilePrefix({ role, specialistKind }) {
  const normalizedSpecialistKind = normalizeText(specialistKind);
  if (role === 'specialist' && normalizedSpecialistKind) {
    return `specialist-${normalizedSpecialistKind}`;
  }

  return normalizeText(role, 'agent');
}

function summarizeAttachmentText(content, fallback = '내용 없음') {
  const normalized = String(content || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.length > MISSION_ATTACHMENT_PREVIEW_CHARS
    ? `${normalized.slice(0, MISSION_ATTACHMENT_PREVIEW_CHARS - 1)}…`
    : normalized;
}

function evaluateArtifactContent({ artifactContent, pack }) {
  const content = normalizeText(artifactContent);
  const requiredSections = ensureArray(pack?.requiredSections);
  const missingSections = requiredSections.filter((sectionName) => !content.includes(`## ${sectionName}`));
  const findings = missingSections.map((sectionName) => `Missing required section: ${sectionName}`);
  const checks = [];

  checks.push({
    id: 'required-sections',
    description: `Required sections present: ${requiredSections.join(', ') || 'none'}`,
    passed: missingSections.length === 0,
  });

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

function normalizeActionOwner(value, fallback = 'workspace-owner') {
  const normalized = normalizeText(value, fallback);
  return ACTION_OWNERS.includes(normalized) ? normalized : fallback;
}

function normalizeSpecialistHandoff(handoff, fallback = {}) {
  const source = ensureObject(handoff);
  const nextSource = ensureObject(source.nextHandoff);
  const currentState = normalizeText(source.currentState, fallback.currentState || fallback.summaryText || '');
  const deliverables = normalizeStringList(source.deliverables);
  const acceptanceCriteria = normalizeStringList(source.acceptanceCriteria);
  const evidence = normalizeStringList(source.evidence);
  const blockers = normalizeStringList(source.blockers);
  const nextHandoff = {
    recommendedOwner: normalizeActionOwner(nextSource.recommendedOwner, fallback.recommendedOwner || 'workspace-owner'),
    request: normalizeText(nextSource.request, fallback.nextAction || ''),
    targetRole: normalizeText(nextSource.targetRole, fallback.targetRole || 'manager-merge'),
  };

  if (!currentState && !deliverables.length && !acceptanceCriteria.length && !evidence.length && !nextHandoff.request) {
    return null;
  }

  return {
    acceptanceCriteria,
    blockers,
    currentState,
    deliverables,
    evidence,
    nextHandoff,
  };
}

function buildFallbackSpecialistHandoff({
  specialistKind,
  status,
  summaryText,
  nextAction = '',
  recommendedOwner = 'workspace-owner',
}) {
  return normalizeSpecialistHandoff(
    {
      acceptanceCriteria: [`Close the ${specialistKind} branch in status ${status}.`],
      blockers: ['blocked', 'failed'].includes(status) ? [summaryText || `${specialistKind} branch requires follow-up.`] : [],
      currentState: summaryText || `${specialistKind} branch is ${status}.`,
      deliverables: [summaryText || `${specialistKind} specialist branch recorded a draft.`],
      evidence: [summaryText || `${specialistKind} specialist branch state captured.`],
      nextHandoff: {
        recommendedOwner,
        request: nextAction || `Review the ${specialistKind} branch and decide whether to resume or merge it.`,
        targetRole: 'manager-merge',
      },
    },
    {},
  );
}

function getUtcMonthStartTimestamp(value = now()) {
  const parsed = Date.parse(String(value || ''));
  if (!Number.isFinite(parsed)) {
    return '';
  }

  const date = new Date(parsed);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
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

function normalizeAgentRunStatus(value) {
  const normalized = normalizeText(value);
  if (normalized === 'executing') {
    return 'running';
  }
  return normalized;
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

function parseMarkdownBulletSection(content, sectionName) {
  const normalizedContent = String(content || '');
  const header = `## ${sectionName}`;
  const startIndex = normalizedContent.indexOf(header);

  if (startIndex === -1) {
    return [];
  }

  const nextHeaderIndex = normalizedContent.indexOf('\n## ', startIndex + header.length);
  const sectionBody = normalizedContent
    .slice(startIndex + header.length, nextHeaderIndex === -1 ? undefined : nextHeaderIndex)
    .trim();

  return sectionBody
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean);
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

export function createMissionService({ store, rootDir = store.rootDir }) {
  const docService = createDocService({ rootDir });
  const factGraph = createFactGraphService({ store });
  const providerRegistry = createProviderRegistry({ rootDir });
  const harness = createRuntimeHarness({ store });
  const {
    addMemory,
    deleteMemory,
    listFactGraph,
    listMemory,
    updateMemory,
  } = createMissionMemoryService({
    factGraph,
    getMission,
    getWorkspace,
    harness,
    store,
  });
  const activeExecutionRuntimes = new Map();
  const executionRepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
  const executionWorkspaceRoot = path.resolve(executionRepoRoot, '..');

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

  docService.ensureDocs();

  function getExecutionDir(missionId, executionSessionId) {
    return path.join(store.getMissionDir(missionId), 'executions', executionSessionId);
  }

  function ensureExecutionDir(missionId, executionSessionId) {
    const executionDir = getExecutionDir(missionId, executionSessionId);
    fs.mkdirSync(executionDir, { recursive: true });
    return executionDir;
  }

  function getExecutionRollbackDir(missionId, executionSessionId) {
    return path.join(ensureExecutionDir(missionId, executionSessionId), 'rollback');
  }

  function buildRollbackSnapshotPath({ executionSessionId, filePath, missionId, stepId }) {
    const rollbackDir = getExecutionRollbackDir(missionId, executionSessionId);
    fs.mkdirSync(rollbackDir, { recursive: true });
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

  function recordGatewayEvent({
    eventType,
    mission,
    providerId = '',
    route = '',
    session = null,
    sourceContext = {},
    workspace,
  }) {
    const gatewayEvent = store.saveGatewayEvent(
      normalizeGatewayEvent({
        at: now(),
        eventType,
        id: createId('gatewayevent'),
        mission,
        providerId,
        route,
        session,
        sourceContext,
        workspace,
      }),
    );

    const updatedSession = session?.id
      ? harness.updateSession(session.id, {
          sourceContext: attachGatewayEventToSourceContext(session.sourceContext || sourceContext, gatewayEvent),
        })
      : null;

    return {
      gatewayEvent,
      session: updatedSession,
    };
  }

  function writeUpdatedLearningCandidateArtifact(candidate) {
    if (!candidate?.artifactPath) {
      return;
    }

    fs.writeFileSync(candidate.artifactPath, formatLearningCandidateArtifactContent(candidate), 'utf8');
  }

  function attachProviderFallbackToLearningCandidate(candidate, providerFallback) {
    if (!candidate || !providerFallback) {
      return candidate || null;
    }

    const fallbackEvidence = buildProviderFallbackLearningEvidence(providerFallback);
    const shouldPromoteAsProviderLesson = hasProviderFallbackProviderFailure(providerFallback);
    const fallbackSummary = formatProviderFallbackLearningSummary(providerFallback);
    const updatedCandidate = store.updateLearningCandidate(candidate.id, (current) => ({
      ...current,
      evidence: {
        ...current.evidence,
        ...fallbackEvidence,
      },
      proposal: shouldPromoteAsProviderLesson
        ? {
            ...current.proposal,
            target: 'provider-policy',
          }
        : current.proposal,
      recordType: shouldPromoteAsProviderLesson ? 'provider-lesson' : current.recordType,
      summary: shouldPromoteAsProviderLesson && fallbackSummary ? fallbackSummary : current.summary,
      title: shouldPromoteAsProviderLesson ? `provider-lesson candidate for ${current.title.replace(/^.* candidate for /, '')}` : current.title,
      updatedAt: now(),
    }));

    writeUpdatedLearningCandidateArtifact(updatedCandidate);
    return updatedCandidate;
  }

  function attachProviderFallbackSummary(result, providerFallback) {
    const updatedCandidates = new Map();
    for (const attempt of ensureArray(providerFallback?.attempts)) {
      const attemptCandidate = getLatestItem(store.listLearningCandidates({ sessionId: attempt.sessionId }), 'createdAt');
      if (attemptCandidate) {
        const updatedCandidate = attachProviderFallbackToLearningCandidate(attemptCandidate, providerFallback);
        updatedCandidates.set(updatedCandidate.id, updatedCandidate);
      }
    }
    const resultCandidate = result?.learningCandidate?.id
      ? updatedCandidates.get(result.learningCandidate.id) ||
        attachProviderFallbackToLearningCandidate(result.learningCandidate, providerFallback)
      : null;

    return {
      ...result,
      learningCandidate: resultCandidate,
      providerFallback,
    };
  }

  const { getLearningCandidateAudit } = createLearningCandidateAudit({
    store,
    getMission,
    getWorkspace,
  });

  const {
    buildActionInboxReadModel,
    summarizeProviderHealthDriftItems,
    selectActionInboxItems,
  } = createActionInbox({
    summarizeSpecialistFollowUpItems,
  });

  const {
    formatProviderAttentionRecoveryDetail,
    buildProviderAttentionTimeline,
    buildProviderAttentionReminderTimeline,
    buildProviderAttentionRecoveredTimeline,
    buildProviderAttentionOpenedTimeline,
  } = createProviderAttention({
    formatProviderAttentionReminderDetail,
  });

  const { emitLearningCandidate } = createLearningCandidateEmitter({
    store,
    now,
    writeArtifact: harness.writeArtifact,
    getSessionProviderFailureSummary,
    writeUpdatedLearningCandidateArtifact,
  });

  const {
    expireLearningPromotions,
    getLearningPromotionQueue,
    listLearningPromotionItems,
    remindLearningPromotionStopConditions,
    resolveLearningPromotion,
    rollbackLearningPromotion,
  } = createLearningPromotion({
    store,
    now,
    addMemoryEntry: harness.addMemoryEntry,
    deleteMemory,
    getMission,
    getWorkspace,
    writeUpdatedLearningCandidateArtifact,
  });

  const { logDocument, updateDocumentLog, deleteDocumentLog, migrateLegacyDocumentLogs } = createDocumentLog({
    docService,
  });

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
      deliverableArtifact?.path && fs.existsSync(deliverableArtifact.path)
        ? fs.readFileSync(deliverableArtifact.path, 'utf8')
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
    fs.appendFileSync(logFilePath, `${line}\n`, 'utf8');

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
    if (fs.existsSync(resolvedCwd)) {
      return resolvedCwd;
    }

    // Some live providers omit the leading slash when echoing an absolute cwd.
    // Normalize that shape before failing the execution session on a missing cwd.
    if (!path.isAbsolute(rawCwd) && /^[A-Za-z0-9_.-]+\//.test(rawCwd)) {
      const absoluteCandidate = path.resolve(path.sep, rawCwd);
      if (fs.existsSync(absoluteCandidate)) {
        return absoluteCandidate;
      }
    }

    return resolvedCwd;
  }

  function captureChangedFiles(workspacePath) {
    try {
      const output = normalizeText(
        fs.existsSync(path.join(workspacePath, '.git'))
          ? execFileSync('git', ['status', '--short'], {
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
      if (fs.existsSync(moveTargetPath)) {
        throw new Error(`directory-move targetPath already exists: ${step.targetPath}`);
      }
      if (!fs.existsSync(targetPath)) {
        throw new Error(`directory-move source directory does not exist: ${step.filePath}`);
      }
      const sourceStat = fs.lstatSync(targetPath);
      if (!sourceStat.isDirectory()) {
        throw new Error(`directory-move source is not a directory: ${step.filePath}`);
      }

      const beforeState = collectDirectoryMoveState(targetPath);
      fs.mkdirSync(path.dirname(moveTargetPath), { recursive: true });
      fs.renameSync(targetPath, moveTargetPath);
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

    const existedBefore = fs.existsSync(targetPath);
    const targetStat = existedBefore ? fs.lstatSync(targetPath) : null;
    if (targetStat?.isDirectory()) {
      throw new Error(`Edit source is a directory and requires directory-move template: ${step.filePath}`);
    }
    const existingContent = existedBefore ? fs.readFileSync(targetPath, 'utf8') : '';
    const rollbackSnapshotPath = existedBefore
      ? buildRollbackSnapshotPath({
          executionSessionId: executionSession.id,
          filePath: step.filePath,
          missionId: executionSession.missionId,
          stepId: step.id,
        })
      : '';
    if (rollbackSnapshotPath) {
      fs.writeFileSync(rollbackSnapshotPath, existingContent, 'utf8');
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
      if (fs.existsSync(moveTargetPath)) {
        throw new Error(`file-move targetPath already exists: ${step.targetPath}`);
      }

      fs.mkdirSync(path.dirname(moveTargetPath), { recursive: true });
      fs.renameSync(targetPath, moveTargetPath);
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

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });

    const existsAfter = step.operation !== 'delete';
    if (existsAfter) {
      fs.writeFileSync(targetPath, nextContent, 'utf8');
    } else {
      fs.rmSync(targetPath, { force: true });
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
        return fs.readFileSync(snapshotPath, 'utf8');
      },
      readTargetState: readRollbackTargetState,
      snapshotExists(snapshotPath) {
        return fs.existsSync(snapshotPath);
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
        fs.rmSync(item.targetPath, { force: true });
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
        fs.mkdirSync(path.dirname(item.sourcePath), { recursive: true });
        fs.renameSync(item.targetPath, item.sourcePath);
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

      const restoreContent = fs.readFileSync(item.rollbackSnapshotPath, 'utf8');
      fs.writeFileSync(item.targetPath, restoreContent, 'utf8');
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
                const child = spawn(spawnSpec.command, spawnSpec.args, {
                  cwd: resolveExecutionStepCwd(latestSession.workspacePath, step.cwd),
                  env: {
                    ...process.env,
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

  function addWorkspace({ workspacePath, name, tenantId = '' }) {
    const normalizedPath = normalizeText(workspacePath);
    if (!normalizedPath) {
      throw new Error('워크스페이스 경로를 입력하세요.');
    }

    const resolvedPath = path.resolve(normalizedPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`워크스페이스 경로를 찾을 수 없습니다: ${resolvedPath}`);
    }

    if (!fs.statSync(resolvedPath).isDirectory()) {
      throw new Error(`워크스페이스 경로는 디렉터리여야 합니다: ${resolvedPath}`);
    }

    const existingWorkspace = store
      .listWorkspaces()
      .find((workspace) => path.resolve(String(workspace.path || '')) === resolvedPath);

    if (existingWorkspace) {
      return existingWorkspace;
    }

    return store.saveWorkspace({
      id: createId('workspace'),
      name: normalizeText(name, path.basename(resolvedPath) || 'workspace'),
      path: resolvedPath,
      tenantId: normalizeText(tenantId),
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

    resolveMissionParallelPlan(mission);
    const savedMission = store.saveMission(mission);

    for (const attachment of ensureArray(input.attachments)) {
      addMissionAttachment({
        content: attachment.content,
        conversion: attachment.conversion,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        missionId: savedMission.id,
        source: normalizeText(attachment.source, 'mission-create'),
      });
    }

    const { gatewayEvent } = recordGatewayEvent({
      eventType: 'mission-create',
      mission: savedMission,
      route: normalizeText(input.sourceContext?.route, 'mission.create'),
      sourceContext: input.sourceContext,
      workspace,
    });

    return store.updateMission(savedMission.id, (current) => ({
      ...current,
      gatewayEventId: gatewayEvent.id,
      gatewayEventSchemaVersion: gatewayEvent.schemaVersion,
      updatedAt: now(),
    }));
  }

  function normalizeAttachmentConversion(conversion) {
    const source = ensureObject(conversion);
    if (!Object.keys(source).length) {
      return null;
    }

    return {
      converted: Boolean(source.converted),
      converter: normalizeText(source.converter),
      extension: normalizeText(source.extension),
      sourcePath: normalizeText(source.sourcePath),
      truncated: Boolean(source.truncated),
    };
  }

  function buildMissionAttachmentRecord({ content, conversion = null, fileName, mimeType, missionId, source = 'mission-upload' }) {
    const mission = getMission(missionId);
    const normalizedFileName = normalizeMissionAttachmentFileName(fileName);
    const normalizedMimeType = normalizeText(mimeType, inferMissionAttachmentMimeType(normalizedFileName));
    const normalizedContent = sanitizeMissionAttachmentContent(content);

    if (
      !isSupportedMissionAttachment({
        content: normalizedContent,
        fileName: normalizedFileName,
        mimeType: normalizedMimeType,
      })
    ) {
      throw new Error(
        `Unsupported attachment type for ${normalizedFileName}. Attach text-oriented files such as Markdown, text, JSON, CSV, logs, or source code.`,
      );
    }

    const createdAt = now();
    const originalCharCount = normalizedContent.length;
    const storedContent = normalizedContent.slice(0, MISSION_ATTACHMENT_MAX_CONTENT_CHARS);
    const truncated = originalCharCount > storedContent.length;
    const attachmentId = createId('missionattachment');
    const storedFileName = `${attachmentId}-${normalizedFileName}`;
    const attachmentPath = store.writeArtifactContent({
      missionId: mission.id,
      fileName: path.join('attachments', storedFileName),
      content: storedContent,
    });

    return {
      charCount: originalCharCount,
      conversion: normalizeAttachmentConversion(conversion),
      createdAt,
      excerpt: summarizeAttachmentText(storedContent),
      fileName: normalizedFileName,
      id: attachmentId,
      lineCount: storedContent.split('\n').length,
      mimeType: normalizedMimeType,
      missionId: mission.id,
      path: attachmentPath,
      source: normalizeText(source, 'mission-upload'),
      storedCharCount: storedContent.length,
      truncated,
      updatedAt: createdAt,
    };
  }

  function addMissionAttachment({ content, conversion = null, fileName, mimeType, missionId, source = 'mission-upload' }) {
    const record = buildMissionAttachmentRecord({
      content,
      conversion,
      fileName,
      mimeType,
      missionId,
      source,
    });

    return store.saveMissionAttachment(record);
  }

  function listMissionAttachments(missionId) {
    getMission(missionId);
    return store.listMissionAttachments({ missionId });
  }

  function listMissions() {
    return store.listMissions();
  }

  function getLatestProviderProbe(providerId) {
    return store.listProviderProbes({ providerId }).at(-1) || null;
  }

  function getProviderAttentionEventRefId(event) {
    return normalizeText(event?.probeId || event?.runId || event?.eventRefId || '');
  }

  function buildProviderAttentionActionId(event) {
    const providerId = normalizeText(event?.providerId || '');
    const eventFamily = normalizeText(event?.eventFamily || '');
    const eventRefId = getProviderAttentionEventRefId(event);
    return `provider-attention:${providerId}:${eventFamily}:${eventRefId || 'latest'}`;
  }

  function getLatestProviderAttentionAcknowledgement(providerId) {
    return store.listProviderAttentionAcknowledgements({ providerId }).at(-1) || null;
  }

  function getLatestProviderAttentionRecord(providerId) {
    return store.listProviderAttentionAcknowledgements({ providerId }).at(-1) || null;
  }

  function getLatestProviderAttentionResolution(providerId) {
    return (
      store
        .listProviderAttentionAcknowledgements({ providerId })
        .filter((record) => record.status === 'resolved')
        .at(-1) || null
    );
  }

  function getProviderAttentionAcknowledgementForEvent(event) {
    const providerId = normalizeText(event?.providerId || '');
    const eventFamily = normalizeText(event?.eventFamily || '');
    const eventRefId = getProviderAttentionEventRefId(event);

    if (!providerId || !eventFamily || !eventRefId) {
      return null;
    }

    return (
      store
        .listProviderAttentionAcknowledgements({
          eventFamily,
          eventRefId,
          providerId,
        })
        .at(-1) || null
    );
  }

  function listProviderAttentionRemindersForEvent(event) {
    const providerId = normalizeText(event?.providerId || '');
    const eventFamily = normalizeText(event?.eventFamily || '');
    const eventRefId = getProviderAttentionEventRefId(event);

    if (!providerId || !eventFamily || !eventRefId) {
      return [];
    }

    return store.listProviderAttentionReminders({
      eventFamily,
      eventRefId,
      providerId,
    });
  }

  function listSpecialistFollowUpRemindersForItem(item) {
    const actionId = normalizeText(item?.actionId || '');
    if (!actionId) {
      return [];
    }

    return store.listSpecialistFollowUpReminders({ actionId });
  }

  function deriveProviderAttentionRecovery(provider, latestAttentionStateEvent, baseEvents) {
    if (
      !latestAttentionStateEvent ||
      !['provider-probe-succeeded', 'provider-execution-succeeded'].includes(latestAttentionStateEvent.eventKind)
    ) {
      return null;
    }

    const sourceFailure = getLatestMatchingRecord(
      baseEvents,
      (event) =>
        ['provider-probe-failed', 'provider-execution-failed'].includes(event.eventKind) &&
        event.eventFamily === latestAttentionStateEvent.eventFamily &&
        String(event.at || '') < String(latestAttentionStateEvent.at || '') &&
        (latestAttentionStateEvent.eventFamily !== 'execution' ||
          (event.missionId === latestAttentionStateEvent.missionId &&
            event.workspaceId === latestAttentionStateEvent.workspaceId)),
    );

    if (!sourceFailure) {
      return null;
    }

    const existingAcknowledgement = getProviderAttentionAcknowledgementForEvent(sourceFailure);
    if (existingAcknowledgement && (existingAcknowledgement.status || 'acknowledged') === 'resolved') {
      return null;
    }

    const reminderRecords = listProviderAttentionRemindersForEvent(sourceFailure);
    const latestReminder = reminderRecords.at(-1) || null;
    const recommendedOwner =
      sourceFailure.eventFamily === 'execution' && sourceFailure.workspaceId ? 'workspace-owner' : 'human-approver';
    const recommendedCommand =
      sourceFailure.eventFamily === 'execution'
        ? `node src/cli.mjs mission run ${sourceFailure.missionId} --provider ${provider.id}`
        : `node src/cli.mjs provider probe ${provider.id}`;

    return {
      acknowledgedAt: existingAcknowledgement?.acknowledgedAt || null,
      actionId: buildProviderAttentionActionId(sourceFailure),
      actionType: 'provider-attention',
      ...extractProviderFailureMetadata(sourceFailure),
      createdAt: sourceFailure.at,
      deliverableType: null,
      eventFamily: sourceFailure.eventFamily,
      eventKind: sourceFailure.eventKind,
      eventRefId: getProviderAttentionEventRefId(sourceFailure),
      isOverdue: false,
      lastReminderAt: latestReminder?.remindedAt || latestReminder?.createdAt || null,
      latestReminderAt: latestReminder?.remindedAt || latestReminder?.createdAt || null,
      missionId: sourceFailure.missionId || latestAttentionStateEvent.missionId || null,
      needsReminder: false,
      nextReminderAt: null,
      note: existingAcknowledgement?.note || null,
      priority: sourceFailure.eventFamily === 'execution' ? 'high' : 'medium',
      providerDisplayName: provider.displayName,
      providerId: provider.id,
      reason: sourceFailure.detail,
      recommendedCommand,
      recommendedOwner,
      recoveredAt: latestAttentionStateEvent.at,
      recoveryDetail: latestAttentionStateEvent.detail,
      recoveryEventFamily: latestAttentionStateEvent.eventFamily,
      recoveryEventKind: latestAttentionStateEvent.eventKind,
      recoveryEventRefId: getProviderAttentionEventRefId(latestAttentionStateEvent),
      recoveryRunId: latestAttentionStateEvent.runId || null,
      recoveryProbeId: latestAttentionStateEvent.probeId || null,
      reminderCadenceHours: null,
      reminderCount: reminderRecords.length,
      sessionId: sourceFailure.sessionId || latestAttentionStateEvent.sessionId || null,
      slaHours: sourceFailure.eventFamily === 'execution' ? 12 : 24,
      status: 'recovered',
      title:
        sourceFailure.eventFamily === 'execution'
          ? `Provider execution recovered for ${provider.displayName}`
          : `Provider probe recovered for ${provider.displayName}`,
      workspaceId: sourceFailure.workspaceId || latestAttentionStateEvent.workspaceId || null,
      workspaceName: sourceFailure.workspaceName || latestAttentionStateEvent.workspaceName || null,
    };
  }

  function buildProviderExecutionEntries(filter = {}) {
    const state = store.loadState();
    const missionById = new Map(state.missions.map((mission) => [mission.id, mission]));
    const sessionById = new Map(state.sessions.map((session) => [session.id, session]));
    const workspaceById = new Map(state.workspaces.map((workspace) => [workspace.id, workspace]));

    const normalizedStatusFilter = normalizeAgentRunStatus(filter.status);
    const normalizedSinceFilter = normalizeTimestampFilter(filter.since, 'provider execution since timestamp');

    return [...ensureArray(state.agentRuns)]
      .map((run) => {
        const session = sessionById.get(run.sessionId) || null;
        const mission = missionById.get(run.missionId || session?.missionId) || null;
        const workspace = mission ? workspaceById.get(mission.workspaceId) || null : null;
        const providerId = normalizeText(run.providerId || session?.provider);
        const attemptMetadata = extractProviderAttemptMetadata(run);

        return {
          at: run.endedAt || run.startedAt || '',
          ...attemptMetadata,
          durationMs: normalizeTelemetryNumber(run.durationMs),
          endedAt: run.endedAt || null,
          estimatedCostUsd: roundUsdAmount(run.estimatedCostUsd),
          failureKind: normalizeText(run.failureKind) ? normalizeProviderFailureKind(run.failureKind) : null,
          httpStatus: Number.isFinite(Number(run.httpStatus)) ? Number(run.httpStatus) : null,
          id: run.id,
          inputSummary: normalizeText(run.inputSummary),
          mergeStatus: normalizeText(run.mergeStatus),
          missionId: mission?.id || run.missionId || null,
          missionTitle: mission?.title || null,
          outputSummary: normalizeText(run.outputSummary),
          parentRunId: normalizeText(run.parentRunId) || null,
          providerId,
          providerResponseId: normalizeText(run.providerResponseId) || null,
          rawMessage: normalizeText(run.rawMessage) || null,
          recoverable: typeof run.recoverable === 'boolean' ? run.recoverable : null,
          role: normalizeText(run.role),
          resumeFromRunId: normalizeText(run.resumeFromRunId) || null,
          sessionId: session?.id || run.sessionId || null,
          specialistKind: normalizeText(run.specialistKind) || null,
          specialistRootRunId: normalizeText(run.specialistRootRunId) || null,
          startedAt: run.startedAt || null,
          status: normalizeAgentRunStatus(run.status),
          timedOut: Boolean(run.timedOut),
          usageInputTokens: normalizeTelemetryNumber(run.usageInputTokens),
          usageOutputTokens: normalizeTelemetryNumber(run.usageOutputTokens),
          usageTotalTokens: normalizeTelemetryNumber(run.usageTotalTokens),
          workflowRole: normalizeText(run.workflowRole || run.role),
          workspaceId: workspace?.id || null,
          workspaceName: workspace?.name || null,
          parallelGroupId: normalizeText(run.parallelGroupId) || null,
        };
      })
      .filter((entry) => {
        if (!entry.providerId) {
          return false;
        }
        if (filter.providerId && entry.providerId !== filter.providerId) {
          return false;
        }
        if (filter.workspaceId && entry.workspaceId !== filter.workspaceId) {
          return false;
        }
        if (filter.missionId && entry.missionId !== filter.missionId) {
          return false;
        }
        if (filter.role && entry.role !== filter.role) {
          return false;
        }
        if (normalizedStatusFilter && entry.status !== normalizedStatusFilter) {
          return false;
        }
        if (normalizedSinceFilter && String(entry.at || '') < normalizedSinceFilter) {
          return false;
        }
        return true;
      })
      .sort((left, right) => String(left.at).localeCompare(String(right.at)));
  }

  function getLatestProviderExecution(providerId) {
    return buildProviderExecutionEntries({ providerId }).at(-1) || null;
  }

  function buildProviderStatusEntries() {
    return providerRegistry.listProviders().map((provider) => {
      const providerEvents = buildProviderBaseEvents({ providerId: provider.id });
      const latestEvent = getLatestMatchingRecord(providerEvents, () => true);
      const latestAttentionStateEvent = getLatestMatchingRecord(
        providerEvents,
        (event) =>
          [
            'provider-probe-failed',
            'provider-execution-failed',
            'provider-probe-succeeded',
            'provider-execution-succeeded',
            'provider-attention-acknowledged',
            'provider-attention-resolved',
          ].includes(event.eventKind),
      );
      const latestAttentionRecovery = deriveProviderAttentionRecovery(
        provider,
        latestAttentionStateEvent,
        providerEvents,
      );
      const latestAttentionRecord = getLatestProviderAttentionRecord(provider.id);
      const latestAttentionAcknowledgement = getLatestProviderAttentionAcknowledgement(provider.id);
      const latestAttentionResolution = getLatestProviderAttentionResolution(provider.id);
      const latestAttentionReminder = store.listProviderAttentionReminders({ providerId: provider.id }).at(-1) || null;

      return buildProviderStatusEntry({
        latestAttentionAcknowledgement,
        latestAttentionRecovery,
        latestAttentionRecord,
        latestAttentionReminder,
        latestAttentionResolution,
        latestAttentionStateEvent,
        latestEvent,
        latestExecution: getLatestProviderExecution(provider.id),
        latestProbe: getLatestProviderProbe(provider.id),
        provider,
      });
    });
  }

  function summarizeProviderStatusEntries(providers) {
    return summarizeProviderStatusReadModel(providers, {
      defaultProviderId: providerRegistry.getDefaultProviderId(),
    });
  }

  function enrichProviderStatusEntries(providers) {
    const pendingAttentionItems = buildProviderAttentionPendingItemsFromProviders(providers, {});
    const recoveredAttentionItems = buildProviderAttentionRecoveredItemsFromProviders(providers, {});

    return enrichProviderStatusReadModel(providers, {
      pendingAttentionItems,
      recoveredAttentionItems,
    });
  }

  function summarizeProviderOverview(providers, probes) {
    const pendingAttentionItems = buildProviderAttentionPendingItemsFromProviders(providers, {});
    const recoveredAttentionItems = buildProviderAttentionRecoveredItemsFromProviders(providers, {});
    const pendingAttentionSummary = summarizeProviderAttentionItems(pendingAttentionItems);

    return summarizeProviderOverviewReadModel({
      acknowledgedAttentionRecords: store.listProviderAttentionAcknowledgements(),
      attentionReminderRecords: store.listProviderAttentionReminders(),
      defaultProviderId: providerRegistry.getDefaultProviderId(),
      events: buildProviderEvents(),
      executions: buildProviderExecutionEntries(),
      pendingAttentionItems,
      pendingAttentionSummary,
      probes,
      providers,
      recoveredAttentionItems,
    });
  }

  function buildProviderOverviewRecentWindow(since) {
    if (!since) {
      return null;
    }

    const probes = store
      .listProviderProbes()
      .filter((probe) => String(probe.checkedAt || probe.createdAt || '') >= since);
    const probeSummary = summarizeProviderProbes(probes);
    const executions = buildProviderExecutionEntries({ since });
    const executionSummary = summarizeProviderExecutions(executions);
    const executionDailyBuckets = buildProviderExecutionDailyBuckets(executions);
    const executionWeeklyBuckets = buildProviderExecutionWeeklyBuckets(executions);
    const executionMonthlyBuckets = buildProviderExecutionMonthlyBuckets(executions);
    const events = buildProviderEvents({ since });
    const eventSummary = summarizeProviderEvents(events);
    const touchedProviderIds = [
      ...new Set(
        [
          ...probes.map((probe) => probe.providerId),
          ...executions.map((execution) => execution.providerId),
          ...events.map((event) => event.providerId),
        ].filter(Boolean),
      ),
    ].sort((left, right) => String(left).localeCompare(String(right)));

    return {
      eventFamilyCounts: eventSummary.familyCounts,
      eventTotal: eventSummary.total,
      fallbackPolicyCounts: eventSummary.fallbackPolicyCounts,
      fallbackStopReasonCounts: eventSummary.fallbackStopReasonCounts,
      providerRouteDecisionCount: eventSummary.providerRouteDecisionCount,
      providerRouteDecisionPolicyCounts: eventSummary.providerRouteDecisionPolicyCounts,
      providerRouteDecisionRouteCounts: eventSummary.providerRouteDecisionRouteCounts,
      executionEstimatedCostUsdAverage: executionSummary.estimatedCostUsdAverage,
      executionEstimatedCostUsdByProviderId: executionSummary.estimatedCostUsdByProviderId,
      executionEstimatedCostUsdByRole: executionSummary.estimatedCostUsdByRole,
      executionBucketCount: executionDailyBuckets.length,
      executionDailyBuckets,
      executionEstimatedCostUsdMax: executionSummary.estimatedCostUsdMax,
      executionEstimatedCostUsdPricedCount: executionSummary.estimatedCostUsdPricedCount,
      executionEstimatedCostUsdTotal: executionSummary.estimatedCostUsdTotal,
      executionFailedCount: executionSummary.statusCounts.failed,
      executionFailureKindCounts: executionSummary.failureKindCounts,
      executionLatestBucketDate: executionDailyBuckets[0]?.date || null,
      executionLatestBucketDelta: buildProviderExecutionLatestBucketDelta(executionDailyBuckets),
      executionLatestMonthlyBucketDelta: buildProviderExecutionLatestMonthlyBucketDelta(executionMonthlyBuckets),
      executionLatestWeeklyBucketDelta: buildProviderExecutionLatestWeeklyBucketDelta(executionWeeklyBuckets),
      executionOldestBucketDate: executionDailyBuckets.at(-1)?.date || null,
      executionOldestMonthlyBucketStartDate: executionMonthlyBuckets.at(-1)?.monthStartDate || null,
      executionOldestWeeklyBucketStartDate: executionWeeklyBuckets.at(-1)?.weekStartDate || null,
      executionMonthlyBucketCount: executionMonthlyBuckets.length,
      executionMonthlyBuckets,
      executionLatestMonthlyBucketStartDate: executionMonthlyBuckets[0]?.monthStartDate || null,
      executionTotal: executionSummary.total,
      executionWeeklyBucketCount: executionWeeklyBuckets.length,
      executionWeeklyBuckets,
      executionLatestWeeklyBucketStartDate: executionWeeklyBuckets[0]?.weekStartDate || null,
      filters: {
        since,
      },
      latestAttentionEvent: eventSummary.latestAttentionEvent,
      latestEvent: eventSummary.latestEvent,
      latestExecution: executionSummary.latestExecution,
      latestExecutionEvent: eventSummary.latestExecutionEvent,
      latestFallbackEvent: eventSummary.latestFallbackEvent,
      latestProviderRouteDecisionEvent: eventSummary.latestProviderRouteDecisionEvent,
      latestFailedExecution: executionSummary.latestFailedExecution,
      latestFailedProbe: getLatestMatchingRecord(probes, (probe) => probe.attempted && !probe.ok),
      latestProbe: probes.at(-1) || null,
      latestProbeEvent: eventSummary.latestProbeEvent,
      latestSkippedProbe: getLatestMatchingRecord(probes, (probe) => !probe.attempted),
      latestSuccessfulExecution: executionSummary.latestSuccessfulExecution,
      latestSuccessfulProbe: getLatestMatchingRecord(probes, (probe) => probe.ok),
      probeAttemptedCount: probeSummary.attemptedCount,
      probeFailureCount: probeSummary.failureCount,
      probeFailureKindCounts: probeSummary.failureKindCounts,
      probeSkippedCount: probes.filter((probe) => !probe.attempted).length,
      probeSuccessCount: probeSummary.successCount,
      probeTotal: probeSummary.total,
      touchedProviderCount: touchedProviderIds.length,
      touchedProviderIds,
      usageInputTokensTotal: executionSummary.usageInputTokensTotal,
      usageOutputTokensTotal: executionSummary.usageOutputTokensTotal,
      usageTotalTokensTotal: executionSummary.usageTotalTokensTotal,
    };
  }

  function summarizeProviderHealthDrift({ attentionNeedsReminderCount = 0, attentionOverdueCount = 0, attentionRequiredCount = 0, recentWindow = null }) {
    const monthlyDelta = recentWindow?.executionLatestMonthlyBucketDelta || null;
    const recentExecutionMonthlyBucketCount = Number(recentWindow?.executionMonthlyBucketCount || 0);
    const recentExecutionCountDelta = Number(monthlyDelta?.executionCountDelta || 0);
    const recentExecutionFailedCountDelta = Number(monthlyDelta?.failedCountDelta || 0);
    const recentExecutionEstimatedCostUsdTotalDelta = roundUsdAmount(
      Number(monthlyDelta?.estimatedCostUsdTotalDelta || 0),
    );
    const reasonCodes = [];

    if (attentionOverdueCount > 0) {
      reasonCodes.push('attention-overdue');
    }
    if (attentionNeedsReminderCount > 0) {
      reasonCodes.push('attention-needs-reminder');
    }
    if (recentExecutionFailedCountDelta > 0) {
      reasonCodes.push('monthly-failed-up');
    }

    let status = 'stable';
    if (attentionOverdueCount > 0) {
      status = 'attention-required';
    } else if (attentionNeedsReminderCount > 0 || recentExecutionFailedCountDelta > 0) {
      status = 'watch';
    }

    return {
      attentionNeedsReminderCount,
      attentionOverdueCount,
      attentionRequiredCount,
      reasonCodes,
      recentExecutionCountDelta,
      recentExecutionCurrentMonthStartDate: recentWindow?.executionLatestMonthlyBucketStartDate || null,
      recentExecutionEstimatedCostUsdTotalDelta,
      recentExecutionFailedCountDelta,
      recentExecutionMonthlyBucketCount,
      recentExecutionOldestMonthStartDate: recentWindow?.executionOldestMonthlyBucketStartDate || null,
      recentExecutionPreviousMonthStartDate: monthlyDelta?.previousMonthStartDate || null,
      status,
    };
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

  function buildProviderBaseEvents(filter = {}) {
    const family = normalizeText(filter.family).toLowerCase();
    const events = [];

    if (!family || family === 'probe') {
      const probeTimeline = buildProviderProbeTimeline(
        store.listProviderProbes({
          attempted: filter.attempted,
          ok: filter.ok,
          providerId: filter.providerId,
        }),
      );

      events.push(
        ...probeTimeline.map((event) => ({
          ...event,
          attempted: event.attempted,
          eventFamily: 'probe',
          eventKind: event.kind,
          executionStatus: null,
          ok: event.ok,
          probeId: event.id,
          role: null,
          runId: null,
          status: null,
        })),
      );
    }

    if (!family || family === 'attention') {
      const attentionTimeline = buildProviderAttentionTimeline(
        store.listProviderAttentionAcknowledgements({
          missionId: filter.missionId,
          providerId: filter.providerId,
          workspaceId: filter.workspaceId,
        }),
      );
      const reminderTimeline = buildProviderAttentionReminderTimeline(
        store.listProviderAttentionReminders({
          missionId: filter.missionId,
          providerId: filter.providerId,
          workspaceId: filter.workspaceId,
        }),
      );

      events.push(
        ...attentionTimeline.map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'attention',
          eventKind: event.kind,
          executionStatus: null,
          ok: null,
          probeId: null,
          role: null,
          runId: null,
          status: 'acknowledged',
        })),
        ...reminderTimeline.map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'attention',
          eventKind: event.kind,
          executionStatus: null,
          ok: null,
          probeId: null,
          role: null,
          runId: null,
        })),
      );
    }

    if (!family || family === 'execution') {
      const executionTimeline = buildProviderExecutionTimeline(
        buildProviderExecutionEntries({
          missionId: filter.missionId,
          providerId: filter.providerId,
          role: filter.role,
          status: filter.status,
          workspaceId: filter.workspaceId,
        }),
      );

      events.push(
        ...executionTimeline.map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'execution',
          eventKind: event.kind,
          executionStatus: event.status,
          ok: event.status === 'completed',
          probeId: null,
          runId: event.runId,
        })),
      );
    }

    if (!family || family === 'fallback') {
      events.push(...buildProviderFallbackEventTimeline(filter));
    }

    return sortTimelineEvents(events);
  }

  function buildProviderEvents(filter = {}) {
    const family = normalizeText(filter.family).toLowerCase();
    const fallbackPolicyFilter = normalizeText(filter.fallbackPolicy)
      ? normalizeProviderFallbackPolicy(filter.fallbackPolicy)
      : '';
    const fallbackStopReasonFilter = normalizeText(filter.fallbackStopReason);
    const hasFallbackScopedFilter = Boolean(fallbackPolicyFilter || fallbackStopReasonFilter);
    const normalizedSinceFilter = normalizeTimestampFilter(filter.since, 'provider event since timestamp');
    const events = [...buildProviderBaseEvents(filter)];

    if (!family || family === 'attention') {
      const attentionAcknowledgements = store.listProviderAttentionAcknowledgements({
        missionId: filter.missionId,
        providerId: filter.providerId,
        workspaceId: filter.workspaceId,
      });
      const syntheticOpenedTimeline = buildProviderAttentionOpenedTimeline(
        [
          ...buildProviderAttentionPendingItems({
            missionId: filter.missionId,
            providerId: filter.providerId,
            workspaceId: filter.workspaceId,
          }),
          ...buildProviderAttentionRecoveredItems({
            missionId: filter.missionId,
            providerId: filter.providerId,
            workspaceId: filter.workspaceId,
          }),
        ],
        attentionAcknowledgements,
      );

      events.push(
        ...syntheticOpenedTimeline.map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'attention',
          eventKind: event.kind,
          executionStatus: null,
          ok: null,
          probeId: null,
          role: null,
          runId: null,
          status: event.status,
        })),
        ...buildProviderAttentionRecoveredTimeline(
          buildProviderAttentionRecoveredItems({
            missionId: filter.missionId,
            providerId: filter.providerId,
            workspaceId: filter.workspaceId,
          }),
        ).map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'attention',
          eventKind: event.kind,
          executionStatus: null,
          ok: true,
          probeId: event.recoveryProbeId,
          role: null,
          runId: event.recoveryRunId,
          status: event.status,
        })),
      );
    }

    return sortTimelineEvents(events).filter((event) => {
      if (hasFallbackScopedFilter && event.eventFamily !== 'fallback') {
        return false;
      }
      if (fallbackPolicyFilter && event.fallbackPolicy !== fallbackPolicyFilter) {
        return false;
      }
      if (fallbackStopReasonFilter && normalizeText(event.fallbackStopReason) !== fallbackStopReasonFilter) {
        return false;
      }
      if (!normalizedSinceFilter) {
        return true;
      }
      return String(event.at || '') >= normalizedSinceFilter;
    });
  }

  function listProviders() {
    const providers = enrichProviderStatusEntries(buildProviderStatusEntries());
    return {
      providers,
      summary: summarizeProviderStatusEntries(providers),
    };
  }

  function getProviderOverview(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider overview since timestamp');
    const providers = enrichProviderStatusEntries(buildProviderStatusEntries());
    const probes = store.listProviderProbes();
    const recentWindow = buildProviderOverviewRecentWindow(since);
    const overviewSummary = summarizeProviderOverview(providers, probes);
    const healthDrift = summarizeProviderHealthDrift({
      attentionNeedsReminderCount: overviewSummary.attentionNeedsReminderCount,
      attentionOverdueCount: overviewSummary.attentionOverdueCount,
      attentionRequiredCount: overviewSummary.attentionRequiredCount,
      recentWindow,
    });

    return buildProviderOverviewResult({
      healthDrift,
      overviewSummary,
      providers,
      recentWindow,
      since,
    });
  }

  function summarizeScopedProviderActivity(filter = {}) {
    const pendingAttentionItems = buildProviderAttentionPendingItems(filter);
    const acknowledgedAttentionItems = buildProviderAttentionAcknowledgedItems(filter);
    const recoveredAttentionItems = buildProviderAttentionRecoveredItems(filter);
    const resolvedAttentionItems = buildProviderAttentionResolvedItems(filter);
    const reminderRecords = store.listProviderAttentionReminders(filter);
    const attentionAcknowledgements = store.listProviderAttentionAcknowledgements(filter);
    const executionEntries = buildProviderExecutionEntries(filter);
    const executionSummary = summarizeProviderExecutions(executionEntries);
    const scopedProviderEvents = sortTimelineEvents([
      ...buildProviderAttentionOpenedTimeline(
        [...pendingAttentionItems, ...recoveredAttentionItems],
        attentionAcknowledgements,
      ).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'pending',
      })),
      ...buildProviderAttentionTimeline(
        attentionAcknowledgements,
      ).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'acknowledged',
      })),
      ...buildProviderAttentionRecoveredTimeline(recoveredAttentionItems).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: true,
        probeId: event.recoveryProbeId || null,
        role: null,
        runId: event.recoveryRunId || null,
        status: event.status || 'recovered',
      })),
      ...buildProviderAttentionReminderTimeline(reminderRecords).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'pending',
      })),
      ...buildProviderExecutionTimeline(executionEntries).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'execution',
        eventKind: event.kind,
        executionStatus: event.status,
        ok: event.status === 'completed',
        probeId: null,
      })),
    ]);
    const eventSummary = summarizeProviderEvents(scopedProviderEvents);
    const combinedAttentionSummary = summarizeProviderAttentionItems([
      ...pendingAttentionItems,
      ...acknowledgedAttentionItems,
      ...recoveredAttentionItems,
      ...resolvedAttentionItems,
    ]);
    const touchedProviderIds = [
      ...new Set(
        [
          ...pendingAttentionItems.map((item) => item.providerId),
          ...acknowledgedAttentionItems.map((item) => item.providerId),
          ...recoveredAttentionItems.map((item) => item.providerId),
          ...resolvedAttentionItems.map((item) => item.providerId),
          ...executionEntries.map((item) => item.providerId),
        ].filter(Boolean),
      ),
    ].sort((left, right) => String(left).localeCompare(String(right)));

    return {
      latestAttentionAcknowledgement: getLatestItem(acknowledgedAttentionItems, 'acknowledgedAt'),
      latestAttentionRecovery: getLatestItem(recoveredAttentionItems, 'recoveredAt'),
      latestAttentionReminder: getLatestItem(reminderRecords, 'remindedAt'),
      latestAttentionRequiredEvent: getLatestItem(pendingAttentionItems, 'createdAt'),
      latestAttentionResolution: getLatestItem(resolvedAttentionItems, 'resolvedAt'),
      latestExecution: executionSummary.latestExecution,
      latestExecutionEvent: eventSummary.latestExecutionEvent,
      latestFailedExecution: executionSummary.latestFailedExecution,
      latestSuccessfulExecution: executionSummary.latestSuccessfulExecution,
      touchedProviderCount: touchedProviderIds.length,
      touchedProviderIds,
      summary: {
        attentionAcknowledgedCount: acknowledgedAttentionItems.length,
        attentionNeedsReminderCount: pendingAttentionItems.filter((item) => item.needsReminder).length,
        attentionNextReminderAt:
          pendingAttentionItems
            .map((item) => item.nextReminderAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null,
        attentionOverdueCount: pendingAttentionItems.filter((item) => item.isOverdue).length,
        attentionAttemptHistoryEntryCountTotal: combinedAttentionSummary.attemptHistoryEntryCountTotal,
        attentionMaxAttemptCount: combinedAttentionSummary.maxAttemptCount,
        attentionMultiAttemptCount: combinedAttentionSummary.multiAttemptCount,
        attentionReminderCount: reminderRecords.length,
        attentionRequiredCount: pendingAttentionItems.length,
        attentionRecoveredCount: recoveredAttentionItems.length,
        attentionResolvedCount: resolvedAttentionItems.length,
        attentionTotalAttemptCount: combinedAttentionSummary.totalAttemptCount,
        attentionTotalRetryCount: combinedAttentionSummary.retryCountTotal,
        attentionStatusCounts: {
          acknowledged: acknowledgedAttentionItems.length,
          pending: pendingAttentionItems.length,
          recovered: recoveredAttentionItems.length,
          resolved: resolvedAttentionItems.length,
          total:
            pendingAttentionItems.length +
            acknowledgedAttentionItems.length +
            recoveredAttentionItems.length +
            resolvedAttentionItems.length,
        },
        eventCount: eventSummary.total,
        eventFamilyCounts: eventSummary.familyCounts,
        executionAverageDurationMs: executionSummary.averageDurationMs,
        executionFailureKindCounts: executionSummary.failureKindCounts,
        executionCompletedCount: executionSummary.statusCounts.completed,
        executionCount: executionSummary.total,
        executionFailedCount: executionSummary.statusCounts.failed,
        executionMaxDurationMs: executionSummary.maxDurationMs,
        executionMaxAttemptCount: executionSummary.maxAttemptCount,
        executionMultiAttemptCount: executionSummary.multiAttemptCount,
        executionRetryableFailureCount: executionSummary.retryableFailureCount,
        executionRetrySucceededCount: executionSummary.retrySucceededCount,
        executionTimedOutFailureCount: executionSummary.timedOutFailureCount,
        executionTotalAttemptCount: executionSummary.totalAttemptCount,
        executionTotalDurationMs: executionSummary.totalDurationMs,
        executionTotalRetryCount: executionSummary.totalRetryCount,
        executionAttemptHistoryEntryCountTotal: executionSummary.attemptHistoryEntryCountTotal,
        executionEstimatedCostUsdAverage: executionSummary.estimatedCostUsdAverage,
        executionEstimatedCostUsdByProviderId: executionSummary.estimatedCostUsdByProviderId,
        executionEstimatedCostUsdByRole: executionSummary.estimatedCostUsdByRole,
        executionEstimatedCostUsdMax: executionSummary.estimatedCostUsdMax,
        executionEstimatedCostUsdPricedCount: executionSummary.estimatedCostUsdPricedCount,
        executionEstimatedCostUsdTotal: executionSummary.estimatedCostUsdTotal,
        probeAverageDurationMs: eventSummary.probeAverageDurationMs,
        probeMaxDurationMs: eventSummary.probeMaxDurationMs,
        probeTotalDurationMs: eventSummary.probeTotalDurationMs,
        touchedProviderCount: touchedProviderIds.length,
        touchedProviderIds,
        usageInputTokensTotal: executionSummary.usageInputTokensTotal,
        usageOutputTokensTotal: executionSummary.usageOutputTokensTotal,
        usageTotalTokensTotal: executionSummary.usageTotalTokensTotal,
      },
    };
  }

  function summarizeMissionProviderActivity(missionId) {
    return summarizeScopedProviderActivity({ missionId });
  }

  function summarizeWorkspaceProviderActivity(workspaceId) {
    return summarizeScopedProviderActivity({ workspaceId });
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

  function buildScopedProviderRecentWindow(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'scoped provider since timestamp');
    if (!since) {
      return null;
    }

    const pendingAttentionItems = buildProviderAttentionPendingItems(filter).filter(
      (item) => String(item.createdAt || '') >= since,
    );
    const acknowledgedAttentionItems = buildProviderAttentionAcknowledgedItems(filter).filter(
      (item) => String(item.acknowledgedAt || item.createdAt || '') >= since,
    );
    const recoveredAttentionItems = buildProviderAttentionRecoveredItems(filter).filter(
      (item) => String(item.recoveredAt || item.createdAt || '') >= since,
    );
    const resolvedAttentionItems = buildProviderAttentionResolvedItems(filter).filter(
      (item) => String(item.resolvedAt || item.createdAt || '') >= since,
    );
    const reminderRecords = store.listProviderAttentionReminders(filter).filter(
      (item) => String(item.remindedAt || item.createdAt || '') >= since,
    );
    const attentionAcknowledgements = store.listProviderAttentionAcknowledgements(filter).filter(
      (item) => String(item.acknowledgedAt || item.resolvedAt || item.createdAt || '') >= since,
    );
    const executionEntries = buildProviderExecutionEntries({
      ...filter,
      since,
    });
    const executionSummary = summarizeProviderExecutions(executionEntries);
    const executionDailyBuckets = buildProviderExecutionDailyBuckets(executionEntries);
    const executionWeeklyBuckets = buildProviderExecutionWeeklyBuckets(executionEntries);
    const executionMonthlyBuckets = buildProviderExecutionMonthlyBuckets(executionEntries);
    const scopedProviderEvents = sortTimelineEvents([
      ...buildProviderAttentionOpenedTimeline(
        [...pendingAttentionItems, ...recoveredAttentionItems],
        attentionAcknowledgements,
      ).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'pending',
      })),
      ...buildProviderAttentionTimeline(attentionAcknowledgements).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'acknowledged',
      })),
      ...buildProviderAttentionRecoveredTimeline(recoveredAttentionItems).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: true,
        probeId: event.recoveryProbeId || null,
        role: null,
        runId: event.recoveryRunId || null,
        status: event.status || 'recovered',
      })),
      ...buildProviderAttentionReminderTimeline(reminderRecords).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'attention',
        eventKind: event.kind,
        executionStatus: null,
        ok: null,
        probeId: null,
        role: null,
        runId: null,
        status: event.status || 'pending',
      })),
      ...buildProviderExecutionTimeline(executionEntries).map((event) => ({
        ...event,
        attempted: null,
        eventFamily: 'execution',
        eventKind: event.kind,
        executionStatus: event.status,
        ok: event.status === 'completed',
        probeId: null,
      })),
    ]);
    const eventSummary = summarizeProviderEvents(scopedProviderEvents);
    const touchedProviderIds = [
      ...new Set(
        [
          ...pendingAttentionItems.map((item) => item.providerId),
          ...acknowledgedAttentionItems.map((item) => item.providerId),
          ...recoveredAttentionItems.map((item) => item.providerId),
          ...resolvedAttentionItems.map((item) => item.providerId),
          ...executionEntries.map((item) => item.providerId),
        ].filter(Boolean),
      ),
    ].sort((left, right) => String(left).localeCompare(String(right)));

    return {
      eventCount: eventSummary.total,
      eventFamilyCounts: eventSummary.familyCounts,
      executionCount: executionSummary.total,
      executionEstimatedCostUsdAverage: executionSummary.estimatedCostUsdAverage,
      executionEstimatedCostUsdByProviderId: executionSummary.estimatedCostUsdByProviderId,
      executionEstimatedCostUsdByRole: executionSummary.estimatedCostUsdByRole,
      executionBucketCount: executionDailyBuckets.length,
      executionDailyBuckets,
      executionEstimatedCostUsdMax: executionSummary.estimatedCostUsdMax,
      executionEstimatedCostUsdPricedCount: executionSummary.estimatedCostUsdPricedCount,
      executionEstimatedCostUsdTotal: executionSummary.estimatedCostUsdTotal,
      executionFailedCount: executionSummary.statusCounts.failed,
      executionFailureKindCounts: executionSummary.failureKindCounts,
      executionLatestBucketDate: executionDailyBuckets[0]?.date || null,
      executionLatestBucketDelta: buildProviderExecutionLatestBucketDelta(executionDailyBuckets),
      executionLatestMonthlyBucketDelta: buildProviderExecutionLatestMonthlyBucketDelta(executionMonthlyBuckets),
      executionLatestWeeklyBucketDelta: buildProviderExecutionLatestWeeklyBucketDelta(executionWeeklyBuckets),
      executionOldestBucketDate: executionDailyBuckets.at(-1)?.date || null,
      executionOldestMonthlyBucketStartDate: executionMonthlyBuckets.at(-1)?.monthStartDate || null,
      executionOldestWeeklyBucketStartDate: executionWeeklyBuckets.at(-1)?.weekStartDate || null,
      executionMonthlyBucketCount: executionMonthlyBuckets.length,
      executionMonthlyBuckets,
      executionLatestMonthlyBucketStartDate: executionMonthlyBuckets[0]?.monthStartDate || null,
      executionWeeklyBucketCount: executionWeeklyBuckets.length,
      executionWeeklyBuckets,
      executionLatestWeeklyBucketStartDate: executionWeeklyBuckets[0]?.weekStartDate || null,
      filters: {
        since,
      },
      latestAttentionEvent: eventSummary.latestAttentionEvent,
      latestEvent: eventSummary.latestEvent,
      latestExecution: executionSummary.latestExecution,
      latestExecutionEvent: eventSummary.latestExecutionEvent,
      latestFallbackEvent: eventSummary.latestFallbackEvent,
      latestFailedExecution: executionSummary.latestFailedExecution,
      latestSuccessfulExecution: executionSummary.latestSuccessfulExecution,
      touchedProviderCount: touchedProviderIds.length,
      touchedProviderIds,
      usageInputTokensTotal: executionSummary.usageInputTokensTotal,
      usageOutputTokensTotal: executionSummary.usageOutputTokensTotal,
      usageTotalTokensTotal: executionSummary.usageTotalTokensTotal,
    };
  }

  function checkProvider(providerId) {
    const provider = enrichProviderStatusEntries(buildProviderStatusEntries()).find((entry) => entry.id === providerId);
    if (!provider) {
      providerRegistry.getProviderStatus(providerId);
      throw new Error(`Provider not found: ${providerId}`);
    }
    return provider;
  }

  async function probeProvider(providerId) {
    const result = await providerRegistry.probeProvider(providerId);
    const checkedAt = result.checkedAt || now();
    const probeRecord = store.saveProviderProbe({
      id: createId('provider-probe'),
      attemptCount: Number(result.attemptCount || 0),
      attemptHistory: normalizeProviderAttemptHistory(result.attemptHistory),
      durationMs: normalizeTelemetryNumber(result.durationMs),
      failureKind: normalizeText(result.failureKind) ? normalizeProviderFailureKind(result.failureKind) : null,
      httpStatus: Number.isFinite(Number(result.httpStatus)) ? Number(result.httpStatus) : null,
      providerId: result.id,
      providerResponseId: normalizeText(result.providerResponseId) || null,
      rawMessage: normalizeText(result.rawMessage) || null,
      recoverable: typeof result.recoverable === 'boolean' ? result.recoverable : null,
      retryCount: Number(result.retryCount || 0),
      attempted: Boolean(result.attempted),
      ok: Boolean(result.ok),
      reason: normalizeText(result.reason),
      endpoint: normalizeText(result.endpoint),
      transport: normalizeText(result.transport),
      model: normalizeText(result.model),
      modelAvailable: Boolean(result.modelAvailable),
      modelCount: Number.isFinite(Number(result.modelCount)) ? Number(result.modelCount) : 0,
      sampleModels: ensureArray(result.sampleModels).map((item) => normalizeText(item)).filter(Boolean),
      checkedAt,
      createdAt: checkedAt,
      timedOut: Boolean(result.timedOut),
    });

    return {
      ...result,
      probeId: probeRecord.id,
    };
  }

  function listProviderProbeHistory(filter = {}) {
    const probes = store.listProviderProbes(filter);
    return buildProviderProbeHistoryResult(probes);
  }

  function getProviderProbeTimeline(filter = {}) {
    const probes = store.listProviderProbes(filter);
    return buildProviderProbeTimelineResult(probes);
  }

  function getProviderExecutionHistory(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider execution since timestamp');
    const executions = buildProviderExecutionEntries({
      ...filter,
      since,
    });
    return buildProviderExecutionHistoryResult(executions, { ...filter, since });
  }

  function getProviderExecutionTimeline(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider execution since timestamp');
    const executions = buildProviderExecutionEntries({
      ...filter,
      since,
    });
    return buildProviderExecutionTimelineResult(executions, { ...filter, since });
  }

  function getProviderEventTimeline(filter = {}) {
    const since = normalizeTimestampFilter(filter.since, 'provider event since timestamp');
    const fallbackPolicy = filter.fallbackPolicy ? normalizeProviderFallbackPolicy(filter.fallbackPolicy) : null;
    const timeline = buildProviderEvents({
      ...filter,
      fallbackPolicy,
      since,
    });
    return buildProviderEventTimelineResult(timeline, { ...filter, fallbackPolicy, since });
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
          content = fs.readFileSync(attachment.path, 'utf8');
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

  function getRunArtifact(run, kind = 'deliverable') {
    const artifactId = ensureArray(run?.artifactIds)
      .map((artifactId) => store.getArtifact(artifactId))
      .filter(Boolean)
      .find((artifact) => artifact.kind === kind)?.id;

    return artifactId ? store.getArtifact(artifactId) : null;
  }

  function buildSpecialistOutputEntry(run) {
    const artifact = getRunArtifact(run);
    const artifactContent = artifact?.path && fs.existsSync(artifact.path) ? fs.readFileSync(artifact.path, 'utf8') : '';
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
  }) {
    const artifactFilePrefix = getRunArtifactFilePrefix({
      role,
      specialistKind: runMetadata.specialistKind,
    });
    const retrievalContext = buildRetrievalContext({
      attachments,
      memoryEntries,
      mission,
      pack,
      previousOutputs,
      providerRole,
      role,
    });
    const providerInput = {
      attachments,
      role,
      providerRole,
      mission,
      workspace,
      pack,
      memoryEntries,
      retrievalContext,
      sessionSourceContext: session.sourceContext || normalizeSessionSourceContext(),
      previousOutputs,
      parallelGroupId: normalizeText(runMetadata.parallelGroupId) || null,
      parallelRequiredKinds: ensureArray(runMetadata.parallelRequiredKinds),
      resumeFromRunId: normalizeText(runMetadata.resumeFromRunId) || null,
      specialistKind: normalizeText(runMetadata.specialistKind) || null,
      specialistMergeMode: normalizeText(runMetadata.stageKind) === 'parallel-merge',
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
        artifactIds: [promptArtifact.id, retrievalArtifact?.id, outputArtifact.id].filter(Boolean),
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
        artifactIds: [promptArtifact.id, retrievalArtifact?.id].filter(Boolean),
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
      fs.writeFileSync(reviewerStage.artifact.path, reconciliation.output.artifactContent, 'utf8');
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
      executionSession.logFilePath && fs.existsSync(executionSession.logFilePath)
        ? fs.readFileSync(executionSession.logFilePath, 'utf8')
        : '';
    const lines = content ? content.split(/\r?\n/).filter(Boolean) : [];

    return {
      execution: executionSession,
      lines,
      logFilePath: executionSession.logFilePath || null,
    };
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
    const adrEntries = fs.existsSync(adrDir)
      ? fs
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
      const exists = fs.existsSync(entry.filePath);
      const stats = exists ? fs.statSync(entry.filePath) : null;
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

  function deriveReviewerFollowUpSeed(mission, filter = {}) {
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

    const reviewerRun = store.listAgentRunsBySession(latestSession.id).find((run) => run.role === 'reviewer') || null;
    if (!reviewerRun || reviewerRun.status !== 'failed') {
      return null;
    }

    const reviewerReport =
      store
        .listArtifactsBySession(latestSession.id)
        .filter((artifact) => artifact.fileName === 'reviewer-report.md')
        .at(-1) || null;

    const findings =
      reviewerReport && fs.existsSync(reviewerReport.path)
        ? parseMarkdownBulletSection(fs.readFileSync(reviewerReport.path, 'utf8'), 'Findings')
        : [];

    return {
      actionClass: 'retry-ready',
      actionId: `reviewer-follow-up:${mission.id}:${latestSession.id}`,
      actionType: 'reviewer-follow-up',
      createdAt: reviewerReport?.createdAt || reviewerRun.endedAt || latestSession.endedAt || latestSession.startedAt,
      deliverableType: mission.deliverableType,
      findings,
      missionId: mission.id,
      missionStatus: mission.status,
      missionTitle: mission.title,
      mode: mission.mode,
      reason: reviewerRun.outputSummary,
      reportPath: reviewerReport ? reviewerReport.path : null,
      requestedByRole: 'reviewer',
      resolutionKind: '',
      resolutionNote: '',
      resolvedAt: null,
      sessionId: latestSession.id,
      sessionStatus: latestSession.status,
      status: 'open',
      title: `Reviewer follow-up required for ${mission.title}`,
      updatedAt: reviewerReport?.createdAt || reviewerRun.endedAt || latestSession.updatedAt || latestSession.endedAt || latestSession.startedAt,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    };
  }

  function listReviewerFollowUpRecords(filter = {}) {
    if (filter.status && !REVIEWER_FOLLOW_UP_STATUSES.includes(filter.status)) {
      throw new Error(`Unsupported reviewer follow-up status: ${filter.status}`);
    }
    if (filter.resolutionKind && !REVIEWER_FOLLOW_UP_RESOLUTION_KINDS.includes(filter.resolutionKind)) {
      throw new Error(`Unsupported reviewer follow-up resolution kind: ${filter.resolutionKind}`);
    }

    const allRecords = store.listReviewerFollowUps({
      actionId: filter.actionId,
      missionId: filter.missionId,
      sessionId: filter.sessionId,
      workspaceId: filter.workspaceId,
    });
    const records = allRecords.filter((record) => {
      if (filter.status && record.status !== filter.status) {
        return false;
      }
      if (filter.resolutionKind && record.resolutionKind !== filter.resolutionKind) {
        return false;
      }
      return true;
    });
    const recordActionIds = new Set(allRecords.map((record) => record.actionId));

    if (filter.status === 'resolved') {
      return records.sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
    }

    const seeds = store
      .listMissions()
      .map((mission) => deriveReviewerFollowUpSeed(mission, filter))
      .filter(Boolean)
      .filter((seed) => !recordActionIds.has(seed.actionId));

    return [...records, ...seeds].sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function getReviewerFollowUpInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }

    const effectiveStatus = filter.status || 'open';
    const items = listReviewerFollowUpRecords({
      actionId: filter.actionId,
      missionId: filter.missionId,
      resolutionKind: filter.kind || filter.resolutionKind,
      status: effectiveStatus,
      workspaceId: filter.workspaceId,
    })
      .map((record) => buildReviewerFollowUpItemFromRecord(record))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        kind: filter.kind || filter.resolutionKind || null,
        missionId: filter.missionId || null,
        status: effectiveStatus,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeReviewerFollowUps(items),
    };
  }

  function ensureReviewerFollowUpRecord(actionId) {
    const existingRecord = store.listReviewerFollowUps({ actionId }).at(-1) || null;
    if (existingRecord) {
      return existingRecord;
    }

    const seed =
      store
        .listMissions()
        .map((mission) => deriveReviewerFollowUpSeed(mission))
        .find((item) => item && item.actionId === actionId) || null;

    if (!seed) {
      throw new Error(`Reviewer follow-up not found: ${actionId}`);
    }

    return store.saveReviewerFollowUp({
      id: createId('reviewerfollowup'),
      ...seed,
      createdAt: seed.createdAt || now(),
      updatedAt: seed.updatedAt || seed.createdAt || now(),
    });
  }

  function createReviewerFollowUpRecord(seed) {
    const existingRecord = store.listReviewerFollowUps({ actionId: seed.actionId }).at(-1) || null;
    if (existingRecord) {
      return existingRecord;
    }

    return store.saveReviewerFollowUp({
      id: createId('reviewerfollowup'),
      ...seed,
      createdAt: seed.createdAt || now(),
      updatedAt: seed.updatedAt || seed.createdAt || now(),
    });
  }

  function buildReviewerFollowUpItems(filter = {}) {
    return listReviewerFollowUpRecords({ ...filter, status: 'open' })
      .map((record) => buildReviewerFollowUpItemFromRecord(record))
      .filter(Boolean)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildAcceptedRiskMonitoringItems(filter = {}) {
    return store
      .listEscalations({
        missionId: filter.missionId,
        owner: filter.owner,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((escalation) => enrichEscalation(escalation))
      .filter(
        (escalation) =>
          (escalation.actionType === 'reviewer-accepted-risk' || escalation.sourceResolutionKind === 'accepted-risk') &&
          !escalation.pendingOwnerHandoff,
      )
      .map((escalation) =>
        addFixedOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'monitoring-required',
              actionId: escalation.actionId,
              actionType: 'accepted-risk-monitoring',
              createdAt: escalation.createdAt,
              deliverableType: escalation.deliverableType || null,
              escalationId: escalation.id,
              effectiveRecommendedOwner: escalation.effectiveRecommendedOwner || escalation.recommendedOwner || 'workspace-owner',
              missionId: escalation.missionId,
              reason: escalation.reason,
              recommendedCommand: escalation.recommendedCommand,
              recommendedOwner: escalation.recommendedOwner,
              sessionId: escalation.sessionId,
              sourceResolutionKind: escalation.sourceResolutionKind || 'accepted-risk',
              title: escalation.title,
              workspaceId: escalation.workspaceId,
              workspaceName: escalation.workspaceName,
              lastReminderAt: escalation.lastReminderAt || null,
              needsReminder: Boolean(escalation.needsReminder),
              nextReminderAt: escalation.nextReminderAt || null,
              ownerEscalationLevel: escalation.ownerEscalationLevel || 'base',
              ownerEscalationStep: Number(escalation.ownerEscalationStep || 0),
              ownerHistoryCount: Array.isArray(escalation.ownerHistory) ? escalation.ownerHistory.length : 0,
              lastOwnerEscalatedAt: escalation.lastOwnerEscalatedAt || null,
              reminderCount: Number(escalation.reminderCount || 0),
              reminderCadenceHours: escalation.reminderCadenceHours || null,
              reminderHistoryCount: Array.isArray(escalation.reminderHistory) ? escalation.reminderHistory.length : 0,
            },
            {
              priority: escalation.priority || 'medium',
              recommendedCommand: escalation.recommendedCommand,
              recommendedOwner: escalation.recommendedOwner || 'workspace-owner',
            },
          ),
          {
            dueAt: escalation.dueAt,
            escalationRule: escalation.escalationRule,
            slaHours: deriveSlaHoursFromTimestamps(escalation.createdAt, escalation.dueAt),
          },
        ),
      )
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildOwnerHandoffActionItems(filter = {}) {
    return store
      .listEscalations({
        missionId: filter.missionId,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((escalation) => enrichEscalation(escalation))
      .filter((escalation) => escalation.pendingOwnerHandoff && escalation.latestOwnerTransition)
      .map((escalation) =>
        addFixedOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'handoff-required',
              actionId: `owner-handoff:${escalation.id}`,
              actionType: 'owner-handoff',
              createdAt: escalation.latestOwnerTransition?.at || escalation.createdAt,
              deliverableType: escalation.deliverableType || null,
              effectiveRecommendedOwner: escalation.latestOwnerTransition?.to || escalation.effectiveRecommendedOwner,
              escalationId: escalation.id,
              handoffDueAt: escalation.ownerHandoffDueAt,
              handoffLatestReminderAt: escalation.latestOwnerHandoffReminderAt,
              handoffNeedsReminder: escalation.ownerHandoffNeedsReminder,
              handoffNextReminderAt: escalation.nextOwnerHandoffReminderAt,
              handoffReminderCadenceHours: escalation.ownerHandoffReminderCadenceHours,
              handoffReminderCount: escalation.ownerHandoffReminderCount,
              handoffSlaHours: escalation.ownerHandoffSlaHours,
              lastReminderAt: escalation.latestOwnerHandoffReminderAt,
              missionId: escalation.missionId,
              needsReminder: escalation.ownerHandoffNeedsReminder,
              nextReminderAt: escalation.nextOwnerHandoffReminderAt,
              ownerTransitionAt: escalation.latestOwnerTransition?.at || null,
              ownerTransitionDetail: escalation.latestOwnerTransition
                ? formatEscalationOwnerChangeDetail(escalation.latestOwnerTransition)
                : null,
              ownerTransitionFrom: escalation.latestOwnerTransition?.from || null,
              ownerTransitionTo: escalation.latestOwnerTransition?.to || null,
              pendingOwnerHandoff: escalation.pendingOwnerHandoff,
              recommendedCommand: `node src/cli.mjs action acknowledge-owner-handoff ${escalation.id} --note "<note>"`,
              recommendedOwner: escalation.latestOwnerTransition?.to || escalation.effectiveRecommendedOwner,
              reminderCadenceHours: escalation.ownerHandoffReminderCadenceHours,
              reminderCount: escalation.ownerHandoffReminderCount,
              sessionId: escalation.sessionId,
              title: escalation.title,
              workspaceId: escalation.workspaceId,
              workspaceName: escalation.workspaceName,
            },
            {
              priority: 'high',
              recommendedCommand: `node src/cli.mjs action acknowledge-owner-handoff ${escalation.id} --note "<note>"`,
              recommendedOwner: escalation.latestOwnerTransition?.to || escalation.effectiveRecommendedOwner,
            },
          ),
          {
            dueAt: escalation.ownerHandoffDueAt,
            escalationRule: 'Acknowledge the owner handoff so the escalated monitoring responsibility is explicit.',
            slaHours: escalation.ownerHandoffSlaHours,
          },
        ),
      )
      .filter((item) => !filter.owner || item.recommendedOwner === filter.owner)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
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

  function buildSpecialistFollowUpItem({
    actionId,
    createdAt,
    detail,
    followUpSource = 'run-status',
    group,
    mission,
    providerId,
    run = null,
    specialistHandoff,
    specialistKind,
    status,
    workspace,
  }) {
    const followUpPolicy = resolveSpecialistFollowUpPolicy({
      followUpSource,
      orchestrationProfile: group.orchestrationProfile,
      specialistKind,
      status,
    });
    const remediationRoute = resolveSpecialistFollowUpRoute({
      actionId,
      followUpSource,
      missionId: mission.id,
      providerId,
      retryPolicy: followUpPolicy.retryPolicy,
      specialistKind,
    });
    const reminderRecords = listSpecialistFollowUpRemindersForItem({ actionId });

    return buildSpecialistFollowUpActionItem({
      actionId,
      createdAt,
      detail,
      followUpPolicy,
      followUpSource,
      group,
      mission,
      providerId,
      remediationRoute,
      reminderRecords,
      run,
      specialistHandoff,
      specialistKind,
      status,
      workspace,
    });
  }

  function buildSpecialistFollowUpItems(filter = {}) {
    return buildParallelGroupStates(filter)
      .flatMap((group) => {
        const mission = group.mission;
        const workspace = group.workspace;
        if (!mission || !workspace) {
          return [];
        }

        const directItems = [...group.latestByKind.values()]
          .filter((run) => ['blocked', 'failed'].includes(normalizeAgentRunStatus(run.status)))
          .map((run) => {
            const specialistKind = normalizeText(run.specialistKind);
            const status = normalizeAgentRunStatus(run.status);
            const session = store.getSession(run.sessionId);
            const providerId = normalizeText(session?.provider || run.providerId, 'stub');
            const specialistHandoff =
              normalizeSpecialistHandoff(run.specialistHandoff, {
                nextAction: `Resolve the ${specialistKind} specialist ${status} state before merge.`,
                recommendedOwner: 'workspace-owner',
                summaryText: run.outputSummary,
              }) ||
              buildFallbackSpecialistHandoff({
                specialistKind,
                status,
                summaryText: normalizeText(run.outputSummary),
              });

            return buildSpecialistFollowUpItem({
              actionId: `specialist-follow-up:${group.parallelGroupId}:${specialistKind}:${run.id}`,
              createdAt: run.endedAt || run.startedAt || now(),
              detail: formatProviderFailureDetail({
                attemptCount: run.attemptCount,
                detail: run.outputSummary || `${specialistKind} specialist branch requires follow-up.`,
                failureKind: normalizeProviderFailureKind(run.failureKind),
                httpStatus: run.httpStatus,
                recoverable: typeof run.recoverable === 'boolean' ? run.recoverable : null,
                timedOut: Boolean(run.timedOut),
              }),
              group,
              mission,
              providerId,
              run,
              specialistHandoff,
              specialistKind,
              status,
              workspace,
            });
          });

        const directKinds = new Set(directItems.map((item) => item.specialistKind));
        const qualityGateItems = ensureArray(group.qualityGate?.violations)
          .filter((violation) => !directKinds.has(violation.specialistKind))
          .map((violation) => {
            const run = violation.sourceRun || group.latestByKind.get(violation.specialistKind) || null;
            const providerId = normalizeText(
              store.getSession(run?.sessionId)?.provider || run?.providerId,
              'stub',
            );
            const gateRequest = `Produce a completed ${violation.specialistKind} specialist signal to satisfy the ${group.qualityGate.qualityGate} gate before merge.`;
            const baseSpecialistHandoff =
              normalizeSpecialistHandoff(run?.specialistHandoff, {
                nextAction: gateRequest,
                recommendedOwner: 'workspace-owner',
                summaryText: violation.detail,
              }) ||
              buildFallbackSpecialistHandoff({
                nextAction: gateRequest,
                specialistKind: violation.specialistKind,
                status: 'blocked',
                summaryText: violation.detail,
              });
            const specialistHandoff = normalizeSpecialistHandoff(
              {
                ...baseSpecialistHandoff,
                blockers: [...new Set([...(baseSpecialistHandoff?.blockers || []), violation.detail].filter(Boolean))],
                currentState: violation.detail,
                nextHandoff: {
                  ...(baseSpecialistHandoff?.nextHandoff || {}),
                  recommendedOwner:
                    baseSpecialistHandoff?.nextHandoff?.recommendedOwner || 'workspace-owner',
                  request: gateRequest,
                },
              },
              {
                nextAction: gateRequest,
                recommendedOwner: 'workspace-owner',
                summaryText: violation.detail,
              },
            );

            return buildSpecialistFollowUpItem({
              actionId: `specialist-follow-up:${group.parallelGroupId}:${violation.specialistKind}:quality-gate`,
              createdAt: violation.at || run?.endedAt || run?.startedAt || now(),
              detail: violation.detail,
              followUpSource: 'quality-gate',
              group,
              mission,
              providerId,
              run,
              specialistHandoff,
              specialistKind: violation.specialistKind,
              status: 'blocked',
              workspace,
            });
          });

        return [...directItems, ...qualityGateItems];
      })
      .filter((item) => !filter.providerId || item.providerId === filter.providerId)
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function summarizeSpecialistFollowUpScopedState(filter = {}) {
    const items = buildSpecialistFollowUpItems(filter);
    const blockedItems = items.filter((item) => normalizeAgentRunStatus(item.status) === 'blocked');
    const failedItems = items.filter((item) => normalizeAgentRunStatus(item.status) === 'failed');
    let status = 'clear';

    if (failedItems.length) {
      status = 'failed';
    } else if (blockedItems.length) {
      status = 'blocked';
    }

    return {
      blockedCount: blockedItems.length,
      failedCount: failedItems.length,
      latestActionId: items.at(-1)?.actionId || null,
      latestBlockedActionId: blockedItems.at(-1)?.actionId || null,
      latestFailedActionId: failedItems.at(-1)?.actionId || null,
      pendingCount: items.length,
      status,
    };
  }

  function getSpecialistFollowUpActionState(actionId) {
    const followUpItem = buildSpecialistFollowUpItems({}).find((item) => item.actionId === actionId);
    if (!followUpItem) {
      return null;
    }

    return {
      item: followUpItem,
      status: normalizeAgentRunStatus(followUpItem.status),
    };
  }

  function buildProviderAttentionPendingItems(filter = {}) {
    return buildProviderAttentionPendingItemsFromProviders(buildProviderStatusEntries(), filter);
  }

  function buildProviderAttentionRecoveredItems(filter = {}) {
    return buildProviderAttentionRecoveredItemsFromProviders(buildProviderStatusEntries(), filter);
  }

  function buildProviderAttentionRecoveredItemsFromProviders(providers, filter = {}) {
    return providers
      .map((provider) => provider.latestAttentionRecovery || null)
      .filter(Boolean)
      .filter((item) => !filter.providerId || item.providerId === filter.providerId)
      .filter((item) => !filter.workspaceId || item.workspaceId === filter.workspaceId)
      .filter((item) => !filter.missionId || item.missionId === filter.missionId)
      .sort((left, right) => String(left.recoveredAt || left.createdAt || '').localeCompare(String(right.recoveredAt || right.createdAt || '')));
  }

  function buildProviderAttentionPendingItemsFromProviders(providers, filter = {}) {
    return providers
      .map((provider) => {
        const latestEvent = provider.latestAttentionStateEvent;
        if (!latestEvent || !['provider-probe-failed', 'provider-execution-failed'].includes(latestEvent.eventKind)) {
          return null;
        }

        if (filter.providerId && provider.id !== filter.providerId) {
          return null;
        }

        if (filter.workspaceId && latestEvent.workspaceId !== filter.workspaceId) {
          return null;
        }

        if (filter.missionId && latestEvent.missionId !== filter.missionId) {
          return null;
        }

        const existingAcknowledgement = getProviderAttentionAcknowledgementForEvent(latestEvent);
        if (existingAcknowledgement) {
          return null;
        }

        const fallbackPolicyId = 'provider-failure-only';
        const actionId = buildProviderAttentionActionId(latestEvent);
        const fallbackProviderId = latestEvent.eventFamily === 'execution' && provider.id !== 'stub' ? 'stub' : '';
        const permissionDecision = buildProviderAttentionRemediationPermissionDecision({
          actionId,
          at: latestEvent.at,
          attentionItem: {
            eventFamily: latestEvent.eventFamily,
            missionId: latestEvent.missionId || null,
            providerId: provider.id,
            sessionId: latestEvent.sessionId || null,
            workspaceId: latestEvent.workspaceId || null,
          },
          fallbackPolicy: fallbackProviderId ? fallbackPolicyId : '',
          fallbackProvider: fallbackProviderId,
          remediationKind:
            latestEvent.eventFamily === 'execution'
              ? fallbackProviderId
                ? 'mission-fallback-rerun'
                : 'mission-rerun'
              : 'provider-probe',
        });
        const reminderRecords = listProviderAttentionRemindersForEvent(latestEvent);
        const reminderCadenceHours = deriveProviderAttentionReminderCadenceHours(latestEvent.eventFamily);

        return buildProviderAttentionPendingActionItem({
          actionId,
          eventRefId: getProviderAttentionEventRefId(latestEvent),
          failureMetadata: extractProviderFailureMetadata(latestEvent),
          fallbackPolicyId,
          fallbackProviderId,
          latestEvent,
          permissionDecision,
          provider,
          reminderCadenceHours,
          reminderRecords,
        });
      })
      .filter(Boolean)
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue)
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
  }

  function buildProviderAttentionAcknowledgedItems(filter = {}) {
    const recoveredActionIds = new Set(buildProviderAttentionRecoveredItems(filter).map((item) => item.actionId));

    return store
      .listProviderAttentionAcknowledgements({
        missionId: filter.missionId,
        providerId: filter.providerId,
        workspaceId: filter.workspaceId,
      })
      .filter((record) => (record.status || 'acknowledged') === 'acknowledged')
      .filter((record) => !recoveredActionIds.has(record.actionId))
      .map((record) =>
        buildProviderAttentionStoredActionItem({
          failureMetadata: extractProviderFailureMetadata(record),
          providerDisplayName:
            record.providerDisplayName || providerRegistry.getProviderStatus(record.providerId).displayName,
          record,
          status: 'acknowledged',
        }),
      )
      .sort((left, right) => String(left.acknowledgedAt || left.createdAt || '').localeCompare(String(right.acknowledgedAt || right.createdAt || '')));
  }

  function buildProviderAttentionResolvedItems(filter = {}) {
    return store
      .listProviderAttentionAcknowledgements({
        missionId: filter.missionId,
        providerId: filter.providerId,
        workspaceId: filter.workspaceId,
      })
      .filter((record) => (record.status || 'acknowledged') === 'resolved')
      .map((record) =>
        buildProviderAttentionStoredActionItem({
          failureMetadata: extractProviderFailureMetadata(record),
          providerDisplayName:
            record.providerDisplayName || providerRegistry.getProviderStatus(record.providerId).displayName,
          record,
          status: 'resolved',
        }),
      )
      .sort((left, right) => String(left.resolvedAt || left.acknowledgedAt || left.createdAt || '').localeCompare(String(right.resolvedAt || right.acknowledgedAt || right.createdAt || '')));
  }

  function buildProviderAttentionItems(filter = {}) {
    return buildProviderAttentionPendingItems(filter);
  }

  function buildProviderHealthDriftActionItems(filter = {}) {
    const since = getUtcMonthStartTimestamp();

    return store
      .listMissions()
      .map((mission) => {
        if (mission.status === 'completed') {
          return null;
        }
        if (filter.workspaceId && mission.workspaceId !== filter.workspaceId) {
          return null;
        }
        if (filter.missionId && mission.id !== filter.missionId) {
          return null;
        }

        const workspace = store.getWorkspace(mission.workspaceId);
        if (!workspace) {
          return null;
        }

        const providerRecentWindow = buildScopedProviderRecentWindow({
          missionId: mission.id,
          since,
        });
        const providerActivity = summarizeMissionProviderActivity(mission.id);
        const providerHealthDrift = summarizeProviderHealthDrift({
          attentionNeedsReminderCount: providerActivity.summary.attentionNeedsReminderCount,
          attentionOverdueCount: providerActivity.summary.attentionOverdueCount,
          attentionRequiredCount: providerActivity.summary.attentionRequiredCount,
          recentWindow: providerRecentWindow,
        });

        if (providerHealthDrift.status !== 'watch' || providerHealthDrift.attentionRequiredCount > 0) {
          return null;
        }

        const latestFailedProviderExecution =
          providerRecentWindow?.latestFailedExecution || providerActivity.summary.latestFailedProviderExecution || null;
        const createdAt =
          latestFailedProviderExecution?.at || providerRecentWindow?.latestEvent?.at || providerRecentWindow?.latestExecution?.at || null;

        if (!createdAt) {
          return null;
        }

        const commandSince = providerHealthDrift.recentExecutionCurrentMonthStartDate
          ? `${providerHealthDrift.recentExecutionCurrentMonthStartDate}T00:00:00.000Z`
          : since;
        const recommendedCommand = `node src/cli.mjs mission timeline ${mission.id} --provider-since ${commandSince}`;
        const providerId = latestFailedProviderExecution?.providerId || providerRecentWindow?.latestExecution?.providerId || null;
        if (filter.providerId && providerId !== filter.providerId) {
          return null;
        }
        const reason = providerHealthDrift.reasonCodes.length > 0
          ? providerHealthDrift.reasonCodes.join(', ')
          : 'provider-health-drift';

        return addOperationalMetadata(
          addDispatchMetadata(
            {
              actionClass: 'provider-health-drift-required',
              actionId: `provider-health-drift:${mission.id}:${providerHealthDrift.recentExecutionCurrentMonthStartDate || formatDateUtc(Date.parse(createdAt))}`,
              actionType: 'provider-health-drift',
              createdAt,
              deliverableType: mission.deliverableType,
              driftReasonCodes: providerHealthDrift.reasonCodes,
              driftStatus: providerHealthDrift.status,
              latestFailedProviderExecution,
              missionId: mission.id,
              missionStatus: mission.status,
              missionTitle: mission.title,
              mode: mission.mode,
              providerHealthDrift,
              providerId,
              providerRecentSince: commandSince,
              reason,
              title: `Provider health drift review for ${mission.title}`,
              workspaceId: workspace.id,
              workspaceName: workspace.name,
            },
            {
              priority: 'medium',
              recommendedCommand,
              recommendedOwner: 'mission-owner',
            },
          ),
          {
            escalationRule:
              'Review recent provider execution drift and decide whether to rerun, switch provider, or narrow scope.',
            slaHours: 24,
          },
        );
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

  function syncEscalations(filter = {}) {
    const currentTimestamp = now();
    const candidates = store.listEscalations({
      missionId: filter.missionId,
      owner: filter.owner,
      status: filter.status,
      workspaceId: filter.workspaceId,
    });
    const results = [];

    for (const escalation of candidates) {
      const previousEffectiveOwner = escalation.currentEffectiveOwner || enrichEscalation(escalation).effectiveRecommendedOwner;
      const nextTier = deriveEscalationTier(escalation);
      const previousTier = escalation.currentTier || deriveEscalationTier(escalation);
      const existingHistory = Array.isArray(escalation.tierHistory) ? escalation.tierHistory : [];
      const tierHistory =
        existingHistory.length > 0
          ? [...existingHistory]
          : [buildInitialTierHistoryEntry(previousTier, escalation.createdAt || currentTimestamp, 'backfilled')];
      const existingOwnerHistory = Array.isArray(escalation.ownerHistory) ? escalation.ownerHistory : [];
      const ownerHistory =
        existingOwnerHistory.length > 0
          ? [...existingOwnerHistory]
          : [buildInitialOwnerHistoryEntry(previousEffectiveOwner, escalation.createdAt || currentTimestamp, 'backfilled')];
      let breachCount = Number.isFinite(Number(escalation.breachCount)) ? Number(escalation.breachCount) : 0;
      let lastBreachAt = escalation.lastBreachAt || null;
      let lastOwnerEscalatedAt = escalation.lastOwnerEscalatedAt || null;
      let changed =
        !escalation.currentTier ||
        !escalation.lastSyncedAt ||
        existingHistory.length === 0 ||
        !escalation.currentEffectiveOwner ||
        existingOwnerHistory.length === 0;

      if (nextTier !== previousTier) {
        tierHistory.push({
          at: currentTimestamp,
          from: previousTier,
          reason: 'sync',
          to: nextTier,
        });
        changed = true;

        if (isBreachTier(nextTier)) {
          breachCount += 1;
          lastBreachAt = currentTimestamp;
        }
      }

      const effectiveOwnerPreview = enrichEscalation({
        ...escalation,
        breachCount,
        currentTier: nextTier,
        lastBreachAt,
        lastSyncedAt: currentTimestamp,
        tierHistory,
      }).effectiveRecommendedOwner;

      if (effectiveOwnerPreview !== previousEffectiveOwner) {
        ownerHistory.push({
          at: currentTimestamp,
          from: previousEffectiveOwner,
          reason: 'sync-owner-chain',
          to: effectiveOwnerPreview,
        });
        lastOwnerEscalatedAt = currentTimestamp;
        changed = true;
      }

      const basePatch = {
        breachCount,
        currentTier: nextTier,
        currentEffectiveOwner: effectiveOwnerPreview,
        lastBreachAt,
        lastOwnerEscalatedAt,
        lastSyncedAt: currentTimestamp,
        ownerHistory,
        tierHistory,
        updatedAt: escalation.updatedAt,
      };

      if (changed) {
        const updated = store.updateEscalation(escalation.id, (current) => ({
          ...current,
          breachCount: basePatch.breachCount,
          currentTier: basePatch.currentTier,
          currentEffectiveOwner: basePatch.currentEffectiveOwner,
          lastBreachAt: basePatch.lastBreachAt,
          lastOwnerEscalatedAt: basePatch.lastOwnerEscalatedAt,
          lastSyncedAt: basePatch.lastSyncedAt,
          ownerHistory: basePatch.ownerHistory,
          tierHistory: basePatch.tierHistory,
        }));

        results.push({
          breachCount: updated.breachCount,
          currentTier: updated.currentTier,
          effectiveRecommendedOwner: updated.currentEffectiveOwner || effectiveOwnerPreview,
          escalationId: updated.id,
          ownerTransitionRecorded: effectiveOwnerPreview !== previousEffectiveOwner,
          transitionRecorded: nextTier !== previousTier,
        });
        continue;
      }

      const updated = store.updateEscalation(escalation.id, (current) => ({
        ...current,
        currentEffectiveOwner: basePatch.currentEffectiveOwner,
        lastSyncedAt: currentTimestamp,
        ownerHistory: basePatch.ownerHistory,
      }));

      results.push({
        breachCount: updated.breachCount || breachCount,
        currentTier: updated.currentTier || nextTier,
        effectiveRecommendedOwner: updated.currentEffectiveOwner || effectiveOwnerPreview,
        escalationId: updated.id,
        ownerTransitionRecorded: false,
        transitionRecorded: false,
      });
    }

    return {
      items: results,
      summary: {
        breachCountTotal: results.reduce((count, item) => count + Number(item.breachCount || 0), 0),
        ownerTransitionedCount: results.filter((item) => item.ownerTransitionRecorded).length,
        syncedCount: results.length,
        transitionedCount: results.filter((item) => item.transitionRecorded).length,
      },
    };
  }

  function getActionInbox(filter = {}) {
    const providerFallbackStopReason = normalizeText(filter.providerFallbackStopReason || filter.fallbackStopReason);
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.actionClass && !ACTION_CLASSES.includes(filter.actionClass)) {
      throw new Error(`Unsupported action class: ${filter.actionClass}`);
    }
    if (filter.priority && !ACTION_PRIORITIES.includes(filter.priority)) {
      throw new Error(`Unsupported action priority: ${filter.priority}`);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.effectiveOwner && !ACTION_OWNERS.includes(filter.effectiveOwner)) {
      throw new Error(`Unsupported effective action owner: ${filter.effectiveOwner}`);
    }

    syncEscalations({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });

    const collectedItems = [
      ...buildApprovalInboxItems(filter),
      ...buildMaintenanceActionItems(filter),
      ...buildOwnerHandoffActionItems(filter),
      ...buildProviderAttentionItems(filter),
      ...buildProviderHealthDriftActionItems(filter),
      ...buildSpecialistFollowUpItems(filter),
      ...listLearningPromotionItems({ ...filter, promotionStatus: filter.promotionStatus || 'operator-active' }),
      ...buildAcceptedRiskMonitoringItems(filter),
      ...buildBlockedFollowUpItems(filter),
      ...buildReviewerFollowUpItems(filter),
    ];
    const items = selectActionInboxItems(collectedItems, { filter, providerFallbackStopReason });
    let maintenanceLatestMonthlyBucketDelta = null;
    let maintenanceMonthlyBuckets = [];

    if (items.some((item) => item.actionType === 'maintenance-sweep') && !filter.providerId) {
      const maintenanceOverviewRuns = listMaintenanceOverviewRuns({
        missionId: filter.missionId,
        owner: filter.owner,
        workspaceId: filter.workspaceId,
      });
      maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(maintenanceOverviewRuns);
      maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);
    }

    return buildActionInboxReadModel({
      filter,
      items,
      maintenanceLatestMonthlyBucketDelta,
      maintenanceMonthlyBuckets,
      providerFallbackStopReason,
    });
  }

  function logOverdueActions(filter = {}) {
    const overdueInbox = getActionInbox({
      ...filter,
      overdueOnly: true,
    });

    if (!overdueInbox.items.length) {
      return {
        count: 0,
        filters: overdueInbox.filters,
        logged: false,
        path: null,
        title: null,
      };
    }

    const title = buildOverdueIncidentTitle(overdueInbox.items.length);
    const summary = overdueInbox.summary;
    const content = buildOverdueIncidentContent({
      filters: overdueInbox.filters,
      items: overdueInbox.items,
      summary,
    });
    const path = docService.logDocument({
      type: 'incident',
      title,
      content,
    });
    const escalationIds = overdueInbox.items.map((item) => {
      const existingOpenEscalation =
        store
          .listEscalations({
            actionId: item.actionId,
            status: 'open',
          })
          .at(-1) || null;

      if (existingOpenEscalation) {
        const updatedEscalation = store.updateEscalation(existingOpenEscalation.id, (escalation) => ({
          ...escalation,
          dueAt: item.dueAt,
          escalationRule: item.escalationRule,
          incidentPath: path,
          incidentTitle: title,
          isOverdue: item.isOverdue,
          lastSeenAt: now(),
          priority: item.priority,
          recommendedCommand: item.recommendedCommand,
          recommendedOwner: item.recommendedOwner,
          title: item.title,
          updatedAt: now(),
        }));

        return updatedEscalation.id;
      }

      return store.saveEscalation({
        id: createId('escalation'),
        actionId: item.actionId,
        actionClass: item.actionClass,
        actionType: item.actionType,
        dueAt: item.dueAt,
        escalationRule: item.escalationRule,
        incidentPath: path,
        incidentTitle: title,
        isOverdue: item.isOverdue,
        lastSeenAt: now(),
        missionId: item.missionId,
        priority: item.priority,
        reason: item.reason,
        recommendedCommand: item.recommendedCommand,
        recommendedOwner: item.recommendedOwner,
        resolutionNote: '',
        resolvedAt: null,
        sessionId: item.sessionId,
        status: 'open',
        title: item.title,
        workspaceId: item.workspaceId,
        workspaceName: item.workspaceName,
        reminderCount: 0,
        reminderHistory: [],
        lastReminderAt: null,
        createdAt: now(),
        updatedAt: now(),
      }).id;
    });

    return {
      count: overdueInbox.items.length,
      escalationIds,
      filters: overdueInbox.filters,
      itemIds: overdueInbox.items.map((item) => item.actionId),
      logged: true,
      path,
      summary,
      title,
    };
  }

  function getEscalatedInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.effectiveOwner && !ACTION_OWNERS.includes(filter.effectiveOwner)) {
      throw new Error(`Unsupported effective action owner: ${filter.effectiveOwner}`);
    }
    if (filter.status && !ESCALATION_STATUSES.includes(filter.status)) {
      throw new Error(`Unsupported escalation status: ${filter.status}`);
    }
    if (filter.tier && !ESCALATION_TIERS.includes(filter.tier)) {
      throw new Error(`Unsupported escalation tier: ${filter.tier}`);
    }

    const syncResult = syncEscalations({
      missionId: filter.missionId,
      owner: filter.owner,
      status: filter.status,
      workspaceId: filter.workspaceId,
    });

    const items = selectEscalatedInboxItems(
      store
        .listEscalations({
          missionId: filter.missionId,
          owner: filter.owner,
          status: filter.status || 'open',
          workspaceId: filter.workspaceId,
        })
        .map((item) => enrichEscalation(item)),
      filter,
    );

    return buildEscalatedInboxReadModel({
      filter,
      items,
      syncSummary: syncResult.summary,
    });
  }

  function remindEscalations(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.tier && !ESCALATION_TIERS.includes(filter.tier)) {
      throw new Error(`Unsupported escalation tier: ${filter.tier}`);
    }

    syncEscalations({
      missionId: filter.missionId,
      owner: filter.owner,
      status: 'open',
      workspaceId: filter.workspaceId,
    });

    const reminderTimestamp = now();
    const note = normalizeText(filter.note);
    const candidates = store
      .listEscalations({
        missionId: filter.missionId,
        owner: filter.owner,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((item) => enrichEscalation(item))
      .filter((item) => {
        if (filter.tier && item.escalationTier !== filter.tier) {
          return false;
        }
        if (filter.excludePendingOwnerHandoff && item.pendingOwnerHandoff) {
          return false;
        }
        if (filter.dueOnly && !item.needsReminder) {
          return false;
        }
        if (filter.overdueOnly && !item.isOverdue) {
          return false;
        }
        return true;
      });

    const items = candidates
      .map((item) =>
        store.updateEscalation(item.id, (current) => {
          const normalizedCurrent = enrichEscalation(current);
          const reminderEntry = {
            at: reminderTimestamp,
            note: buildEscalationReminderNote(normalizedCurrent, note),
            owner: normalizedCurrent.recommendedOwner || 'workspace-owner',
            overdue: normalizedCurrent.isOverdue,
            tier:
              normalizedCurrent.currentTier ||
              normalizedCurrent.escalationTier ||
              deriveEscalationTier(normalizedCurrent),
          };

          return {
            ...current,
            lastReminderAt: reminderTimestamp,
            reminderCount: Number(normalizedCurrent.reminderCount || 0) + 1,
            reminderHistory: [...normalizedCurrent.reminderHistory, reminderEntry],
            updatedAt: reminderTimestamp,
          };
        }),
      )
      .map((item) => enrichEscalation(item))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        excludePendingOwnerHandoff: Boolean(filter.excludePendingOwnerHandoff),
        missionId: filter.missionId || null,
        note: note || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        tier: filter.tier || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        dueCandidateCount: candidates.filter((item) => item.needsReminder).length,
        latestReminderAt:
          [...items]
            .map((item) => item.lastReminderAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(-1) || null,
        overdueReminderCount: items.filter((item) => item.isOverdue).length,
        reminderCountTotal: items.reduce((count, item) => count + Number(item.reminderCount || 0), 0),
        remindedCount: items.length,
      },
    };
  }

  function runActionMaintenance(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    const note = normalizeText(filter.note);
    const beforePressure = listMaintenancePressureEntries({
      missionId: filter.missionId,
      owner: filter.owner,
      workspaceId: filter.workspaceId,
    });
    const sync = syncEscalations({
      missionId: filter.missionId,
      owner: filter.owner,
      status: 'open',
      workspaceId: filter.workspaceId,
    });
    const escalationReminders = remindEscalations({
      dueOnly: true,
      excludePendingOwnerHandoff: true,
      missionId: filter.missionId,
      note,
      owner: filter.owner,
      workspaceId: filter.workspaceId,
    });
    const ownerHandoffReminders = remindOwnerHandoffs(
      {
        dueOnly: true,
        missionId: filter.missionId,
        owner: filter.owner,
        workspaceId: filter.workspaceId,
      },
      note,
    );
    const providerAttentionReminders = remindProviderAttention(
      {
        dueOnly: true,
        missionId: filter.missionId,
        owner: filter.owner,
        workspaceId: filter.workspaceId,
      },
      note,
    );
    const specialistFollowUpReminders = remindSpecialistFollowUps(
      {
        dueOnly: true,
        missionId: filter.missionId,
        owner: filter.owner,
        workspaceId: filter.workspaceId,
      },
      note,
    );
    const afterPressure = listMaintenancePressureEntries({
      missionId: filter.missionId,
      owner: filter.owner,
      workspaceId: filter.workspaceId,
    });
    const preparedRun = prepareActionMaintenanceRun({
      afterPressure,
      beforePressure,
      createdAt: now(),
      escalationReminders,
      filter,
      id: createId('maintenance'),
      note,
      ownerHandoffReminders,
      providerAttentionReminders,
      specialistFollowUpReminders,
      syncSummary: sync.summary,
    });
    const maintenanceRun = store.saveMaintenanceRun(preparedRun.record);
    const summary = preparedRun.summary;
    const maintenanceOverviewRuns = listMaintenanceOverviewRuns({
      missionId: filter.missionId,
      owner: filter.owner,
      workspaceId: filter.workspaceId,
    });
    const maintenanceMonthlyBuckets = buildMaintenanceMonthlyBuckets(maintenanceOverviewRuns);
    const maintenanceLatestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(maintenanceMonthlyBuckets);

    summary.maintenanceMonthlyBucketCount = maintenanceMonthlyBuckets.length;
    summary.maintenanceLatestMonthlyBucketStartDate = maintenanceMonthlyBuckets[0]?.monthStartDate || null;
    summary.maintenanceOldestMonthlyBucketStartDate = maintenanceMonthlyBuckets.at(-1)?.monthStartDate || null;
    summary.maintenanceLatestMonthlyBucketDelta = maintenanceLatestMonthlyBucketDelta;

    return {
      escalationReminders,
      filters: {
        missionId: filter.missionId || null,
        note: note || null,
        owner: filter.owner || null,
        workspaceId: filter.workspaceId || null,
      },
      maintenanceRun,
      ownerHandoffReminders,
      providerAttentionReminders,
      specialistFollowUpReminders,
      summary,
      sync,
    };
  }

  function getMaintenanceOverview(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.outcome && !MAINTENANCE_RUN_OUTCOMES.includes(filter.outcome)) {
      throw new Error(`Unsupported maintenance run outcome: ${filter.outcome}`);
    }
    const since = normalizeTimestampFilter(filter.since, 'maintenance since timestamp');

    const items = listMaintenanceOverviewRuns({
      ...filter,
      since,
    });
    const current = listMaintenancePressureEntries(filter);
    const dailyBuckets = buildMaintenanceDailyBuckets(items);
    const weeklyBuckets = buildMaintenanceWeeklyBuckets(items);
    const monthlyBuckets = buildMaintenanceMonthlyBuckets(items);
    const latestBucketDelta = buildMaintenanceLatestBucketDelta(dailyBuckets);
    const latestWeeklyBucketDelta = buildMaintenanceLatestWeeklyBucketDelta(weeklyBuckets);
    const latestMonthlyBucketDelta = buildMaintenanceLatestMonthlyBucketDelta(monthlyBuckets);
    const missionImpactSummary = filter.missionId ? summarizeMissionMaintenanceImpact(filter.missionId, items) : null;

    return {
      current,
      filters: {
        missionId: filter.missionId || null,
        outcome: filter.outcome || null,
        owner: filter.owner || null,
        since: since || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        ...summarizeMaintenanceRuns(items),
        ...summarizeMaintenancePressure(current),
        bucketCount: dailyBuckets.length,
        dailyBuckets,
        latestBucketDate: dailyBuckets[0]?.date || null,
        latestBucketDelta,
        latestMonthlyBucketDelta,
        latestWeeklyBucketDelta,
        latestMonthlyBucketStartDate: monthlyBuckets[0]?.monthStartDate || null,
        oldestBucketDate: dailyBuckets.at(-1)?.date || null,
        oldestMonthlyBucketStartDate: monthlyBuckets.at(-1)?.monthStartDate || null,
        oldestWeeklyBucketStartDate: weeklyBuckets.at(-1)?.weekStartDate || null,
        monthlyBucketCount: monthlyBuckets.length,
        monthlyBuckets,
        weeklyBucketCount: weeklyBuckets.length,
        weeklyBuckets,
        latestWeeklyBucketStartDate: weeklyBuckets[0]?.weekStartDate || null,
        ...(missionImpactSummary
          ? {
              latestMissionImpactRun: missionImpactSummary.latestRun,
              latestMissionImpactRunAt: missionImpactSummary.latestRunAt,
              missionImpactEscalationRemindedCountTotal: missionImpactSummary.escalationRemindedCountTotal,
              missionImpactOwnerHandoffRemindedCountTotal: missionImpactSummary.ownerHandoffRemindedCountTotal,
              missionImpactProviderAttentionRemindedCountTotal:
                missionImpactSummary.providerAttentionRemindedCountTotal,
              missionImpactSpecialistFollowUpRemindedCountTotal:
                missionImpactSummary.specialistFollowUpRemindedCountTotal,
              missionImpactRunCount: missionImpactSummary.runCount,
              missionImpactTotalRemindedCount: missionImpactSummary.totalRemindedCount,
            }
          : {}),
      },
    };
  }

  function getOwnerHandoffInbox(filter = {}) {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }
    if (filter.status && !['pending', 'acknowledged'].includes(filter.status)) {
      throw new Error(`Unsupported owner handoff status: ${filter.status}`);
    }

    syncEscalations({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });

    const effectiveStatus = filter.status || 'pending';
    const items = store
      .listEscalations({
        missionId: filter.missionId,
        workspaceId: filter.workspaceId,
      })
      .map((item) => enrichEscalation(item))
      .filter((item) => {
        if (filter.owner) {
          const targetOwner =
            (effectiveStatus === 'pending' ? item.latestOwnerTransition?.to : item.latestOwnerHandoff?.owner) ||
            item.effectiveRecommendedOwner;
          if (targetOwner !== filter.owner) {
            return false;
          }
        }

        if (effectiveStatus === 'pending') {
          return item.pendingOwnerHandoff;
        }

        return !item.pendingOwnerHandoff && item.ownerHandoffCount > 0;
      })
      .map((item) => {
        const latestOwnerTransition = item.latestOwnerTransition;
        const latestOwnerHandoff = item.latestOwnerHandoff;
        const targetOwner =
          (effectiveStatus === 'pending' ? latestOwnerTransition?.to : latestOwnerHandoff?.owner) ||
          item.effectiveRecommendedOwner;
        const handoffDueAt = effectiveStatus === 'pending' ? item.ownerHandoffDueAt : latestOwnerHandoff?.dueAt || null;
        const handoffIsOverdue =
          effectiveStatus === 'pending' ? item.ownerHandoffIsOverdue : Boolean(latestOwnerHandoff?.wasOverdue);
        const handoffSlaHours =
          effectiveStatus === 'pending'
            ? item.ownerHandoffSlaHours
            : latestOwnerHandoff?.slaHours || deriveOwnerHandoffSlaHours(targetOwner);
        const handoffLatestReminderAt = item.latestOwnerHandoffReminderAt;
        const handoffNeedsReminder = effectiveStatus === 'pending' ? item.ownerHandoffNeedsReminder : false;
        const handoffNextReminderAt = effectiveStatus === 'pending' ? item.nextOwnerHandoffReminderAt : null;
        const handoffReminderCadenceHours = item.ownerHandoffReminderCadenceHours;
        const handoffReminderCount = item.ownerHandoffReminderCount;

        return {
          escalationId: item.id,
          handoffDueAt,
          handoffIsOverdue,
          handoffLatestReminderAt,
          handoffNeedsReminder,
          handoffNextReminderAt,
          handoffReminderCadenceHours,
          handoffReminderCount,
          handoffSlaHours,
          handoffStatus: effectiveStatus,
          latestOwnerHandoffAt: item.latestOwnerHandoffAt,
          ownerHandoffCount: item.ownerHandoffCount,
          ownerTransitionAt: latestOwnerTransition?.at || null,
          ownerTransitionDetail: latestOwnerTransition ? formatEscalationOwnerChangeDetail(latestOwnerTransition) : null,
          ownerTransitionTo: latestOwnerTransition?.to || null,
          ownerTransitionFrom: latestOwnerTransition?.from || null,
          pendingOwnerHandoff: item.pendingOwnerHandoff,
          recommendedCommand:
            effectiveStatus === 'pending'
              ? `node src/cli.mjs action acknowledge-owner-handoff ${item.id} --note "<note>"`
              : null,
          sessionId: item.sessionId,
          title: item.title,
          workspaceId: item.workspaceId,
          workspaceName: item.workspaceName,
          missionId: item.missionId,
          targetOwner,
          lastHandoffNote: latestOwnerHandoff?.note || null,
        };
      })
      .filter((item) => !filter.needsReminderOnly || item.handoffNeedsReminder)
      .filter((item) => !filter.overdueOnly || item.handoffIsOverdue)
      .sort((left, right) =>
        String(left.handoffDueAt || left.ownerTransitionAt || left.latestOwnerHandoffAt || '').localeCompare(
          String(right.handoffDueAt || right.ownerTransitionAt || right.latestOwnerHandoffAt || ''),
        ),
      );

    const ownerCounts = {};
    for (const item of items) {
      ownerCounts[item.targetOwner] = (ownerCounts[item.targetOwner] || 0) + 1;
    }

    return {
      filters: {
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        status: effectiveStatus,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        nextDueAt:
          items
            .map((item) => item.handoffDueAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null,
        nextReminderAt:
          items
            .map((item) => item.handoffNextReminderAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(0) || null,
        needsReminderCount: items.filter((item) => item.handoffNeedsReminder).length,
        ownerCounts,
        overdueCount: items.filter((item) => item.handoffIsOverdue).length,
        pendingCount: items.filter((item) => item.handoffStatus === 'pending').length,
        reminderCountTotal: items.reduce((count, item) => count + Number(item.handoffReminderCount || 0), 0),
        total: items.length,
      },
    };
  }

  function summarizeProviderAttentionItems(items) {
    const eventFamilyCounts = { execution: 0, probe: 0 };
    const providerCounts = {};
    const statusCounts = { acknowledged: 0, pending: 0, recovered: 0, resolved: 0, total: items.length };
    const overdueProviderIds = new Set();
    const workspaceCounts = {};
    let latestAcknowledgedAt = null;
    let latestDueAt = null;
    let latestReminderAt = null;
    let latestPendingAt = null;
    let latestRecoveredAt = null;
    let nextDueAt = null;
    let nextReminderAt = null;
    let latestResolvedAt = null;
    let needsReminderCount = 0;
    let overdueCount = 0;
    let reminderCountTotal = 0;
    const attemptSummary = summarizeAttemptMetrics(items);

    for (const item of items) {
      providerCounts[item.providerId] = (providerCounts[item.providerId] || 0) + 1;
      if (item.workspaceId) {
        workspaceCounts[item.workspaceId] = (workspaceCounts[item.workspaceId] || 0) + 1;
      }
      if (eventFamilyCounts[item.eventFamily] !== undefined) {
        eventFamilyCounts[item.eventFamily] += 1;
      }
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status] += 1;
      }
      if (item.status === 'pending' && (!latestPendingAt || String(latestPendingAt) < String(item.createdAt || ''))) {
        latestPendingAt = item.createdAt || null;
      }
      if (
        item.status === 'recovered' &&
        item.recoveredAt &&
        (!latestRecoveredAt || String(latestRecoveredAt) < String(item.recoveredAt))
      ) {
        latestRecoveredAt = item.recoveredAt;
      }
      if (item.dueAt && (!latestDueAt || String(latestDueAt) < String(item.dueAt))) {
        latestDueAt = item.dueAt;
      }
      if (item.dueAt && (!nextDueAt || String(nextDueAt) > String(item.dueAt))) {
        nextDueAt = item.dueAt;
      }
      if (item.isOverdue) {
        overdueCount += 1;
        if (item.providerId) {
          overdueProviderIds.add(item.providerId);
        }
      }
      reminderCountTotal += Number(item.reminderCount || 0);
      if (item.needsReminder) {
        needsReminderCount += 1;
      }
      if (
        item.latestReminderAt &&
        (!latestReminderAt || String(latestReminderAt) < String(item.latestReminderAt))
      ) {
        latestReminderAt = item.latestReminderAt;
      }
      if (
        item.nextReminderAt &&
        (!nextReminderAt || String(nextReminderAt) > String(item.nextReminderAt))
      ) {
        nextReminderAt = item.nextReminderAt;
      }
      if (
        item.status === 'acknowledged' &&
        item.acknowledgedAt &&
        (!latestAcknowledgedAt || String(latestAcknowledgedAt) < String(item.acknowledgedAt))
      ) {
        latestAcknowledgedAt = item.acknowledgedAt;
      }
      if (
        item.status === 'resolved' &&
        item.resolvedAt &&
        (!latestResolvedAt || String(latestResolvedAt) < String(item.resolvedAt))
      ) {
        latestResolvedAt = item.resolvedAt;
      }
    }

    return {
      eventFamilyCounts,
      latestAcknowledgedAt,
      latestDueAt,
      latestItem: items.at(-1) || null,
      latestPendingAt,
      latestRecoveredAt,
      latestReminderAt,
      latestResolvedAt,
      needsReminderCount,
      nextDueAt,
      nextReminderAt,
      overdueCount,
      overdueProviderIds: [...overdueProviderIds].sort((left, right) => String(left).localeCompare(String(right))),
      providerCounts,
      reminderCountTotal,
      retryCountTotal: attemptSummary.totalRetryCount,
      totalRetryCount: attemptSummary.totalRetryCount,
      totalAttemptCount: attemptSummary.totalAttemptCount,
      maxAttemptCount: attemptSummary.maxAttemptCount || null,
      multiAttemptCount: attemptSummary.multiAttemptCount,
      attemptHistoryEntryCountTotal: attemptSummary.attemptHistoryEntryCountTotal,
      statusCounts,
      total: items.length,
      workspaceCounts,
    };
  }

  function getProviderAttentionInbox(filter = {}) {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.status && !PROVIDER_ATTENTION_STATUSES.includes(filter.status)) {
      throw new Error(`Unsupported provider attention status: ${filter.status}`);
    }

    const effectiveStatus = filter.status || 'pending';
    const items =
      effectiveStatus === 'acknowledged'
        ? buildProviderAttentionAcknowledgedItems(filter)
        : effectiveStatus === 'recovered'
          ? buildProviderAttentionRecoveredItems(filter)
        : effectiveStatus === 'resolved'
          ? buildProviderAttentionResolvedItems(filter)
          : buildProviderAttentionPendingItems(filter);
    const filteredItems = items
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue);

    return {
      filters: {
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        status: effectiveStatus,
        workspaceId: filter.workspaceId || null,
      },
      items: filteredItems,
      summary: summarizeProviderAttentionItems(filteredItems),
    };
  }

  function getProviderHealthDriftInbox(filter = {}) {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }

    const items = buildProviderHealthDriftActionItems(filter).filter((item) => !filter.overdueOnly || item.isOverdue);

    return {
      filters: {
        missionId: filter.missionId || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeProviderHealthDriftItems(items),
    };
  }

  function getSpecialistFollowUpInbox(filter = {}) {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.status && !['blocked', 'failed'].includes(filter.status)) {
      throw new Error(`Unsupported specialist follow-up status: ${filter.status}`);
    }

    const items = buildSpecialistFollowUpItems(filter)
      .filter((item) => !filter.status || item.status === filter.status)
      .filter((item) => !filter.needsReminderOnly || item.needsReminder)
      .filter((item) => !filter.overdueOnly || item.isOverdue);

    return {
      filters: {
        missionId: filter.missionId || null,
        needsReminderOnly: Boolean(filter.needsReminderOnly),
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        status: filter.status || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: summarizeSpecialistFollowUpItems(items),
    };
  }

  function remindSpecialistFollowUps(filter = {}, note = '') {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.status && !['blocked', 'failed'].includes(filter.status)) {
      throw new Error(`Unsupported specialist follow-up status: ${filter.status}`);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    const reminderTimestamp = now();
    const normalizedNote = normalizeText(note);
    const candidates = buildSpecialistFollowUpItems({
      missionId: filter.missionId,
      needsReminderOnly: Boolean(filter.dueOnly),
      overdueOnly: Boolean(filter.overdueOnly),
      providerId: filter.providerId,
      workspaceId: filter.workspaceId,
    })
      .filter((item) => !filter.status || item.status === filter.status)
      .filter((item) => !filter.owner || item.recommendedOwner === filter.owner);

    const items = candidates
      .map((item) =>
        store.saveSpecialistFollowUpReminder(
          buildSpecialistFollowUpReminderRecord({
            id: createId('specialist-follow-up-reminder'),
            item,
            note: normalizedNote,
            remindedAt: reminderTimestamp,
          }),
        ),
      )
      .map((record) => ({
        ...record,
        detail: formatSpecialistFollowUpReminderDetail(record),
      }))
      .sort((left, right) =>
        String(left.remindedAt || left.createdAt || '').localeCompare(String(right.remindedAt || right.createdAt || '')),
      );
    const remindedSummary = summarizeSpecialistFollowUpItems(
      items.map((item) => ({
        isOverdue: Boolean(item.overdue),
        providerId: item.providerId || null,
        reminderCount: 1,
        remediationRoute: item.remediationRoute || null,
        retryPolicy: item.retryPolicy || null,
        specialistKind: item.specialistKind,
        status: item.status,
        workspaceId: item.workspaceId || null,
      })),
    );

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        missionId: filter.missionId || null,
        note: normalizedNote || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        status: filter.status || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        dueCandidateCount: candidates.filter((item) => item.needsReminder).length,
        latestReminderAt:
          [...items]
            .map((item) => item.remindedAt || item.createdAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(-1) || null,
        overdueReminderCount: items.filter((item) => item.overdue).length,
        providerCounts: remindedSummary.providerCounts,
        remediationRouteCounts: remindedSummary.remediationRouteCounts,
        remindedCount: items.length,
        retryPolicyCounts: remindedSummary.retryPolicyCounts,
        specialistKindCounts: remindedSummary.specialistKindCounts,
        statusCounts: remindedSummary.statusCounts,
        workspaceCounts: remindedSummary.workspaceCounts,
      },
    };
  }

  function remindProviderAttention(filter = {}, note = '') {
    if (filter.providerId) {
      providerRegistry.getProviderStatus(filter.providerId);
    }
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    const reminderTimestamp = now();
    const normalizedNote = normalizeText(note);
    const candidates = buildProviderAttentionPendingItems({
      missionId: filter.missionId,
      needsReminderOnly: Boolean(filter.dueOnly),
      overdueOnly: Boolean(filter.overdueOnly),
      providerId: filter.providerId,
      workspaceId: filter.workspaceId,
    }).filter((item) => !filter.owner || item.recommendedOwner === filter.owner);

    const items = candidates
      .map((item) =>
        store.saveProviderAttentionReminder(
          buildProviderAttentionReminderRecord({
            id: createId('provider-attention-reminder'),
            item,
            note: normalizedNote,
            remindedAt: reminderTimestamp,
          }),
        ),
      )
      .map((record) => ({
        ...record,
        detail: formatProviderAttentionReminderDetail(record),
      }))
      .sort((left, right) => String(left.remindedAt || left.createdAt || '').localeCompare(String(right.remindedAt || right.createdAt || '')));

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        missionId: filter.missionId || null,
        note: normalizedNote || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        providerId: filter.providerId || null,
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        dueCandidateCount: candidates.filter((item) => item.needsReminder).length,
        latestReminderAt:
          [...items]
            .map((item) => item.remindedAt || item.createdAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(-1) || null,
        overdueReminderCount: items.filter((item) => item.overdue).length,
        reminderCountTotal: items.length,
        remindedCount: items.length,
      },
    };
  }

  function remindOwnerHandoffs(filter = {}, note = '') {
    if (filter.workspaceId) {
      getWorkspace(filter.workspaceId);
    }
    if (filter.missionId) {
      getMission(filter.missionId);
    }
    if (filter.owner && !ACTION_OWNERS.includes(filter.owner)) {
      throw new Error(`Unsupported action owner: ${filter.owner}`);
    }

    syncEscalations({
      missionId: filter.missionId,
      workspaceId: filter.workspaceId,
    });

    const reminderTimestamp = now();
    const candidates = store
      .listEscalations({
        missionId: filter.missionId,
        status: 'open',
        workspaceId: filter.workspaceId,
      })
      .map((item) => enrichEscalation(item))
      .filter((item) => item.pendingOwnerHandoff)
      .filter((item) => !filter.owner || item.ownerHandoffTargetOwner === filter.owner)
      .filter((item) => !filter.dueOnly || item.ownerHandoffNeedsReminder)
      .filter((item) => !filter.overdueOnly || item.ownerHandoffIsOverdue);

    const items = candidates
      .map((item) =>
        store.updateEscalation(item.id, (current) => {
          const normalizedCurrent = enrichEscalation(current);
          const reminderEntry = {
            at: reminderTimestamp,
            dueAt: normalizedCurrent.ownerHandoffDueAt,
            note: buildOwnerHandoffReminderNote(normalizedCurrent, note),
            owner: normalizedCurrent.ownerHandoffTargetOwner || normalizedCurrent.effectiveRecommendedOwner,
            overdue: normalizedCurrent.ownerHandoffIsOverdue,
            reminderCadenceHours: normalizedCurrent.ownerHandoffReminderCadenceHours,
            slaHours: normalizedCurrent.ownerHandoffSlaHours,
            transitionAt: normalizedCurrent.latestOwnerTransition?.at || null,
            transitionTo: normalizedCurrent.ownerHandoffTargetOwner || normalizedCurrent.effectiveRecommendedOwner,
          };

          return {
            ...current,
            lastOwnerHandoffReminderAt: reminderTimestamp,
            ownerHandoffReminderHistory: [...normalizedCurrent.ownerHandoffReminderHistory, reminderEntry],
            updatedAt: reminderTimestamp,
          };
        }),
      )
      .map((item) => enrichEscalation(item))
      .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));

    return {
      filters: {
        dueOnly: Boolean(filter.dueOnly),
        missionId: filter.missionId || null,
        note: note || null,
        owner: filter.owner || null,
        overdueOnly: Boolean(filter.overdueOnly),
        workspaceId: filter.workspaceId || null,
      },
      items,
      summary: {
        dueCandidateCount: candidates.filter((item) => item.ownerHandoffNeedsReminder).length,
        latestReminderAt:
          [...items]
            .map((item) => item.latestOwnerHandoffReminderAt)
            .filter(Boolean)
            .sort((left, right) => String(left).localeCompare(String(right)))
            .at(-1) || null,
        overdueReminderCount: items.filter((item) => item.ownerHandoffIsOverdue).length,
        reminderCountTotal: items.reduce((count, item) => count + Number(item.ownerHandoffReminderCount || 0), 0),
        remindedCount: items.length,
      },
    };
  }

  function acknowledgeProviderAttention(actionId, { note = '' }) {
    const pendingItem = buildProviderAttentionPendingItems({}).find((item) => item.actionId === actionId);
    if (!pendingItem) {
      throw new Error(`Provider attention item not found or no longer pending: ${actionId}`);
    }

    const acknowledgedAt = now();
    return store.saveProviderAttentionAcknowledgement(
      buildProviderAttentionAcknowledgementRecord({
        acknowledgedAt,
        id: createId('provider-attention-ack'),
        note,
        pendingItem,
      }),
    );
  }

  function resolveProviderAttention(actionId, { note = '' }) {
    const record = store.listProviderAttentionAcknowledgements({ actionId }).at(-1) || null;
    if (!record) {
      throw new Error(`Provider attention acknowledgement not found: ${actionId}`);
    }
    if ((record.status || 'acknowledged') === 'resolved') {
      throw new Error(`Provider attention already resolved: ${actionId}`);
    }

    const resolvedAt = now();
    return store.updateProviderAttentionAcknowledgement(record.id, (current) =>
      buildResolvedProviderAttentionRecord({ current, note, resolvedAt }),
    );
  }

  function summarizeProviderAttentionScopedState(filter = {}) {
    const pendingItems = buildProviderAttentionPendingItems(filter);
    const acknowledgedItems = buildProviderAttentionAcknowledgedItems(filter);
    const recoveredItems = buildProviderAttentionRecoveredItems(filter);
    const resolvedItems = buildProviderAttentionResolvedItems(filter);
    let status = 'clear';

    if (pendingItems.length) {
      status = 'pending';
    } else if (acknowledgedItems.length) {
      status = 'acknowledged';
    } else if (recoveredItems.length) {
      status = 'recovered';
    } else if (resolvedItems.length) {
      status = 'resolved';
    }

    return {
      acknowledgedCount: acknowledgedItems.length,
      latestAcknowledgedActionId: acknowledgedItems.at(-1)?.actionId || null,
      latestPendingActionId: pendingItems.at(-1)?.actionId || null,
      latestRecoveredActionId: recoveredItems.at(-1)?.actionId || null,
      latestResolvedActionId: resolvedItems.at(-1)?.actionId || null,
      pendingCount: pendingItems.length,
      recoveredCount: recoveredItems.length,
      resolvedCount: resolvedItems.length,
      status,
    };
  }

  function getProviderAttentionActionState(actionId) {
    const pendingItem = buildProviderAttentionPendingItems({}).find((item) => item.actionId === actionId);
    if (pendingItem) {
      return {
        item: pendingItem,
        status: 'pending',
      };
    }

    const acknowledgedItem = buildProviderAttentionAcknowledgedItems({}).find((item) => item.actionId === actionId);
    if (acknowledgedItem) {
      return {
        item: acknowledgedItem,
        status: 'acknowledged',
      };
    }

    const recoveredItem = buildProviderAttentionRecoveredItems({}).find((item) => item.actionId === actionId);
    if (recoveredItem) {
      return {
        item: recoveredItem,
        status: 'recovered',
      };
    }

    const resolvedItem = buildProviderAttentionResolvedItems({}).find((item) => item.actionId === actionId);
    if (resolvedItem) {
      return {
        item: resolvedItem,
        status: 'resolved',
      };
    }

    return null;
  }

  async function remediateProviderAttention(actionId, options = {}) {
    const actionState = getProviderAttentionActionState(actionId);
    if (!actionState) {
      throw new Error(`Provider attention item not found: ${actionId}`);
    }
    if (['resolved', 'recovered'].includes(actionState.status)) {
      throw new Error(`Provider attention is already closed: ${actionId}`);
    }

    const attentionItem = actionState.item;
    const fallbackProvider = normalizeText(options.fallbackProvider);
    const explicitFallbackPolicy = normalizeText(options.fallbackPolicy);
    let fallbackPolicy = null;
    let remediationKind = '';
    let result = null;

    if (attentionItem.eventFamily === 'probe') {
      if (fallbackProvider) {
        throw new Error('--fallback-provider is only supported for provider execution attention remediation.');
      }
      if (explicitFallbackPolicy) {
        throw new Error('--fallback-policy is only supported for provider execution attention remediation.');
      }

      remediationKind = 'probe';
      const probe = await probeProvider(attentionItem.providerId);
      result = {
        attempted: Boolean(probe.attempted),
        attemptCount: Number(probe.attemptCount || 0),
        checkedAt: probe.checkedAt || null,
        failureKind: normalizeText(probe.failureKind) ? normalizeProviderFailureKind(probe.failureKind) : null,
        ok: Boolean(probe.ok),
        probeId: probe.probeId || null,
        providerId: probe.id,
        reason: probe.reason || '',
        retryCount: Number(probe.retryCount || 0),
      };
    } else if (attentionItem.eventFamily === 'execution') {
      if (!attentionItem.missionId) {
        throw new Error(`Provider execution attention is missing mission context: ${actionId}`);
      }
      if (explicitFallbackPolicy && !fallbackProvider) {
        throw new Error('--fallback-policy requires --fallback-provider for provider execution attention remediation.');
      }

      if (fallbackProvider) {
        fallbackPolicy = normalizeProviderFallbackPolicy(
          explicitFallbackPolicy || attentionItem.fallbackPolicyId || 'provider-failure-only',
        );
      }
      remediationKind = fallbackProvider ? 'mission-fallback-rerun' : 'mission-rerun';
      const rerun = await runMission(attentionItem.missionId, {
        ...(fallbackProvider
          ? {
              fallbackProvider,
              fallbackPolicy,
            }
          : {}),
        provider: attentionItem.providerId,
        providerSpecified: true,
      });
      result = {
        approvalId: rerun.approval?.id || null,
        artifactPath: rerun.artifactPath || null,
        missionId: rerun.mission.id,
        missionStatus: rerun.mission.status,
        provider: rerun.provider,
        providerFallback: rerun.providerFallback || null,
        reviewerVerdict: rerun.reviewerVerdict || null,
        sessionId: rerun.session?.id || null,
      };
    } else {
      throw new Error(`Unsupported provider attention event family: ${attentionItem.eventFamily}`);
    }

    const permissionDecision = buildProviderAttentionRemediationPermissionDecision({
      actionId,
      at: now(),
      attentionItem,
      fallbackPolicy,
      fallbackProvider,
      remediationKind,
    });

    return {
      actionId,
      eventFamily: attentionItem.eventFamily,
      fallbackPolicy: attentionItem.eventFamily === 'execution' ? fallbackPolicy : null,
      missionId: attentionItem.missionId || null,
      permissionDecision,
      permissionDecisionId: permissionDecision.id,
      postAttention: summarizeProviderAttentionScopedState({
        missionId: attentionItem.missionId || null,
        providerId: attentionItem.providerId,
        workspaceId: attentionItem.workspaceId || null,
      }),
      previousStatus: actionState.status,
      primaryProviderId: attentionItem.providerId,
      providerId: attentionItem.providerId,
      remediationKind,
      result,
      workspaceId: attentionItem.workspaceId || null,
    };
  }

  async function remediateSpecialistFollowUp(actionId) {
    const actionState = getSpecialistFollowUpActionState(actionId);
    if (!actionState) {
      throw new Error(`Specialist follow-up item not found: ${actionId}`);
    }

    const followUpItem = actionState.item;
    if (!followUpItem.missionId) {
      throw new Error(`Specialist follow-up is missing mission context: ${actionId}`);
    }

    const providerId = normalizeText(followUpItem.providerId, 'stub');
    const rerun = await runMission(followUpItem.missionId, {
      provider: providerId,
      providerSpecified: true,
    });
    const latestParallelGroup = getLatestParallelGroupState(followUpItem.missionId);

    return {
      actionId,
      missionId: followUpItem.missionId,
      parallelGroupId: followUpItem.parallelGroupId || null,
      postFollowUp: summarizeSpecialistFollowUpScopedState({
        missionId: followUpItem.missionId,
        parallelGroupId: followUpItem.parallelGroupId || null,
        providerId,
      }),
      previousStatus: actionState.status,
      providerId,
      fallbackRecommendedCommand: followUpItem.fallbackRecommendedCommand || null,
      recommendedCommand: followUpItem.recommendedCommand || null,
      remediationKind: 'mission-rerun',
      remediationRoute: followUpItem.remediationRoute || null,
      result: {
        approvalId: rerun.approval?.id || null,
        artifactPath: rerun.artifactPath || null,
        missionId: rerun.mission.id,
        missionStatus: rerun.mission.status,
        parallelGroupId: latestParallelGroup?.parallelGroupId || null,
        provider: rerun.provider,
        reviewerVerdict: rerun.reviewerVerdict || null,
        sessionId: rerun.session?.id || null,
      },
      retryPolicy: followUpItem.retryPolicy || null,
      specialistKind: followUpItem.specialistKind,
      workspaceId: followUpItem.workspaceId || null,
    };
  }

  function acknowledgeOwnerHandoff(escalationId, { note = '' }) {
    const escalation = store.getEscalation(escalationId);
    if (!escalation) {
      throw new Error(`Escalation not found: ${escalationId}`);
    }

    const normalizedEscalation = enrichEscalation(escalation);
    if (!normalizedEscalation.pendingOwnerHandoff || !normalizedEscalation.latestOwnerTransition) {
      throw new Error(`Escalation ${escalationId} does not have a pending owner handoff.`);
    }

    const acknowledgedAt = now();
    const handoffEntry = {
      at: acknowledgedAt,
      dueAt: normalizedEscalation.ownerHandoffDueAt,
      note: normalizeText(note, 'Owner handoff acknowledged.'),
      owner: normalizedEscalation.latestOwnerTransition.to,
      slaHours: normalizedEscalation.ownerHandoffSlaHours,
      transitionAt: normalizedEscalation.latestOwnerTransition.at,
      transitionTo: normalizedEscalation.latestOwnerTransition.to,
      wasOverdue: normalizedEscalation.ownerHandoffIsOverdue,
    };

    const updated = store.updateEscalation(escalationId, (current) => {
      const currentEscalation = enrichEscalation(current);
      return {
        ...current,
        lastOwnerHandoffAt: acknowledgedAt,
        ownerHandoffHistory: [...currentEscalation.ownerHandoffHistory, handoffEntry],
        updatedAt: acknowledgedAt,
      };
    });

    return enrichEscalation(updated);
  }

  function openAcceptedRiskEscalation(followUp, resolutionNote) {
    const actionId = `accepted-risk:${followUp.actionId}`;
    const currentTimestamp = now();
    const existingOpenEscalation =
      store
        .listEscalations({
          actionId,
          status: 'open',
        })
        .at(-1) || null;

    if (existingOpenEscalation) {
      return store.updateEscalation(existingOpenEscalation.id, (current) => ({
        ...current,
        dueAt: new Date(new Date(currentTimestamp).getTime() + 72 * 60 * 60 * 1000).toISOString(),
        escalationRule: 'Track the accepted risk until a deliberate close or replacement plan is recorded.',
        incidentPath: current.incidentPath || null,
        incidentTitle: current.incidentTitle || null,
        isOverdue: false,
        lastSeenAt: currentTimestamp,
        priority: 'medium',
        reason: resolutionNote,
        recommendedCommand: current.recommendedCommand,
        recommendedOwner: 'workspace-owner',
        sourceResolutionKind: 'accepted-risk',
        sourceReviewerFollowUpActionId: followUp.actionId,
        title: formatAcceptedRiskEscalationTitle(followUp.missionTitle),
        updatedAt: currentTimestamp,
      }));
    }

    const escalationId = createId('escalation');
    return store.saveEscalation({
      id: escalationId,
      actionId,
      actionClass: 'accepted-risk-monitoring',
      actionType: 'reviewer-accepted-risk',
      dueAt: new Date(new Date(currentTimestamp).getTime() + 72 * 60 * 60 * 1000).toISOString(),
      escalationRule: 'Track the accepted risk until a deliberate close or replacement plan is recorded.',
      incidentPath: null,
      incidentTitle: null,
      isOverdue: false,
      lastSeenAt: currentTimestamp,
      missionId: followUp.missionId,
      priority: 'medium',
      reason: resolutionNote,
      recommendedCommand: `node src/cli.mjs action resolve-escalation ${escalationId} --note "<note>"`,
      recommendedOwner: 'workspace-owner',
      resolutionNote: '',
      resolvedAt: null,
      sessionId: followUp.sessionId,
      sourceResolutionKind: 'accepted-risk',
      sourceReviewerFollowUpActionId: followUp.actionId,
      status: 'open',
      title: formatAcceptedRiskEscalationTitle(followUp.missionTitle),
      workspaceId: followUp.workspaceId,
      workspaceName: followUp.workspaceName,
      reminderCount: 0,
      reminderHistory: [],
      lastReminderAt: null,
      createdAt: currentTimestamp,
      updatedAt: currentTimestamp,
    });
  }

  function resolveReviewerFollowUp(actionId, { kind = '', note = '' }) {
    const followUp = ensureReviewerFollowUpRecord(actionId);
    if (followUp.status !== 'open') {
      throw new Error(`Reviewer follow-up ${actionId} is already resolved.`);
    }

    const resolutionKind = normalizeText(kind, 'accepted-risk');
    if (!REVIEWER_FOLLOW_UP_RESOLUTION_KINDS.includes(resolutionKind)) {
      throw new Error(`Unsupported reviewer follow-up resolution kind: ${resolutionKind}`);
    }
    const resolutionNote = normalizeText(note, 'Resolved without additional note.');
    const resolvedFollowUp = store.updateReviewerFollowUp(followUp.id, (current) => ({
      ...current,
      resolutionKind,
      resolutionNote,
      resolvedAt: now(),
      status: 'resolved',
      updatedAt: now(),
    }));

    const mission = getMission(resolvedFollowUp.missionId);
    harness.addMemoryEntry({
      scope: 'mission',
      scopeId: mission.id,
      kind: 'decision',
      content: formatReviewerFollowUpResolutionMemory({
        mission,
        note: resolutionNote,
        resolutionKind,
      }),
    });

    let escalation = null;
    if (resolutionKind === 'accepted-risk') {
      escalation = openAcceptedRiskEscalation(resolvedFollowUp, resolutionNote);
    }

    return {
      escalation,
      followUp: resolvedFollowUp,
    };
  }

  function resolveEscalation(escalationId, { note = '' }) {
    const escalation = store.getEscalation(escalationId);
    if (!escalation) {
      throw new Error(`Escalation not found: ${escalationId}`);
    }
    if (escalation.status !== 'open') {
      throw new Error(`Escalation ${escalationId} is already resolved.`);
    }

    return store.updateEscalation(escalationId, (current) => ({
      ...current,
      resolutionNote: normalizeText(note, 'Resolved without additional note.'),
      resolvedAt: now(),
      status: 'resolved',
      updatedAt: now(),
    }));
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

  function buildProviderFallbackTimelineEvents({ mission, sessions }) {
    return sessions
      .filter((session) => session.sourceContext?.providerFallbackRequested)
      .map((session) => {
        const sourceContext = session.sourceContext || {};
        const attempt = Number.isFinite(Number(sourceContext.providerFallbackAttempt))
          ? Number(sourceContext.providerFallbackAttempt)
          : 1;
        const attemptCount = Number.isFinite(Number(sourceContext.providerFallbackAttemptCount))
          ? Number(sourceContext.providerFallbackAttemptCount)
          : 1;
        const primaryProviderId = normalizeText(sourceContext.providerFallbackPrimary) || session.provider;
        const fallbackPolicy = normalizeProviderFallbackPolicy(sourceContext.providerFallbackPolicy);
        const fallbackProviderIds = ensureArray(sourceContext.providerFallbackFallbacks)
          .map((providerId) => normalizeText(providerId))
          .filter(Boolean);
        const providerFailure = getSessionProviderFailureSummary(session.id);
        const isFallbackAttempt = attempt > 1;
        const policyDecision = evaluateProviderFallbackPolicy({
          isLastAttempt: attempt >= attemptCount,
          missionStatus: session.status,
          policyId: fallbackPolicy,
          providerFailure,
        });
        const nextProviderId =
          policyDecision.eligible && fallbackProviderIds[attempt - 1] ? fallbackProviderIds[attempt - 1] : null;
        const providerRouteDecision = buildProviderFallbackRouteDecision({
          attempt,
          attemptCount,
          fallbackEligible: policyDecision.eligible,
          fallbackProviderIds,
          mission,
          missionStatus: session.status,
          nextProviderId,
          policyId: policyDecision.policyId,
          primaryProviderId,
          providerFailure,
          providerId: session.provider,
          session,
          stopReason: policyDecision.reason,
          workspace: mission.workspaceId ? { id: mission.workspaceId } : null,
        });
        const stopReasonSuffix = !policyDecision.eligible
          ? ` fallbackStopReason=${policyDecision.reason}.`
          : ` fallbackPolicy=${policyDecision.policyId}; next provider eligible.`;
        const providerFailureSuffix = providerFailure
          ? ` providerFailure=${providerFailure.failureKind}; role=${providerFailure.role || 'unknown'}.`
          : '';
        const routeDecisionSuffix = providerRouteDecision.id
          ? ` providerRouteDecision=${providerRouteDecision.id}.`
          : '';
        const routeSummary = summarizeProviderRouteDecisionForTimeline(providerRouteDecision);

        return {
          at: session.endedAt || session.startedAt,
          attempt,
          attemptCount,
          detail: isFallbackAttempt
            ? `Provider fallback attempt ${attempt}/${attemptCount} used ${session.provider} after primary ${primaryProviderId}; status=${session.status}; policy=${fallbackPolicy}.${providerFailureSuffix}${stopReasonSuffix}${routeSummary ? ` ${routeSummary}.` : ''}${routeDecisionSuffix}`
            : `Provider fallback primary attempt ${attempt}/${attemptCount} used ${session.provider}; status=${session.status}; policy=${fallbackPolicy}.${providerFailureSuffix}${stopReasonSuffix}${routeSummary ? ` ${routeSummary}.` : ''}${routeDecisionSuffix}`,
          fallbackEligible: policyDecision.eligible,
          fallbackNextProviderId: nextProviderId,
          fallbackPolicy,
          fallbackProviderIds,
          fallbackStopReason: policyDecision.reason,
          gatewayEventId: sourceContext.gatewayEventId || null,
          gatewayEventRoute: sourceContext.gatewayEventRoute || sourceContext.route || null,
          gatewayPermissionDecisionId: sourceContext.gatewayPermissionDecisionId || null,
          gatewaySandboxDecisionId: sourceContext.gatewaySandboxDecisionId || null,
          kind: isFallbackAttempt ? 'provider-fallback-used' : 'provider-fallback-attempted',
          missionId: mission.id,
          primaryProviderId,
          providerFailure,
          providerFailureKind: providerFailure?.failureKind || null,
          providerId: session.provider,
          providerRouteDecision,
          providerRouteDecisionId: providerRouteDecision.id,
          providerRouteName: providerRouteDecision.action.route,
          sessionId: session.id,
          status: session.status,
          workspaceId: mission.workspaceId || null,
        };
      })
      .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
  }

  function buildProviderFallbackEventTimeline(filter = {}) {
    const workspaceById = new Map(store.listWorkspaces().map((workspace) => [workspace.id, workspace]));

    return store
      .listMissions()
      .filter((mission) => !filter.missionId || mission.id === filter.missionId)
      .filter((mission) => !filter.workspaceId || mission.workspaceId === filter.workspaceId)
      .flatMap((mission) => {
        const workspace = workspaceById.get(mission.workspaceId) || null;
        return buildProviderFallbackTimelineEvents({
          mission,
          sessions: store.listSessionsByMission(mission.id),
        }).map((event) => ({
          ...event,
          attempted: null,
          eventFamily: 'fallback',
          eventKind: event.kind,
          executionStatus: null,
          missionTitle: mission.title,
          ok: event.kind === 'provider-fallback-used' ? true : null,
          probeId: null,
          role: null,
          runId: null,
          workspaceName: workspace?.name || null,
        }));
      })
      .filter((event) => !filter.providerId || event.providerId === filter.providerId)
      .sort((left, right) => String(left.at || '').localeCompare(String(right.at || '')));
  }

  function summarizeMissionProviderFallback({ mission, sessions }) {
    const events = buildProviderFallbackTimelineEvents({
      mission,
      sessions,
    });
    const usedEvents = events.filter((event) => event.kind === 'provider-fallback-used');
    const fallbackPolicyCounts = {};
    const fallbackStopReasonCounts = {};
    const providerRouteDecisionPolicyCounts = {};
    const providerRouteDecisionRouteCounts = {};
    const providerRouteDecisionEvents = [];

    for (const event of events) {
      if (event.fallbackPolicy) {
        fallbackPolicyCounts[event.fallbackPolicy] = (fallbackPolicyCounts[event.fallbackPolicy] || 0) + 1;
      }
      if (event.fallbackStopReason) {
        fallbackStopReasonCounts[event.fallbackStopReason] =
          (fallbackStopReasonCounts[event.fallbackStopReason] || 0) + 1;
      }
      if (event.providerRouteDecision) {
        providerRouteDecisionEvents.push(event);
        const routeName = normalizeText(event.providerRouteDecision.action?.route || event.providerRouteName);
        if (routeName) {
          providerRouteDecisionRouteCounts[routeName] = (providerRouteDecisionRouteCounts[routeName] || 0) + 1;
        }
        const policyId = normalizeText(event.providerRouteDecision.policyId || event.fallbackPolicy);
        if (policyId) {
          providerRouteDecisionPolicyCounts[policyId] = (providerRouteDecisionPolicyCounts[policyId] || 0) + 1;
        }
      }
    }

    return {
      latestProviderFallbackEvent: getLatestItem(events, 'at'),
      latestProviderRouteDecisionEvent: getLatestItem(providerRouteDecisionEvents, 'at'),
      providerFallbackAttemptCount: events.length,
      providerFallbackPolicyCounts: fallbackPolicyCounts,
      providerFallbackPrimaryProviderIds: [...new Set(events.map((event) => event.primaryProviderId).filter(Boolean))],
      providerFallbackRequested: events.length > 0,
      providerFallbackStopReasonCounts: fallbackStopReasonCounts,
      providerFallbackUsedCount: usedEvents.length,
      providerFallbackUsedProviderIds: [...new Set(usedEvents.map((event) => event.providerId).filter(Boolean))],
      providerRouteDecisionCount: providerRouteDecisionEvents.length,
      providerRouteDecisionPolicyCounts,
      providerRouteDecisionRouteCounts,
    };
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
          sessionId: candidate.sessionId,
          status: candidate.status,
          target: promotionDecision.target,
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
      const metadata = ensureObject(approval.metadata);
      if (decision === 'approve') {
        const lease = harness.issueExecutionLease({
          approvalId: resolvedApproval.id,
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
          approval: resolvedApproval,
          execution: getExecutionStatus(mission.id).execution,
          lease,
          mission: executionReadyMission,
          resolutionArtifactPath: resolutionArtifact.path,
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
        approval: resolvedApproval,
        execution: getExecutionStatus(mission.id).execution,
        mission: reviewedMission,
        resolutionArtifactPath: resolutionArtifact.path,
        session: store.getSession(session.id),
      };
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
    addMemory,
    addMissionAttachment,
    addWorkspace,
    acknowledgeProviderAttention,
    browseMissionHarnessDocuments,
    browseMissionHarnessMemory,
    checkProvider,
    createMission,
    expireLearningPromotions,
    getActionInbox,
    getApprovalInbox,
    getGatewayEventAudit,
    getGlobalOperatorTimeline,
    getEscalatedInbox,
    getGlobalOverview,
    getIdentitySessionAudit,
    getLearningCandidateAudit,
    getLearningPromotionQueue,
    getMaintenanceOverview,
    getOrchestrationProfilesOverview,
    getOwnerHandoffInbox,
    getProviderAttentionInbox,
    getProviderHealthDriftInbox,
    getSpecialistFollowUpInbox,
    getProviderExecutionHistory,
    getProviderExecutionTimeline,
    getProviderEventTimeline,
    getProviderOverview,
    getProviderProbeTimeline,
    getReviewerFollowUpInbox,
    getChannelAdapter,
    getWorkspace,
    getWorkspaceOverview,
    getWorkspaceTimeline,
    getMissionTimeline,
    getExecutionLogs,
    getExecutionStatus,
    listApprovals,
    listChannelAdapters,
    listMemory,
    listFactGraph,
    listMissions,
    listMissionAttachments,
    listProviderProbeHistory,
    listProviders,
    listSessions,
    logOverdueActions,
    deleteDocumentLog,
    logDocument,
    migrateLegacyDocumentLogs,
    acknowledgeOwnerHandoff,
    deleteMemory,
    resolveProviderAttention,
    runActionMaintenance,
    remindEscalations,
    remindOwnerHandoffs,
    remindProviderAttention,
    remindLearningPromotionStopConditions,
    remindSpecialistFollowUps,
    syncEscalations,
    resolveEscalation,
    resolveApproval,
    resolveLearningPromotion,
    rollbackLearningPromotion,
    resolveReviewerFollowUp,
    probeProvider,
    remediateProviderAttention,
    remediateSpecialistFollowUp,
    runMission,
    preflightExecution,
    rollbackExecution,
    showMission,
    showSession,
    startExecution,
    stopExecution,
    updateDocumentLog,
    updateMemory,
  };
}
