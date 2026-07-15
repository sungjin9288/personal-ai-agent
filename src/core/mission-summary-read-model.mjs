function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function countByNormalizedField(items, fieldName) {
  return ensureArray(items).reduce((counts, item) => {
    const key = normalizeText(item?.[fieldName], 'unknown');
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function getLatestItem(items, fieldName = 'createdAt') {
  if (!items.length) {
    return null;
  }

  return [...items]
    .sort((left, right) => String(left[fieldName] || '').localeCompare(String(right[fieldName] || '')))
    .at(-1);
}

export function buildSessionSummary({
  agentRuns = [],
  approvals = [],
  artifacts = [],
  gatewayEvents = [],
  learningCandidates = [],
  session,
}) {
  const identitySessionContexts = gatewayEvents.map((event) => event.identitySessionContext).filter(Boolean);
  const sandboxDecisions = gatewayEvents.map((event) => event.sandboxDecision).filter(Boolean);
  const latestApproval = getLatestItem(approvals, 'createdAt');
  const latestArtifact = getLatestItem(artifacts, 'createdAt');
  const latestGatewayEvent = getLatestItem(gatewayEvents, 'at');
  const latestIdentitySessionContext = getLatestItem(identitySessionContexts, 'at');
  const latestSandboxDecision = getLatestItem(sandboxDecisions, 'at');
  const latestLearningCandidate = getLatestItem(learningCandidates, 'createdAt');
  const reviewerRun = agentRuns.find((run) => run.role === 'reviewer') || null;

  return {
    agentRunCount: agentRuns.length,
    approvalCount: approvals.length,
    currentStage: session.currentStage,
    endedAt: session.endedAt,
    id: session.id,
    latestApprovalStatus: latestApproval ? latestApproval.status : null,
    latestArtifactFileName: latestArtifact ? latestArtifact.fileName : null,
    gatewayEventCount: gatewayEvents.length,
    gatewayEventId: latestGatewayEvent?.id || session.sourceContext?.gatewayEventId || null,
    gatewayEventType: latestGatewayEvent?.eventType || session.sourceContext?.gatewayEventType || null,
    identitySessionContextBindingStatusCounts: countByNormalizedField(identitySessionContexts, 'bindingStatus'),
    identitySessionContextCount: identitySessionContexts.length,
    identitySessionContextId:
      latestIdentitySessionContext?.id || session.sourceContext?.gatewayIdentitySessionContextId || null,
    identitySessionContextPolicyCounts: countByNormalizedField(identitySessionContexts, 'policyId'),
    latestIdentitySessionContext,
    latestSandboxDecision,
    learningCandidateCount: learningCandidates.length,
    latestLearningCandidateId: latestLearningCandidate?.id || null,
    latestLearningCandidateRecordType: latestLearningCandidate?.recordType || null,
    provider: session.provider,
    sandboxDecisionCount: sandboxDecisions.length,
    sandboxDecisionModeCounts: countByNormalizedField(sandboxDecisions, 'mode'),
    reviewerStatus: reviewerRun ? reviewerRun.status : null,
    reviewerSummary: reviewerRun ? reviewerRun.outputSummary : null,
    startedAt: session.startedAt,
    status: session.status,
  };
}

export function buildMissionSummary({
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
  providerFallbackSummary,
  providerHealthDrift,
  providerRecentWindow,
  relatedMaintenanceRuns,
  sandboxDecisions,
  sessions,
}) {
  return {
    approvalCounts: {
      approved: approvals.filter((approval) => approval.status === 'approved').length,
      pending: approvals.filter((approval) => approval.status === 'pending').length,
      rejected: approvals.filter((approval) => approval.status === 'rejected').length,
      total: approvals.length,
    },
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
    id: mission.id,
    gatewayEventCount: gatewayEvents.length,
    gatewayEventTypeCounts: countByNormalizedField(gatewayEvents, 'eventType'),
    identitySessionContextBindingStatusCounts: countByNormalizedField(identitySessionContexts, 'bindingStatus'),
    identitySessionContextCount: identitySessionContexts.length,
    identitySessionContextPolicyCounts: countByNormalizedField(identitySessionContexts, 'policyId'),
    latestGatewayEvent,
    latestIdentitySessionContext,
    latestSandboxDecision,
    learningCandidateCount: learningCandidates.length,
    learningCandidateRecordTypeCounts: countByNormalizedField(learningCandidates, 'recordType'),
    learningCandidateStatusCounts: countByNormalizedField(learningCandidates, 'status'),
    learningCandidatePromotionStatusCounts: countByNormalizedField(learningCandidates, 'promotionStatus'),
    latestLearningCandidate,
    latestEscalation: escalationSummary.latestEscalation,
    latestMaintenanceImpactRun: maintenanceImpactSummary.latestRun,
    latestMaintenanceImpactRunAt: maintenanceImpactSummary.latestRunAt,
    latestRelatedMaintenanceRun,
    latestRelatedMaintenanceRunAt: latestRelatedMaintenanceRun?.createdAt || null,
    latestMaintenanceRequiredAction: maintenancePressureSummary.latestRequiredAction,
    latestMaintenanceRequiredActionAt: maintenancePressureSummary.latestRequiredActionAt,
    latestMaintenanceRun: maintenanceSummary.latestRun,
    latestMaintenanceRunAt: maintenanceSummary.latestRunAt,
    latestSession,
    maintenanceAcknowledgedMaintenanceRequiredCountTotal:
      maintenanceSummary.acknowledgedMaintenanceRequiredCountTotal,
    maintenanceDueCandidateCountTotal: maintenanceSummary.dueCandidateCountTotal,
    maintenanceEscalationRemindedCountTotal: maintenanceSummary.escalationRemindedCountTotal,
    maintenanceImpactEscalationRemindedCountTotal: maintenanceImpactSummary.escalationRemindedCountTotal,
    maintenanceImpactOwnerHandoffRemindedCountTotal: maintenanceImpactSummary.ownerHandoffRemindedCountTotal,
    maintenanceImpactProviderAttentionRemindedCountTotal:
      maintenanceImpactSummary.providerAttentionRemindedCountTotal,
    maintenanceImpactSpecialistFollowUpRemindedCountTotal:
      maintenanceImpactSummary.specialistFollowUpRemindedCountTotal,
    maintenanceImpactRunCount: maintenanceImpactSummary.runCount,
    maintenanceImpactTotalRemindedCount: maintenanceImpactSummary.totalRemindedCount,
    maintenanceRequiredCount: maintenancePressureSummary.maintenanceRequiredCount,
    sandboxDecisionCount: sandboxDecisions.length,
    sandboxDecisionModeCounts: countByNormalizedField(sandboxDecisions, 'mode'),
    sandboxDecisionPolicyCounts: countByNormalizedField(sandboxDecisions, 'policyId'),
    maintenanceResolvedMaintenanceRequiredCountTotal:
      maintenanceSummary.resolvedMaintenanceRequiredCountTotal,
    maintenanceRemainingMaintenanceRequiredCountTotal:
      maintenanceSummary.remainingMaintenanceRequiredCountTotal,
    maintenanceRelatedRunCount: relatedMaintenanceRuns.length,
    maintenanceOwnerHandoffRemindedCountTotal: maintenanceSummary.ownerHandoffRemindedCountTotal,
    maintenanceProviderAttentionRemindedCountTotal: maintenanceSummary.providerAttentionRemindedCountTotal,
    maintenanceSpecialistFollowUpRemindedCountTotal: maintenanceSummary.specialistFollowUpRemindedCountTotal,
    maintenanceMonthlyBucketCount: maintenanceMonthlyBuckets.length,
    maintenanceLatestMonthlyBucketStartDate: maintenanceMonthlyBuckets[0]?.monthStartDate || null,
    maintenanceOldestMonthlyBucketStartDate: maintenanceMonthlyBuckets.at(-1)?.monthStartDate || null,
    maintenanceLatestMonthlyBucketDelta,
    maintenanceRunCount: maintenanceSummary.runCount,
    maintenanceSyncedCountTotal: maintenanceSummary.syncedCountTotal,
    maintenanceNextDueAt: maintenancePressureSummary.nextDueAt,
    maintenanceCurrentDueSpecialistFollowUpCountTotal:
      maintenancePressureSummary.currentDueSpecialistFollowUpCountTotal,
    maintenanceTotalRemindedCount: maintenanceSummary.totalRemindedCount,
    memoryCounts: {
      decision: memoryEntries.filter((entry) => entry.kind === 'decision').length,
      fact: memoryEntries.filter((entry) => entry.kind === 'fact').length,
      preference: memoryEntries.filter((entry) => entry.kind === 'preference').length,
      total: memoryEntries.length,
    },
    attachmentCounts: {
      total: missionAttachments.length,
      truncated: missionAttachments.filter((attachment) => attachment.truncated).length,
      totalChars: missionAttachments.reduce((sum, attachment) => sum + Number(attachment.charCount || 0), 0),
    },
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
    providerRecentSince: filter.providerSince || null,
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
    ...providerFallbackSummary,
    specialistFollowUpRequiredCount: parallelActivity.specialistFollowUpRequiredCount,
    specialistFollowUpNeedsReminderCount: parallelActivity.specialistFollowUpNeedsReminderCount,
    specialistFollowUpOverdueCount: parallelActivity.specialistFollowUpOverdueCount,
    specialistFollowUpReminderCountTotal: parallelActivity.specialistFollowUpReminderCountTotal,
    specialistConfiguredKinds: parallelPlan.effectiveKinds,
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
    specialistQualityGate: missionQualityGate.qualityGate,
    specialistQualityGateBlockedCount: parallelActivity.qualityGateBlockedCount,
    specialistQualityGateRequiredKinds: missionQualityGate.requiredKinds,
    specialistQualityGateStatus: missionQualityGate.status,
    specialistQualityGateStatusCounts: parallelActivity.qualityGateStatusCounts,
    specialistQualityGateViolationCount: missionQualityGate.violationCount,
    specialistOrchestrationProfileCounts: parallelActivity.orchestrationProfileCounts,
    specialistOrchestrationProfileCount: parallelActivity.specialistOrchestrationProfileCount,
    specialistOrchestrationProfileDeliverableTypes: parallelPlan.orchestrationProfile?.deliverableTypes || [],
    specialistOrchestrationProfileDescription: parallelPlan.orchestrationProfile?.description || null,
    specialistOrchestrationProfileDisplayName: parallelPlan.orchestrationProfile?.displayName || null,
    specialistOrchestrationProfileHarnessPatterns: parallelPlan.orchestrationProfile?.harnessPatterns || [],
    specialistOrchestrationProfileId: parallelPlan.orchestrationProfile?.id || null,
    specialistOrchestrationProfileMergeOwner: parallelPlan.orchestrationProfile?.mergeOwner || null,
    specialistOrchestrationProfileMode: parallelPlan.orchestrationProfile?.mode || null,
    specialistOrchestrationProfilePresetKinds: parallelPlan.orchestrationProfile?.parallelSpecialistKinds || [],
    specialistOrchestrationProfileQualityGate: parallelPlan.orchestrationProfile?.qualityGate || null,
    specialistOrchestrationProfileRecommendedProvider:
      parallelPlan.orchestrationProfile?.recommendedProvider || null,
    specialistOrchestrationProfileRuntimeBlueprint: parallelPlan.orchestrationProfile?.runtimeBlueprint || null,
    specialistOrchestrationProfileRetryPolicy: parallelPlan.orchestrationProfile?.retryPolicy || null,
    specialistOrchestrationProfileSource: parallelPlan.source,
    specialistRunCount: parallelActivity.specialistRunCount,
    specialistStatusCounts: parallelActivity.statusCounts,
    specialistTouchedOrchestrationProfileIds: parallelActivity.touchedOrchestrationProfileIds,
    specialistTouchedKinds: parallelActivity.touchedSpecialistKinds,
    specialistTotalGroupCount: parallelActivity.totalGroupCount,
    providerTouchedCount: providerActivity.summary.touchedProviderCount,
    providerTouchedIds: providerActivity.summary.touchedProviderIds,
    sessionCount: sessions.length,
    status: mission.status,
    updatedAt: mission.updatedAt,
  };
}
