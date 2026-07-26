import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  buildApprovedTrainingRecordFixture,
} from '../../scripts/approved-training-record-fixture.mjs';
import {
  buildAnswerQualityEnrichmentInput,
  prepareAnswerQualityEnrichmentCandidateFixture,
} from './fine-tuning-private-answer-quality-enrichment-candidate-fixture.mjs';
import {
  createSyntheticLifecycleFixture,
  writeJson,
} from './fine-tuning-private-collection-item-lifecycle-fixture.mjs';
import {
  f1_17FinalDirectory,
  f1_18FinalDirectory,
  f1_19FinalDirectory,
  runPayload,
  runReplay,
  writePayloadDecision,
  writeReplayRequest,
} from './fine-tuning-private-answer-quality-case-payload-fixture.mjs';
import {
  deriveFineTuningPrivateReviewedExampleSourceHashes,
} from '../../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import {
  prepareReviewedExampleCanonicalizationFixture,
} from './fine-tuning-private-reviewed-example-canonicalization-fixture.mjs';

const repoDir = process.cwd();
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

export function withFineTuningPrivateCombinedReadinessFixture(callback) {
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
    answer.replayRequestFilename = path.join(
      answerInputs,
      path.basename(answer.replayRequestFilename),
    );
    const record = prepareRecord(rootDir);
    callback({ rootDir, answer, record });
  } finally {
    fs.rmSync(rootDir, { force: true, recursive: true });
  }
}

export function privateCombinedReadinessArgs({ answer, record }) {
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

export function runPrivateCombinedReadinessScript(command, rootDir, args) {
  const resolvedArgs = args.map((value, index) =>
    index % 2 === 0 ? value : fs.realpathSync(value),
  );
  return spawnSync(process.execPath, [command, ...resolvedArgs], {
    cwd: fs.realpathSync(rootDir),
    encoding: 'utf8',
  });
}

export function snapshotPrivateCombinedReadinessState(rootDir) {
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

function prepareAnswer(rootDir) {
  const fixture = createSyntheticLifecycleFixture(rootDir, {
    lane: 'answer-quality-cases',
  });
  const prepared = prepareAnswerQualityEnrichmentCandidateFixture(fixture);
  const resolution = runPrivateCombinedReadinessScript(resolveScript, rootDir, [
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
    'combined-readiness-enrichment-input.json',
  );
  writeJson(
    enrichmentInputFilename,
    buildAnswerQualityEnrichmentInput(
      fixture,
      prepared.lineage.artifactPreparationResolution,
    ),
  );
  const materialization = runPrivateCombinedReadinessScript(caseScript, rootDir, [
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
  const materialization = runPrivateCombinedReadinessScript(recordScript, rootDir, [
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

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}
