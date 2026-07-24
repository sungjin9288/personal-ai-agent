import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildApprovedTrainingRecordFixture,
} from '../scripts/approved-training-record-fixture.mjs';
import { buildApprovedTrainingRecord } from '../src/core/approved-training-record.mjs';
import {
  buildAnswerQualityEnrichmentInput,
  prepareAnswerQualityEnrichmentCandidateFixture,
} from './helpers/fine-tuning-private-answer-quality-enrichment-candidate-fixture.mjs';
import {
  createSyntheticLifecycleFixture,
  writeJson,
  writeLifecycleDecision,
} from './helpers/fine-tuning-private-collection-item-lifecycle-fixture.mjs';
import {
  f1_17FinalDirectory,
  f1_18FinalDirectory,
  f1_19FinalDirectory,
  runPayload,
  runReplay,
  writePayloadDecision,
  writeReplayRequest,
} from './helpers/fine-tuning-private-answer-quality-case-payload-fixture.mjs';
import {
  buildFineTuningPrivateReviewedExampleCanonicalizationReceipt,
  deriveFineTuningPrivateReviewedExampleSourceHashes,
} from '../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import {
  prepareReviewedExampleCanonicalizationFixture,
} from './helpers/fine-tuning-private-reviewed-example-canonicalization-fixture.mjs';

const repoDir = process.cwd();
const script = path.join(
  repoDir,
  'scripts',
  'project-fine-tuning-private-combined-readiness-impact.mjs',
);
const resolveScript = path.join(
  repoDir,
  'scripts',
  'resolve-fine-tuning-private-answer-quality-enrichment-candidate-review.mjs',
);
const caseScript = path.join(
  repoDir,
  'scripts',
  'materialize-fine-tuning-private-answer-quality-case.mjs',
);
const recordScript = path.join(
  repoDir,
  'scripts',
  'materialize-fine-tuning-private-reviewed-example.mjs',
);
const lifecycleScript = path.join(
  repoDir,
  'scripts',
  'lifecycle-fine-tuning-private-collection-item.mjs',
);

test('F1.24 CLI deterministically projects F1.21 plus F1.20 without mutation', () => {
  withCombinedFixture((fixture) => {
    fs.chmodSync(path.join(fixture.rootDir, 'var'), 0o700);
    fs.chmodSync(path.join(fixture.rootDir, 'var', 'fine-tuning'), 0o700);
    fs.chmodSync(
      path.join(
        fixture.rootDir,
        'var',
        'fine-tuning',
        'private-collection-item-admission-locks',
      ),
      0o700,
    );
    const before = snapshot(fixture.rootDir);
    const first = runProjection(fixture);
    const second = runProjection(fixture);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(first.stdout, second.stdout);
    const projection = JSON.parse(first.stdout);
    assert.deepEqual(projection.baseline.measurements, {
      acceptedExamples: 4,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 2,
      missionScopes: 4,
      trainExamples: 3,
      validationExamples: 1,
    });
    assert.deepEqual(projection.projection.measurements, {
      acceptedExamples: 5,
      acceptedRiskExamples: 0,
      acceptedRiskRate: 0,
      answerQualityCases: 3,
      missionScopes: 5,
      trainExamples: 4,
      validationExamples: 1,
    });
    assert.equal(projection.projection.failedCheckIds.length, 5);
    assert.equal(projection.externalProviderCalls, 'none');
    for (const secret of [
      fixture.answer.item.example.instruction,
      fixture.answer.item.example.response,
      fixture.record.item.example.instruction,
      fixture.record.item.example.response,
      fixture.answer.item.id,
      fixture.record.item.id,
      fixture.rootDir,
      path.basename(fixture.answer.payloadFilename),
    ]) {
      assert.equal(first.stdout.includes(secret), false);
    }
    assert.deepEqual(snapshot(fixture.rootDir), before);
  });
});

