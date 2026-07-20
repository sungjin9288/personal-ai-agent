import assert from 'node:assert/strict';
import { spawn as nodeSpawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  evaluateCandidateModelGate,
} from '../src/core/candidate-model-evaluation.mjs';
import {
  admitLocalCandidateEvaluation,
  buildLocalCandidateEvaluationRequest,
} from '../src/core/local-candidate-evaluation-admission.mjs';
import {
  assertLocalCandidateEvaluationRun,
  createLocalCandidateEvaluationRuntime,
  LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION,
  LOCAL_CANDIDATE_EVALUATION_RUN_SCHEMA_VERSION,
} from '../src/core/local-candidate-evaluation-runtime.mjs';
import {
  createLocalCandidateEvaluationWorkspace,
  LOCAL_CANDIDATE_EVALUATION_WORKSPACE_NAMESPACE,
} from '../src/core/local-candidate-evaluation-workspace-recovery.mjs';
import {
  createLocalTrainingCandidateArtifactVerificationFixture,
} from '../scripts/evaluate-local-training-candidate-artifact-verification.mjs';
import {
  createLocalCandidateEvaluatorFixture,
} from '../scripts/local-candidate-evaluator-fixture.mjs';

const EVALUATOR_ID =
  'fixture-local-candidate-evaluator-v1';
const REQUESTED_AT = '2026-07-17T08:43:00.000Z';
const ADMITTED_AT = '2026-07-17T08:44:00.000Z';
const EXPIRES_AT = '2026-07-17T09:20:00.000Z';
const EVALUATION_SUITE_CONTENT = fs.readFileSync(
  'fixtures/answer-quality-cases-v1.json',
  'utf8',
);
const EVALUATOR =
  createLocalCandidateEvaluatorFixture();
const commandPath = EVALUATOR.entryPath;

async function buildFixture(
  evaluationKind = 'fixture-simulated',
) {
  const source =
    await createLocalTrainingCandidateArtifactVerificationFixture({
      mode: 'recorded-local-training',
    });
  const candidateArtifactVerification =
    await source.verifier.verify(source.input);
  const request = buildLocalCandidateEvaluationRequest({
    candidateArtifactVerification,
    currentPermission: source.permission,
    evaluationKind,
    evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
    evaluatorId: EVALUATOR_ID,
    evaluatorProvenance: EVALUATOR.provenance,
    expiresAt: EXPIRES_AT,
    permissionRevocation: null,
    readinessPackage: source.readinessPackage,
    requestedAt: REQUESTED_AT,
    requestedBy: 'local-evaluation-operator',
  });
  const admission = admitLocalCandidateEvaluation({
    candidateArtifactVerification,
    currentPermission: source.permission,
    evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
    now: ADMITTED_AT,
    permissionRevocation: null,
    readinessPackage: source.readinessPackage,
    request,
  });
  return {
    ...source,
    admission,
    candidateArtifactVerification,
    evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
    request,
  };
}

function createTemporaryDirectory(t) {
  const temporaryDirectory = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'personal-ai-agent-runtime-test-',
    ),
  );
  t.after(() => {
    fs.rmSync(temporaryDirectory, {
      force: true,
      recursive: true,
    });
  });
  return temporaryDirectory;
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

