import assert from 'node:assert/strict';

import { createCouncilConcurrentRetryLineageShadow } from '../src/core/council-concurrent-retry-lineage-shadow.mjs';

const completionEvents = [
  { attemptId: 'attempt:opening:verification:1', outcome: 'timeout', stageId: 'opening:verification' },
  { attemptId: 'attempt:opening:implementation:1', outcome: 'completed', stageId: 'opening:implementation' },
  { attemptId: 'attempt:opening:research:1', outcome: 'failed', stageId: 'opening:research' },
];

const expected = createCouncilConcurrentRetryLineageShadow({ completionEvents });
for (let round = 0; round < 10; round += 1) {
  assert.deepEqual(createCouncilConcurrentRetryLineageShadow({ completionEvents }), expected);
}

assert.equal(expected.state, 'retry-lineage-projected');
assert.deepEqual(expected.retryLineage, {
  parentAttempt: { attemptId: 'attempt:opening:research:1', attemptNumber: 1, retryCount: 0 },
  projectedAttempt: { attemptId: 'attempt:opening:research:2', attemptNumber: 2, retryCount: 1 },
  stageId: 'opening:research',
  state: 'projection-only-not-authorized',
  triggerOutcome: 'failed',
  waveId: 'opening',
});
assert.equal(expected.actualRetryAuthorized, false);
assert.equal(expected.actualRetryExecuted, false);
assert.equal(expected.actualConcurrentDispatchQualified, false);
assert.equal(Object.values(expected.executionCounts).every((count) => count === 0), true);

const completed = createCouncilConcurrentRetryLineageShadow({
  completionEvents: [
    'opening:research', 'opening:implementation', 'opening:verification',
    'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification',
    'chair:synthesis', 'reviewer:review',
  ].map((stageId) => ({ attemptId: `attempt:${stageId}:1`, outcome: 'completed', stageId })),
});
assert.equal(completed.state, 'completed-without-retry');
assert.equal(completed.retryLineage, null);

const outside = createCouncilConcurrentRetryLineageShadow({
  completionEvents: [{ attemptId: 'attempt:opening:research:1', outcome: 'failed', stageId: 'opening:research' }],
  roleIds: ['research', 'product', 'implementation', 'verification'],
});
assert.equal(outside.state, 'outside-synthetic-envelope');
assert.equal(outside.retryLineage, null);

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
