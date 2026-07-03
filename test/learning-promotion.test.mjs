import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createLearningPromotion } from '../src/core/learning-promotion.mjs';

const FIXED_NOW = '2026-07-03T00:00:00.000Z';

// Mutable fake store faithful to the write/read surface the mutation half touches:
//   store.getLearningCandidate(id)
//   store.listLearningCandidates(filter)
//   store.updateLearningCandidate(id, updater)  <- WRITE: records every write
function createFakeStore(candidateList = []) {
  const candidates = new Map(candidateList.map((candidate) => [candidate.id, candidate]));
  const writes = [];
  return {
    writes,
    getLearningCandidate: (id) => candidates.get(id) || null,
    listLearningCandidates: (filter = {}) =>
      [...candidates.values()].filter((candidate) => {
        if (filter.missionId && candidate.missionId !== filter.missionId) return false;
        if (filter.recordType && candidate.recordType !== filter.recordType) return false;
        if (filter.workspaceId && candidate.workspaceId !== filter.workspaceId) return false;
        if (filter.promotionStatus && candidate.promotionStatus !== filter.promotionStatus) return false;
        return true;
      }),
    updateLearningCandidate: (id, updater) => {
      const current = candidates.get(id);
      if (!current) {
        throw new Error(`fake-store: candidate not found: ${id}`);
      }
      const next = updater(current);
      candidates.set(id, next);
      writes.push({ id, next });
      return next;
    },
  };
}

// Injected pure helpers mirroring mission-service definitions (deterministic).
const scopeIdFor = (candidate, scope) =>
  scope === 'mission' ? candidate.missionId : scope === 'workspace' ? candidate.workspaceId : 'user';

function makePromotion(store, overrides = {}) {
  const memoryEntries = [];
  const deletedMemory = [];
  const artifactWrites = [];
  const queueItems = [];

  const promotion = createLearningPromotion({
    store,
    addMemoryEntry: (entry) => {
      const saved = { id: `memory-${memoryEntries.length + 1}`, ...entry };
      memoryEntries.push(saved);
      return saved;
    },
    deleteMemory: (args) => {
      deletedMemory.push(args);
      return { id: args.memoryId, deleted: true };
    },
    getMission: (id) => ({ id, workspaceId: 'ws-1', status: 'completed', title: 'Mission', mode: 'auto' }),
    getWorkspace: (id) => ({ id, name: 'Workspace' }),
    buildLearningPromotionQueueItem: (candidate) => {
      const item = { learningCandidateId: candidate.id, promotionStatus: candidate.promotionStatus };
      queueItems.push(item);
      return item;
    },
    writeUpdatedLearningCandidateArtifact: (candidate) => {
      artifactWrites.push(candidate.id);
    },
    resolveLearningPromotionScopeId: scopeIdFor,
    getLearningPromotionExpiresAt: (candidate) =>
      candidate?.retention?.expiresAt || candidate?.proposal?.expiresAt || null,
    getLearningPromotionExpirationPolicy: (candidate) => ({
      policyId: candidate?.retention?.policy || 'pending-review-expires-unpromoted',
      reviewTtlHours: candidate?.retention?.reviewTtlHours || 168,
    }),
    defaultLearningPromotionTarget: (candidate) => candidate?.proposal?.target || 'memory',
    normalizeLearningPromotionTarget: (value, fallback = 'memory') => {
      const normalized = String(value || fallback).trim().replaceAll('_', '-');
      if (!['memory', 'skill', 'template', 'provider-policy', 'automation'].includes(normalized)) {
        throw new Error(`Unsupported learning promotion target: ${normalized}`);
      }
      return normalized;
    },
    normalizeLearningPromotionScope: (value, fallback = 'mission') => {
      const normalized = String(value || fallback).trim();
      if (!['user', 'workspace', 'mission'].includes(normalized)) {
        throw new Error(`Unsupported learning promotion scope: ${normalized}`);
      }
      return normalized;
    },
    ...overrides,
  });

  return { promotion, memoryEntries, deletedMemory, artifactWrites, queueItems };
}

