import { createHash } from 'node:crypto';

import {
  assertLocalTrainingRuntimeImageProvenanceContract,
  buildLocalTrainingRuntimeImageProvenanceContract,
} from './local-training-runtime-image-provenance.mjs';

export const LOCAL_TRAINING_DARWIN_SUSPENDED_EXEC_SCHEMA_VERSION =
  'personal-ai-agent-local-training-darwin-suspended-exec/v1';

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

export function buildLocalTrainingDarwinSuspendedExecContract() {
  const runtimeImageProvenance =
    buildLocalTrainingRuntimeImageProvenanceContract();
  assertLocalTrainingRuntimeImageProvenanceContract(
    runtimeImageProvenance,
  );
  const contract = {
    actualMlxProcessSpawned: false,
    actualModelTrainingExecuted: false,
    dynamicRuntimeClosureComplete: false,
    entrypointBinding:
      'open-no-follow-hash-and-inherited-stdin-descriptor',
    executableBinding:
      'posix-spawn-start-suspended-csops-cdhash-before-resume',
    externalProviderCalls: 'none',
    nativeClosureComplete: false,
    productionReadyClaim: false,
    runtimeImageProvenance: {
      contractHash: runtimeImageProvenance.contractHash,
      schemaVersion: runtimeImageProvenance.schemaVersion,
    },
    runtimeImageProvenanceContractValidated: true,
    schemaVersion:
      LOCAL_TRAINING_DARWIN_SUSPENDED_EXEC_SCHEMA_VERSION,
    trainingAuthorized: false,
    verifyToExecClosed: false,
  };
  return {
    ...contract,
    contractHash: hashRecord(contract),
  };
}

export function assertLocalTrainingDarwinSuspendedExecContract(value) {
  const expected = buildLocalTrainingDarwinSuspendedExecContract();
  const { contractHash, ...contract } = value || {};
  if (
    !hasExactKeys(value, Object.keys(expected)) ||
    contractHash !== hashRecord(contract) ||
    JSON.stringify(value) !== JSON.stringify(expected)
  ) {
    throw new Error(
      'Local training Darwin suspended exec contract failed: integrity.',
    );
  }
  return value;
}

export function assertLocalTrainingDarwinSuspendedExecObservation(value) {
  if (
    !hasExactKeys(value, [
      'brokerEntrypointDescriptorMatched',
      'brokerInterpreterStrictSignatureValidated',
      'childEntrypointDescriptorMatched',
      'childEntrypointPathReplacementResisted',
      'childEntrypointSha256',
      'executableCdHashMatchedBeforeResume',
      'executableCdHashSetSha256',
      'executableFileIdentityStable',
      'mismatchedExecutableBlockedBeforeResume',
      'mismatchedExecutableMarkerAbsent',
      'outputBoundsPreserved',
      'schemaVersion',
      'successfulChildExitCode',
    ]) ||
    value.schemaVersion !==
      LOCAL_TRAINING_DARWIN_SUSPENDED_EXEC_SCHEMA_VERSION ||
    value.brokerEntrypointDescriptorMatched !== true ||
    value.brokerInterpreterStrictSignatureValidated !== true ||
    value.childEntrypointDescriptorMatched !== true ||
    value.childEntrypointPathReplacementResisted !== true ||
    value.executableCdHashMatchedBeforeResume !== true ||
    value.executableFileIdentityStable !== true ||
    value.mismatchedExecutableBlockedBeforeResume !== true ||
    value.mismatchedExecutableMarkerAbsent !== true ||
    value.outputBoundsPreserved !== true ||
    value.successfulChildExitCode !== 0 ||
    !isSha256(value.childEntrypointSha256) ||
    !isSha256(value.executableCdHashSetSha256)
  ) {
    throw new Error(
      'Local training Darwin suspended exec observation failed: integrity.',
    );
  }
  return value;
}
