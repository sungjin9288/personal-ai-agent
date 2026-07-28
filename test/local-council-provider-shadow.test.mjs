import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertLocalCouncilProviderShadowArtifact,
  buildLocalCouncilProviderShadowArtifact,
  hashLocalCouncilShadowValue,
} from '../src/core/local-council-provider-shadow.mjs';

const fixtureText = '{"fixture":"local-council-shadow"}\n';
const seats = ['research', 'implementation', 'verification'];

function call(phase, seatId, output, prompt = `${phase} prompt`) {
  return {
    attemptCount: 1,
    durationMs: 10,
    failureKind: null,
    inputTokens: 10,
    outputHash: hashLocalCouncilShadowValue(output),
    outputTokens: 5,
    phase,
    promptHash: hashLocalCouncilShadowValue(prompt),
    retryCount: 0,
    seatId,
    status: 'passed',
    totalTokens: 15,
  };
}

function artifact({ openingOutputs = ['same', 'same', 'same'] } = {}) {
  return buildLocalCouncilProviderShadowArtifact({
    calls: [
      ...seats.map((seat, index) =>
        call('opening-position', seat, openingOutputs[index], 'shared prompt')),
      ...seats.map((seat) => call('rebuttal', seat, `rebuttal-${seat}`)),
      call('synthesis', 'chair', 'synthesis'),
    ],
    fixtureHash: hashLocalCouncilShadowValue(fixtureText),
    model: {
      digest: 'a'.repeat(64),
      id: 'qwen2.5:3b',
      licenseHash: 'b'.repeat(64),
      sizeBytes: 1_929_912_432,
    },
    observedAt: '2026-07-28T00:00:00.000Z',
    runtime: {
      afterContextLength: 4096,
      afterLoaded: true,
      afterSizeBytes: 2_000_000_000,
      afterVramBytes: 2_000_000_000,
      beforeLoaded: false,
      cloudFeaturesDisabled: true,
      endpointAlias: 'loopback-ollama',
      kind: 'ollama',
      transportLoopback: true,
      version: '0.23.0',
    },
    validation: {
      code: 'ok',
      manifestDigest: `sha256:${'c'.repeat(64)}`,
      status: 'passed',
    },
  });
}

test('local council shadow keeps identical opening output as an explicit non-promotion result', () => {
  const value = artifact();

  assert.doesNotThrow(() =>
    assertLocalCouncilProviderShadowArtifact(value, { fixtureText }),
  );
  assert.equal(value.qualification.contractValidated, true);
  assert.equal(value.qualification.sharedOpeningPromptVerified, true);
  assert.equal(value.qualification.independentOpeningDiversityObserved, false);
  assert.equal(value.localShadowQualified, false);
  assert.equal(value.qualification.decision, 'keep-stub-only');
});

test('local council shadow separates observed diversity from default promotion authority', () => {
  const value = artifact({
    openingOutputs: ['research', 'implementation', 'verification'],
  });

  assert.equal(value.localShadowQualified, true);
  assert.equal(value.qualification.decision, 'eligible-for-independent-review');
  assert.equal(value.defaultProfilePromotionAuthorized, false);
  assert.doesNotThrow(() =>
    assertLocalCouncilProviderShadowArtifact(value, { fixtureText }),
  );
});

test('local council shadow rejects integrity, fixture, cost, and content boundary drift', () => {
  const cases = [
    ['integrity', (value) => {
      value.summary.callCount = 8;
    }],
    ['fixture', (value) => {
      value.fixtureHash = 'f'.repeat(64);
    }],
    ['cost', (value) => {
      value.apiCostUsd = 1;
    }],
    ['content', (value) => {
      value.calls[0].prompt = 'raw prompt';
    }],
  ];

  for (const [label, mutate] of cases) {
    const value = artifact();
    mutate(value);
    assert.throws(
      () => assertLocalCouncilProviderShadowArtifact(value, { fixtureText }),
      undefined,
      label,
    );
  }
});

test('local council shadow records contract failure and blocks dependent synthesis', () => {
  const calls = artifact().calls;
  calls[3] = {
    ...calls[3],
    failureKind: 'council-contract:missing-field',
    status: 'failed',
  };
  calls[6] = {
    attemptCount: 0,
    durationMs: 0,
    failureKind: 'dependency-blocked',
    inputTokens: 0,
    outputHash: null,
      outputTokens: 0,
      phase: 'synthesis',
      promptHash: null,
    retryCount: 0,
    seatId: 'chair',
    status: 'not-attempted',
    totalTokens: 0,
  };
  const value = buildLocalCouncilProviderShadowArtifact({
    calls,
    fixtureHash: hashLocalCouncilShadowValue(fixtureText),
    model: {
      digest: 'a'.repeat(64),
      id: 'qwen2.5:3b',
      licenseHash: 'b'.repeat(64),
      sizeBytes: 1_929_912_432,
    },
    observedAt: '2026-07-28T00:00:00.000Z',
    runtime: artifact().runtime,
    validation: {
      code: 'council-contract-failed',
      manifestDigest: null,
      status: 'failed',
    },
  });

  assert.equal(value.localShadowQualified, false);
  assert.equal(value.summary.failedCallCount, 1);
  assert.equal(value.summary.notAttemptedCallCount, 1);
  assert.doesNotThrow(() =>
    assertLocalCouncilProviderShadowArtifact(value, { fixtureText }),
  );
});

test('local council shadow rejects rehashed summary, ordering, and qualification drift', () => {
  const cases = [
    ['summary', (value) => {
      value.summary.totalTokens += 1;
    }],
    ['ordering', (value) => {
      [value.calls[0], value.calls[1]] = [value.calls[1], value.calls[0]];
    }],
    ['qualification', (value) => {
      value.qualification.contractValidated = false;
    }],
    ['failure kind', (value) => {
      value.calls[3].status = 'failed';
      value.calls[3].failureKind = 'provider:timeout raw detail';
    }],
  ];

  for (const [label, mutate] of cases) {
    const value = artifact({
      openingOutputs: ['research', 'implementation', 'verification'],
    });
    mutate(value);
    const { id: _id, integrityHash: _integrityHash, ...content } = value;
    value.integrityHash = hashLocalCouncilShadowValue(content);
    value.id = `local-council-provider-shadow-${value.integrityHash}`;
    assert.throws(
      () => assertLocalCouncilProviderShadowArtifact(value, { fixtureText }),
      undefined,
      label,
    );
  }
});
