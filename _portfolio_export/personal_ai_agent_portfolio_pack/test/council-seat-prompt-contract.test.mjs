import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertCouncilSeatTargetBinding,
  getCouncilSeatPromptProfileId,
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
