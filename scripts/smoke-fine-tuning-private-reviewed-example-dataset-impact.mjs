import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const result = spawnSync(process.execPath, ['--test',
  'test/fine-tuning-private-reviewed-example-dataset-impact.test.mjs',
  'test/fine-tuning-private-reviewed-example-dataset-impact-script.test.mjs',
], { cwd: repoDir, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr || result.stdout);
const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs/ml-rag-development-plan-v1.md'), 'utf8');
assert.equal(
  packageJson.scripts[
    'project:fine-tuning-private-reviewed-example-dataset-impact'
  ],
  'node scripts/project-fine-tuning-private-reviewed-example-dataset-impact.mjs',
);
assert.ok(plan.includes('F1.22 Private dataset rebuild and sufficiency reassessment shadow'));
console.log('fine-tuning private reviewed-example dataset impact smoke passed');
