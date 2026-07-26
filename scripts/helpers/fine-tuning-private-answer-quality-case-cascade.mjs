import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord,
  assertFineTuningPrivateAnswerQualityCasePayloadRecord,
} from '../../src/core/fine-tuning-private-answer-quality-case-payload.mjs';
import {
  assertFineTuningPrivateAnswerQualityCaseReplayRecord,
  assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord,
  assertFineTuningPrivateAnswerQualityCaseReplayRelation,
} from '../../src/core/fine-tuning-private-answer-quality-case-replay.mjs';
import { assertFineTuningPrivateAnswerQualityCaseRecord } from '../../src/core/fine-tuning-private-answer-quality-case.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord } from '../../src/core/fine-tuning-private-answer-quality-enrichment-candidate.mjs';
import { assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord } from '../../src/core/fine-tuning-private-answer-quality-enrichment-candidate-review-resolution.mjs';
import { assertStoredF1_17Decision } from './fine-tuning-private-answer-quality-case-history.mjs';
import {
  assertPrivateDirectory,
  ensurePrivateDirectoryChain,
  fsyncPrivateDirectory,
  makePrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
  writeExclusivePrivateJson,
} from './private-json-state.mjs';

const CASCADE_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-case-deletion-cascade/v1';
const CASCADE_RECEIPT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-answer-quality-case-deletion-cascade-absence-receipt/v1';
const CASCADE_HISTORY_NAME =
  'private-answer-quality-case-deletion-cascades';
const CASCADE_PENDING_PREFIX = '.pending-';
const COMPONENTS = Object.freeze([
  {
    finalPattern: /^[a-f0-9]{64}$/u,
    historyName: 'private-answer-quality-case-payloads',
    kind: 'payload',
    pendingPattern:
      /^\.fine-tuning-private-answer-quality-case-payload-pending-([a-f0-9]{64})-([a-f0-9]{64})$/u,
  },
  {
    finalPattern: /^[a-f0-9]{64}$/u,
    historyName: 'private-answer-quality-case-replays',
    kind: 'replay',
    pendingPattern:
      /^\.fine-tuning-private-answer-quality-case-replay-pending-([a-f0-9]{64})-([a-f0-9]{64})$/u,
  },
  {
    finalPattern: /^[a-f0-9]{64}$/u,
    historyName: 'private-answer-quality-cases',
    kind: 'case',
    pendingPattern:
      /^\.fine-tuning-private-answer-quality-case-pending-([a-f0-9]{64})-([a-f0-9]{64})$/u,
  },
  {
    finalPattern: /^[a-f0-9]{64}$/u,
    historyName:
      'private-answer-quality-enrichment-candidate-review-resolutions',
    kind: 'resolution',
    pendingPattern:
      /^\.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-([a-f0-9]{64})-([a-f0-9]{64})$/u,
  },
  {
    finalPattern: /^[a-f0-9]{64}$/u,
    historyName: 'private-answer-quality-enrichment-candidates',
    kind: 'candidate',
    pendingPattern:
      /^\.private-answer-quality-case-pending-([a-f0-9]{64})-([a-f0-9]{64})$/u,
  },
]);

export function prepareFineTuningPrivateAnswerQualityDeletionCascade({
  current,
  decision,
  repoDir,
}) {
  assertLifecycleBinding(current, decision);
  recoverEmptyCascadePending({ current, decision, repoDir });
  const state = inspectCascadeHistory({ current, decision, repoDir });
  if (state.final) {
    assertDerivativeAbsence({ current, decision, repoDir });
    return state.final;
  }

  const live = inspectDerivativeState({
    current,
    itemHash: decision.item.itemHash,
    repoDir,
  });
  if (!current.item && !state.pending && live.length > 0) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade found resurrected derivative history.',
    );
  }
  if (!state.pending && live.length === 0) {
    return null;
  }
  const cascade = state.pending || createCascade({
    current,
    decision,
    live,
    repoDir,
  });
  if (cascade.receipt) {
    assertDerivativeAbsence({ current, decision, repoDir });
    return cascade;
  }
  stageComponents({ cascade, current, live, repoDir });
  deleteStagedComponents({ cascade, repoDir });
  assertDerivativeAbsence({ current, decision, repoDir });
  return inspectCascadeHistory({ current, decision, repoDir }).pending;
}

export function finalizeFineTuningPrivateAnswerQualityDeletionCascade({
  cascade,
  current,
  decision,
  itemFilename,
  removalDirectory,
  repoDir,
  terminalBundle,
}) {
  assertLifecycleBinding(current, decision);
  assertDerivativeAbsence({ current, decision, repoDir });
  if (!cascade) {
    assertNoUnfinishedCascade({ current, decision, repoDir });
    return null;
  }
  if (
    fs.lstatSync(itemFilename, { throwIfNoEntry: false }) ||
    fs.lstatSync(path.join(removalDirectory, 'item.json'), {
      throwIfNoEntry: false,
    })
  ) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade requires item absence.',
    );
  }
  const currentState = inspectCascadeHistory({ current, decision, repoDir });
  if (currentState.final) {
    assertFinalReceipt({
      cascade: currentState.final,
      current,
      decision,
      terminalBundle,
    });
    return currentState.final;
  }
  const pending = currentState.pending;
  if (!pending) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade durable state is missing.',
    );
  }
  let receipt = pending.receipt;
  if (!receipt) {
    receipt = buildReceipt({
      current,
      decision,
      inventory: pending.inventory,
      terminalBundle,
    });
    writeExclusivePrivateJson(
      path.join(pending.directory, 'absence-receipt.json'),
      receipt,
      'F1.19 deletion cascade absence receipt',
      { repoDir },
    );
    fsyncPrivateDirectory(
      pending.directory,
      'F1.19 deletion cascade pending history',
      { repoDir },
    );
  } else {
    assertReceipt({
      current,
      decision,
      inventory: pending.inventory,
      receipt,
      terminalBundle,
    });
  }
  assertDerivativeAbsence({ current, decision, repoDir });
  cleanupStaging(pending, repoDir);
  assertDerivativeAbsence({ current, decision, repoDir });
  const finalDirectory = path.join(
    pending.root,
    decision.withdrawalReferenceSha256,
  );
  if (fs.lstatSync(finalDirectory, { throwIfNoEntry: false })) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade final history already exists.',
    );
  }
  fs.renameSync(pending.directory, finalDirectory);
  fsyncPrivateDirectory(
    pending.root,
    'F1.19 deletion cascade history',
    { repoDir },
  );
  assertDerivativeAbsence({ current, decision, repoDir });
  const final = inspectCascadeHistory({ current, decision, repoDir }).final;
  assertFinalReceipt({ cascade: final, current, decision, terminalBundle });
  return final;
}

export function assertFineTuningPrivateAnswerQualityDeletionCascadeFinal({
  current,
  decision,
  repoDir,
  terminalBundle,
}) {
  assertLifecycleBinding(current, decision);
  assertDerivativeAbsence({ current, decision, repoDir });
  const state = inspectCascadeHistory({ current, decision, repoDir });
  if (state.pending) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade pending history requires recovery.',
    );
  }
  if (state.final) {
    assertFinalReceipt({
      cascade: state.final,
      current,
      decision,
      terminalBundle,
    });
  }
  return state.final;
}

