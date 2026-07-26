import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingRuntimeClosureProvenance,
} from './evaluate-local-training-runtime-closure-provenance.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-runtime-closure-provenance.json',
);
const expected = await evaluateLocalTrainingRuntimeClosureProvenance({
  repoDir,
});
const stored = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const serialized = JSON.stringify(stored);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
);
const docs = {
  checklist: fs.readFileSync(
    path.join(repoDir, 'docs', 'evidence-checklist.md'),
    'utf8',
  ),
  gallery: fs.readFileSync(
    path.join(repoDir, 'docs', 'evidence-gallery.md'),
    'utf8',
  ),
  manifest: fs.readFileSync(
    path.join(repoDir, 'evidence', 'evidence_manifest.md'),
    'utf8',
  ),
  plan: fs.readFileSync(
    path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
    'utf8',
  ),
  readme: fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8'),
  summary: fs.readFileSync(
    path.join(repoDir, 'docs', 'smoke-validation-summary-v1.md'),
    'utf8',
  ),
};

const { evidenceHash, id, ...content } = stored;
const expectedHash = createHash('sha256')
  .update(JSON.stringify(content))
  .digest('hex');
assert.equal(evidenceHash, expectedHash);
assert.equal(
  id,
  `local-training-runtime-closure-provenance-evidence-${expectedHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(stored.costFree, true);
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
assert.equal(stored.claimBoundary.staticRuntimeClosureValidated, true);
assert.equal(stored.claimBoundary.dynamicRuntimeClosureComplete, false);
assert.equal(stored.claimBoundary.nativeClosureComplete, false);
assert.equal(stored.claimBoundary.verifyToExecClosed, false);
for (const field of [
  'actualDependencyInstallationPerformed',
  'actualMlxProcessSpawned',
  'actualModelDownloadPerformed',
  'actualModelTrainingExecuted',
  'externalSubmissionAuthorized',
  'productionReadyClaim',
  'rolloutAuthorized',
  'trainingAuthorized',
]) {
  assert.equal(stored.claimBoundary[field], false);
}
assert.equal(stored.claimBoundary.externalProviderCalls, 'none');
for (const forbidden of [
  '/Users/',
  '/private/var/',
  'fixture-only-no-training',
  'training-runtime-closure-evidence-',
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    `runtime closure evidence contains ${forbidden}`,
  );
}

assert.equal(
  packageJson.scripts['build:local-training-runtime-closure-provenance-evidence'],
  'node scripts/build-local-training-runtime-closure-provenance-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-training-runtime-closure-provenance'],
  'node scripts/smoke-local-training-runtime-closure-provenance.mjs',
);
for (const term of [
  '| F2c.22 Static training runtime closure provenance | 완료 · fixture 증적 |',
  'staticRuntimeClosureValidated: true',
  'dynamicRuntimeClosureComplete: false',
  'nativeClosureComplete: false',
  'verifyToExecClosed: false',
  'npm run smoke:local-training-runtime-closure-provenance',
]) {
  assert.ok(docs.plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-training-runtime-closure-provenance',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Static training runtime closure provenance | `evidence/output-artifacts/local-training-runtime-closure-provenance.json` |',
  ),
);
assert.ok(
  docs.checklist.includes(
    '| F2c.22 Static training runtime closure provenance | 완료 · fixture 증적 |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Static training runtime closure provenance: verified with `npm run smoke:local-training-runtime-closure-provenance`',
  ),
);
assert.ok(
  docs.summary.includes(
    '| F2c.22 Static training runtime closure provenance | `npm run smoke:local-training-runtime-closure-provenance` |',
  ),
);

console.log(JSON.stringify({
  actualMlxProcessSpawned: false,
  evidenceHash: stored.evidenceHash,
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
