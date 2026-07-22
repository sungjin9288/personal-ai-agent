import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateLocalTrainingProcessSupervisor,
} from './evaluate-local-training-process-supervisor.mjs';

const repoDir = process.cwd();
const evidencePath = path.join(
  repoDir,
  'evidence',
  'output-artifacts',
  'local-training-process-supervisor.json',
);
const expected = await evaluateLocalTrainingProcessSupervisor({
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
  `local-training-process-supervisor-evidence-${expectedHash}`,
);
assert.deepEqual(stored, expected);
assert.equal(stored.costFree, true);
assert.equal(Object.values(stored.failureGuards).every(Boolean), true);
assert.equal(stored.claimBoundary.actualFixtureProcessSpawned, true);
assert.equal(
  stored.claimBoundary.processGroupLifecycleValidated,
  true,
);
assert.equal(
  stored.claimBoundary.permissionRevocationMonitoringValidated,
  true,
);
assert.equal(
  stored.claimBoundary.mlxProcessSupervisorIntegrated,
  false,
);
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
  'local-training-approval-evidence',
  'local-training-permission-evidence',
  'private store error',
]) {
  assert.equal(
    serialized.includes(forbidden),
    false,
    `process supervisor evidence contains ${forbidden}`,
  );
}

assert.equal(
  packageJson.scripts['build:local-training-process-supervisor-evidence'],
  'node scripts/build-local-training-process-supervisor-evidence.mjs',
);
assert.equal(
  packageJson.scripts['smoke:local-training-process-supervisor'],
  'node scripts/smoke-local-training-process-supervisor.mjs',
);
for (const term of [
  '| F2c.23 Local training process supervisor | 완료 · fixture process 증적 |',
  'processGroupLifecycleValidated: true',
  'permissionRevocationMonitoringValidated: true',
  'mlxProcessSupervisorIntegrated: false',
  'npm run smoke:local-training-process-supervisor',
]) {
  assert.ok(docs.plan.includes(term), `ML/RAG plan missing ${term}`);
}
assert.ok(
  docs.readme.includes(
    'npm run smoke:local-training-process-supervisor',
  ),
);
assert.ok(
  docs.gallery.includes(
    '| Local training process supervisor | `evidence/output-artifacts/local-training-process-supervisor.json` |',
  ),
);
assert.ok(
  docs.checklist.includes(
    '| F2c.23 Local training process supervisor | 완료 · fixture process 증적 |',
  ),
);
assert.ok(
  docs.manifest.includes(
    'Local training process supervisor: verified with `npm run smoke:local-training-process-supervisor`',
  ),
);
assert.ok(
  docs.summary.includes(
    '| F2c.23 Local training process supervisor | `npm run smoke:local-training-process-supervisor` |',
  ),
);

console.log(JSON.stringify({
  actualFixtureProcessSpawned: true,
  actualMlxProcessSpawned: false,
  evidenceHash: stored.evidenceHash,
  failureGuardCount: Object.keys(stored.failureGuards).length,
  mode: stored.mode,
  ok: true,
  productionReadyClaim: false,
}, null, 2));
