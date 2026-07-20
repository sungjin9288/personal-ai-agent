import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  evaluateCandidateModelGate,
} from '../src/core/candidate-model-evaluation.mjs';
import {
  admitLocalCandidateEvaluation,
  buildLocalCandidateEvaluationRequest,
} from '../src/core/local-candidate-evaluation-admission.mjs';
import {
  createLocalCandidateEvaluationRuntime,
  LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION,
} from '../src/core/local-candidate-evaluation-runtime.mjs';
import {
  createLocalCandidateEvaluationWorkspace,
  LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
} from '../src/core/local-candidate-evaluation-workspace-recovery.mjs';
import {
  createLocalTrainingCandidateArtifactVerificationFixture,
} from './evaluate-local-training-candidate-artifact-verification.mjs';
import {
  createLocalCandidateEvaluatorFixture,
} from './local-candidate-evaluator-fixture.mjs';

export const LOCAL_CANDIDATE_EVALUATION_RUNTIME_EVIDENCE_SCHEMA_VERSION =
  'personal-ai-agent-local-candidate-evaluation-runtime-evidence/v5';

const EVALUATOR_ID =
  'fixture-local-candidate-evaluator-v1';
const REQUESTED_AT = '2026-07-17T08:43:00.000Z';
const ADMITTED_AT = '2026-07-17T08:44:00.000Z';
const EXPIRES_AT = '2026-07-17T09:20:00.000Z';

function hashRecord(value) {
  return createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function listManagedWorkspaces(temporaryDirectory) {
  const namespacePath = path.join(
    temporaryDirectory,
    LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
  );
  if (!fs.existsSync(namespacePath)) {
    return [];
  }
  return fs
    .readdirSync(namespacePath)
    .filter((name) => name.startsWith('workspace-'));
}

function unlockDirectories(directory) {
  let entries;
  try {
    fs.chmodSync(directory, 0o700);
    entries = fs.readdirSync(directory, {
      withFileTypes: true,
    });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.isSymbolicLink()) {
      unlockDirectories(path.join(directory, entry.name));
    }
  }
}

function createRuntime(
  fixture,
  repoDir,
  mode = 'success',
  options = {},
) {
  const timestamps = [
    '2026-07-17T08:45:00.000Z',
    '2026-07-17T08:46:00.000Z',
    '2026-07-17T08:47:00.000Z',
  ];
  return createLocalCandidateEvaluationRuntime({
    args: [
      fixture.evaluator.entryPath,
      '--mode',
      mode,
    ],
    candidateVerifier: fixture.verifier,
    clock: () =>
      timestamps.shift() ||
      '2026-07-17T08:47:00.000Z',
    command: process.execPath,
    env: {
      HOME: process.env.HOME,
      OPENAI_API_KEY: 'must-not-reach-child',
      PATH: process.env.PATH,
      TMPDIR: process.env.TMPDIR,
    },
    evaluatorId: EVALUATOR_ID,
    evaluatorBundle: fixture.evaluator.definition,
    executionKind: fixture.request.evaluationKind,
    repoDir: fixture.candidateRepoRoot,
    temporaryDirectory: fixture.temporaryDirectory,
    ...options,
  });
}

