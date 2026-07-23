import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  buildFineTuningPrivateCollectionItemArtifactRequest,
} from '../src/core/fine-tuning-private-collection-item-artifact-request.mjs';
import {
  buildFineTuningPrivateCollectionItemReviewProjection,
} from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import {
  buildFineTuningPrivateCollectionItemReviewResolution,
} from '../src/core/fine-tuning-private-collection-item-review-resolution.mjs';
import {
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import { buildFineTuningPrivateCollectionItemTombstone } from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  withSyntheticLifecycleFixture,
  writeJson,
  writeLifecycleDecision,
} from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const repoDir = process.cwd();
const script = path.join(repoDir, 'scripts', 'request-fine-tuning-private-collection-item-artifact.mjs');
const datePreload = path.join(repoDir, 'test', 'helpers', 'two-step-date-preload.mjs');

test('F1.14 CLI creates and exactly replays sanitized requests for both approved lanes', () => {
  for (const lane of ['reviewed-examples', 'answer-quality-cases']) {
    withSyntheticLifecycleFixture((fixture) => {
      const inputs = prepare(fixture);
      const projection = writeProjection(fixture);
      const resolution = writeResolution(fixture, projection, 'approve');
      const request = requestInput(fixture, projection, resolution);
      writeJson(inputs.request, request);
      const beforeItem = fs.readFileSync(fixture.itemFilename);
      const first = run(fixture, inputs);
      const second = run(fixture, inputs);
      assert.equal(first.status, 0, first.stderr);
      assert.equal(second.status, 0, second.stderr);
      assert.equal(first.stdout, second.stdout);
      const output = JSON.parse(first.stdout);
      assert.equal(output.artifactPreparationAuthorized, false);
      assert.equal(output.trainingAuthorized, false);
      assert.equal(first.stdout.includes('Synthetic lifecycle response.'), false);
      assert.deepEqual(fs.readFileSync(fixture.itemFilename), beforeItem);
      const stored = JSON.parse(fs.readFileSync(finalFile(fixture), 'utf8'));
      assert.equal(stored.artifactRequestInput.target, request.target);
      assert.equal(stored.artifactPreparationRequestCreated, true);
      assert.equal(stored.approvedTrainingRecordCreated, false);
      assert.equal(stored.answerQualityCaseCreated, false);
      assert.equal(stored.itemPathStored, false);
    }, { lane });
  }
});

test('F1.14 CLI rejects a rejected F1.13 resolution before writing history', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'reject');
    writeJson(inputs.request, requestInput(fixture, projection, resolution));
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(finalFile(fixture)), false);
  });
});

test('F1.14 CLI rejects missing or tampered F1.13 decision bundles', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    writeJson(inputs.request, requestInput(fixture, projection, resolution));
    fs.unlinkSync(decisionFile(fixture));
    assert.notEqual(run(fixture, inputs).status, 0);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    writeJson(inputs.request, requestInput(fixture, projection, resolution));
    const decision = JSON.parse(fs.readFileSync(decisionFile(fixture), 'utf8'));
    writeJson(decisionFile(fixture), { ...decision, decisionHash: 'f'.repeat(64) });
    assert.notEqual(run(fixture, inputs).status, 0);
  });
});

test('F1.14 CLI rejects a renamed F1.13 pending bundle that hides the current resolution', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    writeJson(inputs.request, requestInput(fixture, projection, resolution));

    const decision = JSON.parse(fs.readFileSync(decisionFile(fixture), 'utf8'));
    const foreignItemHash = 'f'.repeat(64);
    const hiddenDecision = {
      ...decision,
      item: {
        id: `fine-tuning-private-collection-item-${foreignItemHash}`,
        itemHash: foreignItemHash,
      },
    };
    const pending = path.join(
      path.dirname(resolutionRoot(fixture)),
      `.fine-tuning-private-collection-item-review-resolution-pending-${foreignItemHash}-${decision.decisionHash}`,
    );
    fs.mkdirSync(pending, { mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'decision.json'), hiddenDecision);
    writeJson(path.join(pending, 'resolution.json'), resolution);

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending history is invalid/);
    assert.equal(fs.existsSync(finalFile(fixture)), false);
  });
});

