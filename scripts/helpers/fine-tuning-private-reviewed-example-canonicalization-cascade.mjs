import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt,
} from '../../src/core/fine-tuning-private-reviewed-example-canonicalization.mjs';
import { assertApprovedTrainingRecordForDataset } from '../../src/core/training-dataset-quality.mjs';
import {
  assertPrivateDirectory,
  ensurePrivateDirectoryChain,
  fsyncPrivateDirectory,
  makePrivateDirectory,
  readPrivateDirectory,
  readPrivateJsonState,
  writeExclusivePrivateJson,
} from './private-json-state.mjs';

const CASCADE_HISTORY = 'private-reviewed-example-canonical-record-deletion-cascades';
const CANONICAL_RECORDS = 'private-reviewed-example-canonical-records';
const DELETION_RECEIPT_SCHEMA =
  'personal-ai-agent-private-reviewed-example-canonicalization-deletion-receipt/v1';
const INVENTORY_SCHEMA =
  'personal-ai-agent-private-reviewed-example-canonicalization-deletion-inventory/v1';
const PENDING_PREFIX = '.pending-';

function hash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function sameNames(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function requireExactKeys(value, keys, label) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !sameNames(Object.keys(value).sort(), [...keys].sort())
  ) {
    throw new Error(`Private reviewed example canonicalization ${label} is invalid.`);
  }
}

function applies(current) {
  return (
    current?.item?.lane === 'reviewed-examples' ||
    current?.admission?.envelope?.lane === 'reviewed-examples'
  );
}

function pathsFor({ current, decision, repoDir }) {
  const workspaceHash = current.workspace.workspaceHash;
  const historyRoot = path.join(
    repoDir,
    'var',
    'fine-tuning',
    CASCADE_HISTORY,
    workspaceHash,
  );
  return {
    finalDirectory: path.join(historyRoot, decision.withdrawalReferenceSha256),
    historyRoot,
    pendingDirectory: path.join(historyRoot, `${PENDING_PREFIX}${decision.decisionHash}`),
    recordDirectory: path.join(
      repoDir,
      'var',
      'fine-tuning',
      CANONICAL_RECORDS,
      workspaceHash,
      decision.item.itemHash,
    ),
  };
}

function buildInventory({ canonicalReceipt, current, decision, record }) {
  const content = {
    admissionHash: canonicalReceipt.admission.admissionHash,
    artifactPreparationResolutionHash:
      canonicalReceipt.artifactPreparationResolution.artifactPreparationResolutionHash,
    canonicalizationReceiptSha256: hash(canonicalReceipt),
    contentHash: record.contentHash,
    decisionHash: decision.decisionHash,
    itemHash: decision.item.itemHash,
    recordId: record.id,
    recordSha256: hash(record),
    schemaVersion: INVENTORY_SCHEMA,
    sourceBinding: canonicalReceipt.sourceBinding,
    withdrawalReferenceSha256: decision.withdrawalReferenceSha256,
    workspaceHash: current.workspace.workspaceHash,
  };
  const inventoryHash = hash(content);
  return {
    ...content,
    id: `private-reviewed-example-canonicalization-deletion-inventory-${inventoryHash}`,
    inventoryHash,
  };
}

function assertInventory(inventory, { current, decision } = {}) {
  requireExactKeys(inventory, [
    'admissionHash',
    'artifactPreparationResolutionHash',
    'canonicalizationReceiptSha256',
    'contentHash',
    'decisionHash',
    'id',
    'inventoryHash',
    'itemHash',
    'recordId',
    'recordSha256',
    'schemaVersion',
    'sourceBinding',
    'withdrawalReferenceSha256',
    'workspaceHash',
  ], 'deletion inventory');
  requireExactKeys(
    inventory.sourceBinding,
    ['lineageSha256', 'referenceSha256', 'scopeReferenceSha256'],
    'deletion inventory source binding',
  );
  const { id, inventoryHash, ...content } = inventory;
  if (
    inventory.schemaVersion !== INVENTORY_SCHEMA ||
    ![
      inventory.admissionHash,
      inventory.artifactPreparationResolutionHash,
      inventory.canonicalizationReceiptSha256,
      inventory.contentHash,
      inventory.decisionHash,
      inventory.inventoryHash,
      inventory.itemHash,
      inventory.recordSha256,
      inventory.withdrawalReferenceSha256,
      inventory.workspaceHash,
      ...Object.values(inventory.sourceBinding),
    ].every(isHash) ||
    typeof inventory.recordId !== 'string' ||
    !inventory.recordId ||
    inventoryHash !== hash(content) ||
    id !== `private-reviewed-example-canonicalization-deletion-inventory-${inventoryHash}` ||
    (current && (
      inventory.admissionHash !== current.admission.admissionHash ||
      inventory.workspaceHash !== current.workspace.workspaceHash
    )) ||
    (decision && (
      inventory.decisionHash !== decision.decisionHash ||
      inventory.itemHash !== decision.item.itemHash ||
      inventory.withdrawalReferenceSha256 !== decision.withdrawalReferenceSha256
    ))
  ) {
    throw new Error('Private reviewed example canonicalization deletion inventory is invalid.');
  }
  return inventory;
}

