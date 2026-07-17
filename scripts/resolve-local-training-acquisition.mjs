import fs from 'node:fs';
import path from 'node:path';

import {
  assertApprovedLocalTrainingAcquisition,
  resolveLocalTrainingAcquisitionRequest,
} from '../src/core/local-training-acquisition-approval.mjs';

const OPERATOR_DECISION_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-operator-decision/v1';
const MAX_JSON_BYTES = 64 * 1024;
const repoDir = fs.realpathSync(process.cwd());
const decisionPath = parseDecisionPath(process.argv.slice(2));
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
const operatorDecision = readOperatorDecision(decisionPath);
const resolvedAt = new Date().toISOString();
const resolution = resolveLocalTrainingAcquisitionRequest({
  ...operatorDecision,
  request,
  resolvedAt,
  resolvedBy: operatorDecision.owners.approvalOwner,
  toolchainDecision,
});

if (resolution.status === 'approved') {
  assertApprovedLocalTrainingAcquisition({
    approval: resolution,
    decision: toolchainDecision,
    now: resolvedAt,
  });
} else if (
  resolution.status !== 'rejected' ||
  resolution.acquisitionAuthorized !== false ||
  resolution.trainingAuthorized !== false ||
  resolution.externalSubmissionAuthorized !== false ||
  resolution.rolloutAuthorized !== false
) {
  throw new Error(
    'Local training acquisition rejection failed: authority-boundary.',
  );
}

const outputDir = prepareOutputDirectory();
assertRequestNotResolved(outputDir, request.id);
const outputPath = path.join(outputDir, `${resolution.id}.json`);
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(resolution, null, 2)}\n`,
  {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  },
);

console.log(JSON.stringify({
  acquisitionAuthorized: resolution.acquisitionAuthorized,
  actualDependencyInstallationPerformed:
    resolution.actualDependencyInstallationPerformed,
  actualModelDownloadPerformed:
    resolution.actualModelDownloadPerformed,
  actualModelTrainingExecuted:
    resolution.actualModelTrainingExecuted,
  externalProviderCalls: resolution.externalProviderCalls,
  mode: 'local-training-acquisition-resolution',
  ok: true,
  outputPath: toRepoRelativePath(outputPath),
  productionReadyClaim: resolution.productionReadyClaim,
  requestId: resolution.request.id,
  resolutionId: resolution.id,
  rolloutAuthorized: resolution.rolloutAuthorized,
  status: resolution.status,
  trainingAuthorized: resolution.trainingAuthorized,
}, null, 2));

function parseDecisionPath(args) {
  if (
    args.length !== 2 ||
    args[0] !== '--decision' ||
    !normalize(args[1])
  ) {
    throw new Error(
      'Expected --decision <private-json-path>.',
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
      'Local training acquisition decision must be a bounded regular file.',
    );
  }
  const canonicalPath = fs.realpathSync(filename);
  const varDir = path.join(repoDir, 'var');
  if (
    isPathWithin(repoDir, canonicalPath) &&
    !isPathWithin(varDir, canonicalPath)
  ) {
    throw new Error(
      'Local training acquisition decision must remain private under var/ or outside the repository.',
    );
  }
  return canonicalPath;
}

function readOperatorDecision(filename) {
  const input = readBoundedJson(filename);
  requireExactKeys(
    input,
    ['decision', 'owners', 'reason', 'schemaVersion'],
    'decision',
  );
  requireExactKeys(
    input.owners,
    [
      'approvalOwner',
      'egressOwner',
      'licenseOwner',
      'resourceOwner',
      'rollbackOwner',
    ],
    'owners',
  );
  if (
    input.schemaVersion !== OPERATOR_DECISION_SCHEMA_VERSION ||
    !['approve', 'reject'].includes(input.decision) ||
    typeof input.reason !== 'string' ||
    Object.values(input.owners).some((value) => typeof value !== 'string')
  ) {
    throw new Error(
      'Local training acquisition operator decision is invalid.',
    );
  }
  return {
    decision: input.decision,
    owners: input.owners,
    reason: input.reason,
  };
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
      'Local training acquisition input must be a bounded regular file.',
    );
  }
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function prepareOutputDirectory() {
  const segments = ['var', 'local-training', 'acquisition-resolutions'];
  let current = repoDir;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (fs.existsSync(current)) {
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error(
          'Local training acquisition resolution directory must not contain symbolic links.',
        );
      }
      continue;
    }
    fs.mkdirSync(current, { mode: 0o700 });
  }
  const canonicalOutputDir = fs.realpathSync(current);
  if (!isPathWithin(path.join(repoDir, 'var'), canonicalOutputDir)) {
    throw new Error(
      'Local training acquisition resolution directory escaped var/.',
    );
  }
  return canonicalOutputDir;
}

function assertRequestNotResolved(outputDir, requestId) {
  for (const name of fs.readdirSync(outputDir)) {
    if (
      !name.startsWith('local-training-acquisition-approval-') ||
      !name.endsWith('.json')
    ) {
      continue;
    }
    const filename = path.join(outputDir, name);
    const stat = fs.lstatSync(filename);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      stat.size <= 0 ||
      stat.size > MAX_JSON_BYTES
    ) {
      throw new Error(
        'Local training acquisition resolution history is invalid.',
      );
    }
    const existing = JSON.parse(fs.readFileSync(filename, 'utf8'));
    if (existing.request?.id === requestId) {
      throw new Error(
        `Local training acquisition request is already resolved: ${requestId}`,
      );
    }
  }
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
      `Local training acquisition operator ${fieldName} fields are invalid.`,
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
