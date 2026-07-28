import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertEvidenceGatedAnswerRobustnessArtifact,
  assertEvidenceGatedAnswerRobustnessBindings,
  hashEvidenceGatedAnswerRobustnessRecord,
} from '../src/core/evidence-gated-answer-robustness.mjs';

const repoDir = process.cwd();
const inputs = readBoundInputs();
const bindings = assertEvidenceGatedAnswerRobustnessBindings(inputs);
const artifact = JSON.parse(readText(
  'evidence/output-artifacts/evidence-gated-answer-robustness.json',
));

assertEvidenceGatedAnswerRobustnessArtifact(artifact, {
  bindings,
  fixture: bindings.fixture,
  fixtureText: inputs.fixtureText,
});
assert.deepEqual(artifact.aggregate, {
  caseCount: 12,
  casePassRate: 1,
  gateBlockedCount: 8,
  generationAttemptCount: 4,
  generatorCallCount: 4,
  qualityPassCount: 4,
});

for (const mutate of [
  (candidate) => { candidate.cases[4].state = 'irrelevant'; },
  (candidate) => { candidate.fixtureHash = '0'.repeat(64); },
  (candidate) => { candidate.q7EvidenceHash = '0'.repeat(64); },
  (candidate) => { candidate.q9ArtifactHash = '0'.repeat(64); },
  (candidate) => { candidate.q10ArtifactHash = '0'.repeat(64); },
]) {
  const tampered = rehashArtifact(artifact, mutate);
  assert.throws(
    () => assertEvidenceGatedAnswerRobustnessArtifact(tampered, {
      bindings,
      fixture: bindings.fixture,
      fixtureText: inputs.fixtureText,
    }),
    /semantic/,
  );
}

console.log(JSON.stringify({
  caseCount: artifact.aggregate.caseCount,
  mode: 'smoke-evidence-gated-answer-robustness',
  ok: true,
  qualityPassCount: artifact.aggregate.qualityPassCount,
}, null, 2));

function rehashArtifact(artifact, mutate) {
  const candidate = structuredClone(artifact);
  delete candidate.id;
  delete candidate.integrityHash;
  mutate(candidate);
  candidate.integrityHash = hashEvidenceGatedAnswerRobustnessRecord(candidate);
  candidate.id = `evidence-gated-answer-robustness-${candidate.integrityHash}`;
  return candidate;
}

function readBoundInputs() {
  return {
    fixtureText: readText('fixtures/evidence-gated-answer-robustness-cases-v1.json'),
    q7EvidenceText: readText('evidence/output-artifacts/local-answer-review-action-generalization.json'),
    q9ArtifactText: readText('evidence/output-artifacts/rag-evidence-sufficiency.json'),
    q9CoreText: readText('src/core/rag-evidence-sufficiency-evaluation.mjs'),
    q9FixtureText: readText('fixtures/rag-evidence-sufficiency-cases-v1.json'),
    q9LocalArtifactText: readText('evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json'),
    q10ArtifactText: readText('evidence/output-artifacts/evidence-gated-answer-shadow.json'),
    q10CoreText: readText('src/core/evidence-gated-answer-shadow.mjs'),
    q10FixtureText: readText('fixtures/evidence-gated-answer-cases-v1.json'),
    q10LocalArtifactText: readText('evidence/output-artifacts/local-evidence-gated-answer-shadow.json'),
  };
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}
