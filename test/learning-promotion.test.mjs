import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createLearningPromotion } from '../src/core/learning-promotion.mjs';

const FIXED_NOW = '2026-07-03T00:00:00.000Z';

// Mutable fake store faithful to the write/read surface the promotion domain touches:
//   store.getLearningCandidate(id)
//   store.listLearningCandidates(filter)
//   store.updateLearningCandidate(id, updater)  <- WRITE: records every write
function createFakeStore(candidateList = []) {
  const candidates = new Map(candidateList.map((candidate) => [candidate.id, candidate]));
  const effects = [];
  const memoryEntries = [];
  const writes = [];
  return {
    effects,
    memoryEntries,
    writes,
    getMission: (id) => (id ? { id, mode: 'auto', status: 'completed', title: 'Mission', workspaceId: 'ws-1' } : null),
    getWorkspace: (id) => (id ? { id, name: 'Workspace' } : null),
    getLearningCandidate: (id) => candidates.get(id) || null,
    listMemoryEntries: ({ scope, scopeId } = {}) =>
      memoryEntries.filter((entry) => (!scope || entry.scope === scope) && (!scopeId || entry.scopeId === scopeId)),
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
      effects.push(`store:${id}`);
      return next;
    },
  };
}

function makePromotion(store, overrides = {}) {
  const memoryEntries = store.memoryEntries;
  const deletedMemory = [];
  const artifactWrites = [];

  const promotion = createLearningPromotion({
    store,
    addMemoryEntry: (entry) => {
      const saved = { id: `memory-${memoryEntries.length + 1}`, ...entry };
      memoryEntries.push(saved);
      store.effects.push(`memory-add:${saved.id}`);
      return saved;
    },
    deleteMemory: (args) => {
      deletedMemory.push(args);
      store.effects.push(`memory-delete:${args.memoryId}`);
      const index = memoryEntries.findIndex((entry) => entry.id === args.memoryId);
      const [removed] = index >= 0 ? memoryEntries.splice(index, 1) : [];
      return removed || { id: args.memoryId, deleted: true };
    },
    getMission: (id) => ({ id, workspaceId: 'ws-1', status: 'completed', title: 'Mission', mode: 'auto' }),
    getWorkspace: (id) => ({ id, name: 'Workspace' }),
    writeUpdatedLearningCandidateArtifact: (candidate) => {
      artifactWrites.push(candidate.id);
      store.effects.push(`artifact:${candidate.id}`);
    },
    ...overrides,
  });

  return { promotion, memoryEntries, deletedMemory, artifactWrites };
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
  assert.deepEqual(store.effects, ['memory-add:memory-1', 'store:lc-1', 'artifact:lc-1']);
});

