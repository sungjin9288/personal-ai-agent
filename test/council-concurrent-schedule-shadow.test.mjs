import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { CouncilBlueprintPreviewValidationError } from '../src/core/council-blueprint-preview.mjs';
import { createCouncilConcurrentScheduleShadow } from '../src/core/council-concurrent-schedule-shadow.mjs';

const DEFAULT_ROLES = ['research', 'implementation', 'verification'];

function completion(stageId, outcome = 'completed') {
  return { attemptId: `attempt:${stageId}:1`, outcome, stageId };
}

function completeThrough(stageIds) {
  return stageIds.map((stageId) => completion(stageId));
}

test('concurrent schedule shadow preserves v1.1a plan structure and canonical roles for three and seven specialists', () => {
  const three = createCouncilConcurrentScheduleShadow({ roleIds: ['verification', 'research', 'implementation'] });
  const seven = createCouncilConcurrentScheduleShadow({
    roleIds: ['operations', 'security', 'verification', 'implementation', 'architecture', 'product', 'research'],
  });

  assert.deepEqual(three.selectedRoleIds, DEFAULT_ROLES);
  assert.equal(three.contractVersion, 'council-concurrent-schedule-shadow-v1.1b');
  assert.equal(three.productionReadyClaim, false);
  assert.equal(three.c13Boundary, 'keep-stub-only');
  assert.equal(three.schedule.actualConcurrentDispatch, false);
  assert.equal(three.schedule.label, 'synthetic-read-only');
  assert.deepEqual(three.schedule.waves.map((wave) => wave.id), ['opening', 'rebuttal', 'chair', 'reviewer']);
  assert.equal(three.schedule.waves.every((wave) => wave.barrier === 'all-completed'), true);
  assert.equal(three.schedule.stages.every((stage) => stage.attemptId === `attempt:${stage.id}:1` && stage.attemptNumber === 1 && stage.retryCount === 0), true);
  assert.equal(three.schedule.stageCount, 8);
  assert.equal(seven.schedule.stageCount, 16);
  assert.deepEqual(three.schedule.stages.slice(3, 6).map((stage) => stage.targetRoleId), ['implementation', 'verification', 'research']);
  assert.deepEqual(three.sequentialBaseline.authority, three.authority);
  assert.deepEqual(three.sequentialBaseline.meetingPlan, {
    stageCount: three.schedule.stageCount,
    stages: three.schedule.stages.map(({ attemptId, attemptNumber, retryCount, ...stage }) => stage),
  });
  assert.deepEqual(three.parity, {
    authorityEqual: true,
    dependenciesEqual: true,
    matchesSequentialBaseline: true,
    stageIdsEqual: true,
  });
});

test('concurrent schedule projection canonicalizes same-wave completion ordering and advances all-completed barriers', () => {
  const opening = ['opening:research', 'opening:implementation', 'opening:verification'];
  const rebuttal = ['rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification'];
  const canonical = completeThrough([...opening, ...rebuttal, 'chair:synthesis', 'reviewer:review']);
  const reversedWithinWave = [
    ...completeThrough([...opening].reverse()),
    ...completeThrough([...rebuttal].reverse()),
    completion('chair:synthesis'),
    completion('reviewer:review'),
  ];
  const completed = createCouncilConcurrentScheduleShadow({ completionEvents: canonical });
  const permuted = createCouncilConcurrentScheduleShadow({ completionEvents: reversedWithinWave });

  assert.deepEqual(completed, permuted);
  assert.equal(completed.completionProjection.overallStatus, 'completed');
  assert.deepEqual(completed.completionProjection.readyStageIds, []);

  const openingOnly = createCouncilConcurrentScheduleShadow({ completionEvents: completeThrough(opening) });
  assert.equal(openingOnly.completionProjection.overallStatus, 'ready');
  assert.deepEqual(openingOnly.completionProjection.readyStageIds, rebuttal);
});

test('concurrent schedule projection deep-equals seeded legal same-wave shuffles', () => {
  const waves = [
    ['opening:research', 'opening:implementation', 'opening:verification'],
    ['rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification'],
    ['chair:synthesis'],
    ['reviewer:review'],
  ];
  const expected = createCouncilConcurrentScheduleShadow({ completionEvents: completeThrough(waves.flat()) });

  for (const seed of [1, 7, 73, 992]) {
    const random = createSeededRandom(seed);
    const completionEvents = waves.flatMap((wave) => completeThrough(shuffle(wave, random)));
    assert.deepEqual(createCouncilConcurrentScheduleShadow({ completionEvents }), expected, `seed ${seed}`);
  }
});

