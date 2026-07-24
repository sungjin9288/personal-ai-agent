import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const tests = [
  'test/fine-tuning-private-answer-quality-case.test.mjs',
  'test/fine-tuning-private-answer-quality-case-script.test.mjs',
];
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: repoDir, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr || result.stdout);
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
assert.equal(packageJson.scripts['materialize:fine-tuning-private-answer-quality-case'], 'node scripts/materialize-fine-tuning-private-answer-quality-case.mjs');
assert.equal(packageJson.scripts['smoke:fine-tuning-private-answer-quality-case'], 'node scripts/smoke-fine-tuning-private-answer-quality-case.mjs');
for (const marker of [
  'F1.18 Private answer-quality case materialization protocol',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-materialization-protocol',
  'npm run materialize:fine-tuning-private-answer-quality-case',
  'q1ContractSatisfied: true only after fixed local evaluation passes',
  'F1.19',
]) assert.ok(plan.includes(marker), `ML/RAG plan missing ${marker}`);
assert.ok(readme.includes('npm run smoke:fine-tuning-private-answer-quality-case'));
console.log('fine-tuning private answer-quality case materialization smoke passed');
