import { createHash } from 'node:crypto';

import { CouncilBlueprintPreviewValidationError } from './council-blueprint-preview.mjs';
import { createCouncilConcurrentRetryLineageShadow } from './council-concurrent-retry-lineage-shadow.mjs';

const DEFAULT_ROLE_IDS = ['research', 'implementation', 'verification'];
const TERMINAL_OUTCOMES = new Set(['completed', 'failed', 'timeout']);

function fail(code) {
  throw new CouncilBlueprintPreviewValidationError(`council-concurrent-retry-terminality-shadow: ${code}.`);
}

function digest(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function exactJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateRetryLineageSource(retryLineageShadow) {
  if (retryLineageShadow?.contractVersion !== 'council-concurrent-retry-lineage-shadow-v1.1d') {
    fail('retry-lineage-source-contract-drift');
  }

  let canonicalSource;
  try {
    canonicalSource = createCouncilConcurrentRetryLineageShadow({
      completionEvents: retryLineageShadow.completionProjection?.completionEvents,
      roleIds: retryLineageShadow.selectedRoleIds,
    });
  } catch {
    fail('retry-lineage-source-integrity-mismatch');
  }
  if (!exactJson(retryLineageShadow, canonicalSource)) fail('retry-lineage-source-integrity-mismatch');

  return {
    contentDigest: digest(retryLineageShadow),
    selectedRoleIds: [...retryLineageShadow.selectedRoleIds],
    sourceBinding: retryLineageShadow.sourceBinding,
  };
}

// This test-only seam validates a prebuilt v1.1d result without accepting
// source objects as part of the public terminality API.
export function validateCouncilConcurrentRetryTerminalitySourceForTest(retryLineageShadow) {
  return validateRetryLineageSource(retryLineageShadow);
}

function normalizeProjectedRetryOutcome(projectedRetryOutcome, retryLineage) {
  if (projectedRetryOutcome === undefined) return null;
  if (!projectedRetryOutcome || typeof projectedRetryOutcome !== 'object' || Array.isArray(projectedRetryOutcome)
    || Object.keys(projectedRetryOutcome).sort().join(',') !== 'attemptId,outcome,stageId') {
    fail('projected-retry-outcome-exact-keys-required');
  }
  if (!retryLineage) fail('projected-retry-outcome-without-candidate');

  const attemptId = String(projectedRetryOutcome.attemptId || '').trim();
  const outcome = String(projectedRetryOutcome.outcome || '').trim();
  const stageId = String(projectedRetryOutcome.stageId || '').trim();
  if (attemptId !== retryLineage.projectedAttempt.attemptId) fail('projected-retry-outcome-stale-attempt');
  if (stageId !== retryLineage.stageId) fail('projected-retry-outcome-stage-mismatch');
  if (!TERMINAL_OUTCOMES.has(outcome)) fail('projected-retry-outcome-invalid-outcome');
  return { attemptId, outcome, stageId };
}

function retryOutcomeRejected(retryLineage, projectedRetryOutcome) {
  return {
    candidate: null,
    decision: 'keep-retry-disabled',
    projectedRetryOutcome,
    reason: 'recoverability-evidence-unavailable',
    sourceAttempt: retryLineage.parentAttempt,
    status: 'rejected',
  };
}

function findWave(completionProjection, waveId) {
  const wave = completionProjection.waves.find((candidate) => candidate.id === waveId);
  if (!wave) fail('retry-wave-missing');
  return wave;
}

function projectCompletedRetryBarrier(completionProjection, retryLineage, projectedRetryOutcome) {
  const waveIndex = completionProjection.waves.findIndex((wave) => wave.id === retryLineage.waveId);
  if (waveIndex < 0) fail('retry-wave-missing');
  const wave = findWave(completionProjection, retryLineage.waveId);
  const siblingStageIds = wave.stageIds.filter((stageId) => stageId !== retryLineage.stageId);
  const stageById = new Map(completionProjection.stages.map((stage) => [stage.id, stage]));
  const siblingOutcomes = siblingStageIds.map((stageId) => ({ outcome: stageById.get(stageId)?.outcome || null, stageId }));
  const siblingBlocked = siblingOutcomes.some(({ outcome }) => outcome === 'failed' || outcome === 'timeout');
  const siblingsCompleted = siblingOutcomes.every(({ outcome }) => outcome === 'completed');

  if (!siblingsCompleted) {
    return {
      candidate: retryLineage.projectedAttempt,
      decision: 'keep-retry-disabled',
      nextBarrier: {
        blockedBy: siblingBlocked ? 'sibling-terminal-blocker' : 'sibling-completion-pending',
        siblingOutcomes,
        state: 'blocked',
        waveId: wave.id,
      },
      projectedRetryOutcome,
      status: 'barrier-blocked',
    };
  }

  const nextWave = completionProjection.waves[waveIndex + 1];
  if (!nextWave) {
    return {
      candidate: retryLineage.projectedAttempt,
      decision: 'keep-retry-disabled',
      nextBarrier: null,
      projectedRetryOutcome,
      status: 'projection-complete',
    };
  }

  return {
    candidate: retryLineage.projectedAttempt,
    decision: 'keep-retry-disabled',
    nextBarrier: {
      readyStageIds: [...nextWave.stageIds],
      state: 'projected-ready',
      waveId: nextWave.id,
    },
    projectedRetryOutcome,
    status: 'barrier-ready',
  };
}

function projectRetryTerminality(retryLineageShadow, projectedRetryOutcome) {
  const retryLineage = retryLineageShadow.retryLineage;
  if (!retryLineage) {
    if (projectedRetryOutcome !== undefined) {
      normalizeProjectedRetryOutcome(projectedRetryOutcome, null);
    }
    return null;
  }

  const normalizedOutcome = normalizeProjectedRetryOutcome(projectedRetryOutcome, retryLineage);
  if (retryLineage.triggerOutcome === 'failed') return retryOutcomeRejected(retryLineage, normalizedOutcome);
  if (!normalizedOutcome) {
    return {
      candidate: retryLineage.projectedAttempt,
      decision: 'keep-retry-disabled',
      projectedRetryOutcome: null,
      status: 'awaiting-projected-retry-outcome',
    };
  }
  if (normalizedOutcome.outcome !== 'completed') {
    return {
      candidate: retryLineage.projectedAttempt,
      decision: 'keep-retry-disabled',
      nextBarrier: null,
      projectedRetryOutcome: normalizedOutcome,
      status: 'retry-exhausted',
    };
  }
  return projectCompletedRetryBarrier(retryLineageShadow.completionProjection, retryLineage, normalizedOutcome);
}

function stateFor(retryLineageShadow, retryTerminality) {
  if (!retryTerminality) return retryLineageShadow.state;
  if (retryTerminality.status === 'rejected') return 'retry-outcome-rejected';
  if (retryTerminality.status === 'awaiting-projected-retry-outcome') return 'retry-outcome-pending';
  if (retryTerminality.status === 'retry-exhausted') return 'retry-exhausted';
  if (retryTerminality.status === 'barrier-blocked') return 'projected-barrier-blocked';
  if (retryTerminality.status === 'barrier-ready') return 'projected-barrier-ready';
  return 'projection-complete';
}

export function createCouncilConcurrentRetryTerminalityShadow({
  roleIds = DEFAULT_ROLE_IDS,
  completionEvents = [],
  projectedRetryOutcome,
} = {}) {
  const retryLineageShadow = createCouncilConcurrentRetryLineageShadow({ completionEvents, roleIds });
  const source = validateRetryLineageSource(retryLineageShadow);
  const retryTerminality = projectRetryTerminality(retryLineageShadow, projectedRetryOutcome);

  return {
    actualConcurrentDispatchQualified: false,
    actualRetryAuthorized: false,
    actualRetryExecuted: false,
    authority: retryLineageShadow.authority,
    c13Boundary: 'keep-stub-only',
    completionProjection: retryLineageShadow.completionProjection,
    contractVersion: 'council-concurrent-retry-terminality-shadow-v1.1e',
    decision: 'keep-dispatch-disabled',
    executionCounts: {
      actualConcurrentDispatches: 0,
      actualRetries: 0,
      c13EvaluatorCalls: 0,
      concurrentWorkers: 0,
      externalProviderCalls: 0,
      filesystemWrites: 0,
      modelCalls: 0,
      modelDownloads: 0,
      networkCalls: 0,
      ollamaCalls: 0,
      storeWrites: 0,
    },
    productionReadyClaim: false,
    retryDecision: 'keep-retry-disabled',
    retryLineage: retryLineageShadow.retryLineage,
    retryTerminality,
    selectedRoleIds: retryLineageShadow.selectedRoleIds,
    sourceBinding: {
      retryLineage: {
        contentDigest: source.contentDigest,
        sourceBinding: source.sourceBinding,
        sourceContractVersion: retryLineageShadow.contractVersion,
      },
      selectedRoleIds: source.selectedRoleIds,
    },
    state: stateFor(retryLineageShadow, retryTerminality),
  };
}
