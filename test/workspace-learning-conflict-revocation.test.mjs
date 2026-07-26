import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertWorkspaceLearningConflictRevocationEvidence,
  buildWorkspaceLearningConflictRevocationEvidence,
} from '../src/core/workspace-learning-conflict-revocation.mjs';

const hash = (value) => createHash('sha256').update(String(value)).digest('hex');

function exposure(applied) {
  return {
    deliverableContainsMemory: applied,
    plannerPromptContainsMemory: applied,
    retrievalContainsMemory: applied,
  };
}

function selection(selected, other = null) {
  const candidates = [selected, other].filter(Boolean).map((memory, index) => ({
    contentHash: memory.contentHash,
    effectiveAt: memory.createdAt,
    memoryId: memory.id,
    priority: index + 1,
    retrievalRank: other && index === 0 ? 2 : 1,
    selected: index === 0,
  }));
  return {
    candidateCount: candidates.length,
    candidates,
    policyId: 'workspace-decision-latest-revision-v1',
    productionReadyClaim: false,
    reason: 'latest effective timestamp, then descending memory id',
    schemaVersion: 'personal-ai-agent-workspace-learning-selection/v1',
    selectedContentHash: selected.contentHash,
    selectedMemoryId: selected.id,
    status: 'selected',
    workspaceId: 'workspace-a',
  };
}

function run({
  artifactPhase,
  label,
  newerApplied = false,
  olderApplied = false,
  selected = null,
  other = null,
}) {
  return {
    artifacts: {
      deliverableHash: hash(`${artifactPhase}-deliverable`),
      plannerHash: hash(`${artifactPhase}-planner`),
      retrievalHash: selected ? hash(`${selected.id}-retrieval`) : null,
    },
    externalProviderCallCount: 0,
    exposures: {
      newer: exposure(newerApplied),
      older: exposure(olderApplied),
    },
    planStepCount: selected ? 4 : 3,
    providerId: 'stub',
    retrieval: {
      contentHash: selected?.contentHash || null,
      matchTermCount: selected ? 4 : 0,
      scope: selected ? 'workspace' : '',
      scopeId: selected ? 'workspace-a' : '',
      sourceId: selected?.id || '',
    },
    reviewerVerdict: 'pass',
    selection: selected ? selection(selected, other) : null,
    sessionId: `session-${label}`,
    status: 'completed',
  };
}

function quality(id, status) {
  return {
    id,
    metrics: {
      expectedSourceCitationRate: status === 'passed' ? 1 : 0,
      forbiddenRetrievedSourceCount: 0,
      forbiddenTermMatchCount: 0,
      requiredTermCoverage: status === 'passed' ? 1 : 0,
      retrievalHitRate: status === 'passed' ? 1 : 0,
      unsupportedCitationRate: 0,
    },
    status,
  };
}

function promotion(kind, memory) {
  return {
    candidateId: `candidate-${kind}`,
    finalStatus: 'rolled-back',
    memoryContentHash: memory.contentHash,
    memoryCreatedAt: memory.createdAt,
    memoryId: memory.id,
    memoryRollbackStatus: 'memory-deleted',
    promotionDecisionNoteHash: hash(`${kind} note`),
    rollbackAction: 'delete-memory-entry',
    rollbackStatus: 'completed',
    scope: 'workspace',
    scopeAuthorizationFromScope: 'mission',
    scopeAuthorizationFromScopeId: `mission-${kind}`,
    scopeAuthorizationId: `authorization-${kind}`,
    scopeAuthorizationNoteHash: hash(`${kind} authorization`),
    scopeAuthorizationStatus: 'consumed',
    scopeAuthorizationToScope: 'workspace',
    scopeAuthorizationToScopeId: 'workspace-a',
    scopeId: 'workspace-a',
    target: 'memory',
    verificationId: `verification-${kind}`,
    verificationStatus: 'passed',
  };
}

function lifecycle(kind, memory, offset) {
  return {
    authorizationAt: `2026-07-17T00:0${offset}:00.000Z`,
    candidateId: `candidate-${kind}`,
    memoryId: memory.id,
    missionId: `mission-${kind}`,
    promotionAt: `2026-07-17T00:0${offset}:01.000Z`,
    rollbackAt:
      kind === 'newer' ? '2026-07-17T00:04:00.000Z' : '2026-07-17T00:05:00.000Z',
    scopeAuthorizationId: `authorization-${kind}`,
  };
}

