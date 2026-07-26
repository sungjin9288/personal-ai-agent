import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { evaluateAnswerQualityCase } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertWorkspaceLearningPersonalizationEvidence,
  buildWorkspaceLearningPersonalizationEvidence,
} from '../src/core/workspace-learning-personalization.mjs';

const hash = (value) => createHash('sha256').update(String(value)).digest('hex');

function run({ adapted = false, artifactPhase = 'before', label, sessionPhase = artifactPhase }) {
  return {
    adaptation: {
      deliverableApplied: adapted,
      planStepCount: adapted ? 4 : 3,
      plannerApplied: adapted,
    },
    artifacts: {
      deliverableHash: hash(`${label}-${artifactPhase}-deliverable`),
      plannerHash: hash(`${label}-${artifactPhase}-planner`),
      retrievalHash: adapted ? hash(`${label}-retrieval`) : null,
    },
    externalProviderCallCount: 0,
    memoryExposure: {
      deliverableContainsMemory: adapted,
      plannerPromptContainsMemory: adapted,
      retrievalContainsMemory: adapted,
    },
    providerId: 'stub',
    retrieval: {
      contentHash: adapted ? hash('workspace-memory') : null,
      matchTermCount: adapted ? 4 : 0,
      scope: adapted ? 'workspace' : '',
      scopeId: adapted ? 'workspace-a' : '',
      sourceId: adapted ? 'memory-workspace' : '',
    },
    reviewerVerdict: 'pass',
    sessionId: `session-${label}-${sessionPhase}`,
    status: 'completed',
  };
}

function siblingQuality(adapted) {
  return evaluateAnswerQualityCase({
    answer: {
      citedSourceKeys: adapted ? ['memory:memory-workspace'] : [],
      text: adapted ? 'narrow verification workspace learning lane' : 'baseline draft',
    },
    expectedSourceKeys: ['memory:memory-workspace'],
    forbiddenAnswerTerms: [],
    forbiddenSourceKeys: [],
    id: 'workspace-target',
    requiredAnswerTerms: ['workspace learning lane'],
    retrievedItems: adapted ? [{ sourceKey: 'memory:memory-workspace' }] : [],
    reviewerVerdict: 'pass',
  });
}

function foreignQuality() {
  return evaluateAnswerQualityCase({
    answer: { citedSourceKeys: [], text: 'foreign baseline draft' },
    expectedSourceKeys: [],
    forbiddenAnswerTerms: ['workspace learning lane'],
    forbiddenSourceKeys: ['memory:memory-workspace'],
    id: 'foreign-workspace-target',
    requiredAnswerTerms: [],
    retrievedItems: [],
    reviewerVerdict: 'pass',
  });
}

function buildInput() {
  const siblingBefore = run({ label: 'sibling' });
  const foreignBefore = run({ label: 'foreign' });
  return {
    audit: {
      authorization: {
        at: '2026-07-17T00:00:01.000Z',
        candidateId: 'candidate-source',
        index: 3,
        kind: 'learning-candidate-promotion-scope-authorized',
        missionId: 'mission-source',
        scopeAuthorizationId: 'scope-authorization-source',
        status: 'authorized',
      },
      promotion: {
        at: '2026-07-17T00:00:02.000Z',
        candidateId: 'candidate-source',
        index: 4,
        kind: 'learning-candidate-promotion-approved',
        missionId: 'mission-source',
        scopeAuthorizationId: 'scope-authorization-source',
        status: 'passed',
      },
      rollback: {
        at: '2026-07-17T00:00:03.000Z',
        candidateId: 'candidate-source',
        index: 5,
        kind: 'learning-candidate-promotion-rolled-back',
        missionId: 'mission-source',
        scopeAuthorizationId: 'scope-authorization-source',
        status: 'memory-deleted',
      },
    },
    fixtureBinding: {
      caseId: 'workspace-personalization',
      expectedPlanStepHash: hash('step'),
      fixtureHash: hash('fixture'),
      promotionNoteHash: hash('note'),
      scopeAuthorizationNoteHash: hash('scope authorization note'),
      sourceObjectiveHash: hash('source objective'),
      targetObjectiveHash: hash('target objective'),
    },
    observedAt: '2026-07-17T00:00:00.000Z',
    phases: {
      afterPromotion: {
        foreign: run({ artifactPhase: 'before', label: 'foreign', sessionPhase: 'after' }),
        sibling: run({ adapted: true, artifactPhase: 'after', label: 'sibling' }),
      },
      afterRollback: {
        foreign: run({ artifactPhase: 'before', label: 'foreign', sessionPhase: 'rollback' }),
        sibling: run({ artifactPhase: 'before', label: 'sibling', sessionPhase: 'rollback' }),
      },
      beforePromotion: {
        foreign: foreignBefore,
        sibling: siblingBefore,
      },
    },
    promotion: {
      candidateId: 'candidate-source',
      finalStatus: 'rolled-back',
      memoryContentHash: hash('workspace-memory'),
      memoryId: 'memory-workspace',
      memoryRollbackStatus: 'memory-deleted',
      rollbackAction: 'delete-memory-entry',
      rollbackStatus: 'completed',
      scope: 'workspace',
      scopeAuthorizationFromScope: 'mission',
      scopeAuthorizationFromScopeId: 'mission-source',
      scopeAuthorizationId: 'scope-authorization-source',
      scopeAuthorizationStatus: 'consumed',
      scopeAuthorizationToScope: 'workspace',
      scopeAuthorizationToScopeId: 'workspace-a',
      scopeId: 'workspace-a',
      target: 'memory',
      verificationId: 'verification-source',
      verificationStatus: 'passed',
    },
    quality: {
      afterPromotion: {
        foreign: foreignQuality(),
        sibling: siblingQuality(true),
      },
      afterRollback: {
        foreign: foreignQuality(),
        sibling: siblingQuality(false),
      },
      beforePromotion: {
        foreign: foreignQuality(),
        sibling: siblingQuality(false),
      },
    },
    sourceRun: run({ label: 'source' }),
    topology: {
      foreignMission: {
        id: 'mission-foreign',
        objectiveHash: hash('target objective'),
        workspaceId: 'workspace-b',
      },
      foreignWorkspaceId: 'workspace-b',
      siblingMission: {
        id: 'mission-sibling',
        objectiveHash: hash('target objective'),
        workspaceId: 'workspace-a',
      },
      sourceMission: {
        id: 'mission-source',
        objectiveHash: hash('source objective'),
        workspaceId: 'workspace-a',
      },
      sourceWorkspaceId: 'workspace-a',
    },
  };
}