function createRuntime(
  fixture,
  mode = 'success',
  options = {},
) {
  const timestamps = [
    '2026-07-17T08:45:00.000Z',
    '2026-07-17T08:46:00.000Z',
    '2026-07-17T08:47:00.000Z',
  ];
  return createLocalCandidateEvaluationRuntime({
    args: [commandPath, '--mode', mode],
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
    evaluatorBundle: EVALUATOR.definition,
    executionKind: fixture.request.evaluationKind,
    repoDir: fixture.candidateRepoRoot,
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

function rehashRun(run) {
  const {
    id: _id,
    runHash: _runHash,
    ...record
  } = run;
  const runHash = createHash('sha256')
    .update(JSON.stringify(record))
    .digest('hex');
  return {
    ...record,
    id: `local-candidate-evaluation-run-${runHash}`,
    runHash,
  };
}

test('bounded runtime revalidates the candidate and produces an O1a-ready fixture result', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const temporaryDirectory = createTemporaryDirectory(t);
  let spawnedEntryPath;
  const runtime = createRuntime(fixture, 'success', {
    spawnProcess(command, args, options) {
      spawnedEntryPath = args[0];
      return nodeSpawn(command, args, options);
    },
    temporaryDirectory,
  });

  const result = await runtime.run(runInput(fixture));
  const gate = evaluateCandidateModelGate({
    candidateEvaluation: result.candidateEvaluation,
    candidateEvidence: result.candidateEvidence,
    readinessPackage: fixture.readinessPackage,
  });

  assert.equal(
    runtime.protocolVersion,
    LOCAL_CANDIDATE_EVALUATION_PROTOCOL_VERSION,
  );
  assert.equal(runtime.security.shell, false);
  assert.equal(
    runtime.security.networkIsolation,
    'caller-owned',
  );
  assert.equal(
    runtime.security.candidateSnapshot,
    'bounded-read-only-temporary-copy',
  );
  assert.equal(
    runtime.security.postExecutionInputVerification,
    true,
  );
  assert.equal(runtime.security.sourceWorkspaceAsCwd, false);
  assert.notEqual(spawnedEntryPath, commandPath);
  assert.match(
    spawnedEntryPath,
    /personal-ai-agent-candidate-evaluation-v1\/workspace-[^/]+\/evaluator\/fixtures\/local-candidate-evaluation-command\.mjs$/u,
  );
  assert.deepEqual(runtime.security.environmentKeys.sort(), [
    'HOME',
    'PATH',
    ...(process.env.TMPDIR ? ['TMPDIR'] : []),
  ]);
  assert.equal(
    result.run.schemaVersion,
    LOCAL_CANDIDATE_EVALUATION_RUN_SCHEMA_VERSION,
  );
  assert.equal(result.run.actualModelEvaluated, false);
  assert.equal(
    result.run.candidateEvaluationAuthorized,
    true,
  );
  assert.equal(result.run.externalProviderCalls, 'none');
  assert.equal(result.run.trainingAuthorized, false);
  assert.equal(result.run.rolloutAuthorized, false);
  assert.equal(result.run.productionReadyClaim, false);
  assert.equal(
    result.run.inputSnapshot.suiteSha256,
    fixture.request.evaluationSuite.artifact.sha256,
  );
  assert.equal(
    result.run.inputSnapshot.cleanup,
    'completed',
  );
  assert.equal(
    result.candidateEvidence.evaluationRunId,
    result.run.id,
  );
  assert.equal(
    result.candidateEvidence.actualModelEvaluated,
    false,
  );
  assert.equal(gate.status, 'ready-for-review');
  assert.equal(gate.rollout.status, 'blocked');
  assert.equal(gate.rollout.activationAuthorized, false);
  assert.equal(
    JSON.stringify(result.run).includes(
      'Prompt normalization resolved provider drift',
    ),
    false,
  );
  assert.deepEqual(
    listManagedWorkspaces(temporaryDirectory),
    [],
  );
});

test('runtime recovers an expired dead preparing workspace after authority revalidation', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const temporaryDirectory = createTemporaryDirectory(t);
  const staleWorkspace =
    createLocalCandidateEvaluationWorkspace({
      createdAt: '2026-07-17T08:00:00.000Z',
      isProcessAlive: () => true,
      leaseExpiresAt: '2026-07-17T08:30:00.000Z',
      processId: 41001,
      temporaryDirectory,
    });

  const result = await createRuntime(fixture, 'success', {
    isProcessAlive: (processId) =>
      processId === 41001 ? false : true,
    processId: 41002,
    temporaryDirectory,
  }).run(runInput(fixture));

  assert.deepEqual(
    result.run.workspaceRecovery.recoveredLeaseIds,
    [staleWorkspace.lease.leaseId],
  );
  assert.equal(
    result.run.workspaceRecovery.scannedWorkspaceCount,
    1,
  );
  assert.equal(
    result.run.workspaceRecovery.status,
    'completed',
  );
  assert.equal(
    fs.existsSync(staleWorkspace.rootDir),
    false,
  );
  assert.deepEqual(
    listManagedWorkspaces(temporaryDirectory),
    [],
  );
});

test('runtime leaves stale workspaces untouched when current authority fails', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const temporaryDirectory = createTemporaryDirectory(t);
  const staleWorkspace =
    createLocalCandidateEvaluationWorkspace({
      createdAt: '2026-07-17T08:00:00.000Z',
      isProcessAlive: () => true,
      leaseExpiresAt: '2026-07-17T08:30:00.000Z',
      processId: 41001,
      temporaryDirectory,
    });

  await assert.rejects(
    createRuntime(fixture, 'success', {
      isProcessAlive: () => false,
      processId: 41002,
      temporaryDirectory,
    }).run(runInput(fixture, {
      currentPermission: {
        ...fixture.permission,
        id: 'local-training-permission-stale',
      },
    })),
    /permission failed: integrity|current-permission-binding/,
  );

  assert.equal(fs.existsSync(staleWorkspace.rootDir), true);
});

