import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertLocalAnswerReviewActionGeneralization,
  buildLocalAnswerReviewActionGeneralization,
} from '../src/core/local-answer-review-action-generalization.mjs';
import { summarizeLocalUserQueryEvaluation } from '../src/core/local-user-query-quality.mjs';
import {
  createReviewActionGeneralizedOllamaAnswerGenerator,
  REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION,
} from '../src/core/ollama-answer-generator.mjs';
import {
  loadLocalAnswerCompositionRobustnessSuite,
} from '../scripts/local-answer-composition-robustness-suite.mjs';
import {
  loadLocalUserQueryEvaluationSuite,
  LOCAL_USER_QUERY_QUALITY_THRESHOLDS,
} from '../scripts/local-user-query-evaluation-suite.mjs';

const q4Baseline = readJson(
  'evidence/output-artifacts/local-answer-composition-boundary-regression.json',
);
const q6Baseline = readJson(
  'evidence/output-artifacts/local-user-query-quality.json',
);
const fixture = readJson(
  'fixtures/user-query-evaluation-intake-dry-run-v1.json',
);
const { suite: q4Suite } = loadLocalAnswerCompositionRobustnessSuite();
const q6Context = buildQ6Context();
const generator = createReviewActionGeneralizedOllamaAnswerGenerator({
  endpoint: 'http://127.0.0.1:11434',
  model: q4Baseline.model.id,
});

test('review action generalization preserves Q4 and passes the synthetic Q6 suite', () => {
  const evidence = buildEvidence();

  assertLocalAnswerReviewActionGeneralization(evidence);
  assert.equal(evidence.reviewActionGeneralizationValidated, true);
  assert.equal(evidence.candidate.q4.caseCount, 10);
  assert.equal(evidence.candidate.q6.caseCount, 12);
  assert.equal(evidence.candidate.q4.evaluation.metrics.casePassRate, 1);
  assert.equal(evidence.candidate.q6.evaluation.metrics.casePassRate, 1);
  assert.equal(evidence.syntheticUserQueryQualityValidated, true);
  assert.equal(evidence.actualUserQueryQualityValidated, false);
  assert.equal(evidence.currentAnswerPathChanged, false);
  assert.equal(evidence.activation.authorized, false);
  assert.equal(evidence.rolloutAuthorized, false);
  assert.equal(evidence.productionReadyClaim, false);

  const serialized = JSON.stringify(evidence);
  for (const record of fixture.records) {
    assert.equal(serialized.includes(record.query), false);
    for (const text of [...record.evidence, ...record.expectedAnswerTerms]) {
      assert.equal(serialized.includes(text), false);
    }
  }
});

test('Q6 quality regression remains a failed candidate with the current path unchanged', () => {
  const failedContext = buildQ6Context({ failingCase: true });
  const evidence = buildEvidence({ q6Context: failedContext });

  assertLocalAnswerReviewActionGeneralization(evidence);
  assert.equal(evidence.reviewActionGeneralizationValidated, false);
  assert.equal(evidence.decision, 'keep-current-answer-path');
  assert.equal(evidence.status, 'review-action-generalization-failed-keep-current');
  assert.equal(evidence.currentAnswerPathChanged, false);
});

test('baseline, suite, model, and prompt drift are rejected', () => {
  assert.throws(
    () => buildEvidence({
      model: { ...q4Baseline.model, digest: '0'.repeat(64) },
    }),
    /bind the Q4 and Q6 baselines/,
  );

  const driftedSuite = structuredClone(q4Suite);
  driftedSuite.cases[0].evidenceItemCount += 1;
  assert.throws(
    () => buildEvidence({ q4Suite: driftedSuite }),
    /bind the Q4 and Q6 baselines/,
  );

  const observations = buildQ4Observations();
  observations[0].promptHash = q4Baseline.prompt.candidateHash;
  assert.throws(
    () => buildEvidence({ q4Observations: observations }),
    /bind the Q4 and Q6 baselines/,
  );
});

test('integrity validation rejects changed observation evidence', () => {
  const evidence = buildEvidence();
  const tampered = structuredClone(evidence);
  tampered.candidate.q6.observations[0].responseHash = '0'.repeat(64);

  assert.throws(
    () => assertLocalAnswerReviewActionGeneralization(tampered),
    /integrity/,
  );
});

function buildEvidence({
  model = q4Baseline.model,
  q4Observations = buildQ4Observations(),
  q4Suite: selectedQ4Suite = q4Suite,
  q6Context: selectedQ6Context = q6Context,
} = {}) {
  return buildLocalAnswerReviewActionGeneralization({
    model,
    observedAt: '2026-07-17T08:00:00.000Z',
    q4Baseline,
    q4Evaluation: {
      ...q4Baseline.evaluation,
      evaluationHash: sha256('q7-q4-evaluation'),
    },
    q4Observations,
    q4Suite: selectedQ4Suite,
    q6Baseline,
    q6Evaluation: selectedQ6Context.evaluation,
    q6Observations: buildQ6Observations(selectedQ6Context),
    q6Suite: selectedQ6Context.suite,
    runtime: q4Baseline.runtime,
  });
}

function buildQ4Observations() {
  return q4Baseline.observations.map((item) => ({
    ...item,
    promptHash: generator.promptHash,
    promptVersion: REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION,
    responseHash: sha256(`q7-q4:${item.caseId}`),
  }));
}

function buildQ6Context({ failingCase = false } = {}) {
  const { caseInputs, suite } = loadLocalUserQueryEvaluationSuite({
    datasetPath: path.resolve(
      'fixtures/user-query-evaluation-intake-dry-run-v1.json',
    ),
    intakePath: path.resolve(
      'evidence/output-artifacts/user-query-evaluation-intake.json',
    ),
  });
  const cases = caseInputs.map((item, index) => ({
    ...item.definition,
    answer: {
      citedSourceKeys: item.evidence.map((evidence) => evidence.sourceKey),
      text: failingCase && index === 0
        ? 'No supported contract terms.'
        : item.definition.requiredAnswerTerms.join(' '),
    },
    retrievedItems: item.evidence,
  }));
  const answerQualityEvaluation = evaluateAnswerQualitySuite({
    cases,
    thresholds: LOCAL_USER_QUERY_QUALITY_THRESHOLDS,
  });
  return {
    caseInputs,
    evaluation: summarizeLocalUserQueryEvaluation({
      evaluation: answerQualityEvaluation,
      suite,
    }),
    suite,
  };
}

function buildQ6Observations(context) {
  return context.caseInputs.map((item) => ({
    caseIdHash: item.idHash,
    citedSourceKeys: item.evidence.map((evidence) => evidence.sourceKey),
    claimCount: item.evidence.length,
    durationMs: 10,
    failureKind: null,
    generationStatus: 'passed',
    identifierRestorationCount: 0,
    inputHash: sha256(`q7-input:${item.idHash}`),
    maxOutputTokens: 1_024,
    outputBytes: 100,
    promptHash: generator.promptHash,
    promptVersion: REVIEW_ACTION_GENERALIZED_ANSWER_PROMPT_VERSION,
    rawInputHash: sha256(`q7-raw:${item.idHash}`),
    responseHash: sha256(`q7-response:${item.idHash}`),
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
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
