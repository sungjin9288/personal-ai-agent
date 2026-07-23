import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const result = spawnSync(process.execPath, [
  '--test',
  'test/fine-tuning-private-collection-item-review-resolution.test.mjs',
  'test/fine-tuning-private-collection-item-review-resolution-script.test.mjs',
], { cwd: repoDir, encoding: 'utf8' });

assert.equal(result.status, 0, result.stderr || result.stdout);

const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

assert.equal(
  packageJson.scripts['resolve:fine-tuning-private-collection-item-review'],
  'node scripts/resolve-fine-tuning-private-collection-item-review.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-private-collection-item-review-resolution'],
  'node scripts/smoke-fine-tuning-private-collection-item-review-resolution.mjs',
);
for (const term of [
  'F1.13 Private collection item review resolution protocol',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-protocol',
  'currentFineTuningPrivateCollectionItemReviewResolutionSurface: `scripts/resolve-fine-tuning-private-collection-item-review.mjs`',
  'fineTuningPrivateCollectionItemReviewResolutionStatus: protocol-ready-private-owner-resolution-required',
  'Private collection item review resolution protocol',
  'npm run resolve:fine-tuning-private-collection-item-review',
  'npm run smoke:fine-tuning-private-collection-item-review-resolution',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(readme.includes('npm run smoke:fine-tuning-private-collection-item-review-resolution'));
assert.ok(manifest.includes(
  'Fine-tuning private collection item review resolution protocol: verified with `npm run smoke:fine-tuning-private-collection-item-review-resolution`',
));

console.log('fine-tuning private collection item review resolution smoke passed');
