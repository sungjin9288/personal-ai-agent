import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingDarwinSuspendedExec,
} from './evaluate-local-training-darwin-suspended-exec.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-darwin-suspended-exec.json',
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
  `local-training-darwin-suspended-exec-evidence-${expectedHash}`,
);
if (process.platform === 'darwin') {
  const expected = await evaluateLocalTrainingDarwinSuspendedExec({
    repoDir,
  });
  assert.deepEqual(stored, expected);
}
assert.equal(stored.costFree, true);
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
for (const field of [
  'actualDarwinFixtureEntrypointDescriptorExecutionValidated',
  'actualDarwinFixtureExecutableVerifyToExecValidated',
]) {
  assert.equal(stored.claimBoundary[field], true);
}
for (const field of [
  'actualDependencyInstallationPerformed',
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
for (const value of Object.values(stored.limitations)) {
  assert.equal(value, false);
}
for (const forbidden of [
  '/Applications/',
  '/Users/',
  '/private/var/',
  '/System/',
  'Authority=',
  'CDHash=',
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    `suspended exec evidence contains ${forbidden}`,
  );
}

assert.equal(
  packageJson.scripts[
    'build:local-training-darwin-suspended-exec-evidence'
  ],
  'node scripts/build-local-training-darwin-suspended-exec-evidence.mjs',
);
assert.equal(
  packageJson.scripts[
    'smoke:local-training-darwin-suspended-exec'
  ],
  'node scripts/smoke-local-training-darwin-suspended-exec.mjs',
);
for (const term of [
  '| F2c.27 Darwin suspended verify-to-exec | 완료 · actual fixture 증적 |',
  'actualDarwinFixtureExecutableVerifyToExecValidated: true',
  'actualDarwinFixtureEntrypointDescriptorExecutionValidated: true',
  'verifyToExecClosed: false',
  'npm run smoke:local-training-darwin-suspended-exec',
]) {
  assert.ok(docs.plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-training-darwin-suspended-exec',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Darwin suspended verify-to-exec | `evidence/output-artifacts/local-training-darwin-suspended-exec.json` |',
  ),
);
assert.ok(
  docs.checklist.includes(
    '| F2c.27 Darwin suspended verify-to-exec | 완료 · actual fixture 증적 |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Darwin suspended verify-to-exec: verified with `npm run smoke:local-training-darwin-suspended-exec`',
  ),
);
assert.ok(
  docs.summary.includes(
    '| F2c.27 Darwin suspended verify-to-exec | `npm run smoke:local-training-darwin-suspended-exec` |',
  ),
);

console.log(JSON.stringify({
  actualDarwinFixtureEntrypointDescriptorExecutionValidated: true,
  actualDarwinFixtureExecutableVerifyToExecValidated: true,
  evidenceHash: stored.evidenceHash,
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
  verifyToExecClosed: false,
}, null, 2));
