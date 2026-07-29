import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertCouncilQualityComparison } from '../src/core/council-quality-comparison.mjs';
import { assertLocalCouncilProviderShadowArtifact } from '../src/core/local-council-provider-shadow.mjs';
import { assertC12CandidateArtifact, assertC12Fixture } from '../src/core/local-council-strict-prompt-candidate-qualification.mjs';

const repoDir = process.cwd();
const packageJson = readJson('package.json');
const comparisonArtifact = readJson('evidence/output-artifacts/council-quality-comparison.json');
const fixtures = readJson('fixtures/council-quality-comparison-cases-v1.json');
const localShadowArtifact = readJson('evidence/output-artifacts/local-council-provider-shadow.json');
const localShadowFixtureText = readText('fixtures/local-council-provider-shadow-v1.json');
const plan = readText('docs/multi-agent-council-development-plan-v1.md');
const roadmap = readText('docs/roadmap.md');
const checklist = readText('docs/evidence-checklist.md');
const gallery = readText('docs/evidence-gallery.md');
const references = readText('docs/reference-repos.md');
const manifest = readText('evidence/evidence_manifest.md');
const c12Artifact = readJson('evidence/output-artifacts/local-council-strict-prompt-candidate-qualification.json');
const c12FixtureText = readText('fixtures/local-council-strict-prompt-candidate-qualification-v1.json');

assertCouncilQualityComparison(comparisonArtifact, fixtures);
assertLocalCouncilProviderShadowArtifact(localShadowArtifact, {
  fixtureText: localShadowFixtureText,
});
assertC12Fixture(JSON.parse(c12FixtureText));
assertC12CandidateArtifact(c12Artifact, { c12FixtureText });

assert.equal(
  packageJson.scripts['smoke:council-closeout'],
  'node scripts/smoke-council-closeout.mjs',
);

const { comparison } = comparisonArtifact;
assert.equal(comparison.councilProfileStatus, 'opt-in-experiment');
assert.equal(comparison.selectedDefaultProfile, 'knowledge-triad');
assert.equal(comparison.improvementProven, false);
assert.equal(comparison.defaultPromotionAuthorized, false);
assert.equal(comparison.unsupportedClaimAssessment, 'not-comparable');
assert.deepEqual(comparison.failedCheckIds, [
  'unsupported-claim-comparable',
  'stage-count-no-regression',
]);
assert.equal(comparison.aggregates.baselineStageCount, 26);
assert.equal(comparison.aggregates.candidateStageCount, 34);

assert.equal(comparisonArtifact.costFree, true);
assert.equal(comparisonArtifact.externalProviderCalls, 'none');
assert.equal(comparisonArtifact.modelDownload, false);
assert.equal(comparisonArtifact.productionDependencyAdded, false);
assert.equal(comparisonArtifact.actualUserDataUsed, false);
assert.equal(comparisonArtifact.publicContractChanged, false);
assert.equal(comparisonArtifact.storageSchemaChanged, false);
assert.equal(comparisonArtifact.permissionChanged, false);
assert.equal(comparisonArtifact.approvalOrderingChanged, false);
assert.equal(comparisonArtifact.productionReadyClaim, false);

