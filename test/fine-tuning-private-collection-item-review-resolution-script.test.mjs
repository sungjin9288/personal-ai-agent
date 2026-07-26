import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { buildFineTuningPrivateCollectionItemReviewResolution } from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import { buildFineTuningPrivateCollectionItemReviewProjection } from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import {
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { buildFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import { withSyntheticLifecycleFixture, writeJson, writeLifecycleDecision } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const repoDir = process.cwd();
const script = path.join(repoDir, 'scripts', 'resolve-fine-tuning-private-collection-item-review.mjs');
const datePreload = path.join(repoDir, 'test', 'helpers', 'two-step-date-preload.mjs');

test('CLI resolves both lanes with content-free sanitized stdout and exact replay', () => {
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    withSyntheticLifecycleFixture((fixture) => {
      const inputs = prepareInputs(fixture);
      const projection = writeProjection(fixture);
      const decision = decisionFor(fixture, projection, 'approve');
      writeJson(inputs.decision, decision);
      const beforeItem = fs.readFileSync(fixture.itemFilename);
      const first = run(fixture, inputs);
      const second = run(fixture, inputs);

      assert.equal(first.status, 0, first.stderr);
      assert.equal(second.status, 0, second.stderr);
      assert.equal(first.stdout, second.stdout);
      const output = JSON.parse(first.stdout);
      assert.deepEqual(Object.keys(output).sort(), [
        'answerQualityCaseCreated',
        'answerQualityCaseEnrichmentRequestAllowed',
        'approvedTrainingRecordCreated',
        'candidateTrainingReviewAllowed',
        'deploymentAuthorized',
        'externalProviderCalls',
        'externalSubmissionAuthorized',
        'fineTuningExecutionAuthorized',
        'lane',
        'productionReadyClaim',
        'providerSubmissionAuthorized',
        'reviewedExampleCanonicalizationRequestAllowed',
        'status',
        'trainingAuthorized',
      ].sort());
      assert.equal(output.lane, lane);
      assert.equal(output.externalProviderCalls, 'none');
      assert.equal(output.trainingAuthorized, false);
      assert.equal(first.stdout.includes('Synthetic lifecycle response.'), false);
      assert.equal(first.stdout.includes(decision.confirmationToken), false);
      assert.deepEqual(fs.readFileSync(fixture.itemFilename), beforeItem);
      assert.equal(fs.existsSync(finalDirectory(fixture)), true);
      assert.deepEqual(fs.readdirSync(finalDirectory(fixture)).sort(), ['decision.json', 'resolution.json']);
      const storedDecision = JSON.parse(fs.readFileSync(path.join(finalDirectory(fixture), 'decision.json'), 'utf8'));
      const resolution = JSON.parse(fs.readFileSync(path.join(finalDirectory(fixture), 'resolution.json'), 'utf8'));
      assert.equal(storedDecision.confirmationTokenSha256, sha256(decision.confirmationToken));
      assert.equal(JSON.stringify(storedDecision).includes(decision.confirmationToken), false);
      assert.equal(resolution.decisionHash, storedDecision.decisionHash);
      assert.equal(
        resolution.status,
        lane === 'reviewed-examples'
          ? 'approved-for-reviewed-example-canonicalization-request'
          : 'approved-for-answer-quality-case-enrichment-request',
      );
    }, { lane });
  }
});

test('CLI records rejection without either canonicalization or enrichment authority', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'reject'));
    const result = run(fixture, inputs);
    assert.equal(result.status, 0, result.stderr);
    const resolution = JSON.parse(fs.readFileSync(path.join(finalDirectory(fixture), 'resolution.json'), 'utf8'));
    assert.equal(resolution.status, 'rejected-by-owner-review');
    assert.equal(resolution.reviewedExampleCanonicalizationRequestAllowed, false);
    assert.equal(resolution.answerQualityCaseEnrichmentRequestAllowed, false);
  });
});