function buildAbsenceReceipt(inventory) {
  const content = {
    canonicalizationReceiptSha256: inventory.canonicalizationReceiptSha256,
    contentHash: inventory.contentHash,
    decisionHash: inventory.decisionHash,
    deletedBeforeItem: true,
    externalProviderCalls: 'none',
    inventoryHash: inventory.inventoryHash,
    itemHash: inventory.itemHash,
    productionReadyClaim: false,
    recordId: inventory.recordId,
    recordSha256: inventory.recordSha256,
    schemaVersion: DELETION_RECEIPT_SCHEMA,
    trainingAuthorized: false,
    withdrawalReferenceSha256: inventory.withdrawalReferenceSha256,
    workspaceHash: inventory.workspaceHash,
  };
  return {
    ...content,
    id: `private-reviewed-example-canonicalization-deletion-receipt-${hash(content)}`,
  };
}

export function assertFineTuningPrivateReviewedExampleCanonicalizationDeletionAbsenceReceipt(
  receipt,
  { current, decision, inventory } = {},
) {
  requireExactKeys(receipt, [
    'canonicalizationReceiptSha256',
    'contentHash',
    'decisionHash',
    'deletedBeforeItem',
    'externalProviderCalls',
    'id',
    'inventoryHash',
    'itemHash',
    'productionReadyClaim',
    'recordId',
    'recordSha256',
    'schemaVersion',
    'trainingAuthorized',
    'withdrawalReferenceSha256',
    'workspaceHash',
  ], 'deletion absence receipt');
  const { id, ...content } = receipt;
  if (
    receipt.schemaVersion !== DELETION_RECEIPT_SCHEMA ||
    ![
      receipt.canonicalizationReceiptSha256,
      receipt.contentHash,
      receipt.decisionHash,
      receipt.inventoryHash,
      receipt.itemHash,
      receipt.recordSha256,
      receipt.withdrawalReferenceSha256,
      receipt.workspaceHash,
    ].every(isHash) ||
    typeof receipt.recordId !== 'string' ||
    !receipt.recordId ||
    receipt.deletedBeforeItem !== true ||
    receipt.externalProviderCalls !== 'none' ||
    receipt.productionReadyClaim !== false ||
    receipt.trainingAuthorized !== false ||
    id !== `private-reviewed-example-canonicalization-deletion-receipt-${hash(content)}` ||
    (current && receipt.workspaceHash !== current.workspace.workspaceHash) ||
    (decision && (
      receipt.decisionHash !== decision.decisionHash ||
      receipt.withdrawalReferenceSha256 !== decision.withdrawalReferenceSha256
    )) ||
    (inventory && (
      receipt.canonicalizationReceiptSha256 !== inventory.canonicalizationReceiptSha256 ||
      receipt.contentHash !== inventory.contentHash ||
      receipt.inventoryHash !== inventory.inventoryHash ||
      receipt.recordId !== inventory.recordId ||
      receipt.recordSha256 !== inventory.recordSha256
    ))
  ) {
    throw new Error(
      'Private reviewed example canonicalization deletion absence receipt is invalid.',
    );
  }
  return receipt;
}

