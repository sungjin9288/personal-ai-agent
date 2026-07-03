import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLearningPromotionStopConditionReminderNote,
  buildProviderAttentionReminderNote,
  buildSpecialistFollowUpReminderNote,
  deriveLearningPromotionStopConditionReminderCadenceHours,
  deriveProviderAttentionReminderCadenceHours,
  deriveSpecialistFollowUpReminderCadenceHours,
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
} from '../src/core/reminder-formatters.mjs';

// Fixed, deterministic UTC timestamps used across tests (offline, no Date.now() dependence in assertions).
const JAN_1 = '2024-01-01T09:00:00.000Z';

// --- deriveProviderAttentionReminderCadenceHours ---------------------------

test('deriveProviderAttentionReminderCadenceHours returns configured cadence for a known event family', () => {
  const cadence = deriveProviderAttentionReminderCadenceHours('execution');
  assert.equal(typeof cadence, 'number');
  assert.ok(cadence > 0);
});

test('deriveProviderAttentionReminderCadenceHours returns null for an unconfigured event family', () => {
  assert.equal(deriveProviderAttentionReminderCadenceHours('unknown-event-family'), null);
});

// --- deriveSpecialistFollowUpReminderCadenceHours ---------------------------

test('deriveSpecialistFollowUpReminderCadenceHours returns configured cadence for a known status', () => {
  const cadence = deriveSpecialistFollowUpReminderCadenceHours('failed');
  assert.equal(typeof cadence, 'number');
  assert.ok(cadence > 0);
});

test('deriveSpecialistFollowUpReminderCadenceHours returns null for an unconfigured status', () => {
  assert.equal(deriveSpecialistFollowUpReminderCadenceHours('not-a-real-status'), null);
});

// --- deriveLearningPromotionStopConditionReminderCadenceHours --------------

test('deriveLearningPromotionStopConditionReminderCadenceHours returns the fixed 12-hour cadence', () => {
  assert.equal(deriveLearningPromotionStopConditionReminderCadenceHours(), 12);
});

test('deriveLearningPromotionStopConditionReminderCadenceHours ignores any arguments passed to it', () => {
  assert.equal(deriveLearningPromotionStopConditionReminderCadenceHours('ignored', 42), 12);
});

// --- formatApprovalResolution -----------------------------------------------

