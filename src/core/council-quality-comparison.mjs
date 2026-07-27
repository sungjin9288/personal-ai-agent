import { createHash } from 'node:crypto';

export const COUNCIL_QUALITY_SCHEMA_VERSION = 'council-quality-comparison/v1';
export const COUNCIL_BASELINE_PROFILE = 'knowledge-triad';
export const COUNCIL_CANDIDATE_PROFILE = 'knowledge-council-triad';

const PROFILE_IDS = Object.freeze([
  COUNCIL_BASELINE_PROFILE,
  COUNCIL_CANDIDATE_PROFILE,
]);
const REVIEWER_OUTCOMES = new Set(['absent', 'fail', 'pass']);
const DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;
const REQUIRED_CASE_IDS = Object.freeze([
  'control-pass',
  'critical-conflict-stop',
  'missing-verification-stop',
  'reviewer-rubric-failure',
]);

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function formatCouncilQualityValue(value) {
  return `${JSON.stringify(stableValue(value), null, 2)}\n`;
}

export function hashCouncilQualityValue(value) {
  return `sha256:${createHash('sha256').update(formatCouncilQualityValue(value)).digest('hex')}`;
}

function requireCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireExactKeys(value, keys, label) {
  requireCondition(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object.`);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  requireCondition(
    actual.length === expected.length && actual.every((key, index) => key === expected[index]),
    `${label} must contain exactly: ${expected.join(', ')}.`,
  );
}

function requireText(value, label) {
  const text = String(value || '').trim();
  requireCondition(Boolean(text), `${label} is required.`);
  return text;
}

function requireStringArray(value, label) {
  requireCondition(Array.isArray(value), `${label} must be an array.`);
  const items = value.map((item) => requireText(item, `${label} item`));
  requireCondition(new Set(items).size === items.length, `${label} contains duplicate values.`);
  return items;
}

function expectedCaseMap(fixtures) {
  return new Map(fixtures.cases.map((fixture) => [fixture.id, fixture]));
}

export function assertCouncilQualityFixtures(fixtures) {
  requireExactKeys(fixtures, ['cases', 'productionReadyClaim', 'schemaVersion'], 'fixture set');
  requireCondition(
    fixtures.schemaVersion === 'council-quality-fixtures/v1',
    'Unsupported council quality fixture schema.',
  );
  requireCondition(fixtures.productionReadyClaim === false, 'Fixture productionReadyClaim must remain false.');
  requireCondition(Array.isArray(fixtures.cases), 'Fixture cases must be an array.');
  requireCondition(fixtures.cases.length === REQUIRED_CASE_IDS.length, 'Fixture set must contain all required cases.');

  const ids = [];
  for (const fixture of fixtures.cases) {
    requireExactKeys(
      fixture,
      ['constraints', 'deliverableType', 'expected', 'id', 'objective', 'title'],
      'fixture',
    );
    const id = requireText(fixture.id, 'fixture id');
    ids.push(id);
    requireText(fixture.title, `${id} title`);
    requireText(fixture.objective, `${id} objective`);
    requireText(fixture.deliverableType, `${id} deliverableType`);
    requireStringArray(fixture.constraints, `${id} constraints`);
    requireExactKeys(
      fixture.expected,
      ['missionStatus', 'missingSpecialistKinds', 'reviewerOutcome', 'syntheticConflictRouting'],
      `${id} expected`,
    );
    requireCondition(
      ['completed', 'failed'].includes(fixture.expected.missionStatus),
      `${id} expected missionStatus is invalid.`,
    );
    requireCondition(
      REVIEWER_OUTCOMES.has(fixture.expected.reviewerOutcome),
      `${id} expected reviewerOutcome is invalid.`,
    );
    requireStringArray(fixture.expected.missingSpecialistKinds, `${id} expected missingSpecialistKinds`);
    requireCondition(
      typeof fixture.expected.syntheticConflictRouting === 'boolean',
      `${id} expected syntheticConflictRouting must be boolean.`,
    );
  }

  requireCondition(new Set(ids).size === ids.length, 'Fixture ids must be unique.');
  requireCondition(
    REQUIRED_CASE_IDS.every((id) => ids.includes(id)),
    `Fixture ids must contain exactly: ${REQUIRED_CASE_IDS.join(', ')}.`,
  );
  return fixtures;
}

function stageLabel(run) {
  return [
    run.role,
    run.stageKind || run.role,
    run.specialistKind || '',
  ].filter(Boolean).join(':');
}

function reviewerOutcome(runs) {
  const reviewer = runs.find((run) => run.role === 'reviewer');
  if (!reviewer) {
    return 'absent';
  }
  return reviewer.status === 'completed' ? 'pass' : 'fail';
}

function missingSpecialistKinds(runs) {
  return [...new Set(
    runs
      .filter((run) =>
        run.role === 'specialist'
        && ['blocked', 'failed'].includes(run.status)
        && run.specialistKind)
      .map((run) => run.specialistKind),
  )].sort();
}

function detectsSyntheticConflict(runs) {
  return runs.some((run) =>
    run.councilValidation?.code === 'critical-conflict'
    && run.councilValidation?.status === 'blocked');
}

function metricProjection(observation) {
  return {
    artifactCount: observation.artifactCount,
    artifactShape: observation.artifactBindings.map(({ byteLength: _byteLength, sha256: _sha256, ...binding }) => binding),
    boundary: observation.boundary,
    fixtureId: observation.fixtureId,
    expectedMissingSpecialistKinds: observation.expectedMissingSpecialistKinds,
    missionStatus: observation.missionStatus,
    missingSpecialistKinds: observation.missingSpecialistKinds,
    profileId: observation.profileId,
    providerId: observation.providerId,
    reviewer: observation.reviewer,
    stageCount: observation.stageCount,
    stageSequence: observation.stageSequence,
    syntheticConflictRoutingDetected: observation.syntheticConflictRoutingDetected,
  };
}

export function buildProfileQualityObservation({
  artifacts,
  fixture,
  mission,
  profileId,
  runs,
  session,
  approvals,
  executionLeases,
}) {
  requireCondition(PROFILE_IDS.includes(profileId), `Unsupported comparison profile: ${profileId}.`);
  const expected = fixture.expected;
  const outcome = reviewerOutcome(runs);
  const observedMissingKinds = missingSpecialistKinds(runs);
  const observation = {
    artifactBindings: artifacts,
    artifactCount: artifacts.length,
    boundary: {
      approvalCount: approvals.length,
      estimatedCostUsdZero: runs.every((run) => run.estimatedCostUsd === null || run.estimatedCostUsd === 0),
      executionLeaseCount: executionLeases.length,
      externalProviderCallCount: runs.filter((run) => run.providerResponseId !== null).length,
    },
    fixtureId: fixture.id,
    expectedMissingSpecialistKinds: [...expected.missingSpecialistKinds].sort(),
    missionStatus: mission.status,
    missingSpecialistKinds: observedMissingKinds,
    profileId,
    providerId: 'stub',
    reviewer: {
      correct: outcome === expected.reviewerOutcome && mission.status === expected.missionStatus,
      expectedMissionStatus: expected.missionStatus,
      expectedOutcome: expected.reviewerOutcome,
      outcome,
      sessionStatus: session?.status || 'missing',
    },
    stageCount: runs.length,
    stageSequence: runs.map(stageLabel),
    syntheticConflictRoutingDetected: detectsSyntheticConflict(runs),
  };
  return {
    ...observation,
    semanticHash: hashCouncilQualityValue(metricProjection(observation)),
  };
}

function pairByCase(observations) {
  const pairs = new Map(REQUIRED_CASE_IDS.map((id) => [id, {}]));
  for (const observation of observations) {
    const pair = pairs.get(observation.fixtureId);
    requireCondition(pair, `Unexpected fixture observation: ${observation.fixtureId}.`);
    requireCondition(!pair[observation.profileId], `Duplicate observation for ${observation.fixtureId}/${observation.profileId}.`);
    pair[observation.profileId] = observation;
  }
  return pairs;
}

function check(id, passed, evidence) {
  return { evidence, id, passed };
}

export function buildCouncilQualityComparison({ fixtureSetHash, observations, replaySemanticHashes }) {
  const pairs = pairByCase(observations);
  const baseline = observations.filter((item) => item.profileId === COUNCIL_BASELINE_PROFILE);
  const candidate = observations.filter((item) => item.profileId === COUNCIL_CANDIDATE_PROFILE);
  const conflict = pairs.get('critical-conflict-stop');
  const control = pairs.get('control-pass');
  const missing = pairs.get('missing-verification-stop');
  const reviewerFailure = pairs.get('reviewer-rubric-failure');
  const boundaryPreserved = observations.every((item) =>
    item.providerId === 'stub'
    && item.boundary.approvalCount === 0
    && item.boundary.executionLeaseCount === 0
    && item.boundary.externalProviderCallCount === 0
    && item.boundary.estimatedCostUsdZero);
  const reviewerNonRegression = [...pairs.values()].every((pair) =>
    !pair[COUNCIL_BASELINE_PROFILE]?.reviewer.correct
    || pair[COUNCIL_CANDIDATE_PROFILE]?.reviewer.correct);
  const checks = [
    check(
      'synthetic-conflict-routing-improved',
      !conflict[COUNCIL_BASELINE_PROFILE].syntheticConflictRoutingDetected
        && conflict[COUNCIL_CANDIDATE_PROFILE].syntheticConflictRoutingDetected
        && !control[COUNCIL_CANDIDATE_PROFILE].syntheticConflictRoutingDetected,
      'Critical fixture routing must improve without a control false positive.',
    ),
    check(
      'unsupported-claim-comparable',
      false,
      'Stub outputs do not provide a semantic grounding oracle shared by both profiles.',
    ),
    check(
      'missing-condition-no-regression',
      [COUNCIL_BASELINE_PROFILE, COUNCIL_CANDIDATE_PROFILE].every((profileId) =>
        JSON.stringify(missing[profileId].missingSpecialistKinds)
          === JSON.stringify(missing[profileId].expectedMissingSpecialistKinds)
        && missing[profileId].reviewer.correct),
      'Both profiles must match the fixture-defined missing verification stop.',
    ),
    check(
      'reviewer-outcome-no-regression',
      reviewerNonRegression,
      `Reviewer failure candidate outcome: ${reviewerFailure[COUNCIL_CANDIDATE_PROFILE].reviewer.outcome}.`,
    ),
    check(
      'stage-count-no-regression',
      candidate.reduce((sum, item) => sum + item.stageCount, 0)
        <= baseline.reduce((sum, item) => sum + item.stageCount, 0),
      'Persisted agentRuns are the exact stage-count unit.',
    ),
    check(
      'cost-and-authority-boundary-preserved',
      boundaryPreserved,
      'All runs must remain explicit stub runs with zero approval, lease, provider response, and estimated cost.',
    ),
    check(
      'deterministic-semantic-replay',
      replaySemanticHashes.length === 2
        && replaySemanticHashes[0] === replaySemanticHashes[1],
      'Two fresh-store replays must have identical allowlisted semantic hashes.',
    ),
  ];
  const failedCheckIds = checks.filter((item) => !item.passed).map((item) => item.id);
  const improvementProven = failedCheckIds.length === 0;
  return {
    aggregates: {
      baselineStageCount: baseline.reduce((sum, item) => sum + item.stageCount, 0),
      candidateStageCount: candidate.reduce((sum, item) => sum + item.stageCount, 0),
      baselineReviewerCorrectCount: baseline.filter((item) => item.reviewer.correct).length,
      candidateReviewerCorrectCount: candidate.filter((item) => item.reviewer.correct).length,
    },
    checks,
    councilProfileStatus: improvementProven ? 'promotion-review-eligible' : 'opt-in-experiment',
    defaultPromotionAuthorized: false,
    failedCheckIds,
    fixtureSetHash,
    improvementProven,
    selectedDefaultProfile: COUNCIL_BASELINE_PROFILE,
    unsupportedClaimAssessment: 'not-comparable',
  };
}

function assertArtifactBindings(observation) {
  const expectedIndexes = observation.artifactBindings.map((_, index) => index);
  const actualIndexes = observation.artifactBindings.map((binding) => binding.artifactIndex);
  requireCondition(
    JSON.stringify(actualIndexes) === JSON.stringify(expectedIndexes),
    `Artifact indexes must be contiguous for ${observation.fixtureId}/${observation.profileId}.`,
  );

  for (const binding of observation.artifactBindings) {
    requireExactKeys(
      binding,
      [
        'artifactIndex',
        'byteLength',
        'fileName',
        'kind',
        'role',
        'runIndex',
        'sha256',
        'specialistKind',
        'stageKind',
      ],
      'artifact binding',
    );
    requireCondition(
      Number.isSafeInteger(binding.byteLength) && binding.byteLength >= 0,
      'Artifact byteLength must be a non-negative safe integer.',
    );
    requireText(binding.fileName, 'artifact fileName');
    requireText(binding.kind, 'artifact kind');
    requireText(binding.role, 'artifact role');
    requireCondition(
      binding.runIndex === null
        || (Number.isSafeInteger(binding.runIndex) && binding.runIndex >= 0),
      'Artifact runIndex must be null or a non-negative safe integer.',
    );
    requireCondition(DIGEST_PATTERN.test(binding.sha256), 'Artifact sha256 must be an exact digest.');
    requireCondition(
      binding.specialistKind === null || Boolean(String(binding.specialistKind).trim()),
      'Artifact specialistKind must be null or non-empty text.',
    );
    requireCondition(
      binding.stageKind === null || Boolean(String(binding.stageKind).trim()),
      'Artifact stageKind must be null or non-empty text.',
    );
  }
}

export function assertCouncilQualityComparison(evidence, fixtures) {
  assertCouncilQualityFixtures(fixtures);
  requireCondition(
    evidence.schemaVersion === COUNCIL_QUALITY_SCHEMA_VERSION,
    'Unsupported council quality comparison schema.',
  );
  requireCondition(evidence.fixtureSetHash === hashCouncilQualityValue(fixtures), 'Fixture set hash mismatch.');
  requireCondition(evidence.productionReadyClaim === false, 'productionReadyClaim must remain false.');
  requireCondition(evidence.costFree === true, 'Comparison must remain cost-free.');
  requireCondition(evidence.externalProviderCalls === 'none', 'External provider calls are not allowed.');
  requireCondition(evidence.modelDownload === false, 'Model download is not allowed.');
  requireCondition(evidence.actualUserDataUsed === false, 'Actual user data is not allowed.');
  requireCondition(evidence.productionDependencyAdded === false, 'Production dependencies are not allowed.');
  requireCondition(evidence.publicContractChanged === false, 'Public contracts must remain unchanged.');
  requireCondition(evidence.storageSchemaChanged === false, 'Storage schema must remain unchanged.');
  requireCondition(evidence.permissionChanged === false, 'Permission behavior must remain unchanged.');
  requireCondition(evidence.approvalOrderingChanged === false, 'Approval ordering must remain unchanged.');
  requireCondition(evidence.observations.length === REQUIRED_CASE_IDS.length * PROFILE_IDS.length, 'Observation count mismatch.');

  const fixturesById = expectedCaseMap(fixtures);
  for (const observation of evidence.observations) {
    requireCondition(fixturesById.has(observation.fixtureId), `Unknown observation fixture: ${observation.fixtureId}.`);
    requireCondition(PROFILE_IDS.includes(observation.profileId), `Unknown observation profile: ${observation.profileId}.`);
    requireCondition(
      observation.semanticHash === hashCouncilQualityValue(metricProjection(observation)),
      `Semantic hash mismatch for ${observation.fixtureId}/${observation.profileId}.`,
    );
    requireCondition(
      observation.artifactBindings.length === observation.artifactCount,
      `Artifact count mismatch for ${observation.fixtureId}/${observation.profileId}.`,
    );
    assertArtifactBindings(observation);
  }

  const expectedComparison = buildCouncilQualityComparison({
    fixtureSetHash: evidence.fixtureSetHash,
    observations: evidence.observations,
    replaySemanticHashes: evidence.determinism.replaySemanticHashes,
  });
  requireCondition(
    formatCouncilQualityValue(evidence.comparison) === formatCouncilQualityValue(expectedComparison),
    'Comparison decision does not match its observations.',
  );
  requireCondition(evidence.comparison.selectedDefaultProfile === COUNCIL_BASELINE_PROFILE, 'Baseline profile must remain selected.');
  requireCondition(evidence.comparison.defaultPromotionAuthorized === false, 'Evidence cannot authorize default promotion.');
  requireCondition(evidence.comparison.improvementProven === false, 'Current evidence must not claim improvement.');
  requireCondition(
    evidence.evidenceHash === hashCouncilQualityValue({
      ...evidence,
      evidenceHash: undefined,
    }),
    'Council quality evidence hash mismatch.',
  );
  return evidence;
}

export function sealCouncilQualityEvidence(evidence) {
  return {
    ...evidence,
    evidenceHash: hashCouncilQualityValue({
      ...evidence,
      evidenceHash: undefined,
    }),
  };
}