test('F1.14 CLI resumes full pending, restarts exact empty pending, and rejects final plus pending ambiguity', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    const request = requestInput(fixture, projection, resolution);
    writeJson(inputs.request, request);
    const generated = buildFineTuningPrivateCollectionItemArtifactRequest({
      admission: fixture.admission,
      artifactRequestInput: request,
      createdAt: request.requestedAt,
      item: fixture.item,
      projection,
      reviewResolution: resolution,
      workspace: fixture.workspace,
    });
    const pending = pendingDirectory(fixture, generated);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'request.json'), generated);
    assert.equal(run(fixture, inputs).status, 0);
  });
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    const request = requestInput(fixture, projection, resolution);
    writeJson(inputs.request, request);
    const generated = buildFineTuningPrivateCollectionItemArtifactRequest({
      admission: fixture.admission,
      artifactRequestInput: request,
      createdAt: request.requestedAt,
      item: fixture.item,
      projection,
      reviewResolution: resolution,
      workspace: fixture.workspace,
    });
    const pending = pendingDirectory(fixture, generated);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    assert.equal(run(fixture, inputs).status, 0);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    assert.notEqual(run(fixture, inputs).status, 0);
  });
});

test('F1.14 CLI refuses weak, linked, symlinked, and expiry-equality request inputs', () => {
  for (const mutate of [
    (inputs) => fs.chmodSync(inputs.request, 0o644),
    (inputs) => {
      fs.linkSync(inputs.request, `${inputs.request}.link`);
    },
    (inputs) => {
      const directory = path.dirname(inputs.request);
      const alternate = `${directory}-alternate`;
      fs.renameSync(directory, alternate);
      fs.symlinkSync(alternate, directory);
    },
    (inputs, fixture) => {
      const value = JSON.parse(fs.readFileSync(inputs.request, 'utf8'));
      writeJson(inputs.request, { ...value, requestedAt: fixture.item.expiresAt });
    },
  ]) {
    withSyntheticLifecycleFixture((fixture) => {
      const inputs = prepare(fixture);
      const projection = writeProjection(fixture);
      const resolution = writeResolution(fixture, projection, 'approve');
      writeJson(inputs.request, requestInput(fixture, projection, resolution));
      mutate(inputs, fixture);

      assert.notEqual(run(fixture, inputs).status, 0);
      assert.equal(fs.existsSync(finalFile(fixture)), false);
    });
  }
});

