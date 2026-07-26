import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  assertLocalTrainingOsIsolationContract,
  buildLocalTrainingOsIsolationContract,
} from '../src/core/local-training-os-isolation.mjs';
import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';
import {
  probeLocalTrainingOsIsolation,
} from './probe-local-training-os-isolation.mjs';

export const LOCAL_TRAINING_OS_ISOLATION_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-os-isolation-evidence/v1';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

export async function evaluateLocalTrainingOsIsolation({
  platform = process.platform,
  repoDir = process.cwd(),
} = {}) {
  const contract = buildLocalTrainingOsIsolationContract();
  assertLocalTrainingOsIsolationContract(contract);
  const observation = await probeLocalTrainingOsIsolation({
    platform,
    repoDir,
  });
  const adapterEvidence = await evaluateMlxLmLoraTrainingAdapter({
    repoDir,
  });
  const failureGuards = {
    adapterActualMlxProcessRemainsBlocked:
      adapterEvidence.claimBoundary.actualMlxProcessSpawned === false,
    adapterBoundToIsolationContract:
      adapterEvidence.contract.osIsolation.contractHash ===
        contract.contractHash &&
      adapterEvidence.contract.osIsolationContractValidated === true,
    controlProvesNetworkWasAvailable:
      observation.controlNetworkAllowed === true,
    contractTamperBlocked: (() => {
      try {
        assertLocalTrainingOsIsolationContract({
          ...contract,
          contractHash: '0'.repeat(64),
        });
        return false;
      } catch {
        return true;
      }
    })(),
    cpuLimitActuallyTerminatesFixture:
      observation.cpuLimitEnforced === true,
    fileAndDescriptorLimitsActuallyEnforced:
      observation.fileSizeLimitEnforced === true &&
      observation.openFilesLimitEnforced === true,
    memoryBoundaryRemainsFailClosed:
      observation.actualMlxMemoryLimitEnforced === false &&
      adapterEvidence.claimBoundary.actualMlxMemoryLimitEnforced ===
        false &&
      adapterEvidence.contract.remainingGates.includes(
        'os-enforced-mlx-unified-memory-limit',
      ),
    mlxIsolationIntegrationRemainsBlocked:
      adapterEvidence.claimBoundary.actualMlxOsIsolationIntegrated ===
        false &&
      adapterEvidence.contract.remainingGates.includes(
        'mlx-os-isolation-integration',
      ),
    networkDenyActuallyEnforced:
      observation.networkDenyEnforced === true,
    wrapperLimitsAreExactAndContentFree:
      observation.limitStatusValidated === true &&
      observation.coreDumpLimitApplied === true &&
      observation.outputBoundsPreserved === true,
  };
  assert.equal(
    Object.values(failureGuards).every(Boolean),
    true,
    'every local training OS isolation guard must pass',
  );

  const evidence = {
    adapterBinding: {
      adapterContractHash: adapterEvidence.contract.contractHash,
      integrationGate:
        adapterEvidence.contract.remainingGates.find(
          (gate) => gate === 'mlx-os-isolation-integration',
        ),
      isolationContractHash:
        adapterEvidence.contract.osIsolation.contractHash,
      memoryGate:
        adapterEvidence.contract.remainingGates.find(
          (gate) =>
            gate === 'os-enforced-mlx-unified-memory-limit',
        ),
    },
    claimBoundary: {
      actualDependencyInstallationPerformed: false,
      actualDarwinFixtureCpuLimitEnforced: true,
      actualDarwinFixtureFileSizeLimitEnforced: true,
      actualDarwinFixtureNetworkDenyEnforced: true,
      actualDarwinFixtureOpenFilesLimitEnforced: true,
      actualMlxMemoryLimitEnforced: false,
      actualMlxOsIsolationIntegrated: false,
      actualMlxProcessSpawned: false,
      actualModelDownloadPerformed: false,
      actualModelTrainingExecuted: false,
      externalProviderCalls: 'none',
      externalSubmissionAuthorized: false,
      productionReadyClaim: false,
      rolloutAuthorized: false,
      trainingAuthorized: false,
    },
    costFree: true,
    failureGuards,
    hostObservation: {
      addressSpaceProbe: observation.addressSpaceProbe,
      fixtureSetSha256: observation.fixtureSetSha256,
      platform: observation.platform,
      systemToolSetSha256: observation.systemToolSetSha256,
    },
    isolation: {
      contractHash: contract.contractHash,
      networkPolicy:
        contract.darwinFixtureStrategy.networkIsolation,
      resourceIsolation:
        contract.darwinFixtureStrategy.resourceIsolation,
      resourceLimits: {
        ...contract.darwinFixtureStrategy.resourceLimits,
      },
      schemaVersion: contract.schemaVersion,
    },
    mode: 'actual-darwin-fixture-os-isolation',
    replayPlatform: 'darwin',
    schemaVersion:
      LOCAL_TRAINING_OS_ISOLATION_EVIDENCE_SCHEMA_VERSION,
  };
  const evidenceHash = hashRecord(evidence);
  return {
    ...evidence,
    evidenceHash,
    id: `local-training-os-isolation-evidence-${evidenceHash}`,
  };
}
