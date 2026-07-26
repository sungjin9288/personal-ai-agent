import { performance } from 'node:perf_hooks';

import { selectLocalRelevanceCandidates } from './local-relevance-candidate-selector.mjs';
import { rerankByLocalRelevance } from './local-relevance-reranker.mjs';
import {
  buildLocalRetrievalRobustnessEvaluation,
} from './retrieval-robustness-evaluation.mjs';
import {
  compareRetrievalQualityEvaluations,
  evaluateRetrievalQualitySuite,
} from './retrieval-quality-evaluation.mjs';
import { buildRetrievalContextWithCorpus } from './retrieval-service.mjs';
import { buildSemanticCorpusRecords } from './semantic-retrieval.mjs';

const ROBUSTNESS_FIXTURE_SCHEMA_VERSION =
  'personal-ai-agent-retrieval-robustness-fixture/v1';

function normalizeText(value) {
  return String(value || '').trim();
}

export function assertLocalRelevanceBenchmarkFixture(fixture) {
  if (
    fixture?.schemaVersion !== ROBUSTNESS_FIXTURE_SCHEMA_VERSION ||
    fixture.productionReadyClaim !== false ||
    fixture.runtimeActivation !== false ||
    !Array.isArray(fixture.scenarios) ||
    !fixture.scenarios.length ||
    !fixture.thresholds ||
    !fixture.coverage
  ) {
    throw new Error('Unsupported local relevance benchmark fixture contract.');
  }
  for (const scenario of fixture.scenarios) {
    const labeled = [...scenario.expectedSources, ...scenario.irrelevantSources]
      .map((source) => source.key)
      .sort();
    const available = [
      ...scenario.memoryEntries.map((entry) => `memory:${entry.id}`),
      ...scenario.attachments.map((attachment) => `attachment:${attachment.id}`),
    ].sort();
    if (JSON.stringify(labeled) !== JSON.stringify(available)) {
      throw new Error(`Every relevance fixture source must be labeled: ${scenario.id}.`);
    }
  }
}

export async function runLocalRelevanceBenchmark({
  baselineEvaluation,
  fixture,
  fixtureHash,
  maxCandidates,
  model,
  observedAt,
  runtime,
  scorer,
} = {}) {
  assertLocalRelevanceBenchmarkFixture(fixture);
  const plans = fixture.scenarios.flatMap((scenario) =>
    scenario.queries.map((query) => buildCasePlan({ maxCandidates, query, scenario })),
  );
  const uncovered = plans.filter((plan) => !plan.expectedSourceRetained);
  if (uncovered.length) {
    throw new Error(
      `Local relevance shortlist loses expected source before scoring: ${uncovered
        .map((plan) => plan.id)
        .join(', ')}.`,
    );
  }

  const candidateCases = [];
  const caseMetadata = [];
  const caseScores = [];
  const selectionRecords = [];

  for (const plan of plans) {
    const firstStartedAt = performance.now();
    const first = await rerankByLocalRelevance({
      candidates: plan.candidates,
      k: plan.candidates.length,
      queryText: plan.queryText,
      scorer,
    });
    const firstDurationMs = positiveDuration(performance.now() - firstStartedAt);
    const secondStartedAt = performance.now();
    const second = await rerankByLocalRelevance({
      candidates: [...plan.candidates].reverse(),
      k: plan.candidates.length,
      queryText: plan.queryText,
      scorer,
    });
    const secondDurationMs = positiveDuration(performance.now() - secondStartedAt);
    const firstScores = toSourceScores(first);
    const secondScores = toSourceScores(second);
    const repeatedScoreMatch =
      JSON.stringify(firstScores) === JSON.stringify(secondScores) &&
      JSON.stringify(first.retrievedItems.map((item) => item.sourceKey)) ===
        JSON.stringify(second.retrievedItems.map((item) => item.sourceKey));

    candidateCases.push({
      expectedSources: plan.expectedSources,
      id: plan.id,
      irrelevantSources: plan.irrelevantSources,
      k: 1,
      retrievedItems: first.retrievedItems.slice(0, 1),
    });
    caseMetadata.push({
      durationMs: firstDurationMs,
      id: plan.id,
      scenarioId: plan.scenarioId,
      variationType: plan.variationType,
    });
    caseScores.push({
      firstDurationMs,
      id: plan.id,
      repeatedScoreMatch,
      secondDurationMs,
      sourceScores: firstScores,
    });
    selectionRecords.push({
      ...plan.selection,
      expectedSourceRetained: true,
      id: plan.id,
    });
  }

  const candidateEvaluation = evaluateRetrievalQualitySuite({
    algorithmId: `local-relevance:ollama-independent-score:${normalizeText(scorer?.modelId)}`,
    cases: candidateCases,
    thresholds: fixture.thresholds,
  });
  const comparison = compareRetrievalQualityEvaluations({
    baseline: baselineEvaluation,
    candidate: candidateEvaluation,
  });
  const robustnessEvaluation = buildLocalRetrievalRobustnessEvaluation({
    baselineEvaluation,
    candidateEvaluation,
    caseMetadata,
    comparison,
    coverage: fixture.coverage,
    fixtureHash,
    model,
    observedAt,
    runtime,
  });

  return {
    caseScores,
    robustnessEvaluation,
    selectionRecords,
  };
}

