import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildApprovalRequest,
  buildExecutionManifestArtifact,
  buildMissionCloseoutResult,
  buildReviewerFollowUpSeed,
  buildReviewerReconciliation,
} from '../src/core/mission-review-closeout.mjs';

test('buildReviewerReconciliation keeps a matching provider verdict unchanged', () => {
  assert.equal(
    buildReviewerReconciliation({
      deterministicReview: { checks: [], findings: [], verdict: 'pass' },
      reviewerStage: { output: { verdict: 'pass' } },
      updatedAt: '2026-07-15T00:00:00.000Z',
    }),
    null,
  );
});

test('buildReviewerReconciliation replaces a mismatched verdict with deterministic failure evidence', () => {
  const deterministicReview = {
    checks: [{ id: 'required-sections', passed: false }],
    findings: ['Missing required section: Decision'],
    verdict: 'fail',
  };
  const reconciliation = buildReviewerReconciliation({
    deterministicReview,
    reviewerStage: {
      output: {
        findings: [],
        summaryText: 'Provider review passed.',
        verdict: 'pass',
      },
    },
    updatedAt: '2026-07-15T00:00:00.000Z',
  });

  assert.deepEqual(reconciliation.runPatch, {
    outputSummary: 'Deterministic review failed after provider mismatch.',
    status: 'failed',
    updatedAt: '2026-07-15T00:00:00.000Z',
  });
  assert.equal(reconciliation.output.verdict, 'fail');
  assert.deepEqual(reconciliation.output.findings, deterministicReview.findings);
  assert.deepEqual(reconciliation.output.checks, deterministicReview.checks);
  assert.equal(reconciliation.output.summaryText, reconciliation.runPatch.outputSummary);
  assert.match(reconciliation.output.artifactContent, /# Reviewer Report/);
  assert.match(reconciliation.output.artifactContent, /Missing required section: Decision/);
});

test('buildReviewerReconciliation records a deterministic pass after provider mismatch', () => {
  const reconciliation = buildReviewerReconciliation({
    deterministicReview: { checks: [], findings: [], verdict: 'pass' },
    reviewerStage: { output: { verdict: 'fail' } },
    updatedAt: 'now',
  });

  assert.equal(reconciliation.runPatch.status, 'completed');
  assert.equal(reconciliation.runPatch.outputSummary, 'Deterministic review passed after provider mismatch.');
  assert.equal(reconciliation.output.verdict, 'pass');
});

test('buildReviewerFollowUpSeed preserves mission, session, workspace, and report lineage', () => {
  const seed = buildReviewerFollowUpSeed({
    at: '2026-07-15T00:00:00.000Z',
    mission: {
      deliverableType: 'checklist',
      id: 'mission-1',
      mode: 'knowledge',
      title: 'Review the checklist',
    },
    reviewerStage: {
      artifact: { path: '/tmp/reviewer-report.md' },
      output: { findings: ['Checklist item missing.'] },
      run: { outputSummary: 'Deterministic review failed.' },
    },
    session: { id: 'session-1' },
    workspace: { id: 'workspace-1', name: 'Workspace One' },
  });

  assert.equal(seed.actionId, 'reviewer-follow-up:mission-1:session-1');
  assert.equal(seed.actionClass, 'retry-ready');
  assert.equal(seed.missionStatus, 'failed');
  assert.equal(seed.sessionStatus, 'failed');
  assert.equal(seed.reportPath, '/tmp/reviewer-report.md');
  assert.deepEqual(seed.findings, ['Checklist item missing.']);
  assert.equal(seed.status, 'open');
  assert.equal(seed.createdAt, '2026-07-15T00:00:00.000Z');
  assert.equal(seed.updatedAt, '2026-07-15T00:00:00.000Z');
  assert.equal(seed.workspaceId, 'workspace-1');
});

test('buildExecutionManifestArtifact returns null without a normalized manifest', () => {
  assert.equal(
    buildExecutionManifestArtifact({
      executionContext: { manifest: null },
      generatedAt: 'now',
      mission: { id: 'mission-1' },
      session: { id: 'session-1' },
      workspace: { path: '/workspace' },
    }),
    null,
  );
});

test('buildExecutionManifestArtifact serializes trusted execution lineage with the manifest', () => {
  const artifact = buildExecutionManifestArtifact({
    executionContext: {
      manifest: {
        generatedAt: 'provider-time',
        manifestHash: 'provider-hash',
        missionId: 'provider-mission',
        reviewSessionId: 'provider-session',
        source: 'provider',
        steps: [{ id: 'step-1' }],
        summary: 'Apply one change.',
        workspacePath: '/provider-workspace',
      },
      manifestHash: 'manifest-sha',
      reviewSession: { id: 'review-session-1' },
    },
    generatedAt: '2026-07-15T00:00:00.000Z',
    mission: { id: 'mission-1' },
    session: { id: 'session-1' },
    workspace: { path: '/workspace' },
  });
  const content = JSON.parse(artifact.content);

  assert.equal(artifact.kind, 'execution-manifest');
  assert.equal(artifact.fileName, 'execution-manifest.json');
  assert.equal(artifact.missionId, 'mission-1');
  assert.equal(artifact.sessionId, 'session-1');
  assert.equal(content.generatedAt, '2026-07-15T00:00:00.000Z');
  assert.equal(content.manifestHash, 'manifest-sha');
  assert.equal(content.missionId, 'mission-1');
  assert.equal(content.reviewSessionId, 'review-session-1');
  assert.equal(content.workspacePath, '/workspace');
  assert.equal(content.summary, 'Apply one change.');
});

test('buildApprovalRequest keeps reviewer ownership and risk evidence explicit', () => {
  assert.deepEqual(
    buildApprovalRequest({
      mission: { id: 'mission-1' },
      risk: {
        kind: 'workspace_execution',
        reason: 'Workspace mutation requires approval.',
        title: 'Approve workspace execution',
      },
      session: { id: 'session-1' },
    }),
    {
      kind: 'workspace_execution',
      missionId: 'mission-1',
      reason: 'Workspace mutation requires approval.',
      requestedByRole: 'reviewer',
      sessionId: 'session-1',
      title: 'Approve workspace execution',
    },
  );
});

test('buildMissionCloseoutResult keeps the common result shape without inventing execution evidence', () => {
  const result = buildMissionCloseoutResult({
    approval: null,
    artifactPath: '/tmp/deliverable.md',
    learningCandidate: { id: 'learning-1' },
    mission: { id: 'mission-1', status: 'completed' },
    providerId: 'stub',
    reviewerVerdict: 'pass',
    session: { id: 'session-1', status: 'completed' },
  });

  assert.equal(result.approval, null);
  assert.equal(result.provider, 'stub');
  assert.equal(result.reviewerVerdict, 'pass');
  assert.equal('execution' in result, false);
});

test('buildMissionCloseoutResult includes execution context only when it exists', () => {
  const execution = { manifestHash: 'manifest-sha', supported: true };
  const result = buildMissionCloseoutResult({
    artifactPath: '/tmp/deliverable.md',
    execution,
    learningCandidate: { id: 'learning-1' },
    mission: { id: 'mission-1', status: 'reviewed' },
    providerId: 'stub',
    reviewerVerdict: 'pass',
    session: { id: 'session-1', status: 'completed' },
  });

  assert.equal(result.approval, null);
  assert.equal(result.execution, execution);
});
