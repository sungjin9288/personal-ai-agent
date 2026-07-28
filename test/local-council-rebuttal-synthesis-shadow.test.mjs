import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CouncilContractError,
  createCouncilFrame,
  createCouncilSynthesis,
  hashCouncilValue,
} from '../src/core/council-contract.mjs';
import {
  assertLocalCouncilRebuttalSynthesisShadowArtifact,
  buildLocalCouncilRebuttalSynthesisShadowArtifact,
} from '../src/core/local-council-rebuttal-synthesis-shadow.mjs';
import { hashLocalCouncilShadowValue } from '../src/core/local-council-provider-shadow.mjs';
import { resolveCouncilSeatPromptContract } from '../src/core/council-seat-prompt-contract.mjs';

const seats = ['research', 'implementation', 'verification'];
const fixtureText = `${JSON.stringify({
  councilId: 'council-test',
  evidenceCatalog: [{ id: 'artifact:plan', kind: 'artifact' }],
  fixtureId: 'rebuttal-synthesis-test',
  parentRunId: 'run-planner',
  promptProfile: 'seat-scoped-v3',
  requiredSeats: seats,
  schemaVersion: 'personal-ai-agent-local-council-rebuttal-synthesis-shadow-fixture/v1',
  sessionId: 'session-test',
  workspaceId: 'workspace-test',
}, null, 2)}\n`;

function baseline(name, hash) {
  return {
    artifactId: `local-council-${name}-${hash}`,
    decision: 'keep-stub-only',
    integrityHash: hash,
    localShadowQualified: false,
  };
}

function call(phase, seatId, value) {
  return {
    attemptCount: 1,
    durationMs: 10,
    failureKind: null,
    failureSubreason: null,
    inputTokens: 10,
    outputHash: hashLocalCouncilShadowValue(`${value}-output`),
    outputTokens: 5,
    phase,
    promptHash: hashLocalCouncilShadowValue(`${value}-prompt`),
    retryCount: 0,
    seatId,
    status: 'passed',
    totalTokens: 15,
  };
}

function profileContracts() {
  const claims = seats.map((seatId) => ({ id: `${seatId}:claim-1`, seatId }));
  return seats.flatMap((seatId) => [
    resolveCouncilSeatPromptContract({ phase: 'opening-position', profile: 'seat-scoped-v3', seatId }),
    resolveCouncilSeatPromptContract({
      councilBrief: { claims }, phase: 'rebuttal', profile: 'seat-scoped-v3', seatId,
    }),
  ]);
}

function artifact({ targetMatched = true } = {}) {
  const fixture = JSON.parse(fixtureText);
  const frame = createCouncilFrame({
    contextDigest: hashCouncilValue({ fixtureHash: hashLocalCouncilShadowValue(fixtureText) }),
    councilId: fixture.councilId,
    evidenceCatalog: fixture.evidenceCatalog.map((item) => ({
      ...item, councilId: fixture.councilId, sessionId: fixture.sessionId, workspaceId: fixture.workspaceId,
    })),
    parentRunId: fixture.parentRunId,
    riskSignals: [],
    sessionId: fixture.sessionId,
    workspaceId: fixture.workspaceId,
  });
  const c8ImplementationCall = {
    ...call('rebuttal', 'implementation', 'c8-implementation'),
    failureKind: 'council-contract:missing-field',
    failureSubreason: null,
    status: 'failed',
  };
  const targetBindings = seats.map((seatId, index) => {
    const contract = resolveCouncilSeatPromptContract({
      phase: 'opening-position', profile: 'seat-scoped-v3', seatId,
    });
    const expectedTargetHash = hashLocalCouncilShadowValue(`${contract.targetSeatId}:claim-1`);
    return {
      expectedTargetHash,
      matched: targetMatched || index > 0,
      observedTargetHash: targetMatched || index > 0
        ? expectedTargetHash
        : hashLocalCouncilShadowValue('wrong-target'),
      seatId,
    };
  });
  return buildLocalCouncilRebuttalSynthesisShadowArtifact({
    baseline: {
      c6: baseline('c6', 'a'.repeat(64)),
      c7: baseline('c7', 'b'.repeat(64)),
      c8: baseline('c8', 'c'.repeat(64)),
    },
    c8ImplementationCall,
    calls: [
      ...seats.map((seatId) => call('opening-position', seatId, `opening-${seatId}`)),
      ...seats.map((seatId) => call('rebuttal', seatId, `rebuttal-${seatId}`)),
      call('synthesis', 'chair', 'synthesis'),
    ],
    diagnostic: {
      failureKind: 'council-contract:missing-field',
      failureSubreason: 'claim-severity',
      inputTokens: c8ImplementationCall.inputTokens,
      outputHash: c8ImplementationCall.outputHash,
      outputTokens: c8ImplementationCall.outputTokens,
      promptHash: c8ImplementationCall.promptHash,
      totalTokens: c8ImplementationCall.totalTokens,
    },
    fixtureHash: hashLocalCouncilShadowValue(fixtureText),
    model: { digest: 'd'.repeat(64), id: 'qwen2.5:3b', licenseHash: 'e'.repeat(64), sizeBytes: 1 },
    observedAt: '2026-07-29T00:00:00.000Z',
    openingIsolation: {
      contextHash: hashLocalCouncilShadowValue(frame),
      contextKind: 'council-frame',
      otherOpeningStatementCount: 0,
      verified: true,
    },
    promptProfileHash: hashLocalCouncilShadowValue(profileContracts()),
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
    validation: { code: 'ok', manifestDigest: `sha256:${'f'.repeat(64)}`, status: 'passed' },
  });
}

test('C9 artifact qualifies only complete v3 evidence bound to C8 claim-severity', () => {
  const value = artifact();
  assert.equal(value.localShadowQualified, true);
  assert.equal(value.qualification.decision, 'eligible-for-independent-review');
  assert.equal(value.diagnostic.failureSubreason, 'claim-severity');
  assert.doesNotThrow(() => assertLocalCouncilRebuttalSynthesisShadowArtifact(value, { fixtureText }));
});

test('C9 artifact rejects rehashed target and authority tampering', () => {
  for (const mutate of [
    (value) => { value.targetBindings[0].matched = true; },
    (value) => { value.runtimeActivation = true; },
    (value) => { value.diagnostic.failureSubreason = 'raw-model-detail'; },
  ]) {
    const value = artifact({ targetMatched: false });
    mutate(value);
    const { id: _id, integrityHash: _integrityHash, ...content } = value;
    value.integrityHash = hashLocalCouncilShadowValue(content);
    value.id = `local-council-rebuttal-synthesis-shadow-${value.integrityHash}`;
    assert.throws(() => assertLocalCouncilRebuttalSynthesisShadowArtifact(value, { fixtureText }));
  }
});

test('chair contract errors retain the completed stage observation for later evidence classification', () => {
  const value = artifact();
  const observation = value.calls.at(-1);
  assert.throws(() => createCouncilSynthesis({}), (error) =>
    error instanceof CouncilContractError && error.code === 'unexpected-field');
  assert.equal(observation.status, 'passed');
  assert.match(observation.outputHash, /^[a-f0-9]{64}$/);
  assert.equal(observation.totalTokens, observation.inputTokens + observation.outputTokens);
});