function createCascade({ current, decision, live, repoDir }) {
  const root = ensurePrivateDirectoryChain(
    path.join(
      repoDir,
      'var',
      'fine-tuning',
      CASCADE_HISTORY_NAME,
      current.workspace.workspaceHash,
    ),
    'F1.19 deletion cascade history',
    { repoDir },
  );
  const directory = path.join(
    root,
    `${CASCADE_PENDING_PREFIX}${decision.decisionHash}`,
  );
  makePrivateDirectory(
    directory,
    'F1.19 deletion cascade pending history',
    { repoDir },
  );
  makePrivateDirectory(
    path.join(directory, 'staged'),
    'F1.19 deletion cascade staging',
    { repoDir },
  );
  const content = {
    components: live.map(toInventoryComponent),
    decisionHash: decision.decisionHash,
    itemHash: decision.item.itemHash,
    schemaVersion: CASCADE_SCHEMA_VERSION,
    withdrawalReferenceSha256: decision.withdrawalReferenceSha256,
    workspaceHash: decision.workspace.workspaceHash,
  };
  const inventory = {
    ...content,
    inventoryHash: hash(content),
  };
  writeExclusivePrivateJson(
    path.join(directory, 'inventory.json'),
    inventory,
    'F1.19 deletion cascade inventory',
    { repoDir },
  );
  fsyncPrivateDirectory(
    directory,
    'F1.19 deletion cascade pending history',
    { repoDir },
  );
  return inspectCascadeHistory({ current, decision, repoDir }).pending;
}

function stageComponents({ cascade, current, live, repoDir }) {
  const liveByKind = new Map(live.map((entry) => [entry.kind, entry]));
  for (const [index, inventoryComponent] of cascade.inventory.components.entries()) {
    const stageDirectory = stagedDirectory(
      cascade.directory,
      index,
      inventoryComponent.kind,
    );
    const staged = fs.lstatSync(stageDirectory, { throwIfNoEntry: false });
    const source = liveByKind.get(inventoryComponent.kind);
    if (staged && source) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade source and staging conflict.',
      );
    }
    if (staged) {
      const remainingFiles = remainingStagedFiles({
        component: inventoryComponent,
        directory: stageDirectory,
        repoDir,
      });
      assertStagedComponent({
        component: inventoryComponent,
        directory: stageDirectory,
        files: remainingFiles,
        repoDir,
      });
      continue;
    }
    if (!source) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade source is missing without durable proof.',
      );
    }
    if (
      JSON.stringify(toInventoryComponent(source)) !==
      JSON.stringify(inventoryComponent)
    ) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade source changed before staging.',
      );
    }
    fs.renameSync(source.directory, stageDirectory);
    fsyncPrivateDirectory(
      path.dirname(source.directory),
      'F1.19 derivative history',
      { repoDir },
    );
    fsyncPrivateDirectory(
      cascade.stagedDirectory,
      'F1.19 deletion cascade staging',
      { repoDir },
    );
    assertStagedComponent({
      component: inventoryComponent,
      directory: stageDirectory,
      repoDir,
    });
  }
  const remaining = inspectDerivativeState({
    current,
    itemHash: cascade.inventory.itemHash,
    repoDir,
  });
  if (remaining.length !== 0) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade did not stage every derivative.',
    );
  }
}

function deleteStagedComponents({ cascade, repoDir }) {
  for (const [index, component] of cascade.inventory.components.entries()) {
    const directory = stagedDirectory(cascade.directory, index, component.kind);
    const remainingFiles = remainingStagedFiles({
      component,
      directory,
      repoDir,
    });
    assertStagedComponent({
      component,
      directory,
      files: remainingFiles,
      repoDir,
    });
    for (const file of remainingFiles) {
      unlinkPrivateFile({
        expected: file,
        filename: path.join(directory, roleFilename(component.kind, file.role)),
        repoDir,
      });
      fsyncPrivateDirectory(
        directory,
        'F1.19 deletion cascade staged component',
        { repoDir },
      );
    }
    if (
      readPrivateDirectory(
        directory,
        'F1.19 deletion cascade staged component',
        { repoDir },
      ).length !== 0
    ) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade staged component is not empty.',
      );
    }
  }
}

function remainingStagedFiles({ component, directory, repoDir }) {
  const names = readPrivateDirectory(
    directory,
    'F1.19 deletion cascade staged component',
    { repoDir },
  );
  const ordered = deletionOrder(component);
  for (let index = 0; index <= ordered.length; index += 1) {
    const remaining = ordered.slice(index);
    const expectedNames = remaining.map((file) =>
      roleFilename(component.kind, file.role),
    );
    if (sameNames(names, expectedNames)) {
      return remaining;
    }
  }
  throw new Error(
    'Fine-tuning private answer quality deletion cascade staged deletion order is invalid.',
  );
}

function deletionOrder(component) {
  const priorities = {
    candidate: ['candidate'],
    case: ['case'],
    payload: ['payload', 'payload-decision'],
    replay: ['replay-receipt', 'replay-request'],
    resolution: ['resolution', 'resolution-decision'],
  };
  const ordered = priorities[component.kind]
    .map((role) => component.files.find((entry) => entry.role === role))
    .filter(Boolean);
  if (ordered.length !== component.files.length) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade inventory role is invalid.',
    );
  }
  return ordered;
}

function cleanupStaging(cascade, repoDir) {
  if (!cascade.stagedDirectory) {
    if (!cascade.receipt) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade staging is missing without an absence receipt.',
      );
    }
    return;
  }
  for (const [index, component] of cascade.inventory.components.entries()) {
    const directory = stagedDirectory(cascade.directory, index, component.kind);
    if (!fs.lstatSync(directory, { throwIfNoEntry: false })) {
      if (!cascade.receipt) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade staged component is missing.',
        );
      }
      continue;
    }
    if (
      !sameNames(
        readPrivateDirectory(
          directory,
          'F1.19 deletion cascade staged component',
          { repoDir },
        ),
        [],
      )
    ) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade staged component is not empty.',
      );
    }
    fs.rmdirSync(directory);
  }
  const remaining = readPrivateDirectory(
    cascade.stagedDirectory,
    'F1.19 deletion cascade staging',
    { repoDir },
  );
  if (remaining.length !== 0) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade staging is not empty.',
    );
  }
  fs.rmdirSync(cascade.stagedDirectory);
  fsyncPrivateDirectory(
    cascade.directory,
    'F1.19 deletion cascade pending history',
    { repoDir },
  );
}

function recoverEmptyCascadePending({ current, decision, repoDir }) {
  const root = path.join(
    repoDir,
    'var',
    'fine-tuning',
    CASCADE_HISTORY_NAME,
    current.workspace.workspaceHash,
  );
  if (!fs.lstatSync(root, { throwIfNoEntry: false })) {
    return;
  }
  const directory = path.join(
    root,
    `${CASCADE_PENDING_PREFIX}${decision.decisionHash}`,
  );
  if (!fs.lstatSync(directory, { throwIfNoEntry: false })) {
    return;
  }
  assertPrivateDirectory(
    directory,
    'F1.19 deletion cascade empty pending history',
    { repoDir },
  );
  const names = readPrivateDirectory(
    directory,
    'F1.19 deletion cascade empty pending history',
    { repoDir },
  );
  if (names.length === 0) {
    fs.rmdirSync(directory);
    fsyncPrivateDirectory(root, 'F1.19 deletion cascade history', { repoDir });
    return;
  }
  if (!sameNames(names, ['staged'])) {
    return;
  }
  const staged = path.join(directory, 'staged');
  assertPrivateDirectory(staged, 'F1.19 deletion cascade empty staging', {
    repoDir,
  });
  if (
    readPrivateDirectory(staged, 'F1.19 deletion cascade empty staging', {
      repoDir,
    }).length !== 0
  ) {
    return;
  }
  fs.rmdirSync(staged);
  fs.rmdirSync(directory);
  fsyncPrivateDirectory(root, 'F1.19 deletion cascade history', { repoDir });
}

