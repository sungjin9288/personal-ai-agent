import assert from 'node:assert/strict';

import { createCouncilConcurrentRetryTerminalityShadow } from '../src/core/council-concurrent-retry-terminality-shadow.mjs';

const completionEvents = [
  { attemptId: 'attempt:opening:verification:1', outcome: 'completed', stageId: 'opening:verification' },
  { attemptId: 'attempt:opening:research:1', outcome: 'timeout', stageId: 'opening:research' },
  { attemptId: 'attempt:opening:implementation:1', outcome: 'completed', stageId: 'opening:implementation' },
];
const projectedRetryOutcome = {
  attemptId: 'attempt:opening:research:2',
  outcome: 'completed',
  stageId: 'opening:research',
};

const expected = createCouncilConcurrentRetryTerminalityShadow({ completionEvents, projectedRetryOutcome });
for (let round = 0; round < 10; round += 1) {
  assert.deepEqual(createCouncilConcurrentRetryTerminalityShadow({ completionEvents, projectedRetryOutcome }), expected);
}

assert.equal(expected.state, 'projected-barrier-ready');
assert.deepEqual(expected.retryTerminality.nextBarrier, {
  readyStageIds: ['rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification'],
  state: 'projected-ready',
  waveId: 'rebuttal',
});
assert.equal(expected.actualRetryAuthorized, false);
assert.equal(expected.actualRetryExecuted, false);
assert.equal(expected.actualConcurrentDispatchQualified, false);
assert.equal(Object.values(expected.executionCounts).every((count) => count === 0), true);

console.log(JSON.stringify({
  actualConcurrentDispatches: 0,
  actualRetries: 0,
  deterministicReplays: 10,
  filesystemWrites: 0,
  networkCalls: 0,
  providerCalls: 0,
  status: 'passed',
  storeWrites: 0,
}));
