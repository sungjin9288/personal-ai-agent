import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildFineTuningPrivateCollectionItemArtifactPreparationResolution } from '../src/core/fine-tuning-private-collection-item-artifact-preparation-resolution.mjs';
import { buildFineTuningPrivateCollectionItemArtifactRequest } from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import { buildFineTuningPrivateCollectionItemReviewResolution } from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { buildFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { withSyntheticLifecycleFixture, writeJson, writeLifecycleDecision } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const repoDir = process.cwd();
const script = path.join(repoDir, 'scripts', 'resolve-fine-tuning-private-collection-item-artifact-preparation.mjs');

test('F1.15 CLI publishes and exactly replays one content-free approval bundle for each lane', () => {
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepare(fixture);
      const itemBefore = fs.readFileSync(fixture.itemFilename);
      const workspaceBefore = fs.readFileSync(fixture.workspaceFilename);
      const first = run(fixture, prepared.inputs);
      const second = run(fixture, prepared.inputs);
      assert.equal(first.status, 0, first.stderr);
      assert.equal(second.status, 0, second.stderr);
      assert.equal(first.stdout, second.stdout);
      const output = JSON.parse(first.stdout);
      assert.deepEqual(Object.keys(output).sort(), [
        'answerQualityCaseEnrichmentPreparationAllowed',
        'artifactPreparationApprovalResolved',
        'artifactPreparationAuthorized',
        'externalProviderCalls',
        'productionReadyClaim',
        'reviewedExampleCanonicalizationPreparationAllowed',
        'status',
        'trainingAuthorized',
      ].sort());
      const resolution = JSON.parse(fs.readFileSync(path.join(finalDirectory(fixture), 'resolution.json'), 'utf8'));
      assert.equal(resolution.artifactPreparationAuthorized, true);
      assertProhibitedFlags(resolution);
      assert.equal(JSON.stringify(resolution).includes('Synthetic lifecycle response.'), false);
      assert.equal(JSON.stringify(resolution).includes(prepared.decision.confirmationToken), false);
      assert.deepEqual(fs.readFileSync(fixture.itemFilename), itemBefore);
      assert.deepEqual(fs.readFileSync(fixture.workspaceFilename), workspaceBefore);
    }, { lane });
  }
});

test('F1.15 CLI resumes a decision-only pending bundle and rejects a wrong owner role', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const generated = buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
      admission: fixture.admission,
      artifactRequest: prepared.artifactRequest,
      decision: prepared.decision,
      item: fixture.item,
      projection: prepared.projection,
      resolvedAt: prepared.decision.decidedAt,
      reviewResolution: prepared.reviewResolution,
      workspace: fixture.workspace,
    });
    const pending = pendingDirectory(fixture, generated);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'decision.json'), historyDecision(generated));
    const result = run(fixture, prepared.inputs);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(finalDirectory(fixture)), true);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture, { decidedByRole: 'local-operator-role' });
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(finalDirectory(fixture)), false);
  });
});

test('F1.15 CLI records a rejection without granting preparation authority', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture, { decision: 'reject' });
    prepared.decision.confirmationToken = `reject-private-collection-item-artifact-preparation:${prepared.artifactRequest.artifactRequestHash}`;
    writeJson(prepared.inputs.decision, prepared.decision);

    const result = run(fixture, prepared.inputs);

    assert.equal(result.status, 0, result.stderr);
    const resolution = JSON.parse(fs.readFileSync(path.join(finalDirectory(fixture), 'resolution.json'), 'utf8'));
    assert.equal(resolution.status, 'rejected-artifact-preparation');
    assert.equal(resolution.artifactPreparationAuthorized, false);
    assert.equal(resolution.reviewedExampleCanonicalizationPreparationAllowed, false);
    assert.equal(resolution.answerQualityCaseEnrichmentPreparationAllowed, false);
    assertProhibitedFlags(resolution);
  });
});

