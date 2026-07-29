const PROFILE_ID = 'seat-scoped-v1';
const ROBUSTNESS_PROFILE_ID = 'seat-scoped-v2';
const REBUTTAL_COMPLETION_PROFILE_ID = 'seat-scoped-v3';
const CHAIR_SYNTHESIS_CONTRACT_PROFILE_ID = 'seat-scoped-v4';
const REBUTTAL_STABILITY_PROFILE_ID = 'seat-scoped-v5';
const SUPPORTED_PROFILE_IDS = new Set([
  PROFILE_ID,
  ROBUSTNESS_PROFILE_ID,
  REBUTTAL_COMPLETION_PROFILE_ID,
  CHAIR_SYNTHESIS_CONTRACT_PROFILE_ID,
  REBUTTAL_STABILITY_PROFILE_ID,
]);

const SEAT_CONTRACTS = {
  research: {
    responsibility:
      'Identify what the available evidence supports, where it is incomplete, and which claims must remain unresolved.',
    targetSeatId: 'implementation',
  },
  implementation: {
    responsibility:
      'Assess implementation feasibility, dependency boundaries, and the smallest safe change that preserves current contracts.',
    targetSeatId: 'verification',
  },
  verification: {
    responsibility:
      'Define failure conditions, permission and audit checks, regression coverage, and rollback evidence.',
    targetSeatId: 'research',
  },
};

function fail(message) {
  throw new Error(`Council seat prompt contract: ${message}`);
}

function requiredText(value, label) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    fail(`${label} is required.`);
  }
  return normalized;
}

export function resolveCouncilSeatPromptContract({
  councilBrief = null,
  phase,
  profile,
  seatId,
}) {
  if (!profile) {
    return null;
  }
  if (!SUPPORTED_PROFILE_IDS.has(profile)) {
    fail(`unsupported profile ${profile}.`);
  }

  const normalizedPhase = requiredText(phase, 'phase');
  const normalizedSeatId = requiredText(seatId, 'seatId');
  const seat = SEAT_CONTRACTS[normalizedSeatId];
  if (!seat) {
    fail(`unsupported seat ${normalizedSeatId}.`);
  }
  if (!['opening-position', 'rebuttal'].includes(normalizedPhase)) {
    fail(`unsupported specialist phase ${normalizedPhase}.`);
  }

  let requiredTargetClaimId = null;
  if (normalizedPhase === 'rebuttal') {
    const targetClaims = Array.isArray(councilBrief?.claims)
      ? councilBrief.claims.filter((claim) => claim?.seatId === seat.targetSeatId)
      : [];
    if (targetClaims.length !== 1) {
      fail(
        `rebuttal seat ${normalizedSeatId} requires exactly one ${seat.targetSeatId} opening claim.`,
      );
    }
    requiredTargetClaimId = requiredText(targetClaims[0]?.id, 'target claim id');
  }

  return {
    profile,
    requiredTargetClaimId,
    responsibility: seat.responsibility,
    seatId: normalizedSeatId,
    targetSeatId: seat.targetSeatId,
  };
}

export function classifyCouncilClaimFailure(error) {
  if (error?.code !== 'invalid-claim') {
    return null;
  }

  const message = String(error?.message || '');
  if (message.includes('claims must contain between')) {
    return 'claim-count';
  }
  if (message.includes('must belong to seat')) {
    return 'claim-seat';
  }
  if (message.includes('Unsupported claim position')) {
    return 'claim-position';
  }
  if (message.includes('Unsupported claim severity')) {
    return 'claim-severity';
  }
  return 'claim-other';
}

export function assertCouncilSeatTargetBinding({
  councilBrief = null,
  phase,
  profile,
  seatId,
  targetClaimIds,
}) {
  const contract = resolveCouncilSeatPromptContract({
    councilBrief,
    phase,
    profile,
    seatId,
  });
  if (!contract) {
    return null;
  }

  const actualTargetClaimIds = Array.isArray(targetClaimIds)
    ? targetClaimIds.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const expectedTargetClaimIds = contract.requiredTargetClaimId
    ? [contract.requiredTargetClaimId]
    : [];
  if (
    actualTargetClaimIds.length !== expectedTargetClaimIds.length ||
    actualTargetClaimIds.some((value, index) => value !== expectedTargetClaimIds[index])
  ) {
    fail(
      `${contract.seatId} ${phase} targetClaimIds must equal ${JSON.stringify(expectedTargetClaimIds)}.`,
    );
  }
  return contract;
}

export function getCouncilSeatPromptProfileId() {
  return PROFILE_ID;
}

export function getCouncilSeatRobustnessPromptProfileId() {
  return ROBUSTNESS_PROFILE_ID;
}

export function getCouncilSeatRebuttalCompletionPromptProfileId() {
  return REBUTTAL_COMPLETION_PROFILE_ID;
}

export function getCouncilChairSynthesisContractPromptProfileId() {
  return CHAIR_SYNTHESIS_CONTRACT_PROFILE_ID;
}

export function getCouncilRebuttalStabilityPromptProfileId() {
  return REBUTTAL_STABILITY_PROFILE_ID;
}
