import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';

import {
  assertLocalTrainingProcessSupervisorContract,
  buildLocalTrainingProcessSupervisorContract,
  isLocalTrainingProcessCleanupAuthorized,
  superviseLocalTrainingProcess,
} from '../src/core/local-training-process-supervisor.mjs';
import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';

export const LOCAL_TRAINING_PROCESS_SUPERVISOR_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-process-supervisor-evidence/v1';

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function authorityExpectation() {
  return {
    approvalHash: sha256('supervisor-evidence-approval'),
    approvalId: 'local-training-approval-evidence',
    expiresAt: '2099-01-01T00:00:00.000Z',
    permissionHash: sha256('supervisor-evidence-permission'),
    permissionId: 'local-training-permission-evidence',
  };
}

function currentAuthority(expected, revocation = null) {
  return {
    approvalHash: expected.approvalHash,
    approvalId: expected.approvalId,
    permissionHash: expected.permissionHash,
    permissionId: expected.permissionId,
    revocation,
  };
}

function createRunner({
  mode = 'success',
  readCurrentAuthority,
  repoDir,
  spawnProcess,
  timeoutMs = 1_000,
} = {}) {
  const expected = authorityExpectation();
  return superviseLocalTrainingProcess({
    args: [
      path.join(
        repoDir,
        'fixtures',
        'local-training-process-supervisor-command.mjs',
      ),
      mode,
    ],
    authorityPollMs: 10,
    clock: () => '2026-07-22T00:00:00.000Z',
    command: process.execPath,
    cwd: repoDir,
    environment: {},
    expectedAuthority: expected,
    maxOutputBytes: 1_024,
    payload: { fixture: true },
    quiescencePollMs: 5,
    quiescenceTimeoutMs: 1_000,
    readCurrentAuthority:
      readCurrentAuthority ||
      (() => currentAuthority(expected)),
    ...(spawnProcess ? { spawnProcess } : {}),
    timeoutMs,
  });
}

async function captureFailure(operation) {
  try {
    await operation();
    return null;
  } catch (error) {
    return error;
  }
}

