import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  assertLocalCouncilProviderShadowArtifact,
} from '../src/core/local-council-provider-shadow.mjs';
import {
  assertLocalCouncilSeatContractShadowArtifact,
} from '../src/core/local-council-seat-contract-shadow.mjs';
import { writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const baselineFixtureText = fs.readFileSync(
  path.join(repoDir, 'fixtures/local-council-provider-shadow-v1.json'),
  'utf8',
);
const baselineArtifact = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'evidence/output-artifacts/local-council-provider-shadow.json'),
  'utf8',
));
const fixtureText = fs.readFileSync(
  path.join(repoDir, 'fixtures/local-council-seat-contract-shadow-v1.json'),
  'utf8',
);
const artifact = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'evidence/output-artifacts/local-council-seat-contract-shadow.json'),
  'utf8',
));

assertLocalCouncilProviderShadowArtifact(baselineArtifact, {
  fixtureText: baselineFixtureText,
});
assertLocalCouncilSeatContractShadowArtifact(artifact, {
  baselineArtifact,
  fixtureText,
});

assert.equal(artifact.promptProfile.id, 'seat-scoped-v1');
assert.equal(artifact.qualification.c6BaselinePreserved, true);
assert.equal(artifact.qualification.openingIsolationVerified, true);
assert.equal(artifact.qualification.seatScopedOpeningPromptsVerified, true);
assert.equal(artifact.summary.distinctOpeningPromptCount, 3);
assert.equal(artifact.targetBindings.length, 3);
assert.equal(
  new Set(artifact.targetBindings.map((binding) => binding.expectedTargetHash)).size,
  3,
);
assert.equal(artifact.defaultProfilePromotionAuthorized, false);
assert.equal(artifact.runtimeActivation, false);
assert.equal(artifact.actualUserData, false);
assert.equal(artifact.apiCostUsd, 0);
assert.equal(artifact.externalProviderCallCount, 0);
assert.equal(artifact.productionReadyClaim, false);
assert.equal(artifact.trainingAuthorized, false);

if (artifact.localShadowQualified) {
  assert.equal(artifact.qualification.decision, 'eligible-for-independent-review');
  assert.equal(artifact.qualification.contractValidated, true);
  assert.equal(artifact.qualification.deterministicRebuttalTargetsVerified, true);
  assert.equal(artifact.qualification.independentOpeningDiversityObserved, true);
} else {
  assert.equal(artifact.qualification.decision, 'keep-stub-only');
}

const temporaryRepository = fs.mkdtempSync(
  path.join(os.tmpdir(), 'personal-ai-agent-local-council-seat-contract-'),
);
try {
  const writtenPath = writeEvidenceJson({
    artifact,
    defaultRelativePath: 'local-council-seat-contract-shadow.json',
    label: 'Local council seat contract shadow smoke output',
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
  distinctOpeningOutputCount: artifact.summary.distinctOpeningOutputCount,
  matchedRebuttalTargetCount: artifact.summary.matchedRebuttalTargetCount,
  mode: 'smoke-local-council-seat-contract-shadow',
  ok: true,
  passedCallCount: artifact.summary.passedCallCount,
}, null, 2));
