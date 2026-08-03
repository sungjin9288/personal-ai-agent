import assert from 'node:assert/strict';
import test from 'node:test';

import { CouncilBlueprintPreviewValidationError } from '../src/core/council-blueprint-preview.mjs';
import { createCouncilConcurrentRetryLineageShadow } from '../src/core/council-concurrent-retry-lineage-shadow.mjs';
import {
  createCouncilConcurrentRetryTerminalityShadow,
  validateCouncilConcurrentRetryTerminalitySourceForTest,
} from '../src/core/council-concurrent-retry-terminality-shadow.mjs';

const TRIAD_STAGES = [
  'opening:research', 'opening:implementation', 'opening:verification',
  'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification',
  'chair:synthesis', 'reviewer:review',
];

function completion(stageId, outcome = 'completed', attemptNumber = 1) {
  return { attemptId: `attempt:${stageId}:${attemptNumber}`, outcome, stageId };
}

function timedOutOpening(siblingOutcomes = ['completed', 'completed']) {
  return [
    completion('opening:research', 'timeout'),
    completion('opening:implementation', siblingOutcomes[0]),
    completion('opening:verification', siblingOutcomes[1]),
  ];
}

function projected(stageId, outcome) {
  return completion(stageId, outcome, 2);
}

test('preserves no-event, all-completed, and four through seven seat source states', () => {
  assert.equal(createCouncilConcurrentRetryTerminalityShadow().state, 'awaiting-terminal-outcome');
  assert.equal(createCouncilConcurrentRetryTerminalityShadow({
    completionEvents: TRIAD_STAGES.map((stageId) => completion(stageId)),
  }).state, 'completed-without-retry');

  for (const roleIds of [
    ['research', 'product', 'implementation', 'verification'],
    ['research', 'product', 'architecture', 'implementation', 'security', 'verification', 'operations'],
  ]) {
    assert.equal(createCouncilConcurrentRetryTerminalityShadow({ roleIds }).state, 'outside-synthetic-envelope');
  }
});

test('rejects failed blockers because recoverability evidence is unavailable', () => {
  const result = createCouncilConcurrentRetryTerminalityShadow({
    completionEvents: [completion('opening:research', 'failed')],
    projectedRetryOutcome: projected('opening:research', 'completed'),
  });

  assert.equal(result.state, 'retry-outcome-rejected');
  assert.deepEqual(result.retryTerminality, {
    candidate: null,
    decision: 'keep-retry-disabled',
    projectedRetryOutcome: projected('opening:research', 'completed'),
    reason: 'recoverability-evidence-unavailable',
    sourceAttempt: { attemptId: 'attempt:opening:research:1', attemptNumber: 1, retryCount: 0 },
    status: 'rejected',
  });
});

test('keeps a timeout candidate pending until a hypothetical attempt 2 outcome is supplied', () => {
  const result = createCouncilConcurrentRetryTerminalityShadow({ completionEvents: timedOutOpening() });

  assert.equal(result.state, 'retry-outcome-pending');
  assert.equal(result.retryTerminality.status, 'awaiting-projected-retry-outcome');
  assert.equal(result.retryTerminality.candidate.attemptId, 'attempt:opening:research:2');
});

test('opens the next barrier only after a timeout retry and every sibling completes', () => {
  const result = createCouncilConcurrentRetryTerminalityShadow({
    completionEvents: timedOutOpening(),
    projectedRetryOutcome: projected('opening:research', 'completed'),
  });

  assert.equal(result.state, 'projected-barrier-ready');
  assert.deepEqual(result.retryTerminality.nextBarrier, {
    readyStageIds: ['rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification'],
    state: 'projected-ready',
    waveId: 'rebuttal',
  });
});

test('keeps the barrier blocked when a retry sibling remains failed or timed out', () => {
  for (const siblingOutcomes of [['failed', 'completed'], ['completed', 'timeout']]) {
    const result = createCouncilConcurrentRetryTerminalityShadow({
      completionEvents: timedOutOpening(siblingOutcomes),
      projectedRetryOutcome: projected('opening:research', 'completed'),
    });
    assert.equal(result.state, 'projected-barrier-blocked');
    assert.equal(result.retryTerminality.nextBarrier.state, 'blocked');
    assert.equal(result.retryTerminality.nextBarrier.blockedBy, 'sibling-terminal-blocker');
  }
});

