import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertUserLearningOperatorOverrideEvidence,
  buildUserLearningOperatorOverrideEvidence,
} from '../src/core/user-learning-operator-override.mjs';

const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
const hashRecord = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function selection(selected, phase) {
  const overrideId = phase === 'active' ? 'override-1' : 'override-2';
  const fallback = ['expired', 'cleared'].includes(phase);
  const hasOverride = phase !== 'baseline';
  const records = phase === 'active'
    ? [overrideRecord('override-1', 'active', '2026-07-17T01:00:00.000Z')]
    : phase === 'expired'
      ? [overrideRecord('override-1', 'expired', '2026-07-17T01:00:00.000Z')]
      : phase === 'repinned'
        ? [
            overrideRecord('override-2', 'active', '2026-07-17T03:00:00.000Z'),
            overrideRecord('override-1', 'expired', '2026-07-17T01:00:00.000Z'),
          ]
        : phase === 'cleared'
          ? [
              overrideRecord('override-2', 'cleared', '2026-07-17T03:00:00.000Z'),
              overrideRecord('override-1', 'expired', '2026-07-17T01:00:00.000Z'),
            ]
          : [];
  const memoryIds = selected === 'older'
    ? ['memory-older', 'memory-newer']
    : ['memory-newer', 'memory-older'];
  const value = {
    candidateCount: 2,
    candidates: memoryIds.map((memoryId, index) => ({
      contentHash: hash(memoryId),
      effectiveAt:
        memoryId === 'memory-newer'
          ? '2026-07-17T00:01:00.000Z'
          : '2026-07-17T00:00:00.000Z',
      memoryId,
      priority: index + 1,
      retrievalRank: memoryId === 'memory-newer' ? 2 : 1,
      selected: index === 0,
    })),
    policyId:
      selected === 'older'
        ? 'user-decision-operator-override-v1'
        : 'user-decision-latest-revision-v1',
    productionReadyClaim: false,
    schemaVersion: hasOverride
      ? 'personal-ai-agent-user-learning-selection/v2'
      : 'personal-ai-agent-user-learning-selection/v1',
    scope: 'user',
    scopeId: 'user',
    selectedContentHash: hash(`memory-${selected}`),
    selectedMemoryId: `memory-${selected}`,
    status: 'selected',
  };
  if (!hasOverride) {
    return value;
  }
  return {
    ...value,
    overrideEvaluation: {
      activeCount: phase === 'active' || phase === 'repinned' ? 1 : 0,
      clearedCount: phase === 'cleared' ? 1 : 0,
      currentOverrideId: overrideId,
      expiredCount: phase === 'repinned' || phase === 'cleared' ? 1 : phase === 'expired' ? 1 : 0,
      invalidCount: 0,
      records,
      selectedOverrideId: fallback ? null : overrideId,
      unretrievedActiveCount: 0,
    },
    selectionSource: fallback ? 'latest-revision-fallback' : 'operator-override',
  };
}

function overrideRecord(id, status, setAt) {
  return {
    candidateId: 'candidate-older',
    expiresAt: id === 'override-1' ? '2026-07-17T02:00:00.000Z' : '2026-07-17T04:00:00.000Z',
    id,
    memoryId: 'memory-older',
    noteHash: hash(`${id}-note`),
    scope: 'user',
    scopeId: 'user',
    setAt,
    status,
  };
}

function exposure(selected) {
  return {
    deliverableContainsMemory: selected,
    plannerPromptContainsMemory: selected,
    retrievalContainsMemory: selected,
  };
}

function run({ artifacts, phase, selected, sessionId }) {
  return {
    artifacts,
    externalProviderCallCount: 0,
    exposures: {
      newer: exposure(selected === 'newer'),
      older: exposure(selected === 'older'),
    },
    providerId: 'stub',
    reviewerVerdict: 'pass',
    selection: selection(selected, phase),
    sessionId,
    status: 'completed',
  };
}

function sourceRun(sessionId) {
  return {
    artifacts: {
      deliverableHash: hash(`${sessionId}-deliverable`),
      plannerHash: hash(`${sessionId}-planner`),
    },
    externalProviderCallCount: 0,
    exposures: { newer: exposure(false), older: exposure(false) },
    providerId: 'stub',
    reviewerVerdict: 'pass',
    selection: null,
    sessionId,
    status: 'completed',
  };
}

function promotion(kind) {
  return {
    candidateId: `candidate-${kind}`,
    memoryContentHash: hash(`${kind}-content`),
    memoryCreatedAt:
      kind === 'older' ? '2026-07-17T00:00:00.000Z' : '2026-07-17T00:01:00.000Z',
    memoryId: `memory-${kind}`,
    promotionNoteHash: hash(`${kind}-promotion`),
    promotionStatus: 'promoted',
    scope: 'user',
    scopeAuthorizationStatus: 'consumed',
    scopeId: 'user',
    target: 'memory',
    verificationId: `verification-${kind}`,
    verificationStatus: 'passed',
  };
}

function overrideEvent(action, at, overrideId) {
  return {
    action,
    at,
    expiresAt: action === 'set' ? '2101-01-01T00:00:00.000Z' : undefined,
    memoryId: 'memory-older',
    noteHash: hash(`${overrideId}-${action}`),
    overrideId,
    performedBy: 'local-operator',
    scope: 'user',
    scopeId: 'user',
  };
}