function inspectCascadeHistory({ current, decision, repoDir }) {
  const parent = path.join(
    repoDir,
    'var',
    'fine-tuning',
    CASCADE_HISTORY_NAME,
  );
  if (!fs.lstatSync(parent, { throwIfNoEntry: false })) {
    return { final: null, pending: null };
  }
  assertPrivateDirectory(parent, 'F1.19 deletion cascade history', { repoDir });
  assertNoForeignCascadeHistory({
    current,
    decision,
    parent,
    repoDir,
  });
  const root = path.join(parent, current.workspace.workspaceHash);
  if (!fs.lstatSync(root, { throwIfNoEntry: false })) {
    return { final: null, pending: null };
  }
  const names = readPrivateDirectory(root, 'F1.19 deletion cascade history', {
    repoDir,
  });
  let final = null;
  let pending = null;
  for (const name of names) {
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = /^\.pending-[a-f0-9]{64}$/u.test(name);
    if (!isFinal && !isPending) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade history is invalid.',
      );
    }
    const directory = path.join(root, name);
    const entryNames = readPrivateDirectory(
      directory,
      'F1.19 deletion cascade history entry',
      { repoDir },
    );
    const allowedPending =
      sameNames(entryNames, ['inventory.json', 'staged']) ||
      sameNames(entryNames, ['absence-receipt.json', 'inventory.json', 'staged']) ||
      sameNames(entryNames, ['absence-receipt.json', 'inventory.json']);
    const allowedFinal = sameNames(entryNames, [
      'absence-receipt.json',
      'inventory.json',
    ]);
    if ((isPending && !allowedPending) || (isFinal && !allowedFinal)) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade bundle is invalid.',
      );
    }
    const inventory = readPrivateJsonState(
      path.join(directory, 'inventory.json'),
      'F1.19 deletion cascade inventory',
      { repoDir },
    ).value;
    assertInventoryRecord(inventory);
    if (inventory.workspaceHash !== current.workspace.workspaceHash) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade workspace lineage is invalid.',
      );
    }
    if (
      (isPending && name !== `${CASCADE_PENDING_PREFIX}${inventory.decisionHash}`) ||
      (isFinal && name !== inventory.withdrawalReferenceSha256)
    ) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade path is invalid.',
      );
    }
    const receipt = entryNames.includes('absence-receipt.json')
      ? readPrivateJsonState(
          path.join(directory, 'absence-receipt.json'),
          'F1.19 deletion cascade absence receipt',
          { repoDir },
        ).value
      : null;
    if (receipt) {
      assertReceiptRecord({ inventory, receipt });
    }
    if (entryNames.includes('staged')) {
      assertCascadeStaging({
        cleanupStarted: Boolean(receipt),
        current,
        directory,
        inventory,
        repoDir,
      });
    }
    const matchesCurrent =
      inventory.itemHash === decision.item.itemHash ||
      inventory.withdrawalReferenceSha256 ===
        decision.withdrawalReferenceSha256;
    if (!matchesCurrent) {
      continue;
    }
    assertInventoryBinding({ current, decision, inventory });
    const entry = {
      directory,
      inventory,
      receipt,
      root,
      stagedDirectory:
        isPending && entryNames.includes('staged')
          ? path.join(directory, 'staged')
          : null,
    };
    if (isFinal) {
      if (final) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade final history is ambiguous.',
        );
      }
      final = entry;
    } else {
      if (pending) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade pending history is ambiguous.',
        );
      }
      pending = entry;
    }
  }
  if (final && pending) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade final and pending history conflict.',
    );
  }
  return { final, pending };
}

function assertNoForeignCascadeHistory({
  current,
  decision,
  parent,
  repoDir,
}) {
  for (const workspaceName of readPrivateDirectory(
    parent,
    'F1.19 deletion cascade workspace history',
    { repoDir },
  )) {
    if (!/^[a-f0-9]{64}$/u.test(workspaceName)) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade workspace history is invalid.',
      );
    }
    if (workspaceName === current.workspace.workspaceHash) {
      continue;
    }
    const workspaceRoot = path.join(parent, workspaceName);
    for (const name of readPrivateDirectory(
      workspaceRoot,
      'F1.19 foreign deletion cascade history',
      { repoDir },
    )) {
      const final = /^[a-f0-9]{64}$/u.test(name);
      const pending = /^\.pending-[a-f0-9]{64}$/u.test(name);
      if (!final && !pending) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade foreign entry is invalid.',
        );
      }
      const directory = path.join(workspaceRoot, name);
      const names = readPrivateDirectory(
        directory,
        'F1.19 foreign deletion cascade entry',
        { repoDir },
      );
      const pendingBundle =
        sameNames(names, ['inventory.json', 'staged']) ||
        sameNames(names, ['absence-receipt.json', 'inventory.json', 'staged']) ||
        sameNames(names, ['absence-receipt.json', 'inventory.json']);
      const finalBundle = sameNames(names, [
        'absence-receipt.json',
        'inventory.json',
      ]);
      if ((pending && !pendingBundle) || (final && !finalBundle)) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade foreign bundle is invalid.',
        );
      }
      const inventory = readPrivateJsonState(
        path.join(directory, 'inventory.json'),
        'F1.19 foreign deletion cascade inventory',
        { repoDir },
      ).value;
      assertInventoryRecord(inventory);
      if (
        inventory.itemHash === decision.item.itemHash ||
        inventory.withdrawalReferenceSha256 ===
          decision.withdrawalReferenceSha256
      ) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade contains a foreign workspace copy.',
        );
      }
      const expectedName = final
        ? inventory.withdrawalReferenceSha256
        : `${CASCADE_PENDING_PREFIX}${inventory.decisionHash}`;
      if (
        name !== expectedName ||
        inventory.workspaceHash !== workspaceName
      ) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade foreign lineage is invalid.',
        );
      }
      const receipt = names.includes('absence-receipt.json')
        ? readPrivateJsonState(
            path.join(directory, 'absence-receipt.json'),
            'F1.19 foreign deletion cascade absence receipt',
            { repoDir },
          ).value
        : null;
      if (receipt) {
        assertReceiptRecord({ inventory, receipt });
      }
      if (names.includes('staged')) {
        assertCascadeStaging({
          cleanupStarted: Boolean(receipt),
          current,
          directory,
          inventory,
          repoDir,
        });
      }
    }
  }
}

function inspectDerivativeState({ current, itemHash, repoDir }) {
  const found = [];
  for (const component of COMPONENTS) {
    const componentRoot = path.join(
      repoDir,
      'var',
      'fine-tuning',
      component.historyName,
    );
    if (!fs.lstatSync(componentRoot, { throwIfNoEntry: false })) {
      continue;
    }
    assertPrivateDirectory(componentRoot, 'F1.19 derivative history', {
      repoDir,
    });
    for (const workspaceName of readPrivateDirectory(
      componentRoot,
      'F1.19 derivative workspace history',
      { repoDir },
    )) {
      if (!/^[a-f0-9]{64}$/u.test(workspaceName)) {
        throw new Error('F1.19 derivative workspace history is invalid.');
      }
      const workspaceRoot = path.join(componentRoot, workspaceName);
      const entries = inspectComponentWorkspace({
        component,
        current,
        repoDir,
        workspaceHash: workspaceName,
        workspaceRoot,
      });
      for (const entry of entries) {
        if (
          entry.itemHash === itemHash &&
          workspaceName !== current.workspace.workspaceHash
        ) {
          throw new Error(
            'F1.19 derivative history contains a foreign workspace copy.',
          );
        }
        if (
          entry.itemHash === itemHash &&
          workspaceName === current.workspace.workspaceHash
        ) {
          found.push(entry);
        }
      }
    }
  }
  const duplicates = found.filter(
    (entry, index) =>
      found.findIndex((candidate) => candidate.kind === entry.kind) !== index,
  );
  if (duplicates.length > 0) {
    throw new Error('F1.19 derivative history is ambiguous.');
  }
  assertDerivativeChain(found);
  return found.sort(
    (left, right) =>
      COMPONENTS.findIndex((entry) => entry.kind === left.kind) -
      COMPONENTS.findIndex((entry) => entry.kind === right.kind),
  );
}

