import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLocalCommandEmbeddingAdapter } from '../src/core/embedding-adapter.mjs';
import {
  assertLocalEmbeddingModelQualification,
  buildLocalEmbeddingModelQualification,
} from '../src/core/local-embedding-model-qualification.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import {
  DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS,
  evaluateRetrievalQualitySuite,
} from '../src/core/retrieval-quality-evaluation.mjs';
import {
  buildSemanticCorpusRecords,
  runSemanticRetrievalExperiment,
} from '../src/core/semantic-retrieval.mjs';

const repoDir = process.cwd();
const wrapperPath = fileURLToPath(new URL('./ollama-embedding-command.mjs', import.meta.url));
const ALLOWED_OPTIONS = new Set(['--endpoint', '--models', '--output', '--timeout-ms']);
const options = parseOptions(process.argv.slice(2));
const fixturePath = path.join(repoDir, 'fixtures', 'semantic-retrieval-cases-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const runtimeVersion = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/version',
});
const inventory = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/tags',
});
const candidates = [];

for (const modelId of options.models) {
  const inventoryModel = inventory.models?.find((model) => model.name === modelId);
  if (!inventoryModel) {
    throw new Error(`Local Ollama model is not installed: ${modelId}.`);
  }
  const modelInfo = await requestLoopbackJson({
    body: { model: modelId },
    endpoint: options.endpoint,
    pathname: '/api/show',
  });
  const adapter = createLocalCommandEmbeddingAdapter({
    args: [
      wrapperPath,
      '--endpoint',
      options.endpoint,
      '--model',
      modelId,
      '--timeout-ms',
      String(options.timeoutMs),
    ],
    command: process.execPath,
    timeoutMs: options.timeoutMs + 5_000,
  });
  const cases = [];
  let dimensions = 0;
  const startedAt = performance.now();
  for (const definition of fixture.cases) {
    const semantic = await runSemanticRetrievalExperiment({
      adapter,
      allowedScopes: definition.allowedScopes,
      corpusRecords: buildSemanticCorpusRecords(definition.retrievalInput),
      k: definition.k,
      queryText: definition.queryText,
    });
    dimensions = semantic.embedding.dimensions;
    cases.push({
      ...definition,
      retrievedItems: semantic.retrievedItems,
    });
  }
  const durationMs = Number((performance.now() - startedAt).toFixed(3));
  const qualityEvaluation = evaluateRetrievalQualitySuite({
    algorithmId: `ollama-local:${modelId}`,
    cases,
    thresholds: DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS,
  });
  const licenseText = extractLicenseText(modelInfo);
  candidates.push({
    actualModelEvaluated: true,
    dimensions,
    durationMs,
    license: {
      evidenceSource: licenseText ? 'ollama-modelfile-metadata' : null,
      textHash: licenseText ? hashValue(licenseText) : null,
      title: licenseText.split('\n').map((line) => line.trim()).find(Boolean) || null,
    },
    modelDigest: inventoryModel.digest,
    modelFamily: inventoryModel.details?.family,
    modelFormat: inventoryModel.details?.format,
    modelId,
    modelModifiedAt: inventoryModel.modified_at || modelInfo.modified_at,
    modelSizeBytes: inventoryModel.size,
    parameterSize: inventoryModel.details?.parameter_size,
    qualityEvaluation,
    quantization: inventoryModel.details?.quantization_level,
    source: 'local-ollama-runtime-observation',
  });
}

const qualification = buildLocalEmbeddingModelQualification({
  candidates,
  governance: {
    licenseReview: { status: 'pending' },
    networkIsolation: {
      egressDisabled: false,
      status: 'pending',
    },
    resourceReview: { status: 'pending' },
    rollbackOwner: null,
  },
  observedAt: new Date().toISOString(),
  runtime: {
    cloudFeaturesDisabled: options.cloudFeaturesDisabled,
    endpointAlias: 'loopback-ollama',
    kind: 'ollama',
    transportLoopback: true,
    version: runtimeVersion.version,
  },
  suite: {
    caseIds: fixture.cases.map((definition) => definition.id),
    fixtureHash: hashValue(fixtureText),
    id: fixture.schemaVersion,
    thresholds: DEFAULT_RETRIEVAL_QUALITY_THRESHOLDS,
  },
});
assertLocalEmbeddingModelQualification(qualification);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(qualification, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      activationAuthorized: qualification.activation.authorized,
      actualLocalEmbeddingModelQualified: qualification.actualLocalEmbeddingModelQualified,
      actualLocalEmbeddingModelQualityValidated:
        qualification.actualLocalEmbeddingModelQualityValidated,
      candidateCount: qualification.candidates.length,
      candidateResults: qualification.candidates.map((candidate) => ({
        dimensions: candidate.dimensions,
        durationMs: candidate.durationMs,
        metrics: candidate.quality.metrics,
        modelId: candidate.modelId,
        qualityPassed: candidate.qualityPassed,
      })),
      costFree: qualification.costFree,
      decision: qualification.decision,
      mode: 'local-embedding-model-qualification',
      ok: true,
      outputPath: options.outputPath ? path.relative(repoDir, options.outputPath) : null,
      productionReadyClaim: qualification.productionReadyClaim,
      selectedModelId: qualification.selection.modelId,
      status: qualification.status,
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
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!ALLOWED_OPTIONS.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique qualification command options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const models = String(values.get('--models') || '')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || models.length === 0 || new Set(models).size !== models.length) {
    throw new Error('Qualification requires a loopback endpoint and unique model list.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Qualification timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Qualification output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, models, outputPath, timeoutMs };
}

function extractLicenseText(modelInfo) {
  const directLicense = String(modelInfo.license || '').trim();
  if (directLicense) {
    return directLicense;
  }
  return String(modelInfo.modelfile || '').match(/LICENSE\s+"""([\s\S]*?)"""/)?.[1]?.trim() || '';
}

function hashValue(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