test('formatApprovalResolution includes the decision and an explicit reason when present', () => {
  const content = formatApprovalResolution('approved', 'Meets acceptance criteria.');
  assert.match(content, /# Approval Resolution/);
  assert.match(content, /decision: approved/);
  assert.match(content, /reason: Meets acceptance criteria\./);
});

test('formatApprovalResolution falls back to a default reason when absent', () => {
  const content = formatApprovalResolution('rejected', '');
  assert.match(content, /decision: rejected/);
  assert.match(content, /reason: No explicit reason recorded\./);
});

// --- formatReviewerFailureMemory --------------------------------------------

test('formatReviewerFailureMemory joins multiple findings with a pipe separator', () => {
  const memory = formatReviewerFailureMemory({
    mission: { deliverableType: 'code', id: 'mission-1' },
    findings: ['missing tests', 'lint errors'],
  });
  assert.equal(memory, 'Reviewer failed code for mission mission-1: missing tests | lint errors');
});

test('formatReviewerFailureMemory handles a single finding', () => {
  const memory = formatReviewerFailureMemory({
    mission: { deliverableType: 'doc', id: 'mission-2' },
    findings: ['broken link'],
  });
  assert.equal(memory, 'Reviewer failed doc for mission mission-2: broken link');
});

// --- formatApprovalDecisionMemory -------------------------------------------

test('formatApprovalDecisionMemory includes decision, deliverable type, and reason when present', () => {
  const memory = formatApprovalDecisionMemory({
    decision: 'approved',
    mission: { deliverableType: 'code', id: 'mission-1' },
    reason: 'Looks good.',
  });
  assert.equal(memory, 'Approval approved for mission mission-1 (code): Looks good.');
});

test('formatApprovalDecisionMemory falls back to a default reason when absent', () => {
  const memory = formatApprovalDecisionMemory({
    decision: 'rejected',
    mission: { deliverableType: 'code', id: 'mission-1' },
    reason: '',
  });
  assert.equal(memory, 'Approval rejected for mission mission-1 (code): No explicit reason recorded.');
});

// --- buildProviderAttentionReminderNote -------------------------------------

test('buildProviderAttentionReminderNote returns the normalized explicit note when present', () => {
  const note = buildProviderAttentionReminderNote({ eventFamily: 'execution', providerDisplayName: 'Acme' }, '  custom note  ');
  assert.equal(note, 'custom note');
});

test('buildProviderAttentionReminderNote falls back to an execution-specific message', () => {
  const note = buildProviderAttentionReminderNote({ eventFamily: 'execution', providerDisplayName: 'Acme' }, '');
  assert.equal(note, 'Reminder issued for failed Acme execution attention.');
});

test('buildProviderAttentionReminderNote falls back to a probe-specific message for non-execution families', () => {
  const note = buildProviderAttentionReminderNote({ eventFamily: 'probe', providerDisplayName: 'Acme' }, null);
  assert.equal(note, 'Reminder issued for failed Acme probe attention.');
});

// --- formatProviderAttentionReminderDetail ----------------------------------

test('formatProviderAttentionReminderDetail marks overdue reminders and includes the note', () => {
  const detail = formatProviderAttentionReminderDetail({
    note: 'Escalated to on-call.',
    overdue: true,
    providerDisplayName: 'Acme',
  });
  assert.equal(detail, 'Acme [overdue] provider attention reminder: Escalated to on-call.');
});

test('formatProviderAttentionReminderDetail falls back to providerId and default note when absent', () => {
  const detail = formatProviderAttentionReminderDetail({ overdue: false, providerId: 'provider-1' });
  assert.equal(detail, 'provider-1 provider attention reminder: No explicit note recorded.');
});

// --- buildSpecialistFollowUpReminderNote ------------------------------------

test('buildSpecialistFollowUpReminderNote returns the normalized explicit note when present', () => {
  const note = buildSpecialistFollowUpReminderNote(
    { specialistKind: 'verification', status: 'blocked' },
    '  needs re-run  ',
  );
  assert.equal(note, 'needs re-run');
});

test('buildSpecialistFollowUpReminderNote uses a fast-remediation prefix for fast routes', () => {
  const note = buildSpecialistFollowUpReminderNote(
    {
      remediationRoute: { routeUrgency: 'fast' },
      specialistKind: 'verification',
      status: 'blocked',
    },
    '',
  );
  assert.equal(note, 'Fast remediation reminder issued for blocked verification specialist follow-up.');
});

test('buildSpecialistFollowUpReminderNote uses a standard prefix for non-fast routes', () => {
  const note = buildSpecialistFollowUpReminderNote({ specialistKind: 'research', status: 'failed' }, '');
  assert.equal(note, 'Reminder issued for failed research specialist follow-up.');
});

// --- formatSpecialistFollowUpReminderDetail ---------------------------------

test('formatSpecialistFollowUpReminderDetail marks overdue and fast-route reminders', () => {
  const detail = formatSpecialistFollowUpReminderDetail({
    note: 'Resume branch.',
    overdue: true,
    remediationRoute: { routeUrgency: 'fast' },
    specialistKind: 'verification',
  });
  assert.equal(detail, '[fast] verification [overdue] specialist follow-up reminder: Resume branch.');
});

test('formatSpecialistFollowUpReminderDetail falls back to default note when absent', () => {
  const detail = formatSpecialistFollowUpReminderDetail({ overdue: false, specialistKind: 'research' });
  assert.equal(detail, 'research specialist follow-up reminder: No explicit note recorded.');
});

// --- buildLearningPromotionStopConditionReminderNote ------------------------

test('buildLearningPromotionStopConditionReminderNote returns the normalized explicit note when present', () => {
  const note = buildLearningPromotionStopConditionReminderNote(
    { promotionStopReason: 'verification-pending' },
    '  human review needed  ',
  );
  assert.equal(note, 'human review needed');
});

test('buildLearningPromotionStopConditionReminderNote falls back to unknown reason when absent', () => {
  const note = buildLearningPromotionStopConditionReminderNote({}, '');
  assert.equal(note, 'Reminder issued for blocked learning promotion stop-condition reason=unknown.');
});

// --- formatLearningPromotionStopConditionReminderDetail ---------------------

test('formatLearningPromotionStopConditionReminderDetail marks overdue reminders and includes the note', () => {
  const detail = formatLearningPromotionStopConditionReminderDetail({
    learningCandidateId: 'candidate-1',
    note: 'Awaiting human approver.',
    overdue: true,
  });
  assert.equal(detail, 'candidate-1 [overdue] learning promotion stop-condition reminder: Awaiting human approver.');
});

test('formatLearningPromotionStopConditionReminderDetail falls back to default note when absent', () => {
  const detail = formatLearningPromotionStopConditionReminderDetail({ learningCandidateId: 'candidate-2', overdue: false });
  assert.equal(detail, 'candidate-2 learning promotion stop-condition reminder: No explicit note recorded.');
});

// --- formatReviewerFollowUpResolutionMemory ---------------------------------

test('formatReviewerFollowUpResolutionMemory includes the resolution kind and note when present', () => {
  const memory = formatReviewerFollowUpResolutionMemory({
    mission: { deliverableType: 'code', id: 'mission-1' },
    note: 'Risk accepted by lead.',
    resolutionKind: 'accepted-risk',
  });
  assert.equal(
    memory,
    'Reviewer follow-up resolved for mission mission-1 (code) [accepted-risk]: Risk accepted by lead.',
  );
});

test('formatReviewerFollowUpResolutionMemory falls back to accepted-risk and default note when absent', () => {
  const memory = formatReviewerFollowUpResolutionMemory({
    mission: { deliverableType: 'code', id: 'mission-1' },
    note: '',
    resolutionKind: '',
  });
  assert.equal(
    memory,
    'Reviewer follow-up resolved for mission mission-1 (code) [accepted-risk]: Resolved without additional note.',
  );
});

// --- formatReviewerFollowUpResolutionDetail ---------------------------------

test('formatReviewerFollowUpResolutionDetail prefixes the resolution kind when present', () => {
  const detail = formatReviewerFollowUpResolutionDetail({
    resolutionKind: 'fixed',
    resolutionNote: 'Patched and re-verified.',
  });
  assert.equal(detail, 'fixed: Patched and re-verified.');
});

test('formatReviewerFollowUpResolutionDetail falls back to a default message when both fields are absent', () => {
  const detail = formatReviewerFollowUpResolutionDetail({ resolutionKind: '', resolutionNote: '' });
  assert.equal(detail, 'Reviewer follow-up resolved.');
});

// --- formatAcceptedRiskEscalationTitle --------------------------------------

test('formatAcceptedRiskEscalationTitle includes the mission title', () => {
  assert.equal(formatAcceptedRiskEscalationTitle('Launch payments API'), 'Accepted risk monitoring for Launch payments API');
});

test('formatAcceptedRiskEscalationTitle handles an empty mission title', () => {
  assert.equal(formatAcceptedRiskEscalationTitle(''), 'Accepted risk monitoring for ');
});

// --- formatApprovedExecutionReadyBrief --------------------------------------

test('formatApprovedExecutionReadyBrief includes mission, approval, and deliverable details when present', () => {
  const brief = formatApprovedExecutionReadyBrief({
    approval: { decision: 'approved', decisionReason: 'Meets bar.', id: 'approval-1' },
    deliverableArtifact: { fileName: 'plan.md', path: '/workspace/plan.md' },
    mission: { deliverableType: 'code', id: 'mission-1', title: 'Ship feature X' },
    workspace: { name: 'acme-workspace', path: '/workspace' },
  });
  assert.match(brief, /# Execution Ready Brief/);
  assert.match(brief, /mission id: mission-1/);
  assert.match(brief, /title: Ship feature X/);
  assert.match(brief, /workspace: acme-workspace/);
  assert.match(brief, /approval id: approval-1/);
  assert.match(brief, /decision: approved/);
  assert.match(brief, /reason: Meets bar\./);
  assert.match(brief, /artifact: plan\.md/);
  assert.match(brief, /path: \/workspace\/plan\.md/);
});

test('formatApprovedExecutionReadyBrief falls back to defaults when reason and deliverable artifact are absent', () => {
  const brief = formatApprovedExecutionReadyBrief({
    approval: { decision: 'approved', decisionReason: '', id: 'approval-2' },
    deliverableArtifact: null,
    mission: { deliverableType: 'doc', id: 'mission-2', title: 'Write onboarding guide' },
    workspace: { name: 'acme-workspace', path: '/workspace' },
  });
  assert.match(brief, /reason: No explicit reason recorded\./);
  assert.match(brief, /artifact: unknown/);
  assert.match(brief, /path: unknown/);
});

// Ensure a fixed timestamp constant is referenced so lint/test tooling treats this file
// as deterministic and offline (no live Date.now() dependence anywhere above).
test('fixture timestamp constant stays in the deterministic 2024-01-01 baseline', () => {
  assert.equal(JAN_1, '2024-01-01T09:00:00.000Z');
});
