import { createHash } from 'node:crypto';

import {
  assertLocalTrainingRuntimeExecObservationContract,
  buildLocalTrainingRuntimeExecObservationContract,
} from './local-training-runtime-exec-observation.mjs';

export const LOCAL_TRAINING_RUNTIME_IMAGE_PROVENANCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-image-provenance/v1';

const MAX_CACHE_ENTRIES = 16_384;
const MAX_CACHE_FILES = 64;
const MAX_RUNTIME_IMAGES = 4_096;

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

export function buildLocalTrainingRuntimeImageProvenanceContract() {
  const runtimeExecObservation =
    buildLocalTrainingRuntimeExecObservationContract();
  assertLocalTrainingRuntimeExecObservationContract(
    runtimeExecObservation,
  );
  const contract = {
    actualMlxProcessSpawned: false,
    actualModelTrainingExecuted: false,
    dynamicRuntimeClosureComplete: false,
    externalProviderCalls: 'none',
    lateLazyLoadClosureComplete: false,
    nativeClosureComplete: false,
    observationStrategy: {
      childImageInventory:
        'content-free-path-hash-and-regular-file-byte-identity',
      crossProcessMembership: 'darwin-vmmap-live-process-observation',
      sharedCacheIdentity:
        'dyld-info-image-uuid-and-strict-code-signature',
    },
    productionReadyClaim: false,
    runtimeExecObservation: {
      contractHash: runtimeExecObservation.contractHash,
      schemaVersion: runtimeExecObservation.schemaVersion,
    },
    runtimeExecObservationContractValidated: true,
    schemaVersion:
      LOCAL_TRAINING_RUNTIME_IMAGE_PROVENANCE_SCHEMA_VERSION,
    trainingAuthorized: false,
    verifyToExecClosed: false,
  };
  return {
    ...contract,
    contractHash: hashRecord(contract),
  };
}

export function assertLocalTrainingRuntimeImageProvenanceContract(
  value,
) {
  const expected = buildLocalTrainingRuntimeImageProvenanceContract();
  const { contractHash, ...contract } = value || {};
  if (
    !hasExactKeys(value, Object.keys(expected)) ||
    contractHash !== hashRecord(contract) ||
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local training runtime image provenance contract failed: integrity.',
    );
  }
  return value;
}

export function assertLocalTrainingRuntimeImageProvenance(value) {
  if (
    !hasExactKeys(value, [
      'cacheArchitecture',
      'cacheEntryCount',
      'cacheFileCount',
      'cacheFileIdentitySetSha256',
      'childRuntimeImageCount',
      'childRuntimeImageSetSha256',
      'crossProcessMatchedImageCount',
      'crossProcessMembershipValidated',
      'regularRuntimeImageByteSetSha256',
      'regularRuntimeImageBytesVerified',
      'regularRuntimeImageCount',
      'schemaVersion',
      'sharedCacheImageCount',
      'sharedCacheImageIdentitySetSha256',
      'sharedCacheImageIdentityVerified',
      'sharedCacheUuidCount',
      'toolOutputBoundsPreserved',
      'unmatchedRuntimeImageCount',
      'wrapperLimitsValidated',
    ]) ||
    value.schemaVersion !==
      LOCAL_TRAINING_RUNTIME_IMAGE_PROVENANCE_SCHEMA_VERSION ||
    !['arm64e', 'x86_64'].includes(value.cacheArchitecture) ||
    !Number.isSafeInteger(value.cacheEntryCount) ||
    value.cacheEntryCount <= 0 ||
    value.cacheEntryCount > MAX_CACHE_ENTRIES ||
    !Number.isSafeInteger(value.cacheFileCount) ||
    value.cacheFileCount <= 0 ||
    value.cacheFileCount > MAX_CACHE_FILES ||
    !isSha256(value.cacheFileIdentitySetSha256) ||
    !Number.isSafeInteger(value.childRuntimeImageCount) ||
    value.childRuntimeImageCount <= 0 ||
    value.childRuntimeImageCount > MAX_RUNTIME_IMAGES ||
    !isSha256(value.childRuntimeImageSetSha256) ||
    value.crossProcessMatchedImageCount !==
      value.childRuntimeImageCount ||
    value.crossProcessMembershipValidated !== true ||
    !isSha256(value.regularRuntimeImageByteSetSha256) ||
    value.regularRuntimeImageBytesVerified !== true ||
    !Number.isSafeInteger(value.regularRuntimeImageCount) ||
    value.regularRuntimeImageCount <= 0 ||
    !Number.isSafeInteger(value.sharedCacheImageCount) ||
    value.sharedCacheImageCount <= 0 ||
    value.regularRuntimeImageCount +
        value.sharedCacheImageCount !==
      value.childRuntimeImageCount ||
    !isSha256(value.sharedCacheImageIdentitySetSha256) ||
    value.sharedCacheImageIdentityVerified !== true ||
    !Number.isSafeInteger(value.sharedCacheUuidCount) ||
    value.sharedCacheUuidCount <= 0 ||
    value.sharedCacheUuidCount > value.sharedCacheImageCount ||
    value.toolOutputBoundsPreserved !== true ||
    value.unmatchedRuntimeImageCount !== 0 ||
    value.wrapperLimitsValidated !== true
  ) {
    throw new Error(
      'Local training runtime image provenance failed: integrity.',
    );
  }
  return value;
}