test('F1.14 CLI refuses matching terminal and removal history before creating an artifact request', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    writeJson(inputs.request, requestInput(fixture, projection, resolution));
    const terminal = terminalDirectory(fixture);
    fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
    fs.chmodSync(terminal, 0o700);
    writeJson(
      path.join(terminal, 'tombstone.json'),
      buildFineTuningPrivateCollectionItemTombstone({
        action: 'withdrawn',
        admission: ref(fixture.admission, 'admissionHash'),
        evidenceSha256: hash('legacy-tombstone-evidence'),
        recordedAt: new Date().toISOString(),
        recordedBy: 'retention-deletion-owner-role',
        withdrawalReferenceSha256: fixture.item.retention.withdrawalReferenceSha256,
        workspace: ref(fixture.workspace, 'workspaceHash'),
      }),
    );

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permanently blocked/);
    assert.equal(fs.existsSync(finalFile(fixture)), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    writeJson(inputs.request, requestInput(fixture, projection, resolution));
    const decision = lifecycleDecision(fixture);
    const observedAt = new Date().toISOString();
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({
      decision,
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

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permanently blocked/);
    assert.equal(fs.existsSync(finalFile(fixture)), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    writeJson(inputs.request, requestInput(fixture, projection, resolution));
    const decision = lifecycleDecision(fixture);
    const pending = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
      fixture.workspace.workspaceHash,
      `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
    );
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'decision.json'), decision);

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending terminal lifecycle history/);
    assert.equal(fs.existsSync(finalFile(fixture)), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    writeJson(inputs.request, requestInput(fixture, projection, resolution));
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
    assert.equal(fs.existsSync(finalFile(fixture)), false);
  });
});

test('F1.14 CLI refuses deleteBy equality and preserves a pending request after the deadline', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    const request = requestInput(fixture, projection, resolution);
    writeJson(inputs.request, { ...request, requestedAt: fixture.item.retention.deleteBy });

    const result = run(fixture, inputs);

    assert.notEqual(result.status, 0);
    assert.equal(fs.existsSync(finalFile(fixture)), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepare(fixture);
    const projection = writeProjection(fixture);
    const resolution = writeResolution(fixture, projection, 'approve');
    const request = requestInput(fixture, projection, resolution);
    writeJson(inputs.request, request);
    const generated = buildFineTuningPrivateCollectionItemArtifactRequest({
      admission: fixture.admission,
      artifactRequestInput: request,
      createdAt: request.requestedAt,
      item: fixture.item,
      projection,
      reviewResolution: resolution,
      workspace: fixture.workspace,
    });
    const pending = pendingDirectory(fixture, generated);
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'request.json'), generated);
    const beforeDeadline = new Date(Date.parse(fixture.item.retention.deleteBy) - 1).toISOString();

    const result = run(fixture, inputs, {
      preloadDates: { first: beforeDeadline, second: fixture.item.retention.deleteBy },
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired|timing|live exact/);
    assert.equal(fs.existsSync(finalFile(fixture)), false);
    assert.equal(fs.existsSync(pending), true);
    assert.deepEqual(fs.readdirSync(pending), ['request.json']);
  });
});

function prepare(fixture) {
  const inputs = path.join(fixture.rootDir, 'var', 'inputs');
  const artifacts = path.join(fixture.rootDir, 'evidence', 'output-artifacts');
  fs.mkdirSync(artifacts, { recursive: true, mode: 0o700 });
  fs.chmodSync(path.join(fixture.rootDir, 'evidence'), 0o700);
  fs.chmodSync(artifacts, 0o700);
  writeJson(path.join(artifacts, 'fine-tuning-data-sufficiency.json'), fixture.sources.assessment);
  writeJson(path.join(artifacts, 'fine-tuning-data-collection-plan.json'), fixture.sources.collectionPlan);
  writeJson(path.join(artifacts, 'fine-tuning-data-intake-request.json'), fixture.sources.intakeRequest);
  writeJson(path.join(inputs, 'execution-request.json'), fixture.sources.executionRequest);
  writeJson(path.join(inputs, 'execution-resolution.json'), fixture.sources.executionResolution);
  writeJson(path.join(inputs, 'intake-resolution.json'), fixture.sources.intakeResolution);
  writeJson(path.join(inputs, 'plan.json'), fixture.sources.privateCollectionPlan);
  return {
    admission: fixture.admissionFilename,
    executionRequest: path.join(inputs, 'execution-request.json'),
    executionResolution: path.join(inputs, 'execution-resolution.json'),
    intakeResolution: path.join(inputs, 'intake-resolution.json'),
    item: fixture.itemFilename,
    plan: path.join(inputs, 'plan.json'),
    projection: projectionFile(fixture),
    request: path.join(inputs, 'request.json'),
    reviewResolution: resolutionFile(fixture),
    workspace: fixture.workspaceFilename,
  };
}

function projectionFile(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-projections',
    fixture.workspace.workspaceHash,
    `${fixture.item.itemHash}.json`,
  );
}

function resolutionRoot(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-resolutions',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
}

function resolutionFile(fixture) {
  return path.join(resolutionRoot(fixture), 'resolution.json');
}

function decisionFile(fixture) {
  return path.join(resolutionRoot(fixture), 'decision.json');
}

function finalFile(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-artifact-requests',
    fixture.workspace.workspaceHash,
    `${fixture.item.itemHash}.json`,
  );
}

function pendingDirectory(fixture, request) {
  return path.join(
    path.dirname(finalFile(fixture)),
    `.fine-tuning-private-collection-item-artifact-request-pending-${fixture.item.itemHash}-${request.artifactRequestInputHash}`,
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
function writeProjection(fixture) {
  const requestedAt = new Date(Date.now() - 10_000).toISOString();
  const projection = buildFineTuningPrivateCollectionItemReviewProjection({
    admission: fixture.admission,
    item: fixture.item,
    projectedAt: requestedAt,
    request: {
      admission: ref(fixture.admission, 'admissionHash'),
      item: ref(fixture.item, 'itemHash'),
      requestedAt,
      requestedByRole: 'local-operator-role',
      schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
      target: fixture.item.lane === 'reviewed-examples'
        ? 'reviewed-example-candidate-review'
        : 'answer-quality-case-enrichment-review',
      workspace: ref(fixture.workspace, 'workspaceHash'),
    },
    workspace: fixture.workspace,
  });
  const directory = path.dirname(projectionFile(fixture));
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  fs.chmodSync(directory, 0o700);
  writeJson(projectionFile(fixture), projection);
  return projection;
}

function writeResolution(fixture, projection, decision) {
  const decidedAt = new Date(Date.parse(projection.projectedAt) + 1_000).toISOString();
  const input = {
    admission: ref(fixture.admission, 'admissionHash'),
    confirmationToken: `${decision}-private-collection-item-review:${projection.projectionHash}`,
    decidedAt,
    decidedByRole: 'quality-reviewer',
    decision,
    evidenceSha256: hash('review-evidence'),
    item: ref(fixture.item, 'itemHash'),
    projection: ref(projection, 'projectionHash'),
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-resolution-decision-input/v1',
    target: projection.projectionKind,
    workspace: ref(fixture.workspace, 'workspaceHash'),
  };
  const resolution = buildFineTuningPrivateCollectionItemReviewResolution({
    admission: fixture.admission,
    decision: input,
    item: fixture.item,
    projection,
    resolvedAt: decidedAt,
    workspace: fixture.workspace,
  });
  fs.mkdirSync(resolutionRoot(fixture), { recursive: true, mode: 0o700 });
  fs.chmodSync(resolutionRoot(fixture), 0o700);
  writeJson(decisionFile(fixture), {
    admission: resolution.admission,
    confirmationTokenSha256: resolution.decisionRecord.confirmationTokenSha256,
    decidedAt,
    decidedByRole: 'quality-reviewer',
    decision,
    decisionHash: resolution.decisionHash,
    evidenceSha256: input.evidenceSha256,
    id: `fine-tuning-private-collection-item-review-resolution-decision-${resolution.decisionHash}`,
    item: resolution.item,
    projection: resolution.projection,
    schemaVersion: input.schemaVersion,
    target: resolution.target,
    workspace: resolution.workspace,
  });
  writeJson(resolutionFile(fixture), resolution);
  return resolution;
}

function requestInput(fixture, projection, reviewResolution) {
  return {
    admission: ref(fixture.admission, 'admissionHash'),
    item: ref(fixture.item, 'itemHash'),
    projection: ref(projection, 'projectionHash'),
    requestedAt: reviewResolution.resolvedAt,
    requestedByRole: 'local-operator-role',
    reviewResolution: ref(reviewResolution, 'resolutionHash'),
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-artifact-request-input/v1',
    target: fixture.item.lane === 'reviewed-examples'
      ? 'reviewed-example-canonicalization'
      : 'answer-quality-case-enrichment',
    workspace: ref(fixture.workspace, 'workspaceHash'),
  };
}

function lifecycleDecision(fixture) {
  const input = writeLifecycleDecision(fixture, 'withdraw');
  return buildFineTuningPrivateCollectionItemLifecycleDecision({
    admission: fixture.admission,
    executionAt: new Date().toISOString(),
    input,
    item: fixture.item,
    workspace: fixture.workspace,
  });
}

function ref(value, hashField) {
  return { id: value.id, [hashField]: value[hashField] };
}

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function run(fixture, inputs, { preloadDates } = {}) {
  const nodeArgs = [
    script,
    '--workspace',
    inputs.workspace,
    '--admission',
    inputs.admission,
    '--item',
    inputs.item,
    '--projection',
    inputs.projection,
    '--review-resolution',
    inputs.reviewResolution,
    '--request',
    inputs.request,
    '--execution-resolution',
    inputs.executionResolution,
    '--execution-request',
    inputs.executionRequest,
    '--plan',
    inputs.plan,
    '--intake-resolution',
    inputs.intakeResolution,
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