function assertDerivativeChain(entries) {
  const byKind = new Map(entries.map((entry) => [entry.kind, entry]));
  const payload = byKind.get('payload');
  const replay = byKind.get('replay');
  const answerQualityCase = byKind.get('case');
  const resolution = byKind.get('resolution');
  const candidate = byKind.get('candidate');
  if (
    (replay && !payload) ||
    (payload && (!answerQualityCase || !resolution || !candidate)) ||
    (answerQualityCase && (!resolution || !candidate)) ||
    (resolution && !candidate)
  ) {
    throw new Error(
      'F1.19 derivative history predecessor chain is incomplete.',
    );
  }
  if (
    replay?.lineage.answerQualityCasePayloadHash &&
    replay.lineage.answerQualityCasePayloadHash !== payload?.lineage.answerQualityCasePayloadHash
  ) {
    throw new Error('F1.20 derivative replay and payload lineage conflict.');
  }
  for (const field of [
    'answerQualityCaseHash',
    'answerQualityCaseDefinitionHash',
    'answerQualityCaseEvaluationHash',
    'payloadContentHash',
    'storedAt',
  ]) {
    if (replay?.lineage[field] && replay.lineage[field] !== payload?.lineage[field]) {
      throw new Error('F1.20 derivative replay definition lineage conflict.');
    }
  }
  if (
    payload?.lineage.answerQualityCaseHash &&
    payload.lineage.answerQualityCaseHash !==
      answerQualityCase.lineage.answerQualityCaseHash
  ) {
    throw new Error('F1.19 derivative payload and case lineage conflict.');
  }
  for (const field of [
    'answerQualityCaseDefinitionHash',
    'answerQualityCaseEvaluationHash',
  ]) {
    if (
      payload?.lineage[field] &&
      payload.lineage[field] !== answerQualityCase.lineage[field]
    ) {
      throw new Error('F1.19 derivative payload definition lineage conflict.');
    }
  }
  if (
    (answerQualityCase &&
      (answerQualityCase.lineage.candidateReviewResolutionHash !==
        resolution.lineage.candidateReviewResolutionHash ||
        answerQualityCase.lineage.candidateHash !==
          candidate.lineage.candidateHash)) ||
    (resolution &&
      resolution.lineage.candidateHash !== candidate.lineage.candidateHash)
  ) {
    throw new Error('F1.19 derivative review lineage conflict.');
  }
  if (
    payload?.lineage.candidateHash &&
    payload.lineage.candidateHash !== candidate.lineage.candidateHash
  ) {
    throw new Error('F1.19 derivative payload candidate lineage conflict.');
  }
  if (
    payload?.lineage.candidateReviewResolutionHash &&
    payload.lineage.candidateReviewResolutionHash !==
      resolution.lineage.candidateReviewResolutionHash
  ) {
    throw new Error('F1.19 derivative payload resolution lineage conflict.');
  }
  assertDerivativeTimeline({
    answerQualityCase,
    candidate,
    payload,
    resolution,
  });
}

function inspectComponentWorkspace({
  component,
  current,
  repoDir,
  workspaceHash,
  workspaceRoot,
}) {
  const entries = [];
  for (const name of readPrivateDirectory(
    workspaceRoot,
    'F1.19 derivative history',
    { repoDir },
  )) {
    const pendingMatch = name.match(component.pendingPattern);
    const final = component.finalPattern.test(name);
    if (!final && !pendingMatch) {
      throw new Error('F1.19 derivative history entry name is invalid.');
    }
    const sourceState = final ? 'final' : 'pending';
    const entry = readComponentEntry({
      component,
      current,
      directory: path.join(workspaceRoot, name),
      entryName: name,
      repoDir,
      sourceState,
      workspaceHash,
    });
    const itemHash = entry.itemHash || pendingMatch?.[1] || name;
    if (
      (final && name !== itemHash) ||
      (!final && pendingMatch?.[1] !== itemHash)
    ) {
      throw new Error('F1.19 derivative history lineage is invalid.');
    }
    entries.push({ ...entry, itemHash, kind: component.kind, name, sourceState });
  }
  return entries;
}

function readComponentEntry({
  component,
  current,
  directory,
  entryName,
  repoDir,
  sourceState,
  workspaceHash,
}) {
  const directoryStat = fs.lstatSync(directory);
  assertPrivateDirectory(directory, 'F1.19 derivative history entry', {
    repoDir,
  });
  const names = readPrivateDirectory(
    directory,
    'F1.19 derivative history entry',
    { repoDir },
  );
  const allowed = allowedFileSets(component.kind, sourceState).some((set) =>
    sameNames(names, set),
  );
  if (!allowed) {
    throw new Error('F1.19 derivative history bundle is invalid.');
  }
  const states = Object.fromEntries(
    names.map((name) => [
      name,
      readPrivateJsonState(
        path.join(directory, name),
        'F1.19 derivative history record',
        { repoDir },
      ),
    ]),
  );
  const values = Object.fromEntries(
    Object.entries(states).map(([name, state]) => [name, state.value]),
  );
  const lineage = validateComponentValues({
    component,
    current,
    entryName,
    sourceState,
    values,
    workspaceHash,
  });
  return {
    directory,
    directoryDev: directoryStat.dev,
    directoryIno: directoryStat.ino,
    files: names.map((name) => ({
      bytesSha256: hashBytes(states[name].bytes),
      dev: states[name].initialFile.dev,
      ino: states[name].initialFile.ino,
      mode: states[name].initialFile.mode & 0o777,
      role: filenameRole(component.kind, name),
      size: states[name].initialFile.size,
    })),
    itemHash: lineage.itemHash,
    lineage,
    recordHash: hash(values),
    workspaceHash: lineage.workspaceHash || workspaceHash,
  };
}

