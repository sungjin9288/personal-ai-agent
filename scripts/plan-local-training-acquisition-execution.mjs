import fs from 'node:fs';
import path from 'node:path';

import {
  assertLocalTrainingAcquisitionRequest,
  buildLocalTrainingAcquisitionPlan,
} from '../src/core/local-training-acquisition-approval.mjs';

const MAX_JSON_BYTES = 64 * 1024;
const RESOLUTION_FIELDS = [
  'acquisitionAuthorized',
  'actualDependencyInstallationPerformed',
  'actualModelDownloadPerformed',
  'actualModelTrainingExecuted',
  'approvalHash',
  'decision',
  'expiresAt',
  'externalProviderCalls',
  'externalSubmissionAuthorized',
  'id',
  'mutableRoot',
  'networkPolicy',
  'owners',
  'productionReadyClaim',
  'reasonHash',
  'request',
  'requestedActions',
  'resolvedAt',
  'resolvedBy',
  'resourceEnvelope',
  'rolloutAuthorized',
  'schemaVersion',
  'status',
  'toolchainDecision',
  'trainingAuthorized',
];
const repoDir = fs.realpathSync(process.cwd());
const resolutionPath = parseResolutionPath(process.argv.slice(2));
const request = readBoundedJson(path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-acquisition-request.json',
));
const toolchainDecision = readBoundedJson(path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-toolchain-decision.json',
));
const resolution = readBoundedJson(resolutionPath);

requireExactKeys(resolution, RESOLUTION_FIELDS, 'resolution');
requireExactKeys(
  resolution.request,
  ['id', 'requestHash'],
  'resolution request',
);
assertLocalTrainingAcquisitionRequest(request, toolchainDecision);
if (
  resolution.request.id !== request.id ||
  resolution.request.requestHash !== request.requestHash
) {
  throw new Error(
    'Local training acquisition resolution does not match the current request.',
  );
}

const plan = buildLocalTrainingAcquisitionPlan({
  approval: resolution,
  decision: toolchainDecision,
  now: new Date().toISOString(),
});
const outputDir = prepareOutputDirectory();
const outputPath = path.join(outputDir, `${resolution.id}.json`);
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(plan, null, 2)}\n`,
  {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  },
);

console.log(JSON.stringify({
  acquisitionAuthorized: plan.acquisitionAuthorized,
  actualDependencyInstallationPerformed:
    plan.actualDependencyInstallationPerformed,
  actualModelDownloadPerformed: plan.actualModelDownloadPerformed,
  actualModelTrainingExecuted: plan.actualModelTrainingExecuted,
  approvalId: plan.approval.id,
  externalProviderCalls: plan.externalProviderCalls,
  mode: 'local-training-acquisition-execution-plan',
  ok: true,
  outputPath: toRepoRelativePath(outputPath),
  productionReadyClaim: plan.productionReadyClaim,
  rolloutAuthorized: plan.rolloutAuthorized,
  status: plan.status,
  stepCount: plan.steps.length,
  trainingAuthorized: plan.trainingAuthorized,
}, null, 2));

function parseResolutionPath(args) {
  if (
    args.length !== 2 ||
    args[0] !== '--resolution' ||
    !normalize(args[1])
  ) {
    throw new Error(
      'Expected --resolution <private-json-path>.',
    );
  }
  const filename = path.resolve(repoDir, args[1]);
  const stat = fs.lstatSync(filename);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES
  ) {
    throw new Error(
      'Local training acquisition resolution must be a bounded regular file.',
    );
  }
  const canonicalPath = fs.realpathSync(filename);
  const varDir = path.join(repoDir, 'var');
  if (
    isPathWithin(repoDir, canonicalPath) &&
    !isPathWithin(varDir, canonicalPath)
  ) {
    throw new Error(
      'Local training acquisition resolution must remain private under var/ or outside the repository.',
    );
  }
  return canonicalPath;
}

function readBoundedJson(filename) {
  const stat = fs.lstatSync(filename);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size <= 0 ||
    stat.size > MAX_JSON_BYTES
  ) {
    throw new Error(
      'Local training acquisition planning input must be a bounded regular file.',
    );
  }
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function prepareOutputDirectory() {
  const segments = ['var', 'local-training', 'acquisition-plans'];
  let current = repoDir;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (fs.existsSync(current)) {
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error(
          'Local training acquisition plan directory must not contain symbolic links.',
        );
      }
      continue;
    }
    fs.mkdirSync(current, { mode: 0o700 });
  }
  const canonicalOutputDir = fs.realpathSync(current);
  if (!isPathWithin(path.join(repoDir, 'var'), canonicalOutputDir)) {
    throw new Error(
      'Local training acquisition plan directory escaped var/.',
    );
  }
  return canonicalOutputDir;
}

function requireExactKeys(value, expectedKeys, fieldName) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !==
      JSON.stringify([...expectedKeys].sort())
  ) {
    throw new Error(
      `Local training acquisition ${fieldName} fields are invalid.`,
    );
  }
}

function isPathWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' ||
    (
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    );
}

function toRepoRelativePath(filename) {
  return path.relative(repoDir, filename).split(path.sep).join('/');
}

function normalize(value) {
  return String(value || '').trim();
}
