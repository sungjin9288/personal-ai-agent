import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertCouncilQualityComparison,
  assertCouncilQualityFixtures,
  buildCouncilQualityComparison,
  hashCouncilQualityValue,
  sealCouncilQualityEvidence,
} from '../src/core/council-quality-comparison.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixtures = JSON.parse(
  fs.readFileSync(
    path.join(repositoryRoot, 'fixtures', 'council-quality-comparison-cases-v1.json'),
    'utf8',
  ),
);

function observation(fixtureId, profileId, overrides = {}) {
  const value = {
    artifactBindings: [],
    artifactCount: 0,
    boundary: {
      approvalCount: 0,
      estimatedCostUsdZero: true,
      executionLeaseCount: 0,
      externalProviderCallCount: 0,
    },
    fixtureId,
    expectedMissingSpecialistKinds: [],
    missionStatus: 'completed',
    missingSpecialistKinds: [],
    profileId,
    providerId: 'stub',
    reviewer: {
      correct: true,
      expectedMissionStatus: 'completed',
      expectedOutcome: 'pass',
      outcome: 'pass',
      sessionStatus: 'completed',
    },
    stageCount: 7,
    stageSequence: ['manager:manager'],
    syntheticConflictRoutingDetected: false,
    ...overrides,
  };
  return {
    ...value,
    semanticHash: hashCouncilQualityValue({
      artifactCount: value.artifactCount,
      artifactShape: [],
      boundary: value.boundary,
      fixtureId: value.fixtureId,
      expectedMissingSpecialistKinds: value.expectedMissingSpecialistKinds,
      missionStatus: value.missionStatus,
      missingSpecialistKinds: value.missingSpecialistKinds,
      profileId: value.profileId,
      providerId: value.providerId,
      reviewer: value.reviewer,
      stageCount: value.stageCount,
      stageSequence: value.stageSequence,
      syntheticConflictRoutingDetected: value.syntheticConflictRoutingDetected,
    }),
  };
}

function comparisonObservations() {
  const observations = [];
  for (const fixture of fixtures.cases) {
    for (const profileId of ['knowledge-triad', 'knowledge-council-triad']) {
      const expected = fixture.expected;
      const overrides = {
        expectedMissingSpecialistKinds: expected.missingSpecialistKinds,
        missionStatus: expected.missionStatus,
        missingSpecialistKinds: expected.missingSpecialistKinds,
        reviewer: {
          correct: true,
          expectedMissionStatus: expected.missionStatus,
          expectedOutcome: expected.reviewerOutcome,
          outcome: expected.reviewerOutcome,
          sessionStatus: expected.missionStatus,
        },
        syntheticConflictRoutingDetected:
          fixture.id === 'critical-conflict-stop'
          && profileId === 'knowledge-council-triad',
      };
      observations.push(observation(fixture.id, profileId, overrides));
    }
  }
  return observations;
}

test('council quality fixture contract is exact and production claim stays false', () => {
  assert.equal(assertCouncilQualityFixtures(fixtures), fixtures);

  const changed = structuredClone(fixtures);
  changed.productionReadyClaim = true;
  assert.throws(
    () => assertCouncilQualityFixtures(changed),
    /productionReadyClaim must remain false/,
  );

  const missing = structuredClone(fixtures);
  missing.cases.pop();
  assert.throws(
    () => assertCouncilQualityFixtures(missing),
    /all required cases/,
  );
});

test('unsupported claim not-comparable keeps baseline even when other observations pass', () => {
  const observations = comparisonObservations();
  const replayHash = hashCouncilQualityValue(
    observations.map((item) => item.semanticHash),
  );
  const comparison = buildCouncilQualityComparison({
    fixtureSetHash: hashCouncilQualityValue(fixtures),
    observations,
    replaySemanticHashes: [replayHash, replayHash],
  });

  assert.equal(comparison.unsupportedClaimAssessment, 'not-comparable');
  assert.equal(comparison.improvementProven, false);
  assert.equal(comparison.defaultPromotionAuthorized, false);
  assert.equal(comparison.selectedDefaultProfile, 'knowledge-triad');
  assert.ok(comparison.failedCheckIds.includes('unsupported-claim-comparable'));
});

test('reviewer false pass and boundary side effects reject candidate promotion', () => {
  const observations = comparisonObservations();
  const reviewerCandidate = observations.find((item) =>
    item.fixtureId === 'reviewer-rubric-failure'
    && item.profileId === 'knowledge-council-triad');
  reviewerCandidate.reviewer = {
    ...reviewerCandidate.reviewer,
    correct: false,
    outcome: 'pass',
  };
  const controlCandidate = observations.find((item) =>
    item.fixtureId === 'control-pass'
    && item.profileId === 'knowledge-council-triad');
  controlCandidate.boundary = {
    ...controlCandidate.boundary,
    executionLeaseCount: 1,
  };
  const comparison = buildCouncilQualityComparison({
    fixtureSetHash: hashCouncilQualityValue(fixtures),
    observations,
    replaySemanticHashes: ['sha256:a', 'sha256:b'],
  });

  assert.deepEqual(
    comparison.failedCheckIds.filter((id) =>
      [
        'reviewer-outcome-no-regression',
        'cost-and-authority-boundary-preserved',
        'deterministic-semantic-replay',
      ].includes(id)),
    [
      'reviewer-outcome-no-regression',
      'cost-and-authority-boundary-preserved',
      'deterministic-semantic-replay',
    ],
  );
  assert.equal(comparison.selectedDefaultProfile, 'knowledge-triad');
});

test('missing condition must match the fixture instead of only matching the other profile', () => {
  const observations = comparisonObservations();
  for (const item of observations.filter((observation) =>
    observation.fixtureId === 'missing-verification-stop')) {
    item.missingSpecialistKinds = [];
  }
  const replayHash = hashCouncilQualityValue(
    observations.map((item) => item.semanticHash),
  );
  const comparison = buildCouncilQualityComparison({
    fixtureSetHash: hashCouncilQualityValue(fixtures),
    observations,
    replaySemanticHashes: [replayHash, replayHash],
  });

  assert.ok(comparison.failedCheckIds.includes('missing-condition-no-regression'));
  assert.equal(comparison.defaultPromotionAuthorized, false);
});

test('comparison assertion rejects a tampered evidence hash', () => {
  const trackedPath = path.join(
    repositoryRoot,
    'evidence',
    'output-artifacts',
    'council-quality-comparison.json',
  );
  if (!fs.existsSync(trackedPath)) {
    return;
  }
  const evidence = JSON.parse(fs.readFileSync(trackedPath, 'utf8'));
  evidence.comparison.selectedDefaultProfile = 'knowledge-council-triad';
  assert.throws(
    () => assertCouncilQualityComparison(evidence, fixtures),
    /Comparison decision does not match|Baseline profile must remain selected/,
  );
});

test('comparison assertion rejects a malformed exact artifact binding after reseal', () => {
  const evidence = JSON.parse(
    fs.readFileSync(
      path.join(
        repositoryRoot,
        'evidence',
        'output-artifacts',
        'council-quality-comparison.json',
      ),
      'utf8',
    ),
  );
  evidence.observations[0].artifactBindings[0].sha256 = 'not-a-sha256';
  const resealed = sealCouncilQualityEvidence(evidence);

  assert.throws(
    () => assertCouncilQualityComparison(resealed, fixtures),
    /Artifact sha256 must be an exact digest/,
  );
});
