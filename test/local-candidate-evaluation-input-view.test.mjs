import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  createLocalCandidateEvaluationInputView,
  describeLocalCandidateEvaluationSuite,
} from '../src/core/local-candidate-evaluation-input-view.mjs';
import {
  createLocalCandidateEvaluationRuntimeFixture,
} from '../scripts/evaluate-local-candidate-evaluation-runtime.mjs';

const OBSERVED_AT = '2026-07-17T08:45:00.000Z';

test('evaluation suite descriptor binds the exact admitted bytes', async (t) => {
  const fixture =
    await createLocalCandidateEvaluationRuntimeFixture();
  t.after(fixture.cleanup);
  const suiteContract = fixture.request.evaluationSuite;

  const descriptor =
    describeLocalCandidateEvaluationSuite(
      fixture.evaluationSuiteContent,
      suiteContract,
    );
  const changedDescriptor =
    describeLocalCandidateEvaluationSuite(
      `${fixture.evaluationSuiteContent}\n`,
      suiteContract,
    );

  assert.deepEqual(descriptor, suiteContract.artifact);
  assert.equal(
    changedDescriptor.byteLength,
    descriptor.byteLength + 1,
  );
  assert.notEqual(changedDescriptor.sha256, descriptor.sha256);
});

test('input view copies only admitted files, verifies them, and cleans up', async (t) => {
  const fixture =
    await createLocalCandidateEvaluationRuntimeFixture();
  t.after(fixture.cleanup);
  const view =
    await createLocalCandidateEvaluationInputView({
      candidateArtifactVerification:
        fixture.candidateArtifactVerification,
      candidateVerificationInput: fixture.input,
      evaluationSuite: fixture.request.evaluationSuite,
      evaluatorDefinition: fixture.evaluator.definition,
      evaluatorProvenance:
        fixture.request.evaluatorProvenance,
      fileSystem: fs,
      maximumDiskBytes:
        fixture.request.resourceLimits.maxDiskBytes,
      repoDir: fixture.candidateRepoRoot,
      suiteContent: fixture.evaluationSuiteContent,
      temporaryDirectory: fixture.temporaryDirectory,
    });

  const verified = await view.verifyInputs(OBSERVED_AT);
  assert.equal(
    verified.candidateVerification.candidate
      .artifactSetSha256,
    fixture.candidateArtifactVerification.candidate
      .artifactSetSha256,
  );
  assert.equal(
    fs.realpathSync(
      path.join(
        view.rootDir,
        view.suiteArtifact.path,
      ),
    ).startsWith(fs.realpathSync(view.rootDir)),
    true,
  );

  view.cleanup();
  view.cleanup();
  assert.deepEqual(
    fs.readdirSync(fixture.temporaryDirectory),
    [],
  );
});

test('input view includes suite and evaluator bytes in the admitted disk envelope', async (t) => {
  const fixture =
    await createLocalCandidateEvaluationRuntimeFixture();
  t.after(fixture.cleanup);

  await assert.rejects(
    createLocalCandidateEvaluationInputView({
      candidateArtifactVerification:
        fixture.candidateArtifactVerification,
      candidateVerificationInput: fixture.input,
      evaluationSuite: fixture.request.evaluationSuite,
      evaluatorDefinition: fixture.evaluator.definition,
      evaluatorProvenance:
        fixture.request.evaluatorProvenance,
      fileSystem: fs,
      maximumDiskBytes:
        fixture.candidateArtifactVerification.observedDiskBytes,
      repoDir: fixture.candidateRepoRoot,
      suiteContent: fixture.evaluationSuiteContent,
      temporaryDirectory: fixture.temporaryDirectory,
    }),
    /resource-envelope/,
  );
  assert.deepEqual(
    fs.readdirSync(fixture.temporaryDirectory),
    [],
  );
});
