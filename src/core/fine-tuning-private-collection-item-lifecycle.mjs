import { createHash } from 'node:crypto';

import { assertFineTuningPrivateCollectionItemRecord } from './fine-tuning-private-collection-item.mjs';
import { assertFineTuningPrivateCollectionItemAdmissionRecord } from './fine-tuning-private-collection-item-admission.mjs';
import { assertFineTuningPrivateCollectionWorkspaceRecord } from './fine-tuning-private-collection-workspace.mjs';

export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_LIFECYCLE_DECISION_INPUT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-lifecycle-decision-input/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_LIFECYCLE_DECISION_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-lifecycle-decision/v1';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_TOMBSTONE_V2_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-tombstone/v2';
export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_ABSENCE_RECEIPT_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-absence-receipt/v1';

const ACTIONS = new Set(['withdraw', 'retention-delete']);
const TERMINAL_ACTIONS = new Set(['withdrawn', 'deleted']);

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function requireExactKeys(value, keys, fieldName) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())
  ) {
    throw new Error(`Fine-tuning private collection item lifecycle ${fieldName} fields are invalid.`);
  }
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Fine-tuning private collection item lifecycle ${fieldName} must be a valid timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

function normalizeItem(item) {
  requireExactKeys(item, ['id', 'itemHash'], 'item');
  if (!isSha256(item.itemHash) || item.id !== `fine-tuning-private-collection-item-${item.itemHash}`) {
    throw new Error('Fine-tuning private collection item lifecycle item is invalid.');
  }
  return { id: item.id, itemHash: item.itemHash };
}

function normalizeAdmission(admission) {
  requireExactKeys(admission, ['admissionHash', 'id'], 'admission');
  if (
    !isSha256(admission.admissionHash) ||
    admission.id !== `fine-tuning-private-collection-item-admission-${admission.admissionHash}`
  ) {
    throw new Error('Fine-tuning private collection item lifecycle admission is invalid.');
  }
  return { admissionHash: admission.admissionHash, id: admission.id };
}

function normalizeWorkspace(workspace) {
  requireExactKeys(workspace, ['id', 'workspaceHash'], 'workspace');
  if (
    !isSha256(workspace.workspaceHash) ||
    workspace.id !== `fine-tuning-private-collection-workspace-${workspace.workspaceHash}`
  ) {
    throw new Error('Fine-tuning private collection item lifecycle workspace is invalid.');
  }
  return { id: workspace.id, workspaceHash: workspace.workspaceHash };
}

function normalizeDecisionReference(decision) {
  requireExactKeys(decision, ['decisionHash', 'id'], 'decision');
  if (
    !isSha256(decision.decisionHash) ||
    decision.id !== `fine-tuning-private-collection-item-lifecycle-decision-${decision.decisionHash}`
  ) {
    throw new Error('Fine-tuning private collection item lifecycle decision is invalid.');
  }
  return { decisionHash: decision.decisionHash, id: decision.id };
}

function normalizeTombstoneReference(tombstone) {
  requireExactKeys(tombstone, ['id', 'tombstoneHash'], 'tombstone');
  if (
    !isSha256(tombstone.tombstoneHash) ||
    tombstone.id !== `fine-tuning-private-collection-item-tombstone-${tombstone.tombstoneHash}`
  ) {
    throw new Error('Fine-tuning private collection item lifecycle tombstone is invalid.');
  }
  return { id: tombstone.id, tombstoneHash: tombstone.tombstoneHash };
}

function expectedConfirmationToken(action, itemHash) {
  return `${action === 'withdraw' ? 'withdraw' : 'retention-delete'}-private-collection-item:${itemHash}`;
}

function statusFor(action, phase) {
  if (phase === 'decision') {
    return action === 'withdraw'
      ? 'private-collection-item-withdrawal-decided-not-executed'
      : 'private-collection-item-retention-delete-decided-not-executed';
  }
  return action === 'withdraw'
    ? 'private-collection-item-withdrawn-absence-observed'
    : 'private-collection-item-retention-deleted-absence-observed';
}

function terminalActionFor(action) {
  return action === 'withdraw' ? 'withdrawn' : 'deleted';
}

function decisionActionForTerminal(action) {
  if (action === 'withdrawn') return 'withdraw';
  if (action === 'deleted') return 'retention-delete';
  throw new Error('Fine-tuning private collection item tombstone v2 action is invalid.');
}