function readCanonicalRecordBundle(directory, current, decision, repoDir) {
  const names = readPrivateDirectory(directory, 'F1.21 canonical record', { repoDir });
  if (!sameNames(names, ['receipt.json', 'record.json'])) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade record bundle is invalid.',
    );
  }
  const record = readPrivateJsonState(
    path.join(directory, 'record.json'),
    'F1.21 canonical record',
    { repoDir },
  ).value;
  const canonicalReceipt = readPrivateJsonState(
    path.join(directory, 'receipt.json'),
    'F1.21 canonical receipt',
    { repoDir },
  ).value;
  assertApprovedTrainingRecordForDataset(record);
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(
    canonicalReceipt,
    { record },
  );
  if (
    canonicalReceipt.admission.admissionHash !== current.admission.admissionHash ||
    canonicalReceipt.item.itemHash !== decision.item.itemHash ||
    canonicalReceipt.workspace.workspaceHash !== current.workspace.workspaceHash
  ) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade record lineage is invalid.',
    );
  }
  return { canonicalReceipt, record };
}

function assertCanonicalReceiptMatchesInventory(receipt, inventory) {
  assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(receipt);
  if (
    hash(receipt) !== inventory.canonicalizationReceiptSha256 ||
    receipt.admission.admissionHash !== inventory.admissionHash ||
    receipt.artifactPreparationResolution.artifactPreparationResolutionHash !==
      inventory.artifactPreparationResolutionHash ||
    receipt.contentHash !== inventory.contentHash ||
    receipt.item.itemHash !== inventory.itemHash ||
    receipt.recordId !== inventory.recordId ||
    receipt.recordSha256 !== inventory.recordSha256 ||
    receipt.workspace.workspaceHash !== inventory.workspaceHash ||
    JSON.stringify(receipt.sourceBinding) !== JSON.stringify(inventory.sourceBinding)
  ) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade receipt lineage is invalid.',
    );
  }
}

function readInventory(pendingDirectory, current, decision, repoDir) {
  const inventory = readPrivateJsonState(
    path.join(pendingDirectory, 'inventory.json'),
    'F1.21 deletion inventory',
    { repoDir },
  ).value;
  return assertInventory(inventory, { current, decision });
}

function inspectStagedRecord(stagedDirectory, inventory, repoDir) {
  const names = readPrivateDirectory(
    stagedDirectory,
    'F1.21 deletion cascade staged record',
    { repoDir },
  );
  if (sameNames(names, ['receipt.json', 'record.json'])) {
    const record = readPrivateJsonState(
      path.join(stagedDirectory, 'record.json'),
      'F1.21 deletion cascade staged record',
      { repoDir },
    ).value;
    const receipt = readPrivateJsonState(
      path.join(stagedDirectory, 'receipt.json'),
      'F1.21 deletion cascade staged receipt',
      { repoDir },
    ).value;
    assertApprovedTrainingRecordForDataset(record);
    assertFineTuningPrivateReviewedExampleCanonicalizationReceipt(receipt, { record });
    if (
      hash(record) !== inventory.recordSha256 ||
      record.id !== inventory.recordId ||
      record.contentHash !== inventory.contentHash
    ) {
      throw new Error(
        'Private reviewed example canonicalization deletion cascade staged record changed.',
      );
    }
    assertCanonicalReceiptMatchesInventory(receipt, inventory);
    return 'complete';
  }
  if (sameNames(names, ['receipt.json'])) {
    const receipt = readPrivateJsonState(
      path.join(stagedDirectory, 'receipt.json'),
      'F1.21 deletion cascade staged receipt',
      { repoDir },
    ).value;
    assertCanonicalReceiptMatchesInventory(receipt, inventory);
    return 'receipt-only';
  }
  if (names.length === 0) {
    return 'empty';
  }
  throw new Error(
    'Private reviewed example canonicalization deletion cascade staged state is invalid.',
  );
}

