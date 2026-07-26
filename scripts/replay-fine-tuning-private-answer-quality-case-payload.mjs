import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateAnswerQualityCaseReplay,
  assertFineTuningPrivateAnswerQualityCaseReplayRelation,
  assertFineTuningPrivateAnswerQualityCaseReplayRequest,
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord,
  assertFineTuningPrivateAnswerQualityCaseReplayRecord,
  buildFineTuningPrivateAnswerQualityCaseReplay,
  buildFineTuningPrivateAnswerQualityCaseReplayRequest,
} from '../src/core/fine-tuning-private-answer-quality-case-replay.mjs';
import { assertFineTuningPrivateAnswerQualityCaseRecord } from '../src/core/fine-tuning-private-answer-quality-case.mjs';
import {
  assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord,
  assertFineTuningPrivateAnswerQualityCasePayloadRecord,
} from '../src/core/fine-tuning-private-answer-quality-case-payload.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord } from '../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from '../src/core/fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionItemRecord } from '../src/core/fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from '../src/core/fine-tuning-private-collection-workspace.mjs';
import {
  assertCanonicalPrivateAnswerQualityCaseChain,
  assertCanonicalPrivateAnswerQualityPayloadEntry,
} from './helpers/fine-tuning-private-answer-quality-case-history.mjs';
import {
  assertFineTuningPrivateAnswerQualityReviewInputs,
  assertFineTuningPrivateAnswerQualityReviewState,
} from './helpers/fine-tuning-private-answer-quality-review-guard.mjs';
import { acquireFineTuningPrivateCollectionWorkspaceLock } from './helpers/fine-tuning-private-collection-workspace-lock.mjs';
import {
  assertCanonicalPrivateJsonState,
  assertSamePrivateJsonState,
  ensurePrivateDirectoryChain,
  fsyncPrivateDirectory,
  makePrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
  writeExclusivePrivateJson,
} from './helpers/private-json-state.mjs';

const HISTORY_NAME = 'private-answer-quality-case-replays';
const PENDING_PREFIX = '.fine-tuning-private-answer-quality-case-replay-pending-';
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initial = loadCommon(filenames);
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Fine-tuning private answer quality case replay lock',
});

try {
  const result = replay(initial);
  const final = loadCommon(filenames);
  assertSameCommon(initial, final);
  assertWindow(final);
  console.log(JSON.stringify({
    status: result.status,
    q1ContractSatisfied: true,
    actualModelEvaluated: false,
    trainingAuthorized: false,
    externalProviderCalls: 'none',
    productionReadyClaim: false,
  }, null, 2));
} finally {
  lock.release();
}

function replay(initialInputs) {
  const current = loadCommon(filenames);
  assertSameCommon(initialInputs, current);
  assertWindow(current);
  const request = buildRequest(current);
  const root = historyRoot(current.workspace.workspaceHash);
  const finalDirectory = path.join(root, current.item.itemHash);
  const pendingDirectory = path.join(root, `${PENDING_PREFIX}${current.item.itemHash}-${request.replayRequestHash}`);
  let history = inspectHistory({ current, pendingDirectory, request, root });

  if (history.final) {
    return replayFinal({ current, entry: history.final, request });
  }
  if (history.emptyPending) {
    fs.rmdirSync(history.emptyPending);
    fsyncPrivateDirectory(root, 'F1.20 replay history', { repoDir });
    history = { ...history, emptyPending: null };
  }
  if (!history.request) {
    makePrivateDirectory(pendingDirectory, 'F1.20 pending replay', { repoDir });
    writeExclusivePrivateJson(path.join(pendingDirectory, 'request.json'), request, 'F1.20 pending replay request', { repoDir });
    fsyncPrivateDirectory(pendingDirectory, 'F1.20 pending replay', { repoDir });
    history = { ...history, request };
  }

  const receipt = history.receipt || buildReceipt(current, request);
  if (!history.receipt) {
    writeExclusivePrivateJson(path.join(pendingDirectory, 'receipt.json'), receipt, 'F1.20 pending replay receipt', { repoDir });
    fsyncPrivateDirectory(pendingDirectory, 'F1.20 pending replay', { repoDir });
  }
  const seal = assertReady({ initialInputs, pendingDirectory, receipt, request });
  publish({ finalDirectory, pendingDirectory, root, seal });
  return replayFinal({
    current,
    entry: { directory: finalDirectory, receipt, request },
    request,
  });
}

