function normalizeText(value) {
  return String(value || '').trim();
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function isCompletedSpecialistRun(run) {
  return ['completed', 'abandoned'].includes(normalizeText(run?.status));
}

export function buildMissionStageRequest({ context, role, stageOptions = {} }) {
  return {
    ...context,
    role,
    ...stageOptions,
  };
}

export function buildMissionStageFailure({ artifactPath = null, currentStage, mission, providerId, session, stage }) {
  if (!stage?.error) {
    return null;
  }

  return {
    artifactPath,
    currentStage,
    mission,
    providerId,
    session,
  };
}

export function buildParallelSpecialistRetryPlan({ parallelSpecialistKinds, previousParallelGroup }) {
  if (!previousParallelGroup || previousParallelGroup.wasMerged) {
    return {
      completedRuns: [],
      previousRunByKind: {},
      specialistKindsToRun: [...parallelSpecialistKinds],
    };
  }

  const unresolvedByKind = new Map(
    ensureArray(previousParallelGroup.unresolvedRuns).map((run) => [normalizeText(run.specialistKind), run]),
  );
  const latestRunByKind = new Map(
    ensureArray(previousParallelGroup.latestRuns).map((run) => [normalizeText(run.specialistKind), run]),
  );
  const qualityGateRerunKinds = new Set(ensureArray(previousParallelGroup.qualityGate?.rerunKinds));
  const specialistKindsToRun = parallelSpecialistKinds.filter(
    (kind) => unresolvedByKind.has(kind) || qualityGateRerunKinds.has(kind),
  );
  const previousRunByKind = Object.fromEntries(
    specialistKindsToRun.map((kind) => [kind, unresolvedByKind.get(kind) || latestRunByKind.get(kind)]),
  );
  const completedRuns = ensureArray(previousParallelGroup.latestRuns)
    .filter(isCompletedSpecialistRun)
    .filter((run) => !specialistKindsToRun.includes(normalizeText(run.specialistKind)));

  return {
    completedRuns,
    previousRunByKind,
    specialistKindsToRun,
  };
}

export function buildParallelStageMetadata({
  parallelGroupId,
  parallelPlan,
  parallelSpecialistKinds,
  parentRunId,
  previousBranchRun = null,
  specialistKind = '',
  stageKind,
}) {
  const profile = parallelPlan.orchestrationProfile;
  const profileMetadata = {
    orchestrationProfileDeliverableTypes: profile?.deliverableTypes || [],
    orchestrationProfileDescription: profile?.description || null,
    orchestrationProfileDisplayName: profile?.displayName || null,
    orchestrationProfileHarnessPatterns: profile?.harnessPatterns || [],
    orchestrationProfileId: profile?.id || null,
    orchestrationProfileMergeOwner: profile?.mergeOwner || null,
    orchestrationProfileMode: profile?.mode || null,
    orchestrationProfileParallelSpecialistKinds: profile?.parallelSpecialistKinds || [],
    orchestrationProfileQualityGate: profile?.qualityGate || null,
    orchestrationProfileRecommendedProvider: profile?.recommendedProvider || null,
    orchestrationProfileRuntimeBlueprint: profile?.runtimeBlueprint || null,
    orchestrationProfileRetryPolicy: profile?.retryPolicy || null,
    orchestrationProfileSource: parallelPlan.source,
    parallelGroupId,
    parallelRequiredKinds: parallelSpecialistKinds,
    parentRunId,
    stageKind,
  };

  if (stageKind !== 'specialist-branch') {
    return {
      mergeStatus: 'merged',
      ...profileMetadata,
    };
  }

  return {
    mergeStatus: 'pending',
    ...profileMetadata,
    resumeFromRunId: previousBranchRun?.id || null,
    specialistKind,
    specialistRootRunId: previousBranchRun?.specialistRootRunId || previousBranchRun?.id || null,
  };
}
