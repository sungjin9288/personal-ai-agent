import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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
import { buildFineTuningPrivateCollectionWorkspace } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import { buildDeterministicFineTuningReadinessFixture } from './local-training-permission-fixture.mjs';

const repoDir = process.cwd();
const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fine-tuning-item-admission-smoke-'));

try {
  const sources = buildSources();
  writeSources(sources);
  const workspaceFile = writeWorkspace(sources);
  const workspaceBytes = fs.readFileSync(workspaceFile);
  const inputs = writePrivateInputs(sources, workspaceFile);
  const result = run(inputs);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.status, 'private-collection-item-envelope-admitted-content-not-collected');
  assert.equal(summary.collectionEnvelopeCount, 1);
  assert.equal(summary.collectionItemCount, 0);
  assert.equal(summary.workspaceMutationPerformed, false);
  assert.equal(summary.externalProviderCalls, 'none');
  assert.equal(summary.productionReadyClaim, false);
  assert.equal(result.stdout.includes(rootDir), false);
  assert.equal(result.stdout.includes('a'.repeat(64)), false);
  assert.deepEqual(fs.readFileSync(workspaceFile), workspaceBytes);
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    assert.deepEqual(fs.readdirSync(path.join(path.dirname(workspaceFile), lane)), []);
  }
  assert.equal(admissionDirectories().length, 1);
  const duplicate = run(inputs);
  assert.notEqual(duplicate.status, 0);
  assert.match(duplicate.stderr, /duplicate|already admitted/);
  assertDocumentation();
  console.log('fine-tuning private collection item admission smoke passed');
} finally {
  fs.rmSync(rootDir, { force: true, recursive: true });
}

function buildSources() {
  const base = Date.now() - 5 * 60 * 1000;
  const timestamp = (offset) => new Date(base + offset).toISOString();
  const assessment = assessFineTuningDataSufficiency({
    readinessPackage: buildDeterministicFineTuningReadinessFixture(),
  });
  const collectionPlan = buildFineTuningDataCollectionPlan({ assessment });
  const intakeRequest = buildFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    expiresAt: timestamp(60 * 60 * 1000),
    requestedAt: timestamp(0),
    requestedBy: 'local-operator-role',
  });
  const intakeResolution = resolveFineTuningDataIntakeRequest({
    assessment,
    collectionPlan,
    request: intakeRequest,
    resolvedAt: timestamp(30 * 1000),
    reviews: intakeRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: timestamp(30 * 1000),
      evidenceSha256: String(index + 1).repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Synthetic operator attestation.',
    })),
  });
  const privateCollectionPlan = buildFineTuningPrivateCollectionPlan({
    assessment,
    collectionPlan,
    plannedAt: timestamp(60 * 1000),
    request: intakeRequest,
    resolution: intakeResolution,
  });
  const executionRequest = buildFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    requestedAt: timestamp(90 * 1000),
    requestedBy: 'local-operator-role',
  });
  const executionResolution = resolveFineTuningPrivateCollectionExecutionRequest({
    assessment,
    collectionPlan,
    executionRequest,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
    resolvedAt: timestamp(120 * 1000),
    reviews: executionRequest.requiredReviews.map((review, index) => ({
      decision: 'approve',
      decidedAt: timestamp(120 * 1000),
      evidenceSha256: ['a', 'b', 'c', 'd', 'e'][index].repeat(64),
      id: review.id,
      ownerRole: review.ownerRole,
      reason: 'Bounded private collection review.',
    })),
  });
  const baseSources = {
    assessment,
    collectionPlan,
    executionRequest,
    executionResolution,
    intakeRequest,
    intakeResolution,
    privateCollectionPlan,
  };
  return {
    ...baseSources,
    workspace: buildFineTuningPrivateCollectionWorkspace({
      ...baseSources,
      preparedAt: timestamp(150 * 1000),
    }),
  };
}

function writeSources(sources) {
  const artifactDir = path.join(rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifactDir, { recursive: true });
  writeJson(path.join(artifactDir, 'fine-tuning-data-sufficiency.json'), sources.assessment);
  writeJson(path.join(artifactDir, 'fine-tuning-data-collection-plan.json'), sources.collectionPlan);
  writeJson(path.join(artifactDir, 'fine-tuning-data-intake-request.json'), sources.intakeRequest);
  fs.mkdirSync(path.join(rootDir, 'var'), { mode: 0o700 });
  fs.chmodSync(path.join(rootDir, 'var'), 0o700);
}

function writeWorkspace(sources) {
  const directory = path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-collection-workspaces',
    `fine-tuning-private-collection-workspace-${sources.executionResolution.resolutionHash}`,
  );
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    const laneDirectory = path.join(directory, lane);
    fs.mkdirSync(laneDirectory, { mode: 0o700 });
    fs.chmodSync(laneDirectory, 0o700);
  }
  const filename = path.join(directory, 'workspace.json');
  writeJson(filename, sources.workspace, 0o600);
  return filename;
}

