import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const tests = [
  'test/fine-tuning-private-collection-item-artifact-preparation-resolution.test.mjs',
  'test/fine-tuning-private-collection-item-artifact-preparation-resolution-script.test.mjs',
];
const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: repoDir, encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr || result.stdout);

const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

assert.equal(
  packageJson.scripts['resolve:fine-tuning-private-collection-item-artifact-preparation'],
  'node scripts/resolve-fine-tuning-private-collection-item-artifact-preparation.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-private-collection-item-artifact-preparation-resolution'],
  'node scripts/smoke-fine-tuning-private-collection-item-artifact-preparation-resolution.mjs',
);
for (const term of [
  'F1.15 Private collection item artifact preparation resolution protocol',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-replay',
  'currentFineTuningPrivateCollectionItemArtifactPreparationResolutionSurface: `scripts/resolve-fine-tuning-private-collection-item-artifact-preparation.mjs`',
  'fineTuningPrivateCollectionItemArtifactPreparationResolutionStatus: protocol-ready-private-quality-reviewer-resolution-required',
  'npm run resolve:fine-tuning-private-collection-item-artifact-preparation',
  'npm run smoke:fine-tuning-private-collection-item-artifact-preparation-resolution',
  'artifactPreparationAuthorized: true only after approve',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(readme.includes('npm run smoke:fine-tuning-private-collection-item-artifact-preparation-resolution'));
assert.ok(manifest.includes(
  'Fine-tuning private collection item artifact preparation resolution protocol: verified with `npm run smoke:fine-tuning-private-collection-item-artifact-preparation-resolution`',
));

console.log('fine-tuning private collection item artifact preparation resolution smoke passed');
