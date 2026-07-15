import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMissionStageFailure,
  buildMissionStageRequest,
  buildParallelSpecialistRetryPlan,
  buildParallelStageMetadata,
} from '../src/core/mission-stage-pipeline.mjs';

test('buildMissionStageRequest keeps shared context and makes the current role explicit', () => {
  const context = {
    attachments: [{ id: 'attachment-1' }],
    memoryEntries: [{ id: 'memory-1' }],
    mission: { id: 'mission-1' },
    pack: { id: 'engineering' },
    previousOutputs: { manager: { summaryText: 'ready' } },
    provider: { id: 'stub' },
    providerId: 'stub',
    session: { id: 'session-1' },
    workspace: { id: 'workspace-1' },
  };

  const request = buildMissionStageRequest({
    context,
    role: 'specialist',
    stageOptions: {
      outputFileName: 'specialist-research-deliverable.md',
      providerRole: 'executor',
    },
  });

  assert.deepEqual(request, {
    ...context,
    role: 'specialist',
    outputFileName: 'specialist-research-deliverable.md',
    providerRole: 'executor',
  });
});

test('buildMissionStageFailure returns null after a successful stage', () => {
  assert.equal(
    buildMissionStageFailure({
      artifactPath: null,
      currentStage: 'manager',
      mission: { id: 'mission-1' },
      providerId: 'stub',
      session: { id: 'session-1' },
      stage: { error: null },
    }),
    null,
  );
});

test('buildMissionStageFailure preserves reviewer artifact lineage on failure', () => {
  const mission = { id: 'mission-1' };
  const session = { id: 'session-1' };

  assert.deepEqual(
    buildMissionStageFailure({
      artifactPath: '/tmp/executor-output.md',
      currentStage: 'reviewer',
      mission,
      providerId: 'stub',
      session,
      stage: { error: new Error('reviewer failed') },
    }),
    {
      artifactPath: '/tmp/executor-output.md',
      currentStage: 'reviewer',
      mission,
      providerId: 'stub',
      session,
    },
  );
});

test('buildParallelSpecialistRetryPlan starts every required branch for a new group', () => {
  const plan = buildParallelSpecialistRetryPlan({
    parallelSpecialistKinds: ['research', 'implementation', 'verification'],
    previousParallelGroup: null,
  });

  assert.deepEqual(plan.completedRuns, []);
  assert.deepEqual(plan.previousRunByKind, {});
  assert.deepEqual(plan.specialistKindsToRun, ['research', 'implementation', 'verification']);
});

test('buildParallelSpecialistRetryPlan reruns unresolved and quality-gate branches only', () => {
  const research = { id: 'run-research', specialistKind: 'research', status: 'completed' };
  const implementation = { id: 'run-implementation', specialistKind: 'implementation', status: 'completed' };
  const verification = { id: 'run-verification', specialistKind: 'verification', status: 'failed' };
  const plan = buildParallelSpecialistRetryPlan({
    parallelSpecialistKinds: ['research', 'implementation', 'verification'],
    previousParallelGroup: {
      latestRuns: [research, implementation, verification],
      qualityGate: { rerunKinds: ['implementation'] },
      unresolvedRuns: [verification],
      wasMerged: false,
    },
  });

  assert.deepEqual(plan.completedRuns, [research]);
  assert.deepEqual(plan.specialistKindsToRun, ['implementation', 'verification']);
  assert.equal(plan.previousRunByKind.implementation, implementation);
  assert.equal(plan.previousRunByKind.verification, verification);
});

test('buildParallelStageMetadata keeps profile and specialist resume lineage together', () => {
  const parallelPlan = {
    orchestrationProfile: {
      deliverableTypes: ['markdown'],
      description: 'Research and verify before merge.',
      displayName: 'Knowledge Triad',
      harnessPatterns: ['parallel-specialists'],
      id: 'knowledge-triad',
      mergeOwner: 'manager',
      mode: 'knowledge',
      parallelSpecialistKinds: ['research', 'implementation', 'verification'],
      qualityGate: 'verification-signal-required',
      recommendedProvider: 'stub',
      retryPolicy: 'failed-branches-only',
      runtimeBlueprint: 'local-first',
    },
    source: 'orchestration-profile',
  };
  const previousBranchRun = { id: 'run-1', specialistRootRunId: 'root-run-1' };

  const metadata = buildParallelStageMetadata({
    parallelGroupId: 'parallel-group-1',
    parallelPlan,
    parallelSpecialistKinds: ['research', 'implementation', 'verification'],
    parentRunId: 'planner-run-1',
    previousBranchRun,
    specialistKind: 'research',
    stageKind: 'specialist-branch',
  });

  assert.equal(metadata.mergeStatus, 'pending');
  assert.equal(metadata.orchestrationProfileId, 'knowledge-triad');
  assert.equal(metadata.orchestrationProfileQualityGate, 'verification-signal-required');
  assert.equal(metadata.parallelGroupId, 'parallel-group-1');
  assert.equal(metadata.parentRunId, 'planner-run-1');
  assert.equal(metadata.resumeFromRunId, 'run-1');
  assert.equal(metadata.specialistKind, 'research');
  assert.equal(metadata.specialistRootRunId, 'root-run-1');
  assert.equal(metadata.stageKind, 'specialist-branch');
});

test('buildParallelStageMetadata marks the manager merge as merged', () => {
  const metadata = buildParallelStageMetadata({
    parallelGroupId: 'parallel-group-1',
    parallelPlan: { orchestrationProfile: null, source: 'explicit-specialists' },
    parallelSpecialistKinds: ['research', 'verification'],
    parentRunId: 'planner-run-1',
    stageKind: 'parallel-merge',
  });

  assert.equal(metadata.mergeStatus, 'merged');
  assert.equal(metadata.orchestrationProfileId, null);
  assert.equal(metadata.orchestrationProfileSource, 'explicit-specialists');
  assert.equal(metadata.stageKind, 'parallel-merge');
  assert.equal('specialistKind' in metadata, false);
});
