import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import {
  buildCandidateModelEvidence,
  CANDIDATE_MODEL_EVIDENCE_SCHEMA_VERSION,
  CANDIDATE_MODEL_GATE_SCHEMA_VERSION,
  evaluateCandidateModelGate,
} from '../src/core/candidate-model-evaluation.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { buildApprovedTrainingRecordFixture } from './helpers/approved-training-record-fixture.mjs';

function buildRecord({ instruction, missionId, response, suffix }) {
  return buildApprovedTrainingRecord(
    buildApprovedTrainingRecordFixture({
      example: { instruction, response },
      missionId,
      suffix,
    }),
  );
}

function buildRecords() {
  return [
    buildRecord({
      instruction: 'Write a decision memo from reviewed evidence.',
      missionId: 'mission-a',
      response: 'State the decision, cite the evidence, and preserve the next action.',
      suffix: 'a',
    }),
    buildRecord({
      instruction: 'Summarize a provider failure.',
      missionId: 'mission-b',
      response: 'Record the failure, stop reason, fallback decision, and next owner.',
      suffix: 'b',
    }),
    buildRecord({
      instruction: 'Prepare a reviewer handoff.',
      missionId: 'mission-c',
      response: 'Name the owner, evidence, deadline, and resolution condition.',
      suffix: 'c',
    }),
    buildRecord({
      instruction: 'Explain a retrieval result.',
      missionId: 'mission-d',
      response: 'Use cited evidence and separate confirmed facts from assumptions.',
      suffix: 'd',
    }),
  ];
}

function buildQualityCase(id, overrides = {}) {
  return {
    answer: {
      citedSourceKeys: ['memory:workspace/fact'],
      text: 'Reviewed evidence confirms the decision and preserves the next action.',
    },
    expectedSourceKeys: ['memory:workspace/fact'],
    forbiddenAnswerTerms: ['production validated'],
    forbiddenSourceKeys: ['memory:mission/preference'],
    id,
    requiredAnswerTerms: ['reviewed evidence', 'decision'],
    retrievedItems: [{ sourceKey: 'memory:workspace/fact' }],
    reviewerVerdict: 'pass',
    ...overrides,
  };
}

function buildFixture() {
  const records = buildRecords();
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: [buildQualityCase('quality-a'), buildQualityCase('quality-b')],
  });
  const readinessPackage = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest: buildTrainingDatasetManifest({
      records,
      seed: 'candidate-model-evaluation-v1',
    }),
    records,
  });
  const candidateEvaluation = evaluateAnswerQualitySuite({
    cases: [
      buildQualityCase('quality-a', {
        answer: {
          citedSourceKeys: ['memory:workspace/fact'],
          text: 'The decision follows reviewed evidence and keeps the next action explicit.',
        },
      }),
      buildQualityCase('quality-b'),
    ],
  });
  const candidateEvidence = buildCandidateModelEvidence({
    actualModelEvaluated: false,
    candidateEvaluation,
    candidateId: 'candidate-fixture-v1',
    evaluatedAt: '2026-07-16T11:30:00.000Z',
    evaluationRunId: 'evaluation-run-fixture-v1',
    evaluationSource: 'fixture-simulated',
    evidenceRefs: ['fixture:candidate-model-evaluation-v1'],
    modelId: 'fixture-candidate-model-v1',
    provider: 'fixture',
    readinessPackage,
  });
  return { candidateEvaluation, candidateEvidence, readinessPackage };
}

test('candidate evidence binds the evaluation and readiness without rollout authority', () => {
  const fixture = buildFixture();
  const evidence = fixture.candidateEvidence;

  assert.equal(evidence.schemaVersion, CANDIDATE_MODEL_EVIDENCE_SCHEMA_VERSION);
  assert.equal(evidence.datasetHash, fixture.readinessPackage.dataset.datasetHash);
  assert.equal(evidence.readinessHash, fixture.readinessPackage.readinessHash);
  assert.match(evidence.evaluationHash, /^[a-f0-9]{64}$/);
  assert.match(evidence.evidenceHash, /^[a-f0-9]{64}$/);
  assert.equal(evidence.id, `candidate-model-evidence-${evidence.evidenceHash}`);
  assert.equal(evidence.actualModelEvaluated, false);
  assert.equal(evidence.externalSubmissionAuthorized, false);
  assert.equal(evidence.rolloutAuthorized, false);
  assert.equal(evidence.productionReadyClaim, false);
});

test('non-regressing fixture candidate is ready for review while rollout stays blocked', () => {
  const fixture = buildFixture();
  const result = evaluateCandidateModelGate(fixture);

  assert.equal(result.schemaVersion, CANDIDATE_MODEL_GATE_SCHEMA_VERSION);
  assert.equal(result.status, 'ready-for-review');
  assert.equal(result.comparison.status, 'passed');
  assert.equal(result.comparison.checkCounts.failed, 0);
  assert.equal(result.decision, 'hold-for-review');
  assert.equal(result.rollback.required, false);
  assert.equal(result.rollback.action, 'available');
  assert.equal(result.rollout.status, 'blocked');
  assert.equal(result.rollout.activationAuthorized, false);
  assert.equal(result.rollout.reviewerDecision, 'pending');
  assert.equal(
    result.rollout.checks.find((check) => check.id === 'actual-model-evaluated').status,
    'failed',
  );
  assert.equal(result.productionReadyClaim, false);
  assert.match(result.gateHash, /^[a-f0-9]{64}$/);
});

