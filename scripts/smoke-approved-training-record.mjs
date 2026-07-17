import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildApprovedTrainingRecord,
  evaluateApprovedTrainingRecordEligibility,
} from '../src/core/approved-training-record.mjs';
import { runCli } from './cli-test-helpers.mjs';

const repoDir = process.cwd();
const fixture = JSON.parse(readRequiredFile('fixtures/approved-training-record-cases-v1.json'));
const developmentPlan = readRequiredFile('docs/ml-rag-development-plan-v1.md');
const readme = readRequiredFile('README.md');
const evidenceGallery = readRequiredFile('docs/evidence-gallery.md');
const evidenceManifest = readRequiredFile('evidence/evidence_manifest.md');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'personal-ai-agent-approved-training-record-'));
const workspacePath = path.join(tempRoot, 'workspace');
fs.mkdirSync(workspacePath, { recursive: true });

assert.equal(fixture.schemaVersion, 'personal-ai-agent-approved-training-record-fixture/v1');
assert.equal(fixture.productionReadyClaim, false);

const workspace = runCli({
  rootDir: tempRoot,
  args: ['workspace', 'add', workspacePath, '--name', 'approved-training-record-workspace'],
});
const createdMission = runCli({
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
    'Approved training record fixture',
    '--objective',
    'Produce a reviewed decision memo pattern for local training dataset preparation.',
  ],
});
const run = runCli({
  rootDir: tempRoot,
  args: ['mission', 'run', createdMission.id, '--provider', 'stub'],
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
    'Approve the reviewed success pattern for local dataset preparation.',
  ],
});
assert.equal(promotion.learningCandidate.promotionStatus, 'approved');
assert.equal(promotion.learningCandidate.promotionVerification.status, 'passed');

const statePath = path.join(tempRoot, 'var', 'state.json');
const stateBefore = fs.readFileSync(statePath);
const state = JSON.parse(stateBefore);
const candidate = state.learningCandidates.find((item) => item.id === run.learningCandidateId);
const mission = state.missions.find((item) => item.id === createdMission.id);
const session = state.sessions.find((item) => item.id === run.sessionId);
const stateWorkspace = state.workspaces.find((item) => item.id === workspace.id);
const artifacts = state.artifacts.filter((artifact) => artifact.sessionId === session.id);
const reviewerArtifact = artifacts.find(
  (artifact) =>
    artifact.role === 'reviewer' &&
    artifact.kind === 'agent-output' &&
    candidate.evidence.artifactIds.includes(artifact.id),
);
const sourceArtifact = artifacts.find(
  (artifact) =>
    artifact.role === 'executor' &&
    artifact.kind === 'deliverable' &&
    candidate.evidence.artifactIds.includes(artifact.id),
);
assert.ok(candidate);
assert.ok(mission);
assert.ok(session);
assert.ok(stateWorkspace);
assert.ok(reviewerArtifact);
assert.ok(sourceArtifact);
const generatedAt = new Date(
  Date.parse(candidate.promotionVerification.verifiedAt) + 1_000,
).toISOString();

const input = {
  artifacts,
  candidate,
  generatedAt,
  mission,
  reviewerArtifactId: reviewerArtifact.id,
  sanitizedExample: fixture.sanitizedExample,
  session,
  sourceArtifactId: sourceArtifact.id,
  workspace: stateWorkspace,
};
const record = buildApprovedTrainingRecord(input);
const replayedRecord = buildApprovedTrainingRecord(input);

assert.deepEqual(replayedRecord, record);
assert.equal(record.status, fixture.expected.status);
assert.equal(record.externalSubmissionAuthorized, fixture.expected.externalSubmissionAuthorized);
assert.equal(record.fineTuningExecutionAuthorized, fixture.expected.fineTuningExecutionAuthorized);
assert.equal(record.scope.type, fixture.expected.scopeType);
assert.equal(record.lineage.candidateId, candidate.id);
assert.equal(record.lineage.candidateArtifactId, candidate.artifactId);
assert.equal(record.lineage.reviewerArtifactId, reviewerArtifact.id);
assert.equal(record.lineage.sourceArtifactId, sourceArtifact.id);
assert.equal(record.promotionVerification.id, candidate.promotionVerification.id);
assert.equal(record.safety.checks.every((check) => check.status === 'passed'), true);
assert.equal(JSON.stringify(record).includes(tempRoot), false);
assert.deepEqual(fs.readFileSync(statePath), stateBefore, 'training record builder must not mutate the store');

for (const unsafe of fixture.unsafeExamples) {
  const unsafeInput = structuredClone(input);
  unsafeInput.sanitizedExample[unsafe.field] = unsafe.value;
  const evaluation = evaluateApprovedTrainingRecordEligibility(unsafeInput);
  assert.equal(evaluation.eligible, false, `${unsafe.id} must be rejected`);
  assert.equal(
    evaluation.failedCheckIds.includes(unsafe.expectedFailedCheck),
    true,
    `${unsafe.id} must fail ${unsafe.expectedFailedCheck}`,
  );
}

const acceptedRiskRecord = buildApprovedTrainingRecord({
  ...input,
  acceptedRisk: {
    ...fixture.acceptedRisk,
    approvedAt: candidate.promotionVerification.verifiedAt,
    expiresAt: new Date(Date.parse(generatedAt) + 72 * 60 * 60 * 1_000).toISOString(),
    scopeId: mission.id,
  },
});
assert.equal(acceptedRiskRecord.acceptedRisk.approvedBy, 'workspace-owner');
assert.equal(acceptedRiskRecord.acceptedRisk.scopeId, mission.id);
assert.ok(Date.parse(acceptedRiskRecord.acceptedRisk.expiresAt) > Date.parse(generatedAt));

for (const term of [
  'status: local-answer-composition-candidate-current',
  '| L1 승인된 학습 데이터 | 완료 |',
  '| L2 Dataset quality gate | 완료 |',
  '| F1 Fine-tuning readiness | 완료 |',
  'fixtures/approved-training-record-cases-v1.json',
  'npm run smoke:approved-training-record',
  'externalSubmissionAuthorized: false',
  'fineTuningExecutionAuthorized: false',
  'productionReadyClaim: false',
]) {
  assert.ok(developmentPlan.includes(term), `ML/RAG development plan missing ${term}`);
}
assert.ok(
  readme.includes('npm run smoke:approved-training-record'),
  'README must expose the approved training record command',
);
assert.ok(
  evidenceGallery.includes('| Approved training record | `docs/ml-rag-development-plan-v1.md` |'),
  'evidence gallery must link the approved training record',
);
assert.ok(
  evidenceManifest.includes('Approved training record: verified with `npm run smoke:approved-training-record`'),
  'evidence manifest must record the approved training record',
);

console.log(
  JSON.stringify(
    {
      acceptedRiskGovernanceVerified: true,
      candidateId: candidate.id,
      contentHash: record.contentHash,
      costFree: true,
      externalSubmissionAuthorized: false,
      fineTuningExecutionAuthorized: false,
      lineageHash: record.lineageHash,
      mode: 'approved-training-record',
      ok: true,
      productionReadyClaim: false,
      safetyCheckCount: record.safety.checks.length,
      unsafeCaseCount: fixture.unsafeExamples.length,
    },
    null,
    2,
  ),
);

function readRequiredFile(relativePath) {
  const filePath = path.join(repoDir, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`required file not found: ${relativePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}
