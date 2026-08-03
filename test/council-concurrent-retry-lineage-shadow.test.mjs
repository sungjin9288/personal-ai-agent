import assert from 'node:assert/strict';
import test from 'node:test';

import { CouncilBlueprintPreviewValidationError } from '../src/core/council-blueprint-preview.mjs';
import { createCouncilConcurrentEnvelopeShadow } from '../src/core/council-concurrent-envelope-shadow.mjs';
import {
  createCouncilConcurrentRetryLineageShadow,
  validateCouncilConcurrentRetryLineageSourcesForTest,
} from '../src/core/council-concurrent-retry-lineage-shadow.mjs';
import { createCouncilConcurrentScheduleShadow } from '../src/core/council-concurrent-schedule-shadow.mjs';

const TRIAD_STAGES = [
  'opening:research',
  'opening:implementation',
  'opening:verification',
  'rebuttal:research',
  'rebuttal:implementation',
  'rebuttal:verification',
  'chair:synthesis',
  'reviewer:review',
];

function completion(stageId, outcome = 'completed') {
  return { attemptId: `attempt:${stageId}:1`, outcome, stageId };
}

test('retry lineage awaits a terminal outcome without opening retry authority', () => {
  const result = createCouncilConcurrentRetryLineageShadow();

  assert.equal(result.contractVersion, 'council-concurrent-retry-lineage-shadow-v1.1d');
  assert.equal(result.state, 'awaiting-terminal-outcome');
  assert.equal(result.retryLineage, null);
  assert.equal(result.actualRetryAuthorized, false);
  assert.equal(result.actualRetryExecuted, false);
  assert.equal(result.actualConcurrentDispatchQualified, false);
  assert.equal(result.retryDecision, 'keep-retry-disabled');
  assert.equal(result.decision, 'keep-dispatch-disabled');
  assert.equal(result.c13Boundary, 'keep-stub-only');
  assert.equal(result.productionReadyClaim, false);
  assert.equal(Object.values(result.executionCounts).every((count) => count === 0), true);
  assert.match(result.sourceBinding.completionDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.sourceBinding.schedule.contentDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.sourceBinding.envelope.contentDigest, /^sha256:[a-f0-9]{64}$/);
  assert.match(result.sourceBinding.envelope.scheduleContentDigest, /^sha256:[a-f0-9]{64}$/);
  assert.deepEqual(result.sourceBinding.selectedRoleIds, ['research', 'implementation', 'verification']);
});

test('retry lineage keeps partial success awaiting and preserves the upstream completion projection', () => {
  const completionEvents = TRIAD_STAGES.slice(0, 3).map((stageId) => completion(stageId));
  const result = createCouncilConcurrentRetryLineageShadow({ completionEvents });
  const upstream = createCouncilConcurrentScheduleShadow({ completionEvents });

  assert.equal(result.state, 'awaiting-terminal-outcome');
  assert.equal(result.retryLineage, null);
  assert.deepEqual(result.completionProjection, upstream.completionProjection);
  assert.deepEqual(result.completionProjection.readyStageIds, TRIAD_STAGES.slice(3, 6));
});

test('retry lineage completes without a retry when every canonical stage completes', () => {
  const result = createCouncilConcurrentRetryLineageShadow({
    completionEvents: TRIAD_STAGES.map((stageId) => completion(stageId)),
  });

  assert.equal(result.state, 'completed-without-retry');
  assert.equal(result.retryLineage, null);
  assert.equal(result.completionProjection.overallStatus, 'completed');
});