function replayFinal({ current, entry, request }) {
  const storedRequest = readPrivateJsonState(path.join(entry.directory, 'request.json'), 'F1.20 final replay request', { repoDir }).value;
  const receipt = readPrivateJsonState(path.join(entry.directory, 'receipt.json'), 'F1.20 final replay receipt', { repoDir }).value;
  assertFineTuningPrivateAnswerQualityCaseReplayRequest(storedRequest, {
    answerQualityCase: current.answerQualityCase, item: current.item, payload: current.payload,
    request: current.requestInput, workspace: current.workspace,
  });
  if (JSON.stringify(storedRequest) !== JSON.stringify(request)) {
    throw new Error('F1.20 final replay request conflicts with current request.');
  }
  assertFineTuningPrivateAnswerQualityCaseReplay(receipt, {
    answerQualityCase: current.answerQualityCase, item: current.item, payload: current.payload,
    request: storedRequest, workspace: current.workspace,
  });
  assertWindow(current);
  return receipt;
}

function buildRequest(current) {
  return buildFineTuningPrivateAnswerQualityCaseReplayRequest({
    answerQualityCase: current.answerQualityCase,
    item: current.item,
    payload: current.payload,
    request: current.requestInput,
    workspace: current.workspace,
  });
}

function buildReceipt(current, request) {
  const completedAt = new Date(
    Math.max(Date.now(), Date.parse(request.requestRecord.requestedAt) + 1),
  ).toISOString();
  return buildFineTuningPrivateAnswerQualityCaseReplay({
    answerQualityCase: current.answerQualityCase,
    item: current.item,
    payload: current.payload,
    replayCompletedAt: completedAt,
    request,
    workspace: current.workspace,
  });
}

function assertReady({ initialInputs, pendingDirectory, receipt, request }) {
  const current = loadCommon(filenames);
  assertSameCommon(initialInputs, current);
  assertWindow(current);
  const currentRequest = buildRequest(current);
  if (JSON.stringify(currentRequest) !== JSON.stringify(request)) {
    throw new Error('F1.20 replay request changed before publish.');
  }
  const states = {
    receipt: readPrivateJsonState(path.join(pendingDirectory, 'receipt.json'), 'F1.20 sealed replay receipt', { repoDir }),
    request: readPrivateJsonState(path.join(pendingDirectory, 'request.json'), 'F1.20 sealed replay request', { repoDir }),
  };
  if (
    JSON.stringify(states.request.value) !== JSON.stringify(request) ||
    JSON.stringify(states.receipt.value) !== JSON.stringify(receipt)
  ) {
    throw new Error('F1.20 pending replay changed before publish.');
  }
  assertFineTuningPrivateAnswerQualityCaseReplay(receipt, {
    answerQualityCase: current.answerQualityCase, item: current.item, payload: current.payload,
    request, workspace: current.workspace,
  });
  return { common: current, directory: fs.lstatSync(pendingDirectory), states };
}

function publish({ finalDirectory, pendingDirectory, root, seal }) {
  if (fs.lstatSync(finalDirectory, { throwIfNoEntry: false })) {
    throw new Error('F1.20 final replay history already exists.');
  }
  assertPublicationSeal(seal, pendingDirectory);
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncPrivateDirectory(root, 'F1.20 replay history', { repoDir });
  if (!sameNames(readPrivateDirectory(finalDirectory, 'F1.20 final replay history', { repoDir }), ['receipt.json', 'request.json'])) {
    throw new Error('F1.20 final replay history is incomplete.');
  }
  for (const [role, state] of Object.entries(seal.states)) {
    const moved = readPrivateJsonState(path.join(finalDirectory, `${role}.json`), `F1.20 published replay ${role}`, { repoDir });
    if (moved.initialFile.dev !== state.initialFile.dev || moved.initialFile.ino !== state.initialFile.ino || !moved.bytes.equals(state.bytes)) {
      throw new Error('F1.20 published replay history changed.');
    }
  }
  assertSameCommon(seal.common, loadCommon(filenames));
  assertWindow(seal.common);
}

function assertPublicationSeal(seal, pendingDirectory) {
  const directory = fs.lstatSync(pendingDirectory);
  if (directory.dev !== seal.directory.dev || directory.ino !== seal.directory.ino || (directory.mode & 0o777) !== 0o700) {
    throw new Error('F1.20 pending replay directory changed before publish.');
  }
  for (const [role, state] of Object.entries(seal.states)) {
    assertSamePrivateJsonState(state, readPrivateJsonState(path.join(pendingDirectory, `${role}.json`), `F1.20 sealed replay ${role}`, { repoDir }), `F1.20 pending replay ${role}`);
  }
}

