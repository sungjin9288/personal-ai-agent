import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertLocalTrainingCandidateArtifactVerification,
  buildLocalTrainingCandidateArtifactManifest,
} from '../src/core/local-training-candidate-artifact-verification.mjs';
import {
  assertLocalTrainingRun,
} from '../src/core/local-training-runtime.mjs';
import {
  createLocalTrainingCandidateArtifactVerificationFixture,
} from '../scripts/evaluate-local-training-candidate-artifact-verification.mjs';

test('candidate artifact manifest is deterministic and rejects unsafe file identities', async (t) => {
  const fixture =
    await createLocalTrainingCandidateArtifactVerificationFixture();
  t.after(fixture.cleanup);

  const rebuilt = buildLocalTrainingCandidateArtifactManifest({
    approval: fixture.approval,
    artifactFormat: fixture.run.candidate.artifactFormat,
    files: fixture.manifest.files,
    modelId: fixture.run.candidate.modelId,
    readinessPackage: fixture.readinessPackage,
  });
  assert.deepEqual(rebuilt, fixture.manifest);
  assert.throws(
    () => buildLocalTrainingCandidateArtifactManifest({
      approval: fixture.approval,
      artifactFormat: fixture.run.candidate.artifactFormat,
      files: [
        fixture.manifest.files[1],
        fixture.manifest.files[0],
      ],
      modelId: fixture.run.candidate.modelId,
      readinessPackage: fixture.readinessPackage,
    }),
    /unique and sorted/,
  );
  assert.throws(
    () => buildLocalTrainingCandidateArtifactManifest({
      approval: fixture.approval,
      artifactFormat: fixture.run.candidate.artifactFormat,
      files: [{
        ...fixture.manifest.files[0],
        path: '../candidate.bin',
      }],
      modelId: fixture.run.candidate.modelId,
      readinessPackage: fixture.readinessPackage,
    }),
    /must remain relative/,
  );
});

test('candidate artifact verifier binds actual files to the admitted training run', async (t) => {
  const fixture =
    await createLocalTrainingCandidateArtifactVerificationFixture();
  t.after(fixture.cleanup);

  const verification = await fixture.verifier.verify(
    fixture.input,
  );
  assert.equal(
    verification.independentCandidateArtifactVerificationPassed,
    true,
  );
  assert.equal(
    verification.candidate.artifactSetSha256,
    fixture.run.candidate.artifactSha256,
  );
  assert.equal(verification.candidate.fileCount, 2);
  assert.equal(verification.candidate.files.length, 2);
  assert.equal(verification.fileContentStored, false);
  assert.equal(
    JSON.stringify(verification).includes('adapter.safetensors'),
    false,
  );
  assert.equal(
    verification.actualCandidateArtifactsObserved,
    false,
  );
  assert.equal(verification.actualModelTrainingExecuted, false);
  assert.equal(
    verification.readyForExplicitCandidateEvaluationRequest,
    false,
  );
  assert.equal(verification.candidateEvaluationAuthorized, false);
  assert.equal(verification.rolloutAuthorized, false);
  assert.equal(verification.productionReadyClaim, false);
  assert.equal(
    assertLocalTrainingCandidateArtifactVerification(
      verification,
    ),
    verification,
  );
  assert.equal(
    assertLocalTrainingRun({
      approval: fixture.approval,
      currentPermission: fixture.permission,
      postAcquisitionReadiness:
        fixture.postAcquisitionReadiness,
      readinessPackage: fixture.readinessPackage,
      run: fixture.run,
    }),
    fixture.run,
  );
});

test('recorded candidate artifacts become eligible only for an explicit local evaluation request', async (t) => {
  const fixture =
    await createLocalTrainingCandidateArtifactVerificationFixture({
      mode: 'recorded-local-training',
    });
  t.after(fixture.cleanup);

  const verification = await fixture.verifier.verify(
    fixture.input,
  );
  assert.equal(
    verification.actualCandidateArtifactsObserved,
    true,
  );
  assert.equal(
    verification.readyForExplicitCandidateEvaluationRequest,
    true,
  );
  assert.equal(verification.actualModelTrainingExecuted, false);
  assert.equal(
    verification.trainingProcessProvenanceVerified,
    false,
  );
  assert.equal(verification.candidateEvaluationAuthorized, false);
  assert.equal(verification.rolloutAuthorized, false);
});

test('candidate artifact verifier rejects file, inventory, link, run, and permission drift', async (t) => {
  const fixtures = [];
  t.after(() => fixtures.forEach((fixture) => fixture.cleanup()));

  async function createFixture() {
    const fixture =
      await createLocalTrainingCandidateArtifactVerificationFixture();
    fixtures.push(fixture);
    return fixture;
  }

  const tamperedFile = await createFixture();
  fs.appendFileSync(
    path.join(
      tamperedFile.artifactRoot,
      'adapter.safetensors',
    ),
    'tampered',
  );
  await assert.rejects(
    tamperedFile.verifier.verify(tamperedFile.input),
    /file-integrity/,
  );

  const extraFile = await createFixture();
  fs.writeFileSync(
    path.join(extraFile.artifactRoot, 'unlisted.bin'),
    'unlisted',
  );
  await assert.rejects(
    extraFile.verifier.verify(extraFile.input),
    /complete-inventory/,
  );

  const linkedFile = await createFixture();
  fs.symlinkSync(
    path.join(
      linkedFile.artifactRoot,
      'adapter.safetensors',
    ),
    path.join(linkedFile.artifactRoot, 'unlisted-link'),
  );
  await assert.rejects(
    linkedFile.verifier.verify(linkedFile.input),
    /symbolic links/,
  );

  const runDrift = await createFixture();
  await assert.rejects(
    runDrift.verifier.verify({
      ...runDrift.input,
      run: {
        ...runDrift.run,
        completedAt: '2026-07-17T08:40:00.000Z',
      },
    }),
    /integrity-or-binding/,
  );

  const permissionDrift = await createFixture();
  await assert.rejects(
    permissionDrift.verifier.verify({
      ...permissionDrift.input,
      currentPermission: {
        ...permissionDrift.permission,
        id: 'local-training-permission-stale',
      },
    }),
    /permission-current-state/,
  );

  const revoked = await createFixture();
  await assert.rejects(
    revoked.verifier.verify({
      ...revoked.input,
      permissionRevocation: {
        status: 'revoked',
      },
    }),
    /post-acquisition-admission/,
  );
});

test('candidate artifact verification record rejects semantic tampering', async (t) => {
  const fixture =
    await createLocalTrainingCandidateArtifactVerificationFixture();
  t.after(fixture.cleanup);
  const verification = await fixture.verifier.verify(
    fixture.input,
  );

  assert.throws(
    () => assertLocalTrainingCandidateArtifactVerification({
      ...verification,
      candidateEvaluationAuthorized: true,
    }),
    /record failed: integrity/,
  );
  assert.throws(
    () => assertLocalTrainingCandidateArtifactVerification({
      ...verification,
      candidate: {
        ...verification.candidate,
        files: [],
      },
    }),
    /record failed: integrity|record failed: candidate/,
  );
});