function validateComponentValues({
  component,
  current,
  entryName,
  sourceState,
  values,
  workspaceHash,
}) {
  if (component.kind === 'replay') {
    const request = values['request.json']
      ? assertFineTuningPrivateAnswerQualityCaseReplayRequestRecord(values['request.json'])
      : null;
    const receipt = values['receipt.json']
      ? assertFineTuningPrivateAnswerQualityCaseReplayRecord(values['receipt.json'])
      : null;
    if (!request ||
      request.workspace.workspaceHash !== workspaceHash ||
      (sourceState === 'final' && entryName !== request.item.itemHash) ||
      (sourceState === 'pending' && entryName !== `${'.fine-tuning-private-answer-quality-case-replay-pending-'}${request.item.itemHash}-${request.replayRequestHash}`)) {
      throw new Error('F1.20 derivative replay history is invalid.');
    }
    if (sourceState === 'final' && !receipt) {
      throw new Error('F1.20 derivative replay final history is incomplete.');
    }
    if (receipt) assertFineTuningPrivateAnswerQualityCaseReplayRelation({ receipt, request });
    return assertCurrentComponentLineage(current, {
      answerQualityCaseDefinitionHash: receipt?.bindings.answerQualityCaseDefinitionHash || null,
      answerQualityCaseEvaluationHash: receipt?.bindings.answerQualityCaseEvaluationHash || null,
      answerQualityCaseHash: request.answerQualityCase.answerQualityCaseHash,
      answerQualityCasePayloadHash: request.payload.answerQualityCasePayloadHash,
      payloadContentHash: receipt?.bindings.payloadContentHash || null,
      deleteBy: receipt?.sourceObservation.deleteBy || null,
      expiresAt: receipt?.sourceObservation.expiresAt || null,
      itemHash: request.item.itemHash,
      replayCompletedAt: receipt?.replayCompletedAt || null,
      replayRequestedAt: request.requestRecord.requestedAt,
      storedAt: receipt?.sourceObservation.payloadStoredAt || null,
      workspaceHash: request.workspace.workspaceHash,
    });
  }
  if (component.kind === 'payload') {
    if (!values['decision.json']) {
      return { itemHash: null, workspaceHash };
    }
    const decision =
      assertFineTuningPrivateAnswerQualityCasePayloadDecisionRecord(
        values['decision.json'],
      );
    const payload = values['payload.json']
      ? assertFineTuningPrivateAnswerQualityCasePayloadRecord(
        values['payload.json'],
      )
      : null;
    if (payload) {
      if (
        payload.item.itemHash !== decision.item.itemHash ||
        payload.workspace.workspaceHash !== decision.workspace.workspaceHash ||
        payload.bindings.payloadDecisionHash !== decision.decisionHash ||
        payload.answerQualityCase.answerQualityCaseHash !==
          decision.answerQualityCase.answerQualityCaseHash
      ) {
        throw new Error('F1.19 derivative payload lineage is invalid.');
      }
    }
    if (
      decision.workspace.workspaceHash !== workspaceHash ||
      (sourceState === 'final' && entryName !== decision.item.itemHash) ||
      (sourceState === 'pending' &&
        entryName !==
          `.fine-tuning-private-answer-quality-case-payload-pending-` +
            `${decision.item.itemHash}-${decision.decisionHash}`)
    ) {
      throw new Error('F1.19 derivative payload history is invalid.');
    }
    return assertCurrentComponentLineage(current, {
      admissionHash: payload?.admission.admissionHash || null,
      answerQualityCaseDefinitionHash:
        payload?.bindings.answerQualityCaseDefinitionHash || null,
      answerQualityCaseEvaluationHash:
        payload?.bindings.answerQualityCaseEvaluationHash || null,
      answerQualityCaseHash:
        payload?.answerQualityCase.answerQualityCaseHash ||
        decision.answerQualityCase.answerQualityCaseHash,
      answerQualityCasePayloadHash:
        payload?.answerQualityCasePayloadHash || null,
      payloadContentHash: payload?.bindings.payloadContentHash || null,
      candidateHash: payload?.candidate.candidateHash || null,
      candidateReviewResolutionHash:
        payload?.candidateReviewResolution.candidateReviewResolutionHash || null,
      contentHash: payload?.bindings.contentHash || null,
      decisionDecidedAt: decision.decisionRecord.decidedAt,
      deleteBy: payload?.sourceObservation.deleteBy || null,
      expiresAt: payload?.sourceObservation.expiresAt || null,
      itemHash: decision.item.itemHash,
      materializedAt:
        payload?.sourceObservation.answerQualityCaseMaterializedAt || null,
      objective: payload?.payload.objective || null,
      payloadDecisionDecidedAt:
        payload?.sourceObservation.payloadDecisionDecidedAt || null,
      response: payload?.payload.caseDefinition.answer.text || null,
      storedAt: payload?.storedAt || null,
      workspaceHash: decision.workspace.workspaceHash,
    });
  }
  if (component.kind === 'case') {
    if (!values['case.json']) {
      return { itemHash: null, workspaceHash };
    }
    const record = assertFineTuningPrivateAnswerQualityCaseRecord(
      values['case.json'],
    );
    if (
      record.workspace.workspaceHash !== workspaceHash ||
      (sourceState === 'final' && entryName !== record.item.itemHash) ||
      (sourceState === 'pending' &&
        entryName !==
          `.fine-tuning-private-answer-quality-case-pending-` +
            `${record.item.itemHash}-` +
            record.candidateReviewResolution.candidateReviewResolutionHash)
    ) {
      throw new Error('F1.19 derivative case history is invalid.');
    }
    return assertCurrentComponentLineage(current, {
      admissionHash: record.admission.admissionHash,
      answerQualityCaseDefinitionHash:
        record.bindings.answerQualityCaseDefinitionHash,
      answerQualityCaseEvaluationHash:
        record.bindings.answerQualityCaseEvaluationHash,
      answerQualityCaseHash: record.answerQualityCaseHash,
      candidateHash: record.candidate.candidateHash,
      candidateReviewResolutionHash:
        record.candidateReviewResolution.candidateReviewResolutionHash,
      contentHash: record.bindings.contentHash,
      candidateObservedAt: record.sourceObservation.candidateObservedAt,
      candidateReviewResolvedAt:
        record.sourceObservation.candidateReviewResolvedAt,
      deleteBy: record.sourceObservation.deleteBy,
      expiresAt: record.sourceObservation.expiresAt,
      itemHash: record.item.itemHash,
      itemStoredAt: record.sourceObservation.itemStoredAt,
      materializedAt: record.materializedAt,
      workspaceHash: record.workspace.workspaceHash,
    });
  }
  if (component.kind === 'resolution') {
    const decision = values['decision.json']
      ? assertStoredF1_17Decision(values['decision.json'])
      : null;
    const resolution = values['resolution.json']
      ? assertFineTuningPrivateAnswerQualityEnrichmentCandidateReviewResolutionRecord(
          values['resolution.json'],
        )
      : null;
    if (decision && resolution) {
      const exact =
        decision.decisionHash === resolution.decisionHash &&
        JSON.stringify(decision.decisionRecord) ===
          JSON.stringify(resolution.decisionRecord) &&
        JSON.stringify(decision.admission) ===
          JSON.stringify(resolution.admission) &&
        JSON.stringify(decision.candidate) ===
          JSON.stringify(resolution.candidate) &&
        JSON.stringify(decision.item) === JSON.stringify(resolution.item) &&
        JSON.stringify(decision.workspace) ===
          JSON.stringify(resolution.workspace);
      if (!exact) {
        throw new Error('F1.19 derivative resolution decision lineage is invalid.');
      }
    }
    const record = resolution || decision;
    if (!record) {
      return { itemHash: null, workspaceHash };
    }
    if (
      !isReference(record.item, 'itemHash') ||
      !isReference(record.workspace, 'workspaceHash') ||
      record.workspace.workspaceHash !== workspaceHash ||
      (sourceState === 'final' && entryName !== record.item.itemHash) ||
      (sourceState === 'pending' &&
        entryName !==
          `.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-` +
            `${record.item.itemHash}-${record.decisionHash}`)
    ) {
      throw new Error('F1.19 derivative resolution history is invalid.');
    }
    return assertCurrentComponentLineage(current, {
      admissionHash: record.admission.admissionHash,
      candidateHash: record.candidate.candidateHash,
      candidateReviewResolutionHash:
        resolution?.candidateReviewResolutionHash || null,
      candidateObservedAt:
        resolution?.sourceObservation.candidateObservedAt || null,
      contentHash: resolution?.bindings.contentHash || null,
      decisionDecidedAt: record.decisionRecord.decidedAt,
      deleteBy: resolution?.sourceObservation.deleteBy || null,
      expiresAt: resolution?.sourceObservation.expiresAt || null,
      itemHash: record.item.itemHash,
      itemStoredAt: resolution?.sourceObservation.itemStoredAt || null,
      resolvedAt: resolution?.resolvedAt || null,
      workspaceHash: record.workspace.workspaceHash,
    });
  }
  if (!values['candidate.json']) {
    return { itemHash: null, workspaceHash };
  }
  const record = assertFineTuningPrivateAnswerQualityEnrichmentCandidateRecord(
    values['candidate.json'],
  );
  if (
    record.workspace.workspaceHash !== workspaceHash ||
    (sourceState === 'final' && entryName !== record.item.itemHash) ||
    (sourceState === 'pending' &&
      entryName !==
        `.private-answer-quality-case-pending-${record.item.itemHash}-` +
          record.bindings.answerQualityCaseEnrichmentInputHash)
  ) {
    throw new Error('F1.19 derivative candidate history is invalid.');
  }
  return assertCurrentComponentLineage(current, {
    admissionHash: record.admission.admissionHash,
    candidateHash: record.candidateHash,
    contentHash: record.bindings.contentHash,
    deleteBy: record.sourceObservation.deleteBy,
    expiresAt: record.sourceObservation.expiresAt,
    itemHash: record.item.itemHash,
    itemStoredAt: record.sourceObservation.itemStoredAt,
    observedAt: record.observedAt,
    workspaceHash: record.workspace.workspaceHash,
  });
}

