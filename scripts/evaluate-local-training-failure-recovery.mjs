import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildLocalTrainingFailureCleanupRequest,
  cleanupLocalTrainingFailureRecovery,
  commitLocalTrainingFailureRecovery,
  LOCAL_TRAINING_FAILURE_CLEANUP_REQUEST_SCHEMA_VERSION,
  LOCAL_TRAINING_FAILURE_RECOVERY_INTENT_SCHEMA_VERSION,
  LOCAL_TRAINING_FAILURE_RECOVERY_RECEIPT_SCHEMA_VERSION,
  LOCAL_TRAINING_FAILURE_RECOVERY_STATE_SCHEMA_VERSION,
  markLocalTrainingFailureRecoveryPublished,
  markLocalTrainingFailureRecoveryPublishIntent,
  openLocalTrainingFailureRecovery,
  recoverLocalTrainingFailure,
} from '../src/core/local-training-failure-recovery.mjs';
import {
  evaluateMlxLmLoraTrainingAdapter,
} from './evaluate-mlx-lm-lora-training-adapter.mjs';

export const LOCAL_TRAINING_FAILURE_RECOVERY_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-failure-recovery-evidence/v1';

const STARTED_AT = '2026-07-22T04:00:00.000Z';
const PUBLISHED_AT = '2026-07-22T04:00:01.000Z';
const CLEANED_AT = '2026-07-22T04:00:02.000Z';

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function writePrivateFile(filename, content) {
  fs.writeFileSync(filename, content, { mode: 0o600 });
  fs.chmodSync(filename, 0o600);
}

function createFixture() {
  const repoDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'local-training-recovery-evidence-'),
  );
  const workspaceParent = path.join(
    repoDir,
    'var/local-training/workspaces',
  );
  const candidateParent = path.join(
    repoDir,
    'var/local-training/candidates',
  );
  fs.mkdirSync(workspaceParent, { mode: 0o700, recursive: true });
  fs.mkdirSync(candidateParent, { mode: 0o700, recursive: true });
  for (const directory of [
    path.join(repoDir, 'var'),
    path.join(repoDir, 'var/local-training'),
    workspaceParent,
    candidateParent,
  ]) {
    fs.chmodSync(directory, 0o700);
  }
  const workspaceRoot = fs.mkdtempSync(
    path.join(workspaceParent, 'mlx-lm-lora-'),
  );
  fs.chmodSync(workspaceRoot, 0o700);
  const approvalHash = sha256('recovery-evidence-approval');
  const approvalId = `local-training-approval-${approvalHash}`;
  const candidateRoot = path.join(candidateParent, approvalId);
  const bindings = {
    acquisitionVerification: {
      hash: sha256('recovery-evidence-acquisition'),
      id: `local-training-acquisition-verification-${sha256('acquisition-id')}`,
    },
    approval: { hash: approvalHash, id: approvalId },
    contractHash: sha256('recovery-evidence-adapter-contract'),
    dataset: {
      datasetHash: sha256('recovery-evidence-dataset'),
      readinessHash: sha256('recovery-evidence-readiness'),
      trainSha256: sha256('recovery-evidence-train'),
      validationSha256: sha256('recovery-evidence-validation'),
    },
    maxDiskBytes: 1024 * 1024,
    permission: {
      hash: sha256('recovery-evidence-permission'),
      id: `local-training-permission-${sha256('permission-id')}`,
    },
    postAcquisitionReadiness: {
      hash: sha256('recovery-evidence-post-acquisition'),
      id: `local-training-post-acquisition-readiness-${sha256('post-id')}`,
    },
    rollbackOwner: 'local-recovery-evidence-owner',
  };
  const operation = openLocalTrainingFailureRecovery({
    bindings,
    candidateRoot,
    leaseExpiresAt: '2026-07-22T04:05:00.000Z',
    repoDir,
    startedAt: STARTED_AT,
    workspaceRoot,
  });
  return {
    bindings,
    candidateRoot,
    cleanup() {
      fs.rmSync(repoDir, { force: true, recursive: true });
    },
    operation,
    operationRoot: path.join(
      repoDir,
      'var/local-training/recovery',
      operation.operationId,
    ),
    repoDir,
    workspaceRoot,
  };
}

