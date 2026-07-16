import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import { buildTrainingDatasetManifest } from '../src/core/training-dataset-quality.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/training-dataset-quality-cases-v1.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-training-dataset-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

assert.equal(fixture.schemaVersion, 'personal-ai-agent-training-dataset-quality-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'training-dataset-quality-workspace'],
});
const completedRuns = fixture.cases.map((testCase) => runApprovedMission(testCase));
const statePath = path.join(tempRoot, 'var', 'state.json');
const stateBefore = fs.readFileSync(statePath);
const state = JSON.parse(stateBefore);
const records = completedRuns.map(({ run, testCase }) => {
  const candidate = state.learningCandidates.find((item) => item.id === run.learningCandidateId);
  const mission = state.missions.find((item) => item.id === run.missionId);
  const session = state.sessions.find((item) => item.id === run.sessionId);
  const stateWorkspace = state.workspaces.find((item) => item.id === workspace.id);
  const artifacts = state.artifacts.filter((artifact) => artifact.sessionId === session?.id);
  const reviewerArtifact = artifacts.find(
    (artifact) =>
      artifact.role === 'reviewer' &&
      artifact.kind === 'agent-output' &&
      candidate?.evidence?.artifactIds?.includes(artifact.id),
  );
  const sourceArtifact = artifacts.find(
    (artifact) =>
      artifact.role === 'executor' &&
      artifact.kind === 'deliverable' &&
      candidate?.evidence?.artifactIds?.includes(artifact.id),
  );
  assert.ok(candidate, `${testCase.id} candidate missing`);
  assert.ok(mission, `${testCase.id} mission missing`);
  assert.ok(session, `${testCase.id} session missing`);
  assert.ok(stateWorkspace, `${testCase.id} workspace missing`);
  assert.ok(reviewerArtifact, `${testCase.id} reviewer artifact missing`);
  assert.ok(sourceArtifact, `${testCase.id} source artifact missing`);

  return buildApprovedTrainingRecord({
    artifacts,
    candidate,
    generatedAt: new Date(
      Date.parse(candidate.promotionVerification.verifiedAt) + 1_000,
    ).toISOString(),
    mission,
    reviewerArtifactId: reviewerArtifact.id,
    sanitizedExample: {
      instruction: testCase.instruction,
      response: testCase.response,
    },
    session,
    sourceArtifactId: sourceArtifact.id,
    workspace: stateWorkspace,
  });
});

const manifest = buildTrainingDatasetManifest({ records, seed: fixture.seed });
const replayedManifest = buildTrainingDatasetManifest({
  records: [...records].reverse(),
  seed: fixture.seed,
});
assert.deepEqual(replayedManifest, manifest);
assert.equal(manifest.status, fixture.expected.status);
assert.equal(manifest.counts.source, fixture.expected.source);
assert.equal(manifest.counts.accepted, fixture.expected.accepted);
assert.equal(manifest.counts.excludedDuplicates, fixture.expected.excludedDuplicates);
assert.equal(manifest.counts.train + manifest.counts.validation, fixture.expected.accepted);
assert.equal(manifest.leakageGate.status, 'passed');
assert.equal(manifest.leakageGate.checks.length, fixture.expected.leakageCheckCount);
assert.equal(manifest.leakageGate.checks.every((check) => check.status === 'passed'), true);
assert.deepEqual(
  manifest.deduplication.excludedRecords.map((record) => record.reason).sort(),
  ['exact-content', 'near-response'],
);
assert.equal(manifest.externalSubmissionAuthorized, false);
assert.equal(manifest.fineTuningExecutionAuthorized, false);
assert.equal(manifest.productionReadyClaim, false);
assert.equal(JSON.stringify(manifest).includes(tempRoot), false);
for (const record of records) {
  assert.equal(JSON.stringify(manifest).includes(record.example.instruction), false);
  assert.equal(JSON.stringify(manifest).includes(record.example.response), false);
}
assert.deepEqual(fs.readFileSync(statePath), stateBefore, 'dataset builder must not mutate the store');

for (const term of [
  'status: training-dataset-quality-current',
  '| L2 Dataset quality gate | 완료 |',
  '| F1 Fine-tuning readiness | 다음 |',
  'fixtures/training-dataset-quality-cases-v1.json',
  'npm run smoke:training-dataset-quality',
  'externalSubmissionAuthorized: false',
  'fineTuningExecutionAuthorized: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:training-dataset-quality'),
  'README must expose the training dataset quality command',
);
assert.ok(
  evidenceGallery.includes('| Training dataset quality gate | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link the training dataset quality gate',
);
assert.ok(
  evidenceManifest.includes(
    'Training dataset quality gate: verified with `npm run smoke:training-dataset-quality`',
  ),
  'evidence manifest must record the training dataset quality gate',
);

console.log(
  JSON.stringify(
    {
      acceptedRecordCount: manifest.counts.accepted,
      costFree: true,
      datasetHash: manifest.datasetHash,
      excludedDuplicateCount: manifest.counts.excludedDuplicates,
      externalSubmissionAuthorized: false,
      fineTuningExecutionAuthorized: false,
      leakageCheckCount: manifest.leakageGate.checks.length,
      manifestHash: manifest.manifestHash,
      mode: 'training-dataset-quality',
      ok: true,
      productionReadyClaim: false,
      sourceRecordCount: manifest.counts.source,
      trainCount: manifest.counts.train,
      validationCount: manifest.counts.validation,
    },
    null,
    2,
  ),
);

function runApprovedMission(testCase) {
  const mission = runCli({
    rootDir: tempRoot,
    args: [
      'mission',
      'create',
      '--workspace',
      workspace.id,
      '--mode',
      'knowledge',
      '--deliverable',
      'decision-memo',
      '--title',
      `Training dataset fixture ${testCase.id}`,
      '--objective',
      `Produce reviewed local training evidence for ${testCase.id}.`,
    ],
  });
  const run = runCli({
    rootDir: tempRoot,
    args: ['mission', 'run', mission.id, '--provider', 'stub'],
  });
  assert.equal(run.status, 'completed');
  assert.equal(run.reviewerVerdict, 'pass');
  assert.ok(run.learningCandidateId);
  const promotion = runCli({
    rootDir: tempRoot,
    args: [
      'action',
      'resolve-learning-promotion',
      run.learningCandidateId,
      '--decision',
      'approve',
      '--target',
      'template',
      '--scope',
      'mission',
      '--note',
      'Approve reviewed evidence for deterministic local dataset preparation.',
    ],
  });
  assert.equal(promotion.learningCandidate.promotionStatus, 'approved');
  assert.equal(promotion.learningCandidate.promotionVerification.status, 'passed');
  return { run: { ...run, missionId: mission.id }, testCase };
}

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