function assertCurrentComponentLineage(current, lineage) {
  if (lineage.itemHash !== current.item?.itemHash) {
    return lineage;
  }
  const valid =
    lineage.workspaceHash === current.workspace.workspaceHash &&
    (!lineage.admissionHash ||
      lineage.admissionHash === current.admission.admissionHash) &&
    (!lineage.contentHash ||
      lineage.contentHash === current.item.bindings.contentHash) &&
    (!lineage.deleteBy ||
      lineage.deleteBy === current.item.retention.deleteBy) &&
    (!lineage.expiresAt || lineage.expiresAt === current.item.expiresAt) &&
    (!lineage.itemStoredAt ||
      lineage.itemStoredAt === current.item.storedAt) &&
    (!lineage.objective ||
      lineage.objective === current.item.example.instruction) &&
    (!lineage.response || lineage.response === current.item.example.response) &&
    (!lineage.decisionDecidedAt ||
      (Date.parse(lineage.decisionDecidedAt) >=
        Date.parse(current.item.storedAt) &&
        Date.parse(lineage.decisionDecidedAt) <
          Date.parse(current.item.expiresAt) &&
        Date.parse(lineage.decisionDecidedAt) <
          Date.parse(current.item.retention.deleteBy)));
  if (!valid) {
    throw new Error(
      'F1.19 derivative history conflicts with the canonical private item.',
    );
  }
  return lineage;
}

function assertDerivativeTimeline({
  answerQualityCase,
  candidate,
  payload,
  resolution,
}) {
  const candidateLineage = candidate?.lineage;
  const resolutionLineage = resolution?.lineage;
  const caseLineage = answerQualityCase?.lineage;
  const payloadLineage = payload?.lineage;
  const invalidResolution =
    resolutionLineage &&
    (Date.parse(resolutionLineage.decisionDecidedAt) <
      Date.parse(candidateLineage.observedAt) ||
      Date.parse(resolutionLineage.decisionDecidedAt) >=
        Date.parse(candidateLineage.expiresAt) ||
      Date.parse(resolutionLineage.decisionDecidedAt) >=
        Date.parse(candidateLineage.deleteBy) ||
      (resolutionLineage.candidateObservedAt &&
        resolutionLineage.candidateObservedAt !== candidateLineage.observedAt) ||
      (resolutionLineage.itemStoredAt &&
        resolutionLineage.itemStoredAt !== candidateLineage.itemStoredAt) ||
      (resolutionLineage.expiresAt &&
        resolutionLineage.expiresAt !== candidateLineage.expiresAt) ||
      (resolutionLineage.deleteBy &&
        resolutionLineage.deleteBy !== candidateLineage.deleteBy) ||
      (resolutionLineage.resolvedAt &&
        (Date.parse(resolutionLineage.resolvedAt) <
          Date.parse(resolutionLineage.decisionDecidedAt) ||
          Date.parse(resolutionLineage.resolvedAt) >=
            Date.parse(candidateLineage.expiresAt) ||
          Date.parse(resolutionLineage.resolvedAt) >=
            Date.parse(candidateLineage.deleteBy))));
  const invalidCase =
    caseLineage &&
    (caseLineage.candidateObservedAt !== candidateLineage.observedAt ||
      caseLineage.candidateReviewResolvedAt !== resolutionLineage.resolvedAt ||
      caseLineage.itemStoredAt !== candidateLineage.itemStoredAt ||
      caseLineage.expiresAt !== candidateLineage.expiresAt ||
      caseLineage.deleteBy !== candidateLineage.deleteBy ||
      Date.parse(caseLineage.materializedAt) <
        Date.parse(resolutionLineage.resolvedAt) ||
      Date.parse(caseLineage.materializedAt) >=
        Date.parse(candidateLineage.expiresAt) ||
      Date.parse(caseLineage.materializedAt) >=
        Date.parse(candidateLineage.deleteBy));
  const invalidPayload =
    payloadLineage &&
    (Date.parse(payloadLineage.decisionDecidedAt) <
      Date.parse(caseLineage.materializedAt) ||
      Date.parse(payloadLineage.decisionDecidedAt) >=
        Date.parse(candidateLineage.expiresAt) ||
      Date.parse(payloadLineage.decisionDecidedAt) >=
        Date.parse(candidateLineage.deleteBy) ||
      (payloadLineage.materializedAt &&
        payloadLineage.materializedAt !== caseLineage.materializedAt) ||
      (payloadLineage.payloadDecisionDecidedAt &&
        payloadLineage.payloadDecisionDecidedAt !==
          payloadLineage.decisionDecidedAt) ||
      (payloadLineage.expiresAt &&
        payloadLineage.expiresAt !== candidateLineage.expiresAt) ||
      (payloadLineage.deleteBy &&
        payloadLineage.deleteBy !== candidateLineage.deleteBy) ||
      (payloadLineage.storedAt &&
        (Date.parse(payloadLineage.storedAt) <
          Date.parse(payloadLineage.decisionDecidedAt) ||
          Date.parse(payloadLineage.storedAt) >=
            Date.parse(candidateLineage.expiresAt) ||
          Date.parse(payloadLineage.storedAt) >=
            Date.parse(candidateLineage.deleteBy))));
  if (invalidResolution || invalidCase || invalidPayload) {
    throw new Error(
      'F1.19 derivative history timeline conflicts with its predecessor chain.',
    );
  }
}

function allowedFileSets(kind, sourceState) {
  if (kind === 'replay') {
    return sourceState === 'final'
      ? [['receipt.json', 'request.json']]
      : [[], ['request.json'], ['receipt.json', 'request.json']];
  }
  if (kind === 'payload') {
    return sourceState === 'final'
      ? [['decision.json'], ['decision.json', 'payload.json']]
      : [[], ['decision.json'], ['decision.json', 'payload.json']];
  }
  if (kind === 'case') {
    return sourceState === 'final' ? [['case.json']] : [[], ['case.json']];
  }
  if (kind === 'resolution') {
    return sourceState === 'final'
      ? [['decision.json', 'resolution.json']]
      : [[], ['decision.json'], ['decision.json', 'resolution.json']];
  }
  return sourceState === 'final' ? [['candidate.json']] : [[], ['candidate.json']];
}

function toInventoryComponent(entry) {
  return {
    directoryDev: entry.directoryDev,
    directoryIno: entry.directoryIno,
    entryNameSha256: hash(entry.name),
    files: entry.files,
    kind: entry.kind,
    recordHash: entry.recordHash,
    sourceState: entry.sourceState,
  };
}

function assertStagedComponent({
  component,
  directory,
  files = component.files,
  repoDir,
}) {
  const stat = fs.lstatSync(directory);
  assertPrivateDirectory(directory, 'F1.19 deletion cascade staged component', {
    repoDir,
  });
  if (
    stat.dev !== component.directoryDev ||
    stat.ino !== component.directoryIno
  ) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade staged directory changed.',
    );
  }
  const names = readPrivateDirectory(
    directory,
    'F1.19 deletion cascade staged component',
    { repoDir },
  );
  const expectedNames = files.map((file) =>
    roleFilename(component.kind, file.role),
  );
  if (!sameNames(names, expectedNames)) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade staged bundle changed.',
    );
  }
  const values = {};
  for (const file of files) {
    const filename = path.join(directory, roleFilename(component.kind, file.role));
    const state = readPrivateJsonState(
      filename,
      'F1.19 deletion cascade staged record',
      { repoDir },
    );
    if (
      state.initialFile.dev !== file.dev ||
      state.initialFile.ino !== file.ino ||
      (state.initialFile.mode & 0o777) !== file.mode ||
      state.initialFile.size !== file.size ||
      hashBytes(state.bytes) !== file.bytesSha256
    ) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade staged record changed.',
      );
    }
    values[path.basename(filename)] = state.value;
  }
  return values;
}

