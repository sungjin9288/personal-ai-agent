import { createHash } from 'node:crypto';
import path from 'node:path';

export const LOCAL_TRAINING_OS_ISOLATION_SCHEMA_VERSION =
  'personal-ai-agent-local-training-os-isolation/v1';

export const LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS =
  Object.freeze({
    coreDumpBytes: 0,
    cpuSeconds: 1,
    fileSizeBytes: 65_536,
    openFiles: 32,
  });

const DARWIN_SANDBOX_PROFILE = [
  '(version 1)',
  '(allow default)',
  '(deny network*)',
].join('\n');

const DARWIN_SANDBOX_EXECUTABLE = '/usr/bin/sandbox-exec';
const DARWIN_PYTHON_EXECUTABLE = '/usr/bin/python3';
const CLEAN_ENVIRONMENT = Object.freeze({
  LANG: 'C',
  LC_ALL: 'C',
});

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function hasExactKeys(value, expectedKeys) {
  return Boolean(
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).length === expectedKeys.length &&
    Object.keys(value).every((key) => expectedKeys.includes(key)),
  );
}

function requireAbsoluteFilePath(value, fieldName) {
  const normalized = String(value || '').trim();
  if (
    !normalized ||
    !path.isAbsolute(normalized) ||
    /[\r\n\0]/u.test(normalized)
  ) {
    throw new Error(
      `Local training OS isolation ${fieldName} must be an absolute path.`,
    );
  }
  return normalized;
}

function requireArguments(value) {
  if (
    !Array.isArray(value) ||
    value.some(
      (argument) =>
        typeof argument !== 'string' || argument.includes('\0'),
    )
  ) {
    throw new Error(
      'Local training OS isolation childArgs must be a string array.',
    );
  }
  return [...value];
}

export function buildLocalTrainingOsIsolationContract() {
  const contract = {
    actualMlxMemoryLimitEnforced: false,
    actualMlxOsIsolationIntegrated: false,
    actualMlxProcessSpawned: false,
    actualModelTrainingExecuted: false,
    darwinFixtureStrategy: {
      memoryBoundary:
        'actual-mlx-unified-memory-limit-unresolved',
      networkIsolation: 'sandbox-exec-deny-network',
      resourceIsolation: 'posix-setrlimit-before-exec',
      resourceLimits: {
        ...LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS,
      },
    },
    externalProviderCalls: 'none',
    linuxStrategyImplemented: false,
    productionReadyClaim: false,
    schemaVersion: LOCAL_TRAINING_OS_ISOLATION_SCHEMA_VERSION,
    trainingAuthorized: false,
  };
  return {
    ...contract,
    contractHash: hashRecord(contract),
  };
}

export function assertLocalTrainingOsIsolationContract(value) {
  const { contractHash, ...contract } = value || {};
  const expected = buildLocalTrainingOsIsolationContract();
  if (
    !hasExactKeys(
      contract,
      Object.keys(expected).filter((key) => key !== 'contractHash'),
    ) ||
    contractHash !== hashRecord(contract) ||
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local training OS isolation contract failed: integrity.',
    );
  }
  return value;
}

export function buildDarwinTrainingIsolationInvocation({
  childArgs = [],
  childCommand,
  platform = process.platform,
  wrapperPath,
} = {}) {
  if (platform !== 'darwin') {
    throw new Error(
      'Local training OS isolation invocation requires Darwin.',
    );
  }
  const executable = requireAbsoluteFilePath(
    childCommand,
    'childCommand',
  );
  const wrapper = requireAbsoluteFilePath(
    wrapperPath,
    'wrapperPath',
  );
  const args = requireArguments(childArgs);
  return {
    args: [
      '-p',
      DARWIN_SANDBOX_PROFILE,
      DARWIN_PYTHON_EXECUTABLE,
      '-E',
      '-S',
      '-B',
      wrapper,
      'run',
      '--',
      executable,
      ...args,
    ],
    command: DARWIN_SANDBOX_EXECUTABLE,
    environment: { ...CLEAN_ENVIRONMENT },
    networkPolicy: 'deny-all-network',
    resourceLimits: {
      ...LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS,
    },
    shell: false,
  };
}

export function buildDarwinTrainingResourceControlInvocation({
  childArgs = [],
  childCommand,
  platform = process.platform,
  wrapperPath,
} = {}) {
  if (platform !== 'darwin') {
    throw new Error(
      'Local training resource control invocation requires Darwin.',
    );
  }
  const executable = requireAbsoluteFilePath(
    childCommand,
    'childCommand',
  );
  const wrapper = requireAbsoluteFilePath(
    wrapperPath,
    'wrapperPath',
  );
  const args = requireArguments(childArgs);
  return {
    args: [
      '-E',
      '-S',
      '-B',
      wrapper,
      'run',
      '--',
      executable,
      ...args,
    ],
    command: DARWIN_PYTHON_EXECUTABLE,
    environment: { ...CLEAN_ENVIRONMENT },
    resourceLimits: {
      ...LOCAL_TRAINING_OS_ISOLATION_FIXTURE_LIMITS,
    },
    shell: false,
  };
}

export function buildDarwinTrainingMemoryProbeInvocation({
  platform = process.platform,
  wrapperPath,
} = {}) {
  if (platform !== 'darwin') {
    throw new Error(
      'Local training memory probe requires Darwin.',
    );
  }
  const wrapper = requireAbsoluteFilePath(
    wrapperPath,
    'wrapperPath',
  );
  return {
    args: ['-E', '-S', '-B', wrapper, 'memory-probe'],
    command: DARWIN_PYTHON_EXECUTABLE,
    environment: { ...CLEAN_ENVIRONMENT },
    shell: false,
  };
}
