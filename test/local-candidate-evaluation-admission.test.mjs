import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  admitLocalCandidateEvaluation,
  assertLocalCandidateEvaluationAdmission,
  buildLocalCandidateEvaluationRequest,
} from '../src/core/local-candidate-evaluation-admission.mjs';
import {
  createLocalTrainingCandidateArtifactVerificationFixture,
} from '../scripts/evaluate-local-training-candidate-artifact-verification.mjs';

const REQUESTED_AT = '2026-07-17T08:43:00.000Z';
const ADMITTED_AT = '2026-07-17T08:44:00.000Z';
const EXPIRES_AT = '2026-07-17T09:20:00.000Z';

async function buildFixture(mode = 'recorded-local-training') {
  const source =
    await createLocalTrainingCandidateArtifactVerificationFixture({
      mode,
    });
  const verification = await source.verifier.verify(
    source.input,
  );
  return {
    ...source,
    verification,
  };
}

function buildRequest(fixture, overrides = {}) {
  return buildLocalCandidateEvaluationRequest({
    candidateArtifactVerification: fixture.verification,
    currentPermission: fixture.permission,
    expiresAt: EXPIRES_AT,
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    requestedAt: REQUESTED_AT,
    requestedBy: 'local-evaluation-operator',
    ...overrides,
  });
}

test('candidate evaluation request binds a recorded artifact and the F1 suite', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);

  const request = buildRequest(fixture);
  const replayed = buildRequest(fixture);

  assert.deepEqual(replayed, request);
  assert.equal(
    request.candidateArtifactVerification.id,
    fixture.verification.id,
  );
  assert.equal(
    request.candidate.artifactSetSha256,
    fixture.verification.candidate.artifactSetSha256,
  );
  assert.equal(
    request.evaluationSuite.baselineEvaluationHash,
    fixture.readinessPackage.evaluationManifest
      .answerQualityBaseline.evaluationHash,
  );
  assert.equal(request.candidateEvaluationAuthorized, false);
  assert.equal(request.actualModelEvaluated, false);
  assert.equal(request.trainingAuthorized, false);
  assert.equal(request.rolloutAuthorized, false);
  assert.equal(request.productionReadyClaim, false);
  assert.deepEqual(
    request.resourceLimits,
    fixture.permission.evidence.resource.limits,
  );
  assert.equal(
    JSON.stringify(request).includes('adapter.safetensors'),
    false,
  );
});

test('admission authorizes only bounded local candidate evaluation', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const request = buildRequest(fixture);

  const admission = admitLocalCandidateEvaluation({
    candidateArtifactVerification: fixture.verification,
    currentPermission: fixture.permission,
    now: ADMITTED_AT,
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    request,
  });

  assert.equal(admission.candidateEvaluationAuthorized, true);
  assert.equal(admission.actualModelEvaluated, false);
  assert.equal(admission.trainingAuthorized, false);
  assert.equal(admission.externalProviderCalls, 'none');
  assert.equal(admission.externalSubmissionAuthorized, false);
  assert.equal(admission.rolloutAuthorized, false);
  assert.equal(admission.productionReadyClaim, false);
  assert.deepEqual(
    admission.resourceLimits,
    fixture.permission.evidence.resource.limits,
  );
  assert.equal(
    admission.trainingProcessProvenanceVerified,
    false,
  );
  assert.deepEqual(admission.remainingGates, [
    'training-process-provenance-review',
    'local-candidate-evaluation-execution',
    'candidate-quality-non-regression',
    'rollout-review',
  ]);
  assert.equal(
    assertLocalCandidateEvaluationAdmission(admission),
    admission,
  );
});

test('fixture-only artifact verification cannot request candidate evaluation', async (t) => {
  const fixture = await buildFixture('fixture-simulated');
  t.after(fixture.cleanup);

  assert.throws(
    () => buildRequest(fixture),
    /recorded candidate artifact verification/,
  );
});

test('request and admission fail closed on permission, revocation, and time drift', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const request = buildRequest(fixture);

  assert.throws(
    () => buildRequest(fixture, {
      permissionRevocation: undefined,
    }),
    /explicit current no-revocation state/,
  );
  assert.throws(
    () => buildRequest(fixture, {
      currentPermission: {
        ...fixture.permission,
        id: 'local-training-permission-stale',
      },
    }),
    /permission failed: integrity|current-permission-binding/,
  );
  assert.throws(
    () => admitLocalCandidateEvaluation({
      candidateArtifactVerification: fixture.verification,
      currentPermission: fixture.permission,
      now: EXPIRES_AT,
      permissionRevocation: null,
      readinessPackage: fixture.readinessPackage,
      request,
    }),
    /integrity-or-current-binding/,
  );
  assert.throws(
    () => admitLocalCandidateEvaluation({
      candidateArtifactVerification: fixture.verification,
      currentPermission: fixture.permission,
      now: ADMITTED_AT,
      permissionRevocation: {
        status: 'revoked',
      },
      readinessPackage: fixture.readinessPackage,
      request,
    }),
    /explicit current no-revocation state/,
  );
});

test('candidate evaluation admission rejects semantic tampering', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);
  const request = buildRequest(fixture);
  const admission = admitLocalCandidateEvaluation({
    candidateArtifactVerification: fixture.verification,
    currentPermission: fixture.permission,
    now: ADMITTED_AT,
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    request,
  });

  assert.throws(
    () => assertLocalCandidateEvaluationAdmission({
      ...admission,
      rolloutAuthorized: true,
    }),
    /admission failed: authority-boundary/,
  );
  assert.throws(
    () => assertLocalCandidateEvaluationAdmission({
      ...admission,
      trainingProcessProvenanceVerified: true,
    }),
    /admission failed: authority-boundary/,
  );
  assert.throws(
    () => assertLocalCandidateEvaluationAdmission({
      ...admission,
      resourceLimits: {
        ...admission.resourceLimits,
        maxRuntimeMs: 0,
      },
    }),
    /must be a positive integer/,
  );
});
