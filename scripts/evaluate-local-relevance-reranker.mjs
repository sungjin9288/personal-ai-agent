import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';
import {
  assertLocalRelevanceBenchmarkFixture,
  runLocalRelevanceBenchmark,
} from '../src/core/local-relevance-benchmark.mjs';
import {
  assertLocalRelevanceRerankerEvaluation,
  buildLocalRelevanceRerankerEvaluation,
} from '../src/core/local-relevance-reranker-evaluation.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createOllamaRelevanceScorer } from '../src/core/ollama-relevance-scorer.mjs';
import { assertLocalRetrievalRobustnessEvaluation } from '../src/core/retrieval-robustness-evaluation.mjs';

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

assertLocalRelevanceBenchmarkFixture(fixture);
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
const observedAt = new Date().toISOString();
const runtime = {
  cloudFeaturesDisabled: options.cloudFeaturesDisabled,
  kind: 'ollama',
  transportLoopback: true,
  version: runtimeVersion.version,
};
const benchmark = await runLocalRelevanceBenchmark({
  baselineEvaluation: priorEvaluation.baseline,
  fixture,
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
  scorer,
});
const evaluation = buildLocalRelevanceRerankerEvaluation({
  candidateEvaluation: benchmark.robustnessEvaluation,
  caseScores: benchmark.caseScores,
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

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
