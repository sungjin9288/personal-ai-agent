import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoDir = process.cwd();
const result = spawnSync(
  process.execPath,
  [
    '--test',
    'test/fine-tuning-private-collection-item-artifact-request.test.mjs',
    'test/fine-tuning-private-collection-item-artifact-request-script.test.mjs',
  ],
  { cwd: repoDir, encoding: 'utf8' },
);

assert.equal(result.status, 0, result.stderr || result.stdout);

const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');

assert.equal(
  packageJson.scripts['request:fine-tuning-private-collection-item-artifact'],
  'node scripts/request-fine-tuning-private-collection-item-artifact.mjs',
);
assert.equal(
  packageJson.scripts['smoke:fine-tuning-private-collection-item-artifact-request'],
  'node scripts/smoke-fine-tuning-private-collection-item-artifact-request.mjs',
);

for (const term of [
  'F1.14 Private collection item artifact request protocol',
  'currentCostFreeMilestone: fine-tuning-private-answer-quality-case-materialization-protocol',
  'currentFineTuningPrivateCollectionItemArtifactRequestSurface: `scripts/request-fine-tuning-private-collection-item-artifact.mjs`',
  'fineTuningPrivateCollectionItemArtifactRequestStatus: protocol-ready-private-artifact-preparation-request-required',
  'npm run request:fine-tuning-private-collection-item-artifact',
  'npm run smoke:fine-tuning-private-collection-item-artifact-request',
  'artifactPreparationAuthorized: false',
  'productionReadyClaim: false',
]) {
  assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
}

assert.ok(readme.includes('npm run smoke:fine-tuning-private-collection-item-artifact-request'));
assert.ok(manifest.includes(
  'Fine-tuning private collection item artifact request protocol: verified with `npm run smoke:fine-tuning-private-collection-item-artifact-request`',
));

console.log('fine-tuning private collection item artifact request smoke passed');
