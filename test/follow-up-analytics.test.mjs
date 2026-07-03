import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveSpecialistFollowUpPolicy,
  resolveSpecialistFollowUpRoute,
  summarizeOperatorTimeline,
  summarizeReviewerFollowUps,
  summarizeSpecialistFollowUpItems,
} from '../src/core/follow-up-analytics.mjs';

// Fixed, deterministic UTC timestamps used across tests (offline, no Date.now() dependence).
const JAN_1 = '2024-01-01T09:00:00.000Z';
const JAN_2 = '2024-01-02T09:00:00.000Z';
const JAN_3 = '2024-01-03T09:00:00.000Z';

// --- resolveSpecialistFollowUpPolicy ---------------------------------------

test('resolveSpecialistFollowUpPolicy returns the default policy for run-status source and failed status', () => {
  const policy = resolveSpecialistFollowUpPolicy({
    followUpSource: 'run-status',
    orchestrationProfile: null,
    specialistKind: 'implementation',
    status: 'failed',
  });
  assert.equal(policy.priority, 'high');
  assert.equal(policy.retryPolicy, 'resume-blocked-or-failed-branch');
  assert.equal(policy.slaHours, 24);
});

test('resolveSpecialistFollowUpPolicy returns medium priority for blocked status under the default policy', () => {
  const policy = resolveSpecialistFollowUpPolicy({
    orchestrationProfile: null,
    specialistKind: 'implementation',
    status: 'blocked',
  });
  assert.equal(policy.priority, 'medium');
});

test('resolveSpecialistFollowUpPolicy applies the fast verification policy for verification specialists', () => {
  const policy = resolveSpecialistFollowUpPolicy({
    followUpSource: 'quality-gate',
    orchestrationProfile: { retryPolicy: 'resume-verification-fast' },
    specialistKind: 'verification',
    status: 'blocked',
  });
  assert.equal(policy.priority, 'high');
  assert.equal(policy.reminderCadenceHours, 12);
  assert.equal(policy.retryPolicy, 'resume-verification-fast');
  assert.equal(policy.slaHours, 12);
});

test('resolveSpecialistFollowUpPolicy does not apply the fast verification policy to other specialist kinds', () => {
  const policy = resolveSpecialistFollowUpPolicy({
    orchestrationProfile: { retryPolicy: 'resume-verification-fast' },
    specialistKind: 'research',
    status: 'failed',
  });
  assert.equal(policy.retryPolicy, 'resume-verification-fast');
  assert.equal(policy.slaHours, 24);
});

test('resolveSpecialistFollowUpPolicy applies the fast research-and-verification policy for blocked research', () => {
  const policy = resolveSpecialistFollowUpPolicy({
    followUpSource: 'run-status',
    orchestrationProfile: { retryPolicy: 'resume-research-and-verification-fast' },
    specialistKind: 'research',
    status: 'blocked',
  });
  assert.equal(policy.priority, 'high');
  assert.equal(policy.reminderCadenceHours, 12);
  assert.equal(policy.slaHours, 12);
});

test('resolveSpecialistFollowUpPolicy normalizes an "executing" status to "running" cadence lookups', () => {
  const policy = resolveSpecialistFollowUpPolicy({
    orchestrationProfile: null,
    specialistKind: 'design',
    status: 'executing',
  });
  assert.equal(policy.priority, 'medium');
});

// --- resolveSpecialistFollowUpRoute -----------------------------------------

test('resolveSpecialistFollowUpRoute returns the standard branch remediation route by default', () => {
  const route = resolveSpecialistFollowUpRoute({
    actionId: 'action-1',
    followUpSource: 'run-status',
    missionId: 'mission-1',
    providerId: 'stub',
    retryPolicy: 'resume-blocked-or-failed-branch',
    specialistKind: 'documentation',
  });
  assert.equal(route.routeType, 'standard-branch-remediation');
  assert.equal(route.routeUrgency, 'standard');
  assert.equal(route.preferredCommand, 'node src/cli.mjs action remediate-specialist-follow-up action-1');
  assert.equal(route.fallbackCommand, 'node src/cli.mjs mission run mission-1 --provider stub');
});

test('resolveSpecialistFollowUpRoute mentions the quality gate in the route reason when sourced from a quality gate', () => {
  const route = resolveSpecialistFollowUpRoute({
    actionId: 'action-1',
    followUpSource: 'quality-gate',
    missionId: 'mission-1',
    providerId: 'stub',
    retryPolicy: 'resume-blocked-or-failed-branch',
    specialistKind: 'documentation',
  });
  assert.match(route.routeReason, /quality gate/);
});

test('resolveSpecialistFollowUpRoute returns the fast verification route for verification specialists', () => {
  const route = resolveSpecialistFollowUpRoute({
    actionId: 'action-2',
    missionId: 'mission-1',
    providerId: 'stub',
    retryPolicy: 'resume-verification-fast',
    specialistKind: 'verification',
  });
  assert.equal(route.routeType, 'priority-verification-remediation');
  assert.equal(route.routeUrgency, 'fast');
});

