import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const tests = [
  'test/fine-tuning-private-reviewed-example-canonicalization.test.mjs',
  'test/fine-tuning-private-reviewed-example-canonicalization-script.test.mjs',
  'test/fine-tuning-private-collection-item-lifecycle-script.test.mjs',
];
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: repoDir, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr || result.stdout);

const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

assert.equal(packageJson.scripts['materialize:fine-tuning-private-reviewed-example'], 'node scripts/materialize-fine-tuning-private-reviewed-example.mjs');
assert.equal(packageJson.scripts['smoke:fine-tuning-private-reviewed-example-canonicalization'], 'node scripts/smoke-fine-tuning-private-reviewed-example-canonicalization.mjs');
for (const marker of [
  'F1.21 Private reviewed-example canonical record materialization protocol',
  'npm run materialize:fine-tuning-private-reviewed-example',
  'npm run smoke:fine-tuning-private-reviewed-example-canonicalization',
  'fineTuningExecutionAuthorized: false',
  'productionReadyClaim: false',
]) assert.ok(plan.includes(marker), `ML/RAG plan missing ${marker}`);
assert.ok(readme.includes('npm run smoke:fine-tuning-private-reviewed-example-canonicalization'));
assert.ok(manifest.includes('Private reviewed-example canonical record materialization: verified with `npm run smoke:fine-tuning-private-reviewed-example-canonicalization`'));

console.log('fine-tuning private reviewed-example canonicalization smoke passed');
