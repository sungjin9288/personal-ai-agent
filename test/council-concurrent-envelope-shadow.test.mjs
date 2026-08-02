import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { CouncilBlueprintPreviewValidationError } from '../src/core/council-blueprint-preview.mjs';
import {
  createCouncilConcurrentEnvelopeShadow,
  validateCouncilConcurrentEnvelopeSourceForTest,
} from '../src/core/council-concurrent-envelope-shadow.mjs';
import { createCouncilConcurrentScheduleShadow } from '../src/core/council-concurrent-schedule-shadow.mjs';

test('concurrent envelope derives fixed structural cost units from the v1.1b triad schedule', () => {
  const result = createCouncilConcurrentEnvelopeShadow({ roleIds: ['verification', 'research', 'implementation'] });

  assert.equal(result.contractVersion, 'council-concurrent-envelope-shadow-v1.1c');
  assert.deepEqual(result.selectedRoleIds, ['research', 'implementation', 'verification']);
  assert.deepEqual(result.syntheticCostModel, {
    durationUnit: 'synthetic-tick',
    id: 'unit-cost-structural-v1',
    resourceUnit: 'synthetic-slot',
  });
  assert.deepEqual(result.syntheticEnvelope, {
    maxParallelism: 3,
    sequentialLatencyTicks: 8,
    sequentialPeakResourceUnits: 1,
    waveLatencyTicks: 4,
    wavePeakResourceUnits: 3,
    waves: [
      { latencyTicks: 1, resourceUnits: 3, stageIds: ['opening:research', 'opening:implementation', 'opening:verification'], waveId: 'opening' },
      { latencyTicks: 1, resourceUnits: 3, stageIds: ['rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification'], waveId: 'rebuttal' },
      { latencyTicks: 1, resourceUnits: 1, stageIds: ['chair:synthesis'], waveId: 'chair' },
      { latencyTicks: 1, resourceUnits: 1, stageIds: ['reviewer:review'], waveId: 'reviewer' },
    ],
  });
  assert.deepEqual(result.safetyEnvelope, {
    failureCodes: [],
    maxConcurrentStages: 3,
    maxWaveLatencyTicks: 4,
    maxWaveResourceUnits: 3,
    result: 'within-default-synthetic-envelope',
  });
  assert.equal(result.scheduleBinding.sourceContractVersion, 'council-concurrent-schedule-shadow-v1.1b');
  assert.match(result.scheduleBinding.contentDigest, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.scheduleBinding.stageIds.length, 8);
  assert.equal(result.scheduleBinding.attempts.every((attempt) => attempt.attemptId === `attempt:${attempt.stageId}:1` && attempt.attemptNumber === 1 && attempt.retryCount === 0), true);
  assert.equal(result.actualMeasurements, false);
  assert.equal(result.actualResourceMeasured, false);
  assert.equal(result.actualLatencyMeasured, false);
  assert.equal(result.actualConcurrentDispatchQualified, false);
  assert.equal(result.decision, 'keep-dispatch-disabled');
  assert.deepEqual(result.executionCounts, {
    c13EvaluatorCalls: 0,
    concurrentWorkers: 0,
    externalProviderCalls: 0,
    modelCalls: 0,
    modelDownloads: 0,
    networkCalls: 0,
  });
  assert.equal(result.c13Boundary, 'keep-stub-only');
  assert.equal(result.productionReadyClaim, false);
});

test('concurrent envelope returns a closed bounded result for four through seven specialists', () => {
  for (const roleIds of [
    ['research', 'product', 'implementation', 'verification'],
    ['research', 'product', 'architecture', 'implementation', 'verification'],
    ['research', 'product', 'architecture', 'implementation', 'security', 'verification'],
    ['research', 'product', 'architecture', 'implementation', 'security', 'verification', 'operations'],
  ]) {
    const result = createCouncilConcurrentEnvelopeShadow({ roleIds });
    assert.equal(result.safetyEnvelope.result, 'outside-default-synthetic-envelope');
    assert.deepEqual(result.safetyEnvelope.failureCodes, ['parallelism-envelope-exceeded', 'resource-envelope-exceeded']);
    assert.equal(result.decision, 'keep-dispatch-disabled');
    assert.equal(result.actualConcurrentDispatchQualified, false);
  }
});

test('concurrent envelope fails closed when a v1.1b stage moves to the wrong or empty wave', () => {
  const reassigned = createCouncilConcurrentScheduleShadow({ roleIds: ['research', 'implementation', 'verification'] });
  reassigned.schedule.waves[0].stageIds = reassigned.schedule.waves[0].stageIds.slice(1);
  reassigned.schedule.waves[1].stageIds = ['opening:research', ...reassigned.schedule.waves[1].stageIds];
  assert.throws(
    () => validateCouncilConcurrentEnvelopeSourceForTest(reassigned),
    /schedule-integrity-mismatch/,
  );

  const emptyWave = createCouncilConcurrentScheduleShadow({ roleIds: ['research', 'implementation', 'verification'] });
  emptyWave.schedule.waves[2].stageIds = [];
  assert.throws(
    () => validateCouncilConcurrentEnvelopeSourceForTest(emptyWave),
    /stage-set-mismatch|schedule-integrity-mismatch/,
  );
});

test('concurrent envelope rejects every non-canonical v1.1b schedule field', () => {
  const mutations = [
    (source) => { source.schedule.stageCount += 1; },
    (source) => { source.schedule.waveCount += 1; },
    (source) => { source.schedule.label = 'measured-runtime'; },
    (source) => { source.schedule.stages[0].onDependencyFailure = 'continue'; },
    (source) => {
      const researchRebuttal = source.schedule.stages.find(
        (stage) => stage.id === 'rebuttal:research',
      );
      researchRebuttal.targetRoleId = 'verification';
    },
    (source) => { source.selectedRoleIds = [...source.selectedRoleIds].reverse(); },
  ];

  for (const mutate of mutations) {
    const source = createCouncilConcurrentScheduleShadow({
      roleIds: ['research', 'implementation', 'verification'],
    });
    mutate(source);
    assert.throws(
      () => validateCouncilConcurrentEnvelopeSourceForTest(source),
      /schedule-integrity-mismatch/,
    );
  }
});

test('concurrent envelope preserves the v1.1a role validation boundary', () => {
  assert.throws(
    () => createCouncilConcurrentEnvelopeShadow({ roleIds: ['research', 'research', 'verification'] }),
    CouncilBlueprintPreviewValidationError,
  );
});

test('concurrent envelope CLI accepts only existing role input and remains root-free', () => {
  const result = spawnSync(process.execPath, [
    'src/cli.mjs', 'council', 'concurrent-envelope-shadow',
    '--role', 'research', '--role', 'implementation', '--role', 'verification',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).syntheticEnvelope.waveLatencyTicks, 4);
});
