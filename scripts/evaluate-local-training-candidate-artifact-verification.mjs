import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildLocalTrainingCandidateArtifactManifest,
  createLocalTrainingCandidateArtifactVerifier,
} from '../src/core/local-training-candidate-artifact-verification.mjs';
import {
  buildLocalTrainingExecutionApproval,
  createLocalTrainingRuntime,
} from '../src/core/local-training-runtime.mjs';
import {
  createLocalTrainingPostAcquisitionReadinessFixture,
} from './evaluate-local-training-post-acquisition-readiness.mjs';

export const LOCAL_TRAINING_CANDIDATE_ARTIFACT_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-training-candidate-artifact-evidence/v1';

const STARTED_AT = '2026-07-17T08:41:00.000Z';
const COMPLETED_AT = '2026-07-17T08:41:01.000Z';
const OBSERVED_AT = '2026-07-17T08:42:00.000Z';
const MODEL_ID = 'fixture-local-candidate-v1';
const ARTIFACT_FORMAT = 'fixture-candidate-metadata/v1';

function hashValue(value) {
  return createHash('sha256').update(value).digest('hex');
}

function hashRecord(value) {
  return hashValue(JSON.stringify(value));
}

function resealRun(run, changes) {
  const {
    id: ignoredId,
    runHash: ignoredRunHash,
    ...record
  } = run;
  const changed = {
    ...record,
    ...changes,
  };
  const runHash = hashRecord(changed);
  return {
    ...changed,
    id: `local-training-run-${runHash}`,
    runHash,
  };
}

function withObservedFileSize(fileSystem, targetPath, bytes) {
  const targetCanonical = fileSystem.realpathSync(targetPath);
  return {
    createReadStream: fileSystem.createReadStream.bind(fileSystem),
    lstatSync(filePath) {
      const stat = fileSystem.lstatSync(filePath);
      if (
        fileSystem.realpathSync(filePath) !== targetCanonical
      ) {
        return stat;
      }
      return new Proxy(stat, {
        get(target, property) {
          if (property === 'size') {
            return bytes;
          }
          const value = Reflect.get(target, property);
          return typeof value === 'function'
            ? value.bind(target)
            : value;
        },
      });
    },
    readFileSync: fileSystem.readFileSync.bind(fileSystem),
    readdirSync: fileSystem.readdirSync.bind(fileSystem),
    realpathSync: fileSystem.realpathSync.bind(fileSystem),
  };
}

function candidateFileDefinitions() {
  return [
    {
      content: Buffer.from('fixture-adapter-weights-v1\n'),
      path: 'adapter.safetensors',
    },
    {
      content: Buffer.from('{"adapterRank":8,"format":"fixture"}\n'),
      path: 'metadata/config.json',
    },
  ];
}

function writeCandidateFiles(candidateRoot, definitions) {
  const artifactRoot = path.join(candidateRoot, 'artifact');
  fs.mkdirSync(artifactRoot, { recursive: true });
  const files = definitions.map((definition) => {
    const filePath = path.join(
      artifactRoot,
      ...definition.path.split('/'),
    );
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, definition.content);
    return {
      bytes: definition.content.byteLength,
      path: definition.path,
      sha256: hashValue(definition.content),
    };
  });
  return {
    artifactRoot,
    files,
  };
}