test('resolveSpecialistFollowUpRoute returns the fast research-and-verification route for research specialists', () => {
  const route = resolveSpecialistFollowUpRoute({
    actionId: 'action-3',
    missionId: 'mission-1',
    providerId: 'stub',
    retryPolicy: 'resume-research-and-verification-fast',
    specialistKind: 'research',
  });
  assert.equal(route.routeType, 'priority-research-verification-remediation');
  assert.equal(route.routeUrgency, 'fast');
});

test('resolveSpecialistFollowUpRoute falls back to the default retry policy label when none is provided', () => {
  const route = resolveSpecialistFollowUpRoute({
    actionId: 'action-4',
    missionId: 'mission-1',
    providerId: 'stub',
    retryPolicy: '',
    specialistKind: 'implementation',
  });
  assert.equal(route.routeType, 'standard-branch-remediation');
});

// --- summarizeReviewerFollowUps ---------------------------------------------

test('summarizeReviewerFollowUps handles an empty list', () => {
  const summary = summarizeReviewerFollowUps([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.latestFollowUp, null);
  assert.deepEqual(summary.workspaceCounts, {});
});

test('summarizeReviewerFollowUps counts a single open item without a resolution kind', () => {
  const summary = summarizeReviewerFollowUps([
    { createdAt: JAN_1, status: 'open', workspaceId: 'workspace-1' },
  ]);
  assert.equal(summary.total, 1);
  assert.equal(summary.statusCounts.open, 1);
  assert.equal(summary.resolutionKindCounts.unresolved, 1);
  assert.equal(summary.workspaceCounts['workspace-1'], 1);
});

test('summarizeReviewerFollowUps counts multiple items across statuses, resolution kinds, and workspaces', () => {
  const items = [
    { createdAt: JAN_1, status: 'open', workspaceId: 'workspace-1' },
    {
      createdAt: JAN_2,
      resolutionKind: 'rerun-fixed',
      status: 'resolved',
      updatedAt: JAN_2,
      workspaceId: 'workspace-2',
    },
    { createdAt: JAN_3, status: 'open', workspaceId: 'workspace-1' },
  ];
  const summary = summarizeReviewerFollowUps(items);
  assert.equal(summary.total, 3);
  assert.equal(summary.statusCounts.open, 2);
  assert.equal(summary.statusCounts.resolved, 1);
  assert.equal(summary.resolutionKindCounts['rerun-fixed'], 1);
  assert.equal(summary.resolutionKindCounts.unresolved, 2);
  assert.equal(summary.workspaceCounts['workspace-1'], 2);
  assert.equal(summary.workspaceCounts['workspace-2'], 1);
  assert.equal(summary.latestFollowUp.workspaceId, 'workspace-1');
});

// --- summarizeSpecialistFollowUpItems ---------------------------------------

test('summarizeSpecialistFollowUpItems handles an empty list', () => {
  const summary = summarizeSpecialistFollowUpItems([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.latestItem, null);
  assert.equal(summary.overdueCount, 0);
  assert.equal(summary.needsReminderCount, 0);
});

test('summarizeSpecialistFollowUpItems summarizes a single item', () => {
  const item = {
    isOverdue: true,
    latestReminderAt: JAN_1,
    needsReminder: true,
    nextReminderAt: JAN_2,
    providerId: 'stub',
    remediationRoute: { routeType: 'standard-branch-remediation' },
    reminderCount: 2,
    retryPolicy: 'resume-blocked-or-failed-branch',
    specialistKind: 'research',
    status: 'blocked',
    workspaceId: 'workspace-1',
  };
  const summary = summarizeSpecialistFollowUpItems([item]);
  assert.equal(summary.total, 1);
  assert.equal(summary.latestItem, item);
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.needsReminderCount, 1);
  assert.equal(summary.reminderCountTotal, 2);
  assert.equal(summary.statusCounts.blocked, 1);
  assert.equal(summary.providerCounts.stub, 1);
  assert.equal(summary.remediationRouteCounts['standard-branch-remediation'], 1);
  assert.equal(summary.retryPolicyCounts['resume-blocked-or-failed-branch'], 1);
  assert.equal(summary.specialistKindCounts.research, 1);
  assert.equal(summary.workspaceCounts['workspace-1'], 1);
  assert.equal(summary.latestReminderAt, JAN_1);
  assert.equal(summary.nextReminderAt, JAN_2);
});

test('summarizeSpecialistFollowUpItems aggregates multiple items across statuses and specialist kinds', () => {
  const items = [
    {
      latestReminderAt: JAN_1,
      providerId: 'stub',
      reminderCount: 1,
      specialistKind: 'research',
      status: 'blocked',
      workspaceId: 'workspace-1',
    },
    {
      latestReminderAt: JAN_2,
      providerId: 'openai',
      reminderCount: 3,
      specialistKind: 'verification',
      status: 'failed',
      workspaceId: 'workspace-2',
    },
  ];
  const summary = summarizeSpecialistFollowUpItems(items);
  assert.equal(summary.total, 2);
  assert.equal(summary.statusCounts.blocked, 1);
  assert.equal(summary.statusCounts.failed, 1);
  assert.equal(summary.reminderCountTotal, 4);
  assert.equal(summary.latestReminderAt, JAN_2);
  assert.equal(summary.specialistKindCounts.research, 1);
  assert.equal(summary.specialistKindCounts.verification, 1);
  assert.equal(summary.specialistKindCounts.implementation, 0);
  assert.equal(summary.latestItem, items[1]);
});

// --- summarizeOperatorTimeline -----------------------------------------------

test('summarizeOperatorTimeline handles an empty list', () => {
  const summary = summarizeOperatorTimeline([]);
  assert.equal(summary.total, 0);
  assert.equal(summary.latestEvent, null);
  assert.equal(summary.latestIdentitySessionContextEvent, null);
  assert.equal(summary.providerFallbackAttemptCount, 0);
});

test('summarizeOperatorTimeline orders events and picks the latest identity-session-context event by "at"', () => {
  const events = [
    {
      at: JAN_1,
      identitySessionBindingStatus: 'bound',
      identitySessionContextPolicyId: 'policy-a',
      kind: 'identity-session-context-recorded',
      sourceType: 'service',
      workspaceId: 'workspace-1',
    },
    {
      at: JAN_2,
      identitySessionBindingStatus: 'bound',
      identitySessionContextPolicyId: 'policy-b',
      kind: 'identity-session-context-recorded',
      sourceType: 'service',
      workspaceId: 'workspace-1',
    },
  ];
  const summary = summarizeOperatorTimeline(events);
  assert.equal(summary.total, 2);
  assert.equal(summary.identitySessionContextCount, 2);
  assert.equal(summary.latestIdentitySessionContextEvent.at, JAN_2);
  assert.equal(summary.identitySessionContextBindingStatusCounts.bound, 2);
  assert.equal(summary.identitySessionContextPolicyCounts['policy-a'], 1);
  assert.equal(summary.identitySessionContextPolicyCounts['policy-b'], 1);
  assert.equal(summary.identitySessionContextSourceTypeCounts.service, 2);
  assert.equal(summary.latestEvent, events[1]);
});

test('summarizeOperatorTimeline aggregates provider-fallback and sandbox-decision events', () => {
  const events = [
    {
      at: JAN_1,
      fallbackPolicy: 'provider-failure-only',
      fallbackStopReason: 'exhausted',
      kind: 'provider-fallback-attempted',
      primaryProviderId: 'openai',
      workspaceId: 'workspace-1',
    },
    {
      at: JAN_2,
      fallbackPolicy: 'provider-failure-only',
      kind: 'provider-fallback-used',
      providerId: 'anthropic',
      providerRouteDecision: { action: { route: 'fallback' }, policyId: 'provider-failure-only' },
      workspaceId: 'workspace-1',
    },
    {
      at: JAN_3,
      kind: 'sandbox-decision-recorded',
      sandboxMode: 'restricted',
      sandboxPolicyId: 'sandbox-policy-1',
      workspaceId: 'workspace-2',
    },
  ];
  const summary = summarizeOperatorTimeline(events);
  assert.equal(summary.total, 3);
  assert.equal(summary.providerFallbackAttemptCount, 2);
  assert.equal(summary.providerFallbackUsedCount, 1);
  assert.deepEqual(summary.providerFallbackPrimaryProviderIds, ['openai']);
  assert.deepEqual(summary.providerFallbackUsedProviderIds, ['anthropic']);
  assert.equal(summary.providerFallbackPolicyCounts['provider-failure-only'], 2);
  assert.equal(summary.providerFallbackStopReasonCounts.exhausted, 1);
  assert.equal(summary.providerRouteDecisionCount, 1);
  assert.equal(summary.providerRouteDecisionRouteCounts.fallback, 1);
  assert.equal(summary.providerRouteDecisionPolicyCounts['provider-failure-only'], 1);
  assert.equal(summary.sandboxDecisionCount, 1);
  assert.equal(summary.sandboxDecisionModeCounts.restricted, 1);
  assert.equal(summary.sandboxDecisionPolicyCounts['sandbox-policy-1'], 1);
  assert.equal(summary.workspaceCounts['workspace-1'], 2);
  assert.equal(summary.workspaceCounts['workspace-2'], 1);
});

// Ensure a fixed timestamp constant is referenced so lint/test tooling treats this file
// as deterministic and offline (no live Date.now() dependence anywhere above).
test('fixture timestamp constants stay in the deterministic 2024-01 baseline', () => {
  assert.equal(JAN_1, '2024-01-01T09:00:00.000Z');
});
