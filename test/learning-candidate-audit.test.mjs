import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createLearningCandidateAudit } from '../src/core/learning-candidate-audit.mjs';

// Minimal fake store: only the methods the audit domain reads.
// Real store surface used by this domain:
//   store.getMission(id), store.getWorkspace(id),
//   store.getSession(id), store.listLearningCandidates(filter)
function createFakeStore({ missions = {}, workspaces = {}, sessions = {}, candidates = [] } = {}) {
  return {
    getMission: (id) => missions[id] || null,
    getWorkspace: (id) => workspaces[id] || null,
    getSession: (id) => sessions[id] || null,
    listLearningCandidates: (filter = {}) =>
      candidates.filter((candidate) => {
        if (filter.missionId && candidate.missionId !== filter.missionId) return false;
        if (filter.sessionId && candidate.sessionId !== filter.sessionId) return false;
        if (filter.recordType && candidate.recordType !== filter.recordType) return false;
        if (filter.workspaceId && candidate.workspaceId !== filter.workspaceId) return false;
        if (filter.promotionStatus && candidate.promotionStatus !== filter.promotionStatus) return false;
        return true;
      }),
  };
}

// Injected pure helpers mirroring mission-service definitions (fixed for determinism).
const injectedHelpers = {
  getLearningPromotionExpirationPolicy: (candidate) => ({
    expired: candidate?.promotionStatus === 'expired',
    expiredAt: candidate?.promotionExpiration?.expiredAt || null,
    expiresAt: candidate?.retention?.expiresAt || null,
    policyId: candidate?.retention?.policy || 'pending-review-expires-unpromoted',
    reviewTtlHours: candidate?.retention?.reviewTtlHours || 72,
    status: candidate?.promotionStatus === 'expired' ? 'expired' : 'active',
  }),
  defaultLearningPromotionTarget: (candidate) => candidate?.proposal?.target || 'memory',
  learningPromotionPriority: (candidate) =>
    candidate.recordType === 'provider-lesson' ? 'high' : 'low',
  normalizeLearningPromotionTarget: (value) => {
    const normalized = String(value || 'memory').trim().replaceAll('_', '-');
    if (!['memory', 'skill', 'template'].includes(normalized)) {
      throw new Error(`Unsupported learning promotion target: ${normalized}`);
    }
    return normalized;
  },
  normalizeLearningPromotionScope: (value) => {
    const normalized = String(value || 'mission').trim();
    if (!['mission', 'workspace', 'user'].includes(normalized)) {
      throw new Error(`Unsupported learning promotion scope: ${normalized}`);
    }
    return normalized;
  },
};

function makeAudit(store, overrides = {}) {
  return createLearningCandidateAudit({
    store,
    getMission: (id) => store.getMission(id),
    getWorkspace: (id) => store.getWorkspace(id),
    ...injectedHelpers,
    ...overrides,
  });
}

const baseWorkspace = { id: 'ws-1', name: 'Workspace One' };
const baseMission = { id: 'm-1', workspaceId: 'ws-1', title: 'Mission One', status: 'completed' };

function makeCandidate(overrides = {}) {
  return {
    id: 'lc-1',
    missionId: 'm-1',
    workspaceId: 'ws-1',
    sessionId: 's-1',
    recordType: 'provider-lesson',
    promotionStatus: 'pending-review',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    proposal: { target: 'memory', approvalRequired: true, reviewerRequired: false },
    safety: { noRawSecrets: true, scopeLocked: true },
    evidence: {
      artifactIds: ['a-1', 'a-2'],
      runIds: ['r-1'],
      providerId: 'anthropic',
      providerFallbackStopReasonCounts: { 'provider-failure-only': 2 },
    },
    scope: 'mission',
    ...overrides,
  };
}

test('buildLearningCandidateAuditRecord', async (t) => {
  await t.test('returns null when the mission is missing', () => {
    const store = createFakeStore({ workspaces: { 'ws-1': baseWorkspace } });
    const { buildLearningCandidateAuditRecord } = makeAudit(store);
    assert.equal(buildLearningCandidateAuditRecord(makeCandidate({ missionId: 'nope' })), null);
  });

  await t.test('returns null when the workspace is missing', () => {
    const store = createFakeStore({ missions: { 'm-1': baseMission } });
    const { buildLearningCandidateAuditRecord } = makeAudit(store);
    assert.equal(buildLearningCandidateAuditRecord(makeCandidate()), null);
  });

  await t.test('maps candidate fields onto an audit record', () => {
    const store = createFakeStore({
      missions: { 'm-1': baseMission },
      workspaces: { 'ws-1': baseWorkspace },
    });
    const { buildLearningCandidateAuditRecord } = makeAudit(store);
    const record = buildLearningCandidateAuditRecord(makeCandidate());
    assert.equal(record.learningCandidateId, 'lc-1');
    assert.equal(record.missionId, 'm-1');
    assert.equal(record.missionTitle, 'Mission One');
    assert.equal(record.workspaceId, 'ws-1');
    assert.equal(record.workspaceName, 'Workspace One');
    assert.equal(record.artifactCount, 2);
    assert.equal(record.runCount, 1);
    assert.equal(record.priority, 'high'); // provider-lesson
    assert.equal(record.approvalRequired, true);
    assert.equal(record.promotionStatus, 'pending-review');
    assert.equal(record.rollbackEligible, false);
    assert.equal(record.providerId, 'anthropic');
  });

  await t.test('marks approved candidates as rollback eligible', () => {
    const store = createFakeStore({
      missions: { 'm-1': baseMission },
      workspaces: { 'ws-1': baseWorkspace },
    });
    const { buildLearningCandidateAuditRecord } = makeAudit(store);
    const record = buildLearningCandidateAuditRecord(makeCandidate({ promotionStatus: 'approved' }));
    assert.equal(record.rollbackEligible, true);
  });
});

