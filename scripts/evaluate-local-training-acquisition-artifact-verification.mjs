import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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
  createLocalTrainingAcquisitionRuntime,
  LOCAL_TRAINING_ACQUISITION_RUNTIME_PROTOCOL_VERSION,
} from '../src/core/local-training-acquisition-runtime.mjs';

export const LOCAL_TRAINING_ACQUISITION_ARTIFACT_VERIFICATION_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-acquisition-artifact-verification-evidence/v1';

const OBSERVED_AT = '2026-07-17T08:32:00.000Z';
const RESOURCE_ENVELOPE = {
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

function readJson(repoDir, relativePath) {
  return JSON.parse(fs.readFileSync(
    path.join(repoDir, relativePath),
    'utf8',
  ));
}

function writeJson(filename, value) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function buildAuthority(toolchainDecision, resourceEnvelope) {
  const request = buildLocalTrainingAcquisitionRequest({
    decision: toolchainDecision,
    expiresAt: '2026-07-17T10:00:00.000Z',
    proposedResourceEnvelope: resourceEnvelope,
    requestedAt: '2026-07-17T08:00:00.000Z',
    requestedBy: 'fixture-operator',
  });
  const approval = resolveLocalTrainingAcquisitionRequest({
    decision: 'approve',
    owners: {
      approvalOwner: 'fixture-acquisition-owner',
      egressOwner: 'fixture-security-owner',
      licenseOwner: 'fixture-license-owner',
      resourceOwner: 'fixture-resource-owner',
      rollbackOwner: 'fixture-rollback-owner',
    },
    reason: 'Fixture-only artifact verification review.',
    request,
    resolvedAt: '2026-07-17T08:10:00.000Z',
    resolvedBy: 'fixture-acquisition-owner',
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

function writeArtifactFiles(artifactRoot) {
  const sourceRoot = path.join(artifactRoot, 'source-model');
  const trainerRoot = path.join(artifactRoot, 'trainer');
  fs.mkdirSync(path.join(artifactRoot, 'manifests'), {
    recursive: true,
  });
  fs.mkdirSync(sourceRoot, { recursive: true });
  fs.mkdirSync(trainerRoot, { recursive: true });

  const sourceFiles = [
    {
      content: '{"model_type":"qwen2"}\n',
      path: 'config.json',
    },
    {
      content: 'fixture-source-model-weights',
      path: 'model.safetensors',
    },
  ];
  const trainerFiles = [
    {
      content: 'fixture-trainer-package',
      path: 'package.whl',
    },
  ];
  for (const file of sourceFiles) {
    fs.writeFileSync(path.join(sourceRoot, file.path), file.content);
  }
  for (const file of trainerFiles) {
    fs.writeFileSync(path.join(trainerRoot, file.path), file.content);
  }
  return {
    sourceFiles,
    sourceRoot,
    trainerFiles,
    trainerRoot,
  };
}

function buildManifests(plan, files) {
  const sourceManifest =
    buildLocalTrainingAcquisitionArtifactManifest({
      artifactKind: 'source-model',
      files: files.sourceFiles.map((file) => ({
        bytes: Buffer.byteLength(file.content),
        path: file.path,
        sha256: sha256(file.content),
      })),
      identity: { ...plan.toolchainDecision.sourceModel },
    });
  const trainerManifest =
    buildLocalTrainingAcquisitionArtifactManifest({
      artifactKind: 'trainer-package',
      files: files.trainerFiles.map((file) => ({
        bytes: Buffer.byteLength(file.content),
        path: file.path,
        sha256: sha256(file.content),
      })),
      identity: { ...plan.toolchainDecision.trainer },
    });
  return {
    sourceManifest,
    trainerManifest,
  };
}

async function runFixtureAcquisition(authority, manifests, {
  artifactEvidence,
} = {}) {
  const timestamps = [
    '2026-07-17T08:30:00.000Z',
    '2026-07-17T08:31:00.000Z',
  ];
  const runtime = createLocalTrainingAcquisitionRuntime({
    clock: () => timestamps.shift(),
    executeAcquisition: async (payload) => ({
      actualDependencyInstallationPerformed: true,
      actualModelDownloadPerformed: true,
      actualModelTrainingExecuted: false,
      approvalId: payload.approval.id,
      artifactEvidence: artifactEvidence || {
        sourceModelSha256:
          manifests.sourceManifest.artifactSetSha256,
        trainerPackageSha256:
          manifests.trainerManifest.artifactSetSha256,
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
  return runtime.run(authority);
}

async function createFixture(toolchainDecision, {
  resourceEnvelope = RESOURCE_ENVELOPE,
} = {}) {
  const authority = buildAuthority(
    toolchainDecision,
    resourceEnvelope,
  );
  const fixtureRepoDir = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'personal-ai-agent-artifact-evidence-',
  ));
  const artifactRoot = path.join(
    fixtureRepoDir,
    authority.plan.mutableRoot,
  );
  const files = writeArtifactFiles(artifactRoot);
  const manifests = buildManifests(authority.plan, files);
  const sourceModelManifestPath = 'manifests/source-model.json';
  const trainerPackageManifestPath =
    'manifests/trainer-package.json';
  writeJson(
    path.join(artifactRoot, sourceModelManifestPath),
    manifests.sourceManifest,
  );
  writeJson(
    path.join(artifactRoot, trainerPackageManifestPath),
    manifests.trainerManifest,
  );
  const run = await runFixtureAcquisition(authority, manifests);
  return {
    ...authority,
    ...files,
    ...manifests,
    artifactRoot,
    fixtureRepoDir,
    run,
    sourceModelManifestPath,
    trainerPackageManifestPath,
  };
}

function createVerifier(fixture) {
  return createLocalTrainingAcquisitionArtifactVerifier({
    clock: () => OBSERVED_AT,
    fileSystem: fs,
    repoDir: fixture.fixtureRepoDir,
  });
}

function verificationInput(fixture, overrides = {}) {
  return {
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

export async function evaluateLocalTrainingAcquisitionArtifactVerification({
  repoDir = process.cwd(),
} = {}) {
  const toolchainDecision = readJson(
    repoDir,
    'evidence/output-artifacts/local-training-toolchain-decision.json',
  );
  const fixture = await createFixture(toolchainDecision);
  const cleanupPaths = [fixture.fixtureRepoDir];
  try {
    const verifier = createVerifier(fixture);
    const verification = await verifier.verify(
      verificationInput(fixture),
    );

    const changedPlan = structuredClone(fixture.plan);
    changedPlan.steps[0].status = 'completed';

    const changedRun = structuredClone(fixture.run);
    changedRun.steps[0].id = 'unexpected-step';

    const sourceManifestFile = path.join(
      fixture.artifactRoot,
      fixture.sourceModelManifestPath,
    );
    const sourceConfigFile = path.join(
      fixture.sourceRoot,
      'config.json',
    );
    const originalSourceManifest = fs.readFileSync(
      sourceManifestFile,
      'utf8',
    );
    const originalSourceConfig = fs.readFileSync(
      sourceConfigFile,
      'utf8',
    );

    const fileHashMismatchBlocked = await (async () => {
      fs.appendFileSync(sourceConfigFile, 'changed');
      const blocked = await rejectionMatches(
        () => verifier.verify(verificationInput(fixture)),
        /file-integrity/,
      );
      fs.writeFileSync(sourceConfigFile, originalSourceConfig);
      return blocked;
    })();

    const manifestPinDriftBlocked = await (async () => {
      writeJson(
        sourceManifestFile,
        buildLocalTrainingAcquisitionArtifactManifest({
          artifactKind: 'source-model',
          files: fixture.sourceManifest.files,
          identity: {
            ...fixture.sourceManifest.identity,
            revision: 'different-revision',
          },
        }),
      );
      const blocked = await rejectionMatches(
        () => verifier.verify(verificationInput(fixture)),
        /integrity-or-pin/,
      );
      fs.writeFileSync(sourceManifestFile, originalSourceManifest);
      return blocked;
    })();

    const symlinkBlocked = await (async () => {
      const packageFile = path.join(
        fixture.trainerRoot,
        'package.whl',
      );
      const packageContent = fs.readFileSync(packageFile);
      const symlinkTarget = path.join(
        fixture.fixtureRepoDir,
        'symlink-target.whl',
      );
      fs.writeFileSync(symlinkTarget, packageContent);
      fs.rmSync(packageFile);
      fs.symlinkSync(symlinkTarget, packageFile);
      const blocked = await rejectionMatches(
        () => verifier.verify(verificationInput(fixture)),
        /must be a regular file/,
      );
      fs.rmSync(packageFile);
      fs.writeFileSync(packageFile, packageContent);
      return blocked;
    })();

    const wrongHashRun = await runFixtureAcquisition(
      fixture,
      {
        sourceManifest: fixture.sourceManifest,
        trainerManifest: fixture.trainerManifest,
      },
      {
        artifactEvidence: {
          sourceModelSha256: sha256('wrong-source-set'),
          trainerPackageSha256: sha256('wrong-trainer-set'),
        },
      },
    );

    const resourceFixture = await createFixture(
      toolchainDecision,
      {
        resourceEnvelope: {
          maxConcurrentDownloads: 1,
          maxDiskBytes: 2,
          maxDownloadBytes: 1,
          maxRuntimeMs: 1,
        },
      },
    );
    cleanupPaths.push(resourceFixture.fixtureRepoDir);

    const failureGuards = {
      adapterHashMismatchBlocked: await rejectionMatches(
        () => verifier.verify(verificationInput(fixture, {
          run: wrongHashRun,
        })),
        /adapter-hash-binding/,
      ),
      fileHashMismatchBlocked,
      manifestPinDriftBlocked,
      pathEscapeBlocked: await rejectionMatches(
        () => verifier.verify(verificationInput(fixture, {
          trainerPackageManifestPath: '../trainer-package.json',
        })),
        /must remain relative/,
      ),
      planTamperingBlocked: await rejectionMatches(
        () => verifier.verify(verificationInput(fixture, {
          plan: changedPlan,
        })),
        /plan-integrity/,
      ),
      resourceEnvelopeBlocked: await rejectionMatches(
        () => createVerifier(resourceFixture).verify(
          verificationInput(resourceFixture),
        ),
        /resource-envelope/,
      ),
      runSemanticTamperingBlocked: await rejectionMatches(
        () => verifier.verify(verificationInput(fixture, {
          run: rehashRun(changedRun),
        })),
        /integrity/,
      ),
      symlinkBlocked,
      unsafePathMetadataBlocked: await rejectionMatches(
        async () => buildLocalTrainingAcquisitionArtifactManifest({
          artifactKind: 'source-model',
          files: [{
            ...fixture.sourceManifest.files[0],
            path: 'unsafe\npath.json',
          }],
          identity: fixture.sourceManifest.identity,
        }),
        /must remain relative/,
      ),
    };
    assert.equal(
      Object.values(failureGuards).every(Boolean),
      true,
      'every artifact verification failure guard must pass',
    );

    const evidence = {
      artifacts: {
        sourceModel: {
          artifactSetSha256:
            verification.artifacts.sourceModel.artifactSetSha256,
          fileCount: verification.artifacts.sourceModel.fileCount,
          totalBytes: verification.artifacts.sourceModel.totalBytes,
        },
        trainerPackage: {
          artifactSetSha256:
            verification.artifacts.trainerPackage.artifactSetSha256,
          fileCount:
            verification.artifacts.trainerPackage.fileCount,
          totalBytes:
            verification.artifacts.trainerPackage.totalBytes,
        },
      },
      claimBoundary: {
        actualArtifactSetsObserved: false,
        actualDependencyInstallationPerformed: false,
        actualModelDownloadPerformed: false,
        actualModelTrainingExecuted: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        independentArtifactVerificationContractValidated: true,
        productionReadyClaim: false,
        rolloutAuthorized: false,
        trainingAuthorized: false,
      },
      failureGuards,
      mode: 'local-training-acquisition-artifact-verification',
      schemaVersion:
        LOCAL_TRAINING_ACQUISITION_ARTIFACT_VERIFICATION_EVIDENCE_SCHEMA_VERSION,
      security: {
        approvedRootContainmentValidated: true,
        fileContentStored: false,
        manifestAndFileHashesRecomputed: true,
        regularFilesOnly: true,
        symlinksRejected: true,
      },
      verification: {
        remainingGates: verification.remainingGates,
        schemaVersion: verification.schemaVersion,
        status: verification.status,
        verificationHash: verification.verificationHash,
      },
    };
    const evidenceHash = hashRecord(evidence);
    return {
      ...evidence,
      evidenceHash,
      id:
        `local-training-acquisition-artifact-verification-evidence-${evidenceHash}`,
    };
  } finally {
    for (const cleanupPath of cleanupPaths) {
      fs.rmSync(cleanupPath, {
        force: true,
        recursive: true,
      });
    }
  }
}
