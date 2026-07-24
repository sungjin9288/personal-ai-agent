import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  f1_20FinalDirectory,
  runPayload,
  runReplay,
  withReadyPrivateAnswerQualityPayload,
  writeReplayRequest,
} from './helpers/fine-tuning-private-answer-quality-case-payload-fixture.mjs';

const repoDir = process.cwd();
const script = path.join(
  repoDir,
  'scripts',
  'project-fine-tuning-private-answer-quality-readiness-impact.mjs',
);

test('F1.23 reads one final F1.20 replay without private output or state mutation', () => {
  withReplay((values) => {
    const before = snapshot(values.fixture.rootDir);
    const first = run(values);
    const second = run(values);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
    const output = JSON.parse(first.stdout);
    assert.equal(output.projection.measurements.answerQualityCases, 3);
    assert.equal(output.projection.failedCheckIds.length, 5);
    assert.equal(output.mutationPerformed, false);
    assert.equal(output.actualReadinessReplaced, false);
    for (const privateValue of [
      values.fixture.item.example.instruction,
      values.fixture.item.example.response,
      values.fixture.item.id,
      values.fixture.workspace.id,
      values.fixture.rootDir,
      path.basename(values.replayRequestFilename),
    ]) assert.equal(first.stdout.includes(privateValue), false);
    assert.deepEqual(snapshot(values.fixture.rootDir), before);
  });
});

test('F1.23 refuses unordered inputs, pending ambiguity, and expired replay authority', () => {
  withReplay((values) => {
    const args = argumentsFor(values);
    [args[0], args[2]] = [args[2], args[0]];
    const unordered = invoke(values.fixture.rootDir, args);
    assert.notEqual(unordered.status, 0);
    assert.match(unordered.stderr, /Expected exact private F1\.23 input filenames/);
  });

  withReplay((values) => {
    const final = f1_20FinalDirectory(values.fixture);
    const request = JSON.parse(fs.readFileSync(path.join(final, 'request.json'), 'utf8'));
    const pending = path.join(
      path.dirname(final),
      `.fine-tuning-private-answer-quality-case-replay-pending-${values.fixture.item.itemHash}-${request.replayRequestHash}`,
    );
    fs.mkdirSync(pending, { mode: 0o700 });
    assert.notEqual(run(values).status, 0);
    assert.match(run(values).stderr, /replay history bundle|without pending history/);
  });

  withReplay((values) => {
    const request = JSON.parse(fs.readFileSync(values.replayRequestFilename, 'utf8'));
    request.expiresAt = '2000-01-01T00:00:00.000Z';
    fs.writeFileSync(values.replayRequestFilename, `${JSON.stringify(request)}\n`, { mode: 0o600 });
    assert.notEqual(run(values).status, 0);
    assert.match(run(values).stderr, /replay request|expired/);
  });
});

test('F1.23 rejects tracked baseline and fixture drift before emitting a projection', () => {
  withReplay((values) => {
    const tracked = path.join(
      values.fixture.rootDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-sufficiency.json',
    );
    fs.writeFileSync(tracked, '{}\n', { mode: 0o600 });
    const result = run(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tracked sufficiency assessment|sufficiency/);
  });

  withReplay((values) => {
    const fixture = path.join(
      values.fixture.rootDir,
      'fixtures',
      'training-dataset-quality-cases-v1.json',
    );
    const value = JSON.parse(fs.readFileSync(fixture, 'utf8'));
    value.seed = `${value.seed}-drift`;
    fs.writeFileSync(fixture, `${JSON.stringify(value, null, 2)}\n`);
    const result = run(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tracked sufficiency baseline drifted/);
  });

  withReplay((values) => {
    const tracked = path.join(
      values.fixture.rootDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-sufficiency.json',
    );
    fs.chmodSync(tracked, 0o600);
    const result = run(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /tracked sufficiency assessment/);
  });

  withReplay((values) => {
    const fixture = path.join(
      values.fixture.rootDir,
      'fixtures',
      'answer-quality-cases-v1.json',
    );
    fs.chmodSync(fixture, 0o600);
    const result = run(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /baseline fixture/);
  });
});

