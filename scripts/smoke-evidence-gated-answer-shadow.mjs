import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertContentFreeEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerBindings,
  buildEvidenceGatedAnswerArtifact,
  evaluateEvidenceGatedAnswerSuite,
  hashEvidenceGatedAnswerRecord,
  hashEvidenceGatedAnswerValue,
} from '../src/core/evidence-gated-answer-shadow.mjs';

const repoDir = process.cwd();
const inputs = readInputs();
const bindings = assertEvidenceGatedAnswerBindings(inputs);
const artifact = readJson(
  'evidence/output-artifacts/evidence-gated-answer-shadow.json',
);
assertEvidenceGatedAnswerArtifact(artifact);
assert.equal(
  artifact.fixtureHash,
  hashEvidenceGatedAnswerValue(inputs.fixtureText),
);

let callCount = 0;
const suite = await evaluateEvidenceGatedAnswerSuite({
  fixture: bindings.fixture,
  generator: {
    promptHash: bindings.fixture.q7PromptHash,
    promptVersion: bindings.fixture.q7PromptVersion,
    async generate({ retrievedItems }) {
      callCount += 1;
      return {
        answer: {
          citedSourceKeys: retrievedItems.map((item) => item.sourceKey),
          text: retrievedItems.map((item) => item.snippet).join(' '),
        },
      };
    },
  },
  q9Fixture: bindings.q9Fixture,
});
assert.equal(callCount, 1);
const expected = buildEvidenceGatedAnswerArtifact({
  bindings: bindings.fixture,
  fixtureHash: artifact.fixtureHash,
  suite,
});
assert.equal(artifact.integrityHash, expected.integrityHash);

const sufficient = bindings.q9Fixture.cases.find(
  (item) => item.id === 'sufficient',
);
const contract = bindings.fixture.cases.find(
  (item) => item.expectedState === 'sufficient',
).answerQualityContract;
assertContentFreeEvidenceGatedAnswerArtifact(artifact, [
  sufficient.objective,
  ...sufficient.requiredClaimKeys,
  ...sufficient.sources.flatMap((source) => [
    source.sourceKey,
    source.text,
  ]),
  ...contract.requiredAnswerTerms,
  ...contract.forbiddenAnswerTerms,
]);

const tampered = structuredClone(artifact);
tampered.aggregate.gateBlockedCount = 3;
assert.throws(
  () => assertEvidenceGatedAnswerArtifact(tampered),
  /artifact-integrity/u,
);

const rehashed = structuredClone(artifact);
rehashed.aggregate.gateBlockedCount = 3;
const { id: ignoredId, integrityHash: ignoredHash, ...content } = rehashed;
void ignoredId;
void ignoredHash;
rehashed.integrityHash = hashEvidenceGatedAnswerRecord(content);
rehashed.id =
  `evidence-gated-answer-shadow-${rehashed.integrityHash}`;
assert.throws(
  () => assertEvidenceGatedAnswerArtifact(rehashed),
  /artifact-semantic-drift/u,
);

assert.deepEqual(
  Object.fromEntries(
    artifact.cases.map((item) => [
      item.state,
      {
        action: item.action,
        attempted: item.generation.attempted,
      },
    ]),
  ),
  {
    conflicting: { action: 'abstain', attempted: false },
    irrelevant: {
      action: 'request-more-evidence',
      attempted: false,
    },
    'no-evidence': { action: 'abstain', attempted: false },
    partial: {
      action: 'request-more-evidence',
      attempted: false,
    },
    sufficient: { action: 'answer', attempted: true },
  },
);
assert.equal(
  bindings.q9LocalArtifact.aggregate.modelConforms,
  false,
);
assert.equal(
  bindings.q9LocalArtifact.aggregate.modelFailureCount,
  1,
);
assert.equal(
  bindings.q9LocalArtifact.observations.some((item) =>
    item.failureCodes.includes('unnecessary-abstention')),
  true,
);

console.log(JSON.stringify({
  caseCount: artifact.aggregate.caseCount,
  gateBlockedCount: artifact.aggregate.gateBlockedCount,
  generationAttemptCount: artifact.aggregate.generationAttemptCount,
  mode: 'smoke-evidence-gated-answer-shadow',
  ok: true,
  priorQ9ModelConforms:
    bindings.q9LocalArtifact.aggregate.modelConforms,
  priorQ9ModelFailureCount:
    bindings.q9LocalArtifact.aggregate.modelFailureCount,
  qualityPassCount: artifact.aggregate.qualityPassCount,
}, null, 2));

function readInputs() {
  return {
    fixtureText: readText('fixtures/evidence-gated-answer-cases-v1.json'),
    q7EvidenceText: readText(
      'evidence/output-artifacts/local-answer-review-action-generalization.json',
    ),
    q9ArtifactText: readText(
      'evidence/output-artifacts/rag-evidence-sufficiency.json',
    ),
    q9FixtureText: readText(
      'fixtures/rag-evidence-sufficiency-cases-v1.json',
    ),
    q9LocalArtifactText: readText(
      'evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json',
    ),
  };
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}
