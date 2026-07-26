import fs from 'node:fs';
import path from 'node:path';

import { assertAnswerInputBoundaryEvaluation } from '../src/core/answer-input-boundary-evaluation.mjs';
import {
  assertLocalAnswerCompositionBoundaryRegression,
  buildLocalAnswerCompositionBoundaryRegression,
} from '../src/core/local-answer-composition-boundary-regression.mjs';
import { assertLocalAnswerCompositionHardening } from '../src/core/local-answer-composition-hardening.mjs';
import { summarizeAnswerCompositionRobustnessEvaluation } from '../src/core/local-answer-composition-robustness.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import { createAdversarialHardenedOllamaAnswerGenerator } from '../src/core/ollama-answer-generator.mjs';
import {
  evaluateLocalAnswerCompositionRobustnessSuite,
  loadLocalAnswerCompositionRobustnessSuite,
} from './local-answer-composition-robustness-suite.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const baseline = readEvidence('local-answer-composition-hardening.json');
const boundaryEvaluation = readEvidence('answer-input-boundary-evaluation.json');
assertLocalAnswerCompositionHardening(baseline);
assertAnswerInputBoundaryEvaluation(boundaryEvaluation);
const { caseInputs, suite } = loadLocalAnswerCompositionRobustnessSuite({ repoDir });
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
  throw new Error('Answer boundary regression model drifted from the Q4 baseline.');
}

const generator = createAdversarialHardenedOllamaAnswerGenerator({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const { answerQualityEvaluation, observations } =
  await evaluateLocalAnswerCompositionRobustnessSuite({
    caseInputs,
    generator,
    mode: 'Local answer composition boundary regression',
    thresholds: suite.thresholds,
  });
const evidence = buildLocalAnswerCompositionBoundaryRegression({
  baseline,
  boundaryEvaluation,
  evaluation: summarizeAnswerCompositionRobustnessEvaluation(answerQualityEvaluation),
  model: {
    digest: inventoryModel.digest,
    id: options.model,
    sizeBytes: inventoryModel.size,
  },
  observations,
  observedAt: new Date().toISOString(),
  runtime: {
    cloudFeaturesDisabled: options.cloudFeaturesDisabled,
    endpointAlias: 'loopback-ollama',
    kind: 'ollama',
    transportLoopback: true,
    version: runtimeVersion.version,
  },
  suite,
});
assertLocalAnswerCompositionBoundaryRegression(evidence);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  fs.writeFileSync(options.outputPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
}

console.log(JSON.stringify({
  actualModelEvaluated: evidence.actualModelEvaluated,
  actualUserQueryData: evidence.actualUserQueryData,
  adversarialBoundaryValidated: evidence.adversarialBoundaryValidated,
  candidateBoundaryRegressionValidated: evidence.candidateBoundaryRegressionValidated,
  casePassRate: evidence.evaluation.metrics.casePassRate,
  currentAnswerPathChanged: evidence.currentAnswerPathChanged,
  decision: evidence.decision,
  evidenceHash: evidence.evidenceHash,
  mode: 'local-answer-composition-boundary-regression',
  modelId: evidence.model.id,
  ok: evidence.candidateBoundaryRegressionValidated,
  outputPath: options.outputPath
    ? path.relative(repoDir, options.outputPath).split(path.sep).join('/')
    : null,
  productionReadyClaim: evidence.productionReadyClaim,
  status: evidence.status,
}, null, 2));

function readEvidence(filename) {
  return JSON.parse(fs.readFileSync(
    path.join(repoDir, 'evidence', 'output-artifacts', filename),
    'utf8',
  ));
}

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
      throw new Error('Expected unique answer boundary regression command options.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = normalize(values.get('--endpoint'));
  const model = normalize(values.get('--model'));
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || !cloudFeaturesDisabled) {
    throw new Error(
      'Answer boundary regression requires endpoint, model, and cloud-disabled proof.',
    );
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Answer boundary regression timeout must be a positive integer.');
  }
  const output = normalize(values.get('--output'));
  const outputPath = output ? path.resolve(repoDir, output) : null;
  if (outputPath && outputPath !== repoDir && !outputPath.startsWith(`${repoDir}${path.sep}`)) {
    throw new Error('Answer boundary regression output must stay inside the repository.');
  }
  return { cloudFeaturesDisabled, endpoint, model, outputPath, timeoutMs };
}

function normalize(value) {
  return String(value || '').trim();
}
