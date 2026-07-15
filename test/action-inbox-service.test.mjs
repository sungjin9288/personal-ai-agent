import assert from 'node:assert/strict';
import test from 'node:test';

import { createActionInboxService } from '../src/core/action-inbox-service.mjs';

function createFixture() {
  const effects = [];
  const emptySource = (name) => () => {
    effects.push(name);
    return [];
  };
  const service = createActionInboxService({
    buildAcceptedRiskMonitoringItems: emptySource('accepted-risk'),
    buildActionInboxReadModel({ items }) {
      effects.push('read-model');
      return { filters: {}, items, summary: {} };
    },
    buildApprovalInboxItems: emptySource('approval'),
    buildBlockedFollowUpItems: emptySource('blocked'),
    buildMaintenanceActionItems: emptySource('maintenance'),
    buildOwnerHandoffActionItems: emptySource('owner-handoff'),
    buildProviderAttentionItems: emptySource('provider-attention'),
    buildProviderHealthDriftActionItems: emptySource('provider-drift'),
    buildReviewerFollowUpItems: emptySource('reviewer'),
    buildSpecialistFollowUpItems: emptySource('specialist'),
    getMission(missionId) {
      effects.push(`mission:${missionId}`);
      return { id: missionId };
    },
    getWorkspace(workspaceId) {
      effects.push(`workspace:${workspaceId}`);
      return { id: workspaceId };
    },
    listLearningPromotionItems: emptySource('learning'),
    listMaintenanceOverviewRuns: emptySource('maintenance-overview'),
    providerRegistry: {
      getProviderStatus(providerId) {
        effects.push(`provider:${providerId}`);
        return { id: providerId };
      },
    },
    selectActionInboxItems(items) {
      effects.push('select');
      return items;
    },
    syncEscalations() {
      effects.push('sync');
      return { items: [], summary: {} };
    },
  });

  return { effects, service };
}

test('getActionInbox validates scope before sync and collects sources in the established order', () => {
  const fixture = createFixture();

  const result = fixture.service.getActionInbox({
    missionId: 'mission-1',
    providerId: 'stub',
    workspaceId: 'workspace-1',
  });

  assert.deepEqual(fixture.effects, [
    'provider:stub',
    'workspace:workspace-1',
    'mission:mission-1',
    'sync',
    'approval',
    'maintenance',
    'owner-handoff',
    'provider-attention',
    'provider-drift',
    'specialist',
    'learning',
    'accepted-risk',
    'blocked',
    'reviewer',
    'select',
    'read-model',
  ]);
  assert.deepEqual(result.items, []);
});

test('getActionInbox rejects unsupported ownership before sync or source reads', () => {
  const fixture = createFixture();

  assert.throws(
    () => fixture.service.getActionInbox({ owner: 'unknown-owner' }),
    /Unsupported action owner: unknown-owner/,
  );
  assert.deepEqual(fixture.effects, []);
});
