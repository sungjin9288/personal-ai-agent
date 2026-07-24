import fs from 'node:fs';
import path from 'node:path';

import { buildDeterministicFineTuningBaselineContext } from './local-training-permission-fixture.mjs';
import {
  assertFineTuningPrivateAnswerQualityCaseRecord,
} from '../src/core/fine-tuning-private-answer-quality-case.mjs';
import {
  assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord,
  assertFineTuningPrivateAnswerQualityCasePayloadRecord,
} from '../src/core/fine-tuning-private-answer-quality-case-payload.mjs';
import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord,
} from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord,
} from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import {
  assertFineTuningPrivateCollectionItemRecord,
} from '../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  assertFineTuningDataSufficiencyAssessment,
} from '../src/core/fine-tuning-data-sufficiency.mjs';
import {
  buildFineTuningPrivateCombinedReadinessImpactShadow,
} from '../src/core/fine-tuning-private-combined-readiness-impact.mjs';
import {
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertCanonicalPrivateAnswerQualityCaseChain,
  assertCanonicalPrivateAnswerQualityPayloadEntry,
} from './helpers/fine-tuning-private-answer-quality-case-history.mjs';
import {
  assertSameFineTuningPrivateAnswerQualityReplayHistory,
  readFineTuningPrivateAnswerQualityReplayHistory,
  selectFineTuningPrivateAnswerQualityReplayHistory,
} from './helpers/fine-tuning-private-answer-quality-replay-history.mjs';
import {
  assertFineTuningPrivateAnswerQualityReviewInputs,
  assertFineTuningPrivateAnswerQualityReviewState,
} from './helpers/fine-tuning-private-answer-quality-review-guard.mjs';
import {
  assertSameFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleSource,
} from './helpers/fine-tuning-private-reviewed-example-authority.mjs';
import {
  assertSameFineTuningPrivateReviewedExampleHistory,
  readFineTuningPrivateReviewedExampleHistory,
  selectFineTuningPrivateReviewedExampleHistory,
} from './helpers/fine-tuning-private-reviewed-example-history.mjs';
import {
  assertSamePrivateJsonState,
  readPrivateJsonState,
} from './helpers/private-json-state.mjs';

const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initialRecord = loadFineTuningPrivateReviewedExampleAuthority({
  filenames: filenames.record,
  label: 'F1.24 record',
  repoDir,
});
const initialRecordCurrent = loadFineTuningPrivateReviewedExampleSource({
  authority: initialRecord,
  filename: filenames.record.sourceBundle,
  label: 'F1.24 record',
  repoDir,
});
const initialAnswer = loadAnswer(filenames.answer);
const initialFixtures = readBaselineFixtures();
const initialReplayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
  label: 'F1.24 replay history',
  repoDir,
});
const initialRecordHistory = readFineTuningPrivateReviewedExampleHistory({
  label: 'F1.24 canonical record history',
  repoDir,
});
const locks = [];

