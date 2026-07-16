import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import { runCli } from './cli-test-helpers.mjs';

export function createApprovedTrainingRecordFixtureSet({ cases, tempPrefix }) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), tempPrefix));
  const workspacePath = path.join(tempRoot, 'workspace');
  fs.mkdirSync(workspacePath, { recursive: true });
  const workspace = runCli({
    rootDir: tempRoot,
    args: ['workspace', 'add', workspacePath, '--name', 'training-dataset-workspace'],
  });
  const completedRuns = cases.map((testCase) => runApprovedMission({
    rootDir: tempRoot,
    testCase,
    workspaceId: workspace.id,
  }));
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

  return {
    records,
    stateBefore,
    statePath,
    tempRoot,
  };
}

function runApprovedMission({ rootDir, testCase, workspaceId }) {
  const mission = runCli({
    rootDir,
    args: [
      'mission',
      'create',
      '--workspace',
      workspaceId,
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
    rootDir,
    args: ['mission', 'run', mission.id, '--provider', 'stub'],
  });
  assert.equal(run.status, 'completed');
  assert.equal(run.reviewerVerdict, 'pass');
  assert.ok(run.learningCandidateId);
  const promotion = runCli({
    rootDir,
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
