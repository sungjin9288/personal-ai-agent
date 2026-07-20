import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildLocalTrainingAcquisitionPlan,
  buildLocalTrainingAcquisitionRequest,
  resolveLocalTrainingAcquisitionRequest,
} from '../src/core/local-training-acquisition-approval.mjs';
import {
  buildLocalTrainingAcquisitionArtifactManifest,
  createLocalTrainingAcquisitionArtifactVerifier,
} from '../src/core/local-training-acquisition-artifact-verification.mjs';
import {
  assertLocalTrainingAcquisitionRun,
  createLocalTrainingAcquisitionRuntime,
  LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
} from '../src/core/local-training-acquisition-runtime.mjs';

const toolchainDecision = JSON.parse(fs.readFileSync(
  new URL(
    '../evidence/output-artifacts/local-training-toolchain-decision.json',
    import.meta.url,
  ),
  'utf8',
));

const DEFAULT_RESOURCE_ENVELOPE = {
  maxConcurrentDownloads: 2,
  maxDiskBytes: 16 * 1024 ** 3,
  maxDownloadBytes: 8 * 1024 ** 3,
  maxRuntimeMs: 60 * 60 * 1000,
};

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return sha256(JSON.stringify(value));
}

function rehashRun(run) {
  const {
    id: ignoredId,
    runHash: ignoredRunHash,
    ...record
  } = run;
  const runHash = hashRecord(record);
  return {
    ...record,
    id: `local-training-acquisition-run-${runHash}`,
    runHash,
  };
}

function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function buildAuthority(resourceEnvelope = DEFAULT_RESOURCE_ENVELOPE) {
  const request = buildLocalTrainingAcquisitionRequest({
    decision: toolchainDecision,
    expiresAt: '2026-07-17T10:00:00.000Z',
    proposedResourceEnvelope: resourceEnvelope,
    requestedAt: '2026-07-17T08:00:00.000Z',
    requestedBy: 'local-operator',
  });
  const approval = resolveLocalTrainingAcquisitionRequest({
    decision: 'approve',
    owners: {
      approvalOwner: 'local-acquisition-owner',
      egressOwner: 'local-security-owner',
      licenseOwner: 'local-license-owner',
      resourceOwner: 'local-resource-owner',
      rollbackOwner: 'local-rollback-owner',
    },
    reason: 'Reviewed bounded artifact verification.',
    request,
    resolvedAt: '2026-07-17T08:10:00.000Z',
    resolvedBy: 'local-acquisition-owner',
    toolchainDecision,
  });
  const plan = buildLocalTrainingAcquisitionPlan({
    approval,
    decision: toolchainDecision,
    now: '2026-07-17T08:20:00.000Z',
  });
  return {
    approval,
    plan,
    request,
    toolchainDecision,
  };
}

async function buildFixture(t, {
  artifactEvidence,
  resourceEnvelope,
  sourceModelContent = 'source-model-weights',
  trainerPackageContent = 'trainer-package-wheel',
} = {}) {
  const authority = buildAuthority(resourceEnvelope);
  const repoDir = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'personal-ai-agent-artifact-verification-',
  ));
  t.after(() => fs.rmSync(repoDir, {
    force: true,
    recursive: true,
  }));

  const artifactRoot = path.join(
    repoDir,
    authority.plan.mutableRoot,
  );
  const manifestRoot = path.join(artifactRoot, 'manifests');
  const sourceRoot = path.join(artifactRoot, 'source-model');
  const trainerRoot = path.join(artifactRoot, 'trainer');
  fs.mkdirSync(manifestRoot, { recursive: true });
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(trainerRoot, { recursive: true });

  const sourceFiles = [
    {
      content: '{"model_type":"qwen2"}\n',
      path: 'config.json',
    },
    {
      content: sourceModelContent,
      path: 'model.safetensors',
    },
  ];
  const trainerFiles = [
    {
      content: trainerPackageContent,
      path: 'package.whl',
    },
  ];
  for (const file of sourceFiles) {
    fs.writeFileSync(path.join(sourceRoot, file.path), file.content);
  }
  for (const file of trainerFiles) {
    fs.writeFileSync(path.join(trainerRoot, file.path), file.content);
  }

  const sourceManifest =
    buildLocalTrainingAcquisitionArtifactManifest({
      artifactKind: 'source-model',
      files: sourceFiles.map((file) => ({
        bytes: Buffer.byteLength(file.content),
        path: file.path,
        sha256: sha256(file.content),
      })),
      identity: {
        id: authority.plan.toolchainDecision.sourceModel.id,
        licenseId:
          authority.plan.toolchainDecision.sourceModel.licenseId,
        revision:
          authority.plan.toolchainDecision.sourceModel.revision,
      },
    });
  const trainerManifest =
    buildLocalTrainingAcquisitionArtifactManifest({
      artifactKind: 'trainer-package',
      files: trainerFiles.map((file) => ({
        bytes: Buffer.byteLength(file.content),
        path: file.path,
        sha256: sha256(file.content),
      })),
      identity: {
        id: authority.plan.toolchainDecision.trainer.id,
        packageName:
          authority.plan.toolchainDecision.trainer.packageName,
        releaseCommit:
          authority.plan.toolchainDecision.trainer.releaseCommit,
        version: authority.plan.toolchainDecision.trainer.version,
      },
    });
  const sourceModelManifestPath = 'manifests/source-model.json';
  const trainerPackageManifestPath =
    'manifests/trainer-package.json';
  writeJson(
    path.join(artifactRoot, sourceModelManifestPath),
    sourceManifest,
  );
  writeJson(
    path.join(artifactRoot, trainerPackageManifestPath),
    trainerManifest,
  );

  const runtime = createLocalTrainingAcquisitionRuntime({
    clock: (() => {
      const timestamps = [
        '2026-07-17T08:30:00.000Z',
        '2026-07-17T08:31:00.000Z',
      ];
      return () => timestamps.shift();
    })(),
    executeAcquisition: async (payload) => ({
      actualDependencyInstallationPerformed: true,
      actualModelDownloadPerformed: true,
      actualModelTrainingExecuted: false,
      approvalId: payload.approval.id,
      artifactEvidence: artifactEvidence || {
        sourceModelSha256: sourceManifest.artifactSetSha256,
        trainerPackageSha256: trainerManifest.artifactSetSha256,
      },
      egressClosed: true,
      executionKind: 'local-acquisition',
      externalProviderCalls: 'not-observed-by-runtime',
      requestId: payload.request.id,
      schemaVersion:
        LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
      status: 'completed',
      stepResults: payload.steps.map((step) => ({
        id: step.id,
        order: step.order,
        status: 'completed',
      })),
    }),
    executionKind: 'local-acquisition',
  });
  const run = await runtime.run(authority);

  return {
    ...authority,
    artifactRoot,
    repoDir,
    run,
    sourceManifest,
    sourceModelManifestPath,
    sourceRoot,
    trainerManifest,
    trainerPackageManifestPath,
    trainerRoot,
  };
}

