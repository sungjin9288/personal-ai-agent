import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingRuntimeImageProvenance,
} from './evaluate-local-training-runtime-image-provenance.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-runtime-image-provenance.json',
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
  `local-training-runtime-image-provenance-evidence-${expectedHash}`,
);
if (process.platform === 'darwin') {
  const expected = await evaluateLocalTrainingRuntimeImageProvenance({
    repoDir,
  });
  assert.deepEqual(stored, expected);
}
assert.equal(stored.costFree, true);
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
for (const field of [
  'actualDarwinFixtureRegularRuntimeImageBytesVerified',
  'actualDarwinFixtureRuntimeImageProvenanceValidated',
  'actualDarwinFixtureSharedCacheImageIdentityVerified',
]) {
  assert.equal(stored.claimBoundary[field], true);
}
for (const field of [
  'actualDependencyInstallationPerformed',
  'actualMlxNativeRuntimeClosureValidated',
  'actualMlxProcessSpawned',
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
assert.equal(
  stored.limitations.crossProcessImageSetEqualityValidated,
  false,
);
assert.equal(stored.limitations.lateLazyLoadClosureComplete, false);
assert.equal(
  stored.limitations.mlxRuntimeImageProvenanceValidated,
  false,
);
assert.equal(stored.limitations.sameUserMutationResistance, false);
assert.equal(
  stored.limitations.sharedCacheSubcacheBytesHashed,
  false,
);
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
    `runtime image provenance evidence contains ${forbidden}`,
  );
}

assert.equal(
  packageJson.scripts[
    'build:local-training-runtime-image-provenance-evidence'
  ],
  'node scripts/build-local-training-runtime-image-provenance-evidence.mjs',
);
assert.equal(
  packageJson.scripts[
    'smoke:local-training-runtime-image-provenance'
  ],
  'node scripts/smoke-local-training-runtime-image-provenance.mjs',
);
for (const term of [
  '| F2c.26 Darwin runtime image provenance | 완료 · actual fixture 증적 |',
  'actualDarwinFixtureRuntimeImageProvenanceValidated: true',
  'actualMlxNativeRuntimeClosureValidated: false',
  'verifyToExecClosed: false',
  'npm run smoke:local-training-runtime-image-provenance',
]) {
  assert.ok(docs.plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-training-runtime-image-provenance',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Darwin runtime image provenance | `evidence/output-artifacts/local-training-runtime-image-provenance.json` |',
  ),
);
assert.ok(
  docs.checklist.includes(
    '| F2c.26 Darwin runtime image provenance | 완료 · actual fixture 증적 |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Darwin runtime image provenance: verified with `npm run smoke:local-training-runtime-image-provenance`',
  ),
);
assert.ok(
  docs.summary.includes(
    '| F2c.26 Darwin runtime image provenance | `npm run smoke:local-training-runtime-image-provenance` |',
  ),
);

console.log(JSON.stringify({
  actualDarwinFixtureRuntimeImageProvenanceValidated: true,
  actualMlxNativeRuntimeClosureValidated: false,
  evidenceHash: stored.evidenceHash,
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
  verifyToExecClosed: false,
}, null, 2));
