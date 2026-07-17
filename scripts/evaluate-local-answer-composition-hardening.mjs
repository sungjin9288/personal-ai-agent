import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalAnswerCompositionHardening,
  buildLocalAnswerCompositionHardening,
} from '../src/core/local-answer-composition-hardening.mjs';
import {
  assertLocalAnswerCompositionRobustness,
  summarizeAnswerCompositionRobustnessEvaluation,
} from '../src/core/local-answer-composition-robustness.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createHardenedEvidenceFirstOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';
import {
  evaluateLocalAnswerCompositionRobustnessSuite,
  loadLocalAnswerCompositionRobustnessSuite,
} from './local-answer-composition-robustness-suite.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const { caseInputs, suite } = loadLocalAnswerCompositionRobustnessSuite({ repoDir });
const baselinePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-answer-composition-robustness.json',
);
const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
assertLocalAnswerCompositionRobustness(baseline);

const observedAt = new Date().toISOString();
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
  throw new Error('Local answer composition hardening model drifted from the robustness baseline.');
}

const generator = createHardenedEvidenceFirstOllamaAnswerGenerator({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const { answerQualityEvaluation, observations } =
  await evaluateLocalAnswerCompositionRobustnessSuite({
    caseInputs,
    generator,
    mode: 'Local answer composition hardening',
    thresholds: suite.thresholds,
  });
const evaluation = summarizeAnswerCompositionRobustnessEvaluation(answerQualityEvaluation);
const evidence = buildLocalAnswerCompositionHardening({
  baseline,
  evaluation,
  model: {
    digest: inventoryModel.digest,
    id: options.model,
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
  suite,
});
assertLocalAnswerCompositionHardening(evidence);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(
  JSON.stringify(
    {
      actualModelEvaluated: evidence.actualModelEvaluated,
      actualModelTrainingExecuted: evidence.actualModelTrainingExecuted,
      candidateHardeningValidated: evidence.candidateHardeningValidated,
      caseResults: evidence.evaluation.caseResults,
      comparison: evidence.comparison,
      currentAnswerPathChanged: evidence.currentAnswerPathChanged,
      decision: evidence.decision,
      evidenceHash: evidence.evidenceHash,
      externalProviderCalls: evidence.externalProviderCalls,
      mode: 'local-answer-composition-hardening',
      modelId: evidence.model.id,
      ok: true,
      outputPath: options.outputPath
        ? path.relative(repoDir, options.outputPath).split(path.sep).join('/')
        : null,
      productionReadyClaim: evidence.productionReadyClaim,
      scenarioResults: evidence.scenarioResults,
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
      throw new Error('Expected unique local answer composition hardening command options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = String(values.get('--endpoint') || '').trim();
  const model = String(values.get('--model') || '').trim();
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || !cloudFeaturesDisabled) {
    throw new Error(
      'Local answer composition hardening requires endpoint, model, and cloud-disabled proof.',
    );
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Local answer composition hardening timeout must be a positive integer.');
  }
  const outputValue = String(values.get('--output') || '').trim();
  const outputPath = outputValue ? path.resolve(repoDir, outputValue) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Local answer composition hardening output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}
