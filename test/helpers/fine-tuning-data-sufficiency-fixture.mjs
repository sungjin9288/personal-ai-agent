import fs from 'node:fs';
import path from 'node:path';

import { evaluateAnswerQualitySuite } from '../../src/core/answer-quality-evaluation.mjs';
import { buildApprovedTrainingRecord } from '../../src/core/approved-training-record.mjs';
import { assessFineTuningDataSufficiency } from '../../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningReadinessPackage } from '../../src/core/fine-tuning-readiness.mjs';
import { buildRetrievalContext } from '../../src/core/retrieval-service.mjs';
import { buildTrainingDatasetManifest } from '../../src/core/training-dataset-quality.mjs';
import { buildApprovedTrainingRecordFixture } from '../../scripts/approved-training-record-fixture.mjs';

export function buildSufficientFineTuningDataSufficiencyFixture({
  acceptedRiskCount = 0,
  answerQualityCaseCount = 10,
  recordCount = 20,
  repoDir = process.cwd(),
} = {}) {
  const readinessFixture = JSON.parse(
    fs.readFileSync(
      path.join(repoDir, 'fixtures/fine-tuning-readiness-cases-v1.json'),
      'utf8',
    ),
  );
  const answerFixture = JSON.parse(
    fs.readFileSync(
      path.join(repoDir, readinessFixture.answerQualityFixture),
      'utf8',
    ),
  );
  const records = Array.from({ length: recordCount }, (_, index) => {
    const caseNumber = index + 1;
    const fixture = buildApprovedTrainingRecordFixture({
      example: {
        instruction: `Prepare reviewed local guidance for bounded case ${caseNumber}.`,
        response: `Case ${caseNumber} keeps evidence, permission, rollback, and scope boundaries explicit.`,
      },
      missionId: `mission-sufficiency-${String(caseNumber).padStart(2, '0')}`,
      suffix: `sufficiency-${String(caseNumber).padStart(2, '0')}`,
    });
    if (index < acceptedRiskCount) {
      fixture.acceptedRisk = {
        approvedAt: '2026-07-16T09:30:00.000Z',
        approvedBy: 'workspace-owner',
        expiresAt: '2026-07-20T00:00:00.000Z',
        id: `accepted-risk-${String(caseNumber).padStart(2, '0')}`,
        note: 'Bounded local evaluation risk accepted for fixture coverage.',
        resolutionKind: 'accepted-risk',
        scope: 'mission',
        scopeId: fixture.mission.id,
      };
    }
    return buildApprovedTrainingRecord(fixture);
  });
  const datasetManifest = buildTrainingDatasetManifest({
    records,
    seed: 'fine-tuning-data-sufficiency-positive-v1',
  });
  const baselineCases = Array.from(
    { length: answerQualityCaseCount },
    (_, index) => {
      const source =
        answerFixture.cases[index % answerFixture.cases.length];
      const { retrievalInput, ...definition } = source;
      return {
        ...definition,
        id: `sufficiency-baseline-${String(index + 1).padStart(2, '0')}`,
        retrievedItems: buildRetrievalContext(retrievalInput),
      };
    },
  );
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: baselineCases,
    thresholds: answerFixture.thresholds,
  });
  const readinessPackage = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest,
    records,
  });

  return assessFineTuningDataSufficiency({ readinessPackage });
}