test('keeps the barrier blocked while a retry sibling is still pending', () => {
  const result = createCouncilConcurrentRetryTerminalityShadow({
    completionEvents: [completion('opening:research', 'timeout'), completion('opening:implementation')],
    projectedRetryOutcome: projected('opening:research', 'completed'),
  });

  assert.equal(result.state, 'projected-barrier-blocked');
  assert.equal(result.retryTerminality.nextBarrier.blockedBy, 'sibling-completion-pending');
});

test('completes the projection when a reviewer timeout retry completes', () => {
  const result = createCouncilConcurrentRetryTerminalityShadow({
    completionEvents: [...TRIAD_STAGES.slice(0, -1).map((stageId) => completion(stageId)), completion('reviewer:review', 'timeout')],
    projectedRetryOutcome: projected('reviewer:review', 'completed'),
  });

  assert.equal(result.state, 'projection-complete');
  assert.equal(result.retryTerminality.status, 'projection-complete');
  assert.equal(result.retryTerminality.nextBarrier, null);
});

test('treats failed and timed out projected attempt 2 outcomes as terminally exhausted', () => {
  for (const outcome of ['failed', 'timeout']) {
    const result = createCouncilConcurrentRetryTerminalityShadow({
      completionEvents: timedOutOpening(),
      projectedRetryOutcome: projected('opening:research', outcome),
    });
    assert.equal(result.state, 'retry-exhausted');
    assert.equal(result.retryTerminality.status, 'retry-exhausted');
    assert.equal('attempt3' in result.retryTerminality, false);
  }
});

test('canonicalizes same-wave input permutations before terminality projection', () => {
  const left = createCouncilConcurrentRetryTerminalityShadow({
    completionEvents: timedOutOpening(),
    projectedRetryOutcome: projected('opening:research', 'completed'),
  });
  const right = createCouncilConcurrentRetryTerminalityShadow({
    completionEvents: [completion('opening:verification'), completion('opening:research', 'timeout'), completion('opening:implementation')],
    projectedRetryOutcome: projected('opening:research', 'completed'),
  });
  assert.deepEqual(left, right);
});

test('rejects malformed and stale projected retry outcomes', () => {
  const invalidOutcomes = [
    { attemptId: 'attempt:opening:research:2', outcome: 'completed', stageId: 'opening:research', extra: true },
    projected('opening:research', 'unknown'),
    completion('opening:research', 'completed', 3),
    projected('opening:implementation', 'completed'),
  ];
  for (const projectedRetryOutcome of invalidOutcomes) {
    assert.throws(
      () => createCouncilConcurrentRetryTerminalityShadow({ completionEvents: timedOutOpening(), projectedRetryOutcome }),
      CouncilBlueprintPreviewValidationError,
    );
  }
});

test('rejects a projected retry outcome when no retry candidate exists', () => {
  for (const input of [
    {},
    { completionEvents: TRIAD_STAGES.map((stageId) => completion(stageId)) },
    { roleIds: ['research', 'product', 'implementation', 'verification'] },
  ]) {
    assert.throws(
      () => createCouncilConcurrentRetryTerminalityShadow({
        ...input,
        projectedRetryOutcome: projected('opening:research', 'completed'),
      }),
      /projected-retry-outcome-without-candidate/,
    );
  }
});

test('rejects a tampered v1.1d source through its narrow validation seam', () => {
  const source = createCouncilConcurrentRetryLineageShadow({ completionEvents: timedOutOpening() });
  source.sourceBinding.completionDigest = 'sha256:tampered';
  assert.throws(
    () => validateCouncilConcurrentRetryTerminalitySourceForTest(source),
    /retry-lineage-source-integrity-mismatch/,
  );
});

test('keeps every execution count at zero', () => {
  const result = createCouncilConcurrentRetryTerminalityShadow({
    completionEvents: timedOutOpening(),
    projectedRetryOutcome: projected('opening:research', 'completed'),
  });
  assert.equal(result.actualRetryAuthorized, false);
  assert.equal(result.actualRetryExecuted, false);
  assert.equal(result.actualConcurrentDispatchQualified, false);
  assert.equal(Object.values(result.executionCounts).every((count) => count === 0), true);
});
