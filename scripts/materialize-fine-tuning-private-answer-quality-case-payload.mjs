import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateAnswerQualityCasePayload,
  assertFineTuningPrivateAnswerQualityCasePayloadDecision,
  assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord,
  assertFineTuningPrivateAnswerQualityCasePayloadRecord,
  buildFineTuningPrivateAnswerQualityCasePayload,
  buildFineTuningPrivateAnswerQualityCasePayloadDecision,
} from '../src/core/fine-tuning-private-answer-quality-case-payload.mjs';
import { assertFineTuningPrivateAnswerQualityCaseRecord } from '../src/core/fine-tuning-private-answer-quality-case.mjs';
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
  assertSamePrivateJsonState,
  ensurePrivateDirectoryChain,
  fsyncPrivateDirectory,
  makePrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
  writeExclusivePrivateJson,
} from './helpers/private-json-state.mjs';

const HISTORY_NAME = 'private-answer-quality-case-payloads';
const PENDING_PREFIX =
  '.fine-tuning-private-answer-quality-case-payload-pending-';
const repoDir = fs.realpathSync(process.cwd());
const filenames = parseArguments(process.argv.slice(2));
const initial = loadCommon(filenames, { requireLive: false });
const lock = acquireFineTuningPrivateCollectionWorkspaceLock({
  repoDir,
  workspaceHash: initial.workspace.workspaceHash,
  errorPrefix: 'Fine-tuning private answer quality case payload lock',
});

let result;
try {
  result = materialize(initial);
  const finalInputs = loadCommon(filenames, { requireLive: false });
  assertSameCommon(initial, finalInputs);
  assertWindow(finalInputs);
} catch (error) {
  if (
    result?.cleanupOnExpiry &&
    result.storedRecord &&
    windowExpired(initial.item)
  ) {
    removeExpiredPayload({
      directory: result.payloadDirectory,
      record: result.storedRecord,
    });
  }
  throw error;
} finally {
  lock.release();
}

console.log(
  JSON.stringify(
    {
      status: result.status,
      decision: result.decision,
      payloadStored: result.payloadStored,
      contentCopied: result.contentCopied,
      q1ContractSatisfied: result.q1ContractSatisfied,
      trainingAuthorized: result.trainingAuthorized,
      externalProviderCalls: result.externalProviderCalls,
      productionReadyClaim: result.productionReadyClaim,
    },
    null,
    2,
  ),
);

function materialize(initialInputs) {
  const current = loadCommon(filenames, { requireLive: false });
  assertSameCommon(initialInputs, current);
  assertCurrentState(current);
  const decision = buildDecision(current);
  const root = historyRoot(current.workspace.workspaceHash);
  const finalDirectory = path.join(root, current.item.itemHash);
  const pendingDirectory = path.join(
    root,
    `${PENDING_PREFIX}${current.item.itemHash}-${decision.decisionHash}`,
  );
  let history = inspectHistory({
    current,
    expectedDecision: decision,
    pendingDirectory,
    root,
  });

  if (windowExpired(current.item)) {
    if (history.payload) {
      removeExpiredPayload({
        directory: pendingDirectory,
        record: history.payload,
      });
    }
    assertWindow(current);
  }
  assertWindow(current);

  if (history.final) {
    return replayFinal({ current, decision, entry: history.final });
  }
  if (history.emptyPending) {
    fs.rmdirSync(history.emptyPending);
    fsyncPrivateDirectory(root, 'F1.19 payload history', { repoDir });
    history = { ...history, emptyPending: null };
  }

  if (!history.decision) {
    makePrivateDirectory(pendingDirectory, 'F1.19 pending payload', { repoDir });
    writeExclusivePrivateJson(
      path.join(pendingDirectory, 'decision.json'),
      decision,
      'F1.19 pending payload decision',
      { repoDir },
    );
    fsyncPrivateDirectory(pendingDirectory, 'F1.19 pending payload', { repoDir });
    history = { ...history, decision };
  } else {
    assertDecision(current, history.decision);
  }

  if (decision.decisionRecord.decision === 'reject') {
    publish({
      beforePublish: () =>
        assertReady({
          initialInputs,
          pendingDirectory,
          record: null,
          storedDecision: decision,
        }),
      expectedNames: ['decision.json'],
      finalDirectory,
      pendingDirectory,
      root,
    });
    return rejectedResult();
  }

  const initialEnrichment = loadEnrichmentInput(filenames.enrichmentInput);
  let record = history.payload;
  if (record) {
    assertPayload(current, decision, initialEnrichment.value, record);
  } else {
    record = buildPayload({
      current,
      decision,
      enrichmentInput: initialEnrichment.value,
      storedAt: new Date().toISOString(),
    });
    writeExclusivePrivateJson(
      path.join(pendingDirectory, 'payload.json'),
      record,
      'F1.19 pending payload',
      { repoDir },
    );
    fsyncPrivateDirectory(pendingDirectory, 'F1.19 pending payload', { repoDir });
  }

  try {
    const seal = publish({
      beforePublish: () =>
        assertReady({
          initialEnrichment,
          initialInputs,
          pendingDirectory,
          record,
          storedDecision: decision,
        }),
      expectedNames: ['decision.json', 'payload.json'],
      finalDirectory,
      pendingDirectory,
      root,
    });
    const published = readFinal({
      current,
      decision,
      directory: finalDirectory,
      enrichmentInput: initialEnrichment.value,
    });
    if (JSON.stringify(published.payload) !== JSON.stringify(record)) {
      throw new Error('F1.19 published payload integrity failed.');
    }
    assertPublishedInputs(seal);
    return approvedResult(published.payload, finalDirectory, {
      cleanupOnExpiry: true,
    });
  } catch (error) {
    if (windowExpired(current.item)) {
      const directory = fs.lstatSync(finalDirectory, { throwIfNoEntry: false })
        ? finalDirectory
        : pendingDirectory;
      removeExpiredPayload({ directory, record });
    }
    throw error;
  }
}

