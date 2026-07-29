import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { assertC13ActualCompatibilityArtifact, assertC13AttemptReceipt, assertC13BaselineArtifacts, assertC13Fixture } from '../src/core/local-council-v6-actual-compatibility-observation.mjs';

const repoDir = process.cwd();
const outputPath = path.join(repoDir, 'evidence/output-artifacts/local-council-v6-actual-compatibility-observation.json');
const receiptPath = path.join(repoDir, 'evidence/output-artifacts/local-council-v6-actual-compatibility-attempt.json');
if (!fs.existsSync(outputPath) && !fs.existsSync(receiptPath)) {
  console.log(JSON.stringify({ mode: 'smoke-local-council-v6-actual-compatibility-observation', observation: 'pending', ok: true }, null, 2));
  process.exit(0);
}
if (!fs.existsSync(outputPath) || !fs.existsSync(receiptPath)) throw new Error('C13 observation must retain both exclusive attempt receipt and final artifact.');
const fixtureText = read('fixtures/local-council-v6-actual-compatibility-observation-v1.json');
const c11FixtureText = read('fixtures/local-council-rebuttal-stability-shadow-v1.json');
const c12FixtureText = read('fixtures/local-council-strict-prompt-candidate-qualification-v1.json');
const keys = ['c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'];
const artifacts = Object.fromEntries(keys.map((key) => [key, readJson(artifactPath(key))]));
const fileSha256 = Object.fromEntries(keys.map((key) => [key, sha256(artifactPath(key))]));
const fixtureTextByBaseline = { c6: read('fixtures/local-council-provider-shadow-v1.json'), c7: read('fixtures/local-council-seat-contract-shadow-v1.json'), c8: read('fixtures/local-council-claim-contract-robustness-v1.json'), c9: read('fixtures/local-council-rebuttal-synthesis-shadow-v1.json'), c10: read('fixtures/local-council-chair-synthesis-contract-shadow-v1.json') };
assertC13Fixture(JSON.parse(fixtureText));
assertC13BaselineArtifacts({ artifacts, c11FixtureText, c12FixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
const receiptText = fs.readFileSync(receiptPath, 'utf8');
const receipt = JSON.parse(receiptText);
assertC13AttemptReceipt(receipt);
const artifact = readJson(outputPath);
assertC13ActualCompatibilityArtifact(artifact, { attemptReceipt: receipt, attemptReceiptText: receiptText, baselineArtifacts: artifacts, c11FixtureText, c12FixtureText, c13FixtureText: fixtureText, fileSha256, fixtureText: fixtureTextByBaseline });
console.log(JSON.stringify({ chairReachability: artifact.chairReachability, mode: 'smoke-local-council-v6-actual-compatibility-observation', observation: artifact.actualModelCompatibility, ok: true }, null, 2));

function artifactPath(key) { return `evidence/output-artifacts/${{ c6: 'local-council-provider-shadow.json', c7: 'local-council-seat-contract-shadow.json', c8: 'local-council-claim-contract-robustness.json', c9: 'local-council-rebuttal-synthesis-shadow.json', c10: 'local-council-chair-synthesis-contract-shadow.json', c11: 'local-council-rebuttal-stability-shadow.json', c12: 'local-council-strict-prompt-candidate-qualification.json' }[key]}`; }
function read(relativePath) { return fs.readFileSync(path.join(repoDir, relativePath), 'utf8'); }
function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function sha256(relativePath) { return createHash('sha256').update(read(relativePath)).digest('hex'); }