export async function evaluateLocalTrainingProcessSupervisor({
  repoDir = process.cwd(),
} = {}) {
  const contract = buildLocalTrainingProcessSupervisorContract();
  assertLocalTrainingProcessSupervisorContract(contract);
  const adapterEvidence = await evaluateMlxLmLoraTrainingAdapter({
    repoDir,
  });

  const successful = await createRunner({ repoDir });
  const expected = authorityExpectation();
  let revocationReads = 0;
  const revoked = await captureFailure(() => createRunner({
    mode: 'hang',
    readCurrentAuthority() {
      revocationReads += 1;
      return currentAuthority(
        expected,
        revocationReads > 1 ? { status: 'revoked' } : null,
      );
    },
    repoDir,
  }));
  const timedOut = await captureFailure(() => createRunner({
    mode: 'hang',
    repoDir,
    timeoutMs: 40,
  }));
  const invalidResult = await captureFailure(() => createRunner({
    mode: 'invalid-result',
    repoDir,
  }));
  let spawnCalled = false;
  const drifted = await captureFailure(() => createRunner({
    readCurrentAuthority: () => ({
      ...currentAuthority(expected),
      permissionId: 'stale-permission',
    }),
    repoDir,
    spawnProcess() {
      spawnCalled = true;
    },
  }));
  const unavailable = await captureFailure(() => createRunner({
    readCurrentAuthority() {
      throw new Error('private store error');
    },
    repoDir,
  }));
  const failureGuards = {
    adapterActualMlxProcessRemainsBlocked:
      adapterEvidence.claimBoundary.actualMlxProcessSpawned === false,
    adapterBoundToSupervisorContract:
      adapterEvidence.contract.processSupervisor.contractHash ===
        contract.contractHash &&
      adapterEvidence.contract.processSupervisorContractValidated ===
        true,
    authorityDriftBlockedBeforeSpawn:
      drifted?.failureCode === 'authority-drift' &&
      isLocalTrainingProcessCleanupAuthorized(drifted) &&
      spawnCalled === false,
    authorityReaderFailureBlockedBeforeSpawn:
      unavailable?.failureCode === 'authority-unavailable' &&
      isLocalTrainingProcessCleanupAuthorized(unavailable),
    contractTamperBlocked: (() => {
      try {
        assertLocalTrainingProcessSupervisorContract({
          ...contract,
          contractHash: '0'.repeat(64),
        });
        return false;
      } catch {
        return true;
      }
    })(),
    invalidResultBlockedAfterQuiescence:
      invalidResult?.failureCode === 'invalid-result' &&
      invalidResult?.lifecycle?.processGroupAbsenceConfirmed === true &&
      isLocalTrainingProcessCleanupAuthorized(invalidResult),
    midRunRevocationTerminatesGroup:
      revoked?.failureCode === 'authority-revoked' &&
      revoked?.lifecycle?.terminationRequested === true &&
      revoked?.lifecycle?.processGroupAbsenceConfirmed === true &&
      revoked?.lifecycle?.authorityChecks?.periodic > 0 &&
      isLocalTrainingProcessCleanupAuthorized(revoked),
    signalPolicyIsLiveLeaderOnly:
      contract.signalPolicy === 'live-leader-sigkill',
    successfulFixtureChecksAuthorityAndQuiescence:
      successful.result?.status === 'completed' &&
      successful.lifecycle.authorityChecks.beforeSpawn === 1 &&
      successful.lifecycle.authorityChecks.beforeResult === 1 &&
      successful.lifecycle.authorityChecks.periodic > 0 &&
      successful.lifecycle.processGroupAbsenceConfirmed === true &&
      successful.lifecycle.terminationRequested === false,
    timeoutTerminatesGroup:
      timedOut?.failureCode === 'timeout' &&
      timedOut?.lifecycle?.terminationRequested === true &&
      timedOut?.lifecycle?.processGroupAbsenceConfirmed === true &&
      isLocalTrainingProcessCleanupAuthorized(timedOut),
  };
  assert.equal(
    Object.values(failureGuards).every(Boolean),
    true,
    'every local training process supervisor guard must pass',
  );

  const evidence = {
    adapterBinding: {
      adapterContractHash: adapterEvidence.contract.contractHash,
      integrationGate:
        adapterEvidence.contract.remainingGates.find(
          (gate) => gate === 'mlx-process-supervisor-integration',
        ),
      supervisorContractHash:
        adapterEvidence.contract.processSupervisor.contractHash,
    },
    claimBoundary: {
      actualDependencyInstallationPerformed: false,
      actualFixtureProcessSpawned: true,
      actualMlxProcessSpawned: false,
      actualModelDownloadPerformed: false,
      actualModelTrainingExecuted: false,
      externalProviderCalls: 'none',
      externalSubmissionAuthorized: false,
      mlxProcessSupervisorIntegrated: false,
      permissionRevocationMonitoringValidated: true,
      processGroupLifecycleValidated: true,
      productionReadyClaim: false,
      rolloutAuthorized: false,
      trainingAuthorized: false,
    },
    costFree: true,
    failureGuards,
    mode: 'local-fixture-process-supervisor',
    schemaVersion:
      LOCAL_TRAINING_PROCESS_SUPERVISOR_EVIDENCE_SCHEMA_VERSION,
    supervisor: {
      authorityMonitoring:
        successful.lifecycle.authorityMonitoring,
      cleanupGate: contract.cleanupGate,
      contractHash: contract.contractHash,
      failureCodeCount: contract.failureCodes.length,
      processGroupIsolation: contract.processGroupIsolation,
      schemaVersion: contract.schemaVersion,
      signalPolicy: contract.signalPolicy,
    },
  };
  const evidenceHash = hashRecord(evidence);
  return {
    ...evidence,
    evidenceHash,
    id: `local-training-process-supervisor-evidence-${evidenceHash}`,
  };
}
