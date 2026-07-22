import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingOsIsolation,
} from './evaluate-local-training-os-isolation.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-os-isolation.json',
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
assert.equal(id, `local-training-os-isolation-evidence-${expectedHash}`);
if (process.platform === 'darwin') {
  const expected = await evaluateLocalTrainingOsIsolation({ repoDir });
  assert.deepEqual(stored, expected);
}
assert.equal(stored.costFree, true);
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
assert.equal(stored.replayPlatform, 'darwin');
assert.equal(
  stored.claimBoundary.actualDarwinFixtureNetworkDenyEnforced,
  true,
);
assert.equal(
  stored.claimBoundary.actualDarwinFixtureCpuLimitEnforced,
  true,
);
assert.equal(
  stored.claimBoundary.actualDarwinFixtureFileSizeLimitEnforced,
  true,
);
assert.equal(
  stored.claimBoundary.actualDarwinFixtureOpenFilesLimitEnforced,
  true,
);
for (const field of [
  'actualDependencyInstallationPerformed',
  'actualMlxMemoryLimitEnforced',
  'actualMlxOsIsolationIntegrated',
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
  '127.0.0.1',
  'sandbox-exec -p',
  'limit-setup-failed',
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    `OS isolation evidence contains ${forbidden}`,
  );
}

assert.equal(
  packageJson.scripts['build:local-training-os-isolation-evidence'],
  'node scripts/build-local-training-os-isolation-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-training-os-isolation'],
  'node scripts/smoke-local-training-os-isolation.mjs',
);
for (const term of [
  '| F2c.24 Darwin training OS isolation preflight | 완료 · actual fixture 증적 |',
  'actualDarwinFixtureNetworkDenyEnforced: true',
  'actualMlxMemoryLimitEnforced: false',
  'actualMlxOsIsolationIntegrated: false',
  'npm run smoke:local-training-os-isolation',
]) {
  assert.ok(docs.plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(
  docs.readme.includes('npm run smoke:local-training-os-isolation'),
);
assert.ok(
  docs.gallery.includes(
    '| Darwin training OS isolation preflight | `evidence/output-artifacts/local-training-os-isolation.json` |',
  ),
);
assert.ok(
  docs.checklist.includes(
    '| F2c.24 Darwin training OS isolation preflight | 완료 · actual fixture 증적 |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Darwin training OS isolation preflight: verified with `npm run smoke:local-training-os-isolation`',
  ),
);
assert.ok(
  docs.summary.includes(
    '| F2c.24 Darwin training OS isolation preflight | `npm run smoke:local-training-os-isolation` |',
  ),
);

console.log(JSON.stringify({
  actualDarwinFixtureNetworkDenyEnforced: true,
  actualMlxMemoryLimitEnforced: false,
  actualMlxOsIsolationIntegrated: false,
  evidenceHash: stored.evidenceHash,
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