function replayFinal({ current, decision, entry }) {
  assertDecision(current, entry.decision);
  if (decision.decisionRecord.decision === 'reject') {
    if (entry.payload) {
      throw new Error('F1.19 rejected payload history contains content.');
    }
    assertWindow(current);
    return rejectedResult();
  }
  if (!entry.payload) {
    throw new Error('F1.19 approved payload history is incomplete.');
  }
  const enrichment = loadEnrichmentInput(filenames.enrichmentInput);
  const payload = assertPayload(
    current,
    decision,
    enrichment.value,
    entry.payload,
  );
  assertWindow(current);
  return approvedResult(payload, entry.directory);
}

function assertReady({
  initialEnrichment,
  initialInputs,
  pendingDirectory,
  record,
  storedDecision,
}) {
  const current = loadCommon(filenames, { requireLive: false });
  assertSameCommon(initialInputs, current);
  assertCurrentState(current);
  const currentDecision = buildDecision(current);
  if (JSON.stringify(currentDecision) !== JSON.stringify(storedDecision)) {
    throw new Error('F1.19 payload decision changed before publish.');
  }
  let enrichmentInput = null;
  if (record) {
    const currentEnrichment = loadEnrichmentInput(filenames.enrichmentInput);
    assertSamePrivateJsonState(
      initialEnrichment,
      currentEnrichment,
      'F1.19 enrichmentInput',
    );
    enrichmentInput = currentEnrichment.value;
  }
  const history = inspectHistory({
    current,
    expectedDecision: currentDecision,
    pendingDirectory,
    root: path.dirname(pendingDirectory),
  });
  const exact =
    !history.final &&
    !history.emptyPending &&
    JSON.stringify(history.decision) === JSON.stringify(storedDecision) &&
    JSON.stringify(history.payload) === JSON.stringify(record);
  if (!exact) {
    throw new Error('F1.19 pending payload changed before publish.');
  }
  assertDecision(current, history.decision);
  if (record) {
    assertPayload(current, currentDecision, enrichmentInput, record);
  }
  assertWindow(current);
  return capturePublicationSeal({
    current,
    enrichmentState: record ? initialEnrichment : null,
    pendingDirectory,
    record,
  });
}

function publish({
  beforePublish,
  expectedNames,
  finalDirectory,
  pendingDirectory,
  root,
}) {
  if (fs.lstatSync(finalDirectory, { throwIfNoEntry: false })) {
    throw new Error('F1.19 final payload history already exists.');
  }
  const seal = beforePublish();
  assertPublicationSeal(seal);
  fs.renameSync(pendingDirectory, finalDirectory);
  fsyncPrivateDirectory(root, 'F1.19 payload history', { repoDir });
  const names = readPrivateDirectory(
    finalDirectory,
    'F1.19 published payload history',
    { repoDir },
  );
  if (!sameNames(names, expectedNames)) {
    throw new Error('F1.19 published payload history is incomplete.');
  }
  assertPublishedSeal(seal, finalDirectory);
  return seal;
}

