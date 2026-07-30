const SELECTABLE_ROLE_IDS = [
  'research',
  'product',
  'architecture',
  'implementation',
  'security',
  'verification',
  'operations',
];

const DEFAULT_ROLE_IDS = ['research', 'implementation', 'verification'];

const PREVIEW_AUTHORITY = {
  mode: 'read-only-preview',
  providerCallsAuthorized: false,
  modelSelectionAuthorized: false,
  missionMutationAuthorized: false,
  approvalMutationAuthorized: false,
  runtimeActivationAuthorized: false,
  filesystemMutationAuthorized: false,
};

const COMMON_PROHIBITED_ACTIONS = [
  'call a provider or model',
  'change mission, workspace, artifact, or filesystem state',
  'resolve approvals',
  'activate a profile or runtime',
];

const ROLE_DEFINITIONS = {
  research: {
    id: 'research',
    kind: 'specialist',
    responsibility: 'Gather decision-relevant evidence and identify material unknowns.',
    evidenceAllowlist: ['approved sources', 'mission inputs', 'recorded assumptions'],
    prohibitedActions: ['claim unverified facts'],
    outputContract: 'Claims, evidence references, source limits, rejected options, and next action.',
  },
  product: {
    id: 'product',
    kind: 'specialist',
    responsibility: 'Frame user value, scope, tradeoffs, and success criteria.',
    evidenceAllowlist: ['approved requirements', 'mission inputs', 'recorded user constraints'],
    prohibitedActions: ['approve scope', 'invent user evidence'],
    outputContract: 'Claims, user-value tradeoffs, rejected options, assumptions, and next action.',
  },
  architecture: {
    id: 'architecture',
    kind: 'specialist',
    responsibility: 'Assess system boundaries, interfaces, and technical tradeoffs.',
    evidenceAllowlist: ['repository contracts', 'approved architecture records', 'mission inputs'],
    prohibitedActions: ['change architecture', 'add dependencies', 'claim runtime validation'],
    outputContract: 'Claims, boundary-aware options, compatibility risks, rejected options, and next action.',
  },
  implementation: {
    id: 'implementation',
    kind: 'specialist',
    responsibility: 'Evaluate a minimal implementation path and its verification needs.',
    evidenceAllowlist: ['repository patterns', 'approved requirements', 'mission inputs'],
    prohibitedActions: ['write files', 'run commands', 'claim code was changed'],
    outputContract: 'Claims, implementation outline, in-scope dependencies, rejected options, and next action.',
  },
  security: {
    id: 'security',
    kind: 'specialist',
    responsibility: 'Identify trust boundaries, unsafe inputs, and approval-sensitive risks.',
    evidenceAllowlist: ['security policy', 'repository contracts', 'mission inputs'],
    prohibitedActions: ['grant access', 'weaken controls', 'approve risk'],
    outputContract: 'Claims, threat and control findings, residual risk, rejected options, and next action.',
  },
  verification: {
    id: 'verification',
    kind: 'specialist',
    responsibility: 'Define evidence needed to validate claims and regressions.',
    evidenceAllowlist: ['test contracts', 'recorded evidence', 'mission inputs'],
    prohibitedActions: ['mark work complete', 'claim an unrun check passed', 'approve release'],
    outputContract: 'Claims, verification plan, observable checks, remaining uncertainty, and next action.',
  },
  operations: {
    id: 'operations',
    kind: 'specialist',
    responsibility: 'Assess operability, handoff conditions, and rollback boundaries.',
    evidenceAllowlist: ['runbooks', 'recorded operational evidence', 'mission inputs'],
    prohibitedActions: ['deploy, start, or stop services', 'change runtime configuration', 'claim production readiness'],
    outputContract: 'Claims, operational considerations, handoff requirements, blockers, and next action.',
  },
  chair: {
    id: 'chair',
    kind: 'chair',
    responsibility: 'Synthesize the specialist record without expanding authority.',
    evidenceAllowlist: ['selected specialist outputs', 'their allowed evidence references'],
    prohibitedActions: ['invent claims or evidence', 'override evidence limits', 'approve a mission'],
    outputContract: 'Accepted and rejected claims, agreement, conflicts, evidence references, verification plan, and next owner.',
  },
  reviewer: {
    id: 'reviewer',
    kind: 'reviewer',
    responsibility: 'Review synthesis completeness and boundary compliance.',
    evidenceAllowlist: ['chair synthesis', 'selected specialist outputs', 'their allowed evidence references'],
    prohibitedActions: ['change the chair synthesis', 'approve a mission', 'replace human review'],
    outputContract: 'PASS, FIX, or ESCALATE; findings; evidence references; and next action.',
  },
};

export class CouncilBlueprintPreviewValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CouncilBlueprintPreviewValidationError';
  }
}

function copyRole(roleId) {
  const role = ROLE_DEFINITIONS[roleId];
  return {
    id: role.id,
    kind: role.kind,
    responsibility: role.responsibility,
    evidenceAllowlist: [...role.evidenceAllowlist],
    prohibitedActions: [...COMMON_PROHIBITED_ACTIONS, ...role.prohibitedActions],
    outputContract: role.outputContract,
  };
}

