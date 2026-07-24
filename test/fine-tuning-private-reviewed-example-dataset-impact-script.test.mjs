import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  prepareReviewedExampleCanonicalizationFixture,
  withReviewedExampleCanonicalizationFixture,
} from './helpers/fine-tuning-private-reviewed-example-canonicalization-fixture.mjs';
import { writeLifecycleDecision } from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';

const repoDir = process.cwd();
const materializeScript = path.join(repoDir, 'scripts', 'materialize-fine-tuning-private-reviewed-example.mjs');
const projectScript = path.join(repoDir, 'scripts', 'project-fine-tuning-private-reviewed-example-dataset-impact.mjs');
const lifecycleScript = path.join(repoDir, 'scripts', 'lifecycle-fine-tuning-private-collection-item.mjs');

test('F1.22 exactly replays one F1.21 record without outputting private content or changing state', () => {
  withReadyFixture((fixture, prepared) => {
    const before = snapshot(fixture.rootDir);
    const first = project(fixture, prepared);
    const second = project(fixture, prepared);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
    const privateValues = [
      fixture.item.example.instruction,
      fixture.item.example.response,
      fixture.item.id,
      fixture.admission.id,
      fixture.workspace.id,
      prepared.sourceBundle.candidate.id,
      prepared.sourceBundle.mission.id,
      prepared.sourceBundle.session.id,
      prepared.sourceBundle.trainingWorkspace.id,
      fixture.rootDir,
      path.basename(prepared.sourceBundleFilename),
    ];
    for (const value of privateValues) {
      assert.equal(first.stdout.includes(value), false, `stdout exposed ${value}`);
    }
    const output = JSON.parse(first.stdout);
    assert.equal(output.executionMode, 'shadow-only');
    assert.equal(output.actualPrivateDatasetRebuilt, false);
    assert.equal(output.actualSufficiencyChanged, false);
    assert.equal(output.collectionActionCompletionRecorded, false);
    assert.equal(output.datasetLevelAdmissionGranted, false);
    assert.equal(output.externalProviderCalls, 'none');
    assert.equal(output.fineTuningExecutionAuthorized, false);
    assert.equal(output.productionReadyClaim, false);
    assert.deepEqual(snapshot(fixture.rootDir), before);
  });
});

test('F1.22 requires the exact F1.21 argument order and validates authority before reading source', () => {
  withReviewedExampleCanonicalizationFixture((fixture) => {
    copyFixtures(fixture.rootDir);
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture, { artifactDecision: 'reject' });
    const source = fs.realpathSync(prepared.sourceBundleFilename);
    const rejectedArgs = argsFor(fixture, prepared);
    fs.unlinkSync(source);
    const rejected = run(projectScript, fixture.rootDir, rejectedArgs);
    assert.notEqual(rejected.status, 0);
    assert.match(rejected.stderr, /approved live F1\.15/);
    assert.doesNotMatch(rejected.stderr, /ENOENT|sourceBundle/);

    const args = [...rejectedArgs];
    [args[0], args[2]] = [args[2], args[0]];
    const unordered = run(projectScript, fixture.rootDir, args);
    assert.notEqual(unordered.status, 0);
    assert.match(unordered.stderr, /Expected exact private F1\.22 input filenames/);
  });
});

test('F1.22 rejects missing predecessors, deleted authority, and non-canonical source inputs', () => {
  withReadyFixture((fixture, prepared) => {
    const predecessor = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-artifact-requests',
      fixture.workspace.workspaceHash,
      `${fixture.item.itemHash}.json`,
    );
    fs.unlinkSync(predecessor);
    assert.notEqual(project(fixture, prepared).status, 0);
  });

  withReadyFixture((fixture, prepared) => {
    const item = fs.readFileSync(fixture.itemFilename);
    writeLifecycleDecision(fixture, 'withdraw');
    assert.equal(run(lifecycleScript, fixture.rootDir, [
      '--workspace', fs.realpathSync(fixture.workspaceFilename),
      '--admission', fs.realpathSync(fixture.admissionFilename),
      '--item', fs.realpathSync(fixture.itemFilename),
      '--decision', fs.realpathSync(fixture.decisionFilename),
    ]).status, 0);
    fs.mkdirSync(path.dirname(fixture.itemFilename), { recursive: true, mode: 0o700 });
    fs.writeFileSync(fixture.itemFilename, item, { mode: 0o600 });
    fs.chmodSync(fixture.itemFilename, 0o600);
    const result = project(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /terminal history|deletion cascade history/);
  });

  withReadyFixture((fixture, prepared) => {
    const copied = path.join(fixture.rootDir, 'var', 'inputs', 'copied-item.json');
    fs.copyFileSync(fixture.itemFilename, copied);
    fs.chmodSync(copied, 0o600);
    const copiedArgs = argsFor(fixture, prepared);
    copiedArgs[5] = copied;
    assert.notEqual(run(projectScript, fixture.rootDir, copiedArgs).status, 0);
    const linked = path.join(fixture.rootDir, 'var', 'inputs', 'linked-source.json');
    fs.linkSync(prepared.sourceBundleFilename, linked);
    assert.notEqual(project(fixture, prepared, { source: linked }).status, 0);
  });
});