test('workspace learning applies to a sibling mission, isolates a foreign workspace, and rolls back', () => {
  const evidence = buildWorkspaceLearningPersonalizationEvidence(buildInput());

  assertWorkspaceLearningPersonalizationEvidence(evidence);
  assert.equal(evidence.actualWorkspaceLearningPersonalizationValidated, true);
  assert.deepEqual(evidence.results, {
    auditOrderingPreserved: true,
    controlledQualityDelta: true,
    distinctSessionsPassed: true,
    externalProviderIsolationPassed: true,
    foreignArtifactParity: true,
    foreignWorkspaceIsolated: true,
    promotionVerified: true,
    reviewerPassPreserved: true,
    siblingBaselineClean: true,
    siblingFeedbackApplied: true,
    siblingRollbackRestored: true,
    topologyBound: true,
  });
  assert.equal(evidence.qualityBoundary.controlledWorkspacePersonalizationValidated, true);
  assert.equal(evidence.qualityBoundary.crossMissionGeneralizationValidated, false);
  assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
  assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
});

test('workspace learning fails closed on cross-workspace exposure or rollback drift', () => {
  const exposed = buildInput();
  exposed.phases.afterPromotion.foreign.memoryExposure.plannerPromptContainsMemory = true;
  const exposedEvidence = buildWorkspaceLearningPersonalizationEvidence(exposed);
  assert.equal(exposedEvidence.actualWorkspaceLearningPersonalizationValidated, false);
  assert.equal(exposedEvidence.results.foreignWorkspaceIsolated, false);

  const drifted = buildInput();
  drifted.phases.afterRollback.sibling.artifacts.plannerHash = hash('drifted planner');
  const driftedEvidence = buildWorkspaceLearningPersonalizationEvidence(drifted);
  assert.equal(driftedEvidence.actualWorkspaceLearningPersonalizationValidated, false);
  assert.equal(driftedEvidence.results.siblingRollbackRestored, false);

  const reordered = buildInput();
  reordered.audit.promotion.index = reordered.audit.rollback.index + 1;
  const reorderedEvidence = buildWorkspaceLearningPersonalizationEvidence(reordered);
  assert.equal(reorderedEvidence.actualWorkspaceLearningPersonalizationValidated, false);
  assert.equal(reorderedEvidence.results.auditOrderingPreserved, false);
});

test('workspace learning rejects malformed and tampered evidence', () => {
  const malformed = buildInput();
  malformed.promotion.memoryContentHash = 'invalid';
  assert.throws(
    () => buildWorkspaceLearningPersonalizationEvidence(malformed),
    /memoryContentHash/,
  );

  const tampered = buildWorkspaceLearningPersonalizationEvidence(buildInput());
  tampered.results.topologyBound = false;
  assert.throws(
    () => assertWorkspaceLearningPersonalizationEvidence(tampered),
    /integrity|contract/,
  );
});
