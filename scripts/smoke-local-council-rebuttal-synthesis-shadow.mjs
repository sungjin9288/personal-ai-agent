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
  assertLocalCouncilRebuttalSynthesisShadowArtifact,
} from '../src/core/local-council-rebuttal-synthesis-shadow.mjs';
import {
  assertLocalCouncilSeatContractShadowArtifact,
} from '../src/core/local-council-seat-contract-shadow.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const c6FixtureText = readText('fixtures/local-council-provider-shadow-v1.json');
const c7FixtureText = readText('fixtures/local-council-seat-contract-shadow-v1.json');
const c8FixtureText = readText('fixtures/local-council-claim-contract-robustness-v1.json');
const c9FixtureText = readText('fixtures/local-council-rebuttal-synthesis-shadow-v1.json');
const c6Artifact = readJson('evidence/output-artifacts/local-council-provider-shadow.json');
const c7Artifact = readJson('evidence/output-artifacts/local-council-seat-contract-shadow.json');
const c8Artifact = readJson('evidence/output-artifacts/local-council-claim-contract-robustness.json');
const artifact = readJson('evidence/output-artifacts/local-council-rebuttal-synthesis-shadow.json');

assert.equal(fileHash('evidence/output-artifacts/local-council-provider-shadow.json'), '85e1dc53c1897f481fb004ad8cb5a925dd08eefa153a37d23d206105ea28c2a5');
assert.equal(fileHash('evidence/output-artifacts/local-council-seat-contract-shadow.json'), '18a4d47141b607e67124d4867b0489e9ec92ff4fe59765d9c18a504cd699c206');
assert.equal(fileHash('evidence/output-artifacts/local-council-claim-contract-robustness.json'), 'ac47dc2368477adb7f04e6c309ad009fd356710b86d89c1c3afbdcd1303df93d');
assertLocalCouncilProviderShadowArtifact(c6Artifact, { fixtureText: c6FixtureText });
assertLocalCouncilSeatContractShadowArtifact(c7Artifact, { baselineArtifact: c6Artifact, fixtureText: c7FixtureText });
assertLocalCouncilClaimContractRobustnessArtifact(c8Artifact, {
  c6BaselineArtifact: c6Artifact,
  c7BaselineArtifact: c7Artifact,
  fixtureText: c8FixtureText,
});
assertLocalCouncilRebuttalSynthesisShadowArtifact(artifact, {
  c6BaselineArtifact: c6Artifact,
  c7BaselineArtifact: c7Artifact,
  c8BaselineArtifact: c8Artifact,
  fixtureText: c9FixtureText,
});

assert.equal(artifact.promptProfile.id, 'seat-scoped-v3');
assert.equal(artifact.diagnostic.failureSubreason, 'claim-severity');
assert.equal(artifact.qualification.c6BaselinePreserved, true);
assert.equal(artifact.qualification.c7BaselinePreserved, true);
assert.equal(artifact.qualification.c8BaselinePreserved, true);
assert.equal(artifact.qualification.c8FailureDiagnosed, true);
assert.deepEqual(artifact.calls.map(({ phase, seatId }) => `${phase}:${seatId}`), [
  'opening-position:research',
  'opening-position:implementation',
  'opening-position:verification',
  'rebuttal:research',
  'rebuttal:implementation',
  'rebuttal:verification',
  'synthesis:chair',
]);
assert.equal(artifact.defaultProfilePromotionAuthorized, false);
assert.equal(artifact.runtimeActivation, false);
assert.equal(artifact.trainingAuthorized, false);
assert.equal(artifact.productionReadyClaim, false);
assert.equal(artifact.actualUserData, false);
assert.equal(artifact.externalProviderCallCount, 0);
assert.equal(artifact.apiCostUsd, 0);

if (artifact.localShadowQualified) {
  assert.equal(artifact.qualification.decision, 'eligible-for-independent-review');
  assert.equal(artifact.summary.passedCallCount, 7);
  assert.equal(artifact.summary.matchedRebuttalTargetCount, 3);
  assert.equal(artifact.validation.status, 'passed');
} else {
  assert.equal(artifact.qualification.decision, 'keep-stub-only');
}

const tampered = structuredClone(artifact);
tampered.summary.totalTokens += 1;
const { id: _id, integrityHash: _integrityHash, ...content } = tampered;
tampered.integrityHash = hashLocalCouncilShadowValue(content);
tampered.id = `local-council-rebuttal-synthesis-shadow-${tampered.integrityHash}`;
assert.throws(() => assertLocalCouncilRebuttalSynthesisShadowArtifact(tampered, {
  c6BaselineArtifact: c6Artifact,
  c7BaselineArtifact: c7Artifact,
  c8BaselineArtifact: c8Artifact,
  fixtureText: c9FixtureText,
}));

const temporaryRepository = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-local-council-c9-'));
try {
  const writtenPath = writeEvidenceJson({
    artifact,
    defaultRelativePath: 'local-council-rebuttal-synthesis-shadow.json',
    label: 'Local council rebuttal synthesis shadow smoke output',
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
  mode: 'smoke-local-council-rebuttal-synthesis-shadow',
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