function capturePublicationSeal({
  current,
  enrichmentState,
  pendingDirectory,
  record,
}) {
  const files = {
    decision: readPrivateJsonState(
      path.join(pendingDirectory, 'decision.json'),
      'F1.19 sealed pending decision',
      { repoDir },
    ),
  };
  if (record) {
    files.payload = readPrivateJsonState(
      path.join(pendingDirectory, 'payload.json'),
      'F1.19 sealed pending payload',
      { repoDir },
    );
  }
  return {
    common: current,
    directory: fs.lstatSync(pendingDirectory),
    enrichmentState,
    files,
    pendingDirectory,
  };
}

function assertPublicationSeal(seal) {
  const current = loadCommon(filenames, { requireLive: false });
  assertSameCommon(seal.common, current);
  if (seal.enrichmentState) {
    assertSamePrivateJsonState(
      seal.enrichmentState,
      loadEnrichmentInput(filenames.enrichmentInput),
      'F1.19 enrichmentInput',
    );
  }
  const directory = fs.lstatSync(seal.pendingDirectory);
  if (
    directory.dev !== seal.directory.dev ||
    directory.ino !== seal.directory.ino ||
    (directory.mode & 0o777) !== 0o700
  ) {
    throw new Error('F1.19 pending payload directory changed before publish.');
  }
  for (const [role, state] of Object.entries(seal.files)) {
    assertSamePrivateJsonState(
      state,
      readPrivateJsonState(
        path.join(seal.pendingDirectory, `${role}.json`),
        `F1.19 sealed pending ${role}`,
        { repoDir },
      ),
      `F1.19 pending ${role}`,
    );
  }
  assertWindow(current);
}

function assertPublishedSeal(seal, finalDirectory) {
  const directory = fs.lstatSync(finalDirectory);
  if (
    directory.dev !== seal.directory.dev ||
    directory.ino !== seal.directory.ino ||
    (directory.mode & 0o777) !== 0o700
  ) {
    throw new Error('F1.19 published payload directory changed.');
  }
  for (const [role, state] of Object.entries(seal.files)) {
    assertRelocatedPrivateJsonState(
      state,
      readPrivateJsonState(
        path.join(finalDirectory, `${role}.json`),
        `F1.19 published ${role}`,
        { repoDir },
      ),
      `F1.19 published ${role}`,
    );
  }
  assertPublishedInputs(seal);
}

function assertPublishedInputs(seal) {
  const current = loadCommon(filenames, { requireLive: false });
  assertSameCommon(seal.common, current);
  if (seal.enrichmentState) {
    assertSamePrivateJsonState(
      seal.enrichmentState,
      loadEnrichmentInput(filenames.enrichmentInput),
      'F1.19 enrichmentInput',
    );
  }
  assertWindow(current);
}

function assertRelocatedPrivateJsonState(before, after, label) {
  if (
    before.initialFile.dev !== after.initialFile.dev ||
    before.initialFile.ino !== after.initialFile.ino ||
    !before.bytes.equals(after.bytes)
  ) {
    throw new Error(`${label} changed while publishing.`);
  }
}

function readFinal({ current, decision, directory, enrichmentInput }) {
  const storedDecision = readPrivateJsonState(
    path.join(directory, 'decision.json'),
    'F1.19 published payload decision',
    { repoDir },
  ).value;
  const payload = readPrivateJsonState(
    path.join(directory, 'payload.json'),
    'F1.19 published payload',
    { repoDir },
  ).value;
  assertDecision(current, storedDecision);
  assertPayload(current, decision, enrichmentInput, payload);
  return { decision: storedDecision, payload };
}

