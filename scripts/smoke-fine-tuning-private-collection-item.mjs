import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const testResult = spawnSync(process.execPath, [
  '--test',
  'test/fine-tuning-private-collection-item.test.mjs',
  'test/fine-tuning-private-collection-item-script.test.mjs',
], {
  cwd: repoDir,
  encoding: 'utf8',
});

assert.equal(testResult.status, 0, testResult.stderr || testResult.stdout);

const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

assert.equal(
  packageJson.scripts['write:fine-tuning-private-collection-item'],
  'node scripts/write-fine-tuning-private-collection-item.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-private-collection-item'],
  'node scripts/smoke-fine-tuning-private-collection-item.mjs',
);
for (const term of [
  'F1.10 Private collection item write protocol',
  'fineTuningPrivateCollectionItemWriteStatus: protocol-ready-sanitized-synthetic-item-write-required',
  'npm run write:fine-tuning-private-collection-item',
  'npm run smoke:fine-tuning-private-collection-item',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(readme.includes('npm run smoke:fine-tuning-private-collection-item'));
assert.ok(manifest.includes(
  'Fine-tuning private collection item write protocol: verified with `npm run smoke:fine-tuning-private-collection-item`',
));

console.log('fine-tuning private collection item smoke passed');
