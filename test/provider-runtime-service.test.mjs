import assert from 'node:assert/strict';
import test from 'node:test';

import { createProviderRuntimeService } from '../src/core/provider-runtime-service.mjs';

const NOW = '2026-07-16T00:00:00.000Z';

function createFixture({ probeResult = {} } = {}) {
  const effects = [];
  const probes = [];
  const acknowledgements = [];
  const reminders = [];
  const provider = {
    capabilities: {},
    configured: true,
    displayName: 'Stub Provider',
    id: 'stub',
    implemented: true,
    rateLimit: {},
  };

  const store = {
    listProviderAttentionAcknowledgements(filter = {}) {
      return acknowledgements.filter(
        (record) =>
          (!filter.actionId || record.actionId === filter.actionId) &&
          (!filter.eventFamily || record.eventFamily === filter.eventFamily) &&
          (!filter.eventRefId || record.eventRefId === filter.eventRefId) &&
          (!filter.missionId || record.missionId === filter.missionId) &&
          (!filter.providerId || record.providerId === filter.providerId) &&
          (!filter.workspaceId || record.workspaceId === filter.workspaceId),
      );
    },
    listProviderAttentionReminders(filter = {}) {
      return reminders.filter(
        (record) =>
          (!filter.eventFamily || record.eventFamily === filter.eventFamily) &&
          (!filter.eventRefId || record.eventRefId === filter.eventRefId) &&
          (!filter.providerId || record.providerId === filter.providerId),
      );
    },
    listProviderProbes(filter = {}) {
      return probes.filter(
        (record) =>
          (!filter.providerId || record.providerId === filter.providerId) &&
          (filter.attempted === undefined || record.attempted === filter.attempted) &&
          (filter.ok === undefined || record.ok === filter.ok),
      );
    },
    loadState() {
      return { agentRuns: [], missions: [], sessions: [], workspaces: [] };
    },
    saveProviderAttentionAcknowledgement(record) {
      effects.push(`attention-save:${record.status}`);
      acknowledgements.push(record);
      return record;
    },
    saveProviderProbe(record) {
      effects.push(`probe-save:${record.providerId}`);
      probes.push(record);
      return record;
    },
    updateProviderAttentionAcknowledgement(id, updater) {
      const index = acknowledgements.findIndex((record) => record.id === id);
      acknowledgements[index] = updater(acknowledgements[index]);
      effects.push(`attention-update:${acknowledgements[index].status}`);
      return acknowledgements[index];
    },
  };

  const providerRegistry = {
    getDefaultProviderId: () => provider.id,
    getProviderStatus(providerId) {
      if (providerId !== provider.id) {
        throw new Error(`Provider not found: ${providerId}`);
      }
      return provider;
    },
    listProviders: () => [provider],
    async probeProvider(providerId) {
      effects.push(`probe-call:${providerId}`);
      return {
        attemptCount: 1,
        attempted: true,
        checkedAt: NOW,
        durationMs: 12,
        endpoint: 'local-fixture',
        id: providerId,
        model: 'fixture-model',
        ok: true,
        reason: 'fixture ready',
        retryCount: 0,
        transport: 'fixture',
        ...probeResult,
      };
    },
  };

  const service = createProviderRuntimeService({
    buildProviderFallbackEventTimeline: () => [],
    getMission: (missionId) => ({ id: missionId, workspaceId: 'workspace-1' }),
    getWorkspace: (workspaceId) => ({ id: workspaceId, name: 'Workspace' }),
    now: () => NOW,
    providerRegistry,
    runMission: async () => {
      throw new Error('runMission should not be called by this fixture');
    },
    store,
    summarizeProviderHealthDriftItems: () => ({ total: 0 }),
  });

  return { acknowledgements, effects, probes, service };
}

test('probeProvider completes the provider call before persisting normalized evidence', async () => {
  const fixture = createFixture({
    probeResult: {
      attemptHistory: [{ attempt: 1, failureKind: null }],
      providerResponseId: 'response-1',
    },
  });

  const result = await fixture.service.probeProvider('stub');

  assert.deepEqual(fixture.effects, ['probe-call:stub', 'probe-save:stub']);
  assert.equal(fixture.probes[0].providerResponseId, 'response-1');
  assert.equal(fixture.probes[0].attemptHistory.length, 1);
  assert.equal(result.probeId, fixture.probes[0].id);
});

test('provider history keeps the established timestamp validation message', () => {
  const fixture = createFixture();

  assert.throws(
    () => fixture.service.getProviderExecutionHistory({ since: 'not-a-timestamp' }),
    /Invalid provider execution since timestamp: not-a-timestamp/,
  );
});

test('provider attention acknowledgement and resolution preserve store ordering', () => {
  const fixture = createFixture();
  fixture.probes.push({
    attempted: true,
    checkedAt: '2026-07-15T00:00:00.000Z',
    createdAt: '2026-07-15T00:00:00.000Z',
    failureKind: 'network',
    id: 'probe-failure',
    ok: false,
    providerId: 'stub',
    reason: 'fixture unavailable',
  });

  const pending = fixture.service.getProviderAttentionInbox().items[0];
  const acknowledged = fixture.service.acknowledgeProviderAttention(pending.actionId, { note: 'owner notified' });
  const resolved = fixture.service.resolveProviderAttention(pending.actionId, { note: 'fixture restored' });

  assert.deepEqual(fixture.effects, ['attention-save:acknowledged', 'attention-update:resolved']);
  assert.equal(acknowledged.actionId, pending.actionId);
  assert.equal(resolved.status, 'resolved');
  assert.throws(
    () => fixture.service.resolveProviderAttention(pending.actionId, { note: 'duplicate' }),
    /Provider attention already resolved/,
  );
});

test('probe attention remediation delegates to the probe lifecycle without mission execution', async () => {
  const fixture = createFixture();
  fixture.probes.push({
    attempted: true,
    checkedAt: '2026-07-15T00:00:00.000Z',
    createdAt: '2026-07-15T00:00:00.000Z',
    failureKind: 'network',
    id: 'probe-failure',
    ok: false,
    providerId: 'stub',
    reason: 'fixture unavailable',
  });
  const actionId = fixture.service.getProviderAttentionInbox().items[0].actionId;

  const result = await fixture.service.remediateProviderAttention(actionId);

  assert.deepEqual(fixture.effects, ['probe-call:stub', 'probe-save:stub']);
  assert.equal(result.remediationKind, 'probe');
  assert.equal(result.result.ok, true);
  assert.equal(result.permissionDecision.id, `${actionId}:permission`);
});
