import assert from 'node:assert/strict';
import test from 'node:test';

import { createMissionRunService } from '../src/core/mission-run-service.mjs';

const NOW = '2026-07-16T00:00:00.000Z';

function createFixture({ approvalKind = 'workspace_execution' } = {}) {
  const effects = [];
  const mission = {
    deliverableType: 'decision-memo',
    id: 'mission-1',
    status: 'awaiting_approval',
    title: 'Mission',
    workspaceId: 'workspace-1',
  };
  const workspace = { id: 'workspace-1', name: 'Workspace' };
  const session = { id: 'session-1', missionId: mission.id, status: 'awaiting_approval' };
  const approval = {
    id: 'approval-1',
    kind: approvalKind,
    missionId: mission.id,
    sessionId: session.id,
    status: 'pending',
  };
  const store = {
    getApproval(id) {
      effects.push(`approval-get:${id}`);
      return id === approval.id ? approval : null;
    },
    getSession(id) {
      effects.push(`session-get:${id}`);
      return id === session.id ? session : null;
    },
    listApprovals: () => [approval],
    listArtifactsBySession() {
      effects.push('artifact-list');
      return [{ id: 'artifact-1', kind: 'deliverable', path: '/deliverable.md' }];
    },
  };
  const harness = {
    addMemoryEntry() {
      effects.push('memory-add');
    },
    resolveApproval(id, resolution) {
      effects.push(`approval-resolve:${id}:${resolution.decision}`);
      return { ...approval, ...resolution, status: resolution.decision === 'approve' ? 'approved' : 'rejected' };
    },
    touchMission(id, status) {
      effects.push(`mission-touch:${status}`);
      return { ...mission, id, status };
    },
    updateSession(id, patch) {
      effects.push(`session-update:${patch.status}`);
      Object.assign(session, patch);
      return session;
    },
    writeArtifact(input) {
      effects.push(`artifact-write:${input.kind}`);
      return { id: `${input.kind}-1`, path: `/${input.fileName}` };
    },
  };
  const service = createMissionRunService({
    attachProviderFallbackSummary: (result) => result,
    buildExecutionContext: () => null,
    collectMissionAttachmentContext: () => [],
    collectRelevantMemoryEntries: () => [],
    completeExecutionLeaseApproval(input) {
      effects.push('execution-lease-closeout');
      return input;
    },
    createReviewerFollowUpRecord: () => null,
    emitLearningCandidate: () => null,
    fileSystem: {},
    getLatestParallelGroupState: () => null,
    getMission(id) {
      effects.push(`mission-get:${id}`);
      return mission;
    },
    getWorkspace(id) {
      effects.push(`workspace-get:${id}`);
      return workspace;
    },
    harness,
    isExecutionCapableMission: () => false,
    now: () => NOW,
    providerRegistry: {},
    recordGatewayEvent: () => null,
    store,
  });

  return { effects, service };
}

test('resolveApproval rejects an unsupported decision before reading approval state', () => {
  const fixture = createFixture();

  assert.throws(
    () => fixture.service.resolveApproval('approval-1', { decision: 'defer' }),
    /Unsupported approval decision: defer/,
  );
  assert.deepEqual(fixture.effects, []);
});

test('mission attachment context reads stored attachments through the injected filesystem', () => {
  const reads = [];
  const service = createMissionRunService({
    attachProviderFallbackSummary: (result) => result,
    buildExecutionContext: () => null,
    completeExecutionLeaseApproval: (result) => result,
    createReviewerFollowUpRecord: () => null,
    emitLearningCandidate: () => null,
    fileSystem: {
      readFileSync(filePath, encoding) {
        reads.push({ encoding, filePath });
        return 'attachment evidence';
      },
    },
    getMission: () => null,
    getWorkspace: () => null,
    harness: { listMemoryEntries: () => [] },
    isExecutionCapableMission: () => false,
    now: () => NOW,
    providerRegistry: {},
    recordGatewayEvent: () => null,
    store: {
      listMissionAttachments: () => [{ id: 'attachment-1', path: '/attachments/evidence.md' }],
    },
  });

  const context = service.collectMissionAttachmentContext('mission-1');

  assert.deepEqual(reads, [{ encoding: 'utf8', filePath: '/attachments/evidence.md' }]);
  assert.equal(context[0].promptContent, 'attachment evidence');
});

test('resolveApproval records approval and artifacts before memory and completed state', () => {
  const fixture = createFixture();

  const result = fixture.service.resolveApproval('approval-1', {
    decision: 'approve',
    reason: 'Approved by owner.',
  });

  assert.deepEqual(fixture.effects, [
    'approval-get:approval-1',
    'mission-get:mission-1',
    'workspace-get:workspace-1',
    'session-get:session-1',
    'artifact-list',
    'approval-resolve:approval-1:approve',
    'artifact-write:approval-resolution',
    'artifact-write:execution-handoff',
    'memory-add',
    'mission-touch:completed',
    'session-update:completed',
    'session-get:session-1',
  ]);
  assert.equal(result.mission.status, 'completed');
});

test('execution lease approval delegates only after resolution artifact audit', () => {
  const fixture = createFixture({ approvalKind: 'execution_lease' });

  fixture.service.resolveApproval('approval-1', { decision: 'approve', reason: 'Lease approved.' });

  assert.deepEqual(fixture.effects.slice(-3), [
    'approval-resolve:approval-1:approve',
    'artifact-write:approval-resolution',
    'execution-lease-closeout',
  ]);
});