assert.match(plan, /^# Multi-Agent Council Development Plan v1\n\n- status: completed\n/);
assert.match(plan, /C4 — Research evidence enrichment[\s\S]*status: completed and merged/);
assert.match(plan, /C5 — Closeout and promotion decision[\s\S]*status: completed/);
assert.match(plan, /C6 — Local provider shadow qualification[\s\S]*status: completed/);
assert.match(plan, /C7 — Seat-scoped prompt contract shadow[\s\S]*status: completed/);
assert.match(plan, /C8 — Claim contract robustness shadow[\s\S]*status: completed/);
assert.match(plan, /C9 — Rebuttal contract completion and synthesis shadow[\s\S]*status: completed/);
assert.match(
  plan,
  /C10 — Chair synthesis exact-contract shadow[\s\S]*status: implementation and one unretried local observation complete; promotion remains denied\./,
);
assert.match(
  plan,
  /C11 — Rebuttal stability and chair reachability shadow[\s\S]*status: `completed-keep-stub-only`/,
);
assert.match(
  plan,
  /C12 — Strict prompt candidate qualification[\s\S]*status: `candidate-qualified-keep-stub-only`/,
);
assert.match(plan, /`knowledge-triad`를 default profile로 유지/);
assert.match(plan, /`knowledge-council-triad`는 opt-in experiment로 유지/);
assert.match(plan, /dynamic persona[\s\S]*concurrent dispatch[\s\S]*external research adapter[\s\S]*AirLLM/);
assert.match(plan, /F1\.3 actual private-data evaluation과 training activation은 계속\s+보류/);
assert.match(plan, /productionReadyClaim: false/);

for (const document of [checklist, gallery, manifest]) {
  assert.match(document, /Council C1–C5 closeout/);
  assert.match(document, /knowledge-triad/);
  assert.match(document, /opt-in/);
}

for (const document of [roadmap, checklist, gallery, manifest]) {
  assert.match(
    document,
    /Council C1–C13|Council C1–C9|Council C9 rebuttal contract completion and synthesis shadow|Council C8 claim contract robustness shadow/,
  );
  assert.match(document, /keep-stub-only/);
}

assert.equal(localShadowArtifact.qualification.decision, 'keep-stub-only');
assert.equal(localShadowArtifact.localShadowQualified, false);
assert.equal(localShadowArtifact.defaultProfilePromotionAuthorized, false);
assert.equal(localShadowArtifact.runtimeActivation, false);
assert.equal(localShadowArtifact.apiCostUsd, 0);
assert.equal(localShadowArtifact.externalProviderCallCount, 0);

assert.match(
  manifest,
  /New feature development: yes, F1\.13 private lanes[\s\S]*Council C6–C10 add only content-free local shadow observations and fail-closed contract checks\.[\s\S]*Council C11 adds strict rebuttal-stability and chair-reachability observation, C12 adds deterministic v6 prompt candidate qualification, and C13 records one unretried local v6 observation as `actual-incompatible`\./,
);

for (const artifactPath of [
  'evidence/output-artifacts/local-council-provider-shadow.json',
  'evidence/output-artifacts/local-council-seat-contract-shadow.json',
  'evidence/output-artifacts/local-council-claim-contract-robustness.json',
  'evidence/output-artifacts/local-council-rebuttal-synthesis-shadow.json',
  'evidence/output-artifacts/local-council-chair-synthesis-contract-shadow.json',
  'evidence/output-artifacts/local-council-rebuttal-stability-shadow.json',
  'evidence/output-artifacts/local-council-strict-prompt-candidate-qualification.json',
  'evidence/output-artifacts/local-council-v6-actual-compatibility-attempt.json',
  'evidence/output-artifacts/local-council-v6-actual-compatibility-observation.json',
]) {
  assert.ok(manifest.includes(`- \`${artifactPath}\``), `manifest missing Council artifact ${artifactPath}`);
}

assert.match(manifest, /Council C7 seat-scoped prompt contract shadow/);

assert.match(references, /C5 closeout/);
assert.match(references, /C6 local observation/);
assert.match(references, /dynamic persona/);
assert.match(references, /concurrent dispatch/);
assert.match(references, /external research adapter/);
assert.match(references, /AirLLM/);

console.log(
  JSON.stringify(
    {
      mode: 'council-closeout-smoke',
      ok: true,
      selectedDefaultProfile: comparison.selectedDefaultProfile,
      councilProfileStatus: comparison.councilProfileStatus,
      defaultPromotionAuthorized: comparison.defaultPromotionAuthorized,
      localProviderShadowDecision: localShadowArtifact.qualification.decision,
      c12CandidateStatus: c12Artifact.candidateStatus,
      failedCheckIds: comparison.failedCheckIds,
      stageCounts: {
        baseline: comparison.aggregates.baselineStageCount,
        candidate: comparison.aggregates.candidateStageCount,
      },
      productionReadyClaim: comparisonArtifact.productionReadyClaim,
    },
    null,
    2,
  ),
);

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoDir, relativePath), 'utf8');
}
