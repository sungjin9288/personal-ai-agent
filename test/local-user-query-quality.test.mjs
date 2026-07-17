import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertLocalUserQueryQuality,
  buildLocalUserQueryQuality,
  summarizeLocalUserQueryEvaluation,
} from '../src/core/local-user-query-quality.mjs';
import { buildUserQueryEvaluationIntake } from '../src/core/user-query-evaluation-intake.mjs';
import {
  assertLocalUserQueryEvaluationAuthorization,
  evaluateLocalUserQuerySuite,
  loadLocalUserQueryEvaluationSuite,
  LOCAL_USER_QUERY_QUALITY_THRESHOLDS,
} from '../scripts/local-user-query-evaluation-suite.mjs';

const baseline = readJson(
  'evidence/output-artifacts/local-answer-composition-boundary-regression.json',
);
const fixturePath = path.resolve(
  'fixtures/user-query-evaluation-intake-dry-run-v1.json',
);
const intakePath = path.resolve(
  'evidence/output-artifacts/user-query-evaluation-intake.json',
);

test('synthetic local user-query quality stays content-free and does not activate the answer path', () => {
  const context = buildContext();
  const evidence = buildEvidence(context);

  assertLocalUserQueryQuality(evidence);
  assert.equal(evidence.status, 'synthetic-user-query-quality-passed-actual-evaluation-required');
  assert.equal(evidence.syntheticUserQueryQualityValidated, true);
  assert.equal(evidence.actualUserQueryQualityValidated, false);
  assert.equal(evidence.currentAnswerPathChanged, false);
  assert.equal(evidence.evaluatorContractTermsSentToModel, false);
  assert.equal(evidence.evaluation.domainBreakdown.length, 6);
  assert.equal(evidence.evaluation.languageBreakdown.length, 4);

  const serialized = JSON.stringify(evidence);
  assert.equal(serialized.includes('retry guard'), false);
  assert.equal(serialized.includes('requiredAnswerTerms'), false);
  assert.equal(serialized.includes('Explain why'), false);
});

test('quality regression keeps the current answer path', () => {
  const context = buildContext({ failingCase: true });
  const evidence = buildEvidence(context);

  assertLocalUserQueryQuality(evidence);
  assert.equal(evidence.localUserQueryEvaluationValidated, false);
  assert.equal(evidence.decision, 'keep-current-answer-path');
  assert.equal(evidence.currentAnswerPathChanged, false);
  assert.equal(evidence.activation.authorized, false);
});

test('suite, intake, model, and observation drift are rejected', () => {
  const context = buildContext();
  const driftedSuite = structuredClone(context.suite);
  driftedSuite.cases[0].queryHash = '0'.repeat(64);
  assert.throws(
    () => buildEvidence({ ...context, suite: driftedSuite }),
    /bind the Q4 baseline, Q5 intake/,
  );

  const driftedModel = { ...baseline.model, digest: '0'.repeat(64) };
  assert.throws(
    () => buildEvidence({ ...context, model: driftedModel }),
    /bind the Q4 baseline, Q5 intake/,
  );

  const driftedObservations = structuredClone(context.observations);
  driftedObservations[0].citedSourceKeys = ['unexpected-source'];
  assert.throws(
    () => buildEvidence({ ...context, observations: driftedObservations }),
    /bind the Q4 baseline, Q5 intake/,
  );
});