test('F1.15 CLI restarts only an exact empty pending directory and rejects current history ambiguity', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const generated = resolutionFor(fixture, prepared);
    const pending = pendingDirectory(fixture, generated);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);

    const result = run(fixture, prepared.inputs);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(finalDirectory(fixture)), true);
  });

  for (const files of [['decision.json'], ['decision.json', 'resolution.json']]) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepare(fixture);
      const generated = resolutionFor(fixture, prepared);
      const pending = pendingDirectory(fixture, generated);
      fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
      fs.chmodSync(pending, 0o700);
      writeJson(path.join(pending, 'decision.json'), historyDecision(generated));
      if (files.includes('resolution.json')) writeJson(path.join(pending, 'resolution.json'), generated);
      fs.mkdirSync(finalDirectory(fixture), { recursive: true, mode: 0o700 });
      fs.chmodSync(finalDirectory(fixture), 0o700);
      writeJson(path.join(finalDirectory(fixture), 'decision.json'), historyDecision(generated));
      writeJson(path.join(finalDirectory(fixture), 'resolution.json'), generated);

      const result = run(fixture, prepared.inputs);

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /ambiguous|conflicts/);
    });
  }

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const generated = resolutionFor(fixture, prepared);
    const pending = pendingDirectory(fixture, generated);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    fs.mkdirSync(finalDirectory(fixture), { recursive: true, mode: 0o700 });
    fs.chmodSync(finalDirectory(fixture), 0o700);
    writeJson(path.join(finalDirectory(fixture), 'decision.json'), historyDecision(generated));
    writeJson(path.join(finalDirectory(fixture), 'resolution.json'), generated);

    const result = run(fixture, prepared.inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /conflicts with pending state/);
    assert.equal(fs.existsSync(pending), true);
  });
});

test('F1.15 CLI rejects renamed and malformed current pending history', () => {
  for (const mutation of [
    ({ pending }) => fs.renameSync(pending, `${pending}-renamed`),
    ({ pending }) => writeJson(path.join(pending, 'unexpected.json'), { unexpected: true }),
  ]) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepare(fixture);
      const generated = resolutionFor(fixture, prepared);
      const pending = pendingDirectory(fixture, generated);
      fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
      fs.chmodSync(pending, 0o700);
      writeJson(path.join(pending, 'decision.json'), historyDecision(generated));
      mutation({ pending });

      const result = run(fixture, prepared.inputs);

      assert.notEqual(result.status, 0);
      assert.equal(fs.existsSync(finalDirectory(fixture)), false);
    });
  }
});

test('F1.15 CLI blocks current lifecycle histories while accepting a valid foreign tombstone', () => {
  const cases = [
    (fixture) => writeLegacyTombstone(fixture),
    (fixture) => writeTerminalBundle(fixture),
    (fixture) => writePendingTerminalDecision(fixture),
    (fixture) => writePendingTerminalBundle(fixture, false),
    (fixture) => writePendingTerminalBundle(fixture, true),
  ];
  for (const writeHistory of cases) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepare(fixture);
      writeHistory(fixture);
      const result = run(fixture, prepared.inputs);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /permanently blocked|pending terminal/);
    });
  }

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const foreignWithdrawalReference = 'e'.repeat(64);
    const terminal = terminalDirectory(fixture, foreignWithdrawalReference);
    fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
    fs.chmodSync(terminal, 0o700);
    writeJson(path.join(terminal, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
      action: 'withdrawn',
      admission: { id: `fine-tuning-private-collection-item-admission-${'f'.repeat(64)}`, admissionHash: 'f'.repeat(64) },
      evidenceSha256: hash('foreign-tombstone'),
      recordedAt: new Date().toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      withdrawalReferenceSha256: foreignWithdrawalReference,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    }));
    const result = run(fixture, prepared.inputs);
    assert.equal(result.status, 0, result.stderr);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const terminal = terminalDirectory(fixture, 'f'.repeat(64));
    fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
    fs.chmodSync(terminal, 0o700);
    writeJson(path.join(terminal, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
      action: 'withdrawn',
      admission: { id: `fine-tuning-private-collection-item-admission-${'f'.repeat(64)}`, admissionHash: 'f'.repeat(64) },
      evidenceSha256: hash('malformed-foreign-tombstone'),
      recordedAt: new Date().toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      withdrawalReferenceSha256: 'e'.repeat(64),
      workspace: ref(fixture.workspace, 'workspaceHash'),
    }));
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /terminal history is invalid/);
  });
});

