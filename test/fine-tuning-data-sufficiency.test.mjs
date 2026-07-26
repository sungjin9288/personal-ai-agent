import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import {
  assessFineTuningDataSufficiency,
  assertFineTuningDataSufficiencyAssessment,
  buildFineTuningDataSufficiencyPolicy,
} from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { buildApprovedTrainingRecordFixture } from '../scripts/approved-training-record-fixture.mjs';
import { buildDeterministicFineTuningReadinessFixture } from '../scripts/local-training-permission-fixture.mjs';

const repoDir = process.cwd();

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function resignReadinessPackage(readinessPackage) {
  const evaluation = readinessPackage.evaluationManifest;
  const {
    id: ignoredEvaluationId,
    manifestHash: ignoredManifestHash,
    ...evaluationContent
  } = evaluation;
  evaluation.manifestHash = hashRecord(evaluationContent);
  evaluation.id = `fine-tuning-evaluation-${evaluation.manifestHash}`;
  readinessPackage.dataset = evaluation.dataset;
  readinessPackage.evaluationManifestHash = evaluation.manifestHash;
  const {
    evaluationManifest: ignoredEvaluation,
    exports: ignoredExports,
    id: ignoredReadinessId,
    readinessHash: ignoredReadinessHash,
    ...readinessContent
  } = readinessPackage;
  readinessPackage.readinessHash = hashRecord(readinessContent);
  readinessPackage.id =
    `fine-tuning-readiness-${readinessPackage.readinessHash}`;
  return readinessPackage;
}

test('current F1 fixture stops before candidate training review because data is insufficient', () => {
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage:
      buildDeterministicFineTuningReadinessFixture({ repoDir }),
  });

  assert.doesNotThrow(() =>
    assertFineTuningDataSufficiencyAssessment(assessment));
  assert.equal(assessment.status, 'insufficient-data');
  assert.equal(assessment.decision, 'collect-more-reviewed-data');
  assert.equal(assessment.developmentGatePassed, false);
  assert.equal(assessment.candidateTrainingReviewAllowed, false);
  assert.equal(assessment.candidateTrainingReviewReady, false);
  assert.deepEqual(assessment.measurements, {
    acceptedExamples: 4,
    acceptedRiskExamples: 0,
    acceptedRiskRate: 0,
    answerQualityCases: 2,
    missionScopes: 4,
    trainExamples: 3,
    validationExamples: 1,
  });
  assert.deepEqual(assessment.failedCheckIds, [
    'accepted-example-minimum',
    'train-example-minimum',
    'validation-example-minimum',
    'mission-scope-minimum',
    'answer-quality-case-minimum',
  ]);
  assert.equal(assessment.trainingAuthorized, false);
  assert.equal(assessment.actualModelTrainingExecuted, false);
  assert.equal(assessment.externalSubmissionAuthorized, false);
  assert.equal(assessment.productionReadyClaim, false);
  assert.equal(
    assessment.policy.productionQualityThresholdClaim,
    false,
  );
});

test('development minimum requires separate candidate review approval', () => {
  const datasetFixture = JSON.parse(
    fs.readFileSync(
      path.join(repoDir, 'fixtures/fine-tuning-readiness-cases-v1.json'),
      'utf8',
    ),
  );
  const answerFixture = JSON.parse(
    fs.readFileSync(
      path.join(repoDir, datasetFixture.answerQualityFixture),
      'utf8',
    ),
  );
  const cases = Array.from({ length: 20 }, (_, index) => ({
    id: `sufficiency-${String(index + 1).padStart(2, '0')}`,
    instruction: `Prepare reviewed local guidance for bounded case ${index + 1}.`,
    response: `Case ${index + 1} keeps evidence, permission, rollback, and scope boundaries explicit.`,
  }));
  const records = cases.map((testCase) =>
    buildApprovedTrainingRecord(
      buildApprovedTrainingRecordFixture({
        example: {
          instruction: testCase.instruction,
          response: testCase.response,
        },
        missionId: `mission-${testCase.id}`,
        suffix: testCase.id,
      }),
    ));

  const datasetManifest = buildTrainingDatasetManifest({
    records,
    seed: 'fine-tuning-data-sufficiency-positive-v1',
  });
  const baselineCases = Array.from({ length: 10 }, (_, index) => {
    const source = answerFixture.cases[index % answerFixture.cases.length];
    const { retrievalInput, ...definition } = source;
    return {
      ...definition,
      id: `sufficiency-baseline-${String(index + 1).padStart(2, '0')}`,
      retrievedItems: buildRetrievalContext(retrievalInput),
    };
  });
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: baselineCases,
    thresholds: answerFixture.thresholds,
  });
  const readinessPackage = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest,
    records,
  });
  const assessment = assessFineTuningDataSufficiency({ readinessPackage });

  assert.equal(
    assessment.status,
    'sufficient-for-candidate-review-request',
  );
  assert.equal(
    assessment.decision,
    'request-candidate-training-review-approval',
  );
  assert.equal(assessment.developmentGatePassed, true);
  assert.equal(assessment.candidateTrainingReviewReady, true);
  assert.equal(assessment.candidateTrainingReviewAllowed, false);
  assert.deepEqual(assessment.failedCheckIds, []);
  assert.equal(assessment.measurements.acceptedExamples, 20);
  assert.equal(assessment.measurements.trainExamples, 16);
  assert.equal(assessment.measurements.validationExamples, 4);
  assert.equal(assessment.measurements.missionScopes, 20);
  assert.equal(assessment.measurements.answerQualityCases, 10);
  assert.equal(assessment.trainingAuthorized, false);
  assert.equal(assessment.actualModelTrainingExecuted, false);
  assert.equal(assessment.reviewerApprovalRequired, true);
  assert.equal(assessment.trustedReadinessAdmissionBound, false);
});