function loadCommon(names) {
  const states = {};
  for (const [key, filename] of Object.entries({
    workspace: names.workspace, admission: names.admission, item: names.item, candidate: names.candidate,
    candidateReviewResolution: names.candidateReviewResolution, answerQualityCase: names.answerQualityCase,
    requestInput: names.request,
  })) {
    states[key] = readPrivateJsonState(filename, `F1.20 ${key}`, { repoDir });
  }
  const values = Object.fromEntries(Object.entries(states).map(([key, state]) => [key, state.value]));
  assertFineTuningPrivateCollectionWorkspaceRecord(values.workspace);
  assertFineTuningPrivateCollectionItemAdmissionRecord(values.admission);
  assertFineTuningPrivateCollectionItemRecord(values.item);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(values.candidate);
  assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(values.candidateReviewResolution);
  assertFineTuningPrivateAnswerQualityCaseRecord(values.answerQualityCase);
  const current = { ...values, states };
  assertCurrentState(current);
  const payloadFilename = path.join(repoDir, 'var', 'fine-tuning', 'private-answer-quality-case-payloads', values.workspace.workspaceHash, values.item.itemHash, 'payload.json');
  const decisionFilename = path.join(repoDir, 'var', 'fine-tuning', 'private-answer-quality-case-payloads', values.workspace.workspaceHash, values.item.itemHash, 'decision.json');
  const payloadState = readPrivateJsonState(names.payload, 'F1.20 payload', { repoDir });
  assertCanonicalPrivateJsonState(payloadState, payloadFilename, 'F1.20 payload');
  const decisionState = readPrivateJsonState(decisionFilename, 'F1.20 payload decision', { repoDir });
  current.payload = assertFineTuningPrivateAnswerQualityCasePayloadRecord(payloadState.value);
  current.payloadDecision = assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(decisionState.value);
  current.states.payload = payloadState;
  current.states.payloadDecision = decisionState;
  if (current.payloadDecision.decisionRecord.decision !== 'approve') {
    throw new Error('F1.20 replay requires an approved F1.19 payload decision.');
  }
  assertCanonicalPrivateAnswerQualityPayloadEntry({ current, decision: current.payloadDecision, payload: current.payload, repoDir });
  assertNoForeignReplayHistory(current);
  buildRequest(current);
  return current;
}

function assertNoForeignReplayHistory(current) {
  const root = path.join(repoDir, 'var', 'fine-tuning', HISTORY_NAME);
  if (!fs.lstatSync(root, { throwIfNoEntry: false })) return;
  for (const workspaceHash of readPrivateDirectory(root, 'F1.20 replay workspaces', { repoDir })) {
    if (!/^[a-f0-9]{64}$/u.test(workspaceHash)) {
      throw new Error('F1.20 replay workspace history is invalid.');
    }
    const workspaceRoot = path.join(root, workspaceHash);
    if (workspaceHash === current.workspace.workspaceHash) continue;
    for (const name of readPrivateDirectory(workspaceRoot, 'F1.20 replay workspace history', { repoDir })) {
      const pending = name.match(/^\.fine-tuning-private-answer-quality-case-replay-pending-([a-f0-9]{64})-([a-f0-9]{64})$/u);
      const final = /^[a-f0-9]{64}$/u.test(name);
      if (!pending && !final) throw new Error('F1.20 replay workspace history is invalid.');
      const directory = path.join(workspaceRoot, name);
      const names = readPrivateDirectory(directory, 'F1.20 foreign replay history entry', { repoDir });
      const validNames = sameNames(names, ['receipt.json', 'request.json']) ||
        (pending && sameNames(names, ['request.json']));
      if (!validNames) {
        throw new Error('F1.20 foreign replay history is invalid.');
      }
      const request = assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(readPrivateJsonState(path.join(directory, 'request.json'), 'F1.20 foreign replay request', { repoDir }).value);
      const receipt = names.includes('receipt.json')
        ? assertFineTuningPrivateAnswerQualityCaseReplayRecord(readPrivateJsonState(path.join(directory, 'receipt.json'), 'F1.20 foreign replay receipt', { repoDir }).value)
        : null;
      const expectedName = final
        ? request.item.itemHash
        : `${PENDING_PREFIX}${request.item.itemHash}-${request.replayRequestHash}`;
      if (name !== expectedName || request.workspace.workspaceHash !== workspaceHash) {
        throw new Error('F1.20 foreign replay history lineage is invalid.');
      }
      if (receipt) assertFineTuningPrivateAnswerQualityCaseReplayRelation({ receipt, request });
      if (workspaceHash !== current.workspace.workspaceHash && request.item.itemHash === current.item.itemHash) {
        throw new Error('F1.20 replay history contains a foreign workspace copy.');
      }
    }
  }
}