function input() {
  const newerArtifacts = { deliverableHash: hash('newer-d'), plannerHash: hash('newer-p') };
  const olderArtifacts = { deliverableHash: hash('older-d'), plannerHash: hash('older-p') };
  const quality = Object.fromEntries(
    ['activeOverride', 'baseline', 'cleared', 'crossWorkspaceActive', 'expired', 'repinned']
      .map((phase) => [phase, { id: `${phase}-quality`, metricsHash: hash(phase), status: 'passed' }]),
  );
  return {
    fixtureBinding: {
      caseId: 'case-1',
      clearOverrideNoteHash: hash('clear'),
      firstOverrideNoteHash: hash('first'),
      fixtureHash: hash('fixture'),
      newerObjectiveHash: hash('newer-objective'),
      newerPromotionNoteHash: hash('newer-promotion'),
      olderObjectiveHash: hash('older-objective'),
      olderPromotionNoteHash: hash('older-promotion'),
      secondOverrideNoteHash: hash('second'),
      targetObjectiveHash: hash('target-objective'),
    },
    observedAt: '2100-01-01T00:04:00.000Z',
    overrideLifecycle: {
      cleared: overrideEvent('clear', '2100-01-01T00:03:00.000Z', 'override-2'),
      expiredObservedAt: '2100-01-01T00:01:00.000Z',
      firstSet: overrideEvent('set', '2026-07-17T01:00:00.000Z', 'override-1'),
      secondSet: overrideEvent('set', '2100-01-01T00:02:00.000Z', 'override-2'),
    },
    phases: {
      activeOverride: run({ artifacts: olderArtifacts, phase: 'active', selected: 'older', sessionId: 'session-3' }),
      baseline: run({ artifacts: newerArtifacts, phase: 'baseline', selected: 'newer', sessionId: 'session-2' }),
      cleared: run({ artifacts: newerArtifacts, phase: 'cleared', selected: 'newer', sessionId: 'session-7' }),
      crossWorkspaceActive: run({ artifacts: { deliverableHash: hash('cross-d'), plannerHash: hash('cross-p') }, phase: 'active', selected: 'older', sessionId: 'session-4' }),
      expired: run({ artifacts: newerArtifacts, phase: 'expired', selected: 'newer', sessionId: 'session-5' }),
      repinned: run({ artifacts: olderArtifacts, phase: 'repinned', selected: 'older', sessionId: 'session-6' }),
    },
    promotions: { newer: promotion('newer'), older: promotion('older') },
    quality,
    sourceRuns: { newer: sourceRun('session-1'), older: sourceRun('session-0') },
    timeline: [
      { at: '2026-07-17T01:00:00.000Z', index: 10, kind: 'user-learning-selection-override-set', overrideId: 'override-1' },
      { at: '2100-01-01T00:02:00.000Z', index: 20, kind: 'user-learning-selection-override-set', overrideId: 'override-2' },
      { at: '2100-01-01T00:03:00.000Z', index: 30, kind: 'user-learning-selection-override-cleared', overrideId: 'override-2' },
    ],
    topology: {
      crossWorkspaceId: 'workspace-b',
      crossWorkspaceMission: { id: 'mission-cross', objectiveHash: hash('target-objective'), workspaceId: 'workspace-b' },
      newerSourceMission: { id: 'mission-newer', objectiveHash: hash('newer-objective'), workspaceId: 'workspace-b' },
      olderSourceMission: { id: 'mission-older', objectiveHash: hash('older-objective'), workspaceId: 'workspace-a' },
      sourceWorkspaceId: 'workspace-a',
      targetMission: { id: 'mission-target', objectiveHash: hash('target-objective'), workspaceId: 'workspace-a' },
    },
  };
}

test('user learning operator override validates active, cross-workspace, expiry, repin, and clear phases', () => {
  const evidence = buildUserLearningOperatorOverrideEvidence(input());

  assert.equal(evidence.actualUserLearningOperatorOverrideValidated, true);
  assert.equal(evidence.sessionCount, 8);
  assert.equal(evidence.qualityBoundary.controlledUserOperatorOverrideValidated, true);
  assert.equal(evidence.qualityBoundary.controlledCrossWorkspaceUserOverrideValidated, true);
  assert.equal(evidence.qualityBoundary.hostedTenantUserPersonalizationValidated, false);
  assert.equal(evidence.qualityBoundary.multiUserIsolationValidated, false);
  assert.equal(assertUserLearningOperatorOverrideEvidence(evidence), true);
});

test('user learning operator override fails closed when fallback or artifact parity drifts', () => {
  const stale = input();
  stale.phases.expired = run({
    artifacts: { deliverableHash: hash('stale-d'), plannerHash: hash('stale-p') },
    phase: 'active',
    selected: 'older',
    sessionId: 'session-5',
  });

  const evidence = buildUserLearningOperatorOverrideEvidence(stale);
  assert.equal(evidence.actualUserLearningOperatorOverrideValidated, false);
  assert.equal(evidence.results.expiredFallback, false);
});

test('user learning operator override rejects malformed and semantically tampered evidence', () => {
  assert.throws(
    () => buildUserLearningOperatorOverrideEvidence({ ...input(), observedAt: 'invalid' }),
    /observedAt is invalid/,
  );

  const evidence = buildUserLearningOperatorOverrideEvidence(input());
  const hashTampered = structuredClone(evidence);
  hashTampered.results.activeOverride = false;
  assert.throws(
    () => assertUserLearningOperatorOverrideEvidence(hashTampered),
    /integrity check failed/,
  );

  const semanticTampered = structuredClone(evidence);
  semanticTampered.results.activeOverride = false;
  const { evidenceHash: ignoredHash, id: ignoredId, ...content } = semanticTampered;
  semanticTampered.evidenceHash = hashRecord(content);
  assert.throws(
    () => assertUserLearningOperatorOverrideEvidence(semanticTampered),
    /contract drifted/,
  );
});