function validateRoleIds(roleIds) {
  if (!Array.isArray(roleIds)) {
    throw new CouncilBlueprintPreviewValidationError('council-blueprint-preview: --role must be repeated for each role.');
  }

  const normalized = roleIds.map((roleId) => String(roleId || '').trim());
  for (const roleId of normalized) {
    if (roleId === 'chair' || roleId === 'reviewer') {
      throw new CouncilBlueprintPreviewValidationError(`council-blueprint-preview: ${roleId} is fixed and cannot be selected.`);
    }
    if (!SELECTABLE_ROLE_IDS.includes(roleId)) {
      throw new CouncilBlueprintPreviewValidationError(`council-blueprint-preview: unknown selectable role: ${roleId || '(empty)'}.`);
    }
  }

  if (new Set(normalized).size !== normalized.length) {
    throw new CouncilBlueprintPreviewValidationError('council-blueprint-preview: selected roles must be unique.');
  }
  if (normalized.length < 3 || normalized.length > 7) {
    throw new CouncilBlueprintPreviewValidationError('council-blueprint-preview: select exactly 3 to 7 specialist roles.');
  }

  return SELECTABLE_ROLE_IDS.filter((roleId) => normalized.includes(roleId));
}

function validateFailedStageIds(stages, failedStageIds) {
  const ids = Array.isArray(failedStageIds) ? failedStageIds : [];
  const knownIds = new Set(stages.map((stage) => stage.id));
  const normalized = ids.map((stageId) => String(stageId || '').trim());
  if (new Set(normalized).size !== normalized.length || normalized.some((stageId) => !knownIds.has(stageId))) {
    throw new CouncilBlueprintPreviewValidationError('council-blueprint-preview: failed stage ids must be unique planned stage ids.');
  }
  return normalized;
}

export function getCouncilBlueprintCatalog() {
  return {
    authority: { ...PREVIEW_AUTHORITY },
    c13Boundary: 'keep-stub-only',
    defaultRoleIds: [...DEFAULT_ROLE_IDS],
    fixedRoles: ['chair', 'reviewer'].map(copyRole),
    productionReadyClaim: false,
    selectableRoles: SELECTABLE_ROLE_IDS.map(copyRole),
  };
}

export function normalizeCouncilBlueprintRoleIds(roleIds = DEFAULT_ROLE_IDS) {
  return validateRoleIds(roleIds);
}

export function buildCouncilBlueprintMeetingPlan(roleIds = DEFAULT_ROLE_IDS) {
  const selectedRoleIds = normalizeCouncilBlueprintRoleIds(roleIds);
  const openingStages = selectedRoleIds.map((roleId) => ({
    dependsOn: [],
    id: `opening:${roleId}`,
    kind: 'opening',
    onDependencyFailure: 'dependency-blocked',
    roleId,
  }));
  const openingIds = openingStages.map((stage) => stage.id);
  const rebuttalStages = selectedRoleIds.map((roleId, index) => ({
    dependsOn: openingIds,
    id: `rebuttal:${roleId}`,
    kind: 'rebuttal',
    onDependencyFailure: 'dependency-blocked',
    roleId,
    targetRoleId: selectedRoleIds[(index + 1) % selectedRoleIds.length],
  }));
  const chairStage = {
    dependsOn: rebuttalStages.map((stage) => stage.id),
    id: 'chair:synthesis',
    kind: 'synthesis',
    onDependencyFailure: 'dependency-blocked',
    roleId: 'chair',
  };
  const reviewerStage = {
    dependsOn: [chairStage.id],
    id: 'reviewer:review',
    kind: 'review',
    onDependencyFailure: 'dependency-blocked',
    roleId: 'reviewer',
  };

  return {
    stageCount: selectedRoleIds.length * 2 + 2,
    stages: [...openingStages, ...rebuttalStages, chairStage, reviewerStage],
  };
}

export function projectCouncilBlueprintMeetingStatus(meetingPlan, failedStageIds = []) {
  const stages = Array.isArray(meetingPlan?.stages) ? meetingPlan.stages : [];
  const failed = new Set(validateFailedStageIds(stages, failedStageIds));
  const statusById = new Map();
  const stagesWithStatus = stages.map((stage) => {
    let status = 'pending';
    if (stage.dependsOn.some((dependencyId) => statusById.get(dependencyId) !== 'pending')) {
      status = 'dependency-blocked';
    } else if (failed.has(stage.id)) {
      status = 'failed';
    }
    statusById.set(stage.id, status);
    return { ...stage, status };
  });

  return {
    failedStageIds: [...failed],
    stages: stagesWithStatus,
  };
}

export function createCouncilBlueprintPreview({ failedStageIds = [], roleIds = DEFAULT_ROLE_IDS } = {}) {
  const selectedRoleIds = normalizeCouncilBlueprintRoleIds(roleIds);
  const meetingPlan = buildCouncilBlueprintMeetingPlan(selectedRoleIds);
  return {
    authority: getCouncilBlueprintCatalog().authority,
    c13Boundary: 'keep-stub-only',
    fixedRoles: ['chair', 'reviewer'].map(copyRole),
    meetingPlan,
    productionReadyClaim: false,
    selectedRoleIds,
    specialists: selectedRoleIds.map(copyRole),
    statusProjection: projectCouncilBlueprintMeetingStatus(meetingPlan, failedStageIds),
  };
}

export function toCouncilBlueprintPreviewErrorPayload(error) {
  return {
    error: 'invalid-council-blueprint-preview',
    message: error instanceof Error ? error.message : String(error),
  };
}
