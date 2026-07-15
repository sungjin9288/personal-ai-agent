import assert from 'node:assert/strict';
import test from 'node:test';

import { createActionMaintenanceService } from '../src/core/action-maintenance-service.mjs';

const NOW = '2026-07-16T00:00:00.000Z';

function emptyReminderResult() {
  return {
    items: [],
    summary: {
      dueCandidateCount: 0,
      remindedCount: 0,
    },
  };
}

function createFixture({ overdueItems = [] } = {}) {
  const effects = [];
  const escalations = [];
  const maintenanceRuns = [];
  let pressureReadCount = 0;
  const service = createActionMaintenanceService({
    getActionInbox() {
      effects.push('action-inbox');
      return {
        filters: { overdueOnly: true },
        items: overdueItems,
        summary: {},
      };
    },
    getMission: (missionId) => ({ id: missionId }),
    getWorkspace: (workspaceId) => ({ id: workspaceId }),
    listMaintenanceOverviewRuns() {
      effects.push('maintenance-overview');
      return maintenanceRuns;
    },
    listMaintenancePressureEntries() {
      pressureReadCount += 1;
      effects.push(`pressure:${pressureReadCount}`);
      return [];
    },
    logIncidentDocument() {
      effects.push('incident-document');
      return '/docs/incidents.md';
    },
    now: () => NOW,
    remindEscalations() {
      effects.push('remind-escalation');
      return emptyReminderResult();
    },
    remindOwnerHandoffs() {
      effects.push('remind-owner-handoff');
      return emptyReminderResult();
    },
    remindProviderAttention() {
      effects.push('remind-provider-attention');
      return emptyReminderResult();
    },
    remindSpecialistFollowUps() {
      effects.push('remind-specialist');
      return emptyReminderResult();
    },
    store: {
      listEscalations() {
        effects.push('escalation-list');
        return escalations;
      },
      saveEscalation(record) {
        effects.push('escalation-save');
        escalations.push(record);
        return record;
      },
      saveMaintenanceRun(record) {
        effects.push('maintenance-save');
        maintenanceRuns.push(record);
        return record;
      },
      updateEscalation(id, updater) {
        effects.push('escalation-update');
        const index = escalations.findIndex((item) => item.id === id);
        escalations[index] = updater(escalations[index]);
        return escalations[index];
      },
    },
    summarizeMissionMaintenanceImpact: () => null,
    syncEscalations() {
      effects.push('sync');
      return { items: [], summary: { syncedCount: 0 } };
    },
  });

  return { effects, escalations, maintenanceRuns, service };
}

function createOverdueItem() {
  return {
    actionClass: 'blocked',
    actionId: 'blocked:mission-1',
    actionType: 'blocked-follow-up',
    dueAt: '2026-07-15T00:00:00.000Z',
    escalationRule: 'Escalate to workspace owner.',
    isOverdue: true,
    missionId: 'mission-1',
    priority: 'high',
    reason: 'Mission failed.',
    recommendedCommand: 'mission retry mission-1',
    recommendedOwner: 'workspace-owner',
    sessionId: 'session-1',
    title: 'Retry mission',
    workspaceId: 'workspace-1',
    workspaceName: 'Workspace',
  };
}

test('logOverdueActions writes the incident before storing its escalation audit', () => {
  const fixture = createFixture({ overdueItems: [createOverdueItem()] });

  const result = fixture.service.logOverdueActions();

  assert.deepEqual(fixture.effects, [
    'action-inbox',
    'incident-document',
    'escalation-list',
    'escalation-save',
  ]);
  assert.equal(result.logged, true);
  assert.equal(fixture.escalations[0].incidentPath, '/docs/incidents.md');
});

test('logOverdueActions leaves document and store untouched when nothing is overdue', () => {
  const fixture = createFixture();

  const result = fixture.service.logOverdueActions();

  assert.deepEqual(fixture.effects, ['action-inbox']);
  assert.equal(result.logged, false);
});

test('runActionMaintenance preserves reminder and maintenance audit order', () => {
  const fixture = createFixture();

  const result = fixture.service.runActionMaintenance({ note: 'daily sweep' });

  assert.deepEqual(fixture.effects, [
    'pressure:1',
    'sync',
    'remind-escalation',
    'remind-owner-handoff',
    'remind-provider-attention',
    'remind-specialist',
    'pressure:2',
    'maintenance-save',
    'maintenance-overview',
  ]);
  assert.equal(result.maintenanceRun.note, 'daily sweep');
  assert.equal(fixture.maintenanceRuns.length, 1);
});
