import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertApprovedLearningRagFeedbackEvidence,
  buildApprovedLearningRagFeedbackEvidence,
} from '../src/core/approved-learning-rag-feedback.mjs';

const hash = (value) => createHash('sha256').update(String(value)).digest('hex');

function run({ adapted = false, label, artifactLabel = label, memoryPresent = adapted } = {}) {
  return {
    adaptation: {
      deliverableApplied: adapted,
      planStepCount: adapted ? 4 : 3,
      plannerApplied: adapted,
    },
    artifacts: {
      deliverableHash: hash(`${artifactLabel}-deliverable`),
      plannerHash: hash(`${artifactLabel}-planner`),
      retrievalHash: adapted ? hash(`${artifactLabel}-retrieval`) : null,
    },
    externalProviderCallCount: 0,
    learningMemoryPresent: memoryPresent,
    providerId: 'stub',
    retrieval: {
      contentHash: adapted ? hash('memory-content') : null,
      matchTermCount: adapted ? 3 : 0,
      scope: adapted ? 'mission' : '',
      scopeId: adapted ? 'mission-1' : '',
      sourceId: adapted ? 'memory-1' : '',
    },
    reviewerVerdict: 'pass',
    sessionId: `session-${label}`,
    status: 'completed',
  };
}

function buildInput() {
  return {
    fixtureBinding: {
      caseId: 'feedback-case',
      expectedPlanStepHash: hash('expected-step'),
      fixtureHash: hash('fixture'),
      objectiveHash: hash('objective'),
      promotionNoteHash: hash('note'),
    },
    mission: {
      id: 'mission-1',
      objectiveHash: hash('objective'),
      workspaceId: 'workspace-1',
    },
    observedAt: '2026-07-17T00:00:00.000Z',
    promotion: {
      candidateId: 'candidate-1',
      finalStatus: 'rolled-back',
      memoryContentHash: hash('memory-content'),
      memoryId: 'memory-1',
      memoryRollbackStatus: 'memory-deleted',
      rollbackAction: 'delete-memory-entry',
      rollbackStatus: 'completed',
      scope: 'mission',
      scopeId: 'mission-1',
      target: 'memory',
      verificationId: 'verification-1',
      verificationStatus: 'passed',
    },
    runs: {
      beforePromotion: run({ label: 'before' }),
      afterPromotion: run({ adapted: true, label: 'after' }),
      afterRollback: run({ artifactLabel: 'before', label: 'rollback' }),
    },
  };
}

test('approved learning feedback binds promoted memory to RAG adaptation and rollback', () => {
  const evidence = buildApprovedLearningRagFeedbackEvidence(buildInput());

  assertApprovedLearningRagFeedbackEvidence(evidence);
  assert.equal(evidence.actualApprovedLearningRagFeedbackValidated, true);
  assert.equal(evidence.results.retrievalLineageBound, true);
  assert.equal(evidence.results.plannerAndDeliverableAdapted, true);
  assert.equal(evidence.results.rollbackArtifactParity, true);
  assert.equal(evidence.results.rollbackRestoredBaseline, true);
  assert.equal(evidence.qualityBoundary.generalAnswerQualityImprovementValidated, false);
  assert.equal(evidence.qualityBoundary.actualModelTrainingExecuted, false);
  assert.equal(evidence.productionReadyClaim, false);
});

test('feedback evidence fails closed on retrieval lineage or rollback regression', () => {
  const wrongLineage = buildInput();
  wrongLineage.runs.afterPromotion.retrieval.sourceId = 'memory-other';
  const lineageEvidence = buildApprovedLearningRagFeedbackEvidence(wrongLineage);
  assert.equal(lineageEvidence.actualApprovedLearningRagFeedbackValidated, false);
  assert.equal(lineageEvidence.results.retrievalLineageBound, false);

  const rollbackRegression = buildInput();
  rollbackRegression.runs.afterRollback = run({ adapted: true, label: 'rollback' });
  const rollbackEvidence = buildApprovedLearningRagFeedbackEvidence(rollbackRegression);
  assert.equal(rollbackEvidence.actualApprovedLearningRagFeedbackValidated, false);
  assert.equal(rollbackEvidence.results.rollbackRestoredBaseline, false);
});

test('feedback evidence rejects malformed and tampered records', () => {
  const malformed = buildInput();
  malformed.runs.afterPromotion.artifacts.plannerHash = 'not-a-hash';
  assert.throws(
    () => buildApprovedLearningRagFeedbackEvidence(malformed),
    /plannerHash/,
  );

  const tampered = buildApprovedLearningRagFeedbackEvidence(buildInput());
  tampered.results.reviewerPassPreserved = false;
  assert.throws(
    () => assertApprovedLearningRagFeedbackEvidence(tampered),
    /integrity|contract/,
  );
});