function assertDecisionTiming({ action, decidedAt, item }) {
  const decidedAtMs = Date.parse(decidedAt);
  const storedAtMs = Date.parse(item.storedAt);
  const deleteByMs = Date.parse(item.retention.deleteBy);
  if (
    (action === 'withdraw' && (decidedAtMs < storedAtMs || decidedAtMs >= deleteByMs)) ||
    (action === 'retention-delete' && decidedAtMs < deleteByMs)
  ) {
    throw new Error('Fine-tuning private collection item lifecycle decision timing is invalid.');
  }
}

function normalizeDecisionInput(input) {
  requireExactKeys(
    input,
    [
      'action',
      'admission',
      'confirmationToken',
      'decidedAt',
      'decidedBy',
      'evidenceSha256',
      'item',
      'schemaVersion',
      'withdrawalReferenceSha256',
      'workspace',
    ],
    'decision input',
  );
  if (
    input.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_LIFECYCLE_DECISION_INPUT_SCHEMA_VERSION ||
    !ACTIONS.has(input.action) ||
    input.decidedBy !== 'retention-deletion-owner-role' ||
    !isSha256(input.evidenceSha256) ||
    !isSha256(input.withdrawalReferenceSha256)
  ) {
    throw new Error('Fine-tuning private collection item lifecycle decision input is invalid.');
  }
  const normalizedItem = normalizeItem(input.item);
  const normalizedAdmission = normalizeAdmission(input.admission);
  const normalizedWorkspace = normalizeWorkspace(input.workspace);
  const decidedAt = requireTimestamp(input.decidedAt, 'decision decidedAt');
  if (input.confirmationToken !== expectedConfirmationToken(input.action, normalizedItem.itemHash)) {
    throw new Error('Fine-tuning private collection item lifecycle confirmation token is invalid.');
  }
  return {
    action: input.action,
    admission: normalizedAdmission,
    confirmationToken: input.confirmationToken,
    decidedAt,
    decidedBy: 'retention-deletion-owner-role',
    evidenceSha256: input.evidenceSha256,
    item: normalizedItem,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_LIFECYCLE_DECISION_INPUT_SCHEMA_VERSION,
    withdrawalReferenceSha256: input.withdrawalReferenceSha256,
    workspace: normalizedWorkspace,
  };
}

export function assertFineTuningPrivateCollectionItemLifecycleDecisionInput(input) {
  return normalizeDecisionInput(input);
}

function buildDecisionContent({ input, item, admission, workspace, executionAt }) {
  const normalizedInput = normalizeDecisionInput(input);
  if (
    normalizedInput.item.id !== item.id ||
    normalizedInput.item.itemHash !== item.itemHash ||
    normalizedInput.admission.id !== admission.id ||
    normalizedInput.admission.admissionHash !== admission.admissionHash ||
    normalizedInput.workspace.id !== workspace.id ||
    normalizedInput.workspace.workspaceHash !== workspace.workspaceHash ||
    normalizedInput.withdrawalReferenceSha256 !== item.retention.withdrawalReferenceSha256 ||
    normalizedInput.withdrawalReferenceSha256 !== admission.envelope.retention.withdrawalReferenceSha256
  ) {
    throw new Error('Fine-tuning private collection item lifecycle decision must bind the exact stored item.');
  }
  const normalizedExecutionAt = requireTimestamp(executionAt, 'executionAt');
  assertDecisionTiming({ action: normalizedInput.action, decidedAt: normalizedInput.decidedAt, item });
  if (Date.parse(normalizedExecutionAt) < Date.parse(normalizedInput.decidedAt)) {
    throw new Error('Fine-tuning private collection item lifecycle execution predates the owner decision.');
  }
  return {
    action: normalizedInput.action,
    actualModelTrainingExecuted: false,
    admission: normalizedInput.admission,
    confirmationTokenSha256: hashText(normalizedInput.confirmationToken),
    decidedAt: normalizedInput.decidedAt,
    decidedBy: 'retention-deletion-owner-role',
    evidenceSha256: normalizedInput.evidenceSha256,
    externalProviderCalls: 'none',
    item: normalizedInput.item,
    ownerAttestationRecorded: true,
    ownerIdentityVerified: false,
    productionReadyClaim: false,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_LIFECYCLE_DECISION_SCHEMA_VERSION,
    status: statusFor(normalizedInput.action, 'decision'),
    trainingAuthorized: false,
    withdrawalReferenceSha256: normalizedInput.withdrawalReferenceSha256,
    workspace: normalizedInput.workspace,
  };
}

