import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const tests = [
  'test/fine-tuning-private-collection-item-lifecycle.test.mjs',
  'test/fine-tuning-private-collection-item-lifecycle-script.test.mjs',
  'test/fine-tuning-private-answer-quality-case-payload-lifecycle-script.test.mjs',
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
assert.equal(
  packageJson.scripts[
    'smoke:fine-tuning-private-answer-quality-case-payload-lifecycle'
  ],
  'node scripts/smoke-fine-tuning-private-answer-quality-case-payload-lifecycle.mjs',
);
for (const marker of [
  'payload-first deletion cascade',
  'F1.19 → F1.18 → F1.17 → F1.16 → F1.10',
  'managed namespace',
]) {
  assert.ok(plan.includes(marker), `ML/RAG plan missing ${marker}`);
}
console.log(
  'fine-tuning private answer-quality case payload lifecycle smoke passed',
);
