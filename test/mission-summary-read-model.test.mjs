import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMissionSummary,
  buildSessionSummary,
} from '../src/core/mission-summary-read-model.mjs';

function createMissionSummaryInput(overrides = {}) {
  return {
    approvals: [],
    escalationSummary: {},
    filter: {},
    gatewayEvents: [],
    identitySessionContexts: [],
    latestGatewayEvent: null,
    latestIdentitySessionContext: null,
    latestLearningCandidate: null,
    latestRelatedMaintenanceRun: null,
    latestSandboxDecision: null,
    latestSession: null,
    learningCandidates: [],
    maintenanceImpactSummary: {},
    maintenanceLatestMonthlyBucketDelta: null,
    maintenanceMonthlyBuckets: [],
    maintenancePressureSummary: {},
    maintenanceSummary: {},
    memoryEntries: [],
    mission: { id: 'mission-1', status: 'draft', updatedAt: '2026-07-01T00:00:00.000Z' },
    missionAttachments: [],
    missionQualityGate: {},
    parallelActivity: {},
    parallelPlan: { effectiveKinds: [], orchestrationProfile: null, source: 'mission' },
    providerActivity: { summary: {} },
    providerFallbackSummary: {},
    providerHealthDrift: {},
    providerRecentWindow: null,
    relatedMaintenanceRuns: [],
    sandboxDecisions: [],
    sessions: [],
    ...overrides,
  };
}

test('session summary selects the latest linked evidence and aggregates policy counts', () => {
  const summary = buildSessionSummary({
    agentRuns: [
      { outputSummary: 'Reviewer is still running.', role: 'reviewer', status: 'running' },
      { outputSummary: 'Executor completed.', role: 'executor', status: 'completed' },
    ],
    approvals: [
      { createdAt: '2026-07-01T00:00:00.000Z', status: 'rejected' },
      { createdAt: '2026-07-03T00:00:00.000Z', status: 'approved' },
    ],
    artifacts: [
      { createdAt: '2026-07-02T00:00:00.000Z', fileName: 'draft.md' },
      { createdAt: '2026-07-04T00:00:00.000Z', fileName: 'review.md' },
    ],
    gatewayEvents: [
      {
        at: '2026-07-02T00:00:00.000Z',
        eventType: 'mission.started',
        id: 'gateway-1',
        identitySessionContext: {
          at: '2026-07-02T00:00:00.000Z',
          bindingStatus: 'bound',
          id: 'identity-1',
          policyId: 'policy-a',
        },
        sandboxDecision: {
          at: '2026-07-02T00:00:00.000Z',
          mode: 'read-only',
        },
      },
      {
        at: '2026-07-05T00:00:00.000Z',
        eventType: 'mission.completed',
        id: 'gateway-2',
        identitySessionContext: {
          at: '2026-07-05T00:00:00.000Z',
          bindingStatus: 'bound',
          id: 'identity-2',
          policyId: 'policy-a',
        },
        sandboxDecision: {
          at: '2026-07-05T00:00:00.000Z',
          mode: 'workspace-write',
        },
      },
    ],
    learningCandidates: [
      { createdAt: '2026-07-01T00:00:00.000Z', id: 'learning-1', recordType: 'review' },
      { createdAt: '2026-07-06T00:00:00.000Z', id: 'learning-2', recordType: 'outcome' },
    ],
    session: {
      currentStage: 'reviewer',
      endedAt: null,
      id: 'session-1',
      provider: 'stub',
      startedAt: '2026-07-01T00:00:00.000Z',
      status: 'running',
    },
  });

  assert.equal(summary.agentRunCount, 2);
  assert.equal(summary.approvalCount, 2);
  assert.equal(summary.latestApprovalStatus, 'approved');
  assert.equal(summary.latestArtifactFileName, 'review.md');
  assert.equal(summary.gatewayEventId, 'gateway-2');
  assert.equal(summary.gatewayEventType, 'mission.completed');
  assert.equal(summary.identitySessionContextId, 'identity-2');
  assert.deepEqual(summary.identitySessionContextBindingStatusCounts, { bound: 2 });
  assert.deepEqual(summary.identitySessionContextPolicyCounts, { 'policy-a': 2 });
  assert.deepEqual(summary.sandboxDecisionModeCounts, { 'read-only': 1, 'workspace-write': 1 });
  assert.equal(summary.latestLearningCandidateId, 'learning-2');
  assert.equal(summary.latestLearningCandidateRecordType, 'outcome');
  assert.equal(summary.reviewerStatus, 'running');
  assert.equal(summary.reviewerSummary, 'Reviewer is still running.');
});

