import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  DEFAULT_ANSWER_QUALITY_THRESHOLDS,
  evaluateAnswerQualityCase,
} from '../src/core/answer-quality-evaluation.mjs';
import { coordinateEvidenceGatedAnswer } from '../src/core/evidence-gated-answer-shadow.mjs';
import {
  assertContentFreeEvidenceGatedAnswerRobustnessArtifact,
  assertEvidenceGatedAnswerRobustnessArtifact,
  assertEvidenceGatedAnswerRobustnessBindings,
  assertEvidenceGatedAnswerRobustnessCandidatePassed,
  assertEvidenceGatedAnswerRobustnessFixture,
  assertLocalEvidenceGatedAnswerRobustnessArtifact,
  buildEvidenceGatedAnswerRobustnessArtifact,
  buildLocalEvidenceGatedAnswerRobustnessArtifact,
  evaluateEvidenceGatedAnswerRobustnessSuite,
  hashEvidenceGatedAnswerRobustnessRecord,
} from '../src/core/evidence-gated-answer-robustness.mjs';
import { resolveEvidenceOutputPath, writeEvidenceJson } from '../scripts/evidence-gated-answer-output.mjs';

const root = path.resolve(import.meta.dirname, '..');
const fixture = readJson('fixtures/evidence-gated-answer-robustness-cases-v1.json');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function bindings() {
  return {
    fixtureText: read('fixtures/evidence-gated-answer-robustness-cases-v1.json'),
    q7EvidenceText: read('evidence/output-artifacts/local-answer-review-action-generalization.json'),
    q9ArtifactText: read('evidence/output-artifacts/rag-evidence-sufficiency.json'),
    q9CoreText: read('src/core/rag-evidence-sufficiency-evaluation.mjs'),
    q9FixtureText: read('fixtures/rag-evidence-sufficiency-cases-v1.json'),
    q9LocalArtifactText: read('evidence/output-artifacts/local-rag-evidence-sufficiency-shadow.json'),
    q10ArtifactText: read('evidence/output-artifacts/evidence-gated-answer-shadow.json'),
    q10CoreText: read('src/core/evidence-gated-answer-shadow.mjs'),
    q10FixtureText: read('fixtures/evidence-gated-answer-cases-v1.json'),
    q10LocalArtifactText: read('evidence/output-artifacts/local-evidence-gated-answer-shadow.json'),
  };
}

function generator(onCall = () => {}) {
  return {
    promptHash: fixture.q7PromptHash,
    promptVersion: fixture.q7PromptVersion,
    async generate(input) {
      onCall(input);
      return {
        answer: {
          citedSourceKeys: input.retrievedItems.map((item) => item.sourceKey),
          text: input.retrievedItems.map((item) => item.snippet).join(' '),
        },
        observation: {
          durationMs: 1,
          outputBytes: 64,
        },
      };
    },
  };
}

test('Q11 exact 12-row matrix routes through Q10 with four calls only', async () => {
  let calls = 0;
  const suite = await evaluateEvidenceGatedAnswerRobustnessSuite({
    fixture,
    generator: generator(() => {
      calls += 1;
    }),
  });
  assert.equal(calls, 4);
  assert.deepEqual(suite.aggregate, {
    caseCount: 12,
    casePassRate: 1,
    gateBlockedCount: 8,
    generationAttemptCount: 4,
    generatorCallCount: 4,
    qualityPassCount: 4,
  });
  assert.deepEqual(Object.fromEntries(['ko', 'en', 'ja', 'es'].map((language) => [language, fixture.cases.filter((item) => item.language === language).length])), { ko: 3, en: 3, ja: 3, es: 3 });
  assert.deepEqual(Object.fromEntries(['engineering', 'policy', 'operations', 'documentation'].map((domain) => [domain, fixture.cases.filter((item) => item.domain === domain).length])), { engineering: 3, policy: 3, operations: 3, documentation: 3 });
});

