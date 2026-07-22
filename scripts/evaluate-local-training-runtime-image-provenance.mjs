import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  assertLocalTrainingRuntimeImageProvenanceContract,
  buildLocalTrainingRuntimeImageProvenanceContract,
} from '../src/core/local-training-runtime-image-provenance.mjs';
import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';
import {
  probeLocalTrainingRuntimeImageProvenance,
} from './probe-local-training-runtime-image-provenance.mjs';

export const LOCAL_TRAINING_RUNTIME_IMAGE_PROVENANCE_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-runtime-image-provenance-evidence/v1';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

export async function evaluateLocalTrainingRuntimeImageProvenance({
  platform = process.platform,
  repoDir = process.cwd(),
} = {}) {
  const contract = buildLocalTrainingRuntimeImageProvenanceContract();
  assertLocalTrainingRuntimeImageProvenanceContract(contract);
  const observation =
    await probeLocalTrainingRuntimeImageProvenance({
      platform,
      repoDir,
    });
  const adapterEvidence = await evaluateMlxLmLoraTrainingAdapter({
    repoDir,
  });
  const failureGuards = {
    adapterActualMlxProcessRemainsBlocked:
      adapterEvidence.claimBoundary.actualMlxProcessSpawned === false,
    adapterBoundToProvenanceContract:
      adapterEvidence.contract.runtimeImageProvenance.contractHash ===
        contract.contractHash &&
      adapterEvidence.contract
        .runtimeImageProvenanceContractValidated === true,
    contractTamperBlocked: (() => {
      try {
        assertLocalTrainingRuntimeImageProvenanceContract({
          ...contract,
          contractHash: '0'.repeat(64),
        });
        return false;
      } catch {
        return true;
      }
    })(),
    crossProcessMembershipValidated:
      observation.crossProcessMembershipValidated === true &&
      observation.crossProcessMatchedImageCount ===
        observation.childRuntimeImageCount,
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
    regularImageBytesIndependentlyMatched:
      observation.regularRuntimeImageBytesVerified === true &&
      observation.regularRuntimeImageCount > 0,
    sharedCacheIdentityIndependentlyMatched:
      observation.sharedCacheImageIdentityVerified === true &&
      observation.sharedCacheImageCount > 0 &&
      observation.cacheFileCount > 0,
    toolAndWrapperBoundsPreserved:
      observation.toolOutputBoundsPreserved === true &&
      observation.wrapperLimitsValidated === true,
    verifyToExecRemainsFailClosed:
      adapterEvidence.claimBoundary.verifyToExecClosed === false &&
      contract.verifyToExecClosed === false,
  };
  assert.equal(
    Object.values(failureGuards).every(Boolean),
    true,
    'every runtime image provenance guard must pass',
  );

  const evidence = {
    adapterBinding: {
      adapterContractHash: adapterEvidence.contract.contractHash,
      dynamicNativeGate:
        adapterEvidence.contract.remainingGates.find(
          (gate) => gate === 'mlx-dynamic-native-runtime-closure',
        ),
      provenanceContractHash:
        adapterEvidence.contract.runtimeImageProvenance.contractHash,
      verifyToExecGate:
        adapterEvidence.contract.remainingGates.find(
          (gate) => gate === 'mlx-verify-to-exec-closure',
        ),
    },
    claimBoundary: {
      actualDarwinFixtureRegularRuntimeImageBytesVerified: true,
      actualDarwinFixtureRuntimeImageProvenanceValidated: true,
      actualDarwinFixtureSharedCacheImageIdentityVerified: true,
      actualDependencyInstallationPerformed: false,
      actualMlxNativeRuntimeClosureValidated: false,
      actualMlxProcessSpawned: false,
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
      crossProcessImageSetEqualityValidated: false,
      lateLazyLoadClosureComplete: false,
      mlxRuntimeImageProvenanceValidated: false,
      sameUserMutationResistance: false,
      sharedCacheSubcacheBytesHashed: false,
    },
    mode: 'actual-darwin-fixture-runtime-image-provenance',
    observation: {
      cacheArchitecture: observation.cacheArchitecture,
      cacheEntryCount: observation.cacheEntryCount,
      cacheFileCount: observation.cacheFileCount,
      cacheFileIdentitySetSha256:
        observation.cacheFileIdentitySetSha256,
      childRuntimeImageCount: observation.childRuntimeImageCount,
      childRuntimeImageSetSha256:
        observation.childRuntimeImageSetSha256,
      crossProcessMatchedImageCount:
        observation.crossProcessMatchedImageCount,
      regularRuntimeImageByteSetSha256:
        observation.regularRuntimeImageByteSetSha256,
      regularRuntimeImageCount:
        observation.regularRuntimeImageCount,
      sharedCacheImageCount: observation.sharedCacheImageCount,
      sharedCacheImageIdentitySetSha256:
        observation.sharedCacheImageIdentitySetSha256,
      sharedCacheUuidCount: observation.sharedCacheUuidCount,
    },
    provenanceContract: {
      contractHash: contract.contractHash,
      runtimeExecObservationContractHash:
        contract.runtimeExecObservation.contractHash,
      schemaVersion: contract.schemaVersion,
    },
    replayPlatform: 'darwin',
    schemaVersion:
      LOCAL_TRAINING_RUNTIME_IMAGE_PROVENANCE_EVIDENCE_SCHEMA_VERSION,
  };
  const evidenceHash = hashRecord(evidence);
  return {
    ...evidence,
    evidenceHash,
    id: `local-training-runtime-image-provenance-evidence-${evidenceHash}`,
  };
}
