import assert from 'node:assert/strict';
import test from 'node:test';

import { buildMissionHarnessSummary } from '../src/core/mission-harness-summary.mjs';

function createInput(overrides = {}) {
  const emptyGraph = { edges: [], nodes: [], summary: { activeNodeCount: 0 } };
  return {
    actionInbox: { summary: { pendingActionCount: 0 } },
    allFactGraph: emptyGraph,
    documentRegistry: { items: [], recentEntries: [] },
    latestArtifact: { createdAt: '2026-07-01T00:00:00.000Z', id: 'artifact-1', kind: 'deliverable' },
    latestRetrievalArtifact: null,
    latestRetrievalSession: null,
    latestRetrievalSummary: null,
    learningCandidates: [],
    missionAttachments: [],
    missionFactGraph: emptyGraph,
    missionMemoryEntries: [{ id: 'memory-1' }],
    retrievalCompare: { status: 'no-evidence' },
    retrievalPreview: { previewItems: [], roles: [], summary: {} },
    rootDir: '/repo',
    summary: {
      approvalCounts: { pending: 0 },
      maintenanceRequiredCount: 0,
      memoryCounts: { decision: 0, fact: 1, preference: 0, total: 1 },
      providerHealthDriftStatus: 'stable',
    },
    workspaceFactGraph: emptyGraph,
    workspaceMemoryEntries: [],
    ...overrides,
  };
}

test('harness summary emits recommendations in operational priority order', () => {
  const result = buildMissionHarnessSummary(createInput({
    actionInbox: { summary: { pendingActionCount: 3 } },
    latestArtifact: null,
    missionMemoryEntries: [],
    summary: {
      approvalCounts: { pending: 2 },
      maintenanceRequiredCount: 4,
      memoryCounts: { decision: 0, fact: 0, preference: 0, total: 0 },
      providerHealthDriftStatus: 'drifted',
    },
  }));

  assert.deepEqual(result.recommendations.map((item) => item.code), [
    'missing-artifact',
    'pending-approvals',
    'pending-actions',
    'maintenance-required',
    'provider-health-drift',
    'empty-memory',
  ]);
  assert.match(result.recommendations[1].title, /2건/);
  assert.match(result.recommendations[2].title, /3건/);
  assert.match(result.recommendations[3].title, /4건/);
});

test('harness summary keeps document, attachment, and operating loop payloads stable', () => {
  const result = buildMissionHarnessSummary(createInput({
    actionInbox: { summary: { pendingActionCount: 2 } },
    documentRegistry: {
      items: [{ id: 'roadmap' }],
      recentEntries: [{ id: 'document-1' }],
    },
    latestArtifact: {
      createdAt: '2026-07-03T00:00:00.000Z',
      fileName: 'deliverable.md',
      id: 'artifact-1',
      kind: 'deliverable',
      path: '/repo/artifacts/deliverable.md',
    },
    learningCandidates: [
      { id: 'learning-1', recordType: 'review' },
      { id: 'learning-2', recordType: 'outcome' },
    ],
    missionAttachments: [
      {
        charCount: 20,
        createdAt: '2026-07-01T00:00:00.000Z',
        excerpt: 'first',
        fileName: 'first.md',
        id: 'attachment-1',
        lineCount: 2,
        mimeType: 'text/markdown',
        source: 'upload',
        truncated: false,
      },
      {
        charCount: 30,
        createdAt: '2026-07-02T00:00:00.000Z',
        excerpt: 'second',
        fileName: 'second.md',
        id: 'attachment-2',
        lineCount: 3,
        mimeType: 'text/markdown',
        source: 'upload',
        truncated: true,
      },
    ],
    summary: {
      approvalCounts: { pending: 1 },
      latestFailedProviderExecution: { endedAt: '2026-07-02T00:00:00.000Z', failureKind: 'timeout' },
      latestMaintenanceRunAt: '2026-07-03T00:00:00.000Z',
      latestSession: { reviewerStatus: 'completed', reviewerSummary: 'Review passed.' },
      latestSuccessfulProviderExecution: { endedAt: '2026-07-04T00:00:00.000Z' },
      learningCandidatePromotionStatusCounts: { 'pending-review': 1 },
      maintenanceNextDueAt: '2026-07-10T00:00:00.000Z',
      maintenanceRequiredCount: 2,
      memoryCounts: { decision: 1, fact: 0, preference: 0, total: 1 },
      providerHealthDriftStatus: 'stable',
      specialistLatestQualityGateViolation: { code: 'missing-kind' },
      specialistQualityGateBlockedCount: 1,
      specialistQualityGateStatus: 'blocked',
    },
  }));

  assert.deepEqual(result.documents.items, [{ id: 'roadmap' }]);
  assert.equal(result.documents.latestArtifact.path, 'artifacts/deliverable.md');
  assert.equal(result.documents.latestArtifact.title, 'deliverable.md');
  assert.deepEqual(result.attachments.recentEntries.map((item) => item.id), ['attachment-2', 'attachment-1']);
  assert.deepEqual(result.attachments.summary, {
    latestCreatedAt: '2026-07-02T00:00:00.000Z',
    total: 2,
    totalChars: 50,
    truncatedCount: 1,
  });
  assert.equal(result.loops.maintenance.requiredCount, 2);
  assert.equal(result.loops.provider.latestFailureKind, 'timeout');
  assert.equal(result.loops.quality.status, 'blocked');
  assert.equal(result.loops.review.pendingActions, 2);
  assert.equal(result.loops.review.pendingApprovals, 1);
  assert.equal(result.loops.learning.latestCandidateId, 'learning-2');
  assert.equal(result.loops.learning.pendingReviewCount, 1);
});