function rebuildDecisionContent(content) {
  requireExactKeys(
    content,
    [
      'action',
      'actualModelTrainingExecuted',
      'admission',
      'confirmationTokenSha256',
      'decidedAt',
      'decidedBy',
      'evidenceSha256',
      'externalProviderCalls',
      'item',
      'ownerAttestationRecorded',
      'ownerIdentityVerified',
      'productionReadyClaim',
      'schemaVersion',
      'status',
      'trainingAuthorized',
      'withdrawalReferenceSha256',
      'workspace',
    ],
    'decision',
  );
  if (
    !ACTIONS.has(content.action) ||
    !isSha256(content.confirmationTokenSha256) ||
    !isSha256(content.evidenceSha256) ||
    !isSha256(content.withdrawalReferenceSha256) ||
    content.actualModelTrainingExecuted !== false ||
    content.decidedBy !== 'retention-deletion-owner-role' ||
    content.externalProviderCalls !== 'none' ||
    content.ownerAttestationRecorded !== true ||
    content.ownerIdentityVerified !== false ||
    content.productionReadyClaim !== false ||
    content.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_LIFECYCLE_DECISION_SCHEMA_VERSION ||
    content.status !== statusFor(content.action, 'decision') ||
    content.trainingAuthorized !== false
  ) {
    throw new Error('Fine-tuning private collection item lifecycle decision integrity failed.');
  }
  return {
    ...content,
    admission: normalizeAdmission(content.admission),
    decidedAt: requireTimestamp(content.decidedAt, 'decision decidedAt'),
    item: normalizeItem(content.item),
    workspace: normalizeWorkspace(content.workspace),
  };
}

export function buildFineTuningPrivateCollectionItemLifecycleDecision(input = {}) {
  const content = buildDecisionContent(input);
  const decisionHash = hashRecord(content);
  return {
    ...content,
    decisionHash,
    id: `fine-tuning-private-collection-item-lifecycle-decision-${decisionHash}`,
  };
}

export function assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision) {
  const { decisionHash, id, ...content } = decision || {};
  const expected = rebuildDecisionContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    decisionHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-lifecycle-decision-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item lifecycle decision integrity failed.');
  }
  return decision;
}

function buildTombstoneContent({ decision, recordedAt }) {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
  return {
    action: terminalActionFor(decision.action),
    admission: decision.admission,
    decision: normalizeDecisionReference({ decisionHash: decision.decisionHash, id: decision.id }),
    deletionExecutionIndependentlyVerified: false,
    evidenceSha256: decision.evidenceSha256,
    item: decision.item,
    ownerIdentityVerified: false,
    productionReadyClaim: false,
    recordedAt: requireTimestamp(recordedAt, 'tombstone recordedAt'),
    recordedBy: 'retention-deletion-owner-role',
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_TOMBSTONE_V2_SCHEMA_VERSION,
    status: statusFor(decision.action, 'terminal'),
    trainingAuthorized: false,
    withdrawalReferenceSha256: decision.withdrawalReferenceSha256,
    workspace: decision.workspace,
  };
}

function rebuildTombstoneContent(content) {
  requireExactKeys(
    content,
    [
      'action',
      'admission',
      'decision',
      'deletionExecutionIndependentlyVerified',
      'evidenceSha256',
      'item',
      'ownerIdentityVerified',
      'productionReadyClaim',
      'recordedAt',
      'recordedBy',
      'schemaVersion',
      'status',
      'trainingAuthorized',
      'withdrawalReferenceSha256',
      'workspace',
    ],
    'tombstone',
  );
  if (
    !TERMINAL_ACTIONS.has(content.action) ||
    !isSha256(content.evidenceSha256) ||
    !isSha256(content.withdrawalReferenceSha256) ||
    content.deletionExecutionIndependentlyVerified !== false ||
    content.ownerIdentityVerified !== false ||
    content.productionReadyClaim !== false ||
    content.recordedBy !== 'retention-deletion-owner-role' ||
    content.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_TOMBSTONE_V2_SCHEMA_VERSION ||
    content.status !== statusFor(decisionActionForTerminal(content.action), 'terminal') ||
    content.trainingAuthorized !== false
  ) {
    throw new Error('Fine-tuning private collection item tombstone v2 integrity failed.');
  }
  return {
    ...content,
    admission: normalizeAdmission(content.admission),
    decision: normalizeDecisionReference(content.decision),
    item: normalizeItem(content.item),
    recordedAt: requireTimestamp(content.recordedAt, 'tombstone recordedAt'),
    workspace: normalizeWorkspace(content.workspace),
  };
}

