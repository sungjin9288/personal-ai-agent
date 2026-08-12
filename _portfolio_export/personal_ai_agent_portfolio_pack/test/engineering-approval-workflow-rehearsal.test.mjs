import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertEngineeringApprovalRehearsalEvidence,
  buildEngineeringApprovalRehearsalEvidence,
  inspectFixtureApproval,
} from '../src/core/engineering-approval-rehearsal-evidence.mjs';

const sha = (character) => character.repeat(64);
const fixtureReason = 'deterministic-rehearsal-fixture: approve bounded local handoff only.';

function createInput() {
  return {
    artifactSha256: {
      executionReadyBrief: sha('5'),
      executorDeliverable: sha('3'),
      manager: sha('1'),
      planner: sha('2'),
      reviewerReport: sha('4'),
    },
    captureCommit: 'a'.repeat(40),
    generatedAt: '2026-08-11T00:00:00.000Z',
    limitations: {
      costClaim: false,
      customerImpactClaim: false,
      externalProviderValidated: false,
      generalizableClaim: false,
      humanApprovalCollected: false,
      humanFeedbackCollected: false,
      participantCount: 0,
      productivityClaim: false,
      productionReadyClaim: false,
      slaClaim: false,
    },
    observed: {
      actionInboxInspected: true,
      approvalInboxInspected: true,
      executionReadyBriefInspected: true,
      fixtureApprovalLabel: 'deterministic-rehearsal-fixture',
      fixtureDecision: 'approve',
      missionShowInspected: true,
      pendingApprovalCountAfter: 0,
      pendingApprovalCountBefore: 1,
      postApprovalStatus: 'completed',
      preApprovalStatus: 'awaiting_approval',
      reviewerVerdict: 'pass',
      roleOrder: ['manager', 'planner', 'executor', 'reviewer'],
      timelineInspected: true,
    },
    safety: {
      externalMessagingEnabled: false,
      externalProviderCalls: 0,
      providerCostUsd: 0,
      rawArtifactContentPublished: false,
      runtimeRootCleaned: true,
      runtimeRootEphemeral: true,
      targetWorkspaceDigestAfter: sha('6'),
      targetWorkspaceDigestBefore: sha('6'),
    },
    scenario: {
      constraints: [
        'Keep blast radius small.',
        'Do not commit, push, deploy, or mutate production systems.',
        'Require verification before closeout.',
      ],
      distinctFromPilotFeedbackMission: true,
      id: 'scenario-2-engineering-mission-with-approval',
      objective: 'Produce a small implementation plan with assumptions, success criteria, verification, and approval boundary.',
      providerMode: 'stub',
      title: 'Prepare bounded implementation plan',
    },
    status: 'verified-deterministic-rehearsal',
  };
}

test('builds an exact content-free Scenario 2 rehearsal record', () => {
  const evidence = buildEngineeringApprovalRehearsalEvidence(createInput());

  assert.deepEqual(Object.keys(evidence), [
    'schemaVersion',
    'status',
    'generatedAt',
    'captureCommit',
    'scenario',
    'observed',
    'safety',
    'artifactSha256',
    'limitations',
    'integrityHash',
  ]);
  assert.equal(evidence.schemaVersion, 'personal-ai-agent-engineering-approval-rehearsal/v1');
  assert.match(evidence.integrityHash, /^[a-f0-9]{64}$/);
  assert.doesNotThrow(() => assertEngineeringApprovalRehearsalEvidence(evidence));
});

test('rejects incomplete, unsafe, or authority-expanding rehearsal observations', () => {
  const cases = [
    ['non-stub provider', (input) => { input.scenario.providerMode = 'openai'; }, /provider mode/i],
    ['reordered roles', (input) => { input.observed.roleOrder.reverse(); }, /role order/i],
    ['missing approval gate', (input) => { input.observed.preApprovalStatus = 'completed'; }, /pre-approval status/i],
    ['wrong approval count', (input) => { input.observed.pendingApprovalCountBefore = 0; }, /approval count/i],
    ['human approval claim', (input) => { input.limitations.humanApprovalCollected = true; }, /human approval/i],
    ['production claim', (input) => { input.limitations.productionReadyClaim = true; }, /production-ready/i],
    ['external provider call', (input) => { input.safety.externalProviderCalls = 1; }, /external provider calls/i],
    ['workspace mutation', (input) => { input.safety.targetWorkspaceDigestAfter = sha('7'); }, /workspace digest/i],
    ['machine-local path', (input) => { input.scenario.objective = '/Users/example/private'; }, /machine-local path/i],
    ['raw runtime identifier', (input) => { input.scenario.title = 'mission_private123'; }, /raw runtime identifier/i],
    ['unknown scenario field', (input) => { input.scenario.unverified = true; }, /scenario keys/i],
  ];

  for (const [name, mutate, expected] of cases) {
    const input = createInput();
    mutate(input);
    assert.throws(
      () => buildEngineeringApprovalRehearsalEvidence(input),
      expected,
      name,
    );
  }
});

