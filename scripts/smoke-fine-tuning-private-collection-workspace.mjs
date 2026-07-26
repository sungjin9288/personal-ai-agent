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
import { resolveFineTuningPrivateCollectionExecutionRequest } from '../src/core/fine-tuning-private-collection-execution-resolution.mjs';
import { buildFineTuningPrivateCollectionPlan } from '../src/core/fine-tuning-private-collection-plan.mjs';
import { buildDeterministicFineTuningReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const rootDir = fs.mkdtempSync(
  path.join(os.tmpdir(), 'fine-tuning-workspace-smoke-'),
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
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment,
    collectionPlan,
    plannedAt: new Date(Date.now() - 40 * 1000).toISOString(),
    request: intakeRequest,
    resolution: intakeResolution,
  });
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedAt: new Date(Date.now() - 30 * 1000).toISOString(),
    requestedBy: 'local-operator-role',
  });
  const executionResolvedAt = new Date(Date.now() - 20 * 1000).toISOString();
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: executionResolvedAt,
    reviews: executionRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: executionResolvedAt,
      evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Synthetic bounded execution review.',
    })),
  });

  for (const [name, value] of [
    ['fine-tuning-data-sufficiency.json', assessment],
    ['fine-tuning-data-collection-plan.json', collectionPlan],
    ['fine-tuning-data-intake-request.json', intakeRequest],
  ]) {
    fs.writeFileSync(path.join(artifactDir, name), `${JSON.stringify(value)}\n`);
  }

  const executionResolutionPath = path.join(privateDir, 'execution-resolution.json');
  const executionRequestPath = path.join(privateDir, 'execution-request.json');
  const planPath = path.join(privateDir, 'private-collection-plan.json');
  const intakeResolutionPath = path.join(privateDir, 'intake-resolution.json');
  for (const [filename, value] of [
    [executionResolutionPath, executionResolution],
    [executionRequestPath, executionRequest],
    [planPath, privateCollectionPlan],
    [intakeResolutionPath, intakeResolution],
  ]) {
    fs.writeFileSync(filename, `${JSON.stringify(value)}\n`, { mode: 0o600 });
    fs.chmodSync(filename, 0o600);
  }

  const result = spawnSync(
    process.execPath,
    [
      path.join(repoDir, 'scripts', 'prepare-fine-tuning-private-collection-workspace.mjs'),
      '--execution-resolution',
      executionResolutionPath,
      '--execution-request',
      executionRequestPath,
      '--plan',
      planPath,
      '--intake-resolution',
      intakeResolutionPath,
    ],
    { cwd: rootDir, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  const workspaceDir = path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${executionResolution.resolutionHash}`,
  );
  const workspace = JSON.parse(
    fs.readFileSync(path.join(workspaceDir, 'workspace.json'), 'utf8'),
  );

  assert.equal(
    summary.status,
    'private-collection-workspace-prepared-collection-not-started',
  );
  assert.equal(summary.privateCollectionWorkspacePrepared, true);
  assert.equal(summary.collectionItemCount, 0);
  assert.equal(summary.collectionStarted, false);
  assert.equal(summary.actualUserDataCollected, false);
  assert.equal(summary.trainingAuthorized, false);
  assert.equal(summary.externalProviderCalls, 'none');
  assert.equal(summary.productionReadyClaim, false);
  assert.equal(summary.workspaceContainsCollectionData, false);
  assert.equal(summary.workspacePathStored, false);
  assert.equal(result.stdout.includes('var/'), false);
  assert.equal(Object.keys(workspace.bindings).length, 14);
  assert.deepEqual(workspace.executionRequest, {
    id: executionRequest.id,
    requestHash: executionRequest.requestHash,
  });
  assert.equal(workspace.expiresAt, executionRequest.expiresAt);
  assert.equal(workspace.collectionItemCount, 0);
  assert.equal(workspace.workspaceContainsCollectionData, false);
  assert.equal(workspace.workspacePathStored, false);
  assert.equal(fs.lstatSync(workspaceDir).mode & 0o777, 0o700);
  assert.equal(
    fs.lstatSync(path.join(workspaceDir, 'workspace.json')).mode & 0o777,
    0o600,
  );
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    const laneDirectory = path.join(workspaceDir, lane);
    assert.equal(fs.lstatSync(laneDirectory).mode & 0o777, 0o700);
    assert.deepEqual(fs.readdirSync(laneDirectory), []);
  }
  assert.deepEqual(workspace.lanes, [
    {
      directory: 'reviewed-examples',
      id: 'reviewed-examples',
      itemCount: 0,
    },
    {
      directory: 'answer-quality-cases',
      id: 'answer-quality-cases',
      itemCount: 0,
    },
  ]);
  assertRepositoryContract();

  console.log(JSON.stringify({
    actualUserDataCollected: summary.actualUserDataCollected,
    bindingCount: Object.keys(workspace.bindings).length,
    collectionStarted: summary.collectionStarted,
    costFree: true,
    laneCount: workspace.lanes.length,
    mode: 'fine-tuning-private-collection-workspace-smoke',
    ok: true,
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
    packageJson.scripts['prepare:fine-tuning-private-collection-workspace'],
    'node scripts/prepare-fine-tuning-private-collection-workspace.mjs',
  );
  assert.equal(
    packageJson.scripts['smoke:fine-tuning-private-collection-workspace'],
    'node scripts/smoke-fine-tuning-private-collection-workspace.mjs',
  );
  for (const term of [
    '| F1.8 Private collection workspace protocol | 완료 · 실제 workspace 준비 대기 |',
    'fineTuningPrivateCollectionWorkspaceStatus: protocol-ready-private-workspace-preparation-required',
    'npm run prepare:fine-tuning-private-collection-workspace',
    'npm run smoke:fine-tuning-private-collection-workspace',
    'privateCollectionWorkspacePrepared: false',
    'collectionStarted: false',
    'trainingAuthorized: false',
  ]) {
    assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
  }
  assert.ok(
    readme.includes('npm run smoke:fine-tuning-private-collection-workspace'),
    'README must expose the F1.8 smoke',
  );
  assert.ok(
    manifest.includes(
      'Fine-tuning private collection workspace protocol: verified with `npm run smoke:fine-tuning-private-collection-workspace`',
    ),
    'evidence manifest must record the F1.8 protocol',
  );
}