export async function createLocalTrainingCandidateArtifactVerificationFixture({
  mode = 'fixture-simulated',
  repoDir = process.cwd(),
} = {}) {
  const postAcquisition =
    await createLocalTrainingPostAcquisitionReadinessFixture({
      mode: 'recorded-local-acquisition',
      repoDir,
    });
  const candidateRepoRoot = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'personal-ai-agent-local-training-candidate-',
    ),
  );

  try {
    const target =
      postAcquisition.postAcquisitionReadiness.trainingTarget;
    const approval = buildLocalTrainingExecutionApproval({
      approvedAt: postAcquisition.permission.resolvedAt,
      approvedBy: postAcquisition.permission.resolvedBy,
      baseModelId: target.baseModelId,
      executionKind: 'local-model-training',
      expiresAt: postAcquisition.permission.expiresAt,
      permission: postAcquisition.permission,
      readinessPackage: postAcquisition.readinessPackage,
      rollbackOwner: target.rollbackOwner,
      trainerId: target.trainerId,
    });
    const candidateRoot = path.join(
      candidateRepoRoot,
      'var',
      'local-training',
      'candidates',
      approval.id,
    );
    const { artifactRoot, files } = writeCandidateFiles(
      candidateRoot,
      candidateFileDefinitions(),
    );
    const manifest =
      buildLocalTrainingCandidateArtifactManifest({
        approval,
        artifactFormat: ARTIFACT_FORMAT,
        files,
        modelId: MODEL_ID,
        readinessPackage: postAcquisition.readinessPackage,
      });
    const manifestPath = path.join(
      candidateRoot,
      'candidate-manifest.json',
    );
    fs.mkdirSync(candidateRoot, { recursive: true });
    fs.writeFileSync(
      manifestPath,
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    const timestamps = [STARTED_AT, COMPLETED_AT];
    const runtime = createLocalTrainingRuntime({
      args: [
        path.join(repoDir, 'fixtures', 'local-training-command.mjs'),
        '--mode',
        'simulate-local-model-training',
        '--candidate-artifact-sha256',
        manifest.artifactSetSha256,
      ],
      clock: () => timestamps.shift() || COMPLETED_AT,
      command: process.execPath,
      cwd: repoDir,
      env: {
        HOME: process.env.HOME,
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
      },
      trainerId: target.trainerId,
    });
    const input = {
      approval,
      currentPermission: postAcquisition.permission,
      mode,
      permissionRevocation: null,
      postAcquisitionReadiness:
        postAcquisition.postAcquisitionReadiness,
      readinessPackage: postAcquisition.readinessPackage,
    };
    const run = await runtime.run(input);
    const verifier = createLocalTrainingCandidateArtifactVerifier({
      clock: () => OBSERVED_AT,
      fileSystem: fs,
      repoDir: candidateRepoRoot,
    });

    return {
      ...postAcquisition,
      approval,
      artifactRoot,
      candidateRepoRoot,
      candidateRoot,
      cleanup() {
        fs.rmSync(candidateRepoRoot, {
          force: true,
          recursive: true,
        });
        postAcquisition.cleanup();
      },
      input: {
        ...input,
        run,
      },
      manifest,
      manifestPath,
      run,
      verifier,
    };
  } catch (error) {
    fs.rmSync(candidateRepoRoot, {
      force: true,
      recursive: true,
    });
    postAcquisition.cleanup();
    throw error;
  }
}

async function rejectionMatches(operation, pattern) {
  try {
    await operation();
    return false;
  } catch (error) {
    return pattern.test(String(error?.message || ''));
  }
}

async function withFixture(options, operation) {
  const fixture =
    await createLocalTrainingCandidateArtifactVerificationFixture(
      options,
    );
  try {
    return await operation(fixture);
  } finally {
    fixture.cleanup();
  }
}