test('CLI rejects a changed decision, canonical projection drift, expiry, and missing final projection', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const decision = decisionFor(fixture, projection, 'approve');
    writeJson(inputs.decision, decision);
    assert.equal(run(fixture, inputs).status, 0);
    writeJson(inputs.decision, { ...decision, evidenceSha256: 'f'.repeat(64) });
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /different decision/);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    projection.bindings.policyHash = 'f'.repeat(64);
    const { id: _id, projectionHash: _projectionHash, ...content } = projection;
    projection.projectionHash = hash(content);
    projection.id = `fine-tuning-private-collection-item-review-projection-${projection.projectionHash}`;
    writeJson(projectionFilename(fixture), projection);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not match the live F1\.10 item/);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve', fixture.item.expiresAt));
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must bind one live exact|expired/);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = buildProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /canonical F1\.12 final history path|owner-only bounded/);
  });
});

test('CLI resumes decision-only and full pending bundles, but removes only an exact empty pending directory', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const decision = decisionFor(fixture, projection, 'approve');
    writeJson(inputs.decision, decision);
    const pending = pendingDirectory(fixture, decision, projection);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'decision.json'), historyDecision(fixture, projection, decision));
    const result = run(fixture, inputs);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(finalDirectory(fixture)), true);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const decision = decisionFor(fixture, projection, 'reject');
    writeJson(inputs.decision, decision);
    const resolution = buildResolution(fixture, projection, decision);
    const pending = pendingDirectory(fixture, decision, projection);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'decision.json'), historyDecision(fixture, projection, decision));
    writeJson(path.join(pending, 'resolution.json'), resolution);
    const result = run(fixture, inputs);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(finalDirectory(fixture)), true);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const decision = decisionFor(fixture, projection, 'approve');
    writeJson(inputs.decision, decision);
    const pending = pendingDirectory(fixture, decision, projection);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    const result = run(fixture, inputs);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(finalDirectory(fixture)), true);
  });
});

test('CLI fails closed for malformed history, lifecycle pending, removal state, unsafe modes and links', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const decision = decisionFor(fixture, projection, 'approve');
    writeJson(inputs.decision, decision);
    const pending = pendingDirectory(fixture, decision, projection);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'unexpected.json'), { nope: true });
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending history is invalid/);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const lifecycleInput = writeLifecycleDecision(fixture, 'withdraw');
    const lifecycleDecision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: fixture.admission,
      executionAt: new Date().toISOString(),
      input: lifecycleInput,
      item: fixture.item,
      workspace: fixture.workspace,
    });
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const pending = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
      fixture.workspace.workspaceHash,
      `.fine-tuning-private-collection-item-terminal-pending-${lifecycleDecision.decisionHash}`,
    );
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'decision.json'), lifecycleDecision);
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending terminal lifecycle history/);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const removal = path.join(
      fixture.workspaceDirectory,
      fixture.item.lane,
      `.fine-tuning-private-collection-item-removal-${'a'.repeat(64)}`,
    );
    fs.mkdirSync(removal, { mode: 0o700 });
    fs.chmodSync(removal, 0o700);
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /removal history/);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    fs.chmodSync(inputs.decision, 0o644);
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    fs.linkSync(inputs.decision, path.join(fixture.rootDir, 'var', 'inputs', 'decision-copy.json'));
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const linked = path.join(fixture.rootDir, 'var', 'inputs', 'decision-link.json');
    fs.symlinkSync(inputs.decision, linked);
    inputs.decision = linked;
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
  });
});

test('CLI validates every item directory mode and exact item.json allowlist before creating resolution history', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    fs.chmodSync(path.dirname(fixture.itemFilename), 0o755);

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /workspace item is invalid/);
    assert.equal(fs.existsSync(resolutionHistoryRoot(fixture)), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const unrelated = path.join(
      fixture.workspaceDirectory,
      fixture.item.lane === 'reviewed-examples' ? 'answer-quality-cases' : 'reviewed-examples',
      `fine-tuning-private-collection-item-${'f'.repeat(64)}`,
    );
    fs.mkdirSync(unrelated, { mode: 0o755 });
    writeJson(path.join(unrelated, 'item.json'), fixture.item);

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /workspace item is invalid/);
    assert.equal(fs.existsSync(resolutionHistoryRoot(fixture)), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    writeJson(path.join(path.dirname(fixture.itemFilename), 'unexpected.json'), { unexpected: true });

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /workspace is invalid/);
    assert.equal(fs.existsSync(resolutionHistoryRoot(fixture)), false);
  });
});