function buildInput() {
  const older = {
    contentHash: hash('older memory'),
    createdAt: '2026-07-17T00:01:01.000Z',
    id: 'memory-older',
  };
  const newer = {
    contentHash: hash('newer memory'),
    createdAt: '2026-07-17T00:02:01.000Z',
    id: 'memory-newer',
  };
  return {
    fixtureBinding: {
      caseId: 'conflict-case',
      fixtureHash: hash('fixture'),
      newerObjectiveHash: hash('newer objective'),
      newerPromotionNoteHash: hash('newer note'),
      newerScopeAuthorizationNoteHash: hash('newer authorization'),
      olderObjectiveHash: hash('older objective'),
      olderPromotionNoteHash: hash('older note'),
      olderScopeAuthorizationNoteHash: hash('older authorization'),
      targetObjectiveHash: hash('target objective'),
    },
    lifecycle: {
      newer: lifecycle('newer', newer, 2),
      older: lifecycle('older', older, 1),
    },
    observedAt: '2026-07-17T00:06:00.000Z',
    phases: {
      afterFullRollback: run({ artifactPhase: 'baseline', label: 'full-rollback' }),
      afterNewerRevocation: run({
        artifactPhase: 'older',
        label: 'newer-revoked',
        olderApplied: true,
        selected: older,
      }),
      baseline: run({ artifactPhase: 'baseline', label: 'baseline' }),
      conflict: run({
        artifactPhase: 'newer',
        label: 'conflict',
        newerApplied: true,
        other: older,
        selected: newer,
      }),
      foreignConflict: run({ artifactPhase: 'foreign', label: 'foreign' }),
      olderOnly: run({
        artifactPhase: 'older',
        label: 'older',
        olderApplied: true,
        selected: older,
      }),
    },
    promotions: {
      newer: promotion('newer', newer),
      older: promotion('older', older),
    },
    quality: {
      afterFullRollback: quality('baseline-quality', 'failed'),
      afterNewerRevocation: quality('older-quality', 'passed'),
      baseline: quality('baseline-quality', 'failed'),
      conflict: quality('newer-quality', 'passed'),
      foreignConflict: quality('foreign-quality', 'passed'),
      olderOnly: quality('older-quality', 'passed'),
    },
    sourceRuns: {
      newer: run({ artifactPhase: 'newer-source', label: 'newer-source' }),
      older: run({ artifactPhase: 'older-source', label: 'older-source' }),
    },
    topology: {
      foreignMission: {
        id: 'mission-foreign',
        objectiveHash: hash('target objective'),
        workspaceId: 'workspace-b',
      },
      foreignWorkspaceId: 'workspace-b',
      newerSourceMission: {
        id: 'mission-newer',
        objectiveHash: hash('newer objective'),
        workspaceId: 'workspace-a',
      },
      olderSourceMission: {
        id: 'mission-older',
        objectiveHash: hash('older objective'),
        workspaceId: 'workspace-a',
      },
      sourceWorkspaceId: 'workspace-a',
      targetMission: {
        id: 'mission-target',
        objectiveHash: hash('target objective'),
        workspaceId: 'workspace-a',
      },
    },
  };
}

test('workspace learning conflict selects newer, falls back after revocation, and restores baseline', () => {
  const evidence = buildWorkspaceLearningConflictRevocationEvidence(buildInput());

  assertWorkspaceLearningConflictRevocationEvidence(evidence);
  assert.equal(evidence.actualWorkspaceLearningConflictRevocationValidated, true);
  assert.equal(Object.values(evidence.results).every(Boolean), true);
  assert.equal(evidence.phases.conflict.selection.selectedMemoryId, 'memory-newer');
  assert.equal(evidence.phases.afterNewerRevocation.selection.selectedMemoryId, 'memory-older');
  assert.equal(evidence.qualityBoundary.learnedConflictResolutionValidated, false);
  assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
});

test('workspace learning conflict fails closed on stale selection or rollback drift', () => {
  const stale = buildInput();
  stale.phases.conflict.selection = stale.phases.olderOnly.selection;
  stale.phases.conflict.retrieval = stale.phases.olderOnly.retrieval;
  const staleEvidence = buildWorkspaceLearningConflictRevocationEvidence(stale);
  assert.equal(staleEvidence.actualWorkspaceLearningConflictRevocationValidated, false);
  assert.equal(staleEvidence.results.newerWinsConflict, false);

  const drifted = buildInput();
  drifted.phases.afterFullRollback.artifacts.plannerHash = hash('drifted');
  const driftedEvidence = buildWorkspaceLearningConflictRevocationEvidence(drifted);
  assert.equal(driftedEvidence.actualWorkspaceLearningConflictRevocationValidated, false);
  assert.equal(driftedEvidence.results.fullRollbackRestoresBaseline, false);
});

test('workspace learning conflict rejects malformed and tampered evidence', () => {
  const malformed = buildInput();
  malformed.promotions.newer.memoryContentHash = 'invalid';
  assert.throws(
    () => buildWorkspaceLearningConflictRevocationEvidence(malformed),
    /memoryContentHash/,
  );

  const invalidRate = buildInput();
  invalidRate.quality.conflict.metrics.retrievalHitRate = 1.1;
  assert.throws(
    () => buildWorkspaceLearningConflictRevocationEvidence(invalidRate),
    /retrievalHitRate/,
  );

  const tampered = buildWorkspaceLearningConflictRevocationEvidence(buildInput());
  tampered.results.newerWinsConflict = false;
  assert.throws(
    () => assertWorkspaceLearningConflictRevocationEvidence(tampered),
    /integrity|contract/,
  );
});