test('rejects an evidence record changed after sealing', () => {
  const evidence = buildEngineeringApprovalRehearsalEvidence(createInput());
  evidence.generatedAt = '2026-08-12T00:00:00.000Z';

  assert.throws(
    () => assertEngineeringApprovalRehearsalEvidence(evidence),
    /integrity hash/i,
  );
});

test('derives fixture approval evidence from the resolved record and handoff', () => {
  const observation = inspectFixtureApproval({
    approval: {
      decision: 'approve',
      decisionReason: fixtureReason,
      status: 'approved',
    },
    handoffArtifact: {
      fileName: 'execution-ready-brief.md',
      kind: 'execution-handoff',
      role: 'manager',
    },
    handoffContent: `# Execution Ready Brief\n\n- reason: ${fixtureReason}\n`,
  });

  assert.deepEqual(observation, {
    executionReadyBriefInspected: true,
    fixtureApprovalLabel: 'deterministic-rehearsal-fixture',
    fixtureDecision: 'approve',
  });
});

test('rejects a resolved approval or handoff without exact fixture provenance', () => {
  const base = {
    approval: {
      decision: 'approve',
      decisionReason: fixtureReason,
      status: 'approved',
    },
    handoffArtifact: {
      fileName: 'execution-ready-brief.md',
      kind: 'execution-handoff',
      role: 'manager',
    },
    handoffContent: `# Execution Ready Brief\n\n- reason: ${fixtureReason}\n`,
  };
  const cases = [
    { ...base, approval: { ...base.approval, decisionReason: 'Approved by a human.' } },
    { ...base, handoffArtifact: { ...base.handoffArtifact, kind: 'deliverable' } },
    { ...base, handoffContent: '# Execution Ready Brief\n\n- reason: missing marker\n' },
  ];

  for (const input of cases) {
    assert.throws(() => inspectFixtureApproval(input), /fixture|handoff/i);
  }
});

test('replays Scenario 2 through the real CLI without retaining runtime state', (t) => {
  const repoDir = process.cwd();
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-approval-rehearsal-test-'));
  const scriptPath = path.join(repoDir, 'scripts', 'rehearse-engineering-approval-workflow.mjs');
  const statusBefore = gitStatus(repoDir);

  t.after(() => fs.rmSync(tempParent, { force: true, recursive: true }));

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      TMPDIR: tempParent,
    },
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stderr, '');

  const evidence = JSON.parse(result.stdout);
  assert.doesNotThrow(() => assertEngineeringApprovalRehearsalEvidence(evidence));
  assert.equal(evidence.observed.preApprovalStatus, 'awaiting_approval');
  assert.equal(evidence.observed.postApprovalStatus, 'completed');
  assert.equal(evidence.observed.pendingApprovalCountBefore, 1);
  assert.equal(evidence.observed.pendingApprovalCountAfter, 0);
  assert.deepEqual(evidence.observed.roleOrder, ['manager', 'planner', 'executor', 'reviewer']);
  assert.equal(evidence.limitations.participantCount, 0);
  assert.equal(evidence.limitations.humanApprovalCollected, false);
  assert.equal(evidence.safety.targetWorkspaceDigestAfter, evidence.safety.targetWorkspaceDigestBefore);
  assert.equal(JSON.stringify(evidence).includes(tempParent), false);
  assert.equal(/\b(?:approval|mission|session|workspace)_[A-Za-z0-9_-]+\b/.test(JSON.stringify(evidence)), false);
  assert.deepEqual(fs.readdirSync(tempParent), []);
  assert.equal(gitStatus(repoDir), statusBefore);
});

test('rejects an output path outside the one repository evidence target', (t) => {
  const repoDir = process.cwd();
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-approval-output-test-'));
  const scriptPath = path.join(repoDir, 'scripts', 'rehearse-engineering-approval-workflow.mjs');
  const outsidePath = path.join(tempParent, 'outside.json');

  t.after(() => fs.rmSync(tempParent, { force: true, recursive: true }));

  const result = spawnSync(process.execPath, [scriptPath, '--output', outsidePath], {
    cwd: repoDir,
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: tempParent },
  });

  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(outsidePath), false);
});

test('cleans the temporary runtime when final evidence validation fails', (t) => {
  const repoDir = process.cwd();
  const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), 'engineering-approval-failure-test-'));
  const scriptPath = path.join(repoDir, 'scripts', 'rehearse-engineering-approval-workflow.mjs');

  t.after(() => fs.rmSync(tempParent, { force: true, recursive: true }));

  const result = spawnSync(process.execPath, [scriptPath, '--capture-commit', 'invalid'], {
    cwd: repoDir,
    encoding: 'utf8',
    env: { ...process.env, TMPDIR: tempParent },
  });

  assert.notEqual(result.status, 0);
  assert.deepEqual(fs.readdirSync(tempParent), []);
});

function gitStatus(repoDir) {
  const result = spawnSync('git', ['status', '--short'], {
    cwd: repoDir,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}
