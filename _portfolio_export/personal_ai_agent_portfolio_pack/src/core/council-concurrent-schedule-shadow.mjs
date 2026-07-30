import {
  CouncilBlueprintPreviewValidationError,
  buildCouncilBlueprintMeetingPlan,
  getCouncilBlueprintCatalog,
  normalizeCouncilBlueprintRoleIds,
} from './council-blueprint-preview.mjs';

const DEFAULT_ROLE_IDS = ['research', 'implementation', 'verification'];
const WAVE_IDS = ['opening', 'rebuttal', 'chair', 'reviewer'];
const TERMINAL_OUTCOMES = new Set(['completed', 'failed', 'timeout']);

function invalid(message) {
  throw new CouncilBlueprintPreviewValidationError(`council-concurrent-schedule-shadow: ${message}`);
}

function buildSchedule(meetingPlan) {
  const stages = meetingPlan.stages.map((stage) => ({
    ...stage,
    attemptId: `attempt:${stage.id}:1`,
    attemptNumber: 1,
    retryCount: 0,
  }));
  const waves = WAVE_IDS.map((id) => ({
    barrier: 'all-completed',
    id,
    stageIds: stages.filter((stage) => waveIdForStage(stage) === id).map((stage) => stage.id),
  }));

  return {
    actualConcurrentDispatch: false,
    label: 'synthetic-read-only',
    stageCount: stages.length,
    stages,
    waveCount: waves.length,
    waves,
  };
}

function waveIdForStage(stage) {
  if (stage.kind === 'opening') return 'opening';
  if (stage.kind === 'rebuttal') return 'rebuttal';
  if (stage.roleId === 'chair') return 'chair';
  return 'reviewer';
}

function normalizeCompletionEvents(schedule, completionEvents) {
  if (!Array.isArray(completionEvents)) {
    invalid('completionEvents must be an array of stageId, attemptId, and outcome records.');
  }

  const stageById = new Map(schedule.stages.map((stage) => [stage.id, stage]));
  const waveIndexByStageId = new Map(
    schedule.waves.flatMap((wave, waveIndex) => wave.stageIds.map((stageId) => [stageId, waveIndex])),
  );
  const outcomesByStageId = new Map();
  let blockedFromWaveIndex = null;

  for (const event of completionEvents) {
    if (!event || typeof event !== 'object' || Array.isArray(event) || Object.keys(event).sort().join(',') !== 'attemptId,outcome,stageId') {
      invalid('completion events must contain exactly stageId, attemptId, and outcome.');
    }

    const stageId = String(event.stageId || '').trim();
    const attemptId = String(event.attemptId || '').trim();
    const outcome = String(event.outcome || '').trim();
    const stage = stageById.get(stageId);
    if (!stage) invalid(`unknown stageId: ${stageId || '(empty)'}.`);
    if (attemptId !== stage.attemptId) invalid(`stale attemptId for ${stageId}.`);
    if (!TERMINAL_OUTCOMES.has(outcome)) invalid(`unknown outcome for ${stageId}.`);
    if (outcomesByStageId.has(stageId)) invalid(`duplicate completion event for ${stageId}.`);

    const waveIndex = waveIndexByStageId.get(stageId);
    if (blockedFromWaveIndex !== null && waveIndex > blockedFromWaveIndex) {
      invalid(`event after blocked barrier for ${stageId}.`);
    }
    for (let index = 0; index < waveIndex; index += 1) {
      const previousWave = schedule.waves[index];
      if (!previousWave.stageIds.every((id) => outcomesByStageId.get(id) === 'completed')) {
        invalid(`event before all-completed barrier for ${stageId}.`);
      }
    }

    outcomesByStageId.set(stageId, outcome);
    if (outcome !== 'completed' && blockedFromWaveIndex === null) {
      blockedFromWaveIndex = waveIndex;
    }
  }

  const stageOrder = new Map(schedule.stages.map((stage, index) => [stage.id, index]));
  return [...outcomesByStageId]
    .map(([stageId, outcome]) => ({ attemptId: stageById.get(stageId).attemptId, outcome, stageId }))
    .sort((left, right) => stageOrder.get(left.stageId) - stageOrder.get(right.stageId));
}

