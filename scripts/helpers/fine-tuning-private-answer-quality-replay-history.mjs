import path from 'node:path';

import {
  assertFineTuningPrivateAnswerQualityCaseReplay,
  assertFineTuningPrivateAnswerQualityCaseReplayRelation,
  assertFineTuningPrivateAnswerQualityCaseReplayRequest,
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord,
} from '../../src/core/fine-tuning-private-answer-quality-case-replay.mjs';
import {
  assertSamePrivateJsonState,
  readPrivateDirectory,
  readPrivateJsonState,
} from './private-json-state.mjs';

const PENDING_PREFIX = '.fine-tuning-private-answer-quality-case-replay-pending-';

export function readFineTuningPrivateAnswerQualityReplayHistory({
  label,
  repoDir,
}) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    'private-answer-quality-case-replays',
  );
  const entries = [];
  const workspaces = readPrivateDirectory(
    root,
    `${label} workspaces`,
    { repoDir },
  );
  for (const workspaceHash of workspaces) {
    if (!/^[a-f0-9]{64}$/u.test(workspaceHash)) {
      throw new Error(`${label} is invalid.`);
    }
    const workspaceRoot = path.join(root, workspaceHash);
    const names = readPrivateDirectory(
      workspaceRoot,
      `${label} workspace`,
      { repoDir },
    );
    for (const name of names) {
      const final = /^[a-f0-9]{64}$/u.test(name);
      const pending = name.match(
        /^\.fine-tuning-private-answer-quality-case-replay-pending-([a-f0-9]{64})-([a-f0-9]{64})$/u,
      );
      if (!final && !pending) throw new Error(`${label} is invalid.`);
      const directory = path.join(workspaceRoot, name);
      const names = readPrivateDirectory(directory, `${label} entry`, { repoDir });
      const validNames =
        JSON.stringify(names) === JSON.stringify(['receipt.json', 'request.json']) ||
        (pending && JSON.stringify(names) === JSON.stringify(['request.json']));
      if (!validNames) throw new Error(`${label} bundle is invalid.`);
      const request = readPrivateJsonState(
        path.join(directory, 'request.json'),
        `${label} request`,
        { repoDir },
      );
      assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(request.value);
      const receipt = names.includes('receipt.json')
        ? readPrivateJsonState(
            path.join(directory, 'receipt.json'),
            `${label} receipt`,
            { repoDir },
          )
        : null;
      if (receipt) {
        assertFineTuningPrivateAnswerQualityCaseReplayRelation({
          receipt: receipt.value,
          request: request.value,
        });
      }
      const expectedName = final
        ? request.value.item.itemHash
        : `${PENDING_PREFIX}${request.value.item.itemHash}-${request.value.replayRequestHash}`;
      if (
        name !== expectedName ||
        request.value.workspace.workspaceHash !== workspaceHash
      ) {
        throw new Error(`${label} entry lineage is invalid.`);
      }
      entries.push({
        final,
        name,
        pending: Boolean(pending),
        receipt,
        request,
        workspaceHash,
      });
    }
  }
  return { entries, workspaces };
}

export function selectFineTuningPrivateAnswerQualityReplayHistory(
  snapshot,
  current,
  { label },
) {
  const matches = snapshot.entries.filter(
    (entry) => entry.request.value.item.itemHash === current.item.itemHash,
  );
  if (
    matches.some(
      (entry) => entry.workspaceHash !== current.workspace.workspaceHash,
    )
  ) {
    throw new Error(`${label} contains a foreign workspace copy.`);
  }
  if (matches.some((entry) => entry.pending)) {
    throw new Error(
      `${label} requires one final F1.20 replay without pending history.`,
    );
  }
  const final = matches.filter(
    (entry) =>
      entry.final &&
      entry.workspaceHash === current.workspace.workspaceHash &&
      entry.receipt,
  );
  if (final.length !== 1) {
    throw new Error(`${label} requires one final F1.20 replay.`);
  }
  const selected = final[0];
  assertFineTuningPrivateAnswerQualityCaseReplayRequest(selected.request.value, {
    answerQualityCase: current.answerQualityCase,
    item: current.item,
    payload: current.payload,
    request: current.requestInput,
    workspace: current.workspace,
  });
  assertFineTuningPrivateAnswerQualityCaseReplay(selected.receipt.value, {
    answerQualityCase: current.answerQualityCase,
    item: current.item,
    payload: current.payload,
    request: selected.request.value,
    workspace: current.workspace,
  });
  return selected;
}

export function assertSameFineTuningPrivateAnswerQualityReplayHistory(
  before,
  after,
  label,
) {
  const structure = (snapshot) => ({
    entries: snapshot.entries.map(
      (entry) => `${entry.workspaceHash}/${entry.name}`,
    ),
    workspaces: snapshot.workspaces,
  });
  if (JSON.stringify(structure(before)) !== JSON.stringify(structure(after))) {
    throw new Error(`${label} structure changed while projecting.`);
  }
  for (let index = 0; index < before.entries.length; index += 1) {
    assertSamePrivateJsonState(
      before.entries[index].request,
      after.entries[index].request,
      `${label} request`,
    );
    const beforeReceipt = before.entries[index].receipt;
    const afterReceipt = after.entries[index].receipt;
    if (Boolean(beforeReceipt) !== Boolean(afterReceipt)) {
      throw new Error(`${label} structure changed while projecting.`);
    }
    if (beforeReceipt) {
      assertSamePrivateJsonState(
        beforeReceipt,
        afterReceipt,
        `${label} receipt`,
      );
    }
  }
}