function loadCommon(names, { requireLive = true } = {}) {
  const states = {};
  for (const [key, filename] of Object.entries({
    workspace: names.workspace,
    admission: names.admission,
    item: names.item,
    candidate: names.candidate,
    candidateReviewResolution: names.candidateReviewResolution,
    answerQualityCase: names.answerQualityCase,
    decisionInput: names.decision,
  })) {
    states[key] = readPrivateJsonState(filename, `F1.19 ${key}`, { repoDir });
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
  assertCurrentState(current);
  buildDecision(current);
  if (requireLive) {
    assertWindow(current);
  }
  return current;
}

function loadEnrichmentInput(filename) {
  return readPrivateJsonState(filename, 'F1.19 enrichmentInput', { repoDir });
}

function assertCurrentState(current) {
  assertFineTuningPrivateAnswerQualityReviewInputs({
    repoDir,
    states: current.states,
    values: { ...current, decision: current.candidateReviewResolution },
  });
  assertFineTuningPrivateAnswerQualityReviewState({
    current: { ...current, decision: current.candidateReviewResolution },
    repoDir,
  });
  assertCanonicalPrivateAnswerQualityCaseChain({ current, repoDir });
  assertNoForeignPayloadHistory(current);
}

function assertNoForeignPayloadHistory(current) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    HISTORY_NAME,
  );
  if (!fs.lstatSync(root, { throwIfNoEntry: false })) {
    return;
  }
  for (const workspaceName of readPrivateDirectory(
    root,
    'F1.19 payload workspaces',
    { repoDir },
  )) {
    if (!/^[a-f0-9]{64}$/u.test(workspaceName)) {
      throw new Error('F1.19 payload workspace history is invalid.');
    }
    const workspaceRoot = path.join(root, workspaceName);
    for (const name of readPrivateDirectory(
      workspaceRoot,
      'F1.19 payload workspace history',
      { repoDir },
    )) {
      if (workspaceName === current.workspace.workspaceHash) {
        continue;
      }
      const itemHash = foreignPayloadItemHash({
        currentItemHash: current.item.itemHash,
        directory: path.join(workspaceRoot, name),
        name,
        workspaceHash: workspaceName,
      });
      if (itemHash === current.item.itemHash) {
        throw new Error(
          'F1.19 payload history contains a foreign workspace copy.',
        );
      }
    }
  }
}

function foreignPayloadItemHash({
  currentItemHash,
  directory,
  name,
  workspaceHash,
}) {
  const pending = name.match(
    /^\.fine-tuning-private-answer-quality-case-payload-pending-([a-f0-9]{64})-([a-f0-9]{64})$/u,
  );
  const final = /^[a-f0-9]{64}$/u.test(name);
  if (!final && !pending) {
    throw new Error('F1.19 payload workspace history is invalid.');
  }
  const names = readPrivateDirectory(
    directory,
    'F1.19 foreign payload history entry',
    { repoDir },
  );
  if (names.length === 0 && pending) {
    return pending[1];
  }
  if (
    !sameNames(names, ['decision.json']) &&
    !sameNames(names, ['decision.json', 'payload.json'])
  ) {
    throw new Error('F1.19 foreign payload history bundle is invalid.');
  }
  const decision = assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(
    readPrivateJsonState(
      path.join(directory, 'decision.json'),
      'F1.19 foreign payload decision',
      { repoDir },
    ).value,
  );
  const payload = names.includes('payload.json')
    ? assertFineTuningPrivateAnswerQualityCasePayloadRecord(
        readPrivateJsonState(
          path.join(directory, 'payload.json'),
          'F1.19 foreign payload',
          { repoDir },
        ).value,
      )
    : null;
  if (decision.item.itemHash === currentItemHash) {
    return decision.item.itemHash;
  }
  const expectedName = final
    ? decision.item.itemHash
    : `${PENDING_PREFIX}${decision.item.itemHash}-${decision.decisionHash}`;
  const exact =
    name === expectedName &&
    decision.workspace.workspaceHash === workspaceHash &&
    (!payload ||
      (payload.item.itemHash === decision.item.itemHash &&
        payload.workspace.workspaceHash === workspaceHash &&
        payload.bindings.payloadDecisionHash === decision.decisionHash));
  if (!exact) {
    throw new Error('F1.19 foreign payload history lineage is invalid.');
  }
  return decision.item.itemHash;
}

function buildDecision(current) {
  return buildFineTuningPrivateAnswerQualityCasePayloadDecision({
    answerQualityCase: current.answerQualityCase,
    decision: current.decisionInput,
    item: current.item,
    workspace: current.workspace,
  });
}

function buildPayload({ current, decision, enrichmentInput, storedAt }) {
  return buildFineTuningPrivateAnswerQualityCasePayload({
    admission: current.admission,
    answerQualityCase: current.answerQualityCase,
    candidate: current.candidate,
    candidateReviewResolution: current.candidateReviewResolution,
    decision,
    enrichmentInput,
    item: current.item,
    storedAt,
    workspace: current.workspace,
  });
}