test('all eight non-sufficient rows cannot inspect generator or quality contract', async () => {
  for (const row of fixture.cases.filter((item) => item.expectedState !== 'sufficient')) {
    const input = { q9Case: row.q9Case };
    Object.defineProperties(input, { answerQualityContract: { get() { throw new Error('contract leaked'); } }, generator: { get() { throw new Error('generator leaked'); } } });
    const result = await coordinateEvidenceGatedAnswer(input);
    assert.equal(result.generation.attempted, false);
  }
});

test('threshold and reviewer oracle drift fail before generation', async () => {
  const row = fixture.cases[0];
  for (const mutation of [
    { ...row.answerQualityContract, thresholds: { ...DEFAULT_ANSWER_QUALITY_THRESHOLDS, requireReviewerPass: false } },
    { ...row.answerQualityContract, thresholds: { ...DEFAULT_ANSWER_QUALITY_THRESHOLDS, unexpected: true } },
    { ...row.answerQualityContract, thresholds: { ...DEFAULT_ANSWER_QUALITY_THRESHOLDS, minimumRetrievalHitRate: undefined } },
    { ...row.answerQualityContract, reviewerVerdict: 'fail' },
  ]) {
    let calls = 0;
    await assert.rejects(() => coordinateEvidenceGatedAnswer({ answerQualityContract: mutation, generator: generator(() => { calls += 1; }), q9Case: row.q9Case }));
    assert.equal(calls, 0);
  }
  await assert.rejects(() => coordinateEvidenceGatedAnswer({ answerQualityContract: row.answerQualityContract, generator: generator(), q9Case: { ...row.q9Case, requiredClaimKeys: [] } }), /empty-required-claim-set/);
});

test('a sufficient-row generation error remains a failure without quality evaluation', async () => {
  const row = fixture.cases[0];
  const result = await coordinateEvidenceGatedAnswer({
    answerQualityContract: row.answerQualityContract,
    generator: { promptHash: fixture.q7PromptHash, promptVersion: fixture.q7PromptVersion, async generate() { throw new Error('invalid structured JSON'); } },
    q9Case: row.q9Case,
  });
  assert.equal(result.status, 'answer-generation-failed');
  assert.equal(result.answerQuality, null);
  assert.equal(result.generation.failureKind, 'invalid-structured-output');
});

test('suite records a quality failure before the separate candidate assertion rejects it', async () => {
  let calls = 0;
  const suite = await evaluateEvidenceGatedAnswerRobustnessSuite({
    fixture,
    generator: {
      promptHash: fixture.q7PromptHash,
      promptVersion: fixture.q7PromptVersion,
      async generate(input) {
        calls += 1;
        return {
          answer: {
            citedSourceKeys: input.retrievedItems.map((item) => item.sourceKey),
            text: calls === 1 ? 'missing required anchors' : input.retrievedItems.map((item) => item.snippet).join(' '),
          },
        };
      },
    },
  });
  assert.equal(calls, 4);
  assert.equal(suite.aggregate.qualityPassCount, 3);
  assert.equal(suite.cases.length, 12);
  assert.throws(() => assertEvidenceGatedAnswerRobustnessCandidatePassed(suite), /candidate-pass/);
});

test('Q9 route ignores expected oracle mutation while fixture validation rejects the drift', async () => {
  const changed = structuredClone(fixture.cases[0]);
  changed.q9Case.expected = { state: 'no-evidence', action: 'abstain' };
  await assert.rejects(
    () => coordinateEvidenceGatedAnswer({ q9Case: changed.q9Case }),
    /fixture-expectation-mismatch/,
  );
  const fixtureOracleDrift = structuredClone(fixture);
  fixtureOracleDrift.cases[0].expectedAction = 'abstain';
  assert.throws(
    () => assertEvidenceGatedAnswerRobustnessFixture(fixtureOracleDrift),
    /fixture-matrix|q9-case-binding/,
  );
});

