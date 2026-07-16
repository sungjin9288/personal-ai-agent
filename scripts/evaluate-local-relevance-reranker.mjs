import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';
import {
  assertLocalRelevanceRerankerEvaluation,
  buildLocalRelevanceRerankerEvaluation,
} from '../src/core/local-relevance-reranker-evaluation.mjs';
import { rerankByLocalRelevance } from '../src/core/local-relevance-reranker.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createOllamaRelevanceScorer } from '../src/core/ollama-relevance-scorer.mjs';
import {
  assertLocalRetrievalRobustnessEvaluation,
  buildLocalRetrievalRobustnessEvaluation,
} from '../src/core/retrieval-robustness-evaluation.mjs';
import {
  compareRetrievalQualityEvaluations,
  evaluateRetrievalQualitySuite,
} from '../src/core/retrieval-quality-evaluation.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';
import { buildSemanticCorpusRecords } from '../src/core/semantic-retrieval.mjs';

const repoDir = process.cwd();
const fixturePath = path.join(repoDir, 'fixtures', 'retrieval-robustness-cases-v1.json');
const qualificationPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-embedding-model-qualification.json',
);
const priorEvaluationPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-retrieval-robustness.json',
);
const ALLOWED_OPTIONS = new Set(['--endpoint', '--model', '--output', '--timeout-ms']);
const options = parseOptions(process.argv.slice(2));
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const qualification = JSON.parse(fs.readFileSync(qualificationPath, 'utf8'));
const priorEvaluation = JSON.parse(fs.readFileSync(priorEvaluationPath, 'utf8'));

assertFixtureContract(fixture);
assertLocalEmbeddingModelQualification(qualification);
assertLocalRetrievalRobustnessEvaluation(priorEvaluation);
if (
  priorEvaluation.fixtureHash !== hashValue(fixtureText) ||
  priorEvaluation.status !== 'failed-keep-lexical' ||
  priorEvaluation.actualLocalRetrievalRobustnessValidated !== false
) {
  throw new Error('R8 requires the current failed R7 robustness baseline.');
}
const modelCandidate = bindModelEvidence({
  modelId: options.model,
  priorEvaluation,
  qualification,
});
const runtimeVersion = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/version',
});
const inventory = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/tags',
});
const inventoryModel = inventory.models?.find((model) => model.name === options.model);
if (!inventoryModel || inventoryModel.digest !== modelCandidate.modelDigest) {
  throw new Error('Installed reranker model digest does not match the qualification evidence.');
}