test('F1.15 CLI rejects malformed foreign predecessor history in every F1.12-F1.14 root', () => {
  for (const rootFor of [
    (fixture) => path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-review-projections', fixture.workspace.workspaceHash),
    (fixture) => path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-review-resolutions', fixture.workspace.workspaceHash),
    (fixture) => path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-artifact-requests', fixture.workspace.workspaceHash),
  ]) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepare(fixture);
      const root = rootFor(fixture);
      const foreign = path.join(root, 'f'.repeat(64));
      fs.mkdirSync(foreign, { recursive: true, mode: 0o700 });
      fs.chmodSync(foreign, 0o700);
      writeJson(path.join(foreign, 'unexpected.json'), { malformed: true });
      const result = run(fixture, prepared.inputs);
      assert.notEqual(result.status, 0);
    });
  }
});

test('F1.15 CLI rejects current pending ambiguity in every predecessor root', () => {
  for (const writePending of [writeProjectionPending, writeReviewResolutionPending, writeArtifactRequestPending]) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepare(fixture);
      writePending(fixture, prepared);
      const result = run(fixture, prepared.inputs);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /pending|ambiguous/);
    });
  }
});

test('F1.15 CLI refuses weak, linked, and in-repository symlinked decision inputs', () => {
  for (const [label, mutate] of [
    ['weak mode', (prepared) => fs.chmodSync(prepared.inputs.decision, 0o644)],
    ['hard link', (prepared) => fs.linkSync(prepared.inputs.decision, `${prepared.inputs.decision}.link`)],
    ['ancestor symlink', (prepared) => {
      const directory = path.dirname(path.dirname(prepared.inputs.decision));
      const alternate = `${directory}-alternate`;
      fs.renameSync(directory, alternate);
      fs.symlinkSync(alternate, directory);
    }],
  ]) {
    withSyntheticLifecycleFixture((fixture) => {
      const prepared = prepare(fixture);
      mutate(prepared);
      const result = run(fixture, prepared.inputs);
      assert.notEqual(result.status, 0, label);
      assert.match(result.stderr, /owner-only bounded regular file|remain private|exact prepared workspace location/);
    });
  }
});

test('F1.15 CLI refuses an artifact preparation decision at item expiry equality', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const prepared = prepare(fixture);
    const expired = {
      ...prepared.decision,
      decidedAt: fixture.item.expiresAt,
    };
    writeJson(prepared.inputs.decision, expired);
    const result = run(fixture, prepared.inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired|live exact/);
  });
});

