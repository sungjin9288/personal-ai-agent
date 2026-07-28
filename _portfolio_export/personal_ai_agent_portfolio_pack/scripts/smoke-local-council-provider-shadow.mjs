import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalCouncilProviderShadowArtifact,
} from '../src/core/local-council-provider-shadow.mjs';
import { writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const fixtureText = fs.readFileSync(
  path.join(repoDir, 'fixtures/local-council-provider-shadow-v1.json'),
  'utf8',
);
const outputPath = path.join(
  repoDir,
  'evidence/output-artifacts/local-council-provider-shadow.json',
);
const artifact = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

assertLocalCouncilProviderShadowArtifact(artifact, { fixtureText });
assert.equal(artifact.localShadowQualified, false);
assert.equal(artifact.qualification.decision, 'keep-stub-only');
assert.equal(artifact.qualification.contractValidated, false);
assert.equal(artifact.qualification.sharedOpeningPromptVerified, true);
assert.equal(artifact.qualification.independentOpeningDiversityObserved, false);
assert.equal(artifact.summary.distinctOpeningPromptCount, 1);
assert.equal(artifact.summary.distinctOpeningOutputCount, 1);
assert.equal(artifact.summary.passedCallCount, 3);
assert.equal(artifact.summary.failedCallCount, 3);
assert.equal(artifact.summary.notAttemptedCallCount, 1);
assert.deepEqual(
  artifact.calls.map(({ phase, status }) => `${phase}:${status}`),
  [
    'opening-position:passed',
    'opening-position:passed',
    'opening-position:passed',
    'rebuttal:failed',
    'rebuttal:failed',
    'rebuttal:failed',
    'synthesis:not-attempted',
  ],
);
assert.equal(
  artifact.calls
    .filter((call) => call.phase === 'rebuttal')
    .every((call) => call.failureKind?.startsWith('council-contract:')),
  true,
);
assert.equal(artifact.calls.at(-1).failureKind, 'dependency-blocked');

const temporaryRepository = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-local-council-shadow-'),
);
try {
  const writtenPath = writeEvidenceJson({
    artifact,
    defaultRelativePath: 'local-council-provider-shadow.json',
    label: 'Local council provider shadow smoke output',
    repoDir: temporaryRepository,
  });
  const stat = fs.statSync(writtenPath);
  assert.equal(stat.mode & 0o777, 0o600);
  assert.equal(stat.nlink, 1);
} finally {
  fs.rmSync(temporaryRepository, { force: true, recursive: true });
}

console.log(JSON.stringify({
  decision: artifact.qualification.decision,
  failedCallCount: artifact.summary.failedCallCount,
  mode: 'smoke-local-council-provider-shadow',
  ok: true,
  passedCallCount: artifact.summary.passedCallCount,
}, null, 2));
