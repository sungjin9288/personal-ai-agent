import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'fine-tuning-private-execution-request-smoke-'),
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
  const intakeRequest = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt,
    requestedAt,
    requestedBy: 'local-operator-role',
  });
  const resolvedAt = new Date(Date.now() - 30 * 1000).toISOString();
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt,
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: resolvedAt,
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Synthetic operator attestation.',
    })),
  });
  const plannedAt = new Date(Date.now() - 15 * 1000).toISOString();
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment,
    collectionPlan,
    plannedAt,
    request: intakeRequest,
    resolution: intakeResolution,
  });

  for (const [name, value] of [
    ['fine-tuning-data-sufficiency.json', assessment],
    ['fine-tuning-data-collection-plan.json', collectionPlan],
    ['fine-tuning-data-intake-request.json', intakeRequest],
  ]) {
    fs.writeFileSync(
      path.join(artifactDir, name),
      `${JSON.stringify(value)}\n`,
    );
  }
  const planPath = path.join(privateDir, 'private-collection-plan.json');
  const resolutionPath = path.join(privateDir, 'intake-resolution.json');
  for (const [filename, value] of [
    [planPath, privateCollectionPlan],
    [resolutionPath, intakeResolution],
  ]) {
    fs.writeFileSync(filename, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    fs.chmodSync(filename, 0o600);
  }

  const result = spawnSync(
    process.execPath,
    [
      path.join(
        repoDir,
        'scripts',
        'request-fine-tuning-private-collection-execution.mjs',
      ),
      '--plan',
      planPath,
      '--resolution',
      resolutionPath,
    ],
    { cwd: rootDir, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const outputPath = path.join(rootDir, summary.outputPath);
  const request = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

  assert.equal(
    summary.status,
    'pending-private-collection-execution-owner-review',
  );
  assert.equal(summary.actionCount, 7);
  assert.equal(summary.reviewCount, 5);
  assert.equal(summary.collectionExecutionApprovalRequired, true);
  assert.equal(summary.collectionExecutionApprovalRequestCreated, true);
  assert.equal(summary.collectionExecutionAuthorized, false);
  assert.equal(
    summary.privateCollectionWorkspaceCreationAuthorized,
    false,
  );
  assert.equal(summary.actualUserDataCollected, false);
  assert.equal(summary.trainingAuthorized, false);
  assert.equal(summary.externalProviderCalls, 'none');
  assert.equal(request.collectionExecutionApprovalRequestCreated, true);
  assert.equal(request.operatorAttestationBound, true);
  assert.equal(request.ownerDecisionRecorded, false);
  assert.equal(request.ownerIdentityVerified, false);
  assert.equal(request.dataHandlingEvidenceRecorded, false);
  assert.equal(request.dataHandlingEvidenceReferencesRecorded, true);
  assert.equal(
    request.requiredReviews.every(
      (review) => review.status === 'pending-owner-review',
    ),
    true,
  );
  assert.deepEqual(request.targets, intakeRequest.targets);
  assert.equal(fs.lstatSync(outputPath).mode & 0o777, 0o600);
  assert.equal(
    fs.existsSync(path.join(
      rootDir,
      'var',
      'fine-tuning',
      'private-collection-workspaces',
    )),
    false,
  );
  assertRepositoryContract();

  console.log(JSON.stringify({
    actionCount: summary.actionCount,
    actualUserDataCollected: summary.actualUserDataCollected,
    collectionExecutionApprovalRequired:
      summary.collectionExecutionApprovalRequired,
    costFree: true,
    mode: 'fine-tuning-private-collection-execution-request-smoke',
    ok: true,
    reviewCount: summary.reviewCount,
    status: summary.status,
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
    packageJson.scripts['request:fine-tuning-private-collection-execution'],
    'node scripts/request-fine-tuning-private-collection-execution.mjs',
  );
  assert.equal(
    packageJson.scripts[
      'smoke:fine-tuning-private-collection-execution-request'
    ],
    'node scripts/smoke-fine-tuning-private-collection-execution-request.mjs',
  );
  for (const term of [
    '| F1.6 Private collection execution request | 완료 · owner review 대기 |',
    'fineTuningPrivateCollectionExecutionRequestStatus: protocol-ready-owner-review-required',
    'npm run request:fine-tuning-private-collection-execution',
    'npm run smoke:fine-tuning-private-collection-execution-request',
    'privateCollectionWorkspaceCreationAuthorized: false',
    'collectionExecutionAuthorized: false',
  ]) {
    assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
  }
  assert.ok(
    readme.includes(
      'npm run smoke:fine-tuning-private-collection-execution-request',
    ),
    'README must expose the F1.6 smoke',
  );
  assert.ok(
    manifest.includes(
      'Fine-tuning private collection execution request protocol: verified with `npm run smoke:fine-tuning-private-collection-execution-request`',
    ),
    'evidence manifest must record the F1.6 protocol',
  );
}
