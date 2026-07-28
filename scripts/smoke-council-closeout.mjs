import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { assertCouncilQualityComparison } from '../src/core/council-quality-comparison.mjs';
import { assertLocalCouncilProviderShadowArtifact } from '../src/core/local-council-provider-shadow.mjs';

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

assertCouncilQualityComparison(comparisonArtifact, fixtures);
assertLocalCouncilProviderShadowArtifact(localShadowArtifact, {
  fixtureText: localShadowFixtureText,
});

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
  assert.match(document, /Council C1–C6|Council C6 local provider shadow qualification/);
  assert.match(document, /keep-stub-only/);
}

assert.equal(localShadowArtifact.qualification.decision, 'keep-stub-only');
assert.equal(localShadowArtifact.localShadowQualified, false);
assert.equal(localShadowArtifact.defaultProfilePromotionAuthorized, false);
assert.equal(localShadowArtifact.runtimeActivation, false);
assert.equal(localShadowArtifact.apiCostUsd, 0);
assert.equal(localShadowArtifact.externalProviderCallCount, 0);

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
