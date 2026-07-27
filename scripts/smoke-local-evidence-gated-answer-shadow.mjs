import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertContentFreeEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerBindings,
  assertLocalEvidenceGatedAnswerAttributionStable,
  assertLocalEvidenceGatedAnswerShadow,
  hashEvidenceGatedAnswerRecord,
} from '../src/core/evidence-gated-answer-shadow.mjs';

const repoDir = process.cwd();
const inputs = readInputs();
const bindings = assertEvidenceGatedAnswerBindings(inputs);
const deterministicArtifact = readJson(
  'evidence/output-artifacts/evidence-gated-answer-shadow.json',
);
const artifact = readJson(
  'evidence/output-artifacts/local-evidence-gated-answer-shadow.json',
);
assertEvidenceGatedAnswerArtifact(deterministicArtifact);
assertLocalEvidenceGatedAnswerShadow(artifact, {
  deterministicArtifact,
  fixture: bindings.fixture,
  priorQ9Shadow: bindings.q9LocalArtifact,
  q7Evidence: bindings.q7Evidence,
});

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

assert.equal(artifact.actualModelEvaluated, true);
assert.equal(artifact.aggregate.generationAttemptCount, 1);
assert.equal(artifact.aggregate.gateBlockedCount, 4);
assert.equal(artifact.priorQ9Shadow.modelConforms, false);
assert.equal(artifact.priorQ9Shadow.modelFailureCount, 1);
assert.deepEqual(
  artifact.priorQ9Shadow.failureCodes,
  ['unnecessary-abstention'],
);
assert.equal(artifact.runtimeActivation, false);
assert.equal(artifact.productionReadyClaim, false);
assert.equal(artifact.currentAnswerPathChanged, false);

const tampered = structuredClone(artifact);
tampered.aggregate.gateBlockedCount = 3;
assert.throws(
  () =>
    assertLocalEvidenceGatedAnswerShadow(tampered, {
      deterministicArtifact,
      fixture: bindings.fixture,
      priorQ9Shadow: bindings.q9LocalArtifact,
      q7Evidence: bindings.q7Evidence,
    }),
  /local-artifact-integrity/u,
);

const rehashed = structuredClone(artifact);
rehashed.model.digest = '0'.repeat(64);
const { id: ignoredId, integrityHash: ignoredHash, ...content } = rehashed;
void ignoredId;
void ignoredHash;
rehashed.integrityHash = hashEvidenceGatedAnswerRecord(content);
rehashed.id =
  `local-evidence-gated-answer-shadow-${rehashed.integrityHash}`;
assert.throws(
  () =>
    assertLocalEvidenceGatedAnswerShadow(rehashed, {
      deterministicArtifact,
      fixture: bindings.fixture,
      priorQ9Shadow: bindings.q9LocalArtifact,
      q7Evidence: bindings.q7Evidence,
    }),
  /local-artifact-semantic-drift/u,
);

const rehashedOutcome = structuredClone(artifact);
rehashedOutcome.aggregate.qualityPassCount = 0;
rehashedOutcome.aggregate.syntheticSufficientCasePassed = false;
rehashedOutcome.observation.qualityFailureCheckIds = [
  'required-term-coverage',
];
rehashedOutcome.observation.qualityStatus = 'failed';
const {
  id: ignoredOutcomeId,
  integrityHash: ignoredOutcomeHash,
  ...outcomeContent
} = rehashedOutcome;
void ignoredOutcomeId;
void ignoredOutcomeHash;
rehashedOutcome.integrityHash =
  hashEvidenceGatedAnswerRecord(outcomeContent);
rehashedOutcome.id =
  `local-evidence-gated-answer-shadow-${rehashedOutcome.integrityHash}`;
assert.throws(
  () =>
    assertLocalEvidenceGatedAnswerShadow(rehashedOutcome, {
      deterministicArtifact,
      fixture: bindings.fixture,
      priorQ9Shadow: bindings.q9LocalArtifact,
      q7Evidence: bindings.q7Evidence,
    }),
  /local-artifact-semantic-drift/u,
);

assert.throws(
  () =>
    assertLocalEvidenceGatedAnswerAttributionStable({
      after: { digest: '0'.repeat(64), version: '0.23.0' },
      before: {
        digest: bindings.q7Evidence.model.digest,
        version: bindings.q7Evidence.runtime.version,
      },
    }),
  /model-attribution-drift/u,
);

console.log(JSON.stringify({
  actualModelEvaluated: artifact.actualModelEvaluated,
  generationAttemptCount: artifact.aggregate.generationAttemptCount,
  mode: 'smoke-local-evidence-gated-answer-shadow',
  modelId: artifact.model.id,
  ok: true,
  priorQ9ModelConforms: artifact.priorQ9Shadow.modelConforms,
  priorQ9ModelFailureCount: artifact.priorQ9Shadow.modelFailureCount,
  qualityStatus: artifact.observation.qualityStatus,
  runtimeActivation: artifact.runtimeActivation,
  syntheticSufficientCasePassed:
    artifact.aggregate.syntheticSufficientCasePassed,
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
