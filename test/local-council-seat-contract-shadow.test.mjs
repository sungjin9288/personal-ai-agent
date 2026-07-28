import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertLocalCouncilSeatContractShadowArtifact,
  buildLocalCouncilSeatContractShadowArtifact,
} from '../src/core/local-council-seat-contract-shadow.mjs';
import {
  createCouncilFrame,
  hashCouncilValue,
} from '../src/core/council-contract.mjs';
import {
  hashLocalCouncilShadowValue,
} from '../src/core/local-council-provider-shadow.mjs';
import {
  resolveCouncilSeatPromptContract,
} from '../src/core/council-seat-prompt-contract.mjs';

const seats = ['research', 'implementation', 'verification'];
const fixtureText = `${JSON.stringify({
  councilId: 'council-test',
  evidenceCatalog: [
    { id: 'artifact:plan', kind: 'artifact' },
  ],
  fixtureId: 'seat-contract-test',
  parentRunId: 'run-planner',
  promptProfile: 'seat-scoped-v1',
  requiredSeats: seats,
  schemaVersion: 'personal-ai-agent-local-council-seat-contract-shadow-fixture/v1',
  sessionId: 'session-test',
  workspaceId: 'workspace-test',
}, null, 2)}\n`;
const baselineArtifact = {
  id: 'local-council-provider-shadow-baseline',
  integrityHash: 'a'.repeat(64),
  localShadowQualified: false,
  qualification: {
    decision: 'keep-stub-only',
  },
};

function call(phase, seatId, output, prompt) {
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

function artifact({ duplicateOpeningOutput = false, targetMatched = true } = {}) {
  const fixture = JSON.parse(fixtureText);
  const fixtureHash = hashLocalCouncilShadowValue(fixtureText);
  const frame = createCouncilFrame({
    contextDigest: hashCouncilValue({ fixtureHash }),
    councilId: fixture.councilId,
    evidenceCatalog: fixture.evidenceCatalog.map((item) => ({
      ...item,
      councilId: fixture.councilId,
      sessionId: fixture.sessionId,
      workspaceId: fixture.workspaceId,
    })),
    parentRunId: fixture.parentRunId,
    riskSignals: [],
    sessionId: fixture.sessionId,
    workspaceId: fixture.workspaceId,
  });
  const calls = [
    ...seats.map((seatId, index) =>
      call(
        'opening-position',
        seatId,
        duplicateOpeningOutput ? 'same' : `opening-${index}`,
        `prompt-${index}`,
      )),
    ...seats.map((seatId, index) =>
      call('rebuttal', seatId, `rebuttal-${index}`, `rebuttal-prompt-${index}`)),
    call('synthesis', 'chair', 'synthesis', 'synthesis-prompt'),
  ];
  const targetBindings = seats.map((seatId, index) => {
    const seatContract = resolveCouncilSeatPromptContract({
      phase: 'opening-position',
      profile: 'seat-scoped-v1',
      seatId,
    });
    const expectedTargetHash = hashLocalCouncilShadowValue(
      `${seatContract.targetSeatId}:claim-1`,
    );
    return {
      expectedTargetHash,
      matched: targetMatched || index > 0,
      observedTargetHash: targetMatched || index > 0
        ? expectedTargetHash
        : hashLocalCouncilShadowValue('wrong-target'),
      seatId,
    };
  });
  return buildLocalCouncilSeatContractShadowArtifact({
    baseline: {
      artifactId: baselineArtifact.id,
      decision: baselineArtifact.qualification.decision,
      integrityHash: baselineArtifact.integrityHash,
      localShadowQualified: baselineArtifact.localShadowQualified,
    },
    calls,
    fixtureHash,
    model: {
      digest: 'b'.repeat(64),
      id: 'qwen2.5:3b',
      licenseHash: 'c'.repeat(64),
      sizeBytes: 1,
    },
    observedAt: '2026-07-28T00:00:00.000Z',
    openingIsolation: {
      contextHash: hashLocalCouncilShadowValue(frame),
      contextKind: 'council-frame',
      otherOpeningStatementCount: 0,
      verified: true,
    },
    promptProfileHash: hashLocalCouncilShadowValue(
      seats.map((seatId) =>
        resolveCouncilSeatPromptContract({
          phase: 'opening-position',
          profile: 'seat-scoped-v1',
          seatId,
        })),
    ),
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
    targetBindings,
    validation: {
      code: 'ok',
      manifestDigest: `sha256:${'f'.repeat(64)}`,
      status: 'passed',
    },
  });
}

test('C7 artifact qualifies only a complete seat-scoped local observation', () => {
  const value = artifact();

  assert.equal(value.localShadowQualified, true);
  assert.equal(value.qualification.decision, 'eligible-for-independent-review');
  assert.equal(value.defaultProfilePromotionAuthorized, false);
  assert.doesNotThrow(() =>
    assertLocalCouncilSeatContractShadowArtifact(value, {
      baselineArtifact,
      fixtureText,
    }),
  );
});

test('C7 artifact keeps duplicate openings and target mismatch as explicit non-promotion', () => {
  for (const value of [
    artifact({ duplicateOpeningOutput: true }),
    artifact({ targetMatched: false }),
  ]) {
    assert.equal(value.localShadowQualified, false);
    assert.equal(value.qualification.decision, 'keep-stub-only');
    assert.doesNotThrow(() =>
      assertLocalCouncilSeatContractShadowArtifact(value, {
        baselineArtifact,
        fixtureText,
      }),
    );
  }
});

test('C7 artifact rejects authority, baseline, target, and summary drift after rehash', () => {
  const cases = [
    (value) => {
      value.runtimeActivation = true;
    },
    (value) => {
      value.baseline.integrityHash = '0'.repeat(64);
    },
    (value) => {
      value.targetBindings[0].matched = false;
    },
    (value) => {
      value.targetBindings[0].expectedTargetHash = '9'.repeat(64);
      value.targetBindings[0].observedTargetHash = '9'.repeat(64);
    },
    (value) => {
      value.promptProfile.hash = '8'.repeat(64);
    },
    (value) => {
      value.openingIsolation.contextHash = '7'.repeat(64);
    },
    (value) => {
      value.summary.totalTokens += 1;
    },
  ];

  for (const mutate of cases) {
    const value = artifact();
    mutate(value);
    const { id: _id, integrityHash: _integrityHash, ...content } = value;
    value.integrityHash = hashLocalCouncilShadowValue(content);
    value.id = `local-council-seat-contract-shadow-${value.integrityHash}`;
    assert.throws(() =>
      assertLocalCouncilSeatContractShadowArtifact(value, {
        baselineArtifact,
        fixtureText,
      }),
    );
  }
});