test('runtime rechecks authority and candidate binding before workspace recovery', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);

  const authorityTemporaryDirectory =
    createTemporaryDirectory(t);
  const authorityWorkspace =
    createLocalCandidateEvaluationWorkspace({
      createdAt: '2026-07-17T08:00:00.000Z',
      isProcessAlive: () => true,
      leaseExpiresAt: '2026-07-17T08:30:00.000Z',
      processId: 41001,
      temporaryDirectory:
        authorityTemporaryDirectory,
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

  await assert.rejects(
    createRuntime(fixture, 'success', {
      candidateVerifier: authorityChangingVerifier,
      isProcessAlive: () => false,
      processId: 41002,
      temporaryDirectory:
        authorityTemporaryDirectory,
    }).run(runInput(fixture, {
      currentPermission,
    })),
    /permission failed: integrity|current-permission-binding/,
  );
  assert.equal(
    fs.existsSync(authorityWorkspace.rootDir),
    true,
  );

  const candidateTemporaryDirectory =
    createTemporaryDirectory(t);
  const candidateWorkspace =
    createLocalCandidateEvaluationWorkspace({
      createdAt: '2026-07-17T08:00:00.000Z',
      isProcessAlive: () => true,
      leaseExpiresAt: '2026-07-17T08:30:00.000Z',
      processId: 41003,
      temporaryDirectory:
        candidateTemporaryDirectory,
    });
  const candidateChangingVerifier = {
    async verify(input) {
      const verification =
        await fixture.verifier.verify(input);
      return {
        ...verification,
        candidate: {
          ...verification.candidate,
          modelId: 'unbound-candidate',
        },
      };
    },
  };

  await assert.rejects(
    createRuntime(fixture, 'success', {
      candidateVerifier: candidateChangingVerifier,
      isProcessAlive: () => false,
      processId: 41004,
      temporaryDirectory:
        candidateTemporaryDirectory,
    }).run(runInput(fixture)),
    /verification record failed: integrity/,
  );
  assert.equal(
    fs.existsSync(candidateWorkspace.rootDir),
    true,
  );
});

test('runtime stops stale authority and evaluator drift before spawn', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  let spawnCount = 0;
  const spawnProcess = () => {
    spawnCount += 1;
    throw new Error('spawn must not be reached');
  };

  await assert.rejects(
    createRuntime(fixture, 'success', {
      evaluatorId: 'another-evaluator',
      spawnProcess,
    }).run(runInput(fixture)),
    /evaluator-binding/,
  );
  await assert.rejects(
    createRuntime(fixture, 'success', {
      executionKind: 'local-model-evaluation',
      spawnProcess,
    }).run(runInput(fixture)),
    /execution-kind-binding/,
  );
  await assert.rejects(
    createRuntime(fixture, 'success', {
      spawnProcess,
    }).run(runInput(fixture, {
      currentPermission: {
        ...fixture.permission,
        id: 'local-training-permission-stale',
      },
    })),
    /permission failed: integrity|current-permission-binding/,
  );
  await assert.rejects(
    createRuntime(fixture, 'success', {
      spawnProcess,
    }).run(runInput(fixture, {
      permissionRevocation: {
        status: 'revoked',
      },
    })),
    /explicit current no-revocation state/,
  );
  await assert.rejects(
    createRuntime(fixture, 'success', {
      clock: () => EXPIRES_AT,
      spawnProcess,
    }).run(runInput(fixture)),
    /integrity-or-current-binding/,
  );
  assert.equal(spawnCount, 0);
});

