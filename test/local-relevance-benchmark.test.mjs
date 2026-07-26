import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import { runLocalRelevanceBenchmark } from '../src/core/local-relevance-benchmark.mjs';
import { selectLocalRelevanceCandidates } from '../src/core/local-relevance-candidate-selector.mjs';
import { evaluateRetrievalQualitySuite } from '../src/core/retrieval-quality-evaluation.mjs';

const fixture = JSON.parse(
  fs.readFileSync('fixtures/retrieval-robustness-cases-v1.json', 'utf8'),
);

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function buildCandidates() {
  return [
    { baselineRank: 3, content: 'third', sourceKey: 'memory:third' },
    { baselineRank: 1, content: 'first', sourceKey: 'memory:first' },
    { baselineRank: 2, content: 'second', sourceKey: 'memory:second' },
  ];
}

function buildPerfectBaseline() {
  return evaluateRetrievalQualitySuite({
    algorithmId: 'fixture-perfect-baseline',
    cases: fixture.scenarios.flatMap((scenario) =>
      scenario.queries.map((query) => ({
        expectedSources: scenario.expectedSources,
        id: `${scenario.id}:${query.id}`,
        irrelevantSources: scenario.irrelevantSources,
        k: 1,
        retrievedItems: [{
          sourceKey: scenario.expectedSources[0].key,
          sourceType: scenario.expectedSources[0].type,
        }],
      })),
    ),
    thresholds: fixture.thresholds,
  });
}

function benchmarkInput({ maxCandidates, scorer }) {
  return {
    baselineEvaluation: buildPerfectBaseline(),
    fixture,
    fixtureHash: sha(JSON.stringify(fixture)),
    maxCandidates,
    model: {
      actualModelEvaluated: true,
      candidateEvidenceHash: sha('candidate'),
      digest: sha('model'),
      id: 'qwen2.5:3b',
      qualificationHash: sha('qualification'),
      qualificationStatus: 'governance-blocked',
      qualified: false,
    },
    observedAt: '2026-07-16T00:00:00.000Z',
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      transportLoopback: true,
      version: '0.23.0',
    },
    scorer,
  };
}

test('candidate selector preserves lexical order without mutating candidates', () => {
  const candidates = buildCandidates();
  const original = structuredClone(candidates);
  const result = selectLocalRelevanceCandidates({ candidates, maxCandidates: 2 });

  assert.deepEqual(candidates, original);
  assert.deepEqual(
    result.candidates.map((candidate) => candidate.sourceKey),
    ['memory:first', 'memory:second'],
  );
  assert.deepEqual(result.selection, {
    algorithmId: 'lexical-baseline-prefix-v1',
    droppedSourceKeys: ['memory:third'],
    inputCandidateCount: 3,
    maxCandidates: 2,
    selectedCandidateCount: 2,
    selectedSourceKeys: ['memory:first', 'memory:second'],
    stateMigrationRequired: false,
  });
});

test('candidate selector rejects ambiguous identity and rank inputs', () => {
  const duplicateSource = buildCandidates();
  duplicateSource[2].sourceKey = duplicateSource[1].sourceKey;
  assert.throws(
    () => selectLocalRelevanceCandidates({ candidates: duplicateSource, maxCandidates: 2 }),
    /source keys must be unique/,
  );

  const duplicateRank = buildCandidates();
  duplicateRank[2].baselineRank = duplicateRank[1].baselineRank;
  assert.throws(
    () => selectLocalRelevanceCandidates({ candidates: duplicateRank, maxCandidates: 2 }),
    /baseline ranks must be unique/,
  );
});

test('top-two benchmark retains all expected sources and uses 60 scoring calls', async () => {
  let scoreCallCount = 0;
  const scorer = {
    id: 'fixture-independent-score',
    modelId: 'qwen2.5:3b',
    async scoreDocument({ documentText }) {
      scoreCallCount += 1;
      return {
        score: /renew the credential|issue the refund|transfer ownership/.test(documentText)
          ? 95
          : 5,
      };
    },
  };
  const result = await runLocalRelevanceBenchmark(benchmarkInput({
    maxCandidates: 2,
    scorer,
  }));

  assert.equal(scoreCallCount, 60);
  assert.equal(result.selectionRecords.length, 15);
  assert.equal(result.selectionRecords.every((record) => record.expectedSourceRetained), true);
  assert.equal(result.selectionRecords.every((record) => record.inputCandidateCount === 3), true);
  assert.equal(result.selectionRecords.every((record) => record.selectedCandidateCount === 2), true);
  assert.equal(result.caseScores.every((record) => record.sourceScores.length === 2), true);
  assert.equal(result.robustnessEvaluation.candidate.metrics.casePassRate, 1);
  assert.equal(result.robustnessEvaluation.variationMetrics['hard-negative'].casePassRate, 1);
});

test('top-one benchmark stops before scoring when expected-source recall would regress', async () => {
  let scoreCallCount = 0;
  const scorer = {
    modelId: 'qwen2.5:3b',
    async scoreDocument() {
      scoreCallCount += 1;
      return { score: 50 };
    },
  };

  await assert.rejects(
    () => runLocalRelevanceBenchmark(benchmarkInput({ maxCandidates: 1, scorer })),
    /loses expected source before scoring/,
  );
  assert.equal(scoreCallCount, 0);
});
