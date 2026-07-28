import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertClaimSourceAttributionCandidatePassed,
  assertClaimSourceAttributionFixture,
  assertClaimSourceAttributionBindings,
  assertClaimSourceAttributionArtifact,
  assertLocalClaimSourceAttributionArtifact,
  buildLocalClaimSourceAttributionArtifact,
  FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE,
  coordinateClaimSourceAttribution,
  buildClaimSourceAttributionArtifact,
  hashClaimSourceAttributionRecord,
  evaluateClaimSourceAttribution,
  evaluateClaimSourceAttributionSuite,
} from '../src/core/evidence-gated-answer-claim-attribution.mjs';
import { DEFAULT_ANSWER_QUALITY_THRESHOLDS, evaluateAnswerQualityCase } from '../src/core/answer-quality-evaluation.mjs';
import { resolveEvidenceOutputPath, writeEvidenceJson } from '../scripts/evidence-gated-answer-output.mjs';

const repoDir = path.resolve(import.meta.dirname, '..');
const inputs = readInputs();
const bindings = assertClaimSourceAttributionBindings(inputs);
const fixture = bindings.fixture;
const q11 = bindings.q11Fixture;
const first = fixture.cases[0].attributionContract;

test('Q13 evaluates flattened Q7 v5 source claims only in their owner blocks', () => {
  assert.equal(evaluateClaimSourceAttribution({ answer: correctAnswer(first), attributionContract: first }).status, 'passed');
  const swapped = correctAnswer(first, { swapClaims: true });
  const q11Row = q11.cases[0];
  const q1 = evaluateAnswerQualityCase({ answer: swapped, expectedSourceKeys: q11Row.answerQualityContract.expectedSourceKeys, forbiddenAnswerTerms: q11Row.answerQualityContract.forbiddenAnswerTerms, forbiddenSourceKeys: q11Row.answerQualityContract.forbiddenSourceKeys, id: q11Row.id, requiredAnswerTerms: q11Row.answerQualityContract.requiredAnswerTerms, retrievedItems: q11Row.q9Case.sources.map((source) => ({ snippet: source.text, sourceKey: source.sourceKey })), reviewerVerdict: 'pass' }, { thresholds: DEFAULT_ANSWER_QUALITY_THRESHOLDS });
  assert.equal(q1.status, 'passed');
  assert.ok(evaluateClaimSourceAttribution({ answer: swapped, attributionContract: first }).failureIds.includes('cross-source-term'));
  const summaryOnly = correctAnswer(first, { summaryTerms: true, omitTerms: true });
  assert.deepEqual(evaluateClaimSourceAttribution({ answer: summaryOnly, attributionContract: first }).failureIds, ['bound-term-summary-only']);
  const reviewerOnly = correctAnswer(first, { reviewerTerms: true, omitTerms: true });
  assert.deepEqual(evaluateClaimSourceAttribution({ answer: reviewerOnly, attributionContract: first }).failureIds, ['bound-term-missing']);
  const duplicate = correctAnswer(first, { duplicateTerm: true });
  assert.deepEqual(evaluateClaimSourceAttribution({ answer: duplicate, attributionContract: first }).failureIds, ['bound-term-missing']);
});