test('candidate metric regression requires baseline rollback', () => {
  const fixture = buildFixture();
  fixture.candidateEvaluation = evaluateAnswerQualitySuite({
    cases: [
      buildQualityCase('quality-a'),
      buildQualityCase('quality-b', {
        answer: {
          citedSourceKeys: [],
          text: 'The result remains unresolved.',
        },
        reviewerVerdict: 'fail',
      }),
    ],
  });
  fixture.candidateEvidence = buildCandidateModelEvidence({
    actualModelEvaluated: false,
    candidateEvaluation: fixture.candidateEvaluation,
    candidateId: 'candidate-regression-v1',
    evaluatedAt: '2026-07-16T11:31:00.000Z',
    evaluationRunId: 'evaluation-run-regression-v1',
    evaluationSource: 'fixture-simulated',
    evidenceRefs: ['fixture:candidate-model-regression-v1'],
    modelId: 'fixture-candidate-model-regression-v1',
    provider: 'fixture',
    readinessPackage: fixture.readinessPackage,
  });

  const result = evaluateCandidateModelGate(fixture);

  assert.equal(result.status, 'rollback-required');
  assert.equal(result.comparison.status, 'failed');
  assert.equal(result.decision, 'keep-baseline');
  assert.equal(result.rollback.required, true);
  assert.equal(result.rollback.action, 'keep-baseline');
  assert.equal(result.rollback.triggerCheckIds.includes('candidate-gate-passed'), true);
  assert.equal(result.rollback.triggerCheckIds.includes('candidate-reviewer-passed'), true);
  assert.equal(result.rollback.triggerCheckIds.includes('suite-metrics-no-regression'), true);
  assert.equal(result.rollback.triggerCheckIds.includes('case-metrics-no-regression'), true);
});

test('case-set, threshold, and evidence drift block the comparison', () => {
  const caseDrift = buildFixture();
  caseDrift.candidateEvaluation = evaluateAnswerQualitySuite({
    cases: [buildQualityCase('quality-a'), buildQualityCase('quality-c')],
  });
  let result = evaluateCandidateModelGate(caseDrift);
  assert.equal(
    result.comparison.checks.find((check) => check.id === 'case-set-matched').status,
    'failed',
  );

  const thresholdDrift = buildFixture();
  thresholdDrift.candidateEvaluation = evaluateAnswerQualitySuite({
    cases: [buildQualityCase('quality-a'), buildQualityCase('quality-b')],
    thresholds: { minimumRequiredTermCoverage: 0.5 },
  });
  result = evaluateCandidateModelGate(thresholdDrift);
  assert.equal(
    result.comparison.checks.find((check) => check.id === 'thresholds-matched').status,
    'failed',
  );

  const evidenceDrift = buildFixture();
  evidenceDrift.candidateEvidence.evaluationHash = '0'.repeat(64);
  result = evaluateCandidateModelGate(evidenceDrift);
  assert.equal(
    result.comparison.checks.find((check) => check.id === 'candidate-evidence-bound').status,
    'failed',
  );

  const metadataDrift = buildFixture();
  metadataDrift.candidateEvidence.modelId = 'changed-after-evaluation';
  result = evaluateCandidateModelGate(metadataDrift);
  assert.equal(
    result.comparison.checks.find((check) => check.id === 'candidate-evidence-bound').status,
    'failed',
  );
});

test('recorded model evidence marks actual evaluation but cannot self-authorize rollout', () => {
  const fixture = buildFixture();
  fixture.candidateEvidence = buildCandidateModelEvidence({
    actualModelEvaluated: true,
    candidateEvaluation: fixture.candidateEvaluation,
    candidateId: 'candidate-recorded-v1',
    evaluatedAt: '2026-07-16T11:32:00.000Z',
    evaluationRunId: 'evaluation-run-recorded-v1',
    evaluationSource: 'recorded-model-evaluation',
    evidenceRefs: ['artifact:candidate-result-v1'],
    modelId: 'recorded-model-v1',
    provider: 'provider-neutral-record',
    readinessPackage: fixture.readinessPackage,
  });

  const result = evaluateCandidateModelGate(fixture);

  assert.equal(result.candidate.actualModelEvaluated, true);
  assert.equal(
    result.rollout.checks.find((check) => check.id === 'actual-model-evaluated').status,
    'passed',
  );
  assert.equal(result.rollout.status, 'blocked');
  assert.equal(result.rollout.activationAuthorized, false);
});

test('candidate evidence enforces source-consistent actual model status', () => {
  const fixture = buildFixture();

  assert.throws(
    () =>
      buildCandidateModelEvidence({
        actualModelEvaluated: true,
        candidateEvaluation: fixture.candidateEvaluation,
        candidateId: 'invalid-candidate',
        evaluatedAt: '2026-07-16T11:33:00.000Z',
        evaluationRunId: 'invalid-run',
        evaluationSource: 'fixture-simulated',
        evidenceRefs: ['fixture:invalid'],
        modelId: 'invalid-model',
        provider: 'fixture',
        readinessPackage: fixture.readinessPackage,
      }),
    /source-consistent model status/,
  );
});

test('candidate gate is deterministic and omits answer text', () => {
  const fixture = buildFixture();
  const before = JSON.stringify(fixture);
  const result = evaluateCandidateModelGate(fixture);
  const replayed = evaluateCandidateModelGate(structuredClone(fixture));

  assert.deepEqual(replayed, result);
  assert.equal(JSON.stringify(fixture), before);
  assert.equal(
    JSON.stringify(result).includes('The decision follows reviewed evidence'),
    false,
  );
});
