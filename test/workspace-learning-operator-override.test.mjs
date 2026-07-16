import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertWorkspaceLearningOperatorOverrideEvidence,
  buildWorkspaceLearningOperatorOverrideEvidence,
} from '../src/core/workspace-learning-operator-override.mjs';

const hash = (value) => createHash('sha256').update(String(value)).digest('hex');

const older = {
  contentHash: hash('older content'),
  createdAt: '2026-07-17T00:01:00.000Z',
  id: 'memory-older',
};
const newer = {
  contentHash: hash('newer content'),
  createdAt: '2026-07-17T00:02:00.000Z',
  id: 'memory-newer',
};

function exposure(applied) {
  return {
    deliverableContainsMemory: applied,
    plannerPromptContainsMemory: applied,
    retrievalContainsMemory: applied,
  };
}

function overrideRecord({ expiresAt, id, setAt, status }) {
  return {
    candidateId: 'candidate-older',
    expiresAt,
    id,
    memoryId: older.id,
    noteHash: hash(id),
    setAt,
    status,
    workspaceId: 'workspace-a',
  };
}

function selection({ selected, source = '', override = null }) {
  const other = selected.id === older.id ? newer : older;
  return {
    candidateCount: 2,
    candidates: [selected, other].map((memory, index) => ({
      contentHash: memory.contentHash,
      effectiveAt: memory.createdAt,
      memoryId: memory.id,
      priority: index + 1,
      retrievalRank: memory.id === older.id ? 1 : 2,
      selected: index === 0,
    })),
    ...(override
      ? {
          overrideEvaluation: {
            activeCount: override.status === 'active' ? 1 : 0,
            clearedCount: override.status === 'cleared' ? 1 : 0,
            expiredCount: override.status === 'expired' ? 1 : 0,
            invalidCount: 0,
            records: [override],
            currentOverrideId: override.id,
            selectedOverrideId: override.status === 'active' ? override.id : null,
            unretrievedActiveCount: 0,
          },
          selectionSource: source,
        }
      : {}),
    policyId:
      source === 'operator-override'
        ? 'workspace-decision-operator-override-v1'
        : 'workspace-decision-latest-revision-v1',
    productionReadyClaim: false,
    schemaVersion: override
      ? 'personal-ai-agent-workspace-learning-selection/v2'
      : 'personal-ai-agent-workspace-learning-selection/v1',
    selectedContentHash: selected.contentHash,
    selectedMemoryId: selected.id,
    status: 'selected',
    workspaceId: 'workspace-a',
  };
}

function run({ artifact, newerApplied = false, olderApplied = false, selected = null, session = artifact }) {
  return {
    artifacts: {
      deliverableHash: hash(`${artifact}-deliverable`),
      plannerHash: hash(`${artifact}-planner`),
    },
    externalProviderCallCount: 0,
    exposures: {
      newer: exposure(newerApplied),
      older: exposure(olderApplied),
    },
    providerId: 'stub',
    reviewerVerdict: 'pass',
    selection: selected,
    sessionId: `session-${session}`,
    status: 'completed',
  };
}

function quality(id) {
  return {
    id,
    metricsHash: hash(`${id}-metrics`),
    status: 'passed',
  };
}