test('F1.24 CLI rejects reordered arguments and pending history without leaking private values', () => {
  withCombinedFixture((fixture) => {
    const args = projectionArgs(fixture);
    [args[0], args[2]] = [args[2], args[0]];
    const unordered = run(script, fixture.rootDir, args);
    assert.notEqual(unordered.status, 0);
    assert.match(unordered.stderr, /Expected exact private F1\.24 input filenames/);

    const pending = path.join(
      fixture.answer.rootDir,
      'var',
      'fine-tuning',
      'private-answer-quality-case-replays',
      fixture.answer.workspace.workspaceHash,
      `.fine-tuning-private-answer-quality-case-replay-pending-${fixture.answer.item.itemHash}-${'a'.repeat(64)}`,
    );
    fs.mkdirSync(pending, { recursive: true, mode: 0o700 });
    fs.writeFileSync(path.join(pending, 'request.json'), '{}\n', { mode: 0o600 });
    const rejected = runProjection(fixture);
    assert.notEqual(rejected.status, 0);
    assert.equal(rejected.stderr.includes(fixture.answer.item.example.response), false);
  });
});

test('F1.24 releases an earlier lexical workspace lock when the later lock is held', () => {
  withCombinedFixture((fixture) => {
    fs.chmodSync(path.join(fixture.rootDir, 'var'), 0o700);
    fs.chmodSync(path.join(fixture.rootDir, 'var', 'fine-tuning'), 0o700);
    const lockRoot = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-collection-item-admission-locks',
    );
    fs.chmodSync(lockRoot, 0o700);
    const [first, second] = [
      fixture.answer.workspace.workspaceHash,
      fixture.record.workspace.workspaceHash,
    ].sort();
    const heldFilename = path.join(lockRoot, `${second}.lock`);
    fs.writeFileSync(
      heldFilename,
      'fine-tuning-private-collection-item-admission-lock/v1\n',
      { mode: 0o600, flag: 'wx' },
    );
    fs.chmodSync(heldFilename, 0o600);
    try {
      const result = runProjection(fixture);
      assert.notEqual(result.status, 0);
      assert.deepEqual(fs.readdirSync(lockRoot).sort(), [`${second}.lock`]);
    } finally {
      fs.unlinkSync(heldFilename);
    }
    assert.deepEqual(fs.readdirSync(lockRoot), []);
    assert.notEqual(first, second);
  });
});

test('F1.24 rejects a foreign replay copy before emitting the projection', () => {
  withCombinedFixture((fixture) => {
    const foreignWorkspace = fixture.answer.workspace.workspaceHash === 'b'.repeat(64)
      ? 'c'.repeat(64)
      : 'b'.repeat(64);
    const historyRoot = path.join(fixture.rootDir, 'var', 'fine-tuning', 'private-answer-quality-case-replays');
    const source = path.join(
      historyRoot,
      fixture.answer.workspace.workspaceHash,
      fixture.answer.item.itemHash,
    );
    const copied = path.join(historyRoot, foreignWorkspace, fixture.answer.item.itemHash);
    fs.mkdirSync(path.dirname(copied), { recursive: true, mode: 0o700 });
    fs.chmodSync(path.dirname(copied), 0o700);
    fs.cpSync(source, copied, { recursive: true });
    for (const name of fs.readdirSync(copied)) {
      fs.chmodSync(path.join(copied, name), 0o600);
    }
    fs.chmodSync(copied, 0o700);
    const result = runProjection(fixture);
    assert.notEqual(result.status, 0);
    assert.equal(result.stderr.includes(fixture.answer.item.example.response), false);
  });
});

