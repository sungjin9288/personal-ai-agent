import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalUserQueryQuality,
  buildLocalUserQueryQuality,
  summarizeLocalUserQueryEvaluation,
} from '../src/core/local-user-query-quality.mjs';
import { assertLocalAnswerCompositionBoundaryRegression } from '../src/core/local-answer-composition-boundary-regression.mjs';
import {
  assertLocalAnswerReviewActionGeneralization,
} from '../src/core/local-answer-review-action-generalization.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import {
  createAdversarialHardenedOllamaAnswerGenerator,
  createReviewActionGeneralizedOllamaAnswerGenerator,
} from '../src/core/ollama-answer-generator.mjs';
import {
  assertLocalUserQueryEvaluationAuthorization,
  evaluateLocalUserQuerySuite,
  loadLocalUserQueryEvaluationSuite,
} from './local-user-query-evaluation-suite.mjs';
import {
  assertPrivateActualEvaluationPaths,
  writeEvaluationJson,
} from './private-user-query-evaluation-paths.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));

const { caseInputs, intake, suite } = loadLocalUserQueryEvaluationSuite({
  datasetPath: options.datasetPath,
  intakePath: options.intakePath,
});
const authorizedPaths = assertPrivateActualEvaluationPaths({
  actualUserQueryData: intake.actualUserQueryData,
  errorMessage:
    'Actual user query evaluation requires distinct private dataset, intake, and output paths outside tracked repository content.',
  paths: [
    options.datasetPath,
    options.intakePath,
    options.outputPath,
  ],
  repoDir,
});
const baseline = intake.actualUserQueryData
  ? readEvidence('local-answer-review-action-generalization.json')
  : readEvidence('local-answer-composition-boundary-regression.json');
if (intake.actualUserQueryData) {
  assertLocalAnswerReviewActionGeneralization(baseline);
} else {
  assertLocalAnswerCompositionBoundaryRegression(baseline);
}
assertLocalUserQueryEvaluationAuthorization({
  intake,
  observedAt: new Date().toISOString(),
});
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
  throw new Error('Local user query quality model drifted from the Q4 baseline.');
}

const createGenerator = intake.actualUserQueryData
  ? createReviewActionGeneralizedOllamaAnswerGenerator
  : createAdversarialHardenedOllamaAnswerGenerator;
const generator = createGenerator({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const { answerQualityEvaluation, observations } = await evaluateLocalUserQuerySuite({
  authorizeCase: () => readCurrentAuthorizedIntake({
    expectedEvidenceHash: intake.evidenceHash,
    options,
  }),
  caseInputs,
  generator,
  thresholds: suite.thresholds,
});
const observedAt = new Date().toISOString();
readCurrentAuthorizedIntake({
  expectedEvidenceHash: intake.evidenceHash,
  observedAt,
  options,
});
const evidence = buildLocalUserQueryQuality({
  baseline,
  evaluation: summarizeLocalUserQueryEvaluation({
    evaluation: answerQualityEvaluation,
    suite,
  }),
  intake,
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
assertLocalUserQueryQuality(evidence);

if (options.outputPath) {
  writeEvaluationJson({
    actualUserQueryData: evidence.actualUserQueryData,
    authorizedPath: authorizedPaths[2],
    filename: options.outputPath,
    outputErrorMessage:
      'Local user query quality output must be a regular file.',
    value: evidence,
  });
}

console.log(JSON.stringify({
  actualModelEvaluated: evidence.actualModelEvaluated,
  actualUserQueryData: evidence.actualUserQueryData,
  actualUserQueryQualityValidated: evidence.actualUserQueryQualityValidated,
  caseCount: evidence.evaluation.caseResults.length,
  casePassRate: evidence.evaluation.metrics.casePassRate,
  currentAnswerPathChanged: evidence.currentAnswerPathChanged,
  decision: evidence.decision,
  evidenceHash: evidence.evidenceHash,
  mode: 'local-user-query-quality',
  modelId: evidence.model.id,
  ok: evidence.localUserQueryEvaluationValidated,
  outputPath: options.outputPath
    ? path.relative(repoDir, options.outputPath).split(path.sep).join('/')
    : null,
  promptVersion: evidence.prompt.version,
  productionReadyClaim: evidence.productionReadyClaim,
  status: evidence.status,
}, null, 2));

function readEvidence(filename) {
  return JSON.parse(fs.readFileSync(
    path.join(repoDir, 'evidence', 'output-artifacts', filename),
    'utf8',
  ));
}

function readCurrentAuthorizedIntake({
  expectedEvidenceHash,
  observedAt = new Date().toISOString(),
  options,
}) {
  const { intake: currentIntake } = loadLocalUserQueryEvaluationSuite({
    datasetPath: options.datasetPath,
    intakePath: options.intakePath,
  });
  if (currentIntake.evidenceHash !== expectedEvidenceHash) {
    throw new Error(
      'Local user query evaluation authorization changed during execution.',
    );
  }
  return assertLocalUserQueryEvaluationAuthorization({
    intake: currentIntake,
    observedAt,
  });
}

function parseOptions(args) {
  const allowed = new Set([
    '--dataset',
    '--endpoint',
    '--intake',
    '--model',
    '--output',
    '--timeout-ms',
  ]);
  const values = new Map();
  let cloudFeaturesDisabled = false;
  for (let index = 0; index < args.length;) {
    const key = args[index];
    if (key === '--cloud-features-disabled') {
      if (cloudFeaturesDisabled) {
        throw new Error('Local user query quality options must be unique.');
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!allowed.has(key) || value === undefined || values.has(key)) {
      throw new Error('Local user query quality options must be unique and complete.');
    }
    values.set(key, value);
    index += 2;
  }
  const endpoint = normalize(values.get('--endpoint'));
  const model = normalize(values.get('--model'));
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || !cloudFeaturesDisabled) {
    throw new Error(
      'Local user query quality requires endpoint, model, and cloud-disabled proof.',
    );
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Local user query quality timeout must be a positive integer.');
  }
  const datasetPath = path.resolve(
    repoDir,
    normalize(values.get('--dataset')) ||
      'fixtures/user-query-evaluation-intake-dry-run-v1.json',
  );
  const intakePath = path.resolve(
    repoDir,
    normalize(values.get('--intake')) ||
      'evidence/output-artifacts/user-query-evaluation-intake.json',
  );
  const output = normalize(values.get('--output'));
  const outputPath = output ? path.resolve(repoDir, output) : null;
  for (const candidate of [outputPath]) {
    if (candidate && candidate !== repoDir && !candidate.startsWith(`${repoDir}${path.sep}`)) {
      throw new Error('Local user query quality output must stay inside the repository.');
    }
  }
  return {
    cloudFeaturesDisabled,
    datasetPath,
    endpoint,
    intakePath,
    model,
    outputPath,
    timeoutMs,
  };
}

function normalize(value) {
  return String(value || '').trim();
}