try {
  for (const workspaceHash of [...new Set([
    initialRecord.workspace.workspaceHash,
    initialAnswer.workspace.workspaceHash,
  ])].sort()) {
    locks.push(acquireFineTuningPrivateCollectionWorkspaceLock({
      repoDir,
      workspaceHash,
      errorPrefix: 'F1.24 combined readiness impact shadow lock',
    }));
  }
  const recordAuthority = loadFineTuningPrivateReviewedExampleAuthority({
    filenames: filenames.record,
    label: 'F1.24 record',
    repoDir,
  });
  const answer = loadAnswer(filenames.answer);
  const fixtures = readBaselineFixtures();
  assertSameFineTuningPrivateReviewedExampleAuthority(
    initialRecord,
    recordAuthority,
    { compareTrackedFileIdentity: true, label: 'F1.24 record' },
  );
  assertSameAnswer(initialAnswer, answer);
  assertSameFixtures(initialFixtures, fixtures);
  assertWindow(answer);
  const recordCurrent = loadFineTuningPrivateReviewedExampleSource({
    authority: recordAuthority,
    filename: filenames.record.sourceBundle,
    label: 'F1.24 record',
    repoDir,
  });
  assertSamePrivateJsonState(
    initialRecordCurrent.states.sourceBundle,
    recordCurrent.states.sourceBundle,
    'F1.24 record source bundle',
  );
  const recordHistory = readFineTuningPrivateReviewedExampleHistory({
    label: 'F1.24 canonical record history',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleHistory(
    initialRecordHistory,
    recordHistory,
    'F1.24 canonical record history',
  );
  const record = selectFineTuningPrivateReviewedExampleHistory(
    recordHistory,
    recordCurrent,
    { label: 'F1.24 canonical record history' },
  );
  const replayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
    label: 'F1.24 replay history',
    repoDir,
  });
  assertSameFineTuningPrivateAnswerQualityReplayHistory(
    initialReplayHistory,
    replayHistory,
    'F1.24 replay history',
  );
  const replay = selectFineTuningPrivateAnswerQualityReplayHistory(
    replayHistory,
    answer,
    { label: 'F1.24 replay history' },
  );
  const baselineContext = buildDeterministicFineTuningBaselineContext({
    fixtureValues: fixtures.values,
    repoDir,
  });
  if (
    JSON.stringify(answer.trackedAssessment.value) !==
    JSON.stringify(baselineContext.sufficiencyAssessment)
  ) {
    throw new Error('F1.24 tracked sufficiency baseline drifted.');
  }
  const projection = buildFineTuningPrivateCombinedReadinessImpactShadow({
    answerQualityCase: answer.answerQualityCase,
    baselineContext,
    item: answer.item,
    payload: answer.payload,
    record: record.record.value,
    recordReceipt: record.receipt.value,
    replayReceipt: replay.receipt.value,
    replayRequest: replay.request.value,
    trackedAssessment: baselineContext.sufficiencyAssessment,
    workspace: answer.workspace,
  });
  const finalRecordAuthority = loadFineTuningPrivateReviewedExampleAuthority({
    filenames: filenames.record,
    label: 'F1.24 record',
    repoDir,
  });
  const finalAnswer = loadAnswer(filenames.answer);
  const finalFixtures = readBaselineFixtures();
  assertSameFineTuningPrivateReviewedExampleAuthority(
    initialRecord,
    finalRecordAuthority,
    { compareTrackedFileIdentity: true, label: 'F1.24 record' },
  );
  assertSameAnswer(initialAnswer, finalAnswer);
  assertSameFixtures(initialFixtures, finalFixtures);
  assertWindow(finalAnswer);
  const finalRecordCurrent = loadFineTuningPrivateReviewedExampleSource({
    authority: finalRecordAuthority,
    filename: filenames.record.sourceBundle,
    label: 'F1.24 record',
    repoDir,
  });
  const finalRecordHistory = readFineTuningPrivateReviewedExampleHistory({
    label: 'F1.24 canonical record history',
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleHistory(
    initialRecordHistory,
    finalRecordHistory,
    'F1.24 canonical record history',
  );
  const finalRecord = selectFineTuningPrivateReviewedExampleHistory(
    finalRecordHistory,
    finalRecordCurrent,
    { label: 'F1.24 canonical record history' },
  );
  const finalReplayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
    label: 'F1.24 replay history',
    repoDir,
  });
  assertSameFineTuningPrivateAnswerQualityReplayHistory(
    initialReplayHistory,
    finalReplayHistory,
    'F1.24 replay history',
  );
  const finalReplay = selectFineTuningPrivateAnswerQualityReplayHistory(
    finalReplayHistory,
    finalAnswer,
    { label: 'F1.24 replay history' },
  );
  for (const [label, before, after] of [
    [
      'record source bundle',
      recordCurrent.states.sourceBundle,
      finalRecordCurrent.states.sourceBundle,
    ],
    ['record', record.record, finalRecord.record],
    ['record receipt', record.receipt, finalRecord.receipt],
    ['replay request', replay.request, finalReplay.request],
    ['replay receipt', replay.receipt, finalReplay.receipt],
  ]) {
    assertSamePrivateJsonState(before, after, `F1.24 ${label}`);
  }
  console.log(JSON.stringify(projection, null, 2));
} finally {
  let releaseError;
  for (const lock of locks.reverse()) {
    try {
      lock.release();
    } catch (error) {
      releaseError ||= error;
    }
  }
  if (releaseError) throw releaseError;
}