test('quality failures preserve frozen evaluator check identifiers', async () => {
  const row = fixture.cases[0];
  const sourceKeys = row.answerQualityContract.expectedSourceKeys;
  const cases = [
    { answer: { citedSourceKeys: [sourceKeys[0]], text: 'REQ-LOCK SNAPSHOT-HASH' }, check: 'expected-source-citation-rate' },
    { answer: { citedSourceKeys: [...sourceKeys, 'invented-source'], text: 'REQ-LOCK SNAPSHOT-HASH' }, check: 'unsupported-citation-rate' },
    { answer: { citedSourceKeys: sourceKeys, text: 'REQ-LOCK only' }, check: 'required-term-coverage' },
    { answer: { citedSourceKeys: sourceKeys, text: 'REQ-LOCK SNAPSHOT-HASH UNVERIFIED-LOCK' }, check: 'forbidden-term-matches' },
  ];
  for (const item of cases) {
    const result = await coordinateEvidenceGatedAnswer({
      answerQualityContract: row.answerQualityContract,
      generator: {
        promptHash: fixture.q7PromptHash,
        promptVersion: fixture.q7PromptVersion,
        async generate() { return { answer: item.answer }; },
      },
      q9Case: row.q9Case,
    });
    assert.ok(result.answerQuality.failureCheckIds.includes(item.check));
  }
  const reviewerFailure = evaluateAnswerQualityCase({
    answer: {
      citedSourceKeys: sourceKeys,
      text: 'REQ-LOCK SNAPSHOT-HASH',
    },
    expectedSourceKeys: sourceKeys,
    forbiddenAnswerTerms: row.answerQualityContract.forbiddenAnswerTerms,
    forbiddenSourceKeys: [],
    id: row.id,
    requiredAnswerTerms: row.answerQualityContract.requiredAnswerTerms,
    retrievedItems: row.q9Case.sources.map((source) => ({ sourceKey: source.sourceKey })),
    reviewerVerdict: 'fail',
  }, { thresholds: DEFAULT_ANSWER_QUALITY_THRESHOLDS });
  assert.ok(reviewerFailure.failures.some((failure) => failure.check === 'reviewer-verdict'));
});

test('content-free artifact rejects simple and semantic rehash tampering', async () => {
  const suite = await evaluateEvidenceGatedAnswerRobustnessSuite({ fixture, generator: generator() });
  const input = bindings();
  const currentBindings = assertEvidenceGatedAnswerRobustnessBindings(input);
  const artifact = buildEvidenceGatedAnswerRobustnessArtifact({ bindings: fixture, fixtureHash: createHash('sha256').update(read('fixtures/evidence-gated-answer-robustness-cases-v1.json')).digest('hex'), suite });
  const validation = {
    bindings: currentBindings,
    fixture: currentBindings.fixture,
    fixtureText: input.fixtureText,
  };
  assert.doesNotThrow(() => assertEvidenceGatedAnswerRobustnessArtifact(artifact, validation));
  assert.doesNotThrow(() => assertContentFreeEvidenceGatedAnswerRobustnessArtifact(artifact, fixture.cases.flatMap((row) => row.q9Case.sources.map((source) => source.text))));
  const tampered = structuredClone(artifact); tampered.aggregate.qualityPassCount = 3;
  assert.throws(() => assertEvidenceGatedAnswerRobustnessArtifact(tampered, validation), /integrity/);
  const { id, integrityHash, ...content } = tampered; void id; void integrityHash;
  tampered.integrityHash = hashEvidenceGatedAnswerRobustnessRecord(content); tampered.id = `evidence-gated-answer-robustness-${tampered.integrityHash}`;
  assert.throws(() => assertEvidenceGatedAnswerRobustnessArtifact(tampered, validation), /semantic/);
  for (const mutate of [
    (candidate) => { candidate.cases[4].state = 'irrelevant'; },
    (candidate) => { candidate.fixtureHash = '0'.repeat(64); },
    (candidate) => { candidate.q7EvidenceHash = '0'.repeat(64); },
    (candidate) => { candidate.q9ArtifactHash = '0'.repeat(64); },
    (candidate) => { candidate.q10ArtifactHash = '0'.repeat(64); },
  ]) {
    const semanticDrift = rehash(artifact, mutate, 'evidence-gated-answer-robustness');
    assert.throws(
      () => assertEvidenceGatedAnswerRobustnessArtifact(semanticDrift, validation),
      /semantic/,
    );
  }
});

