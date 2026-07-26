import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildRetrievalQualityBaselineSnapshot,
  compareRetrievalQualityEvaluations,
  evaluateRetrievalQualityCase,
  evaluateRetrievalQualitySuite,
  formatRetrievalQualityEvaluationReport,
  RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION,
} from '../src/core/retrieval-quality-evaluation.mjs';

const expectedSources = [
  { key: 'memory:fact-1', type: 'memory' },
  { key: 'attachment:file-1', type: 'attachment' },
];
const irrelevantSources = [
  { key: 'memory:preference-1', type: 'memory' },
  { key: 'attachment:file-2', type: 'attachment' },
];

function buildPassingCase(id = 'passing-case') {
  return {
    id,
    k: 4,
    expectedSources,
    irrelevantSources,
    retrievedItems: [
      { sourceKey: 'memory:fact-1', sourceType: 'memory' },
      { sourceKey: 'attachment:file-1', sourceType: 'attachment' },
    ],
  };
}

test('retrieval quality case measures recall, precision, noise, and source diversity', () => {
  const result = evaluateRetrievalQualityCase(buildPassingCase());

  assert.equal(result.status, 'passed');
  assert.deepEqual(result.metrics, {
    noiseRateAtK: 0,
    precisionAtK: 1,
    recallAtK: 1,
    sourceDiversityRate: 1,
    unlabeledRetrievedSourceCount: 0,
  });
  assert.deepEqual(result.evidence.selectedSourceKeys, [
    'memory:fact-1',
    'attachment:file-1',
  ]);
});

