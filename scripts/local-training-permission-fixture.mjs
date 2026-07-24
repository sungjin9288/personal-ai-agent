import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import { buildFineTuningReadinessPackage } from '../src/core/fine-tuning-readiness.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { createApprovedTrainingRecordFixtureSet } from './training-record-fixture-runtime.mjs';
import { buildApprovedTrainingRecordFixture } from './approved-training-record-fixture.mjs';

function readJson(repoDir, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoDir, relativePath), 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function buildLocalTrainingPermissionCliArgs({ expiresAt, missionId, readinessPath }) {
  return [
    'approval',
    'request-local-training',
    missionId,
    '--readiness',
    readinessPath,
    '--approval-owner',
    'local-training-operator',
    '--base-model',
    'approved-local-base-model',
    '--trainer',
    'approved-local-trainer',
    '--expires-at',
    expiresAt,
    '--license-evidence-sha256',
    sha256('base-model-license-review'),
    '--license-owner',
    'license-owner',
    '--egress-evidence-sha256',
    sha256('os-egress-isolation-evidence'),
    '--egress-owner',
    'security-owner',
    '--resource-evidence-sha256',
    sha256('resource-envelope-evidence'),
    '--resource-owner',
    'resource-owner',
    '--max-cpu-threads',
    '4',
    '--max-memory-bytes',
    '8000000000',
    '--max-disk-bytes',
    '20000000000',
    '--max-runtime-ms',
    '3600000',
    '--rollback-owner',
    'rollback-owner',
  ];
}

export function buildLocalTrainingReadinessFixture({ repoDir = process.cwd() } = {}) {
  const readinessFixture = readJson(repoDir, 'fixtures/fine-tuning-readiness-cases-v1.json');
  const datasetFixture = readJson(repoDir, readinessFixture.datasetFixture);
  const answerQualityFixture = readJson(repoDir, readinessFixture.answerQualityFixture);
  const fixtureRuntime = createApprovedTrainingRecordFixtureSet({
    cases: datasetFixture.cases,
    tempPrefix: 'personal-ai-agent-training-permission-records-',
  });

  try {
    const datasetManifest = buildTrainingDatasetManifest({
      records: fixtureRuntime.records,
      seed: datasetFixture.seed,
    });
    const baselineEvaluation = evaluateAnswerQualitySuite({
      cases: answerQualityFixture.cases.map(({ retrievalInput, ...definition }) => ({
        ...definition,
        retrievedItems: buildRetrievalContext(retrievalInput),
      })),
      thresholds: answerQualityFixture.thresholds,
    });
    return buildFineTuningReadinessPackage({
      baselineEvaluation,
      datasetManifest,
      records: fixtureRuntime.records,
    });
  } finally {
    fs.rmSync(fixtureRuntime.tempRoot, { force: true, recursive: true });
  }
}

export function buildDeterministicFineTuningReadinessFixture({
  repoDir = process.cwd(),
} = {}) {
  const readinessFixture = readJson(
    repoDir,
    'fixtures/fine-tuning-readiness-cases-v1.json',
  );
  const datasetFixture = readJson(
    repoDir,
    readinessFixture.datasetFixture,
  );
  const answerQualityFixture = readJson(
    repoDir,
    readinessFixture.answerQualityFixture,
  );
  const records = datasetFixture.cases.map((testCase) =>
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
    seed: datasetFixture.seed,
  });
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: answerQualityFixture.cases.map(
      ({ retrievalInput, ...definition }) => ({
        ...definition,
        retrievedItems: buildRetrievalContext(retrievalInput),
      }),
    ),
    thresholds: answerQualityFixture.thresholds,
  });

  return buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest,
    records,
  });
}

export function buildDeterministicFineTuningBaselineContext({ repoDir = process.cwd() } = {}) {
  const readinessFixture = readJson(repoDir, 'fixtures/fine-tuning-readiness-cases-v1.json');
  const datasetFixture = readJson(repoDir, readinessFixture.datasetFixture);
  const answerQualityFixture = readJson(repoDir, readinessFixture.answerQualityFixture);
  const records = datasetFixture.cases.map((testCase) => buildApprovedTrainingRecord(buildApprovedTrainingRecordFixture({
    example: { instruction: testCase.instruction, response: testCase.response },
    missionId: `mission-${testCase.id}`,
    suffix: testCase.id,
  })));
  const datasetManifest = buildTrainingDatasetManifest({ records, seed: datasetFixture.seed });
  const baselineEvaluation = evaluateAnswerQualitySuite({
    cases: answerQualityFixture.cases.map(
      ({ retrievalInput, ...definition }) => ({
        ...definition,
        retrievedItems: buildRetrievalContext(retrievalInput),
      }),
    ),
    thresholds: answerQualityFixture.thresholds,
  });
  const readinessPackage = buildFineTuningReadinessPackage({
    baselineEvaluation,
    datasetManifest,
    records,
  });
  return {
    baselineEvaluation,
    datasetManifest,
    readinessPackage,
    records,
    sufficiencyAssessment: assessFineTuningDataSufficiency({ readinessPackage }),
  };
}