function readPendingState(pendingDirectory, current, decision, repoDir) {
  assertPrivateDirectory(
    pendingDirectory,
    'F1.21 deletion cascade pending history',
    { repoDir },
  );
  const names = readPrivateDirectory(
    pendingDirectory,
    'F1.21 deletion cascade pending history',
    { repoDir },
  );
  const hasInventory = names.includes('inventory.json');
  const hasReceipt = names.includes('absence-receipt.json');
  const hasStaged = names.includes('record');
  if (
    names.some((name) => !['absence-receipt.json', 'inventory.json', 'record'].includes(name)) ||
    (hasStaged && !hasInventory) ||
    (hasStaged && hasReceipt) ||
    (!hasInventory && !hasReceipt && names.length !== 0)
  ) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade pending state is invalid.',
    );
  }
  const inventory = hasInventory
    ? readInventory(pendingDirectory, current, decision, repoDir)
    : null;
  const receipt = hasReceipt
    ? readPrivateJsonState(
      path.join(pendingDirectory, 'absence-receipt.json'),
      'F1.21 deletion cascade absence receipt',
      { repoDir },
    ).value
    : null;
  if (receipt) {
    assertFineTuningPrivateReviewedExampleCanonicalizationDeletionAbsenceReceipt(
      receipt,
      { current, decision, inventory: inventory || undefined },
    );
  }
  return {
    hasStaged,
    inventory,
    names,
    receipt,
    stagedDirectory: path.join(pendingDirectory, 'record'),
  };
}

function inspectHistory(paths, current, decision, repoDir) {
  if (!fs.lstatSync(paths.historyRoot, { throwIfNoEntry: false })) {
    return { exactFinal: false, exactPending: false };
  }
  const names = readPrivateDirectory(
    paths.historyRoot,
    'F1.21 deletion cascade history',
    { repoDir },
  );
  let exactFinal = false;
  let exactPending = false;
  for (const name of names) {
    const directory = path.join(paths.historyRoot, name);
    const isFinal = /^[a-f0-9]{64}$/u.test(name);
    const isPending = /^\.pending-[a-f0-9]{64}$/u.test(name);
    if (!isFinal && !isPending) {
      throw new Error(
        'Private reviewed example canonicalization deletion cascade history is invalid.',
      );
    }
    if (isFinal) {
      const receipt = readFinalReceipt(directory, repoDir);
      if (name !== receipt.withdrawalReferenceSha256) {
        throw new Error(
          'Private reviewed example canonicalization deletion cascade final path is invalid.',
        );
      }
      if (
        receipt.itemHash === decision.item.itemHash ||
        receipt.withdrawalReferenceSha256 === decision.withdrawalReferenceSha256
      ) {
        if (name !== path.basename(paths.finalDirectory) || exactFinal) {
          throw new Error(
            'Private reviewed example canonicalization deletion cascade final history is ambiguous.',
          );
        }
        assertFineTuningPrivateReviewedExampleCanonicalizationDeletionAbsenceReceipt(
          receipt,
          { current, decision },
        );
        exactFinal = true;
      }
      continue;
    }

    const state = readPendingState(directory, undefined, undefined, repoDir);
    const itemHash = state.inventory?.itemHash || state.receipt?.itemHash;
    const decisionHash = state.inventory?.decisionHash || state.receipt?.decisionHash;
    const exactPath = name === path.basename(paths.pendingDirectory);
    if (
      exactPath ||
      itemHash === decision.item.itemHash ||
      decisionHash === decision.decisionHash
    ) {
      if (name !== path.basename(paths.pendingDirectory) || exactPending) {
        throw new Error(
          'Private reviewed example canonicalization deletion cascade pending history is ambiguous.',
        );
      }
      if (state.inventory) {
        assertInventory(state.inventory, { current, decision });
      }
      if (state.receipt) {
        assertFineTuningPrivateReviewedExampleCanonicalizationDeletionAbsenceReceipt(
          state.receipt,
          { current, decision, inventory: state.inventory || undefined },
        );
      }
      exactPending = true;
    } else if (!itemHash || !decisionHash) {
      throw new Error(
        'Private reviewed example canonicalization deletion cascade foreign pending history is incomplete.',
      );
    }
  }
  if (exactFinal && exactPending) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade final and pending history conflict.',
    );
  }
  return { exactFinal, exactPending };
}