function projectCompletion(schedule, completionEvents) {
  const events = normalizeCompletionEvents(schedule, completionEvents);
  const outcomeByStageId = new Map(events.map((event) => [event.stageId, event.outcome]));
  const waveStatusById = new Map();
  const stageStatusById = new Map();
  let barrierBlocked = false;
  let barrierOpen = true;

  for (const wave of schedule.waves) {
    const outcomes = wave.stageIds.map((stageId) => outcomeByStageId.get(stageId) || null);
    const hasFailure = outcomes.some((outcome) => outcome === 'failed' || outcome === 'timeout');
    const allCompleted = outcomes.every((outcome) => outcome === 'completed');
    const someTerminal = outcomes.some(Boolean);
    let status;

    if (barrierBlocked) {
      status = 'blocked';
      wave.stageIds.forEach((stageId) => stageStatusById.set(stageId, 'dependency-blocked'));
    } else if (hasFailure) {
      status = 'blocked';
      wave.stageIds.forEach((stageId) => stageStatusById.set(stageId, stageStatusForOutcome(outcomeByStageId.get(stageId))));
      barrierBlocked = true;
    } else if (allCompleted) {
      status = 'completed';
      wave.stageIds.forEach((stageId) => stageStatusById.set(stageId, 'completed'));
      barrierOpen = true;
    } else if (barrierOpen) {
      status = someTerminal ? 'in-progress' : 'ready';
      wave.stageIds.forEach((stageId) => stageStatusById.set(stageId, outcomeByStageId.get(stageId) || 'ready'));
      barrierOpen = false;
    } else {
      status = 'waiting';
      wave.stageIds.forEach((stageId) => stageStatusById.set(stageId, 'waiting'));
    }
    waveStatusById.set(wave.id, status);
  }

  const stages = schedule.stages.map((stage) => ({
    ...stage,
    outcome: outcomeByStageId.get(stage.id) || null,
    status: stageStatusById.get(stage.id),
  }));
  const readyStageIds = stages.filter((stage) => stage.status === 'ready').map((stage) => stage.id);
  const waves = schedule.waves.map((wave) => ({ ...wave, status: waveStatusById.get(wave.id) }));
  const overallStatus = barrierBlocked
    ? 'blocked'
    : waves.every((wave) => wave.status === 'completed')
      ? 'completed'
      : waves.some((wave) => wave.status === 'in-progress')
        ? 'in-progress'
        : 'ready';

  const firstBlocker = events.find((event) => event.outcome !== 'completed') || null;
  return {
    blocker: firstBlocker && {
      outcome: firstBlocker.outcome,
      stageId: firstBlocker.stageId,
      waveId: waveIdForStage(schedule.stages.find((stage) => stage.id === firstBlocker.stageId)),
    },
    completionEvents: events,
    overallStatus,
    readyStageIds,
    stages,
    waves,
  };
}

export function createCouncilConcurrentScheduleShadow({ roleIds = DEFAULT_ROLE_IDS, completionEvents = [] } = {}) {
  const selectedRoleIds = normalizeCouncilBlueprintRoleIds(roleIds);
  const authority = getCouncilBlueprintCatalog().authority;
  const meetingPlan = buildCouncilBlueprintMeetingPlan(selectedRoleIds);
  const schedule = buildSchedule(meetingPlan);
  const sequentialBaseline = { authority: getCouncilBlueprintCatalog().authority, meetingPlan };
  return {
    authority,
    c13Boundary: 'keep-stub-only',
    completionProjection: projectCompletion(schedule, completionEvents),
    contractVersion: 'council-concurrent-schedule-shadow-v1.1b',
    productionReadyClaim: false,
    parity: buildParity({ authority, meetingPlan, schedule, sequentialBaseline }),
    schedule,
    sequentialBaseline,
    selectedRoleIds,
  };
}

function stageStatusForOutcome(outcome) {
  if (outcome === 'timeout') return 'timed-out';
  if (outcome === 'failed') return 'failed';
  if (outcome === 'completed') return 'completed';
  return 'ready';
}

function buildParity({ authority, meetingPlan, schedule, sequentialBaseline }) {
  const baselineStages = meetingPlan.stages;
  const scheduleStages = schedule.stages;
  const stageIdsEqual = JSON.stringify(baselineStages.map((stage) => stage.id)) === JSON.stringify(scheduleStages.map((stage) => stage.id));
  const dependenciesEqual = JSON.stringify(baselineStages.map((stage) => stage.dependsOn)) === JSON.stringify(scheduleStages.map((stage) => stage.dependsOn));
  const authorityEqual = JSON.stringify(authority) === JSON.stringify(sequentialBaseline.authority);
  return {
    authorityEqual,
    dependenciesEqual,
    matchesSequentialBaseline: authorityEqual && dependenciesEqual && stageIdsEqual,
    stageIdsEqual,
  };
}