test('runtime blocks artifact drift during fresh verification before spawn', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const artifactFile = fs.readdirSync(
    fixture.artifactRoot,
  )[0];
  fs.appendFileSync(
    path.join(fixture.artifactRoot, artifactFile),
    'drift',
  );
  let spawnCount = 0;

  await assert.rejects(
    createRuntime(fixture, 'success', {
      spawnProcess: () => {
        spawnCount += 1;
        throw new Error('spawn must not be reached');
      },
    }).run(runInput(fixture)),
    /candidate verification failed: file-integrity/,
  );
  assert.equal(spawnCount, 0);
});

test('runtime binds exact suite bytes before creating the execution view', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const temporaryDirectory = createTemporaryDirectory(t);
  let spawnCount = 0;

  await assert.rejects(
    createRuntime(fixture, 'success', {
      spawnProcess: () => {
        spawnCount += 1;
        throw new Error('spawn must not be reached');
      },
      temporaryDirectory,
    }).run(runInput(fixture, {
      evaluationSuiteContent:
        `${fixture.evaluationSuiteContent}\n`,
    })),
    /integrity-or-current-binding/,
  );
  assert.equal(spawnCount, 0);
  assert.deepEqual(
    listManagedWorkspaces(temporaryDirectory),
    [],
  );
});

test('runtime rechecks authority after post-run input verification', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const temporaryDirectory = createTemporaryDirectory(t);
  const timestamps = [
    '2026-07-17T08:45:00.000Z',
    '2026-07-17T08:46:00.000Z',
    '2026-07-17T08:47:00.000Z',
    '2026-07-17T08:48:00.000Z',
    EXPIRES_AT,
  ];

  await assert.rejects(
    createRuntime(fixture, 'success', {
      clock: () => timestamps.shift() || EXPIRES_AT,
      temporaryDirectory,
    }).run(runInput(fixture)),
    /integrity-or-current-binding/,
  );
  assert.deepEqual(
    listManagedWorkspaces(temporaryDirectory),
    [],
  );
});

test('runtime executes the snapshot even when the source changes after preparation', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const temporaryDirectory = createTemporaryDirectory(t);
  const artifactFile = path.join(
    fixture.artifactRoot,
    fs.readdirSync(fixture.artifactRoot)[0],
  );
  let sourceChanged = false;
  const spawnProcess = (command, args, options) => {
    fs.appendFileSync(artifactFile, 'source-changed-after-copy');
    sourceChanged = true;
    return nodeSpawn(command, args, options);
  };

  const result = await createRuntime(fixture, 'success', {
    spawnProcess,
    temporaryDirectory,
  }).run(runInput(fixture));

  assert.equal(sourceChanged, true);
  assert.equal(result.run.status, 'completed');
  assert.deepEqual(
    listManagedWorkspaces(temporaryDirectory),
    [],
  );
});

test('runtime rejects candidate, suite, and evaluator mutation inside the execution view', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const temporaryDirectory = createTemporaryDirectory(t);

  for (const [mode, pattern] of [
    [
      'tamper-candidate-view',
      /candidate verification failed: file-integrity/,
    ],
    [
      'tamper-suite-view',
      /suite artifact failed: integrity-or-binding/,
    ],
    [
      'tamper-evaluator-view',
      /provenance failed: current-binding/,
    ],
  ]) {
    await assert.rejects(
      createRuntime(fixture, mode, {
        temporaryDirectory,
      }).run(runInput(fixture)),
      pattern,
    );
    assert.deepEqual(
      listManagedWorkspaces(temporaryDirectory),
      [],
    );
  }
});

