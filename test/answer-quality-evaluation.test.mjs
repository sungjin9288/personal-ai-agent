import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION,
  evaluateAnswerQualityCase,
  evaluateAnswerQualitySuite,
  formatAnswerQualityEvaluationReport,
} from '../src/core/answer-quality-evaluation.mjs';

function buildPassingCase(overrides = {}) {
  return {
    answer: {
      citedSourceKeys: ['memory:workspace/fact', 'attachment:incident-notes.md'],
      text: 'Prompt normalization resolved provider drift and the result remains reviewable.',
    },
    expectedSourceKeys: ['memory:workspace/fact', 'attachment:incident-notes.md'],
    forbiddenAnswerTerms: ['production validated'],
    forbiddenSourceKeys: ['memory:mission/preference'],
    id: 'provider-drift-recovery',
    requiredAnswerTerms: ['prompt normalization', 'provider drift'],
    retrievedItems: [
      { sourceLabel: 'workspace/fact', sourceType: 'memory' },
      { sourceLabel: 'incident-notes.md', sourceType: 'attachment' },
    ],
    reviewerVerdict: 'pass',
    ...overrides,
  };
}

test('evaluateAnswerQualityCase passes a fully grounded answer', () => {
  const result = evaluateAnswerQualityCase(buildPassingCase());

  assert.equal(result.status, 'passed');
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.metrics, {
    citationGroundingRate: 1,
    expectedSourceCitationRate: 1,
    forbiddenRetrievedSourceCount: 0,
    forbiddenTermMatchCount: 0,
    requiredTermCoverage: 1,
    retrievalHitRate: 1,
    unsupportedCitationRate: 0,
  });
});

test('evaluateAnswerQualityCase reports missing retrieval and expected citations separately', () => {
  const result = evaluateAnswerQualityCase(
    buildPassingCase({
      answer: {
        citedSourceKeys: ['memory:workspace/fact'],
        text: 'Prompt normalization resolved provider drift.',
      },
      retrievedItems: [{ sourceLabel: 'workspace/fact', sourceType: 'memory' }],
    }),
  );

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.evidence.missingExpectedRetrievalSourceKeys, ['attachment:incident-notes.md']);
  assert.deepEqual(result.evidence.uncitedExpectedSourceKeys, ['attachment:incident-notes.md']);
  assert.deepEqual(
    result.failures.map((failure) => failure.check),
    ['retrieval-hit-rate', 'expected-source-citation-rate'],
  );
});

test('evaluateAnswerQualityCase rejects citations that are absent from retrieved context', () => {
  const definition = buildPassingCase();
  definition.answer.citedSourceKeys.push('attachment:invented.md');

  const result = evaluateAnswerQualityCase(definition);

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.evidence.unsupportedCitationKeys, ['attachment:invented.md']);
  assert.equal(result.metrics.citationGroundingRate, 0.6667);
  assert.equal(result.metrics.unsupportedCitationRate, 0.3333);
  assert.deepEqual(
    result.failures.map((failure) => failure.check),
    ['citation-grounding-rate', 'unsupported-citation-rate'],
  );
});

test('evaluateAnswerQualityCase stops when explicitly irrelevant context is retrieved', () => {
  const definition = buildPassingCase();
  definition.retrievedItems.push({ sourceLabel: 'mission/preference', sourceType: 'memory' });

  const result = evaluateAnswerQualityCase(definition);

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.evidence.matchedForbiddenRetrievedSourceKeys, ['memory:mission/preference']);
  assert.ok(result.failures.some((failure) => failure.check === 'forbidden-retrieved-source-count'));
});

