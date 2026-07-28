import fs from 'node:fs';
import path from 'node:path';

import {
  assertClaimSourceAttributionArtifact,
  assertClaimSourceAttributionBindings,
  assertClaimSourceAttributionCandidatePassed,
  assertContentFreeClaimSourceAttributionArtifact,
  buildClaimSourceAttributionArtifact,
  evaluateClaimSourceAttributionSuite,
} from '../src/core/evidence-gated-answer-claim-attribution.mjs';
import { resolveEvidenceOutputPath, writeEvidenceJson } from './evidence-gated-answer-output.mjs';

const repoDir = process.cwd();
const inputs = readInputs();
const bindings = assertClaimSourceAttributionBindings(inputs);
const outputPath = resolveEvidenceOutputPath({
  defaultRelativePath: 'evidence/output-artifacts/evidence-gated-answer-claim-attribution.json',
  label: 'Claim-source attribution output', repoDir, value: process.argv[2] || '',
});
const generator = deterministicGenerator(bindings.q11Fixture);
const suite = await evaluateClaimSourceAttributionSuite({ ...bindings, generator });
assertClaimSourceAttributionCandidatePassed(suite);
const artifact = buildClaimSourceAttributionArtifact({ fixture: bindings.fixture, fixtureText: inputs.fixtureText, suite });
assertClaimSourceAttributionArtifact(artifact, { fixtureText: inputs.fixtureText });
assertContentFreeClaimSourceAttributionArtifact(artifact, forbiddenValues(bindings.q11Fixture));
writeEvidenceJson({ artifact, defaultRelativePath: 'evidence/output-artifacts/evidence-gated-answer-claim-attribution.json', label: 'Claim-source attribution output', repoDir, value: outputPath });
console.log(JSON.stringify({ attributionPassCount: artifact.aggregate.attributionPassCount, caseCount: artifact.aggregate.caseCount, mode: 'evidence-gated-answer-claim-attribution', ok: true, outputPath: path.relative(repoDir, outputPath) }, null, 2));

function deterministicGenerator(q11Fixture) {
  const bySource = new Map(q11Fixture.cases.filter((item) => item.expectedState === 'sufficient').map((item) => [item.id, item]));
  return {
    promptHash: bindings.fixture.q7PromptHash,
    promptVersion: bindings.fixture.q7PromptVersion,
    async generate({ objective, retrievedItems }) {
      const row = [...bySource.values()].find((item) => item.q9Case.objective === objective);
      if (!row) throw new Error('generation-contract-error');
      const terms = row.answerQualityContract.requiredAnswerTerms;
      return { answer: { citedSourceKeys: retrievedItems.map((item) => item.sourceKey), text: ['Synthetic evidence summary.', ...retrievedItems.map((item, index) => `Evidence (${item.sourceKey}): ${terms[index]} is retained in this source claim.`), 'Reviewer action: Assigned reviewer verifies the evidence record.'].join('\n') }, observation: { durationMs: 0, outputBytes: 0 } };
    },
  };
}

function readInputs() {
  const read = (relativePath) => fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
  return {
    fixtureText: read('fixtures/evidence-gated-answer-claim-attribution-cases-v1.json'),
    q11FixtureText: read('fixtures/evidence-gated-answer-robustness-cases-v1.json'),
    q11CoreText: read('src/core/evidence-gated-answer-robustness.mjs'),
    q10CoreText: read('src/core/evidence-gated-answer-shadow.mjs'),
    q9CoreText: read('src/core/rag-evidence-sufficiency-evaluation.mjs'),
    q1EvaluatorText: read('src/core/answer-quality-evaluation.mjs'),
    q7GeneratorText: read('src/core/ollama-answer-generator.mjs'),
    q12WriterText: read('scripts/evidence-gated-answer-output.mjs'),
    q7EvidenceText: read('evidence/output-artifacts/local-answer-review-action-generalization.json'),
    q9DeterministicArtifactText: read('evidence/output-artifacts/rag-evidence-sufficiency.json'),
    q9LocalArtifactText: read('evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json'),
    q10DeterministicArtifactText: read('evidence/output-artifacts/evidence-gated-answer-shadow.json'),
    q10LocalArtifactText: read('evidence/output-artifacts/local-evidence-gated-answer-shadow.json'),
    q11DeterministicArtifactText: read('evidence/output-artifacts/evidence-gated-answer-robustness.json'),
    q11LocalArtifactText: read('evidence/output-artifacts/local-evidence-gated-answer-robustness.json'),
  };
}

function forbiddenValues(q11Fixture) {
  return q11Fixture.cases.flatMap((item) => [item.q9Case.objective, ...item.q9Case.requiredClaimKeys, ...item.q9Case.sources.flatMap((source) => [source.sourceKey, source.text]), ...(item.answerQualityContract?.requiredAnswerTerms || []), ...(item.answerQualityContract?.forbiddenAnswerTerms || [])]).filter((value) => String(value).length >= 8);
}