function publishCandidate(fixture) {
  const dataRoot = path.join(fixture.workspaceRoot, 'data');
  const stagedCandidate = path.join(fixture.workspaceRoot, 'candidate');
  const artifactRoot = path.join(stagedCandidate, 'artifact');
  for (const directory of [dataRoot, stagedCandidate, artifactRoot]) {
    fs.mkdirSync(directory, { mode: 0o700 });
    fs.chmodSync(directory, 0o700);
  }
  writePrivateFile(
    path.join(dataRoot, 'train.jsonl'),
    'PRIVATE-F1-EVIDENCE-ROW\n',
  );
  writePrivateFile(
    path.join(artifactRoot, 'adapter_config.json'),
    '{"fixture":true}\n',
  );
  writePrivateFile(
    path.join(artifactRoot, 'adapters.safetensors'),
    'fixture-recovery-adapter',
  );
  const candidateManifestContent = '{"fixture":"recovery"}\n';
  writePrivateFile(
    path.join(stagedCandidate, 'candidate-manifest.json'),
    candidateManifestContent,
  );
  markLocalTrainingFailureRecoveryPublishIntent(
    fixture.operation,
    {
      candidateManifestHash: sha256(candidateManifestContent),
      stagedCandidateRoot: stagedCandidate,
      updatedAt: PUBLISHED_AT,
    },
  );
  fs.renameSync(stagedCandidate, fixture.candidateRoot);
  markLocalTrainingFailureRecoveryPublished(fixture.operation, {
    candidateRoot: fixture.candidateRoot,
    updatedAt: PUBLISHED_AT,
  });
  return sha256(candidateManifestContent);
}