function buildInput() {
  const firstOverride = overrideRecord({
    expiresAt: '2026-07-17T02:00:00.000Z',
    id: 'override-first',
    setAt: '2026-07-17T01:00:00.000Z',
    status: 'active',
  });
  const expiredOverride = { ...firstOverride, status: 'expired' };
  const secondOverride = overrideRecord({
    expiresAt: '2026-07-17T04:00:00.000Z',
    id: 'override-second',
    setAt: '2026-07-17T03:00:01.000Z',
    status: 'active',
  });
  const clearedOverride = { ...secondOverride, status: 'cleared' };
  return {
    fixtureBinding: {
      caseId: 'operator-override',
      clearOverrideNoteHash: hash('clear note'),
      firstOverrideNoteHash: hash('first note'),
      fixtureHash: hash('fixture'),
      newerObjectiveHash: hash('newer objective'),
      newerPromotionNoteHash: hash('newer note'),
      olderObjectiveHash: hash('older objective'),
      olderPromotionNoteHash: hash('older note'),
      secondOverrideNoteHash: hash('second note'),
      targetObjectiveHash: hash('target objective'),
    },
    observedAt: '2026-07-17T05:00:00.000Z',
    overrideLifecycle: {
      cleared: {
        action: 'clear',
        at: '2026-07-17T03:10:00.000Z',
        memoryId: older.id,
        noteHash: hash('clear note'),
        overrideId: secondOverride.id,
        performedBy: 'local-operator',
        workspaceId: 'workspace-a',
      },
      expiredObservedAt: '2026-07-17T03:00:00.000Z',
      firstSet: {
        action: 'set',
        at: firstOverride.setAt,
        expiresAt: firstOverride.expiresAt,
        memoryId: older.id,
        noteHash: hash('first note'),
        overrideId: firstOverride.id,
        performedBy: 'local-operator',
        workspaceId: 'workspace-a',
      },
      secondSet: {
        action: 'set',
        at: secondOverride.setAt,
        expiresAt: secondOverride.expiresAt,
        memoryId: older.id,
        noteHash: hash('second note'),
        overrideId: secondOverride.id,
        performedBy: 'local-operator',
        workspaceId: 'workspace-a',
      },
    },
    phases: {
      activeOverride: run({
        artifact: 'older',
        olderApplied: true,
        selected: selection({ override: firstOverride, selected: older, source: 'operator-override' }),
        session: 'active-override',
      }),
      baseline: run({
        artifact: 'newer',
        newerApplied: true,
        selected: selection({ selected: newer }),
        session: 'baseline',
      }),
      cleared: run({
        artifact: 'newer',
        newerApplied: true,
        selected: selection({
          override: clearedOverride,
          selected: newer,
          source: 'latest-revision-fallback',
        }),
        session: 'cleared',
      }),
      expired: run({
        artifact: 'newer',
        newerApplied: true,
        selected: selection({
          override: expiredOverride,
          selected: newer,
          source: 'latest-revision-fallback',
        }),
        session: 'expired',
      }),
      foreignActive: run({ artifact: 'foreign' }),
      repinned: run({
        artifact: 'older',
        olderApplied: true,
        selected: selection({ override: secondOverride, selected: older, source: 'operator-override' }),
        session: 'repinned',
      }),
    },
    promotions: {
      newer: {
        candidateId: 'candidate-newer',
        memoryContentHash: newer.contentHash,
        memoryCreatedAt: newer.createdAt,
        memoryId: newer.id,
        promotionNoteHash: hash('newer note'),
        promotionStatus: 'promoted',
        scope: 'workspace',
        scopeAuthorizationStatus: 'consumed',
        scopeId: 'workspace-a',
        target: 'memory',
        verificationId: 'verification-newer',
        verificationStatus: 'passed',
      },
      older: {
        candidateId: 'candidate-older',
        memoryContentHash: older.contentHash,
        memoryCreatedAt: older.createdAt,
        memoryId: older.id,
        promotionNoteHash: hash('older note'),
        promotionStatus: 'promoted',
        scope: 'workspace',
        scopeAuthorizationStatus: 'consumed',
        scopeId: 'workspace-a',
        target: 'memory',
        verificationId: 'verification-older',
        verificationStatus: 'passed',
      },
    },
    quality: {
      activeOverride: quality('older'),
      baseline: quality('newer'),
      cleared: quality('newer'),
      expired: quality('newer'),
      foreignActive: quality('foreign'),
      repinned: quality('older'),
    },
    sourceRuns: {
      newer: run({ artifact: 'newer-source' }),
      older: run({ artifact: 'older-source' }),
    },
    timeline: [
      { at: firstOverride.setAt, index: 1, kind: 'workspace-learning-selection-override-set', overrideId: firstOverride.id },
      { at: secondOverride.setAt, index: 2, kind: 'workspace-learning-selection-override-set', overrideId: secondOverride.id },
      { at: '2026-07-17T03:10:00.000Z', index: 3, kind: 'workspace-learning-selection-override-cleared', overrideId: secondOverride.id },
    ],
    topology: {
      foreignMission: { id: 'mission-foreign', objectiveHash: hash('target objective'), workspaceId: 'workspace-b' },
      foreignWorkspaceId: 'workspace-b',
      newerSourceMission: { id: 'mission-newer', objectiveHash: hash('newer objective'), workspaceId: 'workspace-a' },
      olderSourceMission: { id: 'mission-older', objectiveHash: hash('older objective'), workspaceId: 'workspace-a' },
      sourceWorkspaceId: 'workspace-a',
      targetMission: { id: 'mission-target', objectiveHash: hash('target objective'), workspaceId: 'workspace-a' },
    },
  };
}

test('workspace learning operator override validates active, expired, repinned, and cleared phases', () => {
  const evidence = buildWorkspaceLearningOperatorOverrideEvidence(buildInput());

  assertWorkspaceLearningOperatorOverrideEvidence(evidence);
  assert.equal(evidence.actualWorkspaceLearningOperatorOverrideValidated, true);
  assert.equal(Object.values(evidence.results).every(Boolean), true);
  assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
  assert.equal(evidence.productionReadyClaim, false);
});

test('workspace learning operator override fails closed on retrieval injection or stale fallback', () => {
  const injected = buildInput();
  injected.phases.activeOverride.exposures.newer = exposure(true);
  const injectedEvidence = buildWorkspaceLearningOperatorOverrideEvidence(injected);
  assert.equal(injectedEvidence.results.activeOverrideApplied, false);

  const stale = buildInput();
  stale.phases.expired.artifacts.plannerHash = hash('stale planner');
  const staleEvidence = buildWorkspaceLearningOperatorOverrideEvidence(stale);
  assert.equal(staleEvidence.results.expirationFallsBack, false);
});

test('workspace learning operator override rejects malformed and tampered evidence', () => {
  const malformed = buildInput();
  malformed.overrideLifecycle.firstSet.noteHash = 'invalid';
  assert.throws(
    () => buildWorkspaceLearningOperatorOverrideEvidence(malformed),
    /noteHash/,
  );

  const tampered = buildWorkspaceLearningOperatorOverrideEvidence(buildInput());
  tampered.results.clearRestoresLatest = false;
  assert.throws(
    () => assertWorkspaceLearningOperatorOverrideEvidence(tampered),
    /integrity|contract/,
  );
});
