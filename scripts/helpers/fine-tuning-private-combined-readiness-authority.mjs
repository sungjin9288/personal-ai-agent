import fs from 'node:fs';
import path from 'node:path';

import {
  buildDeterministicFineTuningBaselineContext,
} from '../local-training-permission-fixture.mjs';
import {
  assertFineTuningPrivateAnswerQualityCaseRecord,
} from '../../src/core/fine-tuning-private-answer-quality-case.mjs';
import {
  assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord,
  assertFineTuningPrivateAnswerQualityCasePayloadRecord,
} from '../../src/core/fine-tuning-private-answer-quality-case-payload.mjs';
import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord,
} from '../../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import {
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord,
} from '../../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import {
  assertFineTuningPrivateCollectionItemAdmissionRecord,
} from '../../src/core/fine-tuning-private-collection-item-admission.mjs';
import {
  assertFineTuningPrivateCollectionItemRecord,
} from '../../src/core/fine-tuning-private-collection-item.mjs';
import {
  assertFineTuningPrivateCollectionWorkspaceRecord,
} from '../../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  assertFineTuningDataSufficiencyAssessment,
} from '../../src/core/fine-tuning-data-sufficiency.mjs';
import {
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertCanonicalPrivateAnswerQualityCaseChain,
  assertCanonicalPrivateAnswerQualityPayloadEntry,
} from './fine-tuning-private-answer-quality-case-history.mjs';
import {
  assertSameFineTuningPrivateAnswerQualityReplayHistory,
  readFineTuningPrivateAnswerQualityReplayHistory,
  selectFineTuningPrivateAnswerQualityReplayHistory,
} from './fine-tuning-private-answer-quality-replay-history.mjs';
import {
  assertFineTuningPrivateAnswerQualityReviewInputs,
  assertFineTuningPrivateAnswerQualityReviewState,
} from './fine-tuning-private-answer-quality-review-guard.mjs';
import {
  assertSameFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleAuthority,
  loadFineTuningPrivateReviewedExampleSource,
} from './fine-tuning-private-reviewed-example-authority.mjs';
import {
  assertSameFineTuningPrivateReviewedExampleHistory,
  readFineTuningPrivateReviewedExampleHistory,
  selectFineTuningPrivateReviewedExampleHistory,
} from './fine-tuning-private-reviewed-example-history.mjs';
import {
  assertSamePrivateJsonState,
  readPrivateJsonState,
} from './private-json-state.mjs';

export function parseFineTuningPrivateCombinedReadinessArguments(
  args,
  { label },
) {
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
    throw new Error(`Expected exact private ${label} input filenames.`);
  }

  const result = { record: {}, answer: {} };
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
  for (const [index, [flag, field]] of fields.entries()) {
    const group = flag.startsWith('record-') ? result.record : result.answer;
    group[aliases[field] || field] = args[index * 2 + 1];
  }
  return result;
}

