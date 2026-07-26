import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  assertLocalTrainingRuntimeExecObservationContract,
  buildLocalTrainingRuntimeExecObservationContract,
} from '../src/core/local-training-runtime-exec-observation.mjs';
import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';
import {
  probeLocalTrainingRuntimeExecObservation,
} from './probe-local-training-runtime-exec-observation.mjs';

export const LOCAL_TRAINING_RUNTIME_EXEC_OBSERVATION_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-exec-observation-evidence/v1';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

export async function evaluateLocalTrainingRuntimeExecObservation({
  platform = process.platform,
  repoDir = process.cwd(),
} = {}) {
  const contract = buildLocalTrainingRuntimeExecObservationContract();
  assertLocalTrainingRuntimeExecObservationContract(contract);
  const observation =
    await probeLocalTrainingRuntimeExecObservation({
      platform,
      repoDir,
    });
  const adapterEvidence = await evaluateMlxLmLoraTrainingAdapter({
    repoDir,
  });
  const failureGuards = {
    adapterActualMlxProcessRemainsBlocked:
      adapterEvidence.claimBoundary.actualMlxProcessSpawned === false,
    adapterBoundToObservationContract:
      adapterEvidence.contract.runtimeExecObservation.contractHash ===
        contract.contractHash &&
      adapterEvidence.contract
        .runtimeExecObservationContractValidated === true,
    contractTamperBlocked: (() => {
      try {
        assertLocalTrainingRuntimeExecObservationContract({
          ...contract,
          contractHash: '0'.repeat(64),
        });
        return false;
      } catch {
        return true;
      }
    })(),
    dynamicAndNativeClosureRemainBlocked:
      adapterEvidence.claimBoundary.dynamicRuntimeClosureComplete ===
        false &&
      adapterEvidence.contract.nativeClosureComplete === false,
    mlxClosureGatesRemainExplicit:
      adapterEvidence.contract.remainingGates.includes(
        'mlx-dynamic-native-runtime-closure',
      ) &&
      adapterEvidence.contract.remainingGates.includes(
        'mlx-verify-to-exec-closure',
      ),
    moduleLoadSetActuallyObserved:
      observation.moduleLoadCount > 0 &&
      /^[a-f0-9]{64}$/u.test(observation.moduleLoadSetSha256),
    parentAndChildFileIdentityMatched:
      observation.entryFileIdentityMatched === true &&
      observation.executableFileIdentityMatched === true &&
      observation.prePostFileIdentityStable === true,
    runtimeImageSetActuallyObserved:
      observation.runtimeImageCount > 0 &&
      observation.runtimeImagesAbsolute === true &&
      observation.runtimeImagesUnique === true,
    verifyToExecRemainsFailClosed:
      adapterEvidence.claimBoundary.verifyToExecClosed === false &&
      contract.verifyToExecClosed === false,
  };
  assert.equal(
    Object.values(failureGuards).every(Boolean),
    true,
    'every runtime exec observation guard must pass',
  );

  const evidence = {
    adapterBinding: {
      adapterContractHash: adapterEvidence.contract.contractHash,
      dynamicNativeGate:
        adapterEvidence.contract.remainingGates.find(
          (gate) => gate === 'mlx-dynamic-native-runtime-closure',
        ),
      observationContractHash:
        adapterEvidence.contract.runtimeExecObservation.contractHash,
      verifyToExecGate:
        adapterEvidence.contract.remainingGates.find(
          (gate) => gate === 'mlx-verify-to-exec-closure',
        ),
    },
    claimBoundary: {
      actualDarwinFixtureDynamicModuleSetObserved: true,
      actualDarwinFixtureEntryIdentityObserved: true,
      actualDarwinFixtureExecutableIdentityObserved: true,
      actualDarwinFixtureRuntimeImageSetObserved: true,
      actualDependencyInstallationPerformed: false,
      actualMlxProcessSpawned: false,
      actualMlxRuntimeImageSetObserved: false,
      actualModelDownloadPerformed: false,
      actualModelTrainingExecuted: false,
      dynamicRuntimeClosureComplete: false,
      externalProviderCalls: 'none',
      externalSubmissionAuthorized: false,
      nativeClosureComplete: false,
      productionReadyClaim: false,
      rolloutAuthorized: false,
      trainingAuthorized: false,
      verifyToExecClosed: false,
    },
    costFree: true,
    failureGuards,
    limitations: {
      lateLazyLoadClosureComplete: false,
      runtimeImageBytesIndependentlyVerified: false,
      sameUserMutationResistance: false,
    },
    mode: 'actual-darwin-fixture-runtime-exec-observation',
    observation: {
      entrySha256: observation.entrySha256,
      executableSha256: observation.executableSha256,
      moduleLoadCount: observation.moduleLoadCount,
      moduleLoadSetSha256: observation.moduleLoadSetSha256,
      regularRuntimeImageCount:
        observation.regularRuntimeImageCount,
      runtimeImageCount: observation.runtimeImageCount,
      runtimeImageSetSha256: observation.runtimeImageSetSha256,
      unresolvedRuntimeImageCount:
        observation.unresolvedRuntimeImageCount,
    },
    observationContract: {
      contractHash: contract.contractHash,
      osIsolationContractHash:
        contract.osIsolation.contractHash,
      schemaVersion: contract.schemaVersion,
    },
    replayPlatform: 'darwin',
    schemaVersion:
      LOCAL_TRAINING_RUNTIME_EXEC_OBSERVATION_EVIDENCE_SCHEMA_VERSION,
  };
  const evidenceHash = hashRecord(evidence);
  return {
    ...evidence,
    evidenceHash,
    id: `local-training-runtime-exec-observation-evidence-${evidenceHash}`,
  };
}
