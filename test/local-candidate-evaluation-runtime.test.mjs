import assert from 'node:assert/strict';
import fs from 'node:fs';
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
  createLocalTrainingCandidateArtifactVerificationFixture,
} from '../scripts/evaluate-local-training-candidate-artifact-verification.mjs';

const EVALUATOR_ID =
  'fixture-local-candidate-evaluator-v1';
const REQUESTED_AT = '2026-07-17T08:43:00.000Z';
const ADMITTED_AT = '2026-07-17T08:44:00.000Z';
const EXPIRES_AT = '2026-07-17T09:20:00.000Z';
const commandPath = path.resolve(
  'fixtures/local-candidate-evaluation-command.mjs',
);

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
    evaluatorId: EVALUATOR_ID,
    expiresAt: EXPIRES_AT,
    permissionRevocation: null,
    readinessPackage: source.readinessPackage,
    requestedAt: REQUESTED_AT,
    requestedBy: 'local-evaluation-operator',
  });
  const admission = admitLocalCandidateEvaluation({
    candidateArtifactVerification,
    currentPermission: source.permission,
    now: ADMITTED_AT,
    permissionRevocation: null,
    readinessPackage: source.readinessPackage,
    request,
  });
  return {
    ...source,
    admission,
    candidateArtifactVerification,
    request,
  };
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
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    request: fixture.request,
    ...overrides,
  };
}

test('bounded runtime revalidates the candidate and produces an O1a-ready fixture result', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const runtime = createRuntime(fixture);

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
});