test('local artifact accepts honest failure evidence but candidate pass remains separate', async () => {
  const input = bindings();
  const currentBindings = assertEvidenceGatedAnswerRobustnessBindings(input);
  const q9LocalArtifact = JSON.parse(input.q9LocalArtifactText);
  const suite = await evaluateEvidenceGatedAnswerRobustnessSuite({ fixture, generator: generator() });
  const deterministicArtifact = buildEvidenceGatedAnswerRobustnessArtifact({
    bindings: fixture,
    fixtureHash: createHash('sha256').update(read('fixtures/evidence-gated-answer-robustness-cases-v1.json')).digest('hex'),
    suite,
  });
  const sufficientCaseHashes = deterministicArtifact.cases
    .filter((item) => item.state === 'sufficient')
    .map((item) => item.caseHash);
  let calls = 0;
  const failedSuite = await evaluateEvidenceGatedAnswerRobustnessSuite({
    fixture,
    generator: {
      promptHash: fixture.q7PromptHash,
      promptVersion: fixture.q7PromptVersion,
      async generate(input) {
        calls += 1;
        return {
          answer: {
            citedSourceKeys: input.retrievedItems.map((item) => item.sourceKey),
            text: calls === 1
              ? 'missing required anchors'
              : input.retrievedItems.map((item) => item.snippet).join(' '),
          },
        };
      },
    },
  });
  const localArtifact = buildLocalEvidenceGatedAnswerRobustnessArtifact({
    bindings: fixture,
    deterministicArtifact,
    model: {
      digest: currentBindings.q7.model.digest,
      id: currentBindings.q7.model.id,
      licenseHash: q9LocalArtifact.model.licenseHash,
      sizeBytes: currentBindings.q7.model.sizeBytes,
    },
    observedAt: '2025-07-28T00:00:00.000Z',
    observations: sufficientCaseHashes.map((caseHash, index) => ({
      caseHash,
      durationMs: index,
      failureCheckIds: index === 0 ? ['required-term-coverage'] : [],
      generationFailureKind: index === 0 ? null : null,
      outputBytes: 100,
      status: index === 0 ? 'failed' : 'passed',
    })),
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      transportLoopback: true,
      version: currentBindings.q7.runtime.version,
    },
    suite: failedSuite,
  });
  const localValidation = {
    bindings: currentBindings,
    deterministicArtifact,
    fixtureText: input.fixtureText,
    q9LocalArtifact,
  };
  const passingLocalArtifact = buildLocalEvidenceGatedAnswerRobustnessArtifact({
    bindings: fixture,
    deterministicArtifact,
    model: {
      digest: currentBindings.q7.model.digest,
      id: currentBindings.q7.model.id,
      licenseHash: q9LocalArtifact.model.licenseHash,
      sizeBytes: currentBindings.q7.model.sizeBytes,
    },
    observedAt: '2025-07-28T00:00:00.000Z',
    observations: sufficientCaseHashes.map((caseHash) => ({
      caseHash,
      durationMs: 1,
      failureCheckIds: [],
      generationFailureKind: null,
      outputBytes: 100,
      status: 'passed',
    })),
    runtime: {
      cloudFeaturesDisabled: true,
      kind: 'ollama',
      transportLoopback: true,
      version: currentBindings.q7.runtime.version,
    },
    suite,
  });
  const impossiblePassedAggregate = rehash(
    passingLocalArtifact,
    (candidate) => {
      const blocked = candidate.cases.find(
        (item) => item.state === 'partial',
      );
      blocked.sanitizedFailureCode = 'coordinator-error';
      blocked.status = 'evaluation-failed';
    },
    'local-evidence-gated-answer-robustness',
  );
  assert.throws(
    () => assertLocalEvidenceGatedAnswerRobustnessArtifact(
      impossiblePassedAggregate,
      localValidation,
    ),
    /semantic/,
  );
  assert.doesNotThrow(() => assertLocalEvidenceGatedAnswerRobustnessArtifact(localArtifact, localValidation));
  assert.doesNotThrow(() => assertContentFreeEvidenceGatedAnswerRobustnessArtifact(
    localArtifact,
    fixture.cases.flatMap((row) => row.q9Case.sources.map((source) => source.text)),
  ));
  assert.throws(
    () => assertLocalEvidenceGatedAnswerRobustnessArtifact(localArtifact, {
      ...localValidation,
      requireCandidatePass: true,
    }),
    /candidate-pass/,
  );
  const tampered = structuredClone(localArtifact);
  tampered.summary.qualityPassCount = 4;
  const { id, integrityHash, ...content } = tampered;
  void id;
  void integrityHash;
  tampered.integrityHash = hashEvidenceGatedAnswerRobustnessRecord(content);
  tampered.id = `local-evidence-gated-answer-robustness-${tampered.integrityHash}`;
  assert.throws(
    () => assertLocalEvidenceGatedAnswerRobustnessArtifact(tampered, localValidation),
    /semantic/,
  );
  for (const mutate of [
    (candidate) => { candidate.model.digest = '0'.repeat(64); },
    (candidate) => { candidate.model.licenseHash = '0'.repeat(64); },
    (candidate) => { candidate.model.sizeBytes += 1; },
    (candidate) => { candidate.runtime.version = 'drifted'; },
    (candidate) => { candidate.observedAt = '2027-01-01T00:00:00.000Z'; },
  ]) {
    const semanticDrift = rehash(localArtifact, mutate, 'local-evidence-gated-answer-robustness');
    assert.throws(
      () => assertLocalEvidenceGatedAnswerRobustnessArtifact(semanticDrift, localValidation),
      /semantic/,
    );
  }
});