function assertCascadeStaging({
  cleanupStarted,
  current,
  directory,
  inventory,
  repoDir,
}) {
  const staging = path.join(directory, 'staged');
  assertPrivateDirectory(staging, 'F1.19 deletion cascade staging', { repoDir });
  const names = readPrivateDirectory(
    staging,
    'F1.19 deletion cascade staging',
    { repoDir },
  );
  const expectedNames = inventory.components.map((component, index) =>
    path.basename(stagedDirectory(directory, index, component.kind)),
  );
  const expectedCurrentNames = cleanupStarted
    ? expectedNames.slice(expectedNames.length - names.length)
    : expectedNames.slice(0, names.length);
  if (!sameNames(names, expectedCurrentNames)) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade staging sequence is invalid.',
    );
  }

  const firstIndex = cleanupStarted
    ? inventory.components.length - names.length
    : 0;
  const stagedComponents = [];
  for (const [offset, component] of inventory.components
    .slice(firstIndex, firstIndex + names.length)
    .entries()) {
    const index = firstIndex + offset;
    const componentDirectory = stagedDirectory(directory, index, component.kind);
    const files = remainingStagedFiles({
      component,
      directory: componentDirectory,
      repoDir,
    });
    const values = assertStagedComponent({
      component,
      directory: componentDirectory,
      files,
      repoDir,
    });
    stagedComponents.push({ component, files });
    if (cleanupStarted && files.length !== 0) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade cleanup contains staged content.',
      );
    }
    if (files.length === 0) {
      continue;
    }
    const entryName = stagedEntryName(component, values);
    const lineage = validateComponentValues({
      component,
      current,
      entryName,
      sourceState: component.sourceState,
      values,
      workspaceHash: inventory.workspaceHash,
    });
    if (
      hash(entryName) !== component.entryNameSha256 ||
      lineage.itemHash !== inventory.itemHash
    ) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade staged lineage is invalid.',
      );
    }
  }
  if (!cleanupStarted) {
    if (names.length < expectedNames.length) {
      const deletionStarted = stagedComponents.some(
        ({ component, files }) => files.length !== component.files.length,
      );
      if (deletionStarted) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade deleted content before staging completed.',
        );
      }
    } else {
      assertGlobalStagedDeletionOrder(stagedComponents);
    }
  }
}

function assertGlobalStagedDeletionOrder(stagedComponents) {
  let foundRemainingFile = false;

  for (const { component, files } of stagedComponents) {
    const remainingRoles = new Set(files.map((file) => file.role));
    for (const file of deletionOrder(component)) {
      if (remainingRoles.has(file.role)) {
        foundRemainingFile = true;
        continue;
      }
      if (foundRemainingFile) {
        throw new Error(
          'Fine-tuning private answer quality deletion cascade staged deletion order is invalid.',
        );
      }
    }
  }
}

function stagedEntryName(component, values) {
  if (component.kind === 'replay') {
    const request = values['request.json'];
    return component.sourceState === 'final'
      ? String(request?.item?.itemHash)
      : `.fine-tuning-private-answer-quality-case-replay-pending-${request?.item?.itemHash}-${request?.replayRequestHash}`;
  }
  if (component.kind === 'payload') {
    const decision = values['decision.json'];
    return component.sourceState === 'final'
      ? String(decision?.item?.itemHash)
      : `.fine-tuning-private-answer-quality-case-payload-pending-` +
          `${decision?.item?.itemHash}-${decision?.decisionHash}`;
  }
  if (component.kind === 'case') {
    const record = values['case.json'];
    return component.sourceState === 'final'
      ? String(record?.item?.itemHash)
      : `.fine-tuning-private-answer-quality-case-pending-` +
          `${record?.item?.itemHash}-` +
          `${record?.candidateReviewResolution?.candidateReviewResolutionHash}`;
  }
  if (component.kind === 'resolution') {
    const record = values['resolution.json'] || values['decision.json'];
    return component.sourceState === 'final'
      ? String(record?.item?.itemHash)
      : `.fine-tuning-private-answer-quality-enrichment-candidate-review-resolution-pending-` +
          `${record?.item?.itemHash}-${record?.decisionHash}`;
  }
  const record = values['candidate.json'];
  return component.sourceState === 'final'
    ? String(record?.item?.itemHash)
    : `.private-answer-quality-case-pending-${record?.item?.itemHash}-` +
        `${record?.bindings?.answerQualityCaseEnrichmentInputHash}`;
}

function unlinkPrivateFile({ expected, filename, repoDir }) {
  const state = readPrivateJsonState(
    filename,
    'F1.19 deletion cascade unlink record',
    { repoDir },
  );
  if (
    state.initialFile.dev !== expected.dev ||
    state.initialFile.ino !== expected.ino ||
    (state.initialFile.mode & 0o777) !== expected.mode ||
    state.initialFile.size !== expected.size ||
    hashBytes(state.bytes) !== expected.bytesSha256
  ) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade unlink record changed.',
    );
  }
  const descriptor = fs.openSync(
    filename,
    fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0),
  );
  try {
    const before = fs.fstatSync(descriptor);
    if (
      before.nlink !== 1 ||
      before.dev !== expected.dev ||
      before.ino !== expected.ino
    ) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade unlink link state changed.',
      );
    }
    fs.unlinkSync(filename);
    const after = fs.fstatSync(descriptor);
    if (after.nlink !== 0) {
      throw new Error(
        'Fine-tuning private answer quality deletion cascade unlink absence is incomplete.',
      );
    }
  } finally {
    fs.closeSync(descriptor);
  }
}

function assertDerivativeAbsence({ current, decision, repoDir }) {
  const remaining = inspectDerivativeState({
    current,
    itemHash: decision.item.itemHash,
    repoDir,
  });
  if (remaining.length !== 0) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade derivative absence check failed.',
    );
  }
}

function buildReceipt({ current, decision, inventory, terminalBundle }) {
  const content = receiptContent({
    current,
    decision,
    inventory,
    observedAt: new Date().toISOString(),
    terminalBundle,
  });
  return { ...content, absenceReceiptHash: hash(content) };
}

function receiptContent({
  current,
  decision,
  inventory,
  observedAt,
  terminalBundle,
}) {
  return {
    cascadeInventoryHash: inventory.inventoryHash,
    decisionHash: decision.decisionHash,
    derivativeMatchingCount: 0,
    derivativePathsAbsent: true,
    itemHash: decision.item.itemHash,
    itemPathAbsent: true,
    managedNamespaceOnly: true,
    observedAt,
    pendingDerivativeCount: 0,
    productionReadyClaim: false,
    schemaVersion: CASCADE_RECEIPT_SCHEMA_VERSION,
    terminalHashes: hashTerminalBundle(terminalBundle),
    withdrawalReferenceSha256: decision.withdrawalReferenceSha256,
    workspaceHash: decision.workspace.workspaceHash,
  };
}

function assertFinalReceipt({
  cascade,
  current,
  decision,
  terminalBundle,
}) {
  if (!cascade?.receipt) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade final receipt is missing.',
    );
  }
  assertReceipt({
    current,
    decision,
    inventory: cascade.inventory,
    receipt: cascade.receipt,
    terminalBundle,
  });
}

function assertReceipt({
  current,
  decision,
  inventory,
  receipt,
  terminalBundle,
}) {
  const { absenceReceiptHash, ...content } = receipt || {};
  const observedAt = normalizeTimestamp(content.observedAt);
  const expected = receiptContent({
    current,
    decision,
    inventory,
    observedAt,
    terminalBundle,
  });
  const valid =
    observedAt === content.observedAt &&
    JSON.stringify(content) === JSON.stringify(expected) &&
    absenceReceiptHash === hash(expected);
  if (!valid) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade absence receipt is invalid.',
    );
  }
}

