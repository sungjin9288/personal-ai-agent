import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const testResult = spawnSync(process.execPath, [
  '--test',
  'test/fine-tuning-private-collection-item-review-projection.test.mjs',
  'test/fine-tuning-private-collection-item-review-projection-script.test.mjs',
], { cwd: repoDir, encoding: 'utf8' });

assert.equal(testResult.status, 0, testResult.stderr || testResult.stdout);

const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

assert.equal(
  packageJson.scripts['project:fine-tuning-private-collection-item-review'],
  'node scripts/project-fine-tuning-private-collection-item-review.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-private-collection-item-review-projection'],
  'node scripts/smoke-fine-tuning-private-collection-item-review-projection.mjs',
);
for (const term of [
  'F1.12 Private collection item review projection protocol',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-materialization-protocol',
  'currentFineTuningPrivateCollectionItemReviewProjectionSurface: `scripts/project-fine-tuning-private-collection-item-review.mjs`',
  'fineTuningPrivateCollectionItemReviewProjectionStatus: protocol-ready-private-item-review-projection-required',
  'Private collection item review projection protocol',
  'npm run project:fine-tuning-private-collection-item-review',
  'npm run smoke:fine-tuning-private-collection-item-review-projection',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(readme.includes('npm run smoke:fine-tuning-private-collection-item-review-projection'));
assert.ok(manifest.includes(
  'Fine-tuning private collection item review projection protocol: verified with `npm run smoke:fine-tuning-private-collection-item-review-projection`',
));

console.log('fine-tuning private collection item review projection smoke passed');
