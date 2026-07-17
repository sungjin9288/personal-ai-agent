import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertLocalAnswerCompositionHardening,
  buildLocalAnswerCompositionHardening,
} from '../src/core/local-answer-composition-hardening.mjs';
import { summarizeAnswerCompositionRobustnessEvaluation } from '../src/core/local-answer-composition-robustness.mjs';
import { createHardenedEvidenceFirstOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';
import { loadLocalAnswerCompositionRobustnessSuite } from '../scripts/local-answer-composition-robustness-suite.mjs';

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function buildInput({ injectCanary = false } = {}) {
  const baseline = JSON.parse(
    fs.readFileSync(
      'evidence/output-artifacts/local-answer-composition-robustness.json',
      'utf8',
    ),
  );
  const { caseInputs, suite } = loadLocalAnswerCompositionRobustnessSuite();
  const generator = createHardenedEvidenceFirstOllamaAnswerGenerator({
    endpoint: 'http://127.0.0.1:1',
    model: baseline.model.id,
  });
  const cases = caseInputs.map(({ definition, retrievedItems }) => {
    const answerTerms = [...definition.requiredAnswerTerms];
    if (injectCanary && definition.id === 'prompt-injection-objective') {
      answerTerms.push(definition.forbiddenAnswerTerms[0]);
    }
    return {
      ...definition,
      answer: {
        citedSourceKeys: definition.expectedSourceKeys,
        text: answerTerms.join(' '),
      },
      retrievedItems,
    };
  });
  return {
    baseline,
    evaluation: summarizeAnswerCompositionRobustnessEvaluation(
      evaluateAnswerQualitySuite({
        cases,
        thresholds: suite.thresholds,
      }),
    ),
    model: baseline.model,
    observations: caseInputs.map(({ definition, retrievedItems }) => {
      const evidenceInstructionRemovalCount =
        definition.id === 'prompt-injection-evidence' ? 1 : 0;
      const objectiveInstructionRemovalCount =
        definition.id === 'prompt-injection-objective' ? 1 : 0;
      const instructionRemovalCount =
        evidenceInstructionRemovalCount + objectiveInstructionRemovalCount;
      return {
        caseId: definition.id,
        citedSourceKeys: definition.expectedSourceKeys,
        claimCount: retrievedItems.length,
        durationMs: 10,
        inputHash: sha256(`input:${definition.id}`),
        maxOutputTokens: 1_024,
        outputBytes: 100,
        promptHash: generator.promptHash,
        promptVersion: generator.promptVersion,
        rawInputHash: sha256(`raw-input:${definition.id}`),
        responseHash: sha256(`response:${definition.id}:${injectCanary}`),
        reviewActionPresent: true,
        reviewActionSpecific: true,
        sanitization: {
          applied: instructionRemovalCount > 0,
          evidenceInstructionRemovalCount,
          instructionRemovalCount,
          objectiveInstructionRemovalCount,
        },
        sourceCoverageComplete: true,
      };
    }),
    observedAt: '2026-07-17T13:00:00.000Z',
    runtime: baseline.runtime,
    suite,
  };
}

test('Q4 hardening improves the failed robustness baseline without activation', () => {
  const evidence = buildLocalAnswerCompositionHardening(buildInput());

  assert.doesNotThrow(() => assertLocalAnswerCompositionHardening(evidence));
  assert.equal(evidence.status, 'hardening-passed-governance-blocked');
  assert.equal(evidence.decision, 'hold-for-governance');
  assert.equal(evidence.candidateHardeningValidated, true);
  assert.equal(evidence.promptInjectionRobustnessValidated, true);
  assert.equal(evidence.q3RegressionQualityValidated, true);
  assert.equal(evidence.comparison.regressions.length, 0);
  assert.equal(evidence.comparison.status, 'improved');
  assert.equal(evidence.currentAnswerPathChanged, false);
  assert.equal(evidence.actualModelTrainingExecuted, false);
  assert.equal(evidence.activation.authorized, false);
  assert.equal(evidence.productionReadyClaim, false);
});

test('Q4 hardening keeps the current path when the canary remains', () => {
  const evidence = buildLocalAnswerCompositionHardening(
    buildInput({ injectCanary: true }),
  );

  assert.equal(evidence.status, 'hardening-failed-keep-current');
  assert.equal(evidence.decision, 'keep-current-answer-path');
  assert.equal(evidence.candidateHardeningValidated, false);
  assert.equal(evidence.promptInjectionRobustnessValidated, false);
  assert.equal(evidence.currentAnswerPathChanged, false);
});

test('Q4 hardening rejects prompt drift and tampering', () => {
  const promptDrift = buildInput();
  promptDrift.observations[0].promptHash = promptDrift.baseline.prompt.candidateHash;
  assert.throws(
    () => buildLocalAnswerCompositionHardening(promptDrift),
    /bind the failed baseline, model, prompt, runtime, and cases/,
  );

  const evidence = buildLocalAnswerCompositionHardening(buildInput());
  const tampered = structuredClone(evidence);
  tampered.observations[0].responseHash = '0'.repeat(64);
  assert.throws(() => assertLocalAnswerCompositionHardening(tampered), /integrity/);
});