function assertDecision(current, decision) {
  return assertFineTuningPrivateAnswerQualityCasePayloadDecision(decision, {
    answerQualityCase: current.answerQualityCase,
    decision: current.decisionInput,
    item: current.item,
    workspace: current.workspace,
  });
}

function assertPayload(current, decision, enrichmentInput, payload) {
  return assertFineTuningPrivateAnswerQualityCasePayload(payload, {
    admission: current.admission,
    answerQualityCase: current.answerQualityCase,
    candidate: current.candidate,
    candidateReviewResolution: current.candidateReviewResolution,
    decision,
    enrichmentInput,
    item: current.item,
    workspace: current.workspace,
  });
}

function inspectHistory({ current, expectedDecision, pendingDirectory, root }) {
  let emptyPending = null;
  let final = null;
  let pending = null;

  for (const name of readPrivateDirectory(root, 'F1.19 payload history', {
    repoDir,
  })) {
    const directory = path.join(root, name);
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = new RegExp(
      `^\\${PENDING_PREFIX}[a-f0-9]{64}-[a-f0-9]{64}$`,
      'u',
    ).test(name);
    if (!isFinal && !isPending) {
      throw new Error('F1.19 payload history is invalid.');
    }
    const names = readPrivateDirectory(
      directory,
      'F1.19 payload history entry',
      { repoDir },
    );
    if (names.length === 0) {
      if (directory === pendingDirectory && !emptyPending) {
        emptyPending = directory;
        continue;
      }
      throw new Error('F1.19 payload history entry is invalid.');
    }
    if (
      !sameNames(names, ['decision.json']) &&
      !sameNames(names, ['decision.json', 'payload.json'])
    ) {
      throw new Error('F1.19 payload history bundle is invalid.');
    }
    const decision = readPrivateJsonState(
      path.join(directory, 'decision.json'),
      'F1.19 stored payload decision',
      { repoDir },
    ).value;
    assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(decision);
    const payload = names.includes('payload.json')
      ? readPrivateJsonState(
          path.join(directory, 'payload.json'),
          'F1.19 stored payload',
          { repoDir },
        ).value
      : null;
    if (payload) {
      assertFineTuningPrivateAnswerQualityCasePayloadRecord(payload);
    }
    const expectedName = isFinal
      ? decision.item.itemHash
      : `${PENDING_PREFIX}${decision.item.itemHash}-${decision.decisionHash}`;
    const exact =
      name === expectedName &&
      decision.workspace.workspaceHash === current.workspace.workspaceHash &&
      (!payload ||
        (payload.workspace.workspaceHash === current.workspace.workspaceHash &&
          payload.item.itemHash === decision.item.itemHash &&
          payload.answerQualityCase.answerQualityCaseHash ===
            decision.answerQualityCase.answerQualityCaseHash &&
          payload.bindings.payloadDecisionHash === decision.decisionHash));
    if (!exact) {
      throw new Error('F1.19 payload history lineage is invalid.');
    }
    assertCanonicalPrivateAnswerQualityPayloadEntry({
      current,
      decision,
      payload,
      repoDir,
    });
    if (decision.item.itemHash !== current.item.itemHash) {
      continue;
    }
    const entry = { decision, directory, payload };
    if (isFinal) {
      if (final) {
        throw new Error('F1.19 final payload history is ambiguous.');
      }
      final = entry;
    } else {
      if (pending) {
        throw new Error('F1.19 pending payload history is ambiguous.');
      }
      pending = entry;
    }
  }
  if (final && (pending || emptyPending)) {
    throw new Error('F1.19 final payload conflicts with pending history.');
  }
  if (
    pending &&
    JSON.stringify(pending.decision) !== JSON.stringify(expectedDecision)
  ) {
    throw new Error('F1.19 current pending payload decision conflicts with the request.');
  }
  return {
    decision: pending?.decision || null,
    emptyPending,
    final,
    payload: pending?.payload || null,
  };
}

function historyRoot(workspaceHash) {
  return ensurePrivateDirectoryChain(
    path.join(repoDir, 'var', 'fine-tuning', HISTORY_NAME, workspaceHash),
    'F1.19 payload history',
    { repoDir },
  );
}

function assertSameCommon(left, right) {
  for (const key of Object.keys(left.states)) {
    assertSamePrivateJsonState(
      left.states[key],
      right.states[key],
      `F1.19 ${key}`,
    );
  }
}

function assertWindow(current) {
  if (windowExpired(current.item)) {
    throw new Error('Fine-tuning private answer quality case payload item is expired.');
  }
}