test('session summary falls back to recorded source context without gateway records', () => {
  const summary = buildSessionSummary({
    session: {
      id: 'session-1',
      sourceContext: {
        gatewayEventId: 'source-gateway',
        gatewayEventType: 'source.event',
        gatewayIdentitySessionContextId: 'source-identity',
      },
    },
  });

  assert.equal(summary.gatewayEventId, 'source-gateway');
  assert.equal(summary.gatewayEventType, 'source.event');
  assert.equal(summary.identitySessionContextId, 'source-identity');
  assert.equal(summary.gatewayEventCount, 0);
  assert.equal(summary.identitySessionContextCount, 0);
  assert.equal(summary.sandboxDecisionCount, 0);
});

test('session summary keeps empty evidence collections explicit', () => {
  const summary = buildSessionSummary({ session: { id: 'session-1' } });

  assert.equal(summary.id, 'session-1');
  assert.equal(summary.agentRunCount, 0);
  assert.equal(summary.approvalCount, 0);
  assert.equal(summary.learningCandidateCount, 0);
  assert.equal(summary.latestApprovalStatus, null);
  assert.equal(summary.latestArtifactFileName, null);
  assert.equal(summary.latestIdentitySessionContext, null);
  assert.equal(summary.latestSandboxDecision, null);
  assert.equal(summary.reviewerStatus, null);
  assert.equal(summary.reviewerSummary, null);
  assert.deepEqual(summary.identitySessionContextBindingStatusCounts, {});
  assert.deepEqual(summary.sandboxDecisionModeCounts, {});
});

test('mission summary keeps core approval, evidence, memory, and attachment counts explicit', () => {
  const latestGatewayEvent = { at: '2026-07-03T00:00:00.000Z', eventType: 'mission.completed' };
  const latestIdentitySessionContext = { at: '2026-07-03T00:00:00.000Z', bindingStatus: 'bound' };
  const latestLearningCandidate = { id: 'learning-2', promotionStatus: 'pending-review' };
  const latestSandboxDecision = { at: '2026-07-03T00:00:00.000Z', mode: 'read-only', policyId: 'sandbox-a' };
  const latestSession = { id: 'session-2', status: 'completed' };
  const summary = buildMissionSummary(createMissionSummaryInput({
    approvals: [
      { status: 'approved' },
      { status: 'pending' },
      { status: 'rejected' },
    ],
    gatewayEvents: [latestGatewayEvent],
    identitySessionContexts: [latestIdentitySessionContext],
    latestGatewayEvent,
    latestIdentitySessionContext,
    latestLearningCandidate,
    latestSandboxDecision,
    latestSession,
    learningCandidates: [
      { promotionStatus: 'promoted', recordType: 'review', status: 'completed' },
      { promotionStatus: 'pending-review', recordType: 'outcome', status: 'pending' },
    ],
    memoryEntries: [
      { kind: 'decision' },
      { kind: 'fact' },
      { kind: 'preference' },
    ],
    missionAttachments: [
      { charCount: 20, truncated: false },
      { charCount: 30, truncated: true },
    ],
    sandboxDecisions: [latestSandboxDecision],
    sessions: [{ id: 'session-1' }, latestSession],
  }));

  assert.deepEqual(summary.approvalCounts, { approved: 1, pending: 1, rejected: 1, total: 3 });
  assert.equal(summary.gatewayEventCount, 1);
  assert.deepEqual(summary.gatewayEventTypeCounts, { 'mission.completed': 1 });
  assert.equal(summary.latestGatewayEvent, latestGatewayEvent);
  assert.equal(summary.latestIdentitySessionContext, latestIdentitySessionContext);
  assert.equal(summary.latestLearningCandidate, latestLearningCandidate);
  assert.equal(summary.latestSandboxDecision, latestSandboxDecision);
  assert.equal(summary.latestSession, latestSession);
  assert.deepEqual(summary.memoryCounts, { decision: 1, fact: 1, preference: 1, total: 3 });
  assert.deepEqual(summary.attachmentCounts, { total: 2, totalChars: 50, truncated: 1 });
  assert.equal(summary.sessionCount, 2);
});