test('CLI refuses finalized v1 and v2 lifecycle evidence while the private item still exists', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const terminal = terminalDirectory(fixture);
    fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
    fs.chmodSync(terminal, 0o700);
    writeJson(path.join(terminal, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
      action: 'withdrawn',
      admission: { admissionHash: fixture.admission.admissionHash, id: fixture.admission.id },
      evidenceSha256: sha256('legacy-tombstone-evidence'),
      recordedAt: new Date().toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      withdrawalReferenceSha256: fixture.item.retention.withdrawalReferenceSha256,
      workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
    }));

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permanently blocked/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
    assert.equal(fs.existsSync(resolutionHistoryRoot(fixture)), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const reviewDecision = decisionFor(fixture, projection, 'approve');
    const lifecycleInput = writeLifecycleDecision(fixture, 'withdraw');
    const lifecycleDecision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: fixture.admission,
      executionAt: new Date().toISOString(),
      input: lifecycleInput,
      item: fixture.item,
      workspace: fixture.workspace,
    });
    writeJson(inputs.decision, reviewDecision);
    const observedAt = new Date().toISOString();
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({
      decision: lifecycleDecision,
      recordedAt: observedAt,
    });
    const receipt = buildFineTuningPrivateCollectionItemAbsenceReceipt({
      absence: {
        itemPathAbsent: true,
        matchingAdmissionItemCount: 0,
        matchingItemHashCount: 0,
        postDeleteAbsenceObserved: true,
        removalDirectoryEmpty: true,
        workspaceRecordUnchanged: true,
      },
      decision: lifecycleDecision,
      observedAt,
      tombstone,
    });
    const terminal = terminalDirectory(fixture);
    fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
    fs.chmodSync(terminal, 0o700);
    writeJson(path.join(terminal, 'absence-receipt.json'), receipt);
    writeJson(path.join(terminal, 'decision.json'), lifecycleDecision);
    writeJson(path.join(terminal, 'tombstone.json'), tombstone);

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permanently blocked/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
    assert.equal(fs.existsSync(resolutionHistoryRoot(fixture)), false);
  });
});

test('CLI keeps decision-only and full pending evidence when retention expires after lock acquisition', () => {
  for (const pendingFiles of [['decision.json'], ['decision.json', 'resolution.json']]) {
    withSyntheticLifecycleFixture((fixture) => {
      const inputs = prepareInputs(fixture);
      const projection = writeProjection(fixture);
      const decision = decisionFor(fixture, projection, 'approve');
      writeJson(inputs.decision, decision);
      const pending = pendingDirectory(fixture, decision, projection);
      fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
      fs.chmodSync(pending, 0o700);
      writeJson(path.join(pending, 'decision.json'), historyDecision(fixture, projection, decision));
      if (pendingFiles.includes('resolution.json')) {
        writeJson(path.join(pending, 'resolution.json'), buildResolution(fixture, projection, decision));
      }
      const deadline = fixture.item.retention.deleteBy;
      const beforeDeadline = new Date(Date.parse(deadline) - 1).toISOString();

      const result = run(fixture, inputs, {
        preloadDates: { first: beforeDeadline, second: deadline },
      });

      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /expired|timing|live exact/);
      assert.equal(fs.existsSync(finalDirectory(fixture)), false);
      assert.equal(fs.existsSync(pending), true);
      assert.deepEqual(fs.readdirSync(pending).sort(), pendingFiles);
    });
  }
});

