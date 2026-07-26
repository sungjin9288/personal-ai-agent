import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  assertLocalTrainingDarwinSuspendedExecContract,
  buildLocalTrainingDarwinSuspendedExecContract,
} from '../src/core/local-training-darwin-suspended-exec.mjs';
import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';
import {
  probeLocalTrainingDarwinSuspendedExec,
} from './probe-local-training-darwin-suspended-exec.mjs';

export const LOCAL_TRAINING_DARWIN_SUSPENDED_EXEC_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-darwin-suspended-exec-evidence/v1';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

export async function evaluateLocalTrainingDarwinSuspendedExec({
  platform = process.platform,
  repoDir = process.cwd(),
} = {}) {
  const contract = buildLocalTrainingDarwinSuspendedExecContract();
  assertLocalTrainingDarwinSuspendedExecContract(contract);
  const observation = await probeLocalTrainingDarwinSuspendedExec({
    platform,
    repoDir,
  });
  const adapterEvidence = await evaluateMlxLmLoraTrainingAdapter({
    repoDir,
  });
  const failureGuards = {
    adapterActualMlxProcessRemainsBlocked:
      adapterEvidence.claimBoundary.actualMlxProcessSpawned === false,
    adapterBoundToSuspendedExecContract:
      adapterEvidence.contract.darwinSuspendedExec.contractHash ===
        contract.contractHash &&
      adapterEvidence.contract
        .darwinSuspendedExecContractValidated === true,
    contractTamperBlocked: (() => {
      try {
        assertLocalTrainingDarwinSuspendedExecContract({
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
    entrypointDescriptorMatched:
      observation.childEntrypointDescriptorMatched === true,
    entrypointPathReplacementResisted:
      observation.childEntrypointPathReplacementResisted === true,
    executableCdHashMatchedBeforeResume:
      observation.executableCdHashMatchedBeforeResume === true,
    mismatchedExecutableBlockedBeforeResume:
      observation.mismatchedExecutableBlockedBeforeResume === true &&
      observation.mismatchedExecutableMarkerAbsent === true,
    mlxVerifyToExecGateRemainsExplicit:
      adapterEvidence.contract.remainingGates.includes(
        'mlx-verify-to-exec-closure',
      ),
    signedBrokerInterpreterValidated:
      observation.brokerInterpreterStrictSignatureValidated === true &&
      observation.executableFileIdentityStable === true,
    verifyToExecRemainsFailClosed:
      adapterEvidence.claimBoundary.verifyToExecClosed === false &&
      contract.verifyToExecClosed === false,
  };
  assert.equal(
    Object.values(failureGuards).every(Boolean),
    true,
    'every Darwin suspended exec guard must pass',
  );

  const evidence = {
    adapterBinding: {
      adapterContractHash: adapterEvidence.contract.contractHash,
      suspendedExecContractHash:
        adapterEvidence.contract.darwinSuspendedExec.contractHash,
      verifyToExecGate:
        adapterEvidence.contract.remainingGates.find(
          (gate) => gate === 'mlx-verify-to-exec-closure',
        ),
    },
    claimBoundary: {
      actualDarwinFixtureEntrypointDescriptorExecutionValidated: true,
      actualDarwinFixtureExecutableVerifyToExecValidated: true,
      actualDependencyInstallationPerformed: false,
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
      actualMlxEntrypointDescriptorIntegrated: false,
      actualMlxInterpreterCdHashValidated: false,
      dynamicPythonModuleClosureComplete: false,
      postResumeNativeLoadClosureComplete: false,
      unifiedMemoryLimitEnforced: false,
    },
    mode: 'actual-darwin-suspended-signed-fixture-exec',
    observation: {
      childEntrypointSha256:
        observation.childEntrypointSha256,
      executableCdHashSetSha256:
        observation.executableCdHashSetSha256,
      outputBoundsPreserved:
        observation.outputBoundsPreserved,
      successfulChildExitCode:
        observation.successfulChildExitCode,
    },
    replayPlatform: 'darwin',
    schemaVersion:
      LOCAL_TRAINING_DARWIN_SUSPENDED_EXEC_EVIDENCE_SCHEMA_VERSION,
    suspendedExecContract: {
      contractHash: contract.contractHash,
      runtimeImageProvenanceContractHash:
        contract.runtimeImageProvenance.contractHash,
      schemaVersion: contract.schemaVersion,
    },
  };
  const evidenceHash = hashRecord(evidence);
  return {
    ...evidence,
    evidenceHash,
    id: `local-training-darwin-suspended-exec-evidence-${evidenceHash}`,
  };
}
