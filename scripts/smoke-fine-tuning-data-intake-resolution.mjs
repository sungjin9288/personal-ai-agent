import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { FINE_TUNING_DATA_INTAKE_OWNER_DECISION_SCHEMA_VERSION } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { buildDeterministicFineTuningReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'fine-tuning-data-intake-resolution-smoke-'),
);

try {
  const request = writeFreshSources(rootDir);
  const now = new Date().toISOString();
  const decision = {
    requestHash: request.requestHash,
    requestId: request.id,
    reviews: request.requiredReviews.map((review) => ({
      decision: 'approve',
      decidedAt: now,
      evidenceSha256: 'a'.repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Synthetic owner review.',
    })),
    schemaVersion: FINE_TUNING_DATA_INTAKE_OWNER_DECISION_SCHEMA_VERSION,
  };
  const privateDir = path.join(rootDir, 'var');
  fs.mkdirSync(privateDir, { recursive: true, mode: 0o700 });
  const decisionPath = path.join(privateDir, 'decision.json');
  fs.writeFileSync(decisionPath, `${JSON.stringify(decision)}\n`, { mode: 0o600 });
  fs.chmodSync(decisionPath, 0o600);
  const result = spawnSync(
    process.execPath,
    [
      path.join(
        repoDir,
        'scripts',
        'resolve-fine-tuning-data-intake.mjs',
      ),
      '--decision',
      decisionPath,
    ],
    { cwd: rootDir, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const outputPath = path.join(rootDir, summary.outputPath);
  assert.equal(summary.status, 'approved-for-private-collection-planning');
  assert.equal(summary.privateCollectionPlanAllowed, true);
  assert.equal(summary.collectionExecutionAuthorized, false);
  assert.equal(summary.trainingAuthorized, false);
  assert.equal(summary.actualUserDataCollected, false);
  assert.equal(fs.lstatSync(outputPath).mode & 0o777, 0o600);
  const stored = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  assert.equal(JSON.stringify(stored).includes('Synthetic owner review.'), false);
  assert.equal(stored.operatorAttestationRecorded, true);
  assert.equal(stored.ownerDecisionRecorded, false);
  assert.equal(stored.ownerIdentityVerified, false);
  assert.equal(stored.dataHandlingEvidenceRecorded, false);
  assert.equal(stored.dataHandlingEvidenceReferencesRecorded, true);
  assertRepositoryContract();
  console.log(JSON.stringify({
    costFree: true,
    mode: 'fine-tuning-data-intake-resolution-smoke',
    ok: true,
    privateCollectionPlanAllowed: summary.privateCollectionPlanAllowed,
    status: summary.status,
    trainingAuthorized: summary.trainingAuthorized,
  }, null, 2));
} finally {
  fs.rmSync(rootDir, { force: true, recursive: true });
}

function writeFreshSources(rootDir) {
  const targetDir = path.join(rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(targetDir, { recursive: true });
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const current = Date.now();
  const request = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt: new Date(current + 60 * 60 * 1000).toISOString(),
    requestedAt: new Date(current - 60 * 1000).toISOString(),
    requestedBy: 'local-operator-role',
  });
  for (const [name, value] of [
    ['fine-tuning-data-sufficiency.json', assessment],
    ['fine-tuning-data-collection-plan.json', collectionPlan],
    ['fine-tuning-data-intake-request.json', request],
  ]) {
    fs.writeFileSync(path.join(targetDir, name), `${JSON.stringify(value)}\n`);
  }
  return request;
}

function assertRepositoryContract() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'),
  );
  const plan = fs.readFileSync(
    path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
    'utf8',
  );
  const readme = fs.readFileSync(
    path.join(repoDir, 'README.md'),
    'utf8',
  );
  const gallery = fs.readFileSync(
    path.join(repoDir, 'docs', 'evidence-gallery.md'),
    'utf8',
  );
  const manifest = fs.readFileSync(
    path.join(repoDir, 'evidence', 'evidence_manifest.md'),
    'utf8',
  );

  assert.equal(
    packageJson.scripts['resolve:fine-tuning-data-intake'],
    'node scripts/resolve-fine-tuning-data-intake.mjs',
  );
  assert.equal(
    packageJson.scripts['smoke:fine-tuning-data-intake-resolution'],
    'node scripts/smoke-fine-tuning-data-intake-resolution.mjs',
  );
  for (const term of [
    '| F1.4 Reviewed-data intake resolution protocol | 완료 · 실제 decision 대기 |',
    'fineTuningDataIntakeResolutionStatus: protocol-ready-owner-decision-not-recorded',
    'personal-ai-agent-fine-tuning-data-intake-owner-decision/v1',
    'npm run resolve:fine-tuning-data-intake',
    'npm run smoke:fine-tuning-data-intake-resolution',
    'ownerDecisionRecorded: false',
  ]) {
    assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
  }
  assert.ok(
    readme.includes('npm run smoke:fine-tuning-data-intake-resolution'),
    'README must expose the F1.4 smoke',
  );
  assert.ok(
    gallery.includes(
      '| Fine-tuning reviewed-data intake resolution protocol |',
    ),
    'evidence gallery must link the F1.4 protocol',
  );
  assert.ok(
    manifest.includes(
      'Fine-tuning reviewed-data intake resolution protocol: verified with `npm run smoke:fine-tuning-data-intake-resolution`',
    ),
    'evidence manifest must record the F1.4 protocol',
  );
}
