import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildLocalTrainingExecutionApproval,
} from '../src/core/local-training-runtime.mjs';
import {
  buildMlxLmLoraTrainingCleanupRequest,
  createMlxLmLoraTrainingAdapter,
  executeMlxLmLoraTrainingAdapter,
  MLX_LM_LORA_TRAINING_ADAPTER_SCHEMA_VERSION,
  recoverMlxLmLoraTrainingAdapter,
} from '../src/core/mlx-lm-lora-training-adapter.mjs';
import {
  createLocalTrainingPostAcquisitionReadinessFixture,
} from '../scripts/evaluate-local-training-post-acquisition-readiness.mjs';
import {
  LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH,
  LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES,
} from '../scripts/local-training-runtime-closure-fixture.mjs';

const STARTED_AT = '2026-07-17T08:41:00.000Z';

const ADAPTER_ARTIFACT_FILES = {
  trainerFiles: LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES,
};

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

async function buildFixture(options = {}) {
  const fixture =
    await createLocalTrainingPostAcquisitionReadinessFixture({
      acquisitionApprovalExpiresAt:
        options.acquisitionApprovalExpiresAt,
      artifactFiles:
        options.artifactFiles || ADAPTER_ARTIFACT_FILES,
      mode: 'recorded-local-acquisition',
      permissionExpiresAt: options.permissionExpiresAt,
    });
  const adapter = createMlxLmLoraTrainingAdapter({
    acquisition: acquisitionEvidence(fixture),
    repoDir: fixture.fixtureRepoDir,
  });
  return {
    adapter,
    cleanup: fixture.cleanup,
    execute(input) {
      return executeMlxLmLoraTrainingAdapter({
        adapter,
        startedAt: STARTED_AT,
        ...input,
      });
    },
    fixture,
    get observation() {
      return adapter.getLastObservation();
    },
  };
}

function runtimeInput(context, overrides = {}) {
  return {
    approval: buildExecutionApproval(context.fixture),
    currentPermission: context.fixture.permission,
    permissionRevocation: null,
    postAcquisitionReadiness:
      context.fixture.postAcquisitionReadiness,
    readinessPackage: context.fixture.readinessPackage,
    ...overrides,
  };
}