test('mission summary preserves provider metrics, recent defaults, and fallback evidence', () => {
  const summary = buildMissionSummary(createMissionSummaryInput({
    filter: { providerSince: '2026-07-01T00:00:00.000Z' },
    providerActivity: {
      latestAttentionAcknowledgement: { id: 'ack-1' },
      latestAttentionRecovery: { id: 'recovery-1' },
      latestAttentionReminder: { id: 'reminder-1' },
      latestAttentionRequiredEvent: { id: 'attention-1' },
      latestAttentionResolution: { id: 'resolution-1' },
      latestExecution: { id: 'execution-1' },
      latestExecutionEvent: { id: 'event-1' },
      latestFailedExecution: { id: 'failed-1' },
      latestSuccessfulExecution: { id: 'success-1' },
      summary: {
        attentionAcknowledgedCount: 1,
        attentionNeedsReminderCount: 2,
        attentionStatusCounts: { pending: 2 },
        eventCount: 3,
        eventFamilyCounts: { attention: 2, execution: 1 },
        executionCount: 4,
        executionEstimatedCostUsdTotal: 0,
        touchedProviderCount: 1,
        touchedProviderIds: ['stub'],
        usageTotalTokensTotal: 25,
      },
    },
    providerFallbackSummary: {
      providerFallbackAttemptCount: 2,
      providerFallbackStatus: 'recovered',
    },
    providerHealthDrift: {
      attentionNeedsReminderCount: 2,
      reasonCodes: ['attention-needs-reminder'],
      status: 'drifted',
    },
  }));

  assert.equal(summary.latestProviderExecution.id, 'execution-1');
  assert.equal(summary.providerAttentionAcknowledgedCount, 1);
  assert.equal(summary.providerAttentionNeedsReminderCount, 2);
  assert.deepEqual(summary.providerAttentionStatusCounts, { pending: 2 });
  assert.equal(summary.providerEventCount, 3);
  assert.equal(summary.providerExecutionCount, 4);
  assert.equal(summary.providerExecutionUsageTotalTokensTotal, 25);
  assert.equal(summary.providerTouchedCount, 1);
  assert.deepEqual(summary.providerTouchedIds, ['stub']);
  assert.equal(summary.providerRecentSince, '2026-07-01T00:00:00.000Z');
  assert.deepEqual(summary.providerRecentEventFamilyCounts, {
    attention: 0,
    execution: 0,
    fallback: 0,
    probe: 0,
  });
  assert.equal(summary.providerFallbackAttemptCount, 2);
  assert.equal(summary.providerFallbackStatus, 'recovered');
  assert.equal(summary.providerHealthDriftStatus, 'drifted');
});

test('mission summary preserves maintenance, escalation, and specialist quality state', () => {
  const summary = buildMissionSummary(createMissionSummaryInput({
    escalationSummary: {
      breachCountTotal: 1,
      latestEscalation: { id: 'escalation-1' },
      needsReminderCount: 2,
      pendingOwnerHandoffCount: 3,
      statusCounts: { open: 3 },
      tierCounts: { critical: 1 },
    },
    maintenanceImpactSummary: {
      latestRun: { id: 'impact-run' },
      latestRunAt: '2026-07-03T00:00:00.000Z',
      runCount: 2,
      totalRemindedCount: 4,
    },
    maintenanceMonthlyBuckets: [
      { monthStartDate: '2026-07-01' },
      { monthStartDate: '2026-06-01' },
    ],
    maintenancePressureSummary: {
      latestRequiredAction: { id: 'action-1' },
      maintenanceRequiredCount: 3,
      nextDueAt: '2026-07-10T00:00:00.000Z',
    },
    maintenanceSummary: {
      latestRun: { id: 'maintenance-run' },
      runCount: 5,
      totalRemindedCount: 6,
    },
    missionQualityGate: {
      qualityGate: { minimumCompletedKinds: 2 },
      requiredKinds: ['research', 'verification'],
      status: 'blocked',
      violationCount: 1,
    },
    parallelActivity: {
      latestQualityGateViolation: { code: 'missing-kind' },
      qualityGateBlockedCount: 1,
      qualityGateStatusCounts: { blocked: 1 },
      specialistRunCount: 2,
      statusCounts: { completed: 1, failed: 1 },
      totalGroupCount: 1,
    },
    parallelPlan: {
      effectiveKinds: ['research', 'verification'],
      orchestrationProfile: {
        displayName: 'Research review',
        id: 'profile-1',
        mergeOwner: 'reviewer',
      },
      source: 'profile',
    },
    relatedMaintenanceRuns: [{ id: 'related-1' }, { id: 'related-2' }],
  }));

  assert.deepEqual(summary.escalationCounts, { open: 3 });
  assert.equal(summary.escalationBreachCountTotal, 1);
  assert.equal(summary.escalationPendingOwnerHandoffCount, 3);
  assert.equal(summary.maintenanceImpactRunCount, 2);
  assert.equal(summary.maintenanceRunCount, 5);
  assert.equal(summary.maintenanceRelatedRunCount, 2);
  assert.equal(summary.maintenanceMonthlyBucketCount, 2);
  assert.equal(summary.maintenanceLatestMonthlyBucketStartDate, '2026-07-01');
  assert.equal(summary.maintenanceOldestMonthlyBucketStartDate, '2026-06-01');
  assert.deepEqual(summary.specialistConfiguredKinds, ['research', 'verification']);
  assert.equal(summary.specialistQualityGateStatus, 'blocked');
  assert.equal(summary.specialistQualityGateViolationCount, 1);
  assert.equal(summary.specialistOrchestrationProfileId, 'profile-1');
  assert.equal(summary.specialistOrchestrationProfileDisplayName, 'Research review');
  assert.equal(summary.specialistOrchestrationProfileSource, 'profile');
});
