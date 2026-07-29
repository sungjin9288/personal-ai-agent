import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';

import {
  assertLocalCouncilChairSynthesisContractShadowArtifact,
  buildLocalCouncilChairSynthesisContractShadowArtifact,
} from '../src/core/local-council-chair-synthesis-contract-shadow.mjs';
import { resolveCouncilSeatPromptContract } from '../src/core/council-seat-prompt-contract.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { buildRequestPrompt, normalizeStructuredOutput } from '../src/providers/structured-provider-utils.mjs';

const seats = ['research', 'implementation', 'verification'];
const fixtureText = '{"fixture":"c10"}\n';
const legacyPromptHashes = {
  'seat-scoped-v1': [
    '38852075c869f03d6247a1d4eb4e418577df4c815d172693330e2d94bfb9beaf',
    '86d004102a46f8c5f2b87f3b609608e60c3cbcbc998350747ddb35938e0fd7db',
    '32ce02c870ffc8638f3c58abe39f5c2efacff971d8f303b834e55b76c6c6492f',
    '1c98145444bf88bd29f8a543a912d0a2728fdaa42b7beee09a278457aa4601d4',
    '858a4e76b385a8ae7356df1e9b29c9276527d0fadcb0089bdf27dfc1bd9c866b',
    'dcdd2b4bb7a5ad74ed06ff8cb685b61f64b495f2fb1cffbd6067496f2dc227a3',
  ],
  'seat-scoped-v2': [
    '941fb515cc790fd755f9c5b0fdf655fda23d28a7bf63fe89677c464fe0c99375',
    '7e630050e32c42c491f5f796e4f9211e3a1493d3d2c3f7b7a5cdc9d96f0ce516',
    '1a6868f1e0d19af93d0526660e53d65019db1fd29808d236814dac1db7409bb9',
    '0b4d33a3a949fd70380aea96a41e7c680bd3852b2e50efedd9fab434e82549ba',
    '03217d2c962e9ca7ed217a31fbbfdfcfd644ab6633b640157516dba273d666e5',
    'f6ced94ecd25820a0d03126741b3d8c7fd28e16cee87029bf5f9f2f74ddc7781',
  ],
  'seat-scoped-v3': [
    '3463219fae5b296d707596d00b6cc59aedcfd56575ae99d77865dbc4d7381e3e',
    'e088e7d222719c6aad492b48e2e28328af259d219fd1e77ac9ec90f64c9967e8',
    '13d0f697585c20c12e6e0d56d8b195a6b517642220551b4500fefd643bb44b31',
    'cf7c198c2fa89bf2770d1666bcb29d39f92b6e7e6e7e74de9e9b1cbf394922e4',
    '5da7a5c68f2bec48e5b144c980e3f9384a024a24593fb7d0e835800de814588d',
    '641e8264058a6371fc08fa01e653d572281330c8e8eb40cd4c46ec3fcf7e4386',
  ],
};

function call(phase, seatId, value) {
  return {
    attemptCount: 1, durationMs: 1, failureKind: null, failureStage: null, failureSubreason: null,
    inputTokens: 2, outputHash: hashLocalCouncilShadowValue(`${value}-output`), outputTokens: 3,
    phase, promptHash: hashLocalCouncilShadowValue(`${value}-prompt`), retryCount: 0, seatId,
    status: 'passed', totalTokens: 5,
  };
}

function baseline(name) {
  return {
    artifactId: `local-council-${name}-${name.repeat(64).slice(0, 64)}`,
    decision: 'keep-stub-only', fileSha256: name.repeat(64).slice(0, 64),
    integrityHash: name.repeat(64).slice(0, 64), localShadowQualified: false,
  };
}

function artifact({ chair = 'passed' } = {}) {
  const calls = [
    ...seats.map((seat) => call('opening-position', seat, `opening-${seat}`)),
    ...seats.map((seat) => call('rebuttal', seat, `rebuttal-${seat}`)),
    call('synthesis', 'chair', 'chair'),
  ];
  if (chair !== 'passed') {
    calls[6] = {
      ...calls[6], failureKind: 'structured-output:schema-invalid', failureStage: 'structured-output', status: 'failed',
    };
  }
  return buildLocalCouncilChairSynthesisContractShadowArtifact({
    baseline: { c6: baseline('a'), c7: baseline('b'), c8: baseline('c'), c9: baseline('d') },
    c8ImplementationCall: {
      failureKind: 'council-contract:missing-field', inputTokens: 2, outputHash: 'e'.repeat(64),
      outputTokens: 3, promptHash: 'f'.repeat(64), totalTokens: 5,
    },
    calls,
    diagnostic: {
      failureKind: 'council-contract:missing-field', failureSubreason: 'claim-severity',
      inputTokens: 2, outputHash: 'e'.repeat(64), outputTokens: 3,
      promptHash: 'f'.repeat(64), totalTokens: 5,
    },
    fixtureHash: hashLocalCouncilShadowValue(fixtureText),
    model: { digest: '4'.repeat(64), id: 'qwen2.5:3b', licenseHash: '5'.repeat(64), sizeBytes: 1 },
    observedAt: '2026-07-29T00:00:00.000Z',
    openingIsolation: { contextHash: '1'.repeat(64), contextKind: 'council-frame', otherOpeningStatementCount: 0, verified: true },
    promptProfileHash: promptProfileHash(),
    runtime: {
      afterContextLength: 4096, afterLoaded: true, afterSizeBytes: 1, afterVramBytes: 1,
      beforeLoaded: false, cloudFeaturesDisabled: true, endpointAlias: 'loopback-ollama',
      kind: 'ollama', transportLoopback: true, version: '0.23.0',
    },
    targetBindings: seats.map((seatId) => {
      const contract = resolveCouncilSeatPromptContract({
        phase: 'opening-position', profile: 'seat-scoped-v4', seatId,
      });
      const hash = hashLocalCouncilShadowValue(`${contract.targetSeatId}:claim-1`);
      return { expectedTargetHash: hash, matched: true, observedTargetHash: hash, seatId };
    }),
    validation: chair === 'passed'
      ? { code: 'ok', manifestDigest: `sha256:${'3'.repeat(64)}`, status: 'passed' }
      : { code: 'council-contract-failed', manifestDigest: null, status: 'failed' },
  });
}