// A candidate that passes ALL verification checks (used for the happy path).
function validCandidate(overrides = {}) {
  return {
    id: 'lc-1',
    missionId: 'm-1',
    workspaceId: 'ws-1',
    sessionId: 's-1',
    scope: 'mission',
    scopeId: 'm-1',
    summary: 'Learned lesson',
    title: 'candidate for mission',
    recordType: 'failure-pattern',
    promotionStatus: 'pending-review',
    autoPromotion: false,
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    evidence: { gatewayEventId: 'gw-1', artifactIds: ['a-1'], runIds: ['r-1'] },
    safety: {
      scopeLocked: true,
      crossScopePromotionAllowed: false,
      noRawSecrets: true,
      noRawCustomerPayloads: true,
    },
    proposal: { approvalRequired: true, reviewerRequired: true, target: 'memory' },
    retention: { policy: 'pending-review-expires-unpromoted', expiresAt: '2026-06-08T00:00:00.000Z' },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// resolveLearningPromotion
// ---------------------------------------------------------------------------

test('resolveLearningPromotion: approve+memory writes a memory entry and marks promoted', () => {
  const candidate = validCandidate();
  const store = createFakeStore([candidate]);
  const { promotion, memoryEntries, artifactWrites } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.resolveLearningPromotion('lc-1', { decision: 'approve', target: 'memory', note: 'ship it' });

  // memory write happened with the resolved scope/kind
  assert.equal(memoryEntries.length, 1);
  assert.equal(memoryEntries[0].scope, 'mission');
  assert.equal(memoryEntries[0].scopeId, 'm-1');
  assert.equal(memoryEntries[0].kind, 'decision');

  // store write recorded the promoted status + decision + memory rollback target
  const written = store.writes.at(-1).next;
  assert.equal(written.promotionStatus, 'promoted');
  assert.equal(written.promotionDecision.decision, 'approve');
  assert.equal(written.promotionDecision.memoryId, memoryEntries[0].id);
  assert.equal(written.promotionDecision.rollback.action, 'delete-memory-entry');
  assert.equal(written.updatedAt, FIXED_NOW);

  assert.equal(result.memoryEntry.id, memoryEntries[0].id);
  assert.deepEqual(artifactWrites, ['lc-1']);
});

test('resolveLearningPromotion: reject writes decision without touching memory', () => {
  const candidate = validCandidate();
  const store = createFakeStore([candidate]);
  const { promotion, memoryEntries } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.resolveLearningPromotion('lc-1', { decision: 'reject' });

  assert.equal(memoryEntries.length, 0);
  const written = store.writes.at(-1).next;
  assert.equal(written.promotionStatus, 'rejected');
  assert.equal(written.promotionDecision.decision, 'reject');
  assert.equal(result.memoryEntry, null);
});

test('resolveLearningPromotion: verification failure blocks and never persists memory (edge: missing safety)', () => {
  // scope-locked / no-raw-secrets checks fail -> pre-mutation verification blocks
  const candidate = validCandidate({ safety: { scopeLocked: false, noRawSecrets: false } });
  const store = createFakeStore([candidate]);
  const { promotion, memoryEntries } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.resolveLearningPromotion('lc-1', { decision: 'approve', target: 'memory' });

  assert.equal(memoryEntries.length, 0, 'no memory should be written when verification blocks');
  const written = store.writes.at(-1).next;
  assert.equal(written.promotionStatus, 'verification-blocked');
  assert.equal(written.promotionDecision.decision, 'blocked');
  assert.ok(written.promotionStopCondition.reason.startsWith('learning-promotion-verification-'));
  assert.equal(result.memoryEntry, null);
});

test('resolveLearningPromotion: verification-blocked candidate only accepts reject', () => {
  const candidate = validCandidate({ promotionStatus: 'verification-blocked' });
  const store = createFakeStore([candidate]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  assert.throws(
    () => promotion.resolveLearningPromotion('lc-1', { decision: 'approve' }),
    /only --decision reject can close the stop-condition/,
  );

  const result = promotion.resolveLearningPromotion('lc-1', { decision: 'reject', note: 'abandon' });
  const written = store.writes.at(-1).next;
  assert.equal(written.promotionStatus, 'rejected');
  assert.equal(written.promotionStopCondition.resolution, 'rejected');
  assert.equal(result.learningCandidate.promotionStatus, 'rejected');
});

test('resolveLearningPromotion: unknown candidate throws (edge: not found)', () => {
  const store = createFakeStore([]);
  const { promotion } = makePromotion(store);
  assert.throws(() => promotion.resolveLearningPromotion('missing', { decision: 'approve' }), /not found/);
});

test('resolveLearningPromotion: invalid decision throws (edge: bad input)', () => {
  const store = createFakeStore([validCandidate()]);
  const { promotion } = makePromotion(store);
  assert.throws(
    () => promotion.resolveLearningPromotion('lc-1', { decision: 'maybe' }),
    /Unsupported learning promotion decision/,
  );
});

test('resolveLearningPromotion: already-resolved (promoted) candidate is not pending review', () => {
  const store = createFakeStore([validCandidate({ promotionStatus: 'promoted' })]);
  const { promotion } = makePromotion(store);
  assert.throws(
    () => promotion.resolveLearningPromotion('lc-1', { decision: 'approve' }),
    /is not pending review/,
  );
});

// ---------------------------------------------------------------------------
// expireLearningPromotions
// ---------------------------------------------------------------------------

test('expireLearningPromotions: expires only candidates past the cutoff (expiration boundary)', () => {
  const store = createFakeStore([
    validCandidate({ id: 'lc-past', retention: { policy: 'p', expiresAt: '2026-06-01T00:00:00.000Z' } }),
    validCandidate({ id: 'lc-future', retention: { policy: 'p', expiresAt: '2027-01-01T00:00:00.000Z' } }),
  ]);
  const { promotion, artifactWrites } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.expireLearningPromotions({ before: '2026-06-15T00:00:00.000Z' });

  assert.equal(result.summary.expiredCount, 1);
  assert.equal(result.expiredCandidates[0].id, 'lc-past');
  assert.equal(result.expiredCandidates[0].promotionStatus, 'expired');

  // exactly one store write + one artifact write, for the past candidate only
  assert.equal(store.writes.length, 1);
  assert.equal(store.writes[0].id, 'lc-past');
  assert.equal(store.writes[0].next.promotionExpiration.cutoffAt, '2026-06-15T00:00:00.000Z');
  assert.equal(store.writes[0].next.updatedAt, FIXED_NOW);
  assert.deepEqual(artifactWrites, ['lc-past']);
});

test('expireLearningPromotions: empty candidate list yields zero expirations, no writes', () => {
  const store = createFakeStore([]);
  const { promotion, artifactWrites } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.expireLearningPromotions({ before: FIXED_NOW });

  assert.equal(result.summary.expiredCount, 0);
  assert.deepEqual(result.expiredCandidates, []);
  assert.equal(store.writes.length, 0);
  assert.deepEqual(artifactWrites, []);
});

test('expireLearningPromotions: scope/target filters exclude non-matching candidates', () => {
  const store = createFakeStore([
    validCandidate({ id: 'lc-a', scope: 'mission', proposal: { target: 'memory' }, retention: { policy: 'p', expiresAt: '2026-06-01T00:00:00.000Z' } }),
    validCandidate({ id: 'lc-b', scope: 'workspace', proposal: { target: 'skill' }, retention: { policy: 'p', expiresAt: '2026-06-01T00:00:00.000Z' } }),
  ]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.expireLearningPromotions({ before: '2026-07-01T00:00:00.000Z', target: 'skill', scope: 'workspace' });

  assert.equal(result.summary.expiredCount, 1);
  assert.equal(result.expiredCandidates[0].id, 'lc-b');
  assert.equal(result.filters.target, 'skill');
  assert.equal(result.filters.scope, 'workspace');
});

test('expireLearningPromotions: invalid target throws (edge: bad input)', () => {
  const store = createFakeStore([validCandidate()]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });
  assert.throws(
    () => promotion.expireLearningPromotions({ before: FIXED_NOW, target: 'nonsense' }),
    /Unsupported learning promotion target/,
  );
});