test('Q13 rejects grammar boundary, marker, citation, and control-character mutations', () => {
  const cases = [
    [{ text: 'Summary\nReviewer action: Review.' }, 'source-marker-missing'],
    [{ text: 'Summary\nEvidence (q11-01-lock): REQ-LOCK\nEvidence (q11-01-snapshot): SNAPSHOT-HASH' }, 'reviewer-boundary-missing'],
    [{ text: 'Summary\nEvidence (q11-01-lock): REQ-LOCK\nEvidence (q11-01-snapshot): SNAPSHOT-HASH\nReviewer action: Review.\nReviewer action: Again.' }, 'reviewer-boundary-duplicate'],
    [{ text: 'Summary\nEvidence (q11-01-lock): REQ-LOCK\nEvidence (q11-01-snapshot): SNAPSHOT-HASH\nReviewer action: ' }, 'reviewer-action-empty'],
    [{ text: 'Summary\nEvidence (q11-01-lock): REQ-LOCK\nEvidence (q11-01-lock): REQ-LOCK\nEvidence (q11-01-snapshot): SNAPSHOT-HASH\nReviewer action: Review.' }, 'source-marker-duplicate'],
    [{ text: 'Summary\nEvidence (unknown): REQ-LOCK\nEvidence (q11-01-snapshot): SNAPSHOT-HASH\nReviewer action: Review.' }, 'source-marker-unknown'],
    [{ text: 'Summary\nEvidence (q11-01-snapshot): SNAPSHOT-HASH\nEvidence (q11-01-lock): REQ-LOCK\nReviewer action: Review.' }, 'source-marker-reordered'],
    [{ text: 'Summary\nEvidence (q11-01-lock): REQ-LOCK\nEvidence (q11-01-snapshot): SNAPSHOT-HASH\nReviewer action: Review.\nInjected.' }, 'source-marker-injection'],
    [{ text: 'Summary\r\nEvidence (q11-01-lock): REQ-LOCK\nEvidence (q11-01-snapshot): SNAPSHOT-HASH\nReviewer action: Review.' }, 'answer-control-character'],
  ];
  for (const [answer, expected] of cases) {
    const result = evaluateClaimSourceAttribution({ answer: { citedSourceKeys: first.expectedSourceOrder, ...answer }, attributionContract: first });
    assert.ok(result.failureIds.includes(expected), `${expected}: ${result.failureIds.join(',')}`);
  }
  const cited = correctAnswer(first); cited.citedSourceKeys.reverse();
  assert.ok(evaluateClaimSourceAttribution({ answer: cited, attributionContract: first }).failureIds.includes('cited-source-order-mismatch'));
  const summaryInjection = correctAnswer(first); summaryInjection.text = summaryInjection.text.replace('Summary', 'Summary Evidence (q11-01-lock): injected');
  assert.ok(evaluateClaimSourceAttribution({ answer: summaryInjection, attributionContract: first }).failureIds.includes('source-marker-injection'));
  for (const replacement of ['):REQ-LOCK', '):\tREQ-LOCK', '):  REQ-LOCK']) {
    const malformed = correctAnswer(first); malformed.text = malformed.text.replace('): REQ-LOCK', replacement);
    assert.ok(evaluateClaimSourceAttribution({ answer: malformed, attributionContract: first }).failureIds.includes('source-marker-injection'));
  }
  const malformedReviewer = correctAnswer(first); malformedReviewer.text = malformedReviewer.text.replace('Reviewer action: Review.', 'Reviewer action:Review.');
  assert.ok(evaluateClaimSourceAttribution({ answer: malformedReviewer, attributionContract: first }).failureIds.includes('reviewer-action-empty'));
  for (const marker of ['Evidence (q11-01-lock): injected', 'Reviewer action: injected']) {
    const claimInjection = correctAnswer(first); claimInjection.text = claimInjection.text.replace('REQ-LOCK', `REQ-LOCK ${marker}`);
    assert.ok(evaluateClaimSourceAttribution({ answer: claimInjection, attributionContract: first }).failureIds.includes('source-marker-injection'));
    const reviewerInjection = correctAnswer(first); reviewerInjection.text = reviewerInjection.text.replace('Reviewer action: Review.', `Reviewer action: Review. ${marker}`);
    assert.ok(evaluateClaimSourceAttribution({ answer: reviewerInjection, attributionContract: first }).failureIds.includes('source-marker-injection'));
  }
  for (const answer of [null, {}, { text: 1, citedSourceKeys: [] }, { text: 'Summary', citedSourceKeys: 'not-array' }]) {
    const result = evaluateClaimSourceAttribution({ answer, attributionContract: first });
    assert.deepEqual(result.failureIds, ['answer-contract-invalid']);
    assert.equal(result.counts.attributedBoundTermCount, 0);
  }
});

