import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';
import { runLocalRelevanceBenchmark } from '../src/core/local-relevance-benchmark.mjs';
import {
  assertLocalRerankerResourceEnvelope,
  buildLocalRerankerResourceEnvelope,
} from '../src/core/local-reranker-resource-envelope.mjs';
import {
  assertLocalRerankerRuntimeStability,
  buildLocalRerankerRuntimeStability,
} from '../src/core/local-reranker-runtime-stability.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import {
  ensureOllamaModelUnloaded,
  readLoadedOllamaModel,
} from '../src/core/ollama-model-runtime.mjs';
import { createOllamaRelevanceScorer } from '../src/core/ollama-relevance-scorer.mjs';

const SHORTLIST_MAX_CANDIDATES = 2;
const repoDir = process.cwd();
const fixturePath = path.join(repoDir, 'fixtures', 'retrieval-robustness-cases-v1.json');
const qualificationPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-embedding-model-qualification.json',
);
const priorEnvelopePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-reranker-resource-envelope.json',
);
const ALLOWED_OPTIONS = new Set(['--endpoint', '--model', '--output', '--timeout-ms']);
const options = parseOptions(process.argv.slice(2));
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const qualification = JSON.parse(fs.readFileSync(qualificationPath, 'utf8'));
const priorEnvelope = JSON.parse(fs.readFileSync(priorEnvelopePath, 'utf8'));

