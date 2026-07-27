import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COUNCIL_BASELINE_PROFILE,
  assertCouncilQualityComparison,
} from '../src/core/council-quality-comparison.mjs';
import { evaluateCouncilQualityComparison } from './evaluate-council-quality-comparison.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(
  repositoryRoot,
  'fixtures',
  'council-quality-comparison-cases-v1.json',
);
const evidencePath = path.join(
  repositoryRoot,
  'evidence',
  'output-artifacts',
  'council-quality-comparison.json',
);

const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const trackedEvidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
assertCouncilQualityComparison(trackedEvidence, fixtures);

const freshEvidence = await evaluateCouncilQualityComparison({ fixturePath });
assertCouncilQualityComparison(freshEvidence, fixtures);

for (const evidence of [trackedEvidence, freshEvidence]) {
  assert.equal(evidence.comparison.selectedDefaultProfile, COUNCIL_BASELINE_PROFILE);
  assert.equal(evidence.comparison.councilProfileStatus, 'opt-in-experiment');
  assert.equal(evidence.comparison.improvementProven, false);
  assert.equal(evidence.comparison.defaultPromotionAuthorized, false);
  assert.equal(evidence.comparison.unsupportedClaimAssessment, 'not-comparable');
  assert.equal(evidence.productionReadyClaim, false);
  assert.equal(evidence.externalProviderCalls, 'none');
  assert.equal(evidence.determinism.replaySemanticHashes[0], evidence.determinism.replaySemanticHashes[1]);
  assert.deepEqual(
    evidence.comparison.failedCheckIds,
    [
      'unsupported-claim-comparable',
      'reviewer-outcome-no-regression',
      'stage-count-no-regression',
    ],
  );

  const conflictCandidate = evidence.observations.find((item) =>
    item.fixtureId === 'critical-conflict-stop'
    && item.profileId === 'knowledge-council-triad');
  const reviewerFailureBaseline = evidence.observations.find((item) =>
    item.fixtureId === 'reviewer-rubric-failure'
    && item.profileId === 'knowledge-triad');
  const reviewerFailureCandidate = evidence.observations.find((item) =>
    item.fixtureId === 'reviewer-rubric-failure'
    && item.profileId === 'knowledge-council-triad');

  assert.equal(conflictCandidate.syntheticConflictRoutingDetected, true);
  assert.equal(conflictCandidate.reviewer.outcome, 'absent');
  assert.equal(reviewerFailureBaseline.reviewer.outcome, 'fail');
  assert.equal(reviewerFailureCandidate.reviewer.outcome, 'pass');
  assert.equal(reviewerFailureCandidate.reviewer.correct, false);
}

assert.deepEqual(
  trackedEvidence.observations.map((item) => item.semanticHash),
  freshEvidence.observations.map((item) => item.semanticHash),
);

console.log(
  JSON.stringify(
    {
      baselineStageCount: freshEvidence.comparison.aggregates.baselineStageCount,
      candidateStageCount: freshEvidence.comparison.aggregates.candidateStageCount,
      decision: freshEvidence.comparison.selectedDefaultProfile,
      failedCheckIds: freshEvidence.comparison.failedCheckIds,
      mode: 'council-quality-comparison',
      ok: true,
    },
    null,
    2,
  ),
);
