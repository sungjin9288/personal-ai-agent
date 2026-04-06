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

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

export const APPROVAL_DECISIONS = ['approve', 'reject'];

export const ACTION_CLASSES = ['retry-ready', 'blocked', 'awaiting-human-decision'];
export const ACTION_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const ACTION_OWNERS = ['human-approver', 'mission-owner', 'workspace-owner'];

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