function createVerifier(fixture, observedAt =
  '2026-07-17T08:32:00.000Z') {
  return createLocalTrainingAcquisitionArtifactVerifier({
    clock: () => observedAt,
    fileSystem: fs,
    repoDir: fixture.repoDir,
  });
}

function verifyFixture(fixture, overrides = {}) {
  return createVerifier(
    fixture,
    overrides.observedAt,
  ).verify({
    approval: fixture.approval,
    mode: 'fixture-simulated',
    plan: fixture.plan,
    request: fixture.request,
    run: fixture.run,
    sourceModelManifestPath: fixture.sourceModelManifestPath,
    toolchainDecision: fixture.toolchainDecision,
    trainerPackageManifestPath:
      fixture.trainerPackageManifestPath,
    ...overrides,
  });
}

test('fixture verification reads real files without claiming acquisition', async (t) => {
  const fixture = await buildFixture(t);
  const verification = await verifyFixture(fixture);
  const serialized = JSON.stringify(verification);

  assert.equal(
    verification.status,
    'fixture-artifacts-verified-no-acquisition',
  );
  assert.equal(verification.actualArtifactSetsObserved, false);
  assert.equal(
    verification.independentArtifactVerificationPassed,
    true,
  );
  assert.equal(
    verification.artifacts.sourceModel.fileCount,
    2,
  );
  assert.equal(
    verification.artifacts.trainerPackage.fileCount,
    1,
  );
  assert.equal(
    verification.actualDependencyInstallationPerformed,
    false,
  );
  assert.equal(verification.actualModelDownloadPerformed, false);
  assert.equal(verification.actualModelTrainingExecuted, false);
  assert.equal(verification.externalProviderCalls, 'none');
  assert.equal(verification.productionReadyClaim, false);
  assert.equal(verification.fileContentStored, false);
  assert.equal(serialized.includes(fixture.repoDir), false);
  assert.equal(serialized.includes('source-model-weights'), false);
});

test('recorded mode observes artifact sets but keeps provenance claims open', async (t) => {
  const fixture = await buildFixture(t);
  const verification = await verifyFixture(fixture, {
    mode: 'recorded-local-acquisition',
  });

  assert.equal(verification.actualArtifactSetsObserved, true);
  assert.equal(
    verification.status,
    'artifact-sets-observed-provenance-required',
  );
  assert.equal(verification.acquisitionProvenanceVerified, false);
  assert.equal(
    verification.actualDependencyInstallationPerformed,
    false,
  );
  assert.equal(verification.actualModelDownloadPerformed, false);
  assert.deepEqual(verification.remainingGates, [
    'acquisition-provenance-reviewed',
    'egress-closure-independently-reviewed',
    'offline-resource-canary-passed',
    'post-install-product-permission-approved',
  ]);
});