const scorer = createOllamaRelevanceScorer({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const candidateCases = [];
const caseMetadata = [];
const caseScores = [];
const observedAt = new Date().toISOString();

for (const scenario of fixture.scenarios) {
  assertScenarioSourcesLabeled(scenario);
  for (const query of scenario.queries) {
    const id = `${scenario.id}:${query.id}`;
    const input = buildRetrievalInput(scenario, query.text);
    const candidates = buildCandidates(input);
    const firstStartedAt = performance.now();
    const first = await rerankByLocalRelevance({
      candidates,
      k: candidates.length,
      queryText: query.text,
      scorer,
    });
    const firstDurationMs = Number((performance.now() - firstStartedAt).toFixed(3));
    const secondStartedAt = performance.now();
    const second = await rerankByLocalRelevance({
      candidates: [...candidates].reverse(),
      k: candidates.length,
      queryText: query.text,
      scorer,
    });
    const secondDurationMs = Number((performance.now() - secondStartedAt).toFixed(3));
    const firstScores = toSourceScores(first);
    const secondScores = toSourceScores(second);
    const repeatedScoreMatch =
      JSON.stringify(firstScores) === JSON.stringify(secondScores) &&
      JSON.stringify(first.retrievedItems.map((item) => item.sourceKey)) ===
        JSON.stringify(second.retrievedItems.map((item) => item.sourceKey));

    candidateCases.push({
      expectedSources: scenario.expectedSources,
      id,
      irrelevantSources: scenario.irrelevantSources,
      k: 1,
      retrievedItems: first.retrievedItems.slice(0, 1),
    });
    caseMetadata.push({
      durationMs: firstDurationMs,
      id,
      scenarioId: scenario.id,
      variationType: query.variationType,
    });
    caseScores.push({
      firstDurationMs,
      id,
      repeatedScoreMatch,
      secondDurationMs,
      sourceScores: firstScores,
    });
  }
}

const candidateQuality = evaluateRetrievalQualitySuite({
  algorithmId: `local-relevance:ollama-independent-score:${options.model}`,
  cases: candidateCases,
  thresholds: fixture.thresholds,
});
const comparison = compareRetrievalQualityEvaluations({
  baseline: priorEvaluation.baseline,
  candidate: candidateQuality,
});
const runtime = {
  cloudFeaturesDisabled: options.cloudFeaturesDisabled,
  kind: 'ollama',
  transportLoopback: true,
  version: runtimeVersion.version,
};
const candidateEvaluation = buildLocalRetrievalRobustnessEvaluation({
  baselineEvaluation: priorEvaluation.baseline,
  candidateEvaluation: candidateQuality,
  caseMetadata,
  comparison,
  coverage: fixture.coverage,
  fixtureHash: hashValue(fixtureText),
  model: {
    actualModelEvaluated: true,
    candidateEvidenceHash: modelCandidate.evidenceHash,
    digest: modelCandidate.modelDigest,
    id: modelCandidate.modelId,
    qualificationHash: qualification.qualificationHash,
    qualificationStatus: qualification.status,
    qualified: qualification.actualLocalEmbeddingModelQualified,
  },
  observedAt,
  runtime,
});
const evaluation = buildLocalRelevanceRerankerEvaluation({
  candidateEvaluation,
  caseScores,
  observedAt,
  priorEvaluation,
  runtime,
  scorer,
});
assertLocalRelevanceRerankerEvaluation(evaluation);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evaluation, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      activationAuthorized: evaluation.activation.authorized,
      actualLocalRelevanceRerankerQualified:
        evaluation.actualLocalRelevanceRerankerQualified,
      actualLocalRelevanceRerankerQualityValidated:
        evaluation.actualLocalRelevanceRerankerQualityValidated,
      candidateMetrics: evaluation.candidateEvaluation.candidate.metrics,
      caseCount: evaluation.candidateEvaluation.candidate.cases.length,
      costFree: evaluation.costFree,
      decision: evaluation.decision,
      improvement: evaluation.improvement,
      latency: evaluation.latency,
      mode: 'local-relevance-reranker-evaluation',
      modelId: evaluation.scorer.modelId,
      ok: true,
      outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
      productionReadyClaim: evaluation.productionReadyClaim,
      repeatStable: evaluation.caseScores.every((item) => item.repeatedScoreMatch),
      status: evaluation.status,
    },
    null,
    2,
  ),
);

function parseOptions(args) {
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) {
        throw new Error('Expected unique relevance evaluation options.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!ALLOWED_OPTIONS.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique relevance evaluation options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || model.length > 200 || /[\r\n]/.test(model)) {
    throw new Error('Relevance evaluation requires a loopback endpoint and model.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Relevance evaluation timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Relevance evaluation output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}

function assertFixtureContract(value) {
  if (
    value?.schemaVersion !== 'personal-ai-agent-retrieval-robustness-fixture/v1' ||
    value.productionReadyClaim !== false ||
    value.runtimeActivation !== false ||
    !Array.isArray(value.scenarios) ||
    !value.scenarios.length ||
    !value.thresholds ||
    !value.coverage
  ) {
    throw new Error('Unsupported retrieval robustness fixture contract.');
  }
}

function assertScenarioSourcesLabeled(scenario) {
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

function bindModelEvidence({ modelId, priorEvaluation, qualification }) {
  if (
    qualification.selection?.modelId !== modelId ||
    priorEvaluation.model.id !== modelId ||
    priorEvaluation.model.qualificationHash !== qualification.qualificationHash
  ) {
    throw new Error('Relevance reranker model must retain the R6 and R7 binding.');
  }
  const candidate = qualification.candidates.find((item) => item.modelId === modelId);
  if (
    !candidate ||
    !candidate.qualityPassed ||
    candidate.modelDigest !== priorEvaluation.model.digest ||
    candidate.evidenceHash !== qualification.selection.candidateEvidenceHash
  ) {
    throw new Error('Relevance reranker model evidence does not match qualification.');
  }
  return candidate;
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

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