test('MLX-LM adapter replays the approved F1 packet into a fixed offline candidate flow', async () => {
  const context = await buildFixture();
  try {
    const input = runtimeInput(context);
    const result = await context.execute(input);

    assert.equal(
      context.adapter.contract.schemaVersion,
      MLX_LM_LORA_TRAINING_ADAPTER_SCHEMA_VERSION,
    );
    assert.equal(context.adapter.contract.actualMlxProcessSpawned, false);
    assert.equal(
      context.adapter.contract.dynamicRuntimeClosureComplete,
      false,
    );
    assert.equal(context.adapter.contract.nativeClosureComplete, false);
    assert.equal(
      context.adapter.contract.actualMlxMemoryLimitEnforced,
      false,
    );
    assert.equal(
      context.adapter.contract.actualMlxOsIsolationIntegrated,
      false,
    );
    assert.equal(
      context.adapter.contract.osIsolationContractValidated,
      true,
    );
    assert.match(
      context.adapter.contract.osIsolation.contractHash,
      /^[a-f0-9]{64}$/,
    );
    assert.equal(context.adapter.contract.trainingAuthorized, false);
    assert.equal(context.adapter.contract.verifyToExecClosed, false);
    assert.equal(
      context.adapter.contract.processSupervisorContractValidated,
      true,
    );
    assert.match(
      context.adapter.contract.processSupervisor.contractHash,
      /^[a-f0-9]{64}$/,
    );
    assert.deepEqual(
      context.observation.fixedArgumentOrder,
      [
        '--model',
        '--train',
        '--data',
        '--fine-tune-type',
        'lora',
        '--adapter-path',
      ],
    );
    assert.match(context.observation.commandSha256, /^[a-f0-9]{64}$/);
    assert.match(
      context.observation.runtimeClosureProvenanceHash,
      /^[a-f0-9]{64}$/,
    );
    assert.equal(
      context.observation.staticRuntimeClosureValidated,
      true,
    );
    assert.equal(context.observation.nativeClosureComplete, false);
    assert.equal(
      context.observation.dynamicRuntimeClosureComplete,
      false,
    );
    assert.equal(context.observation.verifyToExecClosed, false);
    assert.equal(
      context.observation.osIsolationContractValidated,
      true,
    );
    assert.equal(
      context.observation.osIsolationContractHash,
      context.adapter.contract.osIsolation.contractHash,
    );
    assert.equal(
      context.observation.processSupervisorContractValidated,
      true,
    );
    assert.equal(
      context.observation.processSupervisorContractHash,
      context.adapter.contract.processSupervisor.contractHash,
    );
    assert.equal(result.executionKind, 'fixture-simulated');
    assert.equal(
      result.trainerReportedActualModelTrainingExecuted,
      false,
    );
    assert.equal(
      context.observation.candidateArtifactSha256,
      result.candidate.artifactSha256,
    );
    assert.equal(context.observation.actualMlxProcessSpawned, false);
    assert.equal(context.observation.candidateFileCount, 2);
    assert.equal(
      context.observation.fixtureInvocationContractExercised,
      true,
    );
    assert.deepEqual(
      context.observation.environmentKeys,
      [
        'HF_DATASETS_CACHE',
        'HF_DATASETS_OFFLINE',
        'HF_HOME',
        'HF_HUB_OFFLINE',
        'HOME',
        'LANG',
        'LC_ALL',
        'TMPDIR',
        'TOKENIZERS_PARALLELISM',
        'TRANSFORMERS_CACHE',
        'TRANSFORMERS_OFFLINE',
        'XDG_CACHE_HOME',
      ],
    );
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter refuses stale or revoked authority before candidate creation', async () => {
  const context = await buildFixture();
  try {
    await assert.rejects(
      context.execute(runtimeInput(context, {
        permissionRevocation: { status: 'revoked' },
      })),
      /product-permission/,
    );
    assert.equal(context.observation, null);

    const stalePermission = {
      ...context.fixture.permission,
      id: 'local-training-permission-stale',
    };
    await assert.rejects(
      context.execute(runtimeInput(context, {
        currentPermission: stalePermission,
      })),
      /product-permission/,
    );
    assert.equal(context.observation, null);
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter binds fixture approval to the acquired training target', async () => {
  const context = await buildFixture();
  try {
    const target = context.fixture.postAcquisitionReadiness.trainingTarget;
    const unboundApproval = buildLocalTrainingExecutionApproval({
      approvedAt: context.fixture.permission.resolvedAt,
      approvedBy: context.fixture.permission.resolvedBy,
      baseModelId: 'Different/Unbound-Model',
      executionKind: 'fixture-simulated',
      expiresAt: context.fixture.permission.expiresAt,
      readinessPackage: context.fixture.readinessPackage,
      rollbackOwner: target.rollbackOwner,
      trainerId: target.trainerId,
    });
    await assert.rejects(
      context.execute(runtimeInput(context, {
        approval: unboundApproval,
      })),
      /approval target is unbound/,
    );
    assert.equal(context.observation, null);
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter refuses unlisted acquisition files before candidate creation', async () => {
  const context = await buildFixture();
  try {
    fs.writeFileSync(
      path.join(context.fixture.trainerRoot, 'unlisted.py'),
      'raise RuntimeError("must not load")\n',
    );
    await assert.rejects(
      context.execute(runtimeInput(context)),
      /inventory is incomplete or contains unlisted files/,
    );
    assert.equal(context.observation, null);
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter refuses custom source-model code before candidate creation', async () => {
  const context = await buildFixture({
    artifactFiles: {
      ...ADAPTER_ARTIFACT_FILES,
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
    },
  });
  try {
    await assert.rejects(
      context.execute(runtimeInput(context)),
      /rejects custom source-model code/,
    );
    assert.equal(context.observation, null);
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter keeps actual process execution fail-closed', async () => {
  const context = await buildFixture();
  try {
    assert.throws(
      () => createMlxLmLoraTrainingAdapter({
        acquisition: acquisitionEvidence(context.fixture),
        executionMode: 'recorded-local-training',
        repoDir: context.fixture.fixtureRepoDir,
      }),
      /blocked until OS execution guards are implemented/,
    );
    assert.equal(context.observation, null);
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter refuses an unsafe runtime closure before workspace creation', async () => {
  for (const trainerFiles of [
    LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES.map((file) =>
      file.path === LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH
        ? {
            ...file,
            content:
              'module = __import__("mlx_lm.lora")\nmodule.main()\n',
          }
        : file),
    LOCAL_TRAINING_RUNTIME_CLOSURE_TRAINER_FILES.map((file) =>
      file.path === 'runtime/bin/python3'
        ? { ...file, mode: 0o600 }
        : file),
  ]) {
    const fixture =
      await createLocalTrainingPostAcquisitionReadinessFixture({
        artifactFiles: { trainerFiles },
        mode: 'recorded-local-acquisition',
      });
    try {
      assert.throws(
        () => createMlxLmLoraTrainingAdapter({
          acquisition: acquisitionEvidence(fixture),
          repoDir: fixture.fixtureRepoDir,
        }),
        /unsupported custom import hooks|must be executable/,
      );
      assert.equal(
        fs.existsSync(path.join(
          fixture.fixtureRepoDir,
          'var/local-training/workspaces',
        )),
        false,
      );
    } finally {
      fixture.cleanup();
    }
  }
});

test('MLX-LM adapter keeps completed acquisition valid after its approval expires', async () => {
  const context = await buildFixture({
    acquisitionApprovalExpiresAt: '2026-07-17T08:40:30.000Z',
    permissionExpiresAt: '2026-07-17T09:30:00.000Z',
  });
  try {
    const result = await executeMlxLmLoraTrainingAdapter({
      adapter: context.adapter,
      startedAt: '2026-07-17T08:41:00.000Z',
      ...runtimeInput(context),
    });
    assert.equal(result.status, 'completed');
    assert.equal(result.executionKind, 'fixture-simulated');
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter rejects hard-linked acquisition files before candidate creation', async () => {
  const context = await buildFixture();
  try {
    const approval = buildExecutionApproval(context.fixture);
    fs.linkSync(
      path.join(
        context.fixture.trainerRoot,
        LOCAL_TRAINING_RUNTIME_CLOSURE_ENTRY_PATH,
      ),
      path.join(context.fixture.fixtureRepoDir, 'trainer-entry-hardlink'),
    );
    await assert.rejects(
      context.execute(runtimeInput(context, { approval })),
      /contained regular file/,
    );
    assert.equal(
      fs.existsSync(path.join(
        context.fixture.fixtureRepoDir,
        'var/local-training/candidates',
        approval.id,
      )),
      false,
    );
  } finally {
    context.cleanup();
  }
});

test('MLX-LM executor accepts only a module-issued adapter', async () => {
  const context = await buildFixture();
  try {
    assert.throws(
      () => executeMlxLmLoraTrainingAdapter({
        adapter: Object.freeze({
          trainerId: context.adapter.trainerId,
        }),
        startedAt: STARTED_AT,
        ...runtimeInput(context),
      }),
      /module-issued MLX-LM adapter/,
    );
    assert.equal(context.observation, null);
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter contract is deeply immutable', async () => {
  const context = await buildFixture();
  try {
    assert.throws(
      () => {
        context.adapter.contract.remainingGates.push('forged-gate');
      },
      TypeError,
    );
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter removes a published candidate when workspace cleanup fails', async () => {
  const context = await buildFixture();
  const approval = buildExecutionApproval(context.fixture);
  const originalRmdirSync = fs.rmdirSync;
  let cleanupFailureInjected = false;
  fs.rmdirSync = (target, options) => {
    if (
      !cleanupFailureInjected &&
      String(target).includes('/var/local-training/workspaces/mlx-lm-lora-')
    ) {
      cleanupFailureInjected = true;
      throw new Error('injected workspace cleanup failure');
    }
    return originalRmdirSync(target, options);
  };
  try {
    await assert.rejects(
      context.execute(runtimeInput(context, { approval })),
      /workspace cleanup failed; published candidate was removed/,
    );
  } finally {
    fs.rmdirSync = originalRmdirSync;
  }
  try {
    assert.equal(cleanupFailureInjected, true);
    assert.equal(context.observation, null);
    assert.equal(
      fs.existsSync(path.join(
        context.fixture.fixtureRepoDir,
        'var/local-training/candidates',
        approval.id,
      )),
      false,
    );
  } finally {
    context.cleanup();
  }
});

test('MLX-LM adapter resumes durable cleanup after workspace and rollback both fail', async () => {
  const context = await buildFixture();
  const approval = buildExecutionApproval(context.fixture);
  const originalRmdirSync = fs.rmdirSync;
  fs.rmdirSync = (target, options) => {
    if (
      String(target).includes(
        '/var/local-training/workspaces/mlx-lm-lora-',
      )
    ) {
      throw new Error('injected durable cleanup failure');
    }
    return originalRmdirSync(target, options);
  };
  try {
    await assert.rejects(
      context.execute(runtimeInput(context, { approval })),
      /workspace cleanup and candidate rollback failed/,
    );
  } finally {
    fs.rmdirSync = originalRmdirSync;
  }
  try {
    const candidateRoot = path.join(
      context.fixture.fixtureRepoDir,
      'var/local-training/candidates',
      approval.id,
    );
    const workspaceParent = path.join(
      context.fixture.fixtureRepoDir,
      'var/local-training/workspaces',
    );
    assert.equal(fs.existsSync(candidateRoot), true);
    assert.equal(
      fs.readdirSync(workspaceParent).some(
        (name) => name.startsWith('mlx-lm-lora-'),
      ),
      true,
    );

    const recoveryAdapter = createMlxLmLoraTrainingAdapter({
      acquisition: acquisitionEvidence(context.fixture),
      repoDir: context.fixture.fixtureRepoDir,
    });
    const cleanupRequest = buildMlxLmLoraTrainingCleanupRequest({
      adapter: recoveryAdapter,
      approval,
      currentPermission: context.fixture.permission,
      expiresAt: '2026-07-17T10:05:00.000Z',
      postAcquisitionReadiness:
        context.fixture.postAcquisitionReadiness,
      readinessPackage: context.fixture.readinessPackage,
      requestedAt: '2026-07-17T10:00:00.000Z',
      requestedBy: approval.rollbackOwner,
    });
    const receipt = recoverMlxLmLoraTrainingAdapter({
      adapter: recoveryAdapter,
      cleanupRequest,
      recoveredAt: '2026-07-17T10:01:00.000Z',
    });

    assert.equal(receipt.status, 'failed-cleaned');
    assert.equal(receipt.actualModelTrainingExecuted, false);
    assert.equal(receipt.trainingAuthorized, false);
    assert.equal(fs.existsSync(candidateRoot), false);
    assert.equal(
      fs.readdirSync(workspaceParent).some(
        (name) => name.startsWith('mlx-lm-lora-'),
      ),
      false,
    );
    assert.equal(recoveryAdapter.getLastObservation(), null);
    assert.deepEqual(
      recoverMlxLmLoraTrainingAdapter({
        adapter: recoveryAdapter,
        cleanupRequest,
        recoveredAt: '2026-07-17T10:02:00.000Z',
      }),
      receipt,
    );
  } finally {
    context.cleanup();
  }
});