function readFinalReceipt(directory, repoDir) {
  const names = readPrivateDirectory(
    directory,
    'F1.21 deletion cascade final history',
    { repoDir },
  );
  if (!sameNames(names, ['absence-receipt.json'])) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade final history is invalid.',
    );
  }
  const receipt = readPrivateJsonState(
    path.join(directory, 'absence-receipt.json'),
    'F1.21 deletion cascade absence receipt',
    { repoDir },
  ).value;
  return assertFineTuningPrivateReviewedExampleCanonicalizationDeletionAbsenceReceipt(
    receipt,
  );
}

export function prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
  current,
  decision,
  repoDir,
}) {
  if (!applies(current)) {
    return null;
  }
  const paths = pathsFor({ current, decision, repoDir });
  const history = inspectHistory(paths, current, decision, repoDir);
  const recordExists = fs.lstatSync(paths.recordDirectory, { throwIfNoEntry: false });

  if (history.exactFinal) {
    if (recordExists) {
      throw new Error(
        'Private reviewed example canonicalization deletion cascade found resurrected record history.',
      );
    }
    return paths;
  }
  if (!recordExists && !history.exactPending) {
    return null;
  }
  if (!current.item && recordExists) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade found resurrected record history.',
    );
  }

  ensurePrivateDirectoryChain(
    paths.historyRoot,
    'F1.21 deletion cascade history',
    { repoDir },
  );
  if (!history.exactPending) {
    const bundle = readCanonicalRecordBundle(
      paths.recordDirectory,
      current,
      decision,
      repoDir,
    );
    const inventory = buildInventory({
      canonicalReceipt: bundle.canonicalReceipt,
      current,
      decision,
      record: bundle.record,
    });
    makePrivateDirectory(
      paths.pendingDirectory,
      'F1.21 deletion cascade pending history',
      { repoDir },
    );
    writeExclusivePrivateJson(
      path.join(paths.pendingDirectory, 'inventory.json'),
      inventory,
      'F1.21 deletion inventory',
      { repoDir },
    );
    fsyncPrivateDirectory(
      paths.pendingDirectory,
      'F1.21 deletion cascade pending history',
      { repoDir },
    );
  }

  let state = readPendingState(
    paths.pendingDirectory,
    current,
    decision,
    repoDir,
  );
  if (state.names.length === 0) {
    if (!recordExists) {
      throw new Error(
        'Private reviewed example canonicalization deletion cascade empty pending state is not recoverable.',
      );
    }
    fs.rmdirSync(paths.pendingDirectory);
    fsyncPrivateDirectory(
      paths.historyRoot,
      'F1.21 deletion cascade history',
      { repoDir },
    );
    return prepareFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
      current,
      decision,
      repoDir,
    });
  }

  const sourceExists = fs.lstatSync(paths.recordDirectory, { throwIfNoEntry: false });
  if (state.receipt && sourceExists) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade source reappeared before item deletion.',
    );
  }
  if (state.hasStaged && sourceExists) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade source and staging conflict.',
    );
  }
  if (!state.hasStaged && state.inventory && !state.receipt && sourceExists) {
    const bundle = readCanonicalRecordBundle(
      paths.recordDirectory,
      current,
      decision,
      repoDir,
    );
    const observedInventory = buildInventory({
      canonicalReceipt: bundle.canonicalReceipt,
      current,
      decision,
      record: bundle.record,
    });
    if (JSON.stringify(observedInventory) !== JSON.stringify(state.inventory)) {
      throw new Error(
        'Private reviewed example canonicalization deletion cascade source changed before staging.',
      );
    }
    fs.renameSync(paths.recordDirectory, state.stagedDirectory);
    fsyncPrivateDirectory(
      path.dirname(paths.recordDirectory),
      'F1.21 canonical record history',
      { repoDir },
    );
    fsyncPrivateDirectory(
      paths.pendingDirectory,
      'F1.21 deletion cascade pending history',
      { repoDir },
    );
    state = readPendingState(paths.pendingDirectory, current, decision, repoDir);
  }
  if (!state.hasStaged && state.inventory && !state.receipt && sourceExists) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade did not stage its source.',
    );
  }

  if (state.hasStaged) {
    let stagedState = inspectStagedRecord(
      state.stagedDirectory,
      state.inventory,
      repoDir,
    );
    if (stagedState === 'complete') {
      fs.unlinkSync(path.join(state.stagedDirectory, 'record.json'));
      fsyncPrivateDirectory(
        state.stagedDirectory,
        'F1.21 deletion cascade staged record',
        { repoDir },
      );
      stagedState = inspectStagedRecord(
        state.stagedDirectory,
        state.inventory,
        repoDir,
      );
    }
    if (stagedState === 'receipt-only') {
      fs.unlinkSync(path.join(state.stagedDirectory, 'receipt.json'));
      fsyncPrivateDirectory(
        state.stagedDirectory,
        'F1.21 deletion cascade staged record',
        { repoDir },
      );
      stagedState = inspectStagedRecord(
        state.stagedDirectory,
        state.inventory,
        repoDir,
      );
    }
    if (stagedState !== 'empty') {
      throw new Error(
        'Private reviewed example canonicalization deletion cascade staged deletion is incomplete.',
      );
    }
    fs.rmdirSync(state.stagedDirectory);
    fsyncPrivateDirectory(
      paths.pendingDirectory,
      'F1.21 deletion cascade pending history',
      { repoDir },
    );
    state = readPendingState(paths.pendingDirectory, current, decision, repoDir);
  }

  if (state.inventory && !state.receipt) {
    const receipt = buildAbsenceReceipt(state.inventory);
    assertFineTuningPrivateReviewedExampleCanonicalizationDeletionAbsenceReceipt(
      receipt,
      { current, decision, inventory: state.inventory },
    );
    writeExclusivePrivateJson(
      path.join(paths.pendingDirectory, 'absence-receipt.json'),
      receipt,
      'F1.21 deletion cascade absence receipt',
      { repoDir },
    );
    fsyncPrivateDirectory(
      paths.pendingDirectory,
      'F1.21 deletion cascade pending history',
      { repoDir },
    );
    state = readPendingState(paths.pendingDirectory, current, decision, repoDir);
  }
  if (state.inventory && state.receipt) {
    fs.unlinkSync(path.join(paths.pendingDirectory, 'inventory.json'));
    fsyncPrivateDirectory(
      paths.pendingDirectory,
      'F1.21 deletion cascade pending history',
      { repoDir },
    );
    state = readPendingState(paths.pendingDirectory, current, decision, repoDir);
  }
  if (!state.receipt || state.inventory || state.hasStaged) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade is not ready to finalize.',
    );
  }
  return paths;
}

