import path from 'node:path';

import {
  assertUserQueryEvaluationIntake,
  buildUserQueryEvaluationIntake,
} from '../src/core/user-query-evaluation-intake.mjs';
import {
  assertPrivateActualEvaluationPaths,
  assertOwnerOnlyActualEvaluationInputs,
  isPathWithin,
  readBoundedEvaluationJson,
  writeEvaluationJson,
} from './private-user-query-evaluation-paths.mjs';

const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const repoDir = process.cwd();
const options = parseOptions(process.argv.slice(2));
const datasetInput = readBoundedEvaluationJson({
  errorMessage:
    'User query evaluation intake dataset must be a bounded regular file.',
  filename: options.datasetPath,
  label: 'intake dataset',
  maxBytes: MAX_INPUT_BYTES,
});
const authorizedPaths = assertPrivateActualDataPaths({
  dataset: datasetInput.value,
  options,
});
const [authorizedDatasetInput] = assertOwnerOnlyActualEvaluationInputs({
  actualUserQueryData: datasetInput.value.actualUserQueryData,
  inputs: [datasetInput],
});
const dataset = authorizedDatasetInput.value;
const evidence = buildUserQueryEvaluationIntake({
  dataset,
  observedAt: new Date().toISOString(),
});
assertUserQueryEvaluationIntake(evidence);

if (options.outputPath) {
  writeEvaluationJson({
    actualUserQueryData: evidence.actualUserQueryData,
    authorizedPath: authorizedPaths[1],
    filename: options.outputPath,
    outputErrorMessage:
      'User query evaluation intake output must be a regular file.',
    value: evidence,
  });
}

console.log(JSON.stringify({
  actualUserQueryData: evidence.actualUserQueryData,
  actualUserQueryQualityValidated: evidence.actualUserQueryQualityValidated,
  dataClassification: evidence.dataClassification,
  domainCount: evidence.coverage.domains.length,
  evidenceHash: evidence.evidenceHash,
  languageCount: evidence.coverage.languages.length,
  mode: 'user-query-evaluation-intake',
  ok: true,
  outputPath: displayPath(options.outputPath),
  recordCount: evidence.records.length,
  status: evidence.status,
}, null, 2));

function parseOptions(args) {
  if (!args.includes('--dataset')) {
    return parseLegacyOptions(args);
  }

  const allowed = new Set(['--dataset', '--output']);
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!allowed.has(key) || value === undefined || values.has(key)) {
      throw new Error(
        'User query evaluation intake options must be unique and complete.',
      );
    }
    values.set(key, value);
  }

  return {
    datasetPath: path.resolve(
      repoDir,
      normalize(values.get('--dataset')) ||
        'fixtures/user-query-evaluation-intake-dry-run-v1.json',
    ),
    outputPath: values.has('--output')
      ? path.resolve(repoDir, normalize(values.get('--output')))
      : null,
  };
}

function parseLegacyOptions(args) {
  if (args.length === 0) {
    return {
      datasetPath: path.resolve(
        repoDir,
        'fixtures/user-query-evaluation-intake-dry-run-v1.json',
      ),
      outputPath: null,
    };
  }
  if (
    args.length !== 2 ||
    args[0] !== '--output' ||
    args[1] !== 'evidence/output-artifacts/user-query-evaluation-intake.json'
  ) {
    throw new Error('Expected the stable user query evaluation intake output path.');
  }
  return {
    datasetPath: path.resolve(
      repoDir,
      'fixtures/user-query-evaluation-intake-dry-run-v1.json',
    ),
    outputPath: path.resolve(repoDir, args[1]),
  };
}

function assertPrivateActualDataPaths({ dataset, options }) {
  return assertPrivateActualEvaluationPaths({
    actualUserQueryData: dataset.actualUserQueryData,
    errorMessage:
      'Actual user query intake requires distinct private dataset and output paths outside tracked repository content.',
    paths: [options.datasetPath, options.outputPath],
    repoDir,
  });
}

function displayPath(filename) {
  if (!filename) {
    return null;
  }
  if (isPathWithin(repoDir, filename)) {
    return path.relative(repoDir, filename).split(path.sep).join('/');
  }
  return `<private>/${path.basename(filename)}`;
}

function normalize(value) {
  return String(value || '').trim();
}
