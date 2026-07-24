import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const result = spawnSync(process.execPath, ['--test', 'test/fine-tuning-private-answer-quality-case-replay-script.test.mjs'], {
  cwd: repoDir,
  encoding: 'utf8',
});
assert.equal(result.status, 0, result.stderr || result.stdout);
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
assert.equal(packageJson.scripts['replay:fine-tuning-private-answer-quality-case-payload'], 'node scripts/replay-fine-tuning-private-answer-quality-case-payload.mjs');
assert.equal(packageJson.scripts['smoke:fine-tuning-private-answer-quality-case-replay'], 'node scripts/smoke-fine-tuning-private-answer-quality-case-replay.mjs');
for (const marker of [
  'F1.20 Private answer-quality payload replay',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-replay',
  'npm run replay:fine-tuning-private-answer-quality-case-payload',
  'local-frozen-q1-payload-replay-only',
  'actualModelEvaluated: false',
  'productionReadyClaim: false',
]) assert.ok(plan.includes(marker), `ML/RAG plan missing ${marker}`);
console.log('fine-tuning private answer-quality case replay smoke passed');
