import { createHash } from 'node:crypto';

import { CouncilBlueprintPreviewValidationError } from './council-blueprint-preview.mjs';
import { createCouncilConcurrentEnvelopeShadow } from './council-concurrent-envelope-shadow.mjs';
import { createCouncilConcurrentScheduleShadow } from './council-concurrent-schedule-shadow.mjs';

const DEFAULT_ROLE_IDS = ['research', 'implementation', 'verification'];

function fail(code) {
  throw new CouncilBlueprintPreviewValidationError(`council-concurrent-retry-lineage-shadow: ${code}.`);
}

function exactJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function digest(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function validateSources({ scheduleShadow, envelopeShadow }) {
  if (scheduleShadow?.contractVersion !== 'council-concurrent-schedule-shadow-v1.1b') {
    fail('schedule-source-contract-drift');
  }
  if (envelopeShadow?.contractVersion !== 'council-concurrent-envelope-shadow-v1.1c') {
    fail('envelope-source-contract-drift');
  }

  const roleIds = scheduleShadow.selectedRoleIds;
  const completionEvents = scheduleShadow.completionProjection?.completionEvents;
  let canonicalSchedule;
  let canonicalEnvelope;
  try {
    canonicalSchedule = createCouncilConcurrentScheduleShadow({ completionEvents, roleIds });
    canonicalEnvelope = createCouncilConcurrentEnvelopeShadow({ roleIds });
  } catch {
    fail('source-integrity-mismatch');
  }

  if (!exactJson(scheduleShadow, canonicalSchedule)) fail('schedule-source-integrity-mismatch');
  if (!exactJson(envelopeShadow, canonicalEnvelope)) fail('envelope-source-integrity-mismatch');

  return {
    completionDigest: digest(scheduleShadow.completionProjection.completionEvents),
    envelopeContentDigest: digest(envelopeShadow),
    envelopeScheduleContentDigest: envelopeShadow.scheduleBinding.contentDigest,
    scheduleContentDigest: digest(scheduleShadow),
    selectedRoleIds: [...scheduleShadow.selectedRoleIds],
  };
}

// This test-only seam validates already-built canonical sources without adding
// an alternate runtime entry point or accepting source objects as public input.
export function validateCouncilConcurrentRetryLineageSourcesForTest({ scheduleShadow, envelopeShadow }) {
  return validateSources({ scheduleShadow, envelopeShadow });
}

function buildRetryLineage(scheduleShadow) {
  const blocker = scheduleShadow.completionProjection.blocker;
  if (!blocker) return null;

  const stage = scheduleShadow.schedule.stages.find((candidate) => candidate.id === blocker.stageId);
  if (!stage) fail('blocker-stage-missing');

  return {
    parentAttempt: {
      attemptId: stage.attemptId,
      attemptNumber: stage.attemptNumber,
      retryCount: stage.retryCount,
    },
    projectedAttempt: {
      attemptId: `attempt:${stage.id}:2`,
      attemptNumber: 2,
      retryCount: 1,
    },
    stageId: stage.id,
    state: 'projection-only-not-authorized',
    triggerOutcome: blocker.outcome,
    waveId: blocker.waveId,
  };
}

function projectState({ scheduleShadow, envelopeShadow }) {
  if (envelopeShadow.safetyEnvelope.result === 'outside-default-synthetic-envelope') {
    return 'outside-synthetic-envelope';
  }
  if (scheduleShadow.completionProjection.overallStatus === 'completed') {
    return 'completed-without-retry';
  }
  if (scheduleShadow.completionProjection.blocker) {
    return 'retry-lineage-projected';
  }
  return 'awaiting-terminal-outcome';
}

export function createCouncilConcurrentRetryLineageShadow({ roleIds = DEFAULT_ROLE_IDS, completionEvents = [] } = {}) {
  const scheduleShadow = createCouncilConcurrentScheduleShadow({ completionEvents, roleIds });
  const envelopeShadow = createCouncilConcurrentEnvelopeShadow({ roleIds: scheduleShadow.selectedRoleIds });
  const sourceBinding = validateSources({ scheduleShadow, envelopeShadow });
  const state = projectState({ scheduleShadow, envelopeShadow });

  return {
    actualConcurrentDispatchQualified: false,
    actualRetryAuthorized: false,
    actualRetryExecuted: false,
    authority: scheduleShadow.authority,
    c13Boundary: 'keep-stub-only',
    completionProjection: scheduleShadow.completionProjection,
    contractVersion: 'council-concurrent-retry-lineage-shadow-v1.1d',
    decision: 'keep-dispatch-disabled',
    executionCounts: {
      actualConcurrentDispatches: 0,
      actualRetries: 0,
      c13EvaluatorCalls: 0,
      concurrentWorkers: 0,
      externalProviderCalls: 0,
      modelCalls: 0,
      modelDownloads: 0,
      networkCalls: 0,
      filesystemWrites: 0,
      storeWrites: 0,
    },
    productionReadyClaim: false,
    retryDecision: 'keep-retry-disabled',
    retryLineage: state === 'retry-lineage-projected' ? buildRetryLineage(scheduleShadow) : null,
    selectedRoleIds: scheduleShadow.selectedRoleIds,
    sourceBinding: {
      completionDigest: sourceBinding.completionDigest,
      envelope: {
        contentDigest: sourceBinding.envelopeContentDigest,
        scheduleContentDigest: sourceBinding.envelopeScheduleContentDigest,
        sourceContractVersion: envelopeShadow.contractVersion,
      },
      schedule: {
        contentDigest: sourceBinding.scheduleContentDigest,
        sourceContractVersion: scheduleShadow.contractVersion,
      },
      selectedRoleIds: sourceBinding.selectedRoleIds,
    },
    state,
  };
}
