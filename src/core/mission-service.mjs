import fs from 'node:fs';

import { createActionInbox } from './action-inbox.mjs';
import { createActionInboxService } from './action-inbox-service.mjs';
import { createActionMaintenanceService } from './action-maintenance-service.mjs';
import { createDocService } from './doc-service.mjs';
import { createDocumentLog } from './document-log.mjs';
import { createEscalationService } from './escalation-service.mjs';
import { createExecutionRuntimeService } from './execution-runtime-service.mjs';
import { createFactGraphService } from './fact-graph-service.mjs';
import { createFollowUpService } from './follow-up-service.mjs';
import { summarizeSpecialistFollowUpItems } from './follow-up-analytics.mjs';
import { createGatewayEventCoordinator } from './gateway-event-coordinator.mjs';
import { createLearningCandidateAudit } from './learning-candidate-audit.mjs';
import { createLearningCandidateEmitter } from './learning-candidate-emitter.mjs';
import { createLearningCandidateRuntimeService } from './learning-candidate-runtime-service.mjs';
import { createLearningPromotion } from './learning-promotion.mjs';
import { createMissionCatalogService } from './mission-catalog-service.mjs';
import { createMissionMemoryService } from './mission-memory-service.mjs';
import { createMissionReadService } from './mission-read-service.mjs';
import { createMissionRunService } from './mission-run-service.mjs';
import { createProviderRuntimeService } from './provider-runtime-service.mjs';
import { createRetrievalRuntimeServiceFromEnvironment } from './retrieval-runtime-service.mjs';
import { createWorkspaceLearningSelectionService } from './workspace-learning-selection-service.mjs';
import { createRuntimeHarness } from '../harness/runtime-harness.mjs';
import { createProviderRegistry } from '../providers/index.mjs';

function now() {
  return new Date().toISOString();
}

