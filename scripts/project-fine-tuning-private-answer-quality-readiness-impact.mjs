import fs from 'node:fs';
import path from 'node:path';

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
  buildFineTuningPrivateAnswerQualityReadinessImpactShadow,
} from '../src/core/fine-tuning-private-answer-quality-readiness-impact.mjs';
import { buildDeterministicFineTuningBaselineContext } from './local-training-permission-fixture.mjs';
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
  acquireFineTuningPrivateCollectionWorkspaceLock,
} from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertCanonicalPrivateJsonState,
  assertSamePrivateJsonState,
  readPrivateJsonState,
} from './helpers/private-json-state.mjs';

const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initial = loadCommon(filenames);
const initialBaselineFixtures = readBaselineFixtures();
const initialReplayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
  label: 'F1.23 replay history',
  repoDir,
});
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'F1.23 answer-quality readiness impact shadow lock',
});

try {
  const current = loadCommon(filenames);
  const currentBaselineFixtures = readBaselineFixtures();
  assertSameCommon(initial, current);
  assertSameBaselineFixtures(initialBaselineFixtures, currentBaselineFixtures);
  assertWindow(current);
  const currentReplayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
    label: 'F1.23 replay history',
    repoDir,
  });
  assertSameFineTuningPrivateAnswerQualityReplayHistory(
    initialReplayHistory,
    currentReplayHistory,
    'F1.23 replay history',
  );
  const replay = selectFineTuningPrivateAnswerQualityReplayHistory(
    currentReplayHistory,
    current,
    { label: 'F1.23 replay history' },
  );
  const baselineContext = buildDeterministicFineTuningBaselineContext({
    fixtureValues: currentBaselineFixtures.values,
    repoDir,
  });
  if (
    JSON.stringify(current.trackedAssessment.value) !==
    JSON.stringify(baselineContext.sufficiencyAssessment)
  ) {
    throw new Error('F1.23 tracked sufficiency baseline drifted.');
  }
  const projection = buildFineTuningPrivateAnswerQualityReadinessImpactShadow({
    answerQualityCase: current.answerQualityCase,
    baselineContext,
    item: current.item,
    payload: current.payload,
    receipt: replay.receipt.value,
    request: replay.request.value,
    trackedAssessment: baselineContext.sufficiencyAssessment,
    workspace: current.workspace,
  });
  const final = loadCommon(filenames);
  const finalBaselineFixtures = readBaselineFixtures();
  assertSameCommon(initial, final);
  assertSameBaselineFixtures(initialBaselineFixtures, finalBaselineFixtures);
  assertWindow(final);
  const finalReplayHistory = readFineTuningPrivateAnswerQualityReplayHistory({
    label: 'F1.23 replay history',
    repoDir,
  });
  assertSameFineTuningPrivateAnswerQualityReplayHistory(
    initialReplayHistory,
    finalReplayHistory,
    'F1.23 replay history',
  );
  const finalReplay = selectFineTuningPrivateAnswerQualityReplayHistory(
    finalReplayHistory,
    final,
    { label: 'F1.23 replay history' },
  );
  assertSamePrivateJsonState(replay.request, finalReplay.request, 'F1.23 final replay request');
  assertSamePrivateJsonState(replay.receipt, finalReplay.receipt, 'F1.23 final replay receipt');
  console.log(JSON.stringify(projection, null, 2));
} finally {
  lock.release();
}

