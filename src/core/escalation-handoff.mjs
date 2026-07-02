import {
  ESCALATION_REMINDER_CADENCE_HOURS,
  OWNER_HANDOFF_ACK_SLA_HOURS,
  OWNER_HANDOFF_REMINDER_CADENCE_HOURS,
} from './constants.mjs';

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

export function formatEscalationReminderDetail(reminder) {
  const tierPrefix = reminder.tier ? `[${reminder.tier}] ` : '';
  return `${tierPrefix}${reminder.note || 'Escalation reminder issued.'}`;
}

export function formatEscalationOwnerChangeDetail(ownerChange) {
  const reasonSuffix = ownerChange.reason ? ` (${ownerChange.reason})` : '';
  return `${ownerChange.from} -> ${ownerChange.to}${reasonSuffix}`;
}

export function formatEscalationOwnerHandoffDetail(handoff) {
  const overdueSuffix = handoff.wasOverdue ? ' [overdue]' : '';
  return `${handoff.owner} acknowledged owner handoff${overdueSuffix}: ${handoff.note || 'No explicit note recorded.'}`;
}

export function buildOwnerHandoffReminderNote(escalation, note) {
  const normalizedNote = normalizeText(note);
  if (normalizedNote) {
    return normalizedNote;
  }

  return `Reminder issued for pending owner handoff to ${escalation.ownerHandoffTargetOwner || escalation.effectiveRecommendedOwner || 'assigned owner'}.`;
}

export function formatEscalationOwnerHandoffReminderDetail(reminder) {
  const overdueSuffix = reminder.overdue ? ' [overdue]' : '';
  return `${reminder.owner}${overdueSuffix} owner handoff reminder: ${reminder.note || 'No explicit note recorded.'}`;
}

export function deriveEscalationReminderCadenceHours(tier) {
  return ESCALATION_REMINDER_CADENCE_HOURS[tier] || null;
}

export function deriveOwnerHandoffSlaHours(owner) {
  return OWNER_HANDOFF_ACK_SLA_HOURS[owner] || null;
}

export function deriveOwnerHandoffReminderCadenceHours(owner) {
  return OWNER_HANDOFF_REMINDER_CADENCE_HOURS[owner] || null;
}