export function withFineTuningPrivateCombinedReadinessAuthority({
  filenames,
  label,
  lockLabel,
  project,
  repoDir = fs.realpathSync(process.cwd()),
}) {
  const initialRecord = loadFineTuningPrivateReviewedExampleAuthority({
    filenames: filenames.record,
    label: `${label} record`,
    repoDir,
  });
  const initialRecordCurrent = loadFineTuningPrivateReviewedExampleSource({
    authority: initialRecord,
    filename: filenames.record.sourceBundle,
    label: `${label} record`,
    repoDir,
  });
  const initialAnswer = loadAnswer(filenames.answer, { label, repoDir });
  const initialFixtures = readBaselineFixtures({ label, repoDir });
  const initialReplayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
    label: `${label} replay history`,
    repoDir,
  });
  const initialRecordHistory = readFineTuningPrivateReviewedExampleHistory({
    label: `${label} canonical record history`,
    repoDir,
  });
  const locks = [];

  try {
    const workspaceHashes = new Set([
      initialRecord.workspace.workspaceHash,
      initialAnswer.workspace.workspaceHash,
    ]);
    for (const workspaceHash of [...workspaceHashes].sort()) {
      locks.push(acquireFineTuningPrivateCollectionWorkspaceLock({
        repoDir,
        workspaceHash,
        errorPrefix: lockLabel,
      }));
    }

    const recordAuthority = loadFineTuningPrivateReviewedExampleAuthority({
      filenames: filenames.record,
      label: `${label} record`,
      repoDir,
    });
    const answer = loadAnswer(filenames.answer, { label, repoDir });
    const fixtures = readBaselineFixtures({ label, repoDir });
    assertSameFineTuningPrivateReviewedExampleAuthority(
      initialRecord,
      recordAuthority,
      { compareTrackedFileIdentity: true, label: `${label} record` },
    );
    assertSameAnswer(initialAnswer, answer, { label });
    assertSameFixtures(initialFixtures, fixtures, { label });
    assertWindow(answer, { label });

    const recordCurrent = loadFineTuningPrivateReviewedExampleSource({
      authority: recordAuthority,
      filename: filenames.record.sourceBundle,
      label: `${label} record`,
      repoDir,
    });
    assertSamePrivateJsonState(
      initialRecordCurrent.states.sourceBundle,
      recordCurrent.states.sourceBundle,
      `${label} record source bundle`,
    );
    const recordHistory = readFineTuningPrivateReviewedExampleHistory({
      label: `${label} canonical record history`,
      repoDir,
    });
    assertSameFineTuningPrivateReviewedExampleHistory(
      initialRecordHistory,
      recordHistory,
      `${label} canonical record history`,
    );
    const record = selectFineTuningPrivateReviewedExampleHistory(
      recordHistory,
      recordCurrent,
      { label: `${label} canonical record history` },
    );
    const replayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
      label: `${label} replay history`,
      repoDir,
    });
    assertSameFineTuningPrivateAnswerQualityReplayHistory(
      initialReplayHistory,
      replayHistory,
      `${label} replay history`,
    );
    const replay = selectFineTuningPrivateAnswerQualityReplayHistory(
      replayHistory,
      answer,
      { label: `${label} replay history` },
    );
    const baselineContext = buildDeterministicFineTuningBaselineContext({
      fixtureValues: fixtures.values,
      repoDir,
    });
    if (
      JSON.stringify(answer.trackedAssessment.value) !==
      JSON.stringify(baselineContext.sufficiencyAssessment)
    ) {
      throw new Error(`${label} tracked sufficiency baseline drifted.`);
    }

    const result = project({
      answerQualityCase: answer.answerQualityCase,
      baselineContext,
      item: answer.item,
      payload: answer.payload,
      record: record.record.value,
      recordReceipt: record.receipt.value,
      replayReceipt: replay.receipt.value,
      replayRequest: replay.request.value,
      trackedAssessment: baselineContext.sufficiencyAssessment,
      trackedCollectionPlan: recordAuthority.tracked.collectionPlan.value,
      workspace: answer.workspace,
    });

    assertFinalAuthority({
      answer,
      filenames,
      initialAnswer,
      initialFixtures,
      initialRecord,
      initialRecordCurrent,
      initialRecordHistory,
      initialReplayHistory,
      record,
      recordCurrent,
      replay,
      label,
      repoDir,
    });
    return result;
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
}