test('Q13 validates safe source and term bindings against Q11 without exposing non-sufficient contracts', () => {
  assert.throws(() => evaluateClaimSourceAttribution({ answer: {}, attributionContract: null }), /attribution-contract-missing/);
  assert.throws(() => assertClaimSourceAttributionBindings({ ...inputs, fixtureText: '{' }), /fixture-binding-drift/);
  const unsafe = structuredClone(fixture); unsafe.cases[0].attributionContract.sourceBindings[0].sourceKey = '../unsafe';
  assert.throws(() => assertClaimSourceAttributionFixture(unsafe, q11), /attribution-contract-invalid/);
  const missingContract = structuredClone(fixture); delete missingContract.cases[0].attributionContract;
  assert.throws(() => assertClaimSourceAttributionFixture(missingContract, q11), /attribution-contract-missing/);
  const drift = structuredClone(fixture); drift.cases[0].attributionContract.sourceBindings[0].requiredTerms = ['NOT-IN-SOURCE'];
  assert.throws(() => assertClaimSourceAttributionFixture(drift, q11), /boundary-contract-drift/);
  const missing = structuredClone(q11); missing.cases[0].q9Case.sources[0].text = 'Term removed.';
  assert.throws(() => assertClaimSourceAttributionFixture(fixture, missing), /source-bound-term-missing-from-source/);
  const ambiguous = structuredClone(q11); ambiguous.cases[0].q9Case.sources[0].text += ' REQ-LOCK';
  assert.throws(() => assertClaimSourceAttributionFixture(fixture, ambiguous), /source-bound-term-ambiguous/);
  const crossSource = structuredClone(q11); crossSource.cases[0].q9Case.sources[1].text += ' REQ-LOCK';
  assert.throws(() => assertClaimSourceAttributionFixture(fixture, crossSource), /source-bound-term-cross-source/);
  const leaked = structuredClone(fixture); leaked.cases[4].attributionContract = first;
  assert.throws(() => assertClaimSourceAttributionFixture(leaked, q11), /fixture-binding-drift/);
});

test('Q13 forwards lazy Q10 getters and never reads attribution before quality passes', async () => {
  const suite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11) });
  assert.doesNotThrow(() => assertClaimSourceAttributionCandidatePassed(suite));
  for (const item of suite.cases.filter((item) => !item.generation.attempted)) {
    assert.deepEqual(item.getterCounts, { answerQualityContract: 0, attributionContract: 0, generator: 0 });
  }
  assert.deepEqual(suite.aggregate, {
    attributionAttemptCount: 4, attributionContractGetterAccessCount: 4, attributionPassCount: 4,
    caseCount: 12, claimSourceAttributionRate: 1, gateBlockedCount: 8, generationAttemptCount: 4,
    generatorGetterAccessCount: 4, qualityPassCount: 4,
  });
});

test('public Q13 coordinator returns projected terminal status and never returns the raw answer', async () => {
  const row = q11.cases[0]; let attributionAccesses = 0;
  const result = await coordinateClaimSourceAttribution({
    get q9Case() { return row.q9Case; },
    get generator() { return generatorFor(q11); },
    get answerQualityContract() { return row.answerQualityContract; },
    get attributionContract() { attributionAccesses += 1; return first; },
  });
  assert.equal(result.status, 'answered-attribution-passed');
  assert.equal(attributionAccesses, 1);
  assert.equal(Object.hasOwn(result, 'answer'), false);
  assert.equal(result.attribution.metrics.claimSourceAttributionRate, 1);
  assert.equal(result.attribution.counts.parsedSourceBlockCount, 2);
});

test('generation and Q1 quality failures leave attribution getter untouched', async () => {
  const suite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11, { failGenerationId: 'q11-01-ko-engineering-sufficient', failQualityId: 'q11-02-en-policy-sufficient' }) });
  const generation = suite.cases[0]; const quality = suite.cases[1];
  assert.equal(generation.status, 'answer-generation-failed');
  assert.equal(quality.status, 'answered-quality-failed');
  assert.equal(generation.getterCounts.attributionContract, 0);
  assert.equal(quality.getterCounts.attributionContract, 0);
  assert.equal(generation.getterCounts.answerQualityContract, 1);
  assert.equal(quality.getterCounts.answerQualityContract, 1);
});

test('Q13 artifacts are content-free and reject rehashed semantic fixture tampering', async () => {
  const suite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11) });
  const artifact = buildClaimSourceAttributionArtifact({ fixture, fixtureText: inputs.fixtureText, suite });
  assert.doesNotThrow(() => assertClaimSourceAttributionArtifact(artifact, { fixtureText: inputs.fixtureText }));
  const tampered = structuredClone(artifact); tampered.fixtureHash = '0'.repeat(64); const { id, integrityHash, ...content } = tampered;
  tampered.integrityHash = hashClaimSourceAttributionRecord(content); tampered.id = `evidence-gated-answer-claim-attribution-${tampered.integrityHash}`;
  assert.throws(() => assertClaimSourceAttributionArtifact(tampered, { fixtureText: inputs.fixtureText }), /artifact-semantic-drift/);
  assert.ok(!JSON.stringify(artifact).includes(q11.cases[0].q9Case.sources[0].text));
  for (const mutate of [
    (value) => { value.runtimeActivation = true; },
    (value) => { value.rawAnswer = 'hidden'; },
    (value) => { value.aggregate.extra = true; },
  ]) {
    const changed = structuredClone(artifact); mutate(changed);
    const { id, integrityHash, ...changedContent } = changed;
    changed.integrityHash = hashClaimSourceAttributionRecord(changedContent);
    changed.id = `evidence-gated-answer-claim-attribution-${changed.integrityHash}`;
    assert.throws(() => assertClaimSourceAttributionArtifact(changed, { fixtureText: inputs.fixtureText }), /artifact-(semantic-drift|content-leak)/);
  }
});