export function finalizeFineTuningPrivateReviewedExampleCanonicalizationDeletionCascade({
  cascade,
  current,
  decision,
  repoDir,
}) {
  if (!cascade) {
    return null;
  }
  if (fs.lstatSync(cascade.recordDirectory, { throwIfNoEntry: false })) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade requires record absence before item deletion.',
    );
  }
  const history = inspectHistory(cascade, current, decision, repoDir);
  if (history.exactFinal) {
    return cascade;
  }
  if (!history.exactPending) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade durable pending state is missing.',
    );
  }
  const state = readPendingState(
    cascade.pendingDirectory,
    current,
    decision,
    repoDir,
  );
  if (
    !state.receipt ||
    state.inventory ||
    state.hasStaged ||
    !sameNames(state.names, ['absence-receipt.json'])
  ) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade pending state is invalid.',
    );
  }
  fs.renameSync(cascade.pendingDirectory, cascade.finalDirectory);
  fsyncPrivateDirectory(
    cascade.historyRoot,
    'F1.21 deletion cascade history',
    { repoDir },
  );
  const finalized = inspectHistory(cascade, current, decision, repoDir);
  if (!finalized.exactFinal || finalized.exactPending) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade final publish failed.',
    );
  }
  return cascade;
}

export function assertFineTuningPrivateReviewedExampleCanonicalizationDeletionCascadeFinal({
  current,
  decision,
  repoDir,
}) {
  if (!applies(current)) {
    return null;
  }
  const paths = pathsFor({ current, decision, repoDir });
  const history = inspectHistory(paths, current, decision, repoDir);
  if (fs.lstatSync(paths.recordDirectory, { throwIfNoEntry: false })) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade found resurrected record history.',
    );
  }
  if (history.exactPending) {
    throw new Error(
      'Private reviewed example canonicalization deletion cascade is still pending.',
    );
  }
  return null;
}
