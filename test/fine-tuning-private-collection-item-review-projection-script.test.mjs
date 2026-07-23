import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import {
  assertFineTuningPrivateCollectionItemReviewProjectionRecord,
  assertFineTuningPrivateCollectionItemReviewProjectionRequest,
  buildFineTuningPrivateCollectionItemReviewProjection,
} from '../src/core/fine-tuning-private-collection-item-review-projection.mjs';
import {
  buildFineTuningPrivateCollectionItemAbsenceReceipt,
  buildFineTuningPrivateCollectionItemLifecycleDecision,
  buildFineTuningPrivateCollectionItemTombstoneV2,
} from '../src/core/fine-tuning-private-collection-item-lifecycle.mjs';
import {
  buildFineTuningPrivateCollectionItemTombstone,
} from '../src/core/fine-tuning-private-collection-item-tombstone.mjs';
import {
  withSyntheticLifecycleFixture,
  writeJson,
  writeLifecycleDecision,
} from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const script = path.join(process.cwd(), 'scripts', 'project-fine-tuning-private-collection-item-review.mjs');

test('CLI publishes one owner-only content-free projection, resumes a known-valid pending record, and is idempotent', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const workspaceBefore = fs.readFileSync(fixture.workspaceFilename);
    const request = requestFor(fixture);
    writeJson(inputs.request, request);

    const first = run(fixture, inputs);
    assert.equal(first.status, 0, first.stderr);
    const summary = JSON.parse(first.stdout);
    assert.deepEqual(summary, {
      externalProviderCalls: 'none',
      mode: 'fine-tuning-private-collection-item-review-projection',
      ok: true,
      projectionKind: 'reviewed-example-candidate-review',
      productionReadyClaim: false,
      status: 'pending-owner-review',
      trainingAuthorized: false,
      workspaceMutationPerformed: false,
    });
    assert.equal(first.stdout.includes(fixture.rootDir), false);
    assert.equal(first.stdout.includes('Synthetic lifecycle response'), false);
    assert.deepEqual(fs.readFileSync(fixture.workspaceFilename), workspaceBefore);

    const finalFilename = finalProjectionFilename(fixture);
    const before = fs.readFileSync(finalFilename);
    assert.equal(fs.lstatSync(finalFilename).mode & 0o777, 0o600);
    const second = run(fixture, inputs);
    assert.equal(second.status, 0, second.stderr);
    assert.deepEqual(fs.readFileSync(finalFilename), before);

    const completedPending = path.join(
      historyRoot(fixture),
      `.fine-tuning-private-collection-item-review-projection-pending-${fixture.item.itemHash}-${hash(assertFineTuningPrivateCollectionItemReviewProjectionRequest(request))}`,
    );
    fs.mkdirSync(completedPending, { mode: 0o700 });
    fs.chmodSync(completedPending, 0o700);
    const resumedAfterRename = run(fixture, inputs);
    assert.equal(resumedAfterRename.status, 0, resumedAfterRename.stderr);
    assert.equal(fs.existsSync(completedPending), false);
    assert.deepEqual(fs.readFileSync(finalFilename), before);

    writeJson(inputs.request, { ...request, requestedAt: new Date(Date.now() + 1_000).toISOString() });
    const conflict = run(fixture, inputs);
    assert.notEqual(conflict.status, 0);
    assert.match(conflict.stderr, /different request|conflicts/);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const request = requestFor(fixture);
    writeJson(inputs.request, request);
    const emptyPending = path.join(
      historyRoot(fixture),
      `.fine-tuning-private-collection-item-review-projection-pending-${fixture.item.itemHash}-${hash(assertFineTuningPrivateCollectionItemReviewProjectionRequest(request))}`,
    );
    fs.mkdirSync(emptyPending, { recursive: true, mode: 0o700 });
    fs.chmodSync(emptyPending, 0o700);

    const recovered = run(fixture, inputs);
    assert.equal(recovered.status, 0, recovered.stderr);
    assert.equal(fs.existsSync(emptyPending), false);
    assert.equal(fs.existsSync(finalProjectionFilename(fixture)), true);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const request = requestFor(fixture);
    writeJson(inputs.request, request);
    const projectedAt = new Date().toISOString();
    const projection = buildFineTuningPrivateCollectionItemReviewProjection({
      admission: fixture.admission,
      item: fixture.item,
      projectedAt,
      request,
      workspace: fixture.workspace,
    });
    const pending = path.join(
      historyRoot(fixture),
      `.fine-tuning-private-collection-item-review-projection-pending-${fixture.item.itemHash}-${hash(assertFineTuningPrivateCollectionItemReviewProjectionRequest(request))}`,
    );
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.chmodSync(pending, 0o700);
    writeJson(path.join(pending, 'projection.json'), projection);

    const result = run(fixture, inputs);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(pending), false);
    assert.equal(fs.existsSync(finalProjectionFilename(fixture)), true);
  });
});