test('Q13 local artifact accepts an honest 3/4 observation before candidate assertion', async () => {
  const passingSuite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11) });
  const deterministicArtifact = buildClaimSourceAttributionArtifact({ fixtureText: inputs.fixtureText, suite: passingSuite });
  const failedSuite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11, { failQualityId: 'q11-01-ko-engineering-sufficient' }) });
  const model = FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.model;
  const runtime = FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.runtime;
  const observations = fixture.cases.slice(0, 4).map((row, index) => ({ caseHash: row.caseHash, durationMs: 1, failureIds: index === 0 ? ['required-term-coverage'] : [], inputHash: 'c'.repeat(64), responseHash: 'd'.repeat(64) }));
  const artifact = buildLocalClaimSourceAttributionArtifact({ deterministicArtifact, model, observedAt: '2026-07-28T00:00:00.000Z', observations, runtime, suite: failedSuite });
  assert.doesNotThrow(() => assertLocalClaimSourceAttributionArtifact(artifact, { deterministicArtifact, fixture, fixtureText: inputs.fixtureText }));
  assert.throws(() => assertLocalClaimSourceAttributionArtifact(artifact, { deterministicArtifact, fixture, fixtureText: inputs.fixtureText, requireCandidatePass: true }), /candidate-pass-assertion-failed/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'q13-failed-observation-'));
  try {
    const written = writeEvidenceJson({ artifact, defaultRelativePath: 'failed.json', label: 'Q13 failed observation', repoDir: directory, value: '' });
    assert.deepEqual(JSON.parse(fs.readFileSync(written, 'utf8')).suiteAggregate, failedSuite.aggregate);
    assert.throws(() => assertClaimSourceAttributionCandidatePassed(failedSuite), /candidate-pass-assertion-failed/);
  } finally { fs.rmSync(directory, { force: true, recursive: true }); }
});

test('Q13 generation-failed observation keeps null hashes and reaches the writer before candidate rejection', async () => {
  const passingSuite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11) });
  const deterministicArtifact = buildClaimSourceAttributionArtifact({ fixtureText: inputs.fixtureText, suite: passingSuite });
  const failedSuite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11, { failGenerationId: 'q11-01-ko-engineering-sufficient' }) });
  const observations = fixture.cases.slice(0, 4).map((row, index) => ({
    caseHash: row.caseHash,
    durationMs: 1,
    failureIds: index === 0 ? ['generation-contract-error'] : [],
    inputHash: index === 0 ? null : 'c'.repeat(64),
    responseHash: index === 0 ? null : 'd'.repeat(64),
  }));
  const artifact = buildLocalClaimSourceAttributionArtifact({ deterministicArtifact, model: FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.model, observedAt: '2026-07-28T00:00:00.000Z', observations, runtime: FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.runtime, suite: failedSuite });
  assert.doesNotThrow(() => assertLocalClaimSourceAttributionArtifact(artifact, { deterministicArtifact, fixture, fixtureText: inputs.fixtureText }));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'q13-generation-failed-'));
  try {
    const output = writeEvidenceJson({ artifact, defaultRelativePath: 'failed.json', label: 'Q13 generation failure', repoDir: directory, value: '' });
    assert.equal(fs.existsSync(output), true);
    assert.throws(() => assertClaimSourceAttributionCandidatePassed(failedSuite), /candidate-pass-assertion-failed/);
  } finally { fs.rmSync(directory, { force: true, recursive: true }); }
});