test('runtime rejects unbound, raw, inconsistent, and unbounded child results', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  for (const [mode, pattern] of [
    ['mismatch', /does not match the authorized execution/],
    ['actual-mismatch', /does not match the authorized execution/],
    ['threshold-drift', /evaluation-suite-binding/],
    ['raw-output', /must not contain raw answer or prompt fields/],
    ['invalid-summary', /inconsistent summary evidence/],
    ['unsupported-field', /contains unsupported fields/],
    ['invalid-json', /returned invalid JSON/],
    ['fail', /command exited with code 9/],
  ]) {
    await assert.rejects(
      createRuntime(fixture, mode).run(runInput(fixture)),
      pattern,
    );
  }
  await assert.rejects(
    createRuntime(fixture, 'large-output', {
      maxOutputBytes: 512,
    }).run(runInput(fixture)),
    /stdout exceeds 512 bytes/,
  );
  await assert.rejects(
    createRuntime(fixture, 'hang', {
      timeoutMs: 50,
    }).run(runInput(fixture)),
    /timed out after 50ms/,
  );
  await assert.rejects(
    createRuntime(fixture, 'success', {
      maxInputBytes: 128,
    }).run(runInput(fixture)),
    /input exceeds 128 bytes/,
  );
  assert.throws(
    () =>
      createRuntime(fixture, 'success', {
        args: ['password=process-secret'],
      }),
    /must not contain secret or customer data/,
  );
  assert.throws(
    () =>
      createRuntime(fixture, 'success', {
        args: [commandPath, '/tmp/unbound-config.json'],
      }),
    /must not reference absolute files/,
  );
});

test('recorded local evaluation marks model evidence without authorizing rollout', async (t) => {
  const fixture = await buildFixture(
    'local-model-evaluation',
  );
  t.after(fixture.cleanup);

  const result = await createRuntime(fixture).run(
    runInput(fixture),
  );
  const gate = evaluateCandidateModelGate({
    candidateEvaluation: result.candidateEvaluation,
    candidateEvidence: result.candidateEvidence,
    readinessPackage: fixture.readinessPackage,
  });

  assert.equal(result.run.actualModelEvaluated, true);
  assert.equal(
    result.run.externalProviderCalls,
    'not-observed-by-runtime',
  );
  assert.equal(
    result.candidateEvidence.evaluationSource,
    'recorded-model-evaluation',
  );
  assert.equal(
    result.candidateEvidence.actualModelEvaluated,
    true,
  );
  assert.equal(gate.comparison.status, 'passed');
  assert.equal(gate.rollout.status, 'blocked');
  assert.equal(gate.rollout.activationAuthorized, false);
  assert.equal(
    assertLocalCandidateEvaluationRun({
      admission: fixture.admission,
      candidateArtifactVerification:
        fixture.candidateArtifactVerification,
      candidateEvaluation: result.candidateEvaluation,
      currentPermission: fixture.permission,
      request: fixture.request,
      run: result.run,
    }),
    result.run,
  );
  assert.throws(
    () =>
      assertLocalCandidateEvaluationRun({
        admission: fixture.admission,
        candidateArtifactVerification:
          fixture.candidateArtifactVerification,
        candidateEvaluation: result.candidateEvaluation,
        currentPermission: fixture.permission,
        request: fixture.request,
        run: {
          ...result.run,
          rolloutAuthorized: true,
        },
      }),
    /run failed: integrity/,
  );
  assert.throws(
    () =>
      assertLocalCandidateEvaluationRun({
        admission: fixture.admission,
        candidateArtifactVerification:
          fixture.candidateArtifactVerification,
        candidateEvaluation: result.candidateEvaluation,
        currentPermission: fixture.permission,
        request: fixture.request,
        run: rehashRun({
          ...result.run,
          workspaceRecovery: {
            ...result.run.workspaceRecovery,
            skippedActiveWorkspaceCount: 1,
          },
        }),
      }),
    /workspace recovery failed: integrity/,
  );
});