test('top-k is applied before source deduplication so repeated chunks consume rank capacity', () => {
  const result = evaluateRetrievalQualityCase({
    ...buildPassingCase(),
    k: 2,
    retrievedItems: [
      { sourceKey: 'memory:fact-1', sourceType: 'memory' },
      { sourceKey: 'memory:fact-1', sourceType: 'memory' },
      { sourceKey: 'attachment:file-1', sourceType: 'attachment' },
    ],
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.metrics.recallAtK, 0.5);
  assert.equal(result.metrics.sourceDiversityRate, 0.5);
});

test('irrelevant and unlabeled selections remain separate failure evidence', () => {
  const result = evaluateRetrievalQualityCase({
    ...buildPassingCase(),
    retrievedItems: [
      { sourceKey: 'memory:fact-1', sourceType: 'memory' },
      { sourceKey: 'memory:preference-1', sourceType: 'memory' },
      { sourceKey: 'attachment:unknown', sourceType: 'attachment' },
    ],
  });

  assert.equal(result.status, 'failed');
  assert.equal(result.metrics.precisionAtK, 0.3333);
  assert.equal(result.metrics.noiseRateAtK, 0.3333);
  assert.equal(result.metrics.unlabeledRetrievedSourceCount, 1);
  assert.deepEqual(result.evidence.retrievedIrrelevantSourceKeys, ['memory:preference-1']);
  assert.deepEqual(result.evidence.unlabeledRetrievedSourceKeys, ['attachment:unknown']);
});

test('explicit thresholds can allow a measured non-perfect case without hiding its metrics', () => {
  const result = evaluateRetrievalQualityCase(
    {
      ...buildPassingCase(),
      retrievedItems: [{ sourceKey: 'memory:fact-1', sourceType: 'memory' }],
    },
    {
      thresholds: {
        minimumRecallAtK: 0.5,
        minimumSourceDiversityRate: 0.5,
      },
    },
  );

  assert.equal(result.status, 'passed');
  assert.equal(result.metrics.recallAtK, 0.5);
  assert.equal(result.metrics.sourceDiversityRate, 0.5);
});

test('suite uses macro averages and keeps the non-production claim explicit', () => {
  const evaluation = evaluateRetrievalQualitySuite({
    algorithmId: 'baseline-v1',
    cases: [buildPassingCase('case-a'), buildPassingCase('case-b')],
  });

  assert.equal(evaluation.status, 'passed');
  assert.equal(evaluation.schemaVersion, RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION);
  assert.equal(evaluation.productionReadyClaim, false);
  assert.deepEqual(evaluation.metrics, {
    casePassRate: 1,
    noiseRateAtK: 0,
    precisionAtK: 1,
    recallAtK: 1,
    sourceDiversityRate: 1,
    unlabeledRetrievedSourceCount: 0,
  });
});

test('suite rejects duplicate ids and missing algorithm identity', () => {
  assert.throws(
    () => evaluateRetrievalQualitySuite({ cases: [buildPassingCase()] }),
    /algorithm id is required/,
  );
  assert.throws(
    () =>
      evaluateRetrievalQualitySuite({
        algorithmId: 'baseline-v1',
        cases: [buildPassingCase(), buildPassingCase()],
      }),
    /case ids must be unique/,
  );
});

test('case validation rejects ambiguous or incomplete relevance labels', () => {
  assert.throws(
    () => evaluateRetrievalQualityCase({ ...buildPassingCase(), expectedSources: [] }),
    /At least one expected source/,
  );
  assert.throws(
    () =>
      evaluateRetrievalQualityCase({
        ...buildPassingCase(),
        irrelevantSources: [{ key: 'memory:fact-1', type: 'memory' }],
      }),
    /sources overlap/,
  );
  assert.throws(
    () =>
      evaluateRetrievalQualityCase({
        ...buildPassingCase(),
        expectedSources: [{ key: 'memory:fact-1', type: 'attachment' }],
      }),
    /type must match its key prefix/,
  );
  assert.throws(
    () =>
      evaluateRetrievalQualityCase({
        ...buildPassingCase(),
        retrievedItems: [{ sourceType: 'memory' }],
      }),
    /requires a source key/,
  );
});

test('threshold validation rejects out-of-range rates and invalid k', () => {
  assert.throws(
    () => evaluateRetrievalQualityCase(buildPassingCase(), { thresholds: { minimumRecallAtK: 2 } }),
    /between 0 and 1/,
  );
  assert.throws(
    () => evaluateRetrievalQualityCase({ ...buildPassingCase(), k: 0 }),
    /positive integer/,
  );
});

test('baseline snapshot preserves metrics and selected source order', () => {
  const evaluation = evaluateRetrievalQualitySuite({
    algorithmId: 'baseline-v1',
    cases: [buildPassingCase()],
  });
  const snapshot = buildRetrievalQualityBaselineSnapshot(evaluation);

  assert.equal(snapshot.algorithmId, 'baseline-v1');
  assert.deepEqual(snapshot.metrics, evaluation.metrics);
  assert.deepEqual(snapshot.cases[0].selectedSourceKeys, [
    'memory:fact-1',
    'attachment:file-1',
  ]);
});

test('comparison passes a candidate that preserves every case and suite metric', () => {
  const baseline = evaluateRetrievalQualitySuite({
    algorithmId: 'baseline-v1',
    cases: [buildPassingCase()],
  });
  const candidate = evaluateRetrievalQualitySuite({
    algorithmId: 'candidate-v1',
    cases: [buildPassingCase()],
  });

  assert.deepEqual(compareRetrievalQualityEvaluations({ baseline, candidate }), {
    baselineAlgorithmId: 'baseline-v1',
    candidateAlgorithmId: 'candidate-v1',
    failures: [],
    status: 'passed',
  });
});

test('comparison rejects a per-case regression even when candidate thresholds are permissive', () => {
  const baseline = evaluateRetrievalQualitySuite({
    algorithmId: 'baseline-v1',
    cases: [buildPassingCase()],
  });
  const candidate = evaluateRetrievalQualitySuite({
    algorithmId: 'candidate-v1',
    cases: [
      {
        ...buildPassingCase(),
        retrievedItems: [{ sourceKey: 'memory:fact-1', sourceType: 'memory' }],
      },
    ],
    thresholds: {
      minimumRecallAtK: 0.5,
      minimumSourceDiversityRate: 0.5,
    },
  });
  const comparison = compareRetrievalQualityEvaluations({ baseline, candidate });

  assert.equal(candidate.status, 'passed');
  assert.equal(comparison.status, 'failed');
  assert.equal(
    comparison.failures.some(
      (failure) => failure.caseId === 'passing-case' && failure.check === 'regression:recallAtK',
    ),
    true,
  );
});

test('comparison rejects different case sets and a failed candidate gate', () => {
  const baseline = evaluateRetrievalQualitySuite({
    algorithmId: 'baseline-v1',
    cases: [buildPassingCase('case-a')],
  });
  const candidate = evaluateRetrievalQualitySuite({
    algorithmId: 'candidate-v1',
    cases: [
      {
        ...buildPassingCase('case-b'),
        retrievedItems: [{ sourceKey: 'memory:preference-1', sourceType: 'memory' }],
      },
    ],
  });
  const comparison = compareRetrievalQualityEvaluations({ baseline, candidate });

  assert.equal(comparison.status, 'failed');
  assert.equal(comparison.failures.some((failure) => failure.check === 'case-set'), true);
  assert.equal(comparison.failures.some((failure) => failure.check === 'candidate-gate'), true);
});

test('comparison requires both evaluated inputs', () => {
  assert.throws(() => compareRetrievalQualityEvaluations({}), /evaluations are required/);
  assert.throws(
    () => compareRetrievalQualityEvaluations({ baseline: { cases: [] }, candidate: { cases: [] } }),
    /schema versions must match/,
  );
});

test('report renders suite metrics, cases, and claim boundary', () => {
  const evaluation = evaluateRetrievalQualitySuite({
    algorithmId: 'baseline-v1',
    cases: [buildPassingCase()],
  });
  const report = formatRetrievalQualityEvaluationReport(evaluation);

  assert.match(report, /# Retrieval Quality Evaluation/);
  assert.match(report, /algorithmId: baseline-v1/);
  assert.match(report, /precision@k/);
  assert.match(report, /recall@k/);
  assert.match(report, /source diversity/);
  assert.match(report, /productionReadyClaim: false/);
});