test('workspace promotion remains default-deny without a separate scope authorization', () => {
  const store = createFakeStore([validCandidate()]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  assert.throws(
    () => promotion.resolveLearningPromotion('lc-1', {
      decision: 'approve',
      note: 'promote across the workspace',
      scope: 'workspace',
      target: 'memory',
    }),
    /cross-scope promotion is not enabled/,
  );
  assert.deepEqual(store.effects, []);
});

test('scope authorization records operator intent before workspace promotion', () => {
  const candidate = validCandidate({
    evidence: {
      artifactIds: ['a-1'],
      gatewayEventId: 'gw-1',
      reviewerVerdict: 'pass',
      runIds: ['r-1'],
    },
    retention: {
      expiresAt: '2026-08-01T00:00:00.000Z',
      policy: 'pending-review-expires-unpromoted',
    },
  });
  const store = createFakeStore([candidate]);
  const { promotion, memoryEntries } = makePromotion(store, { now: () => FIXED_NOW });

  const authorization = promotion.authorizeLearningPromotionScope('lc-1', {
    note: 'Reuse this reviewed decision for sibling missions.',
    scope: 'workspace',
  });
  const result = promotion.resolveLearningPromotion('lc-1', {
    decision: 'approve',
    note: 'Apply the reviewed workspace decision.',
    scope: 'workspace',
    target: 'memory',
  });

  assert.equal(authorization.scopeAuthorization.status, 'authorized');
  assert.equal(authorization.scopeAuthorization.fromScope, 'mission');
  assert.equal(authorization.scopeAuthorization.toScope, 'workspace');
  assert.equal(authorization.scopeAuthorization.toScopeId, 'ws-1');
  assert.equal(authorization.learningCandidate.safety.crossScopePromotionAllowed, true);
  assert.equal(memoryEntries.length, 1);
  assert.equal(memoryEntries[0].scope, 'workspace');
  assert.equal(memoryEntries[0].scopeId, 'ws-1');
  assert.equal(result.learningCandidate.promotionStatus, 'promoted');
  assert.equal(result.learningCandidate.promotionScopeAuthorization.status, 'consumed');
  assert.equal(
    result.learningCandidate.promotionDecision.scopeAuthorizationId,
    authorization.scopeAuthorization.id,
  );
  assert.equal(
    result.learningCandidate.promotionVerification.evidence.scopeAuthorizationId,
    authorization.scopeAuthorization.id,
  );
  assert.deepEqual(store.effects, [
    'store:lc-1',
    'artifact:lc-1',
    'memory-add:memory-1',
    'store:lc-1',
    'artifact:lc-1',
  ]);
});

test('scope authorization supports local single-user promotion across workspaces', () => {
  const candidate = validCandidate({
    evidence: {
      artifactIds: ['a-1'],
      gatewayEventId: 'gw-1',
      reviewerVerdict: 'pass',
      runIds: ['r-1'],
    },
    retention: {
      expiresAt: '2026-08-01T00:00:00.000Z',
      policy: 'pending-review-expires-unpromoted',
    },
  });
  const store = createFakeStore([candidate]);
  const { promotion, memoryEntries } = makePromotion(store, { now: () => FIXED_NOW });

  const authorization = promotion.authorizeLearningPromotionScope('lc-1', {
    note: 'Reuse this reviewed decision for the local user.',
    scope: 'user',
  });
  const result = promotion.resolveLearningPromotion('lc-1', {
    decision: 'approve',
    note: 'Apply the reviewed local user decision.',
    scope: 'user',
    target: 'memory',
  });

  assert.equal(authorization.scopeAuthorization.toScope, 'user');
  assert.equal(authorization.scopeAuthorization.toScopeId, 'user');
  assert.equal(memoryEntries[0].scope, 'user');
  assert.equal(memoryEntries[0].scopeId, 'user');
  assert.equal(result.learningCandidate.promotionScopeAuthorization.status, 'consumed');
});

test('scope authorization blocks global user promotion from a tenant-bound workspace', () => {
  const candidate = validCandidate({
    evidence: {
      artifactIds: ['a-1'],
      gatewayEventId: 'gw-1',
      reviewerVerdict: 'pass',
      runIds: ['r-1'],
    },
    retention: {
      expiresAt: '2026-08-01T00:00:00.000Z',
      policy: 'pending-review-expires-unpromoted',
    },
  });
  const store = createFakeStore([candidate]);
  const { promotion } = makePromotion(store, {
    getWorkspace: (id) => ({ id, name: 'Tenant workspace', tenantId: 'tenant-1' }),
    now: () => FIXED_NOW,
  });

  assert.throws(
    () => promotion.authorizeLearningPromotionScope('lc-1', {
      note: 'This must not become a global user decision.',
      scope: 'user',
    }),
    /limited to local workspaces without a tenant binding/,
  );
  assert.deepEqual(store.effects, []);
});

test('mission-scoped resolution does not consume an unused workspace authorization', () => {
  const candidate = validCandidate({
    evidence: {
      artifactIds: ['a-1'],
      gatewayEventId: 'gw-1',
      reviewerVerdict: 'pass',
      runIds: ['r-1'],
    },
    retention: {
      expiresAt: '2026-08-01T00:00:00.000Z',
      policy: 'pending-review-expires-unpromoted',
    },
  });
  const store = createFakeStore([candidate]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  const authorization = promotion.authorizeLearningPromotionScope('lc-1', {
    note: 'Authorize workspace reuse if the operator selects that scope.',
    scope: 'workspace',
  });
  const result = promotion.resolveLearningPromotion('lc-1', {
    decision: 'approve',
    note: 'Keep this promotion inside the source mission.',
    scope: 'mission',
    target: 'memory',
  });

  assert.equal(result.learningCandidate.promotionScopeAuthorization.status, 'authorized');
  assert.equal(result.learningCandidate.promotionScopeAuthorization.consumedAt, undefined);
  assert.equal(result.learningCandidate.promotionDecision.scopeAuthorizationId, undefined);
  assert.equal(result.learningCandidate.promotionVerification.evidence.scopeAuthorizationId, undefined);
  assert.equal(
    authorization.scopeAuthorization.id,
    result.learningCandidate.promotionScopeAuthorization.id,
  );
});

test('scope authorization rejects missing note or incomplete reviewer evidence before writing', () => {
  const store = createFakeStore([validCandidate()]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  assert.throws(
    () => promotion.authorizeLearningPromotionScope('lc-1', { scope: 'workspace' }),
    /requires an explicit note/,
  );
  assert.throws(
    () => promotion.authorizeLearningPromotionScope('lc-1', {
      note: 'missing reviewer proof',
      scope: 'workspace',
    }),
    /authorization evidence is incomplete/,
  );
  assert.deepEqual(store.effects, []);
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
  assert.deepEqual(store.effects, ['store:lc-1', 'artifact:lc-1']);
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
  assert.deepEqual(store.effects, ['store:lc-1', 'artifact:lc-1']);
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
  assert.deepEqual(store.effects, ['store:lc-past', 'artifact:lc-past']);
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

// ---------------------------------------------------------------------------
// queue, reminder, and rollback lifecycle
// ---------------------------------------------------------------------------

test('getLearningPromotionQueue: filters candidates and preserves the operator payload', () => {
  const store = createFakeStore([
    validCandidate({ id: 'lc-pending' }),
    validCandidate({ id: 'lc-rejected', promotionStatus: 'rejected' }),
  ]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.getLearningPromotionQueue({ missionId: 'm-1', status: 'pending-review' });

  assert.equal(result.filters.missionId, 'm-1');
  assert.equal(result.filters.status, 'pending-review');
  assert.equal(result.summary.total, 1);
  assert.equal(result.summary.pendingCount, 1);
  assert.equal(result.items[0].actionId, 'learning-promotion:lc-pending');
  assert.equal(result.items[0].recommendedOwner, 'human-approver');
  assert.match(result.items[0].resolveCommand, /resolve-learning-promotion lc-pending/);
});

test('getLearningPromotionQueue: exposes content-free user override state and commands', () => {
  const store = createFakeStore([
    validCandidate({ id: 'lc-promoted', promotionStatus: 'promoted' }),
  ]);
  const readModel = {
    candidateId: 'lc-promoted',
    current: {
      expiresAt: '2026-07-20T00:00:00.000Z',
      id: 'override-1',
      memoryId: 'memory-1',
      noteHash: 'a'.repeat(64),
      setAt: FIXED_NOW,
      status: 'active',
    },
    historyCount: 1,
    memoryId: 'memory-1',
    observedAt: FIXED_NOW,
    scope: 'user',
    scopeId: 'user',
    sourceWorkspaceId: 'ws-1',
    status: 'active',
  };
  const { promotion } = makePromotion(store, {
    getUserLearningSelectionOverrideReadModel: () => readModel,
    now: () => FIXED_NOW,
  });

  const result = promotion.getLearningPromotionQueue({ status: 'operator-active' });

  assert.equal(result.items[0].userLearningSelectionOverride, readModel);
  assert.match(
    result.items[0].userLearningSelectionOverrideSetCommand,
    /set-user-learning-selection-override lc-promoted/,
  );
  assert.match(
    result.items[0].userLearningSelectionOverrideClearCommand,
    /clear-user-learning-selection-override lc-promoted/,
  );
  assert.equal(JSON.stringify(result.items[0]).includes('raw note'), false);
});

test('getLearningPromotionQueue: rejects an unsupported status after scope validation', () => {
  const store = createFakeStore([validCandidate()]);
  const calls = [];
  const { promotion } = makePromotion(store, {
    getWorkspace: (id) => {
      calls.push(`workspace:${id}`);
      return { id };
    },
  });

  assert.throws(
    () => promotion.getLearningPromotionQueue({ status: 'unknown', workspaceId: 'ws-1' }),
    /Unsupported learning promotion status/,
  );
  assert.deepEqual(calls, ['workspace:ws-1']);
});

test('remindLearningPromotionStopConditions: writes the candidate before its artifact and returns reminder detail', () => {
  const store = createFakeStore([
    validCandidate({
      promotionStatus: 'verification-blocked',
      promotionStopCondition: {
        blockedAt: '2026-06-01T00:00:00.000Z',
        reason: 'learning-promotion-verification-no-raw-secrets',
        reminders: [],
        status: 'blocked',
      },
    }),
  ]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.remindLearningPromotionStopConditions({ dueOnly: true, missionId: 'm-1' }, 'review');

  assert.equal(result.summary.remindedCount, 1);
  assert.equal(result.items[0].reminderCount, 1);
  assert.equal(result.items[0].latestReminder.remindedAt, FIXED_NOW);
  assert.match(result.items[0].reminderDetail, /review/);
  assert.deepEqual(store.effects, ['store:lc-1', 'artifact:lc-1']);
});

test('remindLearningPromotionStopConditions: rejects an unsupported owner before writing', () => {
  const store = createFakeStore([validCandidate({ promotionStatus: 'verification-blocked' })]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  assert.throws(
    () => promotion.remindLearningPromotionStopConditions({ owner: 'unknown' }),
    /Unsupported action owner/,
  );
  assert.deepEqual(store.effects, []);
});

test('rollbackLearningPromotion: deletes promoted memory before updating the candidate and artifact', () => {
  const store = createFakeStore([
    validCandidate({
      promotionStatus: 'promoted',
      promotionDecision: {
        decision: 'approve',
        memoryId: 'memory-1',
        scope: 'mission',
        scopeId: 'm-1',
        target: 'memory',
      },
    }),
  ]);
  store.memoryEntries.push({ id: 'memory-1', scope: 'mission', scopeId: 'm-1' });
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  const result = promotion.rollbackLearningPromotion('lc-1', { note: 'regression' });

  assert.equal(result.learningCandidate.promotionStatus, 'rolled-back');
  assert.equal(result.learningCandidate.promotionRollback.memoryRollbackStatus, 'memory-deleted');
  assert.equal(result.removedMemoryEntry.id, 'memory-1');
  assert.deepEqual(store.effects, ['memory-delete:memory-1', 'store:lc-1', 'artifact:lc-1']);
});

test('rollbackLearningPromotion: rejects candidates that are not rollback eligible', () => {
  const store = createFakeStore([validCandidate()]);
  const { promotion } = makePromotion(store, { now: () => FIXED_NOW });

  assert.throws(() => promotion.rollbackLearningPromotion('lc-1'), /is not rollback eligible/);
  assert.deepEqual(store.effects, []);
});