test('evaluateAnswerQualityCase keeps required terms, forbidden terms, and reviewer verdict visible', () => {
  const result = evaluateAnswerQualityCase(
    buildPassingCase({
      answer: {
        citedSourceKeys: ['memory:workspace/fact', 'attachment:incident-notes.md'],
        text: 'Provider drift is production validated.',
      },
      reviewerVerdict: 'fail',
    }),
  );

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.evidence.missingRequiredTerms, ['prompt normalization']);
  assert.deepEqual(result.evidence.matchedForbiddenTerms, ['production validated']);
  assert.deepEqual(
    result.failures.map((failure) => failure.check),
    ['required-term-coverage', 'forbidden-term-matches', 'reviewer-verdict'],
  );
});

test('evaluateAnswerQualityCase accepts explicit source keys while matching answer terms case-insensitively', () => {
  const result = evaluateAnswerQualityCase(
    buildPassingCase({
      answer: {
        citedSourceKeys: ['memory:workspace/fact', 'attachment:incident-notes.md'],
        text: 'PROMPT NORMALIZATION resolved PROVIDER DRIFT.',
      },
      retrievedItems: [
        { sourceKey: 'memory:workspace/fact' },
        { sourceKey: 'attachment:incident-notes.md' },
      ],
    }),
  );

  assert.equal(result.status, 'passed');
});

test('evaluateAnswerQualityCase keeps case-sensitive source identity exact', () => {
  const definition = buildPassingCase();
  definition.answer.citedSourceKeys = ['memory:workspace/fact', 'attachment:INCIDENT-NOTES.md'];

  const result = evaluateAnswerQualityCase(definition);

  assert.equal(result.status, 'failed');
  assert.deepEqual(result.evidence.unsupportedCitationKeys, ['attachment:INCIDENT-NOTES.md']);
});

test('evaluateAnswerQualitySuite aggregates case metrics and preserves the non-production claim', () => {
  const secondCase = buildPassingCase({ id: 'second-case' });
  const result = evaluateAnswerQualitySuite({ cases: [buildPassingCase(), secondCase] });

  assert.equal(result.schemaVersion, ANSWER_QUALITY_EVALUATION_SCHEMA_VERSION);
  assert.equal(result.productionReadyClaim, false);
  assert.equal(result.status, 'passed');
  assert.equal(result.summary.caseCount, 2);
  assert.equal(result.summary.metrics.casePassRate, 1);
  assert.equal(result.summary.totals.expectedSourceCount, 4);
});

test('evaluateAnswerQualitySuite fails the gate when one case regresses', () => {
  const failingCase = buildPassingCase({
    answer: {
      citedSourceKeys: ['memory:workspace/fact'],
      text: 'Provider drift remains unresolved.',
    },
    id: 'regressed-case',
    reviewerVerdict: 'fail',
  });
  const result = evaluateAnswerQualitySuite({ cases: [buildPassingCase(), failingCase] });

  assert.equal(result.status, 'failed');
  assert.equal(result.summary.passedCaseCount, 1);
  assert.equal(result.summary.failedCaseCount, 1);
  assert.ok(result.failures.some((failure) => failure.check === 'case-pass-rate'));
  assert.ok(result.failures.some((failure) => failure.check === 'reviewer-failure-count'));
});

test('answer quality evaluation validates suite identity and thresholds', () => {
  assert.throws(() => evaluateAnswerQualitySuite(), /At least one/);
  assert.throws(
    () => evaluateAnswerQualitySuite({ cases: [buildPassingCase(), buildPassingCase()] }),
    /must be unique/,
  );
  assert.throws(
    () => evaluateAnswerQualitySuite({ cases: [buildPassingCase()], thresholds: { minimumRetrievalHitRate: 1.1 } }),
    /between 0 and 1/,
  );
});

test('formatAnswerQualityEvaluationReport renders a reviewable summary', () => {
  const evaluation = evaluateAnswerQualitySuite({ cases: [buildPassingCase()] });
  const report = formatAnswerQualityEvaluationReport(evaluation);

  assert.match(report, /^# Answer Quality Evaluation/);
  assert.match(report, /productionReadyClaim: false/);
  assert.match(report, /provider-drift-recovery \| passed/);
  assert.match(report, /unsupported citation rate: 0/);
});
