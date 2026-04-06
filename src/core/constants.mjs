export const MISSION_MODES = ['engineering', 'knowledge'];

export const MISSION_STATUSES = [
  'created',
  'planned',
  'executing',
  'awaiting_approval',
  'reviewed',
  'completed',
  'failed',
];

export const SESSION_STATUSES = ['executing', 'awaiting_approval', 'reviewed', 'completed', 'failed'];

export const AGENT_ROLES = ['manager', 'planner', 'executor', 'reviewer'];
export const AGENT_RUN_STATUSES = ['executing', 'completed', 'failed'];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

export const APPROVAL_DECISIONS = ['approve', 'reject'];

export const ACTION_CLASSES = [
  'retry-ready',
  'blocked',
  'awaiting-human-decision',
  'monitoring-required',
  'handoff-required',
  'maintenance-required',
];
export const ACTION_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const ACTION_OWNERS = ['human-approver', 'mission-owner', 'workspace-owner'];
export const ESCALATION_STATUSES = ['open', 'resolved'];
export const ESCALATION_TIERS = ['normal', 'warning', 'critical', 'resolved'];
export const ESCALATION_REMINDER_CADENCE_HOURS = {
  normal: 72,
  warning: 24,
  critical: 6,
};
export const OWNER_HANDOFF_ACK_SLA_HOURS = {
  'mission-owner': 24,
  'workspace-owner': 24,
  'human-approver': 12,
};
export const OWNER_HANDOFF_REMINDER_CADENCE_HOURS = {
  'mission-owner': 12,
  'workspace-owner': 12,
  'human-approver': 6,
};
export const MAINTENANCE_RUN_OUTCOMES = ['effective', 'no-op', 'impactful'];
export const REVIEWER_FOLLOW_UP_STATUSES = ['open', 'resolved'];
export const REVIEWER_FOLLOW_UP_RESOLUTION_KINDS = ['rerun-fixed', 'superseded', 'scope-reduced', 'accepted-risk'];

export const MEMORY_SCOPES = ['user', 'workspace', 'mission'];

export const MEMORY_KINDS = ['preference', 'decision', 'fact'];

export const DOCUMENT_LOG_TYPES = ['devlog', 'incident', 'reference'];

export const PROVIDER_IDS = ['stub', 'openai', 'anthropic', 'local'];

export const KNOWLEDGE_DELIVERABLE_TYPES = [
  'decision-memo',
  'prd',
  'execution-plan',
  'research-brief',
  'checklist',
];

export const GLOBAL_USER_SCOPE_ID = 'user';