test('harness summary compacts active fact graph nodes and strongest edges', () => {
  const graph = {
    edges: [
      {
        fromNodeId: 'node-1',
        id: 'edge-1',
        relation: 'supports',
        sharedTokens: ['provider', 'audit'],
        status: 'active',
        toNodeId: 'node-2',
        weight: 2,
      },
      {
        fromNodeId: 'node-2',
        id: 'edge-retired',
        relation: 'supports',
        status: 'retired',
        toNodeId: 'node-1',
        weight: 9,
      },
    ],
    nodes: [
      {
        createdAt: '2026-07-01T00:00:00.000Z',
        id: 'node-1',
        provenance: [{ source: 'memory-1' }, { source: 'memory-2' }],
        scope: 'mission',
        scopeId: 'mission-1',
        sourceId: 'memory-1',
        statement: 'Provider evidence is required.',
        status: 'active',
      },
      {
        createdAt: '2026-07-02T00:00:00.000Z',
        id: 'node-2',
        scope: 'mission',
        scopeId: 'mission-1',
        sourceId: 'memory-2',
        statement: 'Audit history is preserved.',
        status: 'active',
        version: 2,
      },
      {
        createdAt: '2026-07-03T00:00:00.000Z',
        id: 'node-retired',
        statement: 'Old fact.',
        status: 'retired',
      },
    ],
    summary: { activeNodeCount: 2 },
  };
  const result = buildMissionHarnessSummary(createInput({
    allFactGraph: graph,
    missionFactGraph: graph,
    workspaceFactGraph: graph,
  }));
  const preview = result.memory.factGraphPreview.mission;

  assert.deepEqual(preview.nodes.map((node) => node.id), ['node-2', 'node-1']);
  assert.equal(preview.nodes[1].provenance.length, 1);
  assert.deepEqual(preview.edges.map((edge) => edge.id), ['edge-1']);
  assert.equal(preview.edges[0].fromStatement, 'Provider evidence is required.');
  assert.equal(preview.edges[0].toStatement, 'Audit history is preserved.');
  assert.match(preview.edges[0].relationReason, /provider, audit/);
});

test('harness summary preserves retrieval preview and latest artifact lineage', () => {
  const result = buildMissionHarnessSummary(createInput({
    latestRetrievalArtifact: {
      createdAt: '2026-07-03T00:00:00.000Z',
      fileName: 'retrieval.md',
      id: 'retrieval-1',
      kind: 'retrieval',
      path: '/repo/artifacts/retrieval.md',
      role: 'research',
      sessionId: 'session-1',
      title: 'Retrieval Evidence',
    },
    latestRetrievalSession: { status: 'completed' },
    latestRetrievalSummary: {
      attachmentSourceCount: 2,
      memorySourceCount: 3,
      role: 'research',
      snippetCount: 5,
      sourceLabels: ['one', 'two', 'three', 'four', 'five'],
    },
    retrievalCompare: { status: 'aligned' },
    retrievalPreview: {
      previewItems: [{ sourceLabel: 'one', sourceType: 'memory' }],
      roles: ['research'],
      summary: { snippetCount: 1 },
    },
  }));

  assert.equal(result.retrieval.compare.status, 'aligned');
  assert.deepEqual(result.retrieval.roles, ['research']);
  assert.equal(result.retrieval.latestArtifact.id, 'retrieval-1');
  assert.equal(result.retrieval.latestArtifact.path, 'artifacts/retrieval.md');
  assert.equal(result.retrieval.latestArtifact.sessionStatus, 'completed');
  assert.deepEqual(result.retrieval.latestArtifact.summary.sourceLabels, ['one', 'two', 'three', 'four']);
});
