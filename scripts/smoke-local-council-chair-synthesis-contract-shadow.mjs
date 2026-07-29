import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { assertLocalCouncilProviderShadowArtifact } from '../src/core/local-council-provider-shadow.mjs';
import { assertLocalCouncilSeatContractShadowArtifact } from '../src/core/local-council-seat-contract-shadow.mjs';
import { assertLocalCouncilClaimContractRobustnessArtifact } from '../src/core/local-council-claim-contract-robustness.mjs';
import { assertLocalCouncilRebuttalSynthesisShadowArtifact } from '../src/core/local-council-rebuttal-synthesis-shadow.mjs';
import { assertLocalCouncilChairSynthesisContractShadowArtifact } from '../src/core/local-council-chair-synthesis-contract-shadow.mjs';

const repoDir = process.cwd();
const c6FixtureText = readText('fixtures/local-council-provider-shadow-v1.json');
const c7FixtureText = readText('fixtures/local-council-seat-contract-shadow-v1.json');
const c8FixtureText = readText('fixtures/local-council-claim-contract-robustness-v1.json');
const c9FixtureText = readText('fixtures/local-council-rebuttal-synthesis-shadow-v1.json');
const c10FixtureText = readText('fixtures/local-council-chair-synthesis-contract-shadow-v1.json');
const c6 = readJson('evidence/output-artifacts/local-council-provider-shadow.json');
const c7 = readJson('evidence/output-artifacts/local-council-seat-contract-shadow.json');
const c8 = readJson('evidence/output-artifacts/local-council-claim-contract-robustness.json');
const c9 = readJson('evidence/output-artifacts/local-council-rebuttal-synthesis-shadow.json');
const c10 = readJson('evidence/output-artifacts/local-council-chair-synthesis-contract-shadow.json');

assertLocalCouncilProviderShadowArtifact(c6, { fixtureText: c6FixtureText });
assertLocalCouncilSeatContractShadowArtifact(c7, { baselineArtifact: c6, fixtureText: c7FixtureText });
assertLocalCouncilClaimContractRobustnessArtifact(c8, { c6BaselineArtifact: c6, c7BaselineArtifact: c7, fixtureText: c8FixtureText });
assertLocalCouncilRebuttalSynthesisShadowArtifact(c9, { c6BaselineArtifact: c6, c7BaselineArtifact: c7, c8BaselineArtifact: c8, fixtureText: c9FixtureText });
assertLocalCouncilChairSynthesisContractShadowArtifact(c10, {
  c6BaselineArtifact: c6, c7BaselineArtifact: c7, c8BaselineArtifact: c8, c9BaselineArtifact: c9, fixtureText: c10FixtureText,
});
for (const [key, file] of Object.entries({
  c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json',
  c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json',
})) {
  assert.equal(c10.baseline[key].fileSha256, fileHash(`evidence/output-artifacts/${file}`));
}
assert.equal(c10.localShadowQualified, false);
assert.equal(c10.qualification.decision, 'keep-stub-only');
assert.equal(c10.runtimeActivation, false);
assert.equal(c10.trainingAuthorized, false);
assert.equal(c10.actualUserData, false);
assert.equal(c10.productionReadyClaim, false);

console.log(JSON.stringify({
  chairSynthesisContractPassed: c10.chairSynthesisContractPassed,
  fullContractPassed: c10.fullContractPassed,
  mode: 'smoke-local-council-chair-synthesis-contract-shadow', ok: true,
}, null, 2));

function readJson(relativePath) { return JSON.parse(readText(relativePath)); }
function readText(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function fileHash(relativePath) { return createHash('sha256').update(fs.readFileSync(path.join(repoDir, relativePath))).digest('hex'); }