export function buildFineTuningPrivateCollectionItemTombstoneV2(input = {}) {
  const content = buildTombstoneContent(input);
  const tombstoneHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-item-tombstone-${tombstoneHash}`,
    tombstoneHash,
  };
}

export function assertFineTuningPrivateCollectionItemTombstoneV2Record(tombstone) {
  const { id, tombstoneHash, ...content } = tombstone || {};
  const expected = rebuildTombstoneContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    tombstoneHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-tombstone-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item tombstone v2 integrity failed.');
  }
  return tombstone;
}

export function assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding({
  decision,
  tombstone,
}) {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
  assertFineTuningPrivateCollectionItemTombstoneV2Record(tombstone);
  const expected = buildTombstoneContent({
    decision,
    recordedAt: tombstone.recordedAt,
  });
  const expectedHash = hashRecord(expected);
  if (JSON.stringify(tombstone) !== JSON.stringify({
    ...expected,
    id: `fine-tuning-private-collection-item-tombstone-${expectedHash}`,
    tombstoneHash: expectedHash,
  })) {
    throw new Error('Fine-tuning private collection item tombstone v2 does not match the terminal decision.');
  }
  return tombstone;
}

function normalizeAbsenceObservation(absence) {
  requireExactKeys(
    absence,
    [
      'itemPathAbsent',
      'matchingAdmissionItemCount',
      'matchingItemHashCount',
      'postDeleteAbsenceObserved',
      'removalDirectoryEmpty',
      'workspaceRecordUnchanged',
    ],
    'absence observation',
  );
  if (
    absence.itemPathAbsent !== true ||
    absence.matchingAdmissionItemCount !== 0 ||
    absence.matchingItemHashCount !== 0 ||
    absence.postDeleteAbsenceObserved !== true ||
    absence.removalDirectoryEmpty !== true ||
    absence.workspaceRecordUnchanged !== true
  ) {
    throw new Error('Fine-tuning private collection item absence observation is invalid.');
  }
  return { ...absence };
}

function buildReceiptContent({ absence, decision, tombstone, observedAt }) {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
  assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding({ decision, tombstone });
  const normalizedObservedAt = requireTimestamp(observedAt, 'receipt observedAt');
  if (Date.parse(normalizedObservedAt) < Date.parse(decision.decidedAt)) {
    throw new Error('Fine-tuning private collection item absence receipt predates the owner decision.');
  }
  const normalizedAbsence = normalizeAbsenceObservation(absence);
  return {
    action: decision.action,
    admission: decision.admission,
    decision: normalizeDecisionReference({ decisionHash: decision.decisionHash, id: decision.id }),
    deletionExecutionIndependentlyVerified: false,
    externalProviderCalls: 'none',
    item: decision.item,
    itemPathAbsent: normalizedAbsence.itemPathAbsent,
    matchingAdmissionItemCount: normalizedAbsence.matchingAdmissionItemCount,
    matchingItemHashCount: normalizedAbsence.matchingItemHashCount,
    observedAt: normalizedObservedAt,
    ownerIdentityVerified: false,
    postDeleteAbsenceObserved: normalizedAbsence.postDeleteAbsenceObserved,
    productionReadyClaim: false,
    removalDirectoryEmpty: normalizedAbsence.removalDirectoryEmpty,
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_ABSENCE_RECEIPT_SCHEMA_VERSION,
    status: statusFor(decision.action, 'terminal'),
    tombstone: normalizeTombstoneReference({ id: tombstone.id, tombstoneHash: tombstone.tombstoneHash }),
    trainingAuthorized: false,
    withdrawalReferenceSha256: decision.withdrawalReferenceSha256,
    workspace: decision.workspace,
    workspaceRecordUnchanged: normalizedAbsence.workspaceRecordUnchanged,
  };
}

function rebuildReceiptContent(content) {
  requireExactKeys(
    content,
    [
      'action',
      'admission',
      'decision',
      'deletionExecutionIndependentlyVerified',
      'externalProviderCalls',
      'item',
      'itemPathAbsent',
      'matchingAdmissionItemCount',
      'matchingItemHashCount',
      'observedAt',
      'ownerIdentityVerified',
      'postDeleteAbsenceObserved',
      'productionReadyClaim',
      'removalDirectoryEmpty',
      'schemaVersion',
      'status',
      'tombstone',
      'trainingAuthorized',
      'withdrawalReferenceSha256',
      'workspace',
      'workspaceRecordUnchanged',
    ],
    'absence receipt',
  );
  if (
    !ACTIONS.has(content.action) ||
    !isSha256(content.withdrawalReferenceSha256) ||
    content.deletionExecutionIndependentlyVerified !== false ||
    content.externalProviderCalls !== 'none' ||
    content.itemPathAbsent !== true ||
    content.matchingAdmissionItemCount !== 0 ||
    content.matchingItemHashCount !== 0 ||
    content.ownerIdentityVerified !== false ||
    content.postDeleteAbsenceObserved !== true ||
    content.productionReadyClaim !== false ||
    content.removalDirectoryEmpty !== true ||
    content.schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_ABSENCE_RECEIPT_SCHEMA_VERSION ||
    content.status !== statusFor(content.action, 'terminal') ||
    content.trainingAuthorized !== false ||
    content.workspaceRecordUnchanged !== true
  ) {
    throw new Error('Fine-tuning private collection item absence receipt integrity failed.');
  }
  return {
    ...content,
    admission: normalizeAdmission(content.admission),
    decision: normalizeDecisionReference(content.decision),
    item: normalizeItem(content.item),
    observedAt: requireTimestamp(content.observedAt, 'receipt observedAt'),
    tombstone: normalizeTombstoneReference(content.tombstone),
    workspace: normalizeWorkspace(content.workspace),
  };
}

export function buildFineTuningPrivateCollectionItemAbsenceReceipt(input = {}) {
  const content = buildReceiptContent(input);
  const receiptHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-item-absence-receipt-${receiptHash}`,
    receiptHash,
  };
}