test('dataset and intake loaders reject symlink inputs', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'user-query-symlink-'));
  try {
    const linkedDatasetPath = path.join(directory, 'dataset.json');
    fs.symlinkSync(fixturePath, linkedDatasetPath);
    assert.throws(
      () => loadLocalUserQueryEvaluationSuite({
        datasetPath: linkedDatasetPath,
        intakePath,
      }),
      /bounded regular file/,
    );
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

test('local model input is authorized immediately before every case', async () => {
  const { caseInputs, intake } = loadLocalUserQueryEvaluationSuite({
    datasetPath: fixturePath,
    intakePath,
  });
  assertLocalUserQueryEvaluationAuthorization({
    intake,
    observedAt: '2026-07-17T07:00:00.000Z',
  });
  const expiredDataset = readJson(fixturePath);
  expiredDataset.usage.retentionUntil = '2026-07-17T06:30:00.000Z';
  const expired = buildUserQueryEvaluationIntake({
    dataset: expiredDataset,
    observedAt: '2026-07-17T06:00:00.000Z',
  });
  assert.throws(
    () => assertLocalUserQueryEvaluationAuthorization({
      intake: expired,
      observedAt: '2026-07-17T07:00:00.000Z',
    }),
    /authorization is not current/,
  );

  let generationCount = 0;
  await assert.rejects(
    () => evaluateLocalUserQuerySuite({
      authorizeCase: () => {
        throw new Error('authorization revoked');
      },
      caseInputs,
      generator: {
        async generate() {
          generationCount += 1;
        },
      },
    }),
    /authorization revoked/,
  );
  assert.equal(generationCount, 0);
});

test('consented deidentified records can validate local quality without authorizing rollout', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'user-query-quality-'));
  try {
    const dataset = readJson(fixturePath);
    dataset.actualUserQueryData = true;
    dataset.dataClassification = 'deidentified-user-query';
    dataset.consent = {
      expiresAt: '2026-08-17T00:00:00.000Z',
      purpose: 'answer-quality-evaluation',
      recordHash: 'b'.repeat(64),
      recordedAt: '2026-07-16T00:00:00.000Z',
      status: 'granted',
      withdrawalSupported: true,
    };
    for (const record of dataset.records) {
      record.source = 'consented-user-query';
    }
    const intake = buildUserQueryEvaluationIntake({
      dataset,
      observedAt: '2026-07-17T06:00:00.000Z',
    });
    const datasetPath = path.join(directory, 'dataset.json');
    const actualIntakePath = path.join(directory, 'intake.json');
    fs.writeFileSync(datasetPath, JSON.stringify(dataset), 'utf8');
    fs.writeFileSync(actualIntakePath, JSON.stringify(intake), 'utf8');

    const context = buildContext({ datasetPath, intakePath: actualIntakePath });
    const evidence = buildEvidence(context);

    assert.equal(evidence.actualUserQueryData, true);
    assert.equal(evidence.actualUserQueryQualityValidated, true);
    assert.equal(evidence.syntheticUserQueryQualityValidated, false);
    assert.equal(evidence.generalAnswerQualityImprovementValidated, false);
    assert.equal(evidence.rolloutAuthorized, false);
    assert.equal(evidence.status, 'actual-user-query-quality-passed-governance-blocked');
    assert.throws(
      () => buildLocalUserQueryQuality({
        baseline,
        evaluation: context.evaluation,
        intake: context.intake,
        model: baseline.model,
        observations: context.observations,
        observedAt: '2026-08-18T00:00:00.000Z',
        runtime: baseline.runtime,
        suite: context.suite,
      }),
      /bind the Q4 baseline, Q5 intake/,
    );
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});

function buildContext({
  datasetPath = fixturePath,
  failingCase = false,
  intakePath: selectedIntakePath = intakePath,
} = {}) {
  const { caseInputs, intake, suite } = loadLocalUserQueryEvaluationSuite({
    datasetPath,
    intakePath: selectedIntakePath,
  });
  const cases = caseInputs.map((item, index) => ({
    ...item.definition,
    answer: {
      citedSourceKeys: item.evidence.map((evidence) => evidence.sourceKey),
      text: failingCase && index === 0
        ? 'No supported answer terms are present.'
        : item.definition.requiredAnswerTerms.join(' '),
    },
    retrievedItems: item.evidence,
  }));
  const answerQualityEvaluation = evaluateAnswerQualitySuite({
    cases,
    thresholds: LOCAL_USER_QUERY_QUALITY_THRESHOLDS,
  });
  const observations = caseInputs.map((item) => ({
    caseIdHash: item.idHash,
    citedSourceKeys: item.evidence.map((evidence) => evidence.sourceKey),
    claimCount: item.evidence.length,
    durationMs: 10,
    failureKind: null,
    generationStatus: 'passed',
    identifierRestorationCount: 0,
    inputHash: sha256(`input:${item.idHash}`),
    maxOutputTokens: 1024,
    outputBytes: 100,
    promptHash: baseline.prompt.candidateHash,
    promptVersion: baseline.prompt.candidateVersion,
    rawInputHash: sha256(`raw:${item.idHash}`),
    responseHash: sha256(`response:${item.idHash}`),
    reviewActionPresent: true,
    reviewActionSpecific: true,
    sanitization: {
      applied: false,
      evidenceInstructionRemovalCount: 0,
      instructionRemovalCount: 0,
      normalizationApplied: false,
      normalizationKinds: [],
      objectiveInstructionRemovalCount: 0,
    },
    sourceCoverageComplete: true,
  }));
  return {
    answerQualityEvaluation,
    evaluation: summarizeLocalUserQueryEvaluation({
      evaluation: answerQualityEvaluation,
      suite,
    }),
    intake,
    observations,
    suite,
  };
}

function buildEvidence(context) {
  return buildLocalUserQueryQuality({
    baseline,
    evaluation: context.evaluation,
    intake: context.intake,
    model: context.model || baseline.model,
    observations: context.observations,
    observedAt: '2026-07-17T07:00:00.000Z',
    runtime: baseline.runtime,
    suite: context.suite,
  });
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