function loadAnswer(names) {
  const states = {};
  const inputFilenames = {
    workspace: names.workspace,
    admission: names.admission,
    item: names.item,
    candidate: names.candidate,
    candidateReviewResolution: names.candidateReviewResolution,
    answerQualityCase: names.answerQualityCase,
    requestInput: names.request,
  };
  for (const [key, filename] of Object.entries(inputFilenames)) {
    states[key] = readPrivateJsonState(filename, `F1.24 answer ${key}`, { repoDir });
  }
  const current = Object.fromEntries(
    Object.entries(states).map(([key, state]) => [key, state.value]),
  );
  current.states = states;
  assertFineTuningPrivateCollectionWorkspaceRecord(current.workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(current.admission);
  assertFineTuningPrivateCollectionItemRecord(current.item);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(
    current.candidate,
  );
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
    current.candidateReviewResolution,
  );
  assertFineTuningPrivateAnswerQualityCaseRecord(current.answerQualityCase);
  assertFineTuningPrivateAnswerQualityReviewInputs({
    repoDir,
    states,
    values: { ...current, decision: current.candidateReviewResolution },
  });
  assertFineTuningPrivateAnswerQualityReviewState({
    current: { ...current, decision: current.candidateReviewResolution },
    repoDir,
  });
  assertCanonicalPrivateAnswerQualityCaseChain({ current, repoDir });
  const payloadDirectory = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-answer-quality-case-payloads',
    current.workspace.workspaceHash,
    current.item.itemHash,
  );
  const payloadFilename = path.join(payloadDirectory, 'payload.json');
  const decisionFilename = path.join(payloadDirectory, 'decision.json');
  const payload = readPrivateJsonState(
    names.payload,
    'F1.24 answer payload',
    { repoDir },
  );
  const decision = readPrivateJsonState(
    decisionFilename,
    'F1.24 answer payload decision',
    { repoDir },
  );
  if (payload.canonicalFilename !== payloadFilename) {
    throw new Error('F1.24 payload must use its canonical location.');
  }
  current.payload = assertFineTuningPrivateAnswerQualityCasePayloadRecord(
    payload.value,
  );
  current.payloadDecision =
    assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(
      decision.value,
    );
  current.states.payload = payload;
  current.states.payloadDecision = decision;
  if (current.payloadDecision.decisionRecord.decision !== 'approve') {
    throw new Error('F1.24 requires an approved F1.19 payload decision.');
  }
  assertCanonicalPrivateAnswerQualityPayloadEntry({
    current,
    decision: current.payloadDecision,
    payload: current.payload,
    repoDir,
  });
  current.trackedAssessment = readTrackedAssessment();
  assertFineTuningDataSufficiencyAssessment(current.trackedAssessment.value);
  return current;
}

function readTrackedAssessment() {
  const root = path.join(repoDir, 'evidence', 'output-artifacts');
  const filename = path.join(root, 'fine-tuning-data-sufficiency.json');
  return readPrivateJsonState(
    filename,
    'F1.24 tracked sufficiency assessment',
    { allowedRoot: root, expectedMode: 0o644, repoDir },
  );
}

function readBaselineFixtures() {
  const root = path.join(repoDir, 'fixtures');
  const readFixture = (relativePath) => readPrivateJsonState(
    path.join(
      repoDir,
      relativePath.startsWith('fixtures/')
        ? relativePath
        : path.join('fixtures', relativePath),
    ),
    'F1.24 baseline fixture',
    { allowedRoot: root, expectedMode: 0o644, repoDir },
  );
  const readiness = readFixture('fine-tuning-readiness-cases-v1.json');
  const dataset = readFixture(readiness.value.datasetFixture);
  const answerQuality = readFixture(readiness.value.answerQualityFixture);
  const states = { answerQuality, dataset, readiness };
  const values = Object.fromEntries(
    Object.values(states).map((state) => [
      path.relative(repoDir, state.canonicalFilename),
      state.value,
    ]),
  );
  return { states, values };
}

function assertSameAnswer(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `F1.24 answer ${key}`,
    );
  }
  assertSamePrivateJsonState(
    left.trackedAssessment,
    right.trackedAssessment,
    'F1.24 tracked assessment',
  );
}

function assertSameFixtures(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `F1.24 baseline fixture ${key}`,
    );
  }
}

function assertWindow(current) {
  const now = Date.now();
  if (
    now >= Date.parse(current.item.expiresAt) ||
    now >= Date.parse(current.item.retention.deleteBy) ||
    now >= Date.parse(current.requestInput.expiresAt)
  ) {
    throw new Error(
      'F1.24 private combined readiness impact item is expired.',
    );
  }
}

function parseArguments(args) {
  const recordFields = [
    'workspace',
    'admission',
    'item',
    'intake-resolution',
    'private-collection-plan',
    'execution-request',
    'execution-resolution',
    'artifact-preparation-resolution',
    'source-bundle',
  ];
  const answerFields = [
    'workspace',
    'admission',
    'item',
    'candidate',
    'candidate-review-resolution',
    'case',
    'payload',
    'request',
  ];
  const fields = [
    ...recordFields.map((field) => [`record-${field}`, field]),
    ...answerFields.map((field) => [`answer-${field}`, field]),
  ];
  const invalid =
    args.length !== fields.length * 2 ||
    fields.some(
      ([flag], index) =>
        args[index * 2] !== `--${flag}` ||
        !String(args[index * 2 + 1] || '').trim(),
    );
  if (invalid) {
    throw new Error('Expected exact private F1.24 input filenames.');
  }
  const result = { record: {}, answer: {} };
  for (const [index, [flag, field]] of fields.entries()) {
    const group = flag.startsWith('record-') ? result.record : result.answer;
    const aliases = {
      'artifact-preparation-resolution': 'artifactPreparationResolution',
      'candidate-review-resolution': 'candidateReviewResolution',
      'execution-request': 'executionRequest',
      'execution-resolution': 'executionResolution',
      'intake-resolution': 'intakeResolution',
      'private-collection-plan': 'privateCollectionPlan',
      'source-bundle': 'sourceBundle',
      case: 'answerQualityCase',
    };
    const key = aliases[field] || field;
    group[key] = args[index * 2 + 1];
  }
  return result;
}
