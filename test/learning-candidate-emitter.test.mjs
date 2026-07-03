import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createLearningCandidateEmitter } from '../src/core/learning-candidate-emitter.mjs';

const FIXED_NOW = '2026-07-03T00:00:00.000Z';

// Map-backed fake store faithful to the surface emitLearningCandidate touches:
//   getSession(id)
//   listLearningCandidates({ sessionId })
//   listAgentRunsBySession(id) / listArtifactsBySession(id)
//   saveLearningCandidate(candidate)          <- WRITE: records save
//   updateLearningCandidate(id, updater)      <- WRITE: records update
function createFakeStore({ sessions = [], candidates = [], agentRuns = {}, artifacts = {} } = {}) {
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const saves = [];
  const updates = [];
  return {
    saves,
    updates,
    getSession: (id) => sessionMap.get(id) || null,
    listLearningCandidates: ({ sessionId } = {}) =>
      [...candidateMap.values()].filter((candidate) => !sessionId || candidate.sessionId === sessionId),
    listAgentRunsBySession: (id) => agentRuns[id] || [],
    listArtifactsBySession: (id) => artifacts[id] || [],
    saveLearningCandidate: (candidate) => {
      candidateMap.set(candidate.id, candidate);
      saves.push(candidate);
      return candidate;
    },
    updateLearningCandidate: (id, updater) => {
      const current = candidateMap.get(id);
      if (!current) {
        throw new Error(`fake-store: candidate not found: ${id}`);
      }
      const next = updater(current);
      candidateMap.set(id, next);
      updates.push({ id, next });
      return next;
    },
  };
}

function makeEmitter(store, overrides = {}) {
  const writeArtifactCalls = [];
  const artifactWrites = [];
  const providerFailureLookups = [];

  const emitter = createLearningCandidateEmitter({
    store,
    now: () => FIXED_NOW,
    writeArtifact: (spec) => {
      writeArtifactCalls.push(spec);
      return { id: `artifact-${writeArtifactCalls.length}`, path: `/artifacts/${writeArtifactCalls.length}.json` };
    },
    getSessionProviderFailureSummary: (sessionId) => {
      providerFailureLookups.push(sessionId);
      return null;
    },
    writeUpdatedLearningCandidateArtifact: (candidate) => {
      artifactWrites.push(candidate.id);
    },
    ...overrides,
  });

  return { emitter, writeArtifactCalls, artifactWrites, providerFailureLookups };
}

const mission = { id: 'm-1', title: 'Ship the thing', status: 'failed' };
const workspace = { id: 'ws-1', name: 'Workspace' };
const session = { id: 's-1', provider: 'anthropic', sourceContext: {} };

// ---------------------------------------------------------------------------
// emitLearningCandidate
// ---------------------------------------------------------------------------

test('emitLearningCandidate: persists a new candidate, writes the reviewer artifact, and back-fills artifact ids', () => {
  const store = createFakeStore({ sessions: [session] });
  const { emitter, writeArtifactCalls, artifactWrites, providerFailureLookups } = makeEmitter(store);

  const result = emitter.emitLearningCandidate({
    mission,
    outcomeReason: 'ran out of retries',
    session,
    workspace,
  });

  // exactly one save then one update (the artifact back-fill)
  assert.equal(store.saves.length, 1);
  assert.equal(store.updates.length, 1);

  // candidate id carries the expected prefix and is threaded through consistently
  assert.match(result.id, /^learningcandidate_/);
  assert.equal(store.saves[0].id, result.id);
  assert.equal(result.missionId, 'm-1');
  assert.equal(result.sessionId, 's-1');
  assert.equal(result.workspaceId, 'ws-1');
  assert.equal(result.summary, 'ran out of retries');

  // reviewer artifact was written with the learning-candidate shape
  assert.equal(writeArtifactCalls.length, 1);
  assert.equal(writeArtifactCalls[0].kind, 'learning-candidate');
  assert.equal(writeArtifactCalls[0].role, 'reviewer');
  assert.equal(writeArtifactCalls[0].missionId, 'm-1');
  assert.equal(writeArtifactCalls[0].sessionId, 's-1');

  // artifact id/path back-filled from the writeArtifact result, updatedAt from fixed now
  assert.equal(result.artifactId, 'artifact-1');
  assert.equal(result.artifactPath, '/artifacts/1.json');
  assert.equal(result.updatedAt, FIXED_NOW);

  // the shared artifact writer was invoked for the final candidate
  assert.deepEqual(artifactWrites, [result.id]);

  // provider failure summary was looked up against the live session id
  assert.deepEqual(providerFailureLookups, ['s-1']);
});

test('emitLearningCandidate: dedupes — an existing candidate for the session is returned untouched', () => {
  const existing = { id: 'lc-existing', sessionId: 's-1', missionId: 'm-1', promotionStatus: 'pending-review' };
  const store = createFakeStore({ sessions: [session], candidates: [existing] });
  const { emitter, writeArtifactCalls, artifactWrites } = makeEmitter(store);

  const result = emitter.emitLearningCandidate({ mission, session, workspace });

  // returns the existing candidate and performs NO writes at all
  assert.equal(result, existing);
  assert.equal(store.saves.length, 0);
  assert.equal(store.updates.length, 0);
  assert.equal(writeArtifactCalls.length, 0);
  assert.deepEqual(artifactWrites, []);
});

test('emitLearningCandidate: resolves the live session via the store, not the passed-in stale session', () => {
  // caller hands a stale session object; the store holds the authoritative copy
  const staleSession = { id: 's-1', sourceContext: { gatewayEventId: 'stale' } };
  const liveSession = { id: 's-1', provider: 'anthropic', sourceContext: { gatewayEventId: 'gw-live' } };
  const store = createFakeStore({ sessions: [liveSession] });
  const { emitter } = makeEmitter(store);

  const result = emitter.emitLearningCandidate({ mission, session: staleSession, workspace });

  // evidence.gatewayEventId comes from the LIVE session fetched via store.getSession
  assert.equal(result.evidence.gatewayEventId, 'gw-live');
});

test('emitLearningCandidate: uses mission.status when missionStatus arg is empty', () => {
  const store = createFakeStore({ sessions: [session] });
  const { emitter } = makeEmitter(store);

  const result = emitter.emitLearningCandidate({ mission, session, workspace });

  assert.equal(result.missionStatus, 'failed');
});

test('emitLearningCandidate: threads provider failure summary into candidate evidence when present', () => {
  const store = createFakeStore({ sessions: [session] });
  const { emitter } = makeEmitter(store, {
    getSessionProviderFailureSummary: () => ({
      attemptCount: 3,
      failureKind: 'timeout',
      recoverable: false,
      role: 'executor',
      runId: 'run-9',
      timedOut: true,
    }),
  });

  const result = emitter.emitLearningCandidate({ mission, session, workspace });

  assert.equal(result.evidence.providerFailure.attemptCount, 3);
  assert.equal(result.evidence.providerFailure.failureKind, 'timeout');
  assert.equal(result.evidence.providerFailure.timedOut, true);
});

test('emitLearningCandidate: missing session in store surfaces a clear error (edge: unknown session)', () => {
  const store = createFakeStore({ sessions: [] });
  const { emitter } = makeEmitter(store);

  assert.throws(() => emitter.emitLearningCandidate({ mission, session, workspace }), TypeError);
});