test('concurrent schedule failure and timeout block downstream while preserving same-wave terminal outcomes', () => {
  const openingFailure = createCouncilConcurrentScheduleShadow({
    completionEvents: [completion('opening:research', 'failed'), completion('opening:implementation'), completion('opening:verification', 'timeout')],
  });
  const openingById = Object.fromEntries(openingFailure.completionProjection.stages.map((stage) => [stage.id, stage]));
  assert.equal(openingFailure.completionProjection.overallStatus, 'blocked');
  assert.equal(openingById['opening:research'].outcome, 'failed');
  assert.equal(openingById['opening:research'].status, 'failed');
  assert.equal(openingById['opening:implementation'].outcome, 'completed');
  assert.equal(openingById['opening:verification'].outcome, 'timeout');
  assert.equal(openingById['opening:verification'].status, 'timed-out');
  assert.equal(openingById['rebuttal:research'].status, 'dependency-blocked');
  assert.deepEqual(openingFailure.completionProjection.blocker, { outcome: 'failed', stageId: 'opening:research', waveId: 'opening' });

  const rebuttalFailure = createCouncilConcurrentScheduleShadow({
    completionEvents: [...completeThrough(['opening:research', 'opening:implementation', 'opening:verification']), completion('rebuttal:research', 'timeout')],
  });
  const rebuttalById = Object.fromEntries(rebuttalFailure.completionProjection.stages.map((stage) => [stage.id, stage]));
  assert.equal(rebuttalFailure.completionProjection.waves.find((wave) => wave.id === 'chair').status, 'blocked');
  assert.equal(rebuttalById['chair:synthesis'].status, 'dependency-blocked');

  const chairFailure = createCouncilConcurrentScheduleShadow({
    completionEvents: [...completeThrough(['opening:research', 'opening:implementation', 'opening:verification', 'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification']), completion('chair:synthesis', 'failed')],
  });
  const chairById = Object.fromEntries(chairFailure.completionProjection.stages.map((stage) => [stage.id, stage]));
  assert.equal(chairFailure.completionProjection.waves.find((wave) => wave.id === 'reviewer').status, 'blocked');
  assert.equal(chairById['reviewer:review'].status, 'dependency-blocked');

  const reviewerFailure = createCouncilConcurrentScheduleShadow({
    completionEvents: [...completeThrough(['opening:research', 'opening:implementation', 'opening:verification', 'rebuttal:research', 'rebuttal:implementation', 'rebuttal:verification', 'chair:synthesis']), completion('reviewer:review', 'timeout')],
  });
  const reviewerById = Object.fromEntries(reviewerFailure.completionProjection.stages.map((stage) => [stage.id, stage]));
  assert.equal(reviewerById['reviewer:review'].status, 'timed-out');
  assert.deepEqual(reviewerFailure.completionProjection.blocker, { outcome: 'timeout', stageId: 'reviewer:review', waveId: 'reviewer' });
});

test('concurrent schedule CLI rejects a value-less completion event with the stable validation payload', () => {
  const result = spawnSync(process.execPath, ['src/cli.mjs', 'council', 'concurrent-schedule-shadow', '--completion-event'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  assert.equal(result.status, 1);
  assert.deepEqual(JSON.parse(result.stdout), {
    error: 'invalid-council-blueprint-preview',
    message: 'council-concurrent-schedule-shadow: completion events must use stageId|attemptId|outcome.',
  });
});

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const next = Math.floor(random() * (index + 1));
    [result[index], result[next]] = [result[next], result[index]];
  }
  return result;
}

test('concurrent schedule fails closed for invalid, duplicate, stale, blocked, and out-of-order completion events', () => {
  const invalidCases = [
    [{ stageId: 'opening:unknown', attemptId: 'attempt:opening:unknown:1', outcome: 'completed' }],
    [{ stageId: 'opening:research', attemptId: 'attempt:opening:research:2', outcome: 'completed' }],
    [completion('opening:research'), completion('opening:research')],
    [{ stageId: 'opening:research', attemptId: 'attempt:opening:research:1', outcome: 'unknown' }],
    [completion('rebuttal:research')],
    [completion('opening:research', 'failed'), completion('rebuttal:research')],
    [{ ...completion('opening:research'), extra: true }],
  ];

  for (const completionEvents of invalidCases) {
    assert.throws(
      () => createCouncilConcurrentScheduleShadow({ completionEvents }),
      CouncilBlueprintPreviewValidationError,
    );
  }
});