export function assertFineTuningPrivateCollectionItemAbsenceReceiptRecord(receipt) {
  const { id, receiptHash, ...content } = receipt || {};
  const expected = rebuildReceiptContent(content);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(content) !== JSON.stringify(expected) ||
    receiptHash !== expectedHash ||
    id !== `fine-tuning-private-collection-item-absence-receipt-${expectedHash}`
  ) {
    throw new Error('Fine-tuning private collection item absence receipt integrity failed.');
  }
  return receipt;
}

export function assertFineTuningPrivateCollectionItemLifecycleTerminalBundle({
  decision,
  receipt,
  tombstone,
}) {
  assertFineTuningPrivateCollectionItemLifecycleDecisionRecord(decision);
  assertFineTuningPrivateCollectionItemTombstoneV2DecisionBinding({ decision, tombstone });
  assertFineTuningPrivateCollectionItemAbsenceReceiptRecord(receipt);
  const expectedReceipt = buildReceiptContent({
    absence: {
      itemPathAbsent: receipt.itemPathAbsent,
      matchingAdmissionItemCount: receipt.matchingAdmissionItemCount,
      matchingItemHashCount: receipt.matchingItemHashCount,
      postDeleteAbsenceObserved: receipt.postDeleteAbsenceObserved,
      removalDirectoryEmpty: receipt.removalDirectoryEmpty,
      workspaceRecordUnchanged: receipt.workspaceRecordUnchanged,
    },
    decision,
    tombstone,
    observedAt: receipt.observedAt,
  });
  if (
    Date.parse(tombstone.recordedAt) < Date.parse(decision.decidedAt) ||
    Date.parse(receipt.observedAt) < Date.parse(tombstone.recordedAt) ||
    JSON.stringify(receipt) !== JSON.stringify({
      ...expectedReceipt,
      id: `fine-tuning-private-collection-item-absence-receipt-${hashRecord(expectedReceipt)}`,
      receiptHash: hashRecord(expectedReceipt),
    })
  ) {
    throw new Error('Fine-tuning private collection item terminal bundle integrity failed.');
  }
  return { decision, receipt, tombstone };
}

export function assertFineTuningPrivateCollectionItemLifecycleStoredReferences({
  admission,
  item,
  workspace,
}) {
  assertFineTuningPrivateCollectionItemRecord(item);
  assertFineTuningPrivateCollectionItemAdmissionRecord(admission);
  assertFineTuningPrivateCollectionWorkspaceRecord(workspace);
  if (
    item.id !== `fine-tuning-private-collection-item-${item.itemHash}` ||
    item.admission.id !== admission.id ||
    item.admission.admissionHash !== admission.admissionHash ||
    item.workspace.id !== workspace.id ||
    item.workspace.workspaceHash !== workspace.workspaceHash ||
    admission.workspace.id !== workspace.id ||
    admission.workspace.workspaceHash !== workspace.workspaceHash ||
    item.retention.withdrawalReferenceSha256 !== admission.envelope.retention.withdrawalReferenceSha256
  ) {
    throw new Error('Fine-tuning private collection item lifecycle stored references are invalid.');
  }
  return { admission, item, workspace };
}