function promptProfileHash() {
  const openingClaims = seats.map((seatId) => ({ id: `${seatId}:claim-1`, seatId }));
  return hashLocalCouncilShadowValue(seats.flatMap((seatId) => [
    resolveCouncilSeatPromptContract({
      phase: 'opening-position', profile: 'seat-scoped-v4', seatId,
    }),
    resolveCouncilSeatPromptContract({
      councilBrief: { claims: openingClaims }, phase: 'rebuttal',
      profile: 'seat-scoped-v4', seatId,
    }),
  ]));
}

function chairInput() {
  return {
    councilPhase: 'synthesis', councilPromptProfile: 'seat-scoped-v4', role: 'executor',
    councilSynthesisInput: {
      brief: {
        claims: seats.map((seat) => ({ id: `${seat}:claim-1`, seatId: seat })),
        evidenceRefs: ['artifact:bounded-plan', 'artifact:verification-record'],
      },
      rebuttals: [{ councilStatement: { claims: [{ id: 'research:claim-2' }] } }],
    },
  };
}

test('seat-scoped-v4 keeps all specialist opening bytes identical to v3', () => {
  for (const phase of ['opening-position', 'rebuttal']) {
    for (const seatId of seats) {
      const base = phase === 'rebuttal'
        ? { councilBrief: {
          claims: seats.map((id) => ({ id: `${id}:claim-1`, seatId: id })),
          evidenceRefs: ['artifact:bounded-plan'],
        } }
        : { councilFrame: { evidenceCatalog: [{ id: 'artifact:bounded-plan' }] } };
      const input = { ...base, councilPhase: phase, councilSeatId: seatId, role: 'specialist' };
      assert.equal(
        buildRequestPrompt({ ...input, councilPromptProfile: 'seat-scoped-v4' }, 'Council Context'),
        buildRequestPrompt({ ...input, councilPromptProfile: 'seat-scoped-v3' }, 'Council Context'),
      );
    }
  }
});

test('seat-scoped-v1 through v3 representative prompt bytes remain frozen', () => {
  for (const [profile, expected] of Object.entries(legacyPromptHashes)) {
    const actual = [];
    for (const phase of ['opening-position', 'rebuttal']) {
      for (const councilSeatId of seats) {
        const base = phase === 'rebuttal'
          ? {
              councilBrief: {
                claims: seats.map((seatId) => ({ id: `${seatId}:claim-1`, seatId })),
                evidenceRefs: ['artifact:bounded-plan'],
              },
            }
          : { councilFrame: { evidenceCatalog: [{ id: 'artifact:bounded-plan' }] } };
        const prompt = buildRequestPrompt({
          ...base,
          councilPhase: phase,
          councilPromptProfile: profile,
          councilSeatId,
          role: 'specialist',
        }, 'Council Context');
        actual.push(createHash('sha256').update(prompt).digest('hex'));
      }
    }
    assert.deepEqual(actual, expected);
  }
});

test('v4 chair contract derives exact Council Context allowlists without supplementation', () => {
  const input = chairInput();
  const prompt = buildRequestPrompt(input, 'Council Context');
  assert.match(prompt, /claim ids: \["research:claim-1","implementation:claim-1","verification:claim-1","research:claim-2"\]/);
  assert.match(prompt, /evidence ids: \["artifact:bounded-plan","artifact:verification-record"\]/);
  const output = {
    artifactContent: '# Decision', nextAction: 'Keep the stub.', summaryText: 'Bounded decision.',
    councilSynthesis: {
      acceptedClaimIds: ['research:claim-1'], agreementIds: [], evidenceRefs: ['artifact:bounded-plan'],
      nextAction: 'Keep the stub.', nextOwner: 'workspace-owner', rejectedClaims: [],
      unresolvedConflictIds: [], unresolvedCriticalConflictIds: [], verificationPlan: ['Review the evidence.'],
    },
  };
  assert.doesNotThrow(() => normalizeStructuredOutput({ output, role: 'executor' }, input, 'Fake'));
  assert.throws(() => normalizeStructuredOutput({ output: { ...output, extra: true }, role: 'executor' }, input, 'Fake'), /chair synthesis contract failed/);
  assert.throws(() => normalizeStructuredOutput({
    output: {
      ...output,
      councilSynthesis: { ...output.councilSynthesis, verificationPlan: [] },
    },
    role: 'executor',
  }, input, 'Fake'), /chair synthesis contract failed/);
  assert.throws(() => normalizeStructuredOutput({
    output: {
      ...output,
      councilSynthesis: { ...output.councilSynthesis, nextOwner: 'provider' },
    },
    role: 'executor',
  }, input, 'Fake'), /chair synthesis contract failed/);
});