test('CLI ignores a lifecycle pending bundle from a foreign workspace namespace', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const lifecycleInput = writeLifecycleDecision(fixture, 'withdraw');
    const lifecycleDecision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: fixture.admission,
      executionAt: new Date().toISOString(),
      input: lifecycleInput,
      item: fixture.item,
      workspace: fixture.workspace,
    });
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const foreign = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
      'f'.repeat(64),
      `.fine-tuning-private-collection-item-terminal-pending-${lifecycleDecision.decisionHash}`,
    );
    fs.mkdirSync(foreign, { recursive: true, mode: 0o700 });
    fs.chmodSync(foreign, 0o700);
    writeJson(path.join(foreign, 'decision.json'), lifecycleDecision);
    const result = run(fixture, inputs);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(finalDirectory(fixture)), true);
  });
});

test('CLI rejects an ancestor symlink before accepting a canonical F1.12 projection path', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    writeJson(inputs.decision, decisionFor(fixture, projection, 'approve'));
    const projectionRoot = path.dirname(projectionFilename(fixture));
    const alternateRoot = path.join(path.dirname(projectionRoot), `alternate-${fixture.workspace.workspaceHash}`);
    fs.renameSync(projectionRoot, alternateRoot);
    fs.symlinkSync(alternateRoot, projectionRoot);

    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /exact canonical F1\.12 final history path/);
  });
});

test('CLI rejects malformed final history for another item instead of ignoring it', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const projection = writeProjection(fixture);
    const decision = decisionFor(fixture, projection, 'approve');
    writeJson(inputs.decision, decision);
    const resolution = buildResolution(fixture, projection, decision);
    const unrelated = path.join(path.dirname(finalDirectory(fixture)), 'f'.repeat(64));
    fs.mkdirSync(unrelated, { recursive: true, mode: 0o700 });
    fs.chmodSync(unrelated, 0o700);
    writeJson(path.join(unrelated, 'decision.json'), {
      ...historyDecision(fixture, projection, decision),
      decisionHash: 'f'.repeat(64),
      id: `fine-tuning-private-collection-item-review-resolution-decision-${'f'.repeat(64)}`,
    });
    writeJson(path.join(unrelated, 'resolution.json'), resolution);

    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /decision history is invalid/);
  });
});

function prepareInputs(fixture) {
  const inputDirectory = path.join(fixture.rootDir, 'var', 'inputs');
  const artifactDirectory = path.join(fixture.rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifactDirectory, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.join(fixture.rootDir, 'evidence'), 0o700);
  fs.chmodSync(artifactDirectory, 0o700);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-sufficiency.json'), fixture.sources.assessment);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-collection-plan.json'), fixture.sources.collectionPlan);
  writeJson(path.join(artifactDirectory, 'fine-tuning-data-intake-request.json'), fixture.sources.intakeRequest);
  writeJson(path.join(inputDirectory, 'execution-request.json'), fixture.sources.executionRequest);
  writeJson(path.join(inputDirectory, 'execution-resolution.json'), fixture.sources.executionResolution);
  writeJson(path.join(inputDirectory, 'intake-resolution.json'), fixture.sources.intakeResolution);
  writeJson(path.join(inputDirectory, 'plan.json'), fixture.sources.privateCollectionPlan);
  return {
    admission: fixture.admissionFilename,
    decision: path.join(inputDirectory, 'decision.json'),
    executionRequest: path.join(inputDirectory, 'execution-request.json'),
    executionResolution: path.join(inputDirectory, 'execution-resolution.json'),
    intakeResolution: path.join(inputDirectory, 'intake-resolution.json'),
    item: fixture.itemFilename,
    plan: path.join(inputDirectory, 'plan.json'),
    projection: projectionFilename(fixture),
    workspace: fixture.workspaceFilename,
  };
}

