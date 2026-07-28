import fs from 'node:fs';
import path from 'node:path';

import {
  assertContentFreeEvidenceGatedAnswerRobustnessArtifact,
  assertEvidenceGatedAnswerRobustnessArtifact,
  assertEvidenceGatedAnswerRobustnessBindings,
  assertEvidenceGatedAnswerRobustnessCandidatePassed,
  buildEvidenceGatedAnswerRobustnessArtifact,
  evaluateEvidenceGatedAnswerRobustnessSuite,
  hashEvidenceGatedAnswerRobustnessValue,
} from '../src/core/evidence-gated-answer-robustness.mjs';
import {
  resolveEvidenceOutputPath,
  writeEvidenceJson,
} from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const outputPath = resolveEvidenceOutputPath({
  defaultRelativePath: 'evidence/output-artifacts/evidence-gated-answer-robustness.json',
  label: 'Evidence-gated answer robustness output',
  repoDir,
  value: readOutputArgument(process.argv.slice(2)),
});
const inputs = readBoundInputs();
const bindings = assertEvidenceGatedAnswerRobustnessBindings(inputs);
const generator = createDeterministicGenerator(bindings.fixture);
const suite = await evaluateEvidenceGatedAnswerRobustnessSuite({
  fixture: bindings.fixture,
  generator,
});

// The evaluator reports every row. This separate assertion decides whether the
// deterministic candidate is eligible to produce the passing artifact.
assertEvidenceGatedAnswerRobustnessCandidatePassed(suite);
if (generator.callCount !== 4) {
  throw new Error('Deterministic robustness generator call count drift.');
}

const artifact = buildEvidenceGatedAnswerRobustnessArtifact({
  bindings: bindings.fixture,
  fixtureHash: hashEvidenceGatedAnswerRobustnessValue(inputs.fixtureText),
  suite,
});
assertEvidenceGatedAnswerRobustnessArtifact(artifact, {
  bindings,
  fixture: bindings.fixture,
  fixtureText: inputs.fixtureText,
});
assertContentFreeEvidenceGatedAnswerRobustnessArtifact(
  artifact,
  collectForbiddenValues(bindings.fixture),
);
writeEvidenceJson({
  artifact,
  defaultRelativePath: 'evidence/output-artifacts/evidence-gated-answer-robustness.json',
  label: 'Evidence-gated answer robustness output',
  repoDir,
  value: outputPath,
});

console.log(JSON.stringify({
  caseCount: artifact.aggregate.caseCount,
  gateBlockedCount: artifact.aggregate.gateBlockedCount,
  generationAttemptCount: artifact.aggregate.generationAttemptCount,
  mode: 'evidence-gated-answer-robustness',
  ok: true,
  outputPath: path.relative(repoDir, outputPath),
  qualityPassCount: artifact.aggregate.qualityPassCount,
}, null, 2));

function createDeterministicGenerator(fixture) {
  let callCount = 0;
  return {
    get callCount() {
      return callCount;
    },
    promptHash: fixture.q7PromptHash,
    promptVersion: fixture.q7PromptVersion,
    async generate({ retrievedItems }) {
      callCount += 1;
      return {
        answer: {
          citedSourceKeys: retrievedItems.map((item) => item.sourceKey),
          text: retrievedItems.map((item) => item.snippet).join(' '),
        },
        observation: {
          durationMs: 0,
          outputBytes: 0,
        },
      };
    },
  };
}

function readOutputArgument(args) {
  const index = args.indexOf('--output');
  if (index === -1) {
    return '';
  }
  if (index + 1 >= args.length || args.filter((item) => item === '--output').length !== 1) {
    throw new Error('Deterministic robustness output option must appear once.');
  }
  return args[index + 1];
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

function collectForbiddenValues(fixture) {
  return fixture.cases.flatMap((caseDefinition) => [
    caseDefinition.q9Case.objective,
    ...caseDefinition.q9Case.sources.flatMap((source) => [
      source.sourceKey,
      source.text,
    ]),
    ...(caseDefinition.answerQualityContract?.requiredAnswerTerms || []),
    ...(caseDefinition.answerQualityContract?.forbiddenAnswerTerms || []),
  ]).filter((value) => String(value).length >= 8);
}
