import fs from 'node:fs';
import path from 'node:path';

import {
  assertContentFreeEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerBindings,
  buildEvidenceGatedAnswerArtifact,
  evaluateEvidenceGatedAnswerSuite,
  hashEvidenceGatedAnswerValue,
} from '../src/core/evidence-gated-answer-shadow.mjs';
import {
  resolveEvidenceOutputPath,
  writeEvidenceJson,
} from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const outputPath = readOutputPath(process.argv.slice(2));
const inputs = readInputs();
const bindings = assertEvidenceGatedAnswerBindings(inputs);
const generator = createDeterministicGenerator(bindings.fixture);
const suite = await evaluateEvidenceGatedAnswerSuite({
  fixture: bindings.fixture,
  generator,
  q9Fixture: bindings.q9Fixture,
});
const artifact = buildEvidenceGatedAnswerArtifact({
  bindings: bindings.fixture,
  fixtureHash: hashEvidenceGatedAnswerValue(inputs.fixtureText),
  suite,
});
assertEvidenceGatedAnswerArtifact(artifact);
assertContentFreeEvidenceGatedAnswerArtifact(
  artifact,
  collectForbiddenArtifactValues(bindings),
);
writeEvidenceJson({
  artifact,
  defaultRelativePath:
    'evidence/output-artifacts/evidence-gated-answer-shadow.json',
  label: 'Evidence-gated answer shadow output',
  repoDir,
  value: outputPath,
});

console.log(JSON.stringify({
  caseCount: artifact.aggregate.caseCount,
  currentAnswerPathChanged: artifact.currentAnswerPathChanged,
  gateBlockedCount: artifact.aggregate.gateBlockedCount,
  generationAttemptCount: artifact.aggregate.generationAttemptCount,
  integrityHash: artifact.integrityHash,
  mode: 'evidence-gated-answer-shadow',
  ok: true,
  outputPath: relativePath(outputPath),
  productionReadyClaim: artifact.productionReadyClaim,
  qualityPassCount: artifact.aggregate.qualityPassCount,
  runtimeActivation: artifact.runtimeActivation,
}, null, 2));

function createDeterministicGenerator(fixture) {
  return {
    promptHash: fixture.q7PromptHash,
    promptVersion: fixture.q7PromptVersion,
    async generate({ retrievedItems }) {
      const answer = {
        citedSourceKeys: retrievedItems.map((item) => item.sourceKey),
        text: retrievedItems.map((item) => item.snippet).join(' '),
      };
      return {
        answer,
        observation: {
          durationMs: 0,
          inputHash: hashEvidenceGatedAnswerValue(
            JSON.stringify(retrievedItems),
          ),
          outputBytes: Buffer.byteLength(JSON.stringify(answer), 'utf8'),
          promptHash: fixture.q7PromptHash,
          promptVersion: fixture.q7PromptVersion,
          responseHash: hashEvidenceGatedAnswerValue(
            JSON.stringify(answer),
          ),
        },
      };
    },
  };
}

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

function collectForbiddenArtifactValues(bindings) {
  const sufficient = bindings.q9Fixture.cases.find(
    (item) => item.id === 'sufficient',
  );
  const contract = bindings.fixture.cases.find(
    (item) => item.expectedState === 'sufficient',
  ).answerQualityContract;
  return [
    sufficient.objective,
    ...sufficient.requiredClaimKeys,
    ...sufficient.sources.flatMap((source) => [
      source.sourceKey,
      source.text,
    ]),
    ...contract.requiredAnswerTerms,
    ...contract.forbiddenAnswerTerms,
  ];
}

function readOutputPath(args) {
  if (args.length === 0) {
    return resolveEvidenceOutputPath({
      defaultRelativePath:
        'evidence/output-artifacts/evidence-gated-answer-shadow.json',
      label: 'Evidence-gated answer shadow output',
      repoDir,
    });
  }
  if (args.length !== 2 || args[0] !== '--output' || !String(args[1]).trim()) {
    throw new Error(
      'Evidence-gated answer shadow accepts only --output <path>.',
    );
  }
  return resolveEvidenceOutputPath({
    defaultRelativePath:
      'evidence/output-artifacts/evidence-gated-answer-shadow.json',
    label: 'Evidence-gated answer shadow output',
    repoDir,
    value: args[1],
  });
}

function relativePath(filename) {
  return path.relative(repoDir, filename).split(path.sep).join('/');
}
