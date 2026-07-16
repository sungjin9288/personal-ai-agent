import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createWorkspaceLearningSelectionService } from '../src/core/workspace-learning-selection-service.mjs';

function buildEligibleCandidate() {
  return {
    id: 'candidate-older',
    missionId: 'mission-source',
    promotionDecision: {
      decision: 'approve',
      memoryId: 'memory-older',
      scope: 'workspace',
      scopeId: 'workspace-a',
      target: 'memory',
    },
    promotionScopeAuthorization: { status: 'consumed' },
    promotionStatus: 'promoted',
    promotionVerification: { status: 'passed' },
    workspaceId: 'workspace-a',
  };
}

function createFixture({ candidate = buildEligibleCandidate() } = {}) {
  const calls = [];
  let storedCandidate = structuredClone(candidate);
  const service = createWorkspaceLearningSelectionService({
    getMission(missionId) {
      assert.equal(missionId, 'mission-source');
      return { id: missionId, workspaceId: 'workspace-a' };
    },
    getWorkspace(workspaceId) {
      assert.equal(workspaceId, 'workspace-a');
      return { id: workspaceId };
    },
    now: () => '2026-07-17T01:00:00.000Z',
    store: {
      listLearningCandidates: () => [storedCandidate],
      listMemoryEntries: () => [{
        id: 'memory-older',
        kind: 'decision',
        scope: 'workspace',
        scopeId: 'workspace-a',
      }],
      updateLearningCandidate(candidateId, updater) {
        calls.push(`store:${candidateId}`);
        storedCandidate = updater(storedCandidate);
        return storedCandidate;
      },
    },
    writeUpdatedLearningCandidateArtifact(updatedCandidate) {
      calls.push(`artifact:${updatedCandidate.id}`);
    },
  });
  return { calls, getCandidate: () => storedCandidate, service };
}

test('workspace learning override records permission-bound set and clear history in order', () => {
  const fixture = createFixture();

  const setResult = fixture.service.setWorkspaceLearningSelectionOverride('candidate-older', {
    expiresAt: '2026-07-17T02:00:00.000Z',
    note: 'Keep the reviewed broad decision during the incident window.',
  });
  assert.equal(setResult.selectionOverride.status, 'active');
  assert.equal(setResult.selectionOverride.setBy, 'local-operator');
  assert.match(setResult.selectionOverride.noteHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(fixture.calls, ['store:candidate-older', 'artifact:candidate-older']);

  fixture.calls.length = 0;
  const clearResult = fixture.service.clearWorkspaceLearningSelectionOverride('candidate-older', {
    note: 'Return to the latest reviewed workspace decision.',
  });
  assert.equal(clearResult.selectionOverride.status, 'cleared');
  assert.equal(clearResult.selectionOverride.clearedBy, 'local-operator');
  assert.deepEqual(
    fixture.getCandidate().workspaceLearningSelectionOverrideHistory.map((entry) => entry.action),
    ['set', 'clear'],
  );
  assert.deepEqual(fixture.calls, ['store:candidate-older', 'artifact:candidate-older']);
});

test('workspace learning override read model is content-free and reflects effective clock state', () => {
  const fixture = createFixture();

  assert.deepEqual(
    fixture.service.getWorkspaceLearningSelectionOverrideReadModel('candidate-older'),
    {
      candidateId: 'candidate-older',
      current: null,
      historyCount: 0,
      memoryId: 'memory-older',
      observedAt: '2026-07-17T01:00:00.000Z',
      status: 'not-set',
      workspaceId: 'workspace-a',
    },
  );

  fixture.service.setWorkspaceLearningSelectionOverride('candidate-older', {
    expiresAt: '2026-07-17T02:00:00.000Z',
    note: 'Keep the reviewed decision for one hour.',
  });
  const readModel = fixture.service.getWorkspaceLearningSelectionOverrideReadModel('candidate-older');

  assert.equal(readModel.status, 'active');
  assert.equal(readModel.historyCount, 1);
  assert.equal(readModel.current.memoryId, 'memory-older');
  assert.match(readModel.current.noteHash, /^[a-f0-9]{64}$/);
  assert.equal('note' in readModel.current, false);
});

test('workspace learning override read model hides ineligible promotions', () => {
  const candidate = buildEligibleCandidate();
  candidate.promotionVerification.status = 'failed';
  const fixture = createFixture({ candidate });

  assert.equal(
    fixture.service.getWorkspaceLearningSelectionOverrideReadModel('candidate-older'),
    null,
  );
});

test('workspace learning override validates permission evidence before mutation', () => {
  const candidate = buildEligibleCandidate();
  candidate.promotionVerification.status = 'failed';
  const fixture = createFixture({ candidate });

  assert.throws(
    () => fixture.service.setWorkspaceLearningSelectionOverride('candidate-older', {
      expiresAt: '2026-07-17T02:00:00.000Z',
      note: 'Do not apply this unverified override.',
    }),
    /evidence is incomplete/,
  );
  assert.deepEqual(fixture.calls, []);
});

test('workspace learning override rejects empty notes and non-future expiration before mutation', () => {
  const fixture = createFixture();

  assert.throws(
    () => fixture.service.setWorkspaceLearningSelectionOverride('candidate-older', {
      expiresAt: '2026-07-17T02:00:00.000Z',
      note: '   ',
    }),
    /note is required/,
  );
  assert.throws(
    () => fixture.service.setWorkspaceLearningSelectionOverride('candidate-older', {
      expiresAt: '2026-07-17T00:59:59.000Z',
      note: 'Expired before it was set.',
    }),
    /must be in the future/,
  );
  assert.deepEqual(fixture.calls, []);
});

test('workspace learning override clear requires an active override and explicit note', () => {
  const fixture = createFixture();
  assert.throws(
    () => fixture.service.clearWorkspaceLearningSelectionOverride('candidate-older', {
      note: 'Nothing to clear.',
    }),
    /is not active/,
  );

  fixture.service.setWorkspaceLearningSelectionOverride('candidate-older', {
    expiresAt: '2026-07-17T02:00:00.000Z',
    note: 'Temporary override.',
  });
  fixture.calls.length = 0;
  assert.throws(
    () => fixture.service.clearWorkspaceLearningSelectionOverride('candidate-older'),
    /clear note is required/,
  );
  assert.deepEqual(fixture.calls, []);
});

test('workspace learning override rejects secret and raw customer notes before mutation', () => {
  const fixture = createFixture();

  assert.throws(
    () => fixture.service.setWorkspaceLearningSelectionOverride('candidate-older', {
      expiresAt: '2026-07-17T02:00:00.000Z',
      note: 'api_key=sk-example-secret-value-1234567890',
    }),
    /cannot contain raw secrets/,
  );
  assert.throws(
    () => fixture.service.setWorkspaceLearningSelectionOverride('candidate-older', {
      expiresAt: '2026-07-17T02:00:00.000Z',
      note: 'customerEmail=user@example.com',
    }),
    /cannot contain raw customer payloads/,
  );
  assert.deepEqual(fixture.calls, []);
});
