import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const tests = [
  'test/fine-tuning-private-answer-quality-case-payload.test.mjs',
  'test/fine-tuning-private-answer-quality-case-payload-script.test.mjs',
];
const result = spawnSync(process.execPath, ['--test', ...tests], {
  cwd: repoDir,
  encoding: 'utf8',
});
assert.equal(result.status, 0, result.stderr || result.stdout);

const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
);
const plan = fs.readFileSync(
  path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
  'utf8',
);
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
assert.equal(
  packageJson.scripts[
    'materialize:fine-tuning-private-answer-quality-case-payload'
  ],
  'node scripts/materialize-fine-tuning-private-answer-quality-case-payload.mjs',
);
assert.equal(
  packageJson.scripts[
    'smoke:fine-tuning-private-answer-quality-case-payload'
  ],
  'node scripts/smoke-fine-tuning-private-answer-quality-case-payload.mjs',
);
for (const marker of [
  'F1.19 Private answer-quality case payload lifecycle',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-replay',
  'npm run materialize:fine-tuning-private-answer-quality-case-payload',
  'local-answer-quality-evaluation-replay-only',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(marker), `ML/RAG plan missing ${marker}`);
}
assert.ok(
  readme.includes(
    'npm run smoke:fine-tuning-private-answer-quality-case-payload',
  ),
);
console.log(
  'fine-tuning private answer-quality case payload materialization smoke passed',
);
