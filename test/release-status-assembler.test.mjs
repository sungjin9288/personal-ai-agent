import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assembleExecutionV1Status,
  buildExecutionV1ArtifactSummary,
} from '../src/web/release-status-assembler.mjs';

function buildArtifactMarkdown(commit = 'verified-commit') {
  const evidence = `# Execution Evidence

- branch: main
- commit: ${commit}
- generatedAt: 2026-07-14T00:00:00.000Z

## Deterministic Verification

- smoke:execution-flow: passed
- smoke:reference-adoptions: passed
- smoke:execution-v1-live-helpers: passed
- smoke:execution-v1-handoff: passed
- smoke:production-readiness-gate: passed

## Deterministic Runtime Summary

- smoke:execution-flow: 1s elapsed, stdout 1 byte, stderr 0 bytes, timeout 120s

## Reference Adoption Aggregate

- scriptCount: 28
- totalDuration: 4s
- ok: true

## Live Validation

- openai: passed

## Remaining Gaps

- target evidence remains external
`;
  const closeout = `# Execution Closeout

- branch: main
- commit: ${commit}
- generatedAt: 2026-07-14T00:01:00.000Z

## Closeout Checklist

- [x] deterministic verification

## Current Status

- openai live validation: passed

## Notes

- preserve the target boundary
`;
  return { closeout, evidence };
}

function buildAssemblerInput({
  artifactSyncDetected = true,
  currentCommit = 'artifact-sync-commit',
  generatedCommit = 'verified-commit',
  providerReadiness = [],
  snapshotCommit = 'verified-commit',
} = {}) {
  const currentMarkdown = buildArtifactMarkdown(generatedCommit);
  const baselineMarkdown = buildArtifactMarkdown(snapshotCommit);
  const handoffMarkdown = `- commit: ${generatedCommit}\n- generatedAt: 2026-07-14T00:02:00.000Z\n`;
  const currentArtifacts = buildExecutionV1ArtifactSummary(
    currentMarkdown.evidence,
    currentMarkdown.closeout,
  );
  const baselineArtifacts = buildExecutionV1ArtifactSummary(
    baselineMarkdown.evidence,
    baselineMarkdown.closeout,
  );

  return {
    artifactSyncCommit: {
      changedPaths: artifactSyncDetected ? ['docs/execution-v1-evidence.md'] : [],
      commits: artifactSyncDetected ? [currentCommit] : [],
      currentCommit,
      detected: artifactSyncDetected,
      verifiedCommit: generatedCommit,
    },
    baselineArtifacts,
    baselineDocumentsAvailable: {
      closeout: true,
      evidence: true,
      handoff: true,
    },
    baselineHandoffGeneratedAt: '2026-07-13T23:00:00.000Z',
    closeout: {
      generatedAt: currentArtifacts.closeoutGeneratedAt,
      markdown: currentMarkdown.closeout,
      path: '/repo/docs/execution-v1-closeout.md',
    },
    currentArtifacts,
    currentBranch: 'main',
    currentCommit,
    docStatuses: [],
    evidence: {
      generatedAt: currentArtifacts.evidenceGeneratedAt,
      markdown: currentMarkdown.evidence,
      path: '/repo/docs/execution-v1-evidence.md',
    },
    generatedAtFallback: '2026-07-14T00:03:00.000Z',
    handoff: {
      commit: generatedCommit,
      generatedAt: '2026-07-14T00:02:00.000Z',
      markdown: handoffMarkdown,
      path: '/repo/docs/execution-v1-handoff.md',
    },
    handoffArtifacts: [{ id: 'browser-report' }],
    providerReadiness,
    releaseActionHistory: [{ action: 'refresh' }],
    releaseReadiness: {
      currentOpenBlockerActionCount: 7,
      currentOpenBlockerCount: 7,
      currentOpenBlockerActions: [],
      markdown: '# Release Readiness',
      path: '/repo/docs/release-readiness-v1.md',
      productionBlockerCount: 24,
      productionReadyBlocked: true,
      productionReadyStatus: 'blocked',
      productionReadyStopReason: 'Target evidence is incomplete.',
    },
    runtimeJobs: {
      activeCount: 1,
      recentCount: 2,
    },
    snapshot: {
      archivedAt: '2026-07-13T23:00:00.000Z',
      verifiedCommit: snapshotCommit,
    },
  };
}

test('artifact summary separates required and optional verification state', () => {
  const evidence = `- branch: main
- commit: fixture-commit
- generatedAt: 2026-07-14T00:00:00.000Z

## Deterministic Verification

- smoke:execution-flow: passed
- smoke:reference-adoptions: passed
- smoke:execution-v1-live-helpers: passed
- smoke:execution-v1-handoff: passed
- smoke:production-readiness-gate: failed

## Deterministic Runtime Summary

- smoke:execution-flow: 1s elapsed, stdout 1 byte, stderr 0 bytes, timeout 120s

## Reference Adoption Aggregate

- scriptCount: 28
- ok: true

## Live Validation

- openai: passed

## Remaining Gaps

- target evidence
`;
  const closeout = `- branch: main
- commit: fixture-commit
- generatedAt: 2026-07-14T00:01:00.000Z

## Closeout Checklist

- [x] deterministic verification
- [ ] required target evidence
- [ ] Anthropic live validation

## Current Status

- required target evidence: blocked
- Anthropic live validation: missing-env

## Notes

- keep production-ready blocked
`;

  const summary = buildExecutionV1ArtifactSummary(evidence, closeout);

  assert.equal(summary.branch, 'main');
  assert.equal(summary.commit, 'fixture-commit');
  assert.equal(summary.deterministicPassed, 4);
  assert.equal(summary.deterministic.length, 5);
  assert.equal(summary.coreDeterministicPassed, 1);
  assert.equal(summary.coreDeterministicTotal, 1);
  assert.equal(summary.referenceAdoptionPassed, 1);
  assert.equal(summary.executionV1HelperPassed, 1);
  assert.equal(summary.executionV1HandoffPassed, 1);
  assert.equal(summary.productionReadinessGatePassed, 0);
  assert.equal(summary.requiredChecklistOpen, 1);
  assert.equal(summary.optionalChecklistOpen, 1);
  assert.equal(summary.blockedItems, 1);
  assert.equal(summary.optionalBlockedItems, 1);
  assert.equal(summary.referenceAdoptionAggregate.scriptCount, 28);
  assert.deepEqual(summary.gaps, ['target evidence']);
  assert.deepEqual(summary.notes, ['keep production-ready blocked']);
});