function prepare(fixture, decisionOverrides = {}) {
  const inputDirectory = path.join(fixture.rootDir, 'var', 'inputs');
  const artifactDirectory = path.join(fixture.rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.join(fixture.rootDir, 'evidence'), 0o700);
  fs.chmodSync(artifactDirectory, 0o700);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-sufficiency.json'), fixture.sources.assessment);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-collection-plan.json'), fixture.sources.collectionPlan);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-intake-request.json'), fixture.sources.intakeRequest);
  const inputs = {
    admission: fixture.admissionFilename,
    artifactRequest: path.join(fixture.rootDir, 'var', 'artifact-request-input.json'),
    decision: path.join(inputDirectory, 'artifact-preparation-decision.json'),
    executionRequest: path.join(inputDirectory, 'execution-request.json'),
    executionResolution: path.join(inputDirectory, 'execution-resolution.json'),
    intakeResolution: path.join(inputDirectory, 'intake-resolution.json'),
    item: fixture.itemFilename,
    plan: path.join(inputDirectory, 'plan.json'),
    projection: projectionFilename(fixture),
    reviewResolution: reviewResolutionFilename(fixture),
    workspace: fixture.workspaceFilename,
  };
  writeJson(inputs.executionRequest, fixture.sources.executionRequest);
  writeJson(inputs.executionResolution, fixture.sources.executionResolution);
  writeJson(inputs.intakeResolution, fixture.sources.intakeResolution);
  writeJson(inputs.plan, fixture.sources.privateCollectionPlan);

  const projectedAt = new Date(Date.parse(fixture.item.storedAt) + 1_000).toISOString();
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt,
    request: {
      admission: ref(fixture.admission, 'admissionHash'),
      item: ref(fixture.item, 'itemHash'),
      requestedAt: projectedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: fixture.item.lane === 'reviewed-examples'
        ? 'reviewed-example-candidate-review'
        : 'answer-quality-case-enrichment-review',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  fs.mkdirSync(path.dirname(inputs.projection), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(inputs.projection), 0o700);
  writeJson(inputs.projection, projection);

  const reviewDecidedAt = new Date(Date.parse(projectedAt) + 1_000).toISOString();
  const reviewResolution = buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision: {
      admission: ref(fixture.admission, 'admissionHash'),
      confirmationToken: `approve-private-collection-item-review:${projection.projectionHash}`,
      decidedAt: reviewDecidedAt,
      decidedByRole: 'quality-reviewer',
      decision: 'approve',
      evidenceSha256: hash('review-evidence'),
      item: ref(fixture.item, 'itemHash'),
      projection: ref(projection, 'projectionHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
      target: projection.projectionKind,
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    item: fixture.item,
    projection,
    resolvedAt: reviewDecidedAt,
    workspace: fixture.workspace,
  });
  fs.mkdirSync(path.dirname(inputs.reviewResolution), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(inputs.reviewResolution), 0o700);
  writeJson(path.join(path.dirname(inputs.reviewResolution), 'decision.json'), {
    admission: reviewResolution.admission,
    confirmationTokenSha256: reviewResolution.decisionRecord.confirmationTokenSha256,
    decidedAt: reviewResolution.decisionRecord.decidedAt,
    decidedByRole: reviewResolution.decisionRecord.decidedByRole,
    decision: reviewResolution.decision,
    decisionHash: reviewResolution.decisionHash,
    evidenceSha256: reviewResolution.decisionRecord.evidenceSha256,
    id: `fine-tuning-private-collection-item-review-resolution-decision-${reviewResolution.decisionHash}`,
    item: reviewResolution.item,
    projection: reviewResolution.projection,
    schemaVersion: reviewResolution.decisionRecord.schemaVersion,
    target: reviewResolution.target,
    workspace: reviewResolution.workspace,
  });
  writeJson(inputs.reviewResolution, reviewResolution);

  const requestedAt = new Date(Date.parse(reviewDecidedAt) + 1_000).toISOString();
  const artifactRequest = buildFineTuningPrivateCollectionItemArtifactRequest({
    admission: fixture.admission,
    artifactRequestInput: {
      admission: ref(fixture.admission, 'admissionHash'),
      item: ref(fixture.item, 'itemHash'),
      projection: ref(projection, 'projectionHash'),
      requestedAt,
      requestedByRole: 'local-operator-role',
      reviewResolution: ref(reviewResolution, 'resolutionHash'),
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
      target: fixture.item.lane === 'reviewed-examples'
        ? 'reviewed-example-canonicalization'
        : 'answer-quality-case-enrichment',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    createdAt: requestedAt,
    item: fixture.item,
    projection,
    reviewResolution,
    workspace: fixture.workspace,
  });
  inputs.artifactRequest = artifactRequestFilename(fixture);
  fs.mkdirSync(path.dirname(inputs.artifactRequest), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(inputs.artifactRequest), 0o700);
  writeJson(inputs.artifactRequest, artifactRequest);

  const decidedAt = new Date(Date.parse(requestedAt) + 1_000).toISOString();
  const decision = {
    artifactRequest: ref(artifactRequest, 'artifactRequestHash'),
    confirmationToken: `approve-private-collection-item-artifact-preparation:${artifactRequest.artifactRequestHash}`,
    decidedAt,
    decidedByRole: 'quality-reviewer',
    decision: 'approve',
    evidenceSha256: hash('preparation-evidence'),
    item: ref(fixture.item, 'itemHash'),
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-preparation-decision-input/v1',
    target: artifactRequest.target,
    workspace: ref(fixture.workspace, 'workspaceHash'),
    ...decisionOverrides,
  };
  writeJson(inputs.decision, decision);
  return { artifactRequest, decision, inputs, projection, reviewResolution };
}

function run(fixture, inputs) {
  return spawnSync(process.execPath, [
    script,
    '--workspace', inputs.workspace,
    '--admission', inputs.admission,
    '--item', inputs.item,
    '--projection', inputs.projection,
    '--review-resolution', inputs.reviewResolution,
    '--artifact-request', inputs.artifactRequest,
    '--decision', inputs.decision,
    '--execution-resolution', inputs.executionResolution,
    '--execution-request', inputs.executionRequest,
    '--plan', inputs.plan,
    '--intake-resolution', inputs.intakeResolution,
  ], { cwd: fixture.rootDir, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
}

function assertProhibitedFlags(resolution) {
  for (const flag of [
    'actualModelTrainingExecuted',
    'actualUserDataCollected',
    'answerQualityCaseCreated',
    'approvedTrainingRecordCreated',
    'candidateTrainingReviewAllowed',
    'contentCopied',
    'deploymentAuthorized',
    'eligibilityEvaluated',
    'evidenceIndependentlyVerified',
    'externalSubmissionAuthorized',
    'fineTuningExecutionAuthorized',
    'itemPathStored',
    'ownerIdentityVerified',
    'productionReadyClaim',
    'providerSubmissionAuthorized',
    'providerSubmissionCreated',
    'trainingAuthorized',
    'trainingSubmissionCreated',
    'workspaceMutationPerformed',
  ]) {
    assert.equal(resolution[flag], false, `${flag} must remain false`);
  }
  assert.equal(resolution.externalProviderCalls, 'none');
}

function finalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-preparation-resolutions',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
}

function pendingDirectory(fixture, resolution) {
  return path.join(
    path.dirname(finalDirectory(fixture)),
    `.fine-tuning-private-collection-item-artifact-preparation-resolution-pending-${fixture.item.itemHash}-${resolution.bindings.artifactPreparationDecisionHash}`,
  );
}

function projectionFilename(fixture) {
  return path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-review-projections', fixture.workspace.workspaceHash, `${fixture.item.itemHash}.json`);
}

function reviewResolutionFilename(fixture) {
  return path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-review-resolutions', fixture.workspace.workspaceHash, fixture.item.itemHash, 'resolution.json');
}

function artifactRequestFilename(fixture) {
  return path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-artifact-requests', fixture.workspace.workspaceHash, `${fixture.item.itemHash}.json`);
}

function historyDecision(resolution) {
  return {
    artifactRequest: resolution.artifactRequest,
    artifactPreparationDecisionHash: resolution.bindings.artifactPreparationDecisionHash,
    decisionRecord: resolution.decisionRecord,
    id: `fine-tuning-private-collection-item-artifact-preparation-decision-${resolution.bindings.artifactPreparationDecisionHash}`,
    item: resolution.item,
    workspace: resolution.workspace,
  };
}

function resolutionFor(fixture, prepared) {
  return buildFineTuningPrivateCollectionItemArtifactPreparationResolution({
    admission: fixture.admission,
    artifactRequest: prepared.artifactRequest,
    decision: prepared.decision,
    item: fixture.item,
    projection: prepared.projection,
    resolvedAt: prepared.decision.decidedAt,
    reviewResolution: prepared.reviewResolution,
    workspace: fixture.workspace,
  });
}

function terminalDirectory(fixture, name = fixture.item.retention.withdrawalReferenceSha256) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-tombstones',
    fixture.workspace.workspaceHash,
    name,
  );
}