test('Q13 local artifact rejects runtime, model, observation, and raw-key rehash tampering', async () => {
  const suite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11) });
  const deterministicArtifact = buildClaimSourceAttributionArtifact({ fixtureText: inputs.fixtureText, suite });
  const base = buildLocalClaimSourceAttributionArtifact({ deterministicArtifact, model: FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.model, observedAt: '2026-07-28T00:00:00.000Z', observations: fixture.cases.slice(0, 4).map((row) => ({ caseHash: row.caseHash, durationMs: 1, failureIds: [], inputHash: 'c'.repeat(64), responseHash: 'd'.repeat(64) })), runtime: FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.runtime, suite });
  for (const mutate of [
    (value) => { value.runtime.cloudFeaturesDisabled = false; },
    (value) => { value.model.id = 'other'; },
    (value) => { value.model.digest = 'e'.repeat(64); },
    (value) => { value.model.licenseHash = 'e'.repeat(64); },
    (value) => { value.model.sizeBytes = 1; },
    (value) => { value.runtime.version = 'other'; },
    (value) => { value.observations[1].caseHash = value.observations[0].caseHash; },
    (value) => { value.observations[0].failureIds = ['bad_failure']; },
    (value) => { value.observations[0].rawPrompt = 'hidden'; },
    (value) => { value.observations[0].failureIds = ['case-pass-rate']; },
    (value) => { value.observations[0].failureIds = ['reviewer-failure-count']; },
    (value) => { value.observations[0].failureIds = ['generation-contract-error', 'required-term-coverage']; },
    (value) => { value.observations[0].failureIds = ['bound-term-missing', 'required-term-coverage']; },
    (value) => { value.observations[0].failureIds = ['generation-contract-error']; },
    (value) => { value.suiteAggregate.qualityPassCount = 0; },
  ]) {
    const changed = structuredClone(base); mutate(changed);
    const { id, integrityHash, ...content } = changed;
    changed.integrityHash = hashClaimSourceAttributionRecord(content);
    changed.id = `local-evidence-gated-answer-claim-attribution-${changed.integrityHash}`;
    assert.throws(() => assertLocalClaimSourceAttributionArtifact(changed, { deterministicArtifact, fixture, fixtureText: inputs.fixtureText }), /local-artifact-(semantic-drift|content-leak)/);
  }
});

test('Q13 local assertion requires the deterministic artifact and exact fixture text binding', async () => {
  const suite = await evaluateClaimSourceAttributionSuite({ fixture, q11Fixture: q11, generator: generatorFor(q11) });
  const deterministicArtifact = buildClaimSourceAttributionArtifact({ fixtureText: inputs.fixtureText, suite });
  const artifact = buildLocalClaimSourceAttributionArtifact({ deterministicArtifact, model: FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.model, observedAt: '2026-07-28T00:00:00.000Z', observations: fixture.cases.slice(0, 4).map((row) => ({ caseHash: row.caseHash, durationMs: 1, failureIds: [], inputHash: 'c'.repeat(64), responseHash: 'd'.repeat(64) })), runtime: FROZEN_LOCAL_CLAIM_SOURCE_ATTRIBUTION_BASELINE.runtime, suite });
  assert.throws(() => assertLocalClaimSourceAttributionArtifact(artifact, { fixtureText: inputs.fixtureText }), /local-artifact-semantic-drift/);
  assert.throws(() => assertLocalClaimSourceAttributionArtifact(artifact, { deterministicArtifact }), /local-artifact-semantic-drift/);
  assert.throws(() => assertLocalClaimSourceAttributionArtifact(artifact, { deterministicArtifact, fixtureText: JSON.stringify({ cases: [] }) }), /artifact-semantic-drift/);
});

test('Q13 rejects direct and rehashed Q9-Q11 artifact binding tampering', () => {
  assert.doesNotThrow(() => assertClaimSourceAttributionBindings(inputs));
  for (const field of ['q9DeterministicArtifactText', 'q9LocalArtifactText', 'q10DeterministicArtifactText', 'q10LocalArtifactText', 'q11DeterministicArtifactText', 'q11LocalArtifactText']) {
    assert.throws(() => assertClaimSourceAttributionBindings({ ...inputs, [field]: `${inputs[field]}\n` }), /fixture-binding-drift/);
    const tampered = JSON.parse(inputs[field]); const prefix = tampered.id.slice(0, -65); tampered.tampered = true;
    const { id, integrityHash, ...content } = tampered; tampered.integrityHash = hashClaimSourceAttributionRecord(content); tampered.id = `${prefix}${tampered.integrityHash}`;
    assert.throws(() => assertClaimSourceAttributionBindings({ ...inputs, [field]: JSON.stringify(tampered) }), /fixture-binding-drift/);
  }
});

