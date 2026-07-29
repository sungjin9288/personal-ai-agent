import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertC12BaselineArtifacts,
  assertC12CandidateArtifact,
  assertC12Fixture,
} from '../src/core/local-council-strict-prompt-candidate-qualification.mjs';

const repoDir = process.cwd();
const fixtureText = read('fixtures/local-council-strict-prompt-candidate-qualification-v1.json');
const c11FixtureText = read('fixtures/local-council-rebuttal-stability-shadow-v1.json');
const baseline = Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10', 'c11'].map((key) => [key, readJson(artifactPath(key))]));
const fileSha256 = Object.fromEntries(['c6', 'c7', 'c8', 'c9', 'c10', 'c11'].map((key) => [key, sha256(artifactPath(key))]));
const fixtureTextByBaseline = {
  c6: read('fixtures/local-council-provider-shadow-v1.json'), c7: read('fixtures/local-council-seat-contract-shadow-v1.json'),
  c8: read('fixtures/local-council-claim-contract-robustness-v1.json'), c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'),
  c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json'),
};
assertC12Fixture(JSON.parse(fixtureText));
assertC12BaselineArtifacts({ artifacts: baseline, c11FixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
const artifact = readJson('evidence/output-artifacts/local-council-strict-prompt-candidate-qualification.json');
assertC12CandidateArtifact(artifact, { baselineArtifacts: baseline, c11FixtureText, c12FixtureText: fixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
console.log(JSON.stringify({ candidateStatus: artifact.candidateStatus, mode: 'smoke-local-council-strict-prompt-candidate-qualification', ok: true, passedCallCount: artifact.summary.passedCallCount }, null, 2));

function artifactPath(key) { return `evidence/output-artifacts/${{ c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json', c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json', c10: 'local-council-chair-synthesis-contract-shadow.json', c11: 'local-council-rebuttal-stability-shadow.json' }[key]}`; }
function read(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function readJson(relativePath) { return JSON.parse(read(relativePath)); }
function sha256(relativePath) { return createHash('sha256').update(read(relativePath)).digest('hex'); }
