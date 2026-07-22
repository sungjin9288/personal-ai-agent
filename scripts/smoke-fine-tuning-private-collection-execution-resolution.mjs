import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildFineTuningDataCollectionPlan } from '../src/core/fine-tuning-data-collection-plan.mjs';
import { buildFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-request.mjs';
import { resolveFineTuningDataIntakeRequest } from '../src/core/fine-tuning-data-intake-resolution.mjs';
import { assessFineTuningDataSufficiency } from '../src/core/fine-tuning-data-sufficiency.mjs';
import { buildFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-request.mjs';
import {
  FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_DECISION_SCHEMA_VERSION,
  resolveFineTuningPrivateCollectionExecutionRequest,
} from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'fine-tuning-execution-resolution-smoke-'),
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
  const intakeRequestedAt = new Date(Date.now() - 60 * 1000).toISOString();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const intakeRequest = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt,
    requestedAt: intakeRequestedAt,
    requestedBy: 'local-operator-role',
  });
  const intakeResolvedAt = new Date(Date.now() - 50 * 1000).toISOString();
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt: intakeResolvedAt,
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: intakeResolvedAt,
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Synthetic operator attestation.',
    })),
  });
  const plannedAt = new Date(Date.now() - 40 * 1000).toISOString();
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment,
    collectionPlan,
    plannedAt,
    request: intakeRequest,
    resolution: intakeResolution,
  });
  const executionRequestedAt = new Date(Date.now() - 30 * 1000).toISOString();
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedAt: executionRequestedAt,
    requestedBy: 'local-operator-role',
  });

  for (const [name, value] of [
    ['fine-tuning-data-sufficiency.json', assessment],
    ['fine-tuning-data-collection-plan.json', collectionPlan],
    ['fine-tuning-data-intake-request.json', intakeRequest],
  ]) {
    fs.writeFileSync(path.join(artifactDir, name), `${JSON.stringify(value)}\n`);
  }

  const requestPath = path.join(privateDir, 'execution-request.json');
  const planPath = path.join(privateDir, 'private-collection-plan.json');
  const intakeResolutionPath = path.join(privateDir, 'intake-resolution.json');
  const decisionPath = path.join(privateDir, 'execution-decision.json');
  for (const [filename, value] of [
    [requestPath, executionRequest],
    [planPath, privateCollectionPlan],
    [intakeResolutionPath, intakeResolution],
    [decisionPath, {
      requestHash: executionRequest.requestHash,
      requestId: executionRequest.id,
      reviews: executionRequest.requiredReviews.map((review, index) => ({
        decision: 'approve',
        decidedAt: new Date().toISOString(),
        evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
        id: review.id,
        ownerRole: review.ownerRole,
        reason: 'Synthetic bounded execution review.',
      })),
      schemaVersion:
        FINE_TUNING_PRIVATE_COLLECTION_EXECUTION_OWNER_DECISION_SCHEMA_VERSION,
    }],
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
        'resolve-fine-tuning-private-collection-execution.mjs',
      ),
      '--request',
      requestPath,
      '--plan',
      planPath,
      '--resolution',
      intakeResolutionPath,
      '--decision',
      decisionPath,
    ],
    { cwd: rootDir, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const outputPath = path.join(rootDir, summary.outputPath);
  const resolution = JSON.parse(fs.readFileSync(outputPath, 'utf8'));

  assert.equal(
    summary.status,
    'approved-for-bounded-private-collection-execution',
  );
  assert.equal(summary.privateCollectionWorkspaceCreationAuthorized, true);
  assert.equal(summary.reviewedExampleCollectionAuthorized, true);
  assert.equal(summary.answerQualityCaseCollectionAuthorized, true);
  assert.equal(summary.collectionExecutionApprovalResolved, true);
  assert.equal(summary.collectionExecutionAuthorized, true);
  assert.equal(summary.actualUserDataCollected, false);
  assert.equal(summary.trainingAuthorized, false);
  assert.equal(summary.productionReadyClaim, false);
  assert.equal(summary.externalProviderCalls, 'none');
  assert.equal(resolution.requestedActions.length, 7);
  assert.equal(resolution.reviews.length, 5);
  assert.equal(Object.keys(resolution.bindings).length, 13);
  assert.equal(resolution.expiresAt, executionRequest.expiresAt);
  assert.equal(resolution.ownerDecisionRecorded, false);
  assert.equal(resolution.ownerIdentityVerified, false);
  assert.equal(resolution.dataHandlingEvidenceRecorded, false);
  assert.equal(resolution.dataHandlingEvidenceIndependentlyVerified, false);
  assert.equal(resolution.candidateTrainingReviewAllowed, false);
  assert.equal(resolution.externalSubmissionAuthorized, false);
  assert.equal(resolution.actualModelTrainingExecuted, false);
  assert.equal(
    JSON.stringify(resolution).includes('Synthetic bounded execution review.'),
    false,
  );
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
  const rejectedAt = new Date().toISOString();
  const rejected = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: rejectedAt,
    reviews: executionRequest.requiredReviews.map((review, index) => ({
      decision: index === 0 ? 'reject' : 'approve',
      decidedAt: rejectedAt,
      evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Synthetic rejection review.',
    })),
  });
  assert.equal(rejected.status, 'rejected');
  for (const field of [
    'privateCollectionWorkspaceCreationAuthorized',
    'reviewedExampleCollectionAuthorized',
    'answerQualityCaseCollectionAuthorized',
    'collectionExecutionAuthorized',
  ]) {
    assert.equal(rejected[field], false, field);
  }
  assert.equal(rejected.collectionExecutionApprovalResolved, true);
  assertRepositoryContract();

  console.log(JSON.stringify({
    actionCount: resolution.requestedActions.length,
    actualUserDataCollected: summary.actualUserDataCollected,
    collectionExecutionAuthorized: summary.collectionExecutionAuthorized,
    costFree: true,
    mode: 'fine-tuning-private-collection-execution-resolution-smoke',
    ok: true,
    reviewCount: resolution.reviews.length,
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
    packageJson.scripts['resolve:fine-tuning-private-collection-execution'],
    'node scripts/resolve-fine-tuning-private-collection-execution.mjs',
  );
  assert.equal(
    packageJson.scripts[
      'smoke:fine-tuning-private-collection-execution-resolution'
    ],
    'node scripts/smoke-fine-tuning-private-collection-execution-resolution.mjs',
  );
  for (const term of [
    '| F1.7 Private collection execution resolution protocol | 완료 · 실제 decision 대기 |',
    'fineTuningPrivateCollectionExecutionResolutionStatus: protocol-ready-private-decision-required',
    'npm run resolve:fine-tuning-private-collection-execution',
    'npm run smoke:fine-tuning-private-collection-execution-resolution',
    'collectionExecutionApprovalResolved: false',
    'ownerDecisionRecorded: false',
    'trainingAuthorized: false',
  ]) {
    assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
  }
  assert.ok(
    readme.includes(
      'npm run smoke:fine-tuning-private-collection-execution-resolution',
    ),
    'README must expose the F1.7 smoke',
  );
  assert.ok(
    manifest.includes(
      'Fine-tuning private collection execution resolution protocol: verified with `npm run smoke:fine-tuning-private-collection-execution-resolution`',
    ),
    'evidence manifest must record the F1.7 protocol',
  );
}
