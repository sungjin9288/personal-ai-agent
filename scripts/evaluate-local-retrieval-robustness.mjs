import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { createLocalCommandEmbeddingAdapter } from '../src/core/embedding-adapter.mjs';
import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import {
  assertLocalRetrievalRobustnessEvaluation,
  buildLocalRetrievalRobustnessEvaluation,
} from '../src/core/retrieval-robustness-evaluation.mjs';
import {
  compareRetrievalQualityEvaluations,
  evaluateRetrievalQualitySuite,
} from '../src/core/retrieval-quality-evaluation.mjs';
import { rerankRetrievalCandidates } from '../src/core/retrieval-reranker.mjs';
import { buildRetrievalContextWithCorpus } from '../src/core/retrieval-service.mjs';
import {
  buildSemanticCorpusRecords,
  runSemanticRetrievalExperiment,
} from '../src/core/semantic-retrieval.mjs';

const repoDir = process.cwd();
const wrapperPath = fileURLToPath(new URL('./ollama-embedding-command.mjs', import.meta.url));
const fixturePath = path.join(repoDir, 'fixtures', 'retrieval-robustness-cases-v1.json');
const qualificationPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-embedding-model-qualification.json',
);
const ALLOWED_OPTIONS = new Set(['--endpoint', '--model', '--output', '--timeout-ms']);
const options = parseOptions(process.argv.slice(2));
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const qualification = JSON.parse(fs.readFileSync(qualificationPath, 'utf8'));

assertFixtureContract(fixture);
assertLocalEmbeddingModelQualification(qualification);
const modelCandidate = bindQualifiedCandidate(qualification, options.model);
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
  throw new Error('Installed model digest does not match the qualification evidence.');
}

const adapter = createLocalCommandEmbeddingAdapter({
  args: [
    wrapperPath,
    '--endpoint',
    options.endpoint,
    '--model',
    options.model,
    '--timeout-ms',
    String(options.timeoutMs),
  ],
  command: process.execPath,
  timeoutMs: options.timeoutMs + 5_000,
});
const baselineCases = [];
const candidateCases = [];
const caseMetadata = [];

for (const scenario of fixture.scenarios) {
  assertScenarioSourcesLabeled(scenario);
  for (const query of scenario.queries) {
    const input = buildRetrievalInput(scenario, query.text);
    const id = `${scenario.id}:${query.id}`;
    const lexical = buildRetrievalContextWithCorpus(input);
    const corpusRecords = buildSemanticCorpusRecords(input);
    const startedAt = performance.now();
    const semantic = await runSemanticRetrievalExperiment({
      adapter,
      allowedScopes: [`mission:${scenario.missionId}`],
      corpusRecords,
      k: corpusRecords.length,
      queryText: query.text,
    });
    const reranked = rerankRetrievalCandidates({
      baselineAlgorithmId: semantic.algorithmId,
      candidates: buildRerankingCandidates({ lexical, semantic }),
      k: 1,
    });
    const durationMs = Number((performance.now() - startedAt).toFixed(3));
    const definition = {
      expectedSources: scenario.expectedSources,
      id,
      irrelevantSources: scenario.irrelevantSources,
      k: 1,
    };

    baselineCases.push({
      ...definition,
      retrievedItems: lexical.items.map((item, index) => ({
        ...item,
        sourceKey: sourceKey(lexical.corpusRecords[index]),
      })),
    });
    candidateCases.push({
      ...definition,
      retrievedItems: reranked.retrievedItems,
    });
    caseMetadata.push({
      durationMs,
      id,
      scenarioId: scenario.id,
      variationType: query.variationType,
    });
  }
}

const baselineEvaluation = evaluateRetrievalQualitySuite({
  algorithmId: 'hybrid-lexical-bm25-phrase-v1',
  cases: baselineCases,
  thresholds: fixture.thresholds,
});
const candidateEvaluation = evaluateRetrievalQualitySuite({
  algorithmId: `semantic-lexical-weighted:ollama-local:${options.model}`,
  cases: candidateCases,
  thresholds: fixture.thresholds,
});
const comparison = compareRetrievalQualityEvaluations({
  baseline: baselineEvaluation,
  candidate: candidateEvaluation,
});
const evaluation = buildLocalRetrievalRobustnessEvaluation({
  baselineEvaluation,
  candidateEvaluation,
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
  observedAt: new Date().toISOString(),
  runtime: {
    cloudFeaturesDisabled: options.cloudFeaturesDisabled,
    kind: 'ollama',
    transportLoopback: true,
    version: runtimeVersion.version,
  },
});
assertLocalRetrievalRobustnessEvaluation(evaluation);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evaluation, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      activationAuthorized: evaluation.activation.authorized,
      actualLocalRetrievalRobustnessValidated:
        evaluation.actualLocalRetrievalRobustnessValidated,
      baselineMetrics: evaluation.baseline.metrics,
      candidateMetrics: evaluation.candidate.metrics,
      caseCount: evaluation.candidate.cases.length,
      costFree: evaluation.costFree,
      decision: evaluation.decision,
      latency: evaluation.latency,
      mode: 'local-retrieval-robustness-evaluation',
      modelId: evaluation.model.id,
      ok: true,
      outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
      productionReadyClaim: evaluation.productionReadyClaim,
      status: evaluation.status,
      variationMetrics: evaluation.variationMetrics,
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
        throw new Error('Expected unique robustness command options.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!ALLOWED_OPTIONS.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique robustness command options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || model.length > 200 || /[\r\n]/.test(model)) {
    throw new Error('Robustness evaluation requires a loopback endpoint and model.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Robustness timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Robustness output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}

function assertFixtureContract(value) {
  if (
    value?.schemaVersion !== 'personal-ai-agent-retrieval-robustness-fixture/v1' ||
    value.productionReadyClaim !== false ||
    value.runtimeActivation !== false ||
    !Array.isArray(value.scenarios) ||
    value.scenarios.length === 0 ||
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
    throw new Error(`Every robustness source must be labeled: ${scenario.id}.`);
  }
}

function bindQualifiedCandidate(qualification, modelId) {
  if (qualification.selection?.modelId !== modelId) {
    throw new Error('Robustness model must match the selected qualification candidate.');
  }
  const candidate = qualification.candidates.find((item) => item.modelId === modelId);
  if (
    !candidate ||
    !candidate.qualityPassed ||
    candidate.evidenceHash !== qualification.selection.candidateEvidenceHash
  ) {
    throw new Error('Robustness model must retain its quality-passing qualification evidence.');
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

function buildRerankingCandidates({ lexical, semantic }) {
  const lexicalScores = new Map(
    lexical.items.map((item, index) => [
      sourceKey(lexical.corpusRecords[index]),
      Number(item.score || 0),
    ]),
  );
  const maximumLexicalScore = Math.max(0, ...lexicalScores.values());
  return semantic.retrievedItems.map((item) => ({
    ...item,
    baselineRank: item.rank,
    lexicalScore: maximumLexicalScore > 0
      ? Number(((lexicalScores.get(item.sourceKey) || 0) / maximumLexicalScore).toFixed(6))
      : 0,
    semanticScore: item.score,
  }));
}

function sourceKey(record) {
  return `${record.sourceType}:${record.sourceId}`;
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