test('F1.24 validates a foreign replay receipt against its request before lineage', () => {
  withCombinedFixture((fixture) => {
    const foreignWorkspace =
      fixture.answer.workspace.workspaceHash === 'b'.repeat(64)
        ? 'c'.repeat(64)
        : 'b'.repeat(64);
    const historyRoot = path.join(
      fixture.rootDir,
      'var',
      'fine-tuning',
      'private-answer-quality-case-replays',
    );
    const source = path.join(
      historyRoot,
      fixture.answer.workspace.workspaceHash,
      fixture.answer.item.itemHash,
    );
    const copied = path.join(
      historyRoot,
      foreignWorkspace,
      fixture.answer.item.itemHash,
    );
    fs.mkdirSync(path.dirname(copied), { recursive: true, mode: 0o700 });
    fs.chmodSync(path.dirname(copied), 0o700);
    fs.cpSync(source, copied, { recursive: true });
    const receiptFilename = path.join(copied, 'receipt.json');
    const receipt = readJson(receiptFilename);
    const mismatchedRequestHash = 'f'.repeat(64);
    receipt.bindings.replayRequestHash = mismatchedRequestHash;
    receipt.replayRequest = {
      id:
        `fine-tuning-private-answer-quality-case-replay-request-${mismatchedRequestHash}`,
      replayRequestHash: mismatchedRequestHash,
    };
    rehashReplayReceipt(receipt);
    writeJson(receiptFilename, receipt);
    fs.chmodSync(copied, 0o700);

    const result = runProjection(fixture);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /request and receipt relation is invalid/);
    assert.equal(result.stderr.includes(fixture.answer.item.example.response), false);
  });
});

test('F1.24 rejects a self-consistent F1.21 record that diverges from the live source', () => {
  withCombinedFixture((fixture) => {
    const originalRecord = readJson(fixture.record.recordFilename);
    const source = fixture.record.sourceBundle;
    const divergentRecord = buildApprovedTrainingRecord({
      artifacts: source.artifacts,
      candidate: source.candidate,
      generatedAt: originalRecord.createdAt,
      mission: source.mission,
      reviewerArtifactId: source.reviewerArtifactId,
      sanitizedExample: {
        instruction: 'Summarize another synthetic case.',
        response: 'Another reviewed synthetic response.',
      },
      session: source.session,
      sourceArtifactId: source.sourceArtifactId,
      workspace: source.trainingWorkspace,
    });
    const divergentReceipt =
      buildFineTuningPrivateReviewedExampleCanonicalizationReceipt({
        admission: fixture.record.fixture.admission,
        artifactPreparationResolution:
          fixture.record.artifactPreparationResolution,
        item: fixture.record.fixture.item,
        record: divergentRecord,
        sourceBundle: fixture.record.sourceBundle,
        workspace: fixture.record.fixture.workspace,
      });
    writeJson(fixture.record.recordFilename, divergentRecord);
    writeJson(fixture.record.receiptFilename, divergentReceipt);
    const result = runProjection(fixture);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /source reconstruction drifted/);
    assert.equal(result.stderr.includes(divergentRecord.example.response), false);
  });
});

test('F1.24 rejects restored input after the record item entered terminal history', () => {
  withCombinedFixture((fixture) => {
    const itemBytes = fs.readFileSync(fixture.record.fixture.itemFilename);
    writeLifecycleDecision(fixture.record.fixture, 'withdraw');
    const lifecycle = run(lifecycleScript, fixture.rootDir, [
      '--workspace', fixture.record.fixture.workspaceFilename,
      '--admission', fixture.record.fixture.admissionFilename,
      '--item', fixture.record.fixture.itemFilename,
      '--decision', fixture.record.fixture.decisionFilename,
    ]);
    assert.equal(lifecycle.status, 0, lifecycle.stderr);

    fs.mkdirSync(
      path.dirname(fixture.record.fixture.itemFilename),
      { recursive: true, mode: 0o700 },
    );
    fs.writeFileSync(
      fixture.record.fixture.itemFilename,
      itemBytes,
      { mode: 0o600 },
    );
    fs.chmodSync(fixture.record.fixture.itemFilename, 0o600);

    const result = runProjection(fixture);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /terminal history|deletion cascade history/);
    assert.equal(result.stderr.includes(fixture.record.item.example.response), false);
  });
});