test('CLI projects an answer-quality item only as an unsatisfied enrichment candidate', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const request = requestFor(fixture);
    writeJson(inputs.request, request);

    const result = run(fixture, inputs);
    assert.equal(result.status, 0, result.stderr);
    const summary = JSON.parse(result.stdout);
    assert.deepEqual(summary, {
      externalProviderCalls: 'none',
      mode: 'fine-tuning-private-collection-item-review-projection',
      ok: true,
      projectionKind: 'answer-quality-case-enrichment-review',
      productionReadyClaim: false,
      status: 'pending-owner-review',
      trainingAuthorized: false,
      workspaceMutationPerformed: false,
    });
    assert.equal(result.stdout.includes(fixture.rootDir), false);
    assert.equal(result.stdout.includes(fixture.item.itemHash), false);
    assert.equal(result.stdout.includes('Synthetic lifecycle response'), false);

    const projection = JSON.parse(
      fs.readFileSync(finalProjectionFilename(fixture), 'utf8'),
    );
    assertFineTuningPrivateCollectionItemReviewProjectionRecord(projection);
    assert.equal(projection.lane, 'answer-quality-cases');
    assert.equal(projection.answerQualityCase.contractSatisfied, false);
    assert.equal(projection.answerQualityCase.enrichmentRequired, true);
    assert.deepEqual(projection.answerQualityCase.missingQ1Fields, [
      'answer',
      'expectedSourceKeys',
      'forbiddenAnswerTerms',
      'forbiddenSourceKeys',
      'id',
      'requiredAnswerTerms',
      'retrievalInput',
      'reviewerVerdict',
    ]);
    assert.equal(projection.contentCopied, false);
    assert.equal(projection.itemPathStored, false);

    const before = fs.readFileSync(finalProjectionFilename(fixture));
    const replay = run(fixture, inputs);
    assert.equal(replay.status, 0, replay.stderr);
    assert.deepEqual(fs.readFileSync(finalProjectionFilename(fixture)), before);
  }, { lane: 'answer-quality-cases' });
});

