import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const repoDir = path.resolve(import.meta.dirname, '..');
const contractPath = path.join(repoDir, 'src', 'core', 'pilot-feedback-evidence.mjs');
const smokePath = path.join(repoDir, 'scripts', 'smoke-pilot-feedback.mjs');

test('sanitized pilot feedback accepts the approved single-participant evidence', async () => {
  const { assertPilotFeedbackRecord } = await loadContract();
  assert.equal(assertPilotFeedbackRecord(createRecord()), true);
});

test('pilot feedback rejects inconsistent metrics and expanded authority', async () => {
  const { assertPilotFeedbackRecord } = await loadContract();

  const inconsistentMetrics = createRecord();
  inconsistentMetrics.feedback.positiveAnswerCount = 3;
  reseal(inconsistentMetrics);
  assert.throws(() => assertPilotFeedbackRecord(inconsistentMetrics), /positive answer count/);

  const expandedAuthority = createRecord();
  expandedAuthority.authority.externalProviderCallsAuthorized = true;
  reseal(expandedAuthority);
  assert.throws(() => assertPilotFeedbackRecord(expandedAuthority), /authority must remain false/);
});

test('pilot feedback rejects local paths, extra identity fields, and integrity drift', async () => {
  const { assertPilotFeedbackRecord } = await loadContract();

  const localPath = createRecord();
  localPath.scope.workspaceAlias = path.join(path.sep, 'Users', 'example', 'private-workspace');
  reseal(localPath);
  assert.throws(() => assertPilotFeedbackRecord(localPath), /workspace alias/);

  const participantIdentity = createRecord();
  participantIdentity.participant.name = 'Example Participant';
  reseal(participantIdentity);
  assert.throws(() => assertPilotFeedbackRecord(participantIdentity), /participant keys/);

  const integrityDrift = createRecord();
  integrityDrift.feedback.nextWorkflow = 'changed-without-resealing';
  assert.throws(() => assertPilotFeedbackRecord(integrityDrift), /integrity/);
});

test('pilot feedback smoke rejects a resealed unknown capture commit', (t) => {
  const fixtureRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'pilot-feedback-provenance-'));
  t.after(() => fs.rmSync(fixtureRepo, { force: true, recursive: true }));

  fs.mkdirSync(path.join(fixtureRepo, 'config'));
  fs.mkdirSync(path.join(fixtureRepo, 'docs'));
  fs.copyFileSync(
    path.join(repoDir, 'docs', 'pilot-feedback-v1.md'),
    path.join(fixtureRepo, 'docs', 'pilot-feedback-v1.md'),
  );

  const record = createRecord();
  record.captureCommit = 'f'.repeat(40);
  reseal(record);
  fs.writeFileSync(
    path.join(fixtureRepo, 'config', 'pilot-feedback-v1.json'),
    `${JSON.stringify(record, null, 2)}\n`,
  );

  runGit(fixtureRepo, ['init', '--quiet']);
  fs.writeFileSync(path.join(fixtureRepo, 'fixture.txt'), 'unrelated history\n');
  runGit(fixtureRepo, ['add', 'fixture.txt']);
  runGit(fixtureRepo, [
    '-c', 'user.name=Pilot Fixture',
    '-c', 'user.email=pilot-fixture@example.invalid',
    'commit', '--quiet', '-m', 'fixture history',
  ]);

  const result = spawnSync(process.execPath, [smokePath], {
    cwd: fixtureRepo,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, /capture commit does not exist/);
});

async function loadContract() {
  assert.equal(fs.existsSync(contractPath), true, 'pilot feedback evidence contract must exist');
  return import(pathToFileURL(contractPath));
}

function createRecord() {
  return seal({
    schemaVersion: 'personal-ai-agent-pilot-feedback/v1',
    status: 'sanitized-single-participant-evidence',
    recordedAt: '2026-08-10T23:00:00.000Z',
    captureCommit: 'a7f0582b63a8e3f7853a08bbf7a83bae602c323e',
    participant: {
      count: 1,
      role: 'engineering-participant',
      consentRecorded: true,
      consentScope: 'sanitized-feedback-and-predefined-metrics',
      identityStored: false,
    },
    scope: {
      workspaceAlias: 'approved-nonsensitive-workspace',
      providerMode: 'deterministic-only',
      missionTitle: 'Verify release readiness for pilot workspace',
    },
    runEvidence: {
      demoSteps: { passed: 8, total: 8 },
      missionIdSha256: '1'.repeat(64),
      sessionIdSha256: '2'.repeat(64),
      artifactSha256: {
        deliverable: '3'.repeat(64),
        executionManifest: '4'.repeat(64),
        reviewerReport: '5'.repeat(64),
      },
      missionStatus: 'reviewed',
      reviewerVerdict: 'pass',
      stubRoleRuns: { passed: 4, total: 4 },
      externalProviderCallCount: 0,
      apiCostUsd: 0,
      workspaceMutationCount: 0,
      externalMessagingEnabled: false,
      approvalBehavior: 'approval-required-before-execution',
      pendingApprovalCount: 0,
    },
    feedback: {
      missionObjectiveClear: true,
      outputUsefulForReview: true,
      approvalPointUnderstandable: true,
      evidenceHandoffPossible: true,
      positiveAnswerCount: 4,
      questionCount: 4,
      broaderUsageBlocker: 'none-observed-in-this-single-pilot',
      decision: 'continue-deterministic-only-pilot',
      nextWorkflow: 'another-bounded-nonsensitive-engineering-workflow',
    },
    limitations: {
      participantCount: 1,
      deterministicOnly: true,
      externalProviderValidated: false,
      customerImpactMeasured: false,
      productivityMeasured: false,
      costSavingsMeasured: false,
      slaMeasured: false,
      generalizable: false,
      rawLocalArtifactsPublished: false,
    },
    authority: {
      externalProviderCallsAuthorized: false,
      productionMutationAuthorized: false,
      privateTrainingAuthorized: false,
      customerSecretsAuthorized: false,
      productionReadyClaim: false,
    },
  });
}

function seal(content) {
  const record = structuredClone(content);
  record.integrityHash = digest(record);
  return record;
}

function reseal(record) {
  delete record.integrityHash;
  record.integrityHash = digest(record);
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function runGit(cwd, args) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
