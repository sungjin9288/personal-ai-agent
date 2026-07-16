import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertApprovedLearningFeedbackQualityEvidence,
  buildApprovedLearningFeedbackQualityEvidence,
} from '../src/core/approved-learning-feedback-quality.mjs';
import {
  buildApprovedLearningRagFeedbackEvidence,
} from '../src/core/approved-learning-rag-feedback.mjs';
import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';

const hash = (value) => createHash('sha256').update(String(value)).digest('hex');
const caseIds = ['case-alpha', 'case-beta', 'case-gamma'];
const fixtureHash = hash('fixture');

function feedbackRun(index, phase) {
  const adapted = phase === 'after';
  const baselineArtifact = phase === 'rollback' ? 'before' : phase;
  return {
    adaptation: {
      deliverableApplied: adapted,
      planStepCount: adapted ? 4 : 3,
      plannerApplied: adapted,
    },
    artifacts: {
      deliverableHash: hash(`${index}-${baselineArtifact}-deliverable`),
      plannerHash: hash(`${index}-${baselineArtifact}-planner`),
      retrievalHash: adapted ? hash(`${index}-retrieval`) : null,
    },
    externalProviderCallCount: 0,
    learningMemoryPresent: adapted,
    providerId: 'stub',
    retrieval: {
      contentHash: adapted ? hash(`memory-${index}-content`) : null,
      matchTermCount: adapted ? 3 : 0,
      scope: adapted ? 'mission' : '',
      scopeId: adapted ? `mission-${index}` : '',
      sourceId: adapted ? `memory-${index}` : '',
    },
    reviewerVerdict: 'pass',
    sessionId: `session-${index}-${phase}`,
    status: 'completed',
  };
}

function buildFeedbackCase(index) {
  return buildApprovedLearningRagFeedbackEvidence({
    fixtureBinding: {
      caseId: caseIds[index],
      expectedPlanStepHash: hash(`step-${index}`),
      fixtureHash,
      objectiveHash: hash(`objective-${index}`),
      promotionNoteHash: hash(`note-${index}`),
    },
    mission: {
      id: `mission-${index}`,
      objectiveHash: hash(`objective-${index}`),
      workspaceId: 'workspace-1',
    },
    observedAt: '2026-07-17T00:00:00.000Z',
    promotion: {
      candidateId: `candidate-${index}`,
      finalStatus: 'rolled-back',
      memoryContentHash: hash(`memory-${index}-content`),
      memoryId: `memory-${index}`,
      memoryRollbackStatus: 'memory-deleted',
      rollbackAction: 'delete-memory-entry',
      rollbackStatus: 'completed',
      scope: 'mission',
      scopeId: `mission-${index}`,
      target: 'memory',
      verificationId: `verification-${index}`,
      verificationStatus: 'passed',
    },
    runs: {
      afterPromotion: feedbackRun(index, 'after'),
      afterRollback: feedbackRun(index, 'rollback'),
      beforePromotion: feedbackRun(index, 'before'),
    },
  });
}

function evaluatePhase(adapted) {
  return evaluateAnswerQualitySuite({
    cases: caseIds.map((id, index) => ({
      answer: {
        citedSourceKeys: adapted ? [`memory:memory-${index}`] : [],
        text: adapted ? `required-${index}` : 'clean baseline',
      },
      expectedSourceKeys: [`memory:memory-${index}`],
      forbiddenAnswerTerms: caseIds
        .filter((_, otherIndex) => otherIndex !== index)
        .map((_, otherIndex) => `foreign-${otherIndex}`),
      forbiddenSourceKeys: caseIds
        .filter((_, otherIndex) => otherIndex !== index)
        .map((_, otherIndex) => `memory:foreign-${otherIndex}`),
      id,
      requiredAnswerTerms: [`required-${index}`],
      retrievedItems: adapted ? [{ sourceKey: `memory:memory-${index}` }] : [],
      reviewerVerdict: 'pass',
    })),
  });
}

function buildInput() {
  const beforePromotion = evaluatePhase(false);
  return {
    evaluations: {
      afterPromotion: evaluatePhase(true),
      afterRollback: structuredClone(beforePromotion),
      beforePromotion,
    },
    feedbackCases: caseIds.map((_, index) => buildFeedbackCase(index)),
    fixtureBinding: {
      caseIds,
      fixtureHash,
    },
    isolation: caseIds.map((caseId, index) => ({
      caseId,
      expectedMemoryId: `memory-${index}`,
      expectedMemorySourceCount: 1,
      foreignMemoryCandidateCount: 2,
      foreignMemoryIds: caseIds
        .map((_, memoryIndex) => `memory-${memoryIndex}`)
        .filter((_, memoryIndex) => memoryIndex !== index),
      foreignMemoryRetrievedCount: 0,
      retrievedExpectedMemorySourceCount: 1,
      retrievedMemoryIds: [`memory-${index}`],
    })),
    observedAt: '2026-07-17T00:00:00.000Z',
  };
}

test('multi-scenario feedback quality passes controlled improvement, isolation, and rollback', () => {
  const evidence = buildApprovedLearningFeedbackQualityEvidence(buildInput());

  assertApprovedLearningFeedbackQualityEvidence(evidence);
  assert.equal(evidence.actualApprovedLearningFeedbackQualityValidated, true);
  assert.deepEqual(evidence.results, {
    allFeedbackLoopsPassed: true,
    caseIdentityPassed: true,
    controlledQualityImprovementPassed: true,
    distinctIdentityPassed: true,
    externalProviderIsolationPassed: true,
    foreignMemoryIsolationPassed: true,
    reviewerPassPreserved: true,
    rollbackQualityParity: true,
  });
  assert.equal(evidence.evaluations.beforePromotion.summary.metrics.casePassRate, 0);
  assert.equal(evidence.evaluations.afterPromotion.summary.metrics.casePassRate, 1);
  assert.equal(evidence.evaluations.afterRollback.summary.metrics.casePassRate, 0);
  assert.equal(evidence.qualityBoundary.controlledMultiScenarioAnswerQualityValidated, true);
  assert.equal(evidence.qualityBoundary.crossMissionGeneralizationValidated, false);
  assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
  assert.equal(evidence.productionReadyClaim, false);
});

test('multi-scenario feedback quality fails closed on contamination or missing quality delta', () => {
  const contaminated = buildInput();
  contaminated.isolation[1].foreignMemoryRetrievedCount = 1;
  const contaminationEvidence = buildApprovedLearningFeedbackQualityEvidence(contaminated);
  assert.equal(contaminationEvidence.actualApprovedLearningFeedbackQualityValidated, false);
  assert.equal(contaminationEvidence.results.foreignMemoryIsolationPassed, false);

  const unchanged = buildInput();
  unchanged.evaluations.afterPromotion = evaluatePhase(false);
  const unchangedEvidence = buildApprovedLearningFeedbackQualityEvidence(unchanged);
  assert.equal(unchangedEvidence.actualApprovedLearningFeedbackQualityValidated, false);
  assert.equal(unchangedEvidence.results.controlledQualityImprovementPassed, false);
});

test('multi-scenario feedback quality rejects malformed and tampered evidence', () => {
  const malformed = buildInput();
  malformed.fixtureBinding.caseIds = ['only-one'];
  assert.throws(
    () => buildApprovedLearningFeedbackQualityEvidence(malformed),
    /at least three unique cases/,
  );

  const tampered = buildApprovedLearningFeedbackQualityEvidence(buildInput());
  tampered.results.rollbackQualityParity = false;
  assert.throws(
    () => assertApprovedLearningFeedbackQualityEvidence(tampered),
    /integrity|contract/,
  );
});