function assertCurrentState(current) {
  assertFineTuningPrivateAnswerQualityReviewInputs({
    repoDir, states: current.states,
    values: { ...current, decision: current.candidateReviewResolution },
  });
  assertFineTuningPrivateAnswerQualityReviewState({
    current: { ...current, decision: current.candidateReviewResolution }, repoDir,
  });
  assertCanonicalPrivateAnswerQualityCaseChain({ current, repoDir });
}

function inspectHistory({ current, pendingDirectory, request, root }) {
  let emptyPending = null;
  let final = null;
  let pending = null;
  for (const name of readPrivateDirectory(root, 'F1.20 replay history', { repoDir })) {
    const directory = path.join(root, name);
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = new RegExp(`^\\${PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`, 'u').test(name);
    if (!isFinal && !isPending) throw new Error('F1.20 replay history is invalid.');
    const names = readPrivateDirectory(directory, 'F1.20 replay history entry', { repoDir });
    if (names.length === 0 && directory === pendingDirectory && isPending) { emptyPending = directory; continue; }
    const validNames = sameNames(names, ['receipt.json', 'request.json']) ||
      (isPending && sameNames(names, ['request.json']));
    if (!validNames) throw new Error('F1.20 replay history bundle is invalid.');
    const storedRequest = assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(readPrivateJsonState(path.join(directory, 'request.json'), 'F1.20 stored replay request', { repoDir }).value);
    const receipt = names.includes('receipt.json')
      ? assertFineTuningPrivateAnswerQualityCaseReplayRecord(readPrivateJsonState(path.join(directory, 'receipt.json'), 'F1.20 stored replay receipt', { repoDir }).value)
      : null;
    const expectedName = isFinal ? storedRequest.item.itemHash : `${PENDING_PREFIX}${storedRequest.item.itemHash}-${storedRequest.replayRequestHash}`;
    if (name !== expectedName || storedRequest.workspace.workspaceHash !== current.workspace.workspaceHash) {
      throw new Error('F1.20 replay history lineage is invalid.');
    }
    if (receipt) assertFineTuningPrivateAnswerQualityCaseReplayRelation({ receipt, request: storedRequest });
    if (storedRequest.item.itemHash !== current.item.itemHash) continue;
    const entry = { directory, receipt, request: storedRequest };
    if (isFinal) { if (final) throw new Error('F1.20 final replay history is ambiguous.'); final = entry; }
    else { if (pending) throw new Error('F1.20 pending replay history is ambiguous.'); pending = entry; }
  }
  if (final && (pending || emptyPending)) throw new Error('F1.20 final replay conflicts with pending history.');
  if (pending && JSON.stringify(pending.request) !== JSON.stringify(request)) throw new Error('F1.20 current pending replay request conflicts with the request.');
  return { emptyPending, final, receipt: pending?.receipt || null, request: pending?.request || null };
}

function historyRoot(workspaceHash) {
  return ensurePrivateDirectoryChain(path.join(repoDir, 'var', 'fine-tuning', HISTORY_NAME, workspaceHash), 'F1.20 replay history', { repoDir });
}

function assertSameCommon(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(left.states[key], right.states[key], `F1.20 ${key}`);
  }
}

function assertWindow(current) {
  const now = Date.now();
  if (now >= Date.parse(current.item.expiresAt) || now >= Date.parse(current.item.retention.deleteBy) || now >= Date.parse(current.requestInput.expiresAt)) {
    throw new Error('Fine-tuning private answer quality case replay item is expired.');
  }
}

function parseArguments(args) {
  const fields = ['workspace', 'admission', 'item', 'candidate', 'candidate-review-resolution', 'case', 'payload', 'request'];
  if (args.length !== fields.length * 2 || fields.some((field, index) => args[index * 2] !== `--${field}` || !String(args[index * 2 + 1] || '').trim())) {
    throw new Error('Expected exact private F1.20 input filenames.');
  }
  return Object.fromEntries(fields.map((field, index) => [
    field === 'candidate-review-resolution' ? 'candidateReviewResolution' : field === 'case' ? 'answerQualityCase' : field,
    args[index * 2 + 1],
  ]));
}

function sameNames(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}
