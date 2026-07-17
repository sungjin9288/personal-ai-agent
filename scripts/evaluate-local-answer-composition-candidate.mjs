import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { evaluateAnswerQualitySuite } from '../src/core/answer-quality-evaluation.mjs';
import {
  buildCandidateModelEvidence,
  evaluateCandidateModelGate,
} from '../src/core/candidate-model-evaluation.mjs';
import {
  assertLocalAnswerCompositionCandidate,
  buildLocalAnswerCompositionCandidate,
} from '../src/core/local-answer-composition-candidate.mjs';
import { assertLocalAnswerQualityBaseline } from '../src/core/local-answer-quality-baseline.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createEvidenceFirstOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';
import { buildRetrievalContext } from '../src/core/retrieval-service.mjs';
import { buildLocalTrainingReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const fixturePath = path.join(repoDir, 'fixtures', 'answer-quality-cases-v1.json');
const fixtureText = fs.readFileSync(fixturePath, 'utf8');
const fixture = JSON.parse(fixtureText);
const fixtureHash = sha256(fixtureText);
const baselinePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-answer-quality-baseline.json',
);
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
assertLocalAnswerQualityBaseline(baseline);
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
if (
  options.model !== baseline.model.id ||
  inventoryModel.digest !== baseline.model.digest ||
  inventoryModel.size !== baseline.model.sizeBytes
) {
  throw new Error('Local answer composition model inventory drifted from the recorded baseline.');
}

const generator = createEvidenceFirstOllamaAnswerGenerator({
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
    claimCount: generated.composition.claimCount,
    reviewActionPresent: generated.composition.reviewActionPresent,
    sourceCoverageComplete: generated.composition.sourceCoverageComplete,
  });
}

const candidateEvaluation = evaluateAnswerQualitySuite({
  cases: candidateCases,
  thresholds: fixture.thresholds,
});
const evaluationRunId = `local-answer-composition-${sha256([
  inventoryModel.digest,
  fixtureHash,
  generator.promptHash,
  observedAt,
].join(':')).slice(0, 24)}`;
const candidateEvidence = buildCandidateModelEvidence({
  actualModelEvaluated: true,
  candidateEvaluation,
  candidateId: `local-answer-composition-${options.model}`,
  evaluatedAt: observedAt,
  evaluationRunId,
  evaluationSource: 'recorded-model-evaluation',
  evidenceRefs: [
    `baseline:${baseline.evidenceHash}`,
    `fixture:${fixtureHash}`,
    `ollama-model:${inventoryModel.digest}`,
    `prompt:${generator.promptHash}`,
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
const evidence = buildLocalAnswerCompositionCandidate({
  baseline,
  candidateGate,
  observations,
  observedAt,
  runtime: {
    cloudFeaturesDisabled: options.cloudFeaturesDisabled,
    endpointAlias: 'loopback-ollama',
    kind: 'ollama',
    transportLoopback: true,
    version: runtimeVersion.version,
  },
});
assertLocalAnswerCompositionCandidate(evidence);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      actualModelEvaluated: evidence.actualModelEvaluated,
      actualModelTrainingExecuted: evidence.actualModelTrainingExecuted,
      candidateQualityValidated: evidence.candidateQualityValidated,
      caseResults: evidence.candidateGate.candidate.evaluation.caseResults,
      comparison: evidence.comparison,
      currentAnswerPathChanged: evidence.currentAnswerPathChanged,
      decision: evidence.decision,
      evidenceHash: evidence.evidenceHash,
      externalProviderCalls: evidence.externalProviderCalls,
      mode: 'local-answer-composition-candidate',
      modelId: baseline.model.id,
      ok: true,
      outputPath: options.outputPath
        ? path.relative(repoDir, options.outputPath).split(path.sep).join('/')
        : null,
      productionReadyClaim: evidence.productionReadyClaim,
      status: evidence.status,
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
      throw new Error('Expected unique local answer composition command options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || !cloudFeaturesDisabled) {
    throw new Error('Local answer composition evaluation requires endpoint, model, and cloud-disabled proof.');
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Local answer composition timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Local answer composition output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}