test('CLI preserves item evidence and refuses unsafe input, terminal history, and expiry', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    writeJson(inputs.request, requestFor(fixture));
    const link = path.join(fixture.rootDir, 'var', 'inputs', 'request-link.json');
    fs.symlinkSync(inputs.request, link);
    const result = run(fixture, { ...inputs, request: link });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /owner-only bounded regular file/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    writeJson(inputs.request, requestFor(fixture));
    const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: fixture.admission,
      executionAt: new Date().toISOString(),
      input: writeLifecycleDecision(fixture, 'withdraw', new Date(Date.now() - 1_000).toISOString()),
      item: fixture.item,
      workspace: fixture.workspace,
    });
    const terminal = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
      fixture.workspace.workspaceHash,
      `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
    );
    fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
    fs.chmodSync(terminal, 0o700);
    writeJson(path.join(terminal, 'decision.json'), decision);
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /pending terminal lifecycle/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
    assert.equal(fs.existsSync(finalProjectionFilename(fixture)), false);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    writeJson(inputs.request, requestFor(fixture));
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.equal(fs.existsSync(finalProjectionFilename(fixture)), false);
  }, { deleteByOffset: -60_000 });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    writeJson(inputs.request, requestFor(fixture));
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /expired/);
    assert.equal(fs.existsSync(finalProjectionFilename(fixture)), false);
  }, { deleteByOffset: -90_000, expiresAtOffset: -60_000 });
});

test('CLI rejects weak-mode and hardlinked private requests before touching the item', () => {
  for (const mutate of [
    (filename) => fs.chmodSync(filename, 0o640),
    (filename, fixture) => fs.linkSync(filename, path.join(fixture.rootDir, 'var', 'inputs', 'request-hardlink.json')),
  ]) {
    withSyntheticLifecycleFixture((fixture) => {
      const inputs = prepareInputs(fixture);
      writeJson(inputs.request, requestFor(fixture));
      mutate(inputs.request, fixture);
      const result = run(fixture, inputs);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /owner-only bounded regular file/);
      assert.equal(fs.existsSync(fixture.itemFilename), true);
      assert.equal(fs.existsSync(finalProjectionFilename(fixture)), false);
    });
  }
});

test('CLI refuses v1 and v2 terminal records plus any same-workspace removal directory', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    writeJson(inputs.request, requestFor(fixture));
    const terminal = terminalDirectory(fixture);
    fs.mkdirSync(terminal, { recursive: true, mode: 0o700 });
    fs.chmodSync(terminal, 0o700);
    writeJson(path.join(terminal, 'tombstone.json'), buildFineTuningPrivateCollectionItemTombstone({
      action: 'withdrawn',
      admission: { admissionHash: fixture.admission.admissionHash, id: fixture.admission.id },
      evidenceSha256: hash({ v: 1 }),
      recordedAt: new Date().toISOString(),
      recordedBy: 'retention-deletion-owner-role',
      withdrawalReferenceSha256: fixture.item.retention.withdrawalReferenceSha256,
      workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
    }));
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permanently blocked/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    writeJson(inputs.request, requestFor(fixture));
    const input = writeLifecycleDecision(fixture, 'withdraw');
    const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: fixture.admission,
      executionAt: new Date().toISOString(),
      input,
      item: fixture.item,
      workspace: fixture.workspace,
    });
    const observedAt = new Date().toISOString();
    const tombstone = buildFineTuningPrivateCollectionItemTombstoneV2({ decision, recordedAt: observedAt });
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
    writeJson(path.join(terminal, 'decision.json'), decision);
    writeJson(path.join(terminal, 'tombstone.json'), tombstone);
    writeJson(path.join(terminal, 'absence-receipt.json'), receipt);
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /permanently blocked/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
  });

  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    writeJson(inputs.request, requestFor(fixture));
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
    assert.equal(fs.existsSync(fixture.itemFilename), true);
  });
});

test('CLI ignores lifecycle history owned by a different workspace namespace', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    writeJson(inputs.request, requestFor(fixture));
    const decision = buildFineTuningPrivateCollectionItemLifecycleDecision({
      admission: fixture.admission,
      executionAt: new Date().toISOString(),
      input: writeLifecycleDecision(fixture, 'withdraw'),
      item: fixture.item,
      workspace: fixture.workspace,
    });
    const foreignWorkspaceRoot = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-tombstones',
      'f'.repeat(64),
      `.fine-tuning-private-collection-item-terminal-pending-${decision.decisionHash}`,
    );
    fs.mkdirSync(foreignWorkspaceRoot, { recursive: true, mode: 0o700 });
    fs.chmodSync(foreignWorkspaceRoot, 0o700);
    writeJson(path.join(foreignWorkspaceRoot, 'decision.json'), decision);

    const result = run(fixture, inputs);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(fs.existsSync(finalProjectionFilename(fixture)), true);
  });
});

test('CLI preserves ambiguous projection history instead of selecting a request', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const request = requestFor(fixture);
    writeJson(inputs.request, request);
    const projectedAt = new Date().toISOString();
    const projection = buildFineTuningPrivateCollectionItemReviewProjection({
      admission: fixture.admission,
      item: fixture.item,
      projectedAt,
      request,
      workspace: fixture.workspace,
    });
    const otherRequest = { ...request, requestedAt: new Date(Date.now() + 1_000).toISOString() };
    const otherProjection = buildFineTuningPrivateCollectionItemReviewProjection({
      admission: fixture.admission,
      item: fixture.item,
      projectedAt: otherRequest.requestedAt,
      request: otherRequest,
      workspace: fixture.workspace,
    });
    writePendingProjection(fixture, projection);
    writePendingProjection(fixture, otherProjection);
    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /different request|ambiguous/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
    assert.equal(fs.existsSync(finalProjectionFilename(fixture)), false);
  });
});

test('CLI rejects rehashed projection drift from the live F1.10 item', () => {
  withSyntheticLifecycleFixture((fixture) => {
    const inputs = prepareInputs(fixture);
    const request = requestFor(fixture);
    writeJson(inputs.request, request);
    const projection = buildFineTuningPrivateCollectionItemReviewProjection({
      admission: fixture.admission,
      item: fixture.item,
      projectedAt: new Date().toISOString(),
      request,
      workspace: fixture.workspace,
    });
    projection.bindings.policyHash = 'f'.repeat(64);
    const { id: _id, projectionHash: _projectionHash, ...content } = projection;
    projection.projectionHash = hash(content);
    projection.id =
      `fine-tuning-private-collection-item-review-projection-${projection.projectionHash}`;
    fs.mkdirSync(historyRoot(fixture), { recursive: true, mode: 0o700 });
    fs.chmodSync(historyRoot(fixture), 0o700);
    writeJson(finalProjectionFilename(fixture), projection);

    const result = run(fixture, inputs);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /does not match the live F1\.10 item/);
    assert.equal(fs.existsSync(fixture.itemFilename), true);
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
  const paths = {
    admission: fixture.admissionFilename,
    executionRequest: path.join(inputDirectory, 'execution-request.json'),
    executionResolution: path.join(inputDirectory, 'execution-resolution.json'),
    intakeResolution: path.join(inputDirectory, 'intake-resolution.json'),
    item: fixture.itemFilename,
    plan: path.join(inputDirectory, 'plan.json'),
    request: path.join(inputDirectory, 'request.json'),
    workspace: fixture.workspaceFilename,
  };
  writeJson(paths.executionRequest, fixture.sources.executionRequest);
  writeJson(paths.executionResolution, fixture.sources.executionResolution);
  writeJson(paths.intakeResolution, fixture.sources.intakeResolution);
  writeJson(paths.plan, fixture.sources.privateCollectionPlan);
  return paths;
}

function run(fixture, inputs) {
  return spawnSync(process.execPath, [
    script,
    '--workspace', inputs.workspace,
    '--admission', inputs.admission,
    '--item', inputs.item,
    '--request', inputs.request,
    '--execution-resolution', inputs.executionResolution,
    '--execution-request', inputs.executionRequest,
    '--plan', inputs.plan,
    '--intake-resolution', inputs.intakeResolution,
  ], { cwd: fixture.rootDir, encoding: 'utf8' });
}

function requestFor(fixture) {
  return {
    admission: { admissionHash: fixture.admission.admissionHash, id: fixture.admission.id },
    item: { id: fixture.item.id, itemHash: fixture.item.itemHash },
    requestedAt: new Date().toISOString(),
    requestedByRole: 'local-operator-role',
    schemaVersion: 'personal-ai-agent-fine-tuning-private-collection-item-review-projection-request/v1',
    target: fixture.item.lane === 'reviewed-examples'
      ? 'reviewed-example-candidate-review'
      : 'answer-quality-case-enrichment-review',
    workspace: { id: fixture.workspace.id, workspaceHash: fixture.workspace.workspaceHash },
  };
}

function historyRoot(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-collection-item-review-projections',
    fixture.workspace.workspaceHash,
  );
}

function finalProjectionFilename(fixture) {
  return path.join(historyRoot(fixture), `${fixture.item.itemHash}.json`);
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
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

function writePendingProjection(fixture, projection) {
  const pending = path.join(
    historyRoot(fixture),
    `.fine-tuning-private-collection-item-review-projection-pending-${projection.item.itemHash}-${projection.projectionRequestHash}`,
  );
  fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
  fs.chmodSync(pending, 0o700);
  writeJson(path.join(pending, 'projection.json'), projection);
  return pending;
}