function writeLegacyTombstone(fixture) {
  const terminal = terminalDirectory(fixture);
  fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
  fs.chmodSync(terminal, 0o700);
  writeJson(path.join(terminal, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
    action: 'withdrawn',
    admission: ref(fixture.admission, 'admissionHash'),
    evidenceSha256: hash('legacy-tombstone'),
    recordedAt: new Date().toISOString(),
    recordedBy: 'retention-deletion-owner-role',
    withdrawalReferenceSha256: fixture.item.retention.withdrawalReferenceSha256,
    workspace: ref(fixture.workspace, 'workspaceHash'),
  }));
}

function writeTerminalBundle(fixture) {
  const decision = lifecycleDecisionFor(fixture);
  const observedAt = new Date().toISOString();
  const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt: observedAt });
  const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({
    absence: absentItemObservation(),
    decision,
    observedAt,
    tombstone,
  });
  const terminal = terminalDirectory(fixture);
  fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
  fs.chmodSync(terminal, 0o700);
  writeJson(path.join(terminal, 'absence-receipt.json'), receipt);
  writeJson(path.join(terminal, 'decision.json'), decision);
  writeJson(path.join(terminal, 'tombstone.json'), tombstone);
}

function writePendingTerminalDecision(fixture) {
  const decision = lifecycleDecisionFor(fixture);
  const pending = pendingTerminalDirectory(fixture, decision);
  fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'decision.json'), decision);
}