function loadCommon(names) {
  const states = {};
  for (const [key, filename] of Object.entries({
    workspace: names.workspace,
    admission: names.admission,
    item: names.item,
    candidate: names.candidate,
    candidateReviewResolution: names.candidateReviewResolution,
    answerQualityCase: names.answerQualityCase,
    requestInput: names.request,
  })) {
    states[key] = readPrivateJsonState(filename, `F1.23 ${key}`, { repoDir });
  }
  const values = Object.fromEntries(
    Object.entries(states).map(([key, state]) => [key, state.value]),
  );
  assertFineTuningPrivateCollectionWorkspaceRecord(values.workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(values.admission);
  assertFineTuningPrivateCollectionItemRecord(values.item);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(values.candidate);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
    values.candidateReviewResolution,
  );
  assertFineTuningPrivateAnswerQualityCaseRecord(values.answerQualityCase);

  const current = { ...values, states };
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

  const payloadFilename = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-answer-quality-case-payloads',
    values.workspace.workspaceHash,
    values.item.itemHash,
    'payload.json',
  );
  const decisionFilename = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-answer-quality-case-payloads',
    values.workspace.workspaceHash,
    values.item.itemHash,
    'decision.json',
  );
  const payloadState = readPrivateJsonState(names.payload, 'F1.23 payload', { repoDir });
  assertCanonicalPrivateJsonState(payloadState, payloadFilename, 'F1.23 payload');
  const decisionState = readPrivateJsonState(decisionFilename, 'F1.23 payload decision', { repoDir });
  current.payload = assertFineTuningPrivateAnswerQualityCasePayloadRecord(payloadState.value);
  current.payloadDecision = assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(
    decisionState.value,
  );
  current.states.payload = payloadState;
  current.states.payloadDecision = decisionState;
  if (current.payloadDecision.decisionRecord.decision !== 'approve') {
    throw new Error('F1.23 requires an approved F1.19 payload decision.');
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

function assertSameCommon(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(left.states[key], right.states[key], `F1.23 ${key}`);
  }
  assertSameTrackedAssessment(left.trackedAssessment, right.trackedAssessment);
}

function readTrackedAssessment() {
  const filename = path.join(
    repoDir,
    'evidence',
    'output-artifacts',
    'fine-tuning-data-sufficiency.json',
  );
  try {
    const state = readPrivateJsonState(
      filename,
      'F1.23 tracked sufficiency assessment',
      {
        allowedRoot: path.join(repoDir, 'evidence', 'output-artifacts'),
        expectedMode: 0o644,
        repoDir,
      },
    );
    assertCanonicalPrivateJsonState(
      state,
      filename,
      'F1.23 tracked sufficiency assessment',
    );
    return state;
  } catch {
    throw new Error('F1.23 tracked sufficiency assessment is invalid.');
  }
}

function readBaselineFixtures() {
  const root = path.join(repoDir, 'fixtures');
  const readiness = readFixtureState('fine-tuning-readiness-cases-v1.json', root);
  const dataset = readFixtureState(readiness.value.datasetFixture, root);
  const answerQuality = readFixtureState(readiness.value.answerQualityFixture, root);
  const states = { answerQuality, dataset, readiness };
  return {
    states,
    values: Object.fromEntries(
      Object.values(states).map((state) => [
        path.relative(repoDir, state.canonicalFilename),
        state.value,
      ]),
    ),
  };
}

function readFixtureState(relativePath, root) {
  return readPrivateJsonState(
    path.join(
      repoDir,
      relativePath.startsWith('fixtures/')
        ? relativePath
        : path.join('fixtures', relativePath),
    ),
    'F1.23 baseline fixture',
    { allowedRoot: root, expectedMode: 0o644, repoDir },
  );
}

function assertSameBaselineFixtures(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `F1.23 baseline fixture ${key}`,
    );
  }
}

function assertSameTrackedAssessment(left, right) {
  assertSamePrivateJsonState(
    left,
    right,
    'F1.23 tracked sufficiency assessment',
  );
}

function assertWindow(current) {
  const now = Date.now();
  if (
    now >= Date.parse(current.item.expiresAt) ||
    now >= Date.parse(current.item.retention.deleteBy) ||
    now >= Date.parse(current.requestInput.expiresAt)
  ) {
    throw new Error('F1.23 private answer-quality readiness impact item is expired.');
  }
}

function parseArguments(args) {
  const fields = [
    'workspace',
    'admission',
    'item',
    'candidate',
    'candidate-review-resolution',
    'case',
    'payload',
    'request',
  ];
  if (
    args.length !== fields.length * 2 ||
    fields.some(
      (field, index) =>
        args[index * 2] !== `--${field}` || !String(args[index * 2 + 1] || '').trim(),
    )
  ) {
    throw new Error('Expected exact private F1.23 input filenames.');
  }
  return Object.fromEntries(
    fields.map((field, index) => [
      field === 'candidate-review-resolution'
        ? 'candidateReviewResolution'
        : field === 'case'
          ? 'answerQualityCase'
          : field,
      args[index * 2 + 1],
    ]),
  );
}
