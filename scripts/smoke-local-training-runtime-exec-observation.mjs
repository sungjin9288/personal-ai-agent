import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingRuntimeExecObservation,
} from './evaluate-local-training-runtime-exec-observation.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-runtime-exec-observation.json',
);
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
  `local-training-runtime-exec-observation-evidence-${expectedHash}`,
);
if (process.platform === 'darwin') {
  const expected = await evaluateLocalTrainingRuntimeExecObservation({
    repoDir,
  });
  assert.deepEqual(stored, expected);
}
assert.equal(stored.costFree, true);
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
for (const field of [
  'actualDarwinFixtureDynamicModuleSetObserved',
  'actualDarwinFixtureEntryIdentityObserved',
  'actualDarwinFixtureExecutableIdentityObserved',
  'actualDarwinFixtureRuntimeImageSetObserved',
]) {
  assert.equal(stored.claimBoundary[field], true);
}
for (const field of [
  'actualDependencyInstallationPerformed',
  'actualMlxProcessSpawned',
  'actualMlxRuntimeImageSetObserved',
  'actualModelDownloadPerformed',
  'actualModelTrainingExecuted',
  'dynamicRuntimeClosureComplete',
  'externalSubmissionAuthorized',
  'nativeClosureComplete',
  'productionReadyClaim',
  'rolloutAuthorized',
  'trainingAuthorized',
  'verifyToExecClosed',
]) {
  assert.equal(stored.claimBoundary[field], false);
}
assert.equal(stored.claimBoundary.externalProviderCalls, 'none');
assert.equal(stored.limitations.lateLazyLoadClosureComplete, false);
assert.equal(
  stored.limitations.runtimeImageBytesIndependentlyVerified,
  false,
);
assert.equal(stored.limitations.sameUserMutationResistance, false);
for (const forbidden of [
  '/Users/',
  '/private/var/',
  '/System/',
  '/usr/lib/',
  'DYLD_',
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    `runtime exec observation evidence contains ${forbidden}`,
  );
}

assert.equal(
  packageJson.scripts[
    'build:local-training-runtime-exec-observation-evidence'
  ],
  'node scripts/build-local-training-runtime-exec-observation-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-training-runtime-exec-observation'],
  'node scripts/smoke-local-training-runtime-exec-observation.mjs',
);
for (const term of [
  '| F2c.25 Darwin runtime exec observation | 완료 · actual fixture 증적 |',
  'actualDarwinFixtureRuntimeImageSetObserved: true',
  'actualMlxRuntimeImageSetObserved: false',
  'verifyToExecClosed: false',
  'npm run smoke:local-training-runtime-exec-observation',
]) {
  assert.ok(docs.plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-training-runtime-exec-observation',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Darwin runtime exec observation | `evidence/output-artifacts/local-training-runtime-exec-observation.json` |',
  ),
);
assert.ok(
  docs.checklist.includes(
    '| F2c.25 Darwin runtime exec observation | 완료 · actual fixture 증적 |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Darwin runtime exec observation: verified with `npm run smoke:local-training-runtime-exec-observation`',
  ),
);
assert.ok(
  docs.summary.includes(
    '| F2c.25 Darwin runtime exec observation | `npm run smoke:local-training-runtime-exec-observation` |',
  ),
);

console.log(JSON.stringify({
  actualDarwinFixtureRuntimeImageSetObserved: true,
  actualMlxRuntimeImageSetObserved: false,
  evidenceHash: stored.evidenceHash,
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
  verifyToExecClosed: false,
}, null, 2));
