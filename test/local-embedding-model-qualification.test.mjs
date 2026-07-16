import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalEmbeddingModelQualification,
  buildLocalEmbeddingModelQualification,
} from '../src/core/local-embedding-model-qualification.mjs';
import {
  DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS,
  RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION,
} from '../src/core/retrieval-quality-evaluation.mjs';

const CASE_IDS = ['case-a', 'case-b', 'case-c'];

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildEvaluation({ algorithmId, passed }) {
  const metrics = passed
    ? {
        casePassRate: 1,
        noiseRateAtK: 0,
        precisionAtK: 1,
        recallAtK: 1,
        sourceDiversityRate: 1,
        unlabeledRetrievedSourceCount: 0,
      }
    : {
        casePassRate: 0.6667,
        noiseRateAtK: 0.3333,
        precisionAtK: 0.6667,
        recallAtK: 0.6667,
        sourceDiversityRate: 0.6667,
        unlabeledRetrievedSourceCount: 0,
      };
  return {
    algorithmId,
    cases: CASE_IDS.map((id, index) => ({
      evidence: {
        missingExpectedSourceKeys: !passed && index === 0 ? ['memory:expected'] : [],
        retrievedIrrelevantSourceKeys: !passed && index === 0 ? ['attachment:noise'] : [],
        selectedSourceKeys: [passed || index > 0 ? 'memory:expected' : 'attachment:noise'],
      },
      id,
      metrics: passed || index > 0
        ? { noiseRateAtK: 0, precisionAtK: 1, recallAtK: 1, sourceDiversityRate: 1, unlabeledRetrievedSourceCount: 0 }
        : { noiseRateAtK: 1, precisionAtK: 0, recallAtK: 0, sourceDiversityRate: 0, unlabeledRetrievedSourceCount: 0 },
      status: passed || index > 0 ? 'passed' : 'failed',
    })),
    failures: passed ? [] : [{ check: 'case-pass-rate', required: 1, actual: 0.6667 }],
    metrics,
    productionReadyClaim: false,
    schemaVersion: RETRIEVAL_QUALITY_EVALUATION_SCHEMA_VERSION,
    status: passed ? 'passed' : 'failed',
    thresholds: DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS,
  };
}

function buildCandidate({ modelId, passed, size }) {
  return {
    actualModelEvaluated: true,
    dimensions: modelId === 'model-3b' ? 2048 : 896,
    durationMs: modelId === 'model-3b' ? 4_000 : 2_000,
    license: {
      evidenceSource: 'ollama-modelfile-metadata',
      textHash: sha(`${modelId}-license`),
      title: 'Fixture License',
    },
    modelDigest: sha(modelId),
    modelFamily: 'fixture',
    modelFormat: 'gguf',
    modelId,
    modelModifiedAt: '2026-07-16T00:00:00.000Z',
    modelSizeBytes: size,
    parameterSize: modelId === 'model-3b' ? '3B' : '0.5B',
    qualityEvaluation: buildEvaluation({ algorithmId: `ollama:${modelId}`, passed }),
    quantization: 'Q4_K_M',
  };
}

function buildInput(overrides = {}) {
  return {
    candidates: [
      buildCandidate({ modelId: 'model-0.5b', passed: false, size: 400_000_000 }),
      buildCandidate({ modelId: 'model-3b', passed: true, size: 1_900_000_000 }),
    ],
    governance: {
      licenseReview: { status: 'pending' },
      networkIsolation: { egressDisabled: false, status: 'pending' },
      resourceReview: { status: 'pending' },
      rollbackOwner: null,
    },
    observedAt: '2026-07-16T00:00:00.000Z',
    runtime: {
      cloudFeaturesDisabled: false,
      endpointAlias: 'loopback-ollama',
      kind: 'ollama',
      transportLoopback: true,
      version: '0.23.0',
    },
    suite: {
      caseIds: CASE_IDS,
      fixtureHash: sha('fixture'),
      id: 'fixture-suite/v1',
      thresholds: DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS,
    },
    ...overrides,
  };
}

test('quality-passing actual model stays blocked behind governance', () => {
  const qualification = buildLocalEmbeddingModelQualification(buildInput());

  assert.equal(qualification.status, 'governance-blocked');
  assert.equal(qualification.decision, 'hold-for-governance');
  assert.equal(qualification.selection.modelId, 'model-3b');
  assert.equal(qualification.actualLocalEmbeddingModelQualityValidated, true);
  assert.equal(qualification.actualLocalEmbeddingModelQualified, false);
  assert.equal(qualification.activation.authorized, false);
  assert.equal(qualification.rollback.mode, 'lexical');
  assert.doesNotThrow(() => assertLocalEmbeddingModelQualification(qualification));
});

test('qualification can become ready for operator review without authorizing activation', () => {
  const qualification = buildLocalEmbeddingModelQualification(buildInput({
    governance: {
      licenseReview: {
        reviewedAt: '2026-07-16T01:00:00.000Z',
        reviewedBy: 'license-owner',
        status: 'approved',
      },
      networkIsolation: {
        egressDisabled: true,
        reviewedAt: '2026-07-16T01:00:00.000Z',
        reviewedBy: 'security-owner',
        status: 'approved',
      },
      resourceReview: {
        reviewedAt: '2026-07-16T01:00:00.000Z',
        reviewedBy: 'runtime-owner',
        status: 'approved',
      },
      rollbackOwner: 'runtime-owner',
    },
    runtime: {
      cloudFeaturesDisabled: true,
      endpointAlias: 'loopback-ollama',
      kind: 'ollama',
      transportLoopback: true,
      version: '0.23.0',
    },
  }));

  assert.equal(qualification.status, 'ready-for-operator-review');
  assert.equal(qualification.actualLocalEmbeddingModelQualified, true);
  assert.equal(qualification.activation.authorized, false);
  assert.equal(qualification.activation.status, 'pending-operator-review');
});

test('failed actual models keep the lexical baseline', () => {
  const input = buildInput({
    candidates: [buildCandidate({ modelId: 'model-0.5b', passed: false, size: 400_000_000 })],
  });
  const qualification = buildLocalEmbeddingModelQualification(input);

  assert.equal(qualification.status, 'quality-rejected');
  assert.equal(qualification.decision, 'keep-lexical');
  assert.equal(qualification.selection.modelId, null);
  assert.equal(qualification.actualLocalEmbeddingModelQualityValidated, false);
});

test('suite drift rejects a passing-looking candidate', () => {
  const candidate = buildCandidate({ modelId: 'model-3b', passed: true, size: 1_900_000_000 });
  candidate.qualityEvaluation.thresholds = {
    ...DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS,
    minimumPrecisionAtK: 0.5,
  };
  const qualification = buildLocalEmbeddingModelQualification(buildInput({ candidates: [candidate] }));

  assert.equal(qualification.candidates[0].quality.suiteBound, false);
  assert.equal(qualification.status, 'quality-rejected');
});

test('qualification integrity rejects candidate and decision tampering', () => {
  const qualification = buildLocalEmbeddingModelQualification(buildInput());
  const candidateTampered = structuredClone(qualification);
  candidateTampered.candidates[1].modelId = 'changed-model';
  assert.throws(
    () => assertLocalEmbeddingModelQualification(candidateTampered),
    /candidate-integrity/,
  );

  const decisionTampered = structuredClone(qualification);
  decisionTampered.activation.authorized = true;
  assert.throws(
    () => assertLocalEmbeddingModelQualification(decisionTampered),
    /qualification-integrity|claim-boundary/,
  );
});
