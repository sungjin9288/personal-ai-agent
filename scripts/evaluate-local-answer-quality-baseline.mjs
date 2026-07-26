import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  buildCandidateModelEvidence,
  evaluateCandidateModelGate,
} from '../src/core/candidate-model-evaluation.mjs';
import {
  assertLocalAnswerQualityBaseline,
  buildLocalAnswerQualityBaseline,
} from '../src/core/local-answer-quality-baseline.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildLocalTrainingReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const fixturePath = path.join(repoDir, 'fixtures', 'answer-quality-cases-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const fixtureHash = sha256(fixtureText);
const observedAt = new Date().toISOString();
const readinessPackage = buildLocalTrainingReadinessFixture({ repoDir });

const runtimeVersion = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/version',
});
const inventory = await requestLoopbackJson({
  endpoint: options.endpoint,
  pathname: '/api/tags',
});
const inventoryModel = inventory.models?.find(
  (candidate) => candidate.name === options.model || candidate.model === options.model,
);
if (!inventoryModel) {
  throw new Error(`Local Ollama model is not installed: ${options.model}.`);
}
const modelInfo = await requestLoopbackJson({
  body: { model: options.model },
  endpoint: options.endpoint,
  pathname: '/api/show',
});
const licenseText = extractLicenseText(modelInfo);
if (!licenseText) {
  throw new Error('Local answer quality evaluation requires model license evidence.');
}

const generator = createOllamaAnswerGenerator({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const candidateCases = [];
const observations = [];
for (const definition of fixture.cases) {
  const retrievedItems = buildRetrievalContext(definition.retrievalInput);
  const generated = await generator.generate({
    objective: definition.retrievalInput.mission.objective,
    retrievedItems,
  });
  candidateCases.push({
    ...definition,
    answer: generated.answer,
    retrievedItems,
  });
  observations.push({
    ...generated.observation,
    caseId: definition.id,
    citedSourceKeys: generated.answer.citedSourceKeys,
  });
}

const candidateEvaluation = evaluateAnswerQualitySuite({
  cases: candidateCases,
  thresholds: fixture.thresholds,
});
const evaluationRunId = `local-answer-quality-${sha256([
  inventoryModel.digest,
  fixtureHash,
  observedAt,
].join(':')).slice(0, 24)}`;
const candidateEvidence = buildCandidateModelEvidence({
  actualModelEvaluated: true,
  candidateEvaluation,
  candidateId: `local-base-model-${options.model}`,
  evaluatedAt: observedAt,
  evaluationRunId,
  evaluationSource: 'recorded-model-evaluation',
  evidenceRefs: [
    `fixture:${fixtureHash}`,
    `ollama-model:${inventoryModel.digest}`,
  ],
  modelId: options.model,
  provider: 'local-ollama',
  readinessPackage,
});
const candidateGate = evaluateCandidateModelGate({
  candidateEvaluation,
  candidateEvidence,
  readinessPackage,
});
const baseline = buildLocalAnswerQualityBaseline({
  candidateGate,
  model: {
    digest: inventoryModel.digest,
    id: options.model,
    license: {
      textHash: sha256(licenseText),
      title: licenseText.split('\n').map((line) => line.trim()).find(Boolean),
    },
    modifiedAt: inventoryModel.modified_at || modelInfo.modified_at,
    sizeBytes: inventoryModel.size,
  },
  observations,
  observedAt,
  runtime: {
    cloudFeaturesDisabled: options.cloudFeaturesDisabled,
    endpointAlias: 'loopback-ollama',
    kind: 'ollama',
    transportLoopback: true,
    version: runtimeVersion.version,
  },
  suite: {
    caseIds: fixture.cases.map((definition) => definition.id),
    fixtureHash,
    id: fixture.schemaVersion,
    thresholds: fixture.thresholds,
  },
});
assertLocalAnswerQualityBaseline(baseline);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      actualLocalAnswerModelQualified: baseline.actualLocalAnswerModelQualified,
      actualLocalAnswerModelQualityValidated: baseline.actualLocalAnswerModelQualityValidated,
      actualModelEvaluated: baseline.actualModelEvaluated,
      actualModelTrainingExecuted: baseline.actualModelTrainingExecuted,
      caseResults: baseline.candidateGate.candidate.evaluation.caseResults,
      decision: baseline.decision,
      evidenceHash: baseline.evidenceHash,
      externalProviderCalls: baseline.externalProviderCalls,
      mode: 'local-answer-quality-baseline',
      modelId: baseline.model.id,
      ok: true,
      outputPath: options.outputPath
        ? path.relative(repoDir, options.outputPath).split(path.sep).join('/')
        : null,
      productionReadyClaim: baseline.productionReadyClaim,
      status: baseline.status,
    },
    null,
    2,
  ),
);

function parseOptions(args) {
  const allowed = new Set(['--endpoint', '--model', '--output', '--timeout-ms']);
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
    if (!allowed.has(key) || value === undefined || values.has(key)) {
      throw new Error('Expected unique local answer quality command options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || !cloudFeaturesDisabled) {
    throw new Error('Local answer quality evaluation requires endpoint, model, and cloud-disabled proof.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Local answer quality timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Local answer quality output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}

function extractLicenseText(modelInfo) {
  const directLicense = String(modelInfo.license || '').trim();
  if (directLicense) {
    return directLicense;
  }
  return String(modelInfo.modelfile || '').match(/LICENSE\s+"""([\s\S]*?)"""/)?.[1]?.trim() || '';
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