test('run semantics, plan binding, and observation time fail closed', async (t) => {
  const fixture = await buildFixture(t);
  const wrongStep = structuredClone(fixture.run);
  wrongStep.steps[0].id = 'unexpected-step';
  assert.throws(
    () => assertLocalTrainingAcquisitionRun(rehashRun(wrongStep)),
    /integrity/,
  );

  const wrongApproval = structuredClone(fixture.run);
  wrongApproval.approval.id = 'local-training-acquisition-approval-wrong';
  assert.throws(
    () => assertLocalTrainingAcquisitionRun(
      rehashRun(wrongApproval),
    ),
    /integrity/,
  );

  const changedPlan = structuredClone(fixture.plan);
  changedPlan.steps[0].status = 'completed';
  await assert.rejects(
    verifyFixture(fixture, { plan: changedPlan }),
    /plan-integrity/,
  );
  await assert.rejects(
    verifyFixture(fixture, {
      observedAt: '2026-07-17T08:30:30.000Z',
    }),
    /run-binding/,
  );

  const runBeforeApproval = structuredClone(fixture.run);
  runBeforeApproval.startedAt = '2026-07-17T08:05:00.000Z';
  await assert.rejects(
    verifyFixture(fixture, {
      run: rehashRun(runBeforeApproval),
    }),
    /run-binding/,
  );
});

test('relative path and symlink guards stop boundary ambiguity', async (t) => {
  const fixture = await buildFixture(t);
  await assert.rejects(
    verifyFixture(fixture, {
      trainerPackageManifestPath: '../trainer-package.json',
    }),
    /must remain relative/,
  );

  const packagePath = path.join(fixture.trainerRoot, 'package.whl');
  const targetPath = path.join(fixture.repoDir, 'outside-package.whl');
  fs.writeFileSync(targetPath, 'trainer-package-wheel');
  fs.rmSync(packagePath);
  fs.symlinkSync(targetPath, packagePath);
  await assert.rejects(
    verifyFixture(fixture),
    /must be a regular file/,
  );
});

test('manifest fields, pins, and ordering are exact', async (t) => {
  const fixture = await buildFixture(t);
  const extraField = {
    ...fixture.trainerManifest,
    rawOutput: 'unsupported',
  };
  writeJson(
    path.join(
      fixture.artifactRoot,
      fixture.trainerPackageManifestPath,
    ),
    extraField,
  );
  await assert.rejects(
    verifyFixture(fixture),
    /manifest has invalid fields/,
  );

  const otherFixture = await buildFixture(t);
  const wrongPin =
    buildLocalTrainingAcquisitionArtifactManifest({
      artifactKind: 'source-model',
      files: otherFixture.sourceManifest.files,
      identity: {
        ...otherFixture.sourceManifest.identity,
        revision: 'different-revision',
      },
    });
  writeJson(
    path.join(
      otherFixture.artifactRoot,
      otherFixture.sourceModelManifestPath,
    ),
    wrongPin,
  );
  await assert.rejects(
    verifyFixture(otherFixture),
    /integrity-or-pin/,
  );

  assert.throws(
    () => buildLocalTrainingAcquisitionArtifactManifest({
      artifactKind: 'source-model',
      files: [...otherFixture.sourceManifest.files].reverse(),
      identity: otherFixture.sourceManifest.identity,
    }),
    /unique and sorted/,
  );
  assert.throws(
    () => buildLocalTrainingAcquisitionArtifactManifest({
      artifactKind: 'source-model',
      files: [{
        ...otherFixture.sourceManifest.files[0],
        path: 'unsafe\npath.json',
      }],
      identity: otherFixture.sourceManifest.identity,
    }),
    /must remain relative/,
  );
});

test('file bytes and adapter artifact hashes must match independently', async (t) => {
  const fixture = await buildFixture(t);
  fs.appendFileSync(
    path.join(fixture.sourceRoot, 'config.json'),
    'changed',
  );
  await assert.rejects(
    verifyFixture(fixture),
    /file-integrity/,
  );

  const wrongHashFixture = await buildFixture(t, {
    artifactEvidence: {
      sourceModelSha256: sha256('different-source-set'),
      trainerPackageSha256: sha256('different-trainer-set'),
    },
  });
  await assert.rejects(
    verifyFixture(wrongHashFixture),
    /adapter-hash-binding/,
  );
});

test('resource envelope limits the independently measured artifacts', async (t) => {
  const fixture = await buildFixture(t, {
    resourceEnvelope: {
      maxConcurrentDownloads: 1,
      maxDiskBytes: 2,
      maxDownloadBytes: 1,
      maxRuntimeMs: 1,
    },
  });
  await assert.rejects(
    verifyFixture(fixture),
    /resource-envelope/,
  );
});

test('verifier requires an explicit filesystem and repository root', () => {
  assert.throws(
    () => createLocalTrainingAcquisitionArtifactVerifier(),
    /requires a filesystem/,
  );
  assert.throws(
    () => createLocalTrainingAcquisitionArtifactVerifier({
      fileSystem: fs,
    }),
    /requires repoDir/,
  );
});
