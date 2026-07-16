import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import { evaluateAnswerQualityCase } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertLocalUserLearningPersonalizationEvidence,
  buildLocalUserLearningPersonalizationEvidence,
} from '../src/core/local-user-learning-personalization.mjs';

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
      contentHash: adapted ? hash('user-memory') : null,
      matchTermCount: adapted ? 4 : 0,
      scope: adapted ? 'user' : '',
      scopeId: adapted ? 'user' : '',
      sourceId: adapted ? 'memory-user' : '',
    },
    reviewerVerdict: 'pass',
    sessionId: `session-${label}-${sessionPhase}`,
    status: 'completed',
  };
}

function quality({ adapted, target }) {
  return evaluateAnswerQualityCase({
    answer: {
      citedSourceKeys: adapted ? ['memory:memory-user'] : [],
      text: adapted ? 'verified local user learning preference' : 'baseline draft',
    },
    expectedSourceKeys: ['memory:memory-user'],
    forbiddenAnswerTerms: [],
    forbiddenSourceKeys: [],
    id: `${target}-user-personalization`,
    requiredAnswerTerms: ['local user learning preference'],
    retrievedItems: adapted ? [{ sourceKey: 'memory:memory-user' }] : [],
    reviewerVerdict: 'pass',
  });
}

function targetPhases(label) {
  return {
    afterPromotion: run({ adapted: true, artifactPhase: 'after', label }),
    afterRollback: run({ artifactPhase: 'before', label, sessionPhase: 'rollback' }),
    beforePromotion: run({ label }),
  };
}

function targetQuality(target) {
  return {
    afterPromotion: quality({ adapted: true, target }),
    afterRollback: quality({ adapted: false, target }),
    beforePromotion: quality({ adapted: false, target }),
  };
}

function buildInput() {
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
      caseId: 'local-user-personalization',
      expectedPlanStepHash: hash('step'),
      fixtureHash: hash('fixture'),
      promotionNoteHash: hash('note'),
      scopeAuthorizationNoteHash: hash('scope authorization note'),
      sourceObjectiveHash: hash('source objective'),
      targetObjectiveHash: hash('target objective'),
    },
    observedAt: '2026-07-17T00:00:00.000Z',
    phases: {
      crossWorkspace: targetPhases('cross-workspace'),
      sibling: targetPhases('sibling'),
    },
    promotion: {
      candidateId: 'candidate-source',
      finalStatus: 'rolled-back',
      memoryContentHash: hash('user-memory'),
      memoryId: 'memory-user',
      memoryRollbackStatus: 'memory-deleted',
      rollbackAction: 'delete-memory-entry',
      rollbackStatus: 'completed',
      scope: 'user',
      scopeAuthorizationFromScope: 'mission',
      scopeAuthorizationFromScopeId: 'mission-source',
      scopeAuthorizationId: 'scope-authorization-source',
      scopeAuthorizationStatus: 'consumed',
      scopeAuthorizationToScope: 'user',
      scopeAuthorizationToScopeId: 'user',
      scopeId: 'user',
      target: 'memory',
      verificationId: 'verification-source',
      verificationStatus: 'passed',
    },
    quality: {
      crossWorkspace: targetQuality('cross-workspace'),
      sibling: targetQuality('sibling'),
    },
    sourceRun: run({ label: 'source' }),
    topology: {
      crossWorkspaceId: 'workspace-b',
      crossWorkspaceMission: {
        id: 'mission-cross-workspace',
        objectiveHash: hash('target objective'),
        workspaceId: 'workspace-b',
      },
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

test('local user learning personalizes sibling and cross-workspace missions, then rolls back', () => {
  const evidence = buildLocalUserLearningPersonalizationEvidence(buildInput());

  assertLocalUserLearningPersonalizationEvidence(evidence);
  assert.equal(evidence.actualLocalUserScopedPersonalizationValidated, true);
  assert.deepEqual(evidence.results, {
    auditOrderingPreserved: true,
    baselineClean: true,
    controlledQualityDelta: true,
    distinctSessionsPassed: true,
    externalProviderIsolationPassed: true,
    promotionVerified: true,
    reviewerPassPreserved: true,
    rollbackParity: true,
    topologyBound: true,
    userFeedbackApplied: true,
  });
  assert.equal(evidence.qualityBoundary.singleUserGlobalScopeValidated, true);
  assert.equal(evidence.qualityBoundary.generalUserPersonalizationValidated, false);
  assert.equal(evidence.qualityBoundary.hostedTenantUserPersonalizationValidated, false);
  assert.equal(evidence.qualityBoundary.multiUserIsolationValidated, false);
  assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
});

test('local user learning fails closed on rollback drift or session reuse', () => {
  const drifted = buildInput();
  drifted.phases.crossWorkspace.afterRollback.artifacts.plannerHash = hash('drifted planner');
  const driftedEvidence = buildLocalUserLearningPersonalizationEvidence(drifted);
  assert.equal(driftedEvidence.actualLocalUserScopedPersonalizationValidated, false);
  assert.equal(driftedEvidence.results.rollbackParity, false);

  const reused = buildInput();
  reused.phases.crossWorkspace.afterPromotion.sessionId = reused.sourceRun.sessionId;
  const reusedEvidence = buildLocalUserLearningPersonalizationEvidence(reused);
  assert.equal(reusedEvidence.actualLocalUserScopedPersonalizationValidated, false);
  assert.equal(reusedEvidence.results.distinctSessionsPassed, false);
});

test('local user learning rejects malformed and tampered evidence', () => {
  const malformed = buildInput();
  malformed.promotion.memoryContentHash = 'invalid';
  assert.throws(
    () => buildLocalUserLearningPersonalizationEvidence(malformed),
    /memoryContentHash/,
  );

  const tampered = buildLocalUserLearningPersonalizationEvidence(buildInput());
  tampered.results.topologyBound = false;
  assert.throws(
    () => assertLocalUserLearningPersonalizationEvidence(tampered),
    /integrity|contract/,
  );
});