function rehash(artifact, mutate, idPrefix) {
  const copy = structuredClone(artifact);
  delete copy.id;
  delete copy.integrityHash;
  mutate(copy);
  copy.integrityHash = hashEvidenceGatedAnswerRobustnessRecord(copy);
  copy.id = `${idPrefix}-${copy.integrityHash}`;
  return copy;
}

test('Q7 Q9 and Q10 byte bindings fail closed and frozen history remains unchanged', () => {
  const input = bindings();
  assert.doesNotThrow(() => assertEvidenceGatedAnswerRobustnessBindings(input));
  for (const field of ['q9CoreText', 'q10CoreText', 'q10ArtifactText']) assert.throws(() => assertEvidenceGatedAnswerRobustnessBindings({ ...input, [field]: `${input[field]}\n` }), /drift/);
  const q9 = JSON.parse(input.q9ArtifactText); const q10 = JSON.parse(input.q10ArtifactText);
  assert.equal(q9.aggregate.caseCount, 5); assert.equal(q10.aggregate.generationAttemptCount, 1);
  assertEvidenceGatedAnswerRobustnessFixture(fixture);
});

test('Q11 runners keep output contained, single-link, and mode 0600', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'q11-output-'));
  try {
    const artifact = { check: 'q11' };
    const output = writeEvidenceJson({ artifact, defaultRelativePath: 'artifact.json', label: 'Q11 test output', repoDir: directory, value: '' });
    assert.equal(fs.statSync(output).mode & 0o777, 0o600);
    assert.throws(() => resolveEvidenceOutputPath({ defaultRelativePath: 'artifact.json', label: 'Q11 test output', repoDir: directory, value: '../escape.json' }), /inside the repository/);
    const hardlink = path.join(directory, 'hardlink.json');
    fs.linkSync(output, hardlink);
    assert.throws(() => writeEvidenceJson({ artifact, defaultRelativePath: 'hardlink.json', label: 'Q11 test output', repoDir: directory, value: 'hardlink.json' }), /single-link/);
    const symlink = path.join(directory, 'symlink.json');
    fs.symlinkSync(output, symlink);
    assert.throws(() => resolveEvidenceOutputPath({ defaultRelativePath: 'symlink.json', label: 'Q11 test output', repoDir: directory, value: 'symlink.json' }), /regular file/);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
});