function assertInventoryRecord(inventory) {
  const { inventoryHash, ...content } = inventory || {};
  const valid =
    inventory &&
    typeof inventory === 'object' &&
    !Array.isArray(inventory) &&
    sameNames(Object.keys(inventory), [
      'components',
      'decisionHash',
      'inventoryHash',
      'itemHash',
      'schemaVersion',
      'withdrawalReferenceSha256',
      'workspaceHash',
    ]) &&
    sameNames(Object.keys(content), [
      'components',
      'decisionHash',
      'itemHash',
      'schemaVersion',
      'withdrawalReferenceSha256',
      'workspaceHash',
    ]) &&
    content.schemaVersion === CASCADE_SCHEMA_VERSION &&
    isHash(content.decisionHash) &&
    isHash(content.itemHash) &&
    isHash(content.withdrawalReferenceSha256) &&
    isHash(content.workspaceHash) &&
    Array.isArray(content.components) &&
    content.components.length > 0 &&
    content.components.length <= COMPONENTS.length &&
    content.components.every(isInventoryComponent) &&
    new Set(content.components.map((entry) => entry.kind)).size ===
      content.components.length &&
    JSON.stringify(
      [...content.components].sort(
        (left, right) =>
          COMPONENTS.findIndex((entry) => entry.kind === left.kind) -
          COMPONENTS.findIndex((entry) => entry.kind === right.kind),
      ),
    ) === JSON.stringify(content.components) &&
    inventoryHash === hash(content);
  if (!valid) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade inventory is invalid.',
    );
  }
}

function assertInventoryBinding({ current, decision, inventory }) {
  const valid =
    inventory.decisionHash === decision.decisionHash &&
    inventory.itemHash === decision.item.itemHash &&
    inventory.withdrawalReferenceSha256 ===
      decision.withdrawalReferenceSha256 &&
    inventory.workspaceHash === current.workspace.workspaceHash;
  if (!valid) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade inventory conflicts with the lifecycle decision.',
    );
  }
}

function assertReceiptRecord({ inventory, receipt }) {
  const { absenceReceiptHash, ...content } = receipt || {};
  const valid =
    sameNames(Object.keys(content), [
      'cascadeInventoryHash',
      'decisionHash',
      'derivativeMatchingCount',
      'derivativePathsAbsent',
      'itemHash',
      'itemPathAbsent',
      'managedNamespaceOnly',
      'observedAt',
      'pendingDerivativeCount',
      'productionReadyClaim',
      'schemaVersion',
      'terminalHashes',
      'withdrawalReferenceSha256',
      'workspaceHash',
    ]) &&
    content.cascadeInventoryHash === inventory.inventoryHash &&
    content.decisionHash === inventory.decisionHash &&
    content.derivativeMatchingCount === 0 &&
    content.derivativePathsAbsent === true &&
    content.itemHash === inventory.itemHash &&
    content.itemPathAbsent === true &&
    content.managedNamespaceOnly === true &&
    normalizeTimestamp(content.observedAt) === content.observedAt &&
    content.pendingDerivativeCount === 0 &&
    content.productionReadyClaim === false &&
    content.schemaVersion === CASCADE_RECEIPT_SCHEMA_VERSION &&
    content.withdrawalReferenceSha256 ===
      inventory.withdrawalReferenceSha256 &&
    content.workspaceHash === inventory.workspaceHash &&
    content.terminalHashes &&
    sameNames(Object.keys(content.terminalHashes), [
      'decisionHash',
      'receiptHash',
      'tombstoneHash',
    ]) &&
    Object.values(content.terminalHashes).every(isHash) &&
    absenceReceiptHash === hash(content);
  if (!valid) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade absence receipt record is invalid.',
    );
  }
}

function isInventoryComponent(value) {
  const validShape =
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    sameNames(Object.keys(value), [
      'directoryDev',
      'directoryIno',
      'entryNameSha256',
      'files',
      'kind',
      'recordHash',
      'sourceState',
    ]) &&
    COMPONENTS.some((entry) => entry.kind === value.kind) &&
    ['final', 'pending'].includes(value.sourceState) &&
    Number.isInteger(value.directoryDev) &&
    Number.isInteger(value.directoryIno) &&
    isHash(value.entryNameSha256) &&
    isHash(value.recordHash) &&
    Array.isArray(value.files) &&
    value.files.every(isInventoryFile);
  if (!validShape) {
    return false;
  }
  const roles = value.files.map((file) => file.role);
  return allowedFileSets(value.kind, value.sourceState).some((filenames) =>
    sameNames(
      roles,
      filenames.map((filename) => filenameRole(value.kind, filename)),
    ),
  );
}

function isInventoryFile(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    sameNames(Object.keys(value), [
      'bytesSha256',
      'dev',
      'ino',
      'mode',
      'role',
      'size',
    ]) &&
    isHash(value.bytesSha256) &&
    Number.isInteger(value.dev) &&
    Number.isInteger(value.ino) &&
    value.mode === 0o600 &&
    typeof value.role === 'string' &&
    Number.isInteger(value.size) &&
    value.size > 0
  );
}

function assertNoUnfinishedCascade({ current, decision, repoDir }) {
  const state = inspectCascadeHistory({ current, decision, repoDir });
  if (state.pending) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade pending history requires recovery.',
    );
  }
}

function assertLifecycleBinding(current, decision) {
  const valid =
    decision.workspace.id === current.workspace.id &&
    decision.workspace.workspaceHash === current.workspace.workspaceHash &&
    decision.admission.id === current.admission.id &&
    decision.admission.admissionHash === current.admission.admissionHash &&
    decision.item.itemHash === current.decision.item.itemHash &&
    decision.withdrawalReferenceSha256 ===
      current.admission.envelope.retention.withdrawalReferenceSha256;
  if (!valid) {
    throw new Error(
      'Fine-tuning private answer quality deletion cascade lifecycle binding is invalid.',
    );
  }
}

function hashTerminalBundle(bundle) {
  return {
    decisionHash: bundle.decision.decisionHash,
    receiptHash: bundle.receipt.receiptHash,
    tombstoneHash: bundle.tombstone.tombstoneHash,
  };
}

function stagedDirectory(cascadeDirectory, index, kind) {
  return path.join(
    cascadeDirectory,
    'staged',
    `${String(index + 1).padStart(2, '0')}-${kind}`,
  );
}

function filenameRole(kind, filename) {
  const roles = {
    candidate: { 'candidate.json': 'candidate' },
    case: { 'case.json': 'case' },
    payload: {
      'decision.json': 'payload-decision',
      'payload.json': 'payload',
    },
    replay: {
      'receipt.json': 'replay-receipt',
      'request.json': 'replay-request',
    },
    resolution: {
      'decision.json': 'resolution-decision',
      'resolution.json': 'resolution',
    },
  };
  const role = roles[kind]?.[filename];
  if (!role) {
    throw new Error('F1.19 derivative history filename is invalid.');
  }
  return role;
}

function roleFilename(kind, role) {
  const filenames = {
    candidate: { candidate: 'candidate.json' },
    case: { case: 'case.json' },
    payload: {
      'payload-decision': 'decision.json',
      payload: 'payload.json',
    },
    replay: {
      'replay-receipt': 'receipt.json',
      'replay-request': 'request.json',
    },
    resolution: {
      'resolution-decision': 'decision.json',
      resolution: 'resolution.json',
    },
  };
  const filename = filenames[kind]?.[role];
  if (!filename) {
    throw new Error('F1.19 derivative history role is invalid.');
  }
  return filename;
}

function isReference(value, field) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.id === 'string' &&
    isHash(value[field])
  );
}

function normalizeTimestamp(value) {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashBytes(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function sameNames(actual, expected) {
  return (
    JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort())
  );
}
