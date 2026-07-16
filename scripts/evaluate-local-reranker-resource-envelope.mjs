import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalEmbeddingModelQualification } from '../src/core/local-embedding-model-qualification.mjs';
import { runLocalRelevanceBenchmark } from '../src/core/local-relevance-benchmark.mjs';
import { assertLocalRelevanceRerankerEvaluation } from '../src/core/local-relevance-reranker-evaluation.mjs';
import {
  assertLocalRerankerResourceEnvelope,
  buildLocalRerankerResourceEnvelope,
} from '../src/core/local-reranker-resource-envelope.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
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
const priorEvaluationPath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-relevance-reranker-evaluation.json',
);
const ALLOWED_OPTIONS = new Set(['--endpoint', '--model', '--output', '--timeout-ms']);
const options = parseOptions(process.argv.slice(2));
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const qualification = JSON.parse(fs.readFileSync(qualificationPath, 'utf8'));
const priorEvaluation = JSON.parse(fs.readFileSync(priorEvaluationPath, 'utf8'));

assertLocalEmbeddingModelQualification(qualification);
assertLocalRelevanceRerankerEvaluation(priorEvaluation);
if (
  priorEvaluation.status !== 'quality-passed-governance-blocked' ||
  priorEvaluation.actualLocalRelevanceRerankerQualityValidated !== true ||
  priorEvaluation.actualLocalRelevanceRerankerQualified !== false ||
  priorEvaluation.runtimeActivation !== false
) {
  throw new Error('R9 requires the current quality-passed and governance-blocked R8 evidence.');
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
if (
  !inventoryModel ||
  inventoryModel.digest !== modelCandidate.modelDigest ||
  Number(inventoryModel.size) !== modelCandidate.modelSizeBytes
) {
  throw new Error('Installed reranker model inventory does not match qualification evidence.');
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
  baselineEvaluation: priorEvaluation.candidateEvaluation.candidate,
  fixture,
  fixtureHash: hashValue(fixtureText),
  maxCandidates: SHORTLIST_MAX_CANDIDATES,
  model: priorEvaluation.candidateEvaluation.model,
  observedAt,
  runtime,
  scorer,
});
const loadedModels = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/ps',
});
const loadedModel = loadedModels.models?.find(
  (model) => model.name === options.model || model.model === options.model,
);
if (!loadedModel || loadedModel.digest !== modelCandidate.modelDigest) {
  throw new Error('Evaluated reranker model is not present in the loaded-model resource snapshot.');
}
const envelope = buildLocalRerankerResourceEnvelope({
  caseScores: benchmark.caseScores,
  observedAt,
  optimizedEvaluation: benchmark.robustnessEvaluation,
  priorEvaluation,
  resourceSnapshot: {
    contextLength: loadedModel.context_length,
    loadedModelBytes: loadedModel.size,
    loadedModelVramBytes: loadedModel.size_vram,
    modelArtifactBytes: inventoryModel.size,
    modelDigest: loadedModel.digest,
    modelId: options.model,
    source: 'ollama-api-ps',
  },
  runtime,
  scorer,
  selectionRecords: benchmark.selectionRecords,
});
assertLocalRerankerResourceEnvelope(envelope);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      activationAuthorized: envelope.activation.authorized,
      actualLocalRerankerResourceEnvelopeQualified:
        envelope.actualLocalRerankerResourceEnvelopeQualified,
      actualLocalRerankerResourceEnvelopeValidated:
        envelope.actualLocalRerankerResourceEnvelopeValidated,
      comparison: envelope.comparison,
      costFree: envelope.costFree,
      decision: envelope.decision,
      latency: envelope.latency,
      mode: 'local-reranker-resource-envelope-evaluation',
      modelId: envelope.resourceSnapshot.modelId,
      ok: true,
      outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
      productionReadyClaim: envelope.productionReadyClaim,
      qualityParity: envelope.qualityParity,
      resourceSnapshot: envelope.resourceSnapshot,
      shortlistCoveragePassed: envelope.shortlistCoveragePassed,
      status: envelope.status,
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
        throw new Error('Expected unique resource envelope options.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!ALLOWED_OPTIONS.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique resource envelope options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || model.length > 200 || /[\r\n]/.test(model)) {
    throw new Error('Resource envelope evaluation requires a loopback endpoint and model.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Resource envelope timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Resource envelope output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}

function bindModelEvidence({ modelId, priorEvaluation, qualification }) {
  if (
    qualification.selection?.modelId !== modelId ||
    priorEvaluation.scorer.modelId !== modelId ||
    priorEvaluation.candidateEvaluation.model.id !== modelId ||
    priorEvaluation.candidateEvaluation.model.qualificationHash !==
      qualification.qualificationHash
  ) {
    throw new Error('Resource envelope model must retain the R6 and R8 binding.');
  }
  const candidate = qualification.candidates.find((item) => item.modelId === modelId);
  if (
    !candidate ||
    !candidate.qualityPassed ||
    candidate.modelDigest !== priorEvaluation.candidateEvaluation.model.digest ||
    candidate.evidenceHash !== qualification.selection.candidateEvidenceHash
  ) {
    throw new Error('Resource envelope model evidence does not match qualification.');
  }
  return candidate;
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
