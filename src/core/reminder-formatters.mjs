import { PROVIDER_ATTENTION_REMINDER_CADENCE_HOURS, SPECIALIST_FOLLOW_UP_REMINDER_CADENCE_HOURS } from './constants.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function deriveProviderAttentionReminderCadenceHours(eventFamily) {
  return PROVIDER_ATTENTION_REMINDER_CADENCE_HOURS[eventFamily] || null;
}

export function deriveSpecialistFollowUpReminderCadenceHours(status) {
  return SPECIALIST_FOLLOW_UP_REMINDER_CADENCE_HOURS[status] || null;
}

export function deriveLearningPromotionStopConditionReminderCadenceHours() {
  return 12;
}

export function formatApprovalResolution(decision, reason) {
  return `# Approval Resolution

## Decision
- decision: ${decision}
- reason: ${reason || 'No explicit reason recorded.'}
`;
}

export function formatReviewerFailureMemory({ mission, findings }) {
  return `Reviewer failed ${mission.deliverableType} for mission ${mission.id}: ${findings.join(' | ')}`;
}

export function formatApprovalDecisionMemory({ mission, decision, reason }) {
  return `Approval ${decision} for mission ${mission.id} (${mission.deliverableType}): ${reason || 'No explicit reason recorded.'}`;
}

export function buildProviderAttentionReminderNote(item, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  return item.eventFamily === 'execution'
    ? `Reminder issued for failed ${item.providerDisplayName} execution attention.`
    : `Reminder issued for failed ${item.providerDisplayName} probe attention.`;
}

export function formatProviderAttentionReminderDetail(reminder) {
  const overdueSuffix = reminder.overdue ? ' [overdue]' : '';
  return `${reminder.providerDisplayName || reminder.providerId}${overdueSuffix} provider attention reminder: ${reminder.note || 'No explicit note recorded.'}`;
}

export function buildSpecialistFollowUpReminderNote(item, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  const urgencyPrefix = item.remediationRoute?.routeUrgency === 'fast' ? 'Fast remediation reminder' : 'Reminder';
  return `${urgencyPrefix} issued for ${item.status} ${item.specialistKind} specialist follow-up.`;
}

export function formatSpecialistFollowUpReminderDetail(reminder) {
  const overdueSuffix = reminder.overdue ? ' [overdue]' : '';
  const urgencyPrefix = reminder.remediationRoute?.routeUrgency === 'fast' ? '[fast] ' : '';
  return `${urgencyPrefix}${reminder.specialistKind}${overdueSuffix} specialist follow-up reminder: ${reminder.note || 'No explicit note recorded.'}`;
}

export function buildLearningPromotionStopConditionReminderNote(item, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  return `Reminder issued for blocked learning promotion stop-condition reason=${item.promotionStopReason || 'unknown'}.`;
}

export function formatLearningPromotionStopConditionReminderDetail(reminder) {
  const overdueSuffix = reminder.overdue ? ' [overdue]' : '';
  return `${reminder.learningCandidateId}${overdueSuffix} learning promotion stop-condition reminder: ${reminder.note || 'No explicit note recorded.'}`;
}

export function formatReviewerFollowUpResolutionMemory({ mission, note, resolutionKind }) {
  return `Reviewer follow-up resolved for mission ${mission.id} (${mission.deliverableType}) [${resolutionKind || 'accepted-risk'}]: ${note || 'Resolved without additional note.'}`;
}

export function formatReviewerFollowUpResolutionDetail({ resolutionKind, resolutionNote }) {
  const prefix = resolutionKind ? `${resolutionKind}: ` : '';
  return `${prefix}${resolutionNote || 'Reviewer follow-up resolved.'}`;
}

export function formatAcceptedRiskEscalationTitle(missionTitle) {
  return `Accepted risk monitoring for ${missionTitle}`;
}

export function formatApprovedExecutionReadyBrief({ mission, workspace, approval, deliverableArtifact }) {
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
- the next execution owner should validate workspace-local commands inside ${workspace.path}
- keep verification scoped to the proposal and capture exact evidence before any broader mutation

## Next Action
- open the approved proposal and execute only the bounded path that was reviewed
`;
}