test('F1.22 requires one untampered final F1.21 bundle without pending history', () => {
  for (const mutate of [
    (directory) => fs.rmSync(directory, { force: true, recursive: true }),
    (directory) => fs.unlinkSync(path.join(directory, 'receipt.json')),
    (directory) => fs.writeFileSync(path.join(directory, 'receipt.json'), '{}\n', { mode: 0o600 }),
    (directory, fixture, prepared) => {
      const itemHash = fixture.item.itemHash;
      const resolutionHash =
        prepared.artifactPreparationResolution.artifactPreparationResolutionHash;
      const pending = path.join(
        path.dirname(directory),
        `.private-reviewed-example-canonical-record-pending-${itemHash}-${resolutionHash}`,
      );
      fs.mkdirSync(pending, { mode: 0o700 });
    },
  ]) {
    withReadyFixture((fixture, prepared) => {
      mutate(finalDirectory(fixture), fixture, prepared);
      const result = project(fixture, prepared);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /F1\.22|current-owner|invalid/);
    });
  }
});

test('F1.22 does not open a sibling final record outside the current item authority', () => {
  withReadyFixture((fixture, prepared) => {
    const root = path.dirname(finalDirectory(fixture));
    const siblingHash =
      fixture.item.itemHash === 'f'.repeat(64)
        ? 'e'.repeat(64)
        : 'f'.repeat(64);
    const sibling = path.join(root, siblingHash);
    fs.mkdirSync(sibling, { mode: 0o700 });
    fs.writeFileSync(
      path.join(sibling, 'record.json'),
      '{"id":"PRIVATE-SIBLING-RECORD-ID"}\n',
      { mode: 0o600 },
    );
    fs.writeFileSync(
      path.join(sibling, 'receipt.json'),
      '{"id":"PRIVATE-SIBLING-RECEIPT-ID"}\n',
      { mode: 0o600 },
    );

    const result = project(fixture, prepared);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr.includes('PRIVATE-SIBLING'), false);
    assert.equal(result.stdout.includes('PRIVATE-SIBLING'), false);
  });
});

test('F1.22 binds its deterministic baseline to the tracked F1.1 assessment', () => {
  withReadyFixture((fixture, prepared) => {
    const datasetFixture = path.join(fixture.rootDir, 'fixtures', 'training-dataset-quality-cases-v1.json');
    const value = JSON.parse(fs.readFileSync(datasetFixture, 'utf8'));
    value.seed = `${value.seed}-drift`;
    fs.writeFileSync(datasetFixture, `${JSON.stringify(value, null, 2)}\n`);
    const result = project(fixture, prepared);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tracked sufficiency baseline drifted/);
  });
});

function withReadyFixture(callback) {
  return withReviewedExampleCanonicalizationFixture((fixture) => {
    copyFixtures(fixture.rootDir);
    const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
    const result = materialize(fixture, prepared);
    assert.equal(result.status, 0, result.stderr);
    return callback(fixture, prepared);
  });
}

function copyFixtures(rootDir) {
  fs.cpSync(path.join(repoDir, 'fixtures'), path.join(rootDir, 'fixtures'), { recursive: true });
}

function materialize(fixture, prepared) {
  return run(materializeScript, fixture.rootDir, argsFor(fixture, prepared));
}

function project(fixture, prepared, { source, sourceArgument } = {}) {
  const args = argsFor(fixture, prepared, { source, sourceArgument });
  return run(projectScript, fixture.rootDir, args);
}

function argsFor(fixture, prepared, { source, sourceArgument } = {}) {
  return [
    '--workspace', fs.realpathSync(fixture.workspaceFilename),
    '--admission', fs.realpathSync(fixture.admissionFilename),
    '--item', fs.realpathSync(fixture.itemFilename),
    '--intake-resolution', fs.realpathSync(prepared.intakeResolutionFilename),
    '--private-collection-plan', fs.realpathSync(prepared.privateCollectionPlanFilename),
    '--execution-request', fs.realpathSync(prepared.executionRequestFilename),
    '--execution-resolution', fs.realpathSync(prepared.executionResolutionFilename),
    '--artifact-preparation-resolution', fs.realpathSync(prepared.resolutionFilename),
    '--source-bundle', sourceArgument || fs.realpathSync(source || prepared.sourceBundleFilename),
  ];
}

function run(script, cwd, args) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}

function finalDirectory(fixture) {
  return path.join(
    fixture.rootDir,
    'var',
    'fine-tuning',
    'private-reviewed-example-canonical-records',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
}

function snapshot(rootDir) {
  const entries = {};
  for (const root of ['evidence', 'var']) visit(path.join(rootDir, root), root);
  return entries;
  function visit(filename, relative) {
    const stat = fs.lstatSync(filename);
    const type = stat.isDirectory()
      ? 'directory'
      : stat.isSymbolicLink()
        ? 'symlink'
        : 'file';
    entries[relative] = {
      mode: stat.mode & 0o777,
      nlink: stat.nlink,
      size: stat.size,
      type,
    };
    if (stat.isFile()) entries[relative].bytes = fs.readFileSync(filename).toString('base64');
    if (stat.isDirectory()) for (const name of fs.readdirSync(filename).sort()) visit(path.join(filename, name), path.join(relative, name));
  }
}