test('retry lineage projects exactly one failed or timed-out canonical blocker', () => {
  const failed = createCouncilConcurrentRetryLineageShadow({
    completionEvents: [
      completion('opening:research', 'failed'),
      completion('opening:implementation'),
      completion('opening:verification', 'timeout'),
    ],
  });
  const timedOut = createCouncilConcurrentRetryLineageShadow({
    completionEvents: [
      ...TRIAD_STAGES.slice(0, 3).map((stageId) => completion(stageId)),
      completion('rebuttal:research', 'timeout'),
    ],
  });

  assert.equal(failed.state, 'retry-lineage-projected');
  assert.deepEqual(failed.retryLineage, {
    parentAttempt: { attemptId: 'attempt:opening:research:1', attemptNumber: 1, retryCount: 0 },
    projectedAttempt: { attemptId: 'attempt:opening:research:2', attemptNumber: 2, retryCount: 1 },
    stageId: 'opening:research',
    state: 'projection-only-not-authorized',
    triggerOutcome: 'failed',
    waveId: 'opening',
  });
  assert.deepEqual(timedOut.retryLineage, {
    parentAttempt: { attemptId: 'attempt:rebuttal:research:1', attemptNumber: 1, retryCount: 0 },
    projectedAttempt: { attemptId: 'attempt:rebuttal:research:2', attemptNumber: 2, retryCount: 1 },
    stageId: 'rebuttal:research',
    state: 'projection-only-not-authorized',
    triggerOutcome: 'timeout',
    waveId: 'rebuttal',
  });
});

test('retry lineage canonicalizes same-wave event permutations and chooses the first canonical blocker', () => {
  const left = createCouncilConcurrentRetryLineageShadow({
    completionEvents: [
      completion('opening:verification', 'timeout'),
      completion('opening:implementation'),
      completion('opening:research', 'failed'),
    ],
  });
  const right = createCouncilConcurrentRetryLineageShadow({
    completionEvents: [
      completion('opening:research', 'failed'),
      completion('opening:verification', 'timeout'),
      completion('opening:implementation'),
    ],
  });

  assert.deepEqual(left, right);
  assert.equal(left.sourceBinding.completionDigest, right.sourceBinding.completionDigest);
  assert.equal(left.retryLineage.stageId, 'opening:research');
  assert.equal(left.retryLineage.triggerOutcome, 'failed');
});

test('retry lineage retains v1.1b fail-closed event validation', () => {
  const invalidCases = [
    [{ stageId: 'opening:unknown', attemptId: 'attempt:opening:unknown:1', outcome: 'completed' }],
    [{ stageId: 'opening:research', attemptId: 'attempt:opening:research:2', outcome: 'completed' }],
    [completion('opening:research'), completion('opening:research')],
    [completion('rebuttal:research')],
    [completion('opening:research', 'failed'), completion('rebuttal:research')],
  ];

  for (const completionEvents of invalidCases) {
    assert.throws(
      () => createCouncilConcurrentRetryLineageShadow({ completionEvents }),
      CouncilBlueprintPreviewValidationError,
    );
  }
});

test('retry lineage rejects a tampered v1.1b or v1.1c source through its narrow validation seam', () => {
  const scheduleShadow = createCouncilConcurrentScheduleShadow({});
  const envelopeShadow = createCouncilConcurrentEnvelopeShadow({});
  scheduleShadow.schedule.stages[0].attemptNumber = 2;
  assert.throws(
    () => validateCouncilConcurrentRetryLineageSourcesForTest({ scheduleShadow, envelopeShadow }),
    /schedule-source-integrity-mismatch/,
  );

  const cleanSchedule = createCouncilConcurrentScheduleShadow({});
  const tamperedEnvelope = createCouncilConcurrentEnvelopeShadow({});
  tamperedEnvelope.syntheticEnvelope.waveLatencyTicks = 5;
  assert.throws(
    () => validateCouncilConcurrentRetryLineageSourcesForTest({ scheduleShadow: cleanSchedule, envelopeShadow: tamperedEnvelope }),
    /envelope-source-integrity-mismatch/,
  );
});

test('retry lineage retains the four through seven seat envelope denial without projecting a retry', () => {
  for (const roleIds of [
    ['research', 'product', 'implementation', 'verification'],
    ['research', 'product', 'architecture', 'implementation', 'security', 'verification', 'operations'],
  ]) {
    const result = createCouncilConcurrentRetryLineageShadow({
      completionEvents: [completion(`opening:${roleIds[0]}`, 'failed')],
      roleIds,
    });
    assert.equal(result.state, 'outside-synthetic-envelope');
    assert.equal(result.retryLineage, null);
    assert.equal(result.retryDecision, 'keep-retry-disabled');
    assert.equal(result.decision, 'keep-dispatch-disabled');
  }
});
