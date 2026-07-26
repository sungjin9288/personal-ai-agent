import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalAnswerCompositionBoundaryRegression,
} from '../src/core/local-answer-composition-boundary-regression.mjs';
import {
  assertLocalAnswerReviewActionGeneralization,
  buildLocalAnswerReviewActionGeneralization,
} from '../src/core/local-answer-review-action-generalization.mjs';
import {
  summarizeAnswerCompositionRobustnessEvaluation,
} from '../src/core/local-answer-composition-robustness.mjs';
import {
  summarizeLocalUserQueryEvaluation,
} from '../src/core/local-user-query-quality.mjs';
import { assertLocalUserQueryQuality } from '../src/core/local-user-query-quality.mjs';
import { requestLoopbackJson } from '../src/core/loopback-json-client.mjs';
import {
  createReviewActionGeneralizedOllamaAnswerGenerator,
} from '../src/core/ollama-answer-generator.mjs';
import {
  evaluateLocalAnswerCompositionRobustnessSuite,
  loadLocalAnswerCompositionRobustnessSuite,
} from './local-answer-composition-robustness-suite.mjs';
import {
  assertLocalUserQueryEvaluationAuthorization,
  evaluateLocalUserQuerySuite,
  loadLocalUserQueryEvaluationSuite,
} from './local-user-query-evaluation-suite.mjs';

const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const q4Baseline = readEvidence(
  'local-answer-composition-boundary-regression.json',
);
const q6Baseline = readEvidence('local-user-query-quality.json');
assertLocalAnswerCompositionBoundaryRegression(q4Baseline);
assertLocalUserQueryQuality(q6Baseline);

const { caseInputs: q4CaseInputs, suite: q4Suite } =
  loadLocalAnswerCompositionRobustnessSuite({ repoDir });
const {
  caseInputs: q6CaseInputs,
  intake,
  suite: q6Suite,
} = loadLocalUserQueryEvaluationSuite({
  datasetPath: options.datasetPath,
  intakePath: options.intakePath,
});
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
  (candidate) =>
    candidate.name === options.model || candidate.model === options.model,
);
if (!inventoryModel) {
  throw new Error(`Local Ollama model is not installed: ${options.model}.`);
}
if (
  options.model !== q4Baseline.model.id ||
  inventoryModel.digest !== q4Baseline.model.digest ||
  inventoryModel.size !== q4Baseline.model.sizeBytes ||
  options.model !== q6Baseline.model.id ||
  inventoryModel.digest !== q6Baseline.model.digest ||
  inventoryModel.size !== q6Baseline.model.sizeBytes
) {
  throw new Error(
    'Review action generalization model drifted from the Q4 or Q6 baseline.',
  );
}

const generator = createReviewActionGeneralizedOllamaAnswerGenerator({
  endpoint: options.endpoint,
  model: options.model,
  timeoutMs: options.timeoutMs,
});
const {
  answerQualityEvaluation: q4AnswerQualityEvaluation,
  observations: q4Observations,
} = await evaluateLocalAnswerCompositionRobustnessSuite({
  caseInputs: q4CaseInputs,
  generator,
  mode: 'Review action generalization Q4 regression',
  thresholds: q4Suite.thresholds,
});
const {
  answerQualityEvaluation: q6AnswerQualityEvaluation,
  observations: q6Observations,
} = await evaluateLocalUserQuerySuite({
  authorizeCase: () => assertLocalUserQueryEvaluationAuthorization({
    intake,
    observedAt: new Date().toISOString(),
  }),
  caseInputs: q6CaseInputs,
  generator,
  thresholds: q6Suite.thresholds,
});
const observedAt = new Date().toISOString();
assertLocalUserQueryEvaluationAuthorization({ intake, observedAt });

const evidence = buildLocalAnswerReviewActionGeneralization({
  model: {
    digest: inventoryModel.digest,
    id: options.model,
    sizeBytes: inventoryModel.size,
  },
  observedAt,
  q4Baseline,
  q4Evaluation: summarizeAnswerCompositionRobustnessEvaluation(
    q4AnswerQualityEvaluation,
  ),
  q4Observations,
  q4Suite,
  q6Baseline,
  q6Evaluation: summarizeLocalUserQueryEvaluation({
    evaluation: q6AnswerQualityEvaluation,
    suite: q6Suite,
  }),
  q6Observations,
  q6Suite,
  runtime: {
    cloudFeaturesDisabled: options.cloudFeaturesDisabled,
    endpointAlias: 'loopback-ollama',
    kind: 'ollama',
    transportLoopback: true,
    version: runtimeVersion.version,
  },
});
assertLocalAnswerReviewActionGeneralization(evidence);

if (options.outputPath) {
  fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
  const existing = fs.existsSync(options.outputPath)
    ? fs.lstatSync(options.outputPath)
    : null;
  if (existing?.isSymbolicLink() || (existing && !existing.isFile())) {
    throw new Error(
      'Review action generalization output must be a regular file.',
    );
  }
  fs.writeFileSync(
    options.outputPath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    'utf8',
  );
}

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  currentAnswerPathChanged: evidence.currentAnswerPathChanged,
  decision: evidence.decision,
  evidenceHash: evidence.evidenceHash,
  mode: 'local-answer-review-action-generalization',
  modelId: evidence.model.id,
  ok: evidence.reviewActionGeneralizationValidated,
  outputPath: options.outputPath
    ? path.relative(repoDir, options.outputPath).split(path.sep).join('/')
    : null,
  productionReadyClaim: evidence.productionReadyClaim,
  q4CaseCount: evidence.candidate.q4.caseCount,
  q4CasePassRate: evidence.candidate.q4.evaluation.metrics.casePassRate,
  q6CaseCount: evidence.candidate.q6.caseCount,
  q6CasePassRate: evidence.candidate.q6.evaluation.metrics.casePassRate,
  status: evidence.status,
}, null, 2));

function readEvidence(filename) {
  return JSON.parse(fs.readFileSync(
    path.join(repoDir, 'evidence', 'output-artifacts', filename),
    'utf8',
  ));
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
        throw new Error(
          'Review action generalization options must be unique.',
        );
      }
      cloudFeaturesDisabled = true;
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!allowed.has(key) || value === undefined || values.has(key)) {
      throw new Error(
        'Review action generalization options must be unique and complete.',
      );
    }
    values.set(key, value);
    index += 2;
  }

  const endpoint = normalize(values.get('--endpoint'));
  const model = normalize(values.get('--model'));
  const timeoutMs = Number(values.get('--timeout-ms') || 120_000);
  if (!endpoint || !model || !cloudFeaturesDisabled) {
    throw new Error(
      'Review action generalization requires endpoint, model, and cloud-disabled proof.',
    );
  }
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(
      'Review action generalization timeout must be a positive integer.',
    );
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
  if (
    outputPath &&
    outputPath !== repoDir &&
    !outputPath.startsWith(`${repoDir}${path.sep}`)
  ) {
    throw new Error(
      'Review action generalization output must stay inside the repository.',
    );
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