export async function evaluateLocalTrainingFailureRecovery({
  repoDir = process.cwd(),
} = {}) {
  const adapterEvidence =
    await evaluateMlxLmLoraTrainingAdapter({ repoDir });
  const fixture = createFixture();
  const successFixture = createFixture();
  const originalUnlinkSync = fs.unlinkSync;
  const originalRmdirSync = fs.rmdirSync;
  let candidateFailureInjected = false;
  try {
    publishCandidate(successFixture);
    const successWorkspaceCanonical = fs.realpathSync(
      successFixture.workspaceRoot,
    );
    let successCleanupInterrupted = false;
    fs.rmdirSync = (directory) => {
      if (
        !successCleanupInterrupted &&
        String(directory) === successWorkspaceCanonical
      ) {
        successCleanupInterrupted = true;
        throw new Error('PRIVATE-SUCCESS-CLEANUP-INTERRUPTION');
      }
      return originalRmdirSync(directory);
    };
    assert.throws(
      () => commitLocalTrainingFailureRecovery(
        successFixture.operation,
        { completedAt: CLEANED_AT },
      ),
      /PRIVATE-SUCCESS-CLEANUP-INTERRUPTION/,
    );
    fs.rmdirSync = originalRmdirSync;
    const pendingSuccessState = JSON.parse(fs.readFileSync(
      path.join(successFixture.operationRoot, 'state.json'),
      'utf8',
    ));
    const successReceipt = commitLocalTrainingFailureRecovery(
      successFixture.operation,
      { completedAt: CLEANED_AT },
    );

    const candidateManifestHash = publishCandidate(fixture);
    const publishedState = JSON.parse(fs.readFileSync(
      path.join(fixture.operationRoot, 'state.json'),
      'utf8',
    ));
    fs.unlinkSync = (filename) => {
      if (
        !candidateFailureInjected &&
        String(filename).includes('/candidates/')
      ) {
        candidateFailureInjected = true;
        throw new Error('PRIVATE-FAILURE-MUST-NOT-PERSIST');
      }
      return originalUnlinkSync(filename);
    };
    let partialCleanupFailed = false;
    try {
      cleanupLocalTrainingFailureRecovery(fixture.operation, {
        completedAt: CLEANED_AT,
      });
    } catch {
      partialCleanupFailed = true;
    } finally {
      fs.unlinkSync = originalUnlinkSync;
    }

    const workspaceRemovedBeforeRecovery =
      !fs.existsSync(fixture.workspaceRoot);
    const candidatePreservedAfterPartialFailure =
      fs.existsSync(fixture.candidateRoot);
    const cleanupRequest =
      buildLocalTrainingFailureCleanupRequest({
        expiresAt: '2026-07-22T04:10:00.000Z',
        operationId: fixture.operation.operationId,
        repoDir: fixture.repoDir,
        requestedAt: '2026-07-22T04:00:03.000Z',
        requestedBy: fixture.bindings.rollbackOwner,
      });
    const receipt = recoverLocalTrainingFailure({
      cleanupRequest,
      recoveredAt: '2026-07-22T04:00:04.000Z',
      repoDir: fixture.repoDir,
    });
    const replay = recoverLocalTrainingFailure({
      cleanupRequest,
      recoveredAt: '2026-07-22T04:00:05.000Z',
      repoDir: fixture.repoDir,
    });
    const records = fs.readdirSync(fixture.operationRoot)
      .filter((filename) => filename.endsWith('.json'))
      .map((filename) => fs.readFileSync(
        path.join(fixture.operationRoot, filename),
        'utf8',
      ))
      .join('\n');

    const failureGuards = {
      actualProcessExecutionStillBlocked:
        adapterEvidence.claimBoundary.actualMlxProcessSpawned === false,
      adapterDurableRecoveryReceiptBound:
        adapterEvidence.security.durableFailureRecoveryValidated === true,
      candidateRollbackResumed:
        !fs.existsSync(fixture.candidateRoot),
      cleanupRequestBoundToRollbackOwner:
        cleanupRequest.requestedBy === fixture.bindings.rollbackOwner,
      cleanupRequestBoundToLocalUser:
        cleanupRequest.requestedUserId === process.getuid(),
      cleanupRequestDoesNotAuthorizeTraining:
        cleanupRequest.trainingAuthorized === false,
      candidateManifestHashVerified:
        publishedState.candidateBinding.manifestHash ===
          candidateManifestHash,
      partialCandidateCleanupFailureObserved:
        partialCleanupFailed && candidateFailureInjected,
      rawFailureNotPersisted:
        !records.includes('PRIVATE-FAILURE-MUST-NOT-PERSIST'),
      rawPathNotPersisted: !records.includes(fixture.repoDir),
      rawTrainingDataNotPersisted:
        !records.includes('PRIVATE-F1-EVIDENCE-ROW'),
      successCleanupPendingResumed:
        successCleanupInterrupted &&
        pendingSuccessState.phase === 'success-cleanup-pending' &&
        successReceipt.status === 'succeeded' &&
        !fs.existsSync(successFixture.workspaceRoot) &&
        fs.existsSync(successFixture.candidateRoot),
      terminalReceiptReplayIdempotent:
        JSON.stringify(replay) === JSON.stringify(receipt),
      workspaceRemovedBeforeCandidateRecovery:
        workspaceRemovedBeforeRecovery &&
        candidatePreservedAfterPartialFailure,
    };
    assert.equal(Object.values(failureGuards).every(Boolean), true);
    assert.equal(
      adapterEvidence.contract.remainingGates.includes(
        'durable-failure-recovery-and-explicit-cleanup',
      ),
      false,
    );

    const evidence = {
      claimBoundary: {
        actualDependencyInstallationPerformed: false,
        actualModelDownloadPerformed: false,
        actualModelTrainingExecuted: false,
        actualMlxProcessSpawned: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        productionReadyClaim: false,
        rolloutAuthorized: false,
        trainingAuthorized: false,
      },
      contract: {
        cleanupRequestSchemaVersion:
          LOCAL_TRAINING_FAILURE_CLEANUP_REQUEST_SCHEMA_VERSION,
        intentSchemaVersion:
          LOCAL_TRAINING_FAILURE_RECOVERY_INTENT_SCHEMA_VERSION,
        receiptSchemaVersion:
          LOCAL_TRAINING_FAILURE_RECOVERY_RECEIPT_SCHEMA_VERSION,
        stateSchemaVersion:
          LOCAL_TRAINING_FAILURE_RECOVERY_STATE_SCHEMA_VERSION,
      },
      failureGuards,
      mode: 'local-training-failure-recovery-contract',
      recovery: {
        candidatePreserved: receipt.candidatePreserved,
        cleanupRequestBound:
          receipt.cleanupRequestHash === cleanupRequest.requestHash,
        operationId: fixture.operation.operationId,
        receiptReplayed: replay.receiptHash === receipt.receiptHash,
        status: receipt.status,
        workspaceRemoved: receipt.workspaceRemoved,
      },
      schemaVersion:
        LOCAL_TRAINING_FAILURE_RECOVERY_EVIDENCE_SCHEMA_VERSION,
    };
    const evidenceHash = hashRecord(evidence);
    return {
      ...evidence,
      evidenceHash,
      id: `local-training-failure-recovery-evidence-${evidenceHash}`,
    };
  } finally {
    fs.rmdirSync = originalRmdirSync;
    fs.unlinkSync = originalUnlinkSync;
    successFixture.cleanup();
    fixture.cleanup();
  }
}