function runInput(fixture, overrides = {}) {
  return {
    admission: fixture.admission,
    candidateArtifactVerification:
      fixture.candidateArtifactVerification,
    candidateVerificationInput: fixture.input,
    currentPermission: fixture.permission,
    evaluationSuiteContent:
      fixture.evaluationSuiteContent,
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    request: fixture.request,
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

export async function createLocalCandidateEvaluationRuntimeFixture({
  repoDir = process.cwd(),
} = {}) {
  const source =
    await createLocalTrainingCandidateArtifactVerificationFixture({
      mode: 'recorded-local-training',
      repoDir,
    });
  const candidateArtifactVerification =
    await source.verifier.verify(source.input);
  const evaluationSuiteContent = fs.readFileSync(
    path.join(
      repoDir,
      'fixtures',
      'answer-quality-cases-v1.json',
    ),
    'utf8',
  );
  const temporaryDirectory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'personal-ai-agent-runtime-evidence-',
    ),
  );
  try {
    const evaluator =
      createLocalCandidateEvaluatorFixture({
        repoDir,
      });
    const request = buildLocalCandidateEvaluationRequest({
      candidateArtifactVerification,
      currentPermission: source.permission,
      evaluationKind: 'fixture-simulated',
      evaluationSuiteContent,
      evaluatorId: EVALUATOR_ID,
      evaluatorProvenance: evaluator.provenance,
      expiresAt: EXPIRES_AT,
      permissionRevocation: null,
      readinessPackage: source.readinessPackage,
      requestedAt: REQUESTED_AT,
      requestedBy: 'local-evaluation-operator',
    });
    const admission = admitLocalCandidateEvaluation({
      candidateArtifactVerification,
      currentPermission: source.permission,
      evaluationSuiteContent,
      now: ADMITTED_AT,
      permissionRevocation: null,
      readinessPackage: source.readinessPackage,
      request,
    });
    return {
      ...source,
      admission,
      candidateArtifactVerification,
      cleanup() {
        source.cleanup();
        fs.rmSync(temporaryDirectory, {
          force: true,
          recursive: true,
        });
      },
      evaluationSuiteContent,
      evaluator,
      request,
      temporaryDirectory,
    };
  } catch (error) {
    source.cleanup();
    fs.rmSync(temporaryDirectory, {
      force: true,
      recursive: true,
    });
    throw error;
  }
}

