import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { assertClaimSourceAttributionArtifact } from '../src/core/evidence-gated-answer-claim-attribution.mjs';

const repoDir = process.cwd();
const output = path.join(repoDir, 'evidence/output-artifacts/evidence-gated-answer-claim-attribution.json');
const run = spawnSync(process.execPath, ['scripts/evaluate-evidence-gated-answer-claim-attribution.mjs', path.relative(repoDir, output)], { cwd: repoDir, encoding: 'utf8' });
if (run.status !== 0) throw new Error(`Q13 deterministic evaluation failed: ${run.stderr || run.stdout}`);
const artifact = JSON.parse(fs.readFileSync(output, 'utf8'));
assertClaimSourceAttributionArtifact(artifact);
const stat = fs.statSync(output);
if ((stat.mode & 0o777) !== 0o600 || stat.nlink !== 1) throw new Error('Q13 deterministic artifact writer boundary failed.');
console.log(JSON.stringify({ mode: 'smoke-evidence-gated-answer-claim-attribution', ok: true, attributionPassCount: artifact.aggregate.attributionPassCount }, null, 2));
