import assert from 'node:assert/strict';
import test from 'node:test';

import { createFollowUpService } from '../src/core/follow-up-service.mjs';

const NOW = '2026-07-16T00:00:00.000Z';

function createFixture() {
  const effects = [];
  const reviewerFollowUps = [];
  const escalations = [];
  const specialistReminders = [];
  const mission = {
    deliverableType: 'decision-memo',
    id: 'mission-1',
    mode: 'knowledge',
    status: 'failed',
    title: 'Mission',
    workspaceId: 'workspace-1',
  };
  const workspace = { id: 'workspace-1', name: 'Workspace' };
  const specialistRun = {
    endedAt: '2026-07-15T00:00:00.000Z',
    id: 'run-1',
    outputSummary: 'Research branch failed.',
    parallelGroupId: 'parallel-1',
    providerId: 'stub',
    sessionId: 'session-1',
    specialistKind: 'research',
    status: 'failed',
  };
  const group = {
    latestByKind: new Map([['research', specialistRun]]),
    mission,
    orchestrationProfile: null,
    parallelGroupId: 'parallel-1',
    qualityGate: { violations: [] },
    requiredKinds: ['research'],
    workspace,
  };

  const store = {
    getSession: () => ({ id: 'session-1', provider: 'stub' }),
    listAgentRunsBySession: () => [],
    listArtifactsBySession: () => [],
    listEscalations(filter = {}) {
      return escalations.filter(
        (item) => (!filter.actionId || item.actionId === filter.actionId) && (!filter.status || item.status === filter.status),
      );
    },
    listMissions: () => [mission],
    listReviewerFollowUps(filter = {}) {
      return reviewerFollowUps.filter(
        (item) =>
          (!filter.actionId || item.actionId === filter.actionId) &&
          (!filter.missionId || item.missionId === filter.missionId) &&
          (!filter.status || item.status === filter.status),
      );
    },
    listSessionsByMission: () => [],
    listSpecialistFollowUpReminders(filter = {}) {
      return specialistReminders.filter((item) => !filter.actionId || item.actionId === filter.actionId);
    },
    saveEscalation(record) {
      effects.push('escalation-save');
      escalations.push(record);
      return record;
    },
    saveReviewerFollowUp(record) {
      effects.push('reviewer-save');
      reviewerFollowUps.push(record);
      return record;
    },
    saveSpecialistFollowUpReminder(record) {
      effects.push('specialist-reminder-save');
      specialistReminders.push(record);
      return record;
    },
    updateEscalation(id, updater) {
      const index = escalations.findIndex((item) => item.id === id);
      escalations[index] = updater(escalations[index]);
      effects.push('escalation-update');
      return escalations[index];
    },
    updateReviewerFollowUp(id, updater) {
      const index = reviewerFollowUps.findIndex((item) => item.id === id);
      reviewerFollowUps[index] = updater(reviewerFollowUps[index]);
      effects.push('reviewer-update');
      return reviewerFollowUps[index];
    },
  };

  const service = createFollowUpService({
    addMemoryEntry(entry) {
      effects.push(`memory:${entry.scopeId}`);
      return entry;
    },
    buildParallelGroupStates: () => [group],
    getLatestParallelGroupState: () => group,
    getMission: () => mission,
    getWorkspace: () => workspace,
    now: () => NOW,
    providerRegistry: {
      getProviderStatus: (providerId) => ({ id: providerId }),
    },
    runMission: async (missionId, options) => {
      effects.push(`mission-run:${missionId}:${options.provider}`);
      return {
        approval: null,
        artifactPath: '/artifact.md',
        mission: { ...mission, status: 'completed' },
        provider: options.provider,
        reviewerVerdict: 'pass',
        session: { id: 'session-2' },
      };
    },
    store,
  });

  return { effects, escalations, mission, reviewerFollowUps, service, specialistReminders };
}

test('createReviewerFollowUpRecord persists a seed once and reuses the stored record', () => {
  const fixture = createFixture();
  const seed = {
    actionId: 'reviewer-follow-up:mission-1:session-1',
    missionId: 'mission-1',
    status: 'open',
    workspaceId: 'workspace-1',
  };

  const created = fixture.service.createReviewerFollowUpRecord(seed);
  const reused = fixture.service.createReviewerFollowUpRecord(seed);

  assert.deepEqual(fixture.effects, ['reviewer-save']);
  assert.equal(reused.id, created.id);
});

test('accepted-risk resolution records follow-up, memory, then escalation in order', () => {
  const fixture = createFixture();
  fixture.reviewerFollowUps.push({
    actionId: 'reviewer-follow-up:mission-1:session-1',
    id: 'follow-up-1',
    missionId: 'mission-1',
    missionTitle: 'Mission',
    sessionId: 'session-1',
    status: 'open',
    workspaceId: 'workspace-1',
    workspaceName: 'Workspace',
  });

  const result = fixture.service.resolveReviewerFollowUp(
    'reviewer-follow-up:mission-1:session-1',
    { kind: 'accepted-risk', note: 'Monitor the risk.' },
  );

  assert.deepEqual(fixture.effects, ['reviewer-update', 'memory:mission-1', 'escalation-save']);
  assert.equal(result.followUp.status, 'resolved');
  assert.equal(result.escalation.sourceResolutionKind, 'accepted-risk');
});

test('specialist reminder persists the audit record before returning its read model', () => {
  const fixture = createFixture();

  const result = fixture.service.remindSpecialistFollowUps({}, 'owner notified');

  assert.deepEqual(fixture.effects, ['specialist-reminder-save']);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].note, 'owner notified');
  assert.equal(fixture.specialistReminders[0].specialistKind, 'research');
});

test('specialist remediation delegates the exact provider before computing post state', async () => {
  const fixture = createFixture();
  const actionId = fixture.service.getSpecialistFollowUpInbox().items[0].actionId;

  const result = await fixture.service.remediateSpecialistFollowUp(actionId);

  assert.deepEqual(fixture.effects, ['mission-run:mission-1:stub']);
  assert.equal(result.previousStatus, 'failed');
  assert.equal(result.result.parallelGroupId, 'parallel-1');
  assert.equal(result.result.missionStatus, 'completed');
});