test('accepted-risk summary must match exported record identities', () => {
  const records = ['a', 'b', 'c', 'd'].map((suffix, index) => {
    const fixture = buildApprovedTrainingRecordFixture({
      example: {
        instruction: `Prepare reviewed risk case ${suffix}.`,
        response: `Keep risk case ${suffix} bounded and auditable.`,
      },
      missionId: `mission-risk-${suffix}`,
      suffix: `risk-${suffix}`,
    });
    if (index === 0) {
      fixture.acceptedRisk = {
        approvedAt: '2026-07-16T09:30:00.000Z',
        approvedBy: 'workspace-owner',
        expiresAt: '2026-07-20T00:00:00.000Z',
        id: 'accepted-risk-a',
        note: 'Monitor this bounded formatting variance.',
        resolutionKind: 'accepted-risk',
        scope: 'mission',
        scopeId: fixture.mission.id,
      };
    }
    return buildApprovedTrainingRecord(fixture);
  });
  const datasetManifest = buildTrainingDatasetManifest({
    records,
    seed: 'fine-tuning-data-sufficiency-risk-v1',
  });
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: [
      {
        answer: {
          citedSourceKeys: ['memory:workspace/fact'],
          text: 'Reviewed evidence confirms the bounded decision.',
        },
        expectedSourceKeys: ['memory:workspace/fact'],
        id: 'risk-baseline',
        requiredAnswerTerms: ['reviewed evidence', 'decision'],
        retrievedItems: [{ sourceKey: 'memory:workspace/fact' }],
        reviewerVerdict: 'pass',
      },
    ],
  });
  const readinessPackage = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest,
    records,
  });
  const tampered = structuredClone(readinessPackage);
  tampered.evaluationManifest.dataset.acceptedRiskRecordCount = 0;
  tampered.evaluationManifest.dataset.acceptedRiskRecordIds = [];
  resignReadinessPackage(tampered);

  assert.throws(
    () => assessFineTuningDataSufficiency({ readinessPackage: tampered }),
    /accepted-risk binding failed/u,
  );
});

test('policy and assessment tampering fail closed', () => {
  const readinessPackage =
    buildDeterministicFineTuningReadinessFixture({ repoDir });
  const policy = buildFineTuningDataSufficiencyPolicy();
  const forgedPolicy = structuredClone(policy);
  forgedPolicy.requirements.minimumAcceptedExamples = 4;

  assert.throws(
    () =>
      assessFineTuningDataSufficiency({
        policy: forgedPolicy,
        readinessPackage,
      }),
    /policy integrity failed/u,
  );

  const assessment = assessFineTuningDataSufficiency({ readinessPackage });
  const forgedAssessment = structuredClone(assessment);
  forgedAssessment.candidateTrainingReviewAllowed = true;
  assert.throws(
    () =>
      assertFineTuningDataSufficiencyAssessment(forgedAssessment),
    /authority boundary failed/u,
  );

  const unboundAssessment = structuredClone(assessment);
  unboundAssessment.bindings.trainSha256 = null;
  assert.throws(
    () =>
      assertFineTuningDataSufficiencyAssessment(unboundAssessment),
    /bindings are invalid/u,
  );
});
