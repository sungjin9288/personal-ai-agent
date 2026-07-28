import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertLocalCouncilClaimContractRobustnessArtifact,
  buildLocalCouncilClaimContractRobustnessArtifact,
} from '../src/core/local-council-claim-contract-robustness.mjs';
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
  fixtureId: 'claim-contract-robustness-test',
  parentRunId: 'run-planner',
  promptProfile: 'seat-scoped-v2',
  requiredSeats: seats,
  schemaVersion: 'personal-ai-agent-local-council-claim-contract-robustness-fixture/v1',
  sessionId: 'session-test',
  workspaceId: 'workspace-test',
}, null, 2)}\n`;
const c6BaselineArtifact = {
  id: 'local-council-provider-shadow-baseline',
  integrityHash: 'a'.repeat(64),
  localShadowQualified: false,
  qualification: {
    decision: 'keep-stub-only',
  },
};
const c7ResearchCall = {
  attemptCount: 1,
  durationMs: 10,
  failureKind: 'council-contract:invalid-claim',
  inputTokens: 10,
  outputHash: 'b'.repeat(64),
  outputTokens: 5,
  phase: 'opening-position',
  promptHash: 'c'.repeat(64),
  retryCount: 0,
  seatId: 'research',
  status: 'failed',
  totalTokens: 15,
};
const c7BaselineArtifact = {
  calls: [c7ResearchCall],
  id: 'local-council-seat-contract-shadow-baseline',
  integrityHash: 'd'.repeat(64),
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
    failureSubreason: null,
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

function artifact({
  failedOpening = false,
  targetMatched = true,
} = {}) {
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
        `opening-${index}`,
        `prompt-${index}`,
      )),
    ...seats.map((seatId, index) =>
      call('rebuttal', seatId, `rebuttal-${index}`, `rebuttal-prompt-${index}`)),
    call('synthesis', 'chair', 'synthesis', 'synthesis-prompt'),
  ];
  if (failedOpening) {
    calls[0] = {
      ...calls[0],
      failureKind: 'council-contract:invalid-claim',
      failureSubreason: 'claim-severity',
      status: 'failed',
    };
  }
  const targetBindings = seats.map((seatId, index) => {
    const seatContract = resolveCouncilSeatPromptContract({
      phase: 'opening-position',
      profile: 'seat-scoped-v2',
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
  return buildLocalCouncilClaimContractRobustnessArtifact({
    baseline: {
      c6: {
        artifactId: c6BaselineArtifact.id,
        decision: c6BaselineArtifact.qualification.decision,
        integrityHash: c6BaselineArtifact.integrityHash,
        localShadowQualified: c6BaselineArtifact.localShadowQualified,
      },
      c7: {
        artifactId: c7BaselineArtifact.id,
        decision: c7BaselineArtifact.qualification.decision,
        integrityHash: c7BaselineArtifact.integrityHash,
        localShadowQualified: c7BaselineArtifact.localShadowQualified,
      },
    },
    c7ResearchCall,
    calls,
    diagnostic: {
      attemptCount: 1,
      durationMs: 10,
      failureKind: 'council-contract:invalid-claim',
      failureSubreason: 'claim-position',
      inputTokens: 10,
      outputHash: c7ResearchCall.outputHash,
      outputTokens: 5,
      promptHash: c7ResearchCall.promptHash,
      retryCount: 0,
      status: 'failed',
      totalTokens: 15,
    },
    fixtureHash,
    model: {
      digest: 'e'.repeat(64),
      id: 'qwen2.5:3b',
      licenseHash: 'f'.repeat(64),
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
          profile: 'seat-scoped-v2',
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
      code: failedOpening ? 'council-contract-failed' : 'ok',
      manifestDigest: failedOpening ? null : `sha256:${'1'.repeat(64)}`,
      status: failedOpening ? 'failed' : 'passed',
    },
  });
}

function assertArtifact(value) {
  return assertLocalCouncilClaimContractRobustnessArtifact(value, {
    c6BaselineArtifact,
    c7BaselineArtifact,
    fixtureText,
  });
}

test('C8 artifact qualifies only a complete v2 observation with exact C7 diagnosis', () => {
  const value = artifact();

  assert.equal(value.localShadowQualified, true);
  assert.equal(value.qualification.decision, 'eligible-for-independent-review');
  assert.equal(value.qualification.c7FailureDiagnosed, true);
  assert.equal(value.diagnostic.failureSubreason, 'claim-position');
  assert.equal(value.defaultProfilePromotionAuthorized, false);
  assert.doesNotThrow(() => assertArtifact(value));
});

test('C8 artifact keeps failed claims and target mismatch as explicit non-promotion', () => {
  for (const value of [
    artifact({ failedOpening: true }),
    artifact({ targetMatched: false }),
  ]) {
    assert.equal(value.localShadowQualified, false);
    assert.equal(value.qualification.decision, 'keep-stub-only');
    assert.doesNotThrow(() => assertArtifact(value));
  }
});

test('C8 artifact rejects authority, baseline, diagnostic, target, and summary drift', () => {
  const cases = [
    (value) => {
      value.runtimeActivation = true;
    },
    (value) => {
      value.baseline.c7.integrityHash = '0'.repeat(64);
    },
    (value) => {
      value.diagnostic.failureSubreason = 'raw-model-detail';
    },
    (value) => {
      value.targetBindings[0].expectedTargetHash = '2'.repeat(64);
      value.targetBindings[0].observedTargetHash = '2'.repeat(64);
    },
    (value) => {
      value.promptProfile.hash = '3'.repeat(64);
    },
    (value) => {
      value.openingIsolation.contextHash = '4'.repeat(64);
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
    value.id = `local-council-claim-contract-robustness-${value.integrityHash}`;
    assert.throws(() => assertArtifact(value));
  }
});
