import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { test } from 'node:test';

import {
  admitLocalCandidateEvaluation,
  assertCurrentLocalCandidateEvaluationAdmission,
  assertLocalCandidateEvaluationAdmission,
  buildLocalCandidateEvaluationRequest,
} from '../src/core/local-candidate-evaluation-admission.mjs';
import {
  createLocalTrainingCandidateArtifactVerificationFixture,
} from '../scripts/evaluate-local-training-candidate-artifact-verification.mjs';
import {
  createLocalCandidateEvaluatorFixture,
} from '../scripts/local-candidate-evaluator-fixture.mjs';

const REQUESTED_AT = '2026-07-17T08:43:00.000Z';
const ADMITTED_AT = '2026-07-17T08:44:00.000Z';
const EXPIRES_AT = '2026-07-17T09:20:00.000Z';
const EVALUATION_SUITE_CONTENT = fs.readFileSync(
  'fixtures/answer-quality-cases-v1.json',
  'utf8',
);
const EVALUATOR =
  createLocalCandidateEvaluatorFixture();

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
    evaluationKind: 'fixture-simulated',
    evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
    evaluatorId: 'fixture-local-candidate-evaluator-v1',
    evaluatorProvenance: EVALUATOR.provenance,
    expiresAt: EXPIRES_AT,
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    requestedAt: REQUESTED_AT,
    requestedBy: 'local-evaluation-operator',
    ...overrides,
  });
}

function rebindEvaluatorEntryAsResource() {
  const provenance = structuredClone(EVALUATOR.provenance);
  provenance.bundle.entryPath =
    'fixtures/candidate-model-evaluation-cases-v1.json';
  provenance.bundle.artifactSetSha256 = createHash('sha256')
    .update(JSON.stringify({
      byteLength: provenance.bundle.byteLength,
      entryPath: provenance.bundle.entryPath,
      fileCount: provenance.bundle.fileCount,
      files: provenance.bundle.files,
    }))
    .digest('hex');
  return provenance;
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
  assert.equal(
    request.evaluationSuite.artifact.byteLength,
    Buffer.byteLength(EVALUATION_SUITE_CONTENT),
  );
  assert.match(
    request.evaluationSuite.artifact.sha256,
    /^[a-f0-9]{64}$/u,
  );
  assert.equal(request.candidateEvaluationAuthorized, false);
  assert.equal(request.evaluationKind, 'fixture-simulated');
  assert.equal(
    request.evaluatorId,
    'fixture-local-candidate-evaluator-v1',
  );
  assert.equal(request.evaluatorProvenance.bundle.fileCount, 5);
  assert.match(
    request.evaluatorProvenance.bundle.artifactSetSha256,
    /^[a-f0-9]{64}$/u,
  );
  assert.match(
    request.evaluatorProvenance.executable.sha256,
    /^[a-f0-9]{64}$/u,
  );
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
    evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
    now: ADMITTED_AT,
    permissionRevocation: null,
    readinessPackage: fixture.readinessPackage,
    request,
  });

  assert.equal(admission.candidateEvaluationAuthorized, true);
  assert.equal(admission.evaluationKind, 'fixture-simulated');
  assert.equal(
    admission.evaluatorId,
    'fixture-local-candidate-evaluator-v1',
  );
  assert.deepEqual(
    admission.evaluatorProvenance,
    request.evaluatorProvenance,
  );
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
  assert.equal(
    assertCurrentLocalCandidateEvaluationAdmission({
      admission,
      candidateArtifactVerification: fixture.verification,
      currentPermission: fixture.permission,
      evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
      now: '2026-07-17T08:45:00.000Z',
      permissionRevocation: null,
      readinessPackage: fixture.readinessPackage,
      request,
    }),
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

test('candidate evaluation request rejects a resource rebound as evaluator entry', async (t) => {
  const fixture = await buildFixture();
  t.after(fixture.cleanup);

  assert.throws(
    () =>
      buildRequest(fixture, {
        evaluatorProvenance: rebindEvaluatorEntryAsResource(),
      }),
    /bundle-integrity/,
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
      evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
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
      evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
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
    evaluationSuiteContent: EVALUATION_SUITE_CONTENT,
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
  assert.throws(
    () => assertLocalCandidateEvaluationAdmission({
      ...admission,
      evaluatorId: 'another-evaluator',
    }),
    /admission failed: integrity/,
  );
  assert.throws(
    () => assertLocalCandidateEvaluationAdmission({
      ...admission,
      evaluatorProvenance: {
        ...admission.evaluatorProvenance,
        executable: {
          ...admission.evaluatorProvenance.executable,
          sha256: '0'.repeat(64),
        },
      },
    }),
    /admission failed: integrity/,
  );
  assert.throws(
    () =>
      assertCurrentLocalCandidateEvaluationAdmission({
        admission,
        candidateArtifactVerification: fixture.verification,
        currentPermission: fixture.permission,
        evaluationSuiteContent:
          EVALUATION_SUITE_CONTENT.replace(
            'Weekend hiking routes',
            'Weekend cycling routes',
          ),
        now: '2026-07-17T08:45:00.000Z',
        permissionRevocation: null,
        readinessPackage: fixture.readinessPackage,
        request,
      }),
    /integrity-or-current-binding/,
  );
});