function writePrivateInputs(sources, workspace) {
  const privateDir = path.join(rootDir, 'var', 'inputs');
  fs.mkdirSync(privateDir, { mode: 0o700 });
  fs.chmodSync(privateDir, 0o700);
  const inputs = {
    envelope: path.join(privateDir, 'envelope.json'),
    executionRequest: path.join(privateDir, 'execution-request.json'),
    executionResolution: path.join(privateDir, 'execution-resolution.json'),
    intakeResolution: path.join(privateDir, 'intake-resolution.json'),
    plan: path.join(privateDir, 'plan.json'),
    workspace,
  };
  const digest = (name) => createHash('sha256').update(name).digest('hex');
  writeJson(inputs.envelope, {
    lane: 'reviewed-examples',
    privacy: {
      consentStatus: 'recorded',
      evidenceSha256: digest('privacy'),
      purpose: 'private-answer-quality-improvement-and-readiness-review',
    },
    redaction: {
      evidenceSha256: digest('redaction'),
      policyId: 'deidentify-before-content-admission-v1',
    },
    retention: {
      deleteBy: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      evidenceSha256: digest('retention'),
      policyId: 'delete-by-expiry-or-withdrawal-v1',
      withdrawalReferenceSha256: digest('withdrawal'),
    },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-envelope/v1',
    source: {
      lineageSha256: digest('lineage'),
      referenceSha256: digest('reference'),
      scopeReferenceSha256: digest('scope'),
      usageBasis: 'owner-attested-private-quality-improvement',
      usageBasisEvidenceSha256: digest('usage-basis'),
    },
    submittedBy: 'local-operator-role',
    workspace: {
      id: sources.workspace.id,
      workspaceHash: sources.workspace.workspaceHash,
    },
  }, 0o600);
  writeJson(inputs.executionRequest, sources.executionRequest, 0o600);
  writeJson(inputs.executionResolution, sources.executionResolution, 0o600);
  writeJson(inputs.intakeResolution, sources.intakeResolution, 0o600);
  writeJson(inputs.plan, sources.privateCollectionPlan, 0o600);
  return inputs;
}

function run(inputs) {
  return spawnSync(process.execPath, [
    path.join(repoDir, 'scripts', 'admit-fine-tuning-private-collection-item.mjs'),
    '--workspace', inputs.workspace,
    '--envelope', inputs.envelope,
    '--execution-resolution', inputs.executionResolution,
    '--execution-request', inputs.executionRequest,
    '--plan', inputs.plan,
    '--intake-resolution', inputs.intakeResolution,
  ], {
    cwd: rootDir,
    encoding: 'utf8',
  });
}

function admissionDirectories() {
  const root = path.join(rootDir, 'var', 'fine-tuning', 'private-collection-item-admissions');
  if (!fs.existsSync(root)) {
    return [];
  }
  return fs.readdirSync(root).filter((name) =>
    name.startsWith('fine-tuning-private-collection-item-admission-'));
}

function assertDocumentation() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'));
  const plan = fs.readFileSync(path.join(repoDir, 'docs', 'ml-rag-development-plan-v1.md'), 'utf8');
  const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8');
  const manifest = fs.readFileSync(path.join(repoDir, 'evidence', 'evidence_manifest.md'), 'utf8');
  assert.equal(
    packageJson.scripts['admit:fine-tuning-private-collection-item'],
    'node scripts/admit-fine-tuning-private-collection-item.mjs',
  );
  assert.equal(
    packageJson.scripts['smoke:fine-tuning-private-collection-item-admission'],
    'node scripts/smoke-fine-tuning-private-collection-item-admission.mjs',
  );
  for (const term of [
    '| F1.9 Private collection item admission protocol | 완료 · content admission 대기 |',
    'fineTuningPrivateCollectionItemAdmissionStatus: protocol-ready-content-free-envelope-admission-required',
    'npm run admit:fine-tuning-private-collection-item',
    'npm run smoke:fine-tuning-private-collection-item-admission',
    'collectionEnvelopeCount: 0',
    'collectionItemCount: 0',
    'trainingAuthorized: false',
  ]) {
    assert.ok(plan.includes(term), `ML/RAG plan missing ${term}`);
  }
  assert.ok(readme.includes('npm run smoke:fine-tuning-private-collection-item-admission'));
  assert.ok(manifest.includes(
    'Fine-tuning private collection item admission protocol: verified with `npm run smoke:fine-tuning-private-collection-item-admission`',
  ));
}

function writeJson(filename, value, mode = 0o644) {
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, { mode });
  fs.chmodSync(filename, mode);
}
