import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  DEFAULT_ANSWER_QUALITY_THRESHOLDS,
} from '../src/core/answer-quality-evaluation.mjs';
import {
  assertContentFreeEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerArtifact,
  assertEvidenceGatedAnswerBindings,
  assertEvidenceGatedAnswerFixture,
  buildEvidenceGatedAnswerArtifact,
  coordinateEvidenceGatedAnswer,
  evaluateEvidenceGatedAnswerSuite,
  hashEvidenceGatedAnswerValue,
} from '../src/core/evidence-gated-answer-shadow.mjs';

const repoDir = path.resolve(import.meta.dirname, '..');
const q9Fixture = readJson('fixtures/rag-evidence-sufficiency-cases-v1.json');
const fixture = readJson('fixtures/evidence-gated-answer-cases-v1.json');
const sufficientCase = q9Fixture.cases.find((item) => item.id === 'sufficient');
const sufficientBinding = fixture.cases.find(
  (item) => item.expectedState === 'sufficient',
);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoDir, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}

function clone(value) {
  return structuredClone(value);
}

function passingAnswer() {
  return {
    citedSourceKeys: [
      'source-sufficient-alpha',
      'source-sufficient-beta',
    ],
    text: 'claim-alpha is ALPHA-1 and claim-beta is BETA-1.',
  };
}

function fakeGenerator(answer = passingAnswer(), onGenerate = () => {}) {
  return {
    promptHash: fixture.q7PromptHash,
    promptVersion: fixture.q7PromptVersion,
    async generate(input) {
      onGenerate(input);
      return {
        answer,
        observation: {
          durationMs: 1,
          inputHash: hashEvidenceGatedAnswerValue(JSON.stringify(input)),
          outputBytes: 128,
          promptHash: fixture.q7PromptHash,
          promptVersion: fixture.q7PromptVersion,
          responseHash: hashEvidenceGatedAnswerValue(JSON.stringify(answer)),
        },
      };
    },
  };
}

test('five Q9 states route before generation and call the generator once', async () => {
  let callCount = 0;
  const inputs = [];
  const suite = await evaluateEvidenceGatedAnswerSuite({
    fixture,
    generator: fakeGenerator(passingAnswer(), (input) => {
      callCount += 1;
      inputs.push(input);
    }),
    q9Fixture,
  });

  assert.equal(callCount, 1);
  assert.deepEqual(suite.aggregate, {
    caseCount: 5,
    gateBlockedCount: 4,
    generationAttemptCount: 1,
    generatorCallCount: 1,
    qualityPassCount: 1,
  });
  assert.deepEqual(
    Object.fromEntries(
      suite.cases.map((item) => [
        item.state,
        {
          action: item.action,
          attempted: item.generation.attempted,
          status: item.status,
        },
      ]),
    ),
    {
      conflicting: {
        action: 'abstain',
        attempted: false,
        status: 'abstained',
      },
      irrelevant: {
        action: 'request-more-evidence',
        attempted: false,
        status: 'evidence-requested',
      },
      'no-evidence': {
        action: 'abstain',
        attempted: false,
        status: 'abstained',
      },
      partial: {
        action: 'request-more-evidence',
        attempted: false,
        status: 'evidence-requested',
      },
      sufficient: {
        action: 'answer',
        attempted: true,
        status: 'answered-quality-passed',
      },
    },
  );
  assert.equal(inputs.length, 1);
  assert.deepEqual(Object.keys(inputs[0]).sort(), [
    'objective',
    'retrievedItems',
  ]);
  assert.deepEqual(
    inputs[0].retrievedItems.map((item) => Object.keys(item).sort()),
    [
      ['snippet', 'sourceKey'],
      ['snippet', 'sourceKey'],
    ],
  );

  const serializedInput = JSON.stringify(inputs[0]);
  for (const forbidden of [
    ...sufficientBinding.answerQualityContract.requiredAnswerTerms,
    ...sufficientBinding.answerQualityContract.forbiddenAnswerTerms,
    sufficientBinding.answerQualityContract.reviewerVerdict,
    fixture.thresholdsHash,
  ]) {
    if (
      sufficientCase.objective.includes(forbidden) ||
      sufficientCase.sources.some((source) => source.text.includes(forbidden))
    ) {
      continue;
    }
    assert.equal(serializedInput.includes(forbidden), false);
  }
});