function windowExpired(item) {
  const now = Date.now();
  return (
    now >= Date.parse(item.expiresAt) ||
    now >= Date.parse(item.retention.deleteBy)
  );
}

function removeExpiredPayload({ directory, record }) {
  const filename = path.join(directory, 'payload.json');
  if (
    !fs.lstatSync(directory, { throwIfNoEntry: false }) ||
    !fs.lstatSync(filename, { throwIfNoEntry: false })
  ) {
    return;
  }
  const state = readPrivateJsonState(
    filename,
    'F1.19 expired payload',
    { repoDir },
  );
  if (JSON.stringify(state.value) !== JSON.stringify(record)) {
    throw new Error(
      'F1.19 expired payload changed and requires manual recovery.',
    );
  }
  const directoryState = fs.lstatSync(directory);

  let descriptor;
  try {
    descriptor = fs.openSync(
      filename,
      fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
    );
    const opened = fs.fstatSync(descriptor);
    const linked = fs.lstatSync(filename);
    if (
      opened.dev !== state.initialFile.dev ||
      opened.ino !== state.initialFile.ino ||
      opened.size !== state.initialFile.size ||
      linked.dev !== opened.dev ||
      linked.ino !== opened.ino ||
      linked.nlink !== 1
    ) {
      throw new Error();
    }
    fs.unlinkSync(filename);
    if (fs.fstatSync(descriptor).nlink !== 0) {
      throw new Error();
    }
    assertExpiredPayloadAbsent({
      directory,
      directoryState,
      filename,
    });
  } catch {
    throw new Error(
      'F1.19 expired payload could not be removed safely.',
    );
  } finally {
    if (descriptor !== undefined) {
      fs.closeSync(descriptor);
    }
  }
  fsyncPrivateDirectory(
    directory,
    'F1.19 expired payload history',
    { repoDir },
  );
  try {
    assertExpiredPayloadAbsent({
      directory,
      directoryState,
      filename,
    });
  } catch {
    throw new Error(
      'F1.19 expired payload could not be removed safely.',
    );
  }
}

function assertExpiredPayloadAbsent({ directory, directoryState, filename }) {
  const currentDirectory = fs.lstatSync(directory);
  if (
    currentDirectory.dev !== directoryState.dev ||
    currentDirectory.ino !== directoryState.ino ||
    (currentDirectory.mode & 0o777) !== 0o700 ||
    fs.lstatSync(filename, { throwIfNoEntry: false }) ||
    !sameNames(
      readPrivateDirectory(directory, 'F1.19 expired payload history', {
        repoDir,
      }),
      ['decision.json'],
    )
  ) {
    throw new Error();
  }
}

function approvedResult(
  record,
  payloadDirectory,
  { cleanupOnExpiry = false } = {},
) {
  return {
    status: record.status,
    decision: 'approve',
    payloadStored: true,
    contentCopied: true,
    q1ContractSatisfied: true,
    trainingAuthorized: false,
    externalProviderCalls: 'none',
    productionReadyClaim: false,
    cleanupOnExpiry,
    payloadDirectory,
    storedRecord: record,
  };
}

function rejectedResult() {
  return {
    status: 'private-answer-quality-case-payload-storage-rejected',
    decision: 'reject',
    payloadStored: false,
    contentCopied: false,
    q1ContractSatisfied: true,
    trainingAuthorized: false,
    externalProviderCalls: 'none',
    productionReadyClaim: false,
  };
}

function parseArguments(args) {
  const fields = [
    'workspace',
    'admission',
    'item',
    'candidate',
    'candidate-review-resolution',
    'case',
    'decision',
    'enrichment-input',
  ];
  const invalid =
    args.length !== fields.length * 2 ||
    fields.some(
      (field, index) =>
        args[index * 2] !== `--${field}` ||
        !String(args[index * 2 + 1] || '').trim(),
    );
  if (invalid) {
    throw new Error('Expected exact private F1.19 input filenames.');
  }
  return Object.fromEntries(
    fields.map((field, index) => {
      const key =
        field === 'candidate-review-resolution'
          ? 'candidateReviewResolution'
          : field === 'enrichment-input'
            ? 'enrichmentInput'
            : field === 'case'
              ? 'answerQualityCase'
              : field;
      return [key, args[index * 2 + 1]];
    }),
  );
}

function sameNames(actual, expected) {
  return JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}
