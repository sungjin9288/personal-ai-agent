import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildLocalTrainingCandidateArtifactManifest,
} from '../src/core/local-training-candidate-artifact-verification.mjs';
import {
  buildLocalTrainingExecutionApproval,
} from '../src/core/local-training-runtime.mjs';
import {
  createMlxLmLoraTrainingAdapter,
  executeMlxLmLoraTrainingAdapter,
  MLX_LM_LORA_TRAINING_ADAPTER_SCHEMA_VERSION,
} from '../src/core/mlx-lm-lora-training-adapter.mjs';
import {
  createLocalTrainingPostAcquisitionReadinessFixture,
} from './evaluate-local-training-post-acquisition-readiness.mjs';

export const MLX_LM_LORA_TRAINING_ADAPTER_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-mlx-lm-lora-training-adapter-evidence/v1';

const STARTED_AT = '2026-07-17T08:41:00.000Z';
const TRAINER_FILES = [{
  content: '#!/usr/bin/env python3\n# fixture executable; never spawned\n',
  mode: 0o700,
  path: 'bin/mlx_lm.lora',
}];

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function acquisitionEvidence(fixture) {
  return {
    approval: fixture.approval,
    plan: fixture.plan,
    sourceModelManifestPath: fixture.sourceModelManifestPath,
    toolchainDecision: fixture.toolchainDecision,
    trainerPackageManifestPath: fixture.trainerPackageManifestPath,
    verification: fixture.verification,
  };
}

function buildExecutionApproval(fixture) {
  const target = fixture.postAcquisitionReadiness.trainingTarget;
  return buildLocalTrainingExecutionApproval({
    approvedAt: fixture.permission.resolvedAt,
    approvedBy: fixture.permission.resolvedBy,
    baseModelId: target.baseModelId,
    executionKind: 'fixture-simulated',
    expiresAt: fixture.permission.expiresAt,
    permission: fixture.permission,
    readinessPackage: fixture.readinessPackage,
    rollbackOwner: target.rollbackOwner,
    trainerId: target.trainerId,
  });
}

function runtimeInput(fixture, approval, overrides = {}) {
  return {
    approval,
    currentPermission: fixture.permission,
    permissionRevocation: null,
    postAcquisitionReadiness: fixture.postAcquisitionReadiness,
    readinessPackage: fixture.readinessPackage,
    ...overrides,
  };
}

function executeAdapter(adapter, fixture, approval, overrides = {}) {
  return executeMlxLmLoraTrainingAdapter({
    adapter,
    startedAt: STARTED_AT,
    ...runtimeInput(fixture, approval, overrides),
  });
}

function verifyPublishedCandidate({
  approval,
  fixture,
  result,
}) {
  const candidateRoot = path.join(
    fixture.fixtureRepoDir,
    'var/local-training/candidates',
    approval.id,
  );
  const artifactRoot = path.join(candidateRoot, 'artifact');
  const manifest = JSON.parse(fs.readFileSync(
    path.join(candidateRoot, 'candidate-manifest.json'),
    'utf8',
  ));
  const files = fs.readdirSync(artifactRoot)
    .sort()
    .map((relativePath) => {
      const content = fs.readFileSync(path.join(
        artifactRoot,
        relativePath,
      ));
      return {
        bytes: content.byteLength,
        path: relativePath,
        sha256: createHash('sha256').update(content).digest('hex'),
      };
    });
  const rebuilt = buildLocalTrainingCandidateArtifactManifest({
    approval,
    artifactFormat: result.candidate.artifactFormat,
    files,
    modelId: result.candidate.modelId,
    readinessPackage: fixture.readinessPackage,
  });
  return {
    artifactFileCount: files.length,
    independentVerificationPassed:
      JSON.stringify(manifest) === JSON.stringify(rebuilt),
    manifestBoundToAdapterResult:
      manifest.artifactSetSha256 ===
        result.candidate.artifactSha256,
    status: 'fixture-adapter-candidate-reinspected-no-training',
  };
}

async function rejectionMatches(operation, pattern) {
  try {
    await operation();
    return false;
  } catch (error) {
    return pattern.test(String(error?.message || ''));
  }
}

