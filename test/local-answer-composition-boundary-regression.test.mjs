import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalAnswerCompositionBoundaryRegression,
  buildLocalAnswerCompositionBoundaryRegression,
} from '../src/core/local-answer-composition-boundary-regression.mjs';
import { createAdversarialHardenedOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function buildInput({ regress = false } = {}) {
  const baseline = JSON.parse(fs.readFileSync(
    'evidence/output-artifacts/local-answer-composition-hardening.json',
    'utf8',
  ));
  const boundaryEvaluation = JSON.parse(fs.readFileSync(
    'evidence/output-artifacts/answer-input-boundary-evaluation.json',
    'utf8',
  ));
  const evaluation = structuredClone(baseline.evaluation);
  if (regress) {
    evaluation.status = 'failed';
    evaluation.metrics.casePassRate = 0.9;
    evaluation.caseResults[0].status = 'failed';
    evaluation.caseResults[0].failureCheckIds = ['required-term-coverage'];
  }
  evaluation.evaluationHash = sha256(JSON.stringify(evaluation));
  const generator = createAdversarialHardenedOllamaAnswerGenerator({
    endpoint: 'http://127.0.0.1:1',
    model: baseline.model.id,
  });
  return {
    baseline,
    boundaryEvaluation,
    evaluation,
    model: baseline.model,
    observations: baseline.suite.cases.map((definition) => {
      const evidenceInstructionRemovalCount =
        definition.id === 'prompt-injection-evidence' ? 1 : 0;
      const objectiveInstructionRemovalCount =
        definition.id === 'prompt-injection-objective' ? 1 : 0;
      const instructionRemovalCount =
        evidenceInstructionRemovalCount + objectiveInstructionRemovalCount;
      return {
        caseId: definition.id,
        citedSourceKeys: Array.from(
          { length: definition.evidenceItemCount },
          (_, index) => `source:${definition.id}:${index}`,
        ),
        claimCount: definition.evidenceItemCount,
        durationMs: 10,
        identifierRestorationCount: 0,
        inputHash: sha256(`input:${definition.id}`),
        maxOutputTokens: 1_024,
        outputBytes: 100,
        promptHash: generator.promptHash,
        promptVersion: generator.promptVersion,
        rawInputHash: sha256(`raw:${definition.id}`),
        responseHash: sha256(`response:${definition.id}:${regress}`),
        reviewActionPresent: true,
        reviewActionSpecific: true,
        sanitization: {
          applied: instructionRemovalCount > 0,
          evidenceInstructionRemovalCount,
          instructionRemovalCount,
          normalizationApplied: false,
          normalizationKinds: [],
          objectiveInstructionRemovalCount,
        },
        sourceCoverageComplete: true,
      };
    }),
    observedAt: '2026-07-17T05:00:00.000Z',
    runtime: baseline.runtime,
    suite: baseline.suite,
  };
}

test('Q5 boundary regression preserves Q4 quality without activation', () => {
  const evidence = buildLocalAnswerCompositionBoundaryRegression(buildInput());

  assert.doesNotThrow(() => assertLocalAnswerCompositionBoundaryRegression(evidence));
  assert.equal(evidence.status, 'boundary-regression-passed-governance-blocked');
  assert.equal(evidence.candidateBoundaryRegressionValidated, true);
  assert.equal(evidence.adversarialBoundaryValidated, true);
  assert.equal(evidence.actualUserQueryData, false);
  assert.equal(evidence.broadPromptInjectionResistanceValidated, false);
  assert.equal(evidence.currentAnswerPathChanged, false);
  assert.equal(evidence.activation.authorized, false);
});

test('Q5 boundary regression keeps the current path on model quality regression', () => {
  const evidence = buildLocalAnswerCompositionBoundaryRegression(
    buildInput({ regress: true }),
  );

  assert.equal(evidence.status, 'boundary-regression-failed-keep-current');
  assert.equal(evidence.decision, 'keep-current-answer-path');
  assert.equal(evidence.candidateBoundaryRegressionValidated, false);
  assert.equal(evidence.currentAnswerPathChanged, false);
});

test('Q5 boundary regression rejects prompt drift and tampering', () => {
  const promptDrift = buildInput();
  promptDrift.observations[0].promptHash = promptDrift.baseline.prompt.candidateHash;
  assert.throws(
    () => buildLocalAnswerCompositionBoundaryRegression(promptDrift),
    /must bind the Q4 baseline/,
  );

  const evidence = buildLocalAnswerCompositionBoundaryRegression(buildInput());
  evidence.observations[0].responseHash = '0'.repeat(64);
  assert.throws(
    () => assertLocalAnswerCompositionBoundaryRegression(evidence),
    /integrity validation/,
  );
});
