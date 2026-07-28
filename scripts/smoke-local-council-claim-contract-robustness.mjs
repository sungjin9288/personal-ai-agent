import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalCouncilClaimContractRobustnessArtifact,
} from '../src/core/local-council-claim-contract-robustness.mjs';
import {
  assertLocalCouncilProviderShadowArtifact,
} from '../src/core/local-council-provider-shadow.mjs';
import {
  assertLocalCouncilSeatContractShadowArtifact,
} from '../src/core/local-council-seat-contract-shadow.mjs';
import { writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const c6FixtureText = readText('fixtures/local-council-provider-shadow-v1.json');
const c7FixtureText = readText('fixtures/local-council-seat-contract-shadow-v1.json');
const c8FixtureText = readText(
  'fixtures/local-council-claim-contract-robustness-v1.json',
);
const c6Artifact = readJson(
  'evidence/output-artifacts/local-council-provider-shadow.json',
);
const c7Artifact = readJson(
  'evidence/output-artifacts/local-council-seat-contract-shadow.json',
);
const artifact = readJson(
  'evidence/output-artifacts/local-council-claim-contract-robustness.json',
);

assert.equal(
  fileHash('evidence/output-artifacts/local-council-provider-shadow.json'),
  '85e1dc53c1897f481fb004ad8cb5a925dd08eefa153a37d23d206105ea28c2a5',
);
assert.equal(
  fileHash('evidence/output-artifacts/local-council-seat-contract-shadow.json'),
  '18a4d47141b607e67124d4867b0489e9ec92ff4fe59765d9c18a504cd699c206',
);
assertLocalCouncilProviderShadowArtifact(c6Artifact, {
  fixtureText: c6FixtureText,
});
assertLocalCouncilSeatContractShadowArtifact(c7Artifact, {
  baselineArtifact: c6Artifact,
  fixtureText: c7FixtureText,
});
assertLocalCouncilClaimContractRobustnessArtifact(artifact, {
  c6BaselineArtifact: c6Artifact,
  c7BaselineArtifact: c7Artifact,
  fixtureText: c8FixtureText,
});

assert.equal(artifact.promptProfile.id, 'seat-scoped-v2');
assert.equal(artifact.qualification.c6BaselinePreserved, true);
assert.equal(artifact.qualification.c7BaselinePreserved, true);
assert.equal(artifact.qualification.c7FailureDiagnosed, true);
assert.equal(artifact.diagnostic.exactFailureReproduced, true);
assert.match(
  artifact.diagnostic.failureSubreason,
  /^claim-(?:count|other|position|seat|severity)$/,
);
assert.equal(artifact.calls.length, 7);
assert.deepEqual(
  artifact.calls.map(({ phase, seatId }) => `${phase}:${seatId}`),
  [
    'opening-position:research',
    'opening-position:implementation',
    'opening-position:verification',
    'rebuttal:research',
    'rebuttal:implementation',
    'rebuttal:verification',
    'synthesis:chair',
  ],
);
assert.equal(artifact.summary.distinctOpeningPromptCount, 3);
assert.equal(artifact.qualification.openingIsolationVerified, true);
assert.equal(artifact.defaultProfilePromotionAuthorized, false);
assert.equal(artifact.runtimeActivation, false);
assert.equal(artifact.actualUserData, false);
assert.equal(artifact.apiCostUsd, 0);
assert.equal(artifact.externalProviderCallCount, 0);
assert.equal(artifact.productionReadyClaim, false);
assert.equal(artifact.trainingAuthorized, false);

if (artifact.localShadowQualified) {
  assert.equal(artifact.qualification.decision, 'eligible-for-independent-review');
  assert.equal(artifact.summary.passedCallCount, 7);
  assert.equal(artifact.summary.matchedRebuttalTargetCount, 3);
  assert.equal(artifact.qualification.contractValidated, true);
  assert.equal(artifact.qualification.deterministicRebuttalTargetsVerified, true);
  assert.equal(artifact.validation.status, 'passed');
} else {
  assert.equal(artifact.qualification.decision, 'keep-stub-only');
}

const temporaryRepository = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-local-council-claim-contract-'),
);
try {
  const writtenPath = writeEvidenceJson({
    artifact,
    defaultRelativePath: 'local-council-claim-contract-robustness.json',
    label: 'Local council claim contract robustness smoke output',
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
  diagnosticFailureSubreason: artifact.diagnostic.failureSubreason,
  matchedRebuttalTargetCount: artifact.summary.matchedRebuttalTargetCount,
  mode: 'smoke-local-council-claim-contract-robustness',
  ok: true,
  passedCallCount: artifact.summary.passedCallCount,
}, null, 2));

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function fileHash(relativePath) {
  return createHash('sha256')
    .update(fs.readFileSync(path.join(repoDir, relativePath)))
    .digest('hex');
}