export async function evaluateMlxLmLoraTrainingAdapter({
  repoDir = process.cwd(),
} = {}) {
  const fixture =
    await createLocalTrainingPostAcquisitionReadinessFixture({
      artifactFiles: { trainerFiles: TRAINER_FILES },
      mode: 'recorded-local-acquisition',
      repoDir,
    });
  let cleanupFixture;
  let unsafeFixture;
  try {
    const adapter = createMlxLmLoraTrainingAdapter({
      acquisition: acquisitionEvidence(fixture),
      repoDir: fixture.fixtureRepoDir,
    });
    const approval = buildExecutionApproval(fixture);

    const failureGuards = {
      actualExecutionModeBlocked: (() => {
        try {
          createMlxLmLoraTrainingAdapter({
            acquisition: acquisitionEvidence(fixture),
            executionMode: 'recorded-local-training',
            repoDir: fixture.fixtureRepoDir,
          });
          return false;
        } catch (error) {
          return /OS execution guards/.test(error.message);
        }
      })(),
      approvalTargetDriftBlocked: await rejectionMatches(
        () => executeAdapter(
          adapter,
          fixture,
          buildLocalTrainingExecutionApproval({
            approvedAt: fixture.permission.resolvedAt,
            approvedBy: fixture.permission.resolvedBy,
            baseModelId: 'Different/Unbound-Model',
            executionKind: 'fixture-simulated',
            expiresAt: fixture.permission.expiresAt,
            readinessPackage: fixture.readinessPackage,
            rollbackOwner:
              fixture.postAcquisitionReadiness.trainingTarget
                .rollbackOwner,
            trainerId:
              fixture.postAcquisitionReadiness.trainingTarget
                .trainerId,
          }),
        ),
        /approval target is unbound/,
      ),
      permissionRevocationBlockedBeforeCandidate:
        await rejectionMatches(
          () => executeAdapter(adapter, fixture, approval, {
            permissionRevocation: { status: 'revoked' },
          }),
          /product-permission/,
        ),
      stalePermissionBlockedBeforeCandidate:
        await rejectionMatches(
          () => executeAdapter(adapter, fixture, approval, {
            currentPermission: {
              ...fixture.permission,
              id: 'local-training-permission-stale',
            },
          }),
          /product-permission/,
        ),
    };
    const unlistedFile = path.join(
      fixture.trainerRoot,
      'unlisted-runtime.py',
    );
    fs.writeFileSync(unlistedFile, 'raise RuntimeError("blocked")\n');
    failureGuards.unlistedTrainerFileBlockedBeforeCandidate =
      await rejectionMatches(
        () => executeAdapter(adapter, fixture, approval),
        /inventory is incomplete or contains unlisted files/,
      );
    fs.rmSync(unlistedFile);
    const trainerHardlink = path.join(
      fixture.fixtureRepoDir,
      'trainer-entry-hardlink',
    );
    fs.linkSync(
      path.join(fixture.trainerRoot, 'bin/mlx_lm.lora'),
      trainerHardlink,
    );
    failureGuards.hardLinkedTrainerFileBlockedBeforeCandidate =
      await rejectionMatches(
        () => executeAdapter(adapter, fixture, approval),
        /contained regular file/,
      );
    fs.rmSync(trainerHardlink);
    assert.equal(adapter.getLastObservation(), null);

    unsafeFixture =
      await createLocalTrainingPostAcquisitionReadinessFixture({
        artifactFiles: {
          sourceFiles: [
            {
              content:
                '{"auto_map":{"AutoModel":"modeling.Custom"}}\n',
              path: 'config.json',
            },
            {
              content: 'fixture-source-model-weights',
              path: 'model.safetensors',
            },
          ],
          trainerFiles: TRAINER_FILES,
        },
        mode: 'recorded-local-acquisition',
        repoDir,
      });
    const unsafeAdapter = createMlxLmLoraTrainingAdapter({
      acquisition: acquisitionEvidence(unsafeFixture),
      repoDir: unsafeFixture.fixtureRepoDir,
    });
    const unsafeApproval = buildExecutionApproval(unsafeFixture);
    failureGuards.customSourceModelCodeBlockedBeforeCandidate =
      await rejectionMatches(
        () => executeAdapter(
          unsafeAdapter,
          unsafeFixture,
          unsafeApproval,
        ),
        /rejects custom source-model code/,
      );
    failureGuards.customSourceModelProducedNoObservation =
      unsafeAdapter.getLastObservation() === null;

    failureGuards.forgedAdapterBlocked = await rejectionMatches(
      () => executeAdapter(
        Object.freeze({ trainerId: adapter.trainerId }),
        fixture,
        approval,
      ),
      /module-issued MLX-LM adapter/,
    );

    cleanupFixture =
      await createLocalTrainingPostAcquisitionReadinessFixture({
        artifactFiles: { trainerFiles: TRAINER_FILES },
        mode: 'recorded-local-acquisition',
        repoDir,
      });
    const cleanupAdapter = createMlxLmLoraTrainingAdapter({
      acquisition: acquisitionEvidence(cleanupFixture),
      repoDir: cleanupFixture.fixtureRepoDir,
    });
    const cleanupApproval = buildExecutionApproval(cleanupFixture);
    const originalRmdirSync = fs.rmdirSync;
    let cleanupFailureInjected = false;
    fs.rmdirSync = (target, options) => {
      const normalizedTarget = String(target)
        .split(path.sep)
        .join('/');
      if (
        !cleanupFailureInjected &&
        normalizedTarget.includes(
          '/var/local-training/workspaces/mlx-lm-lora-',
        )
      ) {
        cleanupFailureInjected = true;
        throw new Error('injected workspace cleanup failure');
      }
      return originalRmdirSync(target, options);
    };
    try {
      failureGuards.workspaceCleanupFailureRejected =
        await rejectionMatches(
          () => executeAdapter(
            cleanupAdapter,
            cleanupFixture,
            cleanupApproval,
          ),
          /workspace cleanup failed; published candidate was removed/,
        );
    } finally {
      fs.rmdirSync = originalRmdirSync;
    }
    failureGuards.workspaceCleanupFailureRemovedCandidate =
      cleanupFailureInjected &&
      !fs.existsSync(path.join(
        cleanupFixture.fixtureRepoDir,
        'var/local-training/candidates',
        cleanupApproval.id,
      ));
    failureGuards.workspaceCleanupFailureProducedNoObservation =
      cleanupAdapter.getLastObservation() === null;

    const result = await executeAdapter(adapter, fixture, approval);
    const candidateVerification = verifyPublishedCandidate({
      approval,
      fixture,
      result,
    });
    const observation = adapter.getLastObservation();
    failureGuards.existingCandidateOverwriteBlocked =
      await rejectionMatches(
        () => executeAdapter(adapter, fixture, approval),
        /refuses to overwrite an existing candidate/,
      );
    failureGuards.candidatePublishedOnlyAfterAllPreconditions =
      observation?.candidatePublished === true;
    failureGuards.durableRecoveryReceiptBoundToSuccess = Boolean(
      observation?.durableFailureRecoveryValidated === true &&
      /^local-training-recovery-[a-f0-9]{64}$/u.test(
        observation?.recoveryOperationId || '',
      ) &&
      /^[a-f0-9]{64}$/u.test(
        observation?.recoveryReceiptHash || '',
      ) &&
      observation?.workspaceRemovedBeforeObservation === true,
    );

    assert.equal(
      Object.values(failureGuards).every(Boolean),
      true,
      'every MLX-LM adapter failure guard must pass',
    );
    assert.ok(observation);

    const evidence = {
      candidate: {
        artifactFileCount: observation.candidateFileCount,
        independentVerificationPassed:
          candidateVerification.independentVerificationPassed,
        manifestBoundToAdapterResult:
          candidateVerification.manifestBoundToAdapterResult,
        status: candidateVerification.status,
      },
      claimBoundary: {
        actualDependencyInstallationPerformed: false,
        actualModelDownloadPerformed: false,
        actualModelTrainingExecuted: false,
        actualMlxProcessSpawned: false,
        adapterContractValidated: true,
        candidateEvaluationAuthorized: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        productionReadyClaim: false,
        readyForExplicitCandidateEvaluationRequest: false,
        recordedTrainingRunCreated: false,
        rolloutAuthorized: false,
        trainingAuthorized: false,
      },
      contract: {
        contractHash: adapter.contract.contractHash,
        dataFiles: adapter.contract.dataFiles,
        fixedArgumentOrder: adapter.contract.fixedArgumentOrder,
        remainingGates: adapter.contract.remainingGates,
        schemaVersion: adapter.contract.schemaVersion,
        sourceModel: adapter.contract.sourceModel,
        trainer: adapter.contract.trainer,
      },
      dataset: {
        exactF1TrainBytesMaterialized: true,
        exactF1ValidationBytesMaterializedAsValidJsonl: true,
        trainLineCount:
          fixture.readinessPackage.exports.train.lineCount,
        validationLineCount:
          fixture.readinessPackage.exports.validation.lineCount,
      },
      failureGuards,
      mode: 'mlx-lm-lora-training-adapter-contract',
      schemaVersion:
        MLX_LM_LORA_TRAINING_ADAPTER_EVIDENCE_SCHEMA_VERSION,
      security: {
        acquisitionCompleteInventoryRevalidated: true,
        arbitraryArgumentsAccepted: false,
        candidatePublishedAtomically: true,
        customSourceModelCodeRejected: true,
        durableFailureRecoveryValidated:
          observation.durableFailureRecoveryValidated,
        environmentKeys: observation.environmentKeys,
        inheritedEnvironmentValuesAccepted: false,
        localAbsoluteModelPathRequired: true,
        moduleOwnedFixtureInvocationExercised:
          observation.fixtureInvocationContractExercised,
        ownerOnlyDatasetWorkspace: true,
      },
    };
    assert.equal(
      evidence.contract.schemaVersion,
      MLX_LM_LORA_TRAINING_ADAPTER_SCHEMA_VERSION,
    );
    const evidenceHash = hashRecord(evidence);
    return {
      ...evidence,
      evidenceHash,
      id: `mlx-lm-lora-training-adapter-evidence-${evidenceHash}`,
    };
  } finally {
    cleanupFixture?.cleanup();
    unsafeFixture?.cleanup();
    fixture.cleanup();
  }
}