test('deterministic fake provider executes the complete C10 stage order without a local runtime', async () => {
  const inputs = [
    ...seats.map((councilSeatId) => ({
      councilBrief: null,
      councilFrame: { evidenceCatalog: [{ id: 'artifact:bounded-plan' }] },
      councilPhase: 'opening-position', councilPromptProfile: 'seat-scoped-v4',
      councilSeatId, role: 'specialist',
    })),
    ...seats.map((councilSeatId) => ({
      councilBrief: {
        claims: seats.map((seatId) => ({ id: `${seatId}:claim-1`, seatId })),
        evidenceRefs: ['artifact:bounded-plan'],
      },
      councilFrame: null, councilPhase: 'rebuttal', councilPromptProfile: 'seat-scoped-v4',
      councilSeatId, role: 'specialist',
    })),
    { ...chairInput(), councilSeatId: 'chair' },
  ];
  const observed = [];
  const fakeProvider = {
    async run(input) {
      observed.push(`${input.councilPhase}:${input.councilSeatId}`);
      return { input, retryCount: 0 };
    },
  };
  for (const input of inputs) {
    const result = await fakeProvider.run(input);
    assert.equal(result.retryCount, 0);
  }
  assert.deepEqual(observed, [
    'opening-position:research', 'opening-position:implementation', 'opening-position:verification',
    'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'synthesis:chair',
  ]);
});

test('C10 keeps full contract status separate from non-promotion and preserves post-provider failures', () => {
  const complete = artifact();
  assert.equal(complete.chairSynthesisContractPassed, true);
  assert.equal(complete.fullContractPassed, true);
  assert.equal(complete.localShadowQualified, false);
  assert.equal(complete.qualification.decision, 'keep-stub-only');
  assert.doesNotThrow(() => assertLocalCouncilChairSynthesisContractShadowArtifact(complete));

  const failed = artifact({ chair: 'structured-output' });
  assert.equal(failed.calls.at(-1).failureStage, 'structured-output');
  assert.match(failed.calls.at(-1).outputHash, /^[a-f0-9]{64}$/);
  assert.equal(failed.chairSynthesisContractPassed, false);
  assert.equal(failed.fullContractPassed, false);
  assert.doesNotThrow(() => assertLocalCouncilChairSynthesisContractShadowArtifact(failed));
});

test('C10 failure taxonomy preserves post-provider metrics for each non-request stage', () => {
  for (const [failureStage, failureKind] of [
    ['provider-request', 'provider:transport'],
    ['structured-output', 'structured-output:schema-invalid'],
    ['structured-output', 'council-contract:missing-field'],
    ['council-synthesis', 'council-contract:invalid-output'],
    ['council-manifest', 'council-manifest:failed'],
  ]) {
    const value = artifact({ chair: 'structured-output' });
    const chair = value.calls.at(-1);
    chair.failureStage = failureStage;
    chair.failureKind = failureKind;
    if (failureStage === 'provider-request') chair.outputHash = null;
    if (failureStage === 'council-manifest') {
      value.chairSynthesisContractPassed = true;
      value.validation = { code: 'critical-conflict', manifestDigest: `sha256:${'6'.repeat(64)}`, status: 'blocked' };
    }
    const { id: _id, integrityHash: _hash, ...content } = value;
    value.integrityHash = hashLocalCouncilShadowValue(content);
    value.id = `local-council-chair-synthesis-contract-shadow-${value.integrityHash}`;
    assert.doesNotThrow(() => assertLocalCouncilChairSynthesisContractShadowArtifact(value));
  }
});

test('C10 rejects rehashed authority, baseline, and content-bearing tampering', () => {
  for (const mutate of [
    (value) => { value.runtimeActivation = true; },
    (value) => { value.localShadowQualified = true; },
    (value) => { value.rawMessage = 'must not persist'; },
  ]) {
    const value = artifact();
    mutate(value);
    const { id: _id, integrityHash: _hash, ...content } = value;
    value.integrityHash = hashLocalCouncilShadowValue(content);
    value.id = `local-council-chair-synthesis-contract-shadow-${value.integrityHash}`;
    assert.throws(() => assertLocalCouncilChairSynthesisContractShadowArtifact(value));
  }
});