function writePendingTerminalBundle(fixture, includeReceipt) {
  const decision = lifecycleDecisionFor(fixture);
  const observedAt = new Date().toISOString();
  const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt: observedAt });
  const pending = pendingTerminalDirectory(fixture, decision);
  fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'decision.json'), decision);
  writeJson(path.join(pending, 'tombstone.json'), tombstone);
  if (includeReceipt) {
    const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({
      absence: absentItemObservation(),
      decision,
      observedAt,
      tombstone,
    });
    writeJson(path.join(pending, 'absence-receipt.json'), receipt);
  }
}

function lifecycleDecisionFor(fixture) {
  const input = writeLifecycleDecision(fixture, 'withdraw');
  return buildFineTuningPrivateCollectionItemLifecycleDecision({
    admission: fixture.admission,
    executionAt: new Date().toISOString(),
    input,
    item: fixture.item,
    workspace: fixture.workspace,
  });
}

function pendingTerminalDirectory(fixture, decision) {
  return terminalDirectory(
    fixture,
    `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
  );
}

function absentItemObservation() {
  return {
    itemPathAbsent: true,
    matchingAdmissionItemCount: 0,
    matchingItemHashCount: 0,
    postDeleteAbsenceObserved: true,
    removalDirectoryEmpty: true,
    workspaceRecordUnchanged: true,
  };
}

function writeProjectionPending(fixture, prepared) {
  const root = path.dirname(prepared.inputs.projection);
  const pending = path.join(root, `.fine-tuning-private-collection-item-review-projection-pending-${fixture.item.itemHash}-${prepared.projection.bindings.projectionRequestHash}`);
  fs.mkdirSync(pending, { mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'projection.json'), prepared.projection);
}

function writeReviewResolutionPending(fixture, prepared) {
  const root = path.dirname(path.dirname(prepared.inputs.reviewResolution));
  const decision = JSON.parse(fs.readFileSync(path.join(path.dirname(prepared.inputs.reviewResolution), 'decision.json'), 'utf8'));
  const pending = path.join(root, `.fine-tuning-private-collection-item-review-resolution-pending-${fixture.item.itemHash}-${prepared.reviewResolution.decisionHash}`);
  fs.mkdirSync(pending, { mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'decision.json'), decision);
}

function writeArtifactRequestPending(fixture, prepared) {
  const root = path.dirname(prepared.inputs.artifactRequest);
  const pending = path.join(root, `.fine-tuning-private-collection-item-artifact-request-pending-${fixture.item.itemHash}-${prepared.artifactRequest.artifactRequestInputHash}`);
  fs.mkdirSync(pending, { mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'request.json'), prepared.artifactRequest);
}

function ref(value, field) {
  return { id: value.id, [field]: value[field] };
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}