test('F1.23 rejects malformed sibling and foreign replay history before reading a current projection', () => {
  withReplay((values) => {
    const root = path.dirname(f1_20FinalDirectory(values.fixture));
    fs.writeFileSync(path.join(root, 'f'.repeat(64)), '{}\n', { mode: 0o600 });
    assert.notEqual(run(values).status, 0);
  });

  withReplay((values) => {
    const root = path.dirname(f1_20FinalDirectory(values.fixture));
    const sibling = path.join(root, 'e'.repeat(64));
    fs.mkdirSync(sibling, { mode: 0o700 });
    fs.writeFileSync(path.join(sibling, 'request.json'), '{}\n', { mode: 0o600 });
    fs.writeFileSync(path.join(sibling, 'receipt.json'), '{}\n', { mode: 0o600 });
    assert.notEqual(run(values).status, 0);
  });

  withReplay((values) => {
    const final = f1_20FinalDirectory(values.fixture);
    const request = JSON.parse(fs.readFileSync(path.join(final, 'request.json'), 'utf8'));
    const pending = path.join(
      path.dirname(final),
      `.fine-tuning-private-answer-quality-case-replay-pending-${'e'.repeat(64)}-${request.replayRequestHash}`,
    );
    fs.mkdirSync(pending, { mode: 0o700 });
    fs.writeFileSync(path.join(pending, 'request.json'), '{}\n', { mode: 0o600 });
    assert.notEqual(run(values).status, 0);
  });

  withReplay((values) => {
    const source = f1_20FinalDirectory(values.fixture);
    const foreign = path.join(
      values.fixture.rootDir,
      'var',
      'fine-tuning',
      'private-answer-quality-case-replays',
      'f'.repeat(64),
      values.fixture.item.itemHash,
    );
    fs.mkdirSync(path.dirname(foreign), { recursive: true, mode: 0o700 });
    fs.chmodSync(path.dirname(foreign), 0o700);
    fs.cpSync(source, foreign, { recursive: true });
    fs.chmodSync(foreign, 0o700);
    const result = run(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /foreign replay history|foreign workspace copy|replay history entry/);
  });
});

function withReplay(callback) {
  withReadyPrivateAnswerQualityPayload((values) => {
    fs.cpSync(path.join(repoDir, 'fixtures'), path.join(values.fixture.rootDir, 'fixtures'), {
      recursive: true,
    });
    const trackedSource = path.join(
      repoDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-sufficiency.json',
    );
    const trackedTarget = path.join(
      values.fixture.rootDir,
      'evidence',
      'output-artifacts',
      'fine-tuning-data-sufficiency.json',
    );
    fs.mkdirSync(path.dirname(trackedTarget), { recursive: true, mode: 0o700 });
    fs.copyFileSync(trackedSource, trackedTarget);
    fs.chmodSync(trackedTarget, 0o644);
    assert.equal(runPayload(values).status, 0);
    values.replayRequestFilename = writeReplayRequest(values.fixture, values.answerQualityCase);
    const replay = runReplay(values);
    assert.equal(replay.status, 0, replay.stderr);
    callback(values);
  });
}

function run(values) {
  return invoke(values.fixture.rootDir, argumentsFor(values));
}

function invoke(cwd, args) {
  return spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8' });
}

function argumentsFor(values) {
  return [
    '--workspace', fs.realpathSync(values.fixture.workspaceFilename),
    '--admission', fs.realpathSync(values.fixture.admissionFilename),
    '--item', fs.realpathSync(values.fixture.itemFilename),
    '--candidate', fs.realpathSync(values.prepared.candidateFilename),
    '--candidate-review-resolution', fs.realpathSync(values.candidateReviewResolutionFilename),
    '--case', fs.realpathSync(values.answerQualityCaseFilename),
    '--payload', fs.realpathSync(path.join(f1_19Directory(values), 'payload.json')),
    '--request', fs.realpathSync(values.replayRequestFilename),
  ];
}

function f1_19Directory(values) {
  return path.join(
    values.fixture.rootDir,
    'var',
    'fine-tuning',
    'private-answer-quality-case-payloads',
    values.fixture.workspace.workspaceHash,
    values.fixture.item.itemHash,
  );
}

function snapshot(rootDir) {
  const entries = {};
  for (const root of ['evidence', 'var']) {
    const filename = path.join(rootDir, root);
    if (fs.existsSync(filename)) visit(filename, root);
  }
  return entries;
  function visit(filename, relative) {
    const stat = fs.lstatSync(filename);
    entries[relative] = {
      bytes: stat.isFile() ? fs.readFileSync(filename).toString('base64') : null,
      mode: stat.mode & 0o777,
      nlink: stat.nlink,
      type: stat.isDirectory() ? 'directory' : stat.isSymbolicLink() ? 'symlink' : 'file',
    };
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(filename).sort()) visit(path.join(filename, name), path.join(relative, name));
    }
  }
}