test('non-sufficient states never inspect the answer contract or generator', async () => {
  for (const q9Case of q9Fixture.cases.filter(
    (item) => item.id !== 'sufficient',
  )) {
    const unavailable = new Proxy(
      {},
      {
        get() {
          throw new Error('generator must remain inaccessible');
        },
      },
    );
    const result = await coordinateEvidenceGatedAnswer({
      get answerQualityContract() {
        throw new Error('answer contract must remain inaccessible');
      },
      generator: unavailable,
      q9Case,
    });
    assert.equal(result.generation.attempted, false);
  }
});

test('sufficient answers use the frozen evaluator and preserve its check ids', async () => {
  const cases = [
    {
      answer: {
        citedSourceKeys: ['source-sufficient-alpha'],
        text: passingAnswer().text,
      },
      expected: ['expected-source-citation-rate'],
    },
    {
      answer: {
        citedSourceKeys: [
          ...passingAnswer().citedSourceKeys,
          'invented-source',
        ],
        text: passingAnswer().text,
      },
      expected: ['citation-grounding-rate', 'unsupported-citation-rate'],
    },
    {
      answer: {
        citedSourceKeys: passingAnswer().citedSourceKeys,
        text: 'claim-alpha is ALPHA-1.',
      },
      expected: ['required-term-coverage'],
    },
    {
      answer: {
        citedSourceKeys: passingAnswer().citedSourceKeys,
        text: 'claim-alpha is OMEGA-999 and claim-beta is DELTA-999.',
      },
      expected: ['required-term-coverage'],
    },
    {
      answer: {
        citedSourceKeys: passingAnswer().citedSourceKeys,
        text: `${passingAnswer().text} ALPHA-2`,
      },
      expected: ['forbidden-term-matches'],
    },
  ];

  for (const item of cases) {
    const result = await coordinateEvidenceGatedAnswer({
      answerQualityContract: sufficientBinding.answerQualityContract,
      generator: fakeGenerator(item.answer),
      q9Case: sufficientCase,
    });
    assert.equal(result.status, 'answered-quality-failed');
    assert.equal(result.generation.status, 'passed');
    for (const checkId of item.expected) {
      assert.equal(
        result.answerQuality.failureCheckIds.includes(checkId),
        true,
      );
    }
  }
});

test('generation failure is recorded without becoming a quality pass', async () => {
  const result = await coordinateEvidenceGatedAnswer({
    answerQualityContract: sufficientBinding.answerQualityContract,
    generator: {
      promptHash: fixture.q7PromptHash,
      promptVersion: fixture.q7PromptVersion,
      async generate() {
        throw new Error('invalid structured JSON');
      },
    },
    q9Case: sufficientCase,
  });
  assert.equal(result.status, 'answer-generation-failed');
  assert.deepEqual(result.generation, {
    attempted: true,
    failureKind: 'invalid-structured-output',
    status: 'failed',
  });
  assert.equal(result.answerQuality, null);
});

test('Q9, threshold, prompt, and reviewer drift fail before generation', async () => {
  const mutations = [
    {
      contract: {
        ...clone(sufficientBinding.answerQualityContract),
        thresholds: {
          ...DEFAULT_ANSWER_QUALITY_THRESHOLDS,
          requireReviewerPass: false,
        },
      },
      pattern: /threshold-contract-drift/u,
    },
    {
      contract: {
        ...clone(sufficientBinding.answerQualityContract),
        reviewerVerdict: 'fail',
      },
      pattern: /answer-quality-contract-invalid/u,
    },
    {
      contract: {
        ...clone(sufficientBinding.answerQualityContract),
        promptHash: '0'.repeat(64),
      },
      pattern: /prompt-hash-drift/u,
    },
    {
      contract: {
        ...clone(sufficientBinding.answerQualityContract),
        promptVersion: 'drifted',
      },
      pattern: /prompt-version-drift/u,
    },
  ];
  for (const mutation of mutations) {
    let callCount = 0;
    await assert.rejects(
      coordinateEvidenceGatedAnswer({
        answerQualityContract: mutation.contract,
        generator: fakeGenerator(passingAnswer(), () => {
          callCount += 1;
        }),
        q9Case: sufficientCase,
      }),
      mutation.pattern,
    );
    assert.equal(callCount, 0);
  }

  let malformedCalls = 0;
  await assert.rejects(
    coordinateEvidenceGatedAnswer({
      answerQualityContract: sufficientBinding.answerQualityContract,
      generator: fakeGenerator(passingAnswer(), () => {
        malformedCalls += 1;
      }),
      q9Case: { ...clone(sufficientCase), requiredClaimKeys: [] },
    }),
    /empty-required-claim-set/u,
  );
  assert.equal(malformedCalls, 0);
});

