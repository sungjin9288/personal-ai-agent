import { createHash } from 'node:crypto';

import {
  assertLocalTrainingOsIsolationContract,
  buildLocalTrainingOsIsolationContract,
} from './local-training-os-isolation.mjs';

export const LOCAL_TRAINING_RUNTIME_EXEC_OBSERVATION_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-exec-observation/v1';

const MAX_OBSERVED_RUNTIME_IMAGES = 4_096;
const MAX_OBSERVED_MODULE_LOADS = 4_096;

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/u.test(String(value || ''));
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

export function buildLocalTrainingRuntimeExecObservationContract() {
  const osIsolation = buildLocalTrainingOsIsolationContract();
  assertLocalTrainingOsIsolationContract(osIsolation);
  const contract = {
    actualMlxProcessSpawned: false,
    actualModelTrainingExecuted: false,
    dynamicRuntimeClosureComplete: false,
    externalProviderCalls: 'none',
    lateLazyLoadClosureComplete: false,
    nativeClosureComplete: false,
    observationStrategy: {
      executableIdentity:
        'parent-pre-post-and-child-self-hash-comparison',
      moduleLoads: 'node-process-module-load-list-set-hash',
      runtimeImages: 'node-process-report-shared-object-set-hash',
    },
    osIsolation: {
      contractHash: osIsolation.contractHash,
      schemaVersion: osIsolation.schemaVersion,
    },
    osIsolationContractValidated: true,
    productionReadyClaim: false,
    schemaVersion:
      LOCAL_TRAINING_RUNTIME_EXEC_OBSERVATION_SCHEMA_VERSION,
    trainingAuthorized: false,
    verifyToExecClosed: false,
  };
  return {
    ...contract,
    contractHash: hashRecord(contract),
  };
}

export function assertLocalTrainingRuntimeExecObservationContract(value) {
  const expected = buildLocalTrainingRuntimeExecObservationContract();
  const { contractHash, ...contract } = value || {};
  if (
    !hasExactKeys(value, Object.keys(expected)) ||
    contractHash !== hashRecord(contract) ||
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local training runtime exec observation contract failed: integrity.',
    );
  }
  return value;
}

export function assertLocalTrainingRuntimeExecObservation(value) {
  if (
    !hasExactKeys(value, [
      'entryFileIdentityMatched',
      'entrySha256',
      'executableFileIdentityMatched',
      'executableSha256',
      'moduleLoadCount',
      'moduleLoadSetSha256',
      'outputBoundsPreserved',
      'prePostFileIdentityStable',
      'regularRuntimeImageCount',
      'runtimeImageCount',
      'runtimeImagesAbsolute',
      'runtimeImagesUnique',
      'runtimeImageSetSha256',
      'schemaVersion',
      'unresolvedRuntimeImageCount',
      'wrapperLimitsValidated',
    ]) ||
    value.schemaVersion !==
      LOCAL_TRAINING_RUNTIME_EXEC_OBSERVATION_SCHEMA_VERSION ||
    value.entryFileIdentityMatched !== true ||
    value.executableFileIdentityMatched !== true ||
    value.outputBoundsPreserved !== true ||
    value.prePostFileIdentityStable !== true ||
    value.runtimeImagesAbsolute !== true ||
    value.runtimeImagesUnique !== true ||
    value.wrapperLimitsValidated !== true ||
    !isSha256(value.entrySha256) ||
    !isSha256(value.executableSha256) ||
    !isSha256(value.moduleLoadSetSha256) ||
    !isSha256(value.runtimeImageSetSha256) ||
    !Number.isSafeInteger(value.moduleLoadCount) ||
    value.moduleLoadCount <= 0 ||
    value.moduleLoadCount > MAX_OBSERVED_MODULE_LOADS ||
    !Number.isSafeInteger(value.runtimeImageCount) ||
    value.runtimeImageCount <= 0 ||
    value.runtimeImageCount > MAX_OBSERVED_RUNTIME_IMAGES ||
    !Number.isSafeInteger(value.regularRuntimeImageCount) ||
    value.regularRuntimeImageCount <= 0 ||
    !Number.isSafeInteger(value.unresolvedRuntimeImageCount) ||
    value.unresolvedRuntimeImageCount < 0 ||
    value.regularRuntimeImageCount +
        value.unresolvedRuntimeImageCount !==
      value.runtimeImageCount
  ) {
    throw new Error(
      'Local training runtime exec observation failed: integrity.',
    );
  }
  return value;
}