function run(fixture, inputs, { preloadDates } = {}) {
  const nodeArgs = [
    script,
    '--workspace', inputs.workspace,
    '--admission', inputs.admission,
    '--item', inputs.item,
    '--projection', inputs.projection,
    '--decision', inputs.decision,
    '--execution-resolution', inputs.executionResolution,
    '--execution-request', inputs.executionRequest,
    '--plan', inputs.plan,
    '--intake-resolution', inputs.intakeResolution,
  ];
  const env = { ...process.env };
  if (preloadDates) {
    nodeArgs.unshift(datePreload);
    nodeArgs.unshift('--import');
    env.FINE_TUNING_TEST_FIRST_NO_ARG_DATE = preloadDates.first;
    env.FINE_TUNING_TEST_SECOND_NO_ARG_DATE = preloadDates.second;
  }
  return spawnSync(process.execPath, nodeArgs, {
    cwd: fixture.rootDir,
    encoding: 'utf8',
    env,
    maxBuffer: 2 * 1024 * 1024,
  });
}

function buildProjection(fixture) {
  const requestedAt = new Date().toISOString();
  return buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt: requestedAt,
    request: {
      admission: { id: fixture.admission.id, admissionHash: fixture.admission.admissionHash },
      item: { id: fixture.item.id, itemHash: fixture.item.itemHash },
      requestedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: fixture.item.lane === 'reviewed-examples'
        ? 'reviewed-example-candidate-review'
        : 'answer-quality-case-enrichment-review',
      workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
    },
    workspace: fixture.workspace,
  });
}

function writeProjection(fixture) {
  const projection = buildProjection(fixture);
  fs.mkdirSync(path.dirname(projectionFilename(fixture)), { recursive: true, mode: 0o700 });
  fs.chmodSync(path.dirname(projectionFilename(fixture)), 0o700);
  writeJson(projectionFilename(fixture), projection);
  return projection;
}

function decisionFor(fixture, projection, decision, decidedAt = new Date().toISOString()) {
  return {
    admission: { id: fixture.admission.id, admissionHash: fixture.admission.admissionHash },
    confirmationToken: `${decision}-private-collection-item-review:${projection.projectionHash}`,
    decidedAt,
    decidedByRole: 'quality-reviewer',
    decision,
    evidenceSha256: sha256(`decision-evidence-${decision}`),
    item: { id: fixture.item.id, itemHash: fixture.item.itemHash },
    projection: { id: projection.id, projectionHash: projection.projectionHash },
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
    target: projection.projectionKind,
    workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
  };
}

function buildResolution(fixture, projection, decision) {
  return buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision,
    item: fixture.item,
    projection,
    resolvedAt: decision.decidedAt,
    workspace: fixture.workspace,
  });
}

function historyDecision(fixture, projection, decision) {
  const resolution = buildResolution(fixture, projection, decision);
  return {
    admission: resolution.admission,
    confirmationTokenSha256: resolution.decisionRecord.confirmationTokenSha256,
    decidedAt: resolution.decisionRecord.decidedAt,
    decidedByRole: resolution.decisionRecord.decidedByRole,
    decision: resolution.decision,
    decisionHash: resolution.decisionHash,
    evidenceSha256: resolution.decisionRecord.evidenceSha256,
    id: `fine-tuning-private-collection-item-review-resolution-decision-${resolution.decisionHash}`,
    item: resolution.item,
    projection: resolution.projection,
    schemaVersion: resolution.decisionRecord.schemaVersion,
    target: resolution.target,
    workspace: resolution.workspace,
  };
}

function projectionFilename(fixture) {
  return path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-collection-item-review-projections', fixture.workspace.workspaceHash, `${fixture.item.itemHash}.json`);
}

function finalDirectory(fixture) {
  return path.join(resolutionHistoryRoot(fixture), fixture.item.itemHash);
}

function resolutionHistoryRoot(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-resolutions',
    fixture.workspace.workspaceHash,
  );
}

function terminalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-tombstones',
    fixture.workspace.workspaceHash,
    fixture.item.retention.withdrawalReferenceSha256,
  );
}

function pendingDirectory(fixture, decision, projection) {
  const resolution = buildResolution(fixture, projection, decision);
  return path.join(path.dirname(finalDirectory(fixture)), `.fine-tuning-private-collection-item-review-resolution-pending-${fixture.item.itemHash}-${resolution.decisionHash}`);
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}
