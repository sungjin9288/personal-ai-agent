import { summarizeEscalations } from './escalation-analytics.mjs';

export function selectEscalatedInboxItems(items, filter = {}) {
  return items
    .filter((item) => {
      if (filter.effectiveOwner && item.effectiveRecommendedOwner !== filter.effectiveOwner) {
        return false;
      }
      if (filter.tier && item.escalationTier !== filter.tier) {
        return false;
      }
      if (filter.needsReminderOnly && !item.needsReminder) {
        return false;
      }
      return true;
    })
    .sort((left, right) => String(left.createdAt || '').localeCompare(String(right.createdAt || '')));
}

export function buildEscalatedInboxReadModel({ filter = {}, items, syncSummary }) {
  return {
    filters: {
      missionId: filter.missionId || null,
      effectiveOwner: filter.effectiveOwner || null,
      needsReminderOnly: Boolean(filter.needsReminderOnly),
      owner: filter.owner || null,
      status: filter.status || 'open',
      tier: filter.tier || null,
      workspaceId: filter.workspaceId || null,
    },
    items,
    summary: {
      ...summarizeEscalations(items),
      sync: syncSummary,
    },
  };
}