export async function evaluateLocalTrainingCandidateArtifactVerification({
  repoDir = process.cwd(),
} = {}) {
  const fixture =
    await createLocalTrainingCandidateArtifactVerificationFixture({
      repoDir,
    });
  try {
    const verification = await fixture.verifier.verify(
      fixture.input,
    );
    const recordedReady =
      await withFixture(
        {
          mode: 'recorded-local-training',
          repoDir,
        },
        async (recordedFixture) => {
          const result = await recordedFixture.verifier.verify(
            recordedFixture.input,
          );
          return (
            result.actualCandidateArtifactsObserved === true &&
            result.readyForExplicitCandidateEvaluationRequest === true &&
            result.actualModelTrainingExecuted === false
          );
        },
      );
    const failureGuards = {
      completeInventoryRequired: await withFixture(
        { repoDir },
        async (guardFixture) => {
          fs.writeFileSync(
            path.join(guardFixture.artifactRoot, 'unlisted.bin'),
            'unlisted',
          );
          return rejectionMatches(
            () => guardFixture.verifier.verify(
              guardFixture.input,
            ),
            /complete-inventory/,
          );
        },
      ),
      currentPermissionRequired: await withFixture(
        { repoDir },
        (guardFixture) => rejectionMatches(
          () => guardFixture.verifier.verify({
            ...guardFixture.input,
            currentPermission: {
              ...guardFixture.input.currentPermission,
              id: 'local-training-permission-stale',
            },
          }),
          /permission-current-state/,
        ),
      ),
      fileIntegrityRequired: await withFixture(
        { repoDir },
        async (guardFixture) => {
          fs.appendFileSync(
            path.join(
              guardFixture.artifactRoot,
              'adapter.safetensors',
            ),
            'tampered',
          );
          return rejectionMatches(
            () => guardFixture.verifier.verify(
              guardFixture.input,
            ),
            /file-integrity/,
          );
        },
      ),
      fixtureDoesNotClaimTraining:
        verification.actualModelTrainingExecuted === false &&
        verification.actualCandidateArtifactsObserved === false &&
        verification.readyForExplicitCandidateEvaluationRequest === false,
      manifestRunBindingRequired: await withFixture(
        { repoDir },
        async (guardFixture) => {
          const manifest = JSON.parse(
            fs.readFileSync(
              guardFixture.manifestPath,
              'utf8',
            ),
          );
          manifest.identity.modelId = 'another-candidate';
          fs.writeFileSync(
            guardFixture.manifestPath,
            `${JSON.stringify(manifest, null, 2)}\n`,
          );
          return rejectionMatches(
            () => guardFixture.verifier.verify(
              guardFixture.input,
            ),
            /integrity-or-run-binding/,
          );
        },
      ),
      recordedArtifactCanRequestEvaluation: recordedReady,
      resourceEnvelopeRequired: await withFixture(
        { repoDir },
        async (guardFixture) => {
          const limit =
            guardFixture.permission.evidence.resource.limits.maxDiskBytes;
          const oversizedBytes = limit + 1;
          const files = guardFixture.manifest.files.map(
            (file, index) => index === 0
              ? {
                  ...file,
                  bytes: oversizedBytes,
                }
              : file,
          );
          const manifest =
            buildLocalTrainingCandidateArtifactManifest({
              approval: guardFixture.approval,
              artifactFormat:
                guardFixture.run.candidate.artifactFormat,
              files,
              modelId: guardFixture.run.candidate.modelId,
              readinessPackage:
                guardFixture.readinessPackage,
            });
          fs.writeFileSync(
            guardFixture.manifestPath,
            `${JSON.stringify(manifest, null, 2)}\n`,
          );
          const run = resealRun(guardFixture.run, {
            candidate: {
              ...guardFixture.run.candidate,
              artifactSha256: manifest.artifactSetSha256,
            },
          });
          const oversizedPath = path.join(
            guardFixture.artifactRoot,
            files[0].path,
          );
          const verifier =
            createLocalTrainingCandidateArtifactVerifier({
              clock: () => OBSERVED_AT,
              fileSystem: withObservedFileSize(
                fs,
                oversizedPath,
                oversizedBytes,
              ),
              repoDir: guardFixture.candidateRepoRoot,
            });
          return rejectionMatches(
            () => verifier.verify({
              ...guardFixture.input,
              run,
            }),
            /resource-envelope/,
          );
        },
      ),
      revocationStateRequired: await withFixture(
        { repoDir },
        (guardFixture) => rejectionMatches(
          () => guardFixture.verifier.verify({
            ...guardFixture.input,
            permissionRevocation: {
              status: 'revoked',
            },
          }),
          /post-acquisition-admission/,
        ),
      ),
      runIntegrityRequired: await withFixture(
        { repoDir },
        (guardFixture) => rejectionMatches(
          () => guardFixture.verifier.verify({
            ...guardFixture.input,
            run: {
              ...guardFixture.run,
              completedAt: '2026-07-17T08:40:00.000Z',
            },
          }),
          /integrity-or-binding/,
        ),
      ),
      symbolicLinkRejected: await withFixture(
        { repoDir },
        async (guardFixture) => {
          const target = path.join(
            guardFixture.artifactRoot,
            'adapter.safetensors',
          );
          const link = path.join(
            guardFixture.artifactRoot,
            'unlisted-link',
          );
          fs.symlinkSync(target, link);
          return rejectionMatches(
            () => guardFixture.verifier.verify(
              guardFixture.input,
            ),
            /symbolic links/,
          );
        },
      ),
    };
    const evidence = {
      candidate: {
        artifactFormat:
          verification.candidate.artifactFormat,
        fileCount: verification.candidate.fileCount,
        fileSetSha256: hashRecord(
          verification.candidate.files,
        ),
        modelIdHash: hashValue(
          verification.candidate.modelId,
        ),
        totalBytes: verification.candidate.totalBytes,
      },
      claimBoundary: {
        actualCandidateArtifactsObserved: false,
        actualModelTrainingExecuted: false,
        candidateEvaluationAuthorized: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        productionReadyClaim: false,
        rolloutAuthorized: false,
      },
      failureGuards,
      mode:
        'local-training-candidate-artifact-verification',
      schemaVersion:
        LOCAL_TRAINING_CANDIDATE_ARTIFACT_EVIDENCE_SCHEMA_VERSION,
      security: {
        completeInventoryRequired: true,
        fileContentStored: false,
        fixedCandidateRoot: true,
        pathContainment: true,
        symbolicLinksAllowed: false,
      },
      verification: {
        actualCandidateArtifactsObserved:
          verification.actualCandidateArtifactsObserved,
        actualModelTrainingExecuted:
          verification.actualModelTrainingExecuted,
        candidateEvaluationAuthorized:
          verification.candidateEvaluationAuthorized,
        candidateEvaluationRequired:
          verification.candidateEvaluationRequired,
        independentCandidateArtifactVerificationPassed:
          verification
            .independentCandidateArtifactVerificationPassed,
        observedDiskBytes:
          verification.observedDiskBytes,
        readyForExplicitCandidateEvaluationRequest:
          verification
            .readyForExplicitCandidateEvaluationRequest,
        remainingGates: verification.remainingGates,
        status: verification.status,
        trainerReportedActualModelTrainingExecuted:
          verification
            .trainerReportedActualModelTrainingExecuted,
        trainingProcessProvenanceVerified:
          verification.trainingProcessProvenanceVerified,
      },
    };
    const evidenceHash = hashRecord(evidence);
    return {
      ...evidence,
      evidenceHash,
      id:
        `local-training-candidate-artifact-evidence-${evidenceHash}`,
    };
  } finally {
    fixture.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const evidence =
    await evaluateLocalTrainingCandidateArtifactVerification();
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
}