test('artifact sync commit stays current without creating another snapshot recommendation', () => {
  const input = buildAssemblerInput();

  const status = assembleExecutionV1Status(input);

  assert.equal(status.artifactState, 'artifact-sync-current');
  assert.equal(status.artifactsMatchCurrentHead, true);
  assert.equal(status.stale, false);
  assert.deepEqual(status.staleReasons, []);
  assert.equal(status.snapshotEligibility.allowed, false);
  assert.match(status.snapshotEligibility.reason, /release artifact sync/);
  assert.equal(status.recommendedActions.some((item) => item.action === 'archive-release-snapshot'), false);
  assert.equal(status.summary.handoffReady, true);
  assert.equal(status.summary.baselineReady, true);
  assert.equal(status.summary.referenceAdoptionReady, true);
  assert.equal(status.summary.productionReadyBlocked, true);
  assert.equal(status.localArtifactNotes.length, 1);
  assert.deepEqual(status.handoffArtifacts, [{ id: 'browser-report' }]);
  assert.deepEqual(status.releaseActionHistory, [{ action: 'refresh' }]);
});

test('commit mismatch is stale and recommends regenerating the mutable release surface', () => {
  const input = buildAssemblerInput({
    artifactSyncDetected: false,
    currentCommit: 'new-head',
  });

  const status = assembleExecutionV1Status(input);

  assert.equal(status.artifactState, 'stale');
  assert.equal(status.artifactsMatchCurrentHead, false);
  assert.equal(status.stale, true);
  assert.equal(status.staleReasons.length, 2);
  assert.equal(status.recommendedActions[0].action, 'regenerate-release-surface');
  assert.equal(status.recommendedActions[0].priority, 1);
  assert.equal(status.snapshotEligibility.allowed, false);
  assert.match(status.snapshotEligibility.reason, /최신 HEAD/);
  assert.equal(status.summary.ready, false);
  assert.equal(status.summary.staleReasonCount, 2);
});

test('fresh current artifacts recommend snapshot and provider work in priority order', () => {
  const providerReadiness = [
    {
      command: 'npm run live:execution-v1:openai',
      envKey: 'OPENAI_API_KEY',
      evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-openai',
      label: 'OpenAI',
      preflightCommand: 'npm run preflight:execution-v1:openai',
      provider: 'openai',
      ready: true,
      status: 'ready',
    },
    {
      command: 'npm run live:execution-v1:anthropic',
      envKey: 'ANTHROPIC_API_KEY',
      evidenceCommand: 'node scripts/build-execution-v1-evidence.mjs --live-anthropic',
      label: 'Anthropic',
      preflightCommand: 'npm run preflight:execution-v1:anthropic',
      provider: 'anthropic',
      ready: false,
      status: 'missing-env',
    },
  ];
  const input = buildAssemblerInput({
    artifactSyncDetected: false,
    currentCommit: 'verified-commit',
    providerReadiness,
    snapshotCommit: 'older-commit',
  });
  input.currentArtifacts.values = {};

  const status = assembleExecutionV1Status(input);

  assert.equal(status.artifactState, 'current');
  assert.equal(status.stale, false);
  assert.equal(status.snapshotEligibility.allowed, true);
  assert.deepEqual(status.recommendedActions.map((item) => item.priority), [2, 3, 5]);
  assert.equal(status.recommendedActions[0].action, 'archive-release-snapshot');
  assert.equal(status.recommendedActions[1].action, 'run-release-preflight');
  assert.equal(status.recommendedActions[1].provider, 'openai');
  assert.equal(status.recommendedActions[1].category, 'required');
  assert.equal(status.recommendedActions[2].provider, 'anthropic');
  assert.equal(status.recommendedActions[2].category, 'optional');
  assert.match(status.recommendedActions[2].command, /export ANTHROPIC_API_KEY/);
});

test('missing current documents return stable missing-state defaults', () => {
  const status = assembleExecutionV1Status({
    generatedAtFallback: '2026-07-14T00:03:00.000Z',
    runtimeJobs: { activeCount: 0, recentCount: 0 },
  });

  assert.equal(status.artifactState, 'missing');
  assert.equal(status.stale, true);
  assert.equal(status.staleReasons.length, 1);
  assert.equal(status.snapshotEligibility.allowed, false);
  assert.match(status.snapshotEligibility.reason, /아직 없는 문서/);
  assert.equal(status.updatedAt, '2026-07-14T00:03:00.000Z');
  assert.equal(status.summary.ready, false);
  assert.equal(status.baseline, null);
});
