import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertC11BaselineArtifacts,
  assertC11Fixture,
  assertC11LocalCouncilArtifact,
} from '../src/core/local-council-rebuttal-stability-shadow.mjs';

const repoDir = process.cwd();
const fixture = readJson('fixtures/local-council-rebuttal-stability-shadow-v1.json');
assertC11Fixture(fixture);
assertC11BaselineArtifacts({
  artifacts: Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10'].map((key) => [key, readJson(artifactPath(key))])),
  fileSha256: Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10'].map((key) => [key, sha256(artifactPath(key))])),
  fixtureText: {
    c6: read('fixtures/local-council-provider-shadow-v1.json'),
    c7: read('fixtures/local-council-seat-contract-shadow-v1.json'),
    c8: read('fixtures/local-council-claim-contract-robustness-v1.json'),
    c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'),
    c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json'),
  },
});
const actualArtifactPath = 'evidence/output-artifacts/local-council-rebuttal-stability-shadow.json';
const actualObservationArtifactPresent = fs.existsSync(path.join(repoDir, actualArtifactPath));
if (!actualObservationArtifactPresent) throw new Error('C11 actual observation artifact is required.');
assertC11LocalCouncilArtifact(readJson(actualArtifactPath), {
  baselineArtifacts: Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10'].map((key) => [key, readJson(artifactPath(key))])),
  c11FixtureText: read('fixtures/local-council-rebuttal-stability-shadow-v1.json'),
  fileSha256: Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10'].map((key) => [key, sha256(artifactPath(key))])),
  fixtureText: {
    c6: read('fixtures/local-council-provider-shadow-v1.json'), c7: read('fixtures/local-council-seat-contract-shadow-v1.json'),
    c8: read('fixtures/local-council-claim-contract-robustness-v1.json'), c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'),
    c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json'),
  },
});

console.log(JSON.stringify({
  actualObservationArtifactPresent,
  decision: 'keep-stub-only',
  mode: 'smoke-local-council-rebuttal-stability-shadow',
  ok: true,
  promptProfile: fixture.promptProfile,
}, null, 2));

function artifactPath(key) { return `evidence/output-artifacts/${{ c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json', c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json', c10: 'local-council-chair-synthesis-contract-shadow.json' }[key]}`; }
function read(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function sha256(relativePath) { return createHash('sha256').update(read(relativePath)).digest('hex'); }
