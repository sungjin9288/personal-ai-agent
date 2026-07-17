import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  assertLocalAnswerCompositionRobustness,
  buildLocalAnswerCompositionRobustness,
  summarizeAnswerCompositionRobustnessEvaluation,
} from '../src/core/local-answer-composition-robustness.mjs';
import { createRobustEvidenceFirstOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function buildFixtureInput({ injectCanary = false } = {}) {
  const fixtureText = fs.readFileSync(
    'fixtures/answer-composition-robustness-cases-v1.json',
    'utf8',
  );
  const fixture = JSON.parse(fixtureText);
  const q3FixtureText = fs.readFileSync('fixtures/answer-quality-cases-v1.json', 'utf8');
  const q3Fixture = JSON.parse(q3FixtureText);
  const baseline = JSON.parse(
    fs.readFileSync(
      'evidence/output-artifacts/local-answer-composition-candidate.json',
      'utf8',
    ),
  );
  const generator = createRobustEvidenceFirstOllamaAnswerGenerator({
    endpoint: 'http://127.0.0.1:1',
    model: baseline.baseline.model.id,
  });
  const caseInputs = [
    ...q3Fixture.cases.map((definition) => ({
      definition: {
        ...definition,
        language: 'en',
        promptInjectionCase: false,
        scenarioId: 'q3-regression',
      },
      retrievedItems: buildRetrievalContext(definition.retrievalInput),
    })),
    ...fixture.cases.map((definition) => ({
      definition,
      retrievedItems: definition.evidence,
    })),
  ];
  const candidateCases = caseInputs.map(({ definition, retrievedItems }) => {
    const answerTerms = [...definition.requiredAnswerTerms];
    if (injectCanary && definition.id === 'prompt-injection-evidence') {
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
  const evaluation = summarizeAnswerCompositionRobustnessEvaluation(
    evaluateAnswerQualitySuite({
      cases: candidateCases,
      thresholds: fixture.thresholds,
    }),
  );
  return {
    baseline,
    evaluation,
    model: {
      digest: baseline.baseline.model.digest,
      id: baseline.baseline.model.id,
      sizeBytes: baseline.baseline.model.sizeBytes,
    },
    observations: caseInputs.map(({ definition, retrievedItems }) => ({
      caseId: definition.id,
      citedSourceKeys: definition.expectedSourceKeys,
      claimCount: retrievedItems.length,
      durationMs: 10,
      inputHash: sha256(`input:${definition.id}`),
      maxOutputTokens: 1_024,
      outputBytes: 100,
      promptHash: generator.promptHash,
      promptVersion: generator.promptVersion,
      responseHash: sha256(`response:${definition.id}:${injectCanary}`),
      reviewActionPresent: true,
      sourceCoverageComplete: true,
    })),
    observedAt: '2026-07-17T12:00:00.000Z',
    runtime: {
      cloudFeaturesDisabled: true,
      endpointAlias: 'loopback-ollama',
      kind: 'ollama',
      transportLoopback: true,
      version: baseline.runtime.version,
    },
    suite: {
      cases: caseInputs.map(({ definition, retrievedItems }) => ({
        evidenceItemCount: retrievedItems.length,
        id: definition.id,
        language: definition.language,
        promptInjectionCase: definition.promptInjectionCase === true,
        scenarioId: definition.scenarioId,
      })),
      fixtureHash: sha256(JSON.stringify({
        q3FixtureHash: sha256(q3FixtureText),
        robustnessFixtureHash: sha256(fixtureText),
      })),
      fixtureRefs: [
        {
          id: q3Fixture.schemaVersion,
          sha256: sha256(q3FixtureText),
        },
        {
          id: fixture.schemaVersion,
          sha256: sha256(fixtureText),
        },
      ],
      id: 'personal-ai-agent-answer-composition-robustness-suite/v1',
      thresholds: fixture.thresholds,
    },
  };
}

test('Q4 robustness evidence validates all scenarios without activation authority', () => {
  const evidence = buildLocalAnswerCompositionRobustness(buildFixtureInput());

  assert.doesNotThrow(() => assertLocalAnswerCompositionRobustness(evidence));
  assert.equal(evidence.status, 'robustness-passed-governance-blocked');
  assert.equal(evidence.decision, 'hold-for-governance');
  assert.equal(evidence.candidateRobustnessValidated, true);
  assert.equal(evidence.koreanQualityValidated, true);
  assert.equal(evidence.multiDomainQualityValidated, true);
  assert.equal(evidence.boundedLongContextValidated, true);
  assert.equal(evidence.promptInjectionRobustnessValidated, true);
  assert.equal(evidence.q3RegressionQualityValidated, true);
  assert.equal(evidence.generalAnswerQualityImprovementValidated, false);
  assert.equal(evidence.currentAnswerPathChanged, false);
  assert.equal(evidence.actualModelTrainingExecuted, false);
  assert.equal(evidence.activation.authorized, false);
  assert.equal(evidence.productionReadyClaim, false);
  assert.equal(JSON.stringify(evidence).includes('INJECTION_CANARY_73'), false);
});

test('Q4 robustness evidence keeps the current path when an injection canary is emitted', () => {
  const evidence = buildLocalAnswerCompositionRobustness(
    buildFixtureInput({ injectCanary: true }),
  );

  assert.equal(evidence.status, 'robustness-failed-keep-current');
  assert.equal(evidence.decision, 'keep-current-answer-path');
  assert.equal(evidence.candidateRobustnessValidated, false);
  assert.equal(evidence.promptInjectionRobustnessValidated, false);
  assert.equal(evidence.currentAnswerPathChanged, false);
  assert.equal(evidence.activation.authorized, false);
});

test('Q4 robustness evidence rejects model drift and tampering', () => {
  const modelDrift = buildFixtureInput();
  modelDrift.model.digest = '0'.repeat(64);
  assert.throws(
    () => buildLocalAnswerCompositionRobustness(modelDrift),
    /bind the Q3 baseline, prompt, runtime, suite, and observations/,
  );

  const evidence = buildLocalAnswerCompositionRobustness(buildFixtureInput());
  const tampered = structuredClone(evidence);
  tampered.observations[0].responseHash = '0'.repeat(64);
  assert.throws(() => assertLocalAnswerCompositionRobustness(tampered), /integrity/);
});
