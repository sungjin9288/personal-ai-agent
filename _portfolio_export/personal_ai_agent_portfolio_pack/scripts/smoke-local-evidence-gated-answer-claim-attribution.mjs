import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { assertLocalClaimSourceAttributionArtifact } from '../src/core/evidence-gated-answer-claim-attribution.mjs';

const repoDir = process.cwd();
const output = 'evidence/output-artifacts/local-evidence-gated-answer-claim-attribution.json';
const run = spawnSync(process.execPath, ['scripts/evaluate-local-evidence-gated-answer-claim-attribution.mjs', '--endpoint', 'http://127.0.0.1:11434', '--model', 'qwen2.5:3b', '--cloud-features-disabled', 'true', '--output', output], { cwd: repoDir, encoding: 'utf8', timeout: 600000 });
if (run.status !== 0) throw new Error(`Q13 local evaluation failed: ${run.stderr || run.stdout}`);
const artifact = JSON.parse(fs.readFileSync(path.join(repoDir, output), 'utf8'));
const deterministicArtifact = JSON.parse(fs.readFileSync(path.join(repoDir, 'evidence/output-artifacts/evidence-gated-answer-claim-attribution.json'), 'utf8'));
const fixtureText = fs.readFileSync(path.join(repoDir, 'fixtures/evidence-gated-answer-claim-attribution-cases-v1.json'), 'utf8');
const fixture = JSON.parse(fixtureText);
assertLocalClaimSourceAttributionArtifact(artifact, { deterministicArtifact, fixture, fixtureText, requireCandidatePass: true });
const stat = fs.statSync(path.join(repoDir, output));
if ((stat.mode & 0o777) !== 0o600 || stat.nlink !== 1) throw new Error('Q13 local artifact writer boundary failed.');
console.log(JSON.stringify({ attributionPassCount: artifact.suiteAggregate.attributionPassCount, mode: 'smoke-local-evidence-gated-answer-claim-attribution', ok: true }, null, 2));