test('summarizeLearningCandidateAudit', async (t) => {
  const store = createFakeStore({
    missions: { 'm-1': baseMission },
    workspaces: { 'ws-1': baseWorkspace },
  });
  const { buildLearningCandidateAuditRecord, summarizeLearningCandidateAudit } = makeAudit(store);

  await t.test('reports empty stop reason for zero records', () => {
    const summary = summarizeLearningCandidateAudit([]);
    assert.equal(summary.recordCount, 0);
    assert.equal(summary.stopReason, 'no-learning-candidates');
    assert.equal(summary.latestRecord, null);
    assert.deepEqual(summary.statusCounts, {});
  });

  await t.test('aggregates counts across records', () => {
    const records = [
      buildLearningCandidateAuditRecord(makeCandidate({ id: 'lc-1', promotionStatus: 'pending-review' })),
      buildLearningCandidateAuditRecord(
        makeCandidate({ id: 'lc-2', promotionStatus: 'approved', recordType: 'failure-pattern' }),
      ),
    ];
    const summary = summarizeLearningCandidateAudit(records, { workspaceId: 'ws-1' });
    assert.equal(summary.recordCount, 2);
    assert.equal(summary.stopReason, '');
    assert.equal(summary.promotionStatusCounts['pending-review'], 1);
    assert.equal(summary.promotionStatusCounts.approved, 1);
    assert.equal(summary.approvalRequiredCount, 2);
    assert.equal(summary.rollbackEligibleCount, 1);
    assert.equal(summary.workspaceCounts['ws-1'], 2);
    assert.equal(summary.providerCounts.anthropic, 2);
    assert.equal(summary.filter.workspaceId, 'ws-1');
    // latestRecord picks the newest updatedAt
    assert.ok(summary.latestRecord);
  });
});

test('getLearningCandidateAudit', async (t) => {
  await t.test('returns records and summary for a workspace filter', () => {
    const store = createFakeStore({
      missions: { 'm-1': baseMission },
      workspaces: { 'ws-1': baseWorkspace },
      candidates: [makeCandidate({ id: 'lc-1' }), makeCandidate({ id: 'lc-2', recordType: 'failure-pattern' })],
    });
    const { getLearningCandidateAudit } = makeAudit(store);
    const result = getLearningCandidateAudit({ workspaceId: 'ws-1' });
    assert.equal(result.records.length, 2);
    assert.equal(result.summary.recordCount, 2);
    assert.equal(result.summary.filter.workspaceId, 'ws-1');
  });

  await t.test('throws on an unsupported promotion status', () => {
    const store = createFakeStore({ missions: { 'm-1': baseMission }, workspaces: { 'ws-1': baseWorkspace } });
    const { getLearningCandidateAudit } = makeAudit(store);
    assert.throws(() => getLearningCandidateAudit({ status: 'made-up-status' }), /Unsupported learning candidate promotion status/);
  });

  await t.test('throws when the session does not exist', () => {
    const store = createFakeStore({ missions: { 'm-1': baseMission }, workspaces: { 'ws-1': baseWorkspace } });
    const { getLearningCandidateAudit } = makeAudit(store);
    assert.throws(() => getLearningCandidateAudit({ sessionId: 'ghost' }), /Session not found: ghost/);
  });

  await t.test('filters by provider fallback stop reason', () => {
    const store = createFakeStore({
      missions: { 'm-1': baseMission },
      workspaces: { 'ws-1': baseWorkspace },
      candidates: [
        makeCandidate({ id: 'lc-1' }),
        makeCandidate({
          id: 'lc-2',
          evidence: { artifactIds: [], runIds: [], providerFallbackStopReasonCounts: {} },
        }),
      ],
    });
    const { getLearningCandidateAudit } = makeAudit(store);
    const result = getLearningCandidateAudit({ providerFallbackStopReason: 'provider-failure-only' });
    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].learningCandidateId, 'lc-1');
  });

  await t.test('rejects a mission that does not belong to the workspace', () => {
    const store = createFakeStore({
      missions: { 'm-2': { id: 'm-2', workspaceId: 'ws-other', title: 'Other', status: 'completed' } },
      workspaces: { 'ws-1': baseWorkspace },
    });
    const { getLearningCandidateAudit } = makeAudit(store);
    assert.throws(
      () => getLearningCandidateAudit({ workspaceId: 'ws-1', missionId: 'm-2' }),
      /does not belong to workspace/,
    );
  });
});
