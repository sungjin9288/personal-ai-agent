import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const testResult = spawnSync(process.execPath, [
  '--test',
  'test/fine-tuning-private-collection-item-lifecycle.test.mjs',
  'test/fine-tuning-private-collection-item-lifecycle-script.test.mjs',
], { cwd: repoDir, encoding: 'utf8' });

assert.equal(testResult.status, 0, testResult.stderr || testResult.stdout);

const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

assert.equal(
  packageJson.scripts['lifecycle:fine-tuning-private-collection-item'],
  'node scripts/lifecycle-fine-tuning-private-collection-item.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-private-collection-item-lifecycle'],
  'node scripts/smoke-fine-tuning-private-collection-item-lifecycle.mjs',
);
for (const term of [
  'F1.11 Private collection item withdrawal and retention-deletion lifecycle',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-payload-lifecycle',
  'currentFineTuningPrivateCollectionItemLifecycleSurface: `scripts/lifecycle-fine-tuning-private-collection-item.mjs`',
  'fineTuningPrivateCollectionItemLifecycleStatus: protocol-ready-private-withdrawal-or-retention-delete-required',
  'npm run lifecycle:fine-tuning-private-collection-item',
  'npm run smoke:fine-tuning-private-collection-item-lifecycle',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(readme.includes('npm run smoke:fine-tuning-private-collection-item-lifecycle'));
assert.ok(manifest.includes(
  'Fine-tuning private collection item lifecycle protocol: verified with `npm run smoke:fine-tuning-private-collection-item-lifecycle`',
));

console.log('fine-tuning private collection item lifecycle smoke passed');