assertLocalEmbeddingModelQualification(qualification);
assertLocalRerankerResourceEnvelope(priorEnvelope);
if (
  priorEnvelope.status !== 'resource-envelope-passed-governance-blocked' ||
  priorEnvelope.actualLocalRerankerResourceEnvelopeValidated !== true ||
  priorEnvelope.actualLocalRerankerResourceEnvelopeQualified !== false ||
  priorEnvelope.runtimeActivation !== false
) {
  throw new Error('R10 requires the current validated and governance-blocked R9 envelope.');
}
const modelCandidate = bindModelEvidence({
  modelId: options.model,
  priorEnvelope,
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
if (
  !inventoryModel ||
  inventoryModel.digest !== modelCandidate.modelDigest ||
  Number(inventoryModel.size) !== modelCandidate.modelSizeBytes
) {
  throw new Error('Installed stability model inventory does not match qualification evidence.');
}

const runtime = {
  cloudFeaturesDisabled: options.cloudFeaturesDisabled,
  kind: 'ollama',
  transportLoopback: true,
  version: runtimeVersion.version,
};
if (JSON.stringify(runtime) !== JSON.stringify({
  cloudFeaturesDisabled: priorEnvelope.runtime.cloudFeaturesDisabled,
  kind: priorEnvelope.runtime.kind,
  transportLoopback: priorEnvelope.runtime.transportLoopback,
  version: priorEnvelope.runtime.version,
})) {
  throw new Error('Runtime stability must retain the R9 Ollama runtime binding.');
}
const scorer = createOllamaRelevanceScorer({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
if (
  scorer.id !== priorEnvelope.scorer.id ||
  scorer.modelId !== priorEnvelope.scorer.modelId ||
  scorer.promptHash !== priorEnvelope.scorer.promptHash ||
  scorer.promptVersion !== priorEnvelope.scorer.promptVersion
) {
  throw new Error('Runtime stability must retain the R9 scorer and prompt binding.');
}

const lifecycle = await ensureOllamaModelUnloaded({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const runs = [];
runs.push(await runBenchmark({ id: 'cold-1', lane: 'cold', workerIndex: null }));
for (let index = 1; index <= 3; index += 1) {
  runs.push(await runBenchmark({ id: `warm-${index}`, lane: 'warm', workerIndex: null }));
}
const concurrencyStartedAt = performance.now();
const concurrentRuns = await Promise.all([
  runBenchmark({ id: 'concurrent-1', lane: 'concurrent', workerIndex: 1 }),
  runBenchmark({ id: 'concurrent-2', lane: 'concurrent', workerIndex: 2 }),
]);
const concurrencyBatchWallMs = positiveDuration(performance.now() - concurrencyStartedAt);
runs.push(...concurrentRuns);

const observedAt = new Date().toISOString();
const stability = buildLocalRerankerRuntimeStability({
  concurrencyBatchWallMs,
  lifecycle,
  observedAt,
  priorEnvelope,
  runs,
});
assertLocalRerankerRuntimeStability(stability);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(stability, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      activationAuthorized: stability.activation.authorized,
      actualLocalRerankerRuntimeStabilityQualified:
        stability.actualLocalRerankerRuntimeStabilityQualified,
      actualLocalRerankerRuntimeStabilityValidated:
        stability.actualLocalRerankerRuntimeStabilityValidated,
      concurrency: stability.concurrency,
      costFree: stability.costFree,
      decision: stability.decision,
      latency: stability.latency,
      mode: 'local-reranker-runtime-stability-evaluation',
      modelId: priorEnvelope.resourceSnapshot.modelId,
      ok: true,
      outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
      productionReadyClaim: stability.productionReadyClaim,
      qualityParity: stability.qualityParity,
      resourceStable: stability.resourceStable,
      runContract: stability.runContract,
      status: stability.status,
    },
    null,
    2,
  ),
);

async function runBenchmark({ id, lane, workerIndex }) {
  const observedAt = new Date().toISOString();
  const startedAt = performance.now();
  const benchmark = await runLocalRelevanceBenchmark({
    baselineEvaluation: priorEnvelope.priorEvaluation.candidateEvaluation.candidate,
    fixture,
    fixtureHash: hashValue(fixtureText),
    maxCandidates: SHORTLIST_MAX_CANDIDATES,
    model: priorEnvelope.optimizedEvaluation.model,
    observedAt,
    runtime,
    scorer,
  });
  const wallDurationMs = positiveDuration(performance.now() - startedAt);
  const loadedModel = await readLoadedOllamaModel({
    endpoint: options.endpoint,
    model: options.model,
    timeoutMs: options.timeoutMs,
  });
  if (!loadedModel || loadedModel.modelDigest !== modelCandidate.modelDigest) {
    throw new Error(`Runtime stability model is not loaded after run: ${id}.`);
  }
  const resourceEnvelope = buildLocalRerankerResourceEnvelope({
    caseScores: benchmark.caseScores,
    observedAt,
    optimizedEvaluation: benchmark.robustnessEvaluation,
    priorEvaluation: priorEnvelope.priorEvaluation,
    resourceSnapshot: {
      ...loadedModel,
      modelArtifactBytes: inventoryModel.size,
    },
    runtime,
    scorer,
    selectionRecords: benchmark.selectionRecords,
  });
  assertLocalRerankerResourceEnvelope(resourceEnvelope);
  return { id, lane, observedAt, resourceEnvelope, wallDurationMs, workerIndex };
}

function parseOptions(args) {
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) {
        throw new Error('Expected unique runtime stability options.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!ALLOWED_OPTIONS.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique runtime stability options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || model.length > 200 || /[\r\n]/.test(model)) {
    throw new Error('Runtime stability evaluation requires a loopback endpoint and model.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Runtime stability timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Runtime stability output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}

function bindModelEvidence({ modelId, priorEnvelope, qualification }) {
  if (
    qualification.selection?.modelId !== modelId ||
    priorEnvelope.resourceSnapshot.modelId !== modelId
  ) {
    throw new Error('Runtime stability model must retain the R6 and R9 binding.');
  }
  const candidate = qualification.candidates.find((item) => item.modelId === modelId);
  if (
    !candidate ||
    !candidate.qualityPassed ||
    candidate.modelDigest !== priorEnvelope.resourceSnapshot.modelDigest ||
    candidate.modelSizeBytes !== priorEnvelope.resourceSnapshot.modelArtifactBytes ||
    candidate.evidenceHash !== qualification.selection.candidateEvidenceHash
  ) {
    throw new Error('Runtime stability model evidence does not match qualification.');
  }
  return candidate;
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function positiveDuration(value) {
  return Math.max(Number(value.toFixed(3)), 0.001);
}