test('fixture binding and content-free artifact reject semantic drift', async () => {
  assert.equal(
    assertEvidenceGatedAnswerFixture(fixture, { q9Fixture }),
    fixture,
  );
  const suite = await evaluateEvidenceGatedAnswerSuite({
    fixture,
    generator: fakeGenerator(),
    q9Fixture,
  });
  const artifact = buildEvidenceGatedAnswerArtifact({
    bindings: fixture,
    fixtureHash: hashEvidenceGatedAnswerValue(
      fs.readFileSync(
        path.join(repoDir, 'fixtures/evidence-gated-answer-cases-v1.json'),
        'utf8',
      ),
    ),
    suite,
  });
  assert.equal(assertEvidenceGatedAnswerArtifact(artifact), artifact);
  assertContentFreeEvidenceGatedAnswerArtifact(artifact, [
    sufficientCase.objective,
    ...sufficientCase.sources.flatMap((source) => [
      source.sourceKey,
      source.text,
    ]),
    ...sufficientBinding.answerQualityContract.requiredAnswerTerms,
    ...sufficientBinding.answerQualityContract.forbiddenAnswerTerms,
    passingAnswer().text,
  ]);

  const tampered = clone(artifact);
  tampered.aggregate.gateBlockedCount = 3;
  assert.throws(
    () => assertEvidenceGatedAnswerArtifact(tampered),
    /artifact-integrity/u,
  );

  const rehashed = clone(artifact);
  rehashed.aggregate.gateBlockedCount = 3;
  const { id: ignoredId, integrityHash: ignoredHash, ...content } = rehashed;
  void ignoredId;
  void ignoredHash;
  rehashed.integrityHash = hashEvidenceGatedAnswerValue(
    JSON.stringify(content),
  );
  rehashed.id = `evidence-gated-answer-shadow-${rehashed.integrityHash}`;
  assert.throws(
    () => assertEvidenceGatedAnswerArtifact(rehashed),
    /artifact-semantic-drift/u,
  );

  const rehashedGeneratorCount = clone(artifact);
  rehashedGeneratorCount.aggregate.generatorCallCount = 99;
  const {
    id: ignoredGeneratorCountId,
    integrityHash: ignoredGeneratorCountHash,
    ...generatorCountContent
  } = rehashedGeneratorCount;
  void ignoredGeneratorCountId;
  void ignoredGeneratorCountHash;
  rehashedGeneratorCount.integrityHash =
    hashEvidenceGatedAnswerValue(JSON.stringify(generatorCountContent));
  rehashedGeneratorCount.id =
    `evidence-gated-answer-shadow-${rehashedGeneratorCount.integrityHash}`;
  assert.throws(
    () => assertEvidenceGatedAnswerArtifact(rehashedGeneratorCount),
    /artifact-semantic-drift/u,
  );

  const driftedFixture = clone(fixture);
  driftedFixture.cases[0].expectedAction = 'abstain';
  assert.throws(
    () => assertEvidenceGatedAnswerFixture(driftedFixture, { q9Fixture }),
    /q10-contract-fixture-drift/u,
  );
});

test('tracked Q9 and Q7 bindings fail closed before generation', () => {
  const inputs = {
    fixtureText: readText(
      'fixtures/evidence-gated-answer-cases-v1.json',
    ),
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
  const bindings = assertEvidenceGatedAnswerBindings(inputs);
  assert.equal(bindings.q9LocalArtifact.aggregate.modelConforms, false);
  assert.equal(bindings.q9LocalArtifact.aggregate.modelFailureCount, 1);

  assert.throws(
    () =>
      assertEvidenceGatedAnswerBindings({
        ...inputs,
        q9FixtureText: `${inputs.q9FixtureText}\n`,
      }),
    /artifact drift|q9-artifact-binding-drift/u,
  );
  assert.throws(
    () =>
      assertEvidenceGatedAnswerBindings({
        ...inputs,
        q9ArtifactText: inputs.q9ArtifactText.replace(
          '"caseCount": 5',
          '"caseCount": 4',
        ),
      }),
    /integrity|q9-artifact-binding-drift/u,
  );
  assert.throws(
    () =>
      assertEvidenceGatedAnswerBindings({
        ...inputs,
        q9LocalArtifactText: inputs.q9LocalArtifactText.replace(
          '"modelFailureCount": 1',
          '"modelFailureCount": 2',
        ),
      }),
    /integrity|q9-shadow-history-drift/u,
  );
  assert.throws(
    () =>
      assertEvidenceGatedAnswerBindings({
        ...inputs,
        q7EvidenceText: `${inputs.q7EvidenceText}\n`,
      }),
    /q7-baseline-drift/u,
  );
});
