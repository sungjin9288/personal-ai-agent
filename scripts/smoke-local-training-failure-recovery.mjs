import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingFailureRecovery,
} from './evaluate-local-training-failure-recovery.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-failure-recovery.json',
);
const expected = await evaluateLocalTrainingFailureRecovery({ repoDir });
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
assert.equal(id, `local-training-failure-recovery-evidence-${expectedHash}`);
assert.deepEqual(stored, expected);
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
assert.equal(stored.recovery.workspaceRemoved, true);
assert.equal(stored.recovery.candidatePreserved, false);
assert.equal(stored.recovery.cleanupRequestBound, true);
assert.equal(stored.recovery.receiptReplayed, true);
assert.equal(stored.recovery.status, 'failed-cleaned');

for (const field of [
  'actualDependencyInstallationPerformed',
  'actualModelDownloadPerformed',
  'actualModelTrainingExecuted',
  'actualMlxProcessSpawned',
  'externalSubmissionAuthorized',
  'productionReadyClaim',
  'rolloutAuthorized',
  'trainingAuthorized',
]) {
  assert.equal(stored.claimBoundary[field], false);
}
assert.equal(stored.claimBoundary.externalProviderCalls, 'none');
assert.equal(serialized.includes('/Users/'), false);
assert.equal(serialized.includes('/private/var/'), false);
assert.equal(serialized.includes('recovery fixture prompt'), false);
assert.equal(serialized.includes('synthetic unlink failure'), false);

assert.equal(
  packageJson.scripts['build:local-training-failure-recovery-evidence'],
  'node scripts/build-local-training-failure-recovery-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-training-failure-recovery'],
  'node scripts/smoke-local-training-failure-recovery.mjs',
);

for (const term of [
  '| F2c.21 Durable training failure recovery | 완료 · fixture 증적 |',
  'actualLocalTrainingFailureRecoveryValidated: true',
  'npm run smoke:local-training-failure-recovery',
]) {
  assert.ok(docs.plan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(docs.readme.includes('npm run smoke:local-training-failure-recovery'));
assert.ok(
  docs.gallery.includes(
    '| Local training failure recovery | `evidence/output-artifacts/local-training-failure-recovery.json` |',
  ),
);
assert.ok(
  docs.checklist.includes(
    '| F2c.21 Durable training failure recovery | 완료 · fixture 증적 |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Local training failure recovery: verified with `npm run smoke:local-training-failure-recovery`',
  ),
);
assert.ok(
  docs.summary.includes(
    '| F2c.21 Durable training failure recovery | `npm run smoke:local-training-failure-recovery` |',
  ),
);

console.log(JSON.stringify({
  actualModelTrainingExecuted: false,
  actualMlxProcessSpawned: false,
  evidenceHash: stored.evidenceHash,
  externalProviderCalls: 'none',
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
