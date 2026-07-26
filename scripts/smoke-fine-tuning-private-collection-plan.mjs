import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildDeterministicFineTuningReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'fine-tuning-private-collection-plan-smoke-'),
);

try {
  const artifactDir = path.join(rootDir, 'evidence', 'output-artifacts');
  const privateDir = path.join(rootDir, 'var');
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.mkdirSync(privateDir, { mode: 0o700 });

  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const requestedAt = new Date(Date.now() - 60 * 1000).toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const request = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt,
    requestedAt,
    requestedBy: 'local-operator-role',
  });
  const resolvedAt = new Date().toISOString();
  const resolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request,
    resolvedAt,
    reviews: request.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: resolvedAt,
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Synthetic operator attestation.',
    })),
  });

  for (const [name, value] of [
    ['fine-tuning-data-sufficiency.json', assessment],
    ['fine-tuning-data-collection-plan.json', collectionPlan],
    ['fine-tuning-data-intake-request.json', request],
  ]) {
    fs.writeFileSync(
      path.join(artifactDir, name),
      `${JSON.stringify(value)}\n`,
    );
  }
  const resolutionPath = path.join(privateDir, 'resolution.json');
  fs.writeFileSync(
    resolutionPath,
    `${JSON.stringify(resolution)}\n`,
    { mode: 0o600 },
  );
  fs.chmodSync(resolutionPath, 0o600);

  const result = spawnSync(
    process.execPath,
    [
      path.join(repoDir, 'scripts', 'plan-fine-tuning-private-collection.mjs'),
      '--resolution',
      resolutionPath,
    ],
    { cwd: rootDir, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const outputPath = path.join(rootDir, summary.outputPath);
  const plan = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

  assert.equal(summary.status, 'private-collection-plan-created-execution-approval-required');
  assert.equal(summary.stepCount, 7);
  assert.equal(summary.collectionExecutionApprovalRequired, true);
  assert.equal(summary.collectionExecutionAuthorized, false);
  assert.equal(summary.actualUserDataCollected, false);
  assert.equal(summary.trainingAuthorized, false);
  assert.equal(summary.externalProviderCalls, 'none');
  assert.equal(plan.operatorAttestationBound, true);
  assert.equal(plan.ownerDecisionRecorded, false);
  assert.equal(plan.ownerIdentityVerified, false);
  assert.equal(plan.dataHandlingEvidenceRecorded, false);
  assert.equal(plan.dataHandlingEvidenceReferencesRecorded, true);
  assert.equal(plan.steps.every((step) => step.status === 'pending'), true);
  assert.deepEqual(plan.targets, request.targets);
  assert.equal(fs.lstatSync(outputPath).mode & 0o777, 0o600);
  assert.equal(
    fs.existsSync(path.join(rootDir, 'var', 'fine-tuning', 'intake-workspace')),
    false,
  );
  assertRepositoryContract();

  console.log(JSON.stringify({
    actualUserDataCollected: summary.actualUserDataCollected,
    collectionExecutionApprovalRequired:
      summary.collectionExecutionApprovalRequired,
    costFree: true,
    mode: 'fine-tuning-private-collection-plan-smoke',
    ok: true,
    status: summary.status,
    stepCount: summary.stepCount,
    trainingAuthorized: summary.trainingAuthorized,
  }, null, 2));
} finally {
  fs.rmSync(rootDir, { force: true, recursive: true });
}

function assertRepositoryContract() {
  const packageJson = JSON.parse(fs.readFileSync(
    path.join(repoDir, 'package.json'),
    'utf8',
  ));
  const plan = fs.readFileSync(
    path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'),
    'utf8',
  );
  const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
  const manifest = fs.readFileSync(
    path.join(repoDir, 'evidence', 'evidence_manifest.md'),
    'utf8',
  );
  assert.equal(
    packageJson.scripts['plan:fine-tuning-private-collection'],
    'node scripts/plan-fine-tuning-private-collection.mjs',
  );
  assert.equal(
    packageJson.scripts['smoke:fine-tuning-private-collection-plan'],
    'node scripts/smoke-fine-tuning-private-collection-plan.mjs',
  );
  for (const term of [
    '| F1.5 Private collection plan | 완료 · 실행 승인 대기 |',
    'fineTuningPrivateCollectionPlanStatus: protocol-ready-execution-approval-required',
    'npm run plan:fine-tuning-private-collection',
    'npm run smoke:fine-tuning-private-collection-plan',
    'collectionExecutionAuthorized: false',
  ]) {
    assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
  }
  assert.ok(
    readme.includes('npm run smoke:fine-tuning-private-collection-plan'),
    'README must expose the F1.5 smoke',
  );
  assert.ok(
    manifest.includes(
      'Fine-tuning private collection plan protocol: verified with `npm run smoke:fine-tuning-private-collection-plan`',
    ),
    'evidence manifest must record the F1.5 protocol',
  );
}
