import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertCouncilSeatTargetBinding,
  classifyCouncilClaimFailure,
  getCouncilSeatPromptProfileId,
  getCouncilSeatRobustnessPromptProfileId,
  resolveCouncilSeatPromptContract,
} from '../src/core/council-seat-prompt-contract.mjs';

const profile = getCouncilSeatPromptProfileId();
const councilBrief = {
  claims: [
    { id: 'research:claim-1', seatId: 'research' },
    { id: 'implementation:claim-1', seatId: 'implementation' },
    { id: 'verification:claim-1', seatId: 'verification' },
  ],
};

test('seat-scoped opening contracts keep fixed distinct responsibilities without targets', () => {
  const contracts = ['research', 'implementation', 'verification'].map((seatId) =>
    resolveCouncilSeatPromptContract({
      phase: 'opening-position',
      profile,
      seatId,
    }),
  );

  assert.equal(new Set(contracts.map((contract) => contract.responsibility)).size, 3);
  assert.deepEqual(
    contracts.map((contract) => contract.requiredTargetClaimId),
    [null, null, null],
  );
});

test('seat-scoped rebuttal contracts bind a deterministic target rotation', () => {
  const bindings = ['research', 'implementation', 'verification'].map((seatId) =>
    assertCouncilSeatTargetBinding({
      councilBrief,
      phase: 'rebuttal',
      profile,
      seatId,
      targetClaimIds: [
        {
          research: 'implementation:claim-1',
          implementation: 'verification:claim-1',
          verification: 'research:claim-1',
        }[seatId],
      ],
    }),
  );

  assert.deepEqual(
    bindings.map((contract) => contract.targetSeatId),
    ['implementation', 'verification', 'research'],
  );
});

test('seat-scoped target binding fails closed for missing, duplicated, and foreign targets', () => {
  for (const targetClaimIds of [
    [],
    ['implementation:claim-1', 'implementation:claim-1'],
    ['verification:claim-1'],
  ]) {
    assert.throws(
      () =>
        assertCouncilSeatTargetBinding({
          councilBrief,
          phase: 'rebuttal',
          profile,
          seatId: 'research',
          targetClaimIds,
        }),
      /targetClaimIds must equal/,
    );
  }
});

test('seat-scoped contracts reject unknown profiles and incomplete briefs', () => {
  assert.throws(
    () =>
      resolveCouncilSeatPromptContract({
        phase: 'opening-position',
        profile: 'dynamic-persona',
        seatId: 'research',
      }),
    /unsupported profile/,
  );
  assert.throws(
    () =>
      resolveCouncilSeatPromptContract({
        councilBrief: { claims: [] },
        phase: 'rebuttal',
        profile,
        seatId: 'verification',
      }),
    /requires exactly one research opening claim/,
  );
});

test('seat-scoped robustness profile preserves fixed responsibilities and target rotation', () => {
  const robustnessProfile = getCouncilSeatRobustnessPromptProfileId();
  const contract = resolveCouncilSeatPromptContract({
    councilBrief,
    phase: 'rebuttal',
    profile: robustnessProfile,
    seatId: 'verification',
  });

  assert.equal(contract.profile, 'seat-scoped-v2');
  assert.equal(contract.responsibility.includes('failure conditions'), true);
  assert.equal(contract.targetSeatId, 'research');
  assert.equal(contract.requiredTargetClaimId, 'research:claim-1');
});

test('invalid claim diagnostics expose only bounded content-free subreasons', () => {
  const cases = [
    ['claims must contain between 1 and 6 items.', 'claim-count'],
    ['Claim research:claim-1 must belong to seat verification.', 'claim-seat'],
    ['Unsupported claim position: support | challenge | unknown.', 'claim-position'],
    ['Unsupported claim severity: normal | critical.', 'claim-severity'],
    ['Unexpected invalid claim detail.', 'claim-other'],
  ];

  for (const [message, expected] of cases) {
    assert.equal(
      classifyCouncilClaimFailure({ code: 'invalid-claim', message }),
      expected,
    );
  }
  assert.equal(
    classifyCouncilClaimFailure({
      code: 'cross-council-evidence',
      message: 'private detail',
    }),
    null,
  );
});
