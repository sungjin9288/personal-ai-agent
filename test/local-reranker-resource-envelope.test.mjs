import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  assertLocalRerankerResourceEnvelope,
  buildLocalRerankerResourceEnvelope,
} from '../src/core/local-reranker-resource-envelope.mjs';
import { buildLocalRetrievalRobustnessEvaluation } from '../src/core/retrieval-robustness-evaluation.mjs';
import { compareRetrievalQualityEvaluations } from '../src/core/retrieval-quality-evaluation.mjs';

const priorEvaluation = JSON.parse(
  fs.readFileSync('evidence/output-artifacts/local-relevance-reranker-evaluation.json', 'utf8'),
);

function buildOptimizedEvaluation() {
  const baseline = priorEvaluation.candidateEvaluation.candidate;
  const candidate = structuredClone(baseline);
  return buildLocalRetrievalRobustnessEvaluation({
    baselineEvaluation: baseline,
    candidateEvaluation: candidate,
    caseMetadata: priorEvaluation.candidateEvaluation.cases.map((item, index) => ({
      durationMs: 10 + index,
      id: item.id,
      scenarioId: item.scenarioId,
      variationType: item.variationType,
    })),
    comparison: compareRetrievalQualityEvaluations({ baseline, candidate }),
    coverage: priorEvaluation.candidateEvaluation.coverage,
    fixtureHash: priorEvaluation.candidateEvaluation.fixtureHash,
    model: priorEvaluation.candidateEvaluation.model,
    observedAt: '2026-07-16T03:00:00.000Z',
    runtime: priorEvaluation.runtime,
  });
}

function buildInput({ latencyMultiplier = 0.6, repeatedScoreMatch = true } = {}) {
  const selectionRecords = priorEvaluation.caseScores.map((item) => {
    const selectedSourceKeys = item.sourceScores.slice(0, 2).map((source) => source.sourceKey);
    return {
      algorithmId: 'lexical-baseline-prefix-v1',
      droppedSourceKeys: item.sourceScores.slice(2).map((source) => source.sourceKey),
      expectedSourceRetained: true,
      id: item.id,
      inputCandidateCount: 3,
      maxCandidates: 2,
      selectedCandidateCount: 2,
      selectedSourceKeys,
      stateMigrationRequired: false,
    };
  });
  return {
    caseScores: priorEvaluation.caseScores.map((item) => {
      const selected = new Set(
        selectionRecords.find((record) => record.id === item.id).selectedSourceKeys,
      );
      return {
        firstDurationMs: item.firstDurationMs * latencyMultiplier,
        id: item.id,
        repeatedScoreMatch,
        secondDurationMs: item.secondDurationMs * latencyMultiplier,
        sourceScores: item.sourceScores.filter((source) => selected.has(source.sourceKey)),
      };
    }),
    observedAt: '2026-07-16T04:00:00.000Z',
    optimizedEvaluation: buildOptimizedEvaluation(),
    priorEvaluation,
    resourceSnapshot: {
      contextLength: 4096,
      loadedModelBytes: 2_390_300_672,
      loadedModelVramBytes: 2_390_300_672,
      modelArtifactBytes: 1_929_912_432,
      modelDigest: priorEvaluation.candidateEvaluation.model.digest,
      modelId: priorEvaluation.scorer.modelId,
      source: 'ollama-api-ps',
    },
    runtime: priorEvaluation.runtime,
    scorer: priorEvaluation.scorer,
    selectionRecords,
  };
}

test('quality-parity shortlist records a smaller governance-blocked resource envelope', () => {
  const envelope = buildLocalRerankerResourceEnvelope(buildInput());

  assert.equal(envelope.status, 'resource-envelope-passed-governance-blocked');
  assert.equal(envelope.actualLocalRerankerResourceEnvelopeValidated, true);
  assert.equal(envelope.actualLocalRerankerResourceEnvelopeQualified, false);
  assert.equal(envelope.qualityParity, true);
  assert.equal(envelope.repeatStable, true);
  assert.equal(envelope.shortlistCoveragePassed, true);
  assert.equal(envelope.latency.modelInferenceCount, 60);
  assert.equal(envelope.latency.rerankPassCount, 30);
  assert.equal(envelope.comparison.inferenceReductionRate, 0.3333);
  assert.equal(envelope.comparison.p95ReductionRate > 0, true);
  assert.equal(envelope.activation.authorized, false);
  assert.equal(envelope.runtimeActivation, false);
  assert.equal(envelope.productionReadyClaim, false);
  assert.doesNotThrow(() => assertLocalRerankerResourceEnvelope(envelope));
});

test('latency regression keeps the R8 full-scan decision', () => {
  const envelope = buildLocalRerankerResourceEnvelope(buildInput({ latencyMultiplier: 1.2 }));

  assert.equal(envelope.status, 'failed-keep-r8-full-scan');
  assert.equal(envelope.actualLocalRerankerResourceEnvelopeValidated, false);
  assert.equal(envelope.decision, 'keep-r8-full-scan');
});

test('repeat mismatch keeps the R8 full-scan decision', () => {
  const envelope = buildLocalRerankerResourceEnvelope(buildInput({ repeatedScoreMatch: false }));

  assert.equal(envelope.actualLocalRerankerResourceEnvelopeValidated, false);
  assert.equal(envelope.repeatStable, false);
});

test('resource, selection, and activation tampering are rejected', () => {
  const envelope = buildLocalRerankerResourceEnvelope(buildInput());

  const resourceTampered = structuredClone(envelope);
  resourceTampered.resourceSnapshot.loadedModelBytes += 1;
  assert.throws(
    () => assertLocalRerankerResourceEnvelope(resourceTampered),
    /integrity|contract/,
  );

  const selectionTampered = structuredClone(envelope);
  selectionTampered.selectionRecords[0].maxCandidates = 1;
  assert.throws(
    () => assertLocalRerankerResourceEnvelope(selectionTampered),
    /integrity|top-two|contract/,
  );

  const activationTampered = structuredClone(envelope);
  activationTampered.activation.authorized = true;
  assert.throws(
    () => assertLocalRerankerResourceEnvelope(activationTampered),
    /integrity|claim-boundary|contract/,
  );

  const runtimeTampered = structuredClone(envelope);
  runtimeTampered.optimizedEvaluation.runtime.cloudFeaturesDisabled = false;
  assert.throws(
    () => assertLocalRerankerResourceEnvelope(runtimeTampered),
    /integrity|runtime|contract/,
  );
});