function withCombinedFixture(callback) {
  const rootDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'fine-tuning-combined-impact-'),
  );
  try {
    fs.cpSync(
      path.join(repoDir, 'fixtures'),
      path.join(rootDir, 'fixtures'),
      { recursive: true },
    );
    for (const name of fs.readdirSync(path.join(rootDir, 'fixtures'))) {
      fs.chmodSync(path.join(rootDir, 'fixtures', name), 0o644);
    }
    const answer = prepareAnswer(rootDir);
    const answerInputs = path.join(rootDir, 'var', 'answer-inputs');
    fs.renameSync(path.join(rootDir, 'var', 'inputs'), answerInputs);
    answer.replayRequestFilename = path.join(answerInputs, path.basename(answer.replayRequestFilename));
    const record = prepareRecord(rootDir);
    callback({ rootDir, answer, record });
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

function prepareAnswer(rootDir) {
  const fixture = createSyntheticLifecycleFixture(rootDir, {
    lane: 'answer-quality-cases',
  });
  const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
  const resolution = run(resolveScript, rootDir, [
    '--workspace',
    fixture.workspaceFilename,
    '--admission',
    fixture.admissionFilename,
    '--item',
    fixture.itemFilename,
    '--candidate',
    prepared.candidateFilename,
    '--decision',
    prepared.decisionFilename,
  ]);
  assert.equal(resolution.status, 0, resolution.stderr);

  const enrichmentInputFilename = path.join(
    rootDir,
    'var',
    'inputs',
    'f1-24-enrichment-input.json',
  );
  writeJson(
    enrichmentInputFilename,
    buildAnswerQualityEnrichmentInput(
      fixture,
      prepared.lineage.artifactPreparationResolution,
    ),
  );
  const materialization = run(caseScript, rootDir, [
    '--workspace',
    fixture.workspaceFilename,
    '--admission',
    fixture.admissionFilename,
    '--item',
    fixture.itemFilename,
    '--candidate',
    prepared.candidateFilename,
    '--candidate-review-resolution',
    path.join(f1_17FinalDirectory(fixture), 'resolution.json'),
    '--enrichment-input',
    enrichmentInputFilename,
  ]);
  assert.equal(materialization.status, 0, materialization.stderr);

  const answerQualityCaseFilename = path.join(
    f1_18FinalDirectory(fixture),
    'case.json',
  );
  const answerQualityCase = readJson(answerQualityCaseFilename);
  const payloadDecisionFilename = writePayloadDecision(fixture, answerQualityCase);
  const values = {
    answerQualityCase,
    answerQualityCaseFilename,
    candidateReviewResolutionFilename: path.join(
      f1_17FinalDirectory(fixture),
      'resolution.json',
    ),
    fixture,
    enrichmentInputFilename,
    payloadDecisionFilename,
    prepared,
  };
  assert.equal(runPayload(values).status, 0);
  values.replayRequestFilename = writeReplayRequest(fixture, answerQualityCase);
  assert.equal(runReplay(values).status, 0);
  return {
    ...values,
    admission: fixture.admission,
    item: fixture.item,
    rootDir,
    workspace: fixture.workspace,
    payloadFilename: path.join(f1_19FinalDirectory(fixture), 'payload.json'),
  };
}

function prepareRecord(rootDir) {
  const source = buildApprovedTrainingRecordFixture({
    example: {
      instruction: 'Explain synthetic lifecycle case.',
      response: 'Synthetic lifecycle response.',
    },
    missionId: 'source-mission',
    suffix: 'private-reviewed-example-source',
    workspaceId: 'source-workspace',
  });
  const fixture = createSyntheticLifecycleFixture(rootDir, {
    lane: 'reviewed-examples',
    sourceHashes: deriveFineTuningPrivateReviewedExampleSourceHashes({
      artifacts: source.artifacts,
      candidate: source.candidate,
      mission: source.mission,
      reviewerArtifactId: source.reviewerArtifactId,
      session: source.session,
      sourceArtifactId: source.sourceArtifactId,
      trainingWorkspace: source.workspace,
    }),
  });
  const prepared = prepareReviewedExampleCanonicalizationFixture(fixture);
  const materialization = run(recordScript, rootDir, [
    '--workspace',
    fixture.workspaceFilename,
    '--admission',
    fixture.admissionFilename,
    '--item',
    fixture.itemFilename,
    '--intake-resolution',
    prepared.intakeResolutionFilename,
    '--private-collection-plan',
    prepared.privateCollectionPlanFilename,
    '--execution-request',
    prepared.executionRequestFilename,
    '--execution-resolution',
    prepared.executionResolutionFilename,
    '--artifact-preparation-resolution',
    prepared.resolutionFilename,
    '--source-bundle',
    prepared.sourceBundleFilename,
  ]);
  assert.equal(materialization.status, 0, materialization.stderr);
  const finalDirectory = path.join(
    rootDir,
    'var',
    'fine-tuning',
    'private-reviewed-example-canonical-records',
    fixture.workspace.workspaceHash,
    fixture.item.itemHash,
  );
  return {
    ...prepared,
    fixture,
    item: fixture.item,
    receiptFilename: path.join(finalDirectory, 'receipt.json'),
    recordFilename: path.join(finalDirectory, 'record.json'),
    rootDir,
    workspace: fixture.workspace,
  };
}

function runProjection(fixture) {
  return run(script, fixture.rootDir, projectionArgs(fixture));
}

function projectionArgs({ answer, record }) {
  return [
    '--record-workspace',
    record.fixture.workspaceFilename,
    '--record-admission',
    record.fixture.admissionFilename,
    '--record-item',
    record.fixture.itemFilename,
    '--record-intake-resolution',
    record.intakeResolutionFilename,
    '--record-private-collection-plan',
    record.privateCollectionPlanFilename,
    '--record-execution-request',
    record.executionRequestFilename,
    '--record-execution-resolution',
    record.executionResolutionFilename,
    '--record-artifact-preparation-resolution',
    record.resolutionFilename,
    '--record-source-bundle',
    record.sourceBundleFilename,
    '--answer-workspace',
    answer.fixture.workspaceFilename,
    '--answer-admission',
    answer.fixture.admissionFilename,
    '--answer-item',
    answer.fixture.itemFilename,
    '--answer-candidate',
    answer.prepared.candidateFilename,
    '--answer-candidate-review-resolution',
    answer.candidateReviewResolutionFilename,
    '--answer-case',
    answer.answerQualityCaseFilename,
    '--answer-payload',
    answer.payloadFilename,
    '--answer-request',
    answer.replayRequestFilename,
  ];
}

function run(command, cwd, args) {
  const resolvedArgs = args.map((value, index) =>
    index % 2 === 0 ? value : fs.realpathSync(value),
  );
  return spawnSync(process.execPath, [command, ...resolvedArgs], {
    cwd: fs.realpathSync(cwd),
    encoding: 'utf8',
  });
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function rehashReplayReceipt(receipt) {
  const {
    id: _id,
    privateAnswerQualityCaseReplayHash: _hash,
    ...content
  } = receipt;
  const hash = createHash('sha256')
    .update(JSON.stringify(content))
    .digest('hex');
  receipt.privateAnswerQualityCaseReplayHash = hash;
  receipt.id = `fine-tuning-private-answer-quality-case-replay-${hash}`;
}

function snapshot(rootDir) {
  const entries = {};
  for (const root of ['evidence', 'var']) {
    visit(path.join(rootDir, root), root);
  }
  return entries;

  function visit(filename, relative) {
    const stat = fs.lstatSync(filename);
    let type = 'file';
    if (stat.isDirectory()) type = 'directory';
    if (stat.isSymbolicLink()) type = 'symlink';
    entries[relative] = {
      mode: stat.mode & 0o777,
      nlink: stat.nlink,
      size: stat.size,
      type,
    };
    if (stat.isFile()) {
      entries[relative].bytes = fs.readFileSync(filename).toString('base64');
    }
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(filename).sort()) {
        visit(path.join(filename, name), path.join(relative, name));
      }
    }
  }
}
