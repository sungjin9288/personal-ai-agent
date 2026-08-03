import { createHash } from 'node:crypto';

import {
  CouncilBlueprintPreviewValidationError,
  getCouncilBlueprintCatalog,
} from './council-blueprint-preview.mjs';
import { createCouncilConcurrentScheduleShadow } from './council-concurrent-schedule-shadow.mjs';

const DEFAULT_ROLE_IDS = ['research', 'implementation', 'verification'];
const WAVE_IDS = ['opening', 'rebuttal', 'chair', 'reviewer'];
const SYNTHETIC_COST_MODEL = {
  durationUnit: 'synthetic-tick',
  id: 'unit-cost-structural-v1',
  resourceUnit: 'synthetic-slot',
};
const DEFAULT_SAFETY_ENVELOPE = {
  maxConcurrentStages: 3,
  maxWaveLatencyTicks: 4,
  maxWaveResourceUnits: 3,
};

function fail(code) {
  throw new CouncilBlueprintPreviewValidationError(`council-concurrent-envelope-shadow: ${code}.`);
}

function digest(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function exactJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function expectedWaveId(stage) {
  if (stage?.kind === 'opening' && stage.id === `opening:${stage.roleId}`) return 'opening';
  if (stage?.kind === 'rebuttal' && stage.id === `rebuttal:${stage.roleId}`) return 'rebuttal';
  if (stage?.kind === 'synthesis' && stage.id === 'chair:synthesis' && stage.roleId === 'chair') return 'chair';
  if (stage?.kind === 'review' && stage.id === 'reviewer:review' && stage.roleId === 'reviewer') return 'reviewer';
  fail('schedule-contract-drift');
}

function validateScheduleShadow(scheduleShadow) {
  if (scheduleShadow?.contractVersion !== 'council-concurrent-schedule-shadow-v1.1b') fail('schedule-contract-drift');
  if (scheduleShadow?.schedule?.actualConcurrentDispatch !== false || scheduleShadow?.c13Boundary !== 'keep-stub-only' || scheduleShadow?.productionReadyClaim !== false) {
    fail('authority-drift');
  }

  const authority = getCouncilBlueprintCatalog().authority;
  if (!exactJson(scheduleShadow.authority, authority) || !exactJson(scheduleShadow.sequentialBaseline?.authority, authority)) {
    fail('authority-drift');
  }

  const schedule = scheduleShadow.schedule;
  const baselineStages = scheduleShadow.sequentialBaseline?.meetingPlan?.stages;
  if (!Array.isArray(schedule?.stages) || !Array.isArray(schedule?.waves) || !Array.isArray(baselineStages)) {
    fail('schedule-integrity-mismatch');
  }
  if (!exactJson(scheduleShadow.parity, {
    authorityEqual: true,
    dependenciesEqual: true,
    matchesSequentialBaseline: true,
    stageIdsEqual: true,
  })) fail('schedule-integrity-mismatch');

  const stageIds = schedule.stages.map((stage) => stage.id);
  const baselineStageIds = baselineStages.map((stage) => stage.id);
  if (new Set(stageIds).size !== stageIds.length || !exactJson(stageIds, baselineStageIds)) fail('stage-set-mismatch');
  if (!exactJson(schedule.waves.map((wave) => wave.id), WAVE_IDS)) fail('schedule-integrity-mismatch');

  const waveStageIds = schedule.waves.flatMap((wave) => wave.stageIds);
  if (new Set(waveStageIds).size !== waveStageIds.length || !exactJson([...waveStageIds].sort(), [...stageIds].sort())) {
    fail('stage-set-mismatch');
  }
  const expectedStageIdsByWave = new Map(WAVE_IDS.map((waveId) => [waveId, []]));
  for (const stage of schedule.stages) {
    expectedStageIdsByWave.get(expectedWaveId(stage)).push(stage.id);
  }
  for (const wave of schedule.waves) {
    const expectedStageIds = expectedStageIdsByWave.get(wave.id);
    if (!Array.isArray(expectedStageIds) || !expectedStageIds.length || !exactJson(wave.stageIds, expectedStageIds) || wave.barrier !== 'all-completed') {
      fail('schedule-integrity-mismatch');
    }
  }

  for (let index = 0; index < schedule.stages.length; index += 1) {
    const stage = schedule.stages[index];
    const baseline = baselineStages[index];
    if (!exactJson(stage.dependsOn, baseline.dependsOn)) fail('schedule-integrity-mismatch');
    if (stage.attemptId !== `attempt:${stage.id}:1` || stage.attemptNumber !== 1 || stage.retryCount !== 0) {
      fail('attempt-binding-mismatch');
    }
  }

  let canonicalSource;
  try {
    canonicalSource = createCouncilConcurrentScheduleShadow({
      roleIds: scheduleShadow.selectedRoleIds,
    });
  } catch {
    fail('schedule-integrity-mismatch');
  }
  if (!exactJson(scheduleShadow, canonicalSource)) {
    fail('schedule-integrity-mismatch');
  }

  const scheduleContentDigest = digest({
    authority: scheduleShadow.authority,
    contractVersion: scheduleShadow.contractVersion,
    schedule,
    selectedRoleIds: scheduleShadow.selectedRoleIds,
  });

  return { baselineStages, schedule, scheduleContentDigest };
}

// This test-only seam validates an already-built v1.1b projection without
// adding alternate CLI, HTTP, or public role input.
export function validateCouncilConcurrentEnvelopeSourceForTest(scheduleShadow) {
  return validateScheduleShadow(scheduleShadow);
}

function buildStageCosts(stages) {
  const costs = new Map();
  for (const stage of stages) {
    if (costs.has(stage.id)) fail('duplicate-stage-cost');
    const cost = { duration: 1, resource: 1, stageId: stage.id };
    if (!Number.isSafeInteger(cost.duration) || !Number.isSafeInteger(cost.resource) || cost.duration <= 0 || cost.resource <= 0) {
      fail('invalid-synthetic-unit');
    }
    costs.set(stage.id, cost);
  }
  return costs;
}

function add(left, right) {
  const result = left + right;
  if (!Number.isSafeInteger(result)) fail('integer-overflow');
  return result;
}

function buildEnvelope(schedule, costs) {
  let sequentialLatencyTicks = 0;
  let sequentialPeakResourceUnits = 0;
  for (const stage of schedule.stages) {
    const cost = costs.get(stage.id);
    if (!cost) fail('unknown-stage-cost');
    sequentialLatencyTicks = add(sequentialLatencyTicks, cost.duration);
    sequentialPeakResourceUnits = Math.max(sequentialPeakResourceUnits, cost.resource);
  }

  let waveLatencyTicks = 0;
  let wavePeakResourceUnits = 0;
  let maxParallelism = 0;
  const waves = schedule.waves.map((wave) => {
    let latencyTicks = 0;
    let resourceUnits = 0;
    for (const stageId of wave.stageIds) {
      const cost = costs.get(stageId);
      if (!cost) fail('unknown-stage-cost');
      latencyTicks = Math.max(latencyTicks, cost.duration);
      resourceUnits = add(resourceUnits, cost.resource);
    }
    waveLatencyTicks = add(waveLatencyTicks, latencyTicks);
    wavePeakResourceUnits = Math.max(wavePeakResourceUnits, resourceUnits);
    maxParallelism = Math.max(maxParallelism, wave.stageIds.length);
    return { latencyTicks, resourceUnits, stageIds: [...wave.stageIds], waveId: wave.id };
  });

  return {
    maxParallelism,
    sequentialLatencyTicks,
    sequentialPeakResourceUnits,
    waveLatencyTicks,
    wavePeakResourceUnits,
    waves,
  };
}

function evaluateSafetyEnvelope(envelope) {
  const failureCodes = [];
  if (envelope.maxParallelism > DEFAULT_SAFETY_ENVELOPE.maxConcurrentStages) failureCodes.push('parallelism-envelope-exceeded');
  if (envelope.wavePeakResourceUnits > DEFAULT_SAFETY_ENVELOPE.maxWaveResourceUnits) failureCodes.push('resource-envelope-exceeded');
  if (envelope.waveLatencyTicks > DEFAULT_SAFETY_ENVELOPE.maxWaveLatencyTicks) failureCodes.push('latency-envelope-exceeded');
  return {
    failureCodes,
    result: failureCodes.length ? 'outside-default-synthetic-envelope' : 'within-default-synthetic-envelope',
  };
}

export function createCouncilConcurrentEnvelopeShadow({ roleIds = DEFAULT_ROLE_IDS } = {}) {
  const scheduleShadow = createCouncilConcurrentScheduleShadow({ roleIds });
  const { baselineStages, schedule, scheduleContentDigest } = validateScheduleShadow(scheduleShadow);
  const costs = buildStageCosts(schedule.stages);
  const envelope = buildEnvelope(schedule, costs);
  const safety = evaluateSafetyEnvelope(envelope);

  return {
    actualConcurrentDispatchQualified: false,
    actualLatencyMeasured: false,
    actualMeasurements: false,
    actualResourceMeasured: false,
    authority: scheduleShadow.authority,
    c13Boundary: 'keep-stub-only',
    contractVersion: 'council-concurrent-envelope-shadow-v1.1c',
    decision: 'keep-dispatch-disabled',
    executionCounts: {
      c13EvaluatorCalls: 0,
      concurrentWorkers: 0,
      externalProviderCalls: 0,
      modelCalls: 0,
      modelDownloads: 0,
      networkCalls: 0,
    },
    productionReadyClaim: false,
    scheduleBinding: {
      attempts: schedule.stages.map(({ attemptId, attemptNumber, id, retryCount }) => ({ attemptId, attemptNumber, retryCount, stageId: id })),
      dependencies: baselineStages.map(({ dependsOn, id }) => ({ dependsOn: [...dependsOn], stageId: id })),
      contentDigest: scheduleContentDigest,
      sourceContractVersion: scheduleShadow.contractVersion,
      stageIds: schedule.stages.map((stage) => stage.id),
    },
    selectedRoleIds: scheduleShadow.selectedRoleIds,
    syntheticCostModel: { ...SYNTHETIC_COST_MODEL },
    syntheticEnvelope: envelope,
    safetyEnvelope: {
      ...DEFAULT_SAFETY_ENVELOPE,
      ...safety,
    },
  };
}