test('Q13 runners retain Q12 writer containment, owner-only mode, and single-link checks', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'q13-writer-'));
  try {
    const output = writeEvidenceJson({ artifact: { aggregate: { caseCount: 12 } }, defaultRelativePath: 'artifact.json', label: 'Q13 test output', repoDir: directory, value: '' });
    assert.equal(fs.statSync(output).mode & 0o777, 0o600);
    assert.throws(() => resolveEvidenceOutputPath({ defaultRelativePath: 'artifact.json', label: 'Q13 test output', repoDir: directory, value: '../escape.json' }), /inside the repository/);
    fs.linkSync(output, path.join(directory, 'hardlink.json'));
    assert.throws(() => writeEvidenceJson({ artifact: { aggregate: { caseCount: 12 } }, defaultRelativePath: 'hardlink.json', label: 'Q13 test output', repoDir: directory, value: 'hardlink.json' }), /single-link/);
  } finally { fs.rmSync(directory, { force: true, recursive: true }); }
});

function correctAnswer(contract, options = {}) {
  const claims = contract.sourceBindings.map((binding, index) => {
    const terms = options.omitTerms ? 'No bound term.' : binding.requiredTerms.join(' ');
    return `Evidence (${binding.sourceKey}): ${options.swapClaims ? contract.sourceBindings[(index + 1) % contract.sourceBindings.length].requiredTerms.join(' ') : terms}${options.duplicateTerm && index === 0 ? ` ${terms}` : ''}`;
  });
  return { citedSourceKeys: [...contract.expectedSourceOrder], text: [`Summary${options.summaryTerms ? ` ${contract.sourceBindings.flatMap((binding) => binding.requiredTerms).join(' ')}` : ''}`, ...claims, `Reviewer action: Review.${options.reviewerTerms ? ` ${contract.sourceBindings.flatMap((binding) => binding.requiredTerms).join(' ')}` : ''}`].join('\n') };
}

function generatorFor(q11Fixture, options = {}) {
  return { promptHash: fixture.q7PromptHash, promptVersion: fixture.q7PromptVersion, async generate({ objective, retrievedItems }) {
    const row = q11Fixture.cases.find((item) => item.q9Case.objective === objective);
    if (row.id === options.failGenerationId) throw new Error('synthetic generation failure');
    const contract = fixture.cases.find((item) => item.id === row.id).attributionContract;
    const answer = correctAnswer(contract);
    if (row.id === options.failQualityId) answer.text = answer.text.replace(contract.sourceBindings[0].requiredTerms[0], 'MISSING-TERM');
    answer.citedSourceKeys = retrievedItems.map((item) => item.sourceKey);
    return { answer, observation: { durationMs: 0, outputBytes: 0 } };
  } };
}

function readInputs() { const read = (relativePath) => fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); return { fixtureText: read('fixtures/evidence-gated-answer-claim-attribution-cases-v1.json'), q11FixtureText: read('fixtures/evidence-gated-answer-robustness-cases-v1.json'), q11CoreText: read('src/core/evidence-gated-answer-robustness.mjs'), q10CoreText: read('src/core/evidence-gated-answer-shadow.mjs'), q9CoreText: read('src/core/rag-evidence-sufficiency-evaluation.mjs'), q1EvaluatorText: read('src/core/answer-quality-evaluation.mjs'), q7GeneratorText: read('src/core/ollama-answer-generator.mjs'), q12WriterText: read('scripts/evidence-gated-answer-output.mjs'), q7EvidenceText: read('evidence/output-artifacts/local-answer-review-action-generalization.json'), q9DeterministicArtifactText: read('evidence/output-artifacts/rag-evidence-sufficiency.json'), q9LocalArtifactText: read('evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json'), q10DeterministicArtifactText: read('evidence/output-artifacts/evidence-gated-answer-shadow.json'), q10LocalArtifactText: read('evidence/output-artifacts/local-evidence-gated-answer-shadow.json'), q11DeterministicArtifactText: read('evidence/output-artifacts/evidence-gated-answer-robustness.json'), q11LocalArtifactText: read('evidence/output-artifacts/local-evidence-gated-answer-robustness.json') }; }