export function createMissionService({
  store,
  rootDir = store.rootDir,
  retrievalRuntime = createRetrievalRuntimeServiceFromEnvironment(),
  workspaceLearningClock = now,
}) {
  const docService = createDocService({ rootDir });
  const factGraph = createFactGraphService({ store });
  const providerRegistry = createProviderRegistry({ rootDir });
  const harness = createRuntimeHarness({ store });
  const { recordGatewayEvent } = createGatewayEventCoordinator({ harness, now, store });
  const catalogService = createMissionCatalogService({
    fileSystem: fs,
    now,
    recordGatewayEvent,
    store,
  });
  const {
    addMissionAttachment,
    addWorkspace,
    createMission,
    getMission,
    getWorkspace,
    listMissionAttachments,
    listMissions,
  } = catalogService;
  const memoryService = createMissionMemoryService({
    factGraph,
    getMission,
    getWorkspace,
    harness,
    store,
  });
  const {
    addMemory,
    deleteMemory,
    listFactGraph,
    listMemory,
    updateMemory,
  } = memoryService;
  const executionRuntimeService = createExecutionRuntimeService({
    getMission,
    getWorkspace,
    harness,
    now,
    store,
  });
  const {
    buildExecutionContext,
    completeExecutionLeaseApproval,
    getExecutionLogs,
    getExecutionStatus,
    isExecutionCapableMission,
    preflightExecution,
    rollbackExecution,
    startExecution,
    stopExecution,
  } = executionRuntimeService;
  const learningCandidateRuntimeService = createLearningCandidateRuntimeService({
    fileSystem: fs,
    now,
    store,
  });
  const {
    attachProviderFallbackSummary,
    writeUpdatedLearningCandidateArtifact,
  } = learningCandidateRuntimeService;
  const workspaceLearningSelectionService = createWorkspaceLearningSelectionService({
    getMission,
    getWorkspace,
    now: workspaceLearningClock,
    store,
    writeUpdatedLearningCandidateArtifact,
  });
  const {
    clearWorkspaceLearningSelectionOverride,
    setWorkspaceLearningSelectionOverride,
  } = workspaceLearningSelectionService;
  const { getLearningCandidateAudit } = createLearningCandidateAudit({
    store,
    getMission,
    getWorkspace,
  });
  const {
    buildActionInboxReadModel,
    summarizeProviderHealthDriftItems,
    selectActionInboxItems,
  } = createActionInbox({ summarizeSpecialistFollowUpItems });

  docService.ensureDocs();

  let actionInboxService;
  let escalationService;
  let followUpService;
  let missionRunService;
  let providerRuntimeService;

  const readService = createMissionReadService({
    buildParallelGroupStates: (...args) => missionRunService.buildParallelGroupStates(...args),
    buildProviderFallbackTimelineEvents: (...args) =>
      providerRuntimeService.buildProviderFallbackTimelineEvents(...args),
    buildProviderAttentionOpenedTimeline: (...args) =>
      providerRuntimeService.buildProviderAttentionOpenedTimeline(...args),
    buildProviderAttentionPendingItems: (...args) =>
      providerRuntimeService.buildProviderAttentionPendingItems(...args),
    buildProviderAttentionRecoveredItems: (...args) =>
      providerRuntimeService.buildProviderAttentionRecoveredItems(...args),
    buildProviderAttentionRecoveredTimeline: (...args) =>
      providerRuntimeService.buildProviderAttentionRecoveredTimeline(...args),
    buildProviderAttentionReminderTimeline: (...args) =>
      providerRuntimeService.buildProviderAttentionReminderTimeline(...args),
    buildProviderAttentionTimeline: (...args) => providerRuntimeService.buildProviderAttentionTimeline(...args),
    buildProviderExecutionEntries: (...args) => providerRuntimeService.buildProviderExecutionEntries(...args),
    buildScopedProviderRecentWindow: (...args) => providerRuntimeService.buildScopedProviderRecentWindow(...args),
    buildSpecialistFollowUpItems: (...args) => followUpService.buildSpecialistFollowUpItems(...args),
    collectMissionAttachmentContext: (...args) => missionRunService.collectMissionAttachmentContext(...args),
    collectRelevantMemoryEntries: (...args) => missionRunService.collectRelevantMemoryEntries(...args),
    docService,
    factGraph,
    fileSystem: fs,
    getActionInbox: (...args) => actionInboxService.getActionInbox(...args),
    getExecutionStatus,
    getMission,
    getParallelSpecialistKinds: (...args) => missionRunService.getParallelSpecialistKinds(...args),
    getProviderOverview: (...args) => providerRuntimeService.getProviderOverview(...args),
    getWorkspace,
    harness,
    listReviewerFollowUpRecords: (...args) => followUpService.listReviewerFollowUpRecords(...args),
    now,
    providerRegistry,
    rootDir,
    store,
    summarizeMissionProviderActivity: (...args) => providerRuntimeService.summarizeMissionProviderActivity(...args),
    summarizeMissionProviderFallback: (...args) => providerRuntimeService.summarizeMissionProviderFallback(...args),
    summarizeProviderHealthDrift: (...args) => providerRuntimeService.summarizeProviderHealthDrift(...args),
    summarizeWorkspaceProviderActivity: (...args) =>
      providerRuntimeService.summarizeWorkspaceProviderActivity(...args),
    syncEscalations: (...args) => escalationService.syncEscalations(...args),
  });

  let createReviewerFollowUpRecordImpl;
  let emitLearningCandidateImpl;
  missionRunService = createMissionRunService({
    attachProviderFallbackSummary,
    buildExecutionContext,
    completeExecutionLeaseApproval,
    createReviewerFollowUpRecord: (...args) => createReviewerFollowUpRecordImpl(...args),
    emitLearningCandidate: (...args) => emitLearningCandidateImpl(...args),
    fileSystem: fs,
    getMission,
    getWorkspace,
    harness,
    isExecutionCapableMission,
    now,
    providerRegistry,
    recordGatewayEvent,
    retrievalRuntime,
    store,
    workspaceLearningClock,
  });
  const {
    getSessionProviderFailureSummary,
    listApprovals,
    resolveApproval,
    runMission,
  } = missionRunService;

  providerRuntimeService = createProviderRuntimeService({
    getMission,
    getSessionProviderFailureSummary,
    getWorkspace,
    now,
    providerRegistry,
    runMission,
    store,
    summarizeProviderHealthDriftItems,
  });
  const {
    acknowledgeProviderAttention,
    buildProviderAttentionItems,
    buildProviderHealthDriftActionItems,
    checkProvider,
    getProviderAttentionInbox,
    getProviderEventTimeline,
    getProviderExecutionHistory,
    getProviderExecutionTimeline,
    getProviderHealthDriftInbox,
    getProviderOverview,
    getProviderProbeTimeline,
    listProviderProbeHistory,
    listProviders,
    probeProvider,
    remediateProviderAttention,
    remindProviderAttention,
    resolveProviderAttention,
  } = providerRuntimeService;

  escalationService = createEscalationService({
    getMission,
    getWorkspace,
    now,
    store,
  });
  const {
    acknowledgeOwnerHandoff,
    buildOwnerHandoffActionItems,
    getEscalatedInbox,
    getOwnerHandoffInbox,
    remindEscalations,
    remindOwnerHandoffs,
    resolveEscalation,
    syncEscalations,
  } = escalationService;

  followUpService = createFollowUpService({
    addMemoryEntry: harness.addMemoryEntry,
    buildParallelGroupStates: missionRunService.buildParallelGroupStates,
    fileSystem: fs,
    getLatestParallelGroupState: missionRunService.getLatestParallelGroupState,
    getMission,
    getWorkspace,
    now,
    providerRegistry,
    runMission,
    store,
  });
  createReviewerFollowUpRecordImpl = followUpService.createReviewerFollowUpRecord;
  const {
    buildAcceptedRiskMonitoringItems,
    buildReviewerFollowUpItems,
    buildSpecialistFollowUpItems,
    getReviewerFollowUpInbox,
    getSpecialistFollowUpInbox,
    remediateSpecialistFollowUp,
    remindSpecialistFollowUps,
    resolveReviewerFollowUp,
  } = followUpService;

  const learningCandidateEmitter = createLearningCandidateEmitter({
    store,
    now,
    writeArtifact: harness.writeArtifact,
    getSessionProviderFailureSummary,
    writeUpdatedLearningCandidateArtifact,
  });
  emitLearningCandidateImpl = learningCandidateEmitter.emitLearningCandidate;

  const {
    authorizeLearningPromotionScope,
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

  const {
    buildApprovalInboxItems,
    buildBlockedFollowUpItems,
    buildMaintenanceActionItems,
    getApprovalInbox,
    listMaintenanceOverviewRuns,
    listMaintenancePressureEntries,
    summarizeMissionMaintenanceImpact,
  } = readService;
  actionInboxService = createActionInboxService({
    buildAcceptedRiskMonitoringItems,
    buildActionInboxReadModel,
    buildApprovalInboxItems,
    buildBlockedFollowUpItems,
    buildMaintenanceActionItems,
    buildOwnerHandoffActionItems,
    buildProviderAttentionItems,
    buildProviderHealthDriftActionItems,
    buildReviewerFollowUpItems,
    buildSpecialistFollowUpItems,
    getMission,
    getWorkspace,
    listLearningPromotionItems,
    listMaintenanceOverviewRuns,
    providerRegistry,
    selectActionInboxItems,
    syncEscalations,
  });
  const { getActionInbox } = actionInboxService;

  const {
    getMaintenanceOverview,
    logOverdueActions,
    runActionMaintenance,
  } = createActionMaintenanceService({
    getActionInbox,
    getMission,
    getWorkspace,
    listMaintenanceOverviewRuns,
    listMaintenancePressureEntries,
    logIncidentDocument: ({ content, title }) => docService.logDocument({
      content,
      title,
      type: 'incident',
    }),
    now,
    remindEscalations,
    remindOwnerHandoffs,
    remindProviderAttention,
    remindSpecialistFollowUps,
    store,
    summarizeMissionMaintenanceImpact,
    syncEscalations,
  });
  const {
    deleteDocumentLog,
    logDocument,
    migrateLegacyDocumentLogs,
    updateDocumentLog,
  } = createDocumentLog({ docService });
  const {
    browseMissionHarnessDocuments,
    browseMissionHarnessMemory,
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
    listSessions,
    showMission,
    showSession,
  } = readService;

  return {
    addMemory,
    addMissionAttachment,
    addWorkspace,
    authorizeLearningPromotionScope,
    acknowledgeProviderAttention,
    browseMissionHarnessDocuments,
    browseMissionHarnessMemory,
    checkProvider,
    clearWorkspaceLearningSelectionOverride,
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
    setWorkspaceLearningSelectionOverride,
    startExecution,
    stopExecution,
    updateDocumentLog,
    updateMemory,
  };
}