function buildCasePlan({ maxCandidates, query, scenario }) {
  const input = buildRetrievalInput(scenario, query.text);
  const fullCandidates = buildCandidates(input);
  const selectionResult = selectLocalRelevanceCandidates({
    candidates: fullCandidates,
    maxCandidates: maxCandidates ?? fullCandidates.length,
  });
  const expectedSourceKeys = new Set(scenario.expectedSources.map((source) => source.key));
  return {
    candidates: selectionResult.candidates,
    expectedSourceRetained: selectionResult.selection.selectedSourceKeys.some((sourceKey) =>
      expectedSourceKeys.has(sourceKey),
    ),
    expectedSources: scenario.expectedSources,
    id: `${scenario.id}:${query.id}`,
    irrelevantSources: scenario.irrelevantSources,
    queryText: query.text,
    scenarioId: scenario.id,
    selection: selectionResult.selection,
    variationType: query.variationType,
  };
}

function buildRetrievalInput(scenario, queryText) {
  return {
    attachments: scenario.attachments,
    memoryEntries: scenario.memoryEntries,
    mission: {
      constraints: [],
      deliverableType: 'decision-memo',
      id: scenario.missionId,
      mode: 'knowledge',
      objective: queryText,
      title: queryText,
    },
    pack: { requiredSections: [], reviewRules: [] },
    previousOutputs: {},
    providerRole: scenario.role,
    role: scenario.role,
  };
}

function buildCandidates(input) {
  const lexical = buildRetrievalContextWithCorpus(input);
  const corpusBySource = new Map(
    buildSemanticCorpusRecords(input).map((record) => [sourceKey(record), record]),
  );
  const lexicalOrder = lexical.corpusRecords.map(sourceKey);
  const remainingOrder = [...corpusBySource.keys()]
    .filter((key) => !lexicalOrder.includes(key))
    .sort();
  const baselineRanks = new Map(
    [...lexicalOrder, ...remainingOrder].map((key, index) => [key, index + 1]),
  );
  return [...corpusBySource.entries()].map(([key, record]) => ({
    baselineRank: baselineRanks.get(key),
    content: record.content,
    sourceId: record.sourceId,
    sourceKey: key,
    sourceLabel: record.sourceLabel,
    sourceType: record.sourceType,
  }));
}

function toSourceScores(result) {
  return result.retrievedItems
    .map((item) => ({ score: item.relevanceScore, sourceKey: item.sourceKey }))
    .sort((left, right) => left.sourceKey.localeCompare(right.sourceKey));
}

function sourceKey(record) {
  return `${record.sourceType}:${record.sourceId}`;
}

function positiveDuration(value) {
  return Math.max(Number(value.toFixed(3)), 0.001);
}
