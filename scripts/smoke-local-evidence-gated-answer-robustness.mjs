import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertContentFreeEvidenceGatedAnswerRobustnessArtifact,
  assertEvidenceGatedAnswerRobustnessBindings,
  assertLocalEvidenceGatedAnswerRobustnessArtifact,
  hashEvidenceGatedAnswerRobustnessRecord,
} from '../src/core/evidence-gated-answer-robustness.mjs';

const repoDir = process.cwd();
const inputs = readBoundInputs();
const bindings = assertEvidenceGatedAnswerRobustnessBindings(inputs);
const artifact = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'evidence/output-artifacts/local-evidence-gated-answer-robustness.json'),
  'utf8',
));
const deterministicArtifact = JSON.parse(fs.readFileSync(
  path.join(repoDir, 'evidence/output-artifacts/evidence-gated-answer-robustness.json'),
  'utf8',
));

assertLocalEvidenceGatedAnswerRobustnessArtifact(artifact, {
  bindings,
  deterministicArtifact,
  fixtureText: inputs.fixtureText,
  q9LocalArtifact: JSON.parse(inputs.q9LocalArtifactText),
  requireCandidatePass: true,
});
assertContentFreeEvidenceGatedAnswerRobustnessArtifact(
  artifact,
  collectForbiddenValues(),
);

const tampered = structuredClone(artifact);
tampered.summary.qualityPassCount = 3;
assert.throws(
  () => assertLocalEvidenceGatedAnswerRobustnessArtifact(tampered, {
    bindings,
    deterministicArtifact,
    fixtureText: inputs.fixtureText,
    q9LocalArtifact: JSON.parse(inputs.q9LocalArtifactText),
  }),
  /integrity/,
);

const { id, integrityHash, ...content } = tampered;
void id;
void integrityHash;
tampered.integrityHash = hashEvidenceGatedAnswerRobustnessRecord(content);
tampered.id = `local-evidence-gated-answer-robustness-${tampered.integrityHash}`;
assert.throws(
  () => assertLocalEvidenceGatedAnswerRobustnessArtifact(tampered, {
    bindings,
    deterministicArtifact,
    fixtureText: inputs.fixtureText,
    q9LocalArtifact: JSON.parse(inputs.q9LocalArtifactText),
  }),
  /semantic/,
);

console.log(JSON.stringify({
  mode: 'smoke-local-evidence-gated-answer-robustness',
  ok: true,
  qualityPassCount: artifact.summary.qualityPassCount,
}, null, 2));

function collectForbiddenValues() {
  const fixture = JSON.parse(fs.readFileSync(
    path.join(repoDir, 'fixtures/evidence-gated-answer-robustness-cases-v1.json'),
    'utf8',
  ));
  return fixture.cases.flatMap((caseDefinition) => [
    caseDefinition.q9Case.objective,
    ...caseDefinition.q9Case.sources.flatMap((source) => [
      source.sourceKey,
      source.text,
    ]),
    ...(caseDefinition.answerQualityContract?.requiredAnswerTerms || []),
  ]).filter((value) => String(value).length >= 8);
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