export async function evaluateLocalCandidateEvaluationRuntime({
  repoDir = process.cwd(),
} = {}) {
  const fixture =
    await createLocalCandidateEvaluationRuntimeFixture({
      repoDir,
    });
  try {
    const staleWorkspace =
      createLocalCandidateEvaluationWorkspace({
        createdAt: '2026-07-17T08:00:00.000Z',
        isProcessAlive: () => true,
        leaseExpiresAt: '2026-07-17T08:30:00.000Z',
        processId: 41001,
        temporaryDirectory: fixture.temporaryDirectory,
      });
    const runtime = createRuntime(
      fixture,
      repoDir,
      'success',
      {
        isProcessAlive: (processId) =>
          processId === 41001 ? false : true,
        processId: 41002,
      },
    );
    const result = await runtime.run(runInput(fixture));
    const gate = evaluateCandidateModelGate({
      candidateEvaluation: result.candidateEvaluation,
      candidateEvidence: result.candidateEvidence,
      readinessPackage: fixture.readinessPackage,
    });
    const authorityGuardWorkspace =
      createLocalCandidateEvaluationWorkspace({
        createdAt: '2026-07-17T08:00:00.000Z',
        isProcessAlive: () => true,
        leaseExpiresAt: '2026-07-17T08:30:00.000Z',
        processId: 41003,
        temporaryDirectory: fixture.temporaryDirectory,
      });
    const currentPermission =
      structuredClone(fixture.permission);
    const authorityChangingVerifier = {
      async verify(input) {
        const verification =
          await fixture.verifier.verify(input);
        currentPermission.id =
          'local-training-permission-stale';
        return verification;
      },
    };
    const authorityRequiredBeforeWorkspaceRecovery =
      await rejectionMatches(
        () =>
          createRuntime(
            fixture,
            repoDir,
            'success',
            {
              candidateVerifier:
                authorityChangingVerifier,
              isProcessAlive: () => false,
              processId: 41004,
            },
          ).run(runInput(fixture, {
            currentPermission,
          })),
        /permission failed: integrity|current-permission-binding/,
      ) &&
      fs.existsSync(authorityGuardWorkspace.rootDir);
    authorityGuardWorkspace.cleanup();

    const lifecycleGuardTemporaryDirectory = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'personal-ai-agent-lifecycle-guard-evidence-',
      ),
    );
    let processGroupAbsenceRequired;
    try {
      processGroupAbsenceRequired =
        await rejectionMatches(
          () =>
            createRuntime(
              fixture,
              repoDir,
              'success',
              {
                processGroupState: () => 'unknown',
                quiescencePollMs: 1,
                quiescenceTimeoutMs: 10,
                temporaryDirectory:
                  lifecycleGuardTemporaryDirectory,
              },
            ).run(runInput(fixture)),
          /process-group-quiescence/,
        ) &&
        listManagedWorkspaces(
          lifecycleGuardTemporaryDirectory,
        ).length === 1;
    } finally {
      unlockDirectories(lifecycleGuardTemporaryDirectory);
      fs.rmSync(lifecycleGuardTemporaryDirectory, {
        force: true,
        recursive: true,
      });
    }

    const failureGuards = {
      actualModelClaimRemainsFalse:
        result.run.actualModelEvaluated === false &&
        result.candidateEvidence.actualModelEvaluated === false,
      admissionCurrentStateRequired: await rejectionMatches(
        () =>
          createRuntime(fixture, repoDir, 'success', {
            clock: () => EXPIRES_AT,
          }).run(runInput(fixture)),
        /integrity-or-current-binding/,
      ),
      authorityRequiredAfterInputVerification:
        await rejectionMatches(
          () => {
            const timestamps = [
              '2026-07-17T08:45:00.000Z',
              '2026-07-17T08:46:00.000Z',
              '2026-07-17T08:47:00.000Z',
              '2026-07-17T08:48:00.000Z',
              EXPIRES_AT,
            ];
            return createRuntime(
              fixture,
              repoDir,
              'success',
              {
                clock: () =>
                  timestamps.shift() || EXPIRES_AT,
              },
            ).run(runInput(fixture));
          },
          /integrity-or-current-binding/,
        ),
      authorityRequiredBeforeWorkspaceRecovery,
      evaluatorBindingRequired: await rejectionMatches(
        () =>
          createRuntime(fixture, repoDir, 'success', {
            evaluatorId: 'another-evaluator',
          }).run(runInput(fixture)),
        /evaluator-binding/,
      ),
      executionKindBindingRequired: await rejectionMatches(
        () =>
          createRuntime(fixture, repoDir, 'success', {
            executionKind: 'local-model-evaluation',
          }).run(runInput(fixture)),
        /execution-kind-binding/,
      ),
      evaluationSuiteBytesRequired:
        await rejectionMatches(
          () =>
            createRuntime(
              fixture,
              repoDir,
            ).run(runInput(fixture, {
              evaluationSuiteContent:
                `${fixture.evaluationSuiteContent}\n`,
            })),
          /integrity-or-current-binding/,
        ),
      evaluatorSnapshotPostVerificationRequired:
        await rejectionMatches(
          () =>
            createRuntime(
              fixture,
              repoDir,
              'tamper-evaluator-view',
            ).run(runInput(fixture)),
          /provenance failed: current-binding/,
        ),
      inputBounded: await rejectionMatches(
        () =>
          createRuntime(fixture, repoDir, 'success', {
            maxInputBytes: 128,
          }).run(runInput(fixture)),
        /input exceeds 128 bytes/,
      ),
      o1aComparisonPassed:
        gate.comparison.status === 'passed' &&
        gate.status === 'ready-for-review',
      outputBounded: await rejectionMatches(
        () =>
          createRuntime(
            fixture,
            repoDir,
            'large-output',
            {
              maxOutputBytes: 512,
            },
          ).run(runInput(fixture)),
        /stdout exceeds 512 bytes/,
      ),
      permissionCurrentStateRequired:
        await rejectionMatches(
          () =>
            createRuntime(
              fixture,
              repoDir,
            ).run(runInput(fixture, {
              currentPermission: {
                ...fixture.permission,
                id: 'local-training-permission-stale',
              },
            })),
          /permission failed: integrity|current-permission-binding/,
        ),
      processGroupAbsenceRequired,
      processLifecycleContentFree:
        !JSON.stringify(
          result.run.processLifecycle,
        ).includes(fixture.temporaryDirectory) &&
        !Object.hasOwn(result.run.processLifecycle, 'pid') &&
        !Object.hasOwn(
          result.run.processLifecycle,
          'processGroupId',
        ),
      processLifecycleIntegrityBound:
        /^[a-f0-9]{64}$/u.test(
          result.run.processLifecycle.lifecycleHash,
        ) &&
        result.run.processLifecycle
          .processGroupAbsenceConfirmed === true,
      rawResultFieldsRejected: await rejectionMatches(
        () =>
          createRuntime(
            fixture,
            repoDir,
            'raw-output',
          ).run(runInput(fixture)),
        /must not contain raw answer or prompt fields/,
      ),
      resultLineageRequired: await rejectionMatches(
        () =>
          createRuntime(
            fixture,
            repoDir,
            'mismatch',
          ).run(runInput(fixture)),
        /does not match the authorized execution/,
      ),
      resultSummaryIntegrityRequired:
        await rejectionMatches(
          () =>
            createRuntime(
              fixture,
              repoDir,
              'invalid-summary',
            ).run(runInput(fixture)),
          /inconsistent summary evidence/,
        ),
      revocationStateRequired: await rejectionMatches(
        () =>
          createRuntime(fixture, repoDir).run(
            runInput(fixture, {
              permissionRevocation: {
                status: 'revoked',
              },
            }),
          ),
        /explicit current no-revocation state/,
      ),
      rolloutRemainsBlocked:
        result.run.rolloutAuthorized === false &&
        result.run.rollback.activationAuthorized === false &&
        gate.rollout.activationAuthorized === false,
      stderrRedacted: await rejectionMatches(
        () =>
          createRuntime(
            fixture,
            repoDir,
            'fail',
          ).run(runInput(fixture)),
        /^Local candidate evaluation runtime command exited with code 9\.$/,
      ),
      thresholdBindingRequired: await rejectionMatches(
        () =>
          createRuntime(
            fixture,
            repoDir,
            'threshold-drift',
          ).run(runInput(fixture)),
        /evaluation-suite-binding/,
      ),
      candidateSnapshotPostVerificationRequired:
        await rejectionMatches(
          () =>
            createRuntime(
              fixture,
              repoDir,
              'tamper-candidate-view',
            ).run(runInput(fixture)),
          /candidate verification failed: file-integrity/,
        ),
      suiteSnapshotPostVerificationRequired:
        await rejectionMatches(
          () =>
            createRuntime(
              fixture,
              repoDir,
              'tamper-suite-view',
            ).run(runInput(fixture)),
          /suite artifact failed: integrity-or-binding/,
        ),
      stalePreparingWorkspaceRecovered:
        result.run.workspaceRecovery
          .scannedWorkspaceCount === 1 &&
        result.run.workspaceRecovery
          .recoveredLeaseIds.length === 1 &&
        result.run.workspaceRecovery
          .recoveredLeaseIds[0] ===
          staleWorkspace.lease.leaseId &&
        !fs.existsSync(staleWorkspace.rootDir),
      timeoutBounded: await rejectionMatches(
        () =>
          createRuntime(fixture, repoDir, 'hang', {
            timeoutMs: 50,
          }).run(runInput(fixture)),
        /timed out after 50ms/,
      ),
      trainingRemainsBlocked:
        result.run.trainingAuthorized === false,
      unsupportedResultFieldsRejected:
        await rejectionMatches(
          () =>
            createRuntime(
              fixture,
              repoDir,
              'unsupported-field',
            ).run(runInput(fixture)),
          /contains unsupported fields/,
        ),
      temporaryInputViewCleaned:
        listManagedWorkspaces(
          fixture.temporaryDirectory,
        ).length === 0,
      workspaceRecoveryContentFree:
        !JSON.stringify(
          result.run.workspaceRecovery,
        ).includes(fixture.temporaryDirectory),
    };

    const artifactFile = fs.readdirSync(
      fixture.artifactRoot,
    )[0];
    fs.appendFileSync(
      path.join(fixture.artifactRoot, artifactFile),
      'drift',
    );
    failureGuards.artifactReverificationRequired =
      await rejectionMatches(
        () =>
          createRuntime(fixture, repoDir).run(
            runInput(fixture),
          ),
        /candidate verification failed: file-integrity/,
      );

    const failedGuards = Object.entries(failureGuards)
      .filter(([, passed]) => !passed)
      .map(([name]) => name);
    assert.deepEqual(
      failedGuards,
      [],
      'every local candidate evaluation runtime guard must pass',
    );
    const content = {
      claimBoundary: {
        actualCandidateArtifactsObserved: false,
        actualModelEvaluated: false,
        externalProviderCalls: 'none',
        externalSubmissionAuthorized: false,
        productionReadyClaim: false,
        rolloutAuthorized: false,
        trainingAuthorized: false,
      },
      execution: {
        candidateEvaluationAuthorized:
          result.run.candidateEvaluationAuthorized,
        evaluationHash:
          result.candidateEvidence.evaluationHash,
        evaluationSource:
          result.candidateEvidence.evaluationSource,
        evaluatorBundleArtifactSetSha256:
          result.run.evaluator.bundleArtifactSetSha256,
        evaluatorExecutableSha256:
          result.run.evaluator.executableSha256,
        gateDecision: gate.decision,
        gateStatus: gate.status,
        protocolVersion:
          LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION,
        processLifecycleHash:
          result.run.processLifecycle.lifecycleHash,
        processGroupQuiesced:
          result.run.processLifecycle
            .processGroupAbsenceConfirmed,
        runHashBound: true,
        suiteArtifactSha256:
          result.run.inputSnapshot.suiteSha256,
        status: result.run.status,
        workspaceRecoveryCount:
          result.run.workspaceRecovery
            .recoveredLeaseIds.length,
      },
      failureGuards,
      mode: 'local-candidate-evaluation-runtime',
      schemaVersion:
        LOCAL_CANDIDATE_EVALUATION_RUNTIME_EVIDENCE_SCHEMA_VERSION,
      security: {
        artifactReverifiedBeforeSpawn: true,
        authorityRevalidatedAfterInputVerification: true,
        candidateSnapshot:
          result.run.security.candidateSnapshot,
        contentFreeRunRecord: true,
        currentAdmissionRevalidated: true,
        environmentAllowlisted: true,
        evaluationSuiteBytesBound: true,
        evaluatorBundleSnapshot:
          result.run.security.evaluatorSnapshot,
        evaluatorExecutableVerification:
          result.run.security.executableVerification,
        evaluatorProvenanceBound: true,
        localProcessStdio: true,
        networkIsolation: 'caller-owned',
        postExecutionInputVerification: true,
        processGroupIsolation:
          result.run.security.processGroupIsolation,
        resourceEnforcement:
          'runtime-timeout-io-and-input-view',
        shell: false,
        sourceWorkspaceAsCwd: false,
        temporaryInputViewCleanup: 'completed',
        workspaceCleanupPolicy:
          result.run.security.workspaceCleanupPolicy,
        workspaceRecovery:
          'expired-dead-preparing-only',
      },
      storeMutation: false,
    };
    const evidenceHash = hashRecord(content);
    return {
      ...content,
      evidenceHash,
      id:
        `local-candidate-evaluation-runtime-evidence-${evidenceHash}`,
    };
  } finally {
    fixture.cleanup();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const evidence =
    await evaluateLocalCandidateEvaluationRuntime();
  process.stdout.write(
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
}
