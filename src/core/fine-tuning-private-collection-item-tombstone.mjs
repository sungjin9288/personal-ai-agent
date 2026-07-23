import { createHash } from 'node:crypto';

export const FINE_TUNING_PRIVATE_COLLECTION_ITEM_TOMBSTONE_SCHEMA_VERSION =
  'personal-ai-agent-fine-tuning-private-collection-item-tombstone/v1';

const TERMINAL_ACTIONS = new Set(['deleted', 'withdrawn']);

function hashRecord(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
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
    throw new Error(`Fine-tuning private collection item tombstone ${fieldName} fields are invalid.`);
  }
}

function requireTimestamp(value, fieldName) {
  const timestamp = Date.parse(String(value || ''));
  if (!Number.isFinite(timestamp)) {
    throw new Error(`Fine-tuning private collection item tombstone ${fieldName} must be a valid timestamp.`);
  }
  return new Date(timestamp).toISOString();
}

function normalizeWorkspace(workspace) {
  requireExactKeys(workspace, ['id', 'workspaceHash'], 'workspace');
  if (
    !isSha256(workspace.workspaceHash) ||
    workspace.id !== `fine-tuning-private-collection-workspace-${workspace.workspaceHash}`
  ) {
    throw new Error('Fine-tuning private collection item tombstone workspace is invalid.');
  }
  return { id: workspace.id, workspaceHash: workspace.workspaceHash };
}

function normalizeAdmission(admission) {
  requireExactKeys(admission, ['admissionHash', 'id'], 'admission');
  if (
    !isSha256(admission.admissionHash) ||
    admission.id !== `fine-tuning-private-collection-item-admission-${admission.admissionHash}`
  ) {
    throw new Error('Fine-tuning private collection item tombstone admission is invalid.');
  }
  return { admissionHash: admission.admissionHash, id: admission.id };
}

function buildContent(input) {
  requireExactKeys(
    input,
    [
      'action',
      'admission',
      'evidenceSha256',
      'recordedAt',
      'recordedBy',
      'withdrawalReferenceSha256',
      'workspace',
    ],
    'record',
  );
  const {
    action,
    admission,
    evidenceSha256,
    recordedAt,
    recordedBy,
    withdrawalReferenceSha256,
    workspace,
  } = input;
  if (
    !TERMINAL_ACTIONS.has(action) ||
    !isSha256(evidenceSha256) ||
    !isSha256(withdrawalReferenceSha256) ||
    recordedBy !== 'retention-deletion-owner-role'
  ) {
    throw new Error('Fine-tuning private collection item tombstone is invalid.');
  }
  return {
    action,
    admission: normalizeAdmission(admission),
    evidenceSha256,
    recordedAt: requireTimestamp(recordedAt, 'recordedAt'),
    recordedBy: 'retention-deletion-owner-role',
    schemaVersion: FINE_TUNING_PRIVATE_COLLECTION_ITEM_TOMBSTONE_SCHEMA_VERSION,
    withdrawalReferenceSha256,
    workspace: normalizeWorkspace(workspace),
  };
}

export function buildFineTuningPrivateCollectionItemTombstone(input = {}) {
  const content = buildContent(input);
  const tombstoneHash = hashRecord(content);
  return {
    ...content,
    id: `fine-tuning-private-collection-item-tombstone-${tombstoneHash}`,
    tombstoneHash,
  };
}

export function assertFineTuningPrivateCollectionItemTombstone(tombstone) {
  const { id, schemaVersion, tombstoneHash, ...input } = tombstone || {};
  if (schemaVersion !== FINE_TUNING_PRIVATE_COLLECTION_ITEM_TOMBSTONE_SCHEMA_VERSION) {
    throw new Error('Fine-tuning private collection item tombstone integrity failed.');
  }
  const expected = buildContent(input);
  const expectedHash = hashRecord(expected);
  if (
    JSON.stringify(tombstone) !== JSON.stringify({
      ...expected,
      id: `fine-tuning-private-collection-item-tombstone-${expectedHash}`,
      tombstoneHash: expectedHash,
    })
  ) {
    throw new Error('Fine-tuning private collection item tombstone integrity failed.');
  }
  return tombstone;
}