function assertFinalAuthority({
  answer,
  filenames,
  initialAnswer,
  initialFixtures,
  initialRecord,
  initialRecordCurrent,
  initialRecordHistory,
  initialReplayHistory,
  record,
  recordCurrent,
  replay,
  label,
  repoDir,
}) {
  const finalRecordAuthority = loadFineTuningPrivateReviewedExampleAuthority({
    filenames: filenames.record,
    label: `${label} record`,
    repoDir,
  });
  const finalAnswer = loadAnswer(filenames.answer, { label, repoDir });
  const finalFixtures = readBaselineFixtures({ label, repoDir });
  assertSameFineTuningPrivateReviewedExampleAuthority(
    initialRecord,
    finalRecordAuthority,
    { compareTrackedFileIdentity: true, label: `${label} record` },
  );
  assertSameAnswer(initialAnswer, finalAnswer, { label });
  assertSameFixtures(initialFixtures, finalFixtures, { label });
  assertWindow(finalAnswer, { label });
  const finalRecordCurrent = loadFineTuningPrivateReviewedExampleSource({
    authority: finalRecordAuthority,
    filename: filenames.record.sourceBundle,
    label: `${label} record`,
    repoDir,
  });
  const finalRecordHistory = readFineTuningPrivateReviewedExampleHistory({
    label: `${label} canonical record history`,
    repoDir,
  });
  assertSameFineTuningPrivateReviewedExampleHistory(
    initialRecordHistory,
    finalRecordHistory,
    `${label} canonical record history`,
  );
  const finalRecord = selectFineTuningPrivateReviewedExampleHistory(
    finalRecordHistory,
    finalRecordCurrent,
    { label: `${label} canonical record history` },
  );
  const finalReplayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
    label: `${label} replay history`,
    repoDir,
  });
  assertSameFineTuningPrivateAnswerQualityReplayHistory(
    initialReplayHistory,
    finalReplayHistory,
    `${label} replay history`,
  );
  const finalReplay = selectFineTuningPrivateAnswerQualityReplayHistory(
    finalReplayHistory,
    finalAnswer,
    { label: `${label} replay history` },
  );
  for (const [name, before, after] of [
    [
      'record source bundle',
      initialRecordCurrent.states.sourceBundle,
      finalRecordCurrent.states.sourceBundle,
    ],
    ['record', record.record, finalRecord.record],
    ['record receipt', record.receipt, finalRecord.receipt],
    ['replay request', replay.request, finalReplay.request],
    ['replay receipt', replay.receipt, finalReplay.receipt],
  ]) {
    assertSamePrivateJsonState(before, after, `${label} ${name}`);
  }
}

function loadAnswer(names, { label, repoDir }) {
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
    states[key] = readPrivateJsonState(filename, `${label} answer ${key}`, { repoDir });
  }
  const current = Object.fromEntries(
    Object.entries(states).map(([key, state]) => [key, state.value]),
  );
  current.states = states;
  assertFineTuningPrivateCollectionWorkspaceRecord(current.workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(current.admission);
  assertFineTuningPrivateCollectionItemRecord(current.item);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(current.candidate);
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
  const payload = readPrivateJsonState(names.payload, `${label} answer payload`, { repoDir });
  const decision = readPrivateJsonState(
    decisionFilename,
    `${label} answer payload decision`,
    { repoDir },
  );
  if (payload.canonicalFilename !== payloadFilename) {
    throw new Error(`${label} payload must use its canonical location.`);
  }
  current.payload = assertFineTuningPrivateAnswerQualityCasePayloadRecord(payload.value);
  current.payloadDecision =
    assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(decision.value);
  current.states.payload = payload;
  current.states.payloadDecision = decision;
  if (current.payloadDecision.decisionRecord.decision !== 'approve') {
    throw new Error(`${label} requires an approved F1.19 payload decision.`);
  }
  assertCanonicalPrivateAnswerQualityPayloadEntry({
    current,
    decision: current.payloadDecision,
    payload: current.payload,
    repoDir,
  });
  current.trackedAssessment = readTrackedAssessment({ label, repoDir });
  assertFineTuningDataSufficiencyAssessment(current.trackedAssessment.value);
  return current;
}

function readTrackedAssessment({ label, repoDir }) {
  const root = path.join(repoDir, 'evidence', 'output-artifacts');
  return readPrivateJsonState(
    path.join(root, 'fine-tuning-data-sufficiency.json'),
    `${label} tracked sufficiency assessment`,
    { allowedRoot: root, expectedMode: 0o644, repoDir },
  );
}

function readBaselineFixtures({ label, repoDir }) {
  const root = path.join(repoDir, 'fixtures');
  const readFixture = (relativePath) => readPrivateJsonState(
    path.join(
      repoDir,
      relativePath.startsWith('fixtures/')
        ? relativePath
        : path.join('fixtures', relativePath),
    ),
    `${label} baseline fixture`,
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

function assertSameAnswer(left, right, { label }) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `${label} answer ${key}`,
    );
  }
  assertSamePrivateJsonState(
    left.trackedAssessment,
    right.trackedAssessment,
    `${label} tracked assessment`,
  );
}

function assertSameFixtures(left, right, { label }) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `${label} baseline fixture ${key}`,
    );
  }
}

function assertWindow(current, { label }) {
  const now = Date.now();
  if (
    now >= Date.parse(current.item.expiresAt) ||
    now >= Date.parse(current.item.retention.deleteBy) ||
    now >= Date.parse(current.requestInput.expiresAt)
  ) {
    throw new Error(`${label} private combined readiness impact item is expired.`);
  }
}
